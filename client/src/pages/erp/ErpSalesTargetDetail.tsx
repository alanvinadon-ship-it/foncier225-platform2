import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useRoute, Link } from "wouter";
import { ArrowLeft, Target, TrendingUp, CheckCircle, Lock, RefreshCw, BarChart3 } from "lucide-react";
import { Bar } from "react-chartjs-2";
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from "chart.js";

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

const statusColors: Record<string, string> = {
  draft: "bg-gray-100 text-gray-800",
  active: "bg-green-100 text-green-800",
  approved: "bg-blue-100 text-blue-800",
  locked: "bg-purple-100 text-purple-800",
};

export default function ErpSalesTargetDetail() {
  const [, params] = useRoute("/erp/sales-targets/:id");
  const targetId = parseInt(params?.id || "0");

  const { data: target, isLoading, refetch } = trpc.erp.salesTargets.targets.getById.useQuery({ id: targetId });
  const { data: results } = trpc.erp.salesTargets.results.list.useQuery({ salesTargetId: targetId });

  const approveMutation = trpc.erp.salesTargets.targets.approve.useMutation({
    onSuccess: () => { toast.success("Objectif approuvé"); refetch(); },
    onError: (e: any) => toast.error(e.message),
  });

  const lockMutation = trpc.erp.salesTargets.targets.lock.useMutation({
    onSuccess: () => { toast.success("Objectif verrouillé"); refetch(); },
    onError: (e: any) => toast.error(e.message),
  });

  const syncMutation = trpc.erp.salesTargets.results.syncResults.useMutation({
    onSuccess: (data: any) => { toast.success(`Synchronisation terminée : ${data.processed} résultats`); refetch(); },
    onError: (e: any) => toast.error(e.message),
  });

  const formatAmount = (n: number | null | undefined) => {
    if (!n) return "0 FCFA";
    return new Intl.NumberFormat("fr-FR").format(n) + " FCFA";
  };

  if (isLoading) return <div className="text-center py-12">Chargement...</div>;
  if (!target) return <div className="text-center py-12">Objectif non trouvé</div>;

  // Chart data from results
  const months = ["Jan", "Fév", "Mar", "Avr", "Mai", "Jun", "Jul", "Aoû", "Sep", "Oct", "Nov", "Déc"];
  const chartData = {
    labels: months,
    datasets: [
      {
        label: "Cible mensuelle",
        data: months.map(() => target.targetAmount ? Number(target.targetAmount) / 12 : 0),
        backgroundColor: "rgba(59, 130, 246, 0.3)",
        borderColor: "rgb(59, 130, 246)",
        borderWidth: 1,
      },
      {
        label: "Réalisé",
        data: months.map((_, i) => {
          const r = results?.find((r: any) => {
            const d = new Date(r.periodStart);
            return d.getMonth() === i;
          });
          return r?.actualAmount || 0;
        }),
        backgroundColor: "rgba(16, 185, 129, 0.6)",
        borderColor: "rgb(16, 185, 129)",
        borderWidth: 1,
      },
    ],
  };

  const totalActual = results?.reduce((s: number, r: any) => s + (r.actualAmount || 0), 0) || 0;
  const achievementRate = target.targetAmount && Number(target.targetAmount) > 0
    ? Math.round((totalActual / Number(target.targetAmount)) * 100) : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/erp/sales-targets">
          <Button variant="ghost" size="sm"><ArrowLeft className="h-4 w-4 mr-1" />Retour</Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Target className="h-6 w-6 text-emerald-600" />
            {target.name}
          </h1>
          <p className="text-muted-foreground">{target.targetCode} — Année fiscale {target.fiscalYear}</p>
        </div>
        <Badge className={statusColors[target.status] || ""}>{target.status}</Badge>
        <div className="flex gap-2">
          {target.status === "draft" && (
            <Button variant="outline" size="sm" onClick={() => approveMutation.mutate({ id: targetId })}>
              <CheckCircle className="h-4 w-4 mr-1" />Approuver
            </Button>
          )}
          {(target.status === "active" || target.status === "approved") && (
            <Button variant="outline" size="sm" onClick={() => lockMutation.mutate({ id: targetId })}>
              <Lock className="h-4 w-4 mr-1" />Verrouiller
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={() => syncMutation.mutate({ salesTargetId: targetId })} disabled={syncMutation.isPending}>
            <RefreshCw className={`h-4 w-4 mr-1 ${syncMutation.isPending ? "animate-spin" : ""}`} />Sync
          </Button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card><CardContent className="pt-4">
          <div className="text-sm text-muted-foreground">Objectif</div>
          <div className="text-xl font-bold">{formatAmount(target.targetAmount)}</div>
        </CardContent></Card>
        <Card><CardContent className="pt-4">
          <div className="text-sm text-muted-foreground">Réalisé</div>
          <div className="text-xl font-bold text-green-600">{formatAmount(totalActual)}</div>
        </CardContent></Card>
        <Card><CardContent className="pt-4">
          <div className="text-sm text-muted-foreground">Taux d'Atteinte</div>
          <div className={`text-xl font-bold ${achievementRate >= 100 ? "text-green-600" : achievementRate >= 75 ? "text-blue-600" : "text-orange-600"}`}>
            {achievementRate}%
          </div>
        </CardContent></Card>
        <Card><CardContent className="pt-4">
          <div className="text-sm text-muted-foreground">Unités Cibles</div>
          <div className="text-xl font-bold">{target.targetUnits || 0}</div>
        </CardContent></Card>
      </div>

      {/* Chart */}
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><BarChart3 className="h-5 w-5" />Suivi Mensuel</CardTitle></CardHeader>
        <CardContent>
          <div style={{ height: "300px" }}>
            <Bar data={chartData} options={{
              responsive: true, maintainAspectRatio: false,
              plugins: { legend: { position: "top" } },
              scales: { y: { beginAtZero: true, ticks: { callback: (v) => new Intl.NumberFormat("fr-FR", { notation: "compact" }).format(Number(v)) } } },
            }} />
          </div>
        </CardContent>
      </Card>

      {/* Results Table */}
      <Card>
        <CardHeader><CardTitle>Résultats par Période</CardTitle></CardHeader>
        <CardContent className="p-0">
          {!results || results.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              Aucun résultat synchronisé. Cliquez "Sync" pour récupérer les données.
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left p-3">Période</th>
                  <th className="text-right p-3">Montant Réalisé</th>
                  <th className="text-right p-3">Unités</th>
                  <th className="text-right p-3">Taux</th>
                  <th className="text-right p-3">Dernière Sync</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {results.map((r: any) => (
                  <tr key={r.id} className="hover:bg-muted/30">
                    <td className="p-3">{new Date(r.periodStart).toLocaleDateString("fr-FR", { month: "long", year: "numeric" })}</td>
                    <td className="p-3 text-right font-medium">{formatAmount(r.actualAmount)}</td>
                    <td className="p-3 text-right">{r.actualUnits || 0}</td>
                    <td className="p-3 text-right">
                      <Badge variant={Number(r.achievementRate) >= 100 ? "default" : "secondary"}>
                        {r.achievementRate || "0"}%
                      </Badge>
                    </td>
                    <td className="p-3 text-right text-xs text-muted-foreground">
                      {r.sourceSyncAt ? new Date(r.sourceSyncAt).toLocaleString("fr-FR") : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
