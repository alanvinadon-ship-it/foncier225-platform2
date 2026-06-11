/**
 * AcdWorkflowGantt — Diagramme de Gantt interactif pour le workflow ACD (foncier urbain)
 * 3 phases, 13 étapes, infobulles tactiles/desktop, couleurs par étape
 */
import {
  ACD_PHASES,
  ACD_REQUIRED_DOCUMENTS,
  ACD_DOCUMENT_LABELS,
  ACD_STEP_LABELS,
  ACD_STEP_TYPES_PHASE1,
  ACD_STEP_TYPES_PHASE2,
  ACD_STEP_TYPES_PHASE3,
  type AcdPhase,
  type AcdStatus,
  type AcdStepType,
  type AcdDocumentType,
  getAcdPhaseForStatus,
} from "@shared/acd-workflow";
import { AnimatePresence, motion } from "framer-motion";
import { Clock, FileText, Users, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

// ─── Types ──────────────────────────────────────────────────────────────────

interface AcdStep {
  stepType: AcdStepType;
  status: "completed" | "in_progress" | "pending";
  startedAt?: number | null;
  completedAt?: number | null;
}

interface AcdWorkflowGanttProps {
  currentStatus: AcdStatus;
  steps?: AcdStep[];
  compact?: boolean;
}

// ─── Metadata ───────────────────────────────────────────────────────────────

const STEP_DURATIONS: Record<AcdStepType, string> = {
  depot_demande: "7j",
  verification_lot: "14j",
  instruction_technique: "30j",
  commission_attribution: "30j",
  signature_acp: "14j",
  notification_obligations: "7j",
  mise_en_valeur: "12-36 mois",
  constat_mise_en_valeur: "30j",
  demande_transformation: "14j",
  verification_conformite: "30j",
  signature_acd: "14j",
  publication_jo: "30j",
  delivrance_titre: "14j",
};

const STEP_ACTORS: Record<AcdStepType, string[]> = {
  depot_demande: ["Demandeur", "Guichet MCLU"],
  verification_lot: ["Service domanial", "Conservation foncière"],
  instruction_technique: ["Géomètre agréé", "Service technique MCLU"],
  commission_attribution: ["Commission d'attribution", "MCLU"],
  signature_acp: ["Ministre MCLU", "Secrétariat"],
  notification_obligations: ["MCLU", "Demandeur"],
  mise_en_valeur: ["Demandeur", "Architecte", "Entreprise BTP"],
  constat_mise_en_valeur: ["Commission de constat", "Géomètre"],
  demande_transformation: ["Demandeur", "Guichet MCLU"],
  verification_conformite: ["Service technique", "Conservation foncière"],
  signature_acd: ["Ministre MCLU", "Premier Ministre"],
  publication_jo: ["Journal Officiel", "MCLU"],
  delivrance_titre: ["Conservation foncière", "Demandeur"],
};

const PHASE_COLORS: Record<AcdPhase, string> = {
  provisional: "#3b82f6",
  development: "#f59e0b",
  definitive: "#10b981",
};

const STEP_COLORS: string[] = [
  "#3b82f6", "#2563eb", "#1d4ed8", "#6366f1", "#4f46e5",
  "#f59e0b", "#d97706", "#b45309",
  "#10b981", "#059669", "#047857", "#0d9488", "#0f766e",
];

// ─── Component ──────────────────────────────────────────────────────────────

export default function AcdWorkflowGantt({ currentStatus, steps = [], compact = false }: AcdWorkflowGanttProps) {
  const [activeStep, setActiveStep] = useState<AcdStepType | null>(null);
  const [isTouchDevice, setIsTouchDevice] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setIsTouchDevice(window.matchMedia("(pointer: coarse)").matches);
  }, []);

  // Close on outside click (touch)
  useEffect(() => {
    if (!isTouchDevice || !activeStep) return;
    const handler = (e: TouchEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setActiveStep(null);
      }
    };
    document.addEventListener("touchstart", handler);
    return () => document.removeEventListener("touchstart", handler);
  }, [isTouchDevice, activeStep]);

  const currentPhase = getAcdPhaseForStatus(currentStatus);
  const allSteps: AcdStepType[] = [...ACD_STEP_TYPES_PHASE1, ...ACD_STEP_TYPES_PHASE2, ...ACD_STEP_TYPES_PHASE3];

  // Determine step status from steps array or infer from currentStatus
  const getStepStatus = useCallback((stepType: AcdStepType): "completed" | "in_progress" | "pending" => {
    const existingStep = steps.find((s) => s.stepType === stepType);
    if (existingStep) return existingStep.status;

    // Infer from position relative to current status
    const currentIdx = allSteps.indexOf(getStepTypeForStatus(currentStatus));
    const stepIdx = allSteps.indexOf(stepType);
    if (stepIdx < currentIdx) return "completed";
    if (stepIdx === currentIdx) return "in_progress";
    return "pending";
  }, [steps, currentStatus]);

  const phases: { key: AcdPhase; label: string; steps: AcdStepType[] }[] = [
    { key: "provisional", label: "Phase 1 — Concession Provisoire", steps: ACD_STEP_TYPES_PHASE1 },
    { key: "development", label: "Phase 2 — Mise en valeur", steps: ACD_STEP_TYPES_PHASE2 },
    { key: "definitive", label: "Phase 3 — Concession Définitive", steps: ACD_STEP_TYPES_PHASE3 },
  ];

  return (
    <div ref={containerRef} className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold">Diagramme des étapes ACD</h3>
        </div>
        <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
          <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-emerald-500" /> Complété</span>
          <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" /> En cours</span>
          <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-gray-300" /> À venir</span>
        </div>
      </div>

      {/* Phases */}
      {phases.map((phase, phaseIdx) => {
        const phaseColor = PHASE_COLORS[phase.key];
        const isCurrentPhase = phase.key === currentPhase;

        return (
          <div key={phase.key} className="space-y-2">
            <h4
              className="text-xs font-semibold px-1"
              style={{ color: phaseColor }}
            >
              {phase.label}
              {isCurrentPhase && <span className="ml-2 text-[10px] font-normal text-muted-foreground">(phase actuelle)</span>}
            </h4>

            <div className="flex gap-1 items-end">
              {phase.steps.map((stepType, stepIdx) => {
                const globalIdx = allSteps.indexOf(stepType);
                const status = getStepStatus(stepType);
                const color = STEP_COLORS[globalIdx] || phaseColor;
                const isActive = activeStep === stepType;

                const opacity = status === "pending" ? 0.35 : 1;
                const barHeight = compact ? 28 : 36;

                return (
                  <div key={stepType} className="relative flex-1 min-w-0">
                    {/* Bar */}
                    <motion.div
                      className="rounded cursor-pointer relative overflow-hidden"
                      style={{
                        backgroundColor: color,
                        opacity,
                        height: barHeight,
                      }}
                      whileHover={!isTouchDevice ? { scale: 1.05, opacity: 1 } : undefined}
                      onMouseEnter={!isTouchDevice ? () => setActiveStep(stepType) : undefined}
                      onMouseLeave={!isTouchDevice ? () => setActiveStep(null) : undefined}
                      onClick={isTouchDevice ? () => setActiveStep(isActive ? null : stepType) : undefined}
                    >
                      {status === "in_progress" && (
                        <motion.div
                          className="absolute inset-0 bg-white/20"
                          animate={{ opacity: [0.2, 0.5, 0.2] }}
                          transition={{ duration: 2, repeat: Infinity }}
                        />
                      )}
                    </motion.div>

                    {/* Label */}
                    <div className="mt-1 px-0.5">
                      <p className="text-[9px] font-medium truncate leading-tight" style={{ color }}>
                        {ACD_STEP_LABELS[stepType].split(" ").slice(0, 3).join(" ")}
                      </p>
                      <p className="text-[8px] text-muted-foreground">{STEP_DURATIONS[stepType]}</p>
                    </div>

                    {/* Tooltip */}
                    <AnimatePresence>
                      {isActive && (
                        <StepTooltip
                          stepType={stepType}
                          status={status}
                          color={color}
                          isTouchDevice={isTouchDevice}
                          onClose={() => setActiveStep(null)}
                        />
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      {/* Progress bar */}
      <div className="mt-3">
        <div className="flex items-center justify-between text-[10px] text-muted-foreground mb-1">
          <span>Progression globale</span>
          <span>{Math.round(getProgress(currentStatus))}%</span>
        </div>
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-blue-500 via-amber-500 to-emerald-500"
            initial={{ width: 0 }}
            animate={{ width: `${getProgress(currentStatus)}%` }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          />
        </div>
      </div>
    </div>
  );
}

// ─── Tooltip ────────────────────────────────────────────────────────────────

function StepTooltip({
  stepType,
  status,
  color,
  isTouchDevice,
  onClose,
}: {
  stepType: AcdStepType;
  status: string;
  color: string;
  isTouchDevice: boolean;
  onClose: () => void;
}) {
  const docs = ACD_REQUIRED_DOCUMENTS[stepType] || [];
  const actors = STEP_ACTORS[stepType] || [];

  return (
    <motion.div
      initial={{ opacity: 0, y: 8, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 8, scale: 0.95 }}
      transition={{ duration: 0.15 }}
      className="absolute z-50 left-1/2 -translate-x-1/2 top-full mt-2 w-64 bg-popover border rounded-lg shadow-lg p-3 text-xs"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2">
          <span className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: color }} />
          <span className="font-semibold text-foreground leading-tight">{ACD_STEP_LABELS[stepType]}</span>
        </div>
        {isTouchDevice && (
          <button onClick={onClose} className="shrink-0 text-muted-foreground hover:text-foreground">
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Status + Duration */}
      <div className="flex items-center gap-2 mb-2 text-muted-foreground">
        <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
          status === "completed" ? "bg-emerald-100 text-emerald-700" :
          status === "in_progress" ? "bg-amber-100 text-amber-700" :
          "bg-gray-100 text-gray-600"
        }`}>
          {status === "completed" ? "Complété" : status === "in_progress" ? "En cours" : "À venir"}
        </span>
        <span className="flex items-center gap-1">
          <Clock className="h-3 w-3" />
          {STEP_DURATIONS[stepType]}
        </span>
      </div>

      {/* Actors */}
      {actors.length > 0 && (
        <div className="mb-2">
          <div className="flex items-center gap-1 text-muted-foreground mb-1">
            <Users className="h-3 w-3" />
            <span className="font-medium">Acteurs</span>
          </div>
          <ul className="space-y-0.5 pl-4">
            {actors.map((a) => (
              <li key={a} className="text-foreground">{a}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Documents */}
      {docs.length > 0 && (
        <div>
          <div className="flex items-center gap-1 text-muted-foreground mb-1">
            <FileText className="h-3 w-3" />
            <span className="font-medium">Documents requis</span>
          </div>
          <ul className="space-y-0.5 pl-4">
            {docs.map((d) => (
              <li key={d} className="text-foreground">{ACD_DOCUMENT_LABELS[d]}</li>
            ))}
          </ul>
        </div>
      )}
    </motion.div>
  );
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function getStepTypeForStatus(status: AcdStatus): AcdStepType {
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

function getProgress(status: AcdStatus): number {
  const allSteps: AcdStepType[] = [...ACD_STEP_TYPES_PHASE1, ...ACD_STEP_TYPES_PHASE2, ...ACD_STEP_TYPES_PHASE3];
  const currentStep = getStepTypeForStatus(status);
  const idx = allSteps.indexOf(currentStep);
  if (status === "acd_delivered") return 100;
  if (status === "acd_rejected" || status === "acd_cancelled") return 0;
  return Math.round(((idx + 0.5) / allSteps.length) * 100);
}
