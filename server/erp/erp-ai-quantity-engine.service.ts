/**
 * erp-ai-quantity-engine.service.ts
 *
 * Moteur de calcul quantitatif pour les plans de construction.
 * Calcule les quantités de matériaux à partir des éléments détectés,
 * applique les coefficients configurables et les taux de perte.
 *
 * Sprint IA Construction
 */
import { getDb } from "../db";
import {
  erpAiPlanElements,
  erpAiMaterialTakeoffs,
  erpAiQuantityCoefficients,
} from "../../drizzle/schema";
import { eq, and } from "drizzle-orm";

// --- Types ---
export interface MaterialCalculation {
  materialName: string;
  category: string;
  unit: string;
  calculatedQuantity: number;
  wasteRate: number;
  recommendedQuantity: number;
  purchaseUnit?: string;
  purchaseQuantity?: number;
  calculationMethod: string;
  assumptions: string[];
  confidenceScore: number;
}

export interface QuantityResult {
  analysisId: number;
  totalMaterials: number;
  materials: MaterialCalculation[];
  totalEstimatedCost: number;
  disclaimer: string;
}

// --- Coefficients par défaut (Côte d'Ivoire) ---
export const DEFAULT_COEFFICIENTS = [
  // Béton
  { code: "BETON_CIMENT", name: "Ciment pour béton dosé à 350kg/m³", domain: "concrete", inputUnit: "m3", outputUnit: "kg", value: 350, wasteRate: 5 },
  { code: "BETON_SABLE", name: "Sable pour béton (0.4m³/m³)", domain: "concrete", inputUnit: "m3", outputUnit: "m3", value: 0.4, wasteRate: 10 },
  { code: "BETON_GRAVIER", name: "Gravier pour béton (0.8m³/m³)", domain: "concrete", inputUnit: "m3", outputUnit: "m3", value: 0.8, wasteRate: 10 },
  { code: "BETON_EAU", name: "Eau pour béton (175L/m³)", domain: "concrete", inputUnit: "m3", outputUnit: "L", value: 175, wasteRate: 5 },
  // Maçonnerie
  { code: "MACONN_PARPAING15", name: "Parpaings 15cm (13 unités/m²)", domain: "masonry", inputUnit: "m2", outputUnit: "unité", value: 13, wasteRate: 5 },
  { code: "MACONN_PARPAING20", name: "Parpaings 20cm (13 unités/m²)", domain: "masonry", inputUnit: "m2", outputUnit: "unité", value: 13, wasteRate: 5 },
  { code: "MACONN_MORTIER", name: "Mortier de pose (0.02m³/m²)", domain: "masonry", inputUnit: "m2", outputUnit: "m3", value: 0.02, wasteRate: 10 },
  { code: "MACONN_CIMENT", name: "Ciment pour mortier (300kg/m³ mortier)", domain: "masonry", inputUnit: "m3", outputUnit: "kg", value: 300, wasteRate: 5 },
  // Armatures
  { code: "FER_POTEAU", name: "Fer HA pour poteaux (80kg/m³ béton)", domain: "rebar", inputUnit: "m3", outputUnit: "kg", value: 80, wasteRate: 8 },
  { code: "FER_POUTRE", name: "Fer HA pour poutres (100kg/m³ béton)", domain: "rebar", inputUnit: "m3", outputUnit: "kg", value: 100, wasteRate: 8 },
  { code: "FER_DALLE", name: "Fer HA pour dalles (50kg/m³ béton)", domain: "rebar", inputUnit: "m3", outputUnit: "kg", value: 50, wasteRate: 8 },
  { code: "FER_FONDATION", name: "Fer HA pour fondations (60kg/m³ béton)", domain: "rebar", inputUnit: "m3", outputUnit: "kg", value: 60, wasteRate: 8 },
  { code: "FIL_ATTACHE", name: "Fil d'attache (1.5kg/100kg fer)", domain: "rebar", inputUnit: "kg", outputUnit: "kg", value: 0.015, wasteRate: 10 },
  // Plomberie
  { code: "PLOMB_TUYAU_PVC", name: "Tuyau PVC Ø110 (par point)", domain: "plumbing", inputUnit: "point", outputUnit: "ml", value: 3, wasteRate: 10 },
  { code: "PLOMB_RACCORD", name: "Raccords PVC (3 par point)", domain: "plumbing", inputUnit: "point", outputUnit: "unité", value: 3, wasteRate: 15 },
  // Électricité
  { code: "ELEC_CABLE", name: "Câble 2.5mm² (par point)", domain: "electrical", inputUnit: "point", outputUnit: "ml", value: 8, wasteRate: 10 },
  { code: "ELEC_GAINE", name: "Gaine ICTA Ø20 (par point)", domain: "electrical", inputUnit: "point", outputUnit: "ml", value: 8, wasteRate: 10 },
  // Finitions
  { code: "ENDUIT_CIMENT", name: "Ciment pour enduit (6kg/m²)", domain: "finishing", inputUnit: "m2", outputUnit: "kg", value: 6, wasteRate: 10 },
  { code: "ENDUIT_SABLE", name: "Sable pour enduit (0.015m³/m²)", domain: "finishing", inputUnit: "m2", outputUnit: "m3", value: 0.015, wasteRate: 10 },
];

/**
 * Seed les coefficients par défaut en base de données
 */
export async function seedDefaultCoefficients(): Promise<number> {
  const db = (await getDb())!;
  const now = Date.now();

  // Vérifier si déjà seedé
  const existing = await db.select().from(erpAiQuantityCoefficients);
  if (existing.length > 0) return existing.length;

  const values = DEFAULT_COEFFICIENTS.map((c) => ({
    coefficientCode: c.code,
    name: c.name,
    usageDomain: c.domain,
    inputUnit: c.inputUnit,
    outputUnit: c.outputUnit,
    coefficientValue: String(c.value),
    wasteRateDefault: String(c.wasteRate),
    description: `${c.name} — Coefficient standard Côte d'Ivoire`,
    isActive: true,
    createdAt: now,
    updatedAt: now,
  }));

  await db.insert(erpAiQuantityCoefficients).values(values);
  return values.length;
}

/**
 * Calcule le quantitatif matériaux à partir des éléments détectés
 */
export async function calculateMaterialTakeoff(analysisId: number, projectId?: number): Promise<QuantityResult> {
  const db = (await getDb())!;
  const now = Date.now();

  // Charger les éléments détectés
  const elements = await db.select().from(erpAiPlanElements)
    .where(eq(erpAiPlanElements.planAnalysisId, analysisId));

  if (elements.length === 0) {
    throw new Error("Aucun élément détecté pour cette analyse. Lancez d'abord l'analyse IA.");
  }

  // Charger les coefficients actifs
  const coefficients = await db.select().from(erpAiQuantityCoefficients)
    .where(eq(erpAiQuantityCoefficients.isActive, true));

  if (coefficients.length === 0) {
    // Seed les coefficients par défaut
    await seedDefaultCoefficients();
    return calculateMaterialTakeoff(analysisId, projectId);
  }

  // Calculer les quantités
  const materials: MaterialCalculation[] = [];

  // Grouper les éléments par type
  const walls = elements.filter((e) => e.elementType === "wall");
  const columns = elements.filter((e) => e.elementType === "column");
  const beams = elements.filter((e) => e.elementType === "beam");
  const slabs = elements.filter((e) => e.elementType === "slab");
  const foundations = elements.filter((e) => e.elementType === "foundation" || e.elementType === "footing");
  const pipes = elements.filter((e) => e.elementType === "pipe" || e.elementType === "plumbing_point");
  const electricalPoints = elements.filter((e) => e.elementType === "electrical_point");

  // --- BÉTON ---
  const concreteVolumes = {
    columns: columns.reduce((sum, el) => sum + (Number(el.volume) || (Number(el.length) || 0.25) * (Number(el.width) || 0.25) * (Number(el.height) || 3)), 0),
    beams: beams.reduce((sum, el) => sum + (Number(el.volume) || (Number(el.length) || 4) * (Number(el.width) || 0.2) * (Number(el.height) || 0.4)), 0),
    slabs: slabs.reduce((sum, el) => sum + (Number(el.volume) || (Number(el.area) || 0) * (Number(el.height) || 0.15)), 0),
    foundations: foundations.reduce((sum, el) => sum + (Number(el.volume) || (Number(el.length) || 1) * (Number(el.width) || 0.6) * (Number(el.height) || 0.3)), 0),
  };
  const totalConcreteVolume = Object.values(concreteVolumes).reduce((a, b) => a + b, 0);

  if (totalConcreteVolume > 0) {
    const cimentCoeff = coefficients.find((c) => c.coefficientCode === "BETON_CIMENT");
    const sableCoeff = coefficients.find((c) => c.coefficientCode === "BETON_SABLE");
    const gravierCoeff = coefficients.find((c) => c.coefficientCode === "BETON_GRAVIER");

    if (cimentCoeff) {
      const qty = totalConcreteVolume * Number(cimentCoeff.coefficientValue);
      const waste = Number(cimentCoeff.wasteRateDefault);
      materials.push({
        materialName: "Ciment CPA 45 (sacs 50kg)",
        category: "cement",
        unit: "kg",
        calculatedQuantity: round(qty),
        wasteRate: waste,
        recommendedQuantity: round(qty * (1 + waste / 100)),
        purchaseUnit: "sac 50kg",
        purchaseQuantity: Math.ceil(qty * (1 + waste / 100) / 50),
        calculationMethod: `Volume béton total (${round(totalConcreteVolume)}m³) × ${cimentCoeff.coefficientValue}kg/m³`,
        assumptions: ["Dosage béton 350kg/m³", "Sacs de 50kg"],
        confidenceScore: 75,
      });
    }

    if (sableCoeff) {
      const qty = totalConcreteVolume * Number(sableCoeff.coefficientValue);
      const waste = Number(sableCoeff.wasteRateDefault);
      materials.push({
        materialName: "Sable de rivière (béton)",
        category: "sand",
        unit: "m3",
        calculatedQuantity: round(qty),
        wasteRate: waste,
        recommendedQuantity: round(qty * (1 + waste / 100)),
        purchaseUnit: "voyage 5m³",
        purchaseQuantity: Math.ceil(qty * (1 + waste / 100) / 5),
        calculationMethod: `Volume béton total (${round(totalConcreteVolume)}m³) × ${sableCoeff.coefficientValue}m³/m³`,
        assumptions: ["Sable propre 0/5", "Voyage de 5m³"],
        confidenceScore: 70,
      });
    }

    if (gravierCoeff) {
      const qty = totalConcreteVolume * Number(gravierCoeff.coefficientValue);
      const waste = Number(gravierCoeff.wasteRateDefault);
      materials.push({
        materialName: "Gravier concassé 5/25",
        category: "gravel",
        unit: "m3",
        calculatedQuantity: round(qty),
        wasteRate: waste,
        recommendedQuantity: round(qty * (1 + waste / 100)),
        purchaseUnit: "voyage 5m³",
        purchaseQuantity: Math.ceil(qty * (1 + waste / 100) / 5),
        calculationMethod: `Volume béton total (${round(totalConcreteVolume)}m³) × ${gravierCoeff.coefficientValue}m³/m³`,
        assumptions: ["Gravier concassé 5/25", "Voyage de 5m³"],
        confidenceScore: 70,
      });
    }
  }

  // --- ARMATURES (FER) ---
  const ferCoeffs = {
    columns: coefficients.find((c) => c.coefficientCode === "FER_POTEAU"),
    beams: coefficients.find((c) => c.coefficientCode === "FER_POUTRE"),
    slabs: coefficients.find((c) => c.coefficientCode === "FER_DALLE"),
    foundations: coefficients.find((c) => c.coefficientCode === "FER_FONDATION"),
  };

  let totalFer = 0;
  const ferDetails: string[] = [];

  if (ferCoeffs.columns && concreteVolumes.columns > 0) {
    const qty = concreteVolumes.columns * Number(ferCoeffs.columns.coefficientValue);
    totalFer += qty;
    ferDetails.push(`Poteaux: ${round(concreteVolumes.columns)}m³ × ${ferCoeffs.columns.coefficientValue}kg/m³`);
  }
  if (ferCoeffs.beams && concreteVolumes.beams > 0) {
    const qty = concreteVolumes.beams * Number(ferCoeffs.beams.coefficientValue);
    totalFer += qty;
    ferDetails.push(`Poutres: ${round(concreteVolumes.beams)}m³ × ${ferCoeffs.beams.coefficientValue}kg/m³`);
  }
  if (ferCoeffs.slabs && concreteVolumes.slabs > 0) {
    const qty = concreteVolumes.slabs * Number(ferCoeffs.slabs.coefficientValue);
    totalFer += qty;
    ferDetails.push(`Dalles: ${round(concreteVolumes.slabs)}m³ × ${ferCoeffs.slabs.coefficientValue}kg/m³`);
  }
  if (ferCoeffs.foundations && concreteVolumes.foundations > 0) {
    const qty = concreteVolumes.foundations * Number(ferCoeffs.foundations.coefficientValue);
    totalFer += qty;
    ferDetails.push(`Fondations: ${round(concreteVolumes.foundations)}m³ × ${ferCoeffs.foundations.coefficientValue}kg/m³`);
  }

  if (totalFer > 0) {
    const waste = 8;
    materials.push({
      materialName: "Fer à béton HA (mix diamètres)",
      category: "rebar",
      unit: "kg",
      calculatedQuantity: round(totalFer),
      wasteRate: waste,
      recommendedQuantity: round(totalFer * (1 + waste / 100)),
      purchaseUnit: "barre 12m",
      purchaseQuantity: Math.ceil(totalFer * (1 + waste / 100) / 8.88), // barre HA12 ≈ 8.88kg
      calculationMethod: ferDetails.join(" + "),
      assumptions: ["Mix diamètres HA8-HA14", "Barre standard 12m", "Poids moyen barre HA12 ≈ 8.88kg"],
      confidenceScore: 65,
    });

    // Fil d'attache
    const filCoeff = coefficients.find((c) => c.coefficientCode === "FIL_ATTACHE");
    if (filCoeff) {
      const filQty = totalFer * Number(filCoeff.coefficientValue);
      materials.push({
        materialName: "Fil d'attache recuit",
        category: "rebar",
        unit: "kg",
        calculatedQuantity: round(filQty),
        wasteRate: 10,
        recommendedQuantity: round(filQty * 1.1),
        purchaseUnit: "rouleau 1kg",
        purchaseQuantity: Math.ceil(filQty * 1.1),
        calculationMethod: `Fer total (${round(totalFer)}kg) × 1.5%`,
        assumptions: ["1.5kg fil pour 100kg de fer"],
        confidenceScore: 70,
      });
    }
  }

  // --- MAÇONNERIE (PARPAINGS) ---
  if (walls.length > 0) {
    const totalWallArea = walls.reduce((sum, el) => {
      const l = Number(el.length) || 0;
      const h = Number(el.height) || 3;
      return sum + (Number(el.area) || l * h);
    }, 0);

    if (totalWallArea > 0) {
      // Déterminer épaisseur dominante
      const avgThickness = walls.reduce((sum, el) => sum + (Number(el.width) || 0.15), 0) / walls.length;
      const parpaingCode = avgThickness >= 0.18 ? "MACONN_PARPAING20" : "MACONN_PARPAING15";
      const parpaingCoeff = coefficients.find((c) => c.coefficientCode === parpaingCode);
      const mortierCoeff = coefficients.find((c) => c.coefficientCode === "MACONN_MORTIER");

      if (parpaingCoeff) {
        const qty = totalWallArea * Number(parpaingCoeff.coefficientValue);
        const waste = Number(parpaingCoeff.wasteRateDefault);
        materials.push({
          materialName: `Parpaings ${avgThickness >= 0.18 ? "20cm" : "15cm"}`,
          category: "blocks",
          unit: "unité",
          calculatedQuantity: round(qty),
          wasteRate: waste,
          recommendedQuantity: Math.ceil(qty * (1 + waste / 100)),
          purchaseUnit: "unité",
          purchaseQuantity: Math.ceil(qty * (1 + waste / 100)),
          calculationMethod: `Surface murs (${round(totalWallArea)}m²) × ${parpaingCoeff.coefficientValue} unités/m²`,
          assumptions: [`Parpaings ${avgThickness >= 0.18 ? "20×20×50cm" : "15×20×50cm"}`, "13 unités/m² standard"],
          confidenceScore: 70,
        });
      }

      if (mortierCoeff) {
        const mortierVol = totalWallArea * Number(mortierCoeff.coefficientValue);
        const cimentMortierCoeff = coefficients.find((c) => c.coefficientCode === "MACONN_CIMENT");
        if (cimentMortierCoeff) {
          const cimentQty = mortierVol * Number(cimentMortierCoeff.coefficientValue);
          materials.push({
            materialName: "Ciment pour mortier de pose",
            category: "cement",
            unit: "kg",
            calculatedQuantity: round(cimentQty),
            wasteRate: 10,
            recommendedQuantity: round(cimentQty * 1.1),
            purchaseUnit: "sac 50kg",
            purchaseQuantity: Math.ceil(cimentQty * 1.1 / 50),
            calculationMethod: `Surface murs (${round(totalWallArea)}m²) × mortier (${mortierCoeff.coefficientValue}m³/m²) × ciment (${cimentMortierCoeff.coefficientValue}kg/m³)`,
            assumptions: ["Mortier dosé à 300kg/m³", "Épaisseur joints standard"],
            confidenceScore: 65,
          });
        }

        // Sable pour mortier
        const sableMortier = mortierVol * 1.2; // 1.2m³ sable par m³ mortier
        materials.push({
          materialName: "Sable pour mortier de pose",
          category: "sand",
          unit: "m3",
          calculatedQuantity: round(sableMortier),
          wasteRate: 10,
          recommendedQuantity: round(sableMortier * 1.1),
          purchaseUnit: "voyage 5m³",
          purchaseQuantity: Math.ceil(sableMortier * 1.1 / 5),
          calculationMethod: `Volume mortier (${round(mortierVol)}m³) × 1.2`,
          assumptions: ["1.2m³ sable par m³ de mortier"],
          confidenceScore: 65,
        });
      }
    }
  }

  // --- PLOMBERIE ---
  if (pipes.length > 0) {
    const tuyauCoeff = coefficients.find((c) => c.coefficientCode === "PLOMB_TUYAU_PVC");
    if (tuyauCoeff) {
      const qty = pipes.length * Number(tuyauCoeff.coefficientValue);
      materials.push({
        materialName: "Tuyau PVC Ø110mm",
        category: "plumbing",
        unit: "ml",
        calculatedQuantity: round(qty),
        wasteRate: 10,
        recommendedQuantity: round(qty * 1.1),
        purchaseUnit: "barre 4m",
        purchaseQuantity: Math.ceil(qty * 1.1 / 4),
        calculationMethod: `${pipes.length} points × ${tuyauCoeff.coefficientValue}ml/point`,
        assumptions: ["3ml par point sanitaire", "Barres de 4m"],
        confidenceScore: 55,
      });
    }
  }

  // --- ÉLECTRICITÉ ---
  if (electricalPoints.length > 0) {
    const cableCoeff = coefficients.find((c) => c.coefficientCode === "ELEC_CABLE");
    if (cableCoeff) {
      const qty = electricalPoints.length * Number(cableCoeff.coefficientValue);
      materials.push({
        materialName: "Câble électrique 2.5mm²",
        category: "electrical",
        unit: "ml",
        calculatedQuantity: round(qty),
        wasteRate: 10,
        recommendedQuantity: round(qty * 1.1),
        purchaseUnit: "couronne 100m",
        purchaseQuantity: Math.ceil(qty * 1.1 / 100),
        calculationMethod: `${electricalPoints.length} points × ${cableCoeff.coefficientValue}ml/point`,
        assumptions: ["8ml par point électrique", "Couronnes de 100m"],
        confidenceScore: 50,
      });
    }
  }

  // Sauvegarder en base de données
  if (materials.length > 0) {
    // Supprimer les anciens takeoffs pour cette analyse
    await db.delete(erpAiMaterialTakeoffs)
      .where(eq(erpAiMaterialTakeoffs.planAnalysisId, analysisId));

    const takeoffValues = materials.map((mat) => ({
      planAnalysisId: analysisId,
      projectId: projectId || null,
      elementId: null,
      materialName: mat.materialName,
      category: mat.category,
      unit: mat.unit,
      calculatedQuantity: String(mat.calculatedQuantity),
      wasteRate: String(mat.wasteRate),
      recommendedQuantity: String(mat.recommendedQuantity),
      purchaseUnit: mat.purchaseUnit || null,
      purchaseQuantity: mat.purchaseQuantity ? String(mat.purchaseQuantity) : null,
      unitPrice: null,
      estimatedCost: null,
      calculationMethod: mat.calculationMethod,
      assumptionsJson: JSON.stringify(mat.assumptions),
      confidenceScore: mat.confidenceScore,
      status: "suggested" as const,
      reviewedBy: null,
      validatedBy: null,
      createdAt: now,
      updatedAt: now,
    }));

    await db.insert(erpAiMaterialTakeoffs).values(takeoffValues);
  }

  return {
    analysisId,
    totalMaterials: materials.length,
    materials,
    totalEstimatedCost: 0, // À calculer avec les prix unitaires
    disclaimer: "⚠️ AVERTISSEMENT : Ce quantitatif est généré par intelligence artificielle à titre indicatif uniquement. Il doit être vérifié et validé par un ingénieur ou métreur qualifié avant toute utilisation pour commande ou budgétisation. Les quantités réelles peuvent varier selon les conditions du site, les méthodes constructives et les spécifications techniques détaillées.",
  };
}

function round(value: number, decimals = 2): number {
  return Math.round(value * Math.pow(10, decimals)) / Math.pow(10, decimals);
}
