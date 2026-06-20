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

export default function ErpAccountingJournals() {
  const [open, setOpen] = useState(false);
  const { data, isLoading, refetch } = trpc.erp.fullAccounting.journals.list.useQuery({});
  const createMutation = trpc.erp.fullAccounting.journals.create.useMutation({
    onSuccess: () => { toast.success("Journal créé"); setOpen(false); refetch(); },
    onError: (e) => toast.error(e.message),
  });

  const [form, setForm] = useState({ journalCode: "", journalName: "", journalType: "general", description: "" });

  const journals = data || [];
  const journalTypes = ["general", "purchase", "sales", "bank", "cash", "operations"];
  const typeLabels: Record<string, string> = { general: "Général", purchase: "Achats", sales: "Ventes", bank: "Banque", cash: "Caisse", operations: "Opérations" };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Journaux Comptables</h1>
          <p className="text-muted-foreground">{journals.length} journaux configurés</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" /> Nouveau Journal</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Créer un Journal</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Code</Label><Input value={form.journalCode} onChange={e => setForm(f => ({ ...f, journalCode: e.target.value.toUpperCase() }))} placeholder="ACH" maxLength={10} /></div>
                <div>
                  <Label>Type</Label>
                  <Select value={form.journalType} onValueChange={v => setForm(f => ({ ...f, journalType: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{journalTypes.map(t => <SelectItem key={t} value={t}>{typeLabels[t]}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div><Label>Nom</Label><Input value={form.journalName} onChange={e => setForm(f => ({ ...f, journalName: e.target.value }))} placeholder="Journal des achats" /></div>
              <div><Label>Description</Label><Input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Description optionnelle" /></div>
              <Button className="w-full" onClick={() => createMutation.mutate(form)} disabled={createMutation.isPending || !form.journalCode || !form.journalName}>
                {createMutation.isPending ? "Création..." : "Créer le journal"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-16 bg-muted rounded animate-pulse" />)}</div>
      ) : journals.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">Aucun journal configuré</CardContent></Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {journals.map((j: any) => (
            <Card key={j.id}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-mono text-sm font-bold bg-muted px-2 py-0.5 rounded">{j.journalCode}</span>
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${j.isActive ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}`}>
                    {j.isActive ? "Actif" : "Inactif"}
                  </span>
                </div>
                <h3 className="font-medium">{j.journalName}</h3>
                <p className="text-sm text-muted-foreground">{typeLabels[j.journalType] || j.journalType}</p>
                {j.description && <p className="text-xs text-muted-foreground mt-1">{j.description}</p>}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
