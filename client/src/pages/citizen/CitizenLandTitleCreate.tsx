import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { motion } from "framer-motion";
import { ArrowLeft, Loader2, Save } from "lucide-react";
import { useState } from "react";
import { Link, useLocation } from "wouter";
import { toast } from "sonner";

export default function CitizenLandTitleCreate() {
  const [, setLocation] = useLocation();
  const utils = trpc.useUtils();

  const [form, setForm] = useState({
    applicantFullName: "",
    applicantNationality: "ivoirienne",
    applicantIdType: "CNI",
    applicantIdNumber: "",
    landDescription: "",
    landLocality: "",
    landSubPrefecture: "",
    landDepartment: "",
    landRegion: "",
    landAreaHectares: "",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const createMutation = trpc.landTitle.citizen.create.useMutation({
    onSuccess: (data) => {
      toast.success("Demande créée avec succès");
      utils.landTitle.citizen.listMine.invalidate();
      setLocation(`/citizen/land-title/${data.id}`);
    },
    onError: (err) => {
      toast.error(err.message || "Erreur lors de la création");
    },
  });

  function validate(): boolean {
    const newErrors: Record<string, string> = {};
    if (!form.applicantFullName.trim() || form.applicantFullName.trim().length < 2) {
      newErrors.applicantFullName = "Le nom complet est requis (min. 2 caractères)";
    }
    if (!form.landLocality.trim()) {
      newErrors.landLocality = "La localité est requise";
    }
    if (!form.landSubPrefecture.trim()) {
      newErrors.landSubPrefecture = "La sous-préfecture est requise";
    }
    if (form.landAreaHectares && isNaN(parseFloat(form.landAreaHectares))) {
      newErrors.landAreaHectares = "La superficie doit être un nombre valide";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  function handleChange(field: string, value: string) {
    setForm(prev => ({ ...prev, [field]: value }));
    // Clear error on change
    if (errors[field]) {
      setErrors(prev => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    createMutation.mutate({
      applicantFullName: form.applicantFullName.trim(),
      applicantNationality: form.applicantNationality || undefined,
      applicantIdType: form.applicantIdType || undefined,
      applicantIdNumber: form.applicantIdNumber || undefined,
      landDescription: form.landDescription || undefined,
      landLocality: form.landLocality.trim() || undefined,
      landSubPrefecture: form.landSubPrefecture.trim() || undefined,
      landDepartment: form.landDepartment.trim() || undefined,
      landRegion: form.landRegion.trim() || undefined,
      landAreaHectares: form.landAreaHectares || undefined,
    });
  }

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/citizen/land-title">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-xl font-bold tracking-tight">Nouvelle demande de Titre Foncier</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Remplissez les informations pour initier votre demande de Certificat Foncier
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Applicant info */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-base">Informations du demandeur</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="applicantFullName">
                  Nom complet <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="applicantFullName"
                  value={form.applicantFullName}
                  onChange={(e) => handleChange("applicantFullName", e.target.value)}
                  placeholder="Ex: Kouassi Jean-Baptiste"
                  className={errors.applicantFullName ? "border-destructive" : ""}
                />
                {errors.applicantFullName && (
                  <p className="text-xs text-destructive">{errors.applicantFullName}</p>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="applicantNationality">Nationalité</Label>
                  <Select
                    value={form.applicantNationality}
                    onValueChange={(v) => handleChange("applicantNationality", v)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ivoirienne">Ivoirienne</SelectItem>
                      <SelectItem value="autre">Autre</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="applicantIdType">Type de pièce</Label>
                  <Select
                    value={form.applicantIdType}
                    onValueChange={(v) => handleChange("applicantIdType", v)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="CNI">CNI</SelectItem>
                      <SelectItem value="Passeport">Passeport</SelectItem>
                      <SelectItem value="Attestation">Attestation d'identité</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="applicantIdNumber">Numéro de pièce</Label>
                <Input
                  id="applicantIdNumber"
                  value={form.applicantIdNumber}
                  onChange={(e) => handleChange("applicantIdNumber", e.target.value)}
                  placeholder="Ex: CI-0012345678"
                />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Land info */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-base">Informations sur le terrain</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="landLocality">
                    Localité / Village <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="landLocality"
                    value={form.landLocality}
                    onChange={(e) => handleChange("landLocality", e.target.value)}
                    placeholder="Ex: Kossou"
                    className={errors.landLocality ? "border-destructive" : ""}
                  />
                  {errors.landLocality && (
                    <p className="text-xs text-destructive">{errors.landLocality}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="landSubPrefecture">
                    Sous-préfecture <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="landSubPrefecture"
                    value={form.landSubPrefecture}
                    onChange={(e) => handleChange("landSubPrefecture", e.target.value)}
                    placeholder="Ex: Bouaflé"
                    className={errors.landSubPrefecture ? "border-destructive" : ""}
                  />
                  {errors.landSubPrefecture && (
                    <p className="text-xs text-destructive">{errors.landSubPrefecture}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="landDepartment">Département</Label>
                  <Input
                    id="landDepartment"
                    value={form.landDepartment}
                    onChange={(e) => handleChange("landDepartment", e.target.value)}
                    placeholder="Ex: Bouaflé"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="landRegion">Région</Label>
                  <Input
                    id="landRegion"
                    value={form.landRegion}
                    onChange={(e) => handleChange("landRegion", e.target.value)}
                    placeholder="Ex: Marahoué"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="landAreaHectares">Superficie estimée (hectares)</Label>
                <Input
                  id="landAreaHectares"
                  value={form.landAreaHectares}
                  onChange={(e) => handleChange("landAreaHectares", e.target.value)}
                  placeholder="Ex: 12.5"
                  className={errors.landAreaHectares ? "border-destructive" : ""}
                />
                {errors.landAreaHectares && (
                  <p className="text-xs text-destructive">{errors.landAreaHectares}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="landDescription">Description du terrain</Label>
                <Textarea
                  id="landDescription"
                  value={form.landDescription}
                  onChange={(e) => handleChange("landDescription", e.target.value)}
                  placeholder="Décrivez le terrain (nature, usage, voisinage...)"
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Submit */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="flex justify-end gap-3"
        >
          <Link href="/citizen/land-title">
            <Button variant="outline" type="button">Annuler</Button>
          </Link>
          <Button
            type="submit"
            disabled={createMutation.isPending}
            className="bg-ci-green hover:bg-ci-green/90 gap-2"
          >
            {createMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            Créer le dossier
          </Button>
        </motion.div>
      </form>
    </div>
  );
}
