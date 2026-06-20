import { useState } from "react";
import { trpc } from "../../lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Layers, Search, TrendingUp } from "lucide-react";

const KPI_OPTIONS = [
  { key: "ca_realise", label: "CA Réalisé" },
  { key: "ca_encaisse", label: "CA Encaissé" },
  { key: "depenses", label: "Dépenses" },
  { key: "capex", label: "CAPEX" },
  { key: "cash_flow", label: "Cash Flow" },
  { key: "pl", label: "P&L" },
  { key: "ebitda", label: "EBITDA" },
  { key: "objectifs_non_atteints", label: "Objectifs non atteints" },
  { key: "alertes_critiques", label: "Alertes critiques" },
  { key: "centres_depassement", label: "Centres en dépassement" },
  { key: "ventes_immobilieres", label: "Ventes immobilières" },
];

export default function ErpDirectionDrilldown() {
  const [kpiKey, setKpiKey] = useState("ca_realise");
  const [projectId, setProjectId] = useState<number | undefined>();
  const [dateFrom, setDateFrom] = useState<number | undefined>();
  const [dateTo, setDateTo] = useState<number | undefined>();

  const drilldownQuery = trpc.erp.directionDashboard.drilldown.useQuery(
    { kpiKey, projectId, dateFrom, dateTo },
    { enabled: !!kpiKey }
  );

  const data = drilldownQuery.data;

  function handleDateChange(field: "from" | "to", value: string) {
    const ts = value ? new Date(value).getTime() : undefined;
    if (field === "from") setDateFrom(ts);
    else setDateTo(ts);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2"><Layers className="w-6 h-6" />Drill-down KPI</h1>
        <p className="text-muted-foreground">Explorez les données sources derrière chaque indicateur</p>
      </div>

      {/* Filtres */}
      <Card>
        <CardContent className="pt-4">
          <div className="grid gap-4 md:grid-cols-4">
            <div>
              <Label>Indicateur</Label>
              <Select value={kpiKey} onValueChange={setKpiKey}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {KPI_OPTIONS.map(o => <SelectItem key={o.key} value={o.key}>{o.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Date début</Label>
              <Input type="date" onChange={e => handleDateChange("from", e.target.value)} />
            </div>
            <div>
              <Label>Date fin</Label>
              <Input type="date" onChange={e => handleDateChange("to", e.target.value)} />
            </div>
            <div>
              <Label>ID Projet (optionnel)</Label>
              <Input type="number" placeholder="Ex: 1" onChange={e => setProjectId(e.target.value ? Number(e.target.value) : undefined)} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Résultats */}
      {drilldownQuery.isLoading && <p className="text-muted-foreground text-center py-8">Chargement...</p>}

      {data && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                {KPI_OPTIONS.find(o => o.key === data.kpiKey)?.label || data.kpiKey}
              </CardTitle>
              <div className="flex items-center gap-2">
                <Badge variant="outline">{data.summary}</Badge>
                {data.total > 0 && <Badge>{typeof data.total === "number" && data.total > 1000 ? `${(data.total / 100).toLocaleString("fr-FR")} XOF` : data.total}</Badge>}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {data.rows.length === 0 ? (
              <div className="text-center py-8">
                <Search className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-muted-foreground">Aucune donnée pour ces critères</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2">ID</th>
                      {data.rows[0] && Object.keys(data.rows[0]).filter(k => k !== "id" && !k.endsWith("At") && !k.endsWith("Json")).slice(0, 6).map(k => (
                        <th key={k} className="text-left p-2">{k}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {data.rows.slice(0, 50).map((row: any, i: number) => {
                      const keys = Object.keys(row).filter(k => k !== "id" && !k.endsWith("At") && !k.endsWith("Json")).slice(0, 6);
                      return (
                        <tr key={row.id || i} className="border-b hover:bg-muted/50">
                          <td className="p-2 text-muted-foreground">{row.id || i + 1}</td>
                          {keys.map(k => (
                            <td key={k} className="p-2 max-w-[200px] truncate">
                              {typeof row[k] === "number" && row[k] > 1000000 ? (row[k] / 100).toLocaleString("fr-FR") : String(row[k] ?? "-")}
                            </td>
                          ))}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                {data.rows.length > 50 && <p className="text-xs text-muted-foreground mt-2 text-center">Affichage limité à 50 lignes sur {data.rows.length}</p>}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
