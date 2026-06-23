import { z } from "zod";
import { eq, and, isNull, desc, sql, like } from "drizzle-orm";
import { router, erpPermissionProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { storagePut } from "../storage";
import { analyzePlan, askPlanAssistant } from "./erp-ai-plan-analyzer.service";
import { calculateMaterialTakeoff, seedDefaultCoefficients } from "./erp-ai-quantity-engine.service";
import { generatePlanAnalysisPdf } from "./erp-ai-plan-pdf.service";
import {
  erpAiPlanAnalyses,
  erpAiPlanElements,
  erpAiMaterialTakeoffs,
  erpAiEngineeringChecks,
  erpAiConstructionRules,
  erpAiQuantityCoefficients,
  erpAiPlanReviewComments,
  erpPurchaseRequests,
  erpPurchaseRequestLines,
  erpMaterialRequests,
  erpMaterialRequestLines,
  erpRfqs,
  erpRfqLines,
  erpBudgetLines,
  erpInventoryItems,
  users,
} from "../../drizzle/schema";

// ============================================================
// ERP AI PLAN ANALYZER ROUTER — Sprint IA Construction
// Analyse IA de plans, quantitatif matériaux, contrôles ingénierie
// ============================================================

const now = () => Date.now();

function generateAnalysisNumber(): string {
  const d = new Date();
  const y = d.getFullYear().toString().slice(-2);
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const rand = Math.floor(Math.random() * 9000 + 1000);
  return `AIP-${y}${m}-${rand}`;
}

// --- ANALYSES CRUD ---
const analysesCrudRouter = router({
  list: erpPermissionProcedure("erp_ai_plan_analyzer", "view")
    .input(z.object({
      projectId: z.number().optional(),
      status: z.string().optional(),
      search: z.string().optional(),
      limit: z.number().min(1).max(100).default(50),
      offset: z.number().min(0).default(0),
    }).optional())
    .query(async ({ input }) => {
      const db = (await getDb())!;
      const params = input || { limit: 50, offset: 0 };
      const conditions: any[] = [isNull(erpAiPlanAnalyses.deletedAt)];
      if (params.projectId) conditions.push(eq(erpAiPlanAnalyses.projectId, params.projectId));
      if (params.status) conditions.push(eq(erpAiPlanAnalyses.analysisStatus, params.status));
      if (params.search) conditions.push(like(erpAiPlanAnalyses.fileName, `%${params.search}%`));

      const items = await db.select().from(erpAiPlanAnalyses)
        .where(and(...conditions))
        .orderBy(desc(erpAiPlanAnalyses.createdAt))
        .limit(params.limit)
        .offset(params.offset);

      const [{ count }] = await db.select({ count: sql<number>`count(*)` })
        .from(erpAiPlanAnalyses)
        .where(and(...conditions));

      return { items, total: count };
    }),

  getById: erpPermissionProcedure("erp_ai_plan_analyzer", "view")
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = (await getDb())!;
      const [analysis] = await db.select().from(erpAiPlanAnalyses)
        .where(eq(erpAiPlanAnalyses.id, input.id));
      if (!analysis) throw new Error("Analyse introuvable");

      const elements = await db.select().from(erpAiPlanElements)
        .where(eq(erpAiPlanElements.planAnalysisId, input.id));
      const takeoffs = await db.select().from(erpAiMaterialTakeoffs)
        .where(eq(erpAiMaterialTakeoffs.planAnalysisId, input.id));
      const checks = await db.select().from(erpAiEngineeringChecks)
        .where(eq(erpAiEngineeringChecks.planAnalysisId, input.id));
      const comments = await db.select().from(erpAiPlanReviewComments)
        .where(eq(erpAiPlanReviewComments.planAnalysisId, input.id));

      // Get creator name
      let creatorName = "";
      if (analysis.createdBy) {
        const [creator] = await db.select({ name: users.name }).from(users).where(eq(users.id, analysis.createdBy));
        creatorName = creator?.name || "";
      }

      return { ...analysis, elements, takeoffs, checks, comments, creatorName };
    }),

  dashboard: erpPermissionProcedure("erp_ai_plan_analyzer", "view")
    .query(async () => {
      const db = (await getDb())!;
      const conditions = [isNull(erpAiPlanAnalyses.deletedAt)];

      const [{ total }] = await db.select({ total: sql<number>`count(*)` })
        .from(erpAiPlanAnalyses).where(and(...conditions));
      const [{ pending }] = await db.select({ pending: sql<number>`count(*)` })
        .from(erpAiPlanAnalyses).where(and(...conditions, eq(erpAiPlanAnalyses.analysisStatus, "pending")));
      const [{ completed }] = await db.select({ completed: sql<number>`count(*)` })
        .from(erpAiPlanAnalyses).where(and(...conditions, eq(erpAiPlanAnalyses.analysisStatus, "completed")));
      const [{ validated }] = await db.select({ validated: sql<number>`count(*)` })
        .from(erpAiPlanAnalyses).where(and(...conditions, eq(erpAiPlanAnalyses.analysisStatus, "validated")));
      const [{ failed }] = await db.select({ failed: sql<number>`count(*)` })
        .from(erpAiPlanAnalyses).where(and(...conditions, eq(erpAiPlanAnalyses.analysisStatus, "failed")));

      // Average confidence
      const [{ avgConfidence }] = await db.select({ avgConfidence: sql<number>`COALESCE(AVG(confidence_score), 0)` })
        .from(erpAiPlanAnalyses).where(and(...conditions, eq(erpAiPlanAnalyses.analysisStatus, "completed")));

      return { total, pending, completed, validated, failed, avgConfidence: Math.round(avgConfidence || 0) };
    }),
});

// --- UPLOAD & ANALYSE ---
const analysisActionsRouter = router({
  upload: erpPermissionProcedure("erp_ai_plan_analyzer", "create")
    .input(z.object({
      fileName: z.string(),
      fileBase64: z.string(),
      fileType: z.string(),
      projectId: z.number().optional(),
      planType: z.string().default("unknown"),
      scaleConfirmed: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = (await getDb())!;

      // Upload to S3
      const buffer = Buffer.from(input.fileBase64, "base64");
      const suffix = Math.random().toString(36).substring(2, 8);
      const fileKey = `ai-plans/${ctx.user.id}/${suffix}-${input.fileName}`;
      const mimeType = input.fileType === "pdf" ? "application/pdf" : `image/${input.fileType}`;
      const { url } = await storagePut(fileKey, buffer, mimeType);

      // Create analysis record
      const analysisNumber = generateAnalysisNumber();
      const [result] = await db.insert(erpAiPlanAnalyses).values({
        analysisNumber,
        projectId: input.projectId || null,
        documentId: null,
        fileName: input.fileName,
        fileUrl: url,
        fileKey,
        fileType: input.fileType,
        planType: input.planType,
        scaleDetected: null,
        scaleConfirmed: input.scaleConfirmed || null,
        floorLevel: null,
        hypotheses: null,
        analysisStatus: "pending",
        confidenceScore: null,
        aiRawResponse: null,
        createdBy: ctx.user.id,
        reviewedBy: null,
        reviewedAt: null,
        validatedBy: null,
        validatedAt: null,
        createdAt: now(),
        updatedAt: now(),
        deletedAt: null,
      });

      return { id: result.insertId, analysisNumber, fileUrl: url };
    }),

  startAnalysis: erpPermissionProcedure("erp_ai_plan_analyzer", "create")
    .input(z.object({
      analysisId: z.number(),
      scaleConfirmed: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = (await getDb())!;
      const [analysis] = await db.select().from(erpAiPlanAnalyses)
        .where(eq(erpAiPlanAnalyses.id, input.analysisId));
      if (!analysis) throw new Error("Analyse introuvable");
      if (analysis.analysisStatus === "analyzing") throw new Error("Analyse déjà en cours");

      // Update scale if provided
      if (input.scaleConfirmed) {
        await db.update(erpAiPlanAnalyses)
          .set({ scaleConfirmed: input.scaleConfirmed, updatedAt: now() })
          .where(eq(erpAiPlanAnalyses.id, input.analysisId));
      }

      // Launch analysis
      const result = await analyzePlan({
        analysisId: input.analysisId,
        fileUrl: analysis.fileUrl,
        fileType: analysis.fileType,
        planType: analysis.planType,
        scaleConfirmed: input.scaleConfirmed || analysis.scaleConfirmed || undefined,
      });

      return result;
    }),

  calculateTakeoff: erpPermissionProcedure("erp_ai_plan_analyzer", "create")
    .input(z.object({ analysisId: z.number() }))
    .mutation(async ({ input }) => {
      const db = (await getDb())!;
      const [analysis] = await db.select().from(erpAiPlanAnalyses)
        .where(eq(erpAiPlanAnalyses.id, input.analysisId));
      if (!analysis) throw new Error("Analyse introuvable");
      if (analysis.analysisStatus !== "completed" && analysis.analysisStatus !== "reviewed" && analysis.analysisStatus !== "validated") {
        throw new Error("L'analyse doit être terminée avant de calculer le quantitatif");
      }

      const result = await calculateMaterialTakeoff(input.analysisId, analysis.projectId || undefined);
      return result;
    }),

  validate: erpPermissionProcedure("erp_ai_plan_analyzer", "update")
    .input(z.object({
      analysisId: z.number(),
      action: z.enum(["review", "validate", "reject"]),
      comment: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = (await getDb())!;
      const [analysis] = await db.select().from(erpAiPlanAnalyses)
        .where(eq(erpAiPlanAnalyses.id, input.analysisId));
      if (!analysis) throw new Error("Analyse introuvable");

      const updates: any = { updatedAt: now() };

      if (input.action === "review") {
        updates.analysisStatus = "reviewed";
        updates.reviewedBy = ctx.user.id;
        updates.reviewedAt = now();
      } else if (input.action === "validate") {
        updates.analysisStatus = "validated";
        updates.validatedBy = ctx.user.id;
        updates.validatedAt = now();
      } else if (input.action === "reject") {
        updates.analysisStatus = "rejected";
        updates.reviewedBy = ctx.user.id;
        updates.reviewedAt = now();
      }

      await db.update(erpAiPlanAnalyses).set(updates).where(eq(erpAiPlanAnalyses.id, input.analysisId));

      // Add comment if provided
      if (input.comment) {
        await db.insert(erpAiPlanReviewComments).values({
          planAnalysisId: input.analysisId,
          elementId: null,
          comment: input.comment,
          commentType: input.action === "validate" ? "validation" : input.action === "reject" ? "warning" : "engineer_note",
          createdBy: ctx.user.id,
          createdAt: now(),
          updatedAt: now(),
        });
      }

      return { success: true, status: updates.analysisStatus };
    }),

  delete: erpPermissionProcedure("erp_ai_plan_analyzer", "delete")
    .input(z.object({ analysisId: z.number() }))
    .mutation(async ({ input }) => {
      const db = (await getDb())!;
      await db.update(erpAiPlanAnalyses)
        .set({ deletedAt: now(), updatedAt: now() })
        .where(eq(erpAiPlanAnalyses.id, input.analysisId));
      return { success: true };
    }),
});

// --- ELEMENTS ---
const elementsRouter = router({
  list: erpPermissionProcedure("erp_ai_plan_analyzer", "view")
    .input(z.object({ analysisId: z.number(), elementType: z.string().optional() }))
    .query(async ({ input }) => {
      const db = (await getDb())!;
      const conditions: any[] = [eq(erpAiPlanElements.planAnalysisId, input.analysisId)];
      if (input.elementType) conditions.push(eq(erpAiPlanElements.elementType, input.elementType));
      return db.select().from(erpAiPlanElements).where(and(...conditions));
    }),

  update: erpPermissionProcedure("erp_ai_plan_analyzer", "update")
    .input(z.object({
      elementId: z.number(),
      elementLabel: z.string().optional(),
      length: z.string().optional(),
      width: z.string().optional(),
      height: z.string().optional(),
      area: z.string().optional(),
      volume: z.string().optional(),
      status: z.enum(["suggested", "reviewed", "corrected", "validated", "rejected"]).optional(),
    }))
    .mutation(async ({ input }) => {
      const db = (await getDb())!;
      const { elementId, ...updates } = input;
      await db.update(erpAiPlanElements)
        .set({ ...updates, updatedAt: now() })
        .where(eq(erpAiPlanElements.id, elementId));
      return { success: true };
    }),
});

// --- TAKEOFFS ---
const takeoffsRouter = router({
  list: erpPermissionProcedure("erp_ai_plan_analyzer", "view")
    .input(z.object({ analysisId: z.number(), category: z.string().optional() }))
    .query(async ({ input }) => {
      const db = (await getDb())!;
      const conditions: any[] = [eq(erpAiMaterialTakeoffs.planAnalysisId, input.analysisId)];
      if (input.category) conditions.push(eq(erpAiMaterialTakeoffs.category, input.category));
      return db.select().from(erpAiMaterialTakeoffs).where(and(...conditions));
    }),

  update: erpPermissionProcedure("erp_ai_plan_analyzer", "update")
    .input(z.object({
      takeoffId: z.number(),
      calculatedQuantity: z.string().optional(),
      wasteRate: z.string().optional(),
      recommendedQuantity: z.string().optional(),
      purchaseQuantity: z.string().optional(),
      unitPrice: z.number().optional(),
      status: z.enum(["draft", "suggested", "reviewed", "corrected", "validated", "rejected", "exported"]).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = (await getDb())!;
      const { takeoffId, ...updates } = input;
      const setData: any = { ...updates, updatedAt: now() };
      if (updates.status === "reviewed") setData.reviewedBy = ctx.user.id;
      if (updates.status === "validated") setData.validatedBy = ctx.user.id;
      // Recalculate estimated cost if unitPrice changed
      if (updates.unitPrice && updates.recommendedQuantity) {
        setData.estimatedCost = Math.round(updates.unitPrice * Number(updates.recommendedQuantity));
      }
      await db.update(erpAiMaterialTakeoffs).set(setData).where(eq(erpAiMaterialTakeoffs.id, takeoffId));
      return { success: true };
    }),

  checkStock: erpPermissionProcedure("erp_ai_plan_analyzer", "view")
    .input(z.object({ analysisId: z.number() }))
    .query(async ({ input }) => {
      const db = (await getDb())!;
      const takeoffs = await db.select().from(erpAiMaterialTakeoffs)
        .where(eq(erpAiMaterialTakeoffs.planAnalysisId, input.analysisId));

      // Check available stock for each material
      const stockCheck = [];
      for (const t of takeoffs) {
        const [item] = await db.select().from(erpInventoryItems)
          .where(like(erpInventoryItems.name, `%${t.materialName.split(" ")[0]}%`));
        stockCheck.push({
          takeoffId: t.id,
          materialName: t.materialName,
          requiredQuantity: Number(t.recommendedQuantity),
          unit: t.unit,
          availableStock: item ? Number(item.currentStock) : 0,
          stockUnit: item?.unit || t.unit,
          deficit: item ? Math.max(0, Number(t.recommendedQuantity) - Number(item.currentStock)) : Number(t.recommendedQuantity),
          inStock: item ? Number(item.currentStock) >= Number(t.recommendedQuantity) : false,
        });
      }
      return stockCheck;
    }),
});

// --- ENGINEERING CHECKS ---
const checksRouter = router({
  list: erpPermissionProcedure("erp_ai_plan_analyzer", "view")
    .input(z.object({ analysisId: z.number(), severity: z.string().optional() }))
    .query(async ({ input }) => {
      const db = (await getDb())!;
      const conditions: any[] = [eq(erpAiEngineeringChecks.planAnalysisId, input.analysisId)];
      if (input.severity) conditions.push(eq(erpAiEngineeringChecks.severity, input.severity));
      return db.select().from(erpAiEngineeringChecks).where(and(...conditions));
    }),

  update: erpPermissionProcedure("erp_ai_plan_analyzer", "update")
    .input(z.object({
      checkId: z.number(),
      status: z.enum(["passed", "warning", "failed", "needs_review", "ignored", "corrected"]).optional(),
      recommendation: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = (await getDb())!;
      const { checkId, ...updates } = input;
      await db.update(erpAiEngineeringChecks)
        .set({ ...updates, reviewedBy: ctx.user.id, reviewedAt: now(), updatedAt: now() })
        .where(eq(erpAiEngineeringChecks.id, checkId));
      return { success: true };
    }),
});

// --- COMMENTS ---
const commentsRouter = router({
  list: erpPermissionProcedure("erp_ai_plan_analyzer", "view")
    .input(z.object({ analysisId: z.number() }))
    .query(async ({ input }) => {
      const db = (await getDb())!;
      const items = await db.select().from(erpAiPlanReviewComments)
        .where(eq(erpAiPlanReviewComments.planAnalysisId, input.analysisId))
        .orderBy(desc(erpAiPlanReviewComments.createdAt));
      return items;
    }),

  create: erpPermissionProcedure("erp_ai_plan_analyzer", "create")
    .input(z.object({
      analysisId: z.number(),
      elementId: z.number().optional(),
      comment: z.string().min(1),
      commentType: z.enum(["correction", "validation", "warning", "engineer_note", "architect_note", "quantity_note", "note"]).default("note"),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = (await getDb())!;
      const [result] = await db.insert(erpAiPlanReviewComments).values({
        planAnalysisId: input.analysisId,
        elementId: input.elementId || null,
        comment: input.comment,
        commentType: input.commentType,
        createdBy: ctx.user.id,
        createdAt: now(),
        updatedAt: now(),
      });
      return { id: result.insertId };
    }),
});

// --- RULES ---
const rulesRouter = router({
  list: erpPermissionProcedure("erp_ai_plan_analyzer", "view")
    .input(z.object({ domain: z.string().optional(), isActive: z.boolean().optional() }).optional())
    .query(async ({ input }) => {
      const db = (await getDb())!;
      const conditions: any[] = [];
      if (input?.domain) conditions.push(eq(erpAiConstructionRules.domain, input.domain));
      if (input?.isActive !== undefined) conditions.push(eq(erpAiConstructionRules.isActive, input.isActive));
      const where = conditions.length > 0 ? and(...conditions) : undefined;
      return db.select().from(erpAiConstructionRules).where(where).orderBy(erpAiConstructionRules.domain);
    }),

  create: erpPermissionProcedure("erp_ai_plan_analyzer", "create")
    .input(z.object({
      ruleCode: z.string().min(1),
      ruleName: z.string().min(1),
      domain: z.string(),
      description: z.string().optional(),
      ruleType: z.enum(["check", "warning", "calculation", "constraint"]).default("check"),
      parametersJson: z.string().optional(),
      sourceReference: z.string().optional(),
      requiresValidation: z.boolean().default(true),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = (await getDb())!;
      const [result] = await db.insert(erpAiConstructionRules).values({
        ...input,
        parametersJson: input.parametersJson || null,
        sourceReference: input.sourceReference || null,
        description: input.description || null,
        isActive: true,
        createdBy: ctx.user.id,
        createdAt: now(),
        updatedAt: now(),
      });
      return { id: result.insertId };
    }),

  update: erpPermissionProcedure("erp_ai_plan_analyzer", "update")
    .input(z.object({
      id: z.number(),
      ruleName: z.string().optional(),
      description: z.string().optional(),
      parametersJson: z.string().optional(),
      sourceReference: z.string().optional(),
      isActive: z.boolean().optional(),
      requiresValidation: z.boolean().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = (await getDb())!;
      const { id, ...updates } = input;
      await db.update(erpAiConstructionRules).set({ ...updates, updatedAt: now() }).where(eq(erpAiConstructionRules.id, id));
      return { success: true };
    }),

  delete: erpPermissionProcedure("erp_ai_plan_analyzer", "delete")
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = (await getDb())!;
      await db.delete(erpAiConstructionRules).where(eq(erpAiConstructionRules.id, input.id));
      return { success: true };
    }),
});

// --- COEFFICIENTS ---
const coefficientsRouter = router({
  list: erpPermissionProcedure("erp_ai_plan_analyzer", "view")
    .input(z.object({ domain: z.string().optional(), isActive: z.boolean().optional() }).optional())
    .query(async ({ input }) => {
      const db = (await getDb())!;
      const conditions: any[] = [];
      if (input?.domain) conditions.push(eq(erpAiQuantityCoefficients.usageDomain, input.domain));
      if (input?.isActive !== undefined) conditions.push(eq(erpAiQuantityCoefficients.isActive, input.isActive));
      const where = conditions.length > 0 ? and(...conditions) : undefined;
      return db.select().from(erpAiQuantityCoefficients).where(where).orderBy(erpAiQuantityCoefficients.usageDomain);
    }),

  update: erpPermissionProcedure("erp_ai_plan_analyzer", "update")
    .input(z.object({
      id: z.number(),
      name: z.string().optional(),
      coefficientValue: z.string().optional(),
      wasteRateDefault: z.string().optional(),
      description: z.string().optional(),
      isActive: z.boolean().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = (await getDb())!;
      const { id, ...updates } = input;
      await db.update(erpAiQuantityCoefficients).set({ ...updates, updatedAt: now() }).where(eq(erpAiQuantityCoefficients.id, id));
      return { success: true };
    }),

  seed: erpPermissionProcedure("erp_ai_plan_analyzer", "create")
    .mutation(async () => {
      const count = await seedDefaultCoefficients();
      return { seeded: count };
    }),
});

// --- EXPORTS ---
const exportsRouter = router({
  generatePdf: erpPermissionProcedure("erp_ai_plan_analyzer", "export")
    .input(z.object({ analysisId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const result = await generatePlanAnalysisPdf({
        analysisId: input.analysisId,
        generatedBy: ctx.user.id,
        generatedByName: ctx.user.name || "Utilisateur",
      });
      return result;
    }),

  exportExcelBoq: erpPermissionProcedure("erp_ai_plan_analyzer", "export")
    .input(z.object({ analysisId: z.number() }))
    .mutation(async ({ input }) => {
      const db = (await getDb())!;
      const takeoffs = await db.select().from(erpAiMaterialTakeoffs)
        .where(eq(erpAiMaterialTakeoffs.planAnalysisId, input.analysisId));

      // Generate CSV (Excel-compatible)
      const headers = "Matériau;Catégorie;Unité;Qté Calculée;Taux Perte;Qté Recommandée;Unité Achat;Qté Achat;Prix Unit.;Coût Estimé;Méthode\n";
      const rows = takeoffs.map((t) =>
        `${t.materialName};${t.category};${t.unit};${t.calculatedQuantity};${t.wasteRate}%;${t.recommendedQuantity};${t.purchaseUnit || ""};${t.purchaseQuantity || ""};${t.unitPrice || ""};${t.estimatedCost || ""};${t.calculationMethod || ""}`
      ).join("\n");

      const csv = "\uFEFF" + headers + rows; // BOM for Excel
      const suffix = Math.random().toString(36).substring(2, 8);
      const fileKey = `ai-plan-exports/boq-${input.analysisId}-${suffix}.csv`;
      const { url } = await storagePut(fileKey, csv, "text/csv;charset=utf-8");
      return { fileUrl: url, fileName: `boq-${input.analysisId}.csv` };
    }),
});

// --- CONVERSIONS ERP ---
const convertRouter = router({
  toBudget: erpPermissionProcedure("erp_ai_plan_analyzer", "export")
    .input(z.object({
      analysisId: z.number(),
      budgetId: z.number(),
      budgetCategory: z.string().default("CAPEX"),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = (await getDb())!;
      const takeoffs = await db.select().from(erpAiMaterialTakeoffs)
        .where(and(eq(erpAiMaterialTakeoffs.planAnalysisId, input.analysisId), eq(erpAiMaterialTakeoffs.status, "validated")));

      if (takeoffs.length === 0) throw new Error("Aucun matériau validé à convertir. Validez d'abord le quantitatif.");

      let linesCreated = 0;
      for (const t of takeoffs) {
        if (t.estimatedCost && t.estimatedCost > 0) {
          await db.insert(erpBudgetLines).values({
            budgetId: input.budgetId,
            category: "materials",
            description: `[IA] ${t.materialName} — ${t.recommendedQuantity} ${t.unit} (${t.calculationMethod || ""})`,
            initialAmount: t.estimatedCost,
            revisedAmount: t.estimatedCost,
            engagedAmount: 0,
            paidAmount: 0,
            createdAt: now(),
            updatedAt: now(),
          });
          linesCreated++;
        }
      }

      return { linesCreated, budgetId: input.budgetId };
    }),

  toMaterialRequest: erpPermissionProcedure("erp_ai_plan_analyzer", "export")
    .input(z.object({
      analysisId: z.number(),
      projectId: z.number(),
      title: z.string().optional(),
      priority: z.enum(["low", "medium", "high", "urgent"]).default("medium"),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = (await getDb())!;
      const [analysis] = await db.select().from(erpAiPlanAnalyses)
        .where(eq(erpAiPlanAnalyses.id, input.analysisId));
      if (!analysis) throw new Error("Analyse introuvable");

      const takeoffs = await db.select().from(erpAiMaterialTakeoffs)
        .where(eq(erpAiMaterialTakeoffs.planAnalysisId, input.analysisId));

      if (takeoffs.length === 0) throw new Error("Aucun matériau calculé");

      const requestNumber = `DM-AI-${Date.now().toString(36).toUpperCase()}`;
      const title = input.title || `Demande matériel — Plan ${analysis.analysisNumber}`;

      const [mrResult] = await db.insert(erpMaterialRequests).values({
        requestNumber,
        title,
        projectId: input.projectId,
        requestedBy: ctx.user.id,
        priority: input.priority,
        status: "draft",
        description: `Généré automatiquement depuis l'analyse IA ${analysis.analysisNumber}`,
        createdAt: now(),
        updatedAt: now(),
      });

      // Material request lines use itemId (inventory item reference)
      // We create lines with a placeholder itemId=0 since these are new materials from AI
      for (const t of takeoffs) {
        await db.insert(erpMaterialRequestLines).values({
          requestId: mrResult.insertId,
          itemId: 0, // Placeholder — to be linked to inventory item
          quantityRequested: Math.ceil(Number(t.recommendedQuantity)),
          notes: `${t.materialName} — ${t.calculationMethod || ""}`,
          createdAt: now(),
        });
      }

      return { materialRequestId: mrResult.insertId, requestNumber };
    }),

  toRfq: erpPermissionProcedure("erp_ai_plan_analyzer", "export")
    .input(z.object({
      analysisId: z.number(),
      projectId: z.number().optional(),
      title: z.string().optional(),
      responseDeadline: z.number().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = (await getDb())!;
      const [analysis] = await db.select().from(erpAiPlanAnalyses)
        .where(eq(erpAiPlanAnalyses.id, input.analysisId));
      if (!analysis) throw new Error("Analyse introuvable");

      const takeoffs = await db.select().from(erpAiMaterialTakeoffs)
        .where(eq(erpAiMaterialTakeoffs.planAnalysisId, input.analysisId));

      if (takeoffs.length === 0) throw new Error("Aucun matériau calculé");

      const rfqNumber = `RFQ-AI-${Date.now().toString(36).toUpperCase()}`;
      const title = input.title || `Appel d'offres — Plan ${analysis.analysisNumber}`;

      const [rfqResult] = await db.insert(erpRfqs).values({
        rfqNumber,
        title,
        description: `Appel d'offres généré depuis l'analyse IA ${analysis.analysisNumber}`,
        purchaseRequestId: null,
        projectId: input.projectId || analysis.projectId || null,
        issueDate: now(),
        responseDeadline: input.responseDeadline || now() + 14 * 24 * 60 * 60 * 1000, // 14 days
        selectionMethod: "lowest_price",
        status: "draft",
        createdBy: ctx.user.id,
        createdAt: now(),
        updatedAt: now(),
      });

      for (const t of takeoffs) {
        await db.insert(erpRfqLines).values({
          rfqId: rfqResult.insertId,
          itemType: "material",
          description: `${t.materialName} — ${t.category} | ${t.calculationMethod || ""}`,
          quantity: Math.ceil(Number(t.recommendedQuantity) * 100), // stored as *100
          unit: t.unit,
          createdAt: now(),
          updatedAt: now(),
        });
      }

      return { rfqId: rfqResult.insertId, rfqNumber };
    }),
});

// --- ASSISTANT IA ---
const assistantRouter = router({
  ask: erpPermissionProcedure("erp_ai_plan_analyzer", "view")
    .input(z.object({
      analysisId: z.number(),
      question: z.string().min(1),
      conversationHistory: z.array(z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string(),
      })).default([]),
    }))
    .mutation(async ({ input }) => {
      const answer = await askPlanAssistant(
        input.analysisId,
        input.question,
        input.conversationHistory
      );
      return { answer };
    }),
});

// ============================================================
// MAIN AI PLAN ANALYZER ROUTER
// ============================================================
export const erpAiPlanAnalyzerRouter = router({
  analyses: analysesCrudRouter,
  actions: analysisActionsRouter,
  elements: elementsRouter,
  takeoffs: takeoffsRouter,
  checks: checksRouter,
  comments: commentsRouter,
  rules: rulesRouter,
  coefficients: coefficientsRouter,
  exports: exportsRouter,
  convert: convertRouter,
  assistant: assistantRouter,
});
