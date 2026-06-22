import { z } from "zod";
import { eq, and, isNull, like, or, sql, desc, asc, lte, gte, sum } from "drizzle-orm";
import { router, erpPermissionProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { createAuditEvent } from "../db";
import { erpInvoices, erpInvoiceLines, erpPayments, erpProjects, erpVendors, erpContractors, users } from "../../drizzle/schema";
import { syncBudgetFromInvoice } from "./erp-budget-sync";
import { generateInvoicePreEntry } from "./erp-accounting-auto";
import { generateAndUploadInvoicePdf, getCompanySettings, upsertCompanySettings, getNextNormalizedInvoiceNumber } from "./erp-invoice-pdf.service";

// ============================================================
// CONSTANTS
// ============================================================

const INVOICE_TYPES = ["standard", "credit_note", "proforma"] as const;

const INVOICE_STATUSES = [
  "draft", "submitted", "approved", "partially_paid", "paid", "overdue", "rejected", "cancelled"
] as const;

const PAYMENT_METHODS = [
  "virement", "cheque", "especes", "mobile_money", "carte"
] as const;

// ============================================================
// HELPER: Recalculate invoice totals from lines
// ============================================================

async function recalculateInvoiceTotals(invoiceId: number) {
  const db = (await getDb())!;
  const lines = await db.select().from(erpInvoiceLines).where(eq(erpInvoiceLines.invoiceId, invoiceId));

  const subtotal = lines.reduce((acc, line) => acc + line.amount, 0);
  const taxAmount = lines.reduce((acc, line) => acc + line.taxAmount, 0);
  const totalAmount = lines.reduce((acc, line) => acc + line.totalAmount, 0);

  await db.update(erpInvoices).set({
    subtotal,
    taxAmount,
    totalAmount,
    updatedAt: Date.now(),
  }).where(eq(erpInvoices.id, invoiceId));

  return { subtotal, taxAmount, totalAmount };
}

// ============================================================
// HELPER: Update invoice status based on payments
// ============================================================

async function updateInvoicePaymentStatus(invoiceId: number) {
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
  } else if (invoice.status === "paid" || invoice.status === "partially_paid") {
    // If payments deleted and back to 0
    newStatus = "approved";
  }

  await db.update(erpInvoices).set({
    paidAmount,
    status: newStatus,
    updatedAt: Date.now(),
  }).where(eq(erpInvoices.id, invoiceId));
}

// ============================================================
// INVOICES ROUTER
// ============================================================

export const erpInvoicesRouter = router({
  // ---- LIST ----
  list: erpPermissionProcedure("erp_finance", "view")
    .input(z.object({
      projectId: z.number().optional(),
      vendorId: z.number().optional(),
      contractorId: z.number().optional(),
      status: z.enum(INVOICE_STATUSES).optional(),
      type: z.enum(INVOICE_TYPES).optional(),
      search: z.string().optional(),
      limit: z.number().min(1).max(100).default(20),
      offset: z.number().min(0).default(0),
    }))
    .query(async ({ input }) => {
      const db = (await getDb())!;
      const conditions = [isNull(erpInvoices.deletedAt)];

      if (input.projectId) conditions.push(eq(erpInvoices.projectId, input.projectId));
      if (input.vendorId) conditions.push(eq(erpInvoices.vendorId, input.vendorId));
      if (input.contractorId) conditions.push(eq(erpInvoices.contractorId, input.contractorId));
      if (input.status) conditions.push(eq(erpInvoices.status, input.status));
      if (input.type) conditions.push(eq(erpInvoices.type, input.type));
      if (input.search) {
        conditions.push(
          or(
            like(erpInvoices.invoiceNumber, `%${input.search}%`),
            like(erpInvoices.reference, `%${input.search}%`)
          )!
        );
      }

      const where = and(...conditions);
      const [countResult] = await db.select({ count: sql<number>`COUNT(*)` }).from(erpInvoices).where(where);
      const items = await db.select().from(erpInvoices).where(where)
        .orderBy(desc(erpInvoices.createdAt))
        .limit(input.limit).offset(input.offset);

      return { items, total: countResult.count };
    }),

  // ---- GET BY ID ----
  getById: erpPermissionProcedure("erp_finance", "view")
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = (await getDb())!;
      const [invoice] = await db.select().from(erpInvoices)
        .where(and(eq(erpInvoices.id, input.id), isNull(erpInvoices.deletedAt)));
      if (!invoice) throw new Error("Facture introuvable");

      const lines = await db.select().from(erpInvoiceLines)
        .where(eq(erpInvoiceLines.invoiceId, input.id))
        .orderBy(asc(erpInvoiceLines.sortOrder));

      const payments = await db.select().from(erpPayments)
        .where(eq(erpPayments.invoiceId, input.id))
        .orderBy(desc(erpPayments.paymentDate));

      // Enrich with vendor/contractor name
      let vendorName: string | null = null;
      let contractorName: string | null = null;
      let projectName: string | null = null;

      if (invoice.vendorId) {
        const [v] = await db.select({ name: erpVendors.name }).from(erpVendors).where(eq(erpVendors.id, invoice.vendorId));
        vendorName = v?.name || null;
      }
      if (invoice.contractorId) {
        const [c] = await db.select({ name: erpContractors.name }).from(erpContractors).where(eq(erpContractors.id, invoice.contractorId));
        contractorName = c?.name || null;
      }
      if (invoice.projectId) {
        const [p] = await db.select({ name: erpProjects.name }).from(erpProjects).where(eq(erpProjects.id, invoice.projectId));
        projectName = p?.name || null;
      }

      return { ...invoice, lines, payments, vendorName, contractorName, projectName };
    }),

  // ---- CREATE ----
  create: erpPermissionProcedure("erp_finance", "create")
    .input(z.object({
      projectId: z.number().optional(),
      vendorId: z.number().optional(),
      contractorId: z.number().optional(),
      invoiceNumber: z.string().min(1).max(64),
      reference: z.string().max(128).optional(),
      type: z.enum(INVOICE_TYPES).default("standard"),
      issueDate: z.number(),
      dueDate: z.number(),
      taxRate: z.number().min(0).max(10000).default(1800),
      currency: z.string().max(3).default("XOF"),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = (await getDb())!;
      const now = Date.now();

      const [result] = await db.insert(erpInvoices).values({
        projectId: input.projectId || null,
        vendorId: input.vendorId || null,
        contractorId: input.contractorId || null,
        invoiceNumber: input.invoiceNumber,
        reference: input.reference || null,
        type: input.type,
        status: "draft",
        issueDate: input.issueDate,
        dueDate: input.dueDate,
        taxRate: input.taxRate,
        currency: input.currency,
        notes: input.notes || null,
        createdBy: ctx.user.id,
        createdAt: now,
        updatedAt: now,
      });

      await createAuditEvent({
        actorId: ctx.user.id,
        action: "erp.invoice.created",
        targetType: "erp_invoice",
        targetId: result.insertId,
        details: { invoiceNumber: input.invoiceNumber, type: input.type },
      });

      return { id: result.insertId };
    }),

  // ---- UPDATE ----
  update: erpPermissionProcedure("erp_finance", "update")
    .input(z.object({
      id: z.number(),
      invoiceNumber: z.string().min(1).max(64).optional(),
      reference: z.string().max(128).optional(),
      projectId: z.number().nullable().optional(),
      vendorId: z.number().nullable().optional(),
      contractorId: z.number().nullable().optional(),
      issueDate: z.number().optional(),
      dueDate: z.number().optional(),
      taxRate: z.number().min(0).max(10000).optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = (await getDb())!;
      const [invoice] = await db.select().from(erpInvoices)
        .where(and(eq(erpInvoices.id, input.id), isNull(erpInvoices.deletedAt)));
      if (!invoice) throw new Error("Facture introuvable");
      if (invoice.status !== "draft") throw new Error("Seule une facture en brouillon peut être modifiée");

      const updates: Record<string, unknown> = { updatedAt: Date.now() };
      if (input.invoiceNumber !== undefined) updates.invoiceNumber = input.invoiceNumber;
      if (input.reference !== undefined) updates.reference = input.reference;
      if (input.projectId !== undefined) updates.projectId = input.projectId;
      if (input.vendorId !== undefined) updates.vendorId = input.vendorId;
      if (input.contractorId !== undefined) updates.contractorId = input.contractorId;
      if (input.issueDate !== undefined) updates.issueDate = input.issueDate;
      if (input.dueDate !== undefined) updates.dueDate = input.dueDate;
      if (input.taxRate !== undefined) updates.taxRate = input.taxRate;
      if (input.notes !== undefined) updates.notes = input.notes;

      await db.update(erpInvoices).set(updates).where(eq(erpInvoices.id, input.id));

      await createAuditEvent({
        actorId: ctx.user.id,
        action: "erp.invoice.updated",
        targetType: "erp_invoice",
        targetId: input.id,
        details: { changes: Object.keys(updates).filter(k => k !== "updatedAt") },
      });

      return { success: true };
    }),

  // ---- DELETE (soft) ----
  delete: erpPermissionProcedure("erp_finance", "delete")
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = (await getDb())!;
      const [invoice] = await db.select().from(erpInvoices)
        .where(and(eq(erpInvoices.id, input.id), isNull(erpInvoices.deletedAt)));
      if (!invoice) throw new Error("Facture introuvable");
      if (invoice.status === "paid" || invoice.status === "partially_paid") {
        throw new Error("Impossible de supprimer une facture avec des paiements");
      }

      await db.update(erpInvoices).set({ deletedAt: Date.now(), updatedAt: Date.now() })
        .where(eq(erpInvoices.id, input.id));

      await createAuditEvent({
        actorId: ctx.user.id,
        action: "erp.invoice.deleted",
        targetType: "erp_invoice",
        targetId: input.id,
        details: { invoiceNumber: invoice.invoiceNumber },
      });

      return { success: true };
    }),

  // ---- ADD LINE ----
  addLine: erpPermissionProcedure("erp_finance", "update")
    .input(z.object({
      invoiceId: z.number(),
      description: z.string().min(1).max(512),
      quantity: z.number().min(1).default(100), // quantity * 100
      unitPrice: z.number().min(0), // centimes XOF
      taxRate: z.number().min(0).max(10000).default(1800),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = (await getDb())!;
      const [invoice] = await db.select().from(erpInvoices)
        .where(and(eq(erpInvoices.id, input.invoiceId), isNull(erpInvoices.deletedAt)));
      if (!invoice) throw new Error("Facture introuvable");
      if (invoice.status !== "draft") throw new Error("Impossible d'ajouter des lignes à une facture non-brouillon");

      const amount = Math.round((input.quantity / 100) * input.unitPrice);
      const taxAmount = Math.round(amount * input.taxRate / 10000);
      const totalAmount = amount + taxAmount;

      // Get max sort order
      const [maxOrder] = await db.select({ max: sql<number>`COALESCE(MAX(sort_order), 0)` })
        .from(erpInvoiceLines).where(eq(erpInvoiceLines.invoiceId, input.invoiceId));

      const [result] = await db.insert(erpInvoiceLines).values({
        invoiceId: input.invoiceId,
        description: input.description,
        quantity: input.quantity,
        unitPrice: input.unitPrice,
        amount,
        taxRate: input.taxRate,
        taxAmount,
        totalAmount,
        sortOrder: (maxOrder?.max || 0) + 1,
        createdAt: Date.now(),
      });

      // Recalculate invoice totals
      await recalculateInvoiceTotals(input.invoiceId);

      return { id: result.insertId, amount, taxAmount, totalAmount };
    }),

  // ---- UPDATE LINE ----
  updateLine: erpPermissionProcedure("erp_finance", "update")
    .input(z.object({
      lineId: z.number(),
      description: z.string().min(1).max(512).optional(),
      quantity: z.number().min(1).optional(),
      unitPrice: z.number().min(0).optional(),
      taxRate: z.number().min(0).max(10000).optional(),
    }))
    .mutation(async ({ input }) => {
      const db = (await getDb())!;
      const [line] = await db.select().from(erpInvoiceLines).where(eq(erpInvoiceLines.id, input.lineId));
      if (!line) throw new Error("Ligne introuvable");

      // Check invoice is draft
      const [invoice] = await db.select().from(erpInvoices).where(eq(erpInvoices.id, line.invoiceId));
      if (!invoice || invoice.status !== "draft") throw new Error("Impossible de modifier les lignes d'une facture non-brouillon");

      const quantity = input.quantity ?? line.quantity;
      const unitPrice = input.unitPrice ?? line.unitPrice;
      const taxRate = input.taxRate ?? line.taxRate;
      const amount = Math.round((quantity / 100) * unitPrice);
      const taxAmount = Math.round(amount * taxRate / 10000);
      const totalAmount = amount + taxAmount;

      await db.update(erpInvoiceLines).set({
        description: input.description ?? line.description,
        quantity,
        unitPrice,
        amount,
        taxRate,
        taxAmount,
        totalAmount,
      }).where(eq(erpInvoiceLines.id, input.lineId));

      await recalculateInvoiceTotals(line.invoiceId);

      return { success: true, amount, taxAmount, totalAmount };
    }),

  // ---- DELETE LINE ----
  deleteLine: erpPermissionProcedure("erp_finance", "update")
    .input(z.object({ lineId: z.number() }))
    .mutation(async ({ input }) => {
      const db = (await getDb())!;
      const [line] = await db.select().from(erpInvoiceLines).where(eq(erpInvoiceLines.id, input.lineId));
      if (!line) throw new Error("Ligne introuvable");

      const [invoice] = await db.select().from(erpInvoices).where(eq(erpInvoices.id, line.invoiceId));
      if (!invoice || invoice.status !== "draft") throw new Error("Impossible de supprimer les lignes d'une facture non-brouillon");

      await db.delete(erpInvoiceLines).where(eq(erpInvoiceLines.id, input.lineId));
      await recalculateInvoiceTotals(line.invoiceId);

      return { success: true };
    }),

  // ---- SUBMIT ----
  submit: erpPermissionProcedure("erp_finance", "update")
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = (await getDb())!;
      const [invoice] = await db.select().from(erpInvoices)
        .where(and(eq(erpInvoices.id, input.id), isNull(erpInvoices.deletedAt)));
      if (!invoice) throw new Error("Facture introuvable");
      if (invoice.status !== "draft") throw new Error("Seule une facture en brouillon peut être soumise");
      if (invoice.totalAmount <= 0) throw new Error("La facture doit avoir au moins une ligne avec un montant");

      await db.update(erpInvoices).set({
        status: "submitted",
        submittedAt: Date.now(),
        submittedBy: ctx.user.id,
        updatedAt: Date.now(),
      }).where(eq(erpInvoices.id, input.id));

      await createAuditEvent({
        actorId: ctx.user.id,
        action: "erp.invoice.submitted",
        targetType: "erp_invoice",
        targetId: input.id,
        details: { invoiceNumber: invoice.invoiceNumber, totalAmount: invoice.totalAmount },
      });

      return { success: true };
    }),

  // ---- APPROVE ----
  approve: erpPermissionProcedure("erp_finance", "approve")
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = (await getDb())!;
      const [invoice] = await db.select().from(erpInvoices)
        .where(and(eq(erpInvoices.id, input.id), isNull(erpInvoices.deletedAt)));
      if (!invoice) throw new Error("Facture introuvable");
      if (invoice.status !== "submitted") throw new Error("Seule une facture soumise peut être approuvée");

      await db.update(erpInvoices).set({
        status: "approved",
        approvedAt: Date.now(),
        approvedBy: ctx.user.id,
        updatedAt: Date.now(),
      }).where(eq(erpInvoices.id, input.id));

      await createAuditEvent({
        actorId: ctx.user.id,
        action: "erp.invoice.approved",
        targetType: "erp_invoice",
        targetId: input.id,
        details: { invoiceNumber: invoice.invoiceNumber },
      });

      // Auto-sync budget engagedAmount
      await syncBudgetFromInvoice(input.id);
      // Générer écriture pré-comptable automatique (Journal HA)
      await generateInvoicePreEntry(input.id, ctx.user.id);

      return { success: true };
    }),

  // ---- REJECT ----
  reject: erpPermissionProcedure("erp_finance", "approve")
    .input(z.object({
      id: z.number(),
      reason: z.string().min(1).max(1000),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = (await getDb())!;
      const [invoice] = await db.select().from(erpInvoices)
        .where(and(eq(erpInvoices.id, input.id), isNull(erpInvoices.deletedAt)));
      if (!invoice) throw new Error("Facture introuvable");
      if (invoice.status !== "submitted") throw new Error("Seule une facture soumise peut être rejetée");

      await db.update(erpInvoices).set({
        status: "rejected",
        rejectedAt: Date.now(),
        rejectedBy: ctx.user.id,
        rejectionReason: input.reason,
        updatedAt: Date.now(),
      }).where(eq(erpInvoices.id, input.id));

      await createAuditEvent({
        actorId: ctx.user.id,
        action: "erp.invoice.rejected",
        targetType: "erp_invoice",
        targetId: input.id,
        details: { invoiceNumber: invoice.invoiceNumber, reason: input.reason },
      });

      return { success: true };
    }),

  // ---- OVERDUE ----
  overdue: erpPermissionProcedure("erp_finance", "view")
    .input(z.object({
      limit: z.number().min(1).max(100).default(20),
      offset: z.number().min(0).default(0),
    }))
    .query(async ({ input }) => {
      const db = (await getDb())!;
      const now = Date.now();
      const conditions = [
        isNull(erpInvoices.deletedAt),
        lte(erpInvoices.dueDate, now),
        or(
          eq(erpInvoices.status, "approved"),
          eq(erpInvoices.status, "partially_paid"),
          eq(erpInvoices.status, "submitted")
        )!,
      ];

      const where = and(...conditions);
      const [countResult] = await db.select({ count: sql<number>`COUNT(*)` }).from(erpInvoices).where(where);
      const items = await db.select().from(erpInvoices).where(where)
        .orderBy(asc(erpInvoices.dueDate))
        .limit(input.limit).offset(input.offset);

      return { items, total: countResult.count };
    }),

  // ---- UNPAID ----
  unpaid: erpPermissionProcedure("erp_finance", "view")
    .input(z.object({
      limit: z.number().min(1).max(100).default(20),
      offset: z.number().min(0).default(0),
    }))
    .query(async ({ input }) => {
      const db = (await getDb())!;
      const conditions = [
        isNull(erpInvoices.deletedAt),
        or(
          eq(erpInvoices.status, "approved"),
          eq(erpInvoices.status, "partially_paid"),
          eq(erpInvoices.status, "overdue")
        )!,
      ];

      const where = and(...conditions);
      const [countResult] = await db.select({ count: sql<number>`COUNT(*)` }).from(erpInvoices).where(where);
      const items = await db.select().from(erpInvoices).where(where)
        .orderBy(asc(erpInvoices.dueDate))
        .limit(input.limit).offset(input.offset);

      return { items, total: countResult.count };
    }),

  // ---- STATS ----
  stats: erpPermissionProcedure("erp_finance", "view")
    .query(async () => {
      const db = (await getDb())!;
      const now = Date.now();

      const allInvoices = await db.select({
        status: erpInvoices.status,
        totalAmount: erpInvoices.totalAmount,
        paidAmount: erpInvoices.paidAmount,
        dueDate: erpInvoices.dueDate,
      }).from(erpInvoices).where(isNull(erpInvoices.deletedAt));

      const totalInvoices = allInvoices.length;
      const totalAmount = allInvoices.reduce((acc, i) => acc + i.totalAmount, 0);
      const totalPaid = allInvoices.reduce((acc, i) => acc + i.paidAmount, 0);
      const totalDue = totalAmount - totalPaid;

      const overdueCount = allInvoices.filter(i =>
        i.dueDate <= now && ["approved", "partially_paid", "submitted"].includes(i.status)
      ).length;

      const byStatus = INVOICE_STATUSES.reduce((acc, s) => {
        acc[s] = allInvoices.filter(i => i.status === s).length;
        return acc;
      }, {} as Record<string, number>);

      return {
        totalInvoices,
        totalAmount,
        totalPaid,
        totalDue,
        overdueCount,
        byStatus,
      };
    }),

  // ---- GÉNÉRATION PDF ----
  generatePdf: erpPermissionProcedure("erp_finance", "view")
    .input(z.object({ invoiceId: z.number() }))
    .mutation(async ({ input }) => {
      const result = await generateAndUploadInvoicePdf(input.invoiceId);
      return result;
    }),

  // ---- PROCHAIN NUMÉRO DE FACTURE NORMALISÉ ----
  getNextInvoiceNumber: erpPermissionProcedure("erp_finance", "view")
    .query(async () => {
      try {
        const number = await getNextNormalizedInvoiceNumber();
        return { number };
      } catch (e: any) {
        return { number: null, error: e.message };
      }
    }),

  // ---- PARAMÈTRES SOCIÉTÉ ----
  getCompanySettings: erpPermissionProcedure("erp_finance", "view")
    .query(async () => {
      const settings = await getCompanySettings();
      return settings;
    }),

  updateCompanySettings: erpPermissionProcedure("erp_finance", "manage")
    .input(z.object({
      companyName: z.string().min(1).optional(),
      ncc: z.string().optional(),
      rccm: z.string().optional(),
      rccmDate: z.string().optional(),
      taxRegime: z.string().optional(),
      taxCenter: z.string().optional(),
      address: z.string().optional(),
      city: z.string().optional(),
      postalBox: z.string().optional(),
      phone: z.string().optional(),
      email: z.string().optional(),
      website: z.string().optional(),
      bankReferences: z.string().optional(),
      logoUrl: z.string().optional(),
      invoicePrefix: z.string().optional(),
      defaultPaymentTerms: z.string().optional(),
      defaultPaymentMode: z.string().optional(),
      defaultTaxRate: z.number().optional(),
    }))
    .mutation(async ({ input }) => {
      const result = await upsertCompanySettings(input);
      return result;
    }),
});
