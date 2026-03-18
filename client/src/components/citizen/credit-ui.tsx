import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CREDIT_DOCUMENT_STATUS_LABELS, CREDIT_DOCUMENT_TYPE_LABELS, CREDIT_FILE_STATUS_LABELS, CREDIT_PRODUCT_TYPE_LABELS, type CreditDocumentStatus, type CreditDocumentType, type CreditFileStatus, type CreditProductType } from "@shared/credit-types";
import { AlertCircle, CheckCircle2, FileUp, Lock, UploadCloud } from "lucide-react";
import { useMemo, useState } from "react";

export const CREDIT_STATUS_STYLES: Record<string, string> = {
  DRAFT: "bg-slate-100 text-slate-700 border-slate-200",
  DOCS_PENDING: "bg-amber-100 text-amber-700 border-amber-200",
  SUBMITTED: "bg-blue-100 text-blue-700 border-blue-200",
  UNDER_REVIEW: "bg-indigo-100 text-indigo-700 border-indigo-200",
  OFFERED: "bg-violet-100 text-violet-700 border-violet-200",
  ACCEPTED: "bg-emerald-100 text-emerald-700 border-emerald-200",
  APPROVED: "bg-green-100 text-green-700 border-green-200",
  REJECTED: "bg-rose-100 text-rose-700 border-rose-200",
  CLOSED: "bg-zinc-100 text-zinc-700 border-zinc-200",
};

export const CREDIT_DOCUMENT_STATUS_STYLES: Record<string, string> = {
  PENDING: "bg-slate-100 text-slate-700 border-slate-200",
  UPLOADED: "bg-blue-100 text-blue-700 border-blue-200",
  VALIDATED: "bg-green-100 text-green-700 border-green-200",
  REJECTED: "bg-rose-100 text-rose-700 border-rose-200",
};

export const UPLOAD_ACCEPT = ".pdf,.jpg,.jpeg,.png";
export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

export function CreditStatusBadge({ status }: { status: CreditFileStatus | string }) {
  return (
    <Badge className={`border ${CREDIT_STATUS_STYLES[status] ?? "bg-slate-100 text-slate-700 border-slate-200"}`} variant="outline">
      {CREDIT_FILE_STATUS_LABELS[status as CreditFileStatus] ?? status}
    </Badge>
  );
}

export function CreditDocumentStatusBadge({ status }: { status: CreditDocumentStatus | string }) {
  return (
    <Badge className={`border ${CREDIT_DOCUMENT_STATUS_STYLES[status] ?? "bg-slate-100 text-slate-700 border-slate-200"}`} variant="outline">
      {CREDIT_DOCUMENT_STATUS_LABELS[status as CreditDocumentStatus] ?? status}
    </Badge>
  );
}

export function CreditChecklist({
  checklist,
  requiredDocumentTypes,
  optionalDocumentTypes,
  uploadedDocumentTypes,
}: {
  checklist: {
    isComplete: boolean;
    requiredDocuments: { total: number; uploaded: number; missing: string[] };
    optionalDocuments: { total: number; uploaded: number; missing: string[] };
    completionPercentage: number;
  };
  requiredDocumentTypes: string[];
  optionalDocumentTypes: string[];
  uploadedDocumentTypes: string[];
}) {
  const uploadedTypesSet = useMemo(() => new Set(uploadedDocumentTypes), [uploadedDocumentTypes]);
  const allDocumentTypes = useMemo(
    () => Array.from(new Set([...requiredDocumentTypes, ...optionalDocumentTypes])),
    [optionalDocumentTypes, requiredDocumentTypes]
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Checklist documentaire</CardTitle>
        <CardDescription>
          {checklist.isComplete
            ? "Le dossier est complet et peut etre soumis."
            : `Le dossier est complete a ${checklist.completionPercentage}%`}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">Documents requis</span>
            <span className="text-muted-foreground">
              {checklist.requiredDocuments.uploaded}/{checklist.requiredDocuments.total}
            </span>
          </div>
          <div className="h-2 rounded-full bg-muted">
            <div
              className="h-2 rounded-full bg-ci-orange transition-all"
              style={{ width: `${checklist.completionPercentage}%` }}
            />
          </div>
        </div>

        <div className="grid gap-2">
          {allDocumentTypes.map(documentType => {
            const label = CREDIT_DOCUMENT_TYPE_LABELS[documentType as CreditDocumentType] ?? documentType;
            const isRequired = requiredDocumentTypes.includes(documentType);
            const isUploaded = uploadedTypesSet.has(documentType);
            return (
              <div key={documentType} className="flex items-center justify-between rounded-lg border px-3 py-2">
                <div className="space-y-0.5">
                  <p className="text-sm font-medium">{label}</p>
                  <p className="text-xs text-muted-foreground">{isRequired ? "Requis ou attendu par le produit" : "Optionnel"}</p>
                </div>
                <div className={`flex items-center gap-2 text-sm ${isUploaded ? "text-green-700" : "text-muted-foreground"}`}>
                  {isUploaded ? <CheckCircle2 className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
                  <span>{isUploaded ? "Present" : "Manquant"}</span>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

type UploadMutation = {
  mutateAsync: (input: {
    creditFileId: number;
    documentType: CreditDocumentType;
    fileName: string;
    contentType: string;
    fileBase64: string;
  }) => Promise<unknown>;
  isPending: boolean;
};

export function CreditDocumentUploader({
  creditFileId,
  mutation,
  onUploaded,
  existingDocumentTypes = [],
}: {
  creditFileId: number;
  mutation: UploadMutation;
  onUploaded?: () => void | Promise<void>;
  existingDocumentTypes?: string[];
}) {
  const [documentType, setDocumentType] = useState<CreditDocumentType | "">("");
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const willReplaceExisting = Boolean(documentType && existingDocumentTypes.includes(documentType));

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (!documentType) {
      setError("Selectionnez le type de document a ajouter.");
      return;
    }

    if (!file) {
      setError("Selectionnez un fichier a importer.");
      return;
    }

    if (file.size > MAX_UPLOAD_BYTES) {
      setError("Le fichier depasse la taille maximale de 10 Mo.");
      return;
    }

    if (!["application/pdf", "image/jpeg", "image/png"].includes(file.type)) {
      setError("Format non autorise. Utilisez PDF, JPG, JPEG ou PNG.");
      return;
    }

    try {
      const fileBase64 = await fileToBase64(file);

      await mutation.mutateAsync({
        creditFileId,
        documentType,
        fileName: file.name,
        contentType: file.type,
        fileBase64,
      });

      setDocumentType("");
      setFile(null);
      await onUploaded?.();
    } catch (uploadError) {
      setError((uploadError as Error).message || "Une erreur est survenue pendant l'import.");
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <UploadCloud className="h-4 w-4 text-ci-orange" />
          Ajouter une piece
        </CardTitle>
        <CardDescription>
          Formats acceptes : PDF, JPG, JPEG, PNG. Taille maximale : 10 Mo.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form className="space-y-4" onSubmit={handleSubmit}>
          {error ? (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Upload impossible</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}

          <div className="grid gap-2">
            <label className="text-sm font-medium">Type de document</label>
            <Select value={documentType} onValueChange={value => setDocumentType(value as CreditDocumentType)}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Choisissez un type de document" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(CREDIT_DOCUMENT_TYPE_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {willReplaceExisting ? (
              <p className="text-xs text-amber-700">
                Un document existe deja pour ce type. Le nouvel import remplacera la version precedente.
              </p>
            ) : null}
          </div>

          <div className="grid gap-2">
            <label className="text-sm font-medium">Fichier</label>
            <Input
              type="file"
              accept={UPLOAD_ACCEPT}
              onChange={event => setFile(event.target.files?.[0] ?? null)}
            />
            {file ? (
              <p className="text-xs text-muted-foreground">
                {file.name} - {(file.size / 1024 / 1024).toFixed(2)} Mo
              </p>
            ) : null}
          </div>

          <Button className="w-full sm:w-auto" disabled={mutation.isPending} type="submit">
            <FileUp className="h-4 w-4" />
            {mutation.isPending ? "Import en cours..." : "Ajouter le document"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

async function fileToBase64(file: File) {
  const arrayBuffer = await file.arrayBuffer();
  let binary = "";
  const bytes = new Uint8Array(arrayBuffer);
  const chunkSize = 0x8000;

  for (let index = 0; index < bytes.length; index += chunkSize) {
    const chunk = bytes.subarray(index, index + chunkSize);
    binary += String.fromCharCode(...chunk);
  }

  return btoa(binary);
}

export function CreditSummaryCard({
  title,
  value,
  helper,
}: {
  title: string;
  value: string;
  helper?: string | null;
}) {
  return (
    <Card className="gap-3 py-4">
      <CardContent className="px-4">
        <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{title}</p>
        <p className="mt-2 text-lg font-semibold">{value}</p>
        {helper ? <p className="mt-1 text-xs text-muted-foreground">{helper}</p> : null}
      </CardContent>
    </Card>
  );
}

export function formatCreditProduct(productType: CreditProductType | string) {
  return CREDIT_PRODUCT_TYPE_LABELS[productType as CreditProductType] ?? productType;
}

export function formatCreditDocumentType(documentType: CreditDocumentType | string) {
  return CREDIT_DOCUMENT_TYPE_LABELS[documentType as CreditDocumentType] ?? documentType;
}
