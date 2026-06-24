/**
 * ERP Solar Project Settings Page
 * Paramétrage spécifique au projet (overrides des paramètres globaux)
 */
import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { useLocation, useParams } from "wouter";
import { ArrowLeft, Plus, Trash2, Shield, AlertTriangle, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const PARAMETER_GROUPS = [
  { key: "all", label: "Tous" },
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

interface GlobalParam {
  id: number;
  parameterCode: string;
  parameterName: string;
  parameterGroup: string;
  parameterValue: string;
  unit: string | null;
  description: string | null;
  minValue: string | null;
  maxValue: string | null;
}

interface SiteOverride {
  id: number;
  solarProjectId: number;
  parameterCode: string;
  overrideValue: string;
  justification: string | null;
}

export default function ErpSolarProjectSettings() {
  const [, navigate] = useLocation();
  const params = useParams<{ id: string }>();
  const projectId = Number(params.id);
  const [filterGroup, setFilterGroup] = useState("all");
  const [addingParam, setAddingParam] = useState(false);
  const [selectedCode, setSelectedCode] = useState("");
  const [overrideValue, setOverrideValue] = useState("");
  const [overrideJustification, setOverrideJustification] = useState("");

  const utils = trpc.useUtils();

  // Load global params
  const { data: globalParams } = trpc.erp.solarSettings.global.list.useQuery({});
  // Load site overrides for this project
  const { data: siteOverrides, isLoading } = trpc.erp.solarSettings.site.list.useQuery({ solarProjectId: projectId });

  const addOverrideMutation = trpc.erp.solarSettings.site.upsert.useMutation({
    onSuccess: () => {
      toast.success("Override ajouté");
      utils.erp.solarSettings.site.list.invalidate();
      setAddingParam(false);
      setSelectedCode("");
      setOverrideValue("");
      setOverrideJustification("");
    },
    onError: (err) => toast.error(err.message),
  });

  const removeOverrideMutation = trpc.erp.solarSettings.site.resetToGlobal.useMutation({
    onSuccess: () => {
      toast.success("Override supprimé — valeur globale restaurée");
      utils.erp.solarSettings.site.list.invalidate();
    },
    onError: (err: any) => toast.error(err.message),
  });

  const overrideMap = useMemo(() => {
    const map = new Map<string, SiteOverride>();
    if (siteOverrides) {
      for (const o of siteOverrides as SiteOverride[]) {
        map.set(o.parameterCode, o);
      }
    }
    return map;
  }, [siteOverrides]);

  // Merged view: global params + overrides
  const mergedParams = useMemo(() => {
    if (!globalParams) return [];
    return (globalParams as GlobalParam[])
      .filter((p) => filterGroup === "all" || p.parameterGroup === filterGroup)
      .map((p) => ({
        ...p,
        override: overrideMap.get(p.parameterCode),
        effectiveValue: overrideMap.has(p.parameterCode)
          ? Number(overrideMap.get(p.parameterCode)!.overrideValue)
          : Number(p.parameterValue),
        isOverridden: overrideMap.has(p.parameterCode),
      }));
  }, [globalParams, overrideMap, filterGroup]);

  // Available params for adding (not yet overridden)
  const availableForOverride = useMemo(() => {
    if (!globalParams) return [];
    return (globalParams as GlobalParam[]).filter((p) => !overrideMap.has(p.parameterCode));
  }, [globalParams, overrideMap]);

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
          <Button variant="ghost" size="icon" onClick={() => navigate(`/erp/solar/${projectId}`)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Paramétrage Projet</h1>
            <p className="text-muted-foreground text-sm">
              Overrides spécifiques au projet #{projectId} — les valeurs non surchargées utilisent le paramétrage global
            </p>
          </div>
        </div>
        <Button onClick={() => setAddingParam(true)} disabled={availableForOverride.length === 0}>
          <Plus className="h-4 w-4 mr-1" />
          Ajouter un override
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-card border rounded-lg p-4">
          <p className="text-sm text-muted-foreground">Paramètres globaux</p>
          <p className="text-2xl font-bold">{(globalParams as GlobalParam[] | undefined)?.length || 0}</p>
        </div>
        <div className="bg-card border rounded-lg p-4">
          <p className="text-sm text-muted-foreground">Overrides projet</p>
          <p className="text-2xl font-bold text-blue-600">{overrideMap.size}</p>
        </div>
        <div className="bg-card border rounded-lg p-4">
          <p className="text-sm text-muted-foreground">Valeurs globales utilisées</p>
          <p className="text-2xl font-bold text-green-600">
            {((globalParams as GlobalParam[] | undefined)?.length || 0) - overrideMap.size}
          </p>
        </div>
      </div>

      {/* Add override dialog */}
      {addingParam && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <h3 className="font-medium text-blue-800 mb-3">Ajouter un override</h3>
          <div className="grid grid-cols-4 gap-3">
            <Select value={selectedCode} onValueChange={setSelectedCode}>
              <SelectTrigger>
                <SelectValue placeholder="Paramètre..." />
              </SelectTrigger>
              <SelectContent>
                {availableForOverride.map((p) => (
                  <SelectItem key={p.parameterCode} value={p.parameterCode}>
                    {p.parameterName} ({p.parameterCode})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              type="number"
              step="any"
              placeholder="Valeur override"
              value={overrideValue}
              onChange={(e) => setOverrideValue(e.target.value)}
            />
            <Input
              placeholder="Justification"
              value={overrideJustification}
              onChange={(e) => setOverrideJustification(e.target.value)}
            />
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={() => {
                  if (!selectedCode || !overrideValue) {
                    toast.error("Sélectionnez un paramètre et une valeur");
                    return;
                  }
                  addOverrideMutation.mutate({
                    solarProjectId: projectId,
                    parameterCode: selectedCode,
                    overrideValue: Number(overrideValue),
                    justification: overrideJustification || undefined,
                  });
                }}
              >
                Ajouter
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setAddingParam(false)}>
                Annuler
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Filter */}
      <div className="flex items-center gap-3 mb-4">
        <span className="text-sm text-muted-foreground">Filtrer par groupe :</span>
        <Select value={filterGroup} onValueChange={setFilterGroup}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PARAMETER_GROUPS.map((g) => (
              <SelectItem key={g.key} value={g.key}>{g.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Parameters table */}
      <div className="bg-card border rounded-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-muted/50">
            <tr>
              <th className="text-left p-3 text-sm font-medium">Code</th>
              <th className="text-left p-3 text-sm font-medium">Nom</th>
              <th className="text-right p-3 text-sm font-medium">Valeur globale</th>
              <th className="text-right p-3 text-sm font-medium">Valeur effective</th>
              <th className="text-center p-3 text-sm font-medium">Source</th>
              <th className="text-center p-3 text-sm font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {mergedParams.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-8 text-center text-muted-foreground">
                  Aucun paramètre dans ce groupe
                </td>
              </tr>
            ) : (
              mergedParams.map((param) => (
                <tr
                  key={param.parameterCode}
                  className={`border-t hover:bg-muted/30 ${param.isOverridden ? "bg-blue-50/50" : ""}`}
                >
                  <td className="p-3">
                    <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{param.parameterCode}</code>
                  </td>
                  <td className="p-3">
                    <p className="text-sm font-medium">{param.parameterName}</p>
                    {param.override?.justification && (
                      <p className="text-xs text-blue-600 mt-0.5">↳ {param.override.justification}</p>
                    )}
                  </td>
                  <td className="p-3 text-right">
                    <span className={`font-mono text-sm ${param.isOverridden ? "line-through text-muted-foreground" : "text-green-700 font-semibold"}`}>
                      {Number(param.parameterValue).toLocaleString("fr-FR")}
                    </span>
                    {param.unit && <span className="text-xs text-muted-foreground ml-1">{param.unit}</span>}
                  </td>
                  <td className="p-3 text-right">
                    <span className={`font-mono text-sm font-semibold ${param.isOverridden ? "text-blue-700" : "text-green-700"}`}>
                      {param.effectiveValue.toLocaleString("fr-FR")}
                    </span>
                    {param.unit && <span className="text-xs text-muted-foreground ml-1">{param.unit}</span>}
                  </td>
                  <td className="p-3 text-center">
                    {param.isOverridden ? (
                      <span className="inline-flex items-center gap-1 text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
                        <Shield className="h-3 w-3" />
                        Projet
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                        <Globe className="h-3 w-3" />
                        Global
                      </span>
                    )}
                  </td>
                  <td className="p-3 text-center">
                    {param.isOverridden && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 text-xs text-red-600 hover:text-red-700"
                        onClick={() => {
                          if (confirm(`Supprimer l'override pour ${param.parameterCode} ?`)) {
                            removeOverrideMutation.mutate({
                              solarProjectId: projectId,
                              parameterCode: param.parameterCode,
                            });
                          }
                        }}
                      >
                        <Trash2 className="h-3 w-3 mr-1" />
                        Supprimer
                      </Button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Info */}
      <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start gap-3">
        <AlertTriangle className="h-5 w-5 text-blue-600 mt-0.5 shrink-0" />
        <div>
          <p className="text-sm font-medium text-blue-800">Hiérarchie des paramètres</p>
          <p className="text-xs text-blue-700 mt-1">
            Lors du calcul de dimensionnement ou de budget, le système utilise en priorité les overrides projet.
            Si aucun override n'est défini, la valeur globale s'applique. Les modifications ici n'affectent que ce projet.
          </p>
        </div>
      </div>
    </div>
  );
}
