import { describe, expect, it, beforeEach, vi } from "vitest";
import type { TrpcContext } from "./_core/context";

vi.mock("./db", () => ({
  createAuditEvent: vi.fn(),
  getCreditDocumentByFileAndType: vi.fn(),
  getCreditFileByIdAndOwner: vi.fn(),
  getParcelById: vi.fn(),
  insertCreditDocument: vi.fn(),
  insertCreditFile: vi.fn(),
  insertCreditFileParticipant: vi.fn(),
  listCreditDocumentsByFile: vi.fn(),
  listCreditFileParticipants: vi.fn(),
  listCreditFilesByOwner: vi.fn(),
  updateCreditDocument: vi.fn(),
  updateCreditFileStatus: vi.fn(),
}));

vi.mock("./storage", () => ({
  storagePut: vi.fn(),
}));

vi.mock("./credit-checklist.service", () => ({
  CreditChecklistService: {
    isCreditFileComplete: vi.fn(),
    getChecklistStatus: vi.fn(),
  },
}));

import * as db from "./db";
import { CreditChecklistService } from "./credit-checklist.service";
import { creditRouter } from "./credit-router";
import { storagePut } from "./storage";

const mockDb = vi.mocked(db);
const mockChecklistService = vi.mocked(CreditChecklistService);
const mockStoragePut = vi.mocked(storagePut);

function createCitizenContext(userId = 2): TrpcContext {
  return {
    user: {
      id: userId,
      openId: `citizen-${userId}`,
      email: `citizen${userId}@example.com`,
      name: "Citizen",
      loginMethod: "manus",
      role: "citizen",
      zoneCodes: null,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: {} as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  process.env.CREDIT_WORKFLOW_ENABLED = "true";
});

describe("credit router", () => {
  it("rejects credit routes when feature flag is disabled", async () => {
    process.env.CREDIT_WORKFLOW_ENABLED = "false";
    const caller = creditRouter.createCaller(createCitizenContext());

    await expect(
      caller.createCreditFile({
        productType: "STANDARD",
      })
    ).rejects.toThrow("Le module credit habitat n'est pas encore active.");
  });

  it("creates a draft credit file for the authenticated citizen", async () => {
    mockDb.insertCreditFile.mockResolvedValue({
      id: 11,
      publicRef: "CF-2026-ABCDE",
      initiatorId: 2,
      parcelId: null,
      amountRequestedXof: 2_500_000,
      durationMonths: 24,
      productType: "STANDARD",
      status: "DRAFT",
      metadata: {},
      createdAt: new Date(),
      updatedAt: new Date(),
      submittedAt: null,
      lastTransitionAt: new Date(),
      closedAt: null,
    } as any);
    mockDb.insertCreditFileParticipant.mockResolvedValue(undefined);
    mockDb.createAuditEvent.mockResolvedValue(undefined);

    const caller = creditRouter.createCaller(createCitizenContext());
    const result = await caller.createCreditFile({
      productType: "STANDARD",
      amountRequestedXof: 2_500_000,
      durationMonths: 24,
    });

    expect(result.creditFileId).toBe(11);
    expect(result.status).toBe("DRAFT");
    expect(mockDb.insertCreditFile).toHaveBeenCalledWith(
      expect.objectContaining({
        initiatorId: 2,
        productType: "STANDARD",
      })
    );
    expect(mockDb.createAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "credit.file.created",
        targetType: "credit_file",
        targetId: 11,
      })
    );
  });

  it("enforces owner isolation when reading a credit file", async () => {
    mockDb.getCreditFileByIdAndOwner.mockResolvedValue(undefined);

    const caller = creditRouter.createCaller(createCitizenContext(2));
    await expect(caller.getMyCreditFile({ creditFileId: 99 }))
      .rejects.toThrow("Dossier credit introuvable ou acces non autorise");
  });

  it("rejects submission when the file is incomplete and audits the error", async () => {
    mockDb.getCreditFileByIdAndOwner.mockResolvedValue({
      id: 12,
      publicRef: "CF-2026-ZZZZZ",
      initiatorId: 2,
      parcelId: null,
      amountRequestedXof: null,
      durationMonths: null,
      productType: "STANDARD",
      status: "DRAFT",
      metadata: {},
      createdAt: new Date(),
      updatedAt: new Date(),
      submittedAt: null,
      lastTransitionAt: new Date(),
      closedAt: null,
    } as any);
    mockChecklistService.isCreditFileComplete.mockResolvedValue(false);
    mockChecklistService.getChecklistStatus.mockResolvedValue({
      isComplete: false,
      requiredDocuments: {
        total: 4,
        uploaded: 2,
        missing: ["PROOF_INCOME", "LAND_TITLE_DEED"],
      },
      optionalDocuments: {
        total: 0,
        uploaded: 0,
        missing: [],
      },
      completionPercentage: 50,
    });
    mockDb.createAuditEvent.mockResolvedValue(undefined);

    const caller = creditRouter.createCaller(createCitizenContext());
    await expect(caller.submitCreditFile({ creditFileId: 12 }))
      .rejects.toThrow("Dossier incomplet");

    expect(mockDb.createAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "credit.file.error",
        targetType: "credit_file",
        targetId: 12,
      })
    );
  });

  it("uploads and attaches a document to the authenticated citizen credit file", async () => {
    mockDb.getCreditFileByIdAndOwner.mockResolvedValue({
      id: 44,
      publicRef: "CF-2026-UPL01",
      initiatorId: 2,
      parcelId: null,
      amountRequestedXof: null,
      durationMonths: null,
      productType: "STANDARD",
      status: "DRAFT",
      metadata: {},
      createdAt: new Date(),
      updatedAt: new Date(),
      submittedAt: null,
      lastTransitionAt: new Date(),
      closedAt: null,
    } as any);
    mockDb.getCreditDocumentByFileAndType.mockResolvedValue(undefined);
    mockStoragePut.mockResolvedValue({
      key: "credit-files/2/44/ID_CARD-test.pdf",
      url: "https://cdn.example.com/credit-files/2/44/ID_CARD-test.pdf",
    });
    mockDb.insertCreditDocument.mockResolvedValue({
      id: 91,
    } as any);
    mockDb.updateCreditFileStatus.mockResolvedValue(undefined);
    mockDb.createAuditEvent.mockResolvedValue(undefined);

    const caller = creditRouter.createCaller(createCitizenContext());
    const payload = Buffer.from("fake-pdf").toString("base64");

    const result = await caller.addCreditDocument({
      creditFileId: 44,
      documentType: "ID_CARD",
      fileName: "identity.pdf",
      contentType: "application/pdf",
      fileBase64: payload,
    });

    expect(result.documentId).toBe(91);
    expect(mockStoragePut).toHaveBeenCalledOnce();
    expect(mockDb.insertCreditDocument).toHaveBeenCalledWith(
      expect.objectContaining({
        creditFileId: 44,
        documentType: "ID_CARD",
        mimeType: "application/pdf",
      })
    );
    expect(mockDb.updateCreditFileStatus).toHaveBeenCalledWith(
      44,
      expect.objectContaining({
        status: "DOCS_PENDING",
      })
    );
  });

  it("rejects addCreditDocument for unsupported mime types", async () => {
    mockDb.getCreditFileByIdAndOwner.mockResolvedValue({
      id: 44,
      publicRef: "CF-2026-UPL02",
      initiatorId: 2,
      parcelId: null,
      amountRequestedXof: null,
      durationMonths: null,
      productType: "STANDARD",
      status: "DRAFT",
      metadata: {},
      createdAt: new Date(),
      updatedAt: new Date(),
      submittedAt: null,
      lastTransitionAt: new Date(),
      closedAt: null,
    } as any);

    const caller = creditRouter.createCaller(createCitizenContext());
    await expect(
      caller.addCreditDocument({
        creditFileId: 44,
        documentType: "ID_CARD",
        fileName: "script.txt",
        contentType: "text/plain",
        fileBase64: Buffer.from("hello").toString("base64"),
      })
    ).rejects.toThrow("Format de fichier non autorise");
  });
});
