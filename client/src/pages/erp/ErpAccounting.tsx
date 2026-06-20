import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useErpPermissions } from "@/hooks/useErpPermissions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Settings, Plus, BookOpen, Receipt, Landmark } from "lucide-react";

function formatXOF(amount: number) {
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "XOF", maximumFractionDigits: 0 }).format(amount);
}

export default function ErpAccounting() {
  const { hasPermission } = useErpPermissions();
  const canView = hasPermission("erp_accounting", "view");
  const canCreate = hasPermission("erp_accounting", "create");

  const [activeTab, setActiveTab] = useState("accounts");
  const [showCreateAccount, setShowCreateAccount] = useState(false);
  const [showCreateTax, setShowCreateTax] = useState(false);
  const [showCreatePaymentAccount, setShowCreatePaymentAccount] = useState(false);

  // Queries
  const accountsQuery = trpc.erp.accounting.accounts.list.useQuery(undefined, { enabled: canView });
  const taxCodesQuery = trpc.erp.accounting.taxCodes.list.useQuery(undefined, { enabled: canView });
  const paymentAccountsQuery = trpc.erp.accounting.paymentAccounts.list.useQuery(undefined, { enabled: canView });

  // Mutations
  const createAccount = trpc.erp.accounting.accounts.create.useMutation({
    onSuccess: () => { toast.success("Compte créé"); setShowCreateAccount(false); accountsQuery.refetch(); },
    onError: (e) => toast.error(e.message),
  });
  const createTax = trpc.erp.accounting.taxCodes.create.useMutation({
    onSuccess: () => { toast.success("Code taxe créé"); setShowCreateTax(false); taxCodesQuery.refetch(); },
    onError: (e) => toast.error(e.message),
  });
  const createPaymentAccount = trpc.erp.accounting.paymentAccounts.create.useMutation({
    onSuccess: () => { toast.success("Compte de paiement créé"); setShowCreatePaymentAccount(false); paymentAccountsQuery.refetch(); },
    onError: (e) => toast.error(e.message),
  });

  if (!canView) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Accès non autorisé au module Comptabilité.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Settings className="h-6 w-6 text-primary" />
            Paramétrage Comptable
          </h1>
          <p className="text-muted-foreground mt-1">Plan comptable, codes taxe et comptes de paiement</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="accounts" className="flex items-center gap-1">
            <BookOpen className="h-4 w-4" /> Plan Comptable
          </TabsTrigger>
          <TabsTrigger value="taxes" className="flex items-center gap-1">
            <Receipt className="h-4 w-4" /> Codes Taxe
          </TabsTrigger>
          <TabsTrigger value="payment" className="flex items-center gap-1">
            <Landmark className="h-4 w-4" /> Comptes de Paiement
          </TabsTrigger>
        </TabsList>

        {/* PLAN COMPTABLE */}
        <TabsContent value="accounts" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold">Comptes Comptables</h2>
            {canCreate && (
              <Button size="sm" onClick={() => setShowCreateAccount(true)}>
                <Plus className="h-4 w-4 mr-1" /> Nouveau Compte
              </Button>
            )}
          </div>
          <div className="border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left p-3 font-medium">Code</th>
                  <th className="text-left p-3 font-medium">Nom</th>
                  <th className="text-left p-3 font-medium">Type</th>
                  <th className="text-left p-3 font-medium">Classe</th>
                  <th className="text-center p-3 font-medium">Actif</th>
                </tr>
              </thead>
              <tbody>
                {accountsQuery.data?.accounts?.map((acc: any) => (
                  <tr key={acc.id} className="border-t hover:bg-muted/30">
                    <td className="p-3 font-mono text-xs">{acc.accountCode}</td>
                    <td className="p-3">{acc.accountName}</td>
                    <td className="p-3">
                      <Badge variant="outline" className="text-xs">{acc.accountType}</Badge>
                    </td>
                    <td className="p-3 text-muted-foreground">{acc.accountClass || "—"}</td>
                    <td className="p-3 text-center">
                      {acc.isActive ? <Badge className="bg-green-100 text-green-800 text-xs">Actif</Badge> : <Badge variant="secondary" className="text-xs">Inactif</Badge>}
                    </td>
                  </tr>
                ))}
                {(!accountsQuery.data?.accounts || accountsQuery.data.accounts.length === 0) && (
                  <tr><td colSpan={5} className="p-8 text-center text-muted-foreground">Aucun compte comptable configuré</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </TabsContent>

        {/* CODES TAXE */}
        <TabsContent value="taxes" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold">Codes Taxe</h2>
            {canCreate && (
              <Button size="sm" onClick={() => setShowCreateTax(true)}>
                <Plus className="h-4 w-4 mr-1" /> Nouveau Code Taxe
              </Button>
            )}
          </div>
          <div className="border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left p-3 font-medium">Code</th>
                  <th className="text-left p-3 font-medium">Nom</th>
                  <th className="text-right p-3 font-medium">Taux (%)</th>
                  <th className="text-left p-3 font-medium">Type</th>
                  <th className="text-center p-3 font-medium">Actif</th>
                </tr>
              </thead>
              <tbody>
                {taxCodesQuery.data?.taxCodes?.map((tax: any) => (
                  <tr key={tax.id} className="border-t hover:bg-muted/30">
                    <td className="p-3 font-mono text-xs">{tax.code}</td>
                    <td className="p-3">{tax.name}</td>
                    <td className="p-3 text-right font-semibold">{(tax.rate / 100).toFixed(2)}%</td>
                    <td className="p-3"><Badge variant="outline" className="text-xs">{tax.taxType}</Badge></td>
                    <td className="p-3 text-center">
                      {tax.isActive ? <Badge className="bg-green-100 text-green-800 text-xs">Actif</Badge> : <Badge variant="secondary" className="text-xs">Inactif</Badge>}
                    </td>
                  </tr>
                ))}
                {(!taxCodesQuery.data?.taxCodes || taxCodesQuery.data.taxCodes.length === 0) && (
                  <tr><td colSpan={5} className="p-8 text-center text-muted-foreground">Aucun code taxe configuré</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </TabsContent>

        {/* COMPTES DE PAIEMENT */}
        <TabsContent value="payment" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold">Comptes de Paiement</h2>
            {canCreate && (
              <Button size="sm" onClick={() => setShowCreatePaymentAccount(true)}>
                <Plus className="h-4 w-4 mr-1" /> Nouveau Compte
              </Button>
            )}
          </div>
          <div className="border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left p-3 font-medium">Nom</th>
                  <th className="text-left p-3 font-medium">Type</th>
                  <th className="text-left p-3 font-medium">Banque</th>
                  <th className="text-left p-3 font-medium">N° Compte</th>
                  <th className="text-center p-3 font-medium">Actif</th>
                </tr>
              </thead>
              <tbody>
                {paymentAccountsQuery.data?.paymentAccounts?.map((pa: any) => (
                  <tr key={pa.id} className="border-t hover:bg-muted/30">
                    <td className="p-3 font-medium">{pa.name}</td>
                    <td className="p-3"><Badge variant="outline" className="text-xs">{pa.accountType}</Badge></td>
                    <td className="p-3 text-muted-foreground">{pa.bankName || "—"}</td>
                    <td className="p-3 font-mono text-xs">{pa.accountNumberMasked || "—"}</td>
                    <td className="p-3 text-center">
                      {pa.isActive ? <Badge className="bg-green-100 text-green-800 text-xs">Actif</Badge> : <Badge variant="secondary" className="text-xs">Inactif</Badge>}
                    </td>
                  </tr>
                ))}
                {(!paymentAccountsQuery.data?.paymentAccounts || paymentAccountsQuery.data.paymentAccounts.length === 0) && (
                  <tr><td colSpan={5} className="p-8 text-center text-muted-foreground">Aucun compte de paiement configuré</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </TabsContent>
      </Tabs>

      {/* DIALOG: Créer Compte Comptable */}
      <Dialog open={showCreateAccount} onOpenChange={setShowCreateAccount}>
        <DialogContent>
          <DialogHeader><DialogTitle>Nouveau Compte Comptable</DialogTitle></DialogHeader>
          <form onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            createAccount.mutate({
              accountCode: fd.get("accountCode") as string,
              accountName: fd.get("accountName") as string,
              accountType: fd.get("accountType") as any,
              parentId: null,
            });
          }} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Code *</Label><Input name="accountCode" placeholder="601000" required /></div>
              <div><Label>Nom *</Label><Input name="accountName" placeholder="Achats matériaux" required /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Type *</Label>
                <Select name="accountType" required>
                  <SelectTrigger><SelectValue placeholder="Type" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="asset">Actif</SelectItem>
                    <SelectItem value="liability">Passif</SelectItem>
                    <SelectItem value="equity">Capitaux</SelectItem>
                    <SelectItem value="revenue">Produit</SelectItem>
                    <SelectItem value="expense">Charge</SelectItem>
                    <SelectItem value="cost_of_goods">Coût des ventes</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Classe</Label><Input name="accountClass" placeholder="6" /></div>
            </div>
            <div><Label>Description</Label><Input name="description" placeholder="Description optionnelle" /></div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowCreateAccount(false)}>Annuler</Button>
              <Button type="submit" disabled={createAccount.isPending}>Créer</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* DIALOG: Créer Code Taxe */}
      <Dialog open={showCreateTax} onOpenChange={setShowCreateTax}>
        <DialogContent>
          <DialogHeader><DialogTitle>Nouveau Code Taxe</DialogTitle></DialogHeader>
          <form onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            createTax.mutate({
              code: fd.get("code") as string,
              name: fd.get("name") as string,
              rate: Math.round(parseFloat(fd.get("rate") as string) * 100),
              taxType: fd.get("taxType") as any,
            });
          }} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Code *</Label><Input name="code" placeholder="TVA18" required /></div>
              <div><Label>Nom *</Label><Input name="name" placeholder="TVA 18%" required /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Taux (%) *</Label><Input name="rate" type="number" step="0.01" placeholder="18.00" required /></div>
              <div>
                <Label>Type *</Label>
                <Select name="taxType" required>
                  <SelectTrigger><SelectValue placeholder="Type" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="vat">TVA</SelectItem>
                    <SelectItem value="withholding">Retenue</SelectItem>
                    <SelectItem value="excise">Accise</SelectItem>
                    <SelectItem value="other">Autre</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowCreateTax(false)}>Annuler</Button>
              <Button type="submit" disabled={createTax.isPending}>Créer</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* DIALOG: Créer Compte de Paiement */}
      <Dialog open={showCreatePaymentAccount} onOpenChange={setShowCreatePaymentAccount}>
        <DialogContent>
          <DialogHeader><DialogTitle>Nouveau Compte de Paiement</DialogTitle></DialogHeader>
          <form onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            createPaymentAccount.mutate({
              name: fd.get("name") as string,
              accountType: fd.get("accountType") as any,
              bankName: fd.get("bankName") as string || undefined,
              accountNumberMasked: fd.get("accountNumberMasked") as string || undefined,
              currency: "XOF",
            });
          }} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Nom *</Label><Input name="name" placeholder="Compte principal" required /></div>
              <div>
                <Label>Type *</Label>
                <Select name="accountType" required>
                  <SelectTrigger><SelectValue placeholder="Type" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bank">Banque</SelectItem>
                    <SelectItem value="cash">Caisse</SelectItem>
                    <SelectItem value="mobile_money">Mobile Money</SelectItem>
                    <SelectItem value="other">Autre</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Banque</Label><Input name="bankName" placeholder="SGBCI" /></div>
              <div><Label>N° Compte (masqué)</Label><Input name="accountNumberMasked" placeholder="****1234" /></div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowCreatePaymentAccount(false)}>Annuler</Button>
              <Button type="submit" disabled={createPaymentAccount.isPending}>Créer</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
