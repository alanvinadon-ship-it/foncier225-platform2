import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { trpc } from "@/lib/trpc";
import { Shield } from "lucide-react";

export default function AuditAdmin() {
  const { data: events, isLoading } = trpc.admin.listAuditEvents.useQuery();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Shield className="h-6 w-6 text-red-500" />
          Journal d'audit
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Traçabilité complète de toutes les actions sensibles sur la plateforme
        </p>
      </div>

      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Action</TableHead>
              <TableHead>Rôle</TableHead>
              <TableHead>Cible</TableHead>
              <TableHead>Détails</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 8 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 5 }).map((_, j) => (
                    <TableCell key={j}><Skeleton className="h-5 w-20" /></TableCell>
                  ))}
                </TableRow>
              ))
            ) : events && events.length > 0 ? (
              events.map((evt: any) => (
                <TableRow key={evt.id}>
                  <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                    {new Date(evt.createdAt).toLocaleString("fr-FR")}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="text-xs font-mono">
                      {evt.action}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm">{evt.actorRole || "—"}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {evt.targetType ? `${evt.targetType}#${evt.targetId}` : "—"}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground max-w-xs truncate">
                    {evt.details ? JSON.stringify(evt.details).slice(0, 80) : "—"}
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                  Aucun événement d'audit enregistré
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
