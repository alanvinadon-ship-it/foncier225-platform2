/**
 * ERP Solar Global Settings Page
 * Paramétrage global du module solaire avec onglets par groupe
 */
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { useLocation } from "wouter";
import { ArrowLeft, Save, RotateCcw, History, Shield, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// Parameter groups mapping
const PARAMETER_GROUPS = [
  { key: "general", label: "Général" },
  { key: "pv", label: "Panneaux PV" },
  { key: "battery", label: "Batteries" },
  { key: "inverter", label: "Onduleur" },
  { key: "cables", label: "Câblage" },
  { key: "budget", label: "Budget" },
  { key: "efficiency", label: "Rendement" },
  { key: "safety", label: "Sécurité" },
  { key: "environment", label: "Environnement" },
  { key: "advanced", label: "Avancé" },
] as const;

interface ParameterRow {
  id: number;
  parameterCode: string;
  parameterName: string;
  parameterGroup: string;
  parameterValue: string;
  unit: string | null;
  description: string | null;
  minValue: string | null;
  maxValue: string | null;
  isLocked: boolean | null;
}

export default function ErpSolarGlobalSettings() {
  const [, navigate] = useLocation();
  const [activeTab, setActiveTab] = useState("general");
  const [editingParam, setEditingParam] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [justification, setJustification] = useState("");

  const utils = trpc.useUtils();
  const { data: params, isLoading } = trpc.erp.solarSettings.global.list.useQuery({});
  // Calculation runs history is shown per-project, not globally
  const history: any[] = [];

  const upsertMutation = trpc.erp.solarSettings.global.upsert.useMutation({
    onSuccess: () => {
      toast.success("Paramètre mis à jour");
      utils.erp.solarSettings.global.list.invalidate();
      setEditingParam(null);
      setJustification("");
    },
    onError: (err) => toast.error(err.message),
  });

  const resetMutation = trpc.erp.solarSettings.global.resetDefaults.useMutation({
    onSuccess: () => {
      toast.success("Paramètres réinitialisés aux valeurs par défaut");
      utils.erp.solarSettings.global.list.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const filteredParams = (params as ParameterRow[] | undefined)?.filter(
    (p) => p.parameterGroup === activeTab
  ) || [];

  function startEdit(param: ParameterRow) {
    if (param.isLocked) {
      toast.error("Ce paramètre est verrouillé");
      return;
    }
    setEditingParam(param.parameterCode);
    setEditValue(String(param.parameterValue));
  }

  function saveEdit(param: ParameterRow) {
    const numValue = Number(editValue);
    if (isNaN(numValue)) {
      toast.error("Valeur numérique invalide");
      return;
    }
    if (param.minValue && numValue < Number(param.minValue)) {
      toast.error(`Valeur minimum: ${param.minValue}`);
      return;
    }
    if (param.maxValue && numValue > Number(param.maxValue)) {
      toast.error(`Valeur maximum: ${param.maxValue}`);
      return;
    }
    upsertMutation.mutate({
      parameterCode: param.parameterCode,
      parameterName: param.parameterName,
      parameterGroup: param.parameterGroup,
      parameterValue: numValue,
      unit: param.unit || undefined,
      description: param.description || undefined,
      minValue: param.minValue ? Number(param.minValue) : undefined,
      maxValue: param.maxValue ? Number(param.maxValue) : undefined,
    });
  }

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/3" />
          <div className="h-64 bg-muted rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/erp/solar/settings")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Paramétrage Global Solaire</h1>
            <p className="text-muted-foreground text-sm">
              Paramètres par défaut appliqués à tous les projets (sauf overrides)
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              if (confirm("Réinitialiser tous les paramètres aux valeurs par défaut ?")) {
                resetMutation.mutate();
              }
            }}
          >
            <RotateCcw className="h-4 w-4 mr-1" />
            Réinitialiser
          </Button>
        </div>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-card border rounded-lg p-4">
          <p className="text-sm text-muted-foreground">Paramètres totaux</p>
          <p className="text-2xl font-bold">{(params as ParameterRow[] | undefined)?.length || 0}</p>
        </div>
        <div className="bg-card border rounded-lg p-4">
          <p className="text-sm text-muted-foreground">Verrouillés</p>
          <p className="text-2xl font-bold text-orange-600">
            {(params as ParameterRow[] | undefined)?.filter((p) => p.isLocked).length || 0}
          </p>
        </div>
        <div className="bg-card border rounded-lg p-4">
          <p className="text-sm text-muted-foreground">Groupes</p>
          <p className="text-2xl font-bold">
            {new Set((params as ParameterRow[] | undefined)?.map((p) => p.parameterGroup)).size || 0}
          </p>
        </div>
        <div className="bg-card border rounded-lg p-4">
          <p className="text-sm text-muted-foreground">Derniers calculs</p>
          <p className="text-2xl font-bold text-green-600">{(history as any[])?.length || 0}</p>
        </div>
      </div>

      {/* Tabs by group */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex flex-wrap h-auto gap-1 mb-4">
          {PARAMETER_GROUPS.map((g) => {
            const count = (params as ParameterRow[] | undefined)?.filter(
              (p) => p.parameterGroup === g.key
            ).length || 0;
            return (
              <TabsTrigger key={g.key} value={g.key} className="text-xs">
                {g.label} {count > 0 && <span className="ml-1 text-muted-foreground">({count})</span>}
              </TabsTrigger>
            );
          })}
        </TabsList>

        {PARAMETER_GROUPS.map((g) => (
          <TabsContent key={g.key} value={g.key}>
            <div className="bg-card border rounded-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left p-3 text-sm font-medium">Code</th>
                    <th className="text-left p-3 text-sm font-medium">Nom</th>
                    <th className="text-right p-3 text-sm font-medium">Valeur</th>
                    <th className="text-center p-3 text-sm font-medium">Unité</th>
                    <th className="text-center p-3 text-sm font-medium">Min/Max</th>
                    <th className="text-center p-3 text-sm font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredParams.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-muted-foreground">
                        Aucun paramètre dans ce groupe
                      </td>
                    </tr>
                  ) : (
                    filteredParams.map((param) => (
                      <tr key={param.parameterCode} className="border-t hover:bg-muted/30">
                        <td className="p-3">
                          <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{param.parameterCode}</code>
                        </td>
                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            {param.isLocked && <Shield className="h-3.5 w-3.5 text-orange-500" />}
                            <div>
                              <p className="text-sm font-medium">{param.parameterName}</p>
                              {param.description && (
                                <p className="text-xs text-muted-foreground">{param.description}</p>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="p-3 text-right">
                          {editingParam === param.parameterCode ? (
                            <div className="flex flex-col gap-1 items-end">
                              <Input
                                type="number"
                                step="any"
                                value={editValue}
                                onChange={(e) => setEditValue(e.target.value)}
                                className="w-32 text-right h-8"
                                autoFocus
                              />
                              <Input
                                placeholder="Justification (optionnel)"
                                value={justification}
                                onChange={(e) => setJustification(e.target.value)}
                                className="w-48 text-xs h-7"
                              />
                            </div>
                          ) : (
                            <span className="font-mono text-sm font-semibold text-green-700">
                              {Number(param.parameterValue).toLocaleString("fr-FR")}
                            </span>
                          )}
                        </td>
                        <td className="p-3 text-center text-sm text-muted-foreground">
                          {param.unit || "—"}
                        </td>
                        <td className="p-3 text-center text-xs text-muted-foreground">
                          {param.minValue || param.maxValue ? (
                            <span>
                              {param.minValue ?? "—"} / {param.maxValue ?? "—"}
                            </span>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td className="p-3 text-center">
                          {editingParam === param.parameterCode ? (
                            <div className="flex gap-1 justify-center">
                              <Button size="sm" variant="default" onClick={() => saveEdit(param)} className="h-7 text-xs">
                                <Save className="h-3 w-3 mr-1" />
                                Enregistrer
                              </Button>
                              <Button size="sm" variant="ghost" onClick={() => setEditingParam(null)} className="h-7 text-xs">
                                Annuler
                              </Button>
                            </div>
                          ) : (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => startEdit(param)}
                              disabled={!!param.isLocked}
                              className="h-7 text-xs"
                            >
                              Modifier
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </TabsContent>
        ))}
      </Tabs>

      {/* Recent calculation runs */}
      {(history as any[])?.length > 0 && (
        <div className="mt-8">
          <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <History className="h-5 w-5" />
            Derniers calculs
          </h3>
          <div className="bg-card border rounded-lg overflow-hidden">
            <table className="w-full">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left p-3 text-sm font-medium">Type</th>
                  <th className="text-left p-3 text-sm font-medium">Projet</th>
                  <th className="text-left p-3 text-sm font-medium">Statut</th>
                  <th className="text-right p-3 text-sm font-medium">Durée</th>
                  <th className="text-right p-3 text-sm font-medium">Date</th>
                </tr>
              </thead>
              <tbody>
                {(history as any[]).map((run: any) => (
                  <tr key={run.id} className="border-t">
                    <td className="p-3">
                      <span className={`text-xs px-2 py-0.5 rounded ${
                        run.runType === "sizing" ? "bg-blue-100 text-blue-700" : "bg-green-100 text-green-700"
                      }`}>
                        {run.runType === "sizing" ? "Dimensionnement" : "Budget"}
                      </span>
                    </td>
                    <td className="p-3 text-sm">Projet #{run.solarProjectId}</td>
                    <td className="p-3">
                      <span className={`text-xs ${run.status === "completed" ? "text-green-600" : "text-red-600"}`}>
                        {run.status === "completed" ? "✓ Succès" : "✗ Erreur"}
                      </span>
                    </td>
                    <td className="p-3 text-right text-sm text-muted-foreground">
                      {run.durationMs ? `${run.durationMs}ms` : "—"}
                    </td>
                    <td className="p-3 text-right text-sm text-muted-foreground">
                      {new Date(run.createdAt).toLocaleString("fr-FR")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Warning */}
      <div className="mt-6 bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-start gap-3">
        <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
        <div>
          <p className="text-sm font-medium text-amber-800">Impact des modifications</p>
          <p className="text-xs text-amber-700 mt-1">
            Les modifications des paramètres globaux affectent tous les futurs calculs de dimensionnement et de budget.
            Les projets avec des overrides spécifiques ne seront pas impactés. Chaque modification est tracée dans l'historique d'audit.
          </p>
        </div>
      </div>
    </div>
  );
}
