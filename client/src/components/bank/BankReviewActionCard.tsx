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
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, Eye } from "lucide-react";

export function BankReviewActionCard({
  status,
  isPending,
  errorMessage,
  onConfirm,
}: {
  status: string;
  isPending: boolean;
  errorMessage?: string | null;
  onConfirm: () => void | Promise<void>;
}) {
  const canStartReview = status === "SUBMITTED";

  return (
    <Card>
      <CardHeader>
        <CardTitle>Action banque</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {errorMessage ? (
          <Alert variant="destructive">
            <AlertTitle>Action impossible</AlertTitle>
            <AlertDescription>{errorMessage}</AlertDescription>
          </Alert>
        ) : null}

        {canStartReview ? (
          <>
            <p className="text-sm text-muted-foreground">
              Cette action fait passer le dossier de `SUBMITTED` a `UNDER_REVIEW` et marque le debut de la revue bancaire.
            </p>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button className="bg-sky-700 hover:bg-sky-800" disabled={isPending}>
                  <Eye className="h-4 w-4" />
                  {isPending ? "Traitement..." : "Prendre en revue"}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Commencer la revue bancaire ?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Le dossier passera a l&apos;etat `UNDER_REVIEW`. Les etapes suivantes seront ajoutees dans les prochaines missions.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Annuler</AlertDialogCancel>
                  <AlertDialogAction
                    className="bg-sky-700 hover:bg-sky-800"
                    onClick={() => {
                      if (!isPending) {
                        void onConfirm();
                      }
                    }}
                  >
                    Confirmer
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </>
        ) : (
          <Alert className="border-sky-200 bg-sky-50 text-sky-950">
            <CheckCircle2 className="h-4 w-4 text-sky-700" />
            <AlertTitle>Lecture seule</AlertTitle>
            <AlertDescription>
              Ce dossier n&apos;est plus dans l&apos;etat `SUBMITTED`. La prise en revue n&apos;est donc plus disponible.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}
