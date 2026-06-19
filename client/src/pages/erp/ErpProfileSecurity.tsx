import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Shield, Lock, ArrowLeft } from "lucide-react";
import { Link } from "wouter";

export default function ErpProfileSecurity() {
  const { data: profile, isLoading } = trpc.erp.profile.get.useQuery();
  const updatePasswordMutation = trpc.erp.profile.updatePassword.useMutation({
    onSuccess: () => {
      toast.success("Mot de passe modifié avec succès");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    },
    onError: (e) => toast.error(e.message),
  });

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  if (isLoading) return <div className="p-6 text-muted-foreground">Chargement...</div>;

  const handlePasswordChange = () => {
    if (newPassword.length < 8) { toast.error("Le mot de passe doit faire au moins 8 caractères"); return; }
    if (newPassword !== confirmPassword) { toast.error("Les mots de passe ne correspondent pas"); return; }
    updatePasswordMutation.mutate({ currentPassword, newPassword, confirmPassword });
  };

  const lastPasswordChange = profile?.securitySettings?.lastPasswordChange;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/erp/profile">
          <Button variant="ghost" size="icon"><ArrowLeft size={18} /></Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Sécurité du compte</h1>
          <p className="text-muted-foreground">Gérez la sécurité de votre compte ERP</p>
        </div>
      </div>

      {/* Changer le mot de passe */}
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Lock size={18} /> Modifier le mot de passe</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-1 block">Mot de passe actuel</label>
            <Input type="password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} placeholder="••••••••" />
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Nouveau mot de passe</label>
            <Input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="Min. 8 caractères" />
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Confirmer le nouveau mot de passe</label>
            <Input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="Confirmer" />
          </div>
          {lastPasswordChange && (
            <p className="text-xs text-muted-foreground">
              Dernier changement : {new Date(lastPasswordChange).toLocaleDateString("fr-FR")}
            </p>
          )}
          <div className="flex justify-end">
            <Button onClick={handlePasswordChange} disabled={updatePasswordMutation.isPending}>
              {updatePasswordMutation.isPending ? "Modification..." : "Modifier le mot de passe"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Paramètres de sécurité */}
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Shield size={18} /> Paramètres de sécurité</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between py-3 border-b border-border">
            <div>
              <p className="font-medium text-sm">Authentification à deux facteurs</p>
              <p className="text-xs text-muted-foreground">Ajouter une couche de sécurité supplémentaire</p>
            </div>
            <span className="text-xs px-2 py-1 rounded bg-muted text-muted-foreground">
              {profile?.securitySettings?.twoFactorEnabled ? "Activé" : "Désactivé"}
            </span>
          </div>
          <div className="flex items-center justify-between py-3 border-b border-border">
            <div>
              <p className="font-medium text-sm">Alertes de connexion</p>
              <p className="text-xs text-muted-foreground">Recevoir une notification lors d'une nouvelle connexion</p>
            </div>
            <span className="text-xs px-2 py-1 rounded bg-muted text-muted-foreground">
              {profile?.securitySettings?.loginAlerts ? "Activé" : "Désactivé"}
            </span>
          </div>
          <div className="flex items-center justify-between py-3">
            <div>
              <p className="font-medium text-sm">Timeout de session</p>
              <p className="text-xs text-muted-foreground">Durée d'inactivité avant déconnexion automatique</p>
            </div>
            <span className="text-xs px-2 py-1 rounded bg-muted text-muted-foreground">
              {profile?.securitySettings?.sessionTimeout || 30} min
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
