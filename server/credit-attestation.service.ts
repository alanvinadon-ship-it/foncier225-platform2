import { DocumentGenerationService, formatDocumentDateTime } from "./document-generation.service";

type FinalAttestationPdfInput = {
  documentRef: string;
  creditPublicRef: string;
  decisionType: "APPROVED" | "REJECTED";
  decidedAt: Date;
  issuedAt: Date;
  verifyCode: string;
  verifyUrl: string;
  parcelReference?: string | null;
  summary?: string | null;
};

export class CreditAttestationService {
  static generateDocumentRef() {
    return DocumentGenerationService.generateReference("CAF");
  }

  static generateVerifyCode() {
    return DocumentGenerationService.generateVerifyCode();
  }

  static hashVerifyCode(verifyCode: string) {
    return DocumentGenerationService.hashVerifyCode(verifyCode);
  }

  static buildVerifyUrl(baseUrl: string, verifyCode: string) {
    return DocumentGenerationService.buildVerifyUrl(baseUrl, verifyCode);
  }

  static buildFinalAttestationPdf(input: FinalAttestationPdfInput) {
    const decisionLabel = input.decisionType === "APPROVED" ? "APPROUVEE" : "REJETEE";
    return DocumentGenerationService.buildPdf({
      title: "Foncier225",
      subtitle: "Attestation de decision de credit habitat",
      verifySeed: input.verifyUrl,
      lines: [
        `Reference document : ${input.documentRef}`,
        `Reference dossier : ${input.creditPublicRef}`,
        `Decision finale : ${decisionLabel}`,
        `Date de decision : ${formatDocumentDateTime(input.decidedAt)}`,
        `Date d'emission : ${formatDocumentDateTime(input.issuedAt)}`,
        `Parcelle liee : ${input.parcelReference ?? "Non renseignee"}`,
        `Resume : ${input.summary ?? "Decision finale enregistree dans le workflow credit habitat."}`,
        `Code de verification : ${input.verifyCode}`,
        `Verification publique : ${input.verifyUrl}`,
        "Securite : ce document est verifiable publiquement via le code ci-dessus.",
      ],
    });
  }
}
