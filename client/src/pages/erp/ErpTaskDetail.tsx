import { useParams, Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Clock, Users, Calendar, Link2 } from "lucide-react";

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

export default function ErpTaskDetail() {
  const params = useParams<{ id: string }>();
  const taskId = parseInt(params.id || "0");

  const { data: task, isLoading } = trpc.erp.tasks.getById.useQuery({ id: taskId }, { enabled: !!taskId });

  if (isLoading) {
    return <div className="animate-pulse space-y-4"><div className="h-8 bg-muted rounded w-1/3" /><div className="h-64 bg-muted rounded" /></div>;
  }

  if (!task) {
    return <div className="text-center py-12"><p className="text-muted-foreground">Tâche non trouvée</p></div>;
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start gap-3">
        <Link href={`/erp/projects/${task.projectId}/tasks`}>
          <Button variant="ghost" size="icon"><ArrowLeft className="w-4 h-4" /></Button>
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold">{task.title}</h1>
            <Badge className={TASK_STATUS_COLORS[task.status]}>{TASK_STATUS_LABELS[task.status]}</Badge>
            {task.isLate && <Badge className="bg-orange-100 text-orange-800">En retard</Badge>}
          </div>
        </div>
      </div>

      {/* Progression */}
      <Card>
        <CardContent className="p-4">
          <div className="flex justify-between text-sm mb-2">
            <span>Progression</span>
            <span className="font-bold">{task.progressPercentage}%</span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${task.progressPercentage}%` }} />
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Détails */}
        <Card>
          <CardHeader><CardTitle className="text-base">Détails</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            {task.description && <p>{task.description}</p>}
            <div className="flex items-center gap-2"><Users className="w-4 h-4 text-muted-foreground" /><span>Assigné à : {task.assigneeName || "Non assigné"}</span></div>
            <div className="flex items-center gap-2"><Calendar className="w-4 h-4 text-muted-foreground" /><span>Début : {formatDate(task.startDate)}</span></div>
            <div className="flex items-center gap-2"><Calendar className="w-4 h-4 text-muted-foreground" /><span>Échéance : {formatDate(task.dueDate)}</span></div>
            {task.completedAt && <div className="flex items-center gap-2"><Calendar className="w-4 h-4 text-muted-foreground" /><span>Terminé : {formatDate(task.completedAt)}</span></div>}
            <div className="flex items-center gap-2"><Clock className="w-4 h-4 text-muted-foreground" /><span>Heures : {task.actualHours || 0}h / {task.estimatedHours || 0}h estimées</span></div>
          </CardContent>
        </Card>

        {/* Dépendances */}
        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><Link2 className="w-4 h-4" />Dépendances</CardTitle></CardHeader>
          <CardContent>
            {task.dependencies.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucune dépendance</p>
            ) : (
              <div className="space-y-2">
                {task.dependencies.map((dep) => (
                  <div key={dep.id} className="flex items-center justify-between p-2 border rounded text-sm">
                    <span>{dep.dependsOnTitle}</span>
                    <Badge variant="outline" className="text-xs">{dep.dependsOnStatus}</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
