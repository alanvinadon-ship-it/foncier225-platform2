import { useState, useMemo } from "react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Diamond, AlertTriangle, CheckCircle2, Clock, ChevronLeft, ChevronRight, FolderKanban } from "lucide-react";

// ============================================================
// TYPES
// ============================================================
interface GanttTask {
  id: number;
  title: string;
  status: string;
  priority: string;
  startDate: number | null;
  dueDate: number | null;
  progressPercentage: number;
  assigneeName: string | null;
  isLate: boolean;
}

interface GanttMilestone {
  id: number;
  name: string;
  plannedDate: number;
  actualDate: number | null;
  status: string;
  impactLevel: string;
  isLate: boolean;
}

// ============================================================
// HELPERS
// ============================================================
const DAY_MS = 86400000;

function formatDate(ts: number | null): string {
  if (!ts) return "—";
  return new Date(ts).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
}

function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    todo: "bg-gray-200",
    in_progress: "bg-blue-500",
    completed: "bg-green-500",
    blocked: "bg-red-500",
    under_review: "bg-yellow-500",
    cancelled: "bg-gray-400",
    late: "bg-red-600",
  };
  return colors[status] || "bg-gray-300";
}

// ============================================================
// COMPOSANT GANTT BAR
// ============================================================
function GanttBar({
  task,
  timelineStart,
  timelineEnd,
  dayWidth,
}: {
  task: GanttTask;
  timelineStart: number;
  timelineEnd: number;
  dayWidth: number;
}) {
  const start = task.startDate || timelineStart;
  const end = task.dueDate || start + 7 * DAY_MS;

  const leftDays = Math.max(0, (start - timelineStart) / DAY_MS);
  const widthDays = Math.max(1, (end - start) / DAY_MS);

  const left = leftDays * dayWidth;
  const width = Math.max(20, widthDays * dayWidth);

  return (
    <div className="relative h-8 flex items-center" style={{ marginLeft: `${left}px`, width: `${width}px` }}>
      <div className={`absolute inset-0 rounded ${task.isLate ? "bg-red-200" : "bg-slate-200"} opacity-50`} />
      <div
        className={`absolute top-0 left-0 h-full rounded ${task.isLate ? "bg-red-500" : getStatusColor(task.status)}`}
        style={{ width: `${task.progressPercentage}%`, opacity: 0.8 }}
      />
      <span className="relative z-10 text-xs font-medium px-2 truncate text-white mix-blend-difference">
        {task.progressPercentage}%
      </span>
    </div>
  );
}

// ============================================================
// COMPOSANT MILESTONE MARKER
// ============================================================
function MilestoneMarker({
  milestone,
  timelineStart,
  dayWidth,
}: {
  milestone: GanttMilestone;
  timelineStart: number;
  dayWidth: number;
}) {
  const leftDays = Math.max(0, (milestone.plannedDate - timelineStart) / DAY_MS);
  const left = leftDays * dayWidth;

  const color = milestone.status === "reached" ? "text-green-600" :
    milestone.isLate ? "text-red-600" : "text-amber-500";

  return (
    <div className="absolute top-0 bottom-0 flex items-center" style={{ left: `${left}px` }}>
      <Diamond className={`w-4 h-4 ${color} fill-current`} />
    </div>
  );
}

// ============================================================
// PAGE PRINCIPALE — GANTT GLOBAL (MULTI-PROJETS)
// ============================================================
export default function ErpGantt() {
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [viewWeeks, setViewWeeks] = useState(8);

  // Charger la liste des projets
  const { data: projectsData, isLoading: projectsLoading } = trpc.erp.projects.list.useQuery({
    limit: 100,
    offset: 0,
    status: "active",
  });

  const projectId = selectedProjectId ? Number(selectedProjectId) : null;

  // Charger les données Gantt pour le projet sélectionné
  const { data: ganttData, isLoading: ganttLoading } = trpc.erp.gantt.getData.useQuery(
    { projectId: projectId!, status: statusFilter === "all" ? undefined : statusFilter },
    { enabled: !!projectId }
  );

  const dayWidth = 28;

  // Générer les colonnes de jours pour le header
  const timelineDays = useMemo(() => {
    if (!ganttData) return [];
    const days: Array<{ date: Date; ts: number }> = [];
    const totalDays = Math.min(viewWeeks * 7, Math.ceil((ganttData.timeline.end - ganttData.timeline.start) / DAY_MS) + 7);
    for (let i = 0; i < totalDays; i++) {
      const ts = ganttData.timeline.start + i * DAY_MS;
      days.push({ date: new Date(ts), ts });
    }
    return days;
  }, [ganttData, viewWeeks]);

  // Auto-sélectionner le premier projet si aucun n'est sélectionné
  const projects = projectsData?.projects || [];

  if (projectsLoading) {
    return (
      <div className="p-6 space-y-4">
        <div className="h-8 w-64 bg-muted animate-pulse rounded" />
        <div className="h-[500px] bg-muted animate-pulse rounded" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold">Diagramme de Gantt</h1>
          <p className="text-sm text-muted-foreground">Vue globale des plannings projets</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Sélecteur de projet */}
          <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
            <SelectTrigger className="w-56">
              <SelectValue placeholder="Sélectionner un projet" />
            </SelectTrigger>
            <SelectContent>
              {projects.map((p: any) => (
                <SelectItem key={p.id} value={String(p.id)}>
                  {p.code} — {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Filtre statut */}
          {projectId && (
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Statut" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les statuts</SelectItem>
                <SelectItem value="todo">À faire</SelectItem>
                <SelectItem value="in_progress">En cours</SelectItem>
                <SelectItem value="blocked">Bloqué</SelectItem>
                <SelectItem value="completed">Terminé</SelectItem>
              </SelectContent>
            </Select>
          )}

          {/* Zoom semaines */}
          {projectId && (
            <div className="flex items-center gap-1">
              <Button variant="outline" size="icon" onClick={() => setViewWeeks(Math.max(4, viewWeeks - 2))}>
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span className="text-sm px-2">{viewWeeks} sem.</span>
              <Button variant="outline" size="icon" onClick={() => setViewWeeks(Math.min(24, viewWeeks + 2))}>
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* État initial : aucun projet sélectionné */}
      {!projectId && (
        <Card>
          <CardContent className="py-16 text-center">
            <FolderKanban className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h2 className="text-lg font-semibold mb-2">Sélectionnez un projet</h2>
            <p className="text-sm text-muted-foreground mb-4">
              Choisissez un projet dans le menu déroulant ci-dessus pour afficher son diagramme de Gantt.
            </p>
            {projects.length === 0 && (
              <p className="text-sm text-amber-600">
                Aucun projet actif trouvé. Créez un projet pour commencer.
              </p>
            )}
            {projects.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mt-6 max-w-3xl mx-auto">
                {projects.slice(0, 6).map((p: any) => (
                  <button
                    key={p.id}
                    onClick={() => setSelectedProjectId(String(p.id))}
                    className="text-left p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <p className="font-medium text-sm truncate">{p.name}</p>
                    <p className="text-xs text-muted-foreground">{p.code}</p>
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Loading Gantt */}
      {projectId && ganttLoading && (
        <div className="space-y-4">
          <div className="h-24 bg-muted animate-pulse rounded" />
          <div className="h-[400px] bg-muted animate-pulse rounded" />
        </div>
      )}

      {/* Gantt data loaded */}
      {projectId && ganttData && (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
            <Card>
              <CardContent className="p-3 text-center">
                <p className="text-2xl font-bold">{ganttData.summary.totalTasks}</p>
                <p className="text-xs text-muted-foreground">Tâches</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3 text-center">
                <p className="text-2xl font-bold text-green-600">{ganttData.summary.completedTasks}</p>
                <p className="text-xs text-muted-foreground">Terminées</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3 text-center">
                <p className="text-2xl font-bold text-red-600">{ganttData.summary.lateTasks}</p>
                <p className="text-xs text-muted-foreground">En retard</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3 text-center">
                <p className="text-2xl font-bold">{ganttData.summary.avgProgress}%</p>
                <p className="text-xs text-muted-foreground">Progression</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3 text-center">
                <p className="text-2xl font-bold text-amber-600">{ganttData.summary.totalMilestones}</p>
                <p className="text-xs text-muted-foreground">Jalons</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3 text-center">
                <p className="text-2xl font-bold text-green-600">{ganttData.summary.reachedMilestones}</p>
                <p className="text-xs text-muted-foreground">Jalons atteints</p>
              </CardContent>
            </Card>
          </div>

          {/* Gantt Chart */}
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Gantt — {ganttData.project.name}</CardTitle>
                <Link href={`/erp/projects/${projectId}/gantt`}>
                  <Button variant="outline" size="sm">Vue détaillée</Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <div className="min-w-[800px]">
                  {/* Timeline header */}
                  <div className="flex border-b sticky top-0 bg-background z-10">
                    <div className="w-64 min-w-[256px] border-r px-3 py-2 font-medium text-sm bg-muted/50">
                      Tâche
                    </div>
                    <div className="flex">
                      {timelineDays.map((day, i) => {
                        const isWeekend = day.date.getDay() === 0 || day.date.getDay() === 6;
                        const isFirstOfMonth = day.date.getDate() === 1;
                        return (
                          <div
                            key={i}
                            className={`flex-shrink-0 text-center text-[10px] border-r py-1 ${isWeekend ? "bg-muted/30" : ""} ${isFirstOfMonth ? "border-l-2 border-l-primary" : ""}`}
                            style={{ width: `${dayWidth}px` }}
                          >
                            {day.date.getDate() === 1 || i === 0 ? (
                              <span className="font-medium">
                                {day.date.toLocaleDateString("fr-FR", { month: "short" })}
                              </span>
                            ) : (
                              <span className="text-muted-foreground">{day.date.getDate()}</span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Milestones row */}
                  {ganttData.milestones.length > 0 && (
                    <div className="flex border-b bg-amber-50/50">
                      <div className="w-64 min-w-[256px] border-r px-3 py-2 flex items-center gap-2">
                        <Diamond className="w-3 h-3 text-amber-600" />
                        <span className="text-xs font-medium text-amber-700">Jalons</span>
                      </div>
                      <div className="relative flex-1 h-8">
                        {ganttData.milestones.map((m) => (
                          <MilestoneMarker
                            key={m.id}
                            milestone={m}
                            timelineStart={ganttData.timeline.start}
                            dayWidth={dayWidth}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Task rows */}
                  {ganttData.tasks.map((task) => (
                    <div key={task.id} className={`flex border-b hover:bg-muted/20 ${task.isLate ? "bg-red-50/30" : ""}`}>
                      <div className="w-64 min-w-[256px] border-r px-3 py-2 flex items-center gap-2">
                        {task.isLate && <AlertTriangle className="w-3 h-3 text-red-500 flex-shrink-0" />}
                        {task.status === "completed" && <CheckCircle2 className="w-3 h-3 text-green-500 flex-shrink-0" />}
                        {!task.isLate && task.status !== "completed" && <Clock className="w-3 h-3 text-muted-foreground flex-shrink-0" />}
                        <Link href={`/erp/tasks/${task.id}`}>
                          <span className="text-xs truncate hover:underline cursor-pointer">{task.title}</span>
                        </Link>
                      </div>
                      <div className="flex-1 relative py-1">
                        <GanttBar
                          task={task}
                          timelineStart={ganttData.timeline.start}
                          timelineEnd={ganttData.timeline.end}
                          dayWidth={dayWidth}
                        />
                      </div>
                    </div>
                  ))}

                  {ganttData.tasks.length === 0 && (
                    <div className="flex items-center justify-center py-12 text-muted-foreground text-sm">
                      Aucune tâche à afficher pour ce projet.
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Legend */}
          <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded bg-blue-500" /> En cours
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded bg-green-500" /> Terminé
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded bg-red-500" /> En retard
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded bg-gray-300" /> À faire
            </div>
            <div className="flex items-center gap-1">
              <Diamond className="w-3 h-3 text-amber-500 fill-current" /> Jalon
            </div>
          </div>
        </>
      )}
    </div>
  );
}
