import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useErpPermissions } from "@/hooks/useErpPermissions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { FileText, Plus, CheckCircle, Send, Eye, Package, Download, Loader2, Paperclip, Upload } from "lucide-react";

const STATUS_LABELS: Record<string, string> = {
  draft: "Brouillon", approved: "Approuvé", sent: "Envoyé", partially_received: "Partiellement reçu",
  fully_received: "Reçu", invoiced: "Facturé", cancelled: "Annulé", closed: "Clôturé",
};
const STATUS_COLORS: Record<string, string> = {
  draft: "bg-gray-100 text-gray-700", approved: "bg-green-100 text-green-800", sent: "bg-blue-100 text-blue-800",
  partially_received: "bg-yellow-100 text-yellow-800", fully_received: "bg-emerald-100 text-emerald-800",
  invoiced: "bg-purple-100 text-purple-800", cancelled: "bg-red-100 text-red-800", closed: "bg-gray-200 text-gray-600",
};

function formatXOF(amount: number) {
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "XOF", maximumFractionDigits: 0 }).format(amount);
}
function formatDate(ts: number) {
  return new Date(ts).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
}

export default function ErpPurchaseOrders() {
  const { hasPermission } = useErpPermissions();
  const canView = hasPermission("erp_purchases", "view");
  const canCreate = hasPermission("erp_purchases", "create");
  const canApprove = hasPermission("erp_purchases", "approve");

  const [statusFilter, setStatusFilter] = useState<string>("");
  const [typeFilter, setTypeFilter] = useState<string>("");
  const [showCreate, setShowCreate] = useState(false);
  const [showDetail, setShowDetail] = useState<number | null>(null);
  const [lines, setLines] = useState([{ itemType: "material", designation: "", description: "", lineDate: "", quantityOrdered: 1, unit: "unité", unitPrice: 0, taxRate: 1800 }]);

  const ordersQuery = trpc.erp.purchases.orders.list.useQuery({
    status: statusFilter && statusFilter !== "all" ? statusFilter : undefined,
    purchaseType: typeFilter && typeFilter !== "all" ? typeFilter as "CAPEX" | "OPEX" : undefined,
    limit: 50, offset: 0,
  }, { enabled: canView });

  const detailQuery = trpc.erp.purchases.orders.getById.useQuery(
    { id: showDetail! }, { enabled: !!showDetail }
  );

  const vendorsQuery = trpc.erp.vendors.list.useQuery({ limit: 100, offset: 0 }, { enabled: canView });
  const projectsQuery = trpc.erp.projects.list.useQuery({ limit: 100, offset: 0 }, { enabled: canView });

  const createMutation = trpc.erp.purchases.orders.create.useMutation({
    onSuccess: () => { toast.success("Bon de commande créé"); setShowCreate(false); ordersQuery.refetch(); },
    onError: (e) => toast.error(e.message),
  });
  const approveMutation = trpc.erp.purchases.orders.approve.useMutation({
    onSuccess: () => { toast.success("BC approuvé"); ordersQuery.refetch(); detailQuery.refetch(); },
    onError: (e) => toast.error(e.message),
  });
  const sendMutation = trpc.erp.purchases.orders.send.useMutation({
    onSuccess: () => { toast.success("BC envoyé au fournisseur"); ordersQuery.refetch(); detailQuery.refetch(); },
    onError: (e) => toast.error(e.message),
  });
  const uploadLineMutation = trpc.erp.purchases.orders.uploadLineAttachment.useMutation({
    onSuccess: () => { toast.success("Pièce jointe ajoutée"); detailQuery.refetch(); },
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
            <FileText className="h-6 w-6 text-primary" />
            Bons de Commande
          </h1>
          <p className="text-muted-foreground mt-1">Gestion des bons de commande fournisseurs</p>
        </div>
        {canCreate && (
          <Button onClick={() => setShowCreate(true)}>
            <Plus className="h-4 w-4 mr-1" /> Nouveau BC
          </Button>
        )}
      </div>

      {/* KPIs */}
      {ordersQuery.data && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="border rounded-lg p-4">
            <p className="text-xs text-muted-foreground">Total BC</p>
            <p className="text-2xl font-bold">{ordersQuery.data.total}</p>
          </div>
        </div>
      )}

      {/* Filtres */}
      <div className="flex gap-3 items-center">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-48"><SelectValue placeholder="Tous les statuts" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les statuts</SelectItem>
            <SelectItem value="draft">Brouillon</SelectItem>
            <SelectItem value="approved">Approuvé</SelectItem>
            <SelectItem value="sent">Envoyé</SelectItem>
            <SelectItem value="partially_received">Partiellement reçu</SelectItem>
            <SelectItem value="fully_received">Reçu</SelectItem>
            <SelectItem value="invoiced">Facturé</SelectItem>
            <SelectItem value="cancelled">Annulé</SelectItem>
          </SelectContent>
        </Select>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-48"><SelectValue placeholder="Tous les types" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les types</SelectItem>
            <SelectItem value="CAPEX">CAPEX (Investissement)</SelectItem>
            <SelectItem value="OPEX">OPEX (Fonctionnement)</SelectItem>
          </SelectContent>
        </Select>
        {(statusFilter && statusFilter !== "all" || typeFilter && typeFilter !== "all") && (
          <Button variant="ghost" size="sm" onClick={() => { setStatusFilter(""); setTypeFilter(""); }}>Réinitialiser</Button>
        )}
      </div>

      {/* Tableau */}
      <div className="border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="text-left p-3 font-medium">N° BC</th>
              <th className="text-left p-3 font-medium">Date</th>
              <th className="text-left p-3 font-medium">Type</th>
              <th className="text-left p-3 font-medium">Statut</th>
              <th className="text-right p-3 font-medium">Montant TTC</th>
              <th className="text-center p-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {ordersQuery.data?.orders?.map((po: any) => (
              <tr key={po.id} className="border-t hover:bg-muted/30">
                <td className="p-3 font-mono text-xs">{po.poNumber}</td>
                <td className="p-3 text-muted-foreground">{formatDate(po.orderDate)}</td>
                <td className="p-3"><Badge variant="outline" className="text-xs">{po.purchaseType || "OPEX"}</Badge></td>
                <td className="p-3"><Badge className={`text-xs ${STATUS_COLORS[po.status] || ""}`}>{STATUS_LABELS[po.status] || po.status}</Badge></td>
                <td className="p-3 text-right font-semibold">{formatXOF(po.totalAmount || 0)}</td>
                <td className="p-3 text-center">
                  <Button size="sm" variant="ghost" onClick={() => setShowDetail(po.id)}><Eye className="h-4 w-4" /></Button>
                </td>
              </tr>
            ))}
            {(!ordersQuery.data?.orders || ordersQuery.data.orders.length === 0) && (
              <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">Aucun bon de commande</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* DIALOG: Créer BC */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Nouveau Bon de Commande</DialogTitle></DialogHeader>
          <form onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            const vendorId = Number(fd.get("vendorId"));
            if (!vendorId) { toast.error("Sélectionnez un fournisseur"); return; }
            createMutation.mutate({
              vendorId,
              projectId: fd.get("projectId") ? Number(fd.get("projectId")) : null,
              purchaseType: (fd.get("purchaseType") as "CAPEX" | "OPEX") || "OPEX",
              lines: lines.map(l => ({
                itemType: l.itemType,
                designation: l.designation || undefined,
                description: l.description,
                lineDate: l.lineDate ? new Date(l.lineDate).getTime() : undefined,
                quantityOrdered: l.quantityOrdered,
                unit: l.unit,
                unitPrice: l.unitPrice,
                taxRate: l.taxRate,
              })),
            });
          }} className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>Fournisseur *</Label>
                <Select name="vendorId" required>
                  <SelectTrigger><SelectValue placeholder="Sélectionner" /></SelectTrigger>
                  <SelectContent>
                    {vendorsQuery.data?.items?.map((v: any) => (
                      <SelectItem key={v.id} value={String(v.id)}>{v.companyName}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
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
                <Label>Type *</Label>
                <Select name="purchaseType" defaultValue="OPEX">
                  <SelectTrigger><SelectValue placeholder="Type" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CAPEX">CAPEX (Investissement)</SelectItem>
                    <SelectItem value="OPEX">OPEX (Fonctionnement)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label className="text-base font-semibold">Lignes de commande</Label>
                <Button type="button" size="sm" variant="outline" onClick={() => setLines([...lines, { itemType: "material", designation: "", description: "", lineDate: "", quantityOrdered: 1, unit: "unité", unitPrice: 0, taxRate: 1800 }])}>
                  <Plus className="h-3 w-3 mr-1" /> Ligne
                </Button>
              </div>
              {lines.map((line, idx) => (
                <div key={idx} className="border p-3 rounded space-y-2">
                  <div className="grid grid-cols-12 gap-2 items-end">
                    <div className="col-span-2">
                      <Label className="text-xs">Type</Label>
                      <Select value={line.itemType} onValueChange={(v) => { const nl = [...lines]; nl[idx].itemType = v; setLines(nl); }}>
                        <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="material">Matériau</SelectItem>
                          <SelectItem value="equipment">Équipement</SelectItem>
                          <SelectItem value="service">Service</SelectItem>
                          <SelectItem value="subcontracting">Sous-traitance</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="col-span-3">
                      <Label className="text-xs">Désignation</Label>
                      <Input className="h-8 text-xs" placeholder="Désignation" value={line.designation} onChange={(e) => { const nl = [...lines]; nl[idx].designation = e.target.value; setLines(nl); }} />
                    </div>
                    <div className="col-span-3">
                      <Label className="text-xs">Description *</Label>
                      <Input className="h-8 text-xs" value={line.description} onChange={(e) => { const nl = [...lines]; nl[idx].description = e.target.value; setLines(nl); }} required />
                    </div>
                    <div className="col-span-2">
                      <Label className="text-xs">Date</Label>
                      <Input className="h-8 text-xs" type="date" value={line.lineDate} onChange={(e) => { const nl = [...lines]; nl[idx].lineDate = e.target.value; setLines(nl); }} />
                    </div>
                    <div className="col-span-1">
                      {lines.length > 1 && (
                        <Button type="button" size="sm" variant="ghost" className="h-8 w-8 p-0 text-red-500" onClick={() => setLines(lines.filter((_, i) => i !== idx))}>×</Button>
                      )}
                    </div>
                  </div>
                  <div className="grid grid-cols-12 gap-2 items-end">
                    <div className="col-span-2">
                      <Label className="text-xs">Qté</Label>
                      <Input className="h-8 text-xs" type="number" min={1} value={line.quantityOrdered} onChange={(e) => { const nl = [...lines]; nl[idx].quantityOrdered = parseInt(e.target.value) || 1; setLines(nl); }} />
                    </div>
                    <div className="col-span-2">
                      <Label className="text-xs">Unité</Label>
                      <Input className="h-8 text-xs" value={line.unit} onChange={(e) => { const nl = [...lines]; nl[idx].unit = e.target.value; setLines(nl); }} />
                    </div>
                    <div className="col-span-3">
                      <Label className="text-xs">Prix unitaire HT</Label>
                      <Input className="h-8 text-xs" type="number" min={0} value={line.unitPrice} onChange={(e) => { const nl = [...lines]; nl[idx].unitPrice = parseInt(e.target.value) || 0; setLines(nl); }} />
                    </div>
                    <div className="col-span-2">
                      <Label className="text-xs">TVA %</Label>
                      <Input className="h-8 text-xs" type="number" value={line.taxRate / 100} onChange={(e) => { const nl = [...lines]; nl[idx].taxRate = Math.round(parseFloat(e.target.value) * 100) || 0; setLines(nl); }} />
                    </div>
                    <div className="col-span-3 text-xs text-right pt-4">
                      Montant: <strong>{formatXOF(line.quantityOrdered * line.unitPrice)}</strong>
                    </div>
                  </div>
                </div>
              ))}
              <p className="text-xs text-muted-foreground text-right">
                Total HT: <strong>{formatXOF(lines.reduce((s, l) => s + l.quantityOrdered * l.unitPrice, 0))}</strong>
              </p>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowCreate(false)}>Annuler</Button>
              <Button type="submit" disabled={createMutation.isPending}>Créer le BC</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* DIALOG: Détail BC */}
      <Dialog open={!!showDetail} onOpenChange={() => setShowDetail(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Bon de Commande {detailQuery.data?.poNumber}</DialogTitle></DialogHeader>
          {detailQuery.data && (
            <div className="space-y-4">
              <div className="grid grid-cols-4 gap-4 text-sm">
                <div><span className="text-muted-foreground">Statut:</span> <Badge className={`ml-1 text-xs ${STATUS_COLORS[detailQuery.data.status]}`}>{STATUS_LABELS[detailQuery.data.status]}</Badge></div>
                <div><span className="text-muted-foreground">Type:</span> <Badge className="ml-1 text-xs" variant="outline">{detailQuery.data.purchaseType || "OPEX"}</Badge></div>
                <div><span className="text-muted-foreground">Date:</span> {formatDate(detailQuery.data.orderDate)}</div>
                <div><span className="text-muted-foreground">Total TTC:</span> <strong>{formatXOF(detailQuery.data.totalAmount || 0)}</strong></div>
              </div>
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full text-xs">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="text-left p-2">Type</th>
                      <th className="text-left p-2">Désignation</th>
                      <th className="text-left p-2">Description</th>
                      <th className="text-center p-2">Date</th>
                      <th className="text-right p-2">Qté</th>
                      <th className="text-right p-2">PU HT</th>
                      <th className="text-right p-2">Total</th>
                      <th className="text-center p-2">Pièce</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detailQuery.data.lines?.map((l: any) => (
                      <tr key={l.id} className="border-t">
                        <td className="p-2"><Badge variant="outline" className="text-xs">{l.itemType}</Badge></td>
                        <td className="p-2 font-medium">{l.designation || "—"}</td>
                        <td className="p-2">{l.description}</td>
                        <td className="p-2 text-center">{l.lineDate ? formatDate(l.lineDate) : "—"}</td>
                        <td className="p-2 text-right">{l.quantityOrdered}</td>
                        <td className="p-2 text-right">{formatXOF(l.unitPrice)}</td>
                        <td className="p-2 text-right font-semibold">{formatXOF(l.lineTotal)}</td>
                        <td className="p-2 text-center">
                          {l.attachmentUrl ? (
                            <a href={l.attachmentUrl} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline"><Paperclip className="h-3 w-3 inline" /></a>
                          ) : (
                            <label className="cursor-pointer text-muted-foreground hover:text-foreground">
                              <Upload className="h-3 w-3 inline" />
                              <input type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx" onChange={async (e) => {
                                const file = e.target.files?.[0];
                                if (!file) return;
                                if (file.size > 5 * 1024 * 1024) { toast.error("Max 5 Mo"); return; }
                                const reader = new FileReader();
                                reader.onload = () => {
                                  const base64 = (reader.result as string).split(",")[1];
                                  uploadLineMutation.mutate({ lineId: l.id, fileName: file.name, fileBase64: base64, contentType: file.type });
                                };
                                reader.readAsDataURL(file);
                              }} />
                            </label>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex gap-2 justify-end">
                <GeneratePoPdfButton orderId={detailQuery.data.id} poNumber={detailQuery.data.poNumber} />
                {detailQuery.data.status === "draft" && canApprove && (
                  <Button size="sm" onClick={() => approveMutation.mutate({ id: detailQuery.data!.id })}>
                    <CheckCircle className="h-4 w-4 mr-1" /> Approuver
                  </Button>
                )}
                {detailQuery.data.status === "approved" && canCreate && (
                  <Button size="sm" onClick={() => sendMutation.mutate({ id: detailQuery.data!.id })}>
                    <Send className="h-4 w-4 mr-1" /> Envoyer au Fournisseur
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}


// --- Composant Bouton PDF Bon de Commande ---
function GeneratePoPdfButton({ orderId, poNumber }: { orderId: number; poNumber: string }) {
  const generatePdf = trpc.erp.purchases.orders.generatePdf.useMutation({
    onSuccess: (data) => {
      toast.success("PDF du bon de commande généré");
      window.open(data.url, "_blank");
    },
    onError: (err) => {
      toast.error("Erreur lors de la génération du PDF : " + err.message);
    },
  });

  return (
    <Button
      size="sm"
      variant="outline"
      onClick={() => generatePdf.mutate({ id: orderId })}
      disabled={generatePdf.isPending}
    >
      {generatePdf.isPending ? (
        <Loader2 className="h-4 w-4 mr-1 animate-spin" />
      ) : (
        <Download className="h-4 w-4 mr-1" />
      )}
      PDF Bon de Commande
    </Button>
  );
}
