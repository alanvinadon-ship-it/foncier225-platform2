import { eq, and, inArray } from "drizzle-orm";
import { getDb } from "./db";
import {
  roles,
  permissions,
  rolePermissions,
  userRoles,
} from "../drizzle/schema";

// ============================================================
// MODULES ET ACTIONS DISPONIBLES
// ============================================================

export const RBAC_MODULES = [
  "titre_foncier",
  "urban_acd",
  "credit",
  "delimitation",
  "payments",
  "appointments",
  "messaging",
  "analytics",
  "interconnexion",
  "users",
  "rbac",
  "parcels",
] as const;

export type RbacModule = (typeof RBAC_MODULES)[number];

export const RBAC_ACTIONS = [
  "view",
  "create",
  "edit",
  "delete",
  "approve",
  "export",
  "manage",
] as const;

export type RbacAction = (typeof RBAC_ACTIONS)[number];

// ============================================================
// RÔLES SYSTÈME PAR DÉFAUT
// ============================================================

export const SYSTEM_ROLES = [
  {
    name: "super_admin",
    displayName: "Super Administrateur",
    description: "Accès complet à tous les modules sans restriction",
  },
  {
    name: "admin",
    displayName: "Administrateur",
    description: "Gestion administrative de la plateforme",
  },
  {
    name: "agent_foncier",
    displayName: "Agent Foncier",
    description: "Traitement des dossiers fonciers (titre, ACD, délimitation)",
  },
  {
    name: "agent_terrain",
    displayName: "Agent de Terrain",
    description: "Collecte de données terrain et vérifications",
  },
  {
    name: "banquier",
    displayName: "Agent Bancaire",
    description: "Gestion des dossiers de crédit habitat",
  },
  {
    name: "citoyen",
    displayName: "Citoyen",
    description: "Accès aux services en ligne pour les citoyens",
  },
] as const;

// ============================================================
// PERMISSIONS PAR DÉFAUT PAR MODULE
// ============================================================

export const DEFAULT_PERMISSIONS: Array<{
  module: RbacModule;
  action: RbacAction;
  displayName: string;
  description: string;
}> = [
  // Titre Foncier
  { module: "titre_foncier", action: "view", displayName: "Voir les titres fonciers", description: "Consulter les dossiers de titre foncier" },
  { module: "titre_foncier", action: "create", displayName: "Créer un titre foncier", description: "Initier une demande de titre foncier" },
  { module: "titre_foncier", action: "edit", displayName: "Modifier un titre foncier", description: "Modifier les informations d'un dossier" },
  { module: "titre_foncier", action: "approve", displayName: "Valider un titre foncier", description: "Approuver ou rejeter une demande" },
  { module: "titre_foncier", action: "export", displayName: "Exporter titres fonciers", description: "Exporter les données en PDF/CSV" },

  // Urban ACD
  { module: "urban_acd", action: "view", displayName: "Voir les ACD", description: "Consulter les arrêtés de concession définitive" },
  { module: "urban_acd", action: "create", displayName: "Créer un ACD", description: "Initier une demande d'ACD" },
  { module: "urban_acd", action: "edit", displayName: "Modifier un ACD", description: "Modifier les informations d'un ACD" },
  { module: "urban_acd", action: "approve", displayName: "Valider un ACD", description: "Approuver ou rejeter une demande d'ACD" },

  // Crédit Habitat
  { module: "credit", action: "view", displayName: "Voir les crédits", description: "Consulter les dossiers de crédit habitat" },
  { module: "credit", action: "create", displayName: "Créer un crédit", description: "Initier un dossier de crédit" },
  { module: "credit", action: "edit", displayName: "Modifier un crédit", description: "Modifier un dossier de crédit" },
  { module: "credit", action: "approve", displayName: "Valider un crédit", description: "Approuver ou rejeter un crédit" },

  // Délimitation
  { module: "delimitation", action: "view", displayName: "Voir les délimitations", description: "Consulter les projets de délimitation" },
  { module: "delimitation", action: "create", displayName: "Créer une délimitation", description: "Initier un projet de délimitation" },
  { module: "delimitation", action: "edit", displayName: "Modifier une délimitation", description: "Modifier les données de délimitation" },
  { module: "delimitation", action: "approve", displayName: "Valider une délimitation", description: "Officialiser une délimitation" },
  { module: "delimitation", action: "export", displayName: "Exporter délimitations", description: "Exporter en GeoJSON/PDF" },

  // Paiements
  { module: "payments", action: "view", displayName: "Voir les paiements", description: "Consulter l'historique des paiements" },
  { module: "payments", action: "create", displayName: "Initier un paiement", description: "Lancer un nouveau paiement" },
  { module: "payments", action: "manage", displayName: "Gérer les paiements", description: "Gérer les remboursements et litiges" },

  // Rendez-vous
  { module: "appointments", action: "view", displayName: "Voir les rendez-vous", description: "Consulter les rendez-vous" },
  { module: "appointments", action: "create", displayName: "Prendre un rendez-vous", description: "Réserver un créneau" },
  { module: "appointments", action: "manage", displayName: "Gérer les rendez-vous", description: "Confirmer, annuler, gérer les disponibilités" },

  // Messagerie
  { module: "messaging", action: "view", displayName: "Voir les messages", description: "Consulter les conversations" },
  { module: "messaging", action: "create", displayName: "Envoyer un message", description: "Créer une nouvelle conversation" },
  { module: "messaging", action: "manage", displayName: "Gérer la messagerie", description: "Assigner, clôturer les conversations" },

  // Analytics
  { module: "analytics", action: "view", displayName: "Voir les statistiques", description: "Consulter le tableau de bord analytique" },
  { module: "analytics", action: "export", displayName: "Exporter les statistiques", description: "Télécharger les rapports" },

  // Interconnexion
  { module: "interconnexion", action: "view", displayName: "Voir l'interconnexion", description: "Consulter le statut des connexions API" },
  { module: "interconnexion", action: "manage", displayName: "Gérer l'interconnexion", description: "Configurer et tester les connexions" },

  // Utilisateurs
  { module: "users", action: "view", displayName: "Voir les utilisateurs", description: "Consulter la liste des utilisateurs" },
  { module: "users", action: "create", displayName: "Créer un utilisateur", description: "Ajouter un nouvel utilisateur" },
  { module: "users", action: "edit", displayName: "Modifier un utilisateur", description: "Modifier les informations d'un utilisateur" },
  { module: "users", action: "delete", displayName: "Supprimer un utilisateur", description: "Désactiver ou supprimer un utilisateur" },

  // RBAC
  { module: "rbac", action: "view", displayName: "Voir les rôles", description: "Consulter les rôles et permissions" },
  { module: "rbac", action: "create", displayName: "Créer un rôle", description: "Ajouter un nouveau rôle" },
  { module: "rbac", action: "edit", displayName: "Modifier un rôle", description: "Modifier les permissions d'un rôle" },
  { module: "rbac", action: "delete", displayName: "Supprimer un rôle", description: "Supprimer un rôle personnalisé" },
  { module: "rbac", action: "manage", displayName: "Assigner des rôles", description: "Assigner ou retirer des rôles aux utilisateurs" },

  // Parcelles
  { module: "parcels", action: "view", displayName: "Voir les parcelles", description: "Consulter les parcelles" },
  { module: "parcels", action: "create", displayName: "Créer une parcelle", description: "Enregistrer une nouvelle parcelle" },
  { module: "parcels", action: "edit", displayName: "Modifier une parcelle", description: "Modifier les informations d'une parcelle" },
  { module: "parcels", action: "delete", displayName: "Supprimer une parcelle", description: "Supprimer une parcelle" },
];

// Mapping rôle système → permissions par défaut
export const ROLE_DEFAULT_PERMISSIONS: Record<string, Array<{ module: RbacModule; action: RbacAction }>> = {
  super_admin: DEFAULT_PERMISSIONS.map(p => ({ module: p.module, action: p.action })), // Toutes les permissions
  admin: DEFAULT_PERMISSIONS.filter(p => !["rbac"].includes(p.module) || p.action === "view").map(p => ({ module: p.module, action: p.action })),
  agent_foncier: [
    { module: "titre_foncier", action: "view" }, { module: "titre_foncier", action: "create" }, { module: "titre_foncier", action: "edit" }, { module: "titre_foncier", action: "approve" },
    { module: "urban_acd", action: "view" }, { module: "urban_acd", action: "create" }, { module: "urban_acd", action: "edit" }, { module: "urban_acd", action: "approve" },
    { module: "delimitation", action: "view" }, { module: "delimitation", action: "create" }, { module: "delimitation", action: "edit" }, { module: "delimitation", action: "approve" }, { module: "delimitation", action: "export" },
    { module: "parcels", action: "view" }, { module: "parcels", action: "create" }, { module: "parcels", action: "edit" },
    { module: "appointments", action: "view" }, { module: "appointments", action: "manage" },
    { module: "messaging", action: "view" }, { module: "messaging", action: "create" }, { module: "messaging", action: "manage" },
    { module: "interconnexion", action: "view" },
  ],
  agent_terrain: [
    { module: "parcels", action: "view" }, { module: "parcels", action: "create" }, { module: "parcels", action: "edit" },
    { module: "delimitation", action: "view" }, { module: "delimitation", action: "create" }, { module: "delimitation", action: "edit" },
    { module: "appointments", action: "view" }, { module: "appointments", action: "manage" },
    { module: "messaging", action: "view" }, { module: "messaging", action: "create" },
  ],
  banquier: [
    { module: "credit", action: "view" }, { module: "credit", action: "create" }, { module: "credit", action: "edit" }, { module: "credit", action: "approve" },
    { module: "payments", action: "view" },
    { module: "messaging", action: "view" }, { module: "messaging", action: "create" },
  ],
  citoyen: [
    { module: "titre_foncier", action: "view" }, { module: "titre_foncier", action: "create" },
    { module: "urban_acd", action: "view" }, { module: "urban_acd", action: "create" },
    { module: "credit", action: "view" }, { module: "credit", action: "create" },
    { module: "payments", action: "view" }, { module: "payments", action: "create" },
    { module: "appointments", action: "view" }, { module: "appointments", action: "create" },
    { module: "messaging", action: "view" }, { module: "messaging", action: "create" },
    { module: "parcels", action: "view" },
    { module: "interconnexion", action: "view" },
  ],
};

// ============================================================
// SERVICE RBAC
// ============================================================

/**
 * Récupère toutes les permissions d'un utilisateur (via ses rôles)
 */
export async function getUserPermissions(userId: number): Promise<Array<{ module: string; action: string }>> {
  const db = (await getDb())!;

  const results = await db
    .select({
      module: permissions.module,
      action: permissions.action,
    })
    .from(userRoles)
    .innerJoin(rolePermissions, eq(rolePermissions.roleId, userRoles.roleId))
    .innerJoin(permissions, eq(permissions.id, rolePermissions.permissionId))
    .where(eq(userRoles.userId, userId));

  return results;
}

/**
 * Vérifie si un utilisateur a une permission spécifique
 */
export async function hasPermission(
  userId: number,
  module: string,
  action: string
): Promise<boolean> {
  const userPerms = await getUserPermissions(userId);
  return userPerms.some(p => p.module === module && p.action === action);
}

/**
 * Vérifie si un utilisateur a accès à un module (n'importe quelle action)
 */
export async function hasModuleAccess(userId: number, module: string): Promise<boolean> {
  const userPerms = await getUserPermissions(userId);
  return userPerms.some(p => p.module === module);
}

/**
 * Récupère les rôles d'un utilisateur
 */
export async function getUserRolesList(userId: number) {
  const db = (await getDb())!;
  return db
    .select({
      roleId: roles.id,
      roleName: roles.name,
      displayName: roles.displayName,
      isSystem: roles.isSystem,
      assignedAt: userRoles.assignedAt,
    })
    .from(userRoles)
    .innerJoin(roles, eq(roles.id, userRoles.roleId))
    .where(eq(userRoles.userId, userId));
}

/**
 * Seed les rôles et permissions par défaut (idempotent)
 */
export async function seedRbacDefaults(): Promise<{ rolesCreated: number; permissionsCreated: number }> {
  const db = (await getDb())!;
  let rolesCreated = 0;
  let permissionsCreated = 0;

  // Seed roles
  for (const role of SYSTEM_ROLES) {
    const existing = await db.select().from(roles).where(eq(roles.name, role.name)).limit(1);
    if (existing.length === 0) {
      await db.insert(roles).values({
        name: role.name,
        displayName: role.displayName,
        description: role.description,
        isSystem: true,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
      rolesCreated++;
    }
  }

  // Seed permissions
  for (const perm of DEFAULT_PERMISSIONS) {
    const existing = await db
      .select()
      .from(permissions)
      .where(and(eq(permissions.module, perm.module), eq(permissions.action, perm.action)))
      .limit(1);
    if (existing.length === 0) {
      await db.insert(permissions).values({
        module: perm.module,
        action: perm.action,
        displayName: perm.displayName,
        description: perm.description,
      });
      permissionsCreated++;
    }
  }

  // Assign default permissions to system roles
  const allRoles = await db.select().from(roles).where(eq(roles.isSystem, true));
  const allPerms = await db.select().from(permissions);

  for (const role of allRoles) {
    const defaultPerms = ROLE_DEFAULT_PERMISSIONS[role.name];
    if (!defaultPerms) continue;

    for (const dp of defaultPerms) {
      const perm = allPerms.find(p => p.module === dp.module && p.action === dp.action);
      if (!perm) continue;

      const existing = await db
        .select()
        .from(rolePermissions)
        .where(and(eq(rolePermissions.roleId, role.id), eq(rolePermissions.permissionId, perm.id)))
        .limit(1);

      if (existing.length === 0) {
        await db.insert(rolePermissions).values({
          roleId: role.id,
          permissionId: perm.id,
        });
      }
    }
  }

  return { rolesCreated, permissionsCreated };
}
