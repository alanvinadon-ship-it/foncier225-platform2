import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { adminProcedure, router } from "./_core/trpc";
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
import { DocumentGenerationService } from "./document-generation.service";

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
  create: adminProcedure
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
  list: adminProcedure
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
  getById: adminProcedure
    .input(z.object({ territoryId: z.number().int().positive() }))
    .query(async ({ input, ctx }) => {
      const territory = await verifyTerritoryOwnership(input.territoryId, ctx.user.id);
      const points = await listBoundaryPointsByTerritory(territory.id);
      const documents = await listTerritoryDocuments(territory.id);
      return { territory, points, documents };
    }),

  // Save/replace all boundary points for a territory
  savePoints: adminProcedure
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
  updatePoint: adminProcedure
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
  deletePoint: adminProcedure
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
  submitPoints: adminProcedure
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
  validateByChief: adminProcedure
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
  officialize: adminProcedure
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
  syncSifor: adminProcedure
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
  uploadDocument: adminProcedure
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
      step: z.enum([
        "initialisation",
        "collecte",
        "soumission",
        "validation_chef",
        "officialisation",
        "synchronisation",
      ]).optional(),
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
        step: input.step || "collecte",
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
  deleteDocument: adminProcedure
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

  // Manually update territory status (admin override)
  updateStatus: adminProcedure
    .input(z.object({
      territoryId: z.number().int().positive(),
      status: z.enum(["draft", "collecting", "submitted", "validated_chief", "official", "synced"]),
    }))
    .mutation(async ({ input, ctx }) => {
      const territory = await verifyTerritoryOwnership(input.territoryId, ctx.user.id);
      const previousStatus = territory.status;

      if (previousStatus === input.status) {
        return { success: true, message: "Statut inchangé." };
      }

      const updateData: Record<string, any> = { status: input.status };

      // Set relevant timestamps based on new status
      if (input.status === "validated_chief" && !territory.chiefSignedAt) {
        updateData.chiefSignedAt = new Date();
      }
      if (input.status === "official" && !territory.officializedAt) {
        updateData.officializedAt = new Date();
      }
      if (input.status === "synced" && !territory.syncedAt) {
        updateData.syncedAt = new Date();
        if (!territory.siforCode) {
          updateData.siforCode = `SIFOR-CI-${territory.code}-${Date.now().toString(36).toUpperCase()}`;
        }
      }

      await updateTerritory(territory.id, updateData);

      await createAuditEvent({
        actorId: ctx.user.id,
        actorRole: ctx.user.role,
        action: "delimitation.territory.status_changed",
        targetType: "village_territory",
        targetId: territory.id,
        details: { previousStatus, newStatus: input.status },
      });

      return { success: true, previousStatus, newStatus: input.status };
    }),

  // List documents by step
  listDocumentsByStep: adminProcedure
    .input(z.object({
      territoryId: z.number().int().positive(),
      step: z.enum([
        "initialisation",
        "collecte",
        "soumission",
        "validation_chef",
        "officialisation",
        "synchronisation",
      ]).optional(),
    }))
    .query(async ({ input, ctx }) => {
      await verifyTerritoryOwnership(input.territoryId, ctx.user.id);
      const allDocs = await listTerritoryDocuments(input.territoryId);
      if (input.step) {
        return allDocs.filter(d => (d as any).step === input.step);
      }
      return allDocs;
    }),

  // Export territory as GeoJSON
  exportGeoJSON: adminProcedure
    .input(z.object({ territoryId: z.number().int().positive() }))
    .query(async ({ input, ctx }) => {
      const territory = await verifyTerritoryOwnership(input.territoryId, ctx.user.id);
      const points = await listBoundaryPointsByTerritory(input.territoryId);

      const coordinates = points.map(p => [parseFloat(p.longitude), parseFloat(p.latitude)]);
      // Close the polygon
      if (coordinates.length > 0) {
        coordinates.push(coordinates[0]);
      }

      const geojson = {
        type: "FeatureCollection" as const,
        features: [
          {
            type: "Feature" as const,
            properties: {
              name: territory.name,
              code: territory.code,
              chiefName: territory.chiefName,
              status: territory.status,
              estimatedAreaHa: territory.estimatedAreaHa,
              calculatedAreaHa: territory.calculatedAreaHa,
              calculatedPerimeterKm: territory.calculatedPerimeterKm,
              siforCode: territory.siforCode,
              createdAt: territory.createdAt,
            },
            geometry: {
              type: "Polygon" as const,
              coordinates: coordinates.length >= 4 ? [coordinates] : [],
            },
          },
          ...points.map(p => ({
            type: "Feature" as const,
            properties: {
              pointNumber: p.pointNumber,
              landmark: p.landmark,
              source: p.source,
            },
            geometry: {
              type: "Point" as const,
              coordinates: [parseFloat(p.longitude), parseFloat(p.latitude)],
            },
          })),
        ],
      };

      return { geojson, filename: `delimitation-${territory.code}.geojson` };
    }),

  // Export territory as PDF
  exportPdf: adminProcedure
    .input(z.object({ territoryId: z.number().int().positive() }))
    .mutation(async ({ input, ctx }) => {
      const territory = await verifyTerritoryOwnership(input.territoryId, ctx.user.id);
      const points = await listBoundaryPointsByTerritory(input.territoryId);

      const statusLabels: Record<string, string> = {
        draft: "Brouillon",
        collecting: "Collecte en cours",
        submitted: "Soumis",
        validated_chief: "Valid\u00e9 par le chef",
        official: "Officiel",
        synced: "Synchronis\u00e9 SIFOR-CI",
      };

      const lines = [
        `Code territoire : ${territory.code}`,
        `Nom du village : ${territory.name}`,
        `Chef du village : ${territory.chiefName}`,
        territory.chiefPhone ? `T\u00e9l\u00e9phone : ${territory.chiefPhone}` : "",
        `Statut : ${statusLabels[territory.status] || territory.status}`,
        `Surface estim\u00e9e : ${territory.estimatedAreaHa || "N/A"} ha`,
        `Surface calcul\u00e9e : ${territory.calculatedAreaHa || "N/A"} ha`,
        `P\u00e9rim\u00e8tre calcul\u00e9 : ${territory.calculatedPerimeterKm || "N/A"} km`,
        territory.siforCode ? `Code SIFOR : ${territory.siforCode}` : "",
        `Date de cr\u00e9ation : ${new Date(territory.createdAt).toLocaleDateString("fr-FR")}`,
        "",
        `--- POINTS DE BORNE (${points.length}) ---`,
        ...points.map(p => `  N\u00b0${p.pointNumber}: Lat ${p.latitude}, Lng ${p.longitude} - ${p.landmark || ""} (${p.source})`),
      ].filter(Boolean);

      const { buffer, checksumSha256 } = DocumentGenerationService.buildPdf({
        title: "FICHE DE D\u00c9LIMITATION VILLAGEOISE",
        subtitle: `Territoire : ${territory.name} (${territory.code})`,
        lines,
        watermark: "FONCIER225",
        verifySeed: `delimitation-${territory.id}-${territory.code}`,
      });

      // Upload to S3
      const fileKey = `delimitation/${territory.id}/fiche-delimitation-${territory.code}-${Date.now()}.pdf`;
      const { url } = await storagePut(fileKey, buffer, "application/pdf");

      await createAuditEvent({
        actorId: ctx.user.id,
        actorRole: ctx.user.role,
        action: "delimitation.pdf.exported",
        targetType: "village_territory",
        targetId: territory.id,
        details: { checksum: checksumSha256 },
      });

      return { url, filename: `fiche-delimitation-${territory.code}.pdf`, checksum: checksumSha256 };
    }),
});
