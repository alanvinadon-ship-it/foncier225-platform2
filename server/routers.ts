import { COOKIE_NAME } from "@shared/const";
import { TRPCError } from "@trpc/server";
import { createHash, randomBytes } from "crypto";
import { z } from "zod";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { adminProcedure, protectedProcedure, publicProcedure, router } from "./_core/trpc";
import {
  checkRateLimit,
  countAttestations,
  countAuditEvents,
  countParcels,
  countUsers,
  countVerifyTokens,
  createAuditEvent,
  createParcel,
  createParcelEvent,
  createVerifyToken,
  getDashboardStats,
  getParcelByPublicToken,
  getParcelStatusDistribution,
  getPublicParcelEvents,
  getVerifyTokenByHash,
  listAuditEvents,
  listParcels,
  listUsers,
  updateUserRole,
} from "./db";

// ─── Parcel Router (public) ──────────────────────────────────────────
const parcelRouter = router({
  getPublic: publicProcedure
    .input(z.object({ publicToken: z.string().min(1) }))
    .query(async ({ input }) => {
      const parcel = await getParcelByPublicToken(input.publicToken);
      if (!parcel) throw new TRPCError({ code: "NOT_FOUND", message: "Parcelle introuvable" });
      // Return only public fields — zero PII
      return {
        id: parcel.id,
        reference: parcel.reference,
        zoneCode: parcel.zoneCode,
        statusPublic: parcel.statusPublic,
        surfaceApprox: parcel.surfaceApprox,
        localisation: parcel.localisation,
        kpiFlagsJson: parcel.kpiFlagsJson,
        publicToken: parcel.publicToken,
        createdAt: parcel.createdAt,
        updatedAt: parcel.updatedAt,
      };
    }),

  getPublicEvents: publicProcedure
    .input(z.object({ publicToken: z.string().min(1) }))
    .query(async ({ input }) => {
      const parcel = await getParcelByPublicToken(input.publicToken);
      if (!parcel) throw new TRPCError({ code: "NOT_FOUND", message: "Parcelle introuvable" });
      return getPublicParcelEvents(parcel.id);
    }),
});

// ─── Verify Router (public with rate limiting) ───────────────────────
const verifyRouter = router({
  check: publicProcedure
    .input(z.object({ token: z.string().min(1) }))
    .query(async ({ input, ctx }) => {
      // Rate limiting: 10 requests per 5 minutes per IP
      const ip = ctx.req.headers["x-forwarded-for"]?.toString() || ctx.req.ip || "unknown";
      const ipHash = createHash("sha256").update(ip).digest("hex").slice(0, 16);
      const allowed = await checkRateLimit(ipHash, 5 * 60 * 1000, 10);
      if (!allowed) {
        throw new TRPCError({ code: "TOO_MANY_REQUESTS", message: "Rate limit exceeded. Réessayez dans quelques minutes." });
      }

      // Hash the token to look up
      const tokenHash = createHash("sha256").update(input.token).digest("hex");
      const record = await getVerifyTokenByHash(tokenHash);
      if (!record) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Token de vérification introuvable" });
      }

      // Audit the verification
      await createAuditEvent({
        action: "verify.check",
        targetType: "verify_token",
        targetId: record.id,
        ipHash,
        details: { tokenType: record.tokenType },
      });

      return {
        status: record.status,
        tokenType: record.tokenType,
        issuedMonth: record.issuedMonth,
        expiresAt: record.expiresAt,
      };
    }),
});

// ─── Admin Router (protected + admin only) ───────────────────────────
const adminRouter = router({
  dashboardStats: adminProcedure.query(async () => {
    return getDashboardStats();
  }),

  parcelStatusDistribution: adminProcedure.query(async () => {
    return getParcelStatusDistribution();
  }),

  listUsers: adminProcedure.query(async () => {
    return listUsers(100, 0);
  }),

  updateUserRole: adminProcedure
    .input(z.object({
      userId: z.number(),
      role: z.enum(["citizen", "agent_terrain", "bank", "admin"]),
      zoneCodes: z.array(z.string()).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      await updateUserRole(input.userId, input.role, input.zoneCodes);
      await createAuditEvent({
        actorId: ctx.user.id,
        actorRole: ctx.user.role,
        action: "admin.updateUserRole",
        targetType: "user",
        targetId: input.userId,
        details: { newRole: input.role, zoneCodes: input.zoneCodes },
      });
      return { success: true };
    }),

  listParcels: adminProcedure.query(async () => {
    return listParcels(100, 0);
  }),

  createParcel: adminProcedure
    .input(z.object({
      reference: z.string().min(1),
      zoneCode: z.string().min(1),
      localisation: z.string().optional(),
      surfaceApprox: z.string().optional(),
      statusPublic: z.enum([
        "dossier_en_cours", "en_opposition", "gele",
        "mediation_en_cours", "acte_notarie_enregistre", "valide",
      ]).default("dossier_en_cours"),
    }))
    .mutation(async ({ input, ctx }) => {
      const publicToken = randomBytes(16).toString("hex");
      const parcel = await createParcel({
        ...input,
        publicToken,
        localisation: input.localisation || null,
        surfaceApprox: input.surfaceApprox || null,
        createdById: ctx.user.id,
      });

      // Create initial timeline event
      if (parcel) {
        await createParcelEvent({
          parcelId: parcel.id,
          eventType: "creation",
          title: "Parcelle enregistrée",
          description: `Parcelle ${input.reference} créée dans la zone ${input.zoneCode}`,
          monthYear: new Date().toLocaleDateString("fr-FR", { month: "long", year: "numeric" }),
          isPublic: true,
          createdById: ctx.user.id,
        });
      }

      await createAuditEvent({
        actorId: ctx.user.id,
        actorRole: ctx.user.role,
        action: "admin.createParcel",
        targetType: "parcel",
        targetId: parcel?.id,
        details: { reference: input.reference, zoneCode: input.zoneCode },
      });

      return parcel;
    }),

  listAuditEvents: adminProcedure.query(async () => {
    return listAuditEvents(200, 0);
  }),

  // Generate a verify token for an attestation
  generateVerifyToken: adminProcedure
    .input(z.object({
      tokenType: z.enum(["insurance", "mediation", "notary", "export", "parcel"]),
      targetId: z.number(),
      expiresInDays: z.number().default(90),
    }))
    .mutation(async ({ input, ctx }) => {
      const rawToken = randomBytes(32).toString("hex");
      const tokenHash = createHash("sha256").update(rawToken).digest("hex");
      const expiresAt = new Date(Date.now() + input.expiresInDays * 24 * 60 * 60 * 1000);

      await createVerifyToken({
        tokenHash,
        tokenType: input.tokenType,
        targetId: input.targetId,
        status: "active",
        issuedMonth: new Date().toLocaleDateString("fr-FR", { month: "long", year: "numeric" }),
        expiresAt,
        createdById: ctx.user.id,
      });

      await createAuditEvent({
        actorId: ctx.user.id,
        actorRole: ctx.user.role,
        action: "admin.generateVerifyToken",
        targetType: input.tokenType,
        targetId: input.targetId,
        details: { expiresInDays: input.expiresInDays },
      });

      // Return the raw token (only time it's visible)
      return { token: rawToken, expiresAt };
    }),
});

// ─── App Router ──────────────────────────────────────────────────────
export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),
  parcel: parcelRouter,
  verify: verifyRouter,
  admin: adminRouter,
});

export type AppRouter = typeof appRouter;
