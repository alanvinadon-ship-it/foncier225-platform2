import { eq, and, sql } from "drizzle-orm";
import { getDb } from "../db";
import {
  erpBudgetIntegrationJobs, erpRealEstateBudgetActuals, erpBudgetRealEstateLinks,
  erpRealEstateSales, erpCustomerPayments, erpSalesTargets, erpSalesTargetResults,
  erpAnalyticAllocations, erpAnalyticSnapshots, erpCostCenters, erpRealEstatePrograms,
} from "../../drizzle/schema";

export type JobType = "sync_real_estate_actuals" | "sync_sales_targets" | "generate_analytic_snapshots" | "full_sync";

interface JobResult {
  jobId: number;
  jobType: JobType;
  status: "completed" | "failed";
  recordsProcessed: number;
  errors: string[];
  duration: number;
}

/**
 * Synchronise les ventes immobilières réelles vers les actuals budget
 */
async function syncRealEstateActuals(): Promise<{ processed: number; errors: string[] }> {
  const db = (await getDb())!;
  const errors: string[] = [];
  let processed = 0;

  // Get all active links (no isActive field — use all)
  const links = await db.select().from(erpBudgetRealEstateLinks);

  for (const link of links) {
    try {
      if (!link.programId) continue;
      // Get sales for this program
      const sales = await db.select().from(erpRealEstateSales)
        .where(eq(erpRealEstateSales.programId, link.programId));

      for (const sale of sales) {
        const payments = await db.select().from(erpCustomerPayments)
          .where(eq(erpCustomerPayments.saleId, sale.id));

        for (const payment of payments) {
          if (!payment.paymentDate) continue;
          const payDate = new Date(payment.paymentDate);
          const month = payDate.getMonth() + 1;
          const year = payDate.getFullYear();

          // Check if already synced
          const existing = await db.select().from(erpRealEstateBudgetActuals)
            .where(and(
              eq(erpRealEstateBudgetActuals.budgetId, link.budgetId),
              eq(erpRealEstateBudgetActuals.saleId, sale.id),
              eq(erpRealEstateBudgetActuals.periodMonth, month),
              eq(erpRealEstateBudgetActuals.periodYear, year),
            ));

          if (existing.length === 0) {
            await db.insert(erpRealEstateBudgetActuals).values({
              budgetId: link.budgetId,
              budgetLineId: link.budgetLineId || null,
              programId: link.programId,
              projectId: link.projectId || null,
              unitId: null,
              saleId: sale.id,
              customerId: sale.customerId || null,
              periodMonth: month,
              periodYear: year,
              saleAmount: sale.totalSaleAmount || 0,
              collectedAmount: payment.amount || 0,
              status: "active",
              sourceSyncAt: Date.now(),
              createdAt: Date.now(),
              updatedAt: Date.now(),
            });
            processed++;
          }
        }
      }
    } catch (e: any) {
      errors.push(`Link ${link.id}: ${e.message}`);
    }
  }

  return { processed, errors };
}

/**
 * Synchronise les résultats des objectifs commerciaux
 */
async function syncSalesTargetResults(): Promise<{ processed: number; errors: string[] }> {
  const db = (await getDb())!;
  const errors: string[] = [];
  let processed = 0;

  // Get active targets
  const targets = await db.select().from(erpSalesTargets)
    .where(eq(erpSalesTargets.status, "active"));

  for (const target of targets) {
    try {
      if (!target.programId) continue;
      // Get sales for this target's program
      const sales = await db.select().from(erpRealEstateSales)
        .where(eq(erpRealEstateSales.programId, target.programId));

      // Filter by fiscal year
      const periodSales = sales.filter(s => {
        if (!s.saleDate) return false;
        const d = new Date(s.saleDate);
        return d.getFullYear() === target.fiscalYear;
      });

      // Group by month
      const monthlyData: Record<number, { count: number; amount: number }> = {};
      for (const sale of periodSales) {
        const month = new Date(sale.saleDate!).getMonth() + 1;
        if (!monthlyData[month]) monthlyData[month] = { count: 0, amount: 0 };
        monthlyData[month].count++;
        monthlyData[month].amount += sale.totalSaleAmount || 0;
      }

      // Upsert results for each month
      for (const [monthStr, data] of Object.entries(monthlyData)) {
        const month = parseInt(monthStr);
        const now = Date.now();
        // Use periodStart/periodEnd for the month
        const periodStart = new Date(target.fiscalYear, month - 1, 1).getTime();
        const periodEnd = new Date(target.fiscalYear, month, 0, 23, 59, 59).getTime();

        const existing = await db.select().from(erpSalesTargetResults)
          .where(and(
            eq(erpSalesTargetResults.salesTargetId, target.id),
            eq(erpSalesTargetResults.periodStart, periodStart),
          ));

        const achievementRate = target.targetAmount && target.targetAmount > 0
          ? String(Math.round((data.amount / Number(target.targetAmount)) * 10000) / 100)
          : "0";

        if (existing.length === 0) {
          await db.insert(erpSalesTargetResults).values({
            salesTargetId: target.id,
            periodStart,
            periodEnd,
            actualAmount: data.amount,
            actualUnits: data.count,
            soldUnits: data.count,
            achievementRate,
            sourceSyncAt: now,
            createdAt: now,
            updatedAt: now,
          });
        } else {
          await db.update(erpSalesTargetResults).set({
            actualAmount: data.amount,
            actualUnits: data.count,
            soldUnits: data.count,
            achievementRate,
            sourceSyncAt: now,
            updatedAt: now,
          }).where(eq(erpSalesTargetResults.id, existing[0].id));
        }
        processed++;
      }
    } catch (e: any) {
      errors.push(`Target ${target.id}: ${e.message}`);
    }
  }

  return { processed, errors };
}

/**
 * Génère les snapshots analytiques
 */
async function generateAnalyticSnapshots(): Promise<{ processed: number; errors: string[] }> {
  const db = (await getDb())!;
  const errors: string[] = [];
  let processed = 0;
  const now = Date.now();
  const currentDate = new Date();
  const currentMonth = currentDate.getMonth() + 1;
  const currentYear = currentDate.getFullYear();

  // Get all active cost centers
  const costCenters = await db.select().from(erpCostCenters).where(eq(erpCostCenters.isActive, true));

  for (const cc of costCenters) {
    try {
      const allocations = await db.select().from(erpAnalyticAllocations)
        .where(eq(erpAnalyticAllocations.costCenterId, cc.id));

      const revenue = allocations
        .filter(a => a.sourceType === "real_estate_sale" || a.sourceType === "customer_payment")
        .reduce((s, a) => s + (a.allocatedAmount || a.amount || 0), 0);
      const expense = allocations
        .filter(a => a.sourceType === "expense" || a.sourceType === "invoice" || a.sourceType === "purchase_order")
        .reduce((s, a) => s + (a.allocatedAmount || a.amount || 0), 0);

      await db.insert(erpAnalyticSnapshots).values({
        snapshotDate: now,
        periodMonth: currentMonth,
        periodYear: currentYear,
        costCenterId: cc.id,
        programId: null,
        projectId: null,
        revenueAmount: revenue,
        expenseAmount: expense,
        marginAmount: revenue - expense,
        marginRate: revenue > 0 ? String(Math.round(((revenue - expense) / revenue) * 10000) / 100) : "0",
        budgetAmount: 0,
        actualAmount: revenue + expense,
        varianceAmount: 0,
        variancePercentage: "0",
        createdAt: now,
        updatedAt: now,
      });
      processed++;
    } catch (e: any) {
      errors.push(`CostCenter ${cc.id}: ${e.message}`);
    }
  }

  // Also generate for programs
  const programs = await db.select().from(erpRealEstatePrograms);
  for (const prog of programs) {
    try {
      const allocations = await db.select().from(erpAnalyticAllocations)
        .where(eq(erpAnalyticAllocations.programId, prog.id));

      const revenue = allocations
        .filter(a => a.sourceType === "real_estate_sale" || a.sourceType === "customer_payment")
        .reduce((s, a) => s + (a.allocatedAmount || a.amount || 0), 0);
      const expense = allocations
        .filter(a => a.sourceType === "expense" || a.sourceType === "invoice" || a.sourceType === "purchase_order")
        .reduce((s, a) => s + (a.allocatedAmount || a.amount || 0), 0);

      await db.insert(erpAnalyticSnapshots).values({
        snapshotDate: now,
        periodMonth: currentMonth,
        periodYear: currentYear,
        costCenterId: null,
        programId: prog.id,
        projectId: null,
        revenueAmount: revenue,
        expenseAmount: expense,
        marginAmount: revenue - expense,
        marginRate: revenue > 0 ? String(Math.round(((revenue - expense) / revenue) * 10000) / 100) : "0",
        budgetAmount: 0,
        actualAmount: revenue + expense,
        varianceAmount: 0,
        variancePercentage: "0",
        createdAt: now,
        updatedAt: now,
      });
      processed++;
    } catch (e: any) {
      errors.push(`Program ${prog.id}: ${e.message}`);
    }
  }

  return { processed, errors };
}

/**
 * Exécute un job d'intégration et enregistre le résultat
 */
export async function runIntegrationJob(jobType: JobType, triggeredBy: string = "system"): Promise<JobResult> {
  const db = (await getDb())!;
  const startTime = Date.now();

  // Create job record
  const [jobRecord] = await db.insert(erpBudgetIntegrationJobs).values({
    jobType,
    status: "running",
    startedAt: startTime,
    createdAt: startTime,
  });

  const jobId = jobRecord.insertId;
  let recordsProcessed = 0;
  let errors: string[] = [];

  try {
    switch (jobType) {
      case "sync_real_estate_actuals": {
        const result = await syncRealEstateActuals();
        recordsProcessed = result.processed;
        errors = result.errors;
        break;
      }
      case "sync_sales_targets": {
        const result = await syncSalesTargetResults();
        recordsProcessed = result.processed;
        errors = result.errors;
        break;
      }
      case "generate_analytic_snapshots": {
        const result = await generateAnalyticSnapshots();
        recordsProcessed = result.processed;
        errors = result.errors;
        break;
      }
      case "full_sync": {
        const r1 = await syncRealEstateActuals();
        const r2 = await syncSalesTargetResults();
        const r3 = await generateAnalyticSnapshots();
        recordsProcessed = r1.processed + r2.processed + r3.processed;
        errors = [...r1.errors, ...r2.errors, ...r3.errors];
        break;
      }
    }

    const duration = Date.now() - startTime;

    await db.update(erpBudgetIntegrationJobs).set({
      status: "completed",
      finishedAt: Date.now(),
      durationMs: duration,
      recordsProcessed,
      errorsCount: errors.length,
      errorMessage: errors.length > 0 ? JSON.stringify(errors) : null,
    }).where(eq(erpBudgetIntegrationJobs.id, jobId));

    return { jobId, jobType, status: "completed", recordsProcessed, errors, duration };
  } catch (e: any) {
    const duration = Date.now() - startTime;
    await db.update(erpBudgetIntegrationJobs).set({
      status: "failed",
      finishedAt: Date.now(),
      durationMs: duration,
      recordsProcessed,
      errorsCount: 1,
      errorMessage: e.message,
    }).where(eq(erpBudgetIntegrationJobs.id, jobId));

    return { jobId, jobType, status: "failed", recordsProcessed, errors: [e.message], duration };
  }
}

/**
 * Récupère l'historique des jobs
 */
export async function getJobHistory(limit: number = 20) {
  const db = (await getDb())!;
  return db.select().from(erpBudgetIntegrationJobs)
    .orderBy(sql`${erpBudgetIntegrationJobs.createdAt} DESC`)
    .limit(limit);
}
