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


// ============================================================
// 4. SUGGESTIONS DE CHARGES IA
// ============================================================

export interface LoadSuggestion {
  name: string;
  domain: string;
  category: string;
  powerW: number;
  quantity: number;
  hoursPerDay: number;
  simultaneityCoeff: number;
  startupFactor: number;
  isCritical: boolean;
  reason: string;
}

/**
 * Suggère des charges manquantes basées sur le type de projet et les charges existantes
 */
export async function suggestMissingLoads(
  projectType: string,
  existingLoads: Array<{ name: string; powerW: number; category: string }>,
  siteDescription?: string
): Promise<LoadSuggestion[]> {
  const prompt = `Analyse ce projet solaire et suggère les charges électriques manquantes.

Type de projet : ${projectType}
Description du site : ${siteDescription || "Non spécifié"}

Charges existantes :
${existingLoads.map(l => `- ${l.name} (${l.powerW}W, catégorie: ${l.category})`).join("\n")}

Suggère les équipements manquants qui seraient typiquement nécessaires pour ce type de site. 
Pour chaque suggestion, indique la raison et si c'est une charge critique.
Limite-toi à 5-8 suggestions pertinentes.`;

  const response = await invokeLLM({
    messages: [
      {
        role: "system",
        content: `Tu es un ingénieur solaire expert. Tu analyses les bilans de puissance et identifies les charges manquantes. Réponds UNIQUEMENT en JSON valide.`,
      },
      { role: "user", content: prompt },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "load_suggestions",
        strict: true,
        schema: {
          type: "object",
          properties: {
            suggestions: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  domain: { type: "string" },
                  category: { type: "string" },
                  powerW: { type: "number" },
                  quantity: { type: "number" },
                  hoursPerDay: { type: "number" },
                  simultaneityCoeff: { type: "number" },
                  startupFactor: { type: "number" },
                  isCritical: { type: "boolean" },
                  reason: { type: "string" },
                },
                required: ["name", "domain", "category", "powerW", "quantity", "hoursPerDay", "simultaneityCoeff", "startupFactor", "isCritical", "reason"],
                additionalProperties: false,
              },
            },
          },
          required: ["suggestions"],
          additionalProperties: false,
        },
      },
    },
  });

  try {
    const content = response.choices?.[0]?.message?.content;
    const parsed = JSON.parse(typeof content === "string" ? content : "{}");
    return parsed.suggestions || [];
  } catch {
    return [];
  }
}

// ============================================================
// 5. BILANS TYPES IA
// ============================================================

export interface TypicalLoadProfile {
  profileName: string;
  description: string;
  loads: Array<{
    name: string;
    category: string;
    powerW: number;
    quantity: number;
    hoursPerDay: number;
    simultaneityCoeff: number;
    startupFactor: number;
    isCritical: boolean;
  }>;
  totalPowerW: number;
  totalEnergyWhPerDay: number;
}

/**
 * Génère un bilan type complet pour un profil donné
 */
export async function generateTypicalProfile(
  profileType: string
): Promise<TypicalLoadProfile> {
  const prompt = `Génère un bilan de puissance type complet pour le profil suivant : "${profileType}"

Ce bilan doit être réaliste pour un site en Afrique de l'Ouest (Côte d'Ivoire).
Inclus toutes les charges typiques avec leurs puissances réelles, quantités, heures d'utilisation, coefficients de simultanéité et facteurs de démarrage.
Marque les charges critiques (qui ne doivent jamais être coupées).`;

  const response = await invokeLLM({
    messages: [
      {
        role: "system",
        content: `Tu es un ingénieur solaire expert en dimensionnement de systèmes photovoltaïques en Afrique de l'Ouest. Tu génères des bilans de puissance types réalistes. Réponds UNIQUEMENT en JSON valide.`,
      },
      { role: "user", content: prompt },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "typical_profile",
        strict: true,
        schema: {
          type: "object",
          properties: {
            profileName: { type: "string" },
            description: { type: "string" },
            loads: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  category: { type: "string" },
                  powerW: { type: "number" },
                  quantity: { type: "number" },
                  hoursPerDay: { type: "number" },
                  simultaneityCoeff: { type: "number" },
                  startupFactor: { type: "number" },
                  isCritical: { type: "boolean" },
                },
                required: ["name", "category", "powerW", "quantity", "hoursPerDay", "simultaneityCoeff", "startupFactor", "isCritical"],
                additionalProperties: false,
              },
            },
            totalPowerW: { type: "number" },
            totalEnergyWhPerDay: { type: "number" },
          },
          required: ["profileName", "description", "loads", "totalPowerW", "totalEnergyWhPerDay"],
          additionalProperties: false,
        },
      },
    },
  });

  try {
    const content = response.choices?.[0]?.message?.content;
    return JSON.parse(typeof content === "string" ? content : "{}");
  } catch {
    return { profileName: profileType, description: "", loads: [], totalPowerW: 0, totalEnergyWhPerDay: 0 };
  }
}

// ============================================================
// 6. DÉTECTION D'ANOMALIES
// ============================================================

export interface LoadAnomaly {
  loadName: string;
  anomalyType: "overuse" | "underuse" | "missing_startup" | "wrong_simultaneity" | "excessive_hours" | "unusual_power";
  severity: "critical" | "warning" | "info";
  message: string;
  suggestion: string;
}

/**
 * Détecte les anomalies dans un bilan de puissance
 */
export function detectLoadAnomalies(
  loads: Array<{ equipmentName: string; unitPowerW: number; quantity: number; usageHoursPerDay: number; startupFactor: number; equipmentCategory?: string }>
): LoadAnomaly[] {
  const anomalies: LoadAnomaly[] = [];

  for (const load of loads) {
    // Moteurs/compresseurs sans facteur de démarrage
    if ((load.equipmentCategory === "motor" || load.equipmentCategory === "pump" || load.equipmentCategory === "industrial") && load.startupFactor < 2) {
      anomalies.push({
        loadName: load.equipmentName,
        anomalyType: "missing_startup",
        severity: "warning",
        message: `Le facteur de démarrage (${load.startupFactor}) semble faible pour un ${load.equipmentCategory}.`,
        suggestion: "Les moteurs et compresseurs ont typiquement un facteur de démarrage de 3-4x.",
      });
    }

    // Climatiseurs sans facteur de démarrage
    if (load.equipmentCategory === "cooling" && load.unitPowerW > 500 && load.startupFactor < 2) {
      anomalies.push({
        loadName: load.equipmentName,
        anomalyType: "missing_startup",
        severity: "warning",
        message: `Le facteur de démarrage (${load.startupFactor}) semble faible pour un climatiseur.`,
        suggestion: "Les climatiseurs ont typiquement un facteur de démarrage de 3x.",
      });
    }

    // Heures d'utilisation excessives pour certains équipements
    if (load.equipmentCategory === "heating" && load.usageHoursPerDay > 6) {
      anomalies.push({
        loadName: load.equipmentName,
        anomalyType: "excessive_hours",
        severity: "info",
        message: `${load.usageHoursPerDay}h/j semble élevé pour un appareil de chauffage.`,
        suggestion: "Vérifiez si l'utilisation est réaliste (chauffe-eau: 1-3h, fer: 0.5-1h).",
      });
    }

    // Puissance anormalement élevée pour l'éclairage
    if (load.equipmentCategory === "lighting" && load.unitPowerW > 100) {
      anomalies.push({
        loadName: load.equipmentName,
        anomalyType: "unusual_power",
        severity: "info",
        message: `${load.unitPowerW}W semble élevé pour un éclairage LED.`,
        suggestion: "Les ampoules LED modernes consomment 5-20W. Vérifiez s'il s'agit d'un projecteur.",
      });
    }

    // Quantité excessive
    if (load.quantity > 50) {
      anomalies.push({
        loadName: load.equipmentName,
        anomalyType: "overuse",
        severity: "warning",
        message: `Quantité élevée (${load.quantity} unités).`,
        suggestion: "Vérifiez que la quantité est correcte et considérez un coefficient de simultanéité.",
      });
    }
  }

  return anomalies;
}
