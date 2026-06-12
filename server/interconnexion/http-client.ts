/**
 * Client HTTP commun pour les interconnexions API
 * Inclut : circuit breaker, retry exponentiel, timeout, logging/audit
 */

import { randomUUID } from 'crypto';
import { createHash } from 'crypto';
import type {
  InterconnexionConfig,
  ApiResponse,
  ApiError,
  ApiStatus,
  AuditEntry,
  CircuitBreakerState,
  CircuitState,
  SystemId,
} from './types';

// ─── Circuit Breaker ─────────────────────────────────────────────────────────

class CircuitBreaker {
  private state: CircuitBreakerState;
  private config: InterconnexionConfig['circuitBreaker'];

  constructor(config: InterconnexionConfig['circuitBreaker']) {
    this.config = config;
    this.state = {
      state: 'closed',
      failureCount: 0,
      lastFailureTime: null,
      successCount: 0,
    };
  }

  getState(): CircuitState {
    if (this.state.state === 'open') {
      const elapsed = Date.now() - (this.state.lastFailureTime || 0);
      if (elapsed >= this.config.resetTimeoutMs) {
        this.state.state = 'half_open';
        this.state.successCount = 0;
      }
    }
    return this.state.state;
  }

  recordSuccess(): void {
    if (this.state.state === 'half_open') {
      this.state.successCount++;
      if (this.state.successCount >= this.config.halfOpenRequests) {
        this.state.state = 'closed';
        this.state.failureCount = 0;
      }
    } else {
      this.state.failureCount = 0;
    }
  }

  recordFailure(): void {
    this.state.failureCount++;
    this.state.lastFailureTime = Date.now();
    if (this.state.failureCount >= this.config.failureThreshold) {
      this.state.state = 'open';
    }
  }

  isOpen(): boolean {
    return this.getState() === 'open';
  }

  getFullState(): CircuitBreakerState {
    this.getState(); // refresh state
    return { ...this.state };
  }
}

// ─── Audit Logger ────────────────────────────────────────────────────────────

const auditLog: AuditEntry[] = [];
const MAX_AUDIT_LOG_SIZE = 10000;

function logAudit(entry: AuditEntry): void {
  auditLog.push(entry);
  if (auditLog.length > MAX_AUDIT_LOG_SIZE) {
    auditLog.shift();
  }
  // En production, persister dans la DB ou S3
  console.log(`[INTERCONNEXION][${entry.systemId}] ${entry.method} ${entry.endpoint} → ${entry.responseStatus} (${entry.durationMs}ms) [${entry.correlationId}]`);
}

export function getAuditLog(systemId?: SystemId, limit = 100): AuditEntry[] {
  const filtered = systemId
    ? auditLog.filter((e) => e.systemId === systemId)
    : auditLog;
  return filtered.slice(-limit);
}

// ─── HTTP Client ─────────────────────────────────────────────────────────────

export class InterconnexionHttpClient {
  private config: InterconnexionConfig;
  private circuitBreaker: CircuitBreaker;
  private callCount = 0;
  private errorCount = 0;
  private totalResponseMs = 0;
  private lastSuccessTime: string | null = null;
  private lastError: string | null = null;

  constructor(config: InterconnexionConfig) {
    this.config = config;
    this.circuitBreaker = new CircuitBreaker(config.circuitBreaker);
  }

  /**
   * Effectue une requête HTTP avec retry et circuit breaker
   */
  async request<T>(
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH',
    path: string,
    options?: {
      body?: unknown;
      headers?: Record<string, string>;
      userId?: string;
      correlationId?: string;
    }
  ): Promise<ApiResponse<T>> {
    const correlationId = options?.correlationId || randomUUID();
    const endpoint = `${this.config.baseUrl}${path}`;
    const startTime = Date.now();

    // Vérifier le circuit breaker
    if (this.circuitBreaker.isOpen()) {
      const response: ApiResponse<T> = {
        status: 'circuit_open',
        data: null,
        error: {
          code: 'CIRCUIT_OPEN',
          message: `Circuit breaker ouvert pour ${this.config.systemId}. Le système est temporairement indisponible.`,
          httpStatus: 503,
        },
        meta: {
          correlationId,
          systemId: this.config.systemId,
          endpoint: path,
          method,
          durationMs: 0,
          timestamp: new Date().toISOString(),
          retryCount: 0,
        },
      };
      return response;
    }

    // Tentatives avec retry exponentiel
    let lastError: ApiError | null = null;
    let retryCount = 0;

    for (let attempt = 0; attempt <= this.config.retryAttempts; attempt++) {
      try {
        const result = await this.executeRequest<T>(method, endpoint, options);
        const durationMs = Date.now() - startTime;

        // Succès
        this.circuitBreaker.recordSuccess();
        this.callCount++;
        this.totalResponseMs += durationMs;
        this.lastSuccessTime = new Date().toISOString();

        // Audit
        logAudit({
          id: randomUUID(),
          correlationId,
          systemId: this.config.systemId,
          direction: 'outbound',
          endpoint: path,
          method,
          requestBodyHash: options?.body
            ? createHash('sha256').update(JSON.stringify(options.body)).digest('hex').substring(0, 16)
            : undefined,
          responseStatus: 200,
          durationMs,
          userId: options?.userId,
          timestamp: new Date().toISOString(),
        });

        return {
          status: 'success',
          data: result,
          error: null,
          meta: {
            correlationId,
            systemId: this.config.systemId,
            endpoint: path,
            method,
            durationMs,
            timestamp: new Date().toISOString(),
            retryCount,
          },
        };
      } catch (err) {
        retryCount = attempt;
        const error = err as Error & { status?: number; code?: string };
        lastError = {
          code: error.code || 'REQUEST_FAILED',
          message: error.message,
          httpStatus: error.status || 500,
        };

        // Ne pas retry sur les erreurs 4xx (sauf 429)
        if (error.status && error.status >= 400 && error.status < 500 && error.status !== 429) {
          break;
        }

        // Attendre avant le prochain retry (backoff exponentiel)
        if (attempt < this.config.retryAttempts) {
          const delay = this.config.retryDelayMs * Math.pow(2, attempt);
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }

    // Échec après toutes les tentatives
    const durationMs = Date.now() - startTime;
    this.circuitBreaker.recordFailure();
    this.callCount++;
    this.errorCount++;
    this.lastError = lastError?.message || 'Unknown error';

    // Audit
    logAudit({
      id: randomUUID(),
      correlationId,
      systemId: this.config.systemId,
      direction: 'outbound',
      endpoint: path,
      method,
      requestBodyHash: options?.body
        ? createHash('sha256').update(JSON.stringify(options.body)).digest('hex').substring(0, 16)
        : undefined,
      responseStatus: lastError?.httpStatus || 500,
      durationMs,
      userId: options?.userId,
      error: lastError?.message,
      timestamp: new Date().toISOString(),
    });

    return {
      status: lastError?.httpStatus === 408 ? 'timeout' : 'error',
      data: null,
      error: lastError,
      meta: {
        correlationId,
        systemId: this.config.systemId,
        endpoint: path,
        method,
        durationMs,
        timestamp: new Date().toISOString(),
        retryCount,
      },
    };
  }

  /**
   * Exécute la requête HTTP réelle
   */
  private async executeRequest<T>(
    method: string,
    url: string,
    options?: {
      body?: unknown;
      headers?: Record<string, string>;
    }
  ): Promise<T> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${this.config.apiKey}`,
        'X-Platform-Id': 'FONCIER225',
        'X-Correlation-Id': randomUUID(),
        ...options?.headers,
      };

      const fetchOptions: RequestInit = {
        method,
        headers,
        signal: controller.signal,
      };

      if (options?.body && method !== 'GET') {
        fetchOptions.body = JSON.stringify(options.body);
      }

      const response = await fetch(url, fetchOptions);

      if (!response.ok) {
        const errorBody = await response.text().catch(() => '');
        const error = new Error(`HTTP ${response.status}: ${errorBody || response.statusText}`) as Error & { status: number };
        error.status = response.status;
        throw error;
      }

      const data = await response.json();
      return data as T;
    } catch (err) {
      const error = err as Error & { name?: string; status?: number };
      if (error.name === 'AbortError') {
        const timeoutError = new Error(`Timeout après ${this.config.timeout}ms`) as Error & { status: number; code: string };
        timeoutError.status = 408;
        timeoutError.code = 'TIMEOUT';
        throw timeoutError;
      }
      throw err;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Retourne l'état de santé du système
   */
  getHealthStatus() {
    const avgMs = this.callCount > 0 ? Math.round(this.totalResponseMs / this.callCount) : 0;
    const errorRate = this.callCount > 0 ? this.errorCount / this.callCount : 0;
    const circuitState = this.circuitBreaker.getFullState();

    return {
      systemId: this.config.systemId,
      status: circuitState.state === 'open'
        ? 'unavailable' as const
        : errorRate > 0.1
          ? 'degraded' as const
          : 'healthy' as const,
      circuitState: circuitState.state,
      lastSuccessfulCall: this.lastSuccessTime,
      lastError: this.lastError,
      averageResponseMs: avgMs,
      totalCalls24h: this.callCount,
      errorRate24h: Math.round(errorRate * 100) / 100,
    };
  }

  /**
   * Réinitialise les compteurs (pour les tests)
   */
  resetStats(): void {
    this.callCount = 0;
    this.errorCount = 0;
    this.totalResponseMs = 0;
    this.lastSuccessTime = null;
    this.lastError = null;
  }
}

// ─── Factory ─────────────────────────────────────────────────────────────────

const clients = new Map<SystemId, InterconnexionHttpClient>();

export function getClient(systemId: SystemId): InterconnexionHttpClient {
  if (!clients.has(systemId)) {
    const config = getSystemConfig(systemId);
    clients.set(systemId, new InterconnexionHttpClient(config));
  }
  return clients.get(systemId)!;
}

export function getSystemConfig(systemId: SystemId): InterconnexionConfig {
  const configs: Record<SystemId, InterconnexionConfig> = {
    sigfu: {
      systemId: 'sigfu',
      baseUrl: process.env.SIGFU_API_URL || 'https://api-sandbox.sigfu.gouv.ci/api/v1',
      apiKey: process.env.SIGFU_API_KEY || '',
      timeout: 15000,
      retryAttempts: 3,
      retryDelayMs: 1000,
      circuitBreaker: {
        failureThreshold: 5,
        resetTimeoutMs: 60000,
        halfOpenRequests: 2,
      },
    },
    idufci: {
      systemId: 'idufci',
      baseUrl: process.env.IDUFCI_API_URL || 'https://api-sandbox.idufci.construction.gouv.ci/api/v1',
      apiKey: process.env.IDUFCI_API_KEY || '',
      timeout: 10000,
      retryAttempts: 3,
      retryDelayMs: 800,
      circuitBreaker: {
        failureThreshold: 5,
        resetTimeoutMs: 45000,
        halfOpenRequests: 2,
      },
    },
    sifor: {
      systemId: 'sifor',
      baseUrl: process.env.SIFOR_API_URL || 'https://api-sandbox.sifor.afor.ci/api/v1',
      apiKey: process.env.SIFOR_API_KEY || '',
      timeout: 20000,
      retryAttempts: 3,
      retryDelayMs: 1500,
      circuitBreaker: {
        failureThreshold: 4,
        resetTimeoutMs: 90000,
        halfOpenRequests: 2,
      },
    },
  };

  return configs[systemId];
}

/**
 * Retourne l'état de santé de tous les systèmes
 */
export function getAllHealthStatuses() {
  const systems: SystemId[] = ['sigfu', 'idufci', 'sifor'];
  return systems.map((id) => {
    if (clients.has(id)) {
      return clients.get(id)!.getHealthStatus();
    }
    return {
      systemId: id,
      status: 'unavailable' as const,
      circuitState: 'closed' as const,
      lastSuccessfulCall: null,
      lastError: 'Client non initialisé',
      averageResponseMs: 0,
      totalCalls24h: 0,
      errorRate24h: 0,
    };
  });
}
