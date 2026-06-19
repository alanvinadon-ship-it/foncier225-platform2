import { z } from "zod";
import { eq, and, isNull, sql, desc, asc, count } from "drizzle-orm";
import { router, erpPermissionProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { erpTasks, erpTaskDependencies, erpProjects, users } from "../../drizzle/schema";

// ============================================================
// CONSTANTES
// ============================================================

const TASK_STATUSES = ["todo", "in_progress", "blocked", "under_review", "completed", "cancelled", "late"] as const;
const PRIORITIES = ["low", "medium", "high", "critical"] as const;

// ============================================================
// SCHEMAS ZOD
// ============================================================

const createTaskSchema = z.object({
  projectId: z.number(),
  parentTaskId: z.number().optional(),
  title: z.string().min(2).max(255),
  description: z.string().optional(),
  assignedTo: z.number().optional(),
  startDate: z.number().optional(),
  dueDate: z.number().optional(),
  priority: z.enum(PRIORITIES).default("medium"),
  estimatedHours: z.number().min(0).optional(),
});

const updateTaskSchema = z.object({
  id: z.number(),
  title: z.string().min(2).max(255).optional(),
  description: z.string().optional(),
  assignedTo: z.number().nullable().optional(),
  startDate: z.number().nullable().optional(),
  dueDate: z.number().nullable().optional(),
  priority: z.enum(PRIORITIES).optional(),
  status: z.enum(TASK_STATUSES).optional(),
  progressPercentage: z.number().min(0).max(100).optional(),
  estimatedHours: z.number().min(0).optional(),
  actualHours: z.number().min(0).optional(),
});

const listTasksSchema = z.object({
  projectId: z.number(),
  status: z.enum(TASK_STATUSES).optional(),
  priority: z.enum(PRIORITIES).optional(),
  assignedTo: z.number().optional(),
  parentTaskId: z.number().nullable().optional(),
  sortBy: z.enum(["title", "created_at", "due_date", "priority", "status", "progress_percentage"]).default("created_at"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});

// ============================================================
// ERP TASKS ROUTER
// ============================================================

export const erpTasksRouter = router({
  /**
   * GET /api/erp/projects/:projectId/tasks — Liste des tâches d'un projet
   */
  listByProject: erpPermissionProcedure("erp_projects", "view").input(listTasksSchema).query(async ({ input }) => {
    const db = (await getDb())!;
    const { projectId, status, priority, assignedTo, parentTaskId, sortBy, sortOrder } = input;

    const conditions = [
      eq(erpTasks.projectId, projectId),
      isNull(erpTasks.deletedAt),
    ];
    if (status) conditions.push(eq(erpTasks.status, status));
    if (priority) conditions.push(eq(erpTasks.priority, priority));
    if (assignedTo) conditions.push(eq(erpTasks.assignedTo, assignedTo));
    if (parentTaskId !== undefined) {
      if (parentTaskId === null) {
        conditions.push(isNull(erpTasks.parentTaskId));
      } else {
        conditions.push(eq(erpTasks.parentTaskId, parentTaskId));
      }
    }

    const sortColumn = {
      title: erpTasks.title,
      created_at: erpTasks.createdAt,
      due_date: erpTasks.dueDate,
      priority: erpTasks.priority,
      status: erpTasks.status,
      progress_percentage: erpTasks.progressPercentage,
    }[sortBy] || erpTasks.createdAt;

    const orderFn = sortOrder === "asc" ? asc : desc;

    const tasks = await db
      .select({
        id: erpTasks.id,
        projectId: erpTasks.projectId,
        parentTaskId: erpTasks.parentTaskId,
        title: erpTasks.title,
        description: erpTasks.description,
        assignedTo: erpTasks.assignedTo,
        assigneeName: users.name,
        startDate: erpTasks.startDate,
        dueDate: erpTasks.dueDate,
        completedAt: erpTasks.completedAt,
        priority: erpTasks.priority,
        status: erpTasks.status,
        progressPercentage: erpTasks.progressPercentage,
        estimatedHours: erpTasks.estimatedHours,
        actualHours: erpTasks.actualHours,
        createdAt: erpTasks.createdAt,
        updatedAt: erpTasks.updatedAt,
      })
      .from(erpTasks)
      .leftJoin(users, eq(erpTasks.assignedTo, users.id))
      .where(and(...conditions))
      .orderBy(orderFn(sortColumn));

    // Détecter les tâches en retard
    const now = Date.now();
    const tasksWithLateFlag = tasks.map(t => ({
      ...t,
      isLate: t.dueDate ? t.dueDate < now && t.status !== "completed" && t.status !== "cancelled" : false,
    }));

    return tasksWithLateFlag;
  }),

  /**
   * POST /api/erp/projects/:projectId/tasks — Créer une tâche
   */
  create: erpPermissionProcedure("erp_projects", "create").input(createTaskSchema).mutation(async ({ ctx, input }) => {
    const db = (await getDb())!;
    const now = Date.now();

    // Vérifier que le projet existe
    const [project] = await db
      .select({ id: erpProjects.id })
      .from(erpProjects)
      .where(and(eq(erpProjects.id, input.projectId), isNull(erpProjects.deletedAt)));

    if (!project) throw new Error("Projet non trouvé");

    const [result] = await db.insert(erpTasks).values({
      projectId: input.projectId,
      parentTaskId: input.parentTaskId || null,
      title: input.title,
      description: input.description || null,
      assignedTo: input.assignedTo || null,
      startDate: input.startDate || null,
      dueDate: input.dueDate || null,
      priority: input.priority,
      status: "todo",
      progressPercentage: 0,
      estimatedHours: input.estimatedHours || 0,
      actualHours: 0,
      createdBy: ctx.user.id,
      createdAt: now,
      updatedAt: now,
    });

    return { id: result.insertId };
  }),

  /**
   * GET /api/erp/tasks/:id — Détail d'une tâche
   */
  getById: erpPermissionProcedure("erp_projects", "view").input(z.object({ id: z.number() })).query(async ({ input }) => {
    const db = (await getDb())!;

    const [task] = await db
      .select({
        id: erpTasks.id,
        projectId: erpTasks.projectId,
        parentTaskId: erpTasks.parentTaskId,
        title: erpTasks.title,
        description: erpTasks.description,
        assignedTo: erpTasks.assignedTo,
        assigneeName: users.name,
        startDate: erpTasks.startDate,
        dueDate: erpTasks.dueDate,
        completedAt: erpTasks.completedAt,
        priority: erpTasks.priority,
        status: erpTasks.status,
        progressPercentage: erpTasks.progressPercentage,
        estimatedHours: erpTasks.estimatedHours,
        actualHours: erpTasks.actualHours,
        createdBy: erpTasks.createdBy,
        createdAt: erpTasks.createdAt,
        updatedAt: erpTasks.updatedAt,
      })
      .from(erpTasks)
      .leftJoin(users, eq(erpTasks.assignedTo, users.id))
      .where(and(eq(erpTasks.id, input.id), isNull(erpTasks.deletedAt)));

    if (!task) throw new Error("Tâche non trouvée");

    // Récupérer les dépendances
    const dependencies = await db
      .select({
        id: erpTaskDependencies.id,
        dependsOnTaskId: erpTaskDependencies.dependsOnTaskId,
        dependencyType: erpTaskDependencies.dependencyType,
        dependsOnTitle: erpTasks.title,
        dependsOnStatus: erpTasks.status,
      })
      .from(erpTaskDependencies)
      .innerJoin(erpTasks, eq(erpTaskDependencies.dependsOnTaskId, erpTasks.id))
      .where(eq(erpTaskDependencies.taskId, input.id));

    const now = Date.now();
    return {
      ...task,
      isLate: task.dueDate ? task.dueDate < now && task.status !== "completed" && task.status !== "cancelled" : false,
      dependencies,
    };
  }),

  /**
   * PUT /api/erp/tasks/:id — Modifier une tâche
   */
  update: erpPermissionProcedure("erp_projects", "edit").input(updateTaskSchema).mutation(async ({ input }) => {
    const db = (await getDb())!;
    const { id, ...updates } = input;
    const now = Date.now();

    const setValues: Record<string, unknown> = { updatedAt: now };
    if (updates.title !== undefined) setValues.title = updates.title;
    if (updates.description !== undefined) setValues.description = updates.description;
    if (updates.assignedTo !== undefined) setValues.assignedTo = updates.assignedTo;
    if (updates.startDate !== undefined) setValues.startDate = updates.startDate;
    if (updates.dueDate !== undefined) setValues.dueDate = updates.dueDate;
    if (updates.priority !== undefined) setValues.priority = updates.priority;
    if (updates.status !== undefined) setValues.status = updates.status;
    if (updates.progressPercentage !== undefined) setValues.progressPercentage = updates.progressPercentage;
    if (updates.estimatedHours !== undefined) setValues.estimatedHours = updates.estimatedHours;
    if (updates.actualHours !== undefined) setValues.actualHours = updates.actualHours;

    await db.update(erpTasks).set(setValues).where(and(eq(erpTasks.id, id), isNull(erpTasks.deletedAt)));

    return { success: true };
  }),

  /**
   * DELETE /api/erp/tasks/:id — Suppression logique
   */
  delete: erpPermissionProcedure("erp_projects", "delete").input(z.object({ id: z.number() })).mutation(async ({ input }) => {
    const db = (await getDb())!;
    const now = Date.now();

    await db.update(erpTasks).set({ deletedAt: now, updatedAt: now })
      .where(and(eq(erpTasks.id, input.id), isNull(erpTasks.deletedAt)));

    return { success: true };
  }),

  /**
   * POST /api/erp/tasks/:id/assign — Affecter une tâche
   */
  assign: erpPermissionProcedure("erp_projects", "edit").input(z.object({
    id: z.number(),
    assignedTo: z.number(),
  })).mutation(async ({ input }) => {
    const db = (await getDb())!;
    const now = Date.now();

    await db.update(erpTasks).set({
      assignedTo: input.assignedTo,
      updatedAt: now,
    }).where(and(eq(erpTasks.id, input.id), isNull(erpTasks.deletedAt)));

    return { success: true };
  }),

  /**
   * POST /api/erp/tasks/:id/complete — Marquer une tâche comme terminée
   * Vérifie que les dépendances sont satisfaites
   */
  complete: erpPermissionProcedure("erp_projects", "edit").input(z.object({ id: z.number() })).mutation(async ({ input }) => {
    const db = (await getDb())!;
    const now = Date.now();

    // Vérifier les dépendances non terminées
    const blockers = await db
      .select({
        depId: erpTaskDependencies.dependsOnTaskId,
        depTitle: erpTasks.title,
        depStatus: erpTasks.status,
      })
      .from(erpTaskDependencies)
      .innerJoin(erpTasks, eq(erpTaskDependencies.dependsOnTaskId, erpTasks.id))
      .where(and(
        eq(erpTaskDependencies.taskId, input.id),
        sql`${erpTasks.status} NOT IN ('completed', 'cancelled')`
      ));

    if (blockers.length > 0) {
      throw new Error(`Impossible de terminer : ${blockers.length} dépendance(s) non satisfaite(s) — ${blockers.map(b => b.depTitle).join(", ")}`);
    }

    await db.update(erpTasks).set({
      status: "completed",
      progressPercentage: 100,
      completedAt: now,
      updatedAt: now,
    }).where(and(eq(erpTasks.id, input.id), isNull(erpTasks.deletedAt)));

    return { success: true };
  }),

  /**
   * POST /api/erp/tasks/:id/dependencies — Ajouter une dépendance
   */
  addDependency: erpPermissionProcedure("erp_projects", "edit").input(z.object({
    taskId: z.number(),
    dependsOnTaskId: z.number(),
    dependencyType: z.enum(["finish_to_start", "start_to_start", "finish_to_finish", "start_to_finish"]).default("finish_to_start"),
  })).mutation(async ({ input }) => {
    const db = (await getDb())!;
    const now = Date.now();

    // Empêcher l'auto-dépendance
    if (input.taskId === input.dependsOnTaskId) {
      throw new Error("Une tâche ne peut pas dépendre d'elle-même");
    }

    // Vérifier que les deux tâches existent et sont dans le même projet
    const tasks = await db
      .select({ id: erpTasks.id, projectId: erpTasks.projectId })
      .from(erpTasks)
      .where(and(
        sql`${erpTasks.id} IN (${input.taskId}, ${input.dependsOnTaskId})`,
        isNull(erpTasks.deletedAt)
      ));

    if (tasks.length !== 2) throw new Error("Tâche(s) non trouvée(s)");
    if (tasks[0].projectId !== tasks[1].projectId) throw new Error("Les tâches doivent appartenir au même projet");

    // Détecter les dépendances circulaires (simple vérification directe)
    const reverseExists = await db
      .select({ id: erpTaskDependencies.id })
      .from(erpTaskDependencies)
      .where(and(
        eq(erpTaskDependencies.taskId, input.dependsOnTaskId),
        eq(erpTaskDependencies.dependsOnTaskId, input.taskId)
      ));

    if (reverseExists.length > 0) {
      throw new Error("Dépendance circulaire détectée");
    }

    await db.insert(erpTaskDependencies).values({
      taskId: input.taskId,
      dependsOnTaskId: input.dependsOnTaskId,
      dependencyType: input.dependencyType,
      createdAt: now,
    });

    return { success: true };
  }),

  /**
   * DELETE /api/erp/tasks/:id/dependencies/:depId — Supprimer une dépendance
   */
  removeDependency: erpPermissionProcedure("erp_projects", "edit").input(z.object({
    dependencyId: z.number(),
  })).mutation(async ({ input }) => {
    const db = (await getDb())!;
    await db.delete(erpTaskDependencies).where(eq(erpTaskDependencies.id, input.dependencyId));
    return { success: true };
  }),
});
