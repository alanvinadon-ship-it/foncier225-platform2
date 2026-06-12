import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure } from "./_core/trpc";
import { getDb } from "./db";
import { payments } from "../drizzle/schema";
import { eq, and, desc } from "drizzle-orm";
import crypto from "crypto";

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

      // Simulate payment processing (in production, this would call the payment gateway API)
      // For Mobile Money: initiate USSD push or redirect to payment page
      // For card: generate payment link

      let paymentUrl: string | null = null;
      let instructions: string | null = null;

      switch (input.method) {
        case "orange_money":
          instructions = `Un message USSD sera envoyé au ${input.phoneNumber || "votre numéro"}. Composez #144# pour confirmer le paiement de ${input.amount.toLocaleString()} FCFA. Référence: ${reference}`;
          break;
        case "mtn_momo":
          instructions = `Un message USSD sera envoyé au ${input.phoneNumber || "votre numéro"}. Confirmez le paiement de ${input.amount.toLocaleString()} FCFA via MTN Mobile Money. Référence: ${reference}`;
          break;
        case "wave":
          instructions = `Ouvrez l'application Wave et scannez le QR code ou envoyez ${input.amount.toLocaleString()} FCFA au numéro marchand. Référence: ${reference}`;
          break;
        case "card":
          paymentUrl = `/citizen/payments/card/${reference}`;
          instructions = `Vous allez être redirigé vers la page de paiement sécurisé par carte bancaire.`;
          break;
        case "bank_transfer":
          instructions = `Effectuez un virement de ${input.amount.toLocaleString()} FCFA sur le compte BIAO-CI N°01234567890. Référence obligatoire: ${reference}`;
          break;
      }

      return {
        id: result.insertId,
        reference,
        status: "pending" as const,
        amount: input.amount,
        method: input.method,
        paymentUrl,
        instructions,
      };
    }),

  // Confirm/simulate payment completion (in production, this would be a webhook)
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

      await db.update(payments)
        .set({
          status: "completed",
          transactionId: input.transactionId || `TXN-${Date.now()}`,
          paidAt: Date.now(),
          updatedAt: Date.now(),
        })
        .where(eq(payments.id, payment.id));

      return { success: true, reference: input.reference };
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
