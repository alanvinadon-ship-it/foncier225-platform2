import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollText, Search, ChevronLeft, ChevronRight, Activity, Users, Clock } from "lucide-react";

export default function ErpAuditLogs() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [targetType, setTargetType] = useState("");
  const [searchInput, setSearchInput] = useState("");

  const { data, isLoading } = trpc.erp.auditLogs.list.useQuery({
    page,
    limit: 30,
    search: search || undefined,
    targetType: targetType || undefined,
  });

  const { data: stats } = trpc.erp.auditLogs.stats.useQuery();

  const handleSearch = () => {
    setSearch(searchInput);
    setPage(1);
  };

  const formatAction = (action: string) => {
    const parts = action.replace("erp.", "").split(".");
    return parts.join(" → ");
  };

  const getPriorityColor = (action: string) => {
    if (action.includes("delete")) return "text-red-600 bg-red-50";
    if (action.includes("create")) return "text-green-600 bg-green-50";
    if (action.includes("update") || action.includes("approve")) return "text-blue-600 bg-blue-50";
    if (action.includes("payment")) return "text-purple-600 bg-purple-50";
    if (action.includes("permission")) return "text-orange-600 bg-orange-50";
    return "text-gray-600 bg-gray-50";
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2"><ScrollText size={24} /> Journal d'audit</h1>
        <p className="text-muted-foreground">Traçabilité des actions sensibles ERP</p>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10"><Activity size={20} className="text-primary" /></div>
              <div>
                <p className="text-2xl font-bold">{stats?.totalLogs || 0}</p>
                <p className="text-xs text-muted-foreground">Total des logs ERP</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100"><Clock size={20} className="text-blue-600" /></div>
              <div>
                <p className="text-2xl font-bold">{stats?.last24h || 0}</p>
                <p className="text-xs text-muted-foreground">Dernières 24h</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-100"><Users size={20} className="text-green-600" /></div>
              <div>
                <p className="text-2xl font-bold">{stats?.last7d || 0}</p>
                <p className="text-xs text-muted-foreground">7 derniers jours</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filtres */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-wrap gap-3 items-end">
            <div className="flex-1 min-w-[200px]">
              <label className="text-xs font-medium mb-1 block">Recherche</label>
              <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={searchInput}
                  onChange={e => setSearchInput(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && handleSearch()}
                  className="pl-9"
                  placeholder="Action, type..."
                />
              </div>
            </div>
            <div className="min-w-[150px]">
              <label className="text-xs font-medium mb-1 block">Type cible</label>
              <select
                value={targetType}
                onChange={e => { setTargetType(e.target.value); setPage(1); }}
                className="w-full border border-border rounded-md px-3 py-2 text-sm bg-background"
              >
                <option value="">Tous</option>
                <option value="project">Projet</option>
                <option value="task">Tâche</option>
                <option value="invoice">Facture</option>
                <option value="payment">Paiement</option>
                <option value="document">Document</option>
                <option value="user_profile">Profil</option>
                <option value="budget">Budget</option>
                <option value="vendor">Fournisseur</option>
              </select>
            </div>
            <Button onClick={handleSearch} size="sm">Filtrer</Button>
          </div>
        </CardContent>
      </Card>

      {/* Tableau des logs */}
      <Card>
        <CardHeader><CardTitle>Événements ({data?.total || 0})</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-muted-foreground">Chargement...</p>
          ) : !data?.items?.length ? (
            <p className="text-muted-foreground text-center py-8">Aucun log d'audit trouvé</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left">
                    <th className="py-2 px-2 font-medium text-muted-foreground">Date</th>
                    <th className="py-2 px-2 font-medium text-muted-foreground">Acteur</th>
                    <th className="py-2 px-2 font-medium text-muted-foreground">Action</th>
                    <th className="py-2 px-2 font-medium text-muted-foreground">Cible</th>
                    <th className="py-2 px-2 font-medium text-muted-foreground">Détails</th>
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((log) => (
                    <tr key={log.id} className="border-b border-border/50 hover:bg-muted/30">
                      <td className="py-2 px-2 text-xs text-muted-foreground whitespace-nowrap">
                        {new Date(log.createdAt).toLocaleString("fr-FR", { day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit" })}
                      </td>
                      <td className="py-2 px-2">
                        <span className="font-medium text-xs">{log.actorName}</span>
                        {log.actorRole && <span className="text-[10px] text-muted-foreground ml-1">({log.actorRole})</span>}
                      </td>
                      <td className="py-2 px-2">
                        <span className={`text-xs px-2 py-0.5 rounded ${getPriorityColor(log.action)}`}>
                          {formatAction(log.action)}
                        </span>
                      </td>
                      <td className="py-2 px-2 text-xs">
                        {log.targetType && <span className="capitalize">{log.targetType}</span>}
                        {log.targetId && <span className="text-muted-foreground ml-1">#{log.targetId}</span>}
                      </td>
                      <td className="py-2 px-2 text-xs text-muted-foreground max-w-[200px] truncate">
                        {log.details ? JSON.stringify(log.details).slice(0, 60) : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {data && data.totalPages > 1 && (
            <div className="flex items-center justify-between mt-4 pt-4 border-t border-border">
              <p className="text-xs text-muted-foreground">
                Page {data.page} / {data.totalPages} ({data.total} résultats)
              </p>
              <div className="flex gap-1">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
                  <ChevronLeft size={14} />
                </Button>
                <Button variant="outline" size="sm" disabled={page >= data.totalPages} onClick={() => setPage(p => p + 1)}>
                  <ChevronRight size={14} />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
