import { z } from "zod";
import { eq, and, desc, sql } from "drizzle-orm";
import { router, protectedProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { erpNotifications } from "../../drizzle/schema";

// ============================================================
// ERP NOTIFICATIONS ROUTER — Sprint 14
// ============================================================

const MODULES = ["finance", "projects", "inventory", "safety", "compliance", "equipment", "general"] as const;
const PRIORITIES = ["low", "medium", "high", "critical"] as const;

export const erpNotificationsRouter = router({
  /**
   * GET — Liste des notifications de l'utilisateur
   */
  list: protectedProcedure.input(
    z.object({
      module: z.string().optional(),
      priority: z.enum(PRIORITIES).optional(),
      isRead: z.boolean().optional(),
      limit: z.number().min(1).max(100).default(50),
      offset: z.number().min(0).default(0),
    }).optional()
  ).query(async ({ input, ctx }) => {
    const db = (await getDb())!;
    const params = input || { limit: 50, offset: 0 };
    const conditions: any[] = [eq(erpNotifications.userId, ctx.user.id)];
    if (params.module) conditions.push(eq(erpNotifications.module, params.module));
    if (params.priority) conditions.push(eq(erpNotifications.priority, params.priority));
    if (params.isRead !== undefined) conditions.push(eq(erpNotifications.isRead, params.isRead));
    const where = and(...conditions);
    const items = await db.select().from(erpNotifications)
      .where(where)
      .orderBy(desc(erpNotifications.createdAt))
      .limit(params.limit)
      .offset(params.offset);
    return { notifications: items };
  }),

  /**
   * GET — Nombre de notifications non lues
   */
  unreadCount: protectedProcedure.query(async ({ ctx }) => {
    const db = (await getDb())!;
    const result = await db.select({ count: sql<number>`count(*)` }).from(erpNotifications)
      .where(and(
        eq(erpNotifications.userId, ctx.user.id),
        eq(erpNotifications.isRead, false),
      ));
    return { count: result[0]?.count || 0 };
  }),

  /**
   * GET — Notifications non lues (liste)
   */
  unread: protectedProcedure.input(
    z.object({ limit: z.number().min(1).max(50).default(20) }).optional()
  ).query(async ({ input, ctx }) => {
    const db = (await getDb())!;
    const limit = input?.limit || 20;
    const items = await db.select().from(erpNotifications)
      .where(and(
        eq(erpNotifications.userId, ctx.user.id),
        eq(erpNotifications.isRead, false),
      ))
      .orderBy(desc(erpNotifications.createdAt))
      .limit(limit);
    return { notifications: items };
  }),

  /**
   * POST — Marquer une notification comme lue
   */
  markRead: protectedProcedure.input(
    z.object({ id: z.number() })
  ).mutation(async ({ input, ctx }) => {
    const db = (await getDb())!;
    const [notif] = await db.select().from(erpNotifications)
      .where(and(
        eq(erpNotifications.id, input.id),
        eq(erpNotifications.userId, ctx.user.id),
      ));
    if (!notif) throw new Error("Notification introuvable");
    if (notif.isRead) return { success: true };
    await db.update(erpNotifications).set({
      isRead: true,
      readAt: Date.now(),
    }).where(eq(erpNotifications.id, input.id));
    return { success: true };
  }),

  /**
   * POST — Marquer toutes les notifications comme lues
   */
  markAllRead: protectedProcedure.mutation(async ({ ctx }) => {
    const db = (await getDb())!;
    const now = Date.now();
    await db.update(erpNotifications).set({
      isRead: true,
      readAt: now,
    }).where(and(
      eq(erpNotifications.userId, ctx.user.id),
      eq(erpNotifications.isRead, false),
    ));
    return { success: true };
  }),
});
