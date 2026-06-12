import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Shield, Plus, Trash2, Users, Key, Settings2, Check, X, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

// ============================================================
// PAGE ADMIN RBAC
// ============================================================

export default function AdminRbac() {
  const [activeTab, setActiveTab] = useState<"roles" | "permissions" | "users">("roles");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Shield className="h-6 w-6 text-green-600" />
            Rôles & Permissions
          </h1>
          <p className="text-muted-foreground mt-1">
            Gérez les rôles, permissions et accès aux modules de la plateforme
          </p>
        </div>
        <SeedButton />
      </div>

      {/* Onglets */}
      <div className="flex gap-1 border-b">
        <TabButton active={activeTab === "roles"} onClick={() => setActiveTab("roles")} icon={<Key className="h-4 w-4" />} label="Rôles" />
        <TabButton active={activeTab === "permissions"} onClick={() => setActiveTab("permissions")} icon={<Settings2 className="h-4 w-4" />} label="Matrice Permissions" />
        <TabButton active={activeTab === "users"} onClick={() => setActiveTab("users")} icon={<Users className="h-4 w-4" />} label="Utilisateurs" />
      </div>

      {/* Contenu */}
      {activeTab === "roles" && <RolesTab />}
      {activeTab === "permissions" && <PermissionsTab />}
      {activeTab === "users" && <UsersTab />}
    </div>
  );
}

function TabButton({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
        active ? "border-green-600 text-green-600" : "border-transparent text-muted-foreground hover:text-foreground"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

function SeedButton() {
  const seedMutation = trpc.rbac.seedDefaults.useMutation({
    onSuccess: (data) => {
      toast.success(`Initialisation terminée : ${data.rolesCreated} rôles et ${data.permissionsCreated} permissions créés`);
    },
    onError: (err) => toast.error(err.message),
  });

  return (
    <Button variant="outline" size="sm" onClick={() => seedMutation.mutate()} disabled={seedMutation.isPending}>
      {seedMutation.isPending ? "Initialisation..." : "Initialiser les rôles par défaut"}
    </Button>
  );
}

// ============================================================
// ONGLET RÔLES
// ============================================================

function RolesTab() {
  const { data: rolesList, isLoading, refetch } = trpc.rbac.listRoles.useQuery();
  const [showCreate, setShowCreate] = useState(false);
  const [newRole, setNewRole] = useState({ name: "", displayName: "", description: "" });

  const createMutation = trpc.rbac.createRole.useMutation({
    onSuccess: () => {
      toast.success("Rôle créé avec succès");
      setShowCreate(false);
      setNewRole({ name: "", displayName: "", description: "" });
      refetch();
    },
    onError: (err) => toast.error(err.message),
  });

  const deleteMutation = trpc.rbac.deleteRole.useMutation({
    onSuccess: () => {
      toast.success("Rôle supprimé");
      refetch();
    },
    onError: (err) => toast.error(err.message),
  });

  if (isLoading) return <div className="text-center py-8 text-muted-foreground">Chargement...</div>;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">{rolesList?.length ?? 0} rôles configurés</p>
        <Button size="sm" onClick={() => setShowCreate(true)}>
          <Plus className="h-4 w-4 mr-1" /> Nouveau rôle
        </Button>
      </div>

      <div className="grid gap-3">
        {rolesList?.map((role) => (
          <Card key={role.id}>
            <CardContent className="flex items-center justify-between py-4">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${role.isSystem ? "bg-green-100 text-green-700" : "bg-blue-100 text-blue-700"}`}>
                  <Shield className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{role.displayName}</span>
                    <Badge variant={role.isSystem ? "default" : "secondary"} className="text-xs">
                      {role.isSystem ? "Système" : "Personnalisé"}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      {role.userCount} utilisateur{role.userCount !== 1 ? "s" : ""}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{role.description}</p>
                  <code className="text-xs text-muted-foreground">{role.name}</code>
                </div>
              </div>
              {!role.isSystem && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-red-500 hover:text-red-700"
                  onClick={() => deleteMutation.mutate({ roleId: role.id })}
                  disabled={deleteMutation.isPending}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Dialog création */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Créer un nouveau rôle</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Identifiant technique (snake_case)</Label>
              <Input
                value={newRole.name}
                onChange={(e) => setNewRole({ ...newRole, name: e.target.value.toLowerCase().replace(/[^a-z_]/g, "") })}
                placeholder="ex: chef_service"
              />
            </div>
            <div>
              <Label>Nom affiché</Label>
              <Input
                value={newRole.displayName}
                onChange={(e) => setNewRole({ ...newRole, displayName: e.target.value })}
                placeholder="ex: Chef de Service"
              />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea
                value={newRole.description}
                onChange={(e) => setNewRole({ ...newRole, description: e.target.value })}
                placeholder="Description du rôle..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Annuler</Button>
            <Button
              onClick={() => createMutation.mutate(newRole)}
              disabled={!newRole.name || !newRole.displayName || createMutation.isPending}
            >
              Créer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ============================================================
// ONGLET MATRICE PERMISSIONS
// ============================================================

function PermissionsTab() {
  const { data: rolesList } = trpc.rbac.listRoles.useQuery();
  const { data: permData } = trpc.rbac.listPermissions.useQuery();
  const [selectedRoleId, setSelectedRoleId] = useState<number | null>(null);
  const { data: rolePerms, refetch: refetchRolePerms } = trpc.rbac.getRolePermissions.useQuery(
    { roleId: selectedRoleId! },
    { enabled: !!selectedRoleId }
  );

  const assignMutation = trpc.rbac.assignPermissions.useMutation({
    onSuccess: (data) => {
      toast.success(`${data.count} permissions assignées`);
      refetchRolePerms();
    },
    onError: (err) => toast.error(err.message),
  });

  const [localPerms, setLocalPerms] = useState<Set<number>>(new Set());

  // Sync localPerms quand rolePerms change
  const currentPermIds = rolePerms?.map(p => p.permissionId) ?? [];
  const permSetKey = currentPermIds.sort().join(",");

  // Modules groupés
  const modules = permData?.grouped ?? {};

  return (
    <div className="space-y-4">
      <div className="flex gap-4 items-center">
        <Label>Sélectionner un rôle :</Label>
        <select
          className="border rounded px-3 py-1.5 text-sm"
          value={selectedRoleId ?? ""}
          onChange={(e) => {
            const id = Number(e.target.value);
            setSelectedRoleId(id || null);
            setLocalPerms(new Set());
          }}
        >
          <option value="">-- Choisir --</option>
          {rolesList?.map(r => (
            <option key={r.id} value={r.id}>{r.displayName}</option>
          ))}
        </select>
        {selectedRoleId && (
          <Button
            size="sm"
            onClick={() => assignMutation.mutate({ roleId: selectedRoleId, permissionIds: Array.from(localPerms) })}
            disabled={assignMutation.isPending}
          >
            Sauvegarder les permissions
          </Button>
        )}
      </div>

      {selectedRoleId && (
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left px-4 py-2 font-medium">Module</th>
                <th className="text-center px-2 py-2 font-medium">Voir</th>
                <th className="text-center px-2 py-2 font-medium">Créer</th>
                <th className="text-center px-2 py-2 font-medium">Modifier</th>
                <th className="text-center px-2 py-2 font-medium">Supprimer</th>
                <th className="text-center px-2 py-2 font-medium">Valider</th>
                <th className="text-center px-2 py-2 font-medium">Exporter</th>
                <th className="text-center px-2 py-2 font-medium">Gérer</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(modules).map(([moduleName, perms]) => (
                <tr key={moduleName} className="border-t">
                  <td className="px-4 py-2 font-medium capitalize">{moduleName.replace(/_/g, " ")}</td>
                  {["view", "create", "edit", "delete", "approve", "export", "manage"].map(action => {
                    const perm = perms.find((p: any) => p.action === action);
                    if (!perm) return <td key={action} className="text-center px-2 py-2 text-muted-foreground">—</td>;

                    const isChecked = localPerms.size > 0 ? localPerms.has(perm.id) : currentPermIds.includes(perm.id);

                    return (
                      <td key={action} className="text-center px-2 py-2">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            const newSet = new Set(localPerms.size > 0 ? localPerms : currentPermIds);
                            if (e.target.checked) {
                              newSet.add(perm.id);
                            } else {
                              newSet.delete(perm.id);
                            }
                            setLocalPerms(newSet);
                          }}
                          className="h-4 w-4 accent-green-600"
                        />
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!selectedRoleId && (
        <div className="text-center py-12 text-muted-foreground">
          <Settings2 className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p>Sélectionnez un rôle pour voir et modifier sa matrice de permissions</p>
        </div>
      )}
    </div>
  );
}

// ============================================================
// ONGLET UTILISATEURS
// ============================================================

function UsersTab() {
  const [search, setSearch] = useState("");
  const { data: usersList, isLoading, refetch } = trpc.rbac.listUsersWithRoles.useQuery({ search, page: 1, limit: 50 });
  const { data: rolesList } = trpc.rbac.listRoles.useQuery();
  const [assignDialog, setAssignDialog] = useState<{ userId: number; userName: string } | null>(null);
  const [selectedRoleId, setSelectedRoleId] = useState<number | null>(null);

  const assignMutation = trpc.rbac.assignRoleToUser.useMutation({
    onSuccess: () => {
      toast.success("Rôle assigné avec succès");
      setAssignDialog(null);
      setSelectedRoleId(null);
      refetch();
    },
    onError: (err) => toast.error(err.message),
  });

  const removeMutation = trpc.rbac.removeRoleFromUser.useMutation({
    onSuccess: () => {
      toast.success("Rôle retiré");
      refetch();
    },
    onError: (err) => toast.error(err.message),
  });

  return (
    <div className="space-y-4">
      <div className="flex gap-3 items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher un utilisateur..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-8 text-muted-foreground">Chargement...</div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left px-4 py-2 font-medium">Utilisateur</th>
                <th className="text-left px-4 py-2 font-medium">Rôle legacy</th>
                <th className="text-left px-4 py-2 font-medium">Rôles RBAC</th>
                <th className="text-center px-4 py-2 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {usersList?.map((user) => (
                <tr key={user.id} className="border-t">
                  <td className="px-4 py-3">
                    <div className="font-medium">{user.name || "Sans nom"}</div>
                    <div className="text-xs text-muted-foreground">{user.email || "—"}</div>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant="outline" className="text-xs">{user.legacyRole}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {user.roles.length === 0 ? (
                        <span className="text-xs text-muted-foreground italic">Aucun rôle RBAC</span>
                      ) : (
                        user.roles.map((r: any) => (
                          <Badge key={r.roleId} variant="secondary" className="text-xs flex items-center gap-1">
                            {r.displayName}
                            <button
                              onClick={() => removeMutation.mutate({ userId: user.id, roleId: r.roleId })}
                              className="hover:text-red-500"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </Badge>
                        ))
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setAssignDialog({ userId: user.id, userName: user.name || "Utilisateur" })}
                    >
                      <Plus className="h-4 w-4 mr-1" /> Assigner
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Dialog assignation */}
      <Dialog open={!!assignDialog} onOpenChange={() => setAssignDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assigner un rôle à {assignDialog?.userName}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Label>Sélectionner un rôle</Label>
            <select
              className="w-full border rounded px-3 py-2 text-sm"
              value={selectedRoleId ?? ""}
              onChange={(e) => setSelectedRoleId(Number(e.target.value) || null)}
            >
              <option value="">-- Choisir un rôle --</option>
              {rolesList?.map(r => (
                <option key={r.id} value={r.id}>{r.displayName}</option>
              ))}
            </select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignDialog(null)}>Annuler</Button>
            <Button
              onClick={() => {
                if (assignDialog && selectedRoleId) {
                  assignMutation.mutate({ userId: assignDialog.userId, roleId: selectedRoleId });
                }
              }}
              disabled={!selectedRoleId || assignMutation.isPending}
            >
              Assigner
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
