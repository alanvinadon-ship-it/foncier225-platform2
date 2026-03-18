import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileCheck, Link2, ShieldCheck } from "lucide-react";

type FinalAttestation = {
  id: number;
  status: string;
  documentRef?: string | null;
  finalDecisionType?: string | null;
  issuedAt?: string | Date | null;
  verifyUrl?: string | null;
  fileUrl?: string | null;
} | null;

type Props = {
  status: string;
  finalAttestation: FinalAttestation;
  isPending: boolean;
  onIssue: () => Promise<void>;
};

export function BankFinalAttestationCard({ status, finalAttestation, isPending, onIssue }: Props) {
  const canIssue = (status === "APPROVED" || status === "REJECTED") && !finalAttestation;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileCheck className="h-4 w-4 text-sky-700" />
          Attestation finale
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        {finalAttestation ? (
          <div className="space-y-3 rounded-xl border bg-sky-50/70 p-4">
            <div className="flex items-center gap-2 font-medium text-sky-950">
              <ShieldCheck className="h-4 w-4 text-sky-700" />
              Attestation emise
            </div>
            <p><span className="font-medium">Reference:</span> {finalAttestation.documentRef ?? "Non renseignee"}</p>
            <p><span className="font-medium">Decision:</span> {finalAttestation.finalDecisionType ?? "Non renseignee"}</p>
            <p><span className="font-medium">Emission:</span> {finalAttestation.issuedAt ? new Date(finalAttestation.issuedAt).toLocaleString("fr-FR") : "Non renseignee"}</p>
            <div className="flex flex-wrap gap-3">
              {finalAttestation.fileUrl ? (
                <Button asChild size="sm" className="bg-sky-700 hover:bg-sky-800">
                  <a href={finalAttestation.fileUrl} target="_blank" rel="noopener noreferrer">Telecharger le PDF</a>
                </Button>
              ) : null}
              {finalAttestation.verifyUrl ? (
                <Button asChild size="sm" variant="outline">
                  <a href={finalAttestation.verifyUrl} target="_blank" rel="noopener noreferrer">
                    <Link2 className="mr-2 h-4 w-4" />
                    Verifier publiquement
                  </a>
                </Button>
              ) : null}
            </div>
          </div>
        ) : (
          <p className="text-muted-foreground">
            Aucune attestation finale n&apos;a encore ete emise pour ce dossier.
          </p>
        )}

        {canIssue ? (
          <div className="space-y-3 rounded-xl border bg-muted/20 p-4">
            <p className="text-muted-foreground">
              L&apos;emission cree le PDF officiel, le code de verification public et rattache l&apos;attestation au dossier.
            </p>
            <Button onClick={() => void onIssue()} disabled={isPending} className="bg-sky-700 hover:bg-sky-800">
              {isPending ? "Emission en cours..." : "Emettre l'attestation finale"}
            </Button>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
