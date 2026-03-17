import PublicLayout from "@/components/PublicLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/lib/trpc";
import {
  AlertTriangle,
  Calendar,
  CheckCircle2,
  Clock,
  FileText,
  Gavel,
  MapPin,
  Scale,
  Shield,
  Snowflake,
} from "lucide-react";
import { useParams } from "wouter";

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ElementType; bg: string }> = {
  dossier_en_cours: { label: "Dossier en cours", color: "text-blue-700", icon: Clock, bg: "bg-blue-50 border-blue-200" },
  en_opposition: { label: "En opposition", color: "text-orange-700", icon: AlertTriangle, bg: "bg-orange-50 border-orange-200" },
  gele: { label: "Gelé", color: "text-red-700", icon: Snowflake, bg: "bg-red-50 border-red-200" },
  mediation_en_cours: { label: "Médiation en cours", color: "text-yellow-700", icon: Scale, bg: "bg-yellow-50 border-yellow-200" },
  acte_notarie_enregistre: { label: "Acte notarié enregistré", color: "text-purple-700", icon: Gavel, bg: "bg-purple-50 border-purple-200" },
  valide: { label: "Validé", color: "text-green-700", icon: CheckCircle2, bg: "bg-green-50 border-green-200" },
};

const EVENT_ICONS: Record<string, React.ElementType> = {
  creation: FileText,
  opposition: AlertTriangle,
  mediation: Scale,
  gel: Snowflake,
  validation: CheckCircle2,
  notary: Gavel,
  insurance: Shield,
  terrain_visit: MapPin,
  document_added: FileText,
  status_change: Clock,
};

export default function ParcelPublic() {
  const params = useParams<{ token: string }>();
  const token = params.token;

  const { data: parcel, isLoading, error } = trpc.parcel.getPublic.useQuery(
    { publicToken: token || "" },
    { enabled: !!token, retry: false }
  );

  const { data: events, isLoading: eventsLoading } = trpc.parcel.getPublicEvents.useQuery(
    { publicToken: token || "" },
    { enabled: !!token && !!parcel, retry: false }
  );

  if (isLoading) {
    return (
      <PublicLayout>
        <div className="container py-12">
          <Skeleton className="h-8 w-64 mb-4" />
          <Skeleton className="h-48 w-full mb-6" />
          <Skeleton className="h-32 w-full" />
        </div>
      </PublicLayout>
    );
  }

  if (error || !parcel) {
    return (
      <PublicLayout>
        <div className="container py-20 text-center">
          <div className="max-w-md mx-auto">
            <div className="h-16 w-16 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="h-8 w-8 text-red-500" />
            </div>
            <h1 className="text-2xl font-bold mb-2">Parcelle introuvable</h1>
            <p className="text-muted-foreground mb-6">
              Le token fourni ne correspond à aucune parcelle enregistrée dans le système.
            </p>
            <Button variant="outline" onClick={() => window.history.back()}>
              Retour
            </Button>
          </div>
        </div>
      </PublicLayout>
    );
  }

  const statusCfg = STATUS_CONFIG[parcel.statusPublic] || STATUS_CONFIG.dossier_en_cours;
  const StatusIcon = statusCfg.icon;

  return (
    <PublicLayout>
      <div className="bg-ci-green-light/50 border-b">
        <div className="container py-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <MapPin className="h-3.5 w-3.5" />
            <span>Parcelle publique</span>
            <span className="text-border">/</span>
            <span className="font-medium text-foreground">{parcel.reference}</span>
          </div>
        </div>
      </div>

      <div className="container py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main info */}
          <div className="lg:col-span-2 space-y-6">
            {/* Status card */}
            <div className={`rounded-lg border p-6 ${statusCfg.bg}`}>
              <div className="flex items-start gap-4">
                <div className={`h-12 w-12 rounded-lg flex items-center justify-center ${statusCfg.color} bg-white/80`}>
                  <StatusIcon className="h-6 w-6" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-1">
                    <h1 className="text-2xl font-bold">{parcel.reference}</h1>
                    <Badge className={`${statusCfg.color} bg-white/60 border`}>
                      {statusCfg.label}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Zone : {parcel.zoneCode} {parcel.localisation && `— ${parcel.localisation}`}
                  </p>
                </div>
              </div>
            </div>

            {/* Details */}
            <div className="rounded-lg border bg-card p-6">
              <h2 className="font-semibold text-lg mb-4">Informations publiques</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <InfoRow label="Référence" value={parcel.reference} />
                <InfoRow label="Zone" value={parcel.zoneCode} />
                <InfoRow label="Surface approx." value={parcel.surfaceApprox || "Non renseignée"} />
                <InfoRow label="Localisation" value={parcel.localisation || "Non renseignée"} />
                <InfoRow label="Statut" value={statusCfg.label} />
                <InfoRow label="Dernière mise à jour" value={new Date(parcel.updatedAt).toLocaleDateString("fr-FR")} />
              </div>
              <div className="mt-4 pt-4 border-t">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Shield className="h-3 w-3" />
                  <span>Aucune donnée personnelle n'est affichée sur cette page</span>
                </div>
              </div>
            </div>

            {/* Timeline */}
            <div className="rounded-lg border bg-card p-6">
              <h2 className="font-semibold text-lg mb-4">Timeline synthétique</h2>
              {eventsLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map(i => <Skeleton key={i} className="h-16 w-full" />)}
                </div>
              ) : events && events.length > 0 ? (
                <div className="relative">
                  <div className="absolute left-5 top-0 bottom-0 w-px bg-border" />
                  <div className="space-y-4">
                    {events.map((evt: any, idx: number) => {
                      const EvtIcon = EVENT_ICONS[evt.eventType] || Clock;
                      return (
                        <div key={evt.id || idx} className="relative flex gap-4">
                          <div className="relative z-10 h-10 w-10 rounded-full bg-ci-green-light border-2 border-ci-green flex items-center justify-center shrink-0">
                            <EvtIcon className="h-4 w-4 text-ci-green" />
                          </div>
                          <div className="flex-1 pb-4">
                            <div className="flex items-center gap-2 mb-0.5">
                              <span className="font-medium text-sm">{evt.title}</span>
                              {evt.monthYear && (
                                <span className="text-xs text-muted-foreground flex items-center gap-1">
                                  <Calendar className="h-3 w-3" />
                                  {evt.monthYear}
                                </span>
                              )}
                            </div>
                            {evt.description && (
                              <p className="text-sm text-muted-foreground">{evt.description}</p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Aucun événement public enregistré.</p>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <div className="rounded-lg border bg-card p-6">
              <h3 className="font-semibold mb-3 text-sm">Vérification rapide</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Cette page affiche uniquement les informations publiques de la parcelle. 
                Aucune donnée personnelle n'est exposée.
              </p>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle2 className="h-4 w-4 text-ci-green" />
                  <span>Parcelle enregistrée</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle2 className="h-4 w-4 text-ci-green" />
                  <span>Données publiques vérifiées</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Shield className="h-4 w-4 text-ci-green" />
                  <span>Zéro PII exposée</span>
                </div>
              </div>
            </div>

            {parcel.kpiFlagsJson && Object.keys(parcel.kpiFlagsJson).length > 0 && (
              <div className="rounded-lg border bg-card p-6">
                <h3 className="font-semibold mb-3 text-sm">Indicateurs</h3>
                <div className="space-y-2">
                  {Object.entries(parcel.kpiFlagsJson).map(([key, val]) => (
                    <div key={key} className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground capitalize">{key.replace(/_/g, " ")}</span>
                      <Badge variant={val ? "default" : "secondary"} className="text-xs">
                        {val ? "Oui" : "Non"}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </PublicLayout>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="text-xs text-muted-foreground">{label}</span>
      <p className="font-medium text-sm">{value}</p>
    </div>
  );
}
