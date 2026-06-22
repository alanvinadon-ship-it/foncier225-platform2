import { useState, useEffect, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Building2, Save, FileText, Upload, ImageIcon, Trash2 } from "lucide-react";

// --- Composant Upload Logo ---
function LogoUploader({ currentLogoUrl, onUploaded }: { currentLogoUrl?: string | null; onUploaded: () => void }) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(currentLogoUrl || null);
  const [uploading, setUploading] = useState(false);

  const uploadMut = trpc.erp.invoices.uploadCompanyLogo.useMutation({
    onSuccess: (data) => {
      toast.success("Logo téléversé avec succès");
      setPreview(data.url);
      onUploaded();
    },
    onError: (e) => toast.error(`Erreur : ${e.message}`),
    onSettled: () => setUploading(false),
  });

  useEffect(() => {
    setPreview(currentLogoUrl || null);
  }, [currentLogoUrl]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validation
    const allowedTypes = ["image/png", "image/jpeg", "image/jpg", "image/webp", "image/svg+xml"];
    if (!allowedTypes.includes(file.type)) {
      toast.error("Format non supporté. Utilisez PNG, JPG, WebP ou SVG.");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Le fichier est trop volumineux (max 2 Mo).");
      return;
    }

    // Prévisualisation locale
    const reader = new FileReader();
    reader.onload = () => {
      setPreview(reader.result as string);
    };
    reader.readAsDataURL(file);

    // Upload en base64
    setUploading(true);
    const arrayBuffer = await file.arrayBuffer();
    const base64 = btoa(
      new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), "")
    );
    uploadMut.mutate({
      fileBase64: base64,
      fileName: file.name,
      mimeType: file.type,
    });

    // Reset input
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleRemoveLogo = () => {
    setPreview(null);
    // On met à jour via updateCompanySettings avec logoUrl vide
  };

  return (
    <div className="space-y-3">
      <Label>Logo de l'entreprise</Label>
      <div className="flex items-start gap-4">
        {/* Zone de prévisualisation */}
        <div className="w-32 h-32 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center overflow-hidden bg-gray-50">
          {preview ? (
            <img
              src={preview}
              alt="Logo entreprise"
              className="w-full h-full object-contain p-2"
            />
          ) : (
            <div className="text-center text-gray-400">
              <ImageIcon className="w-8 h-8 mx-auto mb-1" />
              <span className="text-xs">Aucun logo</span>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="space-y-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/jpg,image/webp,image/svg+xml"
            className="hidden"
            onChange={handleFileSelect}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
          >
            <Upload className="w-4 h-4 mr-2" />
            {uploading ? "Téléversement..." : "Téléverser un logo"}
          </Button>
          {preview && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-red-600 hover:text-red-700"
              onClick={handleRemoveLogo}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Supprimer
            </Button>
          )}
          <p className="text-xs text-gray-400">
            PNG, JPG, WebP ou SVG. Max 2 Mo.<br />
            Recommandé : 200×80 px, fond transparent.
          </p>
        </div>
      </div>
    </div>
  );
}

export default function ErpCompanySettings() {
  const { data: settings, isLoading, refetch } = trpc.erp.invoices.getCompanySettings.useQuery();
  const updateMut = trpc.erp.invoices.updateCompanySettings.useMutation({
    onSuccess: () => { toast.success("Paramètres enregistrés"); refetch(); },
    onError: (e) => toast.error(e.message),
  });

  const [form, setForm] = useState({
    companyName: "",
    ncc: "",
    rccm: "",
    rccmDate: "",
    taxRegime: "RSI",
    taxCenter: "",
    address: "",
    city: "",
    postalBox: "",
    phone: "",
    email: "",
    website: "",
    bankReferences: "",
    invoicePrefix: "",
    defaultPaymentTerms: "Un mois date de dépôt de facture",
    defaultPaymentMode: "Virement",
    defaultTaxRate: 18,
  });

  useEffect(() => {
    if (settings) {
      setForm({
        companyName: settings.companyName || "",
        ncc: settings.ncc || "",
        rccm: settings.rccm || "",
        rccmDate: settings.rccmDate || "",
        taxRegime: settings.taxRegime || "RSI",
        taxCenter: settings.taxCenter || "",
        address: settings.address || "",
        city: settings.city || "",
        postalBox: settings.postalBox || "",
        phone: settings.phone || "",
        email: settings.email || "",
        website: settings.website || "",
        bankReferences: settings.bankReferences || "",
        invoicePrefix: settings.invoicePrefix || "",
        defaultPaymentTerms: settings.defaultPaymentTerms || "Un mois date de dépôt de facture",
        defaultPaymentMode: settings.defaultPaymentMode || "Virement",
        defaultTaxRate: settings.defaultTaxRate || 18,
      });
    }
  }, [settings]);

  const handleSave = () => {
    updateMut.mutate(form);
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Paramètres Société</h1>
          <p className="text-sm text-gray-500 mt-1">
            Configuration pour la facturation normalisée (Côte d'Ivoire)
          </p>
        </div>
        <Button onClick={handleSave} disabled={updateMut.isPending}>
          <Save className="w-4 h-4 mr-2" />
          {updateMut.isPending ? "Enregistrement..." : "Enregistrer"}
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Identité */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="w-5 h-5 text-green-600" />
              Identité de l'entreprise
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Raison sociale *</Label>
              <Input value={form.companyName} onChange={(e) => setForm({ ...form, companyName: e.target.value })} placeholder="AGILES TELECOMS" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>NCC (Numéro Compte Contribuable) *</Label>
                <Input value={form.ncc} onChange={(e) => setForm({ ...form, ncc: e.target.value })} placeholder="1739256P" />
              </div>
              <div>
                <Label>Régime d'imposition</Label>
                <Select value={form.taxRegime} onValueChange={(v) => setForm({ ...form, taxRegime: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="RSI">RSI - Régime Simplifié d'Imposition</SelectItem>
                    <SelectItem value="RNI">RNI - Régime Normal d'Imposition</SelectItem>
                    <SelectItem value="RMI">RMI - Régime Micro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>RCCM</Label>
                <Input value={form.rccm} onChange={(e) => setForm({ ...form, rccm: e.target.value })} placeholder="CI-ABJ-2017-B-15253" />
              </div>
              <div>
                <Label>Date RCCM</Label>
                <Input value={form.rccmDate} onChange={(e) => setForm({ ...form, rccmDate: e.target.value })} placeholder="13-06-2017" />
              </div>
            </div>
            <div>
              <Label>Centre des impôts</Label>
              <Input value={form.taxCenter} onChange={(e) => setForm({ ...form, taxCenter: e.target.value })} placeholder="872 Impôts de II Plateaux III" />
            </div>
          </CardContent>
        </Card>

        {/* Logo + Coordonnées */}
        <Card>
          <CardHeader>
            <CardTitle>Logo & Coordonnées</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Upload Logo */}
            <LogoUploader
              currentLogoUrl={settings?.logoUrl}
              onUploaded={() => refetch()}
            />

            <hr className="my-4" />

            <div>
              <Label>Adresse</Label>
              <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="Cocody, Riviera Palmeraie" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Boîte postale</Label>
                <Input value={form.postalBox} onChange={(e) => setForm({ ...form, postalBox: e.target.value })} placeholder="01 BP 511" />
              </div>
              <div>
                <Label>Ville</Label>
                <Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} placeholder="ABIDJAN" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Téléphone</Label>
                <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="0767561377" />
              </div>
              <div>
                <Label>Email</Label>
                <Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="contact@entreprise.ci" />
              </div>
            </div>
            <div>
              <Label>Site web</Label>
              <Input value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} placeholder="www.entreprise.ci" />
            </div>
            <div>
              <Label>Références bancaires</Label>
              <Textarea value={form.bankReferences} onChange={(e) => setForm({ ...form, bankReferences: e.target.value })} placeholder="Banque, N° compte, Code SWIFT..." rows={2} />
            </div>
          </CardContent>
        </Card>

        {/* Facturation */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-blue-600" />
              Paramètres de facturation
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label>Préfixe facture</Label>
                <Input value={form.invoicePrefix} onChange={(e) => setForm({ ...form, invoicePrefix: e.target.value })} placeholder="FV" />
                <p className="text-xs text-gray-400 mt-1">Le numéro sera : NCC + Année + Séquence</p>
              </div>
              <div>
                <Label>Mode de paiement par défaut</Label>
                <Select value={form.defaultPaymentMode} onValueChange={(v) => setForm({ ...form, defaultPaymentMode: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Virement">Virement</SelectItem>
                    <SelectItem value="Chèque">Chèque</SelectItem>
                    <SelectItem value="Espèces">Espèces</SelectItem>
                    <SelectItem value="Mobile Money">Mobile Money</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Taux TVA par défaut (%)</Label>
                <Input type="number" value={form.defaultTaxRate} onChange={(e) => setForm({ ...form, defaultTaxRate: Number(e.target.value) })} />
              </div>
            </div>
            <div>
              <Label>Conditions de paiement</Label>
              <Input value={form.defaultPaymentTerms} onChange={(e) => setForm({ ...form, defaultPaymentTerms: e.target.value })} placeholder="Un mois date de dépôt de facture" />
            </div>

            {/* Aperçu en-tête facture */}
            {settings?.logoUrl && (
              <div className="mt-4 p-4 border rounded-lg bg-gray-50">
                <p className="text-xs text-gray-500 mb-2 font-medium">Aperçu en-tête facture :</p>
                <div className="flex items-start gap-4">
                  <img src={settings.logoUrl} alt="Logo" className="h-12 object-contain" />
                  <div className="text-xs text-gray-700">
                    <p className="font-bold">{form.companyName || "Raison sociale"}</p>
                    <p>{form.address || "Adresse"}, {form.city || "Ville"}</p>
                    <p>NCC: {form.ncc || "—"} | RCCM: {form.rccm || "—"}</p>
                    <p>Tél: {form.phone || "—"} | {form.email || "—"}</p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
