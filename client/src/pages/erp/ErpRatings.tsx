import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Star, TrendingUp, TrendingDown, BarChart3, Plus } from "lucide-react";
import { toast } from "sonner";

const CRITERIA_LABELS: Record<string, string> = {
  qualityScore: "Qualité",
  delayScore: "Délai",
  costScore: "Coût",
  safetyScore: "Sécurité",
  complianceScore: "Conformité",
  communicationScore: "Communication",
};

function ScoreStars({ score }: { score: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          size={14}
          className={i <= score ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"}
        />
      ))}
      <span className="ml-1 text-xs text-muted-foreground">{score}/5</span>
    </div>
  );
}

function ScoreInput({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs">{label}</Label>
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((i) => (
          <button
            key={i}
            type="button"
            onClick={() => onChange(i)}
            className="p-0.5 hover:scale-110 transition-transform"
          >
            <Star
              size={20}
              className={i <= value ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30 hover:text-amber-200"}
            />
          </button>
        ))}
      </div>
    </div>
  );
}

export default function ErpRatings() {
  const [tab, setTab] = useState("dashboard");
  const [createOpen, setCreateOpen] = useState(false);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Performance & Évaluations</h1>
          <p className="text-muted-foreground">Évaluation des fournisseurs et sous-traitants</p>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button><Plus size={16} className="mr-2" />Nouvelle évaluation</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Nouvelle évaluation</DialogTitle>
            </DialogHeader>
            <CreateRatingForm onSuccess={() => setCreateOpen(false)} />
          </DialogContent>
        </Dialog>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="dashboard"><BarChart3 size={14} className="mr-1" />Dashboard</TabsTrigger>
          <TabsTrigger value="top"><TrendingUp size={14} className="mr-1" />Meilleurs</TabsTrigger>
          <TabsTrigger value="low"><TrendingDown size={14} className="mr-1" />À améliorer</TabsTrigger>
          <TabsTrigger value="history"><Star size={14} className="mr-1" />Historique</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="mt-4">
          <DashboardTab />
        </TabsContent>
        <TabsContent value="top" className="mt-4">
          <RankingTab type="top" />
        </TabsContent>
        <TabsContent value="low" className="mt-4">
          <RankingTab type="low" />
        </TabsContent>
        <TabsContent value="history" className="mt-4">
          <HistoryTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function DashboardTab() {
  const { data: stats } = trpc.erp.ratings.stats.useQuery();

  if (!stats) return <div className="text-muted-foreground">Chargement...</div>;

  const criteria = [
    { label: "Qualité", value: stats.avgQuality },
    { label: "Délai", value: stats.avgDelay },
    { label: "Coût", value: stats.avgCost },
    { label: "Sécurité", value: stats.avgSafety },
    { label: "Conformité", value: stats.avgCompliance },
    { label: "Communication", value: stats.avgCommunication },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Total évaluations</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalRatings}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Score moyen</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.avgOverall ? (stats.avgOverall / 100).toFixed(1) : "—"}/5</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Fournisseurs évalués</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.ratedVendors}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Entrepreneurs évalués</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.ratedContractors}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Moyennes par critère</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {criteria.map((c) => (
              <div key={c.label} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                <span className="text-sm font-medium">{c.label}</span>
                <ScoreStars score={Math.round(c.value || 0)} />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function RankingTab({ type }: { type: "top" | "low" }) {
  const [filter, setFilter] = useState<"all" | "vendor" | "contractor">("all");

  const { data: topData } = trpc.erp.ratings.top.useQuery(
    { rateableType: filter === "all" ? undefined : filter, limit: 10 },
    { enabled: type === "top" }
  );
  const { data: lowData } = trpc.erp.ratings.low.useQuery(
    { rateableType: filter === "all" ? undefined : filter, limit: 10 },
    { enabled: type === "low" }
  );

  const data = type === "top" ? topData : lowData;

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Button variant={filter === "all" ? "default" : "outline"} size="sm" onClick={() => setFilter("all")}>Tous</Button>
        <Button variant={filter === "vendor" ? "default" : "outline"} size="sm" onClick={() => setFilter("vendor")}>Fournisseurs</Button>
        <Button variant={filter === "contractor" ? "default" : "outline"} size="sm" onClick={() => setFilter("contractor")}>Entrepreneurs</Button>
      </div>

      {!data?.items?.length ? (
        <p className="text-muted-foreground text-sm">Aucune évaluation trouvée.</p>
      ) : (
        <div className="space-y-2">
          {data.items.map((item: any, idx: number) => (
            <Card key={`${item.rateableType}-${item.rateableId}`}>
              <CardContent className="flex items-center justify-between py-3 px-4">
                <div className="flex items-center gap-3">
                  <span className="text-lg font-bold text-muted-foreground w-8">#{idx + 1}</span>
                  <div>
                    <p className="font-medium">{item.name}</p>
                    <p className="text-xs text-muted-foreground capitalize">{item.rateableType === "vendor" ? "Fournisseur" : "Entrepreneur"} · {item.totalRatings} évaluation(s)</p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold">{(item.avgOverall / 100).toFixed(1)}/5</div>
                  <div className="flex gap-1 mt-1">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <Star key={i} size={12} className={i <= Math.round(item.avgOverall / 100) ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"} />
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function HistoryTab() {
  const [typeFilter, setTypeFilter] = useState<"all" | "vendor" | "contractor">("all");
  const { data } = trpc.erp.ratings.list.useQuery({
    rateableType: typeFilter === "all" ? undefined : typeFilter,
    limit: 50,
  });

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Button variant={typeFilter === "all" ? "default" : "outline"} size="sm" onClick={() => setTypeFilter("all")}>Tous</Button>
        <Button variant={typeFilter === "vendor" ? "default" : "outline"} size="sm" onClick={() => setTypeFilter("vendor")}>Fournisseurs</Button>
        <Button variant={typeFilter === "contractor" ? "default" : "outline"} size="sm" onClick={() => setTypeFilter("contractor")}>Entrepreneurs</Button>
      </div>

      {!data?.items?.length ? (
        <p className="text-muted-foreground text-sm">Aucune évaluation trouvée.</p>
      ) : (
        <div className="space-y-2">
          {data.items.map((item) => (
            <Card key={item.id}>
              <CardContent className="py-3 px-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium capitalize">
                      {item.rateableType === "vendor" ? "Fournisseur" : "Entrepreneur"} #{item.rateableId}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(item.createdAt).toLocaleDateString("fr-FR")}
                      {item.comment && ` — ${item.comment.substring(0, 60)}${item.comment.length > 60 ? "..." : ""}`}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="font-bold">{(item.overallScore / 100).toFixed(1)}/5</div>
                  </div>
                </div>
                <div className="grid grid-cols-3 md:grid-cols-6 gap-2 mt-2">
                  {Object.entries(CRITERIA_LABELS).map(([key, label]) => (
                    <div key={key} className="text-center">
                      <p className="text-[10px] text-muted-foreground">{label}</p>
                      <p className="text-xs font-medium">{(item as any)[key]}/5</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function CreateRatingForm({ onSuccess }: { onSuccess: () => void }) {
  const [rateableType, setRateableType] = useState<"vendor" | "contractor">("vendor");
  const [rateableId, setRateableId] = useState("");
  const [comment, setComment] = useState("");
  const [scores, setScores] = useState({
    qualityScore: 3,
    delayScore: 3,
    costScore: 3,
    safetyScore: 3,
    complianceScore: 3,
    communicationScore: 3,
  });

  const utils = trpc.useUtils();
  const createMutation = trpc.erp.ratings.create.useMutation({
    onSuccess: () => {
      toast.success("Évaluation enregistrée");
      utils.erp.ratings.invalidate();
      onSuccess();
    },
    onError: (err) => toast.error(err.message),
  });

  const { data: vendors } = trpc.erp.vendors.list.useQuery({ limit: 100 }, { enabled: rateableType === "vendor" });
  const { data: contractors } = trpc.erp.contractors.list.useQuery({ limit: 100 }, { enabled: rateableType === "contractor" });

  const entities = rateableType === "vendor"
    ? (vendors?.items || []).map((v) => ({ id: v.id, name: v.name }))
    : (contractors?.items || []).map((c) => ({ id: c.id, name: c.name }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!rateableId) { toast.error("Sélectionnez un partenaire"); return; }
    createMutation.mutate({
      rateableType,
      rateableId: Number(rateableId),
      ...scores,
      comment: comment || undefined,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label className="text-xs">Type</Label>
          <Select value={rateableType} onValueChange={(v) => { setRateableType(v as any); setRateableId(""); }}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="vendor">Fournisseur</SelectItem>
              <SelectItem value="contractor">Entrepreneur</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Partenaire</Label>
          <Select value={rateableId} onValueChange={setRateableId}>
            <SelectTrigger><SelectValue placeholder="Sélectionner..." /></SelectTrigger>
            <SelectContent>
              {entities.map((e) => (
                <SelectItem key={e.id} value={String(e.id)}>{e.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {Object.entries(CRITERIA_LABELS).map(([key, label]) => (
          <ScoreInput
            key={key}
            label={label}
            value={(scores as any)[key]}
            onChange={(v) => setScores((prev) => ({ ...prev, [key]: v }))}
          />
        ))}
      </div>

      <div className="space-y-1">
        <Label className="text-xs">Commentaire (optionnel)</Label>
        <Textarea value={comment} onChange={(e) => setComment(e.target.value)} rows={2} placeholder="Remarques sur la performance..." />
      </div>

      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          Score global : <span className="font-bold">
            {((scores.qualityScore + scores.delayScore + scores.costScore + scores.safetyScore + scores.complianceScore + scores.communicationScore) / 6).toFixed(1)}/5
          </span>
        </div>
        <Button type="submit" disabled={createMutation.isPending}>
          {createMutation.isPending ? "Enregistrement..." : "Enregistrer"}
        </Button>
      </div>
    </form>
  );
}
