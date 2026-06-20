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
// ERP MODULES (26 modules)
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
  "erp_purchases",
  "erp_expenses",
  "erp_accounting",
  "erp_real_estate",
  "erp_full_accounting",
  "erp_rfqs",
  "erp_invoice_matching",
  "erp_accounting_exports",
  "erp_budget_v2",
  "erp_sales_targets",
  "erp_analytics",
  "erp_budget_integrations",
  "erp_direction_dashboard",
  "erp_direction_reports",
  "erp_direction_reviews",
  "erp_direction_actions",
  "erp_direction_data_quality",
  "erp_direction_schedules",
  "erp_system_health",
  "erp_scheduled_jobs",
  "erp_data_quality_global",
] as const;

export type ErpModule = (typeof ERP_MODULES)[number];

// ============================================================
// ERP ACTIONS (16 actions)
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
  "import",
  "seed",
  "sync",
  "recalculate",
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

  // Purchases
  { module: "erp_purchases", action: "view", displayName: "Voir les achats", description: "Consulter les demandes d'achat et bons de commande" },
  { module: "erp_purchases", action: "create", displayName: "Créer une demande d'achat", description: "Initier une demande d'achat ou un bon de commande" },
  { module: "erp_purchases", action: "update", displayName: "Modifier un achat", description: "Modifier une demande d'achat ou un bon de commande" },
  { module: "erp_purchases", action: "approve", displayName: "Approuver un achat", description: "Valider une demande d'achat ou un bon de commande" },
  { module: "erp_purchases", action: "delete", displayName: "Supprimer un achat", description: "Supprimer une demande d'achat" },
  { module: "erp_purchases", action: "export", displayName: "Exporter les achats", description: "Exporter les données d'achats" },

  // Expenses
  { module: "erp_expenses", action: "view", displayName: "Voir les dépenses", description: "Consulter les notes de frais et dépenses" },
  { module: "erp_expenses", action: "create", displayName: "Créer une dépense", description: "Saisir une note de frais ou dépense" },
  { module: "erp_expenses", action: "update", displayName: "Modifier une dépense", description: "Modifier une note de frais" },
  { module: "erp_expenses", action: "approve", displayName: "Approuver une dépense", description: "Valider une note de frais" },
  { module: "erp_expenses", action: "delete", displayName: "Supprimer une dépense", description: "Supprimer une note de frais" },
  { module: "erp_expenses", action: "export", displayName: "Exporter les dépenses", description: "Exporter les données de dépenses" },

  // Accounting (Pré-comptabilité)
  { module: "erp_accounting", action: "view", displayName: "Voir la pré-comptabilité", description: "Consulter le plan comptable et les écritures" },
  { module: "erp_accounting", action: "create", displayName: "Créer une écriture", description: "Saisir une écriture comptable" },
  { module: "erp_accounting", action: "update", displayName: "Modifier une écriture", description: "Modifier une écriture non validée" },
  { module: "erp_accounting", action: "validate", displayName: "Valider une écriture", description: "Valider une écriture comptable" },
  { module: "erp_accounting", action: "export", displayName: "Exporter la comptabilité", description: "Exporter le journal comptable" },

  // Real Estate (Vente Immobilière)
  { module: "erp_real_estate", action: "view", displayName: "Voir la vente immobilière", description: "Consulter les programmes, unités et ventes" },
  { module: "erp_real_estate", action: "create", displayName: "Créer un programme/vente", description: "Créer un programme immobilier ou une vente" },
  { module: "erp_real_estate", action: "update", displayName: "Modifier une vente", description: "Modifier un programme, une unité ou une vente" },
  { module: "erp_real_estate", action: "delete", displayName: "Supprimer une vente", description: "Supprimer un élément immobilier" },
  { module: "erp_real_estate", action: "approve", displayName: "Approuver une vente", description: "Valider une réservation ou une vente" },
  { module: "erp_real_estate", action: "export", displayName: "Exporter l'immobilier", description: "Exporter les données immobilières" },

  // Full Accounting (Comptabilité Générale)
  { module: "erp_full_accounting", action: "view", displayName: "Voir la comptabilité générale", description: "Consulter les journaux, écritures et rapports" },
  { module: "erp_full_accounting", action: "create", displayName: "Créer une écriture comptable", description: "Saisir une écriture dans un journal" },
  { module: "erp_full_accounting", action: "update", displayName: "Modifier une écriture comptable", description: "Modifier une écriture non validée" },
  { module: "erp_full_accounting", action: "delete", displayName: "Supprimer une écriture", description: "Supprimer une écriture brouillon" },
  { module: "erp_full_accounting", action: "approve", displayName: "Valider une écriture", description: "Valider et verrouiller une écriture comptable" },
  { module: "erp_full_accounting", action: "export", displayName: "Exporter la comptabilité", description: "Exporter les rapports comptables" },

  // RFQ (Demandes de Prix)
  { module: "erp_rfqs", action: "view", displayName: "Voir les RFQ", description: "Consulter les demandes de prix" },
  { module: "erp_rfqs", action: "create", displayName: "Créer une RFQ", description: "Créer une demande de prix" },
  { module: "erp_rfqs", action: "update", displayName: "Modifier une RFQ", description: "Modifier une demande de prix" },
  { module: "erp_rfqs", action: "delete", displayName: "Supprimer une RFQ", description: "Supprimer ou annuler une demande de prix" },
  { module: "erp_rfqs", action: "approve", displayName: "Attribuer une RFQ", description: "Sélectionner un fournisseur et attribuer la RFQ" },
  { module: "erp_rfqs", action: "export", displayName: "Exporter les RFQ", description: "Exporter les données RFQ" },

  // Invoice Matching (Rapprochement Factures/PO)
  { module: "erp_invoice_matching", action: "view", displayName: "Voir les rapprochements", description: "Consulter les rapprochements factures/BC" },
  { module: "erp_invoice_matching", action: "create", displayName: "Créer un rapprochement", description: "Lancer un rapprochement automatique" },
  { module: "erp_invoice_matching", action: "approve", displayName: "Approuver un rapprochement", description: "Valider ou rejeter un rapprochement" },
  { module: "erp_invoice_matching", action: "export", displayName: "Exporter les rapprochements", description: "Exporter les données de rapprochement" },

  // Accounting Exports (Export Comptable)
  { module: "erp_accounting_exports", action: "view", displayName: "Voir les exports comptables", description: "Consulter les exports générés" },
  { module: "erp_accounting_exports", action: "create", displayName: "Générer un export", description: "Générer un fichier d'export comptable" },
  { module: "erp_accounting_exports", action: "delete", displayName: "Annuler un export", description: "Annuler un export comptable" },
  { module: "erp_accounting_exports", action: "export", displayName: "Télécharger un export", description: "Télécharger le fichier CSV généré" },

  // Budget V2 (Budget Prévisionnel)
  { module: "erp_budget_v2", action: "view", displayName: "Voir les budgets prévisionnels", description: "Consulter les budgets, P&L et Cash Flow" },
  { module: "erp_budget_v2", action: "create", displayName: "Créer un budget", description: "Créer un budget prévisionnel ou importer un fichier Excel" },
  { module: "erp_budget_v2", action: "update", displayName: "Modifier un budget", description: "Modifier les lignes et montants budgétaires" },
  { module: "erp_budget_v2", action: "approve", displayName: "Approuver un budget", description: "Approuver ou verrouiller un budget" },
  { module: "erp_budget_v2", action: "delete", displayName: "Supprimer un budget", description: "Supprimer ou archiver un budget" },
  { module: "erp_budget_v2", action: "export", displayName: "Exporter un budget", description: "Exporter un budget en Excel, CSV ou PDF" },
  { module: "erp_budget_v2", action: "import", displayName: "Importer un budget Excel", description: "Importer un fichier Excel de budget" },
  { module: "erp_budget_v2", action: "seed", displayName: "Seed données démo", description: "Créer ou supprimer les données de démonstration" },
  { module: "erp_budget_v2", action: "sync", displayName: "Synchroniser les réalisés", description: "Lancer la synchronisation des données réelles" },
  { module: "erp_budget_v2", action: "recalculate", displayName: "Recalculer snapshots", description: "Générer ou recalculer les snapshots P&L et Cash Flow" },

  // Sales Targets (Objectifs Commerciaux)
  { module: "erp_sales_targets", action: "view", displayName: "Voir les objectifs", description: "Consulter les objectifs commerciaux" },
  { module: "erp_sales_targets", action: "create", displayName: "Créer un objectif", description: "Définir un nouvel objectif commercial" },
  { module: "erp_sales_targets", action: "update", displayName: "Modifier un objectif", description: "Modifier un objectif commercial" },
  { module: "erp_sales_targets", action: "delete", displayName: "Supprimer un objectif", description: "Supprimer un objectif commercial" },
  { module: "erp_sales_targets", action: "approve", displayName: "Approuver un objectif", description: "Valider et verrouiller un objectif" },
  { module: "erp_sales_targets", action: "sync", displayName: "Synchroniser les résultats", description: "Synchroniser les résultats depuis les ventes" },
  { module: "erp_sales_targets", action: "export", displayName: "Exporter les objectifs", description: "Exporter les objectifs et résultats" },

  // Analytics (Comptabilité Analytique)
  { module: "erp_analytics", action: "view", displayName: "Voir l'analytique", description: "Consulter les axes, centres de coûts et allocations" },
  { module: "erp_analytics", action: "create", displayName: "Créer un centre de coûts", description: "Créer un centre de coûts ou une allocation" },
  { module: "erp_analytics", action: "update", displayName: "Modifier l'analytique", description: "Modifier les centres de coûts ou allocations" },
  { module: "erp_analytics", action: "delete", displayName: "Supprimer un élément analytique", description: "Supprimer un centre de coûts ou allocation" },
  { module: "erp_analytics", action: "export", displayName: "Exporter l'analytique", description: "Exporter les rapports analytiques" },
  { module: "erp_analytics", action: "recalculate", displayName: "Générer un snapshot", description: "Générer un snapshot analytique" },

  // Budget Integrations (Intégrations Budget)
  { module: "erp_budget_integrations", action: "view", displayName: "Voir les intégrations", description: "Consulter les jobs d'intégration budget" },
  { module: "erp_budget_integrations", action: "sync", displayName: "Lancer une synchronisation", description: "Déclencher un job d'intégration" },
  { module: "erp_budget_integrations", action: "export", displayName: "Exporter les jobs", description: "Exporter l'historique des jobs" },
  // Direction Dashboard
  { module: "erp_direction_dashboard", action: "view", displayName: "Voir le dashboard direction", description: "Consulter le tableau de bord direction 360" },
  { module: "erp_direction_dashboard", action: "export", displayName: "Exporter le dashboard", description: "Exporter les données du dashboard direction" },
  { module: "erp_direction_dashboard", action: "create", displayName: "Configurer le dashboard", description: "Configurer les widgets et KPIs du dashboard" },
  { module: "erp_direction_dashboard", action: "update", displayName: "Modifier la configuration", description: "Modifier la configuration du dashboard" },
  { module: "erp_direction_dashboard", action: "recalculate", displayName: "Recalculer les KPIs", description: "Forcer le recalcul des indicateurs" },
  // Direction Reports
  { module: "erp_direction_reports", action: "view", displayName: "Voir les rapports direction", description: "Consulter les rapports PDF direction" },
  { module: "erp_direction_reports", action: "create", displayName: "Générer un rapport", description: "Générer un nouveau rapport PDF direction" },
  { module: "erp_direction_reports", action: "export", displayName: "Télécharger un rapport", description: "Télécharger un rapport PDF généré" },
  // Direction Reviews
  { module: "erp_direction_reviews", action: "view", displayName: "Voir les revues", description: "Consulter les revues mensuelles de direction" },
  { module: "erp_direction_reviews", action: "create", displayName: "Créer une revue", description: "Créer une nouvelle revue de direction" },
  { module: "erp_direction_reviews", action: "update", displayName: "Modifier une revue", description: "Modifier le contenu d'une revue" },
  { module: "erp_direction_reviews", action: "approve", displayName: "Approuver une revue", description: "Approuver ou clôturer une revue" },
  // Direction Actions
  { module: "erp_direction_actions", action: "view", displayName: "Voir les actions", description: "Consulter les plans d'actions direction" },
  { module: "erp_direction_actions", action: "create", displayName: "Créer une action", description: "Créer un nouveau plan d'action" },
  { module: "erp_direction_actions", action: "update", displayName: "Modifier une action", description: "Modifier un plan d'action existant" },
  { module: "erp_direction_actions", action: "delete", displayName: "Annuler une action", description: "Annuler un plan d'action" },
  // Direction Data Quality
  { module: "erp_direction_data_quality", action: "view", displayName: "Voir les contrôles qualité", description: "Consulter les résultats des contrôles qualité" },
  { module: "erp_direction_data_quality", action: "create", displayName: "Lancer un contrôle", description: "Exécuter les vérifications qualité données" },
  // Direction Schedules
  { module: "erp_direction_schedules", action: "view", displayName: "Voir les plannings", description: "Consulter les plannings de diffusion" },
  { module: "erp_direction_schedules", action: "create", displayName: "Créer un planning", description: "Créer un planning de diffusion automatique" },
  { module: "erp_direction_schedules", action: "update", displayName: "Modifier un planning", description: "Modifier un planning de diffusion" },
  // System Health
  { module: "erp_system_health", action: "view", displayName: "Voir la santé système", description: "Consulter le monitoring système ERP" },
  // Scheduled Jobs
  { module: "erp_scheduled_jobs", action: "view", displayName: "Voir les jobs planifiés", description: "Consulter l'historique des jobs" },
  { module: "erp_scheduled_jobs", action: "create", displayName: "Lancer un job", description: "Déclencher manuellement un job planifié" },
  // Data Quality Global
  { module: "erp_data_quality_global", action: "view", displayName: "Voir la qualité globale", description: "Consulter les résultats qualité tous modules" },
  { module: "erp_data_quality_global", action: "create", displayName: "Lancer contrôle global", description: "Exécuter les contrôles qualité globaux" },
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

  // Finance Manager : finances, budgets, paiements, achats, dépenses, comptabilité
  erp_finance_manager: [
    { module: "erp_dashboard", action: "view" },
    { module: "erp_projects", action: "view" },
    { module: "erp_documents", action: "view" }, { module: "erp_documents", action: "download" },
    { module: "erp_finance", action: "view" }, { module: "erp_finance", action: "create" }, { module: "erp_finance", action: "approve" }, { module: "erp_finance", action: "pay" }, { module: "erp_finance", action: "export" },
    { module: "erp_purchases", action: "view" }, { module: "erp_purchases", action: "create" }, { module: "erp_purchases", action: "approve" }, { module: "erp_purchases", action: "export" },
    { module: "erp_expenses", action: "view" }, { module: "erp_expenses", action: "create" }, { module: "erp_expenses", action: "approve" }, { module: "erp_expenses", action: "export" },
    { module: "erp_accounting", action: "view" }, { module: "erp_accounting", action: "create" }, { module: "erp_accounting", action: "validate" }, { module: "erp_accounting", action: "export" },
    { module: "erp_real_estate", action: "view" }, { module: "erp_real_estate", action: "create" }, { module: "erp_real_estate", action: "update" }, { module: "erp_real_estate", action: "approve" }, { module: "erp_real_estate", action: "export" },
    { module: "erp_full_accounting", action: "view" }, { module: "erp_full_accounting", action: "create" }, { module: "erp_full_accounting", action: "update" }, { module: "erp_full_accounting", action: "approve" }, { module: "erp_full_accounting", action: "export" },
    { module: "erp_vendors", action: "view" },
    { module: "erp_contractors", action: "view" },
    { module: "erp_alerts", action: "view" },
    { module: "erp_profile", action: "view" }, { module: "erp_profile", action: "update" },
    { module: "erp_audit_logs", action: "view" },
    { module: "erp_direction_dashboard", action: "view" }, { module: "erp_direction_dashboard", action: "export" },
    { module: "erp_direction_reports", action: "view" }, { module: "erp_direction_reports", action: "create" }, { module: "erp_direction_reports", action: "export" },
    { module: "erp_direction_reviews", action: "view" }, { module: "erp_direction_reviews", action: "create" }, { module: "erp_direction_reviews", action: "update" },
    { module: "erp_direction_actions", action: "view" }, { module: "erp_direction_actions", action: "create" }, { module: "erp_direction_actions", action: "update" },
    { module: "erp_direction_data_quality", action: "view" }, { module: "erp_direction_data_quality", action: "create" },
    { module: "erp_direction_schedules", action: "view" }, { module: "erp_direction_schedules", action: "create" }, { module: "erp_direction_schedules", action: "update" },
    { module: "erp_system_health", action: "view" },
    { module: "erp_scheduled_jobs", action: "view" }, { module: "erp_scheduled_jobs", action: "create" },
    { module: "erp_data_quality_global", action: "view" }, { module: "erp_data_quality_global", action: "create" },
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

  // Inventory Manager : stocks, équipements, commandes, achats
  erp_inventory_manager: [
    { module: "erp_dashboard", action: "view" },
    { module: "erp_projects", action: "view" },
    { module: "erp_documents", action: "view" }, { module: "erp_documents", action: "download" },
    { module: "erp_equipment", action: "view" }, { module: "erp_equipment", action: "create" }, { module: "erp_equipment", action: "update" }, { module: "erp_equipment", action: "assign" },
    { module: "erp_inventory", action: "view" }, { module: "erp_inventory", action: "create" }, { module: "erp_inventory", action: "update" }, { module: "erp_inventory", action: "delete" }, { module: "erp_inventory", action: "export" },
    { module: "erp_vendors", action: "view" },
    { module: "erp_purchases", action: "view" }, { module: "erp_purchases", action: "create" },
    { module: "erp_expenses", action: "view" },
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
    { module: "erp_real_estate", action: "view" },
    { module: "erp_full_accounting", action: "view" },
    { module: "erp_alerts", action: "view" },
    { module: "erp_profile", action: "view" },
    { module: "erp_audit_logs", action: "view" },
    { module: "erp_direction_dashboard", action: "view" },
    { module: "erp_direction_reports", action: "view" },
    { module: "erp_direction_reviews", action: "view" },
    { module: "erp_direction_actions", action: "view" },
    { module: "erp_direction_data_quality", action: "view" },
    { module: "erp_direction_schedules", action: "view" },
    { module: "erp_system_health", action: "view" },
    { module: "erp_scheduled_jobs", action: "view" },
    { module: "erp_data_quality_global", action: "view" },
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
