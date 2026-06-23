/**
 * Tests Vitest — Sprint IA 2 Lot 2 : Extraction Champs Métier
 */
import { describe, it, expect } from "vitest";

describe("ERP AI Field Extraction — Service", () => {
  it("should export extractFieldsFromDocument function", async () => {
    const mod = await import("./erp-ai-field-extraction.service");
    expect(mod.extractFieldsFromDocument).toBeDefined();
    expect(typeof mod.extractFieldsFromDocument).toBe("function");
  });

  it("should export applyExtractionToErp function", async () => {
    const mod = await import("./erp-ai-field-extraction.service");
    expect(mod.applyExtractionToErp).toBeDefined();
    expect(typeof mod.applyExtractionToErp).toBe("function");
  });

  it("should export getRecommendedActions function", async () => {
    const mod = await import("./erp-ai-field-extraction.service");
    expect(mod.getRecommendedActions).toBeDefined();
    expect(typeof mod.getRecommendedActions).toBe("function");
  });

  it("getRecommendedActions should return actions for Supplier Invoice", async () => {
    const mod = await import("./erp-ai-field-extraction.service");
    const actions = mod.getRecommendedActions("Supplier Invoice");
    expect(Array.isArray(actions)).toBe(true);
    expect(actions.length).toBeGreaterThan(0);
    expect(actions[0]).toBe("create_draft_invoice");
  });

  it("getRecommendedActions should return actions for Purchase Order", async () => {
    const mod = await import("./erp-ai-field-extraction.service");
    const actions = mod.getRecommendedActions("Purchase Order");
    expect(Array.isArray(actions)).toBe(true);
    expect(actions.length).toBeGreaterThan(0);
  });

  it("getRecommendedActions should return empty array for unknown type", async () => {
    const mod = await import("./erp-ai-field-extraction.service");
    const actions = mod.getRecommendedActions("type_inconnu_xyz");
    expect(Array.isArray(actions)).toBe(true);
    expect(actions.length).toBe(0);
  });
});

describe("ERP AI Field Extraction — Router Structure", () => {
  it("should export erpAiDocumentExtractionRouter with extraction sub-router", async () => {
    const mod = await import("./erp-ai-document-extraction-router");
    expect(mod.erpAiDocumentExtractionRouter).toBeDefined();
    // Check that the router has the expected sub-routers
    const routerDef = mod.erpAiDocumentExtractionRouter._def;
    expect(routerDef).toBeDefined();
  });

  it("should have extraction, fields, lineItems, applyActions sub-routers", async () => {
    const mod = await import("./erp-ai-document-extraction-router");
    const procedures = Object.keys(mod.erpAiDocumentExtractionRouter._def.procedures);
    expect(procedures).toContain("extraction.run");
    expect(procedures).toContain("extraction.getByJobId");
    expect(procedures).toContain("extraction.validate");
    expect(procedures).toContain("fields.list");
    expect(procedures).toContain("fields.confirm");
    expect(procedures).toContain("fields.correct");
    expect(procedures).toContain("lineItems.list");
    expect(procedures).toContain("lineItems.confirm");
    expect(procedures).toContain("lineItems.update");
    expect(procedures).toContain("applyActions.applyToErp");
    expect(procedures).toContain("applyActions.list");
    expect(procedures).toContain("applyActions.recommendedActions");
  });
});

describe("ERP AI Field Extraction — Schema Tables", () => {
  it("should export erpAiDocFieldExtractions table", async () => {
    const schema = await import("../../drizzle/schema");
    expect(schema.erpAiDocFieldExtractions).toBeDefined();
  });

  it("should export erpAiDocumentExtractionFields table", async () => {
    const schema = await import("../../drizzle/schema");
    expect(schema.erpAiDocumentExtractionFields).toBeDefined();
  });

  it("should export erpAiDocumentLineItems table", async () => {
    const schema = await import("../../drizzle/schema");
    expect(schema.erpAiDocumentLineItems).toBeDefined();
  });

  it("should export erpAiDocumentApplyActions table", async () => {
    const schema = await import("../../drizzle/schema");
    expect(schema.erpAiDocumentApplyActions).toBeDefined();
  });
});
