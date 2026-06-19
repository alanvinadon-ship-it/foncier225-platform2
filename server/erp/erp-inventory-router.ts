import { z } from "zod";
import { eq, and, isNull, desc, sql, like, lt } from "drizzle-orm";
import { router, erpPermissionProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { createAuditEvent } from "../db";
import {
  erpInventoryItems,
  erpStockLocations,
  erpStockMovements,
} from "../../drizzle/schema";

// ============================================================
// CONSTANTS
// ============================================================

const ITEM_CATEGORIES = [
  "cement", "steel", "wood", "sand", "gravel", "bricks",
  "plumbing", "electrical", "paint", "tools", "safety_equipment", "other"
] as const;

const UNITS = [
  "kg", "tonne", "m3", "m2", "ml", "piece", "sac", "litre", "lot", "palette"
] as const;

const MOVEMENT_TYPES = ["IN", "OUT", "TRANSFER", "ADJUSTMENT", "WASTAGE", "RETURN"] as const;

// ============================================================
// INVENTORY ROUTER
// ============================================================

export const erpInventoryRouter = router({
  // --- ITEMS ---

  listItems: erpPermissionProcedure("inventory", "view").input(
    z.object({
      projectId: z.number().optional(),
      category: z.string().optional(),
      locationId: z.number().optional(),
      search: z.string().optional(),
      criticalOnly: z.boolean().optional(),
      limit: z.number().min(1).max(100).default(50),
      offset: z.number().min(0).default(0),
    }).optional()
  ).query(async ({ input }) => {
    const db = (await getDb())!;
    const params = input || { limit: 50, offset: 0 };

    let conditions = [isNull(erpInventoryItems.deletedAt)];
    if (params.projectId) conditions.push(eq(erpInventoryItems.projectId, params.projectId));
    if (params.category) conditions.push(eq(erpInventoryItems.category, params.category));
    if (params.locationId) conditions.push(eq(erpInventoryItems.locationId, params.locationId));
    if (params.search) conditions.push(like(erpInventoryItems.name, `%${params.search}%`));
    if (params.criticalOnly) conditions.push(sql`${erpInventoryItems.currentStock} < ${erpInventoryItems.minStock}`);

    const where = and(...conditions);

    const items = await db.select().from(erpInventoryItems)
      .where(where)
      .orderBy(desc(erpInventoryItems.updatedAt))
      .limit(params.limit)
      .offset(params.offset);

    const [countResult] = await db.select({ count: sql<number>`COUNT(*)` })
      .from(erpInventoryItems).where(where);

    return { items, total: countResult.count };
  }),

  getItem: erpPermissionProcedure("inventory", "view").input(
    z.object({ id: z.number() })
  ).query(async ({ input }) => {
    const db = (await getDb())!;

    const [item] = await db.select().from(erpInventoryItems)
      .where(and(eq(erpInventoryItems.id, input.id), isNull(erpInventoryItems.deletedAt)));
    if (!item) throw new Error("Article introuvable");

    // Derniers mouvements
    const movements = await db.select().from(erpStockMovements)
      .where(eq(erpStockMovements.itemId, input.id))
      .orderBy(desc(erpStockMovements.createdAt))
      .limit(20);

    // Location
    let location = null;
    if (item.locationId) {
      const [loc] = await db.select().from(erpStockLocations)
        .where(eq(erpStockLocations.id, item.locationId));
      location = loc || null;
    }

    return { ...item, movements, location };
  }),

  createItem: erpPermissionProcedure("inventory", "create").input(
    z.object({
      sku: z.string().min(2).max(64),
      name: z.string().min(2).max(255),
      description: z.string().optional(),
      category: z.string().min(1),
      unit: z.string().min(1),
      minStock: z.number().min(0).default(0),
      maxStock: z.number().min(0).default(0),
      currentStock: z.number().min(0).default(0),
      unitPrice: z.number().min(0).default(0),
      locationId: z.number().optional(),
      projectId: z.number().optional(),
    })
  ).mutation(async ({ input, ctx }) => {
    const db = (await getDb())!;
    const now = Date.now();

    const [result] = await db.insert(erpInventoryItems).values({
      ...input,
      locationId: input.locationId || null,
      projectId: input.projectId || null,
      description: input.description || null,
      imageUrl: null,
      createdBy: ctx.user.id,
      createdAt: now,
      updatedAt: now,
    });

    await createAuditEvent({
      actorId: ctx.user.id,
      action: "erp.inventory.item_created",
      targetType: "erp_inventory_item",
      targetId: result.insertId,
      details: { sku: input.sku, name: input.name, category: input.category },
    });

    return { id: result.insertId };
  }),

  updateItem: erpPermissionProcedure("inventory", "edit").input(
    z.object({
      id: z.number(),
      sku: z.string().min(2).max(64).optional(),
      name: z.string().min(2).max(255).optional(),
      description: z.string().optional(),
      category: z.string().optional(),
      unit: z.string().optional(),
      minStock: z.number().min(0).optional(),
      maxStock: z.number().min(0).optional(),
      unitPrice: z.number().min(0).optional(),
      locationId: z.number().nullable().optional(),
      projectId: z.number().nullable().optional(),
    })
  ).mutation(async ({ input, ctx }) => {
    const db = (await getDb())!;
    const { id, ...updates } = input;

    const [item] = await db.select().from(erpInventoryItems)
      .where(and(eq(erpInventoryItems.id, id), isNull(erpInventoryItems.deletedAt)));
    if (!item) throw new Error("Article introuvable");

    await db.update(erpInventoryItems).set({ ...updates, updatedAt: Date.now() })
      .where(eq(erpInventoryItems.id, id));

    await createAuditEvent({
      actorId: ctx.user.id,
      action: "erp.inventory.item_updated",
      targetType: "erp_inventory_item",
      targetId: id,
      details: { changes: Object.keys(updates) },
    });

    return { success: true };
  }),

  deleteItem: erpPermissionProcedure("inventory", "delete").input(
    z.object({ id: z.number() })
  ).mutation(async ({ input, ctx }) => {
    const db = (await getDb())!;

    const [item] = await db.select().from(erpInventoryItems)
      .where(and(eq(erpInventoryItems.id, input.id), isNull(erpInventoryItems.deletedAt)));
    if (!item) throw new Error("Article introuvable");

    if (item.currentStock > 0) {
      throw new Error("Impossible de supprimer un article avec du stock. Effectuez d'abord un ajustement à 0.");
    }

    await db.update(erpInventoryItems).set({ deletedAt: Date.now(), updatedAt: Date.now() })
      .where(eq(erpInventoryItems.id, input.id));

    await createAuditEvent({
      actorId: ctx.user.id,
      action: "erp.inventory.item_deleted",
      targetType: "erp_inventory_item",
      targetId: input.id,
      details: { sku: item.sku, name: item.name },
    });

    return { success: true };
  }),

  // --- LOCATIONS ---

  listLocations: erpPermissionProcedure("inventory", "view").input(
    z.object({ projectId: z.number().optional() }).optional()
  ).query(async ({ input }) => {
    const db = (await getDb())!;
    let conditions = [isNull(erpStockLocations.deletedAt)];
    if (input?.projectId) conditions.push(eq(erpStockLocations.projectId, input.projectId));

    return db.select().from(erpStockLocations)
      .where(and(...conditions))
      .orderBy(erpStockLocations.name);
  }),

  createLocation: erpPermissionProcedure("inventory", "create").input(
    z.object({
      name: z.string().min(2).max(128),
      description: z.string().optional(),
      address: z.string().optional(),
      projectId: z.number().optional(),
    })
  ).mutation(async ({ input, ctx }) => {
    const db = (await getDb())!;
    const now = Date.now();

    const [result] = await db.insert(erpStockLocations).values({
      name: input.name,
      description: input.description || null,
      address: input.address || null,
      projectId: input.projectId || null,
      createdBy: ctx.user.id,
      createdAt: now,
      updatedAt: now,
    });

    return { id: result.insertId };
  }),

  updateLocation: erpPermissionProcedure("inventory", "edit").input(
    z.object({
      id: z.number(),
      name: z.string().min(2).max(128).optional(),
      description: z.string().optional(),
      address: z.string().optional(),
    })
  ).mutation(async ({ input, ctx }) => {
    const db = (await getDb())!;
    const { id, ...updates } = input;

    await db.update(erpStockLocations).set({ ...updates, updatedAt: Date.now() })
      .where(eq(erpStockLocations.id, id));

    return { success: true };
  }),

  deleteLocation: erpPermissionProcedure("inventory", "delete").input(
    z.object({ id: z.number() })
  ).mutation(async ({ input, ctx }) => {
    const db = (await getDb())!;

    // Vérifier qu'aucun article n'utilise cet emplacement
    const itemsAtLocation = await db.select({ count: sql<number>`COUNT(*)` })
      .from(erpInventoryItems)
      .where(and(eq(erpInventoryItems.locationId, input.id), isNull(erpInventoryItems.deletedAt)));

    if (itemsAtLocation[0].count > 0) {
      throw new Error("Impossible de supprimer un emplacement contenant des articles");
    }

    await db.update(erpStockLocations).set({ deletedAt: Date.now(), updatedAt: Date.now() })
      .where(eq(erpStockLocations.id, input.id));

    return { success: true };
  }),

  // --- MOVEMENTS ---

  addMovement: erpPermissionProcedure("inventory", "edit").input(
    z.object({
      itemId: z.number(),
      locationId: z.number().optional(),
      projectId: z.number().optional(),
      type: z.enum(MOVEMENT_TYPES),
      quantity: z.number().min(1),
      reference: z.string().optional(),
      notes: z.string().optional(),
    })
  ).mutation(async ({ input, ctx }) => {
    const db = (await getDb())!;

    const [item] = await db.select().from(erpInventoryItems)
      .where(and(eq(erpInventoryItems.id, input.itemId), isNull(erpInventoryItems.deletedAt)));
    if (!item) throw new Error("Article introuvable");

    const previousStock = item.currentStock;
    let newStock: number;

    switch (input.type) {
      case "IN":
      case "RETURN":
        newStock = previousStock + input.quantity;
        break;
      case "OUT":
      case "WASTAGE":
        if (input.quantity > previousStock) {
          throw new Error(`Stock insuffisant. Disponible: ${previousStock}, Demandé: ${input.quantity}`);
        }
        newStock = previousStock - input.quantity;
        break;
      case "ADJUSTMENT":
        // L'ajustement met le stock à la quantité spécifiée
        newStock = input.quantity;
        break;
      case "TRANSFER":
        if (input.quantity > previousStock) {
          throw new Error(`Stock insuffisant pour transfert. Disponible: ${previousStock}, Demandé: ${input.quantity}`);
        }
        newStock = previousStock - input.quantity;
        break;
      default:
        throw new Error("Type de mouvement invalide");
    }

    // Enregistrer le mouvement
    const [movement] = await db.insert(erpStockMovements).values({
      itemId: input.itemId,
      locationId: input.locationId || null,
      projectId: input.projectId || null,
      type: input.type,
      quantity: input.quantity,
      previousStock,
      newStock,
      reference: input.reference || null,
      notes: input.notes || null,
      performedBy: ctx.user.id,
      createdAt: Date.now(),
    });

    // Mettre à jour le stock
    await db.update(erpInventoryItems)
      .set({ currentStock: newStock, updatedAt: Date.now() })
      .where(eq(erpInventoryItems.id, input.itemId));

    await createAuditEvent({
      actorId: ctx.user.id,
      action: "erp.inventory.movement_created",
      targetType: "erp_inventory_item",
      targetId: input.itemId,
      details: { type: input.type, quantity: input.quantity, previousStock, newStock },
    });

    return { id: movement.insertId, previousStock, newStock };
  }),

  listMovements: erpPermissionProcedure("inventory", "view").input(
    z.object({
      itemId: z.number().optional(),
      type: z.string().optional(),
      projectId: z.number().optional(),
      limit: z.number().min(1).max(100).default(50),
      offset: z.number().min(0).default(0),
    }).optional()
  ).query(async ({ input }) => {
    const db = (await getDb())!;
    const params = input || { limit: 50, offset: 0 };

    let conditions: any[] = [];
    if (params.itemId) conditions.push(eq(erpStockMovements.itemId, params.itemId));
    if (params.type) conditions.push(eq(erpStockMovements.type, params.type));
    if (params.projectId) conditions.push(eq(erpStockMovements.projectId, params.projectId));

    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const movements = await db.select().from(erpStockMovements)
      .where(where)
      .orderBy(desc(erpStockMovements.createdAt))
      .limit(params.limit)
      .offset(params.offset);

    const [countResult] = await db.select({ count: sql<number>`COUNT(*)` })
      .from(erpStockMovements).where(where);

    return { movements, total: countResult.count };
  }),

  // --- STOCK LEVELS ---

  stockLevels: erpPermissionProcedure("inventory", "view").input(
    z.object({
      projectId: z.number().optional(),
      locationId: z.number().optional(),
      category: z.string().optional(),
    }).optional()
  ).query(async ({ input }) => {
    const db = (await getDb())!;

    let conditions = [isNull(erpInventoryItems.deletedAt)];
    if (input?.projectId) conditions.push(eq(erpInventoryItems.projectId, input.projectId));
    if (input?.locationId) conditions.push(eq(erpInventoryItems.locationId, input.locationId));
    if (input?.category) conditions.push(eq(erpInventoryItems.category, input.category));

    const items = await db.select({
      id: erpInventoryItems.id,
      sku: erpInventoryItems.sku,
      name: erpInventoryItems.name,
      category: erpInventoryItems.category,
      unit: erpInventoryItems.unit,
      currentStock: erpInventoryItems.currentStock,
      minStock: erpInventoryItems.minStock,
      maxStock: erpInventoryItems.maxStock,
      unitPrice: erpInventoryItems.unitPrice,
      locationId: erpInventoryItems.locationId,
    }).from(erpInventoryItems)
      .where(and(...conditions))
      .orderBy(erpInventoryItems.name);

    return items.map(item => ({
      ...item,
      status: item.currentStock <= 0 ? "out_of_stock" as const
        : item.currentStock < item.minStock ? "critical" as const
        : item.currentStock > item.maxStock && item.maxStock > 0 ? "overstock" as const
        : "normal" as const,
      value: item.currentStock * item.unitPrice,
    }));
  }),

  criticalStock: erpPermissionProcedure("inventory", "view").input(
    z.object({ projectId: z.number().optional() }).optional()
  ).query(async ({ input }) => {
    const db = (await getDb())!;

    let conditions = [
      isNull(erpInventoryItems.deletedAt),
      sql`${erpInventoryItems.currentStock} < ${erpInventoryItems.minStock}`,
    ];
    if (input?.projectId) conditions.push(eq(erpInventoryItems.projectId, input.projectId));

    const items = await db.select().from(erpInventoryItems)
      .where(and(...conditions))
      .orderBy(sql`(${erpInventoryItems.currentStock} - ${erpInventoryItems.minStock})`);

    return items.map(item => ({
      ...item,
      deficit: item.minStock - item.currentStock,
      percentOfMin: item.minStock > 0 ? Math.round((item.currentStock / item.minStock) * 100) : 0,
    }));
  }),

  // --- STATS ---

  stats: erpPermissionProcedure("inventory", "view").input(
    z.object({ projectId: z.number().optional() }).optional()
  ).query(async ({ input }) => {
    const db = (await getDb())!;

    let conditions = [isNull(erpInventoryItems.deletedAt)];
    if (input?.projectId) conditions.push(eq(erpInventoryItems.projectId, input.projectId));
    const where = and(...conditions);

    const [totals] = await db.select({
      totalItems: sql<number>`COUNT(*)`,
      totalValue: sql<number>`COALESCE(SUM(${erpInventoryItems.currentStock} * ${erpInventoryItems.unitPrice}), 0)`,
      totalStock: sql<number>`COALESCE(SUM(${erpInventoryItems.currentStock}), 0)`,
    }).from(erpInventoryItems).where(where);

    const [critical] = await db.select({ count: sql<number>`COUNT(*)` })
      .from(erpInventoryItems)
      .where(and(...conditions, sql`${erpInventoryItems.currentStock} < ${erpInventoryItems.minStock}`));

    const [outOfStock] = await db.select({ count: sql<number>`COUNT(*)` })
      .from(erpInventoryItems)
      .where(and(...conditions, sql`${erpInventoryItems.currentStock} <= 0`));

    const [locationsCount] = await db.select({ count: sql<number>`COUNT(*)` })
      .from(erpStockLocations).where(isNull(erpStockLocations.deletedAt));

    const [movementsToday] = await db.select({ count: sql<number>`COUNT(*)` })
      .from(erpStockMovements)
      .where(sql`${erpStockMovements.createdAt} > ${Date.now() - 86400000}`);

    return {
      totalItems: totals.totalItems,
      totalValue: totals.totalValue,
      totalStock: totals.totalStock,
      criticalItems: critical.count,
      outOfStockItems: outOfStock.count,
      locations: locationsCount.count,
      movementsToday: movementsToday.count,
    };
  }),
});
