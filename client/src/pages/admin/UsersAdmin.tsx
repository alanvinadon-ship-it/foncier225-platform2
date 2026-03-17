import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import { Pencil, Users } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

const ROLE_LABELS: Record<string, { label: string; color: string }> = {
  citizen: { label: "Citoyen", color: "bg-blue-50 text-blue-700" },
  agent_terrain: { label: "Agent Terrain", color: "bg-green-50 text-green-700" },
  bank: { label: "Banque", color: "bg-purple-50 text-purple-700" },
  admin: { label: "Admin", color: "bg-red-50 text-red-700" },
};

export default function UsersAdmin() {
  const { data: usersList, isLoading, refetch } = trpc.admin.listUsers.useQuery();
  const updateRole = trpc.admin.updateUserRole.useMutation({
    onSuccess: () => {
      toast.success("Rôle mis à jour");
      refetch();
    },
    onError: (err) => toast.error(err.message),
  });

  const [editUser, setEditUser] = useState<any>(null);
  const [newRole, setNewRole] = useState("");

  const handleSaveRole = () => {
    if (!editUser || !newRole) return;
    updateRole.mutate({ userId: editUser.id, role: newRole as any });
    setEditUser(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Users className="h-6 w-6 text-ci-green" />
            Gestion des utilisateurs
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Gérez les rôles et permissions des utilisateurs de la plateforme
          </p>
        </div>
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
              <TableHead className="w-16">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 6 }).map((_, j) => (
                    <TableCell key={j}><Skeleton className="h-5 w-20" /></TableCell>
                  ))}
                </TableRow>
              ))
            ) : usersList && usersList.length > 0 ? (
              usersList.map((u: any) => {
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
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => { setEditUser(u); setNewRole(u.role); }}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Modifier le rôle</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4 py-4">
                            <div>
                              <label className="text-sm font-medium mb-1.5 block">Utilisateur</label>
                              <p className="text-sm text-muted-foreground">{editUser?.name || editUser?.email || "—"}</p>
                            </div>
                            <div>
                              <label className="text-sm font-medium mb-1.5 block">Nouveau rôle</label>
                              <Select value={newRole} onValueChange={setNewRole}>
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="citizen">Citoyen</SelectItem>
                                  <SelectItem value="agent_terrain">Agent Terrain</SelectItem>
                                  <SelectItem value="bank">Banque</SelectItem>
                                  <SelectItem value="admin">Admin</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <Button onClick={handleSaveRole} className="w-full bg-ci-green hover:bg-ci-green/90">
                              Enregistrer
                            </Button>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </TableCell>
                  </TableRow>
                );
              })
            ) : (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  Aucun utilisateur enregistré
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
