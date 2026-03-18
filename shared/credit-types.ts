/**
 * Credit Workflow Types & Enums
 * Centralized types for credit file management
 */

// ─── Credit File Status ───────────────────────────────────────────────
export enum CreditFileStatus {
  DRAFT = "DRAFT",
  DOCS_PENDING = "DOCS_PENDING",
  SUBMITTED = "SUBMITTED",
  UNDER_REVIEW = "UNDER_REVIEW",
  OFFERED = "OFFERED",
  ACCEPTED = "ACCEPTED",
  APPROVED = "APPROVED",
  REJECTED = "REJECTED",
  CLOSED = "CLOSED",
}

export const CREDIT_FILE_STATUS_LABELS: Record<CreditFileStatus, string> = {
  [CreditFileStatus.DRAFT]: "Brouillon",
  [CreditFileStatus.DOCS_PENDING]: "Documents en attente",
  [CreditFileStatus.SUBMITTED]: "Soumis",
  [CreditFileStatus.UNDER_REVIEW]: "En examen",
  [CreditFileStatus.OFFERED]: "Offre reçue",
  [CreditFileStatus.ACCEPTED]: "Offre acceptée",
  [CreditFileStatus.APPROVED]: "Approuvé",
  [CreditFileStatus.REJECTED]: "Rejeté",
  [CreditFileStatus.CLOSED]: "Fermé",
};

// ─── Credit Document Type ─────────────────────────────────────────────
export enum CreditDocumentType {
  ID_CARD = "ID_CARD",
  PROOF_INCOME = "PROOF_INCOME",
  PROOF_RESIDENCE = "PROOF_RESIDENCE",
  LAND_TITLE_DEED = "LAND_TITLE_DEED",
  BUILDING_PERMIT = "BUILDING_PERMIT",
  INSURANCE_QUOTE = "INSURANCE_QUOTE",
}

export const CREDIT_DOCUMENT_TYPE_LABELS: Record<CreditDocumentType, string> = {
  [CreditDocumentType.ID_CARD]: "Pièce d'identité",
  [CreditDocumentType.PROOF_INCOME]: "Justificatif de revenus",
  [CreditDocumentType.PROOF_RESIDENCE]: "Justificatif de domicile",
  [CreditDocumentType.LAND_TITLE_DEED]: "Titre foncier",
  [CreditDocumentType.BUILDING_PERMIT]: "Permis de construire",
  [CreditDocumentType.INSURANCE_QUOTE]: "Devis d'assurance",
};

// ─── Credit Document Status ───────────────────────────────────────────
export enum CreditDocumentStatus {
  PENDING = "PENDING",
  UPLOADED = "UPLOADED",
  VALIDATED = "VALIDATED",
  REJECTED = "REJECTED",
}

export const CREDIT_DOCUMENT_STATUS_LABELS: Record<CreditDocumentStatus, string> = {
  [CreditDocumentStatus.PENDING]: "En attente",
  [CreditDocumentStatus.UPLOADED]: "Téléchargé",
  [CreditDocumentStatus.VALIDATED]: "Validé",
  [CreditDocumentStatus.REJECTED]: "Rejeté",
};

// ─── Credit Product Type ──────────────────────────────────────────────
export enum CreditProductType {
  STANDARD = "STANDARD",
  SIMPLIFIED = "SIMPLIFIED",
}

export const CREDIT_PRODUCT_TYPE_LABELS: Record<CreditProductType, string> = {
  [CreditProductType.STANDARD]: "Crédit Standard",
  [CreditProductType.SIMPLIFIED]: "Crédit Simplifié",
};

// ─── Credit Decision Type ─────────────────────────────────────────────
export enum CreditDecisionType {
  APPROVED = "APPROVED",
  REJECTED = "REJECTED",
}

export const CREDIT_DECISION_TYPE_LABELS: Record<CreditDecisionType, string> = {
  [CreditDecisionType.APPROVED]: "Approuvé",
  [CreditDecisionType.REJECTED]: "Rejeté",
};

// ─── Credit Request Type ──────────────────────────────────────────────
export enum CreditRequestType {
  DOCUMENT_REQUEST = "DOCUMENT_REQUEST",
  INFORMATION_REQUEST = "INFORMATION_REQUEST",
}

export const CREDIT_REQUEST_TYPE_LABELS: Record<CreditRequestType, string> = {
  [CreditRequestType.DOCUMENT_REQUEST]: "Demande de document",
  [CreditRequestType.INFORMATION_REQUEST]: "Demande d'information",
};

// ─── Credit File Participant Role ────────────────────────────────────
export enum CreditFileParticipantRole {
  CITIZEN = "citizen",
  CO_BORROWER = "co_borrower",
  BANK_AGENT = "bank_agent",
  AGENT_TERRAIN = "agent_terrain",
}

export const CREDIT_PARTICIPANT_ROLE_LABELS: Record<CreditFileParticipantRole, string> = {
  [CreditFileParticipantRole.CITIZEN]: "Citoyen demandeur",
  [CreditFileParticipantRole.CO_BORROWER]: "Co-emprunteur",
  [CreditFileParticipantRole.BANK_AGENT]: "Agent bancaire",
  [CreditFileParticipantRole.AGENT_TERRAIN]: "Agent terrain",
};

// ─── Credit Audit Event Actions ──────────────────────────────────────
// Events actively triggered in this version
export const CREDIT_AUDIT_ACTIONS = {
  FILE_CREATED: "credit.file.created",
  FILE_SUBMITTED: "credit.file.submitted",
  FILE_DOC_UPLOADED: "credit.file.doc_uploaded",
  FILE_REQUEST_DOCS: "credit.file.request_docs",
  FILE_ERROR: "credit.file.error",
  // Prepared for future versions — not triggered yet
  FILE_UNDER_REVIEW: "credit.file.under_review",
  FILE_DOC_VALIDATED: "credit.file.doc.validated",
  FILE_DOC_REJECTED: "credit.file.doc.rejected",
  FILE_OFFER_MADE: "credit.file.offer_made",
  FILE_OFFER_ACCEPTED: "credit.file.offer_accepted",
  FILE_OFFER_REJECTED: "credit.file.offer_rejected",
  FILE_DECIDED: "credit.file.decided",
  FILE_ATTESTATION_ISSUED: "credit.file.attestation_issued",
  FILE_VIEWED_BANK: "credit.file.viewed_bank",
  FILE_CONSENT_GRANTED: "credit.file.consent.granted",
  FILE_CONSENT_REVOKED: "credit.file.consent.revoked",
  FILE_CLOSED: "credit.file.closed",
  OFFER_EXPIRED: "credit.offer.expired",
  ATTESTATION_VERIFIED: "credit.attestation.verified",
} as const;

export type CreditAuditAction = (typeof CREDIT_AUDIT_ACTIONS)[keyof typeof CREDIT_AUDIT_ACTIONS];

// ─── Public Reference Generator ─────────────────────────────────────
export function generateCreditPublicRef(): string {
  const year = new Date().getFullYear();
  const rand = Math.random().toString(36).substring(2, 7).toUpperCase();
  return `CF-${year}-${rand}`;
}

// ─── Workflow Events ──────────────────────────────────────────────────
export enum CreditWorkflowEvent {
  ADD_DOC = "ADD_DOC",
  UPLOAD_COMPLETE = "UPLOAD_COMPLETE",
  SUBMIT = "SUBMIT",
  REVIEW = "REVIEW",
  REQUEST_DOCS = "REQUEST_DOCS",
  MAKE_OFFER = "MAKE_OFFER",
  ACCEPT_OFFER = "ACCEPT_OFFER",
  REJECT_OFFER = "REJECT_OFFER",
  APPROVE = "APPROVE",
  REJECT = "REJECT",
}

// ─── Required Documents by Product Type ───────────────────────────────
export const REQUIRED_DOCUMENTS_BY_PRODUCT: Record<CreditProductType, CreditDocumentType[]> = {
  [CreditProductType.STANDARD]: [
    CreditDocumentType.ID_CARD,
    CreditDocumentType.PROOF_INCOME,
    CreditDocumentType.PROOF_RESIDENCE,
    CreditDocumentType.LAND_TITLE_DEED,
  ],
  [CreditProductType.SIMPLIFIED]: [
    CreditDocumentType.ID_CARD,
    CreditDocumentType.PROOF_RESIDENCE,
    CreditDocumentType.LAND_TITLE_DEED,
    // PROOF_INCOME is optional for SIMPLIFIED
  ],
};

// ─── Transition Rules ─────────────────────────────────────────────────
export const VALID_TRANSITIONS: Record<CreditFileStatus, CreditWorkflowEvent[]> = {
  [CreditFileStatus.DRAFT]: [CreditWorkflowEvent.ADD_DOC, CreditWorkflowEvent.SUBMIT],
  [CreditFileStatus.DOCS_PENDING]: [
    CreditWorkflowEvent.UPLOAD_COMPLETE,
    CreditWorkflowEvent.SUBMIT,
  ],
  [CreditFileStatus.SUBMITTED]: [CreditWorkflowEvent.REVIEW],
  [CreditFileStatus.UNDER_REVIEW]: [
    CreditWorkflowEvent.REQUEST_DOCS,
    CreditWorkflowEvent.MAKE_OFFER,
    CreditWorkflowEvent.REJECT,
  ],
  [CreditFileStatus.OFFERED]: [
    CreditWorkflowEvent.ACCEPT_OFFER,
    CreditWorkflowEvent.REJECT_OFFER,
  ],
  [CreditFileStatus.ACCEPTED]: [CreditWorkflowEvent.APPROVE, CreditWorkflowEvent.REJECT],
  [CreditFileStatus.APPROVED]: [],
  [CreditFileStatus.REJECTED]: [],
  [CreditFileStatus.CLOSED]: [],
};

// ─── Next Status by Event ─────────────────────────────────────────────
export const NEXT_STATUS_BY_EVENT: Record<CreditFileStatus, Record<CreditWorkflowEvent, CreditFileStatus | null>> = {
  [CreditFileStatus.DRAFT]: {
    [CreditWorkflowEvent.ADD_DOC]: CreditFileStatus.DOCS_PENDING,
    [CreditWorkflowEvent.SUBMIT]: CreditFileStatus.SUBMITTED,
    [CreditWorkflowEvent.UPLOAD_COMPLETE]: null,
    [CreditWorkflowEvent.REVIEW]: null,
    [CreditWorkflowEvent.REQUEST_DOCS]: null,
    [CreditWorkflowEvent.MAKE_OFFER]: null,
    [CreditWorkflowEvent.ACCEPT_OFFER]: null,
    [CreditWorkflowEvent.REJECT_OFFER]: null,
    [CreditWorkflowEvent.APPROVE]: null,
    [CreditWorkflowEvent.REJECT]: null,
  },
  [CreditFileStatus.DOCS_PENDING]: {
    [CreditWorkflowEvent.ADD_DOC]: null,
    [CreditWorkflowEvent.UPLOAD_COMPLETE]: CreditFileStatus.DOCS_PENDING,
    [CreditWorkflowEvent.SUBMIT]: CreditFileStatus.SUBMITTED,
    [CreditWorkflowEvent.REVIEW]: null,
    [CreditWorkflowEvent.REQUEST_DOCS]: null,
    [CreditWorkflowEvent.MAKE_OFFER]: null,
    [CreditWorkflowEvent.ACCEPT_OFFER]: null,
    [CreditWorkflowEvent.REJECT_OFFER]: null,
    [CreditWorkflowEvent.APPROVE]: null,
    [CreditWorkflowEvent.REJECT]: null,
  },
  [CreditFileStatus.SUBMITTED]: {
    [CreditWorkflowEvent.ADD_DOC]: null,
    [CreditWorkflowEvent.UPLOAD_COMPLETE]: null,
    [CreditWorkflowEvent.SUBMIT]: null,
    [CreditWorkflowEvent.REVIEW]: CreditFileStatus.UNDER_REVIEW,
    [CreditWorkflowEvent.REQUEST_DOCS]: null,
    [CreditWorkflowEvent.MAKE_OFFER]: null,
    [CreditWorkflowEvent.ACCEPT_OFFER]: null,
    [CreditWorkflowEvent.REJECT_OFFER]: null,
    [CreditWorkflowEvent.APPROVE]: null,
    [CreditWorkflowEvent.REJECT]: null,
  },
  [CreditFileStatus.UNDER_REVIEW]: {
    [CreditWorkflowEvent.ADD_DOC]: null,
    [CreditWorkflowEvent.UPLOAD_COMPLETE]: null,
    [CreditWorkflowEvent.SUBMIT]: null,
    [CreditWorkflowEvent.REVIEW]: null,
    [CreditWorkflowEvent.REQUEST_DOCS]: CreditFileStatus.DOCS_PENDING,
    [CreditWorkflowEvent.MAKE_OFFER]: CreditFileStatus.OFFERED,
    [CreditWorkflowEvent.ACCEPT_OFFER]: null,
    [CreditWorkflowEvent.REJECT_OFFER]: null,
    [CreditWorkflowEvent.APPROVE]: null,
    [CreditWorkflowEvent.REJECT]: CreditFileStatus.REJECTED,
  },
  [CreditFileStatus.OFFERED]: {
    [CreditWorkflowEvent.ADD_DOC]: null,
    [CreditWorkflowEvent.UPLOAD_COMPLETE]: null,
    [CreditWorkflowEvent.SUBMIT]: null,
    [CreditWorkflowEvent.REVIEW]: null,
    [CreditWorkflowEvent.REQUEST_DOCS]: null,
    [CreditWorkflowEvent.MAKE_OFFER]: null,
    [CreditWorkflowEvent.ACCEPT_OFFER]: CreditFileStatus.ACCEPTED,
    [CreditWorkflowEvent.REJECT_OFFER]: CreditFileStatus.CLOSED,
    [CreditWorkflowEvent.APPROVE]: null,
    [CreditWorkflowEvent.REJECT]: null,
  },
  [CreditFileStatus.ACCEPTED]: {
    [CreditWorkflowEvent.ADD_DOC]: null,
    [CreditWorkflowEvent.UPLOAD_COMPLETE]: null,
    [CreditWorkflowEvent.SUBMIT]: null,
    [CreditWorkflowEvent.REVIEW]: null,
    [CreditWorkflowEvent.REQUEST_DOCS]: null,
    [CreditWorkflowEvent.MAKE_OFFER]: null,
    [CreditWorkflowEvent.ACCEPT_OFFER]: null,
    [CreditWorkflowEvent.REJECT_OFFER]: null,
    [CreditWorkflowEvent.APPROVE]: CreditFileStatus.APPROVED,
    [CreditWorkflowEvent.REJECT]: CreditFileStatus.REJECTED,
  },
  [CreditFileStatus.APPROVED]: {
    [CreditWorkflowEvent.ADD_DOC]: null,
    [CreditWorkflowEvent.UPLOAD_COMPLETE]: null,
    [CreditWorkflowEvent.SUBMIT]: null,
    [CreditWorkflowEvent.REVIEW]: null,
    [CreditWorkflowEvent.REQUEST_DOCS]: null,
    [CreditWorkflowEvent.MAKE_OFFER]: null,
    [CreditWorkflowEvent.ACCEPT_OFFER]: null,
    [CreditWorkflowEvent.REJECT_OFFER]: null,
    [CreditWorkflowEvent.APPROVE]: null,
    [CreditWorkflowEvent.REJECT]: null,
  },
  [CreditFileStatus.REJECTED]: {
    [CreditWorkflowEvent.ADD_DOC]: null,
    [CreditWorkflowEvent.UPLOAD_COMPLETE]: null,
    [CreditWorkflowEvent.SUBMIT]: null,
    [CreditWorkflowEvent.REVIEW]: null,
    [CreditWorkflowEvent.REQUEST_DOCS]: null,
    [CreditWorkflowEvent.MAKE_OFFER]: null,
    [CreditWorkflowEvent.ACCEPT_OFFER]: null,
    [CreditWorkflowEvent.REJECT_OFFER]: null,
    [CreditWorkflowEvent.APPROVE]: null,
    [CreditWorkflowEvent.REJECT]: null,
  },
  [CreditFileStatus.CLOSED]: {
    [CreditWorkflowEvent.ADD_DOC]: null,
    [CreditWorkflowEvent.UPLOAD_COMPLETE]: null,
    [CreditWorkflowEvent.SUBMIT]: null,
    [CreditWorkflowEvent.REVIEW]: null,
    [CreditWorkflowEvent.REQUEST_DOCS]: null,
    [CreditWorkflowEvent.MAKE_OFFER]: null,
    [CreditWorkflowEvent.ACCEPT_OFFER]: null,
    [CreditWorkflowEvent.REJECT_OFFER]: null,
    [CreditWorkflowEvent.APPROVE]: null,
    [CreditWorkflowEvent.REJECT]: null,
  },
};
