/**
 * acd-pdf-generator.ts — Génération du récapitulatif PDF d'un dossier ACD
 * Utilise PDFKit pour créer un document PDF structuré avec :
 * - En-tête officiel
 * - Informations du dossier
 * - Timeline des étapes (réelle vs théorique)
 * - Liste des documents déposés
 */
import PDFDocument from "pdfkit";
import QRCode from "qrcode";
import {
  ACD_STEP_LABELS,
  ACD_DOCUMENT_LABELS,
  ACD_REQUIRED_DOCUMENTS,
  ACD_STATUS_LABELS,
  ACD_PHASES,
  type AcdStatus,
  type AcdStepType,
  type AcdDocumentType,
  getAcdPhaseForStatus,
} from "../shared/acd-workflow";

// ─── Types ──────────────────────────────────────────────────────────────────

interface AcdApplicationData {
  applicationNumber: string;
  status: string;
  phase: string;
  applicantFullName: string;
  commune: string | null;
  lotNumber: string | null;
  ilotNumber: string | null;
  lotissementName: string | null;
  quartier: string | null;
  surfaceM2: number | null;
  usagePrevu: string | null;
  createdAt: number;
  updatedAt: number;
}

interface AcdStepData {
  stepType: string;
  status: string;
  startedAt: number | null;
  completedAt: number | null;
}

interface AcdDocumentData {
  documentType: string;
  label: string;
  fileUrl: string;
  createdAt: number;
}

interface GeneratePdfParams {
  application: AcdApplicationData;
  steps: AcdStepData[];
  documents: AcdDocumentData[];
}

// ─── Theoretical durations ─────────────────────────────────────────────────

const THEORETICAL_DAYS: Record<string, number> = {
  depot_demande: 7,
  verification_lot: 14,
  instruction_technique: 30,
  commission_attribution: 30,
  signature_acp: 14,
  notification_obligations: 7,
  mise_en_valeur: 730,
  constat_mise_en_valeur: 30,
  demande_transformation: 14,
  verification_conformite: 30,
  signature_acd: 14,
  publication_jo: 30,
  delivrance_titre: 14,
};

// ─── Helpers ────────────────────────────────────────────────────────────────

function daysBetween(start: number, end: number): number {
  return Math.max(1, Math.round((end - start) / (1000 * 60 * 60 * 24)));
}

function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

// ─── PDF Generator ──────────────────────────────────────────────────────────

export async function generateAcdPdf(params: GeneratePdfParams): Promise<Buffer> {
  const { application, steps, documents } = params;

  // Pre-generate QR code buffer
  let qrBuffer: Buffer | null = null;
  try {
    const trackingUrl = `https://foncier225-5jqvpxra.manus.space/citizen/suivi?ref=${application.applicationNumber}`;
    const qrDataUrl = await QRCode.toDataURL(trackingUrl, { width: 100, margin: 1 });
    qrBuffer = Buffer.from(qrDataUrl.split(",")[1], "base64");
  } catch (qrErr) {
    console.warn("[PDF] QR code pre-generation failed:", qrErr);
  }

  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];

    const doc = new PDFDocument({
      size: "A4",
      margins: { top: 50, bottom: 50, left: 50, right: 50 },
      info: {
        Title: `Récapitulatif ACD — ${application.applicationNumber}`,
        Author: "Foncier225 — Plateforme Foncière Nationale",
        Subject: "Récapitulatif de dossier ACD",
      },
    });

    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const pageWidth = doc.page.width - 100; // margins

    // ─── Header ─────────────────────────────────────────────────────────
    doc
      .fontSize(10)
      .fillColor("#666666")
      .text("RÉPUBLIQUE DE CÔTE D'IVOIRE", { align: "center" })
      .text("Union — Discipline — Travail", { align: "center" })
      .moveDown(0.5);

    doc
      .fontSize(9)
      .text("Ministère de la Construction, du Logement et de l'Urbanisme", { align: "center" })
      .moveDown(1);

    doc
      .fontSize(16)
      .fillColor("#1e40af")
      .text("RÉCAPITULATIF DE DOSSIER ACD", { align: "center" })
      .moveDown(0.3);

    doc
      .fontSize(12)
      .fillColor("#333333")
      .text(`Dossier N° ${application.applicationNumber}`, { align: "center" })
      .moveDown(1.5);

    // ─── Informations du dossier ────────────────────────────────────────
    doc
      .fontSize(13)
      .fillColor("#1e40af")
      .text("1. INFORMATIONS DU DOSSIER")
      .moveDown(0.5);

    doc.fontSize(10).fillColor("#333333");

    const infoRows: [string, string][] = [
      ["N° Dossier", application.applicationNumber],
      ["Statut actuel", ACD_STATUS_LABELS[application.status as AcdStatus] || application.status],
      ["Phase", ACD_PHASES[getAcdPhaseForStatus(application.status as AcdStatus) || "provisional"]?.label || "—"],
      ["Demandeur", application.applicantFullName],
      ["Commune", application.commune || "—"],
      ["Lot", application.lotNumber ? `N° ${application.lotNumber}` : "—"],
      ["Îlot", application.ilotNumber ? `N° ${application.ilotNumber}` : "—"],
      ["Lotissement", application.lotissementName || "—"],
      ["Quartier", application.quartier || "—"],
      ["Surface", application.surfaceM2 ? `${application.surfaceM2} m²` : "—"],
      ["Usage prévu", application.usagePrevu ? application.usagePrevu.charAt(0).toUpperCase() + application.usagePrevu.slice(1) : "—"],
      ["Date de création", formatDate(application.createdAt)],
      ["Dernière mise à jour", formatDate(application.updatedAt)],
    ];

    for (const [label, value] of infoRows) {
      const y = doc.y;
      doc.font("Helvetica-Bold").text(`${label} :`, 50, y, { width: 140, continued: false });
      doc.font("Helvetica").text(value, 200, y);
    }

    doc.moveDown(1.5);

    // ─── Timeline des étapes ────────────────────────────────────────────
    doc
      .fontSize(13)
      .fillColor("#1e40af")
      .font("Helvetica-Bold")
      .text("2. TIMELINE DES ÉTAPES")
      .moveDown(0.5);

    doc.fontSize(9).fillColor("#333333").font("Helvetica");

    // Table header
    const colX = [50, 200, 310, 390, 470];
    const colW = [148, 108, 78, 78, 70];
    const headerY = doc.y;

    doc.font("Helvetica-Bold");
    doc.text("Étape", colX[0], headerY, { width: colW[0] });
    doc.text("Statut", colX[1], headerY, { width: colW[1] });
    doc.text("Début", colX[2], headerY, { width: colW[2] });
    doc.text("Fin", colX[3], headerY, { width: colW[3] });
    doc.text("Durée", colX[4], headerY, { width: colW[4] });
    doc.font("Helvetica");

    doc.moveDown(0.3);
    doc.moveTo(50, doc.y).lineTo(50 + pageWidth, doc.y).strokeColor("#cccccc").stroke();
    doc.moveDown(0.3);

    const allStepTypes: AcdStepType[] = [
      "depot_demande", "verification_lot", "instruction_technique",
      "commission_attribution", "signature_acp", "notification_obligations",
      "mise_en_valeur", "constat_mise_en_valeur", "demande_transformation",
      "verification_conformite", "signature_acd", "publication_jo", "delivrance_titre",
    ];

    for (const stepType of allStepTypes) {
      const stepData = steps.find(s => s.stepType === stepType);
      const statusLabel = stepData
        ? stepData.status === "completed" ? "✓ Complété"
          : stepData.status === "in_progress" ? "⏳ En cours"
          : "○ En attente"
        : "○ En attente";

      const startDate = stepData?.startedAt ? formatDate(stepData.startedAt).split(" ").slice(0, 2).join(" ") : "—";
      const endDate = stepData?.completedAt ? formatDate(stepData.completedAt).split(" ").slice(0, 2).join(" ") : "—";

      let duration = "—";
      if (stepData?.startedAt && stepData?.completedAt) {
        const days = daysBetween(stepData.startedAt, stepData.completedAt);
        duration = `${days}j / ${THEORETICAL_DAYS[stepType]}j`;
      } else if (stepData?.startedAt && stepData?.status === "in_progress") {
        const days = daysBetween(stepData.startedAt, Date.now());
        duration = `${days}j / ${THEORETICAL_DAYS[stepType]}j`;
      }

      // Check if we need a new page
      if (doc.y > 720) {
        doc.addPage();
      }

      const rowY = doc.y;
      doc.fontSize(8);
      doc.text(ACD_STEP_LABELS[stepType], colX[0], rowY, { width: colW[0] });
      doc.text(statusLabel, colX[1], rowY, { width: colW[1] });
      doc.text(startDate, colX[2], rowY, { width: colW[2] });
      doc.text(endDate, colX[3], rowY, { width: colW[3] });
      doc.text(duration, colX[4], rowY, { width: colW[4] });
      doc.moveDown(0.6);
    }

    doc.moveDown(1);

    // ─── Documents déposés ──────────────────────────────────────────────
    if (doc.y > 650) doc.addPage();

    doc
      .fontSize(13)
      .fillColor("#1e40af")
      .font("Helvetica-Bold")
      .text("3. DOCUMENTS DÉPOSÉS")
      .moveDown(0.5);

    doc.fontSize(9).fillColor("#333333").font("Helvetica");

    if (documents.length === 0) {
      doc.font("Helvetica-Oblique").text("Aucun document déposé pour le moment.").font("Helvetica");
    } else {
      for (let i = 0; i < documents.length; i++) {
        const docItem = documents[i];
        if (doc.y > 720) doc.addPage();

        const label = ACD_DOCUMENT_LABELS[docItem.documentType as AcdDocumentType] || docItem.label;
        doc
          .font("Helvetica")
          .text(`${i + 1}. ${label}`, 50, doc.y, { continued: false });
        doc
          .fontSize(8)
          .fillColor("#666666")
          .text(`   Déposé le ${formatDate(docItem.createdAt)}`, { indent: 20 })
          .fillColor("#333333")
          .fontSize(9);
        doc.moveDown(0.3);
      }
    }

    doc.moveDown(1.5);

    // ─── QR Code ────────────────────────────────────────────────────────────
    if (qrBuffer) {
      if (doc.y > 620) doc.addPage();

      const trackingUrl = `https://foncier225-5jqvpxra.manus.space/citizen/suivi?ref=${application.applicationNumber}`;
      doc.moveTo(50, doc.y).lineTo(50 + pageWidth, doc.y).strokeColor("#cccccc").stroke();
      doc.moveDown(0.5);

      const qrY = doc.y;
      doc.image(qrBuffer, 50, qrY, { width: 80, height: 80 });
      doc
        .fontSize(9)
        .fillColor("#333333")
        .text("Scannez ce QR code pour suivre", 140, qrY + 15)
        .text("votre dossier en ligne :", 140, qrY + 28)
        .fontSize(7)
        .fillColor("#0066cc")
        .text(trackingUrl, 140, qrY + 45, { link: trackingUrl });

      doc.y = qrY + 90;
    }

    doc.moveDown(1);

    // ─── Footer ─────────────────────────────────────────────────────────────
    if (doc.y > 700) doc.addPage();

    doc.moveTo(50, doc.y).lineTo(50 + pageWidth, doc.y).strokeColor("#cccccc").stroke();
    doc.moveDown(0.5);

    doc
      .fontSize(8)
      .fillColor("#999999")
      .text(
        `Document généré le ${formatDate(Date.now())} par la plateforme Foncier225.`,
        { align: "center" }
      )
      .text(
        "Ce document est un récapitulatif informatif et ne constitue pas un acte administratif officiel.",
        { align: "center" }
      );

    doc.end();
  });
}
