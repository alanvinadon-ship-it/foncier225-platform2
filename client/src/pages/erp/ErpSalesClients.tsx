import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Link } from "wouter";
import { toast } from "sonner";
import { ArrowLeft, Plus, Building2, Edit, Phone, Mail } from "lucide-react";

export default function ErpSalesClients() {
  const [showCreate, setShowCreate] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);

  const utils = trpc.useUtils();
  const { data: clients, isLoading } = trpc.erp.salesOrders.clients.list.useQuery();

  const createMutation = trpc.erp.salesOrders.clients.create.useMutation({
    onSuccess: () => {
      toast.success("Client créé");
      utils.erp.salesOrders.clients.list.invalidate();
      setShowCreate(false);
    },
    onError: (err) => toast.error(err.message),
  });

  const updateMutation = trpc.erp.salesOrders.clients.update.useMutation({
    onSuccess: () => {
      toast.success("Client mis à jour");
      utils.erp.salesOrders.clients.list.invalidate();
      setEditId(null);
    },
    onError: (err) => toast.error(err.message),
  });

  const handleCreate = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    createMutation.mutate({
      code: fd.get("code") as string,
      name: fd.get("name") as string,
      shortName: (fd.get("shortName") as string) || undefined,
      sector: (fd.get("sector") as string) || undefined,
      contactName: (fd.get("contactName") as string) || undefined,
      contactEmail: (fd.get("contactEmail") as string) || undefined,
      contactPhone: (fd.get("contactPhone") as string) || undefined,
      address: (fd.get("address") as string) || undefined,
      taxId: (fd.get("taxId") as string) || undefined,
      paymentTermsDays: fd.get("paymentTermsDays") ? Number(fd.get("paymentTermsDays")) : undefined,
      notes: (fd.get("notes") as string) || undefined,
    });
  };

  const editClient = clients?.find(c => c.id === editId);

  const handleUpdate = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editId) return;
    const fd = new FormData(e.currentTarget);
    updateMutation.mutate({
      id: editId,
      name: (fd.get("name") as string) || undefined,
      shortName: (fd.get("shortName") as string) || undefined,
      sector: (fd.get("sector") as string) || undefined,
      contactName: (fd.get("contactName") as string) || undefined,
      contactEmail: (fd.get("contactEmail") as string) || undefined,
      contactPhone: (fd.get("contactPhone") as string) || undefined,
      address: (fd.get("address") as string) || undefined,
      taxId: (fd.get("taxId") as string) || undefined,
      paymentTermsDays: fd.get("paymentTermsDays") ? Number(fd.get("paymentTermsDays")) : undefined,
      notes: (fd.get("notes") as string) || undefined,
    });
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <Link href="/erp/sales-orders">
            <Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">Clients entreprises</h1>
            <p className="text-muted-foreground">{clients?.length || 0} client(s) enregistré(s)</p>
          </div>
        </div>
        <Button onClick={() => setShowCreate(true)}><Plus className="h-4 w-4 mr-2" /> Nouveau client</Button>
      </div>

      {/* List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {isLoading ? (
          [1, 2, 3].map(i => <Card key={i}><CardContent className="h-32 animate-pulse bg-muted/30 pt-6" /></Card>)
        ) : clients?.length === 0 ? (
          <div className="col-span-full text-center py-12 text-muted-foreground">
            <Building2 className="h-12 w-12 mx-auto mb-4 opacity-30" />
            <p>Aucun client enregistré</p>
            <Button className="mt-4" onClick={() => setShowCreate(true)}>Ajouter un client</Button>
          </div>
        ) : (
          clients?.map(client => (
            <Card key={client.id} className="hover:shadow-md transition-shadow">
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <Building2 className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-semibold">{client.name}</p>
                      <p className="text-xs text-muted-foreground font-mono">{client.code}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Badge variant={client.isActive ? "default" : "secondary"}>
                      {client.isActive ? "Actif" : "Inactif"}
                    </Badge>
                    <Button variant="ghost" size="icon" onClick={() => setEditId(client.id)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                {client.sector && <p className="text-sm text-muted-foreground mt-3">{client.sector}</p>}
                <div className="mt-3 space-y-1 text-sm">
                  {client.contactName && <p>{client.contactName}</p>}
                  {client.contactEmail && (
                    <p className="flex items-center gap-1 text-muted-foreground">
                      <Mail className="h-3 w-3" /> {client.contactEmail}
                    </p>
                  )}
                  {client.contactPhone && (
                    <p className="flex items-center gap-1 text-muted-foreground">
                      <Phone className="h-3 w-3" /> {client.contactPhone}
                    </p>
                  )}
                </div>
                {client.paymentTermsDays && (
                  <p className="text-xs text-muted-foreground mt-2">Délai paiement: {client.paymentTermsDays} jours</p>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Create Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Nouveau client</DialogTitle></DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4 pt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Code *</Label>
                <Input name="code" required placeholder="ORANGE-CI" />
              </div>
              <div className="space-y-2">
                <Label>Nom *</Label>
                <Input name="name" required placeholder="Orange Côte d'Ivoire" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nom court</Label>
                <Input name="shortName" placeholder="Orange CI" />
              </div>
              <div className="space-y-2">
                <Label>Secteur</Label>
                <Input name="sector" placeholder="Télécommunications" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Contact</Label>
                <Input name="contactName" placeholder="Nom du contact" />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input name="contactEmail" type="email" placeholder="contact@orange.ci" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Téléphone</Label>
                <Input name="contactPhone" placeholder="+225 07 00 00 00" />
              </div>
              <div className="space-y-2">
                <Label>N° contribuable</Label>
                <Input name="taxId" placeholder="CI-XXXXXXX" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Délai paiement (jours)</Label>
                <Input name="paymentTermsDays" type="number" min={0} max={365} placeholder="30" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Adresse</Label>
              <Input name="address" placeholder="Abidjan, Plateau..." />
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea name="notes" rows={2} placeholder="Notes internes..." />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="outline" onClick={() => setShowCreate(false)}>Annuler</Button>
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? "..." : "Créer"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editId} onOpenChange={() => setEditId(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Modifier le client</DialogTitle></DialogHeader>
          {editClient && (
            <form onSubmit={handleUpdate} className="space-y-4 pt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Code</Label>
                  <Input value={editClient.code} disabled />
                </div>
                <div className="space-y-2">
                  <Label>Nom</Label>
                  <Input name="name" defaultValue={editClient.name} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Nom court</Label>
                  <Input name="shortName" defaultValue={editClient.shortName || ""} />
                </div>
                <div className="space-y-2">
                  <Label>Secteur</Label>
                  <Input name="sector" defaultValue={editClient.sector || ""} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Contact</Label>
                  <Input name="contactName" defaultValue={editClient.contactName || ""} />
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input name="contactEmail" type="email" defaultValue={editClient.contactEmail || ""} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Téléphone</Label>
                  <Input name="contactPhone" defaultValue={editClient.contactPhone || ""} />
                </div>
                <div className="space-y-2">
                  <Label>N° contribuable</Label>
                  <Input name="taxId" defaultValue={editClient.taxId || ""} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Délai paiement (jours)</Label>
                <Input name="paymentTermsDays" type="number" defaultValue={editClient.paymentTermsDays || ""} />
              </div>
              <div className="space-y-2">
                <Label>Adresse</Label>
                <Input name="address" defaultValue={editClient.address || ""} />
              </div>
              <div className="space-y-2">
                <Label>Notes</Label>
                <Textarea name="notes" rows={2} defaultValue={editClient.notes || ""} />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <Button type="button" variant="outline" onClick={() => setEditId(null)}>Annuler</Button>
                <Button type="submit" disabled={updateMutation.isPending}>
                  {updateMutation.isPending ? "..." : "Enregistrer"}
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
