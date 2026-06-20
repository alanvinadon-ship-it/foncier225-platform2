import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Plus, FileSpreadsheet, TrendingUp, AlertTriangle, Download, Upload, Eye } from "lucide-react";

const statusLabels: Record<string, string> = {
  draft: "Brouillon",
  imported: "Importé",
  under_review: "En revue",
  approved: "Approuvé",
  locked: "Verrouillé",
  revised: "Révisé",
  archived: "Archivé",
  cancelled: "Annulé",
};

const statusColors: Record<string, string> = {
  draft: "bg-gray-100 text-gray-800",
  imported: "bg-blue-100 text-blue-800",
  under_review: "bg-yellow-100 text-yellow-800",
  approved: "bg-green-100 text-green-800",
  locked: "bg-purple-100 text-purple-800",
  revised: "bg-orange-100 text-orange-800",
  archived: "bg-gray-200 text-gray-600",
  cancelled: "bg-red-100 text-red-800",
};

const currentYear = new Date().getFullYear();

export default function ErpBudgetV2Dashboard() {
  const [year, setYear] = useState(currentYear);
  const [showCreate, setShowCreate] = useState(false);
  const [newBudget, setNewBudget] = useState({ budgetCode: "", name: "", description: "", fiscalYear: currentYear, scenarioType: "initial_budget" as const });

  const { data, isLoading, refetch } = trpc.erp.budgetV2.budgets.list.useQuery({ fiscalYear: year, page: 1, limit: 50 });
  const createMut = trpc.erp.budgetV2.budgets.create.useMutation({
    onSuccess: () => { toast.success("Budget créé"); setShowCreate(false); refetch(); },
    onError: (e) => toast.error(e.message),
  });

  const years = Array.from({ length: 10 }, (_, i) => currentYear - 3 + i);

  if (isLoading) return <div className="p-6"><div className="animate-pulse space-y-4"><div className="h-8 bg-gray-200 rounded w-1/3"></div><div className="h-64 bg-gray-200 rounded"></div></div></div>;

  const budgets = data?.budgets || [];
  const total = data?.total || 0;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Budget Prévisionnel</h1>
          <p className="text-sm text-gray-500 mt-1">{total} budget(s) pour l'exercice {year}</p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
            <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
            <SelectContent>
              {years.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
            </SelectContent>
          </Select>
          <Link href="/erp/budget-v2/import">
            <Button variant="outline" size="sm"><Upload className="w-4 h-4 mr-2" />Importer Excel</Button>
          </Link>
          <Dialog open={showCreate} onOpenChange={setShowCreate}>
            <DialogTrigger asChild>
              <Button size="sm"><Plus className="w-4 h-4 mr-2" />Nouveau Budget</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Créer un budget prévisionnel</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div><Label>Code budget</Label><Input value={newBudget.budgetCode} onChange={e => setNewBudget(p => ({ ...p, budgetCode: e.target.value }))} placeholder="BUD-2026-01" /></div>
                  <div><Label>Exercice fiscal</Label><Input type="number" value={newBudget.fiscalYear} onChange={e => setNewBudget(p => ({ ...p, fiscalYear: Number(e.target.value) }))} /></div>
                </div>
                <div><Label>Nom du budget</Label><Input value={newBudget.name} onChange={e => setNewBudget(p => ({ ...p, name: e.target.value }))} placeholder="Budget prévisionnel 2026" /></div>
                <div><Label>Description</Label><Textarea value={newBudget.description} onChange={e => setNewBudget(p => ({ ...p, description: e.target.value }))} placeholder="Description optionnelle..." /></div>
                <div><Label>Type de scénario</Label>
                  <Select value={newBudget.scenarioType} onValueChange={(v: any) => setNewBudget(p => ({ ...p, scenarioType: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="initial_budget">Budget initial</SelectItem>
                      <SelectItem value="revised_budget">Budget révisé</SelectItem>
                      <SelectItem value="forecast">Forecast</SelectItem>
                      <SelectItem value="optimistic">Optimiste</SelectItem>
                      <SelectItem value="pessimistic">Pessimiste</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button className="w-full" onClick={() => createMut.mutate(newBudget)} disabled={!newBudget.budgetCode || !newBudget.name}>Créer le budget</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg"><FileSpreadsheet className="w-5 h-5 text-blue-600" /></div>
              <div><p className="text-sm text-gray-500">Total budgets</p><p className="text-xl font-bold">{total}</p></div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg"><TrendingUp className="w-5 h-5 text-green-600" /></div>
              <div><p className="text-sm text-gray-500">Approuvés</p><p className="text-xl font-bold">{budgets.filter(b => b.status === "approved" || b.status === "locked").length}</p></div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-100 rounded-lg"><AlertTriangle className="w-5 h-5 text-yellow-600" /></div>
              <div><p className="text-sm text-gray-500">En revue</p><p className="text-xl font-bold">{budgets.filter(b => b.status === "under_review").length}</p></div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gray-100 rounded-lg"><Download className="w-5 h-5 text-gray-600" /></div>
              <div><p className="text-sm text-gray-500">Brouillons</p><p className="text-xl font-bold">{budgets.filter(b => b.status === "draft" || b.status === "imported").length}</p></div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Budget List */}
      {budgets.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <FileSpreadsheet className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">Aucun budget pour l'exercice {year}</p>
            <p className="text-sm text-gray-400 mt-1">Créez un nouveau budget ou importez un fichier Excel</p>
          </CardContent>
        </Card>
      ) : (
        <div className="bg-white border rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">Code</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">Nom</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">Scénario</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">Statut</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">Créé le</th>
                <th className="text-right px-4 py-3 text-sm font-medium text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {budgets.map(b => (
                <tr key={b.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-mono">{b.budgetCode}</td>
                  <td className="px-4 py-3 text-sm font-medium">{b.name}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">{b.scenarioType.replace(/_/g, " ")}</td>
                  <td className="px-4 py-3"><Badge className={statusColors[b.status] || ""}>{statusLabels[b.status] || b.status}</Badge></td>
                  <td className="px-4 py-3 text-sm text-gray-500">{new Date(b.createdAt).toLocaleDateString("fr-FR")}</td>
                  <td className="px-4 py-3 text-right">
                    <Link href={`/erp/budget-v2/${b.id}`}>
                      <Button variant="ghost" size="sm"><Eye className="w-4 h-4 mr-1" />Voir</Button>
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
