import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useState } from "react";

export function BankRequestDocsCard({
  status,
  isPending,
  onSubmit,
}: {
  status: string;
  isPending: boolean;
  onSubmit: (input: { message: string; requestedDocumentTypes: string[] }) => Promise<void>;
}) {
  const [message, setMessage] = useState("");
  const [requestedDocumentTypes, setRequestedDocumentTypes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const canRequest = status === "UNDER_REVIEW";

  return (
    <Card>
      <CardHeader>
        <CardTitle>Demander des complements</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!canRequest ? (
          <p className="text-sm text-muted-foreground">
            Cette action est disponible uniquement quand le dossier est en `UNDER_REVIEW`.
          </p>
        ) : (
          <>
            {error ? (
              <Alert variant="destructive">
                <AlertTitle>Demande impossible</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            ) : null}
            <div className="space-y-2">
              <Label htmlFor="request-message">Message</Label>
              <Textarea
                id="request-message"
                placeholder="Precisez les informations ou pieces complementaires attendues"
                value={message}
                onChange={event => setMessage(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="request-doc-types">Types de documents demandes</Label>
              <Input
                id="request-doc-types"
                placeholder="Ex: PROOF_INCOME, BUILDING_PERMIT"
                value={requestedDocumentTypes}
                onChange={event => setRequestedDocumentTypes(event.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Valeurs separees par des virgules. Laissez vide pour une demande libre.
              </p>
            </div>
            <Button
              className="bg-sky-700 hover:bg-sky-800"
              disabled={isPending}
              onClick={async () => {
                setError(null);
                if (message.trim().length < 3) {
                  setError("Le message de demande doit contenir au moins 3 caracteres.");
                  return;
                }
                const docTypes = requestedDocumentTypes
                  .split(",")
                  .map(value => value.trim())
                  .filter(Boolean);
                try {
                  await onSubmit({ message: message.trim(), requestedDocumentTypes: docTypes });
                  setMessage("");
                  setRequestedDocumentTypes("");
                } catch (submitError) {
                  setError((submitError as Error).message || "Erreur inattendue.");
                }
              }}
            >
              {isPending ? "Envoi..." : "Demander des complements"}
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}
