import { z } from "zod";
import { eq, and, isNull, like, or, desc, count, sql } from "drizzle-orm";
import { router, erpPermissionProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { createAuditEvent } from "../db";
import { erpSafetyIncidents, erpSafetyAudits, erpSafetyCorrectiveActions } from "../../drizzle/schema";

// ============================================================
// CONSTANTS
// ============================================================

const INCIDENT_SEVERITIES = ["low", "medium", "high", "critical"] as const;
const INCIDENT_STATUSES = ["open", "under_review", "corrective_action", "resolved", "closed"] as const;
const AUDIT_TYPES = ["general", "fire", "electrical", "structural", "environmental", "ppe", "autre"] as const;
const AUDIT_STATUSES = ["planned", "in_progress", "completed", "cancelled"] as const;
const CORRECTIVE_ACTION_STATUSES = ["pending", "in_progress", "completed", "cancelled"] as const;
const CORRECTIVE_ACTION_PRIORITIES = ["low", "medium", "high", "critical"] as const;

// ============================================================
// SAFETY ROUTER
// ============================================================

export const erpSafetyRouter = router({
  // ============================================================
  // INCIDENTS
  // ============================================================

  // ---- LIST INCIDENTS ----
  listIncidents: erpPermissionProcedure("erp_safety", "view")
    .input(z.object({
      projectId: z.number().optional(),
      severity: z.enum(INCIDENT_SEVERITIES).optional(),
      status: z.enum(INCIDENT_STATUSES).optional(),
      search: z.string().optional(),
      limit: z.number().min(1).max(100).default(20),
      offset: z.number().min(0).default(0),
    }))
    .query(async ({ input }) => {
      const db = (await getDb())!;
      const conditions = [isNull(erpSafetyIncidents.deletedAt)];

      if (input.projectId) conditions.push(eq(erpSafetyIncidents.projectId, input.projectId));
      if (input.severity) conditions.push(eq(erpSafetyIncidents.severity, input.severity));
      if (input.status) conditions.push(eq(erpSafetyIncidents.status, input.status));
      if (input.search) {
        conditions.push(
          or(
            like(erpSafetyIncidents.title, `%${input.search}%`),
            like(erpSafetyIncidents.description, `%${input.search}%`),
            like(erpSafetyIncidents.location, `%${input.search}%`)
          )!
        );
      }

      const where = and(...conditions);

      const [items, totalResult] = await Promise.all([
        db.select()
          .from(erpSafetyIncidents)
          .where(where)
          .orderBy(desc(erpSafetyIncidents.incidentDate))
          .limit(input.limit)
          .offset(input.offset),
        db.select({ count: count() }).from(erpSafetyIncidents).where(where),
      ]);

      return { items, total: totalResult[0].count };
    }),

  // ---- GET INCIDENT BY ID ----
  getIncident: erpPermissionProcedure("erp_safety", "view")
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = (await getDb())!;

      const [incident] = await db.select()
        .from(erpSafetyIncidents)
        .where(and(eq(erpSafetyIncidents.id, input.id), isNull(erpSafetyIncidents.deletedAt)))
        .limit(1);

      if (!incident) throw new Error("Incident introuvable");

      const actions = await db.select()
        .from(erpSafetyCorrectiveActions)
        .where(eq(erpSafetyCorrectiveActions.incidentId, input.id))
        .orderBy(desc(erpSafetyCorrectiveActions.createdAt));

      return { ...incident, correctiveActions: actions };
    }),

  // ---- CREATE INCIDENT ----
  createIncident: erpPermissionProcedure("erp_safety", "create")
    .input(z.object({
      projectId: z.number().optional(),
      title: z.string().min(3).max(255),
      description: z.string().optional(),
      severity: z.enum(INCIDENT_SEVERITIES),
      location: z.string().optional(),
      incidentDate: z.number(),
      assignedTo: z.number().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = (await getDb())!;
      const now = Date.now();

      const [result] = await db.insert(erpSafetyIncidents).values({
        projectId: input.projectId || null,
        title: input.title,
        description: input.description || null,
        severity: input.severity,
        status: "open",
        location: input.location || null,
        incidentDate: input.incidentDate,
        reportedBy: ctx.user.id,
        assignedTo: input.assignedTo || null,
        createdAt: now,
        updatedAt: now,
      });

      await createAuditEvent({
        actorId: ctx.user.id,
        action: "erp.safety.incident.created",
        targetType: "erp_safety_incident",
        targetId: result.insertId,
        details: { title: input.title, severity: input.severity },
      });

      // If critical severity, create an alert audit event
      if (input.severity === "critical") {
        await createAuditEvent({
          actorId: ctx.user.id,
          action: "erp.safety.critical_alert",
          targetType: "erp_safety_incident",
          targetId: result.insertId,
          details: { title: input.title, message: `ALERTE CRITIQUE: ${input.title}`, location: input.location },
        });
      }

      return { id: result.insertId };
    }),

  // ---- UPDATE INCIDENT ----
  updateIncident: erpPermissionProcedure("erp_safety", "create")
    .input(z.object({
      id: z.number(),
      title: z.string().min(3).max(255).optional(),
      description: z.string().optional(),
      severity: z.enum(INCIDENT_SEVERITIES).optional(),
      status: z.enum(INCIDENT_STATUSES).optional(),
      location: z.string().optional(),
      assignedTo: z.number().nullable().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = (await getDb())!;

      const [incident] = await db.select().from(erpSafetyIncidents)
        .where(and(eq(erpSafetyIncidents.id, input.id), isNull(erpSafetyIncidents.deletedAt)))
        .limit(1);
      if (!incident) throw new Error("Incident introuvable");

      const updates: Record<string, unknown> = { updatedAt: Date.now() };
      if (input.title) updates.title = input.title;
      if (input.description !== undefined) updates.description = input.description;
      if (input.severity) updates.severity = input.severity;
      if (input.status) updates.status = input.status;
      if (input.location !== undefined) updates.location = input.location;
      if (input.assignedTo !== undefined) updates.assignedTo = input.assignedTo;

      await db.update(erpSafetyIncidents).set(updates).where(eq(erpSafetyIncidents.id, input.id));

      await createAuditEvent({
        actorId: ctx.user.id,
        action: "erp.safety.incident.updated",
        targetType: "erp_safety_incident",
        targetId: input.id,
        details: { changes: Object.keys(updates).filter(k => k !== "updatedAt") },
      });

      return { success: true };
    }),

  // ---- DELETE INCIDENT (soft) ----
  deleteIncident: erpPermissionProcedure("erp_safety", "validate")
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = (await getDb())!;

      await db.update(erpSafetyIncidents)
        .set({ deletedAt: Date.now(), updatedAt: Date.now() })
        .where(eq(erpSafetyIncidents.id, input.id));

      await createAuditEvent({
        actorId: ctx.user.id,
        action: "erp.safety.incident.deleted",
        targetType: "erp_safety_incident",
        targetId: input.id,
        details: {},
      });

      return { success: true };
    }),

  // ---- ADD CORRECTIVE ACTION ----
  addCorrectiveAction: erpPermissionProcedure("erp_safety", "create")
    .input(z.object({
      incidentId: z.number(),
      title: z.string().min(3).max(255),
      description: z.string().optional(),
      assignedTo: z.string().optional(),
      priority: z.enum(CORRECTIVE_ACTION_PRIORITIES).default("medium"),
      dueDate: z.number().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = (await getDb())!;

      // Verify incident exists
      const [incident] = await db.select().from(erpSafetyIncidents)
        .where(and(eq(erpSafetyIncidents.id, input.incidentId), isNull(erpSafetyIncidents.deletedAt)))
        .limit(1);
      if (!incident) throw new Error("Incident introuvable");

      const [result] = await db.insert(erpSafetyCorrectiveActions).values({
        incidentId: input.incidentId,
        title: input.title,
        description: input.description || null,
        assignedTo: input.assignedTo || null,
        priority: input.priority,
        dueDate: input.dueDate || null,
        status: "pending",
        createdBy: ctx.user.id,
        createdAt: Date.now(),
      });

      // Auto-update incident status to corrective_action if still open or under_review
      if (incident.status === "open" || incident.status === "under_review") {
        await db.update(erpSafetyIncidents)
          .set({ status: "corrective_action", updatedAt: Date.now() })
          .where(eq(erpSafetyIncidents.id, input.incidentId));
      }

      await createAuditEvent({
        actorId: ctx.user.id,
        action: "erp.safety.corrective_action.created",
        targetType: "erp_safety_corrective_action",
        targetId: result.insertId,
        details: { incidentId: input.incidentId, title: input.title },
      });

      return { id: result.insertId };
    }),

  // ---- UPDATE CORRECTIVE ACTION ----
  updateCorrectiveAction: erpPermissionProcedure("erp_safety", "create")
    .input(z.object({
      id: z.number(),
      title: z.string().optional(),
      description: z.string().optional(),
      assignedTo: z.string().optional(),
      priority: z.enum(CORRECTIVE_ACTION_PRIORITIES).optional(),
      dueDate: z.number().nullable().optional(),
      status: z.enum(CORRECTIVE_ACTION_STATUSES).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = (await getDb())!;

      const updates: Record<string, unknown> = {};
      if (input.title) updates.title = input.title;
      if (input.description !== undefined) updates.description = input.description;
      if (input.assignedTo !== undefined) updates.assignedTo = input.assignedTo;
      if (input.priority) updates.priority = input.priority;
      if (input.dueDate !== undefined) updates.dueDate = input.dueDate;
      if (input.status) {
        updates.status = input.status;
        if (input.status === "completed") updates.completedAt = Date.now();
      }

      await db.update(erpSafetyCorrectiveActions).set(updates).where(eq(erpSafetyCorrectiveActions.id, input.id));

      return { success: true };
    }),

  // ---- RESOLVE INCIDENT ----
  resolveIncident: erpPermissionProcedure("erp_safety", "validate")
    .input(z.object({
      id: z.number(),
      resolutionNotes: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = (await getDb())!;

      const [incident] = await db.select().from(erpSafetyIncidents)
        .where(and(eq(erpSafetyIncidents.id, input.id), isNull(erpSafetyIncidents.deletedAt)))
        .limit(1);
      if (!incident) throw new Error("Incident introuvable");
      if (incident.status === "closed") throw new Error("Incident déjà clôturé");
      if (incident.status === "resolved") throw new Error("Incident déjà résolu");

      const now = Date.now();
      await db.update(erpSafetyIncidents).set({
        status: "resolved",
        resolvedAt: now,
        resolvedBy: ctx.user.id,
        resolutionNotes: input.resolutionNotes || null,
        updatedAt: now,
      }).where(eq(erpSafetyIncidents.id, input.id));

      await createAuditEvent({
        actorId: ctx.user.id,
        action: "erp.safety.incident.resolved",
        targetType: "erp_safety_incident",
        targetId: input.id,
        details: { resolutionNotes: input.resolutionNotes },
      });

      return { success: true };
    }),

  // ---- CLOSE INCIDENT (only if resolved) ----
  closeIncident: erpPermissionProcedure("erp_safety", "validate")
    .input(z.object({
      id: z.number(),
      closureNotes: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = (await getDb())!;

      const [incident] = await db.select().from(erpSafetyIncidents)
        .where(and(eq(erpSafetyIncidents.id, input.id), isNull(erpSafetyIncidents.deletedAt)))
        .limit(1);
      if (!incident) throw new Error("Incident introuvable");
      if (incident.status !== "resolved") {
        throw new Error("Impossible de clôturer un incident non résolu. Résolvez-le d'abord.");
      }

      const now = Date.now();
      await db.update(erpSafetyIncidents).set({
        status: "closed",
        closedAt: now,
        closedBy: ctx.user.id,
        closureNotes: input.closureNotes || null,
        updatedAt: now,
      }).where(eq(erpSafetyIncidents.id, input.id));

      await createAuditEvent({
        actorId: ctx.user.id,
        action: "erp.safety.incident.closed",
        targetType: "erp_safety_incident",
        targetId: input.id,
        details: { closureNotes: input.closureNotes },
      });

      return { success: true };
    }),

  // ============================================================
  // AUDITS
  // ============================================================

  // ---- LIST AUDITS ----
  listAudits: erpPermissionProcedure("erp_safety", "view")
    .input(z.object({
      projectId: z.number().optional(),
      auditType: z.enum(AUDIT_TYPES).optional(),
      status: z.enum(AUDIT_STATUSES).optional(),
      search: z.string().optional(),
      limit: z.number().min(1).max(100).default(20),
      offset: z.number().min(0).default(0),
    }))
    .query(async ({ input }) => {
      const db = (await getDb())!;
      const conditions = [isNull(erpSafetyAudits.deletedAt)];

      if (input.projectId) conditions.push(eq(erpSafetyAudits.projectId, input.projectId));
      if (input.auditType) conditions.push(eq(erpSafetyAudits.auditType, input.auditType));
      if (input.status) conditions.push(eq(erpSafetyAudits.status, input.status));
      if (input.search) {
        conditions.push(
          or(
            like(erpSafetyAudits.title, `%${input.search}%`),
            like(erpSafetyAudits.findings, `%${input.search}%`)
          )!
        );
      }

      const where = and(...conditions);

      const [items, totalResult] = await Promise.all([
        db.select()
          .from(erpSafetyAudits)
          .where(where)
          .orderBy(desc(erpSafetyAudits.createdAt))
          .limit(input.limit)
          .offset(input.offset),
        db.select({ count: count() }).from(erpSafetyAudits).where(where),
      ]);

      return { items, total: totalResult[0].count };
    }),

  // ---- CREATE AUDIT ----
  createAudit: erpPermissionProcedure("erp_safety", "create")
    .input(z.object({
      projectId: z.number().optional(),
      title: z.string().min(3).max(255),
      description: z.string().optional(),
      auditType: z.enum(AUDIT_TYPES).default("general"),
      scheduledAt: z.number().optional(),
      auditorName: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = (await getDb())!;
      const now = Date.now();

      const [result] = await db.insert(erpSafetyAudits).values({
        projectId: input.projectId || null,
        title: input.title,
        description: input.description || null,
        auditType: input.auditType,
        scheduledAt: input.scheduledAt || null,
        auditorName: input.auditorName || null,
        status: "planned",
        createdBy: ctx.user.id,
        createdAt: now,
        updatedAt: now,
      });

      await createAuditEvent({
        actorId: ctx.user.id,
        action: "erp.safety.audit.created",
        targetType: "erp_safety_audit",
        targetId: result.insertId,
        details: { title: input.title, auditType: input.auditType },
      });

      return { id: result.insertId };
    }),

  // ---- UPDATE AUDIT ----
  updateAudit: erpPermissionProcedure("erp_safety", "create")
    .input(z.object({
      id: z.number(),
      title: z.string().optional(),
      description: z.string().optional(),
      auditType: z.enum(AUDIT_TYPES).optional(),
      scheduledAt: z.number().nullable().optional(),
      completedAt: z.number().nullable().optional(),
      auditorName: z.string().optional(),
      findings: z.string().optional(),
      score: z.number().min(0).max(100).optional(),
      status: z.enum(AUDIT_STATUSES).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = (await getDb())!;

      const updates: Record<string, unknown> = { updatedAt: Date.now() };
      if (input.title) updates.title = input.title;
      if (input.description !== undefined) updates.description = input.description;
      if (input.auditType) updates.auditType = input.auditType;
      if (input.scheduledAt !== undefined) updates.scheduledAt = input.scheduledAt;
      if (input.completedAt !== undefined) updates.completedAt = input.completedAt;
      if (input.auditorName !== undefined) updates.auditorName = input.auditorName;
      if (input.findings !== undefined) updates.findings = input.findings;
      if (input.score !== undefined) updates.score = input.score;
      if (input.status) updates.status = input.status;

      await db.update(erpSafetyAudits).set(updates).where(eq(erpSafetyAudits.id, input.id));

      await createAuditEvent({
        actorId: ctx.user.id,
        action: "erp.safety.audit.updated",
        targetType: "erp_safety_audit",
        targetId: input.id,
        details: { changes: Object.keys(updates).filter(k => k !== "updatedAt") },
      });

      return { success: true };
    }),

  // ============================================================
  // STATS / KPI
  // ============================================================

  stats: erpPermissionProcedure("erp_safety", "view")
    .query(async () => {
      const db = (await getDb())!;

      const baseCondition = isNull(erpSafetyIncidents.deletedAt);

      const [totalResult] = await db.select({ count: count() }).from(erpSafetyIncidents).where(baseCondition);
      const [openResult] = await db.select({ count: count() }).from(erpSafetyIncidents)
        .where(and(baseCondition, eq(erpSafetyIncidents.status, "open")));
      const [underReviewResult] = await db.select({ count: count() }).from(erpSafetyIncidents)
        .where(and(baseCondition, eq(erpSafetyIncidents.status, "under_review")));
      const [correctiveResult] = await db.select({ count: count() }).from(erpSafetyIncidents)
        .where(and(baseCondition, eq(erpSafetyIncidents.status, "corrective_action")));
      const [resolvedResult] = await db.select({ count: count() }).from(erpSafetyIncidents)
        .where(and(baseCondition, eq(erpSafetyIncidents.status, "resolved")));
      const [closedResult] = await db.select({ count: count() }).from(erpSafetyIncidents)
        .where(and(baseCondition, eq(erpSafetyIncidents.status, "closed")));
      const [criticalResult] = await db.select({ count: count() }).from(erpSafetyIncidents)
        .where(and(baseCondition, eq(erpSafetyIncidents.severity, "critical"), sql`${erpSafetyIncidents.status} NOT IN ('resolved', 'closed')`));

      // Audits stats
      const [auditsTotal] = await db.select({ count: count() }).from(erpSafetyAudits).where(isNull(erpSafetyAudits.deletedAt));
      const [auditsCompleted] = await db.select({ count: count() }).from(erpSafetyAudits)
        .where(and(isNull(erpSafetyAudits.deletedAt), eq(erpSafetyAudits.status, "completed")));

      // Corrective actions stats
      const [actionsTotal] = await db.select({ count: count() }).from(erpSafetyCorrectiveActions);
      const [actionsPending] = await db.select({ count: count() }).from(erpSafetyCorrectiveActions)
        .where(eq(erpSafetyCorrectiveActions.status, "pending"));
      const [actionsCompleted] = await db.select({ count: count() }).from(erpSafetyCorrectiveActions)
        .where(eq(erpSafetyCorrectiveActions.status, "completed"));

      return {
        incidents: {
          total: totalResult.count,
          open: openResult.count,
          underReview: underReviewResult.count,
          correctiveAction: correctiveResult.count,
          resolved: resolvedResult.count,
          closed: closedResult.count,
          criticalActive: criticalResult.count,
        },
        audits: {
          total: auditsTotal.count,
          completed: auditsCompleted.count,
        },
        correctiveActions: {
          total: actionsTotal.count,
          pending: actionsPending.count,
          completed: actionsCompleted.count,
        },
      };
    }),
});
