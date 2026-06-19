import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useErpPermissions } from "@/hooks/useErpPermissions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Truck, Plus, Check, X, Eye, Search } from "lucide-react";

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-gray-100 text-gray-800",
  submitted: "bg-blue-100 text-blue-800",
  approved: "bg-green-100 text-green-800",
  partially_fulfilled: "bg-yellow-100 text-yellow-800",
  fulfilled: "bg-emerald-100 text-emerald-800",
  rejected: "bg-red-100 text-red-800",
  cancelled: "bg-gray-200 text-gray-600",
};

const STATUS_LABELS: Record<string, string> = {
  draft: "Brouillon",
  submitted: "Soumise",
  approved: "Approuvée",
  partially_fulfilled: "Partiellement livrée",
  fulfilled: "Livrée",
  rejected: "Rejetée",
  cancelled: "Annulée",
};

const PRIORITY_COLORS: Record<string, string> = {
  low: "bg-gray-100 text-gray-700",
  medium: "bg-blue-100 text-blue-700",
  high: "bg-orange-100 text-orange-700",
  urgent: "bg-red-100 text-red-700",
};

const PRIORITY_LABELS: Record<string, string> = {
  low: "Basse",
  medium: "Moyenne",
  high: "Haute",
  urgent: "Urgente",
};

export default function ErpMaterialRequests() {
  const { hasPermission } = useErpPermissions();
  const canView = hasPermission("inventory", "view");
  const canCreate = hasPermission("inventory", "create");
  const canEdit = hasPermission("inventory", "edit");
  const canApprove = hasPermission("inventory", "approve");

  const [tab, setTab] = useState("all");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [selectedRequestId, setSelectedRequestId] = useState<number | null>(null);

  // Queries
  const requestsQuery = trpc.erp.materialRequests.list.useQuery({
    search: search || undefined,
    status: statusFilter || undefined,
    limit: 50,
    offset: 0,
  });
  const statsQuery = trpc.erp.materialRequests.stats.useQuery();
  const detailQuery = trpc.erp.materialRequests.getById.useQuery(
    { id: selectedRequestId! },
    { enabled: !!selectedRequestId }
  );

  // Projects list for assignment
  const projectsQuery = trpc.erp.projects.list.useQuery({ limit: 100, offset: 0 });
  const itemsQuery = trpc.erp.inventory.listItems.useQuery({ limit: 100, offset: 0 });

  // Mutations
  const createRequest = trpc.erp.materialRequests.create.useMutation({
    onSuccess: () => { toast.success("Demande créée"); setShowCreateDialog(false); requestsQuery.refetch(); statsQuery.refetch(); },
    onError: (e) => toast.error(e.message),
  });
  const submitRequest = trpc.erp.materialRequests.submit.useMutation({
    onSuccess: () => { toast.success("Demande soumise"); requestsQuery.refetch(); statsQuery.refetch(); detailQuery.refetch(); },
    onError: (e) => toast.error(e.message),
  });
  const approveRequest = trpc.erp.materialRequests.approve.useMutation({
    onSuccess: () => { toast.success("Demande approuvée"); requestsQuery.refetch(); statsQuery.refetch(); detailQuery.refetch(); },
    onError: (e) => toast.error(e.message),
  });
  const rejectRequest = trpc.erp.materialRequests.reject.useMutation({
    onSuccess: () => { toast.success("Demande rejetée"); requestsQuery.refetch(); statsQuery.refetch(); detailQuery.refetch(); },
    onError: (e) => toast.error(e.message),
  });
  const fulfillRequest = trpc.erp.materialRequests.fulfill.useMutation({
    onSuccess: () => { toast.success("Demande livrée — stock mis à jour"); requestsQuery.refetch(); statsQuery.refetch(); detailQuery.refetch(); },
    onError: (e) => toast.error(e.message),
  });

  // Form state
  const [requestForm, setRequestForm] = useState({
    projectId: 0,
    title: "",
    priority: "medium",
    description: "",
    lines: [{ itemId: 0, quantityRequested: 1, notes: "" }],
  });

  const addLine = () => setRequestForm({ ...requestForm, lines: [...requestForm.lines, { itemId: 0, quantityRequested: 1, notes: "" }] });
  const removeLine = (idx: number) => setRequestForm({ ...requestForm, lines: requestForm.lines.filter((_, i) => i !== idx) });
  const updateLine = (idx: number, field: string, value: any) => {
    const lines = [...requestForm.lines];
    (lines[idx] as any)[field] = value;
    setRequestForm({ ...requestForm, lines });
  };

  if (!canView) return <div className="p-6 text-center text-muted-foreground">Accès non autorisé</div>;

  const stats = statsQuery.data;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Truck className="h-6 w-6 text-primary" />
            Demandes de matériel
          </h1>
          <p className="text-muted-foreground">Gestion des demandes d'approvisionnement</p>
        </div>
        {canCreate && (
          <Button size="sm" onClick={() => setShowCreateDialog(true)}>
            <Plus className="h-4 w-4 mr-1" /> Nouvelle demande
          </Button>
        )}
      </div>

      {/* KPI */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <Card><CardContent className="p-3 text-center"><p className="text-xs text-muted-foreground">Total</p><p className="text-xl font-bold">{stats.total}</p></CardContent></Card>
          <Card className="border-blue-200"><CardContent className="p-3 text-center"><p className="text-xs text-muted-foreground">En attente</p><p className="text-xl font-bold text-blue-600">{stats.pending}</p></CardContent></Card>
          <Card className="border-green-200"><CardContent className="p-3 text-center"><p className="text-xs text-muted-foreground">Approuvées</p><p className="text-xl font-bold text-green-600">{stats.approved}</p></CardContent></Card>
          <Card className="border-emerald-200"><CardContent className="p-3 text-center"><p className="text-xs text-muted-foreground">Livrées</p><p className="text-xl font-bold text-emerald-600">{stats.fulfilled}</p></CardContent></Card>
          <Card className="border-red-200"><CardContent className="p-3 text-center"><p className="text-xs text-muted-foreground">Rejetées</p><p className="text-xl font-bold text-red-600">{stats.rejected}</p></CardContent></Card>
        </div>
      )}

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="all">Toutes</TabsTrigger>
          <TabsTrigger value="pending">
            En attente
            {stats && stats.pending > 0 && (
              <Badge variant="secondary" className="ml-1 text-xs">{stats.pending}</Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4">
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Rechercher..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-48"><SelectValue placeholder="Statut" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous</SelectItem>
                {Object.entries(STATUS_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left p-3">Réf.</th>
                  <th className="text-left p-3">Titre</th>
                  <th className="text-left p-3">Priorité</th>
                  <th className="text-left p-3">Statut</th>
                  <th className="text-left p-3">Créée le</th>
                  <th className="text-center p-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {requestsQuery.data?.requests.map(req => (
                  <tr key={req.id} className="border-t hover:bg-muted/30">
                    <td className="p-3 font-mono text-xs">{req.requestNumber}</td>
                    <td className="p-3 font-medium">{req.title}</td>
                    <td className="p-3"><Badge className={PRIORITY_COLORS[req.priority]}>{PRIORITY_LABELS[req.priority]}</Badge></td>
                    <td className="p-3"><Badge className={STATUS_COLORS[req.status]}>{STATUS_LABELS[req.status]}</Badge></td>
                    <td className="p-3 text-xs">{new Date(req.createdAt).toLocaleDateString("fr-FR")}</td>
                    <td className="p-3 text-center">
                      <Button variant="ghost" size="sm" onClick={() => { setSelectedRequestId(req.id); setShowDetailDialog(true); }}>
                        <Eye className="h-3 w-3" />
                      </Button>
                    </td>
                  </tr>
                ))}
                {requestsQuery.data?.requests.length === 0 && (
                  <tr><td colSpan={6} className="p-6 text-center text-muted-foreground">Aucune demande trouvée</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </TabsContent>

        <TabsContent value="pending" className="space-y-4">
          <div className="border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-blue-50">
                <tr>
                  <th className="text-left p-3">Réf.</th>
                  <th className="text-left p-3">Titre</th>
                  <th className="text-left p-3">Priorité</th>
                  <th className="text-left p-3">Créée le</th>
                  <th className="text-center p-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {requestsQuery.data?.requests.filter(r => r.status === "submitted").map(req => (
                  <tr key={req.id} className="border-t">
                    <td className="p-3 font-mono text-xs">{req.requestNumber}</td>
                    <td className="p-3 font-medium">{req.title}</td>
                    <td className="p-3"><Badge className={PRIORITY_COLORS[req.priority]}>{PRIORITY_LABELS[req.priority]}</Badge></td>
                    <td className="p-3 text-xs">{new Date(req.createdAt).toLocaleDateString("fr-FR")}</td>
                    <td className="p-3 text-center flex gap-1 justify-center">
                      {canApprove && (
                        <>
                          <Button variant="outline" size="sm" className="text-green-600" onClick={() => approveRequest.mutate({ id: req.id })}>
                            <Check className="h-3 w-3 mr-1" /> Approuver
                          </Button>
                          <Button variant="outline" size="sm" className="text-red-600" onClick={() => rejectRequest.mutate({ id: req.id, reason: "Non justifié" })}>
                            <X className="h-3 w-3 mr-1" /> Rejeter
                          </Button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
                {requestsQuery.data?.requests.filter(r => r.status === "submitted").length === 0 && (
                  <tr><td colSpan={5} className="p-6 text-center text-muted-foreground">Aucune demande en attente</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </TabsContent>
      </Tabs>

      {/* Dialog: Détail demande */}
      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Détail demande {detailQuery.data?.requestNumber}</DialogTitle></DialogHeader>
          {detailQuery.data && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><span className="text-xs text-muted-foreground">Titre</span><p className="font-medium">{detailQuery.data.title}</p></div>
                <div><span className="text-xs text-muted-foreground">Statut</span><p><Badge className={STATUS_COLORS[detailQuery.data.status]}>{STATUS_LABELS[detailQuery.data.status]}</Badge></p></div>
                <div><span className="text-xs text-muted-foreground">Priorité</span><p><Badge className={PRIORITY_COLORS[detailQuery.data.priority]}>{PRIORITY_LABELS[detailQuery.data.priority]}</Badge></p></div>
                <div><span className="text-xs text-muted-foreground">Créée le</span><p>{new Date(detailQuery.data.createdAt).toLocaleDateString("fr-FR")}</p></div>
              </div>
              {detailQuery.data.description && <div><span className="text-xs text-muted-foreground">Description</span><p className="text-sm">{detailQuery.data.description}</p></div>}
              
              <div>
                <h4 className="font-medium mb-2">Lignes ({detailQuery.data.lines?.length || 0})</h4>
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="text-left p-2">Article</th>
                        <th className="text-right p-2">Qté demandée</th>
                        <th className="text-right p-2">Qté livrée</th>
                      </tr>
                    </thead>
                    <tbody>
                      {detailQuery.data.lines?.map((line) => (
                        <tr key={line.id} className="border-t">
                          <td className="p-2">{line.item?.name || `Item #${line.itemId}`}</td>
                          <td className="p-2 text-right">{line.quantityRequested}</td>
                          <td className="p-2 text-right">{line.quantityFulfilled || 0}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2 justify-end">
                {detailQuery.data.status === "draft" && canEdit && (
                  <Button size="sm" onClick={() => submitRequest.mutate({ id: detailQuery.data!.id })}>Soumettre</Button>
                )}
                {detailQuery.data.status === "submitted" && canApprove && (
                  <>
                    <Button size="sm" variant="outline" className="text-green-600" onClick={() => approveRequest.mutate({ id: detailQuery.data!.id })}>Approuver</Button>
                    <Button size="sm" variant="outline" className="text-red-600" onClick={() => rejectRequest.mutate({ id: detailQuery.data!.id, reason: "Non justifié" })}>Rejeter</Button>
                  </>
                )}
                {detailQuery.data.status === "approved" && canEdit && (
                  <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" onClick={() => {
                    const lines = detailQuery.data!.lines.map(l => ({ lineId: l.id, quantityToFulfill: l.quantityRequested - l.quantityFulfilled }));
                    fulfillRequest.mutate({ id: detailQuery.data!.id, lines });
                  }}>Marquer livrée</Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog: Créer demande */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Nouvelle demande de matériel</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium">Titre *</label>
                <Input value={requestForm.title} onChange={(e) => setRequestForm({ ...requestForm, title: e.target.value })} placeholder="Approvisionnement chantier X" />
              </div>
              <div>
                <label className="text-xs font-medium">Projet</label>
                <Select value={String(requestForm.projectId || "")} onValueChange={(v) => setRequestForm({ ...requestForm, projectId: Number(v) })}>
                  <SelectTrigger><SelectValue placeholder="Sélectionner" /></SelectTrigger>
                  <SelectContent>
                    {projectsQuery.data?.projects.map(p => <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium">Priorité</label>
                <Select value={requestForm.priority} onValueChange={(v) => setRequestForm({ ...requestForm, priority: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(PRIORITY_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs font-medium">Description</label>
                <Input value={requestForm.description} onChange={(e) => setRequestForm({ ...requestForm, description: e.target.value })} placeholder="Optionnel" />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium">Lignes de matériel</label>
                <Button variant="outline" size="sm" onClick={addLine}><Plus className="h-3 w-3 mr-1" /> Ajouter</Button>
              </div>
              <div className="space-y-2">
                {requestForm.lines.map((line, idx) => (
                  <div key={idx} className="flex gap-2 items-center">
                    <Select value={String(line.itemId || "")} onValueChange={(v) => updateLine(idx, "itemId", Number(v))}>
                      <SelectTrigger className="flex-1"><SelectValue placeholder="Article" /></SelectTrigger>
                      <SelectContent>
                        {itemsQuery.data?.items.map(item => <SelectItem key={item.id} value={String(item.id)}>{item.name} ({item.sku})</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <Input type="number" min={1} className="w-24" value={line.quantityRequested} onChange={(e) => updateLine(idx, "quantityRequested", Number(e.target.value))} placeholder="Qté" />
                    {requestForm.lines.length > 1 && (
                      <Button variant="ghost" size="sm" onClick={() => removeLine(idx)}><X className="h-3 w-3" /></Button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>Annuler</Button>
            <Button onClick={() => {
              const lines = requestForm.lines.filter(l => l.itemId > 0 && l.quantityRequested > 0);
              if (!lines.length) { toast.error("Ajoutez au moins une ligne"); return; }
              createRequest.mutate({
                projectId: requestForm.projectId || undefined,
                title: requestForm.title,
                priority: requestForm.priority as any,
                description: requestForm.description || undefined,
                lines,
              });
            }} disabled={createRequest.isPending || !requestForm.title}>
              {createRequest.isPending ? "Création..." : "Créer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
