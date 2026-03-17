import { trpc } from "@/lib/trpc";
import { Skeleton } from "@/components/ui/skeleton";
import { FileCheck, MapPin, Shield, Users, QrCode, Activity } from "lucide-react";

const STAT_CARDS = [
  { key: "users", label: "Utilisateurs", icon: Users, color: "text-ci-green bg-ci-green-light" },
  { key: "parcels", label: "Parcelles", icon: MapPin, color: "text-ci-orange bg-ci-orange-light" },
  { key: "attestations", label: "Attestations", icon: FileCheck, color: "text-purple-600 bg-purple-50" },
  { key: "verifyTokens", label: "Tokens Verify", icon: QrCode, color: "text-blue-600 bg-blue-50" },
  { key: "auditEvents", label: "Événements Audit", icon: Shield, color: "text-red-600 bg-red-50" },
] as const;

export default function AdminDashboard() {
  const { data: stats, isLoading } = trpc.admin.dashboardStats.useQuery();
  const { data: statusDist } = trpc.admin.parcelStatusDistribution.useQuery();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Tableau de bord</h1>
        <p className="text-muted-foreground text-sm mt-1">Vue d'ensemble de la plateforme Foncier225</p>
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

      {/* Status Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-lg border bg-card p-6">
          <h2 className="font-semibold mb-4 flex items-center gap-2">
            <Activity className="h-4 w-4 text-ci-green" />
            Distribution des statuts
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
