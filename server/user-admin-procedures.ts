import { TRPCError } from "@trpc/server";
import { randomBytes } from "crypto";
import { z } from "zod";
import { adminProcedure, router } from "./_core/trpc";
import {
  createAuditEvent,
  createInvitation,
  deleteUser,
  getUserByEmail,
  getUserById,
  listUsersWithSearch,
  updateUser,
} from "./db";

export const userAdminProcedures = {
  listUsersAdmin: adminProcedure
    .input(z.object({
      limit: z.number().min(1).max(100).default(50),
      offset: z.number().min(0).default(0),
      search: z.string().optional(),
    }))
    .query(async ({ input }) => {
      return listUsersWithSearch(input.limit, input.offset, input.search);
    }),

  createUser: adminProcedure
    .input(z.object({
      name: z.string().min(2).max(255),
      email: z.string().email(),
      role: z.enum(["citizen", "agent_terrain", "agent_mclu", "geometre_urbain", "conservateur", "notaire", "bank", "admin"]),
    }))
    .mutation(async ({ input, ctx }) => {
      const existing = await getUserByEmail(input.email);
      if (existing) {
        throw new TRPCError({ code: "CONFLICT", message: "Un utilisateur avec cet email existe déjà" });
      }

      const tempPassword = randomBytes(16).toString("hex").slice(0, 12);
      const openId = `manual_${Date.now()}_${randomBytes(8).toString("hex")}`;

      const { getDb } = await import("./db");
      const { users } = await import("../drizzle/schema");
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      const result = await db.insert(users).values({
        openId,
        name: input.name,
        email: input.email,
        role: input.role as any,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        lastSignedIn: new Date(),
      });

      const newUser = await getUserByEmail(input.email);
      if (!newUser) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Utilisateur créé mais introuvable" });
      const userId = newUser.id;

      await createAuditEvent({
        actorId: ctx.user.id,
        actorRole: ctx.user.role,
        action: "admin.createUser",
        targetType: "user",
        targetId: userId,
        details: { name: input.name, email: input.email, role: input.role },
      });

      return { id: userId, name: input.name, email: input.email, tempPassword };
    }),

  inviteUser: adminProcedure
    .input(z.object({
      email: z.string().email(),
      role: z.enum(["citizen", "agent_terrain", "agent_mclu", "geometre_urbain", "conservateur", "notaire", "bank", "admin"]),
    }))
    .mutation(async ({ input, ctx }) => {
      const existing = await getUserByEmail(input.email);
      if (existing) {
        throw new TRPCError({ code: "CONFLICT", message: "Un utilisateur avec cet email existe déjà" });
      }

      const invitation = await createInvitation(input.email, input.role, ctx.user.id);

      await createAuditEvent({
        actorId: ctx.user.id,
        actorRole: ctx.user.role,
        action: "admin.inviteUser",
        targetType: "user_invitation",
        targetId: 0,
        details: { email: input.email, role: input.role },
      });

      return { success: true, email: input.email, expiresAt: invitation.expiresAt };
    }),

  updateUserDetails: adminProcedure
    .input(z.object({
      userId: z.number(),
      name: z.string().min(2).max(255).optional(),
      email: z.string().email().optional(),
      role: z.enum(["citizen", "agent_terrain", "agent_mclu", "geometre_urbain", "conservateur", "notaire", "bank", "admin"]).optional(),
      isActive: z.boolean().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const user = await getUserById(input.userId);
      if (!user) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Utilisateur introuvable" });
      }

      if (input.email && input.email !== user.email) {
        const existing = await getUserByEmail(input.email);
        if (existing) {
          throw new TRPCError({ code: "CONFLICT", message: "Un utilisateur avec cet email existe déjà" });
        }
      }

      await updateUser(input.userId, {
        name: input.name,
        email: input.email,
        role: input.role,
        isActive: input.isActive,
      });

      await createAuditEvent({
        actorId: ctx.user.id,
        actorRole: ctx.user.role,
        action: "admin.updateUserDetails",
        targetType: "user",
        targetId: input.userId,
        details: { name: input.name, email: input.email, role: input.role, isActive: input.isActive },
      });

      return { success: true };
    }),

  deleteUserAdmin: adminProcedure
    .input(z.object({ userId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const user = await getUserById(input.userId);
      if (!user) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Utilisateur introuvable" });
      }

      if (user.role === "admin") {
        const { getDb } = await import("./db");
        const { users } = await import("../drizzle/schema");
        const { eq, sql } = await import("drizzle-orm");
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        const adminCount = await db.select({ count: sql<number>`count(*)` }).from(users).where(eq(users.role, "admin"));
        if ((adminCount[0]?.count ?? 0) <= 1) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Impossible de supprimer le dernier administrateur" });
        }
      }

      await deleteUser(input.userId);

      await createAuditEvent({
        actorId: ctx.user.id,
        actorRole: ctx.user.role,
        action: "admin.deleteUser",
        targetType: "user",
        targetId: input.userId,
        details: { name: user.name, email: user.email, role: user.role },
      });

      return { success: true };
    }),
};
