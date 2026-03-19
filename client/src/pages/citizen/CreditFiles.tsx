import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { trpc } from "@/lib/trpc";
import {
  CREDIT_FILE_STATUS_LABELS,
  CREDIT_PRODUCT_TYPE_LABELS,
  CreditFileStatus,
} from "@shared/credit-types";
import { FileText, Plus, ArrowRight, AlertTriangle } from "lucide-react";
import { useLocation } from "wouter";

const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  DRAFT: "outline",
  DOCS_PENDING: "secondary",
  SUBMITTED: "default",
  UNDER_REVIEW: "default",
  OFFERED: "default",
  ACCEPTED: "default",
  APPROVED: "default",
  REJECTED: "destructive",
  CLOSED: "secondary",
};

function formatAmount(amount: number | null): string {
  if (!amount) return "—";
  return new Intl.NumberFormat("fr-FR").format(amount) + " XOF";
}

function formatDate(date: Date | string | null): string {
  if (!date) return "—";
  return new Date(date).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default function CreditFiles() {
  const [, setLocation] = useLocation();
  const { data: files, isLoading, error } = trpc.credit.listMyCreditFiles.useQuery({
    limit: 50,
    offset: 0,
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Crédit Habitat</h1>
            <p className="text-muted-foreground mt-1">Gérez vos dossiers de crédit habitat</p>
          </div>
        </div>
        <div className="flex items-center justify-center py-20">
          <div className="animate-pulse text-muted-foreground">Chargement...</div>
        </div>
      </div>
    );
  }

  if (error) {
    // Feature flag disabled or other error
    const isFlagDisabled = error.message?.includes("n'est pas encore activé");
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Crédit Habitat</h1>
          <p className="text-muted-foreground mt-1">Gérez vos dossiers de crédit habitat</p>
        </div>
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <AlertTriangle className="h-12 w-12 text-muted-foreground" />
          <p className="text-muted-foreground text-center max-w-md">
            {isFlagDisabled
              ? "Le module Crédit Habitat n'est pas encore disponible. Il sera activé prochainement."
              : "Une erreur est survenue lors du chargement de vos dossiers."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Crédit Habitat</h1>
          <p className="text-muted-foreground mt-1">
            {files && files.length > 0
              ? `${files.length} dossier(s) de crédit`
              : "Gérez vos dossiers de crédit habitat"}
          </p>
        </div>
        <Button
          onClick={() => setLocation("/citizen/credit/new")}
          className="bg-ci-orange hover:bg-ci-orange/90"
        >
          <Plus className="h-4 w-4 mr-2" />
          Nouveau dossier
        </Button>
      </div>

      {!files || files.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4 border rounded-lg bg-muted/20">
          <FileText className="h-16 w-16 text-muted-foreground/50" />
          <div className="text-center">
            <h3 className="font-semibold text-lg">Aucun dossier de crédit</h3>
            <p className="text-muted-foreground mt-1 max-w-sm">
              Commencez par créer votre premier dossier de crédit habitat pour financer l'achat de votre parcelle.
            </p>
          </div>
          <Button
            onClick={() => setLocation("/citizen/credit/new")}
            className="bg-ci-orange hover:bg-ci-orange/90 mt-2"
          >
            <Plus className="h-4 w-4 mr-2" />
            Créer mon premier dossier
          </Button>
        </div>
      ) : (
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Référence</TableHead>
                <TableHead>Produit</TableHead>
                <TableHead className="text-right">Montant</TableHead>
                <TableHead className="text-center">Durée</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Créé le</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {files.map((f) => (
                <TableRow
                  key={f.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => setLocation(`/citizen/credit/${f.id}`)}
                >
                  <TableCell className="font-mono text-sm font-medium">
                    {f.publicRef || `#${f.id}`}
                  </TableCell>
                  <TableCell>
                    {CREDIT_PRODUCT_TYPE_LABELS[f.productType as keyof typeof CREDIT_PRODUCT_TYPE_LABELS] || f.productType}
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {formatAmount(f.amountRequestedXof)}
                  </TableCell>
                  <TableCell className="text-center">
                    {f.durationMonths ? `${f.durationMonths} mois` : "—"}
                  </TableCell>
                  <TableCell>
                    <Badge variant={STATUS_VARIANT[f.status] || "outline"}>
                      {CREDIT_FILE_STATUS_LABELS[f.status as CreditFileStatus] || f.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDate(f.createdAt)}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm">
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
