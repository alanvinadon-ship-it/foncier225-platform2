import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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
};

export function CreditFinalAttestationPanel({ status, finalAttestation }: Props) {
  const isFinalStatus = status === "APPROVED" || status === "REJECTED" || status === "CLOSED";

  if (!isFinalStatus && !finalAttestation) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileCheck className="h-4 w-4 text-ci-green" />
          Attestation finale
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        {finalAttestation ? (
          <>
            <Alert className="border-green-200 bg-green-50 text-green-950">
              <ShieldCheck className="h-4 w-4 text-green-700" />
              <AlertTitle>Document officiel disponible</AlertTitle>
              <AlertDescription>
                Votre dossier est cloture et l&apos;attestation finale peut etre consultee ou telechargee.
              </AlertDescription>
            </Alert>
            <div className="rounded-xl border p-4">
              <p><span className="font-medium">Reference document:</span> {finalAttestation.documentRef ?? "Non renseignee"}</p>
              <p><span className="font-medium">Decision:</span> {finalAttestation.finalDecisionType ?? status}</p>
              <p><span className="font-medium">Emission:</span> {finalAttestation.issuedAt ? new Date(finalAttestation.issuedAt).toLocaleString("fr-FR") : "Non renseignee"}</p>
            </div>
            <div className="flex flex-wrap gap-3">
              {finalAttestation.fileUrl ? (
                <Button asChild className="bg-ci-green hover:bg-ci-green/90">
                  <a href={finalAttestation.fileUrl} target="_blank" rel="noopener noreferrer">Telecharger l'attestation</a>
                </Button>
              ) : null}
              {finalAttestation.verifyUrl ? (
                <Button asChild variant="outline">
                  <a href={finalAttestation.verifyUrl} target="_blank" rel="noopener noreferrer">
                    <Link2 className="mr-2 h-4 w-4" />
                    Verifier le document
                  </a>
                </Button>
              ) : null}
            </div>
          </>
        ) : (
          <Alert>
            <FileCheck className="h-4 w-4" />
            <AlertTitle>Dossier cloture</AlertTitle>
            <AlertDescription>
              La decision finale est bien enregistree, mais l&apos;attestation officielle n&apos;a pas encore ete emise.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}
