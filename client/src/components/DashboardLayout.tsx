import { useAuth } from "@/_core/hooks/useAuth";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { getLoginUrl } from "@/const";
import { usePermissions } from "@/hooks/usePermissions";
import { useIsMobile } from "@/hooks/useMobile";
import { BarChart3, Bell, Building2, CalendarDays, ChevronDown, FileCheck, Globe, Home, Landmark, LayoutDashboard, LogOut, Map, MapPin, MessageSquare, Network, PanelLeft, PieChart, Shield, Users } from "lucide-react";
import { CSSProperties, useEffect, useRef, useState } from "react";
import { Link, useLocation } from "wouter";
import { DashboardLayoutSkeleton } from './DashboardLayoutSkeleton';
import { Button } from "./ui/button";

const LOGO_URL = "https://d2xsxph8kpxj0f.cloudfront.net/310519663315306103/5jQVPXrA6y6Zze2FEtSNJt/foncier225-logo-8Tu2AjJfXPzkTY5ufdWVtP.webp";

type AdminMenuItem = { icon: any; label: string; path: string; module?: string };
type AdminMenuCategory = { title: string; color: string; iconColor: string; key: string; items: AdminMenuItem[] };

const menuCategories: AdminMenuCategory[] = [
  {
    title: "Commun",
    color: "text-ci-orange",
    iconColor: "text-ci-orange",
    key: "common",
    items: [
      { icon: LayoutDashboard, label: "Tableau de bord", path: "/admin" },
      { icon: Users, label: "Utilisateurs", path: "/admin/users", module: "users" },
      { icon: Shield, label: "Journal d'audit", path: "/admin/audit" },
      { icon: Bell, label: "Notification Email/SMS", path: "/admin/notifications" },
      { icon: PieChart, label: "Statistiques unifiées", path: "/admin/unified-dashboard", module: "analytics" },
      { icon: CalendarDays, label: "Rendez-vous", path: "/admin/appointments", module: "appointments" },
      { icon: Network, label: "Interconnexion API", path: "/admin/interconnexion", module: "interconnexion" },
      { icon: BarChart3, label: "Analytique", path: "/admin/analytics", module: "analytics" },
      { icon: MessageSquare, label: "Messages", path: "/admin/messages", module: "messaging" },
      { icon: Shield, label: "Rôles & Accès", path: "/admin/rbac", module: "rbac" },
    ],
  },
  {
    title: "Foncier Rural",
    color: "text-emerald-600",
    iconColor: "text-emerald-600",
    key: "rural",
    items: [
      { icon: MapPin, label: "Parcelles", path: "/admin/parcels", module: "parcels" },
      { icon: FileCheck, label: "Documents", path: "/admin/documents", module: "parcels" },
      { icon: Landmark, label: "Titre foncier", path: "/admin/land-title", module: "titre_foncier" },
      { icon: Map, label: "Délimitation villageoise", path: "/admin/delimitation", module: "delimitation" },
      { icon: Globe, label: "Configuration SIG", path: "/admin/sig-config", module: "delimitation" },
      { icon: BarChart3, label: "Tableau de bord SIG", path: "/admin/sig-dashboard", module: "delimitation" },
    ],
  },
  {
    title: "Foncier Urbain",
    color: "text-blue-600",
    iconColor: "text-blue-600",
    key: "urban",
    items: [
      { icon: Building2, label: "Foncier Urbain (ACD)", path: "/admin/urban-acd", module: "urban_acd" },
    ],
  },
];

// Flat list for active item detection
const menuItems = menuCategories.flatMap(c => c.items);

const ADMIN_COLLAPSED_SECTIONS_KEY = "admin-collapsed-sections";

/** Collapsible admin sidebar section with colored label and chevron */
function AdminCollapsibleSection({
  category,
  location,
  setLocation,
  isCollapsed,
}: {
  category: AdminMenuCategory;
  location: string;
  setLocation: (path: string) => void;
  isCollapsed: boolean;
}) {
  const { canAccessModule } = usePermissions();

  // Filtrer les items selon les permissions RBAC
  // Les items sans module sont toujours visibles (ex: Tableau de bord, Journal d'audit)
  const visibleItems = category.items.filter(
    (item) => !item.module || canAccessModule(item.module)
  );

  const [open, setOpen] = useState(() => {
    try {
      const saved = localStorage.getItem(ADMIN_COLLAPSED_SECTIONS_KEY);
      if (saved) {
        const collapsed: string[] = JSON.parse(saved);
        return !collapsed.includes(category.key);
      }
    } catch {}
    return true;
  });

  useEffect(() => {
    try {
      const saved = localStorage.getItem(ADMIN_COLLAPSED_SECTIONS_KEY);
      const collapsed: string[] = saved ? JSON.parse(saved) : [];
      if (!open && !collapsed.includes(category.key)) {
        localStorage.setItem(ADMIN_COLLAPSED_SECTIONS_KEY, JSON.stringify([...collapsed, category.key]));
      } else if (open && collapsed.includes(category.key)) {
        localStorage.setItem(ADMIN_COLLAPSED_SECTIONS_KEY, JSON.stringify(collapsed.filter(k => k !== category.key)));
      }
    } catch {}
  }, [open, category.key]);

  // Ne pas afficher la section si aucun item visible
  if (visibleItems.length === 0) return null;

  if (isCollapsed) {
    return (
      <SidebarGroup>
        <SidebarGroupContent>
          <SidebarMenu>
            {visibleItems.map(item => {
              const isActive = location === item.path;
              return (
                <SidebarMenuItem key={item.path}>
                  <SidebarMenuButton
                    isActive={isActive}
                    onClick={() => setLocation(item.path)}
                    tooltip={item.label}
                    className="h-10 transition-all font-normal"
                  >
                    <item.icon className={`h-4 w-4 ${isActive ? category.iconColor : ""}`} />
                    <span>{item.label}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              );
            })}
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>
    );
  }

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <SidebarGroup>
        <CollapsibleTrigger asChild>
          <SidebarGroupLabel className={`text-[11px] uppercase tracking-wider font-semibold cursor-pointer select-none hover:bg-accent/50 rounded-md transition-colors ${category.color}`}>
            <span className="flex-1">{category.title}</span>
            <ChevronDown className={`h-3.5 w-3.5 ml-1 transition-transform duration-200 ${open ? "" : "-rotate-90"}`} />
          </SidebarGroupLabel>
        </CollapsibleTrigger>
        <CollapsibleContent className="transition-all data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down">
          <SidebarGroupContent>
            <SidebarMenu>
              {visibleItems.map(item => {
                const isActive = location === item.path;
                return (
                  <SidebarMenuItem key={item.path}>
                    <SidebarMenuButton
                      isActive={isActive}
                      onClick={() => setLocation(item.path)}
                      tooltip={item.label}
                      className="h-10 transition-all font-normal"
                    >
                      <item.icon className={`h-4 w-4 ${isActive ? category.iconColor : ""}`} />
                      <span>{item.label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </CollapsibleContent>
      </SidebarGroup>
    </Collapsible>
  );
}

const SIDEBAR_WIDTH_KEY = "sidebar-width";
const DEFAULT_WIDTH = 260;
const MIN_WIDTH = 200;
const MAX_WIDTH = 400;

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    const saved = localStorage.getItem(SIDEBAR_WIDTH_KEY);
    return saved ? parseInt(saved, 10) : DEFAULT_WIDTH;
  });
  const { loading, user } = useAuth();

  useEffect(() => {
    localStorage.setItem(SIDEBAR_WIDTH_KEY, sidebarWidth.toString());
  }, [sidebarWidth]);

  if (loading) {
    return <DashboardLayoutSkeleton />
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-ci-green-light/30">
        <div className="flex flex-col items-center gap-8 p-8 max-w-md w-full">
          <img src={LOGO_URL} alt="Foncier225" className="h-16 w-16 object-contain" />
          <div className="flex flex-col items-center gap-4">
            <h1 className="text-2xl font-bold tracking-tight text-center">
              Administration Foncier225
            </h1>
            <p className="text-sm text-muted-foreground text-center max-w-sm">
              Connectez-vous pour accéder au tableau de bord d'administration de la plateforme foncière.
            </p>
          </div>
          <Button
            onClick={() => { window.location.href = getLoginUrl(); }}
            size="lg"
            className="w-full bg-ci-green hover:bg-ci-green/90 shadow-lg"
          >
            Se connecter
          </Button>
        </div>
      </div>
    );
  }

  // Check admin role
  if (user.role !== "admin") {
    return (
      <div className="flex items-center justify-center min-h-screen bg-ci-orange-light/30">
        <div className="flex flex-col items-center gap-6 p-8 max-w-md w-full">
          <div className="h-16 w-16 rounded-full bg-red-50 flex items-center justify-center">
            <Shield className="h-8 w-8 text-red-500" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-center">Accès refusé</h1>
          <p className="text-sm text-muted-foreground text-center">
            Votre compte ({user.name || user.email}) n'a pas les permissions d'administration requises.
            Contactez un administrateur pour obtenir l'accès.
          </p>
          <Link href="/">
            <Button variant="outline">
              <Home className="h-4 w-4 mr-2" />
              Retour à l'accueil
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <SidebarProvider
      style={{
        "--sidebar-width": `${sidebarWidth}px`,
      } as CSSProperties}
    >
      <DashboardLayoutContent setSidebarWidth={setSidebarWidth}>
        {children}
      </DashboardLayoutContent>
    </SidebarProvider>
  );
}

type DashboardLayoutContentProps = {
  children: React.ReactNode;
  setSidebarWidth: (width: number) => void;
};

function DashboardLayoutContent({
  children,
  setSidebarWidth,
}: DashboardLayoutContentProps) {
  const { user, logout } = useAuth();
  const [location, setLocation] = useLocation();
  const { state, toggleSidebar } = useSidebar();
  const isCollapsed = state === "collapsed";
  const [isResizing, setIsResizing] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const activeMenuItem = menuItems.find(item => item.path === location);
  const isMobile = useIsMobile();

  useEffect(() => {
    if (isCollapsed) setIsResizing(false);
  }, [isCollapsed]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;
      const sidebarLeft = sidebarRef.current?.getBoundingClientRect().left ?? 0;
      const newWidth = e.clientX - sidebarLeft;
      if (newWidth >= MIN_WIDTH && newWidth <= MAX_WIDTH) setSidebarWidth(newWidth);
    };
    const handleMouseUp = () => setIsResizing(false);

    if (isResizing) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    }
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [isResizing, setSidebarWidth]);

  return (
    <>
      <div className="relative" ref={sidebarRef}>
        <Sidebar collapsible="icon" className="border-r-0" disableTransition={isResizing}>
          <SidebarHeader className="h-16 justify-center">
            <div className="flex items-center gap-3 px-2 transition-all w-full">
              <button
                onClick={toggleSidebar}
                className="h-8 w-8 flex items-center justify-center hover:bg-accent rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring shrink-0"
                aria-label="Toggle navigation"
              >
                <PanelLeft className="h-4 w-4 text-muted-foreground" />
              </button>
              {!isCollapsed ? (
                <div className="flex items-center gap-2 min-w-0">
                  <img src={LOGO_URL} alt="" className="h-6 w-6 object-contain" />
                  <span className="font-bold tracking-tight truncate text-ci-green">
                    Foncier225
                  </span>
                </div>
              ) : null}
            </div>
          </SidebarHeader>

          <SidebarContent className="gap-0">
            {menuCategories.map(category => (
              <AdminCollapsibleSection
                key={category.key}
                category={category}
                location={location}
                setLocation={setLocation}
                isCollapsed={isCollapsed}
              />
            ))}
          </SidebarContent>

          <SidebarFooter className="p-3">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-3 rounded-lg px-1 py-1 hover:bg-accent/50 transition-colors w-full text-left group-data-[collapsible=icon]:justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                  <Avatar className="h-9 w-9 border shrink-0">
                    <AvatarFallback className="text-xs font-medium bg-ci-green text-white">
                      {user?.name?.charAt(0).toUpperCase() || "A"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0 group-data-[collapsible=icon]:hidden">
                    <p className="text-sm font-medium truncate leading-none">
                      {user?.name || "Admin"}
                    </p>
                    <p className="text-xs text-muted-foreground truncate mt-1.5">
                      {user?.email || "—"}
                    </p>
                  </div>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={() => setLocation("/")} className="cursor-pointer">
                  <Home className="mr-2 h-4 w-4" />
                  <span>Site public</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={logout}
                  className="cursor-pointer text-destructive focus:text-destructive"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Déconnexion</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarFooter>
        </Sidebar>
        <div
          className={`absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-primary/20 transition-colors ${isCollapsed ? "hidden" : ""}`}
          onMouseDown={() => { if (!isCollapsed) setIsResizing(true); }}
          style={{ zIndex: 50 }}
        />
      </div>

      <SidebarInset>
        {isMobile && (
          <div className="flex border-b h-14 items-center justify-between bg-background/95 px-2 backdrop-blur supports-[backdrop-filter]:backdrop-blur sticky top-0 z-40">
            <div className="flex items-center gap-2">
              <SidebarTrigger className="h-9 w-9 rounded-lg bg-background" />
              <div className="flex items-center gap-3">
                <span className="tracking-tight text-foreground">
                  {activeMenuItem?.label ?? "Menu"}
                </span>
              </div>
            </div>
          </div>
        )}
        <main className="flex-1 p-6">{children}</main>
      </SidebarInset>
    </>
  );
}
