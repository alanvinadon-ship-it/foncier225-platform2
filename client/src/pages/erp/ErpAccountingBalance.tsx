import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function ErpAccountingBalance() {
  const { data: reportsData, isLoading } = trpc.erp.fullAccounting.reports.balance.useQuery({});

  const balances = reportsData?.balances || [];
  const totalDebit = reportsData?.totalDebit || 0;
  const totalCredit = reportsData?.totalCredit || 0;
  const netBalance = totalDebit - totalCredit;

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Balance Générale</h1>
        <p className="text-muted-foreground">Soldes de tous les comptes comptables</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Total Débits</CardTitle></CardHeader>
          <CardContent><div className="text-xl font-bold">{totalDebit.toLocaleString("fr-FR")} XOF</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Total Crédits</CardTitle></CardHeader>
          <CardContent><div className="text-xl font-bold">{totalCredit.toLocaleString("fr-FR")} XOF</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Solde Net</CardTitle></CardHeader>
          <CardContent><div className={`text-xl font-bold ${netBalance >= 0 ? "text-green-600" : "text-red-600"}`}>{netBalance.toLocaleString("fr-FR")} XOF</div></CardContent>
        </Card>
      </div>

      {isLoading ? (
        <div className="space-y-2">{[1,2,3,4,5].map(i => <div key={i} className="h-12 bg-muted rounded animate-pulse" />)}</div>
      ) : balances.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">Aucune écriture comptable enregistrée</CardContent></Card>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="text-left py-3 px-3">N° Compte</th>
                <th className="text-left py-3 px-3">Libellé</th>
                <th className="text-right py-3 px-3">Débit</th>
                <th className="text-right py-3 px-3">Crédit</th>
                <th className="text-right py-3 px-3">Solde</th>
              </tr>
            </thead>
            <tbody>
              {balances.map((a: any, idx: number) => (
                <tr key={idx} className="border-b hover:bg-muted/30">
                  <td className="py-2 px-3 font-mono text-xs">{a.accountCode}</td>
                  <td className="py-2 px-3">{a.accountName}</td>
                  <td className="py-2 px-3 text-right">{a.debit.toLocaleString("fr-FR")}</td>
                  <td className="py-2 px-3 text-right">{a.credit.toLocaleString("fr-FR")}</td>
                  <td className={`py-2 px-3 text-right font-medium ${a.balance >= 0 ? "text-green-600" : "text-red-600"}`}>
                    {a.balance.toLocaleString("fr-FR")}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 font-bold">
                <td className="py-3 px-3" colSpan={2}>TOTAUX</td>
                <td className="py-3 px-3 text-right">{totalDebit.toLocaleString("fr-FR")}</td>
                <td className="py-3 px-3 text-right">{totalCredit.toLocaleString("fr-FR")}</td>
                <td className={`py-3 px-3 text-right ${netBalance >= 0 ? "text-green-600" : "text-red-600"}`}>{netBalance.toLocaleString("fr-FR")}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}
