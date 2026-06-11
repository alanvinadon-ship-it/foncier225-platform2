import { useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Skeleton } from "@/components/ui/skeleton";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, PieChart, Pie, Cell, Legend, ResponsiveContainer, CartesianGrid } from "recharts";
import {
  Building2,
  TreePine,
  TrendingUp,
  Clock,
  CheckCircle2,
  XCircle,
  BarChart3,
  ArrowRight,
  Activity,
} from "lucide-react";
import { Link } from "wouter";

const RURAL_COLOR = "#059669"; // emerald-600
const URBAN_COLOR = "#7c3aed"; // violet-600
const RURAL_LIGHT = "#d1fae5"; // emerald-100
const URBAN_LIGHT = "#ede9fe"; // violet-100
const COMPLETED_COLOR = "#10b981";
const REJECTED_COLOR = "#ef4444";
const IN_PROGRESS_COLOR = "#f59e0b";

const MONTH_LABELS: Record<string, string> = {
  "01": "Jan", "02": "Fév", "03": "Mar", "04": "Avr",
  "05": "Mai", "06": "Juin", "07": "Juil", "08": "Août",
  "09": "Sep", "10": "Oct", "11": "Nov", "12": "Déc",
};

function formatMonth(ym: string): string {
  const [year, month] = ym.split("-");
  return `${MONTH_LABELS[month] || month} ${year?.slice(2)}`;
}

export default function UnifiedDashboard() {
  const { data, isLoading } = trpc.admin.unifiedDashboardStats.useQuery();

  const pieData = useMemo(() => {
    if (!data) return [];
    return [
      { name: "Rural (CF)", value: data.rural.total, fill: RURAL_COLOR },
      { name: "Urbain (ACD)", value: data.urban.total, fill: URBAN_COLOR },
    ];
  }, [data]);

  const monthlyData = useMemo(() => {
    if (!data) return [];
    return data.monthlyComparison.map(m => ({
      month: formatMonth(m.month),
      Rural: m.rural,
      Urbain: m.urban,
    }));
  }, [data]);

  const delayData = useMemo(() => {
    if (!data) return [];
    return [
      { name: "Certificat Foncier (Rural)", days: data.rural.avgProcessingDays, fill: RURAL_COLOR },
      { name: "ACD (Urbain)", days: data.urban.avgProcessingDays, fill: URBAN_COLOR },
    ];
  }, [data]);

  const statusComparisonData = useMemo(() => {
    if (!data) return [];
    return [
      {
        name: "Complétés",
        Rural: data.rural.completed,
        Urbain: data.urban.completed,
      },
      {
        name: "En cours",
        Rural: data.rural.inProgress,
        Urbain: data.urban.inProgress,
      },
      {
        name: "Rejetés",
        Rural: data.rural.rejected,
        Urbain: data.urban.rejected,
      },
    ];
  }, [data]);

  const totalDossiers = (data?.rural.total ?? 0) + (data?.urban.total ?? 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <BarChart3 className="h-6 w-6 text-ci-green" />
            Tableau de bord unifié
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Vue comparative des procédures foncières rurales et urbaines
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/admin" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
            Dashboard principal <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      </div>

      {/* KPI Cards - Comparative */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total dossiers */}
        <div className="rounded-lg border bg-card p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="h-9 w-9 rounded-lg flex items-center justify-center bg-blue-50 text-blue-600">
              <Activity className="h-4.5 w-4.5" />
            </div>
            <span className="text-sm text-muted-foreground">Total dossiers</span>
          </div>
          {isLoading ? (
            <Skeleton className="h-8 w-20" />
          ) : (
            <div>
              <span className="text-2xl font-bold">{totalDossiers.toLocaleString("fr-FR")}</span>
              <div className="flex gap-3 mt-2 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: RURAL_COLOR }} />
                  Rural: {data?.rural.total ?? 0}
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: URBAN_COLOR }} />
                  Urbain: {data?.urban.total ?? 0}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Taux de complétion */}
        <div className="rounded-lg border bg-card p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="h-9 w-9 rounded-lg flex items-center justify-center bg-emerald-50 text-emerald-600">
              <CheckCircle2 className="h-4.5 w-4.5" />
            </div>
            <span className="text-sm text-muted-foreground">Taux de complétion</span>
          </div>
          {isLoading ? (
            <Skeleton className="h-8 w-20" />
          ) : (
            <div>
              <div className="flex items-baseline gap-3">
                <div>
                  <span className="text-lg font-bold" style={{ color: RURAL_COLOR }}>{data?.rural.completionRate ?? 0}%</span>
                  <span className="text-xs text-muted-foreground ml-1">Rural</span>
                </div>
                <div>
                  <span className="text-lg font-bold" style={{ color: URBAN_COLOR }}>{data?.urban.completionRate ?? 0}%</span>
                  <span className="text-xs text-muted-foreground ml-1">Urbain</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Délais moyens */}
        <div className="rounded-lg border bg-card p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="h-9 w-9 rounded-lg flex items-center justify-center bg-amber-50 text-amber-600">
              <Clock className="h-4.5 w-4.5" />
            </div>
            <span className="text-sm text-muted-foreground">Délais moyens</span>
          </div>
          {isLoading ? (
            <Skeleton className="h-8 w-20" />
          ) : (
            <div>
              <div className="flex items-baseline gap-3">
                <div>
                  <span className="text-lg font-bold" style={{ color: RURAL_COLOR }}>{data?.rural.avgProcessingDays ?? 0}j</span>
                  <span className="text-xs text-muted-foreground ml-1">Rural</span>
                </div>
                <div>
                  <span className="text-lg font-bold" style={{ color: URBAN_COLOR }}>{data?.urban.avgProcessingDays ?? 0}j</span>
                  <span className="text-xs text-muted-foreground ml-1">Urbain</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Taux de rejet */}
        <div className="rounded-lg border bg-card p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="h-9 w-9 rounded-lg flex items-center justify-center bg-red-50 text-red-600">
              <XCircle className="h-4.5 w-4.5" />
            </div>
            <span className="text-sm text-muted-foreground">Taux de rejet</span>
          </div>
          {isLoading ? (
            <Skeleton className="h-8 w-20" />
          ) : (
            <div>
              <div className="flex items-baseline gap-3">
                <div>
                  <span className="text-lg font-bold" style={{ color: RURAL_COLOR }}>
                    {data && data.rural.total > 0 ? ((data.rural.rejected / data.rural.total) * 100).toFixed(1) : "0"}%
                  </span>
                  <span className="text-xs text-muted-foreground ml-1">Rural</span>
                </div>
                <div>
                  <span className="text-lg font-bold" style={{ color: URBAN_COLOR }}>
                    {data && data.urban.total > 0 ? ((data.urban.rejected / data.urban.total) * 100).toFixed(1) : "0"}%
                  </span>
                  <span className="text-xs text-muted-foreground ml-1">Urbain</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Detailed comparison cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Rural Card */}
        <div className="rounded-lg border bg-card p-5" style={{ borderLeftColor: RURAL_COLOR, borderLeftWidth: 4 }}>
          <div className="flex items-center gap-2 mb-4">
            <TreePine className="h-5 w-5" style={{ color: RURAL_COLOR }} />
            <h3 className="font-semibold">Foncier Rural — Certificat Foncier</h3>
          </div>
          {isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <StatItem label="Total dossiers" value={data?.rural.total ?? 0} />
              <StatItem label="Complétés" value={data?.rural.completed ?? 0} color={COMPLETED_COLOR} />
              <StatItem label="En cours" value={data?.rural.inProgress ?? 0} color={IN_PROGRESS_COLOR} />
              <StatItem label="Rejetés" value={data?.rural.rejected ?? 0} color={REJECTED_COLOR} />
              <StatItem label="Délai moyen" value={`${data?.rural.avgProcessingDays ?? 0} jours`} />
              <StatItem label="Taux complétion" value={`${data?.rural.completionRate ?? 0}%`} color={COMPLETED_COLOR} />
            </div>
          )}
        </div>

        {/* Urban Card */}
        <div className="rounded-lg border bg-card p-5" style={{ borderLeftColor: URBAN_COLOR, borderLeftWidth: 4 }}>
          <div className="flex items-center gap-2 mb-4">
            <Building2 className="h-5 w-5" style={{ color: URBAN_COLOR }} />
            <h3 className="font-semibold">Foncier Urbain — ACD</h3>
          </div>
          {isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <StatItem label="Total dossiers" value={data?.urban.total ?? 0} />
              <StatItem label="Complétés" value={data?.urban.completed ?? 0} color={COMPLETED_COLOR} />
              <StatItem label="En cours" value={data?.urban.inProgress ?? 0} color={IN_PROGRESS_COLOR} />
              <StatItem label="Rejetés" value={data?.urban.rejected ?? 0} color={REJECTED_COLOR} />
              <StatItem label="Délai moyen" value={`${data?.urban.avgProcessingDays ?? 0} jours`} />
              <StatItem label="Taux complétion" value={`${data?.urban.completionRate ?? 0}%`} color={COMPLETED_COLOR} />
            </div>
          )}
        </div>
      </div>

      {/* Charts Row 1: Monthly comparison + Pie */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Monthly Bar Chart */}
        <div className="rounded-lg border bg-card p-6 lg:col-span-2">
          <h2 className="font-semibold mb-4 flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-blue-600" />
            Dossiers créés par mois (12 derniers mois)
          </h2>
          {monthlyData.length > 0 ? (
            <ChartContainer config={{}} className="h-[280px] w-full">
              <BarChart data={monthlyData} barGap={2}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Legend />
                <Bar dataKey="Rural" fill={RURAL_COLOR} radius={[3, 3, 0, 0]} />
                <Bar dataKey="Urbain" fill={URBAN_COLOR} radius={[3, 3, 0, 0]} />
              </BarChart>
            </ChartContainer>
          ) : (
            <div className="h-[280px] flex items-center justify-center">
              <p className="text-sm text-muted-foreground">Aucune donnée mensuelle disponible.</p>
            </div>
          )}
        </div>

        {/* Pie Chart - Global distribution */}
        <div className="rounded-lg border bg-card p-6">
          <h2 className="font-semibold mb-4 flex items-center gap-2">
            <Activity className="h-4 w-4 text-ci-green" />
            Répartition globale
          </h2>
          {totalDossiers > 0 ? (
            <ChartContainer config={{}} className="h-[280px] w-full">
              <PieChart>
                <Pie
                  data={pieData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={90}
                  label={({ name, percent }: any) => `${name} ${(percent * 100).toFixed(0)}%`}
                  labelLine={false}
                >
                  {pieData.map((entry, i) => (
                    <Cell key={i} fill={entry.fill} />
                  ))}
                </Pie>
                <ChartTooltip content={<ChartTooltipContent />} />
              </PieChart>
            </ChartContainer>
          ) : (
            <div className="h-[280px] flex items-center justify-center">
              <p className="text-sm text-muted-foreground">Aucun dossier enregistré.</p>
            </div>
          )}
        </div>
      </div>

      {/* Charts Row 2: Delay comparison + Status comparison */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Delay Bar Chart */}
        <div className="rounded-lg border bg-card p-6">
          <h2 className="font-semibold mb-4 flex items-center gap-2">
            <Clock className="h-4 w-4 text-amber-600" />
            Délais moyens de traitement (jours)
          </h2>
          {data && (data.rural.avgProcessingDays > 0 || data.urban.avgProcessingDays > 0) ? (
            <ChartContainer config={{}} className="h-[220px] w-full">
              <BarChart data={delayData} layout="vertical" barSize={32}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis type="number" unit="j" />
                <YAxis type="category" dataKey="name" width={160} tick={{ fontSize: 12 }} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="days" radius={[0, 4, 4, 0]}>
                  {delayData.map((entry, i) => (
                    <Cell key={i} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ChartContainer>
          ) : (
            <div className="h-[220px] flex items-center justify-center">
              <p className="text-sm text-muted-foreground">Aucune donnée de délai disponible.</p>
            </div>
          )}
        </div>

        {/* Status Comparison */}
        <div className="rounded-lg border bg-card p-6">
          <h2 className="font-semibold mb-4 flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            Comparaison par statut
          </h2>
          {data && totalDossiers > 0 ? (
            <ChartContainer config={{}} className="h-[220px] w-full">
              <BarChart data={statusComparisonData} barGap={4}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis allowDecimals={false} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Legend />
                <Bar dataKey="Rural" fill={RURAL_COLOR} radius={[3, 3, 0, 0]} />
                <Bar dataKey="Urbain" fill={URBAN_COLOR} radius={[3, 3, 0, 0]} />
              </BarChart>
            </ChartContainer>
          ) : (
            <div className="h-[220px] flex items-center justify-center">
              <p className="text-sm text-muted-foreground">Aucune donnée disponible.</p>
            </div>
          )}
        </div>
      </div>

      {/* Summary Table */}
      <div className="rounded-lg border bg-card p-6">
        <h2 className="font-semibold mb-4">Tableau récapitulatif</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left py-3 px-4 font-medium text-muted-foreground">Indicateur</th>
                <th className="text-center py-3 px-4 font-medium" style={{ color: RURAL_COLOR }}>
                  <span className="flex items-center justify-center gap-1">
                    <TreePine className="h-3.5 w-3.5" /> Rural (CF)
                  </span>
                </th>
                <th className="text-center py-3 px-4 font-medium" style={{ color: URBAN_COLOR }}>
                  <span className="flex items-center justify-center gap-1">
                    <Building2 className="h-3.5 w-3.5" /> Urbain (ACD)
                  </span>
                </th>
                <th className="text-center py-3 px-4 font-medium text-muted-foreground">Total</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b">
                <td className="py-3 px-4">Nombre total de dossiers</td>
                <td className="py-3 px-4 text-center font-medium">{data?.rural.total ?? 0}</td>
                <td className="py-3 px-4 text-center font-medium">{data?.urban.total ?? 0}</td>
                <td className="py-3 px-4 text-center font-bold">{totalDossiers}</td>
              </tr>
              <tr className="border-b">
                <td className="py-3 px-4">Dossiers complétés</td>
                <td className="py-3 px-4 text-center font-medium text-emerald-600">{data?.rural.completed ?? 0}</td>
                <td className="py-3 px-4 text-center font-medium text-emerald-600">{data?.urban.completed ?? 0}</td>
                <td className="py-3 px-4 text-center font-bold text-emerald-600">
                  {(data?.rural.completed ?? 0) + (data?.urban.completed ?? 0)}
                </td>
              </tr>
              <tr className="border-b">
                <td className="py-3 px-4">Dossiers en cours</td>
                <td className="py-3 px-4 text-center font-medium text-amber-600">{data?.rural.inProgress ?? 0}</td>
                <td className="py-3 px-4 text-center font-medium text-amber-600">{data?.urban.inProgress ?? 0}</td>
                <td className="py-3 px-4 text-center font-bold text-amber-600">
                  {(data?.rural.inProgress ?? 0) + (data?.urban.inProgress ?? 0)}
                </td>
              </tr>
              <tr className="border-b">
                <td className="py-3 px-4">Dossiers rejetés</td>
                <td className="py-3 px-4 text-center font-medium text-red-600">{data?.rural.rejected ?? 0}</td>
                <td className="py-3 px-4 text-center font-medium text-red-600">{data?.urban.rejected ?? 0}</td>
                <td className="py-3 px-4 text-center font-bold text-red-600">
                  {(data?.rural.rejected ?? 0) + (data?.urban.rejected ?? 0)}
                </td>
              </tr>
              <tr className="border-b">
                <td className="py-3 px-4">Taux de complétion</td>
                <td className="py-3 px-4 text-center font-medium">{data?.rural.completionRate ?? 0}%</td>
                <td className="py-3 px-4 text-center font-medium">{data?.urban.completionRate ?? 0}%</td>
                <td className="py-3 px-4 text-center font-bold">
                  {totalDossiers > 0
                    ? (((data?.rural.completed ?? 0) + (data?.urban.completed ?? 0)) / totalDossiers * 100).toFixed(1)
                    : "0"}%
                </td>
              </tr>
              <tr>
                <td className="py-3 px-4">Délai moyen de traitement</td>
                <td className="py-3 px-4 text-center font-medium">{data?.rural.avgProcessingDays ?? 0} jours</td>
                <td className="py-3 px-4 text-center font-medium">{data?.urban.avgProcessingDays ?? 0} jours</td>
                <td className="py-3 px-4 text-center font-bold">—</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function StatItem({ label, value, color }: { label: string; value: string | number; color?: string }) {
  return (
    <div className="py-1">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-semibold" style={color ? { color } : undefined}>
        {typeof value === "number" ? value.toLocaleString("fr-FR") : value}
      </p>
    </div>
  );
}
