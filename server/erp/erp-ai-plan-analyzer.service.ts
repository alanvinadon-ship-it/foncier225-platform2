/**
 * erp-ai-plan-analyzer.service.ts
 *
 * Service d'analyse IA de plans de construction par LLM vision.
 * Détecte les éléments structurels, extrait les dimensions, évalue la confiance.
 * Utilise invokeLLM avec ImageContent pour l'analyse visuelle.
 *
 * Sprint IA Construction
 */
import { invokeLLM, type InvokeResult } from "../_core/llm";
import { getDb } from "../db";
import {
  erpAiPlanAnalyses,
  erpAiPlanElements,
  erpAiEngineeringChecks,
} from "../../drizzle/schema";
import { eq } from "drizzle-orm";

// --- Types ---
export interface PlanAnalysisInput {
  analysisId: number;
  fileUrl: string;
  fileType: string;
  planType?: string;
  scaleConfirmed?: string;
}

export interface DetectedElement {
  elementType: string;
  elementLabel: string;
  floorLevel?: string;
  zone?: string;
  dimensions: {
    length?: number;
    width?: number;
    height?: number;
    area?: number;
    volume?: number;
    thickness?: number;
    diameter?: number;
    spacing?: number;
  };
  unit: string;
  confidenceScore: number;
  coordinates?: { x: number; y: number; w: number; h: number };
}

export interface EngineeringCheckResult {
  checkType: string;
  checkName: string;
  description: string;
  severity: "info" | "low" | "medium" | "high" | "critical";
  status: "passed" | "warning" | "failed" | "needs_review";
  detectedIssue?: string;
  recommendation?: string;
  confidenceScore: number;
  requiresEngineerValidation: boolean;
}

export interface PlanAnalysisResult {
  planType: string;
  scaleDetected?: string;
  floorLevel?: string;
  hypotheses: string[];
  elements: DetectedElement[];
  engineeringChecks: EngineeringCheckResult[];
  overallConfidence: number;
  aiDisclaimer: string;
}

// --- JSON Schema for structured LLM response ---
const PLAN_ANALYSIS_SCHEMA = {
  name: "plan_analysis_result",
  strict: true,
  schema: {
    type: "object",
    properties: {
      planType: {
        type: "string",
        enum: ["architectural", "structural", "plumbing", "electrical", "foundation", "reinforcement", "vrd", "mixed", "unknown"],
        description: "Type de plan détecté",
      },
      scaleDetected: {
        type: ["string", "null"],
        description: "Échelle détectée (ex: 1:100, 1:50)",
      },
      floorLevel: {
        type: ["string", "null"],
        description: "Niveau du plan (RDC, R+1, R+2, sous-sol, toiture)",
      },
      hypotheses: {
        type: "array",
        items: { type: "string" },
        description: "Hypothèses prises par l'IA pour l'analyse",
      },
      elements: {
        type: "array",
        items: {
          type: "object",
          properties: {
            elementType: {
              type: "string",
              enum: ["wall", "column", "beam", "slab", "foundation", "footing", "door", "window", "stair", "room", "pipe", "electrical_point", "plumbing_point", "other"],
            },
            elementLabel: { type: "string" },
            floorLevel: { type: ["string", "null"] },
            zone: { type: ["string", "null"] },
            dimensions: {
              type: "object",
              properties: {
                length: { type: ["number", "null"] },
                width: { type: ["number", "null"] },
                height: { type: ["number", "null"] },
                area: { type: ["number", "null"] },
                volume: { type: ["number", "null"] },
                thickness: { type: ["number", "null"] },
                diameter: { type: ["number", "null"] },
                spacing: { type: ["number", "null"] },
              },
              required: ["length", "width", "height", "area", "volume", "thickness", "diameter", "spacing"],
              additionalProperties: false,
            },
            unit: { type: "string" },
            confidenceScore: { type: "number" },
            coordinates: {
              type: ["object", "null"],
              properties: {
                x: { type: "number" },
                y: { type: "number" },
                w: { type: "number" },
                h: { type: "number" },
              },
              required: ["x", "y", "w", "h"],
              additionalProperties: false,
            },
          },
          required: ["elementType", "elementLabel", "floorLevel", "zone", "dimensions", "unit", "confidenceScore", "coordinates"],
          additionalProperties: false,
        },
      },
      engineeringChecks: {
        type: "array",
        items: {
          type: "object",
          properties: {
            checkType: { type: "string", enum: ["foundation", "column", "beam", "slab", "masonry", "plumbing", "electrical", "safety"] },
            checkName: { type: "string" },
            description: { type: "string" },
            severity: { type: "string", enum: ["info", "low", "medium", "high", "critical"] },
            status: { type: "string", enum: ["passed", "warning", "failed", "needs_review"] },
            detectedIssue: { type: ["string", "null"] },
            recommendation: { type: ["string", "null"] },
            confidenceScore: { type: "number" },
            requiresEngineerValidation: { type: "boolean" },
          },
          required: ["checkType", "checkName", "description", "severity", "status", "detectedIssue", "recommendation", "confidenceScore", "requiresEngineerValidation"],
          additionalProperties: false,
        },
      },
      overallConfidence: { type: "number", description: "Score de confiance global 0-100" },
      aiDisclaimer: { type: "string" },
    },
    required: ["planType", "scaleDetected", "floorLevel", "hypotheses", "elements", "engineeringChecks", "overallConfidence", "aiDisclaimer"],
    additionalProperties: false,
  },
};

// --- System prompt ---
const SYSTEM_PROMPT = `Tu es un ingénieur en bâtiment et travaux publics (BTP) expert en analyse de plans de construction en Côte d'Ivoire et en Afrique de l'Ouest.

Ton rôle est d'analyser un plan de construction (image ou PDF) et de :
1. Identifier le type de plan (architectural, structural, fondation, plomberie, électrique, VRD, mixte)
2. Détecter l'échelle si visible
3. Identifier le niveau (RDC, R+1, R+2, sous-sol, toiture)
4. Lister TOUS les éléments structurels détectés avec leurs dimensions estimées
5. Effectuer des contrôles d'ingénierie de base

ÉLÉMENTS À DÉTECTER :
- Murs (porteurs et non-porteurs) : longueur, épaisseur, hauteur
- Poteaux : section (largeur x profondeur), hauteur
- Poutres : section (largeur x hauteur), portée
- Dalles : surface, épaisseur
- Fondations/Semelles : dimensions, profondeur
- Portes : dimensions, type
- Fenêtres : dimensions, type
- Escaliers : dimensions, nombre de marches
- Pièces/Zones : surface, destination

CONTRÔLES D'INGÉNIERIE :
- Fondations : profondeur minimale (≥0.80m en sol normal), largeur vs charge
- Poteaux : section minimale (20x20cm R+1, 25x25cm R+2+), espacement max 5m
- Poutres : hauteur ≥ portée/10, largeur ≥ hauteur/3
- Dalles : épaisseur ≥ portée/25 (plancher), ≥ portée/30 (toiture)
- Murs : épaisseur min 15cm (porteur), 10cm (cloison)
- Sécurité : issues de secours, ventilation, garde-corps

RÈGLES IMPORTANTES :
- Toutes les dimensions en mètres (m) sauf indication contraire
- Score de confiance 0-100 pour chaque élément
- Si une dimension n'est pas lisible, mettre null et réduire la confiance
- Toujours mentionner les hypothèses prises
- Le disclaimer IA est OBLIGATOIRE : rappeler que l'analyse est indicative et nécessite validation par un ingénieur qualifié

CONTEXTE CÔTE D'IVOIRE :
- Normes de construction : DTU français adaptés + normes locales
- Matériaux courants : parpaings 15/20, ciment CPA 45, fer HA (6-20mm)
- Sol : latérite, argile, sable selon zone
- Climat tropical : protection pluie, ventilation naturelle importante`;

/**
 * Analyse un plan de construction via LLM vision
 */
export async function analyzePlan(input: PlanAnalysisInput): Promise<PlanAnalysisResult> {
  const db = (await getDb())!;

  // Mettre à jour le statut en "analyzing"
  await db.update(erpAiPlanAnalyses)
    .set({ analysisStatus: "analyzing", updatedAt: Date.now() })
    .where(eq(erpAiPlanAnalyses.id, input.analysisId));

  try {
    const userPrompt = buildUserPrompt(input);

    const response: InvokeResult = await invokeLLM({
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: [
            { type: "image_url", image_url: { url: input.fileUrl, detail: "high" } },
            { type: "text", text: userPrompt },
          ],
        },
      ],
      response_format: {
        type: "json_schema",
        json_schema: PLAN_ANALYSIS_SCHEMA,
      },
    });

    const rawContent = response.choices[0]?.message?.content;
    const contentStr = typeof rawContent === "string" ? rawContent : JSON.stringify(rawContent);
    const result: PlanAnalysisResult = JSON.parse(contentStr);

    // Sauvegarder les résultats en DB
    await saveAnalysisResults(input.analysisId, result, contentStr);

    return result;
  } catch (error: any) {
    // Marquer comme échoué
    await db.update(erpAiPlanAnalyses)
      .set({
        analysisStatus: "failed",
        hypotheses: `Erreur: ${error.message}`,
        updatedAt: Date.now(),
      })
      .where(eq(erpAiPlanAnalyses.id, input.analysisId));

    throw error;
  }
}

/**
 * Construit le prompt utilisateur selon le contexte
 */
function buildUserPrompt(input: PlanAnalysisInput): string {
  let prompt = `Analyse ce plan de construction.`;

  if (input.planType && input.planType !== "unknown") {
    prompt += `\nType de plan indiqué : ${input.planType}`;
  }

  if (input.scaleConfirmed) {
    prompt += `\nÉchelle confirmée par l'utilisateur : ${input.scaleConfirmed}`;
  }

  prompt += `\n\nInstructions :
- Identifie TOUS les éléments structurels visibles
- Estime les dimensions en mètres (utilise l'échelle si disponible)
- Effectue les contrôles d'ingénierie de base
- Attribue un score de confiance à chaque élément (0-100)
- Liste tes hypothèses
- Inclus un disclaimer obligatoire sur les limites de l'IA`;

  return prompt;
}

/**
 * Sauvegarde les résultats de l'analyse en base de données
 */
async function saveAnalysisResults(
  analysisId: number,
  result: PlanAnalysisResult,
  rawResponse: string
): Promise<void> {
  const db = (await getDb())!;
  const now = Date.now();

  // Mettre à jour l'analyse principale
  await db.update(erpAiPlanAnalyses)
    .set({
      planType: result.planType,
      scaleDetected: result.scaleDetected || null,
      floorLevel: result.floorLevel || null,
      hypotheses: JSON.stringify(result.hypotheses),
      analysisStatus: "completed",
      confidenceScore: result.overallConfidence,
      aiRawResponse: rawResponse,
      updatedAt: now,
    })
    .where(eq(erpAiPlanAnalyses.id, analysisId));

  // Insérer les éléments détectés
  if (result.elements.length > 0) {
    const elementValues = result.elements.map((el) => ({
      planAnalysisId: analysisId,
      elementType: el.elementType,
      elementLabel: el.elementLabel,
      floorLevel: el.floorLevel || null,
      zone: el.zone || null,
      coordinatesJson: el.coordinates ? JSON.stringify(el.coordinates) : null,
      dimensionsJson: JSON.stringify(el.dimensions),
      area: el.dimensions.area ? String(el.dimensions.area) : null,
      length: el.dimensions.length ? String(el.dimensions.length) : null,
      width: el.dimensions.width ? String(el.dimensions.width) : null,
      height: el.dimensions.height ? String(el.dimensions.height) : null,
      volume: el.dimensions.volume ? String(el.dimensions.volume) : null,
      unit: el.unit || "m",
      confidenceScore: el.confidenceScore,
      status: "suggested" as const,
      createdAt: now,
      updatedAt: now,
    }));

    await db.insert(erpAiPlanElements).values(elementValues);
  }

  // Insérer les contrôles d'ingénierie
  if (result.engineeringChecks.length > 0) {
    const checkValues = result.engineeringChecks.map((check) => ({
      planAnalysisId: analysisId,
      projectId: null,
      checkType: check.checkType,
      checkName: check.checkName,
      description: check.description,
      severity: check.severity,
      status: check.status,
      detectedIssue: check.detectedIssue || null,
      recommendation: check.recommendation || null,
      relatedElementId: null,
      confidenceScore: check.confidenceScore,
      requiresEngineerValidation: check.requiresEngineerValidation,
      reviewedBy: null,
      reviewedAt: null,
      createdAt: now,
      updatedAt: now,
    }));

    await db.insert(erpAiEngineeringChecks).values(checkValues);
  }
}

/**
 * Assistant IA conversationnel — pose une question sur un plan analysé
 */
export async function askPlanAssistant(
  analysisId: number,
  question: string,
  conversationHistory: Array<{ role: "user" | "assistant"; content: string }>
): Promise<string> {
  const db = (await getDb())!;

  // Charger le contexte de l'analyse
  const [analysis] = await db.select().from(erpAiPlanAnalyses).where(eq(erpAiPlanAnalyses.id, analysisId));
  if (!analysis) throw new Error("Analyse introuvable");

  const elements = await db.select().from(erpAiPlanElements).where(eq(erpAiPlanElements.planAnalysisId, analysisId));

  const contextPrompt = `Tu es un assistant IA spécialisé en construction et BTP en Côte d'Ivoire.
Tu réponds aux questions sur un plan de construction qui a été analysé.

CONTEXTE DE L'ANALYSE :
- Fichier : ${analysis.fileName}
- Type de plan : ${analysis.planType}
- Échelle : ${analysis.scaleConfirmed || analysis.scaleDetected || "non déterminée"}
- Niveau : ${analysis.floorLevel || "non déterminé"}
- Confiance globale : ${analysis.confidenceScore}%
- Nombre d'éléments détectés : ${elements.length}

ÉLÉMENTS DÉTECTÉS :
${elements.map(el => `- ${el.elementLabel || el.elementType} : ${el.length ? `L=${el.length}m` : ""} ${el.width ? `l=${el.width}m` : ""} ${el.height ? `h=${el.height}m` : ""} ${el.area ? `S=${el.area}m²` : ""}`).join("\n")}

RÈGLES :
- Réponds en français
- Sois précis et technique
- Cite les normes applicables si pertinent
- Rappelle toujours que l'IA est indicative et qu'un ingénieur doit valider`;

  const messages: any[] = [
    { role: "system", content: contextPrompt },
    ...conversationHistory.map((msg) => ({ role: msg.role, content: msg.content })),
    { role: "user", content: question },
  ];

  const response = await invokeLLM({ messages });
  const content = response.choices[0]?.message?.content;
  return typeof content === "string" ? content : JSON.stringify(content);
}
