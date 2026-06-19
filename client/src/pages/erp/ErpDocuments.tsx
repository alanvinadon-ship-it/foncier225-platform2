import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { useErpPermissions } from "@/hooks/useErpPermissions";
import {
  FileText, Upload, Search, CheckCircle, XCircle, Clock, AlertTriangle,
  Download, Eye, Plus, Trash2, History
} from "lucide-react";

const DOC_TYPES = [
  { value: "permis_construire", label: "Permis de construire" },
  { value: "plan_technique", label: "Plan technique" },
  { value: "contrat", label: "Contrat" },
  { value: "facture", label: "Facture" },
  { value: "attestation", label: "Attestation" },
  { value: "certification", label: "Certification" },
  { value: "rapport_securite", label: "Rapport sécurité" },
  { value: "autre", label: "Autre" },
] as const;

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: typeof CheckCircle }> = {
  draft: { label: "Brouillon", color: "bg-gray-100 text-gray-800", icon: Clock },
  pending: { label: "En attente", color: "bg-yellow-100 text-yellow-800", icon: Clock },
  validated: { label: "Validé", color: "bg-green-100 text-green-800", icon: CheckCircle },
  rejected: { label: "Rejeté", color: "bg-red-100 text-red-800", icon: XCircle },
  expired: { label: "Expiré", color: "bg-orange-100 text-orange-800", icon: AlertTriangle },
};

export default function ErpDocuments() {
  const { hasPermission } = useErpPermissions();
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [page, setPage] = useState(0);
  const [createOpen, setCreateOpen] = useState(false);
  const [detailId, setDetailId] = useState<number | null>(null);
  const [rejectId, setRejectId] = useState<number | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const limit = 15;

  const utils = trpc.useUtils();

  const { data, isLoading } = trpc.erp.documents.list.useQuery({
    limit,
    offset: page * limit,
    search: search || undefined,
    type: typeFilter !== "all" ? typeFilter as typeof DOC_TYPES[number]["value"] : undefined,
    status: statusFilter !== "all" ? statusFilter as any : undefined,
  });

  const { data: expiredDocs } = trpc.erp.documents.expired.useQuery();
  const { data: detail } = trpc.erp.documents.getById.useQuery(
    { id: detailId! },
    { enabled: !!detailId }
  );

  const createMutation = trpc.erp.documents.create.useMutation({
    onSuccess: () => {
      toast.success("Document créé avec succès");
      setCreateOpen(false);
      utils.erp.documents.list.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const validateMutation = trpc.erp.documents.validate.useMutation({
    onSuccess: () => {
      toast.success("Document validé");
      utils.erp.documents.list.invalidate();
      utils.erp.documents.getById.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const rejectMutation = trpc.erp.documents.reject.useMutation({
    onSuccess: () => {
      toast.success("Document rejeté");
      setRejectId(null);
      setRejectReason("");
      utils.erp.documents.list.invalidate();
      utils.erp.documents.getById.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const deleteMutation = trpc.erp.documents.delete.useMutation({
    onSuccess: () => {
      toast.success("Document supprimé");
      utils.erp.documents.list.invalidate();
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
            <FileText className="h-6 w-6 text-blue-600" />
            Documents
          </h1>
          <p className="text-muted-foreground mt-1">
            Gestion des documents de chantier et administratifs
          </p>
        </div>
        {hasPermission("erp_documents", "create") && (
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4 mr-2" />Nouveau document</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Créer un document</DialogTitle>
              </DialogHeader>
              <CreateDocumentForm
                onSubmit={(values) => createMutation.mutate(values)}
                isLoading={createMutation.isPending}
              />
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Alerte documents expirés */}
      {expiredDocs && expiredDocs.length > 0 && (
        <Card className="border-orange-200 bg-orange-50">
          <CardContent className="py-3 flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-orange-600" />
            <span className="text-sm font-medium text-orange-800">
              {expiredDocs.length} document(s) expiré(s) nécessitent votre attention
            </span>
          </CardContent>
        </Card>
      )}

      {/* Filtres */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher un document..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(0); }}
            className="pl-9"
          />
        </div>
        <Select value={typeFilter} onValueChange={(v) => { setTypeFilter(v); setPage(0); }}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les types</SelectItem>
            {DOC_TYPES.map(t => (
              <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(0); }}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Statut" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les statuts</SelectItem>
            <SelectItem value="draft">Brouillon</SelectItem>
            <SelectItem value="pending">En attente</SelectItem>
            <SelectItem value="validated">Validé</SelectItem>
            <SelectItem value="rejected">Rejeté</SelectItem>
            <SelectItem value="expired">Expiré</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">Chargement...</div>
      ) : items.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <FileText className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p>Aucun document trouvé</p>
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left p-3 font-medium">Titre</th>
                <th className="text-left p-3 font-medium">Type</th>
                <th className="text-left p-3 font-medium">Statut</th>
                <th className="text-left p-3 font-medium">Taille</th>
                <th className="text-left p-3 font-medium">Date</th>
                <th className="text-right p-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {items.map((doc) => {
                const st = STATUS_CONFIG[doc.status] || STATUS_CONFIG.draft;
                const Icon = st.icon;
                return (
                  <tr key={doc.id} className="hover:bg-muted/30">
                    <td className="p-3">
                      <div className="font-medium">{doc.title}</div>
                      {doc.fileName && (
                        <div className="text-xs text-muted-foreground">{doc.fileName}</div>
                      )}
                    </td>
                    <td className="p-3">
                      <Badge variant="outline" className="text-xs">
                        {DOC_TYPES.find(t => t.value === doc.type)?.label || doc.type}
                      </Badge>
                    </td>
                    <td className="p-3">
                      <Badge className={`${st.color} text-xs`}>
                        <Icon className="h-3 w-3 mr-1" />
                        {st.label}
                      </Badge>
                    </td>
                    <td className="p-3 text-muted-foreground">
                      {doc.fileSize ? formatFileSize(doc.fileSize) : "—"}
                    </td>
                    <td className="p-3 text-muted-foreground">
                      {doc.createdAt ? new Date(doc.createdAt).toLocaleDateString("fr-FR") : "—"}
                    </td>
                    <td className="p-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => setDetailId(doc.id)} title="Détails">
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" title="Télécharger" onClick={() => toast.info("Téléchargement via la vue détail")}>
                          <Download className="h-4 w-4" />
                        </Button>
                        {hasPermission("erp_documents", "approve") && doc.status === "pending" && (
                          <>
                            <Button variant="ghost" size="icon" onClick={() => validateMutation.mutate({ id: doc.id })} title="Valider">
                              <CheckCircle className="h-4 w-4 text-green-600" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => setRejectId(doc.id)} title="Rejeter">
                              <XCircle className="h-4 w-4 text-red-600" />
                            </Button>
                          </>
                        )}
                        {hasPermission("erp_documents", "delete") && (
                          <Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate({ id: doc.id })} title="Supprimer">
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
            {total} document(s) — Page {page + 1}/{totalPages}
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

      {/* Dialog Détail */}
      <Dialog open={!!detailId} onOpenChange={(open) => { if (!open) setDetailId(null); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Détail du document</DialogTitle>
          </DialogHeader>
          {detail ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-muted-foreground">Titre :</span> <strong>{detail.title}</strong></div>
                <div><span className="text-muted-foreground">Type :</span> {DOC_TYPES.find(t => t.value === detail.type)?.label || detail.type}</div>
                <div><span className="text-muted-foreground">Statut :</span> <Badge className={STATUS_CONFIG[detail.status]?.color}>{STATUS_CONFIG[detail.status]?.label}</Badge></div>
                <div><span className="text-muted-foreground">Fichier :</span> {detail.fileName || "—"}</div>
                {detail.expiresAt && (
                  <div className="col-span-2"><span className="text-muted-foreground">Expire le :</span> {new Date(detail.expiresAt).toLocaleDateString("fr-FR")}</div>
                )}
                {detail.rejectionReason && (
                  <div className="col-span-2"><span className="text-muted-foreground">Motif rejet :</span> <span className="text-red-600">{detail.rejectionReason}</span></div>
                )}
              </div>
              {detail.versions && detail.versions.length > 0 && (
                <div>
                  <h4 className="font-medium flex items-center gap-1 mb-2"><History className="h-4 w-4" /> Versions ({detail.versions.length})</h4>
                  <div className="space-y-1 max-h-40 overflow-y-auto">
                    {detail.versions.map((v: any) => (
                      <div key={v.id} className="flex items-center justify-between text-xs border rounded p-2">
                        <span>v{v.version} — {v.fileName}</span>
                        <span className="text-muted-foreground">{new Date(v.createdAt).toLocaleDateString("fr-FR")}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-4 text-muted-foreground">Chargement...</div>
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog Rejet */}
      <Dialog open={!!rejectId} onOpenChange={(open) => { if (!open) { setRejectId(null); setRejectReason(""); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rejeter le document</DialogTitle>
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
function CreateDocumentForm({ onSubmit, isLoading }: { onSubmit: (v: any) => void; isLoading: boolean }) {
  const [title, setTitle] = useState("");
  const [type, setType] = useState("autre");

  return (
    <div className="space-y-4">
      <div>
        <Label>Titre *</Label>
        <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Nom du document" />
      </div>
      <div>
        <Label>Type</Label>
        <Select value={type} onValueChange={setType}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {DOC_TYPES.map(t => (
              <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <DialogFooter>
        <Button disabled={!title.trim() || isLoading} onClick={() => onSubmit({ title, type })}>
          {isLoading ? "Création..." : "Créer"}
        </Button>
      </DialogFooter>
    </div>
  );
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
}
