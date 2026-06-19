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
} from "lucide-react";

const MODULE_CARDS = [
  { module: "erp_projects", label: "Projets", icon: FolderKanban, href: "/erp/projects", color: "text-blue-500", description: "Gestion des projets de construction" },
  { module: "erp_gantt", label: "Gantt", icon: GanttChart, href: "/erp/gantt", color: "text-indigo-500", description: "Planification et suivi" },
  { module: "erp_documents", label: "Documents", icon: FileText, href: "/erp/documents", color: "text-green-500", description: "Gestion documentaire" },
  { module: "erp_compliance", label: "Conformité", icon: ShieldCheck, href: "/erp/compliance", color: "text-purple-500", description: "Rapports de conformité" },
  { module: "erp_equipment", label: "Équipements", icon: Wrench, href: "/erp/equipment", color: "text-orange-500", description: "Parc matériel" },
  { module: "erp_safety", label: "Sécurité", icon: HardHat, href: "/erp/safety", color: "text-red-500", description: "HSE et incidents" },
  { module: "erp_vendors", label: "Fournisseurs", icon: Truck, href: "/erp/vendors", color: "text-teal-500", description: "Gestion fournisseurs" },
  { module: "erp_contractors", label: "Entrepreneurs", icon: Users, href: "/erp/contractors", color: "text-cyan-500", description: "Prestataires et sous-traitants" },
  { module: "erp_inventory", label: "Inventaire", icon: Package, href: "/erp/inventory", color: "text-amber-500", description: "Stocks et matériaux" },
  { module: "erp_finance", label: "Finances", icon: DollarSign, href: "/erp/finance", color: "text-emerald-500", description: "Budgets et paiements" },
  { module: "erp_alerts", label: "Alertes", icon: Bell, href: "/erp/alerts", color: "text-rose-500", description: "Notifications et alertes" },
  { module: "erp_audit_logs", label: "Audit Logs", icon: ScrollText, href: "/erp/audit-logs", color: "text-slate-500", description: "Historique des actions" },
];

export default function ErpDashboard() {
  const { canAccessModule, roles, isErpAdmin } = useErpPermissions();
  const { data: stats } = trpc.erp.admin.stats.useQuery();

  const accessibleModules = MODULE_CARDS.filter(m => canAccessModule(m.module));

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">ERP Construction</h1>
        <p className="text-muted-foreground mt-1">
          Tableau de bord — Gestion de vos projets de construction
        </p>
      </div>

      {/* Stats rapides */}
      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Rôles ERP" value={stats.totalRoles} />
          <StatCard label="Permissions" value={stats.totalPermissions} />
          <StatCard label="Utilisateurs ERP" value={stats.usersWithErpAccess} />
          <StatCard label="Modules actifs" value={stats.modules} />
        </div>
      )}

      {/* Rôles de l'utilisateur */}
      <div className="bg-card rounded-lg border border-border p-4">
        <h2 className="text-sm font-semibold mb-2">Vos rôles ERP</h2>
        <div className="flex flex-wrap gap-2">
          {roles.map(r => (
            <span
              key={r.roleName}
              className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary"
            >
              {r.displayName}
            </span>
          ))}
        </div>
      </div>

      {/* Grille de modules accessibles */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Modules disponibles</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {accessibleModules.map(mod => (
            <Link key={mod.module} href={mod.href}>
              <div className="bg-card border border-border rounded-lg p-4 hover:border-primary/50 hover:shadow-sm transition-all cursor-pointer group">
                <div className="flex items-center gap-3 mb-2">
                  <mod.icon className={`${mod.color} group-hover:scale-110 transition-transform`} size={24} />
                  <h3 className="font-medium text-sm">{mod.label}</h3>
                </div>
                <p className="text-xs text-muted-foreground">{mod.description}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Bouton seed pour admin */}
      {isErpAdmin() && <SeedButton />}
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-card border border-border rounded-lg p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-2xl font-bold mt-1">{value}</p>
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
    <div className="bg-card border border-border rounded-lg p-4">
      <h2 className="text-sm font-semibold mb-2">Administration</h2>
      <p className="text-xs text-muted-foreground mb-3">
        Initialiser les rôles et permissions ERP par défaut (idempotent).
      </p>
      <button
        onClick={() => seed.mutate()}
        disabled={seed.isPending}
        className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 disabled:opacity-50"
      >
        {seed.isPending ? "Initialisation..." : "Seed ERP RBAC"}
      </button>
      {seed.data && (
        <p className="text-xs text-green-600 mt-2">
          ✓ {seed.data.rolesCreated} rôles et {seed.data.permissionsCreated} permissions créés
        </p>
      )}
    </div>
  );
}
