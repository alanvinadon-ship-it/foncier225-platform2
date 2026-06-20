import { z } from "zod";
import { router } from "../_core/trpc";
import { erpPermissionProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { createAuditEvent } from "../db";
import {
  erpDirectionReportSchedules,
  erpDirectionReportDeliveries,
} from "../../drizzle/schema";
import { eq, desc, and } from "drizzle-orm";
import { notifyOwner } from "../_core/notification";
import { sendEmail } from "../email-sms.service";
import { generateDirectionReport } from "./erp-direction-report.service";

// ─── Routeur Diffusion Rapports Direction ────────────────────────────────────
export const erpDirectionSchedulesRouter = router({
  // List schedules
  listSchedules: erpPermissionProcedure("erp_direction_reports", "view")
    .input(z.object({}).optional())
    .query(async () => {
      const db = (await getDb())!;
      const rows = await db
        .select()
        .from(erpDirectionReportSchedules)
        .orderBy(desc(erpDirectionReportSchedules.createdAt));
      return rows;
    }),

  // Get schedule by id
  getSchedule: erpPermissionProcedure("erp_direction_reports", "view")
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = (await getDb())!;
      const [row] = await db
        .select()
        .from(erpDirectionReportSchedules)
        .where(eq(erpDirectionReportSchedules.id, input.id));
      return row ?? null;
    }),

  // Create schedule
  createSchedule: erpPermissionProcedure("erp_direction_reports", "create")
    .input(z.object({
      name: z.string().min(1).max(128),
      frequency: z.enum(["monthly", "quarterly", "weekly"]).default("monthly"),
      dayOfMonth: z.number().min(1).max(28).default(1),
      sendTime: z.string().default("08:00"),
      timezone: z.string().default("Africa/Abidjan"),
      recipients: z.array(z.string().email()).min(1),
      cc: z.array(z.string().email()).optional(),
      includePdfAttachment: z.boolean().default(true),
      includeDownloadLink: z.boolean().default(true),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = (await getDb())!;
      const now = Date.now();
      const [result] = await db.insert(erpDirectionReportSchedules).values({
        name: input.name,
        frequency: input.frequency,
        dayOfMonth: input.dayOfMonth,
        sendTime: input.sendTime,
        timezone: input.timezone,
        recipientsJson: input.recipients,
        ccJson: input.cc ?? [],
        includePdfAttachment: input.includePdfAttachment,
        includeDownloadLink: input.includeDownloadLink,
        isActive: true,
        createdBy: ctx.user.id,
        createdAt: now,
        updatedAt: now,
      });
      await createAuditEvent({
        actorId: ctx.user.id,
        action: "direction.schedule.created",
        targetType: "direction_report_schedule",
        targetId: Number(result.insertId),
        details: { name: input.name, frequency: input.frequency, recipients: input.recipients },
      });
      return { id: result.insertId };
    }),

  // Update schedule
  updateSchedule: erpPermissionProcedure("erp_direction_reports", "create")
    .input(z.object({
      id: z.number(),
      name: z.string().min(1).max(128).optional(),
      frequency: z.enum(["monthly", "quarterly", "weekly"]).optional(),
      dayOfMonth: z.number().min(1).max(28).optional(),
      sendTime: z.string().optional(),
      timezone: z.string().optional(),
      recipients: z.array(z.string().email()).optional(),
      cc: z.array(z.string().email()).optional(),
      includePdfAttachment: z.boolean().optional(),
      includeDownloadLink: z.boolean().optional(),
      isActive: z.boolean().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = (await getDb())!;
      const now = Date.now();
      const updates: Record<string, unknown> = { updatedAt: now };
      if (input.name !== undefined) updates.name = input.name;
      if (input.frequency !== undefined) updates.frequency = input.frequency;
      if (input.dayOfMonth !== undefined) updates.dayOfMonth = input.dayOfMonth;
      if (input.sendTime !== undefined) updates.sendTime = input.sendTime;
      if (input.timezone !== undefined) updates.timezone = input.timezone;
      if (input.recipients !== undefined) updates.recipientsJson = input.recipients;
      if (input.cc !== undefined) updates.ccJson = input.cc;
      if (input.includePdfAttachment !== undefined) updates.includePdfAttachment = input.includePdfAttachment;
      if (input.includeDownloadLink !== undefined) updates.includeDownloadLink = input.includeDownloadLink;
      if (input.isActive !== undefined) updates.isActive = input.isActive;

      await db.update(erpDirectionReportSchedules).set(updates).where(eq(erpDirectionReportSchedules.id, input.id));
      await createAuditEvent({
        actorId: ctx.user.id,
        action: "direction.schedule.updated",
        targetType: "direction_report_schedule",
        targetId: input.id,
        details: updates,
      });
      return { success: true };
    }),

  // Run now (manual send)
  runNow: erpPermissionProcedure("erp_direction_reports", "create")
    .input(z.object({ scheduleId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = (await getDb())!;
      const now = Date.now();

      // Get schedule
      const [schedule] = await db
        .select()
        .from(erpDirectionReportSchedules)
        .where(eq(erpDirectionReportSchedules.id, input.scheduleId));
      if (!schedule) throw new Error("Planning introuvable");

      // Generate report PDF
      let exportId: number | null = null;
      let fileUrl: string | null = null;
      try {
        const report = await generateDirectionReport({ generatedBy: String(ctx.user.id), generatedByName: ctx.user.name ?? "Direction" });
        exportId = report.exportId;
        fileUrl = report.fileUrl;
      } catch (err: unknown) {
        // Create failed delivery
        await db.insert(erpDirectionReportDeliveries).values({
          scheduleId: input.scheduleId,
          status: "failed",
          errorMessage: err instanceof Error ? err.message : "Erreur génération PDF",
          recipientsJson: schedule.recipientsJson,
          createdAt: now,
          updatedAt: now,
        });
        await notifyOwner({ title: "Échec envoi rapport Direction", content: `Erreur lors de la génération du rapport pour le planning "${schedule.name}".` });
        throw new Error("Échec génération du rapport PDF");
      }

      // Send emails to recipients
      const recipients = schedule.recipientsJson ?? [];
      let sentCount = 0;
      const errors: string[] = [];

      for (const email of recipients) {
        try {
          const htmlBody = `
            <h2>Rapport Direction — ${schedule.name}</h2>
            <p>Le rapport de direction a été généré avec succès.</p>
            ${fileUrl ? `<p><a href="${fileUrl}">Télécharger le rapport PDF</a></p>` : ""}
            <p>Cordialement,<br/>Foncier225 — Direction Financière</p>
          `;
          await sendEmail({ to: email, subject: `[Foncier225] Rapport Direction — ${schedule.name}`, html: htmlBody });
          sentCount++;
        } catch (err: unknown) {
          errors.push(`${email}: ${err instanceof Error ? err.message : "erreur"}`);
        }
      }

      // Create delivery record
      const deliveryStatus = sentCount === recipients.length ? "sent" : (sentCount > 0 ? "sent" : "failed");
      const [delivery] = await db.insert(erpDirectionReportDeliveries).values({
        scheduleId: input.scheduleId,
        exportId,
        status: deliveryStatus,
        recipientsJson: recipients,
        sentAt: deliveryStatus === "sent" ? now : null,
        errorMessage: errors.length > 0 ? errors.join("; ") : null,
        createdAt: now,
        updatedAt: now,
      });

      // Update schedule lastRunAt
      await db.update(erpDirectionReportSchedules).set({ lastRunAt: now, updatedAt: now }).where(eq(erpDirectionReportSchedules.id, input.scheduleId));

      await createAuditEvent({
        actorId: ctx.user.id,
        action: "direction.report.sent_manual",
        targetType: "direction_report_delivery",
        targetId: Number(delivery.insertId),
        details: { scheduleId: input.scheduleId, sentCount, totalRecipients: recipients.length, errors },
      });

      await notifyOwner({ title: "Rapport Direction envoyé", content: `Rapport "${schedule.name}" envoyé à ${sentCount}/${recipients.length} destinataires.` });

      return { deliveryId: delivery.insertId, sentCount, totalRecipients: recipients.length, errors };
    }),

  // Disable schedule
  disableSchedule: erpPermissionProcedure("erp_direction_reports", "create")
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = (await getDb())!;
      await db.update(erpDirectionReportSchedules).set({ isActive: false, updatedAt: Date.now() }).where(eq(erpDirectionReportSchedules.id, input.id));
      await createAuditEvent({
        actorId: ctx.user.id,
        action: "direction.schedule.disabled",
        targetType: "direction_report_schedule",
        targetId: input.id,
        details: {},
      });
      return { success: true };
    }),

  // List deliveries
  listDeliveries: erpPermissionProcedure("erp_direction_reports", "view")
    .input(z.object({
      scheduleId: z.number().optional(),
      limit: z.number().min(1).max(100).default(50),
    }).optional())
    .query(async ({ input }) => {
      const db = (await getDb())!;
      const conditions = [];
      if (input?.scheduleId) conditions.push(eq(erpDirectionReportDeliveries.scheduleId, input.scheduleId));

      const rows = await db
        .select()
        .from(erpDirectionReportDeliveries)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(erpDirectionReportDeliveries.createdAt))
        .limit(input?.limit ?? 50);
      return rows;
    }),

  // Get delivery by id
  getDelivery: erpPermissionProcedure("erp_direction_reports", "view")
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = (await getDb())!;
      const [row] = await db
        .select()
        .from(erpDirectionReportDeliveries)
        .where(eq(erpDirectionReportDeliveries.id, input.id));
      return row ?? null;
    }),
});
