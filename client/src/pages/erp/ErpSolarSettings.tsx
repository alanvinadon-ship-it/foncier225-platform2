import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { ArrowLeft, Sun, Plus, MapPin, DollarSign, Settings, Pencil } from "lucide-react";

type Tab = "zones" | "prices" | "parameters";

export default function ErpSolarSettings() {
  const [, navigate] = useLocation();
  const [activeTab, setActiveTab] = useState<Tab>("zones");

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/erp/solar")}>
          <ArrowLeft size={20} />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Sun className="text-orange-500" size={24} />
            Paramètres Solaires
          </h1>
          <p className="text-sm text-muted-foreground">
            Gérez les zones d'ensoleillement, les paramètres techniques et le catalogue de prix
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b">
        <TabButton active={activeTab === "zones"} onClick={() => setActiveTab("zones")} icon={<MapPin size={16} />} label="Zones d'ensoleillement" />
        <TabButton active={activeTab === "prices"} onClick={() => setActiveTab("prices")} icon={<DollarSign size={16} />} label="Catalogue de prix" />
        <TabButton active={activeTab === "parameters"} onClick={() => setActiveTab("parameters")} icon={<Settings size={16} />} label="Paramètres techniques" />
      </div>

      {/* Content */}
      {activeTab === "zones" && <ZonesTab />}
      {activeTab === "prices" && <PricesTab />}
      {activeTab === "parameters" && <ParametersTab />}
    </div>
  );
}

function TabButton({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
        active
          ? "border-orange-500 text-orange-600"
          : "border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground/30"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

// ============================================================
// ONGLET ZONES D'ENSOLEILLEMENT
// ============================================================

function ZonesTab() {
  const utils = trpc.useUtils();
  const { data: zones, isLoading } = trpc.erp.solar.settings.zones.list.useQuery();
  const createZone = trpc.erp.solar.settings.zones.create.useMutation({
    onSuccess: () => {
      utils.erp.solar.settings.zones.list.invalidate();
      toast.success("Zone d'ensoleillement ajoutée avec succès");
    },
    onError: (err) => {
      toast.error(err.message);
    },
  });

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ zoneName: "", country: "Côte d'Ivoire", region: "", city: "", peakSunHours: "5", source: "" });

  const handleCreate = () => {
    if (!form.zoneName || !form.peakSunHours) {
      toast.error("Le nom de zone et les heures de pointe sont obligatoires.");
      return;
    }
    createZone.mutate({
      zoneName: form.zoneName,
      country: form.country || undefined,
      region: form.region || undefined,
      city: form.city || undefined,
      peakSunHours: parseFloat(form.peakSunHours),
      source: form.source || undefined,
    });
    setOpen(false);
    setForm({ zoneName: "", country: "Côte d'Ivoire", region: "", city: "", peakSunHours: "5", source: "" });
  };

  if (isLoading) {
    return <div className="flex items-center justify-center py-12"><div className="h-8 w-8 animate-spin rounded-full border-2 border-orange-500 border-t-transparent" /></div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Définissez les zones géographiques avec leurs heures d'ensoleillement de pointe (PSH) pour le dimensionnement.
        </p>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="bg-orange-500 hover:bg-orange-600 text-white">
              <Plus size={16} className="mr-2" /> Ajouter une zone
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nouvelle zone d'ensoleillement</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="zoneName">Nom de la zone *</Label>
                <Input id="zoneName" placeholder="Ex: Abidjan Sud" value={form.zoneName} onChange={(e) => setForm({ ...form, zoneName: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="country">Pays</Label>
                  <Input id="country" value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="region">Région</Label>
                  <Input id="region" placeholder="Ex: Lagunes" value={form.region} onChange={(e) => setForm({ ...form, region: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="city">Ville</Label>
                  <Input id="city" placeholder="Ex: Abidjan" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="peakSunHours">Heures de pointe (PSH) *</Label>
                  <Input id="peakSunHours" type="number" step="0.1" min="1" max="10" value={form.peakSunHours} onChange={(e) => setForm({ ...form, peakSunHours: e.target.value })} />
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="source">Source des données</Label>
                <Input id="source" placeholder="Ex: NASA POWER, PVGIS" value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })} />
              </div>
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline">Annuler</Button>
              </DialogClose>
              <Button onClick={handleCreate} disabled={createZone.isPending} className="bg-orange-500 hover:bg-orange-600 text-white">
                {createZone.isPending ? "Création..." : "Créer la zone"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Table des zones */}
      {zones && zones.length > 0 ? (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="px-4 py-3 text-left font-medium">Zone</th>
                    <th className="px-4 py-3 text-left font-medium">Pays</th>
                    <th className="px-4 py-3 text-left font-medium">Région</th>
                    <th className="px-4 py-3 text-left font-medium">Ville</th>
                    <th className="px-4 py-3 text-center font-medium">PSH (h/j)</th>
                    <th className="px-4 py-3 text-left font-medium">Source</th>
                  </tr>
                </thead>
                <tbody>
                  {zones.map((zone: any) => (
                    <tr key={zone.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3 font-medium">{zone.zoneName}</td>
                      <td className="px-4 py-3 text-muted-foreground">{zone.country || "—"}</td>
                      <td className="px-4 py-3 text-muted-foreground">{zone.region || "—"}</td>
                      <td className="px-4 py-3 text-muted-foreground">{zone.city || "—"}</td>
                      <td className="px-4 py-3 text-center">
                        <span className="inline-flex items-center gap-1 rounded-full bg-orange-100 px-2.5 py-0.5 text-xs font-semibold text-orange-700">
                          <Sun size={12} /> {zone.peakSunHours}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground text-xs">{zone.source || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <MapPin className="text-muted-foreground mb-3" size={40} />
            <p className="text-muted-foreground text-center">Aucune zone d'ensoleillement configurée.</p>
            <p className="text-xs text-muted-foreground mt-1">Ajoutez des zones pour le dimensionnement automatique des projets solaires.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ============================================================
// ONGLET CATALOGUE DE PRIX
// ============================================================

function PricesTab() {
  const utils = trpc.useUtils();
  const { data: prices, isLoading } = trpc.erp.solar.settings.priceCatalog.list.useQuery();
  const createPrice = trpc.erp.solar.settings.priceCatalog.create.useMutation({
    onSuccess: () => {
      utils.erp.solar.settings.priceCatalog.list.invalidate();
      toast.success("Article ajouté au catalogue de prix");
    },
    onError: (err) => {
      toast.error(err.message);
    },
  });
  const updatePrice = trpc.erp.solar.settings.priceCatalog.update.useMutation({
    onSuccess: () => {
      utils.erp.solar.settings.priceCatalog.list.invalidate();
      toast.success("Prix unitaire mis à jour");
    },
    onError: (err) => {
      toast.error(err.message);
    },
  });

  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editPrice, setEditPrice] = useState("");
  const [form, setForm] = useState({ itemCode: "", itemName: "", category: "panels", unit: "pcs", unitPrice: "" });

  const categories = [
    { value: "panels", label: "Panneaux solaires" },
    { value: "batteries", label: "Batteries" },
    { value: "inverters", label: "Onduleurs" },
    { value: "cables", label: "Câbles" },
    { value: "structures", label: "Structures" },
    { value: "accessories", label: "Accessoires" },
    { value: "installation", label: "Installation" },
  ];

  const handleCreate = () => {
    if (!form.itemCode || !form.itemName || !form.unitPrice) {
      toast.error("Code, nom et prix unitaire sont obligatoires.");
      return;
    }
    createPrice.mutate({
      itemCode: form.itemCode,
      itemName: form.itemName,
      category: form.category,
      unit: form.unit,
      unitPrice: parseFloat(form.unitPrice),
    });
    setOpen(false);
    setForm({ itemCode: "", itemName: "", category: "panels", unit: "pcs", unitPrice: "" });
  };

  const handleUpdatePrice = (id: number) => {
    if (!editPrice) return;
    updatePrice.mutate({ id, unitPrice: parseFloat(editPrice) });
    setEditingId(null);
    setEditPrice("");
  };

  if (isLoading) {
    return <div className="flex items-center justify-center py-12"><div className="h-8 w-8 animate-spin rounded-full border-2 border-orange-500 border-t-transparent" /></div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Catalogue des prix unitaires pour le chiffrage automatique des projets solaires (en XOF).
        </p>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="bg-orange-500 hover:bg-orange-600 text-white">
              <Plus size={16} className="mr-2" /> Ajouter un article
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nouvel article au catalogue</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="itemCode">Code article *</Label>
                  <Input id="itemCode" placeholder="Ex: PNL-400W" value={form.itemCode} onChange={(e) => setForm({ ...form, itemCode: e.target.value })} />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="itemName">Nom article *</Label>
                  <Input id="itemName" placeholder="Ex: Panneau 400Wc mono" value={form.itemName} onChange={(e) => setForm({ ...form, itemName: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>Catégorie</Label>
                  <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((c) => (
                        <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="unit">Unité</Label>
                  <Select value={form.unit} onValueChange={(v) => setForm({ ...form, unit: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pcs">pcs (pièce)</SelectItem>
                      <SelectItem value="Wc">Wc (Watt-crête)</SelectItem>
                      <SelectItem value="Wh">Wh (Watt-heure)</SelectItem>
                      <SelectItem value="Ah">Ah (Ampère-heure)</SelectItem>
                      <SelectItem value="m">m (mètre)</SelectItem>
                      <SelectItem value="kg">kg (kilogramme)</SelectItem>
                      <SelectItem value="fft">fft (forfait)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="unitPrice">Prix unitaire (XOF) *</Label>
                <Input id="unitPrice" type="number" min="0" placeholder="Ex: 200000" value={form.unitPrice} onChange={(e) => setForm({ ...form, unitPrice: e.target.value })} />
              </div>
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline">Annuler</Button>
              </DialogClose>
              <Button onClick={handleCreate} disabled={createPrice.isPending} className="bg-orange-500 hover:bg-orange-600 text-white">
                {createPrice.isPending ? "Ajout..." : "Ajouter l'article"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Table des prix */}
      {prices && prices.length > 0 ? (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="px-4 py-3 text-left font-medium">Code</th>
                    <th className="px-4 py-3 text-left font-medium">Désignation</th>
                    <th className="px-4 py-3 text-left font-medium">Catégorie</th>
                    <th className="px-4 py-3 text-center font-medium">Unité</th>
                    <th className="px-4 py-3 text-right font-medium">Prix unitaire (XOF)</th>
                    <th className="px-4 py-3 text-center font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {prices.map((item: any) => (
                    <tr key={item.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3 font-mono text-xs">{item.itemCode}</td>
                      <td className="px-4 py-3 font-medium">{item.itemName}</td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
                          {categories.find((c) => c.value === item.category)?.label || item.category}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center text-muted-foreground">{item.unit}</td>
                      <td className="px-4 py-3 text-right">
                        {editingId === item.id ? (
                          <div className="flex items-center justify-end gap-2">
                            <Input
                              type="number"
                              className="w-32 h-8 text-right"
                              value={editPrice}
                              onChange={(e) => setEditPrice(e.target.value)}
                              onKeyDown={(e) => { if (e.key === "Enter") handleUpdatePrice(item.id); if (e.key === "Escape") setEditingId(null); }}
                              autoFocus
                            />
                            <Button size="sm" variant="ghost" onClick={() => handleUpdatePrice(item.id)}>OK</Button>
                          </div>
                        ) : (
                          <span className="font-semibold">{Number(item.unitPrice).toLocaleString("fr-FR")}</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => { setEditingId(item.id); setEditPrice(String(item.unitPrice)); }}
                          title="Modifier le prix"
                        >
                          <Pencil size={14} />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <DollarSign className="text-muted-foreground mb-3" size={40} />
            <p className="text-muted-foreground text-center">Aucun article dans le catalogue de prix.</p>
            <p className="text-xs text-muted-foreground mt-1">Ajoutez des articles pour le chiffrage automatique des projets.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ============================================================
// ONGLET PARAMÈTRES TECHNIQUES
// ============================================================

function ParametersTab() {
  const utils = trpc.useUtils();
  const { data: params, isLoading } = trpc.erp.solar.settings.parameters.list.useQuery();
  const upsertParam = trpc.erp.solar.settings.parameters.upsert.useMutation({
    onSuccess: () => {
      utils.erp.solar.settings.parameters.list.invalidate();
      toast.success("Paramètre technique enregistré");
    },
    onError: (err) => {
      toast.error(err.message);
    },
  });

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ parameterCode: "", parameterName: "", parameterValue: "", unit: "", description: "" });

  const handleUpsert = () => {
    if (!form.parameterCode || !form.parameterName || !form.parameterValue) {
      toast.error("Code, nom et valeur sont obligatoires.");
      return;
    }
    upsertParam.mutate({
      parameterCode: form.parameterCode,
      parameterName: form.parameterName,
      parameterValue: parseFloat(form.parameterValue),
      unit: form.unit || undefined,
      description: form.description || undefined,
    });
    setOpen(false);
    setForm({ parameterCode: "", parameterName: "", parameterValue: "", unit: "", description: "" });
  };

  if (isLoading) {
    return <div className="flex items-center justify-center py-12"><div className="h-8 w-8 animate-spin rounded-full border-2 border-orange-500 border-t-transparent" /></div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Paramètres techniques par défaut utilisés dans les calculs de dimensionnement.
        </p>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="bg-orange-500 hover:bg-orange-600 text-white">
              <Plus size={16} className="mr-2" /> Ajouter / Modifier
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Paramètre technique</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="paramCode">Code paramètre *</Label>
                  <Input id="paramCode" placeholder="Ex: GLOBAL_EFFICIENCY" value={form.parameterCode} onChange={(e) => setForm({ ...form, parameterCode: e.target.value })} />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="paramName">Nom *</Label>
                  <Input id="paramName" placeholder="Ex: Rendement global" value={form.parameterName} onChange={(e) => setForm({ ...form, parameterName: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="paramValue">Valeur *</Label>
                  <Input id="paramValue" type="number" step="0.01" placeholder="Ex: 0.75" value={form.parameterValue} onChange={(e) => setForm({ ...form, parameterValue: e.target.value })} />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="paramUnit">Unité</Label>
                  <Input id="paramUnit" placeholder="Ex: %, V, h" value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} />
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="paramDesc">Description</Label>
                <Input id="paramDesc" placeholder="Ex: Ratio entre énergie produite et énergie utile" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              </div>
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline">Annuler</Button>
              </DialogClose>
              <Button onClick={handleUpsert} disabled={upsertParam.isPending} className="bg-orange-500 hover:bg-orange-600 text-white">
                {upsertParam.isPending ? "Enregistrement..." : "Enregistrer"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Table des paramètres */}
      {params && params.length > 0 ? (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="px-4 py-3 text-left font-medium">Code</th>
                    <th className="px-4 py-3 text-left font-medium">Nom</th>
                    <th className="px-4 py-3 text-center font-medium">Valeur</th>
                    <th className="px-4 py-3 text-center font-medium">Unité</th>
                    <th className="px-4 py-3 text-left font-medium">Description</th>
                  </tr>
                </thead>
                <tbody>
                  {params.map((p: any) => (
                    <tr key={p.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3 font-mono text-xs">{p.parameterCode}</td>
                      <td className="px-4 py-3 font-medium">{p.parameterName}</td>
                      <td className="px-4 py-3 text-center">
                        <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-semibold text-green-700">
                          {p.parameterValue}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center text-muted-foreground">{p.unit || "—"}</td>
                      <td className="px-4 py-3 text-muted-foreground text-xs">{p.description || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Settings className="text-muted-foreground mb-3" size={40} />
            <p className="text-muted-foreground text-center">Aucun paramètre technique configuré.</p>
            <p className="text-xs text-muted-foreground mt-1">Ajoutez des paramètres par défaut pour le dimensionnement (rendement, autonomie, etc.).</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
