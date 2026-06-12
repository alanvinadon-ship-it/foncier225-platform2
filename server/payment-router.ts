import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure, permissionProcedure } from "./_core/trpc";
import { getDb } from "./db";
import { payments } from "../drizzle/schema";
import { eq, and, desc } from "drizzle-orm";
import crypto from "crypto";
import { initCinetPayPayment, verifyCinetPayPayment, mapCinetPayStatus, getChannelForMethod, isCinetPayConfigured } from "./cinetpay.service";
import { initTresorPayPayment, verifyTresorPayPayment, mapTresorPayStatus, getTresorPayMethod, isTresorPayConfigured, TAX_FEE_SCHEDULE, TAX_TYPE_LABELS } from "./tresorpay.service";
import type { Request, Response } from "express";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function generatePaymentReference(): string {
  const prefix = "PAY";
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = crypto.randomBytes(4).toString("hex").toUpperCase();
  return `${prefix}-${timestamp}-${random}`;
}

// Fee schedule per dossier type (in FCFA) — legacy, kept for backward compatibility
const FEE_SCHEDULE: Record<string, { label: string; amount: number }[]> = {
  land_title: [
    { label: "Frais de dossier CF", amount: 50000 },
    { label: "Frais d'enquête foncière", amount: 75000 },
    { label: "Frais de bornage", amount: 150000 },
    { label: "Frais d'immatriculation TF", amount: 200000 },
  ],
  urban_acd: [
    { label: "Frais de dossier ACD", amount: 100000 },
    { label: "Frais d'instruction technique", amount: 75000 },
    { label: "Frais de commission d'attribution", amount: 50000 },
    { label: "Frais de transformation ACP → ACD", amount: 150000 },
  ],
  credit: [
    { label: "Frais de dossier crédit", amount: 25000 },
  ],
};

// ─── Provider enum ──────────────────────────────────────────────────────────

const providerEnum = z.enum(["cinetpay", "tresorpay"]);
const taxTypeEnum = z.enum(["liasse_afor", "frais_geometre", "taxe_immatriculation", "frais_dossier", "other"]);

// ─── Citizen Payment Router ──────────────────────────────────────────────────

export const citizenPaymentRouter = router({
  // Get fee schedule for a dossier type (legacy)
  getFeeSchedule: protectedProcedure
    .input(z.object({ dossierType: z.enum(["land_title", "urban_acd", "credit"]) }))
    .query(({ input }) => {
      return FEE_SCHEDULE[input.dossierType] || [];
    }),

  // Get tax fee schedule (TrésorPay)
  getTaxFeeSchedule: protectedProcedure
    .input(z.object({ taxType: taxTypeEnum }))
    .query(({ input }) => {
      return {
        taxType: input.taxType,
        label: TAX_TYPE_LABELS[input.taxType] || input.taxType,
        fees: TAX_FEE_SCHEDULE[input.taxType] || [],
      };
    }),

  // Get all tax types with labels
  getTaxTypes: protectedProcedure
    .query(() => {
      return Object.entries(TAX_TYPE_LABELS).map(([key, label]) => ({ key, label }));
    }),

  // Get available payment providers
  getProviders: protectedProcedure
    .query(() => {
      return [
        {
          id: "tresorpay" as const,
          name: "TrésorPay / TrésorMoney",
          description: "Banque digitale du Trésor Public de Côte d'Ivoire",
          configured: isTresorPayConfigured(),
          methods: ["orange_money", "mtn_momo", "moov_money", "wave", "card"],
          recommended: true,
          logo: "tresorpay",
        },
        {
          id: "cinetpay" as const,
          name: "CinetPay",
          description: "Agrégateur de paiement agréé BCEAO",
          configured: isCinetPayConfigured(),
          methods: ["orange_money", "mtn_momo", "wave", "card", "bank_transfer"],
          recommended: false,
          logo: "cinetpay",
        },
      ];
    }),

  // Initialize a payment (unified multi-provider)
  initPayment: protectedProcedure
    .input(z.object({
      dossierType: z.enum(["land_title", "urban_acd", "credit"]),
      dossierId: z.number(),
      amount: z.number().min(1000),
      method: z.enum(["orange_money", "mtn_momo", "moov_money", "wave", "card", "bank_transfer"]),
      provider: providerEnum.default("tresorpay"),
      taxType: taxTypeEnum.default("frais_dossier"),
      description: z.string().optional(),
      phoneNumber: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });

      const reference = generatePaymentReference();
      const now = Date.now();

      // Normalize method for DB (moov_money stored as mtn_momo in enum)
      const dbMethod = input.method === "moov_money" ? "mtn_momo" : input.method;

      const [result] = await db.insert(payments).values({
        userId: ctx.user.id,
        dossierType: input.dossierType,
        dossierId: input.dossierId,
        amount: input.amount,
        currency: "XOF",
        method: dbMethod as any,
        status: "pending",
        provider: input.provider,
        taxType: input.taxType,
        reference,
        description: input.description || null,
        phoneNumber: input.phoneNumber || null,
        createdAt: now,
        updatedAt: now,
      });

      let paymentToken: string | null = null;
      let paymentUrl: string | null = null;
      let instructions: string | null = null;
      let mode: "live" | "sandbox" = "sandbox";

      // ─── Route to appropriate provider ────────────────────────────
      if (input.provider === "tresorpay") {
        try {
          const tpResult = await initTresorPayPayment({
            transactionId: reference,
            amount: input.amount,
            currency: "XOF",
            taxType: input.taxType,
            description: input.description || `Paiement ${TAX_TYPE_LABELS[input.taxType] || input.taxType} - ${reference}`,
            returnUrl: `${process.env.VITE_APP_URL || ""}/citizen/payments?ref=${reference}`,
            notifyUrl: `${process.env.VITE_APP_URL || ""}/api/webhooks/tresorpay`,
            paymentMethod: getTresorPayMethod(input.method),
            customerPhone: input.phoneNumber || undefined,
            dossierReference: reference,
          });

          paymentToken = tpResult.paymentToken;
          paymentUrl = tpResult.paymentUrl;
          mode = tpResult.mode;

          // Store provider transaction ID
          await db.update(payments)
            .set({ providerTransactionId: tpResult.transactionId })
            .where(eq(payments.reference, reference));
        } catch (err: any) {
          console.error("[TrésorPay] Init error:", err.message);
          // Fallback to CinetPay if TrésorPay fails
          if (isCinetPayConfigured()) {
            console.log("[Payment] Falling back to CinetPay...");
            try {
              const cpResult = await initCinetPayPayment({
                transactionId: reference,
                amount: input.amount,
                currency: "XOF",
                description: input.description || `Paiement ${input.taxType} - ${reference}`,
                returnUrl: `${process.env.VITE_APP_URL || ""}/citizen/payments?ref=${reference}`,
                notifyUrl: `${process.env.VITE_APP_URL || ""}/api/webhooks/cinetpay`,
                channels: getChannelForMethod(input.method),
                customerPhone: input.phoneNumber || undefined,
              });
              paymentToken = cpResult.paymentToken;
              paymentUrl = cpResult.paymentUrl;
              mode = cpResult.mode;
              // Update provider to cinetpay since we fell back
              await db.update(payments)
                .set({ provider: "cinetpay" })
                .where(eq(payments.reference, reference));
            } catch (cpErr: any) {
              console.error("[CinetPay] Fallback error:", cpErr.message);
            }
          }
        }
      } else {
        // CinetPay provider
        try {
          const cpResult = await initCinetPayPayment({
            transactionId: reference,
            amount: input.amount,
            currency: "XOF",
            description: input.description || `Paiement ${input.dossierType} - ${reference}`,
            returnUrl: `${process.env.VITE_APP_URL || ""}/citizen/payments?ref=${reference}`,
            notifyUrl: `${process.env.VITE_APP_URL || ""}/api/webhooks/cinetpay`,
            channels: getChannelForMethod(input.method),
            customerPhone: input.phoneNumber || undefined,
          });
          paymentToken = cpResult.paymentToken;
          paymentUrl = cpResult.paymentUrl;
          mode = cpResult.mode;
        } catch (err: any) {
          console.error("[CinetPay] Init error:", err.message);
        }
      }

      // Generate instructions for sandbox/demo mode
      if (mode === "sandbox") {
        const providerName = input.provider === "tresorpay" ? "TrésorPay" : "CinetPay";
        const methodName = {
          orange_money: "Orange Money",
          mtn_momo: "MTN MoMo",
          moov_money: "Moov Money",
          wave: "Wave",
          card: "Carte bancaire",
          bank_transfer: "Virement",
        }[input.method] || input.method;

        instructions = `[MODE DEMO — ${providerName}] Paiement de ${input.amount.toLocaleString()} FCFA via ${methodName}. Type: ${TAX_TYPE_LABELS[input.taxType] || input.taxType}. Référence: ${reference}. Cliquez sur "Confirmer" pour simuler le paiement.`;
      } else {
        instructions = `Paiement de ${input.amount.toLocaleString()} FCFA en cours via ${input.provider === "tresorpay" ? "TrésorPay" : "CinetPay"}. Référence: ${reference}`;
      }

      return {
        id: result.insertId,
        reference,
        status: "pending" as const,
        amount: input.amount,
        method: input.method,
        provider: input.provider,
        taxType: input.taxType,
        paymentToken,
        paymentUrl,
        instructions,
        mode,
      };
    }),

  // Confirm payment - verifies with appropriate provider
  confirmPayment: protectedProcedure
    .input(z.object({
      reference: z.string(),
      transactionId: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });

      const [payment] = await db.select().from(payments)
        .where(and(
          eq(payments.reference, input.reference),
          eq(payments.userId, ctx.user.id)
        ))
        .limit(1);

      if (!payment) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Paiement introuvable" });
      }

      if (payment.status === "completed") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Ce paiement est déjà confirmé" });
      }

      let finalStatus: "completed" | "failed" | "pending" = "completed";
      let txnId = input.transactionId || `TXN-${Date.now()}`;

      // Verify with appropriate provider
      if (payment.provider === "tresorpay" && isTresorPayConfigured()) {
        try {
          const verification = await verifyTresorPayPayment(payment.providerTransactionId || input.reference);
          finalStatus = mapTresorPayStatus(verification.status);
          txnId = verification.operatorTransactionId || txnId;
          // Store provider metadata
          await db.update(payments)
            .set({ providerMetadata: JSON.stringify(verification) })
            .where(eq(payments.id, payment.id));
        } catch (err: any) {
          console.error("[TrésorPay] Verify error:", err.message);
          finalStatus = "pending";
        }
      } else if (payment.provider === "cinetpay" && isCinetPayConfigured()) {
        try {
          const verification = await verifyCinetPayPayment(input.reference);
          finalStatus = mapCinetPayStatus(verification.status);
          txnId = verification.operatorId || txnId;
        } catch (err: any) {
          console.error("[CinetPay] Verify error:", err.message);
          finalStatus = "pending";
        }
      }

      await db.update(payments)
        .set({
          status: finalStatus,
          transactionId: txnId,
          paidAt: finalStatus === "completed" ? Date.now() : null,
          updatedAt: Date.now(),
        })
        .where(eq(payments.id, payment.id));

      return { success: true, reference: input.reference, status: finalStatus, provider: payment.provider };
    }),

  // Check payment status (poll from frontend)
  checkStatus: protectedProcedure
    .input(z.object({ reference: z.string() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const [payment] = await db.select().from(payments)
        .where(and(
          eq(payments.reference, input.reference),
          eq(payments.userId, ctx.user.id)
        ))
        .limit(1);

      if (!payment) throw new TRPCError({ code: "NOT_FOUND" });

      // If still pending, check with appropriate provider
      if (payment.status === "pending") {
        if (payment.provider === "tresorpay" && isTresorPayConfigured()) {
          try {
            const verification = await verifyTresorPayPayment(payment.providerTransactionId || input.reference);
            const newStatus = mapTresorPayStatus(verification.status);
            if (newStatus !== "pending") {
              await db.update(payments)
                .set({
                  status: newStatus,
                  transactionId: verification.operatorTransactionId,
                  providerMetadata: JSON.stringify(verification),
                  paidAt: newStatus === "completed" ? Date.now() : null,
                  updatedAt: Date.now(),
                })
                .where(eq(payments.id, payment.id));
              return { ...payment, status: newStatus };
            }
          } catch (err) { /* ignore */ }
        } else if (payment.provider === "cinetpay" && isCinetPayConfigured()) {
          try {
            const verification = await verifyCinetPayPayment(input.reference);
            const newStatus = mapCinetPayStatus(verification.status);
            if (newStatus !== "pending") {
              await db.update(payments)
                .set({
                  status: newStatus,
                  transactionId: verification.operatorId,
                  paidAt: newStatus === "completed" ? Date.now() : null,
                  updatedAt: Date.now(),
                })
                .where(eq(payments.id, payment.id));
              return { ...payment, status: newStatus };
            }
          } catch (err) { /* ignore */ }
        }
      }

      return payment;
    }),

  // List my payments
  listMyPayments: protectedProcedure
    .input(z.object({
      dossierType: z.enum(["land_title", "urban_acd", "credit"]).optional(),
      status: z.enum(["pending", "processing", "completed", "failed", "refunded"]).optional(),
      provider: providerEnum.optional(),
      taxType: taxTypeEnum.optional(),
    }).optional())
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return [];

      const conditions = [eq(payments.userId, ctx.user.id)];
      if (input?.dossierType) conditions.push(eq(payments.dossierType, input.dossierType));
      if (input?.status) conditions.push(eq(payments.status, input.status));
      if (input?.provider) conditions.push(eq(payments.provider, input.provider));
      if (input?.taxType) conditions.push(eq(payments.taxType, input.taxType));

      return db.select().from(payments)
        .where(and(...conditions))
        .orderBy(desc(payments.createdAt))
        .limit(100);
    }),

  // Get payment by reference
  getPayment: protectedProcedure
    .input(z.object({ reference: z.string() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const [payment] = await db.select().from(payments)
        .where(and(
          eq(payments.reference, input.reference),
          eq(payments.userId, ctx.user.id)
        ))
        .limit(1);

      if (!payment) throw new TRPCError({ code: "NOT_FOUND", message: "Paiement introuvable" });
      return payment;
    }),

  // Get payments for a specific dossier
  getDossierPayments: protectedProcedure
    .input(z.object({
      dossierType: z.enum(["land_title", "urban_acd", "credit"]),
      dossierId: z.number(),
    }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return [];

      return db.select().from(payments)
        .where(and(
          eq(payments.userId, ctx.user.id),
          eq(payments.dossierType, input.dossierType),
          eq(payments.dossierId, input.dossierId)
        ))
        .orderBy(desc(payments.createdAt));
    }),
});


// ─── TrésorPay Webhook Handler ──────────────────────────────────────────────

export async function handleTresorPayWebhook(req: Request, res: Response) {
  try {
    const { transaction_id, status, operator_transaction_id, amount, operator } = req.body;

    if (!transaction_id) {
      return res.status(400).json({ error: "Missing transaction_id" });
    }

    // Verify signature if provided (HMAC-SHA256)
    const signature = req.headers["x-tresorpay-signature"] as string;
    if (signature && process.env.TRESORPAY_WEBHOOK_SECRET) {
      const expectedSig = crypto
        .createHmac("sha256", process.env.TRESORPAY_WEBHOOK_SECRET)
        .update(JSON.stringify(req.body))
        .digest("hex");
      if (signature !== expectedSig) {
        console.error("[TrésorPay Webhook] Invalid signature");
        return res.status(401).json({ error: "Invalid signature" });
      }
    }

    const db = await getDb();
    if (!db) return res.status(500).json({ error: "DB unavailable" });

    // Find payment by provider transaction ID or reference
    let [payment] = await db.select().from(payments)
      .where(eq(payments.providerTransactionId, transaction_id))
      .limit(1);

    if (!payment) {
      [payment] = await db.select().from(payments)
        .where(eq(payments.reference, transaction_id))
        .limit(1);
    }

    if (payment && payment.status !== "completed") {
      const newStatus = mapTresorPayStatus(status || "PENDING");

      await db.update(payments)
        .set({
          status: newStatus,
          transactionId: operator_transaction_id || transaction_id,
          providerTransactionId: transaction_id,
          providerMetadata: JSON.stringify(req.body),
          paidAt: newStatus === "completed" ? Date.now() : null,
          updatedAt: Date.now(),
        })
        .where(eq(payments.id, payment.id));

      console.log(`[TrésorPay Webhook] Payment ${transaction_id} updated to ${newStatus}`);
    }

    return res.status(200).json({ status: "ok" });
  } catch (err: any) {
    console.error("[TrésorPay Webhook] Error:", err.message);
    return res.status(200).json({ status: "ok" }); // Always return 200
  }
}

// ─── CinetPay Webhook Handler ───────────────────────────────────────────────

export async function handleCinetPayWebhook(req: Request, res: Response) {
  try {
    const { cpm_trans_id } = req.body;

    if (!cpm_trans_id) {
      return res.status(400).json({ error: "Missing transaction ID" });
    }

    const verification = await verifyCinetPayPayment(cpm_trans_id);
    const newStatus = mapCinetPayStatus(verification.status);

    const db = await getDb();
    if (!db) return res.status(500).json({ error: "DB unavailable" });

    const [payment] = await db.select().from(payments)
      .where(eq(payments.reference, cpm_trans_id))
      .limit(1);

    if (payment && payment.status !== "completed") {
      await db.update(payments)
        .set({
          status: newStatus,
          transactionId: verification.operatorId || cpm_trans_id,
          paidAt: newStatus === "completed" ? Date.now() : null,
          updatedAt: Date.now(),
        })
        .where(eq(payments.id, payment.id));

      console.log(`[CinetPay Webhook] Payment ${cpm_trans_id} updated to ${newStatus}`);
    }

    return res.status(200).json({ status: "ok" });
  } catch (err: any) {
    console.error("[CinetPay Webhook] Error:", err.message);
    return res.status(200).json({ status: "ok" });
  }
}

// ─── Admin Payment Router ────────────────────────────────────────────────────

export const adminPaymentRouter = router({
  listAll: permissionProcedure("payments", "manage")
    .input(z.object({
      status: z.enum(["pending", "processing", "completed", "failed", "refunded"]).optional(),
      provider: providerEnum.optional(),
      taxType: taxTypeEnum.optional(),
      limit: z.number().min(1).max(200).default(50),
      offset: z.number().min(0).default(0),
    }).optional())
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return { items: [], total: 0 };

      const conditions = [];
      if (input?.status) conditions.push(eq(payments.status, input.status));
      if (input?.provider) conditions.push(eq(payments.provider, input.provider));
      if (input?.taxType) conditions.push(eq(payments.taxType, input.taxType));

      const where = conditions.length > 0 ? and(...conditions) : undefined;

      const items = await db.select().from(payments)
        .where(where)
        .orderBy(desc(payments.createdAt))
        .limit(input?.limit || 50)
        .offset(input?.offset || 0);

      return { items, total: items.length };
    }),
});
