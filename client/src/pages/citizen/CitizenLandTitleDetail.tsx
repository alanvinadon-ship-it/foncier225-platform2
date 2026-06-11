import { LandTitleTimeline, LandTitleStatusBadge } from "@/components/LandTitleTimeline";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  FileText,
  Loader2,
  MapPin,
  Upload,
  User,
  Calendar,
  AlertTriangle,
  Pencil,
} from "lucide-react";
import { Link, useParams } from "wouter";
import { toast } from "sonner";
import LandTitleDocumentUploader from "@/components/LandTitleDocumentUploader";
import LandTitleSubmissionRecap from "@/components/LandTitleSubmissionRecap";
import WorkflowGantt from "@/components/WorkflowGantt";
import { PROFILE_LABELS, type ApplicantProfile } from "@shared/afor-documents";

function deriveProfile(data: any): ApplicantProfile {
  // Use stored applicantProfile if available, otherwise derive from applicationType
  if (data.applicantProfile && ["individuel", "groupement", "personne_morale"].includes(data.applicantProfile)) {
    return data.applicantProfile as ApplicantProfile;
  }
  const appType = data.applicationType;
  if (appType === "groupement" || appType === "community") return "groupement";
  if (appType === "personne_morale" || appType === "company") return "personne_morale";
  return "individuel";
}

function ProfileSelector({ applicationId, currentProfile, onUpdated }: {
  applicationId: number;
  currentProfile: ApplicantProfile;
  onUpdated: () => void;
}) {
  const updateMutation = trpc.landTitle.citizen.update.useMutation({
    onSuccess: () => {
      toast.success("Profil mis à jour");
      onUpdated();
    },
    onError: (err) => toast.error(err.message),
  });

  return (
    <Select
      value={currentProfile}
      onValueChange={(value) => {
        updateMutation.mutate({ id: applicationId, applicantProfile: value as ApplicantProfile });
      }}
      disabled={updateMutation.isPending}
    >
      <SelectTrigger className="h-7 w-auto inline-flex text-xs font-medium gap-1">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="individuel">{PROFILE_LABELS.individuel}</SelectItem>
        <SelectItem value="groupement">{PROFILE_LABELS.groupement}</SelectItem>
        <SelectItem value="personne_morale">{PROFILE_LABELS.personne_morale}</SelectItem>
      </SelectContent>
    </Select>
  );
}

export default function CitizenLandTitleDetail() {
  const params = useParams<{ id: string }>();
  const appId = parseInt(params.id || "0", 10);
  const utils = trpc.useUtils();
  const { data, isLoading, error } = trpc.landTitle.citizen.getById.useQuery(
    { id: appId },
    { enabled: appId > 0 }
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-ci-green" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="space-y-4">
        <Link href="/citizen/land-title">
          <Button variant="ghost" size="sm" className="gap-2">
            <ArrowLeft className="h-4 w-4" /> Retour
          </Button>
        </Link>
        <Card className="border-destructive/50 bg-destructive/5">
          <CardContent className="p-6 text-center">
            <AlertTriangle className="h-8 w-8 text-destructive mx-auto mb-2" />
            <p className="text-destructive text-sm">
              {error?.message || "Dossier introuvable"}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/citizen/land-title">
          <Button variant="ghost" size="icon" className="shrink-0">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold tracking-tight truncate">
              {data.applicationNumber}
            </h1>
            <LandTitleStatusBadge status={data.status as any} />
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">
            {data.phase === "certificate" ? "Certificat Foncier" : "Titre Foncier"} — Créé le{" "}
            {new Date(data.createdAt).toLocaleDateString("fr-FR")}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Timeline */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="lg:col-span-2"
        >
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-base flex items-center gap-2">
                <Calendar className="h-4 w-4 text-ci-green" />
                Avancement de la procédure
              </CardTitle>
            </CardHeader>
            <CardContent>
              <LandTitleTimeline
                currentStatus={data.status as any}
                phase={data.phase as "certificate" | "title"}
                certificateSignedAt={data.certificateSignedAt}
                certificateExpiryAt={data.certificateExpiryAt}
                createdAt={data.createdAt}
              />
            </CardContent>
          </Card>

          {/* Workflow Gantt */}
          <Card className="mt-4">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Calendar className="h-4 w-4 text-ci-orange" />
                Délais estimés du workflow
              </CardTitle>
            </CardHeader>
            <CardContent>
              <WorkflowGantt currentStatus={data.status} />
            </CardContent>
          </Card>
        </motion.div>

        {/* Right: Info panel */}
        <div className="space-y-4">
          {/* Applicant info */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <User className="h-4 w-4 text-ci-orange" />
                  Demandeur
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                {/* Profil demandeur — modifiable en brouillon */}
                <div>
                  <span className="text-muted-foreground">Profil :</span>{" "}
                  {data.status === "cf_draft" ? (
                    <ProfileSelector
                      applicationId={appId}
                      currentProfile={deriveProfile(data)}
                      onUpdated={() => utils.landTitle.citizen.getById.invalidate({ id: appId })}
                    />
                  ) : (
                    <span className="font-medium">{PROFILE_LABELS[deriveProfile(data)]}</span>
                  )}
                </div>
                <div>
                  <span className="text-muted-foreground">Nom :</span>{" "}
                  <span className="font-medium">{data.applicantFullName}</span>
                </div>
                {data.applicantNationality && (
                  <div>
                    <span className="text-muted-foreground">Nationalité :</span>{" "}
                    <span className="font-medium">{data.applicantNationality}</span>
                  </div>
                )}
                {data.applicantIdType && (
                  <div>
                    <span className="text-muted-foreground">{data.applicantIdType} :</span>{" "}
                    <span className="font-medium">{data.applicantIdNumber}</span>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Land info */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
          >
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-ci-green" />
                  Terrain
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                {(data as any).parcel && (
                  <div className="rounded-md border border-ci-green/30 bg-ci-green/5 p-3 mb-3">
                    <div className="flex items-center gap-2 mb-1">
                      <MapPin className="h-3.5 w-3.5 text-ci-green" />
                      <span className="text-xs font-semibold uppercase tracking-wider text-ci-green">Parcelle liée</span>
                    </div>
                    <Link href={`/citizen/parcels/${(data as any).parcel.id}`}>
                      <span className="font-semibold text-ci-green hover:underline cursor-pointer">
                        {(data as any).parcel.reference}
                      </span>
                    </Link>
                    <div className="mt-1 text-xs text-muted-foreground">
                      {(data as any).parcel.localisation && <span>{(data as any).parcel.localisation}</span>}
                      {(data as any).parcel.surfaceApprox && <span> — {(data as any).parcel.surfaceApprox} ha</span>}
                    </div>
                  </div>
                )}
                {data.landLocality && (
                  <div>
                    <span className="text-muted-foreground">Localité :</span>{" "}
                    <span className="font-medium">{data.landLocality}</span>
                  </div>
                )}
                {data.landSubPrefecture && (
                  <div>
                    <span className="text-muted-foreground">Sous-préfecture :</span>{" "}
                    <span className="font-medium">{data.landSubPrefecture}</span>
                  </div>
                )}
                {data.landDepartment && (
                  <div>
                    <span className="text-muted-foreground">Département :</span>{" "}
                    <span className="font-medium">{data.landDepartment}</span>
                  </div>
                )}
                {data.landRegion && (
                  <div>
                    <span className="text-muted-foreground">Région :</span>{" "}
                    <span className="font-medium">{data.landRegion}</span>
                  </div>
                )}
                {data.landAreaHectares && (
                  <div>
                    <span className="text-muted-foreground">Superficie :</span>{" "}
                    <span className="font-medium">{data.landAreaHectares} ha</span>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Documents — Tunnel AFOR */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <LandTitleDocumentUploader
              applicationId={appId}
              applicantProfile={deriveProfile(data)}
              existingDocuments={(data.documents || []).map((doc: any) => ({
                id: doc.id,
                documentType: doc.documentType,
                documentCategory: doc.documentCategory || "complementaire",
                label: doc.label,
                fileUrl: doc.fileUrl,
                mimeType: doc.mimeType,
                verified: doc.verified,
              }))}
              editable={["cf_draft", "cf_submitted"].includes(data.status)}
              onDocumentUploaded={() => {
                utils.landTitle.citizen.getById.invalidate({ id: appId });
              }}
            />
          </motion.div>

          {/* Soumission — visible uniquement en brouillon */}
          {data.status === "cf_draft" && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
            >
              <LandTitleSubmissionRecap
                applicationId={appId}
                data={data}
                onSubmitted={() => utils.landTitle.citizen.getById.invalidate({ id: appId })}
              />
            </motion.div>
          )}

          {/* Oppositions */}
          {data.oppositions && data.oppositions.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
            >
              <Card className="border-red-200">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2 text-red-700">
                    <AlertTriangle className="h-4 w-4" />
                    Oppositions ({data.oppositions.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {data.oppositions.map((opp: any) => (
                      <div key={opp.id} className="text-xs border-l-2 border-red-300 pl-2">
                        <span className="font-medium">{opp.opponentName}</span>
                        <p className="text-muted-foreground mt-0.5 line-clamp-2">{opp.reason}</p>
                        <span className={`text-[10px] font-medium ${
                          opp.status === "dismissed" ? "text-green-600" :
                          opp.status === "confirmed" ? "text-red-600" : "text-amber-600"
                        }`}>
                          {opp.status === "pending" ? "En attente" :
                           opp.status === "confirmed" ? "Confirmée" : "Rejetée"}
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}
