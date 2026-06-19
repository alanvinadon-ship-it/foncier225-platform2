import { z } from "zod";
import { eq, and, isNull, like, or, sql, desc, asc, count, lte, gte } from "drizzle-orm";
import { router, erpPermissionProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { createAuditEvent } from "../db";
import { erpEquipment, erpEquipmentAllocations, erpEquipmentMaintenance, erpProjects } from "../../drizzle/schema";

// ============================================================
// CONSTANTS
// ============================================================

const EQUIPMENT_CATEGORIES = [
  "engin_chantier", "vehicule", "outillage", "mesure", "securite",
  "electricite", "plomberie", "maconnerie", "coffrage", "levage", "autre"
] as const;

const EQUIPMENT_STATUSES = [
  "available", "assigned", "in_maintenance", "out_of_service", "lost", "retired"
] as const;

const MAINTENANCE_TYPES = [
  "preventive", "corrective", "inspection", "calibration", "revision", "autre"
] as const;

const MAINTENANCE_STATUSES = [
  "scheduled", "in_progress", "completed", "cancelled", "overdue"
] as const;

// ============================================================
// EQUIPMENT ROUTER
// ============================================================

export const erpEquipmentRouter = router({
  // ---- LIST ----
  list: erpPermissionProcedure("erp_equipment", "view")
    .input(z.object({
      projectId: z.number().optional(),
      category: z.enum(EQUIPMENT_CATEGORIES).optional(),
      status: z.enum(EQUIPMENT_STATUSES).optional(),
      search: z.string().optional(),
      limit: z.number().min(1).max(100).default(20),
      offset: z.number().min(0).default(0),
    }))
    .query(async ({ input }) => {
      const db = (await getDb())!;
      const conditions = [isNull(erpEquipment.deletedAt)];

      if (input.projectId) conditions.push(eq(erpEquipment.projectId, input.projectId));
      if (input.category) conditions.push(eq(erpEquipment.category, input.category));
      if (input.status) conditions.push(eq(erpEquipment.status, input.status));
      if (input.search) {
        conditions.push(
          or(
            like(erpEquipment.name, `%${input.search}%`),
            like(erpEquipment.code, `%${input.search}%`),
            like(erpEquipment.brand, `%${input.search}%`),
            like(erpEquipment.serialNumber, `%${input.search}%`)
          )!
        );
      }

      const where = and(...conditions);

      const [items, totalResult] = await Promise.all([
        db.select()
          .from(erpEquipment)
          .where(where)
          .orderBy(desc(erpEquipment.createdAt))
          .limit(input.limit)
          .offset(input.offset),
        db.select({ count: count() }).from(erpEquipment).where(where),
      ]);

      return { items, total: totalResult[0].count };
    }),

  // ---- GET BY ID ----
  getById: erpPermissionProcedure("erp_equipment", "view")
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = (await getDb())!;

      const [equipment] = await db.select()
        .from(erpEquipment)
        .where(and(eq(erpEquipment.id, input.id), isNull(erpEquipment.deletedAt)));

      if (!equipment) throw new Error("Équipement introuvable");

      const allocations = await db.select()
        .from(erpEquipmentAllocations)
        .where(eq(erpEquipmentAllocations.equipmentId, input.id))
        .orderBy(desc(erpEquipmentAllocations.allocatedAt));

      const maintenance = await db.select()
        .from(erpEquipmentMaintenance)
        .where(eq(erpEquipmentMaintenance.equipmentId, input.id))
        .orderBy(desc(erpEquipmentMaintenance.scheduledAt));

      return { ...equipment, allocations, maintenance };
    }),

  // ---- CREATE ----
  create: erpPermissionProcedure("erp_equipment", "create")
    .input(z.object({
      code: z.string().min(2).max(32),
      name: z.string().min(2).max(255),
      description: z.string().optional(),
      category: z.enum(EQUIPMENT_CATEGORIES),
      brand: z.string().max(128).optional(),
      model: z.string().max(128).optional(),
      serialNumber: z.string().max(128).optional(),
      purchaseDate: z.number().optional(),
      purchasePrice: z.number().optional(),
      currentValue: z.number().optional(),
      location: z.string().max(255).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = (await getDb())!;
      const now = Date.now();

      const [result] = await db.insert(erpEquipment).values({
        code: input.code,
        name: input.name,
        description: input.description || null,
        category: input.category,
        brand: input.brand || null,
        model: input.model || null,
        serialNumber: input.serialNumber || null,
        status: "available",
        purchaseDate: input.purchaseDate || null,
        purchasePrice: input.purchasePrice || null,
        currentValue: input.currentValue || null,
        location: input.location || null,
        createdBy: ctx.user.id,
        createdAt: now,
        updatedAt: now,
      });

      await createAuditEvent({
        actorId: ctx.user.id,
        action: "erp.equipment.created",
        targetType: "erp_equipment",
        targetId: result.insertId,
        details: { code: input.code, name: input.name, category: input.category },
      });

      return { id: result.insertId };
    }),

  // ---- UPDATE ----
  update: erpPermissionProcedure("erp_equipment", "update")
    .input(z.object({
      id: z.number(),
      name: z.string().min(2).max(255).optional(),
      description: z.string().optional(),
      category: z.enum(EQUIPMENT_CATEGORIES).optional(),
      brand: z.string().max(128).optional(),
      model: z.string().max(128).optional(),
      serialNumber: z.string().max(128).optional(),
      purchaseDate: z.number().optional(),
      purchasePrice: z.number().optional(),
      currentValue: z.number().optional(),
      location: z.string().max(255).optional(),
      status: z.enum(EQUIPMENT_STATUSES).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = (await getDb())!;
      const { id, ...updates } = input;

      const [existing] = await db.select().from(erpEquipment)
        .where(and(eq(erpEquipment.id, id), isNull(erpEquipment.deletedAt)));
      if (!existing) throw new Error("Équipement introuvable");

      const setValues: Record<string, unknown> = { updatedAt: Date.now() };
      if (updates.name) setValues.name = updates.name;
      if (updates.description !== undefined) setValues.description = updates.description || null;
      if (updates.category) setValues.category = updates.category;
      if (updates.brand !== undefined) setValues.brand = updates.brand || null;
      if (updates.model !== undefined) setValues.model = updates.model || null;
      if (updates.serialNumber !== undefined) setValues.serialNumber = updates.serialNumber || null;
      if (updates.purchaseDate !== undefined) setValues.purchaseDate = updates.purchaseDate;
      if (updates.purchasePrice !== undefined) setValues.purchasePrice = updates.purchasePrice;
      if (updates.currentValue !== undefined) setValues.currentValue = updates.currentValue;
      if (updates.location !== undefined) setValues.location = updates.location || null;
      if (updates.status) setValues.status = updates.status;

      await db.update(erpEquipment).set(setValues).where(eq(erpEquipment.id, id));

      await createAuditEvent({
        actorId: ctx.user.id,
        action: "erp.equipment.updated",
        targetType: "erp_equipment",
        targetId: id,
        details: { changes: Object.keys(updates) },
      });

      return { success: true };
    }),

  // ---- DELETE (soft) ----
  delete: erpPermissionProcedure("erp_equipment", "update")
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = (await getDb())!;

      const [existing] = await db.select().from(erpEquipment)
        .where(and(eq(erpEquipment.id, input.id), isNull(erpEquipment.deletedAt)));
      if (!existing) throw new Error("Équipement introuvable");

      if (existing.status === "assigned") {
        throw new Error("Impossible de supprimer un équipement actuellement affecté. Libérez-le d'abord.");
      }

      await db.update(erpEquipment).set({
        deletedAt: Date.now(),
        status: "retired",
        updatedAt: Date.now(),
      }).where(eq(erpEquipment.id, input.id));

      await createAuditEvent({
        actorId: ctx.user.id,
        action: "erp.equipment.deleted",
        targetType: "erp_equipment",
        targetId: input.id,
        details: { code: existing.code, name: existing.name },
      });

      return { success: true };
    }),

  // ---- ASSIGN TO PROJECT ----
  assign: erpPermissionProcedure("erp_equipment", "assign")
    .input(z.object({
      id: z.number(),
      projectId: z.number(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = (await getDb())!;

      const [equipment] = await db.select().from(erpEquipment)
        .where(and(eq(erpEquipment.id, input.id), isNull(erpEquipment.deletedAt)));
      if (!equipment) throw new Error("Équipement introuvable");

      // Vérifier disponibilité
      if (equipment.status !== "available") {
        throw new Error(`Impossible d'affecter : l'équipement est actuellement "${equipment.status}". Seuls les équipements disponibles peuvent être affectés.`);
      }

      // Vérifier que le projet existe
      const [project] = await db.select().from(erpProjects)
        .where(eq(erpProjects.id, input.projectId));
      if (!project) throw new Error("Projet introuvable");

      const now = Date.now();

      // Créer l'allocation
      await db.insert(erpEquipmentAllocations).values({
        equipmentId: input.id,
        projectId: input.projectId,
        allocatedBy: ctx.user.id,
        allocatedAt: now,
        notes: input.notes || null,
      });

      // Mettre à jour le statut et le projet
      await db.update(erpEquipment).set({
        status: "assigned",
        projectId: input.projectId,
        updatedAt: now,
      }).where(eq(erpEquipment.id, input.id));

      await createAuditEvent({
        actorId: ctx.user.id,
        action: "erp.equipment.assigned",
        targetType: "erp_equipment",
        targetId: input.id,
        details: { projectId: input.projectId, projectName: project.name, equipmentCode: equipment.code },
      });

      return { success: true };
    }),

  // ---- RELEASE FROM PROJECT ----
  release: erpPermissionProcedure("erp_equipment", "assign")
    .input(z.object({
      id: z.number(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = (await getDb())!;

      const [equipment] = await db.select().from(erpEquipment)
        .where(and(eq(erpEquipment.id, input.id), isNull(erpEquipment.deletedAt)));
      if (!equipment) throw new Error("Équipement introuvable");

      if (equipment.status !== "assigned") {
        throw new Error("Cet équipement n'est pas actuellement affecté à un projet.");
      }

      const now = Date.now();

      // Fermer l'allocation active (la plus récente sans releasedAt)
      const [activeAlloc] = await db.select()
        .from(erpEquipmentAllocations)
        .where(and(
          eq(erpEquipmentAllocations.equipmentId, input.id),
          isNull(erpEquipmentAllocations.releasedAt)
        ))
        .orderBy(desc(erpEquipmentAllocations.allocatedAt))
        .limit(1);

      if (activeAlloc) {
        await db.update(erpEquipmentAllocations).set({
          releasedAt: now,
          releasedBy: ctx.user.id,
        }).where(eq(erpEquipmentAllocations.id, activeAlloc.id));
      }

      // Remettre disponible
      await db.update(erpEquipment).set({
        status: "available",
        projectId: null,
        updatedAt: now,
      }).where(eq(erpEquipment.id, input.id));

      await createAuditEvent({
        actorId: ctx.user.id,
        action: "erp.equipment.released",
        targetType: "erp_equipment",
        targetId: input.id,
        details: { equipmentCode: equipment.code, previousProjectId: equipment.projectId },
      });

      return { success: true };
    }),

  // ---- LIST MAINTENANCE ----
  listMaintenance: erpPermissionProcedure("erp_equipment", "view")
    .input(z.object({
      equipmentId: z.number(),
      limit: z.number().min(1).max(100).default(20),
      offset: z.number().min(0).default(0),
    }))
    .query(async ({ input }) => {
      const db = (await getDb())!;

      const items = await db.select()
        .from(erpEquipmentMaintenance)
        .where(eq(erpEquipmentMaintenance.equipmentId, input.equipmentId))
        .orderBy(desc(erpEquipmentMaintenance.scheduledAt))
        .limit(input.limit)
        .offset(input.offset);

      const [totalResult] = await db.select({ count: count() })
        .from(erpEquipmentMaintenance)
        .where(eq(erpEquipmentMaintenance.equipmentId, input.equipmentId));

      return { items, total: totalResult.count };
    }),

  // ---- ADD MAINTENANCE ----
  addMaintenance: erpPermissionProcedure("erp_equipment", "update")
    .input(z.object({
      equipmentId: z.number(),
      type: z.enum(MAINTENANCE_TYPES),
      description: z.string().optional(),
      scheduledAt: z.number(),
      cost: z.number().optional(),
      performedBy: z.string().max(255).optional(),
      notes: z.string().optional(),
      setInMaintenance: z.boolean().default(false),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = (await getDb())!;

      const [equipment] = await db.select().from(erpEquipment)
        .where(and(eq(erpEquipment.id, input.equipmentId), isNull(erpEquipment.deletedAt)));
      if (!equipment) throw new Error("Équipement introuvable");

      const now = Date.now();

      const [result] = await db.insert(erpEquipmentMaintenance).values({
        equipmentId: input.equipmentId,
        type: input.type,
        description: input.description || null,
        scheduledAt: input.scheduledAt,
        cost: input.cost || null,
        performedBy: input.performedBy || null,
        status: input.setInMaintenance ? "in_progress" : "scheduled",
        notes: input.notes || null,
        createdBy: ctx.user.id,
        createdAt: now,
      });

      // Mettre à jour nextMaintenanceAt
      await db.update(erpEquipment).set({
        nextMaintenanceAt: input.scheduledAt,
        updatedAt: now,
        ...(input.setInMaintenance ? { status: "in_maintenance" } : {}),
      }).where(eq(erpEquipment.id, input.equipmentId));

      await createAuditEvent({
        actorId: ctx.user.id,
        action: "erp.equipment.maintenance_added",
        targetType: "erp_equipment",
        targetId: input.equipmentId,
        details: { maintenanceId: result.insertId, type: input.type, scheduledAt: input.scheduledAt },
      });

      return { id: result.insertId };
    }),

  // ---- UPDATE MAINTENANCE ----
  updateMaintenance: erpPermissionProcedure("erp_equipment", "update")
    .input(z.object({
      maintenanceId: z.number(),
      status: z.enum(MAINTENANCE_STATUSES).optional(),
      completedAt: z.number().optional(),
      cost: z.number().optional(),
      performedBy: z.string().max(255).optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = (await getDb())!;

      const [maint] = await db.select()
        .from(erpEquipmentMaintenance)
        .where(eq(erpEquipmentMaintenance.id, input.maintenanceId));
      if (!maint) throw new Error("Maintenance introuvable");

      const setValues: Record<string, unknown> = {};
      if (input.status) setValues.status = input.status;
      if (input.completedAt) setValues.completedAt = input.completedAt;
      if (input.cost !== undefined) setValues.cost = input.cost;
      if (input.performedBy !== undefined) setValues.performedBy = input.performedBy;
      if (input.notes !== undefined) setValues.notes = input.notes;

      await db.update(erpEquipmentMaintenance).set(setValues)
        .where(eq(erpEquipmentMaintenance.id, input.maintenanceId));

      // Si la maintenance est terminée, remettre l'équipement disponible
      if (input.status === "completed") {
        const [equipment] = await db.select().from(erpEquipment)
          .where(eq(erpEquipment.id, maint.equipmentId));
        if (equipment && equipment.status === "in_maintenance") {
          await db.update(erpEquipment).set({
            status: "available",
            updatedAt: Date.now(),
          }).where(eq(erpEquipment.id, maint.equipmentId));
        }
      }

      await createAuditEvent({
        actorId: ctx.user.id,
        action: "erp.equipment.maintenance_updated",
        targetType: "erp_equipment_maintenance",
        targetId: input.maintenanceId,
        details: { equipmentId: maint.equipmentId, changes: Object.keys(setValues) },
      });

      return { success: true };
    }),

  // ---- UPCOMING MAINTENANCE ----
  upcomingMaintenance: erpPermissionProcedure("erp_equipment", "view")
    .input(z.object({
      daysAhead: z.number().min(1).max(90).default(30),
    }).optional())
    .query(async ({ input }) => {
      const db = (await getDb())!;
      const daysAhead = input?.daysAhead ?? 30;
      const now = Date.now();
      const threshold = now + daysAhead * 86400000;

      const items = await db.select({
        maintenance: erpEquipmentMaintenance,
        equipment: erpEquipment,
      })
        .from(erpEquipmentMaintenance)
        .innerJoin(erpEquipment, eq(erpEquipmentMaintenance.equipmentId, erpEquipment.id))
        .where(and(
          eq(erpEquipmentMaintenance.status, "scheduled"),
          lte(erpEquipmentMaintenance.scheduledAt, threshold),
          gte(erpEquipmentMaintenance.scheduledAt, now - 86400000) // inclure celles en retard d'1 jour
        ))
        .orderBy(asc(erpEquipmentMaintenance.scheduledAt));

      return items.map(row => ({
        ...row.maintenance,
        equipmentName: row.equipment.name,
        equipmentCode: row.equipment.code,
        isOverdue: row.maintenance.scheduledAt < now,
      }));
    }),

  // ---- STATS ----
  stats: erpPermissionProcedure("erp_equipment", "view")
    .query(async () => {
      const db = (await getDb())!;

      const where = isNull(erpEquipment.deletedAt);

      const [totalResult] = await db.select({ count: count() }).from(erpEquipment).where(where);
      const statusCounts = await db.select({
        status: erpEquipment.status,
        count: count(),
      }).from(erpEquipment).where(where).groupBy(erpEquipment.status);

      const statusMap: Record<string, number> = {};
      for (const row of statusCounts) {
        statusMap[row.status] = row.count;
      }

      const now = Date.now();
      const [upcomingResult] = await db.select({ count: count() })
        .from(erpEquipmentMaintenance)
        .where(and(
          eq(erpEquipmentMaintenance.status, "scheduled"),
          lte(erpEquipmentMaintenance.scheduledAt, now + 30 * 86400000)
        ));

      return {
        total: totalResult.count,
        available: statusMap["available"] || 0,
        assigned: statusMap["assigned"] || 0,
        inMaintenance: statusMap["in_maintenance"] || 0,
        outOfService: statusMap["out_of_service"] || 0,
        lost: statusMap["lost"] || 0,
        retired: statusMap["retired"] || 0,
        upcomingMaintenanceCount: upcomingResult.count,
      };
    }),
});
