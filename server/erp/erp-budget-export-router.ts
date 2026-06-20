import { z } from "zod";
import { eq, and, isNull, sql } from "drizzle-orm";
import { router, erpPermissionProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { storagePut } from "../storage";
import ExcelJS from "exceljs";
import {
  erpBudgetsV2,
  erpBudgetLinesV2,
  erpBudgetLineAmounts,
  erpBudgetCategories,
  erpBudgetPlSnapshots,
  erpBudgetCashflowSnapshots,
} from "../../drizzle/schema";
import { syncBudgetActuals } from "./erp-budget-execution.service";

const getDatabase = async () => (await getDb())!;

export const erpBudgetExportRouter = router({
  // Sync actuals from ERP modules
  syncActuals: erpPermissionProcedure("erp_finance", "view")
    .input(z.object({ budgetId: z.number() }))
    .mutation(async ({ input }) => {
      return syncBudgetActuals(input.budgetId);
    }),

  // Export budget to Excel
  exportExcel: erpPermissionProcedure("erp_finance", "view")
    .input(z.object({
      budgetId: z.number(),
      includeActuals: z.boolean().default(true),
      includeVariance: z.boolean().default(true),
    }))
    .mutation(async ({ input }) => {
      const db = await getDatabase();
      const [budget] = await db.select().from(erpBudgetsV2).where(eq(erpBudgetsV2.id, input.budgetId)).limit(1);
      if (!budget) throw new Error("Budget introuvable");

      const categories = await db.select().from(erpBudgetCategories)
        .where(and(eq(erpBudgetCategories.budgetId, input.budgetId), isNull(erpBudgetCategories.deletedAt)));
      const lines = await db.select().from(erpBudgetLinesV2)
        .where(and(eq(erpBudgetLinesV2.budgetId, input.budgetId), isNull(erpBudgetLinesV2.deletedAt)));
      const lineIds = lines.map(l => l.id);
      const allAmounts = lineIds.length > 0
        ? await db.select().from(erpBudgetLineAmounts).where(sql`${erpBudgetLineAmounts.budgetLineId} IN (${sql.raw(lineIds.join(","))})`)
        : [];

      const workbook = new ExcelJS.Workbook();
      workbook.creator = "Foncier225 ERP";
      workbook.created = new Date();

      // Sheet 1: Budget détaillé
      const ws = workbook.addWorksheet("Budget Détaillé");
      const months = ["Jan", "Fév", "Mar", "Avr", "Mai", "Jun", "Jul", "Aoû", "Sep", "Oct", "Nov", "Déc"];

      // Headers
      const headers = ["Catégorie", "Ligne", "Type"];
      for (const m of months) {
        headers.push(`${m} Prévu`);
        if (input.includeActuals) headers.push(`${m} Réel`);
        if (input.includeVariance) headers.push(`${m} Écart`);
      }
      headers.push("Total Prévu");
      if (input.includeActuals) headers.push("Total Réel");
      if (input.includeVariance) headers.push("Écart %");
      ws.addRow(headers);

      // Style header
      const headerRow = ws.getRow(1);
      headerRow.font = { bold: true };
      headerRow.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1B5E20" } };
      headerRow.font = { bold: true, color: { argb: "FFFFFFFF" } };

      // Data rows grouped by category
      for (const cat of categories) {
        const catLines = lines.filter(l => l.categoryId === cat.id);
        if (catLines.length === 0) continue;

        // Category header row
        const catRow = ws.addRow([cat.name, "", cat.categoryType]);
        catRow.font = { bold: true };

        for (const line of catLines) {
          const lineAmounts = allAmounts.filter(a => a.budgetLineId === line.id);
          const row: any[] = ["", line.lineLabel, line.lineType];
          let totalPlanned = 0, totalActual = 0;

          for (let m = 1; m <= 12; m++) {
            const amt = lineAmounts.find(a => a.monthNumber === m);
            const planned = amt?.plannedAmount || 0;
            const actual = amt?.actualAmount || 0;
            totalPlanned += planned;
            totalActual += actual;
            row.push(planned);
            if (input.includeActuals) row.push(actual);
            if (input.includeVariance) row.push(actual - planned);
          }
          row.push(totalPlanned);
          if (input.includeActuals) row.push(totalActual);
          if (input.includeVariance) row.push(totalPlanned !== 0 ? Math.round(((totalActual - totalPlanned) / totalPlanned) * 100) : 0);
          ws.addRow(row);
        }
      }

      // Auto-width columns
      ws.columns.forEach(col => { col.width = 14; });
      if (ws.columns[0]) ws.columns[0].width = 20;
      if (ws.columns[1]) ws.columns[1].width = 30;

      // Sheet 2: P&L
      const plSnapshots = await db.select().from(erpBudgetPlSnapshots).where(eq(erpBudgetPlSnapshots.budgetId, input.budgetId));
      if (plSnapshots.length > 0) {
        const plWs = workbook.addWorksheet("P&L");
        plWs.addRow(["Mois", "CA Prévu", "CA Réel", "Coûts Directs Prévu", "Coûts Directs Réel", "Marge Directe Prévu", "Marge Directe Réel", "EBITDA Prévu", "EBITDA Réel"]);
        const plHeader = plWs.getRow(1);
        plHeader.font = { bold: true };
        for (const snap of plSnapshots) {
          plWs.addRow([months[snap.monthNumber - 1] || snap.monthNumber, snap.revenuePlanned, snap.revenueActual, snap.directCostsPlanned, snap.directCostsActual, snap.directMarginPlanned, snap.directMarginActual, snap.ebitdaPlanned, snap.ebitdaActual]);
        }
        plWs.columns.forEach(col => { col.width = 16; });
      }

      // Sheet 3: Cash Flow
      const cfSnapshots = await db.select().from(erpBudgetCashflowSnapshots).where(eq(erpBudgetCashflowSnapshots.budgetId, input.budgetId));
      if (cfSnapshots.length > 0) {
        const cfWs = workbook.addWorksheet("Cash Flow");
        cfWs.addRow(["Mois", "Entrées Prévu", "Entrées Réel", "Sorties Prévu", "Sorties Réel", "Net Prévu", "Net Réel", "Solde Ouverture", "Solde Clôture"]);
        const cfHeader = cfWs.getRow(1);
        cfHeader.font = { bold: true };
        for (const snap of cfSnapshots) {
          cfWs.addRow([months[snap.monthNumber - 1] || snap.monthNumber, snap.cashInPlanned, snap.cashInActual, snap.cashOutPlanned, snap.cashOutActual, snap.netCashFlowPlanned, snap.netCashFlowActual, snap.openingCashBalance, snap.closingCashBalance]);
        }
        cfWs.columns.forEach(col => { col.width = 16; });
      }

      // Generate buffer and upload
      const buffer = await workbook.xlsx.writeBuffer();
      const fileName = `budget_${budget.budgetCode}_${budget.fiscalYear}_export.xlsx`;
      const fileKey = `budget-exports/${Date.now()}-${fileName}`;
      const { url } = await storagePut(fileKey, Buffer.from(buffer), "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");

      return { url, fileName };
    }),

  // Export budget to CSV
  exportCsv: erpPermissionProcedure("erp_finance", "view")
    .input(z.object({ budgetId: z.number(), separator: z.string().default(";") }))
    .mutation(async ({ input }) => {
      const db = await getDatabase();
      const [budget] = await db.select().from(erpBudgetsV2).where(eq(erpBudgetsV2.id, input.budgetId)).limit(1);
      if (!budget) throw new Error("Budget introuvable");

      const lines = await db.select().from(erpBudgetLinesV2)
        .where(and(eq(erpBudgetLinesV2.budgetId, input.budgetId), isNull(erpBudgetLinesV2.deletedAt)));
      const lineIds = lines.map(l => l.id);
      const allAmounts = lineIds.length > 0
        ? await db.select().from(erpBudgetLineAmounts).where(sql`${erpBudgetLineAmounts.budgetLineId} IN (${sql.raw(lineIds.join(","))})`)
        : [];

      const sep = input.separator;
      const months = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"];
      let csv = `Code${sep}Libellé${sep}Type${sep}${months.join(sep)}${sep}Total Prévu${sep}Total Réel${sep}Écart %\n`;

      for (const line of lines) {
        const lineAmounts = allAmounts.filter(a => a.budgetLineId === line.id);
        let totalPlanned = 0, totalActual = 0;
        const monthVals: string[] = [];
        for (let m = 1; m <= 12; m++) {
          const amt = lineAmounts.find(a => a.monthNumber === m);
          const planned = amt?.plannedAmount || 0;
          totalPlanned += planned;
          totalActual += (amt?.actualAmount || 0);
          monthVals.push(String(planned));
        }
        const ecart = totalPlanned !== 0 ? Math.round(((totalActual - totalPlanned) / totalPlanned) * 100) : 0;
        csv += `${line.lineCode || ""}${sep}${line.lineLabel}${sep}${line.lineType}${sep}${monthVals.join(sep)}${sep}${totalPlanned}${sep}${totalActual}${sep}${ecart}%\n`;
      }

      const fileName = `budget_${budget.budgetCode}_${budget.fiscalYear}.csv`;
      const fileKey = `budget-exports/${Date.now()}-${fileName}`;
      const { url } = await storagePut(fileKey, Buffer.from(csv, "utf-8"), "text/csv");

      return { url, fileName };
    }),

  // Export P&L summary
  exportPl: erpPermissionProcedure("erp_finance", "view")
    .input(z.object({ budgetId: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDatabase();
      const [budget] = await db.select().from(erpBudgetsV2).where(eq(erpBudgetsV2.id, input.budgetId)).limit(1);
      if (!budget) throw new Error("Budget introuvable");

      const plSnapshots = await db.select().from(erpBudgetPlSnapshots).where(eq(erpBudgetPlSnapshots.budgetId, input.budgetId));
      const months = ["Jan", "Fév", "Mar", "Avr", "Mai", "Jun", "Jul", "Aoû", "Sep", "Oct", "Nov", "Déc"];
      let csv = "Indicateur;" + months.join(";") + ";Total\n";

      const indicators = [
        { label: "CA Prévu", key: "revenuePlanned" },
        { label: "CA Réel", key: "revenueActual" },
        { label: "Coûts Directs Prévu", key: "directCostsPlanned" },
        { label: "Coûts Directs Réel", key: "directCostsActual" },
        { label: "Marge Directe Prévu", key: "directMarginPlanned" },
        { label: "Marge Directe Réel", key: "directMarginActual" },
        { label: "EBITDA Prévu", key: "ebitdaPlanned" },
        { label: "EBITDA Réel", key: "ebitdaActual" },
      ];

      for (const ind of indicators) {
        const vals = months.map((_, i) => {
          const snap = plSnapshots.find(s => s.monthNumber === i + 1);
          return snap ? String((snap as any)[ind.key] || 0) : "0";
        });
        const total = vals.reduce((s, v) => s + parseInt(v), 0);
        csv += `${ind.label};${vals.join(";")};${total}\n`;
      }

      const fileName = `budget_${budget.budgetCode}_PL_${budget.fiscalYear}.csv`;
      const fileKey = `budget-exports/${Date.now()}-${fileName}`;
      const { url } = await storagePut(fileKey, Buffer.from(csv, "utf-8"), "text/csv");
      return { url, fileName };
    }),
});
