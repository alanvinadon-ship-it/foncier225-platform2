import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { CalendarDays, Clock, User, CheckCircle2, XCircle, AlertCircle, Settings, Plus } from "lucide-react";
import { toast } from "sonner";

const DAYS_FR = ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];

function getStatusBadge(status: string) {
  switch (status) {
    case "pending": return <Badge variant="outline" className="text-amber-600 border-amber-300 bg-amber-50"><AlertCircle className="w-3 h-3 mr-1" />En attente</Badge>;
    case "confirmed": return <Badge variant="outline" className="text-green-600 border-green-300 bg-green-50"><CheckCircle2 className="w-3 h-3 mr-1" />Confirmé</Badge>;
    case "completed": return <Badge variant="outline" className="text-blue-600 border-blue-300 bg-blue-50"><CheckCircle2 className="w-3 h-3 mr-1" />Terminé</Badge>;
    case "cancelled_citizen": return <Badge variant="outline" className="text-red-600 border-red-300 bg-red-50"><XCircle className="w-3 h-3 mr-1" />Annulé (citoyen)</Badge>;
    case "cancelled_agent": return <Badge variant="outline" className="text-red-600 border-red-300 bg-red-50"><XCircle className="w-3 h-3 mr-1" />Annulé (agent)</Badge>;
    case "no_show": return <Badge variant="outline" className="text-gray-600 border-gray-300 bg-gray-50">Absent</Badge>;
    default: return <Badge variant="outline">{status}</Badge>;
  }
}

// ─── Availability Manager ───────────────────────────────────────────
function AvailabilityManager() {
  const availabilitiesQuery = trpc.adminAppointment.getMyAvailabilities.useQuery();
  const setMutation = trpc.adminAppointment.setAvailability.useMutation({
    onSuccess: () => {
      toast.success("Disponibilité mise à jour");
      availabilitiesQuery.refetch();
    },
    onError: (err) => toast.error(err.message),
  });
  const deleteMutation = trpc.adminAppointment.deleteAvailability.useMutation({
    onSuccess: () => {
      toast.success("Disponibilité supprimée");
      availabilitiesQuery.refetch();
    },
    onError: (err) => toast.error(err.message),
  });

  const [newDay, setNewDay] = useState("1");
  const [newStart, setNewStart] = useState("08:00");
  const [newEnd, setNewEnd] = useState("17:00");
  const [newDuration, setNewDuration] = useState("30");

  const handleAdd = () => {
    setMutation.mutate({
      dayOfWeek: Number(newDay),
      startTime: newStart,
      endTime: newEnd,
      slotDurationMin: Number(newDuration),
      isActive: true,
    });
  };

  const availabilities = availabilitiesQuery.data ?? [];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Settings className="w-5 h-5" />
          Mes disponibilités
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Current availabilities */}
        {availabilities.length === 0 && (
          <p className="text-sm text-muted-foreground">Aucune disponibilité configurée. Ajoutez vos créneaux ci-dessous.</p>
        )}
        {availabilities.length > 0 && (
          <div className="space-y-2">
            {availabilities.map(a => (
              <div key={a.id} className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
                <div className="flex items-center gap-3">
                  <Badge variant={a.isActive ? "default" : "secondary"}>
                    {DAYS_FR[a.dayOfWeek]}
                  </Badge>
                  <span className="text-sm font-medium">{a.startTime} — {a.endTime}</span>
                  <span className="text-xs text-muted-foreground">({a.slotDurationMin} min/créneau)</span>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={a.isActive}
                    onCheckedChange={(checked) => {
                      setMutation.mutate({
                        dayOfWeek: a.dayOfWeek,
                        startTime: a.startTime,
                        endTime: a.endTime,
                        slotDurationMin: a.slotDurationMin,
                        isActive: checked,
                      });
                    }}
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-red-500 hover:text-red-700"
                    onClick={() => deleteMutation.mutate({ id: a.id })}
                  >
                    <XCircle className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Add new */}
        <div className="border-t pt-4">
          <p className="text-sm font-medium mb-3">Ajouter un créneau</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <Label className="text-xs">Jour</Label>
              <Select value={newDay} onValueChange={setNewDay}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {DAYS_FR.map((d, i) => (
                    <SelectItem key={i} value={String(i)}>{d}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Début</Label>
              <Input type="time" value={newStart} onChange={e => setNewStart(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">Fin</Label>
              <Input type="time" value={newEnd} onChange={e => setNewEnd(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">Durée (min)</Label>
              <Select value={newDuration} onValueChange={setNewDuration}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="15">15 min</SelectItem>
                  <SelectItem value="30">30 min</SelectItem>
                  <SelectItem value="45">45 min</SelectItem>
                  <SelectItem value="60">60 min</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <Button onClick={handleAdd} className="mt-3 gap-2" disabled={setMutation.isPending}>
            <Plus className="w-4 h-4" />Ajouter
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Appointments List ──────────────────────────────────────────────
function AppointmentsList() {
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const appointmentsQuery = trpc.adminAppointment.myAppointments.useQuery();
  const confirmMutation = trpc.adminAppointment.confirm.useMutation({
    onSuccess: () => { toast.success("Rendez-vous confirmé"); appointmentsQuery.refetch(); },
    onError: (err) => toast.error(err.message),
  });
  const cancelMutation = trpc.adminAppointment.cancel.useMutation({
    onSuccess: () => { toast.success("Rendez-vous annulé"); appointmentsQuery.refetch(); },
    onError: (err) => toast.error(err.message),
  });
  const completeMutation = trpc.adminAppointment.complete.useMutation({
    onSuccess: () => { toast.success("Rendez-vous terminé"); appointmentsQuery.refetch(); },
    onError: (err) => toast.error(err.message),
  });

  const allAppointments = appointmentsQuery.data ?? [];
  const filtered = statusFilter === "all" ? allAppointments : allAppointments.filter(a => a.status === statusFilter);

  const pendingCount = allAppointments.filter(a => a.status === "pending").length;
  const confirmedCount = allAppointments.filter(a => a.status === "confirmed").length;
  const todayStr = new Date().toISOString().slice(0, 10);
  const todayCount = allAppointments.filter(a => a.date === todayStr && (a.status === "confirmed" || a.status === "pending")).length;

  return (
    <div className="space-y-4">
      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-100"><AlertCircle className="w-5 h-5 text-amber-600" /></div>
            <div>
              <p className="text-2xl font-bold">{pendingCount}</p>
              <p className="text-xs text-muted-foreground">En attente de confirmation</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-100"><CheckCircle2 className="w-5 h-5 text-green-600" /></div>
            <div>
              <p className="text-2xl font-bold">{confirmedCount}</p>
              <p className="text-xs text-muted-foreground">Confirmés</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-100"><CalendarDays className="w-5 h-5 text-blue-600" /></div>
            <div>
              <p className="text-2xl font-bold">{todayCount}</p>
              <p className="text-xs text-muted-foreground">Aujourd'hui</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter */}
      <div className="flex items-center gap-3">
        <Label className="text-sm font-medium">Filtrer :</Label>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous ({allAppointments.length})</SelectItem>
            <SelectItem value="pending">En attente ({pendingCount})</SelectItem>
            <SelectItem value="confirmed">Confirmés ({confirmedCount})</SelectItem>
            <SelectItem value="completed">Terminés</SelectItem>
            <SelectItem value="cancelled_citizen">Annulés (citoyen)</SelectItem>
            <SelectItem value="cancelled_agent">Annulés (agent)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* List */}
      {filtered.length === 0 && (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            <CalendarDays className="w-10 h-10 mx-auto mb-3 opacity-40" />
            <p>Aucun rendez-vous trouvé</p>
          </CardContent>
        </Card>
      )}
      {filtered.map(appt => (
        <Card key={appt.id} className="hover:shadow-sm transition-shadow">
          <CardContent className="py-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 space-y-1">
                <div className="flex items-center gap-2">
                  <CalendarDays className="w-4 h-4 text-primary" />
                  <span className="font-semibold">{appt.date}</span>
                  <span className="text-muted-foreground">•</span>
                  <Clock className="w-4 h-4 text-muted-foreground" />
                  <span>{appt.startTime} - {appt.endTime}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <User className="w-3.5 h-3.5 text-muted-foreground" />
                  <span className="font-medium">{appt.citizenName || `Citoyen #${appt.citizenId}`}</span>
                </div>
                <p className="text-sm text-muted-foreground">{appt.motif}</p>
                {appt.cancelReason && (
                  <p className="text-xs text-red-500">Motif annulation : {appt.cancelReason}</p>
                )}
              </div>
              <div className="flex flex-col items-end gap-2">
                {getStatusBadge(appt.status)}
                <div className="flex gap-1">
                  {appt.status === "pending" && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-green-600 border-green-200 hover:bg-green-50"
                      onClick={() => confirmMutation.mutate({ appointmentId: appt.id })}
                      disabled={confirmMutation.isPending}
                    >
                      Confirmer
                    </Button>
                  )}
                  {(appt.status === "pending" || appt.status === "confirmed") && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-red-600 border-red-200 hover:bg-red-50"
                      onClick={() => cancelMutation.mutate({ appointmentId: appt.id, reason: "Annulé par l'agent" })}
                      disabled={cancelMutation.isPending}
                    >
                      Annuler
                    </Button>
                  )}
                  {appt.status === "confirmed" && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-blue-600 border-blue-200 hover:bg-blue-50"
                      onClick={() => completeMutation.mutate({ appointmentId: appt.id })}
                      disabled={completeMutation.isPending}
                    >
                      Terminer
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ─── Main Page ──────────────────────────────────────────────────────
export default function AdminAppointments() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Gestion des rendez-vous</h1>
        <p className="text-muted-foreground">Gérez vos disponibilités et les rendez-vous des citoyens</p>
      </div>

      <Tabs defaultValue="appointments">
        <TabsList>
          <TabsTrigger value="appointments">Rendez-vous</TabsTrigger>
          <TabsTrigger value="availability">Mes disponibilités</TabsTrigger>
        </TabsList>

        <TabsContent value="appointments" className="mt-4">
          <AppointmentsList />
        </TabsContent>

        <TabsContent value="availability" className="mt-4">
          <AvailabilityManager />
        </TabsContent>
      </Tabs>
    </div>
  );
}
