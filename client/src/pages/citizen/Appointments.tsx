import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CalendarDays, Clock, User, CheckCircle2, XCircle, AlertCircle, Plus } from "lucide-react";
import { toast } from "sonner";

const DAYS_FR = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];
const MONTHS_FR = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"];

function getStatusBadge(status: string) {
  switch (status) {
    case "pending": return <Badge variant="outline" className="text-amber-600 border-amber-300 bg-amber-50"><AlertCircle className="w-3 h-3 mr-1" />En attente</Badge>;
    case "confirmed": return <Badge variant="outline" className="text-green-600 border-green-300 bg-green-50"><CheckCircle2 className="w-3 h-3 mr-1" />Confirmé</Badge>;
    case "completed": return <Badge variant="outline" className="text-blue-600 border-blue-300 bg-blue-50"><CheckCircle2 className="w-3 h-3 mr-1" />Terminé</Badge>;
    case "cancelled_citizen": return <Badge variant="outline" className="text-red-600 border-red-300 bg-red-50"><XCircle className="w-3 h-3 mr-1" />Annulé (vous)</Badge>;
    case "cancelled_agent": return <Badge variant="outline" className="text-red-600 border-red-300 bg-red-50"><XCircle className="w-3 h-3 mr-1" />Annulé (agent)</Badge>;
    case "no_show": return <Badge variant="outline" className="text-gray-600 border-gray-300 bg-gray-50"><XCircle className="w-3 h-3 mr-1" />Absent</Badge>;
    default: return <Badge variant="outline">{status}</Badge>;
  }
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr + "T00:00:00");
  return `${d.getDate()} ${MONTHS_FR[d.getMonth()]} ${d.getFullYear()}`;
}

// ─── Mini Calendar Component ────────────────────────────────────────
function MiniCalendar({ selectedDate, onSelectDate }: { selectedDate: string; onSelectDate: (d: string) => void }) {
  const [viewMonth, setViewMonth] = useState(() => {
    const d = selectedDate ? new Date(selectedDate + "T00:00:00") : new Date();
    return { year: d.getFullYear(), month: d.getMonth() };
  });

  const daysInMonth = new Date(viewMonth.year, viewMonth.month + 1, 0).getDate();
  const firstDayOfWeek = new Date(viewMonth.year, viewMonth.month, 1).getDay();
  // Adjust to Monday start (0=Mon, 6=Sun)
  const startOffset = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1;

  const today = new Date().toISOString().slice(0, 10);

  const cells = [];
  for (let i = 0; i < startOffset; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const prevMonth = () => {
    setViewMonth(prev => prev.month === 0 ? { year: prev.year - 1, month: 11 } : { year: prev.year, month: prev.month - 1 });
  };
  const nextMonth = () => {
    setViewMonth(prev => prev.month === 11 ? { year: prev.year + 1, month: 0 } : { year: prev.year, month: prev.month + 1 });
  };

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-3">
        <Button variant="ghost" size="sm" onClick={prevMonth}>&lt;</Button>
        <span className="font-semibold text-sm">{MONTHS_FR[viewMonth.month]} {viewMonth.year}</span>
        <Button variant="ghost" size="sm" onClick={nextMonth}>&gt;</Button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-xs">
        {["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"].map(d => (
          <div key={d} className="font-medium text-muted-foreground py-1">{d}</div>
        ))}
        {cells.map((day, i) => {
          if (day === null) return <div key={`empty-${i}`} />;
          const dateStr = `${viewMonth.year}-${String(viewMonth.month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
          const isPast = dateStr < today;
          const isSelected = dateStr === selectedDate;
          const isToday = dateStr === today;
          const isWeekend = new Date(dateStr + "T00:00:00").getDay() === 0 || new Date(dateStr + "T00:00:00").getDay() === 6;
          return (
            <button
              key={dateStr}
              onClick={() => !isPast && onSelectDate(dateStr)}
              disabled={isPast}
              className={`
                py-1.5 rounded text-sm transition-colors
                ${isPast ? "text-muted-foreground/40 cursor-not-allowed" : "hover:bg-primary/10 cursor-pointer"}
                ${isSelected ? "bg-primary text-primary-foreground font-bold" : ""}
                ${isToday && !isSelected ? "ring-1 ring-primary font-semibold" : ""}
                ${isWeekend && !isSelected ? "text-muted-foreground" : ""}
              `}
            >
              {day}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Booking Dialog ─────────────────────────────────────────────────
function BookingDialog({ agents, onSuccess }: { agents: { id: number; name: string | null; role: string }[]; onSuccess: () => void }) {
  const [open, setOpen] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState<string>("");
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedSlot, setSelectedSlot] = useState<{ startTime: string; endTime: string } | null>(null);
  const [motif, setMotif] = useState("");
  const [dossierType, setDossierType] = useState("general");
  const [dossierId, setDossierId] = useState<string>("");
  const [notes, setNotes] = useState("");

  // Charger les dossiers actifs du citoyen
  const dossiersQuery = trpc.appointment.listMyDossiers.useQuery(undefined, { enabled: open });

  const slotsQuery = trpc.appointment.availableSlots.useQuery(
    { agentId: Number(selectedAgent), date: selectedDate },
    { enabled: !!selectedAgent && !!selectedDate }
  );

  const bookMutation = trpc.appointment.book.useMutation({
    onSuccess: () => {
      toast.success("Rendez-vous demandé — Votre demande a été enregistrée avec succès.");
      setOpen(false);
      resetForm();
      onSuccess();
    },
    onError: (err) => {
      toast.error(err.message);
    },
  });

  const resetForm = () => {
    setSelectedAgent("");
    setSelectedDate("");
    setSelectedSlot(null);
    setMotif("");
    setDossierType("general");
    setDossierId("");
    setNotes("");
  };

  const handleBook = () => {
    if (!selectedAgent || !selectedDate || !selectedSlot || !motif) return;
    bookMutation.mutate({
      agentId: Number(selectedAgent),
      date: selectedDate,
      startTime: selectedSlot.startTime,
      endTime: selectedSlot.endTime,
      motif,
      dossierType: dossierType as any,
      dossierId: dossierId ? Number(dossierId) : undefined,
      notes: notes || undefined,
    });
  };

  // Filtrer les dossiers par type sélectionné
  const filteredDossiers = (dossiersQuery.data ?? []).filter(d => d.type === dossierType);

  const availableSlots = slotsQuery.data?.filter(s => s.available) ?? [];

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm(); }}>
      <DialogTrigger asChild>
        <Button className="gap-2"><Plus className="w-4 h-4" />Prendre rendez-vous</Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><CalendarDays className="w-5 h-5" />Nouveau rendez-vous</DialogTitle>
        </DialogHeader>
        <div className="space-y-5 pt-2">
          {/* Step 1: Agent */}
          <div className="space-y-2">
            <Label className="font-semibold">1. Choisir un agent</Label>
            <Select value={selectedAgent} onValueChange={(v) => { setSelectedAgent(v); setSelectedSlot(null); }}>
              <SelectTrigger><SelectValue placeholder="Sélectionner un agent..." /></SelectTrigger>
              <SelectContent>
                {agents.map(a => (
                  <SelectItem key={a.id} value={String(a.id)}>
                    {a.name || `Agent #${a.id}`} — {a.role === "admin" ? "Administrateur" : a.role === "agent_terrain" ? "Agent terrain" : a.role === "agent_mclu" ? "Agent MCLU" : a.role}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Step 2: Date */}
          {selectedAgent && (
            <div className="space-y-2">
              <Label className="font-semibold">2. Choisir une date</Label>
              <MiniCalendar selectedDate={selectedDate} onSelectDate={(d) => { setSelectedDate(d); setSelectedSlot(null); }} />
            </div>
          )}

          {/* Step 3: Slot */}
          {selectedAgent && selectedDate && (
            <div className="space-y-2">
              <Label className="font-semibold">3. Choisir un créneau</Label>
              {slotsQuery.isLoading && <p className="text-sm text-muted-foreground">Chargement des créneaux...</p>}
              {slotsQuery.data && availableSlots.length === 0 && (
                <p className="text-sm text-amber-600">Aucun créneau disponible pour cette date. Essayez une autre date.</p>
              )}
              {availableSlots.length > 0 && (
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                  {availableSlots.map(slot => (
                    <button
                      key={slot.startTime}
                      onClick={() => setSelectedSlot(slot)}
                      className={`
                        px-3 py-2 rounded border text-sm font-medium transition-colors
                        ${selectedSlot?.startTime === slot.startTime
                          ? "bg-primary text-primary-foreground border-primary"
                          : "border-border hover:border-primary hover:bg-primary/5"
                        }
                      `}
                    >
                      {slot.startTime}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Step 4: Motif */}
          {selectedSlot && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="font-semibold">4. Motif du rendez-vous</Label>
                <Input
                  placeholder="Ex: Consultation dossier titre foncier, Dépôt de documents..."
                  value={motif}
                  onChange={e => setMotif(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Type de dossier (optionnel)</Label>
                <Select value={dossierType} onValueChange={(v) => { setDossierType(v); setDossierId(""); }}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="general">Général</SelectItem>
                    <SelectItem value="land_title">Titre Foncier (CF/TF)</SelectItem>
                    <SelectItem value="urban_acd">Foncier Urbain (ACD)</SelectItem>
                    <SelectItem value="credit">Crédit Habitat</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {dossierType !== "general" && (
                <div className="space-y-2">
                  <Label>Lier à un dossier existant (optionnel)</Label>
                  {dossiersQuery.isLoading ? (
                    <p className="text-sm text-muted-foreground">Chargement de vos dossiers...</p>
                  ) : filteredDossiers.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Aucun dossier actif de ce type trouvé.</p>
                  ) : (
                    <Select value={dossierId} onValueChange={setDossierId}>
                      <SelectTrigger><SelectValue placeholder="Sélectionner un dossier..." /></SelectTrigger>
                      <SelectContent>
                        {filteredDossiers.map(d => (
                          <SelectItem key={d.id} value={String(d.id)}>{d.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
              )}
              <div className="space-y-2">
                <Label>Notes supplémentaires (optionnel)</Label>
                <Textarea
                  placeholder="Informations complémentaires..."
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  rows={2}
                />
              </div>
              <Button
                onClick={handleBook}
                disabled={!motif || bookMutation.isPending}
                className="w-full"
              >
                {bookMutation.isPending ? "Réservation en cours..." : "Confirmer le rendez-vous"}
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Page ──────────────────────────────────────────────────────
export default function CitizenAppointments() {
  const agentsQuery = trpc.appointment.listAgents.useQuery();
  const appointmentsQuery = trpc.appointment.list.useQuery();
  const cancelMutation = trpc.appointment.cancel.useMutation({
    onSuccess: () => {
      toast.success("Rendez-vous annulé");
      appointmentsQuery.refetch();
    },
    onError: (err) => toast.error(err.message),
  });

  const appointments = appointmentsQuery.data ?? [];
  const upcoming = appointments.filter(a => a.status === "pending" || a.status === "confirmed");
  const past = appointments.filter(a => a.status !== "pending" && a.status !== "confirmed");

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Mes rendez-vous</h1>
          <p className="text-muted-foreground">Prenez rendez-vous avec un agent foncier</p>
        </div>
        {agentsQuery.data && agentsQuery.data.length > 0 && (
          <BookingDialog agents={agentsQuery.data} onSuccess={() => appointmentsQuery.refetch()} />
        )}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-100"><Clock className="w-5 h-5 text-amber-600" /></div>
            <div>
              <p className="text-2xl font-bold">{upcoming.filter(a => a.status === "pending").length}</p>
              <p className="text-xs text-muted-foreground">En attente</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-100"><CheckCircle2 className="w-5 h-5 text-green-600" /></div>
            <div>
              <p className="text-2xl font-bold">{upcoming.filter(a => a.status === "confirmed").length}</p>
              <p className="text-xs text-muted-foreground">Confirmés</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-100"><CalendarDays className="w-5 h-5 text-blue-600" /></div>
            <div>
              <p className="text-2xl font-bold">{appointments.length}</p>
              <p className="text-xs text-muted-foreground">Total</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="upcoming">
        <TabsList>
          <TabsTrigger value="upcoming">À venir ({upcoming.length})</TabsTrigger>
          <TabsTrigger value="past">Historique ({past.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="upcoming" className="mt-4 space-y-3">
          {upcoming.length === 0 && (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                <CalendarDays className="w-10 h-10 mx-auto mb-3 opacity-40" />
                <p>Aucun rendez-vous à venir</p>
                <p className="text-sm mt-1">Utilisez le bouton « Prendre rendez-vous » pour en créer un.</p>
              </CardContent>
            </Card>
          )}
          {upcoming.map(appt => (
            <Card key={appt.id} className="hover:shadow-sm transition-shadow">
              <CardContent className="py-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <CalendarDays className="w-4 h-4 text-primary" />
                      <span className="font-semibold">{formatDate(appt.date)}</span>
                      <span className="text-muted-foreground">•</span>
                      <Clock className="w-4 h-4 text-muted-foreground" />
                      <span>{appt.startTime} - {appt.endTime}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <User className="w-3.5 h-3.5 text-muted-foreground" />
                      <span>{appt.agentName || `Agent #${appt.agentId}`}</span>
                    </div>
                    <p className="text-sm text-muted-foreground">{appt.motif}</p>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    {getStatusBadge(appt.status)}
                    {(appt.status === "pending" || appt.status === "confirmed") && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-red-600 border-red-200 hover:bg-red-50"
                        onClick={() => cancelMutation.mutate({ appointmentId: appt.id })}
                        disabled={cancelMutation.isPending}
                      >
                        Annuler
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="past" className="mt-4 space-y-3">
          {past.length === 0 && (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                <p>Aucun rendez-vous passé</p>
              </CardContent>
            </Card>
          )}
          {past.map(appt => (
            <Card key={appt.id} className="opacity-80">
              <CardContent className="py-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <CalendarDays className="w-4 h-4 text-muted-foreground" />
                      <span className="font-medium">{formatDate(appt.date)}</span>
                      <span className="text-muted-foreground">•</span>
                      <span className="text-sm">{appt.startTime} - {appt.endTime}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <User className="w-3.5 h-3.5 text-muted-foreground" />
                      <span>{appt.agentName || `Agent #${appt.agentId}`}</span>
                    </div>
                    <p className="text-sm text-muted-foreground">{appt.motif}</p>
                    {appt.cancelReason && (
                      <p className="text-xs text-red-500 mt-1">Motif d'annulation : {appt.cancelReason}</p>
                    )}
                  </div>
                  <div>{getStatusBadge(appt.status)}</div>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
}
