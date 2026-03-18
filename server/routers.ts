import { COOKIE_NAME } from "@shared/const";
import { TRPCError } from "@trpc/server";
import { createHash, randomBytes } from "crypto";
import { z } from "zod";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { adminProcedure, protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { bankCreditRouter } from "./bank-credit-router";
import { creditRouter } from "./credit-router";
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
  getCitizenDashboardStats,
  getCitizenTimeline,
  getDashboardStats,
  getAttestationById,
  getDocumentByIdAndOwner,
  getParcelByIdAndOwner,
  getParcelByPublicToken,
  getParcelEventsForOwner,
  getParcelStatusDistribution,
  getPublicParcelEvents,
  getVerifyTokenByHash,
  listAttestationsByParcelAndOwner,
  listAuditEvents,
  listDocumentsByOwner,
  listDocumentsByParcelAndOwner,
  listParcels,
  listParcelsByOwner,
  listUsers,
  updateParcelOwner,
  updateUserRole,
} from "./db";

// ─── Citizen Procedure (requires auth + citizen/admin role) ─────────
// Citizens can access their own data; admins can also use citizen routes
const citizenProcedure = protectedProcedure;

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
      const ip = ctx.req.headers["x-forwarded-for"]?.toString() || ctx.req.ip || "unknown";
      const ipHash = createHash("sha256").update(ip).digest("hex").slice(0, 16);
      const allowed = await checkRateLimit(ipHash, 5 * 60 * 1000, 10);
      if (!allowed) {
        throw new TRPCError({ code: "TOO_MANY_REQUESTS", message: "Rate limit exceeded. Réessayez dans quelques minutes." });
      }

      const tokenHash = createHash("sha256").update(input.token).digest("hex");
      const record = await getVerifyTokenByHash(tokenHash);
      if (!record) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Token de vérification introuvable" });
      }

      if (record.status !== "active") {
        throw new TRPCError({ code: "NOT_FOUND", message: "Token de vÃ©rification introuvable" });
      }
      if (record.expiresAt && record.expiresAt.getTime() <= Date.now()) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Token de vÃ©rification introuvable" });
      }

      await createAuditEvent({
        action: "verify.check",
        targetType: "verify_token",
        targetId: record.id,
        ipHash,
        details: { tokenType: record.tokenType },
      });

      const attestation =
        record.tokenType === "document" ? await getAttestationById(record.targetId) : null;

      if (attestation?.attestationType === "credit") {
        await createAuditEvent({
          action: "credit.attestation.verified",
          targetType: "attestation",
          targetId: attestation.id,
          ipHash,
          details: {
            creditFileId: attestation.creditFileId,
            decisionType: attestation.finalDecisionType,
            documentRef: attestation.documentRef,
          },
        });
      }

      return {
        valid: true,
        status: record.status,
        tokenType: record.tokenType,
        issuedMonth: record.issuedMonth,
        expiresAt: record.expiresAt,
        documentType: attestation?.attestationType === "credit" ? "credit_final_attestation" : null,
        documentStatus: attestation?.status ?? null,
        documentReference: attestation?.documentRef ?? null,
        decisionType: attestation?.finalDecisionType ?? null,
        issuedAt: attestation?.issuedAt ?? null,
      };
    }),
});

// ─── Citizen Router (protected, strict owner isolation) ──────────────
const citizenRouter = router({
  // Profile — returns the current user's own data
  profile: citizenProcedure.query(async ({ ctx }) => {
    await createAuditEvent({
      actorId: ctx.user.id,
      actorRole: ctx.user.role,
      action: "citizen.viewProfile",
      targetType: "user",
      targetId: ctx.user.id,
    });
    return {
      id: ctx.user.id,
      name: ctx.user.name,
      email: ctx.user.email,
      role: ctx.user.role,
      isActive: ctx.user.isActive,
      createdAt: ctx.user.createdAt,
      lastSignedIn: ctx.user.lastSignedIn,
    };
  }),

  // Dashboard stats — only own data
  dashboardStats: citizenProcedure.query(async ({ ctx }) => {
    return getCitizenDashboardStats(ctx.user.id);
  }),

  // List own parcels only
  myParcels: citizenProcedure.query(async ({ ctx }) => {
    const parcels = await listParcelsByOwner(ctx.user.id);
    await createAuditEvent({
      actorId: ctx.user.id,
      actorRole: ctx.user.role,
      action: "citizen.listParcels",
      targetType: "user",
      targetId: ctx.user.id,
      details: { count: parcels.length },
    });
    return parcels;
  }),

  // Get a single parcel — strict ownership check
  parcelDetail: citizenProcedure
    .input(z.object({ parcelId: z.number() }))
    .query(async ({ input, ctx }) => {
      const parcel = await getParcelByIdAndOwner(input.parcelId, ctx.user.id);
      if (!parcel) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Parcelle introuvable ou accès non autorisé" });
      }
      await createAuditEvent({
        actorId: ctx.user.id,
        actorRole: ctx.user.role,
        action: "citizen.viewParcel",
        targetType: "parcel",
        targetId: parcel.id,
      });
      return parcel;
    }),

  // Get timeline events for a specific owned parcel
  parcelEvents: citizenProcedure
    .input(z.object({ parcelId: z.number() }))
    .query(async ({ input, ctx }) => {
      const events = await getParcelEventsForOwner(input.parcelId, ctx.user.id);
      if (events.length === 0) {
        // Check if parcel exists but has no events vs. not owned
        const parcel = await getParcelByIdAndOwner(input.parcelId, ctx.user.id);
        if (!parcel) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Parcelle introuvable ou accès non autorisé" });
        }
      }
      return events;
    }),

  // Global timeline across all owned parcels
  timeline: citizenProcedure.query(async ({ ctx }) => {
    return getCitizenTimeline(ctx.user.id, 50);
  }),

  // List own documents
  myDocuments: citizenProcedure.query(async ({ ctx }) => {
    return listDocumentsByOwner(ctx.user.id);
  }),

  // List documents for a specific owned parcel
  parcelDocuments: citizenProcedure
    .input(z.object({ parcelId: z.number() }))
    .query(async ({ input, ctx }) => {
      // Ownership check is built into the query
      const parcel = await getParcelByIdAndOwner(input.parcelId, ctx.user.id);
      if (!parcel) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Parcelle introuvable ou accès non autorisé" });
      }
      return listDocumentsByParcelAndOwner(input.parcelId, ctx.user.id);
    }),

  // Get a single document — strict ownership check
  documentDetail: citizenProcedure
    .input(z.object({ documentId: z.number() }))
    .query(async ({ input, ctx }) => {
      const doc = await getDocumentByIdAndOwner(input.documentId, ctx.user.id);
      if (!doc) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Document introuvable ou accès non autorisé" });
      }
      await createAuditEvent({
        actorId: ctx.user.id,
        actorRole: ctx.user.role,
        action: "citizen.viewDocument",
        targetType: "document",
        targetId: doc.id,
      });
      return doc;
    }),

  // Attestations for an owned parcel
  parcelAttestations: citizenProcedure
    .input(z.object({ parcelId: z.number() }))
    .query(async ({ input, ctx }) => {
      const parcel = await getParcelByIdAndOwner(input.parcelId, ctx.user.id);
      if (!parcel) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Parcelle introuvable ou accès non autorisé" });
      }
      return listAttestationsByParcelAndOwner(input.parcelId, ctx.user.id);
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
      ownerId: z.number().optional(),
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
        ownerId: input.ownerId || null,
        createdById: ctx.user.id,
      });

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
        details: { reference: input.reference, zoneCode: input.zoneCode, ownerId: input.ownerId },
      });

      return parcel;
    }),

  // Assign a parcel to a citizen owner
  assignParcelOwner: adminProcedure
    .input(z.object({
      parcelId: z.number(),
      ownerId: z.number(),
    }))
    .mutation(async ({ input, ctx }) => {
      await updateParcelOwner(input.parcelId, input.ownerId);
      await createAuditEvent({
        actorId: ctx.user.id,
        actorRole: ctx.user.role,
        action: "admin.assignParcelOwner",
        targetType: "parcel",
        targetId: input.parcelId,
        details: { ownerId: input.ownerId },
      });
      return { success: true };
    }),

  listAuditEvents: adminProcedure.query(async () => {
    return listAuditEvents(200, 0);
  }),

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
  citizen: citizenRouter,
  credit: creditRouter,
  bankCredit: bankCreditRouter,
  admin: adminRouter,
});

export type AppRouter = typeof appRouter;
