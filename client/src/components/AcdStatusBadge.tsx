import { ACD_STATUS_LABELS, type AcdStatus, getAcdPhaseForStatus } from "@shared/acd-workflow";

const PHASE_COLORS: Record<string, { bg: string; text: string }> = {
  provisional: { bg: "bg-blue-100", text: "text-blue-700" },
  development: { bg: "bg-amber-100", text: "text-amber-700" },
  definitive: { bg: "bg-emerald-100", text: "text-emerald-700" },
};

const TERMINAL_COLORS: Record<string, { bg: string; text: string }> = {
  acd_rejected: { bg: "bg-red-100", text: "text-red-700" },
  acd_cancelled: { bg: "bg-gray-100", text: "text-gray-600" },
  acd_delivered: { bg: "bg-green-100", text: "text-green-700" },
};

export function AcdStatusBadge({ status }: { status: AcdStatus }) {
  const terminal = TERMINAL_COLORS[status];
  const phase = getAcdPhaseForStatus(status);
  const colors = terminal || (phase ? PHASE_COLORS[phase] : { bg: "bg-gray-100", text: "text-gray-600" });

  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${colors.bg} ${colors.text}`}>
      {ACD_STATUS_LABELS[status] || status}
    </span>
  );
}
