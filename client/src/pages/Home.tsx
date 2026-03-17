import PublicLayout from "@/components/PublicLayout";
import { Button } from "@/components/ui/button";
import { ArrowRight, FileCheck, MapPin, QrCode, Shield, Users, Zap } from "lucide-react";
import { Link } from "wouter";

const HERO_URL = "https://d2xsxph8kpxj0f.cloudfront.net/310519663315306103/5jQVPXrA6y6Zze2FEtSNJt/foncier225-hero-SsiAdeushYBm5vZxeTroBD.webp";

const features = [
  {
    icon: MapPin,
    title: "Digital Twin Parcelle",
    desc: "Consultez le statut public de toute parcelle enregistrée. Timeline synthétique, zéro donnée personnelle exposée.",
  },
  {
    icon: QrCode,
    title: "Vérification QR",
    desc: "Scannez le QR code d'une attestation pour vérifier instantanément son authenticité et sa validité.",
  },
  {
    icon: Shield,
    title: "Sécurité Maximale",
    desc: "Tokens opaques SHA-256, rate limiting anti-scraping, audit trail complet sur chaque action sensible.",
  },
  {
    icon: Users,
    title: "Multi-Rôles",
    desc: "Citoyens, agents terrain, banques et administrateurs disposent chacun d'un accès adapté à leurs besoins.",
  },
  {
    icon: FileCheck,
    title: "Attestations Vérifiables",
    desc: "Assurance, médiation, acte notarié — chaque document est traçable et vérifiable publiquement.",
  },
  {
    icon: Zap,
    title: "Temps Réel",
    desc: "Suivi en temps réel de l'avancement des dossiers fonciers avec notifications et timeline détaillée.",
  },
];

const statuses = [
  { label: "Dossier en cours", color: "bg-blue-500" },
  { label: "En opposition", color: "bg-ci-orange" },
  { label: "Médiation", color: "bg-yellow-500" },
  { label: "Gelé", color: "bg-red-500" },
  { label: "Acte notarié", color: "bg-purple-500" },
  { label: "Validé", color: "bg-ci-green" },
];

export default function Home() {
  return (
    <PublicLayout>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0">
          <img src={HERO_URL} alt="" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-r from-foreground/90 via-foreground/70 to-foreground/40" />
        </div>
        <div className="relative container py-20 md:py-32">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 bg-ci-green/20 text-ci-green-light border border-ci-green/30 rounded-full px-4 py-1.5 text-sm mb-6">
              <Shield className="h-3.5 w-3.5" />
              Plateforme officielle
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-white leading-tight tracking-tight">
              Le registre foncier
              <span className="block text-ci-orange">de confiance</span>
            </h1>
            <p className="mt-5 text-lg text-white/80 leading-relaxed max-w-xl">
              Consultez le statut de toute parcelle, vérifiez l'authenticité des attestations 
              et suivez l'avancement de vos dossiers fonciers en toute transparence.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/parcelle/demo">
                <Button size="lg" className="bg-ci-orange hover:bg-ci-orange/90 text-white font-semibold shadow-lg">
                  <MapPin className="h-4 w-4 mr-2" />
                  Voir une parcelle
                </Button>
              </Link>
              <Link href="/verify">
                <Button size="lg" variant="outline" className="border-white/30 text-white hover:bg-white/10 font-semibold">
                  <QrCode className="h-4 w-4 mr-2" />
                  Vérifier un document
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Status bar */}
      <section className="bg-white border-b">
        <div className="container py-6">
          <div className="flex flex-wrap items-center justify-center gap-4 md:gap-6">
            {statuses.map(s => (
              <div key={s.label} className="flex items-center gap-2 text-sm">
                <span className={`h-2.5 w-2.5 rounded-full ${s.color}`} />
                <span className="text-muted-foreground">{s.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-16 md:py-24 bg-background">
        <div className="container">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight">
              Une plateforme <span className="text-ci-green">complète</span>
            </h2>
            <p className="mt-3 text-muted-foreground max-w-2xl mx-auto">
              Foncier225 offre un ensemble d'outils pour la gestion transparente et sécurisée 
              du patrimoine foncier national.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map(f => (
              <div key={f.title} className="group p-6 rounded-lg border bg-card hover:shadow-md transition-all">
                <div className="h-10 w-10 rounded-lg bg-ci-green-light flex items-center justify-center mb-4 group-hover:bg-ci-green group-hover:text-white transition-colors">
                  <f.icon className="h-5 w-5 text-ci-green group-hover:text-white transition-colors" />
                </div>
                <h3 className="font-semibold text-lg mb-2">{f.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 bg-ci-green">
        <div className="container text-center">
          <h2 className="text-3xl font-bold text-white mb-4">
            Commencez à utiliser Foncier225
          </h2>
          <p className="text-white/80 max-w-xl mx-auto mb-8">
            Accédez au registre foncier national, vérifiez des documents et suivez vos dossiers 
            depuis n'importe où.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Link href="/verify">
              <Button size="lg" className="bg-white text-ci-green hover:bg-white/90 font-semibold shadow-lg">
                Vérifier un document
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}
