import { trpc } from "../../lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RefreshCw, Activity, Server, Clock, Users, AlertTriangle, FileText, Database } from "lucide-react";

export default function ErpSystemHealth() {
  const overviewQuery = trpc.erp.systemHealth.overview.useQuery();
  const recentAuditQuery = trpc.erp.systemHealth.recentAudit.useQuery({ limit: 10 });

  const data = overviewQuery.data;

  const formatUptime = (seconds: number) => {
    const d = Math.floor(seconds / 86400);
    const h = Math.floor((seconds % 86400) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return `${d}j ${h}h ${m}m`;
  };

  const formatBytes = (bytes: number) => {
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Activity className="w-6 h-6" />Santé Système ERP</h1>
          <p className="text-muted-foreground">Monitoring et observabilité de la plateforme</p>
        </div>
        <Button variant="outline" onClick={() => { overviewQuery.refetch(); recentAuditQuery.refetch(); }} disabled={overviewQuery.isFetching}>
          <RefreshCw className={`w-4 h-4 mr-2 ${overviewQuery.isFetching ? "animate-spin" : ""}`} />
          Rafraîchir
        </Button>
      </div>

      {overviewQuery.isLoading ? (
        <p className="text-muted-foreground">Chargement...</p>
      ) : data ? (
        <>
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-blue-500" />
                  <div>
                    <p className="text-2xl font-bold">{data.totalUsers}</p>
                    <p className="text-xs text-muted-foreground">Utilisateurs</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2">
                  <Database className="w-5 h-5 text-green-500" />
                  <div>
                    <p className="text-2xl font-bold">{data.auditEventsLast24h}</p>
                    <p className="text-xs text-muted-foreground">Événements audit (24h)</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-orange-500" />
                  <div>
                    <p className="text-2xl font-bold">{data.jobsLast24h}</p>
                    <p className="text-xs text-muted-foreground">Jobs exécutés (24h)</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2">
                  <AlertTriangle className={`w-5 h-5 ${data.failedJobsLast7d > 0 ? "text-red-500" : "text-green-500"}`} />
                  <div>
                    <p className="text-2xl font-bold">{data.failedJobsLast7d}</p>
                    <p className="text-xs text-muted-foreground">Jobs échoués (7j)</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Server className="w-4 h-4" />Serveur</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-muted-foreground">Node.js</span><span className="font-mono">{data.nodeVersion}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Uptime</span><span className="font-mono">{formatUptime(data.uptime)}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Mémoire RSS</span><span className="font-mono">{formatBytes(data.memoryUsage.rss)}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Heap utilisé</span><span className="font-mono">{formatBytes(data.memoryUsage.heapUsed)}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Heap total</span><span className="font-mono">{formatBytes(data.memoryUsage.heapTotal)}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Heure serveur</span><span className="font-mono">{new Date(data.serverTime).toLocaleString("fr-FR")}</span></div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-sm flex items-center gap-2"><FileText className="w-4 h-4" />Dernières activités</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-muted-foreground">Dernier job</span><span>{data.lastJobAt ? new Date(data.lastJobAt).toLocaleString("fr-FR") : "Aucun"}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Statut dernier job</span><Badge variant={data.lastJobStatus === "success" ? "default" : "destructive"}>{data.lastJobStatus || "N/A"}</Badge></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Dernier contrôle qualité</span><span>{data.lastQualityCheckAt ? new Date(data.lastQualityCheckAt).toLocaleString("fr-FR") : "Aucun"}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Exports (7j)</span><span className="font-bold">{data.exportsLast7d}</span></div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader><CardTitle className="text-sm">Derniers événements d'audit</CardTitle></CardHeader>
            <CardContent>
              {(recentAuditQuery.data?.length ?? 0) === 0 ? (
                <p className="text-muted-foreground text-center py-4">Aucun événement récent</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead><tr className="border-b"><th className="text-left p-2">Action</th><th className="text-left p-2">Cible</th><th className="text-left p-2">Date</th></tr></thead>
                    <tbody>
                      {recentAuditQuery.data?.map((evt: any) => (
                        <tr key={evt.id} className="border-b hover:bg-muted/50">
                          <td className="p-2 font-mono text-xs">{evt.action}</td>
                          <td className="p-2 text-xs">{evt.targetType} #{evt.targetId}</td>
                          <td className="p-2 text-xs">{new Date(evt.createdAt).toLocaleString("fr-FR")}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      ) : (
        <p className="text-red-500">Erreur de chargement</p>
      )}
    </div>
  );
}
