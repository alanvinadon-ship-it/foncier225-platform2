/**
 * Webhooks entrants SIGFU et SIFOR-CI
 * 
 * Reçoit les notifications de changement de statut depuis les plateformes
 * de l'État et met à jour les dossiers locaux + notifie les citoyens.
 */

import type { Request, Response } from "express";
import crypto from "crypto";
import { getDb } from "./db";
import { webhookEvents, notificationPreferences } from "../drizzle/schema";
import { eq, and } from "drizzle-orm";
import { createCitizenNotification } from "./db";
import { dispatchNotification } from "./email-sms.service";

// ─── Types ──────────────────────────────────────────────────────────────────

interface SigfuWebhookPayload {
  event_id: string;
  event_type: "status_changed" | "document_added" | "opposition_received" | "bornage_programme";
  timestamp: string;
  data: {
    numero_demande: string;
    previous_status?: string;
    new_status?: string;
    demandeur_id?: string;
    demandeur_nom?: string;
    demandeur_email?: string;
    demandeur_telephone?: string;
    message?: string;
    document_type?: string;
    document_url?: string;
  };
}

interface SiforWebhookPayload {
  event_id: string;
  event_type: "status_changed" | "enquete_programmee" | "opposition_received" | "certificat_delivre";
  timestamp: string;
  data: {
    numero_certificat: string;
    previous_status?: string;
    new_status?: string;
    demandeur_id?: string;
    demandeur_nom?: string;
    demandeur_email?: string;
    demandeur_telephone?: string;
    message?: string;
    date_enquete?: string;
    enqueteur?: string;
  };
}

// ─── Signature Verification ─────────────────────────────────────────────────

function verifyHmacSignature(payload: string, signature: string, secret: string): boolean {
  if (!secret || !signature) return false;
  const expected = crypto
    .createHmac("sha256", secret)
    .update(payload)
    .digest("hex");
  return crypto.timingSafeEqual(
    Buffer.from(signature, "hex"),
    Buffer.from(expected, "hex")
  );
}

// ─── Event Deduplication ────────────────────────────────────────────────────

async function isEventProcessed(eventId: string, source: "sigfu" | "sifor"): Promise<boolean> {
  const database = await getDb();
  if (!database) return false;
  const existing = await database
    .select({ id: webhookEvents.id })
    .from(webhookEvents)
    .where(and(eq(webhookEvents.eventId, eventId), eq(webhookEvents.source, source)))
    .limit(1);
  return existing.length > 0;
}

// ─── Notification Helpers ───────────────────────────────────────────────────

const SIGFU_STATUS_LABELS: Record<string, string> = {
  INITIEE: "Initiée",
  EN_VERIFICATION: "En vérification",
  DOCUMENTS_REQUIS: "Documents requis",
  EN_INSTRUCTION: "En instruction",
  BORNAGE_PROGRAMME: "Bornage programmé",
  BORNAGE_EFFECTUE: "Bornage effectué",
  PUBLICATION_JO: "Publication au J.O.",
  OPPOSITION_EN_COURS: "Opposition en cours",
  COMMISSION_CONSULTATIVE: "Commission consultative",
  SIGNATURE_MINISTRE: "Signature du Ministre",
  DELIVRANCE_ACTE: "Délivrance de l'acte",
  TERMINEE: "Terminée",
  REJETEE: "Rejetée",
  ANNULEE: "Annulée",
};

const SIFOR_STATUS_LABELS: Record<string, string> = {
  DEMANDE_DEPOSEE: "Demande déposée",
  ENQUETE_PROGRAMMEE: "Enquête programmée",
  ENQUETE_EN_COURS: "Enquête en cours",
  PUBLICITE_FONCIERE: "Publicité foncière",
  OPPOSITION_RECUE: "Opposition reçue",
  CERTIFICAT_DELIVRE: "Certificat délivré",
  REFUSE: "Refusé",
};

async function notifyCitizen(params: {
  citizenId: number | null;
  email?: string;
  telephone?: string;
  nom?: string;
  source: "sigfu" | "sifor";
  reference: string;
  newStatus: string;
  message?: string;
}) {
  const { citizenId, email, telephone, nom, source, reference, newStatus, message } = params;
  const sourceLabel = source === "sigfu" ? "SIGFU" : "SIFOR-CI";
  const statusLabel = source === "sigfu"
    ? SIGFU_STATUS_LABELS[newStatus] || newStatus
    : SIFOR_STATUS_LABELS[newStatus] || newStatus;

  const title = `${sourceLabel} — Changement de statut`;
  const content = `Votre dossier ${reference} est passé au statut : ${statusLabel}.${message ? ` ${message}` : ""} Consultez votre espace citoyen pour plus de détails.`;

  // Notification in-app si on a un citizenId
  if (citizenId) {
    await createCitizenNotification({
      userId: citizenId,
      type: "general",
      title,
      message: content,
      createdAt: Date.now(),
    });
  }

  // Email + SMS via dispatchNotification (requires citizenId)
  if (citizenId) {
    await dispatchNotification({
      userId: citizenId,
      subject: title,
      htmlBody: `<p>Bonjour ${nom || ""},</p><p>${content}</p><p>Cordialement,<br/>Foncier225</p>`,
      smsMessage: `[Foncier225] ${sourceLabel}: Dossier ${reference} \u2192 ${statusLabel}. Consultez votre espace.`,
      eventType: "statusChange",
    }).catch(() => { /* log but don't fail */ });
  }
}

// ─── Find citizen by external ID or phone ───────────────────────────────────

async function findCitizenId(demandeurId?: string, telephone?: string): Promise<number | null> {
  // Try to match by phone number in notification preferences
  if (telephone) {
    const database = await getDb();
    if (!database) return null;
    const found = await database
      .select({ userId: notificationPreferences.userId })
      .from(notificationPreferences)
      .where(eq(notificationPreferences.phone, telephone))
      .limit(1);
    if (found.length > 0) return found[0].userId;
  }
  return null;
}

// ─── SIGFU Webhook Handler ──────────────────────────────────────────────────

export async function handleSigfuWebhook(req: Request, res: Response) {
  try {
    const database = await getDb();
    if (!database) return res.status(503).json({ error: "Database unavailable" });
    const signature = req.headers["x-sigfu-signature"] as string || "";
    const rawBody = JSON.stringify(req.body);
    const secret = process.env.SIGFU_WEBHOOK_SECRET || "";

    // Verify signature (skip in dev if no secret configured)
    if (secret && !verifyHmacSignature(rawBody, signature, secret)) {
      return res.status(401).json({ error: "Invalid signature" });
    }

    const payload = req.body as SigfuWebhookPayload;

    // Validate required fields
    if (!payload.event_id || !payload.event_type || !payload.data?.numero_demande) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // Idempotence check
    if (await isEventProcessed(payload.event_id, "sigfu")) {
      return res.status(200).json({ status: "already_processed" });
    }

    // Find citizen
    const citizenId = await findCitizenId(
      payload.data.demandeur_id,
      payload.data.demandeur_telephone
    );

    // Store event
    await database.insert(webhookEvents).values({
      source: "sigfu",
      eventType: payload.event_type,
      eventId: payload.event_id,
      referenceNumber: payload.data.numero_demande,
      previousStatus: payload.data.previous_status || null,
      newStatus: payload.data.new_status || null,
      payload: payload.data as any,
      processedAt: new Date(),
      citizenId,
      notificationSent: false,
    });

    // Send notifications
    if (payload.event_type === "status_changed" && payload.data.new_status) {
      await notifyCitizen({
        citizenId,
        email: payload.data.demandeur_email,
        telephone: payload.data.demandeur_telephone,
        nom: payload.data.demandeur_nom,
        source: "sigfu",
        reference: payload.data.numero_demande,
        newStatus: payload.data.new_status,
        message: payload.data.message,
      });

      // Mark notification sent
      await database
        .update(webhookEvents)
        .set({ notificationSent: true })
        .where(eq(webhookEvents.eventId, payload.event_id));
    }

    if (payload.event_type === "opposition_received") {
      await notifyCitizen({
        citizenId,
        email: payload.data.demandeur_email,
        telephone: payload.data.demandeur_telephone,
        nom: payload.data.demandeur_nom,
        source: "sigfu",
        reference: payload.data.numero_demande,
        newStatus: "OPPOSITION_EN_COURS",
        message: "Une opposition a été enregistrée sur votre demande.",
      });
    }

    return res.status(200).json({ status: "processed", event_id: payload.event_id });
  } catch (error) {
    console.error("[Webhook SIGFU] Error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

// ─── SIFOR Webhook Handler ──────────────────────────────────────────────────

export async function handleSiforWebhook(req: Request, res: Response) {
  try {
    const database = await getDb();
    if (!database) return res.status(503).json({ error: "Database unavailable" });
    const signature = req.headers["x-sifor-signature"] as string || "";
    const rawBody = JSON.stringify(req.body);
    const secret = process.env.SIFOR_WEBHOOK_SECRET || "";

    // Verify signature (skip in dev if no secret configured)
    if (secret && !verifyHmacSignature(rawBody, signature, secret)) {
      return res.status(401).json({ error: "Invalid signature" });
    }

    const payload = req.body as SiforWebhookPayload;

    // Validate required fields
    if (!payload.event_id || !payload.event_type || !payload.data?.numero_certificat) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // Idempotence check
    if (await isEventProcessed(payload.event_id, "sifor")) {
      return res.status(200).json({ status: "already_processed" });
    }

    // Find citizen
    const citizenId = await findCitizenId(
      payload.data.demandeur_id,
      payload.data.demandeur_telephone
    );

    // Store event
    await database.insert(webhookEvents).values({
      source: "sifor",
      eventType: payload.event_type,
      eventId: payload.event_id,
      referenceNumber: payload.data.numero_certificat,
      previousStatus: payload.data.previous_status || null,
      newStatus: payload.data.new_status || null,
      payload: payload.data as any,
      processedAt: new Date(),
      citizenId,
      notificationSent: false,
    });

    // Send notifications
    if (payload.event_type === "status_changed" && payload.data.new_status) {
      await notifyCitizen({
        citizenId,
        email: payload.data.demandeur_email,
        telephone: payload.data.demandeur_telephone,
        nom: payload.data.demandeur_nom,
        source: "sifor",
        reference: payload.data.numero_certificat,
        newStatus: payload.data.new_status,
        message: payload.data.message,
      });

      await database
        .update(webhookEvents)
        .set({ notificationSent: true })
        .where(eq(webhookEvents.eventId, payload.event_id));
    }

    if (payload.event_type === "certificat_delivre") {
      await notifyCitizen({
        citizenId,
        email: payload.data.demandeur_email,
        telephone: payload.data.demandeur_telephone,
        nom: payload.data.demandeur_nom,
        source: "sifor",
        reference: payload.data.numero_certificat,
        newStatus: "CERTIFICAT_DELIVRE",
        message: "Votre certificat foncier rural a été délivré. Rendez-vous à la Direction Régionale de l'AFOR.",
      });
    }

    if (payload.event_type === "opposition_received") {
      await notifyCitizen({
        citizenId,
        email: payload.data.demandeur_email,
        telephone: payload.data.demandeur_telephone,
        nom: payload.data.demandeur_nom,
        source: "sifor",
        reference: payload.data.numero_certificat,
        newStatus: "OPPOSITION_RECUE",
        message: "Une opposition a été enregistrée sur votre demande de certificat foncier rural.",
      });
    }

    return res.status(200).json({ status: "processed", event_id: payload.event_id });
  } catch (error) {
    console.error("[Webhook SIFOR] Error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}
