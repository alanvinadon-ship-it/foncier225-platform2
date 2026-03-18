/**
 * Credit Router
 * tRPC procedures for credit file management
 */

import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { protectedProcedure, router } from "./_core/trpc";
import { getDb } from "./db";
import { createAuditEvent } from "./db";
import { creditFiles, creditDocuments, creditFileParticipants } from "../drizzle/schema";
import { eq, and } from "drizzle-orm";
import { CreditFileStatus, CreditProductType, CreditFileParticipantRole } from "@shared/credit-types";
import { CreditWorkflowService } from "./credit-workflow.service";
import { CreditChecklistService } from "./credit-checklist.service";

export const creditRouter = router({
  /**
   * Create a new credit file (DRAFT status)
   */
  createCreditFile: protectedProcedure
    .input(
      z.object({
        productType: z.enum(["STANDARD", "SIMPLIFIED"]),
        parcelId: z.number().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not initialized");

      // Create credit file
      const result = await db.insert(creditFiles).values({
        initiatorId: ctx.user.id,
        parcelId: input.parcelId || null,
        productType: input.productType as CreditProductType,
        status: CreditFileStatus.DRAFT,
        metadata: {},
      });

      const creditFileId = Number((result as any).insertId);

      // Add initiator as participant
      await db.insert(creditFileParticipants).values({
        creditFileId,
        userId: ctx.user.id,
        role: CreditFileParticipantRole.INITIATOR,
        consentGiven: false,
      });

      // Audit
      await createAuditEvent({
        actorId: ctx.user.id,
        actorRole: ctx.user.role,
        action: "credit.file.created",
        targetType: "credit_file",
        targetId: creditFileId,
        details: {
          productType: input.productType,
          parcelId: input.parcelId,
          initiatorId: ctx.user.id,
          timestamp: new Date().toISOString(),
        },
      });

      return { creditFileId, status: CreditFileStatus.DRAFT };
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
        productType: f.productType,
        status: f.status,
        createdAt: f.createdAt,
        submittedAt: f.submittedAt,
      }));
    }),

  /**
   * Get a specific credit file (owner-only)
   */
  getMyCreditFile: protectedProcedure
    .input(z.object({ creditFileId: z.number() }))
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not initialized");

      const file = await db
        .select()
        .from(creditFiles)
        .where(and(eq(creditFiles.id, input.creditFileId), eq(creditFiles.initiatorId, ctx.user.id)))
        .then((rows) => rows[0]);

      if (!file) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Dossier crédit introuvable ou accès non autorisé",
        });
      }

      return {
        id: file.id,
        productType: file.productType,
        status: file.status,
        createdAt: file.createdAt,
        submittedAt: file.submittedAt,
        closedAt: file.closedAt,
      };
    }),

  /**
   * List documents for a credit file (owner-only)
   */
  listCreditFileDocuments: protectedProcedure
    .input(z.object({ creditFileId: z.number() }))
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not initialized");

      // Verify ownership
      const file = await db
        .select()
        .from(creditFiles)
        .where(and(eq(creditFiles.id, input.creditFileId), eq(creditFiles.initiatorId, ctx.user.id)))
        .then((rows) => rows[0]);

      if (!file) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Dossier crédit introuvable ou accès non autorisé",
        });
      }

      const docs = await db
        .select()
        .from(creditDocuments)
        .where(eq(creditDocuments.creditFileId, input.creditFileId));

      return docs.map((d) => ({
        id: d.id,
        documentType: d.documentType,
        status: d.status,
        fileUrl: d.fileUrl,
        uploadedAt: d.uploadedAt,
        validatedAt: d.validatedAt,
        rejectionReason: d.rejectionReason,
      }));
    }),

  /**
   * Get checklist status for a credit file (owner-only)
   */
  getCreditFileChecklist: protectedProcedure
    .input(z.object({ creditFileId: z.number() }))
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not initialized");

      // Verify ownership
      const file = await db
        .select()
        .from(creditFiles)
        .where(and(eq(creditFiles.id, input.creditFileId), eq(creditFiles.initiatorId, ctx.user.id)))
        .then((rows) => rows[0]);

      if (!file) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Dossier crédit introuvable ou accès non autorisé",
        });
      }

      const checklist = await CreditChecklistService.getChecklistStatus(
        input.creditFileId,
        file.productType as CreditProductType
      );

      return checklist;
    }),
});
