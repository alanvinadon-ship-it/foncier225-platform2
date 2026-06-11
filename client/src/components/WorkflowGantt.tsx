import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, Clock, Circle, Users, FileText, Info, X } from "lucide-react";

// Hook to detect touch devices
function useIsTouchDevice() {
  const [isTouch, setIsTouch] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(pointer: coarse)");
    setIsTouch(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsTouch(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);
  return isTouch;
}

// Step metadata with actors and documents
interface StepMeta {
  id: string;
  label: string;
  days: number;
  statuses: string[];
  actors: string[];
  documents: string[];
  description: string;
}

const PHASE_1_STEPS: StepMeta[] = [
  {
    id: "cf_draft",
    label: "Constitution liasse AFOR",
    days: 14,
    statuses: ["cf_draft"],
    actors: ["Demandeur", "Opérateur technique agréé"],
    documents: ["Formulaire de demande AFOR", "Pièce d'identité (CNI/Passeport)", "Acte de naissance", "Certificat de résidence", "Reçu d'achat liasse (10 000 FCFA)"],
    description: "Le demandeur achète la liasse foncière AFOR, remplit les formulaires officiels et rassemble les pièces justificatives avec l'aide de l'opérateur technique agréé.",
  },
  {
    id: "cf_submitted",
    label: "Dépôt de la demande",
    days: 7,
    statuses: ["cf_submitted"],
    actors: ["Demandeur", "CSPGFR (Comité Sous-Préfectoral)"],
    documents: ["Liasse AFOR complète", "Procès-verbal de palabre", "Attestation de cession coutumière", "Plan de situation"],
    description: "Dépôt du dossier complet auprès du Comité Sous-Préfectoral de Gestion Foncière Rurale. Vérification de la recevabilité administrative.",
  },
  {
    id: "cf_delimitation",
    label: "Délimitation",
    days: 30,
    statuses: ["cf_delimitation", "cf_delimited"],
    actors: ["Opérateur technique agréé", "Géomètre-expert", "Riverains", "Chef de village"],
    documents: ["PV de bornage contradictoire", "Plan parcellaire (levé topographique)", "Fiches de présence des riverains", "Attestation du chef de village"],
    description: "Bornage contradictoire de la parcelle par le géomètre agréé, en présence des riverains et des autorités villageoises. Pose des bornes physiques.",
  },
  {
    id: "cf_inquiry",
    label: "Enquête publique",
    days: 30,
    statuses: ["cf_inquiry"],
    actors: ["Sous-Préfet", "Commission d'enquête", "Témoins", "Riverains"],
    documents: ["PV d'enquête publique", "Témoignages recueillis", "Rapport de la commission", "Attestations de non-opposition"],
    description: "Enquête officielle pour recueillir les témoignages et vérifier l'absence de contestation sur les droits fonciers revendiqués.",
  },
  {
    id: "cf_publicity",
    label: "Publicité foncière (3 mois)",
    days: 90,
    statuses: ["cf_publicity", "cf_opposed"],
    actors: ["Administration préfectorale", "Public"],
    documents: ["Avis d'affichage public", "Registre des oppositions", "PV de clôture de publicité"],
    description: "Affichage public des résultats de l'enquête pendant 3 mois (délai légal incompressible) pour permettre d'éventuelles oppositions de tiers.",
  },
  {
    id: "cf_validated",
    label: "Validation CSPGFR",
    days: 14,
    statuses: ["cf_validated"],
    actors: ["CSPGFR", "Sous-Préfet", "Représentants villageois"],
    documents: ["Avis favorable du CSPGFR", "PV de délibération", "Rapport de synthèse du dossier"],
    description: "Examen du dossier complet, des résultats de l'enquête et des éventuelles oppositions. Émission d'un avis favorable ou défavorable.",
  },
  {
    id: "cf_signed",
    label: "Signature du Préfet",
    days: 7,
    statuses: ["cf_signed"],
    actors: ["Préfet de département"],
    documents: ["Certificat Foncier (original)", "Arrêté préfectoral", "Registre foncier rural"],
    description: "Le Préfet signe le Certificat Foncier sur la base de l'avis favorable du CSPGFR. Le CF est valable 3 ans et renouvelable.",
  },
];

const PHASE_2_STEPS: StepMeta[] = [
  {
    id: "tf_submitted",
    label: "Demande d'immatriculation",
    days: 14,
    statuses: ["tf_submitted"],
    actors: ["Demandeur (nationalité ivoirienne)", "AFOR"],
    documents: ["Certificat Foncier valide", "Demande d'immatriculation", "Certificat de nationalité ivoirienne", "Quittance de paiement des droits"],
    description: "Dépôt de la demande de transformation du Certificat Foncier en Titre Foncier auprès de l'AFOR. Condition : nationalité ivoirienne obligatoire.",
  },
  {
    id: "tf_afor_review",
    label: "Contrôle AFOR",
    days: 45,
    statuses: ["tf_afor_review"],
    actors: ["AFOR (Agence Foncière Rurale)", "Service juridique"],
    documents: ["Rapport de contrôle AFOR", "Vérification de conformité", "Historique du CF", "Attestation d'absence de contentieux"],
    description: "Vérification de la conformité du dossier, de la validité du CF, de l'absence de contentieux et du respect des conditions légales.",
  },
  {
    id: "tf_apfr_ready",
    label: "Préparation APFR",
    days: 30,
    statuses: ["tf_apfr_ready"],
    actors: ["AFOR", "Service cartographique"],
    documents: ["APFR (Attestation de Propriété Foncière Rurale)", "Plan définitif géoréférencé", "Fiche descriptive de la parcelle"],
    description: "Préparation de l'Attestation de Propriété Foncière Rurale qui deviendra le support juridique du Titre Foncier définitif.",
  },
  {
    id: "tf_minister_signing",
    label: "Signature du Ministre",
    days: 30,
    statuses: ["tf_minister_signing", "tf_signed"],
    actors: ["Ministre de l'Agriculture", "Direction du Foncier Rural"],
    documents: ["Arrêté ministériel", "Titre Foncier (projet)", "Visa de la Direction juridique"],
    description: "Le Ministre de l'Agriculture signe l'arrêté portant délivrance du Titre Foncier après validation par la Direction du Foncier Rural.",
  },
  {
    id: "tf_registered",
    label: "Inscription au Livre Foncier",
    days: 14,
    statuses: ["tf_registered"],
    actors: ["Conservation Foncière", "Conservateur"],
    documents: ["Titre Foncier définitif", "Inscription au Livre Foncier", "Certificat d'inscription"],
    description: "Enregistrement au Livre Foncier, conférant un caractère définitif, inattaquable et opposable aux tiers au droit de propriété.",
  },
];

const ALL_STEPS = [...PHASE_1_STEPS, ...PHASE_2_STEPS];
const TOTAL_DAYS = ALL_STEPS.reduce((sum, s) => sum + s.days, 0);

type StepStatus = "completed" | "current" | "upcoming";

function getStepStatus(stepStatuses: string[], currentStatus?: string): StepStatus {
  if (!currentStatus) return "upcoming";

  const allStatuses = ALL_STEPS.flatMap(s => s.statuses);
  const currentIdx = allStatuses.indexOf(currentStatus);
  const stepIdx = allStatuses.indexOf(stepStatuses[0]);

  if (currentIdx < 0) return "upcoming";
  if (stepStatuses.includes(currentStatus)) return "current";
  if (stepIdx < currentIdx) return "completed";
  return "upcoming";
}

function getElapsedDays(currentStatus?: string): number {
  if (!currentStatus) return 0;
  let elapsed = 0;
  for (const step of ALL_STEPS) {
    if (step.statuses.includes(currentStatus)) {
      return elapsed + Math.floor(step.days / 2); // mid-step
    }
    elapsed += step.days;
  }
  if (currentStatus === "tf_registered") return TOTAL_DAYS;
  return 0;
}

interface WorkflowGanttProps {
  currentStatus?: string;
  showLegend?: boolean;
  compact?: boolean;
}

export default function WorkflowGantt({ currentStatus, showLegend = true, compact = false }: WorkflowGanttProps) {
  const elapsedDays = getElapsedDays(currentStatus);
  const isTouch = useIsTouchDevice();

  return (
    <div className="w-full">
      {showLegend && (
        <div className="flex items-center gap-4 mb-4 text-xs text-muted-foreground flex-wrap">
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-green-500 inline-block" /> Complété</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-amber-500 inline-block animate-pulse" /> En cours</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-gray-200 inline-block" /> À venir</span>
          <span className="flex items-center gap-1">
            <Info className="h-3 w-3" />
            {isTouch ? "Appuyez pour les détails" : "Survolez pour les détails"}
          </span>
          <span className="ml-auto text-xs">Durée totale estimée : ~{Math.round(TOTAL_DAYS / 30)} mois</span>
        </div>
      )}

      {/* Phase 1 */}
      <div className="mb-6">
        <h4 className={`font-semibold text-green-700 mb-2 ${compact ? "text-xs" : "text-sm"}`}>
          Phase 1 — Certificat Foncier
        </h4>
        <GanttPhase steps={PHASE_1_STEPS} currentStatus={currentStatus} compact={compact} isTouch={isTouch} />
      </div>

      {/* Phase 2 */}
      <div>
        <h4 className={`font-semibold text-blue-700 mb-2 ${compact ? "text-xs" : "text-sm"}`}>
          Phase 2 — Titre Foncier
        </h4>
        <GanttPhase steps={PHASE_2_STEPS} currentStatus={currentStatus} compact={compact} phaseColor="blue" isTouch={isTouch} />
      </div>

      {/* Progress summary */}
      {currentStatus && (
        <div className="mt-4 pt-3 border-t">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Progression estimée</span>
            <span className="font-medium">{Math.round((elapsedDays / TOTAL_DAYS) * 100)}% (~{elapsedDays} jours / {TOTAL_DAYS} jours)</span>
          </div>
          <div className="mt-1.5 h-2 bg-gray-100 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-green-500 to-emerald-400 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${(elapsedDays / TOTAL_DAYS) * 100}%` }}
              transition={{ duration: 1, ease: "easeOut" }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function GanttPhase({ steps, currentStatus, compact, phaseColor = "green", isTouch }: {
  steps: StepMeta[];
  currentStatus?: string;
  compact?: boolean;
  phaseColor?: "green" | "blue";
  isTouch: boolean;
}) {
  const phaseTotalDays = steps.reduce((sum, s) => sum + s.days, 0);
  const [activeStep, setActiveStep] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close tooltip on click outside (for touch devices)
  useEffect(() => {
    if (!isTouch || !activeStep) return;
    function handleClickOutside(e: MouseEvent | TouchEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setActiveStep(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, [isTouch, activeStep]);

  const handleBarInteraction = useCallback((stepId: string) => {
    if (isTouch) {
      // Toggle on tap: if same step is active, close it; otherwise open it
      setActiveStep(prev => prev === stepId ? null : stepId);
    }
  }, [isTouch]);

  const handleMouseEnter = useCallback((stepId: string) => {
    if (!isTouch) {
      setActiveStep(stepId);
    }
  }, [isTouch]);

  const handleMouseLeave = useCallback(() => {
    if (!isTouch) {
      setActiveStep(null);
    }
  }, [isTouch]);

  return (
    <div className="space-y-1.5" ref={containerRef}>
      {/* Gantt bars */}
      <div className="flex gap-0.5 h-8 rounded-md overflow-hidden">
        {steps.map((step, idx) => {
          const status = getStepStatus(step.statuses, currentStatus);
          const widthPercent = (step.days / phaseTotalDays) * 100;
          const isActive = activeStep === step.id;

          const bgColor = status === "completed"
            ? phaseColor === "green" ? "bg-green-500" : "bg-blue-500"
            : status === "current"
              ? phaseColor === "green" ? "bg-amber-500" : "bg-amber-500"
              : "bg-gray-200";

          return (
            <motion.div
              key={step.id}
              className={`relative ${bgColor} ${status === "current" ? "animate-pulse" : ""} flex items-center justify-center cursor-pointer ${isActive ? "ring-2 ring-offset-1 ring-gray-400" : ""}`}
              style={{ width: `${widthPercent}%` }}
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ duration: 0.4, delay: idx * 0.08 }}
              onClick={() => handleBarInteraction(step.id)}
              onMouseEnter={() => handleMouseEnter(step.id)}
              onMouseLeave={handleMouseLeave}
            >
              {/* Icon */}
              {!compact && widthPercent > 8 && (
                <span className="text-white text-[10px] truncate px-1 select-none">
                  {status === "completed" ? "✓" : status === "current" ? "●" : ""}
                </span>
              )}
            </motion.div>
          );
        })}
      </div>

      {/* Interactive tooltip popover */}
      <AnimatePresence>
        {activeStep && (
          <StepTooltip
            step={steps.find(s => s.id === activeStep)!}
            currentStatus={currentStatus}
            phaseColor={phaseColor}
            isTouch={isTouch}
            onClose={() => setActiveStep(null)}
          />
        )}
      </AnimatePresence>

      {/* Labels */}
      {!compact && (
        <div className="flex gap-0.5">
          {steps.map((step) => {
            const widthPercent = (step.days / phaseTotalDays) * 100;
            const status = getStepStatus(step.statuses, currentStatus);
            const isActive = activeStep === step.id;
            return (
              <div
                key={step.id + "-label"}
                className={`overflow-hidden cursor-pointer transition-opacity ${isActive ? "opacity-100" : ""}`}
                style={{ width: `${widthPercent}%` }}
                onClick={() => handleBarInteraction(step.id)}
                onMouseEnter={() => handleMouseEnter(step.id)}
                onMouseLeave={handleMouseLeave}
              >
                <p className={`text-[10px] leading-tight truncate ${
                  status === "completed" ? "text-green-700 font-medium" :
                  status === "current" ? "text-amber-700 font-semibold" :
                  "text-muted-foreground"
                }`}>
                  {step.label}
                </p>
                <p className="text-[9px] text-muted-foreground">{step.days}j</p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function StepTooltip({ step, currentStatus, phaseColor, isTouch, onClose }: {
  step: StepMeta;
  currentStatus?: string;
  phaseColor: "green" | "blue";
  isTouch: boolean;
  onClose: () => void;
}) {
  const status = getStepStatus(step.statuses, currentStatus);
  const statusLabel = status === "completed" ? "Complété" : status === "current" ? "En cours" : "À venir";
  const statusColor = status === "completed"
    ? phaseColor === "green" ? "text-green-600 bg-green-50 border-green-200" : "text-blue-600 bg-blue-50 border-blue-200"
    : status === "current"
      ? "text-amber-600 bg-amber-50 border-amber-200"
      : "text-gray-500 bg-gray-50 border-gray-200";

  return (
    <motion.div
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      transition={{ duration: 0.15 }}
      className="mt-2 p-3 rounded-lg border bg-card shadow-lg text-xs"
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-3 mb-2">
        <h5 className="font-semibold text-sm text-foreground">{step.label}</h5>
        <div className="flex items-center gap-2">
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium border ${statusColor}`}>
            {statusLabel}
          </span>
          {isTouch && (
            <button
              onClick={(e) => { e.stopPropagation(); onClose(); }}
              className="p-1 rounded-full hover:bg-muted transition-colors"
              aria-label="Fermer"
            >
              <X className="h-3.5 w-3.5 text-muted-foreground" />
            </button>
          )}
        </div>
      </div>

      {/* Description */}
      <p className="text-muted-foreground mb-3 leading-relaxed">{step.description}</p>

      {/* Details grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Actors */}
        <div className="space-y-1">
          <div className="flex items-center gap-1 text-[11px] font-medium text-foreground">
            <Users className="h-3 w-3 text-ci-green" />
            Acteurs impliqués
          </div>
          <ul className="space-y-0.5 pl-4">
            {step.actors.map((actor, i) => (
              <li key={i} className="text-muted-foreground flex items-start gap-1">
                <span className="text-ci-green mt-0.5">•</span>
                {actor}
              </li>
            ))}
          </ul>
        </div>

        {/* Documents */}
        <div className="space-y-1">
          <div className="flex items-center gap-1 text-[11px] font-medium text-foreground">
            <FileText className="h-3 w-3 text-ci-orange" />
            Documents requis / produits
          </div>
          <ul className="space-y-0.5 pl-4">
            {step.documents.map((doc, i) => (
              <li key={i} className="text-muted-foreground flex items-start gap-1">
                <span className="text-ci-orange mt-0.5">•</span>
                {doc}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Duration footer */}
      <div className="mt-3 pt-2 border-t flex items-center gap-2 text-muted-foreground">
        <Clock className="h-3 w-3" />
        <span>Durée estimée : <strong className="text-foreground">{step.days} jours</strong> (~{(step.days / 30).toFixed(1)} mois)</span>
      </div>
    </motion.div>
  );
}

// Export for use in other components
export { ALL_STEPS, PHASE_1_STEPS, PHASE_2_STEPS, TOTAL_DAYS, getStepStatus, getElapsedDays };
export type { StepMeta };
