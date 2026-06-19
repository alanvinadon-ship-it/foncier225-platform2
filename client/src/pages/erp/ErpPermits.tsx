import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { useErpPermissions } from "@/hooks/useErpPermissions";
import {
  Shield, Search, CheckCircle, XCircle, Clock, AlertTriangle,
  Plus, Trash2, Bell, Calendar
} from "lucide-react";

const PERMIT_TYPES = [
  { value: "permis_construire", label: "Permis de construire" },
  { value: "permis_demolir", label: "Permis de démolir" },
  { value: "permis_amenager", label: "Permis d'aménager" },
  { value: "autorisation_travaux", label: "Autorisation de travaux" },
  { value: "certificat_conformite", label: "Certificat de conformité" },
  { value: "certificat_urbanisme", label: "Certificat d'urbanisme" },
  { value: "declaration_prealable", label: "Déclaration préalable" },
  { value: "autre", label: "Autre" },
];

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  pending: { label: "En attente", color: "bg-yellow-100 text-yellow-800" },
  validated: { label: "Validé", color: "bg-green-100 text-green-800" },
  rejected: { label: "Rejeté", color: "bg-red-100 text-red-800" },
  expired: { label: "Expiré", color: "bg-orange-100 text-orange-800" },
  renewal_required: { label: "Renouvellement requis", color: "bg-purple-100 text-purple-800" },
};

export default function ErpPermits() {
  const { hasPermission } = useErpPermissions();
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [page, setPage] = useState(0);
  const [createOpen, setCreateOpen] = useState(false);
  const [rejectId, setRejectId] = useState<number | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const limit = 15;

  const utils = trpc.useUtils();

  const { data, isLoading } = trpc.erp.permits.list.useQuery({
    limit,
    offset: page * limit,
    search: search || undefined,
    type: typeFilter !== "all" ? typeFilter as any : undefined,
    status: statusFilter !== "all" ? statusFilter as any : undefined,
  });

  const { data: upcomingExpirations } = trpc.erp.permits.upcomingExpirations.useQuery({ daysAhead: 60 });

  const createMutation = trpc.erp.permits.create.useMutation({
    onSuccess: () => {
      toast.success("Permis créé avec succès");
      setCreateOpen(false);
      utils.erp.permits.list.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const validateMutation = trpc.erp.permits.validate.useMutation({
    onSuccess: () => {
      toast.success("Permis validé");
      utils.erp.permits.list.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const rejectMutation = trpc.erp.permits.reject.useMutation({
    onSuccess: () => {
      toast.success("Permis rejeté");
      setRejectId(null);
      setRejectReason("");
      utils.erp.permits.list.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const deleteMutation = trpc.erp.permits.delete.useMutation({
    onSuccess: () => {
      toast.success("Permis supprimé");
      utils.erp.permits.list.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Shield className="h-6 w-6 text-indigo-600" />
            Permis & Autorisations
          </h1>
          <p className="text-muted-foreground mt-1">
            Suivi des permis de construire et autorisations administratives
          </p>
        </div>
        {hasPermission("erp_compliance", "create") && (
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4 mr-2" />Nouveau permis</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Créer un permis</DialogTitle>
              </DialogHeader>
              <CreatePermitForm
                onSubmit={(values) => createMutation.mutate(values)}
                isLoading={createMutation.isPending}
              />
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Alerte expirations prochaines */}
      {upcomingExpirations && upcomingExpirations.length > 0 && (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="py-3 flex items-center gap-3">
            <Bell className="h-5 w-5 text-amber-600" />
            <span className="text-sm font-medium text-amber-800">
              {upcomingExpirations.length} permis expire(nt) dans les 60 prochains jours
            </span>
          </CardContent>
        </Card>
      )}

      {/* Filtres */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher un permis..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(0); }}
            className="pl-9"
          />
        </div>
        <Select value={typeFilter} onValueChange={(v) => { setTypeFilter(v); setPage(0); }}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les types</SelectItem>
            {PERMIT_TYPES.map(t => (
              <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(0); }}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Statut" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les statuts</SelectItem>
            <SelectItem value="pending">En attente</SelectItem>
            <SelectItem value="validated">Validé</SelectItem>
            <SelectItem value="rejected">Rejeté</SelectItem>
            <SelectItem value="expired">Expiré</SelectItem>
            <SelectItem value="renewal_required">Renouvellement</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">Chargement...</div>
      ) : items.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Shield className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p>Aucun permis trouvé</p>
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left p-3 font-medium">Référence</th>
                <th className="text-left p-3 font-medium">Type</th>
                <th className="text-left p-3 font-medium">Émetteur</th>
                <th className="text-left p-3 font-medium">Statut</th>
                <th className="text-left p-3 font-medium">Expiration</th>
                <th className="text-right p-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {items.map((permit) => {
                const st = STATUS_CONFIG[permit.status] || STATUS_CONFIG.pending;
                const isExpiringSoon = permit.expiresAt && permit.expiresAt > Date.now() &&
                  permit.expiresAt < Date.now() + 30 * 24 * 60 * 60 * 1000;
                return (
                  <tr key={permit.id} className="hover:bg-muted/30">
                    <td className="p-3">
                      <div className="font-medium">{permit.reference || `#${permit.id}`}</div>
                      {permit.description && (
                        <div className="text-xs text-muted-foreground line-clamp-1">{permit.description}</div>
                      )}
                    </td>
                    <td className="p-3">
                      <Badge variant="outline" className="text-xs">
                        {PERMIT_TYPES.find(t => t.value === permit.type)?.label || permit.type}
                      </Badge>
                    </td>
                    <td className="p-3 text-muted-foreground">
                      {permit.issuedBy || "—"}
                    </td>
                    <td className="p-3">
                      <Badge className={`${st.color} text-xs`}>
                        {st.label}
                      </Badge>
                    </td>
                    <td className="p-3">
                      {permit.expiresAt ? (
                        <div className={`flex items-center gap-1 text-xs ${isExpiringSoon ? "text-orange-600 font-medium" : "text-muted-foreground"}`}>
                          {isExpiringSoon && <AlertTriangle className="h-3 w-3" />}
                          <Calendar className="h-3 w-3" />
                          {new Date(permit.expiresAt).toLocaleDateString("fr-FR")}
                        </div>
                      ) : "—"}
                    </td>
                    <td className="p-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {hasPermission("erp_compliance", "approve") && permit.status === "pending" && (
                          <>
                            <Button variant="ghost" size="icon" onClick={() => validateMutation.mutate({ id: permit.id })} title="Valider">
                              <CheckCircle className="h-4 w-4 text-green-600" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => setRejectId(permit.id)} title="Rejeter">
                              <XCircle className="h-4 w-4 text-red-600" />
                            </Button>
                          </>
                        )}
                        {hasPermission("erp_compliance", "delete") && (
                          <Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate({ id: permit.id })} title="Supprimer">
                            <Trash2 className="h-4 w-4 text-red-500" />
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
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">
            {total} permis — Page {page + 1}/{totalPages}
          </span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(p => p - 1)}>
              Précédent
            </Button>
            <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>
              Suivant
            </Button>
          </div>
        </div>
      )}

      {/* Dialog Rejet */}
      <Dialog open={!!rejectId} onOpenChange={(open) => { if (!open) { setRejectId(null); setRejectReason(""); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rejeter le permis</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Label>Motif du rejet</Label>
            <Textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Indiquez le motif du rejet..."
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setRejectId(null); setRejectReason(""); }}>Annuler</Button>
            <Button
              variant="destructive"
              disabled={!rejectReason.trim() || rejectMutation.isPending}
              onClick={() => rejectId && rejectMutation.mutate({ id: rejectId, reason: rejectReason })}
            >
              Confirmer le rejet
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ---- Sous-composant formulaire création ----
function CreatePermitForm({ onSubmit, isLoading }: { onSubmit: (v: any) => void; isLoading: boolean }) {
  const [type, setType] = useState("permis_construire");
  const [reference, setReference] = useState("");
  const [description, setDescription] = useState("");
  const [issuedBy, setIssuedBy] = useState("");
  const [alertDays, setAlertDays] = useState(30);

  return (
    <div className="space-y-4">
      <div>
        <Label>Type *</Label>
        <Select value={type} onValueChange={setType}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {PERMIT_TYPES.map(t => (
              <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label>Référence</Label>
        <Input value={reference} onChange={(e) => setReference(e.target.value)} placeholder="N° de référence" />
      </div>
      <div>
        <Label>Description</Label>
        <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Description du permis" rows={2} />
      </div>
      <div>
        <Label>Émis par</Label>
        <Input value={issuedBy} onChange={(e) => setIssuedBy(e.target.value)} placeholder="Autorité émettrice" />
      </div>
      <div>
        <Label>Alerte (jours avant expiration)</Label>
        <Input type="number" value={alertDays} onChange={(e) => setAlertDays(Number(e.target.value))} min={1} max={365} />
      </div>
      <DialogFooter>
        <Button disabled={isLoading} onClick={() => onSubmit({
          type,
          reference: reference || undefined,
          description: description || undefined,
          issuedBy: issuedBy || undefined,
          alertDaysBefore: alertDays,
        })}>
          {isLoading ? "Création..." : "Créer"}
        </Button>
      </DialogFooter>
    </div>
  );
}
