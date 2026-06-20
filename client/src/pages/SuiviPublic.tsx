import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, FileText, MapPin, Calendar, CheckCircle2, Clock, AlertCircle, Download, Building2, Landmark, ArrowLeft } from "lucide-react";
import { Link } from "wouter";
import WorkflowGantt from "@/components/WorkflowGantt";
import AcdWorkflowGantt from "@/components/AcdWorkflowGantt";
import { AcdStatusBadge } from "@/components/AcdStatusBadge";
import { type AcdStatus, type AcdStepType } from "@shared/acd-workflow";

// ─── Rural status labels ────────────────────────────────────────────────────
const RURAL_STATUS_LABELS: Record<string, string> = {
  cf_draft: "Brouillon",
  cf_submitted: "Soumis",
  cf_delimitation: "Délimitation en cours",
  cf_delimited: "Délimité",
  cf_inquiry: "Enquête publique",
  cf_publicity: "Publicité foncière",
  cf_opposed: "Opposition déposée",
  cf_validated: "Validé CSPGFR",
  cf_signed: "Certificat signé",
  cf_rejected: "Rejeté",
  tf_submitted: "Demande TF soumise",
  tf_afor_review: "Examen AFOR",
  tf_apfr_ready: "APFR prêt",
  tf_minister_signing: "Signature ministérielle",
  tf_signed: "Titre signé",
  tf_registered: "Enregistré au Livre Foncier",
  tf_rejected: "Rejeté",
};

const RURAL_STATUS_COLORS: Record<string, string> = {
  cf_draft: "bg-gray-100 text-gray-700",
  cf_submitted: "bg-blue-100 text-blue-700",
  cf_delimitation: "bg-amber-100 text-amber-700",
  cf_delimited: "bg-amber-100 text-amber-700",
  cf_inquiry: "bg-purple-100 text-purple-700",
  cf_publicity: "bg-purple-100 text-purple-700",
  cf_opposed: "bg-red-100 text-red-700",
  cf_validated: "bg-green-100 text-green-700",
  cf_signed: "bg-green-200 text-green-800",
  cf_rejected: "bg-red-200 text-red-800",
  tf_submitted: "bg-blue-100 text-blue-700",
  tf_afor_review: "bg-indigo-100 text-indigo-700",
  tf_apfr_ready: "bg-indigo-100 text-indigo-700",
  tf_minister_signing: "bg-violet-100 text-violet-700",
  tf_signed: "bg-green-200 text-green-800",
  tf_registered: "bg-emerald-200 text-emerald-800",
  tf_rejected: "bg-red-200 text-red-800",
};

const STEP_TYPE_LABELS: Record<string, string> = {
  deposit_request: "Dépôt de la demande",
  delimitation: "Délimitation",
  inquiry: "Enquête publique",
  publicity: "Publicité foncière",
  cspgfr_validation: "Validation CSPGFR",
  prefect_signature: "Signature du Préfet",
  immatriculation_request: "Demande d'immatriculation",
  afor_control: "Contrôle AFOR",
  apfr_preparation: "Préparation APFR",
  minister_signature: "Signature du Ministre",
  land_registry: "Inscription au Livre Foncier",
};

const STEP_STATUS_ICON: Record<string, React.ReactNode> = {
  completed: <CheckCircle2 className="h-4 w-4 text-green-600" />,
  in_progress: <Clock className="h-4 w-4 text-amber-600 animate-pulse" />,
  pending: <Clock className="h-4 w-4 text-gray-400" />,
  skipped: <AlertCircle className="h-4 w-4 text-gray-400" />,
};

// ─── Component ──────────────────────────────────────────────────────────────
export default function SuiviPublic() {
  const [reference, setReference] = useState("");
  const [searchRef, setSearchRef] = useState("");
  const [activeTab, setActiveTab] = useState<"all" | "rural" | "urban">("all");

  // Query rural (land title)
  const { data: ruralData, isLoading: ruralLoading } = trpc.landTitle.public.track.useQuery(
    { reference: searchRef },
    { enabled: searchRef.length >= 3 }
  );

  // Query urban (ACD)
  const { data: urbanData, isLoading: urbanLoading } = trpc.urbanAcd.public.track.useQuery(
    { reference: searchRef },
    { enabled: searchRef.length >= 3 }
  );

  const isLoading = ruralLoading || urbanLoading;
  const hasRuralResult = ruralData?.found;
  const hasUrbanResult = urbanData?.found;
  const hasAnyResult = hasRuralResult || hasUrbanResult;
  const noResult = searchRef.length >= 3 && !isLoading && !hasAnyResult;

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (reference.trim().length >= 3) {
      setSearchRef(reference.trim());
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-ci-green-light/20 to-white">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="container max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="h-4 w-4" />
            Retour à l'accueil
          </Link>
          <div className="flex items-center gap-2">
            <Landmark className="h-5 w-5 text-ci-green" />
            <span className="font-semibold text-sm">Foncier225</span>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="container max-w-4xl mx-auto px-4 py-8 space-y-6">
        {/* Title */}
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-ci-green/10 mb-4">
            <Search className="h-8 w-8 text-ci-green" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Suivi de dossier foncier</h1>
          <p className="text-muted-foreground mt-2 text-base max-w-lg mx-auto">
            Consultez l'avancement de votre dossier foncier rural ou urbain en saisissant votre numéro de référence.
          </p>
        </div>

        {/* Search form */}
        <Card className="shadow-sm">
          <CardContent className="pt-6">
            <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1">
                <Input
                  placeholder="Ex: CF-2025-A1B2C3, TF-2025-X9Y8Z7 ou ACD-2025-XXXXXX"
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                  className="h-12 text-base"
                />
              </div>
              <Button type="submit" disabled={reference.trim().length < 3 || isLoading} className="h-12 px-8 bg-ci-green hover:bg-ci-green/90 text-base">
                {isLoading ? (
                  <Clock className="h-4 w-4 animate-spin" />
                ) : (
                  <Search className="h-4 w-4" />
                )}
                <span className="ml-2">Rechercher</span>
              </Button>
            </form>
            <p className="text-xs text-muted-foreground mt-3">
              Formats acceptés : <strong>CF-AAAA-XXXXXX</strong> (certificat foncier rural), <strong>TF-AAAA-XXXXXX</strong> (titre foncier), <strong>ACD-AAAA-XXXXXX</strong> (arrêté de concession définitive urbain).
            </p>
          </CardContent>
        </Card>

        {/* No result */}
        {noResult && (
          <Card className="border-amber-200 bg-amber-50">
            <CardContent className="pt-6 flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-medium text-amber-800">Aucun dossier trouvé</p>
                <p className="text-sm text-amber-700 mt-1">
                  Aucun dossier ne correspond à la référence « {searchRef} ». Vérifiez l'orthographe et réessayez.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Results with tabs */}
        {hasAnyResult && (
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="all" className="gap-1.5">
                <FileText className="h-3.5 w-3.5" /> Tous
              </TabsTrigger>
              <TabsTrigger value="rural" disabled={!hasRuralResult} className="gap-1.5">
                <Landmark className="h-3.5 w-3.5" /> Rural
              </TabsTrigger>
              <TabsTrigger value="urban" disabled={!hasUrbanResult} className="gap-1.5">
                <Building2 className="h-3.5 w-3.5" /> Urbain
              </TabsTrigger>
            </TabsList>
            <TabsContent value="all" className="space-y-6 mt-4">
              {hasRuralResult && <RuralResult data={ruralData} />}
              {hasUrbanResult && <UrbanResult data={urbanData} />}
            </TabsContent>
            <TabsContent value="rural" className="space-y-6 mt-4">
              {hasRuralResult && <RuralResult data={ruralData} />}
            </TabsContent>
            <TabsContent value="urban" className="space-y-6 mt-4">
              {hasUrbanResult && <UrbanResult data={urbanData} />}
            </TabsContent>
          </Tabs>
        )}

        {/* Info notice */}
        {hasAnyResult && (
          <div className="text-xs text-muted-foreground text-center px-4">
            Les informations affichées sont mises à jour en temps réel par l'administration foncière.
          </div>
        )}

        {/* Help section when no search yet */}
        {!searchRef && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
            <Card className="text-center p-6">
              <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-emerald-100 mb-3">
                <Landmark className="h-5 w-5 text-emerald-600" />
              </div>
              <h3 className="font-semibold text-sm">Foncier Rural</h3>
              <p className="text-xs text-muted-foreground mt-1">
                Certificat foncier, titre foncier, délimitation, enquête publique
              </p>
            </Card>
            <Card className="text-center p-6">
              <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-blue-100 mb-3">
                <Building2 className="h-5 w-5 text-blue-600" />
              </div>
              <h3 className="font-semibold text-sm">Foncier Urbain</h3>
              <p className="text-xs text-muted-foreground mt-1">
                ACD (Arrêté de Concession Définitive), lotissements, permis de construire
              </p>
            </Card>
            <Card className="text-center p-6">
              <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-amber-100 mb-3">
                <FileText className="h-5 w-5 text-amber-600" />
              </div>
              <h3 className="font-semibold text-sm">Suivi en temps réel</h3>
              <p className="text-xs text-muted-foreground mt-1">
                Suivez chaque étape de votre dossier, de la soumission à la délivrance
              </p>
            </Card>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t mt-12 py-6 text-center text-xs text-muted-foreground">
        <p>Plateforme Foncière Nationale — Côte d'Ivoire</p>
        <p className="mt-1">Ce service est gratuit et accessible sans inscription.</p>
      </footer>
    </div>
  );
}

// ─── Rural Result Component ─────────────────────────────────────────────────
function RuralResult({ data }: { data: any }) {
  if (!data?.found) return null;
  const app = data.application;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Landmark className="h-4 w-4 text-emerald-600" />
              <span className="text-emerald-700 text-xs font-medium px-2 py-0.5 bg-emerald-50 rounded-full">Rural</span>
              Dossier {app.applicationNumber}
            </CardTitle>
            <Badge className={RURAL_STATUS_COLORS[app.status] || "bg-gray-100 text-gray-700"}>
              {RURAL_STATUS_LABELS[app.status] || app.status}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            {app.landLocality && (
              <div className="flex items-start gap-1.5">
                <MapPin className="h-3.5 w-3.5 text-muted-foreground mt-0.5" />
                <div>
                  <span className="text-muted-foreground">Localité</span>
                  <p className="font-medium">{[app.landLocality, app.landSubPrefecture, app.landDepartment, app.landRegion].filter(Boolean).join(", ")}</p>
                </div>
              </div>
            )}
            <div className="flex items-start gap-1.5">
              <Calendar className="h-3.5 w-3.5 text-muted-foreground mt-0.5" />
              <div>
                <span className="text-muted-foreground">Date de dépôt</span>
                <p className="font-medium">{new Date(app.createdAt).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}</p>
              </div>
            </div>
            <div className="flex items-start gap-1.5">
              <Clock className="h-3.5 w-3.5 text-muted-foreground mt-0.5" />
              <div>
                <span className="text-muted-foreground">Dernière mise à jour</span>
                <p className="font-medium">{new Date(app.updatedAt).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Steps timeline */}
      {data.steps.length > 0 && (
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-sm">Étapes du dossier</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data.steps.map((step: any, idx: number) => (
                <div key={idx} className="flex items-start gap-3">
                  <div className="mt-0.5">
                    {STEP_STATUS_ICON[step.status] || <Clock className="h-4 w-4 text-gray-400" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className={`text-sm font-medium ${step.status === "completed" ? "text-green-700" : step.status === "in_progress" ? "text-amber-700" : "text-muted-foreground"}`}>
                        {STEP_TYPE_LABELS[step.stepType] || step.stepType}
                      </p>
                      {step.completedAt && (
                        <span className="text-xs text-muted-foreground shrink-0">
                          {new Date(step.completedAt).toLocaleDateString("fr-FR")}
                        </span>
                      )}
                    </div>
                    {step.notes && <p className="text-xs text-muted-foreground mt-0.5">{step.notes}</p>}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Workflow Gantt */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Position dans le workflow</CardTitle>
        </CardHeader>
        <CardContent>
          <WorkflowGantt
            currentStatus={app.status}
          />
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Urban Result Component ─────────────────────────────────────────────────
function UrbanResult({ data }: { data: any }) {
  if (!data?.found) return null;
  const app = data.application;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Building2 className="h-4 w-4 text-blue-600" />
              <span className="text-blue-700 text-xs font-medium px-2 py-0.5 bg-blue-50 rounded-full">Urbain</span>
              Dossier {app.applicationNumber}
            </CardTitle>
            <AcdStatusBadge status={app.status as AcdStatus} />
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            {app.commune && (
              <div className="flex items-start gap-1.5">
                <MapPin className="h-3.5 w-3.5 text-muted-foreground mt-0.5" />
                <div>
                  <span className="text-muted-foreground">Commune</span>
                  <p className="font-medium">{app.commune}</p>
                </div>
              </div>
            )}
            {app.lotNumber && (
              <div>
                <span className="text-muted-foreground">Lot</span>
                <p className="font-medium">N° {app.lotNumber}</p>
              </div>
            )}
            {app.lotissementName && (
              <div>
                <span className="text-muted-foreground">Lotissement</span>
                <p className="font-medium">{app.lotissementName}</p>
              </div>
            )}
            {app.surfaceM2 && (
              <div>
                <span className="text-muted-foreground">Surface</span>
                <p className="font-medium">{app.surfaceM2} m²</p>
              </div>
            )}
            <div className="flex items-start gap-1.5">
              <Calendar className="h-3.5 w-3.5 text-muted-foreground mt-0.5" />
              <div>
                <span className="text-muted-foreground">Date de dépôt</span>
                <p className="font-medium">{new Date(app.createdAt).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}</p>
              </div>
            </div>
            <div className="flex items-start gap-1.5">
              <Clock className="h-3.5 w-3.5 text-muted-foreground mt-0.5" />
              <div>
                <span className="text-muted-foreground">Dernière mise à jour</span>
                <p className="font-medium">{new Date(app.updatedAt).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Steps */}
      {data.steps && data.steps.length > 0 && (
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-sm">Étapes du dossier ACD</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data.steps.map((step: any, idx: number) => (
                <div key={idx} className="flex items-start gap-3">
                  <div className="mt-0.5">
                    {STEP_STATUS_ICON[step.status] || <Clock className="h-4 w-4 text-gray-400" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className={`text-sm font-medium ${step.status === "completed" ? "text-blue-700" : step.status === "in_progress" ? "text-amber-700" : "text-muted-foreground"}`}>
                        {step.stepType}
                      </p>
                      {step.completedAt && (
                        <span className="text-xs text-muted-foreground shrink-0">
                          {new Date(step.completedAt).toLocaleDateString("fr-FR")}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ACD Gantt */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Position dans le workflow ACD</CardTitle>
        </CardHeader>
        <CardContent>
          <AcdWorkflowGantt
            currentStatus={app.status as AcdStatus}
            steps={(data.steps || []).map((s: any) => ({
              stepType: s.stepType as AcdStepType,
              status: s.status as "completed" | "in_progress" | "pending",
              startedAt: s.startedAt,
              completedAt: s.completedAt,
            }))}
          />
        </CardContent>
      </Card>
    </div>
  );
}
