import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { useErpPermissions } from "@/hooks/useErpPermissions";
import {
  Shield, Search, Plus, AlertTriangle, AlertOctagon, CheckCircle,
  Clock, FileText, ClipboardCheck, XCircle, Eye, Activity
} from "lucide-react";

// ============================================================
// CONSTANTS
// ============================================================

const SEVERITY_CONFIG: Record<string, { label: string; color: string; icon: typeof AlertTriangle }> = {
  low: { label: "Faible", color: "bg-green-100 text-green-800", icon: CheckCircle },
  medium: { label: "Moyen", color: "bg-yellow-100 text-yellow-800", icon: AlertTriangle },
  high: { label: "Élevé", color: "bg-orange-100 text-orange-800", icon: AlertOctagon },
  critical: { label: "Critique", color: "bg-red-100 text-red-800", icon: XCircle },
};

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  open: { label: "Ouvert", color: "bg-red-100 text-red-800" },
  under_review: { label: "En examen", color: "bg-yellow-100 text-yellow-800" },
  corrective_action: { label: "Action corrective", color: "bg-blue-100 text-blue-800" },
  resolved: { label: "Résolu", color: "bg-green-100 text-green-800" },
  closed: { label: "Clôturé", color: "bg-gray-100 text-gray-600" },
};

const AUDIT_TYPE_LABELS: Record<string, string> = {
  general: "Général",
  fire: "Incendie",
  electrical: "Électrique",
  structural: "Structurel",
  environmental: "Environnemental",
  ppe: "EPI",
  autre: "Autre",
};

const AUDIT_STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  planned: { label: "Planifié", color: "bg-blue-100 text-blue-800" },
  in_progress: { label: "En cours", color: "bg-yellow-100 text-yellow-800" },
  completed: { label: "Terminé", color: "bg-green-100 text-green-800" },
  cancelled: { label: "Annulé", color: "bg-gray-100 text-gray-600" },
};

const CA_STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  pending: { label: "En attente", color: "bg-yellow-100 text-yellow-800" },
  in_progress: { label: "En cours", color: "bg-blue-100 text-blue-800" },
  completed: { label: "Terminé", color: "bg-green-100 text-green-800" },
  cancelled: { label: "Annulé", color: "bg-gray-100 text-gray-600" },
};

function formatDate(ts: number | null | undefined) {
  if (!ts) return "—";
  return new Date(ts).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
}

// ============================================================
// MAIN COMPONENT
// ============================================================

export default function ErpSafety() {
  const { hasPermission } = useErpPermissions();
  const [activeTab, setActiveTab] = useState("dashboard");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Shield className="h-7 w-7 text-orange-600" />
          <div>
            <h1 className="text-2xl font-bold">Sécurité</h1>
            <p className="text-sm text-muted-foreground">Gestion des incidents, audits et actions correctives</p>
          </div>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="dashboard"><Activity className="h-4 w-4 mr-1" />Dashboard</TabsTrigger>
          <TabsTrigger value="incidents"><AlertTriangle className="h-4 w-4 mr-1" />Incidents</TabsTrigger>
          <TabsTrigger value="audits"><ClipboardCheck className="h-4 w-4 mr-1" />Audits</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard"><SafetyDashboard /></TabsContent>
        <TabsContent value="incidents"><IncidentsTab /></TabsContent>
        <TabsContent value="audits"><AuditsTab /></TabsContent>
      </Tabs>
    </div>
  );
}

// ============================================================
// DASHBOARD TAB
// ============================================================

function SafetyDashboard() {
  const { data: stats, isLoading } = trpc.erp.safety.stats.useQuery();

  if (isLoading) return <div className="text-center py-8 text-muted-foreground">Chargement...</div>;
  if (!stats) return null;

  return (
    <div className="space-y-6 mt-4">
      {/* Critical Alert */}
      {stats.incidents.criticalActive > 0 && (
        <Card className="border-red-300 bg-red-50">
          <CardContent className="flex items-center gap-3 py-4">
            <AlertOctagon className="h-6 w-6 text-red-600" />
            <span className="font-semibold text-red-800">
              {stats.incidents.criticalActive} incident(s) critique(s) actif(s) — Action immédiate requise
            </span>
          </CardContent>
        </Card>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total incidents</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.incidents.total}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats.incidents.open} ouvert(s), {stats.incidents.resolved} résolu(s)
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Incidents actifs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-orange-600">
              {stats.incidents.open + stats.incidents.underReview + stats.incidents.correctiveAction}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Nécessitant un suivi
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Audits réalisés</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-600">{stats.audits.completed}</div>
            <p className="text-xs text-muted-foreground mt-1">
              sur {stats.audits.total} planifié(s)
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Actions correctives</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">{stats.correctiveActions.completed}</div>
            <p className="text-xs text-muted-foreground mt-1">
              terminées / {stats.correctiveActions.total} total ({stats.correctiveActions.pending} en attente)
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Status breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Répartition des incidents par statut</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
              <div key={key} className="text-center p-3 rounded-lg bg-muted/50">
                <div className="text-2xl font-bold">{(stats.incidents as any)[key] ?? 0}</div>
                <Badge variant="secondary" className={cfg.color}>{cfg.label}</Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================================
// INCIDENTS TAB
// ============================================================

function IncidentsTab() {
  const { hasPermission } = useErpPermissions();
  const [search, setSearch] = useState("");
  const [severityFilter, setSeverityFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [page, setPage] = useState(0);
  const [createOpen, setCreateOpen] = useState(false);
  const [detailId, setDetailId] = useState<number | null>(null);
  const limit = 15;

  const utils = trpc.useUtils();

  const { data: listData, isLoading } = trpc.erp.safety.listIncidents.useQuery({
    search: search || undefined,
    severity: severityFilter !== "all" ? severityFilter as any : undefined,
    status: statusFilter !== "all" ? statusFilter as any : undefined,
    limit,
    offset: page * limit,
  });

  const { data: projects } = trpc.erp.projects.list.useQuery({ limit: 100 });

  return (
    <div className="space-y-4 mt-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher un incident..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(0); }}
            className="pl-9"
          />
        </div>
        <Select value={severityFilter} onValueChange={(v) => { setSeverityFilter(v); setPage(0); }}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder="Gravité" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes gravités</SelectItem>
            {Object.entries(SEVERITY_CONFIG).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(0); }}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder="Statut" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous statuts</SelectItem>
            {Object.entries(STATUS_CONFIG).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {hasPermission("erp_safety", "create") && (
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4 mr-1" />Déclarer
          </Button>
        )}
      </div>

      {/* List */}
      {isLoading ? (
        <div className="text-center py-8 text-muted-foreground">Chargement...</div>
      ) : !listData?.items.length ? (
        <Card><CardContent className="py-8 text-center text-muted-foreground">Aucun incident trouvé</CardContent></Card>
      ) : (
        <div className="space-y-2">
          {listData.items.map((inc) => {
            const sev = SEVERITY_CONFIG[inc.severity] || SEVERITY_CONFIG.medium;
            const st = STATUS_CONFIG[inc.status] || STATUS_CONFIG.open;
            const SevIcon = sev.icon;
            return (
              <Card key={inc.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setDetailId(inc.id)}>
                <CardContent className="flex items-center gap-4 py-3">
                  <SevIcon className={`h-5 w-5 ${sev.color.includes("red") ? "text-red-600" : sev.color.includes("orange") ? "text-orange-600" : sev.color.includes("yellow") ? "text-yellow-600" : "text-green-600"}`} />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{inc.title}</div>
                    <div className="text-xs text-muted-foreground">
                      {formatDate(inc.incidentDate)} {inc.location && `• ${inc.location}`}
                    </div>
                  </div>
                  <Badge variant="secondary" className={sev.color}>{sev.label}</Badge>
                  <Badge variant="secondary" className={st.color}>{st.label}</Badge>
                </CardContent>
              </Card>
            );
          })}

          {/* Pagination */}
          {listData.total > limit && (
            <div className="flex justify-between items-center pt-2">
              <span className="text-sm text-muted-foreground">
                {page * limit + 1}–{Math.min((page + 1) * limit, listData.total)} sur {listData.total}
              </span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(p => p - 1)}>Précédent</Button>
                <Button variant="outline" size="sm" disabled={(page + 1) * limit >= listData.total} onClick={() => setPage(p => p + 1)}>Suivant</Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Create Dialog */}
      {createOpen && (
        <CreateIncidentDialog
          open={createOpen}
          onClose={() => setCreateOpen(false)}
          projects={projects?.projects || []}
          onSuccess={() => { utils.erp.safety.listIncidents.invalidate(); utils.erp.safety.stats.invalidate(); }}
        />
      )}

      {/* Detail Dialog */}
      {detailId && (
        <IncidentDetailDialog
          id={detailId}
          onClose={() => setDetailId(null)}
          onSuccess={() => { utils.erp.safety.listIncidents.invalidate(); utils.erp.safety.stats.invalidate(); }}
        />
      )}
    </div>
  );
}

// ============================================================
// CREATE INCIDENT DIALOG
// ============================================================

function CreateIncidentDialog({ open, onClose, projects, onSuccess }: {
  open: boolean;
  onClose: () => void;
  projects: { id: number; name: string }[];
  onSuccess: () => void;
}) {
  const [form, setForm] = useState({
    title: "", description: "", severity: "medium" as string,
    location: "", projectId: "", incidentDate: new Date().toISOString().slice(0, 10),
  });

  const createMut = trpc.erp.safety.createIncident.useMutation({
    onSuccess: () => { toast.success("Incident déclaré"); onSuccess(); onClose(); },
    onError: (e) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Déclarer un incident</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Titre *</Label>
            <Input value={form.title} onChange={(e) => setForm(f => ({ ...f, title: e.target.value }))} />
          </div>
          <div>
            <Label>Description</Label>
            <Textarea value={form.description} onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Gravité *</Label>
              <Select value={form.severity} onValueChange={(v) => setForm(f => ({ ...f, severity: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(SEVERITY_CONFIG).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Date de l'incident *</Label>
              <Input type="date" value={form.incidentDate} onChange={(e) => setForm(f => ({ ...f, incidentDate: e.target.value }))} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Localisation</Label>
              <Input value={form.location} onChange={(e) => setForm(f => ({ ...f, location: e.target.value }))} />
            </div>
            <div>
              <Label>Projet</Label>
              <Select value={form.projectId} onValueChange={(v) => setForm(f => ({ ...f, projectId: v }))}>
                <SelectTrigger><SelectValue placeholder="Aucun" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Aucun</SelectItem>
                  {projects.map(p => <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Annuler</Button>
          <Button
            disabled={!form.title || createMut.isPending}
            onClick={() => createMut.mutate({
              title: form.title,
              description: form.description || undefined,
              severity: form.severity as any,
              location: form.location || undefined,
              incidentDate: new Date(form.incidentDate).getTime(),
              projectId: form.projectId && form.projectId !== "none" ? Number(form.projectId) : undefined,
            })}
          >
            {createMut.isPending ? "..." : "Déclarer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================
// INCIDENT DETAIL DIALOG
// ============================================================

function IncidentDetailDialog({ id, onClose, onSuccess }: {
  id: number;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const { hasPermission } = useErpPermissions();
  const [addCAOpen, setAddCAOpen] = useState(false);
  const [caForm, setCaForm] = useState({ title: "", description: "", assignedTo: "", priority: "medium", dueDate: "" });
  const [resolveNotes, setResolveNotes] = useState("");
  const [closeNotes, setCloseNotes] = useState("");

  const { data: incident, isLoading } = trpc.erp.safety.getIncident.useQuery({ id });
  const utils = trpc.useUtils();

  const addCAMut = trpc.erp.safety.addCorrectiveAction.useMutation({
    onSuccess: () => { toast.success("Action corrective ajoutée"); setAddCAOpen(false); setCaForm({ title: "", description: "", assignedTo: "", priority: "medium", dueDate: "" }); utils.erp.safety.getIncident.invalidate({ id }); onSuccess(); },
    onError: (e) => toast.error(e.message),
  });

  const resolveMut = trpc.erp.safety.resolveIncident.useMutation({
    onSuccess: () => { toast.success("Incident résolu"); utils.erp.safety.getIncident.invalidate({ id }); onSuccess(); },
    onError: (e) => toast.error(e.message),
  });

  const closeMut = trpc.erp.safety.closeIncident.useMutation({
    onSuccess: () => { toast.success("Incident clôturé"); utils.erp.safety.getIncident.invalidate({ id }); onSuccess(); },
    onError: (e) => toast.error(e.message),
  });

  const updateCAMut = trpc.erp.safety.updateCorrectiveAction.useMutation({
    onSuccess: () => { toast.success("Action mise à jour"); utils.erp.safety.getIncident.invalidate({ id }); },
    onError: (e) => toast.error(e.message),
  });

  if (isLoading) return <Dialog open onOpenChange={onClose}><DialogContent><div className="py-8 text-center">Chargement...</div></DialogContent></Dialog>;
  if (!incident) return null;

  const sev = SEVERITY_CONFIG[incident.severity] || SEVERITY_CONFIG.medium;
  const st = STATUS_CONFIG[incident.status] || STATUS_CONFIG.open;

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Incident #{incident.id}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Header */}
          <div>
            <h3 className="text-lg font-semibold">{incident.title}</h3>
            <div className="flex gap-2 mt-2">
              <Badge className={sev.color}>{sev.label}</Badge>
              <Badge className={st.color}>{st.label}</Badge>
            </div>
          </div>

          {/* Info */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div><span className="text-muted-foreground">Date :</span> {formatDate(incident.incidentDate)}</div>
            <div><span className="text-muted-foreground">Lieu :</span> {incident.location || "—"}</div>
            {incident.resolvedAt && <div><span className="text-muted-foreground">Résolu le :</span> {formatDate(incident.resolvedAt)}</div>}
            {incident.closedAt && <div><span className="text-muted-foreground">Clôturé le :</span> {formatDate(incident.closedAt)}</div>}
          </div>

          {incident.description && (
            <div>
              <Label className="text-muted-foreground">Description</Label>
              <p className="text-sm mt-1">{incident.description}</p>
            </div>
          )}

          {incident.resolutionNotes && (
            <div>
              <Label className="text-muted-foreground">Notes de résolution</Label>
              <p className="text-sm mt-1">{incident.resolutionNotes}</p>
            </div>
          )}

          {/* Corrective Actions */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-medium">Actions correctives ({incident.correctiveActions.length})</h4>
              {hasPermission("erp_safety", "create") && incident.status !== "closed" && (
                <Button size="sm" variant="outline" onClick={() => setAddCAOpen(true)}>
                  <Plus className="h-3 w-3 mr-1" />Ajouter
                </Button>
              )}
            </div>

            {incident.correctiveActions.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucune action corrective</p>
            ) : (
              <div className="space-y-2">
                {incident.correctiveActions.map(ca => {
                  const caSt = CA_STATUS_CONFIG[ca.status] || CA_STATUS_CONFIG.pending;
                  return (
                    <div key={ca.id} className="flex items-center gap-3 p-2 rounded border">
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate">{ca.title}</div>
                        <div className="text-xs text-muted-foreground">
                          {ca.assignedTo && `Assigné: ${ca.assignedTo}`} {ca.dueDate && `• Échéance: ${formatDate(ca.dueDate)}`}
                        </div>
                      </div>
                      <Badge variant="secondary" className={caSt.color}>{caSt.label}</Badge>
                      {ca.status === "pending" && hasPermission("erp_safety", "create") && (
                        <Button size="sm" variant="ghost" onClick={() => updateCAMut.mutate({ id: ca.id, status: "completed" })}>
                          <CheckCircle className="h-4 w-4 text-green-600" />
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Actions */}
          {hasPermission("erp_safety", "validate") && (
            <div className="border-t pt-4 space-y-3">
              {incident.status !== "resolved" && incident.status !== "closed" && (
                <div className="flex gap-2 items-end">
                  <div className="flex-1">
                    <Label>Notes de résolution</Label>
                    <Input value={resolveNotes} onChange={(e) => setResolveNotes(e.target.value)} placeholder="Optionnel" />
                  </div>
                  <Button onClick={() => resolveMut.mutate({ id, resolutionNotes: resolveNotes || undefined })} disabled={resolveMut.isPending}>
                    <CheckCircle className="h-4 w-4 mr-1" />Résoudre
                  </Button>
                </div>
              )}
              {incident.status === "resolved" && (
                <div className="flex gap-2 items-end">
                  <div className="flex-1">
                    <Label>Notes de clôture</Label>
                    <Input value={closeNotes} onChange={(e) => setCloseNotes(e.target.value)} placeholder="Optionnel" />
                  </div>
                  <Button variant="secondary" onClick={() => closeMut.mutate({ id, closureNotes: closeNotes || undefined })} disabled={closeMut.isPending}>
                    <XCircle className="h-4 w-4 mr-1" />Clôturer
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Add Corrective Action sub-dialog */}
        {addCAOpen && (
          <Dialog open={addCAOpen} onOpenChange={setAddCAOpen}>
            <DialogContent>
              <DialogHeader><DialogTitle>Ajouter une action corrective</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div>
                  <Label>Titre *</Label>
                  <Input value={caForm.title} onChange={(e) => setCaForm(f => ({ ...f, title: e.target.value }))} />
                </div>
                <div>
                  <Label>Description</Label>
                  <Textarea value={caForm.description} onChange={(e) => setCaForm(f => ({ ...f, description: e.target.value }))} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Assigné à</Label>
                    <Input value={caForm.assignedTo} onChange={(e) => setCaForm(f => ({ ...f, assignedTo: e.target.value }))} />
                  </div>
                  <div>
                    <Label>Priorité</Label>
                    <Select value={caForm.priority} onValueChange={(v) => setCaForm(f => ({ ...f, priority: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Faible</SelectItem>
                        <SelectItem value="medium">Moyen</SelectItem>
                        <SelectItem value="high">Élevé</SelectItem>
                        <SelectItem value="critical">Critique</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label>Date d'échéance</Label>
                  <Input type="date" value={caForm.dueDate} onChange={(e) => setCaForm(f => ({ ...f, dueDate: e.target.value }))} />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setAddCAOpen(false)}>Annuler</Button>
                <Button
                  disabled={!caForm.title || addCAMut.isPending}
                  onClick={() => addCAMut.mutate({
                    incidentId: id,
                    title: caForm.title,
                    description: caForm.description || undefined,
                    assignedTo: caForm.assignedTo || undefined,
                    priority: caForm.priority as any,
                    dueDate: caForm.dueDate ? new Date(caForm.dueDate).getTime() : undefined,
                  })}
                >
                  Ajouter
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ============================================================
// AUDITS TAB
// ============================================================

function AuditsTab() {
  const { hasPermission } = useErpPermissions();
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [page, setPage] = useState(0);
  const [createOpen, setCreateOpen] = useState(false);
  const limit = 15;

  const utils = trpc.useUtils();

  const { data: listData, isLoading } = trpc.erp.safety.listAudits.useQuery({
    search: search || undefined,
    auditType: typeFilter !== "all" ? typeFilter as any : undefined,
    status: statusFilter !== "all" ? statusFilter as any : undefined,
    limit,
    offset: page * limit,
  });

  const { data: projects } = trpc.erp.projects.list.useQuery({ limit: 100 });

  return (
    <div className="space-y-4 mt-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher un audit..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(0); }}
            className="pl-9"
          />
        </div>
        <Select value={typeFilter} onValueChange={(v) => { setTypeFilter(v); setPage(0); }}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder="Type" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous types</SelectItem>
            {Object.entries(AUDIT_TYPE_LABELS).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(0); }}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder="Statut" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous statuts</SelectItem>
            {Object.entries(AUDIT_STATUS_CONFIG).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {hasPermission("erp_safety", "create") && (
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4 mr-1" />Nouvel audit
          </Button>
        )}
      </div>

      {/* List */}
      {isLoading ? (
        <div className="text-center py-8 text-muted-foreground">Chargement...</div>
      ) : !listData?.items.length ? (
        <Card><CardContent className="py-8 text-center text-muted-foreground">Aucun audit trouvé</CardContent></Card>
      ) : (
        <div className="space-y-2">
          {listData.items.map((audit) => {
            const st = AUDIT_STATUS_CONFIG[audit.status] || AUDIT_STATUS_CONFIG.planned;
            return (
              <Card key={audit.id}>
                <CardContent className="flex items-center gap-4 py-3">
                  <ClipboardCheck className="h-5 w-5 text-blue-600" />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{audit.title}</div>
                    <div className="text-xs text-muted-foreground">
                      {AUDIT_TYPE_LABELS[audit.auditType] || audit.auditType}
                      {audit.scheduledAt && ` • Planifié: ${formatDate(audit.scheduledAt)}`}
                      {audit.auditorName && ` • ${audit.auditorName}`}
                    </div>
                  </div>
                  {audit.score !== null && audit.score !== undefined && (
                    <span className="text-sm font-medium">{audit.score}/100</span>
                  )}
                  <Badge variant="secondary" className={st.color}>{st.label}</Badge>
                </CardContent>
              </Card>
            );
          })}

          {listData.total > limit && (
            <div className="flex justify-between items-center pt-2">
              <span className="text-sm text-muted-foreground">
                {page * limit + 1}–{Math.min((page + 1) * limit, listData.total)} sur {listData.total}
              </span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(p => p - 1)}>Précédent</Button>
                <Button variant="outline" size="sm" disabled={(page + 1) * limit >= listData.total} onClick={() => setPage(p => p + 1)}>Suivant</Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Create Audit Dialog */}
      {createOpen && (
        <CreateAuditDialog
          open={createOpen}
          onClose={() => setCreateOpen(false)}
          projects={projects?.projects || []}
          onSuccess={() => { utils.erp.safety.listAudits.invalidate(); utils.erp.safety.stats.invalidate(); }}
        />
      )}
    </div>
  );
}

// ============================================================
// CREATE AUDIT DIALOG
// ============================================================

function CreateAuditDialog({ open, onClose, projects, onSuccess }: {
  open: boolean;
  onClose: () => void;
  projects: { id: number; name: string }[];
  onSuccess: () => void;
}) {
  const [form, setForm] = useState({
    title: "", description: "", auditType: "general" as string,
    projectId: "", scheduledAt: "", auditorName: "",
  });

  const createMut = trpc.erp.safety.createAudit.useMutation({
    onSuccess: () => { toast.success("Audit créé"); onSuccess(); onClose(); },
    onError: (e) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Créer un audit sécurité</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Titre *</Label>
            <Input value={form.title} onChange={(e) => setForm(f => ({ ...f, title: e.target.value }))} />
          </div>
          <div>
            <Label>Description</Label>
            <Textarea value={form.description} onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Type d'audit</Label>
              <Select value={form.auditType} onValueChange={(v) => setForm(f => ({ ...f, auditType: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(AUDIT_TYPE_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Date planifiée</Label>
              <Input type="date" value={form.scheduledAt} onChange={(e) => setForm(f => ({ ...f, scheduledAt: e.target.value }))} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Auditeur</Label>
              <Input value={form.auditorName} onChange={(e) => setForm(f => ({ ...f, auditorName: e.target.value }))} />
            </div>
            <div>
              <Label>Projet</Label>
              <Select value={form.projectId} onValueChange={(v) => setForm(f => ({ ...f, projectId: v }))}>
                <SelectTrigger><SelectValue placeholder="Aucun" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Aucun</SelectItem>
                  {projects.map(p => <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Annuler</Button>
          <Button
            disabled={!form.title || createMut.isPending}
            onClick={() => createMut.mutate({
              title: form.title,
              description: form.description || undefined,
              auditType: form.auditType as any,
              scheduledAt: form.scheduledAt ? new Date(form.scheduledAt).getTime() : undefined,
              auditorName: form.auditorName || undefined,
              projectId: form.projectId && form.projectId !== "none" ? Number(form.projectId) : undefined,
            })}
          >
            {createMut.isPending ? "..." : "Créer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
