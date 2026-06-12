/**
 * Scheduled handler: /api/scheduled/appointment-reminders
 * 
 * Détecte les rendez-vous confirmés dans les prochaines 24h
 * et envoie un rappel (email/SMS + notification in-app) au citoyen et à l'agent.
 * 
 * Idempotent : ne renvoie pas de rappel si reminderSentAt est déjà renseigné.
 * Exécuté toutes les heures via manus-heartbeat.
 */
import type { Request, Response } from "express";
import { getDb } from "./db";
import { appointments, users } from "../drizzle/schema";
import { and, eq, isNull, gte, lte, inArray } from "drizzle-orm";
import { dispatchNotification } from "./email-sms.service";

// 24h window in milliseconds
const REMINDER_WINDOW_MS = 24 * 60 * 60 * 1000;

export async function appointmentRemindersHandler(req: Request, res: Response) {
  try {
    const db = await getDb();
    if (!db) {
      return res.json({ ok: true, skipped: "database not available" });
    }

    const now = Date.now();
    const tomorrow = now + REMINDER_WINDOW_MS;

    // Build the date range for appointments in the next 24h
    const todayStr = new Date(now).toISOString().slice(0, 10);
    const tomorrowStr = new Date(tomorrow).toISOString().slice(0, 10);

    // Find confirmed appointments in the next 24h that haven't been reminded yet
    const upcomingAppointments = await db
      .select({
        id: appointments.id,
        citizenId: appointments.citizenId,
        agentId: appointments.agentId,
        date: appointments.date,
        startTime: appointments.startTime,
        endTime: appointments.endTime,
        motif: appointments.motif,
        dossierType: appointments.dossierType,
        reminderSentAt: appointments.reminderSentAt,
      })
      .from(appointments)
      .where(
        and(
          eq(appointments.status, "confirmed"),
          isNull(appointments.reminderSentAt),
          // Date is today or tomorrow (covers the 24h window)
          inArray(appointments.date, [todayStr, tomorrowStr])
        )
      );

    // Filter more precisely: only those whose appointment datetime is within 24h
    const appointmentsToRemind = upcomingAppointments.filter(apt => {
      const [hours, minutes] = apt.startTime.split(":").map(Number);
      const aptDate = new Date(apt.date + "T00:00:00Z");
      aptDate.setUTCHours(hours, minutes, 0, 0);
      const aptTimestamp = aptDate.getTime();
      return aptTimestamp > now && aptTimestamp <= tomorrow;
    });

    let remindersSent = 0;

    for (const apt of appointmentsToRemind) {
      try {
        // Get citizen and agent names for the notification
        const [citizen] = await db
          .select({ name: users.name, email: users.email })
          .from(users)
          .where(eq(users.id, apt.citizenId))
          .limit(1);

        const [agent] = await db
          .select({ name: users.name, email: users.email })
          .from(users)
          .where(eq(users.id, apt.agentId))
          .limit(1);

        const citizenName = citizen?.name || "Citoyen";
        const agentName = agent?.name || "Agent";
        const dateFormatted = new Date(apt.date + "T00:00:00").toLocaleDateString("fr-FR", {
          weekday: "long",
          day: "numeric",
          month: "long",
          year: "numeric",
        });

        // Send reminder to citizen
        await dispatchNotification({
          userId: apt.citizenId,
          subject: `Rappel : Rendez-vous demain à ${apt.startTime}`,
          htmlBody: `
            <h2>Rappel de rendez-vous</h2>
            <p>Bonjour ${citizenName},</p>
            <p>Nous vous rappelons votre rendez-vous prévu :</p>
            <ul>
              <li><strong>Date :</strong> ${dateFormatted}</li>
              <li><strong>Heure :</strong> ${apt.startTime} - ${apt.endTime}</li>
              <li><strong>Agent :</strong> ${agentName}</li>
              <li><strong>Motif :</strong> ${apt.motif}</li>
            </ul>
            <p>Veuillez vous présenter à l'heure. En cas d'empêchement, annulez votre rendez-vous depuis votre espace citoyen.</p>
            <p>Cordialement,<br/>Foncier225</p>
          `,
          smsMessage: `Rappel Foncier225 : RDV demain ${apt.startTime} avec ${agentName}. Motif: ${apt.motif}. Annulez depuis votre espace si empêché.`,
          eventType: "general",
        });

        // Send reminder to agent
        await dispatchNotification({
          userId: apt.agentId,
          subject: `Rappel : Rendez-vous demain à ${apt.startTime} avec ${citizenName}`,
          htmlBody: `
            <h2>Rappel de rendez-vous</h2>
            <p>Bonjour ${agentName},</p>
            <p>Vous avez un rendez-vous prévu demain :</p>
            <ul>
              <li><strong>Date :</strong> ${dateFormatted}</li>
              <li><strong>Heure :</strong> ${apt.startTime} - ${apt.endTime}</li>
              <li><strong>Citoyen :</strong> ${citizenName}</li>
              <li><strong>Motif :</strong> ${apt.motif}</li>
            </ul>
            <p>Cordialement,<br/>Foncier225</p>
          `,
          smsMessage: `Rappel Foncier225 : RDV demain ${apt.startTime} avec ${citizenName}. Motif: ${apt.motif}.`,
          eventType: "general",
        });

        // Also create in-app notifications
        const { createCitizenNotification } = await import("./db");
        await createCitizenNotification({
          userId: apt.citizenId,
          type: "general",
          title: "Rappel de rendez-vous",
          message: `Votre rendez-vous avec ${agentName} est prévu demain à ${apt.startTime}. Motif : ${apt.motif}`,
          createdAt: Date.now(),
        });

        await createCitizenNotification({
          userId: apt.agentId,
          type: "general",
          title: "Rappel de rendez-vous",
          message: `Rendez-vous avec ${citizenName} prévu demain à ${apt.startTime}. Motif : ${apt.motif}`,
          createdAt: Date.now(),
        });

        // Mark as reminded (idempotent)
        await db
          .update(appointments)
          .set({ reminderSentAt: Date.now() })
          .where(eq(appointments.id, apt.id));

        remindersSent++;
      } catch (err) {
        console.error(`[appointment-reminders] Failed to send reminder for appointment ${apt.id}:`, err);
      }
    }

    res.json({
      ok: true,
      timestamp: new Date().toISOString(),
      totalChecked: appointmentsToRemind.length,
      remindersSent,
    });
  } catch (error) {
    console.error("[appointment-reminders] Handler error:", error);
    res.status(500).json({
      error: String(error),
      stack: error instanceof Error ? error.stack : undefined,
      context: { url: req.url },
      timestamp: new Date().toISOString(),
    });
  }
}
