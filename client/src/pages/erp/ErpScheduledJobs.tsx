import { trpc } from "../../lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Clock, Play, RefreshCw, CheckCircle, XCircle, Timer } from "lucide-react";

const SCHEDULED_JOBS = [
  { id: "erp-alerts", name: "Alertes ERP", endpoint: "/api/scheduled/erp-alerts", frequency: "Toutes les heures", description: "Dépassements budget, factures échues, docs expirés, stock critique" },
  { id: "budget-snapshots", name: "Snapshots Budget", endpoint: "/api/scheduled/budget-snapshots", frequency: "Quotidien", description: "Snapshots P&L et Cash Flow" },
  { id: "budget-integrations", name: "Intégration Budget", endpoint: "/api/scheduled/budget-integrations", frequency: "Quotidien", description: "Full sync budget/objectifs/ventes/analytique" },
  { id: "delay-alerts", name: "Alertes Retard", endpoint: "/api/scheduled/delay-alerts", frequency: "Toutes les heures", description: "Échéances client en retard, RFQ expirées" },
  { id: "appointment-reminders", name: "Rappels RDV", endpoint: "/api/scheduled/appointment-reminders", frequency: "Toutes les 30min", description: "Rappels de rendez-vous à venir" },
];

export default function ErpScheduledJobs() {
  const jobsQuery = trpc.erp.systemHealth.jobs.useQuery({ limit: 50 });
  const runJobMutation = trpc.erp.budgetIntegrations.run.useMutation({
    onSuccess: () => { toast.success("Job lancé avec succès"); jobsQuery.refetch(); },
    onError: (e: any) => toast.error(e.message),
  });

  const jobs = jobsQuery.data ?? [];

  const lastExecByType: Record<string, any> = {};
  jobs.forEach((j: any) => {
    if (!lastExecByType[j.jobType]) lastExecByType[j.jobType] = j;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Clock className="w-6 h-6" />Jobs Planifiés</h1>
          <p className="text-muted-foreground">Monitoring et gestion des tâches automatiques</p>
        </div>
        <Button variant="outline" onClick={() => jobsQuery.refetch()} disabled={jobsQuery.isFetching}>
          <RefreshCw className={`w-4 h-4 mr-2 ${jobsQuery.isFetching ? "animate-spin" : ""}`} />
          Rafraîchir
        </Button>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-sm">Jobs configurés</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-3">
            {SCHEDULED_JOBS.map(job => {
              const lastExec = lastExecByType[job.id === "budget-integrations" ? "full_sync" : job.id];
              return (
                <div key={job.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <Timer className="w-4 h-4 text-muted-foreground" />
                      <span className="font-medium text-sm">{job.name}</span>
                      <Badge variant="outline" className="text-xs">{job.frequency}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{job.description}</p>
                    {lastExec && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Dernier : {new Date(lastExec.startedAt).toLocaleString("fr-FR")} — 
                        <Badge variant={lastExec.status === "success" ? "default" : "destructive"} className="ml-1 text-xs">{lastExec.status}</Badge>
                        {lastExec.durationMs && <span className="ml-1">({(lastExec.durationMs / 1000).toFixed(1)}s)</span>}
                      </p>
                    )}
                  </div>
                  {job.id === "budget-integrations" && (
                    <Button size="sm" variant="outline" onClick={() => runJobMutation.mutate({ jobType: "full_sync" })} disabled={runJobMutation.isPending}>
                      <Play className="w-3 h-3 mr-1" />Lancer
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-sm">Historique d'exécution</CardTitle></CardHeader>
        <CardContent>
          {jobs.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">Aucun job exécuté</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b"><th className="text-left p-2">Type</th><th className="text-left p-2">Scope</th><th className="text-left p-2">Statut</th><th className="text-left p-2">Durée</th><th className="text-left p-2">Démarré</th><th className="text-left p-2">Source</th><th className="text-left p-2">Erreur</th></tr></thead>
                <tbody>
                  {jobs.map((j: any) => (
                    <tr key={j.id} className="border-b hover:bg-muted/50">
                      <td className="p-2 font-mono text-xs">{j.jobType}</td>
                      <td className="p-2 text-xs">{j.syncScope || "-"}</td>
                      <td className="p-2">
                        {j.status === "success" ? <CheckCircle className="w-4 h-4 text-green-500" /> : j.status === "failed" ? <XCircle className="w-4 h-4 text-red-500" /> : <Clock className="w-4 h-4 text-orange-500" />}
                      </td>
                      <td className="p-2 text-xs">{j.durationMs ? `${(j.durationMs / 1000).toFixed(1)}s` : "-"}</td>
                      <td className="p-2 text-xs">{j.startedAt ? new Date(j.startedAt).toLocaleString("fr-FR") : "-"}</td>
                      <td className="p-2 text-xs">{j.triggerSource || "-"}</td>
                      <td className="p-2 text-xs text-red-500 max-w-[200px] truncate">{j.errorMessage || "-"}</td>
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
