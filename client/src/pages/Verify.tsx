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
  rotated: { label: "Remplace", icon: Clock, color: "text-yellow-600" },
  revoked: { label: "Revoque", icon: XCircle, color: "text-red-600" },
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
      <section className="border-b bg-ci-green-light/50">
        <div className="container py-12 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-ci-green/10">
            <QrCode className="h-7 w-7 text-ci-green" />
          </div>
          <h1 className="mb-2 text-3xl font-bold">Verifier un document</h1>
          <p className="mx-auto max-w-lg text-muted-foreground">
            Entrez le code de verification figurant sur votre attestation ou scannez le QR code
            pour verifier instantanement l'authenticite du document.
          </p>
        </div>
      </section>

      <div className="container py-10">
        <div className="mx-auto max-w-xl">
          <form onSubmit={handleSubmit} className="mb-8 flex gap-2">
            <Input
              placeholder="Entrez le code de verification..."
              value={tokenInput}
              onChange={e => setTokenInput(e.target.value)}
              className="h-12 flex-1 text-base"
            />
            <Button type="submit" size="lg" className="bg-ci-green px-6 hover:bg-ci-green/90" disabled={isLoading}>
              <Search className="mr-2 h-4 w-4" />
              Verifier
            </Button>
          </form>

          {isLoading && (
            <div className="py-12 text-center">
              <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-2 border-ci-green border-t-transparent" />
              <p className="text-sm text-muted-foreground">Verification en cours...</p>
            </div>
          )}

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center">
              <AlertTriangle className="mx-auto mb-3 h-8 w-8 text-red-500" />
              <h3 className="mb-1 font-semibold text-red-800">Verification echouee</h3>
              <p className="text-sm text-red-600">
                {error.message.includes("Rate limit")
                  ? "Trop de tentatives. Veuillez reessayer dans quelques minutes."
                  : "Le code fourni ne correspond a aucun document enregistre."}
              </p>
            </div>
          )}

          {data && !isLoading && (
            <div className="overflow-hidden rounded-lg border bg-card">
              <div className={`p-6 ${data.status === "active" ? "bg-green-50" : data.status === "revoked" ? "bg-red-50" : "bg-yellow-50"}`}>
                <div className="flex items-center gap-3">
                  {(() => {
                    const cfg = STATUS_MAP[data.status] || STATUS_MAP.active;
                    const Icon = cfg.icon;
                    return (
                      <>
                        <Icon className={`h-8 w-8 ${cfg.color}`} />
                        <div>
                          <h3 className="text-lg font-bold">Document {cfg.label}</h3>
                          <p className="text-sm text-muted-foreground">
                            Type : {data.tokenType}
                          </p>
                        </div>
                      </>
                    );
                  })()}
                </div>
              </div>
              <div className="space-y-3 p-6">
                <InfoRow label="Type de document" value={data.tokenType} />
                <InfoRow label="Statut" value={STATUS_MAP[data.status]?.label || data.status} />
                {data.documentType && <InfoRow label="Categorie" value={data.documentType} />}
                {data.documentStatus && <InfoRow label="Statut du document" value={data.documentStatus} />}
                {data.documentReference && <InfoRow label="Reference document" value={data.documentReference} />}
                {data.decisionType && <InfoRow label="Decision finale" value={data.decisionType} />}
                {data.issuedMonth && <InfoRow label="Emis" value={data.issuedMonth} />}
                {data.issuedAt && (
                  <InfoRow label="Date d'emission" value={new Date(data.issuedAt).toLocaleDateString("fr-FR")} />
                )}
                {data.expiresAt && (
                  <InfoRow label="Expire le" value={new Date(data.expiresAt).toLocaleDateString("fr-FR")} />
                )}
                <div className="flex items-center gap-2 border-t pt-3 text-xs text-muted-foreground">
                  <Shield className="h-3 w-3" />
                  <span>
                    Verification effectuee le {new Date().toLocaleDateString("fr-FR")} a {new Date().toLocaleTimeString("fr-FR")}
                  </span>
                </div>
              </div>
            </div>
          )}

          {!searchToken && (
            <div className="mt-4 rounded-lg border bg-card p-6">
              <h3 className="mb-3 font-semibold">Comment verifier ?</h3>
              <div className="space-y-3 text-sm text-muted-foreground">
                <div className="flex gap-3">
                  <Badge variant="secondary" className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs">1</Badge>
                  <span>Localisez le code de verification sur votre attestation (sous le QR code)</span>
                </div>
                <div className="flex gap-3">
                  <Badge variant="secondary" className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs">2</Badge>
                  <span>Saisissez le code dans le champ ci-dessus ou scannez le QR code</span>
                </div>
                <div className="flex gap-3">
                  <Badge variant="secondary" className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs">3</Badge>
                  <span>Le systeme verifie instantanement l'authenticite et affiche le resultat</span>
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
