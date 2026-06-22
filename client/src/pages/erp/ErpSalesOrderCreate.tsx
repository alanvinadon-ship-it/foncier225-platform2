import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import { Link } from "wouter";

interface OrderLine {
  description: string;
  quantity: number;
  unit: string;
  unitPriceHT: number;
}

export default function ErpSalesOrderCreate() {
  const [, navigate] = useLocation();
  const { data: clients } = trpc.erp.salesOrders.clients.list.useQuery({ activeOnly: true });

  const [clientId, setClientId] = useState("");
  const [clientRef, setClientRef] = useState("");
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("normal");
  const [orderDate, setOrderDate] = useState(new Date().toISOString().split("T")[0]);
  const [expectedDeliveryDate, setExpectedDeliveryDate] = useState("");
  const [taxRate, setTaxRate] = useState("18");
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState<OrderLine[]>([
    { description: "", quantity: 1, unit: "unité", unitPriceHT: 0 },
  ]);

  const createMutation = trpc.erp.salesOrders.orders.create.useMutation({
    onSuccess: (data) => {
      toast.success(`Commande ${data.orderNumber} créée avec succès`);
      navigate(`/erp/sales-orders/${data.id}`);
    },
    onError: (err) => {
      toast.error(err.message || "Erreur lors de la création");
    },
  });

  const addLine = () => {
    setLines([...lines, { description: "", quantity: 1, unit: "unité", unitPriceHT: 0 }]);
  };

  const removeLine = (index: number) => {
    if (lines.length <= 1) return;
    setLines(lines.filter((_, i) => i !== index));
  };

  const updateLine = (index: number, field: keyof OrderLine, value: string | number) => {
    const updated = [...lines];
    (updated[index] as any)[field] = value;
    setLines(updated);
  };

  const totalHT = lines.reduce((sum, l) => sum + l.quantity * l.unitPriceHT, 0);
  const totalTTC = Math.round(totalHT * (1 + Number(taxRate) / 100));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientId) { toast.error("Veuillez sélectionner un client"); return; }
    if (!subject.trim()) { toast.error("Veuillez saisir l'objet de la commande"); return; }
    if (lines.some(l => !l.description.trim() || l.unitPriceHT <= 0)) {
      toast.error("Veuillez remplir toutes les lignes correctement");
      return;
    }

    createMutation.mutate({
      clientId: Number(clientId),
      clientRef: clientRef || undefined,
      subject,
      description: description || undefined,
      priority: priority as any,
      orderDate: new Date(orderDate).getTime(),
      expectedDeliveryDate: expectedDeliveryDate ? new Date(expectedDeliveryDate).getTime() : undefined,
      taxRate: Number(taxRate),
      notes: notes || undefined,
      lines: lines.map(l => ({
        description: l.description,
        quantity: l.quantity,
        unit: l.unit,
        unitPriceHT: l.unitPriceHT,
      })),
    });
  };

  return (
    <div className="p-6 space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/erp/sales-orders">
          <Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Nouvelle commande client</h1>
          <p className="text-muted-foreground">Enregistrer un bon de commande reçu</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Client & Infos */}
        <Card>
          <CardHeader><CardTitle>Informations générales</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Client *</Label>
                <Select value={clientId} onValueChange={setClientId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner un client" />
                  </SelectTrigger>
                  <SelectContent>
                    {clients?.map(c => (
                      <SelectItem key={c.id} value={String(c.id)}>{c.name} ({c.code})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Référence BC client</Label>
                <Input value={clientRef} onChange={e => setClientRef(e.target.value)} placeholder="N° BC du client" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Objet de la commande *</Label>
              <Input value={subject} onChange={e => setSubject(e.target.value)} placeholder="Ex: Prestation de bornage parcelle..." />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Détails supplémentaires..." rows={3} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Priorité</Label>
                <Select value={priority} onValueChange={setPriority}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Basse</SelectItem>
                    <SelectItem value="normal">Normale</SelectItem>
                    <SelectItem value="high">Haute</SelectItem>
                    <SelectItem value="urgent">Urgente</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Date du BC *</Label>
                <Input type="date" value={orderDate} onChange={e => setOrderDate(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Date livraison prévue</Label>
                <Input type="date" value={expectedDeliveryDate} onChange={e => setExpectedDeliveryDate(e.target.value)} />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Lines */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Lignes de commande</CardTitle>
            <Button type="button" variant="outline" size="sm" onClick={addLine}>
              <Plus className="h-4 w-4 mr-1" /> Ajouter une ligne
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {lines.map((line, i) => (
                <div key={i} className="grid grid-cols-12 gap-2 items-end">
                  <div className="col-span-5 space-y-1">
                    {i === 0 && <Label className="text-xs">Description</Label>}
                    <Input
                      value={line.description}
                      onChange={e => updateLine(i, "description", e.target.value)}
                      placeholder="Description de la prestation"
                    />
                  </div>
                  <div className="col-span-2 space-y-1">
                    {i === 0 && <Label className="text-xs">Quantité</Label>}
                    <Input
                      type="number"
                      min={1}
                      value={line.quantity}
                      onChange={e => updateLine(i, "quantity", Number(e.target.value))}
                    />
                  </div>
                  <div className="col-span-1 space-y-1">
                    {i === 0 && <Label className="text-xs">Unité</Label>}
                    <Input
                      value={line.unit}
                      onChange={e => updateLine(i, "unit", e.target.value)}
                    />
                  </div>
                  <div className="col-span-3 space-y-1">
                    {i === 0 && <Label className="text-xs">Prix unit. HT (FCFA)</Label>}
                    <Input
                      type="number"
                      min={0}
                      value={line.unitPriceHT}
                      onChange={e => updateLine(i, "unitPriceHT", Number(e.target.value))}
                    />
                  </div>
                  <div className="col-span-1">
                    <Button type="button" variant="ghost" size="icon" onClick={() => removeLine(i)} disabled={lines.length <= 1}>
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            {/* Totals */}
            <div className="mt-6 border-t pt-4 space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Taux TVA</span>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min={0}
                    max={50}
                    value={taxRate}
                    onChange={e => setTaxRate(e.target.value)}
                    className="w-20 text-right"
                  />
                  <span>%</span>
                </div>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total HT</span>
                <span className="font-medium">{new Intl.NumberFormat("fr-FR").format(totalHT)} FCFA</span>
              </div>
              <div className="flex justify-between text-lg font-bold">
                <span>Total TTC</span>
                <span>{new Intl.NumberFormat("fr-FR").format(totalTTC)} FCFA</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Notes */}
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-2">
              <Label>Notes internes</Label>
              <Textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Notes internes (non visibles par le client)..." rows={2} />
            </div>
          </CardContent>
        </Card>

        {/* Submit */}
        <div className="flex justify-end gap-3">
          <Link href="/erp/sales-orders">
            <Button type="button" variant="outline">Annuler</Button>
          </Link>
          <Button type="submit" disabled={createMutation.isPending}>
            {createMutation.isPending ? "Enregistrement..." : "Enregistrer la commande"}
          </Button>
        </div>
      </form>
    </div>
  );
}
