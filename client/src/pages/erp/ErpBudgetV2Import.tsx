import { useState, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Upload, FileSpreadsheet, CheckCircle, AlertCircle, ArrowRight, Loader2 } from "lucide-react";

export default function ErpBudgetV2Import() {
  const [, navigate] = useLocation();
  const [file, setFile] = useState<File | null>(null);
  const [analysisResult, setAnalysisResult] = useState<any>(null);
  const [selectedBudgetId, setSelectedBudgetId] = useState<string>("");
  const [sheetMappings, setSheetMappings] = useState<any[]>([]);
  const [step, setStep] = useState<"upload" | "analyse" | "mapping" | "commit">("upload");
  const [importId, setImportId] = useState<number | null>(null);
  const [commitResult, setCommitResult] = useState<any>(null);

  const { data: budgets } = trpc.erp.budgetV2.budgets.list.useQuery({ page: 1, limit: 100 });
  const uploadMut = trpc.erp.budgetImport.upload.useMutation({
    onSuccess: (data) => {
      setAnalysisResult(data);
      setImportId(data.importId);
      // Auto-create mappings from detected sheets
      const mappings = data.sheets.map((s: any) => ({
        sheetName: s.name,
        sheetType: s.sheetType || "charges",
        categoryColumn: s.categoryColumn || 1,
        monthStartColumn: s.monthColumns.length > 0 ? s.monthColumns[0].col : 2,
        monthEndColumn: s.monthColumns.length > 0 ? s.monthColumns[s.monthColumns.length - 1].col : 13,
        headerRow: s.headerRow || 1,
        skipTotalRows: true,
      }));
      setSheetMappings(mappings);
      setStep("analyse");
      toast.success("Fichier analysé avec succès");
    },
    onError: (e) => toast.error(e.message),
  });

  const commitMut = trpc.erp.budgetImport.commit.useMutation({
    onSuccess: (data) => {
      setCommitResult(data);
      setStep("commit");
      toast.success(`${data.totalLines} lignes importées`);
    },
    onError: (e) => toast.error(e.message),
  });

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) {
      if (f.size > 10 * 1024 * 1024) { toast.error("Fichier trop volumineux (max 10 Mo)"); return; }
      setFile(f);
    }
  }, []);

  const handleUpload = useCallback(async () => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = (reader.result as string).split(",")[1];
      uploadMut.mutate({ fileName: file.name, fileBase64: base64, budgetId: selectedBudgetId ? Number(selectedBudgetId) : undefined });
    };
    reader.readAsDataURL(file);
  }, [file, selectedBudgetId, uploadMut]);

  const handleCommit = useCallback(() => {
    if (!importId || !selectedBudgetId) { toast.error("Sélectionnez un budget cible"); return; }
    commitMut.mutate({ importId, budgetId: Number(selectedBudgetId), sheetMappings });
  }, [importId, selectedBudgetId, sheetMappings, commitMut]);

  const updateMapping = (idx: number, field: string, value: any) => {
    setSheetMappings(prev => prev.map((m, i) => i === idx ? { ...m, [field]: value } : m));
  };

  return (
    <div className="p-6 space-y-6 max-w-5xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Import Excel Budget</h1>
          <p className="text-sm text-gray-500 mt-1">Importez un fichier Excel pour créer ou alimenter un budget prévisionnel</p>
        </div>
      </div>

      {/* Steps indicator */}
      <div className="flex items-center gap-2 text-sm">
        <Badge variant={step === "upload" ? "default" : "secondary"}>1. Upload</Badge>
        <ArrowRight className="w-4 h-4 text-gray-400" />
        <Badge variant={step === "analyse" ? "default" : "secondary"}>2. Analyse</Badge>
        <ArrowRight className="w-4 h-4 text-gray-400" />
        <Badge variant={step === "mapping" || step === "analyse" ? "default" : "secondary"}>3. Mapping</Badge>
        <ArrowRight className="w-4 h-4 text-gray-400" />
        <Badge variant={step === "commit" ? "default" : "secondary"}>4. Import</Badge>
      </div>

      {/* Step 1: Upload */}
      {step === "upload" && (
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Upload className="w-5 h-5" />Sélectionner le fichier</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="border-2 border-dashed border-gray-200 rounded-lg p-8 text-center">
              <FileSpreadsheet className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <input type="file" accept=".xlsx,.xls" onChange={handleFileChange} className="hidden" id="budget-file" />
              <label htmlFor="budget-file" className="cursor-pointer text-blue-600 hover:text-blue-800 font-medium">
                Cliquez pour sélectionner un fichier Excel
              </label>
              <p className="text-sm text-gray-400 mt-2">Formats acceptés : .xlsx, .xls (max 10 Mo)</p>
              {file && <p className="text-sm text-green-600 mt-3 font-medium">{file.name} ({(file.size / 1024).toFixed(0)} Ko)</p>}
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700">Budget cible (optionnel)</label>
              <Select value={selectedBudgetId} onValueChange={setSelectedBudgetId}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Sélectionner un budget existant..." /></SelectTrigger>
                <SelectContent>
                  {(budgets?.budgets || []).map((b: any) => (
                    <SelectItem key={b.id} value={String(b.id)}>{b.budgetCode} — {b.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-400 mt-1">Si aucun budget n'est sélectionné, les données seront analysées sans import</p>
            </div>

            <Button onClick={handleUpload} disabled={!file || uploadMut.isPending} className="w-full">
              {uploadMut.isPending ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Analyse en cours...</> : "Analyser le fichier"}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Analysis Results + Mapping */}
      {(step === "analyse" || step === "mapping") && analysisResult && (
        <>
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><CheckCircle className="w-5 h-5 text-green-600" />Résultat de l'analyse</CardTitle></CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 mb-4">{analysisResult.sheets.length} feuille(s) détectée(s) dans le fichier</p>
              <div className="space-y-3">
                {analysisResult.sheets.map((sheet: any, idx: number) => (
                  <div key={idx} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium">{sheet.name}</h4>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{sheet.rowCount} lignes</Badge>
                        <Badge variant="outline">{sheet.monthColumns.length} mois détectés</Badge>
                        <Badge className={sheet.sheetType !== "unknown" ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}>
                          {sheet.sheetType !== "unknown" ? sheet.sheetType : "Non classé"}
                        </Badge>
                      </div>
                    </div>

                    {/* Mapping controls */}
                    <div className="grid grid-cols-4 gap-3 mt-3">
                      <div>
                        <label className="text-xs text-gray-500">Type</label>
                        <Select value={sheetMappings[idx]?.sheetType || "charges"} onValueChange={v => updateMapping(idx, "sheetType", v)}>
                          <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="revenue">Recettes</SelectItem>
                            <SelectItem value="charges">Charges</SelectItem>
                            <SelectItem value="investment">Investissement</SelectItem>
                            <SelectItem value="pl">P&L</SelectItem>
                            <SelectItem value="cashflow">Cash Flow</SelectItem>
                            <SelectItem value="summary">Synthèse</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <label className="text-xs text-gray-500">Col. catégorie</label>
                        <input type="number" min={1} className="w-full h-8 border rounded px-2 text-xs" value={sheetMappings[idx]?.categoryColumn || 1} onChange={e => updateMapping(idx, "categoryColumn", Number(e.target.value))} />
                      </div>
                      <div>
                        <label className="text-xs text-gray-500">Col. début mois</label>
                        <input type="number" min={1} className="w-full h-8 border rounded px-2 text-xs" value={sheetMappings[idx]?.monthStartColumn || 2} onChange={e => updateMapping(idx, "monthStartColumn", Number(e.target.value))} />
                      </div>
                      <div>
                        <label className="text-xs text-gray-500">Col. fin mois</label>
                        <input type="number" min={1} className="w-full h-8 border rounded px-2 text-xs" value={sheetMappings[idx]?.monthEndColumn || 13} onChange={e => updateMapping(idx, "monthEndColumn", Number(e.target.value))} />
                      </div>
                    </div>

                    {/* Sample data */}
                    {sheet.sampleRows.length > 0 && (
                      <div className="mt-3">
                        <p className="text-xs text-gray-500 mb-1">Aperçu (premières lignes) :</p>
                        <div className="overflow-x-auto">
                          <table className="text-xs w-full">
                            <tbody>
                              {sheet.sampleRows.slice(0, 3).map((row: any, ri: number) => (
                                <tr key={ri} className="border-b">
                                  <td className="px-2 py-1 font-medium">{row.label}</td>
                                  {row.months?.slice(0, 6).map((v: number, mi: number) => (
                                    <td key={mi} className="px-2 py-1 text-right">{v?.toLocaleString("fr-FR") || "0"}</td>
                                  ))}
                                  {row.months?.length > 6 && <td className="px-2 py-1 text-gray-400">...</td>}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {selectedBudgetId && (
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => { setStep("upload"); setAnalysisResult(null); }}>Recommencer</Button>
              <Button onClick={handleCommit} disabled={commitMut.isPending}>
                {commitMut.isPending ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Import en cours...</> : "Importer les données"}
              </Button>
            </div>
          )}
          {!selectedBudgetId && (
            <Card className="border-yellow-200 bg-yellow-50">
              <CardContent className="py-4">
                <p className="text-sm text-yellow-800 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" />
                  Sélectionnez un budget cible pour pouvoir importer les données
                </p>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* Step 4: Commit result */}
      {step === "commit" && commitResult && (
        <Card className="border-green-200">
          <CardContent className="py-8 text-center">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-gray-900">Import terminé</h3>
            <p className="text-gray-600 mt-2">{commitResult.totalLines} lignes budgétaires créées</p>
            {commitResult.errorsCount > 0 && (
              <p className="text-yellow-600 mt-1">{commitResult.errorsCount} erreur(s) rencontrée(s)</p>
            )}
            <div className="flex justify-center gap-3 mt-6">
              <Button variant="outline" onClick={() => { setStep("upload"); setFile(null); setAnalysisResult(null); setCommitResult(null); }}>Nouvel import</Button>
              <Button onClick={() => navigate(`/erp/budget-v2/${selectedBudgetId}`)}>Voir le budget</Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
