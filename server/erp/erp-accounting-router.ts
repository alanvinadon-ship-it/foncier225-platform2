import { z } from "zod";
import { eq, and, desc, sql, isNull, gte, lte } from "drizzle-orm";
import { router, erpPermissionProcedure } from "../_core/trpc";
import { getDb, createAuditEvent } from "../db";
import {
  erpAccountingAccounts,
  erpTaxCodes,
  erpPaymentAccounts,
  erpAccountingPreEntries,
  erpAccountingPreEntryLines,
} from "../../drizzle/schema";

// ============================================================
// ERP ACCOUNTING ROUTER — Sprint 21
// Plan comptable, Codes TVA, Comptes de paiement, Pré-écritures
// ============================================================

// --- PLAN COMPTABLE ---
const accountsRouter = router({
  list: erpPermissionProcedure("erp_accounting", "view")
    .input(z.object({
      accountType: z.string().optional(),
      isActive: z.boolean().optional(),
      search: z.string().optional(),
      limit: z.number().min(1).max(100).default(50),
      offset: z.number().min(0).default(0),
    }).optional())
    .query(async ({ input }) => {
      const db = (await getDb())!;
      const params = input || { limit: 50, offset: 0 };
      const conditions: any[] = [];
      if (params.accountType) conditions.push(eq(erpAccountingAccounts.accountType, params.accountType));
      if (params.isActive !== undefined) conditions.push(eq(erpAccountingAccounts.isActive, params.isActive));
      const where = conditions.length > 0 ? and(...conditions) : undefined;
      const [items, countResult] = await Promise.all([
        db.select().from(erpAccountingAccounts).where(where).orderBy(erpAccountingAccounts.accountCode).limit(params.limit).offset(params.offset),
        db.select({ count: sql<number>`COUNT(*)` }).from(erpAccountingAccounts).where(where),
      ]);
      return { accounts: items, total: countResult[0].count };
    }),

  getById: erpPermissionProcedure("erp_accounting", "view")
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = (await getDb())!;
      const [account] = await db.select().from(erpAccountingAccounts).where(eq(erpAccountingAccounts.id, input.id));
      return account || null;
    }),

  create: erpPermissionProcedure("erp_accounting", "create")
    .input(z.object({
      accountCode: z.string().min(1).max(16),
      accountName: z.string().min(1).max(255),
      accountType: z.string().min(1).max(32),
      parentId: z.number().nullable().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = (await getDb())!;
      const now = Date.now();
      const [result] = await db.insert(erpAccountingAccounts).values({
        ...input,
        parentId: input.parentId ?? null,
        isActive: true,
        createdAt: now,
        updatedAt: now,
      });
      await createAuditEvent({ actorId: ctx.user.id, action: "erp.accounting.account.created", targetType: "accounting_account", targetId: result.insertId, details: input });
      return { id: result.insertId };
    }),

  update: erpPermissionProcedure("erp_accounting", "update")
    .input(z.object({
      id: z.number(),
      accountCode: z.string().min(1).max(16).optional(),
      accountName: z.string().min(1).max(255).optional(),
      accountType: z.string().min(1).max(32).optional(),
      parentId: z.number().nullable().optional(),
      isActive: z.boolean().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = (await getDb())!;
      const { id, ...data } = input;
      await db.update(erpAccountingAccounts).set({ ...data, updatedAt: Date.now() }).where(eq(erpAccountingAccounts.id, id));
      await createAuditEvent({ actorId: ctx.user.id, action: "erp.accounting.account.updated", targetType: "accounting_account", targetId: id, details: data });
      return { success: true };
    }),
});

// --- CODES TVA ---
const taxCodesRouter = router({
  list: erpPermissionProcedure("erp_accounting", "view")
    .input(z.object({
      taxType: z.string().optional(),
      isActive: z.boolean().optional(),
      limit: z.number().min(1).max(100).default(50),
      offset: z.number().min(0).default(0),
    }).optional())
    .query(async ({ input }) => {
      const db = (await getDb())!;
      const params = input || { limit: 50, offset: 0 };
      const conditions: any[] = [];
      if (params.taxType) conditions.push(eq(erpTaxCodes.taxType, params.taxType));
      if (params.isActive !== undefined) conditions.push(eq(erpTaxCodes.isActive, params.isActive));
      const where = conditions.length > 0 ? and(...conditions) : undefined;
      const [items, countResult] = await Promise.all([
        db.select().from(erpTaxCodes).where(where).orderBy(erpTaxCodes.code).limit(params.limit).offset(params.offset),
        db.select({ count: sql<number>`COUNT(*)` }).from(erpTaxCodes).where(where),
      ]);
      return { taxCodes: items, total: countResult[0].count };
    }),

  create: erpPermissionProcedure("erp_accounting", "create")
    .input(z.object({
      code: z.string().min(1).max(16),
      name: z.string().min(1).max(128),
      description: z.string().optional(),
      taxType: z.string().min(1).max(32),
      rate: z.number().min(0).max(10000),
      isRecoverable: z.boolean().default(false),
      isWithholding: z.boolean().default(false),
      accountingAccountId: z.number().nullable().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = (await getDb())!;
      const now = Date.now();
      const [result] = await db.insert(erpTaxCodes).values({
        ...input,
        accountingAccountId: input.accountingAccountId ?? null,
        isActive: true,
        effectiveFrom: now,
        createdAt: now,
        updatedAt: now,
      });
      await createAuditEvent({ actorId: ctx.user.id, action: "erp.accounting.taxcode.created", targetType: "tax_code", targetId: result.insertId, details: input });
      return { id: result.insertId };
    }),

  update: erpPermissionProcedure("erp_accounting", "update")
    .input(z.object({
      id: z.number(),
      code: z.string().min(1).max(16).optional(),
      name: z.string().min(1).max(128).optional(),
      description: z.string().nullable().optional(),
      taxType: z.string().min(1).max(32).optional(),
      rate: z.number().min(0).max(10000).optional(),
      isRecoverable: z.boolean().optional(),
      isWithholding: z.boolean().optional(),
      isActive: z.boolean().optional(),
      accountingAccountId: z.number().nullable().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = (await getDb())!;
      const { id, ...data } = input;
      await db.update(erpTaxCodes).set({ ...data, updatedAt: Date.now() }).where(eq(erpTaxCodes.id, id));
      await createAuditEvent({ actorId: ctx.user.id, action: "erp.accounting.taxcode.updated", targetType: "tax_code", targetId: id, details: data });
      return { success: true };
    }),
});

// --- COMPTES DE PAIEMENT ---
const paymentAccountsRouter = router({
  list: erpPermissionProcedure("erp_accounting", "view")
    .input(z.object({
      accountType: z.string().optional(),
      isActive: z.boolean().optional(),
      limit: z.number().min(1).max(100).default(50),
      offset: z.number().min(0).default(0),
    }).optional())
    .query(async ({ input }) => {
      const db = (await getDb())!;
      const params = input || { limit: 50, offset: 0 };
      const conditions: any[] = [];
      if (params.accountType) conditions.push(eq(erpPaymentAccounts.accountType, params.accountType));
      if (params.isActive !== undefined) conditions.push(eq(erpPaymentAccounts.isActive, params.isActive));
      const where = conditions.length > 0 ? and(...conditions) : undefined;
      const [items, countResult] = await Promise.all([
        db.select().from(erpPaymentAccounts).where(where).orderBy(erpPaymentAccounts.name).limit(params.limit).offset(params.offset),
        db.select({ count: sql<number>`COUNT(*)` }).from(erpPaymentAccounts).where(where),
      ]);
      return { paymentAccounts: items, total: countResult[0].count };
    }),

  create: erpPermissionProcedure("erp_accounting", "create")
    .input(z.object({
      name: z.string().min(1).max(128),
      accountType: z.string().min(1).max(32),
      bankName: z.string().max(128).optional(),
      accountNumberMasked: z.string().max(64).optional(),
      currency: z.string().max(3).default("XOF"),
      accountingAccountId: z.number().nullable().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = (await getDb())!;
      const now = Date.now();
      const [result] = await db.insert(erpPaymentAccounts).values({
        name: input.name,
        accountType: input.accountType,
        bankName: input.bankName ?? null,
        accountNumberMasked: input.accountNumberMasked ?? null,
        currency: input.currency,
        accountingAccountId: input.accountingAccountId ?? null,
        isActive: true,
        createdAt: now,
        updatedAt: now,
      });
      await createAuditEvent({ actorId: ctx.user.id, action: "erp.accounting.paymentaccount.created", targetType: "payment_account", targetId: result.insertId, details: input });
      return { id: result.insertId };
    }),

  update: erpPermissionProcedure("erp_accounting", "update")
    .input(z.object({
      id: z.number(),
      name: z.string().min(1).max(128).optional(),
      accountType: z.string().min(1).max(32).optional(),
      bankName: z.string().max(128).nullable().optional(),
      accountNumberMasked: z.string().max(64).nullable().optional(),
      isActive: z.boolean().optional(),
      accountingAccountId: z.number().nullable().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = (await getDb())!;
      const { id, ...data } = input;
      await db.update(erpPaymentAccounts).set({ ...data, updatedAt: Date.now() }).where(eq(erpPaymentAccounts.id, id));
      await createAuditEvent({ actorId: ctx.user.id, action: "erp.accounting.paymentaccount.updated", targetType: "payment_account", targetId: id, details: data });
      return { success: true };
    }),
});

// --- PRÉ-ÉCRITURES COMPTABLES ---
const preEntriesRouter = router({
  list: erpPermissionProcedure("erp_accounting", "view")
    .input(z.object({
      status: z.string().optional(),
      journalCode: z.string().optional(),
      sourceType: z.string().optional(),
      dateFrom: z.number().optional(),
      dateTo: z.number().optional(),
      limit: z.number().min(1).max(100).default(50),
      offset: z.number().min(0).default(0),
    }).optional())
    .query(async ({ input }) => {
      const db = (await getDb())!;
      const params = input || { limit: 50, offset: 0 };
      const conditions: any[] = [];
      if (params.status) conditions.push(eq(erpAccountingPreEntries.status, params.status));
      if (params.journalCode) conditions.push(eq(erpAccountingPreEntries.journalCode, params.journalCode));
      if (params.sourceType) conditions.push(eq(erpAccountingPreEntries.sourceType, params.sourceType));
      if (params.dateFrom) conditions.push(gte(erpAccountingPreEntries.entryDate, params.dateFrom));
      if (params.dateTo) conditions.push(lte(erpAccountingPreEntries.entryDate, params.dateTo));
      const where = conditions.length > 0 ? and(...conditions) : undefined;
      const [items, countResult] = await Promise.all([
        db.select().from(erpAccountingPreEntries).where(where).orderBy(desc(erpAccountingPreEntries.entryDate)).limit(params.limit).offset(params.offset),
        db.select({ count: sql<number>`COUNT(*)` }).from(erpAccountingPreEntries).where(where),
      ]);
      return { preEntries: items, total: countResult[0].count };
    }),

  getById: erpPermissionProcedure("erp_accounting", "view")
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = (await getDb())!;
      const [entry] = await db.select().from(erpAccountingPreEntries).where(eq(erpAccountingPreEntries.id, input.id));
      if (!entry) return null;
      const lines = await db.select().from(erpAccountingPreEntryLines).where(eq(erpAccountingPreEntryLines.preEntryId, input.id));
      return { ...entry, lines };
    }),

  create: erpPermissionProcedure("erp_accounting", "create")
    .input(z.object({
      sourceType: z.string().min(1).max(32),
      sourceId: z.number(),
      entryDate: z.number(),
      journalCode: z.string().min(1).max(16),
      description: z.string().max(500).optional(),
      lines: z.array(z.object({
        accountingAccountId: z.number(),
        debitAmount: z.number().min(0).default(0),
        creditAmount: z.number().min(0).default(0),
        label: z.string().max(255).optional(),
        projectId: z.number().nullable().optional(),
        vendorId: z.number().nullable().optional(),
        taxCodeId: z.number().nullable().optional(),
      })).min(2),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = (await getDb())!;
      const now = Date.now();
      const totalDebit = input.lines.reduce((s, l) => s + l.debitAmount, 0);
      const totalCredit = input.lines.reduce((s, l) => s + l.creditAmount, 0);
      if (totalDebit !== totalCredit) {
        throw new Error("L'écriture n'est pas équilibrée : total débit ≠ total crédit");
      }
      const [result] = await db.insert(erpAccountingPreEntries).values({
        sourceType: input.sourceType,
        sourceId: input.sourceId,
        entryDate: input.entryDate,
        journalCode: input.journalCode,
        description: input.description ?? null,
        status: "draft",
        totalDebit,
        totalCredit,
        createdBy: ctx.user.id,
        createdAt: now,
        updatedAt: now,
      });
      const entryId = result.insertId;
      for (const line of input.lines) {
        await db.insert(erpAccountingPreEntryLines).values({
          preEntryId: entryId,
          accountingAccountId: line.accountingAccountId,
          debitAmount: line.debitAmount,
          creditAmount: line.creditAmount,
          label: line.label ?? null,
          projectId: line.projectId ?? null,
          vendorId: line.vendorId ?? null,
          taxCodeId: line.taxCodeId ?? null,
          createdAt: now,
          updatedAt: now,
        });
      }
      await createAuditEvent({ actorId: ctx.user.id, action: "erp.accounting.preentry.created", targetType: "pre_entry", targetId: entryId, details: { sourceType: input.sourceType, sourceId: input.sourceId, totalDebit } });
      return { id: entryId };
    }),

  validate: erpPermissionProcedure("erp_accounting", "validate")
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = (await getDb())!;
      const [entry] = await db.select().from(erpAccountingPreEntries).where(eq(erpAccountingPreEntries.id, input.id));
      if (!entry) throw new Error("Écriture non trouvée");
      if (entry.status !== "draft" && entry.status !== "reviewed") {
        throw new Error("Seules les écritures en brouillon ou révisées peuvent être validées");
      }
      if (entry.totalDebit !== entry.totalCredit) {
        throw new Error("L'écriture n'est pas équilibrée");
      }
      await db.update(erpAccountingPreEntries).set({
        status: "validated",
        validatedBy: ctx.user.id,
        validatedAt: Date.now(),
        updatedAt: Date.now(),
      }).where(eq(erpAccountingPreEntries.id, input.id));
      await createAuditEvent({ actorId: ctx.user.id, action: "erp.accounting.preentry.validated", targetType: "pre_entry", targetId: input.id, details: {} });
      return { success: true };
    }),

  // Stats pour le dashboard comptable
  stats: erpPermissionProcedure("erp_accounting", "view")
    .query(async () => {
      const db = (await getDb())!;
      const [accountsCount] = await db.select({ count: sql<number>`COUNT(*)` }).from(erpAccountingAccounts);
      const [taxCodesCount] = await db.select({ count: sql<number>`COUNT(*)` }).from(erpTaxCodes);
      const [preEntriesCount] = await db.select({ count: sql<number>`COUNT(*)` }).from(erpAccountingPreEntries);
      const [draftCount] = await db.select({ count: sql<number>`COUNT(*)` }).from(erpAccountingPreEntries).where(eq(erpAccountingPreEntries.status, "draft"));
      const [validatedCount] = await db.select({ count: sql<number>`COUNT(*)` }).from(erpAccountingPreEntries).where(eq(erpAccountingPreEntries.status, "validated"));
      return {
        totalAccounts: accountsCount.count,
        totalTaxCodes: taxCodesCount.count,
        totalPreEntries: preEntriesCount.count,
        draftEntries: draftCount.count,
        validatedEntries: validatedCount.count,
      };
    }),
});

// ============================================================
// EXPORT
// ============================================================
export const erpAccountingRouter = router({
  accounts: accountsRouter,
  taxCodes: taxCodesRouter,
  paymentAccounts: paymentAccountsRouter,
  preEntries: preEntriesRouter,
});
