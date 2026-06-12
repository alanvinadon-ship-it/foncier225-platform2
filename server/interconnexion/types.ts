/**
 * Types partagés pour le module d'interconnexion API
 * Foncier225 ↔ SIGFU / IDUFCI / SIFOR-CI
 */

// ─── Configuration ───────────────────────────────────────────────────────────

export type SystemId = 'sigfu' | 'idufci' | 'sifor';

export interface InterconnexionConfig {
  systemId: SystemId;
  baseUrl: string;
  apiKey: string;
  timeout: number; // ms
  retryAttempts: number;
  retryDelayMs: number;
  circuitBreaker: {
    failureThreshold: number;
    resetTimeoutMs: number;
    halfOpenRequests: number;
  };
}

// ─── Réponses API ────────────────────────────────────────────────────────────

export type ApiStatus = 'success' | 'error' | 'timeout' | 'circuit_open';

export interface ApiResponse<T = unknown> {
  status: ApiStatus;
  data: T | null;
  error: ApiError | null;
  meta: {
    correlationId: string;
    systemId: SystemId;
    endpoint: string;
    method: string;
    durationMs: number;
    timestamp: string;
    retryCount: number;
  };
}

export interface ApiError {
  code: string;
  message: string;
  httpStatus: number;
  details?: Record<string, unknown>;
}

// ─── Audit ───────────────────────────────────────────────────────────────────

export interface AuditEntry {
  id: string;
  correlationId: string;
  systemId: SystemId;
  direction: 'outbound' | 'inbound';
  endpoint: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  requestBodyHash?: string;
  responseStatus: number;
  durationMs: number;
  userId?: string;
  error?: string;
  timestamp: string;
}

// ─── Circuit Breaker ─────────────────────────────────────────────────────────

export type CircuitState = 'closed' | 'open' | 'half_open';

export interface CircuitBreakerState {
  state: CircuitState;
  failureCount: number;
  lastFailureTime: number | null;
  successCount: number;
}

// ─── Health Check ────────────────────────────────────────────────────────────

export interface SystemHealthStatus {
  systemId: SystemId;
  status: 'healthy' | 'degraded' | 'unavailable';
  circuitState: CircuitState;
  lastSuccessfulCall: string | null;
  lastError: string | null;
  averageResponseMs: number;
  totalCalls24h: number;
  errorRate24h: number;
}

// ─── Coordonnées GPS ─────────────────────────────────────────────────────────

export interface GpsPoint {
  latitude: number;
  longitude: number;
  altitude?: number;
  description?: string;
}

export interface GeoPolygon {
  type: 'Polygon';
  coordinates: [number, number][][]; // GeoJSON format [lng, lat]
}

// ─── Identité demandeur ──────────────────────────────────────────────────────

export interface Demandeur {
  nom: string;
  prenoms: string;
  telephone: string;
  email?: string;
  pieceIdentite?: {
    type: 'CNI' | 'PASSEPORT' | 'CARTE_CONSULAIRE' | 'ATTESTATION';
    numero: string;
  };
}

export interface GeometreExpert {
  agrement: string;
  nom: string;
  telephone?: string;
  email?: string;
}

// ─── Documents ───────────────────────────────────────────────────────────────

export interface DocumentReference {
  type: string;
  url: string;
  sha256?: string;
  filename?: string;
  mimeType?: string;
  sizeBytes?: number;
}
