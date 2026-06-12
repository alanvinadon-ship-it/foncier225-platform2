import { z } from "zod";
import { eq, and, like, sql } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { router, adminProcedure, protectedProcedure } from "./_core/trpc";
import { getDb } from "./db";
import {
  roles,
  permissions,
  rolePermissions,
  userRoles,
  users,
} from "../drizzle/schema";
import {
  getUserPermissions,
  hasPermission,
  getUserRolesList,
  seedRbacDefaults,
  RBAC_MODULES,
  RBAC_ACTIONS,
} from "./rbac.service";

// ============================================================
// ROUTEUR RBAC ADMIN
// ============================================================

export const rbacRouter = router({
  // --- RÔLES ---

  /** Lister tous les rôles */
  listRoles: adminProcedure.query(async () => {
    const db = (await getDb())!;
    const allRoles = await db.select().from(roles);

    // Compter les utilisateurs par rôle
    const roleCounts = await db
      .select({
        roleId: userRoles.roleId,
        count: sql<number>`COUNT(*)`.as("count"),
      })
      .from(userRoles)
      .groupBy(userRoles.roleId);

    return allRoles.map(role => ({
      ...role,
      userCount: roleCounts.find(rc => rc.roleId === role.id)?.count ?? 0,
    }));
  }),

  /** Créer un nouveau rôle */
  createRole: adminProcedure
    .input(
      z.object({
        name: z.string().min(2).max(64).regex(/^[a-z_]+$/),
        displayName: z.string().min(2).max(128),
        description: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = (await getDb())!;

      // Vérifier unicité
      const existing = await db.select().from(roles).where(eq(roles.name, input.name)).limit(1);
      if (existing.length > 0) {
        throw new TRPCError({ code: "CONFLICT", message: "Un rôle avec ce nom existe déjà" });
      }

      const [inserted] = await db.insert(roles).values({
        name: input.name,
        displayName: input.displayName,
        description: input.description ?? null,
        isSystem: false,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      return { id: inserted.insertId, name: input.name };
    }),

  /** Modifier un rôle (non-système uniquement) */
  updateRole: adminProcedure
    .input(
      z.object({
        roleId: z.number(),
        displayName: z.string().min(2).max(128).optional(),
        description: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = (await getDb())!;

      const [role] = await db.select().from(roles).where(eq(roles.id, input.roleId)).limit(1);
      if (!role) throw new TRPCError({ code: "NOT_FOUND", message: "Rôle introuvable" });
      if (role.isSystem) throw new TRPCError({ code: "FORBIDDEN", message: "Les rôles système ne peuvent pas être modifiés" });

      const updates: Record<string, unknown> = { updatedAt: Date.now() };
      if (input.displayName) updates.displayName = input.displayName;
      if (input.description !== undefined) updates.description = input.description;

      await db.update(roles).set(updates).where(eq(roles.id, input.roleId));
      return { success: true };
    }),

  /** Supprimer un rôle (non-système uniquement) */
  deleteRole: adminProcedure
    .input(z.object({ roleId: z.number() }))
    .mutation(async ({ input }) => {
      const db = (await getDb())!;

      const [role] = await db.select().from(roles).where(eq(roles.id, input.roleId)).limit(1);
      if (!role) throw new TRPCError({ code: "NOT_FOUND", message: "Rôle introuvable" });
      if (role.isSystem) throw new TRPCError({ code: "FORBIDDEN", message: "Les rôles système ne peuvent pas être supprimés" });

      // Vérifier qu'aucun utilisateur n'a ce rôle
      const usersWithRole = await db.select().from(userRoles).where(eq(userRoles.roleId, input.roleId)).limit(1);
      if (usersWithRole.length > 0) {
        throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Ce rôle est encore assigné à des utilisateurs. Retirez-le d'abord." });
      }

      // Supprimer les permissions associées puis le rôle
      await db.delete(rolePermissions).where(eq(rolePermissions.roleId, input.roleId));
      await db.delete(roles).where(eq(roles.id, input.roleId));

      return { success: true };
    }),

  // --- PERMISSIONS ---

  /** Lister toutes les permissions (groupées par module) */
  listPermissions: adminProcedure.query(async () => {
    const db = (await getDb())!;
    const allPerms = await db.select().from(permissions);

    // Grouper par module
    const grouped: Record<string, typeof allPerms> = {};
    for (const perm of allPerms) {
      if (!grouped[perm.module]) grouped[perm.module] = [];
      grouped[perm.module].push(perm);
    }

    return { permissions: allPerms, grouped };
  }),

  /** Récupérer les permissions d'un rôle */
  getRolePermissions: adminProcedure
    .input(z.object({ roleId: z.number() }))
    .query(async ({ input }) => {
      const db = (await getDb())!;

      const perms = await db
        .select({
          permissionId: permissions.id,
          module: permissions.module,
          action: permissions.action,
          displayName: permissions.displayName,
        })
        .from(rolePermissions)
        .innerJoin(permissions, eq(permissions.id, rolePermissions.permissionId))
        .where(eq(rolePermissions.roleId, input.roleId));

      return perms;
    }),

  /** Assigner des permissions à un rôle */
  assignPermissions: adminProcedure
    .input(
      z.object({
        roleId: z.number(),
        permissionIds: z.array(z.number()),
      })
    )
    .mutation(async ({ input }) => {
      const db = (await getDb())!;

      const [role] = await db.select().from(roles).where(eq(roles.id, input.roleId)).limit(1);
      if (!role) throw new TRPCError({ code: "NOT_FOUND", message: "Rôle introuvable" });

      // Supprimer toutes les permissions existantes et réassigner
      await db.delete(rolePermissions).where(eq(rolePermissions.roleId, input.roleId));

      if (input.permissionIds.length > 0) {
        const values = input.permissionIds.map(permId => ({
          roleId: input.roleId,
          permissionId: permId,
        }));
        await db.insert(rolePermissions).values(values);
      }

      await db.update(roles).set({ updatedAt: Date.now() }).where(eq(roles.id, input.roleId));

      return { success: true, count: input.permissionIds.length };
    }),

  // --- ASSIGNATION UTILISATEURS ---

  /** Lister les utilisateurs avec leurs rôles */
  listUsersWithRoles: adminProcedure
    .input(
      z.object({
        search: z.string().optional(),
        page: z.number().default(1),
        limit: z.number().default(20),
      })
    )
    .query(async ({ input }) => {
      const db = (await getDb())!;
      const offset = (input.page - 1) * input.limit;

      let query = db.select().from(users);
      if (input.search) {
        query = query.where(like(users.name, `%${input.search}%`)) as any;
      }

      const usersList = await (query as any).limit(input.limit).offset(offset);

      // Récupérer les rôles pour chaque utilisateur
      const usersWithRoles = await Promise.all(
        usersList.map(async (user: any) => {
          const userRolesList = await getUserRolesList(user.id);
          return {
            id: user.id,
            name: user.name,
            email: user.email,
            legacyRole: user.role,
            isActive: user.isActive,
            roles: userRolesList,
          };
        })
      );

      return usersWithRoles;
    }),

  /** Assigner un rôle à un utilisateur */
  assignRoleToUser: adminProcedure
    .input(
      z.object({
        userId: z.number(),
        roleId: z.number(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = (await getDb())!;

      // Vérifier que l'utilisateur existe
      const [user] = await db.select().from(users).where(eq(users.id, input.userId)).limit(1);
      if (!user) throw new TRPCError({ code: "NOT_FOUND", message: "Utilisateur introuvable" });

      // Vérifier que le rôle existe
      const [role] = await db.select().from(roles).where(eq(roles.id, input.roleId)).limit(1);
      if (!role) throw new TRPCError({ code: "NOT_FOUND", message: "Rôle introuvable" });

      // Vérifier si déjà assigné
      const existing = await db
        .select()
        .from(userRoles)
        .where(and(eq(userRoles.userId, input.userId), eq(userRoles.roleId, input.roleId)))
        .limit(1);

      if (existing.length > 0) {
        throw new TRPCError({ code: "CONFLICT", message: "Ce rôle est déjà assigné à cet utilisateur" });
      }

      await db.insert(userRoles).values({
        userId: input.userId,
        roleId: input.roleId,
        assignedAt: Date.now(),
        assignedBy: ctx.user.id,
      });

      return { success: true };
    }),

  /** Retirer un rôle d'un utilisateur */
  removeRoleFromUser: adminProcedure
    .input(
      z.object({
        userId: z.number(),
        roleId: z.number(),
      })
    )
    .mutation(async ({ input }) => {
      const db = (await getDb())!;

      await db
        .delete(userRoles)
        .where(and(eq(userRoles.userId, input.userId), eq(userRoles.roleId, input.roleId)));

      return { success: true };
    }),

  // --- SEED ---

  /** Initialiser les rôles et permissions par défaut */
  seedDefaults: adminProcedure.mutation(async () => {
    const result = await seedRbacDefaults();
    return result;
  }),

  // --- VÉRIFICATION (accessible à tout utilisateur authentifié) ---

  /** Récupérer mes permissions */
  myPermissions: protectedProcedure.query(async ({ ctx }) => {
    const perms = await getUserPermissions(ctx.user.id);
    const rolesList = await getUserRolesList(ctx.user.id);
    return { permissions: perms, roles: rolesList };
  }),

  /** Vérifier si j'ai une permission spécifique */
  checkPermission: protectedProcedure
    .input(
      z.object({
        module: z.string(),
        action: z.string(),
      })
    )
    .query(async ({ ctx, input }) => {
      const allowed = await hasPermission(ctx.user.id, input.module, input.action);
      return { allowed };
    }),
});
