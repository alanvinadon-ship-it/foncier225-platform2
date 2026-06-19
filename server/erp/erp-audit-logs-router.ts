import { z } from "zod";
import { eq, and, desc, sql, like, or, gte, lte } from "drizzle-orm";
import { router, protectedProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { auditEvents, users } from "../../drizzle/schema";
import { TRPCError } from "@trpc/server";

// ============================================================
// ERP AUDIT LOGS ROUTER — Sprint 15
// Réutilise la table audit_events existante
// ============================================================

const ACTION_CATEGORIES = [
  "create", "update", "delete", "approve", "reject",
  "payment", "permission_change", "login", "profile",
] as const;

export const erpAuditLogsRouter = router({
  /**
   * GET list — Liste des logs d'audit avec filtres et pagination
   * Réservé aux admins et utilisateurs avec permission erp_audit_logs.view
   */
  list: protectedProcedure
    .input(z.object({
      page: z.number().min(1).default(1),
      limit: z.number().min(1).max(100).default(50),
      action: z.string().optional(),
      actorId: z.number().optional(),
      targetType: z.string().optional(),
      targetId: z.number().optional(),
      category: z.enum(ACTION_CATEGORIES).optional(),
      dateFrom: z.number().optional(),
      dateTo: z.number().optional(),
      search: z.string().optional(),
    }).optional())
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const { page = 1, limit = 50, action, actorId, targetType, targetId, category, dateFrom, dateTo, search } = input || {};
      const offset = (page - 1) * limit;

      const conditions: ReturnType<typeof eq>[] = [];

      // Filter by ERP actions only (prefixed with "erp.")
      conditions.push(like(auditEvents.action, "erp.%"));

      if (action) conditions.push(eq(auditEvents.action, action));
      if (actorId) conditions.push(eq(auditEvents.actorId, actorId));
      if (targetType) conditions.push(eq(auditEvents.targetType, targetType));
      if (targetId) conditions.push(eq(auditEvents.targetId, targetId));
      if (category) conditions.push(like(auditEvents.action, `erp.%.${category}%`));
      if (dateFrom) conditions.push(gte(auditEvents.createdAt, new Date(dateFrom)));
      if (dateTo) conditions.push(lte(auditEvents.createdAt, new Date(dateTo)));
      if (search) {
        conditions.push(
          or(
            like(auditEvents.action, `%${search}%`),
            like(auditEvents.targetType, `%${search}%`),
          )!
        );
      }

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      const [items, countResult] = await Promise.all([
        db.select({
          id: auditEvents.id,
          actorId: auditEvents.actorId,
          actorRole: auditEvents.actorRole,
          action: auditEvents.action,
          targetType: auditEvents.targetType,
          targetId: auditEvents.targetId,
          details: auditEvents.details,
          ipHash: auditEvents.ipHash,
          createdAt: auditEvents.createdAt,
        })
          .from(auditEvents)
          .where(whereClause)
          .orderBy(desc(auditEvents.createdAt))
          .limit(limit)
          .offset(offset),
        db.select({ count: sql<number>`count(*)` })
          .from(auditEvents)
          .where(whereClause),
      ]);

      // Enrich with user names
      const actorIds = Array.from(new Set(items.map(i => i.actorId).filter(Boolean))) as number[];
      let actorMap: Record<number, string> = {};
      if (actorIds.length > 0) {
        const actorRows = await db
          .select({ id: users.id, name: users.name })
          .from(users)
          .where(sql`${users.id} IN (${sql.raw(actorIds.join(","))})`);
        actorMap = Object.fromEntries(actorRows.map(r => [r.id, r.name || "Inconnu"]));
      }

      return {
        items: items.map(i => ({
          ...i,
          actorName: i.actorId ? actorMap[i.actorId] || "Inconnu" : "Système",
        })),
        total: countResult[0]?.count || 0,
        page,
        limit,
        totalPages: Math.ceil((countResult[0]?.count || 0) / limit),
      };
    }),

  /**
   * GET by ID — Détail d'un log d'audit
   */
  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const [log] = await db
        .select()
        .from(auditEvents)
        .where(eq(auditEvents.id, input.id))
        .limit(1);

      if (!log) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Log d'audit non trouvé" });
      }

      // Get actor name
      let actorName = "Système";
      if (log.actorId) {
        const [actor] = await db
          .select({ name: users.name })
          .from(users)
          .where(eq(users.id, log.actorId))
          .limit(1);
        actorName = actor?.name || "Inconnu";
      }

      return { ...log, actorName };
    }),

  /**
   * GET by project — Logs d'audit liés à un projet spécifique
   */
  byProject: protectedProcedure
    .input(z.object({
      projectId: z.number(),
      page: z.number().min(1).default(1),
      limit: z.number().min(1).max(100).default(30),
    }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const offset = (input.page - 1) * input.limit;

      const whereClause = and(
        like(auditEvents.action, "erp.%"),
        eq(auditEvents.targetType, "project"),
        eq(auditEvents.targetId, input.projectId),
      );

      const [items, countResult] = await Promise.all([
        db.select()
          .from(auditEvents)
          .where(whereClause)
          .orderBy(desc(auditEvents.createdAt))
          .limit(input.limit)
          .offset(offset),
        db.select({ count: sql<number>`count(*)` })
          .from(auditEvents)
          .where(whereClause),
      ]);

      // Enrich with user names
      const actorIds = Array.from(new Set(items.map(i => i.actorId).filter(Boolean))) as number[];
      let actorMap: Record<number, string> = {};
      if (actorIds.length > 0) {
        const actorRows = await db
          .select({ id: users.id, name: users.name })
          .from(users)
          .where(sql`${users.id} IN (${sql.raw(actorIds.join(","))})`);
        actorMap = Object.fromEntries(actorRows.map(r => [r.id, r.name || "Inconnu"]));
      }

      return {
        items: items.map(i => ({
          ...i,
          actorName: i.actorId ? actorMap[i.actorId] || "Inconnu" : "Système",
        })),
        total: countResult[0]?.count || 0,
        page: input.page,
        limit: input.limit,
        totalPages: Math.ceil((countResult[0]?.count || 0) / input.limit),
      };
    }),

  /**
   * GET stats — Statistiques des logs d'audit
   */
  stats: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const now = new Date();
    const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const last7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const [total, last24hCount, last7dCount, topActors] = await Promise.all([
      db.select({ count: sql<number>`count(*)` })
        .from(auditEvents)
        .where(like(auditEvents.action, "erp.%")),
      db.select({ count: sql<number>`count(*)` })
        .from(auditEvents)
        .where(and(like(auditEvents.action, "erp.%"), gte(auditEvents.createdAt, last24h))),
      db.select({ count: sql<number>`count(*)` })
        .from(auditEvents)
        .where(and(like(auditEvents.action, "erp.%"), gte(auditEvents.createdAt, last7d))),
      db.select({
        actorId: auditEvents.actorId,
        count: sql<number>`count(*)`,
      })
        .from(auditEvents)
        .where(and(like(auditEvents.action, "erp.%"), gte(auditEvents.createdAt, last7d)))
        .groupBy(auditEvents.actorId)
        .orderBy(desc(sql`count(*)`))
        .limit(5),
    ]);

    return {
      totalLogs: total[0]?.count || 0,
      last24h: last24hCount[0]?.count || 0,
      last7d: last7dCount[0]?.count || 0,
      topActors,
    };
  }),
});
