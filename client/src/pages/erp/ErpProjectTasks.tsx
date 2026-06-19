import { useState } from "react";
import { useParams, Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ArrowLeft, Plus, CheckCircle, Clock, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

const TASK_STATUS_LABELS: Record<string, string> = {
  todo: "À faire", in_progress: "En cours", blocked: "Bloqué",
  under_review: "En revue", completed: "Terminé", cancelled: "Annulé", late: "En retard",
};
const TASK_STATUS_COLORS: Record<string, string> = {
  todo: "bg-gray-100 text-gray-800", in_progress: "bg-blue-100 text-blue-800",
  blocked: "bg-red-100 text-red-800", under_review: "bg-purple-100 text-purple-800",
  completed: "bg-green-100 text-green-800", cancelled: "bg-gray-200 text-gray-600",
  late: "bg-orange-100 text-orange-800",
};

function formatDate(ts: number | null | undefined) {
  if (!ts) return "—";
  return new Date(ts).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
}

export default function ErpProjectTasks() {
  const params = useParams<{ id: string }>();
  const projectId = parseInt(params.id || "0");
  const [showCreate, setShowCreate] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [newTask, setNewTask] = useState({ title: "", description: "", priority: "medium", dueDate: "", estimatedHours: "" });

  const utils = trpc.useUtils();
  const { data: project } = trpc.erp.projects.getById.useQuery({ id: projectId }, { enabled: !!projectId });
  const { data: tasks, isLoading } = trpc.erp.tasks.listByProject.useQuery({
    projectId,
    status: statusFilter !== "all" ? statusFilter as any : undefined,
    sortBy: "due_date",
    sortOrder: "asc",
  }, { enabled: !!projectId });

  const createMutation = trpc.erp.tasks.create.useMutation({
    onSuccess: () => {
      toast.success("Tâche créée");
      setShowCreate(false);
      setNewTask({ title: "", description: "", priority: "medium", dueDate: "", estimatedHours: "" });
      utils.erp.tasks.listByProject.invalidate({ projectId });
    },
    onError: (err) => toast.error(err.message),
  });

  const completeMutation = trpc.erp.tasks.complete.useMutation({
    onSuccess: () => {
      toast.success("Tâche terminée");
      utils.erp.tasks.listByProject.invalidate({ projectId });
    },
    onError: (err) => toast.error(err.message),
  });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate({
      projectId,
      title: newTask.title,
      description: newTask.description || undefined,
      priority: newTask.priority as any,
      dueDate: newTask.dueDate ? new Date(newTask.dueDate).getTime() : undefined,
      estimatedHours: newTask.estimatedHours ? parseInt(newTask.estimatedHours) : undefined,
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <Link href={`/erp/projects/${projectId}`}>
            <Button variant="ghost" size="icon"><ArrowLeft className="w-4 h-4" /></Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">Tâches</h1>
            <p className="text-muted-foreground">{project?.name || "Projet"}</p>
          </div>
        </div>
        <Dialog open={showCreate} onOpenChange={setShowCreate}>
          <DialogTrigger asChild>
            <Button><Plus className="w-4 h-4 mr-2" />Nouvelle tâche</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Créer une tâche</DialogTitle></DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="space-y-2">
                <Label>Titre *</Label>
                <Input value={newTask.title} onChange={(e) => setNewTask(t => ({ ...t, title: e.target.value }))} required />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea value={newTask.description} onChange={(e) => setNewTask(t => ({ ...t, description: e.target.value }))} rows={2} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Priorité</Label>
                  <Select value={newTask.priority} onValueChange={(v) => setNewTask(t => ({ ...t, priority: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Basse</SelectItem>
                      <SelectItem value="medium">Moyenne</SelectItem>
                      <SelectItem value="high">Haute</SelectItem>
                      <SelectItem value="critical">Critique</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Échéance</Label>
                  <Input type="date" value={newTask.dueDate} onChange={(e) => setNewTask(t => ({ ...t, dueDate: e.target.value }))} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Heures estimées</Label>
                <Input type="number" min="0" value={newTask.estimatedHours} onChange={(e) => setNewTask(t => ({ ...t, estimatedHours: e.target.value }))} />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" type="button" onClick={() => setShowCreate(false)}>Annuler</Button>
                <Button type="submit" disabled={createMutation.isPending || !newTask.title}>Créer</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Statistiques rapides */}
      {tasks && (
        <div className="flex gap-4 text-sm">
          <div className="flex items-center gap-1"><Clock className="w-4 h-4 text-blue-500" />{tasks.filter(t => t.status === "in_progress").length} en cours</div>
          <div className="flex items-center gap-1"><CheckCircle className="w-4 h-4 text-green-500" />{tasks.filter(t => t.status === "completed").length} terminées</div>
          <div className="flex items-center gap-1"><AlertTriangle className="w-4 h-4 text-orange-500" />{tasks.filter(t => t.isLate).length} en retard</div>
        </div>
      )}

      {/* Filtre statut */}
      <Select value={statusFilter} onValueChange={setStatusFilter}>
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Filtrer par statut" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Tous les statuts</SelectItem>
          <SelectItem value="todo">À faire</SelectItem>
          <SelectItem value="in_progress">En cours</SelectItem>
          <SelectItem value="blocked">Bloqué</SelectItem>
          <SelectItem value="under_review">En revue</SelectItem>
          <SelectItem value="completed">Terminé</SelectItem>
        </SelectContent>
      </Select>

      {/* Liste des tâches */}
      {isLoading ? (
        <div className="space-y-2">{[...Array(5)].map((_, i) => <div key={i} className="h-16 bg-muted rounded animate-pulse" />)}</div>
      ) : !tasks || tasks.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">Aucune tâche trouvée</p>
        </div>
      ) : (
        <div className="space-y-2">
          {tasks.map((task) => (
            <div key={task.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/30 transition-colors">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <Link href={`/erp/tasks/${task.id}`}>
                    <span className="font-medium hover:underline cursor-pointer">{task.title}</span>
                  </Link>
                  {task.isLate && <Badge className="bg-orange-100 text-orange-800 text-xs">En retard</Badge>}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {task.assigneeName || "Non assigné"} • Échéance : {formatDate(task.dueDate)} • {task.estimatedHours}h estimées
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge className={`text-xs ${TASK_STATUS_COLORS[task.status] || ""}`}>
                  {TASK_STATUS_LABELS[task.status] || task.status}
                </Badge>
                <span className="text-xs font-medium w-10 text-right">{task.progressPercentage}%</span>
                {task.status !== "completed" && task.status !== "cancelled" && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => completeMutation.mutate({ id: task.id })}
                    title="Marquer comme terminé"
                  >
                    <CheckCircle className="w-4 h-4 text-green-600" />
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
