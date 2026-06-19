import { z } from "zod";
import { eq, and, gt, isNull } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure } from "./_core/trpc";
import { getDb, createAuditEvent } from "./db";
import { notaryBaskets, bankMandates, users } from "../drizzle/schema";
import { randomBytes } from "crypto";

// ============================================================
// ROUTEUR D'ISOLATION DES DONNÉES
// Paniers notariaux + Mandats bancaires
// ============================================================

export const isolationRouter = router({
  // ============================================================
  // PANIERS NOTARIAUX (Secret professionnel)
  // Un notaire ne voit que ses propres dossiers
  // ============================================================

  /** Lister les dossiers du notaire connecté */
  listMyBasket: protectedProcedure
    .input(z.object({
      status: z.enum(["draft", "submitted", "validated", "all"]).optional().default("all"),
    }))
    .query(async ({ ctx, input }) => {
      const db = (await getDb())!;

      if (ctx.user.role !== "notaire" && ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Accès réservé aux notaires" });
      }

      const conditions = [eq(notaryBaskets.notaryId, ctx.user.id)];
      if (input.status !== "all") {
        conditions.push(eq(notaryBaskets.status, input.status));
      }

      return db.select().from(notaryBaskets).where(and(...conditions));
    }),

  /** Ajouter un dossier au panier du notaire */
  addToBasket: protectedProcedure
    .input(z.object({
      dossierId: z.number(),
      dossierType: z.enum(["acte_vente", "donation", "hypotheque", "succession", "bail"]),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = (await getDb())!;

      if (ctx.user.role !== "notaire" && ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Accès réservé aux notaires" });
      }

      const [result] = await db.insert(notaryBaskets).values({
        notaryId: ctx.user.id,
        dossierId: input.dossierId,
        dossierType: input.dossierType,
        status: "draft",
      });

      await createAuditEvent({
        actorId: ctx.user.id,
        actorRole: ctx.user.role,
        action: "notary_basket.add",
        targetType: "notary_basket",
        targetId: result.insertId,
        details: { dossierId: input.dossierId, dossierType: input.dossierType },
      });

      return { id: result.insertId };
    }),

  /** Mettre à jour le statut d'un dossier (uniquement le notaire propriétaire) */
  updateBasketStatus: protectedProcedure
    .input(z.object({
      basketId: z.number(),
      status: z.enum(["draft", "submitted", "validated"]),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = (await getDb())!;

      // Vérifier que le dossier appartient au notaire connecté
      const [basket] = await db.select().from(notaryBaskets)
        .where(and(eq(notaryBaskets.id, input.basketId), eq(notaryBaskets.notaryId, ctx.user.id)));

      if (!basket) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Dossier introuvable ou accès non autorisé" });
      }

      await db.update(notaryBaskets)
        .set({ status: input.status })
        .where(eq(notaryBaskets.id, input.basketId));

      await createAuditEvent({
        actorId: ctx.user.id,
        actorRole: ctx.user.role,
        action: "notary_basket.status_change",
        targetType: "notary_basket",
        targetId: input.basketId,
        details: { previousStatus: basket.status, newStatus: input.status },
      });

      return { success: true };
    }),

  // ============================================================
  // MANDATS BANCAIRES (Accès conditionnel)
  // Une banque ne peut consulter qu'avec un mandat valide du citoyen
  // ============================================================

  /** Citoyen : Créer un mandat d'accès pour une banque */
  createMandate: protectedProcedure
    .input(z.object({
      bankId: z.number(),
      permissions: z.array(z.enum(["read_parcel", "read_title", "read_hypotheque", "read_credit"])),
      durationDays: z.number().min(1).max(365).default(30),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = (await getDb())!;

      // Vérifier que l'utilisateur cible est bien une banque
      const [bankUser] = await db.select().from(users).where(eq(users.id, input.bankId));
      if (!bankUser || bankUser.role !== "bank") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "L'utilisateur cible n'est pas une banque" });
      }

      // Générer un code d'accès unique
      const accessCode = randomBytes(32).toString("hex");
      const expiresAt = new Date(Date.now() + input.durationDays * 24 * 60 * 60 * 1000);

      const [result] = await db.insert(bankMandates).values({
        bankId: input.bankId,
        citizenId: ctx.user.id,
        accessCode,
        permissions: input.permissions,
        expiresAt,
      });

      await createAuditEvent({
        actorId: ctx.user.id,
        actorRole: ctx.user.role,
        action: "bank_mandate.created",
        targetType: "bank_mandate",
        targetId: result.insertId,
        details: {
          bankId: input.bankId,
          permissions: input.permissions,
          durationDays: input.durationDays,
          motif: "Mandat d'acc\u00e8s cr\u00e9\u00e9 par le citoyen",
        },
      });

      return { id: result.insertId, accessCode, expiresAt };
    }),

  /** Citoyen : Révoquer un mandat */
  revokeMandate: protectedProcedure
    .input(z.object({ mandateId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = (await getDb())!;

      const [mandate] = await db.select().from(bankMandates)
        .where(and(eq(bankMandates.id, input.mandateId), eq(bankMandates.citizenId, ctx.user.id)));

      if (!mandate) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Mandat introuvable" });
      }

      await db.update(bankMandates)
        .set({ revokedAt: new Date() })
        .where(eq(bankMandates.id, input.mandateId));

      await createAuditEvent({
        actorId: ctx.user.id,
        actorRole: ctx.user.role,
        action: "bank_mandate.revoked",
        targetType: "bank_mandate",
        targetId: input.mandateId,
        details: { bankId: mandate.bankId, motif: "R\u00e9vocation par le citoyen" },
      });

      return { success: true };
    }),

  /** Citoyen : Lister ses mandats actifs */
  listMyMandates: protectedProcedure.query(async ({ ctx }) => {
    const db = (await getDb())!;

    return db.select({
      id: bankMandates.id,
      bankId: bankMandates.bankId,
      accessCode: bankMandates.accessCode,
      permissions: bankMandates.permissions,
      expiresAt: bankMandates.expiresAt,
      revokedAt: bankMandates.revokedAt,
      createdAt: bankMandates.createdAt,
    })
      .from(bankMandates)
      .where(eq(bankMandates.citizenId, ctx.user.id));
  }),

  /** Banque : Vérifier un mandat d'accès (via code) */
  verifyMandate: protectedProcedure
    .input(z.object({ accessCode: z.string() }))
    .query(async ({ ctx, input }) => {
      const db = (await getDb())!;

      if (ctx.user.role !== "bank" && ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Accès réservé aux banques" });
      }

      const [mandate] = await db.select().from(bankMandates)
        .where(and(
          eq(bankMandates.accessCode, input.accessCode),
          eq(bankMandates.bankId, ctx.user.id),
          isNull(bankMandates.revokedAt),
          gt(bankMandates.expiresAt, new Date()),
        ));

      if (!mandate) {
        return { valid: false, permissions: [] as string[] };
      }

      // Logger la consultation
      await createAuditEvent({
        actorId: ctx.user.id,
        actorRole: ctx.user.role,
        action: "bank_mandate.verified",
        targetType: "bank_mandate",
        targetId: mandate.id,
        details: {
          citizenId: mandate.citizenId,
          motif: "V\u00e9rification de mandat par la banque",
        },
      });

      return { valid: true, permissions: mandate.permissions, expiresAt: mandate.expiresAt };
    }),

  /** Banque : Lister les mandats actifs reçus */
  listReceivedMandates: protectedProcedure.query(async ({ ctx }) => {
    const db = (await getDb())!;

    if (ctx.user.role !== "bank" && ctx.user.role !== "admin") {
      throw new TRPCError({ code: "FORBIDDEN", message: "Accès réservé aux banques" });
    }

    return db.select({
      id: bankMandates.id,
      citizenId: bankMandates.citizenId,
      permissions: bankMandates.permissions,
      expiresAt: bankMandates.expiresAt,
      createdAt: bankMandates.createdAt,
    })
      .from(bankMandates)
      .where(and(
        eq(bankMandates.bankId, ctx.user.id),
        isNull(bankMandates.revokedAt),
        gt(bankMandates.expiresAt, new Date()),
      ));
  }),
});
