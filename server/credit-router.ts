import { CREDIT_AUDIT_ACTIONS, CreditFileParticipantRole, CreditFileStatus, CreditProductType, generateCreditPublicRef } from "@shared/credit-types";
import { isFeatureEnabled } from "@shared/featureFlags";
import { TRPCError } from "@trpc/server";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { protectedProcedure, router } from "./_core/trpc";
import { CreditChecklistService } from "./credit-checklist.service";
import { CreditWorkflowService } from "./credit-workflow.service";
import {
  createAuditEvent,
  getCreditDocumentByFileAndType,
  getCreditFileByIdAndOwner,
  getParcelById,
  insertCreditDocument,
  insertCreditFile,
  insertCreditFileParticipant,
  listCreditDocumentsByFile,
  listCreditFileParticipants,
  listCreditFilesByOwner,
  updateCreditDocument,
  updateCreditFileStatus,
} from "./db";
import { storagePut } from "./storage";

function assertCreditEnabled() {
  if (!isFeatureEnabled("CREDIT_WORKFLOW_ENABLED")) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Le module credit habitat n'est pas encore active.",
    });
  }
}

async function verifyCreditFileOwnership(creditFileId: number, userId: number) {
  const file = await getCreditFileByIdAndOwner(creditFileId, userId);
  if (!file) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Dossier credit introuvable ou acces non autorise",
    });
  }
  return file;
}

const creditDocumentTypeSchema = z.enum([
  "ID_CARD",
  "PROOF_INCOME",
  "PROOF_RESIDENCE",
  "LAND_TITLE_DEED",
  "BUILDING_PERMIT",
  "INSURANCE_QUOTE",
]);

const allowedUploadMimeTypes = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
]);

const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

function sanitizeFileName(fileName: string) {
  return fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
}

export const creditRouter = router({
  createCreditFile: protectedProcedure
    .input(
      z.object({
        productType: z.enum(["STANDARD", "SIMPLIFIED"]),
        parcelId: z.number().int().positive().optional(),
        amountRequestedXof: z.number().int().positive().optional(),
        durationMonths: z.number().int().min(6).max(360).optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      assertCreditEnabled();

      const publicRef = generateCreditPublicRef();
      const created = await insertCreditFile({
        publicRef,
        initiatorId: ctx.user.id,
        parcelId: input.parcelId ?? null,
        amountRequestedXof: input.amountRequestedXof ?? null,
        durationMonths: input.durationMonths ?? null,
        productType: input.productType as CreditProductType,
        status: CreditFileStatus.DRAFT,
        lastTransitionAt: new Date(),
        metadata: {},
      });

      if (!created) {
        throw new Error("Credit file creation failed");
      }

      await insertCreditFileParticipant({
        creditFileId: created.id,
        userId: ctx.user.id,
        role: CreditFileParticipantRole.CITIZEN,
        consentGiven: false,
      });

      await createAuditEvent({
        actorId: ctx.user.id,
        actorRole: ctx.user.role,
        action: CREDIT_AUDIT_ACTIONS.FILE_CREATED,
        targetType: "credit_file",
        targetId: created.id,
        details: {
          publicRef,
          productType: input.productType,
          parcelId: input.parcelId,
          amountRequestedXof: input.amountRequestedXof,
          durationMonths: input.durationMonths,
          initiatorId: ctx.user.id,
          timestamp: new Date().toISOString(),
        },
      });

      return { creditFileId: created.id, publicRef, status: CreditFileStatus.DRAFT };
    }),

  listMyCreditFiles: protectedProcedure
    .input(
      z.object({
        limit: z.number().int().min(1).max(100).default(10),
        offset: z.number().int().min(0).default(0),
      })
    )
    .query(async ({ input, ctx }) => {
      assertCreditEnabled();
      const files = await listCreditFilesByOwner(ctx.user.id, input.limit, input.offset);

      return Promise.all(files.map(async file => {
        const checklist = await CreditChecklistService.getChecklistStatus(
          file.id,
          file.productType as CreditProductType
        );

        return {
          id: file.id,
          publicRef: file.publicRef,
          productType: file.productType,
          status: file.status,
          amountRequestedXof: file.amountRequestedXof,
          durationMonths: file.durationMonths,
          createdAt: file.createdAt,
          submittedAt: file.submittedAt,
          lastTransitionAt: file.lastTransitionAt,
          progress: {
            requiredUploaded: checklist.requiredDocuments.uploaded,
            requiredTotal: checklist.requiredDocuments.total,
            completionPercentage: checklist.completionPercentage,
            isComplete: checklist.isComplete,
          },
        };
      }));
    }),

  getMyCreditFile: protectedProcedure
    .input(z.object({ creditFileId: z.number().int().positive() }))
    .query(async ({ input, ctx }) => {
      assertCreditEnabled();
      const file = await verifyCreditFileOwnership(input.creditFileId, ctx.user.id);
      const linkedParcel = file.parcelId ? await getParcelById(file.parcelId) : null;

      return {
        id: file.id,
        publicRef: file.publicRef,
        productType: file.productType,
        status: file.status,
        amountRequestedXof: file.amountRequestedXof,
        durationMonths: file.durationMonths,
        createdAt: file.createdAt,
        submittedAt: file.submittedAt,
        lastTransitionAt: file.lastTransitionAt,
        closedAt: file.closedAt,
        parcelId: file.parcelId,
        parcelReference: linkedParcel?.reference ?? null,
      };
    }),

  submitCreditFile: protectedProcedure
    .input(z.object({ creditFileId: z.number().int().positive() }))
    .mutation(async ({ input, ctx }) => {
      assertCreditEnabled();
      const file = await verifyCreditFileOwnership(input.creditFileId, ctx.user.id);
      const currentStatus = file.status as CreditFileStatus;

      CreditWorkflowService.assertTransition(currentStatus, "SUBMIT" as any);

      const isComplete = await CreditChecklistService.isCreditFileComplete(
        input.creditFileId,
        file.productType as CreditProductType
      );

      if (!isComplete) {
        const checklist = await CreditChecklistService.getChecklistStatus(
          input.creditFileId,
          file.productType as CreditProductType
        );

        await createAuditEvent({
          actorId: ctx.user.id,
          actorRole: ctx.user.role,
          action: CREDIT_AUDIT_ACTIONS.FILE_ERROR,
          targetType: "credit_file",
          targetId: input.creditFileId,
          details: {
            reason: "incomplete_documents",
            missing: checklist.requiredDocuments.missing,
            completionPercentage: checklist.completionPercentage,
            timestamp: new Date().toISOString(),
          },
        });

        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Dossier incomplet : ${checklist.requiredDocuments.missing.length} document(s) requis manquant(s)`,
        });
      }

      const newStatus = CreditWorkflowService.applyTransition(currentStatus, "SUBMIT" as any);
      await updateCreditFileStatus(input.creditFileId, {
        status: newStatus,
        submittedAt: new Date(),
        lastTransitionAt: new Date(),
      });

      await createAuditEvent({
        actorId: ctx.user.id,
        actorRole: ctx.user.role,
        action: CREDIT_AUDIT_ACTIONS.FILE_SUBMITTED,
        targetType: "credit_file",
        targetId: input.creditFileId,
        details: {
          publicRef: file.publicRef,
          previousStatus: currentStatus,
          newStatus,
          productType: file.productType,
          timestamp: new Date().toISOString(),
        },
      });

      return { creditFileId: input.creditFileId, status: newStatus };
    }),

  uploadCreditDocument: protectedProcedure
    .input(
      z.object({
        creditFileId: z.number().int().positive(),
        documentType: creditDocumentTypeSchema,
        fileUrl: z.string().url(),
        fileKey: z.string().min(1),
        mimeType: z.string().min(1).optional(),
        fileSize: z.number().int().positive().optional(),
        sha256: z.string().min(32).optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      assertCreditEnabled();
      const file = await verifyCreditFileOwnership(input.creditFileId, ctx.user.id);
      const currentStatus = file.status as CreditFileStatus;

      if (currentStatus !== CreditFileStatus.DRAFT && currentStatus !== CreditFileStatus.DOCS_PENDING) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Impossible d'ajouter un document dans l'etat ${currentStatus}`,
        });
      }

      const existing = await getCreditDocumentByFileAndType(input.creditFileId, input.documentType);
      let documentId: number;

      if (existing) {
        await updateCreditDocument(existing.id, {
          fileUrl: input.fileUrl,
          fileKey: input.fileKey,
          mimeType: input.mimeType ?? null,
          fileSize: input.fileSize ?? null,
          sha256: input.sha256 ?? null,
          status: "UPLOADED",
          uploadedAt: new Date(),
          rejectionReason: null,
          rejectedAt: null,
        });
        documentId = existing.id;
      } else {
        const created = await insertCreditDocument({
          creditFileId: input.creditFileId,
          documentType: input.documentType,
          fileUrl: input.fileUrl,
          fileKey: input.fileKey,
          mimeType: input.mimeType ?? null,
          fileSize: input.fileSize ?? null,
          sha256: input.sha256 ?? null,
          status: "UPLOADED",
          uploadedAt: new Date(),
        });
        if (!created) {
          throw new Error("Credit document creation failed");
        }
        documentId = created.id;
      }

      if (currentStatus === CreditFileStatus.DRAFT) {
        await updateCreditFileStatus(input.creditFileId, {
          status: CreditFileStatus.DOCS_PENDING,
          lastTransitionAt: new Date(),
        });
      }

      await createAuditEvent({
        actorId: ctx.user.id,
        actorRole: ctx.user.role,
        action: CREDIT_AUDIT_ACTIONS.FILE_DOC_UPLOADED,
        targetType: "credit_document",
        targetId: documentId,
        details: {
          creditFileId: input.creditFileId,
          documentType: input.documentType,
          sha256: input.sha256,
          replaced: Boolean(existing),
          timestamp: new Date().toISOString(),
        },
      });

      return { documentId, status: "UPLOADED" as const };
    }),

  addCreditDocument: protectedProcedure
    .input(
      z.object({
        creditFileId: z.number().int().positive(),
        documentType: creditDocumentTypeSchema,
        fileName: z.string().min(1),
        contentType: z.string().min(1),
        fileBase64: z.string().min(1),
      })
    )
    .mutation(async ({ input, ctx }) => {
      assertCreditEnabled();
      const file = await verifyCreditFileOwnership(input.creditFileId, ctx.user.id);
      const currentStatus = file.status as CreditFileStatus;

      if (currentStatus !== CreditFileStatus.DRAFT && currentStatus !== CreditFileStatus.DOCS_PENDING) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Impossible d'ajouter un document dans l'etat ${currentStatus}`,
        });
      }

      if (!allowedUploadMimeTypes.has(input.contentType)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Format de fichier non autorise. Utilisez PDF, JPG, JPEG ou PNG.",
        });
      }

      const buffer = Buffer.from(input.fileBase64, "base64");
      if (buffer.length === 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Le fichier transmis est vide.",
        });
      }

      if (buffer.length > MAX_UPLOAD_BYTES) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Le fichier depasse la taille maximale autorisee de 10 Mo.",
        });
      }

      const extension = sanitizeFileName(input.fileName).split(".").pop() || "bin";
      const key = `credit-files/${ctx.user.id}/${input.creditFileId}/${input.documentType}-${randomUUID()}.${extension}`;
      const uploaded = await storagePut(key, buffer, input.contentType);

      const existing = await getCreditDocumentByFileAndType(input.creditFileId, input.documentType);
      let documentId: number;

      if (existing) {
        await updateCreditDocument(existing.id, {
          fileUrl: uploaded.url,
          fileKey: uploaded.key,
          mimeType: input.contentType,
          fileSize: buffer.length,
          status: "UPLOADED",
          uploadedAt: new Date(),
          rejectionReason: null,
          rejectedAt: null,
        });
        documentId = existing.id;
      } else {
        const created = await insertCreditDocument({
          creditFileId: input.creditFileId,
          documentType: input.documentType,
          fileUrl: uploaded.url,
          fileKey: uploaded.key,
          mimeType: input.contentType,
          fileSize: buffer.length,
          status: "UPLOADED",
          uploadedAt: new Date(),
        });
        if (!created) {
          throw new Error("Credit document creation failed");
        }
        documentId = created.id;
      }

      if (currentStatus === CreditFileStatus.DRAFT) {
        await updateCreditFileStatus(input.creditFileId, {
          status: CreditFileStatus.DOCS_PENDING,
          lastTransitionAt: new Date(),
        });
      }

      await createAuditEvent({
        actorId: ctx.user.id,
        actorRole: ctx.user.role,
        action: CREDIT_AUDIT_ACTIONS.FILE_DOC_UPLOADED,
        targetType: "credit_document",
        targetId: documentId,
        details: {
          creditFileId: input.creditFileId,
          documentType: input.documentType,
          fileName: input.fileName,
          mimeType: input.contentType,
          fileSize: buffer.length,
          replaced: Boolean(existing),
          timestamp: new Date().toISOString(),
        },
      });

      return {
        documentId,
        fileUrl: uploaded.url,
        fileKey: uploaded.key,
        status: "UPLOADED" as const,
      };
    }),

  listCreditFileDocuments: protectedProcedure
    .input(z.object({ creditFileId: z.number().int().positive() }))
    .query(async ({ input, ctx }) => {
      assertCreditEnabled();
      await verifyCreditFileOwnership(input.creditFileId, ctx.user.id);
      const documents = await listCreditDocumentsByFile(input.creditFileId);

      return documents.map(document => ({
        id: document.id,
        documentType: document.documentType,
        status: document.status,
        fileUrl: document.fileUrl,
        sha256: document.sha256,
        mimeType: document.mimeType,
        fileSize: document.fileSize,
        uploadedAt: document.uploadedAt,
        validatedAt: document.validatedAt,
        rejectedAt: document.rejectedAt,
        rejectionReason: document.rejectionReason,
      }));
    }),

  getCreditFileChecklist: protectedProcedure
    .input(z.object({ creditFileId: z.number().int().positive() }))
    .query(async ({ input, ctx }) => {
      assertCreditEnabled();
      const file = await verifyCreditFileOwnership(input.creditFileId, ctx.user.id);
      const checklist = await CreditChecklistService.getChecklistStatus(
        input.creditFileId,
        file.productType as CreditProductType
      );

      return {
        ...checklist,
        validEvents: CreditWorkflowService.getValidEvents(file.status as CreditFileStatus),
        isTerminal: CreditWorkflowService.isTerminal(file.status as CreditFileStatus),
      };
    }),

  getCreditFileParticipants: protectedProcedure
    .input(z.object({ creditFileId: z.number().int().positive() }))
    .query(async ({ input, ctx }) => {
      assertCreditEnabled();
      await verifyCreditFileOwnership(input.creditFileId, ctx.user.id);
      const participants = await listCreditFileParticipants(input.creditFileId);

      return participants.map(participant => ({
        id: participant.id,
        userId: participant.userId,
        role: participant.role,
        displayName: participant.displayName,
        consentGiven: participant.consentGiven,
        consentGivenAt: participant.consentGivenAt,
      }));
    }),
});
