import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { AlertCircle, ArrowLeft, Banknote, FolderPlus } from "lucide-react";
import { useState } from "react";
import { Link, useLocation } from "wouter";

export default function CitizenCreditFileCreate() {
  const [, setLocation] = useLocation();
  const featureProbeQuery = trpc.credit.listMyCreditFiles.useQuery(
    { limit: 1, offset: 0 },
    { retry: false }
  );
  const { data: parcels } = trpc.citizen.myParcels.useQuery();
  const createMutation = trpc.credit.createCreditFile.useMutation();
  const [productType, setProductType] = useState<"STANDARD" | "SIMPLIFIED">("STANDARD");
  const [parcelId, setParcelId] = useState<string>("none");
  const [amountRequestedXof, setAmountRequestedXof] = useState("");
  const [durationMonths, setDurationMonths] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const isFeatureDisabled =
    (featureProbeQuery.error as { data?: { code?: string } } | null)?.data?.code === "FORBIDDEN";

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);

    const amountValue = amountRequestedXof ? Number(amountRequestedXof) : undefined;
    const durationValue = durationMonths ? Number(durationMonths) : undefined;

    if (amountValue !== undefined && (!Number.isFinite(amountValue) || amountValue <= 0)) {
      setFormError("Le montant demande doit etre superieur a zero.");
      return;
    }

    if (durationValue !== undefined && (!Number.isFinite(durationValue) || durationValue < 6 || durationValue > 360)) {
      setFormError("La duree doit etre comprise entre 6 et 360 mois.");
      return;
    }

    try {
      const result = await createMutation.mutateAsync({
        productType,
        parcelId: parcelId === "none" ? undefined : Number(parcelId),
        amountRequestedXof: amountValue,
        durationMonths: durationValue,
      });
      setLocation(`/citizen/credit-habitat/${result.creditFileId}`);
    } catch (error) {
      setFormError((error as Error).message || "Creation du dossier impossible.");
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <Link href="/citizen/credit-habitat" className="mb-3 flex items-center gap-1 text-sm text-ci-orange hover:underline">
          <ArrowLeft className="h-4 w-4" />
          Retour aux dossiers
        </Link>
        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
          <FolderPlus className="h-6 w-6 text-ci-orange" />
          Nouveau dossier de credit habitat
        </h1>
        <p className="mt-1 text-muted-foreground">
          Renseignez les premiers elements de votre dossier avant d&apos;ajouter vos pieces.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Initialisation du dossier</CardTitle>
          <CardDescription>
            Le dossier sera cree en brouillon et restera prive a votre espace citoyen.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isFeatureDisabled ? (
            <Alert className="mb-5">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Module indisponible</AlertTitle>
              <AlertDescription>
                Le parcours Credit habitat n&apos;est pas encore active pour cet environnement.
              </AlertDescription>
            </Alert>
          ) : null}

          <form className="space-y-5" onSubmit={handleSubmit}>
            {formError ? (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Creation impossible</AlertTitle>
                <AlertDescription>{formError}</AlertDescription>
              </Alert>
            ) : null}

            <div className="grid gap-5 md:grid-cols-2">
              <div className="grid gap-2">
                <label className="text-sm font-medium">Type de produit</label>
                <Select value={productType} onValueChange={value => setProductType(value as "STANDARD" | "SIMPLIFIED")}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="STANDARD">Credit Standard</SelectItem>
                    <SelectItem value="SIMPLIFIED">Credit Simplifie</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <label className="text-sm font-medium">Parcelle associee</label>
                <Select value={parcelId} onValueChange={setParcelId}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Aucune parcelle selectionnee" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Aucune parcelle</SelectItem>
                    {(parcels ?? []).map(parcel => (
                      <SelectItem key={parcel.id} value={String(parcel.id)}>
                        {parcel.reference}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <label className="text-sm font-medium">Montant demande (XOF)</label>
                <Input
                  inputMode="numeric"
                  min={0}
                  placeholder="Ex : 5000000"
                  type="number"
                  value={amountRequestedXof}
                  onChange={event => setAmountRequestedXof(event.target.value)}
                />
              </div>

              <div className="grid gap-2">
                <label className="text-sm font-medium">Duree souhaitee (mois)</label>
                <Input
                  inputMode="numeric"
                  min={6}
                  max={360}
                  placeholder="Ex : 36"
                  type="number"
                  value={durationMonths}
                  onChange={event => setDurationMonths(event.target.value)}
                />
              </div>
            </div>

            <div className="rounded-xl border bg-muted/20 p-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-2 font-medium text-foreground">
                <Banknote className="h-4 w-4 text-ci-orange" />
                Suite du parcours
              </div>
              <p className="mt-2">
                Une fois le dossier cree, vous pourrez visualiser la checklist dynamique, ajouter vos documents et le soumettre lorsqu&apos;il sera complet.
              </p>
            </div>

            <Button
              className="bg-ci-orange hover:bg-ci-orange/90"
              disabled={createMutation.isPending || isFeatureDisabled}
              type="submit"
            >
              {createMutation.isPending ? "Creation en cours..." : "Creer le dossier"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
