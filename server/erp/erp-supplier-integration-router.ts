import { z } from "zod";
import { eq, and, desc, isNull, sql } from "drizzle-orm";
import { router, erpPermissionProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { createAuditEvent } from "../db";
import {
  erpSupplierItemPrices,
  erpSupplierIntegrations,
  erpVendors,
  erpInventoryItems,
} from "../../drizzle/schema";

// ============================================================
// ERP SUPPLIER INTEGRATION ROUTER — Sprint 12
// ============================================================

export const erpSupplierIntegrationRouter = router({
  /**
   * GET — Liste des prix fournisseurs avec filtres
   */
  listPrices: erpPermissionProcedure("erp_inventory", "view").input(
    z.object({
      vendorId: z.number().optional(),
      itemId: z.number().optional(),
      isPreferred: z.boolean().optional(),
      limit: z.number().min(1).max(100).default(50),
      offset: z.number().min(0).default(0),
    }).optional()
  ).query(async ({ input }) => {
    const db = (await getDb())!;
    const params = input || { limit: 50, offset: 0 };

    const conditions: any[] = [];
    if (params.vendorId) conditions.push(eq(erpSupplierItemPrices.vendorId, params.vendorId));
    if (params.itemId) conditions.push(eq(erpSupplierItemPrices.itemId, params.itemId));
    if (params.isPreferred !== undefined) conditions.push(eq(erpSupplierItemPrices.isPreferred, params.isPreferred));

    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const [items, countResult] = await Promise.all([
      db.select().from(erpSupplierItemPrices)
        .where(where)
        .orderBy(desc(erpSupplierItemPrices.createdAt))
        .limit(params.limit)
        .offset(params.offset),
      db.select({ count: sql<number>`COUNT(*)` }).from(erpSupplierItemPrices).where(where),
    ]);

    return { items, total: countResult[0].count };
  }),

  /**
   * POST — Créer un prix fournisseur
   */
  createPrice: erpPermissionProcedure("erp_inventory", "create").input(
    z.object({
      vendorId: z.number(),
      itemId: z.number(),
      unitPrice: z.number().min(0),
      currency: z.string().default("XOF"),
      leadTimeDays: z.number().min(0).default(0),
      minOrderQty: z.number().min(1).default(1),
      isPreferred: z.boolean().default(false),
      validFrom: z.number().optional(),
      validTo: z.number().optional(),
      notes: z.string().optional(),
    })
  ).mutation(async ({ input, ctx }) => {
    const db = (await getDb())!;
    const now = Date.now();

    // Si isPreferred, retirer le statut préféré des autres prix pour cet article
    if (input.isPreferred) {
      await db.update(erpSupplierItemPrices)
        .set({ isPreferred: false, updatedAt: now })
        .where(and(
          eq(erpSupplierItemPrices.itemId, input.itemId),
          eq(erpSupplierItemPrices.isPreferred, true)
        ));
    }

    const [result] = await db.insert(erpSupplierItemPrices).values({
      vendorId: input.vendorId,
      itemId: input.itemId,
      unitPrice: input.unitPrice,
      currency: input.currency,
      leadTimeDays: input.leadTimeDays,
      minOrderQty: input.minOrderQty,
      isPreferred: input.isPreferred,
      validFrom: input.validFrom || null,
      validTo: input.validTo || null,
      notes: input.notes || null,
      createdBy: ctx.user.id,
      createdAt: now,
      updatedAt: now,
    });

    await createAuditEvent({
      actorId: ctx.user.id,
      action: "erp.supplier_price.created",
      targetType: "erp_supplier_item_price",
      targetId: result.insertId,
      details: { vendorId: input.vendorId, itemId: input.itemId, unitPrice: input.unitPrice },
    });

    return { id: result.insertId };
  }),

  /**
   * PUT — Modifier un prix fournisseur
   */
  updatePrice: erpPermissionProcedure("erp_inventory", "update").input(
    z.object({
      id: z.number(),
      unitPrice: z.number().min(0).optional(),
      leadTimeDays: z.number().min(0).optional(),
      minOrderQty: z.number().min(1).optional(),
      isPreferred: z.boolean().optional(),
      validFrom: z.number().optional(),
      validTo: z.number().optional(),
      notes: z.string().optional(),
    })
  ).mutation(async ({ input, ctx }) => {
    const db = (await getDb())!;
    const now = Date.now();

    const [existing] = await db.select().from(erpSupplierItemPrices).where(eq(erpSupplierItemPrices.id, input.id)).limit(1);
    if (!existing) throw new Error("Prix fournisseur introuvable");

    // Si on définit comme préféré, retirer les autres
    if (input.isPreferred) {
      await db.update(erpSupplierItemPrices)
        .set({ isPreferred: false, updatedAt: now })
        .where(and(
          eq(erpSupplierItemPrices.itemId, existing.itemId),
          eq(erpSupplierItemPrices.isPreferred, true)
        ));
    }

    const updates: Record<string, unknown> = { updatedAt: now };
    if (input.unitPrice !== undefined) updates.unitPrice = input.unitPrice;
    if (input.leadTimeDays !== undefined) updates.leadTimeDays = input.leadTimeDays;
    if (input.minOrderQty !== undefined) updates.minOrderQty = input.minOrderQty;
    if (input.isPreferred !== undefined) updates.isPreferred = input.isPreferred;
    if (input.validFrom !== undefined) updates.validFrom = input.validFrom;
    if (input.validTo !== undefined) updates.validTo = input.validTo;
    if (input.notes !== undefined) updates.notes = input.notes;

    await db.update(erpSupplierItemPrices).set(updates).where(eq(erpSupplierItemPrices.id, input.id));

    await createAuditEvent({
      actorId: ctx.user.id,
      action: "erp.supplier_price.updated",
      targetType: "erp_supplier_item_price",
      targetId: input.id,
      details: updates,
    });

    return { success: true };
  }),

  /**
   * DELETE — Supprimer un prix fournisseur
   */
  deletePrice: erpPermissionProcedure("erp_inventory", "delete").input(
    z.object({ id: z.number() })
  ).mutation(async ({ input, ctx }) => {
    const db = (await getDb())!;

    const [existing] = await db.select().from(erpSupplierItemPrices).where(eq(erpSupplierItemPrices.id, input.id)).limit(1);
    if (!existing) throw new Error("Prix fournisseur introuvable");

    await db.delete(erpSupplierItemPrices).where(eq(erpSupplierItemPrices.id, input.id));

    await createAuditEvent({
      actorId: ctx.user.id,
      action: "erp.supplier_price.deleted",
      targetType: "erp_supplier_item_price",
      targetId: input.id,
      details: { vendorId: existing.vendorId, itemId: existing.itemId },
    });

    return { success: true };
  }),

  /**
   * GET — Fournisseurs d'un article (avec prix)
   */
  itemSuppliers: erpPermissionProcedure("erp_inventory", "view").input(
    z.object({ itemId: z.number() })
  ).query(async ({ input }) => {
    const db = (await getDb())!;

    const prices = await db.select().from(erpSupplierItemPrices)
      .where(eq(erpSupplierItemPrices.itemId, input.itemId))
      .orderBy(erpSupplierItemPrices.unitPrice);

    // Enrichir avec les noms des fournisseurs
    const vendorIds = Array.from(new Set(prices.map(p => p.vendorId)));
    const vendors = vendorIds.length > 0
      ? await db.select({ id: erpVendors.id, name: erpVendors.name }).from(erpVendors)
          .where(sql`${erpVendors.id} IN (${sql.raw(vendorIds.join(","))})`)
      : [];

    const vendorMap = new Map(vendors.map(v => [v.id, v.name]));

    return prices.map(p => ({
      ...p,
      vendorName: vendorMap.get(p.vendorId) || "Inconnu",
    }));
  }),

  /**
   * GET — Articles d'un fournisseur (catalogue)
   */
  vendorItems: erpPermissionProcedure("erp_inventory", "view").input(
    z.object({ vendorId: z.number() })
  ).query(async ({ input }) => {
    const db = (await getDb())!;

    const prices = await db.select().from(erpSupplierItemPrices)
      .where(eq(erpSupplierItemPrices.vendorId, input.vendorId))
      .orderBy(erpSupplierItemPrices.createdAt);

    // Enrichir avec les noms des articles
    const itemIds = Array.from(new Set(prices.map(p => p.itemId)));
    const items = itemIds.length > 0
      ? await db.select({ id: erpInventoryItems.id, name: erpInventoryItems.name, sku: erpInventoryItems.sku })
          .from(erpInventoryItems)
          .where(sql`${erpInventoryItems.id} IN (${sql.raw(itemIds.join(","))})`)
      : [];

    const itemMap = new Map(items.map(i => [i.id, { name: i.name, sku: i.sku }]));

    return prices.map(p => ({
      ...p,
      itemName: itemMap.get(p.itemId)?.name || "Inconnu",
      itemSku: itemMap.get(p.itemId)?.sku || "",
    }));
  }),

  /**
   * GET — Comparaison des fournisseurs pour un article
   */
  compareSuppliers: erpPermissionProcedure("erp_inventory", "view").input(
    z.object({ itemId: z.number() })
  ).query(async ({ input }) => {
    const db = (await getDb())!;

    const prices = await db.select().from(erpSupplierItemPrices)
      .where(eq(erpSupplierItemPrices.itemId, input.itemId))
      .orderBy(erpSupplierItemPrices.unitPrice);

    const vendorIds = Array.from(new Set(prices.map(p => p.vendorId)));
    const vendors = vendorIds.length > 0
      ? await db.select({ id: erpVendors.id, name: erpVendors.name, rating: erpVendors.rating })
          .from(erpVendors)
          .where(sql`${erpVendors.id} IN (${sql.raw(vendorIds.join(","))})`)
      : [];

    const vendorMap = new Map(vendors.map(v => [v.id, v]));

    const cheapest = prices[0]?.unitPrice || 0;

    return prices.map(p => ({
      ...p,
      vendorName: vendorMap.get(p.vendorId)?.name || "Inconnu",
      vendorRating: vendorMap.get(p.vendorId)?.rating || 0,
      priceDiffPercent: cheapest > 0 ? Math.round(((p.unitPrice - cheapest) / cheapest) * 10000) / 100 : 0,
    }));
  }),

  /**
   * POST — Définir un fournisseur comme préféré pour un article
   */
  setPreferred: erpPermissionProcedure("erp_inventory", "update").input(
    z.object({ id: z.number() })
  ).mutation(async ({ input, ctx }) => {
    const db = (await getDb())!;
    const now = Date.now();

    const [existing] = await db.select().from(erpSupplierItemPrices).where(eq(erpSupplierItemPrices.id, input.id)).limit(1);
    if (!existing) throw new Error("Prix fournisseur introuvable");

    // Retirer le statut préféré des autres
    await db.update(erpSupplierItemPrices)
      .set({ isPreferred: false, updatedAt: now })
      .where(and(
        eq(erpSupplierItemPrices.itemId, existing.itemId),
        eq(erpSupplierItemPrices.isPreferred, true)
      ));

    // Définir celui-ci comme préféré
    await db.update(erpSupplierItemPrices)
      .set({ isPreferred: true, updatedAt: now })
      .where(eq(erpSupplierItemPrices.id, input.id));

    await createAuditEvent({
      actorId: ctx.user.id,
      action: "erp.supplier_price.set_preferred",
      targetType: "erp_supplier_item_price",
      targetId: input.id,
      details: { vendorId: existing.vendorId, itemId: existing.itemId },
    });

    return { success: true };
  }),

  /**
   * GET — Liste des intégrations fournisseurs
   */
  listIntegrations: erpPermissionProcedure("erp_inventory", "view").input(
    z.object({
      vendorId: z.number().optional(),
      isActive: z.boolean().optional(),
      limit: z.number().min(1).max(100).default(50),
      offset: z.number().min(0).default(0),
    }).optional()
  ).query(async ({ input }) => {
    const db = (await getDb())!;
    const params = input || { limit: 50, offset: 0 };

    const conditions: any[] = [];
    if (params.vendorId) conditions.push(eq(erpSupplierIntegrations.vendorId, params.vendorId));
    if (params.isActive !== undefined) conditions.push(eq(erpSupplierIntegrations.isActive, params.isActive));

    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const items = await db.select().from(erpSupplierIntegrations)
      .where(where)
      .orderBy(desc(erpSupplierIntegrations.createdAt))
      .limit(params.limit)
      .offset(params.offset);

    return { items };
  }),

  /**
   * POST — Créer une intégration fournisseur
   */
  createIntegration: erpPermissionProcedure("erp_inventory", "create").input(
    z.object({
      vendorId: z.number(),
      integrationType: z.enum(["api", "edi", "email", "manual"]),
      apiUrl: z.string().optional(),
      apiKey: z.string().optional(),
      syncFrequency: z.enum(["manual", "daily", "weekly", "monthly"]).default("manual"),
      isActive: z.boolean().default(true),
    })
  ).mutation(async ({ input, ctx }) => {
    const db = (await getDb())!;
    const now = Date.now();

    const [result] = await db.insert(erpSupplierIntegrations).values({
      vendorId: input.vendorId,
      integrationType: input.integrationType,
      apiUrl: input.apiUrl || null,
      apiKey: input.apiKey || null,
      syncFrequency: input.syncFrequency,
      syncStatus: "never",
      isActive: input.isActive,
      createdBy: ctx.user.id,
      createdAt: now,
      updatedAt: now,
    });

    await createAuditEvent({
      actorId: ctx.user.id,
      action: "erp.supplier_integration.created",
      targetType: "erp_supplier_integration",
      targetId: result.insertId,
      details: { vendorId: input.vendorId, type: input.integrationType },
    });

    return { id: result.insertId };
  }),

  /**
   * POST — Simuler une synchronisation
   */
  sync: erpPermissionProcedure("erp_inventory", "update").input(
    z.object({ id: z.number() })
  ).mutation(async ({ input, ctx }) => {
    const db = (await getDb())!;
    const now = Date.now();

    const [integration] = await db.select().from(erpSupplierIntegrations)
      .where(eq(erpSupplierIntegrations.id, input.id)).limit(1);
    if (!integration) throw new Error("Intégration introuvable");
    if (!integration.isActive) throw new Error("Intégration inactive");

    // Simulation de synchronisation
    await db.update(erpSupplierIntegrations).set({
      syncStatus: "success",
      lastSyncAt: now,
      updatedAt: now,
    }).where(eq(erpSupplierIntegrations.id, input.id));

    await createAuditEvent({
      actorId: ctx.user.id,
      action: "erp.supplier_integration.synced",
      targetType: "erp_supplier_integration",
      targetId: input.id,
      details: { vendorId: integration.vendorId, status: "success", syncedAt: now },
    });

    return { success: true, syncedAt: now, status: "success" };
  }),
});
