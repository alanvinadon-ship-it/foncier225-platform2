import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { trpc } from "@/lib/trpc";
import { Pencil, Plus, Mail, Trash2, Users, Search } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

const ROLE_LABELS: Record<string, { label: string; color: string }> = {
  citizen: { label: "Citoyen", color: "bg-blue-50 text-blue-700" },
  agent_terrain: { label: "Agent Terrain", color: "bg-green-50 text-green-700" },
  agent_mclu: { label: "Agent MCLU", color: "bg-cyan-50 text-cyan-700" },
  geometre_urbain: { label: "Géomètre Urbain", color: "bg-indigo-50 text-indigo-700" },
  conservateur: { label: "Conservateur", color: "bg-amber-50 text-amber-700" },
  bank: { label: "Banque", color: "bg-purple-50 text-purple-700" },
  admin: { label: "Admin", color: "bg-red-50 text-red-700" },
};

export default function UsersAdmin() {
  const [search, setSearch] = useState("");
  const [offset, setOffset] = useState(0);
  const limit = 50;

  const { data: usersData, isLoading, refetch } = trpc.admin.listUsersAdmin.useQuery({
    limit,
    offset,
    search: search || undefined,
  });

  const createUserMutation = trpc.admin.createUser.useMutation({
    onSuccess: () => {
      toast.success("Utilisateur créé avec succès");
      refetch();
      setCreateDialogOpen(false);
      setCreateForm({ name: "", email: "", role: "citizen" });
    },
    onError: (err) => toast.error(err.message),
  });

  const inviteUserMutation = trpc.admin.inviteUser.useMutation({
    onSuccess: () => {
      toast.success("Invitation envoyée");
      refetch();
      setInviteDialogOpen(false);
      setInviteForm({ email: "", role: "citizen" });
    },
    onError: (err) => toast.error(err.message),
  });

  const updateUserMutation = trpc.admin.updateUserDetails.useMutation({
    onSuccess: () => {
      toast.success("Utilisateur mis à jour");
      refetch();
      setEditDialogOpen(false);
      setEditUser(null);
    },
    onError: (err) => toast.error(err.message),
  });

  const deleteUserMutation = trpc.admin.deleteUserAdmin.useMutation({
    onSuccess: () => {
      toast.success("Utilisateur supprimé");
      refetch();
      setDeleteConfirmOpen(false);
      setDeleteUserId(null);
    },
    onError: (err) => toast.error(err.message),
  });

  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  const [createForm, setCreateForm] = useState({ name: "", email: "", role: "citizen" });
  const [inviteForm, setInviteForm] = useState({ email: "", role: "citizen" });
  const [editUser, setEditUser] = useState<any>(null);
  const [deleteUserId, setDeleteUserId] = useState<number | null>(null);

  const handleCreate = () => {
    if (!createForm.name || !createForm.email) {
      toast.error("Veuillez remplir tous les champs");
      return;
    }
    createUserMutation.mutate(createForm as any);
  };

  const handleInvite = () => {
    if (!inviteForm.email) {
      toast.error("Veuillez entrer un email");
      return;
    }
    inviteUserMutation.mutate(inviteForm as any);
  };

  const handleUpdate = () => {
    if (!editUser) return;
    updateUserMutation.mutate({
      userId: editUser.id,
      name: editUser.name,
      email: editUser.email,
      role: editUser.role,
      isActive: editUser.isActive,
    });
  };

  const handleDelete = () => {
    if (!deleteUserId) return;
    deleteUserMutation.mutate({ userId: deleteUserId });
  };

  const users = usersData?.users || [];
  const total = usersData?.total || 0;
  const hasNextPage = offset + limit < total;
  const hasPrevPage = offset > 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Users className="h-6 w-6 text-ci-green" />
            Gestion des utilisateurs
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Créez, invitez, modifiez ou supprimez des utilisateurs
          </p>
        </div>
        <div className="flex gap-2">
          <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-ci-green hover:bg-ci-green/90 gap-2">
                <Plus className="h-4 w-4" />
                Créer un utilisateur
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Créer un nouvel utilisateur</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Nom complet</label>
                  <Input
                    placeholder="Jean Dupont"
                    value={createForm.name}
                    onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Email</label>
                  <Input
                    type="email"
                    placeholder="jean@example.com"
                    value={createForm.email}
                    onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Rôle</label>
                  <Select value={createForm.role} onValueChange={(role) => setCreateForm({ ...createForm, role })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="citizen">Citoyen</SelectItem>
                      <SelectItem value="agent_terrain">Agent Terrain</SelectItem>
                      <SelectItem value="agent_mclu">Agent MCLU</SelectItem>
                      <SelectItem value="geometre_urbain">Géomètre Urbain</SelectItem>
                      <SelectItem value="conservateur">Conservateur</SelectItem>
                      <SelectItem value="bank">Banque</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={handleCreate} className="w-full bg-ci-green hover:bg-ci-green/90" disabled={createUserMutation.isPending}>
                  {createUserMutation.isPending ? "Création..." : "Créer"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" gap-2>
                <Mail className="h-4 w-4" />
                Inviter par email
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Inviter un utilisateur</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Email</label>
                  <Input
                    type="email"
                    placeholder="utilisateur@example.com"
                    value={inviteForm.email}
                    onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Rôle</label>
                  <Select value={inviteForm.role} onValueChange={(role) => setInviteForm({ ...inviteForm, role })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="citizen">Citoyen</SelectItem>
                      <SelectItem value="agent_terrain">Agent Terrain</SelectItem>
                      <SelectItem value="agent_mclu">Agent MCLU</SelectItem>
                      <SelectItem value="geometre_urbain">Géomètre Urbain</SelectItem>
                      <SelectItem value="conservateur">Conservateur</SelectItem>
                      <SelectItem value="bank">Banque</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={handleInvite} className="w-full bg-ci-green hover:bg-ci-green/90" disabled={inviteUserMutation.isPending}>
                  {inviteUserMutation.isPending ? "Envoi..." : "Envoyer l'invitation"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="flex items-center gap-2 bg-card rounded-lg border p-3">
        <Search className="h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Rechercher par nom ou email..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setOffset(0);
          }}
          className="border-0 bg-transparent focus-visible:ring-0"
        />
      </div>

      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nom</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Rôle</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead>Inscription</TableHead>
              <TableHead className="w-24">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 6 }).map((_, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-5 w-20" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : users.length > 0 ? (
              users.map((u: any) => {
                const roleCfg = ROLE_LABELS[u.role] || ROLE_LABELS.citizen;
                return (
                  <TableRow key={u.id}>
                    <TableCell className="font-medium">{u.name || "—"}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{u.email || "—"}</TableCell>
                    <TableCell>
                      <Badge className={`${roleCfg.color} text-xs`}>{roleCfg.label}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={u.isActive ? "default" : "secondary"} className="text-xs">
                        {u.isActive ? "Actif" : "Inactif"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(u.createdAt).toLocaleDateString("fr-FR")}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Dialog open={editDialogOpen && editUser?.id === u.id} onOpenChange={(open) => {
                          if (!open) setEditUser(null);
                          setEditDialogOpen(open);
                        }}>
                          <DialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setEditUser({ ...u })}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Modifier l'utilisateur</DialogTitle>
                            </DialogHeader>
                            {editUser && (
                              <div className="space-y-4 py-4">
                                <div>
                                  <label className="text-sm font-medium mb-1.5 block">Nom</label>
                                  <Input
                                    value={editUser.name || ""}
                                    onChange={(e) => setEditUser({ ...editUser, name: e.target.value })}
                                  />
                                </div>
                                <div>
                                  <label className="text-sm font-medium mb-1.5 block">Email</label>
                                  <Input
                                    type="email"
                                    value={editUser.email || ""}
                                    onChange={(e) => setEditUser({ ...editUser, email: e.target.value })}
                                  />
                                </div>
                                <div>
                                  <label className="text-sm font-medium mb-1.5 block">Rôle</label>
                                  <Select value={editUser.role} onValueChange={(role) => setEditUser({ ...editUser, role })}>
                                    <SelectTrigger>
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="citizen">Citoyen</SelectItem>
                                      <SelectItem value="agent_terrain">Agent Terrain</SelectItem>
                                      <SelectItem value="agent_mclu">Agent MCLU</SelectItem>
                                      <SelectItem value="geometre_urbain">Géomètre Urbain</SelectItem>
                                      <SelectItem value="conservateur">Conservateur</SelectItem>
                                      <SelectItem value="bank">Banque</SelectItem>
                                      <SelectItem value="admin">Admin</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div className="flex items-center gap-2">
                                  <input
                                    type="checkbox"
                                    id="isActive"
                                    checked={editUser.isActive}
                                    onChange={(e) => setEditUser({ ...editUser, isActive: e.target.checked })}
                                    className="rounded"
                                  />
                                  <label htmlFor="isActive" className="text-sm font-medium cursor-pointer">
                                    Utilisateur actif
                                  </label>
                                </div>
                                <Button onClick={handleUpdate} className="w-full bg-ci-green hover:bg-ci-green/90" disabled={updateUserMutation.isPending}>
                                  {updateUserMutation.isPending ? "Mise à jour..." : "Enregistrer"}
                                </Button>
                              </div>
                            )}
                          </DialogContent>
                        </Dialog>

                        <Dialog open={deleteConfirmOpen && deleteUserId === u.id} onOpenChange={(open) => {
                          if (!open) setDeleteUserId(null);
                          setDeleteConfirmOpen(open);
                        }}>
                          <DialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setDeleteUserId(u.id)}
                            >
                              <Trash2 className="h-3.5 w-3.5 text-red-600" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Confirmer la suppression</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4 py-4">
                              <p className="text-sm">
                                Êtes-vous sûr de vouloir supprimer l'utilisateur <strong>{u.name || u.email}</strong> ?
                              </p>
                              <div className="flex gap-2">
                                <Button variant="outline" onClick={() => setDeleteConfirmOpen(false)} className="flex-1">
                                  Annuler
                                </Button>
                                <Button onClick={handleDelete} className="flex-1 bg-red-600 hover:bg-red-700" disabled={deleteUserMutation.isPending}>
                                  {deleteUserMutation.isPending ? "Suppression..." : "Supprimer"}
                                </Button>
                              </div>
                            </div>
                          </DialogContent>
                        </Dialog>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            ) : (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  Aucun utilisateur trouvé
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Affichage de {users.length > 0 ? offset + 1 : 0} à {Math.min(offset + limit, total)} sur {total} utilisateurs
        </p>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setOffset(Math.max(0, offset - limit))} disabled={!hasPrevPage}>
            Précédent
          </Button>
          <Button variant="outline" onClick={() => setOffset(offset + limit)} disabled={!hasNextPage}>
            Suivant
          </Button>
        </div>
      </div>
    </div>
  );
}
