import {
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
  boolean,
  json,
  bigint,
} from "drizzle-orm/mysql-core";

// ─── Users ───────────────────────────────────────────────────────────
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

// ─── Parcels ─────────────────────────────────────────────────────────
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
  ownerId: int("ownerId"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  createdById: int("createdById"),
});

export type Parcel = typeof parcels.$inferSelect;
export type InsertParcel = typeof parcels.$inferInsert;

// ─── Parcel Events (timeline) ────────────────────────────────────────
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

// ─── Documents (fichiers autorisés par parcelle) ─────────────────────
export const documents = mysqlTable("documents", {
  id: int("id").autoincrement().primaryKey(),
  parcelId: int("parcelId").notNull(),
  ownerId: int("ownerId").notNull(),
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
  createdById: int("createdById"),
});

export type Document = typeof documents.$inferSelect;
export type InsertDocument = typeof documents.$inferInsert;

// ─── Verify Tokens ───────────────────────────────────────────────────
export const verifyTokens = mysqlTable("verify_tokens", {
  id: int("id").autoincrement().primaryKey(),
  tokenHash: varchar("tokenHash", { length: 128 }).notNull().unique(),
  tokenType: mysqlEnum("tokenType", [
    "insurance",
    "mediation",
    "notary",
    "export",
    "parcel",
  ]).notNull(),
  targetId: int("targetId").notNull(),
  status: mysqlEnum("status", ["active", "rotated", "revoked"]).default("active").notNull(),
  issuedMonth: varchar("issuedMonth", { length: 16 }),
  expiresAt: timestamp("expiresAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  createdById: int("createdById"),
});

export type VerifyToken = typeof verifyTokens.$inferSelect;
export type InsertVerifyToken = typeof verifyTokens.$inferInsert;

// ─── Attestations ────────────────────────────────────────────────────
export const attestations = mysqlTable("attestations", {
  id: int("id").autoincrement().primaryKey(),
  parcelId: int("parcelId").notNull(),
  attestationType: mysqlEnum("attestationType", [
    "insurance",
    "mediation_pv",
    "notary_act",
    "terrain_report",
    "credit",
  ]).notNull(),
  tokenId: int("tokenId"),
  status: mysqlEnum("status", ["draft", "issued", "revoked"]).default("draft").notNull(),
  issuedAt: timestamp("issuedAt"),
  metadata: json("metadata").$type<Record<string, unknown>>(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  createdById: int("createdById"),
});

export type Attestation = typeof attestations.$inferSelect;
export type InsertAttestation = typeof attestations.$inferInsert;

// ─── Audit Events ────────────────────────────────────────────────────
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

// ─── Verify Rate Limits ──────────────────────────────────────────────
export const verifyRateLimits = mysqlTable("verify_rate_limits", {
  id: int("id").autoincrement().primaryKey(),
  ipHash: varchar("ipHash", { length: 64 }).notNull(),
  hitCount: int("hitCount").default(0).notNull(),
  windowStart: bigint("windowStart", { mode: "number" }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type VerifyRateLimit = typeof verifyRateLimits.$inferSelect;

// ─── Credit Files (Dossiers de crédit habitat) ──────────────────────────
export const creditFiles = mysqlTable("credit_files", {
  id: int("id").autoincrement().primaryKey(),
  initiatorId: int("initiatorId").notNull(), // Citoyen qui crée le dossier
  parcelId: int("parcelId"), // Parcelle optionnelle
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
  closedAt: timestamp("closedAt"),
});

export type CreditFile = typeof creditFiles.$inferSelect;
export type InsertCreditFile = typeof creditFiles.$inferInsert;

// ─── Credit File Participants ────────────────────────────────────────────
export const creditFileParticipants = mysqlTable("credit_file_participants", {
  id: int("id").autoincrement().primaryKey(),
  creditFileId: int("creditFileId").notNull(),
  userId: int("userId").notNull(),
  role: mysqlEnum("role", ["initiator", "co_borrower", "guarantor"]).notNull(),
  consentGiven: boolean("consentGiven").default(false).notNull(),
  consentGivenAt: timestamp("consentGivenAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type CreditFileParticipant = typeof creditFileParticipants.$inferSelect;
export type InsertCreditFileParticipant = typeof creditFileParticipants.$inferInsert;

// ─── Credit Documents (Pièces du dossier crédit) ──────────────────────────
export const creditDocuments = mysqlTable("credit_documents", {
  id: int("id").autoincrement().primaryKey(),
  creditFileId: int("creditFileId").notNull(),
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
  rejectionReason: text("rejectionReason"),
  uploadedAt: timestamp("uploadedAt"),
  validatedAt: timestamp("validatedAt"),
  validatedById: int("validatedById"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type CreditDocument = typeof creditDocuments.$inferSelect;
export type InsertCreditDocument = typeof creditDocuments.$inferInsert;

// ─── Credit Requests (Demandes d'informations/documents) ─────────────────
export const creditRequests = mysqlTable("credit_requests", {
  id: int("id").autoincrement().primaryKey(),
  creditFileId: int("creditFileId").notNull(),
  requestType: mysqlEnum("requestType", ["DOCUMENT_REQUEST", "INFORMATION_REQUEST"]).notNull(),
  description: text("description").notNull(),
  requestedDocumentTypes: json("requestedDocumentTypes").$type<string[]>(),
  status: mysqlEnum("status", ["pending", "fulfilled", "expired"]).default("pending").notNull(),
  dueDate: timestamp("dueDate"),
  fulfilledAt: timestamp("fulfilledAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  createdById: int("createdById"),
});

export type CreditRequest = typeof creditRequests.$inferSelect;
export type InsertCreditRequest = typeof creditRequests.$inferInsert;

// ─── Credit Offers (Offres bancaires) ────────────────────────────────────
export const creditOffers = mysqlTable("credit_offers", {
  id: int("id").autoincrement().primaryKey(),
  creditFileId: int("creditFileId").notNull(),
  bankId: int("bankId").notNull(),
  amount: int("amount").notNull(), // En cents
  interestRate: varchar("interestRate", { length: 32 }).notNull(),
  duration: int("duration").notNull(), // En mois
  monthlyPayment: int("monthlyPayment"), // En cents
  status: mysqlEnum("status", ["pending", "accepted", "rejected", "expired"]).default("pending").notNull(),
  expiresAt: timestamp("expiresAt"),
  acceptedAt: timestamp("acceptedAt"),
  rejectedAt: timestamp("rejectedAt"),
  metadata: json("metadata").$type<Record<string, unknown>>(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type CreditOffer = typeof creditOffers.$inferSelect;
export type InsertCreditOffer = typeof creditOffers.$inferInsert;

// ─── Credit Decisions (Décisions finales) ────────────────────────────────
export const creditDecisions = mysqlTable("credit_decisions", {
  id: int("id").autoincrement().primaryKey(),
  creditFileId: int("creditFileId").notNull(),
  decisionType: mysqlEnum("decisionType", ["APPROVED", "REJECTED"]).notNull(),
  reason: text("reason"),
  approvedAmount: int("approvedAmount"), // En cents
  decisionDetails: json("decisionDetails").$type<Record<string, unknown>>(),
  decidedAt: timestamp("decidedAt").defaultNow().notNull(),
  decidedById: int("decidedById"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type CreditDecision = typeof creditDecisions.$inferSelect;
export type InsertCreditDecision = typeof creditDecisions.$inferInsert;
