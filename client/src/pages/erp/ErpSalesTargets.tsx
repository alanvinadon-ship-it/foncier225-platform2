import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Link } from "wouter";
import { Target, Plus, Search, TrendingUp, TrendingDown, CheckCircle, Lock, AlertTriangle } from "lucide-react";

const statusColors: Record<string, string> = {
  draft: "bg-gray-100 text-gray-800",
  active: "bg-green-100 text-green-800",
  approved: "bg-blue-100 text-blue-800",
  locked: "bg-purple-100 text-purple-800",
  revised: "bg-orange-100 text-orange-800",
  cancelled: "bg-red-100 text-red-800",
};

const targetTypeLabels: Record<string, string> = {
  revenue: "Chiffre d'affaires",
  reservation: "Réservations",
  sales_contract: "Contrats de vente",
  collection: "Encaissements",
  units_sold: "Unités vendues",
  margin: "Marge",
};

export default function ErpSalesTargets() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [yearFilter, setYearFilter] = useState(new Date().getFullYear().toString());
  const [showCreate, setShowCreate] = useState(false);

  const { data: targets, isLoading, refetch } = trpc.erp.salesTargets.targets.list.useQuery({
    status: statusFilter !== "all" ? statusFilter : undefined,
    fiscalYear: parseInt(yearFilter),
  });

  const createMutation = trpc.erp.salesTargets.targets.create.useMutation({
    onSuccess: () => { toast.success("Objectif créé"); setShowCreate(false); refetch(); },
    onError: (e: any) => toast.error(e.message),
  });

  const [form, setForm] = useState({
    name: "", targetCode: "", description: "", fiscalYear: new Date().getFullYear(),
    targetType: "revenue" as "revenue" | "reservation" | "sales_contract" | "collection" | "units_sold" | "margin",
    targetAmount: 0, targetUnits: 0, periodType: "annual" as "monthly" | "quarterly" | "annual",
  });

  const formatAmount = (n: number | null | undefined) => {
    if (!n) return "0 FCFA";
    return new Intl.NumberFormat("fr-FR").format(n) + " FCFA";
  };

  // KPIs
  const totalTargets = targets?.length || 0;
  const activeTargets = targets?.filter((t: any) => t.status === "active" || t.status === "approved").length || 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Target className="h-6 w-6 text-emerald-600" />
            Objectifs Commerciaux
          </h1>
          <p className="text-muted-foreground mt-1">Suivi des objectifs de vente immobilière</p>
        </div>
        <Dialog open={showCreate} onOpenChange={setShowCreate}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" />Nouvel Objectif</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>Créer un Objectif Commercial</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Code</Label><Input value={form.targetCode} onChange={e => setForm(f => ({ ...f, targetCode: e.target.value }))} placeholder="OBJ-2026-001" /></div>
                <div><Label>Année Fiscale</Label><Input type="number" value={form.fiscalYear} onChange={e => setForm(f => ({ ...f, fiscalYear: parseInt(e.target.value) }))} /></div>
              </div>
              <div><Label>Nom</Label><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Objectif CA Q1 2026" /></div>
              <div><Label>Description</Label><Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} /></div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Type d'objectif</Label>
                  <Select value={form.targetType} onValueChange={v => setForm(f => ({ ...f, targetType: v as typeof f.targetType }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(targetTypeLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Périodicité</Label>
                  <Select value={form.periodType} onValueChange={v => setForm(f => ({ ...f, periodType: v as typeof f.periodType }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="monthly">Mensuel</SelectItem>
                      <SelectItem value="quarterly">Trimestriel</SelectItem>
                      <SelectItem value="annual">Annuel</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Montant Cible</Label><Input type="number" value={form.targetAmount} onChange={e => setForm(f => ({ ...f, targetAmount: parseInt(e.target.value) || 0 }))} /></div>
                <div><Label>Unités Cibles</Label><Input type="number" value={form.targetUnits} onChange={e => setForm(f => ({ ...f, targetUnits: parseInt(e.target.value) || 0 }))} /></div>
              </div>
              <Button className="w-full" onClick={() => createMutation.mutate(form)} disabled={createMutation.isPending}>
                {createMutation.isPending ? "Création..." : "Créer l'Objectif"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card><CardContent className="pt-4">
          <div className="text-sm text-muted-foreground">Total Objectifs</div>
          <div className="text-2xl font-bold">{totalTargets}</div>
        </CardContent></Card>
        <Card><CardContent className="pt-4">
          <div className="text-sm text-muted-foreground">Actifs</div>
          <div className="text-2xl font-bold text-green-600">{activeTargets}</div>
        </CardContent></Card>
        <Card><CardContent className="pt-4">
          <div className="text-sm text-muted-foreground">Année</div>
          <div className="text-2xl font-bold">{yearFilter}</div>
        </CardContent></Card>
        <Card><CardContent className="pt-4">
          <div className="text-sm text-muted-foreground">Taux Moyen</div>
          <div className="text-2xl font-bold text-blue-600">—</div>
        </CardContent></Card>
      </div>

      {/* Filters */}
      <div className="flex gap-4 items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Rechercher..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40"><SelectValue placeholder="Statut" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous</SelectItem>
            <SelectItem value="draft">Brouillon</SelectItem>
            <SelectItem value="active">Actif</SelectItem>
            <SelectItem value="approved">Approuvé</SelectItem>
            <SelectItem value="locked">Verrouillé</SelectItem>
          </SelectContent>
        </Select>
        <Select value={yearFilter} onValueChange={setYearFilter}>
          <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="2024">2024</SelectItem>
            <SelectItem value="2025">2025</SelectItem>
            <SelectItem value="2026">2026</SelectItem>
            <SelectItem value="2027">2027</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">Chargement...</div>
      ) : !targets || targets.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">
          <Target className="h-12 w-12 mx-auto mb-4 opacity-30" />
          <p>Aucun objectif commercial trouvé</p>
        </CardContent></Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left p-3 font-medium">Code</th>
                    <th className="text-left p-3 font-medium">Nom</th>
                    <th className="text-left p-3 font-medium">Type</th>
                    <th className="text-right p-3 font-medium">Cible</th>
                    <th className="text-right p-3 font-medium">Réalisé</th>
                    <th className="text-center p-3 font-medium">Taux</th>
                    <th className="text-center p-3 font-medium">Statut</th>
                    <th className="text-center p-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {targets.map((t: any) => (
                    <tr key={t.id} className="hover:bg-muted/30">
                      <td className="p-3 font-mono text-xs">{t.targetCode}</td>
                      <td className="p-3 font-medium">{t.name}</td>
                      <td className="p-3">{targetTypeLabels[t.targetType] || t.targetType}</td>
                      <td className="p-3 text-right">{formatAmount(t.targetAmount)}</td>
                      <td className="p-3 text-right">—</td>
                      <td className="p-3 text-center">—</td>
                      <td className="p-3 text-center">
                        <Badge className={statusColors[t.status] || ""}>{t.status}</Badge>
                      </td>
                      <td className="p-3 text-center">
                        <Link href={`/erp/sales-targets/${t.id}`}>
                          <Button variant="ghost" size="sm">Détail</Button>
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
