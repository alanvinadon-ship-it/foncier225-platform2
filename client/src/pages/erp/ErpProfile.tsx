import { useState, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { User, Phone, Building2, Briefcase, Camera, Shield, Settings } from "lucide-react";
import { Link } from "wouter";

export default function ErpProfile() {
  const { data: profile, isLoading, refetch } = trpc.erp.profile.get.useQuery();
  const updateMutation = trpc.erp.profile.update.useMutation({
    onSuccess: () => { toast.success("Profil mis à jour"); refetch(); },
    onError: (e) => toast.error(e.message),
  });
  const uploadAvatarMutation = trpc.erp.profile.uploadAvatar.useMutation({
    onSuccess: () => { toast.success("Avatar mis à jour"); refetch(); },
    onError: (e) => toast.error(e.message),
  });

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [company, setCompany] = useState("");
  const [position, setPosition] = useState("");
  const [initialized, setInitialized] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  if (isLoading) return <div className="p-6 text-muted-foreground">Chargement...</div>;
  if (!profile) return <div className="p-6 text-destructive">Erreur de chargement du profil</div>;

  if (!initialized && profile) {
    setName(profile.user?.name || "");
    setPhone(profile.phone || "");
    setCompany(profile.company || "");
    setPosition(profile.position || "");
    setInitialized(true);
  }

  const handleSave = () => {
    updateMutation.mutate({ name, phone, company, position });
  };

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast.error("Fichier trop volumineux (max 5 Mo)"); return; }
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = (reader.result as string).split(",")[1];
      uploadAvatarMutation.mutate({ fileBase64: base64, fileName: file.name, mimeType: file.type });
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Mon Profil</h1>
          <p className="text-muted-foreground">Gérez vos informations personnelles</p>
        </div>
        <div className="flex gap-2">
          <Link href="/erp/profile/security">
            <Button variant="outline" size="sm"><Shield size={16} className="mr-1" /> Sécurité</Button>
          </Link>
          <Link href="/erp/profile/preferences">
            <Button variant="outline" size="sm"><Settings size={16} className="mr-1" /> Préférences</Button>
          </Link>
        </div>
      </div>

      {/* Avatar */}
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Camera size={18} /> Photo de profil</CardTitle></CardHeader>
        <CardContent>
          <div className="flex items-center gap-6">
            <div className="relative">
              {profile.avatarUrl ? (
                <img src={profile.avatarUrl} alt="Avatar" className="w-24 h-24 rounded-full object-cover border-2 border-border" />
              ) : (
                <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center text-2xl font-bold text-primary border-2 border-border">
                  {profile.user?.name?.charAt(0)?.toUpperCase() || "U"}
                </div>
              )}
            </div>
            <div>
              <input type="file" ref={fileRef} className="hidden" accept="image/*" onChange={handleAvatarUpload} />
              <Button variant="outline" onClick={() => fileRef.current?.click()} disabled={uploadAvatarMutation.isPending}>
                {uploadAvatarMutation.isPending ? "Envoi..." : "Changer la photo"}
              </Button>
              <p className="text-xs text-muted-foreground mt-1">JPG, PNG. Max 5 Mo.</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Informations personnelles */}
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><User size={18} /> Informations personnelles</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-1 block">Nom complet</label>
              <div className="relative">
                <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input value={name} onChange={e => setName(e.target.value)} className="pl-9" placeholder="Votre nom" />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Téléphone</label>
              <div className="relative">
                <Phone size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input value={phone} onChange={e => setPhone(e.target.value)} className="pl-9" placeholder="+225 XX XX XX XX" />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Entreprise</label>
              <div className="relative">
                <Building2 size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input value={company} onChange={e => setCompany(e.target.value)} className="pl-9" placeholder="Nom de l'entreprise" />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Poste</label>
              <div className="relative">
                <Briefcase size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input value={position} onChange={e => setPosition(e.target.value)} className="pl-9" placeholder="Votre poste" />
              </div>
            </div>
          </div>

          <div className="pt-2">
            <label className="text-sm font-medium mb-1 block">Email</label>
            <Input value={profile.user?.email || ""} disabled className="bg-muted" />
            <p className="text-xs text-muted-foreground mt-1">L'email ne peut pas être modifié directement.</p>
          </div>

          <div className="flex justify-end pt-2">
            <Button onClick={handleSave} disabled={updateMutation.isPending}>
              {updateMutation.isPending ? "Enregistrement..." : "Enregistrer les modifications"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
