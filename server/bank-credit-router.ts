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
  getParcelById,
  getUserById,
  listCreditDocumentsByFile,
  listCreditFilesByStatuses,
  updateCreditFileStatus,
} from "./db";

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
  if (!file || (file.status !== CreditFileStatus.SUBMITTED && file.status !== CreditFileStatus.UNDER_REVIEW)) {
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
        statuses: z.array(z.enum(["SUBMITTED", "UNDER_REVIEW"])).default(["SUBMITTED"]),
        limit: z.number().int().min(1).max(100).default(20),
        offset: z.number().int().min(0).default(0),
      })
    )
    .query(async ({ input }) => {
      assertCreditEnabled();

      const files = await listCreditFilesByStatuses(input.statuses, input.limit, input.offset);
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
      const [parcel, applicant, checklist, documents] = await Promise.all([
        file.parcelId ? getParcelById(file.parcelId) : Promise.resolve(null),
        getUserById(file.initiatorId),
        CreditChecklistService.getChecklistStatus(
          file.id,
          file.productType as CreditProductType
        ),
        listCreditDocumentsByFile(file.id),
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
});
