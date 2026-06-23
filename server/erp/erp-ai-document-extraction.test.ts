import { describe, it, expect } from "vitest";
import { erpAiDocumentExtractionRouter } from "./erp-ai-document-extraction-router";

describe("ERP AI Document Extraction Router", () => {
  it("should export the router", () => {
    expect(erpAiDocumentExtractionRouter).toBeDefined();
  });

  it("should have jobs sub-router with expected procedures", () => {
    const router = erpAiDocumentExtractionRouter as any;
    const procedures = Object.keys(router._def.procedures || router._def.record || {});
    // Check that key procedures exist (nested with dot notation)
    const hasJobsList = procedures.some((p: string) => p.startsWith("jobs."));
    expect(hasJobsList || procedures.includes("jobs")).toBe(true);
  });

  it("should have OCR sub-router", () => {
    const router = erpAiDocumentExtractionRouter as any;
    const procedures = Object.keys(router._def.procedures || router._def.record || {});
    const hasOcr = procedures.some((p: string) => p.startsWith("ocr.") || p === "ocr");
    expect(hasOcr).toBe(true);
  });

  it("should have classification sub-router", () => {
    const router = erpAiDocumentExtractionRouter as any;
    const procedures = Object.keys(router._def.procedures || router._def.record || {});
    const hasClassification = procedures.some((p: string) => p.startsWith("classification.") || p === "classification");
    expect(hasClassification).toBe(true);
  });

  it("should have validationLogs sub-router", () => {
    const router = erpAiDocumentExtractionRouter as any;
    const procedures = Object.keys(router._def.procedures || router._def.record || {});
    const hasValidation = procedures.some((p: string) => p.startsWith("validationLogs.") || p === "validationLogs");
    expect(hasValidation).toBe(true);
  });

  it("should have uploadAndCreate procedure", () => {
    const router = erpAiDocumentExtractionRouter as any;
    const procedures = Object.keys(router._def.procedures || router._def.record || {});
    expect(procedures.includes("uploadAndCreate")).toBe(true);
  });

  it("should have documentTypes procedure", () => {
    const router = erpAiDocumentExtractionRouter as any;
    const procedures = Object.keys(router._def.procedures || router._def.record || {});
    expect(procedures.includes("documentTypes")).toBe(true);
  });
});

describe("ERP AI Document OCR Service", () => {
  it("should export OCR service functions", async () => {
    const service = await import("./erp-ai-document-ocr.service");
    expect(service.performOcr).toBeDefined();
    expect(service.classifyDocument).toBeDefined();
    expect(service.cleanOcrText).toBeDefined();
  });

  it("cleanOcrText should remove extra whitespace", async () => {
    const { cleanOcrText } = await import("./erp-ai-document-ocr.service");
    const result = cleanOcrText("  hello   world  \n\n\n  test  ");
    expect(result).not.toContain("   ");
    expect(result.length).toBeLessThan("  hello   world  \n\n\n  test  ".length);
  });

  it("cleanOcrText should handle empty input", async () => {
    const { cleanOcrText } = await import("./erp-ai-document-ocr.service");
    const result = cleanOcrText("");
    expect(result).toBe("");
  });
});

describe("ERP AI Document Extraction - RBAC Module", () => {
  it("should have erp_ai_document_extraction in ERP_MODULES", async () => {
    const { ERP_MODULES } = await import("./erp-rbac.service");
    expect(ERP_MODULES).toContain("erp_ai_document_extraction");
  });
});
