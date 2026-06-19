import { trpc } from "@/lib/trpc";

/**
 * Hook pour vérifier les permissions ERP de l'utilisateur courant.
 * Utilise trpc.erp.auth.me pour récupérer les rôles et permissions ERP.
 */
export function useErpPermissions() {
  const { data, isLoading, error } = trpc.erp.auth.me.useQuery();

  const hasAccess = data?.hasAccess ?? false;
  const permissions = data?.permissions ?? [];
  const roles = data?.roles ?? [];

  /**
   * Vérifie si l'utilisateur a une permission ERP spécifique
   */
  function hasPermission(module: string, action: string): boolean {
    if (!hasAccess) return false;
    return permissions.some(p => p.module === module && p.action === action);
  }

  /**
   * Vérifie si l'utilisateur a accès à un module ERP (n'importe quelle action)
   */
  function canAccessModule(module: string): boolean {
    if (!hasAccess) return false;
    return permissions.some(p => p.module === module);
  }

  /**
   * Vérifie si l'utilisateur a un rôle ERP spécifique
   */
  function hasRole(roleName: string): boolean {
    return roles.some(r => r.roleName === roleName);
  }

  /**
   * Vérifie si l'utilisateur est Super Admin ERP ou Admin ERP
   */
  function isErpAdmin(): boolean {
    return hasRole("erp_super_admin") || hasRole("erp_admin");
  }

  return {
    hasAccess,
    isLoading,
    error,
    permissions,
    roles,
    user: data?.user ?? null,
    hasPermission,
    canAccessModule,
    hasRole,
    isErpAdmin,
  };
}
