import { describe, it, expect, vi } from "vitest";

// Mock the LLM module
vi.mock("../_core/llm", () => ({
  invokeLLM: vi.fn().mockResolvedValue({
    choices: [{ message: { content: "Réponse test de l'assistant IA." } }],
    usage: { total_tokens: 150 },
  }),
}));

// Mock the DB module
vi.mock("../db", () => ({
  getDb: vi.fn().mockResolvedValue({
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    offset: vi.fn().mockReturnThis(),
    groupBy: vi.fn().mockReturnThis(),
    having: vi.fn().mockReturnThis(),
    innerJoin: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnValue({
      values: vi.fn().mockResolvedValue([{ insertId: 1 }]),
    }),
    update: vi.fn().mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue(undefined),
      }),
    }),
  }),
}));

describe("ERP AI Assistant Service", () => {
  it("should export chatWithAssistant function", async () => {
    const service = await import("./erp-ai-assistant.service");
    expect(service.chatWithAssistant).toBeDefined();
    expect(typeof service.chatWithAssistant).toBe("function");
  });

  it("should export generateProjectSummary function", async () => {
    const service = await import("./erp-ai-assistant.service");
    expect(service.generateProjectSummary).toBeDefined();
    expect(typeof service.generateProjectSummary).toBe("function");
  });

  it("should export generateBudgetSummary function", async () => {
    const service = await import("./erp-ai-assistant.service");
    expect(service.generateBudgetSummary).toBeDefined();
    expect(typeof service.generateBudgetSummary).toBe("function");
  });

  it("should export generateDirectionSummary function", async () => {
    const service = await import("./erp-ai-assistant.service");
    expect(service.generateDirectionSummary).toBeDefined();
    expect(typeof service.generateDirectionSummary).toBe("function");
  });

  it("should export generateRecommendations function", async () => {
    const service = await import("./erp-ai-assistant.service");
    expect(service.generateRecommendations).toBeDefined();
    expect(typeof service.generateRecommendations).toBe("function");
  });
});

describe("ERP AI Assistant Router", () => {
  it("should export erpAiAssistantRouter", async () => {
    const routerModule = await import("./erp-ai-assistant-router");
    expect(routerModule.erpAiAssistantRouter).toBeDefined();
  });

  it("should have chat procedure", async () => {
    const routerModule = await import("./erp-ai-assistant-router");
    const router = routerModule.erpAiAssistantRouter;
    const keys = Object.keys(router._def.procedures);
    expect(keys.some(k => k === "chat" || k.startsWith("chat."))).toBe(true);
  });

  it("should have conversations sub-router", async () => {
    const routerModule = await import("./erp-ai-assistant-router");
    const router = routerModule.erpAiAssistantRouter;
    const keys = Object.keys(router._def.procedures);
    expect(keys.some(k => k.startsWith("conversations"))).toBe(true);
  });

  it("should have summaries sub-router", async () => {
    const routerModule = await import("./erp-ai-assistant-router");
    const router = routerModule.erpAiAssistantRouter;
    const keys = Object.keys(router._def.procedures);
    expect(keys.some(k => k.startsWith("summaries"))).toBe(true);
  });

  it("should have recommendations sub-router", async () => {
    const routerModule = await import("./erp-ai-assistant-router");
    const router = routerModule.erpAiAssistantRouter;
    const keys = Object.keys(router._def.procedures);
    expect(keys.some(k => k.startsWith("recommendations"))).toBe(true);
  });

  it("should have auditLogs sub-router", async () => {
    const routerModule = await import("./erp-ai-assistant-router");
    const router = routerModule.erpAiAssistantRouter;
    // Nested routers are flattened with dot notation in _def.procedures
    const keys = Object.keys(router._def.procedures);
    expect(keys.some(k => k.startsWith("auditLogs"))).toBe(true);
  });

  it("should have risks sub-router", async () => {
    const routerModule = await import("./erp-ai-assistant-router");
    const router = routerModule.erpAiAssistantRouter;
    const keys = Object.keys(router._def.procedures);
    expect(keys.some(k => k.startsWith("risks"))).toBe(true);
  });

  it("should have dashboard procedure", async () => {
    const routerModule = await import("./erp-ai-assistant-router");
    const router = routerModule.erpAiAssistantRouter;
    const keys = Object.keys(router._def.procedures);
    expect(keys.some(k => k.includes("dashboard"))).toBe(true);
  });
});
