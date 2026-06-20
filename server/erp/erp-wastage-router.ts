import { z } from "zod";
import { eq, and, desc, isNull, sql } from "drizzle-orm";
import { router, erpPermissionProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { createAuditEvent } from "../db";
import {
  erpWastageRecords,
  erpInventoryItems,
  erpProjects,
} from "../../drizzle/schema";

// ============================================================
// ERP WASTAGE ANALYSIS ROUTER — Sprint 12
// ============================================================

const WASTAGE_CAUSES = ["breakage", "theft", "bad_estimate", "order_error", "poor_storage", "supplier_defect", "other"] as const;

export const erpWastageRouter = router({
  /**
   * GET — Liste des pertes avec filtres
   */
  list: erpPermissionProcedure("erp_inventory", "view").input(
    z.object({
      projectId: z.number().optional(),
      itemId: z.number().optional(),
      cause: z.enum(WASTAGE_CAUSES).optional(),
      dateFrom: z.number().optional(),
      dateTo: z.number().optional(),
      limit: z.number().min(1).max(100).default(50),
      offset: z.number().min(0).default(0),
    }).optional()
  ).query(async ({ input }) => {
    const db = (await getDb())!;
    const params = input || { limit: 50, offset: 0 };

    const conditions: any[] = [isNull(erpWastageRecords.deletedAt)];
    if (params.projectId) conditions.push(eq(erpWastageRecords.projectId, params.projectId));
    if (params.itemId) conditions.push(eq(erpWastageRecords.itemId, params.itemId));
    if (params.cause) conditions.push(eq(erpWastageRecords.cause, params.cause));
    if (params.dateFrom) conditions.push(sql`${erpWastageRecords.recordedAt} >= ${params.dateFrom}`);
    if (params.dateTo) conditions.push(sql`${erpWastageRecords.recordedAt} <= ${params.dateTo}`);

    const where = and(...conditions);

    const [items, countResult] = await Promise.all([
      db.select().from(erpWastageRecords)
        .where(where)
        .orderBy(desc(erpWastageRecords.recordedAt))
        .limit(params.limit)
        .offset(params.offset),
      db.select({ count: sql<number>`COUNT(*)` }).from(erpWastageRecords).where(where),
    ]);

    return { items, total: countResult[0].count };
  }),

  /**
   * GET — Détail d'une perte
   */
  getById: erpPermissionProcedure("erp_inventory", "view").input(
    z.object({ id: z.number() })
  ).query(async ({ input }) => {
    const db = (await getDb())!;

    const [record] = await db.select().from(erpWastageRecords)
      .where(and(eq(erpWastageRecords.id, input.id), isNull(erpWastageRecords.deletedAt)))
      .limit(1);

    if (!record) throw new Error("Enregistrement de perte introuvable");
    return record;
  }),

  /**
   * POST — Enregistrer une perte
   */
  create: erpPermissionProcedure("erp_inventory", "create").input(
    z.object({
      projectId: z.number().optional(),
      itemId: z.number(),
      quantity: z.number().min(1),
      unitCost: z.number().min(0),
      wastagePercentage: z.number().min(0).max(10000).default(0), // x100
      cause: z.enum(WASTAGE_CAUSES),
      description: z.string().optional(),
      correctiveAction: z.string().optional(),
      recordedAt: z.number().optional(),
    })
  ).mutation(async ({ input, ctx }) => {
    const db = (await getDb())!;
    const now = Date.now();
    const totalCost = input.quantity * input.unitCost;

    const [result] = await db.insert(erpWastageRecords).values({
      projectId: input.projectId || null,
      itemId: input.itemId,
      quantity: input.quantity,
      unitCost: input.unitCost,
      totalCost,
      wastagePercentage: input.wastagePercentage,
      cause: input.cause,
      description: input.description || null,
      correctiveAction: input.correctiveAction || null,
      recordedBy: ctx.user.id,
      recordedAt: input.recordedAt || now,
      createdAt: now,
      updatedAt: now,
    });

    await createAuditEvent({
      actorId: ctx.user.id,
      action: "erp.wastage.created",
      targetType: "erp_wastage_record",
      targetId: result.insertId,
      details: { itemId: input.itemId, quantity: input.quantity, cause: input.cause, totalCost },
    });

    return { id: result.insertId };
  }),

  /**
   * PUT — Modifier une perte
   */
  update: erpPermissionProcedure("erp_inventory", "update").input(
    z.object({
      id: z.number(),
      quantity: z.number().min(1).optional(),
      unitCost: z.number().min(0).optional(),
      wastagePercentage: z.number().min(0).max(10000).optional(),
      cause: z.enum(WASTAGE_CAUSES).optional(),
      description: z.string().optional(),
      correctiveAction: z.string().optional(),
    })
  ).mutation(async ({ input, ctx }) => {
    const db = (await getDb())!;
    const now = Date.now();

    const [existing] = await db.select().from(erpWastageRecords)
      .where(and(eq(erpWastageRecords.id, input.id), isNull(erpWastageRecords.deletedAt)))
      .limit(1);
    if (!existing) throw new Error("Enregistrement de perte introuvable");

    const updates: Record<string, unknown> = { updatedAt: now };
    if (input.quantity !== undefined) updates.quantity = input.quantity;
    if (input.unitCost !== undefined) updates.unitCost = input.unitCost;
    if (input.wastagePercentage !== undefined) updates.wastagePercentage = input.wastagePercentage;
    if (input.cause !== undefined) updates.cause = input.cause;
    if (input.description !== undefined) updates.description = input.description;
    if (input.correctiveAction !== undefined) updates.correctiveAction = input.correctiveAction;

    // Recalculer totalCost si quantity ou unitCost change
    const qty = (input.quantity !== undefined ? input.quantity : existing.quantity);
    const cost = (input.unitCost !== undefined ? input.unitCost : existing.unitCost);
    updates.totalCost = qty * cost;

    await db.update(erpWastageRecords).set(updates).where(eq(erpWastageRecords.id, input.id));

    await createAuditEvent({
      actorId: ctx.user.id,
      action: "erp.wastage.updated",
      targetType: "erp_wastage_record",
      targetId: input.id,
      details: updates,
    });

    return { success: true };
  }),

  /**
   * DELETE — Supprimer une perte (soft delete)
   */
  delete: erpPermissionProcedure("erp_inventory", "delete").input(
    z.object({ id: z.number() })
  ).mutation(async ({ input, ctx }) => {
    const db = (await getDb())!;
    const now = Date.now();

    const [existing] = await db.select().from(erpWastageRecords)
      .where(and(eq(erpWastageRecords.id, input.id), isNull(erpWastageRecords.deletedAt)))
      .limit(1);
    if (!existing) throw new Error("Enregistrement de perte introuvable");

    await db.update(erpWastageRecords).set({ deletedAt: now, updatedAt: now })
      .where(eq(erpWastageRecords.id, input.id));

    await createAuditEvent({
      actorId: ctx.user.id,
      action: "erp.wastage.deleted",
      targetType: "erp_wastage_record",
      targetId: input.id,
      details: { itemId: existing.itemId },
    });

    return { success: true };
  }),

  /**
   * GET — Analyse des pertes (par projet, matériau, cause)
   */
  analysis: erpPermissionProcedure("erp_inventory", "view").input(
    z.object({
      groupBy: z.enum(["project", "item", "cause"]),
      projectId: z.number().optional(),
      dateFrom: z.number().optional(),
      dateTo: z.number().optional(),
    })
  ).query(async ({ input }) => {
    const db = (await getDb())!;

    const conditions: any[] = [isNull(erpWastageRecords.deletedAt)];
    if (input.projectId) conditions.push(eq(erpWastageRecords.projectId, input.projectId));
    if (input.dateFrom) conditions.push(sql`${erpWastageRecords.recordedAt} >= ${input.dateFrom}`);
    if (input.dateTo) conditions.push(sql`${erpWastageRecords.recordedAt} <= ${input.dateTo}`);

    const where = and(...conditions);

    let groupField: any;
    if (input.groupBy === "project") groupField = erpWastageRecords.projectId;
    else if (input.groupBy === "item") groupField = erpWastageRecords.itemId;
    else groupField = erpWastageRecords.cause;

    const results = await db.select({
      groupKey: groupField,
      totalQuantity: sql<number>`SUM(${erpWastageRecords.quantity})`,
      totalCost: sql<number>`SUM(${erpWastageRecords.totalCost})`,
      recordCount: sql<number>`COUNT(*)`,
      avgWastagePercent: sql<number>`AVG(${erpWastageRecords.wastagePercentage})`,
    }).from(erpWastageRecords)
      .where(where)
      .groupBy(groupField)
      .orderBy(sql`SUM(${erpWastageRecords.totalCost}) DESC`);

    return results;
  }),

  /**
   * GET — Pertes d'un projet
   */
  byProject: erpPermissionProcedure("erp_inventory", "view").input(
    z.object({ projectId: z.number() })
  ).query(async ({ input }) => {
    const db = (await getDb())!;

    const records = await db.select().from(erpWastageRecords)
      .where(and(
        eq(erpWastageRecords.projectId, input.projectId),
        isNull(erpWastageRecords.deletedAt)
      ))
      .orderBy(desc(erpWastageRecords.recordedAt));

    return records;
  }),

  /**
   * GET — KPI pertes
   */
  stats: erpPermissionProcedure("erp_inventory", "view").input(
    z.object({
      projectId: z.number().optional(),
      dateFrom: z.number().optional(),
      dateTo: z.number().optional(),
    }).optional()
  ).query(async ({ input }) => {
    const db = (await getDb())!;
    const params = input || {};

    const conditions: any[] = [isNull(erpWastageRecords.deletedAt)];
    if (params.projectId) conditions.push(eq(erpWastageRecords.projectId, params.projectId));
    if (params.dateFrom) conditions.push(sql`${erpWastageRecords.recordedAt} >= ${params.dateFrom}`);
    if (params.dateTo) conditions.push(sql`${erpWastageRecords.recordedAt} <= ${params.dateTo}`);

    const where = and(...conditions);

    const [stats] = await db.select({
      totalRecords: sql<number>`COUNT(*)`,
      totalQuantity: sql<number>`COALESCE(SUM(${erpWastageRecords.quantity}), 0)`,
      totalCost: sql<number>`COALESCE(SUM(${erpWastageRecords.totalCost}), 0)`,
      avgWastagePercent: sql<number>`COALESCE(AVG(${erpWastageRecords.wastagePercentage}), 0)`,
    }).from(erpWastageRecords).where(where);

    // Top causes
    const topCauses = await db.select({
      cause: erpWastageRecords.cause,
      count: sql<number>`COUNT(*)`,
      totalCost: sql<number>`SUM(${erpWastageRecords.totalCost})`,
    }).from(erpWastageRecords)
      .where(where)
      .groupBy(erpWastageRecords.cause)
      .orderBy(sql`SUM(${erpWastageRecords.totalCost}) DESC`)
      .limit(5);

    return { ...stats, topCauses };
  }),
});
