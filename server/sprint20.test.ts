/**
 * Sprint 20 — Tests unitaires
 * 
 * Couvre:
 * - Sanitization XSS
 * - Cache applicatif
 * - Export CSV
 * - Upload validator
 */
import { describe, it, expect, beforeEach } from "vitest";
import { sanitizeInput, sanitizeString } from "./_core/sanitize";
import { appCache } from "./_core/cache";
import { generateCsv, formatDate, formatAmountXOF, type CsvColumn } from "./export-csv";
import { validateUpload } from "./_core/uploadValidator";

// ============================================================
// SANITIZATION TESTS
// ============================================================
describe("sanitizeString", () => {
  it("should strip script tags", () => {
    const input = '<script>alert("xss")</script>Hello';
    const result = sanitizeString(input);
    expect(result).not.toContain("<script>");
    expect(result).toContain("Hello");
  });

  it("should strip event handlers", () => {
    const input = '<img onerror="alert(1)" src="x">';
    const result = sanitizeString(input);
    expect(result).not.toContain("onerror");
  });

  it("should preserve normal text", () => {
    const input = "Projet de construction à Abidjan - Phase 2";
    const result = sanitizeString(input);
    expect(result).toBe(input);
  });

  it("should handle empty strings", () => {
    expect(sanitizeString("")).toBe("");
  });
});

describe("sanitizeInput (deep)", () => {
  it("should sanitize nested objects", () => {
    const input = {
      name: '<script>alert("xss")</script>Test',
      nested: {
        value: '<img onerror="hack" src="x">',
      },
    };
    const result = sanitizeInput(input);
    expect(result.name).not.toContain("<script>");
    expect(result.nested.value).not.toContain("onerror");
  });

  it("should sanitize arrays", () => {
    const input = ['<script>x</script>', "normal"];
    const result = sanitizeInput(input);
    expect(result[0]).not.toContain("<script>");
    expect(result[1]).toBe("normal");
  });

  it("should preserve numbers and booleans", () => {
    const input = { count: 42, active: true, name: "test" };
    const result = sanitizeInput(input);
    expect(result.count).toBe(42);
    expect(result.active).toBe(true);
    expect(result.name).toBe("test");
  });
});

// ============================================================
// CACHE TESTS
// ============================================================
describe("appCache", () => {
  beforeEach(() => {
    appCache.invalidateAll();
  });

  it("should store and retrieve values", () => {
    appCache.set("key1", { data: "hello" }, 60);
    const result = appCache.get<{ data: string }>("key1");
    expect(result).toEqual({ data: "hello" });
  });

  it("should return null for expired entries", async () => {
    appCache.set("key2", "value", 0.001); // 0.001 seconds = 1ms
    await new Promise((r) => setTimeout(r, 10));
    expect(appCache.get("key2")).toBeNull();
  });

  it("should return null for non-existent keys", () => {
    expect(appCache.get("nonexistent")).toBeNull();
  });

  it("should invalidate by prefix", () => {
    appCache.set("erp:dashboard:stats", "stats", 60);
    appCache.set("erp:dashboard:kpi", "kpi", 60);
    appCache.set("erp:projects:list", "projects", 60);
    appCache.invalidatePrefix("erp:dashboard");
    expect(appCache.get("erp:dashboard:stats")).toBeNull();
    expect(appCache.get("erp:dashboard:kpi")).toBeNull();
    expect(appCache.get("erp:projects:list")).toEqual("projects");
  });

  it("should clear all entries", () => {
    appCache.set("a", 1, 60);
    appCache.set("b", 2, 60);
    appCache.invalidateAll();
    expect(appCache.get("a")).toBeNull();
    expect(appCache.get("b")).toBeNull();
  });
});

// ============================================================
// CSV EXPORT TESTS
// ============================================================
describe("generateCsv", () => {
  interface TestRow {
    name: string;
    amount: number;
    date: number | null;
  }

  const columns: CsvColumn<TestRow>[] = [
    { header: "Nom", accessor: (r) => r.name },
    { header: "Montant (XOF)", accessor: (r) => formatAmountXOF(r.amount) },
    { header: "Date", accessor: (r) => formatDate(r.date) },
  ];

  it("should generate valid CSV with BOM and semicolons", () => {
    const data: TestRow[] = [
      { name: "Projet Alpha", amount: 150000, date: 1700000000000 },
      { name: "Projet Beta", amount: 250000, date: null },
    ];
    const csv = generateCsv(data, columns);
    expect(csv.startsWith("\uFEFF")).toBe(true); // BOM
    expect(csv).toContain("Nom;Montant (XOF);Date");
    expect(csv).toContain("Projet Alpha");
    expect(csv).toContain("Projet Beta");
  });

  it("should escape values with semicolons", () => {
    const data: TestRow[] = [
      { name: "Test; avec point-virgule", amount: 0, date: null },
    ];
    const csv = generateCsv(data, columns);
    expect(csv).toContain('"Test; avec point-virgule"');
  });

  it("should handle empty data", () => {
    const csv = generateCsv([], columns);
    expect(csv).toContain("Nom;Montant (XOF);Date");
    // Only header line + BOM
    const lines = csv.replace("\uFEFF", "").split("\r\n").filter(Boolean);
    expect(lines.length).toBe(1);
  });
});

describe("formatAmountXOF", () => {
  it("should format centimes to XOF", () => {
    expect(formatAmountXOF(150000)).toBe("1\u202f500"); // 1 500 with narrow no-break space
  });

  it("should handle null/undefined", () => {
    expect(formatAmountXOF(null)).toBe("0");
    expect(formatAmountXOF(undefined)).toBe("0");
  });
});

// ============================================================
// UPLOAD VALIDATOR TESTS
// ============================================================
describe("validateUpload", () => {
  it("should reject files exceeding max size", async () => {
    const bigBuffer = Buffer.alloc(30 * 1024 * 1024); // 30MB
    await expect(
      validateUpload({
        buffer: bigBuffer,
        filename: "large.pdf",
        declaredMimeType: "application/pdf",
      })
    ).rejects.toThrow();
  });

  it("should reject disallowed extensions", async () => {
    const smallBuffer = Buffer.alloc(1024);
    await expect(
      validateUpload({
        buffer: smallBuffer,
        filename: "malware.exe",
        declaredMimeType: "application/x-msdownload",
      })
    ).rejects.toThrow();
  });

  it("should accept valid PDF uploads", async () => {
    // Create a minimal PDF-like buffer (starts with %PDF)
    const pdfBuffer = Buffer.from("%PDF-1.4 fake content for testing");
    const result = await validateUpload({
      buffer: pdfBuffer,
      filename: "contrat.pdf",
      declaredMimeType: "application/pdf",
    });
    expect(result.safeFilename).toBe("contrat.pdf");
    expect(result.extension).toBe(".pdf");
  });

  it("should sanitize dangerous filenames", async () => {
    const pdfBuffer = Buffer.from("%PDF-1.4 content");
    const result = await validateUpload({
      buffer: pdfBuffer,
      filename: "../../../etc/passwd.pdf",
      declaredMimeType: "application/pdf",
    });
    expect(result.safeFilename).not.toContain("..");
    expect(result.safeFilename).not.toContain("/");
  });
});
