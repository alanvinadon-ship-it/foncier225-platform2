/**
 * AcdDocumentChecklist — Indicateur visuel des documents manquants par étape
 * Affiche une checklist compacte avec progression et alerte si documents manquants
 */
import {
  ACD_DOCUMENT_LABELS,
  ACD_REQUIRED_DOCUMENTS,
  ACD_STEP_LABELS,
  type AcdDocumentType,
  type AcdStepType,
} from "@shared/acd-workflow";
import { AlertCircle, CheckCircle2, Circle, FileText } from "lucide-react";

interface AcdDocumentChecklistProps {
  currentStepType: AcdStepType;
  uploadedDocumentTypes: string[];
  onScrollToUpload?: () => void;
}

export default function AcdDocumentChecklist({
  currentStepType,
  uploadedDocumentTypes,
  onScrollToUpload,
}: AcdDocumentChecklistProps) {
  const requiredDocs = ACD_REQUIRED_DOCUMENTS[currentStepType] || [];
  const uploadedSet = new Set(uploadedDocumentTypes);
  const completedCount = requiredDocs.filter(d => uploadedSet.has(d)).length;
  const totalRequired = requiredDocs.length;
  const allComplete = completedCount === totalRequired;
  const hasMissing = totalRequired > 0 && completedCount < totalRequired;

  if (totalRequired === 0) {
    return (
      <div className="p-3 rounded-lg bg-muted/50 border text-center">
        <p className="text-xs text-muted-foreground">Aucun document requis pour cette étape</p>
      </div>
    );
  }

  return (
    <div className={`p-4 rounded-lg border ${hasMissing ? "border-amber-200 bg-amber-50/50" : "border-emerald-200 bg-emerald-50/50"}`}>
      {/* Header with progress */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <FileText className={`h-4 w-4 ${hasMissing ? "text-amber-600" : "text-emerald-600"}`} />
          <span className="text-xs font-semibold">
            Documents — {ACD_STEP_LABELS[currentStepType]}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          {hasMissing && <AlertCircle className="h-3.5 w-3.5 text-amber-500" />}
          <span className={`text-xs font-bold ${hasMissing ? "text-amber-700" : "text-emerald-700"}`}>
            {completedCount}/{totalRequired}
          </span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 bg-muted rounded-full overflow-hidden mb-3">
        <div
          className={`h-full rounded-full transition-all duration-500 ${allComplete ? "bg-emerald-500" : "bg-amber-500"}`}
          style={{ width: `${(completedCount / totalRequired) * 100}%` }}
        />
      </div>

      {/* Document list */}
      <div className="space-y-1.5">
        {requiredDocs.map((docType) => {
          const isUploaded = uploadedSet.has(docType);
          return (
            <div key={docType} className="flex items-center gap-2">
              {isUploaded ? (
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
              ) : (
                <Circle className="h-3.5 w-3.5 text-muted-foreground/50 shrink-0" />
              )}
              <span className={`text-[11px] ${isUploaded ? "text-emerald-700 line-through" : "text-foreground"}`}>
                {ACD_DOCUMENT_LABELS[docType]}
              </span>
            </div>
          );
        })}
      </div>

      {/* Link to upload */}
      {hasMissing && onScrollToUpload && (
        <button
          onClick={onScrollToUpload}
          className="mt-3 w-full text-center text-[11px] text-amber-700 font-medium hover:underline cursor-pointer"
        >
          ↓ Déposer les documents manquants
        </button>
      )}
    </div>
  );
}
