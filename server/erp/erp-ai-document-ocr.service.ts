/**
 * ERP AI Document OCR & Classification Service — Sprint IA 2 Lot 1
 * 
 * Services:
 * - OCR via LLM Vision (extraction texte depuis PDF/images)
 * - Nettoyage texte OCR
 * - Classification documentaire LLM (30+ types)
 */

import { invokeLLM } from "../_core/llm";

// ─── DOCUMENT TYPES TAXONOMY ─────────────────────────────────────────────────

export const DOCUMENT_TYPES = {
  // Finance / Achats
  "Supplier Invoice": { module: "Invoices", category: "Finance" },
  "Customer Invoice": { module: "Invoices", category: "Finance" },
  "Expense Receipt": { module: "Expenses", category: "Finance" },
  "Payment Proof": { module: "Finance", category: "Finance" },
  "Purchase Order": { module: "Purchases", category: "Finance" },
  "Delivery Note": { module: "Purchases", category: "Finance" },
  "Vendor Quote": { module: "RFQ", category: "Finance" },
  "Proforma Invoice": { module: "Invoices", category: "Finance" },
  "Contract": { module: "Documents", category: "Finance" },
  "Tax Document": { module: "Accounting", category: "Finance" },
  // Construction
  "Permit": { module: "Permits", category: "Construction" },
  "Certification": { module: "Certifications", category: "Construction" },
  "Safety Report": { module: "Safety", category: "Construction" },
  "Site Report": { module: "Projects", category: "Construction" },
  "Contractor Document": { module: "Suppliers", category: "Construction" },
  "Equipment Document": { module: "Equipment", category: "Construction" },
  "Material Delivery Document": { module: "Stock", category: "Construction" },
  // Immobilier / Foncier
  "Real Estate Contract": { module: "Real Estate", category: "Immobilier" },
  "Land Title": { module: "Real Estate", category: "Immobilier" },
  "ACD": { module: "Real Estate", category: "Immobilier" },
  "Identity Document": { module: "Documents", category: "Immobilier" },
  "Mandate": { module: "Real Estate", category: "Immobilier" },
  "Notary Document": { module: "Real Estate", category: "Immobilier" },
  "Customer Document": { module: "Clients", category: "Immobilier" },
  "Reservation Document": { module: "Real Estate", category: "Immobilier" },
  "Sales Agreement": { module: "Real Estate", category: "Immobilier" },
  // Général
  "Unknown": { module: "Documents", category: "Général" },
  "Other": { module: "Documents", category: "Général" },
} as const;

export type DocumentType = keyof typeof DOCUMENT_TYPES;

export const ALLOWED_MIME_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/jpg",
  "image/png",
];

export const BLOCKED_EXTENSIONS = [
  ".exe", ".bat", ".cmd", ".sh", ".ps1", ".vbs", ".js", ".mjs",
  ".py", ".rb", ".php", ".jar", ".dll", ".so", ".zip", ".rar",
  ".7z", ".tar", ".gz",
];

// ─── FILE VALIDATION ─────────────────────────────────────────────────────────

export function validateFile(fileName: string, mimeType: string, fileSize: number): { valid: boolean; error?: string } {
  // Check blocked extensions
  const lowerName = fileName.toLowerCase();
  for (const ext of BLOCKED_EXTENSIONS) {
    if (lowerName.endsWith(ext)) {
      return { valid: false, error: `Extension de fichier bloquée: ${ext}` };
    }
  }
  // Check double extension
  const parts = lowerName.split(".");
  if (parts.length > 2) {
    const lastTwo = parts.slice(-2);
    if (BLOCKED_EXTENSIONS.some(ext => lastTwo[0] === ext.replace(".", ""))) {
      return { valid: false, error: "Double extension suspecte détectée" };
    }
  }
  // Check mime type
  if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
    return { valid: false, error: `Type MIME non supporté: ${mimeType}. Formats acceptés: PDF, JPG, PNG` };
  }
  // Check file size (max 20MB)
  const MAX_SIZE = 20 * 1024 * 1024;
  if (fileSize > MAX_SIZE) {
    return { valid: false, error: `Fichier trop volumineux (${(fileSize / 1024 / 1024).toFixed(1)} MB). Maximum: 20 MB` };
  }
  return { valid: true };
}

// ─── TEXT CLEANING ───────────────────────────────────────────────────────────

export function cleanOcrText(rawText: string): string {
  if (!rawText || rawText.trim().length === 0) return "";
  
  let cleaned = rawText;
  // Remove null bytes and control characters (keep newlines and tabs)
  cleaned = cleaned.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "");
  // Normalize whitespace (multiple spaces → single)
  cleaned = cleaned.replace(/[ \t]+/g, " ");
  // Normalize line breaks
  cleaned = cleaned.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  // Remove excessive blank lines (3+ → 2)
  cleaned = cleaned.replace(/\n{3,}/g, "\n\n");
  // Trim each line
  cleaned = cleaned.split("\n").map(line => line.trim()).join("\n");
  // Final trim
  cleaned = cleaned.trim();
  
  return cleaned;
}

export function isTextEmpty(text: string | null | undefined): boolean {
  if (!text) return true;
  const cleaned = text.replace(/\s+/g, "");
  return cleaned.length < 10;
}

// ─── OCR SERVICE (LLM VISION) ────────────────────────────────────────────────

export interface OcrResult {
  rawText: string;
  cleanedText: string;
  pagesCount: number;
  pageResults: Array<{
    pageNumber: number;
    text: string;
    confidence: number;
  }>;
  confidenceScore: number;
  processingTimeMs: number;
  language?: string;
}

export async function performOcr(fileUrl: string, mimeType: string): Promise<OcrResult> {
  const startTime = Date.now();
  
  const systemPrompt = `Tu es un système OCR professionnel. Extrais TOUT le texte visible du document fourni.

Règles:
- Extrais le texte exactement comme il apparaît (pas de reformulation)
- Conserve la structure (paragraphes, listes, tableaux)
- Pour les tableaux, utilise des séparateurs | entre colonnes
- Indique les numéros de page si le document est multi-pages avec [PAGE X]
- Si une partie est illisible, indique [ILLISIBLE]
- Ne commente pas, n'interprète pas, extrais uniquement le texte

Retourne le texte brut extrait, rien d'autre.`;

  const contentType = mimeType === "application/pdf" ? "application/pdf" : mimeType;
  
  const response = await invokeLLM({
    messages: [
      { role: "system", content: systemPrompt },
      {
        role: "user",
        content: [
          { type: "text", text: "Extrais tout le texte de ce document:" },
          {
            type: "file_url" as any,
            file_url: {
              url: fileUrl,
              mime_type: contentType as any,
            },
          },
        ],
      },
    ],
  });

  const rawContent = response.choices?.[0]?.message?.content;
  const rawText = typeof rawContent === "string" ? rawContent : (Array.isArray(rawContent) ? rawContent.filter((c): c is { type: "text"; text: string } => c.type === "text").map(c => c.text).join("\n") : "");
  const cleanedText = cleanOcrText(rawText);
  const processingTimeMs = Date.now() - startTime;

  // Parse pages
  const pageResults: OcrResult["pageResults"] = [];
  const pageMatches = rawText.split(/\[PAGE\s*(\d+)\]/i);
  
  if (pageMatches.length > 1) {
    for (let i = 1; i < pageMatches.length; i += 2) {
      const pageNum = parseInt(pageMatches[i], 10);
      const pageText = (pageMatches[i + 1] || "").trim();
      pageResults.push({
        pageNumber: pageNum,
        text: pageText,
        confidence: pageText.includes("[ILLISIBLE]") ? 60 : 85,
      });
    }
  } else {
    pageResults.push({
      pageNumber: 1,
      text: rawText,
      confidence: rawText.includes("[ILLISIBLE]") ? 60 : 85,
    });
  }

  // Estimate confidence
  const hasIllisible = rawText.includes("[ILLISIBLE]");
  const textLength = cleanedText.length;
  let confidenceScore = 85;
  if (hasIllisible) confidenceScore -= 20;
  if (textLength < 50) confidenceScore -= 15;
  if (textLength > 200) confidenceScore += 5;
  confidenceScore = Math.max(10, Math.min(99, confidenceScore));

  return {
    rawText,
    cleanedText,
    pagesCount: pageResults.length,
    pageResults,
    confidenceScore,
    processingTimeMs,
    language: "fr",
  };
}

// ─── CLASSIFICATION SERVICE (LLM) ───────────────────────────────────────────

export interface ClassificationResult {
  documentType: DocumentType;
  confidenceScore: number;
  recommendedModule: string;
  classificationReason: string;
  alternativeTypes: Array<{
    documentType: string;
    confidenceScore: number;
    reason: string;
  }>;
  needsHumanReview: boolean;
}

export async function classifyDocument(ocrText: string): Promise<ClassificationResult> {
  // Limit text sent to LLM (max 4000 chars)
  const truncatedText = ocrText.length > 4000 ? ocrText.substring(0, 4000) + "\n[... texte tronqué]" : ocrText;
  
  const documentTypesList = Object.keys(DOCUMENT_TYPES).join(", ");
  
  const systemPrompt = `Tu es un système de classification documentaire IA pour un ERP Construction et Foncier en Côte d'Ivoire.

Types de documents possibles:
${documentTypesList}

Règles strictes:
- Ne JAMAIS inventer un type qui n'est pas dans la liste
- Retourner "Unknown" si doute important
- confidence_score entre 0.0 et 1.0
- Toujours proposer une raison claire
- Toujours indiquer si revue humaine nécessaire
- Si texte OCR insuffisant ou vide, retourner Unknown avec needs_human_review: true

Seuils:
- >= 0.85 : classification confiante
- 0.60 à 0.85 : Needs Review
- < 0.60 : Unknown ou Needs Review

Retourne UNIQUEMENT un JSON valide (pas de markdown, pas de commentaire).`;

  const response = await invokeLLM({
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: `Classifie ce document à partir du texte OCR suivant:\n\n${truncatedText}` },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "document_classification",
        strict: true,
        schema: {
          type: "object",
          properties: {
            document_type: { type: "string", description: "Type de document détecté" },
            confidence_score: { type: "number", description: "Score de confiance entre 0 et 1" },
            recommended_module: { type: "string", description: "Module ERP recommandé" },
            classification_reason: { type: "string", description: "Raison de la classification" },
            alternative_types: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  document_type: { type: "string" },
                  confidence_score: { type: "number" },
                  reason: { type: "string" },
                },
                required: ["document_type", "confidence_score", "reason"],
                additionalProperties: false,
              },
            },
            needs_human_review: { type: "boolean", description: "Si revue humaine nécessaire" },
          },
          required: ["document_type", "confidence_score", "recommended_module", "classification_reason", "alternative_types", "needs_human_review"],
          additionalProperties: false,
        },
      },
    },
  });

  const rawContent2 = response.choices?.[0]?.message?.content;
  const content = typeof rawContent2 === "string" ? rawContent2 : (Array.isArray(rawContent2) ? rawContent2.filter((c): c is { type: "text"; text: string } => c.type === "text").map(c => c.text).join("") : "{}");
  let parsed: any;
  try {
    parsed = JSON.parse(content);
  } catch {
    return {
      documentType: "Unknown",
      confidenceScore: 0,
      recommendedModule: "Documents",
      classificationReason: "Erreur de parsing de la réponse LLM",
      alternativeTypes: [],
      needsHumanReview: true,
    };
  }

  // Validate document type
  const detectedType = parsed.document_type as string;
  const validType = Object.keys(DOCUMENT_TYPES).includes(detectedType) ? detectedType as DocumentType : "Unknown";
  const moduleInfo = DOCUMENT_TYPES[validType];

  return {
    documentType: validType,
    confidenceScore: Math.round((parsed.confidence_score || 0) * 100),
    recommendedModule: parsed.recommended_module || moduleInfo.module,
    classificationReason: parsed.classification_reason || "Non spécifié",
    alternativeTypes: (parsed.alternative_types || []).map((alt: any) => ({
      documentType: alt.document_type || "Unknown",
      confidenceScore: Math.round((alt.confidence_score || 0) * 100),
      reason: alt.reason || "",
    })),
    needsHumanReview: parsed.needs_human_review ?? true,
  };
}

// ─── JOB NUMBER GENERATOR ────────────────────────────────────────────────────

export function generateJobNumber(): string {
  const now = new Date();
  const y = now.getFullYear().toString().slice(-2);
  const m = (now.getMonth() + 1).toString().padStart(2, "0");
  const d = now.getDate().toString().padStart(2, "0");
  const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `DOC-${y}${m}${d}-${rand}`;
}
