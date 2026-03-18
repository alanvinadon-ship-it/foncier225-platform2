/**
 * Credit Workflow Tests — V1.1-03
 * Unit tests for state machine, workflow logic, types, audit actions, feature flags
 */

import { describe, it, expect } from "vitest";
import { CreditWorkflowService } from "./credit-workflow.service";
import { CreditChecklistService } from "./credit-checklist.service";
import {
  CreditFileStatus,
  CreditWorkflowEvent,
  CreditProductType,
  CreditDocumentType,
  CreditFileParticipantRole,
  CREDIT_AUDIT_ACTIONS,
  generateCreditPublicRef,
  VALID_TRANSITIONS,
  REQUIRED_DOCUMENTS_BY_PRODUCT,
  CREDIT_FILE_STATUS_LABELS,
  CREDIT_DOCUMENT_TYPE_LABELS,
  CREDIT_PARTICIPANT_ROLE_LABELS,
} from "@shared/credit-types";
import { FEATURE_FLAGS, isFeatureEnabled, getEnabledFeatures } from "@shared/featureFlags";

// ═══════════════════════════════════════════════════════════════════════
// ─── CreditWorkflowService ──────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════

describe("CreditWorkflowService", () => {
  describe("canTransition", () => {
    it("should allow valid transitions from DRAFT", () => {
      expect(CreditWorkflowService.canTransition(CreditFileStatus.DRAFT, CreditWorkflowEvent.ADD_DOC)).toBe(true);
      expect(CreditWorkflowService.canTransition(CreditFileStatus.DRAFT, CreditWorkflowEvent.SUBMIT)).toBe(true);
    });

    it("should reject invalid transitions from DRAFT", () => {
      expect(CreditWorkflowService.canTransition(CreditFileStatus.DRAFT, CreditWorkflowEvent.APPROVE)).toBe(false);
      expect(CreditWorkflowService.canTransition(CreditFileStatus.DRAFT, CreditWorkflowEvent.REJECT)).toBe(false);
    });

    it("should allow valid transitions from SUBMITTED", () => {
      expect(CreditWorkflowService.canTransition(CreditFileStatus.SUBMITTED, CreditWorkflowEvent.REVIEW)).toBe(true);
    });

    it("should reject invalid transitions from SUBMITTED", () => {
      expect(CreditWorkflowService.canTransition(CreditFileStatus.SUBMITTED, CreditWorkflowEvent.ADD_DOC)).toBe(false);
    });

    it("should allow valid transitions from UNDER_REVIEW", () => {
      expect(CreditWorkflowService.canTransition(CreditFileStatus.UNDER_REVIEW, CreditWorkflowEvent.REQUEST_DOCS)).toBe(true);
      expect(CreditWorkflowService.canTransition(CreditFileStatus.UNDER_REVIEW, CreditWorkflowEvent.MAKE_OFFER)).toBe(true);
      expect(CreditWorkflowService.canTransition(CreditFileStatus.UNDER_REVIEW, CreditWorkflowEvent.REJECT)).toBe(true);
    });

    it("should allow valid transitions from OFFERED", () => {
      expect(CreditWorkflowService.canTransition(CreditFileStatus.OFFERED, CreditWorkflowEvent.ACCEPT_OFFER)).toBe(true);
      expect(CreditWorkflowService.canTransition(CreditFileStatus.OFFERED, CreditWorkflowEvent.REJECT_OFFER)).toBe(true);
    });

    it("should allow valid transitions from ACCEPTED", () => {
      expect(CreditWorkflowService.canTransition(CreditFileStatus.ACCEPTED, CreditWorkflowEvent.APPROVE)).toBe(true);
      expect(CreditWorkflowService.canTransition(CreditFileStatus.ACCEPTED, CreditWorkflowEvent.REJECT)).toBe(true);
    });

    it("should not allow transitions from terminal states", () => {
      expect(CreditWorkflowService.canTransition(CreditFileStatus.APPROVED, CreditWorkflowEvent.APPROVE)).toBe(false);
      expect(CreditWorkflowService.canTransition(CreditFileStatus.REJECTED, CreditWorkflowEvent.SUBMIT)).toBe(false);
      expect(CreditWorkflowService.canTransition(CreditFileStatus.CLOSED, CreditWorkflowEvent.SUBMIT)).toBe(false);
    });
  });

  describe("getNextStatus", () => {
    it("should return correct next status for valid transitions", () => {
      expect(CreditWorkflowService.getNextStatus(CreditFileStatus.DRAFT, CreditWorkflowEvent.ADD_DOC)).toBe(CreditFileStatus.DOCS_PENDING);
      expect(CreditWorkflowService.getNextStatus(CreditFileStatus.DRAFT, CreditWorkflowEvent.SUBMIT)).toBe(CreditFileStatus.SUBMITTED);
      expect(CreditWorkflowService.getNextStatus(CreditFileStatus.SUBMITTED, CreditWorkflowEvent.REVIEW)).toBe(CreditFileStatus.UNDER_REVIEW);
      expect(CreditWorkflowService.getNextStatus(CreditFileStatus.UNDER_REVIEW, CreditWorkflowEvent.MAKE_OFFER)).toBe(CreditFileStatus.OFFERED);
      expect(CreditWorkflowService.getNextStatus(CreditFileStatus.OFFERED, CreditWorkflowEvent.ACCEPT_OFFER)).toBe(CreditFileStatus.ACCEPTED);
      expect(CreditWorkflowService.getNextStatus(CreditFileStatus.ACCEPTED, CreditWorkflowEvent.APPROVE)).toBe(CreditFileStatus.APPROVED);
    });

    it("should return null for invalid transitions", () => {
      expect(CreditWorkflowService.getNextStatus(CreditFileStatus.DRAFT, CreditWorkflowEvent.APPROVE)).toBeNull();
      expect(CreditWorkflowService.getNextStatus(CreditFileStatus.APPROVED, CreditWorkflowEvent.SUBMIT)).toBeNull();
    });
  });

  describe("applyTransition", () => {
    it("should apply valid transitions", () => {
      const nextStatus = CreditWorkflowService.applyTransition(CreditFileStatus.DRAFT, CreditWorkflowEvent.SUBMIT);
      expect(nextStatus).toBe(CreditFileStatus.SUBMITTED);
    });

    it("should throw on invalid transitions", () => {
      expect(() => {
        CreditWorkflowService.applyTransition(CreditFileStatus.DRAFT, CreditWorkflowEvent.APPROVE);
      }).toThrow();
    });

    it("should complete full happy path: DRAFT → APPROVED", () => {
      let status: CreditFileStatus = CreditFileStatus.DRAFT;
      status = CreditWorkflowService.applyTransition(status, CreditWorkflowEvent.ADD_DOC);
      expect(status).toBe(CreditFileStatus.DOCS_PENDING);
      status = CreditWorkflowService.applyTransition(status, CreditWorkflowEvent.SUBMIT);
      expect(status).toBe(CreditFileStatus.SUBMITTED);
      status = CreditWorkflowService.applyTransition(status, CreditWorkflowEvent.REVIEW);
      expect(status).toBe(CreditFileStatus.UNDER_REVIEW);
      status = CreditWorkflowService.applyTransition(status, CreditWorkflowEvent.MAKE_OFFER);
      expect(status).toBe(CreditFileStatus.OFFERED);
      status = CreditWorkflowService.applyTransition(status, CreditWorkflowEvent.ACCEPT_OFFER);
      expect(status).toBe(CreditFileStatus.ACCEPTED);
      status = CreditWorkflowService.applyTransition(status, CreditWorkflowEvent.APPROVE);
      expect(status).toBe(CreditFileStatus.APPROVED);
    });

    it("should complete rejection path: DRAFT → REJECTED via UNDER_REVIEW", () => {
      let status: CreditFileStatus = CreditFileStatus.DRAFT;
      status = CreditWorkflowService.applyTransition(status, CreditWorkflowEvent.SUBMIT);
      status = CreditWorkflowService.applyTransition(status, CreditWorkflowEvent.REVIEW);
      status = CreditWorkflowService.applyTransition(status, CreditWorkflowEvent.REJECT);
      expect(status).toBe(CreditFileStatus.REJECTED);
    });

    it("should handle REQUEST_DOCS loop: UNDER_REVIEW → DOCS_PENDING → SUBMITTED → UNDER_REVIEW", () => {
      let status: CreditFileStatus = CreditFileStatus.UNDER_REVIEW;
      status = CreditWorkflowService.applyTransition(status, CreditWorkflowEvent.REQUEST_DOCS);
      expect(status).toBe(CreditFileStatus.DOCS_PENDING);
      status = CreditWorkflowService.applyTransition(status, CreditWorkflowEvent.SUBMIT);
      expect(status).toBe(CreditFileStatus.SUBMITTED);
      status = CreditWorkflowService.applyTransition(status, CreditWorkflowEvent.REVIEW);
      expect(status).toBe(CreditFileStatus.UNDER_REVIEW);
    });
  });

  describe("isTerminal", () => {
    it("should identify terminal states", () => {
      expect(CreditWorkflowService.isTerminal(CreditFileStatus.APPROVED)).toBe(true);
      expect(CreditWorkflowService.isTerminal(CreditFileStatus.REJECTED)).toBe(true);
      expect(CreditWorkflowService.isTerminal(CreditFileStatus.CLOSED)).toBe(true);
    });

    it("should identify non-terminal states", () => {
      expect(CreditWorkflowService.isTerminal(CreditFileStatus.DRAFT)).toBe(false);
      expect(CreditWorkflowService.isTerminal(CreditFileStatus.SUBMITTED)).toBe(false);
      expect(CreditWorkflowService.isTerminal(CreditFileStatus.UNDER_REVIEW)).toBe(false);
    });
  });

  describe("isSuccess / isFailure / isPending", () => {
    it("should identify success state", () => {
      expect(CreditWorkflowService.isSuccess(CreditFileStatus.APPROVED)).toBe(true);
      expect(CreditWorkflowService.isSuccess(CreditFileStatus.DRAFT)).toBe(false);
    });

    it("should identify failure states", () => {
      expect(CreditWorkflowService.isFailure(CreditFileStatus.REJECTED)).toBe(true);
      expect(CreditWorkflowService.isFailure(CreditFileStatus.CLOSED)).toBe(true);
      expect(CreditWorkflowService.isFailure(CreditFileStatus.APPROVED)).toBe(false);
    });

    it("should identify pending states", () => {
      expect(CreditWorkflowService.isPending(CreditFileStatus.DRAFT)).toBe(true);
      expect(CreditWorkflowService.isPending(CreditFileStatus.SUBMITTED)).toBe(true);
      expect(CreditWorkflowService.isPending(CreditFileStatus.APPROVED)).toBe(false);
    });
  });

  describe("getValidEvents", () => {
    it("should return valid events for a status", () => {
      const events = CreditWorkflowService.getValidEvents(CreditFileStatus.DRAFT);
      expect(events).toContain(CreditWorkflowEvent.ADD_DOC);
      expect(events).toContain(CreditWorkflowEvent.SUBMIT);
      expect(events.length).toBe(2);
    });

    it("should return empty array for terminal states", () => {
      expect(CreditWorkflowService.getValidEvents(CreditFileStatus.APPROVED)).toEqual([]);
      expect(CreditWorkflowService.getValidEvents(CreditFileStatus.REJECTED)).toEqual([]);
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════
// ─── CreditChecklistService ─────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════

describe("CreditChecklistService", () => {
  describe("getRequiredDocumentTypes", () => {
    it("should return required documents for STANDARD product", () => {
      const docs = CreditChecklistService.getRequiredDocumentTypes(CreditProductType.STANDARD);
      expect(docs).toContain(CreditDocumentType.ID_CARD);
      expect(docs).toContain(CreditDocumentType.PROOF_INCOME);
      expect(docs).toContain(CreditDocumentType.PROOF_RESIDENCE);
      expect(docs).toContain(CreditDocumentType.LAND_TITLE_DEED);
      expect(docs.length).toBe(4);
    });

    it("should return required documents for SIMPLIFIED product", () => {
      const docs = CreditChecklistService.getRequiredDocumentTypes(CreditProductType.SIMPLIFIED);
      expect(docs).toContain(CreditDocumentType.ID_CARD);
      expect(docs).toContain(CreditDocumentType.PROOF_RESIDENCE);
      expect(docs).toContain(CreditDocumentType.LAND_TITLE_DEED);
      expect(docs.length).toBe(3);
    });
  });

  describe("getOptionalDocumentTypes", () => {
    it("should return optional documents for SIMPLIFIED product", () => {
      const docs = CreditChecklistService.getOptionalDocumentTypes(CreditProductType.SIMPLIFIED);
      expect(docs).toContain(CreditDocumentType.PROOF_INCOME);
      expect(docs.length).toBe(1);
    });

    it("should return empty array for STANDARD product", () => {
      const docs = CreditChecklistService.getOptionalDocumentTypes(CreditProductType.STANDARD);
      expect(docs.length).toBe(0);
    });
  });

  describe("getAllExpectedDocumentTypes", () => {
    it("should return all expected documents (required + optional)", () => {
      const docs = CreditChecklistService.getAllExpectedDocumentTypes(CreditProductType.SIMPLIFIED);
      expect(docs.length).toBe(4); // 3 required + 1 optional
      expect(docs).toContain(CreditDocumentType.ID_CARD);
      expect(docs).toContain(CreditDocumentType.PROOF_INCOME);
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════
// ─── V1.1-03 Enrichments ────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════

describe("V1.1-03 — Credit Audit Actions", () => {
  it("should define all required audit actions", () => {
    expect(CREDIT_AUDIT_ACTIONS.FILE_CREATED).toBe("credit.file.created");
    expect(CREDIT_AUDIT_ACTIONS.FILE_SUBMITTED).toBe("credit.file.submitted");
    expect(CREDIT_AUDIT_ACTIONS.FILE_DOC_UPLOADED).toBe("credit.file.doc_uploaded");
    expect(CREDIT_AUDIT_ACTIONS.FILE_REQUEST_DOCS).toBe("credit.file.request_docs");
    expect(CREDIT_AUDIT_ACTIONS.FILE_ERROR).toBe("credit.file.error");
  });

  it("should define future audit actions (prepared but not triggered)", () => {
    expect(CREDIT_AUDIT_ACTIONS.FILE_UNDER_REVIEW).toBe("credit.file.under_review");
    expect(CREDIT_AUDIT_ACTIONS.FILE_OFFER_MADE).toBe("credit.file.offer_made");
    expect(CREDIT_AUDIT_ACTIONS.FILE_DECIDED).toBe("credit.file.decided");
    expect(CREDIT_AUDIT_ACTIONS.FILE_ATTESTATION_ISSUED).toBe("credit.file.attestation_issued");
    expect(CREDIT_AUDIT_ACTIONS.FILE_CONSENT_GRANTED).toBe("credit.file.consent.granted");
    expect(CREDIT_AUDIT_ACTIONS.FILE_CONSENT_REVOKED).toBe("credit.file.consent.revoked");
    expect(CREDIT_AUDIT_ACTIONS.ATTESTATION_VERIFIED).toBe("credit.attestation.verified");
  });

  it("should have at least 20 audit action types", () => {
    const count = Object.keys(CREDIT_AUDIT_ACTIONS).length;
    expect(count).toBeGreaterThanOrEqual(19);
  });
});

describe("V1.1-03 — Public Reference Generator", () => {
  it("should generate a valid publicRef format CF-YYYY-XXXXX", () => {
    const ref = generateCreditPublicRef();
    expect(ref).toMatch(/^CF-\d{4}-[A-Z0-9]{5}$/);
  });

  it("should generate unique references", () => {
    const refs = new Set<string>();
    for (let i = 0; i < 100; i++) {
      refs.add(generateCreditPublicRef());
    }
    // With 36^5 = 60M possibilities, 100 should be unique
    expect(refs.size).toBe(100);
  });

  it("should include current year", () => {
    const ref = generateCreditPublicRef();
    const year = new Date().getFullYear().toString();
    expect(ref).toContain(year);
  });
});

describe("V1.1-03 — Participant Roles", () => {
  it("should define aligned roles (citizen, co_borrower, bank_agent, agent_terrain)", () => {
    expect(CreditFileParticipantRole.CITIZEN).toBe("citizen");
    expect(CreditFileParticipantRole.CO_BORROWER).toBe("co_borrower");
    expect(CreditFileParticipantRole.BANK_AGENT).toBe("bank_agent");
    expect(CreditFileParticipantRole.AGENT_TERRAIN).toBe("agent_terrain");
  });

  it("should have labels for all roles", () => {
    const roles = Object.values(CreditFileParticipantRole);
    for (const role of roles) {
      expect(CREDIT_PARTICIPANT_ROLE_LABELS[role]).toBeDefined();
      expect(CREDIT_PARTICIPANT_ROLE_LABELS[role].length).toBeGreaterThan(0);
    }
  });
});

describe("V1.1-03 — Feature Flags", () => {
  it("should define CREDIT_WORKFLOW_ENABLED flag", () => {
    expect("CREDIT_WORKFLOW_ENABLED" in FEATURE_FLAGS).toBe(true);
  });

  it("should define DOCUMENT_GENERATION_ENABLED flag", () => {
    expect("DOCUMENT_GENERATION_ENABLED" in FEATURE_FLAGS).toBe(true);
  });

  it("should define BANK_PORTAL_ENABLED flag", () => {
    expect("BANK_PORTAL_ENABLED" in FEATURE_FLAGS).toBe(true);
  });

  it("isFeatureEnabled should return boolean", () => {
    const result = isFeatureEnabled("CREDIT_WORKFLOW_ENABLED");
    expect(typeof result).toBe("boolean");
  });

  it("getEnabledFeatures should return all flags", () => {
    const features = getEnabledFeatures();
    expect("CREDIT_WORKFLOW_ENABLED" in features).toBe(true);
    expect("DOCUMENT_GENERATION_ENABLED" in features).toBe(true);
    expect("BANK_PORTAL_ENABLED" in features).toBe(true);
  });
});

describe("V1.1-03 — Labels Completeness", () => {
  it("should have labels for all CreditFileStatus values", () => {
    const statuses = Object.values(CreditFileStatus);
    for (const status of statuses) {
      expect(CREDIT_FILE_STATUS_LABELS[status]).toBeDefined();
    }
  });

  it("should have labels for all CreditDocumentType values", () => {
    const types = Object.values(CreditDocumentType);
    for (const type of types) {
      expect(CREDIT_DOCUMENT_TYPE_LABELS[type]).toBeDefined();
    }
  });

  it("should have required documents defined for all product types", () => {
    const products = Object.values(CreditProductType);
    for (const product of products) {
      expect(REQUIRED_DOCUMENTS_BY_PRODUCT[product]).toBeDefined();
      expect(REQUIRED_DOCUMENTS_BY_PRODUCT[product].length).toBeGreaterThan(0);
    }
  });
});

describe("V1.1-03 — Transition Rules Integrity", () => {
  it("every status should have a transition rule entry", () => {
    const statuses = Object.values(CreditFileStatus);
    for (const status of statuses) {
      expect(VALID_TRANSITIONS[status]).toBeDefined();
      expect(Array.isArray(VALID_TRANSITIONS[status])).toBe(true);
    }
  });

  it("terminal states should have no valid events", () => {
    expect(VALID_TRANSITIONS[CreditFileStatus.APPROVED].length).toBe(0);
    expect(VALID_TRANSITIONS[CreditFileStatus.REJECTED].length).toBe(0);
    expect(VALID_TRANSITIONS[CreditFileStatus.CLOSED].length).toBe(0);
  });

  it("DRAFT should allow exactly ADD_DOC and SUBMIT", () => {
    const events = VALID_TRANSITIONS[CreditFileStatus.DRAFT];
    expect(events).toEqual(
      expect.arrayContaining([CreditWorkflowEvent.ADD_DOC, CreditWorkflowEvent.SUBMIT])
    );
    expect(events.length).toBe(2);
  });

  it("UNDER_REVIEW should allow REQUEST_DOCS, MAKE_OFFER, REJECT", () => {
    const events = VALID_TRANSITIONS[CreditFileStatus.UNDER_REVIEW];
    expect(events).toEqual(
      expect.arrayContaining([
        CreditWorkflowEvent.REQUEST_DOCS,
        CreditWorkflowEvent.MAKE_OFFER,
        CreditWorkflowEvent.REJECT,
      ])
    );
    expect(events.length).toBe(3);
  });
});
