import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { useErpPermissions } from "@/hooks/useErpPermissions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { BarChart3, RefreshCw, TrendingUp, TrendingDown, Percent } from "lucide-react";

function formatXOF(amount: number) {
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "XOF", maximumFractionDigits: 0 }).format(amount);
}

function formatPercent(bps: number) {
  return (bps / 100).toFixed(1) + "%";
}

export default function ErpFinanceProfitability() {
  const { hasPermission } = useErpPermissions();
  const canView = hasPermission("finance", "view");
  const canEdit = hasPermission("finance", "edit");

  const [selectedProject, setSelectedProject] = useState<string>("");

  const projectsQuery = trpc.erp.projects.list.useQuery({ limit: 100, offset: 0 });
  const rankingQuery = trpc.erp.finance.profitability.ranking.useQuery({ sortBy: "netMarginPercent", limit: 20 });
  const projectProfitQuery = trpc.erp.finance.profitability.byProject.useQuery(
    { projectId: Number(selectedProject) },
    { enabled: !!selectedProject && selectedProject !== "all" }
  );

  const recalculate = trpc.erp.finance.profitability.recalculate.useMutation({
    onSuccess: () => { toast.success("Rentabilité recalculée"); rankingQuery.refetch(); projectProfitQuery.refetch(); },
    onError: (e) => toast.error(e.message),
  });

  const projectMap = useMemo(() => {
    const map = new Map<number, string>();
    (projectsQuery.data?.projects || []).forEach((p: any) => map.set(p.id, p.name));
    return map;
  }, [projectsQuery.data]);

  if (!canView) return <div className="p-6 text-center text-muted-foreground">Accès non autorisé</div>;

  const ranking = rankingQuery.data?.ranking || [];
  const projectProfit = projectProfitQuery.data;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <BarChart3 className="h-6 w-6 text-primary" />
            Rentabilité
          </h1>
          <p className="text-muted-foreground">Analyse de la rentabilité par projet</p>
        </div>
      </div>

      {/* Sélection projet + recalcul */}
      <div className="flex gap-3 items-end flex-wrap">
        <div className="flex-1 min-w-[200px]">
          <Select value={selectedProject} onValueChange={setSelectedProject}>
            <SelectTrigger><SelectValue placeholder="Sélectionner un projet" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Voir le classement</SelectItem>
              {(projectsQuery.data?.projects || []).map((p: any) => (
                <SelectItem key={p.id} value={p.id.toString()}>{p.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {canEdit && selectedProject && selectedProject !== "all" && (
          <Button size="sm" variant="outline" onClick={() => recalculate.mutate({ projectId: Number(selectedProject) })} disabled={recalculate.isPending}>
            <RefreshCw className={`h-4 w-4 mr-1 ${recalculate.isPending ? "animate-spin" : ""}`} />
            Recalculer
          </Button>
        )}
      </div>

      {/* Détail projet */}
      {selectedProject && selectedProject !== "all" && projectProfit?.latest && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Card><CardContent className="p-3 text-center"><p className="text-xs text-muted-foreground">Chiffre d'affaires</p><p className="text-lg font-bold">{formatXOF(projectProfit.latest.revenue)}</p></CardContent></Card>
            <Card><CardContent className="p-3 text-center"><p className="text-xs text-muted-foreground">Coûts directs</p><p className="text-lg font-bold text-red-600">{formatXOF(projectProfit.latest.directCosts)}</p></CardContent></Card>
            <Card className={projectProfit.latest.grossMargin >= 0 ? "border-green-200" : "border-red-200"}>
              <CardContent className="p-3 text-center">
                <p className="text-xs text-muted-foreground">Marge brute</p>
                <p className={`text-lg font-bold ${projectProfit.latest.grossMargin >= 0 ? "text-green-600" : "text-red-600"}`}>{formatXOF(projectProfit.latest.grossMargin)}</p>
                <p className="text-xs">{formatPercent(projectProfit.latest.grossMarginPercent)}</p>
              </CardContent>
            </Card>
            <Card className={projectProfit.latest.netMargin >= 0 ? "border-green-200" : "border-red-200"}>
              <CardContent className="p-3 text-center">
                <p className="text-xs text-muted-foreground">Marge nette</p>
                <p className={`text-lg font-bold ${projectProfit.latest.netMargin >= 0 ? "text-green-600" : "text-red-600"}`}>{formatXOF(projectProfit.latest.netMargin)}</p>
                <p className="text-xs">{formatPercent(projectProfit.latest.netMarginPercent)}</p>
              </CardContent>
            </Card>
          </div>
          <Card>
            <CardContent className="p-4">
              <h3 className="text-sm font-semibold mb-2">Détail des coûts</h3>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div><span className="text-muted-foreground">Coûts directs :</span> <span className="font-mono">{formatXOF(projectProfit.latest.directCosts)}</span></div>
                <div><span className="text-muted-foreground">Coûts indirects :</span> <span className="font-mono">{formatXOF(projectProfit.latest.indirectCosts)}</span></div>
                <div><span className="text-muted-foreground">Total coûts :</span> <span className="font-mono">{formatXOF(projectProfit.latest.directCosts + projectProfit.latest.indirectCosts)}</span></div>
                <div><span className="text-muted-foreground">Dernier calcul :</span> <span className="text-xs">{new Date(projectProfit.latest.snapshotDate).toLocaleDateString("fr-FR")}</span></div>
              </div>
            </CardContent>
          </Card>
          {projectProfit.history.length > 1 && (
            <Card>
              <CardContent className="p-4">
                <h3 className="text-sm font-semibold mb-2">Historique des snapshots</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="text-left p-2">Date</th>
                        <th className="text-right p-2">CA</th>
                        <th className="text-right p-2">Marge brute</th>
                        <th className="text-right p-2">%</th>
                        <th className="text-right p-2">Marge nette</th>
                        <th className="text-right p-2">%</th>
                      </tr>
                    </thead>
                    <tbody>
                      {projectProfit.history.map((s: any) => (
                        <tr key={s.id} className="border-t">
                          <td className="p-2">{new Date(s.snapshotDate).toLocaleDateString("fr-FR")}</td>
                          <td className="p-2 text-right font-mono">{formatXOF(s.revenue)}</td>
                          <td className="p-2 text-right font-mono">{formatXOF(s.grossMargin)}</td>
                          <td className="p-2 text-right">{formatPercent(s.grossMarginPercent)}</td>
                          <td className="p-2 text-right font-mono">{formatXOF(s.netMargin)}</td>
                          <td className="p-2 text-right">{formatPercent(s.netMarginPercent)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Classement */}
      {(!selectedProject || selectedProject === "all") && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Classement par rentabilité nette</h2>
          {ranking.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">Aucun snapshot de rentabilité disponible. Sélectionnez un projet et cliquez sur "Recalculer".</div>
          ) : (
            <div className="overflow-x-auto border rounded-lg">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left p-3 font-medium">#</th>
                    <th className="text-left p-3 font-medium">Projet</th>
                    <th className="text-right p-3 font-medium">CA</th>
                    <th className="text-right p-3 font-medium">Marge brute</th>
                    <th className="text-right p-3 font-medium">% brut</th>
                    <th className="text-right p-3 font-medium">Marge nette</th>
                    <th className="text-right p-3 font-medium">% net</th>
                  </tr>
                </thead>
                <tbody>
                  {ranking.map((s: any, i: number) => (
                    <tr key={s.id} className="border-t hover:bg-muted/30">
                      <td className="p-3 font-medium">{i + 1}</td>
                      <td className="p-3">{projectMap.get(s.projectId) || `Projet #${s.projectId}`}</td>
                      <td className="p-3 text-right font-mono">{formatXOF(s.revenue)}</td>
                      <td className="p-3 text-right font-mono">{formatXOF(s.grossMargin)}</td>
                      <td className="p-3 text-right">
                        <Badge className={s.grossMarginPercent >= 0 ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}>
                          {formatPercent(s.grossMarginPercent)}
                        </Badge>
                      </td>
                      <td className="p-3 text-right font-mono">{formatXOF(s.netMargin)}</td>
                      <td className="p-3 text-right">
                        <Badge className={s.netMarginPercent >= 0 ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}>
                          {formatPercent(s.netMarginPercent)}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
