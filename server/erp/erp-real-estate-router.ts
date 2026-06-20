import { z } from "zod";
import { eq, and, desc, sql, isNull, gte, lte, like, inArray } from "drizzle-orm";
import { router, erpPermissionProcedure } from "../_core/trpc";
import { getDb, createAuditEvent } from "../db";
import {
  erpRealEstatePrograms,
  erpRealEstateBuildings,
  erpRealEstateUnits,
  erpRealEstateCustomers,
  erpRealEstateReservations,
  erpRealEstateSales,
  erpRealEstatePaymentPlans,
  erpRealEstateInstallments,
  erpCustomerPayments,
  erpRealEstateDeliveries,
  erpRealEstateDeliveryReserves,
  erpSalesCommissions,
  users,
} from "../../drizzle/schema";

// ============================================================
// ERP REAL ESTATE ROUTER — Vente Immobilière
// Programmes, Bâtiments, Unités, Clients, Réservations, Ventes,
// Échéanciers, Encaissements, Livraisons, Commissions
// ============================================================

function generateNumber(prefix: string): string {
  const d = new Date();
  const y = d.getFullYear().toString().slice(-2);
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const rand = Math.floor(Math.random() * 9000 + 1000);
  return `${prefix}-${y}${m}-${rand}`;
}

// --- Programs Router ---
const programsRouter = router({
  list: erpPermissionProcedure("erp_real_estate", "view")
    .input(z.object({ status: z.string().optional(), limit: z.number().min(1).max(100).default(50), offset: z.number().min(0).default(0) }))
    .query(async ({ input }) => {
      const db = (await getDb())!;
      const conditions = [isNull(erpRealEstatePrograms.deletedAt)];
      if (input.status) conditions.push(eq(erpRealEstatePrograms.status, input.status));
      const programs = await db.select().from(erpRealEstatePrograms).where(and(...conditions)).orderBy(desc(erpRealEstatePrograms.createdAt)).limit(input.limit).offset(input.offset);
      const [{ count }] = await db.select({ count: sql<number>`count(*)` }).from(erpRealEstatePrograms).where(and(...conditions));
      return { programs, total: count };
    }),

  getById: erpPermissionProcedure("erp_real_estate", "view")
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = (await getDb())!;
      const [program] = await db.select().from(erpRealEstatePrograms).where(eq(erpRealEstatePrograms.id, input.id));
      if (!program) throw new Error("Programme non trouvé");
      const buildings = await db.select().from(erpRealEstateBuildings).where(and(eq(erpRealEstateBuildings.programId, input.id), isNull(erpRealEstateBuildings.deletedAt)));
      const units = await db.select().from(erpRealEstateUnits).where(and(eq(erpRealEstateUnits.programId, input.id), isNull(erpRealEstateUnits.deletedAt)));
      return { ...program, buildings, units };
    }),

  create: erpPermissionProcedure("erp_real_estate", "create")
    .input(z.object({ code: z.string().min(1), name: z.string().min(1), description: z.string().optional(), projectId: z.number().optional(), location: z.string().optional(), developerName: z.string().optional(), startDate: z.number().optional(), plannedDeliveryDate: z.number().optional() }))
    .mutation(async ({ input, ctx }) => {
      const db = (await getDb())!;
      const now = Date.now();
      const [result] = await db.insert(erpRealEstatePrograms).values({ ...input, status: "draft", totalUnits: 0, availableUnits: 0, reservedUnits: 0, soldUnits: 0, createdBy: ctx.user.id, createdAt: now, updatedAt: now });
      await createAuditEvent({ actorId: ctx.user.id, action: "create", targetType: "erp_real_estate_program", targetId: result.insertId, details: { name: input.name } });
      return { id: result.insertId };
    }),

  update: erpPermissionProcedure("erp_real_estate", "update")
    .input(z.object({ id: z.number(), name: z.string().optional(), description: z.string().optional(), location: z.string().optional(), developerName: z.string().optional(), startDate: z.number().optional(), plannedDeliveryDate: z.number().optional(), actualDeliveryDate: z.number().optional(), status: z.string().optional() }))
    .mutation(async ({ input, ctx }) => {
      const db = (await getDb())!;
      const { id, ...data } = input;
      await db.update(erpRealEstatePrograms).set({ ...data, updatedAt: Date.now() }).where(eq(erpRealEstatePrograms.id, id));
      await createAuditEvent({ actorId: ctx.user.id, action: "update", targetType: "erp_real_estate_program", targetId: id, details: data });
      return { success: true };
    }),

  delete: erpPermissionProcedure("erp_real_estate", "delete")
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = (await getDb())!;
      await db.update(erpRealEstatePrograms).set({ deletedAt: Date.now(), updatedAt: Date.now() }).where(eq(erpRealEstatePrograms.id, input.id));
      await createAuditEvent({ actorId: ctx.user.id, action: "delete", targetType: "erp_real_estate_program", targetId: input.id, details: {} });
      return { success: true };
    }),

  stats: erpPermissionProcedure("erp_real_estate", "view")
    .query(async () => {
      const db = (await getDb())!;
      const programs = await db.select().from(erpRealEstatePrograms).where(isNull(erpRealEstatePrograms.deletedAt));
      const totalPrograms = programs.length;
      const activePrograms = programs.filter(p => p.status === "active").length;
      const totalUnits = programs.reduce((s, p) => s + (p.totalUnits || 0), 0);
      const availableUnits = programs.reduce((s, p) => s + (p.availableUnits || 0), 0);
      const reservedUnits = programs.reduce((s, p) => s + (p.reservedUnits || 0), 0);
      const soldUnits = programs.reduce((s, p) => s + (p.soldUnits || 0), 0);
      return { totalPrograms, activePrograms, totalUnits, availableUnits, reservedUnits, soldUnits };
    }),
});

// --- Buildings Router ---
const buildingsRouter = router({
  list: erpPermissionProcedure("erp_real_estate", "view")
    .input(z.object({ programId: z.number().optional(), limit: z.number().min(1).max(100).default(50), offset: z.number().min(0).default(0) }))
    .query(async ({ input }) => {
      const db = (await getDb())!;
      const conditions = [isNull(erpRealEstateBuildings.deletedAt)];
      if (input.programId) conditions.push(eq(erpRealEstateBuildings.programId, input.programId));
      const buildings = await db.select().from(erpRealEstateBuildings).where(and(...conditions)).orderBy(desc(erpRealEstateBuildings.createdAt)).limit(input.limit).offset(input.offset);
      const [{ count }] = await db.select({ count: sql<number>`count(*)` }).from(erpRealEstateBuildings).where(and(...conditions));
      return { buildings, total: count };
    }),

  create: erpPermissionProcedure("erp_real_estate", "create")
    .input(z.object({ programId: z.number(), code: z.string().min(1), name: z.string().min(1), buildingType: z.string(), numberOfFloors: z.number().optional(), numberOfUnits: z.number().optional(), description: z.string().optional() }))
    .mutation(async ({ input, ctx }) => {
      const db = (await getDb())!;
      const now = Date.now();
      const [result] = await db.insert(erpRealEstateBuildings).values({ ...input, status: "active", createdAt: now, updatedAt: now });
      await createAuditEvent({ actorId: ctx.user.id, action: "create", targetType: "erp_real_estate_building", targetId: result.insertId, details: { name: input.name } });
      return { id: result.insertId };
    }),

  update: erpPermissionProcedure("erp_real_estate", "update")
    .input(z.object({ id: z.number(), name: z.string().optional(), buildingType: z.string().optional(), numberOfFloors: z.number().optional(), numberOfUnits: z.number().optional(), description: z.string().optional(), status: z.string().optional() }))
    .mutation(async ({ input, ctx }) => {
      const db = (await getDb())!;
      const { id, ...data } = input;
      await db.update(erpRealEstateBuildings).set({ ...data, updatedAt: Date.now() }).where(eq(erpRealEstateBuildings.id, id));
      return { success: true };
    }),

  delete: erpPermissionProcedure("erp_real_estate", "delete")
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = (await getDb())!;
      await db.update(erpRealEstateBuildings).set({ deletedAt: Date.now(), updatedAt: Date.now() }).where(eq(erpRealEstateBuildings.id, input.id));
      return { success: true };
    }),
});

// --- Units Router ---
const unitsRouter = router({
  list: erpPermissionProcedure("erp_real_estate", "view")
    .input(z.object({ programId: z.number().optional(), buildingId: z.number().optional(), status: z.string().optional(), unitType: z.string().optional(), limit: z.number().min(1).max(100).default(50), offset: z.number().min(0).default(0) }))
    .query(async ({ input }) => {
      const db = (await getDb())!;
      const conditions = [isNull(erpRealEstateUnits.deletedAt)];
      if (input.programId) conditions.push(eq(erpRealEstateUnits.programId, input.programId));
      if (input.buildingId) conditions.push(eq(erpRealEstateUnits.buildingId, input.buildingId));
      if (input.status) conditions.push(eq(erpRealEstateUnits.status, input.status));
      if (input.unitType) conditions.push(eq(erpRealEstateUnits.unitType, input.unitType));
      const units = await db.select().from(erpRealEstateUnits).where(and(...conditions)).orderBy(desc(erpRealEstateUnits.createdAt)).limit(input.limit).offset(input.offset);
      const [{ count }] = await db.select({ count: sql<number>`count(*)` }).from(erpRealEstateUnits).where(and(...conditions));
      return { units, total: count };
    }),

  getById: erpPermissionProcedure("erp_real_estate", "view")
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = (await getDb())!;
      const [unit] = await db.select().from(erpRealEstateUnits).where(eq(erpRealEstateUnits.id, input.id));
      if (!unit) throw new Error("Unité non trouvée");
      return unit;
    }),

  create: erpPermissionProcedure("erp_real_estate", "create")
    .input(z.object({ programId: z.number(), buildingId: z.number().optional(), unitCode: z.string().min(1), unitType: z.string(), title: z.string().min(1), description: z.string().optional(), surfaceArea: z.string().optional(), landArea: z.string().optional(), numberOfRooms: z.number().optional(), numberOfBedrooms: z.number().optional(), numberOfBathrooms: z.number().optional(), hasParking: z.boolean().optional(), parkingNumber: z.string().optional(), floorNumber: z.number().optional(), doorNumber: z.string().optional(), lotNumber: z.string().optional(), basePrice: z.number().optional(), currentPrice: z.number().optional() }))
    .mutation(async ({ input, ctx }) => {
      const db = (await getDb())!;
      const now = Date.now();
      const [result] = await db.insert(erpRealEstateUnits).values({ ...input, status: "available", currency: "XOF", createdAt: now, updatedAt: now });
      // Update program unit counts
      await db.execute(sql`UPDATE erp_real_estate_programs SET total_units = total_units + 1, available_units = available_units + 1, updated_at = ${now} WHERE id = ${input.programId}`);
      await createAuditEvent({ actorId: ctx.user.id, action: "create", targetType: "erp_real_estate_unit", targetId: result.insertId, details: { title: input.title } });
      return { id: result.insertId };
    }),

  update: erpPermissionProcedure("erp_real_estate", "update")
    .input(z.object({ id: z.number(), title: z.string().optional(), description: z.string().optional(), surfaceArea: z.string().optional(), landArea: z.string().optional(), numberOfRooms: z.number().optional(), numberOfBedrooms: z.number().optional(), numberOfBathrooms: z.number().optional(), hasParking: z.boolean().optional(), parkingNumber: z.string().optional(), basePrice: z.number().optional(), currentPrice: z.number().optional(), status: z.string().optional() }))
    .mutation(async ({ input, ctx }) => {
      const db = (await getDb())!;
      const { id, ...data } = input;
      await db.update(erpRealEstateUnits).set({ ...data, updatedAt: Date.now() }).where(eq(erpRealEstateUnits.id, id));
      return { success: true };
    }),

  delete: erpPermissionProcedure("erp_real_estate", "delete")
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = (await getDb())!;
      await db.update(erpRealEstateUnits).set({ deletedAt: Date.now(), updatedAt: Date.now() }).where(eq(erpRealEstateUnits.id, input.id));
      return { success: true };
    }),
});

// --- Customers Router ---
const customersRouter = router({
  list: erpPermissionProcedure("erp_real_estate", "view")
    .input(z.object({ status: z.string().optional(), customerType: z.string().optional(), search: z.string().optional(), limit: z.number().min(1).max(100).default(50), offset: z.number().min(0).default(0) }))
    .query(async ({ input }) => {
      const db = (await getDb())!;
      const conditions = [isNull(erpRealEstateCustomers.deletedAt)];
      if (input.status) conditions.push(eq(erpRealEstateCustomers.status, input.status));
      if (input.customerType) conditions.push(eq(erpRealEstateCustomers.customerType, input.customerType));
      if (input.search) conditions.push(sql`(${erpRealEstateCustomers.firstName} LIKE ${`%${input.search}%`} OR ${erpRealEstateCustomers.lastName} LIKE ${`%${input.search}%`} OR ${erpRealEstateCustomers.companyName} LIKE ${`%${input.search}%`} OR ${erpRealEstateCustomers.phone} LIKE ${`%${input.search}%`})`);
      const customers = await db.select().from(erpRealEstateCustomers).where(and(...conditions)).orderBy(desc(erpRealEstateCustomers.createdAt)).limit(input.limit).offset(input.offset);
      const [{ count }] = await db.select({ count: sql<number>`count(*)` }).from(erpRealEstateCustomers).where(and(...conditions));
      return { customers, total: count };
    }),

  getById: erpPermissionProcedure("erp_real_estate", "view")
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = (await getDb())!;
      const [customer] = await db.select().from(erpRealEstateCustomers).where(eq(erpRealEstateCustomers.id, input.id));
      if (!customer) throw new Error("Client non trouvé");
      return customer;
    }),

  create: erpPermissionProcedure("erp_real_estate", "create")
    .input(z.object({ customerType: z.enum(["individual", "company"]), firstName: z.string().optional(), lastName: z.string().optional(), companyName: z.string().optional(), email: z.string().optional(), phone: z.string().optional(), address: z.string().optional(), nationality: z.string().optional(), idDocumentType: z.string().optional(), idDocumentNumber: z.string().optional(), taxIdentificationNumber: z.string().optional(), source: z.string().optional() }))
    .mutation(async ({ input, ctx }) => {
      const db = (await getDb())!;
      const now = Date.now();
      const customerNumber = generateNumber("CLI");
      const [result] = await db.insert(erpRealEstateCustomers).values({ ...input, customerNumber, status: "prospect", createdAt: now, updatedAt: now });
      await createAuditEvent({ actorId: ctx.user.id, action: "create", targetType: "erp_real_estate_customer", targetId: result.insertId, details: { customerNumber } });
      return { id: result.insertId, customerNumber };
    }),

  update: erpPermissionProcedure("erp_real_estate", "update")
    .input(z.object({ id: z.number(), firstName: z.string().optional(), lastName: z.string().optional(), companyName: z.string().optional(), email: z.string().optional(), phone: z.string().optional(), address: z.string().optional(), nationality: z.string().optional(), idDocumentType: z.string().optional(), idDocumentNumber: z.string().optional(), taxIdentificationNumber: z.string().optional(), source: z.string().optional(), status: z.string().optional() }))
    .mutation(async ({ input, ctx }) => {
      const db = (await getDb())!;
      const { id, ...data } = input;
      await db.update(erpRealEstateCustomers).set({ ...data, updatedAt: Date.now() }).where(eq(erpRealEstateCustomers.id, id));
      return { success: true };
    }),
});

// --- Reservations Router ---
const reservationsRouter = router({
  list: erpPermissionProcedure("erp_real_estate", "view")
    .input(z.object({ status: z.string().optional(), unitId: z.number().optional(), customerId: z.number().optional(), limit: z.number().min(1).max(100).default(50), offset: z.number().min(0).default(0) }))
    .query(async ({ input }) => {
      const db = (await getDb())!;
      const conditions = [isNull(erpRealEstateReservations.deletedAt)];
      if (input.status) conditions.push(eq(erpRealEstateReservations.status, input.status));
      if (input.unitId) conditions.push(eq(erpRealEstateReservations.unitId, input.unitId));
      if (input.customerId) conditions.push(eq(erpRealEstateReservations.customerId, input.customerId));
      const reservations = await db.select().from(erpRealEstateReservations).where(and(...conditions)).orderBy(desc(erpRealEstateReservations.createdAt)).limit(input.limit).offset(input.offset);
      const [{ count }] = await db.select({ count: sql<number>`count(*)` }).from(erpRealEstateReservations).where(and(...conditions));
      return { reservations, total: count };
    }),

  create: erpPermissionProcedure("erp_real_estate", "create")
    .input(z.object({ unitId: z.number(), customerId: z.number(), reservationDate: z.number(), expiryDate: z.number().optional(), reservationAmount: z.number().optional() }))
    .mutation(async ({ input, ctx }) => {
      const db = (await getDb())!;
      const now = Date.now();
      const reservationNumber = generateNumber("RES");
      const [result] = await db.insert(erpRealEstateReservations).values({ ...input, reservationNumber, currency: "XOF", status: "active", createdBy: ctx.user.id, createdAt: now, updatedAt: now });
      // Mark unit as reserved
      await db.update(erpRealEstateUnits).set({ status: "reserved", updatedAt: now }).where(eq(erpRealEstateUnits.id, input.unitId));
      await createAuditEvent({ actorId: ctx.user.id, action: "create", targetType: "erp_real_estate_reservation", targetId: result.insertId, details: { reservationNumber } });
      return { id: result.insertId, reservationNumber };
    }),

  cancel: erpPermissionProcedure("erp_real_estate", "update")
    .input(z.object({ id: z.number(), reason: z.string().optional() }))
    .mutation(async ({ input, ctx }) => {
      const db = (await getDb())!;
      const now = Date.now();
      const [reservation] = await db.select().from(erpRealEstateReservations).where(eq(erpRealEstateReservations.id, input.id));
      if (!reservation) throw new Error("Réservation non trouvée");
      await db.update(erpRealEstateReservations).set({ status: "cancelled", cancelledBy: ctx.user.id, cancelledAt: now, cancellationReason: input.reason, updatedAt: now }).where(eq(erpRealEstateReservations.id, input.id));
      // Release unit
      await db.update(erpRealEstateUnits).set({ status: "available", updatedAt: now }).where(eq(erpRealEstateUnits.id, reservation.unitId));
      return { success: true };
    }),

  convertToSale: erpPermissionProcedure("erp_real_estate", "create")
    .input(z.object({ reservationId: z.number(), totalSaleAmount: z.number(), discountAmount: z.number().optional(), extraFeesAmount: z.number().optional(), taxAmount: z.number().optional(), notaryName: z.string().optional(), notaryContact: z.string().optional() }))
    .mutation(async ({ input, ctx }) => {
      const db = (await getDb())!;
      const now = Date.now();
      const [reservation] = await db.select().from(erpRealEstateReservations).where(eq(erpRealEstateReservations.id, input.reservationId));
      if (!reservation) throw new Error("Réservation non trouvée");
      const saleNumber = generateNumber("VTE");
      const [unit] = await db.select().from(erpRealEstateUnits).where(eq(erpRealEstateUnits.id, reservation.unitId));
      const [result] = await db.insert(erpRealEstateSales).values({
        saleNumber, programId: unit?.programId, unitId: reservation.unitId, customerId: reservation.customerId,
        reservationId: input.reservationId, saleDate: now, basePrice: unit?.currentPrice || input.totalSaleAmount,
        discountAmount: input.discountAmount || 0, extraFeesAmount: input.extraFeesAmount || 0, taxAmount: input.taxAmount || 0,
        totalSaleAmount: input.totalSaleAmount, currency: "XOF", status: "draft",
        notaryName: input.notaryName, notaryContact: input.notaryContact,
        salespersonId: reservation.createdBy, createdBy: ctx.user.id, createdAt: now, updatedAt: now,
      });
      await db.update(erpRealEstateReservations).set({ status: "converted_to_sale", updatedAt: now }).where(eq(erpRealEstateReservations.id, input.reservationId));
      await db.update(erpRealEstateUnits).set({ status: "under_contract", updatedAt: now }).where(eq(erpRealEstateUnits.id, reservation.unitId));
      await createAuditEvent({ actorId: ctx.user.id, action: "create", targetType: "erp_real_estate_sale", targetId: result.insertId, details: { saleNumber, fromReservation: reservation.reservationNumber } });
      return { id: result.insertId, saleNumber };
    }),
});

// --- Sales Router ---
const salesRouter = router({
  list: erpPermissionProcedure("erp_real_estate", "view")
    .input(z.object({ status: z.string().optional(), customerId: z.number().optional(), programId: z.number().optional(), limit: z.number().min(1).max(100).default(50), offset: z.number().min(0).default(0) }))
    .query(async ({ input }) => {
      const db = (await getDb())!;
      const conditions = [isNull(erpRealEstateSales.deletedAt)];
      if (input.status) conditions.push(eq(erpRealEstateSales.status, input.status));
      if (input.customerId) conditions.push(eq(erpRealEstateSales.customerId, input.customerId));
      if (input.programId) conditions.push(eq(erpRealEstateSales.programId, input.programId));
      const sales = await db.select().from(erpRealEstateSales).where(and(...conditions)).orderBy(desc(erpRealEstateSales.createdAt)).limit(input.limit).offset(input.offset);
      const [{ count }] = await db.select({ count: sql<number>`count(*)` }).from(erpRealEstateSales).where(and(...conditions));
      return { sales, total: count };
    }),

  getById: erpPermissionProcedure("erp_real_estate", "view")
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = (await getDb())!;
      const [sale] = await db.select().from(erpRealEstateSales).where(eq(erpRealEstateSales.id, input.id));
      if (!sale) throw new Error("Vente non trouvée");
      const [unit] = await db.select().from(erpRealEstateUnits).where(eq(erpRealEstateUnits.id, sale.unitId));
      const [customer] = await db.select().from(erpRealEstateCustomers).where(eq(erpRealEstateCustomers.id, sale.customerId));
      const plans = await db.select().from(erpRealEstatePaymentPlans).where(eq(erpRealEstatePaymentPlans.saleId, input.id));
      const installments = await db.select().from(erpRealEstateInstallments).where(eq(erpRealEstateInstallments.saleId, input.id));
      const payments = await db.select().from(erpCustomerPayments).where(eq(erpCustomerPayments.saleId, input.id));
      return { ...sale, unit, customer, plans, installments, payments };
    }),

  create: erpPermissionProcedure("erp_real_estate", "create")
    .input(z.object({ unitId: z.number(), customerId: z.number(), totalSaleAmount: z.number(), basePrice: z.number(), discountAmount: z.number().optional(), extraFeesAmount: z.number().optional(), taxAmount: z.number().optional(), notaryName: z.string().optional(), notaryContact: z.string().optional() }))
    .mutation(async ({ input, ctx }) => {
      const db = (await getDb())!;
      const now = Date.now();
      const saleNumber = generateNumber("VTE");
      const [unit] = await db.select().from(erpRealEstateUnits).where(eq(erpRealEstateUnits.id, input.unitId));
      const [result] = await db.insert(erpRealEstateSales).values({
        saleNumber, programId: unit?.programId, unitId: input.unitId, customerId: input.customerId,
        saleDate: now, basePrice: input.basePrice, discountAmount: input.discountAmount || 0,
        extraFeesAmount: input.extraFeesAmount || 0, taxAmount: input.taxAmount || 0,
        totalSaleAmount: input.totalSaleAmount, currency: "XOF", status: "draft",
        notaryName: input.notaryName, notaryContact: input.notaryContact,
        salespersonId: ctx.user.id, createdBy: ctx.user.id, createdAt: now, updatedAt: now,
      });
      await db.update(erpRealEstateUnits).set({ status: "under_contract", updatedAt: now }).where(eq(erpRealEstateUnits.id, input.unitId));
      await createAuditEvent({ actorId: ctx.user.id, action: "create", targetType: "erp_real_estate_sale", targetId: result.insertId, details: { saleNumber } });
      return { id: result.insertId, saleNumber };
    }),

  approve: erpPermissionProcedure("erp_real_estate", "update")
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = (await getDb())!;
      const now = Date.now();
      await db.update(erpRealEstateSales).set({ status: "approved", approvedBy: ctx.user.id, approvedAt: now, updatedAt: now }).where(eq(erpRealEstateSales.id, input.id));
      const [sale] = await db.select().from(erpRealEstateSales).where(eq(erpRealEstateSales.id, input.id));
      if (sale) {
        await db.update(erpRealEstateUnits).set({ status: "sold", updatedAt: now }).where(eq(erpRealEstateUnits.id, sale.unitId));
        await db.update(erpRealEstateCustomers).set({ status: "buyer", updatedAt: now }).where(eq(erpRealEstateCustomers.id, sale.customerId));
      }
      return { success: true };
    }),

  updateStatus: erpPermissionProcedure("erp_real_estate", "update")
    .input(z.object({ id: z.number(), status: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const db = (await getDb())!;
      await db.update(erpRealEstateSales).set({ status: input.status, updatedAt: Date.now() }).where(eq(erpRealEstateSales.id, input.id));
      return { success: true };
    }),

  stats: erpPermissionProcedure("erp_real_estate", "view")
    .query(async () => {
      const db = (await getDb())!;
      const sales = await db.select().from(erpRealEstateSales).where(isNull(erpRealEstateSales.deletedAt));
      const totalSales = sales.length;
      const totalRevenue = sales.filter(s => !["cancelled", "refunded"].includes(s.status)).reduce((sum, s) => sum + (s.totalSaleAmount || 0), 0);
      const pendingSales = sales.filter(s => ["draft", "pending_approval"].includes(s.status)).length;
      const completedSales = sales.filter(s => ["fully_paid", "delivered", "closed"].includes(s.status)).length;
      const payments = await db.select().from(erpCustomerPayments).where(and(isNull(erpCustomerPayments.deletedAt), eq(erpCustomerPayments.status, "validated")));
      const totalCollected = payments.reduce((sum, p) => sum + (p.amount || 0), 0);
      return { totalSales, totalRevenue, pendingSales, completedSales, totalCollected };
    }),
});

// --- Payment Plans & Installments Router ---
const paymentPlansRouter = router({
  create: erpPermissionProcedure("erp_real_estate", "create")
    .input(z.object({ saleId: z.number(), planName: z.string(), totalAmount: z.number(), initialDepositAmount: z.number().optional(), numberOfInstallments: z.number().min(1), frequency: z.string(), installments: z.array(z.object({ dueDate: z.number(), amountDue: z.number() })) }))
    .mutation(async ({ input, ctx }) => {
      const db = (await getDb())!;
      const now = Date.now();
      const { installments, ...planData } = input;
      const [result] = await db.insert(erpRealEstatePaymentPlans).values({ ...planData, initialDepositAmount: planData.initialDepositAmount || 0, status: "active", createdAt: now, updatedAt: now });
      const planId = result.insertId;
      for (let i = 0; i < installments.length; i++) {
        await db.insert(erpRealEstateInstallments).values({
          paymentPlanId: planId, saleId: input.saleId, installmentNumber: i + 1,
          dueDate: installments[i].dueDate, amountDue: installments[i].amountDue,
          amountPaid: 0, balanceDue: installments[i].amountDue, status: "pending",
          createdAt: now, updatedAt: now,
        });
      }
      await db.update(erpRealEstateSales).set({ status: "in_payment", updatedAt: now }).where(eq(erpRealEstateSales.id, input.saleId));
      return { id: planId };
    }),

  getInstallments: erpPermissionProcedure("erp_real_estate", "view")
    .input(z.object({ saleId: z.number() }))
    .query(async ({ input }) => {
      const db = (await getDb())!;
      const installments = await db.select().from(erpRealEstateInstallments).where(eq(erpRealEstateInstallments.saleId, input.saleId)).orderBy(erpRealEstateInstallments.installmentNumber);
      return installments;
    }),
});

// --- Customer Payments Router ---
const customerPaymentsRouter = router({
  list: erpPermissionProcedure("erp_real_estate", "view")
    .input(z.object({ saleId: z.number().optional(), customerId: z.number().optional(), status: z.string().optional(), limit: z.number().min(1).max(100).default(50), offset: z.number().min(0).default(0) }))
    .query(async ({ input }) => {
      const db = (await getDb())!;
      const conditions = [isNull(erpCustomerPayments.deletedAt)];
      if (input.saleId) conditions.push(eq(erpCustomerPayments.saleId, input.saleId));
      if (input.customerId) conditions.push(eq(erpCustomerPayments.customerId, input.customerId));
      if (input.status) conditions.push(eq(erpCustomerPayments.status, input.status));
      const payments = await db.select().from(erpCustomerPayments).where(and(...conditions)).orderBy(desc(erpCustomerPayments.createdAt)).limit(input.limit).offset(input.offset);
      const [{ count }] = await db.select({ count: sql<number>`count(*)` }).from(erpCustomerPayments).where(and(...conditions));
      return { payments, total: count };
    }),

  create: erpPermissionProcedure("erp_real_estate", "create")
    .input(z.object({ saleId: z.number(), customerId: z.number(), installmentId: z.number().optional(), paymentDate: z.number(), amount: z.number(), paymentMethod: z.string(), paymentAccountId: z.number().optional(), reference: z.string().optional() }))
    .mutation(async ({ input, ctx }) => {
      const db = (await getDb())!;
      const now = Date.now();
      const paymentNumber = generateNumber("ENC");
      const [result] = await db.insert(erpCustomerPayments).values({ ...input, paymentNumber, currency: "XOF", status: "received", createdBy: ctx.user.id, createdAt: now, updatedAt: now });
      // Update installment if linked
      if (input.installmentId) {
        const [inst] = await db.select().from(erpRealEstateInstallments).where(eq(erpRealEstateInstallments.id, input.installmentId));
        if (inst) {
          const newPaid = (inst.amountPaid || 0) + input.amount;
          const newBalance = inst.amountDue - newPaid;
          const newStatus = newBalance <= 0 ? "paid" : "partially_paid";
          await db.update(erpRealEstateInstallments).set({ amountPaid: newPaid, balanceDue: Math.max(0, newBalance), status: newStatus, updatedAt: now }).where(eq(erpRealEstateInstallments.id, input.installmentId));
        }
      }
      await createAuditEvent({ actorId: ctx.user.id, action: "create", targetType: "erp_customer_payment", targetId: result.insertId, details: { paymentNumber, amount: input.amount } });
      return { id: result.insertId, paymentNumber };
    }),

  validate: erpPermissionProcedure("erp_real_estate", "update")
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = (await getDb())!;
      const now = Date.now();
      await db.update(erpCustomerPayments).set({ status: "validated", validatedBy: ctx.user.id, validatedAt: now, updatedAt: now }).where(eq(erpCustomerPayments.id, input.id));
      // Check if sale is fully paid
      const [payment] = await db.select().from(erpCustomerPayments).where(eq(erpCustomerPayments.id, input.id));
      if (payment) {
        const allPayments = await db.select().from(erpCustomerPayments).where(and(eq(erpCustomerPayments.saleId, payment.saleId), eq(erpCustomerPayments.status, "validated")));
        const totalPaid = allPayments.reduce((s, p) => s + (p.amount || 0), 0) + payment.amount;
        const [sale] = await db.select().from(erpRealEstateSales).where(eq(erpRealEstateSales.id, payment.saleId));
        if (sale && totalPaid >= sale.totalSaleAmount) {
          await db.update(erpRealEstateSales).set({ status: "fully_paid", updatedAt: now }).where(eq(erpRealEstateSales.id, payment.saleId));
        }
      }
      return { success: true };
    }),
});

// --- Deliveries Router ---
const deliveriesRouter = router({
  list: erpPermissionProcedure("erp_real_estate", "view")
    .input(z.object({ status: z.string().optional(), limit: z.number().min(1).max(100).default(50), offset: z.number().min(0).default(0) }))
    .query(async ({ input }) => {
      const db = (await getDb())!;
      const conditions = [isNull(erpRealEstateDeliveries.deletedAt)];
      if (input.status) conditions.push(eq(erpRealEstateDeliveries.status, input.status));
      const deliveries = await db.select().from(erpRealEstateDeliveries).where(and(...conditions)).orderBy(desc(erpRealEstateDeliveries.createdAt)).limit(input.limit).offset(input.offset);
      const [{ count }] = await db.select({ count: sql<number>`count(*)` }).from(erpRealEstateDeliveries).where(and(...conditions));
      return { deliveries, total: count };
    }),

  create: erpPermissionProcedure("erp_real_estate", "create")
    .input(z.object({ saleId: z.number(), unitId: z.number(), customerId: z.number(), deliveryDate: z.number().optional(), remarks: z.string().optional() }))
    .mutation(async ({ input, ctx }) => {
      const db = (await getDb())!;
      const now = Date.now();
      const deliveryNumber = generateNumber("LIV");
      const [result] = await db.insert(erpRealEstateDeliveries).values({ ...input, deliveryNumber, status: "planned", deliveredBy: ctx.user.id, createdAt: now, updatedAt: now });
      return { id: result.insertId, deliveryNumber };
    }),

  deliver: erpPermissionProcedure("erp_real_estate", "update")
    .input(z.object({ id: z.number(), receivedByName: z.string(), remarks: z.string().optional() }))
    .mutation(async ({ input, ctx }) => {
      const db = (await getDb())!;
      const now = Date.now();
      await db.update(erpRealEstateDeliveries).set({ status: "delivered", deliveryDate: now, receivedByName: input.receivedByName, remarks: input.remarks, updatedAt: now }).where(eq(erpRealEstateDeliveries.id, input.id));
      const [delivery] = await db.select().from(erpRealEstateDeliveries).where(eq(erpRealEstateDeliveries.id, input.id));
      if (delivery) {
        await db.update(erpRealEstateUnits).set({ status: "delivered", updatedAt: now }).where(eq(erpRealEstateUnits.id, delivery.unitId));
        await db.update(erpRealEstateSales).set({ status: "delivered", updatedAt: now }).where(eq(erpRealEstateSales.id, delivery.saleId));
      }
      return { success: true };
    }),

  addReserve: erpPermissionProcedure("erp_real_estate", "create")
    .input(z.object({ deliveryId: z.number(), description: z.string(), severity: z.string(), dueDate: z.number().optional() }))
    .mutation(async ({ input, ctx }) => {
      const db = (await getDb())!;
      const now = Date.now();
      const [result] = await db.insert(erpRealEstateDeliveryReserves).values({ ...input, responsibleUserId: ctx.user.id, status: "open", createdAt: now, updatedAt: now });
      await db.update(erpRealEstateDeliveries).set({ status: "with_reservations", updatedAt: now }).where(eq(erpRealEstateDeliveries.id, input.deliveryId));
      return { id: result.insertId };
    }),
});

// --- Commissions Router ---
const commissionsRouter = router({
  list: erpPermissionProcedure("erp_real_estate", "view")
    .input(z.object({ saleId: z.number().optional(), salespersonId: z.number().optional(), status: z.string().optional(), limit: z.number().min(1).max(100).default(50), offset: z.number().min(0).default(0) }))
    .query(async ({ input }) => {
      const db = (await getDb())!;
      const conditions: any[] = [];
      if (input.saleId) conditions.push(eq(erpSalesCommissions.saleId, input.saleId));
      if (input.salespersonId) conditions.push(eq(erpSalesCommissions.salespersonId, input.salespersonId));
      if (input.status) conditions.push(eq(erpSalesCommissions.status, input.status));
      const where = conditions.length > 0 ? and(...conditions) : undefined;
      const commissions = await db.select().from(erpSalesCommissions).where(where).orderBy(desc(erpSalesCommissions.createdAt)).limit(input.limit).offset(input.offset);
      const [{ count }] = await db.select({ count: sql<number>`count(*)` }).from(erpSalesCommissions).where(where);
      return { commissions, total: count };
    }),

  create: erpPermissionProcedure("erp_real_estate", "create")
    .input(z.object({ saleId: z.number(), salespersonId: z.number(), commissionType: z.string(), commissionRate: z.string().optional(), commissionAmount: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = (await getDb())!;
      const now = Date.now();
      const [result] = await db.insert(erpSalesCommissions).values({ ...input, status: "pending", createdAt: now, updatedAt: now });
      return { id: result.insertId };
    }),

  approve: erpPermissionProcedure("erp_real_estate", "update")
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = (await getDb())!;
      await db.update(erpSalesCommissions).set({ status: "approved", approvedBy: ctx.user.id, approvedAt: Date.now(), updatedAt: Date.now() }).where(eq(erpSalesCommissions.id, input.id));
      return { success: true };
    }),
});

// === COMBINED REAL ESTATE ROUTER ===
export const realEstateRouter = router({
  programs: programsRouter,
  buildings: buildingsRouter,
  units: unitsRouter,
  customers: customersRouter,
  reservations: reservationsRouter,
  sales: salesRouter,
  paymentPlans: paymentPlansRouter,
  customerPayments: customerPaymentsRouter,
  deliveries: deliveriesRouter,
  commissions: commissionsRouter,
});
