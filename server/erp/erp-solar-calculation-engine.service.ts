/**
 * ERP Solar Calculation Engine v2
 * Moteur de calcul pour le dimensionnement solaire
 * Sprint Finalisation Technique : pertes détaillées, charges critiques,
 * modes batterie, ampacité câbles, onduleur surge/kVA
 */

// ============================================================
// TYPES
// ============================================================

export interface LoadItem {
  equipmentName: string;
  equipmentCategory?: string;
  unitPowerW: number;
  quantity: number;
  startupFactor: number;
  usageHoursPerDay: number;
  isCriticalLoad?: boolean;
  isNightLoad?: boolean;
  isMotorLoad?: boolean;
  simultaneityCoeff?: number;
  priorityLevel?: "essential" | "important" | "comfort" | "optional";
}

export interface LoadBalanceResult {
  items: LoadItemResult[];
  totalNominalPowerW: number;
  simultaneousPowerW: number;
  totalDailyEnergyWh: number;
  criticalLoadPowerW: number;
  criticalLoadEnergyWh: number;
  nightLoadPowerW: number;
  nightLoadEnergyWh: number;
  maxStartupPowerW: number;
  realisticPeakPowerW: number;
  motorLoadsPresent: boolean;
  criticalLoadsCount: number;
}

export interface LoadItemResult extends LoadItem {
  totalPowerW: number;
  simultaneousPowerW: number;
  peakPowerW: number;
  dailyEnergyWh: number;
}

export type BatterySizingMode = "total_load" | "critical_load" | "night_load" | "hybrid_backup" | "custom";

export interface DesignInputs {
  nominalVoltageV: number;
  batteryTechnology: "lithium" | "plomb";
  autonomyDays: number;
  peakSunHours: number;
  panelUnitPowerWc: number;
  panelToInverterCableLengthM: number;
  batteryToInverterCableLengthM: number;
  globalEfficiency: number;
  batteryDischargeRate: number;
  voltageDropTarget: number;
  // Sprint Finalisation Technique
  batterySizingMode: BatterySizingMode;
  hybridBackupPercent: number;
  pvStringVoltageV?: number;
  batteryAgeingFactor: number;
  batteryTemperatureFactor: number;
  batteryReserveMarginPercent: number;
  powerFactor: number;
  inverterSurgeMargin: number;
  pvMarginPercent: number;
}

export interface SystemLosses {
  pvDeratingFactor: number;
  mpptEfficiency: number;
  inverterEfficiency: number;
  batteryEfficiency: number;
  dcCableLossPercent: number;
  acCableLossPercent: number;
  miscSystemLossPercent: number;
  shadingFactor: number;
  soilingFactor: number;
  temperatureFactor: number;
}

export interface DetailedEfficiencyResult {
  detailedEfficiency: number;
  lossBreakdown: {
    pvDerating: number;
    mppt: number;
    inverter: number;
    battery: number;
    dcCable: number;
    acCable: number;
    misc: number;
    shading: number;
    soiling: number;
    temperature: number;
  };
}

export interface SizingResult {
  pv: PvSizingResult;
  battery: BatterySizingResult;
  inverter: InverterSizingResult;
  cables: CableSizingResult[];
  efficiency: DetailedEfficiencyResult;
  loadBalance: LoadBalanceSummary;
}

export interface LoadBalanceSummary {
  totalNominalPowerW: number;
  simultaneousPowerW: number;
  totalDailyEnergyWh: number;
  criticalDailyEnergyWh: number;
  nightDailyEnergyWh: number;
  realisticPeakPowerW: number;
}

export interface PvSizingResult {
  pvGrossPowerWc: number;
  pvRecommendedPowerWc: number;
  requiredPvPowerWc: number;
  panelUnitPowerWc: number;
  panelsCount: number;
  totalInstalledPowerWc: number;
  pvRealMarginPercent: number;
}

export interface BatterySizingResult {
  sizingMode: BatterySizingMode;
  referenceEnergyWh: number;
  autonomyEnergyWh: number;
  nominalCapacityWh: number;
  recommendedCapacityWh: number;
  capacityAh: number;
  capacityWh: number;
  modulesCount: number;
  realAutonomyDays: number;
  technology: string;
  autonomyDays: number;
  nominalVoltageV: number;
  dischargeRate: number;
}

export interface InverterSizingResult {
  simultaneousPowerW: number;
  realisticPeakPowerW: number;
  minPowerW: number;
  continuousRecommendedW: number;
  surgeRequiredW: number;
  powerKva: number;
  recommendedPowerW: number;
  safetyMargin: number;
  coversStartup: boolean;
  motorAlert: boolean;
}

export interface CableSizingResult {
  cableType: string;
  lineName: string;
  fromEquipment: string;
  toEquipment: string;
  voltageV: number;
  powerW: number;
  lengthM: number;
  currentA: number;
  theoreticalSectionMm2: number;
  selectedSectionMm2: number;
  recommendedCommercialSectionMm2: number;
  voltageDropV: number;
  voltageDropPercent: number;
  resistanceOhm: number;
  powerLossW: number;
  energyLossWhDay: number;
  lossPercent: number;
  ampacityLimitA: number;
  ampacityStatus: "OK" | "Warning" | "Critical" | "Needs Engineer Review";
  protectionRecommendation: string;
  material: string;
}

export interface BudgetLine {
  lotNumber: number;
  lotName: string;
  category: string;
  subCategory?: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  amount: number;
  calculationMethod: string;
}

export interface BudgetResult {
  lines: BudgetLine[];
  subtotalMaterial: number;
  subtotalProtections: number;
  subtotalPrestations: number;
  totalInvestment: number;
  currency: string;
}

export interface PriceCatalog {
  pricePerWcPanel: number;
  pricePerUnitLithium: number;
  lithiumUnitCapacityWh: number;
  pricePerUnitPlomb: number;
  plombUnitCapacityAh: number;
  pricePerWInverter: number;
  pricePerMeterCable: number;
  structuresCoffretsPercent: number;
  installationTransportPercent: number;
  // Budget détaillé
  pricePerMeterCablePV?: number;
  pricePerMeterCableBattery?: number;
  pricePerMeterCableAC?: number;
  priceCoffretDC?: number;
  priceCoffretAC?: number;
  priceDisjoncteurDC?: number;
  priceDisjoncteurAC?: number;
  priceParafoudre?: number;
  priceFusible?: number;
  priceMiseATerre?: number;
  engineeringPercent?: number;
  contingencyPercent?: number;
  transportPercent?: number;
}

export interface AmpacityRecord {
  sectionMm2: number;
  ampacityA: number;
}

// ============================================================
// CONSTANTES
// ============================================================

const COPPER_RESISTIVITY = 0.0175; // Ω·mm²/m à 20°C
const COMMERCIAL_SECTIONS = [1.5, 2.5, 4, 6, 10, 16, 25, 35, 50, 70, 95, 120, 150, 185, 240];

// Ampacité par défaut (NF C 15-100, cuivre, conduit, 2 conducteurs, 70°C)
const DEFAULT_AMPACITY: AmpacityRecord[] = [
  { sectionMm2: 1.5, ampacityA: 16 },
  { sectionMm2: 2.5, ampacityA: 21 },
  { sectionMm2: 4, ampacityA: 28 },
  { sectionMm2: 6, ampacityA: 36 },
  { sectionMm2: 10, ampacityA: 50 },
  { sectionMm2: 16, ampacityA: 68 },
  { sectionMm2: 25, ampacityA: 89 },
  { sectionMm2: 35, ampacityA: 110 },
  { sectionMm2: 50, ampacityA: 133 },
  { sectionMm2: 70, ampacityA: 171 },
  { sectionMm2: 95, ampacityA: 207 },
  { sectionMm2: 120, ampacityA: 239 },
  { sectionMm2: 150, ampacityA: 272 },
  { sectionMm2: 185, ampacityA: 310 },
  { sectionMm2: 240, ampacityA: 364 },
];

// ============================================================
// 1. BILAN DE PUISSANCE (avec simultanéité séparée du démarrage)
// ============================================================

/**
 * Calcule le bilan de puissance complet à partir des équipements
 * - Simultanéité : réduit l'énergie et la puissance nominale effective
 * - Démarrage : calcule la puissance de pointe réaliste
 */
export function calculateLoadBalance(items: LoadItem[]): LoadBalanceResult {
  const results: LoadItemResult[] = items.map((item) => {
    const totalPowerW = item.unitPowerW * item.quantity;
    const coeff = item.simultaneityCoeff ?? 1.0;
    const simultaneousPowerW = totalPowerW * coeff;
    const peakPowerW = totalPowerW * item.startupFactor;
    const dailyEnergyWh = simultaneousPowerW * item.usageHoursPerDay;

    return {
      ...item,
      totalPowerW,
      simultaneousPowerW,
      peakPowerW,
      dailyEnergyWh,
    };
  });

  const totalNominalPowerW = results.reduce((sum, r) => sum + r.totalPowerW, 0);
  const simultaneousPowerW = results.reduce((sum, r) => sum + r.simultaneousPowerW, 0);
  const totalDailyEnergyWh = results.reduce((sum, r) => sum + r.dailyEnergyWh, 0);

  // Charges critiques
  const criticalItems = results.filter((r) => r.isCriticalLoad);
  const criticalLoadPowerW = criticalItems.reduce((sum, r) => sum + r.simultaneousPowerW, 0);
  const criticalLoadEnergyWh = criticalItems.reduce((sum, r) => sum + r.dailyEnergyWh, 0);

  // Charges nocturnes
  const nightItems = results.filter((r) => r.isNightLoad);
  const nightLoadPowerW = nightItems.reduce((sum, r) => sum + r.simultaneousPowerW, 0);
  const nightLoadEnergyWh = nightItems.reduce((sum, r) => sum + r.dailyEnergyWh, 0);

  // Puissance de pointe réaliste :
  // = puissance simultanée nominale + plus grande surcharge de démarrage
  const maxSingleStartupSurge = results.reduce((max, r) => {
    const surge = r.totalPowerW * (r.startupFactor - 1);
    return surge > max ? surge : max;
  }, 0);
  const realisticPeakPowerW = simultaneousPowerW + maxSingleStartupSurge;

  // Ancienne méthode (pire cas) conservée pour compatibilité
  const maxStartupPowerW = results.reduce((sum, r) => sum + r.peakPowerW, 0);

  const motorLoadsPresent = results.some((r) => r.isMotorLoad);
  const criticalLoadsCount = criticalItems.length;

  return {
    items: results,
    totalNominalPowerW,
    simultaneousPowerW,
    totalDailyEnergyWh,
    criticalLoadPowerW,
    criticalLoadEnergyWh,
    nightLoadPowerW,
    nightLoadEnergyWh,
    maxStartupPowerW,
    realisticPeakPowerW,
    motorLoadsPresent,
    criticalLoadsCount,
  };
}

// ============================================================
// 2. PERTES SYSTÈME DÉTAILLÉES
// ============================================================

export const DEFAULT_SYSTEM_LOSSES: SystemLosses = {
  pvDeratingFactor: 0.90,
  mpptEfficiency: 0.97,
  inverterEfficiency: 0.92,
  batteryEfficiency: 0.95,
  dcCableLossPercent: 0.02,
  acCableLossPercent: 0.01,
  miscSystemLossPercent: 0.02,
  shadingFactor: 1.00,
  soilingFactor: 0.95,
  temperatureFactor: 0.95,
};

/**
 * Calcule le rendement détaillé du système à partir des pertes individuelles
 */
export function calculateDetailedEfficiency(losses: SystemLosses): DetailedEfficiencyResult {
  const detailedEfficiency =
    losses.pvDeratingFactor *
    losses.mpptEfficiency *
    losses.inverterEfficiency *
    losses.batteryEfficiency *
    (1 - losses.dcCableLossPercent) *
    (1 - losses.acCableLossPercent) *
    (1 - losses.miscSystemLossPercent) *
    losses.shadingFactor *
    losses.soilingFactor *
    losses.temperatureFactor;

  return {
    detailedEfficiency: Math.round(detailedEfficiency * 10000) / 10000,
    lossBreakdown: {
      pvDerating: 1 - losses.pvDeratingFactor,
      mppt: 1 - losses.mpptEfficiency,
      inverter: 1 - losses.inverterEfficiency,
      battery: 1 - losses.batteryEfficiency,
      dcCable: losses.dcCableLossPercent,
      acCable: losses.acCableLossPercent,
      misc: losses.miscSystemLossPercent,
      shading: 1 - losses.shadingFactor,
      soiling: 1 - losses.soilingFactor,
      temperature: 1 - losses.temperatureFactor,
    },
  };
}

// ============================================================
// 3. DIMENSIONNEMENT PV (avec pertes détaillées et marge)
// ============================================================

/**
 * Calcule la puissance PV nécessaire avec pertes détaillées
 */
export function calculatePvSizing(
  totalDailyEnergyWh: number,
  designInputs: DesignInputs,
  efficiency: DetailedEfficiencyResult
): PvSizingResult {
  // Énergie à produire = Énergie utile / Rendement détaillé
  const energyToProduceWh = totalDailyEnergyWh / efficiency.detailedEfficiency;

  // Puissance PV brute = Énergie à produire / Heures de pic solaire
  const pvGrossPowerWc = energyToProduceWh / designInputs.peakSunHours;

  // Puissance PV recommandée = Brute × (1 + Marge PV %)
  const pvRecommendedPowerWc = pvGrossPowerWc * (1 + designInputs.pvMarginPercent);

  // Nombre de panneaux = arrondi supérieur
  const panelsCount = Math.ceil(pvRecommendedPowerWc / designInputs.panelUnitPowerWc);

  // Puissance PV installée
  const totalInstalledPowerWc = panelsCount * designInputs.panelUnitPowerWc;

  // Marge réelle après arrondi
  const pvRealMarginPercent = (totalInstalledPowerWc - pvGrossPowerWc) / pvGrossPowerWc;

  return {
    pvGrossPowerWc: Math.round(pvGrossPowerWc * 100) / 100,
    pvRecommendedPowerWc: Math.round(pvRecommendedPowerWc * 100) / 100,
    requiredPvPowerWc: Math.round(pvRecommendedPowerWc * 100) / 100,
    panelUnitPowerWc: designInputs.panelUnitPowerWc,
    panelsCount,
    totalInstalledPowerWc,
    pvRealMarginPercent: Math.round(pvRealMarginPercent * 10000) / 10000,
  };
}

// ============================================================
// 4. DIMENSIONNEMENT BATTERIES (avec modes et facteurs correctifs)
// ============================================================

/**
 * Calcule la capacité batterie avec modes de dimensionnement et facteurs correctifs
 */
export function calculateBatterySizing(
  loadBalance: LoadBalanceResult,
  designInputs: DesignInputs
): BatterySizingResult {
  // Sélection de l'énergie de référence selon le mode
  let referenceEnergyWh: number;
  switch (designInputs.batterySizingMode) {
    case "critical_load":
      referenceEnergyWh = loadBalance.criticalLoadEnergyWh;
      break;
    case "night_load":
      referenceEnergyWh = loadBalance.nightLoadEnergyWh;
      break;
    case "hybrid_backup":
      // Charges critiques 100% + non-critiques × hybridBackupPercent
      const nonCriticalEnergy = loadBalance.totalDailyEnergyWh - loadBalance.criticalLoadEnergyWh;
      referenceEnergyWh = loadBalance.criticalLoadEnergyWh + nonCriticalEnergy * designInputs.hybridBackupPercent;
      break;
    case "total_load":
    default:
      referenceEnergyWh = loadBalance.totalDailyEnergyWh;
      break;
  }

  // Énergie autonomie = Énergie référence × Jours autonomie
  const autonomyEnergyWh = referenceEnergyWh * designInputs.autonomyDays;

  // Capacité nominale = Énergie autonomie / (DoD × Rendement batterie × Facteur vieillissement)
  const nominalCapacityWh = autonomyEnergyWh / (
    designInputs.batteryDischargeRate *
    designInputs.batteryAgeingFactor *
    designInputs.batteryTemperatureFactor
  );

  // Capacité recommandée = Nominale × (1 + Marge réserve)
  const recommendedCapacityWh = nominalCapacityWh * (1 + designInputs.batteryReserveMarginPercent);

  // Capacité Ah = Capacité Wh / Tension système
  const capacityAh = recommendedCapacityWh / designInputs.nominalVoltageV;

  // Nombre de modules (si batterie modulaire)
  const moduleCapacityWh = designInputs.batteryTechnology === "lithium" ? 5000 : (200 * 12); // 5kWh lithium ou 200Ah×12V plomb
  const modulesCount = Math.ceil(recommendedCapacityWh / moduleCapacityWh);

  // Autonomie réelle estimée
  const realAutonomyDays = referenceEnergyWh > 0
    ? (recommendedCapacityWh * designInputs.batteryDischargeRate * designInputs.batteryAgeingFactor) / referenceEnergyWh
    : 0;

  return {
    sizingMode: designInputs.batterySizingMode,
    referenceEnergyWh: Math.round(referenceEnergyWh * 100) / 100,
    autonomyEnergyWh: Math.round(autonomyEnergyWh * 100) / 100,
    nominalCapacityWh: Math.round(nominalCapacityWh * 100) / 100,
    recommendedCapacityWh: Math.round(recommendedCapacityWh * 100) / 100,
    capacityAh: Math.round(capacityAh * 100) / 100,
    capacityWh: Math.round(recommendedCapacityWh * 100) / 100,
    modulesCount,
    realAutonomyDays: Math.round(realAutonomyDays * 100) / 100,
    technology: designInputs.batteryTechnology,
    autonomyDays: designInputs.autonomyDays,
    nominalVoltageV: designInputs.nominalVoltageV,
    dischargeRate: designInputs.batteryDischargeRate,
  };
}

// ============================================================
// 5. DIMENSIONNEMENT ONDULEUR (avec surge et kVA)
// ============================================================

/**
 * Calcule la puissance onduleur avec surge réaliste et conversion kVA
 */
export function calculateInverterSizing(
  loadBalance: LoadBalanceResult,
  designInputs: DesignInputs
): InverterSizingResult {
  const { simultaneousPowerW, realisticPeakPowerW, motorLoadsPresent } = loadBalance;
  const safetyMargin = 1.25;

  // Puissance onduleur continue recommandée = simultanée × (1 + marge onduleur)
  const continuousRecommendedW = simultaneousPowerW * safetyMargin;

  // Puissance surge requise = pointe réaliste × (1 + marge surge)
  const surgeRequiredW = realisticPeakPowerW * (1 + designInputs.inverterSurgeMargin);

  // Puissance minimale = max(continue recommandée, surge / capacité surge onduleur)
  const minPowerW = continuousRecommendedW;

  // Puissance recommandée = max des deux critères
  const recommendedPowerW = Math.max(continuousRecommendedW, surgeRequiredW / 2);

  // Conversion kW → kVA
  const powerKva = recommendedPowerW / (designInputs.powerFactor * 1000);

  const coversStartup = recommendedPowerW * 2 >= realisticPeakPowerW;

  return {
    simultaneousPowerW: Math.round(simultaneousPowerW * 100) / 100,
    realisticPeakPowerW: Math.round(realisticPeakPowerW * 100) / 100,
    minPowerW: Math.round(minPowerW * 100) / 100,
    continuousRecommendedW: Math.round(continuousRecommendedW * 100) / 100,
    surgeRequiredW: Math.round(surgeRequiredW * 100) / 100,
    powerKva: Math.round(powerKva * 100) / 100,
    recommendedPowerW: Math.round(recommendedPowerW * 100) / 100,
    safetyMargin,
    coversStartup,
    motorAlert: motorLoadsPresent,
  };
}

// ============================================================
// 6. DIMENSIONNEMENT CÂBLES (avec ampacité et pertes détaillées)
// ============================================================

/**
 * Trouve la section commerciale supérieure ou égale à la section théorique
 */
export function findCommercialSection(theoreticalSection: number): number {
  for (const section of COMMERCIAL_SECTIONS) {
    if (section >= theoreticalSection) {
      return section;
    }
  }
  return COMMERCIAL_SECTIONS[COMMERCIAL_SECTIONS.length - 1];
}

/**
 * Trouve l'ampacité pour une section donnée
 */
export function getAmpacity(sectionMm2: number, ampacityTable?: AmpacityRecord[]): number {
  const table = ampacityTable || DEFAULT_AMPACITY;
  const record = table.find((r) => r.sectionMm2 >= sectionMm2);
  return record ? record.ampacityA : table[table.length - 1].ampacityA;
}

/**
 * Calcule le dimensionnement câble pour une ligne avec pertes et ampacité
 */
export function calculateCableSizing(
  lineName: string,
  cableType: string,
  fromEquipment: string,
  toEquipment: string,
  powerW: number,
  voltageV: number,
  lengthM: number,
  voltageDropTarget: number,
  usageHoursPerDay: number = 8,
  ampacityTable?: AmpacityRecord[]
): CableSizingResult {
  // Intensité = Puissance / Tension
  const currentA = powerW / voltageV;

  // Section théorique = (ρ × 2 × L × I) / (ΔV_cible × V)
  const theoreticalSectionMm2 =
    (COPPER_RESISTIVITY * 2 * lengthM * currentA) /
    (voltageDropTarget * voltageV);

  const selectedSectionMm2 = findCommercialSection(theoreticalSectionMm2);

  // Vérification ampacité
  const ampacityLimitA = getAmpacity(selectedSectionMm2, ampacityTable);
  let ampacityStatus: CableSizingResult["ampacityStatus"] = "OK";
  if (currentA > ampacityLimitA) {
    ampacityStatus = "Critical";
  } else if (currentA > ampacityLimitA * 0.8) {
    ampacityStatus = "Warning";
  }

  // Si ampacité insuffisante, augmenter la section
  let finalSectionMm2 = selectedSectionMm2;
  if (currentA > ampacityLimitA) {
    // Trouver une section avec ampacité suffisante
    const table = ampacityTable || DEFAULT_AMPACITY;
    const suitable = table.find((r) => r.ampacityA >= currentA);
    if (suitable) {
      finalSectionMm2 = suitable.sectionMm2;
      ampacityStatus = "Needs Engineer Review";
    }
  }

  // Résistance du câble = ρ × 2 × L / S
  const resistanceOhm = (COPPER_RESISTIVITY * 2 * lengthM) / finalSectionMm2;

  // Chute de tension réelle
  const voltageDropV = resistanceOhm * currentA;
  const voltageDropPercent = voltageDropV / voltageV;

  // Pertes de puissance = R × I²
  const powerLossW = resistanceOhm * currentA * currentA;

  // Pertes d'énergie = Pertes × heures d'utilisation
  const energyLossWhDay = powerLossW * usageHoursPerDay;

  // Pourcentage de pertes
  const lossPercent = powerW > 0 ? powerLossW / powerW : 0;

  // Recommandation de protection
  let protectionRecommendation = `Disjoncteur ${Math.ceil(currentA * 1.25)}A`;
  if (currentA > 100) {
    protectionRecommendation += " + fusible de secours";
  }

  return {
    cableType,
    lineName,
    fromEquipment,
    toEquipment,
    voltageV,
    powerW,
    lengthM,
    currentA: Math.round(currentA * 100) / 100,
    theoreticalSectionMm2: Math.round(theoreticalSectionMm2 * 100) / 100,
    selectedSectionMm2: finalSectionMm2,
    recommendedCommercialSectionMm2: finalSectionMm2,
    voltageDropV: Math.round(voltageDropV * 10000) / 10000,
    voltageDropPercent: Math.round(voltageDropPercent * 10000) / 10000,
    resistanceOhm: Math.round(resistanceOhm * 10000) / 10000,
    powerLossW: Math.round(powerLossW * 100) / 100,
    energyLossWhDay: Math.round(energyLossWhDay * 100) / 100,
    lossPercent: Math.round(lossPercent * 10000) / 10000,
    ampacityLimitA,
    ampacityStatus,
    protectionRecommendation,
    material: "copper",
  };
}

/**
 * Calcule tous les câbles du projet avec lignes détaillées
 */
export function calculateAllCables(
  pvPowerWc: number,
  batteryCapacityWh: number,
  loadBalance: LoadBalanceResult,
  designInputs: DesignInputs,
  ampacityTable?: AmpacityRecord[]
): CableSizingResult[] {
  const cables: CableSizingResult[] = [];

  // Tension PV = tension chaîne si définie, sinon tension système
  const pvVoltage = designInputs.pvStringVoltageV || designInputs.nominalVoltageV;

  // Ligne 1 : Panneaux → MPPT/Onduleur (DC)
  cables.push(
    calculateCableSizing(
      "Panneaux → Onduleur",
      "dc_pv",
      "Champ PV",
      "Onduleur/MPPT",
      pvPowerWc,
      pvVoltage,
      designInputs.panelToInverterCableLengthM,
      designInputs.voltageDropTarget,
      designInputs.peakSunHours,
      ampacityTable
    )
  );

  // Ligne 2 : Batteries → Onduleur (DC)
  // Puissance batterie = puissance simultanée (cas de décharge max)
  const batteryPowerW = loadBalance.simultaneousPowerW;
  cables.push(
    calculateCableSizing(
      "Batteries → Onduleur",
      "dc_battery",
      "Parc batteries",
      "Onduleur",
      batteryPowerW,
      designInputs.nominalVoltageV,
      designInputs.batteryToInverterCableLengthM,
      designInputs.voltageDropTarget,
      12, // batteries peuvent débiter 12h/jour
      ampacityTable
    )
  );

  // Ligne 3 : Onduleur → Tableau AC (si données disponibles)
  const acCableLength = 5; // valeur par défaut 5m
  cables.push(
    calculateCableSizing(
      "Onduleur → Tableau AC",
      "ac_main",
      "Onduleur",
      "Tableau AC",
      loadBalance.simultaneousPowerW,
      230, // tension AC
      acCableLength,
      0.03, // 3% chute tension AC
      12,
      ampacityTable
    )
  );

  return cables;
}

// ============================================================
// 7. DIMENSIONNEMENT COMPLET
// ============================================================

/**
 * Exécute le dimensionnement complet du système solaire
 */
export function calculateFullSizing(
  loadBalance: LoadBalanceResult,
  designInputs: DesignInputs,
  systemLosses?: SystemLosses
): SizingResult {
  const losses = systemLosses || DEFAULT_SYSTEM_LOSSES;
  const efficiency = calculateDetailedEfficiency(losses);

  const pv = calculatePvSizing(loadBalance.totalDailyEnergyWh, designInputs, efficiency);
  const battery = calculateBatterySizing(loadBalance, designInputs);
  const inverter = calculateInverterSizing(loadBalance, designInputs);
  const cables = calculateAllCables(
    pv.totalInstalledPowerWc,
    battery.capacityWh,
    loadBalance,
    designInputs
  );

  return {
    pv,
    battery,
    inverter,
    cables,
    efficiency,
    loadBalance: {
      totalNominalPowerW: loadBalance.totalNominalPowerW,
      simultaneousPowerW: loadBalance.simultaneousPowerW,
      totalDailyEnergyWh: loadBalance.totalDailyEnergyWh,
      criticalDailyEnergyWh: loadBalance.criticalLoadEnergyWh,
      nightDailyEnergyWh: loadBalance.nightLoadEnergyWh,
      realisticPeakPowerW: loadBalance.realisticPeakPowerW,
    },
  };
}

// ============================================================
// 8. BUDGET ESTIMATIF DÉTAILLÉ
// ============================================================

/**
 * Calcule le budget estimatif détaillé par lots
 */
export function calculateBudget(
  sizing: SizingResult,
  prices: PriceCatalog,
  currency: string = "XOF"
): BudgetResult {
  const lines: BudgetLine[] = [];
  let lotNumber = 1;

  // === LOT 1 : PANNEAUX SOLAIRES ===
  const panelsQty = sizing.pv.panelsCount;
  const panelsUnitPrice = sizing.pv.panelUnitPowerWc * prices.pricePerWcPanel;
  const panelsAmount = panelsQty * panelsUnitPrice;
  lines.push({
    lotNumber,
    lotName: "Panneaux solaires",
    category: "panels",
    quantity: panelsQty,
    unit: "pcs",
    unitPrice: Math.round(panelsUnitPrice),
    amount: Math.round(panelsAmount),
    calculationMethod: `${panelsQty} × ${sizing.pv.panelUnitPowerWc}Wc × ${prices.pricePerWcPanel} ${currency}/Wc`,
  });
  lotNumber++;

  // === LOT 2 : BATTERIES ===
  if (sizing.battery.technology === "lithium") {
    const battCount = Math.ceil(sizing.battery.capacityWh / prices.lithiumUnitCapacityWh);
    const battAmount = battCount * prices.pricePerUnitLithium;
    lines.push({
      lotNumber,
      lotName: "Batteries lithium",
      category: "batteries",
      quantity: battCount,
      unit: "pcs",
      unitPrice: prices.pricePerUnitLithium,
      amount: Math.round(battAmount),
      calculationMethod: `${Math.round(sizing.battery.capacityWh)}Wh / ${prices.lithiumUnitCapacityWh}Wh = ${battCount} × ${prices.pricePerUnitLithium.toLocaleString()} ${currency}`,
    });
  } else {
    const battCount = Math.ceil(sizing.battery.capacityAh / prices.plombUnitCapacityAh);
    const battAmount = battCount * prices.pricePerUnitPlomb;
    lines.push({
      lotNumber,
      lotName: "Batteries plomb",
      category: "batteries",
      quantity: battCount,
      unit: "pcs",
      unitPrice: prices.pricePerUnitPlomb,
      amount: Math.round(battAmount),
      calculationMethod: `${Math.round(sizing.battery.capacityAh)}Ah / ${prices.plombUnitCapacityAh}Ah = ${battCount} × ${prices.pricePerUnitPlomb.toLocaleString()} ${currency}`,
    });
  }
  lotNumber++;

  // === LOT 3 : ONDULEUR / RÉGULATEUR ===
  const inverterAmount = sizing.inverter.recommendedPowerW * prices.pricePerWInverter;
  lines.push({
    lotNumber,
    lotName: "Onduleur / Régulateur",
    category: "inverter",
    quantity: 1,
    unit: "pcs",
    unitPrice: Math.round(inverterAmount),
    amount: Math.round(inverterAmount),
    calculationMethod: `${Math.round(sizing.inverter.recommendedPowerW)}W × ${prices.pricePerWInverter} ${currency}/W`,
  });
  lotNumber++;

  // === LOT 4 : CÂBLAGE ===
  let cableTotal = 0;
  for (const cable of sizing.cables) {
    const pricePerM = cable.cableType === "dc_pv"
      ? (prices.pricePerMeterCablePV || prices.pricePerMeterCable * cable.selectedSectionMm2 / 10)
      : cable.cableType === "dc_battery"
        ? (prices.pricePerMeterCableBattery || prices.pricePerMeterCable * cable.selectedSectionMm2 / 10)
        : (prices.pricePerMeterCableAC || prices.pricePerMeterCable * cable.selectedSectionMm2 / 10);
    cableTotal += cable.lengthM * pricePerM;
  }
  const totalCableLength = sizing.cables.reduce((sum, c) => sum + c.lengthM, 0);
  lines.push({
    lotNumber,
    lotName: "Câbles et connectique",
    category: "cables",
    quantity: Math.round(totalCableLength),
    unit: "m",
    unitPrice: Math.round(cableTotal / totalCableLength),
    amount: Math.round(cableTotal),
    calculationMethod: `${Math.round(totalCableLength)}m (PV + Batt + AC) × prix/m selon section`,
  });
  lotNumber++;

  // === LOT 5 : PROTECTIONS ===
  const priceCoffretDC = prices.priceCoffretDC || 85000;
  const priceCoffretAC = prices.priceCoffretAC || 65000;
  const priceDisjoncteurDC = prices.priceDisjoncteurDC || 35000;
  const priceDisjoncteurAC = prices.priceDisjoncteurAC || 25000;
  const priceParafoudre = prices.priceParafoudre || 45000;
  const priceFusible = prices.priceFusible || 8000;
  const priceMiseATerre = prices.priceMiseATerre || 120000;

  const protectionsAmount = priceCoffretDC + priceCoffretAC +
    priceDisjoncteurDC * 2 + priceDisjoncteurAC * 2 +
    priceParafoudre * 2 + priceFusible * 4 + priceMiseATerre;
  lines.push({
    lotNumber,
    lotName: "Protections électriques",
    category: "protections",
    quantity: 1,
    unit: "fft",
    unitPrice: Math.round(protectionsAmount),
    amount: Math.round(protectionsAmount),
    calculationMethod: `Coffrets DC/AC + disjoncteurs + parafoudres + fusibles + terre`,
  });
  lotNumber++;

  // Sous-total matériel
  const subtotalMaterial = lines.reduce((sum, l) => sum + l.amount, 0);

  // === LOT 6 : STRUCTURES ET ACCESSOIRES ===
  const structuresAmount = subtotalMaterial * prices.structuresCoffretsPercent;
  lines.push({
    lotNumber,
    lotName: "Structures, supports et accessoires",
    category: "structures",
    quantity: 1,
    unit: "fft",
    unitPrice: Math.round(structuresAmount),
    amount: Math.round(structuresAmount),
    calculationMethod: `${(prices.structuresCoffretsPercent * 100).toFixed(0)}% du matériel`,
  });
  lotNumber++;

  const subtotalProtections = protectionsAmount + structuresAmount;

  // === LOT 7 : INSTALLATION ET TRANSPORT ===
  const installAmount = subtotalMaterial * prices.installationTransportPercent;
  lines.push({
    lotNumber,
    lotName: "Installation et mise en service",
    category: "installation",
    quantity: 1,
    unit: "fft",
    unitPrice: Math.round(installAmount),
    amount: Math.round(installAmount),
    calculationMethod: `${(prices.installationTransportPercent * 100).toFixed(0)}% du matériel`,
  });
  lotNumber++;

  // === LOT 8 : TRANSPORT ===
  const transportPercent = prices.transportPercent || 0.05;
  const transportAmount = subtotalMaterial * transportPercent;
  lines.push({
    lotNumber,
    lotName: "Transport et logistique",
    category: "transport",
    quantity: 1,
    unit: "fft",
    unitPrice: Math.round(transportAmount),
    amount: Math.round(transportAmount),
    calculationMethod: `${(transportPercent * 100).toFixed(0)}% du matériel`,
  });
  lotNumber++;

  // === LOT 9 : INGÉNIERIE ===
  const engineeringPercent = prices.engineeringPercent || 0.08;
  const engineeringAmount = subtotalMaterial * engineeringPercent;
  lines.push({
    lotNumber,
    lotName: "Ingénierie et documentation",
    category: "engineering",
    quantity: 1,
    unit: "fft",
    unitPrice: Math.round(engineeringAmount),
    amount: Math.round(engineeringAmount),
    calculationMethod: `${(engineeringPercent * 100).toFixed(0)}% du matériel`,
  });
  lotNumber++;

  // === LOT 10 : CONTINGENCE ===
  const contingencyPercent = prices.contingencyPercent || 0.05;
  const contingencyAmount = subtotalMaterial * contingencyPercent;
  lines.push({
    lotNumber,
    lotName: "Contingence",
    category: "contingency",
    quantity: 1,
    unit: "fft",
    unitPrice: Math.round(contingencyAmount),
    amount: Math.round(contingencyAmount),
    calculationMethod: `${(contingencyPercent * 100).toFixed(0)}% du matériel`,
  });

  const subtotalPrestations = installAmount + transportAmount + engineeringAmount + contingencyAmount;
  const totalInvestment = lines.reduce((sum, l) => sum + l.amount, 0);

  return {
    lines,
    subtotalMaterial,
    subtotalProtections,
    subtotalPrestations,
    totalInvestment,
    currency,
  };
}

// ============================================================
// 9. PRIX PAR DÉFAUT (Afrique de l'Ouest)
// ============================================================

export const DEFAULT_PRICES: PriceCatalog = {
  pricePerWcPanel: 350,
  pricePerUnitLithium: 650000,
  lithiumUnitCapacityWh: 5000,
  pricePerUnitPlomb: 190000,
  plombUnitCapacityAh: 200,
  pricePerWInverter: 200,
  pricePerMeterCable: 150,
  structuresCoffretsPercent: 0.10,
  installationTransportPercent: 0.15,
  priceCoffretDC: 85000,
  priceCoffretAC: 65000,
  priceDisjoncteurDC: 35000,
  priceDisjoncteurAC: 25000,
  priceParafoudre: 45000,
  priceFusible: 8000,
  priceMiseATerre: 120000,
  engineeringPercent: 0.08,
  contingencyPercent: 0.05,
  transportPercent: 0.05,
};

// ============================================================
// 10. DESIGN INPUTS PAR DÉFAUT
// ============================================================

export const DEFAULT_DESIGN_INPUTS: DesignInputs = {
  nominalVoltageV: 48,
  batteryTechnology: "lithium",
  autonomyDays: 2,
  peakSunHours: 4.5,
  panelUnitPowerWc: 550,
  panelToInverterCableLengthM: 10,
  batteryToInverterCableLengthM: 3,
  globalEfficiency: 0.75,
  batteryDischargeRate: 0.80,
  voltageDropTarget: 0.03,
  // Sprint Finalisation Technique
  batterySizingMode: "total_load",
  hybridBackupPercent: 0.30,
  pvStringVoltageV: undefined,
  batteryAgeingFactor: 0.80,
  batteryTemperatureFactor: 0.95,
  batteryReserveMarginPercent: 0.10,
  powerFactor: 0.85,
  inverterSurgeMargin: 0.10,
  pvMarginPercent: 0.15,
};
