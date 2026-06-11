/**
 * AcdTimeline — Timeline interactive ACD avec progression réelle vs délais théoriques
 * Affiche chaque étape avec son état, durée réelle vs théorique, et indicateur retard/avance
 */
import {
  ACD_STEP_LABELS,
  ACD_STEP_TYPES_PHASE1,
  ACD_STEP_TYPES_PHASE2,
  ACD_STEP_TYPES_PHASE3,
  type AcdStatus,
  type AcdStepType,
} from "@shared/acd-workflow";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  Building2,
  CheckCircle2,
  Circle,
  Clock,
  HardHat,
  Landmark,
  TrendingDown,
  TrendingUp,
} from "lucide-react";

// ─── Types ──────────────────────────────────────────────────────────────────

interface AcdStep {
  stepType: string;
  status: "completed" | "in_progress" | "pending";
  startedAt?: number | null;
  completedAt?: number | null;
}

interface AcdTimelineProps {
  currentStatus: AcdStatus;
  steps: AcdStep[];
}

// ─── Theoretical durations (days) ──────────────────────────────────────────

const THEORETICAL_DAYS: Record<AcdStepType, number> = {
  depot_demande: 7,
  verification_lot: 14,
  instruction_technique: 30,
  commission_attribution: 30,
  signature_acp: 14,
  notification_obligations: 7,
  mise_en_valeur: 730, // ~24 months average
  constat_mise_en_valeur: 30,
  demande_transformation: 14,
  verification_conformite: 30,
  signature_acd: 14,
  publication_jo: 30,
  delivrance_titre: 14,
};

const PHASE_META: { key: string; label: string; icon: React.ElementType; color: string; steps: AcdStepType[] }[] = [
  { key: "provisional", label: "Phase 1 — Concession Provisoire", icon: Building2, color: "text-blue-600", steps: ACD_STEP_TYPES_PHASE1 },
  { key: "development", label: "Phase 2 — Mise en valeur", icon: HardHat, color: "text-amber-600", steps: ACD_STEP_TYPES_PHASE2 },
  { key: "definitive", label: "Phase 3 — Concession Définitive", icon: Landmark, color: "text-emerald-600", steps: ACD_STEP_TYPES_PHASE3 },
];

// ─── Helpers ────────────────────────────────────────────────────────────────

function daysBetween(start: number, end: number): number {
  return Math.max(1, Math.round((end - start) / (1000 * 60 * 60 * 24)));
}

function formatDuration(days: number): string {
  if (days >= 365) return `${Math.round(days / 30)} mois`;
  if (days >= 30) return `${Math.round(days / 30)} mois`;
  return `${days}j`;
}

function getStepData(stepType: AcdStepType, steps: AcdStep[]) {
  return steps.find(s => s.stepType === stepType);
}

// ─── Component ──────────────────────────────────────────────────────────────

export default function AcdTimeline({ currentStatus, steps }: AcdTimelineProps) {
  const allStepTypes = [...ACD_STEP_TYPES_PHASE1, ...ACD_STEP_TYPES_PHASE2, ...ACD_STEP_TYPES_PHASE3];
  
  // Determine which step is current
  const currentStepIdx = allStepTypes.findIndex(st => {
    const data = getStepData(st, steps);
    return data?.status === "in_progress";
  });

  return (
    <div className="space-y-6">
      {PHASE_META.map((phase, phaseIdx) => {
        const PhaseIcon = phase.icon;
        const phaseSteps = phase.steps;
        const hasActiveStep = phaseSteps.some(st => getStepData(st, steps)?.status === "in_progress");
        const allCompleted = phaseSteps.every(st => getStepData(st, steps)?.status === "completed");
        const hasStarted = phaseSteps.some(st => getStepData(st, steps));

        return (
          <div key={phase.key}>
            {/* Phase header */}
            <div className="flex items-center gap-2 mb-3">
              <PhaseIcon className={`h-4 w-4 ${phase.color}`} />
              <span className={`text-sm font-semibold ${phase.color}`}>{phase.label}</span>
              {allCompleted && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />}
              {hasActiveStep && (
                <span className="ml-auto text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-medium">
                  En cours
                </span>
              )}
            </div>

            {/* Steps */}
            <div className="ml-2 border-l-2 border-muted pl-4 space-y-1">
              {phaseSteps.map((stepType, idx) => {
                const stepData = getStepData(stepType, steps);
                const isCompleted = stepData?.status === "completed";
                const isActive = stepData?.status === "in_progress";
                const isPending = !stepData || stepData.status === "pending";

                // Calculate real duration
                let realDays: number | null = null;
                let daysElapsed: number | null = null;
                if (isCompleted && stepData.startedAt && stepData.completedAt) {
                  realDays = daysBetween(stepData.startedAt, stepData.completedAt);
                } else if (isActive && stepData.startedAt) {
                  daysElapsed = daysBetween(stepData.startedAt, Date.now());
                }

                const theoreticalDays = THEORETICAL_DAYS[stepType];
                
                // Determine delay status
                let delayStatus: "ahead" | "on_track" | "delayed" | null = null;
                if (realDays !== null) {
                  if (realDays < theoreticalDays * 0.8) delayStatus = "ahead";
                  else if (realDays > theoreticalDays * 1.2) delayStatus = "delayed";
                  else delayStatus = "on_track";
                } else if (daysElapsed !== null) {
                  if (daysElapsed > theoreticalDays) delayStatus = "delayed";
                  else if (daysElapsed > theoreticalDays * 0.8) delayStatus = "on_track";
                }

                return (
                  <motion.div
                    key={stepType}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: (phaseIdx * phaseSteps.length + idx) * 0.05 }}
                    className={`relative flex items-center gap-3 py-2 px-3 rounded-lg transition-colors ${
                      isActive ? "bg-amber-50 border border-amber-200" :
                      isCompleted ? "bg-emerald-50/50" : ""
                    }`}
                  >
                    {/* Status icon */}
                    <div className="shrink-0">
                      {isCompleted ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                      ) : isActive ? (
                        <div className="relative">
                          <Clock className="h-4 w-4 text-amber-500" />
                          <span className="absolute -top-0.5 -right-0.5 h-2 w-2 bg-amber-500 rounded-full animate-pulse" />
                        </div>
                      ) : (
                        <Circle className="h-4 w-4 text-muted-foreground/40" />
                      )}
                    </div>

                    {/* Step info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-medium ${
                          isCompleted ? "text-emerald-700" :
                          isActive ? "text-amber-700" :
                          "text-muted-foreground"
                        }`}>
                          {ACD_STEP_LABELS[stepType]}
                        </span>
                      </div>
                      
                      {/* Duration comparison */}
                      {(realDays !== null || daysElapsed !== null) && (
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[10px] text-muted-foreground">
                            {realDays !== null ? (
                              <>Réel : <strong>{formatDuration(realDays)}</strong></>
                            ) : (
                              <>En cours : <strong>{formatDuration(daysElapsed!)}</strong></>
                            )}
                          </span>
                          <span className="text-[10px] text-muted-foreground">
                            / Théorique : {formatDuration(theoreticalDays)}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Delay indicator */}
                    {delayStatus && (
                      <div className="shrink-0">
                        {delayStatus === "ahead" && (
                          <span className="inline-flex items-center gap-0.5 text-[10px] text-emerald-600 font-medium">
                            <TrendingDown className="h-3 w-3" /> Avance
                          </span>
                        )}
                        {delayStatus === "delayed" && (
                          <span className="inline-flex items-center gap-0.5 text-[10px] text-red-600 font-medium">
                            <AlertTriangle className="h-3 w-3" /> Retard
                          </span>
                        )}
                        {delayStatus === "on_track" && (
                          <span className="inline-flex items-center gap-0.5 text-[10px] text-blue-600 font-medium">
                            <TrendingUp className="h-3 w-3" /> Normal
                          </span>
                        )}
                      </div>
                    )}

                    {/* Dates */}
                    {stepData?.startedAt && (
                      <div className="shrink-0 text-right">
                        <div className="text-[10px] text-muted-foreground">
                          {new Date(stepData.startedAt).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" })}
                        </div>
                        {stepData.completedAt && (
                          <div className="text-[10px] text-emerald-600">
                            → {new Date(stepData.completedAt).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" })}
                          </div>
                        )}
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </div>
          </div>
        );
      })}

      {/* Overall progress summary */}
      <div className="mt-4 p-3 rounded-lg bg-muted/50 border">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Progression globale</span>
          <span className="font-semibold">
            {steps.filter(s => s.status === "completed").length} / 13 étapes complétées
          </span>
        </div>
        <div className="mt-2 h-2 bg-muted rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-blue-500 via-amber-500 to-emerald-500 rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${(steps.filter(s => s.status === "completed").length / 13) * 100}%` }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          />
        </div>
      </div>
    </div>
  );
}
