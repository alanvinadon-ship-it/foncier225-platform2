import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useErpPermissions } from "@/hooks/useErpPermissions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Package, Plus, ArrowDown, ArrowUp, AlertTriangle, MapPin, Search } from "lucide-react";

const CATEGORIES = [
  { value: "cement", label: "Ciment" },
  { value: "steel", label: "Acier" },
  { value: "wood", label: "Bois" },
  { value: "sand", label: "Sable" },
  { value: "gravel", label: "Gravier" },
  { value: "bricks", label: "Briques" },
  { value: "plumbing", label: "Plomberie" },
  { value: "electrical", label: "Électricité" },
  { value: "paint", label: "Peinture" },
  { value: "tools", label: "Outils" },
  { value: "safety_equipment", label: "Équipement sécurité" },
  { value: "other", label: "Autre" },
];

const UNITS = [
  { value: "kg", label: "kg" },
  { value: "tonne", label: "Tonne" },
  { value: "m3", label: "m³" },
  { value: "m2", label: "m²" },
  { value: "ml", label: "ml" },
  { value: "piece", label: "Pièce" },
  { value: "sac", label: "Sac" },
  { value: "litre", label: "Litre" },
  { value: "lot", label: "Lot" },
  { value: "palette", label: "Palette" },
];

const MOVEMENT_TYPES = [
  { value: "IN", label: "Entrée", color: "bg-green-100 text-green-800" },
  { value: "OUT", label: "Sortie", color: "bg-red-100 text-red-800" },
  { value: "TRANSFER", label: "Transfert", color: "bg-blue-100 text-blue-800" },
  { value: "ADJUSTMENT", label: "Ajustement", color: "bg-yellow-100 text-yellow-800" },
  { value: "WASTAGE", label: "Perte", color: "bg-orange-100 text-orange-800" },
  { value: "RETURN", label: "Retour", color: "bg-purple-100 text-purple-800" },
];

function formatXOF(amount: number) {
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "XOF", maximumFractionDigits: 0 }).format(amount);
}

export default function ErpInventory() {
  const { hasPermission } = useErpPermissions();
  const canView = hasPermission("erp_inventory", "view");
  const canCreate = hasPermission("erp_inventory", "create");
  const canEdit = hasPermission("erp_inventory", "update");
  const [tab, setTab] = useState("items");
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showMovementDialog, setShowMovementDialog] = useState(false);
  const [selectedItemId, setSelectedItemId] = useState<number | null>(null);
  const [showLocationDialog, setShowLocationDialog] = useState(false);

  // Queries
  const statsQuery = trpc.erp.inventory.stats.useQuery();
  const itemsQuery = trpc.erp.inventory.listItems.useQuery({
    search: search || undefined,
    category: categoryFilter || undefined,
    limit: 50,
    offset: 0,
  });
  const criticalQuery = trpc.erp.inventory.criticalStock.useQuery();
  const locationsQuery = trpc.erp.inventory.listLocations.useQuery();
  const movementsQuery = trpc.erp.inventory.listMovements.useQuery({ limit: 30, offset: 0 });

  // Mutations
  const createItem = trpc.erp.inventory.createItem.useMutation({
    onSuccess: () => { toast.success("Article créé"); setShowCreateDialog(false); itemsQuery.refetch(); statsQuery.refetch(); },
    onError: (e) => toast.error(e.message),
  });
  const addMovement = trpc.erp.inventory.addMovement.useMutation({
    onSuccess: (data) => { toast.success(`Stock mis à jour: ${data.previousStock} → ${data.newStock}`); setShowMovementDialog(false); itemsQuery.refetch(); criticalQuery.refetch(); statsQuery.refetch(); movementsQuery.refetch(); },
    onError: (e) => toast.error(e.message),
  });
  const createLocation = trpc.erp.inventory.createLocation.useMutation({
    onSuccess: () => { toast.success("Emplacement créé"); setShowLocationDialog(false); locationsQuery.refetch(); },
    onError: (e) => toast.error(e.message),
  });

  // Form states
  const [itemForm, setItemForm] = useState({ sku: "", name: "", category: "cement", unit: "kg", minStock: 10, maxStock: 100, currentStock: 0, unitPrice: 0 });
  const [movementForm, setMovementForm] = useState({ type: "IN" as string, quantity: 1, reference: "", notes: "" });
  const [locationForm, setLocationForm] = useState({ name: "", address: "" });

  if (!canView) return <div className="p-6 text-center text-muted-foreground">Accès non autorisé</div>;

  const stats = statsQuery.data;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Package className="h-6 w-6 text-primary" />
            Inventaire
          </h1>
          <p className="text-muted-foreground">Gestion des stocks et mouvements</p>
        </div>
        <div className="flex gap-2">
          {canCreate && (
            <>
              <Button variant="outline" size="sm" onClick={() => setShowLocationDialog(true)}>
                <MapPin className="h-4 w-4 mr-1" /> Emplacement
              </Button>
              <Button size="sm" onClick={() => setShowCreateDialog(true)}>
                <Plus className="h-4 w-4 mr-1" /> Nouvel article
              </Button>
            </>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
          <Card><CardContent className="p-3 text-center"><p className="text-xs text-muted-foreground">Articles</p><p className="text-xl font-bold">{stats.totalItems}</p></CardContent></Card>
          <Card><CardContent className="p-3 text-center"><p className="text-xs text-muted-foreground">Stock total</p><p className="text-xl font-bold">{stats.totalStock.toLocaleString()}</p></CardContent></Card>
          <Card><CardContent className="p-3 text-center"><p className="text-xs text-muted-foreground">Valeur</p><p className="text-xl font-bold text-green-600">{formatXOF(stats.totalValue)}</p></CardContent></Card>
          <Card className="border-red-200"><CardContent className="p-3 text-center"><p className="text-xs text-muted-foreground">Critique</p><p className="text-xl font-bold text-red-600">{stats.criticalItems}</p></CardContent></Card>
          <Card className="border-orange-200"><CardContent className="p-3 text-center"><p className="text-xs text-muted-foreground">Rupture</p><p className="text-xl font-bold text-orange-600">{stats.outOfStockItems}</p></CardContent></Card>
          <Card><CardContent className="p-3 text-center"><p className="text-xs text-muted-foreground">Emplacements</p><p className="text-xl font-bold">{stats.locations}</p></CardContent></Card>
          <Card><CardContent className="p-3 text-center"><p className="text-xs text-muted-foreground">Mvts aujourd'hui</p><p className="text-xl font-bold">{stats.movementsToday}</p></CardContent></Card>
        </div>
      )}

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="items">Articles</TabsTrigger>
          <TabsTrigger value="critical">
            Stock critique
            {criticalQuery.data && criticalQuery.data.length > 0 && (
              <Badge variant="destructive" className="ml-1 text-xs">{criticalQuery.data.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="movements">Mouvements</TabsTrigger>
          <TabsTrigger value="locations">Emplacements</TabsTrigger>
        </TabsList>

        {/* TAB: Articles */}
        <TabsContent value="items" className="space-y-4">
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Rechercher un article..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-48"><SelectValue placeholder="Catégorie" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes</SelectItem>
                {CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left p-3">SKU</th>
                  <th className="text-left p-3">Nom</th>
                  <th className="text-left p-3">Catégorie</th>
                  <th className="text-right p-3">Stock</th>
                  <th className="text-right p-3">Min</th>
                  <th className="text-right p-3">Prix unit.</th>
                  <th className="text-right p-3">Valeur</th>
                  <th className="text-center p-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {itemsQuery.data?.items.map(item => (
                  <tr key={item.id} className="border-t hover:bg-muted/30">
                    <td className="p-3 font-mono text-xs">{item.sku}</td>
                    <td className="p-3 font-medium">{item.name}</td>
                    <td className="p-3"><Badge variant="outline">{CATEGORIES.find(c => c.value === item.category)?.label || item.category}</Badge></td>
                    <td className="p-3 text-right">
                      <span className={item.currentStock < item.minStock ? "text-red-600 font-bold" : ""}>
                        {item.currentStock}
                      </span>
                      <span className="text-muted-foreground text-xs ml-1">{item.unit}</span>
                    </td>
                    <td className="p-3 text-right text-muted-foreground">{item.minStock}</td>
                    <td className="p-3 text-right">{formatXOF(item.unitPrice)}</td>
                    <td className="p-3 text-right font-medium">{formatXOF(item.currentStock * item.unitPrice)}</td>
                    <td className="p-3 text-center">
                      {canEdit && (
                        <Button variant="ghost" size="sm" onClick={() => { setSelectedItemId(item.id); setShowMovementDialog(true); }}>
                          Mouvement
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
                {itemsQuery.data?.items.length === 0 && (
                  <tr><td colSpan={8} className="p-6 text-center text-muted-foreground">Aucun article trouvé</td></tr>
                )}
              </tbody>
            </table>
          </div>
          {itemsQuery.data && <p className="text-xs text-muted-foreground">{itemsQuery.data.total} article(s) au total</p>}
        </TabsContent>

        {/* TAB: Stock critique */}
        <TabsContent value="critical" className="space-y-4">
          {criticalQuery.data && criticalQuery.data.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-green-500" />
              <p>Aucun article en stock critique</p>
            </div>
          ) : (
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-red-50">
                  <tr>
                    <th className="text-left p-3">Article</th>
                    <th className="text-right p-3">Stock actuel</th>
                    <th className="text-right p-3">Stock min.</th>
                    <th className="text-right p-3">Déficit</th>
                    <th className="text-right p-3">% du min.</th>
                    <th className="text-center p-3">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {criticalQuery.data?.map(item => (
                    <tr key={item.id} className="border-t">
                      <td className="p-3">
                        <span className="font-medium">{item.name}</span>
                        <span className="text-xs text-muted-foreground ml-2">{item.sku}</span>
                      </td>
                      <td className="p-3 text-right text-red-600 font-bold">{item.currentStock} {item.unit}</td>
                      <td className="p-3 text-right">{item.minStock} {item.unit}</td>
                      <td className="p-3 text-right font-bold text-red-700">-{item.deficit}</td>
                      <td className="p-3 text-right">
                        <Badge variant={item.percentOfMin < 25 ? "destructive" : "secondary"}>{item.percentOfMin}%</Badge>
                      </td>
                      <td className="p-3 text-center">
                        {canEdit && (
                          <Button variant="outline" size="sm" onClick={() => { setSelectedItemId(item.id); setMovementForm({ type: "IN", quantity: item.deficit, reference: "", notes: "Réapprovisionnement stock critique" }); setShowMovementDialog(true); }}>
                            <ArrowDown className="h-3 w-3 mr-1" /> Réapprovisionner
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>

        {/* TAB: Mouvements */}
        <TabsContent value="movements" className="space-y-4">
          <div className="border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left p-3">Date</th>
                  <th className="text-left p-3">Type</th>
                  <th className="text-right p-3">Quantité</th>
                  <th className="text-right p-3">Avant</th>
                  <th className="text-right p-3">Après</th>
                  <th className="text-left p-3">Référence</th>
                </tr>
              </thead>
              <tbody>
                {movementsQuery.data?.movements.map(m => {
                  const typeInfo = MOVEMENT_TYPES.find(t => t.value === m.type);
                  return (
                    <tr key={m.id} className="border-t">
                      <td className="p-3 text-xs">{new Date(m.createdAt).toLocaleString("fr-FR")}</td>
                      <td className="p-3"><Badge className={typeInfo?.color}>{typeInfo?.label || m.type}</Badge></td>
                      <td className="p-3 text-right font-mono">{m.type === "OUT" || m.type === "WASTAGE" ? `-${m.quantity}` : `+${m.quantity}`}</td>
                      <td className="p-3 text-right text-muted-foreground">{m.previousStock}</td>
                      <td className="p-3 text-right font-medium">{m.newStock}</td>
                      <td className="p-3 text-xs text-muted-foreground">{m.reference || "—"}</td>
                    </tr>
                  );
                })}
                {movementsQuery.data?.movements.length === 0 && (
                  <tr><td colSpan={6} className="p-6 text-center text-muted-foreground">Aucun mouvement enregistré</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </TabsContent>

        {/* TAB: Emplacements */}
        <TabsContent value="locations" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {locationsQuery.data?.map(loc => (
              <Card key={loc.id}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <MapPin className="h-4 w-4" /> {loc.name}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">{loc.address || "Pas d'adresse"}</p>
                  {loc.description && <p className="text-xs mt-1">{loc.description}</p>}
                </CardContent>
              </Card>
            ))}
            {locationsQuery.data?.length === 0 && (
              <div className="col-span-full text-center py-8 text-muted-foreground">Aucun emplacement configuré</div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Dialog: Créer article */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Nouvel article</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium">SKU *</label>
                <Input value={itemForm.sku} onChange={(e) => setItemForm({ ...itemForm, sku: e.target.value })} placeholder="MAT-001" />
              </div>
              <div>
                <label className="text-xs font-medium">Nom *</label>
                <Input value={itemForm.name} onChange={(e) => setItemForm({ ...itemForm, name: e.target.value })} placeholder="Ciment Portland" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium">Catégorie</label>
                <Select value={itemForm.category} onValueChange={(v) => setItemForm({ ...itemForm, category: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs font-medium">Unité</label>
                <Select value={itemForm.unit} onValueChange={(v) => setItemForm({ ...itemForm, unit: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{UNITS.map(u => <SelectItem key={u.value} value={u.value}>{u.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-medium">Stock min.</label>
                <Input type="number" value={itemForm.minStock} onChange={(e) => setItemForm({ ...itemForm, minStock: Number(e.target.value) })} />
              </div>
              <div>
                <label className="text-xs font-medium">Stock max.</label>
                <Input type="number" value={itemForm.maxStock} onChange={(e) => setItemForm({ ...itemForm, maxStock: Number(e.target.value) })} />
              </div>
              <div>
                <label className="text-xs font-medium">Stock initial</label>
                <Input type="number" value={itemForm.currentStock} onChange={(e) => setItemForm({ ...itemForm, currentStock: Number(e.target.value) })} />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium">Prix unitaire (FCFA)</label>
              <Input type="number" value={itemForm.unitPrice} onChange={(e) => setItemForm({ ...itemForm, unitPrice: Number(e.target.value) })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>Annuler</Button>
            <Button onClick={() => createItem.mutate(itemForm)} disabled={createItem.isPending || !itemForm.sku || !itemForm.name}>
              {createItem.isPending ? "Création..." : "Créer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Mouvement stock */}
      <Dialog open={showMovementDialog} onOpenChange={setShowMovementDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Mouvement de stock</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium">Type de mouvement</label>
              <Select value={movementForm.type} onValueChange={(v) => setMovementForm({ ...movementForm, type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{MOVEMENT_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium">Quantité</label>
              <Input type="number" min={1} value={movementForm.quantity} onChange={(e) => setMovementForm({ ...movementForm, quantity: Number(e.target.value) })} />
            </div>
            <div>
              <label className="text-xs font-medium">Référence</label>
              <Input value={movementForm.reference} onChange={(e) => setMovementForm({ ...movementForm, reference: e.target.value })} placeholder="BL-2024-001" />
            </div>
            <div>
              <label className="text-xs font-medium">Notes</label>
              <Input value={movementForm.notes} onChange={(e) => setMovementForm({ ...movementForm, notes: e.target.value })} placeholder="Optionnel" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowMovementDialog(false)}>Annuler</Button>
            <Button onClick={() => { if (selectedItemId) addMovement.mutate({ itemId: selectedItemId, type: movementForm.type as any, quantity: movementForm.quantity, reference: movementForm.reference || undefined, notes: movementForm.notes || undefined }); }} disabled={addMovement.isPending || !selectedItemId}>
              {addMovement.isPending ? "Enregistrement..." : "Enregistrer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Créer emplacement */}
      <Dialog open={showLocationDialog} onOpenChange={setShowLocationDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Nouvel emplacement</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium">Nom *</label>
              <Input value={locationForm.name} onChange={(e) => setLocationForm({ ...locationForm, name: e.target.value })} placeholder="Entrepôt principal" />
            </div>
            <div>
              <label className="text-xs font-medium">Adresse</label>
              <Input value={locationForm.address} onChange={(e) => setLocationForm({ ...locationForm, address: e.target.value })} placeholder="Zone industrielle, Abidjan" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowLocationDialog(false)}>Annuler</Button>
            <Button onClick={() => createLocation.mutate(locationForm)} disabled={createLocation.isPending || !locationForm.name}>
              {createLocation.isPending ? "Création..." : "Créer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
