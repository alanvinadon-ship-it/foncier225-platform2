import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  BarChart3, TrendingUp, DollarSign, AlertTriangle, Plus, Trash2, Activity
} from "lucide-react";

export default function ErpAiUsageMonitoring() {
  const [showLimitDialog, setShowLimitDialog] = useState(false);

  const now = Date.now();
  const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;

  const { data: usage } = trpc.erp.aiProviders.usage.summary.useQuery({ startDate: thirtyDaysAgo, endDate: now });
  const { data: byProvider } = trpc.erp.aiProviders.usage.byProvider.useQuery({ startDate: thirtyDaysAgo, endDate: now });
  const { data: byModule } = trpc.erp.aiProviders.usage.byModule.useQuery({ startDate: thirtyDaysAgo, endDate: now });
  const { data: limits, refetch: refetchLimits } = trpc.erp.aiProviders.costLimits.list.useQuery();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Monitoring Usage IA</h1>
          <p className="text-muted-foreground">Suivez la consommation, les coûts et les limites des services IA (30 derniers jours)</p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Activity className="w-8 h-8 text-blue-500" />
              <div>
                <p className="text-2xl font-bold">{usage?.totalCalls?.toLocaleString() || 0}</p>
                <p className="text-sm text-muted-foreground">Requêtes totales</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <BarChart3 className="w-8 h-8 text-green-500" />
              <div>
                <p className="text-2xl font-bold">{((usage?.totalTokens || 0) / 1000).toFixed(1)}K</p>
                <p className="text-sm text-muted-foreground">Tokens consommés</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <DollarSign className="w-8 h-8 text-yellow-500" />
              <div>
                <p className="text-2xl font-bold">{parseFloat(String(usage?.totalCost || "0")).toFixed(2)} €</p>
                <p className="text-sm text-muted-foreground">Coût estimé</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <TrendingUp className="w-8 h-8 text-purple-500" />
              <div>
                <p className="text-2xl font-bold">{(usage?.avgDuration || 0).toFixed(0)} ms</p>
                <p className="text-sm text-muted-foreground">Latence moyenne</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="byProvider">
        <TabsList>
          <TabsTrigger value="byProvider">Par fournisseur</TabsTrigger>
          <TabsTrigger value="byModule">Par module</TabsTrigger>
          <TabsTrigger value="byTask">Par tâche</TabsTrigger>
          <TabsTrigger value="limits">Limites de coûts</TabsTrigger>
        </TabsList>

        <TabsContent value="byProvider" className="mt-4">
          <Card>
            <CardContent className="pt-6">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2">Fournisseur</th>
                      <th className="text-right p-2">Requêtes</th>
                      <th className="text-right p-2">Tokens</th>
                      <th className="text-right p-2">Coût</th>
                      <th className="text-right p-2">Latence moy.</th>
                    </tr>
                  </thead>
                  <tbody>
                    {byProvider?.map((row: any) => (
                      <tr key={row.providerName} className="border-b">
                        <td className="p-2 font-medium">{row.providerName}</td>
                        <td className="p-2 text-right">{row.totalCalls?.toLocaleString()}</td>
                        <td className="p-2 text-right">{((row.totalTokens || 0) / 1000).toFixed(1)}K</td>
                        <td className="p-2 text-right">{parseFloat(String(row.totalCost || "0")).toFixed(2)} €</td>
                        <td className="p-2 text-right">{(row.avgDuration || 0).toFixed(0)} ms</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {(!byProvider || byProvider.length === 0) && (
                  <p className="text-center text-muted-foreground py-8">Aucune donnée d'usage pour cette période</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="byModule" className="mt-4">
          <Card>
            <CardContent className="pt-6">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2">Module</th>
                      <th className="text-right p-2">Requêtes</th>
                      <th className="text-right p-2">Tokens</th>
                      <th className="text-right p-2">Coût</th>
                    </tr>
                  </thead>
                  <tbody>
                    {byModule?.map((row: any) => (
                      <tr key={row.module} className="border-b">
                        <td className="p-2 font-medium">{row.module}</td>
                        <td className="p-2 text-right">{row.totalCalls?.toLocaleString()}</td>
                        <td className="p-2 text-right">{((row.totalTokens || 0) / 1000).toFixed(1)}K</td>
                        <td className="p-2 text-right">{parseFloat(String(row.totalCost || "0")).toFixed(2)} €</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {(!byModule || byModule.length === 0) && (
                  <p className="text-center text-muted-foreground py-8">Aucune donnée d'usage pour cette période</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="byTask" className="mt-4">
          <Card>
            <CardContent className="pt-6">
              <p className="text-center text-muted-foreground py-8">Utilisez l'onglet "Par fournisseur" ou "Par module" pour voir les détails d'usage</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="limits" className="mt-4">
          <div className="space-y-4">
            <div className="flex justify-end">
              <Button onClick={() => setShowLimitDialog(true)}>
                <Plus className="w-4 h-4 mr-2" /> Ajouter une limite
              </Button>
            </div>
            <Card>
              <CardContent className="pt-6">
                <div className="space-y-3">
                  {limits?.map((limit: any) => {
                    const pct = limit.maxAmount > 0 ? (limit.currentSpend / limit.maxAmount) * 100 : 0;
                    return (
                      <div key={limit.id} className="flex items-center justify-between p-3 rounded-lg border">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{limit.limitName}</span>
                            <Badge variant={limit.isActive === 1 ? "default" : "secondary"}>
                              {limit.isActive === 1 ? "Actif" : "Inactif"}
                            </Badge>
                            {pct >= 90 && <AlertTriangle className="w-4 h-4 text-red-500" />}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {limit.scope} • {limit.periodType} • Seuil: {limit.alertThresholdPct}%
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold">{limit.currentSpend?.toFixed(2)} / {limit.maxAmount?.toFixed(2)} €</p>
                          <div className="w-32 h-2 bg-muted rounded-full mt-1">
                            <div
                              className={`h-full rounded-full ${pct >= 90 ? "bg-red-500" : pct >= 70 ? "bg-yellow-500" : "bg-green-500"}`}
                              style={{ width: `${Math.min(pct, 100)}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  {(!limits || limits.length === 0) && (
                    <p className="text-center text-muted-foreground py-8">Aucune limite de coûts configurée</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {showLimitDialog && (
            <CreateLimitDialog
              onClose={() => setShowLimitDialog(false)}
              onSuccess={() => { refetchLimits(); setShowLimitDialog(false); }}
            />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function CreateLimitDialog({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [form, setForm] = useState({
    scopeType: "global",
    scopeId: "",
    monthlyTokenLimit: 1000000,
    monthlyCostLimit: "100",
    dailyRequestLimit: 1000,
  });

  const createMutation = trpc.erp.aiProviders.costLimits.create.useMutation({
    onSuccess: () => { toast.success("Limite créée"); onSuccess(); },
    onError: (e) => toast.error(e.message),
  });

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Ajouter une limite de coûts</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Portée</Label>
            <Select value={form.scopeType} onValueChange={(v) => setForm({ ...form, scopeType: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="global">Global</SelectItem>
                <SelectItem value="provider">Par fournisseur</SelectItem>
                <SelectItem value="module">Par module</SelectItem>
                <SelectItem value="user">Par utilisateur</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {form.scopeType !== "global" && (
            <div>
              <Label>Identifiant de la portée</Label>
              <Input value={form.scopeId} onChange={(e) => setForm({ ...form, scopeId: e.target.value })} placeholder="ID fournisseur, module ou utilisateur" />
            </div>
          )}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label>Tokens/mois max</Label>
              <Input type="number" value={form.monthlyTokenLimit} onChange={(e) => setForm({ ...form, monthlyTokenLimit: parseInt(e.target.value) || 0 })} />
            </div>
            <div>
              <Label>Coût/mois max (€)</Label>
              <Input value={form.monthlyCostLimit} onChange={(e) => setForm({ ...form, monthlyCostLimit: e.target.value })} />
            </div>
            <div>
              <Label>Requêtes/jour max</Label>
              <Input type="number" value={form.dailyRequestLimit} onChange={(e) => setForm({ ...form, dailyRequestLimit: parseInt(e.target.value) || 0 })} />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>Annuler</Button>
            <Button onClick={() => createMutation.mutate(form)} disabled={createMutation.isPending}>
              Créer
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
