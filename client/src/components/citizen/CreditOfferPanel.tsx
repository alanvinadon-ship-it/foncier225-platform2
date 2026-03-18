import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function CreditOfferPanel({
  offer,
  status,
  isAccepting,
  isRejecting,
  onAccept,
  onReject,
}: {
  offer?: {
    id: number;
    status: string;
    apr?: string | null;
    monthlyPaymentXof?: number | null;
    conditionsText?: string | null;
    expiresAt?: Date | string | null;
    createdAt?: Date | string | null;
  } | null;
  status: string;
  isAccepting: boolean;
  isRejecting: boolean;
  onAccept: (offerId: number) => Promise<void>;
  onReject: (offerId: number) => Promise<void>;
}) {
  if (!offer) {
    return null;
  }

  const isExpired = offer.expiresAt ? new Date(offer.expiresAt).getTime() <= Date.now() : false;
  const canRespond = status === "OFFERED" && offer.status === "pending" && !isExpired;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Offre recue</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-xl border bg-muted/20 p-4 text-sm">
          <p><span className="font-medium">APR:</span> {offer.apr ?? "Non renseigne"}</p>
          <p><span className="font-medium">Mensualite:</span> {offer.monthlyPaymentXof ? `${offer.monthlyPaymentXof.toLocaleString("fr-FR")} XOF` : "Non renseignee"}</p>
          <p><span className="font-medium">Conditions:</span> {offer.conditionsText ?? "Non renseignees"}</p>
          <p><span className="font-medium">Expiration:</span> {offer.expiresAt ? new Date(offer.expiresAt).toLocaleDateString("fr-FR") : "Non renseignee"}</p>
          <p><span className="font-medium">Statut:</span> {offer.status}</p>
        </div>

        {isExpired ? (
          <Alert variant="destructive">
            <AlertTitle>Offre expiree</AlertTitle>
            <AlertDescription>Cette offre n&apos;est plus active.</AlertDescription>
          </Alert>
        ) : null}

        {canRespond ? (
          <div className="flex flex-wrap gap-3">
            <Button
              className="bg-emerald-700 hover:bg-emerald-800"
              disabled={isAccepting || isRejecting}
              onClick={async () => onAccept(offer.id)}
            >
              {isAccepting ? "Validation..." : "Accepter l'offre"}
            </Button>
            <Button
              variant="destructive"
              disabled={isAccepting || isRejecting}
              onClick={async () => onReject(offer.id)}
            >
              {isRejecting ? "Validation..." : "Refuser l'offre"}
            </Button>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
