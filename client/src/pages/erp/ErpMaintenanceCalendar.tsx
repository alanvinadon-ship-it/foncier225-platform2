import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useErpPermissions } from "@/hooks/useErpPermissions";
import { Calendar, ChevronLeft, ChevronRight, AlertTriangle, CheckCircle, Clock, Wrench } from "lucide-react";

const MAINTENANCE_TYPES: Record<string, string> = {
  preventive: "Préventive",
  corrective: "Corrective",
  inspection: "Inspection",
  calibration: "Calibration",
  revision: "Révision",
  autre: "Autre",
};

const STATUS_COLORS: Record<string, string> = {
  scheduled: "bg-blue-100 text-blue-800 border-blue-300",
  in_progress: "bg-yellow-100 text-yellow-800 border-yellow-300",
  completed: "bg-green-100 text-green-800 border-green-300",
  cancelled: "bg-gray-100 text-gray-600 border-gray-300",
  overdue: "bg-red-100 text-red-800 border-red-300",
};

function formatDate(ts: number) {
  return new Date(ts).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" });
}

export default function ErpMaintenanceCalendar() {
  const [daysAhead, setDaysAhead] = useState(30);
  const { data: upcoming, isLoading } = trpc.erp.equipment.upcomingMaintenance.useQuery({ daysAhead });

  const grouped = useMemo(() => {
    if (!upcoming) return {};
    const groups: Record<string, typeof upcoming> = {};
    for (const item of upcoming) {
      const date = new Date(item.scheduledAt).toISOString().split("T")[0];
      if (!groups[date]) groups[date] = [];
      groups[date].push(item);
    }
    return groups;
  }, [upcoming]);

  const sortedDates = Object.keys(grouped).sort();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Calendar className="text-orange-600" size={24} />
            Calendrier de Maintenance
          </h1>
          <p className="text-sm text-gray-500 mt-1">Vue chronologique des maintenances planifiées</p>
        </div>
        <Select value={String(daysAhead)} onValueChange={(v) => setDaysAhead(parseInt(v))}>
          <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="7">7 prochains jours</SelectItem>
            <SelectItem value="14">14 prochains jours</SelectItem>
            <SelectItem value="30">30 prochains jours</SelectItem>
            <SelectItem value="60">60 prochains jours</SelectItem>
            <SelectItem value="90">90 prochains jours</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Summary */}
      {upcoming && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card>
            <CardContent className="p-3 text-center">
              <div className="text-2xl font-bold">{upcoming.length}</div>
              <div className="text-xs text-gray-500">Total planifié</div>
            </CardContent>
          </Card>
          <Card className="border-red-200">
            <CardContent className="p-3 text-center">
              <div className="text-2xl font-bold text-red-700">{upcoming.filter(m => m.isOverdue).length}</div>
              <div className="text-xs text-gray-500">En retard</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 text-center">
              <div className="text-2xl font-bold text-blue-700">{upcoming.filter(m => !m.isOverdue).length}</div>
              <div className="text-xs text-gray-500">À venir</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 text-center">
              <div className="text-2xl font-bold text-gray-700">{sortedDates.length}</div>
              <div className="text-xs text-gray-500">Jours concernés</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Timeline */}
      {isLoading ? (
        <div className="text-center py-8 text-gray-400">Chargement...</div>
      ) : sortedDates.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-gray-400">
            <Wrench className="mx-auto mb-2" size={32} />
            Aucune maintenance planifiée dans les {daysAhead} prochains jours
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {sortedDates.map((date) => {
            const items = grouped[date];
            const dateObj = new Date(date);
            const isToday = new Date().toISOString().split("T")[0] === date;
            const isPast = dateObj < new Date(new Date().toISOString().split("T")[0]);

            return (
              <div key={date} className="flex gap-4">
                {/* Date column */}
                <div className={`w-20 flex-shrink-0 text-center p-2 rounded-lg ${isToday ? "bg-orange-100 border border-orange-300" : isPast ? "bg-red-50 border border-red-200" : "bg-gray-50 border"}`}>
                  <div className="text-xs text-gray-500 uppercase">
                    {dateObj.toLocaleDateString("fr-FR", { weekday: "short" })}
                  </div>
                  <div className={`text-lg font-bold ${isToday ? "text-orange-700" : isPast ? "text-red-700" : "text-gray-900"}`}>
                    {dateObj.getDate()}
                  </div>
                  <div className="text-xs text-gray-500">
                    {dateObj.toLocaleDateString("fr-FR", { month: "short" })}
                  </div>
                </div>

                {/* Items */}
                <div className="flex-1 space-y-2">
                  {items.map((item) => (
                    <div key={item.id} className={`p-3 rounded-lg border ${item.isOverdue ? "border-red-200 bg-red-50" : "border-gray-200 bg-white"}`}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {item.isOverdue ? <AlertTriangle size={14} className="text-red-600" /> : <Clock size={14} className="text-blue-600" />}
                          <span className="font-mono text-xs bg-gray-100 px-1.5 py-0.5 rounded">{item.equipmentCode}</span>
                          <span className="font-medium text-sm">{item.equipmentName}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">
                            {MAINTENANCE_TYPES[item.type] || item.type}
                          </Badge>
                          {item.isOverdue && <Badge className="bg-red-100 text-red-800 text-xs">EN RETARD</Badge>}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
