import { z } from "zod";
import { eq, and, sql } from "drizzle-orm";
import { router, erpProtectedProcedure, erpPermissionProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { erpDashboardWidgets, users } from "../../drizzle/schema";
import { hasErpPermission } from "./erp-rbac.service";

// ============================================================
// ERP DASHBOARD — Types et constantes
// ============================================================

const WIDGET_KEYS = [
  "projects_active",
  "projects_late",
  "tasks_open",
  "milestones_critical",
  "documents_expired",
  "permits_renewal",
  "safety_incidents",
  "equipment_available",
  "equipment_maintenance",
  "stock_critical",
  "material_requests",
  "invoices_unpaid",
  "payments_recent",
  "budget_consumed",
  "cash_flow",
  "profitability",
  "budget_alerts",
] as const;

// Filtres communs pour les requêtes dashboard
const dashboardFiltersSchema = z.object({
  projectId: z.number().optional(),
  period: z.enum(["today", "week", "month", "quarter", "year", "all"]).default("month"),
  status: z.string().optional(),
  responsibleId: z.number().optional(),
}).optional();

// ============================================================
// ERP DASHBOARD ROUTER
// ============================================================

export const erpDashboardRouter = router({
  /**
   * GET /api/erp/dashboard/summary
   * Retourne un résumé global de tous les indicateurs ERP
   */
  summary: erpProtectedProcedure.input(dashboardFiltersSchema).query(async ({ ctx, input }) => {
    const canViewFinance = await hasErpPermission(ctx.user.id, "erp_finance", "view");

    // Données simulées avec fallback propre (modules non encore implémentés)
    const summary = {
      projects: {
        active: 0,
        late: 0,
        tasksOpen: 0,
        milestonesCritical: 0,
        available: false, // Module pas encore implémenté
      },
      compliance: {
        documentsExpired: 0,
        permitsToRenew: 0,
        available: false,
      },
      safety: {
        recentIncidents: 0,
        available: false,
      },
      equipment: {
        available: 0,
        inMaintenance: 0,
        moduleAvailable: false,
      },
      inventory: {
        criticalStock: 0,
        pendingRequests: 0,
        available: false,
      },
      finance: canViewFinance ? {
        unpaidInvoices: 0,
        recentPayments: 0,
        budgetConsumedPercent: 0,
        cashFlow: 0,
        profitability: 0,
        budgetAlerts: 0,
        available: false,
      } : null, // Masqué si pas de permission
      alerts: {
        critical: 0,
        warning: 0,
        info: 0,
      },
      lastUpdated: Date.now(),
      filters: input || { period: "month" },
    };

    return summary;
  }),

  /**
   * GET /api/erp/dashboard/projects
   * Indicateurs projets : actifs, en retard, tâches ouvertes, jalons critiques
   */
  projects: erpPermissionProcedure("erp_projects", "view").input(dashboardFiltersSchema).query(async ({ input }) => {
    // Fallback : module projets pas encore implémenté
    return {
      active: 0,
      late: 0,
      tasksOpen: 0,
      milestonesCritical: 0,
      recentActivity: [],
      statusDistribution: {
        planning: 0,
        inProgress: 0,
        onHold: 0,
        completed: 0,
        cancelled: 0,
      },
      available: false,
      message: "Module Projets en cours de développement (Sprint 3)",
    };
  }),

  /**
   * GET /api/erp/dashboard/finance
   * Indicateurs financiers : factures, paiements, budget, cash flow, rentabilité
   * Protégé par permission erp_finance.view
   */
  finance: erpPermissionProcedure("erp_finance", "view").input(dashboardFiltersSchema).query(async ({ input }) => {
    return {
      unpaidInvoices: { count: 0, totalAmount: 0 },
      recentPayments: { count: 0, totalAmount: 0 },
      budgetConsumed: { percent: 0, amount: 0, total: 0 },
      cashFlow: { current: 0, trend: "stable" as const },
      profitability: { percent: 0, trend: "stable" as const },
      budgetAlerts: [],
      available: false,
      message: "Module Finance en cours de développement (Sprint 4)",
    };
  }),

  /**
   * GET /api/erp/dashboard/safety
   * Indicateurs sécurité : incidents récents
   */
  safety: erpPermissionProcedure("erp_safety", "view").input(dashboardFiltersSchema).query(async ({ input }) => {
    return {
      recentIncidents: 0,
      incidentsByType: {},
      incidentsTrend: [],
      openInvestigations: 0,
      daysWithoutIncident: 0,
      available: false,
      message: "Module Sécurité en cours de développement (Sprint 5)",
    };
  }),

  /**
   * GET /api/erp/dashboard/inventory
   * Indicateurs stocks : stocks critiques, demandes matériel en attente
   */
  inventory: erpPermissionProcedure("erp_inventory", "view").input(dashboardFiltersSchema).query(async ({ input }) => {
    return {
      criticalStock: 0,
      pendingRequests: 0,
      lowStockItems: [],
      recentMovements: [],
      available: false,
      message: "Module Inventaire en cours de développement (Sprint 6)",
    };
  }),

  /**
   * GET /api/erp/dashboard/compliance
   * Indicateurs conformité : documents expirés, permis à renouveler
   */
  compliance: erpPermissionProcedure("erp_compliance", "view").input(dashboardFiltersSchema).query(async ({ input }) => {
    return {
      documentsExpired: 0,
      permitsToRenew: 0,
      upcomingDeadlines: [],
      complianceScore: 0,
      available: false,
      message: "Module Conformité en cours de développement (Sprint 7)",
    };
  }),

  /**
   * GET /api/erp/dashboard/equipment
   * Indicateurs équipements : disponibles, en maintenance
   */
  equipment: erpPermissionProcedure("erp_equipment", "view").input(dashboardFiltersSchema).query(async ({ input }) => {
    return {
      available: 0,
      inMaintenance: 0,
      utilizationRate: 0,
      scheduledMaintenance: [],
      moduleAvailable: false,
      message: "Module Équipements en cours de développement (Sprint 8)",
    };
  }),

  /**
   * GET /api/erp/dashboard/alerts
   * Alertes critiques consolidées de tous les modules
   */
  alerts: erpProtectedProcedure.input(dashboardFiltersSchema).query(async ({ ctx, input }) => {
    const canViewFinance = await hasErpPermission(ctx.user.id, "erp_finance", "view");

    // Alertes consolidées (vides pour l'instant, seront alimentées par les modules)
    const alerts: Array<{
      id: string;
      type: "critical" | "warning" | "info";
      module: string;
      title: string;
      description: string;
      createdAt: number;
    }> = [];

    return {
      alerts,
      summary: {
        critical: alerts.filter(a => a.type === "critical").length,
        warning: alerts.filter(a => a.type === "warning").length,
        info: alerts.filter(a => a.type === "info").length,
      },
      financeAlertsVisible: canViewFinance,
    };
  }),

  /**
   * PUT /api/erp/dashboard/widgets
   * Personnalisation des widgets du dashboard par utilisateur
   */
  updateWidgets: erpProtectedProcedure.input(
    z.object({
      widgets: z.array(z.object({
        widgetKey: z.string(),
        position: z.number().min(0),
        isVisible: z.boolean(),
        settings: z.record(z.string(), z.unknown()).optional(),
      })),
    })
  ).mutation(async ({ ctx, input }) => {
    const db = (await getDb())!;
    const now = Date.now();

    for (const widget of input.widgets) {
      // Upsert : créer ou mettre à jour
      const existing = await db
        .select()
        .from(erpDashboardWidgets)
        .where(and(
          eq(erpDashboardWidgets.userId, ctx.user.id),
          eq(erpDashboardWidgets.widgetKey, widget.widgetKey)
        ))
        .limit(1);

      if (existing.length > 0) {
        await db
          .update(erpDashboardWidgets)
          .set({
            position: widget.position,
            isVisible: widget.isVisible,
            settingsJson: widget.settings || null,
            updatedAt: now,
          })
          .where(eq(erpDashboardWidgets.id, existing[0].id));
      } else {
        await db.insert(erpDashboardWidgets).values({
          userId: ctx.user.id,
          widgetKey: widget.widgetKey,
          position: widget.position,
          isVisible: widget.isVisible,
          settingsJson: widget.settings || null,
          createdAt: now,
          updatedAt: now,
        });
      }
    }

    return { success: true, updatedCount: input.widgets.length };
  }),

  /**
   * GET /api/erp/dashboard/widgets
   * Récupérer la configuration des widgets de l'utilisateur
   */
  getWidgets: erpProtectedProcedure.query(async ({ ctx }) => {
    const db = (await getDb())!;

    const widgets = await db
      .select()
      .from(erpDashboardWidgets)
      .where(eq(erpDashboardWidgets.userId, ctx.user.id))
      .orderBy(erpDashboardWidgets.position);

    // Si pas de widgets configurés, retourner la config par défaut
    if (widgets.length === 0) {
      return WIDGET_KEYS.map((key, idx) => ({
        widgetKey: key,
        position: idx,
        isVisible: true,
        settings: null,
      }));
    }

    return widgets.map(w => ({
      widgetKey: w.widgetKey,
      position: w.position,
      isVisible: w.isVisible,
      settings: w.settingsJson,
    }));
  }),
});
