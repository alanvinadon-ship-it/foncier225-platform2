import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Search } from "lucide-react";
import { toast } from "sonner";

export default function ErpRealEstateUnits() {
  const [open, setOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [page, setPage] = useState(0);

  const { data, isLoading, refetch } = trpc.erp.realEstate.units.list.useQuery({ status: statusFilter === "all" ? undefined : statusFilter, limit: 50, offset: page * 50 });
  const { data: programsData } = trpc.erp.realEstate.programs.list.useQuery({ limit: 100, offset: 0 });

  const createMutation = trpc.erp.realEstate.units.create.useMutation({
    onSuccess: () => { toast.success("Unité créée"); setOpen(false); refetch(); },
    onError: (e) => toast.error(e.message),
  });

  const [form, setForm] = useState({ programId: 0, unitCode: "", unitType: "appartement", title: "", surfaceArea: "", numberOfRooms: 0, basePrice: 0 });

  const units = data?.units || [];
  const total = data?.total || 0;
  const programs = programsData?.programs || [];

  const unitTypes = ["maison", "villa", "appartement", "duplex", "studio", "local_commercial", "parking", "autre"];
  const statusLabels: Record<string, string> = { available: "Disponible", reserved: "Réservée", sold: "Vendue", delivered: "Livrée", blocked: "Bloquée" };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Unités Immobilières</h1>
          <p className="text-muted-foreground">{total} unités enregistrées</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" /> Nouvelle Unité</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Créer une Unité</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Programme</Label>
                <Select value={form.programId ? String(form.programId) : ""} onValueChange={v => setForm(f => ({ ...f, programId: parseInt(v) }))}>
                  <SelectTrigger><SelectValue placeholder="Sélectionner" /></SelectTrigger>
                  <SelectContent>{programs.map((p: any) => <SelectItem key={p.id} value={String(p.id)}>{p.code} — {p.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Code Unité</Label><Input value={form.unitCode} onChange={e => setForm(f => ({ ...f, unitCode: e.target.value }))} placeholder="U-001" /></div>
                <div>
                  <Label>Type</Label>
                  <Select value={form.unitType} onValueChange={v => setForm(f => ({ ...f, unitType: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{unitTypes.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div><Label>Titre</Label><Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Appartement T3 — Étage 2" /></div>
              <div className="grid grid-cols-3 gap-4">
                <div><Label>Surface (m²)</Label><Input value={form.surfaceArea} onChange={e => setForm(f => ({ ...f, surfaceArea: e.target.value }))} placeholder="85.5" /></div>
                <div><Label>Pièces</Label><Input type="number" value={form.numberOfRooms} onChange={e => setForm(f => ({ ...f, numberOfRooms: parseInt(e.target.value) || 0 }))} /></div>
                <div><Label>Prix (XOF)</Label><Input type="number" value={form.basePrice} onChange={e => setForm(f => ({ ...f, basePrice: parseInt(e.target.value) || 0 }))} /></div>
              </div>
              <Button className="w-full" onClick={() => createMutation.mutate({ ...form, surfaceArea: form.surfaceArea || undefined })} disabled={createMutation.isPending || !form.programId}>
                {createMutation.isPending ? "Création..." : "Créer l'unité"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex gap-2 flex-wrap">
        {["all", "available", "reserved", "sold", "delivered", "blocked"].map(s => (
          <Button key={s} variant={statusFilter === s ? "default" : "outline"} size="sm" onClick={() => { setStatusFilter(s); setPage(0); }}>
            {s === "all" ? "Toutes" : statusLabels[s] || s}
          </Button>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-16 bg-muted rounded animate-pulse" />)}</div>
      ) : units.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">Aucune unité trouvée</CardContent></Card>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="text-left py-3 px-3">Code</th>
                <th className="text-left py-3 px-3">Titre</th>
                <th className="text-center py-3 px-3">Type</th>
                <th className="text-center py-3 px-3">Surface</th>
                <th className="text-center py-3 px-3">Statut</th>
                <th className="text-right py-3 px-3">Prix (XOF)</th>
              </tr>
            </thead>
            <tbody>
              {units.map((u: any) => (
                <tr key={u.id} className="border-b hover:bg-muted/30">
                  <td className="py-3 px-3 font-mono text-xs">{u.unitCode}</td>
                  <td className="py-3 px-3 font-medium">{u.title}</td>
                  <td className="py-3 px-3 text-center"><span className="px-2 py-0.5 rounded text-xs bg-muted">{u.unitType}</span></td>
                  <td className="py-3 px-3 text-center">{u.surfaceArea ? `${u.surfaceArea} m²` : "—"}</td>
                  <td className="py-3 px-3 text-center">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${u.status === "available" ? "bg-green-100 text-green-800" : u.status === "sold" || u.status === "delivered" ? "bg-blue-100 text-blue-800" : u.status === "reserved" ? "bg-yellow-100 text-yellow-800" : "bg-gray-100 text-gray-800"}`}>
                      {statusLabels[u.status] || u.status}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-right font-medium">{u.basePrice ? u.basePrice.toLocaleString("fr-FR") : "—"}</td>
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
