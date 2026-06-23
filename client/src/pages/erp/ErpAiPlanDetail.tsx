import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useParams, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  ArrowLeft, Brain, FileText, Layers, Package, Shield, MessageSquare,
  Download, Bot, CheckCircle, XCircle, AlertTriangle, Calculator, Warehouse
} from "lucide-react";
import { toast } from "sonner";

const statusColors: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  analyzing: "bg-blue-100 text-blue-800",
  completed: "bg-green-100 text-green-800",
  failed: "bg-red-100 text-red-800",
  reviewed: "bg-purple-100 text-purple-800",
  validated: "bg-emerald-100 text-emerald-800",
  rejected: "bg-red-100 text-red-800",
};

const statusLabels: Record<string, string> = {
  pending: "En attente",
  analyzing: "En cours",
  completed: "Terminée",
  failed: "Échec",
  reviewed: "Revue",
  validated: "Validée",
  rejected: "Rejetée",
};

const elementTypeLabels: Record<string, string> = {
  wall: "Mur", column: "Poteau", beam: "Poutre", slab: "Dalle",
  foundation: "Fondation", footing: "Semelle", door: "Porte",
  window: "Fenêtre", stair: "Escalier", room: "Pièce",
  pipe: "Tuyau", electrical_point: "Point élec.", plumbing_point: "Point sanit.", other: "Autre",
};

const severityColors: Record<string, string> = {
  info: "bg-blue-100 text-blue-800",
  low: "bg-green-100 text-green-800",
  medium: "bg-yellow-100 text-yellow-800",
  high: "bg-orange-100 text-orange-800",
  critical: "bg-red-100 text-red-800",
};

export default function ErpAiPlanDetail() {
  const params = useParams<{ id: string }>();
  const [, navigate] = useLocation();

  const [activeTab, setActiveTab] = useState("overview");
  const [chatInput, setChatInput] = useState("");
  const [chatHistory, setChatHistory] = useState<Array<{ role: "user" | "assistant"; content: string }>>([]);

  const analysisId = Number(params.id);
  const { data: analysis, refetch } = trpc.erp.aiPlanAnalyzer.analyses.getById.useQuery({ id: analysisId });
  const { data: stockCheck } = trpc.erp.aiPlanAnalyzer.takeoffs.checkStock.useQuery({ analysisId });

  const calculateTakeoffMutation = trpc.erp.aiPlanAnalyzer.actions.calculateTakeoff.useMutation();
  const validateMutation = trpc.erp.aiPlanAnalyzer.actions.validate.useMutation();
  const generatePdfMutation = trpc.erp.aiPlanAnalyzer.exports.generatePdf.useMutation();
  const exportCsvMutation = trpc.erp.aiPlanAnalyzer.exports.exportExcelBoq.useMutation();
  const askMutation = trpc.erp.aiPlanAnalyzer.assistant.ask.useMutation();
  const addCommentMutation = trpc.erp.aiPlanAnalyzer.comments.create.useMutation();

  if (!analysis) return <div className="p-8 text-center text-muted-foreground">Chargement...</div>;

  const handleCalculateTakeoff = async () => {
    try {
      await calculateTakeoffMutation.mutateAsync({ analysisId });
      toast.success("Quantitatif matériaux généré.");
      refetch();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const handleValidate = async (action: "review" | "validate" | "reject") => {
    try {
      await validateMutation.mutateAsync({ analysisId, action });
      toast.success("Statut mis à jour");
      refetch();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const handleGeneratePdf = async () => {
    try {
      const result = await generatePdfMutation.mutateAsync({ analysisId });
      window.open(result.fileUrl, "_blank");
      toast.success("PDF généré");
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const handleExportCsv = async () => {
    try {
      const result = await exportCsvMutation.mutateAsync({ analysisId });
      window.open(result.fileUrl, "_blank");
      toast.success("Export CSV généré");
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const handleAskAssistant = async () => {
    if (!chatInput.trim()) return;
    const question = chatInput;
    setChatInput("");
    setChatHistory((prev) => [...prev, { role: "user", content: question }]);

    try {
      const result = await askMutation.mutateAsync({
        analysisId,
        question,
        conversationHistory: chatHistory,
      });
      setChatHistory((prev) => [...prev, { role: "assistant", content: result.answer }]);
    } catch (e: any) {
      setChatHistory((prev) => [...prev, { role: "assistant", content: `Erreur: ${e.message}` }]);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/erp/ai/plans")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-xl font-bold flex items-center gap-2">
              {analysis.fileName}
              <Badge className={statusColors[analysis.analysisStatus]}>
                {statusLabels[analysis.analysisStatus]}
              </Badge>
            </h1>
            <p className="text-sm text-muted-foreground">
              {analysis.analysisNumber} • Créé le {new Date(analysis.createdAt).toLocaleDateString("fr-FR")}
              {analysis.creatorName && ` par ${analysis.creatorName}`}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          {analysis.analysisStatus === "completed" && (
            <>
              <Button variant="outline" size="sm" onClick={() => handleValidate("review")}>
                <CheckCircle className="h-4 w-4 mr-1" /> Marquer revu
              </Button>
              <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" onClick={() => handleValidate("validate")}>
                <CheckCircle className="h-4 w-4 mr-1" /> Valider
              </Button>
              <Button variant="destructive" size="sm" onClick={() => handleValidate("reject")}>
                <XCircle className="h-4 w-4 mr-1" /> Rejeter
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-7 w-full">
          <TabsTrigger value="overview" className="text-xs"><FileText className="h-3 w-3 mr-1" />Vue générale</TabsTrigger>
          <TabsTrigger value="elements" className="text-xs"><Layers className="h-3 w-3 mr-1" />Éléments</TabsTrigger>
          <TabsTrigger value="takeoff" className="text-xs"><Package className="h-3 w-3 mr-1" />Quantitatif</TabsTrigger>
          <TabsTrigger value="checks" className="text-xs"><Shield className="h-3 w-3 mr-1" />Contrôles</TabsTrigger>
          <TabsTrigger value="comments" className="text-xs"><MessageSquare className="h-3 w-3 mr-1" />Commentaires</TabsTrigger>
          <TabsTrigger value="exports" className="text-xs"><Download className="h-3 w-3 mr-1" />Exports</TabsTrigger>
          <TabsTrigger value="assistant" className="text-xs"><Bot className="h-3 w-3 mr-1" />Assistant IA</TabsTrigger>
        </TabsList>

        {/* TAB: Vue générale */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader><CardTitle className="text-sm">Informations du plan</CardTitle></CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Type de plan</span><span className="font-medium">{analysis.planType}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Échelle détectée</span><span>{analysis.scaleDetected || "-"}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Échelle confirmée</span><span>{analysis.scaleConfirmed || "-"}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Niveau</span><span>{analysis.floorLevel || "-"}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Confiance</span><span className="font-medium">{analysis.confidenceScore || 0}%</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Éléments détectés</span><span>{analysis.elements?.length || 0}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Matériaux calculés</span><span>{analysis.takeoffs?.length || 0}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Contrôles</span><span>{analysis.checks?.length || 0}</span></div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-sm">Aperçu du plan</CardTitle></CardHeader>
              <CardContent>
                {analysis.fileType !== "pdf" ? (
                  <img src={analysis.fileUrl} alt="Plan" className="w-full h-48 object-contain rounded border" />
                ) : (
                  <div className="h-48 flex items-center justify-center bg-muted rounded border">
                    <a href={analysis.fileUrl} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline flex items-center gap-2">
                      <FileText className="h-6 w-6" /> Ouvrir le PDF
                    </a>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Hypothèses */}
          {analysis.hypotheses && (
            <Card>
              <CardHeader><CardTitle className="text-sm">Hypothèses de l'IA</CardTitle></CardHeader>
              <CardContent>
                <ul className="text-sm space-y-1">
                  {(() => {
                    try { return JSON.parse(analysis.hypotheses); } catch { return []; }
                  })().map((h: string, i: number) => (
                    <li key={i} className="flex items-start gap-2">
                      <AlertTriangle className="h-3 w-3 text-amber-500 mt-1 shrink-0" />
                      <span>{h}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* TAB: Éléments */}
        <TabsContent value="elements" className="space-y-4">
          <div className="text-sm text-muted-foreground mb-2">
            {analysis.elements?.length || 0} éléments détectés
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left p-2">Type</th>
                  <th className="text-left p-2">Label</th>
                  <th className="text-right p-2">Longueur</th>
                  <th className="text-right p-2">Largeur</th>
                  <th className="text-right p-2">Hauteur</th>
                  <th className="text-right p-2">Surface</th>
                  <th className="text-right p-2">Confiance</th>
                  <th className="text-center p-2">Statut</th>
                </tr>
              </thead>
              <tbody>
                {analysis.elements?.map((el: any) => (
                  <tr key={el.id} className="border-b hover:bg-muted/30">
                    <td className="p-2">
                      <Badge variant="outline" className="text-xs">
                        {elementTypeLabels[el.elementType] || el.elementType}
                      </Badge>
                    </td>
                    <td className="p-2">{el.elementLabel || "-"}</td>
                    <td className="p-2 text-right">{el.length ? `${el.length}m` : "-"}</td>
                    <td className="p-2 text-right">{el.width ? `${el.width}m` : "-"}</td>
                    <td className="p-2 text-right">{el.height ? `${el.height}m` : "-"}</td>
                    <td className="p-2 text-right">{el.area ? `${el.area}m²` : "-"}</td>
                    <td className="p-2 text-right">{el.confidenceScore}%</td>
                    <td className="p-2 text-center">
                      <Badge variant="outline" className="text-xs">{el.status}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </TabsContent>

        {/* TAB: Quantitatif */}
        <TabsContent value="takeoff" className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              {analysis.takeoffs?.length || 0} matériaux calculés
            </div>
            <Button size="sm" onClick={handleCalculateTakeoff} disabled={calculateTakeoffMutation.isPending} className="gap-2">
              <Calculator className="h-4 w-4" />
              {calculateTakeoffMutation.isPending ? "Calcul..." : "Recalculer"}
            </Button>
          </div>

          {analysis.takeoffs && analysis.takeoffs.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left p-2">Matériau</th>
                    <th className="text-left p-2">Catégorie</th>
                    <th className="text-right p-2">Qté calculée</th>
                    <th className="text-right p-2">Perte</th>
                    <th className="text-right p-2">Qté recommandée</th>
                    <th className="text-right p-2">Achat</th>
                    <th className="text-right p-2">Confiance</th>
                  </tr>
                </thead>
                <tbody>
                  {analysis.takeoffs.map((t: any) => (
                    <tr key={t.id} className="border-b hover:bg-muted/30">
                      <td className="p-2 font-medium">{t.materialName}</td>
                      <td className="p-2"><Badge variant="outline" className="text-xs">{t.category}</Badge></td>
                      <td className="p-2 text-right">{Number(t.calculatedQuantity).toFixed(1)} {t.unit}</td>
                      <td className="p-2 text-right">{t.wasteRate}%</td>
                      <td className="p-2 text-right font-medium">{Number(t.recommendedQuantity).toFixed(1)} {t.unit}</td>
                      <td className="p-2 text-right">{t.purchaseQuantity ? `${Number(t.purchaseQuantity).toFixed(0)} ${t.purchaseUnit || ""}` : "-"}</td>
                      <td className="p-2 text-right">{t.confidenceScore}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <Card>
              <CardContent className="p-8 text-center">
                <Package className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
                <p className="text-sm text-muted-foreground">Aucun quantitatif calculé. Cliquez sur "Recalculer" pour générer le BOQ.</p>
              </CardContent>
            </Card>
          )}

          {/* Stock check */}
          {stockCheck && stockCheck.length > 0 && (
            <Card>
              <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Warehouse className="h-4 w-4" /> Vérification Stock</CardTitle></CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm border-collapse">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="text-left p-2">Matériau</th>
                        <th className="text-right p-2">Besoin</th>
                        <th className="text-right p-2">En stock</th>
                        <th className="text-right p-2">Déficit</th>
                        <th className="text-center p-2">Statut</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stockCheck.map((s: any) => (
                        <tr key={s.takeoffId} className="border-b">
                          <td className="p-2">{s.materialName}</td>
                          <td className="p-2 text-right">{s.requiredQuantity.toFixed(1)} {s.unit}</td>
                          <td className="p-2 text-right">{s.availableStock} {s.stockUnit}</td>
                          <td className="p-2 text-right text-red-600">{s.deficit > 0 ? s.deficit.toFixed(1) : "-"}</td>
                          <td className="p-2 text-center">
                            {s.inStock ? (
                              <Badge className="bg-green-100 text-green-800 text-xs">En stock</Badge>
                            ) : (
                              <Badge className="bg-red-100 text-red-800 text-xs">À commander</Badge>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* TAB: Contrôles */}
        <TabsContent value="checks" className="space-y-4">
          <div className="text-sm text-muted-foreground mb-2">
            {analysis.checks?.length || 0} contrôles d'ingénierie
          </div>
          {analysis.checks && analysis.checks.length > 0 ? (
            <div className="space-y-3">
              {analysis.checks.map((check: any) => (
                <Card key={check.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-sm">{check.checkName}</span>
                          <Badge className={`text-xs ${severityColors[check.severity]}`}>{check.severity}</Badge>
                          <Badge variant="outline" className="text-xs">{check.status}</Badge>
                        </div>
                        {check.description && <p className="text-sm text-muted-foreground">{check.description}</p>}
                        {check.detectedIssue && (
                          <p className="text-sm text-red-600 mt-1">Problème : {check.detectedIssue}</p>
                        )}
                        {check.recommendation && (
                          <p className="text-sm text-green-700 mt-1">Recommandation : {check.recommendation}</p>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground">{check.confidenceScore}%</div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="p-8 text-center">
                <Shield className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
                <p className="text-sm text-muted-foreground">Aucun contrôle d'ingénierie effectué.</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* TAB: Commentaires */}
        <TabsContent value="comments" className="space-y-4">
          <CommentSection analysisId={analysisId} comments={analysis.comments || []} onAdded={refetch} />
        </TabsContent>

        {/* TAB: Exports */}
        <TabsContent value="exports" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={handleGeneratePdf}>
              <CardContent className="p-6 text-center">
                <FileText className="h-8 w-8 mx-auto text-red-600 mb-2" />
                <p className="font-medium">Rapport PDF Technique</p>
                <p className="text-xs text-muted-foreground mt-1">10 sections — Page de garde, résumé, éléments, BOQ, contrôles, recommandations</p>
              </CardContent>
            </Card>
            <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={handleExportCsv}>
              <CardContent className="p-6 text-center">
                <Download className="h-8 w-8 mx-auto text-green-600 mb-2" />
                <p className="font-medium">Export Excel (CSV)</p>
                <p className="text-xs text-muted-foreground mt-1">Quantitatif matériaux — Compatible Excel/Google Sheets</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader><CardTitle className="text-sm">Conversions ERP</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">Convertir le quantitatif vers les modules ERP existants :</p>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" onClick={() => toast.info("Sélectionnez un budget dans le module Budget V2 pour y injecter les lignes.")}>
                  Vers Budget V2
                </Button>
                <Button variant="outline" size="sm" onClick={() => toast.info("Fonctionnalité disponible — utilisez le bouton dédié dans le module.")}>
                  Vers Demande Matériel
                </Button>
                <Button variant="outline" size="sm" onClick={() => toast.info("Crée un appel d'offres avec les lignes du quantitatif.")}>
                  Vers Appel d'Offres (RFQ)
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB: Assistant IA */}
        <TabsContent value="assistant" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <Bot className="h-4 w-4 text-indigo-600" />
                Assistant IA — Posez vos questions sur ce plan
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Chat history */}
              <div className="h-64 overflow-y-auto border rounded p-3 space-y-3 bg-muted/30">
                {chatHistory.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    Posez une question sur ce plan de construction. L'assistant IA répondra en se basant sur l'analyse effectuée.
                  </p>
                )}
                {chatHistory.map((msg, i) => (
                  <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[80%] rounded-lg p-3 text-sm ${msg.role === "user" ? "bg-indigo-600 text-white" : "bg-white border"}`}>
                      {msg.content}
                    </div>
                  </div>
                ))}
                {askMutation.isPending && (
                  <div className="flex justify-start">
                    <div className="bg-white border rounded-lg p-3 text-sm text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <div className="h-3 w-3 border-2 border-indigo-300 border-t-indigo-600 rounded-full animate-spin" />
                        Réflexion en cours...
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Input */}
              <div className="flex gap-2">
                <Input
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="Ex: Quelle est la section recommandée pour les poteaux ?"
                  onKeyDown={(e) => e.key === "Enter" && handleAskAssistant()}
                />
                <Button onClick={handleAskAssistant} disabled={askMutation.isPending || !chatInput.trim()}>
                  Envoyer
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// --- Comment Section Component ---
function CommentSection({ analysisId, comments, onAdded }: { analysisId: number; comments: any[]; onAdded: () => void }) {
  const [newComment, setNewComment] = useState("");
  const [commentType, setCommentType] = useState("note");

  const addCommentMutation = trpc.erp.aiPlanAnalyzer.comments.create.useMutation();

  const handleAdd = async () => {
    if (!newComment.trim()) return;
    try {
      await addCommentMutation.mutateAsync({
        analysisId,
        comment: newComment,
        commentType: commentType as any,
      });
      setNewComment("");
      toast.success("Commentaire ajouté");
      onAdded();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const typeLabels: Record<string, string> = {
    note: "Note", correction: "Correction", validation: "Validation",
    warning: "Avertissement", engineer_note: "Note ingénieur",
    architect_note: "Note architecte", quantity_note: "Note quantité",
  };

  return (
    <div className="space-y-4">
      {/* Add comment */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="flex gap-2">
            <Select value={commentType} onValueChange={setCommentType}>
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(typeLabels).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Ajouter un commentaire..."
            rows={3}
          />
          <Button size="sm" onClick={handleAdd} disabled={addCommentMutation.isPending}>
            Ajouter
          </Button>
        </CardContent>
      </Card>

      {/* Comments list */}
      {comments.length > 0 ? (
        <div className="space-y-2">
          {comments.map((c: any) => (
            <Card key={c.id}>
              <CardContent className="p-3">
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant="outline" className="text-xs">{typeLabels[c.commentType] || c.commentType}</Badge>
                  <span className="text-xs text-muted-foreground">{new Date(c.createdAt).toLocaleDateString("fr-FR")}</span>
                </div>
                <p className="text-sm">{c.comment}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground text-center py-4">Aucun commentaire.</p>
      )}
    </div>
  );
}
