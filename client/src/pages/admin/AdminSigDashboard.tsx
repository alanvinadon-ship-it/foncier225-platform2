import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Globe,
  MapPin,
  Layers,
  BarChart3,
  Download,
  CheckCircle2,
  XCircle,
  Loader2,
  TreePine,
} from "lucide-react";
import { Link } from "wouter";
import { toast } from "sonner";

const STATUS_LABELS: Record<string, string> = {
  dossier_en_cours: "En cours",
  en_opposition: "Opposition",
  gele: "Gelé",
  mediation_en_cours: "Médiation",
  acte_notarie_enregistre: "Acte notarié",
  valide: "Validé",
  draft: "Brouillon",
  collecting: "Collecte",
  submitted: "Soumis",
  validated_chief: "Validé chef",
  official: "Officiel",
  synced: "Synchronisé",
};

const STATUS_COLORS: Record<string, string> = {
  dossier_en_cours: "bg-blue-100 text-blue-800",
  en_opposition: "bg-orange-100 text-orange-800",
  gele: "bg-red-100 text-red-800",
  mediation_en_cours: "bg-yellow-100 text-yellow-800",
  acte_notarie_enregistre: "bg-purple-100 text-purple-800",
  valide: "bg-green-100 text-green-800",
  draft: "bg-gray-100 text-gray-800",
  collecting: "bg-blue-100 text-blue-800",
  submitted: "bg-indigo-100 text-indigo-800",
  validated_chief: "bg-teal-100 text-teal-800",
  official: "bg-green-100 text-green-800",
  synced: "bg-emerald-100 text-emerald-800",
};

export default function AdminSigDashboard() {
  const { data: stats, isLoading } = trpc.admin.sigDashboardStats.useQuery();
  const exportMutation = trpc.delimitation.exportAllParcelsGeoJSON.useMutation({
    onSuccess: (data) => {
      toast.success(`Export réussi : ${data.count} parcelles`);
      window.open(data.url, "_blank");
    },
    onError: (err) => {
      toast.error(err.message);
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="p-6 text-center text-muted-foreground">
        Impossible de charger les statistiques SIG.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <BarChart3 className="h-6 w-6 text-indigo-500" />
            Tableau de bord SIG
          </h1>
          <p className="text-muted-foreground mt-1">
            Statistiques spatiales et couverture cadastrale
          </p>
        </div>
        <div className="flex items-center gap-3">
          {stats.sigEnabled ? (
            <Badge className="bg-green-100 text-green-800 gap-1">
              <CheckCircle2 className="h-3 w-3" />
              SIG {stats.sigProvider} actif
            </Badge>
          ) : (
            <Badge variant="secondary" className="gap-1">
              <XCircle className="h-3 w-3" />
              SIG non configuré
            </Badge>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => exportMutation.mutate()}
            disabled={exportMutation.isPending}
          >
            {exportMutation.isPending ? (
              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
            ) : (
              <Download className="h-4 w-4 mr-1" />
            )}
            Export GeoJSON
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              Parcelles totales
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.totalParcels.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Surface totale : {stats.totalSurface.toLocaleString()} m²
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <TreePine className="h-4 w-4" />
              Territoires délimités
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.totalTerritories.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Superficie : {stats.totalDelimitedArea.toLocaleString()} ha
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Layers className="h-4 w-4" />
              Zones cadastrales
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.parcelsByZone.length}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Zones distinctes enregistrées
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Globe className="h-4 w-4" />
              Fournisseur SIG
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold capitalize">
              {stats.sigEnabled ? stats.sigProvider.replace("_", " ") : "Non configuré"}
            </div>
            {!stats.sigEnabled && (
              <Link href="/admin/sig-config">
                <Button variant="link" size="sm" className="p-0 h-auto text-xs">
                  Configurer →
                </Button>
              </Link>
            )}
          </CardContent>
        </Card>
      </div>

      <Separator />

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Parcels by Status */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Répartition des parcelles par statut</CardTitle>
          </CardHeader>
          <CardContent>
            {stats.parcelsByStatus.length === 0 ? (
              <p className="text-muted-foreground text-sm">Aucune donnée disponible</p>
            ) : (
              <div className="space-y-3">
                {stats.parcelsByStatus.map((item) => {
                  const pct = stats.totalParcels > 0 ? (item.count / stats.totalParcels) * 100 : 0;
                  return (
                    <div key={item.status} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <Badge className={STATUS_COLORS[item.status] || "bg-gray-100 text-gray-800"}>
                          {STATUS_LABELS[item.status] || item.status}
                        </Badge>
                        <span className="font-medium">{item.count} ({pct.toFixed(1)}%)</span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary rounded-full transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Territories by Status */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Territoires par statut de délimitation</CardTitle>
          </CardHeader>
          <CardContent>
            {stats.terrByStatus.length === 0 ? (
              <p className="text-muted-foreground text-sm">Aucune donnée disponible</p>
            ) : (
              <div className="space-y-3">
                {stats.terrByStatus.map((item) => {
                  const pct = stats.totalTerritories > 0 ? (item.count / stats.totalTerritories) * 100 : 0;
                  return (
                    <div key={item.status} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <Badge className={STATUS_COLORS[item.status] || "bg-gray-100 text-gray-800"}>
                          {STATUS_LABELS[item.status] || item.status}
                        </Badge>
                        <span className="font-medium">{item.count} ({pct.toFixed(1)}%)</span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-emerald-500 rounded-full transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Parcels by Zone */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Top 10 zones cadastrales</CardTitle>
          </CardHeader>
          <CardContent>
            {stats.parcelsByZone.length === 0 ? (
              <p className="text-muted-foreground text-sm">Aucune donnée disponible</p>
            ) : (
              <div className="space-y-2">
                {stats.parcelsByZone.map((item, idx) => (
                  <div key={item.zone} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground w-5 text-right">{idx + 1}.</span>
                      <span className="font-medium">{item.zone}</span>
                    </div>
                    <Badge variant="secondary">{item.count}</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Territories by Name */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Territoires enregistrés</CardTitle>
          </CardHeader>
          <CardContent>
            {stats.territoriesByName.length === 0 ? (
              <p className="text-muted-foreground text-sm">Aucune donnée disponible</p>
            ) : (
              <div className="space-y-2">
                {stats.territoriesByName.map((item, idx) => (
                  <div key={item.name} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground w-5 text-right">{idx + 1}.</span>
                      <span className="font-medium">{item.name}</span>
                    </div>
                    <Badge variant="secondary">{item.count}</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick actions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Actions rapides</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <Link href="/admin/sig-config">
              <Button variant="outline" size="sm">
                <Globe className="h-4 w-4 mr-1" />
                Configuration SIG
              </Button>
            </Link>
            <Link href="/admin/delimitation">
              <Button variant="outline" size="sm">
                <TreePine className="h-4 w-4 mr-1" />
                Délimitation villageoise
              </Button>
            </Link>
            <Link href="/admin/parcels">
              <Button variant="outline" size="sm">
                <MapPin className="h-4 w-4 mr-1" />
                Gestion des parcelles
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
