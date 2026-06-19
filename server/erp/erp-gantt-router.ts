import { z } from "zod";
import { router, erpPermissionProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { erpTasks, erpTaskDependencies, erpMilestones, erpProjects, users } from "../../drizzle/schema";
import { eq, and, isNull } from "drizzle-orm";

// ============================================================
// ROUTEUR GANTT
// ============================================================
export const erpGanttRouter = router({
  // GET /api/erp/projects/:projectId/gantt
  // Retourne toutes les données nécessaires pour le Gantt : tâches, dépendances, milestones
  getData: erpPermissionProcedure("erp_gantt", "view")
    .input(z.object({
      projectId: z.number(),
      status: z.string().optional(),
      assigneeId: z.number().optional(),
    }))
    .query(async ({ input }) => {
      const db = (await getDb())!;
      const now = Date.now();

      // 1. Récupérer le projet
      const [project] = await db
        .select()
        .from(erpProjects)
        .where(eq(erpProjects.id, input.projectId));

      if (!project) {
        throw new Error("Project not found");
      }

      // 2. Récupérer les tâches
      const taskConditions = [
        eq(erpTasks.projectId, input.projectId),
        isNull(erpTasks.deletedAt),
      ];

      let tasks = await db
        .select({
          id: erpTasks.id,
          title: erpTasks.title,
          status: erpTasks.status,
          priority: erpTasks.priority,
          startDate: erpTasks.startDate,
          dueDate: erpTasks.dueDate,
          completedAt: erpTasks.completedAt,
          progressPercentage: erpTasks.progressPercentage,
          assignedTo: erpTasks.assignedTo,
          parentTaskId: erpTasks.parentTaskId,
          assigneeName: users.name,
        })
        .from(erpTasks)
        .leftJoin(users, eq(erpTasks.assignedTo, users.id))
        .where(and(...taskConditions))
        .orderBy(erpTasks.startDate);

      // Appliquer les filtres optionnels
      if (input.status) {
        tasks = tasks.filter((t) => t.status === input.status);
      }
      if (input.assigneeId) {
        tasks = tasks.filter((t) => t.assignedTo === input.assigneeId);
      }

      // Enrichir avec le flag isLate
      const enrichedTasks = tasks.map((t) => ({
        ...t,
        isLate: !!(t.dueDate && t.dueDate < now && t.status !== "completed" && t.status !== "cancelled"),
      }));

      // 3. Récupérer les dépendances
      const taskIds = tasks.map((t) => t.id);
      let dependencies: Array<{
        id: number;
        taskId: number;
        dependsOnTaskId: number;
        dependencyType: string;
      }> = [];

      if (taskIds.length > 0) {
        const allDeps = await db
          .select()
          .from(erpTaskDependencies);

        dependencies = allDeps.filter(
          (d) => taskIds.includes(d.taskId) || taskIds.includes(d.dependsOnTaskId)
        );
      }

      // 4. Récupérer les milestones
      const milestones = await db
        .select()
        .from(erpMilestones)
        .where(and(
          eq(erpMilestones.projectId, input.projectId),
          isNull(erpMilestones.deletedAt),
        ))
        .orderBy(erpMilestones.plannedDate);

      const enrichedMilestones = milestones.map((m) => ({
        ...m,
        isLate: m.status === "planned" && m.plannedDate < now,
      }));

      // 5. Calculer la progression globale
      const totalTasks = enrichedTasks.length;
      const completedTasks = enrichedTasks.filter((t) => t.status === "completed").length;
      const lateTasks = enrichedTasks.filter((t) => t.isLate).length;
      const avgProgress = totalTasks > 0
        ? Math.round(enrichedTasks.reduce((sum, t) => sum + t.progressPercentage, 0) / totalTasks)
        : 0;

      // 6. Calculer les dates min/max pour la timeline
      const allDates = [
        ...enrichedTasks.map((t) => t.startDate).filter(Boolean),
        ...enrichedTasks.map((t) => t.dueDate).filter(Boolean),
        ...enrichedMilestones.map((m) => m.plannedDate),
        project.startDate,
        project.plannedEndDate,
      ].filter(Boolean) as number[];

      const timelineStart = allDates.length > 0 ? Math.min(...allDates) : now;
      const timelineEnd = allDates.length > 0 ? Math.max(...allDates) : now + 30 * 86400000;

      return {
        project: {
          id: project.id,
          name: project.name,
          code: project.code,
          startDate: project.startDate,
          plannedEndDate: project.plannedEndDate,
          status: project.status,
          progressPercentage: project.progressPercentage,
        },
        tasks: enrichedTasks,
        dependencies,
        milestones: enrichedMilestones,
        summary: {
          totalTasks,
          completedTasks,
          lateTasks,
          avgProgress,
          totalMilestones: enrichedMilestones.length,
          reachedMilestones: enrichedMilestones.filter((m) => m.status === "reached").length,
          lateMilestones: enrichedMilestones.filter((m) => m.isLate).length,
        },
        timeline: {
          start: timelineStart,
          end: timelineEnd,
        },
      };
    }),

  // PUT — Modifier les dates d'une tâche (drag & drop sur le Gantt)
  updateTaskDates: erpPermissionProcedure("erp_gantt", "edit")
    .input(z.object({
      taskId: z.number(),
      startDate: z.number().optional(),
      dueDate: z.number().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = (await getDb())!;
      const setValues: Record<string, unknown> = { updatedAt: Date.now() };

      if (input.startDate !== undefined) setValues.startDate = input.startDate;
      if (input.dueDate !== undefined) setValues.dueDate = input.dueDate;

      await db.update(erpTasks).set(setValues).where(eq(erpTasks.id, input.taskId));
      return { success: true };
    }),

  // Calcul de la progression globale du projet et mise à jour
  recalculateProgress: erpPermissionProcedure("erp_projects", "edit")
    .input(z.object({ projectId: z.number() }))
    .mutation(async ({ input }) => {
      const db = (await getDb())!;

      const tasks = await db
        .select({ progressPercentage: erpTasks.progressPercentage })
        .from(erpTasks)
        .where(and(
          eq(erpTasks.projectId, input.projectId),
          isNull(erpTasks.deletedAt),
        ));

      const totalTasks = tasks.length;
      const avgProgress = totalTasks > 0
        ? Math.round(tasks.reduce((sum, t) => sum + t.progressPercentage, 0) / totalTasks)
        : 0;

      await db.update(erpProjects).set({
        progressPercentage: avgProgress,
        updatedAt: Date.now(),
      }).where(eq(erpProjects.id, input.projectId));

      return { success: true, progressPercentage: avgProgress };
    }),
});
