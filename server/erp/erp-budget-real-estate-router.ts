import { z } from "zod";
import { eq, and, desc, sql, gte, lte } from "drizzle-orm";
import { router, erpPermissionProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { createAuditEvent } from "../db";
import {
  erpBudgetRealEstateLinks, erpRealEstateBudgetActuals,
  erpRealEstateSales, erpCustomerPayments, erpRealEstatePrograms,
  erpRealEstateUnits, erpBudgetsV2, erpBudgetLinesV2, erpBudgetLineAmounts
} from "../../drizzle/schema";

const proc = erpPermissionProcedure("erp_budget_real_estate", "view");
const createProc = erpPermissionProcedure("erp_budget_real_estate", "create");
const syncProc = erpPermissionProcedure("erp_budget_real_estate", "sync");
const exportProc = erpPermissionProcedure("erp_budget_real_estate", "export");

// --- Links Router ---
const linksRouter = router({
  list: proc
    .input(z.object({ budgetId: z.number().optional(), programId: z.number().optional() }).optional())
    .query(async ({ input }) => {
      const db = (await getDb())!;
      const conditions = [];
      if (input?.budgetId) conditions.push(eq(erpBudgetRealEstateLinks.budgetId, input.budgetId));
      if (input?.programId) conditions.push(eq(erpBudgetRealEstateLinks.programId, input.programId));
      const where = conditions.length > 0 ? and(...conditions) : undefined;
      return db.select().from(erpBudgetRealEstateLinks).where(where).orderBy(desc(erpBudgetRealEstateLinks.createdAt));
    }),

  create: createProc
    .input(z.object({
      budgetId: z.number(),
      budgetVersionId: z.number().optional(),
      budgetLineId: z.number().optional(),
      programId: z.number().optional(),
      projectId: z.number().optional(),
      unitType: z.string().optional(),
      revenueRecognitionMethod: z.enum(["contract_signed", "payment_received", "delivery_completed", "custom"]).default("contract_signed"),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = (await getDb())!;
      const now = Date.now();
      const [result] = await db.insert(erpBudgetRealEstateLinks).values({ ...input, createdAt: now, updatedAt: now });
      await createAuditEvent({ actorId: ctx.user.id, action: "budget_re_link_created", targetType: "erp_budget_re_link", targetId: result.insertId, details: { budgetId: input.budgetId, programId: input.programId } });
      return { id: result.insertId };
    }),

  update: createProc
    .input(z.object({
      id: z.number(),
      revenueRecognitionMethod: z.enum(["contract_signed", "payment_received", "delivery_completed", "custom"]).optional(),
      budgetLineId: z.number().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = (await getDb())!;
      const { id, ...updates } = input;
      await db.update(erpBudgetRealEstateLinks).set({ ...updates, updatedAt: Date.now() }).where(eq(erpBudgetRealEstateLinks.id, id));
      return { success: true };
    }),

  delete: createProc
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = (await getDb())!;
      await db.delete(erpBudgetRealEstateLinks).where(eq(erpBudgetRealEstateLinks.id, input.id));
      return { success: true };
    }),
});

// --- Actuals Router ---
const actualsRouter = router({
  list: proc
    .input(z.object({
      budgetId: z.number().optional(),
      programId: z.number().optional(),
      periodYear: z.number().optional(),
      periodMonth: z.number().optional(),
    }).optional())
    .query(async ({ input }) => {
      const db = (await getDb())!;
      const conditions = [];
      if (input?.budgetId) conditions.push(eq(erpRealEstateBudgetActuals.budgetId, input.budgetId));
      if (input?.programId) conditions.push(eq(erpRealEstateBudgetActuals.programId, input.programId));
      if (input?.periodYear) conditions.push(eq(erpRealEstateBudgetActuals.periodYear, input.periodYear));
      if (input?.periodMonth) conditions.push(eq(erpRealEstateBudgetActuals.periodMonth, input.periodMonth));
      const where = conditions.length > 0 ? and(...conditions) : undefined;
      return db.select().from(erpRealEstateBudgetActuals).where(where).orderBy(desc(erpRealEstateBudgetActuals.createdAt));
    }),

  summary: proc
    .input(z.object({ budgetId: z.number(), periodYear: z.number() }))
    .query(async ({ input }) => {
      const db = (await getDb())!;
      const actuals = await db.select().from(erpRealEstateBudgetActuals)
        .where(and(
          eq(erpRealEstateBudgetActuals.budgetId, input.budgetId),
          eq(erpRealEstateBudgetActuals.periodYear, input.periodYear),
        ));

      const totalSaleAmount = actuals.reduce((s, a) => s + (a.saleAmount || 0), 0);
      const totalContractSigned = actuals.reduce((s, a) => s + (a.contractSignedAmount || 0), 0);
      const totalCollected = actuals.reduce((s, a) => s + (a.collectedAmount || 0), 0);
      const totalOutstanding = actuals.reduce((s, a) => s + (a.outstandingAmount || 0), 0);
      const totalRecognizedRevenue = actuals.reduce((s, a) => s + (a.recognizedRevenueAmount || 0), 0);
      const totalCost = actuals.reduce((s, a) => s + (a.costAmount || 0), 0);
      const totalMargin = actuals.reduce((s, a) => s + (a.marginAmount || 0), 0);

      // Monthly breakdown
      const monthly: Record<number, { sales: number; collected: number; outstanding: number }> = {};
      for (let m = 1; m <= 12; m++) monthly[m] = { sales: 0, collected: 0, outstanding: 0 };
      for (const a of actuals) {
        monthly[a.periodMonth].sales += a.saleAmount || 0;
        monthly[a.periodMonth].collected += a.collectedAmount || 0;
        monthly[a.periodMonth].outstanding += a.outstandingAmount || 0;
      }

      return {
        totalSaleAmount, totalContractSigned, totalCollected, totalOutstanding,
        totalRecognizedRevenue, totalCost, totalMargin,
        marginRate: totalSaleAmount > 0 ? Math.round((totalMargin / totalSaleAmount) * 10000) / 100 : 0,
        collectionRate: totalContractSigned > 0 ? Math.round((totalCollected / totalContractSigned) * 10000) / 100 : 0,
        monthly: Object.entries(monthly).map(([m, data]) => ({ month: Number(m), ...data })),
        recordCount: actuals.length,
      };
    }),
});

// --- Sync Router ---
const syncRouter = router({
  syncSales: syncProc
    .input(z.object({ budgetId: z.number(), periodYear: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = (await getDb())!;
      const links = await db.select().from(erpBudgetRealEstateLinks)
        .where(eq(erpBudgetRealEstateLinks.budgetId, input.budgetId));
      if (links.length === 0) return { synced: 0, message: "Aucun lien budget-programme configuré" };

      const programIds = links.filter(l => l.programId).map(l => l.programId!);
      if (programIds.length === 0) return { synced: 0, message: "Aucun programme lié" };

      // Get all sales for linked programs in the year
      const yearStart = new Date(input.periodYear, 0, 1).getTime();
      const yearEnd = new Date(input.periodYear, 11, 31, 23, 59, 59).getTime();

      const sales = await db.select().from(erpRealEstateSales)
        .where(and(
          sql`${erpRealEstateSales.programId} IN (${sql.raw(programIds.join(","))})`,
          gte(erpRealEstateSales.saleDate, yearStart),
          lte(erpRealEstateSales.saleDate, yearEnd),
        ));

      let synced = 0;
      const now = Date.now();

      for (const sale of sales) {
        if (!sale.saleDate) continue;
        const saleDate = new Date(sale.saleDate);
        const month = saleDate.getMonth() + 1;

        // Get customer payments for this sale
        const payments = await db.select().from(erpCustomerPayments)
          .where(and(
            eq(erpCustomerPayments.saleId, sale.id),
            eq(erpCustomerPayments.status, "validated"),
          ));
        const collectedAmount = payments.reduce((s, p) => s + (p.amount || 0), 0);
        const outstandingAmount = (sale.totalSaleAmount || 0) - collectedAmount;

        // Find link for this program
        const link = links.find(l => l.programId === sale.programId);

        // Upsert actual
        const existing = await db.select().from(erpRealEstateBudgetActuals)
          .where(and(
            eq(erpRealEstateBudgetActuals.budgetId, input.budgetId),
            eq(erpRealEstateBudgetActuals.saleId, sale.id),
          ));

        const actualData = {
          budgetId: input.budgetId,
          budgetLineId: link?.budgetLineId || null,
          programId: sale.programId,
          projectId: null as number | null,
          unitId: sale.unitId,
          saleId: sale.id,
          customerId: sale.customerId,
          periodMonth: month,
          periodYear: input.periodYear,
          saleAmount: sale.totalSaleAmount || 0,
          contractSignedAmount: (sale.status === "signed" || sale.status === "completed" || sale.status === "delivered") ? (sale.totalSaleAmount || 0) : 0,
          collectedAmount,
          outstandingAmount,
          recognizedRevenueAmount: sale.totalSaleAmount || 0,
          costAmount: 0,
          marginAmount: sale.totalSaleAmount || 0,
          marginRate: "100",
          status: "active" as const,
          sourceSyncAt: now,
        };

        if (existing.length > 0) {
          await db.update(erpRealEstateBudgetActuals).set({ ...actualData, updatedAt: now }).where(eq(erpRealEstateBudgetActuals.id, existing[0].id));
        } else {
          await db.insert(erpRealEstateBudgetActuals).values({ ...actualData, createdAt: now, updatedAt: now });
        }
        synced++;
      }

      await createAuditEvent({ actorId: ctx.user.id, action: "budget_re_sync", targetType: "erp_budget_re_link", targetId: input.budgetId, details: { synced, periodYear: input.periodYear } });
      return { synced, total: sales.length };
    }),
});

// --- Performance Router ---
const performanceRouter = router({
  salesVsBudget: proc
    .input(z.object({ budgetId: z.number(), periodYear: z.number() }))
    .query(async ({ input }) => {
      const db = (await getDb())!;
      // Get budget lines for revenue and sum their monthly amounts
      const budgetLines = await db.select().from(erpBudgetLinesV2)
        .where(and(
          eq(erpBudgetLinesV2.budgetId, input.budgetId),
          eq(erpBudgetLinesV2.lineType, "REVENUE"),
        ));
      let totalBudgetRevenue = 0;
      if (budgetLines.length > 0) {
        const lineIds = budgetLines.map(l => l.id);
        const amounts = await db.select().from(erpBudgetLineAmounts)
          .where(sql`${erpBudgetLineAmounts.budgetLineId} IN (${sql.raw(lineIds.join(","))})`);
        totalBudgetRevenue = amounts.reduce((s, a) => s + (a.plannedAmount || 0), 0);
      }

      // Get actuals
      const actuals = await db.select().from(erpRealEstateBudgetActuals)
        .where(and(
          eq(erpRealEstateBudgetActuals.budgetId, input.budgetId),
          eq(erpRealEstateBudgetActuals.periodYear, input.periodYear),
        ));
      const totalActualRevenue = actuals.reduce((s, a) => s + (a.recognizedRevenueAmount || 0), 0);
      const totalCollected = actuals.reduce((s, a) => s + (a.collectedAmount || 0), 0);

      return {
        budgetRevenue: totalBudgetRevenue,
        actualRevenue: totalActualRevenue,
        collectedRevenue: totalCollected,
        varianceAmount: totalActualRevenue - totalBudgetRevenue,
        variancePercentage: totalBudgetRevenue > 0 ? Math.round(((totalActualRevenue - totalBudgetRevenue) / totalBudgetRevenue) * 10000) / 100 : 0,
        achievementRate: totalBudgetRevenue > 0 ? Math.round((totalActualRevenue / totalBudgetRevenue) * 10000) / 100 : 0,
        collectionRate: totalActualRevenue > 0 ? Math.round((totalCollected / totalActualRevenue) * 10000) / 100 : 0,
      };
    }),

  byProgram: proc
    .input(z.object({ budgetId: z.number(), periodYear: z.number() }))
    .query(async ({ input }) => {
      const db = (await getDb())!;
      const actuals = await db.select().from(erpRealEstateBudgetActuals)
        .where(and(
          eq(erpRealEstateBudgetActuals.budgetId, input.budgetId),
          eq(erpRealEstateBudgetActuals.periodYear, input.periodYear),
        ));
      const programs = await db.select().from(erpRealEstatePrograms);
      const programMap = new Map(programs.map(p => [p.id, p.name]));

      const byProgram: Record<number, { name: string; sales: number; collected: number; outstanding: number; units: number }> = {};
      for (const a of actuals) {
        const pid = a.programId || 0;
        if (!byProgram[pid]) byProgram[pid] = { name: programMap.get(pid) || "Non affecté", sales: 0, collected: 0, outstanding: 0, units: 0 };
        byProgram[pid].sales += a.saleAmount || 0;
        byProgram[pid].collected += a.collectedAmount || 0;
        byProgram[pid].outstanding += a.outstandingAmount || 0;
        byProgram[pid].units += 1;
      }

      return Object.entries(byProgram).map(([id, data]) => ({ programId: Number(id), ...data }));
    }),
});

export const erpBudgetRealEstateRouter = router({
  links: linksRouter,
  actuals: actualsRouter,
  sync: syncRouter,
  performance: performanceRouter,
});
