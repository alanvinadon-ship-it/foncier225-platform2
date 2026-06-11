import { motion } from "framer-motion";
import { CheckCircle2, Clock, Circle } from "lucide-react";

// Workflow steps with estimated durations (in days)
const PHASE_1_STEPS = [
  { id: "cf_draft", label: "Constitution liasse AFOR", days: 14, statuses: ["cf_draft"] },
  { id: "cf_submitted", label: "Dépôt de la demande", days: 7, statuses: ["cf_submitted"] },
  { id: "cf_delimitation", label: "Délimitation (opérateur technique)", days: 30, statuses: ["cf_delimitation", "cf_delimited"] },
  { id: "cf_inquiry", label: "Enquête publique", days: 30, statuses: ["cf_inquiry"] },
  { id: "cf_publicity", label: "Publicité foncière (3 mois)", days: 90, statuses: ["cf_publicity", "cf_opposed"] },
  { id: "cf_validated", label: "Validation CSPGFR", days: 14, statuses: ["cf_validated"] },
  { id: "cf_signed", label: "Signature du Préfet", days: 7, statuses: ["cf_signed"] },
];

const PHASE_2_STEPS = [
  { id: "tf_submitted", label: "Demande d'immatriculation", days: 14, statuses: ["tf_submitted"] },
  { id: "tf_afor_review", label: "Contrôle AFOR", days: 45, statuses: ["tf_afor_review"] },
  { id: "tf_apfr_ready", label: "Préparation APFR", days: 30, statuses: ["tf_apfr_ready"] },
  { id: "tf_minister_signing", label: "Signature du Ministre", days: 30, statuses: ["tf_minister_signing", "tf_signed"] },
  { id: "tf_registered", label: "Inscription au Livre Foncier", days: 14, statuses: ["tf_registered"] },
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

  return (
    <div className="w-full">
      {showLegend && (
        <div className="flex items-center gap-4 mb-4 text-xs text-muted-foreground flex-wrap">
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-green-500 inline-block" /> Complété</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-amber-500 inline-block animate-pulse" /> En cours</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-gray-200 inline-block" /> À venir</span>
          <span className="ml-auto text-xs">Durée totale estimée : ~{Math.round(TOTAL_DAYS / 30)} mois</span>
        </div>
      )}

      {/* Phase 1 */}
      <div className="mb-6">
        <h4 className={`font-semibold text-green-700 mb-2 ${compact ? "text-xs" : "text-sm"}`}>
          Phase 1 — Certificat Foncier
        </h4>
        <GanttPhase steps={PHASE_1_STEPS} currentStatus={currentStatus} compact={compact} />
      </div>

      {/* Phase 2 */}
      <div>
        <h4 className={`font-semibold text-blue-700 mb-2 ${compact ? "text-xs" : "text-sm"}`}>
          Phase 2 — Titre Foncier
        </h4>
        <GanttPhase steps={PHASE_2_STEPS} currentStatus={currentStatus} compact={compact} phaseColor="blue" />
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

function GanttPhase({ steps, currentStatus, compact, phaseColor = "green" }: {
  steps: typeof PHASE_1_STEPS;
  currentStatus?: string;
  compact?: boolean;
  phaseColor?: "green" | "blue";
}) {
  const phaseTotalDays = steps.reduce((sum, s) => sum + s.days, 0);

  return (
    <div className="space-y-1.5">
      {/* Gantt bars */}
      <div className="flex gap-0.5 h-8 rounded-md overflow-hidden">
        {steps.map((step, idx) => {
          const status = getStepStatus(step.statuses, currentStatus);
          const widthPercent = (step.days / phaseTotalDays) * 100;

          const bgColor = status === "completed"
            ? phaseColor === "green" ? "bg-green-500" : "bg-blue-500"
            : status === "current"
              ? phaseColor === "green" ? "bg-amber-500" : "bg-amber-500"
              : "bg-gray-200";

          return (
            <motion.div
              key={step.id}
              className={`relative ${bgColor} ${status === "current" ? "animate-pulse" : ""} flex items-center justify-center group cursor-default`}
              style={{ width: `${widthPercent}%` }}
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ duration: 0.4, delay: idx * 0.08 }}
            >
              {/* Tooltip */}
              <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-[10px] px-2 py-1 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                {step.label} ({step.days}j)
              </div>
              {/* Icon */}
              {!compact && widthPercent > 8 && (
                <span className="text-white text-[10px] truncate px-1">
                  {status === "completed" ? "✓" : status === "current" ? "●" : ""}
                </span>
              )}
            </motion.div>
          );
        })}
      </div>

      {/* Labels */}
      {!compact && (
        <div className="flex gap-0.5">
          {steps.map((step) => {
            const widthPercent = (step.days / phaseTotalDays) * 100;
            const status = getStepStatus(step.statuses, currentStatus);
            return (
              <div
                key={step.id + "-label"}
                className="overflow-hidden"
                style={{ width: `${widthPercent}%` }}
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

// Export for use in other components
export { ALL_STEPS, PHASE_1_STEPS, PHASE_2_STEPS, TOTAL_DAYS, getStepStatus, getElapsedDays };
