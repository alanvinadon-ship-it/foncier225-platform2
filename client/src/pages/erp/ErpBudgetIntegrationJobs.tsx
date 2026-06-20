import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { RefreshCw, Play, RotateCcw, Clock, CheckCircle, XCircle, AlertTriangle, Loader2, Activity } from "lucide-react";

const JOB_TYPES = [
  { value: "full_sync", label: "Synchronisation complète" },
  { value: "sync_real_estate_actuals", label: "Ventes Immobilières" },
  { value: "sync_sales_targets", label: "Objectifs Commerciaux" },
  { value: "generate_analytic_snapshots", label: "Snapshots Analytiques" },
];

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  running: "bg-blue-100 text-blue-800",
  success: "bg-green-100 text-green-800",
  completed: "bg-green-100 text-green-800",
  failed: "bg-red-100 text-red-800",
  cancelled: "bg-gray-100 text-gray-800",
  partial_success: "bg-orange-100 text-orange-800",
};

const STATUS_ICONS: Record<string, React.ReactNode> = {
  pending: <Clock className="w-3 h-3" />,
  running: <Loader2 className="w-3 h-3 animate-spin" />,
  success: <CheckCircle className="w-3 h-3" />,
  completed: <CheckCircle className="w-3 h-3" />,
  failed: <XCircle className="w-3 h-3" />,
  cancelled: <AlertTriangle className="w-3 h-3" />,
  partial_success: <AlertTriangle className="w-3 h-3" />,
};

function formatDuration(ms: number | null | undefined): string {
  if (!ms) return "-";
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${Math.floor(ms / 60000)}m ${Math.round((ms % 60000) / 1000)}s`;
}

function formatDate(ts: number | null | undefined): string {
  if (!ts) return "-";
  return new Date(ts).toLocaleString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

export default function ErpBudgetIntegrationJobs() {
  const [filterType, setFilterType] = useState<string>("");
  const [filterStatus, setFilterStatus] = useState<string>("");
  const [page, setPage] = useState(0);
  const limit = 15;

  const { data, isLoading, refetch } = trpc.erp.budgetIntegrations.list.useQuery({
    limit,
    offset: page * limit,
    jobType: filterType || undefined,
    status: filterStatus || undefined,
  });

  const lastSuccess = trpc.erp.budgetIntegrations.lastSuccess.useQuery();

  const runMutation = trpc.erp.budgetIntegrations.run.useMutation({
    onSuccess: (result: any) => {
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(`Job #${result.jobId} (${result.jobType}) — ${result.status}`);
        refetch();
        lastSuccess.refetch();
      }
    },
    onError: (err) => toast.error(err.message),
  });

  const retryMutation = trpc.erp.budgetIntegrations.retry.useMutation({
    onSuccess: (result: any) => {
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(`Job relancé — Nouveau job #${result.jobId}`);
        refetch();
      }
    },
    onError: (err) => toast.error(err.message),
  });

  const [runJobType, setRunJobType] = useState<string>("full_sync");

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Jobs d'intégration Budget</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Suivi et gestion des synchronisations automatiques
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="w-4 h-4 mr-1" /> Rafraîchir
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-blue-500" />
              <div>
                <p className="text-xs text-muted-foreground">Dernière sync réussie</p>
                <p className="text-sm font-medium">{formatDate(lastSuccess.data?.finishedAt)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-yellow-500" />
              <div>
                <p className="text-xs text-muted-foreground">Durée dernière sync</p>
                <p className="text-sm font-medium">{formatDuration(lastSuccess.data?.durationMs)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-500" />
              <div>
                <p className="text-xs text-muted-foreground">Enregistrements traités</p>
                <p className="text-sm font-medium">{lastSuccess.data?.recordsProcessed ?? 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-orange-500" />
              <div>
                <p className="text-xs text-muted-foreground">Erreurs dernière sync</p>
                <p className="text-sm font-medium">{lastSuccess.data?.errorsCount ?? 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Lancer un job */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Lancer un job manuellement</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3">
            <Select value={runJobType} onValueChange={setRunJobType}>
              <SelectTrigger className="w-[260px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {JOB_TYPES.map(jt => (
                  <SelectItem key={jt.value} value={jt.value}>{jt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              onClick={() => runMutation.mutate({ jobType: runJobType as any })}
              disabled={runMutation.isPending}
            >
              {runMutation.isPending ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Play className="w-4 h-4 mr-1" />}
              Exécuter
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Filtres */}
      <div className="flex items-center gap-3">
        <Select value={filterType} onValueChange={(v) => { setFilterType(v === "all" ? "" : v); setPage(0); }}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Type de job" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les types</SelectItem>
            {JOB_TYPES.map(jt => (
              <SelectItem key={jt.value} value={jt.value}>{jt.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={(v) => { setFilterStatus(v === "all" ? "" : v); setPage(0); }}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Statut" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les statuts</SelectItem>
            <SelectItem value="success">Succès</SelectItem>
            <SelectItem value="failed">Échoué</SelectItem>
            <SelectItem value="running">En cours</SelectItem>
            <SelectItem value="pending">En attente</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table des jobs */}
      <Card>
        <CardContent className="pt-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : !data?.jobs?.length ? (
            <p className="text-center text-muted-foreground py-8">Aucun job trouvé</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="pb-2 pr-3">#</th>
                    <th className="pb-2 pr-3">Type</th>
                    <th className="pb-2 pr-3">Statut</th>
                    <th className="pb-2 pr-3">Source</th>
                    <th className="pb-2 pr-3">Démarré</th>
                    <th className="pb-2 pr-3">Durée</th>
                    <th className="pb-2 pr-3">Traités</th>
                    <th className="pb-2 pr-3">Erreurs</th>
                    <th className="pb-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {data.jobs.map((job: any) => (
                    <tr key={job.id} className="border-b last:border-0 hover:bg-muted/50">
                      <td className="py-2 pr-3 font-mono text-xs">{job.id}</td>
                      <td className="py-2 pr-3">
                        <span className="text-xs">
                          {JOB_TYPES.find(jt => jt.value === job.jobType)?.label || job.jobType}
                        </span>
                      </td>
                      <td className="py-2 pr-3">
                        <Badge variant="secondary" className={`text-xs ${STATUS_COLORS[job.status] || ""}`}>
                          {STATUS_ICONS[job.status]} <span className="ml-1">{job.status}</span>
                        </Badge>
                      </td>
                      <td className="py-2 pr-3 text-xs text-muted-foreground">{job.triggerSource || job.triggeredBy || "system"}</td>
                      <td className="py-2 pr-3 text-xs">{formatDate(job.startedAt)}</td>
                      <td className="py-2 pr-3 text-xs">{formatDuration(job.durationMs)}</td>
                      <td className="py-2 pr-3 text-xs">{job.recordsProcessed || 0}</td>
                      <td className="py-2 pr-3 text-xs">
                        {(job.errorsCount || 0) > 0 ? (
                          <span className="text-red-600 font-medium">{job.errorsCount}</span>
                        ) : (
                          <span className="text-green-600">0</span>
                        )}
                      </td>
                      <td className="py-2">
                        {(job.status === "failed" || job.status === "completed" || job.status === "success") && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => retryMutation.mutate({ id: job.id })}
                            disabled={retryMutation.isPending}
                            title="Relancer"
                          >
                            <RotateCcw className="w-3 h-3" />
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {data && data.total > limit && (
            <div className="flex items-center justify-between mt-4 pt-3 border-t">
              <span className="text-xs text-muted-foreground">
                {page * limit + 1}–{Math.min((page + 1) * limit, data.total)} sur {data.total}
              </span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(p => p - 1)}>
                  Précédent
                </Button>
                <Button variant="outline" size="sm" disabled={(page + 1) * limit >= data.total} onClick={() => setPage(p => p + 1)}>
                  Suivant
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
