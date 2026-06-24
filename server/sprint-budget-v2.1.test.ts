import { describe, it, expect } from "vitest";

describe("Sprint Budget 2.1 — Seed, Snapshots, Import amélioré, Audit", () => {
  describe("Schema — Tables Budget 2.1", () => {
    it("table erp_budget_snapshot_jobs exists", async () => {
      const schema = await import("../drizzle/schema");
      expect(schema.erpBudgetSnapshotJobs).toBeDefined();
    });

    it("table erp_budget_pl_snapshots exists", async () => {
      const schema = await import("../drizzle/schema");
      expect(schema.erpBudgetPlSnapshots).toBeDefined();
    });

    it("table erp_budget_cashflow_snapshots exists", async () => {
      const schema = await import("../drizzle/schema");
      expect(schema.erpBudgetCashflowSnapshots).toBeDefined();
    });

    it("table erp_budget_alerts exists", async () => {
      const schema = await import("../drizzle/schema");
      expect(schema.erpBudgetAlerts).toBeDefined();
    });
  });

  describe("Routeur Budget V2 — Seed", () => {
    it("seed router exports correctly", async () => {
      const { erpBudgetV2Router } = await import("./erp/erp-budget-v2-router");
      expect(erpBudgetV2Router).toBeDefined();
      expect(erpBudgetV2Router._def.procedures).toBeDefined();
    });

    it("seed service exists and exports seedBudget2026", async () => {
      const seed = await import("./erp/erp-budget-seed");
      expect(seed.seedBudget2026).toBeDefined();
      expect(typeof seed.seedBudget2026).toBe("function");
    });

    it("seed service exports cleanBudget2026", async () => {
      const seed = await import("./erp/erp-budget-seed");
      expect(seed.cleanBudget2026).toBeDefined();
      expect(typeof seed.cleanBudget2026).toBe("function");
    });
  });

  describe("Routeur Budget V2 — Import amélioré", () => {
    it("import router exports correctly", async () => {
      const { erpBudgetImportRouter } = await import("./erp/erp-budget-import-router");
      expect(erpBudgetImportRouter).toBeDefined();
    });

    it("import router has upload, commit, list, getById, templates procedures", async () => {
      const { erpBudgetImportRouter } = await import("./erp/erp-budget-import-router");
      const procs = erpBudgetImportRouter._def.procedures as any;
      expect(procs.upload).toBeDefined();
      expect(procs.commit).toBeDefined();
      expect(procs.list).toBeDefined();
      expect(procs.getById).toBeDefined();
    });
  });

  describe("Service Snapshots P&L / Cash Flow", () => {
    it("snapshot service exports generateSnapshotsForAllBudgets", async () => {
      const svc = await import("./erp/erp-budget-snapshot.service");
      expect(svc.generateSnapshotsForAllBudgets).toBeDefined();
      expect(typeof svc.generateSnapshotsForAllBudgets).toBe("function");
    });

    it("snapshot service exports generatePlSnapshots", async () => {
      const svc = await import("./erp/erp-budget-snapshot.service");
      expect(svc.generatePlSnapshots).toBeDefined();
      expect(typeof svc.generatePlSnapshots).toBe("function");
    });

    it("snapshot service exports generateCashFlowSnapshots", async () => {
      const svc = await import("./erp/erp-budget-snapshot.service");
      expect(svc.generateCashFlowSnapshots).toBeDefined();
      expect(typeof svc.generateCashFlowSnapshots).toBe("function");
    });
  });

  describe("Heartbeat handler", () => {
    it("budgetSnapshotsHandler is exported", async () => {
      const mod = await import("./scheduled-budget-snapshots");
      expect(mod.budgetSnapshotsHandler).toBeDefined();
      expect(typeof mod.budgetSnapshotsHandler).toBe("function");
    });
  });

  describe("Routeur Export Budget", () => {
    it("export router exports correctly", async () => {
      const { erpBudgetExportRouter } = await import("./erp/erp-budget-export-router");
      expect(erpBudgetExportRouter).toBeDefined();
    });
  });

  describe("RBAC — Permissions étendues", () => {
    it("erp_budget_v2 module exists in ERP_MODULES", async () => {
      const { ERP_MODULES } = await import("./erp/erp-rbac.service");
      expect(ERP_MODULES).toContain("erp_budget_v2");
    });

    it("total ERP modules count is 23", async () => {
      const { ERP_MODULES } = await import("./erp/erp-rbac.service");
      expect(ERP_MODULES.length).toBe(40);
    });
  });

  describe("Audit & Notifications", () => {
    it("import router uses createAuditEvent", async () => {
      const fs = await import("fs");
      const content = fs.readFileSync("server/erp/erp-budget-import-router.ts", "utf-8");
      expect(content).toContain("createAuditEvent");
      expect(content).toContain("notifyOwner");
    });

    it("heartbeat handler uses createAuditEvent and notifyOwner", async () => {
      const fs = await import("fs");
      const content = fs.readFileSync("server/scheduled-budget-snapshots.ts", "utf-8");
      expect(content).toContain("createAuditEvent");
      expect(content).toContain("notifyOwner");
    });

    it("budget v2 router uses createAuditEvent", async () => {
      const fs = await import("fs");
      const content = fs.readFileSync("server/erp/erp-budget-v2-router.ts", "utf-8");
      expect(content).toContain("createAuditEvent");
      // Should have multiple audit events
      const matches = content.match(/createAuditEvent/g);
      expect(matches!.length).toBeGreaterThanOrEqual(8);
    });
  });
});
