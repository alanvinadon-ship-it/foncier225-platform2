import { trpc } from "@/lib/trpc";
import { FileText, Download } from "lucide-react";

const DOC_TYPE_LABELS: Record<string, string> = {
  attestation: "Attestation",
  titre_foncier: "Titre foncier",
  plan_cadastral: "Plan cadastral",
  pv_bornage: "PV de bornage",
  acte_vente: "Acte de vente",
  certificat_propriete: "Certificat de propriété",
  rapport_expertise: "Rapport d'expertise",
  autre: "Autre",
};

const DOC_STATUS_LABELS: Record<string, string> = {
  draft: "Brouillon",
  published: "Publié",
  archived: "Archivé",
};

const DOC_STATUS_COLORS: Record<string, string> = {
  draft: "bg-yellow-100 text-yellow-700",
  published: "bg-green-100 text-green-700",
  archived: "bg-gray-100 text-gray-700",
};

export default function CitizenDocuments() {
  const { data: documents, isLoading } = trpc.citizen.myDocuments.useQuery();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <FileText className="h-6 w-6 text-ci-green" />
          Mes documents
        </h1>
        <p className="text-muted-foreground mt-1">
          Consultez et téléchargez les documents liés à vos parcelles
        </p>
      </div>

      {isLoading ? (
        <div className="border rounded-lg p-8 text-center text-muted-foreground">
          Chargement de vos documents...
        </div>
      ) : !documents || documents.length === 0 ? (
        <div className="border rounded-lg p-8 text-center">
          <FileText className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
          <h3 className="font-semibold text-lg mb-2">Aucun document</h3>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            Aucun document n'est disponible pour le moment.
            Les documents seront ajoutés par les agents au fur et à mesure de l'avancement de vos dossiers.
          </p>
        </div>
      ) : (
        <div className="border rounded-lg bg-background overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-muted/30">
                <th className="text-left p-4 text-sm font-medium text-muted-foreground">Document</th>
                <th className="text-left p-4 text-sm font-medium text-muted-foreground">Type</th>
                <th className="text-left p-4 text-sm font-medium text-muted-foreground">Statut</th>
                <th className="text-left p-4 text-sm font-medium text-muted-foreground">Date</th>
                <th className="text-left p-4 text-sm font-medium text-muted-foreground">Action</th>
              </tr>
            </thead>
            <tbody>
              {documents.map(doc => (
                <tr key={doc.id} className="border-b last:border-b-0 hover:bg-accent/30 transition-colors">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <FileText className="h-4 w-4 text-ci-green shrink-0" />
                      <div>
                        <p className="text-sm font-medium">{doc.title}</p>
                        {doc.description && (
                          <p className="text-xs text-muted-foreground mt-0.5">{doc.description}</p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="p-4 text-sm text-muted-foreground">
                    {DOC_TYPE_LABELS[doc.documentType] || doc.documentType}
                  </td>
                  <td className="p-4">
                    <span className={`text-xs px-2 py-1 rounded-full ${DOC_STATUS_COLORS[doc.status] || "bg-gray-100"}`}>
                      {DOC_STATUS_LABELS[doc.status] || doc.status}
                    </span>
                  </td>
                  <td className="p-4 text-sm text-muted-foreground">
                    {new Date(doc.createdAt).toLocaleDateString("fr-FR")}
                  </td>
                  <td className="p-4">
                    {doc.fileUrl ? (
                      <a
                        href={doc.fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-sm text-ci-orange hover:underline"
                      >
                        <Download className="h-4 w-4" />
                        Télécharger
                      </a>
                    ) : (
                      <span className="text-xs text-muted-foreground">Non disponible</span>
                    )}
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
