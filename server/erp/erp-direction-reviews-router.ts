import { z } from "zod";
import { router } from "../_core/trpc";
import { erpPermissionProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { createAuditEvent } from "../db";
import {
  erpDirectionReviews,
  erpDirectionReviewComments,
} from "../../drizzle/schema";
import { eq, desc, and, isNull } from "drizzle-orm";
import { notifyOwner } from "../_core/notification";

// ─── Routeur Revues Mensuelles Direction ─────────────────────────────────────
export const erpDirectionReviewsRouter = router({
  // List reviews
  list: erpPermissionProcedure("erp_direction_dashboard", "view")
    .input(z.object({
      status: z.string().optional(),
      limit: z.number().min(1).max(100).default(50),
    }).optional())
    .query(async ({ input }) => {
      const db = (await getDb())!;
      const conditions = [isNull(erpDirectionReviews.deletedAt)];
      if (input?.status) conditions.push(eq(erpDirectionReviews.status, input.status));
      const rows = await db
        .select()
        .from(erpDirectionReviews)
        .where(and(...conditions))
        .orderBy(desc(erpDirectionReviews.createdAt))
        .limit(input?.limit ?? 50);
      return rows;
    }),

  // Get by id
  getById: erpPermissionProcedure("erp_direction_dashboard", "view")
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = (await getDb())!;
      const [row] = await db
        .select()
        .from(erpDirectionReviews)
        .where(and(eq(erpDirectionReviews.id, input.id), isNull(erpDirectionReviews.deletedAt)));
      return row ?? null;
    }),

  // Create review
  create: erpPermissionProcedure("erp_direction_dashboard", "create")
    .input(z.object({
      title: z.string().min(1).max(255),
      periodId: z.number().optional(),
      reviewDate: z.number().optional(),
      summary: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = (await getDb())!;
      const now = Date.now();
      const reviewNumber = `REV-${new Date().getFullYear()}-${String(now).slice(-6)}`;
      const [result] = await db.insert(erpDirectionReviews).values({
        reviewNumber,
        title: input.title,
        periodId: input.periodId ?? null,
        reviewDate: input.reviewDate ?? now,
        status: "draft",
        summary: input.summary ?? null,
        createdBy: ctx.user.id,
        createdAt: now,
        updatedAt: now,
      });
      await createAuditEvent({
        actorId: ctx.user.id,
        action: "direction.review.created",
        targetType: "direction_review",
        targetId: Number(result.insertId),
        details: { title: input.title, reviewNumber },
      });
      await notifyOwner({ title: "Revue Direction créée", content: `Revue "${input.title}" (${reviewNumber}) créée.` });
      return { id: result.insertId, reviewNumber };
    }),

  // Update review
  update: erpPermissionProcedure("erp_direction_dashboard", "update")
    .input(z.object({
      id: z.number(),
      title: z.string().optional(),
      summary: z.string().optional(),
      keyRisks: z.string().optional(),
      keyDecisions: z.string().optional(),
      reviewDate: z.number().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = (await getDb())!;
      const now = Date.now();
      const updates: Record<string, unknown> = { updatedAt: now };
      if (input.title !== undefined) updates.title = input.title;
      if (input.summary !== undefined) updates.summary = input.summary;
      if (input.keyRisks !== undefined) updates.keyRisks = input.keyRisks;
      if (input.keyDecisions !== undefined) updates.keyDecisions = input.keyDecisions;
      if (input.reviewDate !== undefined) updates.reviewDate = input.reviewDate;
      await db.update(erpDirectionReviews).set(updates).where(eq(erpDirectionReviews.id, input.id));
      await createAuditEvent({
        actorId: ctx.user.id,
        action: "direction.review.updated",
        targetType: "direction_review",
        targetId: input.id,
        details: updates,
      });
      return { success: true };
    }),

  // Submit for review
  submit: erpPermissionProcedure("erp_direction_dashboard", "update")
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = (await getDb())!;
      const now = Date.now();
      const [review] = await db.select().from(erpDirectionReviews).where(eq(erpDirectionReviews.id, input.id));
      if (!review) throw new Error("Revue introuvable");
      if (review.status !== "draft") throw new Error("Seule une revue en brouillon peut être soumise");
      await db.update(erpDirectionReviews).set({ status: "in_review", updatedAt: now }).where(eq(erpDirectionReviews.id, input.id));
      await createAuditEvent({
        actorId: ctx.user.id,
        action: "direction.review.submitted",
        targetType: "direction_review",
        targetId: input.id,
        details: { previousStatus: "draft", newStatus: "in_review" },
      });
      await notifyOwner({ title: "Revue Direction soumise", content: `Revue "${review.title}" soumise pour approbation.` });
      return { success: true };
    }),

  // Approve review
  approve: erpPermissionProcedure("erp_direction_dashboard", "recalculate")
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = (await getDb())!;
      const now = Date.now();
      const [review] = await db.select().from(erpDirectionReviews).where(eq(erpDirectionReviews.id, input.id));
      if (!review) throw new Error("Revue introuvable");
      if (review.status !== "in_review") throw new Error("Seule une revue en révision peut être approuvée");
      await db.update(erpDirectionReviews).set({
        status: "approved",
        approvedBy: ctx.user.id,
        approvedAt: now,
        updatedAt: now,
      }).where(eq(erpDirectionReviews.id, input.id));
      await createAuditEvent({
        actorId: ctx.user.id,
        action: "direction.review.approved",
        targetType: "direction_review",
        targetId: input.id,
        details: {},
      });
      await notifyOwner({ title: "Revue Direction approuvée", content: `Revue "${review.title}" approuvée.` });
      return { success: true };
    }),

  // Close review
  close: erpPermissionProcedure("erp_direction_dashboard", "recalculate")
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = (await getDb())!;
      const now = Date.now();
      const [review] = await db.select().from(erpDirectionReviews).where(eq(erpDirectionReviews.id, input.id));
      if (!review) throw new Error("Revue introuvable");
      if (review.status !== "approved") throw new Error("Seule une revue approuvée peut être clôturée");
      await db.update(erpDirectionReviews).set({
        status: "closed",
        closedBy: ctx.user.id,
        closedAt: now,
        updatedAt: now,
      }).where(eq(erpDirectionReviews.id, input.id));
      await createAuditEvent({
        actorId: ctx.user.id,
        action: "direction.review.closed",
        targetType: "direction_review",
        targetId: input.id,
        details: {},
      });
      await notifyOwner({ title: "Revue Direction clôturée", content: `Revue "${review.title}" clôturée.` });
      return { success: true };
    }),

  // Add comment
  addComment: erpPermissionProcedure("erp_direction_dashboard", "update")
    .input(z.object({
      reviewId: z.number(),
      section: z.string().optional(),
      kpiKey: z.string().optional(),
      comment: z.string().min(1),
      commentType: z.enum(["observation", "risk", "decision", "recommendation", "justification"]).default("observation"),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = (await getDb())!;
      const now = Date.now();
      const [result] = await db.insert(erpDirectionReviewComments).values({
        reviewId: input.reviewId,
        section: input.section ?? null,
        kpiKey: input.kpiKey ?? null,
        comment: input.comment,
        commentType: input.commentType,
        createdBy: ctx.user.id,
        createdAt: now,
        updatedAt: now,
      });
      await createAuditEvent({
        actorId: ctx.user.id,
        action: "direction.review.comment_added",
        targetType: "direction_review_comment",
        targetId: Number(result.insertId),
        details: { reviewId: input.reviewId, commentType: input.commentType },
      });
      return { id: result.insertId };
    }),

  // List comments for a review
  listComments: erpPermissionProcedure("erp_direction_dashboard", "view")
    .input(z.object({ reviewId: z.number() }))
    .query(async ({ input }) => {
      const db = (await getDb())!;
      const rows = await db
        .select()
        .from(erpDirectionReviewComments)
        .where(eq(erpDirectionReviewComments.reviewId, input.reviewId))
        .orderBy(desc(erpDirectionReviewComments.createdAt));
      return rows;
    }),
});
