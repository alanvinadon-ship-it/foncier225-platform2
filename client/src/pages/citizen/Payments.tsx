import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CreditCard, Smartphone, Banknote, CheckCircle2, Clock, XCircle, AlertCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";

const STATUS_LABELS: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  pending: { label: "En attente", variant: "outline" },
  processing: { label: "En cours", variant: "secondary" },
  completed: { label: "Payé", variant: "default" },
  failed: { label: "Échoué", variant: "destructive" },
  refunded: { label: "Remboursé", variant: "outline" },
};

const METHOD_LABELS: Record<string, { label: string; icon: typeof CreditCard }> = {
  orange_money: { label: "Orange Money", icon: Smartphone },
  mtn_momo: { label: "MTN MoMo", icon: Smartphone },
  wave: { label: "Wave", icon: Smartphone },
  card: { label: "Carte bancaire", icon: CreditCard },
  bank_transfer: { label: "Virement bancaire", icon: Banknote },
};

const DOSSIER_TYPE_LABELS: Record<string, string> = {
  land_title: "Titre Foncier (CF/TF)",
  urban_acd: "Foncier Urbain (ACD)",
  credit: "Crédit Habitat",
};

export default function Payments() {

  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [showPayDialog, setShowPayDialog] = useState(false);

  const { data: myPayments, isLoading, refetch } = trpc.payment.listMyPayments.useQuery(
    statusFilter !== "all" || typeFilter !== "all"
      ? {
          ...(statusFilter !== "all" ? { status: statusFilter as any } : {}),
          ...(typeFilter !== "all" ? { dossierType: typeFilter as any } : {}),
        }
      : undefined
  );

  const initPayment = trpc.payment.initPayment.useMutation({
    onSuccess: (data) => {
      toast.success("Paiement initié", {
        description: data.instructions || `Référence: ${data.reference}`,
      });
      setShowPayDialog(false);
      refetch();
    },
    onError: (err) => {
      toast.error("Erreur", { description: err.message });
    },
  });

  const confirmPayment = trpc.payment.confirmPayment.useMutation({
    onSuccess: () => {
      toast.success("Paiement confirmé", { description: "Votre paiement a été enregistré avec succès." });
      refetch();
    },
  });

  // Stats
  const totalPaid = myPayments?.filter(p => p.status === "completed").reduce((sum, p) => sum + p.amount, 0) || 0;
  const pendingCount = myPayments?.filter(p => p.status === "pending").length || 0;
  const completedCount = myPayments?.filter(p => p.status === "completed").length || 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Mes paiements</h1>
        <p className="text-muted-foreground">Historique et gestion de vos paiements de frais fonciers</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-100 text-green-700">
                <CheckCircle2 className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total payé</p>
                <p className="text-xl font-bold">{totalPaid.toLocaleString()} FCFA</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-100 text-amber-700">
                <Clock className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">En attente</p>
                <p className="text-xl font-bold">{pendingCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100 text-blue-700">
                <CreditCard className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Complétés</p>
                <p className="text-xl font-bold">{completedCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <Dialog open={showPayDialog} onOpenChange={setShowPayDialog}>
              <DialogTrigger asChild>
                <Button className="w-full h-full min-h-[60px] bg-green-600 hover:bg-green-700">
                  <Banknote className="h-5 w-5 mr-2" />
                  Nouveau paiement
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Effectuer un paiement</DialogTitle>
                </DialogHeader>
                <PaymentForm
                  onSubmit={(data) => initPayment.mutate(data)}
                  isLoading={initPayment.isPending}
                />
              </DialogContent>
            </Dialog>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Statut" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les statuts</SelectItem>
            <SelectItem value="pending">En attente</SelectItem>
            <SelectItem value="completed">Payé</SelectItem>
            <SelectItem value="failed">Échoué</SelectItem>
            <SelectItem value="refunded">Remboursé</SelectItem>
          </SelectContent>
        </Select>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Type de dossier" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les types</SelectItem>
            <SelectItem value="land_title">Titre Foncier</SelectItem>
            <SelectItem value="urban_acd">Foncier Urbain (ACD)</SelectItem>
            <SelectItem value="credit">Crédit Habitat</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Payment List */}
      <Card>
        <CardHeader>
          <CardTitle>Historique des paiements</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : !myPayments?.length ? (
            <div className="text-center py-8 text-muted-foreground">
              <Banknote className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>Aucun paiement enregistré</p>
              <p className="text-sm">Vos paiements apparaîtront ici une fois effectués.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="py-3 px-2 font-medium">Référence</th>
                    <th className="py-3 px-2 font-medium">Type</th>
                    <th className="py-3 px-2 font-medium">Montant</th>
                    <th className="py-3 px-2 font-medium">Méthode</th>
                    <th className="py-3 px-2 font-medium">Statut</th>
                    <th className="py-3 px-2 font-medium">Date</th>
                    <th className="py-3 px-2 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {myPayments.map((payment) => {
                    const statusInfo = STATUS_LABELS[payment.status] || STATUS_LABELS.pending;
                    const methodInfo = METHOD_LABELS[payment.method];
                    const MethodIcon = methodInfo?.icon || CreditCard;
                    return (
                      <tr key={payment.id} className="border-b hover:bg-muted/50">
                        <td className="py-3 px-2 font-mono text-xs">{payment.reference}</td>
                        <td className="py-3 px-2">{DOSSIER_TYPE_LABELS[payment.dossierType]}</td>
                        <td className="py-3 px-2 font-semibold">{payment.amount.toLocaleString()} FCFA</td>
                        <td className="py-3 px-2">
                          <div className="flex items-center gap-1">
                            <MethodIcon className="h-3.5 w-3.5" />
                            <span className="text-xs">{methodInfo?.label}</span>
                          </div>
                        </td>
                        <td className="py-3 px-2">
                          <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
                        </td>
                        <td className="py-3 px-2 text-xs text-muted-foreground">
                          {new Date(payment.createdAt).toLocaleDateString("fr-FR")}
                        </td>
                        <td className="py-3 px-2">
                          {payment.status === "pending" && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => confirmPayment.mutate({ reference: payment.reference })}
                              disabled={confirmPayment.isPending}
                            >
                              Confirmer
                            </Button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Payment Form Component ──────────────────────────────────────────────────

function PaymentForm({ onSubmit, isLoading }: {
  onSubmit: (data: any) => void;
  isLoading: boolean;
}) {
  const [dossierType, setDossierType] = useState<string>("");
  const [dossierId, setDossierId] = useState("");
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<string>("");
  const [phone, setPhone] = useState("");
  const [description, setDescription] = useState("");

  const { data: fees } = trpc.payment.getFeeSchedule.useQuery(
    { dossierType: dossierType as any },
    { enabled: !!dossierType }
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!dossierType || !dossierId || !amount || !method) return;
    onSubmit({
      dossierType,
      dossierId: parseInt(dossierId),
      amount: parseInt(amount),
      method,
      phoneNumber: phone || undefined,
      description: description || undefined,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label>Type de dossier</Label>
        <Select value={dossierType} onValueChange={setDossierType}>
          <SelectTrigger>
            <SelectValue placeholder="Sélectionner le type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="land_title">Titre Foncier (CF/TF)</SelectItem>
            <SelectItem value="urban_acd">Foncier Urbain (ACD)</SelectItem>
            <SelectItem value="credit">Crédit Habitat</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>N° de dossier</Label>
        <Input
          type="number"
          value={dossierId}
          onChange={(e) => setDossierId(e.target.value)}
          placeholder="ID du dossier"
        />
      </div>

      {fees && fees.length > 0 && (
        <div className="space-y-2">
          <Label>Frais applicables</Label>
          <div className="space-y-1 text-sm bg-muted/50 p-3 rounded-md">
            {fees.map((fee, i) => (
              <div key={i} className="flex justify-between">
                <span>{fee.label}</span>
                <span className="font-medium">{fee.amount.toLocaleString()} FCFA</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-2">
        <Label>Montant (FCFA)</Label>
        <Input
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="Ex: 100000"
          min="1000"
        />
      </div>

      <div className="space-y-2">
        <Label>Mode de paiement</Label>
        <Tabs value={method} onValueChange={setMethod}>
          <TabsList className="grid grid-cols-3 w-full">
            <TabsTrigger value="orange_money" className="text-xs">
              <Smartphone className="h-3 w-3 mr-1" /> Orange
            </TabsTrigger>
            <TabsTrigger value="mtn_momo" className="text-xs">
              <Smartphone className="h-3 w-3 mr-1" /> MTN
            </TabsTrigger>
            <TabsTrigger value="wave" className="text-xs">
              <Smartphone className="h-3 w-3 mr-1" /> Wave
            </TabsTrigger>
          </TabsList>
          <TabsList className="grid grid-cols-2 w-full mt-1">
            <TabsTrigger value="card" className="text-xs">
              <CreditCard className="h-3 w-3 mr-1" /> Carte
            </TabsTrigger>
            <TabsTrigger value="bank_transfer" className="text-xs">
              <Banknote className="h-3 w-3 mr-1" /> Virement
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {(method === "orange_money" || method === "mtn_momo" || method === "wave") && (
        <div className="space-y-2">
          <Label>Numéro de téléphone</Label>
          <Input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+225 07 XX XX XX XX"
          />
        </div>
      )}

      <div className="space-y-2">
        <Label>Description (optionnel)</Label>
        <Input
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Ex: Frais de dossier ACD"
        />
      </div>

      <Button type="submit" className="w-full bg-green-600 hover:bg-green-700" disabled={isLoading || !dossierType || !dossierId || !amount || !method}>
        {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CreditCard className="h-4 w-4 mr-2" />}
        Payer {amount ? `${parseInt(amount).toLocaleString()} FCFA` : ""}
      </Button>
    </form>
  );
}
