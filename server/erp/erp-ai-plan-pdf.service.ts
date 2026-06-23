/**
 * erp-ai-plan-pdf.service.ts
 *
 * Service de génération de rapport PDF technique pour l'analyse de plans.
 * 10 sections : page de garde, résumé, éléments, quantitatif, contrôles,
 * hypothèses, recommandations, limites IA, annexes, validation.
 *
 * Sprint IA Construction
 */
import PDFDocument from "pdfkit";
import { getDb } from "../db";
import { storagePut } from "../storage";
import {
  erpAiPlanAnalyses,
  erpAiPlanElements,
  erpAiMaterialTakeoffs,
  erpAiEngineeringChecks,
  erpAiPlanReviewComments,
  users,
} from "../../drizzle/schema";
import { eq } from "drizzle-orm";

// --- Types ---
interface PdfReportConfig {
  analysisId: number;
  generatedBy: number;
  generatedByName: string;
  includeRawData?: boolean;
}

// --- Helpers ---
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("fr-FR", { style: "decimal", maximumFractionDigits: 0 }).format(amount) + " FCFA";
}

function formatDate(ts?: number | null): string {
  if (!ts) return "-";
  return new Date(ts).toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" });
}

function sectionTitle(doc: PDFKit.PDFDocument, text: string) {
  doc.fontSize(14).font("Helvetica-Bold").fillColor("#1a1a1a").text(text);
  doc.moveTo(50, doc.y + 2).lineTo(545, doc.y + 2).strokeColor("#e0e0e0").stroke();
  doc.moveDown(0.5);
}

function subTitle(doc: PDFKit.PDFDocument, text: string) {
  doc.fontSize(11).font("Helvetica-Bold").fillColor("#333333").text(text);
  doc.moveDown(0.3);
}

function bodyText(doc: PDFKit.PDFDocument, text: string) {
  doc.fontSize(9).font("Helvetica").fillColor("#444444").text(text);
}

function drawTable(doc: PDFKit.PDFDocument, headers: string[], rows: string[][], colWidths: number[]) {
  const startX = 50;
  const rowHeight = 18;
  let y = doc.y;

  // Header
  doc.fontSize(8).font("Helvetica-Bold").fillColor("#333333");
  let x = startX;
  for (let i = 0; i < headers.length; i++) {
    doc.text(headers[i], x, y, { width: colWidths[i], align: "left" });
    x += colWidths[i];
  }
  y += rowHeight;
  doc.moveTo(startX, y - 4).lineTo(startX + colWidths.reduce((a, b) => a + b, 0), y - 4).strokeColor("#dddddd").stroke();

  // Rows
  doc.font("Helvetica").fontSize(8).fillColor("#444444");
  for (const row of rows) {
    if (y > 740) {
      doc.addPage();
      y = 50;
    }
    x = startX;
    for (let i = 0; i < row.length; i++) {
      doc.text(row[i] || "-", x, y, { width: colWidths[i], align: "left" });
      x += colWidths[i];
    }
    y += rowHeight;
  }

  doc.y = y + 5;
}

/**
 * Génère le rapport PDF technique et l'upload sur S3
 */
export async function generatePlanAnalysisPdf(config: PdfReportConfig): Promise<{
  fileUrl: string;
  fileKey: string;
  fileName: string;
}> {
  const db = (await getDb())!;

  // Charger les données
  const [analysis] = await db.select().from(erpAiPlanAnalyses)
    .where(eq(erpAiPlanAnalyses.id, config.analysisId));
  if (!analysis) throw new Error("Analyse introuvable");

  const elements = await db.select().from(erpAiPlanElements)
    .where(eq(erpAiPlanElements.planAnalysisId, config.analysisId));

  const takeoffs = await db.select().from(erpAiMaterialTakeoffs)
    .where(eq(erpAiMaterialTakeoffs.planAnalysisId, config.analysisId));

  const checks = await db.select().from(erpAiEngineeringChecks)
    .where(eq(erpAiEngineeringChecks.planAnalysisId, config.analysisId));

  const comments = await db.select().from(erpAiPlanReviewComments)
    .where(eq(erpAiPlanReviewComments.planAnalysisId, config.analysisId));

  // Générer le PDF
  const pdfBuffer = await buildPdf(analysis, elements, takeoffs, checks, comments, config);

  // Upload sur S3
  const fileName = `rapport-plan-${analysis.analysisNumber}-${Date.now()}.pdf`;
  const fileKey = `ai-plan-reports/${fileName}`;
  const { url } = await storagePut(fileKey, pdfBuffer, "application/pdf");

  return { fileUrl: url, fileKey, fileName };
}

async function buildPdf(
  analysis: any,
  elements: any[],
  takeoffs: any[],
  checks: any[],
  comments: any[],
  config: PdfReportConfig
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: 50, bufferPages: true });
    const chunks: Buffer[] = [];

    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    // ===== SECTION 1 : PAGE DE GARDE =====
    doc.moveDown(4);
    doc.fontSize(24).font("Helvetica-Bold").fillColor("#1a5276").text("FONCIER225", { align: "center" });
    doc.moveDown(0.3);
    doc.fontSize(10).font("Helvetica").fillColor("#666666").text("Plateforme Foncière Nationale — Module IA Construction", { align: "center" });
    doc.moveDown(3);
    doc.fontSize(18).font("Helvetica-Bold").fillColor("#000000").text("RAPPORT D'ANALYSE TECHNIQUE", { align: "center" });
    doc.moveDown(0.5);
    doc.fontSize(12).font("Helvetica").fillColor("#333333").text(`Plan : ${analysis.fileName}`, { align: "center" });
    doc.moveDown(0.3);
    doc.fontSize(11).text(`Référence : ${analysis.analysisNumber}`, { align: "center" });
    doc.moveDown(2);

    // Infos clés
    doc.fontSize(10).fillColor("#555555");
    doc.text(`Type de plan : ${translatePlanType(analysis.planType)}`, { align: "center" });
    doc.text(`Échelle : ${analysis.scaleConfirmed || analysis.scaleDetected || "Non déterminée"}`, { align: "center" });
    doc.text(`Niveau : ${analysis.floorLevel || "Non déterminé"}`, { align: "center" });
    doc.text(`Score de confiance : ${analysis.confidenceScore || 0}%`, { align: "center" });
    doc.moveDown(2);

    doc.moveTo(150, doc.y).lineTo(445, doc.y).strokeColor("#cccccc").stroke();
    doc.moveDown(1);
    doc.fontSize(9).fillColor("#888888");
    doc.text(`Généré le ${formatDate(Date.now())} par ${config.generatedByName}`, { align: "center" });
    doc.text(`Statut : ${translateStatus(analysis.analysisStatus)}`, { align: "center" });

    // ===== SECTION 2 : RÉSUMÉ EXÉCUTIF =====
    doc.addPage();
    sectionTitle(doc, "1. Résumé Exécutif");
    doc.moveDown(0.3);

    const kpis = [
      ["Éléments détectés", String(elements.length)],
      ["Matériaux calculés", String(takeoffs.length)],
      ["Contrôles d'ingénierie", String(checks.length)],
      ["Alertes critiques", String(checks.filter((c) => c.severity === "critical" || c.severity === "high").length)],
      ["Commentaires de revue", String(comments.length)],
      ["Confiance moyenne éléments", `${elements.length > 0 ? Math.round(elements.reduce((s, e) => s + (e.confidenceScore || 0), 0) / elements.length) : 0}%`],
    ];
    drawTable(doc, ["Indicateur", "Valeur"], kpis, [280, 200]);
    doc.moveDown(1);

    // Disclaimer
    doc.fontSize(8).font("Helvetica-Oblique").fillColor("#cc0000");
    doc.text("⚠️ AVERTISSEMENT : Ce rapport est généré par intelligence artificielle à titre indicatif. Il ne remplace en aucun cas l'expertise d'un ingénieur structure ou d'un bureau d'études qualifié. Toutes les données doivent être vérifiées avant utilisation.", {
      align: "left",
      width: 495,
    });
    doc.moveDown(1);

    // ===== SECTION 3 : ÉLÉMENTS DÉTECTÉS =====
    sectionTitle(doc, "2. Éléments Structurels Détectés");
    doc.moveDown(0.3);

    if (elements.length > 0) {
      // Grouper par type
      const byType: Record<string, any[]> = {};
      for (const el of elements) {
        const type = el.elementType;
        if (!byType[type]) byType[type] = [];
        byType[type].push(el);
      }

      for (const [type, els] of Object.entries(byType)) {
        subTitle(doc, `${translateElementType(type)} (${els.length})`);
        const rows = els.map((el) => [
          el.elementLabel || "-",
          el.length ? `${el.length}m` : "-",
          el.width ? `${el.width}m` : "-",
          el.height ? `${el.height}m` : "-",
          el.area ? `${el.area}m²` : "-",
          `${el.confidenceScore || 0}%`,
        ]);
        drawTable(doc, ["Label", "Longueur", "Largeur", "Hauteur", "Surface", "Confiance"], rows, [100, 70, 70, 70, 70, 60]);
        doc.moveDown(0.5);
      }
    } else {
      bodyText(doc, "Aucun élément détecté.");
    }

    // ===== SECTION 4 : QUANTITATIF MATÉRIAUX =====
    doc.addPage();
    sectionTitle(doc, "3. Quantitatif Matériaux (BOQ)");
    doc.moveDown(0.3);

    if (takeoffs.length > 0) {
      const takeoffRows = takeoffs.map((t) => [
        t.materialName,
        t.category,
        `${Number(t.calculatedQuantity).toFixed(1)} ${t.unit}`,
        `${t.wasteRate}%`,
        `${Number(t.recommendedQuantity).toFixed(1)} ${t.unit}`,
        t.purchaseQuantity ? `${Number(t.purchaseQuantity).toFixed(0)} ${t.purchaseUnit || ""}` : "-",
      ]);
      drawTable(doc, ["Matériau", "Catégorie", "Qté calculée", "Perte", "Qté recommandée", "Achat"], takeoffRows, [110, 60, 80, 40, 90, 90]);
    } else {
      bodyText(doc, "Quantitatif non encore calculé.");
    }

    // ===== SECTION 5 : CONTRÔLES D'INGÉNIERIE =====
    doc.addPage();
    sectionTitle(doc, "4. Contrôles d'Ingénierie");
    doc.moveDown(0.3);

    if (checks.length > 0) {
      const checkRows = checks.map((c) => [
        c.checkName,
        translateCheckType(c.checkType),
        translateSeverity(c.severity),
        translateCheckStatus(c.status),
        `${c.confidenceScore || 0}%`,
      ]);
      drawTable(doc, ["Contrôle", "Domaine", "Sévérité", "Statut", "Confiance"], checkRows, [140, 80, 70, 80, 60]);
      doc.moveDown(0.5);

      // Détails des alertes
      const alerts = checks.filter((c) => c.severity === "high" || c.severity === "critical");
      if (alerts.length > 0) {
        subTitle(doc, "Alertes importantes");
        for (const alert of alerts) {
          doc.fontSize(9).font("Helvetica-Bold").fillColor("#cc0000")
            .text(`• ${alert.checkName} [${translateSeverity(alert.severity)}]`);
          if (alert.detectedIssue) {
            doc.fontSize(8).font("Helvetica").fillColor("#444444")
              .text(`  Problème : ${alert.detectedIssue}`);
          }
          if (alert.recommendation) {
            doc.fontSize(8).font("Helvetica-Oblique").fillColor("#006600")
              .text(`  Recommandation : ${alert.recommendation}`);
          }
          doc.moveDown(0.3);
        }
      }
    } else {
      bodyText(doc, "Aucun contrôle d'ingénierie effectué.");
    }

    // ===== SECTION 6 : HYPOTHÈSES =====
    doc.addPage();
    sectionTitle(doc, "5. Hypothèses de Calcul");
    doc.moveDown(0.3);

    let hypotheses: string[] = [];
    try {
      hypotheses = analysis.hypotheses ? JSON.parse(analysis.hypotheses) : [];
    } catch { hypotheses = []; }

    if (hypotheses.length > 0) {
      for (const h of hypotheses) {
        bodyText(doc, `• ${h}`);
        doc.moveDown(0.2);
      }
    } else {
      bodyText(doc, "Aucune hypothèse enregistrée.");
    }
    doc.moveDown(1);

    // ===== SECTION 7 : RECOMMANDATIONS =====
    sectionTitle(doc, "6. Recommandations");
    doc.moveDown(0.3);

    const recommendations = checks.filter((c) => c.recommendation).map((c) => c.recommendation!);
    if (recommendations.length > 0) {
      for (const rec of recommendations) {
        bodyText(doc, `• ${rec}`);
        doc.moveDown(0.2);
      }
    } else {
      bodyText(doc, "Aucune recommandation spécifique.");
    }
    doc.moveDown(1);

    // ===== SECTION 8 : LIMITES DE L'IA =====
    sectionTitle(doc, "7. Limites de l'Intelligence Artificielle");
    doc.moveDown(0.3);

    const limitations = [
      "L'analyse par IA ne peut pas remplacer un calcul de structure détaillé (RDM, éléments finis).",
      "Les dimensions sont estimées à partir de l'image et peuvent comporter des erreurs de ±10-20%.",
      "L'IA ne peut pas évaluer la qualité du sol, les charges réelles, ni les conditions sismiques.",
      "Les quantités de matériaux sont indicatives et doivent être affinées par un métreur qualifié.",
      "Les contrôles d'ingénierie sont basiques et ne remplacent pas une étude de structure complète.",
      "L'IA peut ne pas détecter certains éléments masqués, superposés ou mal dessinés.",
      "Les normes appliquées sont générales (DTU) et peuvent nécessiter une adaptation locale.",
    ];
    for (const lim of limitations) {
      bodyText(doc, `• ${lim}`);
      doc.moveDown(0.2);
    }
    doc.moveDown(1);

    // ===== SECTION 9 : COMMENTAIRES DE REVUE =====
    sectionTitle(doc, "8. Commentaires de Revue");
    doc.moveDown(0.3);

    if (comments.length > 0) {
      const commentRows = comments.map((c) => [
        formatDate(c.createdAt),
        translateCommentType(c.commentType),
        c.comment.substring(0, 80) + (c.comment.length > 80 ? "..." : ""),
      ]);
      drawTable(doc, ["Date", "Type", "Commentaire"], commentRows, [100, 80, 310]);
    } else {
      bodyText(doc, "Aucun commentaire de revue.");
    }

    // ===== SECTION 10 : VALIDATION =====
    doc.addPage();
    sectionTitle(doc, "9. Validation et Signatures");
    doc.moveDown(1);

    // Bloc validation
    doc.fontSize(10).font("Helvetica").fillColor("#333333");
    doc.text(`Statut de l'analyse : ${translateStatus(analysis.analysisStatus)}`);
    doc.moveDown(0.5);

    if (analysis.reviewedBy) {
      doc.text(`Revu par : ID ${analysis.reviewedBy} — ${formatDate(analysis.reviewedAt)}`);
    }
    if (analysis.validatedBy) {
      doc.text(`Validé par : ID ${analysis.validatedBy} — ${formatDate(analysis.validatedAt)}`);
    }
    doc.moveDown(2);

    // Zone signature
    doc.moveTo(50, doc.y).lineTo(250, doc.y).strokeColor("#000000").stroke();
    doc.moveDown(0.3);
    doc.fontSize(9).text("Signature Ingénieur Structure");
    doc.moveDown(2);

    doc.moveTo(300, doc.y).lineTo(500, doc.y).strokeColor("#000000").stroke();
    doc.moveDown(0.3);
    doc.text("Signature Chef de Projet", 300);
    doc.moveDown(3);

    // Mention légale finale
    doc.fontSize(7).font("Helvetica-Oblique").fillColor("#999999");
    doc.text("Ce document est généré automatiquement par le module IA Construction de Foncier225. Il est fourni à titre informatif et ne constitue pas un document d'exécution. L'utilisation de ce rapport pour des travaux de construction engage la seule responsabilité de l'utilisateur. Un ingénieur qualifié doit valider toutes les données avant exécution.", {
      width: 495,
      align: "justify",
    });

    // === PIED DE PAGE ===
    const pageCount = doc.bufferedPageRange().count;
    for (let i = 0; i < pageCount; i++) {
      doc.switchToPage(i);
      doc.fontSize(7).fillColor("#999999")
        .text(`Foncier225 — Rapport IA Plan ${analysis.analysisNumber} | Page ${i + 1}/${pageCount}`, 50, 780, { align: "center" });
    }

    doc.end();
  });
}

// --- Traductions ---
function translatePlanType(type: string): string {
  const map: Record<string, string> = {
    architectural: "Architectural",
    structural: "Structural (Coffrage)",
    plumbing: "Plomberie",
    electrical: "Électricité",
    foundation: "Fondations",
    reinforcement: "Ferraillage",
    vrd: "VRD (Voirie et Réseaux Divers)",
    mixed: "Mixte",
    unknown: "Non déterminé",
  };
  return map[type] || type;
}

function translateStatus(status: string): string {
  const map: Record<string, string> = {
    pending: "En attente",
    analyzing: "En cours d'analyse",
    completed: "Analyse terminée",
    failed: "Échec",
    reviewed: "Revu",
    validated: "Validé",
    rejected: "Rejeté",
  };
  return map[status] || status;
}

function translateElementType(type: string): string {
  const map: Record<string, string> = {
    wall: "Murs",
    column: "Poteaux",
    beam: "Poutres",
    slab: "Dalles",
    foundation: "Fondations",
    footing: "Semelles",
    door: "Portes",
    window: "Fenêtres",
    stair: "Escaliers",
    room: "Pièces",
    pipe: "Tuyauterie",
    electrical_point: "Points électriques",
    plumbing_point: "Points sanitaires",
    other: "Autres",
  };
  return map[type] || type;
}

function translateCheckType(type: string): string {
  const map: Record<string, string> = {
    foundation: "Fondations",
    column: "Poteaux",
    beam: "Poutres",
    slab: "Dalles",
    masonry: "Maçonnerie",
    plumbing: "Plomberie",
    electrical: "Électricité",
    safety: "Sécurité",
  };
  return map[type] || type;
}

function translateSeverity(severity: string): string {
  const map: Record<string, string> = {
    info: "Info",
    low: "Faible",
    medium: "Moyen",
    high: "Élevé",
    critical: "Critique",
  };
  return map[severity] || severity;
}

function translateCheckStatus(status: string): string {
  const map: Record<string, string> = {
    passed: "✓ Conforme",
    warning: "⚠ Attention",
    failed: "✗ Non conforme",
    needs_review: "? À vérifier",
    ignored: "Ignoré",
    corrected: "Corrigé",
  };
  return map[status] || status;
}

function translateCommentType(type: string): string {
  const map: Record<string, string> = {
    correction: "Correction",
    validation: "Validation",
    warning: "Avertissement",
    engineer_note: "Note ingénieur",
    architect_note: "Note architecte",
    quantity_note: "Note quantité",
    note: "Note",
  };
  return map[type] || type;
}
