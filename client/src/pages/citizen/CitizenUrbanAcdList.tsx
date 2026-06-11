import { AcdStatusBadge } from "@/components/AcdStatusBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { ACD_PHASES, type AcdPhase } from "@shared/acd-workflow";
import { motion } from "framer-motion";
import { Building2, ChevronRight, Loader2, MapPin, Plus } from "lucide-react";
import { Link } from "wouter";

export default function CitizenUrbanAcdList() {
  const { data, isLoading, error } = trpc.urbanAcd.citizen.list.useQuery();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Foncier Urbain (ACD)</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Gérez vos demandes d'Arrêté de Concession Définitive
          </p>
        </div>
        <Link href="/citizen/urban-acd/new">
          <Button className="bg-ci-green hover:bg-ci-green/90 gap-2">
            <Plus className="h-4 w-4" />
            Nouvelle demande
          </Button>
        </Link>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-ci-green" />
        </div>
      )}

      {/* Error */}
      {error && (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardContent className="p-6 text-center">
            <p className="text-destructive text-sm">Erreur de chargement : {error.message}</p>
          </CardContent>
        </Card>
      )}

      {/* Empty state */}
      {data && data.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="p-12 text-center">
            <Building2 className="h-12 w-12 text-muted-foreground/40 mx-auto mb-4" />
            <h3 className="text-lg font-semibold">Aucun dossier urbain</h3>
            <p className="text-sm text-muted-foreground mt-2 max-w-md mx-auto">
              Vous n'avez pas encore de demande ACD. Créez votre première demande pour obtenir un Arrêté de Concession Définitive.
            </p>
            <Link href="/citizen/urban-acd/new">
              <Button className="mt-6 bg-ci-orange hover:bg-ci-orange/90 gap-2">
                <Plus className="h-4 w-4" />
                Créer ma première demande
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}

      {/* List */}
      {data && data.length > 0 && (
        <div className="space-y-3">
          {data.map((app: any, idx: number) => (
            <motion.div
              key={app.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
            >
              <Link href={`/citizen/urban-acd/${app.id}`}>
                <Card className="hover:border-ci-green/40 hover:shadow-sm transition-all cursor-pointer group">
                  <CardContent className="p-4 flex items-center gap-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 shrink-0">
                      <Building2 className="h-5 w-5 text-blue-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold truncate">{app.applicationNumber}</span>
                        <AcdStatusBadge status={app.status} />
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5 truncate">
                        {app.applicantFullName}
                        {app.commune && (
                          <span className="ml-2 inline-flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {app.commune}
                          </span>
                        )}
                        {app.lotNumber && <span className="ml-2">Lot {app.lotNumber}</span>}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-xs text-muted-foreground hidden sm:block">
                        {ACD_PHASES[app.phase as AcdPhase]?.label.split("—")[0]?.trim() || app.phase}
                      </span>
                      <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-ci-green transition-colors" />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
