import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";

/**
 * Hook pour vérifier les permissions RBAC de l'utilisateur courant.
 * Retourne les permissions, les rôles, et des helpers de vérification.
 */
export function usePermissions() {
  const { user } = useAuth();
  const { data, isLoading } = trpc.rbac.myPermissions.useQuery(undefined, {
    enabled: !!user,
    staleTime: 60_000, // Cache 1 minute
  });

  /**
   * Vérifie si l'utilisateur a une permission spécifique.
   * Les admins legacy ont toujours accès.
   */
  function can(module: string, action: string): boolean {
    // Admin legacy : accès total
    if (user?.role === "admin") return true;

    if (!data?.permissions) return false;
    return data.permissions.some(
      (p) => p.module === module && p.action === action
    );
  }

  /**
   * Vérifie si l'utilisateur a accès à au moins une action d'un module.
   */
  function canAccessModule(module: string): boolean {
    if (user?.role === "admin") return true;
    if (!data?.permissions) return false;
    return data.permissions.some((p) => p.module === module);
  }

  /**
   * Vérifie si l'utilisateur a l'un des rôles spécifiés.
   */
  function hasRole(roleName: string): boolean {
    if (!data?.roles) return false;
    return data.roles.some((r) => r.roleName === roleName);
  }

  /**
   * Vérifie si l'utilisateur est super admin.
   */
  function isSuperAdmin(): boolean {
    return hasRole("super_admin") || user?.role === "admin";
  }

  return {
    permissions: data?.permissions ?? [],
    roles: data?.roles ?? [],
    can,
    canAccessModule,
    hasRole,
    isSuperAdmin,
    isLoading,
  };
}
