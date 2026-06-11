/**
 * Machine d'états du workflow Foncier Urbain (ACD)
 * Arrêté de Concession Définitive — Procédure MCLU
 *
 * 3 Phases :
 *   Phase 1 — Concession Provisoire (ACP)
 *   Phase 2 — Mise en valeur
 *   Phase 3 — Concession Définitive (ACD)
 */

// ─── Types ───────────────────────────────────────────────────────────────────

export type AcdPhase = "provisional" | "development" | "definitive";

export type AcdStatus =
  // Phase 1 — Concession Provisoire
  | "acd_draft"
  | "acd_submitted"
  | "acd_lot_check"
  | "acd_technical_instruction"
  | "acd_commission"
  | "acd_acp_signed"
  // Phase 2 — Mise en valeur
  | "acd_development_notified"
  | "acd_development_ongoing"
  | "acd_development_verified"
  // Phase 3 — Concession Définitive
  | "acd_transformation_requested"
  | "acd_conformity_check"
  | "acd_acd_signed"
  | "acd_journal_officiel"
  | "acd_delivered"
  // Terminal
  | "acd_rejected"
  | "acd_cancelled";

export type AcdStepType =
  // Phase 1
  | "depot_demande"
  | "verification_lot"
  | "instruction_technique"
  | "commission_attribution"
  | "signature_acp"
  // Phase 2
  | "notification_obligations"
  | "mise_en_valeur"
  | "constat_mise_en_valeur"
  // Phase 3
  | "demande_transformation"
  | "verification_conformite"
  | "signature_acd"
  | "publication_jo"
  | "delivrance_titre";

// ─── Constantes ──────────────────────────────────────────────────────────────

export const ACD_PHASES: Record<AcdPhase, { label: string; statuses: AcdStatus[] }> = {
  provisional: {
    label: "Phase 1 — Concession Provisoire (ACP)",
    statuses: [
      "acd_draft",
      "acd_submitted",
      "acd_lot_check",
      "acd_technical_instruction",
      "acd_commission",
      "acd_acp_signed",
    ],
  },
  development: {
    label: "Phase 2 — Mise en valeur",
    statuses: [
      "acd_development_notified",
      "acd_development_ongoing",
      "acd_development_verified",
    ],
  },
  definitive: {
    label: "Phase 3 — Concession Définitive (ACD)",
    statuses: [
      "acd_transformation_requested",
      "acd_conformity_check",
      "acd_acd_signed",
      "acd_journal_officiel",
      "acd_delivered",
    ],
  },
};

export const ACD_STATUS_LABELS: Record<AcdStatus, string> = {
  acd_draft: "Brouillon",
  acd_submitted: "Soumis",
  acd_lot_check: "Vérification du lot",
  acd_technical_instruction: "Instruction technique",
  acd_commission: "Commission d'attribution",
  acd_acp_signed: "ACP signée",
  acd_development_notified: "Obligations notifiées",
  acd_development_ongoing: "Mise en valeur en cours",
  acd_development_verified: "Mise en valeur vérifiée",
  acd_transformation_requested: "Transformation demandée",
  acd_conformity_check: "Vérification de conformité",
  acd_acd_signed: "ACD signée",
  acd_journal_officiel: "Publié au J.O.",
  acd_delivered: "Titre délivré",
  acd_rejected: "Rejeté",
  acd_cancelled: "Annulé",
};

export const ACD_STEP_TYPES_PHASE1: AcdStepType[] = [
  "depot_demande",
  "verification_lot",
  "instruction_technique",
  "commission_attribution",
  "signature_acp",
];

export const ACD_STEP_TYPES_PHASE2: AcdStepType[] = [
  "notification_obligations",
  "mise_en_valeur",
  "constat_mise_en_valeur",
];

export const ACD_STEP_TYPES_PHASE3: AcdStepType[] = [
  "demande_transformation",
  "verification_conformite",
  "signature_acd",
  "publication_jo",
  "delivrance_titre",
];

export const ACD_STEP_LABELS: Record<AcdStepType, string> = {
  depot_demande: "Dépôt de la demande",
  verification_lot: "Vérification de la disponibilité du lot",
  instruction_technique: "Instruction technique (géomètre agréé)",
  commission_attribution: "Commission d'attribution",
  signature_acp: "Signature de l'ACP",
  notification_obligations: "Notification des obligations de mise en valeur",
  mise_en_valeur: "Mise en valeur du terrain",
  constat_mise_en_valeur: "Constat de mise en valeur",
  demande_transformation: "Demande de transformation ACP → ACD",
  verification_conformite: "Vérification de conformité",
  signature_acd: "Signature de l'ACD",
  publication_jo: "Publication au Journal Officiel",
  delivrance_titre: "Délivrance du titre",
};

// ─── Transitions valides ─────────────────────────────────────────────────────

/** Transitions Phase 1 — Concession Provisoire */
export const ACD_TRANSITIONS_PHASE1: Record<string, AcdStatus[]> = {
  acd_draft: ["acd_submitted", "acd_cancelled"],
  acd_submitted: ["acd_lot_check", "acd_rejected"],
  acd_lot_check: ["acd_technical_instruction", "acd_rejected"],
  acd_technical_instruction: ["acd_commission", "acd_rejected"],
  acd_commission: ["acd_acp_signed", "acd_rejected"],
  acd_acp_signed: ["acd_development_notified"],
};

/** Transitions Phase 2 — Mise en valeur */
export const ACD_TRANSITIONS_PHASE2: Record<string, AcdStatus[]> = {
  acd_development_notified: ["acd_development_ongoing"],
  acd_development_ongoing: ["acd_development_verified", "acd_rejected"],
  acd_development_verified: ["acd_transformation_requested"],
};

/** Transitions Phase 3 — Concession Définitive */
export const ACD_TRANSITIONS_PHASE3: Record<string, AcdStatus[]> = {
  acd_transformation_requested: ["acd_conformity_check", "acd_rejected"],
  acd_conformity_check: ["acd_acd_signed", "acd_rejected"],
  acd_acd_signed: ["acd_journal_officiel"],
  acd_journal_officiel: ["acd_delivered"],
};

/** Toutes les transitions combinées */
export const ACD_ALL_TRANSITIONS: Record<string, AcdStatus[]> = {
  ...ACD_TRANSITIONS_PHASE1,
  ...ACD_TRANSITIONS_PHASE2,
  ...ACD_TRANSITIONS_PHASE3,
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Vérifie si une transition est valide
 */
export function isValidAcdTransition(from: AcdStatus, to: AcdStatus): boolean {
  const allowed = ACD_ALL_TRANSITIONS[from];
  return !!allowed && allowed.includes(to);
}

/**
 * Retourne la phase correspondant à un statut
 */
export function getAcdPhaseForStatus(status: AcdStatus): AcdPhase | null {
  for (const [phase, config] of Object.entries(ACD_PHASES)) {
    if (config.statuses.includes(status)) return phase as AcdPhase;
  }
  return null;
}

/**
 * Retourne les transitions possibles depuis un statut donné
 */
export function getAcdNextStatuses(status: AcdStatus): AcdStatus[] {
  return ACD_ALL_TRANSITIONS[status] || [];
}

/**
 * Vérifie si un statut est terminal (pas de transition suivante)
 */
export function isAcdTerminal(status: AcdStatus): boolean {
  return status === "acd_delivered" || status === "acd_rejected" || status === "acd_cancelled";
}

// ─── Documents requis par étape ──────────────────────────────────────────────

export type AcdDocumentType =
  | "piece_identite"
  | "extrait_rccm"
  | "lettre_demande"
  | "plan_lotissement"
  | "attestation_lot"
  | "plan_geometre"
  | "rapport_technique"
  | "pv_commission"
  | "arrete_acp"
  | "permis_construire"
  | "photos_mise_en_valeur"
  | "rapport_constat"
  | "demande_transformation_acd"
  | "rapport_conformite"
  | "arrete_acd"
  | "publication_jo"
  | "quittance_frais";

export const ACD_REQUIRED_DOCUMENTS: Record<AcdStepType, AcdDocumentType[]> = {
  depot_demande: ["piece_identite", "lettre_demande", "plan_lotissement", "attestation_lot"],
  verification_lot: ["plan_lotissement"],
  instruction_technique: ["plan_geometre", "rapport_technique"],
  commission_attribution: ["pv_commission"],
  signature_acp: ["arrete_acp", "quittance_frais"],
  notification_obligations: [],
  mise_en_valeur: ["permis_construire", "photos_mise_en_valeur"],
  constat_mise_en_valeur: ["rapport_constat", "photos_mise_en_valeur"],
  demande_transformation: ["demande_transformation_acd"],
  verification_conformite: ["rapport_conformite"],
  signature_acd: ["arrete_acd", "quittance_frais"],
  publication_jo: ["publication_jo"],
  delivrance_titre: [],
};

export const ACD_DOCUMENT_LABELS: Record<AcdDocumentType, string> = {
  piece_identite: "Pièce d'identité",
  extrait_rccm: "Extrait RCCM (personne morale)",
  lettre_demande: "Lettre de demande",
  plan_lotissement: "Plan de lotissement approuvé",
  attestation_lot: "Attestation d'attribution de lot",
  plan_geometre: "Plan du géomètre expert",
  rapport_technique: "Rapport d'instruction technique",
  pv_commission: "PV de la commission d'attribution",
  arrete_acp: "Arrêté de Concession Provisoire",
  permis_construire: "Permis de construire",
  photos_mise_en_valeur: "Photos de la mise en valeur",
  rapport_constat: "Rapport de constat de mise en valeur",
  demande_transformation_acd: "Demande de transformation ACP → ACD",
  rapport_conformite: "Rapport de conformité",
  arrete_acd: "Arrêté de Concession Définitive",
  publication_jo: "Publication au Journal Officiel",
  quittance_frais: "Quittance des frais de procédure",
};
