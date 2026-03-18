import { useAuth } from "@/_core/hooks/useAuth";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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
import { Building2, ClipboardList, Home, LogOut, PanelLeft } from "lucide-react";
import { CSSProperties, useEffect, useRef, useState } from "react";
import { Link, useLocation } from "wouter";
import { DashboardLayoutSkeleton } from "../DashboardLayoutSkeleton";
import { Button } from "../ui/button";

const LOGO_URL = "https://d2xsxph8kpxj0f.cloudfront.net/310519663315306103/5jQVPXrA6y6Zze2FEtSNJt/foncier225-logo-8Tu2AjJfXPzkTY5ufdWVtP.webp";
const menuItems = [{ icon: ClipboardList, label: "Work queue credit", path: "/bank/credit-files" }];
const SIDEBAR_WIDTH_KEY = "bank-sidebar-width";
const DEFAULT_WIDTH = 260;
const MIN_WIDTH = 200;
const MAX_WIDTH = 400;

export function BankLayout({
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
      <div className="flex min-h-screen items-center justify-center bg-sky-50/60">
        <div className="flex w-full max-w-md flex-col items-center gap-8 p-8">
          <img src={LOGO_URL} alt="Foncier225" className="h-16 w-16 object-contain" />
          <div className="space-y-3 text-center">
            <h1 className="text-2xl font-bold tracking-tight">Portail Banque</h1>
            <p className="text-sm text-muted-foreground">
              Connectez-vous pour acceder a la file de revue des dossiers credit habitat.
            </p>
          </div>
          <Button
            className="w-full bg-sky-700 hover:bg-sky-800"
            onClick={() => { window.location.href = getLoginUrl(); }}
            size="lg"
          >
            Se connecter
          </Button>
        </div>
      </div>
    );
  }

  if (user.role !== "bank") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100">
        <div className="flex w-full max-w-md flex-col items-center gap-6 p-8 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-200">
            <Building2 className="h-8 w-8 text-slate-700" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Acces refuse</h1>
          <p className="text-sm text-muted-foreground">
            Cet espace est reserve aux utilisateurs banque autorises.
          </p>
          <Link href="/">
            <Button variant="outline">
              <Home className="mr-2 h-4 w-4" />
              Retour a l'accueil
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
      <BankLayoutContent setSidebarWidth={setSidebarWidth}>{children}</BankLayoutContent>
    </SidebarProvider>
  );
}

function BankLayoutContent({
  children,
  setSidebarWidth,
}: {
  children: React.ReactNode;
  setSidebarWidth: (width: number) => void;
}) {
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
    const handleMouseMove = (event: MouseEvent) => {
      if (!isResizing) return;
      const sidebarLeft = sidebarRef.current?.getBoundingClientRect().left ?? 0;
      const newWidth = event.clientX - sidebarLeft;
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
      <div ref={sidebarRef} className="relative">
        <Sidebar collapsible="icon" className="border-r-0" disableTransition={isResizing}>
          <SidebarHeader className="h-16 justify-center">
            <div className="flex w-full items-center gap-3 px-2">
              <button
                aria-label="Toggle navigation"
                className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-accent"
                onClick={toggleSidebar}
              >
                <PanelLeft className="h-4 w-4 text-muted-foreground" />
              </button>
              {!isCollapsed ? (
                <div className="flex min-w-0 items-center gap-2">
                  <img src={LOGO_URL} alt="" className="h-6 w-6 object-contain" />
                  <span className="truncate font-bold tracking-tight text-sky-700">Portail Banque</span>
                </div>
              ) : null}
            </div>
          </SidebarHeader>

          <SidebarContent className="gap-0">
            <SidebarMenu className="px-2 py-1">
              {menuItems.map(item => {
                const isActive = location === item.path || location.startsWith(`${item.path}/`);
                return (
                  <SidebarMenuItem key={item.path}>
                    <SidebarMenuButton
                      isActive={isActive}
                      onClick={() => setLocation(item.path)}
                      tooltip={item.label}
                      className="h-10 font-normal"
                    >
                      <item.icon className={`h-4 w-4 ${isActive ? "text-sky-700" : ""}`} />
                      <span>{item.label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarContent>

          <SidebarFooter className="p-3">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex w-full items-center gap-3 rounded-lg px-1 py-1 text-left hover:bg-accent/50">
                  <Avatar className="h-9 w-9 border">
                    <AvatarFallback className="bg-sky-700 text-xs font-medium text-white">
                      {user?.name?.charAt(0).toUpperCase() || "B"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1 group-data-[collapsible=icon]:hidden">
                    <p className="truncate text-sm font-medium leading-none">{user?.name || "Banque"}</p>
                    <p className="mt-1.5 truncate text-xs text-muted-foreground">{user?.email || "-"}</p>
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
                  <span>Deconnexion</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarFooter>
        </Sidebar>
        <div
          className={`absolute right-0 top-0 h-full w-1 cursor-col-resize transition-colors hover:bg-primary/20 ${isCollapsed ? "hidden" : ""}`}
          onMouseDown={() => { if (!isCollapsed) setIsResizing(true); }}
          style={{ zIndex: 50 }}
        />
      </div>

      <SidebarInset>
        {isMobile ? (
          <div className="sticky top-0 z-40 flex h-14 items-center justify-between border-b bg-background/95 px-2 backdrop-blur">
            <div className="flex items-center gap-2">
              <SidebarTrigger className="h-9 w-9 rounded-lg bg-background" />
              <span className="tracking-tight text-foreground">{activeMenuItem?.label ?? "Menu"}</span>
            </div>
          </div>
        ) : null}
        <main className="flex-1 p-6">{children}</main>
      </SidebarInset>
    </>
  );
}
