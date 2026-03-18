import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useState } from "react";

export function BankOfferCard({
  status,
  currentOffer,
  isPending,
  onSubmit,
}: {
  status: string;
  currentOffer?: {
    id: number;
    status: string;
    apr?: string | null;
    monthlyPaymentXof?: number | null;
    conditionsText?: string | null;
    expiresAt?: Date | string | null;
  } | null;
  isPending: boolean;
  onSubmit: (input: { apr: string; monthlyPaymentXof: number; conditionsText: string; expiresAt: string }) => Promise<void>;
}) {
  const [apr, setApr] = useState("");
  const [monthlyPaymentXof, setMonthlyPaymentXof] = useState("");
  const [conditionsText, setConditionsText] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [error, setError] = useState<string | null>(null);
  const canOffer = status === "UNDER_REVIEW";

  return (
    <Card>
      <CardHeader>
        <CardTitle>Offre bancaire</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {currentOffer ? (
          <div className="rounded-xl border bg-muted/20 p-4 text-sm">
            <p><span className="font-medium">APR:</span> {currentOffer.apr ?? "Non renseigne"}</p>
            <p><span className="font-medium">Mensualite:</span> {currentOffer.monthlyPaymentXof ? `${currentOffer.monthlyPaymentXof.toLocaleString("fr-FR")} XOF` : "Non renseignee"}</p>
            <p><span className="font-medium">Statut:</span> {currentOffer.status}</p>
            <p><span className="font-medium">Expiration:</span> {currentOffer.expiresAt ? new Date(currentOffer.expiresAt).toLocaleDateString("fr-FR") : "Non renseignee"}</p>
          </div>
        ) : null}

        {!canOffer ? (
          <p className="text-sm text-muted-foreground">
            Une offre peut etre emise uniquement depuis `UNDER_REVIEW`.
          </p>
        ) : (
          <>
            {error ? (
              <Alert variant="destructive">
                <AlertTitle>Offre impossible</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            ) : null}
            <div className="space-y-2">
              <Label htmlFor="offer-apr">APR</Label>
              <Input id="offer-apr" value={apr} onChange={event => setApr(event.target.value)} placeholder="Ex: 8.5%" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="offer-monthly">Mensualite estimee (XOF)</Label>
              <Input id="offer-monthly" type="number" value={monthlyPaymentXof} onChange={event => setMonthlyPaymentXof(event.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="offer-expiration">Date d'expiration</Label>
              <Input id="offer-expiration" type="date" value={expiresAt} onChange={event => setExpiresAt(event.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="offer-conditions">Conditions</Label>
              <Textarea id="offer-conditions" value={conditionsText} onChange={event => setConditionsText(event.target.value)} />
            </div>
            <Button
              className="bg-sky-700 hover:bg-sky-800"
              disabled={isPending}
              onClick={async () => {
                setError(null);
                const monthly = Number(monthlyPaymentXof);
                if (!apr.trim() || !conditionsText.trim() || !expiresAt || !Number.isFinite(monthly) || monthly <= 0) {
                  setError("Tous les champs de l'offre sont obligatoires.");
                  return;
                }
                try {
                  await onSubmit({
                    apr: apr.trim(),
                    monthlyPaymentXof: monthly,
                    conditionsText: conditionsText.trim(),
                    expiresAt,
                  });
                  setApr("");
                  setMonthlyPaymentXof("");
                  setConditionsText("");
                  setExpiresAt("");
                } catch (submitError) {
                  setError((submitError as Error).message || "Erreur inattendue.");
                }
              }}
            >
              {isPending ? "Emission..." : "Emettre une offre"}
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}
