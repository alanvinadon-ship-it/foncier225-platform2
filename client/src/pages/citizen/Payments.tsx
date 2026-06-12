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
import { CreditCard, Smartphone, Banknote, CheckCircle2, Clock, XCircle, AlertCircle, Loader2, Shield, Building2 } from "lucide-react";
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
  moov_money: { label: "Moov Money", icon: Smartphone },
  wave: { label: "Wave", icon: Smartphone },
  card: { label: "Carte bancaire", icon: CreditCard },
  bank_transfer: { label: "Virement bancaire", icon: Banknote },
};

const DOSSIER_TYPE_LABELS: Record<string, string> = {
  land_title: "Titre Foncier (CF/TF)",
  urban_acd: "Foncier Urbain (ACD)",
  credit: "Crédit Habitat",
};

const TAX_TYPE_LABELS: Record<string, string> = {
  liasse_afor: "Liasse AFOR",
  frais_geometre: "Frais de géomètre",
  taxe_immatriculation: "Taxe d'immatriculation",
  frais_dossier: "Frais de dossier",
  other: "Autre",
};

const PROVIDER_LABELS: Record<string, { name: string; description: string }> = {
  tresorpay: { name: "TrésorPay", description: "Trésor Public de Côte d'Ivoire" },
  cinetpay: { name: "CinetPay", description: "Agrégateur agréé BCEAO" },
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

  const [pendingRef, setPendingRef] = useState<string | null>(null);

  const initPayment = trpc.payment.initPayment.useMutation({
    onSuccess: (data) => {
      setShowPayDialog(false);
      if (data.mode === "live" && data.paymentUrl) {
        window.open(data.paymentUrl, "_blank");
        setPendingRef(data.reference);
        const providerName = data.provider === "tresorpay" ? "TrésorPay" : "CinetPay";
        toast.info(`Paiement ${providerName}`, {
          description: "Complétez le paiement dans la fenêtre ouverte. Le statut sera mis à jour automatiquement.",
          duration: 10000,
        });
      } else {
        setPendingRef(data.reference);
        toast.success("Paiement initié (mode démo)", {
          description: data.instructions || `Référence: ${data.reference}`,
        });
      }
      refetch();
    },
    onError: (err) => {
      toast.error("Erreur", { description: err.message });
    },
  });

  const confirmPayment = trpc.payment.confirmPayment.useMutation({
    onSuccess: (data) => {
      if (data.status === "completed") {
        toast.success("Paiement confirmé", { description: "Votre paiement a été enregistré avec succès." });
      } else if (data.status === "failed") {
        toast.error("Paiement échoué", { description: "Le paiement n'a pas pu être validé." });
      } else {
        toast.info("Paiement en attente", { description: "Le statut sera mis à jour dès confirmation." });
      }
      setPendingRef(null);
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
        <p className="text-muted-foreground">Paiement des taxes foncières via TrésorPay / Mobile Money</p>
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
              <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <Building2 className="h-5 w-5 text-green-600" />
                    Paiement des taxes foncières
                  </DialogTitle>
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
                    <th className="py-3 px-2 font-medium">Type de taxe</th>
                    <th className="py-3 px-2 font-medium">Montant</th>
                    <th className="py-3 px-2 font-medium">Méthode</th>
                    <th className="py-3 px-2 font-medium">Provider</th>
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
                    const providerInfo = PROVIDER_LABELS[payment.provider] || PROVIDER_LABELS.cinetpay;
                    return (
                      <tr key={payment.id} className="border-b hover:bg-muted/50">
                        <td className="py-3 px-2 font-mono text-xs">{payment.reference}</td>
                        <td className="py-3 px-2">
                          <div className="text-xs">
                            <span className="font-medium">{TAX_TYPE_LABELS[payment.taxType] || payment.taxType}</span>
                            <br />
                            <span className="text-muted-foreground">{DOSSIER_TYPE_LABELS[payment.dossierType]}</span>
                          </div>
                        </td>
                        <td className="py-3 px-2 font-semibold">{payment.amount.toLocaleString()} FCFA</td>
                        <td className="py-3 px-2">
                          <div className="flex items-center gap-1">
                            <MethodIcon className="h-3.5 w-3.5" />
                            <span className="text-xs">{methodInfo?.label}</span>
                          </div>
                        </td>
                        <td className="py-3 px-2">
                          <Badge variant="outline" className={payment.provider === "tresorpay" ? "text-green-700 border-green-300 bg-green-50" : "text-blue-700 border-blue-300 bg-blue-50"}>
                            {payment.provider === "tresorpay" ? <Shield className="h-3 w-3 mr-1" /> : <CreditCard className="h-3 w-3 mr-1" />}
                            {providerInfo.name}
                          </Badge>
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

// ─── Payment Form Component (Multi-Provider) ────────────────────────────────

function PaymentForm({ onSubmit, isLoading }: {
  onSubmit: (data: any) => void;
  isLoading: boolean;
}) {
  const [provider, setProvider] = useState<string>("tresorpay");
  const [taxType, setTaxType] = useState<string>("");
  const [dossierType, setDossierType] = useState<string>("");
  const [dossierId, setDossierId] = useState("");
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<string>("");
  const [phone, setPhone] = useState("");
  const [description, setDescription] = useState("");

  const { data: taxFees } = trpc.payment.getTaxFeeSchedule.useQuery(
    { taxType: taxType as any },
    { enabled: !!taxType }
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!dossierType || !dossierId || !amount || !method || !taxType) return;
    onSubmit({
      dossierType,
      dossierId: parseInt(dossierId),
      amount: parseInt(amount),
      method,
      provider,
      taxType,
      phoneNumber: phone || undefined,
      description: description || undefined,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Provider Selection */}
      <div className="space-y-2">
        <Label className="font-semibold">Passerelle de paiement</Label>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setProvider("tresorpay")}
            className={`p-3 rounded-lg border-2 text-left transition-all ${
              provider === "tresorpay"
                ? "border-green-500 bg-green-50"
                : "border-border hover:border-green-300"
            }`}
          >
            <div className="flex items-center gap-2 mb-1">
              <Shield className="h-4 w-4 text-green-600" />
              <span className="font-semibold text-sm">TrésorPay</span>
            </div>
            <p className="text-xs text-muted-foreground">Trésor Public CI</p>
            <Badge variant="outline" className="mt-1 text-[10px] text-green-700 border-green-300">Recommandé</Badge>
          </button>
          <button
            type="button"
            onClick={() => setProvider("cinetpay")}
            className={`p-3 rounded-lg border-2 text-left transition-all ${
              provider === "cinetpay"
                ? "border-blue-500 bg-blue-50"
                : "border-border hover:border-blue-300"
            }`}
          >
            <div className="flex items-center gap-2 mb-1">
              <CreditCard className="h-4 w-4 text-blue-600" />
              <span className="font-semibold text-sm">CinetPay</span>
            </div>
            <p className="text-xs text-muted-foreground">Agrégateur BCEAO</p>
          </button>
        </div>
      </div>

      {/* Tax Type */}
      <div className="space-y-2">
        <Label className="font-semibold">Type de taxe / frais</Label>
        <Select value={taxType} onValueChange={(v) => { setTaxType(v); setAmount(""); }}>
          <SelectTrigger>
            <SelectValue placeholder="Sélectionner le type de taxe" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="liasse_afor">Liasse AFOR (Attestation Foncière Rurale)</SelectItem>
            <SelectItem value="frais_geometre">Frais de géomètre agréé</SelectItem>
            <SelectItem value="taxe_immatriculation">Taxe d'immatriculation foncière</SelectItem>
            <SelectItem value="frais_dossier">Frais de dossier</SelectItem>
            <SelectItem value="other">Autre frais</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Tax Fee Schedule */}
      {taxFees && taxFees.fees.length > 0 && (
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">Barème officiel — {taxFees.label}</Label>
          <div className="space-y-1 bg-muted/50 p-3 rounded-md">
            {taxFees.fees.map((fee, i) => (
              <button
                key={i}
                type="button"
                onClick={() => { setAmount(String(fee.amount)); setDescription(fee.label); }}
                className="w-full flex justify-between items-center p-2 rounded hover:bg-background transition-colors text-left"
              >
                <div>
                  <span className="text-sm font-medium">{fee.label}</span>
                  <p className="text-xs text-muted-foreground">{fee.description}</p>
                </div>
                <span className="font-semibold text-sm text-green-700">{fee.amount.toLocaleString()} FCFA</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Dossier Type */}
      <div className="space-y-2">
        <Label>Type de dossier associé</Label>
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

      {/* Payment Method */}
      <div className="space-y-2">
        <Label className="font-semibold">Mode de paiement</Label>
        <div className="grid grid-cols-3 gap-2">
          {[
            { id: "orange_money", label: "Orange Money", color: "orange" },
            { id: "mtn_momo", label: "MTN MoMo", color: "yellow" },
            { id: "wave", label: "Wave", color: "blue" },
          ].map(m => (
            <button
              key={m.id}
              type="button"
              onClick={() => setMethod(m.id)}
              className={`p-2.5 rounded-lg border-2 text-center text-xs font-medium transition-all ${
                method === m.id
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/50"
              }`}
            >
              <Smartphone className="h-4 w-4 mx-auto mb-1" />
              {m.label}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-3 gap-2">
          {provider === "tresorpay" && (
            <button
              type="button"
              onClick={() => setMethod("moov_money")}
              className={`p-2.5 rounded-lg border-2 text-center text-xs font-medium transition-all ${
                method === "moov_money"
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/50"
              }`}
            >
              <Smartphone className="h-4 w-4 mx-auto mb-1" />
              Moov Money
            </button>
          )}
          <button
            type="button"
            onClick={() => setMethod("card")}
            className={`p-2.5 rounded-lg border-2 text-center text-xs font-medium transition-all ${
              method === "card"
                ? "border-primary bg-primary/5"
                : "border-border hover:border-primary/50"
            }`}
          >
            <CreditCard className="h-4 w-4 mx-auto mb-1" />
            Carte
          </button>
          <button
            type="button"
            onClick={() => setMethod("bank_transfer")}
            className={`p-2.5 rounded-lg border-2 text-center text-xs font-medium transition-all ${
              method === "bank_transfer"
                ? "border-primary bg-primary/5"
                : "border-border hover:border-primary/50"
            }`}
          >
            <Banknote className="h-4 w-4 mx-auto mb-1" />
            Virement
          </button>
        </div>
      </div>

      {/* Phone number for mobile money */}
      {(method === "orange_money" || method === "mtn_momo" || method === "moov_money" || method === "wave") && (
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

      {/* Security notice */}
      <div className="flex items-start gap-2 p-3 rounded-lg bg-green-50 border border-green-200">
        <Shield className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />
        <div className="text-xs text-green-800">
          <p className="font-medium">Paiement sécurisé</p>
          <p>Transaction encryptée via {provider === "tresorpay" ? "TrésorPay (Trésor Public de Côte d'Ivoire)" : "CinetPay (agrégateur agréé BCEAO)"}. Vos données bancaires ne sont jamais stockées sur notre plateforme.</p>
        </div>
      </div>

      <Button
        type="submit"
        className="w-full bg-green-600 hover:bg-green-700"
        disabled={isLoading || !dossierType || !dossierId || !amount || !method || !taxType}
      >
        {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CreditCard className="h-4 w-4 mr-2" />}
        Payer {amount ? `${parseInt(amount).toLocaleString()} FCFA` : ""} via {provider === "tresorpay" ? "TrésorPay" : "CinetPay"}
      </Button>
    </form>
  );
}
