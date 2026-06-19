import { z } from "zod";
import { eq, and, isNull, desc, sql, gte, lte } from "drizzle-orm";
import { router, erpPermissionProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { createAuditEvent } from "../db";
import { erpPayments, erpInvoices } from "../../drizzle/schema";

// ============================================================
// CONSTANTS
// ============================================================

const PAYMENT_METHODS = [
  "virement", "cheque", "especes", "mobile_money", "carte"
] as const;

// ============================================================
// HELPER: Update invoice status after payment change
// ============================================================

async function updateInvoiceAfterPayment(invoiceId: number) {
  const db = (await getDb())!;
  const [invoice] = await db.select().from(erpInvoices).where(eq(erpInvoices.id, invoiceId));
  if (!invoice) return;

  const payments = await db.select().from(erpPayments).where(eq(erpPayments.invoiceId, invoiceId));
  const paidAmount = payments.reduce((acc, p) => acc + p.amount, 0);

  let newStatus = invoice.status;
  if (paidAmount >= invoice.totalAmount && invoice.totalAmount > 0) {
    newStatus = "paid";
  } else if (paidAmount > 0 && paidAmount < invoice.totalAmount) {
    newStatus = "partially_paid";
  } else if (paidAmount === 0 && (invoice.status === "paid" || invoice.status === "partially_paid")) {
    newStatus = "approved";
  }

  await db.update(erpInvoices).set({
    paidAmount,
    status: newStatus,
    updatedAt: Date.now(),
  }).where(eq(erpInvoices.id, invoiceId));
}

// ============================================================
// PAYMENTS ROUTER
// ============================================================

export const erpPaymentsRouter = router({
  // ---- LIST ----
  list: erpPermissionProcedure("erp_finance", "view")
    .input(z.object({
      invoiceId: z.number().optional(),
      paymentMethod: z.enum(PAYMENT_METHODS).optional(),
      fromDate: z.number().optional(),
      toDate: z.number().optional(),
      limit: z.number().min(1).max(100).default(20),
      offset: z.number().min(0).default(0),
    }))
    .query(async ({ input }) => {
      const db = (await getDb())!;
      const conditions: any[] = [];

      if (input.invoiceId) conditions.push(eq(erpPayments.invoiceId, input.invoiceId));
      if (input.paymentMethod) conditions.push(eq(erpPayments.paymentMethod, input.paymentMethod));
      if (input.fromDate) conditions.push(gte(erpPayments.paymentDate, input.fromDate));
      if (input.toDate) conditions.push(lte(erpPayments.paymentDate, input.toDate));

      const where = conditions.length > 0 ? and(...conditions) : undefined;
      const [countResult] = await db.select({ count: sql<number>`COUNT(*)` }).from(erpPayments).where(where);
      const items = await db.select().from(erpPayments).where(where)
        .orderBy(desc(erpPayments.paymentDate))
        .limit(input.limit).offset(input.offset);

      // Enrich with invoice info
      const enriched = await Promise.all(items.map(async (payment) => {
        const [invoice] = await db.select({
          invoiceNumber: erpInvoices.invoiceNumber,
          totalAmount: erpInvoices.totalAmount,
          status: erpInvoices.status,
        }).from(erpInvoices).where(eq(erpInvoices.id, payment.invoiceId));
        return { ...payment, invoice: invoice || null };
      }));

      return { items: enriched, total: countResult.count };
    }),

  // ---- CREATE (add payment to invoice) ----
  create: erpPermissionProcedure("erp_finance", "create")
    .input(z.object({
      invoiceId: z.number(),
      amount: z.number().min(1),
      paymentDate: z.number(),
      paymentMethod: z.enum(PAYMENT_METHODS).default("virement"),
      reference: z.string().max(128).optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = (await getDb())!;

      // Verify invoice exists and is payable
      const [invoice] = await db.select().from(erpInvoices)
        .where(and(eq(erpInvoices.id, input.invoiceId), isNull(erpInvoices.deletedAt)));
      if (!invoice) throw new Error("Facture introuvable");

      const payableStatuses = ["approved", "partially_paid", "overdue"];
      if (!payableStatuses.includes(invoice.status)) {
        throw new Error("Cette facture ne peut pas recevoir de paiement (statut: " + invoice.status + ")");
      }

      // Check amount doesn't exceed remaining
      const remaining = invoice.totalAmount - invoice.paidAmount;
      if (input.amount > remaining) {
        throw new Error(`Le montant du paiement (${input.amount}) dépasse le solde dû (${remaining})`);
      }

      const [result] = await db.insert(erpPayments).values({
        invoiceId: input.invoiceId,
        amount: input.amount,
        paymentDate: input.paymentDate,
        paymentMethod: input.paymentMethod,
        reference: input.reference || null,
        notes: input.notes || null,
        createdBy: ctx.user.id,
        createdAt: Date.now(),
      });

      // Update invoice paid amount and status
      await updateInvoiceAfterPayment(input.invoiceId);

      await createAuditEvent({
        actorId: ctx.user.id,
        action: "erp.payment.created",
        targetType: "erp_payment",
        targetId: result.insertId,
        details: {
          invoiceId: input.invoiceId,
          invoiceNumber: invoice.invoiceNumber,
          amount: input.amount,
          method: input.paymentMethod,
        },
      });

      return { id: result.insertId };
    }),

  // ---- FOR INVOICE ----
  forInvoice: erpPermissionProcedure("erp_finance", "view")
    .input(z.object({ invoiceId: z.number() }))
    .query(async ({ input }) => {
      const db = (await getDb())!;
      const payments = await db.select().from(erpPayments)
        .where(eq(erpPayments.invoiceId, input.invoiceId))
        .orderBy(desc(erpPayments.paymentDate));

      const [invoice] = await db.select({
        totalAmount: erpInvoices.totalAmount,
        paidAmount: erpInvoices.paidAmount,
      }).from(erpInvoices).where(eq(erpInvoices.id, input.invoiceId));

      return {
        payments,
        totalAmount: invoice?.totalAmount || 0,
        paidAmount: invoice?.paidAmount || 0,
        remainingAmount: (invoice?.totalAmount || 0) - (invoice?.paidAmount || 0),
      };
    }),

  // ---- DELETE (cancel payment) ----
  delete: erpPermissionProcedure("erp_finance", "delete")
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = (await getDb())!;
      const [payment] = await db.select().from(erpPayments).where(eq(erpPayments.id, input.id));
      if (!payment) throw new Error("Paiement introuvable");

      await db.delete(erpPayments).where(eq(erpPayments.id, input.id));

      // Recalculate invoice status
      await updateInvoiceAfterPayment(payment.invoiceId);

      await createAuditEvent({
        actorId: ctx.user.id,
        action: "erp.payment.deleted",
        targetType: "erp_payment",
        targetId: input.id,
        details: {
          invoiceId: payment.invoiceId,
          amount: payment.amount,
        },
      });

      return { success: true };
    }),

  // ---- STATS ----
  stats: erpPermissionProcedure("erp_finance", "view")
    .query(async () => {
      const db = (await getDb())!;
      const allPayments = await db.select().from(erpPayments);

      const totalPayments = allPayments.length;
      const totalAmount = allPayments.reduce((acc, p) => acc + p.amount, 0);

      // By method
      const byMethod = PAYMENT_METHODS.reduce((acc, m) => {
        const methodPayments = allPayments.filter(p => p.paymentMethod === m);
        acc[m] = { count: methodPayments.length, amount: methodPayments.reduce((a, p) => a + p.amount, 0) };
        return acc;
      }, {} as Record<string, { count: number; amount: number }>);

      // Last 30 days
      const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
      const recentPayments = allPayments.filter(p => p.paymentDate >= thirtyDaysAgo);
      const recentAmount = recentPayments.reduce((acc, p) => acc + p.amount, 0);

      return {
        totalPayments,
        totalAmount,
        recentPayments: recentPayments.length,
        recentAmount,
        byMethod,
      };
    }),
});
