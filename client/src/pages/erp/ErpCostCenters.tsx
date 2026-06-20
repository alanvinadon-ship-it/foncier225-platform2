import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Link } from "wouter";
import { ArrowLeft, Building2, Plus, Search } from "lucide-react";

export default function ErpCostCenters() {
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);

  const { data: costCenters, isLoading, refetch } = trpc.erp.analytics.costCenters.list.useQuery({});

  const createMutation = trpc.erp.analytics.costCenters.create.useMutation({
    onSuccess: () => { toast.success("Centre de coûts créé"); setShowCreate(false); refetch(); },
    onError: (e: any) => toast.error(e.message),
  });

  const [form, setForm] = useState({
    code: "", name: "", description: "", parentId: undefined as number | undefined,
  });

  const filtered = costCenters?.filter((cc: any) =>
    !search || cc.name.toLowerCase().includes(search.toLowerCase()) || cc.code.toLowerCase().includes(search.toLowerCase())
  ) || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/erp/analytics">
          <Button variant="ghost" size="sm"><ArrowLeft className="h-4 w-4 mr-1" />Retour</Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Building2 className="h-6 w-6 text-purple-600" />
            Centres de Coûts
          </h1>
          <p className="text-muted-foreground mt-1">Gestion des centres d'imputation analytique</p>
        </div>
        <Dialog open={showCreate} onOpenChange={setShowCreate}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" />Nouveau Centre</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Créer un Centre de Coûts</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Code</Label><Input value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value }))} placeholder="CC-001" /></div>
                <div><Label>Nom</Label><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Direction Générale" /></div>
              </div>
              <div><Label>Description</Label><Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} /></div>
              <Button className="w-full" onClick={() => createMutation.mutate(form)} disabled={createMutation.isPending}>
                {createMutation.isPending ? "Création..." : "Créer"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input className="pl-9" placeholder="Rechercher un centre..." value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">Chargement...</div>
      ) : filtered.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">
          <Building2 className="h-12 w-12 mx-auto mb-4 opacity-30" />
          <p>Aucun centre de coûts trouvé</p>
        </CardContent></Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left p-3 font-medium">Code</th>
                  <th className="text-left p-3 font-medium">Nom</th>
                  <th className="text-left p-3 font-medium">Description</th>
                  <th className="text-center p-3 font-medium">Statut</th>
                  <th className="text-right p-3 font-medium">Créé le</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filtered.map((cc: any) => (
                  <tr key={cc.id} className="hover:bg-muted/30">
                    <td className="p-3 font-mono text-xs">{cc.code}</td>
                    <td className="p-3 font-medium">{cc.name}</td>
                    <td className="p-3 text-muted-foreground">{cc.description || "—"}</td>
                    <td className="p-3 text-center">
                      <Badge variant={cc.isActive ? "default" : "secondary"}>{cc.isActive ? "Actif" : "Inactif"}</Badge>
                    </td>
                    <td className="p-3 text-right text-xs text-muted-foreground">
                      {cc.createdAt ? new Date(cc.createdAt).toLocaleDateString("fr-FR") : "—"}
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
