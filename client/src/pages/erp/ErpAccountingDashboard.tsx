import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BookOpen, FileText, TrendingUp, AlertTriangle } from "lucide-react";

export default function ErpAccountingDashboard() {
  const { data: journalsData } = trpc.erp.fullAccounting.journals.list.useQuery({});
  const { data: entriesData } = trpc.erp.fullAccounting.entries.list.useQuery({ limit: 10, offset: 0 });

  const journals = journalsData || [];
  const entries = entriesData?.entries || [];


  const totalEntries = entriesData?.total || 0;
  const draftEntries = entries.filter((e: any) => e.status === "draft").length;
  const postedEntries = entries.filter((e: any) => e.status === "posted").length;

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Comptabilité Générale</h1>
        <p className="text-muted-foreground">
          Comptabilité générale et analytique
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Journaux</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{journals.length}</div>
            <p className="text-xs text-muted-foreground">journaux configurés</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Écritures</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalEntries}</div>
            <p className="text-xs text-muted-foreground">{postedEntries} validées, {draftEntries} brouillons</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Rapprochements</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">—</div>
            <p className="text-xs text-muted-foreground">rapprochements bancaires</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Alertes</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{draftEntries}</div>
            <p className="text-xs text-muted-foreground">écritures en brouillon</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle className="text-lg">Journaux Comptables</CardTitle></CardHeader>
          <CardContent>
            {journals.length === 0 ? (
              <p className="text-muted-foreground text-sm">Aucun journal configuré. Créez vos journaux dans la section Journaux.</p>
            ) : (
              <div className="space-y-2">
                {journals.slice(0, 8).map((j: any) => (
                  <div key={j.id} className="flex items-center justify-between py-2 border-b last:border-0">
                    <div>
                      <span className="font-mono text-xs bg-muted px-2 py-0.5 rounded mr-2">{j.code}</span>
                      <span className="text-sm">{j.name}</span>
                    </div>
                    <span className="text-xs text-muted-foreground">{j.journalType}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-lg">Dernières Écritures</CardTitle></CardHeader>
          <CardContent>
            {entries.length === 0 ? (
              <p className="text-muted-foreground text-sm">Aucune écriture enregistrée.</p>
            ) : (
              <div className="space-y-2">
                {entries.slice(0, 8).map((e: any) => (
                  <div key={e.id} className="flex items-center justify-between py-2 border-b last:border-0">
                    <div>
                      <span className="font-mono text-xs">{e.entryNumber}</span>
                      <span className="text-sm ml-2">{e.description || "—"}</span>
                    </div>
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${e.status === "posted" ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"}`}>
                      {e.status === "posted" ? "Validée" : "Brouillon"}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
