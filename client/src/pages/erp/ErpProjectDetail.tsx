import { useState } from "react";
import { useParams, Link, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Edit, Archive, Calendar, MapPin, Users, TrendingUp, Clock, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

const STATUS_LABELS: Record<string, string> = {
  draft: "Brouillon", planned: "Planifié", active: "Actif",
  on_hold: "En pause", completed: "Terminé", cancelled: "Annulé", delayed: "En retard",
};
const STATUS_COLORS: Record<string, string> = {
  draft: "bg-gray-100 text-gray-800", planned: "bg-blue-100 text-blue-800",
  active: "bg-green-100 text-green-800", on_hold: "bg-yellow-100 text-yellow-800",
  completed: "bg-emerald-100 text-emerald-800", cancelled: "bg-red-100 text-red-800",
  delayed: "bg-orange-100 text-orange-800",
};

function formatDate(ts: number | null | undefined) {
  if (!ts) return "—";
  return new Date(ts).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
}

function formatBudget(amount: number | null | undefined) {
  if (!amount) return "0 FCFA";
  return new Intl.NumberFormat("fr-FR").format(amount) + " FCFA";
}

export default function ErpProjectDetail() {
  const params = useParams<{ id: string }>();
  const projectId = parseInt(params.id || "0");
  const [, navigate] = useLocation();

  const { data: project, isLoading } = trpc.erp.projects.getById.useQuery({ id: projectId }, { enabled: !!projectId });
  const { data: summary } = trpc.erp.projects.summary.useQuery({ id: projectId }, { enabled: !!projectId });
  const { data: tasks } = trpc.erp.tasks.listByProject.useQuery({ projectId, sortBy: "due_date", sortOrder: "asc" }, { enabled: !!projectId });

  const archiveMutation = trpc.erp.projects.archive.useMutation({
    onSuccess: () => {
      toast.success("Projet archivé");
      navigate("/erp/projects");
    },
  });

  if (isLoading) {
    return <div className="animate-pulse space-y-4"><div className="h-8 bg-muted rounded w-1/3" /><div className="h-64 bg-muted rounded" /></div>;
  }

  if (!project) {
    return <div className="text-center py-12"><p className="text-muted-foreground">Projet non trouvé</p></div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <Link href="/erp/projects">
            <Button variant="ghost" size="icon"><ArrowLeft className="w-4 h-4" /></Button>
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold">{project.name}</h1>
              <Badge className={STATUS_COLORS[project.status]}>{STATUS_LABELS[project.status]}</Badge>
            </div>
            <p className="text-sm text-muted-foreground font-mono">{project.code}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Link href={`/erp/projects/${project.id}/edit`}>
            <Button variant="outline" size="sm"><Edit className="w-4 h-4 mr-1" />Modifier</Button>
          </Link>
          {project.status !== "completed" && (
            <Button variant="outline" size="sm" onClick={() => archiveMutation.mutate({ id: project.id })}>
              <Archive className="w-4 h-4 mr-1" />Archiver
            </Button>
          )}
        </div>
      </div>

      {/* Cartes résumé */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-sm"><TrendingUp className="w-4 h-4" />Progression</div>
            <p className="text-2xl font-bold mt-1">{project.progressPercentage}%</p>
            <div className="h-1.5 bg-muted rounded-full mt-2 overflow-hidden">
              <div className="h-full bg-primary rounded-full" style={{ width: `${project.progressPercentage}%` }} />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-sm"><Clock className="w-4 h-4" />Tâches</div>
            <p className="text-2xl font-bold mt-1">{summary?.tasks.completed ?? 0}/{summary?.tasks.total ?? 0}</p>
            <p className="text-xs text-muted-foreground">terminées</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-sm"><AlertTriangle className="w-4 h-4" />En retard</div>
            <p className="text-2xl font-bold mt-1 text-orange-600">{summary?.tasks.late ?? 0}</p>
            <p className="text-xs text-muted-foreground">tâche(s)</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-sm"><TrendingUp className="w-4 h-4" />Budget</div>
            <p className="text-lg font-bold mt-1">{formatBudget(project.revisedBudget)}</p>
            <p className="text-xs text-muted-foreground">révisé</p>
          </CardContent>
        </Card>
      </div>

      {/* Onglets */}
      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Vue d'ensemble</TabsTrigger>
          <TabsTrigger value="tasks">Tâches ({summary?.tasks.total ?? 0})</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4 mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader><CardTitle className="text-base">Informations</CardTitle></CardHeader>
              <CardContent className="space-y-3 text-sm">
                {project.description && <p>{project.description}</p>}
                {project.clientName && (
                  <div className="flex items-center gap-2"><Users className="w-4 h-4 text-muted-foreground" /><span>{project.clientName}</span></div>
                )}
                {project.location && (
                  <div className="flex items-center gap-2"><MapPin className="w-4 h-4 text-muted-foreground" /><span>{project.location}</span></div>
                )}
                {project.managerName && (
                  <div className="flex items-center gap-2"><Users className="w-4 h-4 text-muted-foreground" /><span>Chef de projet : {project.managerName}</span></div>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-base">Planning</CardTitle></CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex items-center gap-2"><Calendar className="w-4 h-4 text-muted-foreground" /><span>Début : {formatDate(project.startDate)}</span></div>
                <div className="flex items-center gap-2"><Calendar className="w-4 h-4 text-muted-foreground" /><span>Fin prévue : {formatDate(project.plannedEndDate)}</span></div>
                {project.actualEndDate && (
                  <div className="flex items-center gap-2"><Calendar className="w-4 h-4 text-muted-foreground" /><span>Fin réelle : {formatDate(project.actualEndDate)}</span></div>
                )}
                <div className="pt-2 border-t">
                  <p>Budget initial : {formatBudget(project.initialBudget)}</p>
                  <p>Budget révisé : {formatBudget(project.revisedBudget)}</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="tasks" className="mt-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">Tâches du projet</h3>
            <Link href={`/erp/projects/${project.id}/tasks`}>
              <Button size="sm">Gérer les tâches</Button>
            </Link>
          </div>
          {!tasks || tasks.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">Aucune tâche créée</p>
          ) : (
            <div className="space-y-2">
              {tasks.slice(0, 10).map((task) => (
                <Link key={task.id} href={`/erp/tasks/${task.id}`}>
                  <div className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 cursor-pointer">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{task.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {task.assigneeName || "Non assigné"} • Échéance : {formatDate(task.dueDate)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {task.isLate && <Badge className="bg-orange-100 text-orange-800 text-xs">En retard</Badge>}
                      <Badge variant="outline" className="text-xs">{task.status}</Badge>
                      <span className="text-xs font-medium">{task.progressPercentage}%</span>
                    </div>
                  </div>
                </Link>
              ))}
              {tasks.length > 10 && (
                <p className="text-center text-sm text-muted-foreground pt-2">
                  + {tasks.length - 10} autres tâches
                </p>
              )}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
