import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, Users, FileText, Banknote, Home, TrendingUp } from "lucide-react";

export default function ErpRealEstateDashboard() {
  const { data: programs, isLoading: loadingPrograms } = trpc.erp.realEstate.programs.list.useQuery({ limit: 100, offset: 0 });
  const { data: customers } = trpc.erp.realEstate.customers.list.useQuery({ limit: 1, offset: 0 });
  const { data: sales } = trpc.erp.realEstate.sales.list.useQuery({ limit: 100, offset: 0 });
  const { data: reservations } = trpc.erp.realEstate.reservations.list.useQuery({ limit: 100, offset: 0 });

  const programsList = programs?.programs || [];
  const totalPrograms = programsList.length;
  const activePrograms = programsList.filter((p: any) => p.status === "active").length;
  const totalUnits = programsList.reduce((s: number, p: any) => s + (p.totalUnits || 0), 0);
  const availableUnits = programsList.reduce((s: number, p: any) => s + (p.availableUnits || 0), 0);
  const reservedUnits = programsList.reduce((s: number, p: any) => s + (p.reservedUnits || 0), 0);
  const soldUnits = programsList.reduce((s: number, p: any) => s + (p.soldUnits || 0), 0);
  const totalCustomers = customers?.total || 0;
  const totalSales = sales?.total || 0;
  const totalReservations = reservations?.total || 0;

  const salesList = sales?.sales || [];
  const totalRevenue = salesList.reduce((s: number, sale: any) => s + (sale.totalSaleAmount || 0), 0);

  if (loadingPrograms) {
    return <div className="p-6"><div className="animate-pulse space-y-4"><div className="h-8 bg-muted rounded w-1/3" /><div className="grid grid-cols-1 md:grid-cols-4 gap-4">{[1,2,3,4].map(i => <div key={i} className="h-32 bg-muted rounded" />)}</div></div></div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Vente Immobilière — Dashboard</h1>
        <p className="text-muted-foreground">Vue d'ensemble des programmes, ventes et encaissements</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Programmes</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalPrograms}</div>
            <p className="text-xs text-muted-foreground">{activePrograms} actifs</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Unités</CardTitle>
            <Home className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalUnits}</div>
            <p className="text-xs text-muted-foreground">{availableUnits} disponibles · {reservedUnits} réservées · {soldUnits} vendues</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Clients</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalCustomers}</div>
            <p className="text-xs text-muted-foreground">{totalReservations} réservations actives</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Chiffre d'affaires</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{(totalRevenue / 1000000).toFixed(1)} M</div>
            <p className="text-xs text-muted-foreground">XOF · {totalSales} ventes</p>
          </CardContent>
        </Card>
      </div>

      {/* Programmes récents */}
      <Card>
        <CardHeader>
          <CardTitle>Programmes Immobiliers</CardTitle>
        </CardHeader>
        <CardContent>
          {programsList.length === 0 ? (
            <p className="text-muted-foreground text-sm">Aucun programme créé. Créez votre premier programme immobilier.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 px-2">Code</th>
                    <th className="text-left py-2 px-2">Nom</th>
                    <th className="text-left py-2 px-2">Localisation</th>
                    <th className="text-center py-2 px-2">Statut</th>
                    <th className="text-center py-2 px-2">Unités</th>
                    <th className="text-center py-2 px-2">Vendues</th>
                    <th className="text-center py-2 px-2">Disponibles</th>
                  </tr>
                </thead>
                <tbody>
                  {programsList.slice(0, 10).map((p: any) => (
                    <tr key={p.id} className="border-b hover:bg-muted/50">
                      <td className="py-2 px-2 font-mono text-xs">{p.code}</td>
                      <td className="py-2 px-2 font-medium">{p.name}</td>
                      <td className="py-2 px-2 text-muted-foreground">{p.location || "—"}</td>
                      <td className="py-2 px-2 text-center">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${p.status === "active" ? "bg-green-100 text-green-800" : p.status === "completed" ? "bg-blue-100 text-blue-800" : "bg-gray-100 text-gray-800"}`}>
                          {p.status}
                        </span>
                      </td>
                      <td className="py-2 px-2 text-center">{p.totalUnits}</td>
                      <td className="py-2 px-2 text-center">{p.soldUnits}</td>
                      <td className="py-2 px-2 text-center">{p.availableUnits}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Ventes récentes */}
      <Card>
        <CardHeader>
          <CardTitle>Ventes Récentes</CardTitle>
        </CardHeader>
        <CardContent>
          {salesList.length === 0 ? (
            <p className="text-muted-foreground text-sm">Aucune vente enregistrée.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 px-2">N° Vente</th>
                    <th className="text-left py-2 px-2">Date</th>
                    <th className="text-center py-2 px-2">Statut</th>
                    <th className="text-right py-2 px-2">Montant (XOF)</th>
                  </tr>
                </thead>
                <tbody>
                  {salesList.slice(0, 10).map((sale: any) => (
                    <tr key={sale.id} className="border-b hover:bg-muted/50">
                      <td className="py-2 px-2 font-mono text-xs">{sale.saleNumber}</td>
                      <td className="py-2 px-2">{sale.saleDate ? new Date(sale.saleDate).toLocaleDateString("fr-FR") : "—"}</td>
                      <td className="py-2 px-2 text-center">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${sale.status === "fully_paid" ? "bg-green-100 text-green-800" : sale.status === "in_payment" ? "bg-yellow-100 text-yellow-800" : "bg-gray-100 text-gray-800"}`}>
                          {sale.status}
                        </span>
                      </td>
                      <td className="py-2 px-2 text-right font-medium">{(sale.totalSaleAmount || 0).toLocaleString("fr-FR")}</td>
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
