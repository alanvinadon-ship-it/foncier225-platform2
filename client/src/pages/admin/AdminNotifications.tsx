import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Mail, Phone, Save, Send, Shield, Server, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";

// ─── SMTP Configuration Tab ─────────────────────────────────────────────────
function SmtpConfigTab() {
  const { data: config, isLoading } = trpc.admin.getMailConfig.useQuery();
  const updateMutation = trpc.admin.updateMailConfig.useMutation({
    onSuccess: () => toast.success("Configuration SMTP enregistrée"),
    onError: (err) => toast.error("Erreur", { description: err.message }),
  });
  const testMutation = trpc.admin.testMailConfig.useMutation({
    onSuccess: (res) => {
      if (res.success) toast.success(res.message);
      else toast.error(res.error);
    },
    onError: (err) => toast.error("Erreur", { description: err.message }),
  });

  const [form, setForm] = useState({
    host: "",
    port: 587,
    secure: false,
    username: "",
    password: "",
    fromName: "Foncier225",
    fromEmail: "noreply@foncier225.ci",
    enabled: false,
  });
  const [testEmail, setTestEmail] = useState("");

  useEffect(() => {
    if (config) {
      setForm({
        host: (config.host as string) || "",
        port: (config.port as number) || 587,
        secure: (config.secure as boolean) || false,
        username: (config.username as string) || "",
        password: (config.password as string) || "",
        fromName: (config.fromName as string) || "Foncier225",
        fromEmail: (config.fromEmail as string) || "noreply@foncier225.ci",
        enabled: (config.enabled as boolean) || false,
      });
    }
  }, [config]);

  const handleSave = () => {
    updateMutation.mutate(form);
  };

  const handleTest = () => {
    if (!testEmail) {
      toast.error("Veuillez saisir une adresse email de test");
      return;
    }
    testMutation.mutate({ recipientEmail: testEmail });
  };

  if (isLoading) {
    return <div className="space-y-4"><div className="h-64 bg-muted animate-pulse rounded-lg" /></div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <Server className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <CardTitle className="text-lg">Serveur SMTP</CardTitle>
                <CardDescription>Configuration du serveur d'envoi d'emails</CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Label htmlFor="smtp-enabled" className="text-sm">Activer</Label>
              <Switch
                id="smtp-enabled"
                checked={form.enabled}
                onCheckedChange={(v) => setForm(prev => ({ ...prev, enabled: v }))}
              />
              <Badge variant={form.enabled ? "default" : "secondary"} className={form.enabled ? "bg-green-600" : ""}>
                {form.enabled ? "Actif" : "Inactif"}
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="smtp-host">Hôte SMTP</Label>
              <Input
                id="smtp-host"
                placeholder="smtp.example.com"
                value={form.host}
                onChange={(e) => setForm(prev => ({ ...prev, host: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="smtp-port">Port</Label>
              <Input
                id="smtp-port"
                type="number"
                placeholder="587"
                value={form.port}
                onChange={(e) => setForm(prev => ({ ...prev, port: parseInt(e.target.value) || 587 }))}
              />
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
            <Shield className="h-4 w-4 text-muted-foreground" />
            <div className="flex items-center gap-2">
              <Label htmlFor="smtp-secure" className="text-sm">Connexion sécurisée (TLS/SSL)</Label>
              <Switch
                id="smtp-secure"
                checked={form.secure}
                onCheckedChange={(v) => setForm(prev => ({ ...prev, secure: v }))}
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="smtp-user">Nom d'utilisateur</Label>
              <Input
                id="smtp-user"
                placeholder="user@example.com"
                value={form.username}
                onChange={(e) => setForm(prev => ({ ...prev, username: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="smtp-pass">Mot de passe</Label>
              <Input
                id="smtp-pass"
                type="password"
                placeholder="••••••••"
                value={form.password}
                onChange={(e) => setForm(prev => ({ ...prev, password: e.target.value }))}
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="smtp-from-name">Nom de l'expéditeur</Label>
              <Input
                id="smtp-from-name"
                placeholder="Foncier225"
                value={form.fromName}
                onChange={(e) => setForm(prev => ({ ...prev, fromName: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="smtp-from-email">Email de l'expéditeur</Label>
              <Input
                id="smtp-from-email"
                type="email"
                placeholder="noreply@foncier225.ci"
                value={form.fromEmail}
                onChange={(e) => setForm(prev => ({ ...prev, fromEmail: e.target.value }))}
              />
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <Button onClick={handleSave} disabled={updateMutation.isPending} className="bg-ci-green hover:bg-ci-green/90">
              {updateMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
              Enregistrer
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Test email */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Tester l'envoi d'email</CardTitle>
          <CardDescription>Envoyez un email de test pour vérifier la configuration</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3 items-end">
            <div className="flex-1 space-y-2">
              <Label htmlFor="test-email">Adresse de destination</Label>
              <Input
                id="test-email"
                type="email"
                placeholder="test@example.com"
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
              />
            </div>
            <Button
              onClick={handleTest}
              disabled={testMutation.isPending || !form.enabled}
              variant="outline"
            >
              {testMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
              Envoyer un test
            </Button>
          </div>
          {!form.enabled && (
            <p className="text-xs text-amber-600 mt-2">Activez la configuration SMTP pour pouvoir envoyer un test.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ─── SMS Orange CI Configuration Tab ─────────────────────────────────────────
function SmsOrangeConfigTab() {
  const { data: config, isLoading } = trpc.admin.getSmsConfig.useQuery();
  const updateMutation = trpc.admin.updateSmsConfig.useMutation({
    onSuccess: () => toast.success("Configuration SMS Orange CI enregistrée"),
    onError: (err) => toast.error("Erreur", { description: err.message }),
  });
  const testMutation = trpc.admin.testSmsConfig.useMutation({
    onSuccess: (res) => {
      if (res.success) toast.success(res.message);
      else toast.error(res.error);
    },
    onError: (err) => toast.error("Erreur", { description: err.message }),
  });

  const [form, setForm] = useState({
    clientId: "",
    clientSecret: "",
    authUrl: "https://api.orange.com/oauth/v3/token",
    smsUrl: "https://api.orange.com/smsmessaging/v1/outbound",
    senderAddress: "tel:+2250000000000",
    senderName: "Foncier225",
    enabled: false,
  });
  const [testPhone, setTestPhone] = useState("");

  useEffect(() => {
    if (config) {
      setForm({
        clientId: (config.clientId as string) || "",
        clientSecret: (config.clientSecret as string) || "",
        authUrl: (config.authUrl as string) || "https://api.orange.com/oauth/v3/token",
        smsUrl: (config.smsUrl as string) || "https://api.orange.com/smsmessaging/v1/outbound",
        senderAddress: (config.senderAddress as string) || "tel:+2250000000000",
        senderName: (config.senderName as string) || "Foncier225",
        enabled: (config.enabled as boolean) || false,
      });
    }
  }, [config]);

  const handleSave = () => {
    updateMutation.mutate(form);
  };

  const handleTest = () => {
    if (!testPhone) {
      toast.error("Veuillez saisir un numéro de téléphone de test");
      return;
    }
    testMutation.mutate({ recipientPhone: testPhone });
  };

  if (isLoading) {
    return <div className="space-y-4"><div className="h-64 bg-muted animate-pulse rounded-lg" /></div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-orange-500/10 flex items-center justify-center">
                <Phone className="h-5 w-5 text-orange-500" />
              </div>
              <div>
                <CardTitle className="text-lg">Gateway SMS — Orange CI</CardTitle>
                <CardDescription>Configuration de l'API SMS Orange Côte d'Ivoire</CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Label htmlFor="sms-enabled" className="text-sm">Activer</Label>
              <Switch
                id="sms-enabled"
                checked={form.enabled}
                onCheckedChange={(v) => setForm(prev => ({ ...prev, enabled: v }))}
              />
              <Badge variant={form.enabled ? "default" : "secondary"} className={form.enabled ? "bg-orange-600" : ""}>
                {form.enabled ? "Actif" : "Inactif"}
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-3 rounded-lg bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800">
            <p className="text-sm text-orange-800 dark:text-orange-200">
              <strong>Orange Developer Portal :</strong> Obtenez vos identifiants sur{" "}
              <a href="https://developer.orange.com" target="_blank" rel="noopener noreferrer" className="underline font-medium">
                developer.orange.com
              </a>
              {" "}→ Mes applications → API SMS Côte d'Ivoire.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="sms-client-id">Client ID</Label>
              <Input
                id="sms-client-id"
                placeholder="Votre Client ID Orange"
                value={form.clientId}
                onChange={(e) => setForm(prev => ({ ...prev, clientId: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sms-client-secret">Client Secret</Label>
              <Input
                id="sms-client-secret"
                type="password"
                placeholder="••••••••"
                value={form.clientSecret}
                onChange={(e) => setForm(prev => ({ ...prev, clientSecret: e.target.value }))}
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="sms-auth-url">URL d'authentification OAuth</Label>
              <Input
                id="sms-auth-url"
                placeholder="https://api.orange.com/oauth/v3/token"
                value={form.authUrl}
                onChange={(e) => setForm(prev => ({ ...prev, authUrl: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sms-api-url">URL de l'API SMS</Label>
              <Input
                id="sms-api-url"
                placeholder="https://api.orange.com/smsmessaging/v1/outbound"
                value={form.smsUrl}
                onChange={(e) => setForm(prev => ({ ...prev, smsUrl: e.target.value }))}
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="sms-sender-address">Adresse expéditeur (tel:+225...)</Label>
              <Input
                id="sms-sender-address"
                placeholder="tel:+2250700000000"
                value={form.senderAddress}
                onChange={(e) => setForm(prev => ({ ...prev, senderAddress: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sms-sender-name">Nom de l'expéditeur</Label>
              <Input
                id="sms-sender-name"
                placeholder="Foncier225"
                value={form.senderName}
                onChange={(e) => setForm(prev => ({ ...prev, senderName: e.target.value }))}
              />
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <Button onClick={handleSave} disabled={updateMutation.isPending} className="bg-ci-green hover:bg-ci-green/90">
              {updateMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
              Enregistrer
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Test SMS */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Tester l'envoi de SMS</CardTitle>
          <CardDescription>Envoyez un SMS de test pour vérifier la configuration Orange CI</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3 items-end">
            <div className="flex-1 space-y-2">
              <Label htmlFor="test-phone">Numéro de destination</Label>
              <Input
                id="test-phone"
                type="tel"
                placeholder="+225 07 XX XX XX XX"
                value={testPhone}
                onChange={(e) => setTestPhone(e.target.value)}
              />
            </div>
            <Button
              onClick={handleTest}
              disabled={testMutation.isPending || !form.enabled}
              variant="outline"
            >
              {testMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
              Envoyer un test
            </Button>
          </div>
          {!form.enabled && (
            <p className="text-xs text-amber-600 mt-2">Activez la configuration SMS pour pouvoir envoyer un test.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────
export default function AdminNotifications() {
  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-full bg-ci-green/10 flex items-center justify-center">
          <Mail className="h-5 w-5 text-ci-green" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Notification Email / SMS</h1>
          <p className="text-sm text-muted-foreground">
            Configurez les serveurs d'envoi pour les alertes aux citoyens
          </p>
        </div>
      </div>

      {/* Status summary */}
      <StatusSummary />

      <Tabs defaultValue="smtp" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="smtp" className="flex items-center gap-2">
            <Mail className="h-4 w-4" />
            Serveur Email (SMTP)
          </TabsTrigger>
          <TabsTrigger value="sms" className="flex items-center gap-2">
            <Phone className="h-4 w-4" />
            Gateway SMS (Orange CI)
          </TabsTrigger>
        </TabsList>
        <TabsContent value="smtp" className="mt-6">
          <SmtpConfigTab />
        </TabsContent>
        <TabsContent value="sms" className="mt-6">
          <SmsOrangeConfigTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ─── Status Summary Component ────────────────────────────────────────────────
function StatusSummary() {
  const { data: mailConfig } = trpc.admin.getMailConfig.useQuery();
  const { data: smsConfig } = trpc.admin.getSmsConfig.useQuery();

  const mailEnabled = (mailConfig?.enabled as boolean) || false;
  const smsEnabled = (smsConfig?.enabled as boolean) || false;

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="flex items-center gap-3 p-4 rounded-lg border bg-card">
        <div className={`h-8 w-8 rounded-full flex items-center justify-center ${mailEnabled ? "bg-green-100 dark:bg-green-900/30" : "bg-gray-100 dark:bg-gray-800"}`}>
          {mailEnabled ? <CheckCircle2 className="h-4 w-4 text-green-600" /> : <XCircle className="h-4 w-4 text-gray-400" />}
        </div>
        <div>
          <p className="text-sm font-medium">Serveur Email</p>
          <p className="text-xs text-muted-foreground">
            {mailEnabled ? `Configuré — ${(mailConfig?.host as string) || ""}` : "Non configuré"}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-3 p-4 rounded-lg border bg-card">
        <div className={`h-8 w-8 rounded-full flex items-center justify-center ${smsEnabled ? "bg-orange-100 dark:bg-orange-900/30" : "bg-gray-100 dark:bg-gray-800"}`}>
          {smsEnabled ? <CheckCircle2 className="h-4 w-4 text-orange-600" /> : <XCircle className="h-4 w-4 text-gray-400" />}
        </div>
        <div>
          <p className="text-sm font-medium">Gateway SMS Orange CI</p>
          <p className="text-xs text-muted-foreground">
            {smsEnabled ? "Configuré et actif" : "Non configuré"}
          </p>
        </div>
      </div>
    </div>
  );
}
