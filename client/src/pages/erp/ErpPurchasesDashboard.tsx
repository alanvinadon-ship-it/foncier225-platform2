import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ShoppingCart, Package, Clock, TrendingUp, AlertTriangle, CheckCircle } from "lucide-react";

function formatXOF(amount: number): string {
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "XOF", maximumFractionDigits: 0 }).format(amount);
}

function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
}

export default function ErpPurchasesDashboard() {
  // KPIs overview
  const { data: stats, isLoading: statsLoading } = trpc.erp.purchases.stats.overview.useQuery();
  
  // Recent purchase orders
  const { data: recentOrders } = trpc.erp.purchases.orders.list.useQuery({ limit: 10, offset: 0 });
  
  // Recent purchase requests pending approval
  const { data: pendingRequests } = trpc.erp.purchases.requests.list.useQuery({ status: "submitted", limit: 5, offset: 0 });
  
  // Vendors list for top vendors
  const { data: vendors } = trpc.erp.vendors.list.useQuery({ limit: 100, offset: 0 });

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

  // Calculate delivery rate from orders
  const deliveryRate = recentOrders?.orders
    ? (() => {
        const delivered = recentOrders.orders.filter((o: any) => o.status === "fully_received" || o.status === "closed").length;
        const total = recentOrders.orders.length;
        return total > 0 ? Math.round((delivered / total) * 100) : 0;
      })()
    : 0;

  // Status distribution for orders
  const statusDistribution = useMemo(() => {
    if (!recentOrders?.orders) return [];
    const counts: Record<string, number> = {};
    recentOrders.orders.forEach((o: any) => {
      counts[o.status] = (counts[o.status] || 0) + 1;
    });
    return Object.entries(counts).map(([status, count]) => ({ status, count }));
  }, [recentOrders]);

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
        <Badge variant="outline" className="text-sm">
          {new Date().toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}
        </Badge>
      </div>

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
                    {kpi.isAmount ? kpi.value : kpi.value}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
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

      {/* Top Vendors */}
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
