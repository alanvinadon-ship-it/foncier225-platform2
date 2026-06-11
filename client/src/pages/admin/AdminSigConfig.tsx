import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Globe, Save, Plug, CheckCircle2, XCircle, Loader2, MapPin, Layers, Server, Code } from "lucide-react";
import { toast } from "sonner";

type SigProvider = "none" | "arcgis_online" | "arcgis_enterprise" | "geoserver" | "qgis_server" | "custom";

const PROVIDERS: { value: SigProvider; label: string; icon: typeof Globe; description: string }[] = [
  { value: "none", label: "Aucun (Google Maps par défaut)", icon: MapPin, description: "Utilise Google Maps intégré sans SIG professionnel" },
  { value: "arcgis_online", label: "ArcGIS Online", icon: Globe, description: "Service cloud Esri — idéal pour les organisations avec licence ArcGIS" },
  { value: "arcgis_enterprise", label: "ArcGIS Enterprise", icon: Server, description: "Serveur ArcGIS auto-hébergé — contrôle total des données" },
  { value: "geoserver", label: "GeoServer", icon: Layers, description: "Serveur open-source OGC — WMS/WFS/WCS" },
  { value: "qgis_server", label: "QGIS Server", icon: Layers, description: "Serveur open-source basé sur QGIS — WMS/WFS" },
  { value: "custom", label: "Personnalisé", icon: Code, description: "Connecteur API REST personnalisé" },
];

export default function AdminSigConfig() {
  const { data: config, isLoading } = trpc.admin.getSigConfig.useQuery();
  const updateMutation = trpc.admin.updateSigConfig.useMutation({
    onSuccess: () => toast.success("Configuration SIG enregistrée"),
    onError: (err) => toast.error("Erreur", { description: err.message }),
  });
  const testMutation = trpc.admin.testSigConnection.useMutation({
    onSuccess: (res) => {
      if (res.success) toast.success(res.message);
      else toast.error(res.error);
    },
    onError: (err) => toast.error("Erreur", { description: err.message }),
  });

  const [provider, setProvider] = useState<SigProvider>("none");
  const [enabled, setEnabled] = useState(false);

  // ArcGIS Online
  const [arcgisOnline, setArcgisOnline] = useState({
    portalUrl: "https://www.arcgis.com",
    clientId: "",
    clientSecret: "",
    orgId: "",
  });

  // ArcGIS Enterprise
  const [arcgisEnterprise, setArcgisEnterprise] = useState({
    serverUrl: "",
    username: "",
    password: "",
    webAdaptorUrl: "",
  });

  // GeoServer
  const [geoserver, setGeoserver] = useState({
    baseUrl: "",
    workspace: "foncier225",
    username: "admin",
    password: "",
  });

  // QGIS Server
  const [qgisServer, setQgisServer] = useState({
    wmsUrl: "",
    wfsUrl: "",
    authToken: "",
  });

  // Custom
  const [custom, setCustom] = useState({
    url: "",
    apiKey: "",
    headers: "",
  });

  useEffect(() => {
    if (config) {
      setProvider((config.provider as SigProvider) || "none");
      setEnabled((config.enabled as boolean) || false);
      if (config.arcgisOnline) {
        const ao = config.arcgisOnline as Record<string, string>;
        setArcgisOnline({
          portalUrl: ao.portalUrl || "https://www.arcgis.com",
          clientId: ao.clientId || "",
          clientSecret: ao.clientSecret || "",
          orgId: ao.orgId || "",
        });
      }
      if (config.arcgisEnterprise) {
        const ae = config.arcgisEnterprise as Record<string, string>;
        setArcgisEnterprise({
          serverUrl: ae.serverUrl || "",
          username: ae.username || "",
          password: ae.password || "",
          webAdaptorUrl: ae.webAdaptorUrl || "",
        });
      }
      if (config.geoserver) {
        const gs = config.geoserver as Record<string, string>;
        setGeoserver({
          baseUrl: gs.baseUrl || "",
          workspace: gs.workspace || "foncier225",
          username: gs.username || "admin",
          password: gs.password || "",
        });
      }
      if (config.qgisServer) {
        const qs = config.qgisServer as Record<string, string>;
        setQgisServer({
          wmsUrl: qs.wmsUrl || "",
          wfsUrl: qs.wfsUrl || "",
          authToken: qs.authToken || "",
        });
      }
      if (config.custom) {
        const c = config.custom as Record<string, string>;
        setCustom({
          url: c.url || "",
          apiKey: c.apiKey || "",
          headers: c.headers || "",
        });
      }
    }
  }, [config]);

  const handleSave = () => {
    updateMutation.mutate({
      provider,
      enabled,
      arcgisOnline,
      arcgisEnterprise,
      geoserver,
      qgisServer,
      custom,
    });
  };

  const handleTest = () => {
    testMutation.mutate({ provider });
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <div className="h-8 w-64 bg-muted animate-pulse rounded" />
        <div className="h-48 bg-muted animate-pulse rounded" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-full bg-indigo-500/10 flex items-center justify-center">
          <Globe className="h-5 w-5 text-indigo-500" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Configuration SIG</h1>
          <p className="text-sm text-muted-foreground">
            Connectez un Système d'Information Géographique professionnel à la plateforme
          </p>
        </div>
      </div>

      {/* Status */}
      <div className="flex items-center gap-3 p-4 rounded-lg border bg-card">
        <div className={`h-8 w-8 rounded-full flex items-center justify-center ${enabled && provider !== "none" ? "bg-green-100 dark:bg-green-900/30" : "bg-gray-100 dark:bg-gray-800"}`}>
          {enabled && provider !== "none" ? <CheckCircle2 className="h-4 w-4 text-green-600" /> : <XCircle className="h-4 w-4 text-gray-400" />}
        </div>
        <div className="flex-1">
          <p className="text-sm font-medium">
            {enabled && provider !== "none"
              ? `SIG actif — ${PROVIDERS.find(p => p.value === provider)?.label}`
              : "SIG professionnel non configuré (Google Maps par défaut)"}
          </p>
          <p className="text-xs text-muted-foreground">
            {enabled && provider !== "none"
              ? "Les couches SIG seront superposées aux cartes de la plateforme"
              : "La plateforme utilise Google Maps avec les données GPS internes"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Label htmlFor="sig-enabled" className="text-sm">Activer</Label>
          <Switch
            id="sig-enabled"
            checked={enabled}
            onCheckedChange={setEnabled}
            disabled={provider === "none"}
          />
        </div>
      </div>

      {/* Provider Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Fournisseur SIG</CardTitle>
          <CardDescription>Sélectionnez le type de serveur SIG à connecter</CardDescription>
        </CardHeader>
        <CardContent>
          <Select value={provider} onValueChange={(v) => setProvider(v as SigProvider)}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Choisir un fournisseur" />
            </SelectTrigger>
            <SelectContent>
              {PROVIDERS.map((p) => (
                <SelectItem key={p.value} value={p.value}>
                  <div className="flex items-center gap-2">
                    <p.icon className="h-4 w-4" />
                    <span>{p.label}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground mt-2">
            {PROVIDERS.find(p => p.value === provider)?.description}
          </p>
        </CardContent>
      </Card>

      {/* Dynamic Config Forms */}
      {provider === "arcgis_online" && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-lg bg-blue-600/10 flex items-center justify-center">
                <Globe className="h-4 w-4 text-blue-600" />
              </div>
              <div>
                <CardTitle className="text-lg">ArcGIS Online</CardTitle>
                <CardDescription>Connectez votre organisation ArcGIS Online (Esri Cloud)</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800">
              <p className="text-sm text-blue-800 dark:text-blue-200">
                <strong>Prérequis :</strong> Créez une application OAuth sur{" "}
                <a href="https://developers.arcgis.com" target="_blank" rel="noopener noreferrer" className="underline font-medium">
                  developers.arcgis.com
                </a>
                {" "}→ Applications → Nouvelle application.
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>URL du portail</Label>
                <Input
                  placeholder="https://www.arcgis.com"
                  value={arcgisOnline.portalUrl}
                  onChange={(e) => setArcgisOnline(prev => ({ ...prev, portalUrl: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Organization ID</Label>
                <Input
                  placeholder="Votre Org ID"
                  value={arcgisOnline.orgId}
                  onChange={(e) => setArcgisOnline(prev => ({ ...prev, orgId: e.target.value }))}
                />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Client ID (App ID)</Label>
                <Input
                  placeholder="Votre Client ID"
                  value={arcgisOnline.clientId}
                  onChange={(e) => setArcgisOnline(prev => ({ ...prev, clientId: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Client Secret</Label>
                <Input
                  type="password"
                  placeholder="••••••••"
                  value={arcgisOnline.clientSecret}
                  onChange={(e) => setArcgisOnline(prev => ({ ...prev, clientSecret: e.target.value }))}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {provider === "arcgis_enterprise" && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-lg bg-purple-600/10 flex items-center justify-center">
                <Server className="h-4 w-4 text-purple-600" />
              </div>
              <div>
                <CardTitle className="text-lg">ArcGIS Enterprise</CardTitle>
                <CardDescription>Connectez votre serveur ArcGIS Enterprise auto-hébergé</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>URL du serveur ArcGIS</Label>
                <Input
                  placeholder="https://gis.foncier225.ci/arcgis"
                  value={arcgisEnterprise.serverUrl}
                  onChange={(e) => setArcgisEnterprise(prev => ({ ...prev, serverUrl: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>URL Web Adaptor</Label>
                <Input
                  placeholder="https://gis.foncier225.ci/portal"
                  value={arcgisEnterprise.webAdaptorUrl}
                  onChange={(e) => setArcgisEnterprise(prev => ({ ...prev, webAdaptorUrl: e.target.value }))}
                />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Nom d'utilisateur admin</Label>
                <Input
                  placeholder="admin"
                  value={arcgisEnterprise.username}
                  onChange={(e) => setArcgisEnterprise(prev => ({ ...prev, username: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Mot de passe</Label>
                <Input
                  type="password"
                  placeholder="••••••••"
                  value={arcgisEnterprise.password}
                  onChange={(e) => setArcgisEnterprise(prev => ({ ...prev, password: e.target.value }))}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {provider === "geoserver" && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-lg bg-green-600/10 flex items-center justify-center">
                <Layers className="h-4 w-4 text-green-600" />
              </div>
              <div>
                <CardTitle className="text-lg">GeoServer</CardTitle>
                <CardDescription>Connectez votre instance GeoServer (OGC WMS/WFS/WCS)</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-3 rounded-lg bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800">
              <p className="text-sm text-green-800 dark:text-green-200">
                <strong>GeoServer</strong> est un serveur open-source conforme aux standards OGC. Il supporte WMS, WFS, WCS et les formats Shapefile, PostGIS, GeoTIFF.
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>URL de base</Label>
                <Input
                  placeholder="https://geoserver.foncier225.ci/geoserver"
                  value={geoserver.baseUrl}
                  onChange={(e) => setGeoserver(prev => ({ ...prev, baseUrl: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Workspace</Label>
                <Input
                  placeholder="foncier225"
                  value={geoserver.workspace}
                  onChange={(e) => setGeoserver(prev => ({ ...prev, workspace: e.target.value }))}
                />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Nom d'utilisateur</Label>
                <Input
                  placeholder="admin"
                  value={geoserver.username}
                  onChange={(e) => setGeoserver(prev => ({ ...prev, username: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Mot de passe</Label>
                <Input
                  type="password"
                  placeholder="••••••••"
                  value={geoserver.password}
                  onChange={(e) => setGeoserver(prev => ({ ...prev, password: e.target.value }))}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {provider === "qgis_server" && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-lg bg-emerald-600/10 flex items-center justify-center">
                <Layers className="h-4 w-4 text-emerald-600" />
              </div>
              <div>
                <CardTitle className="text-lg">QGIS Server</CardTitle>
                <CardDescription>Connectez votre instance QGIS Server (WMS/WFS)</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800">
              <p className="text-sm text-emerald-800 dark:text-emerald-200">
                <strong>QGIS Server</strong> publie vos projets QGIS en tant que services WMS/WFS. Configurez les URLs de vos services ci-dessous.
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>URL WMS</Label>
                <Input
                  placeholder="https://qgis.foncier225.ci/wms"
                  value={qgisServer.wmsUrl}
                  onChange={(e) => setQgisServer(prev => ({ ...prev, wmsUrl: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>URL WFS</Label>
                <Input
                  placeholder="https://qgis.foncier225.ci/wfs"
                  value={qgisServer.wfsUrl}
                  onChange={(e) => setQgisServer(prev => ({ ...prev, wfsUrl: e.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Token d'authentification (optionnel)</Label>
              <Input
                type="password"
                placeholder="Bearer token ou clé API"
                value={qgisServer.authToken}
                onChange={(e) => setQgisServer(prev => ({ ...prev, authToken: e.target.value }))}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {provider === "custom" && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-lg bg-gray-600/10 flex items-center justify-center">
                <Code className="h-4 w-4 text-gray-600" />
              </div>
              <div>
                <CardTitle className="text-lg">Connecteur personnalisé</CardTitle>
                <CardDescription>Configurez un connecteur API REST personnalisé vers votre SIG</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>URL de l'API</Label>
                <Input
                  placeholder="https://api.mon-sig.ci/v1"
                  value={custom.url}
                  onChange={(e) => setCustom(prev => ({ ...prev, url: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Clé API</Label>
                <Input
                  type="password"
                  placeholder="••••••••"
                  value={custom.apiKey}
                  onChange={(e) => setCustom(prev => ({ ...prev, apiKey: e.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Headers personnalisés (JSON)</Label>
              <Textarea
                placeholder={'{"X-Custom-Header": "value", "Authorization": "Bearer ..."}'}
                value={custom.headers}
                onChange={(e) => setCustom(prev => ({ ...prev, headers: e.target.value }))}
                rows={3}
                className="font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground">
                Format JSON. Ces headers seront envoyés avec chaque requête vers le SIG.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Capabilities info */}
      {provider !== "none" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Fonctionnalités activées avec ce SIG</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                <span>Couches cadastrales superposées</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                <span>Délimitation précise des parcelles</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                <span>Analyse spatiale avancée</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                <span>Export cartographique (PDF/Shapefile)</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                <span>Géocodage inverse professionnel</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                <span>Imagerie satellite / orthophotos</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Actions */}
      <div className="flex items-center gap-3">
        <Button
          onClick={handleSave}
          disabled={updateMutation.isPending}
          className="bg-ci-green hover:bg-ci-green/90"
        >
          {updateMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
          Enregistrer la configuration
        </Button>
        {provider !== "none" && enabled && (
          <Button
            onClick={handleTest}
            disabled={testMutation.isPending}
            variant="outline"
          >
            {testMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Plug className="h-4 w-4 mr-2" />}
            Tester la connexion
          </Button>
        )}
      </div>
    </div>
  );
}
