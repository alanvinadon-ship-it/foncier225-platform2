/**
 * ERP Solar Calculation Engine
 * Moteur de calcul pour le dimensionnement solaire
 * Reproduit les formules Excel du fichier Agiles Energies -Dim.xlsx
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
}

export interface LoadBalanceResult {
  items: LoadItemResult[];
  totalNominalPowerW: number;
  totalDailyEnergyWh: number;
  maxStartupPowerW: number;
  criticalLoadPowerW: number;
  criticalLoadEnergyWh: number;
}

export interface LoadItemResult extends LoadItem {
  totalPowerW: number;
  peakPowerW: number;
  dailyEnergyWh: number;
}

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
}

export interface SizingResult {
  pv: PvSizingResult;
  battery: BatterySizingResult;
  inverter: InverterSizingResult;
  cables: CableSizingResult[];
}

export interface PvSizingResult {
  requiredPvPowerWc: number;
  panelUnitPowerWc: number;
  panelsCount: number;
  totalInstalledPowerWc: number;
}

export interface BatterySizingResult {
  capacityAh: number;
  capacityWh: number;
  technology: string;
  autonomyDays: number;
  nominalVoltageV: number;
  dischargeRate: number;
}

export interface InverterSizingResult {
  minPowerW: number;
  recommendedPowerW: number;
  safetyMargin: number;
  coversStartup: boolean;
}

export interface CableSizingResult {
  cableType: string;
  lineName: string;
  lengthM: number;
  currentA: number;
  theoreticalSectionMm2: number;
  recommendedCommercialSectionMm2: number;
  voltageDropPercent: number;
  material: string;
}

export interface BudgetLine {
  lotNumber: number;
  lotName: string;
  category: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  amount: number;
  calculationMethod: string;
}

export interface BudgetResult {
  lines: BudgetLine[];
  totalInvestment: number;
  currency: string;
}

export interface PriceCatalog {
  pricePerWcPanel: number;
  pricePerWhLithium: number;
  pricePerAhPlomb: number;
  pricePerWInverter: number;
  pricePerMeterCable: number;
  structuresCoffretsPercent: number;
  installationTransportPercent: number;
}

// ============================================================
// CONSTANTES
// ============================================================

const COPPER_RESISTIVITY = 0.0175; // Ω·mm²/m à 20°C
const COMMERCIAL_SECTIONS = [2.5, 4, 6, 10, 16, 25, 35, 50, 70, 95, 120];
const INVERTER_SAFETY_MARGIN = 1.25;
const INVERTER_STARTUP_MARGIN = 1.1;

// ============================================================
// 1. BILAN DE PUISSANCE
// ============================================================

/**
 * Calcule le bilan de puissance complet à partir des équipements
 */
export function calculateLoadBalance(items: LoadItem[]): LoadBalanceResult {
  const results: LoadItemResult[] = items.map((item) => {
    const totalPowerW = item.unitPowerW * item.quantity;
    const peakPowerW = totalPowerW * item.startupFactor;
    const dailyEnergyWh = totalPowerW * item.usageHoursPerDay;

    return {
      ...item,
      totalPowerW,
      peakPowerW,
      dailyEnergyWh,
    };
  });

  const totalNominalPowerW = results.reduce((sum, r) => sum + r.totalPowerW, 0);
  const totalDailyEnergyWh = results.reduce((sum, r) => sum + r.dailyEnergyWh, 0);

  // Puissance max démarrage = max(peakPower d'un équipement) + somme des autres charges nominales
  // Simplification : somme des peakPower (pire cas simultané)
  const maxStartupPowerW = results.reduce((sum, r) => sum + r.peakPowerW, 0);

  const criticalItems = results.filter((r) => r.isCriticalLoad);
  const criticalLoadPowerW = criticalItems.reduce((sum, r) => sum + r.totalPowerW, 0);
  const criticalLoadEnergyWh = criticalItems.reduce((sum, r) => sum + r.dailyEnergyWh, 0);

  return {
    items: results,
    totalNominalPowerW,
    totalDailyEnergyWh,
    maxStartupPowerW,
    criticalLoadPowerW,
    criticalLoadEnergyWh,
  };
}

// ============================================================
// 2. DIMENSIONNEMENT PV
// ============================================================

/**
 * Calcule la puissance PV nécessaire et le nombre de panneaux
 */
export function calculatePvSizing(
  totalDailyEnergyWh: number,
  designInputs: DesignInputs
): PvSizingResult {
  // Puissance PV nécessaire = Énergie journalière / (Rendement global × Heures pic solaire)
  const requiredPvPowerWc =
    totalDailyEnergyWh / (designInputs.globalEfficiency * designInputs.peakSunHours);

  // Nombre de panneaux = arrondi supérieur(Puissance PV nécessaire / Puissance unitaire panneau)
  const panelsCount = Math.ceil(requiredPvPowerWc / designInputs.panelUnitPowerWc);

  const totalInstalledPowerWc = panelsCount * designInputs.panelUnitPowerWc;

  return {
    requiredPvPowerWc: Math.round(requiredPvPowerWc * 100) / 100,
    panelUnitPowerWc: designInputs.panelUnitPowerWc,
    panelsCount,
    totalInstalledPowerWc,
  };
}

// ============================================================
// 3. DIMENSIONNEMENT BATTERIES
// ============================================================

/**
 * Calcule la capacité batterie nécessaire
 */
export function calculateBatterySizing(
  totalDailyEnergyWh: number,
  designInputs: DesignInputs
): BatterySizingResult {
  // Capacité Ah = (Énergie journalière × Jours autonomie) / (Tension nominale × Taux décharge)
  const capacityAh =
    (totalDailyEnergyWh * designInputs.autonomyDays) /
    (designInputs.nominalVoltageV * designInputs.batteryDischargeRate);

  // Capacité Wh = Capacité Ah × Tension nominale
  const capacityWh = capacityAh * designInputs.nominalVoltageV;

  return {
    capacityAh: Math.round(capacityAh * 100) / 100,
    capacityWh: Math.round(capacityWh * 100) / 100,
    technology: designInputs.batteryTechnology,
    autonomyDays: designInputs.autonomyDays,
    nominalVoltageV: designInputs.nominalVoltageV,
    dischargeRate: designInputs.batteryDischargeRate,
  };
}

// ============================================================
// 4. DIMENSIONNEMENT ONDULEUR
// ============================================================

/**
 * Calcule la puissance onduleur nécessaire
 */
export function calculateInverterSizing(
  totalNominalPowerW: number,
  maxStartupPowerW: number
): InverterSizingResult {
  // Puissance onduleur minimale = Puissance nominale cumulée × 1.25
  const minPowerW = totalNominalPowerW * INVERTER_SAFETY_MARGIN;

  // Puissance onduleur recommandée = max(nominale × 1.25, démarrage × marge sécurité)
  const recommendedPowerW = Math.max(
    minPowerW,
    maxStartupPowerW * INVERTER_STARTUP_MARGIN
  );

  const coversStartup = recommendedPowerW >= maxStartupPowerW;

  return {
    minPowerW: Math.round(minPowerW * 100) / 100,
    recommendedPowerW: Math.round(recommendedPowerW * 100) / 100,
    safetyMargin: INVERTER_SAFETY_MARGIN,
    coversStartup,
  };
}

// ============================================================
// 5. DIMENSIONNEMENT CÂBLES
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
 * Calcule le dimensionnement câble pour une ligne
 */
export function calculateCableSizing(
  lineName: string,
  cableType: string,
  powerW: number,
  nominalVoltageV: number,
  lengthM: number,
  voltageDropTarget: number
): CableSizingResult {
  // Intensité = Puissance / Tension nominale
  const currentA = powerW / nominalVoltageV;

  // Section cuivre = (Résistivité × 2 × Longueur × Intensité) / (Chute tension cible × Tension)
  const theoreticalSectionMm2 =
    (COPPER_RESISTIVITY * 2 * lengthM * currentA) /
    (voltageDropTarget * nominalVoltageV);

  const recommendedCommercialSectionMm2 = findCommercialSection(theoreticalSectionMm2);

  // Chute de tension réelle avec section commerciale
  const voltageDropPercent =
    (COPPER_RESISTIVITY * 2 * lengthM * currentA) /
    (recommendedCommercialSectionMm2 * nominalVoltageV);

  return {
    cableType,
    lineName,
    lengthM,
    currentA: Math.round(currentA * 100) / 100,
    theoreticalSectionMm2: Math.round(theoreticalSectionMm2 * 100) / 100,
    recommendedCommercialSectionMm2,
    voltageDropPercent: Math.round(voltageDropPercent * 10000) / 10000,
    material: "copper",
  };
}

/**
 * Calcule tous les câbles du projet
 */
export function calculateAllCables(
  pvPowerWc: number,
  batteryCapacityWh: number,
  designInputs: DesignInputs
): CableSizingResult[] {
  const cables: CableSizingResult[] = [];

  // Ligne panneaux → onduleur
  cables.push(
    calculateCableSizing(
      "Panneaux → Onduleur",
      "dc_pv",
      pvPowerWc,
      designInputs.nominalVoltageV,
      designInputs.panelToInverterCableLengthM,
      designInputs.voltageDropTarget
    )
  );

  // Ligne batteries → onduleur
  // Puissance batterie ≈ capacité Wh / autonomie heures (décharge max)
  const batteryPowerW = batteryCapacityWh / (designInputs.autonomyDays * 24) * 10; // approximation courant max
  cables.push(
    calculateCableSizing(
      "Batteries → Onduleur",
      "dc_battery",
      batteryPowerW,
      designInputs.nominalVoltageV,
      designInputs.batteryToInverterCableLengthM,
      designInputs.voltageDropTarget
    )
  );

  return cables;
}

// ============================================================
// 6. DIMENSIONNEMENT COMPLET
// ============================================================

/**
 * Exécute le dimensionnement complet du système solaire
 */
export function calculateFullSizing(
  loadBalance: LoadBalanceResult,
  designInputs: DesignInputs
): SizingResult {
  const pv = calculatePvSizing(loadBalance.totalDailyEnergyWh, designInputs);
  const battery = calculateBatterySizing(loadBalance.totalDailyEnergyWh, designInputs);
  const inverter = calculateInverterSizing(
    loadBalance.totalNominalPowerW,
    loadBalance.maxStartupPowerW
  );
  const cables = calculateAllCables(pv.totalInstalledPowerWc, battery.capacityWh, designInputs);

  return { pv, battery, inverter, cables };
}

// ============================================================
// 7. BUDGET ESTIMATIF
// ============================================================

/**
 * Calcule le budget estimatif par lots
 */
export function calculateBudget(
  sizing: SizingResult,
  prices: PriceCatalog,
  currency: string = "XOF"
): BudgetResult {
  const lines: BudgetLine[] = [];
  let lotNumber = 1;

  // Lot 1 : Panneaux solaires
  const panelsQty = sizing.pv.panelsCount;
  const panelsUnitPrice = sizing.pv.panelUnitPowerWc * prices.pricePerWcPanel;
  const panelsAmount = panelsQty * panelsUnitPrice;
  lines.push({
    lotNumber: lotNumber++,
    lotName: "Panneaux solaires",
    category: "panels",
    quantity: panelsQty,
    unit: "pcs",
    unitPrice: Math.round(panelsUnitPrice),
    amount: Math.round(panelsAmount),
    calculationMethod: `${panelsQty} panneaux × ${sizing.pv.panelUnitPowerWc} Wc × ${prices.pricePerWcPanel} ${currency}/Wc`,
  });

  // Lot 2 : Batteries
  if (sizing.battery.technology === "lithium") {
    const battAmount = sizing.battery.capacityWh * prices.pricePerWhLithium;
    lines.push({
      lotNumber: lotNumber++,
      lotName: "Batteries lithium",
      category: "batteries",
      quantity: sizing.battery.capacityWh,
      unit: "Wh",
      unitPrice: prices.pricePerWhLithium,
      amount: Math.round(battAmount),
      calculationMethod: `${Math.round(sizing.battery.capacityWh)} Wh × ${prices.pricePerWhLithium} ${currency}/Wh`,
    });
  } else {
    const battAmount = sizing.battery.capacityAh * prices.pricePerAhPlomb;
    lines.push({
      lotNumber: lotNumber++,
      lotName: "Batteries plomb",
      category: "batteries",
      quantity: sizing.battery.capacityAh,
      unit: "Ah",
      unitPrice: prices.pricePerAhPlomb,
      amount: Math.round(battAmount),
      calculationMethod: `${Math.round(sizing.battery.capacityAh)} Ah × ${prices.pricePerAhPlomb} ${currency}/Ah`,
    });
  }

  // Lot 3 : Onduleur
  const inverterAmount = sizing.inverter.recommendedPowerW * prices.pricePerWInverter;
  lines.push({
    lotNumber: lotNumber++,
    lotName: "Onduleur / Régulateur",
    category: "inverter",
    quantity: 1,
    unit: "pcs",
    unitPrice: Math.round(inverterAmount),
    amount: Math.round(inverterAmount),
    calculationMethod: `${Math.round(sizing.inverter.recommendedPowerW)} W × ${prices.pricePerWInverter} ${currency}/W`,
  });

  // Lot 4 : Câbles
  const totalCableLength = sizing.cables.reduce((sum, c) => sum + c.lengthM, 0);
  const avgSection = sizing.cables.length > 0
    ? sizing.cables.reduce((sum, c) => sum + c.recommendedCommercialSectionMm2, 0) / sizing.cables.length
    : 10;
  const cableAmount = totalCableLength * avgSection * prices.pricePerMeterCable;
  lines.push({
    lotNumber: lotNumber++,
    lotName: "Câbles et connectique",
    category: "cables",
    quantity: totalCableLength,
    unit: "m",
    unitPrice: Math.round(avgSection * prices.pricePerMeterCable),
    amount: Math.round(cableAmount),
    calculationMethod: `${totalCableLength} m × section moy. ${avgSection.toFixed(1)} mm² × ${prices.pricePerMeterCable} ${currency}/m·mm²`,
  });

  // Sous-total matériel
  const subtotalMaterial = lines.reduce((sum, l) => sum + l.amount, 0);

  // Lot 5 : Structures et coffrets (% sur matériel)
  const structuresAmount = subtotalMaterial * prices.structuresCoffretsPercent;
  lines.push({
    lotNumber: lotNumber++,
    lotName: "Structures, coffrets et accessoires",
    category: "structures",
    quantity: 1,
    unit: "fft",
    unitPrice: Math.round(structuresAmount),
    amount: Math.round(structuresAmount),
    calculationMethod: `${(prices.structuresCoffretsPercent * 100).toFixed(0)}% du matériel (${Math.round(subtotalMaterial)} ${currency})`,
  });

  // Lot 6 : Installation et transport (% sur matériel)
  const installAmount = subtotalMaterial * prices.installationTransportPercent;
  lines.push({
    lotNumber: lotNumber++,
    lotName: "Installation, transport et mise en service",
    category: "installation",
    quantity: 1,
    unit: "fft",
    unitPrice: Math.round(installAmount),
    amount: Math.round(installAmount),
    calculationMethod: `${(prices.installationTransportPercent * 100).toFixed(0)}% du matériel (${Math.round(subtotalMaterial)} ${currency})`,
  });

  const totalInvestment = lines.reduce((sum, l) => sum + l.amount, 0);

  return {
    lines,
    totalInvestment,
    currency,
  };
}

// ============================================================
// 8. PRIX PAR DÉFAUT (Afrique de l'Ouest)
// ============================================================

export const DEFAULT_PRICES: PriceCatalog = {
  pricePerWcPanel: 350, // XOF/Wc
  pricePerWhLithium: 250, // XOF/Wh
  pricePerAhPlomb: 4500, // XOF/Ah
  pricePerWInverter: 200, // XOF/W
  pricePerMeterCable: 150, // XOF/m·mm²
  structuresCoffretsPercent: 0.10, // 10%
  installationTransportPercent: 0.15, // 15%
};

// ============================================================
// 9. DESIGN INPUTS PAR DÉFAUT
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
};
