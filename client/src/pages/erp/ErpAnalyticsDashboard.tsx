import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Link } from "wouter";
import { PieChart, BarChart3, Building2, Layers, RefreshCw, TrendingUp, DollarSign } from "lucide-react";
import { Bar, Doughnut } from "react-chartjs-2";
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, ArcElement, Title, Tooltip, Legend } from "chart.js";

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Title, Tooltip, Legend);

export default function ErpAnalyticsDashboard() {
  const [year, setYear] = useState(new Date().getFullYear());

  const { data: costCenters } = trpc.erp.analytics.costCenters.list.useQuery({});
  const { data: snapshots, refetch } = trpc.erp.analytics.snapshots.list.useQuery({ periodYear: year });

  const syncMutation = trpc.erp.analytics.snapshots.generate.useMutation({
    onSuccess: () => { toast.success("Snapshots générés"); refetch(); },
    onError: (e: any) => toast.error(e.message),
  });

  const formatAmount = (n: number | null | undefined) => {
    if (!n) return "0";
    return new Intl.NumberFormat("fr-FR", { notation: "compact" }).format(n);
  };

  // KPIs
  const totalRevenue = snapshots?.reduce((s: number, snap: any) => s + (snap.revenueAmount || 0), 0) || 0;
  const totalExpense = snapshots?.reduce((s: number, snap: any) => s + (snap.expenseAmount || 0), 0) || 0;
  const totalMargin = totalRevenue - totalExpense;
  const marginRate = totalRevenue > 0 ? Math.round((totalMargin / totalRevenue) * 100) : 0;

  // Chart — répartition par centre de coûts
  const ccSnapshots = snapshots?.filter((s: any) => s.costCenterId) || [];
  const ccLabels = ccSnapshots.map((s: any) => {
    const cc = costCenters?.find((c: any) => c.id === s.costCenterId);
    return cc?.name || `CC-${s.costCenterId}`;
  });
  const ccColors = ["#10b981", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4", "#ec4899", "#84cc16"];

  const doughnutData = {
    labels: ccLabels.slice(0, 8),
    datasets: [{
      data: ccSnapshots.slice(0, 8).map((s: any) => s.expenseAmount || 0),
      backgroundColor: ccColors,
    }],
  };

  // Chart — marges par programme
  const progSnapshots = snapshots?.filter((s: any) => s.programId) || [];
  const barData = {
    labels: progSnapshots.slice(0, 10).map((s: any) => `Prog-${s.programId}`),
    datasets: [
      { label: "Revenus", data: progSnapshots.slice(0, 10).map((s: any) => s.revenueAmount || 0), backgroundColor: "rgba(16, 185, 129, 0.6)" },
      { label: "Charges", data: progSnapshots.slice(0, 10).map((s: any) => s.expenseAmount || 0), backgroundColor: "rgba(239, 68, 68, 0.6)" },
    ],
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <PieChart className="h-6 w-6 text-purple-600" />
            Comptabilité Analytique
          </h1>
          <p className="text-muted-foreground mt-1">Analyse des coûts par centre et programme</p>
        </div>
        <div className="flex gap-2 items-center">
          <Select value={year.toString()} onValueChange={v => setYear(parseInt(v))}>
            <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="2024">2024</SelectItem>
              <SelectItem value="2025">2025</SelectItem>
              <SelectItem value="2026">2026</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={() => syncMutation.mutate({ snapshotType: "cost_center_pl", periodYear: year })} disabled={syncMutation.isPending}>
            <RefreshCw className={`h-4 w-4 mr-2 ${syncMutation.isPending ? "animate-spin" : ""}`} />Recalculer
          </Button>
          <Link href="/erp/analytics/cost-centers">
            <Button variant="outline"><Building2 className="h-4 w-4 mr-2" />Centres de Coûts</Button>
          </Link>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card><CardContent className="pt-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground"><TrendingUp className="h-4 w-4" />Revenus</div>
          <div className="text-2xl font-bold text-green-600">{formatAmount(totalRevenue)} FCFA</div>
        </CardContent></Card>
        <Card><CardContent className="pt-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground"><DollarSign className="h-4 w-4" />Charges</div>
          <div className="text-2xl font-bold text-red-600">{formatAmount(totalExpense)} FCFA</div>
        </CardContent></Card>
        <Card><CardContent className="pt-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground"><BarChart3 className="h-4 w-4" />Marge Nette</div>
          <div className={`text-2xl font-bold ${totalMargin >= 0 ? "text-green-600" : "text-red-600"}`}>{formatAmount(totalMargin)} FCFA</div>
        </CardContent></Card>
        <Card><CardContent className="pt-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground"><Layers className="h-4 w-4" />Taux de Marge</div>
          <div className="text-2xl font-bold text-blue-600">{marginRate}%</div>
        </CardContent></Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle>Répartition des Charges par Centre</CardTitle></CardHeader>
          <CardContent>
            {ccSnapshots.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">Aucune donnée. Cliquez "Recalculer".</div>
            ) : (
              <div style={{ height: "280px" }} className="flex justify-center">
                <Doughnut data={doughnutData} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { position: "right" } } }} />
              </div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Revenus vs Charges par Programme</CardTitle></CardHeader>
          <CardContent>
            {progSnapshots.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">Aucune donnée. Cliquez "Recalculer".</div>
            ) : (
              <div style={{ height: "280px" }}>
                <Bar data={barData} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { position: "top" } }, scales: { y: { beginAtZero: true } } }} />
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Snapshots Table */}
      <Card>
        <CardHeader><CardTitle>Derniers Snapshots Analytiques</CardTitle></CardHeader>
        <CardContent className="p-0">
          {!snapshots || snapshots.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">Aucun snapshot. Cliquez "Recalculer" pour générer.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left p-3">Période</th>
                    <th className="text-left p-3">Centre / Programme</th>
                    <th className="text-right p-3">Revenus</th>
                    <th className="text-right p-3">Charges</th>
                    <th className="text-right p-3">Marge</th>
                    <th className="text-right p-3">Taux</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {snapshots.slice(0, 20).map((s: any) => (
                    <tr key={s.id} className="hover:bg-muted/30">
                      <td className="p-3">{s.periodMonth}/{s.periodYear}</td>
                      <td className="p-3">
                        {s.costCenterId ? `Centre: ${costCenters?.find((c: any) => c.id === s.costCenterId)?.name || s.costCenterId}` : `Programme: ${s.programId}`}
                      </td>
                      <td className="p-3 text-right text-green-600">{formatAmount(s.revenueAmount)}</td>
                      <td className="p-3 text-right text-red-600">{formatAmount(s.expenseAmount)}</td>
                      <td className="p-3 text-right font-medium">{formatAmount(s.marginAmount)}</td>
                      <td className="p-3 text-right">{s.marginRate || 0}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
