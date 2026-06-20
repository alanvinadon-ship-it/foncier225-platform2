/**
 * erp-direction-report.service.ts
 * 
 * Service de génération de rapports PDF pour la Direction.
 * Utilise PDFKit pour créer des rapports analytiques mensuels.
 * 
 * Sprint Direction 360
 */
import PDFDocument from "pdfkit";
import { getDb } from "../db";
import { storagePut } from "../storage";
import {
  erpBudgets,
  erpBudgetLines,
  erpProjects,
  erpCashFlows,
  erpOverrunAlerts,
  erpSalesTargets,
  erpSalesTargetResults,
  erpBudgetPlSnapshots,
  erpBudgetCashflowSnapshots,
  erpRealEstatePrograms,
  erpRealEstateUnits,
  erpRealEstateSales,
  erpRealEstateInstallments,
  erpDirectionReportExports,
} from "../../drizzle/schema";
import { eq, desc, sql, gte, and } from "drizzle-orm";

export interface ReportConfig {
  title?: string;
  period?: string;
  year?: number;
  generatedBy?: string;
  generatedByName?: string;
  sections?: string[];
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("fr-FR", { style: "decimal", maximumFractionDigits: 0 }).format(amount) + " FCFA";
}

function formatDate(ts?: number): string {
  if (!ts) return "-";
  return new Date(ts).toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" });
}

/**
 * Génère un rapport PDF Direction et l'upload sur S3
 */
export async function generateDirectionReport(config: ReportConfig): Promise<{
  exportId: number;
  fileUrl: string;
  fileKey: string;
  fileName: string;
}> {
  const db = (await getDb())!;
  const now = Date.now();
  const reportTitle = config.title || `Rapport Direction — ${config.period || new Date().toLocaleDateString("fr-FR", { month: "long", year: "numeric" })}`;
  const fileName = `rapport-direction-${config.period || new Date().toISOString().slice(0, 7)}-${now}.pdf`;

  // Collecter les données
  const data = await collectReportData(config);

  // Générer le PDF
  const pdfBuffer = await buildPdf(reportTitle, config, data);

  // Upload sur S3
  const fileKey = `direction-reports/${fileName}`;
  const { url } = await storagePut(fileKey, pdfBuffer, "application/pdf");

  // Enregistrer l'export en DB
  const exportNumber = `DIR-${new Date().getFullYear()}-${String(now).slice(-6)}`;
  const [result] = await db.insert(erpDirectionReportExports).values({
    exportNumber,
    reportType: "direction_monthly",
    dateFrom: now - 30 * 24 * 60 * 60 * 1000,
    dateTo: now,
    filtersJson: { title: reportTitle, period: config.period, sections: config.sections || ["summary", "budget", "sales", "real_estate", "cash_flow", "alerts"] },
    filePath: url,
    fileName,
    fileSize: pdfBuffer.length,
    status: "generated",
    generatedBy: config.generatedBy ? parseInt(config.generatedBy) : null,
    generatedAt: now,
    createdAt: now,
    updatedAt: now,
  });

  return {
    exportId: result.insertId,
    fileUrl: url,
    fileKey,
    fileName,
  };
}

async function collectReportData(config: ReportConfig) {
  const db = (await getDb())!;
  const now = Date.now();
  const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;

  // Projets actifs
  const [projectsResult] = await db.select({ count: sql<number>`COUNT(*)` })
    .from(erpProjects)
    .where(eq(erpProjects.status, "in_progress"));

  // Budget global
  const budgetRows = await db.select({
    totalInitial: sql<number>`COALESCE(SUM(total_initial), 0)`,
    totalEngaged: sql<number>`COALESCE(SUM(total_engaged), 0)`,
    totalPaid: sql<number>`COALESCE(SUM(total_paid), 0)`,
  }).from(erpBudgets);

  // Budget par catégorie
  const budgetLines = await db.select().from(erpBudgetLines).limit(100);
  const byCategory: Record<string, { initial: number; engaged: number; paid: number }> = {};
  for (const line of budgetLines) {
    const cat = line.category || "Non classé";
    if (!byCategory[cat]) byCategory[cat] = { initial: 0, engaged: 0, paid: 0 };
    byCategory[cat].initial += line.initialAmount || 0;
    byCategory[cat].engaged += line.engagedAmount || 0;
    byCategory[cat].paid += line.paidAmount || 0;
  }

  // Cash Flow
  const cashFlowRows = await db.select({
    type: erpCashFlows.type,
    total: sql<number>`COALESCE(SUM(amount), 0)`,
  }).from(erpCashFlows)
    .where(gte(erpCashFlows.createdAt, thirtyDaysAgo))
    .groupBy(erpCashFlows.type);

  // Ventes immobilières
  const [salesResult] = await db.select({
    count: sql<number>`COUNT(*)`,
    totalAmount: sql<number>`COALESCE(SUM(sale_price), 0)`,
  }).from(erpRealEstateSales);

  // Installments
  const [installments] = await db.select({
    totalPaid: sql<number>`COALESCE(SUM(CASE WHEN status = 'paid' THEN amount ELSE 0 END), 0)`,
    totalDue: sql<number>`COALESCE(SUM(amount), 0)`,
  }).from(erpRealEstateInstallments);

  // Alertes
  const [alertsResult] = await db.select({ count: sql<number>`COUNT(*)` })
    .from(erpOverrunAlerts)
    .where(eq(erpOverrunAlerts.isAcknowledged, false));

  // Objectifs commerciaux
  const targets = await db.select().from(erpSalesTargets).limit(10);
  const enrichedTargets = await Promise.all(targets.map(async (t) => {
    const results = await db.select().from(erpSalesTargetResults)
      .where(eq(erpSalesTargetResults.salesTargetId, t.id));
    const totalAchieved = results.reduce((sum, r) => sum + (r.actualAmount || 0), 0);
    return { ...t, totalAchieved, progressPercent: t.targetAmount ? Math.round((totalAchieved / t.targetAmount) * 100) : 0 };
  }));

  // P&L snapshots
  const plSnapshots = await db.select().from(erpBudgetPlSnapshots)
    .orderBy(desc(erpBudgetPlSnapshots.monthNumber))
    .limit(12);

  return {
    activeProjects: projectsResult?.count || 0,
    budget: budgetRows[0] || { totalInitial: 0, totalEngaged: 0, totalPaid: 0 },
    budgetByCategory: byCategory,
    cashIn: cashFlowRows.find(r => r.type === "inflow")?.total || 0,
    cashOut: cashFlowRows.find(r => r.type === "outflow")?.total || 0,
    sales: { count: salesResult?.count || 0, totalAmount: salesResult?.totalAmount || 0 },
    installments: { totalPaid: installments?.totalPaid || 0, totalDue: installments?.totalDue || 0 },
    activeAlerts: alertsResult?.count || 0,
    salesTargets: enrichedTargets,
    plSnapshots: plSnapshots.reverse(),
  };
}

function buildPdf(title: string, config: ReportConfig, data: any): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: 50, bufferPages: true });
    const chunks: Buffer[] = [];

    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    // === PAGE DE GARDE ===
    doc.fontSize(24).font("Helvetica-Bold").text("FONCIER225", { align: "center" });
    doc.moveDown(0.5);
    doc.fontSize(10).font("Helvetica").fillColor("#666666").text("Plateforme Foncière Nationale", { align: "center" });
    doc.moveDown(2);
    doc.fontSize(18).font("Helvetica-Bold").fillColor("#000000").text(title, { align: "center" });
    doc.moveDown(1);
    doc.fontSize(11).font("Helvetica").fillColor("#444444")
      .text(`Généré le ${formatDate(Date.now())}`, { align: "center" });
    if (config.generatedByName) {
      doc.text(`Par : ${config.generatedByName}`, { align: "center" });
    }
    doc.moveDown(3);

    // Ligne de séparation
    doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor("#cccccc").stroke();
    doc.moveDown(2);

    // === SECTION 1 : RÉSUMÉ EXÉCUTIF ===
    doc.addPage();
    sectionTitle(doc, "1. Résumé Exécutif");
    doc.moveDown(0.5);

    const budgetConsumption = data.budget.totalInitial > 0
      ? Math.round((data.budget.totalPaid / data.budget.totalInitial) * 100) : 0;

    const kpis = [
      ["Projets actifs", String(data.activeProjects)],
      ["Budget Initial", formatCurrency(data.budget.totalInitial)],
      ["Budget Engagé", formatCurrency(data.budget.totalEngaged)],
      ["Budget Payé", formatCurrency(data.budget.totalPaid)],
      ["Taux de consommation", `${budgetConsumption}%`],
      ["Cash Flow Net (30j)", formatCurrency(data.cashIn - data.cashOut)],
      ["Alertes actives", String(data.activeAlerts)],
    ];

    drawTable(doc, ["Indicateur", "Valeur"], kpis, [250, 250]);
    doc.moveDown(1);

    // === SECTION 2 : BUDGET ===
    sectionTitle(doc, "2. Budget par Catégorie");
    doc.moveDown(0.5);

    const budgetRows = Object.entries(data.budgetByCategory).map(([cat, vals]: [string, any]) => [
      cat,
      formatCurrency(vals.initial),
      formatCurrency(vals.engaged),
      formatCurrency(vals.paid),
    ]);

    if (budgetRows.length > 0) {
      drawTable(doc, ["Catégorie", "Initial", "Engagé", "Payé"], budgetRows, [150, 120, 120, 120]);
    } else {
      doc.fontSize(10).text("Aucune donnée budgétaire disponible.", { align: "center" });
    }
    doc.moveDown(1);

    // === SECTION 3 : VENTES IMMOBILIÈRES ===
    doc.addPage();
    sectionTitle(doc, "3. Ventes Immobilières");
    doc.moveDown(0.5);

    const collectionRate = data.installments.totalDue > 0
      ? Math.round((data.installments.totalPaid / data.installments.totalDue) * 100) : 0;

    const realEstateKpis = [
      ["Nombre de ventes", String(data.sales.count)],
      ["Chiffre d'affaires total", formatCurrency(data.sales.totalAmount)],
      ["Encaissements reçus", formatCurrency(data.installments.totalPaid)],
      ["Montant total dû", formatCurrency(data.installments.totalDue)],
      ["Taux d'encaissement", `${collectionRate}%`],
    ];

    drawTable(doc, ["Indicateur", "Valeur"], realEstateKpis, [250, 250]);
    doc.moveDown(1);

    // === SECTION 4 : OBJECTIFS COMMERCIAUX ===
    sectionTitle(doc, "4. Objectifs Commerciaux");
    doc.moveDown(0.5);

    if (data.salesTargets.length > 0) {
      const targetRows = data.salesTargets.map((t: any) => [
        t.name?.substring(0, 30) || "-",
        formatCurrency(t.targetAmount || 0),
        formatCurrency(t.totalAchieved || 0),
        `${t.progressPercent}%`,
      ]);
      drawTable(doc, ["Objectif", "Cible", "Réalisé", "Progression"], targetRows, [150, 120, 120, 80]);
    } else {
      doc.fontSize(10).text("Aucun objectif commercial défini.", { align: "center" });
    }
    doc.moveDown(1);

    // === SECTION 5 : CASH FLOW ===
    sectionTitle(doc, "5. Trésorerie");
    doc.moveDown(0.5);

    const cfKpis = [
      ["Entrées (30 derniers jours)", formatCurrency(data.cashIn)],
      ["Sorties (30 derniers jours)", formatCurrency(data.cashOut)],
      ["Solde net", formatCurrency(data.cashIn - data.cashOut)],
    ];
    drawTable(doc, ["Indicateur", "Valeur"], cfKpis, [250, 250]);
    doc.moveDown(1);

    // === SECTION 6 : P&L ===
    if (data.plSnapshots.length > 0) {
      doc.addPage();
      sectionTitle(doc, "6. Compte de Résultat (P&L)");
      doc.moveDown(0.5);

      const plRows = data.plSnapshots.map((s: any) => [
        `Mois ${s.monthNumber}`,
        formatCurrency(s.revenueActual),
        formatCurrency(s.directCostsActual),
        formatCurrency(s.ebitdaActual),
      ]);
      drawTable(doc, ["Période", "Revenus", "Coûts directs", "EBITDA"], plRows, [100, 130, 130, 130]);
    }

    // === PIED DE PAGE ===
    const pageCount = doc.bufferedPageRange().count;
    for (let i = 0; i < pageCount; i++) {
      doc.switchToPage(i);
      doc.fontSize(8).fillColor("#999999")
        .text(`Foncier225 — Rapport Direction | Page ${i + 1}/${pageCount}`, 50, 780, { align: "center" });
    }

    doc.end();
  });
}

function sectionTitle(doc: PDFKit.PDFDocument, text: string) {
  doc.fontSize(14).font("Helvetica-Bold").fillColor("#1a1a1a").text(text);
  doc.moveTo(50, doc.y + 2).lineTo(545, doc.y + 2).strokeColor("#e0e0e0").stroke();
  doc.moveDown(0.3);
}

function drawTable(doc: PDFKit.PDFDocument, headers: string[], rows: string[][], colWidths: number[]) {
  const startX = 50;
  const rowHeight = 20;
  let y = doc.y;

  // Header
  doc.fontSize(9).font("Helvetica-Bold").fillColor("#333333");
  let x = startX;
  for (let i = 0; i < headers.length; i++) {
    doc.text(headers[i], x, y, { width: colWidths[i], align: "left" });
    x += colWidths[i];
  }
  y += rowHeight;
  doc.moveTo(startX, y - 4).lineTo(startX + colWidths.reduce((a, b) => a + b, 0), y - 4).strokeColor("#dddddd").stroke();

  // Rows
  doc.font("Helvetica").fontSize(9).fillColor("#444444");
  for (const row of rows) {
    if (y > 740) {
      doc.addPage();
      y = 50;
    }
    x = startX;
    for (let i = 0; i < row.length; i++) {
      doc.text(row[i], x, y, { width: colWidths[i], align: "left" });
      x += colWidths[i];
    }
    y += rowHeight;
  }

  doc.y = y + 5;
}
