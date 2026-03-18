import { CreditChecklist, CreditDocumentStatusBadge, CreditDocumentUploader, CreditStatusBadge, CreditSummaryCard, formatCreditDocumentType, formatCreditProduct } from "@/components/citizen/credit-ui";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { REQUIRED_DOCUMENTS_BY_PRODUCT, CreditProductType } from "@shared/credit-types";
import { trpc } from "@/lib/trpc";
import { AlertCircle, ArrowLeft, ExternalLink, FileText, FolderSearch, Send } from "lucide-react";
import { Link, useParams } from "wouter";

const OPTIONAL_DOCUMENTS_BY_PRODUCT: Record<CreditProductType, string[]> = {
  STANDARD: ["BUILDING_PERMIT", "INSURANCE_QUOTE"],
  SIMPLIFIED: ["PROOF_INCOME", "BUILDING_PERMIT", "INSURANCE_QUOTE"],
};

export default function CitizenCreditFileDetail() {
  const params = useParams<{ id: string }>();
  const creditFileId = Number(params.id ?? "0");
  const utils = trpc.useUtils();

  const creditFileQuery = trpc.credit.getMyCreditFile.useQuery(
    { creditFileId },
    { enabled: creditFileId > 0 }
  );
  const checklistQuery = trpc.credit.getCreditFileChecklist.useQuery(
    { creditFileId },
    { enabled: creditFileId > 0 }
  );
  const documentsQuery = trpc.credit.listCreditFileDocuments.useQuery(
    { creditFileId },
    { enabled: creditFileId > 0 }
  );
  const submitMutation = trpc.credit.submitCreditFile.useMutation({
    onSuccess: async () => {
      await Promise.all([
        creditFileQuery.refetch(),
        checklistQuery.refetch(),
        documentsQuery.refetch(),
      ]);
    },
  });
  const addDocumentMutation = trpc.credit.addCreditDocument.useMutation({
    onSuccess: async () => {
      await Promise.all([
        creditFileQuery.refetch(),
        checklistQuery.refetch(),
        documentsQuery.refetch(),
        utils.credit.listMyCreditFiles.invalidate(),
      ]);
    },
  });

  const isLoading = creditFileQuery.isLoading || checklistQuery.isLoading || documentsQuery.isLoading;
  const file = creditFileQuery.data;
  const checklist = checklistQuery.data;
  const documents = documentsQuery.data ?? [];
  const uploadedDocumentTypes = documents.map(document => document.documentType);
  const isFeatureDisabled =
    (creditFileQuery.error as { data?: { code?: string } } | null)?.data?.code === "FORBIDDEN" ||
    (checklistQuery.error as { data?: { code?: string } } | null)?.data?.code === "FORBIDDEN";

  if (isLoading) {
    return (
      <Card>
        <CardContent className="px-6 py-10 text-center text-muted-foreground">
          Chargement du dossier de credit...
        </CardContent>
      </Card>
    );
  }

  if (!file || !checklist) {
    return (
      <div className="space-y-6">
        <Link href="/citizen/credit-habitat" className="flex items-center gap-1 text-sm text-ci-orange hover:underline">
          <ArrowLeft className="h-4 w-4" />
          Retour aux dossiers
        </Link>
        <Alert variant={isFeatureDisabled ? "default" : "destructive"}>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>{isFeatureDisabled ? "Module indisponible" : "Dossier introuvable"}</AlertTitle>
          <AlertDescription>
            {isFeatureDisabled
              ? "Le parcours Credit habitat n'est pas encore active pour cet environnement."
              : "Ce dossier n'existe pas ou n'est pas associe a votre compte."}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const productType = file.productType as CreditProductType;
  const requiredDocumentTypes = REQUIRED_DOCUMENTS_BY_PRODUCT[productType];
  const optionalDocumentTypes = OPTIONAL_DOCUMENTS_BY_PRODUCT[productType];
  const canSubmit = checklist.isComplete && (file.status === "DRAFT" || file.status === "DOCS_PENDING");
  const canUploadDocuments = file.status === "DRAFT" || file.status === "DOCS_PENDING";

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Link href="/citizen/credit-habitat" className="mb-3 flex items-center gap-1 text-sm text-ci-orange hover:underline">
            <ArrowLeft className="h-4 w-4" />
            Retour aux dossiers
          </Link>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight">{file.publicRef ?? `Dossier #${file.id}`}</h1>
            <CreditStatusBadge status={file.status} />
          </div>
          <p className="mt-1 text-muted-foreground">
            Suivez l&apos;avancement de votre dossier et rattachez vos pieces justificatives.
          </p>
        </div>

        {canSubmit ? (
          <Button
            className="bg-ci-orange hover:bg-ci-orange/90"
            disabled={submitMutation.isPending}
            onClick={() => submitMutation.mutate({ creditFileId })}
          >
            <Send className="h-4 w-4" />
            {submitMutation.isPending ? "Soumission..." : "Soumettre le dossier"}
          </Button>
        ) : null}
      </div>

      {submitMutation.error ? (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Soumission impossible</AlertTitle>
          <AlertDescription>{submitMutation.error.message}</AlertDescription>
        </Alert>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <CreditSummaryCard title="Produit" value={formatCreditProduct(file.productType)} />
        <CreditSummaryCard title="Montant" value={file.amountRequestedXof ? `${file.amountRequestedXof.toLocaleString("fr-FR")} XOF` : "Non renseigne"} />
        <CreditSummaryCard title="Duree" value={file.durationMonths ? `${file.durationMonths} mois` : "Non renseignee"} />
        <CreditSummaryCard title="Parcelle" value={file.parcelReference ?? "Aucune parcelle"} helper={file.parcelId ? `ID parcelle: ${file.parcelId}` : null} />
        <CreditSummaryCard title="Creation" value={new Date(file.createdAt).toLocaleDateString("fr-FR")} helper={file.submittedAt ? `Soumis le ${new Date(file.submittedAt).toLocaleDateString("fr-FR")}` : null} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <CreditChecklist
          checklist={checklist}
          requiredDocumentTypes={requiredDocumentTypes}
          optionalDocumentTypes={optionalDocumentTypes}
          uploadedDocumentTypes={uploadedDocumentTypes}
        />

        {canUploadDocuments ? (
          <CreditDocumentUploader
            creditFileId={creditFileId}
            mutation={addDocumentMutation}
            onUploaded={async () => {
              await Promise.all([
                creditFileQuery.refetch(),
                checklistQuery.refetch(),
                documentsQuery.refetch(),
              ]);
            }}
          />
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Ajout de pieces verrouille</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Ce dossier est dans un statut qui ne permet plus l&apos;ajout de nouvelles pieces justificatives.
            </CardContent>
          </Card>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-ci-orange" />
            Documents deja rattaches
          </CardTitle>
        </CardHeader>
        <CardContent>
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
                    <th className="p-4 text-left text-sm font-medium text-muted-foreground">Statut</th>
                    <th className="p-4 text-left text-sm font-medium text-muted-foreground">Ajoute le</th>
                    <th className="p-4 text-left text-sm font-medium text-muted-foreground">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {documents.map(document => (
                    <tr key={document.id} className="border-b last:border-b-0">
                      <td className="p-4 text-sm font-medium">{formatCreditDocumentType(document.documentType)}</td>
                      <td className="p-4">
                        <CreditDocumentStatusBadge status={document.status} />
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
                            Ouvrir
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
    </div>
  );
}
