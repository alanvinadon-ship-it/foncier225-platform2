import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import {
  Search,
  FileText,
  MapPin,
  Clock,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ArrowRight,
  History,
  Trash2,
  Building2,
  Trees,
  Loader2,
  Info,
} from "lucide-react";

type TabType = "sigfu" | "sifor";

interface RecentSearch {
  type: TabType;
  reference: string;
  timestamp: number;
}

// Statuts SIGFU avec couleurs
const SIGFU_STATUTS: Record<string, { label: string; color: string; icon: typeof CheckCircle2 }> = {
  DEPOSEE: { label: "Déposée", color: "bg-blue-100 text-blue-700", icon: FileText },
  EN_INSTRUCTION: { label: "En instruction", color: "bg-amber-100 text-amber-700", icon: Clock },
  BORNAGE_PROGRAMME: { label: "Bornage programmé", color: "bg-purple-100 text-purple-700", icon: MapPin },
  BORNAGE_EFFECTUE: { label: "Bornage effectué", color: "bg-indigo-100 text-indigo-700", icon: CheckCircle2 },
  PLAN_ETABLI: { label: "Plan établi", color: "bg-teal-100 text-teal-700", icon: FileText },
  APPROBATION: { label: "En approbation", color: "bg-orange-100 text-orange-700", icon: Clock },
  APPROUVEE: { label: "Approuvée", color: "bg-green-100 text-green-700", icon: CheckCircle2 },
  REJETEE: { label: "Rejetée", color: "bg-red-100 text-red-700", icon: XCircle },
  CLASSEE: { label: "Classée", color: "bg-gray-100 text-gray-700", icon: FileText },
};

// Statuts SIFOR avec couleurs
const SIFOR_STATUTS: Record<string, { label: string; color: string; icon: typeof CheckCircle2 }> = {
  DEMANDE_DEPOSEE: { label: "Demande déposée", color: "bg-blue-100 text-blue-700", icon: FileText },
  ENQUETE_PROGRAMMEE: { label: "Enquête programmée", color: "bg-purple-100 text-purple-700", icon: Clock },
  ENQUETE_EN_COURS: { label: "Enquête en cours", color: "bg-amber-100 text-amber-700", icon: Search },
  PUBLICITE_FONCIERE: { label: "Publicité foncière", color: "bg-indigo-100 text-indigo-700", icon: Info },
  OPPOSITION_RECUE: { label: "Opposition reçue", color: "bg-red-100 text-red-700", icon: AlertTriangle },
  CERTIFICAT_DELIVRE: { label: "Certificat délivré", color: "bg-green-100 text-green-700", icon: CheckCircle2 },
  REFUSE: { label: "Refusé", color: "bg-red-100 text-red-700", icon: XCircle },
};

// Ordre des étapes SIGFU pour la timeline
const SIGFU_STEPS = [
  "DEPOSEE", "EN_INSTRUCTION", "BORNAGE_PROGRAMME", "BORNAGE_EFFECTUE",
  "PLAN_ETABLI", "APPROBATION", "APPROUVEE",
];

// Ordre des étapes SIFOR pour la timeline
const SIFOR_STEPS = [
  "DEMANDE_DEPOSEE", "ENQUETE_PROGRAMMEE", "ENQUETE_EN_COURS",
  "PUBLICITE_FONCIERE", "CERTIFICAT_DELIVRE",
];

export default function SuiviDossiers() {
  const [activeTab, setActiveTab] = useState<TabType>("sigfu");
  const [sigfuReference, setSigfuReference] = useState("");
  const [siforReference, setSiforReference] = useState("");
  const [sigfuSearchTrigger, setSigfuSearchTrigger] = useState("");
  const [siforSearchTrigger, setSiforSearchTrigger] = useState("");
  const [recentSearches, setRecentSearches] = useState<RecentSearch[]>([]);

  // Charger les recherches récentes depuis localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem("foncier225_recent_searches");
      if (stored) setRecentSearches(JSON.parse(stored));
    } catch { /* ignore */ }
  }, []);

  const saveSearch = (type: TabType, reference: string) => {
    const updated = [
      { type, reference, timestamp: Date.now() },
      ...recentSearches.filter(s => !(s.type === type && s.reference === reference)),
    ].slice(0, 10);
    setRecentSearches(updated);
    localStorage.setItem("foncier225_recent_searches", JSON.stringify(updated));
  };

  const clearHistory = () => {
    setRecentSearches([]);
    localStorage.removeItem("foncier225_recent_searches");
    toast.success("Historique effacé");
  };

  // Query SIGFU
  const sigfuQuery = trpc.interconnexion.citizen.trackSigfuDemande.useQuery(
    { numeroDemande: sigfuSearchTrigger },
    {
      enabled: !!sigfuSearchTrigger,
      retry: false,
    }
  );

  // Query SIFOR
  const siforQuery = trpc.interconnexion.citizen.trackSiforCertificat.useQuery(
    { numeroCertificat: siforSearchTrigger },
    {
      enabled: !!siforSearchTrigger,
      retry: false,
    }
  );

  const handleSigfuSearch = () => {
    if (!sigfuReference.trim()) {
      toast.error("Veuillez saisir un numéro de demande SIGFU");
      return;
    }
    setSigfuSearchTrigger(sigfuReference.trim());
    saveSearch("sigfu", sigfuReference.trim());
  };

  const handleSiforSearch = () => {
    if (!siforReference.trim()) {
      toast.error("Veuillez saisir un numéro de certificat SIFOR");
      return;
    }
    setSiforSearchTrigger(siforReference.trim());
    saveSearch("sifor", siforReference.trim());
  };

  const handleRecentClick = (search: RecentSearch) => {
    setActiveTab(search.type);
    if (search.type === "sigfu") {
      setSigfuReference(search.reference);
      setSigfuSearchTrigger(search.reference);
    } else {
      setSiforReference(search.reference);
      setSiforSearchTrigger(search.reference);
    }
  };

  const renderTimeline = (currentStatut: string, steps: string[], statutMap: Record<string, { label: string; color: string; icon: typeof CheckCircle2 }>) => {
    const currentIndex = steps.indexOf(currentStatut);

    return (
      <div className="relative mt-6">
        {/* Ligne de progression */}
        <div className="absolute top-5 left-5 right-5 h-0.5 bg-gray-200" />
        <div
          className="absolute top-5 left-5 h-0.5 bg-green-500 transition-all duration-500"
          style={{ width: `${Math.max(0, (currentIndex / (steps.length - 1)) * 100)}%` }}
        />

        {/* Étapes */}
        <div className="relative flex justify-between">
          {steps.map((step, index) => {
            const info = statutMap[step];
            const isCompleted = index <= currentIndex;
            const isCurrent = index === currentIndex;
            const Icon = info?.icon || Clock;

            return (
              <div key={step} className="flex flex-col items-center" style={{ width: `${100 / steps.length}%` }}>
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all ${
                    isCurrent
                      ? "border-green-500 bg-green-500 text-white scale-110 shadow-lg"
                      : isCompleted
                      ? "border-green-500 bg-green-50 text-green-600"
                      : "border-gray-200 bg-white text-gray-400"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                </div>
                <p
                  className={`mt-2 text-[10px] text-center leading-tight max-w-[80px] ${
                    isCurrent ? "font-bold text-green-700" : isCompleted ? "text-green-600" : "text-gray-400"
                  }`}
                >
                  {info?.label || step}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Suivi de vos dossiers</h1>
        <p className="text-sm text-gray-500 mt-1">
          Suivez l'avancement de vos demandes auprès du SIGFU (foncier urbain) et du SIFOR-CI (foncier rural)
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl">
        <button
          onClick={() => setActiveTab("sigfu")}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
            activeTab === "sigfu"
              ? "bg-white text-green-700 shadow-sm"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          <Building2 className="h-4 w-4" />
          SIGFU — Foncier Urbain
        </button>
        <button
          onClick={() => setActiveTab("sifor")}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
            activeTab === "sifor"
              ? "bg-white text-green-700 shadow-sm"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          <Trees className="h-4 w-4" />
          SIFOR-CI — Foncier Rural
        </button>
      </div>

      {/* Search SIGFU */}
      {activeTab === "sigfu" && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <Building2 className="h-5 w-5 text-blue-600" />
              Rechercher une demande SIGFU
            </h2>
            <p className="text-xs text-gray-500 mb-4">
              Saisissez votre numéro de demande (format : SIGFU-AAAA-XXXXXX) pour consulter l'état d'avancement de votre procédure foncière urbaine.
            </p>
            <div className="flex gap-3">
              <input
                type="text"
                value={sigfuReference}
                onChange={(e) => setSigfuReference(e.target.value.toUpperCase())}
                placeholder="Ex: SIGFU-2025-001234"
                className="flex-1 px-4 py-2.5 border border-gray-200 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                onKeyDown={(e) => e.key === "Enter" && handleSigfuSearch()}
              />
              <button
                onClick={handleSigfuSearch}
                disabled={sigfuQuery.isFetching}
                className="px-5 py-2.5 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
              >
                {sigfuQuery.isFetching ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Search className="h-4 w-4" />
                )}
                Rechercher
              </button>
            </div>
          </div>

          {/* Résultat SIGFU */}
          {sigfuQuery.data && sigfuQuery.data.status === "success" && sigfuQuery.data.data && (
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="font-semibold text-gray-900">Demande {sigfuQuery.data.data.numeroDemande}</h3>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Procédure : {sigfuQuery.data.data.procedureCode}
                  </p>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                  SIGFU_STATUTS[sigfuQuery.data.data.statut]?.color || "bg-gray-100 text-gray-700"
                }`}>
                  {SIGFU_STATUTS[sigfuQuery.data.data.statut]?.label || sigfuQuery.data.data.statut}
                </span>
              </div>

              {/* Timeline */}
              {renderTimeline(sigfuQuery.data.data.statut, SIGFU_STEPS, SIGFU_STATUTS)}

              {/* Détails */}
              <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="text-xs font-medium text-gray-500 uppercase mb-2">Demandeur</h4>
                  <p className="text-sm font-medium text-gray-900">
                    {sigfuQuery.data.data.demandeur?.nom} {sigfuQuery.data.data.demandeur?.prenoms}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">{sigfuQuery.data.data.demandeur?.telephone}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="text-xs font-medium text-gray-500 uppercase mb-2">Parcelle</h4>
                  <p className="text-sm font-medium text-gray-900">
                    {sigfuQuery.data.data.parcelle?.commune}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {sigfuQuery.data.data.parcelle?.superficie} m² — {sigfuQuery.data.data.parcelle?.localisation}
                  </p>
                </div>
              </div>

              {/* Étape courante */}
              {sigfuQuery.data.data.etapeCourante && (
                <div className="mt-5">
                  <h4 className="text-xs font-medium text-gray-500 uppercase mb-3">Étape en cours</h4>
                  <div className="flex items-center gap-3 text-sm bg-green-50 rounded-lg p-3">
                    <div className="w-2 h-2 rounded-full bg-green-500 shrink-0" />
                    <span className="text-gray-500 font-mono text-xs min-w-[80px]">
                      {sigfuQuery.data.data.etapeCourante.dateDebut
                        ? new Date(sigfuQuery.data.data.etapeCourante.dateDebut).toLocaleDateString("fr-CI")
                        : "—"}
                    </span>
                    <ArrowRight className="h-3 w-3 text-gray-300 shrink-0" />
                    <span className="text-gray-700 font-medium">{sigfuQuery.data.data.etapeCourante.libelle}</span>
                    {sigfuQuery.data.data.etapeCourante.responsable && (
                      <span className="text-xs text-gray-500 ml-auto">Resp: {sigfuQuery.data.data.etapeCourante.responsable}</span>
                    )}
                  </div>
                  {sigfuQuery.data.data.etapeCourante.observations && (
                    <p className="text-xs text-gray-500 mt-2 pl-5">{sigfuQuery.data.data.etapeCourante.observations}</p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Erreur ou circuit ouvert */}
          {sigfuQuery.data && sigfuQuery.data.status !== "success" && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-amber-800">Service temporairement indisponible</p>
                <p className="text-xs text-amber-600 mt-1">
                  {sigfuQuery.data.status === "circuit_open"
                    ? "Le service SIGFU est actuellement surchargé. Veuillez réessayer dans quelques minutes."
                    : sigfuQuery.data.error?.message || "Une erreur est survenue lors de la communication avec le SIGFU."}
                </p>
              </div>
            </div>
          )}

          {/* État vide */}
          {!sigfuSearchTrigger && (
            <div className="bg-gray-50 rounded-xl border border-dashed border-gray-200 p-8 text-center">
              <Building2 className="h-10 w-10 text-gray-300 mx-auto mb-3" />
              <p className="text-sm text-gray-500">
                Saisissez votre numéro de demande SIGFU pour consulter l'avancement
              </p>
              <p className="text-xs text-gray-400 mt-1">
                Ce numéro vous a été communiqué lors du dépôt de votre dossier au guichet foncier
              </p>
            </div>
          )}
        </div>
      )}

      {/* Search SIFOR */}
      {activeTab === "sifor" && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <Trees className="h-5 w-5 text-green-600" />
              Rechercher un certificat SIFOR-CI
            </h2>
            <p className="text-xs text-gray-500 mb-4">
              Saisissez votre numéro de certificat foncier rural (format : SIFOR-CF-AAAA-XXXX) pour suivre l'état de votre demande auprès de l'AFOR.
            </p>
            <div className="flex gap-3">
              <input
                type="text"
                value={siforReference}
                onChange={(e) => setSiforReference(e.target.value.toUpperCase())}
                placeholder="Ex: SIFOR-CF-2025-0001"
                className="flex-1 px-4 py-2.5 border border-gray-200 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                onKeyDown={(e) => e.key === "Enter" && handleSiforSearch()}
              />
              <button
                onClick={handleSiforSearch}
                disabled={siforQuery.isFetching}
                className="px-5 py-2.5 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
              >
                {siforQuery.isFetching ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Search className="h-4 w-4" />
                )}
                Rechercher
              </button>
            </div>
          </div>

          {/* Résultat SIFOR */}
          {siforQuery.data && siforQuery.data.status === "success" && siforQuery.data.data && (
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="font-semibold text-gray-900">Certificat {siforQuery.data.data.numeroCertificat}</h3>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Droit revendiqué : {siforQuery.data.data.droitRevendique || "Non spécifié"}
                  </p>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                  SIFOR_STATUTS[siforQuery.data.data.statut]?.color || "bg-gray-100 text-gray-700"
                }`}>
                  {SIFOR_STATUTS[siforQuery.data.data.statut]?.label || siforQuery.data.data.statut}
                </span>
              </div>

              {/* Timeline */}
              {renderTimeline(siforQuery.data.data.statut, SIFOR_STEPS, SIFOR_STATUTS)}

              {/* Détails */}
              <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="text-xs font-medium text-gray-500 uppercase mb-2">Demandeur</h4>
                  <p className="text-sm font-medium text-gray-900">
                    {siforQuery.data.data.demandeur?.nom} {siforQuery.data.data.demandeur?.prenoms}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">{siforQuery.data.data.demandeur?.telephone}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="text-xs font-medium text-gray-500 uppercase mb-2">Parcelle rurale</h4>
                  <p className="text-sm font-medium text-gray-900">
                    {siforQuery.data.data.parcelle?.village}, {siforQuery.data.data.parcelle?.sousPrefecture}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {siforQuery.data.data.parcelle?.departement} — {siforQuery.data.data.parcelle?.superficie} ha
                  </p>
                </div>
              </div>

              {/* Enquête */}
              {siforQuery.data.data.enquete && (
                <div className="mt-4 bg-blue-50 rounded-lg p-4">
                  <h4 className="text-xs font-medium text-blue-700 uppercase mb-2">Enquête foncière</h4>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-blue-500 text-xs">Date de début</span>
                      <p className="text-blue-900 font-medium">
                        {siforQuery.data.data.enquete.dateDebut
                          ? new Date(siforQuery.data.data.enquete.dateDebut).toLocaleDateString("fr-CI")
                          : "À déterminer"}
                      </p>
                    </div>
                    <div>
                      <span className="text-blue-500 text-xs">Enquêteur</span>
                      <p className="text-blue-900 font-medium">
                        {siforQuery.data.data.enquete.enqueteur || "Non assigné"}
                      </p>
                    </div>
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <span className="text-blue-500 text-xs">Statut</span>
                    <span className="px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-700">
                      {siforQuery.data.data.enquete.statut}
                    </span>
                  </div>
                </div>
              )}

              {/* Oppositions */}
              {siforQuery.data.data.oppositions && siforQuery.data.data.oppositions.length > 0 && (
                <div className="mt-4 bg-red-50 rounded-lg p-4">
                  <h4 className="text-xs font-medium text-red-700 uppercase mb-2">
                    Oppositions ({siforQuery.data.data.oppositions.length})
                  </h4>
                  <div className="space-y-2">
                    {siforQuery.data.data.oppositions.map((opp: any, i: number) => (
                      <div key={i} className="flex items-center gap-2 text-sm text-red-800">
                        <AlertTriangle className="h-3 w-3 shrink-0" />
                        <span>{opp.motif || "Opposition enregistrée"}</span>
                        <span className="text-xs text-red-500 ml-auto">
                          {opp.date ? new Date(opp.date).toLocaleDateString("fr-CI") : ""}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Erreur ou circuit ouvert */}
          {siforQuery.data && siforQuery.data.status !== "success" && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-amber-800">Service temporairement indisponible</p>
                <p className="text-xs text-amber-600 mt-1">
                  {siforQuery.data.status === "circuit_open"
                    ? "Le service SIFOR-CI est actuellement surchargé. Veuillez réessayer dans quelques minutes."
                    : siforQuery.data.error?.message || "Une erreur est survenue lors de la communication avec le SIFOR-CI."}
                </p>
              </div>
            </div>
          )}

          {/* État vide */}
          {!siforSearchTrigger && (
            <div className="bg-gray-50 rounded-xl border border-dashed border-gray-200 p-8 text-center">
              <Trees className="h-10 w-10 text-gray-300 mx-auto mb-3" />
              <p className="text-sm text-gray-500">
                Saisissez votre numéro de certificat SIFOR pour consulter l'avancement
              </p>
              <p className="text-xs text-gray-400 mt-1">
                Ce numéro vous a été communiqué par le Comité Villageois de Gestion Foncière Rurale (CVGFR)
              </p>
            </div>
          )}
        </div>
      )}

      {/* Recherches récentes */}
      {recentSearches.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-medium text-gray-900 flex items-center gap-2 text-sm">
              <History className="h-4 w-4 text-gray-500" />
              Recherches récentes
            </h3>
            <button
              onClick={clearHistory}
              className="text-xs text-gray-400 hover:text-red-500 flex items-center gap-1"
            >
              <Trash2 className="h-3 w-3" />
              Effacer
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {recentSearches.map((search, i) => (
              <button
                key={i}
                onClick={() => handleRecentClick(search)}
                className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 hover:bg-gray-100 rounded-lg text-xs transition-colors"
              >
                {search.type === "sigfu" ? (
                  <Building2 className="h-3 w-3 text-blue-500" />
                ) : (
                  <Trees className="h-3 w-3 text-green-500" />
                )}
                <span className="font-mono text-gray-700">{search.reference}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Info box */}
      <div className="bg-green-50 border border-green-200 rounded-xl p-4">
        <h3 className="text-sm font-medium text-green-800 mb-2 flex items-center gap-2">
          <Info className="h-4 w-4" />
          Comment obtenir votre numéro de suivi ?
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs text-green-700">
          <div>
            <p className="font-medium">SIGFU (Foncier Urbain)</p>
            <p className="mt-0.5">
              Votre numéro SIGFU-AAAA-XXXXXX vous est remis lors du dépôt de votre demande
              au guichet unique du foncier de votre commune (Conservation Foncière, Service des Domaines).
            </p>
          </div>
          <div>
            <p className="font-medium">SIFOR-CI (Foncier Rural)</p>
            <p className="mt-0.5">
              Votre numéro SIFOR-CF-AAAA-XXXX vous est communiqué par le Comité Villageois
              de Gestion Foncière Rurale (CVGFR) ou la Direction Régionale de l'AFOR.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
