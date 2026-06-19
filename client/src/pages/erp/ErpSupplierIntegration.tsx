import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { useErpPermissions } from "@/hooks/useErpPermissions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Link2, Plus, Star, RefreshCw, ArrowDownUp, Zap } from "lucide-react";

const INTEGRATION_TYPES = [
  { value: "api", label: "API" },
  { value: "edi", label: "EDI" },
  { value: "email", label: "Email" },
  { value: "manual", label: "Manuel" },
];

const SYNC_FREQUENCIES = [
  { value: "manual", label: "Manuel" },
  { value: "daily", label: "Quotidien" },
  { value: "weekly", label: "Hebdomadaire" },
  { value: "monthly", label: "Mensuel" },
];

const SYNC_STATUS_COLORS: Record<string, string> = {
  never: "bg-gray-100 text-gray-700",
  success: "bg-green-100 text-green-800",
  error: "bg-red-100 text-red-800",
  pending: "bg-yellow-100 text-yellow-800",
};

function formatXOF(amount: number) {
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "XOF", maximumFractionDigits: 0 }).format(amount);
}

export default function ErpSupplierIntegration() {
  const { hasPermission } = useErpPermissions();
  const canView = hasPermission("inventory", "view");
  const canCreate = hasPermission("inventory", "create");
  const canEdit = hasPermission("inventory", "edit");

  const [tab, setTab] = useState("prices");
  const [showPriceDialog, setShowPriceDialog] = useState(false);
  const [showIntegrationDialog, setShowIntegrationDialog] = useState(false);
  const [compareItemId, setCompareItemId] = useState<number | null>(null);

  const utils = trpc.useUtils();

  // Queries
  const pricesQuery = trpc.erp.supplierIntegration.listPrices.useQuery({ limit: 100, offset: 0 });
  const integrationsQuery = trpc.erp.supplierIntegration.listIntegrations.useQuery({ limit: 100, offset: 0 });
  const vendorsQuery = trpc.erp.vendors.list.useQuery({ limit: 200, offset: 0 });
  const itemsQuery = trpc.erp.inventory.listItems.useQuery({ limit: 200, offset: 0 });

  const compareQuery = trpc.erp.supplierIntegration.compareSuppliers.useQuery(
    { itemId: compareItemId! },
    { enabled: !!compareItemId }
  );

  // Mutations
  const createPrice = trpc.erp.supplierIntegration.createPrice.useMutation({
    onSuccess: () => { toast.success("Prix fournisseur ajouté"); setShowPriceDialog(false); pricesQuery.refetch(); },
    onError: (e) => toast.error(e.message),
  });
  const setPreferred = trpc.erp.supplierIntegration.setPreferred.useMutation({
    onSuccess: () => { toast.success("Fournisseur préféré défini"); pricesQuery.refetch(); if (compareItemId) compareQuery.refetch(); },
    onError: (e) => toast.error(e.message),
  });
  const deletePrice = trpc.erp.supplierIntegration.deletePrice.useMutation({
    onSuccess: () => { toast.success("Prix supprimé"); pricesQuery.refetch(); },
    onError: (e) => toast.error(e.message),
  });
  const createIntegration = trpc.erp.supplierIntegration.createIntegration.useMutation({
    onSuccess: () => { toast.success("Intégration créée"); setShowIntegrationDialog(false); integrationsQuery.refetch(); },
    onError: (e) => toast.error(e.message),
  });
  const syncIntegration = trpc.erp.supplierIntegration.sync.useMutation({
    onSuccess: () => { toast.success("Synchronisation réussie"); integrationsQuery.refetch(); },
    onError: (e) => toast.error(e.message),
  });

  // Form state
  const [priceForm, setPriceForm] = useState({
    vendorId: 0,
    itemId: 0,
    unitPrice: 0,
    leadTimeDays: 0,
    minOrderQty: 1,
    isPreferred: false,
    notes: "",
  });

  const [integrationForm, setIntegrationForm] = useState({
    vendorId: 0,
    integrationType: "manual" as "api" | "edi" | "email" | "manual",
    apiUrl: "",
    syncFrequency: "manual" as "manual" | "daily" | "weekly" | "monthly",
    isActive: true,
  });

  // KPI
  const prices = pricesQuery.data?.items || [];
  const integrations = integrationsQuery.data?.items || [];
  const totalPrices = prices.length;
  const preferredCount = prices.filter(p => p.isPreferred).length;
  const activeIntegrations = integrations.filter(i => i.isActive).length;
  const uniqueVendors = useMemo(() => new Set(prices.map(p => p.vendorId)).size, [prices]);

  // Vendor/Item maps
  const vendorMap = useMemo(() => {
    const map = new Map<number, string>();
    (vendorsQuery.data?.items || []).forEach((v: any) => map.set(v.id, v.name));
    return map;
  }, [vendorsQuery.data]);

  const itemMap = useMemo(() => {
    const map = new Map<number, string>();
    (itemsQuery.data?.items || []).forEach((i: any) => map.set(i.id, i.name));
    return map;
  }, [itemsQuery.data]);

  if (!canView) return <div className="p-6 text-center text-muted-foreground">Accès non autorisé</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Link2 className="h-6 w-6 text-primary" />
            Intégration Fournisseurs
          </h1>
          <p className="text-muted-foreground">Gestion des prix, catalogues et intégrations fournisseurs</p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card><CardContent className="p-3 text-center"><p className="text-xs text-muted-foreground">Prix référencés</p><p className="text-xl font-bold">{totalPrices}</p></CardContent></Card>
        <Card className="border-blue-200"><CardContent className="p-3 text-center"><p className="text-xs text-muted-foreground">Fournisseurs</p><p className="text-xl font-bold text-blue-600">{uniqueVendors}</p></CardContent></Card>
        <Card className="border-green-200"><CardContent className="p-3 text-center"><p className="text-xs text-muted-foreground">Préférés</p><p className="text-xl font-bold text-green-600">{preferredCount}</p></CardContent></Card>
        <Card className="border-purple-200"><CardContent className="p-3 text-center"><p className="text-xs text-muted-foreground">Intégrations actives</p><p className="text-xl font-bold text-purple-600">{activeIntegrations}</p></CardContent></Card>
      </div>

      {/* Tabs */}
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="prices">Prix Fournisseurs</TabsTrigger>
          <TabsTrigger value="integrations">Intégrations</TabsTrigger>
          <TabsTrigger value="compare">Comparaison</TabsTrigger>
        </TabsList>

        {/* Tab: Prix Fournisseurs */}
        <TabsContent value="prices" className="space-y-4">
          <div className="flex justify-end">
            {canCreate && (
              <Button size="sm" onClick={() => setShowPriceDialog(true)}>
                <Plus className="h-4 w-4 mr-1" /> Ajouter un prix
              </Button>
            )}
          </div>

          {pricesQuery.isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Chargement...</div>
          ) : prices.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">Aucun prix fournisseur enregistré</div>
          ) : (
            <div className="overflow-x-auto border rounded-lg">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left p-3 font-medium">Fournisseur</th>
                    <th className="text-left p-3 font-medium">Article</th>
                    <th className="text-right p-3 font-medium">Prix unitaire</th>
                    <th className="text-center p-3 font-medium">Délai (j)</th>
                    <th className="text-center p-3 font-medium">Qté min</th>
                    <th className="text-center p-3 font-medium">Préféré</th>
                    <th className="text-right p-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {prices.map((p: any) => (
                    <tr key={p.id} className="border-t hover:bg-muted/30">
                      <td className="p-3">{vendorMap.get(p.vendorId) || `#${p.vendorId}`}</td>
                      <td className="p-3">{itemMap.get(p.itemId) || `#${p.itemId}`}</td>
                      <td className="p-3 text-right font-mono">{formatXOF(p.unitPrice)}</td>
                      <td className="p-3 text-center">{p.leadTimeDays}</td>
                      <td className="p-3 text-center">{p.minOrderQty}</td>
                      <td className="p-3 text-center">
                        {p.isPreferred ? (
                          <Badge className="bg-yellow-100 text-yellow-800"><Star className="h-3 w-3 mr-1" />Préféré</Badge>
                        ) : canEdit ? (
                          <Button variant="ghost" size="sm" onClick={() => setPreferred.mutate({ id: p.id })}>
                            <Star className="h-3 w-3" />
                          </Button>
                        ) : "-"}
                      </td>
                      <td className="p-3 text-right">
                        {canEdit && (
                          <Button variant="ghost" size="sm" className="text-red-600" onClick={() => deletePrice.mutate({ id: p.id })}>
                            Suppr.
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

        {/* Tab: Intégrations */}
        <TabsContent value="integrations" className="space-y-4">
          <div className="flex justify-end">
            {canCreate && (
              <Button size="sm" onClick={() => setShowIntegrationDialog(true)}>
                <Plus className="h-4 w-4 mr-1" /> Nouvelle intégration
              </Button>
            )}
          </div>

          {integrationsQuery.isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Chargement...</div>
          ) : integrations.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">Aucune intégration configurée</div>
          ) : (
            <div className="overflow-x-auto border rounded-lg">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left p-3 font-medium">Fournisseur</th>
                    <th className="text-left p-3 font-medium">Type</th>
                    <th className="text-center p-3 font-medium">Fréquence</th>
                    <th className="text-center p-3 font-medium">Statut sync</th>
                    <th className="text-center p-3 font-medium">Dernière sync</th>
                    <th className="text-center p-3 font-medium">Actif</th>
                    <th className="text-right p-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {integrations.map((integ: any) => (
                    <tr key={integ.id} className="border-t hover:bg-muted/30">
                      <td className="p-3">{vendorMap.get(integ.vendorId) || `#${integ.vendorId}`}</td>
                      <td className="p-3">
                        <Badge variant="outline">{INTEGRATION_TYPES.find(t => t.value === integ.integrationType)?.label || integ.integrationType}</Badge>
                      </td>
                      <td className="p-3 text-center">{SYNC_FREQUENCIES.find(f => f.value === integ.syncFrequency)?.label || integ.syncFrequency}</td>
                      <td className="p-3 text-center">
                        <Badge className={SYNC_STATUS_COLORS[integ.syncStatus] || ""}>{integ.syncStatus}</Badge>
                      </td>
                      <td className="p-3 text-center text-xs">
                        {integ.lastSyncAt ? new Date(integ.lastSyncAt).toLocaleDateString("fr-FR") : "Jamais"}
                      </td>
                      <td className="p-3 text-center">
                        <Badge className={integ.isActive ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-600"}>
                          {integ.isActive ? "Actif" : "Inactif"}
                        </Badge>
                      </td>
                      <td className="p-3 text-right">
                        {canEdit && integ.isActive && (
                          <Button variant="ghost" size="sm" onClick={() => syncIntegration.mutate({ id: integ.id })}>
                            <RefreshCw className="h-4 w-4" />
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

        {/* Tab: Comparaison */}
        <TabsContent value="compare" className="space-y-4">
          <div className="flex items-center gap-3">
            <Label>Sélectionner un article :</Label>
            <Select value={compareItemId?.toString() || ""} onValueChange={(v) => setCompareItemId(Number(v))}>
              <SelectTrigger className="w-64"><SelectValue placeholder="Choisir un article" /></SelectTrigger>
              <SelectContent>
                {(itemsQuery.data?.items || []).map((item: any) => (
                  <SelectItem key={item.id} value={item.id.toString()}>{item.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {!compareItemId ? (
            <div className="text-center py-8 text-muted-foreground">
              <ArrowDownUp className="h-8 w-8 mx-auto mb-2 opacity-50" />
              Sélectionnez un article pour comparer les prix fournisseurs
            </div>
          ) : compareQuery.isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Chargement...</div>
          ) : (compareQuery.data || []).length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">Aucun prix trouvé pour cet article</div>
          ) : (
            <div className="overflow-x-auto border rounded-lg">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left p-3 font-medium">Fournisseur</th>
                    <th className="text-right p-3 font-medium">Prix unitaire</th>
                    <th className="text-center p-3 font-medium">Écart (%)</th>
                    <th className="text-center p-3 font-medium">Délai (j)</th>
                    <th className="text-center p-3 font-medium">Note fournisseur</th>
                    <th className="text-center p-3 font-medium">Préféré</th>
                  </tr>
                </thead>
                <tbody>
                  {(compareQuery.data || []).map((row: any, idx: number) => (
                    <tr key={row.id} className={`border-t hover:bg-muted/30 ${idx === 0 ? "bg-green-50" : ""}`}>
                      <td className="p-3 font-medium">{row.vendorName}</td>
                      <td className="p-3 text-right font-mono">{formatXOF(row.unitPrice)}</td>
                      <td className="p-3 text-center">
                        {row.priceDiffPercent === 0 ? (
                          <Badge className="bg-green-100 text-green-800">Meilleur</Badge>
                        ) : (
                          <span className="text-orange-600">+{row.priceDiffPercent}%</span>
                        )}
                      </td>
                      <td className="p-3 text-center">{row.leadTimeDays} j</td>
                      <td className="p-3 text-center">
                        {row.vendorRating ? <span className="flex items-center justify-center gap-1"><Star className="h-3 w-3 text-yellow-500" />{(row.vendorRating / 100).toFixed(1)}</span> : "-"}
                      </td>
                      <td className="p-3 text-center">
                        {row.isPreferred ? (
                          <Badge className="bg-yellow-100 text-yellow-800">Préféré</Badge>
                        ) : canEdit ? (
                          <Button variant="ghost" size="sm" onClick={() => setPreferred.mutate({ id: row.id })}>
                            Définir
                          </Button>
                        ) : "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Dialog: Ajouter un prix */}
      <Dialog open={showPriceDialog} onOpenChange={setShowPriceDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Ajouter un prix fournisseur</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Fournisseur</Label>
              <Select value={priceForm.vendorId ? priceForm.vendorId.toString() : ""} onValueChange={(v) => setPriceForm({ ...priceForm, vendorId: Number(v) })}>
                <SelectTrigger><SelectValue placeholder="Choisir un fournisseur" /></SelectTrigger>
                <SelectContent>
                  {(vendorsQuery.data?.items || []).map((v: any) => (
                    <SelectItem key={v.id} value={v.id.toString()}>{v.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Article</Label>
              <Select value={priceForm.itemId ? priceForm.itemId.toString() : ""} onValueChange={(v) => setPriceForm({ ...priceForm, itemId: Number(v) })}>
                <SelectTrigger><SelectValue placeholder="Choisir un article" /></SelectTrigger>
                <SelectContent>
                  {(itemsQuery.data?.items || []).map((i: any) => (
                    <SelectItem key={i.id} value={i.id.toString()}>{i.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label>Prix unitaire (XOF)</Label>
                <Input type="number" min={0} value={priceForm.unitPrice} onChange={(e) => setPriceForm({ ...priceForm, unitPrice: Number(e.target.value) })} />
              </div>
              <div>
                <Label>Délai (jours)</Label>
                <Input type="number" min={0} value={priceForm.leadTimeDays} onChange={(e) => setPriceForm({ ...priceForm, leadTimeDays: Number(e.target.value) })} />
              </div>
              <div>
                <Label>Qté minimum</Label>
                <Input type="number" min={1} value={priceForm.minOrderQty} onChange={(e) => setPriceForm({ ...priceForm, minOrderQty: Number(e.target.value) })} />
              </div>
            </div>
            <div>
              <Label>Notes</Label>
              <Input value={priceForm.notes} onChange={(e) => setPriceForm({ ...priceForm, notes: e.target.value })} placeholder="Notes optionnelles" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPriceDialog(false)}>Annuler</Button>
            <Button
              onClick={() => createPrice.mutate({
                vendorId: priceForm.vendorId,
                itemId: priceForm.itemId,
                unitPrice: priceForm.unitPrice,
                leadTimeDays: priceForm.leadTimeDays,
                minOrderQty: priceForm.minOrderQty,
                isPreferred: priceForm.isPreferred,
                notes: priceForm.notes || undefined,
              })}
              disabled={!priceForm.vendorId || !priceForm.itemId || priceForm.unitPrice <= 0}
            >
              Enregistrer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Nouvelle intégration */}
      <Dialog open={showIntegrationDialog} onOpenChange={setShowIntegrationDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Nouvelle intégration fournisseur</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Fournisseur</Label>
              <Select value={integrationForm.vendorId ? integrationForm.vendorId.toString() : ""} onValueChange={(v) => setIntegrationForm({ ...integrationForm, vendorId: Number(v) })}>
                <SelectTrigger><SelectValue placeholder="Choisir un fournisseur" /></SelectTrigger>
                <SelectContent>
                  {(vendorsQuery.data?.items || []).map((v: any) => (
                    <SelectItem key={v.id} value={v.id.toString()}>{v.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Type d'intégration</Label>
              <Select value={integrationForm.integrationType} onValueChange={(v: any) => setIntegrationForm({ ...integrationForm, integrationType: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {INTEGRATION_TYPES.map(t => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {(integrationForm.integrationType === "api") && (
              <div>
                <Label>URL API</Label>
                <Input value={integrationForm.apiUrl} onChange={(e) => setIntegrationForm({ ...integrationForm, apiUrl: e.target.value })} placeholder="https://api.fournisseur.com/v1" />
              </div>
            )}
            <div>
              <Label>Fréquence de synchronisation</Label>
              <Select value={integrationForm.syncFrequency} onValueChange={(v: any) => setIntegrationForm({ ...integrationForm, syncFrequency: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SYNC_FREQUENCIES.map(f => (
                    <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowIntegrationDialog(false)}>Annuler</Button>
            <Button
              onClick={() => createIntegration.mutate({
                vendorId: integrationForm.vendorId,
                integrationType: integrationForm.integrationType,
                apiUrl: integrationForm.apiUrl || undefined,
                syncFrequency: integrationForm.syncFrequency,
                isActive: integrationForm.isActive,
              })}
              disabled={!integrationForm.vendorId}
            >
              Créer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
