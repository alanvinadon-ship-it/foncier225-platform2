import { useState, useEffect, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { BarChart3, TrendingUp, Users, FileText, CreditCard, Calendar, Loader2 } from "lucide-react";

const PERIOD_OPTIONS = [
  { label: "7 jours", value: 7 },
  { label: "30 jours", value: 30 },
  { label: "90 jours", value: 90 },
  { label: "1 an", value: 365 },
];

const STATUS_LABELS: Record<string, string> = {
  dossier_en_cours: "En cours",
  en_opposition: "Opposition",
  gele: "Gelé",
  mediation_en_cours: "Médiation",
  acte_notarie_enregistre: "Acte notarié",
  valide: "Validé",
};

const TAX_LABELS: Record<string, string> = {
  liasse_afor: "Liasse AFOR",
  frais_geometre: "Frais géomètre",
  taxe_immatriculation: "Taxe immatriculation",
  frais_dossier: "Frais de dossier",
  other: "Autre",
};

const ROLE_LABELS: Record<string, string> = {
  citizen: "Citoyen",
  agent_terrain: "Agent terrain",
  agent_mclu: "Agent MCLU",
  geometre_urbain: "Géomètre",
  conservateur: "Conservateur",
  bank: "Banque",
  admin: "Administrateur",
};

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("fr-CI", { style: "decimal" }).format(amount) + " FCFA";
}

function KPICard({ icon: Icon, label, value, subValue, color }: {
  icon: any;
  label: string;
  value: string | number;
  subValue?: string;
  color: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-center gap-3 mb-3">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${color}`}>
          <Icon className="h-5 w-5 text-white" />
        </div>
        <span className="text-sm text-gray-500">{label}</span>
      </div>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      {subValue && <p className="text-xs text-gray-500 mt-1">{subValue}</p>}
    </div>
  );
}

function ChartCanvas({ id, renderChart }: { id: string; renderChart: (canvas: HTMLCanvasElement) => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<any>(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    // Dynamically load Chart.js
    const loadChart = async () => {
      if (!(window as any).Chart) {
        const script = document.createElement("script");
        script.src = "https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js";
        script.async = true;
        script.onload = () => {
          if (chartRef.current) chartRef.current.destroy();
          renderChart(canvasRef.current!);
        };
        document.head.appendChild(script);
      } else {
        if (chartRef.current) chartRef.current.destroy();
        renderChart(canvasRef.current!);
      }
    };

    loadChart();

    return () => {
      if (chartRef.current) chartRef.current.destroy();
    };
  }, [renderChart]);

  return <canvas ref={canvasRef} id={id} />;
}

export default function AdminAnalytics() {
  const [periodDays, setPeriodDays] = useState(30);

  const overview = trpc.analytics.getOverviewStats.useQuery({ periodDays });
  const dossiersByStatus = trpc.analytics.getDossiersByStatus.useQuery();
  const paymentsByMonth = trpc.analytics.getPaymentsByMonth.useQuery();
  const paymentsByProvider = trpc.analytics.getPaymentsByProvider.useQuery();
  const paymentsByTaxType = trpc.analytics.getPaymentsByTaxType.useQuery();
  const usersByRole = trpc.analytics.getUsersByRole.useQuery();
  const appointmentsByStatus = trpc.analytics.getAppointmentsByStatus.useQuery();

  const isLoading = overview.isLoading;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
            <BarChart3 className="h-7 w-7 text-green-600" />
            Tableau de bord analytique
          </h1>
          <p className="text-sm text-gray-500 mt-1">Vue d'ensemble de l'activité de la plateforme</p>
        </div>
        <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
          {PERIOD_OPTIONS.map(opt => (
            <button
              key={opt.value}
              onClick={() => setPeriodDays(opt.value)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                periodDays === opt.value
                  ? "bg-white text-green-700 shadow-sm"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-green-600" />
        </div>
      ) : (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <KPICard
              icon={Users}
              label="Utilisateurs"
              value={overview.data?.totalUsers ?? 0}
              subValue={`+${overview.data?.newUsersInPeriod ?? 0} sur la période`}
              color="bg-blue-500"
            />
            <KPICard
              icon={FileText}
              label="Parcelles"
              value={overview.data?.totalParcels ?? 0}
              color="bg-green-500"
            />
            <KPICard
              icon={CreditCard}
              label="Paiements"
              value={overview.data?.totalPayments ?? 0}
              subValue={`${overview.data?.paymentsInPeriod ?? 0} sur la période`}
              color="bg-orange-500"
            />
            <KPICard
              icon={TrendingUp}
              label="Revenus totaux"
              value={formatCurrency(overview.data?.totalRevenue ?? 0)}
              subValue={`${formatCurrency(overview.data?.periodRevenue ?? 0)} sur la période`}
              color="bg-purple-500"
            />
          </div>

          {/* Charts Row 1 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Dossiers par statut */}
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h3 className="font-semibold text-gray-900 mb-4">Parcelles par statut</h3>
              {dossiersByStatus.data && dossiersByStatus.data.length > 0 ? (
                <div className="space-y-3">
                  {dossiersByStatus.data.map(d => {
                    const total = dossiersByStatus.data.reduce((s, x) => s + x.count, 0);
                    const pct = total > 0 ? Math.round((d.count / total) * 100) : 0;
                    return (
                      <div key={d.status} className="flex items-center gap-3">
                        <span className="text-xs text-gray-600 w-28 truncate">
                          {STATUS_LABELS[d.status] || d.status}
                        </span>
                        <div className="flex-1 h-6 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-green-500 rounded-full transition-all"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="text-xs font-medium text-gray-700 w-12 text-right">
                          {d.count} ({pct}%)
                        </span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-gray-400 text-center py-8">Aucune donnée</p>
              )}
            </div>

            {/* Paiements par mois */}
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h3 className="font-semibold text-gray-900 mb-4">Paiements par mois (12 derniers mois)</h3>
              {paymentsByMonth.data && paymentsByMonth.data.length > 0 ? (
                <div className="space-y-2">
                  {paymentsByMonth.data.slice(-6).map(m => {
                    const maxTotal = Math.max(...paymentsByMonth.data!.map(x => x.total));
                    const pct = maxTotal > 0 ? Math.round((m.total / maxTotal) * 100) : 0;
                    return (
                      <div key={m.month} className="flex items-center gap-3">
                        <span className="text-xs text-gray-600 w-16">{m.month}</span>
                        <div className="flex-1 h-6 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-orange-400 rounded-full transition-all"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="text-xs font-medium text-gray-700 w-28 text-right">
                          {formatCurrency(m.total)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-gray-400 text-center py-8">Aucun paiement enregistré</p>
              )}
            </div>
          </div>

          {/* Charts Row 2 */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Paiements par provider */}
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h3 className="font-semibold text-gray-900 mb-4">Par passerelle</h3>
              {paymentsByProvider.data && paymentsByProvider.data.length > 0 ? (
                <div className="space-y-3">
                  {paymentsByProvider.data.map(p => (
                    <div key={p.provider} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                      <div className="flex items-center gap-2">
                        <span className={`w-3 h-3 rounded-full ${p.provider === "tresorpay" ? "bg-green-500" : "bg-blue-500"}`} />
                        <span className="text-sm text-gray-700 capitalize">{p.provider}</span>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium text-gray-900">{p.count} tx</p>
                        <p className="text-xs text-gray-500">{formatCurrency(p.total)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-400 text-center py-8">Aucune donnée</p>
              )}
            </div>

            {/* Paiements par type de taxe */}
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h3 className="font-semibold text-gray-900 mb-4">Par type de taxe</h3>
              {paymentsByTaxType.data && paymentsByTaxType.data.length > 0 ? (
                <div className="space-y-3">
                  {paymentsByTaxType.data.map(t => (
                    <div key={t.taxType} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                      <span className="text-sm text-gray-700">{TAX_LABELS[t.taxType] || t.taxType}</span>
                      <div className="text-right">
                        <p className="text-sm font-medium text-gray-900">{t.count}</p>
                        <p className="text-xs text-gray-500">{formatCurrency(t.total)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-400 text-center py-8">Aucune donnée</p>
              )}
            </div>

            {/* Utilisateurs par rôle */}
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h3 className="font-semibold text-gray-900 mb-4">Utilisateurs par rôle</h3>
              {usersByRole.data && usersByRole.data.length > 0 ? (
                <div className="space-y-3">
                  {usersByRole.data.map(u => (
                    <div key={u.role} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                      <span className="text-sm text-gray-700">{ROLE_LABELS[u.role] || u.role}</span>
                      <span className="text-sm font-medium text-gray-900 bg-gray-100 px-2 py-0.5 rounded">{u.count}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-400 text-center py-8">Aucune donnée</p>
              )}
            </div>
          </div>

          {/* Rendez-vous */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Calendar className="h-5 w-5 text-green-600" />
              Rendez-vous par statut
            </h3>
            {appointmentsByStatus.data && appointmentsByStatus.data.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {appointmentsByStatus.data.map(a => {
                  const colors: Record<string, string> = {
                    pending: "bg-amber-50 text-amber-700 border-amber-200",
                    confirmed: "bg-green-50 text-green-700 border-green-200",
                    completed: "bg-blue-50 text-blue-700 border-blue-200",
                    cancelled: "bg-red-50 text-red-700 border-red-200",
                  };
                  const labels: Record<string, string> = {
                    pending: "En attente",
                    confirmed: "Confirmés",
                    completed: "Terminés",
                    cancelled: "Annulés",
                  };
                  return (
                    <div key={a.status} className={`rounded-lg border p-4 text-center ${colors[a.status] || "bg-gray-50 text-gray-700 border-gray-200"}`}>
                      <p className="text-2xl font-bold">{a.count}</p>
                      <p className="text-xs mt-1">{labels[a.status] || a.status}</p>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-gray-400 text-center py-8">Aucun rendez-vous</p>
            )}
          </div>
        </>
      )}
    </div>
  );
}
