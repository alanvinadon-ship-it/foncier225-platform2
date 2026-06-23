/**
 * ERP AI Assistant Router — Sprint IA 1
 * 
 * Routes tRPC pour l'assistant IA central, conversations, recommandations, résumés, audit logs.
 */

import { z } from "zod";
import { eq, and, desc, sql, count, gte, lte } from "drizzle-orm";
import { router, erpPermissionProcedure } from "../_core/trpc";
import { getDb } from "../db";
import {
  erpAiConversations,
  erpAiMessages,
  erpAiRecommendations,
  erpAiAuditLogs,
  erpAiRiskScores,
  erpAiDocumentExtractions,
} from "../../drizzle/schema";
import {
  chatWithAssistant,
  generateProjectSummary,
  generateBudgetSummary,
  generateDirectionSummary,
  generateRecommendations,
} from "./erp-ai-assistant.service";

// ============================================================
// AI ASSISTANT ROUTER
// ============================================================

export const erpAiAssistantRouter = router({
  // ─── CHAT ────────────────────────────────────────────────
  chat: erpPermissionProcedure("erp_ai_assistant", "view")
    .input(z.object({
      conversationId: z.number().optional(),
      message: z.string().min(1).max(2000),
      module: z.string().default("general"),
      contextProjectId: z.number().optional(),
      contextBudgetId: z.number().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const result = await chatWithAssistant(ctx.user.id, ctx.user.role || "user", {
        conversationId: input.conversationId,
        message: input.message,
        module: input.module,
        contextProjectId: input.contextProjectId,
        contextBudgetId: input.contextBudgetId,
      });
      return result;
    }),

  // ─── CONVERSATIONS ───────────────────────────────────────
  conversations: router({
    list: erpPermissionProcedure("erp_ai_assistant", "view")
      .input(z.object({
        module: z.string().optional(),
        status: z.string().default("active"),
        page: z.number().default(1),
        limit: z.number().default(20),
      }))
      .query(async ({ ctx, input }) => {
        const db = (await getDb())!;
        const offset = (input.page - 1) * input.limit;
        const conditions = [
          eq(erpAiConversations.userId, ctx.user.id),
          eq(erpAiConversations.status, input.status),
        ];
        if (input.module) {
          conditions.push(eq(erpAiConversations.module, input.module));
        }
        const [rows, totalResult] = await Promise.all([
          db.select().from(erpAiConversations)
            .where(and(...conditions))
            .orderBy(desc(erpAiConversations.updatedAt))
            .limit(input.limit)
            .offset(offset),
          db.select({ total: count() }).from(erpAiConversations)
            .where(and(...conditions)),
        ]);
        return { conversations: rows, total: totalResult[0]?.total || 0 };
      }),

    getById: erpPermissionProcedure("erp_ai_assistant", "view")
      .input(z.object({ id: z.number() }))
      .query(async ({ ctx, input }) => {
        const db = (await getDb())!;
        const [conversation] = await db.select().from(erpAiConversations)
          .where(and(
            eq(erpAiConversations.id, input.id),
            eq(erpAiConversations.userId, ctx.user.id),
          ))
          .limit(1);
        if (!conversation) throw new Error("Conversation non trouvée");
        const messages = await db.select().from(erpAiMessages)
          .where(eq(erpAiMessages.conversationId, input.id))
          .orderBy(erpAiMessages.createdAt);
        return { conversation, messages };
      }),

    delete: erpPermissionProcedure("erp_ai_assistant", "view")
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const db = (await getDb())!;
        await db.update(erpAiConversations)
          .set({ status: "deleted", updatedAt: Date.now() })
          .where(and(
            eq(erpAiConversations.id, input.id),
            eq(erpAiConversations.userId, ctx.user.id),
          ));
        return { success: true };
      }),

    updateTitle: erpPermissionProcedure("erp_ai_assistant", "view")
      .input(z.object({ id: z.number(), title: z.string().min(1).max(255) }))
      .mutation(async ({ ctx, input }) => {
        const db = (await getDb())!;
        await db.update(erpAiConversations)
          .set({ title: input.title, updatedAt: Date.now() })
          .where(and(
            eq(erpAiConversations.id, input.id),
            eq(erpAiConversations.userId, ctx.user.id),
          ));
        return { success: true };
      }),
  }),

  // ─── SUMMARIES ───────────────────────────────────────────
  summaries: router({
    project: erpPermissionProcedure("erp_ai_assistant", "view")
      .input(z.object({ projectId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const summary = await generateProjectSummary(ctx.user.id, input.projectId);
        return { summary };
      }),

    budget: erpPermissionProcedure("erp_ai_assistant", "view")
      .input(z.object({ budgetId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const summary = await generateBudgetSummary(ctx.user.id, input.budgetId);
        return { summary };
      }),

    direction: erpPermissionProcedure("erp_ai_assistant", "view")
      .mutation(async ({ ctx }) => {
        const summary = await generateDirectionSummary(ctx.user.id);
        return { summary };
      }),
  }),

  // ─── RECOMMENDATIONS ─────────────────────────────────────
  recommendations: router({
    list: erpPermissionProcedure("erp_ai_assistant", "view")
      .input(z.object({
        module: z.string().optional(),
        status: z.string().optional(),
        priority: z.string().optional(),
        page: z.number().default(1),
        limit: z.number().default(20),
      }))
      .query(async ({ input }) => {
        const db = (await getDb())!;
        const offset = (input.page - 1) * input.limit;
        const conditions: any[] = [];
        if (input.module) conditions.push(eq(erpAiRecommendations.module, input.module));
        if (input.status) conditions.push(eq(erpAiRecommendations.status, input.status));
        if (input.priority) conditions.push(eq(erpAiRecommendations.priority, input.priority));
        const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
        const [rows, totalResult] = await Promise.all([
          db.select().from(erpAiRecommendations)
            .where(whereClause)
            .orderBy(desc(erpAiRecommendations.createdAt))
            .limit(input.limit)
            .offset(offset),
          db.select({ total: count() }).from(erpAiRecommendations)
            .where(whereClause),
        ]);
        return { recommendations: rows, total: totalResult[0]?.total || 0 };
      }),

    getById: erpPermissionProcedure("erp_ai_assistant", "view")
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        const db = (await getDb())!;
        const [rec] = await db.select().from(erpAiRecommendations)
          .where(eq(erpAiRecommendations.id, input.id))
          .limit(1);
        if (!rec) throw new Error("Recommandation non trouvée");
        return rec;
      }),

    accept: erpPermissionProcedure("erp_ai_assistant", "edit")
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const db = (await getDb())!;
        await db.update(erpAiRecommendations)
          .set({
            status: "accepted",
            validatedBy: ctx.user.id,
            validatedAt: Date.now(),
            updatedAt: Date.now(),
          })
          .where(eq(erpAiRecommendations.id, input.id));
        return { success: true };
      }),

    reject: erpPermissionProcedure("erp_ai_assistant", "edit")
      .input(z.object({ id: z.number(), reason: z.string().optional() }))
      .mutation(async ({ ctx, input }) => {
        const db = (await getDb())!;
        await db.update(erpAiRecommendations)
          .set({
            status: "rejected",
            rejectedBy: ctx.user.id,
            rejectedAt: Date.now(),
            updatedAt: Date.now(),
          })
          .where(eq(erpAiRecommendations.id, input.id));
        return { success: true };
      }),

    applyRecommendation: erpPermissionProcedure("erp_ai_assistant", "edit")
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const db = (await getDb())!;
        await db.update(erpAiRecommendations)
          .set({
            status: "applied",
            appliedBy: ctx.user.id,
            appliedAt: Date.now(),
            updatedAt: Date.now(),
          })
          .where(eq(erpAiRecommendations.id, input.id));
        return { success: true };
      }),

    generate: erpPermissionProcedure("erp_ai_assistant", "create")
      .input(z.object({ module: z.string().default("general") }))
      .mutation(async ({ ctx, input }) => {
        const count = await generateRecommendations(ctx.user.id, input.module);
        return { created: count };
      }),

    stats: erpPermissionProcedure("erp_ai_assistant", "view")
      .query(async () => {
        const db = (await getDb())!;
        const stats = await db.select({
          total: count(),
          suggested: sql<number>`SUM(CASE WHEN status = 'suggested' THEN 1 ELSE 0 END)`,
          accepted: sql<number>`SUM(CASE WHEN status = 'accepted' THEN 1 ELSE 0 END)`,
          rejected: sql<number>`SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END)`,
          applied: sql<number>`SUM(CASE WHEN status = 'applied' THEN 1 ELSE 0 END)`,
          critical: sql<number>`SUM(CASE WHEN priority = 'critical' THEN 1 ELSE 0 END)`,
          high: sql<number>`SUM(CASE WHEN priority = 'high' THEN 1 ELSE 0 END)`,
        }).from(erpAiRecommendations);
        return stats[0] || {};
      }),
  }),

  // ─── AUDIT LOGS ──────────────────────────────────────────
  auditLogs: router({
    list: erpPermissionProcedure("erp_ai_assistant", "view")
      .input(z.object({
        module: z.string().optional(),
        action: z.string().optional(),
        page: z.number().default(1),
        limit: z.number().default(50),
      }))
      .query(async ({ input }) => {
        const db = (await getDb())!;
        const offset = (input.page - 1) * input.limit;
        const conditions: any[] = [];
        if (input.module) conditions.push(eq(erpAiAuditLogs.module, input.module));
        if (input.action) conditions.push(eq(erpAiAuditLogs.action, input.action));
        const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
        const [rows, totalResult] = await Promise.all([
          db.select().from(erpAiAuditLogs)
            .where(whereClause)
            .orderBy(desc(erpAiAuditLogs.createdAt))
            .limit(input.limit)
            .offset(offset),
          db.select({ total: count() }).from(erpAiAuditLogs)
            .where(whereClause),
        ]);
        return { logs: rows, total: totalResult[0]?.total || 0 };
      }),

    stats: erpPermissionProcedure("erp_ai_assistant", "view")
      .query(async () => {
        const db = (await getDb())!;
        const stats = await db.select({
          totalCalls: count(),
          totalTokens: sql<number>`COALESCE(SUM(tokens_used), 0)`,
          avgDuration: sql<number>`COALESCE(AVG(duration_ms), 0)`,
          errorCount: sql<number>`SUM(CASE WHEN status = 'error' THEN 1 ELSE 0 END)`,
        }).from(erpAiAuditLogs);
        // Per module breakdown
        const perModule = await db.select({
          module: erpAiAuditLogs.module,
          calls: count(),
          tokens: sql<number>`COALESCE(SUM(tokens_used), 0)`,
        }).from(erpAiAuditLogs)
          .groupBy(erpAiAuditLogs.module);
        return { ...stats[0], perModule };
      }),
  }),

  // ─── RISK SCORES ─────────────────────────────────────────
  risks: router({
    list: erpPermissionProcedure("erp_ai_assistant", "view")
      .input(z.object({
        module: z.string().optional(),
        riskLevel: z.string().optional(),
        page: z.number().default(1),
        limit: z.number().default(20),
      }))
      .query(async ({ input }) => {
        const db = (await getDb())!;
        const offset = (input.page - 1) * input.limit;
        const conditions: any[] = [eq(erpAiRiskScores.isActive, true)];
        if (input.module) conditions.push(eq(erpAiRiskScores.module, input.module));
        if (input.riskLevel) conditions.push(eq(erpAiRiskScores.riskLevel, input.riskLevel));
        const whereClause = and(...conditions);
        const [rows, totalResult] = await Promise.all([
          db.select().from(erpAiRiskScores)
            .where(whereClause)
            .orderBy(desc(erpAiRiskScores.riskScore))
            .limit(input.limit)
            .offset(offset),
          db.select({ total: count() }).from(erpAiRiskScores)
            .where(whereClause),
        ]);
        return { risks: rows, total: totalResult[0]?.total || 0 };
      }),

    stats: erpPermissionProcedure("erp_ai_assistant", "view")
      .query(async () => {
        const db = (await getDb())!;
        const stats = await db.select({
          total: count(),
          critical: sql<number>`SUM(CASE WHEN risk_level = 'critical' THEN 1 ELSE 0 END)`,
          high: sql<number>`SUM(CASE WHEN risk_level = 'high' THEN 1 ELSE 0 END)`,
          medium: sql<number>`SUM(CASE WHEN risk_level = 'medium' THEN 1 ELSE 0 END)`,
          low: sql<number>`SUM(CASE WHEN risk_level = 'low' THEN 1 ELSE 0 END)`,
        }).from(erpAiRiskScores).where(eq(erpAiRiskScores.isActive, true));
        return stats[0] || {};
      }),
  }),

  // ─── DASHBOARD STATS ─────────────────────────────────────
  dashboard: erpPermissionProcedure("erp_ai_assistant", "view")
    .query(async ({ ctx }) => {
      const db = (await getDb())!;
      const [convStats] = await db.select({
        totalConversations: count(),
      }).from(erpAiConversations)
        .where(eq(erpAiConversations.userId, ctx.user.id));

      const [recStats] = await db.select({
        pending: sql<number>`SUM(CASE WHEN status = 'suggested' THEN 1 ELSE 0 END)`,
        critical: sql<number>`SUM(CASE WHEN priority = 'critical' AND status = 'suggested' THEN 1 ELSE 0 END)`,
      }).from(erpAiRecommendations);

      const [auditStats] = await db.select({
        totalCalls: count(),
        totalTokens: sql<number>`COALESCE(SUM(tokens_used), 0)`,
      }).from(erpAiAuditLogs);

      const [riskStats] = await db.select({
        activeRisks: count(),
        criticalRisks: sql<number>`SUM(CASE WHEN risk_level = 'critical' THEN 1 ELSE 0 END)`,
      }).from(erpAiRiskScores).where(eq(erpAiRiskScores.isActive, true));

      return {
        conversations: convStats?.totalConversations || 0,
        pendingRecommendations: recStats?.pending || 0,
        criticalRecommendations: recStats?.critical || 0,
        totalAiCalls: auditStats?.totalCalls || 0,
        totalTokensUsed: auditStats?.totalTokens || 0,
        activeRisks: riskStats?.activeRisks || 0,
        criticalRisks: riskStats?.criticalRisks || 0,
      };
    }),
});
