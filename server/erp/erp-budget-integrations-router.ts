/**
 * erp-budget-integrations-router.ts
 * 
 * Routeur tRPC pour l'administration des jobs d'intégration Budget.
 * - list: historique des jobs
 * - getById: détail d'un job
 * - run: lancer un job manuellement
 * - retry: relancer un job échoué
 * 
 * Sprint Direction 360
 */
import { z } from "zod";
import { eq, desc, sql, and } from "drizzle-orm";
import { router, erpPermissionProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { erpBudgetIntegrationJobs } from "../../drizzle/schema";
import { runIntegrationJob, type JobType } from "./erp-budget-integration.service";
import { createAuditEvent } from "../db";
import { notifyOwner } from "../_core/notification";

const VALID_JOB_TYPES: JobType[] = ["full_sync", "sync_real_estate_actuals", "sync_sales_targets", "generate_analytic_snapshots"];

export const erpBudgetIntegrationsRouter = router({
  /**
   * Liste des jobs d'intégration avec pagination et filtres
   */
  list: erpPermissionProcedure("erp_budget_integrations", "view")
    .input(z.object({
      limit: z.number().min(1).max(100).default(20),
      offset: z.number().min(0).default(0),
      jobType: z.string().optional(),
      status: z.string().optional(),
      triggerSource: z.string().optional(),
    }).optional())
    .query(async ({ input }: any) => {
      const db = (await getDb())!;
      const { limit = 20, offset = 0, jobType, status, triggerSource } = input || {};

      const conditions = [];
      if (jobType) conditions.push(eq(erpBudgetIntegrationJobs.jobType, jobType));
      if (status) conditions.push(eq(erpBudgetIntegrationJobs.status, status));
      if (triggerSource) conditions.push(eq(erpBudgetIntegrationJobs.triggerSource, triggerSource));

      const where = conditions.length > 0 ? and(...conditions) : undefined;

      const [jobs, countResult] = await Promise.all([
        db.select().from(erpBudgetIntegrationJobs)
          .where(where)
          .orderBy(desc(erpBudgetIntegrationJobs.createdAt))
          .limit(limit)
          .offset(offset),
        db.select({ count: sql<number>`COUNT(*)` }).from(erpBudgetIntegrationJobs).where(where),
      ]);

      return {
        jobs,
        total: countResult[0]?.count || 0,
        limit,
        offset,
      };
    }),

  /**
   * Détail d'un job par ID
   */
  getById: erpPermissionProcedure("erp_budget_integrations", "view")
    .input(z.object({ id: z.number() }))
    .query(async ({ input }: any) => {
      const db = (await getDb())!;
      const [job] = await db.select().from(erpBudgetIntegrationJobs)
        .where(eq(erpBudgetIntegrationJobs.id, input.id));
      return job || null;
    }),

  /**
   * Lancer un job manuellement
   */
  run: erpPermissionProcedure("erp_budget_integrations", "sync")
    .input(z.object({
      jobType: z.enum(["full_sync", "sync_real_estate_actuals", "sync_sales_targets", "generate_analytic_snapshots"]),
      syncScope: z.enum(["all", "active_budgets", "current_period", "specific_budget"]).default("all"),
      budgetId: z.number().optional(),
      periodId: z.number().optional(),
      forceRecalculate: z.boolean().default(false),
    }))
    .mutation(async ({ input, ctx }: any) => {
      const db = (await getDb())!;

      // Vérifier qu'aucun job n'est en cours
      const [runningJob] = await db.select().from(erpBudgetIntegrationJobs)
        .where(eq(erpBudgetIntegrationJobs.status, "running"))
        .limit(1);

      if (runningJob) {
        return { error: "Un job est déjà en cours d'exécution. Veuillez attendre sa fin.", runningJobId: runningJob.id };
      }

      const result = await runIntegrationJob(input.jobType, "user");

      // Audit log
      await createAuditEvent({
        action: "erp.budget_integrations.manual_run",
        actorId: (ctx as any).user?.id,
        details: {
          jobId: result.jobId,
          jobType: input.jobType,
          syncScope: input.syncScope,
          status: result.status,
          recordsProcessed: result.recordsProcessed,
          errors: result.errors.length,
        },
      });

      return result;
    }),

  /**
   * Relancer un job échoué
   */
  retry: erpPermissionProcedure("erp_budget_integrations", "sync")
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }: { input: { id: number }; ctx: any }) => {
      const db = (await getDb())!;

      // Récupérer le job original
      const [originalJob] = await db.select().from(erpBudgetIntegrationJobs)
        .where(eq(erpBudgetIntegrationJobs.id, input.id));

      if (!originalJob) {
        return { error: "Job non trouvé" };
      }

      if (originalJob.status !== "failed" && originalJob.status !== "completed") {
        return { error: "Seuls les jobs échoués ou terminés peuvent être relancés" };
      }

      // Vérifier qu'aucun job n'est en cours
      const [runningJob] = await db.select().from(erpBudgetIntegrationJobs)
        .where(eq(erpBudgetIntegrationJobs.status, "running"))
        .limit(1);

      if (runningJob) {
        return { error: "Un job est déjà en cours d'exécution" };
      }

      const result = await runIntegrationJob(originalJob.jobType as JobType, "user");

      // Audit log
      await createAuditEvent({
        action: "erp.budget_integrations.retry",
        actorId: ctx.user?.id,
        details: {
          originalJobId: input.id,
          newJobId: result.jobId,
          jobType: originalJob.jobType,
          status: result.status,
        },
      });

      return result;
    }),

  /**
   * Dernier job réussi (pour afficher la date de dernière synchronisation)
   */
  lastSuccess: erpPermissionProcedure("erp_budget_integrations", "view")
    .query(async () => {
      const db = (await getDb())!;
      const [job] = await db.select().from(erpBudgetIntegrationJobs)
        .where(eq(erpBudgetIntegrationJobs.status, "success"))
        .orderBy(desc(erpBudgetIntegrationJobs.finishedAt))
        .limit(1);
      return job || null;
    }),
});
