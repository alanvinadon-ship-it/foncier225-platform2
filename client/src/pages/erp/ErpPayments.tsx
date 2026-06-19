import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useErpPermissions } from "@/hooks/useErpPermissions";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { CreditCard, Trash2, DollarSign, TrendingUp, Calendar } from "lucide-react";

// ============================================================
// CONSTANTS
// ============================================================

const PAYMENT_METHODS = ["virement", "cheque", "especes", "mobile_money", "carte"] as const;

const METHOD_LABELS: Record<string, string> = {
  virement: "Virement", cheque: "Chèque", especes: "Espèces",
  mobile_money: "Mobile Money", carte: "Carte",
};

function formatXOF(amount: number): string {
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "XOF", maximumFractionDigits: 0 }).format(amount);
}

function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString("fr-FR");
}

// ============================================================
// MAIN COMPONENT
// ============================================================

export default function ErpPayments() {
  const { hasPermission } = useErpPermissions();
  const canDelete = hasPermission("erp_finance", "delete");

  const [methodFilter, setMethodFilter] = useState<string>("all");
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);

  const statsQ = trpc.erp.payments.stats.useQuery();
  const listQ = trpc.erp.payments.list.useQuery({
    paymentMethod: methodFilter !== "all" ? methodFilter as any : undefined,
    limit: 50,
  });

  const utils = trpc.useUtils();
  const deleteMut = trpc.erp.payments.delete.useMutation({
    onSuccess: () => { toast.success("Paiement annulé"); utils.erp.payments.invalidate(); utils.erp.invoices.invalidate(); setConfirmDelete(null); },
    onError: (e) => toast.error(e.message),
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Paiements</h1>
        <p className="text-sm text-muted-foreground">Historique et suivi des paiements</p>
      </div>

      {/* Stats */}
      {statsQ.data && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-muted-foreground" />
                <p className="text-xs text-muted-foreground">Total paiements</p>
              </div>
              <p className="text-xl font-bold mt-1">{statsQ.data.totalPayments}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-muted-foreground" />
                <p className="text-xs text-muted-foreground">Montant total</p>
              </div>
              <p className="text-xl font-bold mt-1">{formatXOF(statsQ.data.totalAmount)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
                <p className="text-xs text-muted-foreground">30 derniers jours</p>
              </div>
              <p className="text-xl font-bold mt-1 text-green-600">{formatXOF(statsQ.data.recentAmount)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <p className="text-xs text-muted-foreground">Paiements récents</p>
              </div>
              <p className="text-xl font-bold mt-1">{statsQ.data.recentPayments}</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* By Method breakdown */}
      {statsQ.data && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {Object.entries(statsQ.data.byMethod).filter(([_, v]) => (v as any).count > 0).map(([method, data]) => (
            <Card key={method}>
              <CardContent className="pt-3 pb-3">
                <p className="text-xs text-muted-foreground">{METHOD_LABELS[method] || method}</p>
                <p className="text-sm font-bold">{(data as any).count} paiements</p>
                <p className="text-xs text-muted-foreground">{formatXOF((data as any).amount)}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Filter */}
      <div className="flex gap-3">
        <Select value={methodFilter} onValueChange={setMethodFilter}>
          <SelectTrigger className="w-[200px]"><SelectValue placeholder="Méthode" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes les méthodes</SelectItem>
            {PAYMENT_METHODS.map(m => <SelectItem key={m} value={m}>{METHOD_LABELS[m]}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Payment List */}
      {listQ.isLoading ? (
        <div className="text-center py-8 text-muted-foreground">Chargement...</div>
      ) : (listQ.data?.items || []).length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">Aucun paiement trouvé</div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-4 py-3 text-left font-medium">Date</th>
                <th className="px-4 py-3 text-left font-medium">Facture</th>
                <th className="px-4 py-3 text-left font-medium">Méthode</th>
                <th className="px-4 py-3 text-left font-medium">Référence</th>
                <th className="px-4 py-3 text-right font-medium">Montant</th>
                {canDelete && <th className="px-4 py-3 text-right font-medium">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y">
              {(listQ.data?.items || []).map((payment: any) => (
                <tr key={payment.id} className="hover:bg-muted/30">
                  <td className="px-4 py-3">{formatDate(payment.paymentDate)}</td>
                  <td className="px-4 py-3 font-mono text-xs">
                    {payment.invoice?.invoiceNumber || `#${payment.invoiceId}`}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant="outline">{METHOD_LABELS[payment.paymentMethod] || payment.paymentMethod}</Badge>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{payment.reference || "—"}</td>
                  <td className="px-4 py-3 text-right font-medium">{formatXOF(payment.amount)}</td>
                  {canDelete && (
                    <td className="px-4 py-3 text-right">
                      <Button variant="ghost" size="sm" onClick={() => setConfirmDelete(payment.id)}>
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Confirm Delete Dialog */}
      {confirmDelete !== null && (
        <Dialog open onOpenChange={() => setConfirmDelete(null)}>
          <DialogContent className="max-w-sm">
            <DialogHeader><DialogTitle>Annuler le paiement ?</DialogTitle></DialogHeader>
            <p className="text-sm text-muted-foreground">Cette action est irréversible. Le solde de la facture sera recalculé.</p>
            <DialogFooter>
              <Button variant="outline" onClick={() => setConfirmDelete(null)}>Non</Button>
              <Button variant="destructive" onClick={() => deleteMut.mutate({ id: confirmDelete })} disabled={deleteMut.isPending}>
                {deleteMut.isPending ? "Annulation..." : "Oui, annuler"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
