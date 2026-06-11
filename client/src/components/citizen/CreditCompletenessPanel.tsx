import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CREDIT_DOCUMENT_TYPE_LABELS, type CreditDocumentType } from "@shared/credit-types";
import { motion } from "framer-motion";
import { CheckCircle2, CircleAlert, Lock, ShieldCheck } from "lucide-react";

function DocumentRow({
  documentType,
  isUploaded,
  tone,
  index,
}: {
  documentType: string;
  isUploaded: boolean;
  tone: "required" | "optional";
  index: number;
}) {
  const label = CREDIT_DOCUMENT_TYPE_LABELS[documentType as CreditDocumentType] ?? documentType;

  return (
    <motion.div
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05, duration: 0.25 }}
      className="flex items-center justify-between rounded-lg border px-3 py-2"
    >
      <div className="space-y-0.5">
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs text-muted-foreground">
          {tone === "required" ? "Document requis" : "Document optionnel"}
        </p>
      </div>
      <motion.div
        initial={{ scale: 0.8 }}
        animate={{ scale: 1 }}
        transition={{ delay: index * 0.05 + 0.1, type: "spring", stiffness: 300, damping: 20 }}
        className={`flex items-center gap-2 text-sm ${isUploaded ? "text-green-700" : "text-muted-foreground"}`}
      >
        {isUploaded ? <CheckCircle2 className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
        <span>{isUploaded ? "Présent" : "Manquant"}</span>
      </motion.div>
    </motion.div>
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
      ? "Dossier déjà soumis"
      : checklist.isComplete
        ? "Dossier prêt à être soumis"
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
        <CardTitle>Complétude du dossier</CardTitle>
        <CardDescription>
          Vérifiez les pièces obligatoires avant la soumission à la banque.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
          className={`rounded-xl border px-4 py-3 ${readinessTone}`}
        >
          <div className="flex items-center gap-2 text-sm font-semibold">
            {status === "SUBMITTED" ? <ShieldCheck className="h-4 w-4" /> : <CircleAlert className="h-4 w-4" />}
            <span>{readinessLabel}</span>
          </div>
          <p className="mt-2 text-sm">
            {status === "SUBMITTED"
              ? "Le dossier est en lecture seule en attendant l'examen bancaire."
              : checklist.isComplete
                ? "Tous les documents requis sont présents. Vous pouvez lancer la soumission."
                : `Il manque ${checklist.requiredDocuments.missing.length} document(s) requis avant de pouvoir soumettre.`}
          </p>
        </motion.div>

        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">Progression des documents requis</span>
            <span className="text-muted-foreground">
              {checklist.requiredDocuments.uploaded}/{checklist.requiredDocuments.total}
            </span>
          </div>
          <div className="h-2.5 rounded-full bg-muted overflow-hidden">
            <motion.div
              className="h-2.5 rounded-full bg-ci-orange"
              initial={{ width: 0 }}
              animate={{ width: `${checklist.completionPercentage}%` }}
              transition={{ duration: 0.6, ease: "easeOut" as const }}
            />
          </div>
        </div>

        <div className="rounded-xl border bg-muted/20 p-4">
          <p className="text-sm font-medium">Documents manquants</p>
          {checklist.requiredDocuments.missing.length === 0 ? (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mt-2 text-sm text-green-700"
            >
              Aucun document requis manquant.
            </motion.p>
          ) : (
            <div className="mt-2 flex flex-wrap gap-2">
              {checklist.requiredDocuments.missing.map((documentType, i) => (
                <motion.span
                  key={documentType}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.05 }}
                  className="rounded-full border border-amber-300 bg-amber-50 px-3 py-1 text-xs font-medium text-amber-800"
                >
                  {CREDIT_DOCUMENT_TYPE_LABELS[documentType as CreditDocumentType] ?? documentType}
                </motion.span>
              ))}
            </div>
          )}
        </div>

        <div className="grid gap-4 xl:grid-cols-2">
          <div className="space-y-2">
            <p className="text-sm font-medium">Documents requis</p>
            <div className="grid gap-2">
              {requiredDocumentTypes.map((documentType, index) => (
                <DocumentRow
                  key={documentType}
                  documentType={documentType}
                  isUploaded={uploadedTypesSet.has(documentType)}
                  tone="required"
                  index={index}
                />
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium">Documents optionnels</p>
            <div className="grid gap-2">
              {optionalDocumentTypes.map((documentType, index) => (
                <DocumentRow
                  key={documentType}
                  documentType={documentType}
                  isUploaded={uploadedTypesSet.has(documentType)}
                  tone="optional"
                  index={index + requiredDocumentTypes.length}
                />
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
