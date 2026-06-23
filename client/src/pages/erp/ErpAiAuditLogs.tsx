import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Activity, Clock, Cpu, Zap } from "lucide-react";

export default function ErpAiAuditLogs() {
  const [moduleFilter, setModuleFilter] = useState<string>("");
  const [actionFilter, setActionFilter] = useState<string>("");
  const [page, setPage] = useState(1);

  const logsQuery = trpc.erp.aiAssistant.auditLogs.list.useQuery({
    module: moduleFilter || undefined,
    action: actionFilter || undefined,
    page,
    limit: 50,
  });

  const statsQuery = trpc.erp.aiAssistant.auditLogs.stats.useQuery();

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Activity className="h-6 w-6 text-indigo-500" />
          Journal d'audit IA
        </h1>
        <p className="text-muted-foreground">
          Historique complet des appels IA, tokens consommés et performances
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center">
              <Cpu className="h-5 w-5 text-indigo-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total appels</p>
              <p className="text-2xl font-bold">{statsQuery.data?.totalCalls || 0}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-purple-100 flex items-center justify-center">
              <Zap className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Tokens utilisés</p>
              <p className="text-2xl font-bold">{(statsQuery.data?.totalTokens || 0).toLocaleString()}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
              <Clock className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Durée moy.</p>
              <p className="text-2xl font-bold">{Math.round(statsQuery.data?.avgDuration || 0)}ms</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-red-100 flex items-center justify-center">
              <Activity className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Erreurs</p>
              <p className="text-2xl font-bold text-red-600">{statsQuery.data?.errorCount || 0}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Per-module breakdown */}
      {statsQuery.data?.perModule && statsQuery.data.perModule.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <h3 className="font-semibold mb-3">Répartition par module</h3>
            <div className="grid grid-cols-4 gap-3">
              {statsQuery.data.perModule.map((m: any) => (
                <div key={m.module} className="flex items-center justify-between p-2 rounded bg-muted/50">
                  <span className="text-sm capitalize">{m.module}</span>
                  <div className="text-right">
                    <span className="text-sm font-semibold">{m.calls}</span>
                    <span className="text-xs text-muted-foreground ml-1">appels</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <div className="flex gap-3">
        <Select value={moduleFilter} onValueChange={setModuleFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Tous modules" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous modules</SelectItem>
            <SelectItem value="general">Général</SelectItem>
            <SelectItem value="projects">Projets</SelectItem>
            <SelectItem value="budget">Budget</SelectItem>
            <SelectItem value="direction">Direction</SelectItem>
            <SelectItem value="inventory">Stock</SelectItem>
          </SelectContent>
        </Select>
        <Select value={actionFilter} onValueChange={setActionFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Toutes actions" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes actions</SelectItem>
            <SelectItem value="chat">Chat</SelectItem>
            <SelectItem value="summarize">Résumé</SelectItem>
            <SelectItem value="recommend">Recommandation</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Module</TableHead>
              <TableHead>Action</TableHead>
              <TableHead>Entrée</TableHead>
              <TableHead>Tokens</TableHead>
              <TableHead>Durée</TableHead>
              <TableHead>Statut</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {logsQuery.data?.logs.map(log => (
              <TableRow key={log.id}>
                <TableCell className="text-sm">
                  {new Date(log.createdAt).toLocaleString("fr-FR", {
                    day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit"
                  })}
                </TableCell>
                <TableCell className="capitalize">{log.module}</TableCell>
                <TableCell className="capitalize">{log.action}</TableCell>
                <TableCell className="max-w-xs truncate text-sm">{log.inputSummary}</TableCell>
                <TableCell>{log.tokensUsed || "-"}</TableCell>
                <TableCell>{log.durationMs ? `${log.durationMs}ms` : "-"}</TableCell>
                <TableCell>
                  <Badge variant={log.status === "success" ? "default" : "destructive"}>
                    {log.status}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
            {logsQuery.data?.logs.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  Aucun log d'audit
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>

      {/* Pagination */}
      {(logsQuery.data?.total || 0) > 50 && (
        <div className="flex justify-center gap-2">
          <button
            className="px-3 py-1 text-sm border rounded disabled:opacity-50"
            disabled={page <= 1}
            onClick={() => setPage(p => p - 1)}
          >
            Précédent
          </button>
          <span className="px-3 py-1 text-sm">
            Page {page} / {Math.ceil((logsQuery.data?.total || 0) / 50)}
          </span>
          <button
            className="px-3 py-1 text-sm border rounded disabled:opacity-50"
            disabled={page >= Math.ceil((logsQuery.data?.total || 0) / 50)}
            onClick={() => setPage(p => p + 1)}
          >
            Suivant
          </button>
        </div>
      )}
    </div>
  );
}
