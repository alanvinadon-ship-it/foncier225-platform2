import nodemailer from "nodemailer";
import { getDb } from "./db";
import { systemConfig } from "../drizzle/schema";
import { eq } from "drizzle-orm";

// ─── Types ───────────────────────────────────────────────────────────────────

interface SmtpConfig {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  fromName: string;
  fromEmail: string;
}

interface SmsConfig {
  provider: "orange_ci" | "generic";
  apiUrl: string;
  apiKey: string;
  senderId: string;
}

interface EmailPayload {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

interface SmsPayload {
  to: string;
  message: string;
}

// ─── Config Helpers ──────────────────────────────────────────────────────────

async function getSystemConfig(key: string): Promise<string | null> {
  const db = await getDb();
  if (!db) return null;
  const [row] = await db
    .select()
    .from(systemConfig)
    .where(eq(systemConfig.configKey, key))
    .limit(1);
  return row?.configValue ?? null;
}

async function getSmtpConfig(): Promise<SmtpConfig | null> {
  const raw = await getSystemConfig("smtp_config");
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (!parsed.host || !parsed.user || !parsed.pass) return null;
    return {
      host: parsed.host,
      port: parsed.port || 587,
      secure: parsed.secure ?? false,
      user: parsed.user,
      pass: parsed.pass,
      fromName: parsed.fromName || "Foncier225",
      fromEmail: parsed.fromEmail || parsed.user,
    };
  } catch {
    return null;
  }
}

async function getSmsConfig(): Promise<SmsConfig | null> {
  const raw = await getSystemConfig("sms_config");
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (!parsed.apiUrl || !parsed.apiKey) return null;
    return {
      provider: parsed.provider || "orange_ci",
      apiUrl: parsed.apiUrl,
      apiKey: parsed.apiKey,
      senderId: parsed.senderId || "Foncier225",
    };
  } catch {
    return null;
  }
}

// ─── Email Service ───────────────────────────────────────────────────────────

export async function sendEmail(payload: EmailPayload): Promise<boolean> {
  const config = await getSmtpConfig();
  if (!config) {
    console.warn("[Email] SMTP not configured, skipping email to:", payload.to);
    return false;
  }

  try {
    const transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: {
        user: config.user,
        pass: config.pass,
      },
    });

    await transporter.sendMail({
      from: `"${config.fromName}" <${config.fromEmail}>`,
      to: payload.to,
      subject: payload.subject,
      html: payload.html,
      text: payload.text || payload.html.replace(/<[^>]*>/g, ""),
    });

    console.log("[Email] Sent successfully to:", payload.to);
    return true;
  } catch (error) {
    console.error("[Email] Failed to send to:", payload.to, error);
    return false;
  }
}

// ─── SMS Service ─────────────────────────────────────────────────────────────

export async function sendSms(payload: SmsPayload): Promise<boolean> {
  const config = await getSmsConfig();
  if (!config) {
    console.warn("[SMS] SMS gateway not configured, skipping SMS to:", payload.to);
    return false;
  }

  try {
    // Orange CI API format
    if (config.provider === "orange_ci") {
      const response = await fetch(`${config.apiUrl}/smsmessaging/v1/outbound/tel:${config.senderId}/requests`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${config.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          outboundSMSMessageRequest: {
            address: [`tel:${payload.to}`],
            senderAddress: `tel:${config.senderId}`,
            outboundSMSTextMessage: {
              message: payload.message,
            },
          },
        }),
      });

      if (!response.ok) {
        const detail = await response.text().catch(() => "");
        console.warn(`[SMS] Orange CI API error (${response.status}):`, detail);
        return false;
      }

      console.log("[SMS] Sent successfully via Orange CI to:", payload.to);
      return true;
    }

    // Generic SMS API fallback
    const response = await fetch(config.apiUrl, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${config.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        to: payload.to,
        message: payload.message,
        sender: config.senderId,
      }),
    });

    if (!response.ok) {
      console.warn(`[SMS] Generic API error (${response.status})`);
      return false;
    }

    console.log("[SMS] Sent successfully to:", payload.to);
    return true;
  } catch (error) {
    console.error("[SMS] Failed to send to:", payload.to, error);
    return false;
  }
}

// ─── Notification Dispatcher ─────────────────────────────────────────────────

export interface NotificationDispatchPayload {
  userId: number;
  subject: string;
  htmlBody: string;
  smsMessage: string;
  eventType: "statusChange" | "documentUpdate" | "opposition" | "general";
}

/**
 * Dispatches email and/or SMS based on user notification preferences.
 * Returns { emailSent, smsSent } booleans.
 */
export async function dispatchNotification(
  payload: NotificationDispatchPayload
): Promise<{ emailSent: boolean; smsSent: boolean }> {
  const { getNotificationPreferences } = await import("./db");
  const prefs = await getNotificationPreferences(payload.userId);

  let emailSent = false;
  let smsSent = false;

  if (!prefs) {
    console.warn("[Dispatch] No notification preferences for user:", payload.userId);
    return { emailSent, smsSent };
  }

  // Determine which channels are enabled for this event type
  let emailEnabled = false;
  let smsEnabled = false;

  switch (payload.eventType) {
    case "statusChange":
      emailEnabled = prefs.emailStatusChange;
      smsEnabled = prefs.smsStatusChange;
      break;
    case "documentUpdate":
      emailEnabled = prefs.emailDocumentUpdate;
      smsEnabled = prefs.smsDocumentUpdate;
      break;
    case "opposition":
      emailEnabled = prefs.emailOpposition;
      smsEnabled = prefs.smsOpposition;
      break;
    case "general":
      emailEnabled = prefs.emailGeneral;
      smsEnabled = prefs.smsGeneral;
      break;
  }

  // Send email if enabled and email address available
  if (emailEnabled && prefs.email) {
    emailSent = await sendEmail({
      to: prefs.email,
      subject: payload.subject,
      html: payload.htmlBody,
    });
  }

  // Send SMS if enabled and phone number available
  if (smsEnabled && prefs.phone) {
    smsSent = await sendSms({
      to: prefs.phone,
      message: payload.smsMessage,
    });
  }

  return { emailSent, smsSent };
}
