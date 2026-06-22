import { z } from "zod";
import { router } from "../_core/trpc";
import { erpPermissionProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { createAuditEvent } from "../db";
import {
  erpSalesClients,
  erpSalesOrders,
  erpSalesOrderLines,
  erpSalesOrderHistory,
} from "../../drizzle/schema";
import { eq, desc, sql, and, gte, lte, inArray } from "drizzle-orm";

// ============ CLIENTS ============

const clientsRouter = router({
  list: erpPermissionProcedure("erp_sales_orders", "view")
    .input(z.object({ activeOnly: z.boolean().optional() }).optional())
    .query(async ({ input }) => {
      const db = (await getDb())!;
      const conditions = input?.activeOnly ? [eq(erpSalesClients.isActive, 1)] : [];
      const clients = await db
        .select()
        .from(erpSalesClients)
        .where(conditions.length ? conditions[0] : undefined)
        .orderBy(erpSalesClients.name);
      return clients;
    }),

  getById: erpPermissionProcedure("erp_sales_orders", "view")
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = (await getDb())!;
      const [client] = await db
        .select()
        .from(erpSalesClients)
        .where(eq(erpSalesClients.id, input.id));
      return client || null;
    }),

  create: erpPermissionProcedure("erp_sales_orders", "create")
    .input(z.object({
      code: z.string().min(2).max(32),
      name: z.string().min(2).max(255),
      shortName: z.string().max(64).optional(),
      sector: z.string().max(100).optional(),
      contactName: z.string().max(255).optional(),
      contactEmail: z.string().email().optional().or(z.literal("")),
      contactPhone: z.string().max(32).optional(),
      address: z.string().optional(),
      taxId: z.string().max(64).optional(),
      paymentTermsDays: z.number().min(0).max(365).optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = (await getDb())!;
      const now = Date.now();
      const [result] = await db.insert(erpSalesClients).values({
        ...input,
        contactEmail: input.contactEmail || null,
        isActive: 1,
        createdBy: ctx.user.id,
        createdAt: now,
        updatedAt: now,
      });
      await createAuditEvent({
        actorId: ctx.user.id,
        action: "sales_client_created",
        targetType: "erp_sales_client",
        targetId: result.insertId,
        details: { code: input.code, name: input.name },
      });
      return { id: result.insertId };
    }),

  update: erpPermissionProcedure("erp_sales_orders", "update")
    .input(z.object({
      id: z.number(),
      name: z.string().min(2).max(255).optional(),
      shortName: z.string().max(64).optional(),
      sector: z.string().max(100).optional(),
      contactName: z.string().max(255).optional(),
      contactEmail: z.string().email().optional().or(z.literal("")),
      contactPhone: z.string().max(32).optional(),
      address: z.string().optional(),
      taxId: z.string().max(64).optional(),
      paymentTermsDays: z.number().min(0).max(365).optional(),
      notes: z.string().optional(),
      isActive: z.number().min(0).max(1).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = (await getDb())!;
      const { id, ...updates } = input;
      await db.update(erpSalesClients)
        .set({ ...updates, contactEmail: updates.contactEmail || null, updatedAt: Date.now() })
        .where(eq(erpSalesClients.id, id));
      await createAuditEvent({
        actorId: ctx.user.id,
        action: "sales_client_updated",
        targetType: "erp_sales_client",
        targetId: id,
        details: updates,
      });
      return { success: true };
    }),
});

// ============ ORDERS ============

const VALID_TRANSITIONS: Record<string, string[]> = {
  received: ["in_progress", "cancelled"],
  in_progress: ["delivered", "cancelled"],
  delivered: ["invoiced", "in_progress"],
  invoiced: ["paid"],
  paid: [],
  cancelled: [],
};

const ordersRouter = router({
  list: erpPermissionProcedure("erp_sales_orders", "view")
    .input(z.object({
      clientId: z.number().optional(),
      status: z.string().optional(),
      fromDate: z.number().optional(),
      toDate: z.number().optional(),
      limit: z.number().min(1).max(200).optional(),
      offset: z.number().min(0).optional(),
    }).optional())
    .query(async ({ input }) => {
      const db = (await getDb())!;
      const conditions: any[] = [];
      if (input?.clientId) conditions.push(eq(erpSalesOrders.clientId, input.clientId));
      if (input?.status) conditions.push(eq(erpSalesOrders.status, input.status));
      if (input?.fromDate) conditions.push(gte(erpSalesOrders.orderDate, input.fromDate));
      if (input?.toDate) conditions.push(lte(erpSalesOrders.orderDate, input.toDate));

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
      const limit = input?.limit || 50;
      const offset = input?.offset || 0;

      const [orders, [{ total }]] = await Promise.all([
        db.select({
          id: erpSalesOrders.id,
          orderNumber: erpSalesOrders.orderNumber,
          clientId: erpSalesOrders.clientId,
          clientRef: erpSalesOrders.clientRef,
          subject: erpSalesOrders.subject,
          status: erpSalesOrders.status,
          priority: erpSalesOrders.priority,
          totalHT: erpSalesOrders.totalHT,
          totalTTC: erpSalesOrders.totalTTC,
          orderDate: erpSalesOrders.orderDate,
          expectedDeliveryDate: erpSalesOrders.expectedDeliveryDate,
          paymentStatus: erpSalesOrders.paymentStatus,
          paidAmount: erpSalesOrders.paidAmount,
          createdAt: erpSalesOrders.createdAt,
          clientName: erpSalesClients.name,
          clientCode: erpSalesClients.code,
        })
          .from(erpSalesOrders)
          .leftJoin(erpSalesClients, eq(erpSalesOrders.clientId, erpSalesClients.id))
          .where(whereClause)
          .orderBy(desc(erpSalesOrders.orderDate))
          .limit(limit)
          .offset(offset),
        db.select({ total: sql<number>`count(*)` })
          .from(erpSalesOrders)
          .where(whereClause),
      ]);

      return { orders, total, limit, offset };
    }),

  getById: erpPermissionProcedure("erp_sales_orders", "view")
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = (await getDb())!;
      const [order] = await db
        .select()
        .from(erpSalesOrders)
        .where(eq(erpSalesOrders.id, input.id));
      if (!order) return null;

      const [client] = await db
        .select()
        .from(erpSalesClients)
        .where(eq(erpSalesClients.id, order.clientId));

      const lines = await db
        .select()
        .from(erpSalesOrderLines)
        .where(eq(erpSalesOrderLines.orderId, input.id))
        .orderBy(erpSalesOrderLines.lineNumber);

      const history = await db
        .select()
        .from(erpSalesOrderHistory)
        .where(eq(erpSalesOrderHistory.orderId, input.id))
        .orderBy(desc(erpSalesOrderHistory.changedAt));

      return { ...order, client, lines, history };
    }),

  create: erpPermissionProcedure("erp_sales_orders", "create")
    .input(z.object({
      clientId: z.number(),
      clientRef: z.string().max(128).optional(),
      subject: z.string().min(3).max(500),
      description: z.string().optional(),
      priority: z.enum(["low", "normal", "high", "urgent"]).optional(),
      orderDate: z.number(),
      expectedDeliveryDate: z.number().optional(),
      taxRate: z.number().min(0).max(50).optional(),
      budgetLineId: z.number().optional(),
      periodId: z.number().optional(),
      attachmentUrl: z.string().optional(),
      notes: z.string().optional(),
      lines: z.array(z.object({
        description: z.string().min(1).max(500),
        quantity: z.number().min(1),
        unit: z.string().max(32).optional(),
        unitPriceHT: z.number().min(0),
      })).min(1),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = (await getDb())!;
      const now = Date.now();
      const taxRate = input.taxRate ?? 18;

      // Calculate totals from lines
      const totalHT = input.lines.reduce((sum, l) => sum + l.quantity * l.unitPriceHT, 0);
      const totalTTC = Math.round(totalHT * (1 + taxRate / 100));

      // Generate order number: SO-YYYY-NNNN
      const year = new Date().getFullYear();
      const [{ count }] = await db.select({ count: sql<number>`count(*)` })
        .from(erpSalesOrders);
      const orderNumber = `SO-${year}-${String(count + 1).padStart(4, "0")}`;

      const [result] = await db.insert(erpSalesOrders).values({
        orderNumber,
        clientId: input.clientId,
        clientRef: input.clientRef || null,
        subject: input.subject,
        description: input.description || null,
        status: "received",
        priority: input.priority || "normal",
        totalHT,
        taxRate,
        totalTTC,
        currency: "XOF",
        orderDate: input.orderDate,
        expectedDeliveryDate: input.expectedDeliveryDate || null,
        budgetLineId: input.budgetLineId || null,
        periodId: input.periodId || null,
        attachmentUrl: input.attachmentUrl || null,
        notes: input.notes || null,
        createdBy: ctx.user.id,
        assignedTo: null,
        createdAt: now,
        updatedAt: now,
      });

      // Insert lines
      for (let i = 0; i < input.lines.length; i++) {
        const line = input.lines[i];
        await db.insert(erpSalesOrderLines).values({
          orderId: result.insertId,
          lineNumber: i + 1,
          description: line.description,
          quantity: line.quantity,
          unit: line.unit || "unité",
          unitPriceHT: line.unitPriceHT,
          totalHT: line.quantity * line.unitPriceHT,
          deliveryStatus: "pending",
          deliveredQuantity: 0,
          createdAt: now,
        });
      }

      // History entry
      await db.insert(erpSalesOrderHistory).values({
        orderId: result.insertId,
        fromStatus: "",
        toStatus: "received",
        comment: "Bon de commande enregistré",
        changedBy: ctx.user.id,
        changedAt: now,
      });

      await createAuditEvent({
        actorId: ctx.user.id,
        action: "sales_order_created",
        targetType: "erp_sales_order",
        targetId: result.insertId,
        details: { orderNumber, clientId: input.clientId, totalTTC },
      });

      return { id: result.insertId, orderNumber };
    }),

  updateStatus: erpPermissionProcedure("erp_sales_orders", "update")
    .input(z.object({
      id: z.number(),
      newStatus: z.enum(["in_progress", "delivered", "invoiced", "paid", "cancelled"]),
      comment: z.string().optional(),
      invoiceId: z.number().optional(),
      paidAmount: z.number().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = (await getDb())!;
      const [order] = await db.select().from(erpSalesOrders).where(eq(erpSalesOrders.id, input.id));
      if (!order) throw new Error("Commande introuvable");

      const allowed = VALID_TRANSITIONS[order.status] || [];
      if (!allowed.includes(input.newStatus)) {
        throw new Error(`Transition ${order.status} → ${input.newStatus} non autorisée`);
      }

      const now = Date.now();
      const updates: any = { status: input.newStatus, updatedAt: now };

      if (input.newStatus === "delivered") updates.deliveredDate = now;
      if (input.newStatus === "invoiced" && input.invoiceId) updates.invoiceId = input.invoiceId;
      if (input.newStatus === "paid") {
        updates.paymentStatus = "paid";
        updates.paidAmount = input.paidAmount || order.totalTTC;
        updates.paidDate = now;
      }

      await db.update(erpSalesOrders).set(updates).where(eq(erpSalesOrders.id, input.id));

      await db.insert(erpSalesOrderHistory).values({
        orderId: input.id,
        fromStatus: order.status,
        toStatus: input.newStatus,
        comment: input.comment || null,
        changedBy: ctx.user.id,
        changedAt: now,
      });

      await createAuditEvent({
        actorId: ctx.user.id,
        action: "sales_order_status_changed",
        targetType: "erp_sales_order",
        targetId: input.id,
        details: { from: order.status, to: input.newStatus, orderNumber: order.orderNumber },
      });

      return { success: true };
    }),

  update: erpPermissionProcedure("erp_sales_orders", "update")
    .input(z.object({
      id: z.number(),
      clientRef: z.string().max(128).optional(),
      subject: z.string().min(3).max(500).optional(),
      description: z.string().optional(),
      priority: z.enum(["low", "normal", "high", "urgent"]).optional(),
      expectedDeliveryDate: z.number().optional(),
      assignedTo: z.number().optional(),
      budgetLineId: z.number().optional(),
      periodId: z.number().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = (await getDb())!;
      const { id, ...updates } = input;
      await db.update(erpSalesOrders)
        .set({ ...updates, updatedAt: Date.now() })
        .where(eq(erpSalesOrders.id, id));
      await createAuditEvent({
        actorId: ctx.user.id,
        action: "sales_order_updated",
        targetType: "erp_sales_order",
        targetId: id,
        details: updates,
      });
      return { success: true };
    }),

  // Dashboard par client
  dashboard: erpPermissionProcedure("erp_sales_orders", "view")
    .input(z.object({
      year: z.number().optional(),
    }).optional())
    .query(async ({ input }) => {
      const db = (await getDb())!;
      const year = input?.year || new Date().getFullYear();
      const startOfYear = new Date(year, 0, 1).getTime();
      const endOfYear = new Date(year, 11, 31, 23, 59, 59).getTime();

      // KPIs globaux
      const orders = await db.select()
        .from(erpSalesOrders)
        .where(and(
          gte(erpSalesOrders.orderDate, startOfYear),
          lte(erpSalesOrders.orderDate, endOfYear),
        ));

      const totalOrders = orders.length;
      const totalCA = orders.reduce((s, o) => s + (o.totalTTC || 0), 0);
      const paidAmount = orders.filter(o => o.paymentStatus === "paid").reduce((s, o) => s + (o.paidAmount || 0), 0);
      const pendingAmount = totalCA - paidAmount;
      const byStatus = {
        received: orders.filter(o => o.status === "received").length,
        in_progress: orders.filter(o => o.status === "in_progress").length,
        delivered: orders.filter(o => o.status === "delivered").length,
        invoiced: orders.filter(o => o.status === "invoiced").length,
        paid: orders.filter(o => o.status === "paid").length,
        cancelled: orders.filter(o => o.status === "cancelled").length,
      };

      // Par client
      const clients = await db.select().from(erpSalesClients).where(eq(erpSalesClients.isActive, 1));
      const byClient = clients.map(c => {
        const clientOrders = orders.filter(o => o.clientId === c.id);
        return {
          clientId: c.id,
          clientName: c.name,
          clientCode: c.code,
          orderCount: clientOrders.length,
          totalCA: clientOrders.reduce((s, o) => s + (o.totalTTC || 0), 0),
          paidAmount: clientOrders.filter(o => o.paymentStatus === "paid").reduce((s, o) => s + (o.paidAmount || 0), 0),
          pendingAmount: clientOrders.reduce((s, o) => s + (o.totalTTC || 0), 0) - clientOrders.filter(o => o.paymentStatus === "paid").reduce((s, o) => s + (o.paidAmount || 0), 0),
        };
      }).filter(c => c.orderCount > 0).sort((a, b) => b.totalCA - a.totalCA);

      // Impact trésorerie : commandes livrées non payées
      const deliveredUnpaid = orders.filter(o => 
        ["delivered", "invoiced"].includes(o.status) && o.paymentStatus !== "paid"
      );
      const cashImpact = deliveredUnpaid.reduce((s, o) => s + (o.totalTTC || 0) - (o.paidAmount || 0), 0);

      return {
        year,
        kpis: { totalOrders, totalCA, paidAmount, pendingAmount, cashImpact },
        byStatus,
        byClient,
      };
    }),
});

// ============ EXPORT ============

export const erpSalesOrdersRouter = router({
  clients: clientsRouter,
  orders: ordersRouter,
});
