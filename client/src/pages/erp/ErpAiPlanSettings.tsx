import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { ArrowLeft, Settings, Scale, BookOpen, Plus } from "lucide-react";
import { toast } from "sonner";

export default function ErpAiPlanSettings() {
  const [, navigate] = useLocation();
  const [activeTab, setActiveTab] = useState("coefficients");

  const { data: coefficients, refetch: refetchCoeffs } = trpc.erp.aiPlanAnalyzer.coefficients.list.useQuery({});
  const { data: rules, refetch: refetchRules } = trpc.erp.aiPlanAnalyzer.rules.list.useQuery({});

  const seedMutation = trpc.erp.aiPlanAnalyzer.coefficients.seed.useMutation();
  const updateCoeffMutation = trpc.erp.aiPlanAnalyzer.coefficients.update.useMutation();
  const updateRuleMutation = trpc.erp.aiPlanAnalyzer.rules.update.useMutation();

  const handleSeed = async () => {
    try {
      const result = await seedMutation.mutateAsync();
      toast.success(`${result.seeded} coefficients initialisés`);
      refetchCoeffs();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const handleToggleCoeff = async (id: number, isActive: boolean) => {
    try {
      await updateCoeffMutation.mutateAsync({ id, isActive });
      refetchCoeffs();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const handleToggleRule = async (id: number, isActive: boolean) => {
    try {
      await updateRuleMutation.mutateAsync({ id, isActive });
      refetchRules();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/erp/ai/plans")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Paramètres IA Plan Analyzer
          </h1>
          <p className="text-sm text-muted-foreground">Coefficients de calcul, règles d'ingénierie, taux de perte</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="coefficients" className="gap-1"><Scale className="h-3 w-3" />Coefficients</TabsTrigger>
          <TabsTrigger value="rules" className="gap-1"><BookOpen className="h-3 w-3" />Règles</TabsTrigger>
        </TabsList>

        {/* Coefficients */}
        <TabsContent value="coefficients" className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">{coefficients?.length || 0} coefficients configurés</p>
            <Button size="sm" variant="outline" onClick={handleSeed} disabled={seedMutation.isPending}>
              <Plus className="h-4 w-4 mr-1" />
              Initialiser les coefficients par défaut
            </Button>
          </div>

          {coefficients && coefficients.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left p-2">Nom</th>
                    <th className="text-left p-2">Domaine</th>
                    <th className="text-right p-2">Valeur</th>
                    <th className="text-right p-2">Taux perte</th>
                    <th className="text-left p-2">Unité</th>
                    <th className="text-center p-2">Actif</th>
                  </tr>
                </thead>
                <tbody>
                  {coefficients.map((c: any) => (
                    <tr key={c.id} className="border-b hover:bg-muted/30">
                      <td className="p-2 font-medium">{c.name}</td>
                      <td className="p-2"><Badge variant="outline" className="text-xs">{c.usageDomain}</Badge></td>
                      <td className="p-2 text-right">{c.coefficientValue}</td>
                      <td className="p-2 text-right">{c.wasteRateDefault}%</td>
                      <td className="p-2">{c.unit || "-"}</td>
                      <td className="p-2 text-center">
                        <Switch
                          checked={c.isActive}
                          onCheckedChange={(val) => handleToggleCoeff(c.id, val)}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <Card>
              <CardContent className="p-8 text-center">
                <Scale className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
                <p className="text-sm text-muted-foreground">Aucun coefficient configuré. Cliquez sur "Initialiser" pour charger les valeurs par défaut.</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Rules */}
        <TabsContent value="rules" className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">{rules?.length || 0} règles configurées</p>
          </div>

          {rules && rules.length > 0 ? (
            <div className="space-y-3">
              {rules.map((rule: any) => (
                <Card key={rule.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-sm">{rule.ruleName}</span>
                          <Badge variant="outline" className="text-xs">{rule.ruleCode}</Badge>
                          <Badge variant="outline" className="text-xs">{rule.domain}</Badge>
                          <Badge variant="outline" className="text-xs">{rule.ruleType}</Badge>
                        </div>
                        {rule.description && <p className="text-xs text-muted-foreground">{rule.description}</p>}
                        {rule.sourceReference && <p className="text-xs text-muted-foreground mt-1">Réf: {rule.sourceReference}</p>}
                      </div>
                      <Switch
                        checked={rule.isActive}
                        onCheckedChange={(val) => handleToggleRule(rule.id, val)}
                      />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="p-8 text-center">
                <BookOpen className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
                <p className="text-sm text-muted-foreground">Aucune règle d'ingénierie configurée. Les règles seront créées automatiquement lors de la première analyse.</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
