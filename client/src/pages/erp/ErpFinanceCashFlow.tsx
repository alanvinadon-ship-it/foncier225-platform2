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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { ArrowDownCircle, ArrowUpCircle, Plus, TrendingUp, TrendingDown, Clock } from "lucide-react";

const TYPE_LABELS: Record<string, string> = { inflow: "Entrée", outflow: "Sortie" };
const CATEGORY_LABELS: Record<string, string> = {
  labour: "Main d'œuvre", materials: "Matériaux", equipment: "Équipement",
  subcontracting: "Sous-traitance", permits: "Permis", transport: "Transport",
  client_payment: "Paiement client", advance: "Avance", retention: "Retenue", other: "Autres",
};

function formatXOF(amount: number) {
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "XOF", maximumFractionDigits: 0 }).format(amount);
}

export default function ErpFinanceCashFlow() {
  const { hasPermission } = useErpPermissions();
  const canView = hasPermission("finance", "view");
  const canCreate = hasPermission("finance", "create");

  const [tab, setTab] = useState("list");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [typeFilter, setTypeFilter] = useState<string>("");
  const [projectFilter, setProjectFilter] = useState<string>("");

  const listQuery = trpc.erp.finance.cashFlow.list.useQuery({
    type: typeFilter && typeFilter !== "all" ? typeFilter as any : undefined,
    projectId: projectFilter && projectFilter !== "all" ? Number(projectFilter) : undefined,
    limit: 100,
    offset: 0,
  });
  const summaryQuery = trpc.erp.finance.cashFlow.summary.useQuery({
    projectId: projectFilter && projectFilter !== "all" ? Number(projectFilter) : undefined,
  });
  const forecastQuery = trpc.erp.finance.cashFlow.forecast.useQuery({ daysAhead: 30 });
  const projectsQuery = trpc.erp.projects.list.useQuery({ limit: 100, offset: 0 });

  const createFlow = trpc.erp.finance.cashFlow.create.useMutation({
    onSuccess: () => { toast.success("Flux enregistré"); setShowCreateDialog(false); listQuery.refetch(); summaryQuery.refetch(); forecastQuery.refetch(); },
    onError: (e) => toast.error(e.message),
  });

  const [form, setForm] = useState({
    projectId: 0,
    type: "outflow" as string,
    category: "materials" as string,
    amount: 0,
    description: "",
    flowDate: new Date().toISOString().split("T")[0],
    dueDate: "",
    isPaid: false,
  });

  const projectMap = useMemo(() => {
    const map = new Map<number, string>();
    (projectsQuery.data?.projects || []).forEach((p: any) => map.set(p.id, p.name));
    return map;
  }, [projectsQuery.data]);

  if (!canView) return <div className="p-6 text-center text-muted-foreground">Accès non autorisé</div>;

  const flows = listQuery.data?.items || [];
  const summary = summaryQuery.data;
  const forecast = forecastQuery.data;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <TrendingUp className="h-6 w-6 text-primary" />
            Trésorerie
          </h1>
          <p className="text-muted-foreground">Suivi des flux de trésorerie et prévisions</p>
        </div>
        {canCreate && (
          <Button size="sm" onClick={() => setShowCreateDialog(true)}>
            <Plus className="h-4 w-4 mr-1" /> Nouveau flux
          </Button>
        )}
      </div>

      {/* KPI Cards */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card className="border-green-200"><CardContent className="p-3 text-center"><p className="text-xs text-muted-foreground">Entrées totales</p><p className="text-lg font-bold text-green-600">{formatXOF(summary.totalInflow)}</p></CardContent></Card>
          <Card className="border-red-200"><CardContent className="p-3 text-center"><p className="text-xs text-muted-foreground">Sorties totales</p><p className="text-lg font-bold text-red-600">{formatXOF(summary.totalOutflow)}</p></CardContent></Card>
          <Card className={summary.netCashFlow >= 0 ? "border-green-200" : "border-red-200"}><CardContent className="p-3 text-center"><p className="text-xs text-muted-foreground">Flux net</p><p className={`text-lg font-bold ${summary.netCashFlow >= 0 ? "text-green-600" : "text-red-600"}`}>{formatXOF(summary.netCashFlow)}</p></CardContent></Card>
          <Card className="border-blue-200"><CardContent className="p-3 text-center"><p className="text-xs text-muted-foreground">Solde réel (payé)</p><p className="text-lg font-bold text-blue-600">{formatXOF(summary.balance)}</p></CardContent></Card>
        </div>
      )}

      {/* Tensions de trésorerie */}
      {summary && (summary.pendingInflow > 0 || summary.pendingOutflow > 0) && (
        <Card className="border-orange-200">
          <CardContent className="p-4">
            <h3 className="text-sm font-semibold mb-2 flex items-center gap-2"><Clock className="h-4 w-4 text-orange-500" />Tensions de trésorerie</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div><span className="text-muted-foreground">Entrées en attente :</span> <span className="font-mono text-green-600">{formatXOF(summary.pendingInflow)}</span></div>
              <div><span className="text-muted-foreground">Sorties en attente :</span> <span className="font-mono text-red-600">{formatXOF(summary.pendingOutflow)}</span></div>
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="list">Registre</TabsTrigger>
          <TabsTrigger value="forecast">Prévisions (30j)</TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="space-y-4">
          <div className="flex gap-3 flex-wrap">
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-40"><SelectValue placeholder="Type" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous</SelectItem>
                <SelectItem value="inflow">Entrées</SelectItem>
                <SelectItem value="outflow">Sorties</SelectItem>
              </SelectContent>
            </Select>
            <Select value={projectFilter} onValueChange={setProjectFilter}>
              <SelectTrigger className="w-48"><SelectValue placeholder="Projet" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les projets</SelectItem>
                {(projectsQuery.data?.projects || []).map((p: any) => (
                  <SelectItem key={p.id} value={p.id.toString()}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {listQuery.isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Chargement...</div>
          ) : flows.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">Aucun flux enregistré</div>
          ) : (
            <div className="overflow-x-auto border rounded-lg">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left p-3 font-medium">Date</th>
                    <th className="text-center p-3 font-medium">Type</th>
                    <th className="text-left p-3 font-medium">Catégorie</th>
                    <th className="text-left p-3 font-medium">Projet</th>
                    <th className="text-left p-3 font-medium">Description</th>
                    <th className="text-right p-3 font-medium">Montant</th>
                    <th className="text-center p-3 font-medium">Payé</th>
                  </tr>
                </thead>
                <tbody>
                  {flows.map((f: any) => (
                    <tr key={f.id} className="border-t hover:bg-muted/30">
                      <td className="p-3 text-xs">{new Date(f.flowDate).toLocaleDateString("fr-FR")}</td>
                      <td className="p-3 text-center">
                        {f.type === "inflow" ? <ArrowDownCircle className="h-4 w-4 text-green-500 inline" /> : <ArrowUpCircle className="h-4 w-4 text-red-500 inline" />}
                      </td>
                      <td className="p-3">{CATEGORY_LABELS[f.category] || f.category}</td>
                      <td className="p-3">{f.projectId ? (projectMap.get(f.projectId) || `#${f.projectId}`) : "-"}</td>
                      <td className="p-3 text-muted-foreground">{f.description || "-"}</td>
                      <td className={`p-3 text-right font-mono ${f.type === "inflow" ? "text-green-600" : "text-red-600"}`}>{formatXOF(f.amount)}</td>
                      <td className="p-3 text-center">
                        <Badge className={f.isPaid ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"}>
                          {f.isPaid ? "Oui" : "Non"}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>

        <TabsContent value="forecast" className="space-y-4">
          {forecast && (
            <>
              <div className="grid grid-cols-3 gap-3">
                <Card className="border-green-200"><CardContent className="p-3 text-center"><p className="text-xs text-muted-foreground">Entrées prévues</p><p className="font-bold text-green-600">{formatXOF(forecast.expectedInflow)}</p></CardContent></Card>
                <Card className="border-red-200"><CardContent className="p-3 text-center"><p className="text-xs text-muted-foreground">Sorties prévues</p><p className="font-bold text-red-600">{formatXOF(forecast.expectedOutflow)}</p></CardContent></Card>
                <Card className={forecast.netForecast >= 0 ? "border-green-200" : "border-red-200"}><CardContent className="p-3 text-center"><p className="text-xs text-muted-foreground">Net prévu</p><p className={`font-bold ${forecast.netForecast >= 0 ? "text-green-600" : "text-red-600"}`}>{formatXOF(forecast.netForecast)}</p></CardContent></Card>
              </div>
              {forecast.upcoming.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">Aucun paiement prévu dans les 30 prochains jours</div>
              ) : (
                <div className="overflow-x-auto border rounded-lg">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="text-left p-3 font-medium">Échéance</th>
                        <th className="text-center p-3 font-medium">Type</th>
                        <th className="text-left p-3 font-medium">Catégorie</th>
                        <th className="text-left p-3 font-medium">Description</th>
                        <th className="text-right p-3 font-medium">Montant</th>
                      </tr>
                    </thead>
                    <tbody>
                      {forecast.upcoming.map((f: any) => (
                        <tr key={f.id} className="border-t hover:bg-muted/30">
                          <td className="p-3 text-xs">{f.dueDate ? new Date(f.dueDate).toLocaleDateString("fr-FR") : "-"}</td>
                          <td className="p-3 text-center">
                            {f.type === "inflow" ? <ArrowDownCircle className="h-4 w-4 text-green-500 inline" /> : <ArrowUpCircle className="h-4 w-4 text-red-500 inline" />}
                          </td>
                          <td className="p-3">{CATEGORY_LABELS[f.category] || f.category}</td>
                          <td className="p-3 text-muted-foreground">{f.description || "-"}</td>
                          <td className={`p-3 text-right font-mono ${f.type === "inflow" ? "text-green-600" : "text-red-600"}`}>{formatXOF(f.amount)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </TabsContent>
      </Tabs>

      {/* Dialog: Nouveau flux */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Enregistrer un flux de trésorerie</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Type</Label>
              <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="inflow">Entrée (INFLOW)</SelectItem>
                  <SelectItem value="outflow">Sortie (OUTFLOW)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Catégorie</Label>
              <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Projet (optionnel)</Label>
              <Select value={form.projectId ? form.projectId.toString() : ""} onValueChange={(v) => setForm({ ...form, projectId: Number(v) })}>
                <SelectTrigger><SelectValue placeholder="Aucun projet" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Aucun projet</SelectItem>
                  {(projectsQuery.data?.projects || []).map((p: any) => (
                    <SelectItem key={p.id} value={p.id.toString()}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Montant (XOF)</Label>
              <Input type="number" min={1} value={form.amount} onChange={(e) => setForm({ ...form, amount: Number(e.target.value) })} />
            </div>
            <div>
              <Label>Description</Label>
              <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Description du flux" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Date du flux</Label>
                <Input type="date" value={form.flowDate} onChange={(e) => setForm({ ...form, flowDate: e.target.value })} />
              </div>
              <div>
                <Label>Échéance (optionnel)</Label>
                <Input type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="isPaid" checked={form.isPaid} onChange={(e) => setForm({ ...form, isPaid: e.target.checked })} />
              <Label htmlFor="isPaid">Déjà payé</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>Annuler</Button>
            <Button
              onClick={() => createFlow.mutate({
                projectId: form.projectId || undefined,
                type: form.type as any,
                category: form.category as any,
                amount: form.amount,
                description: form.description || undefined,
                flowDate: new Date(form.flowDate).getTime(),
                dueDate: form.dueDate ? new Date(form.dueDate).getTime() : undefined,
                isPaid: form.isPaid,
              })}
              disabled={form.amount <= 0}
            >
              Enregistrer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
