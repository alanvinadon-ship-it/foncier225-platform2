import { CREDIT_AUDIT_ACTIONS, CreditFileStatus, CreditProductType, CreditWorkflowEvent } from "@shared/credit-types";
import { isFeatureEnabled } from "@shared/featureFlags";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { bankProcedure, router } from "./_core/trpc";
import { CreditChecklistService } from "./credit-checklist.service";
import { CreditWorkflowService } from "./credit-workflow.service";
import {
  createAuditEvent,
  getCreditFileById,
  getLatestCreditDecisionByFile,
  getLatestCreditOfferByFile,
  getParcelById,
  getUserById,
  insertCreditDecision,
  insertCreditOffer,
  insertCreditRequest,
  listCreditDocumentsByFile,
  listCreditFilesByStatuses,
  listCreditOffersByFile,
  listCreditRequestsByFile,
  updateCreditOffer,
  updateCreditFileStatus,
} from "./db";
import type { CreditFile } from "../drizzle/schema";

function assertCreditEnabled() {
  if (!isFeatureEnabled("CREDIT_WORKFLOW_ENABLED")) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Le module credit habitat n'est pas encore active.",
    });
  }
}

async function auditBankCreditError(args: {
  actorId: number;
  actorRole: string;
  creditFileId?: number;
  reason: string;
  details?: Record<string, unknown>;
}) {
  await createAuditEvent({
    actorId: args.actorId,
    actorRole: args.actorRole,
    action: CREDIT_AUDIT_ACTIONS.FILE_ERROR,
    targetType: "credit_file",
    targetId: args.creditFileId,
    details: {
      reason: args.reason,
      timestamp: new Date().toISOString(),
      ...args.details,
    },
  });
}

async function getReadableBankCreditFile(creditFileId: number) {
  const file = await getCreditFileById(creditFileId);
  if (!file || file.status === CreditFileStatus.DRAFT) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Dossier indisponible pour le portail banque.",
    });
  }
  return file;
}

export const bankCreditRouter = router({
  listBankCreditFiles: bankProcedure
    .input(
      z.object({
        statuses: z.array(z.enum(["SUBMITTED", "UNDER_REVIEW", "DOCS_PENDING", "OFFERED", "ACCEPTED"])).default(["SUBMITTED"]),
        limit: z.number().int().min(1).max(100).default(20),
        offset: z.number().int().min(0).default(0),
      })
    )
    .query(async ({ input }) => {
      assertCreditEnabled();

      const files = await listCreditFilesByStatuses(input.statuses as CreditFile["status"][], input.limit, input.offset);
      return Promise.all(
        files.map(async file => {
          const checklist = await CreditChecklistService.getChecklistStatus(
            file.id,
            file.productType as CreditProductType
          );
          const parcel = file.parcelId ? await getParcelById(file.parcelId) : null;

          return {
            id: file.id,
            publicRef: file.publicRef,
            productType: file.productType,
            status: file.status,
            amountRequestedXof: file.amountRequestedXof,
            durationMonths: file.durationMonths,
            submittedAt: file.submittedAt,
            createdAt: file.createdAt,
            lastTransitionAt: file.lastTransitionAt,
            parcelId: file.parcelId,
            parcelReference: parcel?.reference ?? null,
            progress: {
              requiredUploaded: checklist.requiredDocuments.uploaded,
              requiredTotal: checklist.requiredDocuments.total,
              completionPercentage: checklist.completionPercentage,
              isComplete: checklist.isComplete,
            },
          };
        })
      );
    }),

  getBankCreditFile: bankProcedure
    .input(z.object({ creditFileId: z.number().int().positive() }))
    .query(async ({ input, ctx }) => {
      assertCreditEnabled();

      const file = await getReadableBankCreditFile(input.creditFileId);
      const [parcel, applicant, checklist, documents, requests, latestOffer, latestDecision] = await Promise.all([
        file.parcelId ? getParcelById(file.parcelId) : Promise.resolve(null),
        getUserById(file.initiatorId),
        CreditChecklistService.getChecklistStatus(
          file.id,
          file.productType as CreditProductType
        ),
        listCreditDocumentsByFile(file.id),
        listCreditRequestsByFile(file.id),
        getLatestCreditOfferByFile(file.id),
        getLatestCreditDecisionByFile(file.id),
      ]);

      await createAuditEvent({
        actorId: ctx.user.id,
        actorRole: ctx.user.role,
        action: CREDIT_AUDIT_ACTIONS.FILE_VIEWED_BANK,
        targetType: "credit_file",
        targetId: file.id,
        details: {
          status: file.status,
          timestamp: new Date().toISOString(),
        },
      });

      return {
        id: file.id,
        publicRef: file.publicRef,
        productType: file.productType,
        status: file.status,
        amountRequestedXof: file.amountRequestedXof,
        durationMonths: file.durationMonths,
        parcelId: file.parcelId,
        parcelReference: parcel?.reference ?? null,
        createdAt: file.createdAt,
        submittedAt: file.submittedAt,
        lastTransitionAt: file.lastTransitionAt,
        applicant: applicant
          ? {
              id: applicant.id,
              name: applicant.name,
              email: applicant.email,
              role: applicant.role,
            }
          : null,
        checklist,
        requests: requests.map(request => ({
          id: request.id,
          requestType: request.requestType,
          message: request.message,
          requestedDocumentTypes: request.requestedDocumentTypes,
          status: request.status,
          createdAt: request.createdAt,
          resolvedAt: request.resolvedAt,
        })),
        latestOffer: latestOffer
          ? {
              id: latestOffer.id,
              status: latestOffer.status,
              apr: latestOffer.apr,
              monthlyPaymentXof: latestOffer.monthlyPaymentXof,
              conditionsText: latestOffer.conditionsText,
              expiresAt: latestOffer.expiresAt,
              createdAt: latestOffer.createdAt,
            }
          : null,
        latestDecision: latestDecision
          ? {
              id: latestDecision.id,
              decisionType: latestDecision.decisionType,
              reason: latestDecision.reason,
              decidedAt: latestDecision.decidedAt,
            }
          : null,
        documents: documents.map(document => ({
          id: document.id,
          documentType: document.documentType,
          status: document.status,
          fileUrl: document.fileUrl,
          fileKey: document.fileKey,
          mimeType: document.mimeType,
          fileSize: document.fileSize,
          uploadedAt: document.uploadedAt,
          rejectionReason: document.rejectionReason,
        })),
      };
    }),

  reviewBankCreditFile: bankProcedure
    .input(z.object({ creditFileId: z.number().int().positive() }))
    .mutation(async ({ input, ctx }) => {
      assertCreditEnabled();

      const file = await getCreditFileById(input.creditFileId);
      if (!file) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Dossier credit introuvable.",
        });
      }
      const currentStatus = file.status as CreditFileStatus;

      if (currentStatus !== CreditFileStatus.SUBMITTED) {
        await auditBankCreditError({
          actorId: ctx.user.id,
          actorRole: ctx.user.role,
          creditFileId: file.id,
          reason: "invalid_review_transition",
          details: { currentStatus },
        });
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Seuls les dossiers soumis peuvent etre pris en revue.",
        });
      }

      const newStatus = CreditWorkflowService.applyTransition(
        currentStatus,
        CreditWorkflowEvent.REVIEW
      );

      await updateCreditFileStatus(file.id, {
        status: newStatus,
        lastTransitionAt: new Date(),
      });

      await createAuditEvent({
        actorId: ctx.user.id,
        actorRole: ctx.user.role,
        action: CREDIT_AUDIT_ACTIONS.FILE_UNDER_REVIEW,
        targetType: "credit_file",
        targetId: file.id,
        details: {
          previousStatus: currentStatus,
          newStatus,
          timestamp: new Date().toISOString(),
        },
      });

      return {
        creditFileId: file.id,
        status: newStatus,
      };
    }),

  requestDocsForCreditFile: bankProcedure
    .input(
      z.object({
        creditFileId: z.number().int().positive(),
        requestType: z.enum(["DOCUMENT_REQUEST", "INFORMATION_REQUEST"]).default("DOCUMENT_REQUEST"),
        message: z.string().min(3),
        requestedDocumentTypes: z.array(z.enum([
          "ID_CARD",
          "PROOF_INCOME",
          "PROOF_RESIDENCE",
          "LAND_TITLE_DEED",
          "BUILDING_PERMIT",
          "INSURANCE_QUOTE",
        ])).optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      assertCreditEnabled();
      const file = await getCreditFileById(input.creditFileId);
      if (!file) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Dossier credit introuvable." });
      }

      const currentStatus = file.status as CreditFileStatus;
      if (currentStatus !== CreditFileStatus.UNDER_REVIEW) {
        await auditBankCreditError({
          actorId: ctx.user.id,
          actorRole: ctx.user.role,
          creditFileId: file.id,
          reason: "invalid_request_docs_transition",
          details: { currentStatus },
        });
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Les demandes de complements sont autorisees uniquement depuis UNDER_REVIEW.",
        });
      }

      const createdRequest = await insertCreditRequest({
        creditFileId: file.id,
        requestType: input.requestType,
        message: input.message,
        requestedDocumentTypes: input.requestedDocumentTypes ?? null,
        status: "pending",
        createdByUserId: ctx.user.id,
      });

      const newStatus = CreditWorkflowService.applyTransition(currentStatus, CreditWorkflowEvent.REQUEST_DOCS);
      await updateCreditFileStatus(file.id, {
        status: newStatus,
        lastTransitionAt: new Date(),
      });

      await createAuditEvent({
        actorId: ctx.user.id,
        actorRole: ctx.user.role,
        action: CREDIT_AUDIT_ACTIONS.FILE_REQUEST_DOCS,
        targetType: "credit_file",
        targetId: file.id,
        details: {
          requestId: createdRequest?.id,
          requestType: input.requestType,
          requestedDocumentTypes: input.requestedDocumentTypes ?? [],
          previousStatus: currentStatus,
          newStatus,
          timestamp: new Date().toISOString(),
        },
      });

      return {
        creditFileId: file.id,
        requestId: createdRequest?.id,
        status: newStatus,
      };
    }),

  makeCreditOffer: bankProcedure
    .input(
      z.object({
        creditFileId: z.number().int().positive(),
        apr: z.string().min(1),
        monthlyPaymentXof: z.number().int().positive(),
        conditionsText: z.string().min(3),
        expiresAt: z.coerce.date(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      assertCreditEnabled();
      const file = await getCreditFileById(input.creditFileId);
      if (!file) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Dossier credit introuvable." });
      }

      const currentStatus = file.status as CreditFileStatus;
      if (currentStatus !== CreditFileStatus.UNDER_REVIEW) {
        await auditBankCreditError({
          actorId: ctx.user.id,
          actorRole: ctx.user.role,
          creditFileId: file.id,
          reason: "invalid_offer_transition",
          details: { currentStatus },
        });
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Une offre ne peut etre emise que depuis UNDER_REVIEW.",
        });
      }

      const priorOffers = await listCreditOffersByFile(file.id);
      await Promise.all(
        priorOffers
          .filter(offer => offer.status === "pending")
          .map(offer => updateCreditOffer(offer.id, { status: "expired" }))
      );

      const createdOffer = await insertCreditOffer({
        creditFileId: file.id,
        bankId: ctx.user.id,
        amount: file.amountRequestedXof ?? 0,
        interestRate: input.apr,
        apr: input.apr,
        duration: file.durationMonths ?? 0,
        monthlyPaymentXof: input.monthlyPaymentXof,
        conditionsText: input.conditionsText,
        status: "pending",
        expiresAt: input.expiresAt,
        createdByUserId: ctx.user.id,
        metadata: {},
      });

      const newStatus = CreditWorkflowService.applyTransition(currentStatus, CreditWorkflowEvent.MAKE_OFFER);
      await updateCreditFileStatus(file.id, {
        status: newStatus,
        lastTransitionAt: new Date(),
      });

      await createAuditEvent({
        actorId: ctx.user.id,
        actorRole: ctx.user.role,
        action: CREDIT_AUDIT_ACTIONS.FILE_OFFER_MADE,
        targetType: "credit_file",
        targetId: file.id,
        details: {
          offerId: createdOffer?.id,
          previousStatus: currentStatus,
          newStatus,
          expiresAt: input.expiresAt.toISOString(),
          timestamp: new Date().toISOString(),
        },
      });

      return {
        creditFileId: file.id,
        offerId: createdOffer?.id,
        status: newStatus,
      };
    }),

  decideCreditFile: bankProcedure
    .input(
      z.object({
        creditFileId: z.number().int().positive(),
        decisionType: z.enum(["APPROVED", "REJECTED"]),
        reason: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      assertCreditEnabled();
      const file = await getCreditFileById(input.creditFileId);
      if (!file) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Dossier credit introuvable." });
      }

      const currentStatus = file.status as CreditFileStatus;
      if (currentStatus !== CreditFileStatus.ACCEPTED) {
        await auditBankCreditError({
          actorId: ctx.user.id,
          actorRole: ctx.user.role,
          creditFileId: file.id,
          reason: "invalid_decision_transition",
          details: { currentStatus, decisionType: input.decisionType },
        });
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "La decision finale est autorisee uniquement depuis ACCEPTED.",
        });
      }

      const event = input.decisionType === "APPROVED" ? CreditWorkflowEvent.APPROVE : CreditWorkflowEvent.REJECT;
      const newStatus = CreditWorkflowService.applyTransition(currentStatus, event);
      const createdDecision = await insertCreditDecision({
        creditFileId: file.id,
        decisionType: input.decisionType,
        reason: input.reason ?? null,
        decidedByUserId: ctx.user.id,
        metadataJson: {},
      });

      await updateCreditFileStatus(file.id, {
        status: newStatus,
        lastTransitionAt: new Date(),
      });

      await createAuditEvent({
        actorId: ctx.user.id,
        actorRole: ctx.user.role,
        action: CREDIT_AUDIT_ACTIONS.FILE_DECIDED,
        targetType: "credit_file",
        targetId: file.id,
        details: {
          decisionId: createdDecision?.id,
          decisionType: input.decisionType,
          previousStatus: currentStatus,
          newStatus,
          timestamp: new Date().toISOString(),
        },
      });

      return {
        creditFileId: file.id,
        decisionId: createdDecision?.id,
        status: newStatus,
      };
    }),
});
