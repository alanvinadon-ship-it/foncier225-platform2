import { COOKIE_NAME } from "@shared/const";
import { TRPCError } from "@trpc/server";
import { createHash, randomBytes } from "crypto";
import { z } from "zod";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { adminProcedure, protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { bankCreditRouter } from "./bank-credit-router";
import { creditRouter } from "./credit-router";
import { GeneratedDocumentService } from "./generated-document.service";
import {
  checkRateLimit,
  countAttestations,
  countAuditEvents,
  countParcels,
  countUsers,
  countVerifyTokens,
  createAuditEvent,
  createGeneratedDocument,
  createParcel,
  createParcelEvent,
  createVerifyToken,
  getCitizenDashboardStats,
  getCitizenTimeline,
  getCreditFileById,
  getDashboardStats,
  getAttestationById,
  getGeneratedDocumentById,
  getDocumentByIdAndOwner,
  getParcelById,
  getParcelByIdAndOwner,
  getParcelByPublicToken,
  getParcelEventsForOwner,
  getParcelStatusDistribution,
  getPublicParcelEvents,
  getUserById,
  getVerifyTokenByHash,
  listAttestationsByParcelAndOwner,
  listAuditEvents,
  listDocumentsByOwner,
  listDocumentsByParcelAndOwner,
  listGeneratedDocuments as listPersistedGeneratedDocuments,
  listParcels,
  listParcelsByOwner,
  listUsers,
  updateGeneratedDocument,
  updateParcelOwner,
  updateUserRole,
} from "./db";
import { storageGet, storagePut } from "./storage";

// ─── Citizen Procedure (requires auth + citizen/admin role) ─────────
// Citizens can access their own data; admins can also use citizen routes
const citizenProcedure = protectedProcedure;

function getBaseUrlFromRequest(req: { protocol?: string; get?: (name: string) => string | undefined; headers: Record<string, unknown> }) {
  const forwardedProto = req.headers["x-forwarded-proto"];
  const proto = typeof forwardedProto === "string"
    ? forwardedProto.split(",")[0]
    : req.protocol || "https";
  const host = req.get?.("host") || String(req.headers.host || "");
  return host ? `${proto}://${host}` : "http://localhost:3000";
}

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
        throw new TRPCError({ code: "TOO_MANY_REQUESTS", message: "Rate limit exceeded. Reessayez dans quelques minutes." });
      }

      const tokenHash = createHash("sha256").update(input.token).digest("hex");
      const record = await getVerifyTokenByHash(tokenHash);
      if (!record) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Token de verification introuvable" });
      }

      if (record.status !== "active") {
        throw new TRPCError({ code: "NOT_FOUND", message: "Token de verification introuvable" });
      }
      if (record.expiresAt && record.expiresAt.getTime() <= Date.now()) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Token de verification introuvable" });
      }

      await createAuditEvent({
        action: "verify.check",
        targetType: "verify_token",
        targetId: record.id,
        ipHash,
        details: { tokenType: record.tokenType },
      });

      const generatedDocument =
        record.tokenType === "document" ? await getGeneratedDocumentById(record.targetId) : null;
      const attestation =
        generatedDocument?.attestationId
          ? await getAttestationById(generatedDocument.attestationId)
          : record.tokenType === "document"
            ? await getAttestationById(record.targetId)
            : null;

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

      if (generatedDocument) {
        await createAuditEvent({
          action: "document.verify.checked",
          targetType: "generated_document",
          targetId: generatedDocument.id,
          ipHash,
          details: {
            documentType: generatedDocument.documentType,
            reference: generatedDocument.reference,
          },
        });
      }

      return {
        valid: true,
        status: record.status,
        tokenType: record.tokenType,
        issuedMonth: record.issuedMonth,
        expiresAt: record.expiresAt,
        documentType:
          generatedDocument?.documentType
            ?? (attestation?.attestationType === "credit" ? "FINAL_CREDIT_ATTESTATION" : null),
        documentStatus: attestation?.status ?? null,
        reference: generatedDocument?.reference ?? attestation?.documentRef ?? null,
        documentReference: generatedDocument?.reference ?? attestation?.documentRef ?? null,
        decisionType: attestation?.finalDecisionType ?? null,
        issuedAt: generatedDocument?.createdAt ?? attestation?.issuedAt ?? null,
        metadata: generatedDocument?.metadataJson
          ? {
              target: generatedDocument.parcelId
                ? "parcel"
                : generatedDocument.creditFileId
                  ? "credit_file"
                  : "document",
            }
          : null,
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

  generateParcelPdf: adminProcedure
    .input(z.object({ parcelId: z.number().int().positive() }))
    .mutation(async ({ input, ctx }) => {
      const parcel = await getParcelById(input.parcelId);
      if (!parcel) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Parcelle introuvable." });
      }

      const generatedAt = new Date();
      const reference = GeneratedDocumentService.generateReference("PARCEL_PDF");
      const verifyCode = GeneratedDocumentService.generateVerifyCode();
      const verifyUrl = GeneratedDocumentService.buildVerifyUrl(getBaseUrlFromRequest(ctx.req), verifyCode);
      const pdf = GeneratedDocumentService.buildParcelPdf({
        reference,
        parcelReference: parcel.reference,
        publicToken: parcel.publicToken,
        statusPublic: parcel.statusPublic,
        generatedAt,
        verifyCode,
        verifyUrl,
      });

      const uploaded = await storagePut(`generated-documents/parcels/${parcel.id}/${reference}.pdf`, pdf.buffer, "application/pdf");
      const generatedDocument = await createGeneratedDocument({
        documentType: "PARCEL_PDF",
        reference,
        parcelId: parcel.id,
        creditFileId: null,
        attestationId: null,
        generatedByUserId: ctx.user.id,
        verifyTokenId: null,
        checksumSha256: pdf.checksumSha256,
        fileUrl: uploaded.url,
        fileKey: uploaded.key,
        metadataJson: {
          parcelReference: parcel.reference,
          statusPublic: parcel.statusPublic,
        },
      });

      const verifyToken = await createVerifyToken({
        tokenHash: GeneratedDocumentService.hashVerifyCode(verifyCode),
        tokenType: "document",
        targetId: generatedDocument.id,
        status: "active",
        issuedMonth: generatedAt.toISOString().slice(0, 7),
        createdById: ctx.user.id,
      });

      await updateGeneratedDocument(generatedDocument.id, { verifyTokenId: verifyToken.id });
      await createAuditEvent({
        actorId: ctx.user.id,
        actorRole: ctx.user.role,
        action: "document.generated",
        targetType: "generated_document",
        targetId: generatedDocument.id,
        details: { documentType: "PARCEL_PDF", parcelId: parcel.id, reference },
      });

      return {
        id: generatedDocument.id,
        reference,
        verifyUrl,
        createdAt: generatedDocument.createdAt,
      };
    }),

  generateDossierPdf: adminProcedure
    .input(z.object({ creditFileId: z.number().int().positive() }))
    .mutation(async ({ input, ctx }) => {
      const creditFile = await getCreditFileById(input.creditFileId);
      if (!creditFile) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Dossier introuvable." });
      }

      const generatedAt = new Date();
      const reference = GeneratedDocumentService.generateReference("DOSSIER_PDF");
      const verifyCode = GeneratedDocumentService.generateVerifyCode();
      const verifyUrl = GeneratedDocumentService.buildVerifyUrl(getBaseUrlFromRequest(ctx.req), verifyCode);
      const pdf = GeneratedDocumentService.buildDossierPdf({
        reference,
        creditPublicRef: creditFile.publicRef ?? `CF-${creditFile.id}`,
        status: creditFile.status,
        productType: creditFile.productType,
        generatedAt,
        verifyCode,
        verifyUrl,
      });

      const uploaded = await storagePut(`generated-documents/dossiers/${creditFile.id}/${reference}.pdf`, pdf.buffer, "application/pdf");
      const generatedDocument = await createGeneratedDocument({
        documentType: "DOSSIER_PDF",
        reference,
        parcelId: creditFile.parcelId ?? null,
        creditFileId: creditFile.id,
        attestationId: null,
        generatedByUserId: ctx.user.id,
        verifyTokenId: null,
        checksumSha256: pdf.checksumSha256,
        fileUrl: uploaded.url,
        fileKey: uploaded.key,
        metadataJson: {
          creditPublicRef: creditFile.publicRef,
          status: creditFile.status,
          productType: creditFile.productType,
        },
      });

      const verifyToken = await createVerifyToken({
        tokenHash: GeneratedDocumentService.hashVerifyCode(verifyCode),
        tokenType: "document",
        targetId: generatedDocument.id,
        status: "active",
        issuedMonth: generatedAt.toISOString().slice(0, 7),
        createdById: ctx.user.id,
      });

      await updateGeneratedDocument(generatedDocument.id, { verifyTokenId: verifyToken.id });
      await createAuditEvent({
        actorId: ctx.user.id,
        actorRole: ctx.user.role,
        action: "document.generated",
        targetType: "generated_document",
        targetId: generatedDocument.id,
        details: { documentType: "DOSSIER_PDF", creditFileId: creditFile.id, reference },
      });

      return {
        id: generatedDocument.id,
        reference,
        verifyUrl,
        createdAt: generatedDocument.createdAt,
      };
    }),

  listGeneratedDocuments: adminProcedure
    .input(z.object({
      limit: z.number().int().min(1).max(200).default(100),
      offset: z.number().int().min(0).default(0),
    }).optional())
    .query(async ({ input }) => {
      const params = input ?? { limit: 100, offset: 0 };
      const documents = await listPersistedGeneratedDocuments(params.limit, params.offset);
      return Promise.all(documents.map(async document => {
        const [parcel, creditFile, generatedBy] = await Promise.all([
          document.parcelId ? getParcelById(document.parcelId) : Promise.resolve(null),
          document.creditFileId ? getCreditFileById(document.creditFileId) : Promise.resolve(null),
          document.generatedByUserId ? getUserById(document.generatedByUserId) : Promise.resolve(null),
        ]);

        return {
          id: document.id,
          documentType: document.documentType,
          reference: document.reference,
          parcelId: document.parcelId,
          parcelReference: parcel?.reference ?? null,
          creditFileId: document.creditFileId,
          creditFileReference: creditFile?.publicRef ?? (creditFile ? `CF-${creditFile.id}` : null),
          verifyTokenId: document.verifyTokenId,
          checksumSha256: document.checksumSha256,
          fileUrl: document.fileUrl,
          fileKey: document.fileKey,
          createdAt: document.createdAt,
          metadataJson: document.metadataJson,
          generatedBy: generatedBy ? { id: generatedBy.id, name: generatedBy.name, email: generatedBy.email } : null,
        };
      }));
    }),

  getGeneratedDocumentDownloadUrl: adminProcedure
    .input(z.object({ documentId: z.number().int().positive() }))
    .mutation(async ({ input, ctx }) => {
      const document = await getGeneratedDocumentById(input.documentId);
      if (!document) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Document genere introuvable." });
      }

      const download = await storageGet(document.fileKey);
      await createAuditEvent({
        actorId: ctx.user.id,
        actorRole: ctx.user.role,
        action: "document.downloaded",
        targetType: "generated_document",
        targetId: document.id,
        details: { reference: document.reference, documentType: document.documentType },
      });

      return { url: download.url, reference: document.reference };
    }),

  generateVerifyToken: adminProcedure
    .input(z.object({
      tokenType: z.enum(["insurance", "mediation", "notary", "export", "parcel", "document"]),
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

