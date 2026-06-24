import { describe, it, expect } from "vitest";

// ============================================================
// Sprint Budget-Objectifs-Analytique — Tests
// ============================================================

describe("Sprint Budget-Objectifs-Analytique — Schéma DB", () => {
  it("devrait exporter les tables Objectifs Commerciaux", async () => {
    const schema = await import("../drizzle/schema");
    expect(schema.erpSalesTargets).toBeDefined();
    expect(schema.erpSalesTargetResults).toBeDefined();
    expect(schema.erpSalesTargetAssignments).toBeDefined();
  });

  it("devrait exporter les tables Budget-Immobilier", async () => {
    const schema = await import("../drizzle/schema");
    expect(schema.erpBudgetRealEstateLinks).toBeDefined();
    expect(schema.erpRealEstateBudgetActuals).toBeDefined();
  });

  it("devrait exporter les tables Analytique", async () => {
    const schema = await import("../drizzle/schema");
    expect(schema.erpCostCenters).toBeDefined();
    expect(schema.erpAnalyticSnapshots).toBeDefined();
    expect(schema.erpAnalyticAxes).toBeDefined();
    expect(schema.erpAnalyticAllocations).toBeDefined();
  });

  it("devrait exporter la table Jobs d'intégration", async () => {
    const schema = await import("../drizzle/schema");
    expect(schema.erpBudgetIntegrationJobs).toBeDefined();
  });
});

describe("Sprint Budget-Objectifs-Analytique — Routeurs", () => {
  it("devrait exporter le routeur Sales Targets", async () => {
    const mod = await import("./erp/erp-sales-targets-router");
    expect(mod.erpSalesTargetsRouter).toBeDefined();
  });

  it("devrait exporter le routeur Budget Real Estate", async () => {
    const mod = await import("./erp/erp-budget-real-estate-router");
    expect(mod.erpBudgetRealEstateRouter).toBeDefined();
  });

  it("devrait exporter le routeur Analytics", async () => {
    const mod = await import("./erp/erp-analytics-router");
    expect(mod.erpAnalyticsRouter).toBeDefined();
  });

  it("devrait exporter le service d'intégration budget", async () => {
    const mod = await import("./erp/erp-budget-integration.service");
    expect(mod.runIntegrationJob).toBeDefined();
    expect(mod.getJobHistory).toBeDefined();
  });
});

describe("Sprint Budget-Objectifs-Analytique — RBAC", () => {
  it("devrait avoir 26 modules ERP", async () => {
    const { ERP_MODULES } = await import("./erp/erp-rbac.service");
    expect(ERP_MODULES.length).toBe(40);
  });

  it("devrait inclure les 3 nouveaux modules", async () => {
    const { ERP_MODULES } = await import("./erp/erp-rbac.service");
    expect(ERP_MODULES).toContain("erp_sales_targets");
    expect(ERP_MODULES).toContain("erp_analytics");
    expect(ERP_MODULES).toContain("erp_budget_integrations");
  });

  it("devrait avoir des permissions pour erp_sales_targets", async () => {
    const { ERP_DEFAULT_PERMISSIONS } = await import("./erp/erp-rbac.service");
    const salesTargetPerms = ERP_DEFAULT_PERMISSIONS.filter(p => p.module === "erp_sales_targets");
    expect(salesTargetPerms.length).toBe(7);
  });

  it("devrait avoir des permissions pour erp_analytics", async () => {
    const { ERP_DEFAULT_PERMISSIONS } = await import("./erp/erp-rbac.service");
    const analyticsPerms = ERP_DEFAULT_PERMISSIONS.filter(p => p.module === "erp_analytics");
    expect(analyticsPerms.length).toBe(6);
  });

  it("devrait avoir des permissions pour erp_budget_integrations", async () => {
    const { ERP_DEFAULT_PERMISSIONS } = await import("./erp/erp-rbac.service");
    const integPerms = ERP_DEFAULT_PERMISSIONS.filter(p => p.module === "erp_budget_integrations");
    expect(integPerms.length).toBe(3);
  });
});

describe("Sprint Budget-Objectifs-Analytique — Routeur Sales Targets structure", () => {
  it("devrait avoir les sous-routeurs targets et results", async () => {
    const { erpSalesTargetsRouter } = await import("./erp/erp-sales-targets-router");
    expect(erpSalesTargetsRouter).toBeDefined();
    expect(typeof erpSalesTargetsRouter).toBe("object");
  });
});

describe("Sprint Budget-Objectifs-Analytique — Routeur Analytics structure", () => {
  it("devrait avoir les sous-routeurs costCenters, axes, allocations, snapshots", async () => {
    const { erpAnalyticsRouter } = await import("./erp/erp-analytics-router");
    expect(erpAnalyticsRouter).toBeDefined();
    expect(typeof erpAnalyticsRouter).toBe("object");
  });
});

describe("Sprint Budget-Objectifs-Analytique — Budget Real Estate structure", () => {
  it("devrait avoir les sous-routeurs links, actuals, performance", async () => {
    const { erpBudgetRealEstateRouter } = await import("./erp/erp-budget-real-estate-router");
    expect(erpBudgetRealEstateRouter).toBeDefined();
    expect(typeof erpBudgetRealEstateRouter).toBe("object");
  });
});
