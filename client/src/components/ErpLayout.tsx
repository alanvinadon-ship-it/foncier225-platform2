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
  ChevronDown,
  ChevronRight,
  LogOut,
  Menu,
  Link2,
  Trash2,
  Wallet,
  BarChart3,
  Banknote,
  ShoppingCart,
  CreditCard,
  BookOpen,
  ClipboardList,
  PackageCheck,
  Building2,
  Home,
  KeyRound,
  Receipt,
  Calculator,
  Scale,
  Landmark,
  FileSpreadsheet,
  Sparkles,
} from "lucide-react";
import { useState } from "react";
import { NotificationBell } from "@/components/erp/NotificationBell";
import { ErpSearchCommand } from "@/components/ErpSearchCommand";

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  module: string;
}

interface NavGroup {
  label: string;
  icon: React.ReactNode;
  module: string;
  children: NavItem[];
}

type NavEntry = NavItem | NavGroup;

function isNavGroup(entry: NavEntry): entry is NavGroup {
  return "children" in entry;
}

const ERP_NAV_ENTRIES: NavEntry[] = [
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
  // Groupe Achats
  {
    label: "Achats",
    icon: <ShoppingCart size={18} />,
    module: "erp_purchases",
    children: [
      { label: "Tableau de bord", href: "/erp/purchases-dashboard", icon: <BarChart3 size={18} />, module: "erp_purchases" },
      { label: "Demandes d'Achat", href: "/erp/purchase-requests", icon: <ClipboardList size={18} />, module: "erp_purchases" },
      { label: "Bons de Commande", href: "/erp/purchase-orders", icon: <FileText size={18} />, module: "erp_purchases" },
      { label: "Réceptions", href: "/erp/goods-receipts", icon: <PackageCheck size={18} />, module: "erp_purchases" },
      { label: "Demandes de Prix", href: "/erp/rfqs", icon: <Sparkles size={18} />, module: "erp_rfqs" },
      { label: "Rapprochement", href: "/erp/invoice-matching", icon: <Link2 size={18} />, module: "erp_invoice_matching" },
    ],
  },
  // Groupe Dépenses
  { label: "Dépenses", href: "/erp/expenses", icon: <CreditCard size={18} />, module: "erp_expenses" },
  // Groupe Finance
  {
    label: "Finance",
    icon: <Banknote size={18} />,
    module: "erp_finance",
    children: [
      { label: "Factures", href: "/erp/invoices", icon: <ScrollText size={18} />, module: "erp_finance" },
      { label: "Paiements", href: "/erp/payments", icon: <DollarSign size={18} />, module: "erp_finance" },
      { label: "Budgets", href: "/erp/finance/budgets", icon: <Wallet size={18} />, module: "erp_finance" },
      { label: "Trésorerie", href: "/erp/finance/cash-flow", icon: <DollarSign size={18} />, module: "erp_finance" },
      { label: "Rentabilité", href: "/erp/finance/profitability", icon: <BarChart3 size={18} />, module: "erp_finance" },
      { label: "Alertes Dépassement", href: "/erp/finance/overrun-alerts", icon: <Bell size={18} />, module: "erp_alerts" },
      { label: "Budget Prévisionnel", href: "/erp/budget-v2", icon: <FileSpreadsheet size={18} />, module: "erp_budget_v2" },
    ],
  },
  // Paramétrage Comptable (Pré-comptabilité)
  { label: "Pré-Comptabilité", href: "/erp/accounting", icon: <BookOpen size={18} />, module: "erp_accounting" },
  // Groupe Vente Immobilière
  {
    label: "Vente Immobilière",
    icon: <Building2 size={18} />,
    module: "erp_real_estate",
    children: [
      { label: "Dashboard", href: "/erp/real-estate", icon: <LayoutDashboard size={18} />, module: "erp_real_estate" },
      { label: "Programmes", href: "/erp/real-estate-programs", icon: <Home size={18} />, module: "erp_real_estate" },
      { label: "Unités", href: "/erp/real-estate-units", icon: <KeyRound size={18} />, module: "erp_real_estate" },
      { label: "Clients", href: "/erp/real-estate-customers", icon: <Users size={18} />, module: "erp_real_estate" },
      { label: "Réservations", href: "/erp/real-estate-reservations", icon: <ClipboardList size={18} />, module: "erp_real_estate" },
      { label: "Ventes", href: "/erp/real-estate-sales", icon: <Receipt size={18} />, module: "erp_real_estate" },
      { label: "Encaissements", href: "/erp/real-estate-payments", icon: <Banknote size={18} />, module: "erp_real_estate" },
    ],
  },
  // Groupe Comptabilité Générale
  {
    label: "Comptabilité Générale",
    icon: <Calculator size={18} />,
    module: "erp_full_accounting",
    children: [
      { label: "Dashboard", href: "/erp/accounting-dashboard", icon: <LayoutDashboard size={18} />, module: "erp_full_accounting" },
      { label: "Journaux", href: "/erp/accounting-journals", icon: <BookOpen size={18} />, module: "erp_full_accounting" },
      { label: "Écritures", href: "/erp/accounting-entries", icon: <ScrollText size={18} />, module: "erp_full_accounting" },
      { label: "Balance", href: "/erp/accounting-balance", icon: <Scale size={18} />, module: "erp_full_accounting" },
      { label: "Export Comptable", href: "/erp/accounting-export", icon: <FileSpreadsheet size={18} />, module: "erp_accounting_exports" },
    ],
  },
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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(() => {
    // Auto-expand group if current location matches one of its children
    const expanded = new Set<string>();
    for (const entry of ERP_NAV_ENTRIES) {
      if (isNavGroup(entry)) {
        for (const child of entry.children) {
          if (location === child.href || location.startsWith(child.href + "/")) {
            expanded.add(entry.label);
            break;
          }
        }
      }
    }
    return expanded;
  });

  const toggleGroup = (label: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(label)) {
        next.delete(label);
      } else {
        next.add(label);
      }
      return next;
    });
  };

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

  // Filtrer les entries de navigation selon les permissions
  const visibleNavEntries = ERP_NAV_ENTRIES.filter(entry => {
    if (isNavGroup(entry)) {
      // Show group if user can access the group module or any child module
      return canAccessModule(entry.module) || entry.children.some(c => canAccessModule(c.module));
    }
    return canAccessModule(entry.module);
  });

  const visibleAdminItems = isErpAdmin() ? ERP_ADMIN_ITEMS : [];

  return (
    <div className="flex min-h-screen bg-background">
      {/* Mobile overlay */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}
      {/* Sidebar */}
      <aside
        className={`${
          sidebarOpen ? "w-64" : "w-16"
        } transition-all duration-200 bg-card border-r border-border flex flex-col fixed lg:relative inset-y-0 left-0 z-50 ${
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
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
          {visibleNavEntries.map(entry => {
            if (isNavGroup(entry)) {
              const isExpanded = expandedGroups.has(entry.label);
              const isChildActive = entry.children.some(
                child => location === child.href || location.startsWith(child.href + "/")
              );
              const visibleChildren = entry.children.filter(c => canAccessModule(c.module));

              if (visibleChildren.length === 0) return null;

              return (
                <div key={entry.label}>
                  {/* Group header */}
                  <button
                    onClick={() => toggleGroup(entry.label)}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm cursor-pointer transition-colors ${
                      isChildActive && !isExpanded
                        ? "bg-primary/10 text-primary font-medium"
                        : "text-muted-foreground hover:bg-accent hover:text-foreground"
                    }`}
                  >
                    {entry.icon}
                    {sidebarOpen && (
                      <>
                        <span className="flex-1 text-left">{entry.label}</span>
                        {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                      </>
                    )}
                  </button>

                  {/* Group children */}
                  {sidebarOpen && isExpanded && (
                    <div className="ml-4 pl-3 border-l border-border/50 space-y-0.5 mt-0.5">
                      {visibleChildren.map(child => {
                        const isActive = location === child.href || location.startsWith(child.href + "/");
                        return (
                          <Link key={child.href} href={child.href}>
                            <div
                              className={`flex items-center gap-3 px-3 py-1.5 rounded-md text-sm cursor-pointer transition-colors ${
                                isActive
                                  ? "bg-primary/10 text-primary font-medium"
                                  : "text-muted-foreground hover:bg-accent hover:text-foreground"
                              }`}
                            >
                              {child.icon}
                              <span>{child.label}</span>
                            </div>
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            }

            // Regular nav item
            const isActive = location === entry.href || (entry.href !== "/erp" && location.startsWith(entry.href));
            return (
              <Link key={entry.href} href={entry.href}>
                <div
                  className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm cursor-pointer transition-colors ${
                    isActive
                      ? "bg-primary/10 text-primary font-medium"
                      : "text-muted-foreground hover:bg-accent hover:text-foreground"
                  }`}
                >
                  {entry.icon}
                  {sidebarOpen && <span>{entry.label}</span>}
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
      <main className="flex-1 overflow-y-auto min-w-0">
        {/* Header bar */}
        <div className="h-14 border-b border-border flex items-center justify-between px-4 sm:px-6 gap-2">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="p-2 rounded-md hover:bg-accent lg:hidden"
            >
              <Menu size={20} />
            </button>
            <ErpSearchCommand />
          </div>
          <NotificationBell />
        </div>
        <div className="p-3 sm:p-6">{children}</div>
      </main>
    </div>
  );
}
