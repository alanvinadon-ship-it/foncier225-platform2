import { z } from "zod";
import { eq, and, desc, sql, isNull, gte, lte } from "drizzle-orm";
import { router, erpPermissionProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { createAuditEvent } from "../db";
import {
  erpCostCenters, erpAnalyticAxes, erpAnalyticAllocations, erpAnalyticSnapshots,
  erpRealEstatePrograms, erpProjects, users
} from "../../drizzle/schema";

const proc = erpPermissionProcedure("erp_analytics", "view");
const createProc = erpPermissionProcedure("erp_analytics", "create");
const updateProc = erpPermissionProcedure("erp_analytics", "update");
const syncProc = erpPermissionProcedure("erp_analytics", "sync");
const exportProc = erpPermissionProcedure("erp_analytics", "export");

// --- Cost Centers Router ---
const costCentersRouter = router({
  list: proc
    .input(z.object({ isActive: z.boolean().optional(), parentId: z.number().optional() }).optional())
    .query(async ({ input }) => {
      const db = (await getDb())!;
      const conditions = [];
      if (input?.isActive !== undefined) conditions.push(eq(erpCostCenters.isActive, input.isActive));
      if (input?.parentId) conditions.push(eq(erpCostCenters.parentId, input.parentId));
      const where = conditions.length > 0 ? and(...conditions) : undefined;
      return db.select().from(erpCostCenters).where(where).orderBy(erpCostCenters.id);
    }),

  getById: proc
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = (await getDb())!;
      const [cc] = await db.select().from(erpCostCenters).where(eq(erpCostCenters.id, input.id));
      if (!cc) throw new Error("Centre de coûts non trouvé");
      // Get children
      const children = await db.select().from(erpCostCenters).where(eq(erpCostCenters.parentId, input.id));
      // Get allocations
      const allocations = await db.select().from(erpAnalyticAllocations).where(eq(erpAnalyticAllocations.costCenterId, input.id));
      return { ...cc, children, allocations };
    }),

  create: createProc
    .input(z.object({
      code: z.string().min(1),
      name: z.string().min(1),
      description: z.string().optional(),
      parentId: z.number().optional(),
      managerId: z.number().optional(),
      budgetId: z.number().optional(),
      programId: z.number().optional(),
      projectId: z.number().optional(),
      costCenterType: z.enum(["department", "project", "program", "unit", "overhead", "shared"]).default("department"),
      sortOrder: z.number().default(0),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = (await getDb())!;
      const now = Date.now();
      const [result] = await db.insert(erpCostCenters).values({ ...input, isActive: true, createdAt: now, updatedAt: now });
      await createAuditEvent({ actorId: ctx.user.id, action: "cost_center_created", targetType: "erp_cost_center", targetId: result.insertId, details: { code: input.code, name: input.name } });
      return { id: result.insertId };
    }),

  update: updateProc
    .input(z.object({
      id: z.number(),
      name: z.string().optional(),
      description: z.string().optional(),
      parentId: z.number().optional(),
      managerId: z.number().optional(),
      budgetId: z.number().optional(),
      programId: z.number().optional(),
      projectId: z.number().optional(),
      costCenterType: z.string().optional(),
      isActive: z.boolean().optional(),
      sortOrder: z.number().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = (await getDb())!;
      const { id, isActive, ...updates } = input;
      const data: Record<string, unknown> = { ...updates, updatedAt: Date.now() };
      if (isActive !== undefined) data.isActive = isActive;
      await db.update(erpCostCenters).set(data).where(eq(erpCostCenters.id, id));
      return { success: true };
    }),

  delete: updateProc
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = (await getDb())!;
      await db.update(erpCostCenters).set({ isActive: false, updatedAt: Date.now() }).where(eq(erpCostCenters.id, input.id));
      return { success: true };
    }),
});

// --- Axes Router ---
const axesRouter = router({
  list: proc
    .input(z.object({ isActive: z.boolean().optional(), axisType: z.string().optional() }).optional())
    .query(async ({ input }) => {
      const db = (await getDb())!;
      const conditions = [];
      if (input?.isActive !== undefined) conditions.push(eq(erpAnalyticAxes.isActive, input.isActive));
      if (input?.axisType) conditions.push(eq(erpAnalyticAxes.axisType, input.axisType));
      const where = conditions.length > 0 ? and(...conditions) : undefined;
      return db.select().from(erpAnalyticAxes).where(where).orderBy(erpAnalyticAxes.id);
    }),

  create: createProc
    .input(z.object({
      code: z.string().min(1),
      name: z.string().min(1),
      description: z.string().optional(),
      axisType: z.string().default("project"),
      parentId: z.number().optional(),
      sortOrder: z.number().default(0),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = (await getDb())!;
      const now = Date.now();
      const [result] = await db.insert(erpAnalyticAxes).values({ ...input, isActive: true, createdAt: now, updatedAt: now });
      await createAuditEvent({ actorId: ctx.user.id, action: "analytic_axis_created", targetType: "erp_analytic_axis", targetId: result.insertId, details: { code: input.code } });
      return { id: result.insertId };
    }),

  update: updateProc
    .input(z.object({
      id: z.number(),
      name: z.string().optional(),
      description: z.string().optional(),
      axisType: z.string().optional(),
      isActive: z.boolean().optional(),
      sortOrder: z.number().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = (await getDb())!;
      const { id, isActive, ...updates } = input;
      const data: Record<string, unknown> = { ...updates, updatedAt: Date.now() };
      if (isActive !== undefined) data.isActive = isActive;
      await db.update(erpAnalyticAxes).set(data).where(eq(erpAnalyticAxes.id, id));
      return { success: true };
    }),
});

// --- Allocations Router ---
const allocationsRouter = router({
  list: proc
    .input(z.object({
      sourceType: z.string().optional(),
      sourceId: z.number().optional(),
      costCenterId: z.number().optional(),
      programId: z.number().optional(),
      budgetId: z.number().optional(),
      analyticAxisId: z.number().optional(),
    }).optional())
    .query(async ({ input }) => {
      const db = (await getDb())!;
      const conditions = [];
      if (input?.sourceType) conditions.push(eq(erpAnalyticAllocations.sourceType, input.sourceType));
      if (input?.sourceId) conditions.push(eq(erpAnalyticAllocations.sourceId, input.sourceId));
      if (input?.costCenterId) conditions.push(eq(erpAnalyticAllocations.costCenterId, input.costCenterId));
      if (input?.programId) conditions.push(eq(erpAnalyticAllocations.programId, input.programId));
      if (input?.budgetId) conditions.push(eq(erpAnalyticAllocations.budgetId, input.budgetId));
      if (input?.analyticAxisId) conditions.push(eq(erpAnalyticAllocations.analyticAxisId, input.analyticAxisId));
      const where = conditions.length > 0 ? and(...conditions) : undefined;
      return db.select().from(erpAnalyticAllocations).where(where).orderBy(desc(erpAnalyticAllocations.createdAt));
    }),

  create: createProc
    .input(z.object({
      sourceType: z.string(),
      sourceId: z.number(),
      analyticAxisId: z.number(),
      projectId: z.number().optional(),
      programId: z.number().optional(),
      costCenterId: z.number().optional(),
      budgetId: z.number().optional(),
      budgetLineId: z.number().optional(),
      accountingEntryId: z.number().optional(),
      accountingEntryLineId: z.number().optional(),
      percentage: z.string().optional(),
      amount: z.number().optional(),
      allocatedAmount: z.number().optional(),
      currency: z.string().default("XOF"),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = (await getDb())!;
      const now = Date.now();
      const [result] = await db.insert(erpAnalyticAllocations).values({ ...input, createdAt: now, updatedAt: now });
      await createAuditEvent({ actorId: ctx.user.id, action: "allocation_created", targetType: "erp_analytic_allocation", targetId: result.insertId, details: { sourceType: input.sourceType, sourceId: input.sourceId } });
      return { id: result.insertId };
    }),

  update: updateProc
    .input(z.object({
      id: z.number(),
      percentage: z.string().optional(),
      amount: z.number().optional(),
      allocatedAmount: z.number().optional(),
      costCenterId: z.number().optional(),
      budgetId: z.number().optional(),
      budgetLineId: z.number().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = (await getDb())!;
      const { id, ...updates } = input;
      await db.update(erpAnalyticAllocations).set({ ...updates, updatedAt: Date.now() }).where(eq(erpAnalyticAllocations.id, id));
      return { success: true };
    }),

  delete: updateProc
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = (await getDb())!;
      await db.delete(erpAnalyticAllocations).where(eq(erpAnalyticAllocations.id, input.id));
      return { success: true };
    }),

  bulkCreate: createProc
    .input(z.object({
      allocations: z.array(z.object({
        sourceType: z.string(),
        sourceId: z.number(),
        analyticAxisId: z.number(),
        costCenterId: z.number().optional(),
        programId: z.number().optional(),
        percentage: z.string().optional(),
        amount: z.number().optional(),
        allocatedAmount: z.number().optional(),
      })),
    }))
    .mutation(async ({ input }) => {
      const db = (await getDb())!;
      const now = Date.now();
      const values = input.allocations.map(a => ({ ...a, currency: "XOF", createdAt: now, updatedAt: now }));
      if (values.length > 0) {
        await db.insert(erpAnalyticAllocations).values(values);
      }
      return { created: values.length };
    }),
});

// --- Snapshots Router ---
const snapshotsRouter = router({
  list: proc
    .input(z.object({ snapshotType: z.string().optional(), periodYear: z.number().optional() }).optional())
    .query(async ({ input }) => {
      const db = (await getDb())!;
      const conditions = [];
      // snapshotType not in schema — filter by costCenterId/programId instead
      if (input?.periodYear) conditions.push(eq(erpAnalyticSnapshots.periodYear, input.periodYear));
      const where = conditions.length > 0 ? and(...conditions) : undefined;
      return db.select().from(erpAnalyticSnapshots).where(where).orderBy(desc(erpAnalyticSnapshots.createdAt));
    }),

  generate: syncProc
    .input(z.object({
      snapshotType: z.enum(["cost_center_pl", "program_pl", "project_pl", "axis_breakdown", "budget_vs_actual"]),
      periodYear: z.number(),
      periodMonth: z.number().optional(),
      costCenterId: z.number().optional(),
      programId: z.number().optional(),
      budgetId: z.number().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = (await getDb())!;
      const now = Date.now();

      // Aggregate allocations for the period
      const conditions = [];
      if (input.costCenterId) conditions.push(eq(erpAnalyticAllocations.costCenterId, input.costCenterId));
      if (input.programId) conditions.push(eq(erpAnalyticAllocations.programId, input.programId));
      if (input.budgetId) conditions.push(eq(erpAnalyticAllocations.budgetId, input.budgetId));

      const allocations = await db.select().from(erpAnalyticAllocations)
        .where(conditions.length > 0 ? and(...conditions) : undefined);

      const totalRevenue = allocations
        .filter(a => a.sourceType === "real_estate_sale" || a.sourceType === "customer_payment")
        .reduce((s, a) => s + (a.allocatedAmount || a.amount || 0), 0);
      const totalExpense = allocations
        .filter(a => a.sourceType === "expense" || a.sourceType === "invoice" || a.sourceType === "purchase_order")
        .reduce((s, a) => s + (a.allocatedAmount || a.amount || 0), 0);
      const totalAllocated = allocations.reduce((s, a) => s + (a.allocatedAmount || a.amount || 0), 0);

      const snapshotData = {
        totalRevenue, totalExpense, totalAllocated,
        netResult: totalRevenue - totalExpense,
        allocationCount: allocations.length,
      };

      const [result] = await db.insert(erpAnalyticSnapshots).values({
        snapshotDate: now,
        periodYear: input.periodYear,
        periodMonth: input.periodMonth || 0,
        costCenterId: input.costCenterId || null,
        programId: input.programId || null,
        projectId: null,
        revenueAmount: totalRevenue,
        expenseAmount: totalExpense,
        marginAmount: totalRevenue - totalExpense,
        marginRate: totalRevenue > 0 ? String(Math.round(((totalRevenue - totalExpense) / totalRevenue) * 10000) / 100) : "0",
        budgetAmount: 0,
        actualAmount: totalAllocated,
        varianceAmount: 0,
        variancePercentage: "0",
        createdAt: now,
        updatedAt: now,
      });

      await createAuditEvent({ actorId: ctx.user.id, action: "analytic_snapshot_generated", targetType: "erp_analytic_snapshot", targetId: result.insertId, details: { snapshotType: input.snapshotType } });
      return { id: result.insertId, ...snapshotData };
    }),
});

// --- Reporting Router ---
const reportingRouter = router({
  byCostCenter: proc
    .input(z.object({ periodYear: z.number().optional() }).optional())
    .query(async ({ input }) => {
      const db = (await getDb())!;
      const costCenters = await db.select().from(erpCostCenters).where(eq(erpCostCenters.isActive, true));
      const allocations = await db.select().from(erpAnalyticAllocations);

      const result = costCenters.map(cc => {
        const ccAllocs = allocations.filter(a => a.costCenterId === cc.id);
        const revenue = ccAllocs.filter(a => a.sourceType === "real_estate_sale" || a.sourceType === "customer_payment").reduce((s, a) => s + (a.allocatedAmount || a.amount || 0), 0);
        const expense = ccAllocs.filter(a => a.sourceType === "expense" || a.sourceType === "invoice" || a.sourceType === "purchase_order").reduce((s, a) => s + (a.allocatedAmount || a.amount || 0), 0);
        return {
          costCenterId: cc.id,
          costCenterCode: cc.code,
          costCenterName: cc.name,
          revenue, expense,
          netResult: revenue - expense,
          allocationCount: ccAllocs.length,
        };
      });
      return result.sort((a, b) => b.netResult - a.netResult);
    }),

  byProgram: proc
    .input(z.object({ periodYear: z.number().optional() }).optional())
    .query(async ({ input }) => {
      const db = (await getDb())!;
      const programs = await db.select().from(erpRealEstatePrograms);
      const allocations = await db.select().from(erpAnalyticAllocations);

      return programs.map(p => {
        const pAllocs = allocations.filter(a => a.programId === p.id);
        const revenue = pAllocs.filter(a => a.sourceType === "real_estate_sale" || a.sourceType === "customer_payment").reduce((s, a) => s + (a.allocatedAmount || a.amount || 0), 0);
        const expense = pAllocs.filter(a => a.sourceType === "expense" || a.sourceType === "invoice" || a.sourceType === "purchase_order").reduce((s, a) => s + (a.allocatedAmount || a.amount || 0), 0);
        return {
          programId: p.id,
          programName: p.name,
          revenue, expense,
          netResult: revenue - expense,
          marginRate: revenue > 0 ? Math.round(((revenue - expense) / revenue) * 10000) / 100 : 0,
          allocationCount: pAllocs.length,
        };
      }).sort((a, b) => b.netResult - a.netResult);
    }),

  byAxis: proc
    .input(z.object({ axisId: z.number() }))
    .query(async ({ input }) => {
      const db = (await getDb())!;
      const allocations = await db.select().from(erpAnalyticAllocations)
        .where(eq(erpAnalyticAllocations.analyticAxisId, input.axisId));

      const bySource: Record<string, { count: number; total: number }> = {};
      for (const a of allocations) {
        if (!bySource[a.sourceType]) bySource[a.sourceType] = { count: 0, total: 0 };
        bySource[a.sourceType].count++;
        bySource[a.sourceType].total += a.allocatedAmount || a.amount || 0;
      }

      return {
        axisId: input.axisId,
        totalAllocations: allocations.length,
        totalAmount: allocations.reduce((s, a) => s + (a.allocatedAmount || a.amount || 0), 0),
        bySourceType: Object.entries(bySource).map(([type, data]) => ({ sourceType: type, ...data })),
      };
    }),

  plByEntity: proc
    .input(z.object({
      entityType: z.enum(["cost_center", "program", "project"]),
      entityId: z.number(),
    }))
    .query(async ({ input }) => {
      const db = (await getDb())!;
      let conditions;
      if (input.entityType === "cost_center") conditions = eq(erpAnalyticAllocations.costCenterId, input.entityId);
      else if (input.entityType === "program") conditions = eq(erpAnalyticAllocations.programId, input.entityId);
      else conditions = eq(erpAnalyticAllocations.projectId, input.entityId);

      const allocations = await db.select().from(erpAnalyticAllocations).where(conditions);

      const revenueTypes = ["real_estate_sale", "customer_payment"];
      const expenseTypes = ["expense", "invoice", "purchase_order", "payroll", "social_charges"];

      const revenue = allocations.filter(a => revenueTypes.includes(a.sourceType)).reduce((s, a) => s + (a.allocatedAmount || a.amount || 0), 0);
      const directCosts = allocations.filter(a => a.sourceType === "expense" || a.sourceType === "invoice").reduce((s, a) => s + (a.allocatedAmount || a.amount || 0), 0);
      const indirectCosts = allocations.filter(a => a.sourceType === "purchase_order").reduce((s, a) => s + (a.allocatedAmount || a.amount || 0), 0);
      const payroll = allocations.filter(a => a.sourceType === "payroll" || a.sourceType === "social_charges").reduce((s, a) => s + (a.allocatedAmount || a.amount || 0), 0);
      const totalExpense = directCosts + indirectCosts + payroll;
      const grossMargin = revenue - directCosts;
      const netResult = revenue - totalExpense;

      return {
        entityType: input.entityType,
        entityId: input.entityId,
        revenue,
        directCosts,
        indirectCosts,
        payroll,
        totalExpense,
        grossMargin,
        grossMarginRate: revenue > 0 ? Math.round((grossMargin / revenue) * 10000) / 100 : 0,
        netResult,
        netMarginRate: revenue > 0 ? Math.round((netResult / revenue) * 10000) / 100 : 0,
        allocationCount: allocations.length,
      };
    }),
});

export const erpAnalyticsRouter = router({
  costCenters: costCentersRouter,
  axes: axesRouter,
  allocations: allocationsRouter,
  snapshots: snapshotsRouter,
  reporting: reportingRouter,
});
