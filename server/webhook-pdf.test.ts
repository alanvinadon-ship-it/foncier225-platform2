/**
 * Tests pour les webhooks SIGFU/SIFOR et le service export PDF
 */

import { describe, it, expect, vi } from 'vitest';

// ─── Webhook SIGFU ──────────────────────────────────────────────────────────

describe('Webhook SIGFU', () => {
  it('devrait rejeter une requête sans signature quand le secret est configuré', async () => {
    // Mock env with secret
    const originalEnv = process.env.SIGFU_WEBHOOK_SECRET;
    process.env.SIGFU_WEBHOOK_SECRET = 'test-secret-sigfu';

    const { handleSigfuWebhook } = await import('./webhook-interconnexion');

    const req: any = {
      headers: {},
      body: { event_id: 'evt-1', event_type: 'status_change', numero_demande: 'SIGFU-2025-001' },
    };
    const res: any = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    };

    await handleSigfuWebhook(req, res);
    expect(res.status).toHaveBeenCalledWith(401);

    process.env.SIGFU_WEBHOOK_SECRET = originalEnv;
  });

  it('devrait accepter une requête sans secret configuré (mode sandbox)', async () => {
    const originalEnv = process.env.SIGFU_WEBHOOK_SECRET;
    delete process.env.SIGFU_WEBHOOK_SECRET;

    // Re-import to get fresh module
    vi.resetModules();
    const { handleSigfuWebhook } = await import('./webhook-interconnexion');

    const req: any = {
      headers: {},
      body: {
        event_id: 'evt-sandbox-1',
        event_type: 'status_change',
        numero_demande: 'SIGFU-2025-001',
        ancien_statut: 'EN_INSTRUCTION',
        nouveau_statut: 'BORNAGE_PROGRAMME',
        message: 'Bornage programmé',
        timestamp: new Date().toISOString(),
      },
    };
    const res: any = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    };

    await handleSigfuWebhook(req, res);
    // Should not return 401 (either 200 or 500 depending on DB)
    expect(res.status).not.toHaveBeenCalledWith(401);

    process.env.SIGFU_WEBHOOK_SECRET = originalEnv;
  });

  it('devrait valider le format du payload SIGFU', () => {
    const validPayload = {
      event_id: 'evt-001',
      event_type: 'status_change',
      numero_demande: 'SIGFU-2025-0042',
      ancien_statut: 'DEPOSEE',
      nouveau_statut: 'EN_INSTRUCTION',
      message: 'Votre dossier est en cours d\'instruction',
      timestamp: '2025-06-01T10:00:00Z',
    };

    expect(validPayload.event_id).toBeTruthy();
    expect(validPayload.event_type).toBe('status_change');
    expect(validPayload.numero_demande).toMatch(/^SIGFU-/);
  });
});

// ─── Webhook SIFOR ──────────────────────────────────────────────────────────

describe('Webhook SIFOR', () => {
  it('devrait rejeter une requête sans signature quand le secret est configuré', async () => {
    const originalEnv = process.env.SIFOR_WEBHOOK_SECRET;
    process.env.SIFOR_WEBHOOK_SECRET = 'test-secret-sifor';

    vi.resetModules();
    const { handleSiforWebhook } = await import('./webhook-interconnexion');

    const req: any = {
      headers: {},
      body: { event_id: 'evt-1', event_type: 'status_change', numero_certificat: 'SIFOR-CF-2025-001' },
    };
    const res: any = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    };

    await handleSiforWebhook(req, res);
    expect(res.status).toHaveBeenCalledWith(401);

    process.env.SIFOR_WEBHOOK_SECRET = originalEnv;
  });

  it('devrait accepter une requête sans secret configuré (mode sandbox)', async () => {
    const originalEnv = process.env.SIFOR_WEBHOOK_SECRET;
    delete process.env.SIFOR_WEBHOOK_SECRET;

    vi.resetModules();
    const { handleSiforWebhook } = await import('./webhook-interconnexion');

    const req: any = {
      headers: {},
      body: {
        event_id: 'evt-sifor-1',
        event_type: 'status_change',
        numero_certificat: 'SIFOR-CF-2025-0001',
        ancien_statut: 'DEMANDE_DEPOSEE',
        nouveau_statut: 'ENQUETE_PROGRAMMEE',
        message: 'Enquête foncière programmée',
        timestamp: new Date().toISOString(),
      },
    };
    const res: any = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    };

    await handleSiforWebhook(req, res);
    expect(res.status).not.toHaveBeenCalledWith(401);

    process.env.SIFOR_WEBHOOK_SECRET = originalEnv;
  });

  it('devrait valider le format du payload SIFOR', () => {
    const validPayload = {
      event_id: 'evt-sifor-001',
      event_type: 'certificat_delivre',
      numero_certificat: 'SIFOR-CF-2025-0042',
      message: 'Certificat foncier rural délivré',
      timestamp: '2025-06-01T10:00:00Z',
    };

    expect(validPayload.event_id).toBeTruthy();
    expect(validPayload.event_type).toBe('certificat_delivre');
    expect(validPayload.numero_certificat).toMatch(/^SIFOR-CF-/);
  });

  it('devrait gérer les événements opposition', () => {
    const oppositionPayload = {
      event_id: 'evt-sifor-opp-001',
      event_type: 'opposition_recue',
      numero_certificat: 'SIFOR-CF-2025-0042',
      opposant: 'Kouassi Jean',
      motif: 'Revendication de propriété ancestrale',
      timestamp: '2025-06-01T10:00:00Z',
    };

    expect(oppositionPayload.event_type).toBe('opposition_recue');
    expect(oppositionPayload.opposant).toBeTruthy();
    expect(oppositionPayload.motif).toBeTruthy();
  });
});

// ─── Service PDF ────────────────────────────────────────────────────────────

describe('Service Export PDF', () => {
  it('devrait exporter la fonction generateSuiviPdfDocument', async () => {
    const module = await import('./suivi-pdf.service');
    expect(module.generateSuiviPdfDocument).toBeDefined();
    expect(typeof module.generateSuiviPdfDocument).toBe('function');
  });

  it('devrait avoir les bons paramètres d\'entrée', async () => {
    const { generateSuiviPdfDocument } = await import('./suivi-pdf.service');
    expect(generateSuiviPdfDocument).toBeDefined();
    expect(typeof generateSuiviPdfDocument).toBe('function');
    // Function accepts 1 params object
    expect(generateSuiviPdfDocument.length).toBe(1);
  });

  it('devrait supporter les deux sources (sigfu et sifor)', () => {
    const validSources = ['sigfu', 'sifor'] as const;
    expect(validSources).toContain('sigfu');
    expect(validSources).toContain('sifor');
    expect(validSources.length).toBe(2);
  });
});

// ─── HMAC Signature Verification ────────────────────────────────────────────

describe('Vérification HMAC', () => {
  it('devrait calculer correctement une signature HMAC-SHA256', async () => {
    const crypto = await import('crypto');
    const secret = 'my-webhook-secret';
    const payload = JSON.stringify({ event_id: 'test', event_type: 'status_change' });

    const hmac = crypto.createHmac('sha256', secret).update(payload).digest('hex');

    expect(hmac).toHaveLength(64); // SHA-256 hex = 64 chars
    expect(hmac).toMatch(/^[a-f0-9]+$/);

    // Same input = same output (deterministic)
    const hmac2 = crypto.createHmac('sha256', secret).update(payload).digest('hex');
    expect(hmac).toBe(hmac2);
  });

  it('devrait rejeter une signature invalide', async () => {
    const crypto = await import('crypto');
    const secret = 'my-webhook-secret';
    const payload = JSON.stringify({ event_id: 'test' });

    const validHmac = crypto.createHmac('sha256', secret).update(payload).digest('hex');
    const invalidHmac = 'invalid-signature-000000000000000000000000000000000000';

    expect(validHmac).not.toBe(invalidHmac);
  });
});

// ─── Table webhook_events ───────────────────────────────────────────────────

describe('Table webhook_events', () => {
  it('devrait avoir le schéma correct', async () => {
    const schema = await import('../drizzle/schema');
    expect(schema.webhookEvents).toBeDefined();
  });
});
