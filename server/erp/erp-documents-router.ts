import { z } from "zod";
import { eq, and, isNull, like, or, sql, desc, asc, count, lte } from "drizzle-orm";
import { router, erpPermissionProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { erpDocuments, erpDocumentVersions, users } from "../../drizzle/schema";
import { storagePut, storageGet } from "../storage";

const DOCUMENT_TYPES = [
  "permis_construire", "plan_technique", "contrat", "facture",
  "attestation", "certification", "rapport_securite", "autre"
] as const;

const DOCUMENT_STATUSES = [
  "pending", "validated", "rejected", "expired", "renewal_required"
] as const;

const DANGEROUS_EXTENSIONS = [".exe", ".bat", ".cmd", ".sh", ".ps1", ".vbs", ".js", ".msi"];

function isDangerousFile(fileName: string): boolean {
  const ext = fileName.toLowerCase().slice(fileName.lastIndexOf("."));
  return DANGEROUS_EXTENSIONS.includes(ext);
}

export const erpDocumentsRouter = router({
  // List documents with filters and pagination
  list: erpPermissionProcedure("erp_documents", "view")
    .input(z.object({
      projectId: z.number().optional(),
      type: z.enum(DOCUMENT_TYPES).optional(),
      status: z.enum(DOCUMENT_STATUSES).optional(),
      search: z.string().optional(),
      limit: z.number().min(1).max(100).default(20),
      offset: z.number().min(0).default(0),
    }))
    .query(async ({ input }) => {
      const db = (await getDb())!;
      const conditions = [isNull(erpDocuments.deletedAt)];

      if (input.projectId) conditions.push(eq(erpDocuments.projectId, input.projectId));
      if (input.type) conditions.push(eq(erpDocuments.type, input.type));
      if (input.status) conditions.push(eq(erpDocuments.status, input.status));
      if (input.search) {
        conditions.push(
          or(
            like(erpDocuments.title, `%${input.search}%`),
            like(erpDocuments.fileName, `%${input.search}%`)
          )!
        );
      }

      const where = and(...conditions);

      const [items, totalResult] = await Promise.all([
        db.select({
          id: erpDocuments.id,
          projectId: erpDocuments.projectId,
          title: erpDocuments.title,
          type: erpDocuments.type,
          status: erpDocuments.status,
          fileName: erpDocuments.fileName,
          mimeType: erpDocuments.mimeType,
          fileSize: erpDocuments.fileSize,
          issuedAt: erpDocuments.issuedAt,
          expiresAt: erpDocuments.expiresAt,
          uploadedBy: erpDocuments.uploadedBy,
          createdAt: erpDocuments.createdAt,
          updatedAt: erpDocuments.updatedAt,
        })
          .from(erpDocuments)
          .where(where)
          .orderBy(desc(erpDocuments.createdAt))
          .limit(input.limit)
          .offset(input.offset),
        db.select({ count: count() }).from(erpDocuments).where(where),
      ]);

      return { items, total: totalResult[0]?.count ?? 0 };
    }),

  // Get document by ID with versions
  getById: erpPermissionProcedure("erp_documents", "view")
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = (await getDb())!;
      const [doc] = await db.select()
        .from(erpDocuments)
        .where(and(eq(erpDocuments.id, input.id), isNull(erpDocuments.deletedAt)));

      if (!doc) throw new Error("Document non trouvé");

      const versions = await db.select()
        .from(erpDocumentVersions)
        .where(eq(erpDocumentVersions.documentId, input.id))
        .orderBy(desc(erpDocumentVersions.version));

      return { ...doc, versions };
    }),

  // Create document with file upload
  create: erpPermissionProcedure("erp_documents", "create")
    .input(z.object({
      projectId: z.number().optional(),
      title: z.string().min(1).max(255),
      type: z.enum(DOCUMENT_TYPES),
      issuedAt: z.number().optional(),
      expiresAt: z.number().optional(),
      fileBase64: z.string().optional(),
      fileName: z.string().optional(),
      mimeType: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = (await getDb())!;
      const now = Date.now();

      // Validate file if provided
      if (input.fileName && isDangerousFile(input.fileName)) {
        throw new Error("Type de fichier non autorisé pour des raisons de sécurité");
      }

      let fileUrl: string | null = null;
      let fileKey: string | null = null;
      let fileSize = 0;

      if (input.fileBase64 && input.fileName) {
        const buffer = Buffer.from(input.fileBase64, "base64");
        fileSize = buffer.length;
        const randomSuffix = Math.random().toString(36).substring(2, 10);
        const key = `erp-documents/${ctx.user.id}/${Date.now()}-${randomSuffix}-${input.fileName}`;
        const uploaded = await storagePut(key, buffer, input.mimeType || "application/octet-stream");
        fileUrl = uploaded.url;
        fileKey = key;
      }

      const [result] = await db.insert(erpDocuments).values({
        projectId: input.projectId ?? null,
        title: input.title,
        type: input.type,
        status: "pending",
        fileUrl,
        fileKey,
        fileName: input.fileName ?? null,
        mimeType: input.mimeType ?? null,
        fileSize,
        issuedAt: input.issuedAt ?? null,
        expiresAt: input.expiresAt ?? null,
        uploadedBy: ctx.user.id,
        createdAt: now,
        updatedAt: now,
      });

      return { id: result.insertId, message: "Document créé avec succès" };
    }),

  // Update document metadata
  update: erpPermissionProcedure("erp_documents", "update")
    .input(z.object({
      id: z.number(),
      title: z.string().min(1).max(255).optional(),
      type: z.enum(DOCUMENT_TYPES).optional(),
      issuedAt: z.number().nullable().optional(),
      expiresAt: z.number().nullable().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = (await getDb())!;
      const { id, ...updates } = input;

      await db.update(erpDocuments)
        .set({ ...updates, updatedAt: Date.now() })
        .where(and(eq(erpDocuments.id, id), isNull(erpDocuments.deletedAt)));

      return { success: true };
    }),

  // Soft delete document
  delete: erpPermissionProcedure("erp_documents", "delete")
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = (await getDb())!;
      await db.update(erpDocuments)
        .set({ deletedAt: Date.now(), updatedAt: Date.now() })
        .where(and(eq(erpDocuments.id, input.id), isNull(erpDocuments.deletedAt)));

      return { success: true };
    }),

  // Download document (presigned URL)
  download: erpPermissionProcedure("erp_documents", "download")
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = (await getDb())!;
      const [doc] = await db.select({ fileKey: erpDocuments.fileKey, fileUrl: erpDocuments.fileUrl, fileName: erpDocuments.fileName })
        .from(erpDocuments)
        .where(and(eq(erpDocuments.id, input.id), isNull(erpDocuments.deletedAt)));

      if (!doc || !doc.fileKey) throw new Error("Fichier non trouvé");

      const { url } = await storageGet(doc.fileKey);
      return { url, fileName: doc.fileName };
    }),

  // Add a new version to a document
  addVersion: erpPermissionProcedure("erp_documents", "update")
    .input(z.object({
      documentId: z.number(),
      fileBase64: z.string(),
      fileName: z.string(),
      mimeType: z.string().optional(),
      comment: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = (await getDb())!;

      if (isDangerousFile(input.fileName)) {
        throw new Error("Type de fichier non autorisé pour des raisons de sécurité");
      }

      // Get current max version
      const [maxVer] = await db.select({ maxV: sql<number>`COALESCE(MAX(${erpDocumentVersions.version}), 0)` })
        .from(erpDocumentVersions)
        .where(eq(erpDocumentVersions.documentId, input.documentId));

      const newVersion = (maxVer?.maxV ?? 0) + 1;

      const buffer = Buffer.from(input.fileBase64, "base64");
      const randomSuffix = Math.random().toString(36).substring(2, 10);
      const key = `erp-documents/${ctx.user.id}/v${newVersion}-${randomSuffix}-${input.fileName}`;
      const uploaded = await storagePut(key, buffer, input.mimeType || "application/octet-stream");

      await db.insert(erpDocumentVersions).values({
        documentId: input.documentId,
        version: newVersion,
        fileUrl: uploaded.url,
        fileKey: key,
        fileName: input.fileName,
        mimeType: input.mimeType ?? null,
        fileSize: buffer.length,
        uploadedBy: ctx.user.id,
        comment: input.comment ?? null,
        createdAt: Date.now(),
      });

      // Update main document file info
      await db.update(erpDocuments).set({
        fileUrl: uploaded.url,
        fileKey: key,
        fileName: input.fileName,
        mimeType: input.mimeType ?? null,
        fileSize: buffer.length,
        updatedAt: Date.now(),
      }).where(eq(erpDocuments.id, input.documentId));

      return { version: newVersion, message: "Nouvelle version ajoutée" };
    }),

  // Validate document
  validate: erpPermissionProcedure("erp_documents", "approve")
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = (await getDb())!;
      const now = Date.now();

      await db.update(erpDocuments).set({
        status: "validated",
        validatedBy: ctx.user.id,
        validatedAt: now,
        updatedAt: now,
      }).where(and(eq(erpDocuments.id, input.id), isNull(erpDocuments.deletedAt)));

      return { success: true };
    }),

  // Reject document
  reject: erpPermissionProcedure("erp_documents", "approve")
    .input(z.object({
      id: z.number(),
      reason: z.string().min(1).max(1000),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = (await getDb())!;
      const now = Date.now();

      await db.update(erpDocuments).set({
        status: "rejected",
        rejectedBy: ctx.user.id,
        rejectedAt: now,
        rejectionReason: input.reason,
        updatedAt: now,
      }).where(and(eq(erpDocuments.id, input.id), isNull(erpDocuments.deletedAt)));

      return { success: true };
    }),

  // Get expired documents
  expired: erpPermissionProcedure("erp_documents", "view")
    .query(async () => {
      const db = (await getDb())!;
      const now = Date.now();

      const items = await db.select()
        .from(erpDocuments)
        .where(and(
          isNull(erpDocuments.deletedAt),
          lte(erpDocuments.expiresAt, now),
          sql`${erpDocuments.expiresAt} IS NOT NULL`
        ))
        .orderBy(asc(erpDocuments.expiresAt));

      return items;
    }),
});
