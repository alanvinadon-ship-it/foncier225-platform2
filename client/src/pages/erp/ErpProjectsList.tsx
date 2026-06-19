import { useState } from "react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Search, FolderOpen, Calendar, Users, TrendingUp } from "lucide-react";

const STATUS_LABELS: Record<string, string> = {
  draft: "Brouillon",
  planned: "Planifié",
  active: "Actif",
  on_hold: "En pause",
  completed: "Terminé",
  cancelled: "Annulé",
  delayed: "En retard",
};

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-gray-100 text-gray-800",
  planned: "bg-blue-100 text-blue-800",
  active: "bg-green-100 text-green-800",
  on_hold: "bg-yellow-100 text-yellow-800",
  completed: "bg-emerald-100 text-emerald-800",
  cancelled: "bg-red-100 text-red-800",
  delayed: "bg-orange-100 text-orange-800",
};

const PRIORITY_COLORS: Record<string, string> = {
  low: "bg-slate-100 text-slate-700",
  medium: "bg-blue-100 text-blue-700",
  high: "bg-orange-100 text-orange-700",
  critical: "bg-red-100 text-red-700",
};

export default function ErpProjectsList() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<string>("all");
  const [priority, setPriority] = useState<string>("all");
  const [page, setPage] = useState(0);
  const limit = 12;

  const { data, isLoading } = trpc.erp.projects.list.useQuery({
    limit,
    offset: page * limit,
    search: search || undefined,
    status: status !== "all" ? status as any : undefined,
    priority: priority !== "all" ? priority as any : undefined,
    sortBy: "created_at",
    sortOrder: "desc",
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Projets</h1>
          <p className="text-muted-foreground">Gérez vos projets de construction</p>
        </div>
        <Link href="/erp/projects/create">
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            Nouveau projet
          </Button>
        </Link>
      </div>

      {/* Filtres */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher par nom, code ou client..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(0); }}
            className="pl-9"
          />
        </div>
        <Select value={status} onValueChange={(v) => { setStatus(v); setPage(0); }}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Statut" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les statuts</SelectItem>
            <SelectItem value="draft">Brouillon</SelectItem>
            <SelectItem value="planned">Planifié</SelectItem>
            <SelectItem value="active">Actif</SelectItem>
            <SelectItem value="on_hold">En pause</SelectItem>
            <SelectItem value="completed">Terminé</SelectItem>
            <SelectItem value="delayed">En retard</SelectItem>
          </SelectContent>
        </Select>
        <Select value={priority} onValueChange={(v) => { setPriority(v); setPage(0); }}>
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
      </div>

      {/* Grille de projets */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6 space-y-3">
                <div className="h-4 bg-muted rounded w-3/4" />
                <div className="h-3 bg-muted rounded w-1/2" />
                <div className="h-2 bg-muted rounded w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : data?.projects.length === 0 ? (
        <div className="text-center py-12">
          <FolderOpen className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium">Aucun projet trouvé</h3>
          <p className="text-muted-foreground">Créez votre premier projet de construction</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {data?.projects.map((project) => (
              <Link key={project.id} href={`/erp/projects/${project.id}`}>
                <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
                  <CardContent className="p-5 space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-muted-foreground font-mono">{project.code}</p>
                        <h3 className="font-semibold truncate mt-0.5">{project.name}</h3>
                      </div>
                      <Badge className={`ml-2 text-xs ${STATUS_COLORS[project.status] || ""}`}>
                        {STATUS_LABELS[project.status] || project.status}
                      </Badge>
                    </div>

                    {project.clientName && (
                      <p className="text-sm text-muted-foreground truncate">
                        <Users className="w-3 h-3 inline mr-1" />
                        {project.clientName}
                      </p>
                    )}

                    {/* Progression */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">Progression</span>
                        <span className="font-medium">{project.progressPercentage}%</span>
                      </div>
                      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary rounded-full transition-all"
                          style={{ width: `${project.progressPercentage}%` }}
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-xs text-muted-foreground pt-1">
                      <div className="flex items-center gap-1">
                        <Badge className={`text-[10px] px-1.5 ${PRIORITY_COLORS[project.priority] || ""}`}>
                          {project.priority}
                        </Badge>
                      </div>
                      {project.managerName && (
                        <span className="truncate max-w-[120px]">{project.managerName}</span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>

          {/* Pagination */}
          {data && data.total > limit && (
            <div className="flex items-center justify-between pt-4">
              <p className="text-sm text-muted-foreground">
                {data.total} projet{data.total > 1 ? "s" : ""} au total
              </p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(p => p - 1)}>
                  Précédent
                </Button>
                <Button variant="outline" size="sm" disabled={(page + 1) * limit >= data.total} onClick={() => setPage(p => p + 1)}>
                  Suivant
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
