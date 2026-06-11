import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { FileCheck, MapPin, Shield, Users, QrCode, Activity, Landmark, Banknote, TrendingUp, Clock, XCircle, Filter, CalendarDays, RotateCcw } from "lucide-react";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, PieChart, Pie, Cell } from "recharts";

const STAT_CARDS = [
  { key: "users", label: "Utilisateurs", icon: Users, color: "text-ci-green bg-ci-green-light" },
  { key: "parcels", label: "Parcelles", icon: MapPin, color: "text-ci-orange bg-ci-orange-light" },
  { key: "attestations", label: "Attestations", icon: FileCheck, color: "text-purple-600 bg-purple-50" },
  { key: "verifyTokens", label: "Tokens Verify", icon: QrCode, color: "text-blue-600 bg-blue-50" },
  { key: "auditEvents", label: "Événements Audit", icon: Shield, color: "text-red-600 bg-red-50" },
] as const;

const STATUS_COLORS: Record<string, string> = {
  cf_draft: "#94a3b8",
  cf_submitted: "#3b82f6",
  cf_enquiry: "#8b5cf6",
  cf_delimitation: "#f59e0b",
  cf_opposition_period: "#ef4444",
  cf_validation: "#10b981",
  cf_approved: "#059669",
  cf_rejected: "#dc2626",
  cf_delivered: "#047857",
  cf_pending_payment: "#d97706",
  tf_requested: "#6366f1",
  tf_survey: "#a855f7",
  tf_registration: "#ec4899",
  tf_publication: "#14b8a6",
  tf_signing: "#0ea5e9",
  tf_delivered: "#065f46",
  tf_rejected: "#b91c1c",
  DRAFT: "#94a3b8",
  DOCS_PENDING: "#f59e0b",
  SUBMITTED: "#3b82f6",
  UNDER_REVIEW: "#8b5cf6",
  OFFERED: "#ec4899",
  ACCEPTED: "#10b981",
  APPROVED: "#059669",
  REJECTED: "#dc2626",
  CLOSED: "#6b7280",
};

const STATUS_LABELS: Record<string, string> = {
  cf_draft: "Brouillon",
  cf_submitted: "Soumis",
  cf_enquiry: "Enquête",
  cf_delimitation: "Délimitation",
  cf_opposition_period: "Opposition",
  cf_validation: "Validation",
  cf_approved: "Approuvé",
  cf_rejected: "Rejeté",
  cf_delivered: "CF Délivré",
  cf_pending_payment: "Paiement",
  tf_requested: "Demandé",
  tf_survey: "Bornage",
  tf_registration: "Enregistrement",
  tf_publication: "Publication",
  tf_signing: "Signature",
  tf_delivered: "TF Délivré",
  tf_rejected: "TF Rejeté",
  DRAFT: "Brouillon",
  DOCS_PENDING: "Docs manquants",
  SUBMITTED: "Soumis",
  UNDER_REVIEW: "En revue",
  OFFERED: "Offre émise",
  ACCEPTED: "Accepté",
  APPROVED: "Approuvé",
  REJECTED: "Rejeté",
  CLOSED: "Clôturé",
};

const PERIOD_OPTIONS = [
  { value: "all", label: "Toute période" },
  { value: "7d", label: "7 derniers jours" },
  { value: "30d", label: "30 derniers jours" },
  { value: "90d", label: "3 derniers mois" },
  { value: "180d", label: "6 derniers mois" },
  { value: "365d", label: "12 derniers mois" },
];

function periodToRange(period: string): { dateFrom?: number; dateTo?: number } {
  if (period === "all") return {};
  const days = parseInt(period.replace("d", ""));
  const now = Date.now();
  return { dateFrom: now - days * 86400000, dateTo: now };
}

export default function AdminDashboard() {
  const [period, setPeriod] = useState("all");
  const [region, setRegion] = useState("all");
  const [operator, setOperator] = useState("all");

  const filters = useMemo(() => {
    const range = periodToRange(period);
    return {
      ...range,
      ...(region !== "all" ? { region } : {}),
      ...(operator !== "all" ? { operatorName: operator } : {}),
    };
  }, [period, region, operator]);

  const creditFilters = useMemo(() => {
    const range = periodToRange(period);
    return range.dateFrom ? { dateFrom: range.dateFrom, dateTo: range.dateTo } : undefined;
  }, [period]);

  const hasFilters = period !== "all" || region !== "all" || operator !== "all";

  const { data: stats, isLoading } = trpc.admin.dashboardStats.useQuery();
  const { data: statusDist } = trpc.admin.parcelStatusDistribution.useQuery();
  const { data: filterOptions } = trpc.admin.dashboardFilterOptions.useQuery();
  const { data: ltDist } = trpc.admin.landTitleStatusDistribution.useQuery(
    Object.keys(filters).length > 0 ? filters : undefined
  );
  const { data: ltStats } = trpc.admin.landTitleStats.useQuery(
    Object.keys(filters).length > 0 ? filters : undefined
  );
  const { data: creditDist } = trpc.admin.creditStatusDistribution.useQuery(creditFilters);
  const { data: creditStats } = trpc.admin.creditStats.useQuery(creditFilters);

  const resetFilters = () => {
    setPeriod("all");
    setRegion("all");
    setOperator("all");
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Tableau de bord</h1>
        <p className="text-muted-foreground text-sm mt-1">Vue d'ensemble de la plateforme Foncier225</p>
      </div>

      {/* Filter Bar */}
      <div className="rounded-lg border bg-card p-4">
        <div className="flex items-center gap-2 mb-3">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Filtres</span>
          {hasFilters && (
            <Button variant="ghost" size="sm" onClick={resetFilters} className="ml-auto h-7 text-xs gap-1">
              <RotateCcw className="h-3 w-3" />
              Réinitialiser
            </Button>
          )}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Period Filter */}
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground flex items-center gap-1">
              <CalendarDays className="h-3 w-3" />
              Période
            </label>
            <Select value={period} onValueChange={setPeriod}>
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PERIOD_OPTIONS.map(opt => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Region Filter */}
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              Région
            </label>
            <Select value={region} onValueChange={setRegion}>
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes les régions</SelectItem>
                {filterOptions?.regions.map(r => (
                  <SelectItem key={r} value={r}>{r}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Operator Filter */}
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground flex items-center gap-1">
              <Users className="h-3 w-3" />
              Opérateur
            </label>
            <Select value={operator} onValueChange={setOperator}>
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les opérateurs</SelectItem>
                {filterOptions?.operators.map(o => (
                  <SelectItem key={o} value={o}>{o}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        {hasFilters && (
          <p className="text-xs text-muted-foreground mt-2 pt-2 border-t">
            Les statistiques ci-dessous sont filtrées selon vos critères. Les KPI généraux (utilisateurs, parcelles, attestations) ne sont pas affectés par les filtres.
          </p>
        )}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {STAT_CARDS.map(card => (
          <div key={card.key} className="rounded-lg border bg-card p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className={`h-9 w-9 rounded-lg flex items-center justify-center ${card.color}`}>
                <card.icon className="h-4.5 w-4.5" />
              </div>
              <span className="text-sm text-muted-foreground">{card.label}</span>
            </div>
            {isLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <span className="text-2xl font-bold">
                {stats?.[card.key]?.toLocaleString("fr-FR") ?? 0}
              </span>
            )}
          </div>
        ))}
      </div>

      {/* Land Title & Credit KPI Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          icon={Landmark}
          label="Dossiers Titre Foncier"
          value={ltStats?.total}
          color="text-indigo-600 bg-indigo-50"
        />
        <KpiCard
          icon={XCircle}
          label="Taux de rejet TF"
          value={ltStats && ltStats.total > 0 ? `${((ltStats.rejected / ltStats.total) * 100).toFixed(1)}%` : "0%"}
          color="text-red-600 bg-red-50"
        />
        <KpiCard
          icon={Banknote}
          label="Dossiers Crédit"
          value={creditStats?.total}
          color="text-emerald-600 bg-emerald-50"
        />
        <KpiCard
          icon={Clock}
          label="Délai moyen TF"
          value={ltStats ? `${ltStats.avgProcessingDays}j` : "—"}
          color="text-amber-600 bg-amber-50"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Land Title Status Distribution */}
        <div className="rounded-lg border bg-card p-6">
          <h2 className="font-semibold mb-4 flex items-center gap-2">
            <Landmark className="h-4 w-4 text-indigo-600" />
            Titre Foncier — Répartition par statut
          </h2>
          {ltDist && ltDist.length > 0 ? (
            <ChartContainer config={{}} className="h-[250px] w-full">
              <BarChart data={ltDist.map((d: any) => ({ name: STATUS_LABELS[d.status] || d.status, count: d.count, fill: STATUS_COLORS[d.status] || "#6b7280" }))}>
                <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-30} textAnchor="end" height={60} />
                <YAxis allowDecimals={false} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {ltDist.map((d: any, i: number) => (
                    <Cell key={i} fill={STATUS_COLORS[d.status] || "#6b7280"} />
                  ))}
                </Bar>
              </BarChart>
            </ChartContainer>
          ) : (
            <p className="text-sm text-muted-foreground">Aucun dossier titre foncier{hasFilters ? " pour ces critères" : ""}.</p>
          )}
        </div>

        {/* Credit Status Distribution */}
        <div className="rounded-lg border bg-card p-6">
          <h2 className="font-semibold mb-4 flex items-center gap-2">
            <Banknote className="h-4 w-4 text-emerald-600" />
            Crédit Habitat — Répartition par statut
          </h2>
          {creditDist && creditDist.length > 0 ? (
            <ChartContainer config={{}} className="h-[250px] w-full">
              <PieChart>
                <Pie
                  data={creditDist.map((d: any) => ({ name: STATUS_LABELS[d.status] || d.status, value: d.count, fill: STATUS_COLORS[d.status] || "#6b7280" }))}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={90}
                  label={({ name, percent }: any) => `${name} ${(percent * 100).toFixed(0)}%`}
                  labelLine={false}
                >
                  {creditDist.map((d: any, i: number) => (
                    <Cell key={i} fill={STATUS_COLORS[d.status] || "#6b7280"} />
                  ))}
                </Pie>
                <ChartTooltip content={<ChartTooltipContent />} />
              </PieChart>
            </ChartContainer>
          ) : (
            <p className="text-sm text-muted-foreground">Aucun dossier crédit habitat{hasFilters ? " pour ces critères" : ""}.</p>
          )}
        </div>
      </div>

      {/* Credit Detailed Stats */}
      {creditStats && creditStats.total > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="rounded-lg border bg-card p-5">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="h-4 w-4 text-emerald-600" />
              <span className="text-sm text-muted-foreground">Taux d'approbation</span>
            </div>
            <span className="text-2xl font-bold text-emerald-700">
              {((creditStats.approved / creditStats.total) * 100).toFixed(1)}%
            </span>
          </div>
          <div className="rounded-lg border bg-card p-5">
            <div className="flex items-center gap-2 mb-2">
              <XCircle className="h-4 w-4 text-red-600" />
              <span className="text-sm text-muted-foreground">Taux de rejet crédit</span>
            </div>
            <span className="text-2xl font-bold text-red-700">
              {((creditStats.rejected / creditStats.total) * 100).toFixed(1)}%
            </span>
          </div>
          <div className="rounded-lg border bg-card p-5">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="h-4 w-4 text-amber-600" />
              <span className="text-sm text-muted-foreground">Délai moyen crédit</span>
            </div>
            <span className="text-2xl font-bold text-amber-700">
              {creditStats.avgProcessingDays} jours
            </span>
          </div>
        </div>
      )}

      {/* Parcel Status Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-lg border bg-card p-6">
          <h2 className="font-semibold mb-4 flex items-center gap-2">
            <Activity className="h-4 w-4 text-ci-green" />
            Parcelles — Distribution des statuts
          </h2>
          {statusDist && statusDist.length > 0 ? (
            <div className="space-y-3">
              {statusDist.map((item: any) => {
                const total = statusDist.reduce((s: number, i: any) => s + (i.count || 0), 0);
                const pct = total > 0 ? ((item.count / total) * 100).toFixed(1) : "0";
                return (
                  <div key={item.status} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="capitalize">{(item.status || "").replace(/_/g, " ")}</span>
                      <span className="font-medium">{item.count} ({pct}%)</span>
                    </div>
                    <div className="h-2 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full rounded-full bg-ci-green transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Aucune parcelle enregistrée.</p>
          )}
        </div>

        <div className="rounded-lg border bg-card p-6">
          <h2 className="font-semibold mb-4 flex items-center gap-2">
            <Shield className="h-4 w-4 text-ci-orange" />
            Sécurité
          </h2>
          <div className="space-y-4">
            <SecurityItem label="Zéro PII en public" status="active" />
            <SecurityItem label="Rate limiting actif" status="active" />
            <SecurityItem label="Audit trail complet" status="active" />
            <SecurityItem label="Tokens SHA-256" status="active" />
            <SecurityItem label="RBAC multi-rôles" status="active" />
          </div>
        </div>
      </div>
    </div>
  );
}

function KpiCard({ icon: Icon, label, value, color }: { icon: any; label: string; value: any; color: string }) {
  return (
    <div className="rounded-lg border bg-card p-5">
      <div className="flex items-center gap-3 mb-3">
        <div className={`h-9 w-9 rounded-lg flex items-center justify-center ${color}`}>
          <Icon className="h-4.5 w-4.5" />
        </div>
        <span className="text-sm text-muted-foreground">{label}</span>
      </div>
      <span className="text-2xl font-bold">
        {value !== undefined && value !== null ? value.toLocaleString?.("fr-FR") ?? value : "—"}
      </span>
    </div>
  );
}

function SecurityItem({ label, status }: { label: string; status: string }) {
  return (
    <div className="flex items-center justify-between py-1">
      <span className="text-sm">{label}</span>
      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
        status === "active" ? "bg-green-50 text-green-700" : "bg-yellow-50 text-yellow-700"
      }`}>
        {status === "active" ? "Actif" : "En attente"}
      </span>
    </div>
  );
}
