import { CreditDocumentStatusBadge, formatCreditDocumentType } from "@/components/citizen/credit-ui";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ExternalLink, FileText, FolderSearch } from "lucide-react";

type CreditDocumentItem = {
  id: number;
  documentType: string;
  status: string;
  fileUrl?: string | null;
  fileKey?: string | null;
  mimeType?: string | null;
  fileSize?: number | null;
  uploadedAt?: Date | string | null;
  rejectionReason?: string | null;
};

function deriveFileLabel(document: CreditDocumentItem) {
  if (document.fileKey) {
    return document.fileKey.split("/").pop() ?? document.fileKey;
  }
  if (document.fileUrl) {
    try {
      const url = new URL(document.fileUrl);
      return decodeURIComponent(url.pathname.split("/").pop() ?? "document");
    } catch {
      return "document";
    }
  }
  return "document";
}

export function CreditDocumentsList({
  documents,
  isLocked,
}: {
  documents: CreditDocumentItem[];
  isLocked: boolean;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-ci-orange" />
          Documents rattaches
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-xl border bg-muted/20 p-4 text-sm text-muted-foreground">
          Un seul document est conserve par type dans ce parcours. Un nouvel import remplace la version precedente.
          {isLocked ? " Le dossier est actuellement en lecture seule." : ""}
        </div>

        {documents.length === 0 ? (
          <div className="rounded-xl border border-dashed p-8 text-center">
            <FolderSearch className="mx-auto mb-3 h-10 w-10 text-muted-foreground/30" />
            <h2 className="font-semibold">Aucune piece pour le moment</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Ajoutez vos premiers documents pour alimenter la checklist et preparer la soumission.
            </p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-muted/30">
                  <th className="p-4 text-left text-sm font-medium text-muted-foreground">Type</th>
                  <th className="p-4 text-left text-sm font-medium text-muted-foreground">Fichier</th>
                  <th className="p-4 text-left text-sm font-medium text-muted-foreground">Statut</th>
                  <th className="p-4 text-left text-sm font-medium text-muted-foreground">Ajoute le</th>
                  <th className="p-4 text-left text-sm font-medium text-muted-foreground">Action</th>
                </tr>
              </thead>
              <tbody>
                {documents.map(document => (
                  <tr key={document.id} className="border-b last:border-b-0">
                    <td className="p-4 text-sm font-medium">{formatCreditDocumentType(document.documentType)}</td>
                    <td className="p-4 text-sm text-muted-foreground">{deriveFileLabel(document)}</td>
                    <td className="p-4">
                      <div className="space-y-2">
                        <CreditDocumentStatusBadge status={document.status} />
                        {document.rejectionReason ? (
                          <p className="max-w-xs text-xs text-rose-700">{document.rejectionReason}</p>
                        ) : null}
                      </div>
                    </td>
                    <td className="p-4 text-sm text-muted-foreground">
                      {document.uploadedAt ? new Date(document.uploadedAt).toLocaleDateString("fr-FR") : "Non renseigne"}
                    </td>
                    <td className="p-4">
                      {document.fileUrl ? (
                        <a
                          className="inline-flex items-center gap-1 text-sm text-ci-orange hover:underline"
                          href={document.fileUrl}
                          rel="noreferrer"
                          target="_blank"
                        >
                          <ExternalLink className="h-4 w-4" />
                          Consulter
                        </a>
                      ) : (
                        <span className="text-sm text-muted-foreground">Indisponible</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
