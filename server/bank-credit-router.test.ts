import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";

vi.mock("./db", () => ({
  createAttestation: vi.fn(),
  createAuditEvent: vi.fn(),
  createDocument: vi.fn(),
  createGeneratedDocument: vi.fn(),
  createVerifyToken: vi.fn(),
  getCreditAttestationByDecision: vi.fn(),
  getCreditFileById: vi.fn(),
  getLatestCreditAttestationByFile: vi.fn(),
  getLatestCreditDecisionByFile: vi.fn(),
  getLatestCreditOfferByFile: vi.fn(),
  getParcelById: vi.fn(),
  getUserById: vi.fn(),
  insertCreditDecision: vi.fn(),
  insertCreditOffer: vi.fn(),
  insertCreditRequest: vi.fn(),
  listCreditDocumentsByFile: vi.fn(),
  listCreditFilesByStatuses: vi.fn(),
  listCreditOffersByFile: vi.fn(),
  listCreditRequestsByFile: vi.fn(),
  updateAttestation: vi.fn(),
  updateCreditOffer: vi.fn(),
  updateCreditFileStatus: vi.fn(),
  updateGeneratedDocument: vi.fn(),
}));

vi.mock("./storage", () => ({
  storagePut: vi.fn(),
}));

vi.mock("./credit-checklist.service", () => ({
  CreditChecklistService: {
    getChecklistStatus: vi.fn(),
  },
}));

import * as db from "./db";
import { CreditChecklistService } from "./credit-checklist.service";
import { bankCreditRouter } from "./bank-credit-router";
import { storagePut } from "./storage";

const mockDb = vi.mocked(db);
const mockChecklistService = vi.mocked(CreditChecklistService);
const mockStoragePut = vi.mocked(storagePut);

function createBankContext(): TrpcContext {
  return {
    user: {
      id: 7,
      openId: "bank-7",
      email: "agent@bank.example",
      name: "Bank Agent",
      loginMethod: "manus",
      role: "bank",
      zoneCodes: null,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: {
      protocol: "https",
      headers: { host: "foncier225.example" },
      get: (name: string) => (name === "host" ? "foncier225.example" : undefined),
    } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

function createCitizenContext(): TrpcContext {
  return {
    user: {
      id: 2,
      openId: "citizen-2",
      email: "citizen@example.com",
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

describe("bank credit router", () => {
  it("rejects non-bank access", async () => {
    const caller = bankCreditRouter.createCaller(createCitizenContext());
    await expect(
      caller.listBankCreditFiles({ statuses: ["SUBMITTED"], limit: 20, offset: 0 })
    ).rejects.toThrow();
  });

  it("rejects routes when feature flag is disabled", async () => {
    process.env.CREDIT_WORKFLOW_ENABLED = "false";
    const caller = bankCreditRouter.createCaller(createBankContext());

    await expect(
      caller.listBankCreditFiles({ statuses: ["SUBMITTED"], limit: 20, offset: 0 })
    ).rejects.toThrow("Le module credit habitat n'est pas encore active.");
  });

  it("returns submitted files in the bank queue", async () => {
    mockDb.listCreditFilesByStatuses.mockResolvedValue([
      {
        id: 31,
        publicRef: "CF-2026-BANK1",
        initiatorId: 2,
        parcelId: 9,
        amountRequestedXof: 9_500_000,
        durationMonths: 60,
        productType: "STANDARD",
        status: "SUBMITTED",
        createdAt: new Date(),
        updatedAt: new Date(),
        submittedAt: new Date(),
        lastTransitionAt: new Date(),
      },
    ] as any);
    mockDb.getParcelById.mockResolvedValue({ id: 9, reference: "PAR-009" } as any);
    mockChecklistService.getChecklistStatus.mockResolvedValue({
      isComplete: true,
      requiredDocuments: { total: 4, uploaded: 4, missing: [] },
      optionalDocuments: { total: 2, uploaded: 0, missing: [] },
      completionPercentage: 100,
    });

    const caller = bankCreditRouter.createCaller(createBankContext());
    const result = await caller.listBankCreditFiles({
      statuses: ["SUBMITTED"],
      limit: 20,
      offset: 0,
    });

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual(
      expect.objectContaining({
        id: 31,
        status: "SUBMITTED",
        parcelReference: "PAR-009",
      })
    );
  });

  it("returns bank detail and audits the view", async () => {
    mockDb.getCreditFileById.mockResolvedValue({
      id: 40,
      publicRef: "CF-2026-BANK2",
      initiatorId: 2,
      parcelId: 10,
      amountRequestedXof: 4_000_000,
      durationMonths: 36,
      productType: "SIMPLIFIED",
      status: "SUBMITTED",
      createdAt: new Date(),
      updatedAt: new Date(),
      submittedAt: new Date(),
      lastTransitionAt: new Date(),
    } as any);
    mockDb.getParcelById.mockResolvedValue({ id: 10, reference: "PAR-010" } as any);
    mockDb.getUserById.mockResolvedValue({ id: 2, name: "Citizen User", email: "citizen@example.com", role: "citizen" } as any);
    mockDb.listCreditDocumentsByFile.mockResolvedValue([
      {
        id: 99,
        documentType: "ID_CARD",
        status: "UPLOADED",
        fileUrl: "https://cdn.example.com/id.pdf",
        fileKey: "credit-files/2/40/ID_CARD.pdf",
        uploadedAt: new Date(),
      },
    ] as any);
    mockChecklistService.getChecklistStatus.mockResolvedValue({
      isComplete: true,
      requiredDocuments: { total: 3, uploaded: 3, missing: [] },
      optionalDocuments: { total: 3, uploaded: 0, missing: [] },
      completionPercentage: 100,
    });
    mockDb.getLatestCreditAttestationByFile.mockResolvedValue(undefined);
    mockDb.listCreditRequestsByFile.mockResolvedValue([]);
    mockDb.listCreditOffersByFile.mockResolvedValue([]);
    mockDb.getLatestCreditDecisionByFile.mockResolvedValue(undefined);
    mockDb.getLatestCreditOfferByFile.mockResolvedValue(undefined);
    mockDb.createAuditEvent.mockResolvedValue(undefined);

    const caller = bankCreditRouter.createCaller(createBankContext());
    const result = await caller.getBankCreditFile({ creditFileId: 40 });

    expect(result.applicant).toEqual(
      expect.objectContaining({
        id: 2,
        name: "Citizen User",
      })
    );
    expect(mockDb.createAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "credit.file.viewed_bank",
        targetId: 40,
      })
    );
  });

  it("moves a submitted file to under review", async () => {
    mockDb.getCreditFileById.mockResolvedValue({
      id: 41,
      publicRef: "CF-2026-BANK3",
      initiatorId: 2,
      parcelId: null,
      amountRequestedXof: 7_000_000,
      durationMonths: 48,
      productType: "STANDARD",
      status: "SUBMITTED",
      createdAt: new Date(),
      updatedAt: new Date(),
      submittedAt: new Date(),
      lastTransitionAt: new Date(),
    } as any);
    mockDb.updateCreditFileStatus.mockResolvedValue(undefined);
    mockDb.createAuditEvent.mockResolvedValue(undefined);

    const caller = bankCreditRouter.createCaller(createBankContext());
    const result = await caller.reviewBankCreditFile({ creditFileId: 41 });

    expect(result.status).toBe("UNDER_REVIEW");
    expect(mockDb.updateCreditFileStatus).toHaveBeenCalledWith(
      41,
      expect.objectContaining({ status: "UNDER_REVIEW" })
    );
    expect(mockDb.createAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "credit.file.under_review",
        targetId: 41,
      })
    );
  });

  it("issues a final attestation only after a persisted final decision", async () => {
    mockDb.getCreditFileById.mockResolvedValue({
      id: 61,
      publicRef: "CF-2026-FINAL1",
      initiatorId: 2,
      parcelId: 10,
      status: "APPROVED",
    } as any);
    mockDb.getLatestCreditDecisionByFile.mockResolvedValue({
      id: 701,
      creditFileId: 61,
      decisionType: "APPROVED",
      reason: "Eligible",
      decidedAt: new Date("2026-03-18T10:00:00Z"),
    } as any);
    mockDb.getCreditAttestationByDecision.mockResolvedValue(undefined);
    mockDb.getParcelById.mockResolvedValue({ id: 10, reference: "PAR-010" } as any);
    mockStoragePut.mockResolvedValue({
      key: "credit-attestations/2/61/CAF-2026-AB12CD.pdf",
      url: "https://cdn.example.com/credit-attestations/2/61/CAF-2026-AB12CD.pdf",
    });
    mockDb.createDocument.mockResolvedValue({ id: 801 } as any);
    mockDb.createAttestation.mockResolvedValue({ id: 901 } as any);
    mockDb.createGeneratedDocument.mockResolvedValue({ id: 905 } as any);
    mockDb.createVerifyToken.mockResolvedValue({ id: 902 } as any);
    mockDb.updateAttestation.mockResolvedValue(undefined);
    mockDb.updateGeneratedDocument.mockResolvedValue(undefined);
    mockDb.createAuditEvent.mockResolvedValue(undefined);

    const caller = bankCreditRouter.createCaller(createBankContext());
    const result = await caller.issueFinalCreditAttestation({ creditFileId: 61 });

    expect(result.attestationId).toBe(901);
    expect(mockStoragePut).toHaveBeenCalledOnce();
    expect(mockDb.createVerifyToken).toHaveBeenCalledWith(
      expect.objectContaining({
        tokenType: "document",
        targetId: 905,
      })
    );
    expect(mockDb.createAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "credit.file.attestation_issued",
        targetId: 61,
      })
    );
  });

  it("rejects invalid review transitions", async () => {
    mockDb.getCreditFileById.mockResolvedValue({
      id: 42,
      publicRef: "CF-2026-BANK4",
      initiatorId: 2,
      parcelId: null,
      amountRequestedXof: 7_000_000,
      durationMonths: 48,
      productType: "STANDARD",
      status: "UNDER_REVIEW",
      createdAt: new Date(),
      updatedAt: new Date(),
      submittedAt: new Date(),
      lastTransitionAt: new Date(),
    } as any);
    mockDb.createAuditEvent.mockResolvedValue(undefined);

    const caller = bankCreditRouter.createCaller(createBankContext());
    await expect(caller.reviewBankCreditFile({ creditFileId: 42 }))
      .rejects.toThrow("Seuls les dossiers soumis peuvent etre pris en revue.");

    expect(mockDb.createAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "credit.file.error",
        targetId: 42,
      })
    );
  });

  it("requests docs from under review and moves the file to docs pending", async () => {
    mockDb.getCreditFileById.mockResolvedValue({
      id: 50,
      status: "UNDER_REVIEW",
    } as any);
    mockDb.insertCreditRequest.mockResolvedValue({ id: 500 } as any);
    mockDb.updateCreditFileStatus.mockResolvedValue(undefined);
    mockDb.createAuditEvent.mockResolvedValue(undefined);

    const caller = bankCreditRouter.createCaller(createBankContext());
    const result = await caller.requestDocsForCreditFile({
      creditFileId: 50,
      requestType: "DOCUMENT_REQUEST",
      message: "Merci d'ajouter un justificatif de revenus a jour.",
      requestedDocumentTypes: ["PROOF_INCOME"],
    });

    expect(result.status).toBe("DOCS_PENDING");
    expect(mockDb.insertCreditRequest).toHaveBeenCalled();
    expect(mockDb.updateCreditFileStatus).toHaveBeenCalledWith(
      50,
      expect.objectContaining({ status: "DOCS_PENDING" })
    );
  });

  it("makes an offer from under review", async () => {
    mockDb.getCreditFileById.mockResolvedValue({
      id: 51,
      amountRequestedXof: 5_000_000,
      durationMonths: 36,
      status: "UNDER_REVIEW",
    } as any);
    mockDb.listCreditOffersByFile.mockResolvedValue([]);
    mockDb.insertCreditOffer.mockResolvedValue({ id: 510 } as any);
    mockDb.updateCreditFileStatus.mockResolvedValue(undefined);
    mockDb.createAuditEvent.mockResolvedValue(undefined);

    const caller = bankCreditRouter.createCaller(createBankContext());
    const result = await caller.makeCreditOffer({
      creditFileId: 51,
      apr: "8.5%",
      monthlyPaymentXof: 175000,
      conditionsText: "Offre sous reserve de verification finale.",
      expiresAt: new Date("2026-06-01"),
    });

    expect(result.status).toBe("OFFERED");
    expect(mockDb.insertCreditOffer).toHaveBeenCalled();
  });

  it("decides a file only from accepted", async () => {
    mockDb.getCreditFileById.mockResolvedValue({
      id: 52,
      status: "ACCEPTED",
    } as any);
    mockDb.insertCreditDecision.mockResolvedValue({ id: 520 } as any);
    mockDb.updateCreditFileStatus.mockResolvedValue(undefined);
    mockDb.createAuditEvent.mockResolvedValue(undefined);

    const caller = bankCreditRouter.createCaller(createBankContext());
    const result = await caller.decideCreditFile({
      creditFileId: 52,
      decisionType: "APPROVED",
    });

    expect(result.status).toBe("APPROVED");
    expect(mockDb.insertCreditDecision).toHaveBeenCalled();
  });
});
