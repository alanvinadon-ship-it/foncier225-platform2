import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useErpPermissions } from "@/hooks/useErpPermissions";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, Trash2, Edit, Shield } from "lucide-react";

export default function ErpAdminRoles() {

  const { isErpAdmin } = useErpPermissions();
  const [createDialog, setCreateDialog] = useState(false);
  const [editDialog, setEditDialog] = useState<{ id: number; displayName: string; description: string } | null>(null);
  const [newRole, setNewRole] = useState({ name: "", displayName: "", description: "" });

  const { data: roles, refetch } = trpc.erp.roles.list.useQuery();

  const createRole = trpc.erp.roles.create.useMutation({
    onSuccess: () => {
      toast.success("Rôle ERP créé avec succès");
      refetch();
      setCreateDialog(false);
      setNewRole({ name: "", displayName: "", description: "" });
    },
    onError: (err) => toast.error(err.message),
  });

  const updateRole = trpc.erp.roles.update.useMutation({
    onSuccess: () => {
      toast.success("Rôle modifié");
      refetch();
      setEditDialog(null);
    },
    onError: (err) => toast.error(err.message),
  });

  const deleteRole = trpc.erp.roles.delete.useMutation({
    onSuccess: () => {
      toast.success("Rôle supprimé");
      refetch();
    },
    onError: (err) => toast.error(err.message),
  });

  if (!isErpAdmin()) {
    return <div className="text-center py-12 text-muted-foreground">Accès réservé aux administrateurs ERP</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Rôles ERP</h1>
          <p className="text-sm text-muted-foreground">Gérer les rôles du module ERP Construction</p>
        </div>
        <Button onClick={() => setCreateDialog(true)}>
          <Plus size={16} className="mr-2" /> Nouveau rôle
        </Button>
      </div>

      {/* Liste des rôles */}
      <div className="grid gap-3">
        {roles?.map(role => (
          <div key={role.id} className="flex items-center justify-between bg-card border border-border rounded-lg p-4">
            <div className="flex items-center gap-3">
              <Shield size={18} className={role.isSystem ? "text-primary" : "text-muted-foreground"} />
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm">{role.displayName}</span>
                  {role.isSystem && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary font-medium">
                      Système
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">{role.description}</p>
                <p className="text-[10px] text-muted-foreground/60 font-mono mt-0.5">{role.name}</p>
              </div>
            </div>
            {!role.isSystem && (
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setEditDialog({ id: role.id, displayName: role.displayName, description: role.description || "" })}
                >
                  <Edit size={14} />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive hover:text-destructive"
                  onClick={() => {
                    if (confirm(`Supprimer le rôle "${role.displayName}" ?`)) {
                      deleteRole.mutate({ id: role.id });
                    }
                  }}
                >
                  <Trash2 size={14} />
                </Button>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Dialog création */}
      <Dialog open={createDialog} onOpenChange={setCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Créer un rôle ERP</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium">Identifiant (snake_case)</label>
              <Input
                value={newRole.name}
                onChange={e => setNewRole(p => ({ ...p, name: e.target.value.toLowerCase().replace(/[^a-z_]/g, "") }))}
                placeholder="erp_custom_role"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Nom d'affichage</label>
              <Input
                value={newRole.displayName}
                onChange={e => setNewRole(p => ({ ...p, displayName: e.target.value }))}
                placeholder="Mon Rôle Personnalisé"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Description</label>
              <Input
                value={newRole.description}
                onChange={e => setNewRole(p => ({ ...p, description: e.target.value }))}
                placeholder="Description du rôle..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialog(false)}>Annuler</Button>
            <Button
              onClick={() => createRole.mutate(newRole)}
              disabled={!newRole.name || !newRole.displayName || createRole.isPending}
            >
              {createRole.isPending ? "Création..." : "Créer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog édition */}
      <Dialog open={!!editDialog} onOpenChange={() => setEditDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Modifier le rôle</DialogTitle>
          </DialogHeader>
          {editDialog && (
            <div className="space-y-4 py-4">
              <div>
                <label className="text-sm font-medium">Nom d'affichage</label>
                <Input
                  value={editDialog.displayName}
                  onChange={e => setEditDialog(p => p ? { ...p, displayName: e.target.value } : null)}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Description</label>
                <Input
                  value={editDialog.description}
                  onChange={e => setEditDialog(p => p ? { ...p, description: e.target.value } : null)}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialog(null)}>Annuler</Button>
            <Button
              onClick={() => {
                if (editDialog) {
                  updateRole.mutate({ id: editDialog.id, displayName: editDialog.displayName, description: editDialog.description });
                }
              }}
              disabled={updateRole.isPending}
            >
              {updateRole.isPending ? "Sauvegarde..." : "Sauvegarder"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
