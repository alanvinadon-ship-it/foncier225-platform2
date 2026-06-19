import { useState, useMemo } from "react";
import { useRoute, Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Diamond, AlertTriangle, CheckCircle2, Clock, ChevronLeft, ChevronRight } from "lucide-react";

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

interface GanttDependency {
  id: number;
  taskId: number;
  dependsOnTaskId: number;
  dependencyType: string;
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

function getPriorityColor(priority: string): string {
  const colors: Record<string, string> = {
    low: "text-gray-500",
    medium: "text-blue-500",
    high: "text-orange-500",
    critical: "text-red-600",
  };
  return colors[priority] || "text-gray-500";
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
  const totalDays = Math.max(1, (timelineEnd - timelineStart) / DAY_MS);

  const start = task.startDate || timelineStart;
  const end = task.dueDate || start + 7 * DAY_MS;

  const leftDays = Math.max(0, (start - timelineStart) / DAY_MS);
  const widthDays = Math.max(1, (end - start) / DAY_MS);

  const left = leftDays * dayWidth;
  const width = Math.max(20, widthDays * dayWidth);

  return (
    <div className="relative h-8 flex items-center" style={{ marginLeft: `${left}px`, width: `${width}px` }}>
      {/* Background bar */}
      <div className={`absolute inset-0 rounded ${task.isLate ? "bg-red-200" : "bg-slate-200"} opacity-50`} />
      {/* Progress bar */}
      <div
        className={`absolute top-0 left-0 h-full rounded ${task.isLate ? "bg-red-500" : getStatusColor(task.status)}`}
        style={{ width: `${task.progressPercentage}%`, opacity: 0.8 }}
      />
      {/* Label */}
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
// PAGE PRINCIPALE
// ============================================================
export default function ErpProjectGantt() {
  const [, params] = useRoute("/erp/projects/:id/gantt");
  const projectId = Number(params?.id);

  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [viewWeeks, setViewWeeks] = useState(8);

  const { data, isLoading } = trpc.erp.gantt.getData.useQuery(
    { projectId, status: statusFilter === "all" ? undefined : statusFilter },
    { enabled: !!projectId }
  );

  const dayWidth = 28;

  // Générer les colonnes de jours pour le header
  const timelineDays = useMemo(() => {
    if (!data) return [];
    const days: Array<{ date: Date; ts: number }> = [];
    const totalDays = Math.min(viewWeeks * 7, Math.ceil((data.timeline.end - data.timeline.start) / DAY_MS) + 7);
    for (let i = 0; i < totalDays; i++) {
      const ts = data.timeline.start + i * DAY_MS;
      days.push({ date: new Date(ts), ts });
    }
    return days;
  }, [data, viewWeeks]);

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <div className="h-8 w-64 bg-muted animate-pulse rounded" />
        <div className="h-[500px] bg-muted animate-pulse rounded" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-6">
        <p className="text-muted-foreground">Projet introuvable.</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href={`/erp/projects/${projectId}`}>
            <Button variant="ghost" size="icon"><ArrowLeft className="w-4 h-4" /></Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">Gantt — {data.project.name}</h1>
            <p className="text-sm text-muted-foreground">{data.project.code}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
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
          <div className="flex items-center gap-1">
            <Button variant="outline" size="icon" onClick={() => setViewWeeks(Math.max(4, viewWeeks - 2))}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="text-sm px-2">{viewWeeks} sem.</span>
            <Button variant="outline" size="icon" onClick={() => setViewWeeks(Math.min(24, viewWeeks + 2))}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
        <Card>
          <CardContent className="p-3 text-center">
            <p className="text-2xl font-bold">{data.summary.totalTasks}</p>
            <p className="text-xs text-muted-foreground">Tâches</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <p className="text-2xl font-bold text-green-600">{data.summary.completedTasks}</p>
            <p className="text-xs text-muted-foreground">Terminées</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <p className="text-2xl font-bold text-red-600">{data.summary.lateTasks}</p>
            <p className="text-xs text-muted-foreground">En retard</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <p className="text-2xl font-bold">{data.summary.avgProgress}%</p>
            <p className="text-xs text-muted-foreground">Progression</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <p className="text-2xl font-bold text-amber-600">{data.summary.totalMilestones}</p>
            <p className="text-xs text-muted-foreground">Jalons</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <p className="text-2xl font-bold text-green-600">{data.summary.reachedMilestones}</p>
            <p className="text-xs text-muted-foreground">Jalons atteints</p>
          </CardContent>
        </Card>
      </div>

      {/* Gantt Chart */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Diagramme de Gantt</CardTitle>
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
              {data.milestones.length > 0 && (
                <div className="flex border-b bg-amber-50/50">
                  <div className="w-64 min-w-[256px] border-r px-3 py-2 flex items-center gap-2">
                    <Diamond className="w-3 h-3 text-amber-600" />
                    <span className="text-xs font-medium text-amber-700">Jalons</span>
                  </div>
                  <div className="relative flex-1 h-8">
                    {data.milestones.map((m) => (
                      <MilestoneMarker
                        key={m.id}
                        milestone={m}
                        timelineStart={data.timeline.start}
                        dayWidth={dayWidth}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Task rows */}
              {data.tasks.map((task) => (
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
                      timelineStart={data.timeline.start}
                      timelineEnd={data.timeline.end}
                      dayWidth={dayWidth}
                    />
                  </div>
                </div>
              ))}

              {data.tasks.length === 0 && (
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
    </div>
  );
}
