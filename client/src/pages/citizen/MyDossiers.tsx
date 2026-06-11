import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Building2, Calendar, Clock, ExternalLink, FileText, Landmark, Loader2, Search, FolderOpen } from "lucide-react";
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

// ─── Component ──────────────────────────────────────────────────────────────

export default function MyDossiers() {
  const [typeFilter, setTypeFilter] = useState<"all" | "rural" | "urban">("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "completed" | "rejected">("all");
  const [searchQuery, setSearchQuery] = useState("");

  const { data: dossiers, isLoading } = trpc.citizen.allDossiers.useQuery();

  const filteredDossiers = useMemo(() => {
    if (!dossiers) return [];
    return dossiers.filter((d) => {
      // Type filter
      if (typeFilter !== "all" && d.type !== typeFilter) return false;
      // Status filter
      if (statusFilter !== "all" && getStatusCategory(d.status) !== statusFilter) return false;
      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        if (
          !d.reference.toLowerCase().includes(q) &&
          !(d.locality || "").toLowerCase().includes(q)
        ) return false;
      }
      return true;
    });
  }, [dossiers, typeFilter, statusFilter, searchQuery]);

  // Stats
  const stats = useMemo(() => {
    if (!dossiers) return { total: 0, rural: 0, urban: 0, active: 0, completed: 0 };
    return {
      total: dossiers.length,
      rural: dossiers.filter((d) => d.type === "rural").length,
      urban: dossiers.filter((d) => d.type === "urban").length,
      active: dossiers.filter((d) => getStatusCategory(d.status) === "active").length,
      completed: dossiers.filter((d) => getStatusCategory(d.status) === "completed").length,
    };
  }, [dossiers]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-ci-green" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <FolderOpen className="h-6 w-6 text-ci-orange" />
          Mes dossiers
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Historique complet de tous vos dossiers fonciers (rural et urbain).
        </p>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <Card className="bg-gradient-to-br from-ci-orange/5 to-transparent">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-ci-orange">{stats.total}</p>
            <p className="text-xs text-muted-foreground">Total</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-emerald-50 to-transparent">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-emerald-600">{stats.rural}</p>
            <p className="text-xs text-muted-foreground">Rural</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-blue-50 to-transparent">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-blue-600">{stats.urban}</p>
            <p className="text-xs text-muted-foreground">Urbain</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-amber-50 to-transparent">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-amber-600">{stats.active}</p>
            <p className="text-xs text-muted-foreground">En cours</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-green-50 to-transparent">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-green-600">{stats.completed}</p>
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
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as any)}>
              <SelectTrigger className="w-full sm:w-[160px]">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les types</SelectItem>
                <SelectItem value="rural">Rural (CF/TF)</SelectItem>
                <SelectItem value="urban">Urbain (ACD)</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as any)}>
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

      {/* Results */}
      {filteredDossiers.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="p-8 text-center">
            <FileText className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">
              {dossiers && dossiers.length > 0
                ? "Aucun dossier ne correspond aux filtres sélectionnés."
                : "Vous n'avez encore aucun dossier. Commencez par créer une nouvelle demande."}
            </p>
            {dossiers && dossiers.length === 0 && (
              <Link href="/citizen/new-application">
                <Button className="mt-4 bg-ci-green hover:bg-ci-green/90">Nouvelle demande</Button>
              </Link>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground">{filteredDossiers.length} dossier{filteredDossiers.length > 1 ? "s" : ""} trouvé{filteredDossiers.length > 1 ? "s" : ""}</p>
          {filteredDossiers.map((dossier) => (
            <DossierCard key={`${dossier.type}-${dossier.id}`} dossier={dossier} />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Dossier Card ───────────────────────────────────────────────────────────

function DossierCard({ dossier }: { dossier: { id: number; reference: string; type: "rural" | "urban"; status: string; createdAt: any; updatedAt: any; locality: string | null } }) {
  const detailPath = dossier.type === "rural"
    ? `/citizen/land-title/${dossier.id}`
    : `/citizen/urban-acd/${dossier.id}`;

  const TypeIcon = dossier.type === "rural" ? Landmark : Building2;
  const typeColor = dossier.type === "rural" ? "text-emerald-600" : "text-blue-600";
  const typeBg = dossier.type === "rural" ? "bg-emerald-50" : "bg-blue-50";
  const typeLabel = dossier.type === "rural" ? "Rural" : "Urbain";

  return (
    <Card className="hover:shadow-sm transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-center gap-4">
          {/* Type icon */}
          <div className={`shrink-0 w-10 h-10 rounded-lg ${typeBg} flex items-center justify-center`}>
            <TypeIcon className={`h-5 w-5 ${typeColor}`} />
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-sm truncate">{dossier.reference}</span>
              <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${typeColor} border-current`}>
                {typeLabel}
              </Badge>
              <Badge className={`text-[10px] px-1.5 py-0 ${getStatusColor(dossier.status)}`}>
                {getStatusLabel(dossier.status, dossier.type)}
              </Badge>
            </div>
            <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
              {dossier.locality && (
                <span className="flex items-center gap-1">
                  <Building2 className="h-3 w-3" />
                  {dossier.locality}
                </span>
              )}
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {new Date(dossier.createdAt).toLocaleDateString("fr-FR")}
              </span>
              {dossier.updatedAt && (
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  MAJ {new Date(dossier.updatedAt).toLocaleDateString("fr-FR")}
                </span>
              )}
            </div>
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
