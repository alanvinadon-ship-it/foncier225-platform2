/**
 * Credit Workflow Tests
 * Unit tests for state machine and workflow logic
 */

import { describe, it, expect } from "vitest";
import { CreditWorkflowService } from "./credit-workflow.service";
import { CreditChecklistService } from "./credit-checklist.service";
import {
  CreditFileStatus,
  CreditWorkflowEvent,
  CreditProductType,
  CreditDocumentType,
  VALID_TRANSITIONS,
} from "@shared/credit-types";

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
      expect(CreditWorkflowService.canTransition(CreditFileStatus.UNDER_REVIEW, CreditWorkflowEvent.REQUEST_DOCS)).toBe(
        true
      );
      expect(CreditWorkflowService.canTransition(CreditFileStatus.UNDER_REVIEW, CreditWorkflowEvent.MAKE_OFFER)).toBe(
        true
      );
      expect(CreditWorkflowService.canTransition(CreditFileStatus.UNDER_REVIEW, CreditWorkflowEvent.REJECT)).toBe(true);
    });

    it("should allow valid transitions from OFFERED", () => {
      expect(CreditWorkflowService.canTransition(CreditFileStatus.OFFERED, CreditWorkflowEvent.ACCEPT_OFFER)).toBe(
        true
      );
      expect(CreditWorkflowService.canTransition(CreditFileStatus.OFFERED, CreditWorkflowEvent.REJECT_OFFER)).toBe(
        true
      );
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
      expect(CreditWorkflowService.getNextStatus(CreditFileStatus.DRAFT, CreditWorkflowEvent.ADD_DOC)).toBe(
        CreditFileStatus.DOCS_PENDING
      );
      expect(CreditWorkflowService.getNextStatus(CreditFileStatus.DRAFT, CreditWorkflowEvent.SUBMIT)).toBe(
        CreditFileStatus.SUBMITTED
      );
      expect(CreditWorkflowService.getNextStatus(CreditFileStatus.SUBMITTED, CreditWorkflowEvent.REVIEW)).toBe(
        CreditFileStatus.UNDER_REVIEW
      );
      expect(CreditWorkflowService.getNextStatus(CreditFileStatus.UNDER_REVIEW, CreditWorkflowEvent.MAKE_OFFER)).toBe(
        CreditFileStatus.OFFERED
      );
      expect(CreditWorkflowService.getNextStatus(CreditFileStatus.OFFERED, CreditWorkflowEvent.ACCEPT_OFFER)).toBe(
        CreditFileStatus.ACCEPTED
      );
      expect(CreditWorkflowService.getNextStatus(CreditFileStatus.ACCEPTED, CreditWorkflowEvent.APPROVE)).toBe(
        CreditFileStatus.APPROVED
      );
    });

    it("should return null for invalid transitions", () => {
      expect(CreditWorkflowService.getNextStatus(CreditFileStatus.DRAFT, CreditWorkflowEvent.APPROVE)).toBeNull();
      expect(CreditWorkflowService.getNextStatus(CreditFileStatus.APPROVED, CreditWorkflowEvent.SUBMIT)).toBeNull();
    });
  });

  describe("applyTransition", () => {
    it("should apply valid transitions", () => {
      const nextStatus = CreditWorkflowService.applyTransition(
        CreditFileStatus.DRAFT,
        CreditWorkflowEvent.SUBMIT
      );
      expect(nextStatus).toBe(CreditFileStatus.SUBMITTED);
    });

    it("should throw on invalid transitions", () => {
      expect(() => {
        CreditWorkflowService.applyTransition(CreditFileStatus.DRAFT, CreditWorkflowEvent.APPROVE);
      }).toThrow();
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

  describe("isSuccess", () => {
    it("should identify success state", () => {
      expect(CreditWorkflowService.isSuccess(CreditFileStatus.APPROVED)).toBe(true);
    });

    it("should identify non-success states", () => {
      expect(CreditWorkflowService.isSuccess(CreditFileStatus.DRAFT)).toBe(false);
      expect(CreditWorkflowService.isSuccess(CreditFileStatus.REJECTED)).toBe(false);
    });
  });

  describe("isFailure", () => {
    it("should identify failure states", () => {
      expect(CreditWorkflowService.isFailure(CreditFileStatus.REJECTED)).toBe(true);
      expect(CreditWorkflowService.isFailure(CreditFileStatus.CLOSED)).toBe(true);
    });

    it("should identify non-failure states", () => {
      expect(CreditWorkflowService.isFailure(CreditFileStatus.DRAFT)).toBe(false);
      expect(CreditWorkflowService.isFailure(CreditFileStatus.APPROVED)).toBe(false);
    });
  });

  describe("isPending", () => {
    it("should identify pending states", () => {
      expect(CreditWorkflowService.isPending(CreditFileStatus.DRAFT)).toBe(true);
      expect(CreditWorkflowService.isPending(CreditFileStatus.SUBMITTED)).toBe(true);
      expect(CreditWorkflowService.isPending(CreditFileStatus.UNDER_REVIEW)).toBe(true);
    });

    it("should identify non-pending states", () => {
      expect(CreditWorkflowService.isPending(CreditFileStatus.APPROVED)).toBe(false);
      expect(CreditWorkflowService.isPending(CreditFileStatus.REJECTED)).toBe(false);
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
