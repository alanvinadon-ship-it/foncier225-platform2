import { useState, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useLocation } from "wouter";
import {
  FileText, Upload, Search, RefreshCw, Eye, CheckCircle, XCircle, Clock,
  AlertTriangle, Filter, BarChart3, FileSearch, Loader2
} from "lucide-react";

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  pending: { label: "En attente", color: "bg-gray-100 text-gray-700" },
  running: { label: "En cours", color: "bg-blue-100 text-blue-700" },
  ocr_completed: { label: "OCR terminé", color: "bg-indigo-100 text-indigo-700" },
  classification_completed: { label: "Classifié", color: "bg-green-100 text-green-700" },
  needs_review: { label: "À valider", color: "bg-amber-100 text-amber-700" },
  validated: { label: "Validé", color: "bg-emerald-100 text-emerald-700" },
  rejected: { label: "Rejeté", color: "bg-red-100 text-red-700" },
  failed: { label: "Échoué", color: "bg-red-100 text-red-700" },
  cancelled: { label: "Annulé", color: "bg-gray-100 text-gray-500" },
};

export default function ErpAiDocumentExtraction() {
  const [, navigate] = useLocation();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const stats = trpc.erp.aiDocumentExtraction.jobs.stats.useQuery();
  const jobs = trpc.erp.aiDocumentExtraction.jobs.list.useQuery({
    search: search || undefined,
    jobStatus: statusFilter !== "all" ? statusFilter : undefined,
    page,
    limit: 20,
  });

  const uploadAndCreate = trpc.erp.aiDocumentExtraction.uploadAndCreate.useMutation({
    onSuccess: (data) => {
      toast.success(`Job ${data.jobNumber} créé avec succès`);
      jobs.refetch();
      stats.refetch();
    },
    onError: (err) => toast.error(err.message),
  });

  const runJob = trpc.erp.aiDocumentExtraction.jobs.run.useMutation({
    onSuccess: () => {
      toast.success("Analyse OCR + Classification lancée");
      jobs.refetch();
      stats.refetch();
    },
    onError: (err) => toast.error(err.message),
  });

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check size (max 16MB for base64 transfer)
    if (file.size > 16 * 1024 * 1024) {
      toast.error("Fichier trop volumineux (max 16 MB)");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const base64 = (reader.result as string).split(",")[1];
      uploadAndCreate.mutate({
        fileName: file.name,
        fileType: file.type,
        fileSize: file.size,
        fileBase64: base64,
      });
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const totalPages = Math.ceil((jobs.data?.total || 0) / 20);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <FileSearch className="h-6 w-6 text-emerald-600" />
            Extraction Documentaire IA
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            OCR, classification automatique et validation humaine des documents
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => { jobs.refetch(); stats.refetch(); }}>
            <RefreshCw className="h-4 w-4 mr-1" /> Actualiser
          </Button>
          <Button size="sm" onClick={() => fileInputRef.current?.click()} disabled={uploadAndCreate.isPending}>
            {uploadAndCreate.isPending ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Upload className="h-4 w-4 mr-1" />}
            Uploader un document
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.jpg,.jpeg,.png"
            className="hidden"
            onChange={handleFileUpload}
          />
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Card>
          <CardContent className="pt-4 pb-3 px-4">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-blue-500" />
              <span className="text-xs text-muted-foreground">Total</span>
            </div>
            <p className="text-2xl font-bold mt-1">{stats.data?.total || 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 px-4">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-gray-500" />
              <span className="text-xs text-muted-foreground">En attente</span>
            </div>
            <p className="text-2xl font-bold mt-1">{stats.data?.pending || 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 px-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              <span className="text-xs text-muted-foreground">À valider</span>
            </div>
            <p className="text-2xl font-bold mt-1 text-amber-600">{stats.data?.needsReview || 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 px-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-emerald-500" />
              <span className="text-xs text-muted-foreground">Validés</span>
            </div>
            <p className="text-2xl font-bold mt-1 text-emerald-600">{stats.data?.validated || 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 px-4">
            <div className="flex items-center gap-2">
              <XCircle className="h-4 w-4 text-red-500" />
              <span className="text-xs text-muted-foreground">Échoués</span>
            </div>
            <p className="text-2xl font-bold mt-1 text-red-600">{stats.data?.failed || 0}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex gap-3 items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher par nom ou numéro..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
          <SelectTrigger className="w-[180px]">
            <Filter className="h-4 w-4 mr-1" />
            <SelectValue placeholder="Statut" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les statuts</SelectItem>
            <SelectItem value="pending">En attente</SelectItem>
            <SelectItem value="running">En cours</SelectItem>
            <SelectItem value="needs_review">À valider</SelectItem>
            <SelectItem value="validated">Validé</SelectItem>
            <SelectItem value="rejected">Rejeté</SelectItem>
            <SelectItem value="failed">Échoué</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Jobs Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 border-b">
                <tr>
                  <th className="text-left px-4 py-3 font-medium">N° Job</th>
                  <th className="text-left px-4 py-3 font-medium">Fichier</th>
                  <th className="text-left px-4 py-3 font-medium">Type détecté</th>
                  <th className="text-center px-4 py-3 font-medium">Confiance</th>
                  <th className="text-center px-4 py-3 font-medium">Statut</th>
                  <th className="text-left px-4 py-3 font-medium">Date</th>
                  <th className="text-right px-4 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {jobs.isLoading ? (
                  <tr><td colSpan={7} className="text-center py-8 text-muted-foreground">
                    <Loader2 className="h-5 w-5 animate-spin inline mr-2" />Chargement...
                  </td></tr>
                ) : !jobs.data?.jobs.length ? (
                  <tr><td colSpan={7} className="text-center py-8 text-muted-foreground">
                    <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    Aucun job d'extraction. Uploadez un document pour commencer.
                  </td></tr>
                ) : (
                  jobs.data.jobs.map((job) => {
                    const status = STATUS_LABELS[job.jobStatus] || STATUS_LABELS.pending;
                    return (
                      <tr key={job.id} className="border-b hover:bg-muted/30 cursor-pointer" onClick={() => navigate(`/erp/ai/documents/${job.id}`)}>
                        <td className="px-4 py-3 font-mono text-xs">{job.jobNumber}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                            <span className="truncate max-w-[200px]">{job.fileName}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          {job.confirmedDocumentType || job.detectedDocumentType || <span className="text-muted-foreground italic">—</span>}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {job.confidenceScore != null ? (
                            <span className={`font-medium ${job.confidenceScore >= 80 ? "text-emerald-600" : job.confidenceScore >= 60 ? "text-amber-600" : "text-red-600"}`}>
                              {job.confidenceScore}%
                            </span>
                          ) : "—"}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <Badge variant="secondary" className={`text-xs ${status.color}`}>
                            {status.label}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">
                          {new Date(job.createdAt).toLocaleDateString("fr-FR")}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex gap-1 justify-end" onClick={(e) => e.stopPropagation()}>
                            {job.jobStatus === "pending" && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => runJob.mutate({ id: job.id })}
                                disabled={runJob.isPending}
                              >
                                {runJob.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : "Analyser"}
                              </Button>
                            )}
                            <Button size="sm" variant="ghost" onClick={() => navigate(`/erp/ai/documents/${job.id}`)}>
                              <Eye className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t">
              <span className="text-sm text-muted-foreground">
                Page {page} / {totalPages} ({jobs.data?.total} résultats)
              </span>
              <div className="flex gap-1">
                <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
                  Précédent
                </Button>
                <Button size="sm" variant="outline" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>
                  Suivant
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
