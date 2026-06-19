import { z } from "zod";
import { router, protectedProcedure } from "./_core/trpc";
import { getDb, createAuditEvent } from "./db";
import { auditEvents } from "../drizzle/schema";
import { eq, and, desc, like, gte, lte, sql } from "drizzle-orm";

// ============================================================
// SERVICE DE TRAÇABILITÉ ABSOLUE
// Chaque consultation de parcelle, titre ou acte par un Notaire,
// une Banque ou un Agent de l'État est journalisée de manière
// inaltérable (Horodatage, Identifiant unique, Motif).
// ============================================================

/**
 * Logger une consultation avec motif obligatoire.
 * Utilisé par les routeurs métier quand un acteur consulte un dossier sensible.
 */
export async function logConsultationWithMotif(params: {
  actorId: number;
  actorRole: string;
  targetType: "parcelle" | "titre_foncier" | "acte_notarie" | "credit" | "hypotheque" | "certificat_foncier";
  targetId: number;
  motif: string;
  ipHash?: string;
}) {
  await createAuditEvent({
    actorId: params.actorId,
    actorRole: params.actorRole,
    action: "consultation.sensitive",
    targetType: params.targetType,
    targetId: params.targetId,
    details: {
      motif: params.motif,
      timestamp: Date.now(),
      traceId: `TRC-${Date.now()}-${params.actorId}`,
    },
    ipHash: params.ipHash,
  });
}

/**
 * Logger une validation/signature officielle avec motif.
 */
export async function logValidationWithMotif(params: {
  actorId: number;
  actorRole: string;
  targetType: string;
  targetId: number;
  decision: "approved" | "rejected";
  motif: string;
  ipHash?: string;
}) {
  await createAuditEvent({
    actorId: params.actorId,
    actorRole: params.actorRole,
    action: `validation.${params.decision}`,
    targetType: params.targetType,
    targetId: params.targetId,
    details: {
      decision: params.decision,
      motif: params.motif,
      timestamp: Date.now(),
      traceId: `VAL-${Date.now()}-${params.actorId}`,
    },
    ipHash: params.ipHash,
  });
}

// ============================================================
// ROUTEUR D'AUDIT AVANCÉ (consultation par l'admin)
// ============================================================

export const auditTraceRouter = router({
  /** Rechercher dans le journal d'audit avec filtres avancés */
  searchAuditTrail: protectedProcedure
    .input(z.object({
      actorId: z.number().optional(),
      actorRole: z.string().optional(),
      action: z.string().optional(),
      targetType: z.string().optional(),
      targetId: z.number().optional(),
      dateFrom: z.number().optional(), // timestamp ms
      dateTo: z.number().optional(),
      limit: z.number().min(1).max(200).default(50),
      offset: z.number().min(0).default(0),
    }))
    .query(async ({ ctx, input }) => {
      // Seuls les admins peuvent consulter l'audit trail complet
      if (ctx.user.role !== "admin") {
        // Les autres rôles ne voient que leurs propres entrées
        input.actorId = ctx.user.id;
      }

      const db = (await getDb())!;
      const conditions: any[] = [];

      if (input.actorId) conditions.push(eq(auditEvents.actorId, input.actorId));
      if (input.actorRole) conditions.push(eq(auditEvents.actorRole, input.actorRole));
      if (input.action) conditions.push(like(auditEvents.action, `%${input.action}%`));
      if (input.targetType) conditions.push(eq(auditEvents.targetType, input.targetType));
      if (input.targetId) conditions.push(eq(auditEvents.targetId, input.targetId));
      if (input.dateFrom) conditions.push(gte(auditEvents.createdAt, new Date(input.dateFrom)));
      if (input.dateTo) conditions.push(lte(auditEvents.createdAt, new Date(input.dateTo)));

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      const [results, countResult] = await Promise.all([
        db.select().from(auditEvents)
          .where(whereClause)
          .orderBy(desc(auditEvents.createdAt))
          .limit(input.limit)
          .offset(input.offset),
        db.select({ count: sql<number>`COUNT(*)` }).from(auditEvents).where(whereClause),
      ]);

      return {
        events: results,
        total: countResult[0]?.count ?? 0,
        limit: input.limit,
        offset: input.offset,
      };
    }),

  /** Statistiques d'audit par rôle et action */
  auditStats: protectedProcedure.query(async ({ ctx }) => {
    if (ctx.user.role !== "admin") {
      return { byRole: [], byAction: [], total: 0 };
    }

    const db = (await getDb())!;

    const [byRole, byAction, totalResult] = await Promise.all([
      db.select({
        role: auditEvents.actorRole,
        count: sql<number>`COUNT(*)`.as("count"),
      }).from(auditEvents).groupBy(auditEvents.actorRole),

      db.select({
        action: auditEvents.action,
        count: sql<number>`COUNT(*)`.as("count"),
      }).from(auditEvents).groupBy(auditEvents.action).orderBy(desc(sql`count`)).limit(20),

      db.select({ count: sql<number>`COUNT(*)` }).from(auditEvents),
    ]);

    return {
      byRole,
      byAction,
      total: totalResult[0]?.count ?? 0,
    };
  }),
});
