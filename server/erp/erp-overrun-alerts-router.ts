import { z } from "zod";
import { eq, and, desc, isNull, lte } from "drizzle-orm";
import { router, erpPermissionProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { createAuditEvent } from "../db";
import {
  erpOverrunAlerts,
  erpNotifications,
  erpBudgets,
  erpBudgetLines,
  erpProjects,
  erpTasks,
  erpMilestones,
  erpInvoices,
  erpDocuments,
  erpCertifications,
  erpInventoryItems,
  erpEquipmentMaintenance,
  erpSafetyIncidents,
  users,
} from "../../drizzle/schema";

// ============================================================
// CONSTANTS
// ============================================================

const ALERT_TYPES = [
  "project_late", "task_late", "milestone_overdue",
  "budget_75", "budget_90", "budget_100", "budget_overrun",
  "invoice_overdue", "document_expired", "certification_expired",
  "stock_critical", "maintenance_due", "safety_critical",
] as const;

const PRIORITIES = ["low", "medium", "high", "critical"] as const;
const MODULES = ["finance", "projects", "inventory", "safety", "compliance", "equipment", "general"] as const;

// ============================================================
// ALERT ENGINE — Detection Functions
// ============================================================

interface AlertCandidate {
  alertType: string;
  priority: "low" | "medium" | "high" | "critical";
  title: string;
  message: string;
  projectId?: number | null;
  threshold?: number;
  currentValue?: number;
  relatedEntityType?: string;
  relatedEntityId?: number;
  module: string;
}

/**
 * Check budget thresholds (75%, 90%, 100%, overrun)
 */
async function checkBudgetAlerts(db: any): Promise<AlertCandidate[]> {
  const alerts: AlertCandidate[] = [];
  const budgets = await db.select().from(erpBudgets);

  for (const budget of budgets) {
    if (budget.totalRevised <= 0) continue;
    const consumed = budget.totalEngaged + budget.totalPaid;
    const percent = Math.round((consumed * 10000) / budget.totalRevised); // in basis points

    if (percent >= 10000) {
      // Over 100% — overrun confirmed
      alerts.push({
        alertType: "budget_overrun",
        priority: "critical",
        title: `Dépassement budgétaire confirmé`,
        message: `Le budget "${budget.name}" (projet #${budget.projectId}) est consommé à ${(percent / 100).toFixed(1)}%. Dépassement de ${((consumed - budget.totalRevised) / 100).toLocaleString()} XOF.`,
        projectId: budget.projectId,
        threshold: 10000,
        currentValue: percent,
        relatedEntityType: "budget",
        relatedEntityId: budget.id,
        module: "finance",
      });
    } else if (percent >= 10000) {
      alerts.push({
        alertType: "budget_100",
        priority: "critical",
        title: `Budget consommé à 100%`,
        message: `Le budget "${budget.name}" (projet #${budget.projectId}) a atteint 100% de consommation.`,
        projectId: budget.projectId,
        threshold: 10000,
        currentValue: percent,
        relatedEntityType: "budget",
        relatedEntityId: budget.id,
        module: "finance",
      });
    } else if (percent >= 9000) {
      alerts.push({
        alertType: "budget_90",
        priority: "high",
        title: `Budget consommé à 90%`,
        message: `Le budget "${budget.name}" (projet #${budget.projectId}) est consommé à ${(percent / 100).toFixed(1)}%.`,
        projectId: budget.projectId,
        threshold: 9000,
        currentValue: percent,
        relatedEntityType: "budget",
        relatedEntityId: budget.id,
        module: "finance",
      });
    } else if (percent >= 7500) {
      alerts.push({
        alertType: "budget_75",
        priority: "medium",
        title: `Budget consommé à 75%`,
        message: `Le budget "${budget.name}" (projet #${budget.projectId}) est consommé à ${(percent / 100).toFixed(1)}%.`,
        projectId: budget.projectId,
        threshold: 7500,
        currentValue: percent,
        relatedEntityType: "budget",
        relatedEntityId: budget.id,
        module: "finance",
      });
    }
  }
  return alerts;
}

/**
 * Check overdue invoices
 */
async function checkInvoiceAlerts(db: any): Promise<AlertCandidate[]> {
  const alerts: AlertCandidate[] = [];
  const now = Date.now();
  const invoices = await db.select().from(erpInvoices)
    .where(and(isNull(erpInvoices.deletedAt)));

  const overdueStatuses = ["approved", "partially_paid", "overdue"];
  for (const inv of invoices) {
    if (overdueStatuses.includes(inv.status) && inv.dueDate < now) {
      const daysOverdue = Math.floor((now - inv.dueDate) / (1000 * 60 * 60 * 24));
      alerts.push({
        alertType: "invoice_overdue",
        priority: daysOverdue > 30 ? "critical" : daysOverdue > 14 ? "high" : "medium",
        title: `Facture échue : ${inv.invoiceNumber}`,
        message: `La facture ${inv.invoiceNumber} est échue depuis ${daysOverdue} jour(s). Montant dû : ${((inv.totalAmount - inv.paidAmount) / 100).toLocaleString()} XOF.`,
        projectId: inv.projectId,
        threshold: 0,
        currentValue: daysOverdue,
        relatedEntityType: "invoice",
        relatedEntityId: inv.id,
        module: "finance",
      });
    }
  }
  return alerts;
}

/**
 * Check late projects
 */
async function checkProjectAlerts(db: any): Promise<AlertCandidate[]> {
  const alerts: AlertCandidate[] = [];
  const now = Date.now();
  const projects = await db.select().from(erpProjects);

  for (const proj of projects) {
    if (proj.status === "active" && proj.endDate && proj.endDate < now) {
      const daysLate = Math.floor((now - proj.endDate) / (1000 * 60 * 60 * 24));
      alerts.push({
        alertType: "project_late",
        priority: daysLate > 30 ? "critical" : daysLate > 7 ? "high" : "medium",
        title: `Projet en retard : ${proj.name}`,
        message: `Le projet "${proj.name}" devait se terminer il y a ${daysLate} jour(s).`,
        projectId: proj.id,
        threshold: 0,
        currentValue: daysLate,
        relatedEntityType: "project",
        relatedEntityId: proj.id,
        module: "projects",
      });
    }
  }
  return alerts;
}

/**
 * Check late tasks
 */
async function checkTaskAlerts(db: any): Promise<AlertCandidate[]> {
  const alerts: AlertCandidate[] = [];
  const now = Date.now();
  const tasks = await db.select().from(erpTasks);

  for (const task of tasks) {
    if (task.status !== "completed" && task.status !== "cancelled" && task.endDate && task.endDate < now) {
      const daysLate = Math.floor((now - task.endDate) / (1000 * 60 * 60 * 24));
      alerts.push({
        alertType: "task_late",
        priority: daysLate > 14 ? "high" : "medium",
        title: `Tâche en retard : ${task.name}`,
        message: `La tâche "${task.name}" devait se terminer il y a ${daysLate} jour(s).`,
        projectId: task.projectId,
        threshold: 0,
        currentValue: daysLate,
        relatedEntityType: "task",
        relatedEntityId: task.id,
        module: "projects",
      });
    }
  }
  return alerts;
}

/**
 * Check overdue milestones
 */
async function checkMilestoneAlerts(db: any): Promise<AlertCandidate[]> {
  const alerts: AlertCandidate[] = [];
  const now = Date.now();
  const milestones = await db.select().from(erpMilestones);

  for (const ms of milestones) {
    if (ms.status !== "completed" && ms.dueDate && ms.dueDate < now) {
      const daysLate = Math.floor((now - ms.dueDate) / (1000 * 60 * 60 * 24));
      alerts.push({
        alertType: "milestone_overdue",
        priority: daysLate > 14 ? "high" : "medium",
        title: `Jalon dépassé : ${ms.name}`,
        message: `Le jalon "${ms.name}" devait être atteint il y a ${daysLate} jour(s).`,
        projectId: ms.projectId,
        threshold: 0,
        currentValue: daysLate,
        relatedEntityType: "milestone",
        relatedEntityId: ms.id,
        module: "projects",
      });
    }
  }
  return alerts;
}

/**
 * Check expired documents
 */
async function checkDocumentAlerts(db: any): Promise<AlertCandidate[]> {
  const alerts: AlertCandidate[] = [];
  const now = Date.now();
  const docs = await db.select().from(erpDocuments);

  for (const doc of docs) {
    if (doc.expiryDate && doc.expiryDate < now) {
      alerts.push({
        alertType: "document_expired",
        priority: "medium",
        title: `Document expiré : ${doc.name}`,
        message: `Le document "${doc.name}" a expiré.`,
        projectId: doc.projectId,
        relatedEntityType: "document",
        relatedEntityId: doc.id,
        module: "compliance",
      });
    }
  }
  return alerts;
}

/**
 * Check expired certifications
 */
async function checkCertificationAlerts(db: any): Promise<AlertCandidate[]> {
  const alerts: AlertCandidate[] = [];
  const now = Date.now();
  const certs = await db.select().from(erpCertifications);

  for (const cert of certs) {
    if (cert.expiryDate && cert.expiryDate < now) {
      alerts.push({
        alertType: "certification_expired",
        priority: "high",
        title: `Certification expirée : ${cert.name}`,
        message: `La certification "${cert.name}" a expiré.`,
        projectId: null,
        relatedEntityType: "certification",
        relatedEntityId: cert.id,
        module: "compliance",
      });
    }
  }
  return alerts;
}

/**
 * Check critical stock levels
 */
async function checkStockAlerts(db: any): Promise<AlertCandidate[]> {
  const alerts: AlertCandidate[] = [];
  const items = await db.select().from(erpInventoryItems);

  for (const item of items) {
    if (item.minimumStock && item.currentStock <= item.minimumStock) {
      alerts.push({
        alertType: "stock_critical",
        priority: item.currentStock === 0 ? "critical" : "high",
        title: `Stock critique : ${item.name}`,
        message: `L'article "${item.name}" est en stock critique (${item.currentStock}/${item.minimumStock} ${item.unit}).`,
        projectId: null,
        threshold: item.minimumStock,
        currentValue: item.currentStock,
        relatedEntityType: "inventory_item",
        relatedEntityId: item.id,
        module: "inventory",
      });
    }
  }
  return alerts;
}

/**
 * Check upcoming maintenance
 */
async function checkMaintenanceAlerts(db: any): Promise<AlertCandidate[]> {
  const alerts: AlertCandidate[] = [];
  const now = Date.now();
  const sevenDays = now + 7 * 24 * 60 * 60 * 1000;
  const maintenances = await db.select().from(erpEquipmentMaintenance);

  for (const m of maintenances) {
    if (m.status === "scheduled" && m.scheduledDate && m.scheduledDate <= sevenDays && m.scheduledDate >= now) {
      const daysUntil = Math.floor((m.scheduledDate - now) / (1000 * 60 * 60 * 24));
      alerts.push({
        alertType: "maintenance_due",
        priority: daysUntil <= 1 ? "high" : "medium",
        title: `Maintenance proche : ${m.description || `Maintenance #${m.id}`}`,
        message: `Maintenance prévue dans ${daysUntil} jour(s).`,
        projectId: null,
        threshold: 7,
        currentValue: daysUntil,
        relatedEntityType: "maintenance",
        relatedEntityId: m.id,
        module: "equipment",
      });
    }
  }
  return alerts;
}

/**
 * Check critical safety incidents
 */
async function checkSafetyAlerts(db: any): Promise<AlertCandidate[]> {
  const alerts: AlertCandidate[] = [];
  const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
  const incidents = await db.select().from(erpSafetyIncidents);

  for (const inc of incidents) {
    if (inc.severity === "critical" && inc.status !== "closed" && inc.createdAt >= oneDayAgo) {
      alerts.push({
        alertType: "safety_critical",
        priority: "critical",
        title: `Incident sécurité critique : ${inc.title}`,
        message: `Incident critique signalé : "${inc.title}". Action immédiate requise.`,
        projectId: inc.projectId,
        relatedEntityType: "safety_incident",
        relatedEntityId: inc.id,
        module: "safety",
      });
    }
  }
  return alerts;
}

/**
 * Run all alert checks and persist new alerts
 */
async function runAlertEngine(db: any, userId: number): Promise<{ created: number; alerts: AlertCandidate[] }> {
  const allChecks = await Promise.all([
    checkBudgetAlerts(db),
    checkInvoiceAlerts(db),
    checkProjectAlerts(db),
    checkTaskAlerts(db),
    checkMilestoneAlerts(db),
    checkDocumentAlerts(db),
    checkCertificationAlerts(db),
    checkStockAlerts(db),
    checkMaintenanceAlerts(db),
    checkSafetyAlerts(db),
  ]);

  const candidates = allChecks.flat();
  const now = Date.now();
  let created = 0;

  for (const candidate of candidates) {
    // Check if similar alert already exists (same type + entity) in last 24h
    const existing = await db.select({ id: erpOverrunAlerts.id }).from(erpOverrunAlerts)
      .where(and(
        eq(erpOverrunAlerts.alertType, candidate.alertType),
        candidate.relatedEntityId ? eq(erpOverrunAlerts.relatedEntityId, candidate.relatedEntityId) : undefined,
        candidate.relatedEntityType ? eq(erpOverrunAlerts.relatedEntityType, candidate.relatedEntityType) : undefined,
      ))
      .limit(1);

    if (existing.length === 0) {
      // Create new alert
      const [result] = await db.insert(erpOverrunAlerts).values({
        projectId: candidate.projectId || null,
        alertType: candidate.alertType,
        priority: candidate.priority,
        title: candidate.title,
        message: candidate.message,
        threshold: candidate.threshold || null,
        currentValue: candidate.currentValue || null,
        relatedEntityType: candidate.relatedEntityType || null,
        relatedEntityId: candidate.relatedEntityId || null,
        module: candidate.module,
        createdAt: now,
      });

      // Create notification for all ERP users (simplified: notify the actor)
      await db.insert(erpNotifications).values({
        userId,
        title: candidate.title,
        message: candidate.message,
        module: candidate.module,
        priority: candidate.priority,
        linkUrl: `/erp/finance/overrun-alerts`,
        alertId: result.insertId,
        createdAt: now,
      });

      created++;
    }
  }

  return { created, alerts: candidates };
}

// ============================================================
// OVERRUN ALERTS ROUTER
// ============================================================

export const erpOverrunAlertsRouter = router({
  /**
   * GET — Liste des alertes
   */
  list: erpPermissionProcedure("erp_finance", "view").input(
    z.object({
      projectId: z.number().optional(),
      alertType: z.string().optional(),
      priority: z.enum(PRIORITIES).optional(),
      module: z.string().optional(),
      isAcknowledged: z.boolean().optional(),
      limit: z.number().min(1).max(100).default(50),
      offset: z.number().min(0).default(0),
    }).optional()
  ).query(async ({ input }) => {
    const db = (await getDb())!;
    const params = input || { limit: 50, offset: 0 };
    const conditions: any[] = [];
    if (params.projectId) conditions.push(eq(erpOverrunAlerts.projectId, params.projectId));
    if (params.alertType) conditions.push(eq(erpOverrunAlerts.alertType, params.alertType));
    if (params.priority) conditions.push(eq(erpOverrunAlerts.priority, params.priority));
    if (params.module) conditions.push(eq(erpOverrunAlerts.module, params.module));
    if (params.isAcknowledged !== undefined) conditions.push(eq(erpOverrunAlerts.isAcknowledged, params.isAcknowledged));
    const where = conditions.length > 0 ? and(...conditions) : undefined;
    const items = await db.select().from(erpOverrunAlerts)
      .where(where)
      .orderBy(desc(erpOverrunAlerts.createdAt))
      .limit(params.limit)
      .offset(params.offset);
    return { alerts: items, total: items.length };
  }),

  /**
   * POST — Déclencher une vérification d'alertes
   */
  check: erpPermissionProcedure("erp_finance", "update").mutation(async ({ ctx }) => {
    const db = (await getDb())!;
    const result = await runAlertEngine(db, ctx.user.id);
    await createAuditEvent({
      actorId: ctx.user.id,
      action: "erp.overrunAlerts.check",
      details: { created: result.created, total: result.alerts.length },
    });
    return result;
  }),

  /**
   * POST — Acquitter une alerte
   */
  acknowledge: erpPermissionProcedure("erp_finance", "update").input(
    z.object({ id: z.number() })
  ).mutation(async ({ input, ctx }) => {
    const db = (await getDb())!;
    const [alert] = await db.select().from(erpOverrunAlerts).where(eq(erpOverrunAlerts.id, input.id));
    if (!alert) throw new Error("Alerte introuvable");
    if (alert.isAcknowledged) throw new Error("Alerte déjà acquittée");
    await db.update(erpOverrunAlerts).set({
      isAcknowledged: true,
      acknowledgedBy: ctx.user.id,
      acknowledgedAt: Date.now(),
    }).where(eq(erpOverrunAlerts.id, input.id));
    await createAuditEvent({
      actorId: ctx.user.id,
      action: "erp.overrunAlerts.acknowledge",
      details: { alertId: input.id, alertType: alert.alertType },
    });
    return { success: true };
  }),

  /**
   * GET — Alertes d'un projet
   */
  byProject: erpPermissionProcedure("erp_finance", "view").input(
    z.object({ projectId: z.number() })
  ).query(async ({ input }) => {
    const db = (await getDb())!;
    const alerts = await db.select().from(erpOverrunAlerts)
      .where(eq(erpOverrunAlerts.projectId, input.projectId))
      .orderBy(desc(erpOverrunAlerts.createdAt));
    return { alerts };
  }),
});
