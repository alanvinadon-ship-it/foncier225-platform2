import { trpc } from "@/lib/trpc";
import { MapPin, FileText, Clock, ArrowRight } from "lucide-react";
import { Link } from "wouter";

const STATUS_LABELS: Record<string, string> = {
  dossier_en_cours: "Dossier en cours",
  en_opposition: "En opposition",
  gele: "Gelé",
  mediation_en_cours: "Médiation en cours",
  acte_notarie_enregistre: "Acte notarié",
  valide: "Validé",
};

const STATUS_COLORS: Record<string, string> = {
  dossier_en_cours: "bg-blue-100 text-blue-700",
  en_opposition: "bg-red-100 text-red-700",
  gele: "bg-gray-100 text-gray-700",
  mediation_en_cours: "bg-yellow-100 text-yellow-700",
  acte_notarie_enregistre: "bg-purple-100 text-purple-700",
  valide: "bg-green-100 text-green-700",
};

export default function CitizenDashboard() {
  const { data: stats, isLoading: statsLoading } = trpc.citizen.dashboardStats.useQuery();
  const { data: parcels, isLoading: parcelsLoading } = trpc.citizen.myParcels.useQuery();
  const { data: timeline, isLoading: timelineLoading } = trpc.citizen.timeline.useQuery();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Tableau de bord</h1>
        <p className="text-muted-foreground mt-1">
          Bienvenue dans votre espace personnel Foncier225
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="border rounded-lg p-5 bg-background">
          <div className="flex items-center gap-3 mb-3">
            <div className="h-10 w-10 rounded-lg bg-ci-orange/10 flex items-center justify-center">
              <MapPin className="h-5 w-5 text-ci-orange" />
            </div>
            <span className="text-sm text-muted-foreground">Mes parcelles</span>
          </div>
          <p className="text-3xl font-bold">
            {statsLoading ? "—" : stats?.parcels ?? 0}
          </p>
        </div>
        <div className="border rounded-lg p-5 bg-background">
          <div className="flex items-center gap-3 mb-3">
            <div className="h-10 w-10 rounded-lg bg-ci-green/10 flex items-center justify-center">
              <FileText className="h-5 w-5 text-ci-green" />
            </div>
            <span className="text-sm text-muted-foreground">Mes documents</span>
          </div>
          <p className="text-3xl font-bold">
            {statsLoading ? "—" : stats?.documents ?? 0}
          </p>
        </div>
        <div className="border rounded-lg p-5 bg-background">
          <div className="flex items-center gap-3 mb-3">
            <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
              <Clock className="h-5 w-5 text-blue-500" />
            </div>
            <span className="text-sm text-muted-foreground">Événements récents</span>
          </div>
          <p className="text-3xl font-bold">
            {timelineLoading ? "—" : timeline?.length ?? 0}
          </p>
        </div>
      </div>

      {/* Recent Parcels */}
      <div className="border rounded-lg bg-background">
        <div className="flex items-center justify-between p-5 border-b">
          <h2 className="font-semibold flex items-center gap-2">
            <MapPin className="h-4 w-4 text-ci-orange" />
            Mes parcelles récentes
          </h2>
          <Link href="/citizen/parcels" className="text-sm text-ci-orange hover:underline flex items-center gap-1">
            Voir tout <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
        <div className="p-5">
          {parcelsLoading ? (
            <p className="text-sm text-muted-foreground">Chargement...</p>
          ) : !parcels || parcels.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Aucune parcelle associée à votre compte. Contactez un agent pour lier vos parcelles.
            </p>
          ) : (
            <div className="space-y-3">
              {parcels.slice(0, 5).map(parcel => (
                <Link key={parcel.id} href={`/citizen/parcels/${parcel.id}`}>
                  <div className="flex items-center justify-between p-3 rounded-lg hover:bg-accent/50 transition-colors cursor-pointer">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded bg-ci-orange/10 flex items-center justify-center">
                        <MapPin className="h-4 w-4 text-ci-orange" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">{parcel.reference}</p>
                        <p className="text-xs text-muted-foreground">{parcel.localisation || parcel.zoneCode}</p>
                      </div>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-full ${STATUS_COLORS[parcel.statusPublic] || "bg-gray-100"}`}>
                      {STATUS_LABELS[parcel.statusPublic] || parcel.statusPublic}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Recent Timeline */}
      <div className="border rounded-lg bg-background">
        <div className="flex items-center justify-between p-5 border-b">
          <h2 className="font-semibold flex items-center gap-2">
            <Clock className="h-4 w-4 text-blue-500" />
            Activité récente
          </h2>
          <Link href="/citizen/timeline" className="text-sm text-ci-orange hover:underline flex items-center gap-1">
            Voir tout <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
        <div className="p-5">
          {timelineLoading ? (
            <p className="text-sm text-muted-foreground">Chargement...</p>
          ) : !timeline || timeline.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Aucune activité récente sur vos parcelles.
            </p>
          ) : (
            <div className="space-y-3">
              {timeline.slice(0, 5).map(event => (
                <div key={event.id} className="flex items-start gap-3 p-3 rounded-lg">
                  <div className="h-2 w-2 rounded-full bg-ci-orange mt-2 shrink-0" />
                  <div>
                    <p className="text-sm font-medium">{event.title}</p>
                    {event.description && (
                      <p className="text-xs text-muted-foreground mt-0.5">{event.description}</p>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">
                      {event.monthYear || new Date(event.createdAt).toLocaleDateString("fr-FR")}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
