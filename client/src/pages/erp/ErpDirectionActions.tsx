import { useState } from "react";
import { trpc } from "../../lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { Target, Plus, CheckCircle, AlertTriangle, Clock, XCircle } from "lucide-react";

export default function ErpDirectionActions() {
  const [showCreate, setShowCreate] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("medium");
  const [filterStatus, setFilterStatus] = useState<string>("");

  const actionsQuery = trpc.erp.directionActions.list.useQuery(filterStatus ? { status: filterStatus } : undefined);
  const summaryQuery = trpc.erp.directionActions.summary.useQuery();
  const overdueQuery = trpc.erp.directionActions.overdue.useQuery();

  const createMutation = trpc.erp.directionActions.create.useMutation({
    onSuccess: () => { toast.success("Action créée"); actionsQuery.refetch(); summaryQuery.refetch(); setShowCreate(false); setTitle(""); setDescription(""); },
    onError: (e) => toast.error(e.message),
  });
  const completeMutation = trpc.erp.directionActions.complete.useMutation({
    onSuccess: () => { toast.success("Action complétée"); actionsQuery.refetch(); summaryQuery.refetch(); },
    onError: (e) => toast.error(e.message),
  });
  const cancelMutation = trpc.erp.directionActions.cancel.useMutation({
    onSuccess: () => { toast.success("Action annulée"); actionsQuery.refetch(); summaryQuery.refetch(); },
    onError: (e) => toast.error(e.message),
  });

  const actions = actionsQuery.data ?? [];
  const summary = summaryQuery.data;
  const overdue = overdueQuery.data ?? [];

  const priorityLabel: Record<string, string> = { low: "Basse", medium: "Moyenne", high: "Haute", critical: "Critique" };
  const priorityColor: Record<string, "default" | "secondary" | "destructive" | "outline"> = { low: "secondary", medium: "outline", high: "default", critical: "destructive" };
  const statusLabel: Record<string, string> = { open: "Ouverte", in_progress: "En cours", blocked: "Bloquée", completed: "Terminée", cancelled: "Annulée", overdue: "En retard" };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Plans d'Actions Direction</h1>
          <p className="text-muted-foreground">Suivi des actions décidées en comité de direction</p>
        </div>
        <Dialog open={showCreate} onOpenChange={setShowCreate}>
          <DialogTrigger asChild><Button><Plus className="w-4 h-4 mr-2" />Nouvelle action</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Créer une action</DialogTitle></DialogHeader>
            <div className="space-y-4 pt-4">
              <div><Label>Titre</Label><Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Réduire les délais de paiement fournisseurs" /></div>
              <div><Label>Description</Label><Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Détails de l'action..." /></div>
              <div><Label>Priorité</Label>
                <Select value={priority} onValueChange={setPriority}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Basse</SelectItem>
                    <SelectItem value="medium">Moyenne</SelectItem>
                    <SelectItem value="high">Haute</SelectItem>
                    <SelectItem value="critical">Critique</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={() => createMutation.mutate({ title, description, priority: priority as any })} disabled={createMutation.isPending || !title} className="w-full">
                {createMutation.isPending ? "Création..." : "Créer l'action"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* KPIs */}
      {summary && (
        <div className="grid gap-4 md:grid-cols-5">
          <Card><CardContent className="pt-4 text-center"><p className="text-2xl font-bold">{summary.totalOpen}</p><p className="text-xs text-muted-foreground">Ouvertes</p></CardContent></Card>
          <Card><CardContent className="pt-4 text-center"><p className="text-2xl font-bold text-red-500">{summary.totalCritical}</p><p className="text-xs text-muted-foreground">Critiques</p></CardContent></Card>
          <Card><CardContent className="pt-4 text-center"><p className="text-2xl font-bold text-orange-500">{summary.totalOverdue}</p><p className="text-xs text-muted-foreground">En retard</p></CardContent></Card>
          <Card><CardContent className="pt-4 text-center"><p className="text-2xl font-bold text-green-500">{summary.totalCompleted}</p><p className="text-xs text-muted-foreground">Terminées</p></CardContent></Card>
          <Card><CardContent className="pt-4 text-center"><p className="text-2xl font-bold">{summary.closureRate}%</p><p className="text-xs text-muted-foreground">Taux clôture</p></CardContent></Card>
        </div>
      )}

      {/* Filtres */}
      <div className="flex gap-2">
        <Button variant={filterStatus === "" ? "default" : "outline"} size="sm" onClick={() => setFilterStatus("")}>Toutes</Button>
        <Button variant={filterStatus === "open" ? "default" : "outline"} size="sm" onClick={() => setFilterStatus("open")}>Ouvertes</Button>
        <Button variant={filterStatus === "in_progress" ? "default" : "outline"} size="sm" onClick={() => setFilterStatus("in_progress")}>En cours</Button>
        <Button variant={filterStatus === "completed" ? "default" : "outline"} size="sm" onClick={() => setFilterStatus("completed")}>Terminées</Button>
      </div>

      {/* Actions en retard */}
      {overdue.length > 0 && (
        <Card className="border-orange-200 bg-orange-50/50">
          <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2 text-orange-700"><AlertTriangle className="w-4 h-4" />Actions en retard ({overdue.length})</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2">
              {overdue.slice(0, 5).map((a: any) => (
                <div key={a.id} className="flex items-center justify-between text-sm">
                  <span className="truncate">{a.title}</span>
                  <span className="text-xs text-orange-600">Échéance : {a.dueDate ? new Date(a.dueDate).toLocaleDateString("fr-FR") : "-"}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Liste des actions */}
      <div className="space-y-3">
        {actions.map((a: any) => (
          <Card key={a.id}>
            <CardContent className="pt-4">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Target className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    <h3 className="font-medium text-sm truncate">{a.title}</h3>
                  </div>
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant={priorityColor[a.priority] || "secondary"} className="text-xs">{priorityLabel[a.priority] || a.priority}</Badge>
                    <Badge variant="outline" className="text-xs">{statusLabel[a.status] || a.status}</Badge>
                    <span className="text-xs text-muted-foreground">{a.actionNumber}</span>
                  </div>
                  {a.description && <p className="text-xs text-muted-foreground line-clamp-1">{a.description}</p>}
                  <div className="flex items-center gap-4 mt-2">
                    <Progress value={a.progressPercentage || 0} className="w-32 h-2" />
                    <span className="text-xs text-muted-foreground">{a.progressPercentage || 0}%</span>
                    {a.dueDate && <span className="text-xs text-muted-foreground"><Clock className="w-3 h-3 inline mr-1" />{new Date(a.dueDate).toLocaleDateString("fr-FR")}</span>}
                  </div>
                </div>
                <div className="flex gap-1 ml-2">
                  {a.status !== "completed" && a.status !== "cancelled" && (
                    <>
                      <Button size="sm" variant="ghost" onClick={() => completeMutation.mutate({ id: a.id })}><CheckCircle className="w-3 h-3" /></Button>
                      <Button size="sm" variant="ghost" onClick={() => cancelMutation.mutate({ id: a.id })}><XCircle className="w-3 h-3" /></Button>
                    </>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        {actions.length === 0 && <p className="text-muted-foreground text-center py-8">Aucune action trouvée</p>}
      </div>
    </div>
  );
}
