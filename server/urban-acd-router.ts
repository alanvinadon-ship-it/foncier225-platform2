/**
 * Routeur tRPC — Module Foncier Urbain (ACD)
 * Sous-routeurs : citizen (protectedProcedure) + admin (mcluProcedure)
 */

import { TRPCError } from "@trpc/server";
import { z } from "zod";
import {
  ACD_ALL_TRANSITIONS,
  type AcdStatus,
  getAcdPhaseForStatus,
  isValidAcdTransition,
} from "../shared/acd-workflow";
import {
  createAuditEvent,
  createUrbanAcdApplication,
  getUrbanAcdApplicationById,
  getUrbanAcdApplicationByIdAndUser,
  listUrbanAcdApplicationsByUser,
  listUrbanAcdApplications,
  updateUrbanAcdApplication,
  createUrbanAcdStep,
  listUrbanAcdSteps,
  updateUrbanAcdStep,
  createUrbanAcdDocument,
  listUrbanAcdDocuments,
  createUrbanAcdOpposition,
  listUrbanAcdOppositions,
  updateUrbanAcdOpposition,
  getAllUrbanAcdApplications,
  notifyCitizenStatusChange,
} from "./db";
import { mcluProcedure, protectedProcedure, router } from "./_core/trpc";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function generateAcdApplicationNumber(): string {
  const year = new Date().getFullYear();
  const rand = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `ACD-${year}-${rand}`;
}

// ─── Citizen Sub-Router ──────────────────────────────────────────────────────

const citizenAcdRouter = router({
  /** Créer un nouveau dossier ACD */
  create: protectedProcedure
    .input(
      z.object({
        applicantFullName: z.string().min(2),
        applicantNationality: z.string().optional(),
        applicantIdType: z.string().optional(),
        applicantIdNumber: z.string().optional(),
        applicantType: z.enum(["personne_physique", "personne_morale"]).default("personne_physique"),
        companyName: z.string().optional(),
        companyRccm: z.string().optional(),
        lotNumber: z.string().optional(),
        ilotNumber: z.string().optional(),
        lotissementName: z.string().optional(),
        commune: z.string().optional(),
        quartier: z.string().optional(),
        surfaceM2: z.number().int().positive().optional(),
        usagePrevu: z.enum(["habitation", "commerce", "industriel", "mixte"]).default("habitation"),
        parcelId: z.number().int().optional(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const now = Date.now();
      const applicationNumber = generateAcdApplicationNumber();

      const appId = await createUrbanAcdApplication({
        applicationNumber,
        userId: ctx.user.id,
        parcelId: input.parcelId ?? null,
        phase: "provisional",
        status: "acd_draft",
        applicantFullName: input.applicantFullName,
        applicantNationality: input.applicantNationality ?? null,
        applicantIdType: input.applicantIdType ?? null,
        applicantIdNumber: input.applicantIdNumber ?? null,
        applicantType: input.applicantType,
        companyName: input.companyName ?? null,
        companyRccm: input.companyRccm ?? null,
        lotNumber: input.lotNumber ?? null,
        ilotNumber: input.ilotNumber ?? null,
        lotissementName: input.lotissementName ?? null,
        commune: input.commune ?? null,
        quartier: input.quartier ?? null,
        surfaceM2: input.surfaceM2 ?? null,
        usagePrevu: input.usagePrevu,
        notes: input.notes ?? null,
        createdAt: now,
        updatedAt: now,
      });

      // Créer l'étape initiale
      await createUrbanAcdStep({
        applicationId: appId,
        stepType: "depot_demande",
        status: "in_progress",
        startedAt: now,
        createdAt: now,
      });

      await createAuditEvent({
        actorId: ctx.user.id,
        actorRole: ctx.user.role,
        action: "urban_acd.created",
        targetType: "urban_acd_application",
        targetId: appId,
        details: { applicationNumber },
      });

      return { id: appId, applicationNumber };
    }),

  /** Lister mes dossiers ACD */
  list: protectedProcedure.query(async ({ ctx }) => {
    return listUrbanAcdApplicationsByUser(ctx.user.id);
  }),

  /** Détail d'un dossier ACD */
  getById: protectedProcedure
    .input(z.object({ id: z.number().int() }))
    .query(async ({ ctx, input }) => {
      const app = await getUrbanAcdApplicationByIdAndUser(input.id, ctx.user.id);
      if (!app) throw new TRPCError({ code: "NOT_FOUND", message: "Dossier ACD introuvable" });

      const steps = await listUrbanAcdSteps(input.id);
      const documents = await listUrbanAcdDocuments(input.id);
      const oppositions = await listUrbanAcdOppositions(input.id);

      return { ...app, steps, documents, oppositions };
    }),

  /** Soumettre un dossier (draft → submitted) */
  submit: protectedProcedure
    .input(z.object({ id: z.number().int() }))
    .mutation(async ({ ctx, input }) => {
      const app = await getUrbanAcdApplicationByIdAndUser(input.id, ctx.user.id);
      if (!app) throw new TRPCError({ code: "NOT_FOUND" });
      if (app.status !== "acd_draft") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Le dossier n'est pas en brouillon" });
      }

      if (!app.applicantFullName || !app.lotNumber || !app.commune) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Veuillez renseigner le nom, le numéro de lot et la commune",
        });
      }

      const now = Date.now();
      await updateUrbanAcdApplication(input.id, { status: "acd_submitted", updatedAt: now });
      await updateUrbanAcdStep(input.id, "depot_demande", { status: "completed", completedAt: now, completedBy: ctx.user.id });

      await createAuditEvent({
        actorId: ctx.user.id,
        actorRole: ctx.user.role,
        action: "urban_acd.submitted",
        targetType: "urban_acd_application",
        targetId: input.id,
        details: { from: "acd_draft", to: "acd_submitted" },
      });

      return { success: true };
    }),

  /** Upload un document */
  uploadDocument: protectedProcedure
    .input(
      z.object({
        applicationId: z.number().int(),
        documentType: z.string(),
        documentCategory: z.enum(["identite", "propriete_lot", "urbanisme", "technique", "mise_en_valeur", "complementaire"]),
        label: z.string(),
        fileUrl: z.string().url(),
        fileKey: z.string(),
        mimeType: z.string().optional(),
        fileSizeBytes: z.number().int().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const app = await getUrbanAcdApplicationByIdAndUser(input.applicationId, ctx.user.id);
      if (!app) throw new TRPCError({ code: "NOT_FOUND" });

      const now = Date.now();
      const docId = await createUrbanAcdDocument({
        applicationId: input.applicationId,
        documentType: input.documentType,
        documentCategory: input.documentCategory,
        label: input.label,
        fileUrl: input.fileUrl,
        fileKey: input.fileKey,
        mimeType: input.mimeType ?? null,
        fileSizeBytes: input.fileSizeBytes ?? null,
        uploadedBy: ctx.user.id,
        createdAt: now,
      });

            return { id: docId };
    }),

  /** Détail complet du dossier (application + steps + documents) */
  getDetail: protectedProcedure
    .input(z.object({ applicationId: z.number().int() }))
    .query(async ({ ctx, input }) => {
      const app = await getUrbanAcdApplicationByIdAndUser(input.applicationId, ctx.user.id);
      if (!app) throw new TRPCError({ code: "NOT_FOUND", message: "Dossier ACD introuvable" });
      const steps = await listUrbanAcdSteps(input.applicationId);
      const documents = await listUrbanAcdDocuments(input.applicationId);
      const oppositions = await listUrbanAcdOppositions(input.applicationId);
      return { application: app, steps, documents, oppositions };
    }),

  /** Annuler un dossier (draft ou submitted uniquement) */
  cancel: protectedProcedure
    .input(z.object({ applicationId: z.number().int() }))
    .mutation(async ({ ctx, input }) => {
      const app = await getUrbanAcdApplicationByIdAndUser(input.applicationId, ctx.user.id);
      if (!app) throw new TRPCError({ code: "NOT_FOUND", message: "Dossier ACD introuvable" });
      if (!["acd_draft", "acd_submitted"].includes(app.status)) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Seuls les dossiers en brouillon ou soumis peuvent être annulés" });
      }
      await updateUrbanAcdApplication(input.applicationId, { status: "acd_cancelled" });
      await createAuditEvent({ action: "urban_acd_cancelled", actorId: ctx.user.id, actorRole: ctx.user.role || "user", targetType: "urban_acd", targetId: input.applicationId, details: { reason: "citizen_cancelled" }, createdAt: new Date() });
      return { success: true };
    }),
});
// ─── Admin/MCLU Sub-Router ───────────────────────────────────────────────────

const adminAcdRouter = router({
  /** Lister tous les dossiers ACD (admin/MCLU) */
  list: mcluProcedure
    .input(
      z.object({
        status: z.string().optional(),
        phase: z.enum(["provisional", "development", "definitive"]).optional(),
        page: z.number().int().min(1).default(1),
        limit: z.number().int().min(1).max(100).default(20),
      }).optional()
    )
    .query(async ({ input }) => {
      const { status, phase, page = 1, limit = 20 } = input || {};
      const offset = (page - 1) * limit;
      const { items, total } = await listUrbanAcdApplications({ status, phase }, limit, offset);
      return { items, total, page, limit };
    }),

  /** Détail d'un dossier ACD (admin) */
  getById: mcluProcedure
    .input(z.object({ id: z.number().int() }))
    .query(async ({ input }) => {
      const app = await getUrbanAcdApplicationById(input.id);
      if (!app) throw new TRPCError({ code: "NOT_FOUND" });

      const steps = await listUrbanAcdSteps(input.id);
      const documents = await listUrbanAcdDocuments(input.id);
      const oppositions = await listUrbanAcdOppositions(input.id);

      return { ...app, steps, documents, oppositions };
    }),

  /** Avancer le statut d'un dossier ACD */
  advanceStatus: mcluProcedure
    .input(
      z.object({
        id: z.number().int(),
        newStatus: z.string(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const app = await getUrbanAcdApplicationById(input.id);
      if (!app) throw new TRPCError({ code: "NOT_FOUND" });

      const currentStatus = app.status as AcdStatus;
      const newStatus = input.newStatus as AcdStatus;

      if (!isValidAcdTransition(currentStatus, newStatus)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Transition invalide : ${currentStatus} → ${newStatus}. Transitions autorisées : ${(ACD_ALL_TRANSITIONS[currentStatus] || []).join(", ")}`,
        });
      }

      const now = Date.now();
      const newPhase = getAcdPhaseForStatus(newStatus);

      await updateUrbanAcdApplication(input.id, {
        status: newStatus,
        phase: newPhase || app.phase,
        updatedAt: now,
      });

      // Mapping statut → stepType
      const statusToStep: Record<string, string> = {
        acd_submitted: "depot_demande",
        acd_lot_check: "verification_lot",
        acd_technical_instruction: "instruction_technique",
        acd_commission: "commission_attribution",
        acd_acp_signed: "signature_acp",
        acd_development_notified: "notification_obligations",
        acd_development_ongoing: "mise_en_valeur",
        acd_development_verified: "constat_mise_en_valeur",
        acd_transformation_requested: "demande_transformation",
        acd_conformity_check: "verification_conformite",
        acd_acd_signed: "signature_acd",
        acd_journal_officiel: "publication_jo",
        acd_delivered: "delivrance_titre",
      };

      const stepType = statusToStep[newStatus];
      if (stepType) {
        // Compléter l'étape précédente
        const previousStep = statusToStep[currentStatus];
        if (previousStep) {
          await updateUrbanAcdStep(input.id, previousStep, {
            status: "completed",
            completedAt: now,
            completedBy: ctx.user.id,
          });
        }

        // Créer la nouvelle étape
        await createUrbanAcdStep({
          applicationId: input.id,
          stepType,
          status: "in_progress",
          startedAt: now,
          notes: input.notes ?? null,
          createdAt: now,
        });
      }

      await createAuditEvent({
        actorId: ctx.user.id,
        actorRole: ctx.user.role,
        action: "urban_acd.status_advanced",
        targetType: "urban_acd_application",
        targetId: input.id,
        details: { from: currentStatus, to: newStatus, notes: input.notes },
      });

      // Notification automatique au citoyen
      if (app.userId) {
        await notifyCitizenStatusChange({
          userId: app.userId,
          module: "urban_acd",
          entityId: input.id,
          oldStatus: currentStatus,
          newStatus,
          applicationNumber: app.applicationNumber,
        }).catch(() => {}); // Ne pas bloquer la transition si la notification échoue
      }

      return { success: true, newStatus, newPhase };
    }),

  /** Enregistrer une opposition */
  addOpposition: mcluProcedure
    .input(
      z.object({
        applicationId: z.number().int(),
        opponentName: z.string().min(2),
        opponentContact: z.string().optional(),
        reason: z.string().min(10),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const now = Date.now();
      const id = await createUrbanAcdOpposition({
        applicationId: input.applicationId,
        opponentName: input.opponentName,
        opponentContact: input.opponentContact ?? null,
        reason: input.reason,
        createdAt: now,
      });

      await createAuditEvent({
        actorId: ctx.user.id,
        actorRole: ctx.user.role,
        action: "urban_acd.opposition_added",
        targetType: "urban_acd_application",
        targetId: input.applicationId,
        details: { opponentName: input.opponentName },
      });

      return { id };
    }),

  /** Résoudre une opposition */
  resolveOpposition: mcluProcedure
    .input(
      z.object({
        oppositionId: z.number().int(),
        status: z.enum(["confirmed", "dismissed"]),
        resolutionNotes: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const now = Date.now();
      await updateUrbanAcdOpposition(input.oppositionId, {
        status: input.status,
        resolutionNotes: input.resolutionNotes ?? undefined,
        resolvedBy: ctx.user.id,
        resolvedAt: now,
      });

      return { success: true };
    }),

  /** Statistiques ACD */
  stats: mcluProcedure.query(async () => {
    const allApps = await getAllUrbanAcdApplications();
    const total = allApps.length;
    const byPhase = {
      provisional: allApps.filter(a => a.phase === "provisional").length,
      development: allApps.filter(a => a.phase === "development").length,
      definitive: allApps.filter(a => a.phase === "definitive").length,
    };
    const byStatus: Record<string, number> = {};
    for (const app of allApps) {
      byStatus[app.status] = (byStatus[app.status] || 0) + 1;
    }
    const delivered = allApps.filter(a => a.status === "acd_delivered").length;
    const rejected = allApps.filter(a => a.status === "acd_rejected").length;

    return { total, byPhase, byStatus, delivered, rejected };
  }),
});

// ─── Export combiné ──────────────────────────────────────────────────────────

export const urbanAcdRouter = router({
  citizen: citizenAcdRouter,
  admin: adminAcdRouter,
});
