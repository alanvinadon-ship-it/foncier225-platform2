import { CreditDocumentStatusBadge, formatCreditDocumentType } from "@/components/citizen/credit-ui";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ExternalLink, FileText } from "lucide-react";

type BankDocument = {
  id: number;
  documentType: string;
  status: string;
  fileUrl?: string | null;
  fileKey?: string | null;
  uploadedAt?: Date | string | null;
  rejectionReason?: string | null;
};

function getFileLabel(document: BankDocument) {
  if (document.fileKey) return document.fileKey.split("/").pop() ?? document.fileKey;
  return "document";
}

export function BankCreditDocumentsPanel({
  documents,
}: {
  documents: BankDocument[];
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-sky-700" />
          Pieces du dossier
        </CardTitle>
      </CardHeader>
      <CardContent>
        {documents.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucun document rattache a ce dossier.</p>
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
                    <td className="p-4 text-sm text-muted-foreground">{getFileLabel(document)}</td>
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
                          className="inline-flex items-center gap-1 text-sm text-sky-700 hover:underline"
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
