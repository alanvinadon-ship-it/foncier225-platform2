import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { Button } from "@/components/ui/button";
import { MapPin, Menu, Shield, X } from "lucide-react";
import { useState } from "react";
import { Link, useLocation } from "wouter";

const LOGO_URL = "https://d2xsxph8kpxj0f.cloudfront.net/310519663315306103/5jQVPXrA6y6Zze2FEtSNJt/foncier225-logo-8Tu2AjJfXPzkTY5ufdWVtP.webp";

const navLinks = [
  { label: "Accueil", path: "/" },
  { label: "Vérifier", path: "/verify" },
];

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [location] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex flex-col min-h-screen">
      {/* Top bar */}
      <div className="bg-ci-green text-white text-xs py-1.5">
        <div className="container flex items-center justify-between">
          <span>Plateforme Foncière Nationale — Côte d'Ivoire</span>
          <div className="flex items-center gap-1.5">
            <Shield className="h-3 w-3" />
            <span>Données sécurisées</span>
          </div>
        </div>
      </div>

      {/* Main navbar */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur border-b border-border">
        <div className="container flex items-center justify-between h-16">
          <Link href="/" className="flex items-center gap-2.5">
            <img src={LOGO_URL} alt="Foncier225" className="h-9 w-9 object-contain" />
            <div className="flex flex-col">
              <span className="text-lg font-bold tracking-tight text-foreground leading-tight">Foncier225</span>
              <span className="text-[10px] text-muted-foreground leading-tight">Registre Foncier</span>
            </div>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map(link => (
              <Link key={link.path} href={link.path}>
                <span className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  location === link.path
                    ? "bg-ci-green-light text-ci-green"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                }`}>
                  {link.label}
                </span>
              </Link>
            ))}
          </nav>

          <div className="hidden md:flex items-center gap-2">
            {user ? (
              <Link href="/admin">
                <Button size="sm" className="bg-ci-green hover:bg-ci-green/90">
                  <MapPin className="h-3.5 w-3.5 mr-1.5" />
                  Tableau de bord
                </Button>
              </Link>
            ) : (
              <Button size="sm" className="bg-ci-green hover:bg-ci-green/90" onClick={() => { window.location.href = getLoginUrl(); }}>
                Se connecter
              </Button>
            )}
          </div>

          {/* Mobile menu toggle */}
          <button className="md:hidden p-2" onClick={() => setMobileOpen(!mobileOpen)}>
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        {/* Mobile nav */}
        {mobileOpen && (
          <div className="md:hidden border-t bg-white px-4 py-3 space-y-2">
            {navLinks.map(link => (
              <Link key={link.path} href={link.path} onClick={() => setMobileOpen(false)}>
                <span className={`block px-3 py-2 rounded-md text-sm font-medium ${
                  location === link.path ? "bg-ci-green-light text-ci-green" : "text-muted-foreground"
                }`}>
                  {link.label}
                </span>
              </Link>
            ))}
            <div className="pt-2 border-t">
              {user ? (
                <Link href="/admin" onClick={() => setMobileOpen(false)}>
                  <Button size="sm" className="w-full bg-ci-green hover:bg-ci-green/90">Tableau de bord</Button>
                </Link>
              ) : (
                <Button size="sm" className="w-full bg-ci-green hover:bg-ci-green/90" onClick={() => { window.location.href = getLoginUrl(); }}>
                  Se connecter
                </Button>
              )}
            </div>
          </div>
        )}
      </header>

      {/* Main content */}
      <main className="flex-1">
        {children}
      </main>

      {/* Footer */}
      <footer className="bg-foreground text-background/80">
        <div className="container py-10">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <img src={LOGO_URL} alt="Foncier225" className="h-8 w-8 object-contain brightness-200" />
                <span className="text-lg font-bold text-white">Foncier225</span>
              </div>
              <p className="text-sm text-background/60 leading-relaxed">
                Plateforme nationale de gestion foncière de la Côte d'Ivoire. 
                Transparence, sécurité et traçabilité pour chaque parcelle.
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-white mb-3 text-sm">Liens rapides</h4>
              <ul className="space-y-2 text-sm">
                <li><Link href="/" className="hover:text-white transition-colors">Accueil</Link></li>
                <li><Link href="/verify" className="hover:text-white transition-colors">Vérifier un document</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-white mb-3 text-sm">Informations</h4>
              <ul className="space-y-2 text-sm">
                <li>Ministère de la Construction</li>
                <li>Abidjan, Côte d'Ivoire</li>
                <li className="text-background/50 text-xs pt-2">Zéro PII en accès public</li>
              </ul>
            </div>
          </div>
          <div className="border-t border-background/10 mt-8 pt-6 text-center text-xs text-background/40">
            &copy; {new Date().getFullYear()} Foncier225 — Tous droits réservés
          </div>
        </div>
      </footer>
    </div>
  );
}
