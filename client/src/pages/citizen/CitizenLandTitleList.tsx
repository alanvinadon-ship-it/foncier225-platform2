import { LandTitleStatusBadge } from "@/components/LandTitleTimeline";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { motion } from "framer-motion";
import { FileText, MapPin, Plus, ChevronRight, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { Link } from "wouter";
import { getRequiredDocumentsForProfile, type ApplicantProfile } from "@shared/afor-documents";
import { useMemo } from "react";

function DocumentCompletenessIndicator({ app }: { app: any }) {
  const completeness = useMemo(() => {
    if (app.status !== "cf_draft") return null; // Only show for drafts
    const profile = (app.applicantProfile || "individuel") as ApplicantProfile;
    const requiredDocs = getRequiredDocumentsForProfile(profile).filter(d => d.required);
    const uploadedTypes = new Set((app.documents || []).map((d: any) => d.documentType));
    const uploaded = requiredDocs.filter(d => uploadedTypes.has(d.documentType)).length;
    return { uploaded, total: requiredDocs.length, complete: uploaded >= requiredDocs.length };
  }, [app]);

  if (!completeness) return null;

  return completeness.complete ? (
    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-ci-green bg-ci-green/10 rounded-full px-2 py-0.5">
      <CheckCircle2 className="h-3 w-3" />
      Complet
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-600 bg-amber-50 rounded-full px-2 py-0.5">
      <AlertCircle className="h-3 w-3" />
      {completeness.uploaded}/{completeness.total} docs
    </span>
  );
}

export default function CitizenLandTitleList() {
  const { data, isLoading, error } = trpc.landTitle.citizen.listMine.useQuery({});

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Titre Foncier</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Suivez l'avancement de vos demandes de Certificat Foncier et Titre Foncier
          </p>
        </div>
        <Link href="/citizen/land-title/new">
          <Button className="bg-ci-green hover:bg-ci-green/90 gap-2">
            <Plus className="h-4 w-4" />
            Nouvelle demande
          </Button>
        </Link>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-ci-green" />
        </div>
      )}

      {/* Error */}
      {error && (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardContent className="p-6 text-center">
            <p className="text-destructive text-sm">Erreur de chargement : {error.message}</p>
          </CardContent>
        </Card>
      )}

      {/* Empty state */}
      {data && data.items.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="p-12 text-center">
            <FileText className="h-12 w-12 text-muted-foreground/40 mx-auto mb-4" />
            <h3 className="text-lg font-semibold">Aucun dossier</h3>
            <p className="text-sm text-muted-foreground mt-2 max-w-md mx-auto">
              Vous n'avez pas encore de demande de titre foncier. Créez votre première demande pour commencer la procédure.
            </p>
            <Link href="/citizen/land-title/new">
              <Button className="mt-6 bg-ci-orange hover:bg-ci-orange/90 gap-2">
                <Plus className="h-4 w-4" />
                Créer ma première demande
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}

      {/* List */}
      {data && data.items.length > 0 && (
        <div className="space-y-3">
          {data.items.map((app: any, idx: number) => (
            <motion.div
              key={app.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
            >
              <Link href={`/citizen/land-title/${app.id}`}>
                <Card className="hover:border-ci-green/40 hover:shadow-sm transition-all cursor-pointer group">
                  <CardContent className="p-4 flex items-center gap-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-ci-green/10 shrink-0">
                      <FileText className="h-5 w-5 text-ci-green" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold truncate">{app.applicationNumber}</span>
                        <LandTitleStatusBadge status={app.status} />
                        <DocumentCompletenessIndicator app={app} />
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5 truncate">
                        {app.applicantFullName} — {app.landLocality || app.landSubPrefecture || "Localité non renseignée"}
                        {app.parcel && (
                          <span className="ml-2 inline-flex items-center gap-1 text-ci-green">
                            <MapPin className="h-3 w-3" />
                            {app.parcel.reference}
                          </span>
                        )}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-xs text-muted-foreground hidden sm:block">
                        {app.phase === "certificate" ? "Phase CF" : "Phase TF"}
                      </span>
                      <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-ci-green transition-colors" />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
