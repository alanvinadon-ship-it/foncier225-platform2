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
  updateParcelOwner: vi.fn(),
  // Citizen helpers
  getCitizenDashboardStats: vi.fn(),
  listParcelsByOwner: vi.fn(),
  countParcelsByOwner: vi.fn(),
  getParcelByIdAndOwner: vi.fn(),
  getParcelEventsForOwner: vi.fn(),
  getCitizenTimeline: vi.fn(),
  listDocumentsByOwner: vi.fn(),
  countDocumentsByOwner: vi.fn(),
  listDocumentsByParcelAndOwner: vi.fn(),
  getDocumentByIdAndOwner: vi.fn(),
  listAttestationsByParcelAndOwner: vi.fn(),
  listAllDocuments: vi.fn(),
  countAllDocuments: vi.fn(),
  insertCreditFile: vi.fn(),
  getCreditFileById: vi.fn(),
  getCreditFileByIdAndOwner: vi.fn(),
  getParcelById: vi.fn(),
  getUserById: vi.fn(),
  listCreditFilesByOwner: vi.fn(),
  listCreditFilesByStatuses: vi.fn(),
  insertCreditFileParticipant: vi.fn(),
  listCreditFileParticipants: vi.fn(),
  getCreditDocumentByFileAndType: vi.fn(),
  insertCreditDocument: vi.fn(),
  updateCreditDocument: vi.fn(),
  listCreditDocumentsByFile: vi.fn(),
  updateCreditFileStatus: vi.fn(),
  insertCreditRequest: vi.fn(),
  insertCreditOffer: vi.fn(),
  insertCreditDecision: vi.fn(),
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

function createCitizenContext(userId = 2): TrpcContext {
  return {
    user: {
      id: userId,
      openId: "citizen-user",
      email: "citizen@example.com",
      name: "Citoyen Test",
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

// ─── Citizen Router Tests ────────────────────────────────────────────
describe("citizen.profile", () => {
  it("returns the authenticated citizen's own profile", async () => {
    mockDb.createAuditEvent.mockResolvedValue(undefined);

    const caller = appRouter.createCaller(createCitizenContext());
    const result = await caller.citizen.profile();

    expect(result.id).toBe(2);
    expect(result.name).toBe("Citoyen Test");
    expect(result.email).toBe("citizen@example.com");
    expect(result.role).toBe("citizen");
    // Audit event should be created
    expect(mockDb.createAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "citizen.viewProfile",
        targetType: "user",
        targetId: 2,
      })
    );
  });

  it("rejects unauthenticated users", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    await expect(caller.citizen.profile()).rejects.toThrow();
  });
});

describe("citizen.dashboardStats", () => {
  it("returns stats scoped to the citizen's own data", async () => {
    mockDb.getCitizenDashboardStats.mockResolvedValue({ parcels: 3, documents: 5 });

    const caller = appRouter.createCaller(createCitizenContext());
    const stats = await caller.citizen.dashboardStats();

    expect(stats.parcels).toBe(3);
    expect(stats.documents).toBe(5);
    expect(mockDb.getCitizenDashboardStats).toHaveBeenCalledWith(2);
  });
});

describe("citizen.myParcels", () => {
  it("returns only parcels owned by the citizen", async () => {
    const ownedParcels = [
      { id: 10, reference: "ABJ-001", ownerId: 2, zoneCode: "ABJ", statusPublic: "valide" as const, publicToken: "tok1", surfaceApprox: null, localisation: null, kpiFlagsJson: null, createdAt: new Date(), updatedAt: new Date(), createdById: 1 },
      { id: 11, reference: "ABJ-002", ownerId: 2, zoneCode: "ABJ", statusPublic: "dossier_en_cours" as const, publicToken: "tok2", surfaceApprox: null, localisation: null, kpiFlagsJson: null, createdAt: new Date(), updatedAt: new Date(), createdById: 1 },
    ];
    mockDb.listParcelsByOwner.mockResolvedValue(ownedParcels);
    mockDb.createAuditEvent.mockResolvedValue(undefined);

    const caller = appRouter.createCaller(createCitizenContext());
    const result = await caller.citizen.myParcels();

    expect(result).toHaveLength(2);
    expect(result[0].reference).toBe("ABJ-001");
    expect(mockDb.listParcelsByOwner).toHaveBeenCalledWith(2);
  });

  it("rejects unauthenticated users", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    await expect(caller.citizen.myParcels()).rejects.toThrow();
  });
});

describe("citizen.parcelDetail", () => {
  it("returns parcel detail when owned by citizen", async () => {
    const parcel = {
      id: 10, reference: "ABJ-001", ownerId: 2, zoneCode: "ABJ",
      statusPublic: "valide" as const, publicToken: "tok1",
      surfaceApprox: "500 m²", localisation: "Cocody",
      kpiFlagsJson: null, createdAt: new Date(), updatedAt: new Date(), createdById: 1,
    };
    mockDb.getParcelByIdAndOwner.mockResolvedValue(parcel);
    mockDb.createAuditEvent.mockResolvedValue(undefined);

    const caller = appRouter.createCaller(createCitizenContext());
    const result = await caller.citizen.parcelDetail({ parcelId: 10 });

    expect(result.reference).toBe("ABJ-001");
    expect(mockDb.getParcelByIdAndOwner).toHaveBeenCalledWith(10, 2);
  });

  it("throws NOT_FOUND when parcel not owned by citizen", async () => {
    mockDb.getParcelByIdAndOwner.mockResolvedValue(undefined);

    const caller = appRouter.createCaller(createCitizenContext());
    await expect(caller.citizen.parcelDetail({ parcelId: 999 }))
      .rejects.toThrow("Parcelle introuvable ou accès non autorisé");
  });

  it("citizen A cannot access citizen B's parcel", async () => {
    // Citizen B (id=3) owns parcel 20
    mockDb.getParcelByIdAndOwner.mockResolvedValue(undefined);

    const callerA = appRouter.createCaller(createCitizenContext(2));
    await expect(callerA.citizen.parcelDetail({ parcelId: 20 }))
      .rejects.toThrow("Parcelle introuvable ou accès non autorisé");

    // Verify the query was made with citizen A's id
    expect(mockDb.getParcelByIdAndOwner).toHaveBeenCalledWith(20, 2);
  });
});

describe("citizen.parcelEvents", () => {
  it("returns events for an owned parcel", async () => {
    const events = [
      { id: 1, parcelId: 10, eventType: "creation", title: "Créée", description: null, monthYear: "mars 2025", isPublic: true, metadata: null, createdAt: new Date(), createdById: 1 },
    ];
    mockDb.getParcelEventsForOwner.mockResolvedValue(events);

    const caller = appRouter.createCaller(createCitizenContext());
    const result = await caller.citizen.parcelEvents({ parcelId: 10 });

    expect(result).toHaveLength(1);
    expect(mockDb.getParcelEventsForOwner).toHaveBeenCalledWith(10, 2);
  });

  it("throws NOT_FOUND when parcel not owned", async () => {
    mockDb.getParcelEventsForOwner.mockResolvedValue([]);
    mockDb.getParcelByIdAndOwner.mockResolvedValue(undefined);

    const caller = appRouter.createCaller(createCitizenContext());
    await expect(caller.citizen.parcelEvents({ parcelId: 999 }))
      .rejects.toThrow("Parcelle introuvable ou accès non autorisé");
  });
});

describe("citizen.timeline", () => {
  it("returns aggregated timeline across all owned parcels", async () => {
    const timeline = [
      { id: 1, parcelId: 10, eventType: "creation", title: "Parcelle créée", description: null, monthYear: "mars 2025", isPublic: true, metadata: null, createdAt: new Date(), createdById: 1 },
      { id: 2, parcelId: 11, eventType: "validation", title: "Parcelle validée", description: null, monthYear: "avril 2025", isPublic: true, metadata: null, createdAt: new Date(), createdById: 1 },
    ];
    mockDb.getCitizenTimeline.mockResolvedValue(timeline);

    const caller = appRouter.createCaller(createCitizenContext());
    const result = await caller.citizen.timeline();

    expect(result).toHaveLength(2);
    expect(mockDb.getCitizenTimeline).toHaveBeenCalledWith(2, 50);
  });
});

describe("citizen.myDocuments", () => {
  it("returns only documents owned by the citizen", async () => {
    const docs = [
      { id: 1, parcelId: 10, ownerId: 2, title: "Titre foncier", documentType: "titre_foncier" as const, description: null, fileUrl: "https://cdn.example.com/doc.pdf", fileKey: "doc-key", mimeType: "application/pdf", fileSize: 1024, status: "published" as const, metadata: null, createdAt: new Date(), updatedAt: new Date() },
    ];
    mockDb.listDocumentsByOwner.mockResolvedValue(docs);

    const caller = appRouter.createCaller(createCitizenContext());
    const result = await caller.citizen.myDocuments();

    expect(result).toHaveLength(1);
    expect(result[0].title).toBe("Titre foncier");
    expect(mockDb.listDocumentsByOwner).toHaveBeenCalledWith(2);
  });
});

describe("citizen.parcelDocuments", () => {
  it("returns documents for an owned parcel", async () => {
    const parcel = { id: 10, reference: "ABJ-001", ownerId: 2, zoneCode: "ABJ", statusPublic: "valide" as const, publicToken: "tok1", surfaceApprox: null, localisation: null, kpiFlagsJson: null, createdAt: new Date(), updatedAt: new Date(), createdById: 1 };
    mockDb.getParcelByIdAndOwner.mockResolvedValue(parcel);
    mockDb.listDocumentsByParcelAndOwner.mockResolvedValue([]);

    const caller = appRouter.createCaller(createCitizenContext());
    const result = await caller.citizen.parcelDocuments({ parcelId: 10 });

    expect(result).toHaveLength(0);
    expect(mockDb.getParcelByIdAndOwner).toHaveBeenCalledWith(10, 2);
  });

  it("throws NOT_FOUND when parcel not owned", async () => {
    mockDb.getParcelByIdAndOwner.mockResolvedValue(undefined);

    const caller = appRouter.createCaller(createCitizenContext());
    await expect(caller.citizen.parcelDocuments({ parcelId: 999 }))
      .rejects.toThrow("Parcelle introuvable ou accès non autorisé");
  });
});

describe("citizen.documentDetail", () => {
  it("returns document when owned by citizen", async () => {
    const doc = {
      id: 1, parcelId: 10, ownerId: 2, title: "Attestation",
      documentType: "attestation" as const, description: null,
      fileUrl: "https://cdn.example.com/att.pdf", fileKey: "att-key",
      mimeType: "application/pdf", fileSize: 2048,
      status: "published" as const, metadata: null,
      createdAt: new Date(), updatedAt: new Date(),
    };
    mockDb.getDocumentByIdAndOwner.mockResolvedValue(doc);
    mockDb.createAuditEvent.mockResolvedValue(undefined);

    const caller = appRouter.createCaller(createCitizenContext());
    const result = await caller.citizen.documentDetail({ documentId: 1 });

    expect(result.title).toBe("Attestation");
    expect(mockDb.createAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "citizen.viewDocument",
        targetType: "document",
        targetId: 1,
      })
    );
  });

  it("throws NOT_FOUND when document not owned", async () => {
    mockDb.getDocumentByIdAndOwner.mockResolvedValue(undefined);

    const caller = appRouter.createCaller(createCitizenContext());
    await expect(caller.citizen.documentDetail({ documentId: 999 }))
      .rejects.toThrow("Document introuvable ou accès non autorisé");
  });
});

describe("citizen.parcelAttestations", () => {
  it("returns attestations for an owned parcel", async () => {
    const parcel = { id: 10, reference: "ABJ-001", ownerId: 2, zoneCode: "ABJ", statusPublic: "valide" as const, publicToken: "tok1", surfaceApprox: null, localisation: null, kpiFlagsJson: null, createdAt: new Date(), updatedAt: new Date(), createdById: 1 };
    mockDb.getParcelByIdAndOwner.mockResolvedValue(parcel);
    mockDb.listAttestationsByParcelAndOwner.mockResolvedValue([]);

    const caller = appRouter.createCaller(createCitizenContext());
    const result = await caller.citizen.parcelAttestations({ parcelId: 10 });

    expect(result).toHaveLength(0);
  });

  it("throws NOT_FOUND when parcel not owned", async () => {
    mockDb.getParcelByIdAndOwner.mockResolvedValue(undefined);

    const caller = appRouter.createCaller(createCitizenContext());
    await expect(caller.citizen.parcelAttestations({ parcelId: 999 }))
      .rejects.toThrow("Parcelle introuvable ou accès non autorisé");
  });
});

// ─── Admin Router Tests ──────────────────────────────────────────────
describe("admin.dashboardStats", () => {
  it("returns stats for admin users", async () => {
    mockDb.getDashboardStats.mockResolvedValue({
      users: 10, parcels: 50, attestations: 20, auditEvents: 100, verifyTokens: 15, documents: 8,
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

describe("admin.assignParcelOwner", () => {
  it("assigns a parcel to a citizen with audit", async () => {
    mockDb.updateParcelOwner.mockResolvedValue(undefined);
    mockDb.createAuditEvent.mockResolvedValue(undefined);

    const caller = appRouter.createCaller(createAdminContext());
    const result = await caller.admin.assignParcelOwner({
      parcelId: 10,
      ownerId: 2,
    });

    expect(result.success).toBe(true);
    expect(mockDb.updateParcelOwner).toHaveBeenCalledWith(10, 2);
    expect(mockDb.createAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "admin.assignParcelOwner",
        targetType: "parcel",
        targetId: 10,
      })
    );
  });

  it("rejects non-admin users", async () => {
    const caller = appRouter.createCaller(createCitizenContext());
    await expect(caller.admin.assignParcelOwner({ parcelId: 10, ownerId: 2 }))
      .rejects.toThrow();
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

// ─── Cross-role isolation tests ──────────────────────────────────────
describe("cross-role isolation", () => {
  it("citizen cannot access admin routes", async () => {
    const caller = appRouter.createCaller(createCitizenContext());
    await expect(caller.admin.listUsers()).rejects.toThrow();
    await expect(caller.admin.listParcels()).rejects.toThrow();
    await expect(caller.admin.listAuditEvents()).rejects.toThrow();
  });

  it("unauthenticated user cannot access citizen routes", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    await expect(caller.citizen.profile()).rejects.toThrow();
    await expect(caller.citizen.myParcels()).rejects.toThrow();
    await expect(caller.citizen.timeline()).rejects.toThrow();
    await expect(caller.citizen.myDocuments()).rejects.toThrow();
  });

  it("admin can also access citizen routes (admin is a superset)", async () => {
    mockDb.createAuditEvent.mockResolvedValue(undefined);

    const caller = appRouter.createCaller(createAdminContext());
    const profile = await caller.citizen.profile();
    expect(profile.id).toBe(1);
    expect(profile.role).toBe("admin");
  });
});
