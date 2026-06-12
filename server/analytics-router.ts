import { z } from "zod";
import { adminProcedure, router, permissionProcedure } from "./_core/trpc";
import { getDb } from "./db";
import { parcels, payments, users, landTitleApplications, creditFiles, appointments, auditEvents } from "../drizzle/schema";
import { sql, eq, gte, lte, and, count, avg } from "drizzle-orm";

export const analyticsRouter = router({
  // KPIs overview
  getOverviewStats: permissionProcedure("analytics", "view")
    .input(z.object({
      periodDays: z.number().min(1).max(365).default(30),
    }).optional())
    .query(async ({ input }) => {
      const db = (await getDb())!;
      const days = input?.periodDays ?? 30;
      const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

      const [totalUsers] = await db.select({ count: count() }).from(users);
      const [totalParcels] = await db.select({ count: count() }).from(parcels);
      const [totalPayments] = await db.select({ count: count() }).from(payments);
      const [totalAppointments] = await db.select({ count: count() }).from(appointments);

      // New users in period
      const [newUsers] = await db.select({ count: count() }).from(users)
        .where(gte(users.createdAt, since));

      // Payments in period
      const [periodPayments] = await db.select({ count: count() }).from(payments)
        .where(gte(payments.createdAt, since.getTime()));

      // Total payment amount (completed)
      const [paymentTotal] = await db.select({
        total: sql<string>`COALESCE(SUM(${payments.amount}), 0)`,
      }).from(payments).where(eq(payments.status, "completed"));

      // Period payment amount
      const [periodPaymentTotal] = await db.select({
        total: sql<string>`COALESCE(SUM(${payments.amount}), 0)`,
      }).from(payments)      .where(and(
        eq(payments.status, "completed"),
        gte(payments.createdAt, since.getTime())
      ));

      return {
        totalUsers: totalUsers.count,
        totalParcels: totalParcels.count,
        totalPayments: totalPayments.count,
        totalAppointments: totalAppointments.count,
        newUsersInPeriod: newUsers.count,
        paymentsInPeriod: periodPayments.count,
        totalRevenue: Number(paymentTotal.total),
        periodRevenue: Number(periodPaymentTotal.total),
      };
    }),

  // Dossiers par statut (parcelles)
  getDossiersByStatus: permissionProcedure("analytics", "view").query(async () => {
    const db = (await getDb())!;
    const results = await db.select({
      status: parcels.statusPublic,
      count: count(),
    }).from(parcels).groupBy(parcels.statusPublic);

    return results.map(r => ({
      status: r.status,
      count: r.count,
    }));
  }),

  // Titres fonciers par statut
  getLandTitlesByStatus: permissionProcedure("analytics", "view").query(async () => {
    const db = (await getDb())!;
    const results = await db.select({
      status: landTitleApplications.status,
      count: count(),
    }).from(landTitleApplications).groupBy(landTitleApplications.status);

    return results.map(r => ({
      status: r.status,
      count: r.count,
    }));
  }),

  // Paiements par mois (12 derniers mois)
  getPaymentsByMonth: permissionProcedure("analytics", "view").query(async () => {
    const db = (await getDb())!;
    const results = await db.select({
      month: sql<string>`DATE_FORMAT(FROM_UNIXTIME(${payments.createdAt} / 1000), '%Y-%m')`,
      count: count(),
      total: sql<string>`COALESCE(SUM(${payments.amount}), 0)`,
    }).from(payments)
      .where(gte(payments.createdAt, Date.now() - 365 * 24 * 60 * 60 * 1000))
      .groupBy(sql`DATE_FORMAT(FROM_UNIXTIME(${payments.createdAt} / 1000), '%Y-%m')`)
      .orderBy(sql`DATE_FORMAT(FROM_UNIXTIME(${payments.createdAt} / 1000), '%Y-%m')`);

    return results.map(r => ({
      month: r.month,
      count: r.count,
      total: Number(r.total),
    }));
  }),

  // Paiements par provider
  getPaymentsByProvider: permissionProcedure("analytics", "view").query(async () => {
    const db = (await getDb())!;
    const results = await db.select({
      provider: payments.provider,
      count: count(),
      total: sql<string>`COALESCE(SUM(${payments.amount}), 0)`,
    }).from(payments)
      .where(eq(payments.status, "completed"))
      .groupBy(payments.provider);

    return results.map(r => ({
      provider: r.provider || "cinetpay",
      count: r.count,
      total: Number(r.total),
    }));
  }),

  // Paiements par type de taxe
  getPaymentsByTaxType: permissionProcedure("analytics", "view").query(async () => {
    const db = (await getDb())!;
    const results = await db.select({
      taxType: payments.taxType,
      count: count(),
      total: sql<string>`COALESCE(SUM(${payments.amount}), 0)`,
    }).from(payments)
      .where(eq(payments.status, "completed"))
      .groupBy(payments.taxType);

    return results.map(r => ({
      taxType: r.taxType || "other",
      count: r.count,
      total: Number(r.total),
    }));
  }),

  // Utilisateurs par rôle
  getUsersByRole: permissionProcedure("analytics", "view").query(async () => {
    const db = (await getDb())!;
    const results = await db.select({
      role: users.role,
      count: count(),
    }).from(users).groupBy(users.role);

    return results.map(r => ({
      role: r.role,
      count: r.count,
    }));
  }),

  // Rendez-vous par statut
  getAppointmentsByStatus: permissionProcedure("analytics", "view").query(async () => {
    const db = (await getDb())!;
    const results = await db.select({
      status: appointments.status,
      count: count(),
    }).from(appointments).groupBy(appointments.status);

    return results.map(r => ({
      status: r.status,
      count: r.count,
    }));
  }),

  // Activité récente (derniers événements d'audit)
  getRecentActivity: permissionProcedure("analytics", "view")
    .input(z.object({ limit: z.number().min(1).max(50).default(20) }).optional())
    .query(async ({ input }) => {
      const db = (await getDb())!;
      const limit = input?.limit ?? 20;

      const events = await db.select({
        id: auditEvents.id,
        action: auditEvents.action,
        actorId: auditEvents.actorId,
        details: auditEvents.details,
        createdAt: auditEvents.createdAt,
      }).from(auditEvents)
        .orderBy(sql`${auditEvents.createdAt} DESC`)
        .limit(limit);

      return events;
    }),
});
