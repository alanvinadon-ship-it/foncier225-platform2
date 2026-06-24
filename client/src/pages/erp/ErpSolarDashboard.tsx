import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";
import { Sun, Zap, Battery, DollarSign, Plus, ArrowRight } from "lucide-react";

export default function ErpSolarDashboard() {
  const { data: projects, isLoading } = trpc.erp.solar.projects.list.useQuery({});
  const { data: stats } = trpc.erp.solar.projects.dashboard.useQuery();

  const statusColors: Record<string, string> = {
    draft: "bg-gray-100 text-gray-700",
    in_progress: "bg-blue-100 text-blue-700",
    completed: "bg-green-100 text-green-700",
    archived: "bg-yellow-100 text-yellow-700",
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Énergie Solaire</h1>
          <p className="text-muted-foreground">Dimensionnement et gestion de projets solaires photovoltaïques</p>
        </div>
        <Link href="/erp/solar/new">
          <Button><Plus className="h-4 w-4 mr-2" />Nouveau Projet</Button>
        </Link>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Projets</CardTitle>
            <Sun className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalProjects ?? 0}</div>
            <p className="text-xs text-muted-foreground">{stats?.studyProjects ?? 0} en étude, {stats?.validatedProjects ?? 0} validés</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Puissance PV</CardTitle>
            <Zap className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{((stats?.totalPvPowerWc ?? 0) / 1000).toFixed(1)} kWp</div>
            <p className="text-xs text-muted-foreground">dimensionnée</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Énergie journalière</CardTitle>
            <Battery className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{((stats?.totalDailyEnergy ?? 0) / 1000).toFixed(1)} kWh/j</div>
            <p className="text-xs text-muted-foreground">consommation totale</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Budget total</CardTitle>
            <DollarSign className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{((stats?.totalBudget ?? 0) / 1000000).toFixed(1)} M</div>
            <p className="text-xs text-muted-foreground">FCFA</p>
          </CardContent>
        </Card>
      </div>

      {/* Projects List */}
      <Card>
        <CardHeader>
          <CardTitle>Projets Solaires</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Chargement...</div>
          ) : !projects?.length ? (
            <div className="text-center py-8">
              <Sun className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground mb-4">Aucun projet solaire créé</p>
              <Link href="/erp/solar/new">
                <Button variant="outline"><Plus className="h-4 w-4 mr-2" />Créer un projet</Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {projects.map((project: any) => (
                <Link key={project.id} href={`/erp/solar/${project.id}`}>
                  <div className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="h-10 w-10 rounded-full bg-orange-100 flex items-center justify-center">
                        <Sun className="h-5 w-5 text-orange-600" />
                      </div>
                      <div>
                        <p className="font-medium">{project.name}</p>
                        <p className="text-sm text-muted-foreground">{project.siteLocation || "Localisation non définie"}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">

                      <Badge className={statusColors[project.status] || "bg-gray-100"}>
                        {project.status === "draft" ? "Brouillon" : project.status === "in_progress" ? "En cours" : project.status === "completed" ? "Terminé" : project.status}
                      </Badge>
                      <ArrowRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
