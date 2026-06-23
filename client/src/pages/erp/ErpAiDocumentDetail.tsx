import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useParams, useLocation } from "wouter";
import {
  ArrowLeft, FileText, Eye, ScanText, Tag, CheckCircle, History,
  RefreshCw, XCircle, Loader2, AlertTriangle, ExternalLink,
  FileSpreadsheet, Layers, Zap, Check, X, Pencil, Send
} from "lucide-react";
import { Input } from "@/components/ui/input";

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  pending: { label: "En attente", color: "bg-gray-100 text-gray-700" },
  running: { label: "En cours", color: "bg-blue-100 text-blue-700" },
  ocr_completed: { label: "OCR terminé", color: "bg-indigo-100 text-indigo-700" },
  classification_completed: { label: "Classifié", color: "bg-green-100 text-green-700" },
  needs_review: { label: "À valider", color: "bg-amber-100 text-amber-700" },
  validated: { label: "Validé", color: "bg-emerald-100 text-emerald-700" },
  rejected: { label: "Rejeté", color: "bg-red-100 text-red-700" },
  failed: { label: "Échoué", color: "bg-red-100 text-red-700" },
  cancelled: { label: "Annulé", color: "bg-gray-100 text-gray-500" },
};

export default function ErpAiDocumentDetail() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const jobId = parseInt(id || "0");
  const [rejectReason, setRejectReason] = useState("");
  const [correctType, setCorrectType] = useState("");
  const [correctComment, setCorrectComment] = useState("");

  const job = trpc.erp.aiDocumentExtraction.jobs.getById.useQuery({ id: jobId }, { enabled: jobId > 0 });
  const ocrResult = trpc.erp.aiDocumentExtraction.ocr.getResult.useQuery({ jobId }, { enabled: jobId > 0 });
  const classification = trpc.erp.aiDocumentExtraction.classification.getResult.useQuery({ jobId }, { enabled: jobId > 0 });
  const validationLogs = trpc.erp.aiDocumentExtraction.validationLogs.list.useQuery({ jobId }, { enabled: jobId > 0 });
  const documentTypes = trpc.erp.aiDocumentExtraction.documentTypes.useQuery();

  const runJob = trpc.erp.aiDocumentExtraction.jobs.run.useMutation({
    onSuccess: () => { toast.success("Analyse lancée"); job.refetch(); ocrResult.refetch(); classification.refetch(); },
    onError: (err) => toast.error(err.message),
  });
  const retryOcr = trpc.erp.aiDocumentExtraction.jobs.retryOcr.useMutation({
    onSuccess: () => { toast.success("OCR relancé"); job.refetch(); ocrResult.refetch(); },
    onError: (err) => toast.error(err.message),
  });
  const retryClassification = trpc.erp.aiDocumentExtraction.jobs.retryClassification.useMutation({
    onSuccess: () => { toast.success("Classification relancée"); job.refetch(); classification.refetch(); },
    onError: (err) => toast.error(err.message),
  });
  const validateJob = trpc.erp.aiDocumentExtraction.jobs.validate.useMutation({
    onSuccess: () => { toast.success("Job validé"); job.refetch(); validationLogs.refetch(); },
    onError: (err) => toast.error(err.message),
  });
  const rejectJob = trpc.erp.aiDocumentExtraction.jobs.reject.useMutation({
    onSuccess: () => { toast.success("Job rejeté"); job.refetch(); validationLogs.refetch(); setRejectReason(""); },
    onError: (err) => toast.error(err.message),
  });
  const confirmClassification = trpc.erp.aiDocumentExtraction.classification.confirm.useMutation({
    onSuccess: () => { toast.success("Classification confirmée"); job.refetch(); classification.refetch(); validationLogs.refetch(); },
    onError: (err) => toast.error(err.message),
  });
  const correctClassification = trpc.erp.aiDocumentExtraction.classification.correct.useMutation({
    onSuccess: () => { toast.success("Classification corrigée"); job.refetch(); classification.refetch(); validationLogs.refetch(); setCorrectType(""); setCorrectComment(""); },
    onError: (err) => toast.error(err.message),
  });

  if (!job.data) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const j = job.data;
  const status = STATUS_LABELS[j.jobStatus] || STATUS_LABELS.pending;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => navigate("/erp/ai/documents")}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Retour
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold">{j.jobNumber}</h1>
            <Badge variant="secondary" className={status.color}>{status.label}</Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-1">{j.fileName} • {((j.fileSize || 0) / 1024).toFixed(0)} KB</p>
        </div>
        <div className="flex gap-2">
          {j.jobStatus === "pending" && (
            <Button size="sm" onClick={() => runJob.mutate({ id: jobId })} disabled={runJob.isPending}>
              {runJob.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <ScanText className="h-4 w-4 mr-1" />}
              Lancer l'analyse
            </Button>
          )}
          {(j.jobStatus === "needs_review" || j.jobStatus === "classification_completed") && (
            <>
              <Button size="sm" variant="default" onClick={() => validateJob.mutate({ id: jobId })} disabled={validateJob.isPending}>
                <CheckCircle className="h-4 w-4 mr-1" /> Valider
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="preview">
        <TabsList>
          <TabsTrigger value="preview"><Eye className="h-4 w-4 mr-1" /> Aperçu</TabsTrigger>
          <TabsTrigger value="ocr"><ScanText className="h-4 w-4 mr-1" /> OCR</TabsTrigger>
          <TabsTrigger value="classification"><Tag className="h-4 w-4 mr-1" /> Classification</TabsTrigger>
          <TabsTrigger value="fields"><FileSpreadsheet className="h-4 w-4 mr-1" /> Champs</TabsTrigger>
          <TabsTrigger value="lines"><Layers className="h-4 w-4 mr-1" /> Lignes</TabsTrigger>
          <TabsTrigger value="apply"><Zap className="h-4 w-4 mr-1" /> Application</TabsTrigger>
          <TabsTrigger value="validation"><CheckCircle className="h-4 w-4 mr-1" /> Validation</TabsTrigger>
          <TabsTrigger value="history"><History className="h-4 w-4 mr-1" /> Historique</TabsTrigger>
        </TabsList>

        {/* TAB: Aperçu */}
        <TabsContent value="preview" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader><CardTitle className="text-sm">Informations du fichier</CardTitle></CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Nom</span><span className="font-medium">{j.fileName}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Type MIME</span><span>{j.fileType}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Taille</span><span>{((j.fileSize || 0) / 1024).toFixed(1)} KB</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Module source</span><span>{j.sourceModule || "—"}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Créé le</span><span>{new Date(j.createdAt).toLocaleString("fr-FR")}</span></div>
                {j.durationMs && <div className="flex justify-between"><span className="text-muted-foreground">Durée traitement</span><span>{(j.durationMs / 1000).toFixed(1)}s</span></div>}
                {j.fileUrl && (
                  <a href={j.fileUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-blue-600 hover:underline mt-2">
                    <ExternalLink className="h-3 w-3" /> Voir le fichier original
                  </a>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-sm">Résultat de l'analyse</CardTitle></CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Statut OCR</span>
                  <Badge variant="secondary" className="text-xs">{j.ocrStatus}</Badge>
                </div>
                <div className="flex justify-between"><span className="text-muted-foreground">Statut Classification</span>
                  <Badge variant="secondary" className="text-xs">{j.classificationStatus}</Badge>
                </div>
                <div className="flex justify-between"><span className="text-muted-foreground">Type détecté</span>
                  <span className="font-medium">{j.detectedDocumentType || "—"}</span>
                </div>
                <div className="flex justify-between"><span className="text-muted-foreground">Type confirmé</span>
                  <span className="font-medium text-emerald-600">{j.confirmedDocumentType || "—"}</span>
                </div>
                <div className="flex justify-between"><span className="text-muted-foreground">Confiance</span>
                  <span className={`font-bold ${(j.confidenceScore || 0) >= 80 ? "text-emerald-600" : (j.confidenceScore || 0) >= 60 ? "text-amber-600" : "text-red-600"}`}>
                    {j.confidenceScore != null ? `${j.confidenceScore}%` : "—"}
                  </span>
                </div>
                {j.errorMessage && (
                  <div className="mt-2 p-2 bg-red-50 rounded text-red-700 text-xs">
                    <AlertTriangle className="h-3 w-3 inline mr-1" />{j.errorMessage}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
          {/* Preview iframe for PDF */}
          {j.fileUrl && j.fileType === "application/pdf" && (
            <Card>
              <CardContent className="p-0">
                <iframe src={j.fileUrl} className="w-full h-[500px] rounded-b" title="Aperçu PDF" />
              </CardContent>
            </Card>
          )}
          {j.fileUrl && j.fileType.startsWith("image/") && (
            <Card>
              <CardContent className="p-4 flex justify-center">
                <img src={j.fileUrl} alt={j.fileName} className="max-h-[500px] object-contain rounded" />
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* TAB: OCR */}
        <TabsContent value="ocr" className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-medium">Résultat OCR</h3>
            <Button size="sm" variant="outline" onClick={() => retryOcr.mutate({ id: jobId })} disabled={retryOcr.isPending}>
              <RefreshCw className="h-4 w-4 mr-1" /> Relancer OCR
            </Button>
          </div>
          {ocrResult.data ? (
            <div className="space-y-3">
              <div className="grid grid-cols-4 gap-3">
                <Card><CardContent className="pt-3 pb-2 px-3 text-center">
                  <p className="text-xs text-muted-foreground">Pages</p>
                  <p className="text-lg font-bold">{ocrResult.data.pagesCount}</p>
                </CardContent></Card>
                <Card><CardContent className="pt-3 pb-2 px-3 text-center">
                  <p className="text-xs text-muted-foreground">Confiance</p>
                  <p className="text-lg font-bold">{ocrResult.data.confidenceScore}%</p>
                </CardContent></Card>
                <Card><CardContent className="pt-3 pb-2 px-3 text-center">
                  <p className="text-xs text-muted-foreground">Moteur</p>
                  <p className="text-lg font-bold">{ocrResult.data.ocrEngine}</p>
                </CardContent></Card>
                <Card><CardContent className="pt-3 pb-2 px-3 text-center">
                  <p className="text-xs text-muted-foreground">Durée</p>
                  <p className="text-lg font-bold">{((ocrResult.data.processingTimeMs || 0) / 1000).toFixed(1)}s</p>
                </CardContent></Card>
              </div>
              <Card>
                <CardHeader><CardTitle className="text-sm">Texte extrait (nettoyé)</CardTitle></CardHeader>
                <CardContent>
                  <pre className="whitespace-pre-wrap text-sm bg-muted/50 p-4 rounded max-h-[400px] overflow-y-auto font-mono">
                    {ocrResult.data.cleanedText || "(Aucun texte extrait)"}
                  </pre>
                </CardContent>
              </Card>
            </div>
          ) : (
            <Card><CardContent className="py-8 text-center text-muted-foreground">
              <ScanText className="h-8 w-8 mx-auto mb-2 opacity-50" />
              Aucun résultat OCR. Lancez l'analyse pour extraire le texte.
            </CardContent></Card>
          )}
        </TabsContent>

        {/* TAB: Classification */}
        <TabsContent value="classification" className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-medium">Classification IA</h3>
            <Button size="sm" variant="outline" onClick={() => retryClassification.mutate({ id: jobId })} disabled={retryClassification.isPending}>
              <RefreshCw className="h-4 w-4 mr-1" /> Reclassifier
            </Button>
          </div>
          {classification.data ? (
            <div className="space-y-4">
              <Card>
                <CardContent className="pt-4 space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Type détecté</span>
                    <span className="font-bold text-lg">{classification.data.detectedDocumentType}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Module recommandé</span>
                    <Badge variant="secondary">{classification.data.recommendedModule}</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Confiance</span>
                    <span className={`font-bold text-lg ${(classification.data.confidenceScore || 0) >= 80 ? "text-emerald-600" : "text-amber-600"}`}>
                      {classification.data.confidenceScore}%
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Statut</span>
                    <Badge variant="secondary">{classification.data.status}</Badge>
                  </div>
                  <div className="pt-2 border-t">
                    <p className="text-xs text-muted-foreground mb-1">Raison de la classification :</p>
                    <p className="text-sm">{classification.data.classificationReason}</p>
                  </div>
                </CardContent>
              </Card>

              {/* Alternatives */}
              {classification.data.alternativeTypesJson && (
                <Card>
                  <CardHeader><CardTitle className="text-sm">Types alternatifs</CardTitle></CardHeader>
                  <CardContent>
                    {(() => {
                      try {
                        const alts = JSON.parse(classification.data.alternativeTypesJson);
                        return (
                          <div className="space-y-2">
                            {alts.map((alt: any, i: number) => (
                              <div key={i} className="flex items-center justify-between p-2 bg-muted/30 rounded">
                                <span className="text-sm">{alt.documentType || alt.document_type}</span>
                                <span className="text-sm font-medium">{alt.confidenceScore || alt.confidence_score}%</span>
                              </div>
                            ))}
                          </div>
                        );
                      } catch { return <p className="text-sm text-muted-foreground">Aucune alternative</p>; }
                    })()}
                  </CardContent>
                </Card>
              )}

              {/* Actions */}
              {classification.data.status !== "validated" && classification.data.status !== "corrected" && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card>
                    <CardHeader><CardTitle className="text-sm text-emerald-700">Confirmer la classification</CardTitle></CardHeader>
                    <CardContent>
                      <p className="text-xs text-muted-foreground mb-3">Confirmer que le type "{classification.data.detectedDocumentType}" est correct.</p>
                      <Button size="sm" onClick={() => confirmClassification.mutate({ jobId })} disabled={confirmClassification.isPending}>
                        <CheckCircle className="h-4 w-4 mr-1" /> Confirmer
                      </Button>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader><CardTitle className="text-sm text-amber-700">Corriger la classification</CardTitle></CardHeader>
                    <CardContent className="space-y-2">
                      <Select value={correctType} onValueChange={setCorrectType}>
                        <SelectTrigger><SelectValue placeholder="Choisir le bon type..." /></SelectTrigger>
                        <SelectContent>
                          {documentTypes.data?.map((dt) => (
                            <SelectItem key={dt.type} value={dt.type}>{dt.type} ({dt.module})</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Textarea placeholder="Commentaire (optionnel)" value={correctComment} onChange={(e) => setCorrectComment(e.target.value)} rows={2} />
                      <Button size="sm" variant="outline" disabled={!correctType || correctClassification.isPending}
                        onClick={() => correctClassification.mutate({ jobId, newDocumentType: correctType, comments: correctComment || undefined })}>
                        Corriger
                      </Button>
                    </CardContent>
                  </Card>
                </div>
              )}
            </div>
          ) : (
            <Card><CardContent className="py-8 text-center text-muted-foreground">
              <Tag className="h-8 w-8 mx-auto mb-2 opacity-50" />
              Aucune classification. Lancez l'analyse pour classifier le document.
            </CardContent></Card>
          )}
        </TabsContent>

        {/* TAB: Champs extraits (Lot 2) */}
        <TabsContent value="fields" className="space-y-4">
          <FieldsTab jobId={Number(id)} />
        </TabsContent>

        {/* TAB: Lignes détectées (Lot 2) */}
        <TabsContent value="lines" className="space-y-4">
          <LinesTab jobId={Number(id)} />
        </TabsContent>

        {/* TAB: Application ERP (Lot 2) */}
        <TabsContent value="apply" className="space-y-4">
          <ApplyTab jobId={Number(id)} />
        </TabsContent>

        {/* TAB: Validation */}
        <TabsContent value="validation" className="space-y-4">
          <h3 className="font-medium">Validation humaine</h3>
          {j.jobStatus === "validated" ? (
            <Card><CardContent className="py-6 text-center">
              <CheckCircle className="h-10 w-10 text-emerald-500 mx-auto mb-2" />
              <p className="font-medium text-emerald-700">Ce document a été validé</p>
              <p className="text-sm text-muted-foreground mt-1">
                Validé le {j.validatedAt ? new Date(j.validatedAt).toLocaleString("fr-FR") : "—"}
              </p>
            </CardContent></Card>
          ) : j.jobStatus === "rejected" ? (
            <Card><CardContent className="py-6 text-center">
              <XCircle className="h-10 w-10 text-red-500 mx-auto mb-2" />
              <p className="font-medium text-red-700">Ce document a été rejeté</p>
              <p className="text-sm text-muted-foreground mt-1">{j.rejectionReason}</p>
            </CardContent></Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader><CardTitle className="text-sm text-emerald-700">Valider le job</CardTitle></CardHeader>
                <CardContent>
                  <p className="text-xs text-muted-foreground mb-3">
                    Confirmer que l'extraction et la classification sont correctes.
                  </p>
                  <Button onClick={() => validateJob.mutate({ id: jobId })} disabled={validateJob.isPending}>
                    <CheckCircle className="h-4 w-4 mr-1" /> Valider le document
                  </Button>
                </CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle className="text-sm text-red-700">Rejeter le job</CardTitle></CardHeader>
                <CardContent className="space-y-2">
                  <Textarea
                    placeholder="Motif du rejet (obligatoire)..."
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    rows={3}
                  />
                  <Button variant="destructive" size="sm" disabled={!rejectReason.trim() || rejectJob.isPending}
                    onClick={() => rejectJob.mutate({ id: jobId, reason: rejectReason })}>
                    <XCircle className="h-4 w-4 mr-1" /> Rejeter
                  </Button>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        {/* TAB: Historique */}
        <TabsContent value="history" className="space-y-4">
          <h3 className="font-medium">Historique des actions</h3>
          {validationLogs.data?.length ? (
            <div className="space-y-2">
              {validationLogs.data.map((log) => (
                <div key={log.id} className="flex items-start gap-3 p-3 bg-muted/30 rounded">
                  <History className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{log.action}</span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(log.performedAt).toLocaleString("fr-FR")}
                      </span>
                    </div>
                    {log.oldDocumentType && log.newDocumentType && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {log.oldDocumentType} → {log.newDocumentType}
                      </p>
                    )}
                    {log.comments && <p className="text-xs mt-1">{log.comments}</p>}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <Card><CardContent className="py-6 text-center text-muted-foreground">
              <History className="h-8 w-8 mx-auto mb-2 opacity-50" />
              Aucun historique d'action pour ce job.
            </CardContent></Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ============================================================
// LOT 2 — COMPOSANTS ONGLETS EXTRACTION
// ============================================================

function FieldsTab({ jobId }: { jobId: number }) {
  const extraction = trpc.erp.aiDocumentExtraction.extraction.getByJobId.useQuery({ jobId });
  const fields = trpc.erp.aiDocumentExtraction.fields.list.useQuery(
    { extractionId: extraction.data?.id || 0 },
    { enabled: !!extraction.data?.id }
  );
  const runExtraction = trpc.erp.aiDocumentExtraction.extraction.run.useMutation({
    onSuccess: () => { extraction.refetch(); fields.refetch(); toast.success("Extraction lancée"); },
    onError: (e) => toast.error(e.message),
  });
  const confirmField = trpc.erp.aiDocumentExtraction.fields.confirm.useMutation({ onSuccess: () => fields.refetch() });
  const rejectField = trpc.erp.aiDocumentExtraction.fields.reject.useMutation({ onSuccess: () => fields.refetch() });
  const correctField = trpc.erp.aiDocumentExtraction.fields.correct.useMutation({ onSuccess: () => fields.refetch() });
  const confirmAll = trpc.erp.aiDocumentExtraction.fields.confirmAll.useMutation({ onSuccess: () => fields.refetch() });
  const validateExtraction = trpc.erp.aiDocumentExtraction.extraction.validate.useMutation({
    onSuccess: () => { extraction.refetch(); toast.success("Extraction validée"); },
  });

  const [editingField, setEditingField] = useState<number | null>(null);
  const [editValue, setEditValue] = useState("");

  if (!extraction.data) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <FileSpreadsheet className="h-10 w-10 mx-auto mb-3 text-muted-foreground opacity-50" />
          <p className="text-muted-foreground mb-4">Aucune extraction de champs disponible.</p>
          <Button onClick={() => runExtraction.mutate({ jobId })} disabled={runExtraction.isPending}>
            {runExtraction.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Zap className="h-4 w-4 mr-2" />}
            Lancer l'extraction des champs
          </Button>
        </CardContent>
      </Card>
    );
  }

  const ext = extraction.data;
  const fieldsList = fields.data || [];
  const confirmedCount = fieldsList.filter(f => f.status === "confirmed" || f.status === "corrected").length;

  return (
    <div className="space-y-4">
      {/* Header extraction */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-medium">Champs extraits — {ext.documentType}</h3>
          <p className="text-sm text-muted-foreground">
            {fieldsList.length} champs détectés · {confirmedCount} confirmés · Score: {((ext.confidenceScore || 0))}%
          </p>
        </div>
        <div className="flex gap-2">
          {ext.status !== "validated" && fieldsList.length > 0 && (
            <Button size="sm" variant="outline" onClick={() => confirmAll.mutate({ extractionId: ext.id })}>
              <Check className="h-4 w-4 mr-1" /> Tout confirmer
            </Button>
          )}
          {ext.status !== "validated" && confirmedCount === fieldsList.length && fieldsList.length > 0 && (
            <Button size="sm" onClick={() => validateExtraction.mutate({ extractionId: ext.id })}>
              <CheckCircle className="h-4 w-4 mr-1" /> Valider l'extraction
            </Button>
          )}
        </div>
      </div>

      {/* Table des champs */}
      <Card>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left p-3 font-medium">Champ</th>
                <th className="text-left p-3 font-medium">Valeur extraite</th>
                <th className="text-left p-3 font-medium">Confiance</th>
                <th className="text-left p-3 font-medium">Statut</th>
                <th className="text-right p-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {fieldsList.map((field) => (
                <tr key={field.id} className="hover:bg-muted/30">
                  <td className="p-3">
                    <span className="font-medium">{field.fieldLabel || field.fieldKey}</span>
                  </td>
                  <td className="p-3">
                    {editingField === field.id ? (
                      <div className="flex gap-1">
                        <Input value={editValue} onChange={(e) => setEditValue(e.target.value)} className="h-7 text-sm" />
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => {
                          correctField.mutate({ fieldId: field.id, correctedValue: editValue });
                          setEditingField(null);
                        }}><Check className="h-3 w-3" /></Button>
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => setEditingField(null)}>
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ) : (
                      <span className={field.isCorrected ? "text-blue-600 font-medium" : ""}>
                        {field.isCorrected ? field.correctedValue : (field.normalizedValue || field.rawValue)}
                        {field.isCorrected && <Badge variant="outline" className="ml-2 text-xs">Corrigé</Badge>}
                      </span>
                    )}
                  </td>
                  <td className="p-3">
                    <Badge variant={field.confidenceScore && field.confidenceScore > 0.8 ? "default" : "secondary"}>
                      {((field.confidenceScore || 0) * 100).toFixed(0)}%
                    </Badge>
                  </td>
                  <td className="p-3">
                    <Badge variant={
                      field.status === "confirmed" || field.status === "corrected" ? "default" :
                      field.status === "rejected" ? "destructive" : "secondary"
                    }>
                      {field.status === "confirmed" ? "Confirmé" : field.status === "corrected" ? "Corrigé" : field.status === "rejected" ? "Rejeté" : "Suggéré"}
                    </Badge>
                  </td>
                  <td className="p-3 text-right">
                    {field.status === "suggested" && ext.status !== "validated" && (
                      <div className="flex gap-1 justify-end">
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => confirmField.mutate({ fieldId: field.id })} title="Confirmer">
                          <Check className="h-3 w-3 text-green-600" />
                        </Button>
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => { setEditingField(field.id); setEditValue(field.normalizedValue || field.rawValue || ""); }} title="Corriger">
                          <Pencil className="h-3 w-3 text-blue-600" />
                        </Button>
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => rejectField.mutate({ fieldId: field.id })} title="Rejeter">
                          <X className="h-3 w-3 text-red-600" />
                        </Button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {fieldsList.length === 0 && (
            <div className="py-8 text-center text-muted-foreground">
              <FileSpreadsheet className="h-8 w-8 mx-auto mb-2 opacity-50" />
              Aucun champ extrait.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function LinesTab({ jobId }: { jobId: number }) {
  const extraction = trpc.erp.aiDocumentExtraction.extraction.getByJobId.useQuery({ jobId });
  const lines = trpc.erp.aiDocumentExtraction.lineItems.list.useQuery(
    { extractionId: extraction.data?.id || 0 },
    { enabled: !!extraction.data?.id }
  );
  const confirmLine = trpc.erp.aiDocumentExtraction.lineItems.confirm.useMutation({ onSuccess: () => lines.refetch() });
  const removeLine = trpc.erp.aiDocumentExtraction.lineItems.remove.useMutation({ onSuccess: () => lines.refetch() });
  const updateLine = trpc.erp.aiDocumentExtraction.lineItems.update.useMutation({ onSuccess: () => lines.refetch() });
  const confirmAll = trpc.erp.aiDocumentExtraction.lineItems.confirmAll.useMutation({ onSuccess: () => lines.refetch() });

  const [editingLine, setEditingLine] = useState<number | null>(null);
  const [editData, setEditData] = useState<any>({});

  if (!extraction.data) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          <Layers className="h-10 w-10 mx-auto mb-3 opacity-50" />
          <p>Lancez d'abord l'extraction des champs (onglet Champs) pour détecter les lignes.</p>
        </CardContent>
      </Card>
    );
  }

  const linesList = lines.data || [];
  const confirmedCount = linesList.filter(l => l.status === "confirmed" || l.status === "corrected").length;
  const totalHT = linesList.reduce((sum, l) => sum + (l.lineTotal || 0), 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-medium">Lignes détectées</h3>
          <p className="text-sm text-muted-foreground">
            {linesList.length} lignes · {confirmedCount} confirmées · Total HT: {totalHT.toLocaleString("fr-FR")} FCFA
          </p>
        </div>
        {linesList.length > 0 && (
          <Button size="sm" variant="outline" onClick={() => confirmAll.mutate({ extractionId: extraction.data!.id })}>
            <Check className="h-4 w-4 mr-1" /> Tout confirmer
          </Button>
        )}
      </div>

      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left p-3 font-medium">#</th>
                <th className="text-left p-3 font-medium">Description</th>
                <th className="text-right p-3 font-medium">Qté</th>
                <th className="text-left p-3 font-medium">Unité</th>
                <th className="text-right p-3 font-medium">P.U.</th>
                <th className="text-right p-3 font-medium">Total</th>
                <th className="text-left p-3 font-medium">Statut</th>
                <th className="text-right p-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {linesList.map((line, idx) => (
                <tr key={line.id} className="hover:bg-muted/30">
                  <td className="p-3 text-muted-foreground">{line.lineNumber || idx + 1}</td>
                  <td className="p-3">
                    {editingLine === line.id ? (
                      <Input value={editData.description || ""} onChange={(e) => setEditData({ ...editData, description: e.target.value })} className="h-7 text-sm" />
                    ) : (
                      <span className="truncate max-w-[200px] block">{line.description}</span>
                    )}
                  </td>
                  <td className="p-3 text-right">
                    {editingLine === line.id ? (
                      <Input type="number" value={editData.quantity || 0} onChange={(e) => setEditData({ ...editData, quantity: Number(e.target.value) })} className="h-7 text-sm w-20" />
                    ) : (line.quantity || 0)}
                  </td>
                  <td className="p-3">{line.unit || "-"}</td>
                  <td className="p-3 text-right">
                    {editingLine === line.id ? (
                      <Input type="number" value={editData.unitPrice || 0} onChange={(e) => setEditData({ ...editData, unitPrice: Number(e.target.value) })} className="h-7 text-sm w-24" />
                    ) : ((line.unitPrice || 0).toLocaleString("fr-FR"))}
                  </td>
                  <td className="p-3 text-right font-medium">{(line.lineTotal || 0).toLocaleString("fr-FR")}</td>
                  <td className="p-3">
                    <Badge variant={line.status === "confirmed" || line.status === "corrected" ? "default" : line.status === "rejected" ? "destructive" : "secondary"}>
                      {line.status === "confirmed" ? "OK" : line.status === "corrected" ? "Corrigé" : line.status === "rejected" ? "Rejeté" : "Suggéré"}
                    </Badge>
                  </td>
                  <td className="p-3 text-right">
                    {line.status === "suggested" && (
                      <div className="flex gap-1 justify-end">
                        {editingLine === line.id ? (
                          <>
                            <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => {
                              updateLine.mutate({ lineId: line.id, ...editData });
                              setEditingLine(null);
                            }}><Check className="h-3 w-3 text-green-600" /></Button>
                            <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => setEditingLine(null)}>
                              <X className="h-3 w-3" />
                            </Button>
                          </>
                        ) : (
                          <>
                            <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => confirmLine.mutate({ lineId: line.id })} title="Confirmer">
                              <Check className="h-3 w-3 text-green-600" />
                            </Button>
                            <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => { setEditingLine(line.id); setEditData({ description: line.description, quantity: line.quantity, unitPrice: line.unitPrice }); }} title="Modifier">
                              <Pencil className="h-3 w-3 text-blue-600" />
                            </Button>
                            <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => removeLine.mutate({ lineId: line.id })} title="Supprimer">
                              <X className="h-3 w-3 text-red-600" />
                            </Button>
                          </>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {linesList.length === 0 && (
            <div className="py-8 text-center text-muted-foreground">
              <Layers className="h-8 w-8 mx-auto mb-2 opacity-50" />
              Aucune ligne détectée.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function ApplyTab({ jobId }: { jobId: number }) {
  const extraction = trpc.erp.aiDocumentExtraction.extraction.getByJobId.useQuery({ jobId });
  const job = trpc.erp.aiDocumentExtraction.jobs.getById.useQuery({ id: jobId });
  const recommendedActions = trpc.erp.aiDocumentExtraction.applyActions.recommendedActions.useQuery(
    { documentType: job.data?.detectedDocumentType || "" },
    { enabled: !!job.data?.detectedDocumentType }
  );
  const appliedActions = trpc.erp.aiDocumentExtraction.applyActions.list.useQuery(
    { extractionId: extraction.data?.id || 0 },
    { enabled: !!extraction.data?.id }
  );
  const applyToErp = trpc.erp.aiDocumentExtraction.applyActions.applyToErp.useMutation({
    onSuccess: (data) => { appliedActions.refetch(); toast.success(`Brouillon créé: ${data.targetModule} #${data.targetId}`); },
    onError: (e) => toast.error(e.message),
  });

  if (!extraction.data || extraction.data.status !== "validated") {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          <Zap className="h-10 w-10 mx-auto mb-3 opacity-50" />
          <p className="mb-2">L'extraction doit être validée avant d'appliquer vers un module ERP.</p>
          <p className="text-xs">Allez dans l'onglet "Champs" pour valider l'extraction.</p>
        </CardContent>
      </Card>
    );
  }

  const actions = recommendedActions.data || [];
  const applied = appliedActions.data || [];

  return (
    <div className="space-y-4">
      <h3 className="font-medium">Application vers modules ERP</h3>
      <p className="text-sm text-muted-foreground">
        Créez un brouillon dans le module ERP approprié à partir des données extraites et validées.
      </p>

      {/* Actions recommandées */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {actions.map((action: any) => {
          const alreadyApplied = applied.some(a => a.actionType === action.actionType);
          return (
            <Card key={action.actionType} className={alreadyApplied ? "border-green-200 bg-green-50/50" : ""}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium text-sm">{action.label}</h4>
                    <p className="text-xs text-muted-foreground mt-1">{action.description}</p>
                    <Badge variant="outline" className="mt-2 text-xs">{action.targetModule}</Badge>
                  </div>
                  {alreadyApplied ? (
                    <Badge className="bg-green-100 text-green-700"><Check className="h-3 w-3 mr-1" /> Appliqué</Badge>
                  ) : (
                    <Button size="sm" onClick={() => applyToErp.mutate({ extractionId: extraction.data!.id, actionType: action.actionType })} disabled={applyToErp.isPending}>
                      {applyToErp.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4 mr-1" />}
                      Appliquer
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {actions.length === 0 && (
        <Card>
          <CardContent className="py-6 text-center text-muted-foreground">
            Aucune action recommandée pour ce type de document.
          </CardContent>
        </Card>
      )}

      {/* Historique des applications */}
      {applied.length > 0 && (
        <div className="mt-6">
          <h4 className="font-medium text-sm mb-2">Historique des applications</h4>
          <div className="space-y-2">
            {applied.map((a) => (
              <Card key={a.id}>
                <CardContent className="p-3 flex items-center justify-between">
                  <div>
                    <span className="font-medium text-sm">{a.actionType}</span>
                    <span className="text-xs text-muted-foreground ml-2">→ {a.targetModule} #{a.targetId}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={a.status === "success" ? "default" : "destructive"}>
                      {a.status === "success" ? "Succès" : "Échec"}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {a.appliedAt ? new Date(a.appliedAt).toLocaleString("fr-FR") : ""}
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
