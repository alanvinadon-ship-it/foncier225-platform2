import PDFDocument from "pdfkit";
import { getDb } from "../db";
import { storagePut } from "../storage";
import {
  erpPurchaseOrders,
  erpPurchaseOrderLines,
  erpVendors,
  erpProjects,
  erpCompanySettings,
  users,
} from "../../drizzle/schema";
import { eq } from "drizzle-orm";

// --- Types ---
interface PurchaseOrderPdfData {
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
    website: string;
    bankReferences: string;
    logoUrl?: string;
  };
  purchaseOrder: {
    poNumber: string;
    orderDate: string;
    printDate: string;
    currency: string;
    type: string; // CAPEX / OPEX
    purchaseRequestNumber?: string;
    contractNumber?: string;
    vendorCode: string;
  };
  buyer: {
    name: string;
    organization: string;
  };
  vendor: {
    name: string;
    address: string;
    city: string;
    country: string;
  };
  deliveryAddress: {
    name: string;
    address: string;
    city: string;
    country: string;
  };
  billingAddress: {
    text: string;
    email: string;
  };
  observations: string;
  lines: Array<{
    lineNo: number;
    quantity: number;
    unit: string;
    articleRef: string;
    description: string;
    categoryCode: string;
    categoryDescription: string;
    deliveryDate: string;
    unitPriceHT: number;
    totalHT: number;
  }>;
  totals: {
    totalNetHT: number;
    montantTVA: number;
    totalTTC: number;
  };
  signature: {
    title: string;
    date: string;
    signatoryName: string;
    signatoryFunction: string;
  };
}

// --- Formatage ---
function formatAmount(amount: number): string {
  // amount est en centimes, convertir en unités
  const value = Math.round(amount / 100);
  return value.toLocaleString("fr-FR");
}

function formatDate(timestamp: number): string {
  const d = new Date(timestamp);
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
}

// --- Génération PDF ---
async function renderPurchaseOrderPdf(data: PurchaseOrderPdfData): Promise<Buffer> {
  return new Promise(async (resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: "A4", margin: 40 });
      const chunks: Buffer[] = [];

      doc.on("data", (chunk: Buffer) => chunks.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", reject);

      const pageWidth = doc.page.width - 80;
      const leftCol = 40;
      const rightCol = 320;
      let y = 40;

      // ===== LOGO (en haut à gauche) =====
      if (data.company.logoUrl) {
        try {
          const logoResponse = await fetch(data.company.logoUrl);
          if (logoResponse.ok) {
            const logoArrayBuffer = await logoResponse.arrayBuffer();
            const logoBuffer = Buffer.from(logoArrayBuffer);
            doc.image(logoBuffer, leftCol, y, { width: 120, height: 50, fit: [120, 50] });
          }
        } catch (_e) {
          // Logo non disponible, on continue
        }
      }

      // ===== TITRE =====
      doc.fontSize(18).font("Helvetica-Bold").text("BON DE COMMANDE", 0, y + 5, { align: "center", width: doc.page.width - 80 });
      y += 60;

      // ===== ADRESSE ÉMETTEUR (sous le logo) =====
      doc.fontSize(7).font("Helvetica");
      const emitterLines = [
        data.company.name,
        data.company.address,
        data.company.postalBox ? `${data.company.postalBox} ${data.company.city}` : data.company.city,
        data.company.phone ? `Tél : ${data.company.phone}` : "",
        data.company.website ? `Site Web : ${data.company.website}` : "",
      ].filter(Boolean);
      emitterLines.forEach(line => {
        doc.text(line, leftCol, y);
        y += 10;
      });
      y += 10;

      // ===== BLOC INFORMATIONS PRINCIPALES (2 colonnes) =====
      doc.lineWidth(0.5).rect(leftCol, y, pageWidth, 100).stroke();
      const infoY = y + 8;
      const midX = leftCol + pageWidth / 2;

      // Colonne gauche
      doc.fontSize(8).font("Helvetica");
      const leftLabels = [
        { label: "Acheteur :", value: data.buyer.name },
        { label: "Organisation :", value: data.buyer.organization },
        { label: "Type :", value: data.purchaseOrder.type },
        { label: "Devise :", value: data.purchaseOrder.currency },
        { label: "Taux :", value: "" },
      ];
      let ly = infoY;
      leftLabels.forEach(item => {
        doc.font("Helvetica-Bold").text(item.label, leftCol + 8, ly, { continued: true, width: 90 });
        doc.font("Helvetica").text(item.value, { width: 150 });
        ly += 14;
      });

      // Colonne droite
      const rightLabels = [
        { label: "N° Commande :", value: data.purchaseOrder.poNumber },
        { label: "N° Demande d'achat :", value: data.purchaseOrder.purchaseRequestNumber || "" },
        { label: "N° De Contrat :", value: data.purchaseOrder.contractNumber || "" },
        { label: "Date d'émission :", value: data.purchaseOrder.orderDate },
        { label: "Date d'impression :", value: data.purchaseOrder.printDate },
        { label: "Code fournisseur :", value: data.purchaseOrder.vendorCode },
      ];
      let ry = infoY;
      rightLabels.forEach(item => {
        doc.font("Helvetica-Bold").text(item.label, midX + 8, ry, { continued: true, width: 120 });
        doc.font("Helvetica").text(item.value, { width: 130 });
        ry += 14;
      });

      y += 108;

      // ===== BLOC ADRESSES (3 colonnes) =====
      const addrWidth = pageWidth / 3;
      doc.lineWidth(0.5).rect(leftCol, y, pageWidth, 80).stroke();
      doc.moveTo(leftCol + addrWidth, y).lineTo(leftCol + addrWidth, y + 80).stroke();
      doc.moveTo(leftCol + addrWidth * 2, y).lineTo(leftCol + addrWidth * 2, y + 80).stroke();

      const addrY = y + 6;

      // Adresse de livraison
      doc.fontSize(7).font("Helvetica-Bold").text("Adresse de livraison /d'exécution :", leftCol + 5, addrY, { width: addrWidth - 10 });
      doc.font("Helvetica").text(data.deliveryAddress.name, leftCol + 5, addrY + 12, { width: addrWidth - 10 });
      doc.text(data.deliveryAddress.address, leftCol + 5, addrY + 24, { width: addrWidth - 10 });
      doc.text(`${data.deliveryAddress.city}`, leftCol + 5, addrY + 36, { width: addrWidth - 10 });
      doc.text(data.deliveryAddress.country, leftCol + 5, addrY + 48, { width: addrWidth - 10 });

      // Adresse de facturation
      doc.font("Helvetica-Bold").text("Adresse de facturation :", leftCol + addrWidth + 5, addrY, { width: addrWidth - 10 });
      doc.font("Helvetica").text(data.billingAddress.text, leftCol + addrWidth + 5, addrY + 12, { width: addrWidth - 10 });
      if (data.billingAddress.email) {
        doc.text(data.billingAddress.email, leftCol + addrWidth + 5, addrY + 60, { width: addrWidth - 10 });
      }

      // Adresse du fournisseur
      doc.font("Helvetica-Bold").text("Adresse du fournisseur :", leftCol + addrWidth * 2 + 5, addrY, { width: addrWidth - 10 });
      doc.font("Helvetica").text(data.vendor.name, leftCol + addrWidth * 2 + 5, addrY + 12, { width: addrWidth - 10 });
      doc.text(data.vendor.address, leftCol + addrWidth * 2 + 5, addrY + 24, { width: addrWidth - 10 });
      doc.text(`${data.vendor.city}, ${data.vendor.country}`, leftCol + addrWidth * 2 + 5, addrY + 36, { width: addrWidth - 10 });

      y += 88;

      // ===== OBSERVATIONS =====
      if (data.observations) {
        doc.fontSize(8).font("Helvetica-Bold").text("Observations :", leftCol, y, { width: pageWidth });
        y += 12;
        doc.font("Helvetica").text(data.observations, leftCol + 80, y - 12, { width: pageWidth - 80 });
        const obsHeight = doc.heightOfString(data.observations, { width: pageWidth - 80 });
        y += Math.max(obsHeight, 12) + 8;
      }

      // ===== TABLEAU DES LIGNES =====
      const tableX = leftCol;
      const colWidths = [30, 40, 25, 55, 120, 60, 60, 55, 55, 60]; // total ~560 = pageWidth
      const headers = ["N°\nLigne", "Quantité", "UM", "Référence\nArticle", "Description", "Code\nCatégorie", "Description\nCatégorie", "Date de\nlivraison", "Coût\nunitaire HT", "Coût total HT"];

      // En-tête tableau
      const headerHeight = 28;
      doc.lineWidth(0.5).rect(tableX, y, pageWidth, headerHeight).stroke();
      let colX = tableX;
      headers.forEach((header, i) => {
        if (i > 0) doc.moveTo(colX, y).lineTo(colX, y + headerHeight).stroke();
        doc.fontSize(6).font("Helvetica-Bold").text(header, colX + 2, y + 4, { width: colWidths[i] - 4, align: "center" });
        colX += colWidths[i];
      });
      y += headerHeight;

      // Lignes
      data.lines.forEach(line => {
        const lineHeight = 30;
        doc.lineWidth(0.3).rect(tableX, y, pageWidth, lineHeight).stroke();
        colX = tableX;

        const values = [
          String(line.lineNo),
          line.quantity ? String(line.quantity) : "",
          line.unit || "",
          line.articleRef || "",
          line.description,
          line.categoryCode || "",
          line.categoryDescription || "",
          line.deliveryDate || "",
          line.unitPriceHT ? formatAmount(line.unitPriceHT) : "",
          formatAmount(line.totalHT),
        ];

        values.forEach((val, i) => {
          if (i > 0) doc.moveTo(colX, y).lineTo(colX, y + lineHeight).stroke();
          doc.fontSize(6).font("Helvetica").text(val, colX + 2, y + 4, { width: colWidths[i] - 4, align: i >= 8 ? "right" : "left" });
          colX += colWidths[i];
        });
        y += lineHeight;
      });

      // ===== TOTAUX =====
      y += 5;
      const totalsX = leftCol + pageWidth - 200;
      const totalsWidth = 200;

      const totalsData = [
        { label: "Total Net HT", value: formatAmount(data.totals.totalNetHT) },
        { label: "Montant TVA", value: formatAmount(data.totals.montantTVA) },
        { label: "Total TTC", value: formatAmount(data.totals.totalTTC) },
      ];

      totalsData.forEach(item => {
        doc.lineWidth(0.3).rect(totalsX, y, totalsWidth, 14).stroke();
        doc.moveTo(totalsX + 120, y).lineTo(totalsX + 120, y + 14).stroke();
        doc.fontSize(8).font("Helvetica-Bold").text(item.label, totalsX + 5, y + 3, { width: 110 });
        doc.font("Helvetica").text(item.value, totalsX + 125, y + 3, { width: 70, align: "right" });
        y += 14;
      });

      y += 20;

      // ===== BLOC SIGNATURE =====
      doc.fontSize(8).font("Helvetica-Bold").text(data.signature.title, leftCol, y);
      y += 12;
      doc.font("Helvetica").text(`Date : ${data.signature.date}`, leftCol, y);
      y += 12;
      doc.text("Signature :", leftCol, y);
      y += 30;
      if (data.signature.signatoryName) {
        doc.font("Helvetica-Bold").text(data.signature.signatoryName, leftCol, y);
        y += 12;
        doc.font("Helvetica").text(data.signature.signatoryFunction, leftCol, y);
      }

      // ===== PIED DE PAGE =====
      const footerY = doc.page.height - 60;
      doc.fontSize(6).font("Helvetica");
      const footerLines = [
        `${data.company.name}`,
        data.company.rccm ? `RCCM N° ${data.company.rccm}, CC N° ${data.company.ncc}, Régime d'imposition : ${data.company.taxRegime} Centre des impôts : ${data.company.taxCenter}` : "",
        data.company.bankReferences || "",
      ].filter(Boolean);
      footerLines.forEach((line, i) => {
        doc.text(line, leftCol, footerY + i * 9, { width: pageWidth, align: "center" });
      });

      // Page number
      doc.text("Page 1 / 1", leftCol + pageWidth - 50, footerY + 30, { width: 50, align: "right" });

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

// --- Service principal ---
export async function generatePurchaseOrderPdf(purchaseOrderId: number, userId: number): Promise<{ url: string; key: string }> {
  const db = (await getDb())!;

  // Récupérer le bon de commande
  const [order] = await db.select().from(erpPurchaseOrders).where(eq(erpPurchaseOrders.id, purchaseOrderId));
  if (!order) throw new Error("Bon de commande introuvable");

  // Récupérer les lignes
  const lines = await db.select().from(erpPurchaseOrderLines).where(eq(erpPurchaseOrderLines.purchaseOrderId, purchaseOrderId));

  // Récupérer le fournisseur
  const [vendor] = await db.select().from(erpVendors).where(eq(erpVendors.id, order.vendorId));
  if (!vendor) throw new Error("Fournisseur introuvable");

  // Récupérer les paramètres société
  const [company] = await db.select().from(erpCompanySettings);

  // Récupérer l'acheteur (créateur)
  const [buyer] = await db.select().from(users).where(eq(users.id, order.createdBy));

  // Récupérer le projet si lié
  let projectName = "";
  if (order.projectId) {
    const [project] = await db.select().from(erpProjects).where(eq(erpProjects.id, order.projectId));
    if (project) projectName = project.name;
  }

  // Construire les données PDF
  const pdfData: PurchaseOrderPdfData = {
    company: {
      name: company?.companyName || "Mon Entreprise",
      ncc: company?.ncc || "",
      rccm: company?.rccm || "",
      rccmDate: company?.rccmDate || "",
      taxRegime: company?.taxRegime || "RSI",
      taxCenter: company?.taxCenter || "",
      address: company?.address || "",
      postalBox: company?.postalBox || "",
      city: company?.city || "",
      phone: company?.phone || "",
      email: company?.email || "",
      website: company?.website || "",
      bankReferences: company?.bankReferences || "",
      logoUrl: company?.logoUrl || undefined,
    },
    purchaseOrder: {
      poNumber: order.poNumber,
      orderDate: formatDate(order.orderDate),
      printDate: formatDate(Date.now()),
      currency: order.currency || "XOF",
      type: order.purchaseType || "OPEX",
      purchaseRequestNumber: "",
      contractNumber: "",
      vendorCode: String(vendor.id),
    },
    buyer: {
      name: buyer?.name || "N/A",
      organization: projectName || "Direction Générale",
    },
    vendor: {
      name: vendor.name,
      address: vendor.address || "",
      city: "",
      country: "Côte d'Ivoire",
    },
    deliveryAddress: {
      name: company?.companyName || "Mon Entreprise",
      address: company?.address || "",
      city: company?.city || "ABIDJAN",
      country: "Côte d'Ivoire",
    },
    billingAddress: {
      text: `Direction Financière\n${company?.companyName || ""}\n${company?.address || ""}\n${company?.city || "ABIDJAN"}, Côte d'Ivoire`,
      email: company?.email || "",
    },
    observations: lines.map(l => l.description).join("\n"),
    lines: lines.map((l, idx) => ({
      lineNo: idx + 1,
      quantity: l.quantityOrdered,
      unit: l.unit || "",
      articleRef: "",
      description: l.description,
      categoryCode: l.itemType,
      categoryDescription: l.itemType === "material" ? "Matériaux" :
        l.itemType === "equipment" ? "Équipement" :
        l.itemType === "service" ? "Services" :
        l.itemType === "subcontracting" ? "Sous-traitance" : "Autre",
      deliveryDate: order.expectedDeliveryDate ? formatDate(order.expectedDeliveryDate) : "",
      unitPriceHT: l.unitPrice,
      totalHT: l.lineTotal,
    })),
    totals: {
      totalNetHT: order.subtotalAmount,
      montantTVA: order.taxAmount,
      totalTTC: order.totalAmount,
    },
    signature: {
      title: "Directeur des Achats et de la Logistique:",
      date: formatDate(order.orderDate),
      signatoryName: "",
      signatoryFunction: "",
    },
  };

  // Si le PO a été approuvé, utiliser l'approbateur comme signataire
  if (order.approvedBy) {
    const [approver] = await db.select().from(users).where(eq(users.id, order.approvedBy));
    if (approver) {
      pdfData.signature.signatoryName = approver.name || "";
      pdfData.signature.signatoryFunction = "Directeur des Achats et de la Logistique";
    }
  }

  // Générer le PDF
  const buffer = await renderPurchaseOrderPdf(pdfData);
  const filename = `PO_${order.poNumber.replace(/\//g, "_")}.pdf`;

  // Upload vers S3
  const randomSuffix = Math.random().toString(36).substring(2, 8);
  const fileKey = `erp/purchase-orders/${filename}-${randomSuffix}.pdf`;
  const { url } = await storagePut(fileKey, buffer, "application/pdf");

  return { url, key: fileKey };
}
