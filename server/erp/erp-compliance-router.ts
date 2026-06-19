import { z } from "zod";
import { eq, and, isNull, like, or, desc, asc, count, lte, lt, gte, sql } from "drizzle-orm";
import { router, erpPermissionProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { erpComplianceRequirements, erpComplianceChecks } from "../../drizzle/schema";

const REQUIREMENT_CATEGORIES = [
  "general", "securite", "environnement", "urbanisme",
  "accessibilite", "incendie", "sanitaire", "electrique", "autre"
] as const;

const REQUIREMENT_PRIORITIES = ["low", "medium", "high", "critical"] as const;

const REQUIREMENT_STATUSES = [
  "pending", "in_progress", "completed", "non_compliant", "waived"
] as const;

const CHECK_STATUSES = [
  "pending", "passed", "failed", "partial", "not_applicable"
] as const;

export const erpComplianceRouter = router({
  // List requirements with filters and pagination
  listRequirements: erpPermissionProcedure("erp_compliance", "view")
    .input(z.object({
      projectId: z.number().optional(),
      category: z.enum(REQUIREMENT_CATEGORIES).optional(),
      priority: z.enum(REQUIREMENT_PRIORITIES).optional(),
      status: z.enum(REQUIREMENT_STATUSES).optional(),
      search: z.string().optional(),
      limit: z.number().min(1).max(100).default(20),
      offset: z.number().min(0).default(0),
    }))
    .query(async ({ input }) => {
      const db = (await getDb())!;
      const conditions = [isNull(erpComplianceRequirements.deletedAt)];

      if (input.projectId) conditions.push(eq(erpComplianceRequirements.projectId, input.projectId));
      if (input.category) conditions.push(eq(erpComplianceRequirements.category, input.category));
      if (input.priority) conditions.push(eq(erpComplianceRequirements.priority, input.priority));
      if (input.status) conditions.push(eq(erpComplianceRequirements.status, input.status));
      if (input.search) {
        conditions.push(
          or(
            like(erpComplianceRequirements.title, `%${input.search}%`),
            like(erpComplianceRequirements.description, `%${input.search}%`)
          )!
        );
      }

      const where = and(...conditions);

      const [items, totalResult] = await Promise.all([
        db.select()
          .from(erpComplianceRequirements)
          .where(where)
          .orderBy(desc(erpComplianceRequirements.createdAt))
          .limit(input.limit)
          .offset(input.offset),
        db.select({ count: count() }).from(erpComplianceRequirements).where(where),
      ]);

      return { items, total: totalResult[0]?.count ?? 0 };
    }),

  // Get requirement by ID with checks
  getRequirement: erpPermissionProcedure("erp_compliance", "view")
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = (await getDb())!;
      const [requirement] = await db.select()
        .from(erpComplianceRequirements)
        .where(and(eq(erpComplianceRequirements.id, input.id), isNull(erpComplianceRequirements.deletedAt)));

      if (!requirement) return null;

      const checks = await db.select()
        .from(erpComplianceChecks)
        .where(eq(erpComplianceChecks.requirementId, input.id))
        .orderBy(desc(erpComplianceChecks.createdAt));

      return { ...requirement, checks };
    }),

  // Create requirement
  createRequirement: erpPermissionProcedure("erp_compliance", "create")
    .input(z.object({
      projectId: z.number().optional(),
      title: z.string().min(1).max(255),
      description: z.string().optional(),
      category: z.enum(REQUIREMENT_CATEGORIES).default("general"),
      priority: z.enum(REQUIREMENT_PRIORITIES).default("medium"),
      dueDate: z.number().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = (await getDb())!;
      const now = Date.now();

      const [result] = await db.insert(erpComplianceRequirements).values({
        projectId: input.projectId ?? null,
        title: input.title,
        description: input.description ?? null,
        category: input.category,
        priority: input.priority,
        dueDate: input.dueDate ?? null,
        status: "pending",
        createdBy: ctx.user.id,
        createdAt: now,
        updatedAt: now,
      });

      return { id: result.insertId, message: "Exigence de conformité créée avec succès" };
    }),

  // Update requirement
  updateRequirement: erpPermissionProcedure("erp_compliance", "update")
    .input(z.object({
      id: z.number(),
      title: z.string().min(1).max(255).optional(),
      description: z.string().nullable().optional(),
      category: z.enum(REQUIREMENT_CATEGORIES).optional(),
      priority: z.enum(REQUIREMENT_PRIORITIES).optional(),
      dueDate: z.number().nullable().optional(),
      status: z.enum(REQUIREMENT_STATUSES).optional(),
    }))
    .mutation(async ({ input }) => {
      const db = (await getDb())!;
      const { id, ...updates } = input;

      await db.update(erpComplianceRequirements)
        .set({ ...updates, updatedAt: Date.now() })
        .where(and(eq(erpComplianceRequirements.id, id), isNull(erpComplianceRequirements.deletedAt)));

      return { success: true };
    }),

  // Soft delete requirement
  deleteRequirement: erpPermissionProcedure("erp_compliance", "delete")
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = (await getDb())!;
      await db.update(erpComplianceRequirements)
        .set({ deletedAt: Date.now(), updatedAt: Date.now() })
        .where(and(eq(erpComplianceRequirements.id, input.id), isNull(erpComplianceRequirements.deletedAt)));

      return { success: true };
    }),

  // Add a compliance check to a requirement
  addCheck: erpPermissionProcedure("erp_compliance", "approve")
    .input(z.object({
      requirementId: z.number(),
      status: z.enum(CHECK_STATUSES),
      comment: z.string().optional(),
      evidenceUrl: z.string().url().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = (await getDb())!;
      const now = Date.now();

      const [result] = await db.insert(erpComplianceChecks).values({
        requirementId: input.requirementId,
        checkedBy: ctx.user.id,
        status: input.status,
        comment: input.comment ?? null,
        evidenceUrl: input.evidenceUrl ?? null,
        checkedAt: now,
        createdAt: now,
      });

      // Auto-update requirement status based on check result
      if (input.status === "passed") {
        await db.update(erpComplianceRequirements)
          .set({ status: "completed", updatedAt: now })
          .where(eq(erpComplianceRequirements.id, input.requirementId));
      } else if (input.status === "failed") {
        await db.update(erpComplianceRequirements)
          .set({ status: "non_compliant", updatedAt: now })
          .where(eq(erpComplianceRequirements.id, input.requirementId));
      }

      return { id: result.insertId, message: "Vérification ajoutée avec succès" };
    }),

  // Get expired requirements (dueDate < now, status != completed)
  expiredRequirements: erpPermissionProcedure("erp_compliance", "view")
    .input(z.object({
      projectId: z.number().optional(),
    }).optional())
    .query(async ({ input }) => {
      const db = (await getDb())!;
      const now = Date.now();

      const conditions = [
        isNull(erpComplianceRequirements.deletedAt),
        sql`${erpComplianceRequirements.dueDate} IS NOT NULL`,
        lt(erpComplianceRequirements.dueDate, now),
        sql`${erpComplianceRequirements.status} NOT IN ('completed', 'waived')`,
      ];

      if (input?.projectId) {
        conditions.push(eq(erpComplianceRequirements.projectId, input.projectId));
      }

      const items = await db.select()
        .from(erpComplianceRequirements)
        .where(and(...conditions))
        .orderBy(asc(erpComplianceRequirements.dueDate));

      return items;
    }),

  // Get upcoming requirements (dueDate within X days)
  upcomingRequirements: erpPermissionProcedure("erp_compliance", "view")
    .input(z.object({
      daysAhead: z.number().min(1).max(365).default(30),
      projectId: z.number().optional(),
    }))
    .query(async ({ input }) => {
      const db = (await getDb())!;
      const now = Date.now();
      const futureLimit = now + (input.daysAhead * 24 * 60 * 60 * 1000);

      const conditions = [
        isNull(erpComplianceRequirements.deletedAt),
        sql`${erpComplianceRequirements.dueDate} IS NOT NULL`,
        gte(erpComplianceRequirements.dueDate, now),
        lte(erpComplianceRequirements.dueDate, futureLimit),
        sql`${erpComplianceRequirements.status} NOT IN ('completed', 'waived')`,
      ];

      if (input.projectId) {
        conditions.push(eq(erpComplianceRequirements.projectId, input.projectId));
      }

      const items = await db.select()
        .from(erpComplianceRequirements)
        .where(and(...conditions))
        .orderBy(asc(erpComplianceRequirements.dueDate));

      return items;
    }),

  // Stats summary for compliance
  stats: erpPermissionProcedure("erp_compliance", "view")
    .input(z.object({ projectId: z.number().optional() }).optional())
    .query(async ({ input }) => {
      const db = (await getDb())!;
      const now = Date.now();

      const baseConditions = [isNull(erpComplianceRequirements.deletedAt)];
      if (input?.projectId) {
        baseConditions.push(eq(erpComplianceRequirements.projectId, input.projectId));
      }

      const [totalResult] = await db.select({ count: count() })
        .from(erpComplianceRequirements)
        .where(and(...baseConditions));

      const [completedResult] = await db.select({ count: count() })
        .from(erpComplianceRequirements)
        .where(and(...baseConditions, eq(erpComplianceRequirements.status, "completed")));

      const [nonCompliantResult] = await db.select({ count: count() })
        .from(erpComplianceRequirements)
        .where(and(...baseConditions, eq(erpComplianceRequirements.status, "non_compliant")));

      const [expiredResult] = await db.select({ count: count() })
        .from(erpComplianceRequirements)
        .where(and(
          ...baseConditions,
          sql`${erpComplianceRequirements.dueDate} IS NOT NULL`,
          lt(erpComplianceRequirements.dueDate, now),
          sql`${erpComplianceRequirements.status} NOT IN ('completed', 'waived')`
        ));

      return {
        total: totalResult?.count ?? 0,
        completed: completedResult?.count ?? 0,
        nonCompliant: nonCompliantResult?.count ?? 0,
        expired: expiredResult?.count ?? 0,
        complianceRate: (totalResult?.count ?? 0) > 0
          ? Math.round(((completedResult?.count ?? 0) / (totalResult?.count ?? 1)) * 100)
          : 0,
      };
    }),
});
