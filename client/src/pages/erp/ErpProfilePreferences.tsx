import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Settings, ArrowLeft, Globe, Clock, Calendar, Coins, Bell, Palette } from "lucide-react";
import { Link } from "wouter";

export default function ErpProfilePreferences() {
  const { data: preferences, isLoading, refetch } = trpc.erp.profile.getPreferences.useQuery();
  const updateMutation = trpc.erp.profile.updatePreferences.useMutation({
    onSuccess: () => { toast.success("Préférences sauvegardées"); refetch(); },
    onError: (e) => toast.error(e.message),
  });

  const [language, setLanguage] = useState("fr");
  const [timezone, setTimezone] = useState("Africa/Abidjan");
  const [dateFormat, setDateFormat] = useState("DD/MM/YYYY");
  const [currency, setCurrency] = useState("XOF");
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [pushNotifications, setPushNotifications] = useState(true);
  const [theme, setTheme] = useState("system");

  useEffect(() => {
    if (preferences) {
      setLanguage(preferences.language || "fr");
      setTimezone(preferences.timezone || "Africa/Abidjan");
      setDateFormat(preferences.dateFormat || "DD/MM/YYYY");
      setCurrency(preferences.currency || "XOF");
      setEmailNotifications(preferences.emailNotifications ?? true);
      setPushNotifications(preferences.pushNotifications ?? true);
      setTheme(preferences.theme || "system");
    }
  }, [preferences]);

  if (isLoading) return <div className="p-6 text-muted-foreground">Chargement...</div>;

  const handleSave = () => {
    updateMutation.mutate({ language, timezone, dateFormat, currency, emailNotifications, pushNotifications, theme });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/erp/profile">
          <Button variant="ghost" size="icon"><ArrowLeft size={18} /></Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Préférences</h1>
          <p className="text-muted-foreground">Personnalisez votre expérience ERP</p>
        </div>
      </div>

      {/* Localisation */}
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Globe size={18} /> Localisation</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-1 flex items-center gap-1"><Globe size={14} /> Langue</label>
              <select value={language} onChange={e => setLanguage(e.target.value)} className="w-full border border-border rounded-md px-3 py-2 text-sm bg-background">
                <option value="fr">Français</option>
                <option value="en">English</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 flex items-center gap-1"><Clock size={14} /> Fuseau horaire</label>
              <select value={timezone} onChange={e => setTimezone(e.target.value)} className="w-full border border-border rounded-md px-3 py-2 text-sm bg-background">
                <option value="Africa/Abidjan">Africa/Abidjan (GMT+0)</option>
                <option value="Europe/Paris">Europe/Paris (GMT+1/+2)</option>
                <option value="America/New_York">America/New_York (GMT-5)</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 flex items-center gap-1"><Calendar size={14} /> Format de date</label>
              <select value={dateFormat} onChange={e => setDateFormat(e.target.value)} className="w-full border border-border rounded-md px-3 py-2 text-sm bg-background">
                <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                <option value="YYYY-MM-DD">YYYY-MM-DD</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 flex items-center gap-1"><Coins size={14} /> Devise</label>
              <select value={currency} onChange={e => setCurrency(e.target.value)} className="w-full border border-border rounded-md px-3 py-2 text-sm bg-background">
                <option value="XOF">XOF (Franc CFA)</option>
                <option value="EUR">EUR (Euro)</option>
                <option value="USD">USD (Dollar US)</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Notifications */}
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Bell size={18} /> Notifications</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between py-3 border-b border-border">
            <div>
              <p className="font-medium text-sm">Notifications par email</p>
              <p className="text-xs text-muted-foreground">Recevoir les alertes par email</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" checked={emailNotifications} onChange={e => setEmailNotifications(e.target.checked)} className="sr-only peer" />
              <div className="w-9 h-5 bg-muted peer-checked:bg-primary rounded-full peer-focus:ring-2 peer-focus:ring-primary/20 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-full"></div>
            </label>
          </div>
          <div className="flex items-center justify-between py-3">
            <div>
              <p className="font-medium text-sm">Notifications push</p>
              <p className="text-xs text-muted-foreground">Recevoir les alertes en temps réel dans le navigateur</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" checked={pushNotifications} onChange={e => setPushNotifications(e.target.checked)} className="sr-only peer" />
              <div className="w-9 h-5 bg-muted peer-checked:bg-primary rounded-full peer-focus:ring-2 peer-focus:ring-primary/20 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-full"></div>
            </label>
          </div>
        </CardContent>
      </Card>

      {/* Apparence */}
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Palette size={18} /> Apparence</CardTitle></CardHeader>
        <CardContent>
          <div>
            <label className="text-sm font-medium mb-1 block">Thème</label>
            <select value={theme} onChange={e => setTheme(e.target.value)} className="w-full border border-border rounded-md px-3 py-2 text-sm bg-background">
              <option value="system">Système</option>
              <option value="light">Clair</option>
              <option value="dark">Sombre</option>
            </select>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={updateMutation.isPending}>
          {updateMutation.isPending ? "Sauvegarde..." : "Sauvegarder les préférences"}
        </Button>
      </div>
    </div>
  );
}
