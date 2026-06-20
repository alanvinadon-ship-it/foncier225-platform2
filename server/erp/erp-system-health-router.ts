/**
 * ERP System Health Router — Monitoring et observabilité
 * Sprint Industrialisation ERP 1.0
 */
import { z } from "zod";
import { getDb, createAuditEvent } from "../db";
import { erpPermissionProcedure } from "../_core/trpc";
import { router } from "../_core/trpc";
import { sql, count, desc, eq } from "drizzle-orm";
import {
  users,
  auditEvents,
  erpBudgetIntegrationJobs,
  erpDirectionDataQualityChecks,
  erpDirectionReportExports,
} from "../../drizzle/schema";

export const erpSystemHealthRouter = router({
  // Overview: key metrics for system health
  overview: erpPermissionProcedure("erp_system_health", "view")
    .query(async () => {
      const db = await getDb();
      if (!db) return null;

      const now = Date.now();
      const last24h = now - 24 * 60 * 60 * 1000;
      const last7d = now - 7 * 24 * 60 * 60 * 1000;

      // Total users
      const [totalUsers] = await db.select({ count: count() }).from(users);

      // Audit events last 24h
      const [auditLast24h] = await db.select({ count: count() }).from(auditEvents)
        .where(sql`${auditEvents.createdAt} >= NOW() - INTERVAL 1 DAY`);

      // Jobs last 24h
      const [jobsLast24h] = await db.select({ count: count() }).from(erpBudgetIntegrationJobs)
        .where(sql`${erpBudgetIntegrationJobs.startedAt} >= ${last24h}`);

      // Failed jobs last 7d
      const [failedJobs7d] = await db.select({ count: count() }).from(erpBudgetIntegrationJobs)
        .where(sql`${erpBudgetIntegrationJobs.startedAt} >= ${last7d} AND ${erpBudgetIntegrationJobs.status} = 'failed'`);

      // Last job execution
      const [lastJob] = await db.select().from(erpBudgetIntegrationJobs)
        .orderBy(desc(erpBudgetIntegrationJobs.startedAt)).limit(1);

      // Data quality checks last run
      const [lastQualityCheck] = await db.select().from(erpDirectionDataQualityChecks)
        .orderBy(desc(erpDirectionDataQualityChecks.createdAt)).limit(1);

      // Exports last 7d
      const [exportsLast7d] = await db.select({ count: count() }).from(erpDirectionReportExports)
        .where(sql`${erpDirectionReportExports.createdAt} >= ${last7d}`);

      return {
        totalUsers: totalUsers?.count || 0,
        auditEventsLast24h: auditLast24h?.count || 0,
        jobsLast24h: jobsLast24h?.count || 0,
        failedJobsLast7d: failedJobs7d?.count || 0,
        lastJobAt: lastJob?.startedAt || null,
        lastJobStatus: lastJob?.status || null,
        lastQualityCheckAt: lastQualityCheck?.createdAt || null,
        exportsLast7d: exportsLast7d?.count || 0,
        serverTime: now,
        uptime: process.uptime(),
        memoryUsage: process.memoryUsage(),
        nodeVersion: process.version,
      };
    }),

  // Jobs history
  jobs: erpPermissionProcedure("erp_scheduled_jobs", "view")
    .input(z.object({ limit: z.number().min(1).max(200).default(50) }).optional())
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];

      const limit = input?.limit ?? 50;
      return db.select().from(erpBudgetIntegrationJobs)
        .orderBy(desc(erpBudgetIntegrationJobs.startedAt))
        .limit(limit);
    }),

  // Recent audit events
  recentAudit: erpPermissionProcedure("erp_system_health", "view")
    .input(z.object({ limit: z.number().min(1).max(100).default(20) }).optional())
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];

      const limit = input?.limit ?? 20;
      return db.select().from(auditEvents)
        .orderBy(desc(auditEvents.createdAt))
        .limit(limit);
    }),
});
