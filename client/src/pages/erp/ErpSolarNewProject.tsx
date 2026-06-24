import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";
import { Link } from "wouter";

export default function ErpSolarNewProject() {
  const [, navigate] = useLocation();
  const [form, setForm] = useState({
    name: "", siteName: "", siteLocation: "",
    systemType: "autonomous" as string,
    clientName: "",
    erpProjectId: "",
  });

  const createMutation = trpc.erp.solar.projects.create.useMutation({
    onSuccess: (data: any) => {
      toast.success("Projet solaire créé avec succès");
      navigate(`/erp/solar/${data.id}`);
    },
    onError: (err: any) => toast.error(err.message),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) { toast.error("Le nom du projet est requis"); return; }
    createMutation.mutate({
      name: form.name,
      siteName: form.siteName || undefined,
      siteLocation: form.siteLocation || undefined,
      systemType: form.systemType,
      clientName: form.clientName || undefined,
      erpProjectId: form.erpProjectId ? parseInt(form.erpProjectId) : undefined,
    });
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center gap-3">
        <Link href="/erp/solar">
          <Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Nouveau Projet Solaire</h1>
          <p className="text-muted-foreground">Créer un nouveau projet de dimensionnement photovoltaïque</p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader><CardTitle>Informations générales</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nom du projet *</Label>
                <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Ex: Villa Cocody - Installation PV" />
              </div>
              <div className="space-y-2">
                <Label>Client</Label>
                <Input value={form.clientName} onChange={e => setForm(f => ({ ...f, clientName: e.target.value }))} placeholder="Nom du client" />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nom du site</Label>
                <Input value={form.siteName} onChange={e => setForm(f => ({ ...f, siteName: e.target.value }))} placeholder="Ex: Villa Cocody" />
              </div>
              <div className="space-y-2">
                <Label>Type de système</Label>
                <Select value={form.systemType} onValueChange={v => setForm(f => ({ ...f, systemType: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="autonomous">Autonome (Off-Grid)</SelectItem>
                    <SelectItem value="on_grid">Connecté réseau (On-Grid)</SelectItem>
                    <SelectItem value="hybrid">Hybride</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="mt-4">
          <CardHeader><CardTitle>Localisation</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Adresse / Localisation du site</Label>
              <Input value={form.siteLocation} onChange={e => setForm(f => ({ ...f, siteLocation: e.target.value }))} placeholder="Ex: Cocody, Abidjan, Côte d'Ivoire" />
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-3 mt-4">
          <Link href="/erp/solar"><Button variant="outline">Annuler</Button></Link>
          <Button type="submit" disabled={createMutation.isPending}>
            {createMutation.isPending ? "Création..." : "Créer le projet"}
          </Button>
        </div>
      </form>
    </div>
  );
}
