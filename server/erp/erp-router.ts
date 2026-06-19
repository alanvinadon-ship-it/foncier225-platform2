import { z } from "zod";
import { eq, and, like, sql } from "drizzle-orm";
import { router, erpProtectedProcedure, erpPermissionProcedure, protectedProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { createAuditEvent } from "../db";
import {
  erpRoles,
  erpPermissions,
  erpRolePermissions,
  erpUserRoles,
  users,
} from "../../drizzle/schema";
import {
  getUserErpPermissions,
  getUserErpRoles,
  hasAnyErpRole,
  seedErpRbac,
  ERP_MODULES,
  ERP_ACTIONS,
} from "./erp-rbac.service";

// ============================================================
// ERP AUTH ROUTER
// ============================================================

const erpAuthRouter = router({
  /**
   * GET /api/erp/auth/me
   * Retourne les infos utilisateur ERP + rôles + permissions
   */
  me: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.user.id;
    const hasErp = ctx.user.role === "admin" || await hasAnyErpRole(userId);

    if (!hasErp) {
      return { hasAccess: false as const, user: null, roles: [], permissions: [] };
    }

    const erpRolesList = await getUserErpRoles(userId);
    const erpPerms = await getUserErpPermissions(userId);

    // Admin Foncier225 → toutes les permissions ERP implicites
    const allPermissions = ctx.user.role === "admin"
      ? ERP_MODULES.flatMap(m => ERP_ACTIONS.map(a => ({ module: m, action: a })))
      : erpPerms;

    return {
      hasAccess: true as const,
      user: {
        id: ctx.user.id,
        name: ctx.user.name,
        email: ctx.user.email,
        role: ctx.user.role,
      },
      roles: ctx.user.role === "admin"
        ? [{ roleId: 0, roleName: "erp_super_admin", displayName: "Super Admin ERP (Foncier225 Admin)", isSystem: true, assignedAt: 0 }]
        : erpRolesList,
      permissions: allPermissions,
    };
  }),
});

// ============================================================
// ERP ROLES ROUTER
// ============================================================

const erpRolesRouter = router({
  /**
   * GET /api/erp/roles — Liste tous les rôles ERP
   */
  list: erpProtectedProcedure.query(async () => {
    const db = (await getDb())!;
    return db.select().from(erpRoles).orderBy(erpRoles.name);
  }),

  /**
   * POST /api/erp/roles — Créer un nouveau rôle ERP
   */
  create: erpPermissionProcedure("erp_audit_logs", "view").input(
    z.object({
      name: z.string().min(2).max(64).regex(/^[a-z_]+$/, "Le nom doit être en snake_case"),
      displayName: z.string().min(2).max(128),
      description: z.string().optional(),
    })
  ).mutation(async ({ input, ctx }) => {
    const db = (await getDb())!;

    // Vérifier unicité
    const existing = await db.select().from(erpRoles).where(eq(erpRoles.name, input.name)).limit(1);
    if (existing.length > 0) {
      throw new Error(`Le rôle ERP '${input.name}' existe déjà`);
    }

    const [result] = await db.insert(erpRoles).values({
      name: input.name,
      displayName: input.displayName,
      description: input.description || null,
      isSystem: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    await createAuditEvent({
      actorId: ctx.user.id,
      action: "erp.role.created",
      targetType: "erp_role",
      targetId: result.insertId,
      details: { roleName: input.name, displayName: input.displayName },
    });

    return { id: result.insertId, name: input.name };
  }),

  /**
   * PUT /api/erp/roles/{id} — Modifier un rôle ERP
   */
  update: erpPermissionProcedure("erp_audit_logs", "view").input(
    z.object({
      id: z.number(),
      displayName: z.string().min(2).max(128).optional(),
      description: z.string().optional(),
    })
  ).mutation(async ({ input, ctx }) => {
    const db = (await getDb())!;

    const [role] = await db.select().from(erpRoles).where(eq(erpRoles.id, input.id)).limit(1);
    if (!role) throw new Error("Rôle ERP introuvable");
    if (role.isSystem) throw new Error("Impossible de modifier un rôle système");

    const updates: Record<string, unknown> = { updatedAt: Date.now() };
    if (input.displayName) updates.displayName = input.displayName;
    if (input.description !== undefined) updates.description = input.description;

    await db.update(erpRoles).set(updates).where(eq(erpRoles.id, input.id));

    await createAuditEvent({
      actorId: ctx.user.id,
      action: "erp.role.updated",
      targetType: "erp_role",
      targetId: input.id,
      details: { roleName: role.name, changes: updates },
    });

    return { success: true };
  }),

  /**
   * DELETE /api/erp/roles/{id} — Supprimer un rôle ERP
   */
  delete: erpPermissionProcedure("erp_audit_logs", "view").input(
    z.object({ id: z.number() })
  ).mutation(async ({ input, ctx }) => {
    const db = (await getDb())!;

    const [role] = await db.select().from(erpRoles).where(eq(erpRoles.id, input.id)).limit(1);
    if (!role) throw new Error("Rôle ERP introuvable");
    if (role.isSystem) throw new Error("Impossible de supprimer un rôle système");

    // Vérifier qu'aucun utilisateur n'a ce rôle
    const usersWithRole = await db.select().from(erpUserRoles).where(eq(erpUserRoles.roleId, input.id)).limit(1);
    if (usersWithRole.length > 0) {
      throw new Error("Impossible de supprimer un rôle assigné à des utilisateurs. Retirez d'abord les assignations.");
    }

    // Supprimer les permissions du rôle puis le rôle
    await db.delete(erpRolePermissions).where(eq(erpRolePermissions.roleId, input.id));
    await db.delete(erpRoles).where(eq(erpRoles.id, input.id));

    await createAuditEvent({
      actorId: ctx.user.id,
      action: "erp.role.deleted",
      targetType: "erp_role",
      targetId: input.id,
      details: { roleName: role.name },
    });

    return { success: true };
  }),

  /**
   * Assigner des permissions à un rôle ERP
   */
  assignPermissions: erpPermissionProcedure("erp_audit_logs", "view").input(
    z.object({
      roleId: z.number(),
      permissionIds: z.array(z.number()),
    })
  ).mutation(async ({ input, ctx }) => {
    const db = (await getDb())!;

    // Supprimer les anciennes permissions
    await db.delete(erpRolePermissions).where(eq(erpRolePermissions.roleId, input.roleId));

    // Insérer les nouvelles
    if (input.permissionIds.length > 0) {
      await db.insert(erpRolePermissions).values(
        input.permissionIds.map(permId => ({
          roleId: input.roleId,
          permissionId: permId,
        }))
      );
    }

    await createAuditEvent({
      actorId: ctx.user.id,
      action: "erp.role.permissions_updated",
      targetType: "erp_role",
      targetId: input.roleId,
      details: { permissionCount: input.permissionIds.length },
    });

    return { success: true };
  }),
});

// ============================================================
// ERP PERMISSIONS ROUTER
// ============================================================

const erpPermissionsRouter = router({
  /**
   * GET /api/erp/permissions — Liste toutes les permissions ERP
   */
  list: erpProtectedProcedure.query(async () => {
    const db = (await getDb())!;
    return db.select().from(erpPermissions).orderBy(erpPermissions.module, erpPermissions.action);
  }),

  /**
   * Récupère les permissions d'un rôle spécifique
   */
  byRole: erpProtectedProcedure.input(
    z.object({ roleId: z.number() })
  ).query(async ({ input }) => {
    const db = (await getDb())!;
    const results = await db
      .select({ permissionId: erpRolePermissions.permissionId })
      .from(erpRolePermissions)
      .where(eq(erpRolePermissions.roleId, input.roleId));
    return results.map(r => r.permissionId);
  }),
});

// ============================================================
// ERP USER ROLES ROUTER
// ============================================================

const erpUserRolesRouter = router({
  /**
   * POST /api/erp/users/{id}/roles — Assigner un rôle ERP à un utilisateur
   */
  assign: erpPermissionProcedure("erp_audit_logs", "view").input(
    z.object({
      userId: z.number(),
      roleId: z.number(),
    })
  ).mutation(async ({ input, ctx }) => {
    const db = (await getDb())!;

    // Vérifier que l'utilisateur existe
    const [user] = await db.select().from(users).where(eq(users.id, input.userId)).limit(1);
    if (!user) throw new Error("Utilisateur introuvable");

    // Vérifier que le rôle existe
    const [role] = await db.select().from(erpRoles).where(eq(erpRoles.id, input.roleId)).limit(1);
    if (!role) throw new Error("Rôle ERP introuvable");

    // Vérifier que l'assignation n'existe pas déjà
    const existing = await db
      .select()
      .from(erpUserRoles)
      .where(and(eq(erpUserRoles.userId, input.userId), eq(erpUserRoles.roleId, input.roleId)))
      .limit(1);
    if (existing.length > 0) {
      throw new Error("Ce rôle ERP est déjà assigné à cet utilisateur");
    }

    await db.insert(erpUserRoles).values({
      userId: input.userId,
      roleId: input.roleId,
      assignedAt: Date.now(),
      assignedBy: ctx.user.id,
    });

    await createAuditEvent({
      actorId: ctx.user.id,
      action: "erp.user_role.assigned",
      targetType: "user",
      targetId: input.userId,
      details: { roleId: input.roleId, roleName: role.name },
    });

    return { success: true };
  }),

  /**
   * DELETE /api/erp/users/{id}/roles/{roleId} — Retirer un rôle ERP à un utilisateur
   */
  remove: erpPermissionProcedure("erp_audit_logs", "view").input(
    z.object({
      userId: z.number(),
      roleId: z.number(),
    })
  ).mutation(async ({ input, ctx }) => {
    const db = (await getDb())!;

    const [role] = await db.select().from(erpRoles).where(eq(erpRoles.id, input.roleId)).limit(1);

    await db
      .delete(erpUserRoles)
      .where(and(eq(erpUserRoles.userId, input.userId), eq(erpUserRoles.roleId, input.roleId)));

    await createAuditEvent({
      actorId: ctx.user.id,
      action: "erp.user_role.removed",
      targetType: "user",
      targetId: input.userId,
      details: { roleId: input.roleId, roleName: role?.name || "unknown" },
    });

    return { success: true };
  }),

  /**
   * Liste les utilisateurs avec leurs rôles ERP
   */
  listUsers: erpProtectedProcedure.input(
    z.object({
      search: z.string().optional(),
      limit: z.number().min(1).max(100).default(50),
      offset: z.number().min(0).default(0),
    }).optional()
  ).query(async ({ input }) => {
    const db = (await getDb())!;
    const params = input || { limit: 50, offset: 0 };

    // Récupérer les utilisateurs qui ont au moins un rôle ERP
    const userIdsWithErp = await db
      .selectDistinct({ userId: erpUserRoles.userId })
      .from(erpUserRoles);

    const userIds = userIdsWithErp.map(u => u.userId);
    if (userIds.length === 0) return { users: [], total: 0 };

    // Récupérer les infos utilisateurs
    let query = db.select().from(users);
    if (params.search) {
      query = query.where(like(users.name, `%${params.search}%`)) as typeof query;
    }

    const allUsers = await query;
    const erpUsers = allUsers.filter(u => userIds.includes(u.id));

    // Enrichir avec les rôles ERP
    const enriched = await Promise.all(
      erpUsers.slice(params.offset, params.offset + params.limit).map(async (user) => {
        const roles = await getUserErpRoles(user.id);
        return { ...user, erpRoles: roles };
      })
    );

    return { users: enriched, total: erpUsers.length };
  }),
});

// ============================================================
// ERP ADMIN ROUTER (seed)
// ============================================================

const erpAdminRouter = router({
  /**
   * Seed les rôles et permissions ERP par défaut
   */
  seed: erpProtectedProcedure.mutation(async ({ ctx }) => {
    // Seul un admin peut seed
    if (ctx.user.role !== "admin") {
      throw new Error("Seul un administrateur peut initialiser les données ERP");
    }

    const result = await seedErpRbac();

    await createAuditEvent({
      actorId: ctx.user.id,
      action: "erp.rbac.seeded",
      targetType: "system",
      targetId: 0,
      details: result,
    });

    return result;
  }),

  /**
   * Statistiques ERP
   */
  stats: erpProtectedProcedure.query(async () => {
    const db = (await getDb())!;

    const [rolesCount] = await db.select({ count: sql<number>`COUNT(*)` }).from(erpRoles);
    const [permsCount] = await db.select({ count: sql<number>`COUNT(*)` }).from(erpPermissions);
    const [userRolesCount] = await db.select({ count: sql<number>`COUNT(DISTINCT user_id)` }).from(erpUserRoles);

    return {
      totalRoles: rolesCount.count,
      totalPermissions: permsCount.count,
      usersWithErpAccess: userRolesCount.count,
      modules: ERP_MODULES.length,
      actions: ERP_ACTIONS.length,
    };
  }),
});

// ============================================================
// ERP ROUTER PRINCIPAL
// ============================================================

import { erpDashboardRouter } from "./erp-dashboard-router";
import { erpProjectsRouter } from "./erp-projects-router";
import { erpTasksRouter } from "./erp-tasks-router";
import { erpMilestonesRouter } from "./erp-milestones-router";
import { erpGanttRouter } from "./erp-gantt-router";
import { erpDocumentsRouter } from "./erp-documents-router";
import { erpPermitsRouter } from "./erp-permits-router";
import { erpComplianceRouter } from "./erp-compliance-router";
import { erpEquipmentRouter } from "./erp-equipment-router";
import { erpSafetyRouter } from "./erp-safety-router";
import { erpVendorsRouter } from "./erp-vendors-router";
import { erpContractorsRouter } from "./erp-contractors-router";
import { erpCertificationsRouter } from "./erp-certifications-router";

export const erpRouter = router({
  auth: erpAuthRouter,
  roles: erpRolesRouter,
  permissions: erpPermissionsRouter,
  userRoles: erpUserRolesRouter,
  admin: erpAdminRouter,
  dashboard: erpDashboardRouter,
  projects: erpProjectsRouter,
  tasks: erpTasksRouter,
  milestones: erpMilestonesRouter,
  gantt: erpGanttRouter,
  documents: erpDocumentsRouter,
  permits: erpPermitsRouter,
  compliance: erpComplianceRouter,
  equipment: erpEquipmentRouter,
  safety: erpSafetyRouter,
  vendors: erpVendorsRouter,
  contractors: erpContractorsRouter,
  certifications: erpCertificationsRouter,
});
