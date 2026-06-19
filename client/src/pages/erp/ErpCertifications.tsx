import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Plus, AlertTriangle, Clock, RefreshCw, Award, Trash2 } from "lucide-react";

const ENTITY_TYPES = [
  { value: "vendor", label: "Fournisseur" },
  { value: "contractor", label: "Sous-traitant" },
  { value: "equipment", label: "Équipement" },
  { value: "user", label: "Utilisateur" },
];

const CERT_STATUSES = [
  { value: "active", label: "Active", color: "bg-green-100 text-green-800" },
  { value: "expired", label: "Expirée", color: "bg-red-100 text-red-800" },
  { value: "revoked", label: "Révoquée", color: "bg-gray-100 text-gray-800" },
  { value: "pending_renewal", label: "En renouvellement", color: "bg-yellow-100 text-yellow-800" },
];

function getStatusBadge(status: string) {
  const s = CERT_STATUSES.find(v => v.value === status);
  return <Badge className={s?.color || ""}>{s?.label || status}</Badge>;
}

function formatDate(ts: number | null) {
  if (!ts) return "—";
  return new Date(ts).toLocaleDateString("fr-FR");
}

function daysUntil(ts: number | null) {
  if (!ts) return null;
  return Math.ceil((ts - Date.now()) / (1000 * 60 * 60 * 24));
}

export default function ErpCertifications() {
  const [tab, setTab] = useState("all");
  const [entityType, setEntityType] = useState<string | undefined>();
  const [status, setStatus] = useState<string | undefined>();
  const [createOpen, setCreateOpen] = useState(false);
  const [renewId, setRenewId] = useState<number | null>(null);

  const utils = trpc.useUtils();

  const { data, isLoading } = trpc.erp.certifications.list.useQuery({
    entityType: entityType as any,
    status: status as any,
    limit: 50,
    offset: 0,
  });

  const expiredQuery = trpc.erp.certifications.expired.useQuery({ limit: 50 });
  const upcomingQuery = trpc.erp.certifications.upcomingExpirations.useQuery({ daysAhead: 60, limit: 50 });

  const createMutation = trpc.erp.certifications.create.useMutation({
    onSuccess: () => { toast.success("Certification ajoutée"); setCreateOpen(false); utils.erp.certifications.list.invalidate(); },
    onError: (e) => toast.error(e.message),
  });

  const deleteMutation = trpc.erp.certifications.delete.useMutation({
    onSuccess: () => { toast.success("Certification supprimée"); utils.erp.certifications.list.invalidate(); utils.erp.certifications.expired.invalidate(); utils.erp.certifications.upcomingExpirations.invalidate(); },
    onError: (e) => toast.error(e.message),
  });

  const renewMutation = trpc.erp.certifications.renew.useMutation({
    onSuccess: () => { toast.success("Certification renouvelée"); setRenewId(null); utils.erp.certifications.list.invalidate(); utils.erp.certifications.expired.invalidate(); utils.erp.certifications.upcomingExpirations.invalidate(); },
    onError: (e) => toast.error(e.message),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Certifications</h1>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" /> Nouvelle certification</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>Nouvelle certification</DialogTitle></DialogHeader>
            <CreateCertForm onSubmit={(data) => createMutation.mutate(data)} loading={createMutation.isPending} />
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-3 text-center">
            <Award className="h-5 w-5 mx-auto mb-1 text-green-600" />
            <div className="text-2xl font-bold">{data?.total || 0}</div>
            <div className="text-xs text-muted-foreground">Total</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <AlertTriangle className="h-5 w-5 mx-auto mb-1 text-red-600" />
            <div className="text-2xl font-bold text-red-600">{expiredQuery.data?.items.length || 0}</div>
            <div className="text-xs text-muted-foreground">Expirées</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <Clock className="h-5 w-5 mx-auto mb-1 text-yellow-600" />
            <div className="text-2xl font-bold text-yellow-600">{upcomingQuery.data?.items.length || 0}</div>
            <div className="text-xs text-muted-foreground">Expirent bientôt</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <RefreshCw className="h-5 w-5 mx-auto mb-1 text-blue-600" />
            <div className="text-2xl font-bold text-blue-600">{data?.items.filter(c => c.renewedAt).length || 0}</div>
            <div className="text-xs text-muted-foreground">Renouvelées</div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="all">Toutes</TabsTrigger>
          <TabsTrigger value="expired">Expirées ({expiredQuery.data?.items.length || 0})</TabsTrigger>
          <TabsTrigger value="upcoming">Bientôt ({upcomingQuery.data?.items.length || 0})</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4 mt-4">
          {/* Filters */}
          <div className="flex flex-wrap gap-3">
            <Select value={entityType || "all"} onValueChange={(v) => setEntityType(v === "all" ? undefined : v)}>
              <SelectTrigger className="w-[160px]"><SelectValue placeholder="Type entité" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous types</SelectItem>
                {ENTITY_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={status || "all"} onValueChange={(v) => setStatus(v === "all" ? undefined : v)}>
              <SelectTrigger className="w-[160px]"><SelectValue placeholder="Statut" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous statuts</SelectItem>
                {CERT_STATUSES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <CertList items={data?.items || []} isLoading={isLoading} onDelete={(id) => deleteMutation.mutate({ id })} onRenew={(id) => setRenewId(id)} />
        </TabsContent>

        <TabsContent value="expired" className="mt-4">
          <CertList items={expiredQuery.data?.items || []} isLoading={expiredQuery.isLoading} onDelete={(id) => deleteMutation.mutate({ id })} onRenew={(id) => setRenewId(id)} />
        </TabsContent>

        <TabsContent value="upcoming" className="mt-4">
          <CertList items={upcomingQuery.data?.items || []} isLoading={upcomingQuery.isLoading} onDelete={(id) => deleteMutation.mutate({ id })} onRenew={(id) => setRenewId(id)} />
        </TabsContent>
      </Tabs>

      {/* Renew Dialog */}
      <Dialog open={!!renewId} onOpenChange={(open) => { if (!open) setRenewId(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Renouveler la certification</DialogTitle></DialogHeader>
          <RenewForm certId={renewId!} onSubmit={(data) => renewMutation.mutate(data)} loading={renewMutation.isPending} />
        </DialogContent>
      </Dialog>
    </div>
  );
}

function CertList({ items, isLoading, onDelete, onRenew }: { items: any[]; isLoading: boolean; onDelete: (id: number) => void; onRenew: (id: number) => void }) {
  if (isLoading) return <div className="text-center py-10 text-muted-foreground">Chargement...</div>;
  if (!items.length) return <div className="text-center py-10 text-muted-foreground">Aucune certification</div>;

  return (
    <div className="grid gap-3">
      {items.map(cert => {
        const days = daysUntil(cert.expiresAt);
        const isExpired = days !== null && days < 0;
        const isWarning = days !== null && days >= 0 && days <= (cert.alertDaysBefore || 30);

        return (
          <Card key={cert.id} className={isExpired ? "border-red-300" : isWarning ? "border-yellow-300" : ""}>
            <CardContent className="p-4 flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-semibold">{cert.title}</span>
                  {getStatusBadge(cert.status)}
                  <Badge variant="outline">{ENTITY_TYPES.find(t => t.value === cert.entityType)?.label} #{cert.entityId}</Badge>
                </div>
                <div className="text-sm text-muted-foreground mt-1 flex gap-4">
                  {cert.issuedBy && <span>Émis par: {cert.issuedBy}</span>}
                  {cert.certNumber && <span>N°: {cert.certNumber}</span>}
                  <span>Expire: {formatDate(cert.expiresAt)}</span>
                  {days !== null && (
                    <span className={isExpired ? "text-red-600 font-medium" : isWarning ? "text-yellow-600 font-medium" : ""}>
                      {isExpired ? `Expiré depuis ${Math.abs(days)}j` : `${days}j restants`}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => onRenew(cert.id)} title="Renouveler">
                  <RefreshCw className="h-4 w-4 text-blue-600" />
                </Button>
                <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => { if (confirm("Supprimer ?")) onDelete(cert.id); }} title="Supprimer">
                  <Trash2 className="h-4 w-4 text-red-500" />
                </Button>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

function CreateCertForm({ onSubmit, loading }: { onSubmit: (data: any) => void; loading: boolean }) {
  const [form, setForm] = useState({ entityType: "vendor", entityId: "", title: "", certNumber: "", issuedBy: "", expiresAt: "", alertDaysBefore: "30" });

  return (
    <form onSubmit={(e) => { e.preventDefault(); onSubmit({ entityType: form.entityType, entityId: Number(form.entityId), title: form.title, certNumber: form.certNumber || undefined, issuedBy: form.issuedBy || undefined, expiresAt: form.expiresAt ? new Date(form.expiresAt).getTime() : undefined, alertDaysBefore: Number(form.alertDaysBefore) }); }} className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <div><Label>Type entité *</Label>
          <Select value={form.entityType} onValueChange={(v) => setForm(f => ({ ...f, entityType: v }))}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{ENTITY_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div><Label>ID entité *</Label><Input type="number" value={form.entityId} onChange={(e) => setForm(f => ({ ...f, entityId: e.target.value }))} required /></div>
      </div>
      <div><Label>Titre *</Label><Input value={form.title} onChange={(e) => setForm(f => ({ ...f, title: e.target.value }))} required /></div>
      <div className="grid grid-cols-2 gap-2">
        <div><Label>N° certification</Label><Input value={form.certNumber} onChange={(e) => setForm(f => ({ ...f, certNumber: e.target.value }))} /></div>
        <div><Label>Émis par</Label><Input value={form.issuedBy} onChange={(e) => setForm(f => ({ ...f, issuedBy: e.target.value }))} /></div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div><Label>Date d'expiration</Label><Input type="date" value={form.expiresAt} onChange={(e) => setForm(f => ({ ...f, expiresAt: e.target.value }))} /></div>
        <div><Label>Alerte (jours avant)</Label><Input type="number" value={form.alertDaysBefore} onChange={(e) => setForm(f => ({ ...f, alertDaysBefore: e.target.value }))} /></div>
      </div>
      <Button type="submit" disabled={loading || !form.title || !form.entityId} className="w-full">{loading ? "Création..." : "Ajouter"}</Button>
    </form>
  );
}

function RenewForm({ certId, onSubmit, loading }: { certId: number; onSubmit: (data: any) => void; loading: boolean }) {
  const [newExpiresAt, setNewExpiresAt] = useState("");
  const [newCertNumber, setNewCertNumber] = useState("");

  return (
    <form onSubmit={(e) => { e.preventDefault(); onSubmit({ id: certId, newExpiresAt: new Date(newExpiresAt).getTime(), newCertNumber: newCertNumber || undefined }); }} className="space-y-3">
      <div><Label>Nouvelle date d'expiration *</Label><Input type="date" value={newExpiresAt} onChange={(e) => setNewExpiresAt(e.target.value)} required /></div>
      <div><Label>Nouveau N° certification</Label><Input value={newCertNumber} onChange={(e) => setNewCertNumber(e.target.value)} /></div>
      <Button type="submit" disabled={loading || !newExpiresAt} className="w-full">{loading ? "Renouvellement..." : "Renouveler"}</Button>
    </form>
  );
}
