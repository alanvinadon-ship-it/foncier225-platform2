import {
  bigint,
  boolean,
  index,
  int,
  json,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  unique,
  varchar,
} from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["citizen", "agent_terrain", "agent_mclu", "geometre_urbain", "conservateur", "notaire", "bank", "admin"]).default("citizen").notNull(),
  zoneCodes: json("zoneCodes").$type<string[]>(),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

export const parcels = mysqlTable("parcels", {
  id: int("id").autoincrement().primaryKey(),
  publicToken: varchar("publicToken", { length: 64 }).notNull().unique(),
  reference: varchar("reference", { length: 64 }).notNull().unique(),
  zoneCode: varchar("zoneCode", { length: 20 }),
  landType: mysqlEnum("landType", ["URBAN", "RURAL"]).default("RURAL").notNull(),
  statusPublic: mysqlEnum("statusPublic", [
    "dossier_en_cours",
    "en_opposition",
    "gele",
    "mediation_en_cours",
    "acte_notarie_enregistre",
    "valide",
  ]).default("dossier_en_cours").notNull(),
  surfaceApprox: varchar("surfaceApprox", { length: 32 }),
  localisation: varchar("localisation", { length: 255 }),
  kpiFlagsJson: json("kpiFlagsJson").$type<Record<string, boolean>>(),
  ownerId: int("ownerId").references(() => users.id, { onDelete: "set null" }),
  latitude: varchar("latitude", { length: 30 }),
  longitude: varchar("longitude", { length: 30 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  createdById: int("createdById").references(() => users.id, { onDelete: "set null" }),
});

export type Parcel = typeof parcels.$inferSelect;
export type InsertParcel = typeof parcels.$inferInsert;

export const parcelEvents = mysqlTable("parcel_events", {
  id: int("id").autoincrement().primaryKey(),
  parcelId: int("parcelId").notNull(),
  eventType: mysqlEnum("eventType", [
    "creation",
    "opposition",
    "mediation",
    "gel",
    "validation",
    "notary",
    "insurance",
    "terrain_visit",
    "document_added",
    "status_change",
  ]).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  monthYear: varchar("monthYear", { length: 16 }),
  isPublic: boolean("isPublic").default(true).notNull(),
  metadata: json("metadata").$type<Record<string, unknown>>(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  createdById: int("createdById"),
});

export type ParcelEvent = typeof parcelEvents.$inferSelect;
export type InsertParcelEvent = typeof parcelEvents.$inferInsert;

export const documents = mysqlTable("documents", {
  id: int("id").autoincrement().primaryKey(),
  parcelId: int("parcelId").notNull().references(() => parcels.id, { onDelete: "restrict" }),
  ownerId: int("ownerId").notNull().references(() => users.id, { onDelete: "restrict" }),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  documentType: mysqlEnum("documentType", [
    "attestation",
    "titre_foncier",
    "plan_cadastral",
    "pv_bornage",
    "acte_vente",
    "certificat_propriete",
    "rapport_expertise",
    "autre",
  ]).default("autre").notNull(),
  fileUrl: varchar("fileUrl", { length: 512 }),
  fileKey: varchar("fileKey", { length: 256 }),
  mimeType: varchar("mimeType", { length: 64 }),
  fileSize: int("fileSize"),
  status: mysqlEnum("status", ["draft", "published", "archived"]).default("published").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  createdById: int("createdById").references(() => users.id, { onDelete: "set null" }),
});

export type Document = typeof documents.$inferSelect;
export type InsertDocument = typeof documents.$inferInsert;

export const verifyTokens = mysqlTable("verify_tokens", {
  id: int("id").autoincrement().primaryKey(),
  tokenHash: varchar("tokenHash", { length: 128 }).notNull().unique(),
  tokenType: mysqlEnum("tokenType", [
    "insurance",
    "mediation",
    "notary",
    "export",
    "parcel",
    "document",
  ]).notNull(),
  targetId: int("targetId").notNull(),
  status: mysqlEnum("status", ["active", "rotated", "revoked"]).default("active").notNull(),
  issuedMonth: varchar("issuedMonth", { length: 16 }),
  expiresAt: timestamp("expiresAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  createdById: int("createdById").references(() => users.id, { onDelete: "set null" }),
});

export type VerifyToken = typeof verifyTokens.$inferSelect;
export type InsertVerifyToken = typeof verifyTokens.$inferInsert;

export const attestations = mysqlTable(
  "attestations",
  {
    id: int("id").autoincrement().primaryKey(),
    parcelId: int("parcelId").references(() => parcels.id, { onDelete: "restrict" }),
    creditFileId: int("creditFileId").references(() => creditFiles.id, { onDelete: "set null" }),
    decisionId: int("decisionId").references(() => creditDecisions.id, { onDelete: "set null" }),
    documentId: int("documentId").references(() => documents.id, { onDelete: "set null" }),
    attestationType: mysqlEnum("attestationType", [
      "insurance",
      "mediation_pv",
      "notary_act",
      "terrain_report",
      "credit",
    ]).notNull(),
    tokenId: int("tokenId").references(() => verifyTokens.id, { onDelete: "set null" }),
    status: mysqlEnum("status", ["draft", "issued", "revoked"]).default("draft").notNull(),
    documentRef: varchar("documentRef", { length: 64 }),
    finalDecisionType: mysqlEnum("finalDecisionType", ["APPROVED", "REJECTED"]),
    verifyCode: varchar("verifyCode", { length: 128 }),
    checksumSha256: varchar("checksumSha256", { length: 64 }),
    fileUrl: varchar("fileUrl", { length: 512 }),
    fileKey: varchar("fileKey", { length: 256 }),
    issuedAt: timestamp("issuedAt"),
    metadata: json("metadata").$type<Record<string, unknown>>(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    createdById: int("createdById").references(() => users.id, { onDelete: "set null" }),
  },
  table => ({
    creditFileIdx: index("idx_attestations_credit_file").on(table.creditFileId),
    decisionIdx: index("idx_attestations_decision").on(table.decisionId),
  })
);

export type Attestation = typeof attestations.$inferSelect;
export type InsertAttestation = typeof attestations.$inferInsert;

export const generatedDocuments = mysqlTable(
  "generated_documents",
  {
    id: int("id").autoincrement().primaryKey(),
    documentType: mysqlEnum("documentType", [
      "PARCEL_PDF",
      "DOSSIER_PDF",
      "FINAL_CREDIT_ATTESTATION",
    ]).notNull(),
    reference: varchar("reference", { length: 64 }).notNull().unique(),
    parcelId: int("parcelId").references(() => parcels.id, { onDelete: "set null" }),
    creditFileId: int("creditFileId").references(() => creditFiles.id, { onDelete: "set null" }),
    attestationId: int("attestationId").references(() => attestations.id, { onDelete: "set null" }),
    generatedByUserId: int("generatedByUserId").references(() => users.id, { onDelete: "set null" }),
    verifyTokenId: int("verifyTokenId").references(() => verifyTokens.id, { onDelete: "set null" }),
    checksumSha256: varchar("checksumSha256", { length: 64 }).notNull(),
    fileUrl: varchar("fileUrl", { length: 512 }).notNull(),
    fileKey: varchar("fileKey", { length: 256 }).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    metadataJson: json("metadataJson").$type<Record<string, unknown>>(),
  },
  table => ({
    typeIdx: index("idx_generated_documents_type").on(table.documentType),
    parcelIdx: index("idx_generated_documents_parcel").on(table.parcelId),
    creditFileIdx: index("idx_generated_documents_credit_file").on(table.creditFileId),
    verifyIdx: index("idx_generated_documents_verify").on(table.verifyTokenId),
  })
);

export type GeneratedDocument = typeof generatedDocuments.$inferSelect;
export type InsertGeneratedDocument = typeof generatedDocuments.$inferInsert;

export const auditEvents = mysqlTable("audit_events", {
  id: int("id").autoincrement().primaryKey(),
  actorId: int("actorId"),
  actorRole: varchar("actorRole", { length: 32 }),
  action: varchar("action", { length: 128 }).notNull(),
  targetType: varchar("targetType", { length: 64 }),
  targetId: int("targetId"),
  details: json("details").$type<Record<string, unknown>>(),
  ipHash: varchar("ipHash", { length: 64 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type AuditEvent = typeof auditEvents.$inferSelect;
export type InsertAuditEvent = typeof auditEvents.$inferInsert;

export const verifyRateLimits = mysqlTable("verify_rate_limits", {
  id: int("id").autoincrement().primaryKey(),
  ipHash: varchar("ipHash", { length: 64 }).notNull(),
  hitCount: int("hitCount").default(0).notNull(),
  windowStart: bigint("windowStart", { mode: "number" }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type VerifyRateLimit = typeof verifyRateLimits.$inferSelect;

export const creditFiles = mysqlTable(
  "credit_files",
  {
    id: int("id").autoincrement().primaryKey(),
    publicRef: varchar("publicRef", { length: 32 }).unique(),
    initiatorId: int("initiatorId").notNull().references(() => users.id, { onDelete: "restrict" }),
    parcelId: int("parcelId").references(() => parcels.id, { onDelete: "set null" }),
    amountRequestedXof: int("amountRequestedXof"),
    durationMonths: int("durationMonths"),
    productType: mysqlEnum("productType", ["STANDARD", "SIMPLIFIED"]).default("STANDARD").notNull(),
    status: mysqlEnum("status", [
      "DRAFT",
      "DOCS_PENDING",
      "SUBMITTED",
      "UNDER_REVIEW",
      "OFFERED",
      "ACCEPTED",
      "APPROVED",
      "REJECTED",
      "CLOSED",
    ]).default("DRAFT").notNull(),
    metadata: json("metadata").$type<Record<string, unknown>>(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
    submittedAt: timestamp("submittedAt"),
    lastTransitionAt: timestamp("lastTransitionAt"),
    closedAt: timestamp("closedAt"),
  },
  table => ({
    ownerIdx: index("idx_credit_files_owner").on(table.initiatorId),
    statusIdx: index("idx_credit_files_status").on(table.status),
    parcelIdx: index("idx_credit_files_parcel").on(table.parcelId),
  })
);

export type CreditFile = typeof creditFiles.$inferSelect;
export type InsertCreditFile = typeof creditFiles.$inferInsert;

export const creditFileParticipants = mysqlTable(
  "credit_file_participants",
  {
    id: int("id").autoincrement().primaryKey(),
    creditFileId: int("creditFileId").notNull().references(() => creditFiles.id, { onDelete: "cascade" }),
    userId: int("userId").references(() => users.id, { onDelete: "set null" }),
    role: mysqlEnum("role", ["citizen", "co_borrower", "bank_agent", "agent_terrain"]).notNull(),
    displayName: varchar("displayName", { length: 128 }),
    consentGiven: boolean("consentGiven").default(false).notNull(),
    consentGivenAt: timestamp("consentGivenAt"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => ({
    fileIdx: index("idx_cfp_file").on(table.creditFileId),
  })
);

export type CreditFileParticipant = typeof creditFileParticipants.$inferSelect;
export type InsertCreditFileParticipant = typeof creditFileParticipants.$inferInsert;

export const creditDocuments = mysqlTable(
  "credit_documents",
  {
    id: int("id").autoincrement().primaryKey(),
    creditFileId: int("creditFileId").notNull().references(() => creditFiles.id, { onDelete: "cascade" }),
    documentId: int("documentId").references(() => documents.id, { onDelete: "set null" }),
    documentType: mysqlEnum("documentType", [
      "ID_CARD",
      "PROOF_INCOME",
      "PROOF_RESIDENCE",
      "LAND_TITLE_DEED",
      "BUILDING_PERMIT",
      "INSURANCE_QUOTE",
    ]).notNull(),
    status: mysqlEnum("status", ["PENDING", "UPLOADED", "VALIDATED", "REJECTED"]).default("PENDING").notNull(),
    fileUrl: varchar("fileUrl", { length: 512 }),
    fileKey: varchar("fileKey", { length: 256 }),
    mimeType: varchar("mimeType", { length: 64 }),
    fileSize: int("fileSize"),
    sha256: varchar("sha256", { length: 64 }),
    rejectionReason: text("rejectionReason"),
    uploadedAt: timestamp("uploadedAt"),
    validatedAt: timestamp("validatedAt"),
    validatedById: int("validatedById").references(() => users.id, { onDelete: "set null" }),
    rejectedAt: timestamp("rejectedAt"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => ({
    fileIdx: index("idx_cdoc_file").on(table.creditFileId),
  })
);

export type CreditDocument = typeof creditDocuments.$inferSelect;
export type InsertCreditDocument = typeof creditDocuments.$inferInsert;

export const creditRequests = mysqlTable(
  "credit_requests",
  {
    id: int("id").autoincrement().primaryKey(),
    creditFileId: int("creditFileId").notNull().references(() => creditFiles.id, { onDelete: "cascade" }),
    requestType: mysqlEnum("requestType", ["DOCUMENT_REQUEST", "INFORMATION_REQUEST"]).notNull(),
    message: text("message").notNull(),
    requestedDocumentTypes: json("requestedDocumentTypes").$type<string[]>(),
    status: mysqlEnum("status", ["pending", "fulfilled", "expired"]).default("pending").notNull(),
    dueDate: timestamp("dueDate"),
    createdByUserId: int("createdByUserId").references(() => users.id, { onDelete: "set null" }),
    resolvedAt: timestamp("resolvedAt"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => ({
    fileIdx: index("idx_creq_file").on(table.creditFileId),
  })
);

export type CreditRequest = typeof creditRequests.$inferSelect;
export type InsertCreditRequest = typeof creditRequests.$inferInsert;

export const creditOffers = mysqlTable(
  "credit_offers",
  {
    id: int("id").autoincrement().primaryKey(),
    creditFileId: int("creditFileId").notNull().references(() => creditFiles.id, { onDelete: "cascade" }),
    bankId: int("bankId").notNull().references(() => users.id, { onDelete: "restrict" }),
    amount: int("amount").notNull(),
    interestRate: varchar("interestRate", { length: 32 }).notNull(),
    apr: varchar("apr", { length: 32 }),
    duration: int("duration").notNull(),
    monthlyPaymentXof: int("monthlyPaymentXof"),
    conditionsText: text("conditionsText"),
    status: mysqlEnum("status", ["pending", "accepted", "rejected", "expired"]).default("pending").notNull(),
    expiresAt: timestamp("expiresAt"),
    acceptedAt: timestamp("acceptedAt"),
    rejectedAt: timestamp("rejectedAt"),
    createdByUserId: int("createdByUserId").references(() => users.id, { onDelete: "set null" }),
    metadata: json("metadata").$type<Record<string, unknown>>(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => ({
    fileIdx: index("idx_coffer_file").on(table.creditFileId),
  })
);

export type CreditOffer = typeof creditOffers.$inferSelect;
export type InsertCreditOffer = typeof creditOffers.$inferInsert;

export const creditDecisions = mysqlTable(
  "credit_decisions",
  {
    id: int("id").autoincrement().primaryKey(),
    creditFileId: int("creditFileId").notNull().references(() => creditFiles.id, { onDelete: "cascade" }),
    decisionType: mysqlEnum("decisionType", ["APPROVED", "REJECTED"]).notNull(),
    reason: text("reason"),
    approvedAmount: int("approvedAmount"),
    decisionDetails: json("decisionDetails").$type<Record<string, unknown>>(),
    decidedByUserId: int("decidedByUserId").references(() => users.id, { onDelete: "set null" }),
    decidedAt: timestamp("decidedAt").defaultNow().notNull(),
    metadataJson: json("metadataJson").$type<Record<string, unknown>>(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => ({
    fileIdx: index("idx_cdecision_file").on(table.creditFileId),
  })
);

export type CreditDecision = typeof creditDecisions.$inferSelect;
export type InsertCreditDecision = typeof creditDecisions.$inferInsert;

// ============================================================
// DÉLIMITATION VILLAGEOISE
// ============================================================

export const villageTerritories = mysqlTable(
  "village_territories",
  {
    id: int("id").autoincrement().primaryKey(),
    code: varchar("code", { length: 32 }).notNull().unique(),
    name: varchar("name", { length: 255 }).notNull(),
    chiefName: varchar("chiefName", { length: 128 }).notNull(),
    chiefPhone: varchar("chiefPhone", { length: 32 }),
    estimatedAreaHa: int("estimatedAreaHa"),
    calculatedAreaHa: varchar("calculatedAreaHa", { length: 32 }),
    calculatedPerimeterKm: varchar("calculatedPerimeterKm", { length: 32 }),
    status: mysqlEnum("status", [
      "draft",
      "collecting",
      "submitted",
      "validated_chief",
      "official",
      "synced",
    ]).default("draft").notNull(),
    siforCode: varchar("siforCode", { length: 64 }),
    chiefSignedAt: timestamp("chiefSignedAt"),
    chiefComments: text("chiefComments"),
    officializedAt: timestamp("officializedAt"),
    syncedAt: timestamp("syncedAt"),
    createdById: int("createdById").notNull().references(() => users.id, { onDelete: "restrict" }),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => ({
    statusIdx: index("idx_vt_status").on(table.status),
    createdByIdx: index("idx_vt_created_by").on(table.createdById),
  })
);

export type VillageTerritory = typeof villageTerritories.$inferSelect;
export type InsertVillageTerritory = typeof villageTerritories.$inferInsert;

export const territoryBoundaryPoints = mysqlTable(
  "territory_boundary_points",
  {
    id: int("id").autoincrement().primaryKey(),
    territoryId: int("territoryId").notNull().references(() => villageTerritories.id, { onDelete: "cascade" }),
    pointNumber: int("pointNumber").notNull(),
    latitude: varchar("latitude", { length: 20 }).notNull(),
    longitude: varchar("longitude", { length: 20 }).notNull(),
    landmark: varchar("landmark", { length: 255 }),
    source: mysqlEnum("source", ["manual", "gpx_import", "csv_import"]).default("manual").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => ({
    territoryIdx: index("idx_tbp_territory").on(table.territoryId),
    orderIdx: index("idx_tbp_order").on(table.territoryId, table.pointNumber),
  })
);

export type TerritoryBoundaryPoint = typeof territoryBoundaryPoints.$inferSelect;
export type InsertTerritoryBoundaryPoint = typeof territoryBoundaryPoints.$inferInsert;

export const territoryDocuments = mysqlTable(
  "territory_documents",
  {
    id: int("id").autoincrement().primaryKey(),
    territoryId: int("territoryId").notNull().references(() => villageTerritories.id, { onDelete: "cascade" }),
    title: varchar("title", { length: 255 }).notNull(),
    documentType: mysqlEnum("documentType", [
      "pv_delimitation",
      "carte_territoire",
      "autorisation_prefectorale",
      "attestation_chef",
      "photo_borne",
      "autre",
    ]).default("autre").notNull(),
    fileUrl: varchar("fileUrl", { length: 512 }),
    fileKey: varchar("fileKey", { length: 256 }),
    mimeType: varchar("mimeType", { length: 64 }),
    fileSize: int("fileSize"),
    step: mysqlEnum("step", [
      "initialisation",
      "collecte",
      "soumission",
      "validation_chef",
      "officialisation",
      "synchronisation",
    ]).default("collecte"),
    uploadedById: int("uploadedById").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => ({
    territoryIdx: index("idx_tdoc_territory").on(table.territoryId),
    stepIdx: index("idx_tdoc_step").on(table.step),
  })
);

export type TerritoryDocument = typeof territoryDocuments.$inferSelect;
export type InsertTerritoryDocument = typeof territoryDocuments.$inferInsert;

export const territoryStatusHistory = mysqlTable(
  "territory_status_history",
  {
    id: int("id").autoincrement().primaryKey(),
    territoryId: int("territoryId").notNull().references(() => villageTerritories.id, { onDelete: "cascade" }),
    previousStatus: varchar("previousStatus", { length: 50 }).notNull(),
    newStatus: varchar("newStatus", { length: 50 }).notNull(),
    changedById: int("changedById").references(() => users.id, { onDelete: "set null" }),
    changedByName: varchar("changedByName", { length: 255 }),
    reason: varchar("reason", { length: 512 }),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => ({
    territoryIdx: index("idx_tsh_territory").on(table.territoryId),
    dateIdx: index("idx_tsh_date").on(table.createdAt),
  })
);

export type TerritoryStatusHistory = typeof territoryStatusHistory.$inferSelect;
export type InsertTerritoryStatusHistory = typeof territoryStatusHistory.$inferInsert;

// ============================================================
// MODULE TITRE FONCIER (Certificat Foncier + Immatriculation)
// ============================================================

export const landTitleApplications = mysqlTable(
  "land_title_applications",
  {
    id: int("id").autoincrement().primaryKey(),
    applicationNumber: varchar("applicationNumber", { length: 50 }).notNull().unique(),
    userId: int("userId").notNull().references(() => users.id, { onDelete: "restrict" }),
    phase: mysqlEnum("phase", ["certificate", "title"]).default("certificate").notNull(),
    status: varchar("status", { length: 30 }).default("cf_draft").notNull(),
    parcelId: int("parcelId").references(() => parcels.id, { onDelete: "set null" }),
    territoryId: int("territoryId").references(() => villageTerritories.id, { onDelete: "set null" }),
    applicantProfile: mysqlEnum("applicantProfile", ["individuel", "groupement", "personne_morale"]).default("individuel").notNull(),
    applicantFullName: varchar("applicantFullName", { length: 255 }).notNull(),
    applicantNationality: varchar("applicantNationality", { length: 100 }),
    applicantIdType: varchar("applicantIdType", { length: 50 }),
    applicantIdNumber: varchar("applicantIdNumber", { length: 100 }),
    landDescription: text("landDescription"),
    landLocality: varchar("landLocality", { length: 255 }),
    landSubPrefecture: varchar("landSubPrefecture", { length: 255 }),
    landDepartment: varchar("landDepartment", { length: 255 }),
    landRegion: varchar("landRegion", { length: 255 }),
    landAreaHectares: varchar("landAreaHectares", { length: 32 }),
    operatorName: varchar("operatorName", { length: 255 }),
    operatorLicense: varchar("operatorLicense", { length: 100 }),
    inquiryCommissioner: varchar("inquiryCommissioner", { length: 255 }),
    publicityStartDate: bigint("publicityStartDate", { mode: "number" }),
    publicityEndDate: bigint("publicityEndDate", { mode: "number" }),
    certificateNumber: varchar("certificateNumber", { length: 100 }),
    certificateSignedAt: bigint("certificateSignedAt", { mode: "number" }),
    certificateExpiryAt: bigint("certificateExpiryAt", { mode: "number" }),
    apfrNumber: varchar("apfrNumber", { length: 100 }),
    titleNumber: varchar("titleNumber", { length: 100 }),
    titleRegisteredAt: bigint("titleRegisteredAt", { mode: "number" }),
    applicationType: mysqlEnum("applicationType", ["immatriculation", "mutation", "morcellement"]).default("immatriculation").notNull(),
    presforEligible: boolean("presforEligible").default(false).notNull(),
    notes: text("notes"),
    createdAt: bigint("createdAt", { mode: "number" }).notNull(),
    updatedAt: bigint("updatedAt", { mode: "number" }).notNull(),
  },
  table => ({
    userIdx: index("idx_lta_user").on(table.userId),
    statusIdx: index("idx_lta_status").on(table.status),
    phaseIdx: index("idx_lta_phase").on(table.phase),
    parcelIdx: index("idx_lta_parcel").on(table.parcelId),
    territoryIdx: index("idx_lta_territory").on(table.territoryId),
  })
);

export type LandTitleApplication = typeof landTitleApplications.$inferSelect;
export type InsertLandTitleApplication = typeof landTitleApplications.$inferInsert;

export const landTitleSteps = mysqlTable(
  "land_title_steps",
  {
    id: int("id").autoincrement().primaryKey(),
    applicationId: int("appId").notNull().references(() => landTitleApplications.id, { onDelete: "cascade" }),
    stepType: varchar("stepType", { length: 50 }).notNull(),
    status: mysqlEnum("status", ["pending", "in_progress", "completed", "skipped"]).default("pending").notNull(),
    startedAt: bigint("startedAt", { mode: "number" }),
    completedAt: bigint("completedAt", { mode: "number" }),
    completedBy: int("completedBy").references(() => users.id, { onDelete: "set null" }),
    notes: text("notes"),
    metadata: json("metadata").$type<Record<string, unknown>>(),
    createdAt: bigint("createdAt", { mode: "number" }).notNull(),
  },
  table => ({
    applicationIdx: index("idx_lts_application").on(table.applicationId),
    stepTypeIdx: index("idx_lts_step_type").on(table.stepType),
  })
);

export type LandTitleStep = typeof landTitleSteps.$inferSelect;
export type InsertLandTitleStep = typeof landTitleSteps.$inferInsert;

export const landTitleDocuments = mysqlTable(
  "land_title_documents",
  {
    id: int("id").autoincrement().primaryKey(),
    applicationId: int("appId").notNull().references(() => landTitleApplications.id, { onDelete: "cascade" }),
    documentType: varchar("documentType", { length: 50 }).notNull(),
    documentCategory: mysqlEnum("documentCategory", [
      "identite",
      "propriete_historique",
      "mandat",
      "formulaire_officiel",
      "technique",
      "complementaire",
    ]).default("complementaire").notNull(),
    label: varchar("label", { length: 255 }).notNull(),
    fileUrl: text("fileUrl").notNull(),
    fileKey: varchar("fileKey", { length: 500 }).notNull(),
    mimeType: varchar("mimeType", { length: 100 }),
    fileSizeBytes: int("fileSizeBytes"),
    sha256: varchar("sha256", { length: 64 }),
    uploadedBy: int("uploadedBy").notNull().references(() => users.id, { onDelete: "restrict" }),
    stepId: int("stepId").references(() => landTitleSteps.id, { onDelete: "set null" }),
    verified: boolean("verified").default(false).notNull(),
    verifiedBy: int("verifiedBy").references(() => users.id, { onDelete: "set null" }),
    verifiedAt: bigint("verifiedAt", { mode: "number" }),
    createdAt: bigint("createdAt", { mode: "number" }).notNull(),
  },
  table => ({
    applicationIdx: index("idx_ltd_application").on(table.applicationId),
    docTypeIdx: index("idx_ltd_doc_type").on(table.documentType),
    categoryIdx: index("idx_ltd_category").on(table.documentCategory),
    uploadedByIdx: index("idx_ltd_uploaded_by").on(table.uploadedBy),
  })
);

export type LandTitleDocument = typeof landTitleDocuments.$inferSelect;
export type InsertLandTitleDocument = typeof landTitleDocuments.$inferInsert;

export const landTitleOppositions = mysqlTable(
  "land_title_oppositions",
  {
    id: int("id").autoincrement().primaryKey(),
    applicationId: int("appId").notNull().references(() => landTitleApplications.id, { onDelete: "cascade" }),
    opponentName: varchar("opponentName", { length: 255 }).notNull(),
    opponentContact: varchar("opponentContact", { length: 255 }),
    reason: text("reason").notNull(),
    status: mysqlEnum("status", ["pending", "confirmed", "dismissed"]).default("pending").notNull(),
    resolutionNotes: text("resolutionNotes"),
    resolvedBy: int("resolvedBy").references(() => users.id, { onDelete: "set null" }),
    resolvedAt: bigint("resolvedAt", { mode: "number" }),
    createdAt: bigint("createdAt", { mode: "number" }).notNull(),
  },
  table => ({
    applicationIdx: index("idx_lto_application").on(table.applicationId),
    statusIdx: index("idx_lto_status").on(table.status),
  })
);

export type LandTitleOpposition = typeof landTitleOppositions.$inferSelect;
export type InsertLandTitleOpposition = typeof landTitleOppositions.$inferInsert;

// ============================================================
// NOTIFICATIONS CITOYEN
// ============================================================

export const citizenNotifications = mysqlTable(
  "citizen_notifications",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
    type: mysqlEnum("type", ["status_change", "document_verified", "document_rejected", "opposition_filed", "general"]).default("general").notNull(),
    title: varchar("title", { length: 255 }).notNull(),
    message: text("message").notNull(),
    relatedModule: mysqlEnum("relatedModule", ["land_title", "credit", "delimitation", "urban_acd", "general"]).default("general").notNull(),
    relatedEntityId: int("relatedEntityId"),
    isRead: boolean("isRead").default(false).notNull(),
    createdAt: bigint("createdAt", { mode: "number" }).notNull(),
  },
  table => ({
    userIdx: index("idx_cn_user").on(table.userId),
    userReadIdx: index("idx_cn_user_read").on(table.userId, table.isRead),
    moduleIdx: index("idx_cn_module").on(table.relatedModule),
  })
);

export type CitizenNotification = typeof citizenNotifications.$inferSelect;
export type InsertCitizenNotification = typeof citizenNotifications.$inferInsert;

// ─── Notification Preferences ───────────────────────────────────────────────
export const notificationPreferences = mysqlTable(
  "notification_preferences",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
    // Contact info
    email: varchar("email", { length: 255 }),
    phone: varchar("phone", { length: 30 }),
    // Channel toggles per event type
    emailStatusChange: boolean("emailStatusChange").default(true).notNull(),
    smsStatusChange: boolean("smsStatusChange").default(false).notNull(),
    emailDocumentUpdate: boolean("emailDocumentUpdate").default(true).notNull(),
    smsDocumentUpdate: boolean("smsDocumentUpdate").default(false).notNull(),
    emailOpposition: boolean("emailOpposition").default(true).notNull(),
    smsOpposition: boolean("smsOpposition").default(true).notNull(),
    emailGeneral: boolean("emailGeneral").default(true).notNull(),
    smsGeneral: boolean("smsGeneral").default(false).notNull(),
    // Timestamps
    updatedAt: bigint("updatedAt", { mode: "number" }).notNull(),
  },
  table => ({
    userIdx: index("idx_np_user").on(table.userId),
    uniqueUser: unique("uniq_np_user").on(table.userId),
  })
);

export type NotificationPreference = typeof notificationPreferences.$inferSelect;
export type InsertNotificationPreference = typeof notificationPreferences.$inferInsert;

// ─── System Configuration (SMTP, SMS Gateway, etc.) ─────────────────────────
export const systemConfig = mysqlTable(
  "system_config",
  {
    id: int("id").autoincrement().primaryKey(),
    configKey: varchar("configKey", { length: 100 }).notNull(),
    configValue: text("configValue").notNull(), // JSON stringified
    updatedAt: bigint("updatedAt", { mode: "number" }).notNull(),
    updatedBy: int("updatedBy").references(() => users.id),
  },
  table => ({
    keyIdx: unique("uniq_config_key").on(table.configKey),
  })
);

export type SystemConfig = typeof systemConfig.$inferSelect;
export type InsertSystemConfig = typeof systemConfig.$inferInsert;

// ============================================================
// MODULE FONCIER URBAIN (ACD — Arrêté de Concession Définitive)
// ============================================================

export const urbanParcelDetails = mysqlTable(
  "urban_parcel_details",
  {
    id: int("id").autoincrement().primaryKey(),
    parcelId: int("parcelId").notNull().references(() => parcels.id, { onDelete: "cascade" }),
    lotNumber: varchar("lotNumber", { length: 50 }),
    ilotNumber: varchar("ilotNumber", { length: 50 }),
    lotissementName: varchar("lotissementName", { length: 255 }),
    lotissementApprovalRef: varchar("lotissementApprovalRef", { length: 100 }),
    lotissementApprovalDate: bigint("lotissementApprovalDate", { mode: "number" }),
    communeName: varchar("communeName", { length: 255 }),
    quartierName: varchar("quartierName", { length: 255 }),
    planCadastralRef: varchar("planCadastralRef", { length: 100 }),
    surfaceM2: int("surfaceM2"),
    usageType: mysqlEnum("usageType", ["habitation", "commerce", "industriel", "mixte", "equipement"]).default("habitation").notNull(),
    createdAt: bigint("createdAt", { mode: "number" }).notNull(),
    updatedAt: bigint("updatedAt", { mode: "number" }).notNull(),
  },
  table => ({
    parcelIdx: unique("uniq_upd_parcel").on(table.parcelId),
  })
);

export type UrbanParcelDetail = typeof urbanParcelDetails.$inferSelect;
export type InsertUrbanParcelDetail = typeof urbanParcelDetails.$inferInsert;

export const urbanAcdApplications = mysqlTable(
  "urban_acd_applications",
  {
    id: int("id").autoincrement().primaryKey(),
    applicationNumber: varchar("applicationNumber", { length: 50 }).notNull().unique(),
    userId: int("userId").notNull().references(() => users.id, { onDelete: "restrict" }),
    parcelId: int("parcelId").references(() => parcels.id, { onDelete: "set null" }),
    phase: mysqlEnum("phase", ["provisional", "development", "definitive"]).default("provisional").notNull(),
    status: varchar("status", { length: 40 }).default("acd_draft").notNull(),
    // Demandeur
    applicantFullName: varchar("applicantFullName", { length: 255 }).notNull(),
    applicantNationality: varchar("applicantNationality", { length: 100 }),
    applicantIdType: varchar("applicantIdType", { length: 50 }),
    applicantIdNumber: varchar("applicantIdNumber", { length: 100 }),
    applicantType: mysqlEnum("applicantType", ["personne_physique", "personne_morale"]).default("personne_physique").notNull(),
    companyName: varchar("companyName", { length: 255 }),
    companyRccm: varchar("companyRccm", { length: 100 }),
    // Terrain
    lotNumber: varchar("lotNumber", { length: 50 }),
    ilotNumber: varchar("ilotNumber", { length: 50 }),
    lotissementName: varchar("lotissementName", { length: 255 }),
    commune: varchar("commune", { length: 255 }),
    quartier: varchar("quartier", { length: 255 }),
    surfaceM2: int("surfaceM2"),
    usagePrevu: mysqlEnum("usagePrevu", ["habitation", "commerce", "industriel", "mixte"]).default("habitation").notNull(),
    // ACP (Concession Provisoire)
    acpNumber: varchar("acpNumber", { length: 100 }),
    acpSignedAt: bigint("acpSignedAt", { mode: "number" }),
    acpExpiryAt: bigint("acpExpiryAt", { mode: "number" }),
    developmentDeadline: bigint("developmentDeadline", { mode: "number" }),
    // ACD (Concession Définitive)
    acdNumber: varchar("acdNumber", { length: 100 }),
    acdSignedAt: bigint("acdSignedAt", { mode: "number" }),
    journalOfficielRef: varchar("journalOfficielRef", { length: 100 }),
    journalOfficielDate: bigint("journalOfficielDate", { mode: "number" }),
    // Meta
    notes: text("notes"),
    createdAt: bigint("createdAt", { mode: "number" }).notNull(),
    updatedAt: bigint("updatedAt", { mode: "number" }).notNull(),
  },
  table => ({
    userIdx: index("idx_uacd_user").on(table.userId),
    statusIdx: index("idx_uacd_status").on(table.status),
    phaseIdx: index("idx_uacd_phase").on(table.phase),
    parcelIdx: index("idx_uacd_parcel").on(table.parcelId),
  })
);

export type UrbanAcdApplication = typeof urbanAcdApplications.$inferSelect;
export type InsertUrbanAcdApplication = typeof urbanAcdApplications.$inferInsert;

export const urbanAcdSteps = mysqlTable(
  "urban_acd_steps",
  {
    id: int("id").autoincrement().primaryKey(),
    applicationId: int("appId").notNull().references(() => urbanAcdApplications.id, { onDelete: "cascade" }),
    stepType: varchar("stepType", { length: 60 }).notNull(),
    status: mysqlEnum("status", ["pending", "in_progress", "completed", "skipped"]).default("pending").notNull(),
    startedAt: bigint("startedAt", { mode: "number" }),
    completedAt: bigint("completedAt", { mode: "number" }),
    completedBy: int("completedBy").references(() => users.id, { onDelete: "set null" }),
    notes: text("notes"),
    metadata: json("metadata").$type<Record<string, unknown>>(),
    createdAt: bigint("createdAt", { mode: "number" }).notNull(),
  },
  table => ({
    applicationIdx: index("idx_uas_application").on(table.applicationId),
    stepTypeIdx: index("idx_uas_step_type").on(table.stepType),
  })
);

export type UrbanAcdStep = typeof urbanAcdSteps.$inferSelect;
export type InsertUrbanAcdStep = typeof urbanAcdSteps.$inferInsert;

export const urbanAcdDocuments = mysqlTable(
  "urban_acd_documents",
  {
    id: int("id").autoincrement().primaryKey(),
    applicationId: int("appId").notNull().references(() => urbanAcdApplications.id, { onDelete: "cascade" }),
    documentType: varchar("documentType", { length: 60 }).notNull(),
    documentCategory: mysqlEnum("documentCategory", [
      "identite",
      "propriete_lot",
      "urbanisme",
      "technique",
      "mise_en_valeur",
      "complementaire",
    ]).default("complementaire").notNull(),
    label: varchar("label", { length: 255 }).notNull(),
    fileUrl: text("fileUrl").notNull(),
    fileKey: varchar("fileKey", { length: 500 }).notNull(),
    mimeType: varchar("mimeType", { length: 100 }),
    fileSizeBytes: int("fileSizeBytes"),
    sha256: varchar("sha256", { length: 64 }),
    uploadedBy: int("uploadedBy").notNull().references(() => users.id, { onDelete: "restrict" }),
    stepId: int("stepId").references(() => urbanAcdSteps.id, { onDelete: "set null" }),
    verified: boolean("verified").default(false).notNull(),
    verifiedBy: int("verifiedBy").references(() => users.id, { onDelete: "set null" }),
    verifiedAt: bigint("verifiedAt", { mode: "number" }),
    createdAt: bigint("createdAt", { mode: "number" }).notNull(),
  },
  table => ({
    applicationIdx: index("idx_uad_application").on(table.applicationId),
    docTypeIdx: index("idx_uad_doc_type").on(table.documentType),
    categoryIdx: index("idx_uad_category").on(table.documentCategory),
  })
);

export type UrbanAcdDocument = typeof urbanAcdDocuments.$inferSelect;
export type InsertUrbanAcdDocument = typeof urbanAcdDocuments.$inferInsert;

export const urbanAcdOppositions = mysqlTable(
  "urban_acd_oppositions",
  {
    id: int("id").autoincrement().primaryKey(),
    applicationId: int("appId").notNull().references(() => urbanAcdApplications.id, { onDelete: "cascade" }),
    opponentName: varchar("opponentName", { length: 255 }).notNull(),
    opponentContact: varchar("opponentContact", { length: 255 }),
    reason: text("reason").notNull(),
    status: mysqlEnum("status", ["pending", "confirmed", "dismissed"]).default("pending").notNull(),
    resolutionNotes: text("resolutionNotes"),
    resolvedBy: int("resolvedBy").references(() => users.id, { onDelete: "set null" }),
    resolvedAt: bigint("resolvedAt", { mode: "number" }),
    createdAt: bigint("createdAt", { mode: "number" }).notNull(),
  },
  table => ({
    applicationIdx: index("idx_uao_application").on(table.applicationId),
    statusIdx: index("idx_uao_status").on(table.status),
  })
);

export type UrbanAcdOpposition = typeof urbanAcdOppositions.$inferSelect;
export type InsertUrbanAcdOpposition = typeof urbanAcdOppositions.$inferInsert;


// ============================================================
// MODULE PAIEMENT EN LIGNE
// ============================================================

export const payments = mysqlTable(
  "payments",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
    dossierType: mysqlEnum("dossierType", ["land_title", "urban_acd", "credit"]).notNull(),
    dossierId: int("dossierId").notNull(),
    amount: int("amount").notNull(), // Montant en FCFA
    currency: varchar("currency", { length: 5 }).default("XOF").notNull(),
    method: mysqlEnum("method", ["orange_money", "mtn_momo", "wave", "card", "bank_transfer"]).notNull(),
    status: mysqlEnum("status", ["pending", "processing", "completed", "failed", "refunded"]).default("pending").notNull(),
    provider: mysqlEnum("provider", ["cinetpay", "tresorpay"]).default("cinetpay").notNull(),
    taxType: mysqlEnum("taxType", ["liasse_afor", "frais_geometre", "taxe_immatriculation", "frais_dossier", "other"]).default("frais_dossier").notNull(),
    reference: varchar("reference", { length: 64 }).notNull().unique(),
    transactionId: varchar("transactionId", { length: 128 }),
    providerTransactionId: varchar("providerTransactionId", { length: 128 }),
    providerMetadata: text("providerMetadata"), // JSON stringified
    description: varchar("description", { length: 255 }),
    phoneNumber: varchar("phoneNumber", { length: 30 }),
    failureReason: text("failureReason"),
    paidAt: bigint("paidAt", { mode: "number" }),
    createdAt: bigint("createdAt", { mode: "number" }).notNull(),
    updatedAt: bigint("updatedAt", { mode: "number" }).notNull(),
  },
  table => ({
    userIdx: index("idx_pay_user").on(table.userId),
    statusIdx: index("idx_pay_status").on(table.status),
    refIdx: index("idx_pay_reference").on(table.reference),
    dossierIdx: index("idx_pay_dossier").on(table.dossierType, table.dossierId),
    providerIdx: index("idx_pay_provider").on(table.provider),
  })
);

export type Payment = typeof payments.$inferSelect;
export type InsertPayment = typeof payments.$inferInsert;

// ============================================================
// MODULE RENDEZ-VOUS (Citoyens ↔ Agents fonciers)
// ============================================================

export const agentAvailabilities = mysqlTable(
  "agent_availabilities",
  {
    id: int("id").autoincrement().primaryKey(),
    agentId: int("agentId").notNull().references(() => users.id, { onDelete: "cascade" }),
    dayOfWeek: int("dayOfWeek").notNull(), // 0=Dimanche, 1=Lundi ... 6=Samedi
    startTime: varchar("startTime", { length: 5 }).notNull(), // "08:00"
    endTime: varchar("endTime", { length: 5 }).notNull(), // "17:00"
    slotDurationMin: int("slotDurationMin").default(30).notNull(), // durée d'un créneau en minutes
    isActive: boolean("isActive").default(true).notNull(),
    createdAt: bigint("createdAt", { mode: "number" }).notNull(),
    updatedAt: bigint("updatedAt", { mode: "number" }).notNull(),
  },
  table => ({
    agentIdx: index("idx_aa_agent").on(table.agentId),
    dayIdx: index("idx_aa_day").on(table.dayOfWeek),
  })
);

export type AgentAvailability = typeof agentAvailabilities.$inferSelect;
export type InsertAgentAvailability = typeof agentAvailabilities.$inferInsert;

export const appointments = mysqlTable(
  "appointments",
  {
    id: int("id").autoincrement().primaryKey(),
    citizenId: int("citizenId").notNull().references(() => users.id, { onDelete: "cascade" }),
    agentId: int("agentId").notNull().references(() => users.id, { onDelete: "cascade" }),
    date: varchar("date", { length: 10 }).notNull(), // "2026-06-15" (ISO date)
    startTime: varchar("startTime", { length: 5 }).notNull(), // "09:00"
    endTime: varchar("endTime", { length: 5 }).notNull(), // "09:30"
    status: mysqlEnum("status", ["pending", "confirmed", "cancelled_citizen", "cancelled_agent", "completed", "no_show"]).default("pending").notNull(),
    motif: varchar("motif", { length: 255 }).notNull(),
    dossierType: mysqlEnum("dossierType", ["land_title", "urban_acd", "credit", "general"]).default("general").notNull(),
    dossierId: int("dossierId"),
    notes: text("notes"),
    cancelReason: text("cancelReason"),
    reminderSentAt: bigint("reminderSentAt", { mode: "number" }),
    createdAt: bigint("createdAt", { mode: "number" }).notNull(),
    updatedAt: bigint("updatedAt", { mode: "number" }).notNull(),
  },
  table => ({
    citizenIdx: index("idx_apt_citizen").on(table.citizenId),
    agentIdx: index("idx_apt_agent").on(table.agentId),
    dateIdx: index("idx_apt_date").on(table.date),
    statusIdx: index("idx_apt_status").on(table.status),
  })
);

export type Appointment = typeof appointments.$inferSelect;
export type InsertAppointment = typeof appointments.$inferInsert;

// ─── Webhook Events (journalisation des événements entrants SIGFU/SIFOR) ─────
export const webhookEvents = mysqlTable("webhook_events", {
  id: int("id").autoincrement().primaryKey(),
  source: mysqlEnum("source", ["sigfu", "sifor"]).notNull(),
  eventType: varchar("event_type", { length: 100 }).notNull(),
  eventId: varchar("event_id", { length: 100 }).notNull(),
  referenceNumber: varchar("reference_number", { length: 100 }).notNull(),
  previousStatus: varchar("previous_status", { length: 50 }),
  newStatus: varchar("new_status", { length: 50 }),
  payload: json("payload"),
  processedAt: timestamp("processed_at"),
  citizenId: int("citizen_id"),
  notificationSent: boolean("notification_sent").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  eventIdIdx: index("webhook_event_id_idx").on(table.eventId),
  sourceRefIdx: index("webhook_source_ref_idx").on(table.source, table.referenceNumber),
}));

// ─── Messagerie Interne ─────────────────────────────────────────────────────

export const conversations = mysqlTable("conversations", {
  id: int("id").autoincrement().primaryKey(),
  citizenId: int("citizen_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  agentId: int("agent_id").references(() => users.id, { onDelete: "set null" }),
  subject: varchar("subject", { length: 255 }).notNull(),
  status: mysqlEnum("status", ["open", "assigned", "closed"]).default("open").notNull(),
  dossierType: mysqlEnum("dossier_type", ["land_title", "urban_acd", "credit", "general"]).default("general"),
  dossierId: int("dossier_id"),
  lastMessageAt: bigint("last_message_at", { mode: "number" }).notNull(),
  createdAt: bigint("created_at", { mode: "number" }).notNull(),
}, (table) => ({
  citizenIdx: index("idx_conv_citizen").on(table.citizenId),
  agentIdx: index("idx_conv_agent").on(table.agentId),
  statusIdx: index("idx_conv_status").on(table.status),
  lastMsgIdx: index("idx_conv_last_msg").on(table.lastMessageAt),
}));

export type Conversation = typeof conversations.$inferSelect;
export type InsertConversation = typeof conversations.$inferInsert;

export const messages = mysqlTable("messages", {
  id: int("id").autoincrement().primaryKey(),
  conversationId: int("conversation_id").notNull().references(() => conversations.id, { onDelete: "cascade" }),
  senderId: int("sender_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  senderRole: mysqlEnum("sender_role", ["citizen", "agent", "system"]).notNull(),
  content: text("content").notNull(),
  attachmentUrl: varchar("attachment_url", { length: 512 }),
  attachmentName: varchar("attachment_name", { length: 255 }),
  readAt: bigint("read_at", { mode: "number" }),
  createdAt: bigint("created_at", { mode: "number" }).notNull(),
}, (table) => ({
  conversationIdx: index("idx_msg_conversation").on(table.conversationId),
  senderIdx: index("idx_msg_sender").on(table.senderId),
  createdIdx: index("idx_msg_created").on(table.createdAt),
}));

export type Message = typeof messages.$inferSelect;
export type InsertMessage = typeof messages.$inferInsert;


// ============================================================
// RBAC — RÔLES ET PERMISSIONS
// ============================================================

export const roles = mysqlTable("roles", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 64 }).notNull().unique(),
  displayName: varchar("display_name", { length: 128 }).notNull(),
  description: text("description"),
  isSystem: boolean("is_system").default(false).notNull(),
  createdAt: bigint("created_at", { mode: "number" }).notNull(),
  updatedAt: bigint("updated_at", { mode: "number" }).notNull(),
});

export type Role = typeof roles.$inferSelect;
export type InsertRole = typeof roles.$inferInsert;

export const permissions = mysqlTable("permissions", {
  id: int("id").autoincrement().primaryKey(),
  module: varchar("module", { length: 64 }).notNull(),
  action: varchar("action", { length: 64 }).notNull(),
  displayName: varchar("display_name", { length: 128 }).notNull(),
  description: text("description"),
}, (table) => ({
  moduleActionUnique: unique("uq_perm_module_action").on(table.module, table.action),
  moduleIdx: index("idx_perm_module").on(table.module),
}));

export type Permission = typeof permissions.$inferSelect;
export type InsertPermission = typeof permissions.$inferInsert;

export const rolePermissions = mysqlTable("role_permissions", {
  id: int("id").autoincrement().primaryKey(),
  roleId: int("role_id").notNull().references(() => roles.id, { onDelete: "cascade" }),
  permissionId: int("permission_id").notNull().references(() => permissions.id, { onDelete: "cascade" }),
}, (table) => ({
  rolePermUnique: unique("uq_role_perm").on(table.roleId, table.permissionId),
  roleIdx: index("idx_rp_role").on(table.roleId),
  permIdx: index("idx_rp_perm").on(table.permissionId),
}));

export type RolePermission = typeof rolePermissions.$inferSelect;
export type InsertRolePermission = typeof rolePermissions.$inferInsert;

export const userRoles = mysqlTable("user_roles", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  roleId: int("role_id").notNull().references(() => roles.id, { onDelete: "cascade" }),
  assignedAt: bigint("assigned_at", { mode: "number" }).notNull(),
  assignedBy: int("assigned_by").references(() => users.id, { onDelete: "set null" }),
}, (table) => ({
  userRoleUnique: unique("uq_user_role").on(table.userId, table.roleId),
  userIdx: index("idx_ur_user").on(table.userId),
  roleIdx: index("idx_ur_role").on(table.roleId),
}));

export type UserRole = typeof userRoles.$inferSelect;
export type InsertUserRole = typeof userRoles.$inferInsert;

export const userInvitations = mysqlTable("user_invitations", {
  id: int("id").autoincrement().primaryKey(),
  email: varchar("email", { length: 320 }).notNull(),
  token: varchar("token", { length: 128 }).notNull().unique(),
  role: mysqlEnum("role", ["citizen", "agent_terrain", "agent_mclu", "geometre_urbain", "conservateur", "notaire", "bank", "admin"]).default("citizen").notNull(),
  invitedBy: int("invited_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  acceptedAt: timestamp("accepted_at"),
  acceptedByUserId: int("accepted_by_user_id").references(() => users.id, { onDelete: "set null" }),
}, (table) => ({
  emailIdx: index("idx_inv_email").on(table.email),
  tokenIdx: index("idx_inv_token").on(table.token),
}));

export type UserInvitation = typeof userInvitations.$inferSelect;
export type InsertUserInvitation = typeof userInvitations.$inferInsert;
