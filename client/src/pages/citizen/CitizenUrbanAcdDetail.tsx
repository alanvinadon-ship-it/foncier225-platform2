import AcdDocumentUploader from "@/components/AcdDocumentUploader";
import { AcdStatusBadge } from "@/components/AcdStatusBadge";
import AcdWorkflowGantt from "@/components/AcdWorkflowGantt";
import AcdTimeline from "@/components/AcdTimeline";
import AcdDocumentChecklist from "@/components/AcdDocumentChecklist";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { ACD_PHASES, ACD_STEP_LABELS, ACD_REQUIRED_DOCUMENTS, ACD_DOCUMENT_LABELS, type AcdPhase, type AcdStatus, type AcdStepType, type AcdDocumentType, getAcdPhaseForStatus } from "@shared/acd-workflow";
import { ArrowLeft, Building2, Calendar, Clock, FileCheck, Loader2, MapPin, User } from "lucide-react";
import { Link, useParams } from "wouter";
import { toast } from "sonner";

export default function CitizenUrbanAcdDetail() {
  const params = useParams<{ id: string }>();
  const applicationId = parseInt(params.id || "0");

  const { data, isLoading, error, refetch } = trpc.urbanAcd.citizen.getDetail.useQuery(
    { applicationId },
    { enabled: applicationId > 0 }
  ) as any;

  const cancelMutation = trpc.urbanAcd.citizen.cancel.useMutation({
    onSuccess: () => {
      toast.success("Dossier annulé");
      refetch();
    },
    onError: (err: any) => toast.error(err.message),
  }) as any;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-ci-green" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="space-y-4">
        <Link href="/citizen/urban-acd">
          <Button variant="ghost" size="sm" className="gap-2">
            <ArrowLeft className="h-4 w-4" /> Retour
          </Button>
        </Link>
        <Card className="border-destructive/50 bg-destructive/5">
          <CardContent className="p-6 text-center">
            <p className="text-destructive text-sm">{error?.message || "Dossier introuvable"}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const app = data.application;
  const steps = data.steps || [];
  const documents = data.documents || [];
  const currentPhase = getAcdPhaseForStatus(app.status as AcdStatus);
  const isDraft = app.status === "acd_draft";
  const isCancellable = ["acd_draft", "acd_submitted"].includes(app.status);

  // Determine current step type for document upload
  const currentStepType = getCurrentStepType(app.status as AcdStatus);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/citizen/urban-acd">
          <Button variant="ghost" size="icon" className="shrink-0">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-xl font-bold tracking-tight">{app.applicationNumber}</h1>
            <AcdStatusBadge status={app.status as AcdStatus} />
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">
            Arrêté de Concession Définitive — {currentPhase ? ACD_PHASES[currentPhase].label : ""}
          </p>
        </div>
        {isCancellable && (
          <Button
            variant="destructive"
            size="sm"
            onClick={() => {
              if (confirm("Êtes-vous sûr de vouloir annuler ce dossier ?")) {
                cancelMutation.mutate({ applicationId });
              }
            }}
            disabled={cancelMutation.isPending}
          >
            Annuler le dossier
          </Button>
        )}
      </div>

      {/* Gantt Workflow */}
      <Card>
        <CardContent className="p-4">
          <AcdWorkflowGantt
            currentStatus={app.status as AcdStatus}
            steps={steps.map((s: any) => ({
              stepType: s.stepType as AcdStepType,
              status: s.status as "completed" | "in_progress" | "pending",
              startedAt: s.startedAt,
              completedAt: s.completedAt,
            }))}
          />
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Info dossier */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Building2 className="h-4 w-4 text-blue-600" />
              Informations du dossier
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <InfoRow icon={<User className="h-3.5 w-3.5" />} label="Demandeur" value={app.applicantFullName} />
            <InfoRow icon={<MapPin className="h-3.5 w-3.5" />} label="Commune" value={app.commune || "—"} />
            {app.lotNumber && <InfoRow label="Lot" value={`N° ${app.lotNumber}`} />}
            {app.ilotNumber && <InfoRow label="Îlot" value={`N° ${app.ilotNumber}`} />}
            {app.lotissementName && <InfoRow label="Lotissement" value={app.lotissementName} />}
            {app.quartier && <InfoRow label="Quartier" value={app.quartier} />}
            {app.surfaceM2 && <InfoRow label="Surface" value={`${app.surfaceM2} m²`} />}
            {app.usagePrevu && <InfoRow label="Usage prévu" value={capitalizeFirst(app.usagePrevu)} />}
            <InfoRow
              icon={<Calendar className="h-3.5 w-3.5" />}
              label="Créé le"
              value={new Date(app.createdAt).toLocaleDateString("fr-FR")}
            />
          </CardContent>
        </Card>

        {/* Documents Upload */}
        <AcdDocumentUploader
          applicationId={applicationId}
          currentStepType={currentStepType}
          documents={documents.map((d: any) => ({
            id: d.id,
            documentType: d.documentType,
            documentCategory: d.documentCategory,
            label: d.label,
            fileUrl: d.fileUrl,
            mimeType: d.mimeType,
            createdAt: d.createdAt,
          }))}
          editable={isDraft || app.status === "acd_submitted"}
          onDocumentUploaded={() => refetch()}
        />
      </div>

      {/* Timeline interactive — progression réelle vs théorique */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Clock className="h-4 w-4 text-blue-600" />
            Timeline — Progression réelle vs théorique
          </CardTitle>
        </CardHeader>
        <CardContent>
          <AcdTimeline
            currentStatus={app.status as AcdStatus}
            steps={steps.map((s: any) => ({
              stepType: s.stepType,
              status: s.status as "completed" | "in_progress" | "pending",
              startedAt: s.startedAt,
              completedAt: s.completedAt,
            }))}
          />
        </CardContent>
      </Card>

      {/* Checklist documents par étape */}
      <Card id="document-checklist">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <FileCheck className="h-4 w-4 text-amber-600" />
            Checklist documents — Étape en cours
          </CardTitle>
        </CardHeader>
        <CardContent>
          <AcdDocumentChecklist
            currentStepType={currentStepType}
            uploadedDocumentTypes={documents.map((d: any) => d.documentType)}
            onScrollToUpload={() => {
              document.querySelector('[data-upload-section]')?.scrollIntoView({ behavior: 'smooth' });
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function InfoRow({ icon, label, value }: { icon?: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2">
      {icon && <span className="text-muted-foreground">{icon}</span>}
      <span className="text-muted-foreground text-xs w-24 shrink-0">{label}</span>
      <span className="text-xs font-medium">{value}</span>
    </div>
  );
}

function capitalizeFirst(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function getCurrentStepType(status: AcdStatus): AcdStepType {
  const map: Partial<Record<AcdStatus, AcdStepType>> = {
    acd_draft: "depot_demande",
    acd_submitted: "depot_demande",
    acd_lot_check: "verification_lot",
    acd_technical_instruction: "instruction_technique",
    acd_commission: "commission_attribution",
    acd_acp_signed: "signature_acp",
    acd_development_notified: "notification_obligations",
    acd_development_ongoing: "mise_en_valeur",
    acd_development_verified: "constat_mise_en_valeur",
    acd_transformation_requested: "demande_transformation",
    acd_conformity_check: "verification_conformite",
    acd_acd_signed: "signature_acd",
    acd_journal_officiel: "publication_jo",
    acd_delivered: "delivrance_titre",
  };
  return map[status] || "depot_demande";
}
