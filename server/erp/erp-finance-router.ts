import { z } from "zod";
import { eq, and, desc, sql, gte, lte } from "drizzle-orm";
import { router, erpPermissionProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { createAuditEvent } from "../db";
import {
  erpBudgets,
  erpBudgetLines,
  erpCashFlows,
  erpProfitabilitySnapshots,
  erpProjects,
} from "../../drizzle/schema";

// ============================================================
// ERP FINANCE ROUTER — Sprint 13
// Budget, Cash Flow, Profitability
// ============================================================

const BUDGET_CATEGORIES = ["labour", "materials", "equipment", "subcontracting", "permits", "transport", "other"] as const;
const BUDGET_STATUSES = ["draft", "submitted", "approved", "rejected", "revised"] as const;
const CASH_FLOW_TYPES = ["inflow", "outflow"] as const;
const CASH_FLOW_CATEGORIES = ["labour", "materials", "equipment", "subcontracting", "permits", "transport", "client_payment", "advance", "retention", "other"] as const;

// ============================================================
// BUDGET ROUTER
// ============================================================

const budgetRouter = router({
  /**
   * GET — Liste des budgets
   */
  list: erpPermissionProcedure("finance", "view").input(
    z.object({
      projectId: z.number().optional(),
      status: z.enum(BUDGET_STATUSES).optional(),
      limit: z.number().min(1).max(100).default(50),
      offset: z.number().min(0).default(0),
    }).optional()
  ).query(async ({ input }) => {
    const db = (await getDb())!;
    const params = input || { limit: 50, offset: 0 };
    const conditions: any[] = [];
    if (params.projectId) conditions.push(eq(erpBudgets.projectId, params.projectId));
    if (params.status) conditions.push(eq(erpBudgets.status, params.status));
    const where = conditions.length > 0 ? and(...conditions) : undefined;
    const [items, countResult] = await Promise.all([
      db.select().from(erpBudgets)
        .where(where)
        .orderBy(desc(erpBudgets.createdAt))
        .limit(params.limit)
        .offset(params.offset),
      db.select({ count: sql<number>`COUNT(*)` }).from(erpBudgets).where(where),
    ]);
    return { budgets: items, total: countResult[0].count };
  }),

  /**
   * POST — Créer un budget
   */
  create: erpPermissionProcedure("finance", "create").input(
    z.object({
      projectId: z.number(),
      name: z.string().min(1).max(255),
    })
  ).mutation(async ({ input, ctx }) => {
    const db = (await getDb())!;
    const now = Date.now();
    const result = await db.insert(erpBudgets).values({
      projectId: input.projectId,
      name: input.name,
      status: "draft",
      totalInitial: 0,
      totalRevised: 0,
      totalEngaged: 0,
      totalPaid: 0,
      createdBy: ctx.user.id,
      createdAt: now,
      updatedAt: now,
    });
    await createAuditEvent({ actorId: ctx.user.id, action: "erp.finance.budget.create", details: { budgetId: result[0].insertId, projectId: input.projectId } });
    return { id: result[0].insertId };
  }),

  /**
   * GET — Détail d'un budget avec ses lignes
   */
  getById: erpPermissionProcedure("finance", "view").input(
    z.object({ id: z.number() })
  ).query(async ({ input }) => {
    const db = (await getDb())!;
    const [budget] = await db.select().from(erpBudgets).where(eq(erpBudgets.id, input.id)).limit(1);
    if (!budget) return null;
    const lines = await db.select().from(erpBudgetLines).where(eq(erpBudgetLines.budgetId, input.id)).orderBy(erpBudgetLines.id);
    return { ...budget, lines };
  }),

  /**
   * PUT — Modifier un budget (seulement si draft ou revised)
   */
  update: erpPermissionProcedure("finance", "edit").input(
    z.object({
      id: z.number(),
      name: z.string().min(1).max(255).optional(),
      status: z.enum(BUDGET_STATUSES).optional(),
    })
  ).mutation(async ({ input, ctx }) => {
    const db = (await getDb())!;
    const [budget] = await db.select().from(erpBudgets).where(eq(erpBudgets.id, input.id)).limit(1);
    if (!budget) throw new Error("Budget introuvable");
    if (budget.status === "approved" && input.status !== "revised") {
      throw new Error("Un budget approuvé ne peut être modifié sans révision");
    }
    const updates: any = { updatedAt: Date.now() };
    if (input.name) updates.name = input.name;
    if (input.status) updates.status = input.status;
    await db.update(erpBudgets).set(updates).where(eq(erpBudgets.id, input.id));
    await createAuditEvent({ actorId: ctx.user.id, action: "erp.finance.budget.update", details: { budgetId: input.id } });
    return { success: true };
  }),

  /**
   * POST — Approuver un budget
   */
  approve: erpPermissionProcedure("finance", "approve").input(
    z.object({ id: z.number() })
  ).mutation(async ({ input, ctx }) => {
    const db = (await getDb())!;
    const [budget] = await db.select().from(erpBudgets).where(eq(erpBudgets.id, input.id)).limit(1);
    if (!budget) throw new Error("Budget introuvable");
    if (budget.status !== "submitted") throw new Error("Seul un budget soumis peut être approuvé");
    await db.update(erpBudgets).set({
      status: "approved",
      approvedBy: ctx.user.id,
      approvedAt: Date.now(),
      updatedAt: Date.now(),
    }).where(eq(erpBudgets.id, input.id));
    await createAuditEvent({ actorId: ctx.user.id, action: "erp.finance.budget.approve", details: { budgetId: input.id } });
    return { success: true };
  }),

  /**
   * GET — Budget d'un projet
   */
  byProject: erpPermissionProcedure("finance", "view").input(
    z.object({ projectId: z.number() })
  ).query(async ({ input }) => {
    const db = (await getDb())!;
    const budgets = await db.select().from(erpBudgets)
      .where(eq(erpBudgets.projectId, input.projectId))
      .orderBy(desc(erpBudgets.createdAt));
    return { budgets };
  }),

  /**
   * GET — Variance budgétaire (prévu vs réalisé)
   */
  variance: erpPermissionProcedure("finance", "view").input(
    z.object({ projectId: z.number() })
  ).query(async ({ input }) => {
    const db = (await getDb())!;
    const [budget] = await db.select().from(erpBudgets)
      .where(eq(erpBudgets.projectId, input.projectId))
      .orderBy(desc(erpBudgets.createdAt))
      .limit(1);
    if (!budget) return null;
    const lines = await db.select().from(erpBudgetLines).where(eq(erpBudgetLines.budgetId, budget.id));
    const variance = lines.map(line => ({
      id: line.id,
      category: line.category,
      description: line.description,
      planned: line.revisedAmount || line.initialAmount,
      actual: line.paidAmount,
      engaged: line.engagedAmount,
      remaining: (line.revisedAmount || line.initialAmount) - line.engagedAmount - line.paidAmount,
      varianceAmount: (line.revisedAmount || line.initialAmount) - line.paidAmount,
      variancePercent: line.initialAmount > 0
        ? Math.round(((line.revisedAmount || line.initialAmount) - line.paidAmount) * 10000 / line.initialAmount)
        : 0,
    }));
    return {
      budget,
      lines: variance,
      totals: {
        planned: variance.reduce((s, v) => s + v.planned, 0),
        actual: variance.reduce((s, v) => s + v.actual, 0),
        engaged: variance.reduce((s, v) => s + v.engaged, 0),
        remaining: variance.reduce((s, v) => s + v.remaining, 0),
      },
    };
  }),

  /**
   * POST — Ajouter une ligne budgétaire
   */
  addLine: erpPermissionProcedure("finance", "create").input(
    z.object({
      budgetId: z.number(),
      category: z.enum(BUDGET_CATEGORIES),
      description: z.string().max(500).optional(),
      initialAmount: z.number().min(0),
      revisedAmount: z.number().min(0).optional(),
    })
  ).mutation(async ({ input, ctx }) => {
    const db = (await getDb())!;
    const [budget] = await db.select().from(erpBudgets).where(eq(erpBudgets.id, input.budgetId)).limit(1);
    if (!budget) throw new Error("Budget introuvable");
    if (budget.status === "approved") throw new Error("Impossible d'ajouter des lignes à un budget approuvé");
    const now = Date.now();
    const result = await db.insert(erpBudgetLines).values({
      budgetId: input.budgetId,
      category: input.category,
      description: input.description || null,
      initialAmount: input.initialAmount,
      revisedAmount: input.revisedAmount ?? input.initialAmount,
      engagedAmount: 0,
      paidAmount: 0,
      createdAt: now,
      updatedAt: now,
    });
    // Recalculate budget totals
    const lines = await db.select().from(erpBudgetLines).where(eq(erpBudgetLines.budgetId, input.budgetId));
    const totalInitial = lines.reduce((s, l) => s + l.initialAmount, 0);
    const totalRevised = lines.reduce((s, l) => s + l.revisedAmount, 0);
    const totalEngaged = lines.reduce((s, l) => s + l.engagedAmount, 0);
    const totalPaid = lines.reduce((s, l) => s + l.paidAmount, 0);
    await db.update(erpBudgets).set({ totalInitial, totalRevised, totalEngaged, totalPaid, updatedAt: now }).where(eq(erpBudgets.id, input.budgetId));
    await createAuditEvent({ actorId: ctx.user.id, action: "erp.finance.budgetline.add", details: { budgetId: input.budgetId, lineId: result[0].insertId } });
    return { id: result[0].insertId };
  }),

  /**
   * PUT — Modifier une ligne budgétaire
   */
  updateLine: erpPermissionProcedure("finance", "edit").input(
    z.object({
      id: z.number(),
      initialAmount: z.number().min(0).optional(),
      revisedAmount: z.number().min(0).optional(),
      engagedAmount: z.number().min(0).optional(),
      paidAmount: z.number().min(0).optional(),
      description: z.string().max(500).optional(),
    })
  ).mutation(async ({ input, ctx }) => {
    const db = (await getDb())!;
    const [line] = await db.select().from(erpBudgetLines).where(eq(erpBudgetLines.id, input.id)).limit(1);
    if (!line) throw new Error("Ligne introuvable");
    const [budget] = await db.select().from(erpBudgets).where(eq(erpBudgets.id, line.budgetId)).limit(1);
    if (budget && budget.status === "approved") throw new Error("Impossible de modifier les lignes d'un budget approuvé");
    const updates: any = { updatedAt: Date.now() };
    if (input.initialAmount !== undefined) updates.initialAmount = input.initialAmount;
    if (input.revisedAmount !== undefined) updates.revisedAmount = input.revisedAmount;
    if (input.engagedAmount !== undefined) updates.engagedAmount = input.engagedAmount;
    if (input.paidAmount !== undefined) updates.paidAmount = input.paidAmount;
    if (input.description !== undefined) updates.description = input.description;
    await db.update(erpBudgetLines).set(updates).where(eq(erpBudgetLines.id, input.id));
    // Recalculate budget totals
    const lines = await db.select().from(erpBudgetLines).where(eq(erpBudgetLines.budgetId, line.budgetId));
    const totalInitial = lines.reduce((s, l) => s + (l.id === input.id ? (input.initialAmount ?? l.initialAmount) : l.initialAmount), 0);
    const totalRevised = lines.reduce((s, l) => s + (l.id === input.id ? (input.revisedAmount ?? l.revisedAmount) : l.revisedAmount), 0);
    const totalEngaged = lines.reduce((s, l) => s + (l.id === input.id ? (input.engagedAmount ?? l.engagedAmount) : l.engagedAmount), 0);
    const totalPaid = lines.reduce((s, l) => s + (l.id === input.id ? (input.paidAmount ?? l.paidAmount) : l.paidAmount), 0);
    await db.update(erpBudgets).set({ totalInitial, totalRevised, totalEngaged, totalPaid, updatedAt: Date.now() }).where(eq(erpBudgets.id, line.budgetId));
    await createAuditEvent({ actorId: ctx.user.id, action: "erp.finance.budgetline.update", details: { lineId: input.id } });
    return { success: true };
  }),
});

// ============================================================
// CASH FLOW ROUTER
// ============================================================

const cashFlowRouter = router({
  /**
   * GET — Liste des flux de trésorerie
   */
  list: erpPermissionProcedure("finance", "view").input(
    z.object({
      projectId: z.number().optional(),
      type: z.enum(CASH_FLOW_TYPES).optional(),
      category: z.enum(CASH_FLOW_CATEGORIES).optional(),
      dateFrom: z.number().optional(),
      dateTo: z.number().optional(),
      isPaid: z.boolean().optional(),
      limit: z.number().min(1).max(100).default(50),
      offset: z.number().min(0).default(0),
    }).optional()
  ).query(async ({ input }) => {
    const db = (await getDb())!;
    const params = input || { limit: 50, offset: 0 };
    const conditions: any[] = [];
    if (params.projectId) conditions.push(eq(erpCashFlows.projectId, params.projectId));
    if (params.type) conditions.push(eq(erpCashFlows.type, params.type));
    if (params.category) conditions.push(eq(erpCashFlows.category, params.category));
    if (params.dateFrom) conditions.push(gte(erpCashFlows.flowDate, params.dateFrom));
    if (params.dateTo) conditions.push(lte(erpCashFlows.flowDate, params.dateTo));
    if (params.isPaid !== undefined) conditions.push(eq(erpCashFlows.isPaid, params.isPaid));
    const where = conditions.length > 0 ? and(...conditions) : undefined;
    const [items, countResult] = await Promise.all([
      db.select().from(erpCashFlows)
        .where(where)
        .orderBy(desc(erpCashFlows.flowDate))
        .limit(params.limit)
        .offset(params.offset),
      db.select({ count: sql<number>`COUNT(*)` }).from(erpCashFlows).where(where),
    ]);
    return { items, total: countResult[0].count };
  }),

  /**
   * POST — Enregistrer un flux
   */
  create: erpPermissionProcedure("finance", "create").input(
    z.object({
      projectId: z.number().optional(),
      type: z.enum(CASH_FLOW_TYPES),
      category: z.enum(CASH_FLOW_CATEGORIES),
      amount: z.number().min(1),
      description: z.string().max(500).optional(),
      flowDate: z.number(),
      dueDate: z.number().optional(),
      isPaid: z.boolean().default(false),
    })
  ).mutation(async ({ input, ctx }) => {
    const db = (await getDb())!;
    const now = Date.now();
    const result = await db.insert(erpCashFlows).values({
      projectId: input.projectId || null,
      type: input.type,
      category: input.category,
      amount: input.amount,
      description: input.description || null,
      flowDate: input.flowDate,
      dueDate: input.dueDate || null,
      isPaid: input.isPaid,
      paidAt: input.isPaid ? now : null,
      createdBy: ctx.user.id,
      createdAt: now,
      updatedAt: now,
    });
    await createAuditEvent({ actorId: ctx.user.id, action: "erp.finance.cashflow.create", details: { id: result[0].insertId, type: input.type } });
    return { id: result[0].insertId };
  }),

  /**
   * GET — Résumé cash flow par période
   */
  summary: erpPermissionProcedure("finance", "view").input(
    z.object({
      projectId: z.number().optional(),
      dateFrom: z.number().optional(),
      dateTo: z.number().optional(),
    }).optional()
  ).query(async ({ input }) => {
    const db = (await getDb())!;
    const params = input || {};
    const conditions: any[] = [];
    if (params.projectId) conditions.push(eq(erpCashFlows.projectId, params.projectId));
    if (params.dateFrom) conditions.push(gte(erpCashFlows.flowDate, params.dateFrom));
    if (params.dateTo) conditions.push(lte(erpCashFlows.flowDate, params.dateTo));
    const where = conditions.length > 0 ? and(...conditions) : undefined;
    const flows = await db.select().from(erpCashFlows).where(where);
    const totalInflow = flows.filter(f => f.type === "inflow").reduce((s, f) => s + f.amount, 0);
    const totalOutflow = flows.filter(f => f.type === "outflow").reduce((s, f) => s + f.amount, 0);
    const netCashFlow = totalInflow - totalOutflow;
    const paidInflow = flows.filter(f => f.type === "inflow" && f.isPaid).reduce((s, f) => s + f.amount, 0);
    const paidOutflow = flows.filter(f => f.type === "outflow" && f.isPaid).reduce((s, f) => s + f.amount, 0);
    const pendingInflow = totalInflow - paidInflow;
    const pendingOutflow = totalOutflow - paidOutflow;
    return {
      totalInflow,
      totalOutflow,
      netCashFlow,
      paidInflow,
      paidOutflow,
      pendingInflow,
      pendingOutflow,
      balance: paidInflow - paidOutflow,
      recordCount: flows.length,
    };
  }),

  /**
   * GET — Cash flow d'un projet
   */
  byProject: erpPermissionProcedure("finance", "view").input(
    z.object({ projectId: z.number() })
  ).query(async ({ input }) => {
    const db = (await getDb())!;
    const flows = await db.select().from(erpCashFlows)
      .where(eq(erpCashFlows.projectId, input.projectId))
      .orderBy(desc(erpCashFlows.flowDate));
    const totalInflow = flows.filter(f => f.type === "inflow").reduce((s, f) => s + f.amount, 0);
    const totalOutflow = flows.filter(f => f.type === "outflow").reduce((s, f) => s + f.amount, 0);
    return { flows, totalInflow, totalOutflow, netCashFlow: totalInflow - totalOutflow };
  }),

  /**
   * GET — Prévisions (paiements à venir non payés)
   */
  forecast: erpPermissionProcedure("finance", "view").input(
    z.object({
      daysAhead: z.number().min(1).max(365).default(30),
      projectId: z.number().optional(),
    }).optional()
  ).query(async ({ input }) => {
    const db = (await getDb())!;
    const params = input || { daysAhead: 30 };
    const now = Date.now();
    const futureLimit = now + (params.daysAhead * 86400000);
    const conditions: any[] = [
      eq(erpCashFlows.isPaid, false),
      gte(erpCashFlows.dueDate, now),
      lte(erpCashFlows.dueDate, futureLimit),
    ];
    if (params.projectId) conditions.push(eq(erpCashFlows.projectId, params.projectId));
    const upcoming = await db.select().from(erpCashFlows)
      .where(and(...conditions))
      .orderBy(erpCashFlows.dueDate);
    const expectedInflow = upcoming.filter(f => f.type === "inflow").reduce((s, f) => s + f.amount, 0);
    const expectedOutflow = upcoming.filter(f => f.type === "outflow").reduce((s, f) => s + f.amount, 0);
    return {
      upcoming,
      expectedInflow,
      expectedOutflow,
      netForecast: expectedInflow - expectedOutflow,
      daysAhead: params.daysAhead,
    };
  }),
});

// ============================================================
// PROFITABILITY ROUTER
// ============================================================

const profitabilityRouter = router({
  /**
   * GET — Liste des snapshots de rentabilité
   */
  list: erpPermissionProcedure("finance", "view").input(
    z.object({
      limit: z.number().min(1).max(100).default(50),
      offset: z.number().min(0).default(0),
    }).optional()
  ).query(async ({ input }) => {
    const db = (await getDb())!;
    const params = input || { limit: 50, offset: 0 };
    // Get latest snapshot per project
    const snapshots = await db.select().from(erpProfitabilitySnapshots)
      .orderBy(desc(erpProfitabilitySnapshots.snapshotDate))
      .limit(params.limit)
      .offset(params.offset);
    return { snapshots };
  }),

  /**
   * GET — Rentabilité d'un projet
   */
  byProject: erpPermissionProcedure("finance", "view").input(
    z.object({ projectId: z.number() })
  ).query(async ({ input }) => {
    const db = (await getDb())!;
    const snapshots = await db.select().from(erpProfitabilitySnapshots)
      .where(eq(erpProfitabilitySnapshots.projectId, input.projectId))
      .orderBy(desc(erpProfitabilitySnapshots.snapshotDate));
    const latest = snapshots[0] || null;
    return { latest, history: snapshots };
  }),

  /**
   * POST — Recalculer la rentabilité d'un projet
   */
  recalculate: erpPermissionProcedure("finance", "edit").input(
    z.object({ projectId: z.number() })
  ).mutation(async ({ input, ctx }) => {
    const db = (await getDb())!;
    // Fetch cash flows for the project
    const flows = await db.select().from(erpCashFlows)
      .where(eq(erpCashFlows.projectId, input.projectId));
    const revenue = flows.filter(f => f.type === "inflow").reduce((s, f) => s + f.amount, 0);
    // Direct costs: labour, materials, equipment, subcontracting
    const directCategories = ["labour", "materials", "equipment", "subcontracting"];
    const directCosts = flows
      .filter(f => f.type === "outflow" && directCategories.includes(f.category))
      .reduce((s, f) => s + f.amount, 0);
    // Indirect costs: permits, transport, other
    const indirectCosts = flows
      .filter(f => f.type === "outflow" && !directCategories.includes(f.category))
      .reduce((s, f) => s + f.amount, 0);
    const grossMargin = revenue - directCosts;
    const netMargin = revenue - directCosts - indirectCosts;
    const grossMarginPercent = revenue > 0 ? Math.round((grossMargin * 10000) / revenue) : 0;
    const netMarginPercent = revenue > 0 ? Math.round((netMargin * 10000) / revenue) : 0;
    const now = Date.now();
    const result = await db.insert(erpProfitabilitySnapshots).values({
      projectId: input.projectId,
      revenue,
      directCosts,
      indirectCosts,
      grossMargin,
      netMargin,
      grossMarginPercent,
      netMarginPercent,
      snapshotDate: now,
      createdAt: now,
    });
    await createAuditEvent({ actorId: ctx.user.id, action: "erp.finance.profitability.recalculate", details: { projectId: input.projectId } });
    return { id: result[0].insertId, revenue, directCosts, indirectCosts, grossMargin, netMargin, grossMarginPercent, netMarginPercent };
  }),

  /**
   * GET — Classement des projets par rentabilité
   */
  ranking: erpPermissionProcedure("finance", "view").input(
    z.object({
      sortBy: z.enum(["grossMargin", "netMargin", "grossMarginPercent", "netMarginPercent"]).default("netMarginPercent"),
      limit: z.number().min(1).max(50).default(20),
    }).optional()
  ).query(async ({ input }) => {
    const db = (await getDb())!;
    const params = input || { sortBy: "netMarginPercent", limit: 20 };
    // Get latest snapshot per project using subquery
    const allSnapshots = await db.select().from(erpProfitabilitySnapshots)
      .orderBy(desc(erpProfitabilitySnapshots.snapshotDate));
    // Deduplicate by projectId (keep latest)
    const latestByProject = new Map<number, typeof allSnapshots[0]>();
    for (const s of allSnapshots) {
      if (!latestByProject.has(s.projectId)) {
        latestByProject.set(s.projectId, s);
      }
    }
    const ranked = Array.from(latestByProject.values());
    // Sort
    ranked.sort((a, b) => {
      const key = params.sortBy as keyof typeof a;
      return (b[key] as number) - (a[key] as number);
    });
    return { ranking: ranked.slice(0, params.limit) };
  }),
});

// ============================================================
// COMBINED FINANCE ROUTER
// ============================================================

export const erpFinanceRouter = router({
  budgets: budgetRouter,
  cashFlow: cashFlowRouter,
  profitability: profitabilityRouter,
});
