import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type CreditRequestItem = {
  id: number;
  requestType: string;
  message: string;
  requestedDocumentTypes?: string[] | null;
  status: string;
  createdAt: Date | string;
};

export function CreditRequestsPanel({
  requests,
}: {
  requests: CreditRequestItem[];
}) {
  if (requests.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Demandes de complements</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {requests.map(request => (
          <div key={request.id} className="rounded-xl border bg-muted/20 p-4 text-sm">
            <p className="font-medium">{request.requestType}</p>
            <p className="mt-2">{request.message}</p>
            {request.requestedDocumentTypes?.length ? (
              <p className="mt-2 text-muted-foreground">
                Documents demandes: {request.requestedDocumentTypes.join(", ")}
              </p>
            ) : null}
            <p className="mt-2 text-xs text-muted-foreground">
              Demande du {new Date(request.createdAt).toLocaleString("fr-FR")} - statut: {request.status}
            </p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
