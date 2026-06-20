import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Search } from "lucide-react";
import { toast } from "sonner";

export default function ErpRealEstateSales() {
  const [open, setOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [page, setPage] = useState(0);

  const { data, isLoading, refetch } = trpc.erp.realEstate.sales.list.useQuery({ status: statusFilter === "all" ? undefined : statusFilter, limit: 50, offset: page * 50 });
  const { data: customersData } = trpc.erp.realEstate.customers.list.useQuery({ limit: 100, offset: 0 });
  const { data: unitsData } = trpc.erp.realEstate.units.list.useQuery({ limit: 100, offset: 0 });

  const createMutation = trpc.erp.realEstate.sales.create.useMutation({
    onSuccess: () => { toast.success("Vente créée"); setOpen(false); refetch(); },
    onError: (e) => toast.error(e.message),
  });
  const approveMutation = trpc.erp.realEstate.sales.approve.useMutation({
    onSuccess: () => { toast.success("Vente approuvée"); refetch(); },
    onError: (e) => toast.error(e.message),
  });

  const [form, setForm] = useState({ unitId: 0, customerId: 0, basePrice: 0, discountAmount: 0, extraFeesAmount: 0, taxAmount: 0, totalSaleAmount: 0 });

  const sales = data?.sales || [];
  const total = data?.total || 0;
  const customers = customersData?.customers || [];
  const units = unitsData?.units || [];

  const statusLabels: Record<string, string> = {
    draft: "Brouillon", pending_approval: "En attente", approved: "Approuvée", contract_signed: "Contrat signé",
    in_payment: "En paiement", fully_paid: "Payée", delivered: "Livrée", cancelled: "Annulée"
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Ventes Immobilières</h1>
          <p className="text-muted-foreground">{total} ventes enregistrées</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" /> Nouvelle Vente</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>Créer une Vente</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Unité</Label>
                <Select value={form.unitId ? String(form.unitId) : ""} onValueChange={v => setForm(f => ({ ...f, unitId: parseInt(v) }))}>
                  <SelectTrigger><SelectValue placeholder="Sélectionner une unité" /></SelectTrigger>
                  <SelectContent>{units.map((u: any) => <SelectItem key={u.id} value={String(u.id)}>{u.unitCode} — {u.title}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Client</Label>
                <Select value={form.customerId ? String(form.customerId) : ""} onValueChange={v => setForm(f => ({ ...f, customerId: parseInt(v) }))}>
                  <SelectTrigger><SelectValue placeholder="Sélectionner un client" /></SelectTrigger>
                  <SelectContent>{customers.map((c: any) => <SelectItem key={c.id} value={String(c.id)}>{c.customerNumber} — {c.customerType === "company" ? c.companyName : `${c.firstName} ${c.lastName}`}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Prix de base (XOF)</Label><Input type="number" value={form.basePrice} onChange={e => { const v = parseInt(e.target.value) || 0; setForm(f => ({ ...f, basePrice: v, totalSaleAmount: v - f.discountAmount + f.extraFeesAmount + f.taxAmount })); }} /></div>
                <div><Label>Remise (XOF)</Label><Input type="number" value={form.discountAmount} onChange={e => { const v = parseInt(e.target.value) || 0; setForm(f => ({ ...f, discountAmount: v, totalSaleAmount: f.basePrice - v + f.extraFeesAmount + f.taxAmount })); }} /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Frais supplémentaires</Label><Input type="number" value={form.extraFeesAmount} onChange={e => { const v = parseInt(e.target.value) || 0; setForm(f => ({ ...f, extraFeesAmount: v, totalSaleAmount: f.basePrice - f.discountAmount + v + f.taxAmount })); }} /></div>
                <div><Label>Taxes</Label><Input type="number" value={form.taxAmount} onChange={e => { const v = parseInt(e.target.value) || 0; setForm(f => ({ ...f, taxAmount: v, totalSaleAmount: f.basePrice - f.discountAmount + f.extraFeesAmount + v })); }} /></div>
              </div>
              <div className="p-3 bg-muted rounded text-center">
                <span className="text-sm text-muted-foreground">Total: </span>
                <span className="text-lg font-bold">{form.totalSaleAmount.toLocaleString("fr-FR")} XOF</span>
              </div>
              <Button className="w-full" onClick={() => createMutation.mutate(form)} disabled={createMutation.isPending || !form.unitId || !form.customerId}>
                {createMutation.isPending ? "Création..." : "Créer la vente"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex gap-2 flex-wrap">
        {["all", "draft", "pending_approval", "approved", "contract_signed", "in_payment", "fully_paid", "delivered", "cancelled"].map(s => (
          <Button key={s} variant={statusFilter === s ? "default" : "outline"} size="sm" onClick={() => { setStatusFilter(s); setPage(0); }}>
            {s === "all" ? "Tous" : statusLabels[s] || s}
          </Button>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-16 bg-muted rounded animate-pulse" />)}</div>
      ) : sales.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">Aucune vente trouvée</CardContent></Card>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="text-left py-3 px-3">N° Vente</th>
                <th className="text-left py-3 px-3">Date</th>
                <th className="text-center py-3 px-3">Statut</th>
                <th className="text-right py-3 px-3">Montant (XOF)</th>
                <th className="text-center py-3 px-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {sales.map((s: any) => (
                <tr key={s.id} className="border-b hover:bg-muted/30">
                  <td className="py-3 px-3 font-mono text-xs">{s.saleNumber}</td>
                  <td className="py-3 px-3">{s.saleDate ? new Date(s.saleDate).toLocaleDateString("fr-FR") : "—"}</td>
                  <td className="py-3 px-3 text-center">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${s.status === "fully_paid" || s.status === "delivered" ? "bg-green-100 text-green-800" : s.status === "in_payment" ? "bg-yellow-100 text-yellow-800" : s.status === "cancelled" ? "bg-red-100 text-red-800" : "bg-gray-100 text-gray-800"}`}>
                      {statusLabels[s.status] || s.status}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-right font-medium">{(s.totalSaleAmount || 0).toLocaleString("fr-FR")}</td>
                  <td className="py-3 px-3 text-center">
                    {s.status === "pending_approval" && (
                      <Button size="sm" variant="outline" onClick={() => approveMutation.mutate({ id: s.id })}>Approuver</Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {total > 50 && (
        <div className="flex justify-center gap-2">
          <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(p => p - 1)}>Précédent</Button>
          <span className="text-sm text-muted-foreground py-2">Page {page + 1} / {Math.ceil(total / 50)}</span>
          <Button variant="outline" size="sm" disabled={(page + 1) * 50 >= total} onClick={() => setPage(p => p + 1)}>Suivant</Button>
        </div>
      )}
    </div>
  );
}
