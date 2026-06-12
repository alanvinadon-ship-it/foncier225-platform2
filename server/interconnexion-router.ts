/**
 * Routeur tRPC pour le module d'interconnexion API
 * Expose les opérations SIGFU, IDUFCI et SIFOR-CI via des procédures protégées
 */

import { z } from 'zod';
import { router, protectedProcedure } from './_core/trpc';
import { getIdufciAdapter, IdufciAdapter } from './interconnexion/idufci.adapter';
import { getSigfuAdapter } from './interconnexion/sigfu.adapter';
import { getSiforAdapter } from './interconnexion/sifor.adapter';
import { getAllHealthStatuses, getAuditLog } from './interconnexion/http-client';
import type { SystemId } from './interconnexion/types';

// ─── Admin procedures ────────────────────────────────────────────────────────

const adminInterconnexionRouter = router({
  /**
   * Dashboard santé des connexions
   */
  healthStatus: protectedProcedure.query(async () => {
    return getAllHealthStatuses();
  }),

  /**
   * Journal d'audit des appels inter-systèmes
   */
  auditLog: protectedProcedure
    .input(z.object({
      systemId: z.enum(['sigfu', 'idufci', 'sifor']).optional(),
      limit: z.number().min(1).max(500).default(100),
    }))
    .query(async ({ input }) => {
      return getAuditLog(input.systemId as SystemId | undefined, input.limit);
    }),

  /**
   * Vérifier un IDUFCI (admin)
   */
  verifyIdufci: protectedProcedure
    .input(z.object({ idufci: z.string().min(10).max(25) }))
    .mutation(async ({ input, ctx }) => {
      const adapter = getIdufciAdapter();
      // Validation locale du format
      const formatCheck = IdufciAdapter.validateFormat(input.idufci);
      if (!formatCheck.valid) {
        return { formatValid: false, error: formatCheck.error, apiResponse: null };
      }
      // Appel API
      const response = await adapter.verifyIdufci(input.idufci, String(ctx.user.id));
      return { formatValid: true, parsed: formatCheck.parsed, apiResponse: response };
    }),

  /**
   * Soumettre une demande au SIGFU (admin)
   */
  submitSigfuDemande: protectedProcedure
    .input(z.object({
      procedureCode: z.string(),
      demandeur: z.object({
        nom: z.string(),
        prenoms: z.string(),
        telephone: z.string(),
        email: z.string().optional(),
      }),
      parcelle: z.object({
        idufci: z.string().optional(),
        commune: z.string(),
        secteur: z.string(),
        localisation: z.string(),
        superficie: z.number(),
      }),
      geometreAgrement: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const adapter = getSigfuAdapter();
      const response = await adapter.submitDemande({
        procedureCode: input.procedureCode as any,
        demandeur: input.demandeur,
        parcelle: input.parcelle,
        geometreExpert: input.geometreAgrement ? { agrement: input.geometreAgrement } : undefined,
        documents: [],
        idempotencyKey: `${String(ctx.user.id)}-${Date.now()}`,
      }, String(ctx.user.id));
      return response;
    }),

  /**
   * Suivre une demande SIGFU
   */
  getSigfuStatut: protectedProcedure
    .input(z.object({ numeroDemande: z.string() }))
    .query(async ({ input, ctx }) => {
      const adapter = getSigfuAdapter();
      return adapter.getStatut(input.numeroDemande, String(ctx.user.id));
    }),

  /**
   * Liste des géomètres agréés SIGFU
   */
  listGeometres: protectedProcedure
    .input(z.object({
      zone: z.string().optional(),
    }))
    .query(async ({ input, ctx }) => {
      const adapter = getSigfuAdapter();
      return adapter.listGeometres({ zone: input.zone, actif: true }, String(ctx.user.id));
    }),

  /**
   * Soumettre une demande de certificat foncier rural (SIFOR)
   */
  submitSiforCertificat: protectedProcedure
    .input(z.object({
      demandeur: z.object({
        nom: z.string(),
        prenoms: z.string(),
        telephone: z.string(),
        email: z.string().optional(),
      }),
      parcelle: z.object({
        village: z.string(),
        sousPrefecture: z.string(),
        departement: z.string(),
        superficie: z.number(),
        coordonnees: z.array(z.object({
          latitude: z.number(),
          longitude: z.number(),
        })),
      }),
      droitRevendique: z.enum([
        'PROPRIETE_COUTUMIERE', 'USAGE', 'PASSAGE', 'PATURAGE', 'CULTURE', 'HABITATION',
      ]),
    }))
    .mutation(async ({ input, ctx }) => {
      const adapter = getSiforAdapter();
      return adapter.submitCertificat({
        demandeur: input.demandeur,
        parcelle: input.parcelle,
        droitRevendique: input.droitRevendique,
        documents: [],
        idempotencyKey: `${String(ctx.user.id)}-${Date.now()}`,
      }, String(ctx.user.id));
    }),

  /**
   * Suivre un certificat SIFOR
   */
  getSiforCertificatStatut: protectedProcedure
    .input(z.object({ numeroCertificat: z.string() }))
    .query(async ({ input, ctx }) => {
      const adapter = getSiforAdapter();
      return adapter.getCertificatStatut(input.numeroCertificat, String(ctx.user.id));
    }),

  /**
   * Synchroniser une délimitation villageoise avec SIFOR
   */
  syncDelimitationSifor: protectedProcedure
    .input(z.object({
      village: z.string(),
      sousPrefecture: z.string(),
      chefVillage: z.string(),
      points: z.array(z.object({
        latitude: z.number(),
        longitude: z.number(),
        description: z.string().optional(),
      })),
      participantsAssemblee: z.number().min(1),
    }))
    .mutation(async ({ input, ctx }) => {
      const adapter = getSiforAdapter();
      return adapter.submitDelimitation({
        village: input.village,
        sousPrefecture: input.sousPrefecture,
        chefVillage: input.chefVillage,
        points: input.points,
        pvAssemblee: { type: 'PV_ASSEMBLEE', url: '' },
        participantsAssemblee: input.participantsAssemblee,
        idempotencyKey: `${String(ctx.user.id)}-delimitation-${Date.now()}`,
      }, String(ctx.user.id));
    }),

  /**
   * Consulter les litiges SIFOR d'une zone
   */
  listSiforLitiges: protectedProcedure
    .input(z.object({
      village: z.string().optional(),
      sousPrefecture: z.string().optional(),
      statut: z.enum(['DECLARE', 'INSTRUCTION', 'MEDIATION', 'CONCILIATION', 'ARBITRAGE', 'RESOLU', 'TRANSFERE_JUSTICE']).optional(),
    }))
    .query(async ({ input, ctx }) => {
      const adapter = getSiforAdapter();
      return adapter.listLitiges(input, String(ctx.user.id));
    }),
});

// ─── Citizen procedures ──────────────────────────────────────────────────────

const citizenInterconnexionRouter = router({
  /**
   * Vérifier un IDUFCI (citoyen — lecture seule)
   */
  verifyIdufci: protectedProcedure
    .input(z.object({ idufci: z.string().min(10).max(25) }))
    .query(async ({ input, ctx }) => {
      const adapter = getIdufciAdapter();
      const formatCheck = IdufciAdapter.validateFormat(input.idufci);
      if (!formatCheck.valid) {
        return { formatValid: false, error: formatCheck.error, data: null };
      }
      const response = await adapter.verifyIdufci(input.idufci, String(ctx.user.id));
      return { formatValid: true, parsed: formatCheck.parsed, data: response };
    }),

  /**
   * Suivre une demande SIGFU (citoyen)
   */
  trackSigfuDemande: protectedProcedure
    .input(z.object({ numeroDemande: z.string() }))
    .query(async ({ input, ctx }) => {
      const adapter = getSigfuAdapter();
      return adapter.getStatut(input.numeroDemande, String(ctx.user.id));
    }),

  /**
   * Suivre un certificat foncier rural (citoyen)
   */
  trackSiforCertificat: protectedProcedure
    .input(z.object({ numeroCertificat: z.string() }))
    .query(async ({ input, ctx }) => {
      const adapter = getSiforAdapter();
      return adapter.getCertificatStatut(input.numeroCertificat, String(ctx.user.id));
    }),

  /**
   * Générer un PDF récapitulatif du suivi de dossier
   */
  generateSuiviPdf: protectedProcedure
    .input(z.object({
      source: z.enum(['sigfu', 'sifor']),
      reference: z.string(),
    }))
    .mutation(async ({ input, ctx }) => {
      const { generateSuiviPdfDocument } = await import('./suivi-pdf.service');
      const pdfUrl = await generateSuiviPdfDocument({
        source: input.source,
        reference: input.reference,
        userId: String(ctx.user.id),
      });
      return { url: pdfUrl };
    }),
});

// ─── Export ──────────────────────────────────────────────────────────────────

export const interconnexionRouter = router({
  admin: adminInterconnexionRouter,
  citizen: citizenInterconnexionRouter,
});
