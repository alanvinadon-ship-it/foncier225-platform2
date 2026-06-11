import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { protectedProcedure, router } from "./_core/trpc";
import {
  createAuditEvent,
  insertTerritory,
  getTerritoryByIdAndOwner,
  listTerritoriesByOwner,
  updateTerritory,
  countTerritoriesByOwner,
  insertBoundaryPoints,
  listBoundaryPointsByTerritory,
  updateBoundaryPoint,
  deleteBoundaryPoint,
  replaceBoundaryPoints,
  insertTerritoryDocument,
  listTerritoryDocuments,
  deleteTerritoryDocument,
} from "./db";
import { storagePut } from "./storage";

// ─── Helpers ─────────────────────────────────────────────────────────

async function verifyTerritoryOwnership(territoryId: number, userId: number) {
  const territory = await getTerritoryByIdAndOwner(territoryId, userId);
  if (!territory) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Territoire introuvable ou accès non autorisé.",
    });
  }
  return territory;
}

function generateTerritoryCode(): string {
  const prefix = "TER";
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${prefix}-${timestamp}-${random}`;
}

// ─── Router ──────────────────────────────────────────────────────────

export const delimitationRouter = router({
  // Create a new territory
  create: protectedProcedure
    .input(z.object({
      name: z.string().min(2).max(255),
      chiefName: z.string().min(2).max(128),
      chiefPhone: z.string().max(32).optional(),
      estimatedAreaHa: z.number().int().positive().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const code = generateTerritoryCode();
      const territory = await insertTerritory({
        code,
        name: input.name,
        chiefName: input.chiefName,
        chiefPhone: input.chiefPhone,
        estimatedAreaHa: input.estimatedAreaHa,
        status: "draft",
        createdById: ctx.user.id,
      });

      await createAuditEvent({
        actorId: ctx.user.id,
        actorRole: ctx.user.role,
        action: "delimitation.territory.created",
        targetType: "village_territory",
        targetId: territory.id,
        details: { code, name: input.name },
      });

      return territory;
    }),

  // List user's territories
  list: protectedProcedure
    .input(z.object({
      limit: z.number().int().min(1).max(50).default(20),
      offset: z.number().int().min(0).default(0),
    }).optional())
    .query(async ({ input, ctx }) => {
      const { limit = 20, offset = 0 } = input ?? {};
      const [territories, total] = await Promise.all([
        listTerritoriesByOwner(ctx.user.id, limit, offset),
        countTerritoriesByOwner(ctx.user.id),
      ]);
      return { territories, total };
    }),

  // Get territory detail with points
  getById: protectedProcedure
    .input(z.object({ territoryId: z.number().int().positive() }))
    .query(async ({ input, ctx }) => {
      const territory = await verifyTerritoryOwnership(input.territoryId, ctx.user.id);
      const points = await listBoundaryPointsByTerritory(territory.id);
      const documents = await listTerritoryDocuments(territory.id);
      return { territory, points, documents };
    }),

  // Save/replace all boundary points for a territory
  savePoints: protectedProcedure
    .input(z.object({
      territoryId: z.number().int().positive(),
      points: z.array(z.object({
        pointNumber: z.number().int().positive(),
        latitude: z.string().min(1),
        longitude: z.string().min(1),
        landmark: z.string().max(255).optional(),
        source: z.enum(["manual", "gpx_import", "csv_import"]).default("manual"),
      })).min(4, "Minimum 4 points requis"),
      calculatedAreaHa: z.string().optional(),
      calculatedPerimeterKm: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const territory = await verifyTerritoryOwnership(input.territoryId, ctx.user.id);

      // Replace all points
      await replaceBoundaryPoints(
        territory.id,
        input.points.map(p => ({
          territoryId: territory.id,
          pointNumber: p.pointNumber,
          latitude: p.latitude,
          longitude: p.longitude,
          landmark: p.landmark,
          source: p.source,
        }))
      );

      // Update territory status and calculated values
      await updateTerritory(territory.id, {
        status: "collecting",
        calculatedAreaHa: input.calculatedAreaHa,
        calculatedPerimeterKm: input.calculatedPerimeterKm,
      });

      await createAuditEvent({
        actorId: ctx.user.id,
        actorRole: ctx.user.role,
        action: "delimitation.points.saved",
        targetType: "village_territory",
        targetId: territory.id,
        details: { pointCount: input.points.length, area: input.calculatedAreaHa, perimeter: input.calculatedPerimeterKm },
      });

      return { success: true, pointCount: input.points.length };
    }),

  // Update a single boundary point
  updatePoint: protectedProcedure
    .input(z.object({
      territoryId: z.number().int().positive(),
      pointId: z.number().int().positive(),
      latitude: z.string().min(1),
      longitude: z.string().min(1),
      landmark: z.string().max(255).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      await verifyTerritoryOwnership(input.territoryId, ctx.user.id);
      // Verify point belongs to territory
      const points = await listBoundaryPointsByTerritory(input.territoryId);
      const pointBelongs = points.some(p => p.id === input.pointId);
      if (!pointBelongs) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Point introuvable dans ce territoire." });
      }
      await updateBoundaryPoint(input.pointId, {
        latitude: input.latitude,
        longitude: input.longitude,
        landmark: input.landmark,
      });

      await createAuditEvent({
        actorId: ctx.user.id,
        actorRole: ctx.user.role,
        action: "delimitation.point.updated",
        targetType: "territory_boundary_point",
        targetId: input.pointId,
        details: { territoryId: input.territoryId },
      });

      return { success: true };
    }),

  // Delete a single boundary point
  deletePoint: protectedProcedure
    .input(z.object({
      territoryId: z.number().int().positive(),
      pointId: z.number().int().positive(),
    }))
    .mutation(async ({ input, ctx }) => {
      await verifyTerritoryOwnership(input.territoryId, ctx.user.id);
      // Verify point belongs to territory
      const points = await listBoundaryPointsByTerritory(input.territoryId);
      const pointBelongs = points.some(p => p.id === input.pointId);
      if (!pointBelongs) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Point introuvable dans ce territoire." });
      }
      await deleteBoundaryPoint(input.pointId);

      await createAuditEvent({
        actorId: ctx.user.id,
        actorRole: ctx.user.role,
        action: "delimitation.point.deleted",
        targetType: "territory_boundary_point",
        targetId: input.pointId,
        details: { territoryId: input.territoryId },
      });

      return { success: true };
    }),

  // Submit points (transition to "submitted")
  submitPoints: protectedProcedure
    .input(z.object({
      territoryId: z.number().int().positive(),
    }))
    .mutation(async ({ input, ctx }) => {
      const territory = await verifyTerritoryOwnership(input.territoryId, ctx.user.id);
      const points = await listBoundaryPointsByTerritory(territory.id);

      if (points.length < 4) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Minimum 4 points de borne requis pour soumettre.",
        });
      }

      await updateTerritory(territory.id, { status: "submitted" });

      await createAuditEvent({
        actorId: ctx.user.id,
        actorRole: ctx.user.role,
        action: "delimitation.territory.submitted",
        targetType: "village_territory",
        targetId: territory.id,
        details: { pointCount: points.length },
      });

      return { success: true };
    }),

  // Validate by chief (transition to "validated_chief")
  validateByChief: protectedProcedure
    .input(z.object({
      territoryId: z.number().int().positive(),
      chiefComments: z.string().max(1000).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const territory = await verifyTerritoryOwnership(input.territoryId, ctx.user.id);

      if (territory.status !== "submitted") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Le territoire doit être soumis avant la validation du chef.",
        });
      }

      await updateTerritory(territory.id, {
        status: "validated_chief",
        chiefSignedAt: new Date(),
        chiefComments: input.chiefComments,
      });

      await createAuditEvent({
        actorId: ctx.user.id,
        actorRole: ctx.user.role,
        action: "delimitation.territory.validated_chief",
        targetType: "village_territory",
        targetId: territory.id,
        details: { chiefComments: input.chiefComments },
      });

      return { success: true };
    }),

  // Officialize (transition to "official")
  officialize: protectedProcedure
    .input(z.object({
      territoryId: z.number().int().positive(),
    }))
    .mutation(async ({ input, ctx }) => {
      const territory = await verifyTerritoryOwnership(input.territoryId, ctx.user.id);

      if (territory.status !== "validated_chief") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Le territoire doit être validé par le chef avant la reconnaissance officielle.",
        });
      }

      await updateTerritory(territory.id, {
        status: "official",
        officializedAt: new Date(),
      });

      await createAuditEvent({
        actorId: ctx.user.id,
        actorRole: ctx.user.role,
        action: "delimitation.territory.officialized",
        targetType: "village_territory",
        targetId: territory.id,
      });

      return { success: true };
    }),

  // Sync with SIFOR (transition to "synced")
  syncSifor: protectedProcedure
    .input(z.object({
      territoryId: z.number().int().positive(),
    }))
    .mutation(async ({ input, ctx }) => {
      const territory = await verifyTerritoryOwnership(input.territoryId, ctx.user.id);

      if (territory.status !== "official") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Le territoire doit être officialisé avant la synchronisation SIFOR.",
        });
      }

      // Simulate SIFOR sync (generate a code)
      const siforCode = `SIFOR-CI-${territory.code}-${Date.now().toString(36).toUpperCase()}`;

      await updateTerritory(territory.id, {
        status: "synced",
        siforCode,
        syncedAt: new Date(),
      });

      await createAuditEvent({
        actorId: ctx.user.id,
        actorRole: ctx.user.role,
        action: "delimitation.territory.synced",
        targetType: "village_territory",
        targetId: territory.id,
        details: { siforCode },
      });

      return { success: true, siforCode };
    }),

  // Upload a document for a territory
  uploadDocument: protectedProcedure
    .input(z.object({
      territoryId: z.number().int().positive(),
      title: z.string().min(1).max(255),
      documentType: z.enum([
        "pv_delimitation",
        "carte_territoire",
        "autorisation_prefectorale",
        "attestation_chef",
        "photo_borne",
        "autre",
      ]),
      fileBase64: z.string(),
      fileName: z.string(),
      mimeType: z.string(),
      fileSize: z.number().int().positive(),
    }))
    .mutation(async ({ input, ctx }) => {
      const territory = await verifyTerritoryOwnership(input.territoryId, ctx.user.id);

      // Upload to S3
      const fileBuffer = Buffer.from(input.fileBase64, "base64");
      const ext = input.fileName.split(".").pop() || "bin";
      const fileKey = `delimitation/${territory.id}/${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${ext}`;
      const { url } = await storagePut(fileKey, fileBuffer, input.mimeType);

      const doc = await insertTerritoryDocument({
        territoryId: territory.id,
        title: input.title,
        documentType: input.documentType,
        fileUrl: url,
        fileKey,
        mimeType: input.mimeType,
        fileSize: input.fileSize,
        uploadedById: ctx.user.id,
      });

      await createAuditEvent({
        actorId: ctx.user.id,
        actorRole: ctx.user.role,
        action: "delimitation.document.uploaded",
        targetType: "territory_document",
        targetId: doc.id,
        details: { territoryId: territory.id, documentType: input.documentType, title: input.title },
      });

      return doc;
    }),

  // Delete a document
  deleteDocument: protectedProcedure
    .input(z.object({
      territoryId: z.number().int().positive(),
      documentId: z.number().int().positive(),
    }))
    .mutation(async ({ input, ctx }) => {
      await verifyTerritoryOwnership(input.territoryId, ctx.user.id);
      // Verify document belongs to territory
      const docs = await listTerritoryDocuments(input.territoryId);
      const docBelongs = docs.some(d => d.id === input.documentId);
      if (!docBelongs) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Document introuvable dans ce territoire." });
      }
      await deleteTerritoryDocument(input.documentId);

      await createAuditEvent({
        actorId: ctx.user.id,
        actorRole: ctx.user.role,
        action: "delimitation.document.deleted",
        targetType: "territory_document",
        targetId: input.documentId,
        details: { territoryId: input.territoryId },
      });

      return { success: true };
    }),
});
