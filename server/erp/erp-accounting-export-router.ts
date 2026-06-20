import { z } from "zod";
import { eq, and, between, desc, sql } from "drizzle-orm";
import { router, erpPermissionProcedure } from "../_core/trpc";
import { getDb } from "../db";
import {
  erpAccountingExportFormats, erpAccountingExports, erpAccountingExportLines,
  erpAccountingPreEntries, erpAccountingPreEntryLines, erpAccountingAccounts
} from "../../drizzle/schema";

const now = () => Date.now();
const getDatabase = async () => (await getDb())!;

// --- Export Formats ---
const formatsRouter = router({
  list: erpPermissionProcedure("erp_accounting_exports", "view")
    .query(async () => {
      const db = await getDatabase();
      return db.select().from(erpAccountingExportFormats).where(eq(erpAccountingExportFormats.isActive, 1));
    }),

  create: erpPermissionProcedure("erp_accounting_exports", "create")
    .input(z.object({
      formatCode: z.string().min(1),
      formatName: z.string().min(1),
      description: z.string().optional(),
      delimiter: z.string().default(";"),
      dateFormat: z.string().default("DD/MM/YYYY"),
      decimalSeparator: z.string().default(","),
      encoding: z.string().default("UTF-8"),
      hasHeader: z.number().default(1),
      fieldMappingJson: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDatabase();
      const [result] = await db.insert(erpAccountingExportFormats).values({
        ...input,
        fieldMappingJson: input.fieldMappingJson || null,
        description: input.description || null,
        isActive: 1,
        createdAt: now(),
        updatedAt: now(),
      });
      return { id: result.insertId };
    }),

  update: erpPermissionProcedure("erp_accounting_exports", "create")
    .input(z.object({
      id: z.number(),
      formatName: z.string().optional(),
      description: z.string().optional(),
      delimiter: z.string().optional(),
      dateFormat: z.string().optional(),
      decimalSeparator: z.string().optional(),
      encoding: z.string().optional(),
      hasHeader: z.number().optional(),
      fieldMappingJson: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDatabase();
      const { id, ...data } = input;
      await db.update(erpAccountingExportFormats).set({ ...data, updatedAt: now() }).where(eq(erpAccountingExportFormats.id, id));
      return { success: true };
    }),
});

// --- Export Generation ---
const exportRouter = router({
  list: erpPermissionProcedure("erp_accounting_exports", "view")
    .input(z.object({ limit: z.number().default(50), offset: z.number().default(0) }))
    .query(async ({ input }) => {
      const db = await getDatabase();
      const items = await db.select().from(erpAccountingExports).orderBy(desc(erpAccountingExports.createdAt)).limit(input.limit).offset(input.offset);
      const [{ count }] = await db.select({ count: sql<number>`count(*)` }).from(erpAccountingExports);
      return { items, total: count };
    }),

  getById: erpPermissionProcedure("erp_accounting_exports", "view")
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = await getDatabase();
      const [exp] = await db.select().from(erpAccountingExports).where(eq(erpAccountingExports.id, input.id));
      if (!exp) throw new Error("Export introuvable");
      const lines = await db.select().from(erpAccountingExportLines).where(eq(erpAccountingExportLines.exportId, input.id));
      const [format] = await db.select().from(erpAccountingExportFormats).where(eq(erpAccountingExportFormats.id, exp.formatId));
      return { ...exp, lines, format };
    }),

  preview: erpPermissionProcedure("erp_accounting_exports", "view")
    .input(z.object({ dateFrom: z.number(), dateTo: z.number(), formatId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDatabase();
      // Get validated pre-entries in date range
      const entries = await db.select().from(erpAccountingPreEntries)
        .where(and(
          eq(erpAccountingPreEntries.status, "validated"),
          between(erpAccountingPreEntries.entryDate, input.dateFrom, input.dateTo)
        ));
      const entryIds = entries.map((e: any) => e.id);
      let lines: any[] = [];
      if (entryIds.length > 0) {
        // Get all lines for these entries
        for (const entryId of entryIds) {
          const entryLines = await db.select().from(erpAccountingPreEntryLines).where(eq(erpAccountingPreEntryLines.preEntryId, entryId));
          lines.push(...entryLines);
        }
      }
      // Check balance
      const totalDebit = lines.reduce((sum: number, l: any) => sum + (l.debitAmount || 0), 0);
      const totalCredit = lines.reduce((sum: number, l: any) => sum + (l.creditAmount || 0), 0);
      const isBalanced = totalDebit === totalCredit;
      return { entriesCount: entries.length, linesCount: lines.length, totalDebit, totalCredit, isBalanced };
    }),

  generate: erpPermissionProcedure("erp_accounting_exports", "create")
    .input(z.object({ dateFrom: z.number(), dateTo: z.number(), formatId: z.number(), notes: z.string().optional() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDatabase();
      // Get format
      const [format] = await db.select().from(erpAccountingExportFormats).where(eq(erpAccountingExportFormats.id, input.formatId));
      if (!format) throw new Error("Format d'export introuvable");

      // Get validated pre-entries
      const entries = await db.select().from(erpAccountingPreEntries)
        .where(and(
          eq(erpAccountingPreEntries.status, "validated"),
          between(erpAccountingPreEntries.entryDate, input.dateFrom, input.dateTo)
        ));

      if (entries.length === 0) throw new Error("Aucune écriture validée dans la période");

      // Get all lines
      let allLines: any[] = [];
      for (const entry of entries) {
        const entryLines = await db.select().from(erpAccountingPreEntryLines).where(eq(erpAccountingPreEntryLines.preEntryId, entry.id));
        allLines.push(...entryLines.map((l: any) => ({ ...l, entry })));
      }

      // Check balance
      const totalDebit = allLines.reduce((sum: number, l: any) => sum + (l.debitAmount || 0), 0);
      const totalCredit = allLines.reduce((sum: number, l: any) => sum + (l.creditAmount || 0), 0);
      if (totalDebit !== totalCredit) throw new Error("Les écritures ne sont pas équilibrées (débit ≠ crédit). Export impossible.");

      // Generate CSV content
      const delimiter = format.delimiter || ";";
      const dateFormat = format.dateFormat || "DD/MM/YYYY";
      const decimalSep = format.decimalSeparator || ",";

      const formatDate = (ts: number) => {
        const d = new Date(ts);
        const dd = String(d.getDate()).padStart(2, "0");
        const mm = String(d.getMonth() + 1).padStart(2, "0");
        const yyyy = d.getFullYear();
        if (dateFormat === "YYYY-MM-DD") return `${yyyy}-${mm}-${dd}`;
        if (dateFormat === "MM/DD/YYYY") return `${mm}/${dd}/${yyyy}`;
        return `${dd}/${mm}/${yyyy}`;
      };

      const formatAmount = (amount: number) => {
        const val = (amount / 100).toFixed(2);
        return decimalSep === "," ? val.replace(".", ",") : val;
      };

      // Build CSV
      const csvLines: string[] = [];
      if (format.hasHeader) {
        csvLines.push(["Journal", "Date", "Pièce", "Compte", "Libellé", "Débit", "Crédit", "Tiers", "Projet", "Taxe"].join(delimiter));
      }

      for (const line of allLines) {
        const row = [
          line.entry.journalCode || "",
          formatDate(line.entry.entryDate),
          line.entry.pieceNumber || line.entry.id.toString(),
          line.accountCode || "",
          (line.label || line.entry.description || "").replace(/[;\n\r]/g, " "),
          line.debitAmount > 0 ? formatAmount(line.debitAmount) : "",
          line.creditAmount > 0 ? formatAmount(line.creditAmount) : "",
          line.thirdPartyCode || "",
          line.entry.projectCode || "",
          line.taxCode || "",
        ];
        csvLines.push(row.join(delimiter));
      }

      const fileContent = csvLines.join("\n");
      const exportNumber = `EXP-${Date.now().toString(36).toUpperCase()}`;
      const fileName = `${exportNumber}_${format.formatCode}_${formatDate(input.dateFrom)}_${formatDate(input.dateTo)}.csv`;

      // Save export
      const [result] = await db.insert(erpAccountingExports).values({
        exportNumber,
        formatId: input.formatId,
        dateFrom: input.dateFrom,
        dateTo: input.dateTo,
        status: "generated",
        fileContent,
        fileName,
        exportedBy: ctx.user.id,
        exportedAt: now(),
        entriesCount: entries.length,
        totalDebit,
        totalCredit,
        notes: input.notes || null,
        createdAt: now(),
        updatedAt: now(),
      });

      // Save export lines
      for (const line of allLines) {
        await db.insert(erpAccountingExportLines).values({
          exportId: result.insertId,
          preEntryId: line.entry.id,
          preEntryLineId: line.id,
          accountCode: line.accountCode || null,
          journalCode: line.entry.journalCode || null,
          entryDate: line.entry.entryDate,
          label: line.label || line.entry.description || null,
          debitAmount: line.debitAmount || 0,
          creditAmount: line.creditAmount || 0,
          thirdPartyCode: line.thirdPartyCode || null,
          projectCode: line.entry.projectCode || null,
          taxCode: line.taxCode || null,
          createdAt: now(),
        });
      }

      return { id: result.insertId, exportNumber, fileName, entriesCount: entries.length, totalDebit, totalCredit };
    }),

  download: erpPermissionProcedure("erp_accounting_exports", "view")
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = await getDatabase();
      const [exp] = await db.select().from(erpAccountingExports).where(eq(erpAccountingExports.id, input.id));
      if (!exp) throw new Error("Export introuvable");
      if (!exp.fileContent) throw new Error("Fichier non disponible");
      // Mark as downloaded
      await db.update(erpAccountingExports).set({ status: "downloaded", updatedAt: now() }).where(eq(erpAccountingExports.id, input.id));
      return { fileName: exp.fileName, fileContent: exp.fileContent, encoding: "UTF-8" };
    }),

  cancel: erpPermissionProcedure("erp_accounting_exports", "create")
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDatabase();
      await db.update(erpAccountingExports).set({ status: "cancelled", updatedAt: now() }).where(eq(erpAccountingExports.id, input.id));
      return { success: true };
    }),
});

// --- Main Accounting Export Router ---
export const accountingExportRouter = router({
  formats: formatsRouter,
  exports: exportRouter,
});
