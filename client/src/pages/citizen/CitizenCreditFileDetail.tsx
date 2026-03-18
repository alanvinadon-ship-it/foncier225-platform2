import { CreditDocumentUploader, CreditStatusBadge, CreditSummaryCard, formatCreditProduct } from "@/components/citizen/credit-ui";
import { CreditCompletenessPanel } from "@/components/citizen/CreditCompletenessPanel";
import { CreditDocumentsList } from "@/components/citizen/CreditDocumentsList";
import { CreditSubmissionBanner } from "@/components/citizen/CreditSubmissionBanner";
import { CreditSubmitDialog } from "@/components/citizen/CreditSubmitDialog";
import { CreditTimeline, type CreditTimelineEvent } from "@/components/citizen/CreditTimeline";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { REQUIRED_DOCUMENTS_BY_PRODUCT, CreditProductType } from "@shared/credit-types";
import { trpc } from "@/lib/trpc";
import { AlertCircle, ArrowLeft, Info, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { Link, useParams } from "wouter";

const OPTIONAL_DOCUMENTS_BY_PRODUCT: Record<CreditProductType, string[]> = {
  STANDARD: ["BUILDING_PERMIT", "INSURANCE_QUOTE"],
  SIMPLIFIED: ["PROOF_INCOME", "BUILDING_PERMIT", "INSURANCE_QUOTE"],
};

export default function CitizenCreditFileDetail() {
  const params = useParams<{ id: string }>();
  const creditFileId = Number(params.id ?? "0");
  const utils = trpc.useUtils();
  const [uploadFeedback, setUploadFeedback] = useState<string | null>(null);

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
      setUploadFeedback(null);
      await Promise.all([
        creditFileQuery.refetch(),
        checklistQuery.refetch(),
        documentsQuery.refetch(),
        utils.credit.listMyCreditFiles.invalidate(),
      ]);
    },
  });
  const addDocumentMutation = trpc.credit.addCreditDocument.useMutation({
    onSuccess: async (_result, variables) => {
      setUploadFeedback(`Le document ${variables.documentType} a ete rattache au dossier.`);
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
  const timelineEvents: CreditTimelineEvent[] = [
    {
      id: `created-${file.id}`,
      title: "Dossier cree",
      description: "Le dossier de credit habitat a ete initialise dans votre espace citoyen.",
      at: file.createdAt,
    },
    ...documents
      .filter(document => document.uploadedAt)
      .map(document => ({
        id: `document-${document.id}`,
        title: "Document ajoute",
        description: `${document.documentType} ajoute au dossier.`,
        at: document.uploadedAt,
      })),
    ...(file.submittedAt
      ? [{
          id: `submitted-${file.id}`,
          title: "Dossier soumis",
          description: "Le dossier a ete transmis a la banque pour revue.",
          at: file.submittedAt,
          tone: "success" as const,
        }]
      : []),
  ].sort((left, right) => {
    const leftTime = left.at ? new Date(left.at).getTime() : 0;
    const rightTime = right.at ? new Date(right.at).getTime() : 0;
    return rightTime - leftTime;
  });

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
      </div>

      <CreditSubmissionBanner status={file.status} submittedAt={file.submittedAt} />

      {submitMutation.error ? (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Soumission impossible</AlertTitle>
          <AlertDescription>{submitMutation.error.message}</AlertDescription>
        </Alert>
      ) : null}

      {uploadFeedback ? (
        <Alert className="border-green-200 bg-green-50 text-green-950">
          <ShieldCheck className="h-4 w-4 text-green-700" />
          <AlertTitle>Document ajoute</AlertTitle>
          <AlertDescription>{uploadFeedback}</AlertDescription>
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
        <CreditCompletenessPanel
          checklist={checklist}
          status={file.status}
          requiredDocumentTypes={requiredDocumentTypes}
          optionalDocumentTypes={optionalDocumentTypes}
          uploadedDocumentTypes={uploadedDocumentTypes}
        />

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Aide a la soumission</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-xl border bg-muted/20 p-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-2 font-medium text-foreground">
                  <Info className="h-4 w-4 text-ci-orange" />
                  Conditions de soumission
                </div>
                <p className="mt-2">
                  Avant soumission, tous les documents requis doivent etre presents. Apres soumission, le dossier
                  passe en lecture seule pour preparer la future revue bancaire.
                </p>
              </div>

              {file.status === "SUBMITTED" ? (
                <Alert className="border-blue-200 bg-blue-50 text-blue-950">
                  <ShieldCheck className="h-4 w-4 text-blue-700" />
                  <AlertTitle>Dossier transmis</AlertTitle>
                  <AlertDescription>
                    Les modifications sont verrouillees. Vous pouvez encore consulter les documents deja rattaches.
                  </AlertDescription>
                </Alert>
              ) : (
                <div className="space-y-3">
                  {!canSubmit ? (
                    <p className="text-sm text-muted-foreground">
                      La soumission sera disponible des que les documents requis manquants seront ajoutes.
                    </p>
                  ) : (
                    <CreditSubmitDialog
                      canSubmit={canSubmit}
                      status={file.status}
                      isPending={submitMutation.isPending}
                      missingDocuments={checklist.requiredDocuments.missing}
                      onConfirm={async () => {
                        await submitMutation.mutateAsync({ creditFileId });
                      }}
                    />
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {canUploadDocuments ? (
            <CreditDocumentUploader
              creditFileId={creditFileId}
              mutation={addDocumentMutation}
              existingDocumentTypes={uploadedDocumentTypes}
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
                Le dossier a deja ete soumis. Les modifications sont verrouillees en attente de traitement bancaire.
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <CreditDocumentsList documents={documents} isLocked={!canUploadDocuments} />

      <CreditTimeline events={timelineEvents} />
    </div>
  );
}
