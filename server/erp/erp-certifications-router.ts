import { z } from "zod";
import { eq, and, isNull, lte, gte, desc, count } from "drizzle-orm";
import { router, erpPermissionProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { createAuditEvent } from "../db";
import { erpCertifications } from "../../drizzle/schema";

// ============================================================
// CONSTANTS
// ============================================================

const ENTITY_TYPES = ["vendor", "contractor", "equipment", "user"] as const;

const CERTIFICATION_STATUSES = [
  "active", "expired", "revoked", "pending_renewal"
] as const;

// ============================================================
// CERTIFICATIONS ROUTER
// ============================================================

export const erpCertificationsRouter = router({
  // ---- LIST ----
  list: erpPermissionProcedure("erp_vendors", "view")
    .input(z.object({
      entityType: z.enum(ENTITY_TYPES).optional(),
      entityId: z.number().optional(),
      status: z.enum(CERTIFICATION_STATUSES).optional(),
      search: z.string().optional(),
      limit: z.number().min(1).max(100).default(20),
      offset: z.number().min(0).default(0),
    }))
    .query(async ({ input }) => {
      const db = (await getDb())!;
      const conditions = [isNull(erpCertifications.deletedAt)];

      if (input.entityType) conditions.push(eq(erpCertifications.entityType, input.entityType));
      if (input.entityId) conditions.push(eq(erpCertifications.entityId, input.entityId));
      if (input.status) conditions.push(eq(erpCertifications.status, input.status));

      const where = and(...conditions);
      const [items, [{ total }]] = await Promise.all([
        db.select().from(erpCertifications).where(where).orderBy(desc(erpCertifications.createdAt)).limit(input.limit).offset(input.offset),
        db.select({ total: count() }).from(erpCertifications).where(where),
      ]);

      return { items, total };
    }),

  // ---- GET BY ID ----
  getById: erpPermissionProcedure("erp_vendors", "view")
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = (await getDb())!;
      const [cert] = await db.select().from(erpCertifications).where(and(eq(erpCertifications.id, input.id), isNull(erpCertifications.deletedAt)));
      if (!cert) throw new Error("Certification introuvable");
      return cert;
    }),

  // ---- CREATE ----
  create: erpPermissionProcedure("erp_vendors", "create")
    .input(z.object({
      entityType: z.enum(ENTITY_TYPES),
      entityId: z.number(),
      title: z.string().min(1).max(255),
      certNumber: z.string().optional(),
      issuedBy: z.string().optional(),
      issuedAt: z.number().optional(),
      expiresAt: z.number().optional(),
      alertDaysBefore: z.number().min(1).max(365).default(30),
      documentUrl: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = (await getDb())!;
      const now = Date.now();

      const [result] = await db.insert(erpCertifications).values({
        entityType: input.entityType,
        entityId: input.entityId,
        title: input.title,
        certNumber: input.certNumber,
        issuedBy: input.issuedBy,
        issuedAt: input.issuedAt,
        expiresAt: input.expiresAt,
        status: "active",
        alertDaysBefore: input.alertDaysBefore,
        documentUrl: input.documentUrl,
        createdBy: ctx.user.id,
        createdAt: now,
        updatedAt: now,
      });

      await createAuditEvent({ actorId: ctx.user.id, action: "erp.certifications.created", targetType: "erp_certification", targetId: result.insertId, details: { title: input.title, entityType: input.entityType, entityId: input.entityId } });
      return { id: result.insertId };
    }),

  // ---- UPDATE ----
  update: erpPermissionProcedure("erp_vendors", "update")
    .input(z.object({
      id: z.number(),
      title: z.string().min(1).max(255).optional(),
      certNumber: z.string().optional(),
      issuedBy: z.string().optional(),
      issuedAt: z.number().optional(),
      expiresAt: z.number().optional(),
      alertDaysBefore: z.number().min(1).max(365).optional(),
      documentUrl: z.string().optional(),
      status: z.enum(CERTIFICATION_STATUSES).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = (await getDb())!;
      const { id, ...updates } = input;

      await db.update(erpCertifications).set({ ...updates, updatedAt: Date.now() }).where(eq(erpCertifications.id, id));
      await createAuditEvent({ actorId: ctx.user.id, action: "erp.certifications.updated", targetType: "erp_certification", targetId: id, details: {} });
      return { success: true };
    }),

  // ---- DELETE (soft) ----
  delete: erpPermissionProcedure("erp_vendors", "delete")
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = (await getDb())!;
      await db.update(erpCertifications).set({ deletedAt: Date.now() }).where(eq(erpCertifications.id, input.id));
      await createAuditEvent({ actorId: ctx.user.id, action: "erp.certifications.deleted", targetType: "erp_certification", targetId: input.id, details: {} });
      return { success: true };
    }),

  // ---- EXPIRED ----
  expired: erpPermissionProcedure("erp_vendors", "view")
    .input(z.object({
      entityType: z.enum(ENTITY_TYPES).optional(),
      limit: z.number().min(1).max(100).default(50),
    }))
    .query(async ({ input }) => {
      const db = (await getDb())!;
      const now = Date.now();
      const conditions = [
        isNull(erpCertifications.deletedAt),
        lte(erpCertifications.expiresAt, now),
      ];
      if (input.entityType) conditions.push(eq(erpCertifications.entityType, input.entityType));

      const items = await db.select().from(erpCertifications)
        .where(and(...conditions))
        .orderBy(desc(erpCertifications.expiresAt))
        .limit(input.limit);

      return { items };
    }),

  // ---- UPCOMING EXPIRATIONS ----
  upcomingExpirations: erpPermissionProcedure("erp_vendors", "view")
    .input(z.object({
      daysAhead: z.number().min(1).max(365).default(60),
      entityType: z.enum(ENTITY_TYPES).optional(),
      limit: z.number().min(1).max(100).default(50),
    }))
    .query(async ({ input }) => {
      const db = (await getDb())!;
      const now = Date.now();
      const futureLimit = now + input.daysAhead * 24 * 60 * 60 * 1000;

      const conditions = [
        isNull(erpCertifications.deletedAt),
        gte(erpCertifications.expiresAt, now),
        lte(erpCertifications.expiresAt, futureLimit),
      ];
      if (input.entityType) conditions.push(eq(erpCertifications.entityType, input.entityType));

      const items = await db.select().from(erpCertifications)
        .where(and(...conditions))
        .orderBy(erpCertifications.expiresAt)
        .limit(input.limit);

      return { items };
    }),

  // ---- RENEW ----
  renew: erpPermissionProcedure("erp_vendors", "update")
    .input(z.object({
      id: z.number(),
      newExpiresAt: z.number(),
      newCertNumber: z.string().optional(),
      newDocumentUrl: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = (await getDb())!;
      const [cert] = await db.select().from(erpCertifications).where(eq(erpCertifications.id, input.id));
      if (!cert) throw new Error("Certification introuvable");

      await db.update(erpCertifications).set({
        expiresAt: input.newExpiresAt,
        renewedAt: Date.now(),
        status: "active",
        certNumber: input.newCertNumber || cert.certNumber,
        documentUrl: input.newDocumentUrl || cert.documentUrl,
        updatedAt: Date.now(),
      }).where(eq(erpCertifications.id, input.id));

      await createAuditEvent({ actorId: ctx.user.id, action: "erp.certifications.renewed", targetType: "erp_certification", targetId: input.id, details: { newExpiresAt: input.newExpiresAt } });
      return { success: true };
    }),
});
