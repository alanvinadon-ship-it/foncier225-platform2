import { useState } from "react";
import { trpc } from "../../lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { FileText, Plus, CheckCircle, Clock, Send, Lock, MessageSquare } from "lucide-react";

export default function ErpDirectionReviews() {
  const [showCreate, setShowCreate] = useState(false);
  const [showDetail, setShowDetail] = useState<number | null>(null);
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [comment, setComment] = useState("");
  const [commentType, setCommentType] = useState("observation");

  const reviewsQuery = trpc.erp.directionReviews.list.useQuery();
  const detailQuery = trpc.erp.directionReviews.getById.useQuery({ id: showDetail! }, { enabled: !!showDetail });
  const commentsQuery = trpc.erp.directionReviews.listComments.useQuery({ reviewId: showDetail! }, { enabled: !!showDetail });

  const createMutation = trpc.erp.directionReviews.create.useMutation({
    onSuccess: () => { toast.success("Revue créée"); reviewsQuery.refetch(); setShowCreate(false); setTitle(""); setSummary(""); },
    onError: (e) => toast.error(e.message),
  });
  const submitMutation = trpc.erp.directionReviews.submit.useMutation({
    onSuccess: () => { toast.success("Revue soumise"); reviewsQuery.refetch(); detailQuery.refetch(); },
    onError: (e) => toast.error(e.message),
  });
  const approveMutation = trpc.erp.directionReviews.approve.useMutation({
    onSuccess: () => { toast.success("Revue approuvée"); reviewsQuery.refetch(); detailQuery.refetch(); },
    onError: (e) => toast.error(e.message),
  });
  const closeMutation = trpc.erp.directionReviews.close.useMutation({
    onSuccess: () => { toast.success("Revue clôturée"); reviewsQuery.refetch(); detailQuery.refetch(); },
    onError: (e) => toast.error(e.message),
  });
  const addCommentMutation = trpc.erp.directionReviews.addComment.useMutation({
    onSuccess: () => { toast.success("Commentaire ajouté"); commentsQuery.refetch(); setComment(""); },
    onError: (e) => toast.error(e.message),
  });

  const reviews = reviewsQuery.data ?? [];
  const detail = detailQuery.data;
  const comments_ = commentsQuery.data ?? [];

  const statusLabel: Record<string, string> = { draft: "Brouillon", in_review: "En révision", approved: "Approuvée", closed: "Clôturée" };
  const statusColor: Record<string, "default" | "secondary" | "destructive" | "outline"> = { draft: "secondary", in_review: "outline", approved: "default", closed: "default" };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Revues Mensuelles de Direction</h1>
          <p className="text-muted-foreground">Suivi des revues, commentaires et décisions</p>
        </div>
        <Dialog open={showCreate} onOpenChange={setShowCreate}>
          <DialogTrigger asChild><Button><Plus className="w-4 h-4 mr-2" />Nouvelle revue</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Créer une revue de direction</DialogTitle></DialogHeader>
            <div className="space-y-4 pt-4">
              <div><Label>Titre</Label><Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Revue Direction — Juin 2026" /></div>
              <div><Label>Résumé</Label><Textarea value={summary} onChange={e => setSummary(e.target.value)} placeholder="Points clés de la revue..." /></div>
              <Button onClick={() => createMutation.mutate({ title, summary })} disabled={createMutation.isPending || !title} className="w-full">
                {createMutation.isPending ? "Création..." : "Créer"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Liste des revues */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {reviews.map((r: any) => (
          <Card key={r.id} className="cursor-pointer hover:border-primary/50 transition-colors" onClick={() => setShowDetail(r.id)}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium truncate">{r.title}</CardTitle>
                <Badge variant={statusColor[r.status] || "secondary"}>{statusLabel[r.status] || r.status}</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Clock className="w-3 h-3" />
                <span>{r.reviewNumber} — {new Date(r.createdAt).toLocaleDateString("fr-FR")}</span>
              </div>
              {r.summary && <p className="text-xs text-muted-foreground mt-2 line-clamp-2">{r.summary}</p>}
            </CardContent>
          </Card>
        ))}
        {reviews.length === 0 && <p className="text-muted-foreground col-span-full">Aucune revue créée</p>}
      </div>

      {/* Détail d'une revue */}
      <Dialog open={!!showDetail} onOpenChange={() => setShowDetail(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              {detail?.title || "Revue"}
            </DialogTitle>
          </DialogHeader>
          {detail && (
            <div className="space-y-4 pt-2">
              <div className="flex items-center gap-2">
                <Badge variant={statusColor[detail.status] || "secondary"}>{statusLabel[detail.status] || detail.status}</Badge>
                <span className="text-xs text-muted-foreground">{detail.reviewNumber}</span>
              </div>
              {detail.summary && <p className="text-sm">{detail.summary}</p>}
              {detail.keyRisks && <div><Label className="text-xs">Risques clés</Label><p className="text-sm text-muted-foreground">{detail.keyRisks}</p></div>}
              {detail.keyDecisions && <div><Label className="text-xs">Décisions</Label><p className="text-sm text-muted-foreground">{detail.keyDecisions}</p></div>}

              {/* Actions workflow */}
              <div className="flex gap-2 pt-2">
                {detail.status === "draft" && <Button size="sm" onClick={() => submitMutation.mutate({ id: detail.id })}><Send className="w-3 h-3 mr-1" />Soumettre</Button>}
                {detail.status === "in_review" && <Button size="sm" onClick={() => approveMutation.mutate({ id: detail.id })}><CheckCircle className="w-3 h-3 mr-1" />Approuver</Button>}
                {detail.status === "approved" && <Button size="sm" variant="outline" onClick={() => closeMutation.mutate({ id: detail.id })}><Lock className="w-3 h-3 mr-1" />Clôturer</Button>}
              </div>

              {/* Commentaires */}
              <div className="border-t pt-4">
                <h4 className="text-sm font-medium flex items-center gap-2 mb-3"><MessageSquare className="w-4 h-4" />Commentaires ({comments_.length})</h4>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {comments_.map((c: any) => (
                    <div key={c.id} className="p-2 border rounded text-sm">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline" className="text-xs">{c.commentType}</Badge>
                        {c.section && <span className="text-xs text-muted-foreground">§ {c.section}</span>}
                      </div>
                      <p className="text-sm">{c.comment}</p>
                      <p className="text-xs text-muted-foreground mt-1">{new Date(c.createdAt).toLocaleString("fr-FR")}</p>
                    </div>
                  ))}
                </div>
                {detail.status !== "closed" && (
                  <div className="flex gap-2 mt-3">
                    <Select value={commentType} onValueChange={setCommentType}>
                      <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="observation">Observation</SelectItem>
                        <SelectItem value="risk">Risque</SelectItem>
                        <SelectItem value="decision">Décision</SelectItem>
                        <SelectItem value="recommendation">Recommandation</SelectItem>
                      </SelectContent>
                    </Select>
                    <Input value={comment} onChange={e => setComment(e.target.value)} placeholder="Ajouter un commentaire..." className="flex-1" />
                    <Button size="sm" onClick={() => addCommentMutation.mutate({ reviewId: detail.id, comment, commentType: commentType as any })} disabled={!comment || addCommentMutation.isPending}>
                      Ajouter
                    </Button>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
