import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { useErpPermissions } from "@/hooks/useErpPermissions";
import {
  ClipboardCheck, Search, CheckCircle, XCircle, Clock, AlertTriangle,
  Plus, Trash2, TrendingUp, AlertOctagon, Calendar, Eye
} from "lucide-react";

const CATEGORIES = [
  { value: "general", label: "Général" },
  { value: "securite", label: "Sécurité" },
  { value: "environnement", label: "Environnement" },
  { value: "urbanisme", label: "Urbanisme" },
  { value: "accessibilite", label: "Accessibilité" },
  { value: "incendie", label: "Incendie" },
  { value: "sanitaire", label: "Sanitaire" },
  { value: "electrique", label: "Électrique" },
  { value: "autre", label: "Autre" },
] as const;

const PRIORITIES = [
  { value: "low", label: "Basse", color: "bg-slate-100 text-slate-700" },
  { value: "medium", label: "Moyenne", color: "bg-blue-100 text-blue-700" },
  { value: "high", label: "Haute", color: "bg-orange-100 text-orange-700" },
  { value: "critical", label: "Critique", color: "bg-red-100 text-red-700" },
] as const;

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  pending: { label: "En attente", color: "bg-yellow-100 text-yellow-800" },
  in_progress: { label: "En cours", color: "bg-blue-100 text-blue-800" },
  completed: { label: "Conforme", color: "bg-green-100 text-green-800" },
  non_compliant: { label: "Non conforme", color: "bg-red-100 text-red-800" },
  waived: { label: "Dispensé", color: "bg-gray-100 text-gray-800" },
};

const CHECK_STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  pending: { label: "En attente", color: "bg-yellow-100 text-yellow-800" },
  passed: { label: "Réussi", color: "bg-green-100 text-green-800" },
  failed: { label: "Échoué", color: "bg-red-100 text-red-800" },
  partial: { label: "Partiel", color: "bg-orange-100 text-orange-800" },
  not_applicable: { label: "N/A", color: "bg-gray-100 text-gray-800" },
};

export default function ErpCompliance() {
  const { hasPermission } = useErpPermissions();
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [page, setPage] = useState(0);
  const [createOpen, setCreateOpen] = useState(false);
  const [detailId, setDetailId] = useState<number | null>(null);
  const [checkOpen, setCheckOpen] = useState<number | null>(null);
  const limit = 15;

  const utils = trpc.useUtils();

  const { data, isLoading } = trpc.erp.compliance.listRequirements.useQuery({
    limit,
    offset: page * limit,
    search: search || undefined,
    category: categoryFilter !== "all" ? categoryFilter as any : undefined,
    priority: priorityFilter !== "all" ? priorityFilter as any : undefined,
    status: statusFilter !== "all" ? statusFilter as any : undefined,
  });

  const { data: stats } = trpc.erp.compliance.stats.useQuery();
  const { data: expiredReqs } = trpc.erp.compliance.expiredRequirements.useQuery();
  const { data: upcomingReqs } = trpc.erp.compliance.upcomingRequirements.useQuery({ daysAhead: 30 });
  const { data: detail } = trpc.erp.compliance.getRequirement.useQuery(
    { id: detailId! },
    { enabled: !!detailId }
  );

  const createMutation = trpc.erp.compliance.createRequirement.useMutation({
    onSuccess: () => {
      toast.success("Exigence créée avec succès");
      setCreateOpen(false);
      utils.erp.compliance.listRequirements.invalidate();
      utils.erp.compliance.stats.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const deleteMutation = trpc.erp.compliance.deleteRequirement.useMutation({
    onSuccess: () => {
      toast.success("Exigence supprimée");
      utils.erp.compliance.listRequirements.invalidate();
      utils.erp.compliance.stats.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const addCheckMutation = trpc.erp.compliance.addCheck.useMutation({
    onSuccess: () => {
      toast.success("Vérification ajoutée");
      setCheckOpen(null);
      utils.erp.compliance.listRequirements.invalidate();
      utils.erp.compliance.getRequirement.invalidate();
      utils.erp.compliance.stats.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ClipboardCheck className="h-6 w-6 text-emerald-600" />
            Conformité
          </h1>
          <p className="text-muted-foreground mt-1">
            Suivi des exigences réglementaires et vérifications de conformité
          </p>
        </div>
        {hasPermission("erp_compliance", "create") && (
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4 mr-2" />Nouvelle exigence</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Créer une exigence de conformité</DialogTitle>
              </DialogHeader>
              <CreateRequirementForm
                onSubmit={(values) => createMutation.mutate(values)}
                isLoading={createMutation.isPending}
              />
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* KPI Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card>
            <CardContent className="py-3 text-center">
              <div className="text-2xl font-bold">{stats.total}</div>
              <div className="text-xs text-muted-foreground">Total exigences</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="py-3 text-center">
              <div className="text-2xl font-bold text-green-600">{stats.completed}</div>
              <div className="text-xs text-muted-foreground">Conformes</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="py-3 text-center">
              <div className="text-2xl font-bold text-red-600">{stats.nonCompliant}</div>
              <div className="text-xs text-muted-foreground">Non conformes</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="py-3 text-center">
              <div className="text-2xl font-bold text-orange-600">{stats.expired}</div>
              <div className="text-xs text-muted-foreground">En retard</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="py-3 text-center">
              <div className="text-2xl font-bold text-emerald-600">{stats.complianceRate}%</div>
              <div className="text-xs text-muted-foreground">Taux conformité</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Alertes */}
      {expiredReqs && expiredReqs.length > 0 && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="py-3 flex items-center gap-3">
            <AlertOctagon className="h-5 w-5 text-red-600" />
            <span className="text-sm font-medium text-red-800">
              {expiredReqs.length} exigence(s) en retard (date limite dépassée)
            </span>
          </CardContent>
        </Card>
      )}
      {upcomingReqs && upcomingReqs.length > 0 && (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="py-3 flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-600" />
            <span className="text-sm font-medium text-amber-800">
              {upcomingReqs.length} exigence(s) à traiter dans les 30 prochains jours
            </span>
          </CardContent>
        </Card>
      )}

      {/* Filtres */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher une exigence..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(0); }}
            className="pl-9"
          />
        </div>
        <Select value={categoryFilter} onValueChange={(v) => { setCategoryFilter(v); setPage(0); }}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Catégorie" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes catégories</SelectItem>
            {CATEGORIES.map(c => (
              <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={priorityFilter} onValueChange={(v) => { setPriorityFilter(v); setPage(0); }}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Priorité" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes priorités</SelectItem>
            {PRIORITIES.map(p => (
              <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(0); }}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Statut" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les statuts</SelectItem>
            <SelectItem value="pending">En attente</SelectItem>
            <SelectItem value="in_progress">En cours</SelectItem>
            <SelectItem value="completed">Conforme</SelectItem>
            <SelectItem value="non_compliant">Non conforme</SelectItem>
            <SelectItem value="waived">Dispensé</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">Chargement...</div>
      ) : items.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <ClipboardCheck className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p>Aucune exigence trouvée</p>
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left p-3 font-medium">Exigence</th>
                <th className="text-left p-3 font-medium">Catégorie</th>
                <th className="text-left p-3 font-medium">Priorité</th>
                <th className="text-left p-3 font-medium">Statut</th>
                <th className="text-left p-3 font-medium">Échéance</th>
                <th className="text-right p-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {items.map((req) => {
                const st = STATUS_CONFIG[req.status] || STATUS_CONFIG.pending;
                const pr = PRIORITIES.find(p => p.value === req.priority);
                const isOverdue = req.dueDate && req.dueDate < Date.now() && req.status !== "completed" && req.status !== "waived";
                return (
                  <tr key={req.id} className={`hover:bg-muted/30 ${isOverdue ? "bg-red-50/50" : ""}`}>
                    <td className="p-3">
                      <div className="font-medium">{req.title}</div>
                      {req.description && (
                        <div className="text-xs text-muted-foreground line-clamp-1">{req.description}</div>
                      )}
                    </td>
                    <td className="p-3">
                      <Badge variant="outline" className="text-xs">
                        {CATEGORIES.find(c => c.value === req.category)?.label || req.category}
                      </Badge>
                    </td>
                    <td className="p-3">
                      <Badge className={`${pr?.color || "bg-gray-100 text-gray-700"} text-xs`}>
                        {pr?.label || req.priority}
                      </Badge>
                    </td>
                    <td className="p-3">
                      <Badge className={`${st.color} text-xs`}>
                        {st.label}
                      </Badge>
                    </td>
                    <td className="p-3">
                      {req.dueDate ? (
                        <div className={`flex items-center gap-1 text-xs ${isOverdue ? "text-red-600 font-medium" : "text-muted-foreground"}`}>
                          {isOverdue && <AlertTriangle className="h-3 w-3" />}
                          <Calendar className="h-3 w-3" />
                          {new Date(req.dueDate).toLocaleDateString("fr-FR")}
                        </div>
                      ) : "—"}
                    </td>
                    <td className="p-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => setDetailId(req.id)} title="Détails">
                          <Eye className="h-4 w-4" />
                        </Button>
                        {hasPermission("erp_compliance", "approve") && (
                          <Button variant="ghost" size="icon" onClick={() => setCheckOpen(req.id)} title="Vérifier">
                            <CheckCircle className="h-4 w-4 text-green-600" />
                          </Button>
                        )}
                        {hasPermission("erp_compliance", "delete") && (
                          <Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate({ id: req.id })} title="Supprimer">
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">
            {total} exigence(s) — Page {page + 1}/{totalPages}
          </span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(p => p - 1)}>
              Précédent
            </Button>
            <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>
              Suivant
            </Button>
          </div>
        </div>
      )}

      {/* Dialog Détail */}
      <Dialog open={!!detailId} onOpenChange={(open) => { if (!open) setDetailId(null); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Détail de l'exigence</DialogTitle>
          </DialogHeader>
          {detail ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-muted-foreground">Titre :</span> <strong>{detail.title}</strong></div>
                <div><span className="text-muted-foreground">Catégorie :</span> {CATEGORIES.find(c => c.value === detail.category)?.label}</div>
                <div><span className="text-muted-foreground">Priorité :</span> {PRIORITIES.find(p => p.value === detail.priority)?.label}</div>
                <div><span className="text-muted-foreground">Statut :</span> <Badge className={STATUS_CONFIG[detail.status]?.color}>{STATUS_CONFIG[detail.status]?.label}</Badge></div>
                {detail.description && (
                  <div className="col-span-2"><span className="text-muted-foreground">Description :</span> {detail.description}</div>
                )}
                {detail.dueDate && (
                  <div className="col-span-2"><span className="text-muted-foreground">Échéance :</span> {new Date(detail.dueDate).toLocaleDateString("fr-FR")}</div>
                )}
              </div>
              {detail.checks && detail.checks.length > 0 && (
                <div>
                  <h4 className="font-medium mb-2">Vérifications ({detail.checks.length})</h4>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {detail.checks.map((check: any) => {
                      const cs = CHECK_STATUS_CONFIG[check.status] || CHECK_STATUS_CONFIG.pending;
                      return (
                        <div key={check.id} className="border rounded p-2 text-xs">
                          <div className="flex items-center justify-between">
                            <Badge className={`${cs.color} text-xs`}>{cs.label}</Badge>
                            <span className="text-muted-foreground">{check.checkedAt ? new Date(check.checkedAt).toLocaleDateString("fr-FR") : "—"}</span>
                          </div>
                          {check.comment && <p className="mt-1 text-muted-foreground">{check.comment}</p>}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-4 text-muted-foreground">Chargement...</div>
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog Vérification */}
      <Dialog open={!!checkOpen} onOpenChange={(open) => { if (!open) setCheckOpen(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ajouter une vérification</DialogTitle>
          </DialogHeader>
          <AddCheckForm
            onSubmit={(values) => checkOpen && addCheckMutation.mutate({ requirementId: checkOpen, ...values })}
            isLoading={addCheckMutation.isPending}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ---- Sous-composant formulaire création ----
function CreateRequirementForm({ onSubmit, isLoading }: { onSubmit: (v: any) => void; isLoading: boolean }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("general");
  const [priority, setPriority] = useState("medium");

  return (
    <div className="space-y-4">
      <div>
        <Label>Titre *</Label>
        <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Intitulé de l'exigence" />
      </div>
      <div>
        <Label>Description</Label>
        <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Description détaillée" rows={2} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Catégorie</Label>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {CATEGORIES.map(c => (
                <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Priorité</Label>
          <Select value={priority} onValueChange={setPriority}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {PRIORITIES.map(p => (
                <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <DialogFooter>
        <Button disabled={!title.trim() || isLoading} onClick={() => onSubmit({
          title,
          description: description || undefined,
          category: category as any,
          priority: priority as any,
        })}>
          {isLoading ? "Création..." : "Créer"}
        </Button>
      </DialogFooter>
    </div>
  );
}

// ---- Sous-composant formulaire vérification ----
function AddCheckForm({ onSubmit, isLoading }: { onSubmit: (v: any) => void; isLoading: boolean }) {
  const [status, setStatus] = useState("passed");
  const [comment, setComment] = useState("");

  return (
    <div className="space-y-4">
      <div>
        <Label>Résultat *</Label>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="passed">Réussi (conforme)</SelectItem>
            <SelectItem value="failed">Échoué (non conforme)</SelectItem>
            <SelectItem value="partial">Partiel</SelectItem>
            <SelectItem value="not_applicable">Non applicable</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label>Commentaire</Label>
        <Textarea value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Observations..." rows={3} />
      </div>
      <DialogFooter>
        <Button disabled={isLoading} onClick={() => onSubmit({
          status: status as any,
          comment: comment || undefined,
        })}>
          {isLoading ? "Enregistrement..." : "Enregistrer"}
        </Button>
      </DialogFooter>
    </div>
  );
}
