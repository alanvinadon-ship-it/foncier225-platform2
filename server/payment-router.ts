import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure } from "./_core/trpc";
import { getDb } from "./db";
import { payments } from "../drizzle/schema";
import { eq, and, desc } from "drizzle-orm";
import crypto from "crypto";
import { initCinetPayPayment, verifyCinetPayPayment, mapCinetPayStatus, getChannelForMethod, isCinetPayConfigured } from "./cinetpay.service";
import type { Request, Response } from "express";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function generatePaymentReference(): string {
  const prefix = "PAY";
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = crypto.randomBytes(4).toString("hex").toUpperCase();
  return `${prefix}-${timestamp}-${random}`;
}

// Fee schedule per dossier type (in FCFA)
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

// ─── Citizen Payment Router ──────────────────────────────────────────────────

export const citizenPaymentRouter = router({
  // Get fee schedule for a dossier type
  getFeeSchedule: protectedProcedure
    .input(z.object({ dossierType: z.enum(["land_title", "urban_acd", "credit"]) }))
    .query(({ input }) => {
      return FEE_SCHEDULE[input.dossierType] || [];
    }),

  // Initialize a payment
  initPayment: protectedProcedure
    .input(z.object({
      dossierType: z.enum(["land_title", "urban_acd", "credit"]),
      dossierId: z.number(),
      amount: z.number().min(1000),
      method: z.enum(["orange_money", "mtn_momo", "wave", "card", "bank_transfer"]),
      description: z.string().optional(),
      phoneNumber: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });

      const reference = generatePaymentReference();
      const now = Date.now();

      const [result] = await db.insert(payments).values({
        userId: ctx.user.id,
        dossierType: input.dossierType,
        dossierId: input.dossierId,
        amount: input.amount,
        currency: "XOF",
        method: input.method,
        status: "pending",
        reference,
        description: input.description || null,
        phoneNumber: input.phoneNumber || null,
        createdAt: now,
        updatedAt: now,
      });

      // Call CinetPay to initialize payment
      let paymentToken: string | null = null;
      let paymentUrl: string | null = null;
      let instructions: string | null = null;
      let mode: "live" | "sandbox" = "sandbox";

      try {
        const cinetPayResult = await initCinetPayPayment({
          transactionId: reference,
          amount: input.amount,
          currency: "XOF",
          description: input.description || `Paiement ${input.dossierType} - ${reference}`,
          returnUrl: `${process.env.VITE_APP_URL || ""}/citizen/payments?ref=${reference}`,
          notifyUrl: `${process.env.VITE_APP_URL || ""}/api/webhooks/cinetpay`,
          channels: getChannelForMethod(input.method),
          customerPhone: input.phoneNumber || undefined,
        });

        paymentToken = cinetPayResult.paymentToken;
        paymentUrl = cinetPayResult.paymentUrl;
        mode = cinetPayResult.mode;
      } catch (err: any) {
        console.error("[CinetPay] Init error:", err.message);
        // Fallback to instructions mode
      }

      // Generate instructions based on method
      if (mode === "sandbox" && !isCinetPayConfigured()) {
        switch (input.method) {
          case "orange_money":
            instructions = `[MODE DEMO] Paiement de ${input.amount.toLocaleString()} FCFA via Orange Money. Référence: ${reference}. Cliquez sur "Confirmer" pour simuler le paiement.`;
            break;
          case "mtn_momo":
            instructions = `[MODE DEMO] Paiement de ${input.amount.toLocaleString()} FCFA via MTN MoMo. Référence: ${reference}. Cliquez sur "Confirmer" pour simuler le paiement.`;
            break;
          case "wave":
            instructions = `[MODE DEMO] Paiement de ${input.amount.toLocaleString()} FCFA via Wave. Référence: ${reference}. Cliquez sur "Confirmer" pour simuler le paiement.`;
            break;
          case "card":
            instructions = `[MODE DEMO] Paiement de ${input.amount.toLocaleString()} FCFA par carte. Référence: ${reference}. Cliquez sur "Confirmer" pour simuler le paiement.`;
            break;
          case "bank_transfer":
            instructions = `[MODE DEMO] Virement de ${input.amount.toLocaleString()} FCFA. Référence: ${reference}. Cliquez sur "Confirmer" pour simuler le paiement.`;
            break;
        }
      } else {
        instructions = `Paiement de ${input.amount.toLocaleString()} FCFA en cours de traitement via CinetPay. Référence: ${reference}`;
      }

      return {
        id: result.insertId,
        reference,
        status: "pending" as const,
        amount: input.amount,
        method: input.method,
        paymentToken,
        paymentUrl,
        instructions,
        mode,
      };
    }),

  // Confirm payment - verifies with CinetPay or simulates
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

      // If CinetPay is configured, verify with their API
      if (isCinetPayConfigured()) {
        try {
          const verification = await verifyCinetPayPayment(input.reference);
          finalStatus = mapCinetPayStatus(verification.status);
          txnId = verification.operatorId || txnId;
        } catch (err: any) {
          console.error("[CinetPay] Verify error:", err.message);
          // Keep as pending if verification fails
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

      return { success: true, reference: input.reference, status: finalStatus };
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

      // If still pending and CinetPay is configured, check with API
      if (payment.status === "pending" && isCinetPayConfigured()) {
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
        } catch (err) {
          // Ignore verification errors, return current status
        }
      }

      return payment;
    }),

  // List my payments
  listMyPayments: protectedProcedure
    .input(z.object({
      dossierType: z.enum(["land_title", "urban_acd", "credit"]).optional(),
      status: z.enum(["pending", "processing", "completed", "failed", "refunded"]).optional(),
    }).optional())
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return [];

      const conditions = [eq(payments.userId, ctx.user.id)];
      if (input?.dossierType) conditions.push(eq(payments.dossierType, input.dossierType));
      if (input?.status) conditions.push(eq(payments.status, input.status));

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


// ─── CinetPay Webhook Handler ───────────────────────────────────────────────

export async function handleCinetPayWebhook(req: Request, res: Response) {
  try {
    const { cpm_trans_id } = req.body;

    if (!cpm_trans_id) {
      return res.status(400).json({ error: "Missing transaction ID" });
    }

    // Verify the payment with CinetPay
    const verification = await verifyCinetPayPayment(cpm_trans_id);
    const newStatus = mapCinetPayStatus(verification.status);

    const db = await getDb();
    if (!db) return res.status(500).json({ error: "DB unavailable" });

    // Update payment in database
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
    return res.status(200).json({ status: "ok" }); // Always return 200 to CinetPay
  }
}

// ─── Admin Payment Router ────────────────────────────────────────────────────

export const adminPaymentRouter = router({
  listAll: protectedProcedure
    .input(z.object({
      status: z.enum(["pending", "processing", "completed", "failed", "refunded"]).optional(),
      limit: z.number().min(1).max(200).default(50),
      offset: z.number().min(0).default(0),
    }).optional())
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return { items: [], total: 0 };

      const conditions = [];
      if (input?.status) conditions.push(eq(payments.status, input.status));

      const where = conditions.length > 0 ? and(...conditions) : undefined;

      const items = await db.select().from(payments)
        .where(where)
        .orderBy(desc(payments.createdAt))
        .limit(input?.limit || 50)
        .offset(input?.offset || 0);

      const [{ count }] = await db.select({ count: payments.id }).from(payments).where(where) as any;

      return { items, total: items.length };
    }),
});
