/**
 * ERP Solar AI Service
 * Recommandations IA, génération de scénarios, assistant conversationnel solaire
 */

import { invokeLLM } from "../_core/llm";
import {
  calculateFullSizing,
  calculateBudget,
  DEFAULT_PRICES,
  type LoadBalanceResult,
  type DesignInputs,
  type SizingResult,
  type BudgetResult,
  type PriceCatalog,
} from "./erp-solar-calculation-engine.service";

// ============================================================
// TYPES
// ============================================================

export interface SolarRecommendation {
  recommendationType: string;
  title: string;
  description: string;
  severity: "critical" | "warning" | "info" | "success";
  confidenceScore: number;
  expectedImpact: string;
}

export interface SolarScenario {
  scenarioName: string;
  batteryTechnology: "lithium" | "plomb";
  autonomyDays: number;
  panelPowerWc: number;
  peakSunHours: number;
  totalCost: number;
  panelsCount: number;
  batteryCapacityAh: number;
  inverterPowerW: number;
  aiScore: number;
  recommendedByAi: boolean;
  advantages: string[];
  disadvantages: string[];
  risks: string[];
}

export interface CatalogItem {
  itemCode: string;
  itemName: string;
  category: string;
  unit: string;
  unitPrice: number;
  brand?: string | null;
  model?: string | null;
  qualityLevel?: string | null;
  recommendedUsage?: string | null;
}

export interface SolarProjectContext {
  projectName: string;
  siteName?: string;
  loadBalance: LoadBalanceResult;
  designInputs: DesignInputs;
  sizing: SizingResult;
  budget: BudgetResult;
  catalog?: CatalogItem[];
}

// ============================================================
// 1. RECOMMANDATIONS IA
// ============================================================

/**
 * Génère des recommandations IA basées sur l'analyse du projet solaire
 */
export async function generateSolarRecommendations(
  context: SolarProjectContext
): Promise<SolarRecommendation[]> {
  const prompt = buildRecommendationPrompt(context);

  const response = await invokeLLM({
    messages: [
      {
        role: "system",
        content: `Tu es un ingénieur solaire expert spécialisé dans le dimensionnement de systèmes photovoltaïques autonomes en Afrique de l'Ouest. Tu analyses les configurations solaires et proposes des recommandations techniques précises. Réponds UNIQUEMENT en JSON valide.`,
      },
      { role: "user", content: prompt },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "solar_recommendations",
        strict: true,
        schema: {
          type: "object",
          properties: {
            recommendations: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  recommendationType: { type: "string" },
                  title: { type: "string" },
                  description: { type: "string" },
                  severity: { type: "string", enum: ["critical", "warning", "info", "success"] },
                  confidenceScore: { type: "number" },
                  expectedImpact: { type: "string" },
                },
                required: ["recommendationType", "title", "description", "severity", "confidenceScore", "expectedImpact"],
                additionalProperties: false,
              },
            },
          },
          required: ["recommendations"],
          additionalProperties: false,
        },
      },
    },
  });

  const content = response.choices?.[0]?.message?.content;
  if (!content) return [];

  try {
    const parsed = JSON.parse(typeof content === "string" ? content : "{}");
    return parsed.recommendations || [];
  } catch {
    return [];
  }
}

function buildRecommendationPrompt(ctx: SolarProjectContext): string {
  const { loadBalance, designInputs, sizing, budget } = ctx;

  return `Analyse cette configuration solaire et génère des recommandations techniques :

## Projet : ${ctx.projectName}
Site : ${ctx.siteName || "Non spécifié"}

## Bilan de puissance
- Puissance nominale totale : ${loadBalance.totalNominalPowerW} W
- Énergie journalière : ${loadBalance.totalDailyEnergyWh} Wh/j
- Puissance max démarrage : ${loadBalance.maxStartupPowerW} W
- Charges critiques : ${loadBalance.criticalLoadPowerW} W (${loadBalance.criticalLoadEnergyWh} Wh/j)
- Nombre d'équipements : ${loadBalance.items.length}

## Paramètres de conception
- Tension nominale : ${designInputs.nominalVoltageV} V
- Technologie batterie : ${designInputs.batteryTechnology}
- Autonomie : ${designInputs.autonomyDays} jours
- Ensoleillement : ${designInputs.peakSunHours} h/j
- Rendement global : ${(designInputs.globalEfficiency * 100).toFixed(0)}%
- Taux de décharge : ${(designInputs.batteryDischargeRate * 100).toFixed(0)}%

## Dimensionnement calculé
- PV : ${sizing.pv.panelsCount} panneaux × ${sizing.pv.panelUnitPowerWc} Wc = ${sizing.pv.totalInstalledPowerWc} Wc
- Batteries : ${Math.round(sizing.battery.capacityAh)} Ah / ${Math.round(sizing.battery.capacityWh)} Wh (${sizing.battery.technology})
- Onduleur : ${Math.round(sizing.inverter.recommendedPowerW)} W recommandé (min ${Math.round(sizing.inverter.minPowerW)} W)
- Câbles : ${sizing.cables.map(c => `${c.lineName}: ${c.recommendedCommercialSectionMm2} mm², ${c.lengthM} m`).join("; ")}

## Budget estimatif
- Total : ${budget.totalInvestment.toLocaleString()} ${budget.currency}
- Répartition : ${budget.lines.map(l => `${l.lotName}: ${l.amount.toLocaleString()} ${budget.currency}`).join(", ")}

${ctx.catalog && ctx.catalog.length > 0 ? `
## Catalogue de prix disponible
${ctx.catalog.map(c => `- ${c.itemCode} | ${c.itemName} | ${c.brand || "Générique"} | ${c.category} | ${c.unitPrice.toLocaleString()} XOF/${c.unit} | Qualité: ${c.qualityLevel || "N/A"} | Usage: ${c.recommendedUsage || "N/A"}`).join("\n")}
` : ""}
Génère entre 4 et 8 recommandations couvrant :
1. Analyse du bilan de puissance (charges critiques, consommations anormales)
2. Dimensionnement PV (suffisance, marge)
3. Stockage batterie (autonomie, technologie, coût)
4. Onduleur (couverture démarrage, marge)
5. Câblage (chute de tension, risques)
6. Budget (optimisation, postes coûteux)
7. Recommandations produits du catalogue (marques, modèles adaptés au projet)

Types de recommandation possibles : LoadAnalysis, PvSizing, BatteryStorage, InverterSizing, CableRisk, BudgetOptimization, ConfigurationAlternative, Maintenance, Safety, ROI, SupplierRecommendation, ProductRecommendation`;
}

// ============================================================
// 2. GÉNÉRATION DE SCÉNARIOS
// ============================================================

/**
 * Génère automatiquement 4 scénarios comparatifs
 */
export function generateScenarios(
  loadBalance: LoadBalanceResult,
  baseDesignInputs: DesignInputs,
  prices: PriceCatalog = DEFAULT_PRICES
): SolarScenario[] {
  const scenarios: SolarScenario[] = [];

  // Scénario 1 : Économique (plomb, autonomie réduite, panneaux standard)
  const ecoInputs: DesignInputs = {
    ...baseDesignInputs,
    batteryTechnology: "plomb",
    autonomyDays: 1,
    panelUnitPowerWc: 450,
    batteryDischargeRate: 0.50, // plomb = décharge limitée
  };
  const ecoSizing = calculateFullSizing(loadBalance, ecoInputs);
  const ecoBudget = calculateBudget(ecoSizing, prices);
  scenarios.push({
    scenarioName: "Économique",
    batteryTechnology: "plomb",
    autonomyDays: 1,
    panelPowerWc: 450,
    peakSunHours: ecoInputs.peakSunHours,
    totalCost: ecoBudget.totalInvestment,
    panelsCount: ecoSizing.pv.panelsCount,
    batteryCapacityAh: ecoSizing.battery.capacityAh,
    inverterPowerW: ecoSizing.inverter.recommendedPowerW,
    aiScore: 0.6,
    recommendedByAi: false,
    advantages: ["Coût initial réduit", "Disponibilité locale des batteries plomb", "Installation simple"],
    disadvantages: ["Autonomie limitée (1 jour)", "Durée de vie batteries réduite", "Maintenance fréquente"],
    risks: ["Coupure si 2+ jours sans soleil", "Remplacement batteries tous les 3-4 ans"],
  });

  // Scénario 2 : Équilibré (lithium, autonomie 2j, panneaux standard)
  const balInputs: DesignInputs = {
    ...baseDesignInputs,
    batteryTechnology: "lithium",
    autonomyDays: 2,
    panelUnitPowerWc: 550,
    batteryDischargeRate: 0.80,
  };
  const balSizing = calculateFullSizing(loadBalance, balInputs);
  const balBudget = calculateBudget(balSizing, prices);
  scenarios.push({
    scenarioName: "Équilibré",
    batteryTechnology: "lithium",
    autonomyDays: 2,
    panelPowerWc: 550,
    peakSunHours: balInputs.peakSunHours,
    totalCost: balBudget.totalInvestment,
    panelsCount: balSizing.pv.panelsCount,
    batteryCapacityAh: balSizing.battery.capacityAh,
    inverterPowerW: balSizing.inverter.recommendedPowerW,
    aiScore: 0.85,
    recommendedByAi: true,
    advantages: ["Bon compromis coût/autonomie", "Lithium longue durée", "Marge technique modérée"],
    disadvantages: ["Coût initial plus élevé que plomb", "Nécessite onduleur compatible lithium"],
    risks: ["Risque modéré si 3+ jours sans soleil"],
  });

  // Scénario 3 : Premium (lithium, autonomie 3j, panneaux haute puissance)
  const premInputs: DesignInputs = {
    ...baseDesignInputs,
    batteryTechnology: "lithium",
    autonomyDays: 3,
    panelUnitPowerWc: 600,
    batteryDischargeRate: 0.80,
  };
  const premSizing = calculateFullSizing(loadBalance, premInputs);
  const premBudget = calculateBudget(premSizing, prices);
  scenarios.push({
    scenarioName: "Premium",
    batteryTechnology: "lithium",
    autonomyDays: 3,
    panelPowerWc: 600,
    peakSunHours: premInputs.peakSunHours,
    totalCost: premBudget.totalInvestment,
    panelsCount: premSizing.pv.panelsCount,
    batteryCapacityAh: premSizing.battery.capacityAh,
    inverterPowerW: premSizing.inverter.recommendedPowerW,
    aiScore: 0.75,
    recommendedByAi: false,
    advantages: ["Haute autonomie (3 jours)", "Panneaux haute puissance", "Meilleure durée de vie"],
    disadvantages: ["Coût élevé", "Parc batterie important", "Surface panneaux plus grande"],
    risks: ["CAPEX élevé", "ROI plus long"],
  });

  // Scénario 4 : Critique / Telecom (lithium, autonomie 4j, haute dispo)
  const critInputs: DesignInputs = {
    ...baseDesignInputs,
    batteryTechnology: "lithium",
    autonomyDays: 4,
    panelUnitPowerWc: 550,
    batteryDischargeRate: 0.70, // décharge limitée pour longévité
  };
  const critSizing = calculateFullSizing(loadBalance, critInputs);
  const critBudget = calculateBudget(critSizing, prices);
  scenarios.push({
    scenarioName: "Critique / Telecom",
    batteryTechnology: "lithium",
    autonomyDays: 4,
    panelPowerWc: 550,
    peakSunHours: critInputs.peakSunHours,
    totalCost: critBudget.totalInvestment,
    panelsCount: critSizing.pv.panelsCount,
    batteryCapacityAh: critSizing.battery.capacityAh,
    inverterPowerW: critSizing.inverter.recommendedPowerW,
    aiScore: 0.7,
    recommendedByAi: false,
    advantages: ["Haute disponibilité", "Autonomie 4 jours", "Décharge limitée = longévité"],
    disadvantages: ["Coût très élevé", "Parc batterie très important", "Complexité installation"],
    risks: ["Budget potentiellement prohibitif", "Nécessite groupe secours en complément"],
  });

  return scenarios;
}

// ============================================================
// 3. ASSISTANT CONVERSATIONNEL SOLAIRE
// ============================================================

/**
 * Chat IA contextuel pour le module solaire
 */
export async function solarAiChat(
  question: string,
  context: SolarProjectContext,
  conversationHistory: Array<{ role: "user" | "assistant"; content: string }> = []
): Promise<string> {
  const systemPrompt = `Tu es un assistant IA spécialisé en énergie solaire photovoltaïque pour l'Afrique de l'Ouest.
Tu aides les ingénieurs et chefs de projet à analyser et optimiser leurs installations solaires.

Contexte du projet actuel :
- Projet : ${context.projectName}
- Site : ${context.siteName || "Non spécifié"}
- Puissance nominale : ${context.loadBalance.totalNominalPowerW} W
- Énergie journalière : ${context.loadBalance.totalDailyEnergyWh} Wh/j
- PV installé : ${context.sizing.pv.totalInstalledPowerWc} Wc (${context.sizing.pv.panelsCount} panneaux)
- Batteries : ${Math.round(context.sizing.battery.capacityAh)} Ah ${context.sizing.battery.technology} (${context.sizing.battery.autonomyDays}j autonomie)
- Onduleur : ${Math.round(context.sizing.inverter.recommendedPowerW)} W
- Budget total : ${context.budget.totalInvestment.toLocaleString()} ${context.budget.currency}

Règles :
1. Réponds de manière claire et structurée
2. Inclus les calculs clés quand pertinent
3. Mentionne le niveau de confiance de tes recommandations
4. Précise toujours que les résultats doivent être validés par un ingénieur qualifié
5. Utilise les données du projet pour personnaliser tes réponses
6. Si tu ne peux pas répondre avec certitude, dis-le clairement`;

  const messages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [
    { role: "system", content: systemPrompt },
    ...conversationHistory.slice(-10), // Garder les 10 derniers messages
    { role: "user", content: question },
  ];

  const response = await invokeLLM({ messages });
  const content = response.choices?.[0]?.message?.content;
  return typeof content === "string" ? content : "Je n'ai pas pu générer une réponse. Veuillez réessayer.";
}
