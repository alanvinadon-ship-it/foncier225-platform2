/**
 * erp-direction-reports-router.ts
 * 
 * Routeur tRPC pour la gestion des exports PDF Direction.
 * Sprint Direction 360
 */
import { z } from "zod";
import { eq, desc, sql } from "drizzle-orm";
import { router, erpPermissionProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { createAuditEvent } from "../db";
import { erpDirectionReportExports } from "../../drizzle/schema";
import { generateDirectionReport } from "./erp-direction-report.service";

export const erpDirectionReportsRouter = router({
  /**
   * Générer un nouveau rapport PDF Direction
   */
  generate: erpPermissionProcedure("erp_budget_integrations", "export")
    .input(z.object({
      title: z.string().optional(),
      period: z.string().optional(),
      year: z.number().optional(),
      sections: z.array(z.string()).optional(),
    }).optional())
    .mutation(async ({ input, ctx }: any) => {
      const result = await generateDirectionReport({
        title: input?.title,
        period: input?.period,
        year: input?.year,
        generatedBy: String(ctx.user?.id),
        generatedByName: ctx.user?.name || "Utilisateur",
        sections: input?.sections,
      });

      // Audit log
      await createAuditEvent({
        actorId: ctx.user?.id,
        action: "erp.direction_report.generated",
        targetType: "direction_report_export",
        targetId: result.exportId,
        details: {
          fileName: result.fileName,
          period: input?.period,
        },
      });

      return result;
    }),

  /**
   * Liste des exports PDF avec pagination
   */
  list: erpPermissionProcedure("erp_budget_integrations", "view")
    .input(z.object({
      limit: z.number().min(1).max(50).default(20),
      offset: z.number().min(0).default(0),
      status: z.string().optional(),
    }).optional())
    .query(async ({ input }: any) => {
      const db = (await getDb())!;
      const { limit = 20, offset = 0, status } = input || {};

      let query = db.select().from(erpDirectionReportExports)
        .orderBy(desc(erpDirectionReportExports.createdAt))
        .limit(limit)
        .offset(offset);

      if (status) {
        query = query.where(eq(erpDirectionReportExports.status, status)) as any;
      }

      const exports = await query;
      const [countResult] = await db.select({ count: sql<number>`COUNT(*)` }).from(erpDirectionReportExports);

      return {
        exports,
        total: countResult?.count || 0,
        limit,
        offset,
      };
    }),

  /**
   * Détail d'un export
   */
  getById: erpPermissionProcedure("erp_budget_integrations", "view")
    .input(z.object({ id: z.number() }))
    .query(async ({ input }: any) => {
      const db = (await getDb())!;
      const [exp] = await db.select().from(erpDirectionReportExports)
        .where(eq(erpDirectionReportExports.id, input.id));
      return exp || null;
    }),

  /**
   * Marquer un export comme téléchargé
   */
  markDownloaded: erpPermissionProcedure("erp_budget_integrations", "view")
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }: any) => {
      const db = (await getDb())!;
      await db.update(erpDirectionReportExports)
        .set({ status: "downloaded", downloadedAt: Date.now(), updatedAt: Date.now() })
        .where(eq(erpDirectionReportExports.id, input.id));
      return { success: true };
    }),
});
