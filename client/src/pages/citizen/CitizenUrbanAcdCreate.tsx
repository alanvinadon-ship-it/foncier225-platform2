import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { ArrowLeft, Building2, Loader2, Send } from "lucide-react";
import { useState } from "react";
import { Link, useLocation } from "wouter";
import { toast } from "sonner";

export default function CitizenUrbanAcdCreate() {
  const [, navigate] = useLocation();
  const utils = trpc.useUtils();

  const [form, setForm] = useState({
    applicantFullName: "",
    applicantNationality: "Ivoirienne",
    applicantIdType: "cni",
    applicantIdNumber: "",
    applicantType: "personne_physique" as "personne_physique" | "personne_morale",
    companyName: "",
    companyRccm: "",
    lotNumber: "",
    ilotNumber: "",
    lotissementName: "",
    commune: "",
    quartier: "",
    surfaceM2: "",
    usagePrevu: "habitation" as "habitation" | "commerce" | "industriel" | "mixte",
    notes: "",
  });

  const createMutation = trpc.urbanAcd.citizen.create.useMutation({
    onSuccess: (data) => {
      toast.success(`Dossier ${data.applicationNumber} créé avec succès`);
      utils.urbanAcd.citizen.list.invalidate();
      navigate(`/citizen/urban-acd/${data.id}`);
    },
    onError: (err) => {
      toast.error(err.message || "Erreur lors de la création");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.applicantFullName.trim()) {
      toast.error("Le nom complet est obligatoire");
      return;
    }
    createMutation.mutate({
      applicantFullName: form.applicantFullName,
      applicantNationality: form.applicantNationality || undefined,
      applicantIdType: form.applicantIdType || undefined,
      applicantIdNumber: form.applicantIdNumber || undefined,
      applicantType: form.applicantType,
      companyName: form.applicantType === "personne_morale" ? form.companyName : undefined,
      companyRccm: form.applicantType === "personne_morale" ? form.companyRccm : undefined,
      lotNumber: form.lotNumber || undefined,
      ilotNumber: form.ilotNumber || undefined,
      lotissementName: form.lotissementName || undefined,
      commune: form.commune || undefined,
      quartier: form.quartier || undefined,
      surfaceM2: form.surfaceM2 ? parseInt(form.surfaceM2) : undefined,
      usagePrevu: form.usagePrevu,
      notes: form.notes || undefined,
    });
  };

  const update = (field: string, value: string) => setForm((prev) => ({ ...prev, [field]: value }));

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/citizen/urban-acd">
          <Button variant="ghost" size="icon" className="shrink-0">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Nouvelle demande ACD</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Arrêté de Concession Définitive — Foncier Urbain
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Demandeur */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-base flex items-center gap-2">
              <Building2 className="h-4 w-4 text-blue-600" />
              Informations du demandeur
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Type de demandeur</Label>
                <Select value={form.applicantType} onValueChange={(v) => update("applicantType", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="personne_physique">Personne physique</SelectItem>
                    <SelectItem value="personne_morale">Personne morale</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Nationalité</Label>
                <Input value={form.applicantNationality} onChange={(e) => update("applicantNationality", e.target.value)} />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Nom complet *</Label>
              <Input
                value={form.applicantFullName}
                onChange={(e) => update("applicantFullName", e.target.value)}
                placeholder="Nom et prénoms du demandeur"
                required
              />
            </div>

            {form.applicantType === "personne_morale" && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Raison sociale</Label>
                  <Input value={form.companyName} onChange={(e) => update("companyName", e.target.value)} placeholder="Nom de la société" />
                </div>
                <div className="space-y-2">
                  <Label>N° RCCM</Label>
                  <Input value={form.companyRccm} onChange={(e) => update("companyRccm", e.target.value)} placeholder="CI-ABJ-XXXX-B-XXXXX" />
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Type de pièce d'identité</Label>
                <Select value={form.applicantIdType} onValueChange={(v) => update("applicantIdType", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cni">CNI</SelectItem>
                    <SelectItem value="passeport">Passeport</SelectItem>
                    <SelectItem value="carte_sejour">Carte de séjour</SelectItem>
                    <SelectItem value="attestation">Attestation d'identité</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>N° de pièce</Label>
                <Input value={form.applicantIdNumber} onChange={(e) => update("applicantIdNumber", e.target.value)} placeholder="Numéro de la pièce" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Terrain */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-base flex items-center gap-2">
              <Building2 className="h-4 w-4 text-amber-600" />
              Informations sur le terrain
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>N° de lot</Label>
                <Input value={form.lotNumber} onChange={(e) => update("lotNumber", e.target.value)} placeholder="Ex: 1234" />
              </div>
              <div className="space-y-2">
                <Label>N° d'îlot</Label>
                <Input value={form.ilotNumber} onChange={(e) => update("ilotNumber", e.target.value)} placeholder="Ex: 56" />
              </div>
              <div className="space-y-2">
                <Label>Surface (m²)</Label>
                <Input type="number" value={form.surfaceM2} onChange={(e) => update("surfaceM2", e.target.value)} placeholder="Ex: 600" />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Lotissement</Label>
                <Input value={form.lotissementName} onChange={(e) => update("lotissementName", e.target.value)} placeholder="Nom du lotissement" />
              </div>
              <div className="space-y-2">
                <Label>Usage prévu</Label>
                <Select value={form.usagePrevu} onValueChange={(v) => update("usagePrevu", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="habitation">Habitation</SelectItem>
                    <SelectItem value="commerce">Commerce</SelectItem>
                    <SelectItem value="industriel">Industriel</SelectItem>
                    <SelectItem value="mixte">Mixte</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Commune</Label>
                <Input value={form.commune} onChange={(e) => update("commune", e.target.value)} placeholder="Ex: Cocody, Yopougon..." />
              </div>
              <div className="space-y-2">
                <Label>Quartier</Label>
                <Input value={form.quartier} onChange={(e) => update("quartier", e.target.value)} placeholder="Quartier ou secteur" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Notes */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-base">Notes complémentaires</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              value={form.notes}
              onChange={(e) => update("notes", e.target.value)}
              placeholder="Informations complémentaires sur votre demande (facultatif)"
              rows={3}
            />
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3">
          <Link href="/citizen/urban-acd">
            <Button variant="outline" type="button">Annuler</Button>
          </Link>
          <Button type="submit" className="bg-ci-green hover:bg-ci-green/90 gap-2" disabled={createMutation.isPending}>
            {createMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            Créer le dossier
          </Button>
        </div>
      </form>
    </div>
  );
}
