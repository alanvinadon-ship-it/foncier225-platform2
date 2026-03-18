import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import { Download, FileCheck, FilePlus2, Search } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export default function DocumentsAdmin() {
  const utils = trpc.useUtils();
  const [parcelId, setParcelId] = useState("");
  const [creditFileId, setCreditFileId] = useState("");
  const documentsQuery = trpc.admin.listGeneratedDocuments.useQuery({ limit: 100, offset: 0 });
  const generateParcelMutation = trpc.admin.generateParcelPdf.useMutation({
    onSuccess: async () => {
      toast.success("PDF parcelle genere");
      setParcelId("");
      await documentsQuery.refetch();
      await utils.admin.listGeneratedDocuments.invalidate();
    },
    onError: error => toast.error(error.message),
  });
  const generateDossierMutation = trpc.admin.generateDossierPdf.useMutation({
    onSuccess: async () => {
      toast.success("PDF dossier genere");
      setCreditFileId("");
      await documentsQuery.refetch();
      await utils.admin.listGeneratedDocuments.invalidate();
    },
    onError: error => toast.error(error.message),
  });
  const downloadMutation = trpc.admin.getGeneratedDocumentDownloadUrl.useMutation({
    onSuccess: result => {
      window.open(result.url, "_blank", "noopener,noreferrer");
    },
    onError: error => toast.error(error.message),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
          <FileCheck className="h-6 w-6 text-ci-green" />
          Documents generes
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Generez, listez et telechargez les PDF documentaires verifies.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Generer un PDF parcelle</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Input
              placeholder="ID de la parcelle"
              value={parcelId}
              onChange={event => setParcelId(event.target.value)}
            />
            <Button
              className="bg-ci-green hover:bg-ci-green/90"
              disabled={generateParcelMutation.isPending || !parcelId.trim()}
              onClick={() => generateParcelMutation.mutate({ parcelId: Number(parcelId) })}
            >
              <FilePlus2 className="mr-2 h-4 w-4" />
              {generateParcelMutation.isPending ? "Generation..." : "Generer le PDF parcelle"}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Generer un PDF dossier</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Input
              placeholder="ID du dossier credit"
              value={creditFileId}
              onChange={event => setCreditFileId(event.target.value)}
            />
            <Button
              className="bg-ci-green hover:bg-ci-green/90"
              disabled={generateDossierMutation.isPending || !creditFileId.trim()}
              onClick={() => generateDossierMutation.mutate({ creditFileId: Number(creditFileId) })}
            >
              <FilePlus2 className="mr-2 h-4 w-4" />
              {generateDossierMutation.isPending ? "Generation..." : "Generer le PDF dossier"}
            </Button>
          </CardContent>
        </Card>
      </div>

      {documentsQuery.isLoading ? (
        <Alert>
          <Search className="h-4 w-4" />
          <AlertTitle>Chargement</AlertTitle>
          <AlertDescription>Chargement des documents generes...</AlertDescription>
        </Alert>
      ) : documentsQuery.error ? (
        <Alert variant="destructive">
          <AlertTitle>Chargement impossible</AlertTitle>
          <AlertDescription>{documentsQuery.error.message}</AlertDescription>
        </Alert>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Historique documentaire</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-muted/30 text-left text-sm text-muted-foreground">
                    <th className="p-4">Reference</th>
                    <th className="p-4">Type</th>
                    <th className="p-4">Cible</th>
                    <th className="p-4">Date</th>
                    <th className="p-4">Genere par</th>
                    <th className="p-4">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {(documentsQuery.data ?? []).map(document => (
                    <tr key={document.id} className="border-b last:border-b-0">
                      <td className="p-4 text-sm font-medium">{document.reference}</td>
                      <td className="p-4 text-sm text-muted-foreground">{document.documentType}</td>
                      <td className="p-4 text-sm text-muted-foreground">
                        {document.parcelReference
                          ? `Parcelle ${document.parcelReference}`
                          : document.creditFileReference
                            ? `Dossier ${document.creditFileReference}`
                            : "Document systeme"}
                      </td>
                      <td className="p-4 text-sm text-muted-foreground">
                        {new Date(document.createdAt).toLocaleString("fr-FR")}
                      </td>
                      <td className="p-4 text-sm text-muted-foreground">
                        {document.generatedBy?.name ?? document.generatedBy?.email ?? "Systeme"}
                      </td>
                      <td className="p-4">
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={downloadMutation.isPending}
                          onClick={() => downloadMutation.mutate({ documentId: document.id })}
                        >
                          <Download className="mr-2 h-4 w-4" />
                          Telecharger
                        </Button>
                      </td>
                    </tr>
                  ))}
                  {(documentsQuery.data ?? []).length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-6 text-center text-sm text-muted-foreground">
                        Aucun document genere pour le moment.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
