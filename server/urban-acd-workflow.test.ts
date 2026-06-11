import { describe, it, expect } from "vitest";
import {
  ACD_ALL_TRANSITIONS,
  ACD_PHASES,
  ACD_STATUS_LABELS,
  ACD_STEP_TYPES_PHASE1,
  ACD_STEP_TYPES_PHASE2,
  ACD_STEP_TYPES_PHASE3,
  getAcdPhaseForStatus,
  isValidAcdTransition,
  isAcdTerminal,
  getAcdNextStatuses,
  type AcdStatus,
} from "../shared/acd-workflow";

// Construire les constantes dérivées pour les tests
const ACD_ALL_STATUSES: AcdStatus[] = [
  ...ACD_PHASES.provisional.statuses,
  ...ACD_PHASES.development.statuses,
  ...ACD_PHASES.definitive.statuses,
  "acd_rejected",
  "acd_cancelled",
];
const ACD_STEP_TYPES = [...ACD_STEP_TYPES_PHASE1, ...ACD_STEP_TYPES_PHASE2, ...ACD_STEP_TYPES_PHASE3];

describe("ACD Workflow — Machine d'états", () => {
  describe("ACD_ALL_STATUSES", () => {
    it("contient 16 statuts (14 workflow + rejected + cancelled)", () => {
      expect(ACD_ALL_STATUSES.length).toBe(16);
    });

    it("commence par acd_draft et contient acd_rejected", () => {
      expect(ACD_ALL_STATUSES[0]).toBe("acd_draft");
      expect(ACD_ALL_STATUSES).toContain("acd_rejected");
      expect(ACD_ALL_STATUSES).toContain("acd_cancelled");
    });
  });

  describe("ACD_PHASES", () => {
    it("couvre les 3 phases : provisional, development, definitive", () => {
      expect(Object.keys(ACD_PHASES)).toEqual(
        expect.arrayContaining(["provisional", "development", "definitive"])
      );
    });

    it("la phase provisional contient les statuts de la première phase", () => {
      expect(ACD_PHASES.provisional.statuses).toContain("acd_draft");
      expect(ACD_PHASES.provisional.statuses).toContain("acd_submitted");
      expect(ACD_PHASES.provisional.statuses).toContain("acd_acp_signed");
    });

    it("la phase development contient les statuts de mise en valeur", () => {
      expect(ACD_PHASES.development.statuses).toContain("acd_development_notified");
      expect(ACD_PHASES.development.statuses).toContain("acd_development_ongoing");
      expect(ACD_PHASES.development.statuses).toContain("acd_development_verified");
    });

    it("la phase definitive contient les statuts de transformation ACD", () => {
      expect(ACD_PHASES.definitive.statuses).toContain("acd_transformation_requested");
      expect(ACD_PHASES.definitive.statuses).toContain("acd_acd_signed");
      expect(ACD_PHASES.definitive.statuses).toContain("acd_delivered");
    });
  });

  describe("getAcdPhaseForStatus", () => {
    it("retourne 'provisional' pour acd_draft", () => {
      expect(getAcdPhaseForStatus("acd_draft")).toBe("provisional");
    });

    it("retourne 'development' pour acd_development_ongoing", () => {
      expect(getAcdPhaseForStatus("acd_development_ongoing")).toBe("development");
    });

    it("retourne 'definitive' pour acd_delivered", () => {
      expect(getAcdPhaseForStatus("acd_delivered")).toBe("definitive");
    });

    it("retourne null pour un statut invalide", () => {
      expect(getAcdPhaseForStatus("invalid_status" as AcdStatus)).toBeNull();
    });
  });

  describe("isValidAcdTransition", () => {
    it("autorise la transition acd_draft → acd_submitted", () => {
      expect(isValidAcdTransition("acd_draft", "acd_submitted")).toBe(true);
    });

    it("autorise la transition acd_submitted → acd_lot_check", () => {
      expect(isValidAcdTransition("acd_submitted", "acd_lot_check")).toBe(true);
    });

    it("autorise la transition acd_lot_check → acd_technical_instruction", () => {
      expect(isValidAcdTransition("acd_lot_check", "acd_technical_instruction")).toBe(true);
    });

    it("autorise la transition acd_acp_signed → acd_development_notified", () => {
      expect(isValidAcdTransition("acd_acp_signed", "acd_development_notified")).toBe(true);
    });

    it("autorise la transition acd_development_verified → acd_transformation_requested", () => {
      expect(isValidAcdTransition("acd_development_verified", "acd_transformation_requested")).toBe(true);
    });

    it("autorise la transition acd_acd_signed → acd_journal_officiel", () => {
      expect(isValidAcdTransition("acd_acd_signed", "acd_journal_officiel")).toBe(true);
    });

    it("autorise la transition acd_journal_officiel → acd_delivered", () => {
      expect(isValidAcdTransition("acd_journal_officiel", "acd_delivered")).toBe(true);
    });

    it("interdit la transition acd_draft → acd_delivered (saut)", () => {
      expect(isValidAcdTransition("acd_draft", "acd_delivered")).toBe(false);
    });

    it("interdit la transition acd_delivered → acd_draft (retour)", () => {
      expect(isValidAcdTransition("acd_delivered", "acd_draft")).toBe(false);
    });

    it("interdit la transition acd_rejected → acd_submitted", () => {
      expect(isValidAcdTransition("acd_rejected", "acd_submitted")).toBe(false);
    });

    it("autorise le rejet depuis acd_submitted", () => {
      expect(isValidAcdTransition("acd_submitted", "acd_rejected")).toBe(true);
    });

    it("autorise le rejet depuis acd_lot_check", () => {
      expect(isValidAcdTransition("acd_lot_check", "acd_rejected")).toBe(true);
    });
  });

  describe("ACD_STATUS_LABELS", () => {
    it("a un label pour chaque statut", () => {
      for (const status of ACD_ALL_STATUSES) {
        expect(ACD_STATUS_LABELS[status]).toBeDefined();
        expect(typeof ACD_STATUS_LABELS[status]).toBe("string");
        expect(ACD_STATUS_LABELS[status].length).toBeGreaterThan(0);
      }
    });
  });

  describe("ACD_ALL_TRANSITIONS", () => {
    it("chaque statut non-terminal a au moins une transition", () => {
      for (const status of ACD_ALL_STATUSES) {
        if (isAcdTerminal(status)) {
          expect(ACD_ALL_TRANSITIONS[status] || []).toEqual([]);
        } else {
          expect((ACD_ALL_TRANSITIONS[status] || []).length).toBeGreaterThan(0);
        }
      }
    });

    it("toutes les transitions pointent vers des statuts valides", () => {
      for (const [, targets] of Object.entries(ACD_ALL_TRANSITIONS)) {
        for (const target of targets) {
          expect(ACD_ALL_STATUSES).toContain(target);
        }
      }
    });
  });

  describe("getAcdNextStatuses", () => {
    it("retourne les transitions possibles depuis acd_draft", () => {
      const next = getAcdNextStatuses("acd_draft");
      expect(next).toContain("acd_submitted");
      expect(next).toContain("acd_cancelled");
    });

    it("retourne un tableau vide pour un statut terminal", () => {
      expect(getAcdNextStatuses("acd_delivered")).toEqual([]);
    });
  });

  describe("isAcdTerminal", () => {
    it("retourne true pour acd_delivered, acd_rejected, acd_cancelled", () => {
      expect(isAcdTerminal("acd_delivered")).toBe(true);
      expect(isAcdTerminal("acd_rejected")).toBe(true);
      expect(isAcdTerminal("acd_cancelled")).toBe(true);
    });

    it("retourne false pour les statuts non-terminaux", () => {
      expect(isAcdTerminal("acd_draft")).toBe(false);
      expect(isAcdTerminal("acd_submitted")).toBe(false);
      expect(isAcdTerminal("acd_development_ongoing")).toBe(false);
    });
  });

  describe("ACD_STEP_TYPES", () => {
    it("contient au moins 10 types d'étapes", () => {
      expect(ACD_STEP_TYPES.length).toBeGreaterThanOrEqual(10);
    });

    it("contient les étapes clés du processus ACD", () => {
      expect(ACD_STEP_TYPES).toContain("depot_demande");
      expect(ACD_STEP_TYPES).toContain("verification_lot");
      expect(ACD_STEP_TYPES).toContain("instruction_technique");
      expect(ACD_STEP_TYPES).toContain("commission_attribution");
      expect(ACD_STEP_TYPES).toContain("signature_acp");
      expect(ACD_STEP_TYPES).toContain("mise_en_valeur");
      expect(ACD_STEP_TYPES).toContain("signature_acd");
      expect(ACD_STEP_TYPES).toContain("publication_jo");
      expect(ACD_STEP_TYPES).toContain("delivrance_titre");
    });
  });


});
