import { CreditStatusBadge, CreditSummaryCard, formatCreditProduct } from "@/components/citizen/credit-ui";

export function BankCreditFileSummary({
  file,
}: {
  file: {
    publicRef?: string | null;
    status: string;
    productType: string;
    amountRequestedXof?: number | null;
    durationMonths?: number | null;
    parcelReference?: string | null;
    createdAt: Date | string;
    submittedAt?: Date | string | null;
  };
}) {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-bold tracking-tight">{file.publicRef ?? "Dossier credit"}</h1>
        <CreditStatusBadge status={file.status} />
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <CreditSummaryCard title="Produit" value={formatCreditProduct(file.productType)} />
        <CreditSummaryCard
          title="Montant"
          value={file.amountRequestedXof ? `${file.amountRequestedXof.toLocaleString("fr-FR")} XOF` : "Non renseigne"}
        />
        <CreditSummaryCard
          title="Duree"
          value={file.durationMonths ? `${file.durationMonths} mois` : "Non renseignee"}
        />
        <CreditSummaryCard title="Parcelle" value={file.parcelReference ?? "Aucune parcelle"} />
        <CreditSummaryCard
          title="Dates"
          value={new Date(file.createdAt).toLocaleDateString("fr-FR")}
          helper={file.submittedAt ? `Soumis le ${new Date(file.submittedAt).toLocaleDateString("fr-FR")}` : null}
        />
      </div>
    </div>
  );
}
