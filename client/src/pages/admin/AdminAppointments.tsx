import { useMemo, useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { CalendarDays, Clock, User, CheckCircle2, XCircle, AlertCircle, Settings, Plus, ChevronLeft, ChevronRight, List, LayoutGrid } from "lucide-react";
import { toast } from "sonner";

const DAYS_FR = ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];
const DAYS_SHORT = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];

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

function getStatusColor(status: string): string {
  switch (status) {
    case "pending": return "bg-amber-100 border-amber-300 text-amber-800";
    case "confirmed": return "bg-green-100 border-green-300 text-green-800";
    case "completed": return "bg-blue-100 border-blue-300 text-blue-800";
    case "cancelled_citizen":
    case "cancelled_agent": return "bg-red-100 border-red-300 text-red-800";
    case "no_show": return "bg-gray-100 border-gray-300 text-gray-800";
    default: return "bg-gray-100 border-gray-300 text-gray-800";
  }
}

// ─── Helper: get week dates ─────────────────────────────────────────
function getWeekDates(weekOffset: number): Date[] {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const monday = new Date(now);
  monday.setDate(now.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1) + weekOffset * 7);
  monday.setHours(0, 0, 0, 0);
  const dates: Date[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    dates.push(d);
  }
  return dates;
}

function formatDateISO(d: Date): string {
  return d.toISOString().slice(0, 10);
}

// ─── Calendar Week View ─────────────────────────────────────────────
function CalendarWeekView() {
  const [weekOffset, setWeekOffset] = useState(0);
  const [selectedAppointment, setSelectedAppointment] = useState<any>(null);
  const appointmentsQuery = trpc.adminAppointment.myAppointments.useQuery();
  const confirmMutation = trpc.adminAppointment.confirm.useMutation({
    onSuccess: () => { toast.success("Rendez-vous confirmé"); appointmentsQuery.refetch(); setSelectedAppointment(null); },
    onError: (err) => toast.error(err.message),
  });
  const cancelMutation = trpc.adminAppointment.cancel.useMutation({
    onSuccess: () => { toast.success("Rendez-vous annulé"); appointmentsQuery.refetch(); setSelectedAppointment(null); },
    onError: (err) => toast.error(err.message),
  });
  const completeMutation = trpc.adminAppointment.complete.useMutation({
    onSuccess: () => { toast.success("Rendez-vous terminé"); appointmentsQuery.refetch(); setSelectedAppointment(null); },
    onError: (err) => toast.error(err.message),
  });

  const weekDates = useMemo(() => getWeekDates(weekOffset), [weekOffset]);
  const allAppointments = appointmentsQuery.data ?? [];

  // Group appointments by date
  const appointmentsByDate = useMemo(() => {
    const map: Record<string, typeof allAppointments> = {};
    for (const apt of allAppointments) {
      if (!map[apt.date]) map[apt.date] = [];
      map[apt.date].push(apt);
    }
    // Sort each day by startTime
    for (const key of Object.keys(map)) {
      map[key].sort((a, b) => a.startTime.localeCompare(b.startTime));
    }
    return map;
  }, [allAppointments]);

  const todayStr = formatDateISO(new Date());

  // Week label
  const weekStart = weekDates[0];
  const weekEnd = weekDates[6];
  const weekLabel = `${weekStart.toLocaleDateString("fr-FR", { day: "numeric", month: "short" })} — ${weekEnd.toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" })}`;

  return (
    <div className="space-y-4">
      {/* Navigation */}
      <div className="flex items-center justify-between">
        <Button variant="outline" size="sm" onClick={() => setWeekOffset(o => o - 1)}>
          <ChevronLeft className="w-4 h-4 mr-1" />Semaine précédente
        </Button>
        <div className="text-center">
          <p className="font-semibold text-lg">{weekLabel}</p>
          {weekOffset !== 0 && (
            <Button variant="ghost" size="sm" className="text-xs" onClick={() => setWeekOffset(0)}>
              Aujourd'hui
            </Button>
          )}
        </div>
        <Button variant="outline" size="sm" onClick={() => setWeekOffset(o => o + 1)}>
          Semaine suivante<ChevronRight className="w-4 h-4 ml-1" />
        </Button>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 text-xs">
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-amber-200 border border-amber-400" />En attente</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-green-200 border border-green-400" />Confirmé</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-blue-200 border border-blue-400" />Terminé</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-red-200 border border-red-400" />Annulé</span>
      </div>

      {/* Week grid */}
      <div className="grid grid-cols-7 gap-1">
        {weekDates.map((date, idx) => {
          const dateStr = formatDateISO(date);
          const dayAppointments = appointmentsByDate[dateStr] || [];
          const isToday = dateStr === todayStr;

          return (
            <div
              key={dateStr}
              className={`border rounded-lg min-h-[200px] p-2 ${isToday ? "border-primary bg-primary/5" : "border-border"}`}
            >
              {/* Day header */}
              <div className={`text-center pb-2 mb-2 border-b ${isToday ? "border-primary/30" : "border-border"}`}>
                <p className="text-xs font-medium text-muted-foreground">{DAYS_SHORT[date.getDay()]}</p>
                <p className={`text-lg font-bold ${isToday ? "text-primary" : ""}`}>
                  {date.getDate()}
                </p>
              </div>

              {/* Appointments for this day */}
              <div className="space-y-1">
                {dayAppointments.map(apt => (
                  <button
                    key={apt.id}
                    onClick={() => setSelectedAppointment(apt)}
                    className={`w-full text-left p-1.5 rounded border text-xs cursor-pointer hover:opacity-80 transition-opacity ${getStatusColor(apt.status)}`}
                  >
                    <p className="font-semibold truncate">{apt.startTime}</p>
                    <p className="truncate">{apt.citizenName || `#${apt.citizenId}`}</p>
                  </button>
                ))}
                {dayAppointments.length === 0 && (
                  <p className="text-xs text-muted-foreground text-center mt-4 opacity-50">—</p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Appointment detail dialog */}
      <Dialog open={!!selectedAppointment} onOpenChange={(open) => { if (!open) setSelectedAppointment(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CalendarDays className="w-5 h-5" />
              Détail du rendez-vous
            </DialogTitle>
          </DialogHeader>
          {selectedAppointment && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-muted-foreground text-xs">Date</p>
                  <p className="font-medium">{selectedAppointment.date}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Heure</p>
                  <p className="font-medium">{selectedAppointment.startTime} — {selectedAppointment.endTime}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Citoyen</p>
                  <p className="font-medium">{selectedAppointment.citizenName || `Citoyen #${selectedAppointment.citizenId}`}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Statut</p>
                  {getStatusBadge(selectedAppointment.status)}
                </div>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Motif</p>
                <p className="text-sm">{selectedAppointment.motif}</p>
              </div>
              {selectedAppointment.dossierType !== "general" && (
                <div>
                  <p className="text-muted-foreground text-xs">Dossier lié</p>
                  <Badge variant="secondary">
                    {selectedAppointment.dossierType === "land_title" ? "Titre foncier" :
                     selectedAppointment.dossierType === "urban_acd" ? "ACD Urbain" :
                     selectedAppointment.dossierType === "credit" ? "Crédit habitat" : selectedAppointment.dossierType}
                    {selectedAppointment.dossierId ? ` #${selectedAppointment.dossierId}` : ""}
                  </Badge>
                </div>
              )}
              {selectedAppointment.notes && (
                <div>
                  <p className="text-muted-foreground text-xs">Notes</p>
                  <p className="text-sm">{selectedAppointment.notes}</p>
                </div>
              )}
              {selectedAppointment.cancelReason && (
                <div>
                  <p className="text-muted-foreground text-xs text-red-500">Motif d'annulation</p>
                  <p className="text-sm text-red-600">{selectedAppointment.cancelReason}</p>
                </div>
              )}
              <div className="flex gap-2 pt-2 border-t">
                {selectedAppointment.status === "pending" && (
                  <Button
                    size="sm"
                    className="bg-green-600 hover:bg-green-700"
                    onClick={() => confirmMutation.mutate({ appointmentId: selectedAppointment.id })}
                    disabled={confirmMutation.isPending}
                  >
                    <CheckCircle2 className="w-4 h-4 mr-1" />Confirmer
                  </Button>
                )}
                {(selectedAppointment.status === "pending" || selectedAppointment.status === "confirmed") && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-red-600 border-red-200 hover:bg-red-50"
                    onClick={() => cancelMutation.mutate({ appointmentId: selectedAppointment.id, reason: "Annulé par l'agent" })}
                    disabled={cancelMutation.isPending}
                  >
                    <XCircle className="w-4 h-4 mr-1" />Annuler
                  </Button>
                )}
                {selectedAppointment.status === "confirmed" && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-blue-600 border-blue-200 hover:bg-blue-50"
                    onClick={() => completeMutation.mutate({ appointmentId: selectedAppointment.id })}
                    disabled={completeMutation.isPending}
                  >
                    <CheckCircle2 className="w-4 h-4 mr-1" />Terminer
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
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

// ─── Appointments List (kept as alternate view) ─────────────────────
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
                {appt.dossierType !== "general" && (
                  <Badge variant="secondary" className="text-xs">
                    {appt.dossierType === "land_title" ? "Titre foncier" :
                     appt.dossierType === "urban_acd" ? "ACD Urbain" :
                     appt.dossierType === "credit" ? "Crédit habitat" : appt.dossierType}
                    {appt.dossierId ? ` #${appt.dossierId}` : ""}
                  </Badge>
                )}
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
  const [viewMode, setViewMode] = useState<"calendar" | "list">("calendar");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Gestion des rendez-vous</h1>
          <p className="text-muted-foreground">Gérez vos disponibilités et les rendez-vous des citoyens</p>
        </div>
        <div className="flex items-center gap-1 border rounded-lg p-1">
          <Button
            variant={viewMode === "calendar" ? "default" : "ghost"}
            size="sm"
            onClick={() => setViewMode("calendar")}
          >
            <LayoutGrid className="w-4 h-4 mr-1" />Calendrier
          </Button>
          <Button
            variant={viewMode === "list" ? "default" : "ghost"}
            size="sm"
            onClick={() => setViewMode("list")}
          >
            <List className="w-4 h-4 mr-1" />Liste
          </Button>
        </div>
      </div>

      <Tabs defaultValue="appointments">
        <TabsList>
          <TabsTrigger value="appointments">Rendez-vous</TabsTrigger>
          <TabsTrigger value="availability">Mes disponibilités</TabsTrigger>
        </TabsList>

        <TabsContent value="appointments" className="mt-4">
          {viewMode === "calendar" ? <CalendarWeekView /> : <AppointmentsList />}
        </TabsContent>

        <TabsContent value="availability" className="mt-4">
          <AvailabilityManager />
        </TabsContent>
      </Tabs>
    </div>
  );
}
