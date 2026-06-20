/**
 * CSV/Excel Export Utility — Sprint 20
 * 
 * Generates CSV content from structured data.
 * Used by tRPC procedures to return downloadable CSV files.
 */

export interface CsvColumn<T> {
  header: string;
  accessor: (row: T) => string | number | null | undefined;
}

/**
 * Generate CSV string from data and column definitions
 */
export function generateCsv<T>(data: T[], columns: CsvColumn<T>[]): string {
  const BOM = "\uFEFF"; // UTF-8 BOM for Excel compatibility
  const separator = ";"; // Semicolon for French locale Excel

  // Header row
  const header = columns.map(col => escapeCsvValue(col.header)).join(separator);

  // Data rows
  const rows = data.map(row => {
    return columns.map(col => {
      const value = col.accessor(row);
      return escapeCsvValue(value != null ? String(value) : "");
    }).join(separator);
  });

  return BOM + [header, ...rows].join("\r\n");
}

/**
 * Escape a CSV value (handle quotes, newlines, separators)
 */
function escapeCsvValue(value: string): string {
  if (value.includes('"') || value.includes(";") || value.includes("\n") || value.includes("\r")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

/**
 * Format a timestamp (bigint ms) to a French date string
 */
export function formatDate(timestamp: number | null | undefined): string {
  if (!timestamp) return "";
  return new Date(timestamp).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

/**
 * Format a timestamp to French datetime string
 */
export function formatDateTime(timestamp: number | null | undefined): string {
  if (!timestamp) return "";
  return new Date(timestamp).toLocaleString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Format an amount in centimes to XOF display
 */
export function formatAmountXOF(centimes: number | null | undefined): string {
  if (centimes == null) return "0";
  return Math.round(centimes / 100).toLocaleString("fr-FR");
}
