import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Building2 } from "lucide-react";
import { toast } from "sonner";

export default function ErpRealEstatePrograms() {
  const [open, setOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const { data, isLoading, refetch } = trpc.erp.realEstate.programs.list.useQuery({ limit: 100, offset: 0, status: statusFilter === "all" ? undefined : statusFilter });
  const createMutation = trpc.erp.realEstate.programs.create.useMutation({
    onSuccess: () => { toast.success("Programme créé"); setOpen(false); refetch(); },
    onError: (e) => toast.error(e.message),
  });

  const [form, setForm] = useState({ code: "", name: "", location: "", developerName: "", totalUnits: 0 });

  const programs = data?.programs || [];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Programmes Immobiliers</h1>
          <p className="text-muted-foreground">Gestion des programmes de promotion immobilière</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" /> Nouveau Programme</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Créer un Programme</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Code</Label><Input value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value }))} placeholder="PRG-001" /></div>
                <div><Label>Nom</Label><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Résidence Les Palmiers" /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Localisation</Label><Input value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} placeholder="Cocody, Abidjan" /></div>
                <div><Label>Promoteur</Label><Input value={form.developerName} onChange={e => setForm(f => ({ ...f, developerName: e.target.value }))} placeholder="Foncier225 SAS" /></div>
              </div>
              <div><Label>Nombre total d'unités</Label><Input type="number" value={form.totalUnits} onChange={e => setForm(f => ({ ...f, totalUnits: parseInt(e.target.value) || 0 }))} /></div>
              <Button className="w-full" onClick={() => createMutation.mutate(form)} disabled={createMutation.isPending}>
                {createMutation.isPending ? "Création..." : "Créer le programme"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex gap-2">
        {["all", "draft", "active", "completed", "suspended"].map(s => (
          <Button key={s} variant={statusFilter === s ? "default" : "outline"} size="sm" onClick={() => setStatusFilter(s)}>
            {s === "all" ? "Tous" : s}
          </Button>
        ))}
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">{[1,2,3].map(i => <div key={i} className="h-48 bg-muted rounded animate-pulse" />)}</div>
      ) : programs.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">Aucun programme trouvé</CardContent></Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {programs.map((p: any) => (
            <Card key={p.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">{p.name}</CardTitle>
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${p.status === "active" ? "bg-green-100 text-green-800" : p.status === "completed" ? "bg-blue-100 text-blue-800" : p.status === "suspended" ? "bg-red-100 text-red-800" : "bg-gray-100 text-gray-800"}`}>
                    {p.status}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground font-mono">{p.code}</p>
              </CardHeader>
              <CardContent className="space-y-2">
                <p className="text-sm text-muted-foreground">{p.location || "Localisation non définie"}</p>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="bg-muted rounded p-2">
                    <div className="text-lg font-bold">{p.totalUnits}</div>
                    <div className="text-xs text-muted-foreground">Total</div>
                  </div>
                  <div className="bg-green-50 rounded p-2">
                    <div className="text-lg font-bold text-green-700">{p.availableUnits}</div>
                    <div className="text-xs text-muted-foreground">Dispo</div>
                  </div>
                  <div className="bg-blue-50 rounded p-2">
                    <div className="text-lg font-bold text-blue-700">{p.soldUnits}</div>
                    <div className="text-xs text-muted-foreground">Vendues</div>
                  </div>
                </div>
                {p.developerName && <p className="text-xs text-muted-foreground">Promoteur: {p.developerName}</p>}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
