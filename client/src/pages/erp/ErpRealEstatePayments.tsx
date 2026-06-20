import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus } from "lucide-react";
import { toast } from "sonner";

export default function ErpRealEstatePayments() {
  const [open, setOpen] = useState(false);
  const [page, setPage] = useState(0);

  const { data, isLoading, refetch } = trpc.erp.realEstate.customerPayments.list.useQuery({ limit: 50, offset: page * 50 });
  const { data: salesData } = trpc.erp.realEstate.sales.list.useQuery({ limit: 100, offset: 0 });

  const createMutation = trpc.erp.realEstate.customerPayments.create.useMutation({
    onSuccess: () => { toast.success("Encaissement enregistré"); setOpen(false); refetch(); },
    onError: (e) => toast.error(e.message),
  });

  const [form, setForm] = useState({ saleId: 0, customerId: 0, amount: 0, paymentMethod: "bank_transfer", paymentDate: Date.now(), reference: "" });

  const payments = data?.payments || [];
  const total = data?.total || 0;
  const sales = salesData?.sales || [];

  const methodLabels: Record<string, string> = {
    bank_transfer: "Virement", check: "Chèque", cash: "Espèces", mobile_money: "Mobile Money", card: "Carte"
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Encaissements</h1>
          <p className="text-muted-foreground">{total} encaissements enregistrés</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" /> Nouvel Encaissement</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Enregistrer un Encaissement</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Vente</Label>
                <Select value={form.saleId ? String(form.saleId) : ""} onValueChange={v => setForm(f => ({ ...f, saleId: parseInt(v) }))}>
                  <SelectTrigger><SelectValue placeholder="Sélectionner une vente" /></SelectTrigger>
                  <SelectContent>{sales.map((s: any) => <SelectItem key={s.id} value={String(s.id)}>{s.saleNumber} — {(s.totalSaleAmount || 0).toLocaleString("fr-FR")} XOF</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Montant (XOF)</Label><Input type="number" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: parseInt(e.target.value) || 0 }))} /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
              <div><Label>Client ID</Label><Input type="number" value={form.customerId} onChange={e => setForm(f => ({ ...f, customerId: parseInt(e.target.value) || 0 }))} placeholder="ID client" /></div>
                <div>
                  <Label>Mode de paiement</Label>
                  <Select value={form.paymentMethod} onValueChange={v => setForm(f => ({ ...f, paymentMethod: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="bank_transfer">Virement</SelectItem>
                      <SelectItem value="check">Chèque</SelectItem>
                      <SelectItem value="cash">Espèces</SelectItem>
                      <SelectItem value="mobile_money">Mobile Money</SelectItem>
                      <SelectItem value="card">Carte</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div><Label>Référence</Label><Input value={form.reference} onChange={e => setForm(f => ({ ...f, reference: e.target.value }))} placeholder="N° chèque, réf. virement..." /></div>
              <Button className="w-full" onClick={() => createMutation.mutate(form)} disabled={createMutation.isPending || !form.saleId || !form.amount}>
                {createMutation.isPending ? "Enregistrement..." : "Enregistrer l'encaissement"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-16 bg-muted rounded animate-pulse" />)}</div>
      ) : payments.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">Aucun encaissement enregistré</CardContent></Card>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="text-left py-3 px-3">N° Reçu</th>
                <th className="text-left py-3 px-3">Date</th>
                <th className="text-center py-3 px-3">Mode</th>
                <th className="text-center py-3 px-3">Statut</th>
                <th className="text-right py-3 px-3">Montant (XOF)</th>
                <th className="text-left py-3 px-3">Référence</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((p: any) => (
                <tr key={p.id} className="border-b hover:bg-muted/30">
                  <td className="py-3 px-3 font-mono text-xs">{p.receiptNumber}</td>
                  <td className="py-3 px-3">{p.paymentDate ? new Date(p.paymentDate).toLocaleDateString("fr-FR") : "—"}</td>
                  <td className="py-3 px-3 text-center"><span className="px-2 py-0.5 rounded text-xs bg-muted">{methodLabels[p.paymentMethod] || p.paymentMethod}</span></td>
                  <td className="py-3 px-3 text-center">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${p.status === "confirmed" ? "bg-green-100 text-green-800" : p.status === "pending" ? "bg-yellow-100 text-yellow-800" : "bg-gray-100 text-gray-800"}`}>
                      {p.status}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-right font-medium">{(p.amount || 0).toLocaleString("fr-FR")}</td>
                  <td className="py-3 px-3 text-muted-foreground">{p.reference || "—"}</td>
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
