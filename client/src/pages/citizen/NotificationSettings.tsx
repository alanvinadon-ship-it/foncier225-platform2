import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Bell, Mail, Phone, Save, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

interface PreferenceRow {
  label: string;
  description: string;
  emailKey: string;
  smsKey: string;
}

const preferenceRows: PreferenceRow[] = [
  {
    label: "Changement de statut",
    description: "Quand votre dossier passe à une nouvelle étape",
    emailKey: "emailStatusChange",
    smsKey: "smsStatusChange",
  },
  {
    label: "Documents",
    description: "Quand un document est vérifié ou rejeté",
    emailKey: "emailDocumentUpdate",
    smsKey: "smsDocumentUpdate",
  },
  {
    label: "Opposition",
    description: "Quand une opposition est déposée sur votre parcelle",
    emailKey: "emailOpposition",
    smsKey: "smsOpposition",
  },
  {
    label: "Informations générales",
    description: "Actualités et communications de la plateforme",
    emailKey: "emailGeneral",
    smsKey: "smsGeneral",
  },
];

export default function NotificationSettings() {
  const { data: prefs, isLoading } = trpc.citizen.getNotifPreferences.useQuery();
  const updateMutation = trpc.citizen.updateNotifPreferences.useMutation({
    onSuccess: () => {
      toast.success("Préférences enregistrées", {
        description: "Vos préférences de notification ont été mises à jour.",
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    },
    onError: (err) => {
      toast.error("Erreur", {
        description: err.message || "Impossible de sauvegarder vos préférences.",
      });
    },
  });

  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [toggles, setToggles] = useState<Record<string, boolean>>({
    emailStatusChange: true,
    smsStatusChange: false,
    emailDocumentUpdate: true,
    smsDocumentUpdate: false,
    emailOpposition: true,
    smsOpposition: true,
    emailGeneral: true,
    smsGeneral: false,
  });
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (prefs) {
      setEmail(prefs.email || "");
      setPhone(prefs.phone || "");
      setToggles({
        emailStatusChange: prefs.emailStatusChange,
        smsStatusChange: prefs.smsStatusChange,
        emailDocumentUpdate: prefs.emailDocumentUpdate,
        smsDocumentUpdate: prefs.smsDocumentUpdate,
        emailOpposition: prefs.emailOpposition,
        smsOpposition: prefs.smsOpposition,
        emailGeneral: prefs.emailGeneral,
        smsGeneral: prefs.smsGeneral,
      });
    }
  }, [prefs]);

  const handleToggle = (key: string, value: boolean) => {
    setToggles(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = () => {
    updateMutation.mutate({
      email: email || null,
      phone: phone || null,
      ...toggles,
    });
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <div className="h-8 w-64 bg-muted animate-pulse rounded" />
        <div className="h-48 bg-muted animate-pulse rounded" />
        <div className="h-64 bg-muted animate-pulse rounded" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-full bg-ci-orange/10 flex items-center justify-center">
          <Bell className="h-5 w-5 text-ci-orange" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Alertes & Notifications</h1>
          <p className="text-sm text-muted-foreground">
            Configurez comment vous souhaitez être alerté sur l'avancement de vos dossiers
          </p>
        </div>
      </div>

      {/* Contact info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Coordonnées de contact</CardTitle>
          <CardDescription>
            Renseignez votre email et/ou numéro de téléphone pour recevoir les alertes
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="email" className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                Adresse e-mail
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="votre@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone" className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-muted-foreground" />
                Numéro de téléphone
              </Label>
              <Input
                id="phone"
                type="tel"
                placeholder="+225 07 XX XX XX XX"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Les SMS sont envoyés uniquement pour les alertes critiques. Des frais opérateur peuvent s'appliquer.
          </p>
        </CardContent>
      </Card>

      {/* Preferences table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Canaux de notification</CardTitle>
          <CardDescription>
            Choisissez les types d'alertes que vous souhaitez recevoir par email et/ou SMS
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg overflow-hidden">
            {/* Header */}
            <div className="grid grid-cols-[1fr_80px_80px] gap-2 px-4 py-3 bg-muted/50 border-b text-sm font-medium">
              <span>Type d'alerte</span>
              <span className="text-center">
                <Mail className="h-4 w-4 mx-auto" />
              </span>
              <span className="text-center">
                <Phone className="h-4 w-4 mx-auto" />
              </span>
            </div>
            {/* Rows */}
            {preferenceRows.map((row) => (
              <div
                key={row.emailKey}
                className="grid grid-cols-[1fr_80px_80px] gap-2 px-4 py-3 border-b last:border-0 items-center"
              >
                <div>
                  <p className="text-sm font-medium">{row.label}</p>
                  <p className="text-xs text-muted-foreground">{row.description}</p>
                </div>
                <div className="flex justify-center">
                  <Switch
                    checked={toggles[row.emailKey] ?? false}
                    onCheckedChange={(v) => handleToggle(row.emailKey, v)}
                    disabled={!email}
                  />
                </div>
                <div className="flex justify-center">
                  <Switch
                    checked={toggles[row.smsKey] ?? false}
                    onCheckedChange={(v) => handleToggle(row.smsKey, v)}
                    disabled={!phone}
                  />
                </div>
              </div>
            ))}
          </div>
          {(!email && !phone) && (
            <p className="text-xs text-amber-600 mt-3">
              Veuillez renseigner au moins un email ou un numéro de téléphone ci-dessus pour activer les alertes.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Save button */}
      <div className="flex items-center gap-3">
        <Button
          onClick={handleSave}
          disabled={updateMutation.isPending}
          className="bg-ci-green hover:bg-ci-green/90"
        >
          {saved ? (
            <>
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Enregistré
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              {updateMutation.isPending ? "Enregistrement..." : "Enregistrer mes préférences"}
            </>
          )}
        </Button>
        {saved && (
          <span className="text-sm text-ci-green font-medium animate-in fade-in">
            Vos préférences ont été sauvegardées
          </span>
        )}
      </div>
    </div>
  );
}
