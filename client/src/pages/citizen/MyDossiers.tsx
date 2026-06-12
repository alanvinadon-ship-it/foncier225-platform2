import { useState, useMemo, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { ArrowDown, ArrowUp, ArrowUpDown, Building2, Calendar, ChevronLeft, ChevronRight, Clock, Download, ExternalLink, FileText, FolderOpen, Landmark, Loader2, Search } from "lucide-react";
import { Link } from "wouter";
import { ACD_STATUS_LABELS, type AcdStatus } from "@shared/acd-workflow";

// ─── Status labels & colors ─────────────────────────────────────────────────

const RURAL_STATUS_LABELS: Record<string, string> = {
  cf_draft: "Brouillon",
  cf_submitted: "Soumis",
  cf_delimitation: "Délimitation en cours",
  cf_delimited: "Délimité",
  cf_inquiry: "Enquête publique",
  cf_publicity: "Publicité foncière",
  cf_opposed: "Opposition déposée",
  cf_validated: "Validé CSPGFR",
  cf_signed: "Certificat signé",
  cf_rejected: "Rejeté",
  tf_submitted: "Demande TF soumise",
  tf_afor_review: "Examen AFOR",
  tf_apfr_ready: "APFR prêt",
  tf_minister_signing: "Signature ministérielle",
  tf_signed: "Titre signé",
  tf_registered: "Enregistré au Livre Foncier",
  tf_rejected: "Rejeté",
};

function getStatusLabel(status: string, type: "rural" | "urban"): string {
  if (type === "urban") return ACD_STATUS_LABELS[status as AcdStatus] || status;
  return RURAL_STATUS_LABELS[status] || status;
}

function getStatusCategory(status: string): "active" | "completed" | "rejected" {
  if (status.includes("rejected") || status.includes("cancelled")) return "rejected";
  if (status.includes("signed") || status.includes("registered") || status === "acd_definitive_issued") return "completed";
  return "active";
}

function getStatusColor(status: string): string {
  const cat = getStatusCategory(status);
  if (cat === "completed") return "bg-green-100 text-green-800";
  if (cat === "rejected") return "bg-red-100 text-red-800";
  return "bg-blue-100 text-blue-800";
}

type SortBy = "createdAt" | "updatedAt" | "status" | "reference";
type SortOrder = "asc" | "desc";

// ─── Component ──────────────────────────────────────────────────────────────

export default function MyDossiers() {
  const [typeFilter, setTypeFilter] = useState<"all" | "rural" | "urban">("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "completed" | "rejected">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState<SortBy>("updatedAt");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");

  // Debounce search
  const searchTimeout = useState<ReturnType<typeof setTimeout> | null>(null);
  const handleSearchChange = useCallback((value: string) => {
    setSearchQuery(value);
    if (searchTimeout[0]) clearTimeout(searchTimeout[0]);
    searchTimeout[0] = setTimeout(() => {
      setDebouncedSearch(value);
      setPage(1);
    }, 400);
  }, []);

  const { data, isLoading } = trpc.citizen.allDossiers.useQuery({
    page,
    limit: 50,
    sortBy,
    sortOrder,
    typeFilter,
    statusFilter,
    search: debouncedSearch || undefined,
  });

  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = data?.totalPages ?? 1;

  // Handle sort toggle
  const handleSort = (col: SortBy) => {
    if (sortBy === col) {
      setSortOrder(sortOrder === "desc" ? "asc" : "desc");
    } else {
      setSortBy(col);
      setSortOrder("desc");
    }
    setPage(1);
  };

  // Export CSV
  const handleExportCsv = useCallback(() => {
    if (!items.length) return;
    const headers = ["Référence", "Type", "Statut", "Localité", "Date dépôt", "Dernière MAJ"];
    const rows = items.map((d) => [
      d.reference,
      d.type === "rural" ? "Rural" : "Urbain",
      getStatusLabel(d.status, d.type),
      d.locality || "",
      new Date(d.createdAt).toLocaleDateString("fr-FR"),
      d.updatedAt ? new Date(d.updatedAt).toLocaleDateString("fr-FR") : "",
    ]);
    const csv = [headers, ...rows].map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `mes-dossiers-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [items]);

  // Sort icon
  const SortIcon = ({ col }: { col: SortBy }) => {
    if (sortBy !== col) return <ArrowUpDown className="h-3 w-3 opacity-40" />;
    return sortOrder === "desc" ? <ArrowDown className="h-3 w-3" /> : <ArrowUp className="h-3 w-3" />;
  };

  // Stats (from server total — we also query without filters for stats)
  const { data: statsData } = trpc.citizen.allDossiers.useQuery({
    page: 1, limit: 1, sortBy: "updatedAt", sortOrder: "desc",
    typeFilter: "all", statusFilter: "all",
  });
  const { data: ruralStats } = trpc.citizen.allDossiers.useQuery({
    page: 1, limit: 1, sortBy: "updatedAt", sortOrder: "desc",
    typeFilter: "rural", statusFilter: "all",
  });
  const { data: urbanStats } = trpc.citizen.allDossiers.useQuery({
    page: 1, limit: 1, sortBy: "updatedAt", sortOrder: "desc",
    typeFilter: "urban", statusFilter: "all",
  });
  const { data: activeStats } = trpc.citizen.allDossiers.useQuery({
    page: 1, limit: 1, sortBy: "updatedAt", sortOrder: "desc",
    typeFilter: "all", statusFilter: "active",
  });
  const { data: completedStats } = trpc.citizen.allDossiers.useQuery({
    page: 1, limit: 1, sortBy: "updatedAt", sortOrder: "desc",
    typeFilter: "all", statusFilter: "completed",
  });

  if (isLoading && !data) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-ci-green" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <FolderOpen className="h-6 w-6 text-ci-orange" />
            Mes dossiers
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Historique complet de tous vos dossiers fonciers (rural et urbain).
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={handleExportCsv} disabled={items.length === 0}>
          <Download className="h-4 w-4 mr-2" />
          Exporter CSV
        </Button>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <Card className="bg-gradient-to-br from-ci-orange/5 to-transparent">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-ci-orange">{statsData?.total ?? 0}</p>
            <p className="text-xs text-muted-foreground">Total</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-emerald-50 to-transparent">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-emerald-600">{ruralStats?.total ?? 0}</p>
            <p className="text-xs text-muted-foreground">Rural</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-blue-50 to-transparent">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-blue-600">{urbanStats?.total ?? 0}</p>
            <p className="text-xs text-muted-foreground">Urbain</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-amber-50 to-transparent">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-amber-600">{activeStats?.total ?? 0}</p>
            <p className="text-xs text-muted-foreground">En cours</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-green-50 to-transparent">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-green-600">{completedStats?.total ?? 0}</p>
            <p className="text-xs text-muted-foreground">Complétés</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Rechercher par référence ou localité..."
                  value={searchQuery}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <Select value={typeFilter} onValueChange={(v) => { setTypeFilter(v as any); setPage(1); }}>
              <SelectTrigger className="w-full sm:w-[160px]">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les types</SelectItem>
                <SelectItem value="rural">Rural (CF/TF)</SelectItem>
                <SelectItem value="urban">Urbain (ACD)</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v as any); setPage(1); }}>
              <SelectTrigger className="w-full sm:w-[160px]">
                <SelectValue placeholder="Statut" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les statuts</SelectItem>
                <SelectItem value="active">En cours</SelectItem>
                <SelectItem value="completed">Complétés</SelectItem>
                <SelectItem value="rejected">Rejetés</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Table header with sort */}
      <div className="hidden sm:grid grid-cols-[1fr_80px_140px_120px_100px_100px_40px] gap-2 px-4 py-2 text-xs font-medium text-muted-foreground border-b">
        <button className="flex items-center gap-1 hover:text-foreground transition-colors text-left" onClick={() => handleSort("reference")}>
          Référence <SortIcon col="reference" />
        </button>
        <span>Type</span>
        <button className="flex items-center gap-1 hover:text-foreground transition-colors text-left" onClick={() => handleSort("status")}>
          Statut <SortIcon col="status" />
        </button>
        <span>Localité</span>
        <button className="flex items-center gap-1 hover:text-foreground transition-colors text-left" onClick={() => handleSort("createdAt")}>
          Dépôt <SortIcon col="createdAt" />
        </button>
        <button className="flex items-center gap-1 hover:text-foreground transition-colors text-left" onClick={() => handleSort("updatedAt")}>
          MAJ <SortIcon col="updatedAt" />
        </button>
        <span></span>
      </div>

      {/* Results */}
      {items.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="p-8 text-center">
            <FileText className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">
              {total === 0 && !debouncedSearch && typeFilter === "all" && statusFilter === "all"
                ? "Vous n'avez encore aucun dossier. Commencez par créer une nouvelle demande."
                : "Aucun dossier ne correspond aux filtres sélectionnés."}
            </p>
            {total === 0 && !debouncedSearch && typeFilter === "all" && statusFilter === "all" && (
              <Link href="/citizen/new-application">
                <Button className="mt-4 bg-ci-green hover:bg-ci-green/90">Nouvelle demande</Button>
              </Link>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">{total} dossier{total > 1 ? "s" : ""} trouvé{total > 1 ? "s" : ""}</p>
          {items.map((dossier) => (
            <DossierRow key={`${dossier.type}-${dossier.id}`} dossier={dossier} />
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-2">
          <p className="text-xs text-muted-foreground">
            Page {page} sur {totalPages}
          </p>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
              <ChevronLeft className="h-4 w-4 mr-1" /> Précédent
            </Button>
            <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>
              Suivant <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Dossier Row ────────────────────────────────────────────────────────────

function DossierRow({ dossier }: { dossier: { id: number; reference: string; type: "rural" | "urban"; status: string; createdAt: any; updatedAt: any; locality: string | null } }) {
  const detailPath = dossier.type === "rural"
    ? `/citizen/land-title/${dossier.id}`
    : `/citizen/urban-acd/${dossier.id}`;

  const TypeIcon = dossier.type === "rural" ? Landmark : Building2;
  const typeColor = dossier.type === "rural" ? "text-emerald-600" : "text-blue-600";
  const typeBg = dossier.type === "rural" ? "bg-emerald-50" : "bg-blue-50";
  const typeLabel = dossier.type === "rural" ? "Rural" : "Urbain";

  return (
    <Card className="hover:shadow-sm transition-shadow">
      <CardContent className="p-3 sm:p-4">
        <div className="flex items-center gap-3">
          {/* Type icon */}
          <div className={`shrink-0 w-9 h-9 rounded-lg ${typeBg} flex items-center justify-center`}>
            <TypeIcon className={`h-4 w-4 ${typeColor}`} />
          </div>

          {/* Info - mobile */}
          <div className="flex-1 min-w-0 sm:hidden">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-sm truncate">{dossier.reference}</span>
              <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${typeColor} border-current`}>
                {typeLabel}
              </Badge>
            </div>
            <div className="flex items-center gap-2 mt-1">
              <Badge className={`text-[10px] px-1.5 py-0 ${getStatusColor(dossier.status)}`}>
                {getStatusLabel(dossier.status, dossier.type)}
              </Badge>
              <span className="text-[10px] text-muted-foreground">
                {new Date(dossier.createdAt).toLocaleDateString("fr-FR")}
              </span>
            </div>
          </div>

          {/* Info - desktop grid */}
          <div className="hidden sm:grid grid-cols-[1fr_80px_140px_120px_100px_100px] gap-2 flex-1 items-center">
            <span className="font-medium text-sm truncate">{dossier.reference}</span>
            <Badge variant="outline" className={`text-[10px] px-1.5 py-0 w-fit ${typeColor} border-current`}>
              {typeLabel}
            </Badge>
            <Badge className={`text-[10px] px-1.5 py-0 w-fit ${getStatusColor(dossier.status)}`}>
              {getStatusLabel(dossier.status, dossier.type)}
            </Badge>
            <span className="text-xs text-muted-foreground truncate">{dossier.locality || "—"}</span>
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {new Date(dossier.createdAt).toLocaleDateString("fr-FR")}
            </span>
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {dossier.updatedAt ? new Date(dossier.updatedAt).toLocaleDateString("fr-FR") : "—"}
            </span>
          </div>

          {/* Action */}
          <Link href={detailPath}>
            <Button variant="ghost" size="icon" className="shrink-0">
              <ExternalLink className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
