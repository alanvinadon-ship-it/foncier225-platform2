import { describe, it, expect } from "vitest";

// Test the accounting router exports
describe("Sprint 21 — Module Achats/Dépenses/Comptabilité", () => {
  describe("erp-accounting-router", () => {
    it("should export erpAccountingRouter", async () => {
      const mod = await import("./erp/erp-accounting-router");
      expect(mod.erpAccountingRouter).toBeDefined();
    });
  });

  describe("erp-purchases-router", () => {
    it("should export erpPurchasesRouter", async () => {
      const mod = await import("./erp/erp-purchases-router");
      expect(mod.erpPurchasesRouter).toBeDefined();
    });
  });

  describe("erp-expenses-router", () => {
    it("should export erpExpensesRouter", async () => {
      const mod = await import("./erp/erp-expenses-router");
      expect(mod.erpExpensesRouter).toBeDefined();
    });
  });

  describe("ERP_MODULES includes new modules", () => {
    it("should include erp_purchases, erp_expenses, erp_accounting", async () => {
      const mod = await import("./erp/erp-rbac.service");
      expect(mod.ERP_MODULES).toContain("erp_purchases");
      expect(mod.ERP_MODULES).toContain("erp_expenses");
      expect(mod.ERP_MODULES).toContain("erp_accounting");
    });
  });

  describe("ERP_ACTIONS includes approve", () => {
    it("should include approve action", async () => {
      const mod = await import("./erp/erp-rbac.service");
      expect(mod.ERP_ACTIONS).toContain("approve");
    });
  });

  describe("Schema tables exist", () => {
    it("should export erpAccountingAccounts", async () => {
      const schema = await import("../drizzle/schema");
      expect(schema.erpAccountingAccounts).toBeDefined();
    });

    it("should export erpPurchaseRequests", async () => {
      const schema = await import("../drizzle/schema");
      expect(schema.erpPurchaseRequests).toBeDefined();
    });

    it("should export erpPurchaseOrders", async () => {
      const schema = await import("../drizzle/schema");
      expect(schema.erpPurchaseOrders).toBeDefined();
    });

    it("should export erpExpenses", async () => {
      const schema = await import("../drizzle/schema");
      expect(schema.erpExpenses).toBeDefined();
    });

    it("should export erpExpenseCategories", async () => {
      const schema = await import("../drizzle/schema");
      expect(schema.erpExpenseCategories).toBeDefined();
    });

    it("should export erpPurchaseCategories", async () => {
      const schema = await import("../drizzle/schema");
      expect(schema.erpPurchaseCategories).toBeDefined();
    });

    it("should export erpGoodsReceipts", async () => {
      const schema = await import("../drizzle/schema");
      expect(schema.erpGoodsReceipts).toBeDefined();
    });

    it("should export erpAccountingPreEntries", async () => {
      const schema = await import("../drizzle/schema");
      expect(schema.erpAccountingPreEntries).toBeDefined();
    });

    it("should export erpTaxCodes", async () => {
      const schema = await import("../drizzle/schema");
      expect(schema.erpTaxCodes).toBeDefined();
    });

    it("should export erpPaymentAccounts", async () => {
      const schema = await import("../drizzle/schema");
      expect(schema.erpPaymentAccounts).toBeDefined();
    });
  });

  describe("Export CSV module", () => {
    it("should export generateCsv function", async () => {
      const mod = await import("./export-csv");
      expect(mod.generateCsv).toBeDefined();
    });

    it("should generate valid CSV output", async () => {
      const { generateCsv } = await import("./export-csv");
      const result = generateCsv(
        [{ name: "Test", amount: 1000 }],
        [
          { header: "Nom", accessor: (r: any) => r.name },
          { header: "Montant", accessor: (r: any) => r.amount },
        ]
      );
      expect(result).toContain("Nom");
      expect(result).toContain("Montant");
      expect(result).toContain("Test");
      expect(result).toContain("1000");
    });
  });
});
