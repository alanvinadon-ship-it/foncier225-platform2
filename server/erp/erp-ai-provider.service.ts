/**
 * ERP AI Provider Service — Couche d'abstraction multi-fournisseur IA
 * 
 * Fonctionnalités :
 * - Chiffrement AES-256-GCM des clés API
 * - Routage automatique par module/tâche
 * - Stratégie fallback (primaire → fallback 1 → fallback 2)
 * - Logging usage (tokens, coût, durée)
 * - Support multi-provider : OpenAI, Anthropic, Gemini, Mistral, Groq, OpenRouter, Local, Custom
 */

import crypto from "crypto";
import { getDb } from "../db";
import {
  erpAiProviders,
  erpAiModelSettings,
  erpAiTaskRouting,
  erpAiUsageLogs,
  erpAiCostLimits,
} from "../../drizzle/schema";
import { eq, and, desc, sql, isNull } from "drizzle-orm";

// ============================================================
// ENCRYPTION — AES-256-GCM pour les clés API
// ============================================================

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 16;
const TAG_LENGTH = 16;

function getEncryptionKey(): Buffer {
  const secret = process.env.AI_KEYS_ENCRYPTION_SECRET || process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("AI_KEYS_ENCRYPTION_SECRET or JWT_SECRET must be set for API key encryption");
  }
  // Derive a 32-byte key from the secret
  return crypto.scryptSync(secret, "foncier225-ai-keys", 32);
}

export function encryptApiKey(plainKey: string): string {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  let encrypted = cipher.update(plainKey, "utf8", "hex");
  encrypted += cipher.final("hex");
  const tag = cipher.getAuthTag();
  // Format: iv:tag:encrypted
  return `${iv.toString("hex")}:${tag.toString("hex")}:${encrypted}`;
}

export function decryptApiKey(encryptedKey: string): string {
  const key = getEncryptionKey();
  const parts = encryptedKey.split(":");
  if (parts.length !== 3) throw new Error("Invalid encrypted key format");
  const iv = Buffer.from(parts[0], "hex");
  const tag = Buffer.from(parts[1], "hex");
  const encrypted = parts[2];
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);
  let decrypted = decipher.update(encrypted, "hex", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
}

export function maskApiKey(key: string): string {
  if (!key || key.length < 8) return "****";
  const prefix = key.substring(0, Math.min(key.indexOf("-") + 1, 6) || 3);
  const suffix = key.substring(key.length - 4);
  return `${prefix}****${suffix}`;
}

// ============================================================
// PROVIDER TYPES
// ============================================================

export const PROVIDER_TYPES = [
  "OpenAI", "Anthropic", "Gemini", "Mistral", "Groq", "OpenRouter", "Local", "Custom"
] as const;

export const TASK_TYPES = [
  "Chat Assistant", "OCR Vision", "Document Classification", "Field Extraction",
  "Contract Analysis", "Document Summary", "Risk Detection", "Plan Analysis",
  "Quantity Takeoff", "Engineering Checks", "Embeddings", "Report Generation"
] as const;

export const AI_MODULES = [
  "Documents IA", "Assistant ERP", "Assistant Direction", "IA Foncier",
  "IA Plan Analyzer", "IA Finance", "IA Achats", "IA Comptabilité"
] as const;

export type ProviderType = typeof PROVIDER_TYPES[number];
export type TaskType = typeof TASK_TYPES[number];
export type AiModule = typeof AI_MODULES[number];

export interface AiCallOptions {
  module: string;
  taskType: string;
  messages: Array<{ role: string; content: string | any[] }>;
  maxTokens?: number;
  temperature?: number;
  jsonMode?: boolean;
  userId?: number;
  sourceType?: string;
  sourceId?: number;
}

export interface AiCallResult {
  content: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  model: string;
  provider: string;
  durationMs: number;
  fallbackUsed: boolean;
}

// ============================================================
// PROVIDER ABSTRACTION
// ============================================================

interface ProviderConfig {
  id: number;
  providerType: string;
  baseUrl: string | null;
  apiKey: string; // decrypted
  model: string;
  maxTokens: number;
  temperature: number;
  timeoutSeconds: number;
  headersJson: string | null;
  supportsJsonMode: number | null;
}

async function callProvider(config: ProviderConfig, options: AiCallOptions): Promise<AiCallResult> {
  const startTime = Date.now();
  const { messages, maxTokens, temperature, jsonMode } = options;

  const effectiveMaxTokens = maxTokens || config.maxTokens || 4096;
  const effectiveTemp = temperature ?? (parseFloat(String(config.temperature)) || 0.7);

  let url: string;
  let headers: Record<string, string> = {};
  let body: any;

  switch (config.providerType) {
    case "OpenAI":
    case "Groq":
    case "OpenRouter":
    case "Custom":
    case "Local":
      url = `${config.baseUrl || "https://api.openai.com/v1"}/chat/completions`;
      headers = {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${config.apiKey}`,
      };
      if (config.headersJson) {
        try { Object.assign(headers, JSON.parse(config.headersJson)); } catch {}
      }
      body = {
        model: config.model,
        messages,
        max_tokens: effectiveMaxTokens,
        temperature: effectiveTemp,
        ...(jsonMode && config.supportsJsonMode ? { response_format: { type: "json_object" } } : {}),
      };
      break;

    case "Anthropic":
      url = `${config.baseUrl || "https://api.anthropic.com"}/v1/messages`;
      headers = {
        "Content-Type": "application/json",
        "x-api-key": config.apiKey,
        "anthropic-version": "2023-06-01",
      };
      // Convert messages format for Anthropic
      const systemMsg = messages.find(m => m.role === "system");
      const nonSystemMsgs = messages.filter(m => m.role !== "system");
      body = {
        model: config.model,
        max_tokens: effectiveMaxTokens,
        temperature: effectiveTemp,
        ...(systemMsg ? { system: typeof systemMsg.content === "string" ? systemMsg.content : "" } : {}),
        messages: nonSystemMsgs.map(m => ({
          role: m.role === "assistant" ? "assistant" : "user",
          content: typeof m.content === "string" ? m.content : m.content,
        })),
      };
      break;

    case "Gemini":
      url = `${config.baseUrl || "https://generativelanguage.googleapis.com"}/v1beta/models/${config.model}:generateContent?key=${config.apiKey}`;
      headers = { "Content-Type": "application/json" };
      body = {
        contents: messages.filter(m => m.role !== "system").map(m => ({
          role: m.role === "assistant" ? "model" : "user",
          parts: [{ text: typeof m.content === "string" ? m.content : JSON.stringify(m.content) }],
        })),
        generationConfig: {
          maxOutputTokens: effectiveMaxTokens,
          temperature: effectiveTemp,
        },
        ...(messages.find(m => m.role === "system") ? {
          systemInstruction: { parts: [{ text: typeof messages[0].content === "string" ? messages[0].content : "" }] }
        } : {}),
      };
      break;

    case "Mistral":
      url = `${config.baseUrl || "https://api.mistral.ai"}/v1/chat/completions`;
      headers = {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${config.apiKey}`,
      };
      body = {
        model: config.model,
        messages,
        max_tokens: effectiveMaxTokens,
        temperature: effectiveTemp,
      };
      break;

    default:
      throw new Error(`Unsupported provider type: ${config.providerType}`);
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), (config.timeoutSeconds || 60) * 1000);

  try {
    const response = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) {
      const errorText = await response.text().catch(() => "Unknown error");
      throw new Error(`Provider ${config.providerType} returned ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    const durationMs = Date.now() - startTime;

    // Parse response based on provider type
    let content = "";
    let promptTokens = 0;
    let completionTokens = 0;

    if (config.providerType === "Gemini") {
      content = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
      promptTokens = data.usageMetadata?.promptTokenCount || 0;
      completionTokens = data.usageMetadata?.candidatesTokenCount || 0;
    } else if (config.providerType === "Anthropic") {
      content = data.content?.[0]?.text || "";
      promptTokens = data.usage?.input_tokens || 0;
      completionTokens = data.usage?.output_tokens || 0;
    } else {
      // OpenAI-compatible (OpenAI, Groq, Mistral, OpenRouter, Custom, Local)
      content = data.choices?.[0]?.message?.content || "";
      promptTokens = data.usage?.prompt_tokens || 0;
      completionTokens = data.usage?.completion_tokens || 0;
    }

    return {
      content,
      promptTokens,
      completionTokens,
      totalTokens: promptTokens + completionTokens,
      model: config.model,
      provider: config.providerType,
      durationMs,
      fallbackUsed: false,
    };
  } catch (error: any) {
    clearTimeout(timeout);
    throw error;
  }
}

// ============================================================
// ROUTING & FALLBACK
// ============================================================

async function getProviderConfig(providerId: number, taskType: string): Promise<ProviderConfig | null> {
  const db = (await getDb())!;
  const [provider] = await db
    .select()
    .from(erpAiProviders)
    .where(and(eq(erpAiProviders.id, providerId), eq(erpAiProviders.isActive, 1), isNull(erpAiProviders.deletedAt)));

  if (!provider) return null;

  // Check for task-specific model settings
  const [modelSetting] = await db
    .select()
    .from(erpAiModelSettings)
    .where(and(
      eq(erpAiModelSettings.providerId, providerId),
      eq(erpAiModelSettings.taskType, taskType),
      eq(erpAiModelSettings.isActive, 1)
    ));

  let apiKey = "";
  if (provider.encryptedApiKey) {
    try {
      apiKey = decryptApiKey(provider.encryptedApiKey);
    } catch {
      return null; // Can't decrypt = can't use
    }
  }

  return {
    id: provider.id,
    providerType: provider.providerType,
    baseUrl: provider.baseUrl,
    apiKey,
    model: modelSetting?.modelName || provider.defaultTextModel || "gpt-4o",
    maxTokens: modelSetting?.maxTokens || provider.maxTokens || 4096,
    temperature: parseFloat(modelSetting?.temperature || provider.temperature || "0.7"),
    timeoutSeconds: modelSetting?.timeoutSeconds || provider.timeoutSeconds || 60,
    headersJson: provider.headersJson,
    supportsJsonMode: provider.supportsJsonMode,
  };
}

/**
 * Main entry point — Route an AI call through the configured provider with fallback
 */
export async function routeAiCall(options: AiCallOptions): Promise<AiCallResult> {
  const db = (await getDb())!;

  // Find routing config for this module + task
  const [routing] = await db
    .select()
    .from(erpAiTaskRouting)
    .where(and(
      eq(erpAiTaskRouting.module, options.module),
      eq(erpAiTaskRouting.taskType, options.taskType),
      eq(erpAiTaskRouting.enabled, 1)
    ));

  // If no routing, use default provider
  let providerIds: number[] = [];
  if (routing) {
    providerIds = [
      routing.primaryProviderId,
      routing.fallbackProviderId,
      routing.secondFallbackProviderId,
    ].filter((id): id is number => id !== null && id !== undefined);
  } else {
    // Use default provider
    const [defaultProvider] = await db
      .select()
      .from(erpAiProviders)
      .where(and(eq(erpAiProviders.isDefault, 1), eq(erpAiProviders.isActive, 1), isNull(erpAiProviders.deletedAt)));
    if (defaultProvider) {
      providerIds = [defaultProvider.id];
    }
  }

  if (providerIds.length === 0) {
    throw new Error(`No active AI provider configured for module="${options.module}" task="${options.taskType}"`);
  }

  let lastError: Error | null = null;
  let fallbackUsed = false;

  for (let i = 0; i < providerIds.length; i++) {
    const config = await getProviderConfig(providerIds[i], options.taskType);
    if (!config) continue;

    if (i > 0) fallbackUsed = true;

    try {
      const result = await callProvider(config, options);
      result.fallbackUsed = fallbackUsed;

      // Log success
      await logUsage({
        providerId: config.id,
        modelName: result.model,
        module: options.module,
        taskType: options.taskType,
        sourceType: options.sourceType,
        sourceId: options.sourceId,
        userId: options.userId,
        promptTokens: result.promptTokens,
        completionTokens: result.completionTokens,
        totalTokens: result.totalTokens,
        durationMs: result.durationMs,
        status: fallbackUsed ? "Fallback Used" : "Success",
      });

      return result;
    } catch (error: any) {
      lastError = error;

      // Log failure
      await logUsage({
        providerId: config.id,
        modelName: config.model,
        module: options.module,
        taskType: options.taskType,
        sourceType: options.sourceType,
        sourceId: options.sourceId,
        userId: options.userId,
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: 0,
        durationMs: Date.now(),
        status: error.name === "AbortError" ? "Timeout" : "Failed",
        errorMessage: error.message?.substring(0, 500),
      });
    }
  }

  throw lastError || new Error("All AI providers failed");
}

// ============================================================
// USAGE LOGGING
// ============================================================

interface UsageLogEntry {
  providerId: number;
  modelName: string;
  module: string;
  taskType: string;
  sourceType?: string;
  sourceId?: number;
  userId?: number;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  durationMs: number;
  status: string;
  errorMessage?: string;
}

async function logUsage(entry: UsageLogEntry): Promise<void> {
  try {
    const db = (await getDb())!;
    const estimatedCost = estimateTokenCost(entry.totalTokens, entry.modelName);
    await db.insert(erpAiUsageLogs).values({
      providerId: entry.providerId,
      modelName: entry.modelName,
      module: entry.module,
      taskType: entry.taskType,
      sourceType: entry.sourceType || null,
      sourceId: entry.sourceId || null,
      userId: entry.userId || null,
      promptTokens: entry.promptTokens,
      completionTokens: entry.completionTokens,
      totalTokens: entry.totalTokens,
      estimatedCost: estimatedCost.toFixed(6),
      currency: "USD",
      durationMs: entry.durationMs,
      status: entry.status,
      errorMessage: entry.errorMessage || null,
    });
  } catch {
    // Don't fail the main operation if logging fails
  }
}

function estimateTokenCost(totalTokens: number, model: string): number {
  // Approximate costs per 1K tokens (input+output averaged)
  const costs: Record<string, number> = {
    "gpt-4o": 0.005,
    "gpt-4o-mini": 0.0003,
    "gpt-4-turbo": 0.01,
    "gpt-3.5-turbo": 0.0005,
    "claude-3-5-sonnet": 0.006,
    "claude-3-haiku": 0.0005,
    "claude-3-opus": 0.03,
    "gemini-1.5-pro": 0.005,
    "gemini-1.5-flash": 0.0002,
    "mistral-large": 0.004,
    "mistral-small": 0.001,
    "llama-3.1-70b": 0.001,
  };
  const modelKey = Object.keys(costs).find(k => model.toLowerCase().includes(k.toLowerCase()));
  const costPer1k = modelKey ? costs[modelKey] : 0.003; // default
  return (totalTokens / 1000) * costPer1k;
}

// ============================================================
// TEST CONNECTION
// ============================================================

export async function testProviderConnection(providerId: number): Promise<{ success: boolean; message: string; durationMs: number }> {
  const db = (await getDb())!;
  const startTime = Date.now();

  const config = await getProviderConfig(providerId, "Chat Assistant");
  if (!config) {
    return { success: false, message: "Provider not found or inactive", durationMs: 0 };
  }

  try {
    const result = await callProvider(config, {
      module: "System",
      taskType: "Chat Assistant",
      messages: [{ role: "user", content: "Say 'OK' if you can read this." }],
      maxTokens: 10,
      temperature: 0,
    });

    const durationMs = Date.now() - startTime;

    // Update last test status
    await db.update(erpAiProviders).set({
      lastTestedAt: Date.now(),
      lastTestStatus: "success",
      updatedAt: Date.now(),
    }).where(eq(erpAiProviders.id, providerId));

    return { success: true, message: `Connection OK (${result.model})`, durationMs };
  } catch (error: any) {
    const durationMs = Date.now() - startTime;

    await db.update(erpAiProviders).set({
      lastTestedAt: Date.now(),
      lastTestStatus: "failed",
      updatedAt: Date.now(),
    }).where(eq(erpAiProviders.id, providerId));

    return { success: false, message: error.message?.substring(0, 200) || "Connection failed", durationMs };
  }
}

// ============================================================
// USAGE STATISTICS
// ============================================================

export async function getUsageSummary(filters?: { providerId?: number; module?: string; startDate?: number; endDate?: number }) {
  const db = (await getDb())!;
  const conditions: any[] = [];
  if (filters?.providerId) conditions.push(eq(erpAiUsageLogs.providerId, filters.providerId));
  if (filters?.module) conditions.push(eq(erpAiUsageLogs.module, filters.module));
  if (filters?.startDate) conditions.push(sql`${erpAiUsageLogs.createdAt} >= ${filters.startDate}`);
  if (filters?.endDate) conditions.push(sql`${erpAiUsageLogs.createdAt} <= ${filters.endDate}`);

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const [stats] = await db
    .select({
      totalCalls: sql<number>`COUNT(*)`,
      totalTokens: sql<number>`COALESCE(SUM(${erpAiUsageLogs.totalTokens}), 0)`,
      totalCost: sql<string>`COALESCE(SUM(CAST(${erpAiUsageLogs.estimatedCost} AS DECIMAL(10,6))), 0)`,
      avgDuration: sql<number>`COALESCE(AVG(${erpAiUsageLogs.durationMs}), 0)`,
      successCount: sql<number>`SUM(CASE WHEN ${erpAiUsageLogs.status} = 'Success' THEN 1 ELSE 0 END)`,
      failedCount: sql<number>`SUM(CASE WHEN ${erpAiUsageLogs.status} = 'Failed' THEN 1 ELSE 0 END)`,
      fallbackCount: sql<number>`SUM(CASE WHEN ${erpAiUsageLogs.status} = 'Fallback Used' THEN 1 ELSE 0 END)`,
    })
    .from(erpAiUsageLogs)
    .where(whereClause);

  return stats;
}

export async function getUsageByProvider(startDate?: number, endDate?: number) {
  const db = (await getDb())!;
  const conditions: any[] = [];
  if (startDate) conditions.push(sql`${erpAiUsageLogs.createdAt} >= ${startDate}`);
  if (endDate) conditions.push(sql`${erpAiUsageLogs.createdAt} <= ${endDate}`);

  return db
    .select({
      providerId: erpAiUsageLogs.providerId,
      totalCalls: sql<number>`COUNT(*)`,
      totalTokens: sql<number>`COALESCE(SUM(${erpAiUsageLogs.totalTokens}), 0)`,
      totalCost: sql<string>`COALESCE(SUM(CAST(${erpAiUsageLogs.estimatedCost} AS DECIMAL(10,6))), 0)`,
    })
    .from(erpAiUsageLogs)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .groupBy(erpAiUsageLogs.providerId);
}

export async function getUsageByModule(startDate?: number, endDate?: number) {
  const db = (await getDb())!;
  const conditions: any[] = [];
  if (startDate) conditions.push(sql`${erpAiUsageLogs.createdAt} >= ${startDate}`);
  if (endDate) conditions.push(sql`${erpAiUsageLogs.createdAt} <= ${endDate}`);

  return db
    .select({
      module: erpAiUsageLogs.module,
      totalCalls: sql<number>`COUNT(*)`,
      totalTokens: sql<number>`COALESCE(SUM(${erpAiUsageLogs.totalTokens}), 0)`,
      totalCost: sql<string>`COALESCE(SUM(CAST(${erpAiUsageLogs.estimatedCost} AS DECIMAL(10,6))), 0)`,
    })
    .from(erpAiUsageLogs)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .groupBy(erpAiUsageLogs.module);
}
