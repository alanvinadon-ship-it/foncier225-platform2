import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Link, useSearch } from "wouter";
import { Plus, Eye, ArrowLeft } from "lucide-react";

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

const PRIORITY_LABELS: Record<string, string> = {
  low: "Basse",
  normal: "Normale",
  high: "Haute",
  urgent: "Urgente",
};

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("fr-FR").format(amount) + " FCFA";
}

function formatDate(ts: number) {
  return new Date(ts).toLocaleDateString("fr-FR");
}

export default function ErpSalesOrdersList() {
  const searchParams = useSearch();
  const urlStatus = new URLSearchParams(searchParams).get("status") || "";
  
  const [statusFilter, setStatusFilter] = useState(urlStatus);
  const [clientFilter, setClientFilter] = useState("");
  const [search, setSearch] = useState("");

  const { data: clients } = trpc.erp.salesOrders.clients.list.useQuery({ activeOnly: true });
  const { data, isLoading } = trpc.erp.salesOrders.orders.list.useQuery({
    status: statusFilter || undefined,
    clientId: clientFilter ? Number(clientFilter) : undefined,
    limit: 100,
  });

  const orders = data?.orders || [];
  const filtered = search
    ? orders.filter(o =>
        o.orderNumber.toLowerCase().includes(search.toLowerCase()) ||
        o.subject.toLowerCase().includes(search.toLowerCase()) ||
        o.clientRef?.toLowerCase().includes(search.toLowerCase()) ||
        o.clientName?.toLowerCase().includes(search.toLowerCase())
      )
    : orders;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <Link href="/erp/sales-orders">
            <Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">Liste des commandes</h1>
            <p className="text-muted-foreground">{data?.total || 0} commande(s) au total</p>
          </div>
        </div>
        <Link href="/erp/sales-orders/new">
          <Button><Plus className="h-4 w-4 mr-2" /> Nouvelle commande</Button>
        </Link>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-3">
            <Input
              placeholder="Rechercher (n°, objet, client...)"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-64"
            />
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Tous les statuts" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Tous les statuts</SelectItem>
                {Object.entries(STATUS_LABELS).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={clientFilter} onValueChange={setClientFilter}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Tous les clients" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Tous les clients</SelectItem>
                {clients?.map(c => (
                  <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="pt-6">
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Chargement...</div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">Aucune commande trouvée</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="pb-3 font-medium">N° Commande</th>
                    <th className="pb-3 font-medium">Client</th>
                    <th className="pb-3 font-medium">Objet</th>
                    <th className="pb-3 font-medium">Date BC</th>
                    <th className="pb-3 font-medium text-right">Montant TTC</th>
                    <th className="pb-3 font-medium">Statut</th>
                    <th className="pb-3 font-medium">Paiement</th>
                    <th className="pb-3 font-medium"></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(order => (
                    <tr key={order.id} className="border-b last:border-0 hover:bg-muted/30">
                      <td className="py-3 font-mono text-xs">{order.orderNumber}</td>
                      <td className="py-3">
                        <div>
                          <p className="font-medium">{order.clientName}</p>
                          {order.clientRef && <p className="text-xs text-muted-foreground">Réf: {order.clientRef}</p>}
                        </div>
                      </td>
                      <td className="py-3 max-w-[200px] truncate">{order.subject}</td>
                      <td className="py-3 text-muted-foreground">{formatDate(order.orderDate)}</td>
                      <td className="py-3 text-right font-medium">{formatCurrency(order.totalTTC || 0)}</td>
                      <td className="py-3">
                        <Badge className={STATUS_COLORS[order.status]}>{STATUS_LABELS[order.status]}</Badge>
                      </td>
                      <td className="py-3">
                        <Badge variant={order.paymentStatus === "paid" ? "default" : "outline"}>
                          {order.paymentStatus === "paid" ? "Payé" : order.paymentStatus === "partial" ? "Partiel" : "En attente"}
                        </Badge>
                      </td>
                      <td className="py-3">
                        <Link href={`/erp/sales-orders/${order.id}`}>
                          <Button variant="ghost" size="sm"><Eye className="h-4 w-4" /></Button>
                        </Link>
                      </td>
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
