import { z } from "zod";
import { eq, and, desc, sql, isNull, gte, lte, like } from "drizzle-orm";
import { router, erpPermissionProcedure } from "../_core/trpc";
import { getDb, createAuditEvent } from "../db";
import {
  erpAccountingJournals,
  erpAccountingEntries,
  erpAccountingEntryLines,
  erpAccountingAccounts,
  erpBankReconciliations,
  erpBankReconciliationLines,
  erpAnalyticAxes,
  erpAnalyticAllocations,
  erpAccountingThirdParties,
  erpPaymentAccounts,
} from "../../drizzle/schema";

// ============================================================
// ERP FULL ACCOUNTING ROUTER — Comptabilité Générale
// Journaux, Écritures, Grand Livre, Balance, Rapprochement, Analytique, Tiers
// ============================================================

function generateEntryNumber(prefix: string): string {
  const d = new Date();
  const y = d.getFullYear().toString().slice(-2);
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const rand = Math.floor(Math.random() * 90000 + 10000);
  return `${prefix}-${y}${m}-${rand}`;
}

// --- Journals Router ---
const journalsRouter = router({
  list: erpPermissionProcedure("erp_accounting", "view")
    .input(z.object({ journalType: z.string().optional(), isActive: z.boolean().optional() }))
    .query(async ({ input }) => {
      const db = (await getDb())!;
      const conditions: any[] = [];
      if (input.journalType) conditions.push(eq(erpAccountingJournals.journalType, input.journalType));
      if (input.isActive !== undefined) conditions.push(eq(erpAccountingJournals.isActive, input.isActive));
      const where = conditions.length > 0 ? and(...conditions) : undefined;
      return db.select().from(erpAccountingJournals).where(where).orderBy(erpAccountingJournals.journalCode);
    }),

  create: erpPermissionProcedure("erp_accounting", "create")
    .input(z.object({ journalCode: z.string().min(1).max(16), journalName: z.string().min(1), journalType: z.string(), description: z.string().optional() }))
    .mutation(async ({ input, ctx }) => {
      const db = (await getDb())!;
      const now = Date.now();
      const [result] = await db.insert(erpAccountingJournals).values({ ...input, isActive: true, createdAt: now, updatedAt: now });
      return { id: result.insertId };
    }),

  update: erpPermissionProcedure("erp_accounting", "update")
    .input(z.object({ id: z.number(), journalName: z.string().optional(), description: z.string().optional(), isActive: z.boolean().optional() }))
    .mutation(async ({ input }) => {
      const db = (await getDb())!;
      const { id, ...data } = input;
      await db.update(erpAccountingJournals).set({ ...data, updatedAt: Date.now() }).where(eq(erpAccountingJournals.id, id));
      return { success: true };
    }),
});

// --- Entries Router ---
const entriesRouter = router({
  list: erpPermissionProcedure("erp_accounting", "view")
    .input(z.object({ journalId: z.number().optional(), status: z.string().optional(), startDate: z.number().optional(), endDate: z.number().optional(), limit: z.number().min(1).max(100).default(50), offset: z.number().min(0).default(0) }))
    .query(async ({ input }) => {
      const db = (await getDb())!;
      const conditions = [isNull(erpAccountingEntries.deletedAt)];
      if (input.journalId) conditions.push(eq(erpAccountingEntries.journalId, input.journalId));
      if (input.status) conditions.push(eq(erpAccountingEntries.status, input.status));
      if (input.startDate) conditions.push(gte(erpAccountingEntries.entryDate, input.startDate));
      if (input.endDate) conditions.push(lte(erpAccountingEntries.entryDate, input.endDate));
      const entries = await db.select().from(erpAccountingEntries).where(and(...conditions)).orderBy(desc(erpAccountingEntries.entryDate)).limit(input.limit).offset(input.offset);
      const [{ count }] = await db.select({ count: sql<number>`count(*)` }).from(erpAccountingEntries).where(and(...conditions));
      return { entries, total: count };
    }),

  getById: erpPermissionProcedure("erp_accounting", "view")
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = (await getDb())!;
      const [entry] = await db.select().from(erpAccountingEntries).where(eq(erpAccountingEntries.id, input.id));
      if (!entry) throw new Error("Écriture non trouvée");
      const lines = await db.select().from(erpAccountingEntryLines).where(eq(erpAccountingEntryLines.entryId, input.id)).orderBy(erpAccountingEntryLines.lineNumber);
      return { ...entry, lines };
    }),

  create: erpPermissionProcedure("erp_accounting", "create")
    .input(z.object({ journalId: z.number(), fiscalYearId: z.number(), periodId: z.number(), entryDate: z.number(), description: z.string().optional(), reference: z.string().optional(), lines: z.array(z.object({ accountingAccountId: z.number(), debitAmount: z.number().default(0), creditAmount: z.number().default(0), label: z.string().optional(), projectId: z.number().optional(), vendorId: z.number().optional(), customerId: z.number().optional(), taxCodeId: z.number().optional(), analyticAxisId: z.number().optional() })).min(2) }))
    .mutation(async ({ input, ctx }) => {
      const db = (await getDb())!;
      const now = Date.now();
      const { lines, ...entryData } = input;
      const totalDebit = lines.reduce((s, l) => s + l.debitAmount, 0);
      const totalCredit = lines.reduce((s, l) => s + l.creditAmount, 0);
      if (totalDebit !== totalCredit) throw new Error("L'écriture n'est pas équilibrée (débit ≠ crédit)");
      const entryNumber = generateEntryNumber("EC");
      const [result] = await db.insert(erpAccountingEntries).values({ ...entryData, entryNumber, totalDebit, totalCredit, status: "draft", createdBy: ctx.user.id, createdAt: now, updatedAt: now });
      const entryId = result.insertId;
      for (let i = 0; i < lines.length; i++) {
        await db.insert(erpAccountingEntryLines).values({ entryId, lineNumber: i + 1, ...lines[i], createdAt: now, updatedAt: now });
      }
      await createAuditEvent({ actorId: ctx.user.id, action: "accounting.entry.created", targetType: "accounting_entry", targetId: entryId, details: { entryNumber, totalDebit } });
      return { id: entryId, entryNumber };
    }),

  post: erpPermissionProcedure("erp_accounting", "update")
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = (await getDb())!;
      const now = Date.now();
      const [entry] = await db.select().from(erpAccountingEntries).where(eq(erpAccountingEntries.id, input.id));
      if (!entry) throw new Error("Écriture non trouvée");
      if (entry.status !== "draft") throw new Error("Seule une écriture brouillon peut être validée");
      await db.update(erpAccountingEntries).set({ status: "posted", postedBy: ctx.user.id, postedAt: now, postingDate: now, updatedAt: now }).where(eq(erpAccountingEntries.id, input.id));
      return { success: true };
    }),

  reverse: erpPermissionProcedure("erp_accounting", "update")
    .input(z.object({ id: z.number(), reason: z.string().optional() }))
    .mutation(async ({ input, ctx }) => {
      const db = (await getDb())!;
      const now = Date.now();
      const [entry] = await db.select().from(erpAccountingEntries).where(eq(erpAccountingEntries.id, input.id));
      if (!entry) throw new Error("Écriture non trouvée");
      if (entry.status !== "posted") throw new Error("Seule une écriture validée peut être extournée");
      // Create reverse entry
      const reverseNumber = generateEntryNumber("EXT");
      const [reverseResult] = await db.insert(erpAccountingEntries).values({ entryNumber: reverseNumber, journalId: entry.journalId, fiscalYearId: entry.fiscalYearId, periodId: entry.periodId, entryDate: now, description: `Extourne de ${entry.entryNumber}: ${input.reason || ""}`, reference: entry.entryNumber, status: "posted", totalDebit: entry.totalCredit, totalCredit: entry.totalDebit, createdBy: ctx.user.id, postedBy: ctx.user.id, postedAt: now, postingDate: now, createdAt: now, updatedAt: now });
      // Reverse lines
      const lines = await db.select().from(erpAccountingEntryLines).where(eq(erpAccountingEntryLines.entryId, input.id));
      for (let i = 0; i < lines.length; i++) {
        await db.insert(erpAccountingEntryLines).values({ entryId: reverseResult.insertId, lineNumber: i + 1, accountingAccountId: lines[i].accountingAccountId, debitAmount: lines[i].creditAmount, creditAmount: lines[i].debitAmount, label: `Extourne: ${lines[i].label || ""}`, projectId: lines[i].projectId, vendorId: lines[i].vendorId, customerId: lines[i].customerId, taxCodeId: lines[i].taxCodeId, analyticAxisId: lines[i].analyticAxisId, createdAt: now, updatedAt: now });
      }
      await db.update(erpAccountingEntries).set({ status: "reversed", reversedBy: ctx.user.id, reversedAt: now, updatedAt: now }).where(eq(erpAccountingEntries.id, input.id));
      return { success: true, reverseEntryId: reverseResult.insertId };
    }),
});

// --- Grand Livre & Balance Router ---
const reportsRouter = router({
  grandLivre: erpPermissionProcedure("erp_accounting", "view")
    .input(z.object({ accountId: z.number().optional(), startDate: z.number().optional(), endDate: z.number().optional() }))
    .query(async ({ input }) => {
      const db = (await getDb())!;
      const conditions = [eq(erpAccountingEntries.status, "posted"), isNull(erpAccountingEntries.deletedAt)];
      if (input.startDate) conditions.push(gte(erpAccountingEntries.entryDate, input.startDate));
      if (input.endDate) conditions.push(lte(erpAccountingEntries.entryDate, input.endDate));
      const entries = await db.select().from(erpAccountingEntries).where(and(...conditions)).orderBy(erpAccountingEntries.entryDate);
      const entryIds = entries.map(e => e.id);
      if (entryIds.length === 0) return { accounts: [] };
      // Get all lines for these entries
      const allLines = await db.select().from(erpAccountingEntryLines).where(sql`${erpAccountingEntryLines.entryId} IN (${sql.raw(entryIds.join(","))})`);
      // Group by account
      const accountMap = new Map<number, { accountId: number; totalDebit: number; totalCredit: number; lines: any[] }>();
      for (const line of allLines) {
        if (input.accountId && line.accountingAccountId !== input.accountId) continue;
        if (!accountMap.has(line.accountingAccountId)) {
          accountMap.set(line.accountingAccountId, { accountId: line.accountingAccountId, totalDebit: 0, totalCredit: 0, lines: [] });
        }
        const acc = accountMap.get(line.accountingAccountId)!;
        acc.totalDebit += line.debitAmount || 0;
        acc.totalCredit += line.creditAmount || 0;
        const entry = entries.find(e => e.id === line.entryId);
        acc.lines.push({ ...line, entryNumber: entry?.entryNumber, entryDate: entry?.entryDate, journalId: entry?.journalId });
      }
      return { accounts: Array.from(accountMap.values()) };
    }),

  balance: erpPermissionProcedure("erp_accounting", "view")
    .input(z.object({ startDate: z.number().optional(), endDate: z.number().optional() }))
    .query(async ({ input }) => {
      const db = (await getDb())!;
      const conditions = [eq(erpAccountingEntries.status, "posted"), isNull(erpAccountingEntries.deletedAt)];
      if (input.startDate) conditions.push(gte(erpAccountingEntries.entryDate, input.startDate));
      if (input.endDate) conditions.push(lte(erpAccountingEntries.entryDate, input.endDate));
      const entries = await db.select().from(erpAccountingEntries).where(and(...conditions));
      const entryIds = entries.map(e => e.id);
      if (entryIds.length === 0) return { balances: [], totalDebit: 0, totalCredit: 0 };
      const allLines = await db.select().from(erpAccountingEntryLines).where(sql`${erpAccountingEntryLines.entryId} IN (${sql.raw(entryIds.join(","))})`);
      const accounts = await db.select().from(erpAccountingAccounts).where(eq(erpAccountingAccounts.isActive, true));
      const accountMap = new Map(accounts.map(a => [a.id, a]));
      const balanceMap = new Map<number, { debit: number; credit: number }>();
      for (const line of allLines) {
        if (!balanceMap.has(line.accountingAccountId)) balanceMap.set(line.accountingAccountId, { debit: 0, credit: 0 });
        const b = balanceMap.get(line.accountingAccountId)!;
        b.debit += line.debitAmount || 0;
        b.credit += line.creditAmount || 0;
      }
      const balances = Array.from(balanceMap.entries()).map(([accountId, { debit, credit }]) => {
        const account = accountMap.get(accountId);
        return { accountId, accountCode: account?.accountCode || "", accountName: account?.accountName || "", debit, credit, balance: debit - credit };
      }).sort((a, b) => a.accountCode.localeCompare(b.accountCode));
      const totalDebit = balances.reduce((s, b) => s + b.debit, 0);
      const totalCredit = balances.reduce((s, b) => s + b.credit, 0);
      return { balances, totalDebit, totalCredit };
    }),

  stats: erpPermissionProcedure("erp_accounting", "view")
    .query(async () => {
      const db = (await getDb())!;
      const [{ totalEntries }] = await db.select({ totalEntries: sql<number>`count(*)` }).from(erpAccountingEntries).where(isNull(erpAccountingEntries.deletedAt));
      const [{ postedEntries }] = await db.select({ postedEntries: sql<number>`count(*)` }).from(erpAccountingEntries).where(and(eq(erpAccountingEntries.status, "posted"), isNull(erpAccountingEntries.deletedAt)));
      const [{ draftEntries }] = await db.select({ draftEntries: sql<number>`count(*)` }).from(erpAccountingEntries).where(and(eq(erpAccountingEntries.status, "draft"), isNull(erpAccountingEntries.deletedAt)));
      const journals = await db.select().from(erpAccountingJournals).where(eq(erpAccountingJournals.isActive, true));
      const accounts = await db.select().from(erpAccountingAccounts).where(eq(erpAccountingAccounts.isActive, true));
      return { totalEntries, postedEntries, draftEntries, totalJournals: journals.length, totalAccounts: accounts.length };
    }),
});

// --- Bank Reconciliation Router ---
const reconciliationRouter = router({
  list: erpPermissionProcedure("erp_accounting", "view")
    .input(z.object({ paymentAccountId: z.number().optional(), status: z.string().optional(), limit: z.number().min(1).max(100).default(50), offset: z.number().min(0).default(0) }))
    .query(async ({ input }) => {
      const db = (await getDb())!;
      const conditions: any[] = [];
      if (input.paymentAccountId) conditions.push(eq(erpBankReconciliations.paymentAccountId, input.paymentAccountId));
      if (input.status) conditions.push(eq(erpBankReconciliations.status, input.status));
      const where = conditions.length > 0 ? and(...conditions) : undefined;
      const reconciliations = await db.select().from(erpBankReconciliations).where(where).orderBy(desc(erpBankReconciliations.statementDate)).limit(input.limit).offset(input.offset);
      const [{ count }] = await db.select({ count: sql<number>`count(*)` }).from(erpBankReconciliations).where(where);
      return { reconciliations, total: count };
    }),

  create: erpPermissionProcedure("erp_accounting", "create")
    .input(z.object({ paymentAccountId: z.number(), periodId: z.number().optional(), statementDate: z.number(), openingBalance: z.number(), closingBalance: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = (await getDb())!;
      const now = Date.now();
      const [result] = await db.insert(erpBankReconciliations).values({ ...input, status: "draft", createdBy: ctx.user.id, createdAt: now, updatedAt: now });
      return { id: result.insertId };
    }),

  addLine: erpPermissionProcedure("erp_accounting", "create")
    .input(z.object({ reconciliationId: z.number(), paymentId: z.number().optional(), accountingEntryId: z.number().optional(), transactionDate: z.number(), description: z.string().optional(), amount: z.number() }))
    .mutation(async ({ input }) => {
      const db = (await getDb())!;
      const now = Date.now();
      const [result] = await db.insert(erpBankReconciliationLines).values({ ...input, matched: false, createdAt: now, updatedAt: now });
      return { id: result.insertId };
    }),

  matchLine: erpPermissionProcedure("erp_accounting", "update")
    .input(z.object({ lineId: z.number(), matchReference: z.string() }))
    .mutation(async ({ input }) => {
      const db = (await getDb())!;
      await db.update(erpBankReconciliationLines).set({ matched: true, matchReference: input.matchReference, updatedAt: Date.now() }).where(eq(erpBankReconciliationLines.id, input.lineId));
      return { success: true };
    }),

  validate: erpPermissionProcedure("erp_accounting", "update")
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = (await getDb())!;
      const now = Date.now();
      await db.update(erpBankReconciliations).set({ status: "validated", validatedBy: ctx.user.id, validatedAt: now, updatedAt: now }).where(eq(erpBankReconciliations.id, input.id));
      return { success: true };
    }),
});

// --- Analytic Axes Router ---
const analyticRouter = router({
  listAxes: erpPermissionProcedure("erp_accounting", "view")
    .input(z.object({ axisType: z.string().optional() }))
    .query(async ({ input }) => {
      const db = (await getDb())!;
      const conditions: any[] = [eq(erpAnalyticAxes.isActive, true)];
      if (input.axisType) conditions.push(eq(erpAnalyticAxes.axisType, input.axisType));
      return db.select().from(erpAnalyticAxes).where(and(...conditions)).orderBy(erpAnalyticAxes.code);
    }),

  createAxis: erpPermissionProcedure("erp_accounting", "create")
    .input(z.object({ code: z.string().min(1), name: z.string().min(1), axisType: z.string(), description: z.string().optional() }))
    .mutation(async ({ input }) => {
      const db = (await getDb())!;
      const now = Date.now();
      const [result] = await db.insert(erpAnalyticAxes).values({ ...input, isActive: true, createdAt: now, updatedAt: now });
      return { id: result.insertId };
    }),

  listAllocations: erpPermissionProcedure("erp_accounting", "view")
    .input(z.object({ entryLineId: z.number().optional(), analyticAxisId: z.number().optional() }))
    .query(async ({ input }) => {
      const db = (await getDb())!;
      const conditions: any[] = [];
      if (input.entryLineId) conditions.push(eq(erpAnalyticAllocations.sourceId, input.entryLineId));
      if (input.analyticAxisId) conditions.push(eq(erpAnalyticAllocations.analyticAxisId, input.analyticAxisId));
      const where = conditions.length > 0 ? and(...conditions) : undefined;
      return db.select().from(erpAnalyticAllocations).where(where);
    }),
});

// --- Third Parties Router ---
const thirdPartiesRouter = router({
  list: erpPermissionProcedure("erp_accounting", "view")
    .input(z.object({ thirdPartyType: z.string().optional(), status: z.string().optional(), search: z.string().optional(), limit: z.number().min(1).max(100).default(50), offset: z.number().min(0).default(0) }))
    .query(async ({ input }) => {
      const db = (await getDb())!;
      const conditions: any[] = [];
      if (input.thirdPartyType) conditions.push(eq(erpAccountingThirdParties.thirdPartyType, input.thirdPartyType));
      if (input.status) conditions.push(eq(erpAccountingThirdParties.status, input.status));
      if (input.search) conditions.push(like(erpAccountingThirdParties.name, `%${input.search}%`));
      const where = conditions.length > 0 ? and(...conditions) : undefined;
      const parties = await db.select().from(erpAccountingThirdParties).where(where).orderBy(erpAccountingThirdParties.thirdPartyCode).limit(input.limit).offset(input.offset);
      const [{ count }] = await db.select({ count: sql<number>`count(*)` }).from(erpAccountingThirdParties).where(where);
      return { parties, total: count };
    }),

  create: erpPermissionProcedure("erp_accounting", "create")
    .input(z.object({ thirdPartyType: z.string(), thirdPartyCode: z.string().min(1), name: z.string().min(1), accountingAccountId: z.number().optional(), customerId: z.number().optional(), vendorId: z.number().optional(), contractorId: z.number().optional(), taxIdentificationNumber: z.string().optional() }))
    .mutation(async ({ input }) => {
      const db = (await getDb())!;
      const now = Date.now();
      const [result] = await db.insert(erpAccountingThirdParties).values({ ...input, status: "active", createdAt: now, updatedAt: now });
      return { id: result.insertId };
    }),

  update: erpPermissionProcedure("erp_accounting", "update")
    .input(z.object({ id: z.number(), name: z.string().optional(), accountingAccountId: z.number().optional(), taxIdentificationNumber: z.string().optional(), status: z.string().optional() }))
    .mutation(async ({ input }) => {
      const db = (await getDb())!;
      const { id, ...data } = input;
      await db.update(erpAccountingThirdParties).set({ ...data, updatedAt: Date.now() }).where(eq(erpAccountingThirdParties.id, id));
      return { success: true };
    }),
});

// === COMBINED FULL ACCOUNTING ROUTER ===
export const fullAccountingRouter = router({
  journals: journalsRouter,
  entries: entriesRouter,
  reports: reportsRouter,
  reconciliation: reconciliationRouter,
  analytic: analyticRouter,
  thirdParties: thirdPartiesRouter,
});
