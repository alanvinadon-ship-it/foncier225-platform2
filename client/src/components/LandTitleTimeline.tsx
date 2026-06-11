import { motion } from "framer-motion";
import {
  CheckCircle2,
  Circle,
  Clock,
  FileCheck,
  FileSearch,
  FilePen,
  Gavel,
  Landmark,
  MapPin,
  Megaphone,
  PenTool,
  Shield,
  ShieldAlert,
  XCircle,
  BookOpen,
  Award,
} from "lucide-react";

// ─── Status Configuration ───────────────────────────────────────────

export type LandTitleStatus = 
  | "cf_draft" | "cf_submitted" | "cf_delimitation" | "cf_delimited"
  | "cf_inquiry" | "cf_publicity" | "cf_opposed" | "cf_validated" | "cf_signed" | "cf_rejected"
  | "tf_submitted" | "tf_afor_review" | "tf_apfr_ready"
  | "tf_minister_signing" | "tf_signed" | "tf_registered" | "tf_rejected";

interface StatusConfig {
  label: string;
  description: string;
  icon: React.ElementType;
  phase: "certificate" | "title";
  color: string;
  bgColor: string;
}

const STATUS_CONFIG: Record<LandTitleStatus, StatusConfig> = {
  // Phase 1 — Certificat Foncier
  cf_draft: {
    label: "Brouillon",
    description: "Dossier en cours de préparation",
    icon: FilePen,
    phase: "certificate",
    color: "text-slate-500",
    bgColor: "bg-slate-100",
  },
  cf_submitted: {
    label: "Déposé",
    description: "Demande déposée à la sous-préfecture",
    icon: FileCheck,
    phase: "certificate",
    color: "text-blue-600",
    bgColor: "bg-blue-50",
  },
  cf_delimitation: {
    label: "Délimitation",
    description: "Opérations de bornage en cours par l'opérateur technique",
    icon: MapPin,
    phase: "certificate",
    color: "text-amber-600",
    bgColor: "bg-amber-50",
  },
  cf_delimited: {
    label: "Délimité",
    description: "Bornage terminé, constat de limites établi",
    icon: CheckCircle2,
    phase: "certificate",
    color: "text-amber-700",
    bgColor: "bg-amber-50",
  },
  cf_inquiry: {
    label: "Enquête",
    description: "Enquête officielle en cours par le commissaire-enquêteur",
    icon: FileSearch,
    phase: "certificate",
    color: "text-purple-600",
    bgColor: "bg-purple-50",
  },
  cf_publicity: {
    label: "Publicité",
    description: "Période de publicité de 3 mois (oppositions possibles)",
    icon: Megaphone,
    phase: "certificate",
    color: "text-orange-600",
    bgColor: "bg-orange-50",
  },
  cf_opposed: {
    label: "Opposition",
    description: "Une ou plusieurs oppositions ont été déposées",
    icon: ShieldAlert,
    phase: "certificate",
    color: "text-red-600",
    bgColor: "bg-red-50",
  },
  cf_validated: {
    label: "Validé CSPGFR",
    description: "Dossier validé par la Commission Sous-Préfectorale",
    icon: Shield,
    phase: "certificate",
    color: "text-emerald-600",
    bgColor: "bg-emerald-50",
  },
  cf_signed: {
    label: "CF Signé",
    description: "Certificat Foncier signé par le Préfet (valable 10 ans)",
    icon: PenTool,
    phase: "certificate",
    color: "text-green-700",
    bgColor: "bg-green-50",
  },
  cf_rejected: {
    label: "Rejeté (CF)",
    description: "Demande de Certificat Foncier rejetée",
    icon: XCircle,
    phase: "certificate",
    color: "text-red-700",
    bgColor: "bg-red-100",
  },
  // Phase 2 — Titre Foncier
  tf_submitted: {
    label: "Requête TF",
    description: "Requête d'immatriculation déposée au tribunal",
    icon: Landmark,
    phase: "title",
    color: "text-indigo-600",
    bgColor: "bg-indigo-50",
  },
  tf_afor_review: {
    label: "Contrôle AFOR",
    description: "Vérification par l'Agence Foncière Rurale",
    icon: FileSearch,
    phase: "title",
    color: "text-indigo-700",
    bgColor: "bg-indigo-50",
  },
  tf_apfr_ready: {
    label: "APFR Prêt",
    description: "Arrêté de Propriété Foncière Rurale préparé",
    icon: BookOpen,
    phase: "title",
    color: "text-violet-600",
    bgColor: "bg-violet-50",
  },
  tf_minister_signing: {
    label: "Signature Ministre",
    description: "En attente de signature du Ministre de l'Agriculture",
    icon: PenTool,
    phase: "title",
    color: "text-violet-700",
    bgColor: "bg-violet-50",
  },
  tf_signed: {
    label: "APFR Signé",
    description: "Arrêté signé par le Ministre",
    icon: Gavel,
    phase: "title",
    color: "text-emerald-700",
    bgColor: "bg-emerald-50",
  },
  tf_registered: {
    label: "Titre Inscrit",
    description: "Titre Foncier inscrit au Livre Foncier — propriété définitive",
    icon: Award,
    phase: "title",
    color: "text-green-800",
    bgColor: "bg-green-100",
  },
  tf_rejected: {
    label: "Rejeté (TF)",
    description: "Demande de Titre Foncier rejetée",
    icon: XCircle,
    phase: "title",
    color: "text-red-700",
    bgColor: "bg-red-100",
  },
};

// Ordered flow for display
const PHASE1_FLOW: LandTitleStatus[] = [
  "cf_draft", "cf_submitted", "cf_delimitation", "cf_delimited",
  "cf_inquiry", "cf_publicity", "cf_opposed", "cf_validated", "cf_signed",
];

const PHASE2_FLOW: LandTitleStatus[] = [
  "tf_submitted", "tf_afor_review", "tf_apfr_ready",
  "tf_minister_signing", "tf_signed", "tf_registered",
];

// ─── Component ──────────────────────────────────────────────────────

interface LandTitleTimelineProps {
  currentStatus: LandTitleStatus;
  phase: "certificate" | "title";
  certificateSignedAt?: number | null;
  certificateExpiryAt?: number | null;
  createdAt?: number;
}

export function LandTitleTimeline({
  currentStatus,
  phase,
  certificateSignedAt,
  certificateExpiryAt,
  createdAt,
}: LandTitleTimelineProps) {
  const isRejected = currentStatus === "cf_rejected" || currentStatus === "tf_rejected";
  const flow = phase === "certificate" ? PHASE1_FLOW : [...PHASE1_FLOW, ...PHASE2_FLOW];

  // Find current index in flow
  const currentIndex = flow.indexOf(currentStatus);
  // For rejected, show up to the last valid step
  const effectiveIndex = isRejected ? flow.length : currentIndex;

  return (
    <div className="space-y-6">
      {/* Phase header */}
      <div className="flex items-center gap-3 mb-4">
        <div className={`h-2 w-2 rounded-full ${phase === "certificate" ? "bg-ci-green" : "bg-indigo-600"}`} />
        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          {phase === "certificate" ? "Phase 1 — Certificat Foncier" : "Phase 2 — Titre Foncier"}
        </h3>
      </div>

      {/* Timeline */}
      <div className="relative">
        {flow.map((status, idx) => {
          const config = STATUS_CONFIG[status];
          const Icon = config.icon;
          const isActive = status === currentStatus;
          const isPast = idx < effectiveIndex;
          const isFuture = idx > effectiveIndex;

          // Skip cf_opposed if not in that state
          if (status === "cf_opposed" && currentStatus !== "cf_opposed" && !isPast) {
            return null;
          }

          return (
            <motion.div
              key={status}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.05, duration: 0.3 }}
              className="relative flex items-start gap-4 pb-6 last:pb-0"
            >
              {/* Connector line */}
              {idx < flow.length - 1 && (
                <div
                  className={`absolute left-[19px] top-10 w-0.5 h-[calc(100%-24px)] ${
                    isPast ? "bg-ci-green/60" : "bg-border"
                  }`}
                />
              )}

              {/* Icon circle */}
              <div className="relative z-10 shrink-0">
                {isActive ? (
                  <motion.div
                    animate={{ scale: [1, 1.15, 1] }}
                    transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
                    className={`flex h-10 w-10 items-center justify-center rounded-full border-2 border-ci-orange ${config.bgColor} shadow-md`}
                  >
                    <Icon className={`h-5 w-5 ${config.color}`} />
                  </motion.div>
                ) : isPast ? (
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-ci-green/10 border-2 border-ci-green/40">
                    <CheckCircle2 className="h-5 w-5 text-ci-green" />
                  </div>
                ) : (
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted/50 border-2 border-border">
                    <Circle className={`h-4 w-4 ${isFuture ? "text-muted-foreground/40" : config.color}`} />
                  </div>
                )}
              </div>

              {/* Content */}
              <div className={`pt-1.5 ${isFuture ? "opacity-40" : ""}`}>
                <div className="flex items-center gap-2">
                  <span className={`text-sm font-semibold ${isActive ? config.color : isPast ? "text-foreground" : "text-muted-foreground"}`}>
                    {config.label}
                  </span>
                  {isActive && (
                    <motion.span
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="inline-flex items-center gap-1 rounded-full bg-ci-orange/10 px-2 py-0.5 text-xs font-medium text-ci-orange"
                    >
                      <Clock className="h-3 w-3" />
                      En cours
                    </motion.span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">{config.description}</p>
                {/* Certificate signed info */}
                {status === "cf_signed" && isPast && certificateSignedAt && (
                  <p className="text-xs text-ci-green mt-1">
                    Signé le {new Date(certificateSignedAt).toLocaleDateString("fr-FR")}
                    {certificateExpiryAt && ` — Expire le ${new Date(certificateExpiryAt).toLocaleDateString("fr-FR")}`}
                  </p>
                )}
              </div>
            </motion.div>
          );
        })}

        {/* Rejected state */}
        {isRejected && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative flex items-start gap-4 pt-2"
          >
            <div className="relative z-10 shrink-0">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100 border-2 border-red-400 shadow-sm">
                <XCircle className="h-5 w-5 text-red-600" />
              </div>
            </div>
            <div className="pt-1.5">
              <span className="text-sm font-semibold text-red-700">
                {currentStatus === "cf_rejected" ? "Certificat Foncier Rejeté" : "Titre Foncier Rejeté"}
              </span>
              <p className="text-xs text-red-600 mt-0.5">
                La demande a été rejetée. Consultez les motifs dans le détail du dossier.
              </p>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}

// ─── Compact Status Badge ───────────────────────────────────────────

export function LandTitleStatusBadge({ status }: { status: LandTitleStatus }) {
  const config = STATUS_CONFIG[status];
  if (!config) return <span className="text-xs text-muted-foreground">{status}</span>;
  const Icon = config.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${config.bgColor} ${config.color}`}>
      <Icon className="h-3.5 w-3.5" />
      {config.label}
    </span>
  );
}

export { STATUS_CONFIG, PHASE1_FLOW, PHASE2_FLOW };
