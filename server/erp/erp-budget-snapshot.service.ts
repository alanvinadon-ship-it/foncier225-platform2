/**
 * Sprint Budget 2.1 — Service de génération de snapshots P&L et Cash Flow
 * Calcule les agrégats mensuels à partir des lignes budgétaires et stocke les résultats.
 */
import { eq, and, inArray } from "drizzle-orm";
import { getDb } from "../db";
import {
  erpBudgetsV2,
  erpBudgetLinesV2,
  erpBudgetLineAmounts,
  erpBudgetPlSnapshots,
  erpBudgetCashflowSnapshots,
  erpBudgetAlerts,
  erpBudgetSnapshotJobs,
} from "../../drizzle/schema";

const getDatabase = async () => (await getDb())!;

// ─── Types ──────────────────────────────────────────────────
interface SnapshotResult {
  plSnapshots: number;
  cashFlowSnapshots: number;
  alertsCreated: number;
}

// ─── Line type → classification ─────────────────────────────
const REVENUE_TYPES = ["REVENUE", "CASH_IN"];
const DIRECT_COST_TYPES = ["DIRECT_COST"];
const INDIRECT_COST_TYPES = ["OPEX", "INDIRECT_COST", "PAYROLL", "SOCIAL_CHARGES"];
const CAPEX_TYPES = ["CAPEX"];
const TAX_TYPES = ["TAX"];

// ─── Generate P&L Snapshots ─────────────────────────────────
export async function generatePlSnapshots(budgetId: number, months?: number[]): Promise<number> {
  const db = await getDatabase();
  const targetMonths = months || Array.from({ length: 12 }, (_, i) => i + 1);
  let created = 0;

  // Get all lines for this budget
  const lines = await db.select().from(erpBudgetLinesV2)
    .where(and(eq(erpBudgetLinesV2.budgetId, budgetId), eq(erpBudgetLinesV2.isTotalLine, 0)));

  const lineIds = lines.map(l => l.id);
  if (lineIds.length === 0) return 0;

  // Get all amounts for these lines
  const amounts = await db.select().from(erpBudgetLineAmounts)
    .where(inArray(erpBudgetLineAmounts.budgetLineId, lineIds));

  // Group amounts by line and month
  const amountMap = new Map<string, typeof amounts[0]>();
  for (const a of amounts) {
    amountMap.set(`${a.budgetLineId}-${a.monthNumber}`, a);
  }

  for (const month of targetMonths) {
    let revenuePlanned = 0, revenueActual = 0;
    let directCostsPlanned = 0, directCostsActual = 0;
    let indirectCostsPlanned = 0, indirectCostsActual = 0;
    let capexPlanned = 0, capexActual = 0;

    for (const line of lines) {
      const key = `${line.id}-${month}`;
      const amt = amountMap.get(key);
      if (!amt) continue;

      if (REVENUE_TYPES.includes(line.lineType)) {
        revenuePlanned += amt.plannedAmount;
        revenueActual += amt.actualAmount;
      } else if (DIRECT_COST_TYPES.includes(line.lineType)) {
        directCostsPlanned += amt.plannedAmount;
        directCostsActual += amt.actualAmount;
      } else if (INDIRECT_COST_TYPES.includes(line.lineType) || TAX_TYPES.includes(line.lineType)) {
        indirectCostsPlanned += amt.plannedAmount;
        indirectCostsActual += amt.actualAmount;
      } else if (CAPEX_TYPES.includes(line.lineType)) {
        capexPlanned += amt.plannedAmount;
        capexActual += amt.actualAmount;
      }
    }

    const directMarginPlanned = revenuePlanned - directCostsPlanned;
    const directMarginActual = revenueActual - directCostsActual;
    const ebitdaPlanned = directMarginPlanned - indirectCostsPlanned;
    const ebitdaActual = directMarginActual - indirectCostsActual;
    const operatingCashFlowPlanned = ebitdaPlanned - capexPlanned;
    const operatingCashFlowActual = ebitdaActual - capexActual;

    // Upsert snapshot (uses real table column names)
    const existing = await db.select().from(erpBudgetPlSnapshots)
      .where(and(eq(erpBudgetPlSnapshots.budgetId, budgetId), eq(erpBudgetPlSnapshots.monthNumber, month)))
      .limit(1);

    const now = Date.now();
    const data = {
      revenuePlanned, revenueActual,
      directCostsPlanned, directCostsActual,
      directMarginPlanned, directMarginActual,
      indirectCostsPlanned, indirectCostsActual,
      ebitdaPlanned, ebitdaActual,
      capexPlanned, capexActual,
      operatingCashFlowPlanned, operatingCashFlowActual,
      updatedAt: now,
    };

    if (existing.length > 0) {
      await db.update(erpBudgetPlSnapshots).set(data).where(eq(erpBudgetPlSnapshots.id, existing[0].id));
    } else {
      await db.insert(erpBudgetPlSnapshots).values({
        budgetId,
        monthNumber: month,
        ...data,
        createdAt: now,
      });
    }
    created++;
  }

  return created;
}

// ─── Generate Cash Flow Snapshots ───────────────────────────
export async function generateCashFlowSnapshots(budgetId: number, months?: number[]): Promise<number> {
  const db = await getDatabase();
  const targetMonths = months || Array.from({ length: 12 }, (_, i) => i + 1);
  let created = 0;

  const lines = await db.select().from(erpBudgetLinesV2)
    .where(and(eq(erpBudgetLinesV2.budgetId, budgetId), eq(erpBudgetLinesV2.isTotalLine, 0)));

  const lineIds = lines.map(l => l.id);
  if (lineIds.length === 0) return 0;

  const amounts = await db.select().from(erpBudgetLineAmounts)
    .where(inArray(erpBudgetLineAmounts.budgetLineId, lineIds));

  const amountMap = new Map<string, typeof amounts[0]>();
  for (const a of amounts) {
    amountMap.set(`${a.budgetLineId}-${a.monthNumber}`, a);
  }

  let openingBalance = 0;

  for (const month of targetMonths) {
    let cashInPlanned = 0, cashInActual = 0;
    let cashOutPlanned = 0, cashOutActual = 0;
    let opexPlanned = 0, opexActual = 0;
    let capexPlanned = 0, capexActual = 0;
    let taxesPlanned = 0, taxesActual = 0;

    for (const line of lines) {
      const key = `${line.id}-${month}`;
      const amt = amountMap.get(key);
      if (!amt) continue;

      if (REVENUE_TYPES.includes(line.lineType)) {
        cashInPlanned += amt.plannedAmount;
        cashInActual += amt.actualAmount;
      } else if (INDIRECT_COST_TYPES.includes(line.lineType) || DIRECT_COST_TYPES.includes(line.lineType)) {
        cashOutPlanned += amt.plannedAmount;
        cashOutActual += amt.actualAmount;
        opexPlanned += amt.plannedAmount;
        opexActual += amt.actualAmount;
      } else if (CAPEX_TYPES.includes(line.lineType)) {
        cashOutPlanned += amt.plannedAmount;
        cashOutActual += amt.actualAmount;
        capexPlanned += amt.plannedAmount;
        capexActual += amt.actualAmount;
      } else if (TAX_TYPES.includes(line.lineType)) {
        cashOutPlanned += amt.plannedAmount;
        cashOutActual += amt.actualAmount;
        taxesPlanned += amt.plannedAmount;
        taxesActual += amt.actualAmount;
      }
    }

    const netCashFlowPlanned = cashInPlanned - cashOutPlanned;
    const netCashFlowActual = cashInActual - cashOutActual;
    const closingBalance = openingBalance + netCashFlowPlanned;

    const now = Date.now();
    const existing = await db.select().from(erpBudgetCashflowSnapshots)
      .where(and(eq(erpBudgetCashflowSnapshots.budgetId, budgetId), eq(erpBudgetCashflowSnapshots.monthNumber, month)))
      .limit(1);

    const data = {
      cashInPlanned, cashInActual,
      cashOutPlanned, cashOutActual,
      opexPlanned, opexActual,
      capexPlanned, capexActual,
      taxesPlanned, taxesActual,
      netCashFlowPlanned, netCashFlowActual,
      openingCashBalance: openingBalance,
      closingCashBalance: closingBalance,
      updatedAt: now,
    };

    if (existing.length > 0) {
      await db.update(erpBudgetCashflowSnapshots).set(data).where(eq(erpBudgetCashflowSnapshots.id, existing[0].id));
    } else {
      await db.insert(erpBudgetCashflowSnapshots).values({
        budgetId,
        monthNumber: month,
        ...data,
        createdAt: now,
      });
    }

    openingBalance = closingBalance;
    created++;
  }

  return created;
}

// ─── Generate Alerts from Snapshots ─────────────────────────
export async function generateAlertsFromSnapshots(budgetId: number): Promise<number> {
  const db = await getDatabase();
  let alertsCreated = 0;
  const now = Date.now();

  // Check P&L snapshots for negative EBITDA
  const plSnapshots = await db.select().from(erpBudgetPlSnapshots)
    .where(eq(erpBudgetPlSnapshots.budgetId, budgetId));

  for (const snap of plSnapshots) {
    if (snap.ebitdaActual < 0 && snap.ebitdaPlanned >= 0) {
      const existing = await db.select().from(erpBudgetAlerts)
        .where(and(
          eq(erpBudgetAlerts.budgetId, budgetId),
          eq(erpBudgetAlerts.monthNumber, snap.monthNumber),
          eq(erpBudgetAlerts.alertType, "underperformance_revenue"),
          eq(erpBudgetAlerts.status, "active"),
        )).limit(1);

      if (existing.length === 0) {
        await db.insert(erpBudgetAlerts).values({
          budgetId,
          monthNumber: snap.monthNumber,
          alertType: "underperformance_revenue",
          plannedAmount: snap.ebitdaPlanned,
          actualAmount: snap.ebitdaActual,
          varianceAmount: snap.ebitdaActual - snap.ebitdaPlanned,
          variancePercentage: snap.ebitdaPlanned !== 0 ? Math.round(((snap.ebitdaActual - snap.ebitdaPlanned) / Math.abs(snap.ebitdaPlanned)) * 100) : -100,
          message: `EBITDA négatif en mois ${snap.monthNumber} : ${snap.ebitdaActual.toLocaleString()} XOF (prévu : ${snap.ebitdaPlanned.toLocaleString()} XOF)`,
          status: "active",
          createdAt: now,
          updatedAt: now,
        });
        alertsCreated++;
      }
    }
  }

  // Check Cash Flow for negative closing balance
  const cfSnapshots = await db.select().from(erpBudgetCashflowSnapshots)
    .where(eq(erpBudgetCashflowSnapshots.budgetId, budgetId));

  for (const snap of cfSnapshots) {
    if (snap.closingCashBalance < 0) {
      const existing = await db.select().from(erpBudgetAlerts)
        .where(and(
          eq(erpBudgetAlerts.budgetId, budgetId),
          eq(erpBudgetAlerts.monthNumber, snap.monthNumber),
          eq(erpBudgetAlerts.alertType, "cashflow_negative"),
          eq(erpBudgetAlerts.status, "active"),
        )).limit(1);

      if (existing.length === 0) {
        await db.insert(erpBudgetAlerts).values({
          budgetId,
          monthNumber: snap.monthNumber,
          alertType: "cashflow_negative",
          plannedAmount: snap.netCashFlowPlanned,
          actualAmount: snap.netCashFlowActual,
          varianceAmount: snap.closingCashBalance,
          variancePercentage: -100,
          message: `Trésorerie négative en mois ${snap.monthNumber} : solde ${snap.closingCashBalance.toLocaleString()} XOF`,
          status: "active",
          createdAt: now,
          updatedAt: now,
        });
        alertsCreated++;
      }
    }
  }

  return alertsCreated;
}

// ─── Full Snapshot Generation (called by heartbeat or manual) ─
export async function generateAllSnapshots(budgetId: number, triggeredBy: string): Promise<SnapshotResult> {
  const db = await getDatabase();
  const now = Date.now();

  // Create job record
  const [job] = await db.insert(erpBudgetSnapshotJobs).values({
    jobType: triggeredBy === "heartbeat" ? "daily_sync" : "manual_recalculate",
    budgetId,
    status: "running",
    startedAt: now,
    triggeredBy,
    createdAt: now,
    updatedAt: now,
  }).$returningId();

  try {
    const plSnapshots = await generatePlSnapshots(budgetId);
    const cashFlowSnapshots = await generateCashFlowSnapshots(budgetId);
    const alertsCreated = await generateAlertsFromSnapshots(budgetId);

    const finishedAt = Date.now();
    await db.update(erpBudgetSnapshotJobs).set({
      status: "success",
      finishedAt,
      durationMs: finishedAt - now,
      snapshotsCreated: plSnapshots + cashFlowSnapshots,
      alertsCreated,
      updatedAt: finishedAt,
    }).where(eq(erpBudgetSnapshotJobs.id, job.id));

    return { plSnapshots, cashFlowSnapshots, alertsCreated };
  } catch (err: any) {
    const finishedAt = Date.now();
    await db.update(erpBudgetSnapshotJobs).set({
      status: "failed",
      finishedAt,
      durationMs: finishedAt - now,
      errorsCount: 1,
      errorMessage: err.message || "Unknown error",
      updatedAt: finishedAt,
    }).where(eq(erpBudgetSnapshotJobs.id, job.id));
    throw err;
  }
}

// ─── Generate snapshots for ALL active budgets ──────────────
export async function generateSnapshotsForAllBudgets(triggeredBy: string): Promise<{ budgetsProcessed: number; totalPl: number; totalCf: number; totalAlerts: number }> {
  const db = await getDatabase();
  const budgets = await db.select().from(erpBudgetsV2)
    .where(inArray(erpBudgetsV2.status, ["approved", "locked"] as any));

  let budgetsProcessed = 0;
  let totalPl = 0, totalCf = 0, totalAlerts = 0;

  for (const budget of budgets) {
    try {
      const result = await generateAllSnapshots(budget.id, triggeredBy);
      totalPl += result.plSnapshots;
      totalCf += result.cashFlowSnapshots;
      totalAlerts += result.alertsCreated;
      budgetsProcessed++;
    } catch (e) {
      // Continue with next budget
    }
  }

  return { budgetsProcessed, totalPl, totalCf, totalAlerts };
}
