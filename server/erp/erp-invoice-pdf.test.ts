import { describe, it, expect, vi, beforeEach } from "vitest";
import { generateNormalizedInvoiceNumber } from "./erp-invoice-pdf.service";

// Mock dependencies
vi.mock("../db", () => ({
  getDb: vi.fn(() => Promise.resolve({
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockResolvedValue([]),
    insert: vi.fn().mockReturnThis(),
    values: vi.fn().mockResolvedValue([{ insertId: 1 }]),
    update: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
  })),
}));

vi.mock("../storage", () => ({
  storagePut: vi.fn(() => Promise.resolve({ url: "https://s3.example.com/test.pdf", key: "invoices/test.pdf" })),
}));

vi.mock("qrcode", () => ({
  default: {
    toDataURL: vi.fn(() => Promise.resolve("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==")),
  },
}));

describe("erp-invoice-pdf.service", () => {
  describe("generateNormalizedInvoiceNumber", () => {
    it("should generate correct format: NCC + YY + 12-digit sequence", () => {
      const result = generateNormalizedInvoiceNumber("1739256P", 2026, 14);
      expect(result).toBe("1739256P26000000000014");
    });

    it("should pad sequence to 12 digits", () => {
      const result = generateNormalizedInvoiceNumber("1739256P", 2026, 1);
      expect(result).toBe("1739256P26000000000001");
    });

    it("should handle large sequence numbers", () => {
      const result = generateNormalizedInvoiceNumber("1739256P", 2026, 999999999999);
      expect(result).toBe("1739256P26999999999999");
    });

    it("should use last 2 digits of year", () => {
      const result = generateNormalizedInvoiceNumber("ABC123", 2025, 42);
      expect(result).toBe("ABC12325000000000042");
    });

    it("should handle different NCC formats", () => {
      const result = generateNormalizedInvoiceNumber("2045123X", 2026, 100);
      expect(result).toBe("2045123X26000000000100");
    });
  });

  describe("Invoice PDF generation structure", () => {
    it("should export all required functions", async () => {
      const service = await import("./erp-invoice-pdf.service");
      expect(typeof service.generateNormalizedInvoiceNumber).toBe("function");
      expect(typeof service.generateInvoicePdf).toBe("function");
      expect(typeof service.generateAndUploadInvoicePdf).toBe("function");
      expect(typeof service.getCompanySettings).toBe("function");
      expect(typeof service.upsertCompanySettings).toBe("function");
      expect(typeof service.getNextNormalizedInvoiceNumber).toBe("function");
    });
  });

  describe("Invoice number format validation", () => {
    it("should always produce a string starting with NCC", () => {
      const ncc = "1739256P";
      const result = generateNormalizedInvoiceNumber(ncc, 2026, 1);
      expect(result.startsWith(ncc)).toBe(true);
    });

    it("should contain year digits after NCC", () => {
      const result = generateNormalizedInvoiceNumber("NCC123", 2026, 1);
      expect(result.substring(6, 8)).toBe("26");
    });

    it("should have total length = NCC length + 2 (year) + 12 (sequence)", () => {
      const ncc = "1739256P";
      const result = generateNormalizedInvoiceNumber(ncc, 2026, 1);
      expect(result.length).toBe(ncc.length + 2 + 12);
    });
  });
});
