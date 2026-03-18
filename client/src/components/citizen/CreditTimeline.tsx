import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, Clock3, FileUp, FolderClock } from "lucide-react";

export type CreditTimelineEvent = {
  id: string;
  title: string;
  description: string;
  at?: Date | string | null;
  tone?: "default" | "success";
};

export function CreditTimeline({
  events,
}: {
  events: CreditTimelineEvent[];
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Historique du dossier</CardTitle>
      </CardHeader>
      <CardContent>
        {events.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucun evenement disponible pour le moment.</p>
        ) : (
          <div className="space-y-4">
            {events.map(event => (
              <div key={event.id} className="flex gap-3">
                <div className={`mt-0.5 flex h-8 w-8 items-center justify-center rounded-full ${event.tone === "success" ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-700"}`}>
                  {event.title.toLowerCase().includes("soumis") ? (
                    <CheckCircle2 className="h-4 w-4" />
                  ) : event.title.toLowerCase().includes("document") ? (
                    <FileUp className="h-4 w-4" />
                  ) : event.title.toLowerCase().includes("cree") ? (
                    <FolderClock className="h-4 w-4" />
                  ) : (
                    <Clock3 className="h-4 w-4" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-sm font-medium">{event.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {event.at ? new Date(event.at).toLocaleString("fr-FR") : "Date non disponible"}
                    </p>
                  </div>
                  <p className="text-sm text-muted-foreground">{event.description}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
