import { trpc } from "@/lib/trpc";
import { Clock } from "lucide-react";

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

const EVENT_TYPE_LABELS: Record<string, string> = {
  creation: "Création",
  opposition: "Opposition",
  mediation: "Médiation",
  gel: "Gel",
  validation: "Validation",
  notary: "Notaire",
  insurance: "Assurance",
  terrain_visit: "Visite terrain",
  document_added: "Document ajouté",
  status_change: "Changement de statut",
};

export default function CitizenTimeline() {
  const { data: timeline, isLoading } = trpc.citizen.timeline.useQuery();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Clock className="h-6 w-6 text-blue-500" />
          Timeline
        </h1>
        <p className="text-muted-foreground mt-1">
          Historique de tous les événements liés à vos parcelles
        </p>
      </div>

      {isLoading ? (
        <div className="border rounded-lg p-8 text-center text-muted-foreground">
          Chargement de votre timeline...
        </div>
      ) : !timeline || timeline.length === 0 ? (
        <div className="border rounded-lg p-8 text-center">
          <Clock className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
          <h3 className="font-semibold text-lg mb-2">Aucun événement</h3>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            Aucun événement n'a été enregistré pour vos parcelles.
            Les événements apparaîtront ici au fur et à mesure de l'avancement de vos dossiers.
          </p>
        </div>
      ) : (
        <div className="border rounded-lg bg-background">
          <div className="p-5">
            <div className="space-y-0">
              {timeline.map((event, idx) => (
                <div key={event.id} className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <div className="h-10 w-10 rounded-full bg-accent/50 flex items-center justify-center shrink-0">
                      <span className="text-lg">{EVENT_ICONS[event.eventType] || "📌"}</span>
                    </div>
                    {idx < timeline.length - 1 && (
                      <div className="w-px flex-1 bg-border" />
                    )}
                  </div>
                  <div className="pb-6 pt-1">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-sm font-medium">{event.title}</p>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-accent text-muted-foreground">
                        {EVENT_TYPE_LABELS[event.eventType] || event.eventType}
                      </span>
                    </div>
                    {event.description && (
                      <p className="text-sm text-muted-foreground">{event.description}</p>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">
                      {event.monthYear || new Date(event.createdAt).toLocaleDateString("fr-FR", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
