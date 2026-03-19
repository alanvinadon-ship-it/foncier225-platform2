import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { CREDIT_PRODUCT_TYPE_LABELS, CreditProductType } from "@shared/credit-types";
import { ArrowLeft, Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useLocation } from "wouter";

export default function CreditFileCreate() {
  const [, setLocation] = useLocation();
  const [productType, setProductType] = useState<string>("");
  const [amountStr, setAmountStr] = useState("");
  const [durationStr, setDurationStr] = useState("");

  const createMutation = trpc.credit.createCreditFile.useMutation({
    onSuccess: (data) => {
      toast.success("Dossier créé avec succès", {
        description: `Référence : ${data.publicRef}`,
      });
      setLocation(`/citizen/credit/${data.creditFileId}`);
    },
    onError: (err) => {
      toast.error("Erreur lors de la création", {
        description: err.message,
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!productType) {
      toast.error("Veuillez sélectionner un type de produit");
      return;
    }

    const amount = amountStr ? parseInt(amountStr, 10) : undefined;
    const duration = durationStr ? parseInt(durationStr, 10) : undefined;

    if (amountStr && (!amount || amount <= 0)) {
      toast.error("Le montant doit être un nombre positif");
      return;
    }

    if (durationStr && (!duration || duration < 6 || duration > 360)) {
      toast.error("La durée doit être entre 6 et 360 mois");
      return;
    }

    createMutation.mutate({
      productType: productType as "STANDARD" | "SIMPLIFIED",
      amountRequestedXof: amount,
      durationMonths: duration,
    });
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setLocation("/citizen/credit")}
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Retour
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Nouveau dossier de crédit</h1>
          <p className="text-muted-foreground mt-1">
            Renseignez les informations de votre demande de crédit habitat
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Informations du dossier</CardTitle>
          <CardDescription>
            Choisissez le type de produit et indiquez le montant souhaité. Vous pourrez ajouter vos documents justificatifs après la création.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="productType">Type de produit *</Label>
              <Select value={productType} onValueChange={setProductType}>
                <SelectTrigger id="productType">
                  <SelectValue placeholder="Sélectionnez un produit" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={CreditProductType.STANDARD}>
                    {CREDIT_PRODUCT_TYPE_LABELS[CreditProductType.STANDARD]}
                    <span className="text-xs text-muted-foreground ml-2">
                      — 4 documents requis
                    </span>
                  </SelectItem>
                  <SelectItem value={CreditProductType.SIMPLIFIED}>
                    {CREDIT_PRODUCT_TYPE_LABELS[CreditProductType.SIMPLIFIED]}
                    <span className="text-xs text-muted-foreground ml-2">
                      — 3 documents requis
                    </span>
                  </SelectItem>
                </SelectContent>
              </Select>
              {productType === CreditProductType.STANDARD && (
                <p className="text-xs text-muted-foreground">
                  Documents requis : Pièce d'identité, Justificatif de revenus, Justificatif de domicile, Titre foncier
                </p>
              )}
              {productType === CreditProductType.SIMPLIFIED && (
                <p className="text-xs text-muted-foreground">
                  Documents requis : Pièce d'identité, Justificatif de domicile, Titre foncier (revenus optionnel)
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="amount">Montant demandé (XOF)</Label>
              <Input
                id="amount"
                type="number"
                placeholder="Ex: 15000000"
                value={amountStr}
                onChange={(e) => setAmountStr(e.target.value)}
                min={1}
              />
              <p className="text-xs text-muted-foreground">
                Montant souhaité en Francs CFA
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="duration">Durée souhaitée (mois)</Label>
              <Input
                id="duration"
                type="number"
                placeholder="Ex: 120"
                value={durationStr}
                onChange={(e) => setDurationStr(e.target.value)}
                min={6}
                max={360}
              />
              <p className="text-xs text-muted-foreground">
                Entre 6 et 360 mois (30 ans maximum)
              </p>
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setLocation("/citizen/credit")}
              >
                Annuler
              </Button>
              <Button
                type="submit"
                className="bg-ci-orange hover:bg-ci-orange/90"
                disabled={createMutation.isPending || !productType}
              >
                {createMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Création en cours...
                  </>
                ) : (
                  "Créer le dossier"
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
