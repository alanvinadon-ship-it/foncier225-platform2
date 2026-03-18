import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useState } from "react";

export function BankDecisionCard({
  status,
  latestDecision,
  isPending,
  onDecide,
}: {
  status: string;
  latestDecision?: {
    decisionType: string;
    reason?: string | null;
    decidedAt?: Date | string | null;
  } | null;
  isPending: boolean;
  onDecide: (input: { decisionType: "APPROVED" | "REJECTED"; reason?: string }) => Promise<void>;
}) {
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const canDecide = status === "ACCEPTED";

  return (
    <Card>
      <CardHeader>
        <CardTitle>Decision finale</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {latestDecision ? (
          <div className="rounded-xl border bg-muted/20 p-4 text-sm">
            <p><span className="font-medium">Decision:</span> {latestDecision.decisionType}</p>
            <p><span className="font-medium">Date:</span> {latestDecision.decidedAt ? new Date(latestDecision.decidedAt).toLocaleString("fr-FR") : "Non renseignee"}</p>
            {latestDecision.reason ? <p><span className="font-medium">Motif:</span> {latestDecision.reason}</p> : null}
          </div>
        ) : null}

        {!canDecide ? (
          <p className="text-sm text-muted-foreground">
            La decision finale est disponible uniquement quand le dossier est en `ACCEPTED`.
          </p>
        ) : (
          <>
            {error ? (
              <Alert variant="destructive">
                <AlertTitle>Decision impossible</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            ) : null}
            <div className="space-y-2">
              <Label htmlFor="decision-reason">Motif</Label>
              <Textarea id="decision-reason" value={reason} onChange={event => setReason(event.target.value)} placeholder="Obligatoire pour un rejet, optionnel pour une approbation" />
            </div>
            <div className="flex flex-wrap gap-3">
              <Button
                className="bg-emerald-700 hover:bg-emerald-800"
                disabled={isPending}
                onClick={async () => {
                  setError(null);
                  try {
                    await onDecide({ decisionType: "APPROVED", reason: reason.trim() || undefined });
                    setReason("");
                  } catch (decisionError) {
                    setError((decisionError as Error).message || "Erreur inattendue.");
                  }
                }}
              >
                {isPending ? "Validation..." : "Approuver"}
              </Button>
              <Button
                variant="destructive"
                disabled={isPending}
                onClick={async () => {
                  setError(null);
                  if (!reason.trim()) {
                    setError("Un motif est requis pour rejeter le dossier.");
                    return;
                  }
                  try {
                    await onDecide({ decisionType: "REJECTED", reason: reason.trim() });
                    setReason("");
                  } catch (decisionError) {
                    setError((decisionError as Error).message || "Erreur inattendue.");
                  }
                }}
              >
                {isPending ? "Validation..." : "Rejeter"}
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
