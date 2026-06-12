import { COOKIE_NAME } from "@shared/const";
import { TRPCError } from "@trpc/server";
import { createHash, randomBytes } from "crypto";
import { z } from "zod";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { adminProcedure, protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { bankCreditRouter } from "./bank-credit-router";
import { delimitationRouter } from "./delimitation-router";
import { landTitleRouter } from "./land-title-router";
import { creditRouter } from "./credit-router";
import { urbanAcdRouter } from "./urban-acd-router";
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
  listCitizenNotifications,
  countUnreadNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  getLandTitleStatusDistribution,
  getLandTitleStats,
  getCreditStatusDistribution,
  getCreditStats,
  getDistinctLandTitleRegions,
  getDistinctLandTitleOperators,
  getUnifiedDashboardStats,
  getActiveDossierCounts,
  listLandTitleApplicationsByUser,
  listUrbanAcdApplicationsByUser,
  getNotificationPreferences,
  upsertNotificationPreferences,
  getSystemConfig,
  upsertSystemConfig,
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

  // ─── Notifications ─────────────────────────────────────────────────
  notifications: citizenProcedure
    .input(z.object({ limit: z.number().min(1).max(100).default(50), offset: z.number().min(0).default(0) }))
    .query(async ({ input, ctx }) => {
      return listCitizenNotifications(ctx.user.id, input.limit, input.offset);
    }),

  unreadNotificationsCount: citizenProcedure
    .query(async ({ ctx }) => {
      return countUnreadNotifications(ctx.user.id);
    }),

  activeDossierCounts: citizenProcedure
    .query(async ({ ctx }) => {
      return getActiveDossierCounts(ctx.user.id);
    }),

  /** Dashboard charts data for citizen */
  dashboardCharts: citizenProcedure.query(async ({ ctx }) => {
    const [ruralApps, urbanApps] = await Promise.all([
      listLandTitleApplicationsByUser(ctx.user.id, 500, 0),
      listUrbanAcdApplicationsByUser(ctx.user.id),
    ]);

    // Status distribution
    const statusCounts = { active: 0, completed: 0, rejected: 0 };
    const allApps = [
      ...ruralApps.map(a => ({ status: a.status, type: "rural" as const })),
      ...urbanApps.map(a => ({ status: a.status, type: "urban" as const })),
    ];
    for (const app of allApps) {
      const s = app.status;
      if (s.includes("signed") || s.includes("registered") || s.includes("delivered")) statusCounts.completed++;
      else if (s.includes("rejected") || s.includes("cancelled")) statusCounts.rejected++;
      else statusCounts.active++;
    }

    // Type distribution
    const typeCounts = { rural: ruralApps.length, urban: urbanApps.length };

    // Monthly activity (last 6 months)
    const now = new Date();
    const monthlyData: { month: string; rural: number; urban: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const monthLabel = d.toLocaleDateString("fr-FR", { month: "short", year: "2-digit" });
      const ruralCount = ruralApps.filter(a => {
        const created = new Date(a.createdAt);
        return created.getFullYear() === d.getFullYear() && created.getMonth() === d.getMonth();
      }).length;
      const urbanCount = urbanApps.filter(a => {
        const created = new Date(a.createdAt);
        return created.getFullYear() === d.getFullYear() && created.getMonth() === d.getMonth();
      }).length;
      monthlyData.push({ month: monthLabel, rural: ruralCount, urban: urbanCount });
    }

    return { statusCounts, typeCounts, monthlyData, total: allApps.length };
  }),

  /** All dossiers (rural + urban) for the current citizen — with pagination, sorting, filtering */
  allDossiers: citizenProcedure
    .input(z.object({
      page: z.number().int().min(1).default(1),
      limit: z.number().int().min(1).max(100).default(50),
      sortBy: z.enum(["createdAt", "updatedAt", "status", "reference"]).default("updatedAt"),
      sortOrder: z.enum(["asc", "desc"]).default("desc"),
      typeFilter: z.enum(["all", "rural", "urban"]).default("all"),
      statusFilter: z.enum(["all", "active", "completed", "rejected"]).default("all"),
      search: z.string().optional(),
    }).optional())
    .query(async ({ ctx, input }) => {
      const { page = 1, limit = 50, sortBy = "updatedAt", sortOrder = "desc", typeFilter = "all", statusFilter = "all", search } = input || {};

      const [ruralApps, urbanApps] = await Promise.all([
        listLandTitleApplicationsByUser(ctx.user.id, 500, 0),
        listUrbanAcdApplicationsByUser(ctx.user.id),
      ]);

      const ruralDossiers = ruralApps.map((a) => ({
        id: a.id,
        reference: a.applicationNumber,
        type: "rural" as const,
        status: a.status,
        createdAt: a.createdAt,
        updatedAt: a.updatedAt,
        locality: a.landLocality || a.landSubPrefecture || null,
      }));

      const urbanDossiers = urbanApps.map((a) => ({
        id: a.id,
        reference: a.applicationNumber,
        type: "urban" as const,
        status: a.status,
        createdAt: a.createdAt,
        updatedAt: a.updatedAt,
        locality: a.commune || null,
      }));

      let all = [...ruralDossiers, ...urbanDossiers];

      // Type filter
      if (typeFilter !== "all") {
        all = all.filter((d) => d.type === typeFilter);
      }

      // Status filter
      if (statusFilter !== "all") {
        all = all.filter((d) => {
          const s = d.status;
          if (statusFilter === "completed") return s.includes("signed") || s.includes("registered") || s === "acd_definitive_issued";
          if (statusFilter === "rejected") return s.includes("rejected") || s.includes("cancelled");
          return !(s.includes("signed") || s.includes("registered") || s === "acd_definitive_issued" || s.includes("rejected") || s.includes("cancelled"));
        });
      }

      // Search
      if (search && search.trim()) {
        const q = search.toLowerCase();
        all = all.filter((d) =>
          d.reference.toLowerCase().includes(q) ||
          (d.locality || "").toLowerCase().includes(q)
        );
      }

      const total = all.length;

      // Sort
      all.sort((a, b) => {
        let cmp = 0;
        if (sortBy === "createdAt") {
          cmp = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        } else if (sortBy === "updatedAt") {
          cmp = new Date(a.updatedAt ?? a.createdAt).getTime() - new Date(b.updatedAt ?? b.createdAt).getTime();
        } else if (sortBy === "status") {
          cmp = a.status.localeCompare(b.status);
        } else if (sortBy === "reference") {
          cmp = a.reference.localeCompare(b.reference);
        }
        return sortOrder === "desc" ? -cmp : cmp;
      });

      // Paginate
      const offset = (page - 1) * limit;
      const items = all.slice(offset, offset + limit);

      return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
    }),

  markNotificationRead: citizenProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      await markNotificationRead(input.id, ctx.user.id);
      return { success: true };
    }),

  markAllNotificationsRead: citizenProcedure
    .mutation(async ({ ctx }) => {
      await markAllNotificationsRead(ctx.user.id);
      return { success: true };
    }),

  // ─── Notification Preferences ─────────────────────────────────────
  getNotifPreferences: citizenProcedure
    .query(async ({ ctx }) => {
      return getNotificationPreferences(ctx.user.id);
    }),

  updateNotifPreferences: citizenProcedure
    .input(z.object({
      email: z.string().email().nullable().optional(),
      phone: z.string().min(8).max(20).nullable().optional(),
      emailStatusChange: z.boolean().optional(),
      smsStatusChange: z.boolean().optional(),
      emailDocumentUpdate: z.boolean().optional(),
      smsDocumentUpdate: z.boolean().optional(),
      emailOpposition: z.boolean().optional(),
      smsOpposition: z.boolean().optional(),
      emailGeneral: z.boolean().optional(),
      smsGeneral: z.boolean().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      return upsertNotificationPreferences(ctx.user.id, input);
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

  landTitleStatusDistribution: adminProcedure.input(z.object({
    dateFrom: z.number().optional(),
    dateTo: z.number().optional(),
    region: z.string().optional(),
    operatorName: z.string().optional(),
    applicationType: z.string().optional(),
  }).optional()).query(async ({ input }) => {
    return getLandTitleStatusDistribution(input ?? {});
  }),

  landTitleStats: adminProcedure.input(z.object({
    dateFrom: z.number().optional(),
    dateTo: z.number().optional(),
    region: z.string().optional(),
    operatorName: z.string().optional(),
    applicationType: z.string().optional(),
  }).optional()).query(async ({ input }) => {
    return getLandTitleStats(input ?? {});
  }),

  creditStatusDistribution: adminProcedure.input(z.object({
    dateFrom: z.number().optional(),
    dateTo: z.number().optional(),
  }).optional()).query(async ({ input }) => {
    return getCreditStatusDistribution(input ?? {});
  }),

  creditStats: adminProcedure.input(z.object({
    dateFrom: z.number().optional(),
    dateTo: z.number().optional(),
  }).optional()).query(async ({ input }) => {
    return getCreditStats(input ?? {});
  }),

  unifiedDashboardStats: adminProcedure.query(async () => {
    return getUnifiedDashboardStats();
  }),

  dashboardFilterOptions: adminProcedure.query(async () => {
    return {
      regions: await getDistinctLandTitleRegions(),
      operators: await getDistinctLandTitleOperators(),
      applicationTypes: ["immatriculation", "mutation", "morcellement"],
    };
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

  // ─── Notification Config (SMTP + SMS Gateway) ───────────────────
  getMailConfig: adminProcedure.query(async () => {
    const config = await getSystemConfig("smtp");
    return config ?? {
      host: "",
      port: 587,
      secure: false,
      username: "",
      password: "",
      fromName: "Foncier225",
      fromEmail: "noreply@foncier225.ci",
      enabled: false,
    };
  }),

  updateMailConfig: adminProcedure
    .input(z.object({
      host: z.string().min(1),
      port: z.number().int().min(1).max(65535),
      secure: z.boolean(),
      username: z.string(),
      password: z.string(),
      fromName: z.string().min(1),
      fromEmail: z.string().email(),
      enabled: z.boolean(),
    }))
    .mutation(async ({ input, ctx }) => {
      await upsertSystemConfig("smtp", input as unknown as Record<string, unknown>, ctx.user.id);
      return { success: true };
    }),

  getSmsConfig: adminProcedure.query(async () => {
    const config = await getSystemConfig("sms_orange");
    return config ?? {
      clientId: "",
      clientSecret: "",
      authUrl: "https://api.orange.com/oauth/v3/token",
      smsUrl: "https://api.orange.com/smsmessaging/v1/outbound",
      senderAddress: "tel:+2250000000000",
      senderName: "Foncier225",
      enabled: false,
    };
  }),

  updateSmsConfig: adminProcedure
    .input(z.object({
      clientId: z.string().min(1),
      clientSecret: z.string().min(1),
      authUrl: z.string().url(),
      smsUrl: z.string().url(),
      senderAddress: z.string().min(1),
      senderName: z.string().min(1),
      enabled: z.boolean(),
    }))
    .mutation(async ({ input, ctx }) => {
      await upsertSystemConfig("sms_orange", input as unknown as Record<string, unknown>, ctx.user.id);
      return { success: true };
    }),

  testMailConfig: adminProcedure
    .input(z.object({ recipientEmail: z.string().email() }))
    .mutation(async ({ input }) => {
      const config = await getSystemConfig("smtp");
      if (!config || !config.enabled) {
        return { success: false, error: "Configuration SMTP non activée" };
      }
      // Simulation d'envoi test (en production, utiliser nodemailer)
      return { success: true, message: `Email de test envoyé à ${input.recipientEmail}` };
    }),

  testSmsConfig: adminProcedure
    .input(z.object({ recipientPhone: z.string().min(8) }))
    .mutation(async ({ input }) => {
      const config = await getSystemConfig("sms_orange");
      if (!config || !config.enabled) {
        return { success: false, error: "Configuration SMS non activée" };
      }
      // Simulation d'envoi test (en production, appeler l'API Orange)
      return { success: true, message: `SMS de test envoyé au ${input.recipientPhone}` };
    }),

  // ─── SIG Configuration ─────────────────────────────────────────
  getSigConfig: adminProcedure.query(async () => {
    const config = await getSystemConfig("sig_provider");
    return config ?? {
      provider: "none",
      enabled: false,
      arcgisOnline: { portalUrl: "https://www.arcgis.com", clientId: "", clientSecret: "", orgId: "" },
      arcgisEnterprise: { serverUrl: "", username: "", password: "", webAdaptorUrl: "" },
      geoserver: { baseUrl: "", workspace: "foncier225", username: "admin", password: "" },
      qgisServer: { wmsUrl: "", wfsUrl: "", authToken: "" },
      custom: { url: "", apiKey: "", headers: "" },
    };
  }),

  updateSigConfig: adminProcedure
    .input(z.object({
      provider: z.enum(["none", "arcgis_online", "arcgis_enterprise", "geoserver", "qgis_server", "custom"]),
      enabled: z.boolean(),
      arcgisOnline: z.object({
        portalUrl: z.string(),
        clientId: z.string(),
        clientSecret: z.string(),
        orgId: z.string(),
      }).optional(),
      arcgisEnterprise: z.object({
        serverUrl: z.string(),
        username: z.string(),
        password: z.string(),
        webAdaptorUrl: z.string(),
      }).optional(),
      geoserver: z.object({
        baseUrl: z.string(),
        workspace: z.string(),
        username: z.string(),
        password: z.string(),
      }).optional(),
      qgisServer: z.object({
        wmsUrl: z.string(),
        wfsUrl: z.string(),
        authToken: z.string(),
      }).optional(),
      custom: z.object({
        url: z.string(),
        apiKey: z.string(),
        headers: z.string(),
      }).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      await upsertSystemConfig("sig_provider", input as unknown as Record<string, unknown>, ctx.user.id);
      return { success: true };
    }),

  testSigConnection: adminProcedure
    .input(z.object({ provider: z.string() }))
    .mutation(async ({ input }) => {
      const config = await getSystemConfig("sig_provider");
      if (!config || !config.enabled) {
        return { success: false, error: "Configuration SIG non activée" };
      }
      // Simulation de test de connexion (en production, appeler l'endpoint du provider)
      return { success: true, message: `Connexion au service ${input.provider} réussie` };
    }),

  // ─── SIG Dashboard Stats ─────────────────────────────────────
  sigDashboardStats: adminProcedure.query(async () => {
    const { listParcels: listAllParcels, countParcels: countAllParcels } = await import("./db");
    const { listAllTerritoriesWithFilter } = await import("./db");

    // Parcel stats
    const totalParcels = await countAllParcels();
    const parcels = await listAllParcels(10000, 0);

    // Surface totale approximative (surfaceApprox is varchar)
    const totalSurface = parcels.reduce((sum, p) => sum + (parseFloat(p.surfaceApprox || "0") || 0), 0);

    // Répartition par zone
    const zoneMap = new Map<string, number>();
    parcels.forEach(p => {
      const zone = p.zoneCode || "Non définie";
      zoneMap.set(zone, (zoneMap.get(zone) || 0) + 1);
    });
    const parcelsByZone = Array.from(zoneMap.entries())
      .map(([zone, count]) => ({ zone, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Répartition par statut
    const statusMap = new Map<string, number>();
    parcels.forEach(p => {
      const status = p.statusPublic || "inconnu";
      statusMap.set(status, (statusMap.get(status) || 0) + 1);
    });
    const parcelsByStatus = Array.from(statusMap.entries())
      .map(([status, count]) => ({ status, count }));

    // Territory stats
    const territories = await listAllTerritoriesWithFilter(undefined, "date", "desc", 10000, 0);
    const totalTerritories = territories.length;
    const totalDelimitedArea = territories.reduce((sum, t) => sum + (Number(t.calculatedAreaHa) || 0), 0);
    const territoriesByStatus = new Map<string, number>();
    territories.forEach(t => {
      const status = t.status || "brouillon";
      territoriesByStatus.set(status, (territoriesByStatus.get(status) || 0) + 1);
    });
    const terrByStatus = Array.from(territoriesByStatus.entries())
      .map(([status, count]) => ({ status, count }));

    // Répartition par nom (village/territoire)
    const nameMap = new Map<string, number>();
    territories.forEach(t => {
      const name = t.name || "Non défini";
      nameMap.set(name, (nameMap.get(name) || 0) + 1);
    });
    const territoriesByName = Array.from(nameMap.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // SIG config status
    const sigConfig = await getSystemConfig("sig_provider");
    const sigEnabled = sigConfig?.enabled === true && sigConfig?.provider !== "none";
    const sigProvider = (sigConfig?.provider as string) || "none";

    return {
      totalParcels,
      totalSurface: Math.round(totalSurface * 100) / 100,
      parcelsByZone,
      parcelsByStatus,
      totalTerritories,
      totalDelimitedArea: Math.round(totalDelimitedArea * 100) / 100,
      terrByStatus,
      territoriesByName,
      sigEnabled,
      sigProvider,
    };
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
  delimitation: delimitationRouter,
  landTitle: landTitleRouter,
  admin: adminRouter,
  urbanAcd: urbanAcdRouter,
});

export type AppRouter = typeof appRouter;

