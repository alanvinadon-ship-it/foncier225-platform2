import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Brain, Upload, FileText, AlertTriangle, CheckCircle, Clock, XCircle, Search } from "lucide-react";

const statusColors: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  analyzing: "bg-blue-100 text-blue-800",
  completed: "bg-green-100 text-green-800",
  failed: "bg-red-100 text-red-800",
  reviewed: "bg-purple-100 text-purple-800",
  validated: "bg-emerald-100 text-emerald-800",
  rejected: "bg-red-100 text-red-800",
};

const statusLabels: Record<string, string> = {
  pending: "En attente",
  analyzing: "En cours",
  completed: "Terminée",
  failed: "Échec",
  reviewed: "Revue",
  validated: "Validée",
  rejected: "Rejetée",
};

export default function ErpAiPlanAnalyzer() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");

  const { data: dashboard } = trpc.erp.aiPlanAnalyzer.analyses.dashboard.useQuery();
  const { data: analyses } = trpc.erp.aiPlanAnalyzer.analyses.list.useQuery({
    search: search || undefined,
    status: statusFilter || undefined,
    limit: 50,
    offset: 0,
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Brain className="h-6 w-6 text-indigo-600" />
            IA Plan Analyzer
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Analyse intelligente de plans de construction — Quantitatif matériaux & Contrôles ingénierie
          </p>
        </div>
        <Link href="/erp/ai/plans/upload">
          <Button className="gap-2">
            <Upload className="h-4 w-4" />
            Nouveau Plan
          </Button>
        </Link>
      </div>

      {/* KPIs */}
      {dashboard && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold">{dashboard.total}</div>
              <div className="text-xs text-muted-foreground">Total analyses</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-yellow-600">{dashboard.pending}</div>
              <div className="text-xs text-muted-foreground">En attente</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-green-600">{dashboard.completed}</div>
              <div className="text-xs text-muted-foreground">Terminées</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-emerald-600">{dashboard.validated}</div>
              <div className="text-xs text-muted-foreground">Validées</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-red-600">{dashboard.failed}</div>
              <div className="text-xs text-muted-foreground">Échecs</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-indigo-600">{dashboard.avgConfidence}%</div>
              <div className="text-xs text-muted-foreground">Confiance moy.</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher un plan..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Tous les statuts" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les statuts</SelectItem>
            <SelectItem value="pending">En attente</SelectItem>
            <SelectItem value="analyzing">En cours</SelectItem>
            <SelectItem value="completed">Terminée</SelectItem>
            <SelectItem value="validated">Validée</SelectItem>
            <SelectItem value="failed">Échec</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* List */}
      <div className="space-y-3">
        {analyses?.items.map((analysis: any) => (
          <Link key={analysis.id} href={`/erp/ai/plans/${analysis.id}`}>
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-indigo-50 flex items-center justify-center">
                      <FileText className="h-5 w-5 text-indigo-600" />
                    </div>
                    <div>
                      <div className="font-medium">{analysis.fileName}</div>
                      <div className="text-xs text-muted-foreground">
                        {analysis.analysisNumber} • {new Date(analysis.createdAt).toLocaleDateString("fr-FR")}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {analysis.confidenceScore !== null && (
                      <div className="text-sm text-muted-foreground">
                        {analysis.confidenceScore}% confiance
                      </div>
                    )}
                    <Badge className={statusColors[analysis.analysisStatus] || "bg-gray-100 text-gray-800"}>
                      {statusLabels[analysis.analysisStatus] || analysis.analysisStatus}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}

        {analyses?.items.length === 0 && (
          <Card>
            <CardContent className="p-12 text-center">
              <Brain className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">Aucune analyse</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Commencez par uploader un plan de construction pour lancer l'analyse IA.
              </p>
              <Link href="/erp/ai/plans/upload">
                <Button>
                  <Upload className="h-4 w-4 mr-2" />
                  Uploader un plan
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
