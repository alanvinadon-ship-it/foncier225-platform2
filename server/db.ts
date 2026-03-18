import { eq, desc, and, sql, gte, inArray } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  InsertUser, users,
  parcels, InsertParcel, Parcel,
  parcelEvents, InsertParcelEvent,
  verifyTokens, InsertVerifyToken,
  attestations, InsertAttestation,
  auditEvents, InsertAuditEvent,
  verifyRateLimits,
  documents, InsertDocument,
  creditFiles, CreditFile, InsertCreditFile,
  creditFileParticipants, InsertCreditFileParticipant,
  creditDocuments, InsertCreditDocument,
  creditRequests, InsertCreditRequest,
  creditOffers, InsertCreditOffer,
  creditDecisions, InsertCreditDecision,
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
  await db.insert(verifyTokens).values(token);
}

export async function getVerifyTokenByHash(tokenHash: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(verifyTokens).where(eq(verifyTokens.tokenHash, tokenHash)).limit(1);
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
  await db.insert(attestations).values(att);
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
