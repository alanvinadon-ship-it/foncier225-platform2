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
import { Wallet, Plus, CheckCircle, FileText, TrendingUp, TrendingDown } from "lucide-react";

const STATUS_LABELS: Record<string, string> = {
  draft: "Brouillon",
  submitted: "Soumis",
  approved: "Approuvé",
  rejected: "Rejeté",
  revised: "Révisé",
};
const STATUS_COLORS: Record<string, string> = {
  draft: "bg-gray-100 text-gray-700",
  submitted: "bg-blue-100 text-blue-800",
  approved: "bg-green-100 text-green-800",
  rejected: "bg-red-100 text-red-800",
  revised: "bg-yellow-100 text-yellow-800",
};
const CATEGORY_LABELS: Record<string, string> = {
  labour: "Main d'œuvre",
  materials: "Matériaux",
  equipment: "Équipement",
  subcontracting: "Sous-traitance",
  permits: "Permis",
  transport: "Transport",
  other: "Autres",
};

function formatXOF(amount: number) {
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "XOF", maximumFractionDigits: 0 }).format(amount);
}

export default function ErpFinanceBudgets() {
  const { hasPermission } = useErpPermissions();
  const canView = hasPermission("finance", "view");
  const canCreate = hasPermission("finance", "create");
  const canEdit = hasPermission("finance", "edit");
  const canApprove = hasPermission("finance", "approve");

  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showLinesDialog, setShowLinesDialog] = useState<number | null>(null);
  const [showAddLineDialog, setShowAddLineDialog] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("");

  const budgetsQuery = trpc.erp.finance.budgets.list.useQuery({
    status: statusFilter && statusFilter !== "all" ? statusFilter as any : undefined,
    limit: 100,
    offset: 0,
  });
  const projectsQuery = trpc.erp.projects.list.useQuery({ limit: 100, offset: 0 });
  const budgetDetailQuery = trpc.erp.finance.budgets.getById.useQuery(
    { id: showLinesDialog! },
    { enabled: !!showLinesDialog }
  );

  const createBudget = trpc.erp.finance.budgets.create.useMutation({
    onSuccess: () => { toast.success("Budget créé"); setShowCreateDialog(false); budgetsQuery.refetch(); },
    onError: (e) => toast.error(e.message),
  });
  const approveBudget = trpc.erp.finance.budgets.approve.useMutation({
    onSuccess: () => { toast.success("Budget approuvé"); budgetsQuery.refetch(); budgetDetailQuery.refetch(); },
    onError: (e) => toast.error(e.message),
  });
  const updateBudget = trpc.erp.finance.budgets.update.useMutation({
    onSuccess: () => { toast.success("Budget mis à jour"); budgetsQuery.refetch(); },
    onError: (e) => toast.error(e.message),
  });
  const addLine = trpc.erp.finance.budgets.addLine.useMutation({
    onSuccess: () => { toast.success("Ligne ajoutée"); setShowAddLineDialog(false); budgetDetailQuery.refetch(); budgetsQuery.refetch(); },
    onError: (e) => toast.error(e.message),
  });

  const [createForm, setCreateForm] = useState({ projectId: 0, name: "" });
  const [lineForm, setLineForm] = useState({ category: "materials" as string, description: "", initialAmount: 0 });

  const projectMap = useMemo(() => {
    const map = new Map<number, string>();
    (projectsQuery.data?.projects || []).forEach((p: any) => map.set(p.id, p.name));
    return map;
  }, [projectsQuery.data]);

  if (!canView) return <div className="p-6 text-center text-muted-foreground">Accès non autorisé</div>;

  const budgets = budgetsQuery.data?.budgets || [];
  const budgetDetail = budgetDetailQuery.data;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Wallet className="h-6 w-6 text-primary" />
            Budgets
          </h1>
          <p className="text-muted-foreground">Gestion des budgets par projet</p>
        </div>
        {canCreate && (
          <Button size="sm" onClick={() => setShowCreateDialog(true)}>
            <Plus className="h-4 w-4 mr-1" /> Nouveau budget
          </Button>
        )}
      </div>

      {/* Filtres */}
      <div className="flex gap-3">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-48"><SelectValue placeholder="Statut" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les statuts</SelectItem>
            {Object.entries(STATUS_LABELS).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Liste budgets */}
      {budgetsQuery.isLoading ? (
        <div className="text-center py-8 text-muted-foreground">Chargement...</div>
      ) : budgets.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">Aucun budget enregistré</div>
      ) : (
        <div className="overflow-x-auto border rounded-lg">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left p-3 font-medium">Projet</th>
                <th className="text-left p-3 font-medium">Nom</th>
                <th className="text-center p-3 font-medium">Statut</th>
                <th className="text-right p-3 font-medium">Initial</th>
                <th className="text-right p-3 font-medium">Révisé</th>
                <th className="text-right p-3 font-medium">Engagé</th>
                <th className="text-right p-3 font-medium">Payé</th>
                <th className="text-right p-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {budgets.map((b: any) => (
                <tr key={b.id} className="border-t hover:bg-muted/30">
                  <td className="p-3">{projectMap.get(b.projectId) || `#${b.projectId}`}</td>
                  <td className="p-3 font-medium">{b.name}</td>
                  <td className="p-3 text-center">
                    <Badge className={STATUS_COLORS[b.status] || ""}>{STATUS_LABELS[b.status] || b.status}</Badge>
                  </td>
                  <td className="p-3 text-right font-mono">{formatXOF(b.totalInitial)}</td>
                  <td className="p-3 text-right font-mono">{formatXOF(b.totalRevised)}</td>
                  <td className="p-3 text-right font-mono text-orange-600">{formatXOF(b.totalEngaged)}</td>
                  <td className="p-3 text-right font-mono text-green-600">{formatXOF(b.totalPaid)}</td>
                  <td className="p-3 text-right space-x-1">
                    <Button variant="ghost" size="sm" onClick={() => setShowLinesDialog(b.id)}>
                      <FileText className="h-3 w-3" />
                    </Button>
                    {canEdit && b.status === "draft" && (
                      <Button variant="ghost" size="sm" onClick={() => updateBudget.mutate({ id: b.id, status: "submitted" })}>
                        Soumettre
                      </Button>
                    )}
                    {canApprove && b.status === "submitted" && (
                      <Button variant="ghost" size="sm" className="text-green-600" onClick={() => approveBudget.mutate({ id: b.id })}>
                        <CheckCircle className="h-3 w-3" />
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Dialog: Créer budget */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Nouveau budget</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Projet</Label>
              <Select value={createForm.projectId ? createForm.projectId.toString() : ""} onValueChange={(v) => setCreateForm({ ...createForm, projectId: Number(v) })}>
                <SelectTrigger><SelectValue placeholder="Sélectionner un projet" /></SelectTrigger>
                <SelectContent>
                  {(projectsQuery.data?.projects || []).map((p: any) => (
                    <SelectItem key={p.id} value={p.id.toString()}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Nom du budget</Label>
              <Input value={createForm.name} onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })} placeholder="Ex: Budget principal 2025" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>Annuler</Button>
            <Button onClick={() => createBudget.mutate(createForm)} disabled={!createForm.projectId || !createForm.name}>Créer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Détail budget + lignes */}
      <Dialog open={!!showLinesDialog} onOpenChange={() => setShowLinesDialog(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Détail du budget — {budgetDetail?.name}</DialogTitle>
          </DialogHeader>
          {budgetDetail && (
            <div className="space-y-4">
              <div className="grid grid-cols-4 gap-3">
                <Card><CardContent className="p-2 text-center"><p className="text-xs text-muted-foreground">Initial</p><p className="font-bold">{formatXOF(budgetDetail.totalInitial)}</p></CardContent></Card>
                <Card><CardContent className="p-2 text-center"><p className="text-xs text-muted-foreground">Révisé</p><p className="font-bold">{formatXOF(budgetDetail.totalRevised)}</p></CardContent></Card>
                <Card><CardContent className="p-2 text-center"><p className="text-xs text-muted-foreground">Engagé</p><p className="font-bold text-orange-600">{formatXOF(budgetDetail.totalEngaged)}</p></CardContent></Card>
                <Card><CardContent className="p-2 text-center"><p className="text-xs text-muted-foreground">Payé</p><p className="font-bold text-green-600">{formatXOF(budgetDetail.totalPaid)}</p></CardContent></Card>
              </div>
              {budgetDetail.lines && budgetDetail.lines.length > 0 ? (
                <div className="overflow-x-auto border rounded-lg">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="text-left p-2 font-medium">Catégorie</th>
                        <th className="text-left p-2 font-medium">Description</th>
                        <th className="text-right p-2 font-medium">Initial</th>
                        <th className="text-right p-2 font-medium">Révisé</th>
                        <th className="text-right p-2 font-medium">Engagé</th>
                        <th className="text-right p-2 font-medium">Payé</th>
                        <th className="text-right p-2 font-medium">Reste</th>
                      </tr>
                    </thead>
                    <tbody>
                      {budgetDetail.lines.map((l: any) => {
                        const reste = (l.revisedAmount || l.initialAmount) - l.engagedAmount - l.paidAmount;
                        return (
                          <tr key={l.id} className="border-t">
                            <td className="p-2">{CATEGORY_LABELS[l.category] || l.category}</td>
                            <td className="p-2 text-muted-foreground">{l.description || "-"}</td>
                            <td className="p-2 text-right font-mono">{formatXOF(l.initialAmount)}</td>
                            <td className="p-2 text-right font-mono">{formatXOF(l.revisedAmount)}</td>
                            <td className="p-2 text-right font-mono text-orange-600">{formatXOF(l.engagedAmount)}</td>
                            <td className="p-2 text-right font-mono text-green-600">{formatXOF(l.paidAmount)}</td>
                            <td className={`p-2 text-right font-mono ${reste < 0 ? "text-red-600" : ""}`}>{formatXOF(reste)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-4 text-muted-foreground">Aucune ligne budgétaire</div>
              )}
              {canCreate && budgetDetail.status !== "approved" && (
                <Button size="sm" variant="outline" onClick={() => setShowAddLineDialog(true)}>
                  <Plus className="h-3 w-3 mr-1" /> Ajouter une ligne
                </Button>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog: Ajouter ligne */}
      <Dialog open={showAddLineDialog} onOpenChange={setShowAddLineDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Ajouter une ligne budgétaire</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Catégorie</Label>
              <Select value={lineForm.category} onValueChange={(v) => setLineForm({ ...lineForm, category: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Description</Label>
              <Input value={lineForm.description} onChange={(e) => setLineForm({ ...lineForm, description: e.target.value })} placeholder="Description de la ligne" />
            </div>
            <div>
              <Label>Montant initial (XOF)</Label>
              <Input type="number" min={0} value={lineForm.initialAmount} onChange={(e) => setLineForm({ ...lineForm, initialAmount: Number(e.target.value) })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddLineDialog(false)}>Annuler</Button>
            <Button onClick={() => addLine.mutate({ budgetId: showLinesDialog!, category: lineForm.category as any, description: lineForm.description || undefined, initialAmount: lineForm.initialAmount })} disabled={lineForm.initialAmount <= 0}>
              Ajouter
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
