import { z } from "zod";
import { eq, and, desc, sql, isNull } from "drizzle-orm";
import { router, erpPermissionProcedure } from "../_core/trpc";
import { getDb, createAuditEvent } from "../db";
import {
  erpBudgetsV2,
  erpBudgetVersions,
  erpBudgetPeriods,
  erpBudgetCategories,
  erpBudgetLinesV2,
  erpBudgetLineAmounts,
  erpBudgetPlSnapshots,
  erpBudgetCashflowSnapshots,
  erpBudgetAlerts,
} from "../../drizzle/schema";

const now = () => Date.now();
const getDatabase = async () => (await getDb())!;

// ============================================================
// Budget CRUD Router
// ============================================================
const budgetCrudRouter = router({
  list: erpPermissionProcedure("erp_finance", "view").input(z.object({
    fiscalYear: z.number().optional(),
    status: z.string().optional(),
    page: z.number().default(1),
    limit: z.number().default(20),
  })).query(async ({ input }) => {
    const db = await getDatabase();
    const conditions: any[] = [isNull(erpBudgetsV2.deletedAt)];
    if (input.fiscalYear) conditions.push(eq(erpBudgetsV2.fiscalYear, input.fiscalYear));
    if (input.status) conditions.push(eq(erpBudgetsV2.status, input.status as any));
    const where = and(...conditions);
    const offset = (input.page - 1) * input.limit;
    const [items, countResult] = await Promise.all([
      db.select().from(erpBudgetsV2).where(where).orderBy(desc(erpBudgetsV2.createdAt)).limit(input.limit).offset(offset),
      db.select({ count: sql<number>`COUNT(*)` }).from(erpBudgetsV2).where(where),
    ]);
    return { budgets: items, total: countResult[0].count };
  }),

  getById: erpPermissionProcedure("erp_finance", "view").input(z.object({ id: z.number() })).query(async ({ input }) => {
    const db = await getDatabase();
    const [budget] = await db.select().from(erpBudgetsV2).where(eq(erpBudgetsV2.id, input.id)).limit(1);
    if (!budget) return null;
    const versions = await db.select().from(erpBudgetVersions).where(eq(erpBudgetVersions.budgetId, input.id)).orderBy(desc(erpBudgetVersions.versionNumber));
    const periods = await db.select().from(erpBudgetPeriods).where(eq(erpBudgetPeriods.budgetId, input.id)).orderBy(erpBudgetPeriods.periodNumber);
    return { ...budget, versions, periods };
  }),

  create: erpPermissionProcedure("erp_finance", "view").input(z.object({
    budgetCode: z.string().min(1),
    name: z.string().min(1),
    description: z.string().optional(),
    fiscalYear: z.number().min(2020).max(2050),
    scenarioType: z.enum(["initial_budget", "revised_budget", "forecast", "optimistic", "pessimistic", "actualized"]).default("initial_budget"),
    currency: z.string().default("XOF"),
  })).mutation(async ({ ctx, input }) => {
    const db = await getDatabase();
    const result = await db.insert(erpBudgetsV2).values({
      budgetCode: input.budgetCode,
      name: input.name,
      description: input.description || null,
      fiscalYear: input.fiscalYear,
      currency: input.currency,
      scenarioType: input.scenarioType,
      status: "draft",
      createdBy: ctx.user.id,
      createdAt: now(),
      updatedAt: now(),
    });
    const budgetId = result[0].insertId;

    // Create default version
    await db.insert(erpBudgetVersions).values({
      budgetId,
      versionNumber: 1,
      versionName: "Version initiale",
      status: "active",
      createdBy: ctx.user.id,
      createdAt: now(),
      updatedAt: now(),
    });

    // Create 12 monthly periods
    const months = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"];
    for (let i = 0; i < 12; i++) {
      await db.insert(erpBudgetPeriods).values({
        budgetId,
        fiscalYear: input.fiscalYear,
        periodNumber: i + 1,
        periodMonth: i + 1,
        periodLabel: months[i],
        status: "open",
        createdAt: now(),
        updatedAt: now(),
      });
    }

    await createAuditEvent({ actorId: ctx.user.id, action: "erp.budget_v2.create", details: { budgetId, name: input.name, fiscalYear: input.fiscalYear } });
    return { id: budgetId };
  }),

  update: erpPermissionProcedure("erp_finance", "view").input(z.object({
    id: z.number(),
    name: z.string().optional(),
    description: z.string().optional(),
    scenarioType: z.enum(["initial_budget", "revised_budget", "forecast", "optimistic", "pessimistic", "actualized"]).optional(),
  })).mutation(async ({ ctx, input }) => {
    const db = await getDatabase();
    const [budget] = await db.select().from(erpBudgetsV2).where(eq(erpBudgetsV2.id, input.id)).limit(1);
    if (!budget) throw new Error("Budget introuvable");
    if (budget.status === "locked") throw new Error("Budget verrouillé, impossible de modifier");
    if (budget.status === "approved") throw new Error("Budget approuvé, créez une nouvelle version pour modifier");

    const updates: any = { updatedAt: now() };
    if (input.name) updates.name = input.name;
    if (input.description !== undefined) updates.description = input.description;
    if (input.scenarioType) updates.scenarioType = input.scenarioType;
    await db.update(erpBudgetsV2).set(updates).where(eq(erpBudgetsV2.id, input.id));
    await createAuditEvent({ actorId: ctx.user.id, action: "erp.budget_v2.update", details: { budgetId: input.id } });
    return { success: true };
  }),

  submit: erpPermissionProcedure("erp_finance", "view").input(z.object({ id: z.number() })).mutation(async ({ ctx, input }) => {
    const db = await getDatabase();
    const [budget] = await db.select().from(erpBudgetsV2).where(eq(erpBudgetsV2.id, input.id)).limit(1);
    if (!budget) throw new Error("Budget introuvable");
    if (budget.status !== "draft" && budget.status !== "imported") throw new Error("Seul un budget brouillon ou importé peut être soumis");
    await db.update(erpBudgetsV2).set({ status: "under_review", updatedAt: now() }).where(eq(erpBudgetsV2.id, input.id));
    await createAuditEvent({ actorId: ctx.user.id, action: "erp.budget_v2.submit", details: { budgetId: input.id } });
    return { success: true };
  }),

  approve: erpPermissionProcedure("erp_finance", "view").input(z.object({ id: z.number() })).mutation(async ({ ctx, input }) => {
    const db = await getDatabase();
    const [budget] = await db.select().from(erpBudgetsV2).where(eq(erpBudgetsV2.id, input.id)).limit(1);
    if (!budget) throw new Error("Budget introuvable");
    if (budget.status !== "under_review") throw new Error("Seul un budget en revue peut être approuvé");
    await db.update(erpBudgetsV2).set({ status: "approved", approvedBy: ctx.user.id, approvedAt: now(), updatedAt: now() }).where(eq(erpBudgetsV2.id, input.id));
    await createAuditEvent({ actorId: ctx.user.id, action: "erp.budget_v2.approve", details: { budgetId: input.id } });
    return { success: true };
  }),

  lock: erpPermissionProcedure("erp_finance", "view").input(z.object({ id: z.number() })).mutation(async ({ ctx, input }) => {
    const db = await getDatabase();
    const [budget] = await db.select().from(erpBudgetsV2).where(eq(erpBudgetsV2.id, input.id)).limit(1);
    if (!budget) throw new Error("Budget introuvable");
    if (budget.status !== "approved") throw new Error("Seul un budget approuvé peut être verrouillé");
    await db.update(erpBudgetsV2).set({ status: "locked", lockedBy: ctx.user.id, lockedAt: now(), updatedAt: now() }).where(eq(erpBudgetsV2.id, input.id));
    await createAuditEvent({ actorId: ctx.user.id, action: "erp.budget_v2.lock", details: { budgetId: input.id } });
    return { success: true };
  }),

  revise: erpPermissionProcedure("erp_finance", "view").input(z.object({ id: z.number(), versionName: z.string().optional() })).mutation(async ({ ctx, input }) => {
    const db = await getDatabase();
    const [budget] = await db.select().from(erpBudgetsV2).where(eq(erpBudgetsV2.id, input.id)).limit(1);
    if (!budget) throw new Error("Budget introuvable");
    if (budget.status !== "approved" && budget.status !== "locked") throw new Error("Seul un budget approuvé ou verrouillé peut être révisé");

    // Archive current active version
    const versions = await db.select().from(erpBudgetVersions).where(and(eq(erpBudgetVersions.budgetId, input.id), eq(erpBudgetVersions.status, "active")));
    if (versions.length > 0) {
      await db.update(erpBudgetVersions).set({ status: "archived", updatedAt: now() }).where(eq(erpBudgetVersions.id, versions[0].id));
    }

    // Create new version
    const maxVersion = versions.length > 0 ? versions[0].versionNumber : 1;
    await db.insert(erpBudgetVersions).values({
      budgetId: input.id,
      versionNumber: maxVersion + 1,
      versionName: input.versionName || `Révision ${maxVersion + 1}`,
      status: "active",
      createdBy: ctx.user.id,
      createdAt: now(),
      updatedAt: now(),
    });

    await db.update(erpBudgetsV2).set({ status: "revised", updatedAt: now() }).where(eq(erpBudgetsV2.id, input.id));
    await createAuditEvent({ actorId: ctx.user.id, action: "erp.budget_v2.revise", details: { budgetId: input.id } });
    return { success: true };
  }),

  delete: erpPermissionProcedure("erp_finance", "view").input(z.object({ id: z.number() })).mutation(async ({ ctx, input }) => {
    const db = await getDatabase();
    const [budget] = await db.select().from(erpBudgetsV2).where(eq(erpBudgetsV2.id, input.id)).limit(1);
    if (!budget) throw new Error("Budget introuvable");
    if (budget.status === "locked") throw new Error("Impossible de supprimer un budget verrouillé");
    await db.update(erpBudgetsV2).set({ deletedAt: now(), updatedAt: now() }).where(eq(erpBudgetsV2.id, input.id));
    await createAuditEvent({ actorId: ctx.user.id, action: "erp.budget_v2.delete", details: { budgetId: input.id } });
    return { success: true };
  }),
});

// ============================================================
// Categories Router
// ============================================================
const categoriesRouter = router({
  list: erpPermissionProcedure("erp_finance", "view").input(z.object({ budgetId: z.number() })).query(async ({ input }) => {
    const db = await getDatabase();
    return db.select().from(erpBudgetCategories)
      .where(and(eq(erpBudgetCategories.budgetId, input.budgetId), isNull(erpBudgetCategories.deletedAt)))
      .orderBy(erpBudgetCategories.sortOrder);
  }),

  create: erpPermissionProcedure("erp_finance", "view").input(z.object({
    budgetId: z.number(),
    parentId: z.number().nullable().optional(),
    code: z.string().min(1),
    name: z.string().min(1),
    categoryType: z.enum(["REVENUE", "OPEX", "CAPEX", "TAX", "PAYROLL", "DIRECT_COST", "INDIRECT_COST", "FINANCIAL_RESULT", "EXCEPTIONAL_RESULT", "CASHFLOW", "OTHER"]),
    sourceSheet: z.string().optional(),
    sortOrder: z.number().default(0),
    isTotalLine: z.number().default(0),
  })).mutation(async ({ input }) => {
    const db = await getDatabase();
    const result = await db.insert(erpBudgetCategories).values({
      budgetId: input.budgetId,
      parentId: input.parentId || null,
      code: input.code,
      name: input.name,
      categoryType: input.categoryType,
      sourceSheet: input.sourceSheet || null,
      sortOrder: input.sortOrder,
      isTotalLine: input.isTotalLine,
      createdAt: now(),
      updatedAt: now(),
    });
    return { id: result[0].insertId };
  }),

  update: erpPermissionProcedure("erp_finance", "view").input(z.object({
    id: z.number(),
    name: z.string().optional(),
    code: z.string().optional(),
    sortOrder: z.number().optional(),
  })).mutation(async ({ input }) => {
    const db = await getDatabase();
    const updates: any = { updatedAt: now() };
    if (input.name) updates.name = input.name;
    if (input.code) updates.code = input.code;
    if (input.sortOrder !== undefined) updates.sortOrder = input.sortOrder;
    await db.update(erpBudgetCategories).set(updates).where(eq(erpBudgetCategories.id, input.id));
    return { success: true };
  }),

  delete: erpPermissionProcedure("erp_finance", "view").input(z.object({ id: z.number() })).mutation(async ({ input }) => {
    const db = await getDatabase();
    await db.update(erpBudgetCategories).set({ deletedAt: now(), updatedAt: now() }).where(eq(erpBudgetCategories.id, input.id));
    return { success: true };
  }),
});

// ============================================================
// Lines Router
// ============================================================
const linesRouter = router({
  list: erpPermissionProcedure("erp_finance", "view").input(z.object({
    budgetId: z.number(),
    categoryId: z.number().optional(),
    lineType: z.string().optional(),
    sourceSheet: z.string().optional(),
  })).query(async ({ input }) => {
    const db = await getDatabase();
    const conditions: any[] = [eq(erpBudgetLinesV2.budgetId, input.budgetId), isNull(erpBudgetLinesV2.deletedAt)];
    if (input.categoryId) conditions.push(eq(erpBudgetLinesV2.categoryId, input.categoryId));
    if (input.lineType) conditions.push(eq(erpBudgetLinesV2.lineType, input.lineType as any));
    if (input.sourceSheet) conditions.push(eq(erpBudgetLinesV2.sourceSheet, input.sourceSheet));
    return db.select().from(erpBudgetLinesV2).where(and(...conditions)).orderBy(erpBudgetLinesV2.sortOrder);
  }),

  create: erpPermissionProcedure("erp_finance", "view").input(z.object({
    budgetId: z.number(),
    categoryId: z.number(),
    lineLabel: z.string().min(1),
    lineType: z.enum(["REVENUE", "DIRECT_COST", "INDIRECT_COST", "OPEX", "CAPEX", "TAX", "PAYROLL", "SOCIAL_CHARGES", "CASH_IN", "CASH_OUT", "RESULT", "KPI", "TOTAL"]),
    lineCode: z.string().optional(),
    sourceSheet: z.string().optional(),
    comments: z.string().optional(),
    sortOrder: z.number().default(0),
    monthlyAmounts: z.array(z.object({ month: z.number().min(1).max(12), amount: z.number() })).optional(),
  })).mutation(async ({ input }) => {
    const db = await getDatabase();
    const result = await db.insert(erpBudgetLinesV2).values({
      budgetId: input.budgetId,
      categoryId: input.categoryId,
      lineLabel: input.lineLabel,
      lineType: input.lineType,
      lineCode: input.lineCode || null,
      sourceSheet: input.sourceSheet || null,
      comments: input.comments || null,
      sortOrder: input.sortOrder,
      createdAt: now(),
      updatedAt: now(),
    });
    const lineId = result[0].insertId;

    // Create monthly amounts if provided
    if (input.monthlyAmounts && input.monthlyAmounts.length > 0) {
      for (const ma of input.monthlyAmounts) {
        await db.insert(erpBudgetLineAmounts).values({
          budgetLineId: lineId,
          monthNumber: ma.month,
          plannedAmount: ma.amount,
          createdAt: now(),
          updatedAt: now(),
        });
      }
    }
    return { id: lineId };
  }),

  update: erpPermissionProcedure("erp_finance", "view").input(z.object({
    id: z.number(),
    lineLabel: z.string().optional(),
    comments: z.string().optional(),
    sortOrder: z.number().optional(),
  })).mutation(async ({ input }) => {
    const db = await getDatabase();
    const updates: any = { updatedAt: now() };
    if (input.lineLabel) updates.lineLabel = input.lineLabel;
    if (input.comments !== undefined) updates.comments = input.comments;
    if (input.sortOrder !== undefined) updates.sortOrder = input.sortOrder;
    await db.update(erpBudgetLinesV2).set(updates).where(eq(erpBudgetLinesV2.id, input.id));
    return { success: true };
  }),

  delete: erpPermissionProcedure("erp_finance", "view").input(z.object({ id: z.number() })).mutation(async ({ input }) => {
    const db = await getDatabase();
    await db.update(erpBudgetLinesV2).set({ deletedAt: now(), updatedAt: now() }).where(eq(erpBudgetLinesV2.id, input.id));
    return { success: true };
  }),

  getAmounts: erpPermissionProcedure("erp_finance", "view").input(z.object({ lineId: z.number() })).query(async ({ input }) => {
    const db = await getDatabase();
    return db.select().from(erpBudgetLineAmounts).where(eq(erpBudgetLineAmounts.budgetLineId, input.lineId)).orderBy(erpBudgetLineAmounts.monthNumber);
  }),

  updateAmount: erpPermissionProcedure("erp_finance", "view").input(z.object({
    id: z.number(),
    plannedAmount: z.number().optional(),
    actualAmount: z.number().optional(),
    committedAmount: z.number().optional(),
  })).mutation(async ({ input }) => {
    const db = await getDatabase();
    const updates: any = { updatedAt: now() };
    if (input.plannedAmount !== undefined) updates.plannedAmount = input.plannedAmount;
    if (input.actualAmount !== undefined) {
      updates.actualAmount = input.actualAmount;
      // Recalculate variance
      const [amt] = await db.select().from(erpBudgetLineAmounts).where(eq(erpBudgetLineAmounts.id, input.id)).limit(1);
      if (amt) {
        const planned = input.plannedAmount !== undefined ? input.plannedAmount : amt.plannedAmount;
        const actual = input.actualAmount;
        updates.varianceAmount = actual - planned;
        updates.variancePercentage = planned !== 0 ? Math.round(((actual - planned) / planned) * 100) : 0;
        updates.executionRate = planned !== 0 ? Math.round((actual / planned) * 100) : 0;
      }
    }
    if (input.committedAmount !== undefined) updates.committedAmount = input.committedAmount;
    await db.update(erpBudgetLineAmounts).set(updates).where(eq(erpBudgetLineAmounts.id, input.id));
    return { success: true };
  }),
});

// ============================================================
// P&L Router
// ============================================================
const plRouter = router({
  get: erpPermissionProcedure("erp_finance", "view").input(z.object({ budgetId: z.number() })).query(async ({ input }) => {
    const db = await getDatabase();
    return db.select().from(erpBudgetPlSnapshots).where(eq(erpBudgetPlSnapshots.budgetId, input.budgetId)).orderBy(erpBudgetPlSnapshots.monthNumber);
  }),

  recalculate: erpPermissionProcedure("erp_finance", "view").input(z.object({ budgetId: z.number() })).mutation(async ({ input }) => {
    const db = await getDatabase();
    // Get all lines with amounts for this budget
    const lines = await db.select().from(erpBudgetLinesV2).where(and(eq(erpBudgetLinesV2.budgetId, input.budgetId), isNull(erpBudgetLinesV2.deletedAt)));
    const lineIds = lines.map(l => l.id);
    if (lineIds.length === 0) return { success: true, message: "Aucune ligne budgétaire" };

    // Get all amounts
    const allAmounts = await db.select().from(erpBudgetLineAmounts).where(sql`${erpBudgetLineAmounts.budgetLineId} IN (${sql.raw(lineIds.join(","))})`);

    // Calculate P&L for each month
    for (let month = 1; month <= 12; month++) {
      let revenuePlanned = 0, revenueActual = 0;
      let directCostsPlanned = 0, directCostsActual = 0;
      let indirectCostsPlanned = 0, indirectCostsActual = 0;
      let capexPlanned = 0, capexActual = 0;

      for (const line of lines) {
        const amounts = allAmounts.filter(a => a.budgetLineId === line.id && a.monthNumber === month);
        const planned = amounts.reduce((s, a) => s + a.plannedAmount, 0);
        const actual = amounts.reduce((s, a) => s + a.actualAmount, 0);

        if (line.lineType === "REVENUE" || line.lineType === "CASH_IN") { revenuePlanned += planned; revenueActual += actual; }
        else if (line.lineType === "DIRECT_COST") { directCostsPlanned += planned; directCostsActual += actual; }
        else if (line.lineType === "INDIRECT_COST" || line.lineType === "OPEX") { indirectCostsPlanned += planned; indirectCostsActual += actual; }
        else if (line.lineType === "CAPEX") { capexPlanned += planned; capexActual += actual; }
        else if (line.lineType === "PAYROLL" || line.lineType === "SOCIAL_CHARGES") { indirectCostsPlanned += planned; indirectCostsActual += actual; }
        else if (line.lineType === "TAX") { indirectCostsPlanned += planned; indirectCostsActual += actual; }
      }

      const directMarginPlanned = revenuePlanned - directCostsPlanned;
      const directMarginActual = revenueActual - directCostsActual;
      const ebitdaPlanned = directMarginPlanned - indirectCostsPlanned;
      const ebitdaActual = directMarginActual - indirectCostsActual;
      const opCashFlowPlanned = ebitdaPlanned - capexPlanned;
      const opCashFlowActual = ebitdaActual - capexActual;

      // Upsert snapshot
      const existing = await db.select().from(erpBudgetPlSnapshots).where(and(eq(erpBudgetPlSnapshots.budgetId, input.budgetId), eq(erpBudgetPlSnapshots.monthNumber, month))).limit(1);
      const data = {
        revenuePlanned, revenueActual, directCostsPlanned, directCostsActual,
        directMarginPlanned, directMarginActual, indirectCostsPlanned, indirectCostsActual,
        ebitdaPlanned, ebitdaActual, capexPlanned, capexActual,
        operatingCashFlowPlanned: opCashFlowPlanned, operatingCashFlowActual: opCashFlowActual,
        updatedAt: now(),
      };
      if (existing.length > 0) {
        await db.update(erpBudgetPlSnapshots).set(data).where(eq(erpBudgetPlSnapshots.id, existing[0].id));
      } else {
        await db.insert(erpBudgetPlSnapshots).values({ budgetId: input.budgetId, monthNumber: month, ...data, createdAt: now() });
      }
    }
    return { success: true };
  }),
});

// ============================================================
// Cash Flow Router
// ============================================================
const cashFlowRouter = router({
  get: erpPermissionProcedure("erp_finance", "view").input(z.object({ budgetId: z.number() })).query(async ({ input }) => {
    const db = await getDatabase();
    return db.select().from(erpBudgetCashflowSnapshots).where(eq(erpBudgetCashflowSnapshots.budgetId, input.budgetId)).orderBy(erpBudgetCashflowSnapshots.monthNumber);
  }),

  recalculate: erpPermissionProcedure("erp_finance", "view").input(z.object({ budgetId: z.number(), openingBalance: z.number().default(0) })).mutation(async ({ input }) => {
    const db = await getDatabase();
    const lines = await db.select().from(erpBudgetLinesV2).where(and(eq(erpBudgetLinesV2.budgetId, input.budgetId), isNull(erpBudgetLinesV2.deletedAt)));
    const lineIds = lines.map(l => l.id);
    if (lineIds.length === 0) return { success: true };

    const allAmounts = await db.select().from(erpBudgetLineAmounts).where(sql`${erpBudgetLineAmounts.budgetLineId} IN (${sql.raw(lineIds.join(","))})`);

    let runningBalancePlanned = input.openingBalance;
    let runningBalanceActual = input.openingBalance;

    for (let month = 1; month <= 12; month++) {
      let cashInPlanned = 0, cashInActual = 0;
      let cashOutPlanned = 0, cashOutActual = 0;
      let opexPlanned = 0, opexActual = 0;
      let capexPlanned = 0, capexActual = 0;
      let taxesPlanned = 0, taxesActual = 0;

      for (const line of lines) {
        const amounts = allAmounts.filter(a => a.budgetLineId === line.id && a.monthNumber === month);
        const planned = amounts.reduce((s, a) => s + a.plannedAmount, 0);
        const actual = amounts.reduce((s, a) => s + a.actualAmount, 0);

        if (line.lineType === "REVENUE" || line.lineType === "CASH_IN") { cashInPlanned += planned; cashInActual += actual; }
        else if (line.lineType === "CAPEX") { capexPlanned += planned; capexActual += actual; cashOutPlanned += planned; cashOutActual += actual; }
        else if (line.lineType === "TAX") { taxesPlanned += planned; taxesActual += actual; cashOutPlanned += planned; cashOutActual += actual; }
        else if (line.lineType === "DIRECT_COST" || line.lineType === "INDIRECT_COST" || line.lineType === "OPEX" || line.lineType === "PAYROLL" || line.lineType === "SOCIAL_CHARGES") {
          opexPlanned += planned; opexActual += actual; cashOutPlanned += planned; cashOutActual += actual;
        }
      }

      const netCfPlanned = cashInPlanned - cashOutPlanned;
      const netCfActual = cashInActual - cashOutActual;
      const openingPlanned = runningBalancePlanned;
      const openingActual = runningBalanceActual;
      runningBalancePlanned += netCfPlanned;
      runningBalanceActual += netCfActual;

      const existing = await db.select().from(erpBudgetCashflowSnapshots).where(and(eq(erpBudgetCashflowSnapshots.budgetId, input.budgetId), eq(erpBudgetCashflowSnapshots.monthNumber, month))).limit(1);
      const data = {
        cashInPlanned, cashInActual, cashOutPlanned, cashOutActual,
        opexPlanned, opexActual, capexPlanned, capexActual, taxesPlanned, taxesActual,
        netCashFlowPlanned: netCfPlanned, netCashFlowActual: netCfActual,
        openingCashBalance: openingPlanned, closingCashBalance: runningBalancePlanned,
        updatedAt: now(),
      };
      if (existing.length > 0) {
        await db.update(erpBudgetCashflowSnapshots).set(data).where(eq(erpBudgetCashflowSnapshots.id, existing[0].id));
      } else {
        await db.insert(erpBudgetCashflowSnapshots).values({ budgetId: input.budgetId, monthNumber: month, ...data, createdAt: now() });
      }
    }
    return { success: true };
  }),
});

// ============================================================
// Alerts Router
// ============================================================
const alertsRouter = router({
  list: erpPermissionProcedure("erp_finance", "view").input(z.object({ budgetId: z.number(), status: z.string().optional() })).query(async ({ input }) => {
    const db = await getDatabase();
    const conditions: any[] = [eq(erpBudgetAlerts.budgetId, input.budgetId)];
    if (input.status) conditions.push(eq(erpBudgetAlerts.status, input.status as any));
    return db.select().from(erpBudgetAlerts).where(and(...conditions)).orderBy(desc(erpBudgetAlerts.createdAt));
  }),

  check: erpPermissionProcedure("erp_finance", "view").input(z.object({ budgetId: z.number(), thresholds: z.array(z.number()).default([75, 90, 100]) })).mutation(async ({ input }) => {
    const db = await getDatabase();
    const lines = await db.select().from(erpBudgetLinesV2).where(and(eq(erpBudgetLinesV2.budgetId, input.budgetId), isNull(erpBudgetLinesV2.deletedAt)));
    const lineIds = lines.map(l => l.id);
    if (lineIds.length === 0) return { alertsCreated: 0 };

    const allAmounts = await db.select().from(erpBudgetLineAmounts).where(sql`${erpBudgetLineAmounts.budgetLineId} IN (${sql.raw(lineIds.join(","))})`);
    let alertsCreated = 0;

    for (const line of lines) {
      if (line.isTotalLine || line.isCalculatedLine) continue;
      const amounts = allAmounts.filter(a => a.budgetLineId === line.id);
      const totalPlanned = amounts.reduce((s, a) => s + a.plannedAmount, 0);
      const totalActual = amounts.reduce((s, a) => s + a.actualAmount, 0);
      if (totalPlanned === 0) continue;

      const execRate = Math.round((totalActual / totalPlanned) * 100);
      const isExpense = ["DIRECT_COST", "INDIRECT_COST", "OPEX", "CAPEX", "TAX", "PAYROLL", "SOCIAL_CHARGES"].includes(line.lineType);
      const isRevenue = line.lineType === "REVENUE" || line.lineType === "CASH_IN";

      for (const threshold of input.thresholds) {
        if (isExpense && execRate >= threshold) {
          const alertType = line.lineType === "CAPEX" ? "capex_overrun" : line.lineType === "TAX" ? "tax_variance" : line.lineType === "PAYROLL" ? "payroll_variance" : "overrun";
          await db.insert(erpBudgetAlerts).values({
            budgetId: input.budgetId,
            budgetLineId: line.id,
            alertType: alertType as any,
            thresholdPercentage: threshold,
            plannedAmount: totalPlanned,
            actualAmount: totalActual,
            varianceAmount: totalActual - totalPlanned,
            variancePercentage: execRate - 100,
            message: `${line.lineLabel}: exécution ${execRate}% (seuil ${threshold}%)`,
            status: "active",
            createdAt: now(),
            updatedAt: now(),
          });
          alertsCreated++;
          break; // Only one alert per line
        }
        if (isRevenue && execRate < (100 - (100 - threshold))) {
          await db.insert(erpBudgetAlerts).values({
            budgetId: input.budgetId,
            budgetLineId: line.id,
            alertType: "underperformance_revenue",
            thresholdPercentage: threshold,
            plannedAmount: totalPlanned,
            actualAmount: totalActual,
            varianceAmount: totalActual - totalPlanned,
            variancePercentage: execRate - 100,
            message: `${line.lineLabel}: réalisation ${execRate}% du revenu prévu`,
            status: "active",
            createdAt: now(),
            updatedAt: now(),
          });
          alertsCreated++;
          break;
        }
      }
    }
    return { alertsCreated };
  }),

  acknowledge: erpPermissionProcedure("erp_finance", "view").input(z.object({ id: z.number() })).mutation(async ({ input }) => {
    const db = await getDatabase();
    await db.update(erpBudgetAlerts).set({ status: "acknowledged", updatedAt: now() }).where(eq(erpBudgetAlerts.id, input.id));
    return { success: true };
  }),
});

// ============================================================
// Execution Router — Sync actuals from other modules
// ============================================================
const executionRouter = router({
  summary: erpPermissionProcedure("erp_finance", "view").input(z.object({ budgetId: z.number() })).query(async ({ input }) => {
    const db = await getDatabase();
    const lines = await db.select().from(erpBudgetLinesV2).where(and(eq(erpBudgetLinesV2.budgetId, input.budgetId), isNull(erpBudgetLinesV2.deletedAt)));
    const lineIds = lines.map(l => l.id);
    if (lineIds.length === 0) return { totalPlanned: 0, totalActual: 0, variance: 0, executionRate: 0, byType: {} };

    const allAmounts = await db.select().from(erpBudgetLineAmounts).where(sql`${erpBudgetLineAmounts.budgetLineId} IN (${sql.raw(lineIds.join(","))})`);

    let totalPlanned = 0, totalActual = 0;
    const byType: Record<string, { planned: number; actual: number; variance: number; rate: number }> = {};

    for (const line of lines) {
      if (line.isTotalLine || line.isCalculatedLine) continue;
      const amounts = allAmounts.filter(a => a.budgetLineId === line.id);
      const planned = amounts.reduce((s, a) => s + a.plannedAmount, 0);
      const actual = amounts.reduce((s, a) => s + a.actualAmount, 0);
      totalPlanned += planned;
      totalActual += actual;

      if (!byType[line.lineType]) byType[line.lineType] = { planned: 0, actual: 0, variance: 0, rate: 0 };
      byType[line.lineType].planned += planned;
      byType[line.lineType].actual += actual;
    }

    // Calculate rates
    for (const key of Object.keys(byType)) {
      byType[key].variance = byType[key].actual - byType[key].planned;
      byType[key].rate = byType[key].planned !== 0 ? Math.round((byType[key].actual / byType[key].planned) * 100) : 0;
    }

    return {
      totalPlanned,
      totalActual,
      variance: totalActual - totalPlanned,
      executionRate: totalPlanned !== 0 ? Math.round((totalActual / totalPlanned) * 100) : 0,
      byType,
    };
  }),

  monthly: erpPermissionProcedure("erp_finance", "view").input(z.object({ budgetId: z.number() })).query(async ({ input }) => {
    const db = await getDatabase();
    const lines = await db.select().from(erpBudgetLinesV2).where(and(eq(erpBudgetLinesV2.budgetId, input.budgetId), isNull(erpBudgetLinesV2.deletedAt)));
    const lineIds = lines.map(l => l.id);
    if (lineIds.length === 0) return [];

    const allAmounts = await db.select().from(erpBudgetLineAmounts).where(sql`${erpBudgetLineAmounts.budgetLineId} IN (${sql.raw(lineIds.join(","))})`);
    const months = [];
    for (let m = 1; m <= 12; m++) {
      const monthAmounts = allAmounts.filter(a => a.monthNumber === m);
      const planned = monthAmounts.reduce((s, a) => s + a.plannedAmount, 0);
      const actual = monthAmounts.reduce((s, a) => s + a.actualAmount, 0);
      months.push({ month: m, planned, actual, variance: actual - planned, rate: planned !== 0 ? Math.round((actual / planned) * 100) : 0 });
    }
    return months;
  }),
});

// ============================================================
// Seed Demo Router
// ============================================================
import { seedBudget2026, cleanBudget2026 } from "./erp-budget-seed";

const seedRouter = router({
  run: erpPermissionProcedure("erp_budget_v2", "seed").mutation(async ({ ctx }) => {
    const result = await seedBudget2026(ctx.user.id);
    if (result.created) {
      await createAuditEvent({ actorId: ctx.user.id, action: "erp.budget_v2.seed_demo", details: { stats: result.stats } });
    }
    return result;
  }),
  clean: erpPermissionProcedure("erp_budget_v2", "seed").mutation(async ({ ctx }) => {
    const result = await cleanBudget2026();
    if (result.deleted) {
      await createAuditEvent({ actorId: ctx.user.id, action: "erp.budget_v2.clean_demo", details: { deleted: true } });
    }
    return result;
  }),
});

// ============================================================
// Export combined router
// ============================================================
export const erpBudgetV2Router = router({
  budgets: budgetCrudRouter,
  categories: categoriesRouter,
  lines: linesRouter,
  pl: plRouter,
  cashFlow: cashFlowRouter,
  alerts: alertsRouter,
  execution: executionRouter,
  seed: seedRouter,
});
