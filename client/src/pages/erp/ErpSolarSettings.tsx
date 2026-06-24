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
import { ArrowLeft, Sun, Plus, MapPin, DollarSign, Settings, Pencil, Copy } from "lucide-react";

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

const SOLAR_CATEGORIES = [
  { value: "panneaux_solaires", label: "Panneaux solaires" },
  { value: "batteries_lithium", label: "Batteries lithium" },
  { value: "batteries_plomb", label: "Batteries plomb" },
  { value: "onduleurs", label: "Onduleurs" },
  { value: "regulateurs", label: "Régulateurs" },
  { value: "cables_solaires", label: "Câbles solaires" },
  { value: "protections_solaires", label: "Protections solaires" },
  { value: "structures", label: "Structures" },
  { value: "accessoires_solaires", label: "Accessoires solaires" },
  { value: "monitoring_solaire", label: "Monitoring solaire" },
  { value: "services", label: "Services" },
  { value: "maintenance", label: "Maintenance" },
  { value: "transport", label: "Transport" },
  { value: "autres", label: "Autres" },
];

const SOLAR_UNITS = [
  { value: "pcs", label: "pcs (pièce)" },
  { value: "m", label: "m (mètre)" },
  { value: "paire", label: "paire" },
  { value: "kit", label: "kit" },
  { value: "lot", label: "lot" },
  { value: "kWc", label: "kWc (kilowatt-crête)" },
  { value: "Wh", label: "Wh (Watt-heure)" },
  { value: "Ah", label: "Ah (Ampère-heure)" },
  { value: "W", label: "W (Watt)" },
  { value: "forfait", label: "forfait" },
];

const QUALITY_LEVELS = [
  { value: "economique", label: "Économique" },
  { value: "bon_rapport", label: "Bon rapport qualité/prix" },
  { value: "premium", label: "Premium" },
];

const USAGE_OPTIONS = [
  { value: "residentiel", label: "Résidentiel" },
  { value: "commercial", label: "Commercial" },
  { value: "industriel", label: "Industriel" },
  { value: "telecom", label: "Site télécom" },
  { value: "backup", label: "Backup" },
];

type PriceForm = {
  itemCode: string;
  itemName: string;
  category: string;
  unit: string;
  unitPrice: string;
  brand: string;
  model: string;
  qualityLevel: string;
  recommendedUsage: string;
};

const emptyForm: PriceForm = { itemCode: "", itemName: "", category: "panneaux_solaires", unit: "pcs", unitPrice: "", brand: "", model: "", qualityLevel: "bon_rapport", recommendedUsage: "" };

function PricesTab() {
  const utils = trpc.useUtils();
  const { data: prices, isLoading } = trpc.erp.solar.settings.priceCatalog.list.useQuery();
  const createPrice = trpc.erp.solar.settings.priceCatalog.create.useMutation({
    onSuccess: (res) => {
      utils.erp.solar.settings.priceCatalog.list.invalidate();
      toast.success(res.updated ? "Article mis à jour" : "Article ajouté au catalogue");
    },
    onError: (err) => {
      toast.error(err.message);
    },
  });
  const updatePrice = trpc.erp.solar.settings.priceCatalog.update.useMutation({
    onSuccess: () => {
      utils.erp.solar.settings.priceCatalog.list.invalidate();
      toast.success("Article mis à jour");
    },
    onError: (err) => {
      toast.error(err.message);
    },
  });

  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editPrice, setEditPrice] = useState("");
  const [form, setForm] = useState<PriceForm>(emptyForm);
  const [filterCategory, setFilterCategory] = useState<string>("all");

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
      brand: form.brand || undefined,
      model: form.model || undefined,
      qualityLevel: form.qualityLevel || undefined,
      recommendedUsage: form.recommendedUsage || undefined,
    });
    setOpen(false);
    setForm(emptyForm);
  };

  const handleEdit = (item: any) => {
    setForm({
      itemCode: item.itemCode,
      itemName: item.itemName,
      category: item.category,
      unit: item.unit,
      unitPrice: String(item.unitPrice),
      brand: item.brand || "",
      model: item.model || "",
      qualityLevel: item.qualityLevel || "bon_rapport",
      recommendedUsage: item.recommendedUsage || "",
    });
    setOpen(true);
  };

  const handleDuplicate = (item: any) => {
    setForm({
      itemCode: item.itemCode + "-COPY",
      itemName: item.itemName + " (copie)",
      category: item.category,
      unit: item.unit,
      unitPrice: String(item.unitPrice),
      brand: item.brand || "",
      model: item.model || "",
      qualityLevel: item.qualityLevel || "bon_rapport",
      recommendedUsage: item.recommendedUsage || "",
    });
    setOpen(true);
  };

  const handleUpdatePrice = (id: number) => {
    if (!editPrice) return;
    updatePrice.mutate({ id, unitPrice: parseFloat(editPrice) });
    setEditingId(null);
    setEditPrice("");
  };

  const filteredPrices = prices?.filter((p: any) => filterCategory === "all" || p.category === filterCategory) || [];

  if (isLoading) {
    return <div className="flex items-center justify-center py-12"><div className="h-8 w-8 animate-spin rounded-full border-2 border-orange-500 border-t-transparent" /></div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <p className="text-sm text-muted-foreground">
            Catalogue des prix unitaires — {filteredPrices.length} article(s)
          </p>
          <Select value={filterCategory} onValueChange={setFilterCategory}>
            <SelectTrigger className="w-48 h-8 text-xs">
              <SelectValue placeholder="Filtrer par catégorie" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes les catégories</SelectItem>
              {SOLAR_CATEGORIES.map((c) => (
                <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setForm(emptyForm); }}>
          <DialogTrigger asChild>
            <Button className="bg-orange-500 hover:bg-orange-600 text-white">
              <Plus size={16} className="mr-2" /> Ajouter un article
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{form.itemCode && !form.itemCode.endsWith("-COPY") && prices?.some((p: any) => p.itemCode === form.itemCode) ? "Modifier l'article" : "Nouvel article au catalogue"}</DialogTitle>
            </DialogHeader>
            <div className="grid gap-3 py-4 max-h-[60vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-1">
                  <Label className="text-xs">Code article *</Label>
                  <Input placeholder="Ex: PNL-JAS-550W" value={form.itemCode} onChange={(e) => setForm({ ...form, itemCode: e.target.value })} />
                </div>
                <div className="grid gap-1">
                  <Label className="text-xs">Nom article *</Label>
                  <Input placeholder="Ex: Panneau JA Solar 550W" value={form.itemName} onChange={(e) => setForm({ ...form, itemName: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-1">
                  <Label className="text-xs">Catégorie *</Label>
                  <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {SOLAR_CATEGORIES.map((c) => (
                        <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-1">
                  <Label className="text-xs">Unité *</Label>
                  <Select value={form.unit} onValueChange={(v) => setForm({ ...form, unit: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {SOLAR_UNITS.map((u) => (
                        <SelectItem key={u.value} value={u.value}>{u.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-1">
                  <Label className="text-xs">Marque</Label>
                  <Input placeholder="Ex: JA Solar" value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })} />
                </div>
                <div className="grid gap-1">
                  <Label className="text-xs">Modèle</Label>
                  <Input placeholder="Ex: 550W mono PERC" value={form.model} onChange={(e) => setForm({ ...form, model: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-1">
                  <Label className="text-xs">Niveau qualité</Label>
                  <Select value={form.qualityLevel} onValueChange={(v) => setForm({ ...form, qualityLevel: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {QUALITY_LEVELS.map((q) => (
                        <SelectItem key={q.value} value={q.value}>{q.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-1">
                  <Label className="text-xs">Usage recommandé</Label>
                  <Input placeholder="residentiel,commercial" value={form.recommendedUsage} onChange={(e) => setForm({ ...form, recommendedUsage: e.target.value })} />
                  <p className="text-[10px] text-muted-foreground">Séparer par virgule</p>
                </div>
              </div>
              <div className="grid gap-1">
                <Label className="text-xs">Prix unitaire (XOF) *</Label>
                <Input type="number" min="0" placeholder="Ex: 80000" value={form.unitPrice} onChange={(e) => setForm({ ...form, unitPrice: e.target.value })} />
              </div>
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline">Annuler</Button>
              </DialogClose>
              <Button onClick={handleCreate} disabled={createPrice.isPending} className="bg-orange-500 hover:bg-orange-600 text-white">
                {createPrice.isPending ? "Enregistrement..." : "Enregistrer"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Table des prix */}
      {filteredPrices.length > 0 ? (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="px-3 py-3 text-left font-medium">Code</th>
                    <th className="px-3 py-3 text-left font-medium">Désignation</th>
                    <th className="px-3 py-3 text-left font-medium">Marque</th>
                    <th className="px-3 py-3 text-left font-medium">Catégorie</th>
                    <th className="px-3 py-3 text-center font-medium">Qualité</th>
                    <th className="px-3 py-3 text-center font-medium">Unité</th>
                    <th className="px-3 py-3 text-right font-medium">Prix (XOF)</th>
                    <th className="px-3 py-3 text-center font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPrices.map((item: any) => (
                    <tr key={item.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                      <td className="px-3 py-2 font-mono text-xs">{item.itemCode}</td>
                      <td className="px-3 py-2">
                        <div className="font-medium text-sm">{item.itemName}</div>
                        {item.model && <div className="text-xs text-muted-foreground">{item.model}</div>}
                      </td>
                      <td className="px-3 py-2 text-sm">{item.brand || "—"}</td>
                      <td className="px-3 py-2">
                        <span className="inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
                          {SOLAR_CATEGORIES.find((c) => c.value === item.category)?.label || item.category}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-center">
                        {item.qualityLevel && (
                          <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                            item.qualityLevel === "premium" ? "bg-amber-100 text-amber-700" :
                            item.qualityLevel === "bon_rapport" ? "bg-green-100 text-green-700" :
                            "bg-gray-100 text-gray-700"
                          }`}>
                            {QUALITY_LEVELS.find((q) => q.value === item.qualityLevel)?.label || item.qualityLevel}
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-center text-muted-foreground">{item.unit}</td>
                      <td className="px-3 py-2 text-right">
                        {editingId === item.id ? (
                          <div className="flex items-center justify-end gap-1">
                            <Input
                              type="number"
                              className="w-28 h-7 text-right text-xs"
                              value={editPrice}
                              onChange={(e) => setEditPrice(e.target.value)}
                              onKeyDown={(e) => { if (e.key === "Enter") handleUpdatePrice(item.id); if (e.key === "Escape") setEditingId(null); }}
                              autoFocus
                            />
                            <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => handleUpdatePrice(item.id)}>OK</Button>
                          </div>
                        ) : (
                          <span className="font-semibold cursor-pointer hover:text-orange-600" onClick={() => { setEditingId(item.id); setEditPrice(String(item.unitPrice)); }}>
                            {Number(item.unitPrice).toLocaleString("fr-FR")}
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleEdit(item)} title="Modifier">
                            <Pencil size={14} />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleDuplicate(item)} title="Dupliquer">
                            <Copy size={14} />
                          </Button>
                        </div>
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
  const [editMode, setEditMode] = useState(false);
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
    setEditMode(false);
    setForm({ parameterCode: "", parameterName: "", parameterValue: "", unit: "", description: "" });
  };

  const handleEdit = (p: any) => {
    setForm({
      parameterCode: p.parameterCode,
      parameterName: p.parameterName,
      parameterValue: String(p.parameterValue),
      unit: p.unit || "",
      description: p.description || "",
    });
    setEditMode(true);
    setOpen(true);
  };

  const handleDuplicate = (p: any) => {
    setForm({
      parameterCode: p.parameterCode + "_COPY",
      parameterName: p.parameterName + " (copie)",
      parameterValue: String(p.parameterValue),
      unit: p.unit || "",
      description: p.description || "",
    });
    setEditMode(false);
    setOpen(true);
  };

  const handleOpenNew = () => {
    setForm({ parameterCode: "", parameterName: "", parameterValue: "", unit: "", description: "" });
    setEditMode(false);
    setOpen(true);
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
        <Button onClick={handleOpenNew} className="bg-orange-500 hover:bg-orange-600 text-white">
          <Plus size={16} className="mr-2" /> Ajouter un paramètre
        </Button>
      </div>

      {/* Dialog création / modification */}
      <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setEditMode(false); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editMode ? "Modifier le paramètre" : "Nouveau paramètre technique"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="paramCode">Code paramètre *</Label>
                <Input id="paramCode" placeholder="Ex: GLOBAL_EFFICIENCY" value={form.parameterCode} onChange={(e) => setForm({ ...form, parameterCode: e.target.value })} disabled={editMode} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="paramName">Nom *</Label>
                <Input id="paramName" placeholder="Ex: Rendement global" value={form.parameterName} onChange={(e) => setForm({ ...form, parameterName: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="paramValue">Valeur *</Label>
                <Input id="paramValue" type="number" step="0.0001" placeholder="Ex: 0.75" value={form.parameterValue} onChange={(e) => setForm({ ...form, parameterValue: e.target.value })} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="paramUnit">Unité</Label>
                <Input id="paramUnit" placeholder="Ex: %, V, h, m" value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} />
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
              {upsertParam.isPending ? "Enregistrement..." : editMode ? "Mettre à jour" : "Enregistrer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
                    <th className="px-4 py-3 text-center font-medium">Actions</th>
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
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-orange-600" title="Modifier" onClick={() => handleEdit(p)}>
                            <Pencil size={14} />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-blue-600" title="Dupliquer" onClick={() => handleDuplicate(p)}>
                            <Copy size={14} />
                          </Button>
                        </div>
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
            <Settings className="text-muted-foreground mb-3" size={40} />
            <p className="text-muted-foreground text-center">Aucun paramètre technique configuré.</p>
            <p className="text-xs text-muted-foreground mt-1">Ajoutez des paramètres par défaut pour le dimensionnement (rendement, autonomie, etc.).</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
