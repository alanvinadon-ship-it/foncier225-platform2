import { trpc } from "@/lib/trpc";
import { MapPin, Eye, ExternalLink } from "lucide-react";
import { Link } from "wouter";

const STATUS_LABELS: Record<string, string> = {
  dossier_en_cours: "Dossier en cours",
  en_opposition: "En opposition",
  gele: "Gelé",
  mediation_en_cours: "Médiation en cours",
  acte_notarie_enregistre: "Acte notarié",
  valide: "Validé",
};

const STATUS_COLORS: Record<string, string> = {
  dossier_en_cours: "bg-blue-100 text-blue-700",
  en_opposition: "bg-red-100 text-red-700",
  gele: "bg-gray-100 text-gray-700",
  mediation_en_cours: "bg-yellow-100 text-yellow-700",
  acte_notarie_enregistre: "bg-purple-100 text-purple-700",
  valide: "bg-green-100 text-green-700",
};

export default function CitizenParcels() {
  const { data: parcels, isLoading } = trpc.citizen.myParcels.useQuery();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <MapPin className="h-6 w-6 text-ci-orange" />
          Mes parcelles
        </h1>
        <p className="text-muted-foreground mt-1">
          Consultez les parcelles associées à votre compte
        </p>
      </div>

      {isLoading ? (
        <div className="border rounded-lg p-8 text-center text-muted-foreground">
          Chargement de vos parcelles...
        </div>
      ) : !parcels || parcels.length === 0 ? (
        <div className="border rounded-lg p-8 text-center">
          <MapPin className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
          <h3 className="font-semibold text-lg mb-2">Aucune parcelle</h3>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            Aucune parcelle n'est actuellement associée à votre compte.
            Contactez un agent foncier pour lier vos parcelles à votre espace citoyen.
          </p>
        </div>
      ) : (
        <div className="border rounded-lg bg-background overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-muted/30">
                <th className="text-left p-4 text-sm font-medium text-muted-foreground">Référence</th>
                <th className="text-left p-4 text-sm font-medium text-muted-foreground">Zone</th>
                <th className="text-left p-4 text-sm font-medium text-muted-foreground">Localisation</th>
                <th className="text-left p-4 text-sm font-medium text-muted-foreground">Surface</th>
                <th className="text-left p-4 text-sm font-medium text-muted-foreground">Statut</th>
                <th className="text-left p-4 text-sm font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {parcels.map(parcel => (
                <tr key={parcel.id} className="border-b last:border-b-0 hover:bg-accent/30 transition-colors">
                  <td className="p-4">
                    <span className="font-medium text-sm">{parcel.reference}</span>
                  </td>
                  <td className="p-4 text-sm text-muted-foreground">{parcel.zoneCode}</td>
                  <td className="p-4 text-sm text-muted-foreground">{parcel.localisation || "—"}</td>
                  <td className="p-4 text-sm text-muted-foreground">{parcel.surfaceApprox || "—"}</td>
                  <td className="p-4">
                    <span className={`text-xs px-2 py-1 rounded-full ${STATUS_COLORS[parcel.statusPublic] || "bg-gray-100"}`}>
                      {STATUS_LABELS[parcel.statusPublic] || parcel.statusPublic}
                    </span>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <Link href={`/citizen/parcels/${parcel.id}`}>
                        <button className="h-8 w-8 rounded-lg hover:bg-accent flex items-center justify-center transition-colors" title="Voir détails">
                          <Eye className="h-4 w-4 text-ci-orange" />
                        </button>
                      </Link>
                      <Link href={`/parcelle/${parcel.publicToken}`}>
                        <button className="h-8 w-8 rounded-lg hover:bg-accent flex items-center justify-center transition-colors" title="Page publique">
                          <ExternalLink className="h-4 w-4 text-muted-foreground" />
                        </button>
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
