import { eq, and, isNull, desc } from "drizzle-orm";
import { getDb } from "../db";
import {
  erpBudgets,
  erpBudgetLines,
  erpInvoices,
  erpPayments,
} from "../../drizzle/schema";

/**
 * Budget Sync Helper
 * 
 * Maps invoice line categories to budget categories:
 * - Invoices from vendors → "materials" or "subcontracting" (based on vendor vs contractor)
 * - Invoices from contractors → "subcontracting"
 * - Default → "other"
 * 
 * Logic:
 * - engagedAmount: sum of approved/partially_paid/paid invoice totals for the project+category
 * - paidAmount: sum of payments on those invoices for the project+category
 */

// Determine budget category from an invoice
function inferBudgetCategory(invoice: { vendorId: number | null; contractorId: number | null }): string {
  if (invoice.contractorId) return "subcontracting";
  if (invoice.vendorId) return "materials";
  return "other";
}

/**
 * Sync a project's budget lines engagedAmount and paidAmount from invoices and payments.
 * 
 * Strategy:
 * 1. Find the latest budget for the project
 * 2. Get all non-deleted invoices for the project that are approved/partially_paid/paid
 * 3. Group invoice totals by inferred budget category → engagedAmount
 * 4. Get all payments for those invoices, group by category → paidAmount
 * 5. Update each budget line's engagedAmount and paidAmount
 * 6. Recalculate budget totals
 */
export async function syncBudgetFromProject(projectId: number): Promise<{ synced: boolean; budgetId?: number; details?: Record<string, { engaged: number; paid: number }> }> {
  const db = (await getDb())!;

  // 1. Find latest budget for this project
  const [budget] = await db.select().from(erpBudgets)
    .where(eq(erpBudgets.projectId, projectId))
    .orderBy(desc(erpBudgets.createdAt))
    .limit(1);

  if (!budget) return { synced: false };

  // 2. Get all non-deleted invoices for the project that are "engaged" (approved or beyond)
  const engagedStatuses = ["approved", "partially_paid", "paid"];
  const invoices = await db.select().from(erpInvoices)
    .where(and(
      eq(erpInvoices.projectId, projectId),
      isNull(erpInvoices.deletedAt)
    ));

  const engagedInvoices = invoices.filter(inv => engagedStatuses.includes(inv.status));

  // 3. Group by inferred budget category
  const categoryTotals: Record<string, { engaged: number; paid: number }> = {};

  for (const inv of engagedInvoices) {
    const cat = inferBudgetCategory(inv);
    if (!categoryTotals[cat]) categoryTotals[cat] = { engaged: 0, paid: 0 };
    categoryTotals[cat].engaged += inv.totalAmount;
  }

  // 4. Get all payments for engaged invoices and group by category
  for (const inv of engagedInvoices) {
    const cat = inferBudgetCategory(inv);
    const payments = await db.select().from(erpPayments)
      .where(eq(erpPayments.invoiceId, inv.id));
    const paidTotal = payments.reduce((sum, p) => sum + p.amount, 0);
    if (!categoryTotals[cat]) categoryTotals[cat] = { engaged: 0, paid: 0 };
    categoryTotals[cat].paid += paidTotal;
  }

  // 5. Update budget lines
  const budgetLines = await db.select().from(erpBudgetLines)
    .where(eq(erpBudgetLines.budgetId, budget.id));

  const now = Date.now();
  for (const line of budgetLines) {
    const totals = categoryTotals[line.category] || { engaged: 0, paid: 0 };
    await db.update(erpBudgetLines).set({
      engagedAmount: totals.engaged,
      paidAmount: totals.paid,
      updatedAt: now,
    }).where(eq(erpBudgetLines.id, line.id));
  }

  // 6. Recalculate budget totals
  const updatedLines = await db.select().from(erpBudgetLines)
    .where(eq(erpBudgetLines.budgetId, budget.id));
  const totalInitial = updatedLines.reduce((s, l) => s + l.initialAmount, 0);
  const totalRevised = updatedLines.reduce((s, l) => s + l.revisedAmount, 0);
  const totalEngaged = updatedLines.reduce((s, l) => s + l.engagedAmount, 0);
  const totalPaid = updatedLines.reduce((s, l) => s + l.paidAmount, 0);

  await db.update(erpBudgets).set({
    totalInitial,
    totalRevised,
    totalEngaged,
    totalPaid,
    updatedAt: now,
  }).where(eq(erpBudgets.id, budget.id));

  return { synced: true, budgetId: budget.id, details: categoryTotals };
}

/**
 * Sync budget for a specific invoice's project.
 * Called after invoice approval, payment creation, or payment deletion.
 */
export async function syncBudgetFromInvoice(invoiceId: number): Promise<{ synced: boolean; budgetId?: number }> {
  const db = (await getDb())!;
  const [invoice] = await db.select().from(erpInvoices)
    .where(eq(erpInvoices.id, invoiceId));

  if (!invoice || !invoice.projectId) return { synced: false };

  return syncBudgetFromProject(invoice.projectId);
}
