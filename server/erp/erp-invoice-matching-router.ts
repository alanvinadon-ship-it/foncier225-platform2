import { z } from "zod";
import { eq, and, isNull, desc, sql } from "drizzle-orm";
import { router, erpPermissionProcedure } from "../_core/trpc";
import { getDb } from "../db";
import {
  erpInvoicePoMatches, erpInvoicePoMatchLines, erpMatchingSettings,
  erpInvoices, erpInvoiceLines, erpPurchaseOrders, erpPurchaseOrderLines,
  erpVendors, erpProjects
} from "../../drizzle/schema";

const now = () => Date.now();
const getDatabase = async () => (await getDb())!;

// --- Matching Settings ---
const settingsRouter = router({
  list: erpPermissionProcedure("erp_invoice_matching", "view")
    .query(async () => {
      const db = await getDatabase();
      return db.select().from(erpMatchingSettings);
    }),

  upsert: erpPermissionProcedure("erp_invoice_matching", "approve")
    .input(z.object({ settingKey: z.string(), settingValue: z.string(), description: z.string().optional() }))
    .mutation(async ({ input }) => {
      const db = await getDatabase();
      const [existing] = await db.select().from(erpMatchingSettings).where(eq(erpMatchingSettings.settingKey, input.settingKey));
      if (existing) {
        await db.update(erpMatchingSettings).set({ settingValue: input.settingValue, updatedAt: now() }).where(eq(erpMatchingSettings.id, existing.id));
      } else {
        await db.insert(erpMatchingSettings).values({
          settingKey: input.settingKey,
          settingValue: input.settingValue,
          description: input.description || null,
          isActive: 1,
          createdAt: now(),
          updatedAt: now(),
        });
      }
      return { success: true };
    }),
});

// --- Matching CRUD ---
const matchCrudRouter = router({
  list: erpPermissionProcedure("erp_invoice_matching", "view")
    .input(z.object({ status: z.string().optional(), approvalStatus: z.string().optional(), limit: z.number().default(50), offset: z.number().default(0) }))
    .query(async ({ input }) => {
      const db = await getDatabase();
      const conditions: any[] = [isNull(erpInvoicePoMatches.deletedAt)];
      if (input.status) conditions.push(eq(erpInvoicePoMatches.matchStatus, input.status));
      if (input.approvalStatus) conditions.push(eq(erpInvoicePoMatches.approvalStatus, input.approvalStatus));
      const items = await db.select().from(erpInvoicePoMatches).where(and(...conditions)).orderBy(desc(erpInvoicePoMatches.createdAt)).limit(input.limit).offset(input.offset);
      const [{ count }] = await db.select({ count: sql<number>`count(*)` }).from(erpInvoicePoMatches).where(and(...conditions));
      return { items, total: count };
    }),

  getById: erpPermissionProcedure("erp_invoice_matching", "view")
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = await getDatabase();
      const [match] = await db.select().from(erpInvoicePoMatches).where(eq(erpInvoicePoMatches.id, input.id));
      if (!match) throw new Error("Rapprochement introuvable");
      const lines = await db.select().from(erpInvoicePoMatchLines).where(eq(erpInvoicePoMatchLines.invoicePoMatchId, input.id));
      const [invoice] = await db.select().from(erpInvoices).where(eq(erpInvoices.id, match.invoiceId));
      const [po] = await db.select().from(erpPurchaseOrders).where(eq(erpPurchaseOrders.id, match.purchaseOrderId));
      return { ...match, lines, invoice, purchaseOrder: po };
    }),

  pendingReview: erpPermissionProcedure("erp_invoice_matching", "view")
    .query(async () => {
      const db = await getDatabase();
      return db.select().from(erpInvoicePoMatches)
        .where(and(eq(erpInvoicePoMatches.approvalStatus, "pending_review"), isNull(erpInvoicePoMatches.deletedAt)))
        .orderBy(desc(erpInvoicePoMatches.createdAt));
    }),

  variances: erpPermissionProcedure("erp_invoice_matching", "view")
    .query(async () => {
      const db = await getDatabase();
      return db.select().from(erpInvoicePoMatches)
        .where(and(eq(erpInvoicePoMatches.matchStatus, "variance_detected"), isNull(erpInvoicePoMatches.deletedAt)))
        .orderBy(desc(erpInvoicePoMatches.createdAt));
    }),
});

// --- Auto-Match ---
const autoMatchRouter = router({
  matchInvoice: erpPermissionProcedure("erp_invoice_matching", "create")
    .input(z.object({ invoiceId: z.number(), purchaseOrderId: z.number().optional() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDatabase();
      const [invoice] = await db.select().from(erpInvoices).where(eq(erpInvoices.id, input.invoiceId));
      if (!invoice) throw new Error("Facture introuvable");

      // Get settings
      const settings = await db.select().from(erpMatchingSettings);
      const getSetting = (key: string, defaultVal: string) => {
        const s = settings.find((st: any) => st.settingKey === key && st.isActive);
        return s ? s.settingValue : defaultVal;
      };
      const priceTolerance = parseInt(getSetting("invoice_po_price_tolerance_percentage", "500")); // 5%
      const quantityTolerance = parseInt(getSetting("invoice_po_quantity_tolerance_percentage", "500"));
      const totalTolerance = parseInt(getSetting("invoice_po_total_tolerance_amount", "50000")); // 500 XOF
      const autoApproveExact = getSetting("auto_approve_exact_match", "true") === "true";

      // Find matching PO
      let poId = input.purchaseOrderId;
      if (!poId && invoice.vendorId) {
        // Try to find PO by vendor and similar amount
        const pos = await db.select().from(erpPurchaseOrders)
          .where(and(eq(erpPurchaseOrders.vendorId, invoice.vendorId!), eq(erpPurchaseOrders.status, "approved")));
        // Find closest match by total
        const closest = pos.reduce((best: any, po: any) => {
          const diff = Math.abs(po.totalAmount - invoice.totalAmount);
          if (!best || diff < best.diff) return { po, diff };
          return best;
        }, null);
        if (closest) poId = closest.po.id;
      }
      if (!poId) throw new Error("Aucun bon de commande correspondant trouvé");

      const [po] = await db.select().from(erpPurchaseOrders).where(eq(erpPurchaseOrders.id, poId));
      if (!po) throw new Error("Bon de commande introuvable");

      // Calculate variances
      const priceVariance = invoice.totalAmount - po.totalAmount;
      const variancePercentage = po.totalAmount > 0 ? Math.round(Math.abs(priceVariance) / po.totalAmount * 10000) : 0;

      // Determine match status
      let matchStatus = "auto_matched";
      let approvalStatus = "pending_review";
      let matchScore = 100;

      if (priceVariance === 0 && invoice.vendorId === po.vendorId) {
        matchStatus = "auto_matched";
        matchScore = 100;
        if (autoApproveExact) approvalStatus = "approved";
      } else if (variancePercentage <= priceTolerance) {
        matchStatus = "partial_match";
        matchScore = 80;
      } else {
        matchStatus = "variance_detected";
        matchScore = Math.max(0, 100 - Math.round(variancePercentage / 100));
        approvalStatus = "pending_review";
      }

      // Create match record
      const [result] = await db.insert(erpInvoicePoMatches).values({
        invoiceId: invoice.id,
        purchaseOrderId: po.id,
        vendorId: invoice.vendorId,
        projectId: invoice.projectId,
        matchStatus,
        matchScore,
        priceVarianceAmount: priceVariance,
        quantityVariance: 0,
        taxVarianceAmount: (invoice.taxAmount || 0) - (po.taxAmount || 0),
        totalVarianceAmount: priceVariance,
        variancePercentage,
        matchedBy: ctx.user.id,
        matchedAt: now(),
        approvalStatus,
        createdAt: now(),
        updatedAt: now(),
      });

      // Match lines
      const invoiceLines = await db.select().from(erpInvoiceLines).where(eq(erpInvoiceLines.invoiceId, invoice.id));
      const poLines = await db.select().from(erpPurchaseOrderLines).where(eq(erpPurchaseOrderLines.purchaseOrderId, po.id));

      for (const invLine of invoiceLines) {
        // Try to find matching PO line by description similarity
        const matchingPoLine = poLines.find((pl: any) => pl.description.toLowerCase().includes(invLine.description.toLowerCase().substring(0, 10)));
        await db.insert(erpInvoicePoMatchLines).values({
          invoicePoMatchId: result.insertId,
          invoiceLineId: invLine.id,
          purchaseOrderLineId: matchingPoLine?.id || null,
          description: invLine.description,
          invoiceQuantity: invLine.quantity,
          poQuantity: matchingPoLine?.quantityOrdered || 0,
          quantityVariance: invLine.quantity - (matchingPoLine?.quantityOrdered || 0),
          invoiceUnitPrice: invLine.unitPrice,
          poUnitPrice: matchingPoLine ? Number(matchingPoLine.unitPrice) : 0,
          priceVariance: invLine.unitPrice - (matchingPoLine ? Number(matchingPoLine.unitPrice) : 0),
          invoiceTaxAmount: invLine.taxAmount,
          poTaxAmount: matchingPoLine ? Number(matchingPoLine.taxAmount || 0) : 0,
          taxVariance: invLine.taxAmount - (matchingPoLine ? Number(matchingPoLine.taxAmount || 0) : 0),
          invoiceLineTotal: invLine.totalAmount,
          poLineTotal: matchingPoLine ? Number(matchingPoLine.lineTotal) : 0,
          lineVariance: invLine.totalAmount - (matchingPoLine ? Number(matchingPoLine.lineTotal) : 0),
          matchStatus: matchingPoLine ? (invLine.totalAmount === Number(matchingPoLine.lineTotal) ? "matched" : "variance") : "missing_in_po",
          createdAt: now(),
          updatedAt: now(),
        });
      }

      return { matchId: result.insertId, matchStatus, matchScore, approvalStatus, priceVariance, variancePercentage };
    }),
});

// --- Approval Actions ---
const approvalRouter = router({
  approve: erpPermissionProcedure("erp_invoice_matching", "approve")
    .input(z.object({ id: z.number(), notes: z.string().optional() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDatabase();
      await db.update(erpInvoicePoMatches).set({
        approvalStatus: "approved",
        reviewedBy: ctx.user.id,
        reviewedAt: now(),
        notes: input.notes || null,
        updatedAt: now(),
      }).where(eq(erpInvoicePoMatches.id, input.id));
      return { success: true };
    }),

  reject: erpPermissionProcedure("erp_invoice_matching", "approve")
    .input(z.object({ id: z.number(), notes: z.string().optional() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDatabase();
      await db.update(erpInvoicePoMatches).set({
        approvalStatus: "rejected",
        matchStatus: "rejected",
        reviewedBy: ctx.user.id,
        reviewedAt: now(),
        notes: input.notes || null,
        updatedAt: now(),
      }).where(eq(erpInvoicePoMatches.id, input.id));
      return { success: true };
    }),

  escalate: erpPermissionProcedure("erp_invoice_matching", "approve")
    .input(z.object({ id: z.number(), notes: z.string().optional() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDatabase();
      await db.update(erpInvoicePoMatches).set({
        approvalStatus: "escalated",
        reviewedBy: ctx.user.id,
        reviewedAt: now(),
        notes: input.notes || null,
        updatedAt: now(),
      }).where(eq(erpInvoicePoMatches.id, input.id));
      return { success: true };
    }),
});

// --- Main Invoice Matching Router ---
export const invoiceMatchingRouter = router({
  settings: settingsRouter,
  matches: matchCrudRouter,
  autoMatch: autoMatchRouter,
  approval: approvalRouter,
});
