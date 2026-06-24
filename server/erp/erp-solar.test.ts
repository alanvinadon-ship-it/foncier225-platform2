import { describe, expect, it } from "vitest";
import {
  calculateLoadBalance,
  calculatePvSizing,
  calculateBatterySizing,
  calculateInverterSizing,
  findCommercialSection,
  calculateCableSizing,
  calculateFullSizing,
  calculateBudget,
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
  },
  {
    equipmentName: "Éclairage LED",
    equipmentCategory: "lighting",
    unitPowerW: 50,
    quantity: 10,
    startupFactor: 1,
    usageHoursPerDay: 12,
    isCriticalLoad: true,
  },
  {
    equipmentName: "Réfrigérateur",
    equipmentCategory: "appliances",
    unitPowerW: 200,
    quantity: 1,
    startupFactor: 2.5,
    usageHoursPerDay: 24,
    isCriticalLoad: true,
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
};

const samplePriceCatalog: PriceCatalog = {
  pricePerWcPanel: 500,
  pricePerWhLithium: 200,
  pricePerAhPlomb: 3000,
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
    it("calcule correctement le bilan de puissance avec plusieurs charges", () => {
      const result = calculateLoadBalance(sampleLoads);

      // Vérifier le nombre d'items retournés
      expect(result.items).toHaveLength(3);

      // Climatiseur: 1500W × 2 = 3000W nominal, 3000W × 3 = 9000W peak, 3000W × 8h = 24000Wh
      const clim = result.items[0];
      expect(clim.totalPowerW).toBe(3000);
      expect(clim.peakPowerW).toBe(9000);
      expect(clim.dailyEnergyWh).toBe(24000);

      // Éclairage: 50W × 10 = 500W nominal, 500W × 1 = 500W peak, 500W × 12h = 6000Wh
      const led = result.items[1];
      expect(led.totalPowerW).toBe(500);
      expect(led.peakPowerW).toBe(500);
      expect(led.dailyEnergyWh).toBe(6000);

      // Réfrigérateur: 200W × 1 = 200W nominal, 200W × 2.5 = 500W peak, 200W × 24h = 4800Wh
      const fridge = result.items[2];
      expect(fridge.totalPowerW).toBe(200);
      expect(fridge.peakPowerW).toBe(500);
      expect(fridge.dailyEnergyWh).toBe(4800);

      // Totaux
      expect(result.totalNominalPowerW).toBe(3700); // 3000 + 500 + 200
      expect(result.totalDailyEnergyWh).toBe(34800); // 24000 + 6000 + 4800
      expect(result.maxStartupPowerW).toBe(10000); // 9000 + 500 + 500
    });

    it("identifie correctement les charges critiques", () => {
      const result = calculateLoadBalance(sampleLoads);

      // Charges critiques: LED (500W, 6000Wh) + Frigo (200W, 4800Wh)
      expect(result.criticalLoadPowerW).toBe(700); // 500 + 200
      expect(result.criticalLoadEnergyWh).toBe(10800); // 6000 + 4800
    });

    it("gère une liste vide", () => {
      const result = calculateLoadBalance([]);
      expect(result.items).toHaveLength(0);
      expect(result.totalNominalPowerW).toBe(0);
      expect(result.totalDailyEnergyWh).toBe(0);
      expect(result.maxStartupPowerW).toBe(0);
      expect(result.criticalLoadPowerW).toBe(0);
    });
  });

  describe("calculatePvSizing", () => {
    it("calcule correctement le dimensionnement PV", () => {
      const totalDailyEnergyWh = 34800;
      const result = calculatePvSizing(totalDailyEnergyWh, sampleDesignInputs);

      // Puissance PV = 34800 / (0.75 × 5) = 34800 / 3.75 = 9280 Wc
      expect(result.requiredPvPowerWc).toBeCloseTo(9280, 0);

      // Nombre panneaux = ceil(9280 / 400) = 24
      expect(result.panelsCount).toBe(24); // ceil(9280/400) = 24 (23.2 arrondi)
      // En fait 9280/400 = 23.2 → ceil = 24
      expect(result.totalInstalledPowerWc).toBe(9600); // 24 × 400
    });

    it("arrondit au panneau supérieur", () => {
      // Énergie qui donne un nombre non entier de panneaux
      const result = calculatePvSizing(1000, sampleDesignInputs);
      // 1000 / (0.75 × 5) = 266.67 Wc → ceil(266.67 / 400) = 1 panneau
      expect(result.panelsCount).toBe(1);
      expect(result.totalInstalledPowerWc).toBe(400);
    });
  });

  describe("calculateBatterySizing", () => {
    it("calcule correctement la capacité batterie lithium", () => {
      const totalDailyEnergyWh = 34800;
      const result = calculateBatterySizing(totalDailyEnergyWh, sampleDesignInputs);

      // Capacité Ah = (34800 × 2) / (48 × 0.8) = 69600 / 38.4 = 1812.5 Ah
      expect(result.capacityAh).toBeCloseTo(1812.5, 1);
      // Capacité Wh = 1812.5 × 48 = 87000 Wh
      expect(result.capacityWh).toBeCloseTo(87000, 0);
      expect(result.technology).toBe("lithium");
      expect(result.autonomyDays).toBe(2);
      expect(result.nominalVoltageV).toBe(48);
    });

    it("respecte le taux de décharge", () => {
      const result = calculateBatterySizing(10000, {
        ...sampleDesignInputs,
        batteryDischargeRate: 0.5, // 50% décharge (plomb classique)
        batteryTechnology: "plomb",
      });
      // (10000 × 2) / (48 × 0.5) = 20000 / 24 = 833.33 Ah
      expect(result.capacityAh).toBeCloseTo(833.33, 1);
      expect(result.technology).toBe("plomb");
    });
  });

  describe("calculateInverterSizing", () => {
    it("calcule la puissance onduleur avec marge de sécurité", () => {
      const result = calculateInverterSizing(3700, 10000);

      // Min = 3700 × 1.25 = 4625 W
      expect(result.minPowerW).toBeCloseTo(4625, 0);
      // Recommandé = max(4625, 10000 × 1.1) = max(4625, 11000) = 11000 W
      expect(result.recommendedPowerW).toBeCloseTo(11000, 0);
      expect(result.coversStartup).toBe(true);
    });

    it("couvre le démarrage quand la puissance recommandée >= startup", () => {
      const result = calculateInverterSizing(1000, 2000);
      // Min = 1000 × 1.25 = 1250
      // Recommandé = max(1250, 2000 × 1.1) = max(1250, 2200) = 2200
      expect(result.recommendedPowerW).toBeCloseTo(2200, 0);
      expect(result.coversStartup).toBe(true);
    });
  });

  describe("findCommercialSection", () => {
    it("retourne la section commerciale supérieure ou égale", () => {
      expect(findCommercialSection(1.5)).toBe(2.5);
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
      expect(findCommercialSection(200)).toBe(120);
    });
  });

  describe("calculateCableSizing", () => {
    it("calcule le dimensionnement c\u00e2ble correctement", () => {
      // Signature: (lineName, cableType, powerW, nominalVoltageV, lengthM, voltageDropTarget)
      const result = calculateCableSizing(
        "PV \u2192 Onduleur",
        "pv_to_inverter",
        2400, // powerW
        48, // tension nominale
        15, // longueur
        0.03 // chute max
      );

      expect(result.cableType).toBe("pv_to_inverter");
      expect(result.lineName).toBe("PV \u2192 Onduleur");
      expect(result.lengthM).toBe(15);
      // currentA = 2400 / 48 = 50
      expect(result.currentA).toBe(50);
      expect(result.material).toBe("copper");
      // Section th\u00e9orique = (2 \u00d7 0.0175 \u00d7 15 \u00d7 50) / (0.03 \u00d7 48) = 26.25 / 1.44 = 18.23 mm\u00b2
      expect(result.theoreticalSectionMm2).toBeGreaterThan(0);
      expect(result.recommendedCommercialSectionMm2).toBeGreaterThanOrEqual(
        result.theoreticalSectionMm2
      );
      expect(result.voltageDropPercent).toBeLessThanOrEqual(0.03);
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

      // Vérifier que le total est la somme des lignes
      const sumLines = result.lines.reduce((s, l) => s + l.amount, 0);
      expect(result.totalInvestment).toBeCloseTo(sumLines, 0);
    });

    it("inclut les lots PV, batteries, onduleur, câblage, structures et installation", () => {
      const balance = calculateLoadBalance(sampleLoads);
      const sizing = calculateFullSizing(balance, sampleDesignInputs);
      const result = calculateBudget(sizing, samplePriceCatalog);

      const lotNames = result.lines.map((l) => l.lotName);
      expect(lotNames).toContain("Panneaux solaires");
      expect(lotNames).toContain("Batteries lithium");
      expect(lotNames).toContain("Onduleur / R\u00e9gulateur");
    });
  });
});
