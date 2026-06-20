import { z } from "zod";
import { eq, and, desc, sql, isNull, gte, lte, like } from "drizzle-orm";
import { router, erpPermissionProcedure } from "../_core/trpc";
import { getDb, createAuditEvent } from "../db";
import {
  erpExpenses,
  erpExpenseCategories,
  erpVendors,
  erpProjects,
  users,
} from "../../drizzle/schema";

// ============================================================
// ERP EXPENSES ROUTER — Sprint 21
// Catégories de dépenses, Notes de frais, Workflow approbation
// ============================================================

function generateExpenseNumber(): string {
  const d = new Date();
  const y = d.getFullYear().toString().slice(-2);
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const rand = Math.floor(Math.random() * 9000 + 1000);
  return `NF-${y}${m}-${rand}`;
}

// --- CATÉGORIES DE DÉPENSES ---
const categoriesRouter = router({
  list: erpPermissionProcedure("erp_expenses", "view")
    .input(z.object({ isActive: z.boolean().optional() }).optional())
    .query(async ({ input }) => {
      const db = (await getDb())!;
      const conditions: any[] = [isNull(erpExpenseCategories.deletedAt)];
      if (input?.isActive !== undefined) conditions.push(eq(erpExpenseCategories.isActive, input.isActive));
      const where = and(...conditions);
      return db.select().from(erpExpenseCategories).where(where).orderBy(erpExpenseCategories.name);
    }),

  create: erpPermissionProcedure("erp_expenses", "create")
    .input(z.object({
      code: z.string().min(1).max(16),
      name: z.string().min(1).max(128),
      description: z.string().optional(),
      parentId: z.number().nullable().optional(),
      defaultAccountingAccountId: z.number().nullable().optional(),
      defaultTaxCodeId: z.number().nullable().optional(),
      requiresReceipt: z.boolean().default(false),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = (await getDb())!;
      const now = Date.now();
      const [result] = await db.insert(erpExpenseCategories).values({
        code: input.code,
        name: input.name,
        description: input.description ?? null,
        parentId: input.parentId ?? null,
        defaultAccountingAccountId: input.defaultAccountingAccountId ?? null,
        defaultTaxCodeId: input.defaultTaxCodeId ?? null,
        requiresReceipt: input.requiresReceipt,
        isActive: true,
        createdAt: now,
        updatedAt: now,
      });
      return { id: result.insertId };
    }),
});

// --- DÉPENSES / NOTES DE FRAIS ---
const expensesRouter = router({
  list: erpPermissionProcedure("erp_expenses", "view")
    .input(z.object({
      status: z.string().optional(),
      projectId: z.number().optional(),
      expenseCategoryId: z.number().optional(),
      employeeId: z.number().optional(),
      dateFrom: z.number().optional(),
      dateTo: z.number().optional(),
      search: z.string().optional(),
      limit: z.number().min(1).max(100).default(50),
      offset: z.number().min(0).default(0),
    }).optional())
    .query(async ({ input }) => {
      const db = (await getDb())!;
      const params = input || { limit: 50, offset: 0 };
      const conditions: any[] = [isNull(erpExpenses.deletedAt)];
      if (params.status) conditions.push(eq(erpExpenses.status, params.status));
      if (params.projectId) conditions.push(eq(erpExpenses.projectId, params.projectId));
      if (params.expenseCategoryId) conditions.push(eq(erpExpenses.expenseCategoryId, params.expenseCategoryId));
      if (params.employeeId) conditions.push(eq(erpExpenses.employeeId, params.employeeId));
      if (params.dateFrom) conditions.push(gte(erpExpenses.expenseDate, params.dateFrom));
      if (params.dateTo) conditions.push(lte(erpExpenses.expenseDate, params.dateTo));
      if (params.search) conditions.push(like(erpExpenses.expenseNumber, `%${params.search}%`));
      const where = and(...conditions);
      const [items, countResult] = await Promise.all([
        db.select().from(erpExpenses).where(where).orderBy(desc(erpExpenses.expenseDate)).limit(params.limit).offset(params.offset),
        db.select({ count: sql<number>`COUNT(*)` }).from(erpExpenses).where(where),
      ]);
      return { expenses: items, total: countResult[0].count };
    }),

  getById: erpPermissionProcedure("erp_expenses", "view")
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = (await getDb())!;
      const [expense] = await db.select().from(erpExpenses).where(eq(erpExpenses.id, input.id));
      return expense || null;
    }),

  create: erpPermissionProcedure("erp_expenses", "create")
    .input(z.object({
      projectId: z.number().nullable().optional(),
      expenseCategoryId: z.number().nullable().optional(),
      vendorId: z.number().nullable().optional(),
      expenseDate: z.number(),
      description: z.string().optional(),
      subtotalAmount: z.number().min(0),
      taxAmount: z.number().min(0).default(0),
      paymentMethod: z.string().max(32).optional(),
      paymentAccountId: z.number().nullable().optional(),
      isReimbursable: z.boolean().default(false),
      documentUrl: z.string().optional(),
      documentKey: z.string().optional(),
      budgetLineId: z.number().nullable().optional(),
      accountingAccountId: z.number().nullable().optional(),
      taxCodeId: z.number().nullable().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = (await getDb())!;
      const now = Date.now();
      const expenseNumber = generateExpenseNumber();
      const totalAmount = input.subtotalAmount + input.taxAmount;

      const [result] = await db.insert(erpExpenses).values({
        expenseNumber,
        projectId: input.projectId ?? null,
        expenseCategoryId: input.expenseCategoryId ?? null,
        vendorId: input.vendorId ?? null,
        employeeId: ctx.user.id,
        expenseDate: input.expenseDate,
        description: input.description ?? null,
        subtotalAmount: input.subtotalAmount,
        taxAmount: input.taxAmount,
        totalAmount,
        currency: "XOF",
        paymentMethod: input.paymentMethod ?? null,
        paymentAccountId: input.paymentAccountId ?? null,
        status: "draft",
        isReimbursable: input.isReimbursable,
        documentUrl: input.documentUrl ?? null,
        documentKey: input.documentKey ?? null,
        budgetLineId: input.budgetLineId ?? null,
        accountingAccountId: input.accountingAccountId ?? null,
        taxCodeId: input.taxCodeId ?? null,
        createdBy: ctx.user.id,
        createdAt: now,
        updatedAt: now,
      });

      await createAuditEvent({ actorId: ctx.user.id, action: "erp.expenses.created", targetType: "expense", targetId: result.insertId, details: { expenseNumber, totalAmount } });
      return { id: result.insertId, expenseNumber };
    }),

  update: erpPermissionProcedure("erp_expenses", "update")
    .input(z.object({
      id: z.number(),
      projectId: z.number().nullable().optional(),
      expenseCategoryId: z.number().nullable().optional(),
      vendorId: z.number().nullable().optional(),
      expenseDate: z.number().optional(),
      description: z.string().nullable().optional(),
      subtotalAmount: z.number().min(0).optional(),
      taxAmount: z.number().min(0).optional(),
      paymentMethod: z.string().max(32).nullable().optional(),
      paymentAccountId: z.number().nullable().optional(),
      isReimbursable: z.boolean().optional(),
      documentUrl: z.string().nullable().optional(),
      documentKey: z.string().nullable().optional(),
      budgetLineId: z.number().nullable().optional(),
      accountingAccountId: z.number().nullable().optional(),
      taxCodeId: z.number().nullable().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = (await getDb())!;
      const { id, ...data } = input;
      const updateData: any = { ...data, updatedAt: Date.now() };
      if (data.subtotalAmount !== undefined || data.taxAmount !== undefined) {
        const [existing] = await db.select().from(erpExpenses).where(eq(erpExpenses.id, id));
        if (existing) {
          const sub = data.subtotalAmount ?? existing.subtotalAmount;
          const tax = data.taxAmount ?? existing.taxAmount;
          updateData.totalAmount = sub + tax;
        }
      }
      await db.update(erpExpenses).set(updateData).where(eq(erpExpenses.id, id));
      await createAuditEvent({ actorId: ctx.user.id, action: "erp.expenses.updated", targetType: "expense", targetId: id, details: data });
      return { success: true };
    }),

  submit: erpPermissionProcedure("erp_expenses", "create")
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = (await getDb())!;
      await db.update(erpExpenses).set({ status: "submitted", updatedAt: Date.now() }).where(eq(erpExpenses.id, input.id));
      await createAuditEvent({ actorId: ctx.user.id, action: "erp.expenses.submitted", targetType: "expense", targetId: input.id, details: {} });
      return { success: true };
    }),

  approve: erpPermissionProcedure("erp_expenses", "approve")
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = (await getDb())!;
      const now = Date.now();
      await db.update(erpExpenses).set({ status: "approved", approvedBy: ctx.user.id, approvedAt: now, updatedAt: now }).where(eq(erpExpenses.id, input.id));
      await createAuditEvent({ actorId: ctx.user.id, action: "erp.expenses.approved", targetType: "expense", targetId: input.id, details: {} });
      return { success: true };
    }),

  reject: erpPermissionProcedure("erp_expenses", "approve")
    .input(z.object({ id: z.number(), reason: z.string().min(1) }))
    .mutation(async ({ input, ctx }) => {
      const db = (await getDb())!;
      const now = Date.now();
      await db.update(erpExpenses).set({ status: "rejected", rejectedBy: ctx.user.id, rejectedAt: now, rejectionReason: input.reason, updatedAt: now }).where(eq(erpExpenses.id, input.id));
      await createAuditEvent({ actorId: ctx.user.id, action: "erp.expenses.rejected", targetType: "expense", targetId: input.id, details: { reason: input.reason } });
      return { success: true };
    }),

  delete: erpPermissionProcedure("erp_expenses", "delete")
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = (await getDb())!;
      await db.update(erpExpenses).set({ deletedAt: Date.now(), updatedAt: Date.now() }).where(eq(erpExpenses.id, input.id));
      await createAuditEvent({ actorId: ctx.user.id, action: "erp.expenses.deleted", targetType: "expense", targetId: input.id, details: {} });
      return { success: true };
    }),
});

// --- STATS DÉPENSES ---
const statsRouter = router({
  overview: erpPermissionProcedure("erp_expenses", "view")
    .input(z.object({
      dateFrom: z.number().optional(),
      dateTo: z.number().optional(),
    }).optional())
    .query(async ({ input }) => {
      const db = (await getDb())!;
      const conditions: any[] = [isNull(erpExpenses.deletedAt)];
      if (input?.dateFrom) conditions.push(gte(erpExpenses.expenseDate, input.dateFrom));
      if (input?.dateTo) conditions.push(lte(erpExpenses.expenseDate, input.dateTo));
      const where = and(...conditions);

      const [totalCount] = await db.select({ count: sql<number>`COUNT(*)` }).from(erpExpenses).where(where);
      const [pendingCount] = await db.select({ count: sql<number>`COUNT(*)` }).from(erpExpenses).where(and(...conditions, eq(erpExpenses.status, "submitted")));
      const [totalAmount] = await db.select({ total: sql<number>`COALESCE(SUM(total_amount), 0)` }).from(erpExpenses).where(and(...conditions, sql`status NOT IN ('draft', 'cancelled', 'rejected')`));
      const [reimbursableAmount] = await db.select({ total: sql<number>`COALESCE(SUM(total_amount), 0)` }).from(erpExpenses).where(and(...conditions, eq(erpExpenses.isReimbursable, true), sql`status IN ('approved', 'paid')`));

      return {
        totalExpenses: totalCount.count,
        pendingApproval: pendingCount.count,
        totalAmount: totalAmount.total,
        reimbursableAmount: reimbursableAmount.total,
      };
    }),
});

// ============================================================
// EXPORT
// ============================================================
export const erpExpensesRouter = router({
  categories: categoriesRouter,
  expenses: expensesRouter,
  stats: statsRouter,
});
