import { CreditStatusBadge, formatCreditProduct } from "@/components/citizen/credit-ui";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { Banknote, FolderOpen, PlusCircle } from "lucide-react";
import { Link } from "wouter";

export default function CitizenCreditFiles() {
  const { data, isLoading, error } = trpc.credit.listMyCreditFiles.useQuery({
    limit: 50,
    offset: 0,
  });

  const isFeatureDisabled = (error as { data?: { code?: string } } | null)?.data?.code === "FORBIDDEN";

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
            <Banknote className="h-6 w-6 text-ci-orange" />
            Credit habitat
          </h1>
          <p className="mt-1 text-muted-foreground">
            Lancez un dossier, suivez sa progression documentaire et preparez sa soumission.
          </p>
        </div>
        {!isFeatureDisabled ? (
          <Button asChild className="bg-ci-orange hover:bg-ci-orange/90">
            <Link href="/citizen/credit-habitat/new">
              <PlusCircle className="h-4 w-4" />
              Nouveau dossier
            </Link>
          </Button>
        ) : null}
      </div>

      {isFeatureDisabled ? (
        <Alert>
          <FolderOpen className="h-4 w-4" />
          <AlertTitle>Module indisponible</AlertTitle>
          <AlertDescription>
            Le parcours Credit habitat n&apos;est pas encore active pour cet environnement.
          </AlertDescription>
        </Alert>
      ) : null}

      {isLoading ? (
        <Card>
          <CardContent className="px-6 py-10 text-center text-muted-foreground">
            Chargement de vos dossiers de credit...
          </CardContent>
        </Card>
      ) : error && !isFeatureDisabled ? (
        <Alert variant="destructive">
          <FolderOpen className="h-4 w-4" />
          <AlertTitle>Chargement impossible</AlertTitle>
          <AlertDescription>
            Une erreur est survenue lors de la recuperation de vos dossiers de credit.
          </AlertDescription>
        </Alert>
      ) : !data || data.length === 0 ? (
        <Card>
          <CardContent className="px-6 py-12 text-center">
            <FolderOpen className="mx-auto mb-4 h-12 w-12 text-muted-foreground/30" />
            <h2 className="text-lg font-semibold">Aucun dossier de credit</h2>
            <p className="mx-auto mt-2 max-w-xl text-sm text-muted-foreground">
              Creez votre premier dossier pour commencer a rassembler les pieces requises.
            </p>
            <Button asChild className="mt-5 bg-ci-orange hover:bg-ci-orange/90">
              <Link href="/citizen/credit-habitat/new">
                <PlusCircle className="h-4 w-4" />
                Demarrer un dossier
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {data.map(file => (
            <Link key={file.id} href={`/citizen/credit-habitat/${file.id}`}>
              <Card className="cursor-pointer gap-4 py-5 transition-colors hover:border-ci-orange/40 hover:bg-accent/20">
                <CardContent className="grid gap-4 px-5 sm:grid-cols-[1.4fr_1fr_auto] sm:items-center">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-3">
                      <h2 className="text-base font-semibold">{file.publicRef ?? `Dossier #${file.id}`}</h2>
                      <CreditStatusBadge status={file.status} />
                    </div>
                    <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-muted-foreground">
                      <span>{formatCreditProduct(file.productType)}</span>
                      <span>{file.amountRequestedXof ? `${file.amountRequestedXof.toLocaleString("fr-FR")} XOF` : "Montant non renseigne"}</span>
                      <span>{file.durationMonths ? `${file.durationMonths} mois` : "Duree non renseignee"}</span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Pieces requises</p>
                    <p className="text-sm font-medium">
                      {file.progress.requiredUploaded}/{file.progress.requiredTotal}
                    </p>
                    <div className="h-2 rounded-full bg-muted">
                      <div
                        className="h-2 rounded-full bg-ci-orange transition-all"
                        style={{ width: `${file.progress.completionPercentage}%` }}
                      />
                    </div>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Cree le {new Date(file.createdAt).toLocaleDateString("fr-FR")}
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
