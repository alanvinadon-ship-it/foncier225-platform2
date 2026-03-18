import { CreditCompletenessPanel } from "@/components/citizen/CreditCompletenessPanel";
import { CreditRequestsPanel } from "@/components/citizen/CreditRequestsPanel";
import { CreditTimeline, type CreditTimelineEvent } from "@/components/citizen/CreditTimeline";
import { BankCreditDocumentsPanel } from "@/components/bank/BankCreditDocumentsPanel";
import { BankCreditFileSummary } from "@/components/bank/BankCreditFileSummary";
import { BankDecisionCard } from "@/components/bank/BankDecisionCard";
import { BankFinalAttestationCard } from "@/components/bank/BankFinalAttestationCard";
import { BankOfferCard } from "@/components/bank/BankOfferCard";
import { BankRequestDocsCard } from "@/components/bank/BankRequestDocsCard";
import { BankReviewActionCard } from "@/components/bank/BankReviewActionCard";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { REQUIRED_DOCUMENTS_BY_PRODUCT, type CreditDocumentType, type CreditProductType } from "@shared/credit-types";
import { trpc } from "@/lib/trpc";
import { AlertCircle, ArrowLeft, UserRound } from "lucide-react";
import { Link, useParams } from "wouter";

const OPTIONAL_DOCUMENTS_BY_PRODUCT: Record<CreditProductType, string[]> = {
  STANDARD: ["BUILDING_PERMIT", "INSURANCE_QUOTE"],
  SIMPLIFIED: ["PROOF_INCOME", "BUILDING_PERMIT", "INSURANCE_QUOTE"],
};

export default function BankCreditFileDetailPage() {
  const params = useParams<{ id: string }>();
  const creditFileId = Number(params.id ?? "0");
  const utils = trpc.useUtils();

  const detailQuery = trpc.bankCredit.getBankCreditFile.useQuery(
    { creditFileId },
    { enabled: creditFileId > 0 }
  );
  const reviewMutation = trpc.bankCredit.reviewBankCreditFile.useMutation({
    onSuccess: async () => {
      await Promise.all([
        detailQuery.refetch(),
        utils.bankCredit.listBankCreditFiles.invalidate(),
      ]);
    },
  });
  const requestDocsMutation = trpc.bankCredit.requestDocsForCreditFile.useMutation({
    onSuccess: async () => {
      await Promise.all([detailQuery.refetch(), utils.bankCredit.listBankCreditFiles.invalidate()]);
    },
  });
  const makeOfferMutation = trpc.bankCredit.makeCreditOffer.useMutation({
    onSuccess: async () => {
      await Promise.all([detailQuery.refetch(), utils.bankCredit.listBankCreditFiles.invalidate()]);
    },
  });
  const decideMutation = trpc.bankCredit.decideCreditFile.useMutation({
    onSuccess: async () => {
      await Promise.all([detailQuery.refetch(), utils.bankCredit.listBankCreditFiles.invalidate()]);
    },
  });
  const issueAttestationMutation = trpc.bankCredit.issueFinalCreditAttestation.useMutation({
    onSuccess: async () => {
      await Promise.all([detailQuery.refetch(), utils.bankCredit.listBankCreditFiles.invalidate()]);
    },
  });

  const file = detailQuery.data;
  const isFeatureDisabled = (detailQuery.error as { data?: { code?: string } } | null)?.data?.code === "FORBIDDEN";

  if (detailQuery.isLoading) {
    return (
      <Alert>
        <AlertTitle>Chargement</AlertTitle>
        <AlertDescription>Chargement du dossier banque...</AlertDescription>
      </Alert>
    );
  }

  if (!file) {
    return (
      <div className="space-y-6">
        <Link href="/bank/credit-files" className="flex items-center gap-1 text-sm text-sky-700 hover:underline">
          <ArrowLeft className="h-4 w-4" />
          Retour a la work queue
        </Link>
        <Alert variant={isFeatureDisabled ? "default" : "destructive"}>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>{isFeatureDisabled ? "Module indisponible" : "Dossier introuvable"}</AlertTitle>
          <AlertDescription>
            {isFeatureDisabled
              ? "Le module credit habitat est desactive pour cet environnement."
              : "Ce dossier n'est pas disponible pour le portail banque."}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const productType = file.productType as CreditProductType;
  const requiredDocumentTypes = REQUIRED_DOCUMENTS_BY_PRODUCT[productType];
  const optionalDocumentTypes = OPTIONAL_DOCUMENTS_BY_PRODUCT[productType];
  const uploadedDocumentTypes = file.documents.map(document => document.documentType);
  const timelineEvents: CreditTimelineEvent[] = [
    {
      id: `created-${file.id}`,
      title: "Dossier cree",
      description: "Le dossier a ete initialise par le citoyen.",
      at: file.createdAt,
    },
    ...file.documents
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
          description: "Le dossier est entre dans la work queue banque.",
          at: file.submittedAt,
        }]
      : []),
    ...(file.status === "UNDER_REVIEW"
      ? [{
          id: `review-${file.id}`,
          title: "Dossier pris en revue",
          description: "La revue bancaire a ete demarree.",
          at: file.lastTransitionAt ?? file.submittedAt ?? file.createdAt,
          tone: "success" as const,
        }]
      : []),
    ...(file.finalAttestation
      ? [{
          id: `attestation-${file.finalAttestation.id}`,
          title: "Attestation finale emise",
          description: `Document ${file.finalAttestation.documentRef ?? "final"} disponible.`,
          at: file.finalAttestation.issuedAt ?? file.lastTransitionAt ?? file.createdAt,
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
      <Link href="/bank/credit-files" className="flex items-center gap-1 text-sm text-sky-700 hover:underline">
        <ArrowLeft className="h-4 w-4" />
        Retour a la work queue
      </Link>

      <BankCreditFileSummary file={file} />

      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="space-y-6">
          <CreditCompletenessPanel
            checklist={file.checklist}
            status={file.status}
            requiredDocumentTypes={requiredDocumentTypes}
            optionalDocumentTypes={optionalDocumentTypes}
            uploadedDocumentTypes={uploadedDocumentTypes}
          />
          <CreditRequestsPanel requests={file.requests} />
          <BankCreditDocumentsPanel documents={file.documents} />
          <CreditTimeline events={timelineEvents} />
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserRound className="h-4 w-4 text-sky-700" />
                Demandeur
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p><span className="font-medium">Nom:</span> {file.applicant?.name ?? "Non renseigne"}</p>
              <p><span className="font-medium">Email:</span> {file.applicant?.email ?? "Non renseigne"}</p>
              <p className="text-muted-foreground">
                Affichage limite aux informations actuellement disponibles dans le modele, en attendant le cadrage complet du consentement.
              </p>
            </CardContent>
          </Card>

          <BankReviewActionCard
            status={file.status}
            isPending={reviewMutation.isPending}
            errorMessage={reviewMutation.error?.message ?? null}
            onConfirm={async () => {
              await reviewMutation.mutateAsync({ creditFileId });
            }}
          />
          <BankRequestDocsCard
            status={file.status}
            isPending={requestDocsMutation.isPending}
            onSubmit={async input => {
              await requestDocsMutation.mutateAsync({
                creditFileId,
                requestType: "DOCUMENT_REQUEST",
                message: input.message,
                requestedDocumentTypes: input.requestedDocumentTypes as CreditDocumentType[],
              });
            }}
          />
          <BankOfferCard
            status={file.status}
            currentOffer={file.latestOffer}
            isPending={makeOfferMutation.isPending}
            onSubmit={async input => {
              await makeOfferMutation.mutateAsync({
                creditFileId,
                apr: input.apr,
                monthlyPaymentXof: input.monthlyPaymentXof,
                conditionsText: input.conditionsText,
                expiresAt: input.expiresAt,
              });
            }}
          />
          <BankDecisionCard
            status={file.status}
            latestDecision={file.latestDecision}
            isPending={decideMutation.isPending}
            onDecide={async input => {
              await decideMutation.mutateAsync({
                creditFileId,
                decisionType: input.decisionType,
                reason: input.reason,
              });
            }}
          />
          <BankFinalAttestationCard
            status={file.status}
            finalAttestation={file.finalAttestation}
            isPending={issueAttestationMutation.isPending}
            onIssue={async () => {
              await issueAttestationMutation.mutateAsync({ creditFileId });
            }}
          />
        </div>
      </div>
    </div>
  );
}
