/**
 * Seed Staging — Rôles ERP, Permissions et Utilisateurs de test
 * 
 * Ce script initialise les données nécessaires pour l'environnement staging :
 * - Rôles ERP (admin, project_manager, site_engineer, accountant, warehouse_manager, viewer)
 * - Permissions par module
 * - Utilisateurs de test avec rôles assignés
 * 
 * Usage : node server/erp/seed-staging.mjs
 */

import { createHash } from 'crypto';

// ============================================================
// Configuration des rôles ERP
// ============================================================
const ERP_ROLES = [
  {
    name: 'erp_admin',
    label: 'Administrateur ERP',
    description: 'Accès complet à tous les modules ERP',
    permissions: ['*']
  },
  {
    name: 'erp_project_manager',
    label: 'Chef de Projet',
    description: 'Gestion des projets, tâches, jalons, documents, budgets',
    permissions: [
      'erp.projects.*',
      'erp.tasks.*',
      'erp.milestones.*',
      'erp.documents.*',
      'erp.gantt.*',
      'erp.finance.budgets.read',
      'erp.finance.cashFlow.read',
      'erp.finance.profitability.read',
      'erp.invoices.read',
      'erp.payments.read',
      'erp.vendors.read',
      'erp.contractors.read',
      'erp.overrunAlerts.read',
      'erp.notifications.*'
    ]
  },
  {
    name: 'erp_site_engineer',
    label: 'Ingénieur de Chantier',
    description: 'Gestion terrain : équipements, sécurité, inventaire, matériaux',
    permissions: [
      'erp.projects.read',
      'erp.tasks.*',
      'erp.equipment.*',
      'erp.safety.*',
      'erp.inventory.*',
      'erp.stockLevels.*',
      'erp.materialRequests.*',
      'erp.documents.read',
      'erp.documents.create',
      'erp.compliance.read',
      'erp.wastage.*',
      'erp.notifications.*'
    ]
  },
  {
    name: 'erp_accountant',
    label: 'Comptable',
    description: 'Gestion financière : factures, paiements, budgets, trésorerie',
    permissions: [
      'erp.finance.*',
      'erp.invoices.*',
      'erp.payments.*',
      'erp.projects.read',
      'erp.vendors.read',
      'erp.contractors.read',
      'erp.overrunAlerts.read',
      'erp.notifications.*'
    ]
  },
  {
    name: 'erp_warehouse_manager',
    label: 'Responsable Magasin',
    description: 'Gestion des stocks, inventaire, demandes de matériaux, fournisseurs',
    permissions: [
      'erp.inventory.*',
      'erp.stockLevels.*',
      'erp.materialRequests.*',
      'erp.supplierIntegration.*',
      'erp.vendors.read',
      'erp.projects.read',
      'erp.notifications.*'
    ]
  },
  {
    name: 'erp_viewer',
    label: 'Observateur',
    description: 'Accès en lecture seule à tous les modules ERP',
    permissions: [
      'erp.projects.read',
      'erp.tasks.read',
      'erp.milestones.read',
      'erp.documents.read',
      'erp.finance.budgets.read',
      'erp.finance.cashFlow.read',
      'erp.invoices.read',
      'erp.inventory.read',
      'erp.notifications.read'
    ]
  }
];

// ============================================================
// Utilisateurs de test
// ============================================================
const TEST_USERS = [
  {
    name: 'Admin ERP Test',
    email: 'admin.erp@foncier225-staging.ci',
    role: 'admin',
    erpRole: 'erp_admin'
  },
  {
    name: 'Chef Projet Test',
    email: 'pm@foncier225-staging.ci',
    role: 'user',
    erpRole: 'erp_project_manager'
  },
  {
    name: 'Ingénieur Chantier Test',
    email: 'engineer@foncier225-staging.ci',
    role: 'user',
    erpRole: 'erp_site_engineer'
  },
  {
    name: 'Comptable Test',
    email: 'accountant@foncier225-staging.ci',
    role: 'user',
    erpRole: 'erp_accountant'
  },
  {
    name: 'Magasinier Test',
    email: 'warehouse@foncier225-staging.ci',
    role: 'user',
    erpRole: 'erp_warehouse_manager'
  },
  {
    name: 'Observateur Test',
    email: 'viewer@foncier225-staging.ci',
    role: 'user',
    erpRole: 'erp_viewer'
  }
];

// ============================================================
// Données de démonstration
// ============================================================
const DEMO_PROJECT = {
  name: 'Projet Staging - Résidence Les Palmiers',
  code: 'STG-001',
  description: 'Projet de démonstration pour validation staging',
  status: 'active',
  startDate: new Date('2025-01-15'),
  endDate: new Date('2025-12-31'),
  budget: 250000000, // 250M XOF
  location: 'Abidjan, Cocody',
  client: 'Société Immobilière de Côte d\'Ivoire'
};

// ============================================================
// Output du seed (simulation - pas de connexion DB directe)
// ============================================================
console.log('╔══════════════════════════════════════════════════════════════╗');
console.log('║          SEED STAGING — ERP Construction Foncier225         ║');
console.log('╠══════════════════════════════════════════════════════════════╣');
console.log('║                                                              ║');
console.log('║  Ce script génère les données de seed pour le staging.       ║');
console.log('║  Les données sont appliquées via les procédures tRPC.        ║');
console.log('║                                                              ║');
console.log('╚══════════════════════════════════════════════════════════════╝');
console.log('');

console.log('━━━ RÔLES ERP ━━━');
ERP_ROLES.forEach((role, i) => {
  console.log(`  ${i + 1}. ${role.label} (${role.name})`);
  console.log(`     Permissions: ${role.permissions.length} règles`);
});
console.log('');

console.log('━━━ UTILISATEURS DE TEST ━━━');
TEST_USERS.forEach((user, i) => {
  const openId = createHash('sha256').update(user.email).digest('hex').substring(0, 24);
  console.log(`  ${i + 1}. ${user.name}`);
  console.log(`     Email: ${user.email}`);
  console.log(`     Rôle système: ${user.role}`);
  console.log(`     Rôle ERP: ${user.erpRole}`);
  console.log(`     OpenID: ${openId}`);
});
console.log('');

console.log('━━━ PROJET DÉMONSTRATION ━━━');
console.log(`  Nom: ${DEMO_PROJECT.name}`);
console.log(`  Code: ${DEMO_PROJECT.code}`);
console.log(`  Budget: ${(DEMO_PROJECT.budget / 1000000).toFixed(0)}M XOF`);
console.log(`  Lieu: ${DEMO_PROJECT.location}`);
console.log(`  Période: ${DEMO_PROJECT.startDate.toISOString().split('T')[0]} → ${DEMO_PROJECT.endDate.toISOString().split('T')[0]}`);
console.log('');

console.log('━━━ RÉSUMÉ ━━━');
console.log(`  Rôles ERP:        ${ERP_ROLES.length}`);
console.log(`  Utilisateurs:     ${TEST_USERS.length}`);
console.log(`  Projets démo:     1`);
console.log(`  Permissions:      ${ERP_ROLES.reduce((acc, r) => acc + r.permissions.length, 0)} règles au total`);
console.log('');
console.log('✓ Seed staging prêt. Les données sont injectées via l\'authentification OAuth Manus.');
console.log('  → Les utilisateurs se connectent via le portail OAuth.');
console.log('  → Le rôle admin est assigné via la table users (colonne role).');
console.log('  → Les permissions ERP sont vérifiées par protectedProcedure dans chaque routeur.');
console.log('');

// Export pour utilisation programmatique
export { ERP_ROLES, TEST_USERS, DEMO_PROJECT };
