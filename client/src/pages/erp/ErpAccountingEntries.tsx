import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus } from "lucide-react";
import { toast } from "sonner";

export default function ErpAccountingEntries() {
  const [open, setOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [page, setPage] = useState(0);

  const { data, isLoading, refetch } = trpc.erp.fullAccounting.entries.list.useQuery({ status: statusFilter === "all" ? undefined : statusFilter, limit: 50, offset: page * 50 });
  const { data: journalsData } = trpc.erp.fullAccounting.journals.list.useQuery({});

  const createMutation = trpc.erp.fullAccounting.entries.create.useMutation({
    onSuccess: () => { toast.success("Écriture créée"); setOpen(false); refetch(); },
    onError: (e) => toast.error(e.message),
  });
  const postMutation = trpc.erp.fullAccounting.entries.post.useMutation({
    onSuccess: () => { toast.success("Écriture validée"); refetch(); },
    onError: (e) => toast.error(e.message),
  });

  const [form, setForm] = useState({ journalId: 0, fiscalYearId: 1, periodId: 1, entryDate: Date.now(), description: "", reference: "", lines: [{ accountingAccountId: 0, debitAmount: 0, creditAmount: 0, label: "" }, { accountingAccountId: 0, debitAmount: 0, creditAmount: 0, label: "" }] as { accountingAccountId: number; debitAmount?: number; creditAmount?: number; label?: string }[] });

  const entries = data?.entries || [];
  const total = data?.total || 0;
  const journals = journalsData || [];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Écritures Comptables</h1>
          <p className="text-muted-foreground">{total} écritures</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" /> Nouvelle Écriture</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Créer une Écriture</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Journal</Label>
                <Select value={form.journalId ? String(form.journalId) : ""} onValueChange={v => setForm(f => ({ ...f, journalId: parseInt(v) }))}>
                  <SelectTrigger><SelectValue placeholder="Sélectionner un journal" /></SelectTrigger>
                  <SelectContent>{journals.map((j: any) => <SelectItem key={j.id} value={String(j.id)}>{j.code} — {j.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Description</Label><Input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Libellé de l'écriture" /></div>
              <div><Label>Référence</Label><Input value={form.reference} onChange={e => setForm(f => ({ ...f, reference: e.target.value }))} placeholder="Référence pièce" /></div>
              <p className="text-xs text-muted-foreground">Les lignes d'écriture (débit/crédit) seront ajoutées après création.</p>
              <Button className="w-full" onClick={() => createMutation.mutate(form)} disabled={createMutation.isPending || !form.journalId || form.lines.some(l => !l.accountingAccountId)}>
                {createMutation.isPending ? "Création..." : "Créer l'écriture"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex gap-2">
        {["all", "draft", "posted", "cancelled"].map(s => (
          <Button key={s} variant={statusFilter === s ? "default" : "outline"} size="sm" onClick={() => { setStatusFilter(s); setPage(0); }}>
            {s === "all" ? "Toutes" : s === "draft" ? "Brouillons" : s === "posted" ? "Validées" : "Annulées"}
          </Button>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-16 bg-muted rounded animate-pulse" />)}</div>
      ) : entries.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">Aucune écriture trouvée</CardContent></Card>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="text-left py-3 px-3">N° Écriture</th>
                <th className="text-left py-3 px-3">Date</th>
                <th className="text-left py-3 px-3">Description</th>
                <th className="text-center py-3 px-3">Statut</th>
                <th className="text-right py-3 px-3">Total Débit</th>
                <th className="text-right py-3 px-3">Total Crédit</th>
                <th className="text-center py-3 px-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((e: any) => (
                <tr key={e.id} className="border-b hover:bg-muted/30">
                  <td className="py-3 px-3 font-mono text-xs">{e.entryNumber}</td>
                  <td className="py-3 px-3">{e.entryDate ? new Date(e.entryDate).toLocaleDateString("fr-FR") : "—"}</td>
                  <td className="py-3 px-3">{e.description || "—"}</td>
                  <td className="py-3 px-3 text-center">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${e.status === "posted" ? "bg-green-100 text-green-800" : e.status === "cancelled" ? "bg-red-100 text-red-800" : "bg-yellow-100 text-yellow-800"}`}>
                      {e.status === "posted" ? "Validée" : e.status === "cancelled" ? "Annulée" : "Brouillon"}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-right">{(e.totalDebit || 0).toLocaleString("fr-FR")}</td>
                  <td className="py-3 px-3 text-right">{(e.totalCredit || 0).toLocaleString("fr-FR")}</td>
                  <td className="py-3 px-3 text-center">
                    {e.status === "draft" && <Button size="sm" variant="outline" onClick={() => postMutation.mutate({ id: e.id })}>Valider</Button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {total > 50 && (
        <div className="flex justify-center gap-2">
          <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(p => p - 1)}>Précédent</Button>
          <span className="text-sm text-muted-foreground py-2">Page {page + 1} / {Math.ceil(total / 50)}</span>
          <Button variant="outline" size="sm" disabled={(page + 1) * 50 >= total} onClick={() => setPage(p => p + 1)}>Suivant</Button>
        </div>
      )}
    </div>
  );
}
