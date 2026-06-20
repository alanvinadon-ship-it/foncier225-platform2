import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { useParams } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { RefreshCw, Download, TrendingUp, TrendingDown, AlertTriangle, Loader2, BarChart3, DollarSign } from "lucide-react";
import { Line, Bar } from "react-chartjs-2";
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend, Filler } from "chart.js";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend, Filler);

const months = ["Jan", "Fév", "Mar", "Avr", "Mai", "Jun", "Jul", "Aoû", "Sep", "Oct", "Nov", "Déc"];

function formatXOF(n: number) {
  return n.toLocaleString("fr-FR") + " F";
}

export default function ErpBudgetV2Detail() {
  const params = useParams<{ id: string }>();
  const budgetId = Number(params.id);
  const [tab, setTab] = useState("overview");

  const { data: budget, isLoading } = trpc.erp.budgetV2.budgets.getById.useQuery({ id: budgetId });
  const { data: categories } = trpc.erp.budgetV2.categories.list.useQuery({ budgetId });
  const { data: linesData } = trpc.erp.budgetV2.lines.list.useQuery({ budgetId });
  const { data: alerts } = trpc.erp.budgetV2.alerts.list.useQuery({ budgetId });
  const { data: plData } = trpc.erp.budgetV2.pl.get.useQuery({ budgetId });
  const { data: cfData } = trpc.erp.budgetV2.cashFlow.get.useQuery({ budgetId });

  const syncMut = trpc.erp.budgetExport.syncActuals.useMutation({
    onSuccess: (data) => toast.success(`${data.linesUpdated} lignes mises à jour`),
    onError: (e) => toast.error(e.message),
  });
  const exportExcelMut = trpc.erp.budgetExport.exportExcel.useMutation({
    onSuccess: (data) => { window.open(data.url, "_blank"); toast.success("Export Excel généré"); },
    onError: (e) => toast.error(e.message),
  });
  const exportCsvMut = trpc.erp.budgetExport.exportCsv.useMutation({
    onSuccess: (data) => { window.open(data.url, "_blank"); toast.success("Export CSV généré"); },
    onError: (e) => toast.error(e.message),
  });
  const recalcPlMut = trpc.erp.budgetV2.pl.recalculate.useMutation({
    onSuccess: () => toast.success("P&L recalculé"),
    onError: (e) => toast.error(e.message),
  });
  const recalcCfMut = trpc.erp.budgetV2.cashFlow.recalculate.useMutation({
    onSuccess: () => toast.success("Cash Flow recalculé"),
    onError: (e) => toast.error(e.message),
  });
  const seedMut = trpc.erp.budgetV2.seed.run.useMutation({
    onSuccess: (data) => {
      if (data.created) toast.success(`Seed réussi : ${data.stats?.categories} catégories, ${data.stats?.lines} lignes`);
      else toast.info("Données démo déjà présentes");
    },
    onError: (e) => toast.error(e.message),
  });

  // Aggregate data for overview chart
  const monthlyData = useMemo(() => {
    if (!linesData || linesData.length === 0) return null;
    const planned = new Array(12).fill(0);
    const actual = new Array(12).fill(0);
    for (const line of linesData as any[]) {
      if (!line.amounts) continue;
      for (const amt of line.amounts) {
        if (amt.monthNumber >= 1 && amt.monthNumber <= 12) {
          planned[amt.monthNumber - 1] += amt.plannedAmount;
          actual[amt.monthNumber - 1] += amt.actualAmount;
        }
      }
    }
    return { planned, actual };
  }, [linesData]);

  const totals = useMemo(() => {
    if (!monthlyData) return { totalPlanned: 0, totalActual: 0, variance: 0, executionRate: 0 };
    const totalPlanned = monthlyData.planned.reduce((s, v) => s + v, 0);
    const totalActual = monthlyData.actual.reduce((s, v) => s + v, 0);
    const variance = totalActual - totalPlanned;
    const executionRate = totalPlanned !== 0 ? Math.round((totalActual / totalPlanned) * 100) : 0;
    return { totalPlanned, totalActual, variance, executionRate };
  }, [monthlyData]);

  if (isLoading) return <div className="p-6"><div className="animate-pulse space-y-4"><div className="h-8 bg-gray-200 rounded w-1/3"></div><div className="h-64 bg-gray-200 rounded"></div></div></div>;
  if (!budget) return <div className="p-6 text-center text-gray-500">Budget introuvable</div>;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{budget.name}</h1>
          <p className="text-sm text-gray-500 mt-1">{budget.budgetCode} — Exercice {budget.fiscalYear}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => seedMut.mutate()} disabled={seedMut.isPending}>
            {seedMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <BarChart3 className="w-4 h-4 mr-1" />}Seed Démo
          </Button>
          <Button variant="outline" size="sm" onClick={() => syncMut.mutate({ budgetId })} disabled={syncMut.isPending}>
            {syncMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-1" />}Sync Réel
          </Button>
          <Button variant="outline" size="sm" onClick={() => exportExcelMut.mutate({ budgetId })} disabled={exportExcelMut.isPending}>
            <Download className="w-4 h-4 mr-1" />Excel
          </Button>
          <Button variant="outline" size="sm" onClick={() => exportCsvMut.mutate({ budgetId })} disabled={exportCsvMut.isPending}>
            <Download className="w-4 h-4 mr-1" />CSV
          </Button>
        </div>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-gray-500 uppercase">Budget Prévu</p>
            <p className="text-xl font-bold mt-1">{formatXOF(totals.totalPlanned)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-gray-500 uppercase">Réalisé</p>
            <p className="text-xl font-bold mt-1">{formatXOF(totals.totalActual)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-gray-500 uppercase">Écart</p>
            <p className={`text-xl font-bold mt-1 flex items-center gap-1 ${totals.variance >= 0 ? "text-red-600" : "text-green-600"}`}>
              {totals.variance >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
              {formatXOF(Math.abs(totals.variance))}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-gray-500 uppercase">Taux d'exécution</p>
            <p className="text-xl font-bold mt-1">{totals.executionRate}%</p>
            <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
              <div className="bg-blue-600 h-2 rounded-full" style={{ width: `${Math.min(totals.executionRate, 100)}%` }}></div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="overview">Vue d'ensemble</TabsTrigger>
          <TabsTrigger value="pl">P&L</TabsTrigger>
          <TabsTrigger value="cashflow">Cash Flow</TabsTrigger>
          <TabsTrigger value="lines">Lignes ({linesData?.length || 0})</TabsTrigger>
          <TabsTrigger value="alerts">Alertes {alerts && alerts.length > 0 && <Badge className="ml-1 bg-red-500 text-white text-xs">{alerts.length}</Badge>}</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6 mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {monthlyData && (
              <Card>
                <CardHeader><CardTitle className="text-sm">Évolution mensuelle Prévu vs Réel</CardTitle></CardHeader>
                <CardContent>
                  <div style={{ height: "280px" }}>
                    <Line
                      data={{
                        labels: months,
                        datasets: [
                          { label: "Prévu", data: monthlyData.planned, borderColor: "#2563eb", backgroundColor: "rgba(37,99,235,0.1)", fill: true, tension: 0.3 },
                          { label: "Réel", data: monthlyData.actual, borderColor: "#059669", backgroundColor: "rgba(5,150,105,0.1)", fill: true, tension: 0.3 },
                        ],
                      }}
                      options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { position: "top" } }, scales: { y: { beginAtZero: true } } }}
                    />
                  </div>
                </CardContent>
              </Card>
            )}
            {categories && categories.length > 0 && (
              <Card>
                <CardHeader><CardTitle className="text-sm">Répartition par catégorie</CardTitle></CardHeader>
                <CardContent>
                  <div style={{ height: "280px" }}>
                    <Bar
                      data={{
                        labels: categories.map((c: any) => c.name.substring(0, 20)),
                        datasets: [{
                          label: "Lignes",
                          data: categories.map((c: any) => (linesData || []).filter((l: any) => l.categoryId === c.id).length),
                          backgroundColor: ["#2563eb", "#059669", "#d97706", "#dc2626", "#7c3aed", "#0891b2"].slice(0, categories.length),
                        }],
                      }}
                      options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }}
                    />
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* P&L Tab */}
        <TabsContent value="pl" className="mt-4 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold flex items-center gap-2"><TrendingUp className="w-5 h-5 text-blue-600" />Compte de Résultat (P&L)</h3>
            <Button variant="outline" size="sm" onClick={() => recalcPlMut.mutate({ budgetId })} disabled={recalcPlMut.isPending}>
              {recalcPlMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-1" />}Recalculer
            </Button>
          </div>
          {plData && plData.length > 0 ? (
            <>
              <Card>
                <CardContent className="pt-4">
                  <div style={{ height: "300px" }}>
                    <Bar
                      data={{
                        labels: months,
                        datasets: [
                          { label: "Revenus (Prévu)", data: plData.map((p: any) => p.revenuePlanned), backgroundColor: "rgba(37,99,235,0.7)" },
                          { label: "Revenus (Réel)", data: plData.map((p: any) => p.revenueActual), backgroundColor: "rgba(37,99,235,0.3)" },
                          { label: "Charges (Prévu)", data: plData.map((p: any) => -(p.directCostsPlanned + p.indirectCostsPlanned)), backgroundColor: "rgba(220,38,38,0.7)" },
                          { label: "Charges (Réel)", data: plData.map((p: any) => -(p.directCostsActual + p.indirectCostsActual)), backgroundColor: "rgba(220,38,38,0.3)" },
                        ],
                      }}
                      options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { position: "top" } }, scales: { y: { beginAtZero: true } } }}
                    />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle className="text-sm">EBITDA mensuel</CardTitle></CardHeader>
                <CardContent>
                  <div style={{ height: "250px" }}>
                    <Line
                      data={{
                        labels: months,
                        datasets: [
                          { label: "EBITDA Prévu", data: plData.map((p: any) => p.ebitdaPlanned), borderColor: "#2563eb", tension: 0.3 },
                          { label: "EBITDA Réel", data: plData.map((p: any) => p.ebitdaActual), borderColor: "#059669", tension: 0.3 },
                        ],
                      }}
                      options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { position: "top" } } }}
                    />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 border-b">
                        <tr>
                          <th className="text-left px-3 py-2 font-medium">Indicateur</th>
                          {months.map(m => <th key={m} className="text-right px-2 py-2 font-medium text-xs">{m}</th>)}
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        <tr className="bg-blue-50"><td className="px-3 py-2 font-medium">Revenus (Prévu)</td>{plData.map((p: any, i: number) => <td key={i} className="text-right px-2 py-1 text-xs tabular-nums">{p.revenuePlanned.toLocaleString("fr-FR")}</td>)}</tr>
                        <tr><td className="px-3 py-2 font-medium">Revenus (Réel)</td>{plData.map((p: any, i: number) => <td key={i} className="text-right px-2 py-1 text-xs tabular-nums">{p.revenueActual.toLocaleString("fr-FR")}</td>)}</tr>
                        <tr className="bg-red-50"><td className="px-3 py-2 font-medium">Coûts directs</td>{plData.map((p: any, i: number) => <td key={i} className="text-right px-2 py-1 text-xs tabular-nums">{p.directCostsPlanned.toLocaleString("fr-FR")}</td>)}</tr>
                        <tr className="bg-green-50"><td className="px-3 py-2 font-medium">Marge directe</td>{plData.map((p: any, i: number) => <td key={i} className="text-right px-2 py-1 text-xs tabular-nums">{p.directMarginPlanned.toLocaleString("fr-FR")}</td>)}</tr>
                        <tr><td className="px-3 py-2 font-medium">Coûts indirects</td>{plData.map((p: any, i: number) => <td key={i} className="text-right px-2 py-1 text-xs tabular-nums">{p.indirectCostsPlanned.toLocaleString("fr-FR")}</td>)}</tr>
                        <tr className="bg-yellow-50 font-semibold"><td className="px-3 py-2">EBITDA</td>{plData.map((p: any, i: number) => <td key={i} className="text-right px-2 py-1 text-xs tabular-nums">{p.ebitdaPlanned.toLocaleString("fr-FR")}</td>)}</tr>
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </>
          ) : (
            <Card><CardContent className="py-8 text-center text-gray-500">Aucun snapshot P&L. Cliquez "Recalculer" pour générer les données.</CardContent></Card>
          )}
        </TabsContent>

        {/* Cash Flow Tab */}
        <TabsContent value="cashflow" className="mt-4 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold flex items-center gap-2"><DollarSign className="w-5 h-5 text-green-600" />Tableau de Trésorerie</h3>
            <Button variant="outline" size="sm" onClick={() => recalcCfMut.mutate({ budgetId })} disabled={recalcCfMut.isPending}>
              {recalcCfMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-1" />}Recalculer
            </Button>
          </div>
          {cfData && cfData.length > 0 ? (
            <>
              <Card>
                <CardContent className="pt-4">
                  <div style={{ height: "300px" }}>
                    <Bar
                      data={{
                        labels: months,
                        datasets: [
                          { label: "Encaissements", data: cfData.map((c: any) => c.cashInPlanned), backgroundColor: "rgba(5,150,105,0.7)" },
                          { label: "Décaissements", data: cfData.map((c: any) => -c.cashOutPlanned), backgroundColor: "rgba(220,38,38,0.7)" },
                        ],
                      }}
                      options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { position: "top" } }, scales: { y: { beginAtZero: false } } }}
                    />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle className="text-sm">Solde de trésorerie cumulé</CardTitle></CardHeader>
                <CardContent>
                  <div style={{ height: "250px" }}>
                    <Line
                      data={{
                        labels: months,
                        datasets: [
                          { label: "Solde prévu", data: cfData.map((c: any) => c.closingCashBalance), borderColor: "#2563eb", backgroundColor: "rgba(37,99,235,0.1)", fill: true, tension: 0.3 },
                        ],
                      }}
                      options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { position: "top" } }, scales: { y: { beginAtZero: false } } }}
                    />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 border-b">
                        <tr>
                          <th className="text-left px-3 py-2 font-medium">Flux</th>
                          {months.map(m => <th key={m} className="text-right px-2 py-2 font-medium text-xs">{m}</th>)}
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        <tr className="bg-green-50"><td className="px-3 py-2 font-medium">Encaissements</td>{cfData.map((c: any, i: number) => <td key={i} className="text-right px-2 py-1 text-xs tabular-nums">{c.cashInPlanned.toLocaleString("fr-FR")}</td>)}</tr>
                        <tr className="bg-red-50"><td className="px-3 py-2 font-medium">Décaissements</td>{cfData.map((c: any, i: number) => <td key={i} className="text-right px-2 py-1 text-xs tabular-nums">{c.cashOutPlanned.toLocaleString("fr-FR")}</td>)}</tr>
                        <tr><td className="px-3 py-2 font-medium">OPEX</td>{cfData.map((c: any, i: number) => <td key={i} className="text-right px-2 py-1 text-xs tabular-nums">{c.opexPlanned.toLocaleString("fr-FR")}</td>)}</tr>
                        <tr><td className="px-3 py-2 font-medium">CAPEX</td>{cfData.map((c: any, i: number) => <td key={i} className="text-right px-2 py-1 text-xs tabular-nums">{c.capexPlanned.toLocaleString("fr-FR")}</td>)}</tr>
                        <tr className="bg-yellow-50 font-semibold"><td className="px-3 py-2">Flux net</td>{cfData.map((c: any, i: number) => <td key={i} className={`text-right px-2 py-1 text-xs tabular-nums ${c.netCashFlowPlanned < 0 ? "text-red-600" : "text-green-600"}`}>{c.netCashFlowPlanned.toLocaleString("fr-FR")}</td>)}</tr>
                        <tr className="bg-blue-50 font-semibold"><td className="px-3 py-2">Solde clôture</td>{cfData.map((c: any, i: number) => <td key={i} className={`text-right px-2 py-1 text-xs tabular-nums ${c.closingCashBalance < 0 ? "text-red-600" : ""}`}>{c.closingCashBalance.toLocaleString("fr-FR")}</td>)}</tr>
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </>
          ) : (
            <Card><CardContent className="py-8 text-center text-gray-500">Aucun snapshot Cash Flow. Cliquez "Recalculer" pour générer les données.</CardContent></Card>
          )}
        </TabsContent>

        {/* Lines Tab */}
        <TabsContent value="lines" className="mt-4">
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="text-left px-3 py-2 font-medium">Libellé</th>
                      <th className="text-left px-3 py-2 font-medium">Type</th>
                      {months.map(m => <th key={m} className="text-right px-2 py-2 font-medium text-xs">{m}</th>)}
                      <th className="text-right px-3 py-2 font-medium">Total</th>
                      <th className="text-right px-3 py-2 font-medium">Exec.</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {(linesData || []).slice(0, 100).map((line: any) => {
                      const totalPlanned = line.amounts?.reduce((s: number, a: any) => s + a.plannedAmount, 0) || 0;
                      const totalActual = line.amounts?.reduce((s: number, a: any) => s + a.actualAmount, 0) || 0;
                      const exec = totalPlanned !== 0 ? Math.round((totalActual / totalPlanned) * 100) : 0;
                      return (
                        <tr key={line.id} className="hover:bg-gray-50">
                          <td className="px-3 py-2 font-medium max-w-[200px] truncate">{line.lineLabel}</td>
                          <td className="px-3 py-2"><Badge variant="outline" className="text-xs">{line.lineType}</Badge></td>
                          {months.map((_, mi) => {
                            const amt = line.amounts?.find((a: any) => a.monthNumber === mi + 1);
                            return <td key={mi} className="text-right px-2 py-2 text-xs tabular-nums">{(amt?.plannedAmount || 0).toLocaleString("fr-FR")}</td>;
                          })}
                          <td className="text-right px-3 py-2 font-medium tabular-nums">{totalPlanned.toLocaleString("fr-FR")}</td>
                          <td className="text-right px-3 py-2">
                            <Badge className={exec > 100 ? "bg-red-100 text-red-800" : exec > 80 ? "bg-yellow-100 text-yellow-800" : "bg-green-100 text-green-800"}>{exec}%</Badge>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Alerts Tab */}
        <TabsContent value="alerts" className="mt-4">
          {(!alerts || alerts.length === 0) ? (
            <Card><CardContent className="py-8 text-center text-gray-500">Aucune alerte budgétaire</CardContent></Card>
          ) : (
            <div className="space-y-3">
              {alerts.map((alert: any) => (
                <Card key={alert.id} className={alert.severity === "critical" ? "border-red-200" : alert.severity === "warning" ? "border-yellow-200" : "border-blue-200"}>
                  <CardContent className="py-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <AlertTriangle className={`w-5 h-5 ${alert.severity === "critical" ? "text-red-500" : alert.severity === "warning" ? "text-yellow-500" : "text-blue-500"}`} />
                      <div>
                        <p className="font-medium text-sm">{alert.alertMessage || alert.message}</p>
                        <p className="text-xs text-gray-500">
                          {alert.thresholdValue ? `Seuil: ${alert.thresholdValue}% — Actuel: ${alert.currentValue}%` : `Mois ${alert.monthNumber} — Variance: ${alert.variancePercentage}%`}
                        </p>
                      </div>
                    </div>
                    <Badge variant={alert.isAcknowledged || alert.status === "acknowledged" ? "secondary" : "destructive"}>
                      {alert.isAcknowledged || alert.status === "acknowledged" ? "Acquittée" : "Active"}
                    </Badge>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
