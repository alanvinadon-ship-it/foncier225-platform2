import { CreditStatusBadge, formatCreditProduct } from "@/components/citizen/credit-ui";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";

type QueueItem = {
  id: number;
  publicRef?: string | null;
  productType: string;
  status: string;
  amountRequestedXof?: number | null;
  durationMonths?: number | null;
  submittedAt?: Date | string | null;
  parcelReference?: string | null;
  progress: {
    requiredUploaded: number;
    requiredTotal: number;
    completionPercentage: number;
  };
};

export function BankCreditQueueTable({
  files,
}: {
  files: QueueItem[];
}) {
  if (files.length === 0) {
    return (
      <Card>
        <CardContent className="px-6 py-10 text-center text-muted-foreground">
          Aucun dossier ne correspond aux filtres actuels.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border bg-card">
      <table className="w-full">
        <thead>
          <tr className="border-b bg-muted/30">
            <th className="p-4 text-left text-sm font-medium text-muted-foreground">Reference</th>
            <th className="p-4 text-left text-sm font-medium text-muted-foreground">Produit</th>
            <th className="p-4 text-left text-sm font-medium text-muted-foreground">Montant</th>
            <th className="p-4 text-left text-sm font-medium text-muted-foreground">Statut</th>
            <th className="p-4 text-left text-sm font-medium text-muted-foreground">Parcelle</th>
            <th className="p-4 text-left text-sm font-medium text-muted-foreground">Progression</th>
            <th className="p-4 text-left text-sm font-medium text-muted-foreground">Soumis le</th>
            <th className="p-4 text-left text-sm font-medium text-muted-foreground">Action</th>
          </tr>
        </thead>
        <tbody>
          {files.map(file => (
            <tr key={file.id} className="border-b last:border-b-0">
              <td className="p-4 text-sm font-medium">{file.publicRef ?? `Dossier #${file.id}`}</td>
              <td className="p-4 text-sm text-muted-foreground">{formatCreditProduct(file.productType)}</td>
              <td className="p-4 text-sm text-muted-foreground">
                {file.amountRequestedXof ? `${file.amountRequestedXof.toLocaleString("fr-FR")} XOF` : "Non renseigne"}
                <div>{file.durationMonths ? `${file.durationMonths} mois` : "Duree non renseignee"}</div>
              </td>
              <td className="p-4">
                <CreditStatusBadge status={file.status} />
              </td>
              <td className="p-4 text-sm text-muted-foreground">{file.parcelReference ?? "Aucune parcelle"}</td>
              <td className="p-4 text-sm">
                <div className="font-medium">
                  {file.progress.requiredUploaded}/{file.progress.requiredTotal}
                </div>
                <div className="mt-2 h-2 rounded-full bg-muted">
                  <div
                    className="h-2 rounded-full bg-sky-700 transition-all"
                    style={{ width: `${file.progress.completionPercentage}%` }}
                  />
                </div>
              </td>
              <td className="p-4 text-sm text-muted-foreground">
                {file.submittedAt ? new Date(file.submittedAt).toLocaleDateString("fr-FR") : "Non soumis"}
              </td>
              <td className="p-4">
                <Button asChild size="sm" variant="outline">
                  <Link href={`/bank/credit-files/${file.id}`}>Ouvrir</Link>
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
