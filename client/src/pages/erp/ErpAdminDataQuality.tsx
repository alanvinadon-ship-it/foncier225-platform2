import { trpc } from "../../lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { RefreshCw, ShieldCheck, AlertTriangle, XCircle, CheckCircle, Play } from "lucide-react";
import { useState } from "react";

export default function ErpAdminDataQuality() {
  const [isRunning, setIsRunning] = useState(false);
  const latestQuery = trpc.erp.adminDataQuality.latest.useQuery();
  const definitionsQuery = trpc.erp.adminDataQuality.definitions.useQuery();
  const runAllMutation = trpc.erp.adminDataQuality.runAll.useMutation({
    onMutate: () => setIsRunning(true),
    onSuccess: () => { toast.success("Contrôle qualité terminé"); latestQuery.refetch(); setIsRunning(false); },
    onError: (e: any) => { toast.error(e.message); setIsRunning(false); },
  });

  const checks = latestQuery.data ?? [];
  const definitions = definitionsQuery.data ?? [];

  const totalChecks = checks.length;
  const passedChecks = checks.filter((c: any) => c.status === "passed").length;
  const score = totalChecks > 0 ? Math.round((passedChecks / totalChecks) * 100) : 0;
  const criticalErrors = checks.filter((c: any) => c.status === "failed" && c.severity === "critical").length;
  const warnings = checks.filter((c: any) => c.status === "failed" && c.severity === "warning").length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><ShieldCheck className="w-6 h-6" />Qualité des Données ERP</h1>
          <p className="text-muted-foreground">Contrôle qualité global — tous modules</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => latestQuery.refetch()} disabled={latestQuery.isFetching}>
            <RefreshCw className={`w-4 h-4 mr-2 ${latestQuery.isFetching ? "animate-spin" : ""}`} />
            Rafraîchir
          </Button>
          <Button onClick={() => runAllMutation.mutate()} disabled={isRunning}>
            <Play className="w-4 h-4 mr-2" />
            Lancer tous les contrôles
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-4 text-center">
            <p className={`text-3xl font-bold ${score >= 80 ? "text-green-500" : score >= 60 ? "text-orange-500" : "text-red-500"}`}>{score}%</p>
            <p className="text-xs text-muted-foreground">Score qualité global</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <p className="text-3xl font-bold text-green-500">{passedChecks}</p>
            <p className="text-xs text-muted-foreground">Contrôles OK</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <p className="text-3xl font-bold text-red-500">{criticalErrors}</p>
            <p className="text-xs text-muted-foreground">Erreurs critiques</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <p className="text-3xl font-bold text-orange-500">{warnings}</p>
            <p className="text-xs text-muted-foreground">Avertissements</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-sm">Résultats des contrôles</CardTitle></CardHeader>
        <CardContent>
          {checks.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">Aucun contrôle exécuté. Cliquez sur "Lancer tous les contrôles" pour démarrer.</p>
          ) : (
            <div className="space-y-2">
              {checks.map((check: any) => (
                <div key={check.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    {check.status === "passed" ? <CheckCircle className="w-5 h-5 text-green-500" /> : check.severity === "critical" ? <XCircle className="w-5 h-5 text-red-500" /> : <AlertTriangle className="w-5 h-5 text-orange-500" />}
                    <div>
                      <p className="font-medium text-sm">{check.checkName}</p>
                      <p className="text-xs text-muted-foreground">{check.module} — {check.recordsCount} éléments vérifiés{check.detailsJson?.issuesFound ? `, ${check.detailsJson.issuesFound} problèmes` : ""}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={check.status === "passed" ? "default" : check.severity === "critical" ? "destructive" : "secondary"}>
                      {check.status === "passed" ? "OK" : check.severity}
                    </Badge>
                    <span className="text-xs text-muted-foreground">{check.createdAt ? new Date(check.createdAt).toLocaleString("fr-FR") : ""}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-sm">Contrôles disponibles ({definitions.length})</CardTitle></CardHeader>
        <CardContent>
          <div className="grid gap-2 md:grid-cols-2">
            {definitions.map((def: any) => (
              <div key={def.key} className="p-2 border rounded text-sm">
                <p className="font-medium">{def.name}</p>
                <p className="text-xs text-muted-foreground">{def.description}</p>
                <Badge variant="outline" className="text-xs mt-1">{def.module}</Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
