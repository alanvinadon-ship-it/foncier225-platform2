import { describe, it, expect } from "vitest";
import { erpAiProviderRouter } from "./erp-ai-provider-router";

describe("ERP AI Provider Router", () => {
  it("should export the router with all sub-routers", () => {
    expect(erpAiProviderRouter).toBeDefined();
    expect(erpAiProviderRouter._def).toBeDefined();
  });

  it("should have providers sub-router", () => {
    const procedures = Object.keys(erpAiProviderRouter._def.procedures || erpAiProviderRouter._def.record || {});
    const hasProviders = procedures.some(p => p.startsWith("providers"));
    expect(hasProviders).toBe(true);
  });

  it("should have modelSettings sub-router", () => {
    const procedures = Object.keys(erpAiProviderRouter._def.procedures || erpAiProviderRouter._def.record || {});
    const hasModelSettings = procedures.some(p => p.startsWith("modelSettings"));
    expect(hasModelSettings).toBe(true);
  });

  it("should have taskRouting sub-router", () => {
    const procedures = Object.keys(erpAiProviderRouter._def.procedures || erpAiProviderRouter._def.record || {});
    const hasTaskRouting = procedures.some(p => p.startsWith("taskRouting"));
    expect(hasTaskRouting).toBe(true);
  });

  it("should have usage sub-router", () => {
    const procedures = Object.keys(erpAiProviderRouter._def.procedures || erpAiProviderRouter._def.record || {});
    const hasUsage = procedures.some(p => p.startsWith("usage"));
    expect(hasUsage).toBe(true);
  });

  it("should have costLimits sub-router", () => {
    const procedures = Object.keys(erpAiProviderRouter._def.procedures || erpAiProviderRouter._def.record || {});
    const hasCostLimits = procedures.some(p => p.startsWith("costLimits"));
    expect(hasCostLimits).toBe(true);
  });
});

describe("ERP AI Provider Service", () => {
  it("should export encryption functions", async () => {
    const service = await import("./erp-ai-provider.service");
    expect(service.encryptApiKey).toBeDefined();
    expect(service.decryptApiKey).toBeDefined();
  });

  it("should encrypt and decrypt API keys correctly", async () => {
    const service = await import("./erp-ai-provider.service");
    const testKey = "sk-test-1234567890abcdef";
    const encrypted = service.encryptApiKey(testKey);
    expect(encrypted).not.toBe(testKey);
    expect(encrypted).toContain(":");
    const decrypted = service.decryptApiKey(encrypted);
    expect(decrypted).toBe(testKey);
  });

  it("should export getUsageSummary function", async () => {
    const service = await import("./erp-ai-provider.service");
    expect(service.getUsageSummary).toBeDefined();
  });

  it("should export getUsageByProvider function", async () => {
    const service = await import("./erp-ai-provider.service");
    expect(service.getUsageByProvider).toBeDefined();
  });

  it("should export getUsageByModule function", async () => {
    const service = await import("./erp-ai-provider.service");
    expect(service.getUsageByModule).toBeDefined();
  });

});
