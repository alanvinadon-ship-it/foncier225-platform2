import { Link, useLocation } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { useErpPermissions } from "@/hooks/useErpPermissions";
import {
  LayoutDashboard,
  FolderKanban,
  GanttChart,
  FileText,
  ShieldCheck,
  Shield,
  Wrench,
  HardHat,
  Truck,
  Users,
  Package,
  DollarSign,
  Bell,
  User,
  ScrollText,
  Settings,
  Award,
  Star,
  ChevronLeft,
  LogOut,
  Menu,
  X,
  Link2,
  Trash2,
  Wallet,
  BarChart3,
} from "lucide-react";
import { useState } from "react";
import { NotificationBell } from "@/components/erp/NotificationBell";

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  module: string;
}

const ERP_NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", href: "/erp", icon: <LayoutDashboard size={18} />, module: "erp_dashboard" },
  { label: "Projets", href: "/erp/projects", icon: <FolderKanban size={18} />, module: "erp_projects" },
  { label: "Gantt", href: "/erp/gantt", icon: <GanttChart size={18} />, module: "erp_gantt" },
  { label: "Documents", href: "/erp/documents", icon: <FileText size={18} />, module: "erp_documents" },
  { label: "Permis", href: "/erp/permits", icon: <Shield size={18} />, module: "erp_compliance" },
  { label: "Conformité", href: "/erp/compliance", icon: <ShieldCheck size={18} />, module: "erp_compliance" },
  { label: "Équipements", href: "/erp/equipment", icon: <Wrench size={18} />, module: "erp_equipment" },
  { label: "Sécurité", href: "/erp/safety", icon: <HardHat size={18} />, module: "erp_safety" },
  { label: "Fournisseurs", href: "/erp/vendors", icon: <Truck size={18} />, module: "erp_vendors" },
  { label: "Entrepreneurs", href: "/erp/contractors", icon: <Users size={18} />, module: "erp_contractors" },
  { label: "Certifications", href: "/erp/certifications", icon: <Award size={18} />, module: "erp_vendors" },
  { label: "Performance", href: "/erp/performance-ratings", icon: <Star size={18} />, module: "erp_vendors" },
  { label: "Inventaire", href: "/erp/inventory", icon: <Package size={18} />, module: "erp_inventory" },
  { label: "Demandes Matériel", href: "/erp/material-requests", icon: <Truck size={18} />, module: "erp_inventory" },
  { label: "Intégration Fournisseurs", href: "/erp/supplier-integration", icon: <Link2 size={18} />, module: "erp_vendors" },
  { label: "Analyse Gaspillages", href: "/erp/wastage", icon: <Trash2 size={18} />, module: "erp_inventory" },
  { label: "Factures", href: "/erp/invoices", icon: <ScrollText size={18} />, module: "erp_finance" },
  { label: "Paiements", href: "/erp/payments", icon: <DollarSign size={18} />, module: "erp_finance" },
  { label: "Budgets", href: "/erp/finance/budgets", icon: <Wallet size={18} />, module: "erp_finance" },
  { label: "Trésorerie", href: "/erp/finance/cash-flow", icon: <DollarSign size={18} />, module: "erp_finance" },
  { label: "Rentabilité", href: "/erp/finance/profitability", icon: <BarChart3 size={18} />, module: "erp_finance" },
  { label: "Alertes Dépassement", href: "/erp/finance/overrun-alerts", icon: <Bell size={18} />, module: "erp_alerts" },
  { label: "Notifications", href: "/erp/notifications", icon: <Bell size={18} />, module: "erp_alerts" },
  { label: "Profil", href: "/erp/profile", icon: <User size={18} />, module: "erp_profile" },
  { label: "Audit Logs", href: "/erp/audit-logs", icon: <ScrollText size={18} />, module: "erp_audit_logs" },
];

const ERP_ADMIN_ITEMS: NavItem[] = [
  { label: "Utilisateurs ERP", href: "/erp/admin/users", icon: <Users size={18} />, module: "erp_audit_logs" },
  { label: "Rôles ERP", href: "/erp/admin/roles", icon: <ShieldCheck size={18} />, module: "erp_audit_logs" },
  { label: "Permissions ERP", href: "/erp/admin/permissions", icon: <Settings size={18} />, module: "erp_audit_logs" },
];

export function ErpLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { user } = useAuth();
  const { hasAccess, isLoading, canAccessModule, isErpAdmin } = useErpPermissions();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!hasAccess) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="text-center space-y-4 max-w-md px-6">
          <HardHat className="mx-auto h-16 w-16 text-muted-foreground" />
          <h1 className="text-2xl font-bold">Accès ERP Construction refusé</h1>
          <p className="text-muted-foreground">
            Vous n'avez pas de rôle ERP Construction assigné. Contactez votre administrateur pour obtenir l'accès.
          </p>
          <Link href="/" className="inline-block mt-4 text-primary hover:underline">
            ← Retour à Foncier225
          </Link>
        </div>
      </div>
    );
  }

  // Filtrer les items de navigation selon les permissions
  const visibleNavItems = ERP_NAV_ITEMS.filter(item => canAccessModule(item.module));
  const visibleAdminItems = isErpAdmin() ? ERP_ADMIN_ITEMS : [];

  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar */}
      <aside
        className={`${sidebarOpen ? "w-64" : "w-16"} transition-all duration-200 bg-card border-r border-border flex flex-col`}
      >
        {/* Header */}
        <div className="h-14 flex items-center px-4 border-b border-border justify-between">
          {sidebarOpen && (
            <div className="flex items-center gap-2">
              <HardHat size={20} className="text-primary" />
              <span className="font-semibold text-sm">ERP Construction</span>
            </div>
          )}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-1 rounded hover:bg-accent"
          >
            {sidebarOpen ? <ChevronLeft size={16} /> : <Menu size={16} />}
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-2 px-2 space-y-1">
          {visibleNavItems.map(item => {
            const isActive = location === item.href || (item.href !== "/erp" && location.startsWith(item.href));
            return (
              <Link key={item.href} href={item.href}>
                <div
                  className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm cursor-pointer transition-colors ${
                    isActive
                      ? "bg-primary/10 text-primary font-medium"
                      : "text-muted-foreground hover:bg-accent hover:text-foreground"
                  }`}
                >
                  {item.icon}
                  {sidebarOpen && <span>{item.label}</span>}
                </div>
              </Link>
            );
          })}

          {/* Section Admin */}
          {visibleAdminItems.length > 0 && (
            <>
              {sidebarOpen && (
                <div className="pt-4 pb-1 px-3">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Administration
                  </span>
                </div>
              )}
              {visibleAdminItems.map(item => {
                const isActive = location === item.href;
                return (
                  <Link key={item.href} href={item.href}>
                    <div
                      className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm cursor-pointer transition-colors ${
                        isActive
                          ? "bg-primary/10 text-primary font-medium"
                          : "text-muted-foreground hover:bg-accent hover:text-foreground"
                      }`}
                    >
                      {item.icon}
                      {sidebarOpen && <span>{item.label}</span>}
                    </div>
                  </Link>
                );
              })}
            </>
          )}
        </nav>

        {/* Footer */}
        <div className="border-t border-border p-3">
          {sidebarOpen && user && (
            <div className="flex items-center gap-2 mb-2 px-1">
              <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center text-xs font-medium text-primary">
                {user.name?.charAt(0)?.toUpperCase() || "U"}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium truncate">{user.name}</p>
                <p className="text-[10px] text-muted-foreground truncate">{user.email}</p>
              </div>
            </div>
          )}
          <Link href="/">
            <div className="flex items-center gap-3 px-3 py-2 rounded-md text-sm text-muted-foreground hover:bg-accent hover:text-foreground cursor-pointer">
              <LogOut size={16} />
              {sidebarOpen && <span>Retour Foncier225</span>}
            </div>
          </Link>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        {/* Header bar with notification bell */}
        <div className="h-14 border-b border-border flex items-center justify-end px-6 gap-3">
          <NotificationBell />
        </div>
        <div className="p-6">{children}</div>
      </main>
    </div>
  );
}
