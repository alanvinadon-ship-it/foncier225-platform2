/**
 * Credit Router — V1.1-03
 * tRPC procedures for credit file management
 * Feature-flagged, owner-isolated, audit-trailed
 */

import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { protectedProcedure, router } from "./_core/trpc";
import { getDb } from "./db";
import { createAuditEvent } from "./db";
import { creditFiles, creditDocuments, creditFileParticipants } from "../drizzle/schema";
import { eq, and } from "drizzle-orm";
import {
  CreditFileStatus,
  CreditProductType,
  CreditFileParticipantRole,
  CREDIT_AUDIT_ACTIONS,
  generateCreditPublicRef,
} from "@shared/credit-types";
import { CreditWorkflowService } from "./credit-workflow.service";
import { CreditChecklistService } from "./credit-checklist.service";
import { FEATURE_FLAGS } from "@shared/featureFlags";

// ─── Feature Flag Guard ──────────────────────────────────────────────
function assertCreditEnabled() {
  if (!FEATURE_FLAGS.CREDIT_WORKFLOW_ENABLED) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Le module crédit habitat n'est pas encore activé.",
    });
  }
}

// ─── Ownership verification helper ──────────────────────────────────
async function verifyCreditFileOwnership(creditFileId: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not initialized");

  const file = await db
    .select()
    .from(creditFiles)
    .where(and(eq(creditFiles.id, creditFileId), eq(creditFiles.initiatorId, userId)))
    .then((rows) => rows[0]);

  if (!file) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Dossier crédit introuvable ou accès non autorisé",
    });
  }
  return file;
}

export const creditRouter = router({
  /**
   * Create a new credit file (DRAFT status)
   * Generates a unique publicRef (CF-YYYY-XXXXX)
   */
  createCreditFile: protectedProcedure
    .input(
      z.object({
        productType: z.enum(["STANDARD", "SIMPLIFIED"]),
        parcelId: z.number().optional(),
        amountRequestedXof: z.number().int().positive().optional(),
        durationMonths: z.number().int().min(6).max(360).optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      assertCreditEnabled();
      const db = await getDb();
      if (!db) throw new Error("Database not initialized");

      const publicRef = generateCreditPublicRef();

      const result = await db.insert(creditFiles).values({
        publicRef,
        initiatorId: ctx.user.id,
        parcelId: input.parcelId || null,
        amountRequestedXof: input.amountRequestedXof || null,
        durationMonths: input.durationMonths || null,
        productType: input.productType as CreditProductType,
        status: CreditFileStatus.DRAFT,
        lastTransitionAt: new Date(),
        metadata: {},
      });

      const creditFileId = Number((result as any).insertId);

      // Add initiator as citizen participant
      await db.insert(creditFileParticipants).values({
        creditFileId,
        userId: ctx.user.id,
        role: CreditFileParticipantRole.CITIZEN,
        consentGiven: false,
      });

      // Audit: credit.file.created
      await createAuditEvent({
        actorId: ctx.user.id,
        actorRole: ctx.user.role,
        action: CREDIT_AUDIT_ACTIONS.FILE_CREATED,
        targetType: "credit_file",
        targetId: creditFileId,
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

      return { creditFileId, publicRef, status: CreditFileStatus.DRAFT };
    }),

  /**
   * List my credit files (owner-only)
   */
  listMyCreditFiles: protectedProcedure
    .input(
      z.object({
        limit: z.number().default(10),
        offset: z.number().default(0),
      })
    )
    .query(async ({ input, ctx }) => {
      assertCreditEnabled();
      const db = await getDb();
      if (!db) throw new Error("Database not initialized");

      const files = await db
        .select()
        .from(creditFiles)
        .where(eq(creditFiles.initiatorId, ctx.user.id))
        .limit(input.limit)
        .offset(input.offset);

      return files.map((f) => ({
        id: f.id,
        publicRef: f.publicRef,
        productType: f.productType,
        status: f.status,
        amountRequestedXof: f.amountRequestedXof,
        durationMonths: f.durationMonths,
        createdAt: f.createdAt,
        submittedAt: f.submittedAt,
        lastTransitionAt: f.lastTransitionAt,
      }));
    }),

  /**
   * Get a specific credit file (owner-only)
   */
  getMyCreditFile: protectedProcedure
    .input(z.object({ creditFileId: z.number() }))
    .query(async ({ input, ctx }) => {
      assertCreditEnabled();
      const file = await verifyCreditFileOwnership(input.creditFileId, ctx.user.id);

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
      };
    }),

  /**
   * Submit a credit file (DRAFT/DOCS_PENDING → SUBMITTED)
   * Validates completeness before submission
   */
  submitCreditFile: protectedProcedure
    .input(z.object({ creditFileId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      assertCreditEnabled();
      const file = await verifyCreditFileOwnership(input.creditFileId, ctx.user.id);

      // Validate workflow transition
      const currentStatus = file.status as CreditFileStatus;
      CreditWorkflowService.assertTransition(currentStatus, "SUBMIT" as any);

      // Check document completeness
      const isComplete = await CreditChecklistService.isCreditFileComplete(
        input.creditFileId,
        file.productType as CreditProductType
      );

      if (!isComplete) {
        const checklist = await CreditChecklistService.getChecklistStatus(
          input.creditFileId,
          file.productType as CreditProductType
        );

        // Audit: error
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

      // Apply transition
      const newStatus = CreditWorkflowService.applyTransition(
        currentStatus,
        "SUBMIT" as any
      );

      const db = await getDb();
      if (!db) throw new Error("Database not initialized");

      await db
        .update(creditFiles)
        .set({
          status: newStatus,
          submittedAt: new Date(),
          lastTransitionAt: new Date(),
        })
        .where(eq(creditFiles.id, input.creditFileId));

      // Audit: credit.file.submitted
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

  /**
   * Upload a document for a credit file (owner-only)
   */
  uploadCreditDocument: protectedProcedure
    .input(
      z.object({
        creditFileId: z.number(),
        documentType: z.enum([
          "ID_CARD",
          "PROOF_INCOME",
          "PROOF_RESIDENCE",
          "LAND_TITLE_DEED",
          "BUILDING_PERMIT",
          "INSURANCE_QUOTE",
        ]),
        fileUrl: z.string().url(),
        fileKey: z.string(),
        mimeType: z.string().optional(),
        fileSize: z.number().int().optional(),
        sha256: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      assertCreditEnabled();
      const file = await verifyCreditFileOwnership(input.creditFileId, ctx.user.id);

      // Only allow upload in DRAFT or DOCS_PENDING
      const currentStatus = file.status as CreditFileStatus;
      if (
        currentStatus !== CreditFileStatus.DRAFT &&
        currentStatus !== CreditFileStatus.DOCS_PENDING
      ) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Impossible d'ajouter un document dans l'état ${currentStatus}`,
        });
      }

      const db = await getDb();
      if (!db) throw new Error("Database not initialized");

      // Check if document type already exists for this file
      const existing = await db
        .select()
        .from(creditDocuments)
        .where(
          and(
            eq(creditDocuments.creditFileId, input.creditFileId),
            eq(creditDocuments.documentType, input.documentType)
          )
        )
        .then((rows) => rows[0]);

      let docId: number;

      if (existing) {
        // Update existing document
        await db
          .update(creditDocuments)
          .set({
            fileUrl: input.fileUrl,
            fileKey: input.fileKey,
            mimeType: input.mimeType || null,
            fileSize: input.fileSize || null,
            sha256: input.sha256 || null,
            status: "UPLOADED",
            uploadedAt: new Date(),
            rejectionReason: null,
            rejectedAt: null,
          })
          .where(eq(creditDocuments.id, existing.id));
        docId = existing.id;
      } else {
        // Insert new document
        const result = await db.insert(creditDocuments).values({
          creditFileId: input.creditFileId,
          documentType: input.documentType,
          fileUrl: input.fileUrl,
          fileKey: input.fileKey,
          mimeType: input.mimeType || null,
          fileSize: input.fileSize || null,
          sha256: input.sha256 || null,
          status: "UPLOADED",
          uploadedAt: new Date(),
        });
        docId = Number((result as any).insertId);
      }

      // Transition to DOCS_PENDING if still DRAFT
      if (currentStatus === CreditFileStatus.DRAFT) {
        await db
          .update(creditFiles)
          .set({
            status: CreditFileStatus.DOCS_PENDING,
            lastTransitionAt: new Date(),
          })
          .where(eq(creditFiles.id, input.creditFileId));
      }

      // Audit: credit.file.doc_uploaded
      await createAuditEvent({
        actorId: ctx.user.id,
        actorRole: ctx.user.role,
        action: CREDIT_AUDIT_ACTIONS.FILE_DOC_UPLOADED,
        targetType: "credit_document",
        targetId: docId,
        details: {
          creditFileId: input.creditFileId,
          documentType: input.documentType,
          sha256: input.sha256,
          replaced: !!existing,
          timestamp: new Date().toISOString(),
        },
      });

      return { documentId: docId, status: "UPLOADED" };
    }),

  /**
   * List documents for a credit file (owner-only)
   */
  listCreditFileDocuments: protectedProcedure
    .input(z.object({ creditFileId: z.number() }))
    .query(async ({ input, ctx }) => {
      assertCreditEnabled();
      await verifyCreditFileOwnership(input.creditFileId, ctx.user.id);

      const db = await getDb();
      if (!db) throw new Error("Database not initialized");

      const docs = await db
        .select()
        .from(creditDocuments)
        .where(eq(creditDocuments.creditFileId, input.creditFileId));

      return docs.map((d) => ({
        id: d.id,
        documentType: d.documentType,
        status: d.status,
        fileUrl: d.fileUrl,
        sha256: d.sha256,
        mimeType: d.mimeType,
        fileSize: d.fileSize,
        uploadedAt: d.uploadedAt,
        validatedAt: d.validatedAt,
        rejectedAt: d.rejectedAt,
        rejectionReason: d.rejectionReason,
      }));
    }),

  /**
   * Get checklist status for a credit file (owner-only)
   */
  getCreditFileChecklist: protectedProcedure
    .input(z.object({ creditFileId: z.number() }))
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

  /**
   * Get participants for a credit file (owner-only)
   */
  getCreditFileParticipants: protectedProcedure
    .input(z.object({ creditFileId: z.number() }))
    .query(async ({ input, ctx }) => {
      assertCreditEnabled();
      await verifyCreditFileOwnership(input.creditFileId, ctx.user.id);

      const db = await getDb();
      if (!db) throw new Error("Database not initialized");

      const participants = await db
        .select()
        .from(creditFileParticipants)
        .where(eq(creditFileParticipants.creditFileId, input.creditFileId));

      return participants.map((p) => ({
        id: p.id,
        userId: p.userId,
        role: p.role,
        displayName: p.displayName,
        consentGiven: p.consentGiven,
        consentGivenAt: p.consentGivenAt,
      }));
    }),
});
