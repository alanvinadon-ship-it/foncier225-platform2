/**
 * Scheduled handler: /api/scheduled/budget-integrations
 * 
 * Exécute automatiquement la synchronisation complète Budget/Objectifs/Ventes Immobilières/Analytique.
 * Sécurisé par header x-scheduled-job-secret.
 * 
 * Sprint Direction 360
 */
import type { Request, Response } from "express";
import { runIntegrationJob } from "./erp/erp-budget-integration.service";
import { createAuditEvent } from "./db";
import { notifyOwner } from "./_core/notification";
import type { JobType } from "./erp/erp-budget-integration.service";

const VALID_JOB_TYPES: JobType[] = ["full_sync", "sync_real_estate_actuals", "sync_sales_targets", "generate_analytic_snapshots"];

export async function budgetIntegrationsHandler(req: Request, res: Response) {
  try {
    // Paramètres du body
    const jobType: JobType = req.body?.job_type || "full_sync";
    const triggerSource = "scheduled";

    if (!VALID_JOB_TYPES.includes(jobType)) {
      return res.status(400).json({ error: `Invalid job_type: ${jobType}. Valid: ${VALID_JOB_TYPES.join(", ")}` });
    }

    // Exécuter le job
    const result = await runIntegrationJob(jobType, triggerSource);

    // Audit log
    await createAuditEvent({
      action: "erp.budget_integrations.scheduled_sync",
      details: {
        jobId: result.jobId,
        jobType: result.jobType,
        status: result.status,
        recordsProcessed: result.recordsProcessed,
        errors: result.errors.length,
        duration: result.duration,
        triggerSource,
      },
    });

    // Notification si échec
    if (result.status === "failed" || result.errors.length > 0) {
      await notifyOwner({
        title: "⚠️ Budget Intégration — Erreurs détectées",
        content: `Job ${jobType} terminé avec ${result.errors.length} erreur(s). Durée: ${result.duration}ms. Détails: ${result.errors.slice(0, 3).join("; ")}`,
      });
    }

    return res.json({
      ok: true,
      timestamp: new Date().toISOString(),
      jobId: result.jobId,
      jobType: result.jobType,
      status: result.status,
      recordsProcessed: result.recordsProcessed,
      errorsCount: result.errors.length,
      duration: result.duration,
    });
  } catch (err: any) {
    console.error("[budget-integrations] Error:", err);

    // Notification critique
    await notifyOwner({
      title: "🚨 Budget Intégration — Échec critique",
      content: `Le job scheduled budget-integrations a échoué: ${err.message}`,
    }).catch(() => {});

    return res.status(500).json({
      error: err.message || "Unknown error",
      timestamp: new Date().toISOString(),
    });
  }
}
