import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useRoute, Link } from "wouter";
import { toast } from "sonner";
import { ArrowLeft, Building2, Calendar, FileText, Clock, CheckCircle2, Truck, Receipt, CreditCard, XCircle } from "lucide-react";

const STATUS_LABELS: Record<string, string> = {
  received: "Reçu",
  in_progress: "En cours",
  delivered: "Livré",
  invoiced: "Facturé",
  paid: "Payé",
  cancelled: "Annulé",
};

const STATUS_COLORS: Record<string, string> = {
  received: "bg-blue-100 text-blue-800",
  in_progress: "bg-amber-100 text-amber-800",
  delivered: "bg-purple-100 text-purple-800",
  invoiced: "bg-orange-100 text-orange-800",
  paid: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-800",
};

const STATUS_ICONS: Record<string, any> = {
  received: FileText,
  in_progress: Clock,
  delivered: Truck,
  invoiced: Receipt,
  paid: CreditCard,
  cancelled: XCircle,
};

const VALID_TRANSITIONS: Record<string, { status: string; label: string; variant: string }[]> = {
  received: [
    { status: "in_progress", label: "Démarrer", variant: "default" },
    { status: "cancelled", label: "Annuler", variant: "destructive" },
  ],
  in_progress: [
    { status: "delivered", label: "Marquer livré", variant: "default" },
    { status: "cancelled", label: "Annuler", variant: "destructive" },
  ],
  delivered: [
    { status: "invoiced", label: "Facturer", variant: "default" },
    { status: "in_progress", label: "Retour en cours", variant: "outline" },
  ],
  invoiced: [
    { status: "paid", label: "Marquer payé", variant: "default" },
  ],
  paid: [],
  cancelled: [],
};

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("fr-FR").format(amount) + " FCFA";
}

function formatDate(ts: number | null) {
  if (!ts) return "—";
  return new Date(ts).toLocaleDateString("fr-FR");
}

function formatDateTime(ts: number) {
  return new Date(ts).toLocaleString("fr-FR");
}

export default function ErpSalesOrderDetail() {
  const [, params] = useRoute("/erp/sales-orders/:id");
  const orderId = Number(params?.id);
  const [comment, setComment] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [targetStatus, setTargetStatus] = useState("");

  const utils = trpc.useUtils();
  const { data: order, isLoading } = trpc.erp.salesOrders.orders.getById.useQuery({ id: orderId });

  const updateStatusMutation = trpc.erp.salesOrders.orders.updateStatus.useMutation({
    onSuccess: () => {
      toast.success("Statut mis à jour");
      utils.erp.salesOrders.orders.getById.invalidate({ id: orderId });
      setDialogOpen(false);
      setComment("");
    },
    onError: (err) => toast.error(err.message),
  });

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-64 bg-muted rounded" />
          <div className="h-48 bg-muted rounded" />
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="p-6 text-center">
        <p className="text-muted-foreground">Commande introuvable</p>
        <Link href="/erp/sales-orders"><Button variant="outline" className="mt-4">Retour</Button></Link>
      </div>
    );
  }

  const transitions = VALID_TRANSITIONS[order.status] || [];
  const StatusIcon = STATUS_ICONS[order.status] || FileText;

  const handleStatusChange = (newStatus: string) => {
    setTargetStatus(newStatus);
    setDialogOpen(true);
  };

  const confirmStatusChange = () => {
    updateStatusMutation.mutate({
      id: orderId,
      newStatus: targetStatus as any,
      comment: comment || undefined,
    });
  };

  // Workflow steps
  const workflowSteps = ["received", "in_progress", "delivered", "invoiced", "paid"];
  const currentStepIndex = workflowSteps.indexOf(order.status);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <Link href="/erp/sales-orders/list">
            <Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold">{order.orderNumber}</h1>
              <Badge className={STATUS_COLORS[order.status]}>
                <StatusIcon className="h-3 w-3 mr-1" />
                {STATUS_LABELS[order.status]}
              </Badge>
            </div>
            <p className="text-muted-foreground">{order.subject}</p>
          </div>
        </div>
        <div className="flex gap-2">
          {transitions.map(t => (
            <Button
              key={t.status}
              variant={t.variant as any}
              size="sm"
              onClick={() => handleStatusChange(t.status)}
            >
              {t.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Workflow progress */}
      {order.status !== "cancelled" && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              {workflowSteps.map((step, i) => {
                const StepIcon = STATUS_ICONS[step];
                const isCompleted = i <= currentStepIndex;
                const isCurrent = i === currentStepIndex;
                return (
                  <div key={step} className="flex items-center flex-1">
                    <div className={`flex flex-col items-center ${isCurrent ? "scale-110" : ""}`}>
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        isCompleted ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                      }`}>
                        {isCompleted ? <CheckCircle2 className="h-5 w-5" /> : <StepIcon className="h-5 w-5" />}
                      </div>
                      <span className={`text-xs mt-1 ${isCurrent ? "font-bold" : "text-muted-foreground"}`}>
                        {STATUS_LABELS[step]}
                      </span>
                    </div>
                    {i < workflowSteps.length - 1 && (
                      <div className={`flex-1 h-0.5 mx-2 ${i < currentStepIndex ? "bg-primary" : "bg-muted"}`} />
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Lignes */}
          <Card>
            <CardHeader><CardTitle>Lignes de commande</CardTitle></CardHeader>
            <CardContent>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="pb-2 font-medium">#</th>
                    <th className="pb-2 font-medium">Description</th>
                    <th className="pb-2 font-medium text-right">Qté</th>
                    <th className="pb-2 font-medium text-right">PU HT</th>
                    <th className="pb-2 font-medium text-right">Total HT</th>
                  </tr>
                </thead>
                <tbody>
                  {order.lines?.map((line: any) => (
                    <tr key={line.id} className="border-b last:border-0">
                      <td className="py-2 text-muted-foreground">{line.lineNumber}</td>
                      <td className="py-2">{line.description}</td>
                      <td className="py-2 text-right">{line.quantity} {line.unit}</td>
                      <td className="py-2 text-right">{formatCurrency(line.unitPriceHT)}</td>
                      <td className="py-2 text-right font-medium">{formatCurrency(line.totalHT)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t">
                    <td colSpan={4} className="pt-3 text-right font-medium">Total HT</td>
                    <td className="pt-3 text-right font-medium">{formatCurrency(order.totalHT || 0)}</td>
                  </tr>
                  <tr>
                    <td colSpan={4} className="py-1 text-right text-muted-foreground">TVA ({order.taxRate}%)</td>
                    <td className="py-1 text-right text-muted-foreground">{formatCurrency((order.totalTTC || 0) - (order.totalHT || 0))}</td>
                  </tr>
                  <tr className="text-lg">
                    <td colSpan={4} className="pt-2 text-right font-bold">Total TTC</td>
                    <td className="pt-2 text-right font-bold">{formatCurrency(order.totalTTC || 0)}</td>
                  </tr>
                </tfoot>
              </table>
            </CardContent>
          </Card>

          {/* Historique */}
          <Card>
            <CardHeader><CardTitle>Historique</CardTitle></CardHeader>
            <CardContent>
              {order.history?.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">Aucun historique</p>
              ) : (
                <div className="space-y-3">
                  {order.history?.map((h: any) => (
                    <div key={h.id} className="flex items-start gap-3 text-sm">
                      <div className="w-2 h-2 rounded-full bg-primary mt-2 shrink-0" />
                      <div>
                        <p>
                          <Badge variant="outline" className="mr-2">{STATUS_LABELS[h.fromStatus] || "—"}</Badge>
                          →
                          <Badge className={`ml-2 ${STATUS_COLORS[h.toStatus]}`}>{STATUS_LABELS[h.toStatus]}</Badge>
                        </p>
                        {h.comment && <p className="text-muted-foreground mt-1">{h.comment}</p>}
                        <p className="text-xs text-muted-foreground mt-1">{formatDateTime(h.changedAt)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle className="text-base">Client</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">{order.client?.name}</span>
              </div>
              <p className="text-sm text-muted-foreground">Code: {order.client?.code}</p>
              {order.client?.contactName && <p className="text-sm">Contact: {order.client.contactName}</p>}
              {order.client?.contactEmail && <p className="text-sm">{order.client.contactEmail}</p>}
              {order.client?.contactPhone && <p className="text-sm">{order.client.contactPhone}</p>}
              {order.clientRef && (
                <div className="pt-2 border-t">
                  <p className="text-sm text-muted-foreground">Réf. BC client</p>
                  <p className="font-mono">{order.clientRef}</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Dates</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Date BC</span>
                <span>{formatDate(order.orderDate)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Livraison prévue</span>
                <span>{formatDate(order.expectedDeliveryDate)}</span>
              </div>
              {order.deliveredDate && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Livré le</span>
                  <span>{formatDate(order.deliveredDate)}</span>
                </div>
              )}
              {order.paidDate && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Payé le</span>
                  <span>{formatDate(order.paidDate)}</span>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Paiement</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Statut</span>
                <Badge variant={order.paymentStatus === "paid" ? "default" : "outline"}>
                  {order.paymentStatus === "paid" ? "Payé" : order.paymentStatus === "partial" ? "Partiel" : "En attente"}
                </Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Montant payé</span>
                <span className="font-medium">{formatCurrency(order.paidAmount || 0)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Reste à payer</span>
                <span className="font-medium text-amber-600">{formatCurrency((order.totalTTC || 0) - (order.paidAmount || 0))}</span>
              </div>
            </CardContent>
          </Card>

          {order.notes && (
            <Card>
              <CardHeader><CardTitle className="text-base">Notes</CardTitle></CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{order.notes}</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Dialog changement de statut */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Changer le statut → {STATUS_LABELS[targetStatus]}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Commentaire (optionnel)</label>
              <Textarea
                value={comment}
                onChange={e => setComment(e.target.value)}
                placeholder="Ajouter un commentaire..."
                rows={3}
              />
            </div>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Annuler</Button>
              <Button onClick={confirmStatusChange} disabled={updateStatusMutation.isPending}>
                {updateStatusMutation.isPending ? "..." : "Confirmer"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
