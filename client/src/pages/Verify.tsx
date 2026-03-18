import PublicLayout from "@/components/PublicLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  QrCode,
  Search,
  Shield,
  XCircle,
} from "lucide-react";
import { useEffect, useState } from "react";

const STATUS_MAP: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  active: { label: "Valide", icon: CheckCircle2, color: "text-green-600" },
  rotated: { label: "Remplacé", icon: Clock, color: "text-yellow-600" },
  revoked: { label: "Révoqué", icon: XCircle, color: "text-red-600" },
};

export default function Verify() {
  const initialToken =
    typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("token") ?? "" : "";
  const [tokenInput, setTokenInput] = useState(initialToken);
  const [searchToken, setSearchToken] = useState(initialToken);

  useEffect(() => {
    if (!initialToken) return;
    setTokenInput(initialToken);
    setSearchToken(initialToken);
  }, [initialToken]);

  const { data, isLoading, error } = trpc.verify.check.useQuery(
    { token: searchToken },
    { enabled: !!searchToken, retry: false }
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = tokenInput.trim();
    if (cleaned) setSearchToken(cleaned);
  };

  return (
    <PublicLayout>
      {/* Header */}
      <section className="bg-ci-green-light/50 border-b">
        <div className="container py-12 text-center">
          <div className="h-14 w-14 rounded-full bg-ci-green/10 flex items-center justify-center mx-auto mb-4">
            <QrCode className="h-7 w-7 text-ci-green" />
          </div>
          <h1 className="text-3xl font-bold mb-2">Vérifier un document</h1>
          <p className="text-muted-foreground max-w-lg mx-auto">
            Entrez le code de vérification figurant sur votre attestation ou scannez le QR code 
            pour vérifier instantanément l'authenticité du document.
          </p>
        </div>
      </section>

      <div className="container py-10">
        <div className="max-w-xl mx-auto">
          {/* Search form */}
          <form onSubmit={handleSubmit} className="flex gap-2 mb-8">
            <Input
              placeholder="Entrez le code de vérification..."
              value={tokenInput}
              onChange={e => setTokenInput(e.target.value)}
              className="flex-1 h-12 text-base"
            />
            <Button type="submit" size="lg" className="bg-ci-green hover:bg-ci-green/90 px-6" disabled={isLoading}>
              <Search className="h-4 w-4 mr-2" />
              Vérifier
            </Button>
          </form>

          {/* Results */}
          {isLoading && (
            <div className="text-center py-12">
              <div className="animate-spin h-8 w-8 border-2 border-ci-green border-t-transparent rounded-full mx-auto mb-3" />
              <p className="text-muted-foreground text-sm">Vérification en cours...</p>
            </div>
          )}

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center">
              <AlertTriangle className="h-8 w-8 text-red-500 mx-auto mb-3" />
              <h3 className="font-semibold text-red-800 mb-1">Vérification échouée</h3>
              <p className="text-sm text-red-600">
                {error.message.includes("Rate limit")
                  ? "Trop de tentatives. Veuillez réessayer dans quelques minutes."
                  : "Le code fourni ne correspond à aucun document enregistré."}
              </p>
            </div>
          )}

          {data && !isLoading && (
            <div className="rounded-lg border bg-card overflow-hidden">
              <div className={`p-6 ${data.status === "active" ? "bg-green-50" : data.status === "revoked" ? "bg-red-50" : "bg-yellow-50"}`}>
                <div className="flex items-center gap-3">
                  {(() => {
                    const cfg = STATUS_MAP[data.status] || STATUS_MAP.active;
                    const Icon = cfg.icon;
                    return (
                      <>
                        <Icon className={`h-8 w-8 ${cfg.color}`} />
                        <div>
                          <h3 className="font-bold text-lg">Document {cfg.label}</h3>
                          <p className="text-sm text-muted-foreground">
                            Type : {data.tokenType}
                          </p>
                        </div>
                      </>
                    );
                  })()}
                </div>
              </div>
              <div className="p-6 space-y-3">
                <InfoRow label="Type de document" value={data.tokenType} />
                <InfoRow label="Statut" value={STATUS_MAP[data.status]?.label || data.status} />
                {data.documentType && <InfoRow label="Categorie" value={data.documentType} />}
                {data.documentStatus && <InfoRow label="Statut du document" value={data.documentStatus} />}
                {data.documentReference && <InfoRow label="Reference document" value={data.documentReference} />}
                {data.decisionType && <InfoRow label="Decision finale" value={data.decisionType} />}
                {data.issuedMonth && <InfoRow label="Émis" value={data.issuedMonth} />}
                {data.issuedAt && (
                  <InfoRow label="Date d'emission" value={new Date(data.issuedAt).toLocaleDateString("fr-FR")} />
                )}
                {data.expiresAt && (
                  <InfoRow label="Expire le" value={new Date(data.expiresAt).toLocaleDateString("fr-FR")} />
                )}
                <div className="pt-3 border-t flex items-center gap-2 text-xs text-muted-foreground">
                  <Shield className="h-3 w-3" />
                  <span>Vérification effectuée le {new Date().toLocaleDateString("fr-FR")} à {new Date().toLocaleTimeString("fr-FR")}</span>
                </div>
              </div>
            </div>
          )}

          {/* Info box */}
          {!searchToken && (
            <div className="rounded-lg border bg-card p-6 mt-4">
              <h3 className="font-semibold mb-3">Comment vérifier ?</h3>
              <div className="space-y-3 text-sm text-muted-foreground">
                <div className="flex gap-3">
                  <Badge variant="secondary" className="h-6 w-6 rounded-full flex items-center justify-center shrink-0 text-xs">1</Badge>
                  <span>Localisez le code de vérification sur votre attestation (sous le QR code)</span>
                </div>
                <div className="flex gap-3">
                  <Badge variant="secondary" className="h-6 w-6 rounded-full flex items-center justify-center shrink-0 text-xs">2</Badge>
                  <span>Saisissez le code dans le champ ci-dessus ou scannez le QR code</span>
                </div>
                <div className="flex gap-3">
                  <Badge variant="secondary" className="h-6 w-6 rounded-full flex items-center justify-center shrink-0 text-xs">3</Badge>
                  <span>Le système vérifie instantanément l'authenticité et affiche le résultat</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </PublicLayout>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-1">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium">{value}</span>
    </div>
  );
}
