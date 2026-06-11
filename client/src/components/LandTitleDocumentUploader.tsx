import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { motion, AnimatePresence } from "framer-motion";
import {
  Check,
  ChevronDown,
  ChevronRight,
  FileText,
  Loader2,
  Trash2,
  Upload,
  AlertCircle,
  Info,
} from "lucide-react";
import { useCallback, useRef, useState } from "react";
import { toast } from "sonner";
import {
  AFOR_DOCUMENT_SPECS,
  CATEGORY_LABELS,
  CATEGORY_DESCRIPTIONS,
  getDocumentsByCategory,
  type ApplicantProfile,
  type DocumentCategory,
  type AforDocumentSpec,
} from "@shared/afor-documents";

interface Props {
  applicationId: number;
  applicantProfile: ApplicantProfile;
  /** Already uploaded documents from the server */
  existingDocuments: Array<{
    id: number;
    documentType: string;
    documentCategory: string | null;
    label: string;
    fileUrl: string;
    mimeType: string | null;
    verified: boolean;
  }>;
  /** Whether the application is still editable (draft/submitted) */
  editable: boolean;
  onDocumentUploaded?: () => void;
}

const CATEGORY_ORDER: DocumentCategory[] = [
  "formulaire_officiel",
  "identite",
  "technique",
  "propriete_historique",
  "mandat",
  "complementaire",
];

const CATEGORY_ICONS: Record<DocumentCategory, string> = {
  formulaire_officiel: "📋",
  identite: "🪪",
  technique: "📐",
  propriete_historique: "📜",
  mandat: "🤝",
  complementaire: "📎",
};

export default function LandTitleDocumentUploader({
  applicationId,
  applicantProfile,
  existingDocuments,
  editable,
  onDocumentUploaded,
}: Props) {
  const [expandedCategory, setExpandedCategory] = useState<DocumentCategory | null>("formulaire_officiel");
  const [uploadingDoc, setUploadingDoc] = useState<string | null>(null);

  const uploadMutation = trpc.landTitle.citizen.uploadDocumentFile.useMutation({
    onSuccess: () => {
      toast.success("Document téléversé avec succès");
      onDocumentUploaded?.();
      setUploadingDoc(null);
    },
    onError: (err) => {
      toast.error(err.message || "Erreur lors du téléversement");
      setUploadingDoc(null);
    },
  });

  const deleteMutation = trpc.landTitle.citizen.deleteDocument.useMutation({
    onSuccess: () => {
      toast.success("Document supprimé");
      onDocumentUploaded?.();
    },
    onError: (err) => {
      toast.error(err.message || "Erreur lors de la suppression");
    },
  });

  const documentsByCategory = getDocumentsByCategory(applicantProfile);

  // Check if a document type has been uploaded
  function isDocumentUploaded(docType: string): boolean {
    return existingDocuments.some(d => d.documentType === docType);
  }

  function getUploadedDocument(docType: string) {
    return existingDocuments.find(d => d.documentType === docType);
  }

  // Calculate completeness
  function getCategoryCompleteness(category: DocumentCategory) {
    const specs = documentsByCategory[category];
    if (!specs || specs.length === 0) return { total: 0, uploaded: 0, required: 0, requiredUploaded: 0 };
    const requiredSpecs = specs.filter(s => s.required);
    const uploaded = specs.filter(s => isDocumentUploaded(s.documentType)).length;
    const requiredUploaded = requiredSpecs.filter(s => isDocumentUploaded(s.documentType)).length;
    return { total: specs.length, uploaded, required: requiredSpecs.length, requiredUploaded };
  }

  function getOverallCompleteness() {
    let totalRequired = 0;
    let uploadedRequired = 0;
    for (const category of CATEGORY_ORDER) {
      const { required, requiredUploaded } = getCategoryCompleteness(category);
      totalRequired += required;
      uploadedRequired += requiredUploaded;
    }
    return { totalRequired, uploadedRequired, percentage: totalRequired > 0 ? Math.round((uploadedRequired / totalRequired) * 100) : 100 };
  }

  const overall = getOverallCompleteness();

  return (
    <div className="space-y-4">
      {/* Overall progress */}
      <Card className="border-ci-green/30">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-ci-green" />
              <span className="text-sm font-semibold">Liasse Foncière AFOR</span>
            </div>
            <span className="text-xs text-muted-foreground">
              {overall.uploadedRequired}/{overall.totalRequired} documents obligatoires
            </span>
          </div>
          <div className="w-full bg-muted rounded-full h-2.5 overflow-hidden">
            <motion.div
              className="h-full rounded-full bg-ci-green"
              initial={{ width: 0 }}
              animate={{ width: `${overall.percentage}%` }}
              transition={{ duration: 0.5, ease: "easeOut" }}
            />
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Coût réglementaire de la liasse : <span className="font-semibold">10 000 FCFA</span> — 
            Profil : <span className="font-semibold capitalize">{applicantProfile.replace("_", " ")}</span>
          </p>
        </CardContent>
      </Card>

      {/* Categories accordion */}
      {CATEGORY_ORDER.map(category => {
        const specs = documentsByCategory[category];
        if (!specs || specs.length === 0) return null;
        const completeness = getCategoryCompleteness(category);
        const isExpanded = expandedCategory === category;
        const allUploaded = completeness.requiredUploaded === completeness.required && completeness.required > 0;

        return (
          <Card key={category} className={allUploaded ? "border-ci-green/40" : ""}>
            <CardHeader
              className="pb-2 cursor-pointer select-none"
              onClick={() => setExpandedCategory(isExpanded ? null : category)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{CATEGORY_ICONS[category]}</span>
                  <CardTitle className="text-sm">{CATEGORY_LABELS[category]}</CardTitle>
                  {allUploaded && <Check className="h-4 w-4 text-ci-green" />}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">
                    {completeness.uploaded}/{completeness.total}
                  </span>
                  {isExpanded ? (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  )}
                </div>
              </div>
            </CardHeader>

            <AnimatePresence>
              {isExpanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <CardContent className="pt-0 space-y-3">
                    <p className="text-xs text-muted-foreground italic">
                      {CATEGORY_DESCRIPTIONS[category]}
                    </p>

                    {specs.map(spec => (
                      <DocumentRow
                        key={spec.documentType}
                        spec={spec}
                        uploaded={getUploadedDocument(spec.documentType)}
                        isUploading={uploadingDoc === spec.documentType}
                        editable={editable}
                        onUpload={(file) => handleUpload(file, spec)}
                        onDelete={(docId) => deleteMutation.mutate({ documentId: docId })}
                      />
                    ))}
                  </CardContent>
                </motion.div>
              )}
            </AnimatePresence>
          </Card>
        );
      })}
    </div>
  );

  function handleUpload(file: File, spec: AforDocumentSpec) {
    setUploadingDoc(spec.documentType);
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = (reader.result as string).split(",")[1];
      uploadMutation.mutate({
        applicationId,
        documentType: spec.documentType,
        documentCategory: spec.category,
        label: spec.label,
        fileName: file.name,
        fileBase64: base64,
        contentType: file.type,
      });
    };
    reader.onerror = () => {
      toast.error("Erreur de lecture du fichier");
      setUploadingDoc(null);
    };
    reader.readAsDataURL(file);
  }
}

// ─── Document Row ───────────────────────────────────────────────────────

interface DocumentRowProps {
  spec: AforDocumentSpec;
  uploaded?: {
    id: number;
    documentType: string;
    label: string;
    fileUrl: string;
    mimeType: string | null;
    verified: boolean;
  };
  isUploading: boolean;
  editable: boolean;
  onUpload: (file: File) => void;
  onDelete: (docId: number) => void;
}

function DocumentRow({ spec, uploaded, isUploading, editable, onUpload, onDelete }: DocumentRowProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    // Validate size (10 MB)
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Le fichier dépasse 10 Mo");
      return;
    }
    onUpload(file);
    // Reset input
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, [onUpload]);

  return (
    <div className={`rounded-lg border p-3 ${uploaded ? "border-ci-green/30 bg-ci-green/5" : "border-border"}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">{spec.label}</span>
            {spec.required && (
              <span className="text-[10px] font-bold uppercase tracking-wider text-destructive bg-destructive/10 px-1.5 py-0.5 rounded">
                Obligatoire
              </span>
            )}
            {uploaded?.verified && (
              <span className="text-[10px] font-bold uppercase tracking-wider text-ci-green bg-ci-green/10 px-1.5 py-0.5 rounded">
                Vérifié
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{spec.description}</p>
        </div>

        <div className="shrink-0 flex items-center gap-1">
          {uploaded ? (
            <>
              <a
                href={uploaded.fileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-ci-green hover:underline flex items-center gap-1"
              >
                <FileText className="h-3.5 w-3.5" />
                Voir
              </a>
              {editable && !uploaded.verified && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-destructive hover:text-destructive"
                  onClick={() => onDelete(uploaded.id)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              )}
            </>
          ) : editable ? (
            <>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                className="hidden"
                onChange={handleFileSelect}
              />
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs gap-1"
                disabled={isUploading}
                onClick={() => fileInputRef.current?.click()}
              >
                {isUploading ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Upload className="h-3.5 w-3.5" />
                )}
                Téléverser
              </Button>
            </>
          ) : (
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <AlertCircle className="h-3.5 w-3.5" />
              Manquant
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
