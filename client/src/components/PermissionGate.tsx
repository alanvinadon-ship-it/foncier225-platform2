import { usePermissions } from "@/hooks/usePermissions";
import { Shield } from "lucide-react";

interface PermissionGateProps {
  /** Module requis */
  module: string;
  /** Action requise (optionnel — si omis, vérifie l'accès au module) */
  action?: string;
  /** Contenu à afficher si autorisé */
  children: React.ReactNode;
  /** Contenu alternatif si refusé (optionnel) */
  fallback?: React.ReactNode;
  /** Si true, affiche un message d'accès refusé au lieu de masquer */
  showDenied?: boolean;
}

/**
 * Composant de contrôle d'accès conditionnel.
 * Affiche le contenu enfant uniquement si l'utilisateur a la permission requise.
 * 
 * Usage :
 * <PermissionGate module="titre_foncier" action="approve">
 *   <Button>Valider le dossier</Button>
 * </PermissionGate>
 */
export function PermissionGate({
  module,
  action,
  children,
  fallback,
  showDenied = false,
}: PermissionGateProps) {
  const { can, canAccessModule, isLoading } = usePermissions();

  if (isLoading) return null;

  const hasAccess = action ? can(module, action) : canAccessModule(module);

  if (hasAccess) {
    return <>{children}</>;
  }

  if (fallback) {
    return <>{fallback}</>;
  }

  if (showDenied) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
        <Shield className="h-12 w-12 mb-3 opacity-30" />
        <p className="text-sm font-medium">Accès restreint</p>
        <p className="text-xs mt-1">
          Vous n'avez pas la permission d'accéder à ce module.
          Contactez votre administrateur.
        </p>
      </div>
    );
  }

  return null;
}

/**
 * Composant pour protéger une page entière.
 * Affiche un message d'accès refusé si l'utilisateur n'a pas la permission.
 */
export function ProtectedPage({
  module,
  action,
  children,
}: {
  module: string;
  action?: string;
  children: React.ReactNode;
}) {
  return (
    <PermissionGate module={module} action={action} showDenied>
      {children}
    </PermissionGate>
  );
}
