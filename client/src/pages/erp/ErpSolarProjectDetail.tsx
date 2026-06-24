import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useRoute } from "wouter";
import { LoadTemplateWizard } from "./LoadTemplateWizard";
import { Link } from "wouter";
import { toast } from "sonner";
import { ArrowLeft, Sun, Zap, Battery, Cable, DollarSign, Cpu, MessageSquare, Plus, Trash2, Play, Download, Search, Copy, BookOpen, AlertTriangle, Edit2, Check, X, Settings } from "lucide-react";

export default function ErpSolarProjectDetail() {
  const [, params] = useRoute("/erp/solar/:id");
  const projectId = parseInt(params?.id || "0");
  const [activeTab, setActiveTab] = useState("loads");

  const { data: project, isLoading } = trpc.erp.solar.projects.getById.useQuery({ id: projectId });
  const { data: loads } = trpc.erp.solar.loadItems.list.useQuery({ projectId });
  const { data: sizing } = trpc.erp.solar.sizing.getResults.useQuery({ projectId });
  const { data: budget } = trpc.erp.solar.budget.getLines.useQuery({ projectId });

  const utils = trpc.useUtils();
  const runSizing = trpc.erp.solar.sizing.calculate.useMutation({
    onSuccess: () => { toast.success("Dimensionnement calculé avec succès"); utils.erp.solar.sizing.getResults.invalidate(); },
    onError: (err: any) => toast.error(err.message),
  });

  const runBudget = trpc.erp.solar.budget.calculate.useMutation({
    onSuccess: () => { toast.success("Budget calculé avec succès"); utils.erp.solar.budget.getLines.invalidate(); },
    onError: (err: any) => toast.error(err.message),
  });

  if (isLoading) return <div className="flex items-center justify-center py-12 text-muted-foreground">Chargement...</div>;
  if (!project) return <div className="text-center py-12 text-muted-foreground">Projet introuvable</div>;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/erp/solar"><Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button></Link>
          <div>
            <h1 className="text-2xl font-bold">{project.name}</h1>
            <p className="text-muted-foreground">{project.siteLocation || "Localisation non définie"} • {project.systemType === "hybrid" ? "Hybride" : project.systemType === "on_grid" ? "On-Grid" : "Autonome"}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Link href={`/erp/solar/${projectId}/settings`}>
            <Button variant="outline" size="sm">
              <Settings className="h-4 w-4 mr-2" />Paramètres
            </Button>
          </Link>
          <Button variant="outline" onClick={() => runSizing.mutate({ projectId })} disabled={runSizing.isPending}>
            <Play className="h-4 w-4 mr-2" />{runSizing.isPending ? "Calcul..." : "Dimensionner"}
          </Button>
          <Button variant="outline" onClick={() => runBudget.mutate({ projectId })} disabled={runBudget.isPending}>
            <DollarSign className="h-4 w-4 mr-2" />{runBudget.isPending ? "Calcul..." : "Budgétiser"}
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-6 w-full">
          <TabsTrigger value="loads"><Zap className="h-3 w-3 mr-1" />Bilan</TabsTrigger>
          <TabsTrigger value="sizing"><Sun className="h-3 w-3 mr-1" />Dimensionnement</TabsTrigger>
          <TabsTrigger value="budget"><DollarSign className="h-3 w-3 mr-1" />Budget</TabsTrigger>
          <TabsTrigger value="cables"><Cable className="h-3 w-3 mr-1" />Câblage</TabsTrigger>
          <TabsTrigger value="scenarios"><Cpu className="h-3 w-3 mr-1" />Scénarios</TabsTrigger>
          <TabsTrigger value="ai"><MessageSquare className="h-3 w-3 mr-1" />IA</TabsTrigger>
        </TabsList>

        {/* Bilan de puissance */}
        <TabsContent value="loads">
          <LoadsTab projectId={projectId} loads={loads} />
        </TabsContent>

        {/* Dimensionnement */}
        <TabsContent value="sizing">
          <SizingTab sizingData={sizing} />
        </TabsContent>

        {/* Budget */}
        <TabsContent value="budget">
          <BudgetTab budget={budget} />
        </TabsContent>

        {/* Câblage */}
        <TabsContent value="cables">
          <CablesTab sizingData={sizing} />
        </TabsContent>

        {/* Scénarios */}
        <TabsContent value="scenarios">
          <ScenariosTab projectId={projectId} />
        </TabsContent>

        {/* IA */}
        <TabsContent value="ai">
          <AiTab projectId={projectId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function LoadsTab({ projectId, loads }: { projectId: number; loads: any[] | undefined }) {
  const [mode, setMode] = useState<"list" | "catalog" | "custom">("list");
  const [catalogSearch, setCatalogSearch] = useState("");
  const [catalogDomain, setCatalogDomain] = useState("all");
  const [form, setForm] = useState({ name: "", category: "lighting", unitPowerW: "", quantity: "1", usageHoursPerDay: "8", startupFactor: "1", simultaneityCoeff: "1" });
  const [editId, setEditId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<any>(null);
  const utils = trpc.useUtils();

  const catalog = trpc.erp.solar.loadCatalog.list.useQuery(
    { search: catalogSearch || undefined, domain: catalogDomain === "all" ? undefined : catalogDomain },
    { enabled: mode === "catalog" }
  );

  const addLoad = trpc.erp.solar.loadItems.create.useMutation({
    onSuccess: () => { toast.success("Charge ajoutée"); setMode("list"); setForm({ name: "", category: "lighting", unitPowerW: "", quantity: "1", usageHoursPerDay: "8", startupFactor: "1", simultaneityCoeff: "1" }); utils.erp.solar.loadItems.list.invalidate(); },
    onError: (err: any) => toast.error(err.message),
  });

  const addFromCatalog = trpc.erp.solar.loadItems.addFromCatalog.useMutation({
    onSuccess: () => { toast.success("Charge ajoutée depuis la bibliothèque"); utils.erp.solar.loadItems.list.invalidate(); },
    onError: (err: any) => toast.error(err.message),
  });

  const duplicateLoad = trpc.erp.solar.loadItems.duplicate.useMutation({
    onSuccess: () => { toast.success("Charge dupliquée"); utils.erp.solar.loadItems.list.invalidate(); },
  });

  const updateLoad = trpc.erp.solar.loadItems.update.useMutation({
    onSuccess: () => { toast.success("Charge modifiée"); setEditId(null); setEditForm(null); utils.erp.solar.loadItems.list.invalidate(); },
    onError: (err: any) => toast.error(err.message),
  });

  const deleteLoad = trpc.erp.solar.loadItems.delete.useMutation({
    onSuccess: () => { toast.success("Charge supprimée"); utils.erp.solar.loadItems.list.invalidate(); },
  });

  const totalPower = (loads || []).reduce((s: number, l: any) => s + (Number(l.totalPowerW) || 0), 0);
  const totalEnergy = (loads || []).reduce((s: number, l: any) => s + (Number(l.dailyEnergyWh) || 0), 0);
  const criticalCount = (loads || []).filter((l: any) => l.isCriticalLoad).length;

  const domains = ["all", "Domestic", "Office", "Telecom IT", "Security", "Commercial", "Hotel Restaurant", "Industrial", "Pumping", "Medical", "Construction Site", "Agriculture", "Public Lighting"];
  const domainLabels: Record<string, string> = { all: "Tous les domaines", Domestic: "Domestique", Office: "Bureau", "Telecom IT": "Télécom/IT", Security: "Sécurité", Commercial: "Commerce", "Hotel Restaurant": "Hôtellerie", Industrial: "Industriel", Pumping: "Pompage", Medical: "Santé", "Construction Site": "Chantier", Agriculture: "Agriculture", "Public Lighting": "Éclairage public" };

  return (
    <div className="space-y-4">
      {/* KPIs */}
      <div className="grid grid-cols-3 gap-4">
        <Card><CardContent className="pt-4">
          <p className="text-sm text-muted-foreground">Puissance totale</p>
          <p className="text-2xl font-bold">{(totalPower / 1000).toFixed(2)} kW</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4">
          <p className="text-sm text-muted-foreground">Énergie journalière</p>
          <p className="text-2xl font-bold">{(totalEnergy / 1000).toFixed(2)} kWh/j</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4">
          <p className="text-sm text-muted-foreground">Charges critiques</p>
          <p className="text-2xl font-bold">{criticalCount} <span className="text-sm font-normal text-muted-foreground">/ {loads?.length || 0}</span></p>
        </CardContent></Card>
      </div>

      {/* Actions */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Charges électriques</CardTitle>
          <div className="flex gap-2">
            <LoadTemplateWizard projectId={projectId} onComplete={() => utils.erp.solar.loadItems.list.invalidate()} />
            <Button size="sm" variant={mode === "catalog" ? "default" : "outline"} onClick={() => setMode(mode === "catalog" ? "list" : "catalog")}>
              <BookOpen className="h-4 w-4 mr-1" />Bibliothèque
            </Button>
            <Button size="sm" variant={mode === "custom" ? "default" : "outline"} onClick={() => setMode(mode === "custom" ? "list" : "custom")}>
              <Plus className="h-4 w-4 mr-1" />Créer
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Mode Bibliothèque */}
          {mode === "catalog" && (
            <div className="border rounded-lg p-4 mb-4 space-y-3 bg-muted/30">
              <div className="flex gap-3 items-center">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input className="pl-9" placeholder="Rechercher un équipement..." value={catalogSearch} onChange={e => setCatalogSearch(e.target.value)} />
                </div>
                <Select value={catalogDomain} onValueChange={setCatalogDomain}>
                  <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {domains.map(d => <SelectItem key={d} value={d}>{domainLabels[d] || d}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              {catalog.isLoading ? (
                <p className="text-center py-4 text-muted-foreground">Chargement...</p>
              ) : !catalog.data?.length ? (
                <p className="text-center py-4 text-muted-foreground">Aucun équipement trouvé.</p>
              ) : (
                <div className="max-h-64 overflow-y-auto space-y-1">
                  {catalog.data.map((item: any) => (
                    <div key={item.id} className="flex items-center justify-between p-2 rounded hover:bg-muted/50 border">
                      <div className="flex-1">
                        <span className="font-medium text-sm">{item.name}</span>
                        <span className="text-xs text-muted-foreground ml-2">{item.domain} • {Number(item.defaultPowerW)}W • {Number(item.defaultHoursPerDay)}h/j</span>
                        {item.isCriticalDefault && <Badge variant="destructive" className="ml-2 text-xs">Critique</Badge>}
                      </div>
                      <Button size="sm" variant="ghost" onClick={() => addFromCatalog.mutate({ projectId, catalogItemId: item.id })} disabled={addFromCatalog.isPending}>
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Mode Création manuelle */}
          {mode === "custom" && (
            <div className="border rounded-lg p-4 mb-4 space-y-3 bg-muted/30">
              <p className="text-sm font-medium">Nouvel équipement personnalisé</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="space-y-1"><Label className="text-xs">Nom *</Label><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Climatiseur" /></div>
                <div className="space-y-1"><Label className="text-xs">Catégorie</Label>
                  <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="lighting">Éclairage</SelectItem>
                      <SelectItem value="cooling">Climatisation</SelectItem>
                      <SelectItem value="appliances">Électroménager</SelectItem>
                      <SelectItem value="it">Informatique</SelectItem>
                      <SelectItem value="telecom">Télécom</SelectItem>
                      <SelectItem value="security">Sécurité</SelectItem>
                      <SelectItem value="kitchen">Cuisine</SelectItem>
                      <SelectItem value="motor">Moteurs</SelectItem>
                      <SelectItem value="pump">Pompage</SelectItem>
                      <SelectItem value="medical">Médical</SelectItem>
                      <SelectItem value="heating">Chauffage</SelectItem>
                      <SelectItem value="industrial">Industriel</SelectItem>
                      <SelectItem value="construction">Construction</SelectItem>
                      <SelectItem value="office">Bureau</SelectItem>
                      <SelectItem value="server">Serveurs</SelectItem>
                      <SelectItem value="other">Autre</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1"><Label className="text-xs">Puissance (W) *</Label><Input type="number" value={form.unitPowerW} onChange={e => setForm(f => ({ ...f, unitPowerW: e.target.value }))} placeholder="1500" /></div>
                <div className="space-y-1"><Label className="text-xs">Quantité</Label><Input type="number" value={form.quantity} onChange={e => setForm(f => ({ ...f, quantity: e.target.value }))} /></div>
                <div className="space-y-1"><Label className="text-xs">Heures/jour</Label><Input type="number" step="0.5" value={form.usageHoursPerDay} onChange={e => setForm(f => ({ ...f, usageHoursPerDay: e.target.value }))} /></div>
                <div className="space-y-1"><Label className="text-xs">Coeff. démarrage</Label><Input type="number" step="0.1" value={form.startupFactor} onChange={e => setForm(f => ({ ...f, startupFactor: e.target.value }))} /></div>
                <div className="space-y-1"><Label className="text-xs">Coeff. simultanéité</Label><Input type="number" step="0.1" min="0" max="1" value={form.simultaneityCoeff} onChange={e => setForm(f => ({ ...f, simultaneityCoeff: e.target.value }))} /></div>
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={() => { if (!form.name || !form.unitPowerW) { toast.error("Nom et puissance requis"); return; } addLoad.mutate({ projectId, equipmentName: form.name, equipmentCategory: form.category, unitPowerW: parseFloat(form.unitPowerW), quantity: parseInt(form.quantity), usageHoursPerDay: parseFloat(form.usageHoursPerDay), startupFactor: parseFloat(form.startupFactor) }); }} disabled={addLoad.isPending}>Ajouter</Button>
                <Button size="sm" variant="ghost" onClick={() => setMode("list")}>Annuler</Button>
              </div>
            </div>
          )}

          {/* Tableau des charges */}
          {!loads?.length ? (
            <div className="text-center py-8 text-muted-foreground">
              <Zap className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>Aucune charge définie.</p>
              <p className="text-xs mt-1">Utilisez la <strong>Bibliothèque</strong> pour ajouter rapidement des équipements standard ou <strong>Créer</strong> un équipement personnalisé.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b text-left"><th className="py-2">Nom</th><th>Domaine</th><th>Catégorie</th><th className="text-right">W</th><th className="text-right">Qté</th><th className="text-right">h/j</th><th className="text-right">Coeff</th><th className="text-right">Wh/j</th><th className="text-center">Actions</th></tr></thead>
                <tbody>
                  {loads.map((l: any) => (
                    editId === l.id ? (
                      <tr key={l.id} className="border-b bg-muted/30">
                        <td className="py-2"><Input className="h-7 text-xs" value={editForm.equipmentName} onChange={e => setEditForm((f: any) => ({ ...f, equipmentName: e.target.value }))} /></td>
                        <td><span className="text-xs text-muted-foreground">{l.domain || "—"}</span></td>
                        <td><span className="text-xs">{l.equipmentCategory}</span></td>
                        <td><Input className="h-7 text-xs w-20 ml-auto" type="number" value={editForm.unitPowerW} onChange={e => setEditForm((f: any) => ({ ...f, unitPowerW: e.target.value }))} /></td>
                        <td><Input className="h-7 text-xs w-14 ml-auto" type="number" value={editForm.quantity} onChange={e => setEditForm((f: any) => ({ ...f, quantity: e.target.value }))} /></td>
                        <td><Input className="h-7 text-xs w-14 ml-auto" type="number" step="0.5" value={editForm.usageHoursPerDay} onChange={e => setEditForm((f: any) => ({ ...f, usageHoursPerDay: e.target.value }))} /></td>
                        <td><Input className="h-7 text-xs w-14 ml-auto" type="number" step="0.1" value={editForm.startupFactor} onChange={e => setEditForm((f: any) => ({ ...f, startupFactor: e.target.value }))} /></td>
                        <td></td>
                        <td className="text-center">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { updateLoad.mutate({ id: l.id, equipmentName: editForm.equipmentName, unitPowerW: parseFloat(editForm.unitPowerW), quantity: parseInt(editForm.quantity), usageHoursPerDay: parseFloat(editForm.usageHoursPerDay), startupFactor: parseFloat(editForm.startupFactor) }); }}><Check className="h-3 w-3 text-green-600" /></Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setEditId(null); setEditForm(null); }}><X className="h-3 w-3 text-red-600" /></Button>
                        </td>
                      </tr>
                    ) : (
                      <tr key={l.id} className={`border-b ${l.isCriticalLoad ? "bg-orange-50 dark:bg-orange-950/20" : ""}`}>
                        <td className="py-2 font-medium">
                          {l.equipmentName}
                          {l.isCriticalLoad && <AlertTriangle className="inline h-3 w-3 ml-1 text-orange-500" />}
                          {!l.isCustom && l.catalogItemId && <span title="Depuis bibliothèque"><BookOpen className="inline h-3 w-3 ml-1 text-blue-400" /></span>}
                        </td>
                        <td><span className="text-xs text-muted-foreground">{l.domain || "—"}</span></td>
                        <td><Badge variant="outline" className="text-xs">{l.equipmentCategory || "—"}</Badge></td>
                        <td className="text-right">{Number(l.unitPowerW).toFixed(0)}</td>
                        <td className="text-right">{l.quantity}</td>
                        <td className="text-right">{Number(l.usageHoursPerDay).toFixed(1)}</td>
                        <td className="text-right">{Number(l.startupFactor).toFixed(2)}</td>
                        <td className="text-right font-medium">{Number(l.dailyEnergyWh).toLocaleString()}</td>
                        <td className="text-center whitespace-nowrap">
                          <Button variant="ghost" size="icon" className="h-7 w-7" title="Modifier" onClick={() => { setEditId(l.id); setEditForm({ equipmentName: l.equipmentName, unitPowerW: String(Number(l.unitPowerW)), quantity: String(l.quantity), usageHoursPerDay: String(Number(l.usageHoursPerDay)), startupFactor: String(Number(l.startupFactor)) }); }}><Edit2 className="h-3 w-3" /></Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7" title="Dupliquer" onClick={() => duplicateLoad.mutate({ id: l.id })}><Copy className="h-3 w-3" /></Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7" title="Supprimer" onClick={() => deleteLoad.mutate({ id: l.id })}><Trash2 className="h-3 w-3" /></Button>
                        </td>
                      </tr>
                    )
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t font-semibold">
                    <td className="py-2" colSpan={3}>Total ({loads.length} charges)</td>
                    <td className="text-right">{(totalPower).toLocaleString()}</td>
                    <td></td><td></td><td></td>
                    <td className="text-right">{totalEnergy.toLocaleString()}</td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function SizingTab({ sizingData }: { sizingData: any }) {
  const sizing = sizingData?.sizing;
  if (!sizing || sizing.calculationStatus !== "completed") return (
    <Card><CardContent className="py-8 text-center text-muted-foreground">
      <Sun className="h-12 w-12 mx-auto mb-4 opacity-50" />
      <p>Cliquez sur "Dimensionner" pour calculer la taille optimale du système PV.</p>
    </CardContent></Card>
  );

  const pvInstalledKwp = sizing.pvInstalledPowerWc ? (Number(sizing.pvInstalledPowerWc) / 1000).toFixed(2) : (Number(sizing.requiredPvPowerWc) / 1000).toFixed(2);
  const batteryCapacityKwh = (Number(sizing.batteryCapacityWh) / 1000).toFixed(2);
  const inverterPowerKva = sizing.inverterPowerKva ? Number(sizing.inverterPowerKva).toFixed(2) : (Number(sizing.recommendedInverterPowerW) / 1000).toFixed(2);
  const efficiency = sizing.detailedEfficiency ? (Number(sizing.detailedEfficiency) * 100).toFixed(1) : null;

  return (
    <div className="space-y-4">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Card><CardContent className="pt-4">
          <p className="text-xs text-muted-foreground">Panneaux PV</p>
          <p className="text-xl font-bold">{sizing.panelsCount}</p>
          <p className="text-xs">{pvInstalledKwp} kWp installés</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4">
          <p className="text-xs text-muted-foreground">Batteries</p>
          <p className="text-xl font-bold">{batteryCapacityKwh} kWh</p>
          <p className="text-xs">{sizing.batteryModulesCount || "-"} modules • {Number(sizing.batteryCapacityAh).toFixed(0)} Ah</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4">
          <p className="text-xs text-muted-foreground">Onduleur</p>
          <p className="text-xl font-bold">{inverterPowerKva} kVA</p>
          <p className="text-xs">Surge: {sizing.inverterSurgeRequiredW ? (Number(sizing.inverterSurgeRequiredW) / 1000).toFixed(1) + " kW" : "N/A"}</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4">
          <p className="text-xs text-muted-foreground">Rendement système</p>
          <p className="text-xl font-bold">{efficiency ? efficiency + "%" : "N/A"}</p>
          <p className="text-xs">Pertes détaillées</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4">
          <p className="text-xs text-muted-foreground">Pertes câbles</p>
          <p className="text-xl font-bold">{sizing.totalCableLossW ? Number(sizing.totalCableLossW).toFixed(0) + " W" : "N/A"}</p>
          <p className="text-xs">{sizing.totalCableLossWhDay ? (Number(sizing.totalCableLossWhDay) / 1000).toFixed(2) + " kWh/j" : ""}</p>
        </CardContent></Card>
      </div>

      {/* Détails Bilan */}
      <Card>
        <CardHeader><CardTitle>Bilan de puissance</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
            <div><span className="text-muted-foreground">Puissance nominale:</span> <span className="font-medium">{(Number(sizing.totalNominalPowerW) / 1000).toFixed(2)} kW</span></div>
            <div><span className="text-muted-foreground">Puissance simultanée:</span> <span className="font-medium">{sizing.simultaneousPowerW ? (Number(sizing.simultaneousPowerW) / 1000).toFixed(2) + " kW" : "N/A"}</span></div>
            <div><span className="text-muted-foreground">Pointe réaliste:</span> <span className="font-medium">{sizing.realisticPeakPowerW ? (Number(sizing.realisticPeakPowerW) / 1000).toFixed(2) + " kW" : (Number(sizing.maxStartupPowerW) / 1000).toFixed(2) + " kW"}</span></div>
            <div><span className="text-muted-foreground">Énergie journalière:</span> <span className="font-medium">{(Number(sizing.totalDailyEnergyWh) / 1000).toFixed(2)} kWh/j</span></div>
            <div><span className="text-muted-foreground">Énergie critique:</span> <span className="font-medium">{sizing.criticalDailyEnergyWh ? (Number(sizing.criticalDailyEnergyWh) / 1000).toFixed(2) + " kWh/j" : "N/A"}</span></div>
            <div><span className="text-muted-foreground">Énergie nocturne:</span> <span className="font-medium">{sizing.nightDailyEnergyWh ? (Number(sizing.nightDailyEnergyWh) / 1000).toFixed(2) + " kWh/j" : "N/A"}</span></div>
          </div>
        </CardContent>
      </Card>

      {/* Détails PV */}
      <Card>
        <CardHeader><CardTitle>Dimensionnement PV</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
            <div><span className="text-muted-foreground">PV brut requis:</span> <span className="font-medium">{sizing.pvGrossPowerWc ? (Number(sizing.pvGrossPowerWc) / 1000).toFixed(2) + " kWp" : "N/A"}</span></div>
            <div><span className="text-muted-foreground">PV recommandé (+marge):</span> <span className="font-medium">{sizing.pvRecommendedPowerWc ? (Number(sizing.pvRecommendedPowerWc) / 1000).toFixed(2) + " kWp" : "N/A"}</span></div>
            <div><span className="text-muted-foreground">PV installé:</span> <span className="font-medium">{pvInstalledKwp} kWp ({sizing.panelsCount} × {sizing.panelUnitPowerWc} Wc)</span></div>
            <div><span className="text-muted-foreground">Marge réelle:</span> <span className="font-medium">{sizing.pvRealMarginPercent ? (Number(sizing.pvRealMarginPercent) * 100).toFixed(1) + "%" : "N/A"}</span></div>
          </div>
        </CardContent>
      </Card>

      {/* Détails Batterie */}
      <Card>
        <CardHeader><CardTitle>Dimensionnement Batterie</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
            <div><span className="text-muted-foreground">Mode:</span> <span className="font-medium">{sizing.batterySizingMode || "total_load"}</span></div>
            <div><span className="text-muted-foreground">Énergie référence:</span> <span className="font-medium">{sizing.batteryReferenceEnergyWh ? (Number(sizing.batteryReferenceEnergyWh) / 1000).toFixed(2) + " kWh" : "N/A"}</span></div>
            <div><span className="text-muted-foreground">Capacité nominale:</span> <span className="font-medium">{sizing.batteryNominalCapacityWh ? (Number(sizing.batteryNominalCapacityWh) / 1000).toFixed(2) + " kWh" : "N/A"}</span></div>
            <div><span className="text-muted-foreground">Capacité recommandée:</span> <span className="font-medium">{sizing.batteryRecommendedCapacityWh ? (Number(sizing.batteryRecommendedCapacityWh) / 1000).toFixed(2) + " kWh" : batteryCapacityKwh + " kWh"}</span></div>
            <div><span className="text-muted-foreground">Modules:</span> <span className="font-medium">{sizing.batteryModulesCount || "N/A"}</span></div>
            <div><span className="text-muted-foreground">Autonomie réelle:</span> <span className="font-medium">{sizing.batteryRealAutonomyDays ? Number(sizing.batteryRealAutonomyDays).toFixed(1) + " jours" : "N/A"}</span></div>
          </div>
        </CardContent>
      </Card>

      {/* Détails Onduleur */}
      <Card>
        <CardHeader><CardTitle>Dimensionnement Onduleur</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
            <div><span className="text-muted-foreground">Continu recommandé:</span> <span className="font-medium">{sizing.inverterContinuousRecommendedW ? (Number(sizing.inverterContinuousRecommendedW) / 1000).toFixed(2) + " kW" : "N/A"}</span></div>
            <div><span className="text-muted-foreground">Surge requis:</span> <span className="font-medium">{sizing.inverterSurgeRequiredW ? (Number(sizing.inverterSurgeRequiredW) / 1000).toFixed(2) + " kW" : "N/A"}</span></div>
            <div><span className="text-muted-foreground">Puissance kVA:</span> <span className="font-medium">{inverterPowerKva} kVA</span></div>
            <div><span className="text-muted-foreground">Recommandé final:</span> <span className="font-medium">{(Number(sizing.recommendedInverterPowerW) / 1000).toFixed(2)} kW</span></div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function BudgetTab({ budget }: { budget: any }) {
  // budget is a direct array from getLines (not an object with .lines)
  const lines = Array.isArray(budget) ? budget : budget?.lines || [];
  if (!lines.length) return (
    <Card><CardContent className="py-8 text-center text-muted-foreground">
      <DollarSign className="h-12 w-12 mx-auto mb-4 opacity-50" />
      <p>Cliquez sur "Budgétiser" pour calculer le budget détaillé par lots.</p>
    </CardContent></Card>
  );

  const totalHT = lines.reduce((s: number, l: any) => s + Number(l.amount || 0), 0);
  const currency = lines[0]?.currency || "XOF";

  return (
    <div className="space-y-4">
      <Card><CardContent className="pt-4">
        <p className="text-sm text-muted-foreground">Budget total HT</p>
        <p className="text-3xl font-bold">{totalHT.toLocaleString("fr-FR")} {currency}</p>
      </CardContent></Card>
      <Card>
        <CardHeader><CardTitle>Détail par lots</CardTitle></CardHeader>
        <CardContent>
          <table className="w-full text-sm">
            <thead><tr className="border-b text-left"><th className="py-2">Lot</th><th>Désignation</th><th className="text-right">Qté</th><th className="text-right">PU ({currency})</th><th className="text-right">Total HT ({currency})</th></tr></thead>
            <tbody>
              {lines.map((l: any, i: number) => (
                <tr key={i} className="border-b">
                  <td className="py-2 font-mono text-xs">{l.lotNumber}</td>
                  <td>{l.lotName}</td>
                  <td className="text-right">{Number(l.quantity).toLocaleString("fr-FR")}</td>
                  <td className="text-right">{Number(l.unitPrice).toLocaleString("fr-FR")}</td>
                  <td className="text-right font-medium">{Number(l.amount).toLocaleString("fr-FR")}</td>
                </tr>
              ))}
            </tbody>
            <tfoot><tr className="font-bold border-t"><td colSpan={4} className="py-2 text-right">TOTAL HT</td><td className="text-right">{totalHT.toLocaleString("fr-FR")} {currency}</td></tr></tfoot>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}

function CablesTab({ sizingData }: { sizingData: any }) {
  const cables = sizingData?.cables || [];
  if (!cables.length) return (
    <Card><CardContent className="py-8 text-center text-muted-foreground">
      <Cable className="h-12 w-12 mx-auto mb-4 opacity-50" />
      <p>Le dimensionnement câblage sera calculé automatiquement après le dimensionnement PV/batteries.</p>
    </CardContent></Card>
  );

  const totalLossW = cables.reduce((s: number, c: any) => s + (Number(c.powerLossW) || 0), 0);
  const totalLossWhDay = cables.reduce((s: number, c: any) => s + (Number(c.energyLossWhDay) || 0), 0);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <Card><CardContent className="pt-4">
          <p className="text-xs text-muted-foreground">Lignes de câbles</p>
          <p className="text-xl font-bold">{cables.length}</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4">
          <p className="text-xs text-muted-foreground">Pertes totales</p>
          <p className="text-xl font-bold">{totalLossW.toFixed(0)} W</p>
          <p className="text-xs">{(totalLossWhDay / 1000).toFixed(2)} kWh/j</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4">
          <p className="text-xs text-muted-foreground">Alertes ampacité</p>
          <p className="text-xl font-bold">{cables.filter((c: any) => c.ampacityStatus === "Critical" || c.ampacityStatus === "Warning").length}</p>
        </CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Détail des lignes de câbles</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b text-left">
                <th className="py-2">Ligne</th>
                <th>De → Vers</th>
                <th className="text-right">L (m)</th>
                <th className="text-right">I (A)</th>
                <th className="text-right">Section (mm²)</th>
                <th className="text-right">ΔV (%)</th>
                <th className="text-right">Pertes (W)</th>
                <th className="text-right">Ampacité</th>
                <th className="text-center">Statut</th>
              </tr></thead>
              <tbody>
                {cables.map((c: any, i: number) => (
                  <tr key={c.id || i} className="border-b">
                    <td className="py-2 font-medium">{c.lineName}</td>
                    <td className="text-xs text-muted-foreground">{c.fromEquipment || "-"} → {c.toEquipment || "-"}</td>
                    <td className="text-right">{Number(c.lengthM).toFixed(1)}</td>
                    <td className="text-right">{Number(c.currentA).toFixed(1)}</td>
                    <td className="text-right font-medium">{Number(c.recommendedCommercialSectionMm2 || c.selectedSectionMm2).toFixed(1)}</td>
                    <td className="text-right">{c.voltageDropPercent ? (Number(c.voltageDropPercent) * 100).toFixed(2) : "-"}</td>
                    <td className="text-right">{c.powerLossW ? Number(c.powerLossW).toFixed(1) : "-"}</td>
                    <td className="text-right">{c.ampacityLimitA ? Number(c.ampacityLimitA).toFixed(0) + " A" : "-"}</td>
                    <td className="text-center">
                      {c.ampacityStatus === "Critical" && <Badge variant="destructive" className="text-xs">Critique</Badge>}
                      {c.ampacityStatus === "Warning" && <Badge className="bg-orange-100 text-orange-700 text-xs">Attention</Badge>}
                      {(c.ampacityStatus === "OK" || !c.ampacityStatus) && <Badge variant="outline" className="text-xs">OK</Badge>}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot><tr className="font-semibold border-t">
                <td className="py-2" colSpan={6}>Total pertes</td>
                <td className="text-right">{totalLossW.toFixed(0)} W</td>
                <td colSpan={2}></td>
              </tr></tfoot>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function ScenariosTab({ projectId }: { projectId: number }) {
  const { data: scenarios } = trpc.erp.solar.scenarios.list.useQuery({ projectId });
  const generateScenarios = trpc.erp.solar.scenarios.generate.useMutation({
    onSuccess: () => toast.success("Scénarios générés par l'IA"),
    onError: (err: any) => toast.error(err.message),
  });

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="font-semibold">Scénarios comparatifs</h3>
        <Button size="sm" onClick={() => generateScenarios.mutate({ projectId })} disabled={generateScenarios.isPending}>
          <Cpu className="h-4 w-4 mr-1" />{generateScenarios.isPending ? "Génération..." : "Générer scénarios IA"}
        </Button>
      </div>
      {!scenarios?.length ? (
        <Card><CardContent className="py-8 text-center text-muted-foreground">
          <Cpu className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>Cliquez sur "Générer scénarios IA" pour comparer différentes configurations.</p>
        </CardContent></Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {scenarios.map((s: any) => (
            <Card key={s.id} className={s.isRecommended ? "border-orange-300 bg-orange-50/50" : ""}>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  {s.name}
                  {s.isRecommended && <Badge className="bg-orange-100 text-orange-700">Recommandé</Badge>}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between"><span>Puissance PV:</span><span className="font-medium">{s.pvPowerKwp} kWp</span></div>
                <div className="flex justify-between"><span>Batteries:</span><span className="font-medium">{s.batteryKwh} kWh</span></div>
                <div className="flex justify-between"><span>Budget:</span><span className="font-medium">{(s.totalCost / 1000000).toFixed(1)} M FCFA</span></div>
                <div className="flex justify-between"><span>ROI:</span><span className="font-medium">{s.roiYears} ans</span></div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function AiTab({ projectId }: { projectId: number }) {
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<{ role: string; content: string }[]>([]);

  const askAi = trpc.erp.solar.ai.chat.useMutation({
    onSuccess: (data: any) => {
      setMessages(prev => [...prev, { role: "assistant", content: data.response }]);
    },
    onError: (err: any) => toast.error(err.message),
  });

  const handleSend = () => {
    if (!message.trim()) return;
    setMessages(prev => [...prev, { role: "user", content: message }]);
    askAi.mutate({ projectId, question: message });
    setMessage("");
  };

  return (
    <Card>
      <CardHeader><CardTitle>Assistant IA Solaire</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <div className="h-64 overflow-y-auto border rounded-lg p-3 space-y-3">
          {messages.length === 0 && (
            <p className="text-center text-muted-foreground text-sm py-8">Posez une question sur votre projet solaire...</p>
          )}
          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${m.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                {m.content}
              </div>
            </div>
          ))}
          {askAi.isPending && <div className="flex justify-start"><div className="bg-muted rounded-lg px-3 py-2 text-sm animate-pulse">Réflexion...</div></div>}
        </div>
        <div className="flex gap-2">
          <Input value={message} onChange={e => setMessage(e.target.value)} placeholder="Ex: Quel type de panneau recommandez-vous pour ce site ?" onKeyDown={e => e.key === "Enter" && handleSend()} />
          <Button onClick={handleSend} disabled={askAi.isPending || !message.trim()}>Envoyer</Button>
        </div>
      </CardContent>
    </Card>
  );
}
