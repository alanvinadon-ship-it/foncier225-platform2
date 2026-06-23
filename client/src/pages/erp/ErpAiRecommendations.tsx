import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Lightbulb, CheckCircle, XCircle, Zap, RefreshCw, AlertTriangle, TrendingUp, Shield, Loader2 } from "lucide-react";
import { toast } from "sonner";

const PRIORITY_COLORS: Record<string, string> = {
  critical: "bg-red-100 text-red-800",
  high: "bg-orange-100 text-orange-800",
  medium: "bg-yellow-100 text-yellow-800",
  low: "bg-green-100 text-green-800",
};

const STATUS_LABELS: Record<string, string> = {
  suggested: "En attente",
  accepted: "Acceptée",
  rejected: "Rejetée",
  applied: "Appliquée",
  archived: "Archivée",
};

export default function ErpAiRecommendations() {
  const [moduleFilter, setModuleFilter] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("suggested");
  const [priorityFilter, setPriorityFilter] = useState<string>("");
  const [selectedRec, setSelectedRec] = useState<any>(null);
  const [page, setPage] = useState(1);

  const recommendationsQuery = trpc.erp.aiAssistant.recommendations.list.useQuery({
    module: moduleFilter || undefined,
    status: statusFilter || undefined,
    priority: priorityFilter || undefined,
    page,
    limit: 20,
  });

  const statsQuery = trpc.erp.aiAssistant.recommendations.stats.useQuery();

  const acceptMutation = trpc.erp.aiAssistant.recommendations.accept.useMutation({
    onSuccess: () => {
      toast.success("Recommandation acceptée");
      recommendationsQuery.refetch();
      statsQuery.refetch();
      setSelectedRec(null);
    },
  });

  const rejectMutation = trpc.erp.aiAssistant.recommendations.reject.useMutation({
    onSuccess: () => {
      toast.success("Recommandation rejetée");
      recommendationsQuery.refetch();
      statsQuery.refetch();
      setSelectedRec(null);
    },
  });

  const applyMutation = trpc.erp.aiAssistant.recommendations.applyRecommendation.useMutation({
    onSuccess: () => {
      toast.success("Recommandation appliquée");
      recommendationsQuery.refetch();
      statsQuery.refetch();
      setSelectedRec(null);
    },
  });

  const generateMutation = trpc.erp.aiAssistant.recommendations.generate.useMutation({
    onSuccess: (data) => {
      toast.success(`${data.created} recommandation(s) générée(s)`);
      recommendationsQuery.refetch();
      statsQuery.refetch();
    },
    onError: (err) => toast.error(err.message),
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Lightbulb className="h-6 w-6 text-amber-500" />
            Recommandations IA
          </h1>
          <p className="text-muted-foreground">
            Recommandations générées par l'IA pour optimiser vos opérations
          </p>
        </div>
        <Button
          onClick={() => generateMutation.mutate({ module: moduleFilter || "general" })}
          disabled={generateMutation.isPending}
          className="gap-2"
        >
          {generateMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          Générer
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-amber-100 flex items-center justify-center">
              <Lightbulb className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">En attente</p>
              <p className="text-2xl font-bold">{statsQuery.data?.suggested || 0}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
              <CheckCircle className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Acceptées</p>
              <p className="text-2xl font-bold">{statsQuery.data?.accepted || 0}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
              <Zap className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Appliquées</p>
              <p className="text-2xl font-bold">{statsQuery.data?.applied || 0}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-red-100 flex items-center justify-center">
              <AlertTriangle className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Critiques</p>
              <p className="text-2xl font-bold text-red-600">{statsQuery.data?.critical || 0}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex gap-3">
        <Select value={moduleFilter} onValueChange={setModuleFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Tous modules" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous modules</SelectItem>
            <SelectItem value="budget">Budget</SelectItem>
            <SelectItem value="inventory">Stock</SelectItem>
            <SelectItem value="safety">Sécurité</SelectItem>
            <SelectItem value="projects">Projets</SelectItem>
            <SelectItem value="finance">Finance</SelectItem>
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Statut" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous statuts</SelectItem>
            <SelectItem value="suggested">En attente</SelectItem>
            <SelectItem value="accepted">Acceptées</SelectItem>
            <SelectItem value="rejected">Rejetées</SelectItem>
            <SelectItem value="applied">Appliquées</SelectItem>
          </SelectContent>
        </Select>
        <Select value={priorityFilter} onValueChange={setPriorityFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Priorité" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes priorités</SelectItem>
            <SelectItem value="critical">Critique</SelectItem>
            <SelectItem value="high">Haute</SelectItem>
            <SelectItem value="medium">Moyenne</SelectItem>
            <SelectItem value="low">Basse</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Priorité</TableHead>
              <TableHead>Module</TableHead>
              <TableHead>Titre</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Confiance</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {recommendationsQuery.data?.recommendations.map(rec => (
              <TableRow key={rec.id} className="cursor-pointer" onClick={() => setSelectedRec(rec)}>
                <TableCell>
                  <Badge className={PRIORITY_COLORS[rec.priority] || ""}>
                    {rec.priority}
                  </Badge>
                </TableCell>
                <TableCell className="capitalize">{rec.module}</TableCell>
                <TableCell className="max-w-xs truncate">{rec.title}</TableCell>
                <TableCell className="capitalize">{rec.recommendationType}</TableCell>
                <TableCell>
                  {rec.confidenceScore ? `${rec.confidenceScore}%` : "-"}
                </TableCell>
                <TableCell>
                  <Badge variant="outline">{STATUS_LABELS[rec.status] || rec.status}</Badge>
                </TableCell>
                <TableCell className="text-sm">
                  {new Date(rec.createdAt).toLocaleDateString("fr-FR")}
                </TableCell>
                <TableCell>
                  {rec.status === "suggested" && (
                    <div className="flex gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-green-600"
                        onClick={(e) => { e.stopPropagation(); acceptMutation.mutate({ id: rec.id }); }}
                      >
                        <CheckCircle className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-red-600"
                        onClick={(e) => { e.stopPropagation(); rejectMutation.mutate({ id: rec.id }); }}
                      >
                        <XCircle className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </TableCell>
              </TableRow>
            ))}
            {recommendationsQuery.data?.recommendations.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                  Aucune recommandation trouvée
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>

      {/* Detail Dialog */}
      <Dialog open={!!selectedRec} onOpenChange={() => setSelectedRec(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Lightbulb className="h-5 w-5 text-amber-500" />
              {selectedRec?.title}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex gap-2">
              <Badge className={PRIORITY_COLORS[selectedRec?.priority] || ""}>
                {selectedRec?.priority}
              </Badge>
              <Badge variant="outline">{selectedRec?.module}</Badge>
              <Badge variant="outline">{selectedRec?.recommendationType}</Badge>
            </div>
            <p className="text-sm">{selectedRec?.description}</p>
            {selectedRec?.confidenceScore && (
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">Confiance: {selectedRec.confidenceScore}%</span>
              </div>
            )}
          </div>
          {selectedRec?.status === "suggested" && (
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => rejectMutation.mutate({ id: selectedRec.id })}>
                <XCircle className="h-4 w-4 mr-2" /> Rejeter
              </Button>
              <Button variant="outline" onClick={() => acceptMutation.mutate({ id: selectedRec.id })}>
                <CheckCircle className="h-4 w-4 mr-2" /> Accepter
              </Button>
              <Button onClick={() => applyMutation.mutate({ id: selectedRec.id })}>
                <Zap className="h-4 w-4 mr-2" /> Appliquer
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
