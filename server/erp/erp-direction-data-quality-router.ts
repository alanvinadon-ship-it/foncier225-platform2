import { z } from "zod";
import { router } from "../_core/trpc";
import { erpPermissionProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { createAuditEvent } from "../db";
import {
  erpDirectionDataQualityChecks,
  erpBudgets,
  erpBudgetLines,
  erpInvoices,
  erpRealEstateSales,
  erpRealEstatePrograms,
  erpRealEstateUnits,
  erpProjects,
  erpSalesTargets,
  erpSalesTargetResults,
  erpCostCenters,
} from "../../drizzle/schema";
import { eq, desc, and, isNull, sql } from "drizzle-orm";
import { notifyOwner } from "../_core/notification";

// ─── Définition des checks qualité ──────────────────────────────────────────
interface QualityCheckDef {
  key: string;
  name: string;
  module: string;
  severity: "low" | "medium" | "high" | "critical";
  run: (db: any) => Promise<{ status: "passed" | "warning" | "failed"; recordsCount: number; details: any }>;
}

const QUALITY_CHECKS: QualityCheckDef[] = [
  {
    key: "budget_lines_no_category",
    name: "Lignes budgétaires sans catégorie",
    module: "budget",
    severity: "medium",
    run: async (db) => {
      const rows = await db.select({ count: sql<number>`COUNT(*)` })
        .from(erpBudgetLines)
        .where(isNull(erpBudgetLines.category));
      const count = rows[0]?.count || 0;
      return { status: count > 0 ? "warning" : "passed", recordsCount: count, details: { message: `${count} lignes sans catégorie` } };
    },
  },
  {
    key: "invoices_no_vendor",
    name: "Factures sans fournisseur",
    module: "invoices",
    severity: "high",
    run: async (db) => {
      const rows = await db.select({ count: sql<number>`COUNT(*)` })
        .from(erpInvoices)
        .where(isNull(erpInvoices.vendorId));
      const count = rows[0]?.count || 0;
      return { status: count > 0 ? "warning" : "passed", recordsCount: count, details: { message: `${count} factures sans fournisseur` } };
    },
  },
  {
    key: "sales_no_unit",
    name: "Ventes sans unité liée",
    module: "real_estate",
    severity: "high",
    run: async (db) => {
      const rows = await db.select({ count: sql<number>`COUNT(*)` })
        .from(erpRealEstateSales)
        .where(isNull(erpRealEstateSales.unitId));
      const count = rows[0]?.count || 0;
      return { status: count > 0 ? "warning" : "passed", recordsCount: count, details: { message: `${count} ventes sans unité` } };
    },
  },
  {
    key: "projects_no_budget",
    name: "Projets sans budget associé",
    module: "projects",
    severity: "medium",
    run: async (db) => {
      const projects = await db.select().from(erpProjects).limit(200);
      const budgets = await db.select().from(erpBudgets).limit(200);
      const budgetProjectIds = new Set(budgets.map((b: any) => b.projectId));
      const orphans = projects.filter((p: any) => !budgetProjectIds.has(p.id));
      return { status: orphans.length > 0 ? "warning" : "passed", recordsCount: orphans.length, details: { message: `${orphans.length} projets sans budget` } };
    },
  },
  {
    key: "cost_centers_over_budget",
    name: "Centres de coût en dépassement",
    module: "budget",
    severity: "critical",
    run: async (db) => {
      const rows = await db.select().from(erpCostCenters).limit(100);
      const overBudget = rows.filter((c: any) => Number(c.currentSpend || 0) > Number(c.allocatedBudget || 0));
      return { status: overBudget.length > 0 ? "failed" : "passed", recordsCount: overBudget.length, details: { message: `${overBudget.length} centres en dépassement`, centers: overBudget.map((c: any) => c.name) } };
    },
  },
  {
    key: "sales_targets_no_results",
    name: "Objectifs commerciaux sans résultats",
    module: "sales",
    severity: "medium",
    run: async (db) => {
      const targets = await db.select().from(erpSalesTargets).limit(100);
      const results = await db.select().from(erpSalesTargetResults).limit(500);
      const targetIdsWithResults = new Set(results.map((r: any) => r.salesTargetId));
      const orphans = targets.filter((t: any) => !targetIdsWithResults.has(t.id));
      return { status: orphans.length > 0 ? "warning" : "passed", recordsCount: orphans.length, details: { message: `${orphans.length} objectifs sans résultats` } };
    },
  },
  {
    key: "programs_no_units",
    name: "Programmes immobiliers sans unités",
    module: "real_estate",
    severity: "medium",
    run: async (db) => {
      const programs = await db.select().from(erpRealEstatePrograms).limit(100);
      const units = await db.select().from(erpRealEstateUnits).limit(500);
      const programIdsWithUnits = new Set(units.map((u: any) => u.programId));
      const orphans = programs.filter((p: any) => !programIdsWithUnits.has(p.id));
      return { status: orphans.length > 0 ? "warning" : "passed", recordsCount: orphans.length, details: { message: `${orphans.length} programmes sans unités` } };
    },
  },
];

// ─── Routeur Contrôle Qualité Données ────────────────────────────────────────
export const erpDirectionDataQualityRouter = router({
  // Run all checks
  runAll: erpPermissionProcedure("erp_direction_dashboard", "recalculate")
    .input(z.object({}).optional())
    .mutation(async ({ ctx }) => {
      const db = (await getDb())!;
      const now = Date.now();
      const results: Array<{ key: string; name: string; module: string; severity: string; status: string; recordsCount: number; details: any }> = [];

      for (const check of QUALITY_CHECKS) {
        try {
          const result = await check.run(db);
          // Upsert check result
          const [existing] = await db.select().from(erpDirectionDataQualityChecks)
            .where(eq(erpDirectionDataQualityChecks.checkKey, check.key));

          if (existing) {
            await db.update(erpDirectionDataQualityChecks).set({
              status: result.status,
              recordsCount: result.recordsCount,
              detailsJson: result.details,
              lastCheckedAt: now,
              updatedAt: now,
            }).where(eq(erpDirectionDataQualityChecks.id, existing.id));
          } else {
            await db.insert(erpDirectionDataQualityChecks).values({
              checkKey: check.key,
              checkName: check.name,
              module: check.module,
              severity: check.severity,
              status: result.status,
              recordsCount: result.recordsCount,
              detailsJson: result.details,
              lastCheckedAt: now,
              createdAt: now,
              updatedAt: now,
            });
          }
          results.push({ key: check.key, name: check.name, module: check.module, severity: check.severity, ...result });
        } catch (err: unknown) {
          results.push({ key: check.key, name: check.name, module: check.module, severity: check.severity, status: "failed", recordsCount: 0, details: { error: err instanceof Error ? err.message : "unknown" } });
        }
      }

      const failedCount = results.filter(r => r.status === "failed").length;
      const warningCount = results.filter(r => r.status === "warning").length;

      await createAuditEvent({
        actorId: ctx.user.id,
        action: "direction.data_quality.run_all",
        targetType: "data_quality_check",
        targetId: 0,
        details: { totalChecks: results.length, failed: failedCount, warnings: warningCount },
      });

      if (failedCount > 0) {
        await notifyOwner({ title: "Contrôle qualité — Échecs détectés", content: `${failedCount} check(s) en échec, ${warningCount} warning(s) sur ${results.length} vérifications.` });
      }

      return { results, summary: { total: results.length, passed: results.filter(r => r.status === "passed").length, warnings: warningCount, failed: failedCount } };
    }),

  // Get latest results
  latest: erpPermissionProcedure("erp_direction_dashboard", "view")
    .input(z.object({}).optional())
    .query(async () => {
      const db = (await getDb())!;
      const rows = await db.select().from(erpDirectionDataQualityChecks)
        .orderBy(desc(erpDirectionDataQualityChecks.lastCheckedAt));
      return rows;
    }),

  // Get check definitions
  definitions: erpPermissionProcedure("erp_direction_dashboard", "view")
    .input(z.object({}).optional())
    .query(async () => {
      return QUALITY_CHECKS.map(c => ({ key: c.key, name: c.name, module: c.module, severity: c.severity }));
    }),
});
