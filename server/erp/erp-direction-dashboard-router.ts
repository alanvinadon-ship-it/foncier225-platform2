/**
 * erp-direction-dashboard-router.ts
 * 
 * Routeur tRPC pour le Dashboard Direction consolidé.
 * Agrège les données de tous les modules ERP pour une vue 360° :
 * - KPIs globaux (projets, budget, ventes, cash flow, P&L)
 * - Objectifs commerciaux
 * - Budget vs Réalisé
 * - Ventes immobilières
 * - Comptabilité analytique
 * - Alertes critiques
 * 
 * Sprint Direction 360
 */
import { z } from "zod";
import { eq, desc, sql, and, gte, lte, count } from "drizzle-orm";
import { router, erpPermissionProcedure } from "../_core/trpc";
import { getDb } from "../db";
import {
  erpProjects,
  erpBudgets,
  erpBudgetLines,
  erpCashFlows,
  erpProfitabilitySnapshots,
  erpOverrunAlerts,
  erpSalesTargets,
  erpSalesTargetResults,
  erpBudgetPlSnapshots,
  erpBudgetCashflowSnapshots,
  erpRealEstatePrograms,
  erpRealEstateUnits,
  erpRealEstateSales,
  erpRealEstateInstallments,
  erpCostCenters,
  erpAnalyticSnapshots,
  erpInvoices,
  erpPayments,
} from "../../drizzle/schema";

export const erpDirectionDashboardRouter = router({
  /**
   * Résumé global — KPIs principaux pour la direction
   */
  summary: erpPermissionProcedure("erp_budget_integrations", "view")
    .input(z.object({
      year: z.number().optional(),
      periodFrom: z.number().optional(),
      periodTo: z.number().optional(),
    }).optional())
    .query(async ({ input }: any) => {
      const db = (await getDb())!;
      const now = Date.now();

      // Projets actifs
      const [projectsResult] = await db.select({ count: sql<number>`COUNT(*)` })
        .from(erpProjects)
        .where(eq(erpProjects.status, "in_progress"));
      const activeProjects = projectsResult?.count || 0;

      // Budget total
      const budgetRows = await db.select({
        totalInitial: sql<number>`COALESCE(SUM(total_initial), 0)`,
        totalEngaged: sql<number>`COALESCE(SUM(total_engaged), 0)`,
        totalPaid: sql<number>`COALESCE(SUM(total_paid), 0)`,
      }).from(erpBudgets);
      const budgetTotal = budgetRows[0] || { totalInitial: 0, totalEngaged: 0, totalPaid: 0 };

      // Factures impayées
      const [unpaidResult] = await db.select({
        count: sql<number>`COUNT(*)`,
        total: sql<number>`COALESCE(SUM(total_amount), 0)`,
      }).from(erpInvoices).where(
        and(eq(erpInvoices.status, "approved"))
      );

      // Cash flow net (30 derniers jours)
      const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;
      const cashFlowRows = await db.select({
        type: erpCashFlows.type,
        total: sql<number>`COALESCE(SUM(amount), 0)`,
      }).from(erpCashFlows)
        .where(gte(erpCashFlows.createdAt, thirtyDaysAgo))
        .groupBy(erpCashFlows.type);

      const cashIn = cashFlowRows.find(r => r.type === "inflow")?.total || 0;
      const cashOut = cashFlowRows.find(r => r.type === "outflow")?.total || 0;

      // Alertes non acquittées
      const [alertsResult] = await db.select({ count: sql<number>`COUNT(*)` })
        .from(erpOverrunAlerts)
        .where(eq(erpOverrunAlerts.isAcknowledged, false));

      return {
        activeProjects,
        budgetInitial: budgetTotal.totalInitial,
        budgetEngaged: budgetTotal.totalEngaged,
        budgetPaid: budgetTotal.totalPaid,
        budgetConsumptionRate: budgetTotal.totalInitial > 0
          ? Math.round((budgetTotal.totalPaid / budgetTotal.totalInitial) * 100)
          : 0,
        unpaidInvoices: unpaidResult?.count || 0,
        unpaidAmount: unpaidResult?.total || 0,
        cashFlowNet: cashIn - cashOut,
        cashIn,
        cashOut,
        activeAlerts: alertsResult?.count || 0,
      };
    }),

  /**
   * Objectifs commerciaux — progression globale
   */
  salesTargets: erpPermissionProcedure("erp_budget_integrations", "view")
    .query(async () => {
      const db = (await getDb())!;

      const targets = await db.select().from(erpSalesTargets)
        .orderBy(desc(erpSalesTargets.createdAt))
        .limit(10);

      // Enrichir avec les résultats
      const enriched = await Promise.all(targets.map(async (t) => {
        const results = await db.select().from(erpSalesTargetResults)
          .where(eq(erpSalesTargetResults.salesTargetId, t.id));
        const totalAchieved = results.reduce((sum, r) => sum + (r.actualAmount || 0), 0);
        return {
          ...t,
          totalAchieved,
          progressPercent: t.targetAmount ? Math.round((totalAchieved / t.targetAmount) * 100) : 0,
        };
      }));

      return enriched;
    }),

  /**
   * Budget vs Réalisé — par catégorie ou par projet
   */
  budgetVsActual: erpPermissionProcedure("erp_budget_integrations", "view")
    .input(z.object({
      budgetId: z.number().optional(),
      projectId: z.number().optional(),
    }).optional())
    .query(async ({ input }: any) => {
      const db = (await getDb())!;

      let query = db.select().from(erpBudgetLines);
      if (input?.budgetId) {
        query = query.where(eq(erpBudgetLines.budgetId, input.budgetId)) as any;
      }

      const lines = await query;

      // Agréger par catégorie
      const byCategory: Record<string, { category: string; initial: number; revised: number; engaged: number; paid: number }> = {};
      for (const line of lines) {
        const cat = line.category || "Non classé";
        if (!byCategory[cat]) {
          byCategory[cat] = { category: cat, initial: 0, revised: 0, engaged: 0, paid: 0 };
        }
        byCategory[cat].initial += line.initialAmount || 0;
        byCategory[cat].revised += line.revisedAmount || 0;
        byCategory[cat].engaged += line.engagedAmount || 0;
        byCategory[cat].paid += line.paidAmount || 0;
      }

      return Object.values(byCategory);
    }),

  /**
   * Ventes immobilières — KPIs
   */
  realEstate: erpPermissionProcedure("erp_budget_integrations", "view")
    .query(async () => {
      const db = (await getDb())!;

      const [programsCount] = await db.select({ count: sql<number>`COUNT(*)` }).from(erpRealEstatePrograms);
      const [unitsCount] = await db.select({ count: sql<number>`COUNT(*)` }).from(erpRealEstateUnits);
      const [salesCount] = await db.select({
        count: sql<number>`COUNT(*)`,
        totalAmount: sql<number>`COALESCE(SUM(sale_price), 0)`,
      }).from(erpRealEstateSales);

      // Encaissements
      const [installments] = await db.select({
        totalPaid: sql<number>`COALESCE(SUM(CASE WHEN status = 'paid' THEN amount ELSE 0 END), 0)`,
        totalDue: sql<number>`COALESCE(SUM(amount), 0)`,
      }).from(erpRealEstateInstallments);

      return {
        programs: programsCount?.count || 0,
        units: unitsCount?.count || 0,
        sales: salesCount?.count || 0,
        totalSalesAmount: salesCount?.totalAmount || 0,
        totalPaid: installments?.totalPaid || 0,
        totalDue: installments?.totalDue || 0,
        collectionRate: (installments?.totalDue || 0) > 0
          ? Math.round(((installments?.totalPaid || 0) / (installments?.totalDue || 0)) * 100)
          : 0,
      };
    }),

  /**
   * P&L snapshots — données pour graphique
   */
  plSnapshots: erpPermissionProcedure("erp_budget_integrations", "view")
    .input(z.object({ budgetId: z.number().optional(), limit: z.number().default(12) }).optional())
    .query(async ({ input }: any) => {
      const db = (await getDb())!;
      let query = db.select().from(erpBudgetPlSnapshots)
        .orderBy(desc(erpBudgetPlSnapshots.monthNumber))
        .limit(input?.limit || 12);

      if (input?.budgetId) {
        query = query.where(eq(erpBudgetPlSnapshots.budgetId, input.budgetId)) as any;
      }

      return (await query).reverse();
    }),

  /**
   * Cash Flow snapshots — données pour graphique
   */
  cashFlowSnapshots: erpPermissionProcedure("erp_budget_integrations", "view")
    .input(z.object({ budgetId: z.number().optional(), limit: z.number().default(12) }).optional())
    .query(async ({ input }: any) => {
      const db = (await getDb())!;
      let query = db.select().from(erpBudgetCashflowSnapshots)
        .orderBy(desc(erpBudgetCashflowSnapshots.monthNumber))
        .limit(input?.limit || 12);

      if (input?.budgetId) {
        query = query.where(eq(erpBudgetCashflowSnapshots.budgetId, input.budgetId)) as any;
      }

      return (await query).reverse();
    }),

  /**
   * Alertes critiques non acquittées
   */
  alerts: erpPermissionProcedure("erp_budget_integrations", "view")
    .input(z.object({ limit: z.number().default(10) }).optional())
    .query(async ({ input }: any) => {
      const db = (await getDb())!;
      return db.select().from(erpOverrunAlerts)
        .where(eq(erpOverrunAlerts.isAcknowledged, false))
        .orderBy(desc(erpOverrunAlerts.createdAt))
        .limit(input?.limit || 10);
    }),

  /**
   * Rentabilité par projet
   */
  profitability: erpPermissionProcedure("erp_budget_integrations", "view")
    .input(z.object({ limit: z.number().default(10) }).optional())
    .query(async ({ input }: any) => {
      const db = (await getDb())!;
      return db.select().from(erpProfitabilitySnapshots)
        .orderBy(desc(erpProfitabilitySnapshots.snapshotDate))
        .limit(input?.limit || 10);
    }),

  /**
   * Centres de coût — répartition
   */
  costCenters: erpPermissionProcedure("erp_budget_integrations", "view")
    .query(async () => {
      const db = (await getDb())!;
      return db.select().from(erpCostCenters).limit(20);
    }),
});
