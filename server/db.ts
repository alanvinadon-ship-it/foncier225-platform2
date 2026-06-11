import { eq, desc, and, sql, gte, lte, like, inArray } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  InsertUser, users,
  parcels, InsertParcel, Parcel,
  parcelEvents, InsertParcelEvent,
  verifyTokens, InsertVerifyToken,
  attestations, InsertAttestation,
  generatedDocuments, InsertGeneratedDocument,
  auditEvents, InsertAuditEvent,
  verifyRateLimits,
  documents, InsertDocument,
  creditFiles, CreditFile, InsertCreditFile,
  creditFileParticipants, InsertCreditFileParticipant,
  creditDocuments, InsertCreditDocument,
  creditRequests, InsertCreditRequest,
  creditOffers, InsertCreditOffer,
  creditDecisions, InsertCreditDecision,
  villageTerritories, InsertVillageTerritory, VillageTerritory,
  territoryBoundaryPoints, InsertTerritoryBoundaryPoint,
  territoryDocuments, InsertTerritoryDocument,
  territoryStatusHistory, InsertTerritoryStatusHistory,
  citizenNotifications, InsertCitizenNotification,
  notificationPreferences, InsertNotificationPreference,
  systemConfig,
} from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// ─── Users ───────────────────────────────────────────────────────────
export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) { console.warn("[Database] Cannot upsert user: database not available"); return; }

  try {
    const values: InsertUser = { openId: user.openId };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];
    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };
    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) { values.lastSignedIn = user.lastSignedIn; updateSet.lastSignedIn = user.lastSignedIn; }
    if (user.role !== undefined) { values.role = user.role; updateSet.role = user.role; }
    else if (user.openId === ENV.ownerOpenId) { values.role = 'admin'; updateSet.role = 'admin'; }
    if (!values.lastSignedIn) values.lastSignedIn = new Date();
    if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();

    await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
  } catch (error) { console.error("[Database] Failed to upsert user:", error); throw error; }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getUserById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function listUsers(limit = 50, offset = 0) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(users).orderBy(desc(users.createdAt)).limit(limit).offset(offset);
}

export async function countUsers() {
  const db = await getDb();
  if (!db) return 0;
  const result = await db.select({ count: sql<number>`count(*)` }).from(users);
  return result[0]?.count ?? 0;
}

export async function updateUserRole(userId: number, role: "citizen" | "agent_terrain" | "bank" | "admin", zoneCodes?: string[]) {
  const db = await getDb();
  if (!db) return;
  const updateData: Record<string, unknown> = { role };
  if (zoneCodes !== undefined) updateData.zoneCodes = zoneCodes;
  await db.update(users).set(updateData).where(eq(users.id, userId));
}

// ─── Parcels ─────────────────────────────────────────────────────────
export async function createParcel(parcel: InsertParcel) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(parcels).values(parcel);
  const result = await db.select().from(parcels).where(eq(parcels.publicToken, parcel.publicToken)).limit(1);
  return result[0];
}

export async function getParcelByPublicToken(publicToken: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(parcels).where(eq(parcels.publicToken, publicToken)).limit(1);
  return result[0];
}

export async function getParcelById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(parcels).where(eq(parcels.id, id)).limit(1);
  return result[0];
}

export async function listParcels(limit = 50, offset = 0) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(parcels).orderBy(desc(parcels.createdAt)).limit(limit).offset(offset);
}

export async function countParcels() {
  const db = await getDb();
  if (!db) return 0;
  const result = await db.select({ count: sql<number>`count(*)` }).from(parcels);
  return result[0]?.count ?? 0;
}

export async function updateParcelStatus(id: number, status: Parcel["statusPublic"]) {
  const db = await getDb();
  if (!db) return;
  await db.update(parcels).set({ statusPublic: status }).where(eq(parcels.id, id));
}

export async function listParcelsByZone(zoneCode: string, limit = 50, offset = 0) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(parcels).where(eq(parcels.zoneCode, zoneCode)).orderBy(desc(parcels.createdAt)).limit(limit).offset(offset);
}

// ─── Citizen-scoped Parcels (strict owner isolation) ─────────────────
export async function listParcelsByOwner(ownerId: number, limit = 50, offset = 0) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(parcels)
    .where(eq(parcels.ownerId, ownerId))
    .orderBy(desc(parcels.createdAt))
    .limit(limit).offset(offset);
}

export async function countParcelsByOwner(ownerId: number) {
  const db = await getDb();
  if (!db) return 0;
  const result = await db.select({ count: sql<number>`count(*)` }).from(parcels)
    .where(eq(parcels.ownerId, ownerId));
  return result[0]?.count ?? 0;
}

export async function getParcelByIdAndOwner(parcelId: number, ownerId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(parcels)
    .where(and(eq(parcels.id, parcelId), eq(parcels.ownerId, ownerId)))
    .limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function updateParcelOwner(parcelId: number, ownerId: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(parcels).set({ ownerId }).where(eq(parcels.id, parcelId));
}

// ─── Parcel Events ───────────────────────────────────────────────────
export async function createParcelEvent(event: InsertParcelEvent) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(parcelEvents).values(event);
}

export async function getPublicParcelEvents(parcelId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(parcelEvents).where(and(eq(parcelEvents.parcelId, parcelId), eq(parcelEvents.isPublic, true))).orderBy(desc(parcelEvents.createdAt));
}

export async function getAllParcelEvents(parcelId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(parcelEvents).where(eq(parcelEvents.parcelId, parcelId)).orderBy(desc(parcelEvents.createdAt));
}

// Citizen-scoped: get events only for parcels owned by this user
export async function getParcelEventsForOwner(parcelId: number, ownerId: number) {
  const db = await getDb();
  if (!db) return [];
  // First verify ownership
  const parcel = await getParcelByIdAndOwner(parcelId, ownerId);
  if (!parcel) return [];
  return db.select().from(parcelEvents)
    .where(eq(parcelEvents.parcelId, parcelId))
    .orderBy(desc(parcelEvents.createdAt));
}

// Get timeline across all citizen's parcels
export async function getCitizenTimeline(ownerId: number, limit = 50) {
  const db = await getDb();
  if (!db) return [];
  const ownerParcels = await db.select({ id: parcels.id }).from(parcels)
    .where(eq(parcels.ownerId, ownerId));
  if (ownerParcels.length === 0) return [];
  const parcelIds = ownerParcels.map(p => p.id);
  return db.select().from(parcelEvents)
    .where(inArray(parcelEvents.parcelId, parcelIds))
    .orderBy(desc(parcelEvents.createdAt))
    .limit(limit);
}

// ─── Documents ───────────────────────────────────────────────────────
export async function createDocument(doc: InsertDocument) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(documents).values(doc);
  const result = await db.select().from(documents)
    .where(and(eq(documents.parcelId, doc.parcelId), eq(documents.title, doc.title)))
    .orderBy(desc(documents.createdAt))
    .limit(1);
  return result[0];
}

export async function listDocumentsByOwner(ownerId: number, limit = 50, offset = 0) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(documents)
    .where(eq(documents.ownerId, ownerId))
    .orderBy(desc(documents.createdAt))
    .limit(limit).offset(offset);
}

export async function countDocumentsByOwner(ownerId: number) {
  const db = await getDb();
  if (!db) return 0;
  const result = await db.select({ count: sql<number>`count(*)` }).from(documents)
    .where(eq(documents.ownerId, ownerId));
  return result[0]?.count ?? 0;
}

export async function listDocumentsByParcelAndOwner(parcelId: number, ownerId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(documents)
    .where(and(eq(documents.parcelId, parcelId), eq(documents.ownerId, ownerId)))
    .orderBy(desc(documents.createdAt));
}

export async function getDocumentByIdAndOwner(docId: number, ownerId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(documents)
    .where(and(eq(documents.id, docId), eq(documents.ownerId, ownerId)))
    .limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// Admin: list all documents
export async function listAllDocuments(limit = 50, offset = 0) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(documents).orderBy(desc(documents.createdAt)).limit(limit).offset(offset);
}

export async function countAllDocuments() {
  const db = await getDb();
  if (!db) return 0;
  const result = await db.select({ count: sql<number>`count(*)` }).from(documents);
  return result[0]?.count ?? 0;
}

// ─── Verify Tokens ───────────────────────────────────────────────────
export async function createVerifyToken(token: InsertVerifyToken) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(verifyTokens).values(token);
  const tokenId = Number((result as { insertId?: number }).insertId);
  const created = await db.select().from(verifyTokens).where(eq(verifyTokens.id, tokenId)).limit(1);
  return created[0];
}

export async function getVerifyTokenByHash(tokenHash: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(verifyTokens).where(eq(verifyTokens.tokenHash, tokenHash)).limit(1);
  return result[0];
}

export async function getVerifyTokenById(tokenId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(verifyTokens).where(eq(verifyTokens.id, tokenId)).limit(1);
  return result[0];
}

export async function revokeVerifyToken(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(verifyTokens).set({ status: "revoked" }).where(eq(verifyTokens.id, id));
}

export async function countVerifyTokens() {
  const db = await getDb();
  if (!db) return 0;
  const result = await db.select({ count: sql<number>`count(*)` }).from(verifyTokens);
  return result[0]?.count ?? 0;
}

// ─── Attestations ────────────────────────────────────────────────────
export async function createAttestation(att: InsertAttestation) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(attestations).values(att);
  const attestationId = Number((result as { insertId?: number }).insertId);
  const created = await db.select().from(attestations).where(eq(attestations.id, attestationId)).limit(1);
  return created[0];
}

export async function listAttestations(limit = 50, offset = 0) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(attestations).orderBy(desc(attestations.createdAt)).limit(limit).offset(offset);
}

export async function countAttestations() {
  const db = await getDb();
  if (!db) return 0;
  const result = await db.select({ count: sql<number>`count(*)` }).from(attestations);
  return result[0]?.count ?? 0;
}

export async function listAttestationsByParcelAndOwner(parcelId: number, ownerId: number) {
  const db = await getDb();
  if (!db) return [];
  // Verify ownership first
  const parcel = await getParcelByIdAndOwner(parcelId, ownerId);
  if (!parcel) return [];
  return db.select().from(attestations)
    .where(eq(attestations.parcelId, parcelId))
    .orderBy(desc(attestations.createdAt));
}

export async function getAttestationById(attestationId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(attestations).where(eq(attestations.id, attestationId)).limit(1);
  return result[0];
}

export async function getLatestCreditAttestationByFile(creditFileId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(attestations)
    .where(and(eq(attestations.creditFileId, creditFileId), eq(attestations.attestationType, "credit")))
    .orderBy(desc(attestations.createdAt))
    .limit(1);
  return result[0];
}

export async function getCreditAttestationByDecision(decisionId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(attestations)
    .where(and(eq(attestations.decisionId, decisionId), eq(attestations.attestationType, "credit")))
    .orderBy(desc(attestations.createdAt))
    .limit(1);
  return result[0];
}

export async function updateAttestation(attestationId: number, values: Partial<InsertAttestation>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(attestations).set(values).where(eq(attestations.id, attestationId));
}

export async function createGeneratedDocument(document: InsertGeneratedDocument) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(generatedDocuments).values(document);
  const generatedDocumentId = Number((result as { insertId?: number }).insertId);
  const created = await db.select().from(generatedDocuments).where(eq(generatedDocuments.id, generatedDocumentId)).limit(1);
  return created[0];
}

export async function updateGeneratedDocument(documentId: number, values: Partial<InsertGeneratedDocument>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(generatedDocuments).set(values).where(eq(generatedDocuments.id, documentId));
}

export async function getGeneratedDocumentById(documentId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(generatedDocuments).where(eq(generatedDocuments.id, documentId)).limit(1);
  return result[0];
}

export async function getGeneratedDocumentByVerifyTokenId(verifyTokenId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(generatedDocuments)
    .where(eq(generatedDocuments.verifyTokenId, verifyTokenId))
    .limit(1);
  return result[0];
}

export async function getLatestGeneratedDocumentByAttestation(attestationId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(generatedDocuments)
    .where(eq(generatedDocuments.attestationId, attestationId))
    .orderBy(desc(generatedDocuments.createdAt))
    .limit(1);
  return result[0];
}

export async function listGeneratedDocuments(limit = 50, offset = 0) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(generatedDocuments)
    .orderBy(desc(generatedDocuments.createdAt))
    .limit(limit)
    .offset(offset);
}

// ─── Audit Events ────────────────────────────────────────────────────
export async function createAuditEvent(event: InsertAuditEvent) {
  const db = await getDb();
  if (!db) { console.warn("[Audit] Database not available"); return; }
  await db.insert(auditEvents).values(event);
}

export async function listAuditEvents(limit = 50, offset = 0) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(auditEvents).orderBy(desc(auditEvents.createdAt)).limit(limit).offset(offset);
}

export async function countAuditEvents() {
  const db = await getDb();
  if (!db) return 0;
  const result = await db.select({ count: sql<number>`count(*)` }).from(auditEvents);
  return result[0]?.count ?? 0;
}

export async function getAuditEventsByTarget(targetType: string, targetId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(auditEvents).where(and(eq(auditEvents.targetType, targetType), eq(auditEvents.targetId, targetId))).orderBy(desc(auditEvents.createdAt));
}

// ─── Rate Limits ─────────────────────────────────────────────────────
export async function checkRateLimit(ipHash: string, windowMs: number, maxHits: number): Promise<boolean> {
  const db = await getDb();
  if (!db) return true;
  const windowStart = Date.now() - windowMs;
  const result = await db.select().from(verifyRateLimits)
    .where(and(eq(verifyRateLimits.ipHash, ipHash), gte(verifyRateLimits.windowStart, windowStart)))
    .limit(1);
  if (result.length === 0) {
    await db.insert(verifyRateLimits).values({ ipHash, hitCount: 1, windowStart: Date.now() });
    return true;
  }
  const current = result[0];
  if (current.hitCount >= maxHits) return false;
  await db.update(verifyRateLimits).set({ hitCount: current.hitCount + 1 }).where(eq(verifyRateLimits.id, current.id));
  return true;
}

// ─── Dashboard Stats ─────────────────────────────────────────────────
export async function getDashboardStats() {
  const db = await getDb();
  if (!db) return { users: 0, parcels: 0, attestations: 0, auditEvents: 0, verifyTokens: 0, documents: 0 };
  const [u, p, a, ae, vt, d] = await Promise.all([
    countUsers(), countParcels(), countAttestations(), countAuditEvents(), countVerifyTokens(), countAllDocuments(),
  ]);
  return { users: u, parcels: p, attestations: a, auditEvents: ae, verifyTokens: vt, documents: d };
}

export async function getParcelStatusDistribution() {
  const db = await getDb();
  if (!db) return [];
  return db.select({
    status: parcels.statusPublic,
    count: sql<number>`count(*)`,
  }).from(parcels).groupBy(parcels.statusPublic);
}

// ─── Citizen Dashboard Stats ─────────────────────────────────────────
export async function getCitizenDashboardStats(ownerId: number) {
  const [parcelsCount, docsCount] = await Promise.all([
    countParcelsByOwner(ownerId),
    countDocumentsByOwner(ownerId),
  ]);
  return { parcels: parcelsCount, documents: docsCount };
}

// Credit module helpers
export async function insertCreditFile(file: InsertCreditFile) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(creditFiles).values(file);
  const creditFileId = Number((result as { insertId?: number }).insertId);
  const created = await db.select().from(creditFiles).where(eq(creditFiles.id, creditFileId)).limit(1);
  return created[0];
}

export async function getCreditFileById(creditFileId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(creditFiles).where(eq(creditFiles.id, creditFileId)).limit(1);
  return result[0];
}

export async function getCreditFileByIdAndOwner(creditFileId: number, ownerId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db
    .select()
    .from(creditFiles)
    .where(and(eq(creditFiles.id, creditFileId), eq(creditFiles.initiatorId, ownerId)))
    .limit(1);
  return result[0];
}

export async function listCreditFilesByOwner(ownerId: number, limit = 10, offset = 0) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(creditFiles)
    .where(eq(creditFiles.initiatorId, ownerId))
    .limit(limit)
    .offset(offset);
}

export async function listCreditFilesByStatuses(
  statuses: CreditFile["status"][],
  limit = 20,
  offset = 0
) {
  const db = await getDb();
  if (!db || statuses.length === 0) return [];
  return db
    .select()
    .from(creditFiles)
    .where(inArray(creditFiles.status, statuses))
    .orderBy(desc(creditFiles.submittedAt), desc(creditFiles.createdAt))
    .limit(limit)
    .offset(offset);
}

export async function insertCreditFileParticipant(participant: InsertCreditFileParticipant) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(creditFileParticipants).values(participant);
}

export async function listCreditFileParticipants(creditFileId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(creditFileParticipants).where(eq(creditFileParticipants.creditFileId, creditFileId));
}

export async function getCreditDocumentByFileAndType(creditFileId: number, documentType: InsertCreditDocument["documentType"]) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db
    .select()
    .from(creditDocuments)
    .where(and(eq(creditDocuments.creditFileId, creditFileId), eq(creditDocuments.documentType, documentType)))
    .limit(1);
  return result[0];
}

export async function insertCreditDocument(document: InsertCreditDocument) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(creditDocuments).values(document);
  const documentId = Number((result as { insertId?: number }).insertId);
  const created = await db.select().from(creditDocuments).where(eq(creditDocuments.id, documentId)).limit(1);
  return created[0];
}

export async function updateCreditDocument(documentId: number, values: Partial<InsertCreditDocument>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(creditDocuments).set(values).where(eq(creditDocuments.id, documentId));
}

export async function listCreditDocumentsByFile(creditFileId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(creditDocuments).where(eq(creditDocuments.creditFileId, creditFileId));
}

export async function updateCreditFileStatus(
  creditFileId: number,
  values: Partial<InsertCreditFile>
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(creditFiles).set(values).where(eq(creditFiles.id, creditFileId));
}

export async function insertCreditRequest(request: InsertCreditRequest) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(creditRequests).values(request);
  const requestId = Number((result as { insertId?: number }).insertId);
  const created = await db.select().from(creditRequests).where(eq(creditRequests.id, requestId)).limit(1);
  return created[0];
}

export async function insertCreditOffer(offer: InsertCreditOffer) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(creditOffers).values(offer);
  const offerId = Number((result as { insertId?: number }).insertId);
  const created = await db.select().from(creditOffers).where(eq(creditOffers.id, offerId)).limit(1);
  return created[0];
}

export async function insertCreditDecision(decision: InsertCreditDecision) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(creditDecisions).values(decision);
  const decisionId = Number((result as { insertId?: number }).insertId);
  const created = await db.select().from(creditDecisions).where(eq(creditDecisions.id, decisionId)).limit(1);
  return created[0];
}

export async function listCreditRequestsByFile(creditFileId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(creditRequests)
    .where(eq(creditRequests.creditFileId, creditFileId))
    .orderBy(desc(creditRequests.createdAt));
}

export async function updateCreditRequestsByFile(
  creditFileId: number,
  values: Partial<InsertCreditRequest>,
  onlyStatus?: "pending" | "fulfilled" | "expired"
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const whereClause = onlyStatus
    ? and(eq(creditRequests.creditFileId, creditFileId), eq(creditRequests.status, onlyStatus))
    : eq(creditRequests.creditFileId, creditFileId);
  await db.update(creditRequests).set(values).where(whereClause);
}

export async function listCreditOffersByFile(creditFileId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(creditOffers)
    .where(eq(creditOffers.creditFileId, creditFileId))
    .orderBy(desc(creditOffers.createdAt));
}

export async function getLatestCreditOfferByFile(creditFileId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db
    .select()
    .from(creditOffers)
    .where(eq(creditOffers.creditFileId, creditFileId))
    .orderBy(desc(creditOffers.createdAt))
    .limit(1);
  return result[0];
}

export async function getCreditOfferById(offerId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(creditOffers).where(eq(creditOffers.id, offerId)).limit(1);
  return result[0];
}

export async function updateCreditOffer(offerId: number, values: Partial<InsertCreditOffer>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(creditOffers).set(values).where(eq(creditOffers.id, offerId));
}

export async function listCreditDecisionsByFile(creditFileId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(creditDecisions)
    .where(eq(creditDecisions.creditFileId, creditFileId))
    .orderBy(desc(creditDecisions.createdAt));
}

export async function getLatestCreditDecisionByFile(creditFileId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db
    .select()
    .from(creditDecisions)
    .where(eq(creditDecisions.creditFileId, creditFileId))
    .orderBy(desc(creditDecisions.createdAt))
    .limit(1);
  return result[0];
}

// ─── Délimitation Villageoise ────────────────────────────────────────

export async function insertTerritory(territory: InsertVillageTerritory) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(villageTerritories).values(territory);
  const id = Number((result as { insertId?: number }).insertId);
  const created = await db.select().from(villageTerritories).where(eq(villageTerritories.id, id)).limit(1);
  return created[0];
}

export async function getTerritoryById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(villageTerritories).where(eq(villageTerritories.id, id)).limit(1);
  return result[0];
}

export async function getTerritoryByIdAndOwner(id: number, ownerId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db
    .select()
    .from(villageTerritories)
    .where(and(eq(villageTerritories.id, id), eq(villageTerritories.createdById, ownerId)))
    .limit(1);
  return result[0];
}

export async function listTerritoriesByOwner(ownerId: number, limit = 20, offset = 0) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(villageTerritories)
    .where(eq(villageTerritories.createdById, ownerId))
    .orderBy(desc(villageTerritories.createdAt))
    .limit(limit)
    .offset(offset);
}

export async function listAllTerritories(limit = 50, offset = 0) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(villageTerritories)
    .orderBy(desc(villageTerritories.createdAt))
    .limit(limit)
    .offset(offset);
}

export async function updateTerritory(id: number, values: Partial<InsertVillageTerritory>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(villageTerritories).set(values).where(eq(villageTerritories.id, id));
}

export async function countTerritoriesByOwner(ownerId: number) {
  const db = await getDb();
  if (!db) return 0;
  const result = await db.select({ count: sql<number>`count(*)` }).from(villageTerritories).where(eq(villageTerritories.createdById, ownerId));
  return result[0]?.count ?? 0;
}

// ─── Boundary Points ─────────────────────────────────────────────────

export async function insertBoundaryPoints(points: InsertTerritoryBoundaryPoint[]) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  if (points.length === 0) return;
  await db.insert(territoryBoundaryPoints).values(points);
}

export async function listBoundaryPointsByTerritory(territoryId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(territoryBoundaryPoints)
    .where(eq(territoryBoundaryPoints.territoryId, territoryId))
    .orderBy(territoryBoundaryPoints.pointNumber);
}

export async function updateBoundaryPoint(pointId: number, values: Partial<InsertTerritoryBoundaryPoint>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(territoryBoundaryPoints).set(values).where(eq(territoryBoundaryPoints.id, pointId));
}

export async function deleteBoundaryPoint(pointId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(territoryBoundaryPoints).where(eq(territoryBoundaryPoints.id, pointId));
}

export async function deleteAllBoundaryPointsByTerritory(territoryId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(territoryBoundaryPoints).where(eq(territoryBoundaryPoints.territoryId, territoryId));
}

export async function replaceBoundaryPoints(territoryId: number, points: InsertTerritoryBoundaryPoint[]) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(territoryBoundaryPoints).where(eq(territoryBoundaryPoints.territoryId, territoryId));
  if (points.length > 0) {
    await db.insert(territoryBoundaryPoints).values(points);
  }
}

// ─── Territory Documents ─────────────────────────────────────────────

export async function insertTerritoryDocument(doc: InsertTerritoryDocument) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(territoryDocuments).values(doc);
  const id = Number((result as { insertId?: number }).insertId);
  const created = await db.select().from(territoryDocuments).where(eq(territoryDocuments.id, id)).limit(1);
  return created[0];
}

export async function listTerritoryDocuments(territoryId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(territoryDocuments)
    .where(eq(territoryDocuments.territoryId, territoryId))
    .orderBy(desc(territoryDocuments.createdAt));
}

export async function deleteTerritoryDocument(docId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(territoryDocuments).where(eq(territoryDocuments.id, docId));
}

// ─── Territory Status History ────────────────────────────────────────

export async function insertTerritoryStatusHistory(entry: InsertTerritoryStatusHistory) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(territoryStatusHistory).values(entry);
}

export async function listTerritoryStatusHistory(territoryId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(territoryStatusHistory)
    .where(eq(territoryStatusHistory.territoryId, territoryId))
    .orderBy(desc(territoryStatusHistory.createdAt));
}

export async function listAllTerritoriesWithFilter(
  statusFilter?: string,
  sortBy: "date" | "name" | "status" = "date",
  sortOrder: "asc" | "desc" = "desc",
  limit = 50,
  offset = 0
) {
  const db = await getDb();
  if (!db) return [];
  const whereClause = statusFilter
    ? eq(villageTerritories.status, statusFilter as any)
    : undefined;
  const orderClause = sortBy === "name"
    ? (sortOrder === "asc" ? villageTerritories.name : desc(villageTerritories.name))
    : sortBy === "status"
      ? (sortOrder === "asc" ? villageTerritories.status : desc(villageTerritories.status))
      : (sortOrder === "asc" ? villageTerritories.createdAt : desc(villageTerritories.createdAt));
  
  const query = db.select().from(villageTerritories);
  if (whereClause) {
    return query.where(whereClause).orderBy(orderClause).limit(limit).offset(offset);
  }
  return query.orderBy(orderClause).limit(limit).offset(offset);
}

// ─── Land Title Applications ────────────────────────────────────────
import {
  landTitleApplications, InsertLandTitleApplication, LandTitleApplication,
  landTitleSteps, InsertLandTitleStep,
  landTitleDocuments, InsertLandTitleDocument,
  landTitleOppositions, InsertLandTitleOpposition,
} from "../drizzle/schema";

export async function createLandTitleApplication(app: InsertLandTitleApplication) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(landTitleApplications).values(app);
  const result = await db.select().from(landTitleApplications)
    .where(eq(landTitleApplications.applicationNumber, app.applicationNumber))
    .limit(1);
  return result[0];
}

export async function getLandTitleApplicationById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(landTitleApplications)
    .where(eq(landTitleApplications.id, id)).limit(1);
  return result[0];
}

export async function getLandTitleApplicationByNumber(applicationNumber: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(landTitleApplications)
    .where(eq(landTitleApplications.applicationNumber, applicationNumber)).limit(1);
  return result[0];
}

export async function listLandTitleApplicationsByUser(userId: number, limit = 50, offset = 0) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(landTitleApplications)
    .where(eq(landTitleApplications.userId, userId))
    .orderBy(desc(landTitleApplications.createdAt))
    .limit(limit).offset(offset);
}

export async function countLandTitleApplicationsByUser(userId: number) {
  const db = await getDb();
  if (!db) return 0;
  const result = await db.select({ count: sql<number>`count(*)` }).from(landTitleApplications)
    .where(eq(landTitleApplications.userId, userId));
  return result[0]?.count ?? 0;
}

export async function listAllLandTitleApplications(
  statusFilter?: string,
  phaseFilter?: string,
  limit = 50,
  offset = 0
) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [];
  if (statusFilter) conditions.push(eq(landTitleApplications.status, statusFilter));
  if (phaseFilter) conditions.push(eq(landTitleApplications.phase, phaseFilter as any));
  const query = db.select().from(landTitleApplications);
  if (conditions.length > 0) {
    return query.where(and(...conditions)).orderBy(desc(landTitleApplications.createdAt)).limit(limit).offset(offset);
  }
  return query.orderBy(desc(landTitleApplications.createdAt)).limit(limit).offset(offset);
}

export async function countAllLandTitleApplications(statusFilter?: string, phaseFilter?: string) {
  const db = await getDb();
  if (!db) return 0;
  const conditions = [];
  if (statusFilter) conditions.push(eq(landTitleApplications.status, statusFilter));
  if (phaseFilter) conditions.push(eq(landTitleApplications.phase, phaseFilter as any));
  const query = db.select({ count: sql<number>`count(*)` }).from(landTitleApplications);
  if (conditions.length > 0) {
    const result = await query.where(and(...conditions));
    return result[0]?.count ?? 0;
  }
  const result = await query;
  return result[0]?.count ?? 0;
}

export async function updateLandTitleApplication(id: number, data: Partial<Omit<InsertLandTitleApplication, "id">>) {
  const db = await getDb();
  if (!db) return;
  await db.update(landTitleApplications).set({ ...data, updatedAt: Date.now() }).where(eq(landTitleApplications.id, id));
}

// ─── Land Title Applications with Parcel Join ───────────────────────
export async function getLandTitleApplicationWithParcel(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db
    .select({
      application: landTitleApplications,
      parcel: parcels,
    })
    .from(landTitleApplications)
    .leftJoin(parcels, eq(landTitleApplications.parcelId, parcels.id))
    .where(eq(landTitleApplications.id, id))
    .limit(1);
  if (!result[0]) return undefined;
  return { ...result[0].application, parcel: result[0].parcel ?? null };
}

export async function listLandTitleApplicationsByUserWithParcel(userId: number, limit = 50, offset = 0) {
  const db = await getDb();
  if (!db) return [];
  const result = await db
    .select({
      application: landTitleApplications,
      parcel: parcels,
    })
    .from(landTitleApplications)
    .leftJoin(parcels, eq(landTitleApplications.parcelId, parcels.id))
    .where(eq(landTitleApplications.userId, userId))
    .orderBy(desc(landTitleApplications.createdAt))
    .limit(limit)
    .offset(offset);
  return result.map(r => ({ ...r.application, parcel: r.parcel ?? null }));
}

export async function listAllLandTitleApplicationsWithParcel(
  statusFilter?: string,
  phaseFilter?: string,
  limit = 50,
  offset = 0
) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [];
  if (statusFilter) conditions.push(eq(landTitleApplications.status, statusFilter));
  if (phaseFilter) conditions.push(eq(landTitleApplications.phase, phaseFilter as any));
  const query = db
    .select({
      application: landTitleApplications,
      parcel: parcels,
    })
    .from(landTitleApplications)
    .leftJoin(parcels, eq(landTitleApplications.parcelId, parcels.id));
  const rows = conditions.length > 0
    ? await query.where(and(...conditions)).orderBy(desc(landTitleApplications.createdAt)).limit(limit).offset(offset)
    : await query.orderBy(desc(landTitleApplications.createdAt)).limit(limit).offset(offset);
  return rows.map(r => ({ ...r.application, parcel: r.parcel ?? null }));
}

// ─── Land Title Steps ───────────────────────────────────────────────
export async function createLandTitleStep(step: InsertLandTitleStep) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(landTitleSteps).values(step);
  const stepId = Number((result as any).insertId);
  const created = await db.select().from(landTitleSteps).where(eq(landTitleSteps.id, stepId)).limit(1);
  return created[0];
}

export async function listLandTitleSteps(applicationId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(landTitleSteps)
    .where(eq(landTitleSteps.applicationId, applicationId))
    .orderBy(landTitleSteps.createdAt);
}

export async function updateLandTitleStep(id: number, data: Partial<Omit<InsertLandTitleStep, "id">>) {
  const db = await getDb();
  if (!db) return;
  await db.update(landTitleSteps).set(data).where(eq(landTitleSteps.id, id));
}

// ─── Land Title Documents ───────────────────────────────────────────
export async function createLandTitleDocument(doc: InsertLandTitleDocument) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(landTitleDocuments).values(doc);
  const docId = Number((result as any).insertId);
  const created = await db.select().from(landTitleDocuments).where(eq(landTitleDocuments.id, docId)).limit(1);
  return created[0];
}

export async function listLandTitleDocuments(applicationId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(landTitleDocuments)
    .where(eq(landTitleDocuments.applicationId, applicationId))
    .orderBy(desc(landTitleDocuments.createdAt));
}

export async function getLandTitleDocumentById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(landTitleDocuments).where(eq(landTitleDocuments.id, id)).limit(1);
  return result[0];
}

export async function deleteLandTitleDocument(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(landTitleDocuments).where(eq(landTitleDocuments.id, id));
}

export async function updateLandTitleDocument(id: number, data: Partial<Omit<InsertLandTitleDocument, "id">>) {
  const db = await getDb();
  if (!db) return;
  await db.update(landTitleDocuments).set(data).where(eq(landTitleDocuments.id, id));
}

export async function listLandTitleDocumentsByCategory(applicationId: number, category: string) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(landTitleDocuments)
    .where(and(
      eq(landTitleDocuments.applicationId, applicationId),
      eq(landTitleDocuments.documentCategory, category as any)
    ))
    .orderBy(desc(landTitleDocuments.createdAt));
}

export async function countLandTitleDocumentsByApplication(applicationId: number) {
  const db = await getDb();
  if (!db) return 0;
  const result = await db.select({ count: sql<number>`count(*)` }).from(landTitleDocuments)
    .where(eq(landTitleDocuments.applicationId, applicationId));
  return result[0]?.count ?? 0;
}

// ─── Land Title Oppositions ────────────────────────────────────────
export async function createLandTitleOpposition(opp: InsertLandTitleOpposition) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(landTitleOppositions).values(opp);
  const oppId = Number((result as any).insertId);
  const created = await db.select().from(landTitleOppositions).where(eq(landTitleOppositions.id, oppId)).limit(1);
  return created[0];
}

export async function listLandTitleOppositions(applicationId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(landTitleOppositions)
    .where(eq(landTitleOppositions.applicationId, applicationId))
    .orderBy(desc(landTitleOppositions.createdAt));
}

export async function updateLandTitleOpposition(id: number, data: Partial<Omit<InsertLandTitleOpposition, "id">>) {
  const db = await getDb();
  if (!db) return;
  await db.update(landTitleOppositions).set(data).where(eq(landTitleOppositions.id, id));
}

export async function countLandTitleOppositionsByApplication(applicationId: number, status?: string) {
  const db = await getDb();
  if (!db) return 0;
  const conditions = [eq(landTitleOppositions.applicationId, applicationId)];
  if (status) conditions.push(eq(landTitleOppositions.status, status as any));
  const result = await db.select({ count: sql<number>`count(*)` }).from(landTitleOppositions)
    .where(and(...conditions));
  return result[0]?.count ?? 0;
}


// ─── Citizen Notifications ──────────────────────────────────────────

export async function createCitizenNotification(data: Omit<InsertCitizenNotification, "id">) {
  const db = await getDb();
  if (!db) return null;
  const [result] = await db.insert(citizenNotifications).values(data).$returningId();
  return result;
}

export async function listCitizenNotifications(userId: number, limit = 50, offset = 0) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(citizenNotifications)
    .where(eq(citizenNotifications.userId, userId))
    .orderBy(desc(citizenNotifications.createdAt))
    .limit(limit)
    .offset(offset);
}

export async function countUnreadNotifications(userId: number) {
  const db = await getDb();
  if (!db) return 0;
  const result = await db.select({ count: sql<number>`count(*)` }).from(citizenNotifications)
    .where(and(eq(citizenNotifications.userId, userId), eq(citizenNotifications.isRead, false)));
  return result[0]?.count ?? 0;
}

export async function markNotificationRead(id: number, userId: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(citizenNotifications)
    .set({ isRead: true })
    .where(and(eq(citizenNotifications.id, id), eq(citizenNotifications.userId, userId)));
}

export async function markAllNotificationsRead(userId: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(citizenNotifications)
    .set({ isRead: true })
    .where(and(eq(citizenNotifications.userId, userId), eq(citizenNotifications.isRead, false)));
}

/** Helper to send a notification to a citizen when their dossier status changes */
export async function notifyCitizenStatusChange(params: {
  userId: number;
  module: "land_title" | "credit" | "delimitation";
  entityId: number;
  oldStatus: string;
  newStatus: string;
  applicationNumber?: string;
}) {
  const statusLabels: Record<string, string> = {
    cf_draft: "Brouillon",
    cf_submitted: "Soumis",
    cf_inquiry_open: "Enquête ouverte",
    cf_inquiry_done: "Enquête terminée",
    cf_publicity: "Publicité foncière",
    cf_opposition_period: "Période d'opposition",
    cf_commission_review: "Examen commission",
    cf_approved: "Approuvé",
    cf_signed: "Certificat signé",
    cf_rejected: "Rejeté",
    tf_conversion_requested: "Conversion demandée",
    tf_apfr_review: "Examen APFR",
    tf_cadastral_survey: "Bornage cadastral",
    tf_registration: "Enregistrement",
    tf_title_issued: "Titre délivré",
    tf_published: "Publié au JO",
    tf_rejected: "Rejeté",
  };

  const newLabel = statusLabels[params.newStatus] || params.newStatus;
  const moduleLabel = params.module === "land_title" ? "Titre Foncier" :
    params.module === "credit" ? "Crédit Habitat" : "Délimitation";
  const ref = params.applicationNumber || `#${params.entityId}`;

  return createCitizenNotification({
    userId: params.userId,
    type: "status_change",
    title: `${moduleLabel} — Nouveau statut`,
    message: `Votre dossier ${ref} est passé au statut « ${newLabel} ».`,
    relatedModule: params.module,
    relatedEntityId: params.entityId,
    isRead: false,
    createdAt: Date.now(),
  });
}

// ─── Admin Land Title & Credit Statistics ────────────────────────────
export interface DashboardFilters {
  dateFrom?: number; // unix ms
  dateTo?: number;   // unix ms
  region?: string;
  operatorName?: string;
  applicationType?: string;
}

function buildLandTitleConditions(filters: DashboardFilters) {
  const conditions: ReturnType<typeof eq>[] = [];
  if (filters.dateFrom) conditions.push(gte(landTitleApplications.createdAt, filters.dateFrom));
  if (filters.dateTo) conditions.push(lte(landTitleApplications.createdAt, filters.dateTo));
  if (filters.region) conditions.push(eq(landTitleApplications.landRegion, filters.region));
  if (filters.operatorName) conditions.push(eq(landTitleApplications.operatorName, filters.operatorName));
  if (filters.applicationType) conditions.push(eq(landTitleApplications.applicationType, filters.applicationType as "immatriculation" | "mutation" | "morcellement"));
  return conditions.length > 0 ? and(...conditions) : undefined;
}

function buildCreditConditions(filters: DashboardFilters) {
  const conditions: ReturnType<typeof eq>[] = [];
  if (filters.dateFrom) conditions.push(gte(creditFiles.createdAt, new Date(filters.dateFrom)));
  if (filters.dateTo) conditions.push(lte(creditFiles.createdAt, new Date(filters.dateTo)));
  // creditFiles doesn't have region/operator, but we can filter via joined parcel if needed
  return conditions.length > 0 ? and(...conditions) : undefined;
}

export async function getLandTitleStatusDistribution(filters: DashboardFilters = {}) {
  const db = await getDb();
  if (!db) return [];
  const where = buildLandTitleConditions(filters);
  const q = db.select({
    status: landTitleApplications.status,
    phase: landTitleApplications.phase,
    count: sql<number>`count(*)`,
  }).from(landTitleApplications).groupBy(landTitleApplications.status, landTitleApplications.phase);
  return where ? q.where(where) : q;
}

export async function getLandTitleStats(filters: DashboardFilters = {}) {
  const db = await getDb();
  if (!db) return { total: 0, rejected: 0, avgProcessingDays: 0 };
  const baseWhere = buildLandTitleConditions(filters);
  const totalQ = db.select({ count: sql<number>`count(*)` }).from(landTitleApplications);
  const [totalRes] = baseWhere ? await totalQ.where(baseWhere) : await totalQ;

  const rejectedConds = [eq(landTitleApplications.status, "cf_rejected"), ...(baseWhere ? [baseWhere] : [])];
  const [rejectedRes] = await db.select({ count: sql<number>`count(*)` }).from(landTitleApplications)
    .where(and(...rejectedConds));

  const completedStatuses = ["tf_delivered", "cf_rejected"];
  const avgConds = [inArray(landTitleApplications.status, completedStatuses), ...(baseWhere ? [baseWhere] : [])];
  const [avgRes] = await db.select({
    avgDays: sql<number>`COALESCE(AVG((${landTitleApplications.updatedAt} - ${landTitleApplications.createdAt}) / 86400000), 0)`,
  }).from(landTitleApplications)
    .where(and(...avgConds));

  return {
    total: totalRes?.count ?? 0,
    rejected: rejectedRes?.count ?? 0,
    avgProcessingDays: Math.round(avgRes?.avgDays ?? 0),
  };
}

export async function getCreditStatusDistribution(filters: DashboardFilters = {}) {
  const db = await getDb();
  if (!db) return [];
  const where = buildCreditConditions(filters);
  const q = db.select({
    status: creditFiles.status,
    count: sql<number>`count(*)`,
  }).from(creditFiles).groupBy(creditFiles.status);
  return where ? q.where(where) : q;
}

export async function getCreditStats(filters: DashboardFilters = {}) {
  const db = await getDb();
  if (!db) return { total: 0, rejected: 0, approved: 0, avgProcessingDays: 0 };
  const baseWhere = buildCreditConditions(filters);
  const totalQ = db.select({ count: sql<number>`count(*)` }).from(creditFiles);
  const [totalRes] = baseWhere ? await totalQ.where(baseWhere) : await totalQ;

  const rejectedConds = [eq(creditFiles.status, "REJECTED"), ...(baseWhere ? [baseWhere] : [])];
  const [rejectedRes] = await db.select({ count: sql<number>`count(*)` }).from(creditFiles)
    .where(and(...rejectedConds));

  const approvedConds = [eq(creditFiles.status, "APPROVED"), ...(baseWhere ? [baseWhere] : [])];
  const [approvedRes] = await db.select({ count: sql<number>`count(*)` }).from(creditFiles)
    .where(and(...approvedConds));

  const terminalStatuses = ["APPROVED", "REJECTED"] as const;
  const avgConds = [inArray(creditFiles.status, terminalStatuses), ...(baseWhere ? [baseWhere] : [])];
  const [avgRes] = await db.select({
    avgDays: sql<number>`COALESCE(AVG(DATEDIFF(${creditFiles.lastTransitionAt}, ${creditFiles.createdAt})), 0)`,
  }).from(creditFiles)
    .where(and(...avgConds));

  return {
    total: totalRes?.count ?? 0,
    rejected: rejectedRes?.count ?? 0,
    approved: approvedRes?.count ?? 0,
    avgProcessingDays: Math.round(avgRes?.avgDays ?? 0),
  };
}

export async function getDistinctLandTitleRegions(): Promise<string[]> {
  const db = await getDb();
  if (!db) return [];
  const rows = await db.selectDistinct({ region: landTitleApplications.landRegion })
    .from(landTitleApplications)
    .where(sql`${landTitleApplications.landRegion} IS NOT NULL AND ${landTitleApplications.landRegion} != ''`);
  return rows.map(r => r.region!).filter(Boolean).sort();
}

export async function getDistinctLandTitleOperators(): Promise<string[]> {
  const db = await getDb();
  if (!db) return [];
  const rows = await db.selectDistinct({ operator: landTitleApplications.operatorName })
    .from(landTitleApplications)
    .where(sql`${landTitleApplications.operatorName} IS NOT NULL AND ${landTitleApplications.operatorName} != ''`);
  return rows.map(r => r.operator!).filter(Boolean).sort();
}

// ─── Notification Preferences ───────────────────────────────────────────────
export async function getNotificationPreferences(userId: number) {
  const db = await getDb();
  if (!db) return null;
  const [row] = await db.select().from(notificationPreferences)
    .where(eq(notificationPreferences.userId, userId))
    .limit(1);
  return row ?? null;
}

export async function upsertNotificationPreferences(userId: number, data: Partial<Omit<InsertNotificationPreference, "id" | "userId" | "updatedAt">>) {
  const db = await getDb();
  if (!db) return null;
  const existing = await getNotificationPreferences(userId);
  if (existing) {
    await db.update(notificationPreferences)
      .set({ ...data, updatedAt: Date.now() })
      .where(eq(notificationPreferences.userId, userId));
    return { ...existing, ...data, updatedAt: Date.now() };
  } else {
    const [result] = await db.insert(notificationPreferences).values({
      userId,
      email: data.email ?? null,
      phone: data.phone ?? null,
      emailStatusChange: data.emailStatusChange ?? true,
      smsStatusChange: data.smsStatusChange ?? false,
      emailDocumentUpdate: data.emailDocumentUpdate ?? true,
      smsDocumentUpdate: data.smsDocumentUpdate ?? false,
      emailOpposition: data.emailOpposition ?? true,
      smsOpposition: data.smsOpposition ?? true,
      emailGeneral: data.emailGeneral ?? true,
      smsGeneral: data.smsGeneral ?? false,
      updatedAt: Date.now(),
    }).$returningId();
    return result;
  }
}

// ─── System Configuration Helpers ───────────────────────────────────────────
export async function getSystemConfig(key: string): Promise<Record<string, unknown> | null> {
  const db = await getDb();
  if (!db) return null;
  const [row] = await db.select().from(systemConfig)
    .where(eq(systemConfig.configKey, key))
    .limit(1);
  if (!row) return null;
  try {
    return JSON.parse(row.configValue);
  } catch {
    return null;
  }
}

export async function upsertSystemConfig(key: string, value: Record<string, unknown>, updatedBy: number) {
  const db = await getDb();
  if (!db) return null;
  const existing = await db.select().from(systemConfig)
    .where(eq(systemConfig.configKey, key))
    .limit(1);
  const jsonValue = JSON.stringify(value);
  if (existing.length > 0) {
    await db.update(systemConfig)
      .set({ configValue: jsonValue, updatedAt: Date.now(), updatedBy })
      .where(eq(systemConfig.configKey, key));
  } else {
    await db.insert(systemConfig).values({
      configKey: key,
      configValue: jsonValue,
      updatedAt: Date.now(),
      updatedBy,
    });
  }
  return value;
}
