import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import {
  Home, Radio, Briefcase, ShoppingBag, Heart, HardHat, Droplets,
  Zap, Building2, Shield, Leaf, Lightbulb, MoreHorizontal, Sparkles,
  ChevronLeft, ChevronRight, Check, Loader2
} from "lucide-react";

const DOMAIN_ICONS: Record<string, any> = {
  Domestic: Home,
  Telecom: Radio,
  Office: Briefcase,
  Commercial: ShoppingBag,
  Medical: Heart,
  "Construction Site": HardHat,
  Pumping: Droplets,
  Industrial: Zap,
  "Hotel Restaurant": Building2,
  Security: Shield,
  Agriculture: Leaf,
  "Public Lighting": Lightbulb,
  Other: MoreHorizontal,
};

const DOMAIN_LABELS: Record<string, string> = {
  Domestic: "Domestique",
  Telecom: "Télécom",
  Office: "Bureau",
  Commercial: "Commerce",
  Medical: "Santé",
  "Construction Site": "Chantier",
  Pumping: "Pompage",
  Industrial: "Industriel",
  "Hotel Restaurant": "Hôtellerie",
  Security: "Sécurité",
  Agriculture: "Agriculture",
  "Public Lighting": "Éclairage public",
  Other: "Autres",
};

interface LoadTemplateWizardProps {
  projectId: number;
  onComplete: () => void;
}

export function LoadTemplateWizard({ projectId, onComplete }: LoadTemplateWizardProps) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(1);
  const [selectedDomain, setSelectedDomain] = useState<string>("");
  const [selectedTemplateId, setSelectedTemplateId] = useState<number | null>(null);
  const [mode, setMode] = useState<"replace" | "merge">("replace");
  const [useAi, setUseAi] = useState(false);
  const [aiDescription, setAiDescription] = useState("");
  const [aiComfort, setAiComfort] = useState("Standard");
  const [aiResult, setAiResult] = useState<any>(null);


  const domainsQuery = trpc.erp.solarTemplates.getDomains.useQuery();
  const profilesQuery = trpc.erp.solarTemplates.getProfiles.useQuery(
    { domain: selectedDomain },
    { enabled: !!selectedDomain }
  );
  const templateQuery = trpc.erp.solarTemplates.getById.useQuery(
    { id: selectedTemplateId! },
    { enabled: !!selectedTemplateId }
  );

  const generateMutation = trpc.erp.solarTemplates.generateFromTemplate.useMutation({
    onSuccess: (data) => {
      toast.success(`Bilan généré : ${data.itemsCreated} charges — ${Math.round(data.totalDailyEnergyWh)} Wh/jour`);
      setOpen(false);
      resetWizard();
      onComplete();
    },
    onError: (err) => {
      toast.error(err.message);
    },
  });

  const aiGenerateMutation = trpc.erp.solarTemplates.aiGenerate.useMutation({
    onSuccess: (data) => {
      setAiResult(data);
      setStep(3);
    },
    onError: (err) => {
      toast.error(err.message);
    },
  });

  const aiApplyMutation = trpc.erp.solarTemplates.applyAiGenerated.useMutation({
    onSuccess: (data) => {
      toast.success(`Bilan IA appliqué : ${data.itemsCreated} charges créées`);
      setOpen(false);
      resetWizard();
      onComplete();
    },
    onError: (err) => {
      toast.error(err.message);
    },
  });

  function resetWizard() {
    setStep(1);
    setSelectedDomain("");
    setSelectedTemplateId(null);
    setMode("replace");
    setUseAi(false);
    setAiDescription("");
    setAiResult(null);
  }

  function handleGenerate() {
    if (useAi && aiResult) {
      aiApplyMutation.mutate({
        projectId,
        mode,
        items: aiResult.items,
      });
    } else if (selectedTemplateId) {
      generateMutation.mutate({
        projectId,
        templateId: selectedTemplateId,
        mode,
      });
    }
  }

  function handleAiGenerate() {
    aiGenerateMutation.mutate({
      projectId,
      domain: selectedDomain,
      description: aiDescription,
      comfortLevel: aiComfort,
    });
  }

  const isLoading = generateMutation.isPending || aiApplyMutation.isPending || aiGenerateMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetWizard(); }}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Zap className="h-4 w-4" />
          Créer un bilan type
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-amber-500" />
            Assistant bilan de puissance
            <Badge variant="outline" className="ml-2">Étape {step}/4</Badge>
          </DialogTitle>
        </DialogHeader>

        {/* Step 1: Choose domain */}
        {step === 1 && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Choisissez le domaine d'activité pour votre bilan de puissance :
            </p>
            <div className="grid grid-cols-3 gap-3">
              {(domainsQuery.data || []).map((d) => {
                const Icon = DOMAIN_ICONS[d.domain] || MoreHorizontal;
                return (
                  <Card
                    key={d.domain}
                    className={`cursor-pointer transition-all hover:border-primary ${
                      selectedDomain === d.domain ? "border-primary bg-primary/5 ring-1 ring-primary" : ""
                    }`}
                    onClick={() => setSelectedDomain(d.domain)}
                  >
                    <CardContent className="flex flex-col items-center gap-2 p-4">
                      <Icon className="h-8 w-8 text-primary" />
                      <span className="text-sm font-medium text-center">
                        {DOMAIN_LABELS[d.domain] || d.domain}
                      </span>
                      <Badge variant="secondary" className="text-xs">{d.count} profils</Badge>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* AI option */}
            <Card
              className={`cursor-pointer transition-all hover:border-amber-500 ${
                useAi ? "border-amber-500 bg-amber-50 ring-1 ring-amber-500" : ""
              }`}
              onClick={() => setUseAi(!useAi)}
            >
              <CardContent className="flex items-center gap-3 p-4">
                <Sparkles className="h-6 w-6 text-amber-500" />
                <div>
                  <p className="font-medium">Génération IA personnalisée</p>
                  <p className="text-xs text-muted-foreground">
                    Décrivez votre besoin et l'IA proposera un bilan adapté
                  </p>
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-end">
              <Button
                onClick={() => setStep(2)}
                disabled={!selectedDomain && !useAi}
              >
                Suivant <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 2: Choose profile or AI description */}
        {step === 2 && (
          <div className="space-y-4">
            {useAi ? (
              <>
                <p className="text-sm text-muted-foreground">
                  Décrivez votre projet pour que l'IA génère un bilan adapté :
                </p>
                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-medium">Domaine</label>
                    <Select value={selectedDomain} onValueChange={setSelectedDomain}>
                      <SelectTrigger><SelectValue placeholder="Choisir un domaine" /></SelectTrigger>
                      <SelectContent>
                        {Object.entries(DOMAIN_LABELS).map(([key, label]) => (
                          <SelectItem key={key} value={key}>{label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Niveau de confort</label>
                    <Select value={aiComfort} onValueChange={setAiComfort}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Economic">Économique</SelectItem>
                        <SelectItem value="Standard">Standard</SelectItem>
                        <SelectItem value="Comfort">Confort</SelectItem>
                        <SelectItem value="Premium">Premium</SelectItem>
                        <SelectItem value="Critical">Critique 24h/24</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Description du besoin</label>
                    <Textarea
                      value={aiDescription}
                      onChange={(e) => setAiDescription(e.target.value)}
                      placeholder="Ex: Villa de 4 personnes avec piscine, 3 climatiseurs, bureau à domicile..."
                      rows={4}
                    />
                  </div>
                </div>
                <div className="flex justify-between">
                  <Button variant="outline" onClick={() => setStep(1)}>
                    <ChevronLeft className="h-4 w-4 mr-1" /> Retour
                  </Button>
                  <Button
                    onClick={handleAiGenerate}
                    disabled={!aiDescription || !selectedDomain || aiGenerateMutation.isPending}
                  >
                    {aiGenerateMutation.isPending ? (
                      <><Loader2 className="h-4 w-4 mr-1 animate-spin" /> Génération...</>
                    ) : (
                      <><Sparkles className="h-4 w-4 mr-1" /> Générer avec IA</>
                    )}
                  </Button>
                </div>
              </>
            ) : (
              <>
                <p className="text-sm text-muted-foreground">
                  Choisissez le profil type pour <strong>{DOMAIN_LABELS[selectedDomain] || selectedDomain}</strong> :
                </p>
                <div className="space-y-2">
                  {(profilesQuery.data || []).map((t) => (
                    <Card
                      key={t.id}
                      className={`cursor-pointer transition-all hover:border-primary ${
                        selectedTemplateId === t.id ? "border-primary bg-primary/5 ring-1 ring-primary" : ""
                      }`}
                      onClick={() => setSelectedTemplateId(t.id)}
                    >
                      <CardContent className="flex items-center justify-between p-4">
                        <div>
                          <p className="font-medium">{t.templateName}</p>
                          <p className="text-xs text-muted-foreground">{t.description}</p>
                        </div>
                        <Badge>{t.comfortLevel}</Badge>
                      </CardContent>
                    </Card>
                  ))}
                </div>
                <div className="flex justify-between">
                  <Button variant="outline" onClick={() => { setStep(1); setSelectedTemplateId(null); }}>
                    <ChevronLeft className="h-4 w-4 mr-1" /> Retour
                  </Button>
                  <Button onClick={() => setStep(3)} disabled={!selectedTemplateId}>
                    Suivant <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </>
            )}
          </div>
        )}

        {/* Step 3: Preview */}
        {step === 3 && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Aperçu des charges qui seront générées :
            </p>

            {useAi && aiResult ? (
              <>
                <p className="text-sm italic text-amber-700 bg-amber-50 p-2 rounded">
                  {aiResult.summary}
                </p>
                <div className="max-h-60 overflow-y-auto border rounded">
                  <table className="w-full text-sm">
                    <thead className="bg-muted sticky top-0">
                      <tr>
                        <th className="text-left p-2">Équipement</th>
                        <th className="text-right p-2">W</th>
                        <th className="text-right p-2">Qté</th>
                        <th className="text-right p-2">h/j</th>
                        <th className="text-right p-2">Wh/j</th>
                        <th className="text-center p-2">Crit.</th>
                      </tr>
                    </thead>
                    <tbody>
                      {aiResult.items.map((item: any, i: number) => (
                        <tr key={i} className="border-t">
                          <td className="p-2">{item.name}</td>
                          <td className="text-right p-2">{item.powerW}</td>
                          <td className="text-right p-2">{item.quantity}</td>
                          <td className="text-right p-2">{item.hoursPerDay}</td>
                          <td className="text-right p-2 font-medium">
                            {Math.round(item.powerW * item.quantity * item.hoursPerDay)}
                          </td>
                          <td className="text-center p-2">
                            {item.isCritical && <Badge variant="destructive" className="text-xs">Oui</Badge>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {aiResult.recommendations?.length > 0 && (
                  <div className="bg-blue-50 p-3 rounded text-sm space-y-1">
                    <p className="font-medium text-blue-800">Recommandations IA :</p>
                    {aiResult.recommendations.map((r: string, i: number) => (
                      <p key={i} className="text-blue-700">• {r}</p>
                    ))}
                  </div>
                )}
              </>
            ) : templateQuery.data ? (
              <div className="max-h-60 overflow-y-auto border rounded">
                <table className="w-full text-sm">
                  <thead className="bg-muted sticky top-0">
                    <tr>
                      <th className="text-left p-2">Équipement</th>
                      <th className="text-right p-2">W</th>
                      <th className="text-right p-2">Qté</th>
                      <th className="text-right p-2">h/j</th>
                      <th className="text-right p-2">Wh/j</th>
                      <th className="text-center p-2">Crit.</th>
                      <th className="text-center p-2">Nuit</th>
                    </tr>
                  </thead>
                  <tbody>
                    {templateQuery.data.items.map((item) => (
                      <tr key={item.id} className="border-t">
                        <td className="p-2">{item.equipmentName}</td>
                        <td className="text-right p-2">{Number(item.powerW)}</td>
                        <td className="text-right p-2">{item.quantity}</td>
                        <td className="text-right p-2">{Number(item.hoursPerDay)}</td>
                        <td className="text-right p-2 font-medium">
                          {Math.round(Number(item.powerW) * item.quantity * Number(item.hoursPerDay))}
                        </td>
                        <td className="text-center p-2">
                          {item.isCriticalLoad && <Badge variant="destructive" className="text-xs">Oui</Badge>}
                        </td>
                        <td className="text-center p-2">
                          {item.isNightLoad && <Badge variant="secondary" className="text-xs">Oui</Badge>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="flex items-center justify-center p-8">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            )}

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep(2)}>
                <ChevronLeft className="h-4 w-4 mr-1" /> Retour
              </Button>
              <Button onClick={() => setStep(4)}>
                Suivant <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 4: Generate */}
        {step === 4 && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Choisissez comment appliquer le bilan type :
            </p>

            <div className="space-y-3">
              <Card
                className={`cursor-pointer transition-all ${mode === "replace" ? "border-primary ring-1 ring-primary" : ""}`}
                onClick={() => setMode("replace")}
              >
                <CardContent className="p-4">
                  <p className="font-medium">Remplacer le bilan actuel</p>
                  <p className="text-xs text-muted-foreground">
                    Supprime toutes les charges existantes et les remplace par le template
                  </p>
                </CardContent>
              </Card>
              <Card
                className={`cursor-pointer transition-all ${mode === "merge" ? "border-primary ring-1 ring-primary" : ""}`}
                onClick={() => setMode("merge")}
              >
                <CardContent className="p-4">
                  <p className="font-medium">Ajouter au bilan existant</p>
                  <p className="text-xs text-muted-foreground">
                    Conserve les charges existantes et ajoute celles du template
                  </p>
                </CardContent>
              </Card>
            </div>

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep(3)}>
                <ChevronLeft className="h-4 w-4 mr-1" /> Retour
              </Button>
              <Button onClick={handleGenerate} disabled={isLoading}>
                {isLoading ? (
                  <><Loader2 className="h-4 w-4 mr-1 animate-spin" /> Génération...</>
                ) : (
                  <><Check className="h-4 w-4 mr-1" /> Générer le bilan</>
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
