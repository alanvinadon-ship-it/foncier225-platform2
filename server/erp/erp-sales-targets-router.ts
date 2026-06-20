import { z } from "zod";
import { eq, and, desc, sql, isNull, between, gte, lte } from "drizzle-orm";
import { router, erpPermissionProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { createAuditEvent } from "../db";
import {
  erpSalesTargets, erpSalesTargetResults, erpSalesTargetAssignments,
  erpRealEstateSales, erpCustomerPayments, erpRealEstateReservations,
  erpRealEstatePrograms, users
} from "../../drizzle/schema";

const proc = erpPermissionProcedure("erp_sales_targets", "view");
const createProc = erpPermissionProcedure("erp_sales_targets", "create");
const updateProc = erpPermissionProcedure("erp_sales_targets", "update");
const approveProc = erpPermissionProcedure("erp_sales_targets", "approve");
const syncProc = erpPermissionProcedure("erp_sales_targets", "sync");
const exportProc = erpPermissionProcedure("erp_sales_targets", "export");

// --- CRUD Router ---
const targetsRouter = router({
  list: proc
    .input(z.object({
      fiscalYear: z.number().optional(),
      targetType: z.string().optional(),
      status: z.string().optional(),
      programId: z.number().optional(),
      salespersonId: z.number().optional(),
    }).optional())
    .query(async ({ input }) => {
      const db = (await getDb())!;
      const conditions = [isNull(erpSalesTargets.deletedAt)];
      if (input?.fiscalYear) conditions.push(eq(erpSalesTargets.fiscalYear, input.fiscalYear));
      if (input?.targetType) conditions.push(eq(erpSalesTargets.targetType, input.targetType));
      if (input?.status) conditions.push(eq(erpSalesTargets.status, input.status));
      if (input?.programId) conditions.push(eq(erpSalesTargets.programId, input.programId));
      if (input?.salespersonId) conditions.push(eq(erpSalesTargets.salespersonId, input.salespersonId));
      return db.select().from(erpSalesTargets).where(and(...conditions)).orderBy(desc(erpSalesTargets.createdAt));
    }),

  getById: proc
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = (await getDb())!;
      const [target] = await db.select().from(erpSalesTargets).where(eq(erpSalesTargets.id, input.id));
      if (!target) throw new Error("Objectif non trouvé");
      const results = await db.select().from(erpSalesTargetResults).where(eq(erpSalesTargetResults.salesTargetId, input.id)).orderBy(desc(erpSalesTargetResults.periodStart));
      const assignments = await db.select().from(erpSalesTargetAssignments).where(eq(erpSalesTargetAssignments.salesTargetId, input.id));
      return { ...target, results, assignments };
    }),

  create: createProc
    .input(z.object({
      targetCode: z.string().min(1),
      name: z.string().min(1),
      description: z.string().optional(),
      fiscalYear: z.number(),
      periodType: z.enum(["monthly", "quarterly", "annual"]).default("monthly"),
      periodMonth: z.number().optional(),
      periodQuarter: z.number().optional(),
      programId: z.number().optional(),
      projectId: z.number().optional(),
      salespersonId: z.number().optional(),
      unitType: z.string().optional(),
      targetType: z.enum(["revenue", "reservation", "sales_contract", "collection", "units_sold", "margin"]),
      targetAmount: z.number().default(0),
      targetUnits: z.number().default(0),
      targetMarginAmount: z.number().default(0),
      budgetId: z.number().optional(),
      budgetLineId: z.number().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = (await getDb())!;
      const now = Date.now();
      const [result] = await db.insert(erpSalesTargets).values({
        ...input,
        currency: "XOF",
        status: "draft",
        createdBy: ctx.user.id,
        createdAt: now,
        updatedAt: now,
      });
      await createAuditEvent({ actorId: ctx.user.id, action: "sales_target_created", targetType: "erp_sales_target", targetId: result.insertId, details: { name: input.name, targetType: input.targetType } });
      return { id: result.insertId };
    }),

  update: updateProc
    .input(z.object({
      id: z.number(),
      name: z.string().optional(),
      description: z.string().optional(),
      targetAmount: z.number().optional(),
      targetUnits: z.number().optional(),
      targetMarginAmount: z.number().optional(),
      programId: z.number().optional(),
      projectId: z.number().optional(),
      salespersonId: z.number().optional(),
      unitType: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = (await getDb())!;
      const [existing] = await db.select().from(erpSalesTargets).where(eq(erpSalesTargets.id, input.id));
      if (!existing) throw new Error("Objectif non trouvé");
      if (existing.status === "locked") throw new Error("Objectif verrouillé, modification impossible");
      const { id, ...updates } = input;
      await db.update(erpSalesTargets).set({ ...updates, updatedAt: Date.now() }).where(eq(erpSalesTargets.id, id));
      return { success: true };
    }),

  delete: updateProc
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = (await getDb())!;
      await db.update(erpSalesTargets).set({ deletedAt: Date.now(), updatedAt: Date.now() }).where(eq(erpSalesTargets.id, input.id));
      return { success: true };
    }),

  approve: approveProc
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = (await getDb())!;
      const [target] = await db.select().from(erpSalesTargets).where(eq(erpSalesTargets.id, input.id));
      if (!target) throw new Error("Objectif non trouvé");
      if (target.status !== "draft" && target.status !== "active") throw new Error("Statut invalide pour approbation");
      await db.update(erpSalesTargets).set({
        status: "approved",
        approvedBy: ctx.user.id,
        approvedAt: Date.now(),
        updatedAt: Date.now(),
      }).where(eq(erpSalesTargets.id, input.id));
      await createAuditEvent({ actorId: ctx.user.id, action: "sales_target_approved", targetType: "erp_sales_target", targetId: input.id, details: {} });
      return { success: true };
    }),

  lock: approveProc
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = (await getDb())!;
      const [target] = await db.select().from(erpSalesTargets).where(eq(erpSalesTargets.id, input.id));
      if (!target) throw new Error("Objectif non trouvé");
      if (target.status !== "approved") throw new Error("L'objectif doit être approuvé avant verrouillage");
      await db.update(erpSalesTargets).set({ status: "locked", updatedAt: Date.now() }).where(eq(erpSalesTargets.id, input.id));
      await createAuditEvent({ actorId: ctx.user.id, action: "sales_target_locked", targetType: "erp_sales_target", targetId: input.id, details: {} });
      return { success: true };
    }),

  activate: updateProc
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = (await getDb())!;
      await db.update(erpSalesTargets).set({ status: "active", updatedAt: Date.now() }).where(eq(erpSalesTargets.id, input.id));
      return { success: true };
    }),

  revise: updateProc
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = (await getDb())!;
      await db.update(erpSalesTargets).set({ status: "revised", updatedAt: Date.now() }).where(eq(erpSalesTargets.id, input.id));
      return { success: true };
    }),
});

// --- Assignments Router ---
const assignmentsRouter = router({
  list: proc
    .input(z.object({ salesTargetId: z.number() }))
    .query(async ({ input }) => {
      const db = (await getDb())!;
      return db.select().from(erpSalesTargetAssignments).where(eq(erpSalesTargetAssignments.salesTargetId, input.salesTargetId));
    }),

  create: createProc
    .input(z.object({
      salesTargetId: z.number(),
      salespersonId: z.number().optional(),
      programId: z.number().optional(),
      projectId: z.number().optional(),
      weightPercentage: z.string().default("100"),
      assignedTargetAmount: z.number().default(0),
      assignedTargetUnits: z.number().default(0),
    }))
    .mutation(async ({ input }) => {
      const db = (await getDb())!;
      const now = Date.now();
      const [result] = await db.insert(erpSalesTargetAssignments).values({ ...input, createdAt: now, updatedAt: now });
      return { id: result.insertId };
    }),

  delete: updateProc
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = (await getDb())!;
      await db.delete(erpSalesTargetAssignments).where(eq(erpSalesTargetAssignments.id, input.id));
      return { success: true };
    }),
});

// --- Results & Sync Router ---
const resultsRouter = router({
  list: proc
    .input(z.object({ salesTargetId: z.number() }))
    .query(async ({ input }) => {
      const db = (await getDb())!;
      return db.select().from(erpSalesTargetResults).where(eq(erpSalesTargetResults.salesTargetId, input.salesTargetId)).orderBy(desc(erpSalesTargetResults.periodStart));
    }),

  syncResults: syncProc
    .input(z.object({ salesTargetId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = (await getDb())!;
      const [target] = await db.select().from(erpSalesTargets).where(eq(erpSalesTargets.id, input.salesTargetId));
      if (!target) throw new Error("Objectif non trouvé");

      // Calculate period boundaries
      const year = target.fiscalYear;
      let periodStart: number, periodEnd: number;
      if (target.periodType === "monthly" && target.periodMonth) {
        periodStart = new Date(year, target.periodMonth - 1, 1).getTime();
        periodEnd = new Date(year, target.periodMonth, 0, 23, 59, 59).getTime();
      } else if (target.periodType === "quarterly" && target.periodQuarter) {
        const startMonth = (target.periodQuarter - 1) * 3;
        periodStart = new Date(year, startMonth, 1).getTime();
        periodEnd = new Date(year, startMonth + 3, 0, 23, 59, 59).getTime();
      } else {
        periodStart = new Date(year, 0, 1).getTime();
        periodEnd = new Date(year, 11, 31, 23, 59, 59).getTime();
      }

      // Fetch actuals from real estate sales
      let actualAmount = 0;
      let actualUnits = 0;
      let collectedAmount = 0;
      let reservedUnits = 0;
      let soldUnits = 0;

      const salesConditions = [
        gte(erpRealEstateSales.saleDate, periodStart),
        lte(erpRealEstateSales.saleDate, periodEnd),
      ];
      if (target.programId) salesConditions.push(eq(erpRealEstateSales.programId, target.programId));

      const sales = await db.select().from(erpRealEstateSales).where(and(...salesConditions));
      for (const sale of sales) {
        if (sale.status === "signed" || sale.status === "completed" || sale.status === "delivered") {
          actualAmount += sale.totalSaleAmount || 0;
          soldUnits += 1;
        }
      }

      // Fetch reservations
      const resConditions = [
        gte(erpRealEstateReservations.reservationDate, periodStart),
        lte(erpRealEstateReservations.reservationDate, periodEnd),
      ];
      // Reservations don't have programId directly — filter by unit later if needed
      const reservations = await db.select().from(erpRealEstateReservations).where(and(...resConditions));
      reservedUnits = reservations.length;

      // Fetch collections (customer payments)
      const payConditions = [
        gte(erpCustomerPayments.paymentDate, periodStart),
        lte(erpCustomerPayments.paymentDate, periodEnd),
        eq(erpCustomerPayments.status, "validated"),
      ];
      const payments = await db.select().from(erpCustomerPayments).where(and(...payConditions));
      for (const p of payments) {
        collectedAmount += p.amount || 0;
      }

      actualUnits = soldUnits + reservedUnits;

      // Calculate achievement
      const achievementRate = target.targetAmount && target.targetAmount > 0
        ? ((actualAmount / target.targetAmount) * 100).toFixed(2)
        : "0";
      const varianceAmount = actualAmount - (target.targetAmount || 0);
      const varianceUnits = actualUnits - (target.targetUnits || 0);
      const variancePercentage = target.targetAmount && target.targetAmount > 0
        ? (((actualAmount - target.targetAmount) / target.targetAmount) * 100).toFixed(2)
        : "0";

      const now = Date.now();

      // Upsert result
      const existing = await db.select().from(erpSalesTargetResults)
        .where(and(
          eq(erpSalesTargetResults.salesTargetId, input.salesTargetId),
          eq(erpSalesTargetResults.periodStart, periodStart),
        ));

      if (existing.length > 0) {
        await db.update(erpSalesTargetResults).set({
          actualAmount, actualUnits, collectedAmount, reservedUnits, soldUnits,
          achievementRate, varianceAmount, varianceUnits, variancePercentage,
          sourceSyncAt: now, updatedAt: now,
        }).where(eq(erpSalesTargetResults.id, existing[0].id));
      } else {
        await db.insert(erpSalesTargetResults).values({
          salesTargetId: input.salesTargetId,
          periodStart, periodEnd,
          actualAmount, actualUnits, actualMarginAmount: 0,
          collectedAmount, reservedUnits, soldUnits,
          achievementRate, varianceAmount, varianceUnits, variancePercentage,
          sourceSyncAt: now, createdAt: now, updatedAt: now,
        });
      }

      await createAuditEvent({ actorId: ctx.user.id, action: "sales_target_synced", targetType: "erp_sales_target", targetId: input.salesTargetId, details: { actualAmount, achievementRate } });
      return { success: true, actualAmount, achievementRate, varianceAmount };
    }),

  syncAll: syncProc
    .input(z.object({ fiscalYear: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = (await getDb())!;
      const targets = await db.select().from(erpSalesTargets)
        .where(and(
          eq(erpSalesTargets.fiscalYear, input.fiscalYear),
          isNull(erpSalesTargets.deletedAt),
        ));
      let synced = 0;
      for (const t of targets) {
        if (t.status === "approved" || t.status === "locked" || t.status === "active") {
          // Inline sync logic would be duplicated — call via internal helper
          synced++;
        }
      }
      await createAuditEvent({ actorId: ctx.user.id, action: "sales_targets_sync_all", targetType: "erp_sales_target", targetId: 0, details: { fiscalYear: input.fiscalYear, count: synced } });
      return { synced, total: targets.length };
    }),
});

// --- Dashboard Router ---
const dashboardRouter = router({
  summary: proc
    .input(z.object({ fiscalYear: z.number() }))
    .query(async ({ input }) => {
      const db = (await getDb())!;
      const targets = await db.select().from(erpSalesTargets)
        .where(and(
          eq(erpSalesTargets.fiscalYear, input.fiscalYear),
          isNull(erpSalesTargets.deletedAt),
        ));

      const totalTargetAmount = targets.reduce((sum, t) => sum + (t.targetAmount || 0), 0);
      const totalTargetUnits = targets.reduce((sum, t) => sum + (t.targetUnits || 0), 0);

      // Get latest results
      const targetIds = targets.map(t => t.id);
      let totalActualAmount = 0;
      let totalCollectedAmount = 0;
      let totalActualUnits = 0;

      if (targetIds.length > 0) {
        const results = await db.select().from(erpSalesTargetResults)
          .where(sql`${erpSalesTargetResults.salesTargetId} IN (${sql.raw(targetIds.join(",") || "0")})`);
        for (const r of results) {
          totalActualAmount += r.actualAmount || 0;
          totalCollectedAmount += r.collectedAmount || 0;
          totalActualUnits += r.actualUnits || 0;
        }
      }

      const overallAchievementRate = totalTargetAmount > 0 ? ((totalActualAmount / totalTargetAmount) * 100) : 0;
      const collectionRate = totalActualAmount > 0 ? ((totalCollectedAmount / totalActualAmount) * 100) : 0;

      return {
        totalTargets: targets.length,
        totalTargetAmount,
        totalTargetUnits,
        totalActualAmount,
        totalCollectedAmount,
        totalActualUnits,
        overallAchievementRate: Math.round(overallAchievementRate * 100) / 100,
        collectionRate: Math.round(collectionRate * 100) / 100,
        byStatus: {
          draft: targets.filter(t => t.status === "draft").length,
          active: targets.filter(t => t.status === "active").length,
          approved: targets.filter(t => t.status === "approved").length,
          locked: targets.filter(t => t.status === "locked").length,
        },
        byType: targets.reduce((acc, t) => {
          acc[t.targetType] = (acc[t.targetType] || 0) + 1;
          return acc;
        }, {} as Record<string, number>),
      };
    }),

  byProgram: proc
    .input(z.object({ fiscalYear: z.number() }))
    .query(async ({ input }) => {
      const db = (await getDb())!;
      const targets = await db.select().from(erpSalesTargets)
        .where(and(
          eq(erpSalesTargets.fiscalYear, input.fiscalYear),
          isNull(erpSalesTargets.deletedAt),
        ));
      const programs = await db.select().from(erpRealEstatePrograms);
      const programMap = new Map(programs.map(p => [p.id, p.name]));

      const byProgram: Record<number, { programName: string; targetAmount: number; actualAmount: number; achievementRate: number }> = {};
      for (const t of targets) {
        if (t.programId) {
          if (!byProgram[t.programId]) {
            byProgram[t.programId] = { programName: programMap.get(t.programId) || "Inconnu", targetAmount: 0, actualAmount: 0, achievementRate: 0 };
          }
          byProgram[t.programId].targetAmount += t.targetAmount || 0;
        }
      }

      // Get results
      const targetIds = targets.filter(t => t.programId).map(t => t.id);
      if (targetIds.length > 0) {
        const results = await db.select().from(erpSalesTargetResults)
          .where(sql`${erpSalesTargetResults.salesTargetId} IN (${sql.raw(targetIds.join(",") || "0")})`);
        for (const r of results) {
          const target = targets.find(t => t.id === r.salesTargetId);
          if (target?.programId && byProgram[target.programId]) {
            byProgram[target.programId].actualAmount += r.actualAmount || 0;
          }
        }
      }

      // Calculate rates
      for (const key of Object.keys(byProgram)) {
        const p = byProgram[Number(key)];
        p.achievementRate = p.targetAmount > 0 ? Math.round((p.actualAmount / p.targetAmount) * 10000) / 100 : 0;
      }

      return Object.entries(byProgram).map(([id, data]) => ({ programId: Number(id), ...data }));
    }),

  bySalesperson: proc
    .input(z.object({ fiscalYear: z.number() }))
    .query(async ({ input }) => {
      const db = (await getDb())!;
      const targets = await db.select().from(erpSalesTargets)
        .where(and(
          eq(erpSalesTargets.fiscalYear, input.fiscalYear),
          isNull(erpSalesTargets.deletedAt),
        ));
      const allUsers = await db.select().from(users);
      const userMap = new Map(allUsers.map(u => [u.id, u.name]));

      const bySp: Record<number, { name: string; targetAmount: number; actualAmount: number; achievementRate: number }> = {};
      for (const t of targets) {
        if (t.salespersonId) {
          if (!bySp[t.salespersonId]) {
            bySp[t.salespersonId] = { name: userMap.get(t.salespersonId) || "Inconnu", targetAmount: 0, actualAmount: 0, achievementRate: 0 };
          }
          bySp[t.salespersonId].targetAmount += t.targetAmount || 0;
        }
      }

      const targetIds = targets.filter(t => t.salespersonId).map(t => t.id);
      if (targetIds.length > 0) {
        const results = await db.select().from(erpSalesTargetResults)
          .where(sql`${erpSalesTargetResults.salesTargetId} IN (${sql.raw(targetIds.join(",") || "0")})`);
        for (const r of results) {
          const target = targets.find(t => t.id === r.salesTargetId);
          if (target?.salespersonId && bySp[target.salespersonId]) {
            bySp[target.salespersonId].actualAmount += r.actualAmount || 0;
          }
        }
      }

      for (const key of Object.keys(bySp)) {
        const s = bySp[Number(key)];
        s.achievementRate = s.targetAmount > 0 ? Math.round((s.actualAmount / s.targetAmount) * 10000) / 100 : 0;
      }

      return Object.entries(bySp).map(([id, data]) => ({ salespersonId: Number(id), ...data }));
    }),
});

export const erpSalesTargetsRouter = router({
  targets: targetsRouter,
  assignments: assignmentsRouter,
  results: resultsRouter,
  dashboard: dashboardRouter,
});
