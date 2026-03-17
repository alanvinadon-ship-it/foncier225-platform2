import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { trpc } from "@/lib/trpc";
import { Eye, MapPin, Plus } from "lucide-react";
import { useState } from "react";
import { Link } from "wouter";
import { toast } from "sonner";

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  dossier_en_cours: { label: "En cours", color: "bg-blue-50 text-blue-700" },
  en_opposition: { label: "Opposition", color: "bg-orange-50 text-orange-700" },
  gele: { label: "Gelé", color: "bg-red-50 text-red-700" },
  mediation_en_cours: { label: "Médiation", color: "bg-yellow-50 text-yellow-700" },
  acte_notarie_enregistre: { label: "Acte notarié", color: "bg-purple-50 text-purple-700" },
  valide: { label: "Validé", color: "bg-green-50 text-green-700" },
};

export default function ParcelsAdmin() {
  const { data: parcelsList, isLoading, refetch } = trpc.admin.listParcels.useQuery();
  const createParcel = trpc.admin.createParcel.useMutation({
    onSuccess: () => {
      toast.success("Parcelle créée");
      refetch();
      setShowCreate(false);
    },
    onError: (err: any) => toast.error(err.message),
  });

  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({
    reference: "",
    zoneCode: "",
    localisation: "",
    surfaceApprox: "",
    statusPublic: "dossier_en_cours",
  });

  const handleCreate = () => {
    if (!form.reference || !form.zoneCode) {
      toast.error("Référence et zone sont obligatoires");
      return;
    }
    createParcel.mutate(form as any);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <MapPin className="h-6 w-6 text-ci-orange" />
            Gestion des parcelles
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Créez et gérez les parcelles enregistrées dans le système
          </p>
        </div>
        <Dialog open={showCreate} onOpenChange={setShowCreate}>
          <DialogTrigger asChild>
            <Button className="bg-ci-green hover:bg-ci-green/90">
              <Plus className="h-4 w-4 mr-2" />
              Nouvelle parcelle
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Créer une parcelle</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <label className="text-sm font-medium mb-1.5 block">Référence *</label>
                <Input
                  placeholder="ex: ABJ-2025-001"
                  value={form.reference}
                  onChange={e => setForm({ ...form, reference: e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Zone *</label>
                <Input
                  placeholder="ex: ABJ-COCODY"
                  value={form.zoneCode}
                  onChange={e => setForm({ ...form, zoneCode: e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Localisation</label>
                <Input
                  placeholder="ex: Cocody, Abidjan"
                  value={form.localisation}
                  onChange={e => setForm({ ...form, localisation: e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Surface approx.</label>
                <Input
                  placeholder="ex: 500 m²"
                  value={form.surfaceApprox}
                  onChange={e => setForm({ ...form, surfaceApprox: e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Statut initial</label>
                <Select value={form.statusPublic} onValueChange={v => setForm({ ...form, statusPublic: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(STATUS_LABELS).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={handleCreate} className="w-full bg-ci-green hover:bg-ci-green/90" disabled={createParcel.isPending}>
                {createParcel.isPending ? "Création..." : "Créer la parcelle"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Référence</TableHead>
              <TableHead>Zone</TableHead>
              <TableHead>Localisation</TableHead>
              <TableHead>Surface</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead>Créée le</TableHead>
              <TableHead className="w-16">Voir</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 7 }).map((_, j) => (
                    <TableCell key={j}><Skeleton className="h-5 w-20" /></TableCell>
                  ))}
                </TableRow>
              ))
            ) : parcelsList && parcelsList.length > 0 ? (
              parcelsList.map((p: any) => {
                const sCfg = STATUS_LABELS[p.statusPublic] || STATUS_LABELS.dossier_en_cours;
                return (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium font-mono text-sm">{p.reference}</TableCell>
                    <TableCell className="text-sm">{p.zoneCode}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{p.localisation || "—"}</TableCell>
                    <TableCell className="text-sm">{p.surfaceApprox || "—"}</TableCell>
                    <TableCell>
                      <Badge className={`${sCfg.color} text-xs`}>{sCfg.label}</Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(p.createdAt).toLocaleDateString("fr-FR")}
                    </TableCell>
                    <TableCell>
                      <Link href={`/parcelle/${p.publicToken}`}>
                        <Button variant="ghost" size="sm">
                          <Eye className="h-3.5 w-3.5" />
                        </Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                );
              })
            ) : (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  Aucune parcelle enregistrée
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
