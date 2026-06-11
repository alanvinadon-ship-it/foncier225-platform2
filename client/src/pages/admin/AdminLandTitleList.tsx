import { LandTitleStatusBadge, type LandTitleStatus } from "@/components/LandTitleTimeline";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { motion } from "framer-motion";
import {
  ChevronRight,
  Filter,
  Loader2,
  Search,
  FileText,
  RotateCcw,
} from "lucide-react";
import { useState, useMemo } from "react";
import { Link } from "wouter";

const PHASE_OPTIONS = [
  { value: "all", label: "Toutes les phases" },
  { value: "certificate", label: "Phase 1 — Certificat Foncier" },
  { value: "title", label: "Phase 2 — Titre Foncier" },
];

const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: "all", label: "Tous les statuts" },
  { value: "cf_draft", label: "Brouillon" },
  { value: "cf_submitted", label: "Déposé" },
  { value: "cf_delimitation", label: "Délimitation" },
  { value: "cf_delimited", label: "Délimité" },
  { value: "cf_inquiry", label: "Enquête" },
  { value: "cf_publicity", label: "Publicité" },
  { value: "cf_opposed", label: "Opposition" },
  { value: "cf_validated", label: "Validé CSPGFR" },
  { value: "cf_signed", label: "CF Signé" },
  { value: "cf_rejected", label: "Rejeté (CF)" },
  { value: "tf_submitted", label: "Requête TF" },
  { value: "tf_afor_review", label: "Contrôle AFOR" },
  { value: "tf_apfr_ready", label: "APFR Prêt" },
  { value: "tf_minister_signing", label: "Signature Ministre" },
  { value: "tf_signed", label: "APFR Signé" },
  { value: "tf_registered", label: "Titre Inscrit" },
  { value: "tf_rejected", label: "Rejeté (TF)" },
];

export default function AdminLandTitleList() {
  const [search, setSearch] = useState("");
  const [phaseFilter, setPhaseFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const { data, isLoading } = trpc.landTitle.admin.listAll.useQuery({});

  const filtered = useMemo(() => {
    if (!data?.items) return [];
    return data.items.filter((app: any) => {
      // Phase filter
      if (phaseFilter !== "all" && app.phase !== phaseFilter) return false;
      // Status filter
      if (statusFilter !== "all" && app.status !== statusFilter) return false;
      // Search
      if (search.trim()) {
        const q = search.toLowerCase();
        const match =
          app.applicationNumber?.toLowerCase().includes(q) ||
          app.applicantFullName?.toLowerCase().includes(q) ||
          app.landLocality?.toLowerCase().includes(q) ||
          app.landSubPrefecture?.toLowerCase().includes(q);
        if (!match) return false;
      }
      return true;
    });
  }, [data, search, phaseFilter, statusFilter]);

  const hasFilters = search || phaseFilter !== "all" || statusFilter !== "all";

  function resetFilters() {
    setSearch("");
    setPhaseFilter("all");
    setStatusFilter("all");
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Gestion des Titres Fonciers</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Administrez toutes les demandes de Certificat Foncier et Titre Foncier
        </p>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Rechercher par n° dossier, nom, localité..."
                className="pl-9"
              />
            </div>
            <Select value={phaseFilter} onValueChange={setPhaseFilter}>
              <SelectTrigger className="w-full sm:w-[200px]">
                <Filter className="h-4 w-4 mr-2 text-muted-foreground" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PHASE_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[200px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {hasFilters && (
              <Button variant="ghost" size="icon" onClick={resetFilters} title="Réinitialiser">
                <RotateCcw className="h-4 w-4" />
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      {data && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-ci-green">{data.items.length}</p>
              <p className="text-xs text-muted-foreground">Total dossiers</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-amber-600">
                {data.items.filter((a: any) => a.status === "cf_opposed").length}
              </p>
              <p className="text-xs text-muted-foreground">En opposition</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-indigo-600">
                {data.items.filter((a: any) => a.phase === "title").length}
              </p>
              <p className="text-xs text-muted-foreground">Phase TF</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-green-700">
                {data.items.filter((a: any) => a.status === "tf_registered" || a.status === "cf_signed").length}
              </p>
              <p className="text-xs text-muted-foreground">Complétés</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-ci-green" />
        </div>
      )}

      {/* Results */}
      {!isLoading && (
        <>
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {filtered.length} dossier{filtered.length !== 1 ? "s" : ""} trouvé{filtered.length !== 1 ? "s" : ""}
            </p>
          </div>

          {filtered.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="p-12 text-center">
                <FileText className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">
                  {hasFilters ? "Aucun dossier ne correspond aux filtres" : "Aucun dossier enregistré"}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {filtered.map((app: any, idx: number) => (
                <motion.div
                  key={app.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.02 }}
                >
                  <Link href={`/admin/land-title/${app.id}`}>
                    <Card className="hover:border-ci-green/40 hover:shadow-sm transition-all cursor-pointer group">
                      <CardContent className="p-4 flex items-center gap-4">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-ci-green/10 shrink-0">
                          <FileText className="h-4 w-4 text-ci-green" />
                        </div>
                        <div className="flex-1 min-w-0 grid grid-cols-1 sm:grid-cols-3 gap-1 sm:gap-4">
                          <div>
                            <span className="text-sm font-semibold truncate block">{app.applicationNumber}</span>
                            <span className="text-xs text-muted-foreground">{app.applicantFullName}</span>
                          </div>
                          <div className="hidden sm:block">
                            <span className="text-xs text-muted-foreground block">
                              {app.landLocality || "—"}, {app.landSubPrefecture || "—"}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {new Date(app.createdAt).toLocaleDateString("fr-FR")}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <LandTitleStatusBadge status={app.status as LandTitleStatus} />
                          </div>
                        </div>
                        <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-ci-green transition-colors shrink-0" />
                      </CardContent>
                    </Card>
                  </Link>
                </motion.div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
