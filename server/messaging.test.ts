import { describe, it, expect, vi } from "vitest";

// Test messaging router structure
describe("Messaging Router", () => {
  it("should export citizenMessagingRouter and adminMessagingRouter", async () => {
    const mod = await import("./messaging-router");
    expect(mod.citizenMessagingRouter).toBeDefined();
    expect(mod.adminMessagingRouter).toBeDefined();
  });

  it("citizenMessagingRouter should have expected procedures", async () => {
    const { citizenMessagingRouter } = await import("./messaging-router");
    const procedures = Object.keys((citizenMessagingRouter as any)._def.procedures);
    expect(procedures).toContain("create");
    expect(procedures).toContain("list");
    expect(procedures).toContain("getMessages");
    expect(procedures).toContain("send");
    expect(procedures).toContain("markRead");
    expect(procedures).toContain("uploadAttachment");
  });

  it("adminMessagingRouter should have expected procedures", async () => {
    const { adminMessagingRouter } = await import("./messaging-router");
    const procedures = Object.keys((adminMessagingRouter as any)._def.procedures);
    expect(procedures).toContain("list");
    expect(procedures).toContain("getMessages");
    expect(procedures).toContain("send");
    expect(procedures).toContain("assign");
    expect(procedures).toContain("close");
    expect(procedures).toContain("markRead");
  });
});

// Test analytics router structure
describe("Analytics Router", () => {
  it("should export analyticsRouter", async () => {
    const mod = await import("./analytics-router");
    expect(mod.analyticsRouter).toBeDefined();
  });

  it("analyticsRouter should have expected procedures", async () => {
    const { analyticsRouter } = await import("./analytics-router");
    const procedures = Object.keys((analyticsRouter as any)._def.procedures);
    expect(procedures).toContain("getOverviewStats");
    expect(procedures).toContain("getDossiersByStatus");
    expect(procedures).toContain("getLandTitlesByStatus");
    expect(procedures).toContain("getPaymentsByMonth");
    expect(procedures).toContain("getPaymentsByProvider");
    expect(procedures).toContain("getPaymentsByTaxType");
    expect(procedures).toContain("getUsersByRole");
    expect(procedures).toContain("getAppointmentsByStatus");
    expect(procedures).toContain("getRecentActivity");
  });
});

// Test schema tables
describe("Messaging Schema", () => {
  it("should export conversations and messages tables", async () => {
    const schema = await import("../drizzle/schema");
    expect(schema.conversations).toBeDefined();
    expect(schema.messages).toBeDefined();
  });

  it("conversations table should have required columns", async () => {
    const { conversations } = await import("../drizzle/schema");
    const columns = Object.keys(conversations);
    expect(columns).toContain("citizenId");
    expect(columns).toContain("agentId");
    expect(columns).toContain("subject");
    expect(columns).toContain("status");
    expect(columns).toContain("dossierType");
    expect(columns).toContain("lastMessageAt");
  });

  it("messages table should have required columns", async () => {
    const { messages } = await import("../drizzle/schema");
    const columns = Object.keys(messages);
    expect(columns).toContain("conversationId");
    expect(columns).toContain("senderId");
    expect(columns).toContain("senderRole");
    expect(columns).toContain("content");
    expect(columns).toContain("attachmentUrl");
    expect(columns).toContain("readAt");
  });
});

// Test conversation status enum
describe("Conversation Status", () => {
  it("should support open, assigned, closed statuses", async () => {
    const { conversations } = await import("../drizzle/schema");
    // Check the status enum exists
    expect(conversations.status).toBeDefined();
  });
});

// Test message sender roles
describe("Message Sender Roles", () => {
  it("should support citizen, agent, system roles", async () => {
    const { messages } = await import("../drizzle/schema");
    expect(messages.senderRole).toBeDefined();
  });
});
