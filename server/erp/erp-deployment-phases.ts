/**
 * ERP Construction — Déploiement Progressif (Feature Flags)
 * 
 * Ce module gère le déploiement progressif de l'ERP par phases.
 * Chaque phase active l'accès ERP pour un groupe d'utilisateurs spécifique.
 * 
 * Phase 1: Super Admin + Admin ERP uniquement
 * Phase 2: + Project Managers
 * Phase 3: + Finance, Safety, Inventory
 * Phase 4: + Vendors et Contractors (accès externe)
 * Phase 5: Généralisation (tous les utilisateurs authentifiés)
 */

export type DeploymentPhase = 1 | 2 | 3 | 4 | 5;

/**
 * Phase actuelle du déploiement.
 * Modifier cette valeur pour avancer dans le déploiement progressif.
 * 
 * Phase 1: Super Admin + Admin ERP
 * Phase 2: + Project Managers  
 * Phase 3: + Finance, Safety, Inventory
 * Phase 4: + Vendors, Contractors
 * Phase 5: Généralisation complète
 */
export const CURRENT_DEPLOYMENT_PHASE: DeploymentPhase = 5;

/**
 * Rôles autorisés par phase de déploiement
 */
const PHASE_ROLES: Record<DeploymentPhase, string[]> = {
  1: ['admin', 'erp_admin'],
  2: ['admin', 'erp_admin', 'erp_project_manager'],
  3: ['admin', 'erp_admin', 'erp_project_manager', 'erp_accountant', 'erp_safety_officer', 'erp_warehouse_manager'],
  4: ['admin', 'erp_admin', 'erp_project_manager', 'erp_accountant', 'erp_safety_officer', 'erp_warehouse_manager', 'erp_vendor', 'erp_contractor'],
  5: ['*'], // Tous les utilisateurs authentifiés
};

/**
 * Modules ERP activés par phase
 */
const PHASE_MODULES: Record<DeploymentPhase, string[]> = {
  1: ['dashboard', 'projects', 'tasks', 'audit-logs', 'profile'],
  2: ['dashboard', 'projects', 'tasks', 'gantt', 'milestones', 'documents', 'permits', 'compliance', 'audit-logs', 'profile'],
  3: ['dashboard', 'projects', 'tasks', 'gantt', 'milestones', 'documents', 'permits', 'compliance', 'equipment', 'safety', 'invoices', 'payments', 'inventory', 'stock-levels', 'material-requests', 'finance', 'budgets', 'cash-flow', 'profitability', 'overrun-alerts', 'notifications', 'audit-logs', 'profile'],
  4: ['dashboard', 'projects', 'tasks', 'gantt', 'milestones', 'documents', 'permits', 'compliance', 'equipment', 'safety', 'vendors', 'contractors', 'certifications', 'performance-rating', 'invoices', 'payments', 'inventory', 'stock-levels', 'material-requests', 'supplier-integration', 'wastage', 'finance', 'budgets', 'cash-flow', 'profitability', 'overrun-alerts', 'notifications', 'audit-logs', 'profile'],
  5: ['*'], // Tous les modules
};

/**
 * Vérifie si un utilisateur a accès à l'ERP selon la phase actuelle
 */
export function isUserAllowedInCurrentPhase(userRole: string): boolean {
  const allowedRoles = PHASE_ROLES[CURRENT_DEPLOYMENT_PHASE];
  if (allowedRoles.includes('*')) return true;
  return allowedRoles.includes(userRole);
}

/**
 * Vérifie si un module est activé dans la phase actuelle
 */
export function isModuleActiveInCurrentPhase(moduleName: string): boolean {
  const activeModules = PHASE_MODULES[CURRENT_DEPLOYMENT_PHASE];
  if (activeModules.includes('*')) return true;
  return activeModules.includes(moduleName);
}

/**
 * Retourne les informations de la phase actuelle
 */
export function getCurrentPhaseInfo() {
  return {
    phase: CURRENT_DEPLOYMENT_PHASE,
    allowedRoles: PHASE_ROLES[CURRENT_DEPLOYMENT_PHASE],
    activeModules: PHASE_MODULES[CURRENT_DEPLOYMENT_PHASE],
    isFullyDeployed: CURRENT_DEPLOYMENT_PHASE === 5,
    description: getPhaseDescription(CURRENT_DEPLOYMENT_PHASE),
  };
}

function getPhaseDescription(phase: DeploymentPhase): string {
  switch (phase) {
    case 1: return 'Phase 1 — Super Admin + Admin ERP uniquement';
    case 2: return 'Phase 2 — + Project Managers';
    case 3: return 'Phase 3 — + Finance, Safety, Inventory';
    case 4: return 'Phase 4 — + Vendors et Contractors';
    case 5: return 'Phase 5 — Généralisation complète';
  }
}

/**
 * Retourne le plan de déploiement complet avec statut
 */
export function getDeploymentPlan() {
  return [1, 2, 3, 4, 5].map((phase) => ({
    phase: phase as DeploymentPhase,
    description: getPhaseDescription(phase as DeploymentPhase),
    roles: PHASE_ROLES[phase as DeploymentPhase],
    modules: PHASE_MODULES[phase as DeploymentPhase],
    isActive: phase <= CURRENT_DEPLOYMENT_PHASE,
    isCurrent: phase === CURRENT_DEPLOYMENT_PHASE,
  }));
}
