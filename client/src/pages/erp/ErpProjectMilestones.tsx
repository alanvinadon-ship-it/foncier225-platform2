import { useState } from "react";
import { useRoute, Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ArrowLeft, Plus, Diamond, CheckCircle2, AlertTriangle, Clock, Trash2, Edit2, Flag } from "lucide-react";
import { toast } from "sonner";

// ============================================================
// HELPERS
// ============================================================
function formatDate(ts: number | null): string {
  if (!ts) return "—";
  return new Date(ts).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
}

function getStatusBadge(status: string, isLate: boolean) {
  if (isLate && status === "planned") {
    return <Badge variant="destructive">En retard</Badge>;
  }
  const variants: Record<string, { label: string; className: string }> = {
    planned: { label: "Planifié", className: "bg-blue-100 text-blue-700" },
    reached: { label: "Atteint", className: "bg-green-100 text-green-700" },
    delayed: { label: "Retardé", className: "bg-orange-100 text-orange-700" },
    missed: { label: "Manqué", className: "bg-red-100 text-red-700" },
    cancelled: { label: "Annulé", className: "bg-gray-100 text-gray-700" },
  };
  const v = variants[status] || variants.planned;
  return <Badge className={v.className}>{v.label}</Badge>;
}

function getImpactBadge(level: string) {
  const variants: Record<string, { label: string; className: string }> = {
    low: { label: "Faible", className: "bg-gray-100 text-gray-600" },
    medium: { label: "Moyen", className: "bg-blue-100 text-blue-600" },
    high: { label: "Élevé", className: "bg-orange-100 text-orange-600" },
    critical: { label: "Critique", className: "bg-red-100 text-red-600" },
  };
  const v = variants[level] || variants.medium;
  return <Badge className={v.className}>{v.label}</Badge>;
}

// ============================================================
// PAGE MILESTONES
// ============================================================
export default function ErpProjectMilestones() {
  const [, params] = useRoute("/erp/projects/:id/milestones");
  const projectId = Number(params?.id);

  const [showCreate, setShowCreate] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Form state
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [plannedDate, setPlannedDate] = useState("");
  const [impactLevel, setImpactLevel] = useState("medium");

  const utils = trpc.useUtils();

  const { data: milestones, isLoading } = trpc.erp.milestones.listByProject.useQuery(
    { projectId, status: statusFilter === "all" ? undefined : statusFilter as any },
    { enabled: !!projectId }
  );

  const createMutation = trpc.erp.milestones.create.useMutation({
    onSuccess: () => {
      toast.success("Jalon créé avec succès");
      utils.erp.milestones.listByProject.invalidate({ projectId });
      resetForm();
      setShowCreate(false);
    },
    onError: (err) => toast.error(err.message),
  });

  const updateMutation = trpc.erp.milestones.update.useMutation({
    onSuccess: () => {
      toast.success("Jalon mis à jour");
      utils.erp.milestones.listByProject.invalidate({ projectId });
      resetForm();
      setEditingId(null);
    },
    onError: (err) => toast.error(err.message),
  });

  const deleteMutation = trpc.erp.milestones.delete.useMutation({
    onSuccess: () => {
      toast.success("Jalon supprimé");
      utils.erp.milestones.listByProject.invalidate({ projectId });
    },
    onError: (err) => toast.error(err.message),
  });

  const markReachedMutation = trpc.erp.milestones.markReached.useMutation({
    onSuccess: (result) => {
      const msg = result.isLate ? "Jalon marqué comme retardé" : "Jalon marqué comme atteint";
      toast.success(msg);
      utils.erp.milestones.listByProject.invalidate({ projectId });
    },
    onError: (err) => toast.error(err.message),
  });

  function resetForm() {
    setName("");
    setDescription("");
    setPlannedDate("");
    setImpactLevel("medium");
  }

  function handleCreate() {
    if (!name || !plannedDate) {
      toast.error("Nom et date planifiée requis");
      return;
    }
    createMutation.mutate({
      projectId,
      name,
      description: description || undefined,
      plannedDate: new Date(plannedDate).getTime(),
      impactLevel: impactLevel as any,
    });
  }

  function handleUpdate() {
    if (!editingId || !name || !plannedDate) return;
    updateMutation.mutate({
      id: editingId,
      name,
      description: description || undefined,
      plannedDate: new Date(plannedDate).getTime(),
      impactLevel: impactLevel as any,
    });
  }

  function startEdit(m: any) {
    setEditingId(m.id);
    setName(m.name);
    setDescription(m.description || "");
    setPlannedDate(new Date(m.plannedDate).toISOString().split("T")[0]);
    setImpactLevel(m.impactLevel);
  }

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <div className="h-8 w-64 bg-muted animate-pulse rounded" />
        <div className="h-[400px] bg-muted animate-pulse rounded" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href={`/erp/projects/${projectId}`}>
            <Button variant="ghost" size="icon"><ArrowLeft className="w-4 h-4" /></Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Diamond className="w-5 h-5 text-amber-600" />
              Jalons du projet
            </h1>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Statut" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous</SelectItem>
              <SelectItem value="planned">Planifié</SelectItem>
              <SelectItem value="reached">Atteint</SelectItem>
              <SelectItem value="delayed">Retardé</SelectItem>
              <SelectItem value="missed">Manqué</SelectItem>
              <SelectItem value="cancelled">Annulé</SelectItem>
            </SelectContent>
          </Select>
          <Dialog open={showCreate} onOpenChange={setShowCreate}>
            <DialogTrigger asChild>
              <Button onClick={() => { resetForm(); setShowCreate(true); }}>
                <Plus className="w-4 h-4 mr-2" /> Nouveau jalon
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Créer un jalon</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div>
                  <Label>Nom *</Label>
                  <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Livraison fondations" />
                </div>
                <div>
                  <Label>Description</Label>
                  <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Description du jalon..." />
                </div>
                <div>
                  <Label>Date planifiée *</Label>
                  <Input type="date" value={plannedDate} onChange={(e) => setPlannedDate(e.target.value)} />
                </div>
                <div>
                  <Label>Niveau d'impact</Label>
                  <Select value={impactLevel} onValueChange={setImpactLevel}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Faible</SelectItem>
                      <SelectItem value="medium">Moyen</SelectItem>
                      <SelectItem value="high">Élevé</SelectItem>
                      <SelectItem value="critical">Critique</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={handleCreate} disabled={createMutation.isPending} className="w-full">
                  {createMutation.isPending ? "Création..." : "Créer le jalon"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Card>
          <CardContent className="p-3 text-center">
            <p className="text-xl font-bold">{milestones?.length || 0}</p>
            <p className="text-xs text-muted-foreground">Total</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <p className="text-xl font-bold text-blue-600">{milestones?.filter((m) => m.status === "planned").length || 0}</p>
            <p className="text-xs text-muted-foreground">Planifiés</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <p className="text-xl font-bold text-green-600">{milestones?.filter((m) => m.status === "reached").length || 0}</p>
            <p className="text-xs text-muted-foreground">Atteints</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <p className="text-xl font-bold text-red-600">{milestones?.filter((m) => m.isLate).length || 0}</p>
            <p className="text-xs text-muted-foreground">En retard</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <p className="text-xl font-bold text-orange-600">{milestones?.filter((m) => m.status === "missed").length || 0}</p>
            <p className="text-xs text-muted-foreground">Manqués</p>
          </CardContent>
        </Card>
      </div>

      {/* Milestones list */}
      <div className="space-y-3">
        {milestones?.map((m) => (
          <Card key={m.id} className={m.isLate ? "border-red-200 bg-red-50/30" : ""}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Diamond className={`w-4 h-4 ${m.status === "reached" ? "text-green-600" : m.isLate ? "text-red-600" : "text-amber-500"}`} />
                    <h3 className="font-semibold">{m.name}</h3>
                    {getStatusBadge(m.status, m.isLate)}
                    {getImpactBadge(m.impactLevel)}
                  </div>
                  {m.description && <p className="text-sm text-muted-foreground ml-6">{m.description}</p>}
                  <div className="flex items-center gap-4 mt-2 ml-6 text-xs text-muted-foreground">
                    <span>Planifié : {formatDate(m.plannedDate)}</span>
                    {m.actualDate && <span>Réalisé : {formatDate(m.actualDate)}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  {m.status === "planned" && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => markReachedMutation.mutate({ id: m.id })}
                      disabled={markReachedMutation.isPending}
                    >
                      <CheckCircle2 className="w-3 h-3 mr-1" /> Atteint
                    </Button>
                  )}
                  <Button variant="ghost" size="icon" onClick={() => startEdit(m)}>
                    <Edit2 className="w-3 h-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-red-500"
                    onClick={() => {
                      if (confirm("Supprimer ce jalon ?")) {
                        deleteMutation.mutate({ id: m.id });
                      }
                    }}
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {(!milestones || milestones.length === 0) && (
          <div className="text-center py-12 text-muted-foreground">
            <Diamond className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>Aucun jalon défini pour ce projet.</p>
            <p className="text-sm">Créez un jalon pour suivre les étapes clés.</p>
          </div>
        )}
      </div>

      {/* Edit dialog */}
      <Dialog open={editingId !== null} onOpenChange={(open) => { if (!open) setEditingId(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Modifier le jalon</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div>
              <Label>Nom *</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} />
            </div>
            <div>
              <Label>Date planifiée *</Label>
              <Input type="date" value={plannedDate} onChange={(e) => setPlannedDate(e.target.value)} />
            </div>
            <div>
              <Label>Niveau d'impact</Label>
              <Select value={impactLevel} onValueChange={setImpactLevel}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Faible</SelectItem>
                  <SelectItem value="medium">Moyen</SelectItem>
                  <SelectItem value="high">Élevé</SelectItem>
                  <SelectItem value="critical">Critique</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleUpdate} disabled={updateMutation.isPending} className="w-full">
              {updateMutation.isPending ? "Mise à jour..." : "Mettre à jour"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
