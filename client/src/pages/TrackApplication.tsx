import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Search, FileText, MapPin, Calendar, CheckCircle2, Clock, AlertCircle, ArrowLeft, Download } from "lucide-react";
import { Link } from "wouter";
import { jsPDF } from "jspdf";
import WorkflowGantt from "@/components/WorkflowGantt";

const STATUS_LABELS: Record<string, string> = {
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

const STATUS_COLORS: Record<string, string> = {
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

const APPLICATION_TYPE_LABELS: Record<string, string> = {
  immatriculation: "Immatriculation",
  mutation: "Mutation",
  morcellement: "Morcellement",
};

function exportToPdf(data: { found: true; application: any; steps: any[] }) {
  const doc = new jsPDF();
  const app = data.application;
  const margin = 20;
  let y = margin;

  // Header
  doc.setFontSize(18);
  doc.setTextColor(34, 120, 60);
  doc.text("Foncier225 \u2014 R\u00e9capitulatif de suivi", margin, y);
  y += 10;
  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.text(`G\u00e9n\u00e9r\u00e9 le ${new Date().toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })}`, margin, y);
  y += 4;
  doc.setDrawColor(34, 120, 60);
  doc.setLineWidth(0.5);
  doc.line(margin, y, 190, y);
  y += 12;

  // Application info
  doc.setFontSize(13);
  doc.setTextColor(0, 0, 0);
  doc.text(`Dossier : ${app.applicationNumber}`, margin, y);
  y += 8;

  doc.setFontSize(10);
  doc.setTextColor(60, 60, 60);
  const statusLabel = STATUS_LABELS[app.status] || app.status;
  doc.text(`Statut : ${statusLabel}`, margin, y);
  y += 6;

  if (app.applicationType) {
    const typeLabel = APPLICATION_TYPE_LABELS[app.applicationType] || app.applicationType;
    doc.text(`Type de demande : ${typeLabel}`, margin, y);
    y += 6;
  }

  const locality = [app.landLocality, app.landSubPrefecture, app.landDepartment, app.landRegion].filter(Boolean).join(", ");
  if (locality) {
    doc.text(`Localisation : ${locality}`, margin, y);
    y += 6;
  }

  doc.text(`Date de d\u00e9p\u00f4t : ${new Date(app.createdAt).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}`, margin, y);
  y += 6;
  doc.text(`Derni\u00e8re mise \u00e0 jour : ${new Date(app.updatedAt).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}`, margin, y);
  y += 14;

  // Steps
  if (data.steps.length > 0) {
    doc.setFontSize(12);
    doc.setTextColor(0, 0, 0);
    doc.text("\u00c9tapes du dossier", margin, y);
    y += 8;

    doc.setFontSize(9);
    for (const step of data.steps) {
      if (y > 270) {
        doc.addPage();
        y = margin;
      }
      const stepLabel = STEP_TYPE_LABELS[step.stepType] || step.stepType;
      const statusIcon = step.status === "completed" ? "\u2713" : step.status === "in_progress" ? "\u25cb" : "\u2022";
      const dateStr = step.completedAt ? ` (${new Date(step.completedAt).toLocaleDateString("fr-FR")})` : "";

      doc.setTextColor(step.status === "completed" ? 34 : step.status === "in_progress" ? 180 : 150,
        step.status === "completed" ? 120 : step.status === "in_progress" ? 130 : 150,
        step.status === "completed" ? 60 : step.status === "in_progress" ? 0 : 150);
      doc.text(`${statusIcon}  ${stepLabel}${dateStr}`, margin + 4, y);
      y += 5;
      if (step.notes) {
        doc.setTextColor(130, 130, 130);
        doc.text(`     ${step.notes}`, margin + 4, y);
        y += 5;
      }
    }
    y += 6;
  }

  // Footer
  doc.setFontSize(8);
  doc.setTextColor(150, 150, 150);
  doc.text("Ce document est g\u00e9n\u00e9r\u00e9 automatiquement par la plateforme Foncier225.", margin, 285);
  doc.text("Il ne constitue pas un acte administratif officiel.", margin, 289);

  doc.save(`suivi-${app.applicationNumber}.pdf`);
}

export default function TrackApplication() {
  const [reference, setReference] = useState("");
  const [searchRef, setSearchRef] = useState("");

  const { data, isLoading, error } = trpc.landTitle.public.track.useQuery(
    { reference: searchRef },
    { enabled: searchRef.length >= 3 }
  );

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (reference.trim().length >= 3) {
      setSearchRef(reference.trim());
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-white">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="container flex items-center justify-between h-14 px-4">
          <Link href="/">
            <span className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground cursor-pointer">
              <ArrowLeft className="h-4 w-4" />
              Retour à l'accueil
            </span>
          </Link>
          <span className="text-sm font-semibold text-ci-green">Foncier225</span>
        </div>
      </header>

      <main className="container max-w-2xl mx-auto px-4 py-12">
        {/* Title */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-ci-green/10 mb-4">
            <Search className="h-8 w-8 text-ci-green" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Suivi de dossier</h1>
          <p className="text-muted-foreground mt-2">
            Entrez votre numéro de référence pour consulter l'état d'avancement de votre dossier foncier.
          </p>
        </div>

        {/* Search form */}
        <Card className="mb-8">
          <CardContent className="pt-6">
            <form onSubmit={handleSearch} className="flex gap-3">
              <div className="flex-1">
                <Input
                  placeholder="Ex: CF-2025-A1B2C3 ou TF-2025-X9Y8Z7"
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                  className="h-11"
                />
              </div>
              <Button type="submit" disabled={reference.trim().length < 3 || isLoading} className="h-11 px-6 bg-ci-green hover:bg-ci-green/90">
                {isLoading ? (
                  <Clock className="h-4 w-4 animate-spin" />
                ) : (
                  <Search className="h-4 w-4" />
                )}
                <span className="ml-2">Rechercher</span>
              </Button>
            </form>
            <p className="text-xs text-muted-foreground mt-2">
              Le numéro de référence vous a été communiqué lors du dépôt de votre demande (format CF-AAAA-XXXXXX ou TF-AAAA-XXXXXX).
            </p>
          </CardContent>
        </Card>

        {/* Error */}
        {error && (
          <Card className="border-red-200 bg-red-50 mb-6">
            <CardContent className="pt-6">
              <p className="text-sm text-red-700">Une erreur est survenue lors de la recherche. Veuillez réessayer.</p>
            </CardContent>
          </Card>
        )}

        {/* Not found */}
        {data && !data.found && (
          <Card className="border-amber-200 bg-amber-50 mb-6">
            <CardContent className="pt-6 flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-medium text-amber-800">Aucun dossier trouvé</p>
                <p className="text-sm text-amber-700 mt-1">
                  Aucun dossier ne correspond au numéro de référence « {searchRef} ». Vérifiez l'orthographe et réessayez.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Result */}
        {data && data.found && (
          <div className="space-y-6">
            {/* Application info */}
            <Card>
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <FileText className="h-5 w-5 text-ci-green" />
                    Dossier {data.application.applicationNumber}
                  </CardTitle>
                  <Badge className={STATUS_COLORS[data.application.status] || "bg-gray-100 text-gray-700"}>
                    {STATUS_LABELS[data.application.status] || data.application.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                  {data.application.applicationType && (
                    <div>
                      <span className="text-muted-foreground">Type de demande</span>
                      <p className="font-medium">{APPLICATION_TYPE_LABELS[data.application.applicationType] || data.application.applicationType}</p>
                    </div>
                  )}
                  {data.application.landLocality && (
                    <div className="flex items-start gap-1.5">
                      <MapPin className="h-3.5 w-3.5 text-muted-foreground mt-0.5" />
                      <div>
                        <span className="text-muted-foreground">Localisation</span>
                        <p className="font-medium">
                          {[data.application.landLocality, data.application.landSubPrefecture, data.application.landDepartment, data.application.landRegion]
                            .filter(Boolean)
                            .join(", ")}
                        </p>
                      </div>
                    </div>
                  )}
                  <div className="flex items-start gap-1.5">
                    <Calendar className="h-3.5 w-3.5 text-muted-foreground mt-0.5" />
                    <div>
                      <span className="text-muted-foreground">Date de dépôt</span>
                      <p className="font-medium">{new Date(data.application.createdAt).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-1.5">
                    <Clock className="h-3.5 w-3.5 text-muted-foreground mt-0.5" />
                    <div>
                      <span className="text-muted-foreground">Dernière mise à jour</span>
                      <p className="font-medium">{new Date(data.application.updatedAt).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Steps timeline */}
            {data.steps.length > 0 && (
              <Card>
                <CardHeader className="pb-4">
                  <CardTitle className="text-base">Étapes du dossier</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {data.steps.map((step, idx) => (
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
                          {step.notes && (
                            <p className="text-xs text-muted-foreground mt-0.5">{step.notes}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* No steps yet */}
            {data.steps.length === 0 && (
              <Card className="border-dashed">
                <CardContent className="pt-6 text-center">
                  <Clock className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">
                    Aucune étape enregistrée pour le moment. Le traitement de votre dossier débutera prochainement.
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Workflow Gantt */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Position dans le workflow</CardTitle>
              </CardHeader>
              <CardContent>
                <WorkflowGantt currentStatus={data.application.status} />
              </CardContent>
            </Card>

            {/* Export PDF button */}
            <div className="flex justify-center">
              <Button
                variant="outline"
                className="gap-2"
                onClick={() => exportToPdf(data)}
              >
                <Download className="h-4 w-4" />
                Exporter en PDF
              </Button>
            </div>

            {/* Info notice */}
            <div className="text-xs text-muted-foreground text-center px-4">
              Les informations affichées sont mises à jour en temps réel par l'administration foncière.
              Pour toute question, contactez votre opérateur technique ou le service foncier de votre sous-préfecture.
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
