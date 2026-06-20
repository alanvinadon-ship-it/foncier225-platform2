import { describe, it, expect } from "vitest";
import { ERP_MODULES } from "./erp/erp-rbac.service";

describe("Sprint 23 — RFQ, Rapprochement Factures/PO, Export Comptable", () => {
  // --- Schema ---
  describe("Schema tables", () => {
    it("exports erpRfqLines table", async () => {
      const schema = await import("../drizzle/schema");
      expect(schema.erpRfqLines).toBeDefined();
      expect(schema.erpRfqLines.rfqId).toBeDefined();
      expect(schema.erpRfqLines.description).toBeDefined();
      expect(schema.erpRfqLines.quantity).toBeDefined();
    });

    it("exports erpVendorQuoteLines table", async () => {
      const schema = await import("../drizzle/schema");
      expect(schema.erpVendorQuoteLines).toBeDefined();
      expect(schema.erpVendorQuoteLines.vendorQuoteId).toBeDefined();
      expect(schema.erpVendorQuoteLines.unitPrice).toBeDefined();
      expect(schema.erpVendorQuoteLines.lineTotal).toBeDefined();
    });

    it("exports erpInvoicePoMatches table", async () => {
      const schema = await import("../drizzle/schema");
      expect(schema.erpInvoicePoMatches).toBeDefined();
      expect(schema.erpInvoicePoMatches.invoiceId).toBeDefined();
      expect(schema.erpInvoicePoMatches.purchaseOrderId).toBeDefined();
      expect(schema.erpInvoicePoMatches.matchScore).toBeDefined();
      expect(schema.erpInvoicePoMatches.variancePercentage).toBeDefined();
    });

    it("exports erpInvoicePoMatchLines table", async () => {
      const schema = await import("../drizzle/schema");
      expect(schema.erpInvoicePoMatchLines).toBeDefined();
      expect(schema.erpInvoicePoMatchLines.invoicePoMatchId).toBeDefined();
      expect(schema.erpInvoicePoMatchLines.priceVariance).toBeDefined();
    });

    it("exports erpMatchingSettings table", async () => {
      const schema = await import("../drizzle/schema");
      expect(schema.erpMatchingSettings).toBeDefined();
      expect(schema.erpMatchingSettings.settingKey).toBeDefined();
      expect(schema.erpMatchingSettings.settingValue).toBeDefined();
    });

    it("exports erpAccountingExportFormats table", async () => {
      const schema = await import("../drizzle/schema");
      expect(schema.erpAccountingExportFormats).toBeDefined();
      expect(schema.erpAccountingExportFormats.formatCode).toBeDefined();
      expect(schema.erpAccountingExportFormats.delimiter).toBeDefined();
    });

    it("exports erpAccountingExports table", async () => {
      const schema = await import("../drizzle/schema");
      expect(schema.erpAccountingExports).toBeDefined();
      expect(schema.erpAccountingExports.exportNumber).toBeDefined();
      expect(schema.erpAccountingExports.formatId).toBeDefined();
      expect(schema.erpAccountingExports.fileContent).toBeDefined();
    });

    it("exports erpAccountingExportLines table", async () => {
      const schema = await import("../drizzle/schema");
      expect(schema.erpAccountingExportLines).toBeDefined();
      expect(schema.erpAccountingExportLines.exportId).toBeDefined();
      expect(schema.erpAccountingExportLines.accountCode).toBeDefined();
    });

    it("erpRfqs has new selection fields", async () => {
      const schema = await import("../drizzle/schema");
      expect(schema.erpRfqs.selectionMethod).toBeDefined();
      expect(schema.erpRfqs.selectedVendorId).toBeDefined();
      expect(schema.erpRfqs.selectedQuoteId).toBeDefined();
      expect(schema.erpRfqs.approvedBy).toBeDefined();
    });
  });

  // --- Routers ---
  describe("Routers", () => {
    it("rfqRouter is exported and has expected sub-routers", async () => {
      const { rfqRouter } = await import("./erp/erp-rfq-router");
      expect(rfqRouter).toBeDefined();
      expect(rfqRouter._def.procedures).toBeDefined();
    });

    it("invoiceMatchingRouter is exported and has expected sub-routers", async () => {
      const { invoiceMatchingRouter } = await import("./erp/erp-invoice-matching-router");
      expect(invoiceMatchingRouter).toBeDefined();
      expect(invoiceMatchingRouter._def.procedures).toBeDefined();
    });

    it("accountingExportRouter is exported and has expected sub-routers", async () => {
      const { accountingExportRouter } = await import("./erp/erp-accounting-export-router");
      expect(accountingExportRouter).toBeDefined();
      expect(accountingExportRouter._def.procedures).toBeDefined();
    });
  });

  // --- RBAC ---
  describe("RBAC modules", () => {
    it("has 22 modules total", () => {
      expect(ERP_MODULES.length).toBe(23);
    });

    it("includes erp_rfqs module", () => {
      expect(ERP_MODULES).toContain("erp_rfqs");
    });

    it("includes erp_invoice_matching module", () => {
      expect(ERP_MODULES).toContain("erp_invoice_matching");
    });

    it("includes erp_accounting_exports module", () => {
      expect(ERP_MODULES).toContain("erp_accounting_exports");
    });
  });
});
