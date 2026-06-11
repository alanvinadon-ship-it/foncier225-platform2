import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, FileText, Clock, Users, Building2, Landmark, BookOpen } from "lucide-react";
import { Link } from "wouter";
import WorkflowGantt from "@/components/WorkflowGantt";

const PHASE_1_DETAILS = [
  { step: 1, title: "Constitution de la liasse AFOR", duration: "~2 semaines", actor: "Demandeur", description: "Achat de la liasse (10 000 FCFA), remplissage des formulaires officiels, rassemblement des pièces d'identité et choix de l'opérateur technique agréé." },
  { step: 2, title: "Dépôt de la demande", duration: "~1 semaine", actor: "CSPGFR", description: "Dépôt du dossier complet auprès du Comité Sous-Préfectoral de Gestion Foncière Rurale. Vérification de la recevabilité." },
  { step: 3, title: "Délimitation", duration: "~1 mois", actor: "Opérateur technique", description: "Bornage contradictoire de la parcelle par le géomètre agréé, en présence des riverains et des autorités villageoises." },
  { step: 4, title: "Enquête publique", duration: "~1 mois", actor: "Sous-Préfet", description: "Enquête officielle pour recueillir les témoignages et vérifier l'absence de contestation sur les droits revendiqués." },
  { step: 5, title: "Publicité foncière", duration: "3 mois (légal)", actor: "Administration", description: "Affichage public des résultats de l'enquête pendant 3 mois pour permettre d'éventuelles oppositions. Délai incompressible." },
  { step: 6, title: "Validation CSPGFR", duration: "~2 semaines", actor: "CSPGFR", description: "Examen du dossier complet, des résultats de l'enquête et des éventuelles oppositions. Émission d'un avis favorable ou défavorable." },
  { step: 7, title: "Signature du Préfet", duration: "~1 semaine", actor: "Préfet", description: "Signature du Certificat Foncier sur la base de l'avis favorable du CSPGFR. Le CF est valable 3 ans." },
];

const PHASE_2_DETAILS = [
  { step: 8, title: "Demande d'immatriculation", duration: "~2 semaines", actor: "Demandeur", description: "Dépôt de la demande de transformation du Certificat Foncier en Titre Foncier auprès de l'AFOR." },
  { step: 9, title: "Contrôle AFOR", duration: "~1,5 mois", actor: "AFOR", description: "Vérification de la conformité du dossier, de la validité du CF et de l'absence de contentieux." },
  { step: 10, title: "Préparation APFR", duration: "~1 mois", actor: "AFOR", description: "Préparation de l'Attestation de Propriété Foncière Rurale qui deviendra le support du titre." },
  { step: 11, title: "Signature du Ministre", duration: "~1 mois", actor: "Ministre", description: "Le Ministre de l'Agriculture signe l'arrêté portant délivrance du Titre Foncier." },
  { step: 12, title: "Inscription au Livre Foncier", duration: "~2 semaines", actor: "Conservation Foncière", description: "Enregistrement au Livre Foncier, conférant un caractère définitif et opposable aux tiers." },
];

export default function WorkflowPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50/50 to-white">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="container flex items-center h-14 gap-4">
          <Link href="/">
            <Button variant="ghost" size="sm" className="gap-1.5">
              <ArrowLeft className="h-4 w-4" />
              Accueil
            </Button>
          </Link>
          <h1 className="font-semibold text-lg">Procédure d'obtention du Titre Foncier</h1>
        </div>
      </header>

      <main className="container py-8 max-w-5xl space-y-8">
        {/* Introduction */}
        <div className="text-center space-y-3">
          <h2 className="text-2xl font-bold text-gray-900">
            Workflow complet — De la demande au Titre Foncier
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            La procédure d'obtention du Titre Foncier en Côte d'Ivoire se déroule en deux grandes phases,
            conformément à la Loi n°98-750 relative au domaine foncier rural. Durée totale estimée : <strong>~12 mois</strong>.
          </p>
        </div>

        {/* Gantt Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-ci-orange" />
              Diagramme des délais
            </CardTitle>
          </CardHeader>
          <CardContent>
            <WorkflowGantt showLegend={true} />
          </CardContent>
        </Card>

        {/* Phase 1 */}
        <div>
          <h3 className="text-xl font-bold text-green-700 mb-4 flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Phase 1 — Obtention du Certificat Foncier (CF)
          </h3>
          <p className="text-sm text-muted-foreground mb-4">
            Le Certificat Foncier constate les droits coutumiers sur une terre rurale. Il est délivré par le Préfet après validation du CSPGFR. Validité : 3 ans.
          </p>
          <div className="space-y-3">
            {PHASE_1_DETAILS.map((item) => (
              <Card key={item.step} className="border-l-4 border-l-green-500">
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-green-100 text-green-700 flex items-center justify-center text-sm font-bold">
                      {item.step}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <h4 className="font-semibold text-sm">{item.title}</h4>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{item.duration}</span>
                          <span className="flex items-center gap-1"><Users className="h-3 w-3" />{item.actor}</span>
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">{item.description}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Phase 2 */}
        <div>
          <h3 className="text-xl font-bold text-blue-700 mb-4 flex items-center gap-2">
            <Landmark className="h-5 w-5" />
            Phase 2 — Transformation en Titre Foncier (TF)
          </h3>
          <p className="text-sm text-muted-foreground mb-4">
            Le Titre Foncier est le document définitif et inattaquable de propriété. Il est délivré par le Ministre de l'Agriculture après contrôle de l'AFOR et inscription au Livre Foncier.
          </p>
          <div className="space-y-3">
            {PHASE_2_DETAILS.map((item) => (
              <Card key={item.step} className="border-l-4 border-l-blue-500">
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-sm font-bold">
                      {item.step}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <h4 className="font-semibold text-sm">{item.title}</h4>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{item.duration}</span>
                          <span className="flex items-center gap-1"><Users className="h-3 w-3" />{item.actor}</span>
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">{item.description}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Legal references */}
        <Card className="bg-gray-50 border-dashed">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <BookOpen className="h-5 w-5 text-muted-foreground mt-0.5 shrink-0" />
              <div className="text-sm text-muted-foreground space-y-1">
                <p className="font-medium text-gray-700">Références légales</p>
                <p>Loi n°98-750 du 23 décembre 1998 relative au domaine foncier rural</p>
                <p>Décret n°99-594 du 13 octobre 1999 fixant les modalités d'application</p>
                <p>Les délais indiqués sont des estimations basées sur les pratiques courantes. Les délais réels peuvent varier selon la complexité du dossier et la charge des services administratifs.</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* CTA */}
        <div className="text-center space-y-3">
          <Link href="/suivi">
            <Button className="bg-ci-green hover:bg-ci-green/90 gap-2">
              Suivre mon dossier
            </Button>
          </Link>
        </div>
      </main>
    </div>
  );
}
