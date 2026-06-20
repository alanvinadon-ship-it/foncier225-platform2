import { z } from "zod";
import { eq, and, desc } from "drizzle-orm";
import { router, erpPermissionProcedure } from "../_core/trpc";
import { getDb, createAuditEvent } from "../db";
import { notifyOwner } from "../_core/notification";
import { storagePut } from "../storage";
import ExcelJS from "exceljs";
import {
  erpBudgetImports,
  erpBudgetImportErrors,
  erpBudgetTemplateMappings,
  erpBudgetsV2,
  erpBudgetCategories,
  erpBudgetLinesV2,
  erpBudgetLineAmounts,
} from "../../drizzle/schema";

const now = () => Date.now();
const getDatabase = async () => (await getDb())!;

// ============================================================
// Import Excel Router
// ============================================================
export const erpBudgetImportRouter = router({
  // Upload and analyse an Excel file
  upload: erpPermissionProcedure("erp_finance", "view")
    .input(z.object({
      fileName: z.string(),
      fileBase64: z.string(),
      budgetId: z.number().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDatabase();
      const buffer = Buffer.from(input.fileBase64, "base64");

      // Upload to S3
      const fileKey = `budget-imports/${Date.now()}-${input.fileName}`;
      const { url } = await storagePut(fileKey, buffer, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");

      // Analyse workbook
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(buffer as any);

      const sheetsInfo: any[] = [];
      for (const ws of workbook.worksheets) {
        const rowCount = ws.rowCount;
        const colCount = ws.columnCount;
        // Detect header row (first row with content)
        let headerRow = 1;
        let headers: string[] = [];
        for (let r = 1; r <= Math.min(5, rowCount); r++) {
          const row = ws.getRow(r);
          const vals = [];
          for (let c = 1; c <= colCount; c++) {
            const cell = row.getCell(c);
            if (cell.value) vals.push(String(cell.value));
          }
          if (vals.length >= 3) {
            headerRow = r;
            headers = vals;
            break;
          }
        }

        // Detect month columns (FR, EN, coded patterns + trimestre/semestre)
        const monthColumns: { col: number; label: string; monthNumber: number }[] = [];
        const monthPatternsFR: [RegExp, number][] = [
          [/^janv/i, 1], [/^f[eé]vr/i, 2], [/^mars/i, 3], [/^avr/i, 4], [/^mai/i, 5], [/^juin/i, 6],
          [/^juil/i, 7], [/^ao[uû]t/i, 8], [/^sept/i, 9], [/^oct/i, 10], [/^nov/i, 11], [/^d[eé]c/i, 12],
        ];
        const monthPatternsEN: [RegExp, number][] = [
          [/^jan/i, 1], [/^feb/i, 2], [/^mar/i, 3], [/^apr/i, 4], [/^may/i, 5], [/^jun/i, 6],
          [/^jul/i, 7], [/^aug/i, 8], [/^sep/i, 9], [/^oct/i, 10], [/^nov/i, 11], [/^dec/i, 12],
        ];
        const monthPatternsCode: [RegExp, number][] = [
          [/^m0?1$/i, 1], [/^m0?2$/i, 2], [/^m0?3$/i, 3], [/^m0?4$/i, 4], [/^m0?5$/i, 5], [/^m0?6$/i, 6],
          [/^m0?7$/i, 7], [/^m0?8$/i, 8], [/^m0?9$/i, 9], [/^m10$/i, 10], [/^m11$/i, 11], [/^m12$/i, 12],
        ];
        const allMonthPatterns = [...monthPatternsFR, ...monthPatternsEN, ...monthPatternsCode];
        const headerRowData = ws.getRow(headerRow);
        for (let c = 1; c <= colCount; c++) {
          const val = String(headerRowData.getCell(c).value || "").trim();
          let matched = false;
          for (const [pattern, monthNum] of allMonthPatterns) {
            if (pattern.test(val)) {
              monthColumns.push({ col: c, label: val, monthNumber: monthNum });
              matched = true;
              break;
            }
          }
        }
        // Sort month columns by month number for correct ordering
        monthColumns.sort((a, b) => a.monthNumber - b.monthNumber);

        // Detect category/line column (extended FR/EN heuristics)
        let categoryColumn = 1;
        const categoryKeywords = [
          "poste", "libellé", "libelle", "ligne", "catégorie", "categorie",
          "rubrique", "description", "intitulé", "intitule", "désignation",
          "designation", "nature", "compte", "article", "item", "label",
          "dépense", "depense", "recette", "charge", "objet"
        ];
        for (let c = 1; c <= Math.min(5, colCount); c++) {
          const val = String(headerRowData.getCell(c).value || "").trim().toLowerCase();
          if (categoryKeywords.some(kw => val.includes(kw))) {
            categoryColumn = c;
            break;
          }
        }

        // Detect total column (extended)
        let totalColumn: number | null = null;
        const totalKeywords = ["total", "annuel", "budget", "cumul", "montant global", "prévision", "prevision", "annual", "yearly"];
        for (let c = 1; c <= colCount; c++) {
          const val = String(headerRowData.getCell(c).value || "").trim().toLowerCase();
          if (totalKeywords.some(kw => val.includes(kw))) {
            totalColumn = c;
            break;
          }
        }

        // Detect sheet type
        let sheetType = "unknown";
        const sheetNameLower = ws.name.toLowerCase();
        if (sheetNameLower.includes("recette") || sheetNameLower.includes("revenu") || sheetNameLower.includes("ca") || sheetNameLower.includes("chiffre")) sheetType = "revenue";
        else if (sheetNameLower.includes("charge") || sheetNameLower.includes("dépense") || sheetNameLower.includes("opex")) sheetType = "charges";
        else if (sheetNameLower.includes("invest") || sheetNameLower.includes("capex") || sheetNameLower.includes("immob")) sheetType = "investment";
        else if (sheetNameLower.includes("p&l") || sheetNameLower.includes("résultat") || sheetNameLower.includes("compte")) sheetType = "pl";
        else if (sheetNameLower.includes("cash") || sheetNameLower.includes("tréso")) sheetType = "cashflow";
        else if (sheetNameLower.includes("synthèse") || sheetNameLower.includes("résumé") || sheetNameLower.includes("summary")) sheetType = "summary";

        // Sample data rows (first 5)
        const sampleRows: any[] = [];
        for (let r = headerRow + 1; r <= Math.min(headerRow + 5, rowCount); r++) {
          const row = ws.getRow(r);
          const rowData: any = {};
          rowData.label = String(row.getCell(categoryColumn).value || "");
          rowData.months = monthColumns.map(mc => {
            const val = row.getCell(mc.col).value;
            return typeof val === "number" ? val : (val ? parseFloat(String(val).replace(/[^\d.-]/g, "")) || 0 : 0);
          });
          if (totalColumn) rowData.total = row.getCell(totalColumn).value;
          if (rowData.label) sampleRows.push(rowData);
        }

        sheetsInfo.push({
          name: ws.name,
          rowCount,
          colCount,
          headerRow,
          headers,
          monthColumns,
          categoryColumn,
          totalColumn,
          sheetType,
          sampleRows,
        });
      }

      // Save import record
      const result = await db.insert(erpBudgetImports).values({
        budgetId: input.budgetId || null,
        fileName: input.fileName,
        filePath: url,
        fileSize: buffer.length,
        importStatus: "analysed",
        importedBy: ctx.user.id,
        detectedSheetsJson: sheetsInfo,
        createdAt: now(),
        updatedAt: now(),
      });

      return { importId: result[0].insertId, sheets: sheetsInfo };
    }),

  // Get import details
  getById: erpPermissionProcedure("erp_finance", "view")
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = await getDatabase();
      const [imp] = await db.select().from(erpBudgetImports).where(eq(erpBudgetImports.id, input.id)).limit(1);
      if (!imp) return null;
      const errors = await db.select().from(erpBudgetImportErrors).where(eq(erpBudgetImportErrors.budgetImportId, input.id));
      return { ...imp, errors };
    }),

  // List imports
  list: erpPermissionProcedure("erp_finance", "view")
    .input(z.object({ budgetId: z.number().optional(), limit: z.number().default(20) }))
    .query(async ({ input }) => {
      const db = await getDatabase();
      const conditions: any[] = [];
      if (input.budgetId) conditions.push(eq(erpBudgetImports.budgetId, input.budgetId));
      const where = conditions.length > 0 ? and(...conditions) : undefined;
      return db.select().from(erpBudgetImports).where(where).orderBy(desc(erpBudgetImports.createdAt)).limit(input.limit);
    }),

  // Commit import — create budget lines from analysed data
  commit: erpPermissionProcedure("erp_finance", "view")
    .input(z.object({
      importId: z.number(),
      budgetId: z.number(),
      sheetMappings: z.array(z.object({
        sheetName: z.string(),
        sheetType: z.enum(["revenue", "charges", "investment", "pl", "cashflow", "summary"]),
        categoryColumn: z.number(),
        monthStartColumn: z.number(),
        monthEndColumn: z.number(),
        headerRow: z.number(),
        skipTotalRows: z.boolean().default(true),
      })),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDatabase();

      // Verify import exists
      const [imp] = await db.select().from(erpBudgetImports).where(eq(erpBudgetImports.id, input.importId)).limit(1);
      if (!imp) throw new Error("Import introuvable");
      if (!imp.filePath) throw new Error("Fichier non trouvé");

      // Download and parse file
      const response = await fetch(imp.filePath);
      const arrayBuffer = await response.arrayBuffer();
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(Buffer.from(arrayBuffer) as any);

      let totalLines = 0;
      let errorsCount = 0;
      const errors: { sheetName: string; row: number; col: string; type: string; message: string; value: string }[] = [];

      // Map sheet types to line types
      const typeMapping: Record<string, string> = {
        revenue: "REVENUE",
        charges: "OPEX",
        investment: "CAPEX",
        pl: "RESULT",
        cashflow: "CASH_IN",
        summary: "TOTAL",
      };

      for (const mapping of input.sheetMappings) {
        const ws = workbook.getWorksheet(mapping.sheetName);
        if (!ws) {
          errors.push({ sheetName: mapping.sheetName, row: 0, col: "", type: "sheet_not_found", message: `Feuille "${mapping.sheetName}" introuvable`, value: "" });
          errorsCount++;
          continue;
        }

        // Get or create category for this sheet
        const existingCat = await db.select().from(erpBudgetCategories)
          .where(and(eq(erpBudgetCategories.budgetId, input.budgetId), eq(erpBudgetCategories.sourceSheet, mapping.sheetName)))
          .limit(1);

        let categoryId: number;
        if (existingCat.length > 0) {
          categoryId = existingCat[0].id;
        } else {
          const catResult = await db.insert(erpBudgetCategories).values({
            budgetId: input.budgetId,
            code: mapping.sheetName.substring(0, 50),
            name: mapping.sheetName,
            categoryType: typeMapping[mapping.sheetType] === "REVENUE" ? "REVENUE" :
              typeMapping[mapping.sheetType] === "CAPEX" ? "CAPEX" :
              typeMapping[mapping.sheetType] === "OPEX" ? "OPEX" : "OTHER" as any,
            sourceSheet: mapping.sheetName,
            sortOrder: 0,
            createdAt: now(),
            updatedAt: now(),
          });
          categoryId = catResult[0].insertId;
        }

        // Calculate number of months
        const numMonths = mapping.monthEndColumn - mapping.monthStartColumn + 1;
        const lineType = typeMapping[mapping.sheetType] || "OPEX";

        // Process rows
        for (let r = mapping.headerRow + 1; r <= ws.rowCount; r++) {
          const row = ws.getRow(r);
          const label = String(row.getCell(mapping.categoryColumn).value || "").trim();
          if (!label) continue;

          // Skip total/subtotal rows if configured (extended FR patterns)
          const totalRowPattern = /^(total|sous[- ]?total|s\/total|résultat|marge|solde|excédent|bénéfice|perte|net|brut)/i;
          if (mapping.skipTotalRows && totalRowPattern.test(label.trim())) continue;

          // Check if it's a numeric data row
          let hasNumericData = false;
          for (let c = mapping.monthStartColumn; c <= mapping.monthEndColumn; c++) {
            const val = row.getCell(c).value;
            if (typeof val === "number" || (val && !isNaN(parseFloat(String(val).replace(/[^\d.-]/g, ""))))) {
              hasNumericData = true;
              break;
            }
          }
          if (!hasNumericData) continue;

          // Create budget line
          try {
            const lineResult = await db.insert(erpBudgetLinesV2).values({
              budgetId: input.budgetId,
              categoryId,
              lineLabel: label,
              lineType: lineType as any,
              sourceSheet: mapping.sheetName,
              sourceRowNumber: r,
              isInputLine: 1,
              sortOrder: totalLines,
              createdAt: now(),
              updatedAt: now(),
            });
            const lineId = lineResult[0].insertId;

            // Create monthly amounts
            for (let c = mapping.monthStartColumn; c <= mapping.monthEndColumn; c++) {
              const monthIdx = c - mapping.monthStartColumn + 1;
              if (monthIdx > 12) break;
              const cellVal = row.getCell(c).value;
              let amount = 0;
              if (typeof cellVal === "number") amount = Math.round(cellVal);
              else if (cellVal) {
                // Handle FR number format: spaces as thousands separator, comma as decimal
                let strVal = String(cellVal).trim();
                strVal = strVal.replace(/\s/g, ""); // Remove spaces (FR thousands separator)
                strVal = strVal.replace(/,/g, "."); // FR decimal comma → dot
                strVal = strVal.replace(/[^\d.\-]/g, ""); // Remove other non-numeric
                const parsed = parseFloat(strVal);
                if (!isNaN(parsed)) amount = Math.round(parsed);
              }

              await db.insert(erpBudgetLineAmounts).values({
                budgetLineId: lineId,
                monthNumber: monthIdx,
                plannedAmount: amount,
                createdAt: now(),
                updatedAt: now(),
              });
            }
            totalLines++;
          } catch (e: any) {
            errors.push({ sheetName: mapping.sheetName, row: r, col: "", type: "insert_error", message: e.message || "Erreur insertion", value: label });
            errorsCount++;
          }
        }
      }

      // Save errors
      for (const err of errors) {
        await db.insert(erpBudgetImportErrors).values({
          budgetImportId: input.importId,
          sheetName: err.sheetName,
          rowNumber: err.row,
          columnName: err.col || null,
          errorType: err.type,
          errorMessage: err.message,
          rawValue: err.value || null,
          severity: "error",
          createdAt: now(),
        });
      }

      // Update import status
      await db.update(erpBudgetImports).set({
        budgetId: input.budgetId,
        importStatus: errorsCount > 0 ? "imported" : "imported",
        importedAt: now(),
        errorsCount,
        warningsCount: 0,
        updatedAt: now(),
      }).where(eq(erpBudgetImports.id, input.importId));

      // Update budget status
      await db.update(erpBudgetsV2).set({ status: "imported", sourceFileId: input.importId, updatedAt: now() }).where(eq(erpBudgetsV2.id, input.budgetId));

      // Audit log
      await createAuditEvent({ actorId: ctx.user.id, action: "erp.budget_v2.import_commit", details: { importId: input.importId, budgetId: input.budgetId, totalLines, errorsCount } });
      // Notification si erreurs
      if (errorsCount > 0) {
        await notifyOwner({ title: "Import Budget — Erreurs détectées", content: `Import #${input.importId} terminé avec ${errorsCount} erreurs sur ${totalLines} lignes.` });
      }
      return { totalLines, errorsCount, errors: errors.slice(0, 20) };
    }),

  // Template mappings CRUD
  templates: router({
    list: erpPermissionProcedure("erp_finance", "view")
      .query(async () => {
        const db = await getDatabase();
        return db.select().from(erpBudgetTemplateMappings).orderBy(erpBudgetTemplateMappings.templateName);
      }),

    create: erpPermissionProcedure("erp_finance", "view")
      .input(z.object({
        templateName: z.string(),
        sheetName: z.string(),
        mappingType: z.enum(["revenue", "charges", "investment", "pl", "cashflow", "summary"]),
        headerRow: z.number().default(1),
        categoryColumn: z.string().optional(),
        lineColumn: z.string().optional(),
        monthStartColumn: z.string().optional(),
        monthEndColumn: z.string().optional(),
        totalColumn: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const db = await getDatabase();
        const result = await db.insert(erpBudgetTemplateMappings).values({
          templateName: input.templateName,
          sheetName: input.sheetName,
          mappingType: input.mappingType,
          headerRow: input.headerRow,
          categoryColumn: input.categoryColumn || null,
          lineColumn: input.lineColumn || null,
          monthStartColumn: input.monthStartColumn || null,
          monthEndColumn: input.monthEndColumn || null,
          totalColumn: input.totalColumn || null,
          isActive: 1,
          createdAt: now(),
          updatedAt: now(),
        });
        return { id: result[0].insertId };
      }),
  }),
});
