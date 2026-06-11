import { LandTitleTimeline, LandTitleStatusBadge, STATUS_CONFIG, type LandTitleStatus } from "@/components/LandTitleTimeline";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Eye,
  FileText,
  Loader2,
  MapPin,
  Plus,
  Shield,
  User,
  XCircle,
} from "lucide-react";
import { useState } from "react";
import { Link, useParams } from "wouter";
import { toast } from "sonner";

// Valid transitions for admin advancement
const VALID_TRANSITIONS: Record<string, string[]> = {
  cf_draft: ["cf_submitted"],
  cf_submitted: ["cf_delimitation", "cf_rejected"],
  cf_delimitation: ["cf_delimited"],
  cf_delimited: ["cf_inquiry"],
  cf_inquiry: ["cf_publicity"],
  cf_publicity: ["cf_opposed", "cf_validated"],
  cf_opposed: ["cf_validated", "cf_rejected"],
  cf_validated: ["cf_signed", "cf_rejected"],
  cf_signed: ["tf_submitted"],
  tf_submitted: ["tf_afor_review", "tf_rejected"],
  tf_afor_review: ["tf_apfr_ready", "tf_rejected"],
  tf_apfr_ready: ["tf_minister_signing"],
  tf_minister_signing: ["tf_signed", "tf_rejected"],
  tf_signed: ["tf_registered"],
};

export default function AdminLandTitleDetail() {
  const params = useParams<{ id: string }>();
  const appId = parseInt(params.id || "0", 10);
  const utils = trpc.useUtils();

  const { data, isLoading, error } = trpc.landTitle.admin.getByIdAdmin.useQuery(
    { id: appId },
    { enabled: appId > 0 }
  );

  // State for dialogs
  const [showAdvanceDialog, setShowAdvanceDialog] = useState(false);
  const [advanceTarget, setAdvanceTarget] = useState("");
  const [advanceNotes, setAdvanceNotes] = useState("");

  const [showOppositionDialog, setShowOppositionDialog] = useState(false);
  const [oppForm, setOppForm] = useState({ opponentName: "", opponentContact: "", reason: "" });

  const [showResolveDialog, setShowResolveDialog] = useState(false);
  const [resolveTarget, setResolveTarget] = useState<{ id: number; action: "confirmed" | "dismissed" } | null>(null);
  const [resolveNotes, setResolveNotes] = useState("");

  const [previewDoc, setPreviewDoc] = useState<{ url: string; label: string; mimeType?: string } | null>(null);

  // Mutations
  const advanceMutation = trpc.landTitle.admin.advanceStep.useMutation({
    onSuccess: () => {
      toast.success("Statut avancé avec succès");
      utils.landTitle.admin.getByIdAdmin.invalidate({ id: appId });
      setShowAdvanceDialog(false);
      setAdvanceNotes("");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const addOppositionMutation = trpc.landTitle.admin.addOpposition.useMutation({
    onSuccess: () => {
      toast.success("Opposition enregistrée");
      utils.landTitle.admin.getByIdAdmin.invalidate({ id: appId });
      setShowOppositionDialog(false);
      setOppForm({ opponentName: "", opponentContact: "", reason: "" });
    },
    onError: (err: any) => toast.error(err.message),
  });

  const resolveOppositionMutation = trpc.landTitle.admin.resolveOpposition.useMutation({
    onSuccess: () => {
      toast.success("Opposition traitée");
      utils.landTitle.admin.getByIdAdmin.invalidate({ id: appId });
      setShowResolveDialog(false);
      setResolveNotes("");
    },
    onError: (err: any) => toast.error(err.message),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-ci-green" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="space-y-4">
        <Link href="/admin/land-title">
          <Button variant="ghost" size="sm" className="gap-2">
            <ArrowLeft className="h-4 w-4" /> Retour
          </Button>
        </Link>
        <Card className="border-destructive/50 bg-destructive/5">
          <CardContent className="p-6 text-center">
            <AlertTriangle className="h-8 w-8 text-destructive mx-auto mb-2" />
            <p className="text-destructive text-sm">{error?.message || "Dossier introuvable"}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const nextStatuses = VALID_TRANSITIONS[data.status] || [];

  function handleAdvance() {
    if (!advanceTarget) return;
    advanceMutation.mutate({
      applicationId: appId,
      newStatus: advanceTarget,
      notes: advanceNotes || undefined,
    });
  }

  function handleAddOpposition() {
    if (!oppForm.opponentName || !oppForm.reason) return;
    addOppositionMutation.mutate({
      applicationId: appId,
      opponentName: oppForm.opponentName,
      opponentContact: oppForm.opponentContact || undefined,
      reason: oppForm.reason,
    });
  }

  function handleResolveOpposition() {
    if (!resolveTarget) return;
    resolveOppositionMutation.mutate({
      oppositionId: resolveTarget.id,
      status: resolveTarget.action,
      resolutionNotes: resolveNotes || undefined,
    });
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/admin/land-title">
          <Button variant="ghost" size="icon" className="shrink-0">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-xl font-bold tracking-tight">{data.applicationNumber}</h1>
            <LandTitleStatusBadge status={data.status as LandTitleStatus} />
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">
            {data.phase === "certificate" ? "Certificat Foncier" : "Titre Foncier"} — {data.applicantFullName}
          </p>
        </div>
        {/* Advance button */}
        {nextStatuses.length > 0 && (
          <Button
            onClick={() => setShowAdvanceDialog(true)}
            className="bg-ci-green hover:bg-ci-green/90 gap-2 shrink-0"
          >
            <ArrowRight className="h-4 w-4" />
            Avancer le statut
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Left: Timeline + Documents */}
        <div className="xl:col-span-2 space-y-6">
          {/* Timeline */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="text-base">Avancement de la procédure</CardTitle>
              </CardHeader>
              <CardContent>
                <LandTitleTimeline
                  currentStatus={data.status as LandTitleStatus}
                  phase={data.phase as "certificate" | "title"}
                  certificateSignedAt={data.certificateSignedAt}
                  certificateExpiryAt={data.certificateExpiryAt}
                  createdAt={data.createdAt}
                />
              </CardContent>
            </Card>
          </motion.div>

          {/* Documents */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="text-base flex items-center gap-2">
                  <FileText className="h-4 w-4 text-indigo-600" />
                  Documents ({data.documents?.length || 0})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {(!data.documents || data.documents.length === 0) ? (
                  <p className="text-sm text-muted-foreground">Aucun document dans ce dossier</p>
                ) : (
                  <div className="divide-y">
                    {data.documents.map((doc: any) => (
                      <div key={doc.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                        <div className="flex h-8 w-8 items-center justify-center rounded bg-indigo-50 shrink-0">
                          <FileText className="h-4 w-4 text-indigo-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{doc.label}</p>
                          <p className="text-xs text-muted-foreground">
                            {doc.documentType} — {doc.mimeType || "Fichier"}
                            {doc.verified && <span className="text-ci-green ml-2">Vérifié</span>}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="gap-1.5 text-xs"
                          onClick={() => setPreviewDoc({ url: doc.fileUrl, label: doc.label, mimeType: doc.mimeType })}
                        >
                          <Eye className="h-3.5 w-3.5" />
                          Voir
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Right: Info + Oppositions */}
        <div className="space-y-4">
          {/* Applicant */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <User className="h-4 w-4 text-ci-orange" />
                Demandeur
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div><span className="text-muted-foreground">Nom :</span> <span className="font-medium">{data.applicantFullName}</span></div>
              {data.applicantNationality && <div><span className="text-muted-foreground">Nationalité :</span> <span className="font-medium">{data.applicantNationality}</span></div>}
              {data.applicantIdType && <div><span className="text-muted-foreground">{data.applicantIdType} :</span> <span className="font-medium">{data.applicantIdNumber}</span></div>}
            </CardContent>
          </Card>

          {/* Land */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <MapPin className="h-4 w-4 text-ci-green" />
                Terrain
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {data.landLocality && <div><span className="text-muted-foreground">Localité :</span> <span className="font-medium">{data.landLocality}</span></div>}
              {data.landSubPrefecture && <div><span className="text-muted-foreground">Sous-préfecture :</span> <span className="font-medium">{data.landSubPrefecture}</span></div>}
              {data.landDepartment && <div><span className="text-muted-foreground">Département :</span> <span className="font-medium">{data.landDepartment}</span></div>}
              {data.landRegion && <div><span className="text-muted-foreground">Région :</span> <span className="font-medium">{data.landRegion}</span></div>}
              {data.landAreaHectares && <div><span className="text-muted-foreground">Superficie :</span> <span className="font-medium">{data.landAreaHectares} ha</span></div>}
            </CardContent>
          </Card>

          {/* Oppositions */}
          <Card className={data.oppositions?.length > 0 ? "border-red-200" : ""}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Shield className="h-4 w-4 text-red-600" />
                  Oppositions ({data.oppositions?.length || 0})
                </CardTitle>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs gap-1"
                  onClick={() => setShowOppositionDialog(true)}
                >
                  <Plus className="h-3 w-3" />
                  Ajouter
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {(!data.oppositions || data.oppositions.length === 0) ? (
                <p className="text-xs text-muted-foreground">Aucune opposition enregistrée</p>
              ) : (
                <div className="space-y-3">
                  {data.oppositions.map((opp: any) => (
                    <div key={opp.id} className="border rounded-lg p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">{opp.opponentName}</span>
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                          opp.status === "dismissed" ? "bg-green-100 text-green-700" :
                          opp.status === "confirmed" ? "bg-red-100 text-red-700" :
                          "bg-amber-100 text-amber-700"
                        }`}>
                          {opp.status === "pending" ? "En attente" :
                           opp.status === "confirmed" ? "Confirmée" : "Rejetée"}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2">{opp.reason}</p>
                      {opp.status === "pending" && (
                        <div className="flex gap-2 pt-1">
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-6 text-xs gap-1 text-red-600 hover:text-red-700"
                            onClick={() => { setResolveTarget({ id: opp.id, action: "confirmed" }); setShowResolveDialog(true); }}
                          >
                            <AlertTriangle className="h-3 w-3" />
                            Confirmer
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-6 text-xs gap-1 text-green-600 hover:text-green-700"
                            onClick={() => { setResolveTarget({ id: opp.id, action: "dismissed" }); setShowResolveDialog(true); }}
                          >
                            <XCircle className="h-3 w-3" />
                            Rejeter
                          </Button>
                        </div>
                      )}
                      {opp.resolutionNotes && (
                        <p className="text-xs text-muted-foreground italic border-t pt-1 mt-1">
                          Note : {opp.resolutionNotes}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Operator info */}
          {data.operatorName && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Opérateur technique</CardTitle>
              </CardHeader>
              <CardContent className="space-y-1 text-sm">
                <div><span className="text-muted-foreground">Nom :</span> <span className="font-medium">{data.operatorName}</span></div>
                {data.operatorLicense && <div><span className="text-muted-foreground">Agrément :</span> <span className="font-medium">{data.operatorLicense}</span></div>}
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* ─── Dialogs ─── */}

      {/* Advance Status Dialog */}
      <Dialog open={showAdvanceDialog} onOpenChange={setShowAdvanceDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Avancer le statut du dossier</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Nouveau statut</Label>
              <Select value={advanceTarget} onValueChange={setAdvanceTarget}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner le statut cible" />
                </SelectTrigger>
                <SelectContent>
                  {nextStatuses.map((s) => {
                    const cfg = STATUS_CONFIG[s as LandTitleStatus];
                    return (
                      <SelectItem key={s} value={s}>
                        {cfg?.label || s}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Notes (optionnel)</Label>
              <Textarea
                value={advanceNotes}
                onChange={(e) => setAdvanceNotes(e.target.value)}
                placeholder="Commentaire sur cette transition..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAdvanceDialog(false)}>Annuler</Button>
            <Button
              onClick={handleAdvance}
              disabled={!advanceTarget || advanceMutation.isPending}
              className="bg-ci-green hover:bg-ci-green/90 gap-2"
            >
              {advanceMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              <CheckCircle2 className="h-4 w-4" />
              Confirmer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Opposition Dialog */}
      <Dialog open={showOppositionDialog} onOpenChange={setShowOppositionDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Enregistrer une opposition</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Nom de l'opposant <span className="text-destructive">*</span></Label>
              <Input
                value={oppForm.opponentName}
                onChange={(e) => setOppForm(p => ({ ...p, opponentName: e.target.value }))}
                placeholder="Ex: Diallo Mamadou"
              />
            </div>
            <div className="space-y-2">
              <Label>Contact</Label>
              <Input
                value={oppForm.opponentContact}
                onChange={(e) => setOppForm(p => ({ ...p, opponentContact: e.target.value }))}
                placeholder="Téléphone ou adresse"
              />
            </div>
            <div className="space-y-2">
              <Label>Motif de l'opposition <span className="text-destructive">*</span></Label>
              <Textarea
                value={oppForm.reason}
                onChange={(e) => setOppForm(p => ({ ...p, reason: e.target.value }))}
                placeholder="Décrivez le motif..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowOppositionDialog(false)}>Annuler</Button>
            <Button
              onClick={handleAddOpposition}
              disabled={!oppForm.opponentName || !oppForm.reason || addOppositionMutation.isPending}
              className="bg-red-600 hover:bg-red-700 gap-2"
            >
              {addOppositionMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Enregistrer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Resolve Opposition Dialog */}
      <Dialog open={showResolveDialog} onOpenChange={setShowResolveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {resolveTarget?.action === "confirmed" ? "Confirmer l'opposition" : "Rejeter l'opposition"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">
              {resolveTarget?.action === "confirmed"
                ? "L'opposition sera marquée comme confirmée. Cela peut bloquer l'avancement du dossier."
                : "L'opposition sera rejetée et ne bloquera plus la procédure."}
            </p>
            <div className="space-y-2">
              <Label>Notes de résolution</Label>
              <Textarea
                value={resolveNotes}
                onChange={(e) => setResolveNotes(e.target.value)}
                placeholder="Motif de la décision..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowResolveDialog(false)}>Annuler</Button>
            <Button
              onClick={handleResolveOpposition}
              disabled={resolveOppositionMutation.isPending}
              className={resolveTarget?.action === "confirmed" ? "bg-red-600 hover:bg-red-700" : "bg-green-600 hover:bg-green-700"}
            >
              {resolveOppositionMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Confirmer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Document Preview Dialog */}
      <Dialog open={!!previewDoc} onOpenChange={() => setPreviewDoc(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="truncate">{previewDoc?.label}</DialogTitle>
          </DialogHeader>
          <div className="flex-1 min-h-[400px] bg-muted/30 rounded-lg overflow-hidden">
            {previewDoc && (
              previewDoc.mimeType?.startsWith("image/") ? (
                <img
                  src={previewDoc.url}
                  alt={previewDoc.label}
                  className="w-full h-full object-contain max-h-[70vh]"
                />
              ) : previewDoc.mimeType === "application/pdf" ? (
                <iframe
                  src={previewDoc.url}
                  className="w-full h-[70vh] border-0"
                  title={previewDoc.label}
                />
              ) : (
                <div className="flex flex-col items-center justify-center h-[300px] gap-4">
                  <FileText className="h-12 w-12 text-muted-foreground/40" />
                  <p className="text-sm text-muted-foreground">Prévisualisation non disponible pour ce type de fichier</p>
                  <a href={previewDoc.url} target="_blank" rel="noopener noreferrer">
                    <Button variant="outline" size="sm" className="gap-2">
                      <Eye className="h-4 w-4" />
                      Ouvrir dans un nouvel onglet
                    </Button>
                  </a>
                </div>
              )
            )}
          </div>
          <DialogFooter>
            {previewDoc && (
              <a href={previewDoc.url} target="_blank" rel="noopener noreferrer" download>
                <Button variant="outline" size="sm">Télécharger</Button>
              </a>
            )}
            <Button onClick={() => setPreviewDoc(null)}>Fermer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
