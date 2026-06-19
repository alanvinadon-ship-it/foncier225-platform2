import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { Link } from "wouter";

export default function ErpProjectCreate() {
  const [, navigate] = useLocation();
  const [form, setForm] = useState({
    name: "",
    description: "",
    clientName: "",
    location: "",
    startDate: "",
    plannedEndDate: "",
    initialBudget: "",
    priority: "medium",
  });

  const createMutation = trpc.erp.projects.create.useMutation({
    onSuccess: (data) => {
      toast.success(`Projet ${data.code} créé avec succès`);
      navigate(`/erp/projects/${data.id}`);
    },
    onError: (err) => {
      toast.error(err.message || "Erreur lors de la création");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate({
      name: form.name,
      description: form.description || undefined,
      clientName: form.clientName || undefined,
      location: form.location || undefined,
      startDate: form.startDate ? new Date(form.startDate).getTime() : undefined,
      plannedEndDate: form.plannedEndDate ? new Date(form.plannedEndDate).getTime() : undefined,
      initialBudget: form.initialBudget ? parseInt(form.initialBudget) : undefined,
      priority: form.priority as any,
    });
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/erp/projects">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Nouveau projet</h1>
          <p className="text-muted-foreground">Créez un nouveau projet de construction</p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>Informations générales</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nom du projet *</Label>
              <Input
                id="name"
                value={form.name}
                onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="Ex: Construction Immeuble Cocody"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={form.description}
                onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))}
                placeholder="Description détaillée du projet..."
                rows={3}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="clientName">Client</Label>
                <Input
                  id="clientName"
                  value={form.clientName}
                  onChange={(e) => setForm(f => ({ ...f, clientName: e.target.value }))}
                  placeholder="Nom du client"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="location">Localisation</Label>
                <Input
                  id="location"
                  value={form.location}
                  onChange={(e) => setForm(f => ({ ...f, location: e.target.value }))}
                  placeholder="Adresse ou zone"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="startDate">Date de début</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={form.startDate}
                  onChange={(e) => setForm(f => ({ ...f, startDate: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="plannedEndDate">Date de fin prévue</Label>
                <Input
                  id="plannedEndDate"
                  type="date"
                  value={form.plannedEndDate}
                  onChange={(e) => setForm(f => ({ ...f, plannedEndDate: e.target.value }))}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="initialBudget">Budget initial (FCFA)</Label>
                <Input
                  id="initialBudget"
                  type="number"
                  value={form.initialBudget}
                  onChange={(e) => setForm(f => ({ ...f, initialBudget: e.target.value }))}
                  placeholder="0"
                  min="0"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="priority">Priorité</Label>
                <Select value={form.priority} onValueChange={(v) => setForm(f => ({ ...f, priority: v }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Basse</SelectItem>
                    <SelectItem value="medium">Moyenne</SelectItem>
                    <SelectItem value="high">Haute</SelectItem>
                    <SelectItem value="critical">Critique</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-3 pt-4">
          <Link href="/erp/projects">
            <Button variant="outline" type="button">Annuler</Button>
          </Link>
          <Button type="submit" disabled={createMutation.isPending || !form.name}>
            {createMutation.isPending ? "Création..." : "Créer le projet"}
          </Button>
        </div>
      </form>
    </div>
  );
}
