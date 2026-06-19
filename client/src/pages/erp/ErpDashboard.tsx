import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { useErpPermissions } from "@/hooks/useErpPermissions";
import { Link } from "wouter";
import {
  FolderKanban,
  GanttChart,
  FileText,
  ShieldCheck,
  Wrench,
  HardHat,
  Truck,
  Users,
  Package,
  DollarSign,
  Bell,
  ScrollText,
  AlertTriangle,
  Clock,
  CheckCircle2,
  TrendingUp,
  TrendingDown,
  Activity,
  BarChart3,
  Filter,
  RefreshCw,
  Eye,
  EyeOff,
  LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// ============================================================
// TYPES
// ============================================================

type Period = "today" | "week" | "month" | "quarter" | "year" | "all";

interface DashboardFilters {
  period: Period;
  projectId?: number;
  status?: string;
  responsibleId?: number;
}

// ============================================================
// MODULE CARDS (accès rapide)
// ============================================================

const MODULE_CARDS = [
  { module: "erp_projects", label: "Projets", icon: FolderKanban, href: "/erp/projects", color: "text-blue-500", bg: "bg-blue-50 dark:bg-blue-950/30" },
  { module: "erp_gantt", label: "Gantt", icon: GanttChart, href: "/erp/gantt", color: "text-indigo-500", bg: "bg-indigo-50 dark:bg-indigo-950/30" },
  { module: "erp_documents", label: "Documents", icon: FileText, href: "/erp/documents", color: "text-green-500", bg: "bg-green-50 dark:bg-green-950/30" },
  { module: "erp_compliance", label: "Conformité", icon: ShieldCheck, href: "/erp/compliance", color: "text-purple-500", bg: "bg-purple-50 dark:bg-purple-950/30" },
  { module: "erp_equipment", label: "Équipements", icon: Wrench, href: "/erp/equipment", color: "text-orange-500", bg: "bg-orange-50 dark:bg-orange-950/30" },
  { module: "erp_safety", label: "Sécurité", icon: HardHat, href: "/erp/safety", color: "text-red-500", bg: "bg-red-50 dark:bg-red-950/30" },
  { module: "erp_vendors", label: "Fournisseurs", icon: Truck, href: "/erp/vendors", color: "text-teal-500", bg: "bg-teal-50 dark:bg-teal-950/30" },
  { module: "erp_contractors", label: "Entrepreneurs", icon: Users, href: "/erp/contractors", color: "text-cyan-500", bg: "bg-cyan-50 dark:bg-cyan-950/30" },
  { module: "erp_inventory", label: "Inventaire", icon: Package, href: "/erp/inventory", color: "text-amber-500", bg: "bg-amber-50 dark:bg-amber-950/30" },
  { module: "erp_finance", label: "Finances", icon: DollarSign, href: "/erp/finance", color: "text-emerald-500", bg: "bg-emerald-50 dark:bg-emerald-950/30" },
  { module: "erp_alerts", label: "Alertes", icon: Bell, href: "/erp/alerts", color: "text-rose-500", bg: "bg-rose-50 dark:bg-rose-950/30" },
  { module: "erp_audit_logs", label: "Audit", icon: ScrollText, href: "/erp/audit-logs", color: "text-slate-500", bg: "bg-slate-50 dark:bg-slate-950/30" },
];

// ============================================================
// COMPOSANT PRINCIPAL
// ============================================================

export default function ErpDashboard() {
  const { canAccessModule, hasPermission, roles, isErpAdmin } = useErpPermissions();
  const [filters, setFilters] = useState<DashboardFilters>({ period: "month" });

  const canViewFinance = hasPermission("erp_finance", "view");

  // Requêtes dashboard
  const { data: summary, isLoading: summaryLoading, refetch: refetchSummary } = trpc.erp.dashboard.summary.useQuery(filters);
  const { data: alerts } = trpc.erp.dashboard.alerts.useQuery(filters);
  const { data: stats } = trpc.erp.admin.stats.useQuery();

  const accessibleModules = MODULE_CARDS.filter(m => canAccessModule(m.module));

  return (
    <div className="space-y-6">
      {/* Header + Filtres */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Dashboard ERP Construction</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Vue synthétique de l'activité — {roles.length} rôle{roles.length > 1 ? "s" : ""} actif{roles.length > 1 ? "s" : ""}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetchSummary()}
            className="gap-1"
          >
            <RefreshCw size={14} />
            Actualiser
          </Button>
        </div>
      </div>

      {/* Barre de filtres */}
      <FilterBar filters={filters} onFiltersChange={setFilters} />

      {/* KPI Cards — Projets */}
      <section>
        <SectionTitle icon={FolderKanban} title="Projets" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <KpiCard
            label="Projets actifs"
            value={summary?.projects.active ?? 0}
            icon={FolderKanban}
            color="text-blue-600"
            bg="bg-blue-50 dark:bg-blue-950/30"
          />
          <KpiCard
            label="En retard"
            value={summary?.projects.late ?? 0}
            icon={AlertTriangle}
            color="text-red-600"
            bg="bg-red-50 dark:bg-red-950/30"
            alert={!!summary?.projects.late}
          />
          <KpiCard
            label="Tâches ouvertes"
            value={summary?.projects.tasksOpen ?? 0}
            icon={Clock}
            color="text-amber-600"
            bg="bg-amber-50 dark:bg-amber-950/30"
          />
          <KpiCard
            label="Jalons critiques"
            value={summary?.projects.milestonesCritical ?? 0}
            icon={Activity}
            color="text-purple-600"
            bg="bg-purple-50 dark:bg-purple-950/30"
            alert={!!summary?.projects.milestonesCritical}
          />
        </div>
        {!summary?.projects.available && (
          <ModuleNotAvailable message="Module Projets en cours de développement" />
        )}
      </section>

      {/* KPI Cards — Conformité */}
      <section>
        <SectionTitle icon={ShieldCheck} title="Conformité & Documents" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <KpiCard
            label="Documents expirés"
            value={summary?.compliance.documentsExpired ?? 0}
            icon={FileText}
            color="text-orange-600"
            bg="bg-orange-50 dark:bg-orange-950/30"
            alert={!!summary?.compliance.documentsExpired}
          />
          <KpiCard
            label="Permis à renouveler"
            value={summary?.compliance.permitsToRenew ?? 0}
            icon={ShieldCheck}
            color="text-purple-600"
            bg="bg-purple-50 dark:bg-purple-950/30"
            alert={!!summary?.compliance.permitsToRenew}
          />
        </div>
        {!summary?.compliance.available && (
          <ModuleNotAvailable message="Module Conformité en cours de développement" />
        )}
      </section>

      {/* KPI Cards — Sécurité & Équipements */}
      <section>
        <SectionTitle icon={HardHat} title="Sécurité & Équipements" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <KpiCard
            label="Incidents récents"
            value={summary?.safety.recentIncidents ?? 0}
            icon={AlertTriangle}
            color="text-red-600"
            bg="bg-red-50 dark:bg-red-950/30"
            alert={!!summary?.safety.recentIncidents}
          />
          <KpiCard
            label="Équipements disponibles"
            value={summary?.equipment.available ?? 0}
            icon={CheckCircle2}
            color="text-green-600"
            bg="bg-green-50 dark:bg-green-950/30"
          />
          <KpiCard
            label="En maintenance"
            value={summary?.equipment.inMaintenance ?? 0}
            icon={Wrench}
            color="text-orange-600"
            bg="bg-orange-50 dark:bg-orange-950/30"
          />
        </div>
        {!summary?.safety.available && (
          <ModuleNotAvailable message="Modules Sécurité & Équipements en cours de développement" />
        )}
      </section>

      {/* KPI Cards — Inventaire */}
      <section>
        <SectionTitle icon={Package} title="Inventaire & Stocks" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <KpiCard
            label="Stocks critiques"
            value={summary?.inventory.criticalStock ?? 0}
            icon={Package}
            color="text-amber-600"
            bg="bg-amber-50 dark:bg-amber-950/30"
            alert={!!summary?.inventory.criticalStock}
          />
          <KpiCard
            label="Demandes en attente"
            value={summary?.inventory.pendingRequests ?? 0}
            icon={Clock}
            color="text-blue-600"
            bg="bg-blue-50 dark:bg-blue-950/30"
          />
        </div>
        {!summary?.inventory.available && (
          <ModuleNotAvailable message="Module Inventaire en cours de développement" />
        )}
      </section>

      {/* KPI Cards — Finance (masqué sans permission) */}
      {canViewFinance ? (
        <section>
          <SectionTitle icon={DollarSign} title="Finance" />
          {summary?.finance ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              <KpiCard
                label="Factures impayées"
                value={summary.finance.unpaidInvoices}
                icon={DollarSign}
                color="text-red-600"
                bg="bg-red-50 dark:bg-red-950/30"
                alert={!!summary.finance.unpaidInvoices}
              />
              <KpiCard
                label="Paiements récents"
                value={summary.finance.recentPayments}
                icon={CheckCircle2}
                color="text-green-600"
                bg="bg-green-50 dark:bg-green-950/30"
              />
              <KpiCard
                label="Budget consommé"
                value={`${summary.finance.budgetConsumedPercent}%`}
                icon={BarChart3}
                color="text-blue-600"
                bg="bg-blue-50 dark:bg-blue-950/30"
              />
              <KpiCard
                label="Cash Flow"
                value={summary.finance.cashFlow}
                icon={TrendingUp}
                color="text-emerald-600"
                bg="bg-emerald-50 dark:bg-emerald-950/30"
                format="currency"
              />
              <KpiCard
                label="Rentabilité"
                value={`${summary.finance.profitability}%`}
                icon={TrendingUp}
                color="text-teal-600"
                bg="bg-teal-50 dark:bg-teal-950/30"
              />
              <KpiCard
                label="Alertes budget"
                value={summary.finance.budgetAlerts}
                icon={AlertTriangle}
                color="text-orange-600"
                bg="bg-orange-50 dark:bg-orange-950/30"
                alert={!!summary.finance.budgetAlerts}
              />
            </div>
          ) : null}
          {summary?.finance && !summary.finance.available && (
            <ModuleNotAvailable message="Module Finance en cours de développement" />
          )}
        </section>
      ) : (
        <section>
          <div className="flex items-center gap-2 text-muted-foreground py-3 px-4 bg-muted/50 rounded-lg">
            <EyeOff size={16} />
            <span className="text-sm">Données financières masquées — permission requise : <code className="text-xs">erp_finance.view</code></span>
          </div>
        </section>
      )}

      {/* Alertes critiques */}
      {alerts && alerts.summary.critical > 0 && (
        <section>
          <SectionTitle icon={Bell} title="Alertes Critiques" />
          <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900 rounded-lg p-4">
            <div className="flex items-center gap-2 text-red-700 dark:text-red-400">
              <AlertTriangle size={18} />
              <span className="font-medium">{alerts.summary.critical} alerte{alerts.summary.critical > 1 ? "s" : ""} critique{alerts.summary.critical > 1 ? "s" : ""}</span>
            </div>
            {alerts.alerts.filter(a => a.type === "critical").map(alert => (
              <div key={alert.id} className="mt-2 text-sm text-red-600 dark:text-red-300">
                [{alert.module}] {alert.title}: {alert.description}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Modules accessibles */}
      <section>
        <SectionTitle icon={BarChart3} title="Accès rapide aux modules" />
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
          {accessibleModules.map(mod => (
            <Link key={mod.module} href={mod.href}>
              <div className={`${mod.bg} border border-border rounded-lg p-3 hover:border-primary/50 hover:shadow-sm transition-all cursor-pointer group text-center`}>
                <mod.icon className={`${mod.color} mx-auto group-hover:scale-110 transition-transform`} size={22} />
                <p className="text-xs font-medium mt-2">{mod.label}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Bouton seed pour admin */}
      {isErpAdmin() && <SeedButton />}
    </div>
  );
}

// ============================================================
// COMPOSANTS UTILITAIRES
// ============================================================

function FilterBar({ filters, onFiltersChange }: { filters: DashboardFilters; onFiltersChange: (f: DashboardFilters) => void }) {
  return (
    <Card>
      <CardContent className="py-3 px-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Filter size={14} />
            <span className="text-xs font-medium">Filtres</span>
          </div>

          <Select
            value={filters.period}
            onValueChange={(val) => onFiltersChange({ ...filters, period: val as Period })}
          >
            <SelectTrigger className="w-[140px] h-8 text-xs">
              <SelectValue placeholder="Période" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">Aujourd'hui</SelectItem>
              <SelectItem value="week">Cette semaine</SelectItem>
              <SelectItem value="month">Ce mois</SelectItem>
              <SelectItem value="quarter">Ce trimestre</SelectItem>
              <SelectItem value="year">Cette année</SelectItem>
              <SelectItem value="all">Tout</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={filters.status || "all_statuses"}
            onValueChange={(val) => onFiltersChange({ ...filters, status: val === "all_statuses" ? undefined : val })}
          >
            <SelectTrigger className="w-[140px] h-8 text-xs">
              <SelectValue placeholder="Statut" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all_statuses">Tous statuts</SelectItem>
              <SelectItem value="active">Actif</SelectItem>
              <SelectItem value="on_hold">En pause</SelectItem>
              <SelectItem value="completed">Terminé</SelectItem>
              <SelectItem value="cancelled">Annulé</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardContent>
    </Card>
  );
}

function SectionTitle({ icon: Icon, title }: { icon: LucideIcon; title: string }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <Icon size={16} className="text-muted-foreground" />
      <h2 className="text-sm font-semibold">{title}</h2>
    </div>
  );
}

function KpiCard({
  label,
  value,
  icon: Icon,
  color,
  bg,
  alert = false,
  format,
}: {
  label: string;
  value: number | string;
  icon: LucideIcon;
  color: string;
  bg: string;
  alert?: boolean;
  format?: "currency";
}) {
  const displayValue = format === "currency"
    ? `${Number(value).toLocaleString("fr-FR")} FCFA`
    : value;

  return (
    <div className={`${bg} rounded-lg p-3 border ${alert ? "border-red-300 dark:border-red-800" : "border-transparent"}`}>
      <div className="flex items-center justify-between">
        <Icon size={16} className={color} />
        {alert && <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />}
      </div>
      <p className="text-xl font-bold mt-2">{displayValue}</p>
      <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
    </div>
  );
}

function ModuleNotAvailable({ message }: { message: string }) {
  return (
    <div className="flex items-center gap-2 text-muted-foreground mt-2 text-xs bg-muted/30 rounded px-3 py-1.5">
      <Clock size={12} />
      <span>{message}</span>
    </div>
  );
}

function SeedButton() {
  const utils = trpc.useUtils();
  const seed = trpc.erp.admin.seed.useMutation({
    onSuccess: () => {
      utils.erp.admin.stats.invalidate();
      utils.erp.roles.list.invalidate();
      utils.erp.permissions.list.invalidate();
    },
  });

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">Administration ERP</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-xs text-muted-foreground mb-3">
          Initialiser les rôles et permissions ERP par défaut (opération idempotente).
        </p>
        <Button
          onClick={() => seed.mutate()}
          disabled={seed.isPending}
          size="sm"
          variant="outline"
        >
          {seed.isPending ? "Initialisation..." : "Seed ERP RBAC"}
        </Button>
        {seed.data && (
          <p className="text-xs text-green-600 mt-2">
            ✓ {seed.data.rolesCreated} rôles et {seed.data.permissionsCreated} permissions créés
          </p>
        )}
      </CardContent>
    </Card>
  );
}
