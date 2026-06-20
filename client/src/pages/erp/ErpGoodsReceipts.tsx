import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useErpPermissions } from "@/hooks/useErpPermissions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Package, Plus, Truck, CheckCircle, AlertTriangle, Eye } from "lucide-react";

const STATUS_LABELS: Record<string, string> = {
  draft: "Brouillon", received: "Reçu", partially_received: "Partiel", rejected: "Rejeté", cancelled: "Annulé",
};
const STATUS_COLORS: Record<string, string> = {
  draft: "bg-gray-100 text-gray-700", received: "bg-green-100 text-green-800",
  partially_received: "bg-yellow-100 text-yellow-800", rejected: "bg-red-100 text-red-800", cancelled: "bg-gray-200 text-gray-600",
};

function formatDate(ts: number) {
  return new Date(ts).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
}

export default function ErpGoodsReceipts() {
  const { hasPermission } = useErpPermissions();
  const canView = hasPermission("erp_purchases", "view");
  const canCreate = hasPermission("erp_purchases", "create");
  const [showCreate, setShowCreate] = useState(false);
  const [showDetail, setShowDetail] = useState<number | null>(null);
  const [selectedPO, setSelectedPO] = useState<string>("");
  const [deliveryNoteRef, setDeliveryNoteRef] = useState("");
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState<Array<{ poLineId: number; quantityReceived: number; quantityRejected: number; rejectionReason: string; description: string }>>([]);

  const receiptsQuery = trpc.erp.purchases.receipts.list.useQuery({ limit: 50, offset: 0 }, { enabled: canView });
  const ordersQuery = trpc.erp.purchases.orders.list.useQuery({ status: "sent", limit: 100, offset: 0 }, { enabled: canView });
  const utils = trpc.useUtils();

  const createMutation = trpc.erp.purchases.receipts.create.useMutation({
    onSuccess: (data) => {
      toast.success(`Réception ${data.grNumber} créée`);
      utils.erp.purchases.receipts.list.invalidate();
      setShowCreate(false);
      resetForm();
    },
    onError: (err) => toast.error(err.message),
  });

  function resetForm() {
    setSelectedPO("");
    setDeliveryNoteRef("");
    setNotes("");
    setLines([]);
  }

  // Quand un PO est sélectionné, charger ses lignes
  const poDetailQuery = trpc.erp.purchases.orders.getById.useQuery(
    { id: Number(selectedPO) },
    { enabled: !!selectedPO && showCreate }
  );

  function handlePOChange(poId: string) {
    setSelectedPO(poId);
    setLines([]);
  }

  // Initialiser les lignes à partir du PO
  function initLinesFromPO() {
    if (!poDetailQuery.data?.lines) return;
    const newLines = poDetailQuery.data.lines.map((l: any) => ({
      poLineId: l.id,
      quantityReceived: l.quantityOrdered - (l.quantityReceived || 0),
      quantityRejected: 0,
      rejectionReason: "",
      description: l.description || `Ligne #${l.id}`,
    }));
    setLines(newLines);
  }

  function handleSubmit() {
    if (!selectedPO || lines.length === 0) {
      toast.error("Sélectionnez un bon de commande et ajoutez des lignes");
      return;
    }
    const validLines = lines.filter(l => l.quantityReceived > 0);
    if (validLines.length === 0) {
      toast.error("Au moins une ligne doit avoir une quantité reçue > 0");
      return;
    }
    createMutation.mutate({
      purchaseOrderId: Number(selectedPO),
      deliveryNoteRef: deliveryNoteRef || undefined,
      notes: notes || undefined,
      lines: validLines.map(l => ({
        poLineId: l.poLineId,
        quantityReceived: l.quantityReceived,
        quantityRejected: l.quantityRejected,
        rejectionReason: l.rejectionReason || undefined,
      })),
    });
  }

  if (!canView) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertTriangle className="w-12 h-12 text-yellow-500 mx-auto mb-3" />
          <p className="text-lg font-medium">Accès non autorisé</p>
          <p className="text-sm text-muted-foreground">Vous n'avez pas les permissions pour accéder à ce module.</p>
        </div>
      </div>
    );
  }

  const receipts = receiptsQuery.data?.receipts || [];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-emerald-100 rounded-lg">
            <Truck className="w-6 h-6 text-emerald-700" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Réceptions</h1>
            <p className="text-sm text-muted-foreground">Bons de réception de marchandises</p>
          </div>
        </div>
        {canCreate && (
          <Button onClick={() => setShowCreate(true)} className="gap-2">
            <Plus className="w-4 h-4" /> Nouvelle réception
          </Button>
        )}
      </div>

      {/* Stats rapides */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white border rounded-lg p-4">
          <div className="text-sm text-muted-foreground">Total réceptions</div>
          <div className="text-2xl font-bold">{receiptsQuery.data?.total || 0}</div>
        </div>
        <div className="bg-white border rounded-lg p-4">
          <div className="text-sm text-muted-foreground">Reçues</div>
          <div className="text-2xl font-bold text-green-600">
            {receipts.filter((r: any) => r.status === "received").length}
          </div>
        </div>
        <div className="bg-white border rounded-lg p-4">
          <div className="text-sm text-muted-foreground">Partielles</div>
          <div className="text-2xl font-bold text-yellow-600">
            {receipts.filter((r: any) => r.status === "partially_received").length}
          </div>
        </div>
      </div>

      {/* Tableau */}
      <div className="bg-white border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="text-left p-3 font-medium">N° Réception</th>
              <th className="text-left p-3 font-medium">Date</th>
              <th className="text-left p-3 font-medium">Bon de livraison</th>
              <th className="text-left p-3 font-medium">Statut</th>
              <th className="text-right p-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {receipts.length === 0 ? (
              <tr><td colSpan={5} className="p-8 text-center text-muted-foreground">Aucune réception enregistrée</td></tr>
            ) : receipts.map((r: any) => (
              <tr key={r.id} className="border-b hover:bg-gray-50">
                <td className="p-3 font-medium">{r.receiptNumber}</td>
                <td className="p-3">{formatDate(r.receiptDate)}</td>
                <td className="p-3">{r.deliveryNoteNumber || "—"}</td>
                <td className="p-3">
                  <Badge className={STATUS_COLORS[r.status] || "bg-gray-100"}>{STATUS_LABELS[r.status] || r.status}</Badge>
                </td>
                <td className="p-3 text-right">
                  <Button variant="ghost" size="sm" onClick={() => setShowDetail(r.id)}>
                    <Eye className="w-4 h-4" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Dialog Création */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Package className="w-5 h-5" /> Nouvelle réception
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Bon de commande *</Label>
              <Select value={selectedPO} onValueChange={handlePOChange}>
                <SelectTrigger><SelectValue placeholder="Sélectionner un PO envoyé" /></SelectTrigger>
                <SelectContent>
                  {(ordersQuery.data?.orders || []).map((o: any) => (
                    <SelectItem key={o.id} value={String(o.id)}>{o.orderNumber}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Réf. bon de livraison</Label>
              <Input value={deliveryNoteRef} onChange={e => setDeliveryNoteRef(e.target.value)} placeholder="BL-2024-001" />
            </div>
            <div>
              <Label>Notes</Label>
              <Textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Observations..." rows={2} />
            </div>

            {/* Lignes PO */}
            {selectedPO && poDetailQuery.data?.lines && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-base font-semibold">Lignes à réceptionner</Label>
                  {lines.length === 0 && (
                    <Button size="sm" variant="outline" onClick={initLinesFromPO}>
                      Charger les lignes du PO
                    </Button>
                  )}
                </div>
                {lines.length > 0 && (
                  <div className="space-y-3">
                    {lines.map((line, idx) => (
                      <div key={idx} className="border rounded-lg p-3 space-y-2">
                        <div className="font-medium text-sm">{line.description}</div>
                        <div className="grid grid-cols-3 gap-2">
                          <div>
                            <Label className="text-xs">Qté reçue</Label>
                            <Input type="number" min={0} value={line.quantityReceived}
                              onChange={e => {
                                const newLines = [...lines];
                                newLines[idx].quantityReceived = Number(e.target.value);
                                setLines(newLines);
                              }} />
                          </div>
                          <div>
                            <Label className="text-xs">Qté rejetée</Label>
                            <Input type="number" min={0} value={line.quantityRejected}
                              onChange={e => {
                                const newLines = [...lines];
                                newLines[idx].quantityRejected = Number(e.target.value);
                                setLines(newLines);
                              }} />
                          </div>
                          <div>
                            <Label className="text-xs">Motif rejet</Label>
                            <Input value={line.rejectionReason}
                              onChange={e => {
                                const newLines = [...lines];
                                newLines[idx].rejectionReason = e.target.value;
                                setLines(newLines);
                              }}
                              placeholder="Si rejeté..." />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowCreate(false); resetForm(); }}>Annuler</Button>
            <Button onClick={handleSubmit} disabled={createMutation.isPending || lines.length === 0}>
              {createMutation.isPending ? "Création..." : "Créer la réception"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Détail */}
      {showDetail && (
        <Dialog open={!!showDetail} onOpenChange={() => setShowDetail(null)}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Détail réception</DialogTitle>
            </DialogHeader>
            <ReceiptDetail receiptId={showDetail} />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

function ReceiptDetail({ receiptId }: { receiptId: number }) {
  const receiptsQuery = trpc.erp.purchases.receipts.list.useQuery({ purchaseOrderId: undefined, limit: 100, offset: 0 });
  const receipt = receiptsQuery.data?.receipts?.find((r: any) => r.id === receiptId);
  if (!receipt) return <p className="text-muted-foreground">Chargement...</p>;
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3 text-sm">
        <div><span className="text-muted-foreground">N° :</span> <strong>{receipt.receiptNumber}</strong></div>
        <div><span className="text-muted-foreground">Date :</span> {formatDate(receipt.receiptDate)}</div>
        <div><span className="text-muted-foreground">Statut :</span> <Badge className={STATUS_COLORS[receipt.status]}>{STATUS_LABELS[receipt.status]}</Badge></div>
        <div><span className="text-muted-foreground">BL :</span> {receipt.deliveryNoteNumber || "—"}</div>
      </div>
      {receipt.notes && (
        <div className="text-sm"><span className="text-muted-foreground">Notes :</span> {receipt.notes}</div>
      )}
      <div className="flex items-center gap-2 pt-2">
        <CheckCircle className="w-4 h-4 text-green-600" />
        <span className="text-sm text-green-700">Réception enregistrée — stock mis à jour</span>
      </div>
    </div>
  );
}
