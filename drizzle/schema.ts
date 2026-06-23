import {
  bigint,
  boolean,
  decimal,
  index,
  int,
  json,
  mysqlEnum,
  mysqlTable,
  text,
  tinyint,
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
  role: mysqlEnum("role", ["citizen", "agent_terrain", "agent_mclu", "geometre_urbain", "conservateur", "notaire", "agent_dgi", "autorite_prefectorale", "agent_afor", "comite_villageois", "bank", "admin"]).default("citizen").notNull(),
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
    // Suivi public (mot de passe remis sur l'Ordre de Recettes)
    trackingPassword: varchar("trackingPassword", { length: 20 }),
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
  role: mysqlEnum("role", ["citizen", "agent_terrain", "agent_mclu", "geometre_urbain", "conservateur", "notaire", "agent_dgi", "autorite_prefectorale", "agent_afor", "comite_villageois", "bank", "admin"]).default("citizen").notNull(),
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

// Role-based permissions matrix (SIGFU + AFOR system)
export const rolePermissionsMatrix = mysqlTable("role_permissions_matrix", {
  id: int("id").autoincrement().primaryKey(),
  role: varchar("role", { length: 64 }).notNull(),
  module: varchar("module", { length: 64 }).notNull(), // "demand_identity", "plans_sig", "actes_notaries", "liquidation_taxes", "titres_souverains"
  action: varchar("action", { length: 64 }).notNull(), // "create", "read", "modify", "validate"
  allowed: boolean("allowed").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  roleModuleActionIdx: index("idx_role_module_action").on(table.role, table.module, table.action),
}));

export type RolePermissionMatrix = typeof rolePermissionsMatrix.$inferSelect;
export type InsertRolePermissionMatrix = typeof rolePermissionsMatrix.$inferInsert;

// Notary work baskets (isolation des données notariales)
export const notaryBaskets = mysqlTable("notary_baskets", {
  id: int("id").autoincrement().primaryKey(),
  notaryId: int("notary_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  dossierId: int("dossier_id").notNull(),
  dossierType: varchar("dossier_type", { length: 64 }).notNull(), // "acte_vente", "donation", "hypotheque"
  status: varchar("status", { length: 64 }).default("draft").notNull(), // "draft", "submitted", "validated"
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  notaryIdIdx: index("idx_basket_notary").on(table.notaryId),
  dossierIdIdx: index("idx_basket_dossier").on(table.dossierId),
}));

export type NotaryBasket = typeof notaryBaskets.$inferSelect;
export type InsertNotaryBasket = typeof notaryBaskets.$inferInsert;

// Bank access mandates (isolation des données bancaires)
export const bankMandates = mysqlTable("bank_mandates", {
  id: int("id").autoincrement().primaryKey(),
  bankId: int("bank_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  citizenId: int("citizen_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  accessCode: varchar("access_code", { length: 128 }).notNull().unique(),
  permissions: json("permissions").$type<string[]>().notNull(), // ["read_parcel", "read_title", "read_hypotheque"]
  expiresAt: timestamp("expires_at").notNull(),
  revokedAt: timestamp("revoked_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  bankIdIdx: index("idx_mandate_bank").on(table.bankId),
  citizenIdIdx: index("idx_mandate_citizen").on(table.citizenId),
  accessCodeIdx: index("idx_mandate_code").on(table.accessCode),
  expiresAtIdx: index("idx_mandate_expires").on(table.expiresAt),
}));

export type BankMandate = typeof bankMandates.$inferSelect;
export type InsertBankMandate = typeof bankMandates.$inferInsert;

// Enhanced audit events with reason/motif (uses existing audit_events table + motif column)
// The motif field is stored in the existing audit_events.details JSON column
// No separate table needed - we extend the existing audit trail

// ============================================================
// ERP CONSTRUCTION — RÔLES ET PERMISSIONS
// ============================================================

export const erpRoles = mysqlTable("erp_roles", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 64 }).notNull().unique(),
  displayName: varchar("display_name", { length: 128 }).notNull(),
  description: text("description"),
  isSystem: boolean("is_system").default(false).notNull(),
  createdAt: bigint("created_at", { mode: "number" }).notNull(),
  updatedAt: bigint("updated_at", { mode: "number" }).notNull(),
});

export type ErpRole = typeof erpRoles.$inferSelect;
export type InsertErpRole = typeof erpRoles.$inferInsert;

export const erpPermissions = mysqlTable("erp_permissions", {
  id: int("id").autoincrement().primaryKey(),
  module: varchar("module", { length: 64 }).notNull(),
  action: varchar("action", { length: 64 }).notNull(),
  displayName: varchar("display_name", { length: 128 }).notNull(),
  description: text("description"),
}, (table) => ({
  moduleActionUnique: unique("uq_erp_perm_module_action").on(table.module, table.action),
  moduleIdx: index("idx_erp_perm_module").on(table.module),
}));

export type ErpPermission = typeof erpPermissions.$inferSelect;
export type InsertErpPermission = typeof erpPermissions.$inferInsert;

export const erpRolePermissions = mysqlTable("erp_role_permissions", {
  id: int("id").autoincrement().primaryKey(),
  roleId: int("role_id").notNull().references(() => erpRoles.id, { onDelete: "cascade" }),
  permissionId: int("permission_id").notNull().references(() => erpPermissions.id, { onDelete: "cascade" }),
}, (table) => ({
  rolePermUnique: unique("uq_erp_role_perm").on(table.roleId, table.permissionId),
  roleIdx: index("idx_erp_rp_role").on(table.roleId),
  permIdx: index("idx_erp_rp_perm").on(table.permissionId),
}));

export type ErpRolePermission = typeof erpRolePermissions.$inferSelect;
export type InsertErpRolePermission = typeof erpRolePermissions.$inferInsert;

export const erpUserRoles = mysqlTable("erp_user_roles", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  roleId: int("role_id").notNull().references(() => erpRoles.id, { onDelete: "cascade" }),
  assignedAt: bigint("assigned_at", { mode: "number" }).notNull(),
  assignedBy: int("assigned_by").references(() => users.id, { onDelete: "set null" }),
}, (table) => ({
  userRoleUnique: unique("uq_erp_user_role").on(table.userId, table.roleId),
  userIdx: index("idx_erp_ur_user").on(table.userId),
  roleIdx: index("idx_erp_ur_role").on(table.roleId),
}));

export type ErpUserRole = typeof erpUserRoles.$inferSelect;
export type InsertErpUserRole = typeof erpUserRoles.$inferInsert;

// ============================================================
// ERP CONSTRUCTION — DASHBOARD WIDGETS
// ============================================================

export const erpDashboardWidgets = mysqlTable("erp_dashboard_widgets", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  widgetKey: varchar("widget_key", { length: 64 }).notNull(),
  position: int("position").default(0).notNull(),
  isVisible: boolean("is_visible").default(true).notNull(),
  settingsJson: json("settings_json").$type<Record<string, unknown>>(),
  createdAt: bigint("created_at", { mode: "number" }).notNull(),
  updatedAt: bigint("updated_at", { mode: "number" }).notNull(),
}, (table) => ({
  userWidgetUnique: unique("uq_erp_widget_user_key").on(table.userId, table.widgetKey),
  userIdx: index("idx_erp_widget_user").on(table.userId),
}));

export type ErpDashboardWidget = typeof erpDashboardWidgets.$inferSelect;
export type InsertErpDashboardWidget = typeof erpDashboardWidgets.$inferInsert;

// ============================================================
// ERP CONSTRUCTION — PROJECTS & TASKS
// ============================================================

export const erpProjects = mysqlTable("erp_projects", {
  id: int("id").autoincrement().primaryKey(),
  code: varchar("code", { length: 32 }).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  clientName: varchar("client_name", { length: 255 }),
  location: varchar("location", { length: 500 }),
  startDate: bigint("start_date", { mode: "number" }),
  plannedEndDate: bigint("planned_end_date", { mode: "number" }),
  actualEndDate: bigint("actual_end_date", { mode: "number" }),
  initialBudget: bigint("initial_budget", { mode: "number" }).default(0),
  revisedBudget: bigint("revised_budget", { mode: "number" }).default(0),
  status: varchar("status", { length: 32 }).default("draft").notNull(),
  priority: varchar("priority", { length: 16 }).default("medium").notNull(),
  progressPercentage: int("progress_percentage").default(0).notNull(),
  projectManagerId: int("project_manager_id").references(() => users.id, { onDelete: "set null" }),
  createdBy: int("created_by").references(() => users.id, { onDelete: "set null" }),
  updatedBy: int("updated_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: bigint("created_at", { mode: "number" }).notNull(),
  updatedAt: bigint("updated_at", { mode: "number" }).notNull(),
  deletedAt: bigint("deleted_at", { mode: "number" }),
}, (table) => ({
  codeUnique: unique("uq_erp_project_code").on(table.code),
  statusIdx: index("idx_erp_project_status").on(table.status),
  managerIdx: index("idx_erp_project_manager").on(table.projectManagerId),
  deletedIdx: index("idx_erp_project_deleted").on(table.deletedAt),
}));

export type ErpProject = typeof erpProjects.$inferSelect;
export type InsertErpProject = typeof erpProjects.$inferInsert;

export const erpTasks = mysqlTable("erp_tasks", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("project_id").notNull().references(() => erpProjects.id, { onDelete: "cascade" }),
  parentTaskId: int("parent_task_id"),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  assignedTo: int("assigned_to").references(() => users.id, { onDelete: "set null" }),
  startDate: bigint("start_date", { mode: "number" }),
  dueDate: bigint("due_date", { mode: "number" }),
  completedAt: bigint("completed_at", { mode: "number" }),
  priority: varchar("priority", { length: 16 }).default("medium").notNull(),
  status: varchar("status", { length: 32 }).default("todo").notNull(),
  progressPercentage: int("progress_percentage").default(0).notNull(),
  estimatedHours: int("estimated_hours").default(0),
  actualHours: int("actual_hours").default(0),
  createdBy: int("created_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: bigint("created_at", { mode: "number" }).notNull(),
  updatedAt: bigint("updated_at", { mode: "number" }).notNull(),
  deletedAt: bigint("deleted_at", { mode: "number" }),
}, (table) => ({
  projectIdx: index("idx_erp_task_project").on(table.projectId),
  assignedIdx: index("idx_erp_task_assigned").on(table.assignedTo),
  statusIdx: index("idx_erp_task_status").on(table.status),
  dueDateIdx: index("idx_erp_task_due").on(table.dueDate),
  deletedIdx: index("idx_erp_task_deleted").on(table.deletedAt),
}));

export type ErpTask = typeof erpTasks.$inferSelect;
export type InsertErpTask = typeof erpTasks.$inferInsert;

export const erpTaskDependencies = mysqlTable("erp_task_dependencies", {
  id: int("id").autoincrement().primaryKey(),
  taskId: int("task_id").notNull().references(() => erpTasks.id, { onDelete: "cascade" }),
  dependsOnTaskId: int("depends_on_task_id").notNull().references(() => erpTasks.id, { onDelete: "cascade" }),
  dependencyType: varchar("dependency_type", { length: 32 }).default("finish_to_start").notNull(),
  createdAt: bigint("created_at", { mode: "number" }).notNull(),
}, (table) => ({
  taskDepUnique: unique("uq_erp_task_dep").on(table.taskId, table.dependsOnTaskId),
  taskIdx: index("idx_erp_dep_task").on(table.taskId),
  dependsIdx: index("idx_erp_dep_depends").on(table.dependsOnTaskId),
}));

export type ErpTaskDependency = typeof erpTaskDependencies.$inferSelect;
export type InsertErpTaskDependency = typeof erpTaskDependencies.$inferInsert;

// ============================================================
// ERP CONSTRUCTION — MILESTONES (JALONS)
// ============================================================

export const erpMilestones = mysqlTable("erp_milestones", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("project_id").notNull().references(() => erpProjects.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  plannedDate: bigint("planned_date", { mode: "number" }).notNull(),
  actualDate: bigint("actual_date", { mode: "number" }),
  status: varchar("status", { length: 32 }).default("planned").notNull(),
  impactLevel: varchar("impact_level", { length: 16 }).default("medium").notNull(),
  createdBy: int("created_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: bigint("created_at", { mode: "number" }).notNull(),
  updatedAt: bigint("updated_at", { mode: "number" }).notNull(),
  deletedAt: bigint("deleted_at", { mode: "number" }),
}, (table) => ({
  projectIdx: index("idx_erp_milestone_project").on(table.projectId),
  statusIdx: index("idx_erp_milestone_status").on(table.status),
  plannedDateIdx: index("idx_erp_milestone_planned").on(table.plannedDate),
  deletedIdx: index("idx_erp_milestone_deleted").on(table.deletedAt),
}));

export type ErpMilestone = typeof erpMilestones.$inferSelect;
export type InsertErpMilestone = typeof erpMilestones.$inferInsert;

// ============================================================
// ERP CONSTRUCTION — DOCUMENTS, PERMITS & COMPLIANCE
// ============================================================

export const erpDocuments = mysqlTable("erp_documents", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("project_id").references(() => erpProjects.id, { onDelete: "set null" }),
  title: varchar("title", { length: 255 }).notNull(),
  type: varchar("type", { length: 64 }).default("autre").notNull(),
  status: varchar("status", { length: 32 }).default("pending").notNull(),
  fileUrl: text("file_url"),
  fileKey: varchar("file_key", { length: 512 }),
  fileName: varchar("file_name", { length: 255 }),
  mimeType: varchar("mime_type", { length: 128 }),
  fileSize: int("file_size").default(0),
  issuedAt: bigint("issued_at", { mode: "number" }),
  expiresAt: bigint("expires_at", { mode: "number" }),
  uploadedBy: int("uploaded_by").references(() => users.id, { onDelete: "set null" }),
  validatedBy: int("validated_by").references(() => users.id, { onDelete: "set null" }),
  validatedAt: bigint("validated_at", { mode: "number" }),
  rejectedBy: int("rejected_by").references(() => users.id, { onDelete: "set null" }),
  rejectedAt: bigint("rejected_at", { mode: "number" }),
  rejectionReason: text("rejection_reason"),
  createdAt: bigint("created_at", { mode: "number" }).notNull(),
  updatedAt: bigint("updated_at", { mode: "number" }).notNull(),
  deletedAt: bigint("deleted_at", { mode: "number" }),
}, (table) => ({
  projectIdx: index("idx_erp_doc_project").on(table.projectId),
  typeIdx: index("idx_erp_doc_type").on(table.type),
  statusIdx: index("idx_erp_doc_status").on(table.status),
  expiresIdx: index("idx_erp_doc_expires").on(table.expiresAt),
  deletedIdx: index("idx_erp_doc_deleted").on(table.deletedAt),
}));

export type ErpDocument = typeof erpDocuments.$inferSelect;
export type InsertErpDocument = typeof erpDocuments.$inferInsert;

export const erpDocumentVersions = mysqlTable("erp_document_versions", {
  id: int("id").autoincrement().primaryKey(),
  documentId: int("document_id").notNull().references(() => erpDocuments.id, { onDelete: "cascade" }),
  version: int("version").notNull(),
  fileUrl: text("file_url").notNull(),
  fileKey: varchar("file_key", { length: 512 }).notNull(),
  fileName: varchar("file_name", { length: 255 }).notNull(),
  mimeType: varchar("mime_type", { length: 128 }),
  fileSize: int("file_size").default(0),
  uploadedBy: int("uploaded_by").references(() => users.id, { onDelete: "set null" }),
  comment: text("comment"),
  createdAt: bigint("created_at", { mode: "number" }).notNull(),
}, (table) => ({
  documentIdx: index("idx_erp_docver_document").on(table.documentId),
  versionIdx: index("idx_erp_docver_version").on(table.documentId, table.version),
}));

export type ErpDocumentVersion = typeof erpDocumentVersions.$inferSelect;
export type InsertErpDocumentVersion = typeof erpDocumentVersions.$inferInsert;

export const erpPermits = mysqlTable("erp_permits", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("project_id").references(() => erpProjects.id, { onDelete: "set null" }),
  type: varchar("type", { length: 64 }).notNull(),
  reference: varchar("reference", { length: 128 }),
  description: text("description"),
  issuedBy: varchar("issued_by", { length: 255 }),
  issuedAt: bigint("issued_at", { mode: "number" }),
  expiresAt: bigint("expires_at", { mode: "number" }),
  status: varchar("status", { length: 32 }).default("pending").notNull(),
  validatedBy: int("validated_by").references(() => users.id, { onDelete: "set null" }),
  validatedAt: bigint("validated_at", { mode: "number" }),
  rejectedBy: int("rejected_by").references(() => users.id, { onDelete: "set null" }),
  rejectedAt: bigint("rejected_at", { mode: "number" }),
  rejectionReason: text("rejection_reason"),
  alertDaysBefore: int("alert_days_before").default(30),
  createdBy: int("created_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: bigint("created_at", { mode: "number" }).notNull(),
  updatedAt: bigint("updated_at", { mode: "number" }).notNull(),
  deletedAt: bigint("deleted_at", { mode: "number" }),
}, (table) => ({
  projectIdx: index("idx_erp_permit_project").on(table.projectId),
  typeIdx: index("idx_erp_permit_type").on(table.type),
  statusIdx: index("idx_erp_permit_status").on(table.status),
  expiresIdx: index("idx_erp_permit_expires").on(table.expiresAt),
  deletedIdx: index("idx_erp_permit_deleted").on(table.deletedAt),
}));

export type ErpPermit = typeof erpPermits.$inferSelect;
export type InsertErpPermit = typeof erpPermits.$inferInsert;

export const erpComplianceRequirements = mysqlTable("erp_compliance_requirements", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("project_id").references(() => erpProjects.id, { onDelete: "set null" }),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  category: varchar("category", { length: 64 }).default("general").notNull(),
  priority: varchar("priority", { length: 16 }).default("medium").notNull(),
  dueDate: bigint("due_date", { mode: "number" }),
  status: varchar("status", { length: 32 }).default("pending").notNull(),
  createdBy: int("created_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: bigint("created_at", { mode: "number" }).notNull(),
  updatedAt: bigint("updated_at", { mode: "number" }).notNull(),
  deletedAt: bigint("deleted_at", { mode: "number" }),
}, (table) => ({
  projectIdx: index("idx_erp_compreq_project").on(table.projectId),
  categoryIdx: index("idx_erp_compreq_category").on(table.category),
  statusIdx: index("idx_erp_compreq_status").on(table.status),
  dueDateIdx: index("idx_erp_compreq_due").on(table.dueDate),
  deletedIdx: index("idx_erp_compreq_deleted").on(table.deletedAt),
}));

export type ErpComplianceRequirement = typeof erpComplianceRequirements.$inferSelect;
export type InsertErpComplianceRequirement = typeof erpComplianceRequirements.$inferInsert;

export const erpComplianceChecks = mysqlTable("erp_compliance_checks", {
  id: int("id").autoincrement().primaryKey(),
  requirementId: int("requirement_id").notNull().references(() => erpComplianceRequirements.id, { onDelete: "cascade" }),
  checkedBy: int("checked_by").references(() => users.id, { onDelete: "set null" }),
  status: varchar("status", { length: 32 }).default("pending").notNull(),
  comment: text("comment"),
  evidenceUrl: text("evidence_url"),
  checkedAt: bigint("checked_at", { mode: "number" }),
  createdAt: bigint("created_at", { mode: "number" }).notNull(),
}, (table) => ({
  requirementIdx: index("idx_erp_compcheck_req").on(table.requirementId),
  checkedByIdx: index("idx_erp_compcheck_by").on(table.checkedBy),
  statusIdx: index("idx_erp_compcheck_status").on(table.status),
}));

export type ErpComplianceCheck = typeof erpComplianceChecks.$inferSelect;
export type InsertErpComplianceCheck = typeof erpComplianceChecks.$inferInsert;

// ============================================================
// ERP EQUIPMENT (Sprint 6)
// ============================================================

export const erpEquipment = mysqlTable("erp_equipment", {
  id: int("id").autoincrement().primaryKey(),
  code: varchar("code", { length: 32 }).notNull().unique(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  category: varchar("category", { length: 64 }).notNull(),
  brand: varchar("brand", { length: 128 }),
  model: varchar("model", { length: 128 }),
  serialNumber: varchar("serial_number", { length: 128 }),
  status: varchar("status", { length: 32 }).default("available").notNull(),
  purchaseDate: bigint("purchase_date", { mode: "number" }),
  purchasePrice: bigint("purchase_price", { mode: "number" }),
  currentValue: bigint("current_value", { mode: "number" }),
  location: varchar("location", { length: 255 }),
  imageUrl: text("image_url"),
  projectId: int("project_id").references(() => erpProjects.id, { onDelete: "set null" }),
  nextMaintenanceAt: bigint("next_maintenance_at", { mode: "number" }),
  createdBy: int("created_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: bigint("created_at", { mode: "number" }).notNull(),
  updatedAt: bigint("updated_at", { mode: "number" }).notNull(),
  deletedAt: bigint("deleted_at", { mode: "number" }),
}, (table) => ({
  statusIdx: index("idx_erp_equip_status").on(table.status),
  categoryIdx: index("idx_erp_equip_category").on(table.category),
  projectIdx: index("idx_erp_equip_project").on(table.projectId),
  codeIdx: index("idx_erp_equip_code").on(table.code),
}));

export type ErpEquipment = typeof erpEquipment.$inferSelect;
export type InsertErpEquipment = typeof erpEquipment.$inferInsert;

export const erpEquipmentAllocations = mysqlTable("erp_equipment_allocations", {
  id: int("id").autoincrement().primaryKey(),
  equipmentId: int("equipment_id").notNull().references(() => erpEquipment.id, { onDelete: "cascade" }),
  projectId: int("project_id").notNull().references(() => erpProjects.id, { onDelete: "cascade" }),
  allocatedBy: int("allocated_by").references(() => users.id, { onDelete: "set null" }),
  allocatedAt: bigint("allocated_at", { mode: "number" }).notNull(),
  releasedAt: bigint("released_at", { mode: "number" }),
  releasedBy: int("released_by").references(() => users.id, { onDelete: "set null" }),
  notes: text("notes"),
}, (table) => ({
  equipmentIdx: index("idx_erp_equip_alloc_equip").on(table.equipmentId),
  projectIdx: index("idx_erp_equip_alloc_project").on(table.projectId),
}));

export type ErpEquipmentAllocation = typeof erpEquipmentAllocations.$inferSelect;
export type InsertErpEquipmentAllocation = typeof erpEquipmentAllocations.$inferInsert;

export const erpEquipmentMaintenance = mysqlTable("erp_equipment_maintenance", {
  id: int("id").autoincrement().primaryKey(),
  equipmentId: int("equipment_id").notNull().references(() => erpEquipment.id, { onDelete: "cascade" }),
  type: varchar("type", { length: 64 }).notNull(),
  description: text("description"),
  scheduledAt: bigint("scheduled_at", { mode: "number" }).notNull(),
  completedAt: bigint("completed_at", { mode: "number" }),
  cost: bigint("cost", { mode: "number" }),
  performedBy: varchar("performed_by", { length: 255 }),
  status: varchar("status", { length: 32 }).default("scheduled").notNull(),
  notes: text("notes"),
  createdBy: int("created_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: bigint("created_at", { mode: "number" }).notNull(),
}, (table) => ({
  equipmentIdx: index("idx_erp_equip_maint_equip").on(table.equipmentId),
  statusIdx: index("idx_erp_equip_maint_status").on(table.status),
  scheduledIdx: index("idx_erp_equip_maint_sched").on(table.scheduledAt),
}));

export type ErpEquipmentMaintenance = typeof erpEquipmentMaintenance.$inferSelect;
export type InsertErpEquipmentMaintenance = typeof erpEquipmentMaintenance.$inferInsert;

// ============================================================
// MODULE ERP — SAFETY MANAGEMENT (Sprint 7)
// ============================================================

export const erpSafetyIncidents = mysqlTable("erp_safety_incidents", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("project_id").references(() => erpProjects.id, { onDelete: "set null" }),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  severity: varchar("severity", { length: 32 }).default("medium").notNull(), // low, medium, high, critical
  status: varchar("status", { length: 32 }).default("open").notNull(), // open, under_review, corrective_action, resolved, closed
  location: varchar("location", { length: 255 }),
  incidentDate: bigint("incident_date", { mode: "number" }).notNull(),
  reportedBy: int("reported_by").references(() => users.id, { onDelete: "set null" }),
  assignedTo: int("assigned_to").references(() => users.id, { onDelete: "set null" }),
  resolvedAt: bigint("resolved_at", { mode: "number" }),
  resolvedBy: int("resolved_by").references(() => users.id, { onDelete: "set null" }),
  resolutionNotes: text("resolution_notes"),
  closedAt: bigint("closed_at", { mode: "number" }),
  closedBy: int("closed_by").references(() => users.id, { onDelete: "set null" }),
  closureNotes: text("closure_notes"),
  createdAt: bigint("created_at", { mode: "number" }).notNull(),
  updatedAt: bigint("updated_at", { mode: "number" }).notNull(),
  deletedAt: bigint("deleted_at", { mode: "number" }),
}, (table) => ({
  projectIdx: index("idx_erp_safety_inc_project").on(table.projectId),
  severityIdx: index("idx_erp_safety_inc_severity").on(table.severity),
  statusIdx: index("idx_erp_safety_inc_status").on(table.status),
  dateIdx: index("idx_erp_safety_inc_date").on(table.incidentDate),
}));

export type ErpSafetyIncident = typeof erpSafetyIncidents.$inferSelect;
export type InsertErpSafetyIncident = typeof erpSafetyIncidents.$inferInsert;

export const erpSafetyAudits = mysqlTable("erp_safety_audits", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("project_id").references(() => erpProjects.id, { onDelete: "set null" }),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  auditType: varchar("audit_type", { length: 64 }).default("general").notNull(), // general, fire, electrical, structural, environmental, ppe, autre
  scheduledAt: bigint("scheduled_at", { mode: "number" }),
  completedAt: bigint("completed_at", { mode: "number" }),
  auditorName: varchar("auditor_name", { length: 255 }),
  findings: text("findings"),
  score: int("score"), // 0-100
  status: varchar("status", { length: 32 }).default("planned").notNull(), // planned, in_progress, completed, cancelled
  createdBy: int("created_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: bigint("created_at", { mode: "number" }).notNull(),
  updatedAt: bigint("updated_at", { mode: "number" }).notNull(),
  deletedAt: bigint("deleted_at", { mode: "number" }),
}, (table) => ({
  projectIdx: index("idx_erp_safety_aud_project").on(table.projectId),
  statusIdx: index("idx_erp_safety_aud_status").on(table.status),
  typeIdx: index("idx_erp_safety_aud_type").on(table.auditType),
}));

export type ErpSafetyAudit = typeof erpSafetyAudits.$inferSelect;
export type InsertErpSafetyAudit = typeof erpSafetyAudits.$inferInsert;

export const erpSafetyCorrectiveActions = mysqlTable("erp_safety_corrective_actions", {
  id: int("id").autoincrement().primaryKey(),
  incidentId: int("incident_id").notNull().references(() => erpSafetyIncidents.id, { onDelete: "cascade" }),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  assignedTo: varchar("assigned_to", { length: 255 }),
  priority: varchar("priority", { length: 32 }).default("medium").notNull(), // low, medium, high, critical
  dueDate: bigint("due_date", { mode: "number" }),
  completedAt: bigint("completed_at", { mode: "number" }),
  status: varchar("status", { length: 32 }).default("pending").notNull(), // pending, in_progress, completed, cancelled
  createdBy: int("created_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: bigint("created_at", { mode: "number" }).notNull(),
}, (table) => ({
  incidentIdx: index("idx_erp_safety_ca_incident").on(table.incidentId),
  statusIdx: index("idx_erp_safety_ca_status").on(table.status),
}));

export type ErpSafetyCorrectiveAction = typeof erpSafetyCorrectiveActions.$inferSelect;
export type InsertErpSafetyCorrectiveAction = typeof erpSafetyCorrectiveActions.$inferInsert;

// ============================================================
// Sprint 8 — Vendors, Contractors, Certifications
// ============================================================

export const erpVendors = mysqlTable("erp_vendors", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  category: varchar("category", { length: 64 }).default("general").notNull(), // general, materials, equipment, services, transport, consulting, autre
  status: varchar("status", { length: 32 }).default("pending_approval").notNull(), // active, inactive, suspended, blacklisted, pending_approval
  email: varchar("email", { length: 320 }),
  phone: varchar("phone", { length: 32 }),
  address: text("address"),
  website: varchar("website", { length: 512 }),
  taxId: varchar("tax_id", { length: 64 }),
  rating: int("rating"), // 1-5
  createdBy: int("created_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: bigint("created_at", { mode: "number" }).notNull(),
  updatedAt: bigint("updated_at", { mode: "number" }).notNull(),
  deletedAt: bigint("deleted_at", { mode: "number" }),
}, (table) => ({
  statusIdx: index("idx_erp_vendors_status").on(table.status),
  categoryIdx: index("idx_erp_vendors_category").on(table.category),
  nameIdx: index("idx_erp_vendors_name").on(table.name),
}));

export type ErpVendor = typeof erpVendors.$inferSelect;
export type InsertErpVendor = typeof erpVendors.$inferInsert;

export const erpVendorContacts = mysqlTable("erp_vendor_contacts", {
  id: int("id").autoincrement().primaryKey(),
  vendorId: int("vendor_id").notNull().references(() => erpVendors.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 255 }).notNull(),
  role: varchar("role", { length: 128 }),
  email: varchar("email", { length: 320 }),
  phone: varchar("phone", { length: 32 }),
  isPrimary: boolean("is_primary").default(false).notNull(),
  createdAt: bigint("created_at", { mode: "number" }).notNull(),
}, (table) => ({
  vendorIdx: index("idx_erp_vendor_contacts_vendor").on(table.vendorId),
}));

export type ErpVendorContact = typeof erpVendorContacts.$inferSelect;
export type InsertErpVendorContact = typeof erpVendorContacts.$inferInsert;

export const erpContractors = mysqlTable("erp_contractors", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  specialty: varchar("specialty", { length: 64 }).default("general").notNull(), // general, gros_oeuvre, electricite, plomberie, peinture, menuiserie, carrelage, toiture, vrd, autre
  status: varchar("status", { length: 32 }).default("pending_approval").notNull(), // active, inactive, suspended, blacklisted, pending_approval
  email: varchar("email", { length: 320 }),
  phone: varchar("phone", { length: 32 }),
  address: text("address"),
  licenseNumber: varchar("license_number", { length: 128 }),
  insuranceExpiry: bigint("insurance_expiry", { mode: "number" }),
  rating: int("rating"), // 1-5
  createdBy: int("created_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: bigint("created_at", { mode: "number" }).notNull(),
  updatedAt: bigint("updated_at", { mode: "number" }).notNull(),
  deletedAt: bigint("deleted_at", { mode: "number" }),
}, (table) => ({
  statusIdx: index("idx_erp_contractors_status").on(table.status),
  specialtyIdx: index("idx_erp_contractors_specialty").on(table.specialty),
  nameIdx: index("idx_erp_contractors_name").on(table.name),
}));

export type ErpContractor = typeof erpContractors.$inferSelect;
export type InsertErpContractor = typeof erpContractors.$inferInsert;

export const erpProjectContractors = mysqlTable("erp_project_contractors", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("project_id").notNull().references(() => erpProjects.id, { onDelete: "cascade" }),
  contractorId: int("contractor_id").notNull().references(() => erpContractors.id, { onDelete: "cascade" }),
  role: varchar("role", { length: 128 }),
  startDate: bigint("start_date", { mode: "number" }),
  endDate: bigint("end_date", { mode: "number" }),
  assignedBy: int("assigned_by").references(() => users.id, { onDelete: "set null" }),
  assignedAt: bigint("assigned_at", { mode: "number" }).notNull(),
  releasedAt: bigint("released_at", { mode: "number" }),
}, (table) => ({
  projectIdx: index("idx_erp_proj_contr_project").on(table.projectId),
  contractorIdx: index("idx_erp_proj_contr_contractor").on(table.contractorId),
}));

export type ErpProjectContractor = typeof erpProjectContractors.$inferSelect;
export type InsertErpProjectContractor = typeof erpProjectContractors.$inferInsert;

export const erpContracts = mysqlTable("erp_contracts", {
  id: int("id").autoincrement().primaryKey(),
  contractorId: int("contractor_id").references(() => erpContractors.id, { onDelete: "set null" }),
  projectId: int("project_id").references(() => erpProjects.id, { onDelete: "set null" }),
  title: varchar("title", { length: 255 }).notNull(),
  reference: varchar("reference", { length: 128 }),
  amount: bigint("amount", { mode: "number" }), // in XOF
  startDate: bigint("start_date", { mode: "number" }),
  endDate: bigint("end_date", { mode: "number" }),
  status: varchar("status", { length: 32 }).default("draft").notNull(), // draft, active, completed, terminated, expired
  createdBy: int("created_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: bigint("created_at", { mode: "number" }).notNull(),
  updatedAt: bigint("updated_at", { mode: "number" }).notNull(),
}, (table) => ({
  contractorIdx: index("idx_erp_contracts_contractor").on(table.contractorId),
  projectIdx: index("idx_erp_contracts_project").on(table.projectId),
  statusIdx: index("idx_erp_contracts_status").on(table.status),
}));

export type ErpContract = typeof erpContracts.$inferSelect;
export type InsertErpContract = typeof erpContracts.$inferInsert;

export const erpCertifications = mysqlTable("erp_certifications", {
  id: int("id").autoincrement().primaryKey(),
  entityType: varchar("entity_type", { length: 32 }).notNull(), // vendor, contractor, equipment, user
  entityId: int("entity_id").notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  certNumber: varchar("cert_number", { length: 128 }),
  issuedBy: varchar("issued_by", { length: 255 }),
  issuedAt: bigint("issued_at", { mode: "number" }),
  expiresAt: bigint("expires_at", { mode: "number" }),
  renewedAt: bigint("renewed_at", { mode: "number" }),
  status: varchar("status", { length: 32 }).default("active").notNull(), // active, expired, revoked, pending_renewal
  alertDaysBefore: int("alert_days_before").default(30),
  documentUrl: varchar("document_url", { length: 512 }),
  createdBy: int("created_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: bigint("created_at", { mode: "number" }).notNull(),
  updatedAt: bigint("updated_at", { mode: "number" }).notNull(),
  deletedAt: bigint("deleted_at", { mode: "number" }),
}, (table) => ({
  entityIdx: index("idx_erp_certs_entity").on(table.entityType, table.entityId),
  statusIdx: index("idx_erp_certs_status").on(table.status),
  expiresIdx: index("idx_erp_certs_expires").on(table.expiresAt),
}));

export type ErpCertification = typeof erpCertifications.$inferSelect;
export type InsertErpCertification = typeof erpCertifications.$inferInsert;

// ============================================================
// Sprint 9 — Performance Rating
// ============================================================

export const erpPerformanceRatings = mysqlTable("erp_performance_ratings", {
  id: int("id").autoincrement().primaryKey(),
  rateableType: varchar("rateable_type", { length: 32 }).notNull(), // vendor, contractor
  rateableId: int("rateable_id").notNull(),
  projectId: int("project_id").references(() => erpProjects.id, { onDelete: "set null" }),
  qualityScore: int("quality_score").notNull(), // 1-5
  delayScore: int("delay_score").notNull(), // 1-5
  costScore: int("cost_score").notNull(), // 1-5
  safetyScore: int("safety_score").notNull(), // 1-5
  complianceScore: int("compliance_score").notNull(), // 1-5
  communicationScore: int("communication_score").notNull(), // 1-5
  overallScore: int("overall_score").notNull(), // calculated average * 100 (for precision)
  comment: text("comment"),
  ratedBy: int("rated_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: bigint("created_at", { mode: "number" }).notNull(),
  updatedAt: bigint("updated_at", { mode: "number" }).notNull(),
}, (table) => ({
  rateableIdx: index("idx_erp_perf_ratings_rateable").on(table.rateableType, table.rateableId),
  projectIdx: index("idx_erp_perf_ratings_project").on(table.projectId),
  overallIdx: index("idx_erp_perf_ratings_overall").on(table.overallScore),
}));

export type ErpPerformanceRating = typeof erpPerformanceRatings.$inferSelect;
export type InsertErpPerformanceRating = typeof erpPerformanceRatings.$inferInsert;

// ============================================================
// ERP INVOICES & PAYMENTS (Sprint 10)
// ============================================================

export const erpInvoices = mysqlTable("erp_invoices", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("project_id").references(() => erpProjects.id, { onDelete: "set null" }),
  vendorId: int("vendor_id").references(() => erpVendors.id, { onDelete: "set null" }),
  contractorId: int("contractor_id").references(() => erpContractors.id, { onDelete: "set null" }),
  invoiceNumber: varchar("invoice_number", { length: 64 }).notNull(),
  reference: varchar("reference", { length: 128 }),
  type: varchar("type", { length: 32 }).notNull().default("standard"), // standard, credit_note, proforma
  status: varchar("status", { length: 32 }).notNull().default("draft"), // draft, submitted, approved, partially_paid, paid, overdue, rejected, cancelled
  issueDate: bigint("issue_date", { mode: "number" }).notNull(),
  dueDate: bigint("due_date", { mode: "number" }).notNull(),
  subtotal: int("subtotal").notNull().default(0), // montant HT en centimes XOF
  taxRate: int("tax_rate").notNull().default(1800), // taux TVA en centièmes (1800 = 18%)
  taxAmount: int("tax_amount").notNull().default(0), // montant TVA en centimes
  totalAmount: int("total_amount").notNull().default(0), // montant TTC en centimes
  paidAmount: int("paid_amount").notNull().default(0), // montant payé en centimes
  currency: varchar("currency", { length: 3 }).notNull().default("XOF"),
  notes: text("notes"),
  attachmentUrl: text("attachment_url"),
  attachmentKey: varchar("attachment_key", { length: 512 }),
  submittedAt: bigint("submitted_at", { mode: "number" }),
  submittedBy: int("submitted_by").references(() => users.id, { onDelete: "set null" }),
  approvedAt: bigint("approved_at", { mode: "number" }),
  approvedBy: int("approved_by").references(() => users.id, { onDelete: "set null" }),
  rejectedAt: bigint("rejected_at", { mode: "number" }),
  rejectedBy: int("rejected_by").references(() => users.id, { onDelete: "set null" }),
  rejectionReason: text("rejection_reason"),
  createdBy: int("created_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: bigint("created_at", { mode: "number" }).notNull(),
  updatedAt: bigint("updated_at", { mode: "number" }).notNull(),
  deletedAt: bigint("deleted_at", { mode: "number" }),
}, (table) => ({
  projectIdx: index("idx_erp_invoices_project").on(table.projectId),
  vendorIdx: index("idx_erp_invoices_vendor").on(table.vendorId),
  contractorIdx: index("idx_erp_invoices_contractor").on(table.contractorId),
  statusIdx: index("idx_erp_invoices_status").on(table.status),
  dueDateIdx: index("idx_erp_invoices_due_date").on(table.dueDate),
  invoiceNumberIdx: index("idx_erp_invoices_number").on(table.invoiceNumber),
}));

export type ErpInvoice = typeof erpInvoices.$inferSelect;
export type InsertErpInvoice = typeof erpInvoices.$inferInsert;

export const erpInvoiceLines = mysqlTable("erp_invoice_lines", {
  id: int("id").autoincrement().primaryKey(),
  invoiceId: int("invoice_id").notNull().references(() => erpInvoices.id, { onDelete: "cascade" }),
  description: varchar("description", { length: 512 }).notNull(),
  quantity: int("quantity").notNull().default(1), // quantité * 100 pour décimales
  unitPrice: int("unit_price").notNull(), // prix unitaire en centimes XOF
  amount: int("amount").notNull(), // quantity/100 * unitPrice
  taxRate: int("tax_rate").notNull().default(1800), // taux TVA en centièmes
  taxAmount: int("tax_amount").notNull().default(0),
  totalAmount: int("total_amount").notNull(), // amount + taxAmount
  sortOrder: int("sort_order").notNull().default(0),
  createdAt: bigint("created_at", { mode: "number" }).notNull(),
}, (table) => ({
  invoiceIdx: index("idx_erp_invoice_lines_invoice").on(table.invoiceId),
}));

export type ErpInvoiceLine = typeof erpInvoiceLines.$inferSelect;
export type InsertErpInvoiceLine = typeof erpInvoiceLines.$inferInsert;

export const erpPayments = mysqlTable("erp_payments", {
  id: int("id").autoincrement().primaryKey(),
  invoiceId: int("invoice_id").notNull().references(() => erpInvoices.id, { onDelete: "cascade" }),
  amount: int("amount").notNull(), // montant en centimes XOF
  paymentDate: bigint("payment_date", { mode: "number" }).notNull(),
  paymentMethod: varchar("payment_method", { length: 32 }).notNull().default("virement"), // virement, cheque, especes, mobile_money, carte
  reference: varchar("reference", { length: 128 }),
  notes: text("notes"),
  createdBy: int("created_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: bigint("created_at", { mode: "number" }).notNull(),
}, (table) => ({
  invoiceIdx: index("idx_erp_payments_invoice").on(table.invoiceId),
  dateIdx: index("idx_erp_payments_date").on(table.paymentDate),
}));

export type ErpPayment = typeof erpPayments.$inferSelect;
export type InsertErpPayment = typeof erpPayments.$inferInsert;

// ============================================================
// ERP INVENTORY — Sprint 11
// ============================================================

export const erpStockLocations = mysqlTable("erp_stock_locations", {
  id: int("id").primaryKey().autoincrement(),
  name: varchar("name", { length: 128 }).notNull(),
  description: text("description"),
  address: varchar("address", { length: 255 }),
  projectId: int("project_id"),
  createdBy: int("created_by").notNull(),
  createdAt: bigint("created_at", { mode: "number" }).notNull(),
  updatedAt: bigint("updated_at", { mode: "number" }).notNull(),
  deletedAt: bigint("deleted_at", { mode: "number" }),
}, (table) => ({
  projectIdx: index("idx_erp_stock_locations_project").on(table.projectId),
}));

export type ErpStockLocation = typeof erpStockLocations.$inferSelect;
export type InsertErpStockLocation = typeof erpStockLocations.$inferInsert;

export const erpInventoryItems = mysqlTable("erp_inventory_items", {
  id: int("id").primaryKey().autoincrement(),
  sku: varchar("sku", { length: 64 }).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  category: varchar("category", { length: 64 }).notNull(),
  unit: varchar("unit", { length: 32 }).notNull(),
  minStock: int("min_stock").notNull().default(0),
  maxStock: int("max_stock").notNull().default(0),
  currentStock: int("current_stock").notNull().default(0),
  unitPrice: int("unit_price").notNull().default(0),
  locationId: int("location_id"),
  projectId: int("project_id"),
  imageUrl: text("image_url"),
  createdBy: int("created_by").notNull(),
  createdAt: bigint("created_at", { mode: "number" }).notNull(),
  updatedAt: bigint("updated_at", { mode: "number" }).notNull(),
  deletedAt: bigint("deleted_at", { mode: "number" }),
}, (table) => ({
  skuIdx: index("idx_erp_inventory_items_sku").on(table.sku),
  categoryIdx: index("idx_erp_inventory_items_category").on(table.category),
  locationIdx: index("idx_erp_inventory_items_location").on(table.locationId),
  projectIdx: index("idx_erp_inventory_items_project").on(table.projectId),
}));

export type ErpInventoryItem = typeof erpInventoryItems.$inferSelect;
export type InsertErpInventoryItem = typeof erpInventoryItems.$inferInsert;

export const erpStockMovements = mysqlTable("erp_stock_movements", {
  id: int("id").primaryKey().autoincrement(),
  itemId: int("item_id").notNull(),
  locationId: int("location_id"),
  projectId: int("project_id"),
  type: varchar("type", { length: 32 }).notNull(), // IN, OUT, TRANSFER, ADJUSTMENT, WASTAGE, RETURN
  quantity: int("quantity").notNull(),
  previousStock: int("previous_stock").notNull(),
  newStock: int("new_stock").notNull(),
  reference: varchar("reference", { length: 128 }),
  notes: text("notes"),
  performedBy: int("performed_by").notNull(),
  createdAt: bigint("created_at", { mode: "number" }).notNull(),
}, (table) => ({
  itemIdx: index("idx_erp_stock_movements_item").on(table.itemId),
  typeIdx: index("idx_erp_stock_movements_type").on(table.type),
  dateIdx: index("idx_erp_stock_movements_date").on(table.createdAt),
}));

export type ErpStockMovement = typeof erpStockMovements.$inferSelect;
export type InsertErpStockMovement = typeof erpStockMovements.$inferInsert;

export const erpMaterialRequests = mysqlTable("erp_material_requests", {
  id: int("id").primaryKey().autoincrement(),
  projectId: int("project_id"),
  requestNumber: varchar("request_number", { length: 32 }).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  status: varchar("status", { length: 32 }).notNull().default("draft"), // draft, submitted, approved, rejected, partially_fulfilled, fulfilled, cancelled
  priority: varchar("priority", { length: 16 }).notNull().default("medium"), // low, medium, high, urgent
  requestedBy: int("requested_by").notNull(),
  approvedBy: int("approved_by"),
  approvedAt: bigint("approved_at", { mode: "number" }),
  rejectedBy: int("rejected_by"),
  rejectedAt: bigint("rejected_at", { mode: "number" }),
  rejectionReason: text("rejection_reason"),
  createdAt: bigint("created_at", { mode: "number" }).notNull(),
  updatedAt: bigint("updated_at", { mode: "number" }).notNull(),
  deletedAt: bigint("deleted_at", { mode: "number" }),
}, (table) => ({
  statusIdx: index("idx_erp_material_requests_status").on(table.status),
  projectIdx: index("idx_erp_material_requests_project").on(table.projectId),
  requestedByIdx: index("idx_erp_material_requests_requested_by").on(table.requestedBy),
}));

export type ErpMaterialRequest = typeof erpMaterialRequests.$inferSelect;
export type InsertErpMaterialRequest = typeof erpMaterialRequests.$inferInsert;

export const erpMaterialRequestLines = mysqlTable("erp_material_request_lines", {
  id: int("id").primaryKey().autoincrement(),
  requestId: int("request_id").notNull(),
  itemId: int("item_id").notNull(),
  quantityRequested: int("quantity_requested").notNull(),
  quantityFulfilled: int("quantity_fulfilled").notNull().default(0),
  notes: text("notes"),
  createdAt: bigint("created_at", { mode: "number" }).notNull(),
}, (table) => ({
  requestIdx: index("idx_erp_material_request_lines_request").on(table.requestId),
  itemIdx: index("idx_erp_material_request_lines_item").on(table.itemId),
}));

export type ErpMaterialRequestLine = typeof erpMaterialRequestLines.$inferSelect;
export type InsertErpMaterialRequestLine = typeof erpMaterialRequestLines.$inferInsert;

// ============================================================
// ERP SUPPLIER INTEGRATION & WASTAGE — Sprint 12
// ============================================================

export const erpSupplierItemPrices = mysqlTable("erp_supplier_item_prices", {
  id: int("id").primaryKey().autoincrement(),
  vendorId: int("vendor_id").notNull(),
  itemId: int("item_id").notNull(),
  unitPrice: int("unit_price").notNull(), // in XOF centimes
  currency: varchar("currency", { length: 8 }).notNull().default("XOF"),
  leadTimeDays: int("lead_time_days").notNull().default(0),
  minOrderQty: int("min_order_qty").notNull().default(1),
  isPreferred: boolean("is_preferred").notNull().default(false),
  validFrom: bigint("valid_from", { mode: "number" }),
  validTo: bigint("valid_to", { mode: "number" }),
  notes: text("notes"),
  createdBy: int("created_by").notNull(),
  createdAt: bigint("created_at", { mode: "number" }).notNull(),
  updatedAt: bigint("updated_at", { mode: "number" }).notNull(),
}, (table) => ({
  vendorIdx: index("idx_erp_supplier_prices_vendor").on(table.vendorId),
  itemIdx: index("idx_erp_supplier_prices_item").on(table.itemId),
  preferredIdx: index("idx_erp_supplier_prices_preferred").on(table.isPreferred),
}));

export type ErpSupplierItemPrice = typeof erpSupplierItemPrices.$inferSelect;
export type InsertErpSupplierItemPrice = typeof erpSupplierItemPrices.$inferInsert;

export const erpSupplierIntegrations = mysqlTable("erp_supplier_integrations", {
  id: int("id").primaryKey().autoincrement(),
  vendorId: int("vendor_id").notNull(),
  integrationType: varchar("integration_type", { length: 32 }).notNull(), // api, edi, email, manual
  apiUrl: text("api_url"),
  apiKey: text("api_key"),
  lastSyncAt: bigint("last_sync_at", { mode: "number" }),
  syncStatus: varchar("sync_status", { length: 32 }).notNull().default("never"), // never, success, failed, in_progress
  syncFrequency: varchar("sync_frequency", { length: 32 }).notNull().default("manual"), // manual, daily, weekly, monthly
  isActive: boolean("is_active").notNull().default(true),
  createdBy: int("created_by").notNull(),
  createdAt: bigint("created_at", { mode: "number" }).notNull(),
  updatedAt: bigint("updated_at", { mode: "number" }).notNull(),
}, (table) => ({
  vendorIdx: index("idx_erp_supplier_integrations_vendor").on(table.vendorId),
  statusIdx: index("idx_erp_supplier_integrations_status").on(table.syncStatus),
}));

export type ErpSupplierIntegration = typeof erpSupplierIntegrations.$inferSelect;
export type InsertErpSupplierIntegration = typeof erpSupplierIntegrations.$inferInsert;

export const erpWastageRecords = mysqlTable("erp_wastage_records", {
  id: int("id").primaryKey().autoincrement(),
  projectId: int("project_id"),
  itemId: int("item_id").notNull(),
  quantity: int("quantity").notNull(),
  unitCost: int("unit_cost").notNull(), // XOF
  totalCost: int("total_cost").notNull(), // quantity * unitCost
  wastagePercentage: int("wastage_percentage").notNull().default(0), // x100 for precision (e.g. 1250 = 12.50%)
  cause: varchar("cause", { length: 64 }).notNull(), // breakage, theft, bad_estimate, order_error, poor_storage, supplier_defect, other
  description: text("description"),
  correctiveAction: text("corrective_action"),
  recordedBy: int("recorded_by").notNull(),
  recordedAt: bigint("recorded_at", { mode: "number" }).notNull(),
  createdAt: bigint("created_at", { mode: "number" }).notNull(),
  updatedAt: bigint("updated_at", { mode: "number" }).notNull(),
  deletedAt: bigint("deleted_at", { mode: "number" }),
}, (table) => ({
  projectIdx: index("idx_erp_wastage_project").on(table.projectId),
  itemIdx: index("idx_erp_wastage_item").on(table.itemId),
  causeIdx: index("idx_erp_wastage_cause").on(table.cause),
  dateIdx: index("idx_erp_wastage_date").on(table.recordedAt),
}));

export type ErpWastageRecord = typeof erpWastageRecords.$inferSelect;
export type InsertErpWastageRecord = typeof erpWastageRecords.$inferInsert;


// ============================================================
// Sprint 13 — Finance, Budget, Cash Flow, Profitability
// ============================================================

export const erpBudgets = mysqlTable("erp_budgets", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("project_id").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  status: mysqlEnum("status", ["draft", "submitted", "approved", "rejected", "revised"]).default("draft").notNull(),
  totalInitial: bigint("total_initial", { mode: "number" }).default(0).notNull(),
  totalRevised: bigint("total_revised", { mode: "number" }).default(0).notNull(),
  totalEngaged: bigint("total_engaged", { mode: "number" }).default(0).notNull(),
  totalPaid: bigint("total_paid", { mode: "number" }).default(0).notNull(),
  approvedBy: int("approved_by"),
  approvedAt: bigint("approved_at", { mode: "number" }),
  createdBy: int("created_by").notNull(),
  createdAt: bigint("created_at", { mode: "number" }).notNull(),
  updatedAt: bigint("updated_at", { mode: "number" }).notNull(),
}, (table) => ({
  projectIdx: index("idx_erp_budget_project").on(table.projectId),
  statusIdx: index("idx_erp_budget_status").on(table.status),
}));

export type ErpBudget = typeof erpBudgets.$inferSelect;
export type InsertErpBudget = typeof erpBudgets.$inferInsert;

export const erpBudgetLines = mysqlTable("erp_budget_lines", {
  id: int("id").autoincrement().primaryKey(),
  budgetId: int("budget_id").notNull(),
  category: mysqlEnum("category", [
    "labour", "materials", "equipment", "subcontracting",
    "permits", "transport", "other",
  ]).notNull(),
  description: varchar("description", { length: 500 }),
  initialAmount: bigint("initial_amount", { mode: "number" }).default(0).notNull(),
  revisedAmount: bigint("revised_amount", { mode: "number" }).default(0).notNull(),
  engagedAmount: bigint("engaged_amount", { mode: "number" }).default(0).notNull(),
  paidAmount: bigint("paid_amount", { mode: "number" }).default(0).notNull(),
  createdAt: bigint("created_at", { mode: "number" }).notNull(),
  updatedAt: bigint("updated_at", { mode: "number" }).notNull(),
}, (table) => ({
  budgetIdx: index("idx_erp_budgetline_budget").on(table.budgetId),
  categoryIdx: index("idx_erp_budgetline_category").on(table.category),
}));

export type ErpBudgetLine = typeof erpBudgetLines.$inferSelect;
export type InsertErpBudgetLine = typeof erpBudgetLines.$inferInsert;

export const erpCashFlows = mysqlTable("erp_cash_flows", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("project_id"),
  type: mysqlEnum("type", ["inflow", "outflow"]).notNull(),
  category: mysqlEnum("category", [
    "labour", "materials", "equipment", "subcontracting",
    "permits", "transport", "client_payment", "advance", "retention", "other",
  ]).notNull(),
  amount: bigint("amount", { mode: "number" }).notNull(),
  description: varchar("description", { length: 500 }),
  flowDate: bigint("flow_date", { mode: "number" }).notNull(),
  dueDate: bigint("due_date", { mode: "number" }),
  isPaid: boolean("is_paid").default(false).notNull(),
  paidAt: bigint("paid_at", { mode: "number" }),
  createdBy: int("created_by").notNull(),
  createdAt: bigint("created_at", { mode: "number" }).notNull(),
  updatedAt: bigint("updated_at", { mode: "number" }).notNull(),
}, (table) => ({
  projectIdx: index("idx_erp_cashflow_project").on(table.projectId),
  typeIdx: index("idx_erp_cashflow_type").on(table.type),
  flowDateIdx: index("idx_erp_cashflow_date").on(table.flowDate),
  dueDateIdx: index("idx_erp_cashflow_due").on(table.dueDate),
  isPaidIdx: index("idx_erp_cashflow_paid").on(table.isPaid),
}));

export type ErpCashFlow = typeof erpCashFlows.$inferSelect;
export type InsertErpCashFlow = typeof erpCashFlows.$inferInsert;

export const erpProfitabilitySnapshots = mysqlTable("erp_profitability_snapshots", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("project_id").notNull(),
  revenue: bigint("revenue", { mode: "number" }).default(0).notNull(),
  directCosts: bigint("direct_costs", { mode: "number" }).default(0).notNull(),
  indirectCosts: bigint("indirect_costs", { mode: "number" }).default(0).notNull(),
  grossMargin: bigint("gross_margin", { mode: "number" }).default(0).notNull(),
  netMargin: bigint("net_margin", { mode: "number" }).default(0).notNull(),
  grossMarginPercent: int("gross_margin_percent").default(0).notNull(),
  netMarginPercent: int("net_margin_percent").default(0).notNull(),
  snapshotDate: bigint("snapshot_date", { mode: "number" }).notNull(),
  createdAt: bigint("created_at", { mode: "number" }).notNull(),
}, (table) => ({
  projectIdx: index("idx_erp_profit_project").on(table.projectId),
  dateIdx: index("idx_erp_profit_date").on(table.snapshotDate),
}));

export type ErpProfitabilitySnapshot = typeof erpProfitabilitySnapshots.$inferSelect;
export type InsertErpProfitabilitySnapshot = typeof erpProfitabilitySnapshots.$inferInsert;


// ============================================================
// ERP OVERRUN ALERTS — Sprint 14
// ============================================================

export const erpOverrunAlerts = mysqlTable("erp_overrun_alerts", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("project_id"),
  alertType: varchar("alert_type", { length: 64 }).notNull(),
  // Types: project_late, task_late, milestone_overdue, budget_75, budget_90, budget_100, budget_overrun, invoice_overdue, document_expired, certification_expired, stock_critical, maintenance_due, safety_critical
  priority: mysqlEnum("priority", ["low", "medium", "high", "critical"]).notNull().default("medium"),
  title: varchar("title", { length: 255 }).notNull(),
  message: text("message"),
  threshold: int("threshold"), // e.g. 7500 for 75%
  currentValue: int("current_value"), // e.g. 8200 for 82%
  isAcknowledged: boolean("is_acknowledged").default(false).notNull(),
  acknowledgedBy: int("acknowledged_by").references(() => users.id, { onDelete: "set null" }),
  acknowledgedAt: bigint("acknowledged_at", { mode: "number" }),
  relatedEntityType: varchar("related_entity_type", { length: 64 }), // budget, invoice, project, task, document, equipment, etc.
  relatedEntityId: int("related_entity_id"),
  module: varchar("module", { length: 64 }).default("finance"), // finance, projects, inventory, safety, compliance, equipment
  createdAt: bigint("created_at", { mode: "number" }).notNull(),
}, (table) => ({
  projectIdx: index("idx_erp_overrun_project").on(table.projectId),
  typeIdx: index("idx_erp_overrun_type").on(table.alertType),
  priorityIdx: index("idx_erp_overrun_priority").on(table.priority),
  ackIdx: index("idx_erp_overrun_ack").on(table.isAcknowledged),
}));
export type ErpOverrunAlert = typeof erpOverrunAlerts.$inferSelect;
export type InsertErpOverrunAlert = typeof erpOverrunAlerts.$inferInsert;

// ============================================================
// ERP NOTIFICATIONS — Sprint 14
// ============================================================

export const erpNotifications = mysqlTable("erp_notifications", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  title: varchar("title", { length: 255 }).notNull(),
  message: text("message"),
  module: varchar("module", { length: 64 }).default("general"), // finance, projects, inventory, safety, compliance, equipment, general
  priority: mysqlEnum("priority", ["low", "medium", "high", "critical"]).notNull().default("medium"),
  isRead: boolean("is_read").default(false).notNull(),
  readAt: bigint("read_at", { mode: "number" }),
  linkUrl: varchar("link_url", { length: 512 }),
  alertId: int("alert_id"), // optional link to overrun alert
  createdAt: bigint("created_at", { mode: "number" }).notNull(),
}, (table) => ({
  userIdx: index("idx_erp_notif_user").on(table.userId),
  readIdx: index("idx_erp_notif_read").on(table.isRead),
  moduleIdx: index("idx_erp_notif_module").on(table.module),
  createdIdx: index("idx_erp_notif_created").on(table.createdAt),
}));
export type ErpNotification = typeof erpNotifications.$inferSelect;
export type InsertErpNotification = typeof erpNotifications.$inferInsert;

// ============================================================
// Sprint 15 — Profile Details
// ============================================================

export const erpUserProfiles = mysqlTable("erp_user_profiles", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  phone: varchar("phone", { length: 32 }),
  company: varchar("company", { length: 255 }),
  position: varchar("position", { length: 128 }),
  avatarUrl: varchar("avatar_url", { length: 512 }),
  preferences: json("preferences").$type<{
    language: string;
    timezone: string;
    dateFormat: string;
    currency: string;
    emailNotifications: boolean;
    pushNotifications: boolean;
    theme: string;
  }>(),
  securitySettings: json("security_settings").$type<{
    twoFactorEnabled: boolean;
    sessionTimeout: number;
    loginAlerts: boolean;
    lastPasswordChange: number | null;
  }>(),
  createdAt: bigint("created_at", { mode: "number" }).notNull(),
  updatedAt: bigint("updated_at", { mode: "number" }).notNull(),
}, (table) => [
  { name: "idx_erp_profile_user", columns: [table.userId] },
]);


// ============================================================
// MODULE ACHATS, DÉPENSES & PRÉ-COMPTABILITÉ
// ============================================================

// --- Paramétrage comptable ---

export const erpAccountingAccounts = mysqlTable("erp_accounting_accounts", {
  id: int("id").autoincrement().primaryKey(),
  accountCode: varchar("account_code", { length: 16 }).notNull().unique(),
  accountName: varchar("account_name", { length: 255 }).notNull(),
  accountType: varchar("account_type", { length: 32 }).notNull(), // asset, liability, equity, revenue, expense, tax, cash, supplier, customer
  parentId: int("parent_id"),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: bigint("created_at", { mode: "number" }).notNull(),
  updatedAt: bigint("updated_at", { mode: "number" }).notNull(),
}, (table) => ({
  codeIdx: index("idx_erp_acct_code").on(table.accountCode),
  typeIdx: index("idx_erp_acct_type").on(table.accountType),
}));
export type ErpAccountingAccount = typeof erpAccountingAccounts.$inferSelect;

export const erpTaxCodes = mysqlTable("erp_tax_codes", {
  id: int("id").autoincrement().primaryKey(),
  code: varchar("code", { length: 16 }).notNull().unique(),
  name: varchar("name", { length: 128 }).notNull(),
  description: text("description"),
  taxType: varchar("tax_type", { length: 32 }).notNull(), // vat, withholding, exempt, other
  rate: int("rate").notNull().default(0), // en centièmes (1800 = 18%)
  isRecoverable: boolean("is_recoverable").default(false).notNull(),
  isWithholding: boolean("is_withholding").default(false).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  effectiveFrom: bigint("effective_from", { mode: "number" }),
  effectiveTo: bigint("effective_to", { mode: "number" }),
  accountingAccountId: int("accounting_account_id").references(() => erpAccountingAccounts.id, { onDelete: "set null" }),
  createdAt: bigint("created_at", { mode: "number" }).notNull(),
  updatedAt: bigint("updated_at", { mode: "number" }).notNull(),
}, (table) => ({
  codeIdx: index("idx_erp_tax_code").on(table.code),
  typeIdx: index("idx_erp_tax_type").on(table.taxType),
}));
export type ErpTaxCode = typeof erpTaxCodes.$inferSelect;

export const erpPaymentAccounts = mysqlTable("erp_payment_accounts", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 128 }).notNull(),
  accountType: varchar("account_type", { length: 32 }).notNull(), // cash, bank, mobile_money, cheque, card, other
  bankName: varchar("bank_name", { length: 128 }),
  accountNumberMasked: varchar("account_number_masked", { length: 64 }),
  currency: varchar("currency", { length: 3 }).notNull().default("XOF"),
  accountingAccountId: int("accounting_account_id").references(() => erpAccountingAccounts.id, { onDelete: "set null" }),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: bigint("created_at", { mode: "number" }).notNull(),
  updatedAt: bigint("updated_at", { mode: "number" }).notNull(),
}, (table) => ({
  typeIdx: index("idx_erp_payacct_type").on(table.accountType),
}));
export type ErpPaymentAccount = typeof erpPaymentAccounts.$inferSelect;

export const erpAccountingPreEntries = mysqlTable("erp_accounting_pre_entries", {
  id: int("id").autoincrement().primaryKey(),
  sourceType: varchar("source_type", { length: 32 }).notNull(), // purchase_order, expense, invoice, payment
  sourceId: int("source_id").notNull(),
  entryDate: bigint("entry_date", { mode: "number" }).notNull(),
  journalCode: varchar("journal_code", { length: 16 }).notNull(), // HA (achats), OD (opérations diverses), BQ (banque), CA (caisse)
  description: varchar("description", { length: 500 }),
  status: varchar("status", { length: 32 }).notNull().default("draft"), // draft, generated, reviewed, validated, posted, cancelled
  totalDebit: bigint("total_debit", { mode: "number" }).notNull().default(0),
  totalCredit: bigint("total_credit", { mode: "number" }).notNull().default(0),
  createdBy: int("created_by").references(() => users.id, { onDelete: "set null" }),
  validatedBy: int("validated_by").references(() => users.id, { onDelete: "set null" }),
  validatedAt: bigint("validated_at", { mode: "number" }),
  createdAt: bigint("created_at", { mode: "number" }).notNull(),
  updatedAt: bigint("updated_at", { mode: "number" }).notNull(),
}, (table) => ({
  sourceIdx: index("idx_erp_preentry_source").on(table.sourceType, table.sourceId),
  statusIdx: index("idx_erp_preentry_status").on(table.status),
  dateIdx: index("idx_erp_preentry_date").on(table.entryDate),
}));
export type ErpAccountingPreEntry = typeof erpAccountingPreEntries.$inferSelect;

export const erpAccountingPreEntryLines = mysqlTable("erp_accounting_pre_entry_lines", {
  id: int("id").autoincrement().primaryKey(),
  preEntryId: int("pre_entry_id").notNull().references(() => erpAccountingPreEntries.id, { onDelete: "cascade" }),
  accountingAccountId: int("accounting_account_id").notNull().references(() => erpAccountingAccounts.id, { onDelete: "restrict" }),
  debitAmount: bigint("debit_amount", { mode: "number" }).notNull().default(0),
  creditAmount: bigint("credit_amount", { mode: "number" }).notNull().default(0),
  label: varchar("label", { length: 255 }),
  projectId: int("project_id").references(() => erpProjects.id, { onDelete: "set null" }),
  vendorId: int("vendor_id").references(() => erpVendors.id, { onDelete: "set null" }),
  taxCodeId: int("tax_code_id").references(() => erpTaxCodes.id, { onDelete: "set null" }),
  createdAt: bigint("created_at", { mode: "number" }).notNull(),
  updatedAt: bigint("updated_at", { mode: "number" }).notNull(),
}, (table) => ({
  preEntryIdx: index("idx_erp_preentryline_entry").on(table.preEntryId),
  accountIdx: index("idx_erp_preentryline_account").on(table.accountingAccountId),
}));
export type ErpAccountingPreEntryLine = typeof erpAccountingPreEntryLines.$inferSelect;

// --- Module Achats : Catégories et Types ---

export const erpPurchaseCategories = mysqlTable("erp_purchase_categories", {
  id: int("id").autoincrement().primaryKey(),
  code: varchar("code", { length: 16 }).notNull().unique(),
  name: varchar("name", { length: 128 }).notNull(),
  description: text("description"),
  purchaseType: varchar("purchase_type", { length: 32 }).notNull(), // material, equipment, service, subcontracting, general
  isStockable: boolean("is_stockable").default(false).notNull(),
  isEquipment: boolean("is_equipment").default(false).notNull(),
  isService: boolean("is_service").default(false).notNull(),
  defaultBudgetCategoryId: int("default_budget_category_id"),
  defaultAccountingAccountId: int("default_accounting_account_id").references(() => erpAccountingAccounts.id, { onDelete: "set null" }),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: bigint("created_at", { mode: "number" }).notNull(),
  updatedAt: bigint("updated_at", { mode: "number" }).notNull(),
  deletedAt: bigint("deleted_at", { mode: "number" }),
}, (table) => ({
  codeIdx: index("idx_erp_purchcat_code").on(table.code),
  typeIdx: index("idx_erp_purchcat_type").on(table.purchaseType),
}));
export type ErpPurchaseCategory = typeof erpPurchaseCategories.$inferSelect;

export const erpMaterialTypes = mysqlTable("erp_material_types", {
  id: int("id").autoincrement().primaryKey(),
  code: varchar("code", { length: 16 }).notNull().unique(),
  name: varchar("name", { length: 128 }).notNull(),
  description: text("description"),
  unit: varchar("unit", { length: 32 }).notNull(), // kg, m3, m2, unité, litre, tonne
  isStockable: boolean("is_stockable").default(true).notNull(),
  defaultSupplierId: int("default_supplier_id").references(() => erpVendors.id, { onDelete: "set null" }),
  defaultTaxCodeId: int("default_tax_code_id").references(() => erpTaxCodes.id, { onDelete: "set null" }),
  defaultAccountingAccountId: int("default_accounting_account_id").references(() => erpAccountingAccounts.id, { onDelete: "set null" }),
  createdAt: bigint("created_at", { mode: "number" }).notNull(),
  updatedAt: bigint("updated_at", { mode: "number" }).notNull(),
  deletedAt: bigint("deleted_at", { mode: "number" }),
}, (table) => ({
  codeIdx: index("idx_erp_mattype_code").on(table.code),
}));
export type ErpMaterialType = typeof erpMaterialTypes.$inferSelect;

export const erpEquipmentTypes = mysqlTable("erp_equipment_types", {
  id: int("id").autoincrement().primaryKey(),
  code: varchar("code", { length: 16 }).notNull().unique(),
  name: varchar("name", { length: 128 }).notNull(),
  description: text("description"),
  equipmentFamily: varchar("equipment_family", { length: 64 }),
  isCapitalized: boolean("is_capitalized").default(true).notNull(),
  depreciationEnabled: boolean("depreciation_enabled").default(false).notNull(),
  defaultAccountingAccountId: int("default_accounting_account_id").references(() => erpAccountingAccounts.id, { onDelete: "set null" }),
  defaultTaxCodeId: int("default_tax_code_id").references(() => erpTaxCodes.id, { onDelete: "set null" }),
  createdAt: bigint("created_at", { mode: "number" }).notNull(),
  updatedAt: bigint("updated_at", { mode: "number" }).notNull(),
  deletedAt: bigint("deleted_at", { mode: "number" }),
}, (table) => ({
  codeIdx: index("idx_erp_eqtype_code").on(table.code),
}));
export type ErpEquipmentType = typeof erpEquipmentTypes.$inferSelect;

// --- Module Achats : Demandes d'achat ---

export const erpPurchaseRequests = mysqlTable("erp_purchase_requests", {
  id: int("id").autoincrement().primaryKey(),
  requestNumber: varchar("request_number", { length: 32 }).notNull().unique(),
  projectId: int("project_id").references(() => erpProjects.id, { onDelete: "set null" }),
  requestedBy: int("requested_by").notNull().references(() => users.id, { onDelete: "restrict" }),
  department: varchar("department", { length: 64 }),
  purchaseCategoryId: int("purchase_category_id").references(() => erpPurchaseCategories.id, { onDelete: "set null" }),
  requestDate: bigint("request_date", { mode: "number" }).notNull(),
  neededDate: bigint("needed_date", { mode: "number" }),
  priority: varchar("priority", { length: 16 }).notNull().default("normal"), // low, normal, high, urgent
  status: varchar("status", { length: 32 }).notNull().default("draft"), // draft, submitted, under_review, approved, rejected, converted_to_rfq, converted_to_po, cancelled
  justification: text("justification"),
  estimatedAmount: bigint("estimated_amount", { mode: "number" }).default(0),
  currency: varchar("currency", { length: 3 }).notNull().default("XOF"),
  approvedBy: int("approved_by").references(() => users.id, { onDelete: "set null" }),
  approvedAt: bigint("approved_at", { mode: "number" }),
  rejectedBy: int("rejected_by").references(() => users.id, { onDelete: "set null" }),
  rejectedAt: bigint("rejected_at", { mode: "number" }),
  rejectionReason: text("rejection_reason"),
  createdAt: bigint("created_at", { mode: "number" }).notNull(),
  updatedAt: bigint("updated_at", { mode: "number" }).notNull(),
  deletedAt: bigint("deleted_at", { mode: "number" }),
}, (table) => ({
  statusIdx: index("idx_erp_pr_status").on(table.status),
  projectIdx: index("idx_erp_pr_project").on(table.projectId),
  requestedByIdx: index("idx_erp_pr_requester").on(table.requestedBy),
}));
export type ErpPurchaseRequest = typeof erpPurchaseRequests.$inferSelect;

export const erpPurchaseRequestLines = mysqlTable("erp_purchase_request_lines", {
  id: int("id").autoincrement().primaryKey(),
  purchaseRequestId: int("purchase_request_id").notNull().references(() => erpPurchaseRequests.id, { onDelete: "cascade" }),
  itemType: varchar("item_type", { length: 32 }).notNull(), // material, equipment, service, subcontracting, other
  inventoryItemId: int("inventory_item_id").references(() => erpInventoryItems.id, { onDelete: "set null" }),
  equipmentTypeId: int("equipment_type_id").references(() => erpEquipmentTypes.id, { onDelete: "set null" }),
  materialTypeId: int("material_type_id").references(() => erpMaterialTypes.id, { onDelete: "set null" }),
  description: varchar("description", { length: 500 }).notNull(),
  quantity: int("quantity").notNull().default(1),
  unit: varchar("unit", { length: 32 }),
  estimatedUnitPrice: bigint("estimated_unit_price", { mode: "number" }).default(0),
  estimatedTotal: bigint("estimated_total", { mode: "number" }).default(0),
  budgetLineId: int("budget_line_id").references(() => erpBudgetLines.id, { onDelete: "set null" }),
  createdAt: bigint("created_at", { mode: "number" }).notNull(),
  updatedAt: bigint("updated_at", { mode: "number" }).notNull(),
}, (table) => ({
  prIdx: index("idx_erp_prline_pr").on(table.purchaseRequestId),
}));
export type ErpPurchaseRequestLine = typeof erpPurchaseRequestLines.$inferSelect;

// --- Module Achats : RFQ (Demandes de prix) ---

export const erpRfqs = mysqlTable("erp_rfqs", {
  id: int("id").autoincrement().primaryKey(),
  rfqNumber: varchar("rfq_number", { length: 32 }).notNull().unique(),
  purchaseRequestId: int("purchase_request_id").references(() => erpPurchaseRequests.id, { onDelete: "set null" }),
  projectId: int("project_id").references(() => erpProjects.id, { onDelete: "set null" }),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  issueDate: bigint("issue_date", { mode: "number" }).notNull(),
  responseDeadline: bigint("response_deadline", { mode: "number" }),
  status: varchar("status", { length: 32 }).notNull().default("draft"), // draft, sent, responses_pending, responses_received, under_evaluation, awarded, converted_to_po, cancelled, expired
  selectionMethod: varchar("selection_method", { length: 32 }).default("lowest_price"), // lowest_price, best_delivery_time, best_score, manual
  selectedVendorId: int("selected_vendor_id").references(() => erpVendors.id, { onDelete: "set null" }),
  selectedQuoteId: int("selected_quote_id"),
  approvedBy: int("approved_by").references(() => users.id, { onDelete: "set null" }),
  approvedAt: bigint("approved_at", { mode: "number" }),
  createdBy: int("created_by").notNull().references(() => users.id, { onDelete: "restrict" }),
  createdAt: bigint("created_at", { mode: "number" }).notNull(),
  updatedAt: bigint("updated_at", { mode: "number" }).notNull(),
  deletedAt: bigint("deleted_at", { mode: "number" }),
}, (table) => ({
  statusIdx: index("idx_erp_rfq_status").on(table.status),
  projectIdx: index("idx_erp_rfq_project").on(table.projectId),
}));
export type ErpRfq = typeof erpRfqs.$inferSelect;

export const erpRfqVendors = mysqlTable("erp_rfq_vendors", {
  id: int("id").autoincrement().primaryKey(),
  rfqId: int("rfq_id").notNull().references(() => erpRfqs.id, { onDelete: "cascade" }),
  vendorId: int("vendor_id").notNull().references(() => erpVendors.id, { onDelete: "cascade" }),
  sentAt: bigint("sent_at", { mode: "number" }),
  responseReceivedAt: bigint("response_received_at", { mode: "number" }),
  status: varchar("status", { length: 32 }).notNull().default("pending"), // pending, sent, responded, declined
  notes: text("notes"),
  createdAt: bigint("created_at", { mode: "number" }).notNull(),
  updatedAt: bigint("updated_at", { mode: "number" }).notNull(),
}, (table) => ({
  rfqIdx: index("idx_erp_rfqvendor_rfq").on(table.rfqId),
  vendorIdx: index("idx_erp_rfqvendor_vendor").on(table.vendorId),
}));
export type ErpRfqVendor = typeof erpRfqVendors.$inferSelect;

export const erpVendorQuotes = mysqlTable("erp_vendor_quotes", {
  id: int("id").autoincrement().primaryKey(),
  rfqId: int("rfq_id").notNull().references(() => erpRfqs.id, { onDelete: "cascade" }),
  vendorId: int("vendor_id").notNull().references(() => erpVendors.id, { onDelete: "cascade" }),
  quoteNumber: varchar("quote_number", { length: 64 }),
  quoteDate: bigint("quote_date", { mode: "number" }).notNull(),
  validUntil: bigint("valid_until", { mode: "number" }),
  subtotalAmount: bigint("subtotal_amount", { mode: "number" }).notNull().default(0),
  taxAmount: bigint("tax_amount", { mode: "number" }).notNull().default(0),
  totalAmount: bigint("total_amount", { mode: "number" }).notNull().default(0),
  currency: varchar("currency", { length: 3 }).notNull().default("XOF"),
  deliveryDelayDays: int("delivery_delay_days"),
  paymentTerms: varchar("payment_terms", { length: 128 }),
  documentUrl: text("document_url"),
  status: varchar("status", { length: 32 }).notNull().default("received"), // received, under_review, accepted, rejected, expired
  evaluationScore: int("evaluation_score"), // 0-100
  createdAt: bigint("created_at", { mode: "number" }).notNull(),
  updatedAt: bigint("updated_at", { mode: "number" }).notNull(),
  deletedAt: bigint("deleted_at", { mode: "number" }),
}, (table) => ({
  rfqIdx: index("idx_erp_vquote_rfq").on(table.rfqId),
  vendorIdx: index("idx_erp_vquote_vendor").on(table.vendorId),
  statusIdx: index("idx_erp_vquote_status").on(table.status),
}));
export type ErpVendorQuote = typeof erpVendorQuotes.$inferSelect;

// --- Module Achats : Bons de commande ---

export const erpPurchaseOrders = mysqlTable("erp_purchase_orders", {
  id: int("id").autoincrement().primaryKey(),
  poNumber: varchar("po_number", { length: 32 }).notNull().unique(),
  purchaseRequestId: int("purchase_request_id").references(() => erpPurchaseRequests.id, { onDelete: "set null" }),
  rfqId: int("rfq_id").references(() => erpRfqs.id, { onDelete: "set null" }),
  vendorQuoteId: int("vendor_quote_id").references(() => erpVendorQuotes.id, { onDelete: "set null" }),
  vendorId: int("vendor_id").notNull().references(() => erpVendors.id, { onDelete: "restrict" }),
  projectId: int("project_id").references(() => erpProjects.id, { onDelete: "set null" }),
  orderDate: bigint("order_date", { mode: "number" }).notNull(),
  expectedDeliveryDate: bigint("expected_delivery_date", { mode: "number" }),
  subtotalAmount: bigint("subtotal_amount", { mode: "number" }).notNull().default(0),
  discountAmount: bigint("discount_amount", { mode: "number" }).default(0),
  taxAmount: bigint("tax_amount", { mode: "number" }).notNull().default(0),
  totalAmount: bigint("total_amount", { mode: "number" }).notNull().default(0),
  currency: varchar("currency", { length: 3 }).notNull().default("XOF"),
  purchaseType: varchar("purchase_type", { length: 16 }).default("OPEX"), // CAPEX ou OPEX
  status: varchar("status", { length: 32 }).notNull().default("draft"), // draft, submitted, approved, sent, partially_received, fully_received, invoiced, partially_paid, paid, cancelled, closed
  approvedBy: int("approved_by").references(() => users.id, { onDelete: "set null" }),
  approvedAt: bigint("approved_at", { mode: "number" }),
  sentToVendorAt: bigint("sent_to_vendor_at", { mode: "number" }),
  createdBy: int("created_by").notNull().references(() => users.id, { onDelete: "restrict" }),
  createdAt: bigint("created_at", { mode: "number" }).notNull(),
  updatedAt: bigint("updated_at", { mode: "number" }).notNull(),
  deletedAt: bigint("deleted_at", { mode: "number" }),
}, (table) => ({
  statusIdx: index("idx_erp_po_status").on(table.status),
  vendorIdx: index("idx_erp_po_vendor").on(table.vendorId),
  projectIdx: index("idx_erp_po_project").on(table.projectId),
}));
export type ErpPurchaseOrder = typeof erpPurchaseOrders.$inferSelect;

export const erpPurchaseOrderLines = mysqlTable("erp_purchase_order_lines", {
  id: int("id").autoincrement().primaryKey(),
  purchaseOrderId: int("purchase_order_id").notNull().references(() => erpPurchaseOrders.id, { onDelete: "cascade" }),
  itemType: varchar("item_type", { length: 32 }).notNull(), // material, equipment, service, subcontracting, other
  inventoryItemId: int("inventory_item_id").references(() => erpInventoryItems.id, { onDelete: "set null" }),
  equipmentTypeId: int("equipment_type_id").references(() => erpEquipmentTypes.id, { onDelete: "set null" }),
  materialTypeId: int("material_type_id").references(() => erpMaterialTypes.id, { onDelete: "set null" }),
  designation: varchar("designation", { length: 255 }),
  description: varchar("description", { length: 500 }).notNull(),
  lineDate: bigint("line_date", { mode: "number" }),
  quantityOrdered: int("quantity_ordered").notNull(),
  quantityReceived: int("quantity_received").notNull().default(0),
  unit: varchar("unit", { length: 32 }),
  unitPrice: bigint("unit_price", { mode: "number" }).notNull(),
  discountRate: int("discount_rate").default(0), // en centièmes
  taxCodeId: int("tax_code_id").references(() => erpTaxCodes.id, { onDelete: "set null" }),
  taxRate: int("tax_rate").default(0), // en centièmes
  taxAmount: bigint("tax_amount", { mode: "number" }).default(0),
  lineTotal: bigint("line_total", { mode: "number" }).notNull(),
  budgetLineId: int("budget_line_id").references(() => erpBudgetLines.id, { onDelete: "set null" }),
  accountingAccountId: int("accounting_account_id").references(() => erpAccountingAccounts.id, { onDelete: "set null" }),
  attachmentUrl: text("attachment_url"),
  attachmentKey: varchar("attachment_key", { length: 512 }),
  attachmentName: varchar("attachment_name", { length: 255 }),
  createdAt: bigint("created_at", { mode: "number" }).notNull(),
  updatedAt: bigint("updated_at", { mode: "number" }).notNull(),
}, (table) => ({
  poIdx: index("idx_erp_poline_po").on(table.purchaseOrderId),
}));
export type ErpPurchaseOrderLine = typeof erpPurchaseOrderLines.$inferSelect;

// --- Module Achats : Réceptions ---

export const erpGoodsReceipts = mysqlTable("erp_goods_receipts", {
  id: int("id").autoincrement().primaryKey(),
  receiptNumber: varchar("receipt_number", { length: 32 }).notNull().unique(),
  purchaseOrderId: int("purchase_order_id").notNull().references(() => erpPurchaseOrders.id, { onDelete: "restrict" }),
  vendorId: int("vendor_id").notNull().references(() => erpVendors.id, { onDelete: "restrict" }),
  projectId: int("project_id").references(() => erpProjects.id, { onDelete: "set null" }),
  receiptDate: bigint("receipt_date", { mode: "number" }).notNull(),
  receivedBy: int("received_by").notNull().references(() => users.id, { onDelete: "restrict" }),
  deliveryNoteNumber: varchar("delivery_note_number", { length: 64 }),
  status: varchar("status", { length: 32 }).notNull().default("draft"), // draft, received, partially_received, rejected, cancelled
  notes: text("notes"),
  documentUrl: text("document_url"),
  createdAt: bigint("created_at", { mode: "number" }).notNull(),
  updatedAt: bigint("updated_at", { mode: "number" }).notNull(),
  deletedAt: bigint("deleted_at", { mode: "number" }),
}, (table) => ({
  poIdx: index("idx_erp_gr_po").on(table.purchaseOrderId),
  vendorIdx: index("idx_erp_gr_vendor").on(table.vendorId),
  statusIdx: index("idx_erp_gr_status").on(table.status),
}));
export type ErpGoodsReceipt = typeof erpGoodsReceipts.$inferSelect;

export const erpGoodsReceiptLines = mysqlTable("erp_goods_receipt_lines", {
  id: int("id").autoincrement().primaryKey(),
  goodsReceiptId: int("goods_receipt_id").notNull().references(() => erpGoodsReceipts.id, { onDelete: "cascade" }),
  purchaseOrderLineId: int("purchase_order_line_id").references(() => erpPurchaseOrderLines.id, { onDelete: "set null" }),
  inventoryItemId: int("inventory_item_id").references(() => erpInventoryItems.id, { onDelete: "set null" }),
  equipmentId: int("equipment_id").references(() => erpEquipment.id, { onDelete: "set null" }),
  description: varchar("description", { length: 500 }),
  quantityReceived: int("quantity_received").notNull(),
  quantityRejected: int("quantity_rejected").notNull().default(0),
  unit: varchar("unit", { length: 32 }),
  conditionStatus: varchar("condition_status", { length: 32 }).default("good"), // good, damaged, partial
  stockLocationId: int("stock_location_id").references(() => erpStockLocations.id, { onDelete: "set null" }),
  createdAt: bigint("created_at", { mode: "number" }).notNull(),
  updatedAt: bigint("updated_at", { mode: "number" }).notNull(),
}, (table) => ({
  grIdx: index("idx_erp_grline_gr").on(table.goodsReceiptId),
}));
export type ErpGoodsReceiptLine = typeof erpGoodsReceiptLines.$inferSelect;

// --- Module Dépenses ---

export const erpExpenseCategories = mysqlTable("erp_expense_categories", {
  id: int("id").autoincrement().primaryKey(),
  code: varchar("code", { length: 16 }).notNull().unique(),
  name: varchar("name", { length: 128 }).notNull(),
  description: text("description"),
  parentId: int("parent_id"),
  defaultAccountingAccountId: int("default_accounting_account_id").references(() => erpAccountingAccounts.id, { onDelete: "set null" }),
  defaultTaxCodeId: int("default_tax_code_id").references(() => erpTaxCodes.id, { onDelete: "set null" }),
  requiresReceipt: boolean("requires_receipt").default(false).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: bigint("created_at", { mode: "number" }).notNull(),
  updatedAt: bigint("updated_at", { mode: "number" }).notNull(),
  deletedAt: bigint("deleted_at", { mode: "number" }),
}, (table) => ({
  codeIdx: index("idx_erp_expcat_code").on(table.code),
}));
export type ErpExpenseCategory = typeof erpExpenseCategories.$inferSelect;

export const erpExpenses = mysqlTable("erp_expenses", {
  id: int("id").autoincrement().primaryKey(),
  expenseNumber: varchar("expense_number", { length: 32 }).notNull().unique(),
  projectId: int("project_id").references(() => erpProjects.id, { onDelete: "set null" }),
  expenseCategoryId: int("expense_category_id").references(() => erpExpenseCategories.id, { onDelete: "set null" }),
  vendorId: int("vendor_id").references(() => erpVendors.id, { onDelete: "set null" }),
  employeeId: int("employee_id").references(() => users.id, { onDelete: "set null" }),
  expenseDate: bigint("expense_date", { mode: "number" }).notNull(),
  description: text("description"),
  subtotalAmount: bigint("subtotal_amount", { mode: "number" }).notNull().default(0),
  taxAmount: bigint("tax_amount", { mode: "number" }).notNull().default(0),
  totalAmount: bigint("total_amount", { mode: "number" }).notNull().default(0),
  currency: varchar("currency", { length: 3 }).notNull().default("XOF"),
  paymentMethod: varchar("payment_method", { length: 32 }), // cash, bank, mobile_money, cheque, card
  paymentAccountId: int("payment_account_id").references(() => erpPaymentAccounts.id, { onDelete: "set null" }),
  status: varchar("status", { length: 32 }).notNull().default("draft"), // draft, submitted, approved, rejected, paid, reimbursed, cancelled, posted_to_accounting
  isReimbursable: boolean("is_reimbursable").default(false).notNull(),
  reimbursedAt: bigint("reimbursed_at", { mode: "number" }),
  documentUrl: text("document_url"),
  documentKey: varchar("document_key", { length: 512 }),
  budgetLineId: int("budget_line_id").references(() => erpBudgetLines.id, { onDelete: "set null" }),
  accountingAccountId: int("accounting_account_id").references(() => erpAccountingAccounts.id, { onDelete: "set null" }),
  taxCodeId: int("tax_code_id").references(() => erpTaxCodes.id, { onDelete: "set null" }),
  createdBy: int("created_by").notNull().references(() => users.id, { onDelete: "restrict" }),
  approvedBy: int("approved_by").references(() => users.id, { onDelete: "set null" }),
  approvedAt: bigint("approved_at", { mode: "number" }),
  rejectedBy: int("rejected_by").references(() => users.id, { onDelete: "set null" }),
  rejectedAt: bigint("rejected_at", { mode: "number" }),
  rejectionReason: text("rejection_reason"),
  createdAt: bigint("created_at", { mode: "number" }).notNull(),
  updatedAt: bigint("updated_at", { mode: "number" }).notNull(),
  deletedAt: bigint("deleted_at", { mode: "number" }),
}, (table) => ({
  statusIdx: index("idx_erp_expense_status").on(table.status),
  projectIdx: index("idx_erp_expense_project").on(table.projectId),
  categoryIdx: index("idx_erp_expense_category").on(table.expenseCategoryId),
  dateIdx: index("idx_erp_expense_date").on(table.expenseDate),
}));
export type ErpExpense = typeof erpExpenses.$inferSelect;

export const erpExpenseLines = mysqlTable("erp_expense_lines", {
  id: int("id").autoincrement().primaryKey(),
  expenseId: int("expense_id").notNull().references(() => erpExpenses.id, { onDelete: "cascade" }),
  designation: varchar("designation", { length: 255 }),
  description: varchar("description", { length: 500 }).notNull(),
  lineDate: bigint("line_date", { mode: "number" }),
  quantity: int("quantity").notNull().default(1),
  unitPrice: bigint("unit_price", { mode: "number" }).notNull(),
  taxCodeId: int("tax_code_id").references(() => erpTaxCodes.id, { onDelete: "set null" }),
  taxRate: int("tax_rate").default(0),
  taxAmount: bigint("tax_amount", { mode: "number" }).default(0),
  lineTotal: bigint("line_total", { mode: "number" }).notNull(),
  projectId: int("project_id").references(() => erpProjects.id, { onDelete: "set null" }),
  budgetLineId: int("budget_line_id").references(() => erpBudgetLines.id, { onDelete: "set null" }),
  accountingAccountId: int("accounting_account_id").references(() => erpAccountingAccounts.id, { onDelete: "set null" }),
  attachmentUrl: text("attachment_url"),
  attachmentKey: varchar("attachment_key", { length: 512 }),
  attachmentName: varchar("attachment_name", { length: 255 }),
  createdAt: bigint("created_at", { mode: "number" }).notNull(),
  updatedAt: bigint("updated_at", { mode: "number" }).notNull(),
}, (table) => ({
  expenseIdx: index("idx_erp_expline_expense").on(table.expenseId),
}));
export type ErpExpenseLine = typeof erpExpenseLines.$inferSelect;


// ═══════════════════════════════════════════════════════════════════════
// MODULE VENTE IMMOBILIÈRE
// ═══════════════════════════════════════════════════════════════════════

// --- Programmes immobiliers ---
export const erpRealEstatePrograms = mysqlTable("erp_real_estate_programs", {
  id: int("id").autoincrement().primaryKey(),
  code: varchar("code", { length: 32 }).notNull().unique(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  projectId: int("project_id"),
  location: varchar("location", { length: 255 }),
  developerName: varchar("developer_name", { length: 255 }),
  startDate: bigint("start_date", { mode: "number" }),
  plannedDeliveryDate: bigint("planned_delivery_date", { mode: "number" }),
  actualDeliveryDate: bigint("actual_delivery_date", { mode: "number" }),
  status: varchar("status", { length: 32 }).notNull().default("draft"), // draft, active, completed, suspended, cancelled
  totalUnits: int("total_units").default(0).notNull(),
  availableUnits: int("available_units").default(0).notNull(),
  reservedUnits: int("reserved_units").default(0).notNull(),
  soldUnits: int("sold_units").default(0).notNull(),
  createdBy: int("created_by"),
  createdAt: bigint("created_at", { mode: "number" }).notNull(),
  updatedAt: bigint("updated_at", { mode: "number" }).notNull(),
  deletedAt: bigint("deleted_at", { mode: "number" }),
}, (table) => ({
  statusIdx: index("idx_re_prog_status").on(table.status),
  projectIdx: index("idx_re_prog_project").on(table.projectId),
}));
export type ErpRealEstateProgram = typeof erpRealEstatePrograms.$inferSelect;

// --- Bâtiments / blocs / immeubles ---
export const erpRealEstateBuildings = mysqlTable("erp_real_estate_buildings", {
  id: int("id").autoincrement().primaryKey(),
  programId: int("program_id").notNull(),
  code: varchar("code", { length: 32 }).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  buildingType: varchar("building_type", { length: 32 }).notNull(), // immeuble, bloc, villa_groupee, residence, maison_individuelle, autre
  numberOfFloors: int("number_of_floors").default(0),
  numberOfUnits: int("number_of_units").default(0),
  description: text("description"),
  status: varchar("status", { length: 32 }).notNull().default("active"), // active, completed, suspended
  createdAt: bigint("created_at", { mode: "number" }).notNull(),
  updatedAt: bigint("updated_at", { mode: "number" }).notNull(),
  deletedAt: bigint("deleted_at", { mode: "number" }),
}, (table) => ({
  programIdx: index("idx_re_bldg_program").on(table.programId),
}));
export type ErpRealEstateBuilding = typeof erpRealEstateBuildings.$inferSelect;

// --- Unités immobilières vendables ---
export const erpRealEstateUnits = mysqlTable("erp_real_estate_units", {
  id: int("id").autoincrement().primaryKey(),
  programId: int("program_id").notNull(),
  buildingId: int("building_id"),
  projectId: int("project_id"),
  unitCode: varchar("unit_code", { length: 32 }).notNull().unique(),
  unitType: varchar("unit_type", { length: 32 }).notNull(), // maison, villa, appartement, duplex, studio, local_commercial, parking, autre
  floorNumber: int("floor_number"),
  doorNumber: varchar("door_number", { length: 16 }),
  lotNumber: varchar("lot_number", { length: 32 }),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  surfaceArea: decimal("surface_area", { precision: 10, scale: 2 }),
  landArea: decimal("land_area", { precision: 10, scale: 2 }),
  numberOfRooms: int("number_of_rooms"),
  numberOfBedrooms: int("number_of_bedrooms"),
  numberOfBathrooms: int("number_of_bathrooms"),
  hasParking: boolean("has_parking").default(false),
  parkingNumber: varchar("parking_number", { length: 16 }),
  basePrice: bigint("base_price", { mode: "number" }),
  currentPrice: bigint("current_price", { mode: "number" }),
  currency: varchar("currency", { length: 8 }).default("XOF").notNull(),
  status: varchar("status", { length: 32 }).notNull().default("draft"), // draft, available, reserved, sold, under_contract, delivered, cancelled, blocked, maintenance, not_available
  availabilityDate: bigint("availability_date", { mode: "number" }),
  createdAt: bigint("created_at", { mode: "number" }).notNull(),
  updatedAt: bigint("updated_at", { mode: "number" }).notNull(),
  deletedAt: bigint("deleted_at", { mode: "number" }),
}, (table) => ({
  programIdx: index("idx_re_unit_program").on(table.programId),
  buildingIdx: index("idx_re_unit_building").on(table.buildingId),
  statusIdx: index("idx_re_unit_status").on(table.status),
  typeIdx: index("idx_re_unit_type").on(table.unitType),
}));
export type ErpRealEstateUnit = typeof erpRealEstateUnits.$inferSelect;

// --- Clients et prospects acheteurs ---
export const erpRealEstateCustomers = mysqlTable("erp_real_estate_customers", {
  id: int("id").autoincrement().primaryKey(),
  customerNumber: varchar("customer_number", { length: 32 }).notNull().unique(),
  customerType: varchar("customer_type", { length: 16 }).notNull(), // individual, company
  firstName: varchar("first_name", { length: 128 }),
  lastName: varchar("last_name", { length: 128 }),
  companyName: varchar("company_name", { length: 255 }),
  email: varchar("email", { length: 255 }),
  phone: varchar("phone", { length: 32 }),
  address: text("address"),
  nationality: varchar("nationality", { length: 64 }),
  idDocumentType: varchar("id_document_type", { length: 32 }), // cni, passport, carte_sejour, rccm, autre
  idDocumentNumber: varchar("id_document_number", { length: 64 }),
  taxIdentificationNumber: varchar("tax_identification_number", { length: 32 }),
  source: varchar("source", { length: 64 }), // direct, referral, website, agency, salon, autre
  status: varchar("status", { length: 32 }).notNull().default("prospect"), // prospect, qualified, buyer, inactive, blacklisted
  assignedSalespersonId: int("assigned_salesperson_id"),
  createdAt: bigint("created_at", { mode: "number" }).notNull(),
  updatedAt: bigint("updated_at", { mode: "number" }).notNull(),
  deletedAt: bigint("deleted_at", { mode: "number" }),
}, (table) => ({
  statusIdx: index("idx_re_cust_status").on(table.status),
  typeIdx: index("idx_re_cust_type").on(table.customerType),
  salespersonIdx: index("idx_re_cust_sales").on(table.assignedSalespersonId),
}));
export type ErpRealEstateCustomer = typeof erpRealEstateCustomers.$inferSelect;

// --- Réservations immobilières ---
export const erpRealEstateReservations = mysqlTable("erp_real_estate_reservations", {
  id: int("id").autoincrement().primaryKey(),
  reservationNumber: varchar("reservation_number", { length: 32 }).notNull().unique(),
  unitId: int("unit_id").notNull(),
  customerId: int("customer_id").notNull(),
  reservationDate: bigint("reservation_date", { mode: "number" }).notNull(),
  expiryDate: bigint("expiry_date", { mode: "number" }),
  reservationAmount: bigint("reservation_amount", { mode: "number" }).default(0),
  currency: varchar("currency", { length: 8 }).default("XOF").notNull(),
  status: varchar("status", { length: 32 }).notNull().default("draft"), // draft, pending_payment, active, expired, converted_to_sale, cancelled, refunded
  paymentId: int("payment_id"),
  documentId: int("document_id"),
  createdBy: int("created_by"),
  approvedBy: int("approved_by"),
  approvedAt: bigint("approved_at", { mode: "number" }),
  cancelledBy: int("cancelled_by"),
  cancelledAt: bigint("cancelled_at", { mode: "number" }),
  cancellationReason: text("cancellation_reason"),
  createdAt: bigint("created_at", { mode: "number" }).notNull(),
  updatedAt: bigint("updated_at", { mode: "number" }).notNull(),
  deletedAt: bigint("deleted_at", { mode: "number" }),
}, (table) => ({
  unitIdx: index("idx_re_resv_unit").on(table.unitId),
  customerIdx: index("idx_re_resv_customer").on(table.customerId),
  statusIdx: index("idx_re_resv_status").on(table.status),
}));
export type ErpRealEstateReservation = typeof erpRealEstateReservations.$inferSelect;

// --- Contrats de vente immobilière ---
export const erpRealEstateSales = mysqlTable("erp_real_estate_sales", {
  id: int("id").autoincrement().primaryKey(),
  saleNumber: varchar("sale_number", { length: 32 }).notNull().unique(),
  programId: int("program_id"),
  unitId: int("unit_id").notNull(),
  customerId: int("customer_id").notNull(),
  reservationId: int("reservation_id"),
  saleDate: bigint("sale_date", { mode: "number" }),
  contractDate: bigint("contract_date", { mode: "number" }),
  basePrice: bigint("base_price", { mode: "number" }).notNull(),
  discountAmount: bigint("discount_amount", { mode: "number" }).default(0),
  extraFeesAmount: bigint("extra_fees_amount", { mode: "number" }).default(0),
  taxAmount: bigint("tax_amount", { mode: "number" }).default(0),
  totalSaleAmount: bigint("total_sale_amount", { mode: "number" }).notNull(),
  currency: varchar("currency", { length: 8 }).default("XOF").notNull(),
  status: varchar("status", { length: 32 }).notNull().default("draft"), // draft, pending_approval, approved, contract_signed, in_payment, fully_paid, delivered, cancelled, refunded, closed
  contractDocumentId: int("contract_document_id"),
  notaryName: varchar("notary_name", { length: 255 }),
  notaryContact: varchar("notary_contact", { length: 128 }),
  salespersonId: int("salesperson_id"),
  approvedBy: int("approved_by"),
  approvedAt: bigint("approved_at", { mode: "number" }),
  createdBy: int("created_by"),
  createdAt: bigint("created_at", { mode: "number" }).notNull(),
  updatedAt: bigint("updated_at", { mode: "number" }).notNull(),
  deletedAt: bigint("deleted_at", { mode: "number" }),
}, (table) => ({
  unitIdx: index("idx_re_sale_unit").on(table.unitId),
  customerIdx: index("idx_re_sale_customer").on(table.customerId),
  statusIdx: index("idx_re_sale_status").on(table.status),
  programIdx: index("idx_re_sale_program").on(table.programId),
}));
export type ErpRealEstateSale = typeof erpRealEstateSales.$inferSelect;

// --- Échéanciers de paiement ---
export const erpRealEstatePaymentPlans = mysqlTable("erp_real_estate_payment_plans", {
  id: int("id").autoincrement().primaryKey(),
  saleId: int("sale_id").notNull(),
  planName: varchar("plan_name", { length: 128 }).notNull(),
  totalAmount: bigint("total_amount", { mode: "number" }).notNull(),
  initialDepositAmount: bigint("initial_deposit_amount", { mode: "number" }).default(0),
  numberOfInstallments: int("number_of_installments").notNull(),
  frequency: varchar("frequency", { length: 32 }).notNull(), // one_time, monthly, quarterly, semi_annual, annual, custom
  status: varchar("status", { length: 32 }).notNull().default("active"), // active, completed, cancelled
  createdAt: bigint("created_at", { mode: "number" }).notNull(),
  updatedAt: bigint("updated_at", { mode: "number" }).notNull(),
}, (table) => ({
  saleIdx: index("idx_re_plan_sale").on(table.saleId),
}));
export type ErpRealEstatePaymentPlan = typeof erpRealEstatePaymentPlans.$inferSelect;

// --- Échéances (installments) ---
export const erpRealEstateInstallments = mysqlTable("erp_real_estate_installments", {
  id: int("id").autoincrement().primaryKey(),
  paymentPlanId: int("payment_plan_id").notNull(),
  saleId: int("sale_id").notNull(),
  installmentNumber: int("installment_number").notNull(),
  dueDate: bigint("due_date", { mode: "number" }).notNull(),
  amountDue: bigint("amount_due", { mode: "number" }).notNull(),
  amountPaid: bigint("amount_paid", { mode: "number" }).default(0),
  balanceDue: bigint("balance_due", { mode: "number" }).notNull(),
  status: varchar("status", { length: 32 }).notNull().default("pending"), // pending, partially_paid, paid, overdue, cancelled
  invoiceId: int("invoice_id"),
  createdAt: bigint("created_at", { mode: "number" }).notNull(),
  updatedAt: bigint("updated_at", { mode: "number" }).notNull(),
}, (table) => ({
  planIdx: index("idx_re_inst_plan").on(table.paymentPlanId),
  saleIdx: index("idx_re_inst_sale").on(table.saleId),
  statusIdx: index("idx_re_inst_status").on(table.status),
  dueDateIdx: index("idx_re_inst_due").on(table.dueDate),
}));
export type ErpRealEstateInstallment = typeof erpRealEstateInstallments.$inferSelect;

// --- Encaissements clients ---
export const erpCustomerPayments = mysqlTable("erp_customer_payments", {
  id: int("id").autoincrement().primaryKey(),
  paymentNumber: varchar("payment_number", { length: 32 }).notNull().unique(),
  saleId: int("sale_id").notNull(),
  customerId: int("customer_id").notNull(),
  installmentId: int("installment_id"),
  paymentDate: bigint("payment_date", { mode: "number" }).notNull(),
  amount: bigint("amount", { mode: "number" }).notNull(),
  currency: varchar("currency", { length: 8 }).default("XOF").notNull(),
  paymentMethod: varchar("payment_method", { length: 32 }).notNull(), // cash, bank_transfer, cheque, mobile_money, card, other
  paymentAccountId: int("payment_account_id"),
  reference: varchar("reference", { length: 128 }),
  status: varchar("status", { length: 32 }).notNull().default("draft"), // draft, received, validated, rejected, reversed, refunded
  receiptDocumentId: int("receipt_document_id"),
  createdBy: int("created_by"),
  validatedBy: int("validated_by"),
  validatedAt: bigint("validated_at", { mode: "number" }),
  createdAt: bigint("created_at", { mode: "number" }).notNull(),
  updatedAt: bigint("updated_at", { mode: "number" }).notNull(),
  deletedAt: bigint("deleted_at", { mode: "number" }),
}, (table) => ({
  saleIdx: index("idx_re_cpay_sale").on(table.saleId),
  customerIdx: index("idx_re_cpay_customer").on(table.customerId),
  statusIdx: index("idx_re_cpay_status").on(table.status),
}));
export type ErpCustomerPayment = typeof erpCustomerPayments.$inferSelect;

// --- Livraisons et remise des clés ---
export const erpRealEstateDeliveries = mysqlTable("erp_real_estate_deliveries", {
  id: int("id").autoincrement().primaryKey(),
  deliveryNumber: varchar("delivery_number", { length: 32 }).notNull().unique(),
  saleId: int("sale_id").notNull(),
  unitId: int("unit_id").notNull(),
  customerId: int("customer_id").notNull(),
  deliveryDate: bigint("delivery_date", { mode: "number" }),
  deliveredBy: int("delivered_by"),
  receivedByName: varchar("received_by_name", { length: 255 }),
  status: varchar("status", { length: 32 }).notNull().default("planned"), // planned, ready, delivered, with_reservations, cancelled
  handoverDocumentId: int("handover_document_id"),
  remarks: text("remarks"),
  createdAt: bigint("created_at", { mode: "number" }).notNull(),
  updatedAt: bigint("updated_at", { mode: "number" }).notNull(),
  deletedAt: bigint("deleted_at", { mode: "number" }),
}, (table) => ({
  saleIdx: index("idx_re_deliv_sale").on(table.saleId),
  unitIdx: index("idx_re_deliv_unit").on(table.unitId),
  statusIdx: index("idx_re_deliv_status").on(table.status),
}));
export type ErpRealEstateDelivery = typeof erpRealEstateDeliveries.$inferSelect;

// --- Réserves de livraison ---
export const erpRealEstateDeliveryReserves = mysqlTable("erp_real_estate_delivery_reserves", {
  id: int("id").autoincrement().primaryKey(),
  deliveryId: int("delivery_id").notNull(),
  description: text("description").notNull(),
  severity: varchar("severity", { length: 16 }).notNull(), // minor, major, critical
  responsibleUserId: int("responsible_user_id"),
  dueDate: bigint("due_date", { mode: "number" }),
  status: varchar("status", { length: 32 }).notNull().default("open"), // open, in_progress, resolved, cancelled
  resolvedAt: bigint("resolved_at", { mode: "number" }),
  createdAt: bigint("created_at", { mode: "number" }).notNull(),
  updatedAt: bigint("updated_at", { mode: "number" }).notNull(),
}, (table) => ({
  deliveryIdx: index("idx_re_dreserve_deliv").on(table.deliveryId),
}));
export type ErpRealEstateDeliveryReserve = typeof erpRealEstateDeliveryReserves.$inferSelect;

// --- Commissions commerciales ---
export const erpSalesCommissions = mysqlTable("erp_sales_commissions", {
  id: int("id").autoincrement().primaryKey(),
  saleId: int("sale_id").notNull(),
  salespersonId: int("salesperson_id").notNull(),
  commissionType: varchar("commission_type", { length: 32 }).notNull(), // percentage, fixed
  commissionRate: decimal("commission_rate", { precision: 5, scale: 2 }),
  commissionAmount: bigint("commission_amount", { mode: "number" }).notNull(),
  status: varchar("status", { length: 32 }).notNull().default("pending"), // pending, approved, paid, cancelled
  approvedBy: int("approved_by"),
  approvedAt: bigint("approved_at", { mode: "number" }),
  paidAt: bigint("paid_at", { mode: "number" }),
  expenseId: int("expense_id"),
  createdAt: bigint("created_at", { mode: "number" }).notNull(),
  updatedAt: bigint("updated_at", { mode: "number" }).notNull(),
}, (table) => ({
  saleIdx: index("idx_re_comm_sale").on(table.saleId),
  salespersonIdx: index("idx_re_comm_sales").on(table.salespersonId),
  statusIdx: index("idx_re_comm_status").on(table.status),
}));
export type ErpSalesCommission = typeof erpSalesCommissions.$inferSelect;


// ═══════════════════════════════════════════════════════════════════════
// MODULE COMPTABILITÉ FINALE
// ═══════════════════════════════════════════════════════════════════════

// --- Exercices comptables ---
export const erpAccountingFiscalYears = mysqlTable("erp_accounting_fiscal_years", {
  id: int("id").autoincrement().primaryKey(),
  yearCode: varchar("year_code", { length: 16 }).notNull().unique(),
  startDate: bigint("start_date", { mode: "number" }).notNull(),
  endDate: bigint("end_date", { mode: "number" }).notNull(),
  status: varchar("status", { length: 16 }).notNull().default("open"), // open, closing, closed, archived
  closedBy: int("closed_by"),
  closedAt: bigint("closed_at", { mode: "number" }),
  createdAt: bigint("created_at", { mode: "number" }).notNull(),
  updatedAt: bigint("updated_at", { mode: "number" }).notNull(),
}, (table) => ({
  statusIdx: index("idx_acct_fy_status").on(table.status),
}));
export type ErpAccountingFiscalYear = typeof erpAccountingFiscalYears.$inferSelect;

// --- Périodes comptables ---
export const erpAccountingPeriods = mysqlTable("erp_accounting_periods", {
  id: int("id").autoincrement().primaryKey(),
  fiscalYearId: int("fiscal_year_id").notNull(),
  periodCode: varchar("period_code", { length: 16 }).notNull(),
  startDate: bigint("start_date", { mode: "number" }).notNull(),
  endDate: bigint("end_date", { mode: "number" }).notNull(),
  status: varchar("status", { length: 16 }).notNull().default("open"), // open, locked, closed
  closedBy: int("closed_by"),
  closedAt: bigint("closed_at", { mode: "number" }),
  createdAt: bigint("created_at", { mode: "number" }).notNull(),
  updatedAt: bigint("updated_at", { mode: "number" }).notNull(),
}, (table) => ({
  fyIdx: index("idx_acct_period_fy").on(table.fiscalYearId),
  statusIdx: index("idx_acct_period_status").on(table.status),
}));
export type ErpAccountingPeriod = typeof erpAccountingPeriods.$inferSelect;

// --- Journaux comptables ---
export const erpAccountingJournals = mysqlTable("erp_accounting_journals", {
  id: int("id").autoincrement().primaryKey(),
  journalCode: varchar("journal_code", { length: 16 }).notNull().unique(),
  journalName: varchar("journal_name", { length: 128 }).notNull(),
  journalType: varchar("journal_type", { length: 32 }).notNull(), // sales, purchases, cash, bank, operations, payroll, tax, adjustment, opening, closing
  description: text("description"),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: bigint("created_at", { mode: "number" }).notNull(),
  updatedAt: bigint("updated_at", { mode: "number" }).notNull(),
}, (table) => ({
  typeIdx: index("idx_acct_jnl_type").on(table.journalType),
}));
export type ErpAccountingJournal = typeof erpAccountingJournals.$inferSelect;

// --- Écritures comptables définitives ---
export const erpAccountingEntries = mysqlTable("erp_accounting_entries", {
  id: int("id").autoincrement().primaryKey(),
  entryNumber: varchar("entry_number", { length: 32 }).notNull().unique(),
  journalId: int("journal_id").notNull(),
  fiscalYearId: int("fiscal_year_id").notNull(),
  periodId: int("period_id").notNull(),
  entryDate: bigint("entry_date", { mode: "number" }).notNull(),
  postingDate: bigint("posting_date", { mode: "number" }),
  sourceType: varchar("source_type", { length: 32 }), // invoice, payment, expense, sale, purchase, manual, adjustment
  sourceId: int("source_id"),
  description: text("description"),
  reference: varchar("reference", { length: 128 }),
  status: varchar("status", { length: 16 }).notNull().default("draft"), // draft, posted, reversed, cancelled
  totalDebit: bigint("total_debit", { mode: "number" }).default(0),
  totalCredit: bigint("total_credit", { mode: "number" }).default(0),
  createdBy: int("created_by"),
  postedBy: int("posted_by"),
  postedAt: bigint("posted_at", { mode: "number" }),
  reversedBy: int("reversed_by"),
  reversedAt: bigint("reversed_at", { mode: "number" }),
  createdAt: bigint("created_at", { mode: "number" }).notNull(),
  updatedAt: bigint("updated_at", { mode: "number" }).notNull(),
  deletedAt: bigint("deleted_at", { mode: "number" }),
}, (table) => ({
  journalIdx: index("idx_acct_entry_jnl").on(table.journalId),
  periodIdx: index("idx_acct_entry_period").on(table.periodId),
  statusIdx: index("idx_acct_entry_status").on(table.status),
  dateIdx: index("idx_acct_entry_date").on(table.entryDate),
  sourceIdx: index("idx_acct_entry_source").on(table.sourceType, table.sourceId),
}));
export type ErpAccountingEntry = typeof erpAccountingEntries.$inferSelect;

// --- Lignes d'écritures comptables ---
export const erpAccountingEntryLines = mysqlTable("erp_accounting_entry_lines", {
  id: int("id").autoincrement().primaryKey(),
  entryId: int("entry_id").notNull(),
  lineNumber: int("line_number").notNull(),
  accountingAccountId: int("accounting_account_id").notNull(),
  debitAmount: bigint("debit_amount", { mode: "number" }).default(0),
  creditAmount: bigint("credit_amount", { mode: "number" }).default(0),
  label: varchar("label", { length: 255 }),
  projectId: int("project_id"),
  customerId: int("customer_id"),
  vendorId: int("vendor_id"),
  taxCodeId: int("tax_code_id"),
  analyticAxisId: int("analytic_axis_id"),
  createdAt: bigint("created_at", { mode: "number" }).notNull(),
  updatedAt: bigint("updated_at", { mode: "number" }).notNull(),
}, (table) => ({
  entryIdx: index("idx_acct_eline_entry").on(table.entryId),
  accountIdx: index("idx_acct_eline_acct").on(table.accountingAccountId),
}));
export type ErpAccountingEntryLine = typeof erpAccountingEntryLines.$inferSelect;

// --- Comptes auxiliaires clients/fournisseurs ---
export const erpAccountingThirdParties = mysqlTable("erp_accounting_third_parties", {
  id: int("id").autoincrement().primaryKey(),
  thirdPartyType: varchar("third_party_type", { length: 16 }).notNull(), // customer, vendor, contractor, employee, other
  customerId: int("customer_id"),
  vendorId: int("vendor_id"),
  contractorId: int("contractor_id"),
  accountingAccountId: int("accounting_account_id"),
  thirdPartyCode: varchar("third_party_code", { length: 32 }).notNull().unique(),
  name: varchar("name", { length: 255 }).notNull(),
  taxIdentificationNumber: varchar("tax_identification_number", { length: 32 }),
  status: varchar("status", { length: 16 }).notNull().default("active"), // active, inactive
  createdAt: bigint("created_at", { mode: "number" }).notNull(),
  updatedAt: bigint("updated_at", { mode: "number" }).notNull(),
}, (table) => ({
  typeIdx: index("idx_acct_tp_type").on(table.thirdPartyType),
  accountIdx: index("idx_acct_tp_acct").on(table.accountingAccountId),
}));
export type ErpAccountingThirdParty = typeof erpAccountingThirdParties.$inferSelect;

// --- Axes analytiques ---
export const erpAnalyticAxes = mysqlTable("erp_analytic_axes", {
  id: int("id").autoincrement().primaryKey(),
  code: varchar("code", { length: 16 }).notNull().unique(),
  name: varchar("name", { length: 128 }).notNull(),
  description: text("description"),
  axisType: varchar("axis_type", { length: 32 }).notNull(), // projet, programme, chantier, departement, activite, type_bien, commercial
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: bigint("created_at", { mode: "number" }).notNull(),
  updatedAt: bigint("updated_at", { mode: "number" }).notNull(),
}, (table) => ({
  typeIdx: index("idx_analytic_type").on(table.axisType),
}));
export type ErpAnalyticAxis = typeof erpAnalyticAxes.$inferSelect;

// --- Allocations analytiques ---
export const erpAnalyticAllocations = mysqlTable("erp_analytic_allocations", {
  id: int("id").autoincrement().primaryKey(),
  sourceType: varchar("source_type", { length: 32 }).notNull(), // entry, invoice, expense, sale, purchase_order, payment, real_estate_sale, customer_payment, accounting_entry, stock_movement, equipment, payroll, manual_adjustment
  sourceId: int("source_id").notNull(),
  projectId: int("project_id"),
  programId: int("program_id"),
  costCenterId: int("cost_center_id"),
  budgetId: int("budget_id"),
  budgetLineId: int("budget_line_id"),
  accountingEntryId: int("accounting_entry_id"),
  accountingEntryLineId: int("accounting_entry_line_id"),
  analyticAxisId: int("analytic_axis_id").notNull(),
  percentage: decimal("percentage", { precision: 5, scale: 2 }),
  amount: bigint("amount", { mode: "number" }),
  currency: varchar("currency", { length: 8 }).default("XOF"),
  allocatedAmount: bigint("allocated_amount", { mode: "number" }).default(0),
  createdAt: bigint("created_at", { mode: "number" }).notNull(),
  updatedAt: bigint("updated_at", { mode: "number" }).notNull(),
}, (table) => ({
  sourceIdx: index("idx_analytic_alloc_src").on(table.sourceType, table.sourceId),
  axisIdx: index("idx_analytic_alloc_axis").on(table.analyticAxisId),
  programIdx: index("idx_alloc_program").on(table.programId),
  costCenterIdx: index("idx_alloc_cc").on(table.costCenterId),
}));
export type ErpAnalyticAllocation = typeof erpAnalyticAllocations.$inferSelect;

// --- Rapprochement bancaire ---
export const erpBankReconciliations = mysqlTable("erp_bank_reconciliations", {
  id: int("id").autoincrement().primaryKey(),
  paymentAccountId: int("payment_account_id").notNull(),
  periodId: int("period_id"),
  statementDate: bigint("statement_date", { mode: "number" }).notNull(),
  openingBalance: bigint("opening_balance", { mode: "number" }).notNull(),
  closingBalance: bigint("closing_balance", { mode: "number" }).notNull(),
  status: varchar("status", { length: 16 }).notNull().default("draft"), // draft, in_progress, validated
  createdBy: int("created_by"),
  validatedBy: int("validated_by"),
  validatedAt: bigint("validated_at", { mode: "number" }),
  createdAt: bigint("created_at", { mode: "number" }).notNull(),
  updatedAt: bigint("updated_at", { mode: "number" }).notNull(),
}, (table) => ({
  accountIdx: index("idx_bank_recon_acct").on(table.paymentAccountId),
  statusIdx: index("idx_bank_recon_status").on(table.status),
}));
export type ErpBankReconciliation = typeof erpBankReconciliations.$inferSelect;

// --- Lignes de rapprochement bancaire ---
export const erpBankReconciliationLines = mysqlTable("erp_bank_reconciliation_lines", {
  id: int("id").autoincrement().primaryKey(),
  reconciliationId: int("reconciliation_id").notNull(),
  paymentId: int("payment_id"),
  accountingEntryId: int("accounting_entry_id"),
  transactionDate: bigint("transaction_date", { mode: "number" }).notNull(),
  description: varchar("description", { length: 255 }),
  amount: bigint("amount", { mode: "number" }).notNull(),
  matched: boolean("matched").default(false).notNull(),
  matchReference: varchar("match_reference", { length: 64 }),
  createdAt: bigint("created_at", { mode: "number" }).notNull(),
  updatedAt: bigint("updated_at", { mode: "number" }).notNull(),
}, (table) => ({
  reconIdx: index("idx_bank_rline_recon").on(table.reconciliationId),
}));
export type ErpBankReconciliationLine = typeof erpBankReconciliationLines.$inferSelect;

// --- Périodes fiscales ---
export const erpTaxPeriods = mysqlTable("erp_tax_periods", {
  id: int("id").autoincrement().primaryKey(),
  periodCode: varchar("period_code", { length: 32 }).notNull().unique(),
  taxType: varchar("tax_type", { length: 32 }).notNull(), // tva, is, patente, tpp, autre
  startDate: bigint("start_date", { mode: "number" }).notNull(),
  endDate: bigint("end_date", { mode: "number" }).notNull(),
  status: varchar("status", { length: 16 }).notNull().default("open"), // open, declared, paid, closed
  declaredAt: bigint("declared_at", { mode: "number" }),
  paidAt: bigint("paid_at", { mode: "number" }),
  createdAt: bigint("created_at", { mode: "number" }).notNull(),
  updatedAt: bigint("updated_at", { mode: "number" }).notNull(),
}, (table) => ({
  typeIdx: index("idx_tax_period_type").on(table.taxType),
  statusIdx: index("idx_tax_period_status").on(table.status),
}));
export type ErpTaxPeriod = typeof erpTaxPeriods.$inferSelect;

// --- Déclarations fiscales ---
export const erpTaxDeclarations = mysqlTable("erp_tax_declarations", {
  id: int("id").autoincrement().primaryKey(),
  taxPeriodId: int("tax_period_id").notNull(),
  taxCodeId: int("tax_code_id").notNull(),
  taxBaseAmount: bigint("tax_base_amount", { mode: "number" }).default(0),
  taxAmount: bigint("tax_amount", { mode: "number" }).default(0),
  recoverableAmount: bigint("recoverable_amount", { mode: "number" }).default(0),
  payableAmount: bigint("payable_amount", { mode: "number" }).default(0),
  status: varchar("status", { length: 16 }).notNull().default("draft"), // draft, reviewed, validated, declared, paid, cancelled
  documentId: int("document_id"),
  createdBy: int("created_by"),
  validatedBy: int("validated_by"),
  validatedAt: bigint("validated_at", { mode: "number" }),
  createdAt: bigint("created_at", { mode: "number" }).notNull(),
  updatedAt: bigint("updated_at", { mode: "number" }).notNull(),
}, (table) => ({
  periodIdx: index("idx_tax_decl_period").on(table.taxPeriodId),
  statusIdx: index("idx_tax_decl_status").on(table.status),
}));
export type ErpTaxDeclaration = typeof erpTaxDeclarations.$inferSelect;


// ============================================================
// Sprint 23 — RFQ Lines, Vendor Quote Lines, Invoice/PO Matching, Export Comptable
// ============================================================

// --- RFQ Lines ---
export const erpRfqLines = mysqlTable("erp_rfq_lines", {
  id: int("id").autoincrement().primaryKey(),
  rfqId: int("rfq_id").notNull().references(() => erpRfqs.id, { onDelete: "cascade" }),
  itemType: varchar("item_type", { length: 32 }).notNull().default("material"), // material, equipment, service, subcontracting, other
  inventoryItemId: int("inventory_item_id"),
  description: varchar("description", { length: 512 }).notNull(),
  quantity: int("quantity").notNull().default(100), // *100 for decimals
  unit: varchar("unit", { length: 32 }).notNull().default("unité"),
  estimatedUnitPrice: int("estimated_unit_price").default(0), // centimes XOF
  estimatedTotal: int("estimated_total").default(0),
  createdAt: bigint("created_at", { mode: "number" }).notNull(),
  updatedAt: bigint("updated_at", { mode: "number" }).notNull(),
}, (table) => ({
  rfqIdx: index("idx_erp_rfqlines_rfq").on(table.rfqId),
}));
export type ErpRfqLine = typeof erpRfqLines.$inferSelect;

// --- Vendor Quote Lines ---
export const erpVendorQuoteLines = mysqlTable("erp_vendor_quote_lines", {
  id: int("id").autoincrement().primaryKey(),
  vendorQuoteId: int("vendor_quote_id").notNull().references(() => erpVendorQuotes.id, { onDelete: "cascade" }),
  rfqLineId: int("rfq_line_id").references(() => erpRfqLines.id, { onDelete: "set null" }),
  description: varchar("description", { length: 512 }).notNull(),
  quantity: int("quantity").notNull().default(100),
  unit: varchar("unit", { length: 32 }).notNull().default("unité"),
  unitPrice: int("unit_price").notNull().default(0), // centimes XOF
  discountRate: int("discount_rate").default(0), // en centièmes (1000 = 10%)
  taxRate: int("tax_rate").default(1800), // centièmes (1800 = 18%)
  taxAmount: int("tax_amount").default(0),
  lineTotal: int("line_total").notNull().default(0),
  deliveryDelayDays: int("delivery_delay_days"),
  createdAt: bigint("created_at", { mode: "number" }).notNull(),
  updatedAt: bigint("updated_at", { mode: "number" }).notNull(),
}, (table) => ({
  quoteIdx: index("idx_erp_vqlines_quote").on(table.vendorQuoteId),
  rfqLineIdx: index("idx_erp_vqlines_rfqline").on(table.rfqLineId),
}));
export type ErpVendorQuoteLine = typeof erpVendorQuoteLines.$inferSelect;

// --- Invoice/PO Matching ---
export const erpInvoicePoMatches = mysqlTable("erp_invoice_po_matches", {
  id: int("id").autoincrement().primaryKey(),
  invoiceId: int("invoice_id").notNull().references(() => erpInvoices.id, { onDelete: "cascade" }),
  purchaseOrderId: int("purchase_order_id").notNull().references(() => erpPurchaseOrders.id, { onDelete: "cascade" }),
  vendorId: int("vendor_id").references(() => erpVendors.id, { onDelete: "set null" }),
  projectId: int("project_id").references(() => erpProjects.id, { onDelete: "set null" }),
  matchStatus: varchar("match_status", { length: 32 }).notNull().default("pending"), // auto_matched, partial_match, variance_detected, manual_review, rejected, approved
  matchScore: int("match_score").default(0), // 0-100
  priceVarianceAmount: int("price_variance_amount").default(0), // centimes
  quantityVariance: int("quantity_variance").default(0),
  taxVarianceAmount: int("tax_variance_amount").default(0),
  totalVarianceAmount: int("total_variance_amount").default(0),
  variancePercentage: int("variance_percentage").default(0), // centièmes (500 = 5%)
  matchedBy: int("matched_by").references(() => users.id, { onDelete: "set null" }),
  matchedAt: bigint("matched_at", { mode: "number" }),
  reviewedBy: int("reviewed_by").references(() => users.id, { onDelete: "set null" }),
  reviewedAt: bigint("reviewed_at", { mode: "number" }),
  approvalStatus: varchar("approval_status", { length: 32 }).notNull().default("pending_review"), // pending_review, approved, rejected, escalated
  notes: text("notes"),
  createdAt: bigint("created_at", { mode: "number" }).notNull(),
  updatedAt: bigint("updated_at", { mode: "number" }).notNull(),
  deletedAt: bigint("deleted_at", { mode: "number" }),
}, (table) => ({
  invoiceIdx: index("idx_erp_ipm_invoice").on(table.invoiceId),
  poIdx: index("idx_erp_ipm_po").on(table.purchaseOrderId),
  statusIdx: index("idx_erp_ipm_status").on(table.matchStatus),
}));
export type ErpInvoicePoMatch = typeof erpInvoicePoMatches.$inferSelect;

export const erpInvoicePoMatchLines = mysqlTable("erp_invoice_po_match_lines", {
  id: int("id").autoincrement().primaryKey(),
  invoicePoMatchId: int("invoice_po_match_id").notNull().references(() => erpInvoicePoMatches.id, { onDelete: "cascade" }),
  invoiceLineId: int("invoice_line_id").references(() => erpInvoiceLines.id, { onDelete: "set null" }),
  purchaseOrderLineId: int("purchase_order_line_id").references(() => erpPurchaseOrderLines.id, { onDelete: "set null" }),
  description: varchar("description", { length: 512 }),
  invoiceQuantity: int("invoice_quantity").default(0),
  poQuantity: int("po_quantity").default(0),
  quantityVariance: int("quantity_variance").default(0),
  invoiceUnitPrice: int("invoice_unit_price").default(0),
  poUnitPrice: int("po_unit_price").default(0),
  priceVariance: int("price_variance").default(0),
  invoiceTaxAmount: int("invoice_tax_amount").default(0),
  poTaxAmount: int("po_tax_amount").default(0),
  taxVariance: int("tax_variance").default(0),
  invoiceLineTotal: int("invoice_line_total").default(0),
  poLineTotal: int("po_line_total").default(0),
  lineVariance: int("line_variance").default(0),
  matchStatus: varchar("match_status", { length: 32 }).default("pending"), // matched, variance, missing_in_invoice, missing_in_po
  createdAt: bigint("created_at", { mode: "number" }).notNull(),
  updatedAt: bigint("updated_at", { mode: "number" }).notNull(),
}, (table) => ({
  matchIdx: index("idx_erp_ipmlines_match").on(table.invoicePoMatchId),
}));
export type ErpInvoicePoMatchLine = typeof erpInvoicePoMatchLines.$inferSelect;

// --- Matching Settings ---
export const erpMatchingSettings = mysqlTable("erp_matching_settings", {
  id: int("id").autoincrement().primaryKey(),
  settingKey: varchar("setting_key", { length: 128 }).notNull().unique(),
  settingValue: varchar("setting_value", { length: 255 }).notNull(),
  description: varchar("description", { length: 512 }),
  isActive: int("is_active").notNull().default(1),
  createdAt: bigint("created_at", { mode: "number" }).notNull(),
  updatedAt: bigint("updated_at", { mode: "number" }).notNull(),
});
export type ErpMatchingSetting = typeof erpMatchingSettings.$inferSelect;

// --- Accounting Export Formats ---
export const erpAccountingExportFormats = mysqlTable("erp_accounting_export_formats", {
  id: int("id").autoincrement().primaryKey(),
  formatCode: varchar("format_code", { length: 32 }).notNull().unique(), // STANDARD_CSV, SAGE_CSV, CODA_CSV
  formatName: varchar("format_name", { length: 128 }).notNull(),
  description: text("description"),
  delimiter: varchar("delimiter", { length: 4 }).notNull().default(";"),
  dateFormat: varchar("date_format", { length: 32 }).notNull().default("DD/MM/YYYY"),
  decimalSeparator: varchar("decimal_separator", { length: 2 }).notNull().default(","),
  encoding: varchar("encoding", { length: 16 }).notNull().default("UTF-8"),
  hasHeader: int("has_header").notNull().default(1),
  fieldMappingJson: text("field_mapping_json"), // JSON mapping of fields
  isActive: int("is_active").notNull().default(1),
  createdAt: bigint("created_at", { mode: "number" }).notNull(),
  updatedAt: bigint("updated_at", { mode: "number" }).notNull(),
});
export type ErpAccountingExportFormat = typeof erpAccountingExportFormats.$inferSelect;

// --- Accounting Exports ---
export const erpAccountingExports = mysqlTable("erp_accounting_exports", {
  id: int("id").autoincrement().primaryKey(),
  exportNumber: varchar("export_number", { length: 32 }).notNull().unique(),
  formatId: int("format_id").notNull().references(() => erpAccountingExportFormats.id, { onDelete: "restrict" }),
  dateFrom: bigint("date_from", { mode: "number" }).notNull(),
  dateTo: bigint("date_to", { mode: "number" }).notNull(),
  status: varchar("status", { length: 16 }).notNull().default("draft"), // draft, generated, downloaded, failed, cancelled
  fileContent: text("file_content"), // generated CSV content
  fileName: varchar("file_name", { length: 255 }),
  exportedBy: int("exported_by").notNull().references(() => users.id, { onDelete: "restrict" }),
  exportedAt: bigint("exported_at", { mode: "number" }),
  entriesCount: int("entries_count").default(0),
  totalDebit: bigint("total_debit", { mode: "number" }).default(0),
  totalCredit: bigint("total_credit", { mode: "number" }).default(0),
  notes: text("notes"),
  createdAt: bigint("created_at", { mode: "number" }).notNull(),
  updatedAt: bigint("updated_at", { mode: "number" }).notNull(),
}, (table) => ({
  statusIdx: index("idx_erp_acctexport_status").on(table.status),
  dateIdx: index("idx_erp_acctexport_date").on(table.dateFrom, table.dateTo),
}));
export type ErpAccountingExport = typeof erpAccountingExports.$inferSelect;

// --- Accounting Export Lines ---
export const erpAccountingExportLines = mysqlTable("erp_accounting_export_lines", {
  id: int("id").autoincrement().primaryKey(),
  exportId: int("accounting_export_id").notNull().references(() => erpAccountingExports.id, { onDelete: "cascade" }),
  preEntryId: int("pre_entry_id").references(() => erpAccountingPreEntries.id, { onDelete: "set null" }),
  preEntryLineId: int("pre_entry_line_id").references(() => erpAccountingPreEntryLines.id, { onDelete: "set null" }),
  accountCode: varchar("account_code", { length: 16 }),
  journalCode: varchar("journal_code", { length: 16 }),
  entryDate: bigint("entry_date", { mode: "number" }),
  label: varchar("label", { length: 512 }),
  debitAmount: int("debit_amount").default(0),
  creditAmount: int("credit_amount").default(0),
  thirdPartyCode: varchar("third_party_code", { length: 64 }),
  projectCode: varchar("project_code", { length: 64 }),
  taxCode: varchar("tax_code", { length: 16 }),
  exportLineJson: text("export_line_json"),
  createdAt: bigint("created_at", { mode: "number" }).notNull(),
}, (table) => ({
  exportIdx: index("idx_erp_acctexportlines_export").on(table.exportId),
}));
export type ErpAccountingExportLine = typeof erpAccountingExportLines.$inferSelect;


// ============================================================
// Sprint Budget 2.0 — Module Budget Prévisionnel Entreprise
// ============================================================

export const erpBudgetsV2 = mysqlTable("erp_budgets_v2", {
  id: int("id").autoincrement().primaryKey(),
  budgetCode: varchar("budget_code", { length: 50 }).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  fiscalYear: int("fiscal_year").notNull(),
  companyId: int("company_id"),
  currency: varchar("currency", { length: 10 }).default("XOF").notNull(),
  status: mysqlEnum("status", ["draft", "imported", "under_review", "approved", "locked", "revised", "archived", "cancelled"]).default("draft").notNull(),
  scenarioType: mysqlEnum("scenario_type", ["initial_budget", "revised_budget", "forecast", "optimistic", "pessimistic", "actualized"]).default("initial_budget").notNull(),
  sourceFileId: int("source_file_id"),
  createdBy: int("created_by").notNull(),
  approvedBy: int("approved_by"),
  approvedAt: bigint("approved_at", { mode: "number" }),
  lockedBy: int("locked_by"),
  lockedAt: bigint("locked_at", { mode: "number" }),
  createdAt: bigint("created_at", { mode: "number" }).notNull(),
  updatedAt: bigint("updated_at", { mode: "number" }).notNull(),
  deletedAt: bigint("deleted_at", { mode: "number" }),
}, (table) => ({
  yearIdx: index("idx_budgetv2_year").on(table.fiscalYear),
  statusIdx: index("idx_budgetv2_status").on(table.status),
}));
export type ErpBudgetV2 = typeof erpBudgetsV2.$inferSelect;
export type InsertErpBudgetV2 = typeof erpBudgetsV2.$inferInsert;

export const erpBudgetVersions = mysqlTable("erp_budget_versions", {
  id: int("id").autoincrement().primaryKey(),
  budgetId: int("budget_id").notNull(),
  versionNumber: int("version_number").notNull(),
  versionName: varchar("version_name", { length: 100 }).notNull(),
  description: text("description"),
  status: mysqlEnum("status", ["draft", "active", "archived"]).default("draft").notNull(),
  createdBy: int("created_by").notNull(),
  approvedBy: int("approved_by"),
  approvedAt: bigint("approved_at", { mode: "number" }),
  createdAt: bigint("created_at", { mode: "number" }).notNull(),
  updatedAt: bigint("updated_at", { mode: "number" }).notNull(),
}, (table) => ({
  budgetIdx: index("idx_budgetver_budget").on(table.budgetId),
}));
export type ErpBudgetVersion = typeof erpBudgetVersions.$inferSelect;
export type InsertErpBudgetVersion = typeof erpBudgetVersions.$inferInsert;

export const erpBudgetPeriods = mysqlTable("erp_budget_periods", {
  id: int("id").autoincrement().primaryKey(),
  budgetId: int("budget_id").notNull(),
  fiscalYear: int("fiscal_year").notNull(),
  periodNumber: int("period_number").notNull(),
  periodMonth: int("period_month").notNull(),
  periodLabel: varchar("period_label", { length: 50 }).notNull(),
  startDate: bigint("start_date", { mode: "number" }),
  endDate: bigint("end_date", { mode: "number" }),
  status: mysqlEnum("status", ["open", "closed", "locked"]).default("open").notNull(),
  createdAt: bigint("created_at", { mode: "number" }).notNull(),
  updatedAt: bigint("updated_at", { mode: "number" }).notNull(),
}, (table) => ({
  budgetIdx: index("idx_budgetperiod_budget").on(table.budgetId),
}));
export type ErpBudgetPeriod = typeof erpBudgetPeriods.$inferSelect;
export type InsertErpBudgetPeriod = typeof erpBudgetPeriods.$inferInsert;

export const erpBudgetCategories = mysqlTable("erp_budget_categories", {
  id: int("id").autoincrement().primaryKey(),
  budgetId: int("budget_id").notNull(),
  parentId: int("parent_id"),
  code: varchar("code", { length: 50 }).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  categoryType: mysqlEnum("category_type", ["REVENUE", "OPEX", "CAPEX", "TAX", "PAYROLL", "DIRECT_COST", "INDIRECT_COST", "FINANCIAL_RESULT", "EXCEPTIONAL_RESULT", "CASHFLOW", "OTHER"]).notNull(),
  sourceSheet: varchar("source_sheet", { length: 100 }),
  sortOrder: int("sort_order").default(0).notNull(),
  isTotalLine: tinyint("is_total_line").default(0).notNull(),
  accountingAccountId: int("accounting_account_id"),
  taxCodeId: int("tax_code_id"),
  createdAt: bigint("created_at", { mode: "number" }).notNull(),
  updatedAt: bigint("updated_at", { mode: "number" }).notNull(),
  deletedAt: bigint("deleted_at", { mode: "number" }),
}, (table) => ({
  budgetIdx: index("idx_budgetcat_budget").on(table.budgetId),
  parentIdx: index("idx_budgetcat_parent").on(table.parentId),
  typeIdx: index("idx_budgetcat_type").on(table.categoryType),
}));
export type ErpBudgetCategory = typeof erpBudgetCategories.$inferSelect;
export type InsertErpBudgetCategory = typeof erpBudgetCategories.$inferInsert;

export const erpBudgetLinesV2 = mysqlTable("erp_budget_lines_v2", {
  id: int("id").autoincrement().primaryKey(),
  budgetId: int("budget_id").notNull(),
  budgetVersionId: int("budget_version_id"),
  categoryId: int("category_id").notNull(),
  projectId: int("project_id"),
  customerId: int("customer_id"),
  vendorId: int("vendor_id"),
  employeeId: int("employee_id"),
  department: varchar("department", { length: 100 }),
  costCenter: varchar("cost_center", { length: 100 }),
  lineCode: varchar("line_code", { length: 50 }),
  lineLabel: varchar("line_label", { length: 500 }).notNull(),
  lineType: mysqlEnum("line_type", ["REVENUE", "DIRECT_COST", "INDIRECT_COST", "OPEX", "CAPEX", "TAX", "PAYROLL", "SOCIAL_CHARGES", "CASH_IN", "CASH_OUT", "RESULT", "KPI", "TOTAL"]).notNull(),
  sourceSheet: varchar("source_sheet", { length: 100 }),
  sourceRowNumber: int("source_row_number"),
  isInputLine: tinyint("is_input_line").default(1).notNull(),
  isTotalLine: tinyint("is_total_line").default(0).notNull(),
  isCalculatedLine: tinyint("is_calculated_line").default(0).notNull(),
  calculationFormula: varchar("calculation_formula", { length: 500 }),
  accountingAccountId: int("accounting_account_id"),
  taxCodeId: int("tax_code_id"),
  comments: text("comments"),
  sortOrder: int("sort_order").default(0).notNull(),
  createdAt: bigint("created_at", { mode: "number" }).notNull(),
  updatedAt: bigint("updated_at", { mode: "number" }).notNull(),
  deletedAt: bigint("deleted_at", { mode: "number" }),
}, (table) => ({
  budgetIdx: index("idx_budgetlinev2_budget").on(table.budgetId),
  categoryIdx: index("idx_budgetlinev2_cat").on(table.categoryId),
  typeIdx: index("idx_budgetlinev2_type").on(table.lineType),
}));
export type ErpBudgetLineV2 = typeof erpBudgetLinesV2.$inferSelect;
export type InsertErpBudgetLineV2 = typeof erpBudgetLinesV2.$inferInsert;

export const erpBudgetLineAmounts = mysqlTable("erp_budget_line_amounts", {
  id: int("id").autoincrement().primaryKey(),
  budgetLineId: int("budget_line_id").notNull(),
  budgetPeriodId: int("budget_period_id"),
  monthNumber: int("month_number").notNull(),
  plannedAmount: bigint("planned_amount", { mode: "number" }).default(0).notNull(),
  actualAmount: bigint("actual_amount", { mode: "number" }).default(0).notNull(),
  committedAmount: bigint("committed_amount", { mode: "number" }).default(0).notNull(),
  paidAmount: bigint("paid_amount", { mode: "number" }).default(0).notNull(),
  invoicedAmount: bigint("invoiced_amount", { mode: "number" }).default(0).notNull(),
  varianceAmount: bigint("variance_amount", { mode: "number" }).default(0).notNull(),
  variancePercentage: int("variance_percentage").default(0).notNull(),
  executionRate: int("execution_rate").default(0).notNull(),
  currency: varchar("currency", { length: 10 }).default("XOF").notNull(),
  createdAt: bigint("created_at", { mode: "number" }).notNull(),
  updatedAt: bigint("updated_at", { mode: "number" }).notNull(),
}, (table) => ({
  lineIdx: index("idx_budgetamt_line").on(table.budgetLineId),
  monthIdx: index("idx_budgetamt_month").on(table.monthNumber),
}));
export type ErpBudgetLineAmount = typeof erpBudgetLineAmounts.$inferSelect;
export type InsertErpBudgetLineAmount = typeof erpBudgetLineAmounts.$inferInsert;

export const erpBudgetImports = mysqlTable("erp_budget_imports", {
  id: int("id").autoincrement().primaryKey(),
  budgetId: int("budget_id"),
  fileName: varchar("file_name", { length: 255 }).notNull(),
  filePath: varchar("file_path", { length: 500 }).notNull(),
  fileSize: int("file_size").default(0).notNull(),
  importStatus: mysqlEnum("import_status", ["uploaded", "analysed", "mapped", "imported", "failed", "cancelled"]).default("uploaded").notNull(),
  importedBy: int("imported_by").notNull(),
  importedAt: bigint("imported_at", { mode: "number" }),
  detectedSheetsJson: json("detected_sheets_json"),
  mappingSummaryJson: json("mapping_summary_json"),
  errorsCount: int("errors_count").default(0).notNull(),
  warningsCount: int("warnings_count").default(0).notNull(),
  createdAt: bigint("created_at", { mode: "number" }).notNull(),
  updatedAt: bigint("updated_at", { mode: "number" }).notNull(),
}, (table) => ({
  budgetIdx: index("idx_budgetimport_budget").on(table.budgetId),
  statusIdx: index("idx_budgetimport_status").on(table.importStatus),
}));
export type ErpBudgetImport = typeof erpBudgetImports.$inferSelect;
export type InsertErpBudgetImport = typeof erpBudgetImports.$inferInsert;

export const erpBudgetImportErrors = mysqlTable("erp_budget_import_errors", {
  id: int("id").autoincrement().primaryKey(),
  budgetImportId: int("budget_import_id").notNull(),
  sheetName: varchar("sheet_name", { length: 100 }),
  rowNumber: int("row_number"),
  columnName: varchar("column_name", { length: 50 }),
  errorType: varchar("error_type", { length: 100 }).notNull(),
  errorMessage: text("error_message").notNull(),
  rawValue: varchar("raw_value", { length: 500 }),
  severity: mysqlEnum("severity", ["info", "warning", "error", "critical"]).default("error").notNull(),
  createdAt: bigint("created_at", { mode: "number" }).notNull(),
}, (table) => ({
  importIdx: index("idx_budgetimperr_import").on(table.budgetImportId),
}));
export type ErpBudgetImportError = typeof erpBudgetImportErrors.$inferSelect;
export type InsertErpBudgetImportError = typeof erpBudgetImportErrors.$inferInsert;

export const erpBudgetTemplateMappings = mysqlTable("erp_budget_tmpl_mappings", {
  id: int("id").autoincrement().primaryKey(),
  templateName: varchar("template_name", { length: 255 }).notNull(),
  sheetName: varchar("sheet_name", { length: 100 }).notNull(),
  mappingType: mysqlEnum("mapping_type", ["revenue", "charges", "investment", "pl", "cashflow", "summary"]).notNull(),
  headerRow: int("header_row").default(1).notNull(),
  categoryColumn: varchar("category_column", { length: 10 }),
  lineColumn: varchar("line_column", { length: 10 }),
  monthStartColumn: varchar("month_start_column", { length: 10 }),
  monthEndColumn: varchar("month_end_column", { length: 10 }),
  totalColumn: varchar("total_column", { length: 10 }),
  commentsColumn: varchar("comments_column", { length: 10 }),
  rulesJson: json("rules_json"),
  isActive: tinyint("is_active").default(1).notNull(),
  createdAt: bigint("created_at", { mode: "number" }).notNull(),
  updatedAt: bigint("updated_at", { mode: "number" }).notNull(),
}, (table) => ({
  templateIdx: index("idx_budgettmpl_name").on(table.templateName),
}));
export type ErpBudgetTemplateMapping = typeof erpBudgetTemplateMappings.$inferSelect;
export type InsertErpBudgetTemplateMapping = typeof erpBudgetTemplateMappings.$inferInsert;

export const erpBudgetPlSnapshots = mysqlTable("erp_budget_pl_snapshots", {
  id: int("id").autoincrement().primaryKey(),
  budgetId: int("budget_id").notNull(),
  budgetVersionId: int("budget_version_id"),
  budgetPeriodId: int("budget_period_id"),
  monthNumber: int("month_number").notNull(),
  revenuePlanned: bigint("revenue_planned", { mode: "number" }).default(0).notNull(),
  revenueActual: bigint("revenue_actual", { mode: "number" }).default(0).notNull(),
  directCostsPlanned: bigint("direct_costs_planned", { mode: "number" }).default(0).notNull(),
  directCostsActual: bigint("direct_costs_actual", { mode: "number" }).default(0).notNull(),
  directMarginPlanned: bigint("direct_margin_planned", { mode: "number" }).default(0).notNull(),
  directMarginActual: bigint("direct_margin_actual", { mode: "number" }).default(0).notNull(),
  indirectCostsPlanned: bigint("indirect_costs_planned", { mode: "number" }).default(0).notNull(),
  indirectCostsActual: bigint("indirect_costs_actual", { mode: "number" }).default(0).notNull(),
  ebitdaPlanned: bigint("ebitda_planned", { mode: "number" }).default(0).notNull(),
  ebitdaActual: bigint("ebitda_actual", { mode: "number" }).default(0).notNull(),
  capexPlanned: bigint("capex_planned", { mode: "number" }).default(0).notNull(),
  capexActual: bigint("capex_actual", { mode: "number" }).default(0).notNull(),
  operatingCashFlowPlanned: bigint("op_cashflow_planned", { mode: "number" }).default(0).notNull(),
  operatingCashFlowActual: bigint("op_cashflow_actual", { mode: "number" }).default(0).notNull(),
  createdAt: bigint("created_at", { mode: "number" }).notNull(),
  updatedAt: bigint("updated_at", { mode: "number" }).notNull(),
}, (table) => ({
  budgetIdx: index("idx_budgetpl_budget").on(table.budgetId),
  monthIdx: index("idx_budgetpl_month").on(table.monthNumber),
}));
export type ErpBudgetPlSnapshot = typeof erpBudgetPlSnapshots.$inferSelect;
export type InsertErpBudgetPlSnapshot = typeof erpBudgetPlSnapshots.$inferInsert;

export const erpBudgetCashflowSnapshots = mysqlTable("erp_budget_cf_snapshots", {
  id: int("id").autoincrement().primaryKey(),
  budgetId: int("budget_id").notNull(),
  budgetVersionId: int("budget_version_id"),
  budgetPeriodId: int("budget_period_id"),
  monthNumber: int("month_number").notNull(),
  cashInPlanned: bigint("cash_in_planned", { mode: "number" }).default(0).notNull(),
  cashInActual: bigint("cash_in_actual", { mode: "number" }).default(0).notNull(),
  cashOutPlanned: bigint("cash_out_planned", { mode: "number" }).default(0).notNull(),
  cashOutActual: bigint("cash_out_actual", { mode: "number" }).default(0).notNull(),
  opexPlanned: bigint("opex_planned", { mode: "number" }).default(0).notNull(),
  opexActual: bigint("opex_actual", { mode: "number" }).default(0).notNull(),
  capexPlanned: bigint("capex_planned", { mode: "number" }).default(0).notNull(),
  capexActual: bigint("capex_actual", { mode: "number" }).default(0).notNull(),
  taxesPlanned: bigint("taxes_planned", { mode: "number" }).default(0).notNull(),
  taxesActual: bigint("taxes_actual", { mode: "number" }).default(0).notNull(),
  netCashFlowPlanned: bigint("net_cf_planned", { mode: "number" }).default(0).notNull(),
  netCashFlowActual: bigint("net_cf_actual", { mode: "number" }).default(0).notNull(),
  openingCashBalance: bigint("opening_cash_balance", { mode: "number" }).default(0).notNull(),
  closingCashBalance: bigint("closing_cash_balance", { mode: "number" }).default(0).notNull(),
  createdAt: bigint("created_at", { mode: "number" }).notNull(),
  updatedAt: bigint("updated_at", { mode: "number" }).notNull(),
}, (table) => ({
  budgetIdx: index("idx_budgetcf_budget").on(table.budgetId),
  monthIdx: index("idx_budgetcf_month").on(table.monthNumber),
}));
export type ErpBudgetCashflowSnapshot = typeof erpBudgetCashflowSnapshots.$inferSelect;
export type InsertErpBudgetCashflowSnapshot = typeof erpBudgetCashflowSnapshots.$inferInsert;

export const erpBudgetAlerts = mysqlTable("erp_budget_alerts", {
  id: int("id").autoincrement().primaryKey(),
  budgetId: int("budget_id").notNull(),
  budgetLineId: int("budget_line_id"),
  budgetPeriodId: int("budget_period_id"),
  monthNumber: int("month_number"),
  alertType: mysqlEnum("alert_type", ["overrun", "underperformance_revenue", "missing_actual", "budget_not_executed", "cashflow_negative", "capex_overrun", "tax_variance", "payroll_variance"]).notNull(),
  thresholdPercentage: int("threshold_percentage"),
  plannedAmount: bigint("planned_amount", { mode: "number" }).default(0).notNull(),
  actualAmount: bigint("actual_amount", { mode: "number" }).default(0).notNull(),
  varianceAmount: bigint("variance_amount", { mode: "number" }).default(0).notNull(),
  variancePercentage: int("variance_percentage").default(0).notNull(),
  message: text("message"),
  status: mysqlEnum("status", ["active", "acknowledged", "resolved"]).default("active").notNull(),
  createdAt: bigint("created_at", { mode: "number" }).notNull(),
  updatedAt: bigint("updated_at", { mode: "number" }).notNull(),
}, (table) => ({
  budgetIdx: index("idx_budgetalert_budget").on(table.budgetId),
  statusIdx: index("idx_budgetalert_status").on(table.status),
  typeIdx: index("idx_budgetalert_type").on(table.alertType),
}));
export type ErpBudgetAlert = typeof erpBudgetAlerts.$inferSelect;
export type InsertErpBudgetAlert = typeof erpBudgetAlerts.$inferInsert;


// ═══════════════════════════════════════════════════════════════
// Budget V2 — Snapshot Jobs (Sprint Budget 2.1)
// ═══════════════════════════════════════════════════════════════
export const erpBudgetSnapshotJobs = mysqlTable("erp_budget_snapshot_jobs", {
  id: int("id").primaryKey().autoincrement(),
  jobType: varchar("job_type", { length: 50 }).notNull(), // daily_sync | monthly_snapshot | manual_recalculate | generate_all
  budgetId: int("budget_id"),
  periodId: int("period_id"),
  status: varchar("status", { length: 20 }).notNull().default("running"), // running | success | failed | cancelled
  startedAt: bigint("started_at", { mode: "number" }).notNull(),
  finishedAt: bigint("finished_at", { mode: "number" }),
  durationMs: int("duration_ms"),
  snapshotsCreated: int("snapshots_created").default(0),
  snapshotsUpdated: int("snapshots_updated").default(0),
  alertsCreated: int("alerts_created").default(0),
  errorsCount: int("errors_count").default(0),
  errorMessage: text("error_message"),
  triggeredBy: varchar("triggered_by", { length: 100 }), // user_id or "heartbeat" or "manual"
  scheduleCronTaskUid: varchar("schedule_cron_task_uid", { length: 65 }),
  createdAt: bigint("created_at", { mode: "number" }).notNull().$defaultFn(() => Date.now()),
  updatedAt: bigint("updated_at", { mode: "number" }).notNull().$defaultFn(() => Date.now()).$onUpdateFn(() => Date.now()),
}, (table) => ({
  budgetIdx: index("idx_snapshotjob_budget").on(table.budgetId),
  statusIdx: index("idx_snapshotjob_status").on(table.status),
  typeIdx: index("idx_snapshotjob_type").on(table.jobType),
}));
export type ErpBudgetSnapshotJob = typeof erpBudgetSnapshotJobs.$inferSelect;
export type InsertErpBudgetSnapshotJob = typeof erpBudgetSnapshotJobs.$inferInsert;

// ============================================================
// Sprint Budget-Objectifs-Analytique — Tables
// ============================================================

// --- Objectifs Commerciaux ---
export const erpSalesTargets = mysqlTable("erp_sales_targets", {
  id: int("id").autoincrement().primaryKey(),
  targetCode: varchar("target_code", { length: 32 }).notNull().unique(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  fiscalYear: int("fiscal_year").notNull(),
  periodType: varchar("period_type", { length: 16 }).notNull().default("monthly"), // monthly, quarterly, annual
  periodMonth: int("period_month"), // 1-12
  periodQuarter: int("period_quarter"), // 1-4
  programId: int("program_id"),
  projectId: int("project_id"),
  salespersonId: int("salesperson_id"),
  unitType: varchar("unit_type", { length: 64 }),
  targetType: varchar("target_type", { length: 32 }).notNull(), // revenue, reservation, sales_contract, collection, units_sold, margin
  targetAmount: bigint("target_amount", { mode: "number" }).default(0),
  targetUnits: int("target_units").default(0),
  targetMarginAmount: bigint("target_margin_amount", { mode: "number" }).default(0),
  currency: varchar("currency", { length: 8 }).notNull().default("XOF"),
  status: varchar("status", { length: 16 }).notNull().default("draft"), // draft, active, approved, locked, revised, cancelled
  budgetId: int("budget_id"),
  budgetLineId: int("budget_line_id"),
  createdBy: int("created_by"),
  approvedBy: int("approved_by"),
  approvedAt: bigint("approved_at", { mode: "number" }),
  createdAt: bigint("created_at", { mode: "number" }).notNull(),
  updatedAt: bigint("updated_at", { mode: "number" }).notNull(),
  deletedAt: bigint("deleted_at", { mode: "number" }),
}, (table) => ({
  yearIdx: index("idx_sales_targets_year").on(table.fiscalYear),
  typeIdx: index("idx_sales_targets_type").on(table.targetType),
  statusIdx: index("idx_sales_targets_status").on(table.status),
  programIdx: index("idx_sales_targets_program").on(table.programId),
  salespersonIdx: index("idx_sales_targets_sp").on(table.salespersonId),
}));
export type ErpSalesTarget = typeof erpSalesTargets.$inferSelect;

export const erpSalesTargetResults = mysqlTable("erp_sales_target_results", {
  id: int("id").autoincrement().primaryKey(),
  salesTargetId: int("sales_target_id").notNull(),
  periodStart: bigint("period_start", { mode: "number" }).notNull(),
  periodEnd: bigint("period_end", { mode: "number" }).notNull(),
  actualAmount: bigint("actual_amount", { mode: "number" }).default(0),
  actualUnits: int("actual_units").default(0),
  actualMarginAmount: bigint("actual_margin_amount", { mode: "number" }).default(0),
  collectedAmount: bigint("collected_amount", { mode: "number" }).default(0),
  reservedUnits: int("reserved_units").default(0),
  soldUnits: int("sold_units").default(0),
  achievementRate: decimal("achievement_rate", { precision: 7, scale: 2 }).default("0"),
  varianceAmount: bigint("variance_amount", { mode: "number" }).default(0),
  varianceUnits: int("variance_units").default(0),
  variancePercentage: decimal("variance_percentage", { precision: 7, scale: 2 }).default("0"),
  sourceSyncAt: bigint("source_sync_at", { mode: "number" }),
  createdAt: bigint("created_at", { mode: "number" }).notNull(),
  updatedAt: bigint("updated_at", { mode: "number" }).notNull(),
}, (table) => ({
  targetIdx: index("idx_st_results_target").on(table.salesTargetId),
  periodIdx: index("idx_st_results_period").on(table.periodStart, table.periodEnd),
}));
export type ErpSalesTargetResult = typeof erpSalesTargetResults.$inferSelect;

export const erpSalesTargetAssignments = mysqlTable("erp_sales_target_assignments", {
  id: int("id").autoincrement().primaryKey(),
  salesTargetId: int("sales_target_id").notNull(),
  salespersonId: int("salesperson_id"),
  programId: int("program_id"),
  projectId: int("project_id"),
  weightPercentage: decimal("weight_percentage", { precision: 5, scale: 2 }).default("100"),
  assignedTargetAmount: bigint("assigned_target_amount", { mode: "number" }).default(0),
  assignedTargetUnits: int("assigned_target_units").default(0),
  createdAt: bigint("created_at", { mode: "number" }).notNull(),
  updatedAt: bigint("updated_at", { mode: "number" }).notNull(),
}, (table) => ({
  targetIdx: index("idx_st_assign_target").on(table.salesTargetId),
  spIdx: index("idx_st_assign_sp").on(table.salespersonId),
}));
export type ErpSalesTargetAssignment = typeof erpSalesTargetAssignments.$inferSelect;

// --- Budget ↔ Ventes Immobilières ---
export const erpBudgetRealEstateLinks = mysqlTable("erp_budget_re_links", {
  id: int("id").autoincrement().primaryKey(),
  budgetId: int("budget_id").notNull(),
  budgetVersionId: int("budget_version_id"),
  budgetLineId: int("budget_line_id"),
  programId: int("program_id"),
  projectId: int("project_id"),
  unitType: varchar("unit_type", { length: 64 }),
  revenueRecognitionMethod: varchar("revenue_recognition_method", { length: 32 }).notNull().default("contract_signed"), // contract_signed, payment_received, delivery_completed, custom
  createdAt: bigint("created_at", { mode: "number" }).notNull(),
  updatedAt: bigint("updated_at", { mode: "number" }).notNull(),
}, (table) => ({
  budgetIdx: index("idx_bre_links_budget").on(table.budgetId),
  programIdx: index("idx_bre_links_program").on(table.programId),
}));
export type ErpBudgetRealEstateLink = typeof erpBudgetRealEstateLinks.$inferSelect;

export const erpRealEstateBudgetActuals = mysqlTable("erp_re_budget_actuals", {
  id: int("id").autoincrement().primaryKey(),
  budgetId: int("budget_id").notNull(),
  budgetLineId: int("budget_line_id"),
  programId: int("program_id"),
  projectId: int("project_id"),
  unitId: int("unit_id"),
  saleId: int("sale_id"),
  customerId: int("customer_id"),
  periodMonth: int("period_month").notNull(), // 1-12
  periodYear: int("period_year").notNull(),
  saleAmount: bigint("sale_amount", { mode: "number" }).default(0),
  contractSignedAmount: bigint("contract_signed_amount", { mode: "number" }).default(0),
  collectedAmount: bigint("collected_amount", { mode: "number" }).default(0),
  outstandingAmount: bigint("outstanding_amount", { mode: "number" }).default(0),
  recognizedRevenueAmount: bigint("recognized_revenue_amount", { mode: "number" }).default(0),
  costAmount: bigint("cost_amount", { mode: "number" }).default(0),
  marginAmount: bigint("margin_amount", { mode: "number" }).default(0),
  marginRate: decimal("margin_rate", { precision: 7, scale: 2 }).default("0"),
  status: varchar("status", { length: 16 }).notNull().default("active"),
  sourceSyncAt: bigint("source_sync_at", { mode: "number" }),
  createdAt: bigint("created_at", { mode: "number" }).notNull(),
  updatedAt: bigint("updated_at", { mode: "number" }).notNull(),
}, (table) => ({
  budgetIdx: index("idx_re_actuals_budget").on(table.budgetId),
  programIdx: index("idx_re_actuals_program").on(table.programId),
  saleIdx: index("idx_re_actuals_sale").on(table.saleId),
  periodIdx: index("idx_re_actuals_period").on(table.periodYear, table.periodMonth),
}));
export type ErpRealEstateBudgetActual = typeof erpRealEstateBudgetActuals.$inferSelect;

// --- Centres de coût ---
export const erpCostCenters = mysqlTable("erp_cost_centers", {
  id: int("id").autoincrement().primaryKey(),
  code: varchar("code", { length: 32 }).notNull().unique(),
  name: varchar("name", { length: 128 }).notNull(),
  description: text("description"),
  parentId: int("parent_id"),
  managerId: int("manager_id"),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: bigint("created_at", { mode: "number" }).notNull(),
  updatedAt: bigint("updated_at", { mode: "number" }).notNull(),
  deletedAt: bigint("deleted_at", { mode: "number" }),
}, (table) => ({
  parentIdx: index("idx_cost_centers_parent").on(table.parentId),
  activeIdx: index("idx_cost_centers_active").on(table.isActive),
}));
export type ErpCostCenter = typeof erpCostCenters.$inferSelect;

// --- Snapshots analytiques ---
export const erpAnalyticSnapshots = mysqlTable("erp_analytic_snapshots", {
  id: int("id").autoincrement().primaryKey(),
  snapshotDate: bigint("snapshot_date", { mode: "number" }).notNull(),
  periodMonth: int("period_month").notNull(),
  periodYear: int("period_year").notNull(),
  projectId: int("project_id"),
  programId: int("program_id"),
  costCenterId: int("cost_center_id"),
  revenueAmount: bigint("revenue_amount", { mode: "number" }).default(0),
  expenseAmount: bigint("expense_amount", { mode: "number" }).default(0),
  capexAmount: bigint("capex_amount", { mode: "number" }).default(0),
  cashInAmount: bigint("cash_in_amount", { mode: "number" }).default(0),
  cashOutAmount: bigint("cash_out_amount", { mode: "number" }).default(0),
  marginAmount: bigint("margin_amount", { mode: "number" }).default(0),
  marginRate: decimal("margin_rate", { precision: 7, scale: 2 }).default("0"),
  budgetAmount: bigint("budget_amount", { mode: "number" }).default(0),
  actualAmount: bigint("actual_amount", { mode: "number" }).default(0),
  varianceAmount: bigint("variance_amount", { mode: "number" }).default(0),
  variancePercentage: decimal("variance_percentage", { precision: 7, scale: 2 }).default("0"),
  createdAt: bigint("created_at", { mode: "number" }).notNull(),
  updatedAt: bigint("updated_at", { mode: "number" }).notNull(),
}, (table) => ({
  dateIdx: index("idx_analytic_snap_date").on(table.snapshotDate),
  projectIdx: index("idx_analytic_snap_project").on(table.projectId),
  programIdx: index("idx_analytic_snap_program").on(table.programId),
  costCenterIdx: index("idx_analytic_snap_cc").on(table.costCenterId),
  periodIdx: index("idx_analytic_snap_period").on(table.periodYear, table.periodMonth),
}));
export type ErpAnalyticSnapshot = typeof erpAnalyticSnapshots.$inferSelect;

// --- Jobs d'intégration Budget ---
export const erpBudgetIntegrationJobs = mysqlTable("erp_budget_integ_jobs", {
  id: int("id").autoincrement().primaryKey(),
  jobType: varchar("job_type", { length: 32 }).notNull(), // full_sync, sales_targets_sync, real_estate_sync, analytics_sync, alerts_sync
  syncScope: varchar("sync_scope", { length: 32 }).default("all"), // all, active_budgets, current_period, specific_budget
  budgetId: int("budget_id"),
  periodId: int("period_id"),
  status: varchar("status", { length: 20 }).notNull().default("pending"), // pending, running, success, failed, cancelled, partial_success
  startedAt: bigint("started_at", { mode: "number" }),
  finishedAt: bigint("finished_at", { mode: "number" }),
  durationMs: int("duration_ms"),
  recordsProcessed: int("records_processed").default(0),
  recordsCreated: int("records_created").default(0),
  recordsUpdated: int("records_updated").default(0),
  warningsCount: int("warnings_count").default(0),
  errorsCount: int("errors_count").default(0),
  errorMessage: text("error_message"),
  triggeredBy: varchar("triggered_by", { length: 64 }),
  triggerSource: varchar("trigger_source", { length: 16 }).default("system"), // scheduled, manual, system, user
  createdBy: int("created_by"),
  createdAt: bigint("created_at", { mode: "number" }).notNull(),
}, (table) => ({
  typeIdx: index("idx_integ_jobs_type").on(table.jobType),
  statusIdx: index("idx_integ_jobs_status").on(table.status),
  sourceIdx: index("idx_integ_jobs_source").on(table.triggerSource),
}));
export type ErpBudgetIntegrationJob = typeof erpBudgetIntegrationJobs.$inferSelect;
export type InsertErpBudgetIntegrationJob = typeof erpBudgetIntegrationJobs.$inferInsert;

// ═══════════════════════════════════════════════════════════════
// Direction Report Exports (Sprint Direction 360)
// ═══════════════════════════════════════════════════════════════
export const erpDirectionReportExports = mysqlTable("erp_direction_report_exports", {
  id: int("id").autoincrement().primaryKey(),
  exportNumber: varchar("export_number", { length: 32 }).notNull(),
  reportType: varchar("report_type", { length: 32 }).notNull().default("direction_monthly"), // direction_monthly, direction_quarterly, pl_by_cost_center, pl_by_program
  periodId: int("period_id"),
  dateFrom: bigint("date_from", { mode: "number" }),
  dateTo: bigint("date_to", { mode: "number" }),
  filtersJson: json("filters_json"),
  filePath: varchar("file_path", { length: 512 }),
  fileName: varchar("file_name", { length: 255 }),
  fileSize: int("file_size"),
  status: varchar("status", { length: 16 }).notNull().default("pending"), // pending, generated, downloaded, failed, cancelled
  generatedBy: int("generated_by"),
  generatedAt: bigint("generated_at", { mode: "number" }),
  downloadedAt: bigint("downloaded_at", { mode: "number" }),
  createdAt: bigint("created_at", { mode: "number" }).notNull(),
  updatedAt: bigint("updated_at", { mode: "number" }).notNull(),
}, (table) => ({
  statusIdx: index("idx_dir_exports_status").on(table.status),
  dateIdx: index("idx_dir_exports_date").on(table.createdAt),
}));
export type ErpDirectionReportExport = typeof erpDirectionReportExports.$inferSelect;
export type InsertErpDirectionReportExport = typeof erpDirectionReportExports.$inferInsert;


// ============================================================
// SPRINT GOUVERNANCE DIRECTION — Tables
// ============================================================

// --- Diffusion Rapports ---
export const erpDirectionReportSchedules = mysqlTable("erp_direction_report_schedules", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 128 }).notNull(),
  frequency: varchar("frequency", { length: 16 }).notNull().default("monthly"), // monthly, quarterly, weekly
  dayOfMonth: int("day_of_month").default(1),
  sendTime: varchar("send_time", { length: 8 }).default("08:00"), // HH:mm
  timezone: varchar("timezone", { length: 64 }).default("Africa/Abidjan"),
  recipientsJson: json("recipients_json").$type<string[]>(),
  ccJson: json("cc_json").$type<string[]>(),
  includePdfAttachment: boolean("include_pdf_attachment").default(true),
  includeDownloadLink: boolean("include_download_link").default(true),
  isActive: boolean("is_active").default(true),
  lastRunAt: bigint("last_run_at", { mode: "number" }),
  nextRunAt: bigint("next_run_at", { mode: "number" }),
  createdBy: int("created_by"),
  createdAt: bigint("created_at", { mode: "number" }).notNull(),
  updatedAt: bigint("updated_at", { mode: "number" }).notNull(),
}, (table) => ({
  activeIdx: index("idx_dir_schedules_active").on(table.isActive),
}));
export type ErpDirectionReportSchedule = typeof erpDirectionReportSchedules.$inferSelect;
export type InsertErpDirectionReportSchedule = typeof erpDirectionReportSchedules.$inferInsert;

export const erpDirectionReportDeliveries = mysqlTable("erp_direction_report_deliveries", {
  id: int("id").autoincrement().primaryKey(),
  scheduleId: int("schedule_id"),
  exportId: int("export_id"),
  periodId: int("period_id"),
  status: varchar("status", { length: 16 }).notNull().default("pending"), // pending, sent, failed, cancelled
  recipientsJson: json("recipients_json").$type<string[]>(),
  sentAt: bigint("sent_at", { mode: "number" }),
  errorMessage: text("error_message"),
  createdAt: bigint("created_at", { mode: "number" }).notNull(),
  updatedAt: bigint("updated_at", { mode: "number" }).notNull(),
}, (table) => ({
  scheduleIdx: index("idx_dir_deliveries_schedule").on(table.scheduleId),
  statusIdx: index("idx_dir_deliveries_status").on(table.status),
}));
export type ErpDirectionReportDelivery = typeof erpDirectionReportDeliveries.$inferSelect;
export type InsertErpDirectionReportDelivery = typeof erpDirectionReportDeliveries.$inferInsert;

// --- Revue Mensuelle ---
export const erpDirectionReviews = mysqlTable("erp_direction_reviews", {
  id: int("id").autoincrement().primaryKey(),
  reviewNumber: varchar("review_number", { length: 32 }).notNull(),
  periodId: int("period_id"),
  title: varchar("title", { length: 255 }).notNull(),
  reviewDate: bigint("review_date", { mode: "number" }),
  status: varchar("status", { length: 16 }).notNull().default("draft"), // draft, in_review, approved, closed, archived, cancelled
  summary: text("summary"),
  keyRisks: text("key_risks"),
  keyDecisions: text("key_decisions"),
  reportExportId: int("report_export_id"),
  createdBy: int("created_by"),
  approvedBy: int("approved_by"),
  approvedAt: bigint("approved_at", { mode: "number" }),
  closedBy: int("closed_by"),
  closedAt: bigint("closed_at", { mode: "number" }),
  createdAt: bigint("created_at", { mode: "number" }).notNull(),
  updatedAt: bigint("updated_at", { mode: "number" }).notNull(),
  deletedAt: bigint("deleted_at", { mode: "number" }),
}, (table) => ({
  statusIdx: index("idx_dir_reviews_status").on(table.status),
  periodIdx: index("idx_dir_reviews_period").on(table.periodId),
}));
export type ErpDirectionReview = typeof erpDirectionReviews.$inferSelect;
export type InsertErpDirectionReview = typeof erpDirectionReviews.$inferInsert;

export const erpDirectionReviewComments = mysqlTable("erp_direction_review_comments", {
  id: int("id").autoincrement().primaryKey(),
  reviewId: int("review_id").notNull(),
  section: varchar("section", { length: 64 }),
  kpiKey: varchar("kpi_key", { length: 64 }),
  comment: text("comment").notNull(),
  commentType: varchar("comment_type", { length: 32 }).notNull().default("observation"), // observation, risk, decision, recommendation, justification
  createdBy: int("created_by"),
  createdAt: bigint("created_at", { mode: "number" }).notNull(),
  updatedAt: bigint("updated_at", { mode: "number" }).notNull(),
}, (table) => ({
  reviewIdx: index("idx_dir_review_comments_review").on(table.reviewId),
}));
export type ErpDirectionReviewComment = typeof erpDirectionReviewComments.$inferSelect;
export type InsertErpDirectionReviewComment = typeof erpDirectionReviewComments.$inferInsert;

// --- Plans d'Actions ---
export const erpDirectionActionPlans = mysqlTable("erp_direction_action_plans", {
  id: int("id").autoincrement().primaryKey(),
  actionNumber: varchar("action_number", { length: 32 }).notNull(),
  reviewId: int("review_id"),
  alertId: int("alert_id"),
  sourceModule: varchar("source_module", { length: 64 }),
  sourceId: int("source_id"),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  priority: varchar("priority", { length: 16 }).notNull().default("medium"), // low, medium, high, critical
  assignedTo: int("assigned_to"),
  dueDate: bigint("due_date", { mode: "number" }),
  status: varchar("status", { length: 16 }).notNull().default("open"), // open, in_progress, blocked, completed, cancelled, overdue
  progressPercentage: int("progress_percentage").default(0),
  completedAt: bigint("completed_at", { mode: "number" }),
  createdBy: int("created_by"),
  createdAt: bigint("created_at", { mode: "number" }).notNull(),
  updatedAt: bigint("updated_at", { mode: "number" }).notNull(),
  deletedAt: bigint("deleted_at", { mode: "number" }),
}, (table) => ({
  statusIdx: index("idx_dir_actions_status").on(table.status),
  assignedIdx: index("idx_dir_actions_assigned").on(table.assignedTo),
  dueDateIdx: index("idx_dir_actions_due").on(table.dueDate),
  reviewIdx: index("idx_dir_actions_review").on(table.reviewId),
}));
export type ErpDirectionActionPlan = typeof erpDirectionActionPlans.$inferSelect;
export type InsertErpDirectionActionPlan = typeof erpDirectionActionPlans.$inferInsert;

// --- Contrôle Qualité Données ---
export const erpDirectionDataQualityChecks = mysqlTable("erp_direction_data_quality_checks", {
  id: int("id").autoincrement().primaryKey(),
  checkKey: varchar("check_key", { length: 64 }).notNull(),
  checkName: varchar("check_name", { length: 128 }).notNull(),
  module: varchar("module", { length: 64 }).notNull(),
  severity: varchar("severity", { length: 16 }).notNull().default("medium"), // low, medium, high, critical
  status: varchar("status", { length: 16 }).notNull().default("passed"), // passed, warning, failed, ignored
  recordsCount: int("records_count").default(0),
  detailsJson: json("details_json"),
  lastCheckedAt: bigint("last_checked_at", { mode: "number" }),
  createdAt: bigint("created_at", { mode: "number" }).notNull(),
  updatedAt: bigint("updated_at", { mode: "number" }).notNull(),
}, (table) => ({
  checkKeyIdx: index("idx_dir_dq_check_key").on(table.checkKey),
  statusIdx: index("idx_dir_dq_status").on(table.status),
}));
export type ErpDirectionDataQualityCheck = typeof erpDirectionDataQualityChecks.$inferSelect;
export type InsertErpDirectionDataQualityCheck = typeof erpDirectionDataQualityChecks.$inferInsert;

// =============================================
// MODULE COMMANDES CLIENTS (Sales Orders)
// =============================================

// --- Clients entreprises (B2B) ---
export const erpSalesClients = mysqlTable("erp_sales_clients", {
  id: int("id").primaryKey().autoincrement(),
  code: varchar("code", { length: 32 }).notNull().unique(),
  name: varchar("name", { length: 255 }).notNull(),
  shortName: varchar("short_name", { length: 64 }),
  sector: varchar("sector", { length: 100 }), // telecom, energie, btp, public, autre
  contactName: varchar("contact_name", { length: 255 }),
  contactEmail: varchar("contact_email", { length: 255 }),
  contactPhone: varchar("contact_phone", { length: 32 }),
  address: text("address"),
  taxId: varchar("tax_id", { length: 64 }), // NCC / RCCM
  ncc: varchar("ncc", { length: 32 }), // Numéro Compte Contribuable client
  taxRegime: varchar("tax_regime", { length: 32 }), // RNI, RSI, etc.
  rccm: varchar("rccm", { length: 128 }), // RCCM client
  paymentTermsDays: int("payment_terms_days").default(30),
  notes: text("notes"),
  isActive: tinyint("is_active").default(1),
  createdBy: int("created_by").notNull(),
  createdAt: bigint("created_at", { mode: "number" }).notNull(),
  updatedAt: bigint("updated_at", { mode: "number" }).notNull(),
}, (table) => ({
  nameIdx: index("idx_sales_client_name").on(table.name),
  sectorIdx: index("idx_sales_client_sector").on(table.sector),
}));
export type ErpSalesClient = typeof erpSalesClients.$inferSelect;
export type InsertErpSalesClient = typeof erpSalesClients.$inferInsert;

// --- Commandes clients (Sales Orders / Bons de commande reçus) ---
export const erpSalesOrders = mysqlTable("erp_sales_orders", {
  id: int("id").primaryKey().autoincrement(),
  orderNumber: varchar("order_number", { length: 64 }).notNull().unique(),
  clientId: int("client_id").notNull(),
  clientRef: varchar("client_ref", { length: 128 }), // Référence BC du client
  subject: varchar("subject", { length: 500 }).notNull(),
  description: text("description"),
  status: varchar("status", { length: 32 }).notNull().default("received"), // received, in_progress, delivered, invoiced, paid, cancelled
  priority: varchar("priority", { length: 16 }).default("normal"), // low, normal, high, urgent
  totalHT: bigint("total_ht", { mode: "number" }).default(0), // en FCFA
  taxRate: int("tax_rate").default(18), // TVA %
  totalTTC: bigint("total_ttc", { mode: "number" }).default(0),
  currency: varchar("currency", { length: 8 }).default("XOF"),
  orderDate: bigint("order_date", { mode: "number" }).notNull(), // Date du BC client
  expectedDeliveryDate: bigint("expected_delivery_date", { mode: "number" }),
  deliveredDate: bigint("delivered_date", { mode: "number" }),
  invoiceId: int("invoice_id"), // Lien vers facture émise
  budgetLineId: int("budget_line_id"), // Lien vers ligne budgétaire (recettes)
  periodId: int("period_id"), // Lien vers période budgétaire
  paymentStatus: varchar("payment_status", { length: 32 }).default("pending"), // pending, partial, paid
  paidAmount: bigint("paid_amount", { mode: "number" }).default(0),
  paidDate: bigint("paid_date", { mode: "number" }),
  attachmentUrl: text("attachment_url"), // Scan du BC
  notes: text("notes"),
  createdBy: int("created_by").notNull(),
  assignedTo: int("assigned_to"),
  createdAt: bigint("created_at", { mode: "number" }).notNull(),
  updatedAt: bigint("updated_at", { mode: "number" }).notNull(),
}, (table) => ({
  clientIdx: index("idx_so_client").on(table.clientId),
  statusIdx: index("idx_so_status").on(table.status),
  orderDateIdx: index("idx_so_order_date").on(table.orderDate),
  invoiceIdx: index("idx_so_invoice").on(table.invoiceId),
}));
export type ErpSalesOrder = typeof erpSalesOrders.$inferSelect;
export type InsertErpSalesOrder = typeof erpSalesOrders.$inferInsert;

// --- Lignes de commande client ---
export const erpSalesOrderLines = mysqlTable("erp_sales_order_lines", {
  id: int("id").primaryKey().autoincrement(),
  orderId: int("order_id").notNull(),
  lineNumber: int("line_number").notNull(),
  description: varchar("description", { length: 500 }).notNull(),
  quantity: int("quantity").default(1),
  unit: varchar("unit", { length: 32 }).default("unité"), // unité, jour, mois, forfait, m², ml
  unitPriceHT: bigint("unit_price_ht", { mode: "number" }).notNull(),
  totalHT: bigint("total_ht", { mode: "number" }).notNull(),
  deliveryStatus: varchar("delivery_status", { length: 32 }).default("pending"), // pending, partial, delivered
  deliveredQuantity: int("delivered_quantity").default(0),
  notes: text("notes"),
  createdAt: bigint("created_at", { mode: "number" }).notNull(),
}, (table) => ({
  orderIdx: index("idx_sol_order").on(table.orderId),
}));
export type ErpSalesOrderLine = typeof erpSalesOrderLines.$inferSelect;
export type InsertErpSalesOrderLine = typeof erpSalesOrderLines.$inferInsert;

// --- Historique des changements de statut ---
export const erpSalesOrderHistory = mysqlTable("erp_sales_order_history", {
  id: int("id").primaryKey().autoincrement(),
  orderId: int("order_id").notNull(),
  fromStatus: varchar("from_status", { length: 32 }).notNull(),
  toStatus: varchar("to_status", { length: 32 }).notNull(),
  comment: text("comment"),
  changedBy: int("changed_by").notNull(),
  changedAt: bigint("changed_at", { mode: "number" }).notNull(),
}, (table) => ({
  orderIdx: index("idx_soh_order").on(table.orderId),
}));
export type ErpSalesOrderHistory = typeof erpSalesOrderHistory.$inferSelect;


// --- Paramètres société (pour facturation normalisée CI) ---
export const erpCompanySettings = mysqlTable("erp_company_settings", {
  id: int("id").primaryKey().autoincrement(),
  companyName: varchar("company_name", { length: 255 }).notNull(),
  ncc: varchar("ncc", { length: 32 }), // Numéro de Compte Contribuable
  rccm: varchar("rccm", { length: 128 }), // Registre du Commerce
  rccmDate: varchar("rccm_date", { length: 32 }), // Date d'immatriculation RCCM
  taxRegime: varchar("tax_regime", { length: 32 }), // RSI, RNI, etc.
  taxCenter: varchar("tax_center", { length: 255 }), // Centre des impôts
  address: text("address"),
  city: varchar("city", { length: 100 }),
  postalBox: varchar("postal_box", { length: 64 }), // BP
  phone: varchar("phone", { length: 32 }),
  email: varchar("email", { length: 255 }),
  website: varchar("website", { length: 255 }),
  bankReferences: text("bank_references"),
  logoUrl: varchar("logo_url", { length: 512 }),
  invoicePrefix: varchar("invoice_prefix", { length: 16 }), // Préfixe pour numérotation
  invoiceNextSeq: bigint("invoice_next_seq", { mode: "number" }).default(1),
  poPrefix: varchar("po_prefix", { length: 16 }).default("BC"), // Préfixe bon de commande (ex: OCI)
  poNextSeq: bigint("po_next_seq", { mode: "number" }).default(1), // Séquence auto-incrémentée BC
  defaultPaymentTerms: varchar("default_payment_terms", { length: 255 }).default("Un mois date de dépôt de facture"),
  defaultPaymentMode: varchar("default_payment_mode", { length: 64 }).default("Virement"),
  defaultTaxRate: int("default_tax_rate").default(18), // TVA 18% CI
  createdAt: bigint("created_at", { mode: "number" }).notNull(),
  updatedAt: bigint("updated_at", { mode: "number" }).notNull(),
});
export type ErpCompanySettings = typeof erpCompanySettings.$inferSelect;
export type InsertErpCompanySettings = typeof erpCompanySettings.$inferInsert;


// ===== AI PLAN ANALYZER MODULE =====

export const erpAiPlanAnalyses = mysqlTable("erp_ai_plan_analyses", {
  id: int("id").primaryKey().autoincrement(),
  analysisNumber: varchar("analysis_number", { length: 32 }).notNull(),
  projectId: int("project_id"),
  documentId: int("document_id"),
  fileName: varchar("file_name", { length: 255 }).notNull(),
  fileUrl: text("file_url").notNull(),
  fileKey: varchar("file_key", { length: 255 }).notNull(),
  fileType: varchar("file_type", { length: 16 }).notNull(), // pdf, jpg, png
  planType: varchar("plan_type", { length: 32 }).notNull().default("unknown"), // architectural, structural, plumbing, electrical, foundation, reinforcement, vrd, mixed, unknown
  scaleDetected: varchar("scale_detected", { length: 32 }),
  scaleConfirmed: varchar("scale_confirmed", { length: 32 }),
  floorLevel: varchar("floor_level", { length: 32 }),
  hypotheses: text("hypotheses"),
  analysisStatus: varchar("analysis_status", { length: 32 }).notNull().default("pending"), // pending, analyzing, completed, failed, reviewed, validated, rejected
  confidenceScore: int("confidence_score"), // 0-100
  aiRawResponse: text("ai_raw_response"),
  createdBy: int("created_by").notNull(),
  reviewedBy: int("reviewed_by"),
  reviewedAt: bigint("reviewed_at", { mode: "number" }),
  validatedBy: int("validated_by"),
  validatedAt: bigint("validated_at", { mode: "number" }),
  createdAt: bigint("created_at", { mode: "number" }).notNull(),
  updatedAt: bigint("updated_at", { mode: "number" }).notNull(),
  deletedAt: bigint("deleted_at", { mode: "number" }),
}, (table) => ({
  projectIdx: index("idx_ai_plan_analyses_project").on(table.projectId),
  statusIdx: index("idx_ai_plan_analyses_status").on(table.analysisStatus),
}));
export type ErpAiPlanAnalysis = typeof erpAiPlanAnalyses.$inferSelect;

export const erpAiPlanElements = mysqlTable("erp_ai_plan_elements", {
  id: int("id").primaryKey().autoincrement(),
  planAnalysisId: int("plan_analysis_id").notNull(),
  elementType: varchar("element_type", { length: 32 }).notNull(), // wall, column, beam, slab, foundation, footing, door, window, stair, room, pipe, electrical_point, plumbing_point, other
  elementLabel: varchar("element_label", { length: 128 }),
  floorLevel: varchar("floor_level", { length: 32 }),
  zone: varchar("zone", { length: 64 }),
  coordinatesJson: text("coordinates_json"),
  dimensionsJson: text("dimensions_json"),
  area: decimal("area", { precision: 12, scale: 3 }),
  length: decimal("length", { precision: 12, scale: 3 }),
  width: decimal("width", { precision: 12, scale: 3 }),
  height: decimal("height", { precision: 12, scale: 3 }),
  volume: decimal("volume", { precision: 12, scale: 3 }),
  unit: varchar("unit", { length: 16 }).default("m"),
  confidenceScore: int("confidence_score"), // 0-100
  status: varchar("status", { length: 32 }).notNull().default("suggested"), // suggested, reviewed, corrected, validated, rejected
  createdAt: bigint("created_at", { mode: "number" }).notNull(),
  updatedAt: bigint("updated_at", { mode: "number" }).notNull(),
}, (table) => ({
  analysisIdx: index("idx_ai_plan_elements_analysis").on(table.planAnalysisId),
  typeIdx: index("idx_ai_plan_elements_type").on(table.elementType),
}));
export type ErpAiPlanElement = typeof erpAiPlanElements.$inferSelect;

export const erpAiMaterialTakeoffs = mysqlTable("erp_ai_material_takeoffs", {
  id: int("id").primaryKey().autoincrement(),
  planAnalysisId: int("plan_analysis_id").notNull(),
  projectId: int("project_id"),
  elementId: int("element_id"),
  materialName: varchar("material_name", { length: 128 }).notNull(),
  category: varchar("category", { length: 32 }).notNull(), // cement, sand, gravel, concrete, rebar, blocks, plumbing, electrical, finishing, other
  unit: varchar("unit", { length: 16 }).notNull(),
  calculatedQuantity: decimal("calculated_quantity", { precision: 14, scale: 3 }).notNull(),
  wasteRate: decimal("waste_rate", { precision: 5, scale: 2 }).default("5.00"),
  recommendedQuantity: decimal("recommended_quantity", { precision: 14, scale: 3 }).notNull(),
  purchaseUnit: varchar("purchase_unit", { length: 32 }),
  purchaseQuantity: decimal("purchase_quantity", { precision: 14, scale: 3 }),
  unitPrice: int("unit_price"), // centimes
  estimatedCost: int("estimated_cost"), // centimes
  calculationMethod: varchar("calculation_method", { length: 64 }),
  assumptionsJson: text("assumptions_json"),
  confidenceScore: int("confidence_score"), // 0-100
  status: varchar("status", { length: 32 }).notNull().default("suggested"), // draft, suggested, reviewed, corrected, validated, rejected, exported
  reviewedBy: int("reviewed_by"),
  validatedBy: int("validated_by"),
  createdAt: bigint("created_at", { mode: "number" }).notNull(),
  updatedAt: bigint("updated_at", { mode: "number" }).notNull(),
}, (table) => ({
  analysisIdx: index("idx_ai_material_takeoffs_analysis").on(table.planAnalysisId),
  categoryIdx: index("idx_ai_material_takeoffs_category").on(table.category),
}));
export type ErpAiMaterialTakeoff = typeof erpAiMaterialTakeoffs.$inferSelect;

export const erpAiEngineeringChecks = mysqlTable("erp_ai_engineering_checks", {
  id: int("id").primaryKey().autoincrement(),
  planAnalysisId: int("plan_analysis_id").notNull(),
  projectId: int("project_id"),
  checkType: varchar("check_type", { length: 32 }).notNull(), // foundation, column, beam, slab, masonry, plumbing, electrical, safety
  checkName: varchar("check_name", { length: 128 }).notNull(),
  description: text("description"),
  severity: varchar("severity", { length: 16 }).notNull().default("info"), // info, low, medium, high, critical
  status: varchar("status", { length: 32 }).notNull().default("needs_review"), // passed, warning, failed, needs_review, ignored, corrected
  detectedIssue: text("detected_issue"),
  recommendation: text("recommendation"),
  relatedElementId: int("related_element_id"),
  confidenceScore: int("confidence_score"), // 0-100
  requiresEngineerValidation: boolean("requires_engineer_validation").notNull().default(true),
  reviewedBy: int("reviewed_by"),
  reviewedAt: bigint("reviewed_at", { mode: "number" }),
  createdAt: bigint("created_at", { mode: "number" }).notNull(),
  updatedAt: bigint("updated_at", { mode: "number" }).notNull(),
}, (table) => ({
  analysisIdx: index("idx_ai_engineering_checks_analysis").on(table.planAnalysisId),
  severityIdx: index("idx_ai_engineering_checks_severity").on(table.severity),
}));
export type ErpAiEngineeringCheck = typeof erpAiEngineeringChecks.$inferSelect;

export const erpAiConstructionRules = mysqlTable("erp_ai_construction_rules", {
  id: int("id").primaryKey().autoincrement(),
  ruleCode: varchar("rule_code", { length: 32 }).notNull(),
  ruleName: varchar("rule_name", { length: 128 }).notNull(),
  domain: varchar("domain", { length: 32 }).notNull(), // foundation, column, beam, slab, masonry, plumbing, electrical, safety, quantity, budget
  description: text("description"),
  ruleType: varchar("rule_type", { length: 32 }).notNull().default("check"), // check, warning, calculation, constraint
  parametersJson: text("parameters_json"),
  sourceReference: varchar("source_reference", { length: 255 }),
  isActive: boolean("is_active").notNull().default(true),
  requiresValidation: boolean("requires_validation").notNull().default(true),
  createdBy: int("created_by").notNull(),
  createdAt: bigint("created_at", { mode: "number" }).notNull(),
  updatedAt: bigint("updated_at", { mode: "number" }).notNull(),
});
export type ErpAiConstructionRule = typeof erpAiConstructionRules.$inferSelect;

export const erpAiQuantityCoefficients = mysqlTable("erp_ai_quantity_coefficients", {
  id: int("id").primaryKey().autoincrement(),
  coefficientCode: varchar("coefficient_code", { length: 32 }).notNull(),
  name: varchar("name", { length: 128 }).notNull(),
  usageDomain: varchar("usage_domain", { length: 32 }).notNull(), // concrete, masonry, rebar, plumbing, electrical, finishing
  inputUnit: varchar("input_unit", { length: 16 }).notNull(),
  outputUnit: varchar("output_unit", { length: 16 }).notNull(),
  coefficientValue: decimal("coefficient_value", { precision: 12, scale: 4 }).notNull(),
  wasteRateDefault: decimal("waste_rate_default", { precision: 5, scale: 2 }).notNull().default("5.00"),
  description: text("description"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: bigint("created_at", { mode: "number" }).notNull(),
  updatedAt: bigint("updated_at", { mode: "number" }).notNull(),
});
export type ErpAiQuantityCoefficient = typeof erpAiQuantityCoefficients.$inferSelect;

export const erpAiPlanReviewComments = mysqlTable("erp_ai_plan_review_comments", {
  id: int("id").primaryKey().autoincrement(),
  planAnalysisId: int("plan_analysis_id").notNull(),
  elementId: int("element_id"),
  comment: text("comment").notNull(),
  commentType: varchar("comment_type", { length: 32 }).notNull().default("note"), // correction, validation, warning, engineer_note, architect_note, quantity_note
  createdBy: int("created_by").notNull(),
  createdAt: bigint("created_at", { mode: "number" }).notNull(),
  updatedAt: bigint("updated_at", { mode: "number" }).notNull(),
}, (table) => ({
  analysisIdx: index("idx_ai_plan_review_comments_analysis").on(table.planAnalysisId),
}));
export type ErpAiPlanReviewComment = typeof erpAiPlanReviewComments.$inferSelect;


// ============================================================
// ERP AI ASSISTANT — TABLES (Sprint IA 1)
// ============================================================

export const erpAiConversations = mysqlTable("erp_ai_conversations", {
  id: int("id").primaryKey().autoincrement(),
  userId: int("user_id").notNull(),
  module: varchar("module", { length: 64 }).notNull().default("general"),
  title: varchar("title", { length: 255 }),
  status: varchar("status", { length: 32 }).notNull().default("active"),
  messageCount: int("message_count").notNull().default(0),
  lastMessageAt: bigint("last_message_at", { mode: "number" }),
  contextProjectId: int("context_project_id"),
  contextBudgetId: int("context_budget_id"),
  createdAt: bigint("created_at", { mode: "number" }).notNull(),
  updatedAt: bigint("updated_at", { mode: "number" }).notNull(),
}, (table) => ({
  userIdx: index("idx_ai_conversations_user").on(table.userId),
  moduleIdx: index("idx_ai_conversations_module").on(table.module),
  statusIdx: index("idx_ai_conversations_status").on(table.status),
}));
export type ErpAiConversation = typeof erpAiConversations.$inferSelect;

export const erpAiMessages = mysqlTable("erp_ai_messages", {
  id: int("id").primaryKey().autoincrement(),
  conversationId: int("conversation_id").notNull(),
  role: varchar("role", { length: 16 }).notNull(),
  content: text("content").notNull(),
  sourceContextJson: text("source_context_json"),
  tokensUsed: int("tokens_used"),
  modelName: varchar("model_name", { length: 64 }),
  createdAt: bigint("created_at", { mode: "number" }).notNull(),
}, (table) => ({
  conversationIdx: index("idx_ai_messages_conversation").on(table.conversationId),
}));
export type ErpAiMessage = typeof erpAiMessages.$inferSelect;

export const erpAiRecommendations = mysqlTable("erp_ai_recommendations", {
  id: int("id").primaryKey().autoincrement(),
  module: varchar("module", { length: 64 }).notNull(),
  sourceType: varchar("source_type", { length: 64 }).notNull(),
  sourceId: int("source_id"),
  recommendationType: varchar("recommendation_type", { length: 64 }).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description").notNull(),
  confidenceScore: int("confidence_score"),
  priority: varchar("priority", { length: 16 }).notNull().default("medium"),
  status: varchar("status", { length: 32 }).notNull().default("suggested"),
  generatedBy: varchar("generated_by", { length: 64 }).notNull().default("assistant"),
  validatedBy: int("validated_by"),
  validatedAt: bigint("validated_at", { mode: "number" }),
  rejectedBy: int("rejected_by"),
  rejectedAt: bigint("rejected_at", { mode: "number" }),
  appliedBy: int("applied_by"),
  appliedAt: bigint("applied_at", { mode: "number" }),
  actionPayloadJson: text("action_payload_json"),
  createdAt: bigint("created_at", { mode: "number" }).notNull(),
  updatedAt: bigint("updated_at", { mode: "number" }).notNull(),
}, (table) => ({
  moduleIdx: index("idx_ai_recommendations_module").on(table.module),
  statusIdx: index("idx_ai_recommendations_status").on(table.status),
  priorityIdx: index("idx_ai_recommendations_priority").on(table.priority),
  sourceIdx: index("idx_ai_recommendations_source").on(table.sourceType, table.sourceId),
}));
export type ErpAiRecommendation = typeof erpAiRecommendations.$inferSelect;

export const erpAiDocumentExtractions = mysqlTable("erp_ai_document_extractions", {
  id: int("id").primaryKey().autoincrement(),
  documentId: int("document_id"),
  documentType: varchar("document_type", { length: 64 }).notNull(),
  fileUrl: text("file_url"),
  extractedDataJson: text("extracted_data_json"),
  confidenceScore: int("confidence_score"),
  status: varchar("status", { length: 32 }).notNull().default("pending"),
  validatedBy: int("validated_by"),
  validatedAt: bigint("validated_at", { mode: "number" }),
  rejectedBy: int("rejected_by"),
  rejectedAt: bigint("rejected_at", { mode: "number" }),
  createdBy: int("created_by").notNull(),
  createdAt: bigint("created_at", { mode: "number" }).notNull(),
  updatedAt: bigint("updated_at", { mode: "number" }).notNull(),
}, (table) => ({
  documentIdx: index("idx_ai_doc_extractions_document").on(table.documentId),
  typeIdx: index("idx_ai_doc_extractions_type").on(table.documentType),
  statusIdx: index("idx_ai_doc_extractions_status").on(table.status),
}));
export type ErpAiDocumentExtraction = typeof erpAiDocumentExtractions.$inferSelect;

export const erpAiRiskScores = mysqlTable("erp_ai_risk_scores", {
  id: int("id").primaryKey().autoincrement(),
  module: varchar("module", { length: 64 }).notNull(),
  sourceType: varchar("source_type", { length: 64 }).notNull(),
  sourceId: int("source_id"),
  riskType: varchar("risk_type", { length: 64 }).notNull(),
  riskScore: int("risk_score").notNull(),
  riskLevel: varchar("risk_level", { length: 16 }).notNull(),
  explanation: text("explanation"),
  recommendedAction: text("recommended_action"),
  isActive: boolean("is_active").notNull().default(true),
  createdBy: int("created_by"),
  createdAt: bigint("created_at", { mode: "number" }).notNull(),
  updatedAt: bigint("updated_at", { mode: "number" }).notNull(),
}, (table) => ({
  moduleIdx: index("idx_ai_risk_scores_module").on(table.module),
  sourceIdx: index("idx_ai_risk_scores_source").on(table.sourceType, table.sourceId),
  levelIdx: index("idx_ai_risk_scores_level").on(table.riskLevel),
}));
export type ErpAiRiskScore = typeof erpAiRiskScores.$inferSelect;

export const erpAiAuditLogs = mysqlTable("erp_ai_audit_logs", {
  id: int("id").primaryKey().autoincrement(),
  userId: int("user_id").notNull(),
  module: varchar("module", { length: 64 }).notNull(),
  action: varchar("action", { length: 64 }).notNull(),
  promptHash: varchar("prompt_hash", { length: 64 }),
  modelName: varchar("model_name", { length: 64 }),
  inputSummary: text("input_summary"),
  outputSummary: text("output_summary"),
  tokensUsed: int("tokens_used"),
  durationMs: int("duration_ms"),
  status: varchar("status", { length: 32 }).notNull().default("success"),
  errorMessage: text("error_message"),
  createdAt: bigint("created_at", { mode: "number" }).notNull(),
}, (table) => ({
  userIdx: index("idx_ai_audit_logs_user").on(table.userId),
  moduleIdx: index("idx_ai_audit_logs_module").on(table.module),
  actionIdx: index("idx_ai_audit_logs_action").on(table.action),
  createdAtIdx: index("idx_ai_audit_logs_created").on(table.createdAt),
}));
export type ErpAiAuditLog = typeof erpAiAuditLogs.$inferSelect;


// ─── Sprint IA 2 Lot 1 — OCR, Classification Documentaire ───────────────────

export const erpAiDocumentJobs = mysqlTable("erp_ai_document_jobs", {
  id: int("id").primaryKey().autoincrement(),
  jobNumber: varchar("job_number", { length: 32 }).notNull(),
  documentId: int("document_id"),
  sourceModule: varchar("source_module", { length: 64 }),
  sourceType: varchar("source_type", { length: 64 }),
  sourceId: int("source_id"),
  fileName: varchar("file_name", { length: 255 }).notNull(),
  fileType: varchar("file_type", { length: 64 }).notNull(),
  fileSize: int("file_size").default(0),
  fileUrl: text("file_url"),
  jobStatus: varchar("job_status", { length: 32 }).notNull().default("pending"),
  ocrStatus: varchar("ocr_status", { length: 32 }).notNull().default("pending"),
  classificationStatus: varchar("classification_status", { length: 32 }).notNull().default("pending"),
  detectedDocumentType: varchar("detected_document_type", { length: 64 }),
  confirmedDocumentType: varchar("confirmed_document_type", { length: 64 }),
  confidenceScore: int("confidence_score"),
  startedAt: bigint("started_at", { mode: "number" }),
  finishedAt: bigint("finished_at", { mode: "number" }),
  durationMs: int("duration_ms"),
  errorMessage: text("error_message"),
  createdBy: int("created_by").notNull(),
  reviewedBy: int("reviewed_by"),
  reviewedAt: bigint("reviewed_at", { mode: "number" }),
  validatedBy: int("validated_by"),
  validatedAt: bigint("validated_at", { mode: "number" }),
  rejectedBy: int("rejected_by"),
  rejectedAt: bigint("rejected_at", { mode: "number" }),
  rejectionReason: text("rejection_reason"),
  createdAt: bigint("created_at", { mode: "number" }).notNull(),
  updatedAt: bigint("updated_at", { mode: "number" }).notNull(),
  deletedAt: bigint("deleted_at", { mode: "number" }),
}, (table) => ({
  jobNumberIdx: index("idx_ai_doc_jobs_number").on(table.jobNumber),
  documentIdx: index("idx_ai_doc_jobs_document").on(table.documentId),
  statusIdx: index("idx_ai_doc_jobs_status").on(table.jobStatus),
  ocrStatusIdx: index("idx_ai_doc_jobs_ocr_status").on(table.ocrStatus),
  classStatusIdx: index("idx_ai_doc_jobs_class_status").on(table.classificationStatus),
  createdByIdx: index("idx_ai_doc_jobs_created_by").on(table.createdBy),
  createdAtIdx: index("idx_ai_doc_jobs_created_at").on(table.createdAt),
}));
export type ErpAiDocumentJob = typeof erpAiDocumentJobs.$inferSelect;

export const erpAiOcrResults = mysqlTable("erp_ai_ocr_results", {
  id: int("id").primaryKey().autoincrement(),
  documentJobId: int("document_job_id").notNull(),
  documentId: int("document_id"),
  ocrEngine: varchar("ocr_engine", { length: 64 }).notNull().default("llm_vision"),
  language: varchar("language", { length: 16 }),
  rawText: text("raw_text"),
  cleanedText: text("cleaned_text"),
  pagesCount: int("pages_count").default(0),
  pageResultsJson: text("page_results_json"),
  confidenceScore: int("confidence_score"),
  processingTimeMs: int("processing_time_ms"),
  createdAt: bigint("created_at", { mode: "number" }).notNull(),
  updatedAt: bigint("updated_at", { mode: "number" }).notNull(),
}, (table) => ({
  jobIdx: index("idx_ai_ocr_results_job").on(table.documentJobId),
  documentIdx: index("idx_ai_ocr_results_document").on(table.documentId),
}));
export type ErpAiOcrResult = typeof erpAiOcrResults.$inferSelect;

export const erpAiDocumentClassifications = mysqlTable("erp_ai_document_classifications", {
  id: int("id").primaryKey().autoincrement(),
  documentJobId: int("document_job_id").notNull(),
  documentId: int("document_id"),
  detectedDocumentType: varchar("detected_document_type", { length: 64 }).notNull(),
  confirmedDocumentType: varchar("confirmed_document_type", { length: 64 }),
  recommendedModule: varchar("recommended_module", { length: 64 }),
  confidenceScore: int("confidence_score"),
  classificationReason: text("classification_reason"),
  alternativeTypesJson: text("alternative_types_json"),
  status: varchar("status", { length: 32 }).notNull().default("suggested"),
  correctedBy: int("corrected_by"),
  correctedAt: bigint("corrected_at", { mode: "number" }),
  reviewedBy: int("reviewed_by"),
  reviewedAt: bigint("reviewed_at", { mode: "number" }),
  validatedBy: int("validated_by"),
  validatedAt: bigint("validated_at", { mode: "number" }),
  createdAt: bigint("created_at", { mode: "number" }).notNull(),
  updatedAt: bigint("updated_at", { mode: "number" }).notNull(),
}, (table) => ({
  jobIdx: index("idx_ai_doc_class_job").on(table.documentJobId),
  documentIdx: index("idx_ai_doc_class_document").on(table.documentId),
  statusIdx: index("idx_ai_doc_class_status").on(table.status),
  typeIdx: index("idx_ai_doc_class_type").on(table.detectedDocumentType),
}));
export type ErpAiDocumentClassification = typeof erpAiDocumentClassifications.$inferSelect;

export const erpAiDocumentValidationLogs = mysqlTable("erp_ai_document_validation_logs", {
  id: int("id").primaryKey().autoincrement(),
  documentJobId: int("document_job_id").notNull(),
  classificationId: int("classification_id"),
  action: varchar("action", { length: 64 }).notNull(),
  oldDocumentType: varchar("old_document_type", { length: 64 }),
  newDocumentType: varchar("new_document_type", { length: 64 }),
  comments: text("comments"),
  performedBy: int("performed_by").notNull(),
  performedAt: bigint("performed_at", { mode: "number" }).notNull(),
  createdAt: bigint("created_at", { mode: "number" }).notNull(),
}, (table) => ({
  jobIdx: index("idx_ai_doc_val_logs_job").on(table.documentJobId),
  classIdx: index("idx_ai_doc_val_logs_class").on(table.classificationId),
  actionIdx: index("idx_ai_doc_val_logs_action").on(table.action),
  performedByIdx: index("idx_ai_doc_val_logs_performed_by").on(table.performedBy),
}));
export type ErpAiDocumentValidationLog = typeof erpAiDocumentValidationLogs.$inferSelect;
