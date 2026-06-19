import { z } from "zod";
import { eq, and, isNull, like, or, sql, desc, asc, count } from "drizzle-orm";
import { router, erpPermissionProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { erpProjects, erpTasks, users } from "../../drizzle/schema";

// ============================================================
// CONSTANTES
// ============================================================

const PROJECT_STATUSES = ["draft", "planned", "active", "on_hold", "completed", "cancelled", "delayed"] as const;
const PRIORITIES = ["low", "medium", "high", "critical"] as const;

// ============================================================
// SCHEMAS ZOD
// ============================================================

const createProjectSchema = z.object({
  name: z.string().min(2).max(255),
  description: z.string().optional(),
  clientName: z.string().max(255).optional(),
  location: z.string().max(500).optional(),
  startDate: z.number().optional(),
  plannedEndDate: z.number().optional(),
  initialBudget: z.number().min(0).optional(),
  priority: z.enum(PRIORITIES).default("medium"),
  projectManagerId: z.number().optional(),
});

const updateProjectSchema = z.object({
  id: z.number(),
  name: z.string().min(2).max(255).optional(),
  description: z.string().optional(),
  clientName: z.string().max(255).optional(),
  location: z.string().max(500).optional(),
  startDate: z.number().optional(),
  plannedEndDate: z.number().optional(),
  actualEndDate: z.number().optional(),
  initialBudget: z.number().min(0).optional(),
  revisedBudget: z.number().min(0).optional(),
  status: z.enum(PROJECT_STATUSES).optional(),
  priority: z.enum(PRIORITIES).optional(),
  progressPercentage: z.number().min(0).max(100).optional(),
  projectManagerId: z.number().nullable().optional(),
});

const listProjectsSchema = z.object({
  limit: z.number().min(1).max(100).default(20),
  offset: z.number().min(0).default(0),
  search: z.string().optional(),
  status: z.enum(PROJECT_STATUSES).optional(),
  priority: z.enum(PRIORITIES).optional(),
  managerId: z.number().optional(),
  sortBy: z.enum(["name", "created_at", "start_date", "status", "priority", "progress_percentage"]).default("created_at"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});

// ============================================================
// HELPER : Générer un code projet unique
// ============================================================

function generateProjectCode(): string {
  const prefix = "PRJ";
  const timestamp = Date.now().toString(36).toUpperCase().slice(-4);
  const random = Math.random().toString(36).toUpperCase().slice(2, 5);
  return `${prefix}-${timestamp}${random}`;
}

// ============================================================
// ERP PROJECTS ROUTER
// ============================================================

export const erpProjectsRouter = router({
  /**
   * GET /api/erp/projects — Liste paginée avec filtres et recherche
   */
  list: erpPermissionProcedure("erp_projects", "view").input(listProjectsSchema).query(async ({ input }) => {
    const db = (await getDb())!;
    const { limit, offset, search, status, priority, managerId, sortBy, sortOrder } = input;

    // Construire les conditions
    const conditions = [isNull(erpProjects.deletedAt)];
    if (status) conditions.push(eq(erpProjects.status, status));
    if (priority) conditions.push(eq(erpProjects.priority, priority));
    if (managerId) conditions.push(eq(erpProjects.projectManagerId, managerId));
    if (search) {
      conditions.push(
        or(
          like(erpProjects.name, `%${search}%`),
          like(erpProjects.code, `%${search}%`),
          like(erpProjects.clientName, `%${search}%`)
        )!
      );
    }

    const whereClause = and(...conditions);

    // Compter le total
    const [totalResult] = await db
      .select({ total: count() })
      .from(erpProjects)
      .where(whereClause);

    // Récupérer les projets
    const sortColumn = {
      name: erpProjects.name,
      created_at: erpProjects.createdAt,
      start_date: erpProjects.startDate,
      status: erpProjects.status,
      priority: erpProjects.priority,
      progress_percentage: erpProjects.progressPercentage,
    }[sortBy] || erpProjects.createdAt;

    const orderFn = sortOrder === "asc" ? asc : desc;

    const projects = await db
      .select({
        id: erpProjects.id,
        code: erpProjects.code,
        name: erpProjects.name,
        description: erpProjects.description,
        clientName: erpProjects.clientName,
        location: erpProjects.location,
        startDate: erpProjects.startDate,
        plannedEndDate: erpProjects.plannedEndDate,
        actualEndDate: erpProjects.actualEndDate,
        initialBudget: erpProjects.initialBudget,
        revisedBudget: erpProjects.revisedBudget,
        status: erpProjects.status,
        priority: erpProjects.priority,
        progressPercentage: erpProjects.progressPercentage,
        projectManagerId: erpProjects.projectManagerId,
        managerName: users.name,
        createdAt: erpProjects.createdAt,
        updatedAt: erpProjects.updatedAt,
      })
      .from(erpProjects)
      .leftJoin(users, eq(erpProjects.projectManagerId, users.id))
      .where(whereClause)
      .orderBy(orderFn(sortColumn))
      .limit(limit)
      .offset(offset);

    return {
      projects,
      total: totalResult?.total ?? 0,
      limit,
      offset,
    };
  }),

  /**
   * POST /api/erp/projects — Créer un projet
   */
  create: erpPermissionProcedure("erp_projects", "create").input(createProjectSchema).mutation(async ({ ctx, input }) => {
    const db = (await getDb())!;
    const now = Date.now();
    const code = generateProjectCode();

    const [result] = await db.insert(erpProjects).values({
      code,
      name: input.name,
      description: input.description || null,
      clientName: input.clientName || null,
      location: input.location || null,
      startDate: input.startDate || null,
      plannedEndDate: input.plannedEndDate || null,
      initialBudget: input.initialBudget || 0,
      revisedBudget: input.initialBudget || 0,
      status: "draft",
      priority: input.priority,
      progressPercentage: 0,
      projectManagerId: input.projectManagerId || null,
      createdBy: ctx.user.id,
      updatedBy: ctx.user.id,
      createdAt: now,
      updatedAt: now,
    });

    return { id: result.insertId, code };
  }),

  /**
   * GET /api/erp/projects/:id — Détail d'un projet
   */
  getById: erpPermissionProcedure("erp_projects", "view").input(z.object({ id: z.number() })).query(async ({ input }) => {
    const db = (await getDb())!;

    const [project] = await db
      .select({
        id: erpProjects.id,
        code: erpProjects.code,
        name: erpProjects.name,
        description: erpProjects.description,
        clientName: erpProjects.clientName,
        location: erpProjects.location,
        startDate: erpProjects.startDate,
        plannedEndDate: erpProjects.plannedEndDate,
        actualEndDate: erpProjects.actualEndDate,
        initialBudget: erpProjects.initialBudget,
        revisedBudget: erpProjects.revisedBudget,
        status: erpProjects.status,
        priority: erpProjects.priority,
        progressPercentage: erpProjects.progressPercentage,
        projectManagerId: erpProjects.projectManagerId,
        managerName: users.name,
        createdBy: erpProjects.createdBy,
        updatedBy: erpProjects.updatedBy,
        createdAt: erpProjects.createdAt,
        updatedAt: erpProjects.updatedAt,
        deletedAt: erpProjects.deletedAt,
      })
      .from(erpProjects)
      .leftJoin(users, eq(erpProjects.projectManagerId, users.id))
      .where(and(eq(erpProjects.id, input.id), isNull(erpProjects.deletedAt)));

    if (!project) throw new Error("Projet non trouvé");
    return project;
  }),

  /**
   * PUT /api/erp/projects/:id — Modifier un projet
   */
  update: erpPermissionProcedure("erp_projects", "edit").input(updateProjectSchema).mutation(async ({ ctx, input }) => {
    const db = (await getDb())!;
    const { id, ...updates } = input;
    const now = Date.now();

    const setValues: Record<string, unknown> = { updatedBy: ctx.user.id, updatedAt: now };
    if (updates.name !== undefined) setValues.name = updates.name;
    if (updates.description !== undefined) setValues.description = updates.description;
    if (updates.clientName !== undefined) setValues.clientName = updates.clientName;
    if (updates.location !== undefined) setValues.location = updates.location;
    if (updates.startDate !== undefined) setValues.startDate = updates.startDate;
    if (updates.plannedEndDate !== undefined) setValues.plannedEndDate = updates.plannedEndDate;
    if (updates.actualEndDate !== undefined) setValues.actualEndDate = updates.actualEndDate;
    if (updates.initialBudget !== undefined) setValues.initialBudget = updates.initialBudget;
    if (updates.revisedBudget !== undefined) setValues.revisedBudget = updates.revisedBudget;
    if (updates.status !== undefined) setValues.status = updates.status;
    if (updates.priority !== undefined) setValues.priority = updates.priority;
    if (updates.progressPercentage !== undefined) setValues.progressPercentage = updates.progressPercentage;
    if (updates.projectManagerId !== undefined) setValues.projectManagerId = updates.projectManagerId;

    await db.update(erpProjects).set(setValues).where(and(eq(erpProjects.id, id), isNull(erpProjects.deletedAt)));

    return { success: true };
  }),

  /**
   * DELETE /api/erp/projects/:id — Suppression logique (soft delete)
   */
  delete: erpPermissionProcedure("erp_projects", "delete").input(z.object({ id: z.number() })).mutation(async ({ ctx, input }) => {
    const db = (await getDb())!;
    const now = Date.now();

    await db.update(erpProjects).set({
      deletedAt: now,
      updatedBy: ctx.user.id,
      updatedAt: now,
    }).where(and(eq(erpProjects.id, input.id), isNull(erpProjects.deletedAt)));

    return { success: true };
  }),

  /**
   * POST /api/erp/projects/:id/archive — Archiver un projet
   */
  archive: erpPermissionProcedure("erp_projects", "edit").input(z.object({ id: z.number() })).mutation(async ({ ctx, input }) => {
    const db = (await getDb())!;
    const now = Date.now();

    await db.update(erpProjects).set({
      status: "completed",
      actualEndDate: now,
      updatedBy: ctx.user.id,
      updatedAt: now,
    }).where(and(eq(erpProjects.id, input.id), isNull(erpProjects.deletedAt)));

    return { success: true };
  }),

  /**
   * POST /api/erp/projects/:id/assign-manager — Affecter un chef de projet
   */
  assignManager: erpPermissionProcedure("erp_projects", "edit").input(z.object({
    id: z.number(),
    managerId: z.number(),
  })).mutation(async ({ ctx, input }) => {
    const db = (await getDb())!;
    const now = Date.now();

    await db.update(erpProjects).set({
      projectManagerId: input.managerId,
      updatedBy: ctx.user.id,
      updatedAt: now,
    }).where(and(eq(erpProjects.id, input.id), isNull(erpProjects.deletedAt)));

    return { success: true };
  }),

  /**
   * GET /api/erp/projects/:id/summary — Résumé du projet (stats tâches, budget, progression)
   */
  summary: erpPermissionProcedure("erp_projects", "view").input(z.object({ id: z.number() })).query(async ({ input }) => {
    const db = (await getDb())!;
    const now = Date.now();

    // Récupérer le projet
    const [project] = await db
      .select()
      .from(erpProjects)
      .where(and(eq(erpProjects.id, input.id), isNull(erpProjects.deletedAt)));

    if (!project) throw new Error("Projet non trouvé");

    // Stats des tâches
    const taskStats = await db
      .select({
        status: erpTasks.status,
        count: count(),
      })
      .from(erpTasks)
      .where(and(eq(erpTasks.projectId, input.id), isNull(erpTasks.deletedAt)))
      .groupBy(erpTasks.status);

    const totalTasks = taskStats.reduce((sum, s) => sum + s.count, 0);
    const completedTasks = taskStats.find(s => s.status === "completed")?.count ?? 0;
    const lateTasks = await db
      .select({ count: count() })
      .from(erpTasks)
      .where(and(
        eq(erpTasks.projectId, input.id),
        isNull(erpTasks.deletedAt),
        sql`${erpTasks.dueDate} < ${now}`,
        sql`${erpTasks.status} NOT IN ('completed', 'cancelled')`
      ));

    return {
      project: {
        id: project.id,
        code: project.code,
        name: project.name,
        status: project.status,
        priority: project.priority,
        progressPercentage: project.progressPercentage,
      },
      tasks: {
        total: totalTasks,
        completed: completedTasks,
        late: lateTasks[0]?.count ?? 0,
        byStatus: Object.fromEntries(taskStats.map(s => [s.status, s.count])),
      },
      budget: {
        initial: project.initialBudget,
        revised: project.revisedBudget,
        variance: (project.revisedBudget ?? 0) - (project.initialBudget ?? 0),
      },
      timeline: {
        startDate: project.startDate,
        plannedEndDate: project.plannedEndDate,
        actualEndDate: project.actualEndDate,
        isLate: project.plannedEndDate ? now > project.plannedEndDate && !project.actualEndDate : false,
      },
    };
  }),
});
