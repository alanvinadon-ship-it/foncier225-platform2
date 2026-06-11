/**
 * AcdDocumentUploader — Upload de documents par étape du workflow ACD
 * Affiche une checklist des documents requis pour l'étape en cours,
 * permet l'upload et montre les documents déjà soumis.
 */
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import {
  ACD_DOCUMENT_LABELS,
  ACD_REQUIRED_DOCUMENTS,
  ACD_STEP_LABELS,
  type AcdDocumentType,
  type AcdStepType,
} from "@shared/acd-workflow";
import { CheckCircle2, FileText, Loader2, Upload, ExternalLink } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";

interface ExistingDocument {
  id: number;
  documentType: string;
  documentCategory: string;
  label: string;
  fileUrl: string;
  mimeType: string | null;
  createdAt: number;
}

interface AcdDocumentUploaderProps {
  applicationId: number;
  currentStepType: AcdStepType;
  documents: ExistingDocument[];
  editable?: boolean;
  onDocumentUploaded?: () => void;
}

const CATEGORY_MAP: Record<AcdDocumentType, string> = {
  piece_identite: "identite",
  extrait_rccm: "identite",
  lettre_demande: "propriete_lot",
  plan_lotissement: "propriete_lot",
  attestation_lot: "propriete_lot",
  plan_geometre: "technique",
  rapport_technique: "technique",
  pv_commission: "urbanisme",
  arrete_acp: "urbanisme",
  permis_construire: "urbanisme",
  photos_mise_en_valeur: "mise_en_valeur",
  rapport_constat: "mise_en_valeur",
  demande_transformation_acd: "complementaire",
  rapport_conformite: "technique",
  arrete_acd: "urbanisme",
  publication_jo: "complementaire",
  quittance_frais: "complementaire",
};

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ACCEPTED_TYPES = ["application/pdf", "image/jpeg", "image/png", "image/webp"];

export default function AcdDocumentUploader({
  applicationId,
  currentStepType,
  documents,
  editable = true,
  onDocumentUploaded,
}: AcdDocumentUploaderProps) {
  const requiredDocs = ACD_REQUIRED_DOCUMENTS[currentStepType] || [];
  const uploadedTypes = new Set(documents.map((d) => d.documentType));

  const completedCount = requiredDocs.filter((d) => uploadedTypes.has(d)).length;
  const totalRequired = requiredDocs.length;
  const isComplete = completedCount >= totalRequired;

  if (totalRequired === 0) {
    return (
      <Card>
        <CardContent className="p-4 text-center text-sm text-muted-foreground">
          Aucun document requis pour cette étape.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <FileText className="h-4 w-4 text-blue-600" />
            Documents — {ACD_STEP_LABELS[currentStepType]}
          </CardTitle>
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
            isComplete ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
          }`}>
            {completedCount}/{totalRequired}
          </span>
        </div>
        {/* Progress */}
        <div className="h-1.5 bg-muted rounded-full overflow-hidden mt-2">
          <div
            className={`h-full rounded-full transition-all ${isComplete ? "bg-emerald-500" : "bg-amber-500"}`}
            style={{ width: `${(completedCount / totalRequired) * 100}%` }}
          />
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {requiredDocs.map((docType) => {
          const existing = documents.find((d) => d.documentType === docType);
          return (
            <DocumentRow
              key={docType}
              applicationId={applicationId}
              docType={docType}
              existing={existing}
              editable={editable}
              onUploaded={onDocumentUploaded}
            />
          );
        })}
      </CardContent>
    </Card>
  );
}

// ─── Document Row ───────────────────────────────────────────────────────────

function DocumentRow({
  applicationId,
  docType,
  existing,
  editable,
  onUploaded,
}: {
  applicationId: number;
  docType: AcdDocumentType;
  existing?: ExistingDocument;
  editable: boolean;
  onUploaded?: () => void;
}) {
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const uploadMutation = trpc.urbanAcd.citizen.uploadDocument.useMutation({
    onSuccess: () => {
      toast.success(`${ACD_DOCUMENT_LABELS[docType]} uploadé`);
      onUploaded?.();
    },
    onError: (err) => {
      toast.error(err.message || "Erreur lors de l'upload");
    },
    onSettled: () => setUploading(false),
  });

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_FILE_SIZE) {
      toast.error("Le fichier dépasse 10 Mo");
      return;
    }
    if (!ACCEPTED_TYPES.includes(file.type)) {
      toast.error("Format non supporté. Utilisez PDF, JPEG ou PNG.");
      return;
    }

    setUploading(true);

    // Convert to base64 and upload via S3 (through a simple data URL for now)
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      // For now, use the base64 as fileUrl (in production, upload to S3 first)
      uploadMutation.mutate({
        applicationId,
        documentType: docType,
        documentCategory: (CATEGORY_MAP[docType] || "complementaire") as any,
        label: ACD_DOCUMENT_LABELS[docType],
        fileUrl: base64,
        fileKey: `acd/${applicationId}/${docType}-${Date.now()}`,
        mimeType: file.type,
        fileSizeBytes: file.size,
      });
    };
    reader.readAsDataURL(file);

    // Reset input
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors">
      {/* Status icon */}
      {existing ? (
        <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
      ) : (
        <div className="h-4 w-4 rounded-full border-2 border-muted-foreground/30 shrink-0" />
      )}

      {/* Label */}
      <div className="flex-1 min-w-0">
        <p className={`text-xs font-medium truncate ${existing ? "text-foreground" : "text-muted-foreground"}`}>
          {ACD_DOCUMENT_LABELS[docType]}
        </p>
        {existing && (
          <p className="text-[10px] text-muted-foreground">
            Uploadé le {new Date(existing.createdAt).toLocaleDateString("fr-FR")}
          </p>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 shrink-0">
        {existing && existing.fileUrl && !existing.fileUrl.startsWith("data:") && (
          <a href={existing.fileUrl} target="_blank" rel="noopener noreferrer">
            <Button variant="ghost" size="icon" className="h-7 w-7">
              <ExternalLink className="h-3.5 w-3.5" />
            </Button>
          </a>
        )}
        {editable && !existing && (
          <>
            <input
              ref={inputRef}
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,.webp"
              className="hidden"
              onChange={handleFileChange}
            />
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-[10px] gap-1"
              onClick={() => inputRef.current?.click()}
              disabled={uploading}
            >
              {uploading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Upload className="h-3 w-3" />}
              Upload
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
