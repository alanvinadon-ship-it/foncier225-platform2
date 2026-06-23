/**
 * ERP AI Provider Router — Paramétrage Fournisseurs IA
 * 
 * Routes tRPC admin pour :
 * - Providers CRUD + test + activate/deactivate + setDefault + rotateKey
 * - Model Settings CRUD
 * - Task Routing CRUD
 * - Usage Logs (summary, by-provider, by-module, list)
 * - Cost Limits CRUD
 */
import { z } from "zod";
import { eq, and, desc, sql, isNull, asc } from "drizzle-orm";
import { router, protectedProcedure } from "../_core/trpc";
import { getDb } from "../db";
import {
  erpAiProviders,
  erpAiModelSettings,
  erpAiTaskRouting,
  erpAiUsageLogs,
  erpAiCostLimits,
} from "../../drizzle/schema";
import {
  encryptApiKey,
  decryptApiKey,
  maskApiKey,
  testProviderConnection,
  getUsageSummary,
  getUsageByProvider,
  getUsageByModule,
  PROVIDER_TYPES,
  TASK_TYPES,
  AI_MODULES,
} from "./erp-ai-provider.service";

// ============================================================
// PROVIDERS SUB-ROUTER
// ============================================================

const providersRouter = router({
  list: protectedProcedure.query(async () => {
    const db = (await getDb())!;
    const providers = await db
      .select()
      .from(erpAiProviders)
      .where(isNull(erpAiProviders.deletedAt))
      .orderBy(desc(erpAiProviders.isDefault), asc(erpAiProviders.providerName));

    // Never return encrypted keys — only masked version
    return providers.map(p => ({
      ...p,
      encryptedApiKey: undefined,
      maskedApiKey: p.encryptedApiKey ? maskApiKey((() => { try { return decryptApiKey(p.encryptedApiKey!); } catch { return "****"; } })()) : null,
      hasApiKey: !!p.encryptedApiKey,
    }));
  }),

  getById: protectedProcedure.input(z.object({ id: z.number() })).query(async ({ input }) => {
    const db = (await getDb())!;
    const [provider] = await db
      .select()
      .from(erpAiProviders)
      .where(and(eq(erpAiProviders.id, input.id), isNull(erpAiProviders.deletedAt)));
    if (!provider) return null;
    return {
      ...provider,
      encryptedApiKey: undefined,
      maskedApiKey: provider.encryptedApiKey ? maskApiKey((() => { try { return decryptApiKey(provider.encryptedApiKey!); } catch { return "****"; } })()) : null,
      hasApiKey: !!provider.encryptedApiKey,
    };
  }),

  create: protectedProcedure.input(z.object({
    providerCode: z.string().min(1),
    providerName: z.string().min(1),
    providerType: z.string(),
    baseUrl: z.string().optional(),
    apiKey: z.string().optional(),
    organizationId: z.string().optional(),
    projectId: z.string().optional(),
    defaultTextModel: z.string().optional(),
    defaultVisionModel: z.string().optional(),
    defaultEmbeddingModel: z.string().optional(),
    supportsText: z.boolean().default(true),
    supportsVision: z.boolean().default(false),
    supportsEmbeddings: z.boolean().default(false),
    supportsStreaming: z.boolean().default(false),
    supportsJsonMode: z.boolean().default(false),
    maxTokens: z.number().default(4096),
    temperature: z.string().default("0.7"),
    timeoutSeconds: z.number().default(60),
    headersJson: z.string().optional(),
  })).mutation(async ({ input, ctx }) => {
    const db = (await getDb())!;
    const encryptedKey = input.apiKey ? encryptApiKey(input.apiKey) : null;

    const [result] = await db.insert(erpAiProviders).values({
      providerCode: input.providerCode,
      providerName: input.providerName,
      providerType: input.providerType,
      baseUrl: input.baseUrl || null,
      encryptedApiKey: encryptedKey,
      organizationId: input.organizationId || null,
      projectId: input.projectId || null,
      defaultTextModel: input.defaultTextModel || null,
      defaultVisionModel: input.defaultVisionModel || null,
      defaultEmbeddingModel: input.defaultEmbeddingModel || null,
      supportsText: input.supportsText ? 1 : 0,
      supportsVision: input.supportsVision ? 1 : 0,
      supportsEmbeddings: input.supportsEmbeddings ? 1 : 0,
      supportsStreaming: input.supportsStreaming ? 1 : 0,
      supportsJsonMode: input.supportsJsonMode ? 1 : 0,
      maxTokens: input.maxTokens,
      temperature: input.temperature,
      timeoutSeconds: input.timeoutSeconds,
      headersJson: input.headersJson || null,
      isDefault: 0,
      isActive: 1,
      createdBy: ctx.user?.id || null,
      updatedBy: ctx.user?.id || null,
    });

    return { id: result.insertId, success: true };
  }),

  update: protectedProcedure.input(z.object({
    id: z.number(),
    providerName: z.string().optional(),
    providerType: z.string().optional(),
    baseUrl: z.string().optional(),
    apiKey: z.string().optional(), // Only set if changing key
    organizationId: z.string().optional(),
    projectId: z.string().optional(),
    defaultTextModel: z.string().optional(),
    defaultVisionModel: z.string().optional(),
    defaultEmbeddingModel: z.string().optional(),
    supportsText: z.boolean().optional(),
    supportsVision: z.boolean().optional(),
    supportsEmbeddings: z.boolean().optional(),
    supportsStreaming: z.boolean().optional(),
    supportsJsonMode: z.boolean().optional(),
    maxTokens: z.number().optional(),
    temperature: z.string().optional(),
    timeoutSeconds: z.number().optional(),
    headersJson: z.string().optional(),
  })).mutation(async ({ input, ctx }) => {
    const db = (await getDb())!;
    const updateData: any = { updatedAt: Date.now(), updatedBy: ctx.user?.id };

    if (input.providerName !== undefined) updateData.providerName = input.providerName;
    if (input.providerType !== undefined) updateData.providerType = input.providerType;
    if (input.baseUrl !== undefined) updateData.baseUrl = input.baseUrl || null;
    if (input.apiKey !== undefined) updateData.encryptedApiKey = input.apiKey ? encryptApiKey(input.apiKey) : null;
    if (input.organizationId !== undefined) updateData.organizationId = input.organizationId || null;
    if (input.projectId !== undefined) updateData.projectId = input.projectId || null;
    if (input.defaultTextModel !== undefined) updateData.defaultTextModel = input.defaultTextModel || null;
    if (input.defaultVisionModel !== undefined) updateData.defaultVisionModel = input.defaultVisionModel || null;
    if (input.defaultEmbeddingModel !== undefined) updateData.defaultEmbeddingModel = input.defaultEmbeddingModel || null;
    if (input.supportsText !== undefined) updateData.supportsText = input.supportsText ? 1 : 0;
    if (input.supportsVision !== undefined) updateData.supportsVision = input.supportsVision ? 1 : 0;
    if (input.supportsEmbeddings !== undefined) updateData.supportsEmbeddings = input.supportsEmbeddings ? 1 : 0;
    if (input.supportsStreaming !== undefined) updateData.supportsStreaming = input.supportsStreaming ? 1 : 0;
    if (input.supportsJsonMode !== undefined) updateData.supportsJsonMode = input.supportsJsonMode ? 1 : 0;
    if (input.maxTokens !== undefined) updateData.maxTokens = input.maxTokens;
    if (input.temperature !== undefined) updateData.temperature = input.temperature;
    if (input.timeoutSeconds !== undefined) updateData.timeoutSeconds = input.timeoutSeconds;
    if (input.headersJson !== undefined) updateData.headersJson = input.headersJson || null;

    await db.update(erpAiProviders).set(updateData).where(eq(erpAiProviders.id, input.id));
    return { success: true };
  }),

  delete: protectedProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
    const db = (await getDb())!;
    await db.update(erpAiProviders).set({ deletedAt: Date.now(), updatedAt: Date.now() }).where(eq(erpAiProviders.id, input.id));
    return { success: true };
  }),

  test: protectedProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
    return testProviderConnection(input.id);
  }),

  activate: protectedProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
    const db = (await getDb())!;
    await db.update(erpAiProviders).set({ isActive: 1, updatedAt: Date.now() }).where(eq(erpAiProviders.id, input.id));
    return { success: true };
  }),

  deactivate: protectedProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
    const db = (await getDb())!;
    await db.update(erpAiProviders).set({ isActive: 0, updatedAt: Date.now() }).where(eq(erpAiProviders.id, input.id));
    return { success: true };
  }),

  setDefault: protectedProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
    const db = (await getDb())!;
    // Remove default from all
    await db.update(erpAiProviders).set({ isDefault: 0, updatedAt: Date.now() }).where(isNull(erpAiProviders.deletedAt));
    // Set new default
    await db.update(erpAiProviders).set({ isDefault: 1, updatedAt: Date.now() }).where(eq(erpAiProviders.id, input.id));
    return { success: true };
  }),

  rotateKey: protectedProcedure.input(z.object({ id: z.number(), newApiKey: z.string().min(1) })).mutation(async ({ input, ctx }) => {
    const db = (await getDb())!;
    const encryptedKey = encryptApiKey(input.newApiKey);
    await db.update(erpAiProviders).set({
      encryptedApiKey: encryptedKey,
      updatedAt: Date.now(),
      updatedBy: ctx.user?.id,
    }).where(eq(erpAiProviders.id, input.id));
    return { success: true };
  }),

  // Constants for UI
  types: protectedProcedure.query(() => ({
    providerTypes: PROVIDER_TYPES,
    taskTypes: TASK_TYPES,
    modules: AI_MODULES,
  })),
});

// ============================================================
// MODEL SETTINGS SUB-ROUTER
// ============================================================

const modelSettingsRouter = router({
  list: protectedProcedure.input(z.object({ providerId: z.number().optional() }).optional()).query(async ({ input }) => {
    const db = (await getDb())!;
    const conditions: any[] = [];
    if (input?.providerId) conditions.push(eq(erpAiModelSettings.providerId, input.providerId));
    return db.select().from(erpAiModelSettings).where(conditions.length > 0 ? and(...conditions) : undefined).orderBy(asc(erpAiModelSettings.taskType));
  }),

  create: protectedProcedure.input(z.object({
    providerId: z.number(),
    taskType: z.string(),
    modelName: z.string(),
    temperature: z.string().default("0.7"),
    maxTokens: z.number().default(4096),
    timeoutSeconds: z.number().default(60),
    topP: z.string().optional(),
    frequencyPenalty: z.string().optional(),
    presencePenalty: z.string().optional(),
    jsonModeEnabled: z.boolean().default(false),
  })).mutation(async ({ input }) => {
    const db = (await getDb())!;
    const [result] = await db.insert(erpAiModelSettings).values({
      providerId: input.providerId,
      taskType: input.taskType,
      modelName: input.modelName,
      temperature: input.temperature,
      maxTokens: input.maxTokens,
      timeoutSeconds: input.timeoutSeconds,
      topP: input.topP || null,
      frequencyPenalty: input.frequencyPenalty || null,
      presencePenalty: input.presencePenalty || null,
      jsonModeEnabled: input.jsonModeEnabled ? 1 : 0,
      isActive: 1,
    });
    return { id: result.insertId, success: true };
  }),

  update: protectedProcedure.input(z.object({
    id: z.number(),
    modelName: z.string().optional(),
    temperature: z.string().optional(),
    maxTokens: z.number().optional(),
    timeoutSeconds: z.number().optional(),
    topP: z.string().optional(),
    frequencyPenalty: z.string().optional(),
    presencePenalty: z.string().optional(),
    jsonModeEnabled: z.boolean().optional(),
    isActive: z.boolean().optional(),
  })).mutation(async ({ input }) => {
    const db = (await getDb())!;
    const updateData: any = { updatedAt: Date.now() };
    if (input.modelName !== undefined) updateData.modelName = input.modelName;
    if (input.temperature !== undefined) updateData.temperature = input.temperature;
    if (input.maxTokens !== undefined) updateData.maxTokens = input.maxTokens;
    if (input.timeoutSeconds !== undefined) updateData.timeoutSeconds = input.timeoutSeconds;
    if (input.topP !== undefined) updateData.topP = input.topP || null;
    if (input.frequencyPenalty !== undefined) updateData.frequencyPenalty = input.frequencyPenalty || null;
    if (input.presencePenalty !== undefined) updateData.presencePenalty = input.presencePenalty || null;
    if (input.jsonModeEnabled !== undefined) updateData.jsonModeEnabled = input.jsonModeEnabled ? 1 : 0;
    if (input.isActive !== undefined) updateData.isActive = input.isActive ? 1 : 0;
    await db.update(erpAiModelSettings).set(updateData).where(eq(erpAiModelSettings.id, input.id));
    return { success: true };
  }),

  delete: protectedProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
    const db = (await getDb())!;
    await db.delete(erpAiModelSettings).where(eq(erpAiModelSettings.id, input.id));
    return { success: true };
  }),
});

// ============================================================
// TASK ROUTING SUB-ROUTER
// ============================================================

const taskRoutingRouter = router({
  list: protectedProcedure.query(async () => {
    const db = (await getDb())!;
    return db.select().from(erpAiTaskRouting).orderBy(asc(erpAiTaskRouting.module), asc(erpAiTaskRouting.taskType));
  }),

  create: protectedProcedure.input(z.object({
    module: z.string(),
    taskType: z.string(),
    primaryProviderId: z.number(),
    fallbackProviderId: z.number().optional(),
    secondFallbackProviderId: z.number().optional(),
  })).mutation(async ({ input }) => {
    const db = (await getDb())!;
    const [result] = await db.insert(erpAiTaskRouting).values({
      module: input.module,
      taskType: input.taskType,
      primaryProviderId: input.primaryProviderId,
      fallbackProviderId: input.fallbackProviderId || null,
      secondFallbackProviderId: input.secondFallbackProviderId || null,
      enabled: 1,
    });
    return { id: result.insertId, success: true };
  }),

  update: protectedProcedure.input(z.object({
    id: z.number(),
    primaryProviderId: z.number().optional(),
    fallbackProviderId: z.number().nullable().optional(),
    secondFallbackProviderId: z.number().nullable().optional(),
    enabled: z.boolean().optional(),
  })).mutation(async ({ input }) => {
    const db = (await getDb())!;
    const updateData: any = { updatedAt: Date.now() };
    if (input.primaryProviderId !== undefined) updateData.primaryProviderId = input.primaryProviderId;
    if (input.fallbackProviderId !== undefined) updateData.fallbackProviderId = input.fallbackProviderId;
    if (input.secondFallbackProviderId !== undefined) updateData.secondFallbackProviderId = input.secondFallbackProviderId;
    if (input.enabled !== undefined) updateData.enabled = input.enabled ? 1 : 0;
    await db.update(erpAiTaskRouting).set(updateData).where(eq(erpAiTaskRouting.id, input.id));
    return { success: true };
  }),

  delete: protectedProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
    const db = (await getDb())!;
    await db.delete(erpAiTaskRouting).where(eq(erpAiTaskRouting.id, input.id));
    return { success: true };
  }),
});

// ============================================================
// USAGE LOGS SUB-ROUTER
// ============================================================

const usageRouter = router({
  summary: protectedProcedure.input(z.object({
    providerId: z.number().optional(),
    module: z.string().optional(),
    startDate: z.number().optional(),
    endDate: z.number().optional(),
  }).optional()).query(async ({ input }) => {
    return getUsageSummary(input || undefined);
  }),

  byProvider: protectedProcedure.input(z.object({
    startDate: z.number().optional(),
    endDate: z.number().optional(),
  }).optional()).query(async ({ input }) => {
    return getUsageByProvider(input?.startDate, input?.endDate);
  }),

  byModule: protectedProcedure.input(z.object({
    startDate: z.number().optional(),
    endDate: z.number().optional(),
  }).optional()).query(async ({ input }) => {
    return getUsageByModule(input?.startDate, input?.endDate);
  }),

  recent: protectedProcedure.input(z.object({
    limit: z.number().default(50),
    providerId: z.number().optional(),
    module: z.string().optional(),
    status: z.string().optional(),
  }).optional()).query(async ({ input }) => {
    const db = (await getDb())!;
    const conditions: any[] = [];
    if (input?.providerId) conditions.push(eq(erpAiUsageLogs.providerId, input.providerId));
    if (input?.module) conditions.push(eq(erpAiUsageLogs.module, input.module));
    if (input?.status) conditions.push(eq(erpAiUsageLogs.status, input.status));

    return db
      .select()
      .from(erpAiUsageLogs)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(erpAiUsageLogs.createdAt))
      .limit(input?.limit || 50);
  }),
});

// ============================================================
// COST LIMITS SUB-ROUTER
// ============================================================

const costLimitsRouter = router({
  list: protectedProcedure.query(async () => {
    const db = (await getDb())!;
    return db.select().from(erpAiCostLimits).orderBy(asc(erpAiCostLimits.scopeType));
  }),

  create: protectedProcedure.input(z.object({
    scopeType: z.string(),
    scopeId: z.string().optional(),
    providerId: z.number().optional(),
    monthlyTokenLimit: z.number().optional(),
    monthlyCostLimit: z.string().optional(),
    dailyRequestLimit: z.number().optional(),
  })).mutation(async ({ input }) => {
    const db = (await getDb())!;
    const [result] = await db.insert(erpAiCostLimits).values({
      scopeType: input.scopeType,
      scopeId: input.scopeId || null,
      providerId: input.providerId || null,
      monthlyTokenLimit: input.monthlyTokenLimit || null,
      monthlyCostLimit: input.monthlyCostLimit || null,
      dailyRequestLimit: input.dailyRequestLimit || null,
      isActive: 1,
    });
    return { id: result.insertId, success: true };
  }),

  update: protectedProcedure.input(z.object({
    id: z.number(),
    monthlyTokenLimit: z.number().nullable().optional(),
    monthlyCostLimit: z.string().nullable().optional(),
    dailyRequestLimit: z.number().nullable().optional(),
    isActive: z.boolean().optional(),
  })).mutation(async ({ input }) => {
    const db = (await getDb())!;
    const updateData: any = { updatedAt: Date.now() };
    if (input.monthlyTokenLimit !== undefined) updateData.monthlyTokenLimit = input.monthlyTokenLimit;
    if (input.monthlyCostLimit !== undefined) updateData.monthlyCostLimit = input.monthlyCostLimit;
    if (input.dailyRequestLimit !== undefined) updateData.dailyRequestLimit = input.dailyRequestLimit;
    if (input.isActive !== undefined) updateData.isActive = input.isActive ? 1 : 0;
    await db.update(erpAiCostLimits).set(updateData).where(eq(erpAiCostLimits.id, input.id));
    return { success: true };
  }),

  delete: protectedProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
    const db = (await getDb())!;
    await db.delete(erpAiCostLimits).where(eq(erpAiCostLimits.id, input.id));
    return { success: true };
  }),
});

// ============================================================
// MAIN ROUTER
// ============================================================

export const erpAiProviderRouter = router({
  providers: providersRouter,
  modelSettings: modelSettingsRouter,
  taskRouting: taskRoutingRouter,
  usage: usageRouter,
  costLimits: costLimitsRouter,
});
