import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { ArrowLeft, Plus, Send, Award, Trash2, FileText, Package } from "lucide-react";
import { useLocation, useParams } from "wouter";

export default function ErpRfqDetail() {
  
  const [, navigate] = useLocation();
  const params = useParams<{ id: string }>();
  const rfqId = parseInt(params.id || "0");

  const { data: rfq, refetch } = trpc.erp.rfq.crud.getById.useQuery({ id: rfqId }, { enabled: rfqId > 0 });
  const sendMutation = trpc.erp.rfq.actions.send.useMutation({ onSuccess: () => { toast.success("RFQ envoyée"); refetch(); }, onError: (e) => toast.error(e.message) });
  const cancelMutation = trpc.erp.rfq.actions.cancel.useMutation({ onSuccess: () => { toast.success("RFQ annulée"); refetch(); } });
  const convertMutation = trpc.erp.rfq.convert.convertToPo.useMutation({ onSuccess: (r) => { toast.success(`BC créé: ${r.poNumber}`); refetch(); }, onError: (e) => toast.error(e.message) });

  // Add line
  const [showAddLine, setShowAddLine] = useState(false);
  const [newLine, setNewLine] = useState({ description: "", quantity: 100, unit: "unité", estimatedUnitPrice: 0 });
  const addLineMutation = trpc.erp.rfq.lines.add.useMutation({ onSuccess: () => { toast.success("Ligne ajoutée"); setShowAddLine(false); refetch(); } });

  // Add vendor
  const [showAddVendor, setShowAddVendor] = useState(false);
  const [vendorId, setVendorId] = useState("");
  const addVendorMutation = trpc.erp.rfq.vendors.add.useMutation({ onSuccess: () => { toast.success("Fournisseur ajouté"); setShowAddVendor(false); refetch(); } });

  // Accept quote
  const acceptQuoteMutation = trpc.erp.rfq.quotes.accept.useMutation({ onSuccess: () => { toast.success("Offre acceptée"); refetch(); }, onError: (e) => toast.error(e.message) });

  if (!rfq) return <div className="p-8 text-center text-muted-foreground">Chargement...</div>;

  const canEdit = rfq.status === "draft";
  const canSend = rfq.status === "draft" && (rfq.lines?.length || 0) > 0 && (rfq.vendors?.length || 0) > 0;
  const canAward = rfq.status === "responses_received" || rfq.status === "under_evaluation";
  const canConvert = rfq.status === "awarded";

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => navigate("/erp/rfqs")}><ArrowLeft className="h-4 w-4 mr-1" />Retour</Button>
        <div className="flex-1">
          <h1 className="text-xl font-bold">{rfq.title}</h1>
          <p className="text-sm text-muted-foreground">{rfq.rfqNumber}</p>
        </div>
        <Badge className="text-sm">{rfq.status}</Badge>
      </div>

      {/* Actions */}
      <div className="flex gap-2 flex-wrap">
        {canSend && <Button onClick={() => sendMutation.mutate({ id: rfqId })} disabled={sendMutation.isPending}><Send className="h-4 w-4 mr-2" />Envoyer aux fournisseurs</Button>}
        {canConvert && <Button onClick={() => convertMutation.mutate({ rfqId })} disabled={convertMutation.isPending}><Package className="h-4 w-4 mr-2" />Convertir en BC</Button>}
        {canEdit && <Button variant="destructive" size="sm" onClick={() => cancelMutation.mutate({ id: rfqId })}><Trash2 className="h-4 w-4 mr-2" />Annuler</Button>}
      </div>

      {/* Info */}
      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-base">Informations</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Date émission</span><span>{new Date(rfq.issueDate).toLocaleDateString("fr-FR")}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Date limite</span><span>{rfq.responseDeadline ? new Date(rfq.responseDeadline).toLocaleDateString("fr-FR") : "—"}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Méthode</span><span className="capitalize">{rfq.selectionMethod?.replace(/_/g, " ")}</span></div>
            {rfq.project && <div className="flex justify-between"><span className="text-muted-foreground">Projet</span><span>{rfq.project.name}</span></div>}
            {rfq.description && <p className="pt-2 text-muted-foreground">{rfq.description}</p>}
          </CardContent>
        </Card>

        {/* Vendors */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Fournisseurs invités ({rfq.vendors?.length || 0})</CardTitle>
            {canEdit && (
              <Dialog open={showAddVendor} onOpenChange={setShowAddVendor}>
                <DialogTrigger asChild><Button size="sm" variant="outline"><Plus className="h-3 w-3 mr-1" />Ajouter</Button></DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Ajouter un fournisseur</DialogTitle></DialogHeader>
                  <div className="space-y-4 pt-4">
                    <div><Label>ID Fournisseur</Label><Input type="number" value={vendorId} onChange={(e) => setVendorId(e.target.value)} /></div>
                    <Button onClick={() => addVendorMutation.mutate({ rfqId, vendorId: parseInt(vendorId) })} disabled={!vendorId}>Ajouter</Button>
                  </div>
                </DialogContent>
              </Dialog>
            )}
          </CardHeader>
          <CardContent>
            {rfq.vendors?.length === 0 ? <p className="text-sm text-muted-foreground">Aucun fournisseur</p> : (
              <div className="space-y-2">
                {rfq.vendors?.map((v: any) => (
                  <div key={v.id} className="flex items-center justify-between text-sm border-b pb-2">
                    <span>Fournisseur #{v.vendorId}</span>
                    <Badge variant="outline">{v.status}</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Lines */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Lignes de la RFQ ({rfq.lines?.length || 0})</CardTitle>
          {canEdit && (
            <Dialog open={showAddLine} onOpenChange={setShowAddLine}>
              <DialogTrigger asChild><Button size="sm"><Plus className="h-3 w-3 mr-1" />Ajouter ligne</Button></DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Ajouter une ligne</DialogTitle></DialogHeader>
                <div className="space-y-4 pt-4">
                  <div><Label>Description *</Label><Input value={newLine.description} onChange={(e) => setNewLine({ ...newLine, description: e.target.value })} /></div>
                  <div className="grid grid-cols-3 gap-2">
                    <div><Label>Quantité (x100)</Label><Input type="number" value={newLine.quantity} onChange={(e) => setNewLine({ ...newLine, quantity: parseInt(e.target.value) || 0 })} /></div>
                    <div><Label>Unité</Label><Input value={newLine.unit} onChange={(e) => setNewLine({ ...newLine, unit: e.target.value })} /></div>
                    <div><Label>Prix unit. est.</Label><Input type="number" value={newLine.estimatedUnitPrice} onChange={(e) => setNewLine({ ...newLine, estimatedUnitPrice: parseInt(e.target.value) || 0 })} /></div>
                  </div>
                  <Button onClick={() => addLineMutation.mutate({ rfqId, ...newLine })} disabled={!newLine.description}>Ajouter</Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </CardHeader>
        <CardContent>
          {rfq.lines?.length === 0 ? <p className="text-sm text-muted-foreground">Aucune ligne</p> : (
            <table className="w-full text-sm">
              <thead><tr className="border-b text-left text-muted-foreground"><th className="pb-2">Description</th><th className="pb-2">Qté</th><th className="pb-2">Unité</th><th className="pb-2">Prix est.</th><th className="pb-2">Total est.</th></tr></thead>
              <tbody>
                {rfq.lines?.map((l: any) => (
                  <tr key={l.id} className="border-b">
                    <td className="py-2">{l.description}</td>
                    <td className="py-2">{(l.quantity / 100).toFixed(2)}</td>
                    <td className="py-2">{l.unit}</td>
                    <td className="py-2">{(l.estimatedUnitPrice / 100).toLocaleString("fr-FR")} F</td>
                    <td className="py-2">{(l.estimatedTotal / 100).toLocaleString("fr-FR")} F</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      {/* Quotes */}
      {(rfq.quotes?.length || 0) > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Offres reçues ({rfq.quotes?.length})</CardTitle>
            <Button variant="outline" size="sm" onClick={() => navigate(`/erp/rfqs/${rfqId}/compare`)}><FileText className="h-3 w-3 mr-1" />Comparer</Button>
          </CardHeader>
          <CardContent>
            <table className="w-full text-sm">
              <thead><tr className="border-b text-left text-muted-foreground"><th className="pb-2">N° Offre</th><th className="pb-2">Fournisseur</th><th className="pb-2">Montant TTC</th><th className="pb-2">Délai</th><th className="pb-2">Statut</th><th className="pb-2">Actions</th></tr></thead>
              <tbody>
                {rfq.quotes?.map((q: any) => (
                  <tr key={q.id} className="border-b">
                    <td className="py-2 font-mono text-xs">{q.quoteNumber || `#${q.id}`}</td>
                    <td className="py-2">Fournisseur #{q.vendorId}</td>
                    <td className="py-2 font-medium">{(q.totalAmount / 100).toLocaleString("fr-FR")} F</td>
                    <td className="py-2">{q.deliveryDelayDays ? `${q.deliveryDelayDays}j` : "—"}</td>
                    <td className="py-2"><Badge variant="outline">{q.status}</Badge></td>
                    <td className="py-2">
                      {canAward && q.status === "received" && (
                        <Button size="sm" variant="default" onClick={() => acceptQuoteMutation.mutate({ quoteId: q.id })}>
                          <Award className="h-3 w-3 mr-1" />Attribuer
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
