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

export default function ErpRealEstateReservations() {
  const [open, setOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [page, setPage] = useState(0);

  const { data, isLoading, refetch } = trpc.erp.realEstate.reservations.list.useQuery({ status: statusFilter === "all" ? undefined : statusFilter, limit: 50, offset: page * 50 });
  const { data: customersData } = trpc.erp.realEstate.customers.list.useQuery({ limit: 100, offset: 0 });
  const { data: unitsData } = trpc.erp.realEstate.units.list.useQuery({ limit: 100, offset: 0, status: "available" });

  const createMutation = trpc.erp.realEstate.reservations.create.useMutation({
    onSuccess: () => { toast.success("Réservation créée"); setOpen(false); refetch(); },
    onError: (e) => toast.error(e.message),
  });

  const cancelMutation = trpc.erp.realEstate.reservations.cancel.useMutation({
    onSuccess: () => { toast.success("Réservation annulée"); refetch(); },
    onError: (e) => toast.error(e.message),
  });

  const [form, setForm] = useState({ unitId: 0, customerId: 0, reservationAmount: 0, reservationDate: Date.now() });

  const reservations = data?.reservations || [];
  const total = data?.total || 0;
  const customers = customersData?.customers || [];
  const units = unitsData?.units || [];

  const statusLabels: Record<string, string> = {
    draft: "Brouillon", pending_payment: "Attente paiement", active: "Active",
    expired: "Expirée", converted_to_sale: "Convertie", cancelled: "Annulée", refunded: "Remboursée"
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Réservations</h1>
          <p className="text-muted-foreground">{total} réservations</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" /> Nouvelle Réservation</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Créer une Réservation</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Unité disponible</Label>
                <Select value={form.unitId ? String(form.unitId) : ""} onValueChange={v => setForm(f => ({ ...f, unitId: parseInt(v) }))}>
                  <SelectTrigger><SelectValue placeholder="Sélectionner" /></SelectTrigger>
                  <SelectContent>{units.map((u: any) => <SelectItem key={u.id} value={String(u.id)}>{u.unitCode} — {u.title}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Client</Label>
                <Select value={form.customerId ? String(form.customerId) : ""} onValueChange={v => setForm(f => ({ ...f, customerId: parseInt(v) }))}>
                  <SelectTrigger><SelectValue placeholder="Sélectionner" /></SelectTrigger>
                  <SelectContent>{customers.map((c: any) => <SelectItem key={c.id} value={String(c.id)}>{c.customerNumber} — {c.customerType === "company" ? c.companyName : `${c.firstName} ${c.lastName}`}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Montant réservation (XOF)</Label><Input type="number" value={form.reservationAmount} onChange={e => setForm(f => ({ ...f, reservationAmount: parseInt(e.target.value) || 0 }))} /></div>
              <Button className="w-full" onClick={() => createMutation.mutate(form)} disabled={createMutation.isPending || !form.unitId || !form.customerId}>
                {createMutation.isPending ? "Création..." : "Créer la réservation"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex gap-2 flex-wrap">
        {["all", "draft", "pending_payment", "active", "expired", "converted_to_sale", "cancelled"].map(s => (
          <Button key={s} variant={statusFilter === s ? "default" : "outline"} size="sm" onClick={() => { setStatusFilter(s); setPage(0); }}>
            {s === "all" ? "Toutes" : statusLabels[s] || s}
          </Button>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-16 bg-muted rounded animate-pulse" />)}</div>
      ) : reservations.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">Aucune réservation trouvée</CardContent></Card>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="text-left py-3 px-3">N° Réservation</th>
                <th className="text-left py-3 px-3">Date</th>
                <th className="text-center py-3 px-3">Statut</th>
                <th className="text-right py-3 px-3">Montant (XOF)</th>
                <th className="text-center py-3 px-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {reservations.map((r: any) => (
                <tr key={r.id} className="border-b hover:bg-muted/30">
                  <td className="py-3 px-3 font-mono text-xs">{r.reservationNumber}</td>
                  <td className="py-3 px-3">{r.reservationDate ? new Date(r.reservationDate).toLocaleDateString("fr-FR") : "—"}</td>
                  <td className="py-3 px-3 text-center">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${r.status === "active" ? "bg-green-100 text-green-800" : r.status === "converted_to_sale" ? "bg-blue-100 text-blue-800" : r.status === "cancelled" || r.status === "expired" ? "bg-red-100 text-red-800" : "bg-gray-100 text-gray-800"}`}>
                      {statusLabels[r.status] || r.status}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-right font-medium">{(r.reservationAmount || 0).toLocaleString("fr-FR")}</td>
                  <td className="py-3 px-3 text-center space-x-1">

                    {(r.status === "draft" || r.status === "active") && <Button size="sm" variant="ghost" className="text-red-600" onClick={() => cancelMutation.mutate({ id: r.id, reason: "Annulation client" })}>Annuler</Button>}
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
