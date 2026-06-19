import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Plus, Search, Star, Phone, Mail, Trash2, FileText, Link2 } from "lucide-react";

const SPECIALTIES = [
  { value: "general", label: "Général" },
  { value: "gros_oeuvre", label: "Gros œuvre" },
  { value: "electricite", label: "Électricité" },
  { value: "plomberie", label: "Plomberie" },
  { value: "peinture", label: "Peinture" },
  { value: "menuiserie", label: "Menuiserie" },
  { value: "carrelage", label: "Carrelage" },
  { value: "toiture", label: "Toiture" },
  { value: "vrd", label: "VRD" },
  { value: "autre", label: "Autre" },
];

const STATUSES = [
  { value: "active", label: "Actif", color: "bg-green-100 text-green-800" },
  { value: "inactive", label: "Inactif", color: "bg-gray-100 text-gray-800" },
  { value: "suspended", label: "Suspendu", color: "bg-yellow-100 text-yellow-800" },
  { value: "blacklisted", label: "Blacklisté", color: "bg-red-100 text-red-800" },
  { value: "pending_approval", label: "En attente", color: "bg-blue-100 text-blue-800" },
];

const CONTRACT_STATUSES = [
  { value: "draft", label: "Brouillon", color: "bg-gray-100 text-gray-800" },
  { value: "active", label: "Actif", color: "bg-green-100 text-green-800" },
  { value: "completed", label: "Terminé", color: "bg-blue-100 text-blue-800" },
  { value: "terminated", label: "Résilié", color: "bg-red-100 text-red-800" },
  { value: "expired", label: "Expiré", color: "bg-yellow-100 text-yellow-800" },
];

function getStatusBadge(status: string, list = STATUSES) {
  const s = list.find(v => v.value === status);
  return <Badge className={s?.color || ""}>{s?.label || status}</Badge>;
}

function formatXOF(amount: number | null) {
  if (!amount) return "—";
  return new Intl.NumberFormat("fr-CI", { style: "currency", currency: "XOF", maximumFractionDigits: 0 }).format(amount);
}

export default function ErpContractors() {
  const [tab, setTab] = useState("contractors");
  const [search, setSearch] = useState("");
  const [specialty, setSpecialty] = useState<string | undefined>();
  const [status, setStatus] = useState<string | undefined>();
  const [createOpen, setCreateOpen] = useState(false);
  const [detailId, setDetailId] = useState<number | null>(null);
  const [assignOpen, setAssignOpen] = useState(false);
  const [contractOpen, setContractOpen] = useState(false);

  const utils = trpc.useUtils();

  const { data, isLoading } = trpc.erp.contractors.list.useQuery({
    search: search || undefined,
    specialty: specialty as any,
    status: status as any,
    limit: 50,
    offset: 0,
  });

  const detailQuery = trpc.erp.contractors.getById.useQuery(
    { id: detailId! },
    { enabled: !!detailId }
  );

  const projectsQuery = trpc.erp.projects.list.useQuery({ limit: 100, offset: 0 });

  const createMutation = trpc.erp.contractors.create.useMutation({
    onSuccess: () => { toast.success("Sous-traitant créé"); setCreateOpen(false); utils.erp.contractors.list.invalidate(); },
    onError: (e) => toast.error(e.message),
  });

  const updateStatusMutation = trpc.erp.contractors.updateStatus.useMutation({
    onSuccess: () => { toast.success("Statut mis à jour"); utils.erp.contractors.list.invalidate(); utils.erp.contractors.getById.invalidate(); },
    onError: (e) => toast.error(e.message),
  });

  const deleteMutation = trpc.erp.contractors.delete.useMutation({
    onSuccess: () => { toast.success("Sous-traitant supprimé"); setDetailId(null); utils.erp.contractors.list.invalidate(); },
    onError: (e) => toast.error(e.message),
  });

  const assignMutation = trpc.erp.contractors.assignToProject.useMutation({
    onSuccess: () => { toast.success("Affecté au projet"); setAssignOpen(false); utils.erp.contractors.getById.invalidate(); },
    onError: (e) => toast.error(e.message),
  });

  const releaseMutation = trpc.erp.contractors.releaseFromProject.useMutation({
    onSuccess: () => { toast.success("Libéré du projet"); utils.erp.contractors.getById.invalidate(); },
    onError: (e) => toast.error(e.message),
  });

  const createContractMutation = trpc.erp.contractors.createContract.useMutation({
    onSuccess: () => { toast.success("Contrat créé"); setContractOpen(false); utils.erp.contractors.getById.invalidate(); },
    onError: (e) => toast.error(e.message),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Sous-traitants & Contrats</h1>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" /> Nouveau sous-traitant</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>Nouveau sous-traitant</DialogTitle></DialogHeader>
            <CreateContractorForm onSubmit={(data) => createMutation.mutate(data)} loading={createMutation.isPending} />
          </DialogContent>
        </Dialog>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="contractors">Sous-traitants ({data?.total || 0})</TabsTrigger>
          <TabsTrigger value="contracts">Contrats</TabsTrigger>
        </TabsList>

        <TabsContent value="contractors" className="space-y-4 mt-4">
          {/* Filters */}
          <div className="flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Rechercher..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
            </div>
            <Select value={specialty || "all"} onValueChange={(v) => setSpecialty(v === "all" ? undefined : v)}>
              <SelectTrigger className="w-[160px]"><SelectValue placeholder="Spécialité" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes spécialités</SelectItem>
                {SPECIALTIES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={status || "all"} onValueChange={(v) => setStatus(v === "all" ? undefined : v)}>
              <SelectTrigger className="w-[160px]"><SelectValue placeholder="Statut" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous statuts</SelectItem>
                {STATUSES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {/* List */}
          {isLoading ? (
            <div className="text-center py-10 text-muted-foreground">Chargement...</div>
          ) : !data?.items.length ? (
            <div className="text-center py-10 text-muted-foreground">Aucun sous-traitant trouvé</div>
          ) : (
            <div className="grid gap-3">
              {data.items.map(contractor => (
                <Card key={contractor.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setDetailId(contractor.id)}>
                  <CardContent className="p-4 flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">{contractor.name}</span>
                        {getStatusBadge(contractor.status)}
                        <Badge variant="outline">{SPECIALTIES.find(s => s.value === contractor.specialty)?.label || contractor.specialty}</Badge>
                      </div>
                      <div className="text-sm text-muted-foreground mt-1 flex gap-4">
                        {contractor.email && <span className="flex items-center gap-1"><Mail className="h-3 w-3" />{contractor.email}</span>}
                        {contractor.phone && <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{contractor.phone}</span>}
                        {contractor.licenseNumber && <span className="flex items-center gap-1"><FileText className="h-3 w-3" />Licence: {contractor.licenseNumber}</span>}
                      </div>
                    </div>
                    {contractor.rating && (
                      <div className="flex items-center gap-1">
                        <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                        <span className="text-sm font-medium">{contractor.rating}/5</span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="contracts" className="mt-4">
          <ContractsTab />
        </TabsContent>
      </Tabs>

      {/* Detail Dialog */}
      <Dialog open={!!detailId} onOpenChange={(open) => { if (!open) setDetailId(null); }}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Fiche Sous-traitant</DialogTitle></DialogHeader>
          {detailQuery.data && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">{detailQuery.data.name}</h3>
                {getStatusBadge(detailQuery.data.status)}
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div><strong>Spécialité :</strong> {SPECIALTIES.find(s => s.value === detailQuery.data!.specialty)?.label}</div>
                <div><strong>Email :</strong> {detailQuery.data.email || "—"}</div>
                <div><strong>Téléphone :</strong> {detailQuery.data.phone || "—"}</div>
                <div><strong>Licence :</strong> {detailQuery.data.licenseNumber || "—"}</div>
              </div>

              {/* Status */}
              <div className="flex gap-2 flex-wrap">
                <Label className="text-sm font-medium w-full">Changer le statut :</Label>
                {STATUSES.filter(s => s.value !== detailQuery.data!.status).map(s => (
                  <Button key={s.value} size="sm" variant="outline" onClick={() => updateStatusMutation.mutate({ id: detailId!, status: s.value as any })}>
                    {s.label}
                  </Button>
                ))}
              </div>

              {/* Assignments */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-semibold">Affectations projets</h4>
                  <Dialog open={assignOpen} onOpenChange={setAssignOpen}>
                    <DialogTrigger asChild>
                      <Button size="sm" variant="outline"><Link2 className="mr-1 h-3 w-3" /> Affecter</Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader><DialogTitle>Affecter à un projet</DialogTitle></DialogHeader>
                      <AssignForm contractorId={detailId!} projects={projectsQuery.data?.projects || []} onSubmit={(data) => assignMutation.mutate(data)} loading={assignMutation.isPending} />
                    </DialogContent>
                  </Dialog>
                </div>
                {detailQuery.data.assignments.filter(a => !a.releasedAt).length === 0 ? (
                  <p className="text-sm text-muted-foreground">Aucune affectation active</p>
                ) : (
                  <div className="space-y-2">
                    {detailQuery.data.assignments.filter(a => !a.releasedAt).map(a => (
                      <div key={a.id} className="flex items-center justify-between p-2 border rounded text-sm">
                        <span>Projet #{a.projectId} {a.role && `— ${a.role}`}</span>
                        <Button size="sm" variant="ghost" onClick={() => releaseMutation.mutate({ assignmentId: a.id })}>Libérer</Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Contracts */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-semibold">Contrats</h4>
                  <Dialog open={contractOpen} onOpenChange={setContractOpen}>
                    <DialogTrigger asChild>
                      <Button size="sm" variant="outline"><Plus className="mr-1 h-3 w-3" /> Contrat</Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader><DialogTitle>Nouveau contrat</DialogTitle></DialogHeader>
                      <CreateContractForm contractorId={detailId!} projects={projectsQuery.data?.projects || []} onSubmit={(data) => createContractMutation.mutate(data)} loading={createContractMutation.isPending} />
                    </DialogContent>
                  </Dialog>
                </div>
                {detailQuery.data.contracts.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Aucun contrat</p>
                ) : (
                  <div className="space-y-2">
                    {detailQuery.data.contracts.map(c => (
                      <div key={c.id} className="flex items-center justify-between p-2 border rounded text-sm">
                        <div>
                          <span className="font-medium">{c.title}</span>
                          {c.reference && <span className="text-muted-foreground ml-2">({c.reference})</span>}
                        </div>
                        <div className="flex items-center gap-2">
                          <span>{formatXOF(c.amount)}</span>
                          {getStatusBadge(c.status, CONTRACT_STATUSES)}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex justify-end">
                <Button variant="destructive" size="sm" onClick={() => { if (confirm("Supprimer ce sous-traitant ?")) deleteMutation.mutate({ id: detailId! }); }}>
                  <Trash2 className="mr-1 h-4 w-4" /> Supprimer
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ContractsTab() {
  const { data, isLoading } = trpc.erp.contractors.listContracts.useQuery({ limit: 50, offset: 0 });

  if (isLoading) return <div className="text-center py-10 text-muted-foreground">Chargement...</div>;
  if (!data?.items.length) return <div className="text-center py-10 text-muted-foreground">Aucun contrat</div>;

  return (
    <div className="grid gap-3">
      {data.items.map(c => (
        <Card key={c.id}>
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <span className="font-semibold">{c.title}</span>
              {c.reference && <span className="text-muted-foreground ml-2">({c.reference})</span>}
              <div className="text-xs text-muted-foreground mt-1">
                Sous-traitant #{c.contractorId} • Projet #{c.projectId}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="font-medium">{formatXOF(c.amount)}</span>
              {getStatusBadge(c.status, CONTRACT_STATUSES)}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function CreateContractorForm({ onSubmit, loading }: { onSubmit: (data: any) => void; loading: boolean }) {
  const [form, setForm] = useState({ name: "", description: "", specialty: "general", email: "", phone: "", address: "", licenseNumber: "" });

  return (
    <form onSubmit={(e) => { e.preventDefault(); onSubmit({ ...form, email: form.email || undefined, phone: form.phone || undefined, address: form.address || undefined, licenseNumber: form.licenseNumber || undefined }); }} className="space-y-3">
      <div><Label>Nom *</Label><Input value={form.name} onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))} required /></div>
      <div><Label>Spécialité</Label>
        <Select value={form.specialty} onValueChange={(v) => setForm(f => ({ ...f, specialty: v }))}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>{SPECIALTIES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <div><Label>Description</Label><Textarea value={form.description} onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))} /></div>
      <div className="grid grid-cols-2 gap-2">
        <div><Label>Email</Label><Input type="email" value={form.email} onChange={(e) => setForm(f => ({ ...f, email: e.target.value }))} /></div>
        <div><Label>Téléphone</Label><Input value={form.phone} onChange={(e) => setForm(f => ({ ...f, phone: e.target.value }))} /></div>
      </div>
      <div><Label>N° licence</Label><Input value={form.licenseNumber} onChange={(e) => setForm(f => ({ ...f, licenseNumber: e.target.value }))} /></div>
      <Button type="submit" disabled={loading || !form.name} className="w-full">{loading ? "Création..." : "Créer"}</Button>
    </form>
  );
}

function AssignForm({ contractorId, projects, onSubmit, loading }: { contractorId: number; projects: any[]; onSubmit: (data: any) => void; loading: boolean }) {
  const [projectId, setProjectId] = useState<string>("");
  const [role, setRole] = useState("");

  return (
    <form onSubmit={(e) => { e.preventDefault(); onSubmit({ contractorId, projectId: Number(projectId), role: role || undefined }); }} className="space-y-3">
      <div><Label>Projet *</Label>
        <Select value={projectId} onValueChange={setProjectId}>
          <SelectTrigger><SelectValue placeholder="Sélectionner un projet" /></SelectTrigger>
          <SelectContent>{projects.map(p => <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <div><Label>Rôle</Label><Input value={role} onChange={(e) => setRole(e.target.value)} placeholder="Ex: Électricien principal" /></div>
      <Button type="submit" disabled={loading || !projectId} className="w-full">{loading ? "Affectation..." : "Affecter"}</Button>
    </form>
  );
}

function CreateContractForm({ contractorId, projects, onSubmit, loading }: { contractorId: number; projects: any[]; onSubmit: (data: any) => void; loading: boolean }) {
  const [form, setForm] = useState({ title: "", reference: "", amount: "", projectId: "" });

  return (
    <form onSubmit={(e) => { e.preventDefault(); onSubmit({ contractorId, title: form.title, reference: form.reference || undefined, amount: form.amount ? Number(form.amount) : undefined, projectId: form.projectId ? Number(form.projectId) : undefined }); }} className="space-y-3">
      <div><Label>Titre *</Label><Input value={form.title} onChange={(e) => setForm(f => ({ ...f, title: e.target.value }))} required /></div>
      <div><Label>Référence</Label><Input value={form.reference} onChange={(e) => setForm(f => ({ ...f, reference: e.target.value }))} /></div>
      <div><Label>Montant (XOF)</Label><Input type="number" value={form.amount} onChange={(e) => setForm(f => ({ ...f, amount: e.target.value }))} /></div>
      <div><Label>Projet</Label>
        <Select value={form.projectId} onValueChange={(v) => setForm(f => ({ ...f, projectId: v }))}>
          <SelectTrigger><SelectValue placeholder="Sélectionner un projet" /></SelectTrigger>
          <SelectContent>{projects.map(p => <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <Button type="submit" disabled={loading || !form.title} className="w-full">{loading ? "Création..." : "Créer contrat"}</Button>
    </form>
  );
}
