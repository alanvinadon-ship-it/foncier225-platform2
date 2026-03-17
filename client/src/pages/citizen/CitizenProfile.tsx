import { trpc } from "@/lib/trpc";
import { User, Mail, Shield, Calendar, Clock } from "lucide-react";

const ROLE_LABELS: Record<string, string> = {
  citizen: "Citoyen",
  agent_terrain: "Agent terrain",
  bank: "Banque",
  admin: "Administrateur",
};

export default function CitizenProfile() {
  const { data: profile, isLoading } = trpc.citizen.profile.useQuery();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-muted-foreground">Chargement du profil...</p>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="border rounded-lg p-8 text-center">
        <p className="text-muted-foreground">Impossible de charger votre profil.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <User className="h-6 w-6 text-ci-orange" />
          Mon profil
        </h1>
        <p className="text-muted-foreground mt-1">
          Informations de votre compte Foncier225
        </p>
      </div>

      <div className="border rounded-lg bg-background">
        <div className="p-6 border-b">
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 rounded-full bg-ci-orange/10 flex items-center justify-center">
              <span className="text-2xl font-bold text-ci-orange">
                {profile.name?.charAt(0).toUpperCase() || "C"}
              </span>
            </div>
            <div>
              <h2 className="text-xl font-bold">{profile.name || "Citoyen"}</h2>
              <p className="text-sm text-muted-foreground">{profile.email || "—"}</p>
            </div>
          </div>
        </div>

        <div className="divide-y">
          <div className="flex items-center gap-4 p-5">
            <div className="h-10 w-10 rounded-lg bg-accent/50 flex items-center justify-center shrink-0">
              <User className="h-5 w-5 text-muted-foreground" />
            </div>
            <div className="flex-1">
              <p className="text-xs text-muted-foreground">Nom complet</p>
              <p className="text-sm font-medium">{profile.name || "Non renseigné"}</p>
            </div>
          </div>

          <div className="flex items-center gap-4 p-5">
            <div className="h-10 w-10 rounded-lg bg-accent/50 flex items-center justify-center shrink-0">
              <Mail className="h-5 w-5 text-muted-foreground" />
            </div>
            <div className="flex-1">
              <p className="text-xs text-muted-foreground">Adresse email</p>
              <p className="text-sm font-medium">{profile.email || "Non renseigné"}</p>
            </div>
          </div>

          <div className="flex items-center gap-4 p-5">
            <div className="h-10 w-10 rounded-lg bg-accent/50 flex items-center justify-center shrink-0">
              <Shield className="h-5 w-5 text-muted-foreground" />
            </div>
            <div className="flex-1">
              <p className="text-xs text-muted-foreground">Rôle</p>
              <p className="text-sm font-medium">{ROLE_LABELS[profile.role] || profile.role}</p>
            </div>
          </div>

          <div className="flex items-center gap-4 p-5">
            <div className="h-10 w-10 rounded-lg bg-accent/50 flex items-center justify-center shrink-0">
              <Calendar className="h-5 w-5 text-muted-foreground" />
            </div>
            <div className="flex-1">
              <p className="text-xs text-muted-foreground">Inscrit depuis</p>
              <p className="text-sm font-medium">
                {new Date(profile.createdAt).toLocaleDateString("fr-FR", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4 p-5">
            <div className="h-10 w-10 rounded-lg bg-accent/50 flex items-center justify-center shrink-0">
              <Clock className="h-5 w-5 text-muted-foreground" />
            </div>
            <div className="flex-1">
              <p className="text-xs text-muted-foreground">Dernière connexion</p>
              <p className="text-sm font-medium">
                {new Date(profile.lastSignedIn).toLocaleDateString("fr-FR", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4 p-5">
            <div className="h-10 w-10 rounded-lg bg-accent/50 flex items-center justify-center shrink-0">
              <div className={`h-3 w-3 rounded-full ${profile.isActive ? "bg-green-500" : "bg-red-500"}`} />
            </div>
            <div className="flex-1">
              <p className="text-xs text-muted-foreground">Statut du compte</p>
              <p className="text-sm font-medium">{profile.isActive ? "Actif" : "Désactivé"}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="border rounded-lg bg-accent/20 p-5">
        <p className="text-sm text-muted-foreground">
          Pour modifier vos informations personnelles ou votre adresse email, veuillez contacter un agent Foncier225.
          Les modifications de profil sont soumises à vérification pour garantir la sécurité de votre compte.
        </p>
      </div>
    </div>
  );
}
