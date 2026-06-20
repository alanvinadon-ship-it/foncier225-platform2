import { useState } from "react";
import { trpc } from "../../lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Calendar, Mail, Play, Plus, Clock, CheckCircle, XCircle, Send } from "lucide-react";

export default function ErpDirectionSchedules() {
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState("");
  const [frequency, setFrequency] = useState("monthly");
  const [dayOfMonth, setDayOfMonth] = useState(1);
  const [sendTime, setSendTime] = useState("08:00");
  const [recipients, setRecipients] = useState("");

  const schedulesQuery = trpc.erp.directionSchedules.listSchedules.useQuery();
  const deliveriesQuery = trpc.erp.directionSchedules.listDeliveries.useQuery();
  const createMutation = trpc.erp.directionSchedules.createSchedule.useMutation({
    onSuccess: () => { toast.success("Planning créé"); schedulesQuery.refetch(); setShowCreate(false); resetForm(); },
    onError: (e) => toast.error(e.message),
  });
  const runNowMutation = trpc.erp.directionSchedules.runNow.useMutation({
    onSuccess: (r) => { toast.success(`Rapport envoyé à ${r.sentCount}/${r.totalRecipients} destinataires`); deliveriesQuery.refetch(); schedulesQuery.refetch(); },
    onError: (e) => toast.error(e.message),
  });
  const disableMutation = trpc.erp.directionSchedules.disableSchedule.useMutation({
    onSuccess: () => { toast.success("Planning désactivé"); schedulesQuery.refetch(); },
    onError: (e) => toast.error(e.message),
  });

  function resetForm() { setName(""); setFrequency("monthly"); setDayOfMonth(1); setSendTime("08:00"); setRecipients(""); }

  function handleCreate() {
    const emailList = recipients.split(",").map(e => e.trim()).filter(Boolean);
    if (!name || emailList.length === 0) { toast.error("Nom et destinataires requis"); return; }
    createMutation.mutate({ name, frequency: frequency as any, dayOfMonth, sendTime, recipients: emailList });
  }

  const schedules = schedulesQuery.data ?? [];
  const deliveries = deliveriesQuery.data ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Diffusion Rapports Direction</h1>
          <p className="text-muted-foreground">Plannings d'envoi automatique et historique des livraisons</p>
        </div>
        <Dialog open={showCreate} onOpenChange={setShowCreate}>
          <DialogTrigger asChild>
            <Button><Plus className="w-4 h-4 mr-2" />Nouveau planning</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Créer un planning de diffusion</DialogTitle></DialogHeader>
            <div className="space-y-4 pt-4">
              <div><Label>Nom</Label><Input value={name} onChange={e => setName(e.target.value)} placeholder="Rapport mensuel direction" /></div>
              <div><Label>Fréquence</Label>
                <Select value={frequency} onValueChange={setFrequency}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="weekly">Hebdomadaire</SelectItem>
                    <SelectItem value="monthly">Mensuel</SelectItem>
                    <SelectItem value="quarterly">Trimestriel</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Jour du mois</Label><Input type="number" min={1} max={28} value={dayOfMonth} onChange={e => setDayOfMonth(Number(e.target.value))} /></div>
                <div><Label>Heure d'envoi</Label><Input type="time" value={sendTime} onChange={e => setSendTime(e.target.value)} /></div>
              </div>
              <div><Label>Destinataires (emails séparés par des virgules)</Label><Input value={recipients} onChange={e => setRecipients(e.target.value)} placeholder="dg@foncier225.ci, daf@foncier225.ci" /></div>
              <Button onClick={handleCreate} disabled={createMutation.isPending} className="w-full">
                {createMutation.isPending ? "Création..." : "Créer le planning"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Plannings */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {schedules.map((s: any) => (
          <Card key={s.id} className={!s.isActive ? "opacity-60" : ""}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium">{s.name}</CardTitle>
                <Badge variant={s.isActive ? "default" : "secondary"}>{s.isActive ? "Actif" : "Inactif"}</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Clock className="w-3 h-3" />
                <span>{s.frequency === "monthly" ? "Mensuel" : s.frequency === "weekly" ? "Hebdomadaire" : "Trimestriel"} — J{s.dayOfMonth} à {s.sendTime}</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Mail className="w-3 h-3" />
                <span>{(s.recipientsJson ?? []).length} destinataire(s)</span>
              </div>
              {s.lastRunAt && (
                <div className="text-xs text-muted-foreground">
                  Dernier envoi : {new Date(s.lastRunAt).toLocaleDateString("fr-FR")}
                </div>
              )}
              <div className="flex gap-2 pt-2">
                {s.isActive && (
                  <>
                    <Button size="sm" variant="outline" onClick={() => runNowMutation.mutate({ scheduleId: s.id })} disabled={runNowMutation.isPending}>
                      <Play className="w-3 h-3 mr-1" />Envoyer
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => disableMutation.mutate({ id: s.id })}>Désactiver</Button>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
        {schedules.length === 0 && <p className="text-muted-foreground col-span-full">Aucun planning configuré</p>}
      </div>

      {/* Historique des livraisons */}
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Send className="w-4 h-4" />Historique des envois</CardTitle></CardHeader>
        <CardContent>
          {deliveries.length === 0 ? (
            <p className="text-muted-foreground text-sm">Aucun envoi effectué</p>
          ) : (
            <div className="space-y-2">
              {deliveries.map((d: any) => (
                <div key={d.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    {d.status === "sent" ? <CheckCircle className="w-4 h-4 text-green-500" /> : <XCircle className="w-4 h-4 text-red-500" />}
                    <div>
                      <p className="text-sm font-medium">Envoi #{d.id}</p>
                      <p className="text-xs text-muted-foreground">{new Date(d.createdAt).toLocaleString("fr-FR")}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge variant={d.status === "sent" ? "default" : "destructive"}>{d.status === "sent" ? "Envoyé" : "Échec"}</Badge>
                    <p className="text-xs text-muted-foreground mt-1">{(d.recipientsJson ?? []).length} dest.</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
