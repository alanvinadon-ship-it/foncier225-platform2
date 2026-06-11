/**
 * UrbanWorkflowPage — Processus complet de la demande à l'ACD
 * Diagramme de Gantt + détail des 13 étapes en 3 phases
 */
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import AcdWorkflowGantt from "@/components/AcdWorkflowGantt";
import {
  ACD_STEP_LABELS,
  ACD_REQUIRED_DOCUMENTS,
  ACD_DOCUMENT_LABELS,
  type AcdStepType,
  type AcdDocumentType,
} from "@shared/acd-workflow";
import { ArrowLeft, BookOpen, Building2, Clock, FileText, HardHat, Landmark, Users } from "lucide-react";
import { Link } from "wouter";

// ─── Step metadata ──────────────────────────────────────────────────────────

interface StepDetail {
  stepType: AcdStepType;
  duration: string;
  actors: string[];
  description: string;
}

const PHASE_1_STEPS: StepDetail[] = [
  {
    stepType: "depot_demande",
    duration: "~1 semaine",
    actors: ["Demandeur", "Guichet MCLU"],
    description:
      "Le demandeur dépose sa requête au guichet du Ministère de la Construction, du Logement et de l'Urbanisme (MCLU). Le dossier comprend la lettre de demande, la pièce d'identité, le plan de lotissement approuvé et l'attestation d'attribution de lot.",
  },
  {
    stepType: "verification_lot",
    duration: "~2 semaines",
    actors: ["Service domanial", "Conservation foncière"],
    description:
      "Le service domanial vérifie la disponibilité juridique du lot demandé : absence d'hypothèque, de litige en cours, de double attribution. Consultation du registre de la Conservation foncière.",
  },
  {
    stepType: "instruction_technique",
    duration: "~1 mois",
    actors: ["Géomètre agréé", "Service technique MCLU"],
    description:
      "Un géomètre-expert agréé procède au levé topographique, à la vérification des limites et à la conformité du lot avec le plan de lotissement. Le rapport technique est transmis au MCLU.",
  },
  {
    stepType: "commission_attribution",
    duration: "~1 mois",
    actors: ["Commission d'attribution", "MCLU"],
    description:
      "La Commission d'attribution se réunit pour examiner le dossier. Elle émet un avis favorable ou défavorable sur la base du rapport technique, de la disponibilité du lot et de la capacité du demandeur.",
  },
  {
    stepType: "signature_acp",
    duration: "~2 semaines",
    actors: ["Ministre MCLU", "Secrétariat"],
    description:
      "Sur avis favorable de la Commission, le Ministre signe l'Arrêté de Concession Provisoire (ACP). Le demandeur reçoit notification et doit s'acquitter des frais de procédure.",
  },
];

const PHASE_2_STEPS: StepDetail[] = [
  {
    stepType: "notification_obligations",
    duration: "~1 semaine",
    actors: ["MCLU", "Demandeur"],
    description:
      "Le MCLU notifie officiellement au concessionnaire ses obligations de mise en valeur : nature des travaux à réaliser, délais impartis (généralement 2 à 5 ans selon la superficie), et conditions de conformité.",
  },
  {
    stepType: "mise_en_valeur",
    duration: "12 à 36 mois",
    actors: ["Demandeur", "Architecte", "Entreprise BTP"],
    description:
      "Le concessionnaire réalise les travaux de mise en valeur conformément au cahier des charges : construction de bâtiments, aménagement du terrain, raccordement aux réseaux (eau, électricité, voirie). C'est l'étape la plus longue du processus.",
  },
  {
    stepType: "constat_mise_en_valeur",
    duration: "~1 mois",
    actors: ["Commission de constat", "Géomètre"],
    description:
      "Une commission de constat se déplace sur le terrain pour vérifier que les obligations de mise en valeur ont été respectées. Le géomètre dresse un procès-verbal de constat avec photos et mesures.",
  },
];

const PHASE_3_STEPS: StepDetail[] = [
  {
    stepType: "demande_transformation",
    duration: "~2 semaines",
    actors: ["Demandeur", "Guichet MCLU"],
    description:
      "Après validation de la mise en valeur, le concessionnaire dépose une demande de transformation de l'ACP en ACD. Le dossier inclut le rapport de constat favorable et la demande formelle de transformation.",
  },
  {
    stepType: "verification_conformite",
    duration: "~1 mois",
    actors: ["Service technique", "Conservation foncière"],
    description:
      "Le service technique vérifie la conformité globale du dossier : validité de l'ACP, respect des délais, conformité des travaux avec le cahier des charges, absence de contentieux.",
  },
  {
    stepType: "signature_acd",
    duration: "~2 semaines",
    actors: ["Ministre MCLU", "Premier Ministre"],
    description:
      "L'Arrêté de Concession Définitive (ACD) est signé par le Ministre de la Construction et contresigné par le Premier Ministre. Il confère un droit de propriété définitif sur le terrain.",
  },
  {
    stepType: "publication_jo",
    duration: "~1 mois",
    actors: ["Journal Officiel", "MCLU"],
    description:
      "L'ACD est publié au Journal Officiel de la République de Côte d'Ivoire, rendant le droit opposable aux tiers. Cette publication est une formalité substantielle obligatoire.",
  },
  {
    stepType: "delivrance_titre",
    duration: "~2 semaines",
    actors: ["Conservation foncière", "Demandeur"],
    description:
      "Le titre foncier définitif est inscrit au Livre Foncier par le Conservateur. Le propriétaire reçoit son titre, document inattaquable et imprescriptible de propriété.",
  },
];

// ─── Component ──────────────────────────────────────────────────────────────

function StepCard({ step, index, borderColor, bgColor, textColor }: {
  step: StepDetail;
  index: number;
  borderColor: string;
  bgColor: string;
  textColor: string;
}) {
  const docs = ACD_REQUIRED_DOCUMENTS[step.stepType] || [];
  return (
    <Card className={`border-l-4 ${borderColor}`}>
      <CardContent className="pt-4 pb-4">
        <div className="flex items-start gap-4">
          <div className={`flex-shrink-0 w-8 h-8 rounded-full ${bgColor} ${textColor} flex items-center justify-center text-sm font-bold`}>
            {index}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <h4 className="font-semibold text-sm">{ACD_STEP_LABELS[step.stepType]}</h4>
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{step.duration}</span>
                <span className="flex items-center gap-1"><Users className="h-3 w-3" />{step.actors[0]}</span>
              </div>
            </div>
            <p className="text-sm text-muted-foreground mt-1">{step.description}</p>
            {docs.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {docs.map((doc) => (
                  <span key={doc} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-muted text-[11px] text-muted-foreground">
                    <FileText className="h-2.5 w-2.5" />
                    {ACD_DOCUMENT_LABELS[doc]}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function UrbanWorkflowPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50/50 to-white">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="container flex items-center h-14 gap-4">
          <Link href="/citizen/urban-acd">
            <Button variant="ghost" size="sm" className="gap-1.5">
              <ArrowLeft className="h-4 w-4" />
              Foncier Urbain
            </Button>
          </Link>
          <h1 className="font-semibold text-lg">Procédure d'obtention de l'ACD</h1>
        </div>
      </header>

      <main className="container py-8 max-w-5xl space-y-8">
        {/* Introduction */}
        <div className="text-center space-y-3">
          <h2 className="text-2xl font-bold text-gray-900">
            Workflow complet — De la demande à l'ACD
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            La procédure d'obtention de l'Arrêté de Concession Définitive (ACD) en Côte d'Ivoire
            se déroule en <strong>3 grandes phases</strong> et <strong>13 étapes</strong>,
            conformément au Décret n°2013-482 relatif aux concessions de terrains du domaine urbain.
            Durée totale estimée : <strong>18 à 48 mois</strong> (selon la mise en valeur).
          </p>
        </div>

        {/* Gantt Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-blue-600" />
              Diagramme des délais (GANTT)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <AcdWorkflowGantt currentStatus="acd_draft" />
          </CardContent>
        </Card>

        {/* Phase 1 */}
        <div>
          <h3 className="text-xl font-bold text-blue-700 mb-4 flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Phase 1 — Concession Provisoire (ACP)
          </h3>
          <p className="text-sm text-muted-foreground mb-4">
            L'Arrêté de Concession Provisoire (ACP) est le premier acte administratif qui confère
            au demandeur un droit provisoire d'occupation et d'usage du terrain urbain, sous réserve
            de mise en valeur dans les délais impartis. Durée estimée : <strong>~3 mois</strong>.
          </p>
          <div className="space-y-3">
            {PHASE_1_STEPS.map((step, i) => (
              <StepCard
                key={step.stepType}
                step={step}
                index={i + 1}
                borderColor="border-l-blue-500"
                bgColor="bg-blue-100"
                textColor="text-blue-700"
              />
            ))}
          </div>
        </div>

        {/* Phase 2 */}
        <div>
          <h3 className="text-xl font-bold text-amber-700 mb-4 flex items-center gap-2">
            <HardHat className="h-5 w-5" />
            Phase 2 — Mise en valeur
          </h3>
          <p className="text-sm text-muted-foreground mb-4">
            La mise en valeur est l'obligation principale du concessionnaire provisoire.
            Il doit réaliser les constructions et aménagements prévus dans le cahier des charges
            dans un délai de 2 à 5 ans. C'est la phase la plus longue du processus.
            Durée estimée : <strong>12 à 36 mois</strong>.
          </p>
          <div className="space-y-3">
            {PHASE_2_STEPS.map((step, i) => (
              <StepCard
                key={step.stepType}
                step={step}
                index={i + 6}
                borderColor="border-l-amber-500"
                bgColor="bg-amber-100"
                textColor="text-amber-700"
              />
            ))}
          </div>
        </div>

        {/* Phase 3 */}
        <div>
          <h3 className="text-xl font-bold text-emerald-700 mb-4 flex items-center gap-2">
            <Landmark className="h-5 w-5" />
            Phase 3 — Concession Définitive (ACD)
          </h3>
          <p className="text-sm text-muted-foreground mb-4">
            Après constat favorable de la mise en valeur, le concessionnaire peut demander
            la transformation de son ACP en ACD. L'Arrêté de Concession Définitive confère
            un droit de propriété définitif, inattaquable et imprescriptible.
            Durée estimée : <strong>~3 mois</strong>.
          </p>
          <div className="space-y-3">
            {PHASE_3_STEPS.map((step, i) => (
              <StepCard
                key={step.stepType}
                step={step}
                index={i + 9}
                borderColor="border-l-emerald-500"
                bgColor="bg-emerald-100"
                textColor="text-emerald-700"
              />
            ))}
          </div>
        </div>

        {/* Summary table */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Récapitulatif des délais par phase</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 px-3 font-medium">Phase</th>
                    <th className="text-left py-2 px-3 font-medium">Étapes</th>
                    <th className="text-left py-2 px-3 font-medium">Durée estimée</th>
                    <th className="text-left py-2 px-3 font-medium">Acteur principal</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b">
                    <td className="py-2 px-3 font-medium text-blue-700">Phase 1 — ACP</td>
                    <td className="py-2 px-3">5 étapes</td>
                    <td className="py-2 px-3">~3 mois</td>
                    <td className="py-2 px-3">MCLU / Commission</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-2 px-3 font-medium text-amber-700">Phase 2 — Mise en valeur</td>
                    <td className="py-2 px-3">3 étapes</td>
                    <td className="py-2 px-3">12–36 mois</td>
                    <td className="py-2 px-3">Demandeur</td>
                  </tr>
                  <tr>
                    <td className="py-2 px-3 font-medium text-emerald-700">Phase 3 — ACD</td>
                    <td className="py-2 px-3">5 étapes</td>
                    <td className="py-2 px-3">~3 mois</td>
                    <td className="py-2 px-3">Ministre / PM</td>
                  </tr>
                </tbody>
                <tfoot>
                  <tr className="border-t bg-muted/30">
                    <td className="py-2 px-3 font-bold">Total</td>
                    <td className="py-2 px-3 font-bold">13 étapes</td>
                    <td className="py-2 px-3 font-bold">18–48 mois</td>
                    <td className="py-2 px-3"></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Legal references */}
        <Card className="bg-gray-50 border-dashed">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <BookOpen className="h-5 w-5 text-muted-foreground mt-0.5 shrink-0" />
              <div className="text-sm text-muted-foreground space-y-1">
                <p className="font-medium text-gray-700">Références légales</p>
                <p>Décret n°2013-482 du 2 juillet 2013 portant modalités d'application en matière de gestion du domaine foncier urbain de l'État</p>
                <p>Loi n°2019-576 du 26 juin 2019 portant Code de la Construction et de l'Habitat</p>
                <p>Décret n°71-74 du 16 février 1971 relatif aux procédures domaniales et foncières (modifié)</p>
                <p className="italic mt-2">Les délais indiqués sont des estimations basées sur les pratiques courantes. Les délais réels peuvent varier selon la complexité du dossier, la nature de la mise en valeur et la charge des services administratifs.</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* CTA */}
        <div className="text-center space-y-3">
          <Link href="/citizen/urban-acd">
            <Button className="bg-blue-600 hover:bg-blue-700 gap-2">
              <Building2 className="h-4 w-4" />
              Mes dossiers ACD
            </Button>
          </Link>
        </div>
      </main>
    </div>
  );
}
