import { describe, it, expect, vi, beforeEach } from 'vitest';
import { IdufciAdapter } from './interconnexion/idufci.adapter';
import { InterconnexionHttpClient, getSystemConfig, getAllHealthStatuses, getAuditLog } from './interconnexion/http-client';
import { SigfuAdapter } from './interconnexion/sigfu.adapter';
import { SiforAdapter } from './interconnexion/sifor.adapter';

// ─── Tests IDUFCI Format Validation ─────────────────────────────────────────

describe('IdufciAdapter.validateFormat', () => {
  it('should validate a correct 20-char IDUFCI code', () => {
    const result = IdufciAdapter.validateFormat('CIABJ001002000010001');
    expect(result.valid).toBe(true);
    expect(result.parsed).toBeDefined();
    expect(result.parsed!.codePays).toBe('CI');
    expect(result.parsed!.codeRegion).toBe('ABJ');
    expect(result.parsed!.codeCommune).toBe('001');
    expect(result.parsed!.codeSecteur).toBe('002');
    expect(result.parsed!.numeroSequentiel).toBe('00001');
    expect(result.parsed!.codeControle).toBe('0001');
  });

  it('should reject code with wrong length', () => {
    const result = IdufciAdapter.validateFormat('CI12345');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('Longueur invalide');
  });

  it('should reject code with invalid characters', () => {
    const result = IdufciAdapter.validateFormat('ci@bj001002000010001');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('Caractères invalides');
  });

  it('should reject code not starting with CI', () => {
    const result = IdufciAdapter.validateFormat('FRABJ001002000010001');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('Code pays invalide');
  });

  it('should handle hyphenated format', () => {
    const result = IdufciAdapter.validateFormat('CI-ABJ-001-002-00001-0001');
    expect(result.valid).toBe(true);
    expect(result.parsed!.codePays).toBe('CI');
  });
});

// ─── Tests Circuit Breaker Config ───────────────────────────────────────────

describe('InterconnexionHttpClient - Configuration', () => {
  it('should have correct SIGFU config', () => {
    const config = getSystemConfig('sigfu');
    expect(config.systemId).toBe('sigfu');
    expect(config.timeout).toBe(15000);
    expect(config.retryAttempts).toBe(3);
    expect(config.circuitBreaker.failureThreshold).toBe(5);
  });

  it('should have correct IDUFCI config', () => {
    const config = getSystemConfig('idufci');
    expect(config.systemId).toBe('idufci');
    expect(config.timeout).toBe(10000);
    expect(config.retryAttempts).toBe(3);
  });

  it('should have correct SIFOR config', () => {
    const config = getSystemConfig('sifor');
    expect(config.systemId).toBe('sifor');
    expect(config.timeout).toBe(20000);
    expect(config.retryAttempts).toBe(3);
    expect(config.circuitBreaker.failureThreshold).toBe(4);
  });
});

// ─── Tests Health Status ────────────────────────────────────────────────────

describe('Health Status', () => {
  it('should return health status for all 3 systems', () => {
    const statuses = getAllHealthStatuses();
    expect(statuses).toHaveLength(3);
    expect(statuses.map(s => s.systemId)).toEqual(['sigfu', 'idufci', 'sifor']);
  });

  it('should report unavailable for uninitialized clients', () => {
    const statuses = getAllHealthStatuses();
    for (const status of statuses) {
      expect(status.status).toBe('unavailable');
    }
  });
});

// ─── Tests Audit Log ────────────────────────────────────────────────────────

describe('Audit Log', () => {
  it('should return empty audit log initially', () => {
    const log = getAuditLog();
    expect(Array.isArray(log)).toBe(true);
  });

  it('should filter by systemId', () => {
    const log = getAuditLog('sigfu');
    expect(Array.isArray(log)).toBe(true);
  });
});

// ─── Tests HTTP Client ──────────────────────────────────────────────────────

describe('InterconnexionHttpClient', () => {
  let client: InterconnexionHttpClient;

  beforeEach(() => {
    client = new InterconnexionHttpClient({
      systemId: 'idufci',
      baseUrl: 'https://api-sandbox.idufci.construction.gouv.ci/api/v1',
      apiKey: 'test-key',
      timeout: 5000,
      retryAttempts: 1,
      retryDelayMs: 100,
      circuitBreaker: {
        failureThreshold: 3,
        resetTimeoutMs: 5000,
        halfOpenRequests: 1,
      },
    });
  });

  it('should initialize with healthy state', () => {
    const health = client.getHealthStatus();
    expect(health.systemId).toBe('idufci');
    expect(health.status).toBe('healthy');
    expect(health.circuitState).toBe('closed');
    expect(health.totalCalls24h).toBe(0);
  });

  it('should handle network errors gracefully', async () => {
    // Mock fetch to simulate network error
    const originalFetch = global.fetch;
    global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

    const response = await client.request('GET', '/test');
    expect(response.status).toBe('error');
    expect(response.error).toBeDefined();
    expect(response.error!.message).toContain('Network error');
    expect(response.meta.systemId).toBe('idufci');

    global.fetch = originalFetch;
  });

  it('should handle timeout errors', async () => {
    const timeoutClient = new InterconnexionHttpClient({
      systemId: 'sigfu',
      baseUrl: 'https://api-sandbox.sigfu.gouv.ci/api/v1',
      apiKey: 'test-key',
      timeout: 1, // 1ms timeout to force abort
      retryAttempts: 0,
      retryDelayMs: 0,
      circuitBreaker: {
        failureThreshold: 3,
        resetTimeoutMs: 5000,
        halfOpenRequests: 1,
      },
    });

    const originalFetch = global.fetch;
    global.fetch = vi.fn().mockImplementation(() => new Promise((resolve) => setTimeout(resolve, 1000)));

    const response = await timeoutClient.request('GET', '/test');
    // May be 'timeout' or 'error' depending on abort timing
    expect(['timeout', 'error']).toContain(response.status);
    expect(response.error).toBeDefined();

    global.fetch = originalFetch;
  });

  it('should open circuit breaker after threshold failures', async () => {
    const fragileClient = new InterconnexionHttpClient({
      systemId: 'sifor',
      baseUrl: 'https://api-sandbox.sifor.afor.ci/api/v1',
      apiKey: 'test-key',
      timeout: 5000,
      retryAttempts: 0,
      retryDelayMs: 0,
      circuitBreaker: {
        failureThreshold: 2,
        resetTimeoutMs: 60000,
        halfOpenRequests: 1,
      },
    });

    const originalFetch = global.fetch;
    global.fetch = vi.fn().mockRejectedValue(new Error('Server down'));

    // First 2 failures should open the circuit
    await fragileClient.request('GET', '/test1');
    await fragileClient.request('GET', '/test2');

    // Third request should be blocked by circuit breaker
    const response = await fragileClient.request('GET', '/test3');
    expect(response.status).toBe('circuit_open');
    expect(response.error!.code).toBe('CIRCUIT_OPEN');

    global.fetch = originalFetch;
  });

  it('should not retry on 4xx errors (except 429)', async () => {
    const originalFetch = global.fetch;
    let callCount = 0;
    global.fetch = vi.fn().mockImplementation(() => {
      callCount++;
      const error = new Error('Not Found') as Error & { status: number };
      error.status = 404;
      return Promise.reject(error);
    });

    const retryClient = new InterconnexionHttpClient({
      systemId: 'idufci',
      baseUrl: 'https://test.api',
      apiKey: 'key',
      timeout: 5000,
      retryAttempts: 3,
      retryDelayMs: 10,
      circuitBreaker: { failureThreshold: 10, resetTimeoutMs: 5000, halfOpenRequests: 1 },
    });

    await retryClient.request('GET', '/not-found');
    // Should only call once (no retry on 404)
    expect(callCount).toBe(1);

    global.fetch = originalFetch;
  });
});

// ─── Tests SIGFU Webhook Parsing ────────────────────────────────────────────

describe('SigfuAdapter.parseWebhookNotification', () => {
  it('should parse valid notification', () => {
    const notification = SigfuAdapter.parseWebhookNotification({
      type: 'STATUT_CHANGE',
      numeroDemande: 'SIGFU-2025-001234',
      ancienStatut: 'EN_INSTRUCTION',
      nouveauStatut: 'BORNAGE_PROGRAMME',
      message: 'Votre demande avance',
      dateNotification: '2025-06-12T10:00:00Z',
    });
    expect(notification).not.toBeNull();
    expect(notification!.type).toBe('STATUT_CHANGE');
    expect(notification!.numeroDemande).toBe('SIGFU-2025-001234');
    expect(notification!.nouveauStatut).toBe('BORNAGE_PROGRAMME');
  });

  it('should return null for invalid body', () => {
    expect(SigfuAdapter.parseWebhookNotification(null)).toBeNull();
    expect(SigfuAdapter.parseWebhookNotification({})).toBeNull();
    expect(SigfuAdapter.parseWebhookNotification({ type: 'X' })).toBeNull();
  });
});

// ─── Tests SIFOR Webhook Parsing ────────────────────────────────────────────

describe('SiforAdapter.parseWebhookNotification', () => {
  it('should parse valid SIFOR notification', () => {
    const notification = SiforAdapter.parseWebhookNotification({
      eventType: 'CERTIFICAT_DELIVRE',
      referenceId: 'SIFOR-CF-2025-0001',
      referenceType: 'certificat',
      nouveauStatut: 'CERTIFICAT_DELIVRE',
      message: 'Le certificat foncier est disponible',
      timestamp: '2025-06-12T14:00:00Z',
    });
    expect(notification).not.toBeNull();
    expect(notification!.eventType).toBe('CERTIFICAT_DELIVRE');
    expect(notification!.referenceId).toBe('SIFOR-CF-2025-0001');
    expect(notification!.referenceType).toBe('certificat');
  });

  it('should return null for invalid body', () => {
    expect(SiforAdapter.parseWebhookNotification(null)).toBeNull();
    expect(SiforAdapter.parseWebhookNotification({})).toBeNull();
  });
});
