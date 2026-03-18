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
  varchar,
} from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["citizen", "agent_terrain", "bank", "admin"]).default("citizen").notNull(),
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
  zoneCode: varchar("zoneCode", { length: 32 }).notNull(),
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
