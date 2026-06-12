import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import {
  Activity,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Search,
  Clock,
  ArrowUpDown,
  Network,
  Shield,
} from "lucide-react";

export default function AdminInterconnexion() {
  const [selectedSystem, setSelectedSystem] = useState<string | undefined>(undefined);
  const [idufciInput, setIdufciInput] = useState("");

  const healthQuery = trpc.interconnexion.admin.healthStatus.useQuery(undefined, {
    refetchInterval: 30000,
  });

  const auditQuery = trpc.interconnexion.admin.auditLog.useQuery({
    systemId: selectedSystem as any,
    limit: 50,
  });

  const verifyIdufci = trpc.interconnexion.admin.verifyIdufci.useMutation({
    onSuccess: (data) => {
      if (!data.formatValid) {
        toast.error(`Format IDUFCI invalide : ${data.error}`);
      } else if (data.apiResponse?.status === "success") {
        toast.success("IDUFCI vérifié avec succès");
      } else if (data.apiResponse?.status === "circuit_open") {
        toast.warning("Service IDUFCI temporairement indisponible");
      } else {
        toast.error(`Erreur API : ${data.apiResponse?.error?.message || "Inconnu"}`);
      }
    },
    onError: (err) => toast.error(err.message),
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "healthy":
        return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      case "degraded":
        return <AlertTriangle className="h-5 w-5 text-amber-500" />;
      case "unavailable":
        return <XCircle className="h-5 w-5 text-red-500" />;
      default:
        return <Activity className="h-5 w-5 text-gray-400" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      healthy: "bg-green-100 text-green-800",
      degraded: "bg-amber-100 text-amber-800",
      unavailable: "bg-red-100 text-red-800",
    };
    return colors[status] || "bg-gray-100 text-gray-800";
  };

  const getCircuitBadge = (state: string) => {
    const colors: Record<string, string> = {
      closed: "bg-green-100 text-green-700",
      half_open: "bg-amber-100 text-amber-700",
      open: "bg-red-100 text-red-700",
    };
    return colors[state] || "bg-gray-100 text-gray-700";
  };

  const systemLabels: Record<string, { name: string; desc: string }> = {
    sigfu: { name: "SIGFU", desc: "Foncier Urbain — MCLU" },
    idufci: { name: "IDUFCI", desc: "Identifiant Unique Parcelle" },
    sifor: { name: "SIFOR-CI", desc: "Foncier Rural — AFOR" },
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Network className="h-6 w-6 text-green-600" />
            Interconnexion API
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Supervision des connexions avec les plateformes de l'État (SIGFU, IDUFCI, SIFOR-CI)
          </p>
        </div>
        <button
          onClick={() => healthQuery.refetch()}
          className="flex items-center gap-2 px-3 py-2 text-sm bg-white border border-gray-200 rounded-lg hover:bg-gray-50"
        >
          <RefreshCw className={`h-4 w-4 ${healthQuery.isFetching ? "animate-spin" : ""}`} />
          Actualiser
        </button>
      </div>

      {/* Health Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {healthQuery.data?.map((system) => (
          <div
            key={system.systemId}
            className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-semibold text-gray-900">
                  {systemLabels[system.systemId]?.name || system.systemId}
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  {systemLabels[system.systemId]?.desc}
                </p>
              </div>
              {getStatusIcon(system.status)}
            </div>

            <div className="mt-4 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">Statut</span>
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusBadge(system.status)}`}>
                  {system.status === "healthy" ? "Connecté" : system.status === "degraded" ? "Dégradé" : "Indisponible"}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">Circuit Breaker</span>
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getCircuitBadge(system.circuitState)}`}>
                  {system.circuitState === "closed" ? "Fermé" : system.circuitState === "half_open" ? "Semi-ouvert" : "Ouvert"}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">Temps moyen</span>
                <span className="text-gray-700 font-mono text-xs">{system.averageResponseMs}ms</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">Appels (24h)</span>
                <span className="text-gray-700 font-mono text-xs">{system.totalCalls24h}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">Taux d'erreur</span>
                <span className={`font-mono text-xs ${system.errorRate24h > 0.05 ? "text-red-600" : "text-gray-700"}`}>
                  {(system.errorRate24h * 100).toFixed(1)}%
                </span>
              </div>
              {system.lastError && (
                <div className="mt-2 p-2 bg-red-50 rounded text-xs text-red-700 truncate">
                  {system.lastError}
                </div>
              )}
            </div>
          </div>
        ))}

        {!healthQuery.data && (
          <div className="col-span-3 text-center py-8 text-gray-400">
            <Activity className="h-8 w-8 mx-auto mb-2 animate-pulse" />
            Chargement des statuts...
          </div>
        )}
      </div>

      {/* IDUFCI Verification Tool */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h2 className="font-semibold text-gray-900 flex items-center gap-2 mb-4">
          <Shield className="h-5 w-5 text-blue-600" />
          Vérification IDUFCI
        </h2>
        <div className="flex gap-3">
          <input
            type="text"
            value={idufciInput}
            onChange={(e) => setIdufciInput(e.target.value.toUpperCase())}
            placeholder="Ex: CIABJ001002000010001"
            className="flex-1 px-4 py-2 border border-gray-200 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-green-500"
            maxLength={25}
          />
          <button
            onClick={() => {
              if (idufciInput.length >= 10) {
                verifyIdufci.mutate({ idufci: idufciInput });
              } else {
                toast.error("Code IDUFCI trop court (minimum 10 caractères)");
              }
            }}
            disabled={verifyIdufci.isPending}
            className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
          >
            <Search className="h-4 w-4" />
            Vérifier
          </button>
        </div>
        {verifyIdufci.data && verifyIdufci.data.formatValid && (
          <div className="mt-3 p-3 bg-gray-50 rounded-lg text-sm">
            <p className="font-medium text-gray-700 mb-1">Format valide — Décomposition :</p>
            <div className="grid grid-cols-2 md:grid-cols-6 gap-2 text-xs">
              <div className="bg-white p-2 rounded border">
                <span className="text-gray-500">Pays</span>
                <p className="font-mono font-bold">{verifyIdufci.data.parsed?.codePays}</p>
              </div>
              <div className="bg-white p-2 rounded border">
                <span className="text-gray-500">Région</span>
                <p className="font-mono font-bold">{verifyIdufci.data.parsed?.codeRegion}</p>
              </div>
              <div className="bg-white p-2 rounded border">
                <span className="text-gray-500">Commune</span>
                <p className="font-mono font-bold">{verifyIdufci.data.parsed?.codeCommune}</p>
              </div>
              <div className="bg-white p-2 rounded border">
                <span className="text-gray-500">Secteur</span>
                <p className="font-mono font-bold">{verifyIdufci.data.parsed?.codeSecteur}</p>
              </div>
              <div className="bg-white p-2 rounded border">
                <span className="text-gray-500">N° séquentiel</span>
                <p className="font-mono font-bold">{verifyIdufci.data.parsed?.numeroSequentiel}</p>
              </div>
              <div className="bg-white p-2 rounded border">
                <span className="text-gray-500">Contrôle</span>
                <p className="font-mono font-bold">{verifyIdufci.data.parsed?.codeControle}</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Audit Log */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-gray-900 flex items-center gap-2">
            <Clock className="h-5 w-5 text-gray-600" />
            Journal d'audit des appels
          </h2>
          <div className="flex gap-2">
            <select
              value={selectedSystem || ""}
              onChange={(e) => setSelectedSystem(e.target.value || undefined)}
              className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg"
            >
              <option value="">Tous les systèmes</option>
              <option value="sigfu">SIGFU</option>
              <option value="idufci">IDUFCI</option>
              <option value="sifor">SIFOR-CI</option>
            </select>
          </div>
        </div>

        {auditQuery.data && auditQuery.data.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left py-2 px-3 text-gray-500 font-medium">
                    <span className="flex items-center gap-1">Horodatage <ArrowUpDown className="h-3 w-3" /></span>
                  </th>
                  <th className="text-left py-2 px-3 text-gray-500 font-medium">Système</th>
                  <th className="text-left py-2 px-3 text-gray-500 font-medium">Méthode</th>
                  <th className="text-left py-2 px-3 text-gray-500 font-medium">Endpoint</th>
                  <th className="text-left py-2 px-3 text-gray-500 font-medium">Statut</th>
                  <th className="text-left py-2 px-3 text-gray-500 font-medium">Durée</th>
                </tr>
              </thead>
              <tbody>
                {auditQuery.data.map((entry) => (
                  <tr key={entry.id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="py-2 px-3 font-mono text-xs text-gray-600">
                      {new Date(entry.timestamp).toLocaleString("fr-CI")}
                    </td>
                    <td className="py-2 px-3">
                      <span className="px-2 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-700">
                        {entry.systemId.toUpperCase()}
                      </span>
                    </td>
                    <td className="py-2 px-3 font-mono text-xs">{entry.method}</td>
                    <td className="py-2 px-3 font-mono text-xs text-gray-600 max-w-[200px] truncate">
                      {entry.endpoint}
                    </td>
                    <td className="py-2 px-3">
                      <span
                        className={`px-2 py-0.5 rounded text-xs font-medium ${
                          entry.responseStatus < 300
                            ? "bg-green-50 text-green-700"
                            : entry.responseStatus < 500
                            ? "bg-amber-50 text-amber-700"
                            : "bg-red-50 text-red-700"
                        }`}
                      >
                        {entry.responseStatus}
                      </span>
                    </td>
                    <td className="py-2 px-3 font-mono text-xs text-gray-600">{entry.durationMs}ms</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-8 text-gray-400">
            <Activity className="h-6 w-6 mx-auto mb-2" />
            <p className="text-sm">Aucun appel enregistré pour le moment</p>
            <p className="text-xs mt-1">Les appels API apparaîtront ici une fois les connexions sandbox configurées</p>
          </div>
        )}
      </div>

      {/* Configuration Info */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
        <h3 className="font-medium text-amber-800 text-sm mb-2">Configuration requise</h3>
        <p className="text-xs text-amber-700 mb-2">
          Pour activer les connexions, configurez les secrets suivants dans Settings → Secrets :
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-xs">
          <div className="bg-white p-2 rounded border border-amber-100">
            <p className="font-medium text-gray-700">SIGFU</p>
            <code className="text-amber-600">SIGFU_API_URL</code><br />
            <code className="text-amber-600">SIGFU_API_KEY</code>
          </div>
          <div className="bg-white p-2 rounded border border-amber-100">
            <p className="font-medium text-gray-700">IDUFCI</p>
            <code className="text-amber-600">IDUFCI_API_URL</code><br />
            <code className="text-amber-600">IDUFCI_API_KEY</code>
          </div>
          <div className="bg-white p-2 rounded border border-amber-100">
            <p className="font-medium text-gray-700">SIFOR-CI</p>
            <code className="text-amber-600">SIFOR_API_URL</code><br />
            <code className="text-amber-600">SIFOR_API_KEY</code>
          </div>
        </div>
      </div>
    </div>
  );
}
