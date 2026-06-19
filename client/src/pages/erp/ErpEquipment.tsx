import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { useErpPermissions } from "@/hooks/useErpPermissions";
import {
  Wrench, Search, Plus, Truck, CheckCircle, AlertTriangle,
  XCircle, Settings, Calendar, Package, ArrowRightLeft
} from "lucide-react";

const CATEGORIES = [
  { value: "engin_chantier", label: "Engin de chantier" },
  { value: "vehicule", label: "Véhicule" },
  { value: "outillage", label: "Outillage" },
  { value: "mesure", label: "Mesure" },
  { value: "securite", label: "Sécurité" },
  { value: "electricite", label: "Électricité" },
  { value: "plomberie", label: "Plomberie" },
  { value: "maconnerie", label: "Maçonnerie" },
  { value: "coffrage", label: "Coffrage" },
  { value: "levage", label: "Levage" },
  { value: "autre", label: "Autre" },
] as const;

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: typeof CheckCircle }> = {
  available: { label: "Disponible", color: "bg-green-100 text-green-800", icon: CheckCircle },
  assigned: { label: "Affecté", color: "bg-blue-100 text-blue-800", icon: ArrowRightLeft },
  in_maintenance: { label: "En maintenance", color: "bg-yellow-100 text-yellow-800", icon: Settings },
  out_of_service: { label: "Hors service", color: "bg-red-100 text-red-800", icon: XCircle },
  lost: { label: "Perdu", color: "bg-gray-100 text-gray-800", icon: AlertTriangle },
  retired: { label: "Retiré", color: "bg-gray-200 text-gray-600", icon: Package },
};

const MAINTENANCE_TYPES = [
  { value: "preventive", label: "Préventive" },
  { value: "corrective", label: "Corrective" },
  { value: "inspection", label: "Inspection" },
  { value: "calibration", label: "Calibration" },
  { value: "revision", label: "Révision" },
  { value: "autre", label: "Autre" },
] as const;

function formatCurrency(amount: number | null | undefined) {
  if (!amount) return "—";
  return new Intl.NumberFormat("fr-CI", { style: "currency", currency: "XOF", maximumFractionDigits: 0 }).format(amount);
}

function formatDate(ts: number | null | undefined) {
  if (!ts) return "—";
  return new Date(ts).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
}

export default function ErpEquipment() {
  const { hasPermission } = useErpPermissions();
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [page, setPage] = useState(0);
  const [createOpen, setCreateOpen] = useState(false);
  const [detailId, setDetailId] = useState<number | null>(null);
  const [assignOpen, setAssignOpen] = useState<number | null>(null);
  const [releaseOpen, setReleaseOpen] = useState<number | null>(null);
  const [maintenanceOpen, setMaintenanceOpen] = useState<number | null>(null);
  const limit = 15;

  const utils = trpc.useUtils();

  const { data: listData, isLoading } = trpc.erp.equipment.list.useQuery({
    search: search || undefined,
    category: categoryFilter !== "all" ? categoryFilter as any : undefined,
    status: statusFilter !== "all" ? statusFilter as any : undefined,
    limit,
    offset: page * limit,
  });

  const { data: stats } = trpc.erp.equipment.stats.useQuery();
  const { data: upcoming } = trpc.erp.equipment.upcomingMaintenance.useQuery({ daysAhead: 14 });
  const { data: projects } = trpc.erp.projects.list.useQuery({ limit: 100, offset: 0 });

  const createMutation = trpc.erp.equipment.create.useMutation({
    onSuccess: () => { utils.erp.equipment.list.invalidate(); utils.erp.equipment.stats.invalidate(); toast.success("Équipement créé"); setCreateOpen(false); },
    onError: (e) => toast.error(e.message),
  });

  const assignMutation = trpc.erp.equipment.assign.useMutation({
    onSuccess: () => { utils.erp.equipment.list.invalidate(); utils.erp.equipment.stats.invalidate(); toast.success("Équipement affecté"); setAssignOpen(null); },
    onError: (e) => toast.error(e.message),
  });

  const releaseMutation = trpc.erp.equipment.release.useMutation({
    onSuccess: () => { utils.erp.equipment.list.invalidate(); utils.erp.equipment.stats.invalidate(); toast.success("Équipement libéré"); setReleaseOpen(null); },
    onError: (e) => toast.error(e.message),
  });

  const addMaintenanceMutation = trpc.erp.equipment.addMaintenance.useMutation({
    onSuccess: () => { utils.erp.equipment.list.invalidate(); utils.erp.equipment.upcomingMaintenance.invalidate(); toast.success("Maintenance planifiée"); setMaintenanceOpen(null); },
    onError: (e) => toast.error(e.message),
  });

  const items = listData?.items || [];
  const total = listData?.total || 0;
  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Wrench className="text-orange-600" size={24} />
            Gestion des Équipements
          </h1>
          <p className="text-sm text-gray-500 mt-1">Suivi, affectation et maintenance du matériel</p>
        </div>
        {hasPermission("erp_equipment", "create") && (
          <Button onClick={() => setCreateOpen(true)} className="bg-orange-600 hover:bg-orange-700">
            <Plus size={16} className="mr-2" /> Ajouter
          </Button>
        )}
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
          <Card className="border-l-4 border-l-gray-500">
            <CardContent className="p-3 text-center">
              <div className="text-2xl font-bold">{stats.total}</div>
              <div className="text-xs text-gray-500">Total</div>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-green-500">
            <CardContent className="p-3 text-center">
              <div className="text-2xl font-bold text-green-700">{stats.available}</div>
              <div className="text-xs text-gray-500">Disponibles</div>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-blue-500">
            <CardContent className="p-3 text-center">
              <div className="text-2xl font-bold text-blue-700">{stats.assigned}</div>
              <div className="text-xs text-gray-500">Affectés</div>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-yellow-500">
            <CardContent className="p-3 text-center">
              <div className="text-2xl font-bold text-yellow-700">{stats.inMaintenance}</div>
              <div className="text-xs text-gray-500">Maintenance</div>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-red-500">
            <CardContent className="p-3 text-center">
              <div className="text-2xl font-bold text-red-700">{stats.outOfService}</div>
              <div className="text-xs text-gray-500">Hors service</div>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-gray-400">
            <CardContent className="p-3 text-center">
              <div className="text-2xl font-bold text-gray-600">{stats.lost}</div>
              <div className="text-xs text-gray-500">Perdus</div>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-orange-500">
            <CardContent className="p-3 text-center">
              <div className="text-2xl font-bold text-orange-700">{stats.upcomingMaintenanceCount}</div>
              <div className="text-xs text-gray-500">Maint. prévues</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Upcoming Maintenance Alert */}
      {upcoming && upcoming.length > 0 && (
        <Card className="border-orange-200 bg-orange-50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-orange-800 flex items-center gap-2">
              <AlertTriangle size={16} /> Maintenances à venir (14 jours)
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-1">
              {upcoming.slice(0, 5).map((m) => (
                <div key={m.id} className="flex items-center justify-between text-sm">
                  <span className={m.isOverdue ? "text-red-700 font-medium" : "text-orange-800"}>
                    {m.equipmentCode} — {m.equipmentName}
                  </span>
                  <Badge variant="outline" className={m.isOverdue ? "border-red-300 text-red-700" : "border-orange-300 text-orange-700"}>
                    {m.isOverdue ? "EN RETARD" : formatDate(m.scheduledAt)}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
          <Input
            placeholder="Rechercher (nom, code, marque, N° série)..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(0); }}
            className="pl-10"
          />
        </div>
        <Select value={categoryFilter} onValueChange={(v) => { setCategoryFilter(v); setPage(0); }}>
          <SelectTrigger className="w-[180px]"><SelectValue placeholder="Catégorie" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes catégories</SelectItem>
            {CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(0); }}>
          <SelectTrigger className="w-[180px]"><SelectValue placeholder="Statut" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous statuts</SelectItem>
            {Object.entries(STATUS_CONFIG).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left p-3 font-medium">Code</th>
                <th className="text-left p-3 font-medium">Nom</th>
                <th className="text-left p-3 font-medium">Catégorie</th>
                <th className="text-left p-3 font-medium">Marque / Modèle</th>
                <th className="text-left p-3 font-medium">Statut</th>
                <th className="text-left p-3 font-medium">Localisation</th>
                <th className="text-right p-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={7} className="p-8 text-center text-gray-400">Chargement...</td></tr>
              ) : items.length === 0 ? (
                <tr><td colSpan={7} className="p-8 text-center text-gray-400">Aucun équipement trouvé</td></tr>
              ) : items.map((eq) => {
                const st = STATUS_CONFIG[eq.status] || STATUS_CONFIG.available;
                const cat = CATEGORIES.find(c => c.value === eq.category);
                return (
                  <tr key={eq.id} className="border-b hover:bg-gray-50 cursor-pointer" onClick={() => setDetailId(eq.id)}>
                    <td className="p-3 font-mono text-xs">{eq.code}</td>
                    <td className="p-3 font-medium">{eq.name}</td>
                    <td className="p-3">{cat?.label || eq.category}</td>
                    <td className="p-3 text-gray-600">{[eq.brand, eq.model].filter(Boolean).join(" ") || "—"}</td>
                    <td className="p-3">
                      <Badge className={`${st.color} text-xs`}>{st.label}</Badge>
                    </td>
                    <td className="p-3 text-gray-600">{eq.location || "—"}</td>
                    <td className="p-3 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex justify-end gap-1">
                        {eq.status === "available" && hasPermission("erp_equipment", "assign") && (
                          <Button size="sm" variant="outline" onClick={() => setAssignOpen(eq.id)} title="Affecter">
                            <Truck size={14} />
                          </Button>
                        )}
                        {eq.status === "assigned" && hasPermission("erp_equipment", "assign") && (
                          <Button size="sm" variant="outline" onClick={() => setReleaseOpen(eq.id)} title="Libérer">
                            <ArrowRightLeft size={14} />
                          </Button>
                        )}
                        {hasPermission("erp_equipment", "update") && (
                          <Button size="sm" variant="outline" onClick={() => setMaintenanceOpen(eq.id)} title="Maintenance">
                            <Calendar size={14} />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between p-3 border-t bg-gray-50">
            <span className="text-sm text-gray-500">{total} équipement(s) — Page {page + 1}/{totalPages}</span>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" disabled={page === 0} onClick={() => setPage(p => p - 1)}>Précédent</Button>
              <Button size="sm" variant="outline" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>Suivant</Button>
            </div>
          </div>
        )}
      </div>

      {/* CREATE DIALOG */}
      <CreateEquipmentDialog open={createOpen} onClose={() => setCreateOpen(false)} onSubmit={(data) => createMutation.mutate(data)} isLoading={createMutation.isPending} />

      {/* DETAIL DIALOG */}
      {detailId && <EquipmentDetailDialog id={detailId} onClose={() => setDetailId(null)} />}

      {/* ASSIGN DIALOG */}
      {assignOpen && (
        <AssignDialog
          equipmentId={assignOpen}
          projects={projects?.projects || []}
          onClose={() => setAssignOpen(null)}
          onSubmit={(data) => assignMutation.mutate(data)}
          isLoading={assignMutation.isPending}
        />
      )}

      {/* RELEASE DIALOG */}
      {releaseOpen && (
        <ReleaseDialog
          equipmentId={releaseOpen}
          onClose={() => setReleaseOpen(null)}
          onSubmit={(data) => releaseMutation.mutate(data)}
          isLoading={releaseMutation.isPending}
        />
      )}

      {/* MAINTENANCE DIALOG */}
      {maintenanceOpen && (
        <MaintenanceDialog
          equipmentId={maintenanceOpen}
          onClose={() => setMaintenanceOpen(null)}
          onSubmit={(data) => addMaintenanceMutation.mutate(data)}
          isLoading={addMaintenanceMutation.isPending}
        />
      )}
    </div>
  );
}

// ============================================================
// CREATE EQUIPMENT DIALOG
// ============================================================

function CreateEquipmentDialog({ open, onClose, onSubmit, isLoading }: {
  open: boolean; onClose: () => void; onSubmit: (data: any) => void; isLoading: boolean;
}) {
  const [form, setForm] = useState({
    code: "", name: "", category: "outillage" as string, brand: "", model: "",
    serialNumber: "", location: "", purchasePrice: "",
  });

  const handleSubmit = () => {
    if (!form.code || !form.name || !form.category) { toast.error("Code, nom et catégorie requis"); return; }
    onSubmit({
      code: form.code,
      name: form.name,
      category: form.category as any,
      brand: form.brand || undefined,
      model: form.model || undefined,
      serialNumber: form.serialNumber || undefined,
      location: form.location || undefined,
      purchasePrice: form.purchasePrice ? parseInt(form.purchasePrice) : undefined,
      purchaseDate: Date.now(),
    });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Ajouter un équipement</DialogTitle></DialogHeader>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Code *</Label>
            <Input value={form.code} onChange={(e) => setForm(f => ({ ...f, code: e.target.value }))} placeholder="EQ-001" />
          </div>
          <div>
            <Label>Catégorie *</Label>
            <Select value={form.category} onValueChange={(v) => setForm(f => ({ ...f, category: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="col-span-2">
            <Label>Nom *</Label>
            <Input value={form.name} onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Pelleteuse CAT 320" />
          </div>
          <div>
            <Label>Marque</Label>
            <Input value={form.brand} onChange={(e) => setForm(f => ({ ...f, brand: e.target.value }))} placeholder="Caterpillar" />
          </div>
          <div>
            <Label>Modèle</Label>
            <Input value={form.model} onChange={(e) => setForm(f => ({ ...f, model: e.target.value }))} placeholder="320F" />
          </div>
          <div>
            <Label>N° de série</Label>
            <Input value={form.serialNumber} onChange={(e) => setForm(f => ({ ...f, serialNumber: e.target.value }))} />
          </div>
          <div>
            <Label>Prix d'achat (FCFA)</Label>
            <Input type="number" value={form.purchasePrice} onChange={(e) => setForm(f => ({ ...f, purchasePrice: e.target.value }))} />
          </div>
          <div className="col-span-2">
            <Label>Localisation</Label>
            <Input value={form.location} onChange={(e) => setForm(f => ({ ...f, location: e.target.value }))} placeholder="Dépôt Abidjan Nord" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Annuler</Button>
          <Button onClick={handleSubmit} disabled={isLoading} className="bg-orange-600 hover:bg-orange-700">
            {isLoading ? "Création..." : "Créer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================
// EQUIPMENT DETAIL DIALOG
// ============================================================

function EquipmentDetailDialog({ id, onClose }: { id: number; onClose: () => void }) {
  const { data, isLoading } = trpc.erp.equipment.getById.useQuery({ id });
  const [tab, setTab] = useState<"info" | "allocations" | "maintenance">("info");

  if (isLoading) return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl"><div className="p-8 text-center text-gray-400">Chargement...</div></DialogContent>
    </Dialog>
  );

  if (!data) return null;
  const st = STATUS_CONFIG[data.status] || STATUS_CONFIG.available;
  const cat = CATEGORIES.find(c => c.value === data.category);

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <span className="font-mono text-sm bg-gray-100 px-2 py-1 rounded">{data.code}</span>
            {data.name}
            <Badge className={st.color}>{st.label}</Badge>
          </DialogTitle>
        </DialogHeader>

        {/* Tabs */}
        <div className="flex gap-2 border-b pb-2">
          <Button size="sm" variant={tab === "info" ? "default" : "ghost"} onClick={() => setTab("info")}>Informations</Button>
          <Button size="sm" variant={tab === "allocations" ? "default" : "ghost"} onClick={() => setTab("allocations")}>
            Affectations ({data.allocations.length})
          </Button>
          <Button size="sm" variant={tab === "maintenance" ? "default" : "ghost"} onClick={() => setTab("maintenance")}>
            Maintenance ({data.maintenance.length})
          </Button>
        </div>

        {tab === "info" && (
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div><span className="text-gray-500">Catégorie :</span> <span className="font-medium">{cat?.label || data.category}</span></div>
            <div><span className="text-gray-500">Marque :</span> <span className="font-medium">{data.brand || "—"}</span></div>
            <div><span className="text-gray-500">Modèle :</span> <span className="font-medium">{data.model || "—"}</span></div>
            <div><span className="text-gray-500">N° série :</span> <span className="font-medium">{data.serialNumber || "—"}</span></div>
            <div><span className="text-gray-500">Localisation :</span> <span className="font-medium">{data.location || "—"}</span></div>
            <div><span className="text-gray-500">Prix d'achat :</span> <span className="font-medium">{formatCurrency(data.purchasePrice)}</span></div>
            <div><span className="text-gray-500">Valeur actuelle :</span> <span className="font-medium">{formatCurrency(data.currentValue)}</span></div>
            <div><span className="text-gray-500">Date d'achat :</span> <span className="font-medium">{formatDate(data.purchaseDate)}</span></div>
            <div><span className="text-gray-500">Prochaine maint. :</span> <span className="font-medium">{formatDate(data.nextMaintenanceAt)}</span></div>
            {data.description && <div className="col-span-2"><span className="text-gray-500">Description :</span> <p className="mt-1">{data.description}</p></div>}
          </div>
        )}

        {tab === "allocations" && (
          <div className="space-y-2">
            {data.allocations.length === 0 ? (
              <p className="text-gray-400 text-center py-4">Aucune affectation enregistrée</p>
            ) : data.allocations.map((a) => (
              <div key={a.id} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                <div>
                  <div className="font-medium text-sm">Projet #{a.projectId}</div>
                  {a.notes && <div className="text-xs text-gray-500">{a.notes}</div>}
                </div>
                <div className="text-right text-xs text-gray-500">
                  <div>{formatDate(a.allocatedAt)} → {a.releasedAt ? formatDate(a.releasedAt) : <Badge className="bg-blue-100 text-blue-800">En cours</Badge>}</div>
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === "maintenance" && (
          <div className="space-y-2">
            {data.maintenance.length === 0 ? (
              <p className="text-gray-400 text-center py-4">Aucune maintenance enregistrée</p>
            ) : data.maintenance.map((m) => (
              <div key={m.id} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                <div>
                  <div className="font-medium text-sm">{MAINTENANCE_TYPES.find(t => t.value === m.type)?.label || m.type}</div>
                  {m.description && <div className="text-xs text-gray-500">{m.description}</div>}
                  {m.performedBy && <div className="text-xs text-gray-400">Par : {m.performedBy}</div>}
                </div>
                <div className="text-right">
                  <Badge variant="outline" className="text-xs">{m.status}</Badge>
                  <div className="text-xs text-gray-500 mt-1">{formatDate(m.scheduledAt)}</div>
                  {m.cost ? <div className="text-xs font-medium">{formatCurrency(m.cost)}</div> : null}
                </div>
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ============================================================
// ASSIGN DIALOG
// ============================================================

function AssignDialog({ equipmentId, projects, onClose, onSubmit, isLoading }: {
  equipmentId: number; projects: any[]; onClose: () => void; onSubmit: (data: any) => void; isLoading: boolean;
}) {
  const [projectId, setProjectId] = useState<string>("");
  const [notes, setNotes] = useState("");

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader><DialogTitle>Affecter l'équipement à un projet</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Projet *</Label>
            <Select value={projectId} onValueChange={setProjectId}>
              <SelectTrigger><SelectValue placeholder="Sélectionner un projet" /></SelectTrigger>
              <SelectContent>
                {projects.map(p => <SelectItem key={p.id} value={String(p.id)}>{p.code} — {p.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Notes</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Raison de l'affectation..." />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Annuler</Button>
          <Button
            onClick={() => { if (!projectId) { toast.error("Sélectionnez un projet"); return; } onSubmit({ id: equipmentId, projectId: parseInt(projectId), notes: notes || undefined }); }}
            disabled={isLoading}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {isLoading ? "Affectation..." : "Affecter"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================
// RELEASE DIALOG
// ============================================================

function ReleaseDialog({ equipmentId, onClose, onSubmit, isLoading }: {
  equipmentId: number; onClose: () => void; onSubmit: (data: any) => void; isLoading: boolean;
}) {
  const [notes, setNotes] = useState("");

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader><DialogTitle>Libérer l'équipement</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <p className="text-sm text-gray-600">L'équipement sera remis en statut "Disponible" et dissocié du projet actuel.</p>
          <div>
            <Label>Notes</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Raison de la libération..." />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Annuler</Button>
          <Button
            onClick={() => onSubmit({ id: equipmentId, notes: notes || undefined })}
            disabled={isLoading}
            className="bg-green-600 hover:bg-green-700"
          >
            {isLoading ? "Libération..." : "Libérer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================
// MAINTENANCE DIALOG
// ============================================================

function MaintenanceDialog({ equipmentId, onClose, onSubmit, isLoading }: {
  equipmentId: number; onClose: () => void; onSubmit: (data: any) => void; isLoading: boolean;
}) {
  const [form, setForm] = useState({
    type: "preventive" as string,
    description: "",
    scheduledAt: "",
    cost: "",
    performedBy: "",
    setInMaintenance: false,
  });

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader><DialogTitle>Planifier une maintenance</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Type *</Label>
            <Select value={form.type} onValueChange={(v) => setForm(f => ({ ...f, type: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {MAINTENANCE_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Date prévue *</Label>
            <Input type="date" value={form.scheduledAt} onChange={(e) => setForm(f => ({ ...f, scheduledAt: e.target.value }))} />
          </div>
          <div>
            <Label>Description</Label>
            <Textarea value={form.description} onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Coût estimé (FCFA)</Label>
              <Input type="number" value={form.cost} onChange={(e) => setForm(f => ({ ...f, cost: e.target.value }))} />
            </div>
            <div>
              <Label>Effectué par</Label>
              <Input value={form.performedBy} onChange={(e) => setForm(f => ({ ...f, performedBy: e.target.value }))} />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" id="setInMaint" checked={form.setInMaintenance} onChange={(e) => setForm(f => ({ ...f, setInMaintenance: e.target.checked }))} />
            <Label htmlFor="setInMaint" className="text-sm">Mettre l'équipement en maintenance immédiatement</Label>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Annuler</Button>
          <Button
            onClick={() => {
              if (!form.scheduledAt) { toast.error("Date requise"); return; }
              onSubmit({
                equipmentId,
                type: form.type as any,
                description: form.description || undefined,
                scheduledAt: new Date(form.scheduledAt).getTime(),
                cost: form.cost ? parseInt(form.cost) : undefined,
                performedBy: form.performedBy || undefined,
                setInMaintenance: form.setInMaintenance,
              });
            }}
            disabled={isLoading}
            className="bg-yellow-600 hover:bg-yellow-700"
          >
            {isLoading ? "Planification..." : "Planifier"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
