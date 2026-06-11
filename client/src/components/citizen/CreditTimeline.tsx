import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { motion } from "framer-motion";
import { CheckCircle2, Clock3, FileUp, FolderClock, Gift, Gavel, MessageSquare } from "lucide-react";

export type CreditTimelineEvent = {
  id: string;
  title: string;
  description: string;
  at?: Date | string | null;
  tone?: "default" | "success";
};

function getEventIcon(title: string, tone?: string) {
  const t = title.toLowerCase();
  if (t.includes("soumis")) return <CheckCircle2 className="h-4 w-4" />;
  if (t.includes("document") || t.includes("piece")) return <FileUp className="h-4 w-4" />;
  if (t.includes("cree") || t.includes("créé")) return <FolderClock className="h-4 w-4" />;
  if (t.includes("offre")) return <Gift className="h-4 w-4" />;
  if (t.includes("decision") || t.includes("décision")) return <Gavel className="h-4 w-4" />;
  if (t.includes("demande") || t.includes("complement")) return <MessageSquare className="h-4 w-4" />;
  return <Clock3 className="h-4 w-4" />;
}

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
          <p className="text-sm text-muted-foreground">Aucun événement disponible pour le moment.</p>
        ) : (
          <div className="relative space-y-0">
            {/* Vertical line */}
            <div className="absolute left-4 top-4 bottom-4 w-px bg-border" />

            {events.map((event, index) => (
              <motion.div
                key={event.id}
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.06, duration: 0.3, ease: "easeOut" as const }}
                className="relative flex gap-4 pb-5 last:pb-0"
              >
                {/* Dot */}
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: index * 0.06 + 0.1, type: "spring", stiffness: 300, damping: 20 }}
                  className={`relative z-10 mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                    event.tone === "success"
                      ? "bg-green-100 text-green-700"
                      : "bg-slate-100 text-slate-700"
                  }`}
                >
                  {getEventIcon(event.title, event.tone)}
                </motion.div>

                {/* Content */}
                <div className="min-w-0 flex-1 pt-0.5">
                  <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-sm font-medium">{event.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {event.at ? new Date(event.at).toLocaleString("fr-FR") : "Date non disponible"}
                    </p>
                  </div>
                  <p className="text-sm text-muted-foreground mt-0.5">{event.description}</p>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
