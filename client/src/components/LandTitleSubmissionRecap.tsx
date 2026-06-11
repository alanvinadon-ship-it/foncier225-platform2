import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { trpc } from "@/lib/trpc";
import { motion, AnimatePresence } from "framer-motion";
import {
  CheckCircle2,
  XCircle,
  FileText,
  User,
  MapPin,
  Send,
  Loader2,
  AlertTriangle,
  Shield,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import {
  getRequiredDocumentsForProfile,
  PROFILE_LABELS,
  CATEGORY_LABELS,
  type ApplicantProfile,
  type DocumentCategory,
} from "@shared/afor-documents";

interface SubmissionRecapProps {
  applicationId: number;
  data: any;
  onSubmitted: () => void;
}

export default function LandTitleSubmissionRecap({ applicationId, data, onSubmitted }: SubmissionRecapProps) {
  const [open, setOpen] = useState(false);
  const submitMutation = trpc.landTitle.citizen.submit.useMutation({
    onSuccess: () => {
      toast.success("Dossier soumis avec succès !");
      setOpen(false);
      onSubmitted();
    },
    onError: (err) => toast.error(err.message),
  });

  const profile: ApplicantProfile = data.applicantProfile || "individuel";
  const requiredDocs = getRequiredDocumentsForProfile(profile).filter(d => d.required);
  const uploadedDocTypes = (data.documents || []).map((d: any) => d.documentType);
  const missingDocs = requiredDocs.filter(d => !uploadedDocTypes.includes(d.documentType));
  const uploadedDocs = (data.documents || []) as any[];
  const isComplete = missingDocs.length === 0;

  // Group uploaded docs by category
  const docsByCategory: Record<string, any[]> = {};
  for (const doc of uploadedDocs) {
    const cat = doc.documentCategory || "complementaire";
    if (!docsByCategory[cat]) docsByCategory[cat] = [];
    docsByCategory[cat].push(doc);
  }

  // Check required fields
  const requiredFields = [
    { label: "Nom complet", value: data.applicantFullName, filled: !!data.applicantFullName },
    { label: "Profil demandeur", value: PROFILE_LABELS[profile], filled: true },
    { label: "Localité", value: data.landLocality, filled: !!data.landLocality },
    { label: "Sous-préfecture", value: data.landSubPrefecture, filled: !!data.landSubPrefecture },
    { label: "Département", value: data.landDepartment, filled: !!data.landDepartment },
    { label: "Région", value: data.landRegion, filled: !!data.landRegion },
  ];
  const optionalFields = [
    { label: "Nationalité", value: data.applicantNationality, filled: !!data.applicantNationality },
    { label: "Type pièce d'identité", value: data.applicantIdType, filled: !!data.applicantIdType },
    { label: "N° pièce d'identité", value: data.applicantIdNumber, filled: !!data.applicantIdNumber },
    { label: "Superficie (ha)", value: data.landAreaHectares, filled: !!data.landAreaHectares },
    { label: "Description terrain", value: data.landDescription?.substring(0, 60), filled: !!data.landDescription },
  ];
  const allRequiredFieldsFilled = requiredFields.every(f => f.filled);
  const canSubmit = isComplete && allRequiredFieldsFilled;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          className="w-full gap-2"
          variant={canSubmit ? "default" : "outline"}
          disabled={data.status !== "cf_draft"}
        >
          <Send className="h-4 w-4" />
          Soumettre le dossier
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-ci-green" />
            Récapitulatif avant soumission
          </DialogTitle>
          <DialogDescription>
            Vérifiez que toutes les informations et documents sont corrects avant de soumettre votre dossier.
            Une fois soumis, le dossier ne pourra plus être modifié.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Status global */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <Card className={canSubmit ? "border-green-200 bg-green-50/50" : "border-amber-200 bg-amber-50/50"}>
              <CardContent className="p-4 flex items-center gap-3">
                {canSubmit ? (
                  <CheckCircle2 className="h-6 w-6 text-green-600 shrink-0" />
                ) : (
                  <AlertTriangle className="h-6 w-6 text-amber-600 shrink-0" />
                )}
                <div>
                  <p className="font-semibold text-sm">
                    {canSubmit ? "Dossier complet — prêt pour soumission" : "Dossier incomplet"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {canSubmit
                      ? `${uploadedDocs.length} document(s) téléversé(s), tous les champs obligatoires remplis`
                      : `${missingDocs.length} document(s) manquant(s) ou champs obligatoires non remplis`}
                  </p>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Section 1: Informations du demandeur */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <User className="h-4 w-4 text-ci-orange" />
                  Informations du demandeur
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-2">
                  {requiredFields.map((f) => (
                    <div key={f.label} className="flex items-start gap-1.5 text-xs">
                      {f.filled ? (
                        <CheckCircle2 className="h-3.5 w-3.5 text-green-500 mt-0.5 shrink-0" />
                      ) : (
                        <XCircle className="h-3.5 w-3.5 text-red-500 mt-0.5 shrink-0" />
                      )}
                      <div>
                        <span className="text-muted-foreground">{f.label} :</span>{" "}
                        <span className="font-medium">{f.value || "—"}</span>
                      </div>
                    </div>
                  ))}
                  {optionalFields.filter(f => f.filled).map((f) => (
                    <div key={f.label} className="flex items-start gap-1.5 text-xs">
                      <CheckCircle2 className="h-3.5 w-3.5 text-green-500 mt-0.5 shrink-0" />
                      <div>
                        <span className="text-muted-foreground">{f.label} :</span>{" "}
                        <span className="font-medium">{f.value || "—"}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Section 2: Terrain */}
          {(data as any).parcel && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-ci-green" />
                    Parcelle liée
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-xs space-y-1">
                  <div>
                    <span className="text-muted-foreground">Référence :</span>{" "}
                    <span className="font-semibold">{(data as any).parcel.reference}</span>
                  </div>
                  {(data as any).parcel.localisation && (
                    <div>
                      <span className="text-muted-foreground">Localisation :</span>{" "}
                      <span className="font-medium">{(data as any).parcel.localisation}</span>
                    </div>
                  )}
                  {(data as any).parcel.surfaceApprox && (
                    <div>
                      <span className="text-muted-foreground">Superficie :</span>{" "}
                      <span className="font-medium">{(data as any).parcel.surfaceApprox} ha</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Section 3: Documents téléversés */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <FileText className="h-4 w-4 text-blue-600" />
                  Documents téléversés ({uploadedDocs.length}/{requiredDocs.length} requis)
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {Object.entries(docsByCategory).map(([cat, docs]) => (
                  <div key={cat}>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                      {CATEGORY_LABELS[cat as DocumentCategory] || cat}
                    </p>
                    <div className="space-y-1">
                      {docs.map((doc: any) => (
                        <div key={doc.id} className="flex items-center gap-2 text-xs">
                          <CheckCircle2 className="h-3.5 w-3.5 text-green-500 shrink-0" />
                          <span className="font-medium">{doc.label || doc.documentType}</span>
                          {doc.verified && (
                            <span className="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full">
                              Vérifié
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}

                {/* Missing docs */}
                {missingDocs.length > 0 && (
                  <div className="border-t pt-2">
                    <p className="text-xs font-semibold text-red-600 mb-1">Documents manquants :</p>
                    <div className="space-y-1">
                      {missingDocs.map((doc) => (
                        <div key={doc.documentType} className="flex items-center gap-2 text-xs">
                          <XCircle className="h-3.5 w-3.5 text-red-500 shrink-0" />
                          <span className="text-red-700">{doc.label}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Annuler
          </Button>
          <Button
            onClick={() => submitMutation.mutate({ id: applicationId })}
            disabled={!canSubmit || submitMutation.isPending}
            className="gap-2"
          >
            {submitMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            Confirmer la soumission
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
