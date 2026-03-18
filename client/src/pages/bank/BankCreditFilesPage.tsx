import { BankCreditQueueTable } from "@/components/bank/BankCreditQueueTable";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { Building2, Filter } from "lucide-react";
import { useState } from "react";

type BankQueueStatus = "SUBMITTED" | "UNDER_REVIEW" | "DOCS_PENDING" | "OFFERED" | "ACCEPTED" | "APPROVED" | "REJECTED";

export default function BankCreditFilesPage() {
  const [statuses, setStatuses] = useState<BankQueueStatus[]>(["SUBMITTED"]);
  const { data, isLoading, error } = trpc.bankCredit.listBankCreditFiles.useQuery({
    statuses,
    limit: 50,
    offset: 0,
  });

  const isFeatureDisabled = (error as { data?: { code?: string } } | null)?.data?.code === "FORBIDDEN";

  const toggleStatus = (status: BankQueueStatus) => {
    setStatuses(current => {
      if (current.includes(status)) {
        const next = current.filter(item => item !== status);
        return next.length > 0 ? next : [status];
      }
      return [...current, status];
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
            <Building2 className="h-6 w-6 text-sky-700" />
            Work queue credit habitat
          </h1>
          <p className="mt-1 text-muted-foreground">
            Consultez les dossiers soumis et prenez en charge la revue bancaire initiale.
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <Filter className="h-4 w-4" />
          Filtres
        </span>
        <Button
          className={statuses.includes("SUBMITTED") ? "bg-sky-700 hover:bg-sky-800" : ""}
          onClick={() => toggleStatus("SUBMITTED")}
          size="sm"
          variant={statuses.includes("SUBMITTED") ? "default" : "outline"}
        >
          SUBMITTED
        </Button>
        <Button
          className={statuses.includes("UNDER_REVIEW") ? "bg-sky-700 hover:bg-sky-800" : ""}
          onClick={() => toggleStatus("UNDER_REVIEW")}
          size="sm"
          variant={statuses.includes("UNDER_REVIEW") ? "default" : "outline"}
        >
          UNDER_REVIEW
        </Button>
        <Button
          className={statuses.includes("DOCS_PENDING") ? "bg-sky-700 hover:bg-sky-800" : ""}
          onClick={() => toggleStatus("DOCS_PENDING")}
          size="sm"
          variant={statuses.includes("DOCS_PENDING") ? "default" : "outline"}
        >
          DOCS_PENDING
        </Button>
        <Button
          className={statuses.includes("OFFERED") ? "bg-sky-700 hover:bg-sky-800" : ""}
          onClick={() => toggleStatus("OFFERED")}
          size="sm"
          variant={statuses.includes("OFFERED") ? "default" : "outline"}
        >
          OFFERED
        </Button>
        <Button
          className={statuses.includes("ACCEPTED") ? "bg-sky-700 hover:bg-sky-800" : ""}
          onClick={() => toggleStatus("ACCEPTED")}
          size="sm"
          variant={statuses.includes("ACCEPTED") ? "default" : "outline"}
        >
          ACCEPTED
        </Button>
        <Button
          className={statuses.includes("APPROVED") ? "bg-sky-700 hover:bg-sky-800" : ""}
          onClick={() => toggleStatus("APPROVED")}
          size="sm"
          variant={statuses.includes("APPROVED") ? "default" : "outline"}
        >
          APPROVED
        </Button>
        <Button
          className={statuses.includes("REJECTED") ? "bg-sky-700 hover:bg-sky-800" : ""}
          onClick={() => toggleStatus("REJECTED")}
          size="sm"
          variant={statuses.includes("REJECTED") ? "default" : "outline"}
        >
          REJECTED
        </Button>
      </div>

      {isFeatureDisabled ? (
        <Alert>
          <AlertTitle>Module indisponible</AlertTitle>
          <AlertDescription>
            Le module credit habitat n&apos;est pas active pour cet environnement.
          </AlertDescription>
        </Alert>
      ) : null}

      {isLoading ? (
        <Alert>
          <AlertTitle>Chargement</AlertTitle>
          <AlertDescription>Chargement de la file de travail bancaire...</AlertDescription>
        </Alert>
      ) : error && !isFeatureDisabled ? (
        <Alert variant="destructive">
          <AlertTitle>Chargement impossible</AlertTitle>
          <AlertDescription>Une erreur est survenue lors du chargement des dossiers banque.</AlertDescription>
        </Alert>
      ) : (
        <BankCreditQueueTable files={data ?? []} />
      )}
    </div>
  );
}
