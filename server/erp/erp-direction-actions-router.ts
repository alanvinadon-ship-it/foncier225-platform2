import { z } from "zod";
import { router } from "../_core/trpc";
import { erpPermissionProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { createAuditEvent } from "../db";
import { erpDirectionActionPlans } from "../../drizzle/schema";
import { eq, desc, and, isNull, lt, ne } from "drizzle-orm";
import { notifyOwner } from "../_core/notification";

// ─── Routeur Plans d'Actions Direction ───────────────────────────────────────
export const erpDirectionActionsRouter = router({
  // List actions
  list: erpPermissionProcedure("erp_direction_dashboard", "view")
    .input(z.object({
      status: z.string().optional(),
      priority: z.string().optional(),
      assignedTo: z.number().optional(),
      reviewId: z.number().optional(),
      limit: z.number().min(1).max(200).default(100),
    }).optional())
    .query(async ({ input }) => {
      const db = (await getDb())!;
      const conditions = [isNull(erpDirectionActionPlans.deletedAt)];
      if (input?.status) conditions.push(eq(erpDirectionActionPlans.status, input.status));
      if (input?.priority) conditions.push(eq(erpDirectionActionPlans.priority, input.priority));
      if (input?.assignedTo) conditions.push(eq(erpDirectionActionPlans.assignedTo, input.assignedTo));
      if (input?.reviewId) conditions.push(eq(erpDirectionActionPlans.reviewId, input.reviewId));
      const rows = await db
        .select()
        .from(erpDirectionActionPlans)
        .where(and(...conditions))
        .orderBy(desc(erpDirectionActionPlans.createdAt))
        .limit(input?.limit ?? 100);
      return rows;
    }),

  // Get by id
  getById: erpPermissionProcedure("erp_direction_dashboard", "view")
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = (await getDb())!;
      const [row] = await db
        .select()
        .from(erpDirectionActionPlans)
        .where(and(eq(erpDirectionActionPlans.id, input.id), isNull(erpDirectionActionPlans.deletedAt)));
      return row ?? null;
    }),

  // Create action
  create: erpPermissionProcedure("erp_direction_dashboard", "create")
    .input(z.object({
      title: z.string().min(1).max(255),
      description: z.string().optional(),
      priority: z.enum(["low", "medium", "high", "critical"]).default("medium"),
      assignedTo: z.number().optional(),
      dueDate: z.number().optional(),
      reviewId: z.number().optional(),
      alertId: z.number().optional(),
      sourceModule: z.string().optional(),
      sourceId: z.number().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = (await getDb())!;
      const now = Date.now();
      const actionNumber = `ACT-${new Date().getFullYear()}-${String(now).slice(-6)}`;
      const [result] = await db.insert(erpDirectionActionPlans).values({
        actionNumber,
        title: input.title,
        description: input.description ?? null,
        priority: input.priority,
        assignedTo: input.assignedTo ?? null,
        dueDate: input.dueDate ?? null,
        reviewId: input.reviewId ?? null,
        alertId: input.alertId ?? null,
        sourceModule: input.sourceModule ?? null,
        sourceId: input.sourceId ?? null,
        status: "open",
        progressPercentage: 0,
        createdBy: ctx.user.id,
        createdAt: now,
        updatedAt: now,
      });
      await createAuditEvent({
        actorId: ctx.user.id,
        action: "direction.action.created",
        targetType: "direction_action_plan",
        targetId: Number(result.insertId),
        details: { title: input.title, priority: input.priority, actionNumber },
      });
      if (input.priority === "critical") {
        await notifyOwner({ title: "Action critique créée", content: `Action "${input.title}" (${actionNumber}) — priorité CRITIQUE.` });
      }
      return { id: result.insertId, actionNumber };
    }),

  // Update action
  update: erpPermissionProcedure("erp_direction_dashboard", "update")
    .input(z.object({
      id: z.number(),
      title: z.string().optional(),
      description: z.string().optional(),
      priority: z.enum(["low", "medium", "high", "critical"]).optional(),
      assignedTo: z.number().optional(),
      dueDate: z.number().optional(),
      status: z.enum(["open", "in_progress", "blocked", "completed", "cancelled", "overdue"]).optional(),
      progressPercentage: z.number().min(0).max(100).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = (await getDb())!;
      const now = Date.now();
      const updates: Record<string, unknown> = { updatedAt: now };
      if (input.title !== undefined) updates.title = input.title;
      if (input.description !== undefined) updates.description = input.description;
      if (input.priority !== undefined) updates.priority = input.priority;
      if (input.assignedTo !== undefined) updates.assignedTo = input.assignedTo;
      if (input.dueDate !== undefined) updates.dueDate = input.dueDate;
      if (input.status !== undefined) updates.status = input.status;
      if (input.progressPercentage !== undefined) updates.progressPercentage = input.progressPercentage;
      await db.update(erpDirectionActionPlans).set(updates).where(eq(erpDirectionActionPlans.id, input.id));
      await createAuditEvent({
        actorId: ctx.user.id,
        action: "direction.action.updated",
        targetType: "direction_action_plan",
        targetId: input.id,
        details: updates,
      });
      return { success: true };
    }),

  // Complete action
  complete: erpPermissionProcedure("erp_direction_dashboard", "update")
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = (await getDb())!;
      const now = Date.now();
      await db.update(erpDirectionActionPlans).set({
        status: "completed",
        progressPercentage: 100,
        completedAt: now,
        updatedAt: now,
      }).where(eq(erpDirectionActionPlans.id, input.id));
      await createAuditEvent({
        actorId: ctx.user.id,
        action: "direction.action.completed",
        targetType: "direction_action_plan",
        targetId: input.id,
        details: {},
      });
      return { success: true };
    }),

  // Cancel action
  cancel: erpPermissionProcedure("erp_direction_dashboard", "update")
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = (await getDb())!;
      const now = Date.now();
      await db.update(erpDirectionActionPlans).set({ status: "cancelled", updatedAt: now }).where(eq(erpDirectionActionPlans.id, input.id));
      await createAuditEvent({
        actorId: ctx.user.id,
        action: "direction.action.cancelled",
        targetType: "direction_action_plan",
        targetId: input.id,
        details: {},
      });
      return { success: true };
    }),

  // List overdue actions
  overdue: erpPermissionProcedure("erp_direction_dashboard", "view")
    .input(z.object({}).optional())
    .query(async () => {
      const db = (await getDb())!;
      const now = Date.now();
      const rows = await db
        .select()
        .from(erpDirectionActionPlans)
        .where(and(
          isNull(erpDirectionActionPlans.deletedAt),
          lt(erpDirectionActionPlans.dueDate, now),
          ne(erpDirectionActionPlans.status, "completed"),
          ne(erpDirectionActionPlans.status, "cancelled"),
        ))
        .orderBy(erpDirectionActionPlans.dueDate);
      return rows;
    }),

  // Summary for dashboard
  summary: erpPermissionProcedure("erp_direction_dashboard", "view")
    .input(z.object({}).optional())
    .query(async () => {
      const db = (await getDb())!;
      const now = Date.now();
      const all = await db
        .select()
        .from(erpDirectionActionPlans)
        .where(isNull(erpDirectionActionPlans.deletedAt));
      const open = all.filter(a => a.status === "open" || a.status === "in_progress");
      const critical = all.filter(a => a.priority === "critical" && a.status !== "completed" && a.status !== "cancelled");
      const overdue = all.filter(a => a.dueDate && a.dueDate < now && a.status !== "completed" && a.status !== "cancelled");
      const completed = all.filter(a => a.status === "completed");
      const closureRate = all.length > 0 ? Math.round((completed.length / all.length) * 100) : 0;
      return {
        totalOpen: open.length,
        totalCritical: critical.length,
        totalOverdue: overdue.length,
        totalCompleted: completed.length,
        total: all.length,
        closureRate,
      };
    }),
});
