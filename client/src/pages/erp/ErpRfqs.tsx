import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { FileText, Plus, Send, Award, ArrowRight, Clock, CheckCircle2, XCircle } from "lucide-react";
import { useLocation } from "wouter";

const statusLabels: Record<string, string> = {
  draft: "Brouillon",
  sent: "Envoyée",
  responses_pending: "Réponses en attente",
  responses_received: "Réponses reçues",
  under_evaluation: "En évaluation",
  awarded: "Attribuée",
  converted_to_po: "Convertie en BC",
  cancelled: "Annulée",
  expired: "Expirée",
};

const statusColors: Record<string, string> = {
  draft: "bg-gray-100 text-gray-700",
  sent: "bg-blue-100 text-blue-700",
  responses_pending: "bg-yellow-100 text-yellow-700",
  responses_received: "bg-indigo-100 text-indigo-700",
  under_evaluation: "bg-purple-100 text-purple-700",
  awarded: "bg-green-100 text-green-700",
  converted_to_po: "bg-emerald-100 text-emerald-700",
  cancelled: "bg-red-100 text-red-700",
  expired: "bg-orange-100 text-orange-700",
};

export default function ErpRfqs() {
  
  const [, navigate] = useLocation();
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [showCreate, setShowCreate] = useState(false);
  const [newRfq, setNewRfq] = useState({ title: "", description: "", selectionMethod: "lowest_price" });

  const { data, refetch } = trpc.erp.rfq.crud.list.useQuery({ status: statusFilter || undefined, limit: 100 });
  const createMutation = trpc.erp.rfq.crud.create.useMutation({
    onSuccess: (result) => {
      toast.success(`RFQ créée: ${result.rfqNumber}`);
      setShowCreate(false);
      setNewRfq({ title: "", description: "", selectionMethod: "lowest_price" });
      refetch();
    },
    onError: (err) => toast.error(err.message),
  });

  const handleCreate = () => {
    if (!newRfq.title.trim()) return toast.error("Titre requis");
    createMutation.mutate({ title: newRfq.title, description: newRfq.description, issueDate: Date.now(), selectionMethod: newRfq.selectionMethod });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Demandes de Prix (RFQ)</h1>
          <p className="text-sm text-muted-foreground mt-1">Gérez vos appels d'offres et comparez les propositions fournisseurs</p>
        </div>
        <Dialog open={showCreate} onOpenChange={setShowCreate}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" />Nouvelle RFQ</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Créer une Demande de Prix</DialogTitle></DialogHeader>
            <div className="space-y-4 pt-4">
              <div>
                <Label>Titre *</Label>
                <Input value={newRfq.title} onChange={(e) => setNewRfq({ ...newRfq, title: e.target.value })} placeholder="Ex: Fourniture ciment Portland" />
              </div>
              <div>
                <Label>Description</Label>
                <Textarea value={newRfq.description} onChange={(e) => setNewRfq({ ...newRfq, description: e.target.value })} placeholder="Détails de la demande..." />
              </div>
              <div>
                <Label>Méthode de sélection</Label>
                <Select value={newRfq.selectionMethod} onValueChange={(v) => setNewRfq({ ...newRfq, selectionMethod: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="lowest_price">Prix le plus bas</SelectItem>
                    <SelectItem value="best_delivery_time">Meilleur délai</SelectItem>
                    <SelectItem value="best_score">Meilleur score pondéré</SelectItem>
                    <SelectItem value="manual">Sélection manuelle</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={handleCreate} disabled={createMutation.isPending} className="w-full">
                {createMutation.isPending ? "Création..." : "Créer la RFQ"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <div className="flex gap-3">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-48"><SelectValue placeholder="Tous les statuts" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les statuts</SelectItem>
            {Object.entries(statusLabels).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardContent className="pt-4 text-center">
          <div className="text-2xl font-bold">{data?.total || 0}</div>
          <div className="text-xs text-muted-foreground">Total RFQ</div>
        </CardContent></Card>
        <Card><CardContent className="pt-4 text-center">
          <div className="text-2xl font-bold text-blue-600">{data?.items.filter((r: any) => r.status === "sent").length || 0}</div>
          <div className="text-xs text-muted-foreground">Envoyées</div>
        </CardContent></Card>
        <Card><CardContent className="pt-4 text-center">
          <div className="text-2xl font-bold text-indigo-600">{data?.items.filter((r: any) => r.status === "responses_received").length || 0}</div>
          <div className="text-xs text-muted-foreground">Réponses reçues</div>
        </CardContent></Card>
        <Card><CardContent className="pt-4 text-center">
          <div className="text-2xl font-bold text-green-600">{data?.items.filter((r: any) => r.status === "awarded").length || 0}</div>
          <div className="text-xs text-muted-foreground">Attribuées</div>
        </CardContent></Card>
      </div>

      {/* List */}
      <Card>
        <CardHeader><CardTitle className="text-lg">Liste des RFQ</CardTitle></CardHeader>
        <CardContent>
          {!data?.items.length ? (
            <div className="text-center py-12 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>Aucune demande de prix</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="pb-3 font-medium">N° RFQ</th>
                    <th className="pb-3 font-medium">Titre</th>
                    <th className="pb-3 font-medium">Date émission</th>
                    <th className="pb-3 font-medium">Date limite</th>
                    <th className="pb-3 font-medium">Statut</th>
                    <th className="pb-3 font-medium">Méthode</th>
                    <th className="pb-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((rfq: any) => (
                    <tr key={rfq.id} className="border-b hover:bg-muted/50 cursor-pointer" onClick={() => navigate(`/erp/rfqs/${rfq.id}`)}>
                      <td className="py-3 font-mono text-xs">{rfq.rfqNumber}</td>
                      <td className="py-3 font-medium">{rfq.title}</td>
                      <td className="py-3">{new Date(rfq.issueDate).toLocaleDateString("fr-FR")}</td>
                      <td className="py-3">{rfq.responseDeadline ? new Date(rfq.responseDeadline).toLocaleDateString("fr-FR") : "—"}</td>
                      <td className="py-3">
                        <Badge className={statusColors[rfq.status] || ""}>{statusLabels[rfq.status] || rfq.status}</Badge>
                      </td>
                      <td className="py-3 text-xs capitalize">{rfq.selectionMethod?.replace(/_/g, " ")}</td>
                      <td className="py-3">
                        <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); navigate(`/erp/rfqs/${rfq.id}`); }}>
                          <ArrowRight className="h-4 w-4" />
                        </Button>
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
