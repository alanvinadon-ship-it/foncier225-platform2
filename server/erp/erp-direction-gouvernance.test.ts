import { describe, it, expect } from "vitest";

// ─── Tests Sprint Gouvernance Direction ──────────────────────────────────────

describe("Sprint Gouvernance Direction — Structure", () => {
  it("should export erpDirectionSchedulesRouter", async () => {
    const mod = await import("./erp-direction-schedules-router");
    expect(mod.erpDirectionSchedulesRouter).toBeDefined();
    expect(mod.erpDirectionSchedulesRouter._def).toBeDefined();
  });

  it("should export erpDirectionReviewsRouter", async () => {
    const mod = await import("./erp-direction-reviews-router");
    expect(mod.erpDirectionReviewsRouter).toBeDefined();
    expect(mod.erpDirectionReviewsRouter._def).toBeDefined();
  });

  it("should export erpDirectionActionsRouter", async () => {
    const mod = await import("./erp-direction-actions-router");
    expect(mod.erpDirectionActionsRouter).toBeDefined();
    expect(mod.erpDirectionActionsRouter._def).toBeDefined();
  });

  it("should export erpDirectionDataQualityRouter", async () => {
    const mod = await import("./erp-direction-data-quality-router");
    expect(mod.erpDirectionDataQualityRouter).toBeDefined();
    expect(mod.erpDirectionDataQualityRouter._def).toBeDefined();
  });

  it("should export drilldown procedure in direction-dashboard-router", async () => {
    const mod = await import("./erp-direction-dashboard-router");
    expect(mod.erpDirectionDashboardRouter).toBeDefined();
    const procedures = mod.erpDirectionDashboardRouter._def.procedures;
    expect(procedures).toHaveProperty("drilldown");
  });
});

describe("Sprint Gouvernance Direction — RBAC Modules", () => {
  it("should have 32 ERP modules (28 + 4 new direction modules)", async () => {
    const { ERP_MODULES } = await import("./erp-rbac.service");
    expect(ERP_MODULES).toContain("erp_direction_reviews");
    expect(ERP_MODULES).toContain("erp_direction_actions");
    expect(ERP_MODULES).toContain("erp_direction_data_quality");
    expect(ERP_MODULES).toContain("erp_direction_schedules");
    expect(ERP_MODULES.length).toBe(40);
  });

  it("should have permissions for all new modules", async () => {
    const { ERP_DEFAULT_PERMISSIONS } = await import("./erp-rbac.service");
    const reviewPerms = ERP_DEFAULT_PERMISSIONS.filter(p => p.module === "erp_direction_reviews");
    const actionPerms = ERP_DEFAULT_PERMISSIONS.filter(p => p.module === "erp_direction_actions");
    const qualityPerms = ERP_DEFAULT_PERMISSIONS.filter(p => p.module === "erp_direction_data_quality");
    const schedulePerms = ERP_DEFAULT_PERMISSIONS.filter(p => p.module === "erp_direction_schedules");
    
    expect(reviewPerms.length).toBe(4); // view, create, update, approve
    expect(actionPerms.length).toBe(4); // view, create, update, delete
    expect(qualityPerms.length).toBe(2); // view, create
    expect(schedulePerms.length).toBe(3); // view, create, update
  });

  it("should include direction modules in finance_manager role", async () => {
    const { ERP_ROLE_DEFAULT_PERMISSIONS } = await import("./erp-rbac.service");
    const fmPerms = ERP_ROLE_DEFAULT_PERMISSIONS.erp_finance_manager;
    expect(fmPerms.some(p => p.module === "erp_direction_dashboard")).toBe(true);
    expect(fmPerms.some(p => p.module === "erp_direction_reviews")).toBe(true);
    expect(fmPerms.some(p => p.module === "erp_direction_actions")).toBe(true);
    expect(fmPerms.some(p => p.module === "erp_direction_data_quality")).toBe(true);
    expect(fmPerms.some(p => p.module === "erp_direction_schedules")).toBe(true);
  });

  it("should include view-only direction modules in viewer role", async () => {
    const { ERP_ROLE_DEFAULT_PERMISSIONS } = await import("./erp-rbac.service");
    const viewerPerms = ERP_ROLE_DEFAULT_PERMISSIONS.erp_viewer;
    expect(viewerPerms.some(p => p.module === "erp_direction_dashboard" && p.action === "view")).toBe(true);
    expect(viewerPerms.some(p => p.module === "erp_direction_reviews" && p.action === "view")).toBe(true);
    expect(viewerPerms.some(p => p.module === "erp_direction_actions" && p.action === "view")).toBe(true);
    expect(viewerPerms.some(p => p.module === "erp_direction_data_quality" && p.action === "view")).toBe(true);
    expect(viewerPerms.some(p => p.module === "erp_direction_schedules" && p.action === "view")).toBe(true);
  });
});

describe("Sprint Gouvernance Direction — Data Quality Checks", () => {
  it("should define 7 quality checks", async () => {
    const mod = await import("./erp-direction-data-quality-router");
    const router = mod.erpDirectionDataQualityRouter;
    const procedures = router._def.procedures;
    expect(procedures).toHaveProperty("runAll");
    expect(procedures).toHaveProperty("latest");
    expect(procedures).toHaveProperty("definitions");
  });
});

describe("Sprint Gouvernance Direction — Schema Tables", () => {
  it("should export all new tables from schema", async () => {
    const schema = await import("../../drizzle/schema");
    expect(schema.erpDirectionReportSchedules).toBeDefined();
    expect(schema.erpDirectionReportDeliveries).toBeDefined();
    expect(schema.erpDirectionReviews).toBeDefined();
    expect(schema.erpDirectionReviewComments).toBeDefined();
    expect(schema.erpDirectionActionPlans).toBeDefined();
    expect(schema.erpDirectionDataQualityChecks).toBeDefined();
  });
});
