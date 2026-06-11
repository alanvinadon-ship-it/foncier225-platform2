import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { CreditStatusBadge } from "@/components/citizen/credit-ui";
import type { CreditFileStatus } from "@shared/credit-types";
import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, Clock3, FilePenLine } from "lucide-react";

export function CreditSubmissionBanner({
  status,
  submittedAt,
}: {
  status: CreditFileStatus | string;
  submittedAt?: Date | string | null;
}) {
  const getContent = () => {
    if (status === "SUBMITTED") {
      return (
        <motion.div
          key="submitted"
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 8 }}
          transition={{ duration: 0.3 }}
        >
          <Alert className="border-blue-200 bg-blue-50 text-blue-950">
            <CheckCircle2 className="h-4 w-4 text-blue-700" />
            <AlertTitle className="flex items-center gap-2">
              <span>Dossier soumis</span>
              <CreditStatusBadge status={status} />
            </AlertTitle>
            <AlertDescription className="space-y-1">
              <p>Votre dossier a été transmis à la banque et ne peut plus être modifié.</p>
              <p>
                {submittedAt
                  ? `Soumis le ${new Date(submittedAt).toLocaleString("fr-FR")}.`
                  : "La date de soumission est en cours de synchronisation."}
              </p>
              <p>Prochaine étape : votre dossier est en attente de revue bancaire.</p>
            </AlertDescription>
          </Alert>
        </motion.div>
      );
    }

    if (status === "DOCS_PENDING") {
      return (
        <motion.div
          key="docs-pending"
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 8 }}
          transition={{ duration: 0.3 }}
        >
          <Alert className="border-amber-200 bg-amber-50 text-amber-950">
            <Clock3 className="h-4 w-4 text-amber-700" />
            <AlertTitle className="flex items-center gap-2">
              <span>Documents en cours</span>
              <CreditStatusBadge status={status} />
            </AlertTitle>
            <AlertDescription>
              Des pièces obligatoires manquent encore. Complétez la checklist avant de soumettre votre dossier.
            </AlertDescription>
          </Alert>
        </motion.div>
      );
    }

    return (
      <motion.div
        key="draft"
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 8 }}
        transition={{ duration: 0.3 }}
      >
        <Alert className="border-slate-200 bg-slate-50 text-slate-950">
          <FilePenLine className="h-4 w-4 text-slate-700" />
          <AlertTitle className="flex items-center gap-2">
            <span>Brouillon</span>
            <CreditStatusBadge status={status} />
          </AlertTitle>
          <AlertDescription>
            Commencez à ajouter vos pièces justificatives. Le dossier restera modifiable tant qu&apos;il n&apos;a pas été soumis.
          </AlertDescription>
        </Alert>
      </motion.div>
    );
  };

  return <AnimatePresence mode="wait">{getContent()}</AnimatePresence>;
}
