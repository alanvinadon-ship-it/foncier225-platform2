import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Plus, Search, Star, Phone, Mail, User, Trash2 } from "lucide-react";

const VENDOR_CATEGORIES = [
  { value: "general", label: "Général" },
  { value: "materials", label: "Matériaux" },
  { value: "equipment", label: "Équipements" },
  { value: "services", label: "Services" },
  { value: "transport", label: "Transport" },
  { value: "consulting", label: "Consulting" },
  { value: "autre", label: "Autre" },
];

const VENDOR_STATUSES = [
  { value: "active", label: "Actif", color: "bg-green-100 text-green-800" },
  { value: "inactive", label: "Inactif", color: "bg-gray-100 text-gray-800" },
  { value: "suspended", label: "Suspendu", color: "bg-yellow-100 text-yellow-800" },
  { value: "blacklisted", label: "Blacklisté", color: "bg-red-100 text-red-800" },
  { value: "pending_approval", label: "En attente", color: "bg-blue-100 text-blue-800" },
];

function getStatusBadge(status: string) {
  const s = VENDOR_STATUSES.find(v => v.value === status);
  return <Badge className={s?.color || ""}>{s?.label || status}</Badge>;
}

export default function ErpVendors() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string | undefined>();
  const [status, setStatus] = useState<string | undefined>();
  const [createOpen, setCreateOpen] = useState(false);
  const [detailId, setDetailId] = useState<number | null>(null);
  const [contactOpen, setContactOpen] = useState(false);

  const utils = trpc.useUtils();

  const { data, isLoading } = trpc.erp.vendors.list.useQuery({
    search: search || undefined,
    category: category as any,
    status: status as any,
    limit: 50,
    offset: 0,
  });

  const detailQuery = trpc.erp.vendors.getById.useQuery(
    { id: detailId! },
    { enabled: !!detailId }
  );

  const createMutation = trpc.erp.vendors.create.useMutation({
    onSuccess: () => { toast.success("Fournisseur créé"); setCreateOpen(false); utils.erp.vendors.list.invalidate(); },
    onError: (e) => toast.error(e.message),
  });

  const updateStatusMutation = trpc.erp.vendors.updateStatus.useMutation({
    onSuccess: () => { toast.success("Statut mis à jour"); utils.erp.vendors.list.invalidate(); utils.erp.vendors.getById.invalidate(); },
    onError: (e) => toast.error(e.message),
  });

  const deleteMutation = trpc.erp.vendors.delete.useMutation({
    onSuccess: () => { toast.success("Fournisseur supprimé"); setDetailId(null); utils.erp.vendors.list.invalidate(); },
    onError: (e) => toast.error(e.message),
  });

  const addContactMutation = trpc.erp.vendors.addContact.useMutation({
    onSuccess: () => { toast.success("Contact ajouté"); setContactOpen(false); utils.erp.vendors.getById.invalidate(); },
    onError: (e) => toast.error(e.message),
  });

  const deleteContactMutation = trpc.erp.vendors.deleteContact.useMutation({
    onSuccess: () => { toast.success("Contact supprimé"); utils.erp.vendors.getById.invalidate(); },
    onError: (e) => toast.error(e.message),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Fournisseurs</h1>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" /> Nouveau fournisseur</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>Nouveau fournisseur</DialogTitle></DialogHeader>
            <CreateVendorForm onSubmit={(data) => createMutation.mutate(data)} loading={createMutation.isPending} />
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Rechercher..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={category || "all"} onValueChange={(v) => setCategory(v === "all" ? undefined : v)}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder="Catégorie" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes catégories</SelectItem>
            {VENDOR_CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={status || "all"} onValueChange={(v) => setStatus(v === "all" ? undefined : v)}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder="Statut" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous statuts</SelectItem>
            {VENDOR_STATUSES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {VENDOR_STATUSES.map(s => {
          const cnt = data?.items.filter(v => v.status === s.value).length || 0;
          return (
            <Card key={s.value} className="cursor-pointer hover:shadow-md" onClick={() => setStatus(s.value)}>
              <CardContent className="p-3 text-center">
                <div className="text-2xl font-bold">{cnt}</div>
                <div className="text-xs text-muted-foreground">{s.label}</div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* List */}
      {isLoading ? (
        <div className="text-center py-10 text-muted-foreground">Chargement...</div>
      ) : !data?.items.length ? (
        <div className="text-center py-10 text-muted-foreground">Aucun fournisseur trouvé</div>
      ) : (
        <div className="grid gap-3">
          {data.items.map(vendor => (
            <Card key={vendor.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setDetailId(vendor.id)}>
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{vendor.name}</span>
                    {getStatusBadge(vendor.status)}
                    <Badge variant="outline">{VENDOR_CATEGORIES.find(c => c.value === vendor.category)?.label || vendor.category}</Badge>
                  </div>
                  <div className="text-sm text-muted-foreground mt-1 flex gap-4">
                    {vendor.email && <span className="flex items-center gap-1"><Mail className="h-3 w-3" />{vendor.email}</span>}
                    {vendor.phone && <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{vendor.phone}</span>}
                  </div>
                </div>
                {vendor.rating && (
                  <div className="flex items-center gap-1">
                    <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                    <span className="text-sm font-medium">{vendor.rating}/5</span>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Detail Dialog */}
      <Dialog open={!!detailId} onOpenChange={(open) => { if (!open) setDetailId(null); }}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Fiche Fournisseur</DialogTitle></DialogHeader>
          {detailQuery.data && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">{detailQuery.data.name}</h3>
                {getStatusBadge(detailQuery.data.status)}
              </div>
              {detailQuery.data.description && <p className="text-sm text-muted-foreground">{detailQuery.data.description}</p>}
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div><strong>Catégorie :</strong> {VENDOR_CATEGORIES.find(c => c.value === detailQuery.data!.category)?.label}</div>
                <div><strong>Email :</strong> {detailQuery.data.email || "—"}</div>
                <div><strong>Téléphone :</strong> {detailQuery.data.phone || "—"}</div>
                <div><strong>Site web :</strong> {detailQuery.data.website || "—"}</div>
                <div><strong>N° fiscal :</strong> {detailQuery.data.taxId || "—"}</div>
                <div><strong>Note :</strong> {detailQuery.data.rating ? `${detailQuery.data.rating}/5` : "—"}</div>
              </div>

              {/* Status actions */}
              <div className="flex gap-2 flex-wrap">
                <Label className="text-sm font-medium w-full">Changer le statut :</Label>
                {VENDOR_STATUSES.filter(s => s.value !== detailQuery.data!.status).map(s => (
                  <Button key={s.value} size="sm" variant="outline" onClick={() => updateStatusMutation.mutate({ id: detailId!, status: s.value as any })}>
                    {s.label}
                  </Button>
                ))}
              </div>

              {/* Contacts */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-semibold">Contacts</h4>
                  <Dialog open={contactOpen} onOpenChange={setContactOpen}>
                    <DialogTrigger asChild>
                      <Button size="sm" variant="outline"><Plus className="mr-1 h-3 w-3" /> Ajouter</Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader><DialogTitle>Nouveau contact</DialogTitle></DialogHeader>
                      <AddContactForm vendorId={detailId!} onSubmit={(data) => addContactMutation.mutate(data)} loading={addContactMutation.isPending} />
                    </DialogContent>
                  </Dialog>
                </div>
                {detailQuery.data.contacts.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Aucun contact</p>
                ) : (
                  <div className="space-y-2">
                    {detailQuery.data.contacts.map(contact => (
                      <div key={contact.id} className="flex items-center justify-between p-2 border rounded">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <span className="font-medium text-sm">{contact.name}</span>
                            {contact.isPrimary && <Badge className="ml-2 text-xs" variant="secondary">Principal</Badge>}
                            {contact.role && <span className="text-xs text-muted-foreground ml-2">({contact.role})</span>}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {contact.email && <span className="text-xs">{contact.email}</span>}
                          <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => deleteContactMutation.mutate({ id: contact.id })}>
                            <Trash2 className="h-3 w-3 text-red-500" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex justify-end">
                <Button variant="destructive" size="sm" onClick={() => { if (confirm("Supprimer ce fournisseur ?")) deleteMutation.mutate({ id: detailId! }); }}>
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

function CreateVendorForm({ onSubmit, loading }: { onSubmit: (data: any) => void; loading: boolean }) {
  const [form, setForm] = useState({ name: "", description: "", category: "general", email: "", phone: "", address: "", website: "", taxId: "" });

  return (
    <form onSubmit={(e) => { e.preventDefault(); onSubmit({ ...form, email: form.email || undefined, phone: form.phone || undefined, address: form.address || undefined, website: form.website || undefined, taxId: form.taxId || undefined }); }} className="space-y-3">
      <div><Label>Nom *</Label><Input value={form.name} onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))} required /></div>
      <div><Label>Catégorie</Label>
        <Select value={form.category} onValueChange={(v) => setForm(f => ({ ...f, category: v }))}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>{VENDOR_CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <div><Label>Description</Label><Textarea value={form.description} onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))} /></div>
      <div className="grid grid-cols-2 gap-2">
        <div><Label>Email</Label><Input type="email" value={form.email} onChange={(e) => setForm(f => ({ ...f, email: e.target.value }))} /></div>
        <div><Label>Téléphone</Label><Input value={form.phone} onChange={(e) => setForm(f => ({ ...f, phone: e.target.value }))} /></div>
      </div>
      <div><Label>Adresse</Label><Input value={form.address} onChange={(e) => setForm(f => ({ ...f, address: e.target.value }))} /></div>
      <div className="grid grid-cols-2 gap-2">
        <div><Label>Site web</Label><Input value={form.website} onChange={(e) => setForm(f => ({ ...f, website: e.target.value }))} /></div>
        <div><Label>N° fiscal</Label><Input value={form.taxId} onChange={(e) => setForm(f => ({ ...f, taxId: e.target.value }))} /></div>
      </div>
      <Button type="submit" disabled={loading || !form.name} className="w-full">{loading ? "Création..." : "Créer"}</Button>
    </form>
  );
}

function AddContactForm({ vendorId, onSubmit, loading }: { vendorId: number; onSubmit: (data: any) => void; loading: boolean }) {
  const [form, setForm] = useState({ name: "", role: "", email: "", phone: "", isPrimary: false });

  return (
    <form onSubmit={(e) => { e.preventDefault(); onSubmit({ vendorId, ...form, role: form.role || undefined, email: form.email || undefined, phone: form.phone || undefined }); }} className="space-y-3">
      <div><Label>Nom *</Label><Input value={form.name} onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))} required /></div>
      <div><Label>Rôle</Label><Input value={form.role} onChange={(e) => setForm(f => ({ ...f, role: e.target.value }))} placeholder="Ex: Directeur commercial" /></div>
      <div className="grid grid-cols-2 gap-2">
        <div><Label>Email</Label><Input type="email" value={form.email} onChange={(e) => setForm(f => ({ ...f, email: e.target.value }))} /></div>
        <div><Label>Téléphone</Label><Input value={form.phone} onChange={(e) => setForm(f => ({ ...f, phone: e.target.value }))} /></div>
      </div>
      <div className="flex items-center gap-2">
        <input type="checkbox" checked={form.isPrimary} onChange={(e) => setForm(f => ({ ...f, isPrimary: e.target.checked }))} />
        <Label>Contact principal</Label>
      </div>
      <Button type="submit" disabled={loading || !form.name} className="w-full">{loading ? "Ajout..." : "Ajouter"}</Button>
    </form>
  );
}
