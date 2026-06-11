import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Building2,
  Trees,
  MapPin,
  FileText,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  HelpCircle,
  Landmark,
  Home,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

type Step = "location" | "terrain" | "document" | "result";
type LandZone = "urban" | "rural" | null;
type TerrainType = "lotissement" | "coutumier" | null;
type DocType = "lettre_attribution" | "permis_construire" | "attestation_villageoise" | "aucun" | null;

interface QuizState {
  zone: LandZone;
  terrain: TerrainType;
  document: DocType;
}

const STEPS: Step[] = ["location", "terrain", "document", "result"];

function getRecommendation(state: QuizState): "urban" | "rural" {
  // Urban if: zone urbaine OR lotissement OR lettre d'attribution/permis de construire
  if (state.zone === "urban") return "urban";
  if (state.terrain === "lotissement") return "urban";
  if (state.document === "lettre_attribution" || state.document === "permis_construire") return "urban";
  return "rural";
}

export default function NewApplication() {
  const [, navigate] = useLocation();
  const [currentStep, setCurrentStep] = useState<Step>("location");
  const [state, setState] = useState<QuizState>({ zone: null, terrain: null, document: null });

  const stepIndex = STEPS.indexOf(currentStep);
  const progress = ((stepIndex + 1) / STEPS.length) * 100;

  function goNext() {
    const idx = STEPS.indexOf(currentStep);
    if (idx < STEPS.length - 1) setCurrentStep(STEPS[idx + 1]);
  }

  function goBack() {
    const idx = STEPS.indexOf(currentStep);
    if (idx > 0) setCurrentStep(STEPS[idx - 1]);
  }

  function canProceed(): boolean {
    switch (currentStep) {
      case "location": return state.zone !== null;
      case "terrain": return state.terrain !== null;
      case "document": return state.document !== null;
      default: return true;
    }
  }

  const recommendation = getRecommendation(state);

  return (
    <div className="max-w-3xl mx-auto py-8 px-4">
      {/* Header */}
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-bold text-foreground mb-2">Nouvelle demande foncière</h1>
        <p className="text-muted-foreground">
          Répondez à quelques questions pour être orienté vers la bonne procédure.
        </p>
      </div>

      {/* Progress bar */}
      <div className="mb-8">
        <div className="flex justify-between text-xs text-muted-foreground mb-2">
          <span>Étape {stepIndex + 1} / {STEPS.length}</span>
          <span>{Math.round(progress)}%</span>
        </div>
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-primary rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
        <div className="flex justify-between mt-2">
          {["Localisation", "Type de terrain", "Documents", "Résultat"].map((label, i) => (
            <span
              key={label}
              className={`text-xs font-medium ${i <= stepIndex ? "text-primary" : "text-muted-foreground"}`}
            >
              {label}
            </span>
          ))}
        </div>
      </div>

      {/* Steps */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentStep}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.2 }}
        >
          {currentStep === "location" && (
            <StepLocation value={state.zone} onChange={(zone) => setState({ ...state, zone })} />
          )}
          {currentStep === "terrain" && (
            <StepTerrain value={state.terrain} onChange={(terrain) => setState({ ...state, terrain })} />
          )}
          {currentStep === "document" && (
            <StepDocument value={state.document} onChange={(doc) => setState({ ...state, document: doc })} />
          )}
          {currentStep === "result" && (
            <StepResult recommendation={recommendation} onNavigate={navigate} />
          )}
        </motion.div>
      </AnimatePresence>

      {/* Navigation buttons */}
      {currentStep !== "result" && (
        <div className="flex justify-between mt-8">
          <Button
            variant="outline"
            onClick={goBack}
            disabled={stepIndex === 0}
            className="gap-2"
          >
            <ArrowLeft className="w-4 h-4" /> Précédent
          </Button>
          <Button
            onClick={goNext}
            disabled={!canProceed()}
            className="gap-2"
          >
            Suivant <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      )}
    </div>
  );
}

/* ─── Step 1: Location ─── */
function StepLocation({ value, onChange }: { value: LandZone; onChange: (v: LandZone) => void }) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <MapPin className="w-5 h-5 text-primary" />
        <h2 className="text-lg font-semibold">Où se situe votre terrain ?</h2>
      </div>
      <p className="text-muted-foreground mb-6">
        Indiquez la zone géographique de votre parcelle pour déterminer la procédure applicable.
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <OptionCard
          icon={<Building2 className="w-8 h-8" />}
          title="Zone urbaine ou péri-urbaine"
          description="Commune, ville, zone lotie, quartier résidentiel ou zone d'extension urbaine"
          selected={value === "urban"}
          onClick={() => onChange("urban")}
        />
        <OptionCard
          icon={<Trees className="w-8 h-8" />}
          title="Zone rurale"
          description="Village, campagne, forêt, zone agricole, terrain coutumier non loti"
          selected={value === "rural"}
          onClick={() => onChange("rural")}
        />
      </div>
    </div>
  );
}

/* ─── Step 2: Terrain Type ─── */
function StepTerrain({ value, onChange }: { value: TerrainType; onChange: (v: TerrainType) => void }) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <Home className="w-5 h-5 text-primary" />
        <h2 className="text-lg font-semibold">Quel type de terrain possédez-vous ?</h2>
      </div>
      <p className="text-muted-foreground mb-6">
        Le type de terrain détermine la procédure administrative à suivre.
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <OptionCard
          icon={<Building2 className="w-8 h-8" />}
          title="Lotissement / Parcelle viabilisée"
          description="Terrain issu d'un lotissement approuvé, avec numéro de lot et îlot, viabilisé ou en cours"
          selected={value === "lotissement"}
          onClick={() => onChange("lotissement")}
        />
        <OptionCard
          icon={<Trees className="w-8 h-8" />}
          title="Terrain coutumier / Non loti"
          description="Terrain acquis par voie coutumière, héritage familial, ou terrain non encore loti"
          selected={value === "coutumier"}
          onClick={() => onChange("coutumier")}
        />
      </div>
    </div>
  );
}

/* ─── Step 3: Document ─── */
function StepDocument({ value, onChange }: { value: DocType; onChange: (v: DocType) => void }) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <FileText className="w-5 h-5 text-primary" />
        <h2 className="text-lg font-semibold">Quel document possédez-vous actuellement ?</h2>
      </div>
      <p className="text-muted-foreground mb-6">
        Le document en votre possession nous aide à identifier votre situation et la procédure adaptée.
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <OptionCard
          icon={<Landmark className="w-6 h-6" />}
          title="Lettre d'attribution"
          description="Lettre d'attribution délivrée par le Ministère de la Construction (MCLU)"
          selected={value === "lettre_attribution"}
          onClick={() => onChange("lettre_attribution")}
        />
        <OptionCard
          icon={<Building2 className="w-6 h-6" />}
          title="Permis de construire"
          description="Permis de construire ou permis d'habiter délivré par la mairie"
          selected={value === "permis_construire"}
          onClick={() => onChange("permis_construire")}
        />
        <OptionCard
          icon={<Trees className="w-6 h-6" />}
          title="Attestation villageoise"
          description="Attestation de cession coutumière, PV de palabre, certificat de détention"
          selected={value === "attestation_villageoise"}
          onClick={() => onChange("attestation_villageoise")}
        />
        <OptionCard
          icon={<HelpCircle className="w-6 h-6" />}
          title="Aucun document"
          description="Je n'ai pas encore de document officiel pour ce terrain"
          selected={value === "aucun"}
          onClick={() => onChange("aucun")}
        />
      </div>
    </div>
  );
}

/* ─── Step 4: Result ─── */
function StepResult({
  recommendation,
  onNavigate,
}: {
  recommendation: "urban" | "rural";
  onNavigate: (path: string) => void;
}) {
  const isUrban = recommendation === "urban";

  return (
    <div className="text-center">
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", stiffness: 200, damping: 15 }}
        className="mb-6"
      >
        <div className={`w-20 h-20 mx-auto rounded-full flex items-center justify-center ${
          isUrban ? "bg-blue-100 text-blue-600" : "bg-green-100 text-green-600"
        }`}>
          {isUrban ? <Building2 className="w-10 h-10" /> : <Trees className="w-10 h-10" />}
        </div>
      </motion.div>

      <h2 className="text-xl font-bold mb-2">
        {isUrban ? "Procédure Foncier Urbain (ACD)" : "Procédure Foncier Rural (Certificat Foncier)"}
      </h2>
      <p className="text-muted-foreground mb-6 max-w-md mx-auto">
        {isUrban
          ? "Votre situation correspond à une demande d'Arrêté de Concession Définitive (ACD). Cette procédure concerne les terrains urbains issus de lotissements approuvés."
          : "Votre situation correspond à une demande de Certificat Foncier. Cette procédure concerne les terrains ruraux acquis par voie coutumière ou non encore immatriculés."}
      </p>

      <Card className="max-w-md mx-auto mb-6 text-left">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-primary" />
            {isUrban ? "Procédure ACD — 3 phases" : "Procédure Certificat Foncier — 2 phases"}
          </CardTitle>
          <CardDescription>
            {isUrban ? "Durée estimée : 12 à 18 mois" : "Durée estimée : 8 à 14 mois"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isUrban ? (
            <ol className="space-y-2 text-sm">
              <li className="flex items-start gap-2">
                <span className="bg-blue-100 text-blue-700 rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold shrink-0">1</span>
                <span><strong>Concession Provisoire</strong> — Dépôt, vérification, arrêté provisoire</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="bg-blue-100 text-blue-700 rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold shrink-0">2</span>
                <span><strong>Mise en valeur</strong> — Construction, inspection, PV de constat</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="bg-blue-100 text-blue-700 rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold shrink-0">3</span>
                <span><strong>Concession Définitive</strong> — Bornage, publicité, arrêté définitif</span>
              </li>
            </ol>
          ) : (
            <ol className="space-y-2 text-sm">
              <li className="flex items-start gap-2">
                <span className="bg-green-100 text-green-700 rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold shrink-0">1</span>
                <span><strong>Certificat Foncier</strong> — Enquête, délimitation, publicité, validation</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="bg-green-100 text-green-700 rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold shrink-0">2</span>
                <span><strong>Titre Foncier</strong> — Immatriculation, bornage, inscription au Livre Foncier</span>
              </li>
            </ol>
          )}
        </CardContent>
      </Card>

      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <Button
          size="lg"
          className="gap-2"
          onClick={() => onNavigate(isUrban ? "/citizen/urban-acd/new" : "/citizen/land-title/new")}
        >
          {isUrban ? <Building2 className="w-4 h-4" /> : <Trees className="w-4 h-4" />}
          Commencer ma demande
          <ArrowRight className="w-4 h-4" />
        </Button>
        <Button
          variant="outline"
          size="lg"
          onClick={() => onNavigate(isUrban ? "/citizen/workflow" : "/citizen/workflow")}
        >
          Voir le processus détaillé
        </Button>
      </div>
    </div>
  );
}

/* ─── Option Card ─── */
function OptionCard({
  icon,
  title,
  description,
  selected,
  onClick,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <Card
      className={`cursor-pointer transition-all hover:shadow-md ${
        selected
          ? "border-primary bg-primary/5 ring-2 ring-primary/20"
          : "border-border hover:border-primary/40"
      }`}
      onClick={onClick}
    >
      <CardContent className="p-5">
        <div className="flex items-start gap-4">
          <div className={`shrink-0 ${selected ? "text-primary" : "text-muted-foreground"}`}>
            {icon}
          </div>
          <div>
            <h3 className={`font-semibold mb-1 ${selected ? "text-primary" : "text-foreground"}`}>
              {title}
            </h3>
            <p className="text-sm text-muted-foreground">{description}</p>
          </div>
          {selected && (
            <CheckCircle2 className="w-5 h-5 text-primary shrink-0 ml-auto" />
          )}
        </div>
      </CardContent>
    </Card>
  );
}
