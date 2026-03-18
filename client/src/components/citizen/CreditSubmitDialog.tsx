import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Send } from "lucide-react";

export function CreditSubmitDialog({
  canSubmit,
  status,
  missingDocuments,
  isPending,
  onConfirm,
}: {
  canSubmit: boolean;
  status: string;
  missingDocuments: string[];
  isPending: boolean;
  onConfirm: () => void | Promise<void>;
}) {
  const isSubmitted = status === "SUBMITTED";
  const isLocked = !canSubmit;

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          className="bg-ci-orange hover:bg-ci-orange/90"
          disabled={isPending || isLocked}
        >
          <Send className="h-4 w-4" />
          {isPending ? "Soumission..." : "Soumettre le dossier"}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Confirmer la soumission</AlertDialogTitle>
          <AlertDialogDescription>
            {isSubmitted
              ? "Ce dossier a deja ete soumis."
              : "Une fois soumis, le dossier passe en lecture seule en attente de traitement bancaire."}
          </AlertDialogDescription>
        </AlertDialogHeader>

        {!isSubmitted ? (
          <div className="space-y-3 text-sm text-muted-foreground">
            <p>Avant de confirmer:</p>
            <ul className="list-disc space-y-1 pl-5">
              <li>les documents requis doivent etre presents,</li>
              <li>l&apos;ajout de nouvelles pieces sera verrouille,</li>
              <li>la banque verra ensuite le dossier dans sa future file de revue.</li>
            </ul>
            {missingDocuments.length > 0 ? (
              <p className="text-amber-700">
                Soumission bloquee: il manque encore {missingDocuments.length} document(s) requis.
              </p>
            ) : null}
          </div>
        ) : null}

        <AlertDialogFooter>
          <AlertDialogCancel>Annuler</AlertDialogCancel>
          <AlertDialogAction
            className="bg-ci-orange hover:bg-ci-orange/90"
            disabled={isPending || isLocked}
            onClick={event => {
              event.preventDefault();
              if (!isPending && !isLocked) {
                void onConfirm();
              }
            }}
          >
            Confirmer la soumission
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
