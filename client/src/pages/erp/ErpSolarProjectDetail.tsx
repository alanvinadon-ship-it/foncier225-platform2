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
import { Link } from "wouter";
import { toast } from "sonner";
import { ArrowLeft, Sun, Zap, Battery, Cable, DollarSign, Cpu, MessageSquare, Plus, Trash2, Play, Download } from "lucide-react";

export default function ErpSolarProjectDetail() {
  const [, params] = useRoute("/erp/solar/:id");
  const projectId = parseInt(params?.id || "0");
  const [activeTab, setActiveTab] = useState("loads");

  const { data: project, isLoading } = trpc.erp.solar.projects.getById.useQuery({ id: projectId });
  const { data: loads } = trpc.erp.solar.loadItems.list.useQuery({ projectId });
  const { data: sizing } = trpc.erp.solar.sizing.getResults.useQuery({ projectId });
  const { data: budget } = trpc.erp.solar.budget.getLines.useQuery({ projectId });

  const runSizing = trpc.erp.solar.sizing.calculate.useMutation({
    onSuccess: () => { toast.success("Dimensionnement calculé avec succès"); },
    onError: (err: any) => toast.error(err.message),
  });

  const runBudget = trpc.erp.solar.budget.calculate.useMutation({
    onSuccess: () => { toast.success("Budget calculé avec succès"); },
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
          <SizingTab sizing={sizing} />
        </TabsContent>

        {/* Budget */}
        <TabsContent value="budget">
          <BudgetTab budget={budget} />
        </TabsContent>

        {/* Câblage */}
        <TabsContent value="cables">
          <Card><CardContent className="py-8 text-center text-muted-foreground">
            <Cable className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Le dimensionnement câblage sera calculé automatiquement après le dimensionnement PV/batteries.</p>
          </CardContent></Card>
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
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", category: "lighting", powerWatts: "", quantity: "1", hoursPerDay: "8", simultaneityFactor: "1" });
  const utils = trpc.useUtils();

  const addLoad = trpc.erp.solar.loadItems.create.useMutation({
    onSuccess: () => { toast.success("Charge ajoutée"); setShowForm(false); setForm({ name: "", category: "lighting", powerWatts: "", quantity: "1", hoursPerDay: "8", simultaneityFactor: "1" }); utils.erp.solar.loadItems.list.invalidate(); },
    onError: (err: any) => toast.error(err.message),
  });

  const deleteLoad = trpc.erp.solar.loadItems.delete.useMutation({
    onSuccess: () => { toast.success("Charge supprimée"); utils.erp.solar.loadItems.list.invalidate(); },
  });

  const totalPower = (loads || []).reduce((s: number, l: any) => s + (l.powerWatts * l.quantity * l.simultaneityFactor), 0);
  const totalEnergy = (loads || []).reduce((s: number, l: any) => s + (l.powerWatts * l.quantity * l.hoursPerDay * l.simultaneityFactor), 0);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <Card><CardContent className="pt-4">
          <p className="text-sm text-muted-foreground">Puissance totale</p>
          <p className="text-2xl font-bold">{(totalPower / 1000).toFixed(2)} kW</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4">
          <p className="text-sm text-muted-foreground">Énergie journalière</p>
          <p className="text-2xl font-bold">{(totalEnergy / 1000).toFixed(2)} kWh/j</p>
        </CardContent></Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Charges électriques</CardTitle>
          <Button size="sm" onClick={() => setShowForm(!showForm)}><Plus className="h-4 w-4 mr-1" />Ajouter</Button>
        </CardHeader>
        <CardContent>
          {showForm && (
            <div className="border rounded-lg p-4 mb-4 space-y-3 bg-muted/30">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                <div className="space-y-1"><Label className="text-xs">Nom *</Label><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Climatiseur" /></div>
                <div className="space-y-1"><Label className="text-xs">Catégorie</Label>
                  <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="lighting">Éclairage</SelectItem>
                      <SelectItem value="cooling">Climatisation</SelectItem>
                      <SelectItem value="appliances">Électroménager</SelectItem>
                      <SelectItem value="computing">Informatique</SelectItem>
                      <SelectItem value="motors">Moteurs</SelectItem>
                      <SelectItem value="other">Autre</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1"><Label className="text-xs">Puissance (W) *</Label><Input type="number" value={form.powerWatts} onChange={e => setForm(f => ({ ...f, powerWatts: e.target.value }))} placeholder="1500" /></div>
                <div className="space-y-1"><Label className="text-xs">Quantité</Label><Input type="number" value={form.quantity} onChange={e => setForm(f => ({ ...f, quantity: e.target.value }))} /></div>
                <div className="space-y-1"><Label className="text-xs">Heures/jour</Label><Input type="number" step="0.5" value={form.hoursPerDay} onChange={e => setForm(f => ({ ...f, hoursPerDay: e.target.value }))} /></div>
                <div className="space-y-1"><Label className="text-xs">Coeff. simultanéité</Label><Input type="number" step="0.1" value={form.simultaneityFactor} onChange={e => setForm(f => ({ ...f, simultaneityFactor: e.target.value }))} /></div>
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={() => { if (!form.name || !form.powerWatts) { toast.error("Nom et puissance requis"); return; } addLoad.mutate({ projectId, equipmentName: form.name, equipmentCategory: form.category, unitPowerW: parseInt(form.powerWatts), quantity: parseInt(form.quantity), usageHoursPerDay: parseFloat(form.hoursPerDay), startupFactor: parseFloat(form.simultaneityFactor) }); }} disabled={addLoad.isPending}>Ajouter</Button>
                <Button size="sm" variant="ghost" onClick={() => setShowForm(false)}>Annuler</Button>
              </div>
            </div>
          )}

          {!loads?.length ? (
            <p className="text-center py-4 text-muted-foreground">Aucune charge définie. Ajoutez les équipements électriques du site.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b text-left"><th className="py-2">Nom</th><th>Catégorie</th><th className="text-right">W</th><th className="text-right">Qté</th><th className="text-right">h/j</th><th className="text-right">Coeff</th><th className="text-right">Wh/j</th><th></th></tr></thead>
                <tbody>
                  {loads.map((l: any) => (
                    <tr key={l.id} className="border-b">
                      <td className="py-2 font-medium">{l.name}</td>
                      <td><Badge variant="outline" className="text-xs">{l.category}</Badge></td>
                      <td className="text-right">{l.powerWatts}</td>
                      <td className="text-right">{l.quantity}</td>
                      <td className="text-right">{l.hoursPerDay}</td>
                      <td className="text-right">{l.simultaneityFactor}</td>
                      <td className="text-right font-medium">{(l.powerWatts * l.quantity * l.hoursPerDay * l.simultaneityFactor).toLocaleString()}</td>
                      <td className="text-right"><Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => deleteLoad.mutate({ id: l.id })}><Trash2 className="h-3 w-3" /></Button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function SizingTab({ sizing }: { sizing: any }) {
  if (!sizing) return (
    <Card><CardContent className="py-8 text-center text-muted-foreground">
      <Sun className="h-12 w-12 mx-auto mb-4 opacity-50" />
      <p>Cliquez sur "Dimensionner" pour calculer la taille optimale du système PV.</p>
    </CardContent></Card>
  );

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Panneaux PV</p><p className="text-xl font-bold">{sizing.pvPanelsCount}</p><p className="text-xs">{sizing.pvPowerKwp} kWp</p></CardContent></Card>
        <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Batteries</p><p className="text-xl font-bold">{sizing.batteryCount}</p><p className="text-xs">{sizing.batteryCapacityKwh} kWh</p></CardContent></Card>
        <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Onduleur</p><p className="text-xl font-bold">{sizing.inverterCount}</p><p className="text-xs">{sizing.inverterPowerKva} kVA</p></CardContent></Card>
        <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Régulateur</p><p className="text-xl font-bold">{sizing.chargeControllerCount || "-"}</p><p className="text-xs">{sizing.chargeControllerAmps || "-"} A</p></CardContent></Card>
      </div>
      <Card>
        <CardHeader><CardTitle>Détails du dimensionnement</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div><span className="text-muted-foreground">Ensoleillement:</span> <span className="font-medium">{sizing.peakSunHours} h/j</span></div>
            <div><span className="text-muted-foreground">Autonomie batteries:</span> <span className="font-medium">{sizing.autonomyDays} jours</span></div>
            <div><span className="text-muted-foreground">Profondeur décharge:</span> <span className="font-medium">{sizing.depthOfDischarge}%</span></div>
            <div><span className="text-muted-foreground">Pertes système:</span> <span className="font-medium">{sizing.systemLosses}%</span></div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function BudgetTab({ budget }: { budget: any }) {
  if (!budget || !budget.lines?.length) return (
    <Card><CardContent className="py-8 text-center text-muted-foreground">
      <DollarSign className="h-12 w-12 mx-auto mb-4 opacity-50" />
      <p>Cliquez sur "Budgétiser" pour calculer le budget détaillé par lots.</p>
    </CardContent></Card>
  );

  const totalHT = budget.lines.reduce((s: number, l: any) => s + (l.totalHt || 0), 0);

  return (
    <div className="space-y-4">
      <Card><CardContent className="pt-4">
        <p className="text-sm text-muted-foreground">Budget total HT</p>
        <p className="text-3xl font-bold">{totalHT.toLocaleString()} FCFA</p>
      </CardContent></Card>
      <Card>
        <CardHeader><CardTitle>Détail par lots</CardTitle></CardHeader>
        <CardContent>
          <table className="w-full text-sm">
            <thead><tr className="border-b text-left"><th className="py-2">Lot</th><th>Désignation</th><th className="text-right">Qté</th><th className="text-right">PU</th><th className="text-right">Total HT</th></tr></thead>
            <tbody>
              {budget.lines.map((l: any, i: number) => (
                <tr key={i} className="border-b"><td className="py-2">{l.lot}</td><td>{l.designation}</td><td className="text-right">{l.quantity}</td><td className="text-right">{l.unitPrice?.toLocaleString()}</td><td className="text-right font-medium">{l.totalHt?.toLocaleString()}</td></tr>
              ))}
            </tbody>
            <tfoot><tr className="font-bold"><td colSpan={4} className="py-2 text-right">TOTAL HT</td><td className="text-right">{totalHT.toLocaleString()} FCFA</td></tr></tfoot>
          </table>
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
