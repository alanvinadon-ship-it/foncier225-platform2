import { trpc } from "@/lib/trpc";
import { MapPin, Clock, FileText, ArrowLeft, ExternalLink, Shield } from "lucide-react";
import { Link, useParams } from "wouter";

const STATUS_LABELS: Record<string, string> = {
  dossier_en_cours: "Dossier en cours",
  en_opposition: "En opposition",
  gele: "Gelé",
  mediation_en_cours: "Médiation en cours",
  acte_notarie_enregistre: "Acte notarié",
  valide: "Validé",
};

const STATUS_COLORS: Record<string, string> = {
  dossier_en_cours: "bg-blue-100 text-blue-700 border-blue-200",
  en_opposition: "bg-red-100 text-red-700 border-red-200",
  gele: "bg-gray-100 text-gray-700 border-gray-200",
  mediation_en_cours: "bg-yellow-100 text-yellow-700 border-yellow-200",
  acte_notarie_enregistre: "bg-purple-100 text-purple-700 border-purple-200",
  valide: "bg-green-100 text-green-700 border-green-200",
};

const EVENT_ICONS: Record<string, string> = {
  creation: "🏗️",
  opposition: "⚠️",
  mediation: "🤝",
  gel: "❄️",
  validation: "✅",
  notary: "📜",
  insurance: "🛡️",
  terrain_visit: "🔍",
  document_added: "📄",
  status_change: "🔄",
};

const DOC_TYPE_LABELS: Record<string, string> = {
  attestation: "Attestation",
  titre_foncier: "Titre foncier",
  plan_cadastral: "Plan cadastral",
  pv_bornage: "PV de bornage",
  acte_vente: "Acte de vente",
  certificat_propriete: "Certificat de propriété",
  rapport_expertise: "Rapport d'expertise",
  autre: "Autre",
};

export default function CitizenParcelDetail() {
  const params = useParams<{ id: string }>();
  const parcelId = parseInt(params.id || "0", 10);

  const { data: parcel, isLoading: parcelLoading, error: parcelError } = trpc.citizen.parcelDetail.useQuery(
    { parcelId },
    { enabled: parcelId > 0 }
  );
  const { data: events, isLoading: eventsLoading } = trpc.citizen.parcelEvents.useQuery(
    { parcelId },
    { enabled: parcelId > 0 }
  );
  const { data: docs, isLoading: docsLoading } = trpc.citizen.parcelDocuments.useQuery(
    { parcelId },
    { enabled: parcelId > 0 }
  );
  const { data: attestations, isLoading: attestLoading } = trpc.citizen.parcelAttestations.useQuery(
    { parcelId },
    { enabled: parcelId > 0 }
  );

  if (parcelLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-muted-foreground">Chargement de la parcelle...</p>
      </div>
    );
  }

  if (parcelError || !parcel) {
    return (
      <div className="space-y-6">
        <Link href="/citizen/parcels" className="text-sm text-ci-orange hover:underline flex items-center gap-1">
          <ArrowLeft className="h-4 w-4" /> Retour à mes parcelles
        </Link>
        <div className="border rounded-lg p-8 text-center">
          <Shield className="h-12 w-12 text-red-400 mx-auto mb-4" />
          <h3 className="font-semibold text-lg mb-2">Accès non autorisé</h3>
          <p className="text-sm text-muted-foreground">
            Cette parcelle n'existe pas ou n'est pas associée à votre compte.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <Link href="/citizen/parcels" className="text-sm text-ci-orange hover:underline flex items-center gap-1 mb-3">
            <ArrowLeft className="h-4 w-4" /> Retour à mes parcelles
          </Link>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <MapPin className="h-6 w-6 text-ci-orange" />
            Parcelle {parcel.reference}
          </h1>
        </div>
        <Link href={`/parcelle/${parcel.publicToken}`}>
          <button className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1 border rounded-lg px-3 py-2 hover:bg-accent transition-colors">
            <ExternalLink className="h-4 w-4" /> Page publique
          </button>
        </Link>
      </div>

      {/* Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="border rounded-lg p-4">
          <p className="text-xs text-muted-foreground mb-1">Statut</p>
          <span className={`text-sm px-3 py-1 rounded-full border ${STATUS_COLORS[parcel.statusPublic] || "bg-gray-100"}`}>
            {STATUS_LABELS[parcel.statusPublic] || parcel.statusPublic}
          </span>
        </div>
        <div className="border rounded-lg p-4">
          <p className="text-xs text-muted-foreground mb-1">Zone</p>
          <p className="text-sm font-medium">{parcel.zoneCode}</p>
        </div>
        <div className="border rounded-lg p-4">
          <p className="text-xs text-muted-foreground mb-1">Localisation</p>
          <p className="text-sm font-medium">{parcel.localisation || "—"}</p>
        </div>
        <div className="border rounded-lg p-4">
          <p className="text-xs text-muted-foreground mb-1">Surface approximative</p>
          <p className="text-sm font-medium">{parcel.surfaceApprox || "—"}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Timeline */}
        <div className="border rounded-lg bg-background">
          <div className="p-5 border-b">
            <h2 className="font-semibold flex items-center gap-2">
              <Clock className="h-4 w-4 text-blue-500" />
              Historique du dossier
            </h2>
          </div>
          <div className="p-5">
            {eventsLoading ? (
              <p className="text-sm text-muted-foreground">Chargement...</p>
            ) : !events || events.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucun événement enregistré.</p>
            ) : (
              <div className="space-y-4">
                {events.map((event, idx) => (
                  <div key={event.id} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <span className="text-lg">{EVENT_ICONS[event.eventType] || "📌"}</span>
                      {idx < events.length - 1 && (
                        <div className="w-px h-full bg-border mt-1" />
                      )}
                    </div>
                    <div className="pb-4">
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

        {/* Documents & Attestations */}
        <div className="space-y-6">
          {/* Documents */}
          <div className="border rounded-lg bg-background">
            <div className="p-5 border-b">
              <h2 className="font-semibold flex items-center gap-2">
                <FileText className="h-4 w-4 text-ci-green" />
                Documents
              </h2>
            </div>
            <div className="p-5">
              {docsLoading ? (
                <p className="text-sm text-muted-foreground">Chargement...</p>
              ) : !docs || docs.length === 0 ? (
                <p className="text-sm text-muted-foreground">Aucun document disponible.</p>
              ) : (
                <div className="space-y-2">
                  {docs.map(doc => (
                    <div key={doc.id} className="flex items-center justify-between p-3 rounded-lg hover:bg-accent/30 transition-colors">
                      <div className="flex items-center gap-3">
                        <FileText className="h-4 w-4 text-ci-green" />
                        <div>
                          <p className="text-sm font-medium">{doc.title}</p>
                          <p className="text-xs text-muted-foreground">
                            {DOC_TYPE_LABELS[doc.documentType] || doc.documentType}
                          </p>
                        </div>
                      </div>
                      {doc.fileUrl && (
                        <a href={doc.fileUrl} target="_blank" rel="noopener noreferrer" className="text-ci-orange hover:underline text-xs">
                          Télécharger
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Attestations */}
          <div className="border rounded-lg bg-background">
            <div className="p-5 border-b">
              <h2 className="font-semibold flex items-center gap-2">
                <Shield className="h-4 w-4 text-purple-500" />
                Attestations
              </h2>
            </div>
            <div className="p-5">
              {attestLoading ? (
                <p className="text-sm text-muted-foreground">Chargement...</p>
              ) : !attestations || attestations.length === 0 ? (
                <p className="text-sm text-muted-foreground">Aucune attestation émise.</p>
              ) : (
                <div className="space-y-2">
                  {attestations.map(att => (
                    <div key={att.id} className="flex items-center justify-between p-3 rounded-lg hover:bg-accent/30 transition-colors">
                      <div>
                        <p className="text-sm font-medium capitalize">{att.attestationType.replace(/_/g, " ")}</p>
                        <p className="text-xs text-muted-foreground">
                          Statut : {att.status} — {att.issuedAt ? new Date(att.issuedAt).toLocaleDateString("fr-FR") : "Non émise"}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
