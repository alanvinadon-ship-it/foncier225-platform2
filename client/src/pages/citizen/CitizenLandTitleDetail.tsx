import { LandTitleTimeline, LandTitleStatusBadge } from "@/components/LandTitleTimeline";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  FileText,
  Loader2,
  MapPin,
  Upload,
  User,
  Calendar,
  AlertTriangle,
} from "lucide-react";
import { Link, useParams } from "wouter";

export default function CitizenLandTitleDetail() {
  const params = useParams<{ id: string }>();
  const appId = parseInt(params.id || "0", 10);
  const { data, isLoading, error } = trpc.landTitle.citizen.getById.useQuery(
    { id: appId },
    { enabled: appId > 0 }
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-ci-green" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="space-y-4">
        <Link href="/citizen/land-title">
          <Button variant="ghost" size="sm" className="gap-2">
            <ArrowLeft className="h-4 w-4" /> Retour
          </Button>
        </Link>
        <Card className="border-destructive/50 bg-destructive/5">
          <CardContent className="p-6 text-center">
            <AlertTriangle className="h-8 w-8 text-destructive mx-auto mb-2" />
            <p className="text-destructive text-sm">
              {error?.message || "Dossier introuvable"}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/citizen/land-title">
          <Button variant="ghost" size="icon" className="shrink-0">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold tracking-tight truncate">
              {data.applicationNumber}
            </h1>
            <LandTitleStatusBadge status={data.status as any} />
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">
            {data.phase === "certificate" ? "Certificat Foncier" : "Titre Foncier"} — Créé le{" "}
            {new Date(data.createdAt).toLocaleDateString("fr-FR")}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Timeline */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="lg:col-span-2"
        >
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-base flex items-center gap-2">
                <Calendar className="h-4 w-4 text-ci-green" />
                Avancement de la procédure
              </CardTitle>
            </CardHeader>
            <CardContent>
              <LandTitleTimeline
                currentStatus={data.status as any}
                phase={data.phase as "certificate" | "title"}
                certificateSignedAt={data.certificateSignedAt}
                certificateExpiryAt={data.certificateExpiryAt}
                createdAt={data.createdAt}
              />
            </CardContent>
          </Card>
        </motion.div>

        {/* Right: Info panel */}
        <div className="space-y-4">
          {/* Applicant info */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <User className="h-4 w-4 text-ci-orange" />
                  Demandeur
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div>
                  <span className="text-muted-foreground">Nom :</span>{" "}
                  <span className="font-medium">{data.applicantFullName}</span>
                </div>
                {data.applicantNationality && (
                  <div>
                    <span className="text-muted-foreground">Nationalité :</span>{" "}
                    <span className="font-medium">{data.applicantNationality}</span>
                  </div>
                )}
                {data.applicantIdType && (
                  <div>
                    <span className="text-muted-foreground">{data.applicantIdType} :</span>{" "}
                    <span className="font-medium">{data.applicantIdNumber}</span>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Land info */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
          >
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-ci-green" />
                  Terrain
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                {(data as any).parcel && (
                  <div className="rounded-md border border-ci-green/30 bg-ci-green/5 p-3 mb-3">
                    <div className="flex items-center gap-2 mb-1">
                      <MapPin className="h-3.5 w-3.5 text-ci-green" />
                      <span className="text-xs font-semibold uppercase tracking-wider text-ci-green">Parcelle liée</span>
                    </div>
                    <Link href={`/citizen/parcels/${(data as any).parcel.id}`}>
                      <span className="font-semibold text-ci-green hover:underline cursor-pointer">
                        {(data as any).parcel.reference}
                      </span>
                    </Link>
                    <div className="mt-1 text-xs text-muted-foreground">
                      {(data as any).parcel.localisation && <span>{(data as any).parcel.localisation}</span>}
                      {(data as any).parcel.surfaceApprox && <span> — {(data as any).parcel.surfaceApprox} ha</span>}
                    </div>
                  </div>
                )}
                {data.landLocality && (
                  <div>
                    <span className="text-muted-foreground">Localité :</span>{" "}
                    <span className="font-medium">{data.landLocality}</span>
                  </div>
                )}
                {data.landSubPrefecture && (
                  <div>
                    <span className="text-muted-foreground">Sous-préfecture :</span>{" "}
                    <span className="font-medium">{data.landSubPrefecture}</span>
                  </div>
                )}
                {data.landDepartment && (
                  <div>
                    <span className="text-muted-foreground">Département :</span>{" "}
                    <span className="font-medium">{data.landDepartment}</span>
                  </div>
                )}
                {data.landRegion && (
                  <div>
                    <span className="text-muted-foreground">Région :</span>{" "}
                    <span className="font-medium">{data.landRegion}</span>
                  </div>
                )}
                {data.landAreaHectares && (
                  <div>
                    <span className="text-muted-foreground">Superficie :</span>{" "}
                    <span className="font-medium">{data.landAreaHectares} ha</span>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Documents */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <FileText className="h-4 w-4 text-indigo-600" />
                  Documents ({data.documents?.length || 0})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {(!data.documents || data.documents.length === 0) ? (
                  <p className="text-xs text-muted-foreground">Aucun document uploadé</p>
                ) : (
                  <div className="space-y-2">
                    {data.documents.map((doc: any) => (
                      <div key={doc.id} className="flex items-center gap-2 text-xs">
                        <Upload className="h-3 w-3 text-muted-foreground shrink-0" />
                        <span className="truncate flex-1">{doc.label}</span>
                        {doc.verified && (
                          <span className="text-ci-green text-[10px] font-medium">Vérifié</span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Oppositions */}
          {data.oppositions && data.oppositions.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
            >
              <Card className="border-red-200">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2 text-red-700">
                    <AlertTriangle className="h-4 w-4" />
                    Oppositions ({data.oppositions.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {data.oppositions.map((opp: any) => (
                      <div key={opp.id} className="text-xs border-l-2 border-red-300 pl-2">
                        <span className="font-medium">{opp.opponentName}</span>
                        <p className="text-muted-foreground mt-0.5 line-clamp-2">{opp.reason}</p>
                        <span className={`text-[10px] font-medium ${
                          opp.status === "dismissed" ? "text-green-600" :
                          opp.status === "confirmed" ? "text-red-600" : "text-amber-600"
                        }`}>
                          {opp.status === "pending" ? "En attente" :
                           opp.status === "confirmed" ? "Confirmée" : "Rejetée"}
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}
