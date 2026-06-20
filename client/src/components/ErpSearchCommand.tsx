/**
 * ERP Global Search Command (Ctrl+K)
 * Sprint 20 — Recherche globale ERP
 * 
 * Provides quick navigation and search across:
 * - Projects
 * - Tasks
 * - Invoices
 * - Inventory items
 * - Documents
 * - Pages/Navigation
 */
import { useState, useEffect, useCallback } from "react";
import { useLocation } from "wouter";
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandSeparator,
} from "@/components/ui/command";
import {
  FolderKanban,
  ListTodo,
  FileText,
  Package,
  Receipt,
  LayoutDashboard,
  Users,
  BarChart3,
  Shield,
  Truck,
  Search,
} from "lucide-react";
import { trpc } from "@/lib/trpc";

// Navigation items for quick access
const NAV_ITEMS = [
  { label: "Tableau de bord", path: "/erp", icon: LayoutDashboard, group: "Navigation" },
  { label: "Projets", path: "/erp/projects", icon: FolderKanban, group: "Navigation" },
  { label: "Gantt", path: "/erp/gantt", icon: BarChart3, group: "Navigation" },
  { label: "Factures", path: "/erp/invoices", icon: Receipt, group: "Navigation" },
  { label: "Inventaire", path: "/erp/inventory", icon: Package, group: "Navigation" },
  { label: "Fournisseurs", path: "/erp/vendors", icon: Truck, group: "Navigation" },
  { label: "Sécurité", path: "/erp/safety", icon: Shield, group: "Navigation" },
  { label: "Équipe", path: "/erp/contractors", icon: Users, group: "Navigation" },
  { label: "Documents", path: "/erp/documents", icon: FileText, group: "Navigation" },
  { label: "Budgets", path: "/erp/finance/budgets", icon: BarChart3, group: "Finance" },
  { label: "Trésorerie", path: "/erp/finance/treasury", icon: BarChart3, group: "Finance" },
  { label: "Rentabilité", path: "/erp/finance/profitability", icon: BarChart3, group: "Finance" },
  { label: "Demandes Matériel", path: "/erp/material-requests", icon: Package, group: "Inventaire" },
  { label: "Intégration Fournisseurs", path: "/erp/supplier-integration", icon: Truck, group: "Inventaire" },
  { label: "Analyse Gaspillages", path: "/erp/wastage", icon: BarChart3, group: "Inventaire" },
];

export function ErpSearchCommand() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [, navigate] = useLocation();

  // Listen for Ctrl+K / Cmd+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Search projects
  const { data: projectsData } = trpc.erp.projects.list.useQuery(
    { search: query, limit: 5, offset: 0 },
    { enabled: open && query.length >= 2 }
  );

  // Note: tasks require projectId, so we skip global task search
  // and rely on project search + navigation

  const handleSelect = useCallback((path: string) => {
    setOpen(false);
    setQuery("");
    navigate(path);
  }, [navigate]);

  // Filter nav items by query
  const filteredNav = query.length > 0
    ? NAV_ITEMS.filter(item => item.label.toLowerCase().includes(query.toLowerCase()))
    : NAV_ITEMS.slice(0, 8);

  const projects = projectsData?.projects || [];

  return (
    <>
      {/* Search trigger button */}
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 px-3 py-1.5 text-sm text-muted-foreground bg-muted/50 border border-border rounded-md hover:bg-muted transition-colors"
      >
        <Search className="h-4 w-4" />
        <span className="hidden sm:inline">Rechercher...</span>
        <kbd className="hidden sm:inline-flex h-5 items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
          <span className="text-xs">⌘</span>K
        </kbd>
      </button>

      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput
          placeholder="Rechercher un projet, une tâche, une page..."
          value={query}
          onValueChange={setQuery}
        />
        <CommandList>
          <CommandEmpty>Aucun résultat trouvé.</CommandEmpty>

          {/* Navigation rapide */}
          {filteredNav.length > 0 && (
            <CommandGroup heading="Navigation">
              {filteredNav.map((item) => (
                <CommandItem
                  key={item.path}
                  value={item.label}
                  onSelect={() => handleSelect(item.path)}
                >
                  <item.icon className="mr-2 h-4 w-4" />
                  <span>{item.label}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          )}

          {/* Projets trouvés */}
          {projects.length > 0 && (
            <>
              <CommandSeparator />
              <CommandGroup heading="Projets">
                {projects.map((project: any) => (
                  <CommandItem
                    key={`project-${project.id}`}
                    value={`${project.name} ${project.code}`}
                    onSelect={() => handleSelect(`/erp/projects/${project.id}`)}
                  >
                    <FolderKanban className="mr-2 h-4 w-4" />
                    <div className="flex flex-col">
                      <span>{project.name}</span>
                      <span className="text-xs text-muted-foreground">{project.code}</span>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            </>
          )}


        </CommandList>
      </CommandDialog>
    </>
  );
}
