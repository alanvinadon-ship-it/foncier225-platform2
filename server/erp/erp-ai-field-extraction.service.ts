import { invokeLLM } from "../_core/llm";
import { getDb } from "../db";
import {
  erpAiDocFieldExtractions,
  erpAiDocumentExtractionFields,
  erpAiDocumentLineItems,
  erpAiDocumentApplyActions,
  erpAiDocumentJobs,
  erpAiOcrResults,
} from "../../drizzle/schema";
import { eq } from "drizzle-orm";

// ============================================================
// EXTRACTION PROMPTS PAR TYPE DE DOCUMENT
// ============================================================

const EXTRACTION_PROMPTS: Record<string, string> = {
  "Supplier Invoice": `Tu es un expert en extraction de données de factures fournisseur.
Extrais les champs suivants du texte OCR fourni :
- invoice_number (obligatoire)
- vendor_name (obligatoire)
- vendor_tax_id
- vendor_address
- invoice_date (obligatoire, format ISO 8601)
- due_date (format ISO 8601)
- currency (code ISO 4217, défaut XOF)
- subtotal_amount (montant HT en centimes)
- discount_amount (en centimes)
- tax_amount (en centimes)
- withholding_amount (en centimes)
- total_amount (obligatoire, montant TTC en centimes)
- purchase_order_reference
- delivery_note_reference
- payment_terms
Extrais aussi les lignes (line_items) avec : description, quantity, unit, unit_price, tax_rate, line_total.
Signale les champs obligatoires manquants et les incohérences.`,

  "Expense Receipt": `Tu es un expert en extraction de reçus de dépenses.
Extrais les champs suivants :
- receipt_number
- expense_date (obligatoire, format ISO 8601)
- vendor_or_beneficiary (obligatoire)
- description (obligatoire)
- amount (obligatoire, en centimes)
- currency (code ISO 4217, défaut XOF)
- tax_amount (en centimes)
- payment_method (cash, bank, mobile_money, cheque, card)
- probable_category
- probable_project
- probable_cost_center
Signale les champs obligatoires manquants.`,

  "Vendor Quote": `Tu es un expert en extraction de devis fournisseur.
Extrais les champs suivants :
- quote_number (obligatoire)
- vendor_name (obligatoire)
- quote_date (format ISO 8601)
- valid_until (format ISO 8601)
- currency (code ISO 4217, défaut XOF)
- subtotal_amount (en centimes)
- tax_amount (en centimes)
- total_amount (obligatoire, en centimes)
- delivery_delay
- payment_terms
Extrais aussi les lignes (line_items) avec : description, quantity, unit, unit_price, tax_rate, line_total.`,

  "Proforma Invoice": `Tu es un expert en extraction de factures proforma.
Extrais les mêmes champs qu'un devis fournisseur :
- quote_number
- vendor_name (obligatoire)
- quote_date (format ISO 8601)
- valid_until (format ISO 8601)
- currency (code ISO 4217, défaut XOF)
- subtotal_amount (en centimes)
- tax_amount (en centimes)
- total_amount (obligatoire, en centimes)
- delivery_delay
- payment_terms
Extrais aussi les lignes (line_items).`,

  "Purchase Order": `Tu es un expert en extraction de bons de commande.
Extrais les champs suivants :
- po_number (obligatoire)
- vendor_name (obligatoire)
- project_reference
- order_date (obligatoire, format ISO 8601)
- expected_delivery_date (format ISO 8601)
- currency (code ISO 4217, défaut XOF)
- subtotal_amount (en centimes)
- tax_amount (en centimes)
- total_amount (obligatoire, en centimes)
Extrais aussi les lignes (line_items) avec : description, quantity, unit, unit_price, tax_rate, line_total.`,

  "Delivery Note": `Tu es un expert en extraction de bons de livraison.
Extrais les champs suivants :
- delivery_note_number (obligatoire)
- vendor_name (obligatoire)
- delivery_date (obligatoire, format ISO 8601)
- purchase_order_reference
- project_reference
- observations
Extrais aussi les lignes livrées (line_items) avec : description, quantity, unit, observations.`,

  "Payment Proof": `Tu es un expert en extraction de preuves de paiement.
Extrais les champs suivants :
- payment_reference
- payment_date (obligatoire, format ISO 8601)
- payer_name
- beneficiary_name (obligatoire)
- amount (obligatoire, en centimes)
- currency (code ISO 4217, défaut XOF)
- payment_method (virement, chèque, mobile_money, espèces)
- bank_name
- account_number (sensible)
- invoice_reference`,

  "Tax Document": `Tu es un expert en extraction de documents fiscaux.
Extrais les champs suivants :
- document_number
- document_type (quittance, avis d'imposition, attestation fiscale)
- tax_period
- taxpayer_name (obligatoire)
- taxpayer_id (sensible)
- tax_type
- amount (en centimes)
- currency (défaut XOF)
- issue_date (format ISO 8601)
- issuing_authority`,

  "Certification": `Tu es un expert en extraction de certifications.
Extrais les champs suivants :
- document_number (obligatoire)
- document_type
- issuing_authority (obligatoire)
- beneficiary (obligatoire)
- issue_date (obligatoire, format ISO 8601)
- expiry_date (format ISO 8601)
- status
- domain
- observations`,

  "Permit": `Tu es un expert en extraction de permis.
Extrais les champs suivants :
- document_number (obligatoire)
- permit_type (permis de construire, permis d'habiter, etc.)
- issuing_authority (obligatoire)
- beneficiary (obligatoire)
- issue_date (obligatoire, format ISO 8601)
- expiry_date (format ISO 8601)
- status
- location
- observations`,

  "Contract": `Tu es un expert en extraction de contrats.
Extrais les champs suivants :
- contract_number
- parties (obligatoire, tableau des parties)
- subject (obligatoire)
- contract_amount (en centimes)
- currency (défaut XOF)
- signature_date (format ISO 8601)
- start_date (format ISO 8601)
- end_date (format ISO 8601)
- payment_terms
- penalties
- obligations
- key_clauses
- risks`,

  "Real Estate Contract": `Tu es un expert en extraction de contrats immobiliers.
Extrais les champs suivants :
- document_type (vente, bail, promesse)
- owner_name (obligatoire)
- buyer_name
- document_number
- parcel_reference
- lot_number
- block_number
- surface_area
- location (obligatoire)
- issue_date (format ISO 8601)
- issuing_authority
- notary_name
- amount (en centimes)
- currency (défaut XOF)
- observations
- possible_inconsistencies`,

  "Identity Document": `Tu es un expert en extraction de documents d'identité.
Extrais les champs suivants (tous sensibles) :
- document_type (CNI, passeport, permis de conduire)
- document_number (obligatoire, sensible)
- full_name (obligatoire, sensible)
- date_of_birth (format ISO 8601, sensible)
- place_of_birth (sensible)
- nationality
- issue_date (format ISO 8601)
- expiry_date (format ISO 8601)
- issuing_authority`,

  "Land Title": `Tu es un expert en extraction de titres fonciers.
Extrais les champs suivants :
- title_number (obligatoire)
- owner_name (obligatoire)
- parcel_reference
- lot_number
- block_number
- surface_area
- location (obligatoire)
- issue_date (format ISO 8601)
- issuing_authority
- encumbrances
- observations`,

  "ACD": `Tu es un expert en extraction d'Arrêtés de Concession Définitive (ACD).
Extrais les champs suivants :
- acd_number (obligatoire)
- beneficiary (obligatoire)
- parcel_reference
- lot_number
- surface_area
- location (obligatoire)
- issue_date (format ISO 8601)
- issuing_authority
- conditions
- observations`,

  "Notary Document": `Tu es un expert en extraction de documents notariés.
Extrais les champs suivants :
- document_type (acte de vente, procuration, attestation)
- document_number
- notary_name (obligatoire)
- parties (obligatoire)
- subject
- date (format ISO 8601)
- amount (en centimes si applicable)
- currency (défaut XOF)
- parcel_reference
- observations`,
};

// ============================================================
// FIELD DEFINITIONS PAR TYPE DE DOCUMENT
// ============================================================

interface FieldDef {
  key: string;
  label: string;
  type: "string" | "number" | "amount" | "date" | "currency" | "percentage" | "boolean" | "array" | "object";
  required: boolean;
  sensitive: boolean;
}

const FIELD_DEFINITIONS: Record<string, FieldDef[]> = {
  "Supplier Invoice": [
    { key: "invoice_number", label: "N° Facture", type: "string", required: true, sensitive: false },
    { key: "vendor_name", label: "Fournisseur", type: "string", required: true, sensitive: false },
    { key: "vendor_tax_id", label: "N° Fiscal Fournisseur", type: "string", required: false, sensitive: true },
    { key: "vendor_address", label: "Adresse Fournisseur", type: "string", required: false, sensitive: false },
    { key: "invoice_date", label: "Date Facture", type: "date", required: true, sensitive: false },
    { key: "due_date", label: "Date Échéance", type: "date", required: false, sensitive: false },
    { key: "currency", label: "Devise", type: "currency", required: false, sensitive: false },
    { key: "subtotal_amount", label: "Montant HT", type: "amount", required: false, sensitive: false },
    { key: "discount_amount", label: "Remise", type: "amount", required: false, sensitive: false },
    { key: "tax_amount", label: "Montant TVA", type: "amount", required: false, sensitive: false },
    { key: "withholding_amount", label: "Retenue", type: "amount", required: false, sensitive: false },
    { key: "total_amount", label: "Montant TTC", type: "amount", required: true, sensitive: false },
    { key: "purchase_order_reference", label: "Réf. Bon de Commande", type: "string", required: false, sensitive: false },
    { key: "delivery_note_reference", label: "Réf. Bon de Livraison", type: "string", required: false, sensitive: false },
    { key: "payment_terms", label: "Conditions de Paiement", type: "string", required: false, sensitive: false },
  ],
  "Expense Receipt": [
    { key: "receipt_number", label: "N° Reçu", type: "string", required: false, sensitive: false },
    { key: "expense_date", label: "Date Dépense", type: "date", required: true, sensitive: false },
    { key: "vendor_or_beneficiary", label: "Bénéficiaire", type: "string", required: true, sensitive: false },
    { key: "description", label: "Description", type: "string", required: true, sensitive: false },
    { key: "amount", label: "Montant", type: "amount", required: true, sensitive: false },
    { key: "currency", label: "Devise", type: "currency", required: false, sensitive: false },
    { key: "tax_amount", label: "Montant TVA", type: "amount", required: false, sensitive: false },
    { key: "payment_method", label: "Mode de Paiement", type: "string", required: false, sensitive: false },
    { key: "probable_category", label: "Catégorie Suggérée", type: "string", required: false, sensitive: false },
    { key: "probable_project", label: "Projet Suggéré", type: "string", required: false, sensitive: false },
    { key: "probable_cost_center", label: "Centre de Coût", type: "string", required: false, sensitive: false },
  ],
  "Certification": [
    { key: "document_number", label: "N° Document", type: "string", required: true, sensitive: false },
    { key: "document_type", label: "Type", type: "string", required: false, sensitive: false },
    { key: "issuing_authority", label: "Autorité Émettrice", type: "string", required: true, sensitive: false },
    { key: "beneficiary", label: "Bénéficiaire", type: "string", required: true, sensitive: false },
    { key: "issue_date", label: "Date Émission", type: "date", required: true, sensitive: false },
    { key: "expiry_date", label: "Date Expiration", type: "date", required: false, sensitive: false },
    { key: "status", label: "Statut", type: "string", required: false, sensitive: false },
    { key: "domain", label: "Domaine", type: "string", required: false, sensitive: false },
    { key: "observations", label: "Observations", type: "string", required: false, sensitive: false },
  ],
};

// ============================================================
// SERVICE PRINCIPAL D'EXTRACTION
// ============================================================

export async function extractFieldsFromDocument(
  jobId: number,
  userId: number
): Promise<{ extractionId: number; fieldsCount: number; linesCount: number; confidence: number }> {
  const db = (await getDb())!;

  // 1. Récupérer le job et le texte OCR
  const [job] = await db.select().from(erpAiDocumentJobs).where(eq(erpAiDocumentJobs.id, jobId));
  if (!job) throw new Error("Job introuvable");

  const documentType = job.confirmedDocumentType || job.detectedDocumentType;
  if (!documentType) throw new Error("Type de document non déterminé. Classifiez d'abord le document.");

  // Récupérer le texte OCR
  const [ocrResult] = await db.select().from(erpAiOcrResults).where(eq(erpAiOcrResults.documentJobId, jobId));
  if (!ocrResult || !ocrResult.rawText) throw new Error("Texte OCR non disponible. Lancez l'OCR d'abord.");

  const ocrText = ocrResult.cleanedText || ocrResult.rawText;

  // 2. Construire le prompt d'extraction
  const extractionPrompt = EXTRACTION_PROMPTS[documentType] || buildGenericPrompt(documentType);

  const systemPrompt = `${extractionPrompt}

RÈGLES STRICTES :
1. Ne jamais inventer un champ absent du document.
2. Retourner null si un champ n'est pas visible dans le texte.
3. Toujours fournir un score de confiance entre 0 et 100 pour chaque champ.
4. Signaler les champs obligatoires manquants dans validation_errors.
5. Signaler les incohérences (ex: total != somme des lignes).
6. Les montants doivent être en centimes (1 FCFA = 100 centimes, donc 5000 FCFA = 500000).
7. Les dates doivent être au format ISO 8601 (YYYY-MM-DD).
8. La devise par défaut est XOF (Franc CFA).

Retourne un JSON strict avec la structure suivante :
{
  "document_type": "...",
  "confidence_score": 0-100,
  "summary": "...",
  "extracted_fields": {
    "field_key": {
      "value": "valeur brute",
      "normalized_value": "valeur normalisée",
      "confidence": 0-100,
      "required": true/false
    }
  },
  "line_items": [
    {
      "description": "...",
      "quantity": number,
      "unit": "...",
      "unit_price": number (centimes),
      "tax_rate": number (pourcentage * 100),
      "line_total": number (centimes),
      "confidence": 0-100
    }
  ],
  "validation_errors": [
    {
      "field": "...",
      "severity": "High|Medium|Low",
      "message": "..."
    }
  ],
  "recommended_actions": ["..."]
}`;

  // 3. Appeler le LLM
  const response = await invokeLLM({
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: `Voici le texte OCR du document à analyser :\n\n${ocrText.substring(0, 15000)}` },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "document_extraction",
        strict: false,
        schema: {
          type: "object",
          properties: {
            document_type: { type: "string" },
            confidence_score: { type: "number" },
            summary: { type: "string" },
            extracted_fields: { type: "object" },
            line_items: { type: "array" },
            validation_errors: { type: "array" },
            recommended_actions: { type: "array" },
          },
        },
      },
    },
  });

  const content = response.choices?.[0]?.message?.content;
  if (!content) throw new Error("Le LLM n'a pas retourné de réponse.");

  let extractedData: any;
  try {
    extractedData = JSON.parse(typeof content === "string" ? content : JSON.stringify(content));
  } catch {
    throw new Error("Réponse LLM invalide (JSON malformé).");
  }

  // 4. Normaliser et sauvegarder l'extraction
  const confidenceScore = Math.round(extractedData.confidence_score || 0);

  const [insertion] = await db.insert(erpAiDocFieldExtractions).values({
    documentJobId: jobId,
    documentId: job.documentId,
    documentType,
    sourceModule: job.sourceModule,
    sourceType: job.sourceType,
    sourceId: job.sourceId,
    extractedDataJson: extractedData,
    normalizedDataJson: normalizeExtractedData(extractedData, documentType),
    validationErrorsJson: extractedData.validation_errors || [],
    confidenceScore,
    status: "suggested",
    createdBy: userId,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  });

  const extractionId = (insertion as any).insertId;

  // 5. Sauvegarder les champs individuels
  const fields = extractedData.extracted_fields || {};
  const fieldDefs = FIELD_DEFINITIONS[documentType] || [];
  let fieldsCount = 0;

  for (const [key, fieldData] of Object.entries(fields)) {
    const fd = fieldDefs.find((f) => f.key === key);
    const data = fieldData as any;
    if (data.value === null && data.normalized_value === null) continue;

    await db.insert(erpAiDocumentExtractionFields).values({
      documentExtractionId: extractionId,
      fieldKey: key,
      fieldLabel: fd?.label || key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
      fieldType: fd?.type || "string",
      rawValue: data.value != null ? String(data.value) : null,
      normalizedValue: data.normalized_value != null ? String(data.normalized_value) : null,
      confidenceScore: Math.round(data.confidence || 0),
      isRequired: (fd?.required || data.required) ? 1 : 0,
      isSensitive: fd?.sensitive ? 1 : 0,
      isCorrected: 0,
      status: "suggested",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
    fieldsCount++;
  }

  // 6. Sauvegarder les lignes
  const lineItems = extractedData.line_items || [];
  let linesCount = 0;

  for (let i = 0; i < lineItems.length; i++) {
    const line = lineItems[i];
    await db.insert(erpAiDocumentLineItems).values({
      documentExtractionId: extractionId,
      lineNumber: i + 1,
      description: line.description || null,
      itemCode: line.item_code || null,
      quantity: line.quantity != null ? Math.round(line.quantity) : null,
      unit: line.unit || null,
      unitPrice: line.unit_price != null ? Math.round(line.unit_price) : null,
      discountRate: line.discount_rate != null ? Math.round(line.discount_rate) : null,
      taxRate: line.tax_rate != null ? Math.round(line.tax_rate) : null,
      taxAmount: line.tax_amount != null ? Math.round(line.tax_amount) : null,
      lineTotal: line.line_total != null ? Math.round(line.line_total) : null,
      rawLineJson: line,
      confidenceScore: Math.round(line.confidence || 0),
      status: "suggested",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
    linesCount++;
  }

  return { extractionId, fieldsCount, linesCount, confidence: confidenceScore };
}

// ============================================================
// NORMALISATION DES DONNÉES
// ============================================================

function normalizeExtractedData(data: any, documentType: string): any {
  const normalized: any = { document_type: documentType };
  const fields = data.extracted_fields || {};

  for (const [key, fieldData] of Object.entries(fields)) {
    const fd = fieldData as any;
    if (fd.normalized_value != null) {
      normalized[key] = fd.normalized_value;
    } else if (fd.value != null) {
      normalized[key] = fd.value;
    }
  }

  if (data.line_items?.length) {
    normalized.line_items = data.line_items.map((l: any) => ({
      description: l.description,
      quantity: l.quantity,
      unit: l.unit,
      unit_price: l.unit_price,
      tax_rate: l.tax_rate,
      line_total: l.line_total,
    }));
  }

  return normalized;
}

function buildGenericPrompt(documentType: string): string {
  return `Tu es un expert en extraction de données de documents de type "${documentType}".
Extrais tous les champs pertinents visibles dans le texte OCR.
Pour chaque champ, fournis la valeur brute, la valeur normalisée et un score de confiance.
Signale les incohérences et les champs manquants.`;
}

// ============================================================
// APPLICATION VERS MODULES ERP (BROUILLONS UNIQUEMENT)
// ============================================================

export async function applyExtractionToErp(
  extractionId: number,
  actionType: string,
  userId: number
): Promise<{ actionId: number; targetId: number | null; targetModule: string }> {
  const db = (await getDb())!;

  // Vérifier que l'extraction est validée
  const [extraction] = await db.select().from(erpAiDocFieldExtractions).where(eq(erpAiDocFieldExtractions.id, extractionId));
  if (!extraction) throw new Error("Extraction introuvable");
  if (extraction.status !== "validated") throw new Error("L'extraction doit être validée avant application ERP.");

  const normalizedData = extraction.normalizedDataJson as any;
  const documentType = extraction.documentType;
  let targetModule = "";
  let targetType = "";
  let targetId: number | null = null;

  // Créer l'action d'application
  const [actionInsert] = await db.insert(erpAiDocumentApplyActions).values({
    documentExtractionId: extractionId,
    targetModule: actionType,
    targetType: documentType,
    actionType,
    status: "pending",
    appliedBy: userId,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  });

  const actionId = (actionInsert as any).insertId;

  try {
    switch (actionType) {
      case "create_draft_invoice":
        targetModule = "erp_invoices";
        targetType = "invoice";
        targetId = await createDraftInvoice(normalizedData, userId);
        break;
      case "create_draft_expense":
        targetModule = "erp_expenses";
        targetType = "expense";
        targetId = await createDraftExpense(normalizedData, userId);
        break;
      case "create_vendor_quote":
        targetModule = "erp_rfqs";
        targetType = "rfq_vendor_response";
        targetId = null; // Placeholder - requires RFQ context
        break;
      case "create_goods_receipt_draft":
        targetModule = "erp_purchases";
        targetType = "goods_receipt";
        targetId = null; // Placeholder
        break;
      case "create_accounting_pre_entry_draft":
        targetModule = "erp_accounting";
        targetType = "pre_entry";
        targetId = await createDraftAccountingPreEntry(normalizedData, userId);
        break;
      case "update_certification_draft":
        targetModule = "erp_compliance";
        targetType = "certification";
        targetId = null; // Placeholder
        break;
      case "create_compliance_alert":
        targetModule = "erp_compliance";
        targetType = "compliance_alert";
        targetId = null; // Placeholder
        break;
      default:
        throw new Error(`Action non supportée: ${actionType}`);
    }

    // Mettre à jour l'action comme appliquée
    await db.update(erpAiDocumentApplyActions)
      .set({ status: "applied", targetModule, targetType, targetId, appliedAt: Date.now(), updatedAt: Date.now() })
      .where(eq(erpAiDocumentApplyActions.id, actionId));

    // Mettre à jour l'extraction comme appliquée
    await db.update(erpAiDocFieldExtractions)
      .set({ status: "applied", updatedAt: Date.now() })
      .where(eq(erpAiDocFieldExtractions.id, extractionId));

    return { actionId, targetId, targetModule };
  } catch (error: any) {
    await db.update(erpAiDocumentApplyActions)
      .set({ status: "failed", errorMessage: error.message, updatedAt: Date.now() })
      .where(eq(erpAiDocumentApplyActions.id, actionId));
    throw error;
  }
}

// ============================================================
// CRÉATEURS DE BROUILLONS ERP
// ============================================================

async function createDraftInvoice(data: any, userId: number): Promise<number> {
  const db = (await getDb())!;
  const { erpInvoices } = await import("../../drizzle/schema");

  const now = Date.now();
  const invoiceNumber = `IA-INV-${Date.now().toString(36).toUpperCase()}`;

  const [result] = await db.insert(erpInvoices).values({
    invoiceNumber: data.invoice_number || invoiceNumber,
    type: "standard",
    status: "draft",
    issueDate: data.invoice_date ? new Date(data.invoice_date).getTime() : now,
    dueDate: data.due_date ? new Date(data.due_date).getTime() : now + 30 * 24 * 3600 * 1000,
    subtotal: data.subtotal_amount || 0,
    taxRate: 1800,
    taxAmount: data.tax_amount || 0,
    totalAmount: data.total_amount || 0,
    paidAmount: 0,
    reference: data.purchase_order_reference || null,
    notes: `[Créé par IA] ${data.vendor_name || ""}`,
    currency: data.currency || "XOF",
    createdBy: userId,
    createdAt: now,
    updatedAt: now,
  });

  return (result as any).insertId;
}

async function createDraftExpense(data: any, userId: number): Promise<number> {
  const db = (await getDb())!;
  const { erpExpenses } = await import("../../drizzle/schema");

  const now = Date.now();
  const expenseNumber = `IA-EXP-${Date.now().toString(36).toUpperCase()}`;

  const [result] = await db.insert(erpExpenses).values({
    expenseNumber,
    expenseDate: data.expense_date ? new Date(data.expense_date).getTime() : now,
    description: data.description || "[Créé par IA]",
    subtotalAmount: data.amount || 0,
    taxAmount: data.tax_amount || 0,
    totalAmount: data.amount || 0,
    currency: data.currency || "XOF",
    paymentMethod: data.payment_method || null,
    status: "draft",
    createdBy: userId,
    createdAt: now,
    updatedAt: now,
  });

  return (result as any).insertId;
}

async function createDraftAccountingPreEntry(data: any, userId: number): Promise<number> {
  const db = (await getDb())!;
  const { erpAccountingPreEntries } = await import("../../drizzle/schema");

  const now = Date.now();
  const amount = data.total_amount || data.amount || 0;

  const [result] = await db.insert(erpAccountingPreEntries).values({
    sourceType: "invoice",
    sourceId: 0,
    entryDate: now,
    journalCode: "HA",
    description: `[IA] ${data.vendor_name || data.vendor_or_beneficiary || "Document IA"}`,
    status: "draft",
    totalDebit: amount,
    totalCredit: amount,
    createdBy: userId,
    createdAt: now,
    updatedAt: now,
  });

  return (result as any).insertId;
}

// ============================================================
// HELPERS PUBLICS
// ============================================================

export function getFieldDefinitions(documentType: string): FieldDef[] {
  return FIELD_DEFINITIONS[documentType] || [];
}

export function getSupportedDocumentTypes(): string[] {
  return Object.keys(EXTRACTION_PROMPTS);
}

export function getRecommendedActions(documentType: string): string[] {
  const actions: Record<string, string[]> = {
    "Supplier Invoice": ["create_draft_invoice", "create_accounting_pre_entry_draft"],
    "Expense Receipt": ["create_draft_expense", "create_accounting_pre_entry_draft"],
    "Vendor Quote": ["create_vendor_quote"],
    "Proforma Invoice": ["create_vendor_quote"],
    "Purchase Order": ["create_goods_receipt_draft"],
    "Delivery Note": ["create_goods_receipt_draft"],
    "Certification": ["update_certification_draft", "create_compliance_alert"],
    "Permit": ["update_certification_draft", "create_compliance_alert"],
    "Contract": ["create_compliance_alert"],
    "Payment Proof": ["create_accounting_pre_entry_draft"],
    "Tax Document": ["create_accounting_pre_entry_draft"],
  };
  return actions[documentType] || [];
}
