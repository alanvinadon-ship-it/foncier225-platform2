import { describe, it, expect } from "vitest";
import {
  calculateLoadBalance,
  calculatePvSizing,
  calculateBatterySizing,
  calculateInverterSizing,
  findCommercialSection,
  calculateCableSizing,
  calculateFullSizing,
  calculateBudget,
  calculateDetailedEfficiency,
  DEFAULT_SYSTEM_LOSSES,
  type LoadItem,
  type DesignInputs,
  type PriceCatalog,
} from "./erp-solar-calculation-engine.service";

// ============================================================
// DONNÉES DE TEST
// ============================================================

const sampleLoads: LoadItem[] = [
  {
    equipmentName: "Climatiseur Split",
    equipmentCategory: "cooling",
    unitPowerW: 1500,
    quantity: 2,
    startupFactor: 3,
    usageHoursPerDay: 8,
    isCriticalLoad: false,
    isNightLoad: false,
    isMotorLoad: true,
    simultaneityCoeff: 0.8,
    priorityLevel: "important",
  },
  {
    equipmentName: "Éclairage LED",
    equipmentCategory: "lighting",
    unitPowerW: 50,
    quantity: 10,
    startupFactor: 1,
    usageHoursPerDay: 12,
    isCriticalLoad: true,
    isNightLoad: true,
    isMotorLoad: false,
    simultaneityCoeff: 1.0,
    priorityLevel: "critical",
  },
  {
    equipmentName: "Réfrigérateur",
    equipmentCategory: "appliances",
    unitPowerW: 200,
    quantity: 1,
    startupFactor: 2.5,
    usageHoursPerDay: 24,
    isCriticalLoad: true,
    isNightLoad: true,
    isMotorLoad: true,
    simultaneityCoeff: 1.0,
    priorityLevel: "critical",
  },
];

const sampleDesignInputs: DesignInputs = {
  nominalVoltageV: 48,
  batteryTechnology: "lithium",
  autonomyDays: 2,
  peakSunHours: 5,
  panelUnitPowerWc: 400,
  panelToInverterCableLengthM: 15,
  batteryToInverterCableLengthM: 3,
  globalEfficiency: 0.75,
  batteryDischargeRate: 0.8,
  voltageDropTarget: 0.03,
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

const samplePriceCatalog: PriceCatalog = {
  pricePerWcPanel: 500,
  pricePerUnitLithium: 650000,
  lithiumUnitCapacityWh: 5000,
  pricePerUnitPlomb: 190000,
  plombUnitCapacityAh: 200,
  pricePerWInverter: 300,
  pricePerMeterCable: 2500,
  structuresCoffretsPercent: 0.1,
  installationTransportPercent: 0.15,
};

// ============================================================
// TESTS
// ============================================================

describe("ERP Solar Calculation Engine", () => {
  describe("calculateLoadBalance", () => {
    it("calcule correctement le bilan de puissance", () => {
      const result = calculateLoadBalance(sampleLoads);

      // Total nominal = (1500×2) + (50×10) + (200×1) = 3000 + 500 + 200 = 3700 W
      expect(result.totalNominalPowerW).toBe(3700);

      // Simultanée = (1500×2×0.8) + (50×10×1.0) + (200×1×1.0) = 2400 + 500 + 200 = 3100 W
      expect(result.simultaneousPowerW).toBe(3100);

      // Énergie journalière = (2400×8) + (500×12) + (200×24) = 19200 + 6000 + 4800 = 30000 Wh
      expect(result.totalDailyEnergyWh).toBe(30000);

      // Critical loads: éclairage + réfrigérateur
      expect(result.criticalLoadsCount).toBe(2);
      expect(result.criticalLoadPowerW).toBe(700); // 500 + 200
      expect(result.criticalLoadEnergyWh).toBe(10800); // (500×12) + (200×24)

      // Night loads: éclairage + réfrigérateur
      expect(result.nightLoadPowerW).toBe(700);
      expect(result.nightLoadEnergyWh).toBe(10800);

      // Motor loads present
      expect(result.motorLoadsPresent).toBe(true);

      // Realistic peak = sum of (totalPower × startupFactor) for motors + simultaneous for non-motors
      // Climatiseur: 3000 × 3 = 9000 (motor)
      // Réfrigérateur: 200 × 2.5 = 500 (motor)
      // Éclairage: 500 × 1 = 500 (non-motor, uses simultaneous)
      expect(result.realisticPeakPowerW).toBeGreaterThan(result.simultaneousPowerW);
    });

    it("retourne les items détaillés", () => {
      const result = calculateLoadBalance(sampleLoads);
      expect(result.items.length).toBe(3);
      expect(result.items[0].totalPowerW).toBe(3000);
      expect(result.items[0].simultaneousPowerW).toBe(2400);
      expect(result.items[0].dailyEnergyWh).toBe(19200);
    });

    it("gère une liste vide", () => {
      const result = calculateLoadBalance([]);
      expect(result.totalNominalPowerW).toBe(0);
      expect(result.simultaneousPowerW).toBe(0);
      expect(result.totalDailyEnergyWh).toBe(0);
      expect(result.items.length).toBe(0);
    });
  });

  describe("calculateDetailedEfficiency", () => {
    it("calcule le rendement détaillé du système", () => {
      const result = calculateDetailedEfficiency(DEFAULT_SYSTEM_LOSSES);
      expect(result.detailedEfficiency).toBeGreaterThan(0);
      expect(result.detailedEfficiency).toBeLessThan(1);
      expect(result.lossBreakdown).toBeDefined();
      expect(result.lossBreakdown.inverter).toBeGreaterThan(0);
      expect(result.lossBreakdown.battery).toBeGreaterThan(0);
    });
  });

  describe("calculatePvSizing", () => {
    it("calcule correctement le dimensionnement PV", () => {
      const totalDailyEnergyWh = 30000;
      const efficiency = calculateDetailedEfficiency(DEFAULT_SYSTEM_LOSSES);
      const result = calculatePvSizing(totalDailyEnergyWh, sampleDesignInputs, efficiency);

      // Puissance PV brute = 30000 / (efficiency × PSH)
      const expectedGross = totalDailyEnergyWh / (efficiency.detailedEfficiency * 5);
      expect(result.pvGrossPowerWc).toBeCloseTo(expectedGross, 0);

      // Puissance recommandée = brute × (1 + 0.15)
      expect(result.pvRecommendedPowerWc).toBeCloseTo(expectedGross * 1.15, 0);

      // Nombre panneaux = ceil(recommandée / 400)
      const expectedPanels = Math.ceil(expectedGross * 1.15 / 400);
      expect(result.panelsCount).toBe(expectedPanels);
      expect(result.totalInstalledPowerWc).toBe(expectedPanels * 400);
    });

    it("arrondit au panneau supérieur", () => {
      const efficiency = calculateDetailedEfficiency(DEFAULT_SYSTEM_LOSSES);
      const result = calculatePvSizing(1000, sampleDesignInputs, efficiency);
      expect(result.panelsCount).toBeGreaterThanOrEqual(1);
      expect(result.totalInstalledPowerWc).toBe(result.panelsCount * 400);
    });
  });

  describe("calculateBatterySizing", () => {
    it("calcule correctement la capacité batterie lithium (mode total_load)", () => {
      const balance = calculateLoadBalance(sampleLoads);
      const result = calculateBatterySizing(balance, sampleDesignInputs);

      // Mode total_load: referenceEnergy = totalDailyEnergyWh = 30000
      expect(result.referenceEnergyWh).toBeCloseTo(30000, 0);
      expect(result.sizingMode).toBe("total_load");

      // autonomyEnergyWh = 30000 × 2 = 60000
      expect(result.autonomyEnergyWh).toBeCloseTo(60000, 0);

      // nominalCapacityWh = 60000 / (0.8 × 0.80 × 0.95) = 60000 / 0.608 = 98684.21
      const expectedNominal = 60000 / (0.8 * 0.80 * 0.95);
      expect(result.nominalCapacityWh).toBeCloseTo(expectedNominal, 0);

      // recommendedCapacityWh = nominal × 1.10
      expect(result.recommendedCapacityWh).toBeCloseTo(expectedNominal * 1.10, 0);

      // capacityAh = recommended / 48
      expect(result.capacityAh).toBeCloseTo(expectedNominal * 1.10 / 48, 0);
      expect(result.technology).toBe("lithium");
      expect(result.autonomyDays).toBe(2);
      expect(result.nominalVoltageV).toBe(48);
    });

    it("respecte le mode critical_load", () => {
      const balance = calculateLoadBalance(sampleLoads);
      const result = calculateBatterySizing(balance, {
        ...sampleDesignInputs,
        batterySizingMode: "critical_load",
      });
      expect(result.sizingMode).toBe("critical_load");
      // referenceEnergy = criticalLoadEnergyWh = 10800
      expect(result.referenceEnergyWh).toBeCloseTo(10800, 0);
    });

    it("respecte le mode night_load", () => {
      const balance = calculateLoadBalance(sampleLoads);
      const result = calculateBatterySizing(balance, {
        ...sampleDesignInputs,
        batterySizingMode: "night_load",
      });
      expect(result.sizingMode).toBe("night_load");
      expect(result.referenceEnergyWh).toBeCloseTo(10800, 0);
    });
  });

  describe("calculateInverterSizing", () => {
    it("calcule la puissance onduleur avec marge de sécurité", () => {
      const balance = calculateLoadBalance(sampleLoads);
      const result = calculateInverterSizing(balance, sampleDesignInputs);

      // continuousRecommendedW = simultaneousPowerW × 1.25 = 3100 × 1.25 = 3875
      expect(result.continuousRecommendedW).toBeCloseTo(3875, 0);

      // surgeRequiredW = realisticPeakPowerW × (1 + surgeMargin)
      expect(result.surgeRequiredW).toBeGreaterThan(result.continuousRecommendedW);

      // recommendedPowerW = max(continuous, surge)
      expect(result.recommendedPowerW).toBeGreaterThanOrEqual(result.continuousRecommendedW);

      // powerKva = recommended / powerFactor
      expect(result.powerKva).toBeCloseTo(result.recommendedPowerW / 1000 / sampleDesignInputs.powerFactor, 1);

      // Motor alert
      expect(result.motorAlert).toBe(true); // motorLoadsPresent
    });

    it("couvre le démarrage quand la puissance recommandée >= startup", () => {
      const balance = calculateLoadBalance(sampleLoads);
      const result = calculateInverterSizing(balance, sampleDesignInputs);
      expect(result.coversStartup).toBeDefined();
    });
  });

  describe("findCommercialSection", () => {
    it("retourne la section commerciale supérieure ou égale", () => {
      expect(findCommercialSection(1.5)).toBe(1.5);
      expect(findCommercialSection(2)).toBe(2.5);
      expect(findCommercialSection(2.5)).toBe(2.5);
      expect(findCommercialSection(3)).toBe(4);
      expect(findCommercialSection(5)).toBe(6);
      expect(findCommercialSection(8)).toBe(10);
      expect(findCommercialSection(12)).toBe(16);
      expect(findCommercialSection(20)).toBe(25);
      expect(findCommercialSection(30)).toBe(35);
      expect(findCommercialSection(45)).toBe(50);
      expect(findCommercialSection(60)).toBe(70);
      expect(findCommercialSection(80)).toBe(95);
      expect(findCommercialSection(100)).toBe(120);
    });

    it("retourne la plus grande section pour des valeurs très élevées", () => {
      expect(findCommercialSection(300)).toBe(240);
    });
  });

  describe("calculateCableSizing", () => {
    it("calcule le dimensionnement câble correctement", () => {
      const result = calculateCableSizing(
        "PV → Onduleur",
        "pv_to_inverter",
        "Panneaux PV",
        "Onduleur",
        2400, // powerW
        48, // tension nominale
        15, // longueur
        0.03, // chute max
        8 // heures d'utilisation
      );

      expect(result.cableType).toBe("pv_to_inverter");
      expect(result.lineName).toBe("PV → Onduleur");
      expect(result.fromEquipment).toBe("Panneaux PV");
      expect(result.toEquipment).toBe("Onduleur");
      expect(result.lengthM).toBe(15);
      // currentA = 2400 / 48 = 50
      expect(result.currentA).toBe(50);
      expect(result.material).toBe("copper");
      expect(result.theoreticalSectionMm2).toBeGreaterThan(0);
      expect(result.selectedSectionMm2).toBeGreaterThanOrEqual(result.theoreticalSectionMm2);
      expect(result.voltageDropPercent).toBeLessThanOrEqual(0.03);
      // Pertes
      expect(result.powerLossW).toBeGreaterThan(0);
      expect(result.energyLossWhDay).toBeGreaterThan(0);
      expect(result.ampacityLimitA).toBeGreaterThan(0);
      expect(result.ampacityStatus).toBeDefined();
    });
  });

  describe("calculateFullSizing", () => {
    it("effectue un dimensionnement complet", () => {
      const balance = calculateLoadBalance(sampleLoads);
      const result = calculateFullSizing(balance, sampleDesignInputs);

      expect(result.pv).toBeDefined();
      expect(result.pv.panelsCount).toBeGreaterThan(0);
      expect(result.battery).toBeDefined();
      expect(result.battery.capacityAh).toBeGreaterThan(0);
      expect(result.inverter).toBeDefined();
      expect(result.inverter.recommendedPowerW).toBeGreaterThan(0);
      expect(result.cables).toBeDefined();
      expect(result.cables.length).toBeGreaterThan(0);
      expect(result.efficiency).toBeDefined();
      expect(result.efficiency.detailedEfficiency).toBeGreaterThan(0);
      expect(result.loadBalance).toBeDefined();
    });
  });

  describe("calculateBudget", () => {
    it("calcule le budget avec les lignes détaillées", () => {
      const balance = calculateLoadBalance(sampleLoads);
      const sizing = calculateFullSizing(balance, sampleDesignInputs);
      const result = calculateBudget(sizing, samplePriceCatalog);

      expect(result.lines.length).toBeGreaterThan(0);
      expect(result.totalInvestment).toBeGreaterThan(0);
      expect(result.currency).toBe("XOF");

      // Vérifier que les lots sont numérotés
      for (const line of result.lines) {
        expect(line.lotNumber).toBeGreaterThan(0);
        expect(line.lotName).toBeDefined();
        expect(line.quantity).toBeGreaterThan(0);
        expect(line.unitPrice).toBeGreaterThan(0);
        expect(line.amount).toBeGreaterThan(0);
      }

      // Vérifier que le total = somme des lignes
      const sumLines = result.lines.reduce((s, l) => s + l.amount, 0);
      expect(result.totalInvestment).toBeCloseTo(sumLines, 0);
    });
  });
});
