/**
 * Sprint Budget 2.1 — Seed de données de démonstration Budget 2026
 * Idempotent : ne crée pas de doublons si exécuté plusieurs fois.
 * Identifiable : budgetCode = "DEMO-2026"
 */
import { eq, and } from "drizzle-orm";
import { getDb } from "../db";
import {
  erpBudgetsV2,
  erpBudgetPeriods,
  erpBudgetCategories,
  erpBudgetLinesV2,
  erpBudgetLineAmounts,
  erpBudgetAlerts,
} from "../../drizzle/schema";

const DEMO_BUDGET_CODE = "DEMO-2026";

// ─── Catégories ─────────────────────────────────────────────
const CATEGORIES = [
  { code: "REV", name: "Revenus", type: "REVENUE" as const, sort: 1 },
  { code: "OPEX", name: "Charges Opérationnelles (OPEX)", type: "OPEX" as const, sort: 2 },
  { code: "PAYROLL", name: "Frais de Personnel", type: "PAYROLL" as const, sort: 3 },
  { code: "CAPEX", name: "Investissements (CAPEX)", type: "CAPEX" as const, sort: 4 },
  { code: "TAX", name: "Taxes et Impôts", type: "TAX" as const, sort: 5 },
  { code: "DIRECT", name: "Charges Directes", type: "DIRECT_COST" as const, sort: 6 },
  { code: "INDIRECT", name: "Charges Indirectes", type: "INDIRECT_COST" as const, sort: 7 },
  { code: "CASHIN", name: "Cash In", type: "CASHFLOW" as const, sort: 8 },
  { code: "CASHOUT", name: "Cash Out", type: "CASHFLOW" as const, sort: 9 },
];

// ─── Lignes par catégorie ───────────────────────────────────
const LINES: Record<string, { label: string; type: string; monthly: number[]; actuals?: number[] }[]> = {
  REV: [
    { label: "Orange Danga", type: "REVENUE", monthly: [45000000, 48000000, 52000000, 50000000, 55000000, 60000000, 58000000, 62000000, 65000000, 63000000, 68000000, 72000000], actuals: [43000000, 47000000, 51000000, 49000000, 54000000, 0, 0, 0, 0, 0, 0, 0] },
    { label: "Orange Lumière", type: "REVENUE", monthly: [30000000, 32000000, 35000000, 33000000, 36000000, 38000000, 40000000, 42000000, 44000000, 43000000, 46000000, 50000000], actuals: [29000000, 31000000, 34000000, 32000000, 37000000, 0, 0, 0, 0, 0, 0, 0] },
    { label: "Orange Plateau", type: "REVENUE", monthly: [20000000, 22000000, 25000000, 23000000, 26000000, 28000000, 27000000, 30000000, 32000000, 31000000, 34000000, 38000000], actuals: [19000000, 21000000, 24000000, 22000000, 25000000, 0, 0, 0, 0, 0, 0, 0] },
    { label: "Orange Villa", type: "REVENUE", monthly: [15000000, 16000000, 18000000, 17000000, 19000000, 20000000, 21000000, 22000000, 24000000, 23000000, 25000000, 28000000], actuals: [14000000, 15000000, 17000000, 16000000, 18000000, 0, 0, 0, 0, 0, 0, 0] },
    { label: "CIE", type: "REVENUE", monthly: [8000000, 8500000, 9000000, 8500000, 9500000, 10000000, 10500000, 11000000, 11500000, 11000000, 12000000, 13000000], actuals: [7800000, 8200000, 8800000, 8300000, 9200000, 0, 0, 0, 0, 0, 0, 0] },
    { label: "SODECI", type: "REVENUE", monthly: [5000000, 5200000, 5500000, 5300000, 5800000, 6000000, 6200000, 6500000, 6800000, 6500000, 7000000, 7500000], actuals: [4800000, 5000000, 5300000, 5100000, 5600000, 0, 0, 0, 0, 0, 0, 0] },
    { label: "Formations", type: "REVENUE", monthly: [0, 3000000, 0, 5000000, 0, 3000000, 0, 5000000, 0, 3000000, 0, 5000000], actuals: [0, 2800000, 0, 4500000, 0, 0, 0, 0, 0, 0, 0, 0] },
    { label: "Agiles Suites", type: "REVENUE", monthly: [12000000, 12000000, 12000000, 12000000, 12000000, 12000000, 12000000, 12000000, 12000000, 12000000, 12000000, 12000000], actuals: [12000000, 12000000, 12000000, 12000000, 12000000, 0, 0, 0, 0, 0, 0, 0] },
    { label: "Yajobici", type: "REVENUE", monthly: [2000000, 2500000, 3000000, 3500000, 4000000, 4500000, 5000000, 5500000, 6000000, 6500000, 7000000, 8000000], actuals: [1800000, 2300000, 2800000, 3200000, 3800000, 0, 0, 0, 0, 0, 0, 0] },
    { label: "Autres revenus", type: "REVENUE", monthly: [1000000, 1000000, 1500000, 1000000, 1500000, 2000000, 1500000, 2000000, 2500000, 2000000, 2500000, 3000000], actuals: [900000, 1100000, 1400000, 1000000, 1600000, 0, 0, 0, 0, 0, 0, 0] },
  ],
  OPEX: [
    { label: "Achat de fournitures", type: "OPEX", monthly: [3000000, 2500000, 3500000, 2800000, 3200000, 3000000, 2800000, 3500000, 3000000, 2800000, 3200000, 4000000], actuals: [3200000, 2600000, 3800000, 2900000, 3500000, 0, 0, 0, 0, 0, 0, 0] },
    { label: "Charges externes", type: "OPEX", monthly: [5000000, 5000000, 5000000, 5000000, 5000000, 5000000, 5000000, 5000000, 5000000, 5000000, 5000000, 5000000], actuals: [5200000, 5100000, 5300000, 5000000, 5400000, 0, 0, 0, 0, 0, 0, 0] },
    { label: "Fonctionnement direction", type: "OPEX", monthly: [8000000, 8000000, 8000000, 8000000, 8000000, 8000000, 8000000, 8000000, 8000000, 8000000, 8000000, 8000000], actuals: [8500000, 8200000, 8100000, 8300000, 8600000, 0, 0, 0, 0, 0, 0, 0] },
    { label: "Marketing et communication", type: "OPEX", monthly: [4000000, 6000000, 5000000, 4000000, 7000000, 8000000, 5000000, 4000000, 6000000, 5000000, 8000000, 10000000], actuals: [4200000, 6500000, 5200000, 4100000, 7500000, 0, 0, 0, 0, 0, 0, 0] },
    { label: "Exploitation technique", type: "OPEX", monthly: [6000000, 6000000, 6000000, 6000000, 6000000, 6000000, 6000000, 6000000, 6000000, 6000000, 6000000, 6000000], actuals: [6100000, 5900000, 6200000, 6000000, 6300000, 0, 0, 0, 0, 0, 0, 0] },
    { label: "Transport et missions", type: "OPEX", monthly: [2000000, 2500000, 3000000, 2000000, 3500000, 4000000, 2500000, 3000000, 3500000, 2500000, 3000000, 4000000], actuals: [2200000, 2700000, 3200000, 2100000, 3800000, 0, 0, 0, 0, 0, 0, 0] },
    { label: "Frais administratifs", type: "OPEX", monthly: [1500000, 1500000, 1500000, 1500000, 1500000, 1500000, 1500000, 1500000, 1500000, 1500000, 1500000, 1500000], actuals: [1600000, 1500000, 1500000, 1500000, 1600000, 0, 0, 0, 0, 0, 0, 0] },
    { label: "Maintenance", type: "OPEX", monthly: [2000000, 2000000, 2000000, 2000000, 2000000, 2000000, 2000000, 2000000, 2000000, 2000000, 2000000, 2000000], actuals: [2100000, 2000000, 2200000, 2000000, 2100000, 0, 0, 0, 0, 0, 0, 0] },
    { label: "Communication", type: "OPEX", monthly: [1000000, 1000000, 1000000, 1000000, 1000000, 1000000, 1000000, 1000000, 1000000, 1000000, 1000000, 1000000], actuals: [1000000, 1000000, 1000000, 1000000, 1000000, 0, 0, 0, 0, 0, 0, 0] },
    { label: "Loyer", type: "OPEX", monthly: [5000000, 5000000, 5000000, 5000000, 5000000, 5000000, 5000000, 5000000, 5000000, 5000000, 5000000, 5000000], actuals: [5000000, 5000000, 5000000, 5000000, 5000000, 0, 0, 0, 0, 0, 0, 0] },
    { label: "Services divers", type: "OPEX", monthly: [1500000, 1500000, 1500000, 1500000, 1500000, 1500000, 1500000, 1500000, 1500000, 1500000, 1500000, 1500000], actuals: [1600000, 1500000, 1700000, 1500000, 1600000, 0, 0, 0, 0, 0, 0, 0] },
  ],
  PAYROLL: [
    { label: "Salaires", type: "PAYROLL", monthly: [25000000, 25000000, 25000000, 25000000, 25000000, 25000000, 25000000, 25000000, 25000000, 25000000, 25000000, 25000000], actuals: [25000000, 25000000, 25000000, 25000000, 25000000, 0, 0, 0, 0, 0, 0, 0] },
    { label: "CNPS", type: "PAYROLL", monthly: [4500000, 4500000, 4500000, 4500000, 4500000, 4500000, 4500000, 4500000, 4500000, 4500000, 4500000, 4500000], actuals: [4500000, 4500000, 4500000, 4500000, 4500000, 0, 0, 0, 0, 0, 0, 0] },
    { label: "CMU", type: "PAYROLL", monthly: [1200000, 1200000, 1200000, 1200000, 1200000, 1200000, 1200000, 1200000, 1200000, 1200000, 1200000, 1200000], actuals: [1200000, 1200000, 1200000, 1200000, 1200000, 0, 0, 0, 0, 0, 0, 0] },
    { label: "ITS", type: "PAYROLL", monthly: [3000000, 3000000, 3000000, 3000000, 3000000, 3000000, 3000000, 3000000, 3000000, 3000000, 3000000, 3000000], actuals: [3000000, 3000000, 3000000, 3000000, 3000000, 0, 0, 0, 0, 0, 0, 0] },
    { label: "TSE", type: "PAYROLL", monthly: [800000, 800000, 800000, 800000, 800000, 800000, 800000, 800000, 800000, 800000, 800000, 800000], actuals: [800000, 800000, 800000, 800000, 800000, 0, 0, 0, 0, 0, 0, 0] },
    { label: "Primes", type: "PAYROLL", monthly: [0, 0, 5000000, 0, 0, 5000000, 0, 0, 5000000, 0, 0, 10000000], actuals: [0, 0, 5000000, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
    { label: "Indemnités", type: "PAYROLL", monthly: [2000000, 2000000, 2000000, 2000000, 2000000, 2000000, 2000000, 2000000, 2000000, 2000000, 2000000, 2000000], actuals: [2000000, 2000000, 2000000, 2000000, 2000000, 0, 0, 0, 0, 0, 0, 0] },
  ],
  CAPEX: [
    { label: "Ordinateurs portables", type: "CAPEX", monthly: [0, 15000000, 0, 0, 0, 10000000, 0, 0, 0, 0, 15000000, 0], actuals: [0, 14500000, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
    { label: "Desktop", type: "CAPEX", monthly: [0, 8000000, 0, 0, 0, 0, 0, 0, 0, 0, 8000000, 0], actuals: [0, 8200000, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
    { label: "Serveurs", type: "CAPEX", monthly: [0, 0, 25000000, 0, 0, 0, 0, 0, 0, 0, 0, 0], actuals: [0, 0, 27000000, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
    { label: "Scanner", type: "CAPEX", monthly: [0, 3000000, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], actuals: [0, 3200000, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
    { label: "Imprimante multifonction", type: "CAPEX", monthly: [0, 5000000, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], actuals: [0, 5500000, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
    { label: "Vidéoprojecteur", type: "CAPEX", monthly: [0, 2000000, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], actuals: [0, 2000000, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
    { label: "Véhicules", type: "CAPEX", monthly: [0, 0, 0, 35000000, 0, 0, 0, 0, 0, 0, 0, 0], actuals: [0, 0, 0, 36000000, 0, 0, 0, 0, 0, 0, 0, 0] },
    { label: "Licences", type: "CAPEX", monthly: [5000000, 0, 0, 0, 0, 5000000, 0, 0, 0, 0, 0, 5000000], actuals: [5000000, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
    { label: "Agréments", type: "CAPEX", monthly: [0, 0, 0, 0, 0, 3000000, 0, 0, 0, 0, 0, 0], actuals: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
    { label: "Aménagement bureau", type: "CAPEX", monthly: [0, 0, 0, 0, 0, 0, 0, 0, 0, 12000000, 0, 0], actuals: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
  ],
  TAX: [
    { label: "TVA collectée", type: "TAX", monthly: [8000000, 8500000, 9000000, 8500000, 9500000, 10000000, 10500000, 11000000, 11500000, 11000000, 12000000, 13000000], actuals: [7800000, 8200000, 8800000, 8300000, 9200000, 0, 0, 0, 0, 0, 0, 0] },
    { label: "Impôt BIC", type: "TAX", monthly: [0, 0, 15000000, 0, 0, 0, 0, 0, 15000000, 0, 0, 0], actuals: [0, 0, 15000000, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
    { label: "Patente", type: "TAX", monthly: [0, 5000000, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], actuals: [0, 5000000, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
  ],
  DIRECT: [
    { label: "Sous-traitance chantiers", type: "DIRECT_COST", monthly: [10000000, 12000000, 15000000, 13000000, 14000000, 16000000, 15000000, 17000000, 18000000, 16000000, 15000000, 14000000], actuals: [10500000, 12500000, 15500000, 13500000, 14500000, 0, 0, 0, 0, 0, 0, 0] },
    { label: "Matériaux construction", type: "DIRECT_COST", monthly: [8000000, 9000000, 10000000, 9500000, 11000000, 12000000, 11000000, 13000000, 14000000, 12000000, 11000000, 10000000], actuals: [8500000, 9500000, 10500000, 10000000, 11500000, 0, 0, 0, 0, 0, 0, 0] },
  ],
  INDIRECT: [
    { label: "Frais généraux siège", type: "INDIRECT_COST", monthly: [3000000, 3000000, 3000000, 3000000, 3000000, 3000000, 3000000, 3000000, 3000000, 3000000, 3000000, 3000000], actuals: [3100000, 3000000, 3100000, 3000000, 3200000, 0, 0, 0, 0, 0, 0, 0] },
    { label: "Assurances", type: "INDIRECT_COST", monthly: [2000000, 2000000, 2000000, 2000000, 2000000, 2000000, 2000000, 2000000, 2000000, 2000000, 2000000, 2000000], actuals: [2000000, 2000000, 2000000, 2000000, 2000000, 0, 0, 0, 0, 0, 0, 0] },
  ],
  CASHIN: [
    { label: "Encaissements clients", type: "CASH_IN", monthly: [120000000, 130000000, 140000000, 135000000, 145000000, 155000000, 150000000, 160000000, 170000000, 165000000, 175000000, 190000000], actuals: [115000000, 125000000, 135000000, 130000000, 140000000, 0, 0, 0, 0, 0, 0, 0] },
    { label: "Subventions reçues", type: "CASH_IN", monthly: [0, 0, 0, 20000000, 0, 0, 0, 0, 0, 0, 0, 0], actuals: [0, 0, 0, 18000000, 0, 0, 0, 0, 0, 0, 0, 0] },
  ],
  CASHOUT: [
    { label: "Décaissements fournisseurs", type: "CASH_OUT", monthly: [80000000, 85000000, 90000000, 87000000, 92000000, 95000000, 93000000, 98000000, 100000000, 97000000, 95000000, 100000000], actuals: [82000000, 87000000, 92000000, 89000000, 94000000, 0, 0, 0, 0, 0, 0, 0] },
    { label: "Salaires versés", type: "CASH_OUT", monthly: [36500000, 36500000, 41500000, 36500000, 36500000, 41500000, 36500000, 36500000, 41500000, 36500000, 36500000, 46500000], actuals: [36500000, 36500000, 41500000, 36500000, 36500000, 0, 0, 0, 0, 0, 0, 0] },
    { label: "Impôts et taxes", type: "CASH_OUT", monthly: [8000000, 13500000, 24000000, 8500000, 9500000, 10000000, 10500000, 11000000, 26500000, 11000000, 12000000, 13000000], actuals: [7800000, 13200000, 23800000, 8300000, 9200000, 0, 0, 0, 0, 0, 0, 0] },
  ],
};

const MONTH_LABELS = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"];

export async function seedBudget2026(userId: number): Promise<{ created: boolean; budgetId: number; stats: { categories: number; lines: number; amounts: number; alerts: number } }> {
  const db = (await getDb())!;
  const now = Date.now();

  // Check idempotency
  const existing = await db.select().from(erpBudgetsV2).where(eq(erpBudgetsV2.budgetCode, DEMO_BUDGET_CODE)).limit(1);
  if (existing.length > 0) {
    return { created: false, budgetId: existing[0].id, stats: { categories: 0, lines: 0, amounts: 0, alerts: 0 } };
  }

  // 1. Create budget
  const [budget] = await db.insert(erpBudgetsV2).values({
    budgetCode: DEMO_BUDGET_CODE,
    name: "Budget Prévisionnel 2026",
    description: "Budget de démonstration — Exercice 2026. Données fictives pour test et validation du module.",
    fiscalYear: 2026,
    currency: "XOF",
    status: "approved",
    scenarioType: "initial_budget",
    createdBy: userId,
    approvedBy: userId,
    approvedAt: now,
    createdAt: now,
    updatedAt: now,
  }).$returningId();

  const budgetId = budget.id;

  // 2. Create periods (Jan-Dec 2026)
  const periodValues = MONTH_LABELS.map((label, i) => ({
    budgetId,
    fiscalYear: 2026,
    periodNumber: i + 1,
    periodMonth: i + 1,
    periodLabel: label,
    startDate: new Date(2026, i, 1).getTime(),
    endDate: new Date(2026, i + 1, 0).getTime(),
    status: i < 5 ? "closed" as const : "open" as const,
    createdAt: now,
    updatedAt: now,
  }));
  await db.insert(erpBudgetPeriods).values(periodValues);

  // 3. Create categories
  let totalCategories = 0;
  let totalLines = 0;
  let totalAmounts = 0;
  let totalAlerts = 0;
  const categoryMap: Record<string, number> = {};

  for (const cat of CATEGORIES) {
    const [inserted] = await db.insert(erpBudgetCategories).values({
      budgetId,
      code: cat.code,
      name: cat.name,
      categoryType: cat.type,
      sortOrder: cat.sort,
      createdAt: now,
      updatedAt: now,
    }).$returningId();
    categoryMap[cat.code] = inserted.id;
    totalCategories++;
  }

  // 4. Create lines and amounts
  for (const [catCode, lines] of Object.entries(LINES)) {
    const categoryId = categoryMap[catCode];
    if (!categoryId) continue;

    for (let idx = 0; idx < lines.length; idx++) {
      const line = lines[idx];
      const [insertedLine] = await db.insert(erpBudgetLinesV2).values({
        budgetId,
        categoryId,
        lineLabel: line.label,
        lineType: line.type as any,
        lineCode: `${catCode}-${String(idx + 1).padStart(3, "0")}`,
        sortOrder: idx + 1,
        isInputLine: 1,
        isTotalLine: 0,
        isCalculatedLine: 0,
        createdAt: now,
        updatedAt: now,
      }).$returningId();
      totalLines++;

      // Create monthly amounts
      const amountValues = line.monthly.map((planned, monthIdx) => {
        const actual = line.actuals ? line.actuals[monthIdx] : 0;
        const variance = actual - planned;
        const variancePct = planned > 0 ? Math.round((variance / planned) * 100) : 0;
        const execRate = planned > 0 ? Math.round((actual / planned) * 100) : 0;
        return {
          budgetLineId: insertedLine.id,
          monthNumber: monthIdx + 1,
          plannedAmount: planned,
          actualAmount: actual,
          committedAmount: 0,
          paidAmount: actual,
          invoicedAmount: actual,
          varianceAmount: variance,
          variancePercentage: variancePct,
          executionRate: execRate,
          currency: "XOF",
          createdAt: now,
          updatedAt: now,
        };
      });
      await db.insert(erpBudgetLineAmounts).values(amountValues);
      totalAmounts += 12;

      // Generate alerts for overruns (actual > planned by >10%)
      if (line.actuals) {
        for (let m = 0; m < line.actuals.length; m++) {
          const actual = line.actuals[m];
          const planned = line.monthly[m];
          if (planned > 0 && actual > 0) {
            const variancePct = Math.round(((actual - planned) / planned) * 100);
            if (variancePct > 10 && (line.type === "OPEX" || line.type === "CAPEX" || line.type === "PAYROLL")) {
              await db.insert(erpBudgetAlerts).values({
                budgetId,
                budgetLineId: insertedLine.id,
                monthNumber: m + 1,
                alertType: line.type === "CAPEX" ? "capex_overrun" : "overrun",
                thresholdPercentage: 10,
                plannedAmount: planned,
                actualAmount: actual,
                varianceAmount: actual - planned,
                variancePercentage: variancePct,
                message: `Dépassement de ${variancePct}% sur "${line.label}" en ${MONTH_LABELS[m]}`,
                status: "active",
                createdAt: now,
                updatedAt: now,
              });
              totalAlerts++;
            }
          }
        }
      }
    }
  }

  return { created: true, budgetId, stats: { categories: totalCategories, lines: totalLines, amounts: totalAmounts, alerts: totalAlerts } };
}

export async function cleanBudget2026(): Promise<{ deleted: boolean }> {
  const db = (await getDb())!;
  const existing = await db.select().from(erpBudgetsV2).where(eq(erpBudgetsV2.budgetCode, DEMO_BUDGET_CODE)).limit(1);
  if (existing.length === 0) return { deleted: false };

  const budgetId = existing[0].id;

  // Delete in reverse dependency order
  const lines = await db.select({ id: erpBudgetLinesV2.id }).from(erpBudgetLinesV2).where(eq(erpBudgetLinesV2.budgetId, budgetId));
  for (const line of lines) {
    await db.delete(erpBudgetLineAmounts).where(eq(erpBudgetLineAmounts.budgetLineId, line.id));
  }
  await db.delete(erpBudgetAlerts).where(eq(erpBudgetAlerts.budgetId, budgetId));
  await db.delete(erpBudgetLinesV2).where(eq(erpBudgetLinesV2.budgetId, budgetId));
  await db.delete(erpBudgetCategories).where(eq(erpBudgetCategories.budgetId, budgetId));
  await db.delete(erpBudgetPeriods).where(eq(erpBudgetPeriods.budgetId, budgetId));
  await db.delete(erpBudgetsV2).where(eq(erpBudgetsV2.id, budgetId));

  return { deleted: true };
}
