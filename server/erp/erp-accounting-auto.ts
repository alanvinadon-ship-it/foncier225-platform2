/**
 * Génération automatique d'écritures pré-comptables
 * 
 * Déclenché lors de :
 * - Validation (approbation) d'une facture → Journal HA (Achats)
 * - Enregistrement d'un paiement → Journal BQ (Banque) ou CA (Caisse)
 * 
 * Schéma comptable simplifié :
 * 
 * Facture approuvée (Journal HA) :
 *   Débit : 601xxx (Achats) = montant HT
 *   Débit : 4452xx (TVA déductible) = montant TVA
 *   Crédit : 401xxx (Fournisseur) = montant TTC
 * 
 * Paiement enregistré (Journal BQ/CA) :
 *   Débit : 401xxx (Fournisseur) = montant payé
 *   Crédit : 512xxx (Banque) ou 531xxx (Caisse) = montant payé
 */

import { getDb } from "../db";
import { eq, and, like } from "drizzle-orm";
import {
  erpAccountingPreEntries,
  erpAccountingPreEntryLines,
  erpAccountingAccounts,
  erpInvoices,
  erpInvoiceLines,
} from "../../drizzle/schema";

// Trouver un compte comptable par préfixe de code (ex: "601", "401", "512")
async function findAccountByPrefix(prefix: string): Promise<number | null> {
  const db = (await getDb())!;
  const [account] = await db.select({ id: erpAccountingAccounts.id })
    .from(erpAccountingAccounts)
    .where(and(like(erpAccountingAccounts.accountCode, `${prefix}%`), eq(erpAccountingAccounts.isActive, true)))
    .limit(1);
  return account?.id ?? null;
}

// Trouver ou créer un compte par défaut
async function getOrCreateDefaultAccount(code: string, name: string, accountType: string): Promise<number> {
  const db = (await getDb())!;
  const [existing] = await db.select({ id: erpAccountingAccounts.id })
    .from(erpAccountingAccounts)
    .where(eq(erpAccountingAccounts.accountCode, code))
    .limit(1);
  if (existing) return existing.id;
  // Créer le compte par défaut
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

/**
 * Générer une écriture pré-comptable lors de l'approbation d'une facture
 */
export async function generateInvoicePreEntry(invoiceId: number, userId: number): Promise<number | null> {
  const db = (await getDb())!;
  
  // Récupérer la facture
  const [invoice] = await db.select().from(erpInvoices).where(eq(erpInvoices.id, invoiceId));
  if (!invoice) return null;
  
  // Récupérer les lignes de la facture
  const lines = await db.select().from(erpInvoiceLines).where(eq(erpInvoiceLines.invoiceId, invoiceId));
  
  const now = Date.now();
  const totalHT = invoice.subtotal || 0;
  const totalTVA = invoice.taxAmount || 0;
  const totalTTC = invoice.totalAmount || 0;
  
  if (totalTTC === 0) return null;
  
  // Comptes par défaut
  const accountAchats = await getOrCreateDefaultAccount("601000", "Achats de matières et fournitures", "expense");
  const accountTVA = await getOrCreateDefaultAccount("445200", "TVA déductible sur achats", "asset");
  const accountFournisseur = await getOrCreateDefaultAccount("401000", "Fournisseurs", "liability");
  
  // Créer l'écriture
  const [entryResult] = await db.insert(erpAccountingPreEntries).values({
    sourceType: "invoice",
    sourceId: invoiceId,
    entryDate: invoice.approvedAt || now,
    journalCode: "HA",
    description: `Facture ${invoice.invoiceNumber} - ${invoice.notes || "Achat"}`,
    status: "generated",
    totalDebit: totalTTC,
    totalCredit: totalTTC,
    createdBy: userId,
    createdAt: now,
    updatedAt: now,
  });
  const entryId = entryResult.insertId;
  
  // Ligne débit : Achats (HT)
  if (totalHT > 0) {
    await db.insert(erpAccountingPreEntryLines).values({
      preEntryId: entryId,
      accountingAccountId: accountAchats,
      debitAmount: totalHT,
      creditAmount: 0,
      label: `Achats - ${invoice.invoiceNumber}`,
      projectId: invoice.projectId || null,
      vendorId: invoice.vendorId || null,
      taxCodeId: null,
      createdAt: now,
      updatedAt: now,
    });
  }
  
  // Ligne débit : TVA déductible
  if (totalTVA > 0) {
    await db.insert(erpAccountingPreEntryLines).values({
      preEntryId: entryId,
      accountingAccountId: accountTVA,
      debitAmount: totalTVA,
      creditAmount: 0,
      label: `TVA déductible - ${invoice.invoiceNumber}`,
      projectId: invoice.projectId || null,
      vendorId: null,
      taxCodeId: null,
      createdAt: now,
      updatedAt: now,
    });
  }
  
  // Ligne crédit : Fournisseur (TTC)
  await db.insert(erpAccountingPreEntryLines).values({
    preEntryId: entryId,
    accountingAccountId: accountFournisseur,
    debitAmount: 0,
    creditAmount: totalTTC,
    label: `Fournisseur - ${invoice.invoiceNumber}`,
    projectId: invoice.projectId || null,
    vendorId: invoice.vendorId || null,
    taxCodeId: null,
    createdAt: now,
    updatedAt: now,
  });
  
  return entryId;
}

/**
 * Générer une écriture pré-comptable lors de l'enregistrement d'un paiement
 */
export async function generatePaymentPreEntry(
  paymentId: number,
  invoiceId: number,
  amount: number,
  paymentMethod: string,
  userId: number,
  invoiceNumber: string,
  vendorId: number | null,
  projectId: number | null,
): Promise<number | null> {
  const db = (await getDb())!;
  
  if (amount === 0) return null;
  
  const now = Date.now();
  
  // Déterminer le journal et le compte de trésorerie
  const isCash = paymentMethod === "cash" || paymentMethod === "caisse";
  const journalCode = isCash ? "CA" : "BQ";
  const tresorerieCode = isCash ? "531000" : "512000";
  const tresorerieName = isCash ? "Caisse" : "Banque";
  
  // Comptes
  const accountFournisseur = await getOrCreateDefaultAccount("401000", "Fournisseurs", "liability");
  const accountTresorerie = await getOrCreateDefaultAccount(tresorerieCode, tresorerieName, "asset");
  
  // Créer l'écriture
  const [entryResult] = await db.insert(erpAccountingPreEntries).values({
    sourceType: "payment",
    sourceId: paymentId,
    entryDate: now,
    journalCode,
    description: `Paiement facture ${invoiceNumber} - ${paymentMethod}`,
    status: "generated",
    totalDebit: amount,
    totalCredit: amount,
    createdBy: userId,
    createdAt: now,
    updatedAt: now,
  });
  const entryId = entryResult.insertId;
  
  // Débit : Fournisseur (on solde la dette)
  await db.insert(erpAccountingPreEntryLines).values({
    preEntryId: entryId,
    accountingAccountId: accountFournisseur,
    debitAmount: amount,
    creditAmount: 0,
    label: `Règlement ${invoiceNumber}`,
    projectId: projectId || null,
    vendorId: vendorId || null,
    taxCodeId: null,
    createdAt: now,
    updatedAt: now,
  });
  
  // Crédit : Trésorerie (sortie de fonds)
  await db.insert(erpAccountingPreEntryLines).values({
    preEntryId: entryId,
    accountingAccountId: accountTresorerie,
    debitAmount: 0,
    creditAmount: amount,
    label: `Règlement ${invoiceNumber} - ${tresorerieName}`,
    projectId: projectId || null,
    vendorId: null,
    taxCodeId: null,
    createdAt: now,
    updatedAt: now,
  });
  
  return entryId;
}
