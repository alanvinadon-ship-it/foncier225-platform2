import { z } from "zod";
import { eq, and, isNull, like, or, desc, count } from "drizzle-orm";
import { router, erpPermissionProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { createAuditEvent } from "../db";
import { erpContractors, erpProjectContractors, erpContracts, erpProjects } from "../../drizzle/schema";

// ============================================================
// CONSTANTS
// ============================================================

const CONTRACTOR_SPECIALTIES = [
  "general", "gros_oeuvre", "electricite", "plomberie", "peinture",
  "menuiserie", "carrelage", "toiture", "vrd", "autre"
] as const;

const CONTRACTOR_STATUSES = [
  "active", "inactive", "suspended", "blacklisted", "pending_approval"
] as const;

const CONTRACT_STATUSES = [
  "draft", "active", "completed", "terminated", "expired"
] as const;

// ============================================================
// CONTRACTORS ROUTER
// ============================================================

export const erpContractorsRouter = router({
  // ---- LIST ----
  list: erpPermissionProcedure("erp_contractors", "view")
    .input(z.object({
      specialty: z.enum(CONTRACTOR_SPECIALTIES).optional(),
      status: z.enum(CONTRACTOR_STATUSES).optional(),
      search: z.string().optional(),
      limit: z.number().min(1).max(100).default(20),
      offset: z.number().min(0).default(0),
    }))
    .query(async ({ input }) => {
      const db = (await getDb())!;
      const conditions = [isNull(erpContractors.deletedAt)];

      if (input.specialty) conditions.push(eq(erpContractors.specialty, input.specialty));
      if (input.status) conditions.push(eq(erpContractors.status, input.status));
      if (input.search) {
        conditions.push(or(
          like(erpContractors.name, `%${input.search}%`),
          like(erpContractors.email, `%${input.search}%`),
        )!);
      }

      const where = and(...conditions);
      const [items, [{ total }]] = await Promise.all([
        db.select().from(erpContractors).where(where).orderBy(desc(erpContractors.createdAt)).limit(input.limit).offset(input.offset),
        db.select({ total: count() }).from(erpContractors).where(where),
      ]);

      return { items, total };
    }),

  // ---- GET BY ID ----
  getById: erpPermissionProcedure("erp_contractors", "view")
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = (await getDb())!;
      const [contractor] = await db.select().from(erpContractors).where(and(eq(erpContractors.id, input.id), isNull(erpContractors.deletedAt)));
      if (!contractor) throw new Error("Sous-traitant introuvable");

      const assignments = await db.select().from(erpProjectContractors).where(eq(erpProjectContractors.contractorId, input.id));
      const contracts = await db.select().from(erpContracts).where(eq(erpContracts.contractorId, input.id));

      return { ...contractor, assignments, contracts };
    }),

  // ---- CREATE ----
  create: erpPermissionProcedure("erp_contractors", "create")
    .input(z.object({
      name: z.string().min(1).max(255),
      description: z.string().optional(),
      specialty: z.enum(CONTRACTOR_SPECIALTIES).default("general"),
      email: z.string().email().optional(),
      phone: z.string().optional(),
      address: z.string().optional(),
      licenseNumber: z.string().optional(),
      insuranceExpiry: z.number().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = (await getDb())!;
      const now = Date.now();

      const [result] = await db.insert(erpContractors).values({
        name: input.name,
        description: input.description,
        specialty: input.specialty,
        status: "pending_approval",
        email: input.email,
        phone: input.phone,
        address: input.address,
        licenseNumber: input.licenseNumber,
        insuranceExpiry: input.insuranceExpiry,
        createdBy: ctx.user.id,
        createdAt: now,
        updatedAt: now,
      });

      await createAuditEvent({ actorId: ctx.user.id, action: "erp.contractors.created", targetType: "erp_contractor", targetId: result.insertId, details: { name: input.name } });
      return { id: result.insertId };
    }),

  // ---- UPDATE ----
  update: erpPermissionProcedure("erp_contractors", "update")
    .input(z.object({
      id: z.number(),
      name: z.string().min(1).max(255).optional(),
      description: z.string().optional(),
      specialty: z.enum(CONTRACTOR_SPECIALTIES).optional(),
      email: z.string().email().optional(),
      phone: z.string().optional(),
      address: z.string().optional(),
      licenseNumber: z.string().optional(),
      insuranceExpiry: z.number().optional(),
      rating: z.number().min(1).max(5).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = (await getDb())!;
      const { id, ...updates } = input;

      await db.update(erpContractors).set({ ...updates, updatedAt: Date.now() }).where(eq(erpContractors.id, id));
      await createAuditEvent({ actorId: ctx.user.id, action: "erp.contractors.updated", targetType: "erp_contractor", targetId: id, details: {} });
      return { success: true };
    }),

  // ---- DELETE (soft) ----
  delete: erpPermissionProcedure("erp_contractors", "delete")
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = (await getDb())!;
      // Check no active assignments
      const activeAssignments = await db.select().from(erpProjectContractors)
        .where(and(eq(erpProjectContractors.contractorId, input.id), isNull(erpProjectContractors.releasedAt)));
      if (activeAssignments.length > 0) throw new Error("Impossible de supprimer : sous-traitant affecté à un projet actif");

      await db.update(erpContractors).set({ deletedAt: Date.now() }).where(eq(erpContractors.id, input.id));
      await createAuditEvent({ actorId: ctx.user.id, action: "erp.contractors.deleted", targetType: "erp_contractor", targetId: input.id, details: {} });
      return { success: true };
    }),

  // ---- UPDATE STATUS ----
  updateStatus: erpPermissionProcedure("erp_contractors", "validate")
    .input(z.object({
      id: z.number(),
      status: z.enum(CONTRACTOR_STATUSES),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = (await getDb())!;
      const [contractor] = await db.select().from(erpContractors).where(eq(erpContractors.id, input.id));
      if (!contractor) throw new Error("Sous-traitant introuvable");

      await db.update(erpContractors).set({ status: input.status, updatedAt: Date.now() }).where(eq(erpContractors.id, input.id));
      await createAuditEvent({ actorId: ctx.user.id, action: "erp.contractors.status_changed", targetType: "erp_contractor", targetId: input.id, details: { from: contractor.status, to: input.status } });
      return { success: true };
    }),

  // ---- ASSIGN TO PROJECT ----
  assignToProject: erpPermissionProcedure("erp_contractors", "assign")
    .input(z.object({
      contractorId: z.number(),
      projectId: z.number(),
      role: z.string().optional(),
      startDate: z.number().optional(),
      endDate: z.number().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = (await getDb())!;

      // Verify contractor exists and is active
      const [contractor] = await db.select().from(erpContractors).where(and(eq(erpContractors.id, input.contractorId), isNull(erpContractors.deletedAt)));
      if (!contractor) throw new Error("Sous-traitant introuvable");
      if (contractor.status === "blacklisted") throw new Error("Sous-traitant blacklisté — affectation impossible");
      if (contractor.status !== "active") throw new Error("Sous-traitant non actif — affectation impossible");

      // Verify project exists
      const [project] = await db.select().from(erpProjects).where(eq(erpProjects.id, input.projectId));
      if (!project) throw new Error("Projet introuvable");

      const [result] = await db.insert(erpProjectContractors).values({
        projectId: input.projectId,
        contractorId: input.contractorId,
        role: input.role,
        startDate: input.startDate,
        endDate: input.endDate,
        assignedBy: ctx.user.id,
        assignedAt: Date.now(),
      });

      await createAuditEvent({ actorId: ctx.user.id, action: "erp.contractors.assigned", targetType: "erp_project_contractor", targetId: result.insertId, details: { contractorId: input.contractorId, projectId: input.projectId } });
      return { id: result.insertId };
    }),

  // ---- RELEASE FROM PROJECT ----
  releaseFromProject: erpPermissionProcedure("erp_contractors", "assign")
    .input(z.object({ assignmentId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = (await getDb())!;
      await db.update(erpProjectContractors).set({ releasedAt: Date.now() }).where(eq(erpProjectContractors.id, input.assignmentId));
      await createAuditEvent({ actorId: ctx.user.id, action: "erp.contractors.released", targetType: "erp_project_contractor", targetId: input.assignmentId, details: {} });
      return { success: true };
    }),

  // ---- LIST CONTRACTS ----
  listContracts: erpPermissionProcedure("erp_contractors", "view")
    .input(z.object({
      contractorId: z.number().optional(),
      projectId: z.number().optional(),
      status: z.enum(CONTRACT_STATUSES).optional(),
      limit: z.number().min(1).max(100).default(20),
      offset: z.number().min(0).default(0),
    }))
    .query(async ({ input }) => {
      const db = (await getDb())!;
      const conditions: any[] = [];

      if (input.contractorId) conditions.push(eq(erpContracts.contractorId, input.contractorId));
      if (input.projectId) conditions.push(eq(erpContracts.projectId, input.projectId));
      if (input.status) conditions.push(eq(erpContracts.status, input.status));

      const where = conditions.length > 0 ? and(...conditions) : undefined;
      const [items, [{ total }]] = await Promise.all([
        db.select().from(erpContracts).where(where).orderBy(desc(erpContracts.createdAt)).limit(input.limit).offset(input.offset),
        db.select({ total: count() }).from(erpContracts).where(where),
      ]);

      return { items, total };
    }),

  // ---- CREATE CONTRACT ----
  createContract: erpPermissionProcedure("erp_contractors", "create")
    .input(z.object({
      contractorId: z.number().optional(),
      projectId: z.number().optional(),
      title: z.string().min(1).max(255),
      reference: z.string().optional(),
      amount: z.number().optional(),
      startDate: z.number().optional(),
      endDate: z.number().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = (await getDb())!;
      const now = Date.now();

      const [result] = await db.insert(erpContracts).values({
        contractorId: input.contractorId,
        projectId: input.projectId,
        title: input.title,
        reference: input.reference,
        amount: input.amount,
        startDate: input.startDate,
        endDate: input.endDate,
        status: "draft",
        createdBy: ctx.user.id,
        createdAt: now,
        updatedAt: now,
      });

      await createAuditEvent({ actorId: ctx.user.id, action: "erp.contracts.created", targetType: "erp_contract", targetId: result.insertId, details: { title: input.title } });
      return { id: result.insertId };
    }),

  // ---- UPDATE CONTRACT ----
  updateContract: erpPermissionProcedure("erp_contractors", "update")
    .input(z.object({
      id: z.number(),
      title: z.string().min(1).max(255).optional(),
      reference: z.string().optional(),
      amount: z.number().optional(),
      startDate: z.number().optional(),
      endDate: z.number().optional(),
      status: z.enum(CONTRACT_STATUSES).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = (await getDb())!;
      const { id, ...updates } = input;

      await db.update(erpContracts).set({ ...updates, updatedAt: Date.now() }).where(eq(erpContracts.id, id));
      await createAuditEvent({ actorId: ctx.user.id, action: "erp.contracts.updated", targetType: "erp_contract", targetId: id, details: {} });
      return { success: true };
    }),
});
