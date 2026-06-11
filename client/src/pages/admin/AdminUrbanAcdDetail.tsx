import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { trpc } from "@/lib/trpc";
import { useRoute } from "wouter";
import { Link } from "wouter";
import { useState } from "react";
import { toast } from "sonner";
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  FileText,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Plus,
  Gavel,
  User,
  MapPin,
  Calendar,
  ExternalLink,
} from "lucide-react";
import {
  ACD_STATUS_LABELS,
  ACD_PHASES,
  getAcdNextStatuses,
  isAcdTerminal,
  ACD_DOCUMENT_LABELS,
} from "@shared/acd-workflow";
import type { AcdStatus } from "@shared/acd-workflow";
import { AcdStatusBadge } from "@/components/AcdStatusBadge";
import AcdWorkflowGantt from "@/components/AcdWorkflowGantt";

export default function AdminUrbanAcdDetail() {
  const [, params] = useRoute("/admin/urban-acd/:id");
  const id = Number(params?.id);

  const [advanceDialogOpen, setAdvanceDialogOpen] = useState(false);
  const [selectedNextStatus, setSelectedNextStatus] = useState("");
  const [advanceNotes, setAdvanceNotes] = useState("");

  const [oppositionDialogOpen, setOppositionDialogOpen] = useState(false);
  const [oppName, setOppName] = useState("");
  const [oppContact, setOppContact] = useState("");
  const [oppReason, setOppReason] = useState("");

  const [resolveDialogOpen, setResolveDialogOpen] = useState(false);
  const [resolveOppId, setResolveOppId] = useState<number | null>(null);
  const [resolveStatus, setResolveStatus] = useState<"confirmed" | "dismissed">("dismissed");
  const [resolveNotes, setResolveNotes] = useState("");

  const utils = trpc.useUtils();

  const { data, isLoading, error } = trpc.urbanAcd.admin.getById.useQuery(
    { id },
    { enabled: !!id }
  );

  const advanceMutation = trpc.urbanAcd.admin.advanceStatus.useMutation({
    onSuccess: (result) => {
      toast.success(`Statut avancé vers : ${ACD_STATUS_LABELS[result.newStatus as AcdStatus] || result.newStatus}`);
      utils.urbanAcd.admin.getById.invalidate({ id });
      utils.urbanAcd.admin.list.invalidate();
      utils.urbanAcd.admin.stats.invalidate();
      setAdvanceDialogOpen(false);
      setSelectedNextStatus("");
      setAdvanceNotes("");
    },
    onError: (err) => toast.error(err.message),
  });

  const addOppositionMutation = trpc.urbanAcd.admin.addOpposition.useMutation({
    onSuccess: () => {
      toast.success("Opposition enregistrée");
      utils.urbanAcd.admin.getById.invalidate({ id });
      setOppositionDialogOpen(false);
      setOppName("");
      setOppContact("");
      setOppReason("");
    },
    onError: (err) => toast.error(err.message),
  });

  const resolveOppositionMutation = trpc.urbanAcd.admin.resolveOpposition.useMutation({
    onSuccess: () => {
      toast.success("Opposition résolue");
      utils.urbanAcd.admin.getById.invalidate({ id });
      setResolveDialogOpen(false);
      setResolveOppId(null);
      setResolveNotes("");
    },
    onError: (err) => toast.error(err.message),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-orange-600" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="text-center py-16">
        <XCircle className="h-12 w-12 mx-auto text-red-400 mb-4" />
        <p className="text-muted-foreground">Dossier introuvable</p>
        <Link href="/admin/urban-acd">
          <Button variant="link" className="mt-2">Retour à la liste</Button>
        </Link>
      </div>
    );
  }

  const currentStatus = data.status as AcdStatus;
  const nextStatuses = getAcdNextStatuses(currentStatus);
  const terminal = isAcdTerminal(currentStatus);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/admin/urban-acd">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-xl font-bold flex items-center gap-2">
              <Building2 className="h-5 w-5 text-orange-600" />
              {data.applicationNumber || `ACD-${data.id}`}
            </h1>
            <div className="flex items-center gap-2 mt-1">
              <AcdStatusBadge status={currentStatus} />
              {terminal && (
                <span className="text-xs text-muted-foreground">(Dossier clôturé)</span>
              )}
            </div>
          </div>
        </div>
        {!terminal && nextStatuses.length > 0 && (
          <Button
            onClick={() => setAdvanceDialogOpen(true)}
            className="bg-orange-600 hover:bg-orange-700"
          >
            <ArrowRight className="h-4 w-4 mr-2" />
            Avancer le statut
          </Button>
        )}
      </div>

      {/* Gantt */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Progression du dossier</CardTitle>
        </CardHeader>
        <CardContent>
          <AcdWorkflowGantt currentStatus={currentStatus} steps={data.steps as any} />
        </CardContent>
      </Card>

      {/* Info grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Infos parcelle */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              Informations du terrain
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3 text-sm">
              {data.commune && (
                <div>
                  <p className="text-muted-foreground">Commune</p>
                  <p className="font-medium">{data.commune}</p>
                </div>
              )}
              {data.quartier && (
                <div>
                  <p className="text-muted-foreground">Quartier</p>
                  <p className="font-medium">{data.quartier}</p>
                </div>
              )}
              {data.lotNumber && (
                <div>
                  <p className="text-muted-foreground">N° Lot</p>
                  <p className="font-medium">{data.lotNumber}</p>
                </div>
              )}
              {data.ilotNumber && (
                <div>
                  <p className="text-muted-foreground">N° Îlot</p>
                  <p className="font-medium">{data.ilotNumber}</p>
                </div>
              )}
              {(data as any).lotissement && (
                <div>
                  <p className="text-muted-foreground">Lotissement</p>
                  <p className="font-medium">{(data as any).lotissement}</p>
                </div>
              )}
              {data.surfaceM2 && (
                <div>
                  <p className="text-muted-foreground">Surface</p>
                  <p className="font-medium">{data.surfaceM2} m²</p>
                </div>
              )}
              {data.usagePrevu && (
                <div className="col-span-2">
                  <p className="text-muted-foreground">Usage prévu</p>
                  <p className="font-medium">{data.usagePrevu}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Infos demandeur */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <User className="h-4 w-4" />
              Demandeur
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="col-span-2">
                <p className="text-muted-foreground">ID utilisateur</p>
                <p className="font-medium">{data.userId}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Type demandeur</p>
                <p className="font-medium capitalize">{data.applicantType || "Personne physique"}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Date de dépôt</p>
                <p className="font-medium">
                  {(data as any).submittedAt
                    ? new Date((data as any).submittedAt).toLocaleDateString("fr-FR")
                    : "Non soumis"}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Créé le</p>
                <p className="font-medium">{new Date(data.createdAt).toLocaleDateString("fr-FR")}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Mis à jour</p>
                <p className="font-medium">{new Date(data.updatedAt).toLocaleDateString("fr-FR")}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Documents */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Documents ({data.documents?.length || 0})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!data.documents || data.documents.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Aucun document uploadé
            </p>
          ) : (
            <div className="space-y-2">
              {data.documents.map((doc: any) => (
                <div
                  key={doc.id}
                  className="flex items-center justify-between p-3 rounded-lg border"
                >
                  <div className="flex items-center gap-3">
                    <FileText className="h-4 w-4 text-orange-600" />
                    <div>
                      <p className="text-sm font-medium">
                        {ACD_DOCUMENT_LABELS[doc.documentType as keyof typeof ACD_DOCUMENT_LABELS] || doc.documentType}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Uploadé le {new Date(doc.createdAt).toLocaleDateString("fr-FR")}
                      </p>
                    </div>
                  </div>
                  {doc.fileUrl && (
                    <a href={doc.fileUrl} target="_blank" rel="noopener noreferrer">
                      <Button variant="ghost" size="sm">
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    </a>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Oppositions */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Gavel className="h-4 w-4" />
              Oppositions ({data.oppositions?.length || 0})
            </CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setOppositionDialogOpen(true)}
            >
              <Plus className="h-4 w-4 mr-1" />
              Ajouter
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {!data.oppositions || data.oppositions.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Aucune opposition enregistrée
            </p>
          ) : (
            <div className="space-y-3">
              {data.oppositions.map((opp: any) => (
                <div
                  key={opp.id}
                  className="p-4 rounded-lg border space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-amber-500" />
                      <span className="font-medium text-sm">{opp.opponentName}</span>
                      {opp.opponentContact && (
                        <span className="text-xs text-muted-foreground">({opp.opponentContact})</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {opp.status === "pending" && (
                        <span className="text-xs bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full">
                          En attente
                        </span>
                      )}
                      {opp.status === "confirmed" && (
                        <span className="text-xs bg-red-100 text-red-800 px-2 py-0.5 rounded-full">
                          Confirmée
                        </span>
                      )}
                      {opp.status === "dismissed" && (
                        <span className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded-full">
                          Rejetée
                        </span>
                      )}
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">{opp.reason}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">
                      Déposée le {new Date(opp.createdAt).toLocaleDateString("fr-FR")}
                    </span>
                    {opp.status === "pending" && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setResolveOppId(opp.id);
                          setResolveDialogOpen(true);
                        }}
                      >
                        Résoudre
                      </Button>
                    )}
                  </div>
                  {opp.resolutionNotes && (
                    <div className="mt-2 p-2 bg-muted rounded text-xs">
                      <span className="font-medium">Résolution :</span> {opp.resolutionNotes}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Historique des étapes */}
      {data.steps && data.steps.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Historique des étapes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {data.steps.map((step: any, i: number) => (
                <div
                  key={i}
                  className="flex items-center gap-3 p-2 rounded border-l-4"
                  style={{
                    borderLeftColor: step.status === "completed" ? "#16a34a" : step.status === "in_progress" ? "#f59e0b" : "#d1d5db",
                  }}
                >
                  <div className="flex-1">
                    <p className="text-sm font-medium">{step.stepType}</p>
                    {step.notes && <p className="text-xs text-muted-foreground">{step.notes}</p>}
                  </div>
                  <div className="text-right text-xs text-muted-foreground">
                    {step.status === "completed" && step.completedAt && (
                      <span>Terminé le {new Date(step.completedAt).toLocaleDateString("fr-FR")}</span>
                    )}
                    {step.status === "in_progress" && (
                      <span className="text-amber-600">En cours</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Dialog: Avancer le statut */}
      <Dialog open={advanceDialogOpen} onOpenChange={setAdvanceDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Avancer le statut du dossier</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <p className="text-sm text-muted-foreground mb-2">
                Statut actuel : <span className="font-medium">{ACD_STATUS_LABELS[currentStatus]}</span>
              </p>
              <Select value={selectedNextStatus} onValueChange={setSelectedNextStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="Choisir le nouveau statut" />
                </SelectTrigger>
                <SelectContent>
                  {nextStatuses.map((s: AcdStatus) => (
                    <SelectItem key={s} value={s}>
                      {ACD_STATUS_LABELS[s]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Textarea
                value={advanceNotes}
                onChange={(e) => setAdvanceNotes(e.target.value)}
                placeholder="Notes (optionnel)"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAdvanceDialogOpen(false)}>
              Annuler
            </Button>
            <Button
              onClick={() => advanceMutation.mutate({ id, newStatus: selectedNextStatus, notes: advanceNotes || undefined })}
              disabled={!selectedNextStatus || advanceMutation.isPending}
              className="bg-orange-600 hover:bg-orange-700"
            >
              {advanceMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Confirmer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Ajouter opposition */}
      <Dialog open={oppositionDialogOpen} onOpenChange={setOppositionDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Enregistrer une opposition</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium">Nom de l'opposant *</label>
              <Input
                value={oppName}
                onChange={(e) => setOppName(e.target.value)}
                placeholder="Nom complet"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Contact</label>
              <Input
                value={oppContact}
                onChange={(e) => setOppContact(e.target.value)}
                placeholder="Téléphone ou email"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Motif de l'opposition *</label>
              <Textarea
                value={oppReason}
                onChange={(e) => setOppReason(e.target.value)}
                placeholder="Décrivez le motif de l'opposition..."
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOppositionDialogOpen(false)}>
              Annuler
            </Button>
            <Button
              onClick={() =>
                addOppositionMutation.mutate({
                  applicationId: id,
                  opponentName: oppName,
                  opponentContact: oppContact || undefined,
                  reason: oppReason,
                })
              }
              disabled={!oppName || oppReason.length < 10 || addOppositionMutation.isPending}
            >
              {addOppositionMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Enregistrer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Résoudre opposition */}
      <Dialog open={resolveDialogOpen} onOpenChange={setResolveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Résoudre l'opposition</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium">Décision</label>
              <Select value={resolveStatus} onValueChange={(v) => setResolveStatus(v as "confirmed" | "dismissed")}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="dismissed">Rejetée (opposition non fondée)</SelectItem>
                  <SelectItem value="confirmed">Confirmée (opposition fondée)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">Notes de résolution</label>
              <Textarea
                value={resolveNotes}
                onChange={(e) => setResolveNotes(e.target.value)}
                placeholder="Motivez la décision..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResolveDialogOpen(false)}>
              Annuler
            </Button>
            <Button
              onClick={() =>
                resolveOppId &&
                resolveOppositionMutation.mutate({
                  oppositionId: resolveOppId,
                  status: resolveStatus,
                  resolutionNotes: resolveNotes || undefined,
                })
              }
              disabled={resolveOppositionMutation.isPending}
            >
              {resolveOppositionMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Confirmer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
