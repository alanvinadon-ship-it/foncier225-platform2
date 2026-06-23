import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Trash2, ArrowRight, Pencil } from "lucide-react";

export default function ErpAiTaskRouting() {
  const [showCreate, setShowCreate] = useState(false);

  const { data: routings, refetch } = trpc.erp.aiProviders.taskRouting.list.useQuery();
  const { data: providers } = trpc.erp.aiProviders.providers.list.useQuery();
  const { data: constants } = trpc.erp.aiProviders.providers.types.useQuery();

  const deleteMutation = trpc.erp.aiProviders.taskRouting.delete.useMutation({
    onSuccess: () => { toast.success("Routage supprimé"); refetch(); },
  });
  const updateMutation = trpc.erp.aiProviders.taskRouting.update.useMutation({
    onSuccess: () => { toast.success("Routage mis à jour"); refetch(); },
  });

  const getProviderName = (id: number | null) => {
    if (!id) return "—";
    return providers?.find(p => p.id === id)?.providerName || `#${id}`;
  };

  // Group routings by module
  const grouped = routings?.reduce((acc, r) => {
    if (!acc[r.module]) acc[r.module] = [];
    acc[r.module].push(r);
    return acc;
  }, {} as Record<string, typeof routings>) || {};

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Routage des Tâches IA</h1>
          <p className="text-muted-foreground">Configurez quel fournisseur traite chaque type de tâche IA par module</p>
        </div>
        <Button onClick={() => setShowCreate(true)}>
          <Plus className="w-4 h-4 mr-2" /> Ajouter un routage
        </Button>
      </div>

      {Object.entries(grouped).map(([module, items]) => (
        <Card key={module}>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">{module}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {items?.map((r) => (
                <div key={r.id} className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
                  <div className="flex items-center gap-3">
                    <Badge variant="outline">{r.taskType}</Badge>
                    <div className="flex items-center gap-2 text-sm">
                      <span className="font-medium text-green-700">{getProviderName(r.primaryProviderId)}</span>
                      {r.fallbackProviderId && (
                        <>
                          <ArrowRight className="w-3 h-3 text-muted-foreground" />
                          <span className="text-yellow-700">{getProviderName(r.fallbackProviderId)}</span>
                        </>
                      )}
                      {r.secondFallbackProviderId && (
                        <>
                          <ArrowRight className="w-3 h-3 text-muted-foreground" />
                          <span className="text-red-700">{getProviderName(r.secondFallbackProviderId)}</span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={r.enabled === 1}
                      onCheckedChange={(v) => updateMutation.mutate({ id: r.id, enabled: v })}
                    />
                    <Button size="sm" variant="ghost" className="text-destructive" onClick={() => { if (confirm("Supprimer ?")) deleteMutation.mutate({ id: r.id }); }}>
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}

      {routings?.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Aucun routage configuré. Le fournisseur par défaut sera utilisé pour toutes les tâches.
          </CardContent>
        </Card>
      )}

      {showCreate && (
        <CreateRoutingDialog
          modules={constants?.modules || []}
          taskTypes={constants?.taskTypes || []}
          providers={providers || []}
          onClose={() => setShowCreate(false)}
          onSuccess={() => { refetch(); setShowCreate(false); }}
        />
      )}
    </div>
  );
}

function CreateRoutingDialog({ modules, taskTypes, providers, onClose, onSuccess }: {
  modules: readonly string[];
  taskTypes: readonly string[];
  providers: any[];
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [form, setForm] = useState({
    module: "",
    taskType: "",
    primaryProviderId: 0,
    fallbackProviderId: undefined as number | undefined,
    secondFallbackProviderId: undefined as number | undefined,
  });

  const createMutation = trpc.erp.aiProviders.taskRouting.create.useMutation({
    onSuccess: () => { toast.success("Routage créé"); onSuccess(); },
    onError: (e) => toast.error(e.message),
  });

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Ajouter un routage</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Module</Label>
            <Select value={form.module} onValueChange={(v) => setForm({ ...form, module: v })}>
              <SelectTrigger><SelectValue placeholder="Sélectionner un module" /></SelectTrigger>
              <SelectContent>
                {modules.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Type de tâche</Label>
            <Select value={form.taskType} onValueChange={(v) => setForm({ ...form, taskType: v })}>
              <SelectTrigger><SelectValue placeholder="Sélectionner un type" /></SelectTrigger>
              <SelectContent>
                {taskTypes.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Fournisseur principal</Label>
            <Select value={String(form.primaryProviderId || "")} onValueChange={(v) => setForm({ ...form, primaryProviderId: parseInt(v) })}>
              <SelectTrigger><SelectValue placeholder="Sélectionner" /></SelectTrigger>
              <SelectContent>
                {providers.filter(p => p.isActive === 1).map(p => <SelectItem key={p.id} value={String(p.id)}>{p.providerName}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Fallback 1 (optionnel)</Label>
            <Select value={String(form.fallbackProviderId || "")} onValueChange={(v) => setForm({ ...form, fallbackProviderId: v ? parseInt(v) : undefined })}>
              <SelectTrigger><SelectValue placeholder="Aucun" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Aucun</SelectItem>
                {providers.filter(p => p.isActive === 1).map(p => <SelectItem key={p.id} value={String(p.id)}>{p.providerName}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Fallback 2 (optionnel)</Label>
            <Select value={String(form.secondFallbackProviderId || "")} onValueChange={(v) => setForm({ ...form, secondFallbackProviderId: v ? parseInt(v) : undefined })}>
              <SelectTrigger><SelectValue placeholder="Aucun" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Aucun</SelectItem>
                {providers.filter(p => p.isActive === 1).map(p => <SelectItem key={p.id} value={String(p.id)}>{p.providerName}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>Annuler</Button>
            <Button onClick={() => createMutation.mutate(form)} disabled={createMutation.isPending || !form.module || !form.taskType || !form.primaryProviderId}>
              Créer
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
