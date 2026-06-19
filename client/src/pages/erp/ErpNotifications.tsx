import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Bell, CheckCheck, Mail, MailOpen } from "lucide-react";
import { toast } from "sonner";

const PRIORITY_COLORS: Record<string, string> = {
  low: "bg-slate-100 text-slate-700",
  medium: "bg-yellow-100 text-yellow-800",
  high: "bg-orange-100 text-orange-800",
  critical: "bg-red-100 text-red-800",
};

export default function ErpNotifications() {

  const [moduleFilter, setModuleFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [readFilter, setReadFilter] = useState<string>("all");

  const queryParams: any = { limit: 100, offset: 0 };
  if (moduleFilter !== "all") queryParams.module = moduleFilter;
  if (priorityFilter !== "all") queryParams.priority = priorityFilter;
  if (readFilter !== "all") queryParams.isRead = readFilter === "true";

  const { data, isLoading, refetch } = trpc.erp.notifications.list.useQuery(queryParams);
  const { data: unreadData } = trpc.erp.notifications.unreadCount.useQuery();

  const markReadMutation = trpc.erp.notifications.markRead.useMutation({
    onSuccess: () => refetch(),
  });
  const markAllReadMutation = trpc.erp.notifications.markAllRead.useMutation({
    onSuccess: () => {
      toast.success("Toutes les notifications marquées comme lues");
      refetch();
    },
  });

  const formatDate = (ts: number) => new Date(ts).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Bell className="h-6 w-6" />
            Notifications
            {unreadData && unreadData.count > 0 && (
              <Badge className="bg-red-500 text-white">{unreadData.count}</Badge>
            )}
          </h1>
          <p className="text-muted-foreground">Centre de notifications ERP</p>
        </div>
        <Button variant="outline" onClick={() => markAllReadMutation.mutate()} disabled={markAllReadMutation.isPending || !unreadData?.count}>
          <CheckCheck className="h-4 w-4 mr-2" />
          Tout marquer comme lu
        </Button>
      </div>

      {/* Filtres */}
      <div className="flex gap-3 flex-wrap">
        <Select value={moduleFilter} onValueChange={setModuleFilter}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Module" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous modules</SelectItem>
            <SelectItem value="finance">Finance</SelectItem>
            <SelectItem value="projects">Projets</SelectItem>
            <SelectItem value="inventory">Inventaire</SelectItem>
            <SelectItem value="safety">Sécurité</SelectItem>
            <SelectItem value="compliance">Conformité</SelectItem>
            <SelectItem value="equipment">Équipement</SelectItem>
            <SelectItem value="general">Général</SelectItem>
          </SelectContent>
        </Select>

        <Select value={priorityFilter} onValueChange={setPriorityFilter}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Priorité" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes priorités</SelectItem>
            <SelectItem value="low">Basse</SelectItem>
            <SelectItem value="medium">Moyenne</SelectItem>
            <SelectItem value="high">Haute</SelectItem>
            <SelectItem value="critical">Critique</SelectItem>
          </SelectContent>
        </Select>

        <Select value={readFilter} onValueChange={setReadFilter}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Statut" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes</SelectItem>
            <SelectItem value="false">Non lues</SelectItem>
            <SelectItem value="true">Lues</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Notifications List */}
      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">Chargement...</div>
      ) : !data?.notifications.length ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Bell className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-lg font-medium">Aucune notification</p>
            <p className="text-muted-foreground">Vous n'avez aucune notification pour le moment.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {data.notifications.map((notif) => (
            <Card key={notif.id} className={`transition-colors ${!notif.isRead ? "bg-blue-50/50 border-blue-200" : ""}`}>
              <CardContent className="py-3">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 flex-1">
                    <div className="mt-0.5">
                      {notif.isRead ? <MailOpen className="h-4 w-4 text-muted-foreground" /> : <Mail className="h-4 w-4 text-blue-600" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className={`font-medium text-sm ${!notif.isRead ? "text-foreground" : "text-muted-foreground"}`}>{notif.title}</span>
                        <Badge className={`text-xs ${PRIORITY_COLORS[notif.priority]}`}>{notif.priority}</Badge>
                        <Badge variant="outline" className="text-xs">{notif.module}</Badge>
                      </div>
                      {notif.message && <p className="text-sm text-muted-foreground line-clamp-2">{notif.message}</p>}
                      <p className="text-xs text-muted-foreground mt-1">{formatDate(notif.createdAt)}</p>
                    </div>
                  </div>
                  {!notif.isRead && (
                    <Button size="sm" variant="ghost" onClick={() => markReadMutation.mutate({ id: notif.id })}>
                      Marquer lu
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
