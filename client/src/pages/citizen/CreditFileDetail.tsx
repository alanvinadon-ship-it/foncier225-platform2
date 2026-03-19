import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import {
  CREDIT_DOCUMENT_STATUS_LABELS,
  CREDIT_DOCUMENT_TYPE_LABELS,
  CREDIT_FILE_STATUS_LABELS,
  CREDIT_PRODUCT_TYPE_LABELS,
  CreditDocumentStatus,
  CreditDocumentType,
  CreditFileStatus,
} from "@shared/credit-types";
import {
  ArrowLeft,
  CheckCircle2,
  Circle,
  ExternalLink,
  FileUp,
  Loader2,
  Send,
  Upload,
  XCircle,
} from "lucide-react";
import { useRef, useState } from "react";
import { useParams } from "wouter";
import { toast } from "sonner";
import { useLocation } from "wouter";

const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  DRAFT: "outline",
  DOCS_PENDING: "secondary",
  SUBMITTED: "default",
  UNDER_REVIEW: "default",
  OFFERED: "default",
  ACCEPTED: "default",
  APPROVED: "default",
  REJECTED: "destructive",
  CLOSED: "secondary",
};

const DOC_STATUS_ICON: Record<string, React.ReactNode> = {
  UPLOADED: <CheckCircle2 className="h-4 w-4 text-ci-orange" />,
  VALIDATED: <CheckCircle2 className="h-4 w-4 text-ci-green" />,
  REJECTED: <XCircle className="h-4 w-4 text-destructive" />,
  PENDING: <Circle className="h-4 w-4 text-muted-foreground" />,
};

function formatAmount(amount: number | null): string {
  if (!amount) return "—";
  return new Intl.NumberFormat("fr-FR").format(amount) + " XOF";
}

function formatDate(date: Date | string | null): string {
  if (!date) return "—";
  return new Date(date).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatFileSize(bytes: number | null): string {
  if (!bytes) return "—";
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
}

export default function CreditFileDetail() {
  const params = useParams<{ id: string }>();
  const creditFileId = parseInt(params.id || "0", 10);
  const [, setLocation] = useLocation();
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [selectedDocType, setSelectedDocType] = useState<string>("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const utils = trpc.useUtils();

  const { data: creditFile, isLoading: fileLoading } = trpc.credit.getMyCreditFile.useQuery(
    { creditFileId },
    { enabled: creditFileId > 0 }
  );

  const { data: checklist, isLoading: checklistLoading } = trpc.credit.getCreditFileChecklist.useQuery(
    { creditFileId },
    { enabled: creditFileId > 0 }
  );

  const { data: documents } = trpc.credit.listCreditFileDocuments.useQuery(
    { creditFileId },
    { enabled: creditFileId > 0 }
  );

  const uploadMutation = trpc.credit.addCreditDocument.useMutation({
    onSuccess: () => {
      toast.success("Document ajouté avec succès");
      setUploadDialogOpen(false);
      setSelectedDocType("");
      setSelectedFile(null);
      utils.credit.listCreditFileDocuments.invalidate({ creditFileId });
      utils.credit.getCreditFileChecklist.invalidate({ creditFileId });
      utils.credit.getMyCreditFile.invalidate({ creditFileId });
    },
    onError: (err) => {
      toast.error("Erreur lors de l'upload", { description: err.message });
    },
  });

  const submitMutation = trpc.credit.submitCreditFile.useMutation({
    onSuccess: () => {
      toast.success("Dossier soumis avec succès", {
        description: "Votre dossier est en cours de traitement.",
      });
      utils.credit.getMyCreditFile.invalidate({ creditFileId });
      utils.credit.getCreditFileChecklist.invalidate({ creditFileId });
    },
    onError: (err) => {
      toast.error("Impossible de soumettre", { description: err.message });
    },
  });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedTypes = ["application/pdf", "image/jpeg", "image/jpg", "image/png"];
    if (!allowedTypes.includes(file.type)) {
      toast.error("Format non autorisé", {
        description: "Formats acceptés : PDF, JPG, PNG",
      });
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error("Fichier trop volumineux", {
        description: "Taille maximum : 10 Mo",
      });
      return;
    }

    setSelectedFile(file);
  };

  const handleUpload = async () => {
    if (!selectedFile || !selectedDocType) return;

    const reader = new FileReader();
    reader.onload = () => {
      const base64 = (reader.result as string).split(",")[1];
      uploadMutation.mutate({
        creditFileId,
        documentType: selectedDocType as any,
        fileBase64: base64,
        fileName: selectedFile.name,
        contentType: selectedFile.type,
      });
    };
    reader.readAsDataURL(selectedFile);
  };

  if (fileLoading || checklistLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => setLocation("/citizen/credit")}>
            <ArrowLeft className="h-4 w-4 mr-1" />
            Retour
          </Button>
          <h1 className="text-2xl font-bold tracking-tight">Dossier de crédit</h1>
        </div>
        <div className="flex items-center justify-center py-20">
          <div className="animate-pulse text-muted-foreground">Chargement...</div>
        </div>
      </div>
    );
  }

  if (!creditFile) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => setLocation("/citizen/credit")}>
            <ArrowLeft className="h-4 w-4 mr-1" />
            Retour
          </Button>
          <h1 className="text-2xl font-bold tracking-tight">Dossier introuvable</h1>
        </div>
        <p className="text-muted-foreground">Ce dossier n'existe pas ou vous n'y avez pas accès.</p>
      </div>
    );
  }

  const canUpload =
    creditFile.status === CreditFileStatus.DRAFT ||
    creditFile.status === CreditFileStatus.DOCS_PENDING;

  const canSubmit =
    checklist?.isComplete &&
    (creditFile.status === CreditFileStatus.DRAFT ||
      creditFile.status === CreditFileStatus.DOCS_PENDING);

  // Determine which doc types are already uploaded
  const uploadedTypes = new Set<string>(documents?.map((d) => d.documentType) || []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => setLocation("/citizen/credit")}>
            <ArrowLeft className="h-4 w-4 mr-1" />
            Retour
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              {creditFile.publicRef || `Dossier #${creditFile.id}`}
            </h1>
            <p className="text-muted-foreground mt-1">
              {CREDIT_PRODUCT_TYPE_LABELS[creditFile.productType as keyof typeof CREDIT_PRODUCT_TYPE_LABELS]}
            </p>
          </div>
        </div>
        <Badge variant={STATUS_VARIANT[creditFile.status] || "outline"} className="text-sm px-3 py-1">
          {CREDIT_FILE_STATUS_LABELS[creditFile.status as CreditFileStatus] || creditFile.status}
        </Badge>
      </div>

      {/* Summary Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Synthèse du dossier</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Référence</p>
              <p className="font-mono font-medium mt-1">{creditFile.publicRef || `#${creditFile.id}`}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Montant</p>
              <p className="font-medium mt-1">{formatAmount(creditFile.amountRequestedXof)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Durée</p>
              <p className="font-medium mt-1">
                {creditFile.durationMonths ? `${creditFile.durationMonths} mois` : "—"}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Créé le</p>
              <p className="font-medium mt-1">{formatDate(creditFile.createdAt)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Checklist Card */}
      {checklist && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">Documents requis</CardTitle>
                <CardDescription>
                  {checklist.isComplete
                    ? "Tous les documents requis sont fournis"
                    : `${checklist.requiredDocuments.missing.length} document(s) manquant(s)`}
                </CardDescription>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-ci-orange">{checklist.completionPercentage}%</p>
                <p className="text-xs text-muted-foreground">Complétude</p>
              </div>
            </div>
            <Progress value={checklist.completionPercentage} className="mt-2" />
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Documents obligatoires</p>
              {/* Build required list from checklist service structure */}
              {(() => {
                // The checklist returns { total, uploaded, missing: CreditDocumentType[] }
                // We need to reconstruct the full required list from the product type
                const allRequired = creditFile.productType === "STANDARD"
                  ? ["ID_CARD", "PROOF_INCOME", "PROOF_RESIDENCE", "LAND_TITLE_DEED"]
                  : ["ID_CARD", "PROOF_RESIDENCE", "LAND_TITLE_DEED"];
                return allRequired.map((docType: string) => {
                  const isProvided = !checklist.requiredDocuments.missing.includes(docType as any);
                return (
                  <div key={docType} className="flex items-center justify-between py-2 border-b last:border-0">
                    <div className="flex items-center gap-3">
                      {isProvided ? (
                        <CheckCircle2 className="h-5 w-5 text-ci-green" />
                      ) : (
                        <Circle className="h-5 w-5 text-muted-foreground" />
                      )}
                      <span className={isProvided ? "" : "text-muted-foreground"}>
                        {CREDIT_DOCUMENT_TYPE_LABELS[docType as CreditDocumentType] || docType}
                      </span>
                    </div>
                    {isProvided ? (
                      <Badge variant="outline" className="text-ci-green border-ci-green/30">Fourni</Badge>
                    ) : (
                      <Badge variant="outline" className="text-muted-foreground">Manquant</Badge>
                    )}
                  </div>
                );
                });
              })()}

              {checklist.optionalDocuments && checklist.optionalDocuments.missing && checklist.optionalDocuments.missing.length > 0 && (
                <>
                  <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider mt-4">Documents optionnels</p>
                  {(() => {
                    const allOptional = creditFile.productType === "SIMPLIFIED" ? ["PROOF_INCOME"] : [];
                    return allOptional.map((docType: string) => {
                    const isProvided = uploadedTypes.has(docType);
                    return (
                      <div key={docType} className="flex items-center justify-between py-2 border-b last:border-0">
                        <div className="flex items-center gap-3">
                          {isProvided ? (
                            <CheckCircle2 className="h-5 w-5 text-ci-green" />
                          ) : (
                            <Circle className="h-5 w-5 text-muted-foreground/50" />
                          )}
                          <span className="text-muted-foreground">
                            {CREDIT_DOCUMENT_TYPE_LABELS[docType as CreditDocumentType] || docType}
                          </span>
                        </div>
                        <Badge variant="outline" className="text-muted-foreground/60">
                          {isProvided ? "Fourni" : "Optionnel"}
                        </Badge>
                      </div>
                    );
                    });
                  })()}
                </>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Documents Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">Documents ajoutés</CardTitle>
              <CardDescription>
                {documents && documents.length > 0
                  ? `${documents.length} document(s) dans le dossier`
                  : "Aucun document ajouté pour le moment"}
              </CardDescription>
            </div>
            {canUpload && (
              <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-ci-orange hover:bg-ci-orange/90" size="sm">
                    <Upload className="h-4 w-4 mr-2" />
                    Ajouter un document
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Ajouter un document</DialogTitle>
                    <DialogDescription>
                      Sélectionnez le type de document et le fichier à télécharger. Formats acceptés : PDF, JPG, PNG (max 10 Mo).
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 pt-4">
                    <div className="space-y-2">
                      <Label>Type de document *</Label>
                      <Select value={selectedDocType} onValueChange={setSelectedDocType}>
                        <SelectTrigger>
                          <SelectValue placeholder="Sélectionnez le type" />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.values(CreditDocumentType).map((dt) => (
                            <SelectItem key={dt} value={dt}>
                              {CREDIT_DOCUMENT_TYPE_LABELS[dt]}
                              {uploadedTypes.has(dt) && (
                                <span className="text-xs text-muted-foreground ml-2">(remplacera l'existant)</span>
                              )}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Fichier *</Label>
                      <div
                        className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:bg-muted/50 transition-colors"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        {selectedFile ? (
                          <div className="flex items-center justify-center gap-2">
                            <FileUp className="h-5 w-5 text-ci-orange" />
                            <span className="font-medium">{selectedFile.name}</span>
                            <span className="text-muted-foreground text-sm">
                              ({formatFileSize(selectedFile.size)})
                            </span>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center gap-2">
                            <Upload className="h-8 w-8 text-muted-foreground" />
                            <p className="text-sm text-muted-foreground">
                              Cliquez pour sélectionner un fichier
                            </p>
                            <p className="text-xs text-muted-foreground">
                              PDF, JPG, PNG — max 10 Mo
                            </p>
                          </div>
                        )}
                      </div>
                      <input
                        ref={fileInputRef}
                        type="file"
                        className="hidden"
                        accept=".pdf,.jpg,.jpeg,.png"
                        onChange={handleFileSelect}
                      />
                    </div>

                    <div className="flex gap-3 pt-2">
                      <Button
                        variant="outline"
                        onClick={() => {
                          setUploadDialogOpen(false);
                          setSelectedDocType("");
                          setSelectedFile(null);
                        }}
                        className="flex-1"
                      >
                        Annuler
                      </Button>
                      <Button
                        onClick={handleUpload}
                        disabled={!selectedDocType || !selectedFile || uploadMutation.isPending}
                        className="flex-1 bg-ci-orange hover:bg-ci-orange/90"
                      >
                        {uploadMutation.isPending ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Envoi en cours...
                          </>
                        ) : (
                          <>
                            <Upload className="h-4 w-4 mr-2" />
                            Envoyer
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {!documents || documents.length === 0 ? (
            <div className="flex flex-col items-center py-8 gap-2 text-muted-foreground">
              <FileUp className="h-10 w-10 text-muted-foreground/40" />
              <p>Aucun document ajouté</p>
              {canUpload && (
                <p className="text-sm">Cliquez sur "Ajouter un document" pour commencer</p>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {documents.map((doc) => (
                <div key={doc.id} className="flex items-center justify-between py-3 border-b last:border-0">
                  <div className="flex items-center gap-3">
                    {DOC_STATUS_ICON[doc.status] || DOC_STATUS_ICON.PENDING}
                    <div>
                      <p className="font-medium text-sm">
                        {CREDIT_DOCUMENT_TYPE_LABELS[doc.documentType as CreditDocumentType] || doc.documentType}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                        <span>{formatDate(doc.uploadedAt)}</span>
                        {doc.fileSize && <span>• {formatFileSize(doc.fileSize)}</span>}
                        {doc.mimeType && <span>• {doc.mimeType.split("/")[1]?.toUpperCase()}</span>}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      {CREDIT_DOCUMENT_STATUS_LABELS[doc.status as CreditDocumentStatus] || doc.status}
                    </Badge>
                    {doc.fileUrl && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => doc.fileUrl && window.open(doc.fileUrl, "_blank")}
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Submit Action */}
      {canUpload && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Soumettre le dossier</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {canSubmit
                    ? "Votre dossier est complet. Vous pouvez le soumettre pour examen."
                    : "Complétez tous les documents requis avant de soumettre votre dossier."}
                </p>
              </div>
              <Button
                onClick={() => submitMutation.mutate({ creditFileId })}
                disabled={!canSubmit || submitMutation.isPending}
                className="bg-ci-green hover:bg-ci-green/90"
              >
                {submitMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Soumission...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Soumettre
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Post-submission info */}
      {creditFile.status === CreditFileStatus.SUBMITTED && (
        <Card className="border-ci-green/30 bg-ci-green/5">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-6 w-6 text-ci-green" />
              <div>
                <p className="font-medium text-ci-green">Dossier soumis</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Votre dossier a été soumis le {formatDate(creditFile.submittedAt)}. Il sera examiné par un agent bancaire dans les meilleurs délais.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
