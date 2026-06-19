import { z } from "zod";
import { eq, and, isNull, desc, sql, like } from "drizzle-orm";
import { router, erpPermissionProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { createAuditEvent } from "../db";
import {
  erpMaterialRequests,
  erpMaterialRequestLines,
  erpInventoryItems,
  erpStockMovements,
} from "../../drizzle/schema";

// ============================================================
// CONSTANTS
// ============================================================

const REQUEST_STATUSES = ["draft", "submitted", "approved", "rejected", "partially_fulfilled", "fulfilled", "cancelled"] as const;
const PRIORITIES = ["low", "medium", "high", "urgent"] as const;

// ============================================================
// MATERIAL REQUESTS ROUTER
// ============================================================

export const erpMaterialRequestsRouter = router({
  list: erpPermissionProcedure("inventory", "view").input(
    z.object({
      projectId: z.number().optional(),
      status: z.string().optional(),
      priority: z.string().optional(),
      search: z.string().optional(),
      limit: z.number().min(1).max(100).default(50),
      offset: z.number().min(0).default(0),
    }).optional()
  ).query(async ({ input }) => {
    const db = (await getDb())!;
    const params = input || { limit: 50, offset: 0 };

    let conditions = [isNull(erpMaterialRequests.deletedAt)];
    if (params.projectId) conditions.push(eq(erpMaterialRequests.projectId, params.projectId));
    if (params.status) conditions.push(eq(erpMaterialRequests.status, params.status));
    if (params.priority) conditions.push(eq(erpMaterialRequests.priority, params.priority));
    if (params.search) conditions.push(like(erpMaterialRequests.title, `%${params.search}%`));

    const where = and(...conditions);

    const requests = await db.select().from(erpMaterialRequests)
      .where(where)
      .orderBy(desc(erpMaterialRequests.updatedAt))
      .limit(params.limit)
      .offset(params.offset);

    const [countResult] = await db.select({ count: sql<number>`COUNT(*)` })
      .from(erpMaterialRequests).where(where);

    return { requests, total: countResult.count };
  }),

  getById: erpPermissionProcedure("inventory", "view").input(
    z.object({ id: z.number() })
  ).query(async ({ input }) => {
    const db = (await getDb())!;

    const [request] = await db.select().from(erpMaterialRequests)
      .where(and(eq(erpMaterialRequests.id, input.id), isNull(erpMaterialRequests.deletedAt)));
    if (!request) throw new Error("Demande introuvable");

    // Lignes avec infos article
    const lines = await db.select().from(erpMaterialRequestLines)
      .where(eq(erpMaterialRequestLines.requestId, input.id));

    const enrichedLines = await Promise.all(lines.map(async (line) => {
      const [item] = await db.select({
        id: erpInventoryItems.id,
        sku: erpInventoryItems.sku,
        name: erpInventoryItems.name,
        unit: erpInventoryItems.unit,
        currentStock: erpInventoryItems.currentStock,
      }).from(erpInventoryItems).where(eq(erpInventoryItems.id, line.itemId));
      return { ...line, item: item || null };
    }));

    return { ...request, lines: enrichedLines };
  }),

  create: erpPermissionProcedure("inventory", "create").input(
    z.object({
      projectId: z.number().optional(),
      title: z.string().min(2).max(255),
      description: z.string().optional(),
      priority: z.enum(PRIORITIES).default("medium"),
      lines: z.array(z.object({
        itemId: z.number(),
        quantityRequested: z.number().min(1),
        notes: z.string().optional(),
      })).min(1),
    })
  ).mutation(async ({ input, ctx }) => {
    const db = (await getDb())!;
    const now = Date.now();

    // Générer numéro de demande
    const [countResult] = await db.select({ count: sql<number>`COUNT(*)` })
      .from(erpMaterialRequests);
    const requestNumber = `MR-${String(countResult.count + 1).padStart(5, "0")}`;

    const [result] = await db.insert(erpMaterialRequests).values({
      projectId: input.projectId || null,
      requestNumber,
      title: input.title,
      description: input.description || null,
      status: "draft",
      priority: input.priority,
      requestedBy: ctx.user.id,
      createdAt: now,
      updatedAt: now,
    });

    // Ajouter les lignes
    for (const line of input.lines) {
      await db.insert(erpMaterialRequestLines).values({
        requestId: result.insertId,
        itemId: line.itemId,
        quantityRequested: line.quantityRequested,
        quantityFulfilled: 0,
        notes: line.notes || null,
        createdAt: now,
      });
    }

    await createAuditEvent({
      actorId: ctx.user.id,
      action: "erp.material_request.created",
      targetType: "erp_material_request",
      targetId: result.insertId,
      details: { requestNumber, title: input.title, linesCount: input.lines.length },
    });

    return { id: result.insertId, requestNumber };
  }),

  update: erpPermissionProcedure("inventory", "edit").input(
    z.object({
      id: z.number(),
      title: z.string().min(2).max(255).optional(),
      description: z.string().optional(),
      priority: z.enum(PRIORITIES).optional(),
    })
  ).mutation(async ({ input, ctx }) => {
    const db = (await getDb())!;
    const { id, ...updates } = input;

    const [request] = await db.select().from(erpMaterialRequests)
      .where(and(eq(erpMaterialRequests.id, id), isNull(erpMaterialRequests.deletedAt)));
    if (!request) throw new Error("Demande introuvable");
    if (request.status !== "draft") throw new Error("Seules les demandes en brouillon peuvent être modifiées");

    await db.update(erpMaterialRequests).set({ ...updates, updatedAt: Date.now() })
      .where(eq(erpMaterialRequests.id, id));

    return { success: true };
  }),

  delete: erpPermissionProcedure("inventory", "delete").input(
    z.object({ id: z.number() })
  ).mutation(async ({ input, ctx }) => {
    const db = (await getDb())!;

    const [request] = await db.select().from(erpMaterialRequests)
      .where(and(eq(erpMaterialRequests.id, input.id), isNull(erpMaterialRequests.deletedAt)));
    if (!request) throw new Error("Demande introuvable");
    if (!["draft", "rejected", "cancelled"].includes(request.status)) {
      throw new Error("Seules les demandes en brouillon, rejetées ou annulées peuvent être supprimées");
    }

    await db.update(erpMaterialRequests).set({ deletedAt: Date.now(), updatedAt: Date.now() })
      .where(eq(erpMaterialRequests.id, input.id));

    await createAuditEvent({
      actorId: ctx.user.id,
      action: "erp.material_request.deleted",
      targetType: "erp_material_request",
      targetId: input.id,
      details: { requestNumber: request.requestNumber },
    });

    return { success: true };
  }),

  submit: erpPermissionProcedure("inventory", "edit").input(
    z.object({ id: z.number() })
  ).mutation(async ({ input, ctx }) => {
    const db = (await getDb())!;

    const [request] = await db.select().from(erpMaterialRequests)
      .where(and(eq(erpMaterialRequests.id, input.id), isNull(erpMaterialRequests.deletedAt)));
    if (!request) throw new Error("Demande introuvable");
    if (request.status !== "draft") throw new Error("Seules les demandes en brouillon peuvent être soumises");

    // Vérifier qu'il y a au moins une ligne
    const lines = await db.select().from(erpMaterialRequestLines)
      .where(eq(erpMaterialRequestLines.requestId, input.id));
    if (lines.length === 0) throw new Error("La demande doit contenir au moins une ligne");

    await db.update(erpMaterialRequests)
      .set({ status: "submitted", updatedAt: Date.now() })
      .where(eq(erpMaterialRequests.id, input.id));

    await createAuditEvent({
      actorId: ctx.user.id,
      action: "erp.material_request.submitted",
      targetType: "erp_material_request",
      targetId: input.id,
      details: { requestNumber: request.requestNumber },
    });

    return { success: true };
  }),

  approve: erpPermissionProcedure("inventory", "approve").input(
    z.object({ id: z.number() })
  ).mutation(async ({ input, ctx }) => {
    const db = (await getDb())!;

    const [request] = await db.select().from(erpMaterialRequests)
      .where(and(eq(erpMaterialRequests.id, input.id), isNull(erpMaterialRequests.deletedAt)));
    if (!request) throw new Error("Demande introuvable");
    if (request.status !== "submitted") throw new Error("Seules les demandes soumises peuvent être approuvées");

    await db.update(erpMaterialRequests).set({
      status: "approved",
      approvedBy: ctx.user.id,
      approvedAt: Date.now(),
      updatedAt: Date.now(),
    }).where(eq(erpMaterialRequests.id, input.id));

    await createAuditEvent({
      actorId: ctx.user.id,
      action: "erp.material_request.approved",
      targetType: "erp_material_request",
      targetId: input.id,
      details: { requestNumber: request.requestNumber },
    });

    return { success: true };
  }),

  reject: erpPermissionProcedure("inventory", "approve").input(
    z.object({
      id: z.number(),
      reason: z.string().min(5),
    })
  ).mutation(async ({ input, ctx }) => {
    const db = (await getDb())!;

    const [request] = await db.select().from(erpMaterialRequests)
      .where(and(eq(erpMaterialRequests.id, input.id), isNull(erpMaterialRequests.deletedAt)));
    if (!request) throw new Error("Demande introuvable");
    if (request.status !== "submitted") throw new Error("Seules les demandes soumises peuvent être rejetées");

    await db.update(erpMaterialRequests).set({
      status: "rejected",
      rejectedBy: ctx.user.id,
      rejectedAt: Date.now(),
      rejectionReason: input.reason,
      updatedAt: Date.now(),
    }).where(eq(erpMaterialRequests.id, input.id));

    await createAuditEvent({
      actorId: ctx.user.id,
      action: "erp.material_request.rejected",
      targetType: "erp_material_request",
      targetId: input.id,
      details: { requestNumber: request.requestNumber, reason: input.reason },
    });

    return { success: true };
  }),

  fulfill: erpPermissionProcedure("inventory", "edit").input(
    z.object({
      id: z.number(),
      lines: z.array(z.object({
        lineId: z.number(),
        quantityToFulfill: z.number().min(1),
      })).min(1),
    })
  ).mutation(async ({ input, ctx }) => {
    const db = (await getDb())!;

    const [request] = await db.select().from(erpMaterialRequests)
      .where(and(eq(erpMaterialRequests.id, input.id), isNull(erpMaterialRequests.deletedAt)));
    if (!request) throw new Error("Demande introuvable");
    if (!["approved", "partially_fulfilled"].includes(request.status)) {
      throw new Error("Seules les demandes approuvées ou partiellement livrées peuvent être livrées");
    }

    const now = Date.now();

    for (const fulfillLine of input.lines) {
      // Récupérer la ligne
      const [line] = await db.select().from(erpMaterialRequestLines)
        .where(and(
          eq(erpMaterialRequestLines.id, fulfillLine.lineId),
          eq(erpMaterialRequestLines.requestId, input.id)
        ));
      if (!line) throw new Error(`Ligne ${fulfillLine.lineId} introuvable`);

      const remaining = line.quantityRequested - line.quantityFulfilled;
      if (fulfillLine.quantityToFulfill > remaining) {
        throw new Error(`Quantité demandée (${fulfillLine.quantityToFulfill}) dépasse le restant (${remaining}) pour la ligne ${fulfillLine.lineId}`);
      }

      // Vérifier le stock disponible
      const [item] = await db.select().from(erpInventoryItems)
        .where(eq(erpInventoryItems.id, line.itemId));
      if (!item) throw new Error(`Article ${line.itemId} introuvable`);
      if (item.currentStock < fulfillLine.quantityToFulfill) {
        throw new Error(`Stock insuffisant pour ${item.name}. Disponible: ${item.currentStock}, Demandé: ${fulfillLine.quantityToFulfill}`);
      }

      // Décrémenter le stock
      const previousStock = item.currentStock;
      const newStock = previousStock - fulfillLine.quantityToFulfill;

      await db.update(erpInventoryItems)
        .set({ currentStock: newStock, updatedAt: now })
        .where(eq(erpInventoryItems.id, line.itemId));

      // Enregistrer le mouvement
      await db.insert(erpStockMovements).values({
        itemId: line.itemId,
        locationId: item.locationId,
        projectId: request.projectId,
        type: "OUT",
        quantity: fulfillLine.quantityToFulfill,
        previousStock,
        newStock,
        reference: `MR:${request.requestNumber}`,
        notes: `Livraison demande ${request.requestNumber}`,
        performedBy: ctx.user.id,
        createdAt: now,
      });

      // Mettre à jour la ligne
      await db.update(erpMaterialRequestLines)
        .set({ quantityFulfilled: line.quantityFulfilled + fulfillLine.quantityToFulfill })
        .where(eq(erpMaterialRequestLines.id, fulfillLine.lineId));
    }

    // Vérifier si toutes les lignes sont complètement livrées
    const allLines = await db.select().from(erpMaterialRequestLines)
      .where(eq(erpMaterialRequestLines.requestId, input.id));

    const allFulfilled = allLines.every(l => l.quantityFulfilled >= l.quantityRequested);
    const newStatus = allFulfilled ? "fulfilled" : "partially_fulfilled";

    await db.update(erpMaterialRequests)
      .set({ status: newStatus, updatedAt: now })
      .where(eq(erpMaterialRequests.id, input.id));

    await createAuditEvent({
      actorId: ctx.user.id,
      action: `erp.material_request.${newStatus}`,
      targetType: "erp_material_request",
      targetId: input.id,
      details: { requestNumber: request.requestNumber, linesDelivered: input.lines.length, newStatus },
    });

    return { success: true, newStatus };
  }),

  // --- STATS ---

  stats: erpPermissionProcedure("inventory", "view").input(
    z.object({ projectId: z.number().optional() }).optional()
  ).query(async ({ input }) => {
    const db = (await getDb())!;

    let conditions = [isNull(erpMaterialRequests.deletedAt)];
    if (input?.projectId) conditions.push(eq(erpMaterialRequests.projectId, input.projectId));
    const where = and(...conditions);

    const [totals] = await db.select({
      total: sql<number>`COUNT(*)`,
      pending: sql<number>`SUM(CASE WHEN status = 'submitted' THEN 1 ELSE 0 END)`,
      approved: sql<number>`SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END)`,
      fulfilled: sql<number>`SUM(CASE WHEN status = 'fulfilled' THEN 1 ELSE 0 END)`,
      partiallyFulfilled: sql<number>`SUM(CASE WHEN status = 'partially_fulfilled' THEN 1 ELSE 0 END)`,
      rejected: sql<number>`SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END)`,
    }).from(erpMaterialRequests).where(where);

    return {
      total: totals.total,
      pending: totals.pending || 0,
      approved: totals.approved || 0,
      fulfilled: totals.fulfilled || 0,
      partiallyFulfilled: totals.partiallyFulfilled || 0,
      rejected: totals.rejected || 0,
    };
  }),
});
