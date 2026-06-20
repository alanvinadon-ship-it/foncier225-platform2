import { describe, it, expect } from "vitest";
import { ERP_MODULES, ERP_DEFAULT_PERMISSIONS, ERP_ROLE_DEFAULT_PERMISSIONS } from "./erp/erp-rbac.service";

// ============================================================
// Sprint 22 Tests — Vente Immobilière + Comptabilité Générale
// ============================================================

describe("Sprint 22 — RBAC Modules", () => {
  it("should include erp_real_estate module", () => {
    expect(ERP_MODULES).toContain("erp_real_estate");
  });

  it("should include erp_full_accounting module", () => {
    expect(ERP_MODULES).toContain("erp_full_accounting");
  });

  it("should have erp_real_estate permissions defined", () => {
    const realEstatePerms = ERP_DEFAULT_PERMISSIONS.filter(p => p.module === "erp_real_estate");
    expect(realEstatePerms.length).toBeGreaterThanOrEqual(5);
    const actions = realEstatePerms.map(p => p.action);
    expect(actions).toContain("view");
    expect(actions).toContain("create");
    expect(actions).toContain("update");
    expect(actions).toContain("delete");
    expect(actions).toContain("approve");
  });

  it("should have erp_full_accounting permissions defined", () => {
    const accountingPerms = ERP_DEFAULT_PERMISSIONS.filter(p => p.module === "erp_full_accounting");
    expect(accountingPerms.length).toBeGreaterThanOrEqual(5);
    const actions = accountingPerms.map(p => p.action);
    expect(actions).toContain("view");
    expect(actions).toContain("create");
    expect(actions).toContain("update");
    expect(actions).toContain("approve");
    expect(actions).toContain("export");
  });

  it("finance_manager role should have erp_real_estate access", () => {
    const fmPerms = ERP_ROLE_DEFAULT_PERMISSIONS.erp_finance_manager;
    const realEstatePerms = fmPerms.filter(p => p.module === "erp_real_estate");
    expect(realEstatePerms.length).toBeGreaterThan(0);
    expect(realEstatePerms.map(p => p.action)).toContain("view");
  });

  it("finance_manager role should have erp_full_accounting access", () => {
    const fmPerms = ERP_ROLE_DEFAULT_PERMISSIONS.erp_finance_manager;
    const accountingPerms = fmPerms.filter(p => p.module === "erp_full_accounting");
    expect(accountingPerms.length).toBeGreaterThan(0);
    expect(accountingPerms.map(p => p.action)).toContain("view");
    expect(accountingPerms.map(p => p.action)).toContain("create");
  });

  it("viewer role should have read-only access to new modules", () => {
    const viewerPerms = ERP_ROLE_DEFAULT_PERMISSIONS.erp_viewer;
    const realEstatePerms = viewerPerms.filter(p => p.module === "erp_real_estate");
    const accountingPerms = viewerPerms.filter(p => p.module === "erp_full_accounting");
    expect(realEstatePerms.length).toBe(1);
    expect(realEstatePerms[0].action).toBe("view");
    expect(accountingPerms.length).toBe(1);
    expect(accountingPerms[0].action).toBe("view");
  });

  it("super_admin should have all permissions including new modules", () => {
    const superAdminPerms = ERP_ROLE_DEFAULT_PERMISSIONS.erp_super_admin;
    const realEstatePerms = superAdminPerms.filter(p => p.module === "erp_real_estate");
    const accountingPerms = superAdminPerms.filter(p => p.module === "erp_full_accounting");
    expect(realEstatePerms.length).toBeGreaterThanOrEqual(5);
    expect(accountingPerms.length).toBeGreaterThanOrEqual(5);
  });
});

describe("Sprint 22 — Real Estate Router", () => {
  it("should export real estate router module", async () => {
    const mod = await import("./erp/erp-real-estate-router");
    expect(mod.realEstateRouter).toBeDefined();
  });

  it("real estate router should have programs procedures", async () => {
    const mod = await import("./erp/erp-real-estate-router");
    const router = mod.realEstateRouter;
    // Check that the router has the expected procedure keys
    const routerKeys = Object.keys(router);
    expect(routerKeys).toContain("programs");
  });

  it("real estate router should have units procedures", async () => {
    const mod = await import("./erp/erp-real-estate-router");
    const router = mod.realEstateRouter;
    const routerKeys = Object.keys(router);
    expect(routerKeys).toContain("units");
  });

  it("real estate router should have customers procedures", async () => {
    const mod = await import("./erp/erp-real-estate-router");
    const router = mod.realEstateRouter;
    const routerKeys = Object.keys(router);
    expect(routerKeys).toContain("customers");
  });

  it("real estate router should have sales procedures", async () => {
    const mod = await import("./erp/erp-real-estate-router");
    const router = mod.realEstateRouter;
    const routerKeys = Object.keys(router);
    expect(routerKeys).toContain("sales");
  });

  it("real estate router should have reservations procedures", async () => {
    const mod = await import("./erp/erp-real-estate-router");
    const router = mod.realEstateRouter;
    const routerKeys = Object.keys(router);
    expect(routerKeys).toContain("reservations");
  });

  it("real estate router should have customerPayments procedures", async () => {
    const mod = await import("./erp/erp-real-estate-router");
    const router = mod.realEstateRouter;
    const routerKeys = Object.keys(router);
    expect(routerKeys).toContain("customerPayments");
  });

  it("real estate router should have deliveries procedures", async () => {
    const mod = await import("./erp/erp-real-estate-router");
    const router = mod.realEstateRouter;
    const routerKeys = Object.keys(router);
    expect(routerKeys).toContain("deliveries");
  });

  it("real estate router should have commissions procedures", async () => {
    const mod = await import("./erp/erp-real-estate-router");
    const router = mod.realEstateRouter;
    const routerKeys = Object.keys(router);
    expect(routerKeys).toContain("commissions");
  });
});

describe("Sprint 22 — Full Accounting Router", () => {
  it("should export full accounting router module", async () => {
    const mod = await import("./erp/erp-full-accounting-router");
    expect(mod.fullAccountingRouter).toBeDefined();
  });

  it("full accounting router should have journals procedures", async () => {
    const mod = await import("./erp/erp-full-accounting-router");
    const router = mod.fullAccountingRouter;
    const routerKeys = Object.keys(router);
    expect(routerKeys).toContain("journals");
  });

  it("full accounting router should have entries procedures", async () => {
    const mod = await import("./erp/erp-full-accounting-router");
    const router = mod.fullAccountingRouter;
    const routerKeys = Object.keys(router);
    expect(routerKeys).toContain("entries");
  });

  it("full accounting router should have reports procedures", async () => {
    const mod = await import("./erp/erp-full-accounting-router");
    const router = mod.fullAccountingRouter;
    const routerKeys = Object.keys(router);
    expect(routerKeys).toContain("reports");
  });

  it("full accounting router should have thirdParties procedures", async () => {
    const mod = await import("./erp/erp-full-accounting-router");
    const router = mod.fullAccountingRouter;
    const routerKeys = Object.keys(router);
    expect(routerKeys).toContain("thirdParties");
  });
});

describe("Sprint 22 — Database Schema (Real Estate tables)", () => {
  it("should export erpRealEstatePrograms table", async () => {
    const schema = await import("../drizzle/schema");
    expect(schema.erpRealEstatePrograms).toBeDefined();
  });

  it("should export erpRealEstateBuildings table", async () => {
    const schema = await import("../drizzle/schema");
    expect(schema.erpRealEstateBuildings).toBeDefined();
  });

  it("should export erpRealEstateUnits table", async () => {
    const schema = await import("../drizzle/schema");
    expect(schema.erpRealEstateUnits).toBeDefined();
  });

  it("should export erpRealEstateCustomers table", async () => {
    const schema = await import("../drizzle/schema");
    expect(schema.erpRealEstateCustomers).toBeDefined();
  });

  it("should export erpRealEstateReservations table", async () => {
    const schema = await import("../drizzle/schema");
    expect(schema.erpRealEstateReservations).toBeDefined();
  });

  it("should export erpRealEstateSales table", async () => {
    const schema = await import("../drizzle/schema");
    expect(schema.erpRealEstateSales).toBeDefined();
  });

  it("should export erpRealEstatePaymentPlans table", async () => {
    const schema = await import("../drizzle/schema");
    expect(schema.erpRealEstatePaymentPlans).toBeDefined();
  });

  it("should export erpRealEstateInstallments table", async () => {
    const schema = await import("../drizzle/schema");
    expect(schema.erpRealEstateInstallments).toBeDefined();
  });

  it("should export erpRealEstateDeliveries table", async () => {
    const schema = await import("../drizzle/schema");
    expect(schema.erpRealEstateDeliveries).toBeDefined();
  });

  it("should export erpRealEstateDeliveryReserves table", async () => {
    const schema = await import("../drizzle/schema");
    expect(schema.erpRealEstateDeliveryReserves).toBeDefined();
  });
});

describe("Sprint 22 — Database Schema (Accounting tables)", () => {
  it("should export erpAccountingJournals table", async () => {
    const schema = await import("../drizzle/schema");
    expect(schema.erpAccountingJournals).toBeDefined();
  });

  it("should export erpAccountingEntries table", async () => {
    const schema = await import("../drizzle/schema");
    expect(schema.erpAccountingEntries).toBeDefined();
  });

  it("should export erpAccountingEntryLines table", async () => {
    const schema = await import("../drizzle/schema");
    expect(schema.erpAccountingEntryLines).toBeDefined();
  });

  it("should export erpAccountingThirdParties table", async () => {
    const schema = await import("../drizzle/schema");
    expect(schema.erpAccountingThirdParties).toBeDefined();
  });

  it("should export erpAnalyticAxes table", async () => {
    const schema = await import("../drizzle/schema");
    expect(schema.erpAnalyticAxes).toBeDefined();
  });

  it("should export erpAnalyticAllocations table", async () => {
    const schema = await import("../drizzle/schema");
    expect(schema.erpAnalyticAllocations).toBeDefined();
  });

  it("should export erpBankReconciliations table", async () => {
    const schema = await import("../drizzle/schema");
    expect(schema.erpBankReconciliations).toBeDefined();
  });

  it("should export erpBankReconciliationLines table", async () => {
    const schema = await import("../drizzle/schema");
    expect(schema.erpBankReconciliationLines).toBeDefined();
  });

  it("should export erpAccountingFiscalYears table", async () => {
    const schema = await import("../drizzle/schema");
    expect(schema.erpAccountingFiscalYears).toBeDefined();
  });

  it("should export erpAccountingPeriods table", async () => {
    const schema = await import("../drizzle/schema");
    expect(schema.erpAccountingPeriods).toBeDefined();
  });

  it("should export erpTaxPeriods table", async () => {
    const schema = await import("../drizzle/schema");
    expect(schema.erpTaxPeriods).toBeDefined();
  });

  it("should export erpTaxDeclarations table", async () => {
    const schema = await import("../drizzle/schema");
    expect(schema.erpTaxDeclarations).toBeDefined();
  });
});

describe("Sprint 22 — ERP Router Integration", () => {
  it("erp router should include realEstate sub-router", async () => {
    const mod = await import("./erp/erp-router");
    const router = mod.erpRouter;
    const routerKeys = Object.keys(router);
    expect(routerKeys).toContain("realEstate");
  });

  it("erp router should include fullAccounting sub-router", async () => {
    const mod = await import("./erp/erp-router");
    const router = mod.erpRouter;
    const routerKeys = Object.keys(router);
    expect(routerKeys).toContain("fullAccounting");
  });
});
