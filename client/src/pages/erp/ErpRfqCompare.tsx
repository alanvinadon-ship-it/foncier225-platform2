import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { ArrowLeft, Award, Sparkles } from "lucide-react";
import { useLocation, useParams } from "wouter";

export default function ErpRfqCompare() {
  const [, navigate] = useLocation();
  const params = useParams<{ id: string }>();
  const rfqId = parseInt(params.id || "0");

  const { data: comparison } = trpc.erp.rfq.comparison.compare.useQuery({ rfqId }, { enabled: rfqId > 0 });
  const autoSelectMutation = trpc.erp.rfq.comparison.autoSelect.useMutation({
    onSuccess: (r) => toast.success(`Suggestion: Fournisseur #${r.vendorId} (${(r.totalAmount / 100).toLocaleString("fr-FR")} F)`),
    onError: (e) => toast.error(e.message),
  });
  const acceptMutation = trpc.erp.rfq.quotes.accept.useMutation({
    onSuccess: () => { toast.success("Offre attribuée"); navigate(`/erp/rfqs/${rfqId}`); },
    onError: (e) => toast.error(e.message),
  });

  const quotes = comparison?.quotes || [];
  const lowestPrice = quotes.length > 0 ? Math.min(...quotes.map((q: any) => q.totalAmount)) : 0;
  const fastestDelivery = quotes.length > 0 ? Math.min(...quotes.filter((q: any) => q.deliveryDelayDays).map((q: any) => q.deliveryDelayDays)) : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => navigate(`/erp/rfqs/${rfqId}`)}><ArrowLeft className="h-4 w-4 mr-1" />Retour</Button>
        <h1 className="text-xl font-bold flex-1">Comparaison des offres</h1>
        <Button onClick={() => autoSelectMutation.mutate({ rfqId })} disabled={autoSelectMutation.isPending}>
          <Sparkles className="h-4 w-4 mr-2" />Sélection auto
        </Button>
      </div>

      {quotes.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">Aucune offre à comparer</CardContent></Card>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm border">
            <thead>
              <tr className="bg-muted/50">
                <th className="p-3 text-left font-medium border-r">Critère</th>
                {quotes.map((q: any) => (
                  <th key={q.quoteId} className="p-3 text-center font-medium border-r min-w-[180px]">
                    <div>{q.vendor?.companyName || `Fournisseur #${q.vendor?.id || "?"}`}</div>
                    <Badge variant="outline" className="mt-1">{q.status}</Badge>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr className="border-t">
                <td className="p-3 font-medium border-r">Montant TTC</td>
                {quotes.map((q: any) => (
                  <td key={q.quoteId} className={`p-3 text-center border-r ${q.totalAmount === lowestPrice ? "bg-green-50 font-bold text-green-700" : ""}`}>
                    {(q.totalAmount / 100).toLocaleString("fr-FR")} F
                    {q.totalAmount === lowestPrice && <Badge className="ml-2 bg-green-600">Meilleur</Badge>}
                  </td>
                ))}
              </tr>
              <tr className="border-t">
                <td className="p-3 font-medium border-r">Sous-total HT</td>
                {quotes.map((q: any) => (
                  <td key={q.quoteId} className="p-3 text-center border-r">{(q.subtotalAmount / 100).toLocaleString("fr-FR")} F</td>
                ))}
              </tr>
              <tr className="border-t">
                <td className="p-3 font-medium border-r">TVA</td>
                {quotes.map((q: any) => (
                  <td key={q.quoteId} className="p-3 text-center border-r">{(q.taxAmount / 100).toLocaleString("fr-FR")} F</td>
                ))}
              </tr>
              <tr className="border-t">
                <td className="p-3 font-medium border-r">Délai livraison</td>
                {quotes.map((q: any) => (
                  <td key={q.quoteId} className={`p-3 text-center border-r ${q.deliveryDelayDays === fastestDelivery && fastestDelivery > 0 ? "bg-blue-50 font-bold text-blue-700" : ""}`}>
                    {q.deliveryDelayDays ? `${q.deliveryDelayDays} jours` : "—"}
                    {q.deliveryDelayDays === fastestDelivery && fastestDelivery > 0 && <Badge className="ml-2 bg-blue-600">Plus rapide</Badge>}
                  </td>
                ))}
              </tr>
              <tr className="border-t">
                <td className="p-3 font-medium border-r">Conditions paiement</td>
                {quotes.map((q: any) => (
                  <td key={q.quoteId} className="p-3 text-center border-r">{q.paymentTerms || "—"}</td>
                ))}
              </tr>
              <tr className="border-t">
                <td className="p-3 font-medium border-r">Score évaluation</td>
                {quotes.map((q: any) => (
                  <td key={q.quoteId} className="p-3 text-center border-r">{q.evaluationScore ? `${q.evaluationScore}/100` : "—"}</td>
                ))}
              </tr>
              <tr className="border-t">
                <td className="p-3 font-medium border-r">Validité</td>
                {quotes.map((q: any) => (
                  <td key={q.quoteId} className="p-3 text-center border-r">
                    {q.validUntil ? new Date(q.validUntil).toLocaleDateString("fr-FR") : "—"}
                    {q.validUntil && q.validUntil < Date.now() && <Badge variant="destructive" className="ml-1">Expirée</Badge>}
                  </td>
                ))}
              </tr>
              <tr className="border-t bg-muted/30">
                <td className="p-3 font-medium border-r">Action</td>
                {quotes.map((q: any) => (
                  <td key={q.quoteId} className="p-3 text-center border-r">
                    {q.status === "received" && (
                      <Button size="sm" onClick={() => acceptMutation.mutate({ quoteId: q.quoteId })} disabled={acceptMutation.isPending}>
                        <Award className="h-3 w-3 mr-1" />Attribuer
                      </Button>
                    )}
                    {q.status === "accepted" && <Badge className="bg-green-600">Attribuée</Badge>}
                    {q.status === "rejected" && <Badge variant="destructive">Rejetée</Badge>}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
