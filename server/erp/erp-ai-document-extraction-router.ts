/**
 * ERP AI Document Extraction Router — Sprint IA 2 Lot 1
 * 
 * Routes tRPC pour OCR, classification documentaire et validation humaine.
 */

import { z } from "zod";
import { eq, and, desc, asc, sql, count, gte, lte, like, or } from "drizzle-orm";
import { router, protectedProcedure, erpPermissionProcedure } from "../_core/trpc";
import { getDb } from "../db";
import {
  erpAiDocumentJobs,
  erpAiOcrResults,
  erpAiDocumentClassifications,
  erpAiDocumentValidationLogs,
  erpAiAuditLogs,
} from "../../drizzle/schema";
import {
  performOcr,
  classifyDocument,
  validateFile,
  generateJobNumber,
  isTextEmpty,
  DOCUMENT_TYPES,
  type DocumentType,
} from "./erp-ai-document-ocr.service";
import { storagePut } from "../storage";

// ─── HELPERS ─────────────────────────────────────────────────────────────────

async function createAuditLog(
  userId: number,
  action: string,
  module: string,
  details: Record<string, any>
) {
  const db = (await getDb())!;
  const now = Date.now();
  await db.insert(erpAiAuditLogs).values({
    userId,
    action,
    module,
    inputSummary: JSON.stringify(details),
    outputSummary: null,
    tokensUsed: 0,
    durationMs: 0,
    status: "success",
    createdAt: now,
  });
}

// ─── ROUTER ──────────────────────────────────────────────────────────────────

export const erpAiDocumentExtractionRouter = router({
  // ─── JOBS ────────────────────────────────────────────────────────────────────
  jobs: router({
    list: erpPermissionProcedure("erp_ai_document_extraction", "view")
      .input(z.object({
        search: z.string().optional(),
        sourceModule: z.string().optional(),
        documentType: z.string().optional(),
        jobStatus: z.string().optional(),
        ocrStatus: z.string().optional(),
        classificationStatus: z.string().optional(),
        confidenceMin: z.number().optional(),
        confidenceMax: z.number().optional(),
        dateFrom: z.number().optional(),
        dateTo: z.number().optional(),
        page: z.number().default(1),
        limit: z.number().default(20),
        sortBy: z.string().default("createdAt"),
        sortDirection: z.enum(["asc", "desc"]).default("desc"),
      }))
      .query(async ({ input }) => {
        const db = (await getDb())!;
        const offset = (input.page - 1) * input.limit;
        const conditions: any[] = [sql`${erpAiDocumentJobs.deletedAt} IS NULL`];

        if (input.search) {
          conditions.push(or(
            like(erpAiDocumentJobs.fileName, `%${input.search}%`),
            like(erpAiDocumentJobs.jobNumber, `%${input.search}%`),
          ));
        }
        if (input.sourceModule) conditions.push(eq(erpAiDocumentJobs.sourceModule, input.sourceModule));
        if (input.documentType) conditions.push(eq(erpAiDocumentJobs.detectedDocumentType, input.documentType));
        if (input.jobStatus) conditions.push(eq(erpAiDocumentJobs.jobStatus, input.jobStatus));
        if (input.ocrStatus) conditions.push(eq(erpAiDocumentJobs.ocrStatus, input.ocrStatus));
        if (input.classificationStatus) conditions.push(eq(erpAiDocumentJobs.classificationStatus, input.classificationStatus));
        if (input.confidenceMin !== undefined) conditions.push(gte(erpAiDocumentJobs.confidenceScore, input.confidenceMin));
        if (input.confidenceMax !== undefined) conditions.push(lte(erpAiDocumentJobs.confidenceScore, input.confidenceMax));
        if (input.dateFrom) conditions.push(gte(erpAiDocumentJobs.createdAt, input.dateFrom));
        if (input.dateTo) conditions.push(lte(erpAiDocumentJobs.createdAt, input.dateTo));

        const whereClause = and(...conditions);
        const orderCol = input.sortBy === "fileName" ? erpAiDocumentJobs.fileName
          : input.sortBy === "jobStatus" ? erpAiDocumentJobs.jobStatus
          : input.sortBy === "confidenceScore" ? erpAiDocumentJobs.confidenceScore
          : erpAiDocumentJobs.createdAt;
        const orderFn = input.sortDirection === "asc" ? asc : desc;

        const [rows, totalResult] = await Promise.all([
          db.select().from(erpAiDocumentJobs)
            .where(whereClause)
            .orderBy(orderFn(orderCol))
            .limit(input.limit)
            .offset(offset),
          db.select({ total: count() }).from(erpAiDocumentJobs)
            .where(whereClause),
        ]);

        return { jobs: rows, total: totalResult[0]?.total || 0 };
      }),

    getById: erpPermissionProcedure("erp_ai_document_extraction", "view")
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        const db = (await getDb())!;
        const [job] = await db.select().from(erpAiDocumentJobs)
          .where(eq(erpAiDocumentJobs.id, input.id));
        if (!job) throw new Error("Job non trouvé");
        return job;
      }),

    create: erpPermissionProcedure("erp_ai_document_extraction", "create")
      .input(z.object({
        documentId: z.number().optional(),
        sourceModule: z.string().optional(),
        sourceType: z.string().optional(),
        sourceId: z.number().optional(),
        fileName: z.string(),
        fileType: z.string(),
        fileSize: z.number(),
        fileUrl: z.string(),
      }))
      .mutation(async ({ ctx, input }) => {
        const db = (await getDb())!;
        const now = Date.now();

        // Validate file
        const validation = validateFile(input.fileName, input.fileType, input.fileSize);
        if (!validation.valid) throw new Error(validation.error);

        const jobNumber = generateJobNumber();
        const [result] = await db.insert(erpAiDocumentJobs).values({
          jobNumber,
          documentId: input.documentId || null,
          sourceModule: input.sourceModule || null,
          sourceType: input.sourceType || null,
          sourceId: input.sourceId || null,
          fileName: input.fileName,
          fileType: input.fileType,
          fileSize: input.fileSize,
          fileUrl: input.fileUrl,
          jobStatus: "pending",
          ocrStatus: "pending",
          classificationStatus: "pending",
          createdBy: ctx.user.id,
          createdAt: now,
          updatedAt: now,
        });

        await createAuditLog(ctx.user.id, "document_job.created", "ai_document_extraction", {
          jobNumber, fileName: input.fileName, sourceModule: input.sourceModule,
        });

        return { id: result.insertId, jobNumber };
      }),

    run: erpPermissionProcedure("erp_ai_document_extraction", "create")
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const db = (await getDb())!;
        const now = Date.now();

        const [job] = await db.select().from(erpAiDocumentJobs)
          .where(eq(erpAiDocumentJobs.id, input.id));
        if (!job) throw new Error("Job non trouvé");
        if (!job.fileUrl) throw new Error("Aucun fichier associé au job");

        // Update status to running
        await db.update(erpAiDocumentJobs)
          .set({ jobStatus: "running", ocrStatus: "running", startedAt: now, updatedAt: now })
          .where(eq(erpAiDocumentJobs.id, input.id));

        try {
          // Step 1: OCR
          const ocrResult = await performOcr(job.fileUrl, job.fileType);

          await db.insert(erpAiOcrResults).values({
            documentJobId: input.id,
            documentId: job.documentId,
            ocrEngine: "llm_vision",
            language: ocrResult.language || null,
            rawText: ocrResult.rawText,
            cleanedText: ocrResult.cleanedText,
            pagesCount: ocrResult.pagesCount,
            pageResultsJson: JSON.stringify(ocrResult.pageResults),
            confidenceScore: ocrResult.confidenceScore,
            processingTimeMs: ocrResult.processingTimeMs,
            createdAt: now,
            updatedAt: now,
          });

          await db.update(erpAiDocumentJobs)
            .set({ ocrStatus: "completed", jobStatus: "ocr_completed", updatedAt: Date.now() })
            .where(eq(erpAiDocumentJobs.id, input.id));

          await createAuditLog(ctx.user.id, "document_job.ocr_completed", "ai_document_extraction", {
            jobId: input.id, confidence: ocrResult.confidenceScore, pages: ocrResult.pagesCount,
          });

          // Step 2: Classification
          if (isTextEmpty(ocrResult.cleanedText)) {
            await db.update(erpAiDocumentJobs)
              .set({
                classificationStatus: "failed",
                jobStatus: "needs_review",
                errorMessage: "Texte OCR insuffisant pour classification",
                finishedAt: Date.now(),
                durationMs: Date.now() - now,
                updatedAt: Date.now(),
              })
              .where(eq(erpAiDocumentJobs.id, input.id));
            return { success: true, ocrCompleted: true, classificationCompleted: false, reason: "empty_text" };
          }

          const classResult = await classifyDocument(ocrResult.cleanedText);

          await db.insert(erpAiDocumentClassifications).values({
            documentJobId: input.id,
            documentId: job.documentId,
            detectedDocumentType: classResult.documentType,
            recommendedModule: classResult.recommendedModule,
            confidenceScore: classResult.confidenceScore,
            classificationReason: classResult.classificationReason,
            alternativeTypesJson: JSON.stringify(classResult.alternativeTypes),
            status: classResult.needsHumanReview ? "needs_review" : "suggested",
            createdAt: Date.now(),
            updatedAt: Date.now(),
          });

          const finalStatus = classResult.needsHumanReview ? "needs_review" : "classification_completed";
          await db.update(erpAiDocumentJobs)
            .set({
              classificationStatus: "completed",
              jobStatus: finalStatus,
              detectedDocumentType: classResult.documentType,
              confidenceScore: classResult.confidenceScore,
              finishedAt: Date.now(),
              durationMs: Date.now() - now,
              updatedAt: Date.now(),
            })
            .where(eq(erpAiDocumentJobs.id, input.id));

          await createAuditLog(ctx.user.id, "document_job.classification_completed", "ai_document_extraction", {
            jobId: input.id, type: classResult.documentType, confidence: classResult.confidenceScore,
          });

          return { success: true, ocrCompleted: true, classificationCompleted: true, documentType: classResult.documentType };
        } catch (error: any) {
          await db.update(erpAiDocumentJobs)
            .set({
              jobStatus: "failed",
              ocrStatus: job.ocrStatus === "running" ? "failed" : job.ocrStatus,
              errorMessage: error.message || "Erreur inconnue",
              finishedAt: Date.now(),
              durationMs: Date.now() - now,
              updatedAt: Date.now(),
            })
            .where(eq(erpAiDocumentJobs.id, input.id));

          await createAuditLog(ctx.user.id, "document_job.failed", "ai_document_extraction", {
            jobId: input.id, error: error.message,
          });

          throw error;
        }
      }),

    retryOcr: erpPermissionProcedure("erp_ai_document_extraction", "create")
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const db = (await getDb())!;
        const now = Date.now();

        const [job] = await db.select().from(erpAiDocumentJobs)
          .where(eq(erpAiDocumentJobs.id, input.id));
        if (!job) throw new Error("Job non trouvé");
        if (!job.fileUrl) throw new Error("Aucun fichier associé");

        await db.update(erpAiDocumentJobs)
          .set({ ocrStatus: "running", jobStatus: "running", errorMessage: null, updatedAt: now })
          .where(eq(erpAiDocumentJobs.id, input.id));

        const ocrResult = await performOcr(job.fileUrl, job.fileType);

        // Delete old OCR result and insert new
        await db.delete(erpAiOcrResults).where(eq(erpAiOcrResults.documentJobId, input.id));
        await db.insert(erpAiOcrResults).values({
          documentJobId: input.id,
          documentId: job.documentId,
          ocrEngine: "llm_vision",
          language: ocrResult.language || null,
          rawText: ocrResult.rawText,
          cleanedText: ocrResult.cleanedText,
          pagesCount: ocrResult.pagesCount,
          pageResultsJson: JSON.stringify(ocrResult.pageResults),
          confidenceScore: ocrResult.confidenceScore,
          processingTimeMs: ocrResult.processingTimeMs,
          createdAt: now,
          updatedAt: now,
        });

        await db.update(erpAiDocumentJobs)
          .set({ ocrStatus: "completed", jobStatus: "ocr_completed", updatedAt: Date.now() })
          .where(eq(erpAiDocumentJobs.id, input.id));

        await createAuditLog(ctx.user.id, "document_job.ocr_retried", "ai_document_extraction", { jobId: input.id });

        await db.insert(erpAiDocumentValidationLogs).values({
          documentJobId: input.id,
          action: "Retry OCR",
          performedBy: ctx.user.id,
          performedAt: now,
          createdAt: now,
        });

        return { success: true, confidence: ocrResult.confidenceScore };
      }),

    retryClassification: erpPermissionProcedure("erp_ai_document_extraction", "create")
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const db = (await getDb())!;
        const now = Date.now();

        const [job] = await db.select().from(erpAiDocumentJobs)
          .where(eq(erpAiDocumentJobs.id, input.id));
        if (!job) throw new Error("Job non trouvé");

        // Get OCR text
        const [ocrResult] = await db.select().from(erpAiOcrResults)
          .where(eq(erpAiOcrResults.documentJobId, input.id));
        if (!ocrResult || isTextEmpty(ocrResult.cleanedText)) {
          throw new Error("Texte OCR insuffisant. Relancez l'OCR d'abord.");
        }

        await db.update(erpAiDocumentJobs)
          .set({ classificationStatus: "running", jobStatus: "running", updatedAt: now })
          .where(eq(erpAiDocumentJobs.id, input.id));

        const classResult = await classifyDocument(ocrResult.cleanedText!);

        // Delete old classification and insert new
        await db.delete(erpAiDocumentClassifications).where(eq(erpAiDocumentClassifications.documentJobId, input.id));
        await db.insert(erpAiDocumentClassifications).values({
          documentJobId: input.id,
          documentId: job.documentId,
          detectedDocumentType: classResult.documentType,
          recommendedModule: classResult.recommendedModule,
          confidenceScore: classResult.confidenceScore,
          classificationReason: classResult.classificationReason,
          alternativeTypesJson: JSON.stringify(classResult.alternativeTypes),
          status: classResult.needsHumanReview ? "needs_review" : "suggested",
          createdAt: now,
          updatedAt: now,
        });

        const finalStatus = classResult.needsHumanReview ? "needs_review" : "classification_completed";
        await db.update(erpAiDocumentJobs)
          .set({
            classificationStatus: "completed",
            jobStatus: finalStatus,
            detectedDocumentType: classResult.documentType,
            confidenceScore: classResult.confidenceScore,
            updatedAt: Date.now(),
          })
          .where(eq(erpAiDocumentJobs.id, input.id));

        await createAuditLog(ctx.user.id, "document_job.classification_retried", "ai_document_extraction", { jobId: input.id });

        await db.insert(erpAiDocumentValidationLogs).values({
          documentJobId: input.id,
          action: "Retry Classification",
          performedBy: ctx.user.id,
          performedAt: now,
          createdAt: now,
        });

        return { success: true, documentType: classResult.documentType, confidence: classResult.confidenceScore };
      }),

    validate: erpPermissionProcedure("erp_ai_document_extraction", "create")
      .input(z.object({ id: z.number(), comments: z.string().optional() }))
      .mutation(async ({ ctx, input }) => {
        const db = (await getDb())!;
        const now = Date.now();

        const [job] = await db.select().from(erpAiDocumentJobs)
          .where(eq(erpAiDocumentJobs.id, input.id));
        if (!job) throw new Error("Job non trouvé");
        if (!job.confirmedDocumentType && !job.detectedDocumentType) {
          throw new Error("Impossible de valider sans type de document confirmé ou détecté");
        }

        const confirmedType = job.confirmedDocumentType || job.detectedDocumentType;

        await db.update(erpAiDocumentJobs)
          .set({
            jobStatus: "validated",
            confirmedDocumentType: confirmedType,
            validatedBy: ctx.user.id,
            validatedAt: now,
            reviewedBy: ctx.user.id,
            reviewedAt: now,
            updatedAt: now,
          })
          .where(eq(erpAiDocumentJobs.id, input.id));

        // Update classification status
        await db.update(erpAiDocumentClassifications)
          .set({ status: "validated", validatedBy: ctx.user.id, validatedAt: now, updatedAt: now })
          .where(eq(erpAiDocumentClassifications.documentJobId, input.id));

        await db.insert(erpAiDocumentValidationLogs).values({
          documentJobId: input.id,
          action: "Validate Job",
          newDocumentType: confirmedType,
          comments: input.comments || null,
          performedBy: ctx.user.id,
          performedAt: now,
          createdAt: now,
        });

        await createAuditLog(ctx.user.id, "document_job.validated", "ai_document_extraction", {
          jobId: input.id, confirmedType,
        });

        return { success: true };
      }),

    reject: erpPermissionProcedure("erp_ai_document_extraction", "create")
      .input(z.object({ id: z.number(), reason: z.string().min(1, "Le motif de rejet est obligatoire") }))
      .mutation(async ({ ctx, input }) => {
        const db = (await getDb())!;
        const now = Date.now();

        await db.update(erpAiDocumentJobs)
          .set({
            jobStatus: "rejected",
            rejectedBy: ctx.user.id,
            rejectedAt: now,
            rejectionReason: input.reason,
            reviewedBy: ctx.user.id,
            reviewedAt: now,
            updatedAt: now,
          })
          .where(eq(erpAiDocumentJobs.id, input.id));

        await db.update(erpAiDocumentClassifications)
          .set({ status: "rejected", updatedAt: now })
          .where(eq(erpAiDocumentClassifications.documentJobId, input.id));

        await db.insert(erpAiDocumentValidationLogs).values({
          documentJobId: input.id,
          action: "Reject Job",
          comments: input.reason,
          performedBy: ctx.user.id,
          performedAt: now,
          createdAt: now,
        });

        await createAuditLog(ctx.user.id, "document_job.rejected", "ai_document_extraction", {
          jobId: input.id, reason: input.reason,
        });

        return { success: true };
      }),

    cancel: erpPermissionProcedure("erp_ai_document_extraction", "create")
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const db = (await getDb())!;
        const now = Date.now();

        await db.update(erpAiDocumentJobs)
          .set({ jobStatus: "cancelled", updatedAt: now })
          .where(eq(erpAiDocumentJobs.id, input.id));

        await db.insert(erpAiDocumentValidationLogs).values({
          documentJobId: input.id,
          action: "Cancel Job",
          performedBy: ctx.user.id,
          performedAt: now,
          createdAt: now,
        });

        await createAuditLog(ctx.user.id, "document_job.cancelled", "ai_document_extraction", { jobId: input.id });

        return { success: true };
      }),

    stats: erpPermissionProcedure("erp_ai_document_extraction", "view")
      .query(async () => {
        const db = (await getDb())!;
        const [total] = await db.select({ total: count() }).from(erpAiDocumentJobs)
          .where(sql`${erpAiDocumentJobs.deletedAt} IS NULL`);
        const [pending] = await db.select({ total: count() }).from(erpAiDocumentJobs)
          .where(and(eq(erpAiDocumentJobs.jobStatus, "pending"), sql`${erpAiDocumentJobs.deletedAt} IS NULL`));
        const [needsReview] = await db.select({ total: count() }).from(erpAiDocumentJobs)
          .where(and(eq(erpAiDocumentJobs.jobStatus, "needs_review"), sql`${erpAiDocumentJobs.deletedAt} IS NULL`));
        const [validated] = await db.select({ total: count() }).from(erpAiDocumentJobs)
          .where(and(eq(erpAiDocumentJobs.jobStatus, "validated"), sql`${erpAiDocumentJobs.deletedAt} IS NULL`));
        const [failed] = await db.select({ total: count() }).from(erpAiDocumentJobs)
          .where(and(eq(erpAiDocumentJobs.jobStatus, "failed"), sql`${erpAiDocumentJobs.deletedAt} IS NULL`));

        return {
          total: total?.total || 0,
          pending: pending?.total || 0,
          needsReview: needsReview?.total || 0,
          validated: validated?.total || 0,
          failed: failed?.total || 0,
        };
      }),
  }),

  // ─── OCR ─────────────────────────────────────────────────────────────────────
  ocr: router({
    getResult: erpPermissionProcedure("erp_ai_document_extraction", "view")
      .input(z.object({ jobId: z.number() }))
      .query(async ({ input }) => {
        const db = (await getDb())!;
        const [result] = await db.select().from(erpAiOcrResults)
          .where(eq(erpAiOcrResults.documentJobId, input.jobId));
        return result || null;
      }),
  }),

  // ─── CLASSIFICATION ──────────────────────────────────────────────────────────
  classification: router({
    getResult: erpPermissionProcedure("erp_ai_document_extraction", "view")
      .input(z.object({ jobId: z.number() }))
      .query(async ({ input }) => {
        const db = (await getDb())!;
        const [result] = await db.select().from(erpAiDocumentClassifications)
          .where(eq(erpAiDocumentClassifications.documentJobId, input.jobId));
        return result || null;
      }),

    confirm: erpPermissionProcedure("erp_ai_document_extraction", "create")
      .input(z.object({ jobId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const db = (await getDb())!;
        const now = Date.now();

        const [classification] = await db.select().from(erpAiDocumentClassifications)
          .where(eq(erpAiDocumentClassifications.documentJobId, input.jobId));
        if (!classification) throw new Error("Classification non trouvée");

        await db.update(erpAiDocumentClassifications)
          .set({
            confirmedDocumentType: classification.detectedDocumentType,
            status: "validated",
            reviewedBy: ctx.user.id,
            reviewedAt: now,
            updatedAt: now,
          })
          .where(eq(erpAiDocumentClassifications.id, classification.id));

        await db.update(erpAiDocumentJobs)
          .set({
            confirmedDocumentType: classification.detectedDocumentType,
            classificationStatus: "validated",
            updatedAt: now,
          })
          .where(eq(erpAiDocumentJobs.id, input.jobId));

        await db.insert(erpAiDocumentValidationLogs).values({
          documentJobId: input.jobId,
          classificationId: classification.id,
          action: "Confirm Classification",
          newDocumentType: classification.detectedDocumentType,
          performedBy: ctx.user.id,
          performedAt: now,
          createdAt: now,
        });

        await createAuditLog(ctx.user.id, "classification.confirmed", "ai_document_extraction", {
          jobId: input.jobId, type: classification.detectedDocumentType,
        });

        return { success: true };
      }),

    correct: erpPermissionProcedure("erp_ai_document_extraction", "create")
      .input(z.object({
        jobId: z.number(),
        newDocumentType: z.string(),
        comments: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const db = (await getDb())!;
        const now = Date.now();

        const [classification] = await db.select().from(erpAiDocumentClassifications)
          .where(eq(erpAiDocumentClassifications.documentJobId, input.jobId));
        if (!classification) throw new Error("Classification non trouvée");

        const oldType = classification.detectedDocumentType;

        await db.update(erpAiDocumentClassifications)
          .set({
            confirmedDocumentType: input.newDocumentType,
            status: "corrected",
            correctedBy: ctx.user.id,
            correctedAt: now,
            updatedAt: now,
          })
          .where(eq(erpAiDocumentClassifications.id, classification.id));

        await db.update(erpAiDocumentJobs)
          .set({
            confirmedDocumentType: input.newDocumentType,
            classificationStatus: "corrected",
            updatedAt: now,
          })
          .where(eq(erpAiDocumentJobs.id, input.jobId));

        await db.insert(erpAiDocumentValidationLogs).values({
          documentJobId: input.jobId,
          classificationId: classification.id,
          action: "Correct Classification",
          oldDocumentType: oldType,
          newDocumentType: input.newDocumentType,
          comments: input.comments || null,
          performedBy: ctx.user.id,
          performedAt: now,
          createdAt: now,
        });

        await createAuditLog(ctx.user.id, "classification.corrected", "ai_document_extraction", {
          jobId: input.jobId, oldType, newType: input.newDocumentType,
        });

        return { success: true };
      }),
  }),

  // ─── VALIDATION LOGS ─────────────────────────────────────────────────────────
  validationLogs: router({
    list: erpPermissionProcedure("erp_ai_document_extraction", "view")
      .input(z.object({ jobId: z.number() }))
      .query(async ({ input }) => {
        const db = (await getDb())!;
        const rows = await db.select().from(erpAiDocumentValidationLogs)
          .where(eq(erpAiDocumentValidationLogs.documentJobId, input.jobId))
          .orderBy(desc(erpAiDocumentValidationLogs.performedAt));
        return rows;
      }),
  }),

  // ─── DOCUMENT TYPES LIST ─────────────────────────────────────────────────────
  documentTypes: protectedProcedure.query(() => {
    return Object.entries(DOCUMENT_TYPES).map(([type, info]) => ({
      type,
      module: info.module,
      category: info.category,
    }));
  }),

  // ─── UPLOAD & CREATE JOB ─────────────────────────────────────────────────────
  uploadAndCreate: erpPermissionProcedure("erp_ai_document_extraction", "create")
    .input(z.object({
      fileName: z.string(),
      fileType: z.string(),
      fileSize: z.number(),
      fileBase64: z.string(),
      sourceModule: z.string().optional(),
      documentId: z.number().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = (await getDb())!;
      const now = Date.now();

      // Validate
      const validation = validateFile(input.fileName, input.fileType, input.fileSize);
      if (!validation.valid) throw new Error(validation.error);

      // Upload to S3
      const buffer = Buffer.from(input.fileBase64, "base64");
      const suffix = Math.random().toString(36).substring(2, 8);
      const fileKey = `ai-doc-extraction/${ctx.user.id}/${now}-${suffix}-${input.fileName}`;
      const { url: fileUrl } = await storagePut(fileKey, buffer, input.fileType);

      // Create job
      const jobNumber = generateJobNumber();
      const [result] = await db.insert(erpAiDocumentJobs).values({
        jobNumber,
        documentId: input.documentId || null,
        sourceModule: input.sourceModule || null,
        fileName: input.fileName,
        fileType: input.fileType,
        fileSize: input.fileSize,
        fileUrl,
        jobStatus: "pending",
        ocrStatus: "pending",
        classificationStatus: "pending",
        createdBy: ctx.user.id,
        createdAt: now,
        updatedAt: now,
      });

      await createAuditLog(ctx.user.id, "document_job.created", "ai_document_extraction", {
        jobNumber, fileName: input.fileName,
      });

      return { id: result.insertId, jobNumber, fileUrl };
    }),
});
