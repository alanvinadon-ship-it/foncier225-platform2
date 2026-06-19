import { z } from "zod";
import { eq, and, desc, sql, count } from "drizzle-orm";
import { router, erpPermissionProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { createAuditEvent } from "../db";
import { erpPerformanceRatings, erpVendors, erpContractors } from "../../drizzle/schema";

// ============================================================
// CONSTANTS
// ============================================================

const RATEABLE_TYPES = ["vendor", "contractor"] as const;

const SCORE_SCHEMA = z.number().int().min(1).max(5);

// ============================================================
// PERFORMANCE RATINGS ROUTER
// ============================================================

export const erpRatingsRouter = router({
  // ---- LIST ----
  list: erpPermissionProcedure("erp_vendors", "view")
    .input(z.object({
      rateableType: z.enum(RATEABLE_TYPES).optional(),
      rateableId: z.number().optional(),
      projectId: z.number().optional(),
      limit: z.number().min(1).max(100).default(50),
      offset: z.number().min(0).default(0),
    }))
    .query(async ({ input }) => {
      const db = (await getDb())!;
      const conditions: any[] = [];

      if (input.rateableType) conditions.push(eq(erpPerformanceRatings.rateableType, input.rateableType));
      if (input.rateableId) conditions.push(eq(erpPerformanceRatings.rateableId, input.rateableId));
      if (input.projectId) conditions.push(eq(erpPerformanceRatings.projectId, input.projectId));

      const where = conditions.length > 0 ? and(...conditions) : undefined;

      const [items, totalResult] = await Promise.all([
        db.select().from(erpPerformanceRatings)
          .where(where)
          .orderBy(desc(erpPerformanceRatings.createdAt))
          .limit(input.limit)
          .offset(input.offset),
        db.select({ count: count() }).from(erpPerformanceRatings).where(where),
      ]);

      return { items, total: totalResult[0]?.count || 0 };
    }),

  // ---- CREATE ----
  create: erpPermissionProcedure("erp_vendors", "rate")
    .input(z.object({
      rateableType: z.enum(RATEABLE_TYPES),
      rateableId: z.number(),
      projectId: z.number().optional(),
      qualityScore: SCORE_SCHEMA,
      delayScore: SCORE_SCHEMA,
      costScore: SCORE_SCHEMA,
      safetyScore: SCORE_SCHEMA,
      complianceScore: SCORE_SCHEMA,
      communicationScore: SCORE_SCHEMA,
      comment: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = (await getDb())!;
      const now = Date.now();

      // Calculate overall score (average * 100 for precision)
      const overallScore = Math.round(
        ((input.qualityScore + input.delayScore + input.costScore + input.safetyScore + input.complianceScore + input.communicationScore) / 6) * 100
      );

      const [result] = await db.insert(erpPerformanceRatings).values({
        rateableType: input.rateableType,
        rateableId: input.rateableId,
        projectId: input.projectId || null,
        qualityScore: input.qualityScore,
        delayScore: input.delayScore,
        costScore: input.costScore,
        safetyScore: input.safetyScore,
        complianceScore: input.complianceScore,
        communicationScore: input.communicationScore,
        overallScore,
        comment: input.comment || null,
        ratedBy: ctx.user.id,
        createdAt: now,
        updatedAt: now,
      });

      // Update the entity's average rating (1-5)
      await updateEntityRating(db, input.rateableType, input.rateableId);

      await createAuditEvent({
        actorId: ctx.user.id,
        action: "erp.ratings.created",
        targetType: "erp_performance_rating",
        targetId: result.insertId,
        details: { rateableType: input.rateableType, rateableId: input.rateableId, overallScore },
      });

      return { id: result.insertId, overallScore };
    }),

  // ---- UPDATE ----
  update: erpPermissionProcedure("erp_vendors", "rate")
    .input(z.object({
      id: z.number(),
      qualityScore: SCORE_SCHEMA.optional(),
      delayScore: SCORE_SCHEMA.optional(),
      costScore: SCORE_SCHEMA.optional(),
      safetyScore: SCORE_SCHEMA.optional(),
      complianceScore: SCORE_SCHEMA.optional(),
      communicationScore: SCORE_SCHEMA.optional(),
      comment: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = (await getDb())!;
      const [existing] = await db.select().from(erpPerformanceRatings).where(eq(erpPerformanceRatings.id, input.id));
      if (!existing) throw new Error("Rating introuvable");

      const updates: any = { updatedAt: Date.now() };
      if (input.qualityScore !== undefined) updates.qualityScore = input.qualityScore;
      if (input.delayScore !== undefined) updates.delayScore = input.delayScore;
      if (input.costScore !== undefined) updates.costScore = input.costScore;
      if (input.safetyScore !== undefined) updates.safetyScore = input.safetyScore;
      if (input.complianceScore !== undefined) updates.complianceScore = input.complianceScore;
      if (input.communicationScore !== undefined) updates.communicationScore = input.communicationScore;
      if (input.comment !== undefined) updates.comment = input.comment;

      // Recalculate overall
      const q = input.qualityScore ?? existing.qualityScore;
      const d = input.delayScore ?? existing.delayScore;
      const c = input.costScore ?? existing.costScore;
      const s = input.safetyScore ?? existing.safetyScore;
      const co = input.complianceScore ?? existing.complianceScore;
      const cm = input.communicationScore ?? existing.communicationScore;
      updates.overallScore = Math.round(((q + d + c + s + co + cm) / 6) * 100);

      await db.update(erpPerformanceRatings).set(updates).where(eq(erpPerformanceRatings.id, input.id));

      // Update entity average
      await updateEntityRating(db, existing.rateableType, existing.rateableId);

      return { success: true };
    }),

  // ---- DELETE ----
  delete: erpPermissionProcedure("erp_vendors", "delete")
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = (await getDb())!;
      const [existing] = await db.select().from(erpPerformanceRatings).where(eq(erpPerformanceRatings.id, input.id));
      if (!existing) throw new Error("Rating introuvable");

      await db.delete(erpPerformanceRatings).where(eq(erpPerformanceRatings.id, input.id));

      // Update entity average
      await updateEntityRating(db, existing.rateableType, existing.rateableId);

      await createAuditEvent({
        actorId: ctx.user.id,
        action: "erp.ratings.deleted",
        targetType: "erp_performance_rating",
        targetId: input.id,
        details: { rateableType: existing.rateableType, rateableId: existing.rateableId },
      });

      return { success: true };
    }),

  // ---- FOR ENTITY (vendor or contractor) ----
  forEntity: erpPermissionProcedure("erp_vendors", "view")
    .input(z.object({
      rateableType: z.enum(RATEABLE_TYPES),
      rateableId: z.number(),
      limit: z.number().min(1).max(100).default(20),
      offset: z.number().min(0).default(0),
    }))
    .query(async ({ input }) => {
      const db = (await getDb())!;
      const where = and(
        eq(erpPerformanceRatings.rateableType, input.rateableType),
        eq(erpPerformanceRatings.rateableId, input.rateableId)
      );

      const [items, totalResult, avgResult] = await Promise.all([
        db.select().from(erpPerformanceRatings)
          .where(where)
          .orderBy(desc(erpPerformanceRatings.createdAt))
          .limit(input.limit)
          .offset(input.offset),
        db.select({ count: count() }).from(erpPerformanceRatings).where(where),
        db.select({
          avgQuality: sql<number>`ROUND(AVG(quality_score), 2)`,
          avgDelay: sql<number>`ROUND(AVG(delay_score), 2)`,
          avgCost: sql<number>`ROUND(AVG(cost_score), 2)`,
          avgSafety: sql<number>`ROUND(AVG(safety_score), 2)`,
          avgCompliance: sql<number>`ROUND(AVG(compliance_score), 2)`,
          avgCommunication: sql<number>`ROUND(AVG(communication_score), 2)`,
          avgOverall: sql<number>`ROUND(AVG(overall_score))`,
        }).from(erpPerformanceRatings).where(where),
      ]);

      return {
        items,
        total: totalResult[0]?.count || 0,
        averages: avgResult[0] || null,
      };
    }),

  // ---- TOP PERFORMERS ----
  top: erpPermissionProcedure("erp_vendors", "view")
    .input(z.object({
      rateableType: z.enum(RATEABLE_TYPES).optional(),
      limit: z.number().min(1).max(50).default(10),
    }))
    .query(async ({ input }) => {
      const db = (await getDb())!;
      const conditions: any[] = [];
      if (input.rateableType) conditions.push(eq(erpPerformanceRatings.rateableType, input.rateableType));

      const where = conditions.length > 0 ? and(...conditions) : undefined;

      const results = await db.select({
        rateableType: erpPerformanceRatings.rateableType,
        rateableId: erpPerformanceRatings.rateableId,
        avgOverall: sql<number>`ROUND(AVG(overall_score))`,
        totalRatings: count(),
        avgQuality: sql<number>`ROUND(AVG(quality_score), 1)`,
        avgDelay: sql<number>`ROUND(AVG(delay_score), 1)`,
        avgCost: sql<number>`ROUND(AVG(cost_score), 1)`,
        avgSafety: sql<number>`ROUND(AVG(safety_score), 1)`,
        avgCompliance: sql<number>`ROUND(AVG(compliance_score), 1)`,
        avgCommunication: sql<number>`ROUND(AVG(communication_score), 1)`,
      })
        .from(erpPerformanceRatings)
        .where(where)
        .groupBy(erpPerformanceRatings.rateableType, erpPerformanceRatings.rateableId)
        .orderBy(sql`AVG(overall_score) DESC`)
        .limit(input.limit);

      // Enrich with entity names
      const enriched = await Promise.all(results.map(async (r: any) => {
        let name = `${r.rateableType} #${r.rateableId}`;
        if (r.rateableType === "vendor") {
          const [v] = await db.select({ name: erpVendors.name }).from(erpVendors).where(eq(erpVendors.id, r.rateableId));
          if (v) name = v.name;
        } else if (r.rateableType === "contractor") {
          const [c] = await db.select({ name: erpContractors.name }).from(erpContractors).where(eq(erpContractors.id, r.rateableId));
          if (c) name = c.name;
        }
        return { ...r, name };
      }));

      return { items: enriched };
    }),

  // ---- LOW PERFORMERS ----
  low: erpPermissionProcedure("erp_vendors", "view")
    .input(z.object({
      rateableType: z.enum(RATEABLE_TYPES).optional(),
      limit: z.number().min(1).max(50).default(10),
    }))
    .query(async ({ input }) => {
      const db = (await getDb())!;
      const conditions: any[] = [];
      if (input.rateableType) conditions.push(eq(erpPerformanceRatings.rateableType, input.rateableType));

      const where = conditions.length > 0 ? and(...conditions) : undefined;

      const results = await db.select({
        rateableType: erpPerformanceRatings.rateableType,
        rateableId: erpPerformanceRatings.rateableId,
        avgOverall: sql<number>`ROUND(AVG(overall_score))`,
        totalRatings: count(),
        avgQuality: sql<number>`ROUND(AVG(quality_score), 1)`,
        avgDelay: sql<number>`ROUND(AVG(delay_score), 1)`,
        avgCost: sql<number>`ROUND(AVG(cost_score), 1)`,
        avgSafety: sql<number>`ROUND(AVG(safety_score), 1)`,
        avgCompliance: sql<number>`ROUND(AVG(compliance_score), 1)`,
        avgCommunication: sql<number>`ROUND(AVG(communication_score), 1)`,
      })
        .from(erpPerformanceRatings)
        .where(where)
        .groupBy(erpPerformanceRatings.rateableType, erpPerformanceRatings.rateableId)
        .orderBy(sql`AVG(overall_score) ASC`)
        .limit(input.limit);

      // Enrich with entity names
      const enriched = await Promise.all(results.map(async (r: any) => {
        let name = `${r.rateableType} #${r.rateableId}`;
        if (r.rateableType === "vendor") {
          const [v] = await db.select({ name: erpVendors.name }).from(erpVendors).where(eq(erpVendors.id, r.rateableId));
          if (v) name = v.name;
        } else if (r.rateableType === "contractor") {
          const [c] = await db.select({ name: erpContractors.name }).from(erpContractors).where(eq(erpContractors.id, r.rateableId));
          if (c) name = c.name;
        }
        return { ...r, name };
      }));

      return { items: enriched };
    }),

  // ---- STATS ----
  stats: erpPermissionProcedure("erp_vendors", "view")
    .query(async () => {
      const db = (await getDb())!;

      const [totals] = await db.select({
        totalRatings: count(),
        avgOverall: sql<number>`ROUND(AVG(overall_score))`,
        avgQuality: sql<number>`ROUND(AVG(quality_score), 1)`,
        avgDelay: sql<number>`ROUND(AVG(delay_score), 1)`,
        avgCost: sql<number>`ROUND(AVG(cost_score), 1)`,
        avgSafety: sql<number>`ROUND(AVG(safety_score), 1)`,
        avgCompliance: sql<number>`ROUND(AVG(compliance_score), 1)`,
        avgCommunication: sql<number>`ROUND(AVG(communication_score), 1)`,
      }).from(erpPerformanceRatings);

      const [vendorCount] = await db.select({ count: sql<number>`COUNT(DISTINCT rateable_id)` })
        .from(erpPerformanceRatings)
        .where(eq(erpPerformanceRatings.rateableType, "vendor"));

      const [contractorCount] = await db.select({ count: sql<number>`COUNT(DISTINCT rateable_id)` })
        .from(erpPerformanceRatings)
        .where(eq(erpPerformanceRatings.rateableType, "contractor"));

      return {
        ...totals,
        ratedVendors: vendorCount?.count || 0,
        ratedContractors: contractorCount?.count || 0,
      };
    }),
});

// ============================================================
// HELPER: Update entity average rating
// ============================================================

async function updateEntityRating(db: any, rateableType: string, rateableId: number) {
  const [avgResult] = await db.select({
    avg: sql<number>`ROUND(AVG(overall_score) / 100)`,
  }).from(erpPerformanceRatings).where(
    and(
      eq(erpPerformanceRatings.rateableType, rateableType),
      eq(erpPerformanceRatings.rateableId, rateableId)
    )
  );

  const avgRating = avgResult?.avg || null;

  if (rateableType === "vendor") {
    await db.update(erpVendors).set({ rating: avgRating, updatedAt: Date.now() }).where(eq(erpVendors.id, rateableId));
  } else if (rateableType === "contractor") {
    await db.update(erpContractors).set({ rating: avgRating, updatedAt: Date.now() }).where(eq(erpContractors.id, rateableId));
  }
}
