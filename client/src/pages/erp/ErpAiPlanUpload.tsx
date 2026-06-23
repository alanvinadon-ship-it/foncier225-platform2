import { useState, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, FileImage, ArrowLeft, Brain, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

const PLAN_TYPES = [
  { value: "architectural", label: "Architectural" },
  { value: "structural", label: "Structural (Coffrage)" },
  { value: "foundation", label: "Fondations" },
  { value: "reinforcement", label: "Ferraillage" },
  { value: "plumbing", label: "Plomberie" },
  { value: "electrical", label: "Électricité" },
  { value: "vrd", label: "VRD" },
  { value: "mixed", label: "Mixte" },
  { value: "unknown", label: "Non déterminé" },
];

const SCALES = [
  { value: "1:50", label: "1:50" },
  { value: "1:100", label: "1:100" },
  { value: "1:200", label: "1:200" },
  { value: "1:500", label: "1:500" },
  { value: "custom", label: "Autre..." },
];

export default function ErpAiPlanUpload() {
  const [, navigate] = useLocation();

  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string>("");
  const [planType, setPlanType] = useState("unknown");
  const [scale, setScale] = useState("");
  const [customScale, setCustomScale] = useState("");
  const [uploading, setUploading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisId, setAnalysisId] = useState<number | null>(null);

  const uploadMutation = trpc.erp.aiPlanAnalyzer.actions.upload.useMutation();
  const startAnalysisMutation = trpc.erp.aiPlanAnalyzer.actions.startAnalysis.useMutation();

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;

    // Validate file type
    const validTypes = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
    if (!validTypes.includes(f.type)) {
      toast.error("Format non supporté. Formats acceptés : JPG, PNG, WebP, PDF");
      return;
    }

    // Validate size (max 10MB)
    if (f.size > 10 * 1024 * 1024) {
      toast.error("Fichier trop volumineux. Taille maximale : 10 Mo");
      return;
    }

    setFile(f);
    if (f.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = (ev) => setPreview(ev.target?.result as string);
      reader.readAsDataURL(f);
    } else {
      setPreview("");
    }
  }, [toast]);

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);

    try {
      // Convert to base64
      const buffer = await file.arrayBuffer();
      const base64 = btoa(
        new Uint8Array(buffer).reduce((data, byte) => data + String.fromCharCode(byte), "")
      );

      const fileType = file.type === "application/pdf" ? "pdf" : file.type.split("/")[1];
      const scaleValue = scale === "custom" ? customScale : scale;

      const result = await uploadMutation.mutateAsync({
        fileName: file.name,
        fileBase64: base64,
        fileType,
        planType,
        scaleConfirmed: scaleValue || undefined,
      });

      setAnalysisId(result.id);
      toast.success(`Plan uploadé — Référence : ${result.analysisNumber}`);
    } catch (error: any) {
      toast.error(`Erreur d'upload : ${error.message}`);
    } finally {
      setUploading(false);
    }
  };

  const handleStartAnalysis = async () => {
    if (!analysisId) return;
    setAnalyzing(true);

    try {
      const scaleValue = scale === "custom" ? customScale : scale;
      await startAnalysisMutation.mutateAsync({
        analysisId,
        scaleConfirmed: scaleValue || undefined,
      });

      toast.success("Analyse terminée. Consultez les résultats.");
      navigate(`/erp/ai/plans/${analysisId}`);
    } catch (error: any) {
      toast.error(`Erreur d'analyse : ${error.message}`);
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/erp/ai/plans")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-xl font-bold">Upload de Plan</h1>
          <p className="text-sm text-muted-foreground">Uploadez un plan de construction pour analyse IA</p>
        </div>
      </div>

      {/* Upload Zone */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">1. Sélection du fichier</CardTitle>
        </CardHeader>
        <CardContent>
          {!file ? (
            <label className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
              <Upload className="h-10 w-10 text-muted-foreground mb-3" />
              <p className="text-sm font-medium">Cliquez ou glissez un fichier</p>
              <p className="text-xs text-muted-foreground mt-1">PDF, JPG, PNG, WebP — Max 10 Mo</p>
              <input type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png,.webp" onChange={handleFileChange} />
            </label>
          ) : (
            <div className="flex items-center gap-4">
              {preview ? (
                <img src={preview} alt="Aperçu" className="h-32 w-32 object-contain rounded border" />
              ) : (
                <div className="h-32 w-32 rounded border flex items-center justify-center bg-muted">
                  <FileImage className="h-8 w-8 text-muted-foreground" />
                </div>
              )}
              <div className="flex-1">
                <p className="font-medium">{file.name}</p>
                <p className="text-sm text-muted-foreground">{(file.size / 1024 / 1024).toFixed(2)} Mo</p>
                <Button variant="outline" size="sm" className="mt-2" onClick={() => { setFile(null); setPreview(""); setAnalysisId(null); }}>
                  Changer de fichier
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Parameters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">2. Paramètres d'analyse</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Type de plan</Label>
              <Select value={planType} onValueChange={setPlanType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PLAN_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Échelle (optionnel)</Label>
              <Select value={scale} onValueChange={setScale}>
                <SelectTrigger>
                  <SelectValue placeholder="Détection automatique" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="auto">Détection automatique</SelectItem>
                  {SCALES.map((s) => (
                    <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {scale === "custom" && (
                <Input
                  placeholder="Ex: 1:75"
                  value={customScale}
                  onChange={(e) => setCustomScale(e.target.value)}
                />
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Disclaimer */}
      <Card className="border-amber-200 bg-amber-50">
        <CardContent className="p-4 flex gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="text-sm text-amber-800">
            <p className="font-medium mb-1">Limites de l'analyse IA</p>
            <p>L'analyse par intelligence artificielle est indicative et ne remplace pas l'expertise d'un ingénieur qualifié. Les dimensions et quantités doivent être vérifiées avant toute utilisation pour commande ou budgétisation.</p>
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex gap-3">
        {!analysisId ? (
          <Button onClick={handleUpload} disabled={!file || uploading} className="gap-2">
            {uploading ? (
              <>
                <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Upload en cours...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4" />
                Uploader le plan
              </>
            )}
          </Button>
        ) : (
          <Button onClick={handleStartAnalysis} disabled={analyzing} className="gap-2 bg-indigo-600 hover:bg-indigo-700">
            {analyzing ? (
              <>
                <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Analyse en cours...
              </>
            ) : (
              <>
                <Brain className="h-4 w-4" />
                Lancer l'analyse IA
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  );
}
