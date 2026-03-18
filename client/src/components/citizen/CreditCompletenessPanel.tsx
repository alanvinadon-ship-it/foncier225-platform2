import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CREDIT_DOCUMENT_TYPE_LABELS, type CreditDocumentType } from "@shared/credit-types";
import { CheckCircle2, CircleAlert, Lock, ShieldCheck } from "lucide-react";

function DocumentRow({
  documentType,
  isUploaded,
  tone,
}: {
  documentType: string;
  isUploaded: boolean;
  tone: "required" | "optional";
}) {
  const label = CREDIT_DOCUMENT_TYPE_LABELS[documentType as CreditDocumentType] ?? documentType;

  return (
    <div className="flex items-center justify-between rounded-lg border px-3 py-2">
      <div className="space-y-0.5">
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs text-muted-foreground">
          {tone === "required" ? "Document requis" : "Document optionnel"}
        </p>
      </div>
      <div className={`flex items-center gap-2 text-sm ${isUploaded ? "text-green-700" : "text-muted-foreground"}`}>
        {isUploaded ? <CheckCircle2 className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
        <span>{isUploaded ? "Present" : "Manquant"}</span>
      </div>
    </div>
  );
}

export function CreditCompletenessPanel({
  checklist,
  status,
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
  status: string;
  requiredDocumentTypes: string[];
  optionalDocumentTypes: string[];
  uploadedDocumentTypes: string[];
}) {
  const uploadedTypesSet = new Set(uploadedDocumentTypes);
  const readinessLabel =
    status === "SUBMITTED"
      ? "Dossier deja soumis"
      : checklist.isComplete
        ? "Dossier pret a etre soumis"
        : "Dossier incomplet";

  const readinessTone =
    status === "SUBMITTED"
      ? "text-blue-700 bg-blue-50 border-blue-200"
      : checklist.isComplete
        ? "text-green-700 bg-green-50 border-green-200"
        : "text-amber-700 bg-amber-50 border-amber-200";

  return (
    <Card>
      <CardHeader>
        <CardTitle>Completude du dossier</CardTitle>
        <CardDescription>
          Verifiez les pieces obligatoires avant la soumission a la banque.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className={`rounded-xl border px-4 py-3 ${readinessTone}`}>
          <div className="flex items-center gap-2 text-sm font-semibold">
            {status === "SUBMITTED" ? <ShieldCheck className="h-4 w-4" /> : <CircleAlert className="h-4 w-4" />}
            <span>{readinessLabel}</span>
          </div>
          <p className="mt-2 text-sm">
            {status === "SUBMITTED"
              ? "Le dossier est en lecture seule en attendant l'examen bancaire."
              : checklist.isComplete
                ? "Tous les documents requis sont presents. Vous pouvez lancer la soumission."
                : `Il manque ${checklist.requiredDocuments.missing.length} document(s) requis avant de pouvoir soumettre.`}
          </p>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">Progression des documents requis</span>
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

        <div className="rounded-xl border bg-muted/20 p-4">
          <p className="text-sm font-medium">Documents manquants</p>
          {checklist.requiredDocuments.missing.length === 0 ? (
            <p className="mt-2 text-sm text-green-700">Aucun document requis manquant.</p>
          ) : (
            <div className="mt-2 flex flex-wrap gap-2">
              {checklist.requiredDocuments.missing.map(documentType => (
                <span key={documentType} className="rounded-full border border-amber-300 bg-amber-50 px-3 py-1 text-xs font-medium text-amber-800">
                  {CREDIT_DOCUMENT_TYPE_LABELS[documentType as CreditDocumentType] ?? documentType}
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="grid gap-4 xl:grid-cols-2">
          <div className="space-y-2">
            <p className="text-sm font-medium">Documents requis</p>
            <div className="grid gap-2">
              {requiredDocumentTypes.map(documentType => (
                <DocumentRow
                  key={documentType}
                  documentType={documentType}
                  isUploaded={uploadedTypesSet.has(documentType)}
                  tone="required"
                />
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium">Documents optionnels</p>
            <div className="grid gap-2">
              {optionalDocumentTypes.map(documentType => (
                <DocumentRow
                  key={documentType}
                  documentType={documentType}
                  isUploaded={uploadedTypesSet.has(documentType)}
                  tone="optional"
                />
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
