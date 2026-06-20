import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { useErpPermissions } from "@/hooks/useErpPermissions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Trash2, Plus, BarChart3, AlertTriangle, TrendingDown } from "lucide-react";

const WASTAGE_CAUSES = [
  { value: "breakage", label: "Casse" },
  { value: "theft", label: "Vol" },
  { value: "bad_estimate", label: "Mauvaise estimation" },
  { value: "order_error", label: "Erreur de commande" },
  { value: "poor_storage", label: "Mauvais stockage" },
  { value: "supplier_defect", label: "Défaut fournisseur" },
  { value: "other", label: "Autre" },
];

const CAUSE_COLORS: Record<string, string> = {
  breakage: "bg-red-100 text-red-800",
  theft: "bg-purple-100 text-purple-800",
  bad_estimate: "bg-yellow-100 text-yellow-800",
  order_error: "bg-orange-100 text-orange-800",
  poor_storage: "bg-blue-100 text-blue-800",
  supplier_defect: "bg-pink-100 text-pink-800",
  other: "bg-gray-100 text-gray-700",
};

function formatXOF(amount: number) {
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "XOF", maximumFractionDigits: 0 }).format(amount);
}

export default function ErpWastage() {
  const { hasPermission } = useErpPermissions();
  const canView = hasPermission("erp_inventory", "view");
  const canCreate = hasPermission("erp_inventory", "create");
  const canEdit = hasPermission("erp_inventory", "update");
  const canDelete = hasPermission("erp_inventory", "delete");

  const [tab, setTab] = useState("list");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [projectFilter, setProjectFilter] = useState<string>("");
  const [causeFilter, setCauseFilter] = useState<string>("");
  const [analysisGroupBy, setAnalysisGroupBy] = useState<"project" | "item" | "cause">("cause");

  const utils = trpc.useUtils();

  // Queries
  const listQuery = trpc.erp.wastage.list.useQuery({
    projectId: projectFilter ? Number(projectFilter) : undefined,
    cause: causeFilter ? (causeFilter as any) : undefined,
    limit: 100,
    offset: 0,
  });
  const statsQuery = trpc.erp.wastage.stats.useQuery({});
  const analysisQuery = trpc.erp.wastage.analysis.useQuery({ groupBy: analysisGroupBy });
  const projectsQuery = trpc.erp.projects.list.useQuery({ limit: 100, offset: 0 });
  const itemsQuery = trpc.erp.inventory.listItems.useQuery({ limit: 100, offset: 0 });

  // Mutations
  const createWastage = trpc.erp.wastage.create.useMutation({
    onSuccess: () => { toast.success("Perte enregistrée"); setShowCreateDialog(false); listQuery.refetch(); statsQuery.refetch(); analysisQuery.refetch(); },
    onError: (e) => toast.error(e.message),
  });
  const deleteWastage = trpc.erp.wastage.delete.useMutation({
    onSuccess: () => { toast.success("Enregistrement supprimé"); listQuery.refetch(); statsQuery.refetch(); analysisQuery.refetch(); },
    onError: (e) => toast.error(e.message),
  });

  // Form state
  const [form, setForm] = useState({
    projectId: 0,
    itemId: 0,
    quantity: 1,
    unitCost: 0,
    wastagePercentage: 0,
    cause: "breakage" as string,
    description: "",
    correctiveAction: "",
  });

  // Maps
  const projectMap = useMemo(() => {
    const map = new Map<number, string>();
    (projectsQuery.data?.projects || []).forEach((p: any) => map.set(p.id, p.name));
    return map;
  }, [projectsQuery.data]);

  const itemMap = useMemo(() => {
    const map = new Map<number, string>();
    (itemsQuery.data?.items || []).forEach((i: any) => map.set(i.id, i.name));
    return map;
  }, [itemsQuery.data]);

  if (!canView) return <div className="p-6 text-center text-muted-foreground">Accès non autorisé</div>;

  const stats = statsQuery.data;
  const records = listQuery.data?.items || [];
  const analysis = analysisQuery.data || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Trash2 className="h-6 w-6 text-primary" />
            Analyse des Gaspillages
          </h1>
          <p className="text-muted-foreground">Suivi et analyse des pertes matérielles sur les chantiers</p>
        </div>
        {canCreate && (
          <Button size="sm" onClick={() => setShowCreateDialog(true)}>
            <Plus className="h-4 w-4 mr-1" /> Déclarer une perte
          </Button>
        )}
      </div>

      {/* KPI Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card><CardContent className="p-3 text-center"><p className="text-xs text-muted-foreground">Total pertes</p><p className="text-xl font-bold">{stats.totalRecords}</p></CardContent></Card>
          <Card className="border-red-200"><CardContent className="p-3 text-center"><p className="text-xs text-muted-foreground">Coût total</p><p className="text-xl font-bold text-red-600">{formatXOF(stats.totalCost)}</p></CardContent></Card>
          <Card className="border-orange-200"><CardContent className="p-3 text-center"><p className="text-xs text-muted-foreground">Quantité totale</p><p className="text-xl font-bold text-orange-600">{stats.totalQuantity}</p></CardContent></Card>
          <Card className="border-yellow-200"><CardContent className="p-3 text-center"><p className="text-xs text-muted-foreground">Taux moyen (%)</p><p className="text-xl font-bold text-yellow-600">{(stats.avgWastagePercent / 100).toFixed(1)}%</p></CardContent></Card>
        </div>
      )}

      {/* Top causes */}
      {stats && stats.topCauses && stats.topCauses.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-orange-500" />Principales causes de pertes</h3>
            <div className="flex flex-wrap gap-2">
              {stats.topCauses.map((c: any) => (
                <Badge key={c.cause} className={CAUSE_COLORS[c.cause] || "bg-gray-100"}>
                  {WASTAGE_CAUSES.find(w => w.value === c.cause)?.label || c.cause} — {formatXOF(c.totalCost)} ({c.count}x)
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabs */}
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="list">Registre</TabsTrigger>
          <TabsTrigger value="analysis">Analyse</TabsTrigger>
        </TabsList>

        {/* Tab: Liste */}
        <TabsContent value="list" className="space-y-4">
          <div className="flex gap-3 flex-wrap">
            <Select value={projectFilter} onValueChange={setProjectFilter}>
              <SelectTrigger className="w-48"><SelectValue placeholder="Projet" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les projets</SelectItem>
                {(projectsQuery.data?.projects || []).map((p: any) => (
                  <SelectItem key={p.id} value={p.id.toString()}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={causeFilter} onValueChange={setCauseFilter}>
              <SelectTrigger className="w-48"><SelectValue placeholder="Cause" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes les causes</SelectItem>
                {WASTAGE_CAUSES.map(c => (
                  <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {listQuery.isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Chargement...</div>
          ) : records.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">Aucune perte enregistrée</div>
          ) : (
            <div className="overflow-x-auto border rounded-lg">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left p-3 font-medium">Date</th>
                    <th className="text-left p-3 font-medium">Projet</th>
                    <th className="text-left p-3 font-medium">Article</th>
                    <th className="text-center p-3 font-medium">Quantité</th>
                    <th className="text-right p-3 font-medium">Coût total</th>
                    <th className="text-center p-3 font-medium">Cause</th>
                    <th className="text-right p-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {records.map((r: any) => (
                    <tr key={r.id} className="border-t hover:bg-muted/30">
                      <td className="p-3 text-xs">{new Date(r.recordedAt).toLocaleDateString("fr-FR")}</td>
                      <td className="p-3">{r.projectId ? (projectMap.get(r.projectId) || `#${r.projectId}`) : "-"}</td>
                      <td className="p-3">{itemMap.get(r.itemId) || `#${r.itemId}`}</td>
                      <td className="p-3 text-center">{r.quantity}</td>
                      <td className="p-3 text-right font-mono text-red-600">{formatXOF(r.totalCost)}</td>
                      <td className="p-3 text-center">
                        <Badge className={CAUSE_COLORS[r.cause] || ""}>
                          {WASTAGE_CAUSES.find(c => c.value === r.cause)?.label || r.cause}
                        </Badge>
                      </td>
                      <td className="p-3 text-right">
                        {canDelete && (
                          <Button variant="ghost" size="sm" className="text-red-600" onClick={() => deleteWastage.mutate({ id: r.id })}>
                            Suppr.
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>

        {/* Tab: Analyse */}
        <TabsContent value="analysis" className="space-y-4">
          <div className="flex items-center gap-3">
            <Label>Regrouper par :</Label>
            <Select value={analysisGroupBy} onValueChange={(v: any) => setAnalysisGroupBy(v)}>
              <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="cause">Cause</SelectItem>
                <SelectItem value="project">Projet</SelectItem>
                <SelectItem value="item">Article</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {analysisQuery.isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Chargement...</div>
          ) : analysis.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <BarChart3 className="h-8 w-8 mx-auto mb-2 opacity-50" />
              Aucune donnée d'analyse disponible
            </div>
          ) : (
            <div className="overflow-x-auto border rounded-lg">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left p-3 font-medium">
                      {analysisGroupBy === "cause" ? "Cause" : analysisGroupBy === "project" ? "Projet" : "Article"}
                    </th>
                    <th className="text-center p-3 font-medium">Nb enregistrements</th>
                    <th className="text-center p-3 font-medium">Quantité totale</th>
                    <th className="text-right p-3 font-medium">Coût total</th>
                    <th className="text-center p-3 font-medium">Taux moyen</th>
                  </tr>
                </thead>
                <tbody>
                  {analysis.map((row: any, idx: number) => {
                    let label = String(row.groupKey || "N/A");
                    if (analysisGroupBy === "cause") {
                      label = WASTAGE_CAUSES.find(c => c.value === row.groupKey)?.label || label;
                    } else if (analysisGroupBy === "project") {
                      label = projectMap.get(Number(row.groupKey)) || `Projet #${row.groupKey}`;
                    } else if (analysisGroupBy === "item") {
                      label = itemMap.get(Number(row.groupKey)) || `Article #${row.groupKey}`;
                    }
                    return (
                      <tr key={idx} className="border-t hover:bg-muted/30">
                        <td className="p-3 font-medium">{label}</td>
                        <td className="p-3 text-center">{row.recordCount}</td>
                        <td className="p-3 text-center">{row.totalQuantity}</td>
                        <td className="p-3 text-right font-mono text-red-600">{formatXOF(row.totalCost)}</td>
                        <td className="p-3 text-center">{(row.avgWastagePercent / 100).toFixed(1)}%</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Dialog: Déclarer une perte */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Déclarer une perte matérielle</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Projet (optionnel)</Label>
              <Select value={form.projectId ? form.projectId.toString() : ""} onValueChange={(v) => setForm({ ...form, projectId: Number(v) })}>
                <SelectTrigger><SelectValue placeholder="Sélectionner un projet" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Aucun projet</SelectItem>
                  {(projectsQuery.data?.projects || []).map((p: any) => (
                    <SelectItem key={p.id} value={p.id.toString()}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Article</Label>
              <Select value={form.itemId ? form.itemId.toString() : ""} onValueChange={(v) => setForm({ ...form, itemId: Number(v) })}>
                <SelectTrigger><SelectValue placeholder="Sélectionner un article" /></SelectTrigger>
                <SelectContent>
                  {(itemsQuery.data?.items || []).map((i: any) => (
                    <SelectItem key={i.id} value={i.id.toString()}>{i.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label>Quantité</Label>
                <Input type="number" min={1} value={form.quantity} onChange={(e) => setForm({ ...form, quantity: Number(e.target.value) })} />
              </div>
              <div>
                <Label>Coût unitaire (XOF)</Label>
                <Input type="number" min={0} value={form.unitCost} onChange={(e) => setForm({ ...form, unitCost: Number(e.target.value) })} />
              </div>
              <div>
                <Label>Taux gaspillage (%)</Label>
                <Input type="number" min={0} max={100} value={form.wastagePercentage / 100} onChange={(e) => setForm({ ...form, wastagePercentage: Math.round(Number(e.target.value) * 100) })} />
              </div>
            </div>
            <div>
              <Label>Cause</Label>
              <Select value={form.cause} onValueChange={(v) => setForm({ ...form, cause: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {WASTAGE_CAUSES.map(c => (
                    <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Description</Label>
              <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Détails de la perte..." />
            </div>
            <div>
              <Label>Action corrective</Label>
              <Textarea value={form.correctiveAction} onChange={(e) => setForm({ ...form, correctiveAction: e.target.value })} placeholder="Mesures prises ou à prendre..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>Annuler</Button>
            <Button
              onClick={() => createWastage.mutate({
                projectId: form.projectId || undefined,
                itemId: form.itemId,
                quantity: form.quantity,
                unitCost: form.unitCost,
                wastagePercentage: form.wastagePercentage,
                cause: form.cause as any,
                description: form.description || undefined,
                correctiveAction: form.correctiveAction || undefined,
              })}
              disabled={!form.itemId || form.quantity <= 0}
            >
              Enregistrer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
