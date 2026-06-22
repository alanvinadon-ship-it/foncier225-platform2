import { useEffect, useRef, useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { TrendingUp, AlertTriangle, Clock, DollarSign, RefreshCw, ArrowUpRight, ArrowDownRight } from "lucide-react";
import Chart from "chart.js/auto";

const MONTH_LABELS = ["Jan", "Fév", "Mar", "Avr", "Mai", "Jun", "Jul", "Aoû", "Sep", "Oct", "Nov", "Déc"];

function formatXOF(amount: number): string {
  if (amount >= 1_000_000) return `${(amount / 1_000_000).toFixed(1)}M`;
  if (amount >= 1_000) return `${(amount / 1_000).toFixed(0)}K`;
  return amount.toLocaleString("fr-FR");
}

function formatFullXOF(amount: number): string {
  return amount.toLocaleString("fr-FR") + " XOF";
}

export default function ErpCashFlowForecast() {
  const [months, setMonths] = useState(6);
  const chartRef = useRef<HTMLCanvasElement>(null);
  const chartInstanceRef = useRef<Chart | null>(null);

  const { data, isLoading, refetch } = trpc.erp.salesOrders.integration.cashFlowForecast.useQuery({ months });

  // Chart.js rendering
  useEffect(() => {
    if (!data || !chartRef.current) return;

    // Destroy previous chart
    if (chartInstanceRef.current) {
      chartInstanceRef.current.destroy();
    }

    const ctx = chartRef.current.getContext("2d");
    if (!ctx) return;

    const labels = data.forecast.map(f => `${MONTH_LABELS[f.month - 1]} ${f.year}`);
    const collections = data.forecast.map(f => f.expectedCollections);
    const orderCounts = data.forecast.map(f => f.orderCount);

    chartInstanceRef.current = new Chart(ctx, {
      type: "bar",
      data: {
        labels,
        datasets: [
          {
            label: "Encaissements attendus (XOF)",
            data: collections,
            backgroundColor: "rgba(34, 197, 94, 0.7)",
            borderColor: "rgb(34, 197, 94)",
            borderWidth: 1,
            borderRadius: 4,
            yAxisID: "y",
          },
          {
            label: "Nombre de commandes",
            data: orderCounts,
            type: "line",
            borderColor: "rgb(59, 130, 246)",
            backgroundColor: "rgba(59, 130, 246, 0.1)",
            borderWidth: 2,
            pointRadius: 4,
            pointBackgroundColor: "rgb(59, 130, 246)",
            fill: true,
            yAxisID: "y1",
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          mode: "index",
          intersect: false,
        },
        plugins: {
          legend: {
            position: "top",
            labels: { usePointStyle: true, padding: 20 },
          },
          tooltip: {
            callbacks: {
              label: (ctx) => {
                const val = ctx.parsed.y ?? 0;
                if (ctx.datasetIndex === 0) {
                  return `Encaissements: ${formatFullXOF(val)}`;
                }
                return `Commandes: ${val}`;
              },
            },
          },
        },
        scales: {
          y: {
            type: "linear",
            position: "left",
            title: { display: true, text: "Montant (XOF)" },
            ticks: {
              callback: (value) => formatXOF(Number(value)),
            },
            grid: { color: "rgba(0,0,0,0.05)" },
          },
          y1: {
            type: "linear",
            position: "right",
            title: { display: true, text: "Commandes" },
            grid: { drawOnChartArea: false },
            min: 0,
          },
          x: {
            grid: { display: false },
          },
        },
      },
    });

    return () => {
      if (chartInstanceRef.current) {
        chartInstanceRef.current.destroy();
        chartInstanceRef.current = null;
      }
    };
  }, [data]);

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="h-28 bg-gray-200 rounded"></div>
            <div className="h-28 bg-gray-200 rounded"></div>
            <div className="h-28 bg-gray-200 rounded"></div>
          </div>
          <div className="h-80 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  const totalExpected = data?.totalExpected || 0;
  const totalOverdue = data?.totalOverdue || 0;
  const overdueOrders = data?.overdueOrders || [];
  const forecast = data?.forecast || [];
  const totalOrders = forecast.reduce((s, f) => s + f.orderCount, 0);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Cash-flow Prévisionnel</h1>
          <p className="text-sm text-gray-500 mt-1">
            Encaissements attendus sur les {months} prochains mois — Commandes clients
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={String(months)} onValueChange={(v) => setMonths(Number(v))}>
            <SelectTrigger className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="3">3 mois</SelectItem>
              <SelectItem value="6">6 mois</SelectItem>
              <SelectItem value="9">9 mois</SelectItem>
              <SelectItem value="12">12 mois</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={() => { refetch(); toast.success("Données actualisées"); }}>
            <RefreshCw className="w-4 h-4 mr-2" />Actualiser
          </Button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Encaissements attendus</p>
                <p className="text-2xl font-bold text-green-700 mt-1">{formatFullXOF(totalExpected)}</p>
                <p className="text-xs text-gray-400 mt-1">{totalOrders} commande(s) en attente</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
                <ArrowUpRight className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Retards de paiement</p>
                <p className="text-2xl font-bold text-red-700 mt-1">{formatFullXOF(totalOverdue)}</p>
                <p className="text-xs text-gray-400 mt-1">{overdueOrders.length} commande(s) en retard</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-red-100 flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Taux de recouvrement</p>
                <p className="text-2xl font-bold text-blue-700 mt-1">
                  {totalExpected + totalOverdue > 0
                    ? Math.round((totalExpected / (totalExpected + totalOverdue)) * 100)
                    : 0}%
                </p>
                <p className="text-xs text-gray-400 mt-1">Attendu vs total créances</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Graphique */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-green-600" />
            Prévision d'encaissements par mois
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div style={{ height: "350px" }}>
            <canvas ref={chartRef}></canvas>
          </div>
        </CardContent>
      </Card>

      {/* Détail par mois */}
      {forecast.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-blue-600" />
              Détail mensuel des encaissements
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 font-medium text-gray-500">Période</th>
                    <th className="text-right py-3 px-4 font-medium text-gray-500">Montant attendu</th>
                    <th className="text-center py-3 px-4 font-medium text-gray-500">Commandes</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-500">Principaux clients</th>
                  </tr>
                </thead>
                <tbody>
                  {forecast.map((f, idx) => {
                    // Agréger les clients uniques
                    const clientAmounts: Record<string, number> = {};
                    for (const d of f.details) {
                      clientAmounts[d.clientName] = (clientAmounts[d.clientName] || 0) + d.amount;
                    }
                    const topClients = Object.entries(clientAmounts)
                      .sort((a, b) => b[1] - a[1])
                      .slice(0, 3);

                    return (
                      <tr key={idx} className="border-b hover:bg-gray-50">
                        <td className="py-3 px-4 font-medium">
                          {MONTH_LABELS[f.month - 1]} {f.year}
                        </td>
                        <td className="py-3 px-4 text-right font-semibold text-green-700">
                          {f.expectedCollections > 0 ? formatFullXOF(f.expectedCollections) : "—"}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <Badge variant="secondary">{f.orderCount}</Badge>
                        </td>
                        <td className="py-3 px-4">
                          {topClients.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {topClients.map(([name, amount]) => (
                                <Badge key={name} variant="outline" className="text-xs">
                                  {name} ({formatXOF(amount)})
                                </Badge>
                              ))}
                            </div>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Retards de paiement */}
      {overdueOrders.length > 0 && (
        <Card className="border-red-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-700">
              <AlertTriangle className="w-5 h-5" />
              Retards de paiement ({overdueOrders.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 font-medium text-gray-500">N° Commande</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-500">Client</th>
                    <th className="text-right py-3 px-4 font-medium text-gray-500">Montant dû</th>
                    <th className="text-center py-3 px-4 font-medium text-gray-500">Jours de retard</th>
                    <th className="text-center py-3 px-4 font-medium text-gray-500">Urgence</th>
                  </tr>
                </thead>
                <tbody>
                  {overdueOrders.map((order) => {
                    const urgency = order.daysOverdue > 60 ? "critical" : order.daysOverdue > 30 ? "high" : "medium";
                    return (
                      <tr key={order.orderId} className="border-b hover:bg-red-50">
                        <td className="py-3 px-4 font-mono text-sm">{order.orderNumber}</td>
                        <td className="py-3 px-4 font-medium">{order.clientName}</td>
                        <td className="py-3 px-4 text-right font-semibold text-red-700">
                          {formatFullXOF(order.amount)}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className="font-bold">{order.daysOverdue}j</span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          {urgency === "critical" && (
                            <Badge className="bg-red-600 text-white">Critique</Badge>
                          )}
                          {urgency === "high" && (
                            <Badge className="bg-orange-500 text-white">Élevée</Badge>
                          )}
                          {urgency === "medium" && (
                            <Badge className="bg-yellow-500 text-white">Moyenne</Badge>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="bg-red-50 font-semibold">
                    <td className="py-3 px-4" colSpan={2}>Total retards</td>
                    <td className="py-3 px-4 text-right text-red-700">{formatFullXOF(totalOverdue)}</td>
                    <td className="py-3 px-4 text-center">
                      {overdueOrders.length > 0 ? Math.round(overdueOrders.reduce((s, o) => s + o.daysOverdue, 0) / overdueOrders.length) : 0}j moy.
                    </td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Pas de retards */}
      {overdueOrders.length === 0 && (
        <Card className="border-green-200 bg-green-50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="font-medium text-green-800">Aucun retard de paiement</p>
                <p className="text-sm text-green-600">Tous les clients sont à jour dans leurs paiements.</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
