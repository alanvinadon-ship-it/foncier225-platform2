import { eq, and } from "drizzle-orm";
import { getDb } from "../db";
import {
  erpRoles,
  erpPermissions,
  erpRolePermissions,
  erpUserRoles,
  users,
} from "../../drizzle/schema";

// ============================================================
// ERP MODULES (14 modules)
// ============================================================

export const ERP_MODULES = [
  "erp_dashboard",
  "erp_projects",
  "erp_gantt",
  "erp_documents",
  "erp_compliance",
  "erp_equipment",
  "erp_safety",
  "erp_vendors",
  "erp_contractors",
  "erp_inventory",
  "erp_finance",
  "erp_alerts",
  "erp_profile",
  "erp_audit_logs",
] as const;

export type ErpModule = (typeof ERP_MODULES)[number];

// ============================================================
// ERP ACTIONS (12 actions)
// ============================================================

export const ERP_ACTIONS = [
  "view",
  "create",
  "update",
  "delete",
  "approve",
  "export",
  "upload",
  "download",
  "assign",
  "validate",
  "pay",
  "rate",
] as const;

export type ErpAction = (typeof ERP_ACTIONS)[number];

// ============================================================
// ERP SYSTEM ROLES (9 rôles)
// ============================================================

export const ERP_SYSTEM_ROLES = [
  {
    name: "erp_super_admin",
    displayName: "Super Admin ERP",
    description: "Accès complet à tous les modules ERP Construction sans restriction",
  },
  {
    name: "erp_admin",
    displayName: "Admin ERP",
    description: "Administration de l'ERP Construction (gestion utilisateurs, rôles, configuration)",
  },
  {
    name: "erp_project_manager",
    displayName: "Project Manager",
    description: "Gestion complète des projets de construction (planification, suivi, validation)",
  },
  {
    name: "erp_contractor",
    displayName: "Contractor",
    description: "Entrepreneur/prestataire : accès aux projets assignés, rapports d'avancement",
  },
  {
    name: "erp_vendor",
    displayName: "Vendor",
    description: "Fournisseur : gestion des commandes, livraisons et factures",
  },
  {
    name: "erp_finance_manager",
    displayName: "Finance Manager",
    description: "Gestion financière : budgets, paiements, factures, rapports financiers",
  },
  {
    name: "erp_safety_officer",
    displayName: "Safety Officer",
    description: "Responsable sécurité : inspections, incidents, conformité HSE",
  },
  {
    name: "erp_inventory_manager",
    displayName: "Inventory Manager",
    description: "Gestion des stocks : matériaux, équipements, commandes",
  },
  {
    name: "erp_viewer",
    displayName: "Viewer",
    description: "Consultation uniquement : accès en lecture seule aux modules autorisés",
  },
] as const;

// ============================================================
// PERMISSIONS PAR DÉFAUT PAR MODULE
// ============================================================

export const ERP_DEFAULT_PERMISSIONS: Array<{
  module: ErpModule;
  action: ErpAction;
  displayName: string;
  description: string;
}> = [
  // Dashboard
  { module: "erp_dashboard", action: "view", displayName: "Voir le dashboard ERP", description: "Accéder au tableau de bord ERP" },

  // Projects
  { module: "erp_projects", action: "view", displayName: "Voir les projets", description: "Consulter la liste des projets" },
  { module: "erp_projects", action: "create", displayName: "Créer un projet", description: "Initier un nouveau projet de construction" },
  { module: "erp_projects", action: "update", displayName: "Modifier un projet", description: "Modifier les informations d'un projet" },
  { module: "erp_projects", action: "delete", displayName: "Supprimer un projet", description: "Supprimer un projet de construction" },
  { module: "erp_projects", action: "approve", displayName: "Approuver un projet", description: "Valider un projet pour lancement" },
  { module: "erp_projects", action: "assign", displayName: "Assigner un projet", description: "Assigner des intervenants à un projet" },
  { module: "erp_projects", action: "export", displayName: "Exporter un projet", description: "Exporter les données du projet" },

  // Gantt
  { module: "erp_gantt", action: "view", displayName: "Voir le Gantt", description: "Consulter le diagramme de Gantt" },
  { module: "erp_gantt", action: "update", displayName: "Modifier le Gantt", description: "Modifier la planification" },

  // Documents
  { module: "erp_documents", action: "view", displayName: "Voir les documents", description: "Consulter les documents projet" },
  { module: "erp_documents", action: "upload", displayName: "Uploader un document", description: "Ajouter un document au projet" },
  { module: "erp_documents", action: "download", displayName: "Télécharger un document", description: "Télécharger un document" },
  { module: "erp_documents", action: "delete", displayName: "Supprimer un document", description: "Supprimer un document" },
  { module: "erp_documents", action: "approve", displayName: "Approuver un document", description: "Valider un document" },

  // Compliance
  { module: "erp_compliance", action: "view", displayName: "Voir la conformité", description: "Consulter les rapports de conformité" },
  { module: "erp_compliance", action: "create", displayName: "Créer un rapport", description: "Créer un rapport de conformité" },
  { module: "erp_compliance", action: "validate", displayName: "Valider la conformité", description: "Valider un rapport de conformité" },

  // Equipment
  { module: "erp_equipment", action: "view", displayName: "Voir les équipements", description: "Consulter la liste des équipements" },
  { module: "erp_equipment", action: "create", displayName: "Ajouter un équipement", description: "Enregistrer un nouvel équipement" },
  { module: "erp_equipment", action: "update", displayName: "Modifier un équipement", description: "Modifier les informations d'un équipement" },
  { module: "erp_equipment", action: "assign", displayName: "Assigner un équipement", description: "Assigner un équipement à un projet" },

  // Safety
  { module: "erp_safety", action: "view", displayName: "Voir la sécurité", description: "Consulter les rapports de sécurité" },
  { module: "erp_safety", action: "create", displayName: "Créer un rapport sécurité", description: "Signaler un incident ou créer une inspection" },
  { module: "erp_safety", action: "validate", displayName: "Valider la sécurité", description: "Valider un rapport de sécurité" },

  // Vendors
  { module: "erp_vendors", action: "view", displayName: "Voir les fournisseurs", description: "Consulter la liste des fournisseurs" },
  { module: "erp_vendors", action: "create", displayName: "Ajouter un fournisseur", description: "Enregistrer un nouveau fournisseur" },
  { module: "erp_vendors", action: "update", displayName: "Modifier un fournisseur", description: "Modifier les informations d'un fournisseur" },
  { module: "erp_vendors", action: "rate", displayName: "Évaluer un fournisseur", description: "Noter un fournisseur" },

  // Contractors
  { module: "erp_contractors", action: "view", displayName: "Voir les entrepreneurs", description: "Consulter la liste des entrepreneurs" },
  { module: "erp_contractors", action: "create", displayName: "Ajouter un entrepreneur", description: "Enregistrer un nouvel entrepreneur" },
  { module: "erp_contractors", action: "update", displayName: "Modifier un entrepreneur", description: "Modifier les informations d'un entrepreneur" },
  { module: "erp_contractors", action: "assign", displayName: "Assigner un entrepreneur", description: "Assigner un entrepreneur à un projet" },
  { module: "erp_contractors", action: "rate", displayName: "Évaluer un entrepreneur", description: "Noter un entrepreneur" },

  // Inventory
  { module: "erp_inventory", action: "view", displayName: "Voir l'inventaire", description: "Consulter les stocks" },
  { module: "erp_inventory", action: "create", displayName: "Ajouter au stock", description: "Ajouter des matériaux au stock" },
  { module: "erp_inventory", action: "update", displayName: "Modifier le stock", description: "Modifier les quantités en stock" },
  { module: "erp_inventory", action: "delete", displayName: "Retirer du stock", description: "Supprimer un article du stock" },
  { module: "erp_inventory", action: "export", displayName: "Exporter l'inventaire", description: "Exporter les données de stock" },

  // Finance
  { module: "erp_finance", action: "view", displayName: "Voir les finances", description: "Consulter les données financières" },
  { module: "erp_finance", action: "create", displayName: "Créer une entrée financière", description: "Ajouter une ligne budgétaire ou facture" },
  { module: "erp_finance", action: "approve", displayName: "Approuver un paiement", description: "Valider un paiement ou une facture" },
  { module: "erp_finance", action: "pay", displayName: "Effectuer un paiement", description: "Exécuter un paiement" },
  { module: "erp_finance", action: "export", displayName: "Exporter les finances", description: "Exporter les rapports financiers" },

  // Alerts
  { module: "erp_alerts", action: "view", displayName: "Voir les alertes", description: "Consulter les alertes et notifications" },
  { module: "erp_alerts", action: "create", displayName: "Créer une alerte", description: "Créer une alerte manuelle" },

  // Profile
  { module: "erp_profile", action: "view", displayName: "Voir le profil", description: "Consulter son profil ERP" },
  { module: "erp_profile", action: "update", displayName: "Modifier le profil", description: "Modifier son profil ERP" },

  // Audit Logs
  { module: "erp_audit_logs", action: "view", displayName: "Voir les logs d'audit", description: "Consulter l'historique des actions" },
  { module: "erp_audit_logs", action: "export", displayName: "Exporter les logs", description: "Exporter les logs d'audit" },
];

// ============================================================
// MAPPING RÔLE → PERMISSIONS PAR DÉFAUT
// ============================================================

export const ERP_ROLE_DEFAULT_PERMISSIONS: Record<string, Array<{ module: ErpModule; action: ErpAction }>> = {
  // Super Admin : toutes les permissions
  erp_super_admin: ERP_DEFAULT_PERMISSIONS.map(p => ({ module: p.module, action: p.action })),

  // Admin ERP : tout sauf pay et certaines suppressions
  erp_admin: ERP_DEFAULT_PERMISSIONS.filter(p => p.action !== "pay").map(p => ({ module: p.module, action: p.action })),

  // Project Manager : projets, gantt, documents, contractors, équipements, alertes
  erp_project_manager: [
    { module: "erp_dashboard", action: "view" },
    { module: "erp_projects", action: "view" }, { module: "erp_projects", action: "create" }, { module: "erp_projects", action: "update" }, { module: "erp_projects", action: "approve" }, { module: "erp_projects", action: "assign" }, { module: "erp_projects", action: "export" },
    { module: "erp_gantt", action: "view" }, { module: "erp_gantt", action: "update" },
    { module: "erp_documents", action: "view" }, { module: "erp_documents", action: "upload" }, { module: "erp_documents", action: "download" }, { module: "erp_documents", action: "approve" },
    { module: "erp_compliance", action: "view" }, { module: "erp_compliance", action: "create" },
    { module: "erp_equipment", action: "view" }, { module: "erp_equipment", action: "assign" },
    { module: "erp_safety", action: "view" },
    { module: "erp_vendors", action: "view" }, { module: "erp_vendors", action: "rate" },
    { module: "erp_contractors", action: "view" }, { module: "erp_contractors", action: "assign" }, { module: "erp_contractors", action: "rate" },
    { module: "erp_inventory", action: "view" },
    { module: "erp_finance", action: "view" }, { module: "erp_finance", action: "export" },
    { module: "erp_alerts", action: "view" }, { module: "erp_alerts", action: "create" },
    { module: "erp_profile", action: "view" }, { module: "erp_profile", action: "update" },
    { module: "erp_audit_logs", action: "view" },
  ],

  // Contractor : projets assignés, documents, sécurité
  erp_contractor: [
    { module: "erp_dashboard", action: "view" },
    { module: "erp_projects", action: "view" }, { module: "erp_projects", action: "update" },
    { module: "erp_gantt", action: "view" },
    { module: "erp_documents", action: "view" }, { module: "erp_documents", action: "upload" }, { module: "erp_documents", action: "download" },
    { module: "erp_safety", action: "view" }, { module: "erp_safety", action: "create" },
    { module: "erp_alerts", action: "view" },
    { module: "erp_profile", action: "view" }, { module: "erp_profile", action: "update" },
  ],

  // Vendor : commandes, livraisons, documents
  erp_vendor: [
    { module: "erp_dashboard", action: "view" },
    { module: "erp_projects", action: "view" },
    { module: "erp_documents", action: "view" }, { module: "erp_documents", action: "upload" }, { module: "erp_documents", action: "download" },
    { module: "erp_inventory", action: "view" },
    { module: "erp_alerts", action: "view" },
    { module: "erp_profile", action: "view" }, { module: "erp_profile", action: "update" },
  ],

  // Finance Manager : finances, budgets, paiements
  erp_finance_manager: [
    { module: "erp_dashboard", action: "view" },
    { module: "erp_projects", action: "view" },
    { module: "erp_documents", action: "view" }, { module: "erp_documents", action: "download" },
    { module: "erp_finance", action: "view" }, { module: "erp_finance", action: "create" }, { module: "erp_finance", action: "approve" }, { module: "erp_finance", action: "pay" }, { module: "erp_finance", action: "export" },
    { module: "erp_vendors", action: "view" },
    { module: "erp_contractors", action: "view" },
    { module: "erp_alerts", action: "view" },
    { module: "erp_profile", action: "view" }, { module: "erp_profile", action: "update" },
    { module: "erp_audit_logs", action: "view" },
  ],

  // Safety Officer : sécurité, conformité, équipements
  erp_safety_officer: [
    { module: "erp_dashboard", action: "view" },
    { module: "erp_projects", action: "view" },
    { module: "erp_documents", action: "view" }, { module: "erp_documents", action: "upload" }, { module: "erp_documents", action: "download" },
    { module: "erp_compliance", action: "view" }, { module: "erp_compliance", action: "create" }, { module: "erp_compliance", action: "validate" },
    { module: "erp_equipment", action: "view" },
    { module: "erp_safety", action: "view" }, { module: "erp_safety", action: "create" }, { module: "erp_safety", action: "validate" },
    { module: "erp_alerts", action: "view" }, { module: "erp_alerts", action: "create" },
    { module: "erp_profile", action: "view" }, { module: "erp_profile", action: "update" },
  ],

  // Inventory Manager : stocks, équipements, commandes
  erp_inventory_manager: [
    { module: "erp_dashboard", action: "view" },
    { module: "erp_projects", action: "view" },
    { module: "erp_documents", action: "view" }, { module: "erp_documents", action: "download" },
    { module: "erp_equipment", action: "view" }, { module: "erp_equipment", action: "create" }, { module: "erp_equipment", action: "update" }, { module: "erp_equipment", action: "assign" },
    { module: "erp_inventory", action: "view" }, { module: "erp_inventory", action: "create" }, { module: "erp_inventory", action: "update" }, { module: "erp_inventory", action: "delete" }, { module: "erp_inventory", action: "export" },
    { module: "erp_vendors", action: "view" },
    { module: "erp_alerts", action: "view" },
    { module: "erp_profile", action: "view" }, { module: "erp_profile", action: "update" },
  ],

  // Viewer : lecture seule sur tout
  erp_viewer: [
    { module: "erp_dashboard", action: "view" },
    { module: "erp_projects", action: "view" },
    { module: "erp_gantt", action: "view" },
    { module: "erp_documents", action: "view" }, { module: "erp_documents", action: "download" },
    { module: "erp_compliance", action: "view" },
    { module: "erp_equipment", action: "view" },
    { module: "erp_safety", action: "view" },
    { module: "erp_vendors", action: "view" },
    { module: "erp_contractors", action: "view" },
    { module: "erp_inventory", action: "view" },
    { module: "erp_finance", action: "view" },
    { module: "erp_alerts", action: "view" },
    { module: "erp_profile", action: "view" },
    { module: "erp_audit_logs", action: "view" },
  ],
};

// ============================================================
// SERVICE ERP RBAC
// ============================================================

/**
 * Récupère toutes les permissions ERP d'un utilisateur (via ses rôles ERP)
 */
export async function getUserErpPermissions(userId: number): Promise<Array<{ module: string; action: string }>> {
  const db = (await getDb())!;

  const results = await db
    .select({
      module: erpPermissions.module,
      action: erpPermissions.action,
    })
    .from(erpUserRoles)
    .innerJoin(erpRolePermissions, eq(erpRolePermissions.roleId, erpUserRoles.roleId))
    .innerJoin(erpPermissions, eq(erpPermissions.id, erpRolePermissions.permissionId))
    .where(eq(erpUserRoles.userId, userId));

  return results;
}

/**
 * Vérifie si un utilisateur a une permission ERP spécifique
 */
export async function hasErpPermission(
  userId: number,
  module: string,
  action: string
): Promise<boolean> {
  const userPerms = await getUserErpPermissions(userId);
  return userPerms.some(p => p.module === module && p.action === action);
}

/**
 * Vérifie si un utilisateur a accès à un module ERP (n'importe quelle action)
 */
export async function hasErpModuleAccess(userId: number, module: string): Promise<boolean> {
  const userPerms = await getUserErpPermissions(userId);
  return userPerms.some(p => p.module === module);
}

/**
 * Vérifie si un utilisateur a un rôle ERP quelconque (= accès à l'ERP)
 */
export async function hasAnyErpRole(userId: number): Promise<boolean> {
  const db = (await getDb())!;
  const result = await db
    .select({ id: erpUserRoles.id })
    .from(erpUserRoles)
    .where(eq(erpUserRoles.userId, userId))
    .limit(1);
  return result.length > 0;
}

/**
 * Récupère les rôles ERP d'un utilisateur
 */
export async function getUserErpRoles(userId: number) {
  const db = (await getDb())!;
  return db
    .select({
      roleId: erpRoles.id,
      roleName: erpRoles.name,
      displayName: erpRoles.displayName,
      isSystem: erpRoles.isSystem,
      assignedAt: erpUserRoles.assignedAt,
    })
    .from(erpUserRoles)
    .innerJoin(erpRoles, eq(erpRoles.id, erpUserRoles.roleId))
    .where(eq(erpUserRoles.userId, userId));
}

/**
 * Seed les rôles et permissions ERP par défaut (idempotent)
 */
export async function seedErpRbac(): Promise<{ rolesCreated: number; permissionsCreated: number }> {
  const db = (await getDb())!;
  let rolesCreated = 0;
  let permissionsCreated = 0;

  // Seed ERP roles
  for (const role of ERP_SYSTEM_ROLES) {
    const existing = await db.select().from(erpRoles).where(eq(erpRoles.name, role.name)).limit(1);
    if (existing.length === 0) {
      await db.insert(erpRoles).values({
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

  // Seed ERP permissions
  for (const perm of ERP_DEFAULT_PERMISSIONS) {
    const existing = await db
      .select()
      .from(erpPermissions)
      .where(and(eq(erpPermissions.module, perm.module), eq(erpPermissions.action, perm.action)))
      .limit(1);
    if (existing.length === 0) {
      await db.insert(erpPermissions).values({
        module: perm.module,
        action: perm.action,
        displayName: perm.displayName,
        description: perm.description,
      });
      permissionsCreated++;
    }
  }

  // Assign default permissions to system roles
  const allRoles = await db.select().from(erpRoles).where(eq(erpRoles.isSystem, true));
  const allPerms = await db.select().from(erpPermissions);

  for (const role of allRoles) {
    const defaultPerms = ERP_ROLE_DEFAULT_PERMISSIONS[role.name];
    if (!defaultPerms) continue;

    for (const dp of defaultPerms) {
      const perm = allPerms.find(p => p.module === dp.module && p.action === dp.action);
      if (!perm) continue;

      const existing = await db
        .select()
        .from(erpRolePermissions)
        .where(and(eq(erpRolePermissions.roleId, role.id), eq(erpRolePermissions.permissionId, perm.id)))
        .limit(1);

      if (existing.length === 0) {
        await db.insert(erpRolePermissions).values({
          roleId: role.id,
          permissionId: perm.id,
        });
      }
    }
  }

  return { rolesCreated, permissionsCreated };
}
