import { describe, it, expect } from "vitest";
import { mapTresorPayStatus, getTresorPayMethod, isTresorPayConfigured, TAX_TYPE_LABELS, TAX_FEE_SCHEDULE } from "./tresorpay.service";

describe("TrésorPay Service", () => {
  describe("mapTresorPayStatus", () => {
    it("maps SUCCESS to completed", () => {
      expect(mapTresorPayStatus("SUCCESS")).toBe("completed");
    });

    it("maps FAILED to failed", () => {
      expect(mapTresorPayStatus("FAILED")).toBe("failed");
    });

    it("maps EXPIRED to failed", () => {
      expect(mapTresorPayStatus("EXPIRED")).toBe("failed");
    });

    it("maps PENDING to pending", () => {
      expect(mapTresorPayStatus("PENDING")).toBe("pending");
    });
  });

  describe("getTresorPayMethod", () => {
    it("maps orange_money to MOBILE_MONEY", () => {
      expect(getTresorPayMethod("orange_money")).toBe("MOBILE_MONEY");
    });

    it("maps mtn_momo to MOBILE_MONEY", () => {
      expect(getTresorPayMethod("mtn_momo")).toBe("MOBILE_MONEY");
    });

    it("maps moov_money to MOBILE_MONEY", () => {
      expect(getTresorPayMethod("moov_money")).toBe("MOBILE_MONEY");
    });

    it("maps wave to MOBILE_MONEY", () => {
      expect(getTresorPayMethod("wave")).toBe("MOBILE_MONEY");
    });

    it("maps card to CARD", () => {
      expect(getTresorPayMethod("card")).toBe("CARD");
    });

    it("maps unknown to ALL", () => {
      expect(getTresorPayMethod("unknown")).toBe("ALL");
    });
  });

  describe("isTresorPayConfigured", () => {
    it("returns false when env vars are not set", () => {
      delete process.env.TRESORPAY_API_KEY;
      delete process.env.TRESORPAY_MERCHANT_ID;
      expect(isTresorPayConfigured()).toBe(false);
    });
  });

  describe("TAX_TYPE_LABELS", () => {
    it("has all required tax types", () => {
      expect(TAX_TYPE_LABELS).toHaveProperty("liasse_afor");
      expect(TAX_TYPE_LABELS).toHaveProperty("frais_geometre");
      expect(TAX_TYPE_LABELS).toHaveProperty("taxe_immatriculation");
      expect(TAX_TYPE_LABELS).toHaveProperty("frais_dossier");
      expect(TAX_TYPE_LABELS).toHaveProperty("other");
    });

    it("liasse_afor contains AFOR", () => {
      expect(TAX_TYPE_LABELS.liasse_afor).toContain("AFOR");
    });
  });

  describe("TAX_FEE_SCHEDULE", () => {
    it("has fees for liasse_afor", () => {
      expect(TAX_FEE_SCHEDULE.liasse_afor.length).toBeGreaterThan(0);
    });

    it("has fees for frais_geometre", () => {
      expect(TAX_FEE_SCHEDULE.frais_geometre.length).toBeGreaterThan(0);
    });

    it("has fees for taxe_immatriculation", () => {
      expect(TAX_FEE_SCHEDULE.taxe_immatriculation.length).toBeGreaterThan(0);
    });

    it("has fees for frais_dossier", () => {
      expect(TAX_FEE_SCHEDULE.frais_dossier.length).toBeGreaterThan(0);
    });

    it("all fees have positive amounts", () => {
      Object.values(TAX_FEE_SCHEDULE).forEach(fees => {
        fees.forEach(fee => {
          expect(fee.amount).toBeGreaterThan(0);
          expect(fee.label).toBeTruthy();
          expect(fee.description).toBeTruthy();
        });
      });
    });

    it("frais_geometre amounts are in expected range (100k-500k FCFA)", () => {
      TAX_FEE_SCHEDULE.frais_geometre.forEach(fee => {
        expect(fee.amount).toBeGreaterThanOrEqual(100000);
        expect(fee.amount).toBeLessThanOrEqual(500000);
      });
    });
  });
});
