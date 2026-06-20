import { describe, it, expect } from "vitest";
import * as schema from "../drizzle/schema";
import { ERP_MODULES, ERP_DEFAULT_PERMISSIONS } from "./erp/erp-rbac.service";

describe("Sprint Budget 2.0 — Schema", () => {
  it("should have erpBudgetsV2 table defined", () => {
    expect(schema.erpBudgetsV2).toBeDefined();
  });

  it("should have erpBudgetVersions table defined", () => {
    expect(schema.erpBudgetVersions).toBeDefined();
  });

  it("should have erpBudgetPeriods table defined", () => {
    expect(schema.erpBudgetPeriods).toBeDefined();
  });

  it("should have erpBudgetCategories table defined", () => {
    expect(schema.erpBudgetCategories).toBeDefined();
  });

  it("should have erpBudgetLinesV2 table defined", () => {
    expect(schema.erpBudgetLinesV2).toBeDefined();
  });

  it("should have erpBudgetLineAmounts table defined", () => {
    expect(schema.erpBudgetLineAmounts).toBeDefined();
  });

  it("should have erpBudgetImports table defined", () => {
    expect(schema.erpBudgetImports).toBeDefined();
  });

  it("should have erpBudgetImportErrors table defined", () => {
    expect(schema.erpBudgetImportErrors).toBeDefined();
  });

  it("should have erpBudgetTemplateMappings table defined", () => {
    expect(schema.erpBudgetTemplateMappings).toBeDefined();
  });

  it("should have erpBudgetPlSnapshots table defined", () => {
    expect(schema.erpBudgetPlSnapshots).toBeDefined();
  });

  it("should have erpBudgetCashflowSnapshots table defined", () => {
    expect(schema.erpBudgetCashflowSnapshots).toBeDefined();
  });

  it("should have erpBudgetAlerts table defined", () => {
    expect(schema.erpBudgetAlerts).toBeDefined();
  });
});

describe("Sprint Budget 2.0 — RBAC", () => {
  it("should have erp_budget_v2 in ERP_MODULES", () => {
    expect(ERP_MODULES).toContain("erp_budget_v2");
  });

  it("should have 23 ERP modules total", () => {
    expect(ERP_MODULES.length).toBe(23);
  });

  it("should have 6 permissions for erp_budget_v2", () => {
    const budgetPerms = ERP_DEFAULT_PERMISSIONS.filter(p => p.module === "erp_budget_v2");
    expect(budgetPerms.length).toBe(6);
    const actions = budgetPerms.map(p => p.action);
    expect(actions).toContain("view");
    expect(actions).toContain("create");
    expect(actions).toContain("update");
    expect(actions).toContain("approve");
    expect(actions).toContain("delete");
    expect(actions).toContain("export");
  });
});

describe("Sprint Budget 2.0 — Routeurs", () => {
  it("should export erpBudgetV2Router", async () => {
    const mod = await import("./erp/erp-budget-v2-router");
    expect(mod.erpBudgetV2Router).toBeDefined();
  });

  it("should export erpBudgetImportRouter", async () => {
    const mod = await import("./erp/erp-budget-import-router");
    expect(mod.erpBudgetImportRouter).toBeDefined();
  });

  it("should export erpBudgetExportRouter", async () => {
    const mod = await import("./erp/erp-budget-export-router");
    expect(mod.erpBudgetExportRouter).toBeDefined();
  });

  it("erpBudgetV2Router should have _def", async () => {
    const mod = await import("./erp/erp-budget-v2-router");
    expect(mod.erpBudgetV2Router._def).toBeDefined();
  });
});

describe("Sprint Budget 2.0 — Budget Execution Service", () => {
  it("should export syncBudgetActuals function", async () => {
    const mod = await import("./erp/erp-budget-execution.service");
    expect(mod.syncBudgetActuals).toBeDefined();
    expect(typeof mod.syncBudgetActuals).toBe("function");
  });
});
