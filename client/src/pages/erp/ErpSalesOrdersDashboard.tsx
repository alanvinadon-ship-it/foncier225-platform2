import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Link } from "wouter";
import {
  ShoppingCart, TrendingUp, Clock, CreditCard, AlertCircle,
  Plus, Building2, ArrowRight
} from "lucide-react";

const STATUS_LABELS: Record<string, string> = {
  received: "Reçu",
  in_progress: "En cours",
  delivered: "Livré",
  invoiced: "Facturé",
  paid: "Payé",
  cancelled: "Annulé",
};

const STATUS_COLORS: Record<string, string> = {
  received: "bg-blue-100 text-blue-800",
  in_progress: "bg-amber-100 text-amber-800",
  delivered: "bg-purple-100 text-purple-800",
  invoiced: "bg-orange-100 text-orange-800",
  paid: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-800",
};

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("fr-FR").format(amount) + " FCFA";
}

export default function ErpSalesOrdersDashboard() {
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);

  const { data: dashboard, isLoading } = trpc.erp.salesOrders.orders.dashboard.useQuery({ year });

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Commandes Clients</h1>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <Card key={i}><CardContent className="pt-6 h-24 animate-pulse bg-muted/30" /></Card>
          ))}
        </div>
      </div>
    );
  }

  const kpis = dashboard?.kpis;
  const byStatus = dashboard?.byStatus;
  const byClient = dashboard?.byClient || [];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold">Commandes Clients</h1>
          <p className="text-muted-foreground">Bons de commande reçus de vos clients</p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
            <SelectTrigger className="w-[120px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[currentYear, currentYear - 1, currentYear - 2].map(y => (
                <SelectItem key={y} value={String(y)}>{y}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Link href="/erp/sales-orders/new">
            <Button><Plus className="h-4 w-4 mr-2" /> Nouvelle commande</Button>
          </Link>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <ShoppingCart className="h-8 w-8 text-blue-600" />
              <div>
                <p className="text-sm text-muted-foreground">Commandes</p>
                <p className="text-2xl font-bold">{kpis?.totalOrders || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <TrendingUp className="h-8 w-8 text-green-600" />
              <div>
                <p className="text-sm text-muted-foreground">CA Total</p>
                <p className="text-xl font-bold">{formatCurrency(kpis?.totalCA || 0)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <CreditCard className="h-8 w-8 text-emerald-600" />
              <div>
                <p className="text-sm text-muted-foreground">Encaissé</p>
                <p className="text-xl font-bold">{formatCurrency(kpis?.paidAmount || 0)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Clock className="h-8 w-8 text-amber-600" />
              <div>
                <p className="text-sm text-muted-foreground">En attente</p>
                <p className="text-xl font-bold">{formatCurrency(kpis?.pendingAmount || 0)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <AlertCircle className="h-8 w-8 text-red-600" />
              <div>
                <p className="text-sm text-muted-foreground">Impact Tréso</p>
                <p className="text-xl font-bold">{formatCurrency(kpis?.cashImpact || 0)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Status breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Répartition par statut</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            {byStatus && Object.entries(byStatus).map(([status, count]) => (
              <Link key={status} href={`/erp/sales-orders/list?status=${status}`}>
                <div className="flex items-center gap-2 px-4 py-2 rounded-lg border hover:bg-muted/50 cursor-pointer transition-colors">
                  <Badge className={STATUS_COLORS[status]}>{STATUS_LABELS[status]}</Badge>
                  <span className="text-lg font-semibold">{count as number}</span>
                </div>
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Par client */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg">Chiffre d'affaires par client</CardTitle>
          <Link href="/erp/sales-orders/clients">
            <Button variant="ghost" size="sm">Voir tous les clients <ArrowRight className="h-4 w-4 ml-1" /></Button>
          </Link>
        </CardHeader>
        <CardContent>
          {byClient.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">Aucune commande enregistrée pour {year}</p>
          ) : (
            <div className="space-y-3">
              {byClient.map((c) => (
                <div key={c.clientId} className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/30 transition-colors">
                  <div className="flex items-center gap-3">
                    <Building2 className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium">{c.clientName}</p>
                      <p className="text-sm text-muted-foreground">{c.clientCode} — {c.orderCount} commande{c.orderCount > 1 ? "s" : ""}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">{formatCurrency(c.totalCA)}</p>
                    {c.pendingAmount > 0 && (
                      <p className="text-xs text-amber-600">{formatCurrency(c.pendingAmount)} en attente</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
