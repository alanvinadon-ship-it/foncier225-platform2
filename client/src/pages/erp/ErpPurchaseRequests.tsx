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
import { ShoppingCart, Plus, CheckCircle, XCircle, Send, Eye } from "lucide-react";

const STATUS_LABELS: Record<string, string> = {
  draft: "Brouillon", submitted: "Soumise", approved: "Approuvée", rejected: "Rejetée", cancelled: "Annulée", converted: "Convertie en BC",
};
const STATUS_COLORS: Record<string, string> = {
  draft: "bg-gray-100 text-gray-700", submitted: "bg-blue-100 text-blue-800", approved: "bg-green-100 text-green-800",
  rejected: "bg-red-100 text-red-800", cancelled: "bg-gray-200 text-gray-600", converted: "bg-purple-100 text-purple-800",
};
const PRIORITY_LABELS: Record<string, string> = { low: "Basse", normal: "Normale", high: "Haute", urgent: "Urgente" };
const PRIORITY_COLORS: Record<string, string> = { low: "bg-gray-100 text-gray-700", normal: "bg-blue-100 text-blue-700", high: "bg-orange-100 text-orange-800", urgent: "bg-red-100 text-red-800" };

function formatXOF(amount: number) {
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "XOF", maximumFractionDigits: 0 }).format(amount);
}
function formatDate(ts: number) {
  return new Date(ts).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
}

export default function ErpPurchaseRequests() {
  const { hasPermission } = useErpPermissions();
  const canView = hasPermission("erp_purchases", "view");
  const canCreate = hasPermission("erp_purchases", "create");
  const canApprove = hasPermission("erp_purchases", "approve");

  const [statusFilter, setStatusFilter] = useState<string>("");
  const [showCreate, setShowCreate] = useState(false);
  const [showDetail, setShowDetail] = useState<number | null>(null);
  const [lines, setLines] = useState([{ itemType: "material", description: "", quantity: 1, unit: "unité", estimatedUnitPrice: 0 }]);

  const requestsQuery = trpc.erp.purchases.requests.list.useQuery({
    status: statusFilter && statusFilter !== "all" ? statusFilter : undefined,
    limit: 50, offset: 0,
  }, { enabled: canView });

  const detailQuery = trpc.erp.purchases.requests.getById.useQuery(
    { id: showDetail! }, { enabled: !!showDetail }
  );

  const projectsQuery = trpc.erp.projects.list.useQuery({ limit: 100, offset: 0 }, { enabled: canView });

  const createMutation = trpc.erp.purchases.requests.create.useMutation({
    onSuccess: () => { toast.success("Demande d'achat créée"); setShowCreate(false); requestsQuery.refetch(); },
    onError: (e) => toast.error(e.message),
  });
  const submitMutation = trpc.erp.purchases.requests.submit.useMutation({
    onSuccess: () => { toast.success("Demande soumise"); requestsQuery.refetch(); detailQuery.refetch(); },
    onError: (e) => toast.error(e.message),
  });
  const approveMutation = trpc.erp.purchases.requests.approve.useMutation({
    onSuccess: () => { toast.success("Demande approuvée"); requestsQuery.refetch(); detailQuery.refetch(); },
    onError: (e) => toast.error(e.message),
  });
  const rejectMutation = trpc.erp.purchases.requests.reject.useMutation({
    onSuccess: () => { toast.success("Demande rejetée"); requestsQuery.refetch(); detailQuery.refetch(); },
    onError: (e) => toast.error(e.message),
  });

  if (!canView) {
    return <div className="flex items-center justify-center h-64"><p className="text-muted-foreground">Accès non autorisé au module Achats.</p></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ShoppingCart className="h-6 w-6 text-primary" />
            Demandes d'Achat
          </h1>
          <p className="text-muted-foreground mt-1">Gestion des demandes d'achat et workflow d'approbation</p>
        </div>
        {canCreate && (
          <Button onClick={() => setShowCreate(true)}>
            <Plus className="h-4 w-4 mr-1" /> Nouvelle Demande
          </Button>
        )}
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
            <SelectItem value="converted">Convertie</SelectItem>
          </SelectContent>
        </Select>
        <span className="text-sm text-muted-foreground">{requestsQuery.data?.total ?? 0} demande(s)</span>
      </div>

      {/* Tableau */}
      <div className="border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="text-left p-3 font-medium">N° Demande</th>
              <th className="text-left p-3 font-medium">Date</th>
              <th className="text-left p-3 font-medium">Priorité</th>
              <th className="text-left p-3 font-medium">Statut</th>
              <th className="text-right p-3 font-medium">Montant Estimé</th>
              <th className="text-center p-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {requestsQuery.data?.requests?.map((req: any) => (
              <tr key={req.id} className="border-t hover:bg-muted/30">
                <td className="p-3 font-mono text-xs">{req.requestNumber}</td>
                <td className="p-3 text-muted-foreground">{formatDate(req.requestDate)}</td>
                <td className="p-3"><Badge className={`text-xs ${PRIORITY_COLORS[req.priority] || ""}`}>{PRIORITY_LABELS[req.priority] || req.priority}</Badge></td>
                <td className="p-3"><Badge className={`text-xs ${STATUS_COLORS[req.status] || ""}`}>{STATUS_LABELS[req.status] || req.status}</Badge></td>
                <td className="p-3 text-right font-semibold">{formatXOF(req.estimatedAmount || 0)}</td>
                <td className="p-3 text-center">
                  <Button size="sm" variant="ghost" onClick={() => setShowDetail(req.id)}><Eye className="h-4 w-4" /></Button>
                </td>
              </tr>
            ))}
            {(!requestsQuery.data?.requests || requestsQuery.data.requests.length === 0) && (
              <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">Aucune demande d'achat</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* DIALOG: Créer Demande */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Nouvelle Demande d'Achat</DialogTitle></DialogHeader>
          <form onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            const estimatedAmount = lines.reduce((s, l) => s + l.quantity * l.estimatedUnitPrice, 0);
            createMutation.mutate({
              projectId: fd.get("projectId") ? Number(fd.get("projectId")) : null,
              priority: (fd.get("priority") as any) || "normal",
              justification: fd.get("justification") as string || undefined,
              estimatedAmount,
              lines: lines.map(l => ({
                itemType: l.itemType,
                description: l.description,
                quantity: l.quantity,
                unit: l.unit,
                estimatedUnitPrice: l.estimatedUnitPrice,
              })),
            });
          }} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Projet</Label>
                <Select name="projectId">
                  <SelectTrigger><SelectValue placeholder="Sélectionner un projet" /></SelectTrigger>
                  <SelectContent>
                    {projectsQuery.data?.projects?.map((p: any) => (
                      <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Priorité *</Label>
                <Select name="priority" defaultValue="normal">
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Basse</SelectItem>
                    <SelectItem value="normal">Normale</SelectItem>
                    <SelectItem value="high">Haute</SelectItem>
                    <SelectItem value="urgent">Urgente</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div><Label>Justification</Label><Textarea name="justification" placeholder="Raison de la demande..." /></div>

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label className="text-base font-semibold">Lignes de demande</Label>
                <Button type="button" size="sm" variant="outline" onClick={() => setLines([...lines, { itemType: "material", description: "", quantity: 1, unit: "unité", estimatedUnitPrice: 0 }])}>
                  <Plus className="h-3 w-3 mr-1" /> Ligne
                </Button>
              </div>
              {lines.map((line, idx) => (
                <div key={idx} className="grid grid-cols-12 gap-2 items-end border p-2 rounded">
                  <div className="col-span-3">
                    <Label className="text-xs">Type</Label>
                    <Select value={line.itemType} onValueChange={(v) => { const nl = [...lines]; nl[idx].itemType = v; setLines(nl); }}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="material">Matériau</SelectItem>
                        <SelectItem value="equipment">Équipement</SelectItem>
                        <SelectItem value="service">Service</SelectItem>
                        <SelectItem value="subcontracting">Sous-traitance</SelectItem>
                        <SelectItem value="other">Autre</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-4">
                    <Label className="text-xs">Description *</Label>
                    <Input className="h-8 text-xs" value={line.description} onChange={(e) => { const nl = [...lines]; nl[idx].description = e.target.value; setLines(nl); }} required />
                  </div>
                  <div className="col-span-2">
                    <Label className="text-xs">Qté</Label>
                    <Input className="h-8 text-xs" type="number" min={1} value={line.quantity} onChange={(e) => { const nl = [...lines]; nl[idx].quantity = parseInt(e.target.value) || 1; setLines(nl); }} />
                  </div>
                  <div className="col-span-2">
                    <Label className="text-xs">Prix unit.</Label>
                    <Input className="h-8 text-xs" type="number" min={0} value={line.estimatedUnitPrice} onChange={(e) => { const nl = [...lines]; nl[idx].estimatedUnitPrice = parseInt(e.target.value) || 0; setLines(nl); }} />
                  </div>
                  <div className="col-span-1">
                    {lines.length > 1 && (
                      <Button type="button" size="sm" variant="ghost" className="h-8 w-8 p-0 text-red-500" onClick={() => setLines(lines.filter((_, i) => i !== idx))}>×</Button>
                    )}
                  </div>
                </div>
              ))}
              <p className="text-xs text-muted-foreground text-right">
                Total estimé: <strong>{formatXOF(lines.reduce((s, l) => s + l.quantity * l.estimatedUnitPrice, 0))}</strong>
              </p>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowCreate(false)}>Annuler</Button>
              <Button type="submit" disabled={createMutation.isPending}>Créer la Demande</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* DIALOG: Détail Demande */}
      <Dialog open={!!showDetail} onOpenChange={() => setShowDetail(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Demande {detailQuery.data?.requestNumber}</DialogTitle></DialogHeader>
          {detailQuery.data && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div><span className="text-muted-foreground">Statut:</span> <Badge className={`ml-1 text-xs ${STATUS_COLORS[detailQuery.data.status]}`}>{STATUS_LABELS[detailQuery.data.status]}</Badge></div>
                <div><span className="text-muted-foreground">Priorité:</span> <Badge className={`ml-1 text-xs ${PRIORITY_COLORS[detailQuery.data.priority]}`}>{PRIORITY_LABELS[detailQuery.data.priority]}</Badge></div>
                <div><span className="text-muted-foreground">Date:</span> {formatDate(detailQuery.data.requestDate)}</div>
              </div>
              {detailQuery.data.justification && (
                <div className="text-sm"><span className="text-muted-foreground">Justification:</span> {detailQuery.data.justification}</div>
              )}
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full text-xs">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="text-left p-2">Type</th>
                      <th className="text-left p-2">Description</th>
                      <th className="text-right p-2">Qté</th>
                      <th className="text-right p-2">Prix Unit.</th>
                      <th className="text-right p-2">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detailQuery.data.lines?.map((l: any) => (
                      <tr key={l.id} className="border-t">
                        <td className="p-2"><Badge variant="outline" className="text-xs">{l.itemType}</Badge></td>
                        <td className="p-2">{l.description}</td>
                        <td className="p-2 text-right">{l.quantity}</td>
                        <td className="p-2 text-right">{formatXOF(l.estimatedUnitPrice || 0)}</td>
                        <td className="p-2 text-right font-semibold">{formatXOF(l.estimatedTotal || 0)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
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
