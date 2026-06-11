import { useState } from "react";
import { Bell, Check, CheckCheck, ExternalLink } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Link } from "wouter";

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const { data: unreadCount } = trpc.citizen.unreadNotificationsCount.useQuery(undefined, {
    refetchInterval: 30000, // Poll every 30s
  });
  const { data: notifications, refetch } = trpc.citizen.notifications.useQuery(
    { limit: 10, offset: 0 },
    { enabled: open }
  );
  const markRead = trpc.citizen.markNotificationRead.useMutation({
    onSuccess: () => refetch(),
  });
  const markAllRead = trpc.citizen.markAllNotificationsRead.useMutation({
    onSuccess: () => refetch(),
  });

  const count = unreadCount ?? 0;

  const getModuleLink = (n: { relatedModule: string; relatedEntityId: number | null }) => {
    if (!n.relatedEntityId) return null;
    if (n.relatedModule === "land_title") return `/citizen/land-title/${n.relatedEntityId}`;
    if (n.relatedModule === "credit") return `/citizen/credit-habitat/${n.relatedEntityId}`;
    return null;
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {count > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground">
              {count > 99 ? "99+" : count}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <h4 className="text-sm font-semibold">Notifications</h4>
          {count > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="text-xs h-7"
              onClick={() => markAllRead.mutate()}
            >
              <CheckCheck className="h-3 w-3 mr-1" />
              Tout lire
            </Button>
          )}
        </div>
        <div className="max-h-80 overflow-y-auto">
          {!notifications || notifications.length === 0 ? (
            <div className="p-6 text-center text-sm text-muted-foreground">
              Aucune notification
            </div>
          ) : (
            notifications.map((n) => {
              const link = getModuleLink(n);
              return (
                <div
                  key={n.id}
                  className={`flex items-start gap-3 px-4 py-3 border-b last:border-0 transition-colors ${
                    !n.isRead ? "bg-accent/30" : ""
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{n.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                      {n.message}
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-1">
                      {new Date(n.createdAt).toLocaleString("fr-CI")}
                    </p>
                  </div>
                  <div className="flex flex-col gap-1 shrink-0">
                    {!n.isRead && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => markRead.mutate({ id: n.id })}
                      >
                        <Check className="h-3 w-3" />
                      </Button>
                    )}
                    {link && (
                      <Link href={link} onClick={() => setOpen(false)}>
                        <Button variant="ghost" size="icon" className="h-6 w-6">
                          <ExternalLink className="h-3 w-3" />
                        </Button>
                      </Link>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
