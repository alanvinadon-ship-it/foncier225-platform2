/**
 * Scheduled handler: /api/scheduled/erp-alerts
 * 
 * Vérifie automatiquement les alertes ERP critiques :
 * - Dépassement budgétaire (75% et 90%)
 * - Factures échues
 * - Documents/certifications expirés
 * - Stock critique
 * - Projets en retard
 * 
 * Exécuté toutes les heures via manus-heartbeat.
 * Sprint 20 — Heartbeat automatique des alertes
 */
import type { Request, Response } from "express";
import { getDb } from "./db";
import {
  erpProjects,
  erpBudgets,
  erpInvoices,
  erpDocuments,
  erpInventoryItems,
} from "../drizzle/schema";
import { eq, lt, and, isNull, sql } from "drizzle-orm";

interface AlertResult {
  type: string;
  count: number;
  details: string[];
}

export async function erpAlertsHandler(req: Request, res: Response) {
  try {
    const db = await getDb();
    if (!db) {
      return res.json({ ok: true, skipped: "database not available" });
    }

    const alerts: AlertResult[] = [];
    const nowMs = Date.now();

    // 1. Budget overrun alerts (75% and 90%)
    try {
      const budgets = await db.select().from(erpBudgets).where(
        eq(erpBudgets.status, "approved")
      );

      const budgetAlerts: string[] = [];
      for (const budget of budgets) {
        const totalAmount = Number(budget.totalRevised || budget.totalInitial || 0);
        const spentAmount = Number(budget.totalEngaged || 0);
        if (totalAmount > 0) {
          const ratio = spentAmount / totalAmount;
          if (ratio >= 0.9) {
            budgetAlerts.push(`Budget "${budget.name}" à ${Math.round(ratio * 100)}% (CRITIQUE)`);
          } else if (ratio >= 0.75) {
            budgetAlerts.push(`Budget "${budget.name}" à ${Math.round(ratio * 100)}% (ATTENTION)`);
          }
        }
      }
      if (budgetAlerts.length > 0) {
        alerts.push({ type: "budget_overrun", count: budgetAlerts.length, details: budgetAlerts });
      }
    } catch (e) {
      // Budget table may not exist yet, skip
    }

    // 2. Overdue invoices (dueDate is bigint ms, status is 'sent' or 'submitted')
    try {
      const overdueInvoices = await db.select({
        id: erpInvoices.id,
        invoiceNumber: erpInvoices.invoiceNumber,
        dueDate: erpInvoices.dueDate,
      }).from(erpInvoices).where(
        and(
          eq(erpInvoices.status, "submitted"),
          lt(erpInvoices.dueDate, nowMs)
        )
      );

      if (overdueInvoices.length > 0) {
        alerts.push({
          type: "overdue_invoices",
          count: overdueInvoices.length,
          details: overdueInvoices.slice(0, 10).map(inv => `Facture ${inv.invoiceNumber} échue`),
        });
      }
    } catch (e) {
      // Skip if table doesn't exist
    }

    // 3. Expired documents/certifications (expiresAt is bigint ms)
    try {
      const expiredDocs = await db.select({
        id: erpDocuments.id,
        title: erpDocuments.title,
        expiresAt: erpDocuments.expiresAt,
      }).from(erpDocuments).where(
        and(
          isNull(erpDocuments.deletedAt),
          lt(erpDocuments.expiresAt, nowMs)
        )
      );

      if (expiredDocs.length > 0) {
        alerts.push({
          type: "expired_documents",
          count: expiredDocs.length,
          details: expiredDocs.slice(0, 10).map(doc => `Document "${doc.title}" expiré`),
        });
      }
    } catch (e) {
      // Skip if table doesn't exist
    }

    // 4. Critical stock (currentStock <= minStock)
    try {
      const criticalStock = await db.select({
        id: erpInventoryItems.id,
        name: erpInventoryItems.name,
        currentStock: erpInventoryItems.currentStock,
        minStock: erpInventoryItems.minStock,
      }).from(erpInventoryItems).where(
        and(
          isNull(erpInventoryItems.deletedAt),
          sql`${erpInventoryItems.currentStock} <= ${erpInventoryItems.minStock}`
        )
      );

      if (criticalStock.length > 0) {
        alerts.push({
          type: "critical_stock",
          count: criticalStock.length,
          details: criticalStock.slice(0, 10).map(item => `${item.name}: ${item.currentStock}/${item.minStock}`),
        });
      }
    } catch (e) {
      // Skip if table doesn't exist
    }

    // 5. Overdue projects (plannedEndDate is bigint ms, status is 'in_progress')
    try {
      const overdueProjects = await db.select({
        id: erpProjects.id,
        name: erpProjects.name,
        plannedEndDate: erpProjects.plannedEndDate,
      }).from(erpProjects).where(
        and(
          isNull(erpProjects.deletedAt),
          eq(erpProjects.status, "in_progress"),
          lt(erpProjects.plannedEndDate, nowMs)
        )
      );

      if (overdueProjects.length > 0) {
        alerts.push({
          type: "overdue_projects",
          count: overdueProjects.length,
          details: overdueProjects.slice(0, 10).map(p => `Projet "${p.name}" en retard`),
        });
      }
    } catch (e) {
      // Skip if table doesn't exist
    }

    const totalAlerts = alerts.reduce((sum, a) => sum + a.count, 0);

    return res.json({
      ok: true,
      timestamp: new Date().toISOString(),
      totalAlerts,
      alerts,
    });
  } catch (error: any) {
    console.error("[ERP Alerts Heartbeat] Error:", error);
    return res.status(500).json({
      ok: false,
      error: error.message || "Unknown error",
    });
  }
}
