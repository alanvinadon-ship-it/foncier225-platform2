import { useState, useEffect } from "react";
import { useParams, useLocation, Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";

function tsToDateStr(ts: number | null | undefined): string {
  if (!ts) return "";
  return new Date(ts).toISOString().split("T")[0];
}

export default function ErpProjectEdit() {
  const params = useParams<{ id: string }>();
  const projectId = parseInt(params.id || "0");
  const [, navigate] = useLocation();

  const { data: project, isLoading } = trpc.erp.projects.getById.useQuery({ id: projectId }, { enabled: !!projectId });

  const [form, setForm] = useState({
    name: "", description: "", clientName: "", location: "",
    startDate: "", plannedEndDate: "", initialBudget: "", revisedBudget: "",
    status: "draft", priority: "medium", progressPercentage: "0",
  });

  useEffect(() => {
    if (project) {
      setForm({
        name: project.name || "",
        description: project.description || "",
        clientName: project.clientName || "",
        location: project.location || "",
        startDate: tsToDateStr(project.startDate),
        plannedEndDate: tsToDateStr(project.plannedEndDate),
        initialBudget: project.initialBudget?.toString() || "",
        revisedBudget: project.revisedBudget?.toString() || "",
        status: project.status,
        priority: project.priority,
        progressPercentage: project.progressPercentage.toString(),
      });
    }
  }, [project]);

  const updateMutation = trpc.erp.projects.update.useMutation({
    onSuccess: () => {
      toast.success("Projet mis à jour");
      navigate(`/erp/projects/${projectId}`);
    },
    onError: (err) => toast.error(err.message),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateMutation.mutate({
      id: projectId,
      name: form.name,
      description: form.description || undefined,
      clientName: form.clientName || undefined,
      location: form.location || undefined,
      startDate: form.startDate ? new Date(form.startDate).getTime() : undefined,
      plannedEndDate: form.plannedEndDate ? new Date(form.plannedEndDate).getTime() : undefined,
      initialBudget: form.initialBudget ? parseInt(form.initialBudget) : undefined,
      revisedBudget: form.revisedBudget ? parseInt(form.revisedBudget) : undefined,
      status: form.status as any,
      priority: form.priority as any,
      progressPercentage: parseInt(form.progressPercentage),
    });
  };

  if (isLoading) return <div className="animate-pulse"><div className="h-8 bg-muted rounded w-1/3 mb-4" /><div className="h-96 bg-muted rounded" /></div>;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link href={`/erp/projects/${projectId}`}>
          <Button variant="ghost" size="icon"><ArrowLeft className="w-4 h-4" /></Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Modifier le projet</h1>
          <p className="text-muted-foreground">{project?.code}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader><CardTitle>Informations</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Nom *</Label>
              <Input value={form.name} onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))} required />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea value={form.description} onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))} rows={3} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Client</Label>
                <Input value={form.clientName} onChange={(e) => setForm(f => ({ ...f, clientName: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Localisation</Label>
                <Input value={form.location} onChange={(e) => setForm(f => ({ ...f, location: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Date de début</Label>
                <Input type="date" value={form.startDate} onChange={(e) => setForm(f => ({ ...f, startDate: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Date de fin prévue</Label>
                <Input type="date" value={form.plannedEndDate} onChange={(e) => setForm(f => ({ ...f, plannedEndDate: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Budget initial (FCFA)</Label>
                <Input type="number" value={form.initialBudget} onChange={(e) => setForm(f => ({ ...f, initialBudget: e.target.value }))} min="0" />
              </div>
              <div className="space-y-2">
                <Label>Budget révisé (FCFA)</Label>
                <Input type="number" value={form.revisedBudget} onChange={(e) => setForm(f => ({ ...f, revisedBudget: e.target.value }))} min="0" />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Statut</Label>
                <Select value={form.status} onValueChange={(v) => setForm(f => ({ ...f, status: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Brouillon</SelectItem>
                    <SelectItem value="planned">Planifié</SelectItem>
                    <SelectItem value="active">Actif</SelectItem>
                    <SelectItem value="on_hold">En pause</SelectItem>
                    <SelectItem value="completed">Terminé</SelectItem>
                    <SelectItem value="delayed">En retard</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Priorité</Label>
                <Select value={form.priority} onValueChange={(v) => setForm(f => ({ ...f, priority: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Basse</SelectItem>
                    <SelectItem value="medium">Moyenne</SelectItem>
                    <SelectItem value="high">Haute</SelectItem>
                    <SelectItem value="critical">Critique</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Progression (%)</Label>
                <Input type="number" min="0" max="100" value={form.progressPercentage} onChange={(e) => setForm(f => ({ ...f, progressPercentage: e.target.value }))} />
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-3 pt-4">
          <Link href={`/erp/projects/${projectId}`}>
            <Button variant="outline" type="button">Annuler</Button>
          </Link>
          <Button type="submit" disabled={updateMutation.isPending || !form.name}>
            {updateMutation.isPending ? "Enregistrement..." : "Enregistrer"}
          </Button>
        </div>
      </form>
    </div>
  );
}
