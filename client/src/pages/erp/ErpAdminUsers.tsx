import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useErpPermissions } from "@/hooks/useErpPermissions";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { UserPlus, Trash2, Search } from "lucide-react";

export default function ErpAdminUsers() {

  const { isErpAdmin } = useErpPermissions();
  const [search, setSearch] = useState("");
  const [assignDialog, setAssignDialog] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [selectedRoleId, setSelectedRoleId] = useState<string>("");

  const { data: usersData, refetch } = trpc.erp.userRoles.listUsers.useQuery({ search: search || undefined });
  const { data: allRoles } = trpc.erp.roles.list.useQuery();

  const assignRole = trpc.erp.userRoles.assign.useMutation({
    onSuccess: () => {
      toast.success("Rôle ERP assigné avec succès");
      refetch();
      setAssignDialog(false);
    },
    onError: (err) => toast.error(err.message),
  });

  const removeRole = trpc.erp.userRoles.remove.useMutation({
    onSuccess: () => {
      toast.success("Rôle ERP retiré");
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
          <h1 className="text-xl font-bold">Utilisateurs ERP</h1>
          <p className="text-sm text-muted-foreground">Gérer les accès ERP Construction</p>
        </div>
        <Button onClick={() => { setSelectedUserId(null); setAssignDialog(true); }}>
          <UserPlus size={16} className="mr-2" /> Assigner un rôle
        </Button>
      </div>

      {/* Recherche */}
      <div className="relative max-w-sm">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Rechercher un utilisateur..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Table */}
      <div className="border border-border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="text-left px-4 py-3 font-medium">Utilisateur</th>
              <th className="text-left px-4 py-3 font-medium">Email</th>
              <th className="text-left px-4 py-3 font-medium">Rôles ERP</th>
              <th className="text-right px-4 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {usersData?.users.map(user => (
              <tr key={user.id} className="hover:bg-muted/30">
                <td className="px-4 py-3 font-medium">{user.name}</td>
                <td className="px-4 py-3 text-muted-foreground">{user.email}</td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1">
                    {user.erpRoles.map(r => (
                      <span
                        key={r.roleId}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-primary/10 text-primary"
                      >
                        {r.displayName}
                        <button
                          onClick={() => removeRole.mutate({ userId: user.id, roleId: r.roleId })}
                          className="hover:text-destructive"
                          title="Retirer ce rôle"
                        >
                          <Trash2 size={10} />
                        </button>
                      </span>
                    ))}
                  </div>
                </td>
                <td className="px-4 py-3 text-right">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => { setSelectedUserId(user.id); setAssignDialog(true); }}
                  >
                    <UserPlus size={14} />
                  </Button>
                </td>
              </tr>
            ))}
            {(!usersData?.users || usersData.users.length === 0) && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">
                  Aucun utilisateur avec un rôle ERP
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Dialog assignation */}
      <Dialog open={assignDialog} onOpenChange={setAssignDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assigner un rôle ERP</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {!selectedUserId && (
              <div>
                <label className="text-sm font-medium">ID Utilisateur</label>
                <Input
                  type="number"
                  placeholder="ID de l'utilisateur"
                  onChange={e => setSelectedUserId(parseInt(e.target.value) || null)}
                />
              </div>
            )}
            <div>
              <label className="text-sm font-medium">Rôle ERP</label>
              <Select value={selectedRoleId} onValueChange={setSelectedRoleId}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner un rôle" />
                </SelectTrigger>
                <SelectContent>
                  {allRoles?.map(role => (
                    <SelectItem key={role.id} value={String(role.id)}>
                      {role.displayName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignDialog(false)}>Annuler</Button>
            <Button
              onClick={() => {
                if (selectedUserId && selectedRoleId) {
                  assignRole.mutate({ userId: selectedUserId, roleId: parseInt(selectedRoleId) });
                }
              }}
              disabled={!selectedUserId || !selectedRoleId || assignRole.isPending}
            >
              {assignRole.isPending ? "Assignation..." : "Assigner"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
