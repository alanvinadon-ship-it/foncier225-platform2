import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, FileText, MapPin, Calendar, CheckCircle2, Clock, AlertCircle, Building2, Landmark, ArrowLeft, Lock, Eye, EyeOff, Info } from "lucide-react";
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
  const [activeTab, setActiveTab] = useState<"rural" | "urban">("urban");

  // Rural state
  const [ruralRef, setRuralRef] = useState("");
  const [ruralSearchRef, setRuralSearchRef] = useState("");

  // Urban state
  const [urbanRef, setUrbanRef] = useState("");
  const [urbanPassword, setUrbanPassword] = useState("");
  const [urbanSearchRef, setUrbanSearchRef] = useState("");
  const [urbanSearchPwd, setUrbanSearchPwd] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Query rural (land title)
  const { data: ruralData, isLoading: ruralLoading } = trpc.landTitle.public.track.useQuery(
    { reference: ruralSearchRef },
    { enabled: ruralSearchRef.length >= 3 }
  );

  // Query urban (ACD) with password
  const { data: urbanData, isLoading: urbanLoading } = trpc.urbanAcd.public.track.useQuery(
    { reference: urbanSearchRef, password: urbanSearchPwd },
    { enabled: urbanSearchRef.length >= 3 && urbanSearchPwd.length >= 1 }
  );

  function handleRuralSearch(e: React.FormEvent) {
    e.preventDefault();
    if (ruralRef.trim().length >= 3) {
      setRuralSearchRef(ruralRef.trim());
    }
  }

  function handleUrbanSearch(e: React.FormEvent) {
    e.preventDefault();
    if (urbanRef.trim().length >= 3) {
      setUrbanSearchRef(urbanRef.trim());
      setUrbanSearchPwd(urbanPassword);
    }
  }

  const hasRuralResult = ruralData?.found;
  const hasUrbanResult = urbanData?.found;
  const urbanError = urbanData && !urbanData.found ? (urbanData as any).error : null;
  const ruralNoResult = ruralSearchRef.length >= 3 && !ruralLoading && !hasRuralResult;
  const urbanNoResult = urbanSearchRef.length >= 3 && urbanSearchPwd.length >= 1 && !urbanLoading && !hasUrbanResult && !urbanError;

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
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
          <h1 className="text-3xl font-bold tracking-tight">Suivre une demande</h1>
          <p className="text-muted-foreground mt-2 text-base max-w-lg mx-auto">
            Consultez l'avancement de votre dossier foncier rural ou urbain.
          </p>
        </div>

        {/* Tabs for Rural / Urban */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "rural" | "urban")}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="urban" className="gap-1.5">
              <Building2 className="h-4 w-4" /> Foncier Urbain
            </TabsTrigger>
            <TabsTrigger value="rural" className="gap-1.5">
              <Landmark className="h-4 w-4" /> Foncier Rural
            </TabsTrigger>
          </TabsList>

          {/* ─── URBAN TAB ─── */}
          <TabsContent value="urban" className="space-y-6 mt-4">
            <Card className="shadow-sm border-blue-100">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-blue-600" />
                  Suivi d'une demande urbaine (ACD)
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Pour consulter l'évolution de votre dossier, merci d'indiquer :
                </p>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Form */}
                  <form onSubmit={handleUrbanSearch} className="space-y-4">
                    <div>
                      <label className="text-sm font-medium text-gray-700 mb-1 block">N° du dossier</label>
                      <Input
                        placeholder="Ex: ACD-2025-A1B2C3"
                        value={urbanRef}
                        onChange={(e) => setUrbanRef(e.target.value)}
                        className="h-11"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700 mb-1 block">Mot de passe</label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          type={showPassword ? "text" : "password"}
                          placeholder="Mot de passe du dossier"
                          value={urbanPassword}
                          onChange={(e) => setUrbanPassword(e.target.value)}
                          className="h-11 pl-9 pr-10"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        >
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>
                    <Button
                      type="submit"
                      disabled={urbanRef.trim().length < 3 || urbanLoading}
                      className="w-full h-11 bg-blue-600 hover:bg-blue-700 text-white font-semibold uppercase tracking-wide"
                    >
                      {urbanLoading ? (
                        <Clock className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <Search className="h-4 w-4 mr-2" />
                      )}
                      Suivre ce dossier
                    </Button>
                  </form>

                  {/* Info box */}
                  <div className="border-2 border-amber-300 rounded-lg p-4 bg-amber-50/50">
                    <div className="flex items-start gap-2">
                      <Info className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
                      <div>
                        <p className="font-semibold text-sm text-amber-800 uppercase">
                          Où trouver les informations demandées ?
                        </p>
                        <p className="text-sm text-amber-700 mt-2">
                          Le numéro de dossier et le mot de passe de ce dossier se trouvent sur l'<strong>« Ordre de Recettes des droits domaniaux »</strong>, remis après avoir déposé le dossier au Guichet Unique du Foncier.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Urban error messages */}
            {urbanError === "interconnexion_indisponible" && (
              <Card className="border-blue-200 bg-blue-50">
                <CardContent className="pt-6 flex items-start gap-3">
                  <Info className="h-5 w-5 text-blue-600 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-blue-800">Service d'interconnexion en cours de mise en place</p>
                    <p className="text-sm text-blue-700 mt-1">
                      L'interconnexion avec le système SIGFU de l'État de Côte d'Ivoire est en cours de configuration. 
                      Ce service sera bientôt disponible pour vous permettre de suivre votre dossier foncier urbain directement depuis Foncier225.
                    </p>
                    <p className="text-xs text-blue-600 mt-2">
                      En attendant, vous pouvez consulter votre dossier sur le portail officiel du SIGFU.
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            {urbanNoResult && !urbanError && (
              <Card className="border-amber-200 bg-amber-50">
                <CardContent className="pt-6 flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-amber-800">Aucun dossier trouvé</p>
                    <p className="text-sm text-amber-700 mt-1">
                      Aucun dossier ne correspond à la référence « {urbanSearchRef} ». Vérifiez les informations figurant sur votre Ordre de Recettes et réessayez.
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Urban result */}
            {hasUrbanResult && <UrbanResult data={urbanData} />}
          </TabsContent>

          {/* ─── RURAL TAB ─── */}
          <TabsContent value="rural" className="space-y-6 mt-4">
            <Card className="shadow-sm border-emerald-100">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Landmark className="h-5 w-5 text-emerald-600" />
                  Suivi d'une demande rurale (CF / TF)
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Saisissez votre numéro de référence pour consulter l'avancement de votre dossier.
                </p>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleRuralSearch} className="flex flex-col sm:flex-row gap-3">
                  <div className="flex-1">
                    <Input
                      placeholder="Ex: CF-2025-A1B2C3 ou TF-2025-X9Y8Z7"
                      value={ruralRef}
                      onChange={(e) => setRuralRef(e.target.value)}
                      className="h-11"
                    />
                  </div>
                  <Button
                    type="submit"
                    disabled={ruralRef.trim().length < 3 || ruralLoading}
                    className="h-11 px-8 bg-ci-green hover:bg-ci-green/90"
                  >
                    {ruralLoading ? (
                      <Clock className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <Search className="h-4 w-4 mr-2" />
                    )}
                    Rechercher
                  </Button>
                </form>
                <p className="text-xs text-muted-foreground mt-3">
                  Formats : <strong>CF-AAAA-XXXXXX</strong> (certificat foncier) ou <strong>TF-AAAA-XXXXXX</strong> (titre foncier).
                </p>
              </CardContent>
            </Card>

            {/* Rural no result */}
            {ruralNoResult && (
              <Card className="border-amber-200 bg-amber-50">
                <CardContent className="pt-6 flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-amber-800">Aucun dossier trouvé</p>
                    <p className="text-sm text-amber-700 mt-1">
                      Aucun dossier rural ne correspond à la référence « {ruralSearchRef} ». Vérifiez l'orthographe et réessayez.
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Rural result */}
            {hasRuralResult && <RuralResult data={ruralData} />}
          </TabsContent>
        </Tabs>

        {/* Footer info */}
        {(hasRuralResult || hasUrbanResult) && (
          <div className="text-xs text-muted-foreground text-center px-4">
            Les informations affichées sont mises à jour en temps réel par l'administration foncière.
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
          <WorkflowGantt currentStatus={app.status} />
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
