import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// ─── Mock DB module ──────────────────────────────────────────────────
vi.mock("./db", () => ({
  getParcelByPublicToken: vi.fn(),
  getPublicParcelEvents: vi.fn(),
  checkRateLimit: vi.fn(),
  getVerifyTokenByHash: vi.fn(),
  createAuditEvent: vi.fn(),
  getDashboardStats: vi.fn(),
  getParcelStatusDistribution: vi.fn(),
  listUsers: vi.fn(),
  updateUserRole: vi.fn(),
  listParcels: vi.fn(),
  createParcel: vi.fn(),
  createParcelEvent: vi.fn(),
  listAuditEvents: vi.fn(),
  createVerifyToken: vi.fn(),
  countUsers: vi.fn(),
  countParcels: vi.fn(),
  countAttestations: vi.fn(),
  countAuditEvents: vi.fn(),
  countVerifyTokens: vi.fn(),
}));

import * as db from "./db";
const mockDb = vi.mocked(db);

// ─── Helpers ─────────────────────────────────────────────────────────
function createPublicContext(): TrpcContext {
  return {
    user: null,
    req: {
      protocol: "https",
      headers: { "x-forwarded-for": "127.0.0.1" },
      ip: "127.0.0.1",
    } as any,
    res: {
      clearCookie: vi.fn(),
    } as any,
  };
}

function createAdminContext(): TrpcContext {
  return {
    user: {
      id: 1,
      openId: "admin-user",
      email: "admin@foncier225.ci",
      name: "Admin",
      loginMethod: "manus",
      role: "admin",
      zoneCodes: null,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: {
      protocol: "https",
      headers: {},
      ip: "127.0.0.1",
    } as any,
    res: {
      clearCookie: vi.fn(),
    } as any,
  };
}

function createCitizenContext(): TrpcContext {
  return {
    user: {
      id: 2,
      openId: "citizen-user",
      email: "citizen@example.com",
      name: "Citoyen",
      loginMethod: "manus",
      role: "citizen",
      zoneCodes: null,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: {
      protocol: "https",
      headers: {},
      ip: "127.0.0.1",
    } as any,
    res: {
      clearCookie: vi.fn(),
    } as any,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

// ─── Parcel Router Tests ─────────────────────────────────────────────
describe("parcel.getPublic", () => {
  it("returns public parcel data when found", async () => {
    const mockParcel = {
      id: 1,
      publicToken: "abc123",
      reference: "ABJ-2025-001",
      zoneCode: "ABJ-COCODY",
      statusPublic: "valide" as const,
      surfaceApprox: "500 m²",
      localisation: "Cocody, Abidjan",
      kpiFlagsJson: { insurance: true },
      createdAt: new Date(),
      updatedAt: new Date(),
      createdById: 1,
    };
    mockDb.getParcelByPublicToken.mockResolvedValue(mockParcel);

    const caller = appRouter.createCaller(createPublicContext());
    const result = await caller.parcel.getPublic({ publicToken: "abc123" });

    expect(result.reference).toBe("ABJ-2025-001");
    expect(result.statusPublic).toBe("valide");
    expect(result.zoneCode).toBe("ABJ-COCODY");
    // Ensure no PII fields are returned
    expect(result).not.toHaveProperty("createdById");
  });

  it("throws NOT_FOUND for unknown token", async () => {
    mockDb.getParcelByPublicToken.mockResolvedValue(undefined);

    const caller = appRouter.createCaller(createPublicContext());
    await expect(caller.parcel.getPublic({ publicToken: "unknown" }))
      .rejects.toThrow("Parcelle introuvable");
  });
});

describe("parcel.getPublicEvents", () => {
  it("returns public events for a parcel", async () => {
    const mockParcel = {
      id: 1, publicToken: "abc123", reference: "ABJ-2025-001",
      zoneCode: "ABJ", statusPublic: "valide" as const,
      surfaceApprox: null, localisation: null, kpiFlagsJson: null,
      createdAt: new Date(), updatedAt: new Date(), createdById: null,
    };
    mockDb.getParcelByPublicToken.mockResolvedValue(mockParcel);
    mockDb.getPublicParcelEvents.mockResolvedValue([
      { id: 1, parcelId: 1, eventType: "creation", title: "Créée", description: null, monthYear: "mars 2025", isPublic: true, metadata: null, createdAt: new Date(), createdById: null },
    ]);

    const caller = appRouter.createCaller(createPublicContext());
    const events = await caller.parcel.getPublicEvents({ publicToken: "abc123" });
    expect(events).toHaveLength(1);
    expect(events[0].title).toBe("Créée");
  });
});

// ─── Verify Router Tests ─────────────────────────────────────────────
describe("verify.check", () => {
  it("returns token info when found and rate limit ok", async () => {
    mockDb.checkRateLimit.mockResolvedValue(true);
    mockDb.getVerifyTokenByHash.mockResolvedValue({
      id: 1,
      tokenHash: "hashed",
      tokenType: "insurance" as const,
      targetId: 1,
      status: "active" as const,
      issuedMonth: "mars 2025",
      expiresAt: new Date("2025-06-01"),
      createdAt: new Date(),
      createdById: null,
    });
    mockDb.createAuditEvent.mockResolvedValue(undefined);

    const caller = appRouter.createCaller(createPublicContext());
    const result = await caller.verify.check({ token: "raw-token-value" });

    expect(result.status).toBe("active");
    expect(result.tokenType).toBe("insurance");
    expect(mockDb.createAuditEvent).toHaveBeenCalledOnce();
  });

  it("throws when rate limited", async () => {
    mockDb.checkRateLimit.mockResolvedValue(false);

    const caller = appRouter.createCaller(createPublicContext());
    await expect(caller.verify.check({ token: "any" }))
      .rejects.toThrow("Rate limit");
  });

  it("throws NOT_FOUND for unknown token", async () => {
    mockDb.checkRateLimit.mockResolvedValue(true);
    mockDb.getVerifyTokenByHash.mockResolvedValue(undefined);

    const caller = appRouter.createCaller(createPublicContext());
    await expect(caller.verify.check({ token: "unknown" }))
      .rejects.toThrow("Token de vérification introuvable");
  });
});

// ─── Admin Router Tests ──────────────────────────────────────────────
describe("admin.dashboardStats", () => {
  it("returns stats for admin users", async () => {
    mockDb.getDashboardStats.mockResolvedValue({
      users: 10, parcels: 50, attestations: 20, auditEvents: 100, verifyTokens: 15,
    });

    const caller = appRouter.createCaller(createAdminContext());
    const stats = await caller.admin.dashboardStats();
    expect(stats.users).toBe(10);
    expect(stats.parcels).toBe(50);
  });

  it("rejects non-admin users", async () => {
    const caller = appRouter.createCaller(createCitizenContext());
    await expect(caller.admin.dashboardStats())
      .rejects.toThrow();
  });

  it("rejects unauthenticated users", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    await expect(caller.admin.dashboardStats())
      .rejects.toThrow();
  });
});

describe("admin.createParcel", () => {
  it("creates a parcel with audit trail", async () => {
    const mockParcel = {
      id: 1, publicToken: "generated", reference: "ABJ-2025-001",
      zoneCode: "ABJ-COCODY", statusPublic: "dossier_en_cours" as const,
      surfaceApprox: "500 m²", localisation: "Cocody",
      kpiFlagsJson: null, createdAt: new Date(), updatedAt: new Date(), createdById: 1,
    };
    mockDb.createParcel.mockResolvedValue(mockParcel);
    mockDb.createParcelEvent.mockResolvedValue(undefined);
    mockDb.createAuditEvent.mockResolvedValue(undefined);

    const caller = appRouter.createCaller(createAdminContext());
    const result = await caller.admin.createParcel({
      reference: "ABJ-2025-001",
      zoneCode: "ABJ-COCODY",
      localisation: "Cocody",
      surfaceApprox: "500 m²",
    });

    expect(result?.reference).toBe("ABJ-2025-001");
    expect(mockDb.createParcel).toHaveBeenCalledOnce();
    expect(mockDb.createParcelEvent).toHaveBeenCalledOnce();
    expect(mockDb.createAuditEvent).toHaveBeenCalledOnce();
  });
});

describe("admin.updateUserRole", () => {
  it("updates user role with audit", async () => {
    mockDb.updateUserRole.mockResolvedValue(undefined);
    mockDb.createAuditEvent.mockResolvedValue(undefined);

    const caller = appRouter.createCaller(createAdminContext());
    const result = await caller.admin.updateUserRole({
      userId: 2,
      role: "agent_terrain",
    });

    expect(result.success).toBe(true);
    expect(mockDb.updateUserRole).toHaveBeenCalledWith(2, "agent_terrain", undefined);
    expect(mockDb.createAuditEvent).toHaveBeenCalledOnce();
  });
});

describe("admin.listUsers", () => {
  it("returns user list for admins", async () => {
    mockDb.listUsers.mockResolvedValue([
      { id: 1, openId: "u1", name: "User 1", email: "u1@test.com", role: "citizen", loginMethod: "manus", zoneCodes: null, isActive: true, createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() },
    ]);

    const caller = appRouter.createCaller(createAdminContext());
    const users = await caller.admin.listUsers();
    expect(users).toHaveLength(1);
    expect(users[0].name).toBe("User 1");
  });
});

describe("admin.generateVerifyToken", () => {
  it("generates a verify token and returns raw token", async () => {
    mockDb.createVerifyToken.mockResolvedValue(undefined);
    mockDb.createAuditEvent.mockResolvedValue(undefined);

    const caller = appRouter.createCaller(createAdminContext());
    const result = await caller.admin.generateVerifyToken({
      tokenType: "insurance",
      targetId: 1,
      expiresInDays: 90,
    });

    expect(result.token).toBeDefined();
    expect(result.token.length).toBe(64); // 32 bytes hex
    expect(result.expiresAt).toBeInstanceOf(Date);
    expect(mockDb.createVerifyToken).toHaveBeenCalledOnce();
    expect(mockDb.createAuditEvent).toHaveBeenCalledOnce();
  });
});
