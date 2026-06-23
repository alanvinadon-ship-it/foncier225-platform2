import { describe, expect, it, vi, beforeEach } from "vitest";
import { calculateMaterialTakeoff, seedDefaultCoefficients } from "./erp-ai-quantity-engine.service";

// Mock the database module
vi.mock("../db", () => ({
  getDb: vi.fn(),
}));

// Mock the storage module
vi.mock("../storage", () => ({
  storagePut: vi.fn().mockResolvedValue({ url: "https://s3.example.com/test.pdf", key: "test-key" }),
}));

// Mock the LLM module
vi.mock("../_core/llm", () => ({
  invokeLLM: vi.fn().mockResolvedValue({
    choices: [{
      message: {
        content: JSON.stringify({
          planType: "architectural",
          scaleDetected: "1:100",
          floorLevel: "RDC",
          confidenceScore: 85,
          hypotheses: ["Épaisseur murs standard 20cm", "Hauteur sous plafond 3m"],
          elements: [
            {
              elementType: "wall",
              elementLabel: "Mur porteur A",
              length: "5.00",
              width: "0.20",
              height: "3.00",
              area: "15.00",
              volume: "3.00",
              material: "Béton armé",
              confidenceScore: 90,
            },
            {
              elementType: "column",
              elementLabel: "Poteau P1",
              length: "0.30",
              width: "0.30",
              height: "3.00",
              area: "0.09",
              volume: "0.27",
              material: "Béton armé",
              confidenceScore: 88,
            },
          ],
          engineeringChecks: [
            {
              checkName: "Portée maximale dalle",
              domain: "structural",
              severity: "warning",
              status: "needs_review",
              description: "Portée de 6m détectée",
              detectedIssue: "Portée > 5m sans poutre intermédiaire",
              recommendation: "Ajouter une poutre intermédiaire",
              confidenceScore: 75,
            },
          ],
        }),
      },
    }],
  }),
}));

describe("AI Plan Analyzer — Quantity Engine", () => {
  describe("calculateMaterialTakeoff", () => {
    it("should export calculateMaterialTakeoff as a function", () => {
      expect(typeof calculateMaterialTakeoff).toBe("function");
    });

    it("should export seedDefaultCoefficients as a function", () => {
      expect(typeof seedDefaultCoefficients).toBe("function");
    });
  });
});

describe("AI Plan Analyzer — Service Integration", () => {
  it("should have analyzePlan function exported", async () => {
    const { analyzePlan } = await import("./erp-ai-plan-analyzer.service");
    expect(typeof analyzePlan).toBe("function");
  });

  it("should have askPlanAssistant function exported", async () => {
    const { askPlanAssistant } = await import("./erp-ai-plan-analyzer.service");
    expect(typeof askPlanAssistant).toBe("function");
  });

  it("should have generatePlanAnalysisPdf function exported", async () => {
    const { generatePlanAnalysisPdf } = await import("./erp-ai-plan-pdf.service");
    expect(typeof generatePlanAnalysisPdf).toBe("function");
  });
});

describe("AI Plan Analyzer — Router Structure", () => {
  it("should export erpAiPlanAnalyzerRouter with correct sub-routers", async () => {
    const { erpAiPlanAnalyzerRouter } = await import("./erp-ai-plan-analyzer-router");
    expect(erpAiPlanAnalyzerRouter).toBeDefined();

    // Check all sub-routers exist
    const routerKeys = Object.keys((erpAiPlanAnalyzerRouter as any)._def.procedures || {});
    // The router uses nested routers, check the _def.record
    const record = (erpAiPlanAnalyzerRouter as any)._def?.record;
    if (record) {
      expect(record.analyses).toBeDefined();
      expect(record.actions).toBeDefined();
      expect(record.elements).toBeDefined();
      expect(record.takeoffs).toBeDefined();
      expect(record.checks).toBeDefined();
      expect(record.comments).toBeDefined();
      expect(record.rules).toBeDefined();
      expect(record.coefficients).toBeDefined();
      expect(record.exports).toBeDefined();
      expect(record.convert).toBeDefined();
      expect(record.assistant).toBeDefined();
    }
  });
});

describe("AI Plan Analyzer — RBAC Module", () => {
  it("should include erp_ai_plan_analyzer in ERP_MODULES", async () => {
    const { ERP_MODULES } = await import("./erp-rbac.service");
    expect(ERP_MODULES).toContain("erp_ai_plan_analyzer");
  });
});
