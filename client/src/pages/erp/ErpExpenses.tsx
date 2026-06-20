import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useErpPermissions } from "@/hooks/useErpPermissions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { CreditCard, Plus, CheckCircle, XCircle, Send, Eye, TrendingUp } from "lucide-react";

const STATUS_LABELS: Record<string, string> = {
  draft: "Brouillon", submitted: "Soumise", approved: "Approuvée",
  rejected: "Rejetée", paid: "Payée", cancelled: "Annulée",
};
const STATUS_COLORS: Record<string, string> = {
  draft: "bg-gray-100 text-gray-700", submitted: "bg-blue-100 text-blue-800", approved: "bg-green-100 text-green-800",
  rejected: "bg-red-100 text-red-800", paid: "bg-emerald-100 text-emerald-800", cancelled: "bg-gray-200 text-gray-600",
};
const EXPENSE_TYPE_LABELS: Record<string, string> = {
  direct: "Directe", indirect: "Indirecte", overhead: "Frais généraux", operational: "Opérationnelle",
};

function formatXOF(amount: number) {
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "XOF", maximumFractionDigits: 0 }).format(amount);
}
function formatDate(ts: number) {
  return new Date(ts).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
}

export default function ErpExpenses() {
  const { hasPermission } = useErpPermissions();
  const canView = hasPermission("erp_expenses", "view");
  const canCreate = hasPermission("erp_expenses", "create");
  const canApprove = hasPermission("erp_expenses", "approve");

  const [statusFilter, setStatusFilter] = useState<string>("");
  const [showCreate, setShowCreate] = useState(false);
  const [showDetail, setShowDetail] = useState<number | null>(null);

  const expensesQuery = trpc.erp.expenses.expenses.list.useQuery({
    status: statusFilter && statusFilter !== "all" ? statusFilter : undefined,
    limit: 50, offset: 0,
  }, { enabled: canView });

  const detailQuery = trpc.erp.expenses.expenses.getById.useQuery(
    { id: showDetail! }, { enabled: !!showDetail }
  );

  const projectsQuery = trpc.erp.projects.list.useQuery({ limit: 100, offset: 0 }, { enabled: canView });
  const categoriesQuery = trpc.erp.expenses.categories.list.useQuery(undefined, { enabled: canView });

  const createMutation = trpc.erp.expenses.expenses.create.useMutation({
    onSuccess: () => { toast.success("Dépense créée"); setShowCreate(false); expensesQuery.refetch(); },
    onError: (e) => toast.error(e.message),
  });
  const submitMutation = trpc.erp.expenses.expenses.submit.useMutation({
    onSuccess: () => { toast.success("Dépense soumise"); expensesQuery.refetch(); detailQuery.refetch(); },
    onError: (e) => toast.error(e.message),
  });
  const approveMutation = trpc.erp.expenses.expenses.approve.useMutation({
    onSuccess: () => { toast.success("Dépense approuvée"); expensesQuery.refetch(); detailQuery.refetch(); },
    onError: (e) => toast.error(e.message),
  });
  const rejectMutation = trpc.erp.expenses.expenses.reject.useMutation({
    onSuccess: () => { toast.success("Dépense rejetée"); expensesQuery.refetch(); detailQuery.refetch(); },
    onError: (e) => toast.error(e.message),
  });

  if (!canView) {
    return <div className="flex items-center justify-center h-64"><p className="text-muted-foreground">Accès non autorisé au module Dépenses.</p></div>;
  }

  // KPIs
  const totalAmount = expensesQuery.data?.expenses?.reduce((s: number, e: any) => s + (e.totalAmount || 0), 0) || 0;
  const approvedCount = expensesQuery.data?.expenses?.filter((e: any) => e.status === "approved" || e.status === "paid").length || 0;
  const pendingCount = expensesQuery.data?.expenses?.filter((e: any) => e.status === "submitted").length || 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <CreditCard className="h-6 w-6 text-primary" />
            Dépenses
          </h1>
          <p className="text-muted-foreground mt-1">Suivi et validation des dépenses opérationnelles</p>
        </div>
        {canCreate && (
          <Button onClick={() => setShowCreate(true)}>
            <Plus className="h-4 w-4 mr-1" /> Nouvelle Dépense
          </Button>
        )}
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="border rounded-lg p-4">
          <p className="text-xs text-muted-foreground">Total Dépenses</p>
          <p className="text-xl font-bold">{formatXOF(totalAmount)}</p>
        </div>
        <div className="border rounded-lg p-4">
          <p className="text-xs text-muted-foreground">Approuvées</p>
          <p className="text-xl font-bold text-green-600">{approvedCount}</p>
        </div>
        <div className="border rounded-lg p-4">
          <p className="text-xs text-muted-foreground">En attente</p>
          <p className="text-xl font-bold text-orange-600">{pendingCount}</p>
        </div>
        <div className="border rounded-lg p-4">
          <p className="text-xs text-muted-foreground">Total</p>
          <p className="text-xl font-bold">{expensesQuery.data?.total ?? 0}</p>
        </div>
      </div>

      {/* Filtres */}
      <div className="flex gap-3 items-center">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-48"><SelectValue placeholder="Tous les statuts" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les statuts</SelectItem>
            <SelectItem value="draft">Brouillon</SelectItem>
            <SelectItem value="submitted">Soumise</SelectItem>
            <SelectItem value="approved">Approuvée</SelectItem>
            <SelectItem value="rejected">Rejetée</SelectItem>
            <SelectItem value="paid">Payée</SelectItem>
          </SelectContent>
        </Select>
        <span className="text-sm text-muted-foreground">{expensesQuery.data?.total ?? 0} dépense(s)</span>
      </div>

      {/* Tableau */}
      <div className="border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="text-left p-3 font-medium">Réf.</th>
              <th className="text-left p-3 font-medium">Date</th>
              <th className="text-left p-3 font-medium">Description</th>
              <th className="text-left p-3 font-medium">Type</th>
              <th className="text-left p-3 font-medium">Statut</th>
              <th className="text-right p-3 font-medium">Montant TTC</th>
              <th className="text-center p-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {expensesQuery.data?.expenses?.map((exp: any) => (
              <tr key={exp.id} className="border-t hover:bg-muted/30">
                <td className="p-3 font-mono text-xs">{exp.expenseNumber}</td>
                <td className="p-3 text-muted-foreground">{formatDate(exp.expenseDate)}</td>
                <td className="p-3 max-w-[200px] truncate">{exp.description}</td>
                <td className="p-3"><Badge variant="outline" className="text-xs">{exp.description?.substring(0, 20)}</Badge></td>
                <td className="p-3"><Badge className={`text-xs ${STATUS_COLORS[exp.status] || ""}`}>{STATUS_LABELS[exp.status] || exp.status}</Badge></td>
                <td className="p-3 text-right font-semibold">{formatXOF(exp.totalAmount || 0)}</td>
                <td className="p-3 text-center">
                  <Button size="sm" variant="ghost" onClick={() => setShowDetail(exp.id)}><Eye className="h-4 w-4" /></Button>
                </td>
              </tr>
            ))}
            {(!expensesQuery.data?.expenses || expensesQuery.data.expenses.length === 0) && (
              <tr><td colSpan={7} className="p-8 text-center text-muted-foreground">Aucune dépense enregistrée</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* DIALOG: Créer Dépense */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Nouvelle Dépense</DialogTitle></DialogHeader>
          <form onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            const amountHT = parseInt(fd.get("amountHT") as string) || 0;
            const taxAmount = parseInt(fd.get("taxAmount") as string) || 0;
            createMutation.mutate({
              projectId: fd.get("projectId") ? Number(fd.get("projectId")) : null,
              expenseCategoryId: fd.get("categoryId") ? Number(fd.get("categoryId")) : null,

              description: fd.get("description") as string,
              subtotalAmount: amountHT,
              taxAmount,
              expenseDate: Date.now(),
            });
          }} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Projet</Label>
                <Select name="projectId">
                  <SelectTrigger><SelectValue placeholder="Optionnel" /></SelectTrigger>
                  <SelectContent>
                    {projectsQuery.data?.projects?.map((p: any) => (
                      <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Catégorie</Label>
                <Select name="categoryId">
                  <SelectTrigger><SelectValue placeholder="Optionnel" /></SelectTrigger>
                  <SelectContent>
                    {(categoriesQuery.data as any[])?.map((c: any) => (
                      <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Type *</Label>
                <Select name="expenseType" defaultValue="direct">
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="direct">Directe</SelectItem>
                    <SelectItem value="indirect">Indirecte</SelectItem>
                    <SelectItem value="overhead">Frais généraux</SelectItem>
                    <SelectItem value="operational">Opérationnelle</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Mode de paiement</Label>
                <Select name="paymentMethod">
                  <SelectTrigger><SelectValue placeholder="Optionnel" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bank_transfer">Virement</SelectItem>
                    <SelectItem value="cash">Espèces</SelectItem>
                    <SelectItem value="check">Chèque</SelectItem>
                    <SelectItem value="mobile_money">Mobile Money</SelectItem>
                    <SelectItem value="card">Carte</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div><Label>Description *</Label><Textarea name="description" placeholder="Détail de la dépense..." required /></div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Montant HT (XOF) *</Label><Input name="amountHT" type="number" min={0} placeholder="0" required /></div>
              <div><Label>Montant Taxe (XOF)</Label><Input name="taxAmount" type="number" min={0} placeholder="0" defaultValue="0" /></div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowCreate(false)}>Annuler</Button>
              <Button type="submit" disabled={createMutation.isPending}>Créer</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* DIALOG: Détail Dépense */}
      <Dialog open={!!showDetail} onOpenChange={() => setShowDetail(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Dépense {detailQuery.data?.expenseNumber}</DialogTitle></DialogHeader>
          {detailQuery.data && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><span className="text-muted-foreground">Statut:</span> <Badge className={`ml-1 text-xs ${STATUS_COLORS[detailQuery.data.status]}`}>{STATUS_LABELS[detailQuery.data.status]}</Badge></div>
                <div><span className="text-muted-foreground">Catégorie:</span> {detailQuery.data.expenseCategoryId || "—"}</div>
                <div><span className="text-muted-foreground">Date:</span> {formatDate(detailQuery.data.expenseDate)}</div>
                <div><span className="text-muted-foreground">Montant TTC:</span> <strong>{formatXOF(detailQuery.data.totalAmount || 0)}</strong></div>
              </div>
              <div className="text-sm">
                <span className="text-muted-foreground">Description:</span>
                <p className="mt-1">{detailQuery.data.description}</p>
              </div>
              {detailQuery.data.paymentMethod && (
                <div className="text-sm"><span className="text-muted-foreground">Paiement:</span> {detailQuery.data.paymentMethod}</div>
              )}
              <div className="flex gap-2 justify-end">
                {detailQuery.data.status === "draft" && canCreate && (
                  <Button size="sm" onClick={() => submitMutation.mutate({ id: detailQuery.data!.id })}>
                    <Send className="h-4 w-4 mr-1" /> Soumettre
                  </Button>
                )}
                {detailQuery.data.status === "submitted" && canApprove && (
                  <>
                    <Button size="sm" variant="default" onClick={() => approveMutation.mutate({ id: detailQuery.data!.id })}>
                      <CheckCircle className="h-4 w-4 mr-1" /> Approuver
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => {
                      const reason = prompt("Raison du rejet:");
                      if (reason) rejectMutation.mutate({ id: detailQuery.data!.id, reason });
                    }}>
                      <XCircle className="h-4 w-4 mr-1" /> Rejeter
                    </Button>
                  </>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
