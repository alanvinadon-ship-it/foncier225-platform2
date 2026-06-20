import { eq, and, sql, gte, lt, isNull } from "drizzle-orm";
import { getDb } from "../db";
import {
  erpBudgetLinesV2,
  erpBudgetLineAmounts,
  erpBudgetsV2,
  erpInvoices,
  erpPayments,
  erpPurchaseOrders,
} from "../../drizzle/schema";

const getDatabase = async () => (await getDb())!;

/**
 * Sync actual amounts from ERP modules (invoices, payments, POs) into budget line amounts.
 * This service matches budget lines to actual transactions based on line type and date.
 */
export async function syncBudgetActuals(budgetId: number): Promise<{ linesUpdated: number; errors: string[] }> {
  const db = await getDatabase();
  const errors: string[] = [];
  let linesUpdated = 0;

  // Get budget info
  const [budget] = await db.select().from(erpBudgetsV2).where(eq(erpBudgetsV2.id, budgetId)).limit(1);
  if (!budget) return { linesUpdated: 0, errors: ["Budget introuvable"] };

  const fiscalYear = budget.fiscalYear;
  const yearStart = new Date(fiscalYear, 0, 1).getTime();
  const yearEnd = new Date(fiscalYear + 1, 0, 1).getTime();

  // Get all budget lines
  const lines = await db.select().from(erpBudgetLinesV2)
    .where(and(eq(erpBudgetLinesV2.budgetId, budgetId), isNull(erpBudgetLinesV2.deletedAt)));

  if (lines.length === 0) return { linesUpdated: 0, errors: ["Aucune ligne budgétaire"] };

  // Get actual data from invoices (for expenses)
  const invoices = await db.select().from(erpInvoices)
    .where(and(
      gte(erpInvoices.createdAt, yearStart),
      lt(erpInvoices.createdAt, yearEnd),
      eq(erpInvoices.status, "paid"),
    ));

  // Get actual data from payments (for cash flows)
  const payments = await db.select().from(erpPayments)
    .where(and(
      gte(erpPayments.createdAt, yearStart),
      lt(erpPayments.createdAt, yearEnd),
    ));

  // Get PO data (for committed amounts)
  const pos = await db.select().from(erpPurchaseOrders)
    .where(and(
      gte(erpPurchaseOrders.createdAt, yearStart),
      lt(erpPurchaseOrders.createdAt, yearEnd),
    ));

  // Aggregate invoices by month
  const invoicesByMonth: Record<number, number> = {};
  for (const inv of invoices) {
    const month = new Date(inv.createdAt).getMonth() + 1;
    invoicesByMonth[month] = (invoicesByMonth[month] || 0) + (inv.totalAmount || 0);
  }

  // Aggregate payments by month
  const paymentsByMonth: Record<number, number> = {};
  for (const pay of payments) {
    const month = new Date(pay.createdAt).getMonth() + 1;
    paymentsByMonth[month] = (paymentsByMonth[month] || 0) + (pay.amount || 0);
  }

  // Aggregate POs by month (committed)
  const committedByMonth: Record<number, number> = {};
  for (const po of pos) {
    const month = new Date(po.createdAt).getMonth() + 1;
    committedByMonth[month] = (committedByMonth[month] || 0) + (po.totalAmount || 0);
  }

  // Update budget line amounts with actuals
  for (const line of lines) {
    if (line.isTotalLine || line.isCalculatedLine) continue;

    const amounts = await db.select().from(erpBudgetLineAmounts)
      .where(eq(erpBudgetLineAmounts.budgetLineId, line.id));

    for (const amt of amounts) {
      const month = amt.monthNumber;
      let actualAmount = 0;
      let committedAmount = 0;
      let paidAmount = 0;

      // Distribute actuals proportionally based on planned amounts
      const totalPlannedAllLines = lines
        .filter(l => l.lineType === line.lineType && !l.isTotalLine && !l.isCalculatedLine)
        .length;

      if (totalPlannedAllLines > 0) {
        const isExpense = ["DIRECT_COST", "INDIRECT_COST", "OPEX", "CAPEX", "TAX", "PAYROLL", "SOCIAL_CHARGES"].includes(line.lineType);
        const isRevenue = line.lineType === "REVENUE" || line.lineType === "CASH_IN";

        if (isExpense) {
          actualAmount = Math.round((invoicesByMonth[month] || 0) / totalPlannedAllLines);
          committedAmount = Math.round((committedByMonth[month] || 0) / totalPlannedAllLines);
          paidAmount = Math.round((paymentsByMonth[month] || 0) / totalPlannedAllLines);
        } else if (isRevenue) {
          // Revenue comes from payments received
          actualAmount = Math.round((paymentsByMonth[month] || 0) / totalPlannedAllLines);
          paidAmount = actualAmount;
        }
      }

      // Calculate variance
      const varianceAmount = actualAmount - amt.plannedAmount;
      const variancePercentage = amt.plannedAmount !== 0 ? Math.round((varianceAmount / amt.plannedAmount) * 100) : 0;
      const executionRate = amt.plannedAmount !== 0 ? Math.round((actualAmount / amt.plannedAmount) * 100) : 0;

      await db.update(erpBudgetLineAmounts).set({
        actualAmount,
        committedAmount,
        paidAmount,
        invoicedAmount: actualAmount,
        varianceAmount,
        variancePercentage,
        executionRate,
        updatedAt: Date.now(),
      }).where(eq(erpBudgetLineAmounts.id, amt.id));

      linesUpdated++;
    }
  }

  return { linesUpdated, errors };
}

/**
 * Calculate execution summary for a budget
 */
export async function getBudgetExecutionSummary(budgetId: number) {
  const db = await getDatabase();
  const lines = await db.select().from(erpBudgetLinesV2)
    .where(and(eq(erpBudgetLinesV2.budgetId, budgetId), isNull(erpBudgetLinesV2.deletedAt)));

  const lineIds = lines.filter(l => !l.isTotalLine && !l.isCalculatedLine).map(l => l.id);
  if (lineIds.length === 0) return { totalPlanned: 0, totalActual: 0, totalCommitted: 0, executionRate: 0 };

  const amounts = await db.select().from(erpBudgetLineAmounts)
    .where(sql`${erpBudgetLineAmounts.budgetLineId} IN (${sql.raw(lineIds.join(","))})`);

  const totalPlanned = amounts.reduce((s, a) => s + a.plannedAmount, 0);
  const totalActual = amounts.reduce((s, a) => s + a.actualAmount, 0);
  const totalCommitted = amounts.reduce((s, a) => s + a.committedAmount, 0);
  const executionRate = totalPlanned !== 0 ? Math.round((totalActual / totalPlanned) * 100) : 0;

  return { totalPlanned, totalActual, totalCommitted, executionRate };
}
