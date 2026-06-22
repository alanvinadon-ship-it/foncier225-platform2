import { useMemo, useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ShoppingCart, Package, Clock, TrendingUp, AlertTriangle, CheckCircle, BarChart3 } from "lucide-react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";
import { Bar, Line, Doughnut } from "react-chartjs-2";

ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, ArcElement, Title, Tooltip, Legend, Filler);

function formatXOF(amount: number): string {
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "XOF", maximumFractionDigits: 0 }).format(amount);
}

function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
}

const MONTH_LABELS: Record<string, string> = {
  "01": "Jan", "02": "Fév", "03": "Mar", "04": "Avr", "05": "Mai", "06": "Juin",
  "07": "Juil", "08": "Août", "09": "Sep", "10": "Oct", "11": "Nov", "12": "Déc",
};

export default function ErpPurchasesDashboard() {
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  // KPIs overview
  const { data: stats, isLoading: statsLoading } = trpc.erp.purchases.stats.overview.useQuery();

  // CAPEX/OPEX dashboard
  const { data: capexOpexData } = trpc.erp.purchases.orders.dashboard.useQuery({ year: selectedYear });

  // Recent purchase orders
  const { data: recentOrders } = trpc.erp.purchases.orders.list.useQuery({ limit: 10, offset: 0 });

  // Recent purchase requests pending approval
  const { data: pendingRequests } = trpc.erp.purchases.requests.list.useQuery({ status: "submitted", limit: 5, offset: 0 });

  // Vendors list for top vendors
  const { data: vendors } = trpc.erp.vendors.list.useQuery({ limit: 100, offset: 0 });

  // Monthly trend data
  const { data: monthlyTrend } = trpc.erp.purchases.stats.monthlyTrend.useQuery();

  // Vendor distribution data
  const { data: vendorDistribution } = trpc.erp.purchases.stats.vendorDistribution.useQuery();

  // Status distribution for orders
  const statusDistribution = useMemo(() => {
    if (!recentOrders?.orders) return [];
    const counts: Record<string, number> = {};
    recentOrders.orders.forEach((o: any) => {
      counts[o.status] = (counts[o.status] || 0) + 1;
    });
    return Object.entries(counts).map(([status, count]) => ({ status, count }));
  }, [recentOrders]);

  // Calculate delivery rate from orders
  const deliveryRate = useMemo(() => {
    if (!recentOrders?.orders) return 0;
    const delivered = recentOrders.orders.filter((o: any) => o.status === "fully_received" || o.status === "closed").length;
    const total = recentOrders.orders.length;
    return total > 0 ? Math.round((delivered / total) * 100) : 0;
  }, [recentOrders]);

  // Chart data: Monthly trend
  const monthlyChartData = useMemo(() => {
    if (!monthlyTrend || monthlyTrend.length === 0) return null;
    const labels = monthlyTrend.map((d) => {
      const parts = d.month.split("-");
      return MONTH_LABELS[parts[1]] || parts[1];
    });
    return {
      labels,
      datasets: [
        {
          label: "Montant (FCFA)",
          data: monthlyTrend.map((d) => d.total),
          borderColor: "#16a34a",
          backgroundColor: "rgba(22, 163, 106, 0.1)",
          fill: true,
          tension: 0.4,
          pointRadius: 4,
          pointBackgroundColor: "#16a34a",
        },
        {
          label: "Nombre de commandes",
          data: monthlyTrend.map((d) => d.count),
          borderColor: "#2563eb",
          backgroundColor: "rgba(37, 99, 235, 0.1)",
          fill: false,
          tension: 0.4,
          pointRadius: 4,
          pointBackgroundColor: "#2563eb",
          yAxisID: "y1",
        },
      ],
    };
  }, [monthlyTrend]);

  // Chart data: Vendor distribution (doughnut)
  const vendorChartData = useMemo(() => {
    if (!vendorDistribution || vendorDistribution.length === 0) return null;
    const colors = [
      "#16a34a", "#2563eb", "#d97706", "#9333ea", "#dc2626",
      "#0891b2", "#4f46e5", "#ca8a04", "#be185d", "#059669",
    ];
    return {
      labels: vendorDistribution.map((v) => v.vendorName),
      datasets: [
        {
          data: vendorDistribution.map((v) => v.totalAmount),
          backgroundColor: colors.slice(0, vendorDistribution.length),
          borderWidth: 2,
          borderColor: "#fff",
        },
      ],
    };
  }, [vendorDistribution]);

  if (statsLoading) {
    return (
      <div className="p-6 space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard Achats</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6"><div className="h-16 bg-gray-200 rounded"></div></CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const kpis = [
    {
      title: "Total Commandes",
      value: stats?.totalOrders ?? 0,
      icon: ShoppingCart,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
    },
    {
      title: "Commandes Actives",
      value: stats?.activeOrders ?? 0,
      icon: Package,
      color: "text-green-600",
      bgColor: "bg-green-50",
    },
    {
      title: "En Attente d'Approbation",
      value: stats?.pendingApproval ?? 0,
      icon: Clock,
      color: "text-orange-600",
      bgColor: "bg-orange-50",
    },
    {
      title: "Montant Total Engagé",
      value: formatXOF(stats?.totalSpent ?? 0),
      icon: TrendingUp,
      color: "text-purple-600",
      bgColor: "bg-purple-50",
      isAmount: true,
    },
  ];

  const statusLabels: Record<string, string> = {
    draft: "Brouillon",
    submitted: "Soumis",
    approved: "Approuvé",
    sent: "Envoyé",
    partially_received: "Partiellement reçu",
    fully_received: "Totalement reçu",
    invoiced: "Facturé",
    cancelled: "Annulé",
    closed: "Clôturé",
  };

  const statusColors: Record<string, string> = {
    draft: "bg-gray-100 text-gray-800",
    submitted: "bg-yellow-100 text-yellow-800",
    approved: "bg-blue-100 text-blue-800",
    sent: "bg-indigo-100 text-indigo-800",
    partially_received: "bg-orange-100 text-orange-800",
    fully_received: "bg-green-100 text-green-800",
    invoiced: "bg-purple-100 text-purple-800",
    cancelled: "bg-red-100 text-red-800",
    closed: "bg-gray-200 text-gray-700",
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard Achats</h1>
        <div className="flex items-center gap-3">
          <Select value={String(selectedYear)} onValueChange={(v) => setSelectedYear(Number(v))}>
            <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
            <SelectContent>
              {[2024, 2025, 2026, 2027].map(y => (
                <SelectItem key={y} value={String(y)}>{y}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Badge variant="outline" className="text-sm">
            {new Date().toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}
          </Badge>
        </div>
      </div>

      {/* Répartition CAPEX / OPEX */}
      {capexOpexData && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="border-blue-200 bg-blue-50/30">
            <CardContent className="p-5">
              <p className="text-xs text-blue-600 font-semibold uppercase">CAPEX (Investissement)</p>
              <p className="text-2xl font-bold text-blue-700 mt-1">{formatXOF(capexOpexData.capex.amount)}</p>
              <p className="text-xs text-muted-foreground mt-1">{capexOpexData.capex.count} bons de commande</p>
              {capexOpexData.totalAmount > 0 && (
                <div className="mt-2 w-full bg-blue-100 rounded-full h-2">
                  <div className="bg-blue-600 h-2 rounded-full" style={{ width: `${Math.round((capexOpexData.capex.amount / capexOpexData.totalAmount) * 100)}%` }}></div>
                </div>
              )}
            </CardContent>
          </Card>
          <Card className="border-orange-200 bg-orange-50/30">
            <CardContent className="p-5">
              <p className="text-xs text-orange-600 font-semibold uppercase">OPEX (Fonctionnement)</p>
              <p className="text-2xl font-bold text-orange-700 mt-1">{formatXOF(capexOpexData.opex.amount)}</p>
              <p className="text-xs text-muted-foreground mt-1">{capexOpexData.opex.count} bons de commande</p>
              {capexOpexData.totalAmount > 0 && (
                <div className="mt-2 w-full bg-orange-100 rounded-full h-2">
                  <div className="bg-orange-600 h-2 rounded-full" style={{ width: `${Math.round((capexOpexData.opex.amount / capexOpexData.totalAmount) * 100)}%` }}></div>
                </div>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5">
              <p className="text-xs text-muted-foreground font-semibold uppercase">Total {selectedYear}</p>
              <p className="text-2xl font-bold mt-1">{formatXOF(capexOpexData.totalAmount)}</p>
              <p className="text-xs text-muted-foreground mt-1">{capexOpexData.totalOrders} bons de commande</p>
              <div className="mt-2 flex gap-1">
                <Badge variant="outline" className="text-xs">CAPEX {capexOpexData.totalAmount > 0 ? Math.round((capexOpexData.capex.amount / capexOpexData.totalAmount) * 100) : 0}%</Badge>
                <Badge variant="outline" className="text-xs">OPEX {capexOpexData.totalAmount > 0 ? Math.round((capexOpexData.opex.amount / capexOpexData.totalAmount) * 100) : 0}%</Badge>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi) => (
          <Card key={kpi.title}>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className={`p-3 rounded-lg ${kpi.bgColor}`}>
                  <kpi.icon className={`h-6 w-6 ${kpi.color}`} />
                </div>
                <div>
                  <p className="text-sm text-gray-500">{kpi.title}</p>
                  <p className={`text-2xl font-bold ${kpi.color}`}>
                    {kpi.value}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts Row: Monthly Trend + Vendor Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Monthly Trend Chart */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-green-600" />
              Évolution Mensuelle des Achats
            </CardTitle>
          </CardHeader>
          <CardContent>
            {monthlyChartData ? (
              <div style={{ height: "280px" }}>
                <Line
                  data={monthlyChartData}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    interaction: { mode: "index", intersect: false },
                    scales: {
                      y: {
                        type: "linear",
                        position: "left",
                        title: { display: true, text: "Montant (FCFA)" },
                        ticks: {
                          callback: (value) => {
                            const num = Number(value);
                            if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
                            if (num >= 1000) return `${(num / 1000).toFixed(0)}k`;
                            return String(num);
                          },
                        },
                      },
                      y1: {
                        type: "linear",
                        position: "right",
                        title: { display: true, text: "Nb commandes" },
                        grid: { drawOnChartArea: false },
                      },
                    },
                    plugins: {
                      legend: { position: "bottom" },
                      tooltip: {
                        callbacks: {
                          label: (ctx) => {
                            if (ctx.datasetIndex === 0) return `Montant: ${formatXOF(ctx.parsed.y ?? 0)}`;
                            return `Commandes: ${ctx.parsed.y}`;
                          },
                        },
                      },
                    },
                  }}
                />
              </div>
            ) : (
              <div className="flex items-center justify-center h-64 text-gray-400">
                <p>Aucune donnée disponible pour les 12 derniers mois</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Vendor Distribution Doughnut */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Répartition par Fournisseur</CardTitle>
          </CardHeader>
          <CardContent>
            {vendorChartData ? (
              <div style={{ height: "280px" }}>
                <Doughnut
                  data={vendorChartData}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: {
                        position: "bottom",
                        labels: { boxWidth: 12, font: { size: 11 } },
                      },
                      tooltip: {
                        callbacks: {
                          label: (ctx) => `${ctx.label}: ${formatXOF(ctx.parsed)}`,
                        },
                      },
                    },
                  }}
                />
              </div>
            ) : (
              <div className="flex items-center justify-center h-64 text-gray-400">
                <p>Aucune donnée fournisseur</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Second row: Delivery rate + Status distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Delivery Rate */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              Taux de Livraison
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <div className="relative w-24 h-24">
                <svg className="w-24 h-24 transform -rotate-90" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="40" fill="none" stroke="#e5e7eb" strokeWidth="10" />
                  <circle
                    cx="50" cy="50" r="40" fill="none"
                    stroke="#16a34a" strokeWidth="10"
                    strokeDasharray={`${deliveryRate * 2.51} 251`}
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-xl font-bold text-gray-900">{deliveryRate}%</span>
                </div>
              </div>
              <div className="text-sm text-gray-600">
                <p>Commandes livrées sur les dernières commandes</p>
                <p className="mt-1 text-xs text-gray-400">
                  Basé sur les {recentOrders?.orders?.length ?? 0} dernières commandes
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Status Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Répartition par Statut</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {statusDistribution.map(({ status, count }) => (
                <div key={status} className="flex items-center justify-between">
                  <span className={`px-2 py-1 rounded text-xs font-medium ${statusColors[status] || "bg-gray-100 text-gray-800"}`}>
                    {statusLabels[status] || status}
                  </span>
                  <span className="text-sm font-medium text-gray-700">{count}</span>
                </div>
              ))}
              {statusDistribution.length === 0 && (
                <p className="text-sm text-gray-400 text-center py-4">Aucune commande</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Third row: Pending Requests + Recent Orders */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pending Requests */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              Demandes en Attente d'Approbation
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {pendingRequests?.requests?.map((req: any) => (
                <div key={req.id} className="flex items-center justify-between border-b pb-2 last:border-0">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{req.prNumber}</p>
                    <p className="text-xs text-gray-500">{req.title}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-700">{formatXOF(req.estimatedAmount || 0)}</p>
                    <p className="text-xs text-gray-400">{formatDate(req.createdAt)}</p>
                  </div>
                </div>
              ))}
              {(!pendingRequests?.requests || pendingRequests.requests.length === 0) && (
                <p className="text-sm text-gray-400 text-center py-4">Aucune demande en attente</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Recent Orders */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <ShoppingCart className="h-5 w-5 text-blue-600" />
              Dernières Commandes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentOrders?.orders?.slice(0, 5).map((order: any) => (
                <div key={order.id} className="flex items-center justify-between border-b pb-2 last:border-0">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{order.poNumber}</p>
                    <p className="text-xs text-gray-500">{formatDate(order.orderDate)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-700">{formatXOF(order.totalAmount)}</p>
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${statusColors[order.status] || "bg-gray-100"}`}>
                      {statusLabels[order.status] || order.status}
                    </span>
                  </div>
                </div>
              ))}
              {(!recentOrders?.orders || recentOrders.orders.length === 0) && (
                <p className="text-sm text-gray-400 text-center py-4">Aucune commande</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top Vendors Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Top Fournisseurs</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 font-medium text-gray-500">Fournisseur</th>
                  <th className="text-left py-2 font-medium text-gray-500">Contact</th>
                  <th className="text-left py-2 font-medium text-gray-500">Statut</th>
                </tr>
              </thead>
              <tbody>
                {vendors?.items?.slice(0, 8).map((v: any) => (
                  <tr key={v.id} className="border-b last:border-0">
                    <td className="py-2 font-medium text-gray-900">{v.name}</td>
                    <td className="py-2 text-gray-600">{v.email || v.phone || "-"}</td>
                    <td className="py-2">
                      <Badge variant={v.status === "active" ? "default" : "secondary"}>
                        {v.status === "active" ? "Actif" : v.status}
                      </Badge>
                    </td>
                  </tr>
                ))}
                {(!vendors?.items || vendors.items.length === 0) && (
                  <tr><td colSpan={3} className="text-center py-4 text-gray-400">Aucun fournisseur</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
