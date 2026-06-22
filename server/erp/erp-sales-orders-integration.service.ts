/**
 * Service d'intégration Commandes Clients ↔ Budget / Comptabilité / Trésorerie
 * 
 * 3 mécanismes :
 * 1. syncSalesOrdersToBudget — Agrège les commandes dans les lignes budgétaires REVENUE
 * 2. generateSalesInvoice — Génère automatiquement une facture de vente au passage "invoiced"
 * 3. getSalesOrdersCashFlowForecast — Calcule les encaissements prévisionnels
 */
import { eq, and, gte, lt, inArray, sql } from "drizzle-orm";
import { getDb } from "../db";
import { createAuditEvent } from "../db";
import {
  erpSalesOrders,
  erpSalesOrderLines,
  erpSalesClients,
  erpSalesOrderHistory,
  erpBudgetLinesV2,
  erpBudgetLineAmounts,
  erpBudgetsV2,
  erpInvoices,
  erpInvoiceLines,
  erpAccountingPreEntries,
  erpAccountingPreEntryLines,
  erpAccountingAccounts,
} from "../../drizzle/schema";
import { like } from "drizzle-orm";

const getDatabase = async () => (await getDb())!;

// ═══════════════════════════════════════════════════════════════
// 1. SYNC COMMANDES → BUDGET (Recettes prévisionnelles)
// ═══════════════════════════════════════════════════════════════

interface BudgetSyncResult {
  linesUpdated: number;
  totalCommitted: number;
  totalInvoiced: number;
  totalPaid: number;
  errors: string[];
}

/**
 * Synchronise les commandes clients vers les lignes budgétaires REVENUE.
 * 
 * Logique :
 * - Commandes "received" ou "in_progress" → committedAmount (engagé)
 * - Commandes "invoiced" → invoicedAmount
 * - Commandes "paid" → actualAmount + paidAmount
 * - Commandes "delivered" → entre committed et invoiced
 * 
 * Si budgetLineId est renseigné sur la commande, on cible cette ligne.
 * Sinon, on répartit sur les lignes REVENUE du budget de l'année.
 */
export async function syncSalesOrdersToBudget(budgetId: number): Promise<BudgetSyncResult> {
  const db = await getDatabase();
  const errors: string[] = [];
  let linesUpdated = 0;

  // Récupérer le budget
  const [budget] = await db.select().from(erpBudgetsV2).where(eq(erpBudgetsV2.id, budgetId)).limit(1);
  if (!budget) return { linesUpdated: 0, totalCommitted: 0, totalInvoiced: 0, totalPaid: 0, errors: ["Budget introuvable"] };

  const fiscalYear = budget.fiscalYear;
  const yearStart = new Date(fiscalYear, 0, 1).getTime();
  const yearEnd = new Date(fiscalYear + 1, 0, 1).getTime();

  // Récupérer toutes les commandes de l'année fiscale (hors annulées)
  const orders = await db.select().from(erpSalesOrders)
    .where(and(
      gte(erpSalesOrders.orderDate, yearStart),
      lt(erpSalesOrders.orderDate, yearEnd),
      sql`${erpSalesOrders.status} != 'cancelled'`,
    ));

  if (orders.length === 0) {
    return { linesUpdated: 0, totalCommitted: 0, totalInvoiced: 0, totalPaid: 0, errors: ["Aucune commande pour cette année fiscale"] };
  }

  // Classifier les montants par mois et par statut
  const monthlyData: Record<number, { committed: number; invoiced: number; paid: number }> = {};
  for (let m = 1; m <= 12; m++) {
    monthlyData[m] = { committed: 0, invoiced: 0, paid: 0 };
  }

  for (const order of orders) {
    const month = new Date(order.orderDate).getMonth() + 1;
    const amount = order.totalTTC || 0;

    switch (order.status) {
      case "received":
      case "in_progress":
      case "delivered":
        monthlyData[month].committed += amount;
        break;
      case "invoiced":
        monthlyData[month].invoiced += amount;
        break;
      case "paid":
        monthlyData[month].paid += amount;
        break;
    }
  }

  // Récupérer les lignes budgétaires REVENUE du budget
  const revenueLines = await db.select().from(erpBudgetLinesV2)
    .where(and(
      eq(erpBudgetLinesV2.budgetId, budgetId),
      eq(erpBudgetLinesV2.lineType, "REVENUE"),
      eq(erpBudgetLinesV2.isTotalLine, 0),
      eq(erpBudgetLinesV2.isCalculatedLine, 0),
      sql`${erpBudgetLinesV2.deletedAt} IS NULL`,
    ));

  if (revenueLines.length === 0) {
    return { linesUpdated: 0, totalCommitted: 0, totalInvoiced: 0, totalPaid: 0, errors: ["Aucune ligne budgétaire REVENUE trouvée"] };
  }

  // Traiter les commandes avec budgetLineId spécifique
  const ordersWithBudgetLine = orders.filter(o => o.budgetLineId);
  const ordersWithoutBudgetLine = orders.filter(o => !o.budgetLineId);

  // 1. Commandes avec ligne budgétaire spécifique
  const specificLineAmounts: Record<number, Record<number, { committed: number; invoiced: number; paid: number }>> = {};
  for (const order of ordersWithBudgetLine) {
    const lineId = order.budgetLineId!;
    const month = new Date(order.orderDate).getMonth() + 1;
    const amount = order.totalTTC || 0;

    if (!specificLineAmounts[lineId]) {
      specificLineAmounts[lineId] = {};
      for (let m = 1; m <= 12; m++) specificLineAmounts[lineId][m] = { committed: 0, invoiced: 0, paid: 0 };
    }

    switch (order.status) {
      case "received":
      case "in_progress":
      case "delivered":
        specificLineAmounts[lineId][month].committed += amount;
        break;
      case "invoiced":
        specificLineAmounts[lineId][month].invoiced += amount;
        break;
      case "paid":
        specificLineAmounts[lineId][month].paid += amount;
        break;
    }
  }

  // 2. Commandes sans ligne budgétaire → répartir sur toutes les lignes REVENUE
  const genericMonthlyData: Record<number, { committed: number; invoiced: number; paid: number }> = {};
  for (let m = 1; m <= 12; m++) genericMonthlyData[m] = { committed: 0, invoiced: 0, paid: 0 };

  for (const order of ordersWithoutBudgetLine) {
    const month = new Date(order.orderDate).getMonth() + 1;
    const amount = order.totalTTC || 0;
    switch (order.status) {
      case "received":
      case "in_progress":
      case "delivered":
        genericMonthlyData[month].committed += amount;
        break;
      case "invoiced":
        genericMonthlyData[month].invoiced += amount;
        break;
      case "paid":
        genericMonthlyData[month].paid += amount;
        break;
    }
  }

  // Mettre à jour les lignes budgétaires
  for (const line of revenueLines) {
    const amounts = await db.select().from(erpBudgetLineAmounts)
      .where(eq(erpBudgetLineAmounts.budgetLineId, line.id));

    for (const amt of amounts) {
      const month = amt.monthNumber;
      let committed = 0;
      let invoiced = 0;
      let paid = 0;

      // Montants spécifiques à cette ligne
      if (specificLineAmounts[line.id]?.[month]) {
        committed += specificLineAmounts[line.id][month].committed;
        invoiced += specificLineAmounts[line.id][month].invoiced;
        paid += specificLineAmounts[line.id][month].paid;
      }

      // Montants génériques répartis
      if (revenueLines.length > 0) {
        committed += Math.round(genericMonthlyData[month].committed / revenueLines.length);
        invoiced += Math.round(genericMonthlyData[month].invoiced / revenueLines.length);
        paid += Math.round(genericMonthlyData[month].paid / revenueLines.length);
      }

      const actualAmount = paid;
      const committedAmount = committed + invoiced; // engagé = non encore payé
      const invoicedAmount = invoiced;
      const paidAmount = paid;

      const varianceAmount = actualAmount - amt.plannedAmount;
      const variancePercentage = amt.plannedAmount !== 0 ? Math.round((varianceAmount / amt.plannedAmount) * 100) : 0;
      const executionRate = amt.plannedAmount !== 0 ? Math.round((actualAmount / amt.plannedAmount) * 100) : 0;

      await db.update(erpBudgetLineAmounts).set({
        actualAmount,
        committedAmount,
        invoicedAmount,
        paidAmount,
        varianceAmount,
        variancePercentage,
        executionRate,
        updatedAt: Date.now(),
      }).where(eq(erpBudgetLineAmounts.id, amt.id));

      linesUpdated++;
    }
  }

  const totalCommitted = orders.filter(o => ["received", "in_progress", "delivered"].includes(o.status)).reduce((s, o) => s + (o.totalTTC || 0), 0);
  const totalInvoiced = orders.filter(o => o.status === "invoiced").reduce((s, o) => s + (o.totalTTC || 0), 0);
  const totalPaid = orders.filter(o => o.status === "paid").reduce((s, o) => s + (o.totalTTC || 0), 0);

  return { linesUpdated, totalCommitted, totalInvoiced, totalPaid, errors };
}

// ═══════════════════════════════════════════════════════════════
// 2. GÉNÉRATION AUTOMATIQUE DE FACTURE DE VENTE
// ═══════════════════════════════════════════════════════════════

interface InvoiceGenerationResult {
  invoiceId: number;
  invoiceNumber: string;
  preEntryId: number | null;
}

/**
 * Génère automatiquement une facture de vente à partir d'une commande client.
 * Appelé lors du passage au statut "invoiced".
 * 
 * Crée :
 * 1. Une facture dans erp_invoices (type standard)
 * 2. Les lignes de facture dans erp_invoice_lines
 * 3. Une écriture pré-comptable (Journal VE - Ventes)
 */
export async function generateSalesInvoice(
  orderId: number,
  userId: number
): Promise<InvoiceGenerationResult | null> {
  const db = await getDatabase();

  // Récupérer la commande
  const [order] = await db.select().from(erpSalesOrders).where(eq(erpSalesOrders.id, orderId));
  if (!order) return null;

  // Récupérer le client
  const [client] = await db.select().from(erpSalesClients).where(eq(erpSalesClients.id, order.clientId));
  if (!client) return null;

  // Récupérer les lignes de commande
  const orderLines = await db.select().from(erpSalesOrderLines)
    .where(eq(erpSalesOrderLines.orderId, orderId));

  const now = Date.now();

  // Générer le numéro de facture (FV-YYYY-NNNN)
  const year = new Date().getFullYear();
  const existingInvoices = await db.select({ id: erpInvoices.id }).from(erpInvoices)
    .where(like(erpInvoices.invoiceNumber, `FV-${year}-%`));
  const nextNum = existingInvoices.length + 1;
  const invoiceNumber = `FV-${year}-${String(nextNum).padStart(4, "0")}`;

  // Calculer les montants
  const subtotal = order.totalHT || 0;
  const taxRate = (order.taxRate || 18) * 100; // Convertir en centièmes (18% → 1800)
  const taxAmount = Math.round(subtotal * (order.taxRate || 18) / 100);
  const totalAmount = order.totalTTC || 0;

  // Calculer la date d'échéance (date commande + délai paiement client)
  const paymentTermsDays = client.paymentTermsDays || 30;
  const dueDate = now + (paymentTermsDays * 24 * 60 * 60 * 1000);

  // Créer la facture
  const [invoiceResult] = await db.insert(erpInvoices).values({
    invoiceNumber,
    reference: `BC ${order.clientRef || order.orderNumber}`,
    type: "standard",
    status: "submitted",
    issueDate: now,
    dueDate,
    subtotal,
    taxRate,
    taxAmount,
    totalAmount,
    paidAmount: 0,
    currency: order.currency || "XOF",
    notes: `Facture générée automatiquement depuis la commande ${order.orderNumber} — Client: ${client.name}`,
    createdBy: userId,
    createdAt: now,
    updatedAt: now,
  });

  const invoiceId = invoiceResult.insertId;

  // Créer les lignes de facture
  let sortOrder = 1;
  for (const line of orderLines) {
    const qty = line.quantity || 1;
    const unitPrice = Number(line.unitPriceHT) || 0;
    const amount = qty * unitPrice;
    const lineTaxRate = (order.taxRate || 18) * 100; // centièmes
    const lineTaxAmount = Math.round(amount * (order.taxRate || 18) / 100);
    const lineTotalAmount = amount + lineTaxAmount;

    await db.insert(erpInvoiceLines).values({
      invoiceId,
      description: line.description,
      quantity: qty,
      unitPrice,
      amount,
      taxRate: lineTaxRate,
      taxAmount: lineTaxAmount,
      totalAmount: lineTotalAmount,
      sortOrder: sortOrder++,
      createdAt: now,
    });
  }

  // Mettre à jour la commande avec l'ID de la facture
  await db.update(erpSalesOrders).set({
    invoiceId,
    updatedAt: now,
  }).where(eq(erpSalesOrders.id, orderId));

  // Générer l'écriture pré-comptable (Journal VE - Ventes)
  const preEntryId = await generateSalesPreEntry(invoiceId, orderId, order, client, userId);

  // Audit
  await createAuditEvent({
    actorId: userId,
    action: "sales_invoice_generated",
    targetType: "erp_sales_order",
    targetId: orderId,
    details: { invoiceId, invoiceNumber, totalAmount, clientName: client.name },
  });

  return { invoiceId, invoiceNumber, preEntryId };
}

/**
 * Génère l'écriture pré-comptable pour une facture de vente.
 * 
 * Journal VE (Ventes) :
 *   Débit  : 411xxx (Client)        = montant TTC
 *   Crédit : 701xxx (Ventes)        = montant HT
 *   Crédit : 4457xx (TVA collectée) = montant TVA
 */
async function generateSalesPreEntry(
  invoiceId: number,
  orderId: number,
  order: typeof erpSalesOrders.$inferSelect,
  client: typeof erpSalesClients.$inferSelect,
  userId: number
): Promise<number | null> {
  const db = await getDatabase();
  const now = Date.now();

  const totalHT = order.totalHT || 0;
  const totalTVA = Math.round(totalHT * (order.taxRate || 18) / 100);
  const totalTTC = order.totalTTC || 0;

  if (totalTTC === 0) return null;

  // Comptes comptables
  const accountClient = await getOrCreateAccount("411000", `Clients`, "asset");
  const accountVentes = await getOrCreateAccount("701000", "Ventes de services", "revenue");
  const accountTVACollectee = await getOrCreateAccount("445700", "TVA collectée", "liability");

  // Créer l'écriture pré-comptable
  const [entryResult] = await db.insert(erpAccountingPreEntries).values({
    sourceType: "sales_invoice",
    sourceId: invoiceId,
    entryDate: now,
    journalCode: "VE",
    description: `Facture vente ${client.name} — Commande ${order.orderNumber}`,
    status: "generated",
    totalDebit: totalTTC,
    totalCredit: totalTTC,
    createdBy: userId,
    createdAt: now,
    updatedAt: now,
  });

  const entryId = entryResult.insertId;

  // Débit : Client (créance)
  await db.insert(erpAccountingPreEntryLines).values({
    preEntryId: entryId,
    accountingAccountId: accountClient,
    debitAmount: totalTTC,
    creditAmount: 0,
    label: `Client ${client.name} — ${order.orderNumber}`,
    projectId: null,
    vendorId: null,
    taxCodeId: null,
    createdAt: now,
    updatedAt: now,
  });

  // Crédit : Ventes (produit HT)
  await db.insert(erpAccountingPreEntryLines).values({
    preEntryId: entryId,
    accountingAccountId: accountVentes,
    debitAmount: 0,
    creditAmount: totalHT,
    label: `Vente ${order.subject || order.orderNumber}`,
    projectId: null,
    vendorId: null,
    taxCodeId: null,
    createdAt: now,
    updatedAt: now,
  });

  // Crédit : TVA collectée
  if (totalTVA > 0) {
    await db.insert(erpAccountingPreEntryLines).values({
      preEntryId: entryId,
      accountingAccountId: accountTVACollectee,
      debitAmount: 0,
      creditAmount: totalTVA,
      label: `TVA collectée ${order.taxRate || 18}%`,
      projectId: null,
      vendorId: null,
      taxCodeId: null,
      createdAt: now,
      updatedAt: now,
    });
  }

  return entryId;
}

// Helper : trouver ou créer un compte comptable
async function getOrCreateAccount(code: string, name: string, accountType: string): Promise<number> {
  const db = await getDatabase();
  const [existing] = await db.select({ id: erpAccountingAccounts.id })
    .from(erpAccountingAccounts)
    .where(eq(erpAccountingAccounts.accountCode, code))
    .limit(1);
  if (existing) return existing.id;

  const now = Date.now();
  const [result] = await db.insert(erpAccountingAccounts).values({
    accountCode: code,
    accountName: name,
    accountType,
    isActive: true,
    createdAt: now,
    updatedAt: now,
  });
  return result.insertId;
}

// ═══════════════════════════════════════════════════════════════
// 3. CASH-FLOW PRÉVISIONNEL (Encaissements attendus)
// ═══════════════════════════════════════════════════════════════

interface CashFlowForecastEntry {
  month: number;
  year: number;
  expectedCollections: number; // Encaissements attendus
  orderCount: number;
  details: Array<{
    orderId: number;
    orderNumber: string;
    clientName: string;
    amount: number;
    expectedPaymentDate: number;
  }>;
}

interface CashFlowForecastResult {
  forecast: CashFlowForecastEntry[];
  totalExpected: number;
  totalOverdue: number;
  overdueOrders: Array<{
    orderId: number;
    orderNumber: string;
    clientName: string;
    amount: number;
    daysOverdue: number;
  }>;
}

/**
 * Calcule le cash-flow prévisionnel basé sur les commandes clients.
 * 
 * Pour chaque commande non payée :
 * - Date d'encaissement prévue = date livraison (ou date commande) + délai paiement client
 * - Les commandes dont la date prévue est dépassée sont marquées "overdue"
 */
export async function getSalesOrdersCashFlowForecast(
  months: number = 6
): Promise<CashFlowForecastResult> {
  const db = await getDatabase();
  const now = Date.now();

  // Récupérer toutes les commandes non payées et non annulées
  const orders = await db.select().from(erpSalesOrders)
    .where(and(
      sql`${erpSalesOrders.status} != 'cancelled'`,
      sql`${erpSalesOrders.status} != 'paid'`,
    ));

  // Récupérer les clients pour les délais de paiement
  const clients = await db.select().from(erpSalesClients);
  const clientMap = new Map(clients.map(c => [c.id, c]));

  const forecast: CashFlowForecastEntry[] = [];
  const overdueOrders: CashFlowForecastResult["overdueOrders"] = [];

  // Initialiser les mois du forecast
  const currentDate = new Date();
  for (let i = 0; i < months; i++) {
    const forecastDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + i, 1);
    forecast.push({
      month: forecastDate.getMonth() + 1,
      year: forecastDate.getFullYear(),
      expectedCollections: 0,
      orderCount: 0,
      details: [],
    });
  }

  let totalExpected = 0;
  let totalOverdue = 0;

  for (const order of orders) {
    const client = clientMap.get(order.clientId);
    const paymentTermsDays = client?.paymentTermsDays || 30;
    const clientName = client?.name || "Client inconnu";

    // Date de référence : date de livraison si livrée, sinon date prévue de livraison, sinon date commande
    const referenceDate = order.deliveredDate || order.expectedDeliveryDate || order.orderDate;
    const expectedPaymentDate = referenceDate + (paymentTermsDays * 24 * 60 * 60 * 1000);

    const remainingAmount = (order.totalTTC || 0) - (order.paidAmount || 0);
    if (remainingAmount <= 0) continue;

    // Vérifier si c'est en retard
    if (expectedPaymentDate < now) {
      const daysOverdue = Math.floor((now - expectedPaymentDate) / (24 * 60 * 60 * 1000));
      totalOverdue += remainingAmount;
      overdueOrders.push({
        orderId: order.id,
        orderNumber: order.orderNumber,
        clientName,
        amount: remainingAmount,
        daysOverdue,
      });
      continue;
    }

    // Placer dans le bon mois du forecast
    const paymentDate = new Date(expectedPaymentDate);
    const forecastEntry = forecast.find(f =>
      f.month === paymentDate.getMonth() + 1 && f.year === paymentDate.getFullYear()
    );

    if (forecastEntry) {
      forecastEntry.expectedCollections += remainingAmount;
      forecastEntry.orderCount++;
      forecastEntry.details.push({
        orderId: order.id,
        orderNumber: order.orderNumber,
        clientName,
        amount: remainingAmount,
        expectedPaymentDate,
      });
      totalExpected += remainingAmount;
    }
  }

  // Trier les overdue par montant décroissant
  overdueOrders.sort((a, b) => b.amount - a.amount);

  return { forecast, totalExpected, totalOverdue, overdueOrders };
}

// ═══════════════════════════════════════════════════════════════
// 4. GÉNÉRATION ÉCRITURE ENCAISSEMENT CLIENT
// ═══════════════════════════════════════════════════════════════

/**
 * Génère l'écriture pré-comptable lors de l'encaissement d'un paiement client.
 * 
 * Journal BQ (Banque) :
 *   Débit  : 512xxx (Banque)  = montant encaissé
 *   Crédit : 411xxx (Client)  = montant encaissé
 */
export async function generateClientPaymentPreEntry(
  orderId: number,
  amount: number,
  paymentMethod: string,
  userId: number
): Promise<number | null> {
  const db = await getDatabase();
  const now = Date.now();

  if (amount <= 0) return null;

  const [order] = await db.select().from(erpSalesOrders).where(eq(erpSalesOrders.id, orderId));
  if (!order) return null;

  const [client] = await db.select().from(erpSalesClients).where(eq(erpSalesClients.id, order.clientId));
  const clientName = client?.name || "Client";

  const isCash = paymentMethod === "cash" || paymentMethod === "caisse";
  const journalCode = isCash ? "CA" : "BQ";
  const tresorerieCode = isCash ? "531000" : "512000";
  const tresorerieName = isCash ? "Caisse" : "Banque";

  const accountTresorerie = await getOrCreateAccount(tresorerieCode, tresorerieName, "asset");
  const accountClient = await getOrCreateAccount("411000", "Clients", "asset");

  const [entryResult] = await db.insert(erpAccountingPreEntries).values({
    sourceType: "client_payment",
    sourceId: orderId,
    entryDate: now,
    journalCode,
    description: `Encaissement ${clientName} — Commande ${order.orderNumber}`,
    status: "generated",
    totalDebit: amount,
    totalCredit: amount,
    createdBy: userId,
    createdAt: now,
    updatedAt: now,
  });

  const entryId = entryResult.insertId;

  // Débit : Trésorerie (entrée de fonds)
  await db.insert(erpAccountingPreEntryLines).values({
    preEntryId: entryId,
    accountingAccountId: accountTresorerie,
    debitAmount: amount,
    creditAmount: 0,
    label: `Encaissement ${clientName} — ${order.orderNumber}`,
    projectId: null,
    vendorId: null,
    taxCodeId: null,
    createdAt: now,
    updatedAt: now,
  });

  // Crédit : Client (on solde la créance)
  await db.insert(erpAccountingPreEntryLines).values({
    preEntryId: entryId,
    accountingAccountId: accountClient,
    debitAmount: 0,
    creditAmount: amount,
    label: `Règlement ${clientName} — ${order.orderNumber}`,
    projectId: null,
    vendorId: null,
    taxCodeId: null,
    createdAt: now,
    updatedAt: now,
  });

  await createAuditEvent({
    actorId: userId,
    action: "client_payment_recorded",
    targetType: "erp_sales_order",
    targetId: orderId,
    details: { amount, paymentMethod, journalCode },
  });

  return entryId;
}
