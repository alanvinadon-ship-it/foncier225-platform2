import { useMemo, useEffect, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  TrendingUp, TrendingDown, DollarSign, Building2, AlertTriangle,
  BarChart3, Target, Wallet, Loader2, ArrowUpRight, ArrowDownRight,
  FileDown,
} from "lucide-react";

function formatCurrency(amount: number): string {
  if (Math.abs(amount) >= 1_000_000_000) return `${(amount / 1_000_000_000).toFixed(1)} Md`;
  if (Math.abs(amount) >= 1_000_000) return `${(amount / 1_000_000).toFixed(1)} M`;
  if (Math.abs(amount) >= 1_000) return `${(amount / 1_000).toFixed(0)} K`;
  return amount.toLocaleString("fr-FR");
}

function KpiCard({ title, value, subtitle, icon: Icon, trend, color }: {
  title: string; value: string; subtitle?: string;
  icon: any; trend?: "up" | "down" | "neutral"; color: string;
}) {
  return (
    <Card>
      <CardContent className="pt-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs text-muted-foreground font-medium">{title}</p>
            <p className="text-xl font-bold mt-1">{value}</p>
            {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
          </div>
          <div className={`p-2 rounded-lg ${color}`}>
            <Icon className="w-4 h-4 text-white" />
          </div>
        </div>
        {trend && (
          <div className="flex items-center gap-1 mt-2">
            {trend === "up" ? <ArrowUpRight className="w-3 h-3 text-green-500" /> : trend === "down" ? <ArrowDownRight className="w-3 h-3 text-red-500" /> : null}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ChartCanvas({ id, renderFn }: { id: string; renderFn: (canvas: HTMLCanvasElement) => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<any>(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    // Destroy previous chart
    if (chartRef.current) {
      chartRef.current.destroy();
    }
    renderFn(canvasRef.current);
    // Store chart instance
    chartRef.current = (canvasRef.current as any).__chartInstance;
    return () => {
      if (chartRef.current) {
        chartRef.current.destroy();
        chartRef.current = null;
      }
    };
  }, [renderFn]);

  return <canvas ref={canvasRef} id={id} />;
}

export default function ErpDirectionDashboard() {
  const summary = trpc.erp.directionDashboard.summary.useQuery();
  const salesTargets = trpc.erp.directionDashboard.salesTargets.useQuery();
  const budgetVsActual = trpc.erp.directionDashboard.budgetVsActual.useQuery();
  const realEstate = trpc.erp.directionDashboard.realEstate.useQuery();
  const plSnapshots = trpc.erp.directionDashboard.plSnapshots.useQuery();
  const cashFlowSnapshots = trpc.erp.directionDashboard.cashFlowSnapshots.useQuery();
  const alerts = trpc.erp.directionDashboard.alerts.useQuery();

  const generateReport = trpc.erp.directionReports.generate.useMutation({
    onSuccess: (result) => {
      toast.success("Rapport PDF g\u00e9n\u00e9r\u00e9 avec succ\u00e8s");
      if (result.fileUrl) {
        window.open(result.fileUrl, "_blank");
      }
    },
    onError: (err) => toast.error(`Erreur: ${err.message}`),
  });

  const isLoading = summary.isLoading;

  // Chart.js rendering for P&L
  const renderPlChart = useMemo(() => {
    return (canvas: HTMLCanvasElement) => {
      const data = plSnapshots.data;
      if (!data || data.length === 0) return;
      const Chart = (window as any).Chart;
      if (!Chart) return;

      const labels = data.map((d: any) => `M${d.monthNumber}`);
      const chart = new Chart(canvas, {
        type: "bar",
        data: {
          labels,
          datasets: [
            { label: "Revenus Réels", data: data.map((d: any) => d.revenueActual / 1_000_000), backgroundColor: "rgba(34, 197, 94, 0.7)" },
            { label: "Revenus Prévus", data: data.map((d: any) => d.revenuePlanned / 1_000_000), backgroundColor: "rgba(34, 197, 94, 0.2)", borderColor: "rgba(34, 197, 94, 1)", borderWidth: 1 },
            { label: "EBITDA Réel", data: data.map((d: any) => d.ebitdaActual / 1_000_000), backgroundColor: "rgba(59, 130, 246, 0.7)" },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { position: "bottom", labels: { boxWidth: 12, font: { size: 11 } } } },
          scales: { y: { title: { display: true, text: "M FCFA" } } },
        },
      });
      (canvas as any).__chartInstance = chart;
    };
  }, [plSnapshots.data]);

  // Chart.js rendering for Cash Flow
  const renderCfChart = useMemo(() => {
    return (canvas: HTMLCanvasElement) => {
      const data = cashFlowSnapshots.data;
      if (!data || data.length === 0) return;
      const Chart = (window as any).Chart;
      if (!Chart) return;

      const labels = data.map((d: any) => `M${d.monthNumber}`);
      const chart = new Chart(canvas, {
        type: "line",
        data: {
          labels,
          datasets: [
            { label: "Entrées", data: data.map((d: any) => d.cashInActual / 1_000_000), borderColor: "#22c55e", backgroundColor: "rgba(34,197,94,0.1)", fill: true, tension: 0.3 },
            { label: "Sorties", data: data.map((d: any) => d.cashOutActual / 1_000_000), borderColor: "#ef4444", backgroundColor: "rgba(239,68,68,0.1)", fill: true, tension: 0.3 },
            { label: "Net", data: data.map((d: any) => d.netCashFlowActual / 1_000_000), borderColor: "#3b82f6", borderDash: [5, 5], tension: 0.3 },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { position: "bottom", labels: { boxWidth: 12, font: { size: 11 } } } },
          scales: { y: { title: { display: true, text: "M FCFA" } } },
        },
      });
      (canvas as any).__chartInstance = chart;
    };
  }, [cashFlowSnapshots.data]);

  // Budget vs Actual chart
  const renderBudgetChart = useMemo(() => {
    return (canvas: HTMLCanvasElement) => {
      const data = budgetVsActual.data;
      if (!data || data.length === 0) return;
      const Chart = (window as any).Chart;
      if (!Chart) return;

      const labels = data.map((d: any) => d.category?.substring(0, 15) || "N/A");
      const chart = new Chart(canvas, {
        type: "bar",
        data: {
          labels,
          datasets: [
            { label: "Budget Initial", data: data.map((d: any) => d.initial / 1_000_000), backgroundColor: "rgba(99, 102, 241, 0.3)", borderColor: "#6366f1", borderWidth: 1 },
            { label: "Engagé", data: data.map((d: any) => d.engaged / 1_000_000), backgroundColor: "rgba(245, 158, 11, 0.7)" },
            { label: "Payé", data: data.map((d: any) => d.paid / 1_000_000), backgroundColor: "rgba(239, 68, 68, 0.7)" },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { position: "bottom", labels: { boxWidth: 12, font: { size: 11 } } } },
          scales: { y: { title: { display: true, text: "M FCFA" } } },
        },
      });
      (canvas as any).__chartInstance = chart;
    };
  }, [budgetVsActual.data]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const s = summary.data;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Dashboard Direction</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Vue consolidée 360° — Tous les modules ERP
          </p>
        </div>
        <Button
          onClick={() => {
            generateReport.mutate({});
          }}
          disabled={generateReport.isPending}
          className="gap-2"
        >
          {generateReport.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileDown className="w-4 h-4" />}
          Export PDF
        </Button>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          title="Projets actifs"
          value={String(s?.activeProjects || 0)}
          icon={Building2}
          color="bg-indigo-500"
        />
        <KpiCard
          title="Budget consommé"
          value={`${s?.budgetConsumptionRate || 0}%`}
          subtitle={`${formatCurrency(s?.budgetPaid || 0)} / ${formatCurrency(s?.budgetInitial || 0)} FCFA`}
          icon={Wallet}
          color="bg-emerald-500"
        />
        <KpiCard
          title="Cash Flow Net (30j)"
          value={`${formatCurrency(s?.cashFlowNet || 0)} FCFA`}
          subtitle={`+${formatCurrency(s?.cashIn || 0)} / -${formatCurrency(s?.cashOut || 0)}`}
          icon={DollarSign}
          trend={(s?.cashFlowNet || 0) >= 0 ? "up" : "down"}
          color={(s?.cashFlowNet || 0) >= 0 ? "bg-green-500" : "bg-red-500"}
        />
        <KpiCard
          title="Alertes actives"
          value={String(s?.activeAlerts || 0)}
          subtitle={`${s?.unpaidInvoices || 0} factures impayées`}
          icon={AlertTriangle}
          color={(s?.activeAlerts || 0) > 0 ? "bg-red-500" : "bg-gray-400"}
        />
      </div>

      {/* Charts Row 1: P&L + Cash Flow */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart3 className="w-4 h-4" /> Compte de Résultat (P&L)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div style={{ height: "280px" }}>
              {plSnapshots.data && plSnapshots.data.length > 0 ? (
                <ChartCanvas id="pl-chart" renderFn={renderPlChart} />
              ) : (
                <p className="text-sm text-muted-foreground text-center pt-20">Aucune donnée P&L disponible</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="w-4 h-4" /> Trésorerie (Cash Flow)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div style={{ height: "280px" }}>
              {cashFlowSnapshots.data && cashFlowSnapshots.data.length > 0 ? (
                <ChartCanvas id="cf-chart" renderFn={renderCfChart} />
              ) : (
                <p className="text-sm text-muted-foreground text-center pt-20">Aucune donnée Cash Flow disponible</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 2: Budget vs Actual + Real Estate */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Wallet className="w-4 h-4" /> Budget vs Réalisé
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div style={{ height: "280px" }}>
              {budgetVsActual.data && budgetVsActual.data.length > 0 ? (
                <ChartCanvas id="budget-chart" renderFn={renderBudgetChart} />
              ) : (
                <p className="text-sm text-muted-foreground text-center pt-20">Aucune donnée budgétaire disponible</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Building2 className="w-4 h-4" /> Ventes Immobilières
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-3 bg-muted/50 rounded-lg">
                  <p className="text-2xl font-bold">{realEstate.data?.programs || 0}</p>
                  <p className="text-xs text-muted-foreground">Programmes</p>
                </div>
                <div className="text-center p-3 bg-muted/50 rounded-lg">
                  <p className="text-2xl font-bold">{realEstate.data?.sales || 0}</p>
                  <p className="text-xs text-muted-foreground">Ventes</p>
                </div>
                <div className="text-center p-3 bg-muted/50 rounded-lg">
                  <p className="text-2xl font-bold">{formatCurrency(realEstate.data?.totalSalesAmount || 0)}</p>
                  <p className="text-xs text-muted-foreground">CA Total (FCFA)</p>
                </div>
                <div className="text-center p-3 bg-muted/50 rounded-lg">
                  <p className="text-2xl font-bold">{realEstate.data?.collectionRate || 0}%</p>
                  <p className="text-xs text-muted-foreground">Taux encaissement</p>
                </div>
              </div>
              <div className="pt-2">
                <div className="flex justify-between text-xs text-muted-foreground mb-1">
                  <span>Encaissé</span>
                  <span>{formatCurrency(realEstate.data?.totalPaid || 0)} / {formatCurrency(realEstate.data?.totalDue || 0)} FCFA</span>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div
                    className="bg-emerald-500 h-2 rounded-full transition-all"
                    style={{ width: `${Math.min(realEstate.data?.collectionRate || 0, 100)}%` }}
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Sales Targets + Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Objectifs commerciaux */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Target className="w-4 h-4" /> Objectifs Commerciaux
            </CardTitle>
          </CardHeader>
          <CardContent>
            {salesTargets.data && salesTargets.data.length > 0 ? (
              <div className="space-y-3">
                {salesTargets.data.slice(0, 5).map((t: any) => (
                  <div key={t.id} className="flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{t.name}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <div className="flex-1 bg-muted rounded-full h-1.5">
                          <div
                            className={`h-1.5 rounded-full ${t.progressPercent >= 100 ? "bg-green-500" : t.progressPercent >= 70 ? "bg-blue-500" : "bg-amber-500"}`}
                            style={{ width: `${Math.min(t.progressPercent, 100)}%` }}
                          />
                        </div>
                        <span className="text-xs font-medium">{t.progressPercent}%</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">Aucun objectif défini</p>
            )}
          </CardContent>
        </Card>

        {/* Alertes */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-500" /> Alertes Critiques
            </CardTitle>
          </CardHeader>
          <CardContent>
            {alerts.data && alerts.data.length > 0 ? (
              <div className="space-y-2">
                {alerts.data.slice(0, 5).map((a: any) => (
                  <div key={a.id} className="flex items-start gap-2 p-2 rounded-lg bg-red-50 dark:bg-red-950/20">
                    <AlertTriangle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium">{a.alertType}</p>
                      <p className="text-xs text-muted-foreground truncate">{a.message || "Dépassement détecté"}</p>
                      <Badge variant="outline" className="text-xs mt-1">
                        {a.severity || "warning"}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6">
                <p className="text-sm text-green-600 font-medium">Aucune alerte active</p>
                <p className="text-xs text-muted-foreground mt-1">Tous les indicateurs sont dans les seuils</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
