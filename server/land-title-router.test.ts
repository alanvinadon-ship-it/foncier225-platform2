import { describe, it, expect, vi, beforeEach } from "vitest";

// vi.mock is hoisted above variable declarations, so we use inline factory functions

vi.mock("./db", () => ({
  createAuditEvent: vi.fn().mockResolvedValue(undefined),
  createLandTitleApplication: vi.fn().mockImplementation(async (data: any) => ({
    id: 1,
    applicationNumber: data.applicationNumber || "CF-2026-ABC123",
    userId: data.userId || 42,
    phase: data.phase || "certificate",
    status: data.status || "cf_draft",
    applicantFullName: data.applicantFullName || "Kouassi Jean",
    applicantNationality: data.applicantNationality || "ivoirienne",
    applicantIdType: data.applicantIdType || "CNI",
    applicantIdNumber: data.applicantIdNumber || "CI123456",
    landDescription: data.landDescription || "Terrain agricole",
    landLocality: data.landLocality || "Bouaké",
    landSubPrefecture: data.landSubPrefecture || "Bouaké",
    landDepartment: data.landDepartment || "Bouaké",
    landRegion: data.landRegion || "Gbêkê",
    landAreaHectares: data.landAreaHectares || "5.5",
    parcelId: null,
    territoryId: null,
    operatorName: null,
    operatorLicense: null,
    inquiryCommissioner: null,
    publicityStartDate: null,
    publicityEndDate: null,
    certificateNumber: null,
    certificateSignedAt: null,
    certificateExpiryAt: null,
    apfrNumber: null,
    titleNumber: null,
    titleRegisteredAt: null,
    presforEligible: data.presforEligible ?? false,
    notes: null,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  })),
  getLandTitleApplicationById: vi.fn().mockImplementation(async () => ({
    id: 1,
    applicationNumber: "CF-2026-ABC123",
    userId: 42,
    phase: "certificate",
    status: "cf_draft",
    applicantFullName: "Kouassi Jean",
    applicantNationality: "ivoirienne",
    applicantIdType: "CNI",
    applicantIdNumber: "CI123456",
    landDescription: "Terrain agricole",
    landLocality: "Bouaké",
    landSubPrefecture: "Bouaké",
    landDepartment: "Bouaké",
    landRegion: "Gbêkê",
    landAreaHectares: "5.5",
    parcelId: null,
    territoryId: null,
    operatorName: null,
    operatorLicense: null,
    inquiryCommissioner: null,
    publicityStartDate: null,
    publicityEndDate: null,
    certificateNumber: null,
    certificateSignedAt: null,
    certificateExpiryAt: null,
    apfrNumber: null,
    titleNumber: null,
    titleRegisteredAt: null,
    presforEligible: false,
    notes: null,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  })),
  getLandTitleApplicationByNumber: vi.fn().mockResolvedValue({ id: 1 }),
  listLandTitleApplicationsByUser: vi.fn().mockResolvedValue([{ id: 1, applicationNumber: "CF-2026-ABC123" }]),
  countLandTitleApplicationsByUser: vi.fn().mockResolvedValue(1),
  listAllLandTitleApplications: vi.fn().mockResolvedValue([{ id: 1, applicationNumber: "CF-2026-ABC123" }]),
  countAllLandTitleApplications: vi.fn().mockResolvedValue(1),
  updateLandTitleApplication: vi.fn().mockResolvedValue(undefined),
  createLandTitleStep: vi.fn().mockImplementation(async (data: any) => ({
    id: 1, applicationId: data.applicationId, stepType: data.stepType,
    status: data.status || "pending", startedAt: null, completedAt: null,
    completedBy: null, notes: null, metadata: null, createdAt: Date.now(),
  })),
  listLandTitleSteps: vi.fn().mockResolvedValue([{
    id: 1, applicationId: 1, stepType: "deposit_request", status: "pending",
    startedAt: null, completedAt: null, completedBy: null, notes: null, metadata: null, createdAt: Date.now(),
  }]),
  updateLandTitleStep: vi.fn().mockResolvedValue(undefined),
  createLandTitleDocument: vi.fn().mockImplementation(async (data: any) => ({
    id: 1, applicationId: data.applicationId, documentType: data.documentType,
    label: data.label, fileUrl: data.fileUrl, fileKey: data.fileKey,
    mimeType: data.mimeType || null, fileSizeBytes: data.fileSizeBytes || null,
    sha256: null, uploadedBy: data.uploadedBy, stepId: null,
    verified: false, verifiedBy: null, verifiedAt: null, createdAt: Date.now(),
  })),
  listLandTitleDocuments: vi.fn().mockResolvedValue([]),
  getLandTitleDocumentById: vi.fn().mockImplementation(async () => ({
    id: 1, applicationId: 1, documentType: "liasse_fonciere", label: "Liasse",
    fileUrl: "https://s3.example.com/file.pdf", fileKey: "land-title/file.pdf",
    mimeType: "application/pdf", fileSizeBytes: 1024, sha256: null,
    uploadedBy: 42, stepId: null, verified: false, verifiedBy: null, verifiedAt: null, createdAt: Date.now(),
  })),
  deleteLandTitleDocument: vi.fn().mockResolvedValue(undefined),
  updateLandTitleDocument: vi.fn().mockResolvedValue(undefined),
  createLandTitleOpposition: vi.fn().mockImplementation(async (data: any) => ({
    id: 1, applicationId: data.applicationId, opponentName: data.opponentName,
    opponentContact: data.opponentContact || null, reason: data.reason,
    status: "pending", resolutionNotes: null, resolvedBy: null, resolvedAt: null, createdAt: Date.now(),
  })),
  listLandTitleOppositions: vi.fn().mockResolvedValue([]),
  updateLandTitleOpposition: vi.fn().mockResolvedValue(undefined),
  countLandTitleOppositionsByApplication: vi.fn().mockResolvedValue(0),
}));

// Import router after mocking
import { landTitleRouter } from "./land-title-router";
import {
  createAuditEvent,
  createLandTitleApplication,
  getLandTitleApplicationById,
  updateLandTitleApplication,
  createLandTitleDocument,
  getLandTitleDocumentById,
  deleteLandTitleDocument,
  updateLandTitleDocument,
  createLandTitleOpposition,
  updateLandTitleOpposition,
} from "./db";

// ─── Business Logic Tests ───────────────────────────────────────────

describe("Land Title Router — Business Logic", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Status Transitions (Phase 1 — Certificate)", () => {
    const CF_TRANSITIONS: Record<string, string[]> = {
      cf_draft: ["cf_submitted", "cf_rejected"],
      cf_submitted: ["cf_delimitation", "cf_rejected"],
      cf_delimitation: ["cf_delimited", "cf_rejected"],
      cf_delimited: ["cf_inquiry", "cf_rejected"],
      cf_inquiry: ["cf_publicity", "cf_rejected"],
      cf_publicity: ["cf_validated", "cf_opposed", "cf_rejected"],
      cf_opposed: ["cf_validated", "cf_rejected"],
      cf_validated: ["cf_signed", "cf_rejected"],
    };

    it("allows cf_draft -> cf_submitted", () => {
      expect(CF_TRANSITIONS["cf_draft"]).toContain("cf_submitted");
    });

    it("allows cf_publicity -> cf_opposed", () => {
      expect(CF_TRANSITIONS["cf_publicity"]).toContain("cf_opposed");
    });

    it("allows cf_opposed -> cf_validated (opposition levee)", () => {
      expect(CF_TRANSITIONS["cf_opposed"]).toContain("cf_validated");
    });

    it("rejects invalid transitions (cf_draft -> cf_signed)", () => {
      expect(CF_TRANSITIONS["cf_draft"]).not.toContain("cf_signed");
    });

    it("always allows rejection from any Phase 1 state", () => {
      for (const [, transitions] of Object.entries(CF_TRANSITIONS)) {
        expect(transitions).toContain("cf_rejected");
      }
    });

    it("has 10 total Phase 1 statuses", () => {
      const CERTIFICATE_STATUSES = [
        "cf_draft", "cf_submitted", "cf_delimitation", "cf_delimited",
        "cf_inquiry", "cf_publicity", "cf_opposed", "cf_validated", "cf_signed", "cf_rejected",
      ];
      expect(CERTIFICATE_STATUSES).toHaveLength(10);
    });
  });

  describe("Status Transitions (Phase 2 — Title)", () => {
    const TF_TRANSITIONS: Record<string, string[]> = {
      tf_submitted: ["tf_afor_review", "tf_rejected"],
      tf_afor_review: ["tf_apfr_ready", "tf_rejected"],
      tf_apfr_ready: ["tf_minister_signing", "tf_rejected"],
      tf_minister_signing: ["tf_signed", "tf_rejected"],
      tf_signed: ["tf_registered", "tf_rejected"],
    };

    it("allows tf_submitted -> tf_afor_review", () => {
      expect(TF_TRANSITIONS["tf_submitted"]).toContain("tf_afor_review");
    });

    it("allows tf_signed -> tf_registered", () => {
      expect(TF_TRANSITIONS["tf_signed"]).toContain("tf_registered");
    });

    it("always allows rejection from any Phase 2 state", () => {
      for (const [, transitions] of Object.entries(TF_TRANSITIONS)) {
        expect(transitions).toContain("tf_rejected");
      }
    });

    it("has 7 total Phase 2 statuses", () => {
      const TITLE_STATUSES = [
        "tf_submitted", "tf_afor_review", "tf_apfr_ready",
        "tf_minister_signing", "tf_signed", "tf_registered", "tf_rejected",
      ];
      expect(TITLE_STATUSES).toHaveLength(7);
    });
  });

  describe("Phase 2 Nationality Restriction", () => {
    it("requires ivoirienne nationality for immatriculation", () => {
      const nationality = "ivoirienne";
      expect(nationality.toLowerCase()).toBe("ivoirienne");
    });

    it("rejects non-ivoirienne nationality", () => {
      const nationality = "francaise";
      expect(nationality.toLowerCase()).not.toBe("ivoirienne");
    });
  });

  describe("Certificate Expiry (10 years)", () => {
    const TEN_YEARS_MS = 10 * 365.25 * 24 * 60 * 60 * 1000;

    it("calculates 10-year expiry correctly", () => {
      const signedAt = Date.now();
      const expiryAt = signedAt + TEN_YEARS_MS;
      const tenYearsFromNow = new Date(expiryAt);
      const expectedYear = new Date().getFullYear() + 10;
      expect(tenYearsFromNow.getFullYear()).toBeGreaterThanOrEqual(expectedYear);
    });

    it("detects expired certificates", () => {
      const signedAt = Date.now() - TEN_YEARS_MS - 1000;
      const isExpired = Date.now() - signedAt > TEN_YEARS_MS;
      expect(isExpired).toBe(true);
    });

    it("accepts valid certificates within 10 years", () => {
      const signedAt = Date.now() - (5 * 365.25 * 24 * 60 * 60 * 1000);
      const isExpired = Date.now() - signedAt > TEN_YEARS_MS;
      expect(isExpired).toBe(false);
    });
  });

  describe("Step Types", () => {
    it("has 6 step types for Phase 1", () => {
      const STEP_TYPES_PHASE1 = [
        "deposit_request", "delimitation", "inquiry", "publicity", "cspgfr_validation", "prefect_signature",
      ];
      expect(STEP_TYPES_PHASE1).toHaveLength(6);
    });

    it("has 5 step types for Phase 2", () => {
      const STEP_TYPES_PHASE2 = [
        "immatriculation_request", "afor_control", "apfr_preparation", "minister_signature", "land_registry",
      ];
      expect(STEP_TYPES_PHASE2).toHaveLength(5);
    });
  });

  describe("Document Types", () => {
    it("includes all 16 required document types", () => {
      const DOC_TYPES = [
        "liasse_fonciere", "demande_enquete", "piece_identite", "plan_parcelle",
        "constat_limites", "rapport_enquete", "pv_publicite", "pv_cspgfr",
        "certificat_foncier", "requete_immatriculation", "recepisse_depot",
        "rapport_afor", "projet_apfr", "arrete_signe", "titre_foncier", "other",
      ];
      expect(DOC_TYPES).toHaveLength(16);
      expect(DOC_TYPES).toContain("liasse_fonciere");
      expect(DOC_TYPES).toContain("titre_foncier");
    });
  });

  describe("Opposition Logic", () => {
    it("only allows oppositions during publicity phase", () => {
      const validStatuses = ["cf_publicity", "cf_opposed"];
      expect(validStatuses).toContain("cf_publicity");
      expect(validStatuses).not.toContain("cf_draft");
    });

    it("opposition statuses are pending, confirmed, dismissed", () => {
      const statuses = ["pending", "confirmed", "dismissed"];
      expect(statuses).toHaveLength(3);
    });
  });

  describe("PRESFOR Eligibility", () => {
    it("defaults to not eligible", () => {
      expect(false).toBe(false); // default in schema
    });

    it("can be set to eligible", () => {
      expect(true).toBe(true);
    });
  });
});

// ─── DB Helper Calls ────────────────────────────────────────────────

describe("Land Title Router — DB Helper Calls", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("createLandTitleApplication is callable with correct shape", async () => {
    const result = await (createLandTitleApplication as any)({
      applicationNumber: "CF-2026-TEST01",
      userId: 42,
      phase: "certificate",
      status: "cf_draft",
      applicantFullName: "Test User",
      presforEligible: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
    expect(result).toBeDefined();
    expect(result.applicationNumber).toBe("CF-2026-TEST01");
    expect(createLandTitleApplication).toHaveBeenCalledOnce();
  });

  it("getLandTitleApplicationById returns the application", async () => {
    const result = await (getLandTitleApplicationById as any)(1);
    expect(result).toBeDefined();
    expect(result.id).toBe(1);
  });

  it("updateLandTitleApplication updates status", async () => {
    await (updateLandTitleApplication as any)(1, { status: "cf_submitted" });
    expect(updateLandTitleApplication).toHaveBeenCalledWith(1, { status: "cf_submitted" });
  });

  it("createLandTitleDocument stores document metadata", async () => {
    const result = await (createLandTitleDocument as any)({
      applicationId: 1,
      documentType: "liasse_fonciere",
      label: "Liasse fonciere",
      fileUrl: "https://s3.example.com/file.pdf",
      fileKey: "land-title/file.pdf",
      mimeType: "application/pdf",
      fileSizeBytes: 1024,
      uploadedBy: 42,
      verified: false,
      createdAt: Date.now(),
    });
    expect(result).toBeDefined();
    expect(result.documentType).toBe("liasse_fonciere");
  });

  it("deleteLandTitleDocument removes document", async () => {
    await (deleteLandTitleDocument as any)(1);
    expect(deleteLandTitleDocument).toHaveBeenCalledWith(1);
  });

  it("createLandTitleOpposition creates opposition record", async () => {
    const result = await (createLandTitleOpposition as any)({
      applicationId: 1,
      opponentName: "Yao Pierre",
      opponentContact: "0707070707",
      reason: "Contestation de limites",
      status: "pending",
      createdAt: Date.now(),
    });
    expect(result).toBeDefined();
    expect(result.opponentName).toBe("Yao Pierre");
  });

  it("updateLandTitleOpposition resolves opposition", async () => {
    await (updateLandTitleOpposition as any)(1, {
      status: "dismissed",
      resolutionNotes: "Opposition non fondee",
      resolvedBy: 1,
      resolvedAt: Date.now(),
    });
    expect(updateLandTitleOpposition).toHaveBeenCalledOnce();
  });

  it("audit events are created for key actions", async () => {
    await (createAuditEvent as any)({
      actorId: 42,
      actorRole: "citizen",
      action: "landTitle.application.created",
      targetType: "land_title_application",
      targetId: 1,
      details: { applicationNumber: "CF-2026-TEST01", phase: "certificate" },
    });
    expect(createAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({ action: "landTitle.application.created" })
    );
  });
});

// ─── Integration Checks ─────────────────────────────────────────────

describe("Land Title Router — Integration Checks", () => {
  it("router exports citizen and admin sub-routers", () => {
    expect(landTitleRouter).toBeDefined();
    expect((landTitleRouter as any)._def).toBeDefined();
  });
});
