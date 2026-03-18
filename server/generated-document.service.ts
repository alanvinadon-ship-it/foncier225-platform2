import { DocumentGenerationService, formatDocumentDateTime } from "./document-generation.service";

export type GeneratedDocumentKind = "PARCEL_PDF" | "DOSSIER_PDF" | "FINAL_CREDIT_ATTESTATION";

type ParcelPdfInput = {
  reference: string;
  parcelReference: string;
  publicToken: string;
  statusPublic: string;
  generatedAt: Date;
  verifyCode: string;
  verifyUrl: string;
};

type DossierPdfInput = {
  reference: string;
  creditPublicRef: string;
  status: string;
  productType: string;
  generatedAt: Date;
  verifyCode: string;
  verifyUrl: string;
};

export class GeneratedDocumentService {
  static generateReference(kind: GeneratedDocumentKind) {
    switch (kind) {
      case "PARCEL_PDF":
        return DocumentGenerationService.generateReference("PAR");
      case "DOSSIER_PDF":
        return DocumentGenerationService.generateReference("DOS");
      case "FINAL_CREDIT_ATTESTATION":
        return DocumentGenerationService.generateReference("GDF");
    }
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

  static buildParcelPdf(input: ParcelPdfInput) {
    return DocumentGenerationService.buildPdf({
      title: "Foncier225",
      subtitle: "Document parcellaire verifiable",
      verifySeed: input.verifyUrl,
      lines: [
        `Reference document : ${input.reference}`,
        `Reference parcelle : ${input.parcelReference}`,
        `Jeton public parcelle : ${input.publicToken}`,
        `Statut synthese : ${input.statusPublic}`,
        `Date de generation : ${formatDocumentDateTime(input.generatedAt)}`,
        `Code de verification : ${input.verifyCode}`,
        `Verification publique : ${input.verifyUrl}`,
        "Securite : ce document ne contient aucune PII et se verifie via le lien ci-dessus.",
      ],
    });
  }

  static buildDossierPdf(input: DossierPdfInput) {
    return DocumentGenerationService.buildPdf({
      title: "Foncier225",
      subtitle: "Synthese de dossier credit habitat",
      verifySeed: input.verifyUrl,
      lines: [
        `Reference document : ${input.reference}`,
        `Reference dossier : ${input.creditPublicRef}`,
        `Produit : ${input.productType}`,
        `Statut synthese : ${input.status}`,
        `Date de generation : ${formatDocumentDateTime(input.generatedAt)}`,
        `Code de verification : ${input.verifyCode}`,
        `Verification publique : ${input.verifyUrl}`,
        "Securite : document verifiable publiquement sans divulgation de donnees personnelles.",
      ],
    });
  }
}
