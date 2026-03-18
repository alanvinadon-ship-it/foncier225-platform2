import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { CreditStatusBadge } from "@/components/citizen/credit-ui";
import type { CreditFileStatus } from "@shared/credit-types";
import { CheckCircle2, Clock3, FilePenLine } from "lucide-react";

export function CreditSubmissionBanner({
  status,
  submittedAt,
}: {
  status: CreditFileStatus | string;
  submittedAt?: Date | string | null;
}) {
  if (status === "SUBMITTED") {
    return (
      <Alert className="border-blue-200 bg-blue-50 text-blue-950">
        <CheckCircle2 className="h-4 w-4 text-blue-700" />
        <AlertTitle className="flex items-center gap-2">
          <span>Dossier soumis</span>
          <CreditStatusBadge status={status} />
        </AlertTitle>
        <AlertDescription className="space-y-1">
          <p>Votre dossier a ete transmis a la banque et ne peut plus etre modifie.</p>
          <p>
            {submittedAt
              ? `Soumis le ${new Date(submittedAt).toLocaleString("fr-FR")}.`
              : "La date de soumission est en cours de synchronisation."}
          </p>
          <p>Prochaine etape: votre dossier est en attente de revue bancaire.</p>
        </AlertDescription>
      </Alert>
    );
  }

  if (status === "DOCS_PENDING") {
    return (
      <Alert className="border-amber-200 bg-amber-50 text-amber-950">
        <Clock3 className="h-4 w-4 text-amber-700" />
        <AlertTitle className="flex items-center gap-2">
          <span>Documents en cours</span>
          <CreditStatusBadge status={status} />
        </AlertTitle>
        <AlertDescription>
          Des pieces obligatoires manquent encore. Completez la checklist avant de soumettre votre dossier.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Alert className="border-slate-200 bg-slate-50 text-slate-950">
      <FilePenLine className="h-4 w-4 text-slate-700" />
      <AlertTitle className="flex items-center gap-2">
        <span>Brouillon</span>
        <CreditStatusBadge status={status} />
      </AlertTitle>
      <AlertDescription>
        Commencez a ajouter vos pieces justificatives. Le dossier restera modifiable tant qu&apos;il n&apos;a pas ete soumis.
      </AlertDescription>
    </Alert>
  );
}
