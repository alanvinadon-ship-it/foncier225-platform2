import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { useErpPermissions } from "@/hooks/useErpPermissions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Plus, Search, FileText, AlertTriangle, CheckCircle, XCircle, CreditCard, Eye, Trash2, Send, ThumbsUp, ThumbsDown, Download } from "lucide-react";

// ============================================================
// CONSTANTS
// ============================================================

const INVOICE_STATUSES = ["draft", "submitted", "approved", "partially_paid", "paid", "overdue", "rejected", "cancelled"] as const;
const INVOICE_TYPES = ["standard", "credit_note", "proforma"] as const;
const PAYMENT_METHODS = ["virement", "cheque", "especes", "mobile_money", "carte"] as const;

const STATUS_LABELS: Record<string, string> = {
  draft: "Brouillon", submitted: "Soumise", approved: "Approuvée",
  partially_paid: "Part. payée", paid: "Payée", overdue: "En retard",
  rejected: "Rejetée", cancelled: "Annulée",
};

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-gray-100 text-gray-800", submitted: "bg-blue-100 text-blue-800",
  approved: "bg-green-100 text-green-800", partially_paid: "bg-yellow-100 text-yellow-800",
  paid: "bg-emerald-100 text-emerald-800", overdue: "bg-red-100 text-red-800",
  rejected: "bg-red-100 text-red-800", cancelled: "bg-gray-100 text-gray-800",
};

const TYPE_LABELS: Record<string, string> = {
  standard: "Standard", credit_note: "Avoir", proforma: "Proforma",
};

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

export default function ErpInvoices() {
  const { hasPermission } = useErpPermissions();
  const canCreate = hasPermission("erp_finance", "create");
  const canApprove = hasPermission("erp_finance", "approve");
  const canDelete = hasPermission("erp_finance", "delete");

  const [tab, setTab] = useState("all");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [showCreate, setShowCreate] = useState(false);
  const [showDetail, setShowDetail] = useState<number | null>(null);
  const [showPayment, setShowPayment] = useState<number | null>(null);
  const [showReject, setShowReject] = useState<number | null>(null);

  // Queries
  const statsQ = trpc.erp.invoices.stats.useQuery();
  const listQ = trpc.erp.invoices.list.useQuery({
    search: search || undefined,
    status: statusFilter !== "all" ? statusFilter as any : undefined,
    limit: 50,
  });
  const overdueQ = trpc.erp.invoices.overdue.useQuery({ limit: 50 });
  const unpaidQ = trpc.erp.invoices.unpaid.useQuery({ limit: 50 });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Factures</h1>
          <p className="text-sm text-muted-foreground">Gestion des factures et paiements</p>
        </div>
        {canCreate && (
          <Button onClick={() => setShowCreate(true)}>
            <Plus className="mr-2 h-4 w-4" /> Nouvelle facture
          </Button>
        )}
      </div>

      {/* Stats */}
      {statsQ.data && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card>
            <CardContent className="pt-4">
              <p className="text-xs text-muted-foreground">Total factures</p>
              <p className="text-xl font-bold">{statsQ.data.totalInvoices}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <p className="text-xs text-muted-foreground">Montant total</p>
              <p className="text-xl font-bold">{formatXOF(statsQ.data.totalAmount)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <p className="text-xs text-muted-foreground">Payé</p>
              <p className="text-xl font-bold text-green-600">{formatXOF(statsQ.data.totalPaid)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <p className="text-xs text-muted-foreground">Solde dû</p>
              <p className="text-xl font-bold text-orange-600">{formatXOF(statsQ.data.totalDue)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <p className="text-xs text-muted-foreground">En retard</p>
              <p className="text-xl font-bold text-red-600">{statsQ.data.overdueCount}</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tabs */}
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="all">Toutes</TabsTrigger>
          <TabsTrigger value="overdue">En retard</TabsTrigger>
          <TabsTrigger value="unpaid">Impayées</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4">
          {/* Filters */}
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Rechercher par numéro ou référence..." className="pl-9"
                value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]"><SelectValue placeholder="Statut" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les statuts</SelectItem>
                {INVOICE_STATUSES.map(s => (
                  <SelectItem key={s} value={s}>{STATUS_LABELS[s]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Invoice List */}
          <InvoiceTable
            items={listQ.data?.items || []}
            isLoading={listQ.isLoading}
            onView={(id) => setShowDetail(id)}
            onPay={(id) => setShowPayment(id)}
            canApprove={canApprove}
            canDelete={canDelete}
          />
        </TabsContent>

        <TabsContent value="overdue">
          <InvoiceTable
            items={overdueQ.data?.items || []}
            isLoading={overdueQ.isLoading}
            onView={(id) => setShowDetail(id)}
            onPay={(id) => setShowPayment(id)}
            canApprove={canApprove}
            canDelete={canDelete}
          />
        </TabsContent>

        <TabsContent value="unpaid">
          <InvoiceTable
            items={unpaidQ.data?.items || []}
            isLoading={unpaidQ.isLoading}
            onView={(id) => setShowDetail(id)}
            onPay={(id) => setShowPayment(id)}
            canApprove={canApprove}
            canDelete={canDelete}
          />
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      {showCreate && <CreateInvoiceDialog open onClose={() => setShowCreate(false)} />}
      {showDetail !== null && <InvoiceDetailDialog id={showDetail} open onClose={() => setShowDetail(null)} canApprove={canApprove} onReject={(id) => { setShowDetail(null); setShowReject(id); }} onPay={(id) => { setShowDetail(null); setShowPayment(id); }} />}
      {showPayment !== null && <AddPaymentDialog invoiceId={showPayment} open onClose={() => setShowPayment(null)} />}
      {showReject !== null && <RejectDialog invoiceId={showReject} open onClose={() => setShowReject(null)} />}
    </div>
  );
}

// ============================================================
// INVOICE TABLE
// ============================================================

function InvoiceTable({ items, isLoading, onView, onPay, canApprove, canDelete }: {
  items: any[];
  isLoading: boolean;
  onView: (id: number) => void;
  onPay: (id: number) => void;
  canApprove: boolean;
  canDelete: boolean;
}) {
  const utils = trpc.useUtils();
  const submitMut = trpc.erp.invoices.submit.useMutation({
    onSuccess: () => { toast.success("Facture soumise"); utils.erp.invoices.invalidate(); },
    onError: (e) => toast.error(e.message),
  });
  const approveMut = trpc.erp.invoices.approve.useMutation({
    onSuccess: () => { toast.success("Facture approuvée"); utils.erp.invoices.invalidate(); },
    onError: (e) => toast.error(e.message),
  });
  const deleteMut = trpc.erp.invoices.delete.useMutation({
    onSuccess: () => { toast.success("Facture supprimée"); utils.erp.invoices.invalidate(); },
    onError: (e) => toast.error(e.message),
  });

  if (isLoading) return <div className="text-center py-8 text-muted-foreground">Chargement...</div>;
  if (items.length === 0) return <div className="text-center py-8 text-muted-foreground">Aucune facture trouvée</div>;

  return (
    <div className="border rounded-lg overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-muted/50">
          <tr>
            <th className="px-4 py-3 text-left font-medium">N° Facture</th>
            <th className="px-4 py-3 text-left font-medium">Type</th>
            <th className="px-4 py-3 text-left font-medium">Statut</th>
            <th className="px-4 py-3 text-right font-medium">Montant TTC</th>
            <th className="px-4 py-3 text-right font-medium">Payé</th>
            <th className="px-4 py-3 text-left font-medium">Échéance</th>
            <th className="px-4 py-3 text-right font-medium">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {items.map((inv: any) => (
            <tr key={inv.id} className="hover:bg-muted/30">
              <td className="px-4 py-3 font-mono text-xs">{inv.invoiceNumber}</td>
              <td className="px-4 py-3">{TYPE_LABELS[inv.type] || inv.type}</td>
              <td className="px-4 py-3">
                <Badge className={STATUS_COLORS[inv.status] || ""}>{STATUS_LABELS[inv.status] || inv.status}</Badge>
              </td>
              <td className="px-4 py-3 text-right font-medium">{formatXOF(inv.totalAmount)}</td>
              <td className="px-4 py-3 text-right">{formatXOF(inv.paidAmount)}</td>
              <td className="px-4 py-3">
                <span className={inv.dueDate < Date.now() && !["paid", "cancelled", "rejected"].includes(inv.status) ? "text-red-600 font-medium" : ""}>
                  {formatDate(inv.dueDate)}
                </span>
              </td>
              <td className="px-4 py-3 text-right">
                <div className="flex gap-1 justify-end">
                  <Button variant="ghost" size="sm" onClick={() => onView(inv.id)}><Eye className="h-4 w-4" /></Button>
                  {inv.status === "draft" && (
                    <Button variant="ghost" size="sm" onClick={() => submitMut.mutate({ id: inv.id })}><Send className="h-4 w-4" /></Button>
                  )}
                  {inv.status === "submitted" && canApprove && (
                    <Button variant="ghost" size="sm" onClick={() => approveMut.mutate({ id: inv.id })}><ThumbsUp className="h-4 w-4 text-green-600" /></Button>
                  )}
                  {["approved", "partially_paid", "overdue"].includes(inv.status) && (
                    <Button variant="ghost" size="sm" onClick={() => onPay(inv.id)}><CreditCard className="h-4 w-4 text-blue-600" /></Button>
                  )}
                  {["draft", "rejected", "cancelled"].includes(inv.status) && canDelete && (
                    <Button variant="ghost" size="sm" onClick={() => deleteMut.mutate({ id: inv.id })}><Trash2 className="h-4 w-4 text-red-600" /></Button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ============================================================
// CREATE INVOICE DIALOG
// ============================================================

function CreateInvoiceDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const utils = trpc.useUtils();
  const [form, setForm] = useState({
    invoiceNumber: `FAC-${Date.now().toString(36).toUpperCase()}`,
    type: "standard" as typeof INVOICE_TYPES[number],
    issueDate: Date.now(),
    dueDate: Date.now() + 30 * 24 * 60 * 60 * 1000,
    taxRate: 1800,
    notes: "",
  });

  const createMut = trpc.erp.invoices.create.useMutation({
    onSuccess: () => { toast.success("Facture créée"); utils.erp.invoices.invalidate(); onClose(); },
    onError: (e) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Nouvelle facture</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium">N° Facture</label>
            <Input value={form.invoiceNumber} onChange={(e) => setForm({ ...form, invoiceNumber: e.target.value })} />
          </div>
          <div>
            <label className="text-sm font-medium">Type</label>
            <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v as any })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {INVOICE_TYPES.map(t => <SelectItem key={t} value={t}>{TYPE_LABELS[t]}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">Date émission</label>
              <Input type="date" value={new Date(form.issueDate).toISOString().split("T")[0]}
                onChange={(e) => setForm({ ...form, issueDate: new Date(e.target.value).getTime() })} />
            </div>
            <div>
              <label className="text-sm font-medium">Date échéance</label>
              <Input type="date" value={new Date(form.dueDate).toISOString().split("T")[0]}
                onChange={(e) => setForm({ ...form, dueDate: new Date(e.target.value).getTime() })} />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium">Taux TVA (%)</label>
            <Input type="number" value={form.taxRate / 100} onChange={(e) => setForm({ ...form, taxRate: Math.round(parseFloat(e.target.value) * 100) })} />
          </div>
          <div>
            <label className="text-sm font-medium">Notes</label>
            <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Annuler</Button>
          <Button onClick={() => createMut.mutate(form)} disabled={createMut.isPending}>
            {createMut.isPending ? "Création..." : "Créer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================
// INVOICE DETAIL DIALOG
// ============================================================

function InvoiceDetailDialog({ id, open, onClose, canApprove, onReject, onPay }: {
  id: number; open: boolean; onClose: () => void; canApprove: boolean;
  onReject: (id: number) => void; onPay: (id: number) => void;
}) {
  const utils = trpc.useUtils();
  const detailQ = trpc.erp.invoices.getById.useQuery({ id });
  const [showAddLine, setShowAddLine] = useState(false);
  const [lineForm, setLineForm] = useState({ description: "", quantity: 100, unitPrice: 0, taxRate: 1800 });

  const addLineMut = trpc.erp.invoices.addLine.useMutation({
    onSuccess: () => { toast.success("Ligne ajoutée"); utils.erp.invoices.invalidate(); setShowAddLine(false); setLineForm({ description: "", quantity: 100, unitPrice: 0, taxRate: 1800 }); },
    onError: (e) => toast.error(e.message),
  });
  const deleteLineMut = trpc.erp.invoices.deleteLine.useMutation({
    onSuccess: () => { toast.success("Ligne supprimée"); utils.erp.invoices.invalidate(); },
    onError: (e) => toast.error(e.message),
  });
  const submitMut = trpc.erp.invoices.submit.useMutation({
    onSuccess: () => { toast.success("Facture soumise"); utils.erp.invoices.invalidate(); },
    onError: (e) => toast.error(e.message),
  });
  const approveMut = trpc.erp.invoices.approve.useMutation({
    onSuccess: () => { toast.success("Facture approuvée"); utils.erp.invoices.invalidate(); },
    onError: (e) => toast.error(e.message),
  });

  if (!detailQ.data) return null;
  const inv = detailQ.data;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <FileText className="h-5 w-5" />
            Facture {inv.invoiceNumber}
            <Badge className={STATUS_COLORS[inv.status]}>{STATUS_LABELS[inv.status]}</Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Info */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div><span className="text-muted-foreground">Type:</span> {TYPE_LABELS[inv.type]}</div>
            <div><span className="text-muted-foreground">Émission:</span> {formatDate(inv.issueDate)}</div>
            <div><span className="text-muted-foreground">Échéance:</span> {formatDate(inv.dueDate)}</div>
            <div><span className="text-muted-foreground">Devise:</span> {inv.currency}</div>
            {inv.projectName && <div><span className="text-muted-foreground">Projet:</span> {inv.projectName}</div>}
            {inv.vendorName && <div><span className="text-muted-foreground">Fournisseur:</span> {inv.vendorName}</div>}
            {inv.contractorName && <div><span className="text-muted-foreground">Entrepreneur:</span> {inv.contractorName}</div>}
          </div>

          {/* Lines */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold">Lignes de facture</h3>
              {inv.status === "draft" && (
                <Button size="sm" variant="outline" onClick={() => setShowAddLine(true)}>
                  <Plus className="mr-1 h-3 w-3" /> Ajouter
                </Button>
              )}
            </div>
            {inv.lines.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucune ligne</p>
            ) : (
              <table className="w-full text-sm border rounded">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-3 py-2 text-left">Description</th>
                    <th className="px-3 py-2 text-right">Qté</th>
                    <th className="px-3 py-2 text-right">P.U.</th>
                    <th className="px-3 py-2 text-right">HT</th>
                    <th className="px-3 py-2 text-right">TVA</th>
                    <th className="px-3 py-2 text-right">TTC</th>
                    {inv.status === "draft" && <th className="px-3 py-2"></th>}
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {inv.lines.map((line: any) => (
                    <tr key={line.id}>
                      <td className="px-3 py-2">{line.description}</td>
                      <td className="px-3 py-2 text-right">{(line.quantity / 100).toFixed(2)}</td>
                      <td className="px-3 py-2 text-right">{formatXOF(line.unitPrice)}</td>
                      <td className="px-3 py-2 text-right">{formatXOF(line.amount)}</td>
                      <td className="px-3 py-2 text-right">{formatXOF(line.taxAmount)}</td>
                      <td className="px-3 py-2 text-right font-medium">{formatXOF(line.totalAmount)}</td>
                      {inv.status === "draft" && (
                        <td className="px-3 py-2 text-right">
                          <Button variant="ghost" size="sm" onClick={() => deleteLineMut.mutate({ lineId: line.id })}>
                            <Trash2 className="h-3 w-3 text-red-500" />
                          </Button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-muted/30 font-medium">
                  <tr>
                    <td colSpan={3} className="px-3 py-2 text-right">Totaux:</td>
                    <td className="px-3 py-2 text-right">{formatXOF(inv.subtotal)}</td>
                    <td className="px-3 py-2 text-right">{formatXOF(inv.taxAmount)}</td>
                    <td className="px-3 py-2 text-right">{formatXOF(inv.totalAmount)}</td>
                    {inv.status === "draft" && <td></td>}
                  </tr>
                </tfoot>
              </table>
            )}

            {/* Add line form */}
            {showAddLine && (
              <div className="mt-3 p-3 border rounded space-y-3">
                <Input placeholder="Description" value={lineForm.description} onChange={(e) => setLineForm({ ...lineForm, description: e.target.value })} />
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="text-xs">Quantité</label>
                    <Input type="number" value={lineForm.quantity / 100} onChange={(e) => setLineForm({ ...lineForm, quantity: Math.round(parseFloat(e.target.value) * 100) })} />
                  </div>
                  <div>
                    <label className="text-xs">Prix unitaire (XOF)</label>
                    <Input type="number" value={lineForm.unitPrice} onChange={(e) => setLineForm({ ...lineForm, unitPrice: parseInt(e.target.value) || 0 })} />
                  </div>
                  <div>
                    <label className="text-xs">TVA (%)</label>
                    <Input type="number" value={lineForm.taxRate / 100} onChange={(e) => setLineForm({ ...lineForm, taxRate: Math.round(parseFloat(e.target.value) * 100) })} />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => addLineMut.mutate({ invoiceId: id, ...lineForm })} disabled={addLineMut.isPending}>Ajouter</Button>
                  <Button size="sm" variant="outline" onClick={() => setShowAddLine(false)}>Annuler</Button>
                </div>
              </div>
            )}
          </div>

          {/* Payments */}
          {inv.payments.length > 0 && (
            <div>
              <h3 className="font-semibold mb-2">Paiements ({inv.payments.length})</h3>
              <div className="space-y-2">
                {inv.payments.map((p: any) => (
                  <div key={p.id} className="flex items-center justify-between p-2 border rounded text-sm">
                    <div>
                      <span className="font-medium">{formatXOF(p.amount)}</span>
                      <span className="text-muted-foreground ml-2">{METHOD_LABELS[p.paymentMethod] || p.paymentMethod}</span>
                      {p.reference && <span className="text-muted-foreground ml-2">Réf: {p.reference}</span>}
                    </div>
                    <span className="text-muted-foreground">{formatDate(p.paymentDate)}</span>
                  </div>
                ))}
              </div>
              <div className="mt-2 text-sm">
                <span className="text-muted-foreground">Solde dû: </span>
                <span className="font-bold text-orange-600">{formatXOF(inv.totalAmount - inv.paidAmount)}</span>
              </div>
            </div>
          )}

          {/* Notes */}
          {inv.notes && (
            <div>
              <h3 className="font-semibold mb-1">Notes</h3>
              <p className="text-sm text-muted-foreground">{inv.notes}</p>
            </div>
          )}

          {/* Rejection reason */}
          {inv.rejectionReason && (
            <div className="p-3 bg-red-50 border border-red-200 rounded">
              <p className="text-sm font-medium text-red-800">Motif de rejet:</p>
              <p className="text-sm text-red-700">{inv.rejectionReason}</p>
            </div>
          )}
        </div>

        <DialogFooter className="flex gap-2">
          <GeneratePdfButton invoiceId={id} />
          {inv.status === "draft" && (
            <Button onClick={() => submitMut.mutate({ id })} disabled={submitMut.isPending}>
              <Send className="mr-2 h-4 w-4" /> Soumettre
            </Button>
          )}
          {inv.status === "submitted" && canApprove && (
            <>
              <Button onClick={() => approveMut.mutate({ id })} disabled={approveMut.isPending} className="bg-green-600 hover:bg-green-700">
                <ThumbsUp className="mr-2 h-4 w-4" /> Approuver
              </Button>
              <Button variant="destructive" onClick={() => onReject(id)}>
                <ThumbsDown className="mr-2 h-4 w-4" /> Rejeter
              </Button>
            </>
          )}
          {["approved", "partially_paid", "overdue"].includes(inv.status) && (
            <Button onClick={() => onPay(id)}>
              <CreditCard className="mr-2 h-4 w-4" /> Enregistrer un paiement
            </Button>
          )}
          <Button variant="outline" onClick={onClose}>Fermer</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================
// ADD PAYMENT DIALOG
// ============================================================

function AddPaymentDialog({ invoiceId, open, onClose }: { invoiceId: number; open: boolean; onClose: () => void }) {
  const utils = trpc.useUtils();
  const [form, setForm] = useState({
    amount: 0,
    paymentDate: Date.now(),
    paymentMethod: "virement" as typeof PAYMENT_METHODS[number],
    reference: "",
    notes: "",
  });

  const createMut = trpc.erp.payments.create.useMutation({
    onSuccess: () => { toast.success("Paiement enregistré"); utils.erp.invoices.invalidate(); utils.erp.payments.invalidate(); onClose(); },
    onError: (e) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Enregistrer un paiement</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium">Montant (XOF)</label>
            <Input type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: parseInt(e.target.value) || 0 })} />
          </div>
          <div>
            <label className="text-sm font-medium">Date de paiement</label>
            <Input type="date" value={new Date(form.paymentDate).toISOString().split("T")[0]}
              onChange={(e) => setForm({ ...form, paymentDate: new Date(e.target.value).getTime() })} />
          </div>
          <div>
            <label className="text-sm font-medium">Méthode</label>
            <Select value={form.paymentMethod} onValueChange={(v) => setForm({ ...form, paymentMethod: v as any })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {PAYMENT_METHODS.map(m => <SelectItem key={m} value={m}>{METHOD_LABELS[m]}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-sm font-medium">Référence</label>
            <Input value={form.reference} onChange={(e) => setForm({ ...form, reference: e.target.value })} placeholder="N° chèque, réf. virement..." />
          </div>
          <div>
            <label className="text-sm font-medium">Notes</label>
            <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Annuler</Button>
          <Button onClick={() => createMut.mutate({ invoiceId, ...form })} disabled={createMut.isPending || form.amount <= 0}>
            {createMut.isPending ? "Enregistrement..." : "Enregistrer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================
// REJECT DIALOG
// ============================================================

function RejectDialog({ invoiceId, open, onClose }: { invoiceId: number; open: boolean; onClose: () => void }) {
  const utils = trpc.useUtils();
  const [reason, setReason] = useState("");

  const rejectMut = trpc.erp.invoices.reject.useMutation({
    onSuccess: () => { toast.success("Facture rejetée"); utils.erp.invoices.invalidate(); onClose(); },
    onError: (e) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Rejeter la facture</DialogTitle></DialogHeader>
        <div>
          <label className="text-sm font-medium">Motif de rejet</label>
          <Textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Expliquez la raison du rejet..." rows={4} />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Annuler</Button>
          <Button variant="destructive" onClick={() => rejectMut.mutate({ id: invoiceId, reason })} disabled={rejectMut.isPending || !reason.trim()}>
            {rejectMut.isPending ? "Rejet..." : "Rejeter"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}


// --- Bouton Génération PDF Facture Normalisée ---
function GeneratePdfButton({ invoiceId }: { invoiceId: number }) {
  const generatePdf = trpc.erp.invoices.generatePdf.useMutation({
    onSuccess: (data) => {
      toast.success("PDF généré avec succès");
      // Ouvrir le PDF dans un nouvel onglet
      window.open(data.url, "_blank");
    },
    onError: (e) => toast.error(`Erreur PDF : ${e.message}`),
  });

  return (
    <Button
      variant="outline"
      onClick={() => generatePdf.mutate({ invoiceId })}
      disabled={generatePdf.isPending}
    >
      <Download className="mr-2 h-4 w-4" />
      {generatePdf.isPending ? "Génération..." : "PDF Normalisé"}
    </Button>
  );
}
