import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { CheckCircle2, XCircle, AlertTriangle, ArrowUpRight, Link2, Eye } from "lucide-react";
import { useLocation } from "wouter";

const matchStatusLabels: Record<string, string> = {
  auto_matched: "Rapproché auto",
  partial_match: "Partiel",
  variance_detected: "Écart détecté",
  manual_review: "Revue manuelle",
  rejected: "Rejeté",
  approved: "Approuvé",
};

const matchStatusColors: Record<string, string> = {
  auto_matched: "bg-green-100 text-green-700",
  partial_match: "bg-yellow-100 text-yellow-700",
  variance_detected: "bg-red-100 text-red-700",
  manual_review: "bg-orange-100 text-orange-700",
  rejected: "bg-gray-100 text-gray-700",
  approved: "bg-emerald-100 text-emerald-700",
};

const approvalLabels: Record<string, string> = {
  pending_review: "En attente",
  approved: "Approuvé",
  rejected: "Rejeté",
  escalated: "Escaladé",
};

export default function ErpInvoiceMatching() {
  const [, navigate] = useLocation();
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [showMatch, setShowMatch] = useState(false);
  const [matchInput, setMatchInput] = useState({ invoiceId: "", purchaseOrderId: "" });
  const [selectedMatch, setSelectedMatch] = useState<number | null>(null);
  const [approvalNotes, setApprovalNotes] = useState("");

  const { data, refetch } = trpc.erp.invoiceMatching.matches.list.useQuery({ status: statusFilter || undefined, limit: 100 });
  const { data: pendingData } = trpc.erp.invoiceMatching.matches.pendingReview.useQuery();
  const { data: varianceData } = trpc.erp.invoiceMatching.matches.variances.useQuery();

  const matchMutation = trpc.erp.invoiceMatching.autoMatch.matchInvoice.useMutation({
    onSuccess: (r) => {
      toast.success(`Rapprochement effectué (score: ${r.matchScore}/100)`);
      setShowMatch(false);
      refetch();
    },
    onError: (e) => toast.error(e.message),
  });

  const approveMutation = trpc.erp.invoiceMatching.approval.approve.useMutation({
    onSuccess: () => { toast.success("Rapprochement approuvé"); setSelectedMatch(null); refetch(); },
  });
  const rejectMutation = trpc.erp.invoiceMatching.approval.reject.useMutation({
    onSuccess: () => { toast.success("Rapprochement rejeté"); setSelectedMatch(null); refetch(); },
  });
  const escalateMutation = trpc.erp.invoiceMatching.approval.escalate.useMutation({
    onSuccess: () => { toast.success("Rapprochement escaladé"); setSelectedMatch(null); refetch(); },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Rapprochement Factures / BC</h1>
          <p className="text-sm text-muted-foreground mt-1">Matching automatique et validation des écarts</p>
        </div>
        <Dialog open={showMatch} onOpenChange={setShowMatch}>
          <DialogTrigger asChild>
            <Button><Link2 className="h-4 w-4 mr-2" />Rapprocher une facture</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Rapprochement automatique</DialogTitle></DialogHeader>
            <div className="space-y-4 pt-4">
              <div><Label>ID Facture *</Label><Input type="number" value={matchInput.invoiceId} onChange={(e) => setMatchInput({ ...matchInput, invoiceId: e.target.value })} /></div>
              <div><Label>ID Bon de commande (optionnel)</Label><Input type="number" value={matchInput.purchaseOrderId} onChange={(e) => setMatchInput({ ...matchInput, purchaseOrderId: e.target.value })} placeholder="Laissez vide pour auto-détection" /></div>
              <Button onClick={() => matchMutation.mutate({ invoiceId: parseInt(matchInput.invoiceId), purchaseOrderId: matchInput.purchaseOrderId ? parseInt(matchInput.purchaseOrderId) : undefined })} disabled={!matchInput.invoiceId || matchMutation.isPending}>
                {matchMutation.isPending ? "Analyse..." : "Lancer le rapprochement"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardContent className="pt-4 text-center">
          <div className="text-2xl font-bold">{data?.total || 0}</div>
          <div className="text-xs text-muted-foreground">Total rapprochements</div>
        </CardContent></Card>
        <Card><CardContent className="pt-4 text-center">
          <div className="text-2xl font-bold text-yellow-600">{pendingData?.length || 0}</div>
          <div className="text-xs text-muted-foreground">En attente de revue</div>
        </CardContent></Card>
        <Card><CardContent className="pt-4 text-center">
          <div className="text-2xl font-bold text-red-600">{varianceData?.length || 0}</div>
          <div className="text-xs text-muted-foreground">Écarts détectés</div>
        </CardContent></Card>
        <Card><CardContent className="pt-4 text-center">
          <div className="text-2xl font-bold text-green-600">{data?.items.filter((m: any) => m.approvalStatus === "approved").length || 0}</div>
          <div className="text-xs text-muted-foreground">Approuvés</div>
        </CardContent></Card>
      </div>

      {/* Filter */}
      <div className="flex gap-3">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-48"><SelectValue placeholder="Tous les statuts" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les statuts</SelectItem>
            {Object.entries(matchStatusLabels).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* List */}
      <Card>
        <CardHeader><CardTitle className="text-lg">Rapprochements</CardTitle></CardHeader>
        <CardContent>
          {!data?.items.length ? (
            <div className="text-center py-12 text-muted-foreground">
              <Link2 className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>Aucun rapprochement effectué</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="pb-3 font-medium">Facture</th>
                    <th className="pb-3 font-medium">BC</th>
                    <th className="pb-3 font-medium">Score</th>
                    <th className="pb-3 font-medium">Écart total</th>
                    <th className="pb-3 font-medium">% Écart</th>
                    <th className="pb-3 font-medium">Statut match</th>
                    <th className="pb-3 font-medium">Approbation</th>
                    <th className="pb-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((m: any) => (
                    <tr key={m.id} className="border-b hover:bg-muted/50">
                      <td className="py-3">Facture #{m.invoiceId}</td>
                      <td className="py-3">BC #{m.purchaseOrderId}</td>
                      <td className="py-3">
                        <span className={`font-medium ${m.matchScore >= 80 ? "text-green-600" : m.matchScore >= 50 ? "text-yellow-600" : "text-red-600"}`}>
                          {m.matchScore}/100
                        </span>
                      </td>
                      <td className="py-3 font-mono">{((m.totalVarianceAmount || 0) / 100).toLocaleString("fr-FR")} F</td>
                      <td className="py-3">{((m.variancePercentage || 0) / 100).toFixed(1)}%</td>
                      <td className="py-3"><Badge className={matchStatusColors[m.matchStatus] || ""}>{matchStatusLabels[m.matchStatus] || m.matchStatus}</Badge></td>
                      <td className="py-3"><Badge variant="outline">{approvalLabels[m.approvalStatus] || m.approvalStatus}</Badge></td>
                      <td className="py-3">
                        <div className="flex gap-1">
                          {m.approvalStatus === "pending_review" && (
                            <>
                              <Button size="sm" variant="default" onClick={() => approveMutation.mutate({ id: m.id })}><CheckCircle2 className="h-3 w-3" /></Button>
                              <Button size="sm" variant="destructive" onClick={() => rejectMutation.mutate({ id: m.id })}><XCircle className="h-3 w-3" /></Button>
                              <Button size="sm" variant="outline" onClick={() => escalateMutation.mutate({ id: m.id })}><ArrowUpRight className="h-3 w-3" /></Button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
