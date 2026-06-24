/**
 * ERP Solar Formulas Page
 * Gestion des formules de calcul versionnées
 */
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { useLocation } from "wouter";
import { ArrowLeft, Plus, Code, Lock, Unlock, History, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Link } from "wouter";

const FORMULA_CATEGORIES = [
  { key: "pv_sizing", label: "Dimensionnement PV" },
  { key: "battery_sizing", label: "Dimensionnement Batteries" },
  { key: "inverter_sizing", label: "Dimensionnement Onduleur" },
  { key: "cable_sizing", label: "Dimensionnement Câblage" },
  { key: "budget", label: "Budget" },
  { key: "efficiency", label: "Rendement" },
  { key: "regulator", label: "Régulateur" },
] as const;

export default function ErpSolarFormulas() {
  const [, navigate] = useLocation();
  const [filterCategory, setFilterCategory] = useState("all");
  const [showAddForm, setShowAddForm] = useState(false);
  const [newFormula, setNewFormula] = useState({
    formulaCode: "",
    formulaName: "",
    category: "pv_sizing",
    expression: "",
    variables: "",
    description: "",
  });

  const utils = trpc.useUtils();
  const { data: formulas, isLoading } = trpc.erp.solarSettings.formulas.list.useQuery({});

  const createMutation = trpc.erp.solarSettings.formulas.create.useMutation({
    onSuccess: () => {
      toast.success("Formule créée");
      utils.erp.solarSettings.formulas.list.invalidate();
      setShowAddForm(false);
      setNewFormula({ formulaCode: "", formulaName: "", category: "pv_sizing", expression: "", variables: "", description: "" });
    },
    onError: (err: any) => toast.error(err.message),
  });

  const activateMutation = trpc.erp.solarSettings.formulas.activate.useMutation({
    onSuccess: () => {
      toast.success("Formule activée");
      utils.erp.solarSettings.formulas.list.invalidate();
    },
    onError: (err: any) => toast.error(err.message),
  });

  const duplicateMutation = trpc.erp.solarSettings.formulas.duplicate.useMutation({
    onSuccess: () => {
      toast.success("Formule dupliquée");
      utils.erp.solarSettings.formulas.list.invalidate();
    },
    onError: (err: any) => toast.error(err.message),
  });

  const filteredFormulas = (formulas as any[] || []).filter(
    (f: any) => filterCategory === "all" || f.formulaGroup === filterCategory
  );

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
          <Link href="/erp/solar/settings/global">
            <Button variant="ghost" size="icon"><ArrowLeft className="h-5 w-5" /></Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Code className="h-6 w-6 text-purple-600" />
              Formules de Calcul
            </h1>
            <p className="text-muted-foreground text-sm">
              Formules versionnées utilisées dans le moteur de dimensionnement et de budget
            </p>
          </div>
        </div>
        <Button onClick={() => setShowAddForm(true)}>
          <Plus className="h-4 w-4 mr-1" />
          Nouvelle formule
        </Button>
      </div>

      {/* Add form */}
      {showAddForm && (
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-6">
          <h3 className="font-medium text-purple-800 mb-3">Nouvelle formule</h3>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <Input
              placeholder="Code (ex: PV_POWER_WC)"
              value={newFormula.formulaCode}
              onChange={(e) => setNewFormula({ ...newFormula, formulaCode: e.target.value })}
            />
            <Input
              placeholder="Nom"
              value={newFormula.formulaName}
              onChange={(e) => setNewFormula({ ...newFormula, formulaName: e.target.value })}
            />
            <Select value={newFormula.category} onValueChange={(v) => setNewFormula({ ...newFormula, category: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {FORMULA_CATEGORIES.map((c) => (
                  <SelectItem key={c.key} value={c.key}>{c.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              placeholder="Variables (séparées par virgule)"
              value={newFormula.variables}
              onChange={(e) => setNewFormula({ ...newFormula, variables: e.target.value })}
            />
          </div>
          <Textarea
            placeholder="Expression (ex: dailyEnergyWh / (PSH * R * PUP))"
            value={newFormula.expression}
            onChange={(e) => setNewFormula({ ...newFormula, expression: e.target.value })}
            className="mb-3 font-mono text-sm"
          />
          <Textarea
            placeholder="Description"
            value={newFormula.description}
            onChange={(e) => setNewFormula({ ...newFormula, description: e.target.value })}
            className="mb-3"
            rows={2}
          />
          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={() => {
                if (!newFormula.formulaCode || !newFormula.expression) {
                  toast.error("Code et expression requis");
                  return;
                }
                createMutation.mutate({
                  formulaCode: newFormula.formulaCode,
                  formulaName: newFormula.formulaName,
                  formulaGroup: newFormula.category,
                  expression: newFormula.expression,
                  inputParameters: newFormula.variables,
                  description: newFormula.description,
                });
              }}
            >
              Créer
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setShowAddForm(false)}>Annuler</Button>
          </div>
        </div>
      )}

      {/* Filter */}
      <div className="flex items-center gap-3 mb-4">
        <span className="text-sm text-muted-foreground">Catégorie :</span>
        <Select value={filterCategory} onValueChange={setFilterCategory}>
          <SelectTrigger className="w-56">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes les catégories</SelectItem>
            {FORMULA_CATEGORIES.map((c) => (
              <SelectItem key={c.key} value={c.key}>{c.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="text-xs text-muted-foreground ml-auto">
          {filteredFormulas.length} formule{filteredFormulas.length > 1 ? "s" : ""}
        </span>
      </div>

      {/* Formulas list */}
      <div className="space-y-3">
        {filteredFormulas.length === 0 ? (
          <div className="bg-card border rounded-lg p-8 text-center text-muted-foreground">
            <Code className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p>Aucune formule dans cette catégorie</p>
          </div>
        ) : (
          filteredFormulas.map((formula: any) => (
            <div
              key={formula.id}
              className={`bg-card border rounded-lg p-4 ${formula.isLocked ? "border-amber-200 bg-amber-50/30" : ""}`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <code className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded font-bold">
                      {formula.formulaCode}
                    </code>
                    <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                      {FORMULA_CATEGORIES.find((c) => c.key === formula.formulaGroup)?.label || formula.formulaGroup}
                    </span>
                    <span className="text-xs text-muted-foreground">v{formula.version}</span>
                    {formula.status === "active" && (
                      <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded flex items-center gap-1">
                        <Lock className="h-3 w-3" /> Active
                      </span>
                    )}
                    {formula.status === "deprecated" && (
                      <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded">
                        Dépréciée
                      </span>
                    )}
                  </div>
                  <p className="text-sm font-medium">{formula.formulaName}</p>
                  <div className="mt-2 bg-gray-900 text-green-400 rounded p-2 font-mono text-xs overflow-x-auto">
                    {formula.expression}
                  </div>
                  {formula.inputParameters && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Variables : {formula.inputParameters}
                    </p>
                  )}
                  {formula.description && (
                    <p className="text-xs text-muted-foreground mt-1">{formula.description}</p>
                  )}
                </div>
                <div className="flex gap-1 ml-3">
                  {formula.status !== "active" && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 text-xs text-green-700"
                      onClick={() => activateMutation.mutate({ id: formula.id })}
                    >
                      <Unlock className="h-3 w-3 mr-1" />Activer
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 text-xs"
                    onClick={() => duplicateMutation.mutate({ id: formula.id })}
                  >
                    <History className="h-3 w-3 mr-1" />Dupliquer
                  </Button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Info */}
      <div className="mt-6 bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-start gap-3">
        <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
        <div>
          <p className="text-sm font-medium text-amber-800">Formules verrouillées</p>
          <p className="text-xs text-amber-700 mt-1">
            Les formules verrouillées ne peuvent pas être modifiées sans déverrouillage préalable.
            Chaque modification crée une nouvelle version pour traçabilité. Les formules sont utilisées
            par le moteur de calcul lors du dimensionnement et de la budgétisation.
          </p>
        </div>
      </div>
    </div>
  );
}
