import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { adminProcedure, protectedProcedure, router } from "./_core/trpc";
import { notifyOwner } from "./_core/notification";
import {
  createAuditEvent,
  createLandTitleApplication,
  getLandTitleApplicationById,
  getLandTitleApplicationWithParcel,
  listLandTitleApplicationsByUser,
  listLandTitleApplicationsByUserWithParcel,
  countLandTitleApplicationsByUser,
  listAllLandTitleApplications,
  listAllLandTitleApplicationsWithParcel,
  countAllLandTitleApplications,
  updateLandTitleApplication,
  createLandTitleStep,
  listLandTitleSteps,
  updateLandTitleStep,
  createLandTitleDocument,
  listLandTitleDocuments,
  getLandTitleDocumentById,
  deleteLandTitleDocument,
  updateLandTitleDocument,
  createLandTitleOpposition,
  listLandTitleOppositions,
  updateLandTitleOpposition,
  countLandTitleOppositionsByApplication,
  getParcelByIdAndOwner,
} from "./db";

// ─── Constants ──────────────────────────────────────────────────────

const CERTIFICATE_STATUSES = [
  "cf_draft", "cf_submitted", "cf_delimitation", "cf_delimited",
  "cf_inquiry", "cf_publicity", "cf_opposed", "cf_validated", "cf_signed", "cf_rejected",
] as const;

const TITLE_STATUSES = [
  "tf_submitted", "tf_afor_review", "tf_apfr_ready",
  "tf_minister_signing", "tf_signed", "tf_registered", "tf_rejected",
] as const;

const ALL_STATUSES = [...CERTIFICATE_STATUSES, ...TITLE_STATUSES] as const;

// Valid transitions for Phase 1 (Certificate)
const CF_TRANSITIONS: Record<string, string[]> = {
  cf_draft: ["cf_submitted", "cf_rejected"],
  cf_submitted: ["cf_delimitation", "cf_rejected"],
  cf_delimitation: ["cf_delimited", "cf_rejected"],
  cf_delimited: ["cf_inquiry", "cf_rejected"],
  cf_inquiry: ["cf_publicity", "cf_rejected"],
  cf_publicity: ["cf_validated", "cf_opposed", "cf_rejected"],
  cf_opposed: ["cf_validated", "cf_rejected"],
  cf_validated: ["cf_signed", "cf_rejected"],
};

// Valid transitions for Phase 2 (Title)
const TF_TRANSITIONS: Record<string, string[]> = {
  tf_submitted: ["tf_afor_review", "tf_rejected"],
  tf_afor_review: ["tf_apfr_ready", "tf_rejected"],
  tf_apfr_ready: ["tf_minister_signing", "tf_rejected"],
  tf_minister_signing: ["tf_signed", "tf_rejected"],
  tf_signed: ["tf_registered", "tf_rejected"],
};

const STEP_TYPES_PHASE1 = [
  "deposit_request", "delimitation", "inquiry", "publicity", "cspgfr_validation", "prefect_signature",
] as const;

const STEP_TYPES_PHASE2 = [
  "immatriculation_request", "afor_control", "apfr_preparation", "minister_signature", "land_registry",
] as const;

const TEN_YEARS_MS = 10 * 365.25 * 24 * 60 * 60 * 1000;

// ─── Helpers ────────────────────────────────────────────────────────

function generateApplicationNumber(phase: "certificate" | "title"): string {
  const prefix = phase === "certificate" ? "CF" : "TF";
  const year = new Date().getFullYear();
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `${prefix}-${year}-${random}`;
}

function isValidTransition(currentStatus: string, newStatus: string): boolean {
  const transitions = { ...CF_TRANSITIONS, ...TF_TRANSITIONS };
  const allowed = transitions[currentStatus];
  if (!allowed) return false;
  return allowed.includes(newStatus);
}

// ─── Citizen Procedures ─────────────────────────────────────────────

const citizenLandTitleRouter = router({
  // Create a new application (Phase 1 — draft)
  create: protectedProcedure
    .input(z.object({
      applicantFullName: z.string().min(2).max(255),
      applicantNationality: z.string().max(100).optional(),
      applicantIdType: z.string().max(50).optional(),
      applicantIdNumber: z.string().max(100).optional(),
      landDescription: z.string().optional(),
      landLocality: z.string().max(255).optional(),
      landSubPrefecture: z.string().max(255).optional(),
      landDepartment: z.string().max(255).optional(),
      landRegion: z.string().max(255).optional(),
      landAreaHectares: z.string().max(32).optional(),
      parcelId: z.number().optional(),
      territoryId: z.number().optional(),
      presforEligible: z.boolean().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      // Validate parcel ownership if provided
      if (input.parcelId) {
        const parcel = await getParcelByIdAndOwner(input.parcelId, ctx.user.id);
        if (!parcel) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Parcelle introuvable ou ne vous appartient pas" });
        }
      }

      const now = Date.now();
      const applicationNumber = generateApplicationNumber("certificate");
      const app = await createLandTitleApplication({
        applicationNumber,
        userId: ctx.user.id,
        phase: "certificate",
        status: "cf_draft",
        applicantFullName: input.applicantFullName,
        applicantNationality: input.applicantNationality || null,
        applicantIdType: input.applicantIdType || null,
        applicantIdNumber: input.applicantIdNumber || null,
        landDescription: input.landDescription || null,
        landLocality: input.landLocality || null,
        landSubPrefecture: input.landSubPrefecture || null,
        landDepartment: input.landDepartment || null,
        landRegion: input.landRegion || null,
        landAreaHectares: input.landAreaHectares || null,
        parcelId: input.parcelId || null,
        territoryId: input.territoryId || null,
        presforEligible: input.presforEligible ?? false,
        createdAt: now,
        updatedAt: now,
      });

      // Create initial step
      await createLandTitleStep({
        applicationId: app.id,
        stepType: "deposit_request",
        status: "pending",
        createdAt: now,
      });

      await createAuditEvent({
        actorId: ctx.user.id,
        actorRole: ctx.user.role,
        action: "landTitle.application.created",
        targetType: "land_title_application",
        targetId: app.id,
        details: { applicationNumber, phase: "certificate" },
      });

      return app;
    }),

  // List my applications (with linked parcel info)
  listMine: protectedProcedure
    .input(z.object({
      limit: z.number().min(1).max(100).default(50),
      offset: z.number().min(0).default(0),
    }).optional())
    .query(async ({ input, ctx }) => {
      const limit = input?.limit ?? 50;
      const offset = input?.offset ?? 0;
      const [items, total] = await Promise.all([
        listLandTitleApplicationsByUserWithParcel(ctx.user.id, limit, offset),
        countLandTitleApplicationsByUser(ctx.user.id),
      ]);
      return { items, total };
    }),

  // Get one application by ID (strict ownership, with parcel)
  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input, ctx }) => {
      const app = await getLandTitleApplicationWithParcel(input.id);
      if (!app || app.userId !== ctx.user.id) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Dossier introuvable ou accès non autorisé" });
      }
      const [steps, documents, oppositions] = await Promise.all([
        listLandTitleSteps(app.id),
        listLandTitleDocuments(app.id),
        listLandTitleOppositions(app.id),
      ]);
      return { ...app, steps, documents, oppositions };
    }),

  // Update draft application
  update: protectedProcedure
    .input(z.object({
      id: z.number(),
      applicantFullName: z.string().min(2).max(255).optional(),
      applicantNationality: z.string().max(100).optional(),
      applicantIdType: z.string().max(50).optional(),
      applicantIdNumber: z.string().max(100).optional(),
      landDescription: z.string().optional(),
      landLocality: z.string().max(255).optional(),
      landSubPrefecture: z.string().max(255).optional(),
      landDepartment: z.string().max(255).optional(),
      landRegion: z.string().max(255).optional(),
      landAreaHectares: z.string().max(32).optional(),
      presforEligible: z.boolean().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const app = await getLandTitleApplicationById(input.id);
      if (!app || app.userId !== ctx.user.id) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Dossier introuvable ou accès non autorisé" });
      }
      if (app.status !== "cf_draft") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Seuls les dossiers en brouillon peuvent être modifiés" });
      }
      const { id, ...updateData } = input;
      await updateLandTitleApplication(id, updateData as any);
      await createAuditEvent({
        actorId: ctx.user.id,
        actorRole: ctx.user.role,
        action: "landTitle.application.updated",
        targetType: "land_title_application",
        targetId: id,
      });
      return { success: true };
    }),

  // Submit application (draft → submitted)
  submit: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const app = await getLandTitleApplicationById(input.id);
      if (!app || app.userId !== ctx.user.id) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Dossier introuvable ou accès non autorisé" });
      }
      if (app.status !== "cf_draft") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Ce dossier ne peut pas être soumis (statut actuel: " + app.status + ")" });
      }
      // Validate required fields
      if (!app.applicantFullName || !app.landLocality || !app.landSubPrefecture) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Informations incomplètes: nom, localité et sous-préfecture requis" });
      }

      await updateLandTitleApplication(input.id, { status: "cf_submitted" });
      await updateLandTitleStep(
        (await listLandTitleSteps(input.id)).find(s => s.stepType === "deposit_request")?.id ?? 0,
        { status: "completed", completedAt: Date.now() }
      );

      await createAuditEvent({
        actorId: ctx.user.id,
        actorRole: ctx.user.role,
        action: "landTitle.application.submitted",
        targetType: "land_title_application",
        targetId: input.id,
        details: { previousStatus: "cf_draft", newStatus: "cf_submitted" },
      });
      return { success: true };
    }),

  // Upload a document
  uploadDocument: protectedProcedure
    .input(z.object({
      applicationId: z.number(),
      documentType: z.string().min(1).max(50),
      label: z.string().min(1).max(255),
      fileUrl: z.string().url(),
      fileKey: z.string().min(1),
      mimeType: z.string().max(100).optional(),
      fileSizeBytes: z.number().optional(),
      sha256: z.string().max(64).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const app = await getLandTitleApplicationById(input.applicationId);
      if (!app || app.userId !== ctx.user.id) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Dossier introuvable ou accès non autorisé" });
      }
      const doc = await createLandTitleDocument({
        applicationId: input.applicationId,
        documentType: input.documentType,
        label: input.label,
        fileUrl: input.fileUrl,
        fileKey: input.fileKey,
        mimeType: input.mimeType || null,
        fileSizeBytes: input.fileSizeBytes || null,
        sha256: input.sha256 || null,
        uploadedBy: ctx.user.id,
        verified: false,
        createdAt: Date.now(),
      });

      await createAuditEvent({
        actorId: ctx.user.id,
        actorRole: ctx.user.role,
        action: "landTitle.document.uploaded",
        targetType: "land_title_document",
        targetId: doc.id,
        details: { applicationId: input.applicationId, documentType: input.documentType },
      });
      return doc;
    }),

  // Delete a document (only if not verified)
  deleteDocument: protectedProcedure
    .input(z.object({ documentId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const doc = await getLandTitleDocumentById(input.documentId);
      if (!doc) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Document introuvable" });
      }
      const app = await getLandTitleApplicationById(doc.applicationId);
      if (!app || app.userId !== ctx.user.id) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Dossier introuvable ou accès non autorisé" });
      }
      if (doc.verified) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Un document vérifié ne peut pas être supprimé" });
      }
      await deleteLandTitleDocument(input.documentId);
      await createAuditEvent({
        actorId: ctx.user.id,
        actorRole: ctx.user.role,
        action: "landTitle.document.deleted",
        targetType: "land_title_document",
        targetId: input.documentId,
        details: { applicationId: app.id },
      });
      return { success: true };
    }),

  // Request immatriculation (Phase 2)
  requestImmatriculation: protectedProcedure
    .input(z.object({ applicationId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const app = await getLandTitleApplicationById(input.applicationId);
      if (!app || app.userId !== ctx.user.id) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Dossier introuvable ou accès non autorisé" });
      }
      if (app.status !== "cf_signed") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Seul un dossier avec Certificat Foncier signé peut demander l'immatriculation" });
      }
      // Check nationality
      if (!app.applicantNationality || app.applicantNationality.toLowerCase() !== "ivoirienne") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Seules les personnes de nationalité ivoirienne peuvent immatriculer une terre rurale" });
      }
      // Check CF expiry (10 years)
      if (app.certificateSignedAt && (Date.now() - app.certificateSignedAt > TEN_YEARS_MS)) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Le Certificat Foncier a expiré (délai de 10 ans dépassé)" });
      }

      await updateLandTitleApplication(input.applicationId, {
        phase: "title",
        status: "tf_submitted",
      });

      // Create Phase 2 steps
      const now = Date.now();
      for (const stepType of STEP_TYPES_PHASE2) {
        await createLandTitleStep({
          applicationId: input.applicationId,
          stepType,
          status: stepType === "immatriculation_request" ? "completed" : "pending",
          completedAt: stepType === "immatriculation_request" ? now : null,
          completedBy: stepType === "immatriculation_request" ? ctx.user.id : null,
          createdAt: now,
        });
      }

      await createAuditEvent({
        actorId: ctx.user.id,
        actorRole: ctx.user.role,
        action: "landTitle.immatriculation.requested",
        targetType: "land_title_application",
        targetId: input.applicationId,
        details: { previousStatus: "cf_signed", newStatus: "tf_submitted" },
      });
      return { success: true };
    }),
});

// ─── Admin Procedures ───────────────────────────────────────────────

const adminLandTitleRouter = router({
  // List all applications with filters
  listAll: adminProcedure
    .input(z.object({
      status: z.string().optional(),
      phase: z.enum(["certificate", "title"]).optional(),
      limit: z.number().min(1).max(100).default(50),
      offset: z.number().min(0).default(0),
    }).optional())
    .query(async ({ input }) => {
      const status = input?.status;
      const phase = input?.phase;
      const limit = input?.limit ?? 50;
      const offset = input?.offset ?? 0;
      const [items, total] = await Promise.all([
        listAllLandTitleApplicationsWithParcel(status, phase, limit, offset),
        countAllLandTitleApplications(status, phase),
      ]);
      return { items, total };
    }),

  // Get full details (admin, with parcel)
  getByIdAdmin: adminProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const app = await getLandTitleApplicationWithParcel(input.id);
      if (!app) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Dossier introuvable" });
      }
      const [steps, documents, oppositions] = await Promise.all([
        listLandTitleSteps(app.id),
        listLandTitleDocuments(app.id),
        listLandTitleOppositions(app.id),
      ]);
      return { ...app, steps, documents, oppositions };
    }),

  // Advance step (transition to next status)
  advanceStep: adminProcedure
    .input(z.object({
      applicationId: z.number(),
      newStatus: z.string(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const app = await getLandTitleApplicationById(input.applicationId);
      if (!app) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Dossier introuvable" });
      }
      if (!isValidTransition(app.status, input.newStatus)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Transition invalide: ${app.status} → ${input.newStatus}`,
        });
      }

      const previousStatus = app.status;
      await updateLandTitleApplication(input.applicationId, { status: input.newStatus });

      await createAuditEvent({
        actorId: ctx.user.id,
        actorRole: ctx.user.role,
        action: "landTitle.status.advanced",
        targetType: "land_title_application",
        targetId: input.applicationId,
        details: { previousStatus, newStatus: input.newStatus, notes: input.notes },
      });

      // Notify owner on critical status changes
      void notifyOwner({
        title: `Titre Foncier — Avancement dossier #${app.applicationNumber}`,
        content: `Statut passé de ${previousStatus} à ${input.newStatus}${input.notes ? ` (note: ${input.notes})` : ""}`,
      });

      return { success: true, previousStatus, newStatus: input.newStatus };
    }),

  // Reject application
  rejectApplication: adminProcedure
    .input(z.object({
      applicationId: z.number(),
      reason: z.string().min(1),
    }))
    .mutation(async ({ input, ctx }) => {
      const app = await getLandTitleApplicationById(input.applicationId);
      if (!app) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Dossier introuvable" });
      }
      const rejectStatus = app.phase === "certificate" ? "cf_rejected" : "tf_rejected";
      const previousStatus = app.status;
      await updateLandTitleApplication(input.applicationId, {
        status: rejectStatus,
        notes: input.reason,
      });

      await createAuditEvent({
        actorId: ctx.user.id,
        actorRole: ctx.user.role,
        action: "landTitle.application.rejected",
        targetType: "land_title_application",
        targetId: input.applicationId,
        details: { previousStatus, newStatus: rejectStatus, reason: input.reason },
      });

      // Notify owner on rejection
      void notifyOwner({
        title: `Titre Foncier — Dossier #${app.applicationNumber} REJETÉ`,
        content: `Motif: ${input.reason}`,
      });

      return { success: true };
    }),

  // Add opposition
  addOpposition: adminProcedure
    .input(z.object({
      applicationId: z.number(),
      opponentName: z.string().min(1).max(255),
      opponentContact: z.string().max(255).optional(),
      reason: z.string().min(1),
    }))
    .mutation(async ({ input, ctx }) => {
      const app = await getLandTitleApplicationById(input.applicationId);
      if (!app) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Dossier introuvable" });
      }
      if (app.status !== "cf_publicity" && app.status !== "cf_opposed") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Les oppositions ne sont possibles que pendant la période de publicité" });
      }

      const opp = await createLandTitleOpposition({
        applicationId: input.applicationId,
        opponentName: input.opponentName,
        opponentContact: input.opponentContact || null,
        reason: input.reason,
        status: "pending",
        createdAt: Date.now(),
      });

      // Update status to opposed if not already
      if (app.status !== "cf_opposed") {
        await updateLandTitleApplication(input.applicationId, { status: "cf_opposed" });
      }

      await createAuditEvent({
        actorId: ctx.user.id,
        actorRole: ctx.user.role,
        action: "landTitle.opposition.added",
        targetType: "land_title_opposition",
        targetId: opp.id,
        details: { applicationId: input.applicationId, opponentName: input.opponentName },
      });
      return opp;
    }),

  // Resolve opposition
  resolveOpposition: adminProcedure
    .input(z.object({
      oppositionId: z.number(),
      status: z.enum(["confirmed", "dismissed"]),
      resolutionNotes: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      await updateLandTitleOpposition(input.oppositionId, {
        status: input.status,
        resolutionNotes: input.resolutionNotes || null,
        resolvedBy: ctx.user.id,
        resolvedAt: Date.now(),
      });

      await createAuditEvent({
        actorId: ctx.user.id,
        actorRole: ctx.user.role,
        action: "landTitle.opposition.resolved",
        targetType: "land_title_opposition",
        targetId: input.oppositionId,
        details: { resolution: input.status, notes: input.resolutionNotes },
      });
      return { success: true };
    }),

  // Verify document
  verifyDocument: adminProcedure
    .input(z.object({ documentId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const doc = await getLandTitleDocumentById(input.documentId);
      if (!doc) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Document introuvable" });
      }
      await updateLandTitleDocument(input.documentId, {
        verified: true,
        verifiedBy: ctx.user.id,
        verifiedAt: Date.now(),
      });

      await createAuditEvent({
        actorId: ctx.user.id,
        actorRole: ctx.user.role,
        action: "landTitle.document.verified",
        targetType: "land_title_document",
        targetId: input.documentId,
        details: { applicationId: doc.applicationId },
      });
      return { success: true };
    }),

  // Assign operator
  assignOperator: adminProcedure
    .input(z.object({
      applicationId: z.number(),
      operatorName: z.string().min(1).max(255),
      operatorLicense: z.string().max(100).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const app = await getLandTitleApplicationById(input.applicationId);
      if (!app) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Dossier introuvable" });
      }
      await updateLandTitleApplication(input.applicationId, {
        operatorName: input.operatorName,
        operatorLicense: input.operatorLicense || null,
      });

      await createAuditEvent({
        actorId: ctx.user.id,
        actorRole: ctx.user.role,
        action: "landTitle.operator.assigned",
        targetType: "land_title_application",
        targetId: input.applicationId,
        details: { operatorName: input.operatorName },
      });
      return { success: true };
    }),

  // Assign commissioner
  assignCommissioner: adminProcedure
    .input(z.object({
      applicationId: z.number(),
      inquiryCommissioner: z.string().min(1).max(255),
    }))
    .mutation(async ({ input, ctx }) => {
      const app = await getLandTitleApplicationById(input.applicationId);
      if (!app) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Dossier introuvable" });
      }
      await updateLandTitleApplication(input.applicationId, {
        inquiryCommissioner: input.inquiryCommissioner,
      });

      await createAuditEvent({
        actorId: ctx.user.id,
        actorRole: ctx.user.role,
        action: "landTitle.commissioner.assigned",
        targetType: "land_title_application",
        targetId: input.applicationId,
        details: { inquiryCommissioner: input.inquiryCommissioner },
      });
      return { success: true };
    }),

  // Sign certificate (CF)
  signCertificate: adminProcedure
    .input(z.object({
      applicationId: z.number(),
      certificateNumber: z.string().min(1).max(100),
    }))
    .mutation(async ({ input, ctx }) => {
      const app = await getLandTitleApplicationById(input.applicationId);
      if (!app) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Dossier introuvable" });
      }
      if (app.status !== "cf_validated") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Le dossier doit être validé avant la signature" });
      }

      const now = Date.now();
      await updateLandTitleApplication(input.applicationId, {
        status: "cf_signed",
        certificateNumber: input.certificateNumber,
        certificateSignedAt: now,
        certificateExpiryAt: now + TEN_YEARS_MS,
      });

      await createAuditEvent({
        actorId: ctx.user.id,
        actorRole: ctx.user.role,
        action: "landTitle.certificate.signed",
        targetType: "land_title_application",
        targetId: input.applicationId,
        details: { certificateNumber: input.certificateNumber },
      });
      return { success: true };
    }),

  // Sign APFR (Arrêté)
  signApfr: adminProcedure
    .input(z.object({
      applicationId: z.number(),
      apfrNumber: z.string().min(1).max(100),
    }))
    .mutation(async ({ input, ctx }) => {
      const app = await getLandTitleApplicationById(input.applicationId);
      if (!app) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Dossier introuvable" });
      }
      if (app.status !== "tf_minister_signing") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Le dossier doit être en attente de signature ministérielle" });
      }

      await updateLandTitleApplication(input.applicationId, {
        status: "tf_signed",
        apfrNumber: input.apfrNumber,
      });

      await createAuditEvent({
        actorId: ctx.user.id,
        actorRole: ctx.user.role,
        action: "landTitle.apfr.signed",
        targetType: "land_title_application",
        targetId: input.applicationId,
        details: { apfrNumber: input.apfrNumber },
      });
      return { success: true };
    }),

  // Register title (inscription au Livre Foncier)
  registerTitle: adminProcedure
    .input(z.object({
      applicationId: z.number(),
      titleNumber: z.string().min(1).max(100),
    }))
    .mutation(async ({ input, ctx }) => {
      const app = await getLandTitleApplicationById(input.applicationId);
      if (!app) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Dossier introuvable" });
      }
      if (app.status !== "tf_signed") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "L'arrêté doit être signé avant l'inscription au Livre Foncier" });
      }

      const now = Date.now();
      await updateLandTitleApplication(input.applicationId, {
        status: "tf_registered",
        titleNumber: input.titleNumber,
        titleRegisteredAt: now,
      });

      await createAuditEvent({
        actorId: ctx.user.id,
        actorRole: ctx.user.role,
        action: "landTitle.title.registered",
        targetType: "land_title_application",
        targetId: input.applicationId,
        details: { titleNumber: input.titleNumber },
      });
      return { success: true };
    }),
});

// ─── Combined Router ────────────────────────────────────────────────

export const landTitleRouter = router({
  citizen: citizenLandTitleRouter,
  admin: adminLandTitleRouter,
});
