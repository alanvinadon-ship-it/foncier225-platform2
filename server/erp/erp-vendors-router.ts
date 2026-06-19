import { z } from "zod";
import { eq, and, isNull, like, or, sql, desc, count } from "drizzle-orm";
import { router, erpPermissionProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { createAuditEvent } from "../db";
import { erpVendors, erpVendorContacts } from "../../drizzle/schema";

// ============================================================
// CONSTANTS
// ============================================================

const VENDOR_CATEGORIES = [
  "general", "materials", "equipment", "services", "transport", "consulting", "autre"
] as const;

const VENDOR_STATUSES = [
  "active", "inactive", "suspended", "blacklisted", "pending_approval"
] as const;

// ============================================================
// VENDORS ROUTER
// ============================================================

export const erpVendorsRouter = router({
  // ---- LIST ----
  list: erpPermissionProcedure("erp_vendors", "view")
    .input(z.object({
      category: z.enum(VENDOR_CATEGORIES).optional(),
      status: z.enum(VENDOR_STATUSES).optional(),
      search: z.string().optional(),
      limit: z.number().min(1).max(100).default(20),
      offset: z.number().min(0).default(0),
    }))
    .query(async ({ input }) => {
      const db = (await getDb())!;
      const conditions = [isNull(erpVendors.deletedAt)];

      if (input.category) conditions.push(eq(erpVendors.category, input.category));
      if (input.status) conditions.push(eq(erpVendors.status, input.status));
      if (input.search) {
        conditions.push(or(
          like(erpVendors.name, `%${input.search}%`),
          like(erpVendors.email, `%${input.search}%`),
        )!);
      }

      const where = and(...conditions);
      const [items, [{ total }]] = await Promise.all([
        db.select().from(erpVendors).where(where).orderBy(desc(erpVendors.createdAt)).limit(input.limit).offset(input.offset),
        db.select({ total: count() }).from(erpVendors).where(where),
      ]);

      return { items, total };
    }),

  // ---- GET BY ID ----
  getById: erpPermissionProcedure("erp_vendors", "view")
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = (await getDb())!;
      const [vendor] = await db.select().from(erpVendors).where(and(eq(erpVendors.id, input.id), isNull(erpVendors.deletedAt)));
      if (!vendor) throw new Error("Fournisseur introuvable");

      const contacts = await db.select().from(erpVendorContacts).where(eq(erpVendorContacts.vendorId, input.id));

      return { ...vendor, contacts };
    }),

  // ---- CREATE ----
  create: erpPermissionProcedure("erp_vendors", "create")
    .input(z.object({
      name: z.string().min(1).max(255),
      description: z.string().optional(),
      category: z.enum(VENDOR_CATEGORIES).default("general"),
      email: z.string().email().optional(),
      phone: z.string().optional(),
      address: z.string().optional(),
      website: z.string().optional(),
      taxId: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = (await getDb())!;
      const now = Date.now();

      const [result] = await db.insert(erpVendors).values({
        name: input.name,
        description: input.description,
        category: input.category,
        status: "pending_approval",
        email: input.email,
        phone: input.phone,
        address: input.address,
        website: input.website,
        taxId: input.taxId,
        createdBy: ctx.user.id,
        createdAt: now,
        updatedAt: now,
      });

      await createAuditEvent({ actorId: ctx.user.id, action: "erp.vendors.created", targetType: "erp_vendor", targetId: result.insertId, details: { name: input.name } });
      return { id: result.insertId };
    }),

  // ---- UPDATE ----
  update: erpPermissionProcedure("erp_vendors", "update")
    .input(z.object({
      id: z.number(),
      name: z.string().min(1).max(255).optional(),
      description: z.string().optional(),
      category: z.enum(VENDOR_CATEGORIES).optional(),
      email: z.string().email().optional(),
      phone: z.string().optional(),
      address: z.string().optional(),
      website: z.string().optional(),
      taxId: z.string().optional(),
      rating: z.number().min(1).max(5).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = (await getDb())!;
      const { id, ...updates } = input;

      await db.update(erpVendors).set({ ...updates, updatedAt: Date.now() }).where(eq(erpVendors.id, id));
      await createAuditEvent({ actorId: ctx.user.id, action: "erp.vendors.updated", targetType: "erp_vendor", targetId: id, details: {} });
      return { success: true };
    }),

  // ---- DELETE (soft) ----
  delete: erpPermissionProcedure("erp_vendors", "delete")
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = (await getDb())!;
      await db.update(erpVendors).set({ deletedAt: Date.now() }).where(eq(erpVendors.id, input.id));
      await createAuditEvent({ actorId: ctx.user.id, action: "erp.vendors.deleted", targetType: "erp_vendor", targetId: input.id, details: {} });
      return { success: true };
    }),

  // ---- UPDATE STATUS ----
  updateStatus: erpPermissionProcedure("erp_vendors", "validate")
    .input(z.object({
      id: z.number(),
      status: z.enum(VENDOR_STATUSES),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = (await getDb())!;
      const [vendor] = await db.select().from(erpVendors).where(eq(erpVendors.id, input.id));
      if (!vendor) throw new Error("Fournisseur introuvable");

      await db.update(erpVendors).set({ status: input.status, updatedAt: Date.now() }).where(eq(erpVendors.id, input.id));
      await createAuditEvent({ actorId: ctx.user.id, action: "erp.vendors.status_changed", targetType: "erp_vendor", targetId: input.id, details: { from: vendor.status, to: input.status } });
      return { success: true };
    }),

  // ---- ADD CONTACT ----
  addContact: erpPermissionProcedure("erp_vendors", "create")
    .input(z.object({
      vendorId: z.number(),
      name: z.string().min(1).max(255),
      role: z.string().optional(),
      email: z.string().email().optional(),
      phone: z.string().optional(),
      isPrimary: z.boolean().default(false),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = (await getDb())!;

      // If setting as primary, unset other primaries
      if (input.isPrimary) {
        await db.update(erpVendorContacts).set({ isPrimary: false }).where(eq(erpVendorContacts.vendorId, input.vendorId));
      }

      const [result] = await db.insert(erpVendorContacts).values({
        vendorId: input.vendorId,
        name: input.name,
        role: input.role,
        email: input.email,
        phone: input.phone,
        isPrimary: input.isPrimary,
        createdAt: Date.now(),
      });

      await createAuditEvent({ actorId: ctx.user.id, action: "erp.vendors.contact_added", targetType: "erp_vendor", targetId: input.vendorId, details: { contactId: result.insertId } });
      return { id: result.insertId };
    }),

  // ---- DELETE CONTACT ----
  deleteContact: erpPermissionProcedure("erp_vendors", "delete")
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = (await getDb())!;
      await db.delete(erpVendorContacts).where(eq(erpVendorContacts.id, input.id));
      await createAuditEvent({ actorId: ctx.user.id, action: "erp.vendors.contact_deleted", targetType: "erp_vendor_contact", targetId: input.id, details: {} });
      return { success: true };
    }),
});
