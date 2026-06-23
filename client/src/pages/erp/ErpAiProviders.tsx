import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Plus, Trash2, TestTube, Star, Power, PowerOff, RotateCcw, Pencil, Server, CheckCircle, XCircle, Clock
} from "lucide-react";

export default function ErpAiProviders() {
  const [showCreate, setShowCreate] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);

  const { data: providers, refetch } = trpc.erp.aiProviders.providers.list.useQuery();
  const { data: constants } = trpc.erp.aiProviders.providers.types.useQuery();

  const createMutation = trpc.erp.aiProviders.providers.create.useMutation({
    onSuccess: () => { toast.success("Fournisseur créé"); refetch(); setShowCreate(false); },
    onError: (e) => toast.error(e.message),
  });
  const deleteMutation = trpc.erp.aiProviders.providers.delete.useMutation({
    onSuccess: () => { toast.success("Fournisseur supprimé"); refetch(); },
  });
  const testMutation = trpc.erp.aiProviders.providers.test.useMutation({
    onSuccess: (r) => { r.success ? toast.success(`Connexion OK (${r.durationMs}ms)`) : toast.error(r.message); refetch(); },
    onError: (e) => toast.error(e.message),
  });
  const activateMutation = trpc.erp.aiProviders.providers.activate.useMutation({
    onSuccess: () => { toast.success("Activé"); refetch(); },
  });
  const deactivateMutation = trpc.erp.aiProviders.providers.deactivate.useMutation({
    onSuccess: () => { toast.success("Désactivé"); refetch(); },
  });
  const setDefaultMutation = trpc.erp.aiProviders.providers.setDefault.useMutation({
    onSuccess: () => { toast.success("Fournisseur par défaut mis à jour"); refetch(); },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Fournisseurs IA</h1>
          <p className="text-muted-foreground">Gérez les fournisseurs d'intelligence artificielle et leurs clés API</p>
        </div>
        <Button onClick={() => setShowCreate(true)}>
          <Plus className="w-4 h-4 mr-2" /> Ajouter un fournisseur
        </Button>
      </div>

      {/* Provider Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {providers?.map((p) => (
          <Card key={p.id} className={`relative ${!p.isActive ? "opacity-60" : ""}`}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Server className="w-5 h-5 text-primary" />
                  <CardTitle className="text-lg">{p.providerName}</CardTitle>
                </div>
                <div className="flex items-center gap-1">
                  {p.isDefault === 1 && <Badge variant="default" className="text-xs">Par défaut</Badge>}
                  {p.isActive === 1 ? (
                    <Badge variant="outline" className="text-xs text-green-600 border-green-600">Actif</Badge>
                  ) : (
                    <Badge variant="outline" className="text-xs text-red-600 border-red-600">Inactif</Badge>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-muted-foreground">Type:</span>
                  <p className="font-medium">{p.providerType}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Modèle:</span>
                  <p className="font-medium text-xs">{p.defaultTextModel || "—"}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Clé API:</span>
                  <p className="font-mono text-xs">{p.maskedApiKey || "Non configurée"}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Dernier test:</span>
                  <div className="flex items-center gap-1">
                    {p.lastTestStatus === "success" && <CheckCircle className="w-3 h-3 text-green-500" />}
                    {p.lastTestStatus === "failed" && <XCircle className="w-3 h-3 text-red-500" />}
                    {!p.lastTestStatus && <Clock className="w-3 h-3 text-gray-400" />}
                    <span className="text-xs">{p.lastTestStatus || "Jamais"}</span>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-1">
                {p.supportsText === 1 && <Badge variant="secondary" className="text-xs">Texte</Badge>}
                {p.supportsVision === 1 && <Badge variant="secondary" className="text-xs">Vision</Badge>}
                {p.supportsEmbeddings === 1 && <Badge variant="secondary" className="text-xs">Embeddings</Badge>}
                {p.supportsStreaming === 1 && <Badge variant="secondary" className="text-xs">Streaming</Badge>}
                {p.supportsJsonMode === 1 && <Badge variant="secondary" className="text-xs">JSON</Badge>}
              </div>

              <div className="flex items-center gap-1 pt-2 border-t">
                <Button size="sm" variant="ghost" onClick={() => testMutation.mutate({ id: p.id })} disabled={testMutation.isPending}>
                  <TestTube className="w-3 h-3" />
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setDefaultMutation.mutate({ id: p.id })}>
                  <Star className="w-3 h-3" />
                </Button>
                {p.isActive === 1 ? (
                  <Button size="sm" variant="ghost" onClick={() => deactivateMutation.mutate({ id: p.id })}>
                    <PowerOff className="w-3 h-3" />
                  </Button>
                ) : (
                  <Button size="sm" variant="ghost" onClick={() => activateMutation.mutate({ id: p.id })}>
                    <Power className="w-3 h-3" />
                  </Button>
                )}
                <Button size="sm" variant="ghost" onClick={() => setEditId(p.id)}>
                  <Pencil className="w-3 h-3" />
                </Button>
                <Button size="sm" variant="ghost" className="text-destructive" onClick={() => { if (confirm("Supprimer ce fournisseur ?")) deleteMutation.mutate({ id: p.id }); }}>
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Create Dialog */}
      {showCreate && (
        <CreateProviderDialog
          providerTypes={constants?.providerTypes || []}
          onClose={() => setShowCreate(false)}
          onSubmit={(data) => createMutation.mutate(data)}
          isPending={createMutation.isPending}
        />
      )}

      {/* Edit Dialog */}
      {editId && (
        <EditProviderDialog
          providerId={editId}
          onClose={() => setEditId(null)}
          onSuccess={() => { refetch(); setEditId(null); }}
        />
      )}
    </div>
  );
}

function CreateProviderDialog({ providerTypes, onClose, onSubmit, isPending }: {
  providerTypes: readonly string[];
  onClose: () => void;
  onSubmit: (data: any) => void;
  isPending: boolean;
}) {
  const [form, setForm] = useState({
    providerCode: "",
    providerName: "",
    providerType: "OpenAI",
    baseUrl: "",
    apiKey: "",
    defaultTextModel: "",
    defaultVisionModel: "",
    supportsText: true,
    supportsVision: false,
    supportsEmbeddings: false,
    supportsStreaming: false,
    supportsJsonMode: false,
    maxTokens: 4096,
    temperature: "0.7",
    timeoutSeconds: 60,
  });

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Ajouter un fournisseur IA</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Code</Label>
              <Input value={form.providerCode} onChange={(e) => setForm({ ...form, providerCode: e.target.value })} placeholder="openai-prod" />
            </div>
            <div>
              <Label>Nom</Label>
              <Input value={form.providerName} onChange={(e) => setForm({ ...form, providerName: e.target.value })} placeholder="OpenAI Production" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Type</Label>
              <Select value={form.providerType} onValueChange={(v) => setForm({ ...form, providerType: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {providerTypes.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>URL de base (optionnel)</Label>
              <Input value={form.baseUrl} onChange={(e) => setForm({ ...form, baseUrl: e.target.value })} placeholder="https://api.openai.com/v1" />
            </div>
          </div>
          <div>
            <Label>Clé API</Label>
            <Input type="password" value={form.apiKey} onChange={(e) => setForm({ ...form, apiKey: e.target.value })} placeholder="sk-..." />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Modèle texte par défaut</Label>
              <Input value={form.defaultTextModel} onChange={(e) => setForm({ ...form, defaultTextModel: e.target.value })} placeholder="gpt-4o" />
            </div>
            <div>
              <Label>Modèle vision par défaut</Label>
              <Input value={form.defaultVisionModel} onChange={(e) => setForm({ ...form, defaultVisionModel: e.target.value })} placeholder="gpt-4o" />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label>Max tokens</Label>
              <Input type="number" value={form.maxTokens} onChange={(e) => setForm({ ...form, maxTokens: parseInt(e.target.value) || 4096 })} />
            </div>
            <div>
              <Label>Température</Label>
              <Input value={form.temperature} onChange={(e) => setForm({ ...form, temperature: e.target.value })} />
            </div>
            <div>
              <Label>Timeout (s)</Label>
              <Input type="number" value={form.timeoutSeconds} onChange={(e) => setForm({ ...form, timeoutSeconds: parseInt(e.target.value) || 60 })} />
            </div>
          </div>
          <div className="flex flex-wrap gap-4">
            <div className="flex items-center gap-2"><Switch checked={form.supportsText} onCheckedChange={(v) => setForm({ ...form, supportsText: v })} /><Label>Texte</Label></div>
            <div className="flex items-center gap-2"><Switch checked={form.supportsVision} onCheckedChange={(v) => setForm({ ...form, supportsVision: v })} /><Label>Vision</Label></div>
            <div className="flex items-center gap-2"><Switch checked={form.supportsEmbeddings} onCheckedChange={(v) => setForm({ ...form, supportsEmbeddings: v })} /><Label>Embeddings</Label></div>
            <div className="flex items-center gap-2"><Switch checked={form.supportsStreaming} onCheckedChange={(v) => setForm({ ...form, supportsStreaming: v })} /><Label>Streaming</Label></div>
            <div className="flex items-center gap-2"><Switch checked={form.supportsJsonMode} onCheckedChange={(v) => setForm({ ...form, supportsJsonMode: v })} /><Label>JSON Mode</Label></div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>Annuler</Button>
            <Button onClick={() => onSubmit(form)} disabled={isPending || !form.providerCode || !form.providerName}>
              {isPending ? "Création..." : "Créer"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function EditProviderDialog({ providerId, onClose, onSuccess }: { providerId: number; onClose: () => void; onSuccess: () => void }) {
  const { data: provider } = trpc.erp.aiProviders.providers.getById.useQuery({ id: providerId });
  const updateMutation = trpc.erp.aiProviders.providers.update.useMutation({
    onSuccess: () => { toast.success("Fournisseur mis à jour"); onSuccess(); },
    onError: (e) => toast.error(e.message),
  });
  const rotateKeyMutation = trpc.erp.aiProviders.providers.rotateKey.useMutation({
    onSuccess: () => { toast.success("Clé API mise à jour"); onSuccess(); },
    onError: (e) => toast.error(e.message),
  });

  const [newKey, setNewKey] = useState("");
  const [form, setForm] = useState<any>(null);

  if (!provider) return null;
  if (!form && provider) {
    setTimeout(() => setForm({
      providerName: provider.providerName,
      providerType: provider.providerType,
      baseUrl: provider.baseUrl || "",
      defaultTextModel: provider.defaultTextModel || "",
      defaultVisionModel: provider.defaultVisionModel || "",
      maxTokens: provider.maxTokens || 4096,
      temperature: provider.temperature || "0.7",
      timeoutSeconds: provider.timeoutSeconds || 60,
    }), 0);
    return null;
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Modifier {provider.providerName}</DialogTitle>
        </DialogHeader>
        {form && (
          <div className="space-y-4">
            <div>
              <Label>Nom</Label>
              <Input value={form.providerName} onChange={(e) => setForm({ ...form, providerName: e.target.value })} />
            </div>
            <div>
              <Label>URL de base</Label>
              <Input value={form.baseUrl} onChange={(e) => setForm({ ...form, baseUrl: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Modèle texte</Label>
                <Input value={form.defaultTextModel} onChange={(e) => setForm({ ...form, defaultTextModel: e.target.value })} />
              </div>
              <div>
                <Label>Modèle vision</Label>
                <Input value={form.defaultVisionModel} onChange={(e) => setForm({ ...form, defaultVisionModel: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div><Label>Max tokens</Label><Input type="number" value={form.maxTokens} onChange={(e) => setForm({ ...form, maxTokens: parseInt(e.target.value) || 4096 })} /></div>
              <div><Label>Température</Label><Input value={form.temperature} onChange={(e) => setForm({ ...form, temperature: e.target.value })} /></div>
              <div><Label>Timeout</Label><Input type="number" value={form.timeoutSeconds} onChange={(e) => setForm({ ...form, timeoutSeconds: parseInt(e.target.value) || 60 })} /></div>
            </div>

            <div className="border-t pt-4">
              <Label>Rotation de clé API</Label>
              <div className="flex gap-2 mt-1">
                <Input type="password" placeholder="Nouvelle clé API" value={newKey} onChange={(e) => setNewKey(e.target.value)} />
                <Button size="sm" variant="outline" onClick={() => { if (newKey) rotateKeyMutation.mutate({ id: providerId, newApiKey: newKey }); }} disabled={!newKey}>
                  <RotateCcw className="w-3 h-3 mr-1" /> Rotation
                </Button>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={onClose}>Annuler</Button>
              <Button onClick={() => updateMutation.mutate({ id: providerId, ...form })} disabled={updateMutation.isPending}>
                Enregistrer
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
