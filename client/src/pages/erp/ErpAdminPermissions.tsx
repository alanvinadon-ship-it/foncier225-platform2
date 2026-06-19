import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useErpPermissions } from "@/hooks/useErpPermissions";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Check, X } from "lucide-react";

export default function ErpAdminPermissions() {

  const { isErpAdmin } = useErpPermissions();
  const [selectedRoleId, setSelectedRoleId] = useState<string>("");

  const { data: roles } = trpc.erp.roles.list.useQuery();
  const { data: allPermissions } = trpc.erp.permissions.list.useQuery();
  const { data: rolePermIds, refetch: refetchRolePerms } = trpc.erp.permissions.byRole.useQuery(
    { roleId: parseInt(selectedRoleId) },
    { enabled: !!selectedRoleId }
  );

  const assignPerms = trpc.erp.roles.assignPermissions.useMutation({
    onSuccess: () => {
      toast.success("Permissions mises à jour");
      refetchRolePerms();
    },
    onError: (err) => toast.error(err.message),
  });

  if (!isErpAdmin()) {
    return <div className="text-center py-12 text-muted-foreground">Accès réservé aux administrateurs ERP</div>;
  }

  // Grouper les permissions par module
  const permsByModule = (allPermissions || []).reduce<Record<string, typeof allPermissions>>((acc, perm) => {
    if (!acc[perm.module]) acc[perm.module] = [];
    acc[perm.module]!.push(perm);
    return acc;
  }, {});

  const togglePermission = (permId: number) => {
    if (!selectedRoleId) return;
    const current = rolePermIds || [];
    const newIds = current.includes(permId)
      ? current.filter(id => id !== permId)
      : [...current, permId];
    assignPerms.mutate({ roleId: parseInt(selectedRoleId), permissionIds: newIds });
  };

  const MODULE_LABELS: Record<string, string> = {
    erp_dashboard: "Dashboard",
    erp_projects: "Projets",
    erp_gantt: "Gantt",
    erp_documents: "Documents",
    erp_compliance: "Conformité",
    erp_equipment: "Équipements",
    erp_safety: "Sécurité",
    erp_vendors: "Fournisseurs",
    erp_contractors: "Entrepreneurs",
    erp_inventory: "Inventaire",
    erp_finance: "Finances",
    erp_alerts: "Alertes",
    erp_profile: "Profil",
    erp_audit_logs: "Audit Logs",
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold">Matrice des Permissions ERP</h1>
        <p className="text-sm text-muted-foreground">Gérer les permissions par rôle et par module</p>
      </div>

      {/* Sélecteur de rôle */}
      <div className="max-w-xs">
        <label className="text-sm font-medium mb-1 block">Sélectionner un rôle</label>
        <Select value={selectedRoleId} onValueChange={setSelectedRoleId}>
          <SelectTrigger>
            <SelectValue placeholder="Choisir un rôle..." />
          </SelectTrigger>
          <SelectContent>
            {roles?.map(role => (
              <SelectItem key={role.id} value={String(role.id)}>
                {role.displayName} {role.isSystem ? "(système)" : ""}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Matrice permissions */}
      {selectedRoleId && allPermissions && (
        <div className="space-y-4">
          {Object.entries(permsByModule).map(([module, perms]) => (
            <div key={module} className="bg-card border border-border rounded-lg p-4">
              <h3 className="font-medium text-sm mb-3">{MODULE_LABELS[module] || module}</h3>
              <div className="flex flex-wrap gap-2">
                {perms!.map(perm => {
                  const isActive = (rolePermIds || []).includes(perm.id);
                  return (
                    <button
                      key={perm.id}
                      onClick={() => togglePermission(perm.id)}
                      disabled={assignPerms.isPending}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium border transition-colors ${
                        isActive
                          ? "bg-primary/10 border-primary/30 text-primary"
                          : "bg-muted/50 border-border text-muted-foreground hover:border-primary/30"
                      }`}
                      title={perm.description || ""}
                    >
                      {isActive ? <Check size={12} /> : <X size={12} className="opacity-30" />}
                      {perm.action}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {!selectedRoleId && (
        <div className="text-center py-12 text-muted-foreground">
          Sélectionnez un rôle pour voir et modifier ses permissions
        </div>
      )}
    </div>
  );
}
