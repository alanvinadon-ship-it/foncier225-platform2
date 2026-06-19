import { useState, useRef, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Bell, CheckCheck, Mail, MailOpen } from "lucide-react";
import { Link } from "wouter";

const PRIORITY_COLORS: Record<string, string> = {
  low: "bg-slate-100 text-slate-700",
  medium: "bg-yellow-100 text-yellow-800",
  high: "bg-orange-100 text-orange-800",
  critical: "bg-red-100 text-red-800",
};

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const { data: unreadData } = trpc.erp.notifications.unreadCount.useQuery(undefined, {
    refetchInterval: 30000, // Poll every 30s
  });
  const { data: unreadNotifs } = trpc.erp.notifications.unread.useQuery({ limit: 10 }, {
    enabled: open,
  });
  const markReadMutation = trpc.erp.notifications.markRead.useMutation();
  const markAllReadMutation = trpc.erp.notifications.markAllRead.useMutation();

  const utils = trpc.useUtils();

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const handleMarkRead = async (id: number) => {
    await markReadMutation.mutateAsync({ id });
    utils.erp.notifications.unreadCount.invalidate();
    utils.erp.notifications.unread.invalidate();
  };

  const handleMarkAllRead = async () => {
    await markAllReadMutation.mutateAsync();
    utils.erp.notifications.unreadCount.invalidate();
    utils.erp.notifications.unread.invalidate();
  };

  const count = unreadData?.count || 0;

  const formatDate = (ts: number) => {
    const diff = Date.now() - ts;
    if (diff < 60000) return "À l'instant";
    if (diff < 3600000) return `Il y a ${Math.floor(diff / 60000)} min`;
    if (diff < 86400000) return `Il y a ${Math.floor(diff / 3600000)}h`;
    return new Date(ts).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" });
  };

  return (
    <div className="relative" ref={ref}>
      <Button variant="ghost" size="icon" className="relative" onClick={() => setOpen(!open)}>
        <Bell className="h-5 w-5" />
        {count > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-medium">
            {count > 99 ? "99+" : count}
          </span>
        )}
      </Button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-96 bg-background border rounded-lg shadow-lg z-50 max-h-[480px] overflow-hidden flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b">
            <span className="font-semibold text-sm">Notifications</span>
            <div className="flex items-center gap-2">
              {count > 0 && (
                <Button variant="ghost" size="sm" className="text-xs h-7" onClick={handleMarkAllRead}>
                  <CheckCheck className="h-3 w-3 mr-1" />
                  Tout lire
                </Button>
              )}
            </div>
          </div>

          {/* List */}
          <div className="overflow-y-auto flex-1">
            {!unreadNotifs?.notifications.length ? (
              <div className="py-8 text-center text-sm text-muted-foreground">
                Aucune notification non lue
              </div>
            ) : (
              unreadNotifs.notifications.map((notif) => (
                <div
                  key={notif.id}
                  className="px-4 py-3 border-b last:border-b-0 hover:bg-muted/50 cursor-pointer"
                  onClick={() => handleMarkRead(notif.id)}
                >
                  <div className="flex items-start gap-2">
                    <Mail className="h-4 w-4 text-blue-600 mt-0.5 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-medium truncate">{notif.title}</span>
                        <Badge className={`text-[10px] px-1.5 py-0 ${PRIORITY_COLORS[notif.priority]}`}>{notif.priority}</Badge>
                      </div>
                      {notif.message && <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{notif.message}</p>}
                      <p className="text-[11px] text-muted-foreground mt-1">{formatDate(notif.createdAt)}</p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="border-t px-4 py-2">
            <Link href="/erp/notifications" onClick={() => setOpen(false)}>
              <Button variant="ghost" size="sm" className="w-full text-xs">
                Voir toutes les notifications
              </Button>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
