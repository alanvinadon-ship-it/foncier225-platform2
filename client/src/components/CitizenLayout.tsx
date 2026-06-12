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
import { useIsMobile } from "@/hooks/useMobile";
import { Banknote, Bell as BellIcon, Building2, ChevronDown, CreditCard, FileText, FolderOpen, Home, Landmark, LayoutDashboard, LogOut, MapPin, PanelLeft, Clock, PlusCircle, User, Search, GitBranch } from "lucide-react";
import { CSSProperties, useEffect, useRef, useState } from "react";
import { Link, useLocation } from "wouter";
import { DashboardLayoutSkeleton } from "./DashboardLayoutSkeleton";
import { Button } from "./ui/button";
import NotificationBell from "./NotificationBell";
import { trpc } from "@/lib/trpc";

const LOGO_URL = "https://d2xsxph8kpxj0f.cloudfront.net/310519663315306103/5jQVPXrA6y6Zze2FEtSNJt/foncier225-logo-8Tu2AjJfXPzkTY5ufdWVtP.webp";

type MenuItem = { icon: any; label: string; path: string; badge: boolean };
type MenuCategory = { title: string; color: string; iconColor: string; key: "common" | "rural" | "urban"; items: MenuItem[] };

const menuCategories: MenuCategory[] = [
  {
    title: "Commun",
    color: "text-ci-orange",
    iconColor: "text-ci-orange",
    key: "common",
    items: [
      { icon: PlusCircle, label: "Nouvelle demande", path: "/citizen/new-application", badge: false },
      { icon: LayoutDashboard, label: "Tableau de bord", path: "/citizen", badge: false },
      { icon: MapPin, label: "Mes parcelles", path: "/citizen/parcels", badge: false },
      { icon: Banknote, label: "Crédit habitat", path: "/citizen/credit-habitat", badge: false },
      { icon: FolderOpen, label: "Mes dossiers", path: "/citizen/my-dossiers", badge: false },
      { icon: CreditCard, label: "Paiements", path: "/citizen/payments", badge: false },
      { icon: Search, label: "Suivi dossier", path: "/citizen/suivi", badge: false },
      { icon: BellIcon, label: "Alertes", path: "/citizen/notifications", badge: false },
      { icon: User, label: "Mon profil", path: "/citizen/profile", badge: false },
    ],
  },
  {
    title: "Foncier Rural",
    color: "text-emerald-600",
    iconColor: "text-emerald-600",
    key: "rural",
    items: [
      { icon: GitBranch, label: "Processus", path: "/citizen/workflow", badge: false },
      { icon: Clock, label: "Timeline", path: "/citizen/timeline", badge: false },
      { icon: FileText, label: "Mes documents", path: "/citizen/documents", badge: false },
      { icon: Landmark, label: "Titre foncier", path: "/citizen/land-title", badge: false },
    ],
  },
  {
    title: "Foncier Urbain",
    color: "text-blue-600",
    iconColor: "text-blue-600",
    key: "urban",
    items: [
      { icon: Building2, label: "Foncier urbain (ACD)", path: "/citizen/urban-acd", badge: false },
      { icon: GitBranch, label: "Processus ACD", path: "/citizen/urban-workflow", badge: false },
    ],
  },
];

// Flat list for active item detection
const menuItems = menuCategories.flatMap(c => c.items);

const COLLAPSED_SECTIONS_KEY = "citizen-collapsed-sections";

const SIDEBAR_WIDTH_KEY = "citizen-sidebar-width";
const DEFAULT_WIDTH = 260;
const MIN_WIDTH = 200;
const MAX_WIDTH = 400;

/** Collapsible sidebar section with colored label, chevron, and active dossier badge */
function CollapsibleSection({
  category,
  location,
  setLocation,
  isCollapsed,
}: {
  category: MenuCategory;
  location: string;
  setLocation: (path: string) => void;
  isCollapsed: boolean;
}) {
  const [open, setOpen] = useState(() => {
    try {
      const saved = localStorage.getItem(COLLAPSED_SECTIONS_KEY);
      if (saved) {
        const collapsed: string[] = JSON.parse(saved);
        return !collapsed.includes(category.key);
      }
    } catch {}
    return true;
  });

  // Persist collapsed state
  useEffect(() => {
    try {
      const saved = localStorage.getItem(COLLAPSED_SECTIONS_KEY);
      const collapsed: string[] = saved ? JSON.parse(saved) : [];
      if (!open && !collapsed.includes(category.key)) {
        localStorage.setItem(COLLAPSED_SECTIONS_KEY, JSON.stringify([...collapsed, category.key]));
      } else if (open && collapsed.includes(category.key)) {
        localStorage.setItem(COLLAPSED_SECTIONS_KEY, JSON.stringify(collapsed.filter(k => k !== category.key)));
      }
    } catch {}
  }, [open, category.key]);

  // Active dossier counts
  const { data: counts } = trpc.citizen.activeDossierCounts.useQuery(undefined, {
    refetchInterval: 60000,
  });
  const badgeCount = category.key === "rural" ? (counts?.rural ?? 0)
    : category.key === "urban" ? (counts?.urban ?? 0)
    : 0;

  // When sidebar is in icon mode, render items without collapsible wrapper
  if (isCollapsed) {
    return (
      <SidebarGroup>
        <SidebarGroupContent>
          <SidebarMenu>
            {category.items.map(item => {
              const isActive = location === item.path || location.startsWith(`${item.path}/`);
              return (
                <SidebarMenuItem key={item.path}>
                  <SidebarMenuButton
                    isActive={isActive}
                    onClick={() => setLocation(item.path)}
                    tooltip={item.label}
                    className="h-10 transition-all font-normal"
                  >
                    <item.icon className={`h-4 w-4 ${isActive ? category.iconColor : ""}`} />
                    <span className="flex-1">{item.label}</span>
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
            {badgeCount > 0 && (
              <span className={`flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[10px] font-bold text-white ${category.key === "rural" ? "bg-emerald-600" : "bg-blue-600"}`}>
                {badgeCount}
              </span>
            )}
            <ChevronDown className={`h-3.5 w-3.5 ml-1 transition-transform duration-200 ${open ? "" : "-rotate-90"}`} />
          </SidebarGroupLabel>
        </CollapsibleTrigger>
        <CollapsibleContent className="transition-all data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down">
          <SidebarGroupContent>
            <SidebarMenu>
              {category.items.map(item => {
                const isActive = location === item.path || location.startsWith(`${item.path}/`);
                return (
                  <SidebarMenuItem key={item.path}>
                    <SidebarMenuButton
                      isActive={isActive}
                      onClick={() => setLocation(item.path)}
                      tooltip={item.label}
                      className="h-10 transition-all font-normal"
                    >
                      <item.icon className={`h-4 w-4 ${isActive ? category.iconColor : ""}`} />
                      <span className="flex-1">{item.label}</span>
                      {item.badge && <NotificationBadge />}
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

/** Badge showing unread status_change notifications count in the sidebar */
function NotificationBadge() {
  const { data: unreadCount } = trpc.citizen.unreadNotificationsCount.useQuery(undefined, {
    refetchInterval: 30000, // Poll every 30s
  });
  const count = unreadCount ?? 0;
  if (count === 0) return null;
  return (
    <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground animate-pulse">
      {count > 99 ? "99+" : count}
    </span>
  );
}

export default function CitizenLayout({
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
    return <DashboardLayoutSkeleton />;
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-ci-green-light/30">
        <div className="flex flex-col items-center gap-8 p-8 max-w-md w-full">
          <img src={LOGO_URL} alt="Foncier225" className="h-16 w-16 object-contain" />
          <div className="flex flex-col items-center gap-4">
            <h1 className="text-2xl font-bold tracking-tight text-center">
              Espace Citoyen
            </h1>
            <p className="text-sm text-muted-foreground text-center max-w-sm">
              Connectez-vous pour accéder à votre espace personnel et suivre vos parcelles.
            </p>
          </div>
          <Button
            onClick={() => { window.location.href = getLoginUrl(); }}
            size="lg"
            className="w-full bg-ci-orange hover:bg-ci-orange/90 shadow-lg"
          >
            Se connecter
          </Button>
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
      <CitizenLayoutContent setSidebarWidth={setSidebarWidth}>
        {children}
      </CitizenLayoutContent>
    </SidebarProvider>
  );
}

type CitizenLayoutContentProps = {
  children: React.ReactNode;
  setSidebarWidth: (width: number) => void;
};

function CitizenLayoutContent({
  children,
  setSidebarWidth,
}: CitizenLayoutContentProps) {
  const { user, logout } = useAuth();
  const [location, setLocation] = useLocation();
  const { state, toggleSidebar } = useSidebar();
  const isCollapsed = state === "collapsed";
  const [isResizing, setIsResizing] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const activeMenuItem = menuItems.find(item => location === item.path || location.startsWith(`${item.path}/`));
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
                  <span className="font-bold tracking-tight truncate text-ci-orange">
                    Mon Espace
                  </span>
                </div>
              ) : null}
            </div>
          </SidebarHeader>

          <SidebarContent className="gap-0">
            {menuCategories.map(category => (
              <CollapsibleSection
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
                    <AvatarFallback className="text-xs font-medium bg-ci-orange text-white">
                      {user?.name?.charAt(0).toUpperCase() || "C"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0 group-data-[collapsible=icon]:hidden">
                    <p className="text-sm font-medium truncate leading-none">
                      {user?.name || "Citoyen"}
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
            <NotificationBell />
          </div>
        )}
        {!isMobile && (
          <div className="flex justify-end px-6 pt-4">
            <NotificationBell />
          </div>
        )}
        <main className="flex-1 p-6">{children}</main>
      </SidebarInset>
    </>
  );
}
