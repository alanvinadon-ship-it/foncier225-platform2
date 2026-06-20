/**
 * Scheduled handler: /api/scheduled/budget-snapshots
 * 
 * Génère automatiquement les snapshots P&L et Cash Flow pour tous les budgets actifs.
 * Crée des alertes si des seuils sont dépassés.
 * 
 * Exécuté quotidiennement à 6h UTC via manus-heartbeat.
 * Sprint Budget 2.1
 */
import type { Request, Response } from "express";
import { generateSnapshotsForAllBudgets } from "./erp/erp-budget-snapshot.service";
import { createAuditEvent } from "./db";
import { notifyOwner } from "./_core/notification";

export async function budgetSnapshotsHandler(req: Request, res: Response) {
  try {
    const result = await generateSnapshotsForAllBudgets("heartbeat");

    // Audit log
    await createAuditEvent({ action: "erp.budget_v2.snapshot_job", details: { budgetsProcessed: result.budgetsProcessed, totalPl: result.totalPl, totalCf: result.totalCf, totalAlerts: result.totalAlerts } });
    // Notification si alertes détectées
    if (result.totalAlerts > 0) {
      await notifyOwner({ title: "Budget — Alertes détectées", content: `Job snapshots : ${result.totalAlerts} alertes générées sur ${result.budgetsProcessed} budgets.` });
    }

    return res.json({
      ok: true,
      timestamp: new Date().toISOString(),
      budgetsProcessed: result.budgetsProcessed,
      totalPlSnapshots: result.totalPl,
      totalCashFlowSnapshots: result.totalCf,
      totalAlerts: result.totalAlerts,
    });
  } catch (err: any) {
    console.error("[budget-snapshots] Error:", err);
    return res.status(500).json({
      error: err.message || "Unknown error",
      stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
      context: { url: req.url },
      timestamp: new Date().toISOString(),
    });
  }
}
