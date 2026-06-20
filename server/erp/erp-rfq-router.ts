import { z } from "zod";
import { eq, and, isNull, desc, sql, inArray } from "drizzle-orm";
import { router, erpPermissionProcedure } from "../_core/trpc";
import { getDb } from "../db";

type Quote = typeof erpVendorQuotes.$inferSelect;
import {
  erpRfqs, erpRfqLines, erpRfqVendors, erpVendorQuotes, erpVendorQuoteLines,
  erpPurchaseOrders, erpPurchaseOrderLines, erpVendors, erpProjects, erpPurchaseRequests, users
} from "../../drizzle/schema";

const now = () => Date.now();
const getDatabase = async () => (await getDb())!;

// --- RFQ CRUD ---
const rfqCrudRouter = router({
  list: erpPermissionProcedure("erp_rfqs", "view")
    .input(z.object({ status: z.string().optional(), projectId: z.number().optional(), limit: z.number().default(50), offset: z.number().default(0) }))
    .query(async ({ input }) => {
      const conditions: any[] = [isNull(erpRfqs.deletedAt)];
      if (input.status) conditions.push(eq(erpRfqs.status, input.status));
      if (input.projectId) conditions.push(eq(erpRfqs.projectId, input.projectId));
      const items = await ((await getDatabase())).select().from(erpRfqs).where(and(...conditions)).orderBy(desc(erpRfqs.createdAt)).limit(input.limit).offset(input.offset);
      const [{ count }] = await ((await getDatabase())).select({ count: sql<number>`count(*)` }).from(erpRfqs).where(and(...conditions));
      return { items, total: count };
    }),

  getById: erpPermissionProcedure("erp_rfqs", "view")
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const [rfq] = await ((await getDatabase())).select().from(erpRfqs).where(eq(erpRfqs.id, input.id));
      if (!rfq) throw new Error("RFQ introuvable");
      const lines = await ((await getDatabase())).select().from(erpRfqLines).where(eq(erpRfqLines.rfqId, input.id));
      const vendors = await ((await getDatabase())).select().from(erpRfqVendors).where(eq(erpRfqVendors.rfqId, input.id));
      const quotes = await ((await getDatabase())).select().from(erpVendorQuotes).where(and(eq(erpVendorQuotes.rfqId, input.id), isNull(erpVendorQuotes.deletedAt)));
      const project = rfq.projectId ? (await ((await getDatabase())).select().from(erpProjects).where(eq(erpProjects.id, rfq.projectId)))[0] : null;
      return { ...rfq, lines, vendors, quotes, project };
    }),

  create: erpPermissionProcedure("erp_rfqs", "create")
    .input(z.object({
      title: z.string().min(1),
      description: z.string().optional(),
      purchaseRequestId: z.number().nullable().optional(),
      projectId: z.number().nullable().optional(),
      issueDate: z.number(),
      responseDeadline: z.number().optional(),
      selectionMethod: z.string().default("lowest_price"),
    }))
    .mutation(async ({ input, ctx }) => {
      const rfqNumber = `RFQ-${Date.now().toString(36).toUpperCase()}`;
      const [result] = await ((await getDatabase())).insert(erpRfqs).values({
        rfqNumber,
        title: input.title,
        description: input.description || null,
        purchaseRequestId: input.purchaseRequestId ?? null,
        projectId: input.projectId ?? null,
        issueDate: input.issueDate,
        responseDeadline: input.responseDeadline ?? null,
        selectionMethod: input.selectionMethod,
        status: "draft",
        createdBy: ctx.user.id,
        createdAt: now(),
        updatedAt: now(),
      });
      return { id: result.insertId, rfqNumber };
    }),

  update: erpPermissionProcedure("erp_rfqs", "update")
    .input(z.object({
      id: z.number(),
      title: z.string().optional(),
      description: z.string().optional(),
      projectId: z.number().nullable().optional(),
      responseDeadline: z.number().optional(),
      selectionMethod: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      await ((await getDatabase())).update(erpRfqs).set({ ...data, updatedAt: now() }).where(eq(erpRfqs.id, id));
      return { success: true };
    }),

  delete: erpPermissionProcedure("erp_rfqs", "delete")
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await ((await getDatabase())).update(erpRfqs).set({ deletedAt: now(), updatedAt: now() }).where(eq(erpRfqs.id, input.id));
      return { success: true };
    }),
});

// --- RFQ Lines ---
const rfqLinesRouter = router({
  add: erpPermissionProcedure("erp_rfqs", "create")
    .input(z.object({
      rfqId: z.number(),
      itemType: z.string().default("material"),
      description: z.string().min(1),
      quantity: z.number().default(100),
      unit: z.string().default("unité"),
      estimatedUnitPrice: z.number().default(0),
    }))
    .mutation(async ({ input }) => {
      const estimatedTotal = Math.round((input.quantity / 100) * input.estimatedUnitPrice);
      const [result] = await ((await getDatabase())).insert(erpRfqLines).values({
        rfqId: input.rfqId,
        itemType: input.itemType,
        description: input.description,
        quantity: input.quantity,
        unit: input.unit,
        estimatedUnitPrice: input.estimatedUnitPrice,
        estimatedTotal,
        createdAt: now(),
        updatedAt: now(),
      });
      return { id: result.insertId };
    }),

  update: erpPermissionProcedure("erp_rfqs", "update")
    .input(z.object({
      id: z.number(),
      description: z.string().optional(),
      quantity: z.number().optional(),
      unit: z.string().optional(),
      estimatedUnitPrice: z.number().optional(),
    }))
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      const updateData: any = { ...data, updatedAt: now() };
      if (data.quantity !== undefined && data.estimatedUnitPrice !== undefined) {
        updateData.estimatedTotal = Math.round((data.quantity / 100) * data.estimatedUnitPrice);
      }
      await ((await getDatabase())).update(erpRfqLines).set(updateData).where(eq(erpRfqLines.id, id));
      return { success: true };
    }),

  delete: erpPermissionProcedure("erp_rfqs", "delete")
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await ((await getDatabase())).delete(erpRfqLines).where(eq(erpRfqLines.id, input.id));
      return { success: true };
    }),
});

// --- RFQ Vendors ---
const rfqVendorsRouter = router({
  add: erpPermissionProcedure("erp_rfqs", "create")
    .input(z.object({ rfqId: z.number(), vendorId: z.number() }))
    .mutation(async ({ input }) => {
      const [result] = await ((await getDatabase())).insert(erpRfqVendors).values({
        rfqId: input.rfqId,
        vendorId: input.vendorId,
        status: "pending",
        createdAt: now(),
        updatedAt: now(),
      });
      return { id: result.insertId };
    }),

  remove: erpPermissionProcedure("erp_rfqs", "delete")
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await ((await getDatabase())).delete(erpRfqVendors).where(eq(erpRfqVendors.id, input.id));
      return { success: true };
    }),
});

// --- RFQ Actions ---
const rfqActionsRouter = router({
  send: erpPermissionProcedure("erp_rfqs", "approve")
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      // Validate: at least 1 line and 1 vendor
      const lines = await ((await getDatabase())).select().from(erpRfqLines).where(eq(erpRfqLines.rfqId, input.id));
      if (lines.length === 0) throw new Error("La RFQ doit contenir au moins une ligne");
      const vendors = await ((await getDatabase())).select().from(erpRfqVendors).where(eq(erpRfqVendors.rfqId, input.id));
      if (vendors.length === 0) throw new Error("La RFQ doit avoir au moins un fournisseur");
      await ((await getDatabase())).update(erpRfqs).set({ status: "sent", updatedAt: now() }).where(eq(erpRfqs.id, input.id));
      // Mark vendors as sent
      await ((await getDatabase())).update(erpRfqVendors).set({ status: "sent", sentAt: now(), updatedAt: now() }).where(eq(erpRfqVendors.rfqId, input.id));
      return { success: true };
    }),

  cancel: erpPermissionProcedure("erp_rfqs", "delete")
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await ((await getDatabase())).update(erpRfqs).set({ status: "cancelled", updatedAt: now() }).where(eq(erpRfqs.id, input.id));
      return { success: true };
    }),
});

// --- Vendor Quotes ---
const vendorQuotesRouter = router({
  create: erpPermissionProcedure("erp_rfqs", "create")
    .input(z.object({
      rfqId: z.number(),
      vendorId: z.number(),
      quoteNumber: z.string().optional(),
      quoteDate: z.number(),
      validUntil: z.number().optional(),
      subtotalAmount: z.number().default(0),
      taxAmount: z.number().default(0),
      totalAmount: z.number().default(0),
      deliveryDelayDays: z.number().optional(),
      paymentTerms: z.string().optional(),
      documentUrl: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const [result] = await ((await getDatabase())).insert(erpVendorQuotes).values({
        rfqId: input.rfqId,
        vendorId: input.vendorId,
        quoteNumber: input.quoteNumber || null,
        quoteDate: input.quoteDate,
        validUntil: input.validUntil ?? null,
        subtotalAmount: input.subtotalAmount,
        taxAmount: input.taxAmount,
        totalAmount: input.totalAmount,
        currency: "XOF",
        deliveryDelayDays: input.deliveryDelayDays ?? null,
        paymentTerms: input.paymentTerms || null,
        documentUrl: input.documentUrl || null,
        status: "received",
        createdAt: now(),
        updatedAt: now(),
      });
      // Update vendor status
      await ((await getDatabase())).update(erpRfqVendors).set({ status: "responded", responseReceivedAt: now(), updatedAt: now() })
        .where(and(eq(erpRfqVendors.rfqId, input.rfqId), eq(erpRfqVendors.vendorId, input.vendorId)));
      // Update RFQ status
      await ((await getDatabase())).update(erpRfqs).set({ status: "responses_received", updatedAt: now() }).where(eq(erpRfqs.id, input.rfqId));
      return { id: result.insertId };
    }),

  addLine: erpPermissionProcedure("erp_rfqs", "create")
    .input(z.object({
      vendorQuoteId: z.number(),
      rfqLineId: z.number().nullable().optional(),
      description: z.string(),
      quantity: z.number().default(100),
      unit: z.string().default("unité"),
      unitPrice: z.number().default(0),
      discountRate: z.number().default(0),
      taxRate: z.number().default(1800),
      deliveryDelayDays: z.number().optional(),
    }))
    .mutation(async ({ input }) => {
      const qty = input.quantity / 100;
      const priceAfterDiscount = input.unitPrice * (1 - input.discountRate / 10000);
      const lineSubtotal = Math.round(qty * priceAfterDiscount);
      const taxAmount = Math.round(lineSubtotal * input.taxRate / 10000);
      const lineTotal = lineSubtotal + taxAmount;
      const [result] = await ((await getDatabase())).insert(erpVendorQuoteLines).values({
        vendorQuoteId: input.vendorQuoteId,
        rfqLineId: input.rfqLineId ?? null,
        description: input.description,
        quantity: input.quantity,
        unit: input.unit,
        unitPrice: input.unitPrice,
        discountRate: input.discountRate,
        taxRate: input.taxRate,
        taxAmount,
        lineTotal,
        deliveryDelayDays: input.deliveryDelayDays ?? null,
        createdAt: now(),
        updatedAt: now(),
      });
      return { id: result.insertId };
    }),

  getLines: erpPermissionProcedure("erp_rfqs", "view")
    .input(z.object({ vendorQuoteId: z.number() }))
    .query(async ({ input }) => {
      return ((await getDatabase())).select().from(erpVendorQuoteLines).where(eq(erpVendorQuoteLines.vendorQuoteId, input.vendorQuoteId));
    }),

  accept: erpPermissionProcedure("erp_rfqs", "approve")
    .input(z.object({ quoteId: z.number(), reason: z.string().optional() }))
    .mutation(async ({ input, ctx }) => {
      const [quote] = await ((await getDatabase())).select().from(erpVendorQuotes).where(eq(erpVendorQuotes.id, input.quoteId));
      if (!quote) throw new Error("Offre introuvable");
      // Reject all other quotes for this RFQ
      await ((await getDatabase())).update(erpVendorQuotes).set({ status: "rejected", updatedAt: now() })
        .where(and(eq(erpVendorQuotes.rfqId, quote.rfqId), isNull(erpVendorQuotes.deletedAt)));
      // Accept this one
      await ((await getDatabase())).update(erpVendorQuotes).set({ status: "accepted", updatedAt: now() }).where(eq(erpVendorQuotes.id, input.quoteId));
      // Update RFQ
      await ((await getDatabase())).update(erpRfqs).set({
        status: "awarded",
        selectedVendorId: quote.vendorId,
        selectedQuoteId: quote.id,
        approvedBy: ctx.user.id,
        approvedAt: now(),
        updatedAt: now(),
      }).where(eq(erpRfqs.id, quote.rfqId));
      // Update vendor status
      await ((await getDatabase())).update(erpRfqVendors).set({ status: "awarded", updatedAt: now() })
        .where(and(eq(erpRfqVendors.rfqId, quote.rfqId), eq(erpRfqVendors.vendorId, quote.vendorId)));
      return { success: true };
    }),

  reject: erpPermissionProcedure("erp_rfqs", "approve")
    .input(z.object({ quoteId: z.number() }))
    .mutation(async ({ input }) => {
      await ((await getDatabase())).update(erpVendorQuotes).set({ status: "rejected", updatedAt: now() }).where(eq(erpVendorQuotes.id, input.quoteId));
      return { success: true };
    }),
});

// --- Comparison & Auto-Select ---
const rfqComparisonRouter = router({
  compare: erpPermissionProcedure("erp_rfqs", "view")
    .input(z.object({ rfqId: z.number() }))
    .query(async ({ input }) => {
      const quotes = await ((await getDatabase())).select().from(erpVendorQuotes)
        .where(and(eq(erpVendorQuotes.rfqId, input.rfqId), isNull(erpVendorQuotes.deletedAt)));
      const vendorIds = quotes.map(q => q.vendorId);
      const vendors = vendorIds.length > 0
        ? await ((await getDatabase())).select().from(erpVendors).where(inArray(erpVendors.id, vendorIds))
        : [];
      const vendorMap = Object.fromEntries(vendors.map(v => [v.id, v]));
      const comparison = quotes.map(q => ({
        quoteId: q.id,
        vendor: vendorMap[q.vendorId] || null,
        subtotalAmount: q.subtotalAmount,
        taxAmount: q.taxAmount,
        totalAmount: q.totalAmount,
        deliveryDelayDays: q.deliveryDelayDays,
        paymentTerms: q.paymentTerms,
        evaluationScore: q.evaluationScore,
        status: q.status,
        validUntil: q.validUntil,
      }));
      return { quotes: comparison };
    }),

  autoSelect: erpPermissionProcedure("erp_rfqs", "approve")
    .input(z.object({ rfqId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const [rfq] = await ((await getDatabase())).select().from(erpRfqs).where(eq(erpRfqs.id, input.rfqId));
      if (!rfq) throw new Error("RFQ introuvable");
      const quotes = await ((await getDatabase())).select().from(erpVendorQuotes)
        .where(and(eq(erpVendorQuotes.rfqId, input.rfqId), isNull(erpVendorQuotes.deletedAt), eq(erpVendorQuotes.status, "received")));
      if (quotes.length === 0) throw new Error("Aucune offre valide disponible");

      // Filter expired quotes
      const validQuotes = quotes.filter(q => !q.validUntil || q.validUntil > now());
      if (validQuotes.length === 0) throw new Error("Toutes les offres sont expirées");

      let selectedQuote: typeof validQuotes[0] | null = null;
      const method = rfq.selectionMethod || "lowest_price";

      if (method === "lowest_price") {
        selectedQuote = validQuotes.reduce((best, q) => (q.totalAmount < best.totalAmount ? q : best), validQuotes[0]);
      } else if (method === "best_delivery_time") {
        selectedQuote = validQuotes.reduce((best, q) => {
          const qDelay = q.deliveryDelayDays ?? 9999;
          const bDelay = best.deliveryDelayDays ?? 9999;
          if (qDelay < bDelay) return q;
          if (qDelay === bDelay && q.totalAmount < best.totalAmount) return q;
          return best;
        }, validQuotes[0]);
      } else if (method === "best_score") {
        // Weighted score: price 50%, delivery 20%, score 20%, conformity 10%
        const maxPrice = Math.max(...validQuotes.map(q => q.totalAmount));
        const maxDelay = Math.max(...validQuotes.map(q => q.deliveryDelayDays ?? 0)) || 1;
        const scored = validQuotes.map(q => {
          const priceScore = maxPrice > 0 ? (1 - q.totalAmount / maxPrice) * 50 : 50;
          const deliveryScore = maxDelay > 0 ? (1 - (q.deliveryDelayDays ?? maxDelay) / maxDelay) * 20 : 20;
          const perfScore = (q.evaluationScore ?? 50) / 100 * 20;
          const conformity = 10; // default full conformity
          return { quote: q, score: priceScore + deliveryScore + perfScore + conformity };
        });
        scored.sort((a, b) => b.score - a.score);
        selectedQuote = scored[0].quote;
      } else {
        // manual — just pick lowest price as suggestion
        selectedQuote = validQuotes.reduce((best, q) => (q.totalAmount < best.totalAmount ? q : best), validQuotes[0]);
      }

      return { suggestedQuoteId: selectedQuote.id, vendorId: selectedQuote.vendorId, totalAmount: selectedQuote.totalAmount, method };
    }),
});

// --- Convert to PO ---
const rfqConvertRouter = router({
  convertToPo: erpPermissionProcedure("erp_rfqs", "approve")
    .input(z.object({ rfqId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const [rfq] = await ((await getDatabase())).select().from(erpRfqs).where(eq(erpRfqs.id, input.rfqId));
      if (!rfq) throw new Error("RFQ introuvable");
      if (rfq.status !== "awarded") throw new Error("La RFQ doit être attribuée avant conversion");
      if (!rfq.selectedQuoteId || !rfq.selectedVendorId) throw new Error("Aucune offre sélectionnée");

      const [quote] = await ((await getDatabase())).select().from(erpVendorQuotes).where(eq(erpVendorQuotes.id, rfq.selectedQuoteId));
      if (!quote) throw new Error("Offre sélectionnée introuvable");

      const quoteLines = await ((await getDatabase())).select().from(erpVendorQuoteLines).where(eq(erpVendorQuoteLines.vendorQuoteId, quote.id));

      // Create PO
      const poNumber = `PO-${Date.now().toString(36).toUpperCase()}`;
      const [poResult] = await ((await getDatabase())).insert(erpPurchaseOrders).values({
        poNumber,
        purchaseRequestId: rfq.purchaseRequestId ?? null,
        rfqId: rfq.id,
        vendorQuoteId: quote.id,
        vendorId: rfq.selectedVendorId,
        projectId: rfq.projectId ?? null,
        orderDate: now(),
        expectedDeliveryDate: quote.deliveryDelayDays ? now() + quote.deliveryDelayDays * 86400000 : null,
        subtotalAmount: quote.subtotalAmount,
        discountAmount: 0,
        taxAmount: quote.taxAmount,
        totalAmount: quote.totalAmount,
        currency: quote.currency,
        status: "draft",
        createdBy: ctx.user.id,
        createdAt: now(),
        updatedAt: now(),
      });

      // Create PO lines from quote lines
      for (const line of quoteLines) {
        await ((await getDatabase())).insert(erpPurchaseOrderLines).values({
          purchaseOrderId: poResult.insertId,
          itemType: "material",
          description: line.description,
          quantityOrdered: line.quantity,
          unit: line.unit,
          unitPrice: line.unitPrice,
          taxRate: line.taxRate ?? 1800,
          taxAmount: line.taxAmount ?? 0,
          lineTotal: line.lineTotal,
          createdAt: now(),
          updatedAt: now(),
        });
      }

      // Update RFQ status
      await ((await getDatabase())).update(erpRfqs).set({ status: "converted_to_po", updatedAt: now() }).where(eq(erpRfqs.id, input.rfqId));

      return { poId: poResult.insertId, poNumber };
    }),
});

// --- Main RFQ Router ---
export const rfqRouter = router({
  crud: rfqCrudRouter,
  lines: rfqLinesRouter,
  vendors: rfqVendorsRouter,
  actions: rfqActionsRouter,
  quotes: vendorQuotesRouter,
  comparison: rfqComparisonRouter,
  convert: rfqConvertRouter,
});
