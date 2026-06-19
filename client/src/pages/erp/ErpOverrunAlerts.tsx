import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertTriangle, CheckCircle2, RefreshCw, Shield, Clock, DollarSign, Package, Wrench, FileWarning } from "lucide-react";
import { toast } from "sonner";

const PRIORITY_COLORS: Record<string, string> = {
  low: "bg-slate-100 text-slate-700",
  medium: "bg-yellow-100 text-yellow-800",
  high: "bg-orange-100 text-orange-800",
  critical: "bg-red-100 text-red-800",
};

const MODULE_ICONS: Record<string, React.ReactNode> = {
  finance: <DollarSign className="h-4 w-4" />,
  projects: <Clock className="h-4 w-4" />,
  inventory: <Package className="h-4 w-4" />,
  safety: <Shield className="h-4 w-4" />,
  compliance: <FileWarning className="h-4 w-4" />,
  equipment: <Wrench className="h-4 w-4" />,
};

export default function ErpOverrunAlerts() {

  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [moduleFilter, setModuleFilter] = useState<string>("all");
  const [ackFilter, setAckFilter] = useState<string>("all");

  const queryParams: any = { limit: 100, offset: 0 };
  if (priorityFilter !== "all") queryParams.priority = priorityFilter;
  if (moduleFilter !== "all") queryParams.module = moduleFilter;
  if (ackFilter !== "all") queryParams.isAcknowledged = ackFilter === "true";

  const { data, isLoading, refetch } = trpc.erp.overrunAlerts.list.useQuery(queryParams);
  const checkMutation = trpc.erp.overrunAlerts.check.useMutation({
    onSuccess: (result) => {
      toast.success(`${result.created} nouvelle(s) alerte(s) détectée(s) sur ${result.alerts.length} vérification(s).`);
      refetch();
    },
  });
  const ackMutation = trpc.erp.overrunAlerts.acknowledge.useMutation({
    onSuccess: () => {
      toast.success("Alerte acquittée");
      refetch();
    },
  });

  const formatDate = (ts: number) => new Date(ts).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Alertes de dépassement</h1>
          <p className="text-muted-foreground">Détection automatique des dépassements budgétaires et retards</p>
        </div>
        <Button onClick={() => checkMutation.mutate()} disabled={checkMutation.isPending}>
          <RefreshCw className={`h-4 w-4 mr-2 ${checkMutation.isPending ? "animate-spin" : ""}`} />
          Vérifier maintenant
        </Button>
      </div>

      {/* Filtres */}
      <div className="flex gap-3 flex-wrap">
        <Select value={priorityFilter} onValueChange={setPriorityFilter}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Priorité" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes priorités</SelectItem>
            <SelectItem value="low">Basse</SelectItem>
            <SelectItem value="medium">Moyenne</SelectItem>
            <SelectItem value="high">Haute</SelectItem>
            <SelectItem value="critical">Critique</SelectItem>
          </SelectContent>
        </Select>

        <Select value={moduleFilter} onValueChange={setModuleFilter}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Module" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous modules</SelectItem>
            <SelectItem value="finance">Finance</SelectItem>
            <SelectItem value="projects">Projets</SelectItem>
            <SelectItem value="inventory">Inventaire</SelectItem>
            <SelectItem value="safety">Sécurité</SelectItem>
            <SelectItem value="compliance">Conformité</SelectItem>
            <SelectItem value="equipment">Équipement</SelectItem>
          </SelectContent>
        </Select>

        <Select value={ackFilter} onValueChange={setAckFilter}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Statut" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes</SelectItem>
            <SelectItem value="false">Non acquittées</SelectItem>
            <SelectItem value="true">Acquittées</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* KPI Cards */}
      {data && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-4">
              <div className="text-2xl font-bold text-red-600">{data.alerts.filter(a => a.priority === "critical").length}</div>
              <p className="text-sm text-muted-foreground">Critiques</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="text-2xl font-bold text-orange-600">{data.alerts.filter(a => a.priority === "high").length}</div>
              <p className="text-sm text-muted-foreground">Hautes</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="text-2xl font-bold text-yellow-600">{data.alerts.filter(a => a.priority === "medium").length}</div>
              <p className="text-sm text-muted-foreground">Moyennes</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="text-2xl font-bold text-green-600">{data.alerts.filter(a => !a.isAcknowledged).length}</div>
              <p className="text-sm text-muted-foreground">Non acquittées</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Alerts List */}
      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">Chargement...</div>
      ) : !data?.alerts.length ? (
        <Card>
          <CardContent className="py-12 text-center">
            <CheckCircle2 className="h-12 w-12 mx-auto text-green-500 mb-4" />
            <p className="text-lg font-medium">Aucune alerte</p>
            <p className="text-muted-foreground">Tous les indicateurs sont dans les limites normales.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {data.alerts.map((alert) => (
            <Card key={alert.id} className={`border-l-4 ${alert.priority === "critical" ? "border-l-red-500" : alert.priority === "high" ? "border-l-orange-500" : alert.priority === "medium" ? "border-l-yellow-500" : "border-l-slate-300"}`}>
              <CardContent className="py-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 flex-1">
                    <div className="mt-0.5">
                      {MODULE_ICONS[alert.module || "finance"] || <AlertTriangle className="h-4 w-4" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium">{alert.title}</span>
                        <Badge className={PRIORITY_COLORS[alert.priority]}>{alert.priority}</Badge>
                        <Badge variant="outline" className="text-xs">{alert.module}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{alert.message}</p>
                      <p className="text-xs text-muted-foreground mt-1">{formatDate(alert.createdAt)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {alert.isAcknowledged ? (
                      <Badge variant="outline" className="text-green-600"><CheckCircle2 className="h-3 w-3 mr-1" />Acquittée</Badge>
                    ) : (
                      <Button size="sm" variant="outline" onClick={() => ackMutation.mutate({ id: alert.id })} disabled={ackMutation.isPending}>
                        Acquitter
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
