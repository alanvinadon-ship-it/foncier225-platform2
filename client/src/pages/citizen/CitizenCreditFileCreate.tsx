import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { zodResolver } from "@hookform/resolvers/zod";
import { AnimatePresence, motion } from "framer-motion";
import { AlertCircle, ArrowLeft, Banknote, CheckCircle2, FolderPlus, Loader2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { Link, useLocation } from "wouter";
import { z } from "zod";

const creditFileSchema = z.object({
  productType: z.enum(["STANDARD", "SIMPLIFIED"], {
    message: "Sélectionnez un type de produit",
  }),
  parcelId: z.string().optional(),
  amountRequestedXof: z
    .string()
    .optional()
    .refine(
      (val) => !val || (Number(val) > 0 && Number.isFinite(Number(val))),
      { message: "Le montant doit être un nombre positif" }
    )
    .refine(
      (val) => !val || Number(val) >= 500000,
      { message: "Le montant minimum est de 500 000 XOF" }
    )
    .refine(
      (val) => !val || Number(val) <= 500000000,
      { message: "Le montant maximum est de 500 000 000 XOF" }
    ),
  durationMonths: z
    .string()
    .optional()
    .refine(
      (val) => !val || (Number(val) >= 6 && Number(val) <= 360 && Number.isInteger(Number(val))),
      { message: "La durée doit être entre 6 et 360 mois" }
    ),
});

type CreditFileFormData = z.infer<typeof creditFileSchema>;

const fadeSlide = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
  transition: { duration: 0.25, ease: "easeOut" as const },
};

export default function CitizenCreditFileCreate() {
  const [, setLocation] = useLocation();
  const featureProbeQuery = trpc.credit.listMyCreditFiles.useQuery(
    { limit: 1, offset: 0 },
    { retry: false }
  );
  const { data: parcels } = trpc.citizen.myParcels.useQuery();
  const createMutation = trpc.credit.createCreditFile.useMutation();

  const isFeatureDisabled =
    (featureProbeQuery.error as { data?: { code?: string } } | null)?.data?.code === "FORBIDDEN";

  const form = useForm<CreditFileFormData>({
    resolver: zodResolver(creditFileSchema),
    mode: "onChange",
    defaultValues: {
      productType: "STANDARD",
      parcelId: "none",
      amountRequestedXof: "",
      durationMonths: "",
    },
  });

  const { isValid, errors, touchedFields } = form.formState;

  const onSubmit = async (data: CreditFileFormData) => {
    try {
      const result = await createMutation.mutateAsync({
        productType: data.productType,
        parcelId: data.parcelId === "none" ? undefined : Number(data.parcelId),
        amountRequestedXof: data.amountRequestedXof ? Number(data.amountRequestedXof) : undefined,
        durationMonths: data.durationMonths ? Number(data.durationMonths) : undefined,
      });
      setLocation(`/citizen/credit-habitat/${result.creditFileId}`);
    } catch (_error) {
      // Error is shown via createMutation.error
    }
  };

  // Compute completeness for visual feedback
  const productType = form.watch("productType");
  const amount = form.watch("amountRequestedXof");
  const duration = form.watch("durationMonths");
  const parcelId = form.watch("parcelId");

  const completedFields = [
    productType,
    amount && !errors.amountRequestedXof,
    duration && !errors.durationMonths,
    parcelId && parcelId !== "none",
  ].filter(Boolean).length;
  const totalFields = 4;
  const completionPct = Math.round((completedFields / totalFields) * 100);

  return (
    <div className="space-y-6">
      <motion.div {...fadeSlide}>
        <Link href="/citizen/credit-habitat" className="mb-3 flex items-center gap-1 text-sm text-ci-orange hover:underline">
          <ArrowLeft className="h-4 w-4" />
          Retour aux dossiers
        </Link>
        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
          <FolderPlus className="h-6 w-6 text-ci-orange" />
          Nouveau dossier de crédit habitat
        </h1>
        <p className="mt-1 text-muted-foreground">
          Renseignez les premiers éléments de votre dossier avant d&apos;ajouter vos pièces.
        </p>
      </motion.div>

      <motion.div {...fadeSlide} transition={{ delay: 0.1, duration: 0.3 }}>
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Initialisation du dossier</CardTitle>
                <CardDescription>
                  Le dossier sera créé en brouillon et restera privé à votre espace citoyen.
                </CardDescription>
              </div>
              {/* Completion indicator */}
              <div className="hidden sm:flex items-center gap-3">
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">Complétude</p>
                  <p className="text-sm font-semibold">{completionPct}%</p>
                </div>
                <div className="h-10 w-10 relative">
                  <svg className="h-10 w-10 -rotate-90" viewBox="0 0 36 36">
                    <circle
                      cx="18" cy="18" r="15.5"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="3"
                      className="text-muted/30"
                    />
                    <motion.circle
                      cx="18" cy="18" r="15.5"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="3"
                      strokeDasharray={`${completionPct} 100`}
                      strokeLinecap="round"
                      className="text-ci-orange"
                      initial={{ strokeDasharray: "0 100" }}
                      animate={{ strokeDasharray: `${completionPct} 100` }}
                      transition={{ duration: 0.5, ease: "easeOut" }}
                    />
                  </svg>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isFeatureDisabled ? (
              <Alert className="mb-5">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Module indisponible</AlertTitle>
                <AlertDescription>
                  Le parcours Crédit habitat n&apos;est pas encore activé pour cet environnement.
                </AlertDescription>
              </Alert>
            ) : null}

            <Form {...form}>
              <form className="space-y-5" onSubmit={form.handleSubmit(onSubmit)}>
                <AnimatePresence mode="wait">
                  {createMutation.error ? (
                    <motion.div key="mutation-error" {...fadeSlide}>
                      <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertTitle>Création impossible</AlertTitle>
                        <AlertDescription>{createMutation.error.message}</AlertDescription>
                      </Alert>
                    </motion.div>
                  ) : null}
                </AnimatePresence>

                <div className="grid gap-5 md:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="productType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Type de produit <span className="text-destructive">*</span></FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger className="w-full">
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="STANDARD">Crédit Standard</SelectItem>
                            <SelectItem value="SIMPLIFIED">Crédit Simplifié</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormDescription>
                          {field.value === "STANDARD"
                            ? "4 documents requis (identité, revenus, domicile, titre foncier)"
                            : "3 documents requis (identité, domicile, titre foncier)"}
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="parcelId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Parcelle associée</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Aucune parcelle sélectionnée" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="none">Aucune parcelle</SelectItem>
                            {(parcels ?? []).map(parcel => (
                              <SelectItem key={parcel.id} value={String(parcel.id)}>
                                {parcel.reference}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormDescription>
                          Optionnel — associez une parcelle de votre portefeuille.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="amountRequestedXof"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Montant demandé (XOF)</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input
                              inputMode="numeric"
                              placeholder="Ex : 5 000 000"
                              type="number"
                              min={0}
                              {...field}
                            />
                            <AnimatePresence>
                              {touchedFields.amountRequestedXof && field.value && !errors.amountRequestedXof && (
                                <motion.div
                                  initial={{ scale: 0, opacity: 0 }}
                                  animate={{ scale: 1, opacity: 1 }}
                                  exit={{ scale: 0, opacity: 0 }}
                                  className="absolute right-3 top-1/2 -translate-y-1/2"
                                >
                                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        </FormControl>
                        <FormDescription>
                          Entre 500 000 et 500 000 000 XOF.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="durationMonths"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Durée souhaitée (mois)</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input
                              inputMode="numeric"
                              placeholder="Ex : 36"
                              type="number"
                              min={6}
                              max={360}
                              {...field}
                            />
                            <AnimatePresence>
                              {touchedFields.durationMonths && field.value && !errors.durationMonths && (
                                <motion.div
                                  initial={{ scale: 0, opacity: 0 }}
                                  animate={{ scale: 1, opacity: 1 }}
                                  exit={{ scale: 0, opacity: 0 }}
                                  className="absolute right-3 top-1/2 -translate-y-1/2"
                                >
                                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        </FormControl>
                        <FormDescription>
                          Entre 6 et 360 mois (30 ans).
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.2 }}
                  className="rounded-xl border bg-muted/20 p-4 text-sm text-muted-foreground"
                >
                  <div className="flex items-center gap-2 font-medium text-foreground">
                    <Banknote className="h-4 w-4 text-ci-orange" />
                    Suite du parcours
                  </div>
                  <p className="mt-2">
                    Une fois le dossier créé, vous pourrez visualiser la checklist dynamique, ajouter vos documents et le soumettre lorsqu&apos;il sera complet.
                  </p>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                >
                  <Button
                    className="bg-ci-orange hover:bg-ci-orange/90 gap-2"
                    disabled={createMutation.isPending || isFeatureDisabled || !isValid}
                    type="submit"
                  >
                    {createMutation.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Création en cours...
                      </>
                    ) : (
                      "Créer le dossier"
                    )}
                  </Button>
                </motion.div>
              </form>
            </Form>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
