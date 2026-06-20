import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Search } from "lucide-react";
import { toast } from "sonner";

export default function ErpRealEstateCustomers() {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);

  const { data, isLoading, refetch } = trpc.erp.realEstate.customers.list.useQuery({ search: search || undefined, limit: 50, offset: page * 50 });
  const createMutation = trpc.erp.realEstate.customers.create.useMutation({
    onSuccess: () => { toast.success("Client créé"); setOpen(false); refetch(); },
    onError: (e) => toast.error(e.message),
  });

  const [form, setForm] = useState({ customerType: "individual" as "individual" | "company", firstName: "", lastName: "", companyName: "", email: "", phone: "", nationality: "", idDocumentType: "", idDocumentNumber: "", source: "direct" });

  const customers = data?.customers || [];
  const total = data?.total || 0;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Clients Immobiliers</h1>
          <p className="text-muted-foreground">{total} clients enregistrés</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" /> Nouveau Client</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>Créer un Client</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Type</Label>
                <Select value={form.customerType} onValueChange={v => setForm(f => ({ ...f, customerType: v as any }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="individual">Particulier</SelectItem>
                    <SelectItem value="company">Entreprise</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {form.customerType === "individual" ? (
                <div className="grid grid-cols-2 gap-4">
                  <div><Label>Prénom</Label><Input value={form.firstName} onChange={e => setForm(f => ({ ...f, firstName: e.target.value }))} /></div>
                  <div><Label>Nom</Label><Input value={form.lastName} onChange={e => setForm(f => ({ ...f, lastName: e.target.value }))} /></div>
                </div>
              ) : (
                <div><Label>Raison sociale</Label><Input value={form.companyName} onChange={e => setForm(f => ({ ...f, companyName: e.target.value }))} /></div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Email</Label><Input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} /></div>
                <div><Label>Téléphone</Label><Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="+225 07..." /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Nationalité</Label><Input value={form.nationality} onChange={e => setForm(f => ({ ...f, nationality: e.target.value }))} placeholder="Ivoirienne" /></div>
                <div>
                  <Label>Source</Label>
                  <Select value={form.source} onValueChange={v => setForm(f => ({ ...f, source: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="direct">Direct</SelectItem>
                      <SelectItem value="referral">Parrainage</SelectItem>
                      <SelectItem value="website">Site web</SelectItem>
                      <SelectItem value="agency">Agence</SelectItem>
                      <SelectItem value="salon">Salon</SelectItem>
                      <SelectItem value="autre">Autre</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Pièce d'identité</Label>
                  <Select value={form.idDocumentType} onValueChange={v => setForm(f => ({ ...f, idDocumentType: v }))}>
                    <SelectTrigger><SelectValue placeholder="Type" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cni">CNI</SelectItem>
                      <SelectItem value="passport">Passeport</SelectItem>
                      <SelectItem value="carte_sejour">Carte de séjour</SelectItem>
                      <SelectItem value="rccm">RCCM</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div><Label>N° Pièce</Label><Input value={form.idDocumentNumber} onChange={e => setForm(f => ({ ...f, idDocumentNumber: e.target.value }))} /></div>
              </div>
              <Button className="w-full" onClick={() => createMutation.mutate(form)} disabled={createMutation.isPending}>
                {createMutation.isPending ? "Création..." : "Créer le client"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input className="pl-10" placeholder="Rechercher un client..." value={search} onChange={e => { setSearch(e.target.value); setPage(0); }} />
      </div>

      {isLoading ? (
        <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-16 bg-muted rounded animate-pulse" />)}</div>
      ) : customers.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">Aucun client trouvé</CardContent></Card>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="text-left py-3 px-3">N° Client</th>
                <th className="text-left py-3 px-3">Nom</th>
                <th className="text-left py-3 px-3">Contact</th>
                <th className="text-center py-3 px-3">Type</th>
                <th className="text-center py-3 px-3">Statut</th>
                <th className="text-left py-3 px-3">Source</th>
              </tr>
            </thead>
            <tbody>
              {customers.map((c: any) => (
                <tr key={c.id} className="border-b hover:bg-muted/30">
                  <td className="py-3 px-3 font-mono text-xs">{c.customerNumber}</td>
                  <td className="py-3 px-3 font-medium">{c.customerType === "company" ? c.companyName : `${c.firstName || ""} ${c.lastName || ""}`}</td>
                  <td className="py-3 px-3 text-muted-foreground">{c.email || c.phone || "—"}</td>
                  <td className="py-3 px-3 text-center"><span className="px-2 py-0.5 rounded text-xs bg-muted">{c.customerType === "individual" ? "Particulier" : "Entreprise"}</span></td>
                  <td className="py-3 px-3 text-center">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${c.status === "buyer" ? "bg-green-100 text-green-800" : c.status === "qualified" ? "bg-blue-100 text-blue-800" : c.status === "blacklisted" ? "bg-red-100 text-red-800" : "bg-gray-100 text-gray-800"}`}>
                      {c.status}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-muted-foreground">{c.source || "—"}</td>
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
