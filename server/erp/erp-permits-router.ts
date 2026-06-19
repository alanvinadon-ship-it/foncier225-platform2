import { z } from "zod";
import { eq, and, isNull, like, or, desc, asc, count, lte, gte, sql } from "drizzle-orm";
import { router, erpPermissionProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { erpPermits } from "../../drizzle/schema";

const PERMIT_TYPES = [
  "permis_construire", "permis_demolir", "permis_amenager",
  "autorisation_travaux", "certificat_conformite", "certificat_urbanisme",
  "declaration_prealable", "autre"
] as const;

const PERMIT_STATUSES = [
  "pending", "validated", "rejected", "expired", "renewal_required"
] as const;

export const erpPermitsRouter = router({
  // List permits with filters and pagination
  list: erpPermissionProcedure("erp_compliance", "view")
    .input(z.object({
      projectId: z.number().optional(),
      type: z.enum(PERMIT_TYPES).optional(),
      status: z.enum(PERMIT_STATUSES).optional(),
      search: z.string().optional(),
      limit: z.number().min(1).max(100).default(20),
      offset: z.number().min(0).default(0),
    }))
    .query(async ({ input }) => {
      const db = (await getDb())!;
      const conditions = [isNull(erpPermits.deletedAt)];

      if (input.projectId) conditions.push(eq(erpPermits.projectId, input.projectId));
      if (input.type) conditions.push(eq(erpPermits.type, input.type));
      if (input.status) conditions.push(eq(erpPermits.status, input.status));
      if (input.search) {
        conditions.push(
          or(
            like(erpPermits.reference, `%${input.search}%`),
            like(erpPermits.type, `%${input.search}%`),
            like(erpPermits.issuedBy, `%${input.search}%`)
          )!
        );
      }

      const where = and(...conditions);

      const [items, totalResult] = await Promise.all([
        db.select()
          .from(erpPermits)
          .where(where)
          .orderBy(desc(erpPermits.createdAt))
          .limit(input.limit)
          .offset(input.offset),
        db.select({ count: count() }).from(erpPermits).where(where),
      ]);

      return { items, total: totalResult[0]?.count ?? 0 };
    }),

  // Create permit
  create: erpPermissionProcedure("erp_compliance", "create")
    .input(z.object({
      projectId: z.number().optional(),
      type: z.enum(PERMIT_TYPES),
      reference: z.string().max(128).optional(),
      description: z.string().optional(),
      issuedBy: z.string().max(255).optional(),
      issuedAt: z.number().optional(),
      expiresAt: z.number().optional(),
      alertDaysBefore: z.number().min(1).max(365).default(30),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = (await getDb())!;
      const now = Date.now();

      const [result] = await db.insert(erpPermits).values({
        projectId: input.projectId ?? null,
        type: input.type,
        reference: input.reference ?? null,
        description: input.description ?? null,
        issuedBy: input.issuedBy ?? null,
        issuedAt: input.issuedAt ?? null,
        expiresAt: input.expiresAt ?? null,
        status: "pending",
        alertDaysBefore: input.alertDaysBefore,
        createdBy: ctx.user.id,
        createdAt: now,
        updatedAt: now,
      });

      return { id: result.insertId, message: "Permis créé avec succès" };
    }),

  // Update permit
  update: erpPermissionProcedure("erp_compliance", "update")
    .input(z.object({
      id: z.number(),
      type: z.enum(PERMIT_TYPES).optional(),
      reference: z.string().max(128).nullable().optional(),
      description: z.string().nullable().optional(),
      issuedBy: z.string().max(255).nullable().optional(),
      issuedAt: z.number().nullable().optional(),
      expiresAt: z.number().nullable().optional(),
      alertDaysBefore: z.number().min(1).max(365).optional(),
    }))
    .mutation(async ({ input }) => {
      const db = (await getDb())!;
      const { id, ...updates } = input;

      await db.update(erpPermits)
        .set({ ...updates, updatedAt: Date.now() })
        .where(and(eq(erpPermits.id, id), isNull(erpPermits.deletedAt)));

      return { success: true };
    }),

  // Soft delete permit
  delete: erpPermissionProcedure("erp_compliance", "delete")
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = (await getDb())!;
      await db.update(erpPermits)
        .set({ deletedAt: Date.now(), updatedAt: Date.now() })
        .where(and(eq(erpPermits.id, input.id), isNull(erpPermits.deletedAt)));

      return { success: true };
    }),

  // Validate permit
  validate: erpPermissionProcedure("erp_compliance", "approve")
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = (await getDb())!;
      const now = Date.now();

      await db.update(erpPermits).set({
        status: "validated",
        validatedBy: ctx.user.id,
        validatedAt: now,
        updatedAt: now,
      }).where(and(eq(erpPermits.id, input.id), isNull(erpPermits.deletedAt)));

      return { success: true };
    }),

  // Reject permit
  reject: erpPermissionProcedure("erp_compliance", "approve")
    .input(z.object({
      id: z.number(),
      reason: z.string().min(1).max(1000),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = (await getDb())!;
      const now = Date.now();

      await db.update(erpPermits).set({
        status: "rejected",
        rejectedBy: ctx.user.id,
        rejectedAt: now,
        rejectionReason: input.reason,
        updatedAt: now,
      }).where(and(eq(erpPermits.id, input.id), isNull(erpPermits.deletedAt)));

      return { success: true };
    }),

  // Upcoming expirations (permits expiring within alertDaysBefore)
  upcomingExpirations: erpPermissionProcedure("erp_compliance", "view")
    .input(z.object({ daysAhead: z.number().min(1).max(365).default(60) }))
    .query(async ({ input }) => {
      const db = (await getDb())!;
      const now = Date.now();
      const futureLimit = now + (input.daysAhead * 24 * 60 * 60 * 1000);

      const items = await db.select()
        .from(erpPermits)
        .where(and(
          isNull(erpPermits.deletedAt),
          sql`${erpPermits.expiresAt} IS NOT NULL`,
          gte(erpPermits.expiresAt, now),
          lte(erpPermits.expiresAt, futureLimit),
          sql`${erpPermits.status} != 'expired'`
        ))
        .orderBy(asc(erpPermits.expiresAt));

      return items;
    }),
});
