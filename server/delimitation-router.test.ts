import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock db module
vi.mock("./db", () => ({
  insertTerritory: vi.fn(),
  getTerritoryByIdAndOwner: vi.fn(),
  listTerritoriesByOwner: vi.fn(),
  countTerritoriesByOwner: vi.fn(),
  updateTerritory: vi.fn(),
  insertBoundaryPoints: vi.fn(),
  listBoundaryPointsByTerritory: vi.fn(),
  updateBoundaryPoint: vi.fn(),
  deleteBoundaryPoint: vi.fn(),
  deleteAllBoundaryPointsByTerritory: vi.fn(),
  replaceBoundaryPoints: vi.fn(),
  insertTerritoryDocument: vi.fn(),
  listTerritoryDocuments: vi.fn(),
  deleteTerritoryDocument: vi.fn(),
  createAuditEvent: vi.fn(),
}));

vi.mock("./storage", () => ({
  storagePut: vi.fn().mockResolvedValue({ url: "https://s3.example.com/file.pdf", key: "delimitation/1/file.pdf" }),
  storageGet: vi.fn().mockResolvedValue({ url: "https://s3.example.com/file.pdf", key: "delimitation/1/file.pdf" }),
}));

import {
  insertTerritory,
  getTerritoryByIdAndOwner,
  listTerritoriesByOwner,
  countTerritoriesByOwner,
  updateTerritory,
  replaceBoundaryPoints,
  listBoundaryPointsByTerritory,
  updateBoundaryPoint,
  deleteBoundaryPoint,
  insertTerritoryDocument,
  listTerritoryDocuments,
  deleteTerritoryDocument,
  createAuditEvent,
} from "./db";

import { delimitationRouter } from "./delimitation-router";
import { router } from "./_core/trpc";

const appRouter = router({ delimitation: delimitationRouter });

const mockUser = { id: 1, name: "Test User", role: "admin" as const, openId: "test-open-id", email: "test@test.com" };
const mockOtherUser = { id: 2, name: "Other User", role: "admin" as const, openId: "other-open-id", email: "other@test.com" };

function createCaller(user: typeof mockUser | null = mockUser) {
  return appRouter.createCaller({
    user,
    req: { headers: {} } as any,
    res: { cookie: vi.fn(), clearCookie: vi.fn() } as any,
  });
}

const mockTerritory = {
  id: 1,
  code: "TER-ABC123-XYZ",
  name: "Village Test",
  chiefName: "Chef Test",
  chiefPhone: "+225 07 00 00 00",
  estimatedAreaHa: 250,
  calculatedAreaHa: null,
  calculatedPerimeterKm: null,
  status: "draft" as const,
  siforCode: null,
  chiefSignedAt: null,
  chiefComments: null,
  officializedAt: null,
  syncedAt: null,
  createdById: 1,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockPoints = [
  { id: 1, territoryId: 1, pointNumber: 1, latitude: "5.360", longitude: "-4.008", landmark: "Point 1", source: "manual" as const, createdAt: new Date(), updatedAt: new Date() },
  { id: 2, territoryId: 1, pointNumber: 2, latitude: "5.361", longitude: "-4.009", landmark: "Point 2", source: "manual" as const, createdAt: new Date(), updatedAt: new Date() },
  { id: 3, territoryId: 1, pointNumber: 3, latitude: "5.362", longitude: "-4.010", landmark: "Point 3", source: "manual" as const, createdAt: new Date(), updatedAt: new Date() },
  { id: 4, territoryId: 1, pointNumber: 4, latitude: "5.363", longitude: "-4.011", landmark: "Point 4", source: "gpx_import" as const, createdAt: new Date(), updatedAt: new Date() },
];

describe("delimitation-router", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("create", () => {
    it("creates a territory and returns it", async () => {
      (insertTerritory as any).mockResolvedValue(mockTerritory);
      (createAuditEvent as any).mockResolvedValue(undefined);

      const caller = createCaller();
      const result = await caller.delimitation.create({
        name: "Village Test",
        chiefName: "Chef Test",
        chiefPhone: "+225 07 00 00 00",
        estimatedAreaHa: 250,
      });

      expect(result).toEqual(mockTerritory);
      expect(insertTerritory).toHaveBeenCalledWith(expect.objectContaining({
        name: "Village Test",
        chiefName: "Chef Test",
        status: "draft",
        createdById: 1,
      }));
      expect(createAuditEvent).toHaveBeenCalledWith(expect.objectContaining({
        action: "delimitation.territory.created",
        targetType: "village_territory",
      }));
    });

    it("rejects unauthenticated users", async () => {
      const caller = createCaller(null);
      await expect(caller.delimitation.create({
        name: "Village Test",
        chiefName: "Chef Test",
      })).rejects.toThrow();
    });
  });

  describe("list", () => {
    it("returns territories for the current user", async () => {
      (listTerritoriesByOwner as any).mockResolvedValue([mockTerritory]);
      (countTerritoriesByOwner as any).mockResolvedValue(1);

      const caller = createCaller();
      const result = await caller.delimitation.list({ limit: 20, offset: 0 });

      expect(result.territories).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(listTerritoriesByOwner).toHaveBeenCalledWith(1, 20, 0);
    });
  });

  describe("getById", () => {
    it("returns territory with points and documents", async () => {
      (getTerritoryByIdAndOwner as any).mockResolvedValue(mockTerritory);
      (listBoundaryPointsByTerritory as any).mockResolvedValue(mockPoints);
      (listTerritoryDocuments as any).mockResolvedValue([]);

      const caller = createCaller();
      const result = await caller.delimitation.getById({ territoryId: 1 });

      expect(result.territory).toEqual(mockTerritory);
      expect(result.points).toHaveLength(4);
      expect(result.documents).toHaveLength(0);
    });

    it("rejects access to another user's territory", async () => {
      (getTerritoryByIdAndOwner as any).mockResolvedValue(undefined);

      const caller = createCaller(mockOtherUser);
      await expect(caller.delimitation.getById({ territoryId: 1 })).rejects.toThrow("introuvable");
    });
  });

  describe("savePoints", () => {
    it("saves points and updates territory", async () => {
      (getTerritoryByIdAndOwner as any).mockResolvedValue(mockTerritory);
      (replaceBoundaryPoints as any).mockResolvedValue(undefined);
      (updateTerritory as any).mockResolvedValue(undefined);
      (createAuditEvent as any).mockResolvedValue(undefined);

      const caller = createCaller();
      const result = await caller.delimitation.savePoints({
        territoryId: 1,
        points: [
          { pointNumber: 1, latitude: "5.360", longitude: "-4.008", source: "manual" },
          { pointNumber: 2, latitude: "5.361", longitude: "-4.009", source: "manual" },
          { pointNumber: 3, latitude: "5.362", longitude: "-4.010", source: "manual" },
          { pointNumber: 4, latitude: "5.363", longitude: "-4.011", source: "gpx_import" },
        ],
        calculatedAreaHa: "120.50",
        calculatedPerimeterKm: "4.320",
      });

      expect(result.success).toBe(true);
      expect(result.pointCount).toBe(4);
      expect(replaceBoundaryPoints).toHaveBeenCalled();
      expect(updateTerritory).toHaveBeenCalledWith(1, expect.objectContaining({
        status: "collecting",
        calculatedAreaHa: "120.50",
      }));
    });

    it("rejects fewer than 4 points", async () => {
      (getTerritoryByIdAndOwner as any).mockResolvedValue(mockTerritory);

      const caller = createCaller();
      await expect(caller.delimitation.savePoints({
        territoryId: 1,
        points: [
          { pointNumber: 1, latitude: "5.360", longitude: "-4.008", source: "manual" },
          { pointNumber: 2, latitude: "5.361", longitude: "-4.009", source: "manual" },
        ],
      })).rejects.toThrow();
    });
  });

  describe("submitPoints", () => {
    it("transitions to submitted status", async () => {
      (getTerritoryByIdAndOwner as any).mockResolvedValue(mockTerritory);
      (listBoundaryPointsByTerritory as any).mockResolvedValue(mockPoints);
      (updateTerritory as any).mockResolvedValue(undefined);
      (createAuditEvent as any).mockResolvedValue(undefined);

      const caller = createCaller();
      const result = await caller.delimitation.submitPoints({ territoryId: 1 });

      expect(result.success).toBe(true);
      expect(updateTerritory).toHaveBeenCalledWith(1, { status: "submitted" });
    });

    it("rejects if fewer than 4 points", async () => {
      (getTerritoryByIdAndOwner as any).mockResolvedValue(mockTerritory);
      (listBoundaryPointsByTerritory as any).mockResolvedValue([mockPoints[0], mockPoints[1]]);

      const caller = createCaller();
      await expect(caller.delimitation.submitPoints({ territoryId: 1 })).rejects.toThrow("4 points");
    });
  });

  describe("validateByChief", () => {
    it("transitions to validated_chief", async () => {
      const submitted = { ...mockTerritory, status: "submitted" as const };
      (getTerritoryByIdAndOwner as any).mockResolvedValue(submitted);
      (updateTerritory as any).mockResolvedValue(undefined);
      (createAuditEvent as any).mockResolvedValue(undefined);

      const caller = createCaller();
      const result = await caller.delimitation.validateByChief({
        territoryId: 1,
        chiefComments: "Limites conformes",
      });

      expect(result.success).toBe(true);
      expect(updateTerritory).toHaveBeenCalledWith(1, expect.objectContaining({
        status: "validated_chief",
        chiefComments: "Limites conformes",
      }));
    });

    it("rejects if not in submitted status", async () => {
      (getTerritoryByIdAndOwner as any).mockResolvedValue(mockTerritory); // status: draft

      const caller = createCaller();
      await expect(caller.delimitation.validateByChief({ territoryId: 1 })).rejects.toThrow("soumis");
    });
  });

  describe("officialize", () => {
    it("transitions to official", async () => {
      const validated = { ...mockTerritory, status: "validated_chief" as const };
      (getTerritoryByIdAndOwner as any).mockResolvedValue(validated);
      (updateTerritory as any).mockResolvedValue(undefined);
      (createAuditEvent as any).mockResolvedValue(undefined);

      const caller = createCaller();
      const result = await caller.delimitation.officialize({ territoryId: 1 });

      expect(result.success).toBe(true);
      expect(updateTerritory).toHaveBeenCalledWith(1, expect.objectContaining({
        status: "official",
      }));
    });

    it("rejects if not validated by chief", async () => {
      const submitted = { ...mockTerritory, status: "submitted" as const };
      (getTerritoryByIdAndOwner as any).mockResolvedValue(submitted);

      const caller = createCaller();
      await expect(caller.delimitation.officialize({ territoryId: 1 })).rejects.toThrow("validé par le chef");
    });
  });

  describe("syncSifor", () => {
    it("transitions to synced with sifor code", async () => {
      const official = { ...mockTerritory, status: "official" as const };
      (getTerritoryByIdAndOwner as any).mockResolvedValue(official);
      (updateTerritory as any).mockResolvedValue(undefined);
      (createAuditEvent as any).mockResolvedValue(undefined);

      const caller = createCaller();
      const result = await caller.delimitation.syncSifor({ territoryId: 1 });

      expect(result.success).toBe(true);
      expect(result.siforCode).toContain("SIFOR-CI-");
      expect(updateTerritory).toHaveBeenCalledWith(1, expect.objectContaining({
        status: "synced",
      }));
    });

    it("rejects if not official", async () => {
      const validated = { ...mockTerritory, status: "validated_chief" as const };
      (getTerritoryByIdAndOwner as any).mockResolvedValue(validated);

      const caller = createCaller();
      await expect(caller.delimitation.syncSifor({ territoryId: 1 })).rejects.toThrow("officialisé");
    });
  });

  describe("updatePoint - ownership check", () => {
    it("rejects updating a point not belonging to the territory", async () => {
      (getTerritoryByIdAndOwner as any).mockResolvedValue(mockTerritory);
      (listBoundaryPointsByTerritory as any).mockResolvedValue(mockPoints); // IDs 1-4

      const caller = createCaller();
      await expect(caller.delimitation.updatePoint({
        territoryId: 1,
        pointId: 999, // does not exist in this territory
        latitude: "5.400",
        longitude: "-4.100",
      })).rejects.toThrow("introuvable");
    });

    it("allows updating a point that belongs to the territory", async () => {
      (getTerritoryByIdAndOwner as any).mockResolvedValue(mockTerritory);
      (listBoundaryPointsByTerritory as any).mockResolvedValue(mockPoints);
      (updateBoundaryPoint as any).mockResolvedValue(undefined);
      (createAuditEvent as any).mockResolvedValue(undefined);

      const caller = createCaller();
      const result = await caller.delimitation.updatePoint({
        territoryId: 1,
        pointId: 1,
        latitude: "5.400",
        longitude: "-4.100",
      });

      expect(result.success).toBe(true);
    });
  });

  describe("deletePoint - ownership check", () => {
    it("rejects deleting a point not belonging to the territory", async () => {
      (getTerritoryByIdAndOwner as any).mockResolvedValue(mockTerritory);
      (listBoundaryPointsByTerritory as any).mockResolvedValue(mockPoints);

      const caller = createCaller();
      await expect(caller.delimitation.deletePoint({
        territoryId: 1,
        pointId: 999,
      })).rejects.toThrow("introuvable");
    });
  });

  describe("deleteDocument - ownership check", () => {
    it("rejects deleting a document not belonging to the territory", async () => {
      (getTerritoryByIdAndOwner as any).mockResolvedValue(mockTerritory);
      (listTerritoryDocuments as any).mockResolvedValue([{ id: 10, territoryId: 1 }]);

      const caller = createCaller();
      await expect(caller.delimitation.deleteDocument({
        territoryId: 1,
        documentId: 999,
      })).rejects.toThrow("introuvable");
    });
  });
});
