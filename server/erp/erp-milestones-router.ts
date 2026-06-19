import { z } from "zod";
import { router, erpPermissionProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { erpMilestones } from "../../drizzle/schema";
import { eq, and, isNull } from "drizzle-orm";

// ============================================================
// CONSTANTES
// ============================================================
const MILESTONE_STATUSES = ["planned", "reached", "delayed", "missed", "cancelled"] as const;
const IMPACT_LEVELS = ["low", "medium", "high", "critical"] as const;

// ============================================================
// ROUTEUR MILESTONES
// ============================================================
export const erpMilestonesRouter = router({
  // GET /api/erp/projects/:projectId/milestones
  listByProject: erpPermissionProcedure("erp_projects", "view")
    .input(z.object({
      projectId: z.number(),
      status: z.enum(MILESTONE_STATUSES).optional(),
    }))
    .query(async ({ input }) => {
      const db = (await getDb())!;
      const conditions = [
        eq(erpMilestones.projectId, input.projectId),
        isNull(erpMilestones.deletedAt),
      ];

      const rows = await db
        .select()
        .from(erpMilestones)
        .where(and(...conditions))
        .orderBy(erpMilestones.plannedDate);

      const now = Date.now();
      const results = rows.map((m) => ({
        ...m,
        isLate: m.status === "planned" && m.plannedDate < now,
      }));

      if (input.status) {
        return results.filter((m) => m.status === input.status);
      }
      return results;
    }),

  // POST /api/erp/projects/:projectId/milestones
  create: erpPermissionProcedure("erp_projects", "create")
    .input(z.object({
      projectId: z.number(),
      name: z.string().min(1).max(255),
      description: z.string().optional(),
      plannedDate: z.number(),
      impactLevel: z.enum(IMPACT_LEVELS).default("medium"),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = (await getDb())!;
      const now = Date.now();
      const [result] = await db.insert(erpMilestones).values({
        projectId: input.projectId,
        name: input.name,
        description: input.description || null,
        plannedDate: input.plannedDate,
        impactLevel: input.impactLevel,
        status: "planned",
        createdBy: ctx.user.id,
        createdAt: now,
        updatedAt: now,
      });
      return { id: result.insertId, success: true };
    }),

  // PUT /api/erp/milestones/:id
  update: erpPermissionProcedure("erp_projects", "edit")
    .input(z.object({
      id: z.number(),
      name: z.string().min(1).max(255).optional(),
      description: z.string().optional(),
      plannedDate: z.number().optional(),
      actualDate: z.number().optional(),
      status: z.enum(MILESTONE_STATUSES).optional(),
      impactLevel: z.enum(IMPACT_LEVELS).optional(),
    }))
    .mutation(async ({ input }) => {
      const db = (await getDb())!;
      const { id, ...updates } = input;
      const setValues: Record<string, unknown> = { updatedAt: Date.now() };

      if (updates.name !== undefined) setValues.name = updates.name;
      if (updates.description !== undefined) setValues.description = updates.description;
      if (updates.plannedDate !== undefined) setValues.plannedDate = updates.plannedDate;
      if (updates.actualDate !== undefined) setValues.actualDate = updates.actualDate;
      if (updates.status !== undefined) setValues.status = updates.status;
      if (updates.impactLevel !== undefined) setValues.impactLevel = updates.impactLevel;

      await db.update(erpMilestones).set(setValues).where(eq(erpMilestones.id, id));
      return { success: true };
    }),

  // DELETE /api/erp/milestones/:id (soft delete)
  delete: erpPermissionProcedure("erp_projects", "delete")
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = (await getDb())!;
      await db.update(erpMilestones).set({
        deletedAt: Date.now(),
        updatedAt: Date.now(),
      }).where(eq(erpMilestones.id, input.id));
      return { success: true };
    }),

  // POST /api/erp/milestones/:id/mark-reached
  markReached: erpPermissionProcedure("erp_projects", "edit")
    .input(z.object({
      id: z.number(),
      actualDate: z.number().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = (await getDb())!;
      const now = Date.now();
      const actualDate = input.actualDate || now;

      // Get the milestone to check if it's late
      const [milestone] = await db
        .select()
        .from(erpMilestones)
        .where(eq(erpMilestones.id, input.id));

      if (!milestone) {
        throw new Error("Milestone not found");
      }

      const isLate = actualDate > milestone.plannedDate;
      const status = isLate ? "delayed" : "reached";

      await db.update(erpMilestones).set({
        status,
        actualDate,
        updatedAt: now,
      }).where(eq(erpMilestones.id, input.id));

      return { success: true, status, isLate };
    }),
});
