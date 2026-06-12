/**
 * Scheduled handler: /api/scheduled/delay-alerts
 * 
 * Détecte les dossiers ACD et ruraux dont l'étape en cours dépasse
 * le délai théorique de +20% et envoie une notification au citoyen et à l'admin.
 * 
 * Exécuté quotidiennement à 08h UTC via manus-heartbeat.
 */
import type { Request, Response } from "express";
import { getDb, notifyCitizenStatusChange } from "./db";
import { urbanAcdApplications, landTitleApplications } from "../drizzle/schema";
import { notInArray } from "drizzle-orm";

// Theoretical durations in days for ACD steps
const ACD_STEP_DURATIONS: Record<string, number> = {
  acd_submitted: 7,
  acd_lot_check: 14,
  acd_technical_instruction: 30,
  acd_commission: 21,
  acd_acp_signed: 14,
  acd_development_notified: 7,
  acd_development_ongoing: 730, // 24 months
  acd_development_verified: 30,
  acd_transformation_requested: 14,
  acd_conformity_check: 30,
  acd_acd_signed: 21,
  acd_journal_officiel: 30,
};

// Theoretical durations in days for rural steps
const RURAL_STEP_DURATIONS: Record<string, number> = {
  cf_submitted: 7,
  cf_delimitation: 30,
  cf_delimited: 14,
  cf_inquiry: 30,
  cf_publicity: 30,
  cf_validated: 21,
  tf_submitted: 14,
  tf_afor_review: 30,
  tf_apfr_ready: 21,
  tf_minister_signing: 30,
};

// Terminal statuses (no delay check needed)
const TERMINAL_STATUSES_ACD = ["acd_draft", "acd_delivered", "acd_rejected", "acd_cancelled"];
const TERMINAL_STATUSES_RURAL = ["cf_draft", "cf_signed", "cf_rejected", "tf_signed", "tf_registered", "tf_rejected"];

const DELAY_THRESHOLD = 1.2; // +20%

export async function delayAlertsHandler(req: Request, res: Response) {
  try {
    const alerts: { type: string; reference: string; userId: number; status: string; daysOverdue: number }[] = [];

    // 1. Check ACD applications
    const db = await getDb();
    if (!db) {
      return res.json({ ok: true, skipped: "database not available" });
    }

    const acdApps = await db
      .select()
      .from(urbanAcdApplications)
      .where(notInArray(urbanAcdApplications.status, TERMINAL_STATUSES_ACD));

    for (const app of acdApps) {
      const theoreticalDays = ACD_STEP_DURATIONS[app.status];
      if (!theoreticalDays) continue;

      const updatedAt = app.updatedAt ? new Date(app.updatedAt) : new Date(app.createdAt);
      const daysSinceUpdate = (Date.now() - updatedAt.getTime()) / (1000 * 60 * 60 * 24);
      const threshold = theoreticalDays * DELAY_THRESHOLD;

      if (daysSinceUpdate > threshold) {
        alerts.push({
          type: "urban",
          reference: app.applicationNumber,
          userId: app.userId,
          status: app.status,
          daysOverdue: Math.round(daysSinceUpdate - theoreticalDays),
        });
      }
    }

    // 2. Check rural applications
    const ruralApps = await db
      .select()
      .from(landTitleApplications)
      .where(notInArray(landTitleApplications.status, TERMINAL_STATUSES_RURAL));

    for (const app of ruralApps) {
      const theoreticalDays = RURAL_STEP_DURATIONS[app.status];
      if (!theoreticalDays) continue;

      const updatedAt = app.updatedAt ? new Date(app.updatedAt) : new Date(app.createdAt);
      const daysSinceUpdate = (Date.now() - updatedAt.getTime()) / (1000 * 60 * 60 * 24);
      const threshold = theoreticalDays * DELAY_THRESHOLD;

      if (daysSinceUpdate > threshold) {
        alerts.push({
          type: "rural",
          reference: app.applicationNumber,
          userId: app.userId,
          status: app.status,
          daysOverdue: Math.round(daysSinceUpdate - theoreticalDays),
        });
      }
    }

    // 3. Send notifications for each alert
    let notificationsSent = 0;
    for (const alert of alerts) {
      try {
        await notifyCitizenStatusChange({
          userId: alert.userId,
          module: alert.type === "urban" ? "urban_acd" : "land_title",
          entityId: 0,
          oldStatus: alert.status,
          newStatus: alert.status,
          applicationNumber: alert.reference,
        });
        notificationsSent++;
      } catch (err) {
        console.error(`[delay-alerts] Failed to notify user ${alert.userId} for ${alert.reference}:`, err);
      }
    }

    res.json({
      ok: true,
      timestamp: new Date().toISOString(),
      totalChecked: acdApps.length + ruralApps.length,
      alertsDetected: alerts.length,
      notificationsSent,
    });
  } catch (error) {
    console.error("[delay-alerts] Handler error:", error);
    res.status(500).json({
      error: String(error),
      stack: error instanceof Error ? error.stack : undefined,
      context: { url: req.url },
      timestamp: new Date().toISOString(),
    });
  }
}
