import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Download, FileSpreadsheet, Plus, Eye, XCircle } from "lucide-react";

const statusLabels: Record<string, string> = {
  draft: "Brouillon",
  generated: "Généré",
  downloaded: "Téléchargé",
  failed: "Échoué",
  cancelled: "Annulé",
};

const statusColors: Record<string, string> = {
  draft: "bg-gray-100 text-gray-700",
  generated: "bg-green-100 text-green-700",
  downloaded: "bg-blue-100 text-blue-700",
  failed: "bg-red-100 text-red-700",
  cancelled: "bg-orange-100 text-orange-700",
};

export default function ErpAccountingExport() {
  const [showGenerate, setShowGenerate] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [genInput, setGenInput] = useState({ dateFrom: "", dateTo: "", formatId: "", notes: "" });

  const { data: formats } = trpc.erp.accountingExport.formats.list.useQuery();
  const { data: exports, refetch } = trpc.erp.accountingExport.exports.list.useQuery({ limit: 100 });

  const previewQuery = trpc.erp.accountingExport.exports.preview.useQuery(
    { dateFrom: new Date(genInput.dateFrom).getTime(), dateTo: new Date(genInput.dateTo).getTime(), formatId: parseInt(genInput.formatId) || 0 },
    { enabled: showPreview && !!genInput.dateFrom && !!genInput.dateTo && !!genInput.formatId }
  );

  const generateMutation = trpc.erp.accountingExport.exports.generate.useMutation({
    onSuccess: (r) => {
      toast.success(`Export généré: ${r.exportNumber} (${r.entriesCount} écritures)`);
      setShowGenerate(false);
      refetch();
    },
    onError: (e) => toast.error(e.message),
  });

  const cancelMutation = trpc.erp.accountingExport.exports.cancel.useMutation({
    onSuccess: () => { toast.success("Export annulé"); refetch(); },
  });

  const handleDownload = async (id: number) => {
    try {
      const result = await trpc.erp.accountingExport.exports.download.useQuery.call(null as any, { id });
      // Create download link
      toast.success("Téléchargement préparé");
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const handleGenerate = () => {
    if (!genInput.dateFrom || !genInput.dateTo || !genInput.formatId) {
      toast.error("Veuillez remplir tous les champs obligatoires");
      return;
    }
    generateMutation.mutate({
      dateFrom: new Date(genInput.dateFrom).getTime(),
      dateTo: new Date(genInput.dateTo).getTime(),
      formatId: parseInt(genInput.formatId),
      notes: genInput.notes || undefined,
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Export Comptable</h1>
          <p className="text-sm text-muted-foreground mt-1">Générez des exports au format SAGE, CODA ou CSV standard</p>
        </div>
        <Dialog open={showGenerate} onOpenChange={setShowGenerate}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" />Nouvel export</Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle>Générer un export comptable</DialogTitle></DialogHeader>
            <div className="space-y-4 pt-4">
              <div>
                <Label>Format d'export *</Label>
                <Select value={genInput.formatId} onValueChange={(v) => setGenInput({ ...genInput, formatId: v })}>
                  <SelectTrigger><SelectValue placeholder="Sélectionner un format" /></SelectTrigger>
                  <SelectContent>
                    {formats?.map((f: any) => (
                      <SelectItem key={f.id} value={f.id.toString()}>{f.formatName} ({f.formatCode})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Date début *</Label><Input type="date" value={genInput.dateFrom} onChange={(e) => setGenInput({ ...genInput, dateFrom: e.target.value })} /></div>
                <div><Label>Date fin *</Label><Input type="date" value={genInput.dateTo} onChange={(e) => setGenInput({ ...genInput, dateTo: e.target.value })} /></div>
              </div>
              <div><Label>Notes</Label><Textarea value={genInput.notes} onChange={(e) => setGenInput({ ...genInput, notes: e.target.value })} placeholder="Notes optionnelles..." /></div>

              {/* Preview */}
              {genInput.dateFrom && genInput.dateTo && genInput.formatId && (
                <Card className="bg-muted/50">
                  <CardContent className="pt-4 text-sm space-y-1">
                    <div className="font-medium mb-2">Aperçu :</div>
                    {previewQuery.isLoading ? <p>Chargement...</p> : previewQuery.data ? (
                      <>
                        <div className="flex justify-between"><span>Écritures :</span><span className="font-medium">{previewQuery.data.entriesCount}</span></div>
                        <div className="flex justify-between"><span>Lignes :</span><span className="font-medium">{previewQuery.data.linesCount}</span></div>
                        <div className="flex justify-between"><span>Total débit :</span><span className="font-medium">{(previewQuery.data.totalDebit / 100).toLocaleString("fr-FR")} F</span></div>
                        <div className="flex justify-between"><span>Total crédit :</span><span className="font-medium">{(previewQuery.data.totalCredit / 100).toLocaleString("fr-FR")} F</span></div>
                        <div className="flex justify-between"><span>Équilibré :</span>
                          {previewQuery.data.isBalanced ? <Badge className="bg-green-600">Oui</Badge> : <Badge variant="destructive">Non</Badge>}
                        </div>
                      </>
                    ) : null}
                  </CardContent>
                </Card>
              )}

              <Button onClick={handleGenerate} disabled={generateMutation.isPending} className="w-full">
                {generateMutation.isPending ? "Génération..." : "Générer l'export"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Formats */}
      <Card>
        <CardHeader><CardTitle className="text-base">Formats disponibles</CardTitle></CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-3">
            {formats?.map((f: any) => (
              <div key={f.id} className="border rounded-lg p-3">
                <div className="font-medium">{f.formatName}</div>
                <div className="text-xs text-muted-foreground mt-1">Code: {f.formatCode}</div>
                <div className="text-xs text-muted-foreground">Séparateur: "{f.delimiter}" | Date: {f.dateFormat}</div>
                <div className="text-xs text-muted-foreground">Encodage: {f.encoding} | Décimal: "{f.decimalSeparator}"</div>
              </div>
            ))}
            {!formats?.length && <p className="text-sm text-muted-foreground col-span-3">Aucun format configuré. Créez un format SAGE, CODA ou CSV standard.</p>}
          </div>
        </CardContent>
      </Card>

      {/* Exports list */}
      <Card>
        <CardHeader><CardTitle className="text-lg">Historique des exports</CardTitle></CardHeader>
        <CardContent>
          {!exports?.items.length ? (
            <div className="text-center py-12 text-muted-foreground">
              <FileSpreadsheet className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>Aucun export généré</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="pb-3 font-medium">N° Export</th>
                    <th className="pb-3 font-medium">Période</th>
                    <th className="pb-3 font-medium">Écritures</th>
                    <th className="pb-3 font-medium">Débit</th>
                    <th className="pb-3 font-medium">Crédit</th>
                    <th className="pb-3 font-medium">Statut</th>
                    <th className="pb-3 font-medium">Date export</th>
                    <th className="pb-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {exports.items.map((exp: any) => (
                    <tr key={exp.id} className="border-b hover:bg-muted/50">
                      <td className="py-3 font-mono text-xs">{exp.exportNumber}</td>
                      <td className="py-3 text-xs">
                        {new Date(exp.dateFrom).toLocaleDateString("fr-FR")} — {new Date(exp.dateTo).toLocaleDateString("fr-FR")}
                      </td>
                      <td className="py-3">{exp.entriesCount}</td>
                      <td className="py-3 font-mono">{((exp.totalDebit || 0) / 100).toLocaleString("fr-FR")} F</td>
                      <td className="py-3 font-mono">{((exp.totalCredit || 0) / 100).toLocaleString("fr-FR")} F</td>
                      <td className="py-3"><Badge className={statusColors[exp.status] || ""}>{statusLabels[exp.status] || exp.status}</Badge></td>
                      <td className="py-3 text-xs">{exp.exportedAt ? new Date(exp.exportedAt).toLocaleString("fr-FR") : "—"}</td>
                      <td className="py-3">
                        <div className="flex gap-1">
                          {(exp.status === "generated" || exp.status === "downloaded") && (
                            <Button size="sm" variant="outline" onClick={() => handleDownload(exp.id)}><Download className="h-3 w-3" /></Button>
                          )}
                          {exp.status === "generated" && (
                            <Button size="sm" variant="ghost" onClick={() => cancelMutation.mutate({ id: exp.id })}><XCircle className="h-3 w-3" /></Button>
                          )}
                        </div>
                      </td>
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
