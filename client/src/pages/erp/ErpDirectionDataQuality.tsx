import { trpc } from "../../lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { ShieldCheck, RefreshCw, CheckCircle, AlertTriangle, XCircle } from "lucide-react";

export default function ErpDirectionDataQuality() {
  const latestQuery = trpc.erp.directionDataQuality.latest.useQuery();
  const definitionsQuery = trpc.erp.directionDataQuality.definitions.useQuery();
  const runAllMutation = trpc.erp.directionDataQuality.runAll.useMutation({
    onSuccess: (r) => {
      toast.success(`Contrôle terminé : ${r.summary.passed} OK, ${r.summary.warnings} avertissements, ${r.summary.failed} échecs`);
      latestQuery.refetch();
    },
    onError: (e) => toast.error(e.message),
  });

  const checks = latestQuery.data ?? [];
  const definitions = definitionsQuery.data ?? [];

  const statusIcon = (status: string) => {
    switch (status) {
      case "passed": return <CheckCircle className="w-4 h-4 text-green-500" />;
      case "warning": return <AlertTriangle className="w-4 h-4 text-orange-500" />;
      case "failed": return <XCircle className="w-4 h-4 text-red-500" />;
      default: return <ShieldCheck className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const severityColor: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
    low: "secondary", medium: "outline", high: "default", critical: "destructive"
  };

  const passed = checks.filter((c: any) => c.status === "passed").length;
  const warnings = checks.filter((c: any) => c.status === "warning").length;
  const failed = checks.filter((c: any) => c.status === "failed").length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Contrôle Qualité Données</h1>
          <p className="text-muted-foreground">Vérifications automatiques de cohérence et complétude des données ERP</p>
        </div>
        <Button onClick={() => runAllMutation.mutate({})} disabled={runAllMutation.isPending}>
          <RefreshCw className={`w-4 h-4 mr-2 ${runAllMutation.isPending ? "animate-spin" : ""}`} />
          {runAllMutation.isPending ? "Vérification..." : "Lancer les contrôles"}
        </Button>
      </div>

      {/* Résumé */}
      {checks.length > 0 && (
        <div className="grid gap-4 md:grid-cols-4">
          <Card><CardContent className="pt-4 text-center"><p className="text-2xl font-bold">{checks.length}</p><p className="text-xs text-muted-foreground">Total contrôles</p></CardContent></Card>
          <Card><CardContent className="pt-4 text-center"><p className="text-2xl font-bold text-green-500">{passed}</p><p className="text-xs text-muted-foreground">Réussis</p></CardContent></Card>
          <Card><CardContent className="pt-4 text-center"><p className="text-2xl font-bold text-orange-500">{warnings}</p><p className="text-xs text-muted-foreground">Avertissements</p></CardContent></Card>
          <Card><CardContent className="pt-4 text-center"><p className="text-2xl font-bold text-red-500">{failed}</p><p className="text-xs text-muted-foreground">Échecs</p></CardContent></Card>
        </div>
      )}

      {/* Résultats des contrôles */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><ShieldCheck className="w-5 h-5" />Résultats des contrôles</CardTitle>
        </CardHeader>
        <CardContent>
          {checks.length === 0 ? (
            <div className="text-center py-8">
              <ShieldCheck className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">Aucun contrôle exécuté. Cliquez sur "Lancer les contrôles" pour démarrer.</p>
              <p className="text-xs text-muted-foreground mt-1">{definitions.length} vérifications disponibles</p>
            </div>
          ) : (
            <div className="space-y-3">
              {checks.map((c: any) => (
                <div key={c.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    {statusIcon(c.status)}
                    <div>
                      <p className="text-sm font-medium">{c.checkName}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <Badge variant={severityColor[c.severity] || "secondary"} className="text-xs">{c.severity}</Badge>
                        <span className="text-xs text-muted-foreground">{c.module}</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge variant={c.status === "passed" ? "default" : c.status === "warning" ? "outline" : "destructive"}>
                      {c.status === "passed" ? "OK" : c.status === "warning" ? "Attention" : "Échec"}
                    </Badge>
                    <p className="text-xs text-muted-foreground mt-1">
                      {c.recordsCount > 0 ? `${c.recordsCount} enregistrement(s)` : "Aucun problème"}
                    </p>
                    {c.lastCheckedAt && (
                      <p className="text-xs text-muted-foreground">{new Date(c.lastCheckedAt).toLocaleString("fr-FR")}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Définitions disponibles */}
      {definitions.length > 0 && checks.length === 0 && (
        <Card>
          <CardHeader><CardTitle className="text-sm">Contrôles disponibles ({definitions.length})</CardTitle></CardHeader>
          <CardContent>
            <div className="grid gap-2 md:grid-cols-2">
              {definitions.map((d: any) => (
                <div key={d.key} className="flex items-center gap-2 p-2 border rounded text-sm">
                  <Badge variant={severityColor[d.severity] || "secondary"} className="text-xs">{d.severity}</Badge>
                  <span>{d.name}</span>
                  <span className="text-xs text-muted-foreground ml-auto">{d.module}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
