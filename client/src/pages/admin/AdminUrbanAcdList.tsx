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
  Building2,
  RotateCcw,
  AlertTriangle,
  CheckCircle2,
  Clock,
  XCircle,
} from "lucide-react";
import { useState, useMemo } from "react";
import { Link } from "wouter";
import { ACD_STATUS_LABELS, ACD_PHASES } from "@shared/acd-workflow";
import { AcdStatusBadge } from "@/components/AcdStatusBadge";

const PHASE_OPTIONS = [
  { value: "all", label: "Toutes les phases" },
  { value: "provisional", label: "Phase 1 — Concession Provisoire" },
  { value: "development", label: "Phase 2 — Mise en valeur" },
  { value: "definitive", label: "Phase 3 — Concession Définitive" },
];

const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: "all", label: "Tous les statuts" },
  ...Object.entries(ACD_STATUS_LABELS).map(([value, label]) => ({ value, label: label as string })),
];

export default function AdminUrbanAcdList() {
  const [search, setSearch] = useState("");
  const [phaseFilter, setPhaseFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const { data, isLoading } = trpc.urbanAcd.admin.list.useQuery({});
  const { data: stats } = trpc.urbanAcd.admin.stats.useQuery();

  const filtered = useMemo(() => {
    if (!data?.items) return [];
    return data.items.filter((app: any) => {
      if (phaseFilter !== "all" && app.phase !== phaseFilter) return false;
      if (statusFilter !== "all" && app.status !== statusFilter) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        const match =
          app.applicationNumber?.toLowerCase().includes(q) ||
          app.commune?.toLowerCase().includes(q) ||
          app.quartier?.toLowerCase().includes(q) ||
          app.lotNumber?.toLowerCase().includes(q);
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
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Building2 className="h-6 w-6 text-orange-600" />
          Gestion Foncier Urbain (ACD)
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Administrez les demandes d'Arrêté de Concession Définitive
        </p>
      </div>

      {/* KPI Stats */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-orange-600">{stats.total}</p>
              <p className="text-xs text-muted-foreground">Total dossiers</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-blue-600">{stats.byPhase.provisional}</p>
              <p className="text-xs text-muted-foreground">Phase 1 (ACP)</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-amber-600">{stats.byPhase.development}</p>
              <p className="text-xs text-muted-foreground">Phase 2 (Mise en valeur)</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-purple-600">{stats.byPhase.definitive}</p>
              <p className="text-xs text-muted-foreground">Phase 3 (ACD)</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-green-600">{stats.delivered}</p>
              <p className="text-xs text-muted-foreground">Titres délivrés</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Rechercher par n° dossier, commune, quartier, lot..."
                className="pl-9"
              />
            </div>
            <Select value={phaseFilter} onValueChange={setPhaseFilter}>
              <SelectTrigger className="w-full sm:w-[220px]">
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
              <SelectTrigger className="w-full sm:w-[220px]">
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

      {/* Results */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-orange-600" />
          <span className="ml-3 text-muted-foreground">Chargement des dossiers...</span>
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Building2 className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground">
              {hasFilters ? "Aucun dossier ne correspond aux filtres" : "Aucun dossier ACD enregistré"}
            </p>
            {hasFilters && (
              <Button variant="link" onClick={resetFilters} className="mt-2">
                Réinitialiser les filtres
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            {filtered.length} dossier{filtered.length > 1 ? "s" : ""} trouvé{filtered.length > 1 ? "s" : ""}
          </p>
          {filtered.map((app: any, i: number) => (
            <motion.div
              key={app.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
            >
              <Link href={`/admin/urban-acd/${app.id}`}>
                <Card className="cursor-pointer hover:border-orange-300 transition-colors">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-1">
                          <span className="font-mono text-sm font-semibold text-orange-700">
                            {app.applicationNumber || `ACD-${app.id}`}
                          </span>
                          <AcdStatusBadge status={app.status} />
                        </div>
                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                          {app.commune && (
                            <span>Commune : {app.commune}</span>
                          )}
                          {app.quartier && (
                            <span>Quartier : {app.quartier}</span>
                          )}
                          {app.lotNumber && (
                            <span>Lot n° {app.lotNumber}</span>
                          )}
                          {app.ilotNumber && (
                            <span>Îlot n° {app.ilotNumber}</span>
                          )}
                          <span className="text-xs">
                            Créé le {new Date(app.createdAt).toLocaleDateString("fr-FR")}
                          </span>
                        </div>
                      </div>
                      <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
