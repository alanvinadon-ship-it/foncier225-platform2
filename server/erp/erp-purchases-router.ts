import { z } from "zod";
import { eq, and, desc, sql, isNull, gte, lte, like } from "drizzle-orm";
import { router, erpPermissionProcedure } from "../_core/trpc";
import { getDb, createAuditEvent } from "../db";
import {
  erpPurchaseRequests,
  erpPurchaseRequestLines,
  erpRfqs,
  erpRfqVendors,
  erpPurchaseOrders,
  erpPurchaseOrderLines,
  erpGoodsReceipts,
  erpGoodsReceiptLines,
  erpPurchaseCategories,
  erpVendors,
  erpProjects,
  users,
} from "../../drizzle/schema";

// ============================================================
// ERP PURCHASES ROUTER — Sprint 21
// Demandes d'achat, RFQ, Bons de commande, Réceptions
// ============================================================

function generateNumber(prefix: string): string {
  const d = new Date();
  const y = d.getFullYear().toString().slice(-2);
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const rand = Math.floor(Math.random() * 9000 + 1000);
  return `${prefix}-${y}${m}-${rand}`;
}

// --- CATÉGORIES D'ACHAT ---
const categoriesRouter = router({
  list: erpPermissionProcedure("erp_purchases", "view")
    .input(z.object({ isActive: z.boolean().optional() }).optional())
    .query(async ({ input }) => {
      const db = (await getDb())!;
      const conditions: any[] = [];
      if (input?.isActive !== undefined) conditions.push(eq(erpPurchaseCategories.isActive, input.isActive));
      const where = conditions.length > 0 ? and(...conditions) : undefined;
      return db.select().from(erpPurchaseCategories).where(where).orderBy(erpPurchaseCategories.name);
    }),

  create: erpPermissionProcedure("erp_purchases", "create")
    .input(z.object({
      code: z.string().min(1).max(16),
      name: z.string().min(1).max(128),
      description: z.string().optional(),
      purchaseType: z.enum(["material", "equipment", "service", "subcontracting", "general"]),
      isStockable: z.boolean().default(false),
      isEquipment: z.boolean().default(false),
      isService: z.boolean().default(false),
      defaultAccountingAccountId: z.number().nullable().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = (await getDb())!;
      const now = Date.now();
      const [result] = await db.insert(erpPurchaseCategories).values({
        code: input.code,
        name: input.name,
        description: input.description ?? null,
        purchaseType: input.purchaseType,
        isStockable: input.isStockable,
        isEquipment: input.isEquipment,
        isService: input.isService,
        defaultAccountingAccountId: input.defaultAccountingAccountId ?? null,
        isActive: true,
        createdAt: now,
        updatedAt: now,
      });
      return { id: result.insertId };
    }),
});

// --- DEMANDES D'ACHAT ---
const requestsRouter = router({
  list: erpPermissionProcedure("erp_purchases", "view")
    .input(z.object({
      status: z.string().optional(),
      projectId: z.number().optional(),
      priority: z.string().optional(),
      search: z.string().optional(),
      limit: z.number().min(1).max(100).default(50),
      offset: z.number().min(0).default(0),
    }).optional())
    .query(async ({ input }) => {
      const db = (await getDb())!;
      const params = input || { limit: 50, offset: 0 };
      const conditions: any[] = [isNull(erpPurchaseRequests.deletedAt)];
      if (params.status) conditions.push(eq(erpPurchaseRequests.status, params.status));
      if (params.projectId) conditions.push(eq(erpPurchaseRequests.projectId, params.projectId));
      if (params.priority) conditions.push(eq(erpPurchaseRequests.priority, params.priority));
      if (params.search) conditions.push(like(erpPurchaseRequests.requestNumber, `%${params.search}%`));
      const where = and(...conditions);
      const [items, countResult] = await Promise.all([
        db.select().from(erpPurchaseRequests).where(where).orderBy(desc(erpPurchaseRequests.createdAt)).limit(params.limit).offset(params.offset),
        db.select({ count: sql<number>`COUNT(*)` }).from(erpPurchaseRequests).where(where),
      ]);
      return { requests: items, total: countResult[0].count };
    }),

  getById: erpPermissionProcedure("erp_purchases", "view")
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = (await getDb())!;
      const [request] = await db.select().from(erpPurchaseRequests).where(eq(erpPurchaseRequests.id, input.id));
      if (!request) return null;
      const lines = await db.select().from(erpPurchaseRequestLines).where(eq(erpPurchaseRequestLines.purchaseRequestId, input.id));
      return { ...request, lines };
    }),

  create: erpPermissionProcedure("erp_purchases", "create")
    .input(z.object({
      projectId: z.number().nullable().optional(),
      department: z.string().max(64).optional(),
      purchaseCategoryId: z.number().nullable().optional(),
      neededDate: z.number().optional(),
      priority: z.enum(["low", "normal", "high", "urgent"]).default("normal"),
      justification: z.string().optional(),
      estimatedAmount: z.number().default(0),
      lines: z.array(z.object({
        itemType: z.string().min(1).max(32),
        inventoryItemId: z.number().nullable().optional(),
        description: z.string().min(1).max(500),
        quantity: z.number().min(1).default(1),
        unit: z.string().max(32).optional(),
        estimatedUnitPrice: z.number().default(0),
        budgetLineId: z.number().nullable().optional(),
      })).min(1),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = (await getDb())!;
      const now = Date.now();
      const requestNumber = generateNumber("DA");
      const [result] = await db.insert(erpPurchaseRequests).values({
        requestNumber,
        projectId: input.projectId ?? null,
        requestedBy: ctx.user.id,
        department: input.department ?? null,
        purchaseCategoryId: input.purchaseCategoryId ?? null,
        requestDate: now,
        neededDate: input.neededDate ?? null,
        priority: input.priority,
        status: "draft",
        justification: input.justification ?? null,
        estimatedAmount: input.estimatedAmount,
        currency: "XOF",
        createdAt: now,
        updatedAt: now,
      });
      const prId = result.insertId;
      for (const line of input.lines) {
        await db.insert(erpPurchaseRequestLines).values({
          purchaseRequestId: prId,
          itemType: line.itemType,
          inventoryItemId: line.inventoryItemId ?? null,
          description: line.description,
          quantity: line.quantity,
          unit: line.unit ?? null,
          estimatedUnitPrice: line.estimatedUnitPrice,
          estimatedTotal: line.quantity * line.estimatedUnitPrice,
          createdAt: now,
          updatedAt: now,
        });
      }
      await createAuditEvent({ actorId: ctx.user.id, action: "erp.purchases.request.created", targetType: "purchase_request", targetId: prId, details: { requestNumber, priority: input.priority } });
      return { id: prId, requestNumber };
    }),

  submit: erpPermissionProcedure("erp_purchases", "create")
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = (await getDb())!;
      await db.update(erpPurchaseRequests).set({ status: "submitted", updatedAt: Date.now() }).where(eq(erpPurchaseRequests.id, input.id));
      await createAuditEvent({ actorId: ctx.user.id, action: "erp.purchases.request.submitted", targetType: "purchase_request", targetId: input.id, details: {} });
      return { success: true };
    }),

  approve: erpPermissionProcedure("erp_purchases", "approve")
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = (await getDb())!;
      const now = Date.now();
      await db.update(erpPurchaseRequests).set({ status: "approved", approvedBy: ctx.user.id, approvedAt: now, updatedAt: now }).where(eq(erpPurchaseRequests.id, input.id));
      await createAuditEvent({ actorId: ctx.user.id, action: "erp.purchases.request.approved", targetType: "purchase_request", targetId: input.id, details: {} });
      return { success: true };
    }),

  reject: erpPermissionProcedure("erp_purchases", "approve")
    .input(z.object({ id: z.number(), reason: z.string().min(1) }))
    .mutation(async ({ input, ctx }) => {
      const db = (await getDb())!;
      const now = Date.now();
      await db.update(erpPurchaseRequests).set({ status: "rejected", rejectedBy: ctx.user.id, rejectedAt: now, rejectionReason: input.reason, updatedAt: now }).where(eq(erpPurchaseRequests.id, input.id));
      await createAuditEvent({ actorId: ctx.user.id, action: "erp.purchases.request.rejected", targetType: "purchase_request", targetId: input.id, details: { reason: input.reason } });
      return { success: true };
    }),
});

// --- BONS DE COMMANDE ---
const ordersRouter = router({
  list: erpPermissionProcedure("erp_purchases", "view")
    .input(z.object({
      status: z.string().optional(),
      vendorId: z.number().optional(),
      projectId: z.number().optional(),
      limit: z.number().min(1).max(100).default(50),
      offset: z.number().min(0).default(0),
    }).optional())
    .query(async ({ input }) => {
      const db = (await getDb())!;
      const params = input || { limit: 50, offset: 0 };
      const conditions: any[] = [isNull(erpPurchaseOrders.deletedAt)];
      if (params.status) conditions.push(eq(erpPurchaseOrders.status, params.status));
      if (params.vendorId) conditions.push(eq(erpPurchaseOrders.vendorId, params.vendorId));
      if (params.projectId) conditions.push(eq(erpPurchaseOrders.projectId, params.projectId));
      const where = and(...conditions);
      const [items, countResult] = await Promise.all([
        db.select().from(erpPurchaseOrders).where(where).orderBy(desc(erpPurchaseOrders.createdAt)).limit(params.limit).offset(params.offset),
        db.select({ count: sql<number>`COUNT(*)` }).from(erpPurchaseOrders).where(where),
      ]);
      return { orders: items, total: countResult[0].count };
    }),

  getById: erpPermissionProcedure("erp_purchases", "view")
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = (await getDb())!;
      const [order] = await db.select().from(erpPurchaseOrders).where(eq(erpPurchaseOrders.id, input.id));
      if (!order) return null;
      const lines = await db.select().from(erpPurchaseOrderLines).where(eq(erpPurchaseOrderLines.purchaseOrderId, input.id));
      return { ...order, lines };
    }),

  create: erpPermissionProcedure("erp_purchases", "create")
    .input(z.object({
      purchaseRequestId: z.number().nullable().optional(),
      rfqId: z.number().nullable().optional(),
      vendorId: z.number(),
      projectId: z.number().nullable().optional(),
      expectedDeliveryDate: z.number().optional(),
      lines: z.array(z.object({
        itemType: z.string().min(1).max(32),
        inventoryItemId: z.number().nullable().optional(),
        description: z.string().min(1).max(500),
        quantityOrdered: z.number().min(1),
        unit: z.string().max(32).optional(),
        unitPrice: z.number().min(0),
        discountRate: z.number().min(0).max(10000).default(0),
        taxCodeId: z.number().nullable().optional(),
        taxRate: z.number().min(0).max(10000).default(0),
        budgetLineId: z.number().nullable().optional(),
        accountingAccountId: z.number().nullable().optional(),
      })).min(1),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = (await getDb())!;
      const now = Date.now();
      const poNumber = generateNumber("BC");

      // Calcul des totaux
      let subtotal = 0;
      let totalTax = 0;
      let totalDiscount = 0;
      const computedLines = input.lines.map(l => {
        const gross = l.quantityOrdered * l.unitPrice;
        const disc = Math.round(gross * l.discountRate / 10000);
        const net = gross - disc;
        const tax = Math.round(net * l.taxRate / 10000);
        subtotal += net;
        totalTax += tax;
        totalDiscount += disc;
        return { ...l, lineTotal: net + tax, taxAmount: tax };
      });

      const [result] = await db.insert(erpPurchaseOrders).values({
        poNumber,
        purchaseRequestId: input.purchaseRequestId ?? null,
        rfqId: input.rfqId ?? null,
        vendorId: input.vendorId,
        projectId: input.projectId ?? null,
        orderDate: now,
        expectedDeliveryDate: input.expectedDeliveryDate ?? null,
        subtotalAmount: subtotal,
        discountAmount: totalDiscount,
        taxAmount: totalTax,
        totalAmount: subtotal + totalTax,
        currency: "XOF",
        status: "draft",
        createdBy: ctx.user.id,
        createdAt: now,
        updatedAt: now,
      });
      const poId = result.insertId;

      for (const line of computedLines) {
        await db.insert(erpPurchaseOrderLines).values({
          purchaseOrderId: poId,
          itemType: line.itemType,
          inventoryItemId: line.inventoryItemId ?? null,
          description: line.description,
          quantityOrdered: line.quantityOrdered,
          quantityReceived: 0,
          unit: line.unit ?? null,
          unitPrice: line.unitPrice,
          discountRate: line.discountRate,
          taxCodeId: line.taxCodeId ?? null,
          taxRate: line.taxRate,
          taxAmount: line.taxAmount,
          lineTotal: line.lineTotal,
          budgetLineId: line.budgetLineId ?? null,
          accountingAccountId: line.accountingAccountId ?? null,
          createdAt: now,
          updatedAt: now,
        });
      }

      await createAuditEvent({ actorId: ctx.user.id, action: "erp.purchases.order.created", targetType: "purchase_order", targetId: poId, details: { poNumber, vendorId: input.vendorId, totalAmount: subtotal + totalTax } });
      return { id: poId, poNumber };
    }),

  approve: erpPermissionProcedure("erp_purchases", "approve")
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = (await getDb())!;
      const now = Date.now();
      await db.update(erpPurchaseOrders).set({ status: "approved", approvedBy: ctx.user.id, approvedAt: now, updatedAt: now }).where(eq(erpPurchaseOrders.id, input.id));
      await createAuditEvent({ actorId: ctx.user.id, action: "erp.purchases.order.approved", targetType: "purchase_order", targetId: input.id, details: {} });
      return { success: true };
    }),

  send: erpPermissionProcedure("erp_purchases", "update")
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = (await getDb())!;
      const now = Date.now();
      await db.update(erpPurchaseOrders).set({ status: "sent", sentToVendorAt: now, updatedAt: now }).where(eq(erpPurchaseOrders.id, input.id));
      await createAuditEvent({ actorId: ctx.user.id, action: "erp.purchases.order.sent", targetType: "purchase_order", targetId: input.id, details: {} });
      return { success: true };
    }),
});

// --- RÉCEPTIONS ---
const receiptsRouter = router({
  list: erpPermissionProcedure("erp_purchases", "view")
    .input(z.object({
      purchaseOrderId: z.number().optional(),
      limit: z.number().min(1).max(100).default(50),
      offset: z.number().min(0).default(0),
    }).optional())
    .query(async ({ input }) => {
      const db = (await getDb())!;
      const params = input || { limit: 50, offset: 0 };
      const conditions: any[] = [];
      if (params.purchaseOrderId) conditions.push(eq(erpGoodsReceipts.purchaseOrderId, params.purchaseOrderId));
      const where = conditions.length > 0 ? and(...conditions) : undefined;
      const [items, countResult] = await Promise.all([
        db.select().from(erpGoodsReceipts).where(where).orderBy(desc(erpGoodsReceipts.receiptDate)).limit(params.limit).offset(params.offset),
        db.select({ count: sql<number>`COUNT(*)` }).from(erpGoodsReceipts).where(where),
      ]);
      return { receipts: items, total: countResult[0].count };
    }),

  create: erpPermissionProcedure("erp_purchases", "create")
    .input(z.object({
      purchaseOrderId: z.number(),
      deliveryNoteRef: z.string().max(64).optional(),
      notes: z.string().optional(),
      lines: z.array(z.object({
        poLineId: z.number(),
        quantityReceived: z.number().min(1),
        quantityRejected: z.number().min(0).default(0),
        rejectionReason: z.string().optional(),
      })).min(1),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = (await getDb())!;
      const now = Date.now();
      const grNumber = generateNumber("BR");
      // Récupérer le vendorId du PO
      const [po] = await db.select({ vendorId: erpPurchaseOrders.vendorId, projectId: erpPurchaseOrders.projectId }).from(erpPurchaseOrders).where(eq(erpPurchaseOrders.id, input.purchaseOrderId));
      if (!po) throw new Error("Bon de commande non trouvé");
      const [result] = await db.insert(erpGoodsReceipts).values({
        receiptNumber: grNumber,
        purchaseOrderId: input.purchaseOrderId,
        vendorId: po.vendorId,
        projectId: po.projectId,
        receiptDate: now,
        receivedBy: ctx.user.id,
        deliveryNoteNumber: input.deliveryNoteRef ?? null,
        status: "received",
        notes: input.notes ?? null,
        createdAt: now,
        updatedAt: now,
      });
      const grId = result.insertId;

      for (const line of input.lines) {
        await db.insert(erpGoodsReceiptLines).values({
          goodsReceiptId: grId,
          purchaseOrderLineId: line.poLineId,
          quantityReceived: line.quantityReceived,
          quantityRejected: line.quantityRejected,
          conditionStatus: line.quantityRejected > 0 ? "partial" : "good",
          createdAt: now,
          updatedAt: now,
        });
        // Mettre à jour la quantité reçue sur la ligne PO
        await db.execute(sql`UPDATE erp_purchase_order_lines SET quantity_received = quantity_received + ${line.quantityReceived}, updated_at = ${now} WHERE id = ${line.poLineId}`);
      }

      await createAuditEvent({ actorId: ctx.user.id, action: "erp.purchases.receipt.created", targetType: "goods_receipt", targetId: grId, details: { grNumber, purchaseOrderId: input.purchaseOrderId } });
      return { id: grId, grNumber };
    }),
});

// --- STATS ACHATS ---
const statsRouter = router({
  overview: erpPermissionProcedure("erp_purchases", "view")
    .query(async () => {
      const db = (await getDb())!;
      const [requestsCount] = await db.select({ count: sql<number>`COUNT(*)` }).from(erpPurchaseRequests).where(isNull(erpPurchaseRequests.deletedAt));
      const [pendingRequests] = await db.select({ count: sql<number>`COUNT(*)` }).from(erpPurchaseRequests).where(and(isNull(erpPurchaseRequests.deletedAt), eq(erpPurchaseRequests.status, "submitted")));
      const [ordersCount] = await db.select({ count: sql<number>`COUNT(*)` }).from(erpPurchaseOrders).where(isNull(erpPurchaseOrders.deletedAt));
      const [activeOrders] = await db.select({ count: sql<number>`COUNT(*)` }).from(erpPurchaseOrders).where(and(isNull(erpPurchaseOrders.deletedAt), sql`status IN ('approved', 'sent', 'partially_received')`));
      const [totalSpent] = await db.select({ total: sql<number>`COALESCE(SUM(total_amount), 0)` }).from(erpPurchaseOrders).where(and(isNull(erpPurchaseOrders.deletedAt), sql`status NOT IN ('draft', 'cancelled')`));
      return {
        totalRequests: requestsCount.count,
        pendingApproval: pendingRequests.count,
        totalOrders: ordersCount.count,
        activeOrders: activeOrders.count,
        totalSpent: totalSpent.total,
      };
    }),
});

// ============================================================
// EXPORT
// ============================================================
export const erpPurchasesRouter = router({
  categories: categoriesRouter,
  requests: requestsRouter,
  orders: ordersRouter,
  receipts: receiptsRouter,
  stats: statsRouter,
});
