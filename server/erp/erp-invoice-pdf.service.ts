/**
 * Service de génération de facture PDF — Format Facture Normalisée CI
 * Conforme au modèle : en-tête émetteur/client, QR code, tableau lignes, résumé TVA, totaux
 */
import PDFDocument from "pdfkit";
import QRCode from "qrcode";
import { getDb } from "../db";
import { erpInvoices, erpInvoiceLines, erpCompanySettings, erpSalesClients } from "../../drizzle/schema";
import { eq } from "drizzle-orm";
import { storagePut } from "../storage";

// --- Types ---
interface InvoicePdfData {
  // Émetteur
  company: {
    name: string;
    ncc: string;
    rccm: string;
    rccmDate: string;
    taxRegime: string;
    taxCenter: string;
    address: string;
    postalBox: string;
    city: string;
    phone: string;
    email: string;
    bankReferences: string;
    logoUrl?: string;
    defaultPaymentTerms: string;
    defaultPaymentMode: string;
  };
  // Client
  client: {
    name: string;
    address: string;
    ncc: string;
    taxRegime: string;
  };
  // Facture
  invoice: {
    number: string; // Numéro normalisé
    issueDate: string;
    issueTime: string;
    paymentMode: string;
    billingPeriod: string;
    bcReference: string; // Référence bon de commande
    vendorName: string;
  };
  // Lignes
  lines: Array<{
    ref: string;
    designation: string;
    unitPriceHT: number;
    quantity: number;
    unit: string;
    taxLabel: string;
    taxRate: number;
    discount: number;
    amountHT: number;
  }>;
  // Totaux
  totals: {
    totalHT: number;
    tva: number;
    totalTTC: number;
    otherTaxes: number;
    totalToPay: number;
  };
  // Résumé TVA
  taxSummary: Array<{
    category: string;
    subtotal: number;
    rate: number;
    totalTaxes: number;
  }>;
}

// --- Formatage montants ---
function formatAmount(amount: number): string {
  return amount.toLocaleString("fr-FR");
}

function formatDate(timestamp: number): string {
  const d = new Date(timestamp);
  return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function formatDateTime(timestamp: number): string {
  const d = new Date(timestamp);
  return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" }) +
    " " + d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

function getMonthYear(timestamp: number): string {
  const d = new Date(timestamp);
  const months = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"];
  return `${months[d.getMonth()]} ${d.getFullYear()}`;
}

// --- Génération du numéro de facture normalisé ---
export function generateNormalizedInvoiceNumber(ncc: string, year: number, sequence: number): string {
  const yy = String(year).slice(-2);
  const seq = String(sequence).padStart(12, "0");
  return `${ncc}${yy}${seq}`;
}

// --- Génération du QR Code ---
async function generateQRCodeDataUrl(data: string): Promise<string> {
  return await QRCode.toDataURL(data, { width: 100, margin: 1 });
}

// --- Génération du PDF ---
export async function generateInvoicePdf(invoiceId: number): Promise<{ buffer: Buffer; filename: string }> {
  const db = (await getDb())!;

  // Récupérer la facture
  const [invoice] = await db.select().from(erpInvoices).where(eq(erpInvoices.id, invoiceId));
  if (!invoice) throw new Error(`Facture #${invoiceId} introuvable`);

  // Récupérer les lignes
  const lines = await db.select().from(erpInvoiceLines).where(eq(erpInvoiceLines.invoiceId, invoiceId));

  // Récupérer les paramètres société
  const [company] = await db.select().from(erpCompanySettings);
  if (!company) throw new Error("Paramètres société non configurés. Veuillez configurer les informations de l'entreprise.");

  // Récupérer le client (via sales_orders ou directement)
  let clientData = { name: "Client", address: "", ncc: "", taxRegime: "" };
  // Chercher le client dans erp_sales_clients si la facture a un vendorId qui correspond
  if (invoice.vendorId) {
    const [client] = await db.select().from(erpSalesClients).where(eq(erpSalesClients.id, invoice.vendorId));
    if (client) {
      clientData = {
        name: client.name,
        address: client.contactEmail || client.address || "",
        ncc: client.ncc || client.taxId || "",
        taxRegime: client.taxRegime || "",
      };
    }
  }

  // Préparer les données
  const pdfData: InvoicePdfData = {
    company: {
      name: company.companyName,
      ncc: company.ncc || "",
      rccm: company.rccm || "",
      rccmDate: company.rccmDate || "",
      taxRegime: company.taxRegime || "",
      taxCenter: company.taxCenter || "",
      address: company.address || "",
      postalBox: company.postalBox || "",
      city: company.city || "",
      phone: company.phone || "",
      email: company.email || "",
      bankReferences: company.bankReferences || "",
      logoUrl: company.logoUrl || undefined,
      defaultPaymentTerms: company.defaultPaymentTerms || "Un mois date de dépôt de facture",
      defaultPaymentMode: company.defaultPaymentMode || "Virement",
    },
    client: clientData,
    invoice: {
      number: invoice.invoiceNumber,
      issueDate: formatDate(invoice.issueDate),
      issueTime: formatDateTime(invoice.issueDate),
      paymentMode: company.defaultPaymentMode || "Virement",
      billingPeriod: getMonthYear(invoice.issueDate),
      bcReference: invoice.reference || "",
      vendorName: "",
    },
    lines: lines.map((l, idx) => ({
      ref: String(l.id),
      designation: l.description,
      unitPriceHT: l.unitPrice, // en centimes
      quantity: l.quantity / 100, // stocké * 100
      unit: "",
      taxLabel: `TVA (${l.taxRate / 100})`,
      taxRate: l.taxRate / 100,
      discount: 0,
      amountHT: l.amount, // en centimes
    })),
    totals: {
      totalHT: invoice.subtotal,
      tva: invoice.taxAmount,
      totalTTC: invoice.totalAmount,
      otherTaxes: 0,
      totalToPay: invoice.totalAmount,
    },
    taxSummary: [{
      category: `TVA normal - TVA sur HT ${(invoice.taxRate / 100).toFixed(2)}% - A`,
      subtotal: invoice.subtotal,
      rate: invoice.taxRate / 100,
      totalTaxes: invoice.taxAmount,
    }],
  };

  // Générer le PDF
  const buffer = await renderInvoicePdf(pdfData);
  const filename = `FAC-${invoice.invoiceNumber}.pdf`;

  return { buffer, filename };
}

// --- Upload PDF vers S3 ---
export async function generateAndUploadInvoicePdf(invoiceId: number): Promise<{ url: string; key: string }> {
  const { buffer, filename } = await generateInvoicePdf(invoiceId);
  const key = `invoices/${filename}`;
  const { url } = await storagePut(key, buffer, "application/pdf");

  // Mettre à jour la facture avec l'URL
  const db = (await getDb())!;
  await db.update(erpInvoices)
    .set({ attachmentUrl: url, attachmentKey: key, updatedAt: Date.now() })
    .where(eq(erpInvoices.id, invoiceId));

  return { url, key };
}

// --- Rendu PDF avec PDFKit ---
async function renderInvoicePdf(data: InvoicePdfData): Promise<Buffer> {
  return new Promise(async (resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: "A4", margin: 40 });
      const chunks: Buffer[] = [];

      doc.on("data", (chunk: Buffer) => chunks.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", reject);

      const pageWidth = doc.page.width - 80; // 40 margin each side
      const leftCol = 40;
      const rightCol = 320;
      let y = 40;

      // ===== EN-TÊTE ÉMETTEUR (gauche) =====
      doc.lineWidth(0.5);
      doc.rect(leftCol, y, 260, 200).dash(3, { space: 2 }).stroke();
      doc.undash();

      const emY = y + 10;
      doc.fontSize(11).font("Helvetica-Bold").text(data.company.name, leftCol + 10, emY);
      doc.fontSize(8).font("Helvetica");
      let lineY = emY + 16;
      if (data.company.ncc) { doc.text(`NCC : ${data.company.ncc}`, leftCol + 10, lineY); lineY += 12; }
      if (data.company.taxRegime) { doc.text(`Régime d'imposition : ${data.company.taxRegime}`, leftCol + 10, lineY); lineY += 12; }
      if (data.company.taxCenter) { doc.text(`Centre des impôts : ${data.company.taxCenter}`, leftCol + 10, lineY); lineY += 12; }
      lineY += 4;
      if (data.company.rccm) { doc.text(`RCCM : ${data.company.rccm} du ${data.company.rccmDate}`, leftCol + 10, lineY); lineY += 12; }
      doc.text("Références bancaires :", leftCol + 10, lineY); lineY += 12;
      if (data.company.bankReferences) { doc.text(data.company.bankReferences, leftCol + 10, lineY); lineY += 12; }
      doc.text(`Établissement : ${data.company.name}`, leftCol + 10, lineY); lineY += 12;
      const fullAddress = [data.company.postalBox, data.company.city].filter(Boolean).join(" ");
      if (fullAddress) { doc.text(`Adresse : ${fullAddress}`, leftCol + 10, lineY); lineY += 12; }
      if (data.company.phone) { doc.text(`N° Tel : ${data.company.phone}`, leftCol + 10, lineY); lineY += 12; }
      if (data.company.email) { doc.text(`Mail : ${data.company.email}`, leftCol + 10, lineY); lineY += 12; }

      // ===== EN-TÊTE DROITE (Numéro facture + QR + Client) =====
      doc.fontSize(9).font("Helvetica-Bold").text(
        `Facture de vente N° ${data.invoice.number}`,
        rightCol, y + 10, { width: 230, align: "right" }
      );

      // QR Code
      const qrData = `FNE|${data.company.ncc}|${data.invoice.number}|${formatAmount(data.totals.totalToPay)}|${data.invoice.issueDate}`;
      const qrDataUrl = await generateQRCodeDataUrl(qrData);
      const qrBuffer = Buffer.from(qrDataUrl.split(",")[1], "base64");
      doc.image(qrBuffer, rightCol + 10, y + 30, { width: 70, height: 70 });

      // Badge FNE
      doc.fontSize(6).font("Helvetica")
        .text("FACTURE NORMALISÉE ÉLECTRONIQUE", rightCol + 100, y + 70, { width: 120, align: "center" });

      // Client
      const clientY = y + 110;
      doc.fontSize(8).font("Helvetica-Bold").text("Client", rightCol, clientY);
      doc.font("Helvetica");
      doc.text(`Nom : ${data.client.name}`, rightCol, clientY + 14);
      doc.text(`Adresse :`, rightCol, clientY + 26);
      doc.text(data.client.address, rightCol, clientY + 38);
      if (data.client.ncc) doc.text(`NCC : ${data.client.ncc}`, rightCol, clientY + 50);
      if (data.client.taxRegime) doc.text(`Régime d'imposition : ${data.client.taxRegime}`, rightCol, clientY + 62);

      // ===== INFORMATIONS COMPLÉMENTAIRES =====
      y = 250;
      doc.fontSize(8).font("Helvetica");
      if (data.invoice.vendorName) { doc.text(`Nom du vendeur : ${data.invoice.vendorName}`, leftCol, y); y += 12; }
      doc.text(`Date et heure : ${data.invoice.issueTime}`, leftCol, y); y += 12;
      doc.text(`Mode de paiement : ${data.invoice.paymentMode}`, leftCol, y); y += 16;
      doc.text(`Période de facturation: ${data.invoice.billingPeriod}`, leftCol, y); y += 12;
      if (data.invoice.bcReference) { doc.text(`${data.invoice.bcReference}`, leftCol, y); y += 12; }

      // ===== TABLEAU DES LIGNES =====
      y += 10;
      const tableX = leftCol;
      const colWidths = [40, 140, 70, 30, 35, 50, 40, 80];
      const headers = ["Réf", "Désignation", "P.U HT", "Qté", "Unité", "Taxes (%)", "Rem. (%)", "Montant HT"];

      // En-tête tableau
      doc.lineWidth(0.5);
      doc.rect(tableX, y, pageWidth, 18).stroke();
      doc.fontSize(7).font("Helvetica-Bold");
      let colX = tableX + 3;
      headers.forEach((h, i) => {
        doc.text(h, colX, y + 5, { width: colWidths[i], align: "center" });
        colX += colWidths[i];
      });
      y += 18;

      // Lignes
      doc.font("Helvetica").fontSize(7);
      for (const line of data.lines) {
        const rowH = 24;
        doc.rect(tableX, y, pageWidth, rowH).stroke();
        colX = tableX + 3;
        doc.text(line.ref, colX, y + 4, { width: colWidths[0], align: "center" });
        colX += colWidths[0];
        doc.text(line.designation, colX, y + 4, { width: colWidths[1] });
        colX += colWidths[1];
        doc.text(formatAmount(line.unitPriceHT), colX, y + 4, { width: colWidths[2], align: "right" });
        colX += colWidths[2];
        doc.text(String(line.quantity), colX, y + 4, { width: colWidths[3], align: "center" });
        colX += colWidths[3];
        doc.text(line.unit, colX, y + 4, { width: colWidths[4], align: "center" });
        colX += colWidths[4];
        doc.text(line.taxLabel, colX, y + 4, { width: colWidths[5], align: "center" });
        colX += colWidths[5];
        doc.text(String(line.discount), colX, y + 4, { width: colWidths[6], align: "center" });
        colX += colWidths[6];
        doc.text(formatAmount(line.amountHT), colX, y + 4, { width: colWidths[7], align: "right" });
        y += rowH;
      }

      // ===== TOTAUX =====
      y += 5;
      const totalsX = tableX + pageWidth - 200;
      const totalsW = 200;

      const drawTotalLine = (label: string, value: string, bold = false) => {
        if (bold) doc.font("Helvetica-Bold");
        else doc.font("Helvetica");
        doc.fontSize(8);
        doc.text(label, totalsX, y, { width: 100, align: "right" });
        doc.text(value, totalsX + 110, y, { width: 80, align: "right" });
        y += 14;
      };

      drawTotalLine("TOTAL HT", formatAmount(data.totals.totalHT));
      drawTotalLine("TVA", formatAmount(data.totals.tva));
      drawTotalLine("TOTAL TTC", formatAmount(data.totals.totalTTC), true);
      drawTotalLine("AUTRES TAXES", formatAmount(data.totals.otherTaxes));
      drawTotalLine("TOTAL A PAYER", formatAmount(data.totals.totalToPay), true);

      // ===== RÉSUMÉ DE LA FACTURE =====
      y += 15;
      doc.fontSize(8).font("Helvetica-Bold").text("RESUME DE LA FACTURE", leftCol, y);
      y += 14;

      // En-tête résumé
      const sumColWidths = [200, 80, 60, 80];
      const sumHeaders = ["CATEGORIE", "SOUS-TOTAL", "TAUX (%)", "TOTAL TAXES"];
      doc.rect(leftCol, y, pageWidth, 16).stroke();
      doc.fontSize(7).font("Helvetica-Bold");
      colX = leftCol + 3;
      sumHeaders.forEach((h, i) => {
        doc.text(h, colX, y + 4, { width: sumColWidths[i], align: i === 0 ? "left" : "center" });
        colX += sumColWidths[i];
      });
      y += 16;

      // Lignes résumé
      doc.font("Helvetica").fontSize(7);
      for (const tax of data.taxSummary) {
        doc.rect(leftCol, y, pageWidth, 16).stroke();
        colX = leftCol + 3;
        doc.text(tax.category, colX, y + 4, { width: sumColWidths[0] });
        colX += sumColWidths[0];
        doc.text(formatAmount(tax.subtotal), colX, y + 4, { width: sumColWidths[1], align: "center" });
        colX += sumColWidths[1];
        doc.text(`${tax.rate}%`, colX, y + 4, { width: sumColWidths[2], align: "center" });
        colX += sumColWidths[2];
        doc.text(formatAmount(tax.totalTaxes), colX, y + 4, { width: sumColWidths[3], align: "center" });
        y += 16;
      }

      // ===== PIED DE PAGE =====
      y += 20;
      doc.fontSize(9).font("Helvetica-Oblique")
        .text(data.company.defaultPaymentTerms, leftCol, y, { width: pageWidth, align: "center" });

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

// --- Récupérer ou créer les paramètres société ---
export async function getCompanySettings() {
  const db = (await getDb())!;
  const [settings] = await db.select().from(erpCompanySettings);
  return settings || null;
}

export async function upsertCompanySettings(data: Partial<{
  companyName: string;
  ncc: string;
  rccm: string;
  rccmDate: string;
  taxRegime: string;
  taxCenter: string;
  address: string;
  city: string;
  postalBox: string;
  phone: string;
  email: string;
  website: string;
  bankReferences: string;
  logoUrl: string;
  invoicePrefix: string;
  defaultPaymentTerms: string;
  defaultPaymentMode: string;
  defaultTaxRate: number;
}>) {
  const db = (await getDb())!;
  const [existing] = await db.select().from(erpCompanySettings);
  const now = Date.now();

  if (existing) {
    await db.update(erpCompanySettings)
      .set({ ...data, updatedAt: now })
      .where(eq(erpCompanySettings.id, existing.id));
    return { id: existing.id, updated: true };
  } else {
    const [result] = await db.insert(erpCompanySettings).values({
      companyName: data.companyName || "Mon Entreprise",
      ...data,
      createdAt: now,
      updatedAt: now,
    });
    return { id: result.insertId, updated: false };
  }
}

// --- Obtenir le prochain numéro de facture normalisé ---
export async function getNextNormalizedInvoiceNumber(): Promise<string> {
  const db = (await getDb())!;
  const [settings] = await db.select().from(erpCompanySettings);
  if (!settings || !settings.ncc) throw new Error("NCC non configuré dans les paramètres société");

  const ncc = settings.ncc;
  const year = new Date().getFullYear();
  const seq = settings.invoiceNextSeq || 1;

  // Incrémenter le compteur
  await db.update(erpCompanySettings)
    .set({ invoiceNextSeq: seq + 1, updatedAt: Date.now() })
    .where(eq(erpCompanySettings.id, settings.id));

  return generateNormalizedInvoiceNumber(ncc, year, seq);
}
