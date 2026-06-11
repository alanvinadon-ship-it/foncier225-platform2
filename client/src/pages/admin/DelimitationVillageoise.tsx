import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { MapPin, Check, ChevronRight, Upload, Trash2, Landmark, UserCheck, ShieldCheck, RefreshCw, FileUp, Pencil, X, Save, Download, Ruler, Plus, FileDown, Eye, FileText, Globe, Paperclip, Image } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

// Types
interface BoundaryPoint {
  number: number;
  lat: number;
  lng: number;
  landmark: string;
  source?: "manual" | "gpx_import" | "csv_import";
}

// Steps configuration
const STEPS = [
  { id: 1, label: "Initialisation", icon: Landmark, description: "Créer un nouveau territoire" },
  { id: 2, label: "Collecte points", icon: MapPin, description: "Ajouter les bornes GPS" },
  { id: 3, label: "Validation chef", icon: UserCheck, description: "Signature du chef" },
  { id: 4, label: "Reconnaissance", icon: ShieldCheck, description: "Admin AFOR" },
  { id: 5, label: "Synchronisation", icon: RefreshCw, description: "SIFOR-CI" },
];

const STATUS_TO_STEP: Record<string, number> = {
  draft: 1,
  collecting: 2,
  submitted: 3,
  validated_chief: 4,
  official: 5,
  synced: 5,
};

// Detail map component for visualizing the polygon with layer switcher
function DetailMapView({ points, detailMapRef, detailMapInstanceRef, measureMode, measurePoints, setMeasurePoints, calculateMeasure }: {
  points: { pointNumber: number; latitude: string; longitude: string; landmark?: string | null }[];
  detailMapRef: React.RefObject<HTMLDivElement | null>;
  detailMapInstanceRef: React.MutableRefObject<any>;
  measureMode?: "none" | "distance" | "area";
  measurePoints?: { lat: number; lng: number }[];
  setMeasurePoints?: React.Dispatch<React.SetStateAction<{ lat: number; lng: number }[]>>;
  calculateMeasure?: (pts: { lat: number; lng: number }[], mode: "distance" | "area") => void;
}) {
  const [mapLayer, setMapLayer] = useState<"road" | "satellite">("road");
  const tileLayerRef = useRef<any>(null);

  const TILE_LAYERS = {
    road: {
      url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
      attribution: "\u00a9 OpenStreetMap",
    },
    satellite: {
      url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
      attribution: "\u00a9 Esri",
    },
  };

  useEffect(() => {
    if (!detailMapRef.current || points.length < 3) return;

    // Destroy previous instance
    if (detailMapInstanceRef.current) {
      detailMapInstanceRef.current.remove();
      detailMapInstanceRef.current = null;
    }

    import("leaflet").then((L) => {
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
        iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
        shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
      });

      const map = L.map(detailMapRef.current!, { scrollWheelZoom: true, zoomControl: true });
      const layer = L.tileLayer(TILE_LAYERS[mapLayer].url, {
        attribution: TILE_LAYERS[mapLayer].attribution,
        maxZoom: 19,
      }).addTo(map);
      tileLayerRef.current = layer;

      const coords: [number, number][] = points.map(p => [parseFloat(p.latitude), parseFloat(p.longitude)]);

      // Draw polygon
      const polygon = L.polygon(coords, {
        color: "#E67E22",
        fillColor: "#E67E22",
        fillOpacity: 0.15,
        weight: 3,
      }).addTo(map);

      // Add markers
      points.forEach((p) => {
        L.circleMarker([parseFloat(p.latitude), parseFloat(p.longitude)], {
          radius: 6,
          color: "#009E49",
          fillColor: "#009E49",
          fillOpacity: 0.8,
          weight: 2,
        })
          .bindTooltip(`N\u00b0${p.pointNumber}${p.landmark ? " - " + p.landmark : ""}`, { permanent: false })
          .addTo(map);
      });

      // Fit bounds
      map.fitBounds(polygon.getBounds().pad(0.1));

      // Measurement click handler
      if (measureMode && measureMode !== "none" && setMeasurePoints && calculateMeasure) {
        map.getContainer().style.cursor = "crosshair";
        map.on("click", (e: any) => {
          setMeasurePoints((prev) => {
            const newPts = [...prev, { lat: e.latlng.lat, lng: e.latlng.lng }];
            calculateMeasure(newPts, measureMode);
            return newPts;
          });
        });
      }

      detailMapInstanceRef.current = map;
    });

    return () => {
      if (detailMapInstanceRef.current) {
        detailMapInstanceRef.current.remove();
        detailMapInstanceRef.current = null;
      }
    };
  }, [points, mapLayer, measureMode, measurePoints?.length]);

  return (
    <div className="space-y-2">
      {/* Layer switcher */}
      <div className="flex gap-1 bg-muted/50 p-1 rounded-lg w-fit">
        <button
          onClick={() => setMapLayer("road")}
          className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
            mapLayer === "road" ? "bg-white text-ci-green shadow-sm" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Routi\u00e8re
        </button>
        <button
          onClick={() => setMapLayer("satellite")}
          className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
            mapLayer === "satellite" ? "bg-white text-ci-green shadow-sm" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Satellite
        </button>
      </div>
      <div ref={detailMapRef} className="h-[280px] rounded-lg border border-ci-green/20 z-0" />
    </div>
  );
}

export default function DelimitationVillageoise() {
  const [currentStep, setCurrentStep] = useState(1);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [activeTerritoryId, setActiveTerritoryId] = useState<number | null>(null);
  const [boundaryPoints, setBoundaryPoints] = useState<BoundaryPoint[]>([]);
  const [syncProgress, setSyncProgress] = useState(0);
  const [siforCode, setSiforCode] = useState("");
  const [isSyncing, setIsSyncing] = useState(false);
  const [showList, setShowList] = useState(true);
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const polylineRef = useRef<any>(null);
  const detailMapRef = useRef<HTMLDivElement>(null);
  const detailMapInstanceRef = useRef<any>(null);

  const [importError, setImportError] = useState<string | null>(null);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editValues, setEditValues] = useState<{ lat: string; lng: string; landmark: string }>({ lat: "", lng: "", landmark: "" });
  const [highlightedIndex, setHighlightedIndex] = useState<number | null>(null);

  // Filter & sort state
  const [statusFilter, setStatusFilter] = useState<string | undefined>(undefined);
  const [sortBy, setSortBy] = useState<"date" | "name" | "status">("date");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  // Form state
  const [villageName, setVillageName] = useState("");
  const [chiefName, setChiefName] = useState("");
  const [chiefPhone, setChiefPhone] = useState("");
  const [estimatedArea, setEstimatedArea] = useState("");
  const [landmarkDesc, setLandmarkDesc] = useState("");
  const [chiefComments, setChiefComments] = useState("");

  // ─── tRPC Queries & Mutations ──────────────────────────────────────
  const utils = trpc.useUtils();

  const { data: territoriesData, isLoading: isLoadingList } = trpc.delimitation.list.useQuery(
    { limit: 20, offset: 0, statusFilter, sortBy, sortOrder },
    { enabled: showList }
  );

  const { data: territoryDetail, isLoading: isLoadingDetail, isError: isErrorDetail } = trpc.delimitation.getById.useQuery(
    { territoryId: activeTerritoryId! },
    { enabled: !!activeTerritoryId }
  );

  const { data: statusHistoryData } = trpc.delimitation.statusHistory.useQuery(
    { territoryId: activeTerritoryId! },
    { enabled: !!activeTerritoryId }
  );

  const createMutation = trpc.delimitation.create.useMutation({
    onSuccess: (data) => {
      setActiveTerritoryId(data.id);
      setShowList(false);
      toast.success("Territoire créé avec succès");
      completeStep(1);
      utils.delimitation.list.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const savePointsMutation = trpc.delimitation.savePoints.useMutation({
    onSuccess: () => {
      toast.success(`${boundaryPoints.length} points de borne sauvegardés`);
      utils.delimitation.getById.invalidate({ territoryId: activeTerritoryId! });
    },
    onError: (err) => toast.error(err.message),
  });

  const submitPointsMutation = trpc.delimitation.submitPoints.useMutation({
    onSuccess: () => {
      toast.success("Points soumis pour validation");
      completeStep(2);
      utils.delimitation.getById.invalidate({ territoryId: activeTerritoryId! });
    },
    onError: (err) => toast.error(err.message),
  });

  const validateChiefMutation = trpc.delimitation.validateByChief.useMutation({
    onSuccess: () => {
      toast.success("Territoire validé par le chef du village");
      completeStep(3);
      utils.delimitation.getById.invalidate({ territoryId: activeTerritoryId! });
    },
    onError: (err) => toast.error(err.message),
  });

  const officializeMutation = trpc.delimitation.officialize.useMutation({
    onSuccess: () => {
      toast.success("Territoire reconnu officiellement par l'AFOR");
      completeStep(4);
      utils.delimitation.getById.invalidate({ territoryId: activeTerritoryId! });
    },
    onError: (err) => toast.error(err.message),
  });

  const syncSiforMutation = trpc.delimitation.syncSifor.useMutation({
    onSuccess: (data) => {
      setSiforCode(data.siforCode);
      setIsSyncing(false);
      setSyncProgress(100);
      setCompletedSteps((prev) => [...prev, 5]);
      toast.success("Synchronisation SIFOR-CI réussie !");
      utils.delimitation.getById.invalidate({ territoryId: activeTerritoryId! });
      utils.delimitation.list.invalidate();
    },
    onError: (err) => {
      setIsSyncing(false);
      toast.error(err.message);
    },
  });

  const updateStatusMutation = trpc.delimitation.updateStatus.useMutation({
    onSuccess: (data) => {
      toast.success(`Statut mis à jour : ${getStatusLabel(data.newStatus!)}`);
      utils.delimitation.getById.invalidate({ territoryId: activeTerritoryId! });
      utils.delimitation.list.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const exportPdfMutation = trpc.delimitation.exportPdf.useMutation({
    onSuccess: (data) => {
      window.open(data.url, "_blank");
      toast.success("PDF généré avec succès");
    },
    onError: (err) => toast.error(err.message),
  });

  const { data: geojsonData, refetch: refetchGeoJSON } = trpc.delimitation.exportGeoJSON.useQuery(
    { territoryId: activeTerritoryId! },
    { enabled: false }
  );

  const uploadDocMutation = trpc.delimitation.uploadDocument.useMutation({
    onSuccess: () => {
      toast.success("Document ajout\u00e9 avec succ\u00e8s");
      utils.delimitation.listDocumentsByStep.invalidate();
      utils.delimitation.getById.invalidate({ territoryId: activeTerritoryId! });
    },
    onError: (err) => toast.error(err.message),
  });

  const { data: stepDocuments } = trpc.delimitation.listDocumentsByStep.useQuery(
    { territoryId: activeTerritoryId! },
    { enabled: !!activeTerritoryId }
  );

  // PDF preview state
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string | null>(null);

  // Measurement tool state
  const [measureMode, setMeasureMode] = useState<"none" | "distance" | "area">("none");
  const [measurePoints, setMeasurePoints] = useState<{ lat: number; lng: number }[]>([]);
  const [measureResult, setMeasureResult] = useState<string>("");

  // Load territory detail into local state
  useEffect(() => {
    if (territoryDetail) {
      const t = territoryDetail.territory;
      // Set step based on status
      const step = STATUS_TO_STEP[t.status] || 1;
      setCurrentStep(step);

      // Set completed steps
      const completed: number[] = [];
      if (step > 1) completed.push(1);
      if (step > 2) completed.push(2);
      if (step > 3) completed.push(3);
      if (step > 4) completed.push(4);
      if (t.status === "synced") completed.push(5);
      setCompletedSteps(completed);

      // Load points
      if (territoryDetail.points.length > 0) {
        setBoundaryPoints(
          territoryDetail.points.map((p) => ({
            number: p.pointNumber,
            lat: parseFloat(p.latitude),
            lng: parseFloat(p.longitude),
            landmark: p.landmark || "",
            source: p.source,
          }))
        );
      }

      // Load sifor code
      if (t.siforCode) setSiforCode(t.siforCode);
    }
  }, [territoryDetail]);

  // Initialize map when step 2 is active
  useEffect(() => {
    if (currentStep === 2 && mapRef.current && !mapInstanceRef.current) {
      import("leaflet").then((L) => {
        delete (L.Icon.Default.prototype as any)._getIconUrl;
        L.Icon.Default.mergeOptions({
          iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
          iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
          shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
        });

        const map = L.map(mapRef.current!, { scrollWheelZoom: true }).setView([5.3600, -4.0083], 13);
        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution: "© OpenStreetMap contributors",
          maxZoom: 19,
        }).addTo(map);

        map.on("click", (e: any) => {
          const { lat, lng } = e.latlng;
          addPoint(lat, lng);
        });

        mapInstanceRef.current = map;
      });
    }
  }, [currentStep]);

  // Redraw map markers/polyline when points change
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    import("leaflet").then((L) => {
      const map = mapInstanceRef.current;
      markersRef.current.forEach((m) => map.removeLayer(m));
      markersRef.current = [];
      if (polylineRef.current) map.removeLayer(polylineRef.current);

      boundaryPoints.forEach((point, idx) => {
        const isHighlighted = idx === highlightedIndex;
        const marker = L.circleMarker([point.lat, point.lng], {
          radius: isHighlighted ? 14 : 10,
          fillColor: isHighlighted ? "#FFA500" : "#228B22",
          color: isHighlighted ? "#FF4500" : "#FFA500",
          weight: isHighlighted ? 4 : 3,
          opacity: 1,
          fillOpacity: isHighlighted ? 1 : 0.8,
        })
          .bindPopup(`<strong>Point ${point.number}</strong><br/>${point.landmark}`)
          .addTo(map);
        marker.on("click", (e: any) => {
          e.originalEvent?.stopPropagation?.();
          setHighlightedIndex((prev) => prev === idx ? null : idx);
        });
        markersRef.current.push(marker);
      });

      if (boundaryPoints.length > 1) {
        const coords = boundaryPoints.map((p) => [p.lat, p.lng] as [number, number]);
        if (boundaryPoints.length >= 4) {
          coords.push(coords[0]);
        }
        polylineRef.current = L.polyline(coords, {
          color: "#FFA500",
          weight: 3,
          dashArray: boundaryPoints.length >= 4 ? undefined : "5, 10",
        }).addTo(map);
      }
    });
  }, [boundaryPoints, highlightedIndex]);

  const addPoint = useCallback((lat: number, lng: number) => {
    setBoundaryPoints((prev) => {
      const newPoint: BoundaryPoint = {
        number: prev.length + 1,
        lat: parseFloat(lat.toFixed(6)),
        lng: parseFloat(lng.toFixed(6)),
        landmark: landmarkDesc || `Point ${prev.length + 1}`,
        source: "manual",
      };
      return [...prev, newPoint];
    });
    setLandmarkDesc("");
  }, [landmarkDesc]);

  const removePoint = (index: number) => {
    setBoundaryPoints((prev) => {
      const updated = prev.filter((_, i) => i !== index);
      return updated.map((p, i) => ({ ...p, number: i + 1 }));
    });
    if (editingIndex === index) setEditingIndex(null);
  };

  const startEdit = (index: number) => {
    const point = boundaryPoints[index];
    setEditValues({ lat: point.lat.toString(), lng: point.lng.toString(), landmark: point.landmark });
    setEditingIndex(index);
  };

  const saveEdit = () => {
    if (editingIndex === null) return;
    const lat = parseFloat(editValues.lat);
    const lng = parseFloat(editValues.lng);
    if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      toast.error("Coordonnées invalides. Latitude: -90 à 90, Longitude: -180 à 180");
      return;
    }
    setBoundaryPoints((prev) =>
      prev.map((p, i) =>
        i === editingIndex ? { ...p, lat, lng, landmark: editValues.landmark || `Point ${i + 1}` } : p
      )
    );
    toast.success(`Point ${editingIndex + 1} modifié`);
    setEditingIndex(null);
  };

  const cancelEdit = () => {
    setEditingIndex(null);
  };

  // Export GPX
  const exportGPX = () => {
    if (boundaryPoints.length === 0) return;
    const territory = territoryDetail?.territory;
    const gpxContent = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="Foncier225" xmlns="http://www.topografix.com/GPX/1/1">
  <metadata>
    <name>${territory?.name || "Territoire"}</name>
    <time>${new Date().toISOString()}</time>
  </metadata>
${boundaryPoints.map((p) => `  <wpt lat="${p.lat}" lon="${p.lng}">
    <name>Point ${p.number}</name>
    <desc>${p.landmark}</desc>
  </wpt>`).join("\n")}
</gpx>`;
    downloadFile(gpxContent, `delimitation-${territory?.code || "points"}.gpx`, "application/gpx+xml");
    toast.success(`${boundaryPoints.length} points exportés en GPX`);
  };

  // Export CSV
  const exportCSV = () => {
    if (boundaryPoints.length === 0) return;
    const territory = territoryDetail?.territory;
    const header = "numero,latitude,longitude,description";
    const rows = boundaryPoints.map((p) => `${p.number},${p.lat},${p.lng},"${p.landmark.replace(/"/g, '""')}"`);
    const csvContent = [header, ...rows].join("\n");
    downloadFile(csvContent, `delimitation-${territory?.code || "points"}.csv`, "text/csv");
    toast.success(`${boundaryPoints.length} points exportés en CSV`);
  };

  const downloadFile = (content: string, filename: string, mimeType: string) => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Geometry calculations
  const calculateArea = useMemo(() => {
    if (boundaryPoints.length < 3) return 0;
    const toRad = (deg: number) => (deg * Math.PI) / 180;
    let area = 0;
    const n = boundaryPoints.length;
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      const lat1 = toRad(boundaryPoints[i].lat);
      const lat2 = toRad(boundaryPoints[j].lat);
      const dLng = toRad(boundaryPoints[j].lng - boundaryPoints[i].lng);
      area += dLng * (2 + Math.sin(lat1) + Math.sin(lat2));
    }
    area = Math.abs((area * 6371000 * 6371000) / 2);
    return area / 10000;
  }, [boundaryPoints]);

  const calculatePerimeter = useMemo(() => {
    if (boundaryPoints.length < 2) return 0;
    const toRad = (deg: number) => (deg * Math.PI) / 180;
    let perimeter = 0;
    const n = boundaryPoints.length;
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      const lat1 = toRad(boundaryPoints[i].lat);
      const lat2 = toRad(boundaryPoints[j].lat);
      const dLat = lat2 - lat1;
      const dLng = toRad(boundaryPoints[j].lng - boundaryPoints[i].lng);
      const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      perimeter += 6371 * c;
    }
    return perimeter;
  }, [boundaryPoints]);

  // GPX/CSV Import
  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportError(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (!content) {
        setImportError("Impossible de lire le fichier.");
        return;
      }

      const ext = file.name.toLowerCase().split(".").pop();
      let importedPoints: BoundaryPoint[] = [];
      const source: "gpx_import" | "csv_import" = ext === "gpx" ? "gpx_import" : "csv_import";

      try {
        if (ext === "gpx") {
          importedPoints = parseGPX(content);
        } else if (ext === "csv") {
          importedPoints = parseCSV(content);
        } else {
          setImportError("Format non supporté. Utilisez .gpx ou .csv");
          return;
        }

        if (importedPoints.length === 0) {
          setImportError("Aucun point valide trouvé dans le fichier.");
          return;
        }

        setBoundaryPoints((prev) => {
          const merged = [...prev, ...importedPoints.map(p => ({ ...p, source }))];
          return merged.map((p, i) => ({ ...p, number: i + 1 }));
        });

        toast.success(`${importedPoints.length} point(s) importé(s) depuis ${file.name}`);
      } catch (err) {
        setImportError(`Erreur de parsing : ${err instanceof Error ? err.message : "format invalide"}`);
      }
    };

    reader.onerror = () => setImportError("Erreur lors de la lecture du fichier.");
    reader.readAsText(file);
    e.target.value = "";
  };

  const parseGPX = (content: string): BoundaryPoint[] => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(content, "application/xml");
    const points: BoundaryPoint[] = [];

    const waypoints = doc.querySelectorAll("wpt");
    waypoints.forEach((wpt) => {
      const lat = parseFloat(wpt.getAttribute("lat") || "");
      const lng = parseFloat(wpt.getAttribute("lon") || "");
      const name = wpt.querySelector("name")?.textContent || "";
      const desc = wpt.querySelector("desc")?.textContent || "";
      if (!isNaN(lat) && !isNaN(lng)) {
        points.push({ number: 0, lat, lng, landmark: name || desc || `Waypoint` });
      }
    });

    if (points.length === 0) {
      const trkpts = doc.querySelectorAll("trkpt");
      trkpts.forEach((trkpt) => {
        const lat = parseFloat(trkpt.getAttribute("lat") || "");
        const lng = parseFloat(trkpt.getAttribute("lon") || "");
        const name = trkpt.querySelector("name")?.textContent || "";
        if (!isNaN(lat) && !isNaN(lng)) {
          points.push({ number: 0, lat, lng, landmark: name || `Track point` });
        }
      });
    }

    if (points.length === 0) {
      const rtepts = doc.querySelectorAll("rtept");
      rtepts.forEach((rtept) => {
        const lat = parseFloat(rtept.getAttribute("lat") || "");
        const lng = parseFloat(rtept.getAttribute("lon") || "");
        const name = rtept.querySelector("name")?.textContent || "";
        if (!isNaN(lat) && !isNaN(lng)) {
          points.push({ number: 0, lat, lng, landmark: name || `Route point` });
        }
      });
    }

    return points;
  };

  const parseCSV = (content: string): BoundaryPoint[] => {
    const lines = content.trim().split(/\r?\n/);
    if (lines.length < 2) throw new Error("Le fichier CSV doit contenir au moins un en-tête et une ligne de données.");

    const header = lines[0].toLowerCase().split(/[,;\t]/).map((h) => h.trim());
    const latIdx = header.findIndex((h) => ["lat", "latitude", "y"].includes(h));
    const lngIdx = header.findIndex((h) => ["lng", "lon", "longitude", "long", "x"].includes(h));
    const descIdx = header.findIndex((h) => ["description", "desc", "name", "nom", "landmark", "repere", "repère"].includes(h));

    if (latIdx === -1 || lngIdx === -1) {
      throw new Error("Colonnes 'lat' et 'lng' (ou 'latitude'/'longitude') requises dans l'en-tête.");
    }

    const points: BoundaryPoint[] = [];
    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(/[,;\t]/).map((c) => c.trim());
      const lat = parseFloat(cols[latIdx]);
      const lng = parseFloat(cols[lngIdx]);
      const desc = descIdx !== -1 ? cols[descIdx] || `Point ${i}` : `Point ${i}`;

      if (!isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
        points.push({ number: 0, lat, lng, landmark: desc });
      }
    }

    return points;
  };

  const goToStep = (step: number) => {
    if (step <= currentStep || completedSteps.includes(step - 1)) {
      setCurrentStep(step);
    }
  };

  const completeStep = (step: number) => {
    setCompletedSteps((prev) => [...prev, step]);
    setCurrentStep(step + 1);
  };

  // ─── Handlers (connected to tRPC) ─────────────────────────────────

  const handleInitialize = () => {
    if (!villageName || !chiefName) {
      toast.error("Veuillez remplir tous les champs obligatoires");
      return;
    }

    createMutation.mutate({
      name: villageName,
      chiefName,
      chiefPhone: chiefPhone || undefined,
      estimatedAreaHa: estimatedArea ? parseInt(estimatedArea) : undefined,
    });
  };

  const handleSavePoints = () => {
    if (!activeTerritoryId || boundaryPoints.length < 4) {
      toast.error("Minimum 4 points de borne requis");
      return;
    }

    savePointsMutation.mutate({
      territoryId: activeTerritoryId,
      points: boundaryPoints.map((p) => ({
        pointNumber: p.number,
        latitude: p.lat.toString(),
        longitude: p.lng.toString(),
        landmark: p.landmark || undefined,
        source: p.source || "manual",
      })),
      calculatedAreaHa: calculateArea > 0 ? calculateArea.toFixed(2) : undefined,
      calculatedPerimeterKm: calculatePerimeter > 0 ? calculatePerimeter.toFixed(3) : undefined,
    });
  };

  const handleSubmitPoints = () => {
    if (!activeTerritoryId || boundaryPoints.length < 4) {
      toast.error("Minimum 4 points de borne requis");
      return;
    }

    // Save first, then submit
    savePointsMutation.mutate(
      {
        territoryId: activeTerritoryId,
        points: boundaryPoints.map((p) => ({
          pointNumber: p.number,
          latitude: p.lat.toString(),
          longitude: p.lng.toString(),
          landmark: p.landmark || undefined,
          source: p.source || "manual",
        })),
        calculatedAreaHa: calculateArea > 0 ? calculateArea.toFixed(2) : undefined,
        calculatedPerimeterKm: calculatePerimeter > 0 ? calculatePerimeter.toFixed(3) : undefined,
      },
      {
        onSuccess: () => {
          submitPointsMutation.mutate({ territoryId: activeTerritoryId! });
        },
      }
    );
  };

  const handleChiefValidation = () => {
    if (!activeTerritoryId) return;
    validateChiefMutation.mutate({
      territoryId: activeTerritoryId,
      chiefComments: chiefComments || undefined,
    });
  };

  const handleRecognition = () => {
    if (!activeTerritoryId) return;
    officializeMutation.mutate({ territoryId: activeTerritoryId });
  };

  const handleSync = () => {
    if (!activeTerritoryId) return;
    setIsSyncing(true);
    setSyncProgress(0);

    // Animate progress bar then call API
    const interval = setInterval(() => {
      setSyncProgress((prev) => {
        const next = prev + Math.random() * 12;
        if (next >= 85) {
          clearInterval(interval);
          // Actually call the API
          syncSiforMutation.mutate({ territoryId: activeTerritoryId! });
          return 85;
        }
        return next;
      });
    }, 300);
  };

  const handleExportPdf = () => {
    if (!activeTerritoryId) return;
    exportPdfMutation.mutate({ territoryId: activeTerritoryId });
  };

  const [geojsonExporting, setGeojsonExporting] = useState(false);
  const [geojsonExportSuccess, setGeojsonExportSuccess] = useState(false);

  const handleExportGeoJSON = async () => {
    if (!activeTerritoryId) return;
    setGeojsonExporting(true);
    setGeojsonExportSuccess(false);
    try {
      const result = await refetchGeoJSON();
      if (result.data) {
        const content = JSON.stringify(result.data.geojson, null, 2);
        const blob = new Blob([content], { type: "application/geo+json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = result.data.filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        toast.success("GeoJSON export\u00e9 avec succ\u00e8s");
        setGeojsonExportSuccess(true);
        setTimeout(() => setGeojsonExportSuccess(false), 5000);
      }
    } finally {
      setGeojsonExporting(false);
    }
  };

  // Upload document for a specific step
  const handleUploadStepDocument = (step: string) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*,.pdf,.doc,.docx";
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file || !activeTerritoryId) return;
      if (file.size > 10 * 1024 * 1024) {
        toast.error("Fichier trop volumineux (max 10 Mo)");
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = (reader.result as string).split(",")[1];
        uploadDocMutation.mutate({
          territoryId: activeTerritoryId,
          title: file.name,
          documentType: "autre",
          step: step as any,
          fileBase64: base64,
          fileName: file.name,
          mimeType: file.type,
          fileSize: file.size,
        });
      };
      reader.readAsDataURL(file);
    };
    input.click();
  };

  // Measurement helpers
  const haversineDistance = (p1: { lat: number; lng: number }, p2: { lat: number; lng: number }) => {
    const R = 6371;
    const dLat = ((p2.lat - p1.lat) * Math.PI) / 180;
    const dLng = ((p2.lng - p1.lng) * Math.PI) / 180;
    const a = Math.sin(dLat / 2) ** 2 + Math.cos((p1.lat * Math.PI) / 180) * Math.cos((p2.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  };

  const calculateMeasure = (pts: { lat: number; lng: number }[], mode: "distance" | "area") => {
    if (mode === "distance" && pts.length >= 2) {
      let total = 0;
      for (let i = 1; i < pts.length; i++) {
        total += haversineDistance(pts[i - 1], pts[i]);
      }
      if (total < 1) setMeasureResult(`${(total * 1000).toFixed(1)} m`);
      else setMeasureResult(`${total.toFixed(3)} km`);
    } else if (mode === "area" && pts.length >= 3) {
      // Shoelace formula
      let area = 0;
      for (let i = 0; i < pts.length; i++) {
        const j = (i + 1) % pts.length;
        area += pts[i].lng * pts[j].lat;
        area -= pts[j].lng * pts[i].lat;
      }
      area = Math.abs(area) / 2;
      const avgLat = pts.reduce((s, p) => s + p.lat, 0) / pts.length;
      const mPerDegLat = 111320;
      const mPerDegLng = 111320 * Math.cos((avgLat * Math.PI) / 180);
      const areaM2 = area * mPerDegLat * mPerDegLng;
      const areaHa = areaM2 / 10000;
      if (areaHa < 1) setMeasureResult(`${areaM2.toFixed(0)} m\u00b2`);
      else setMeasureResult(`${areaHa.toFixed(2)} ha`);
    }
  };

  // PDF preview handler (separate from export - does NOT open in new tab)
  const previewPdfMutation = trpc.delimitation.exportPdf.useMutation({
    onSuccess: (data) => {
      setPdfPreviewUrl(data.url);
    },
    onError: (err) => toast.error(err.message),
  });

  const handlePreviewPdf = () => {
    if (!activeTerritoryId) return;
    previewPdfMutation.mutate({ territoryId: activeTerritoryId });
  };

  const handleStartNew = () => {
    setActiveTerritoryId(null);
    setShowList(false);
    setCurrentStep(1);
    setCompletedSteps([]);
    setBoundaryPoints([]);
    setSiforCode("");
    setSyncProgress(0);
    setVillageName("");
    setChiefName("");
    setChiefPhone("");
    setEstimatedArea("");
    // Destroy maps
    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }
    if (detailMapInstanceRef.current) {
      detailMapInstanceRef.current.remove();
      detailMapInstanceRef.current = null;
    }
  };

  const handleOpenTerritory = (id: number) => {
    setActiveTerritoryId(id);
    setShowList(false);
    // Destroy old map
    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      draft: "Brouillon",
      collecting: "Collecte",
      submitted: "En révision",
      validated_chief: "Validé chef",
      official: "Officiel",
      synced: "Synchronisé SIFOR",
    };
    return labels[status] || status;
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { label: string; className: string; icon: React.ReactNode }> = {
      draft: { label: "Brouillon", className: "bg-gray-100 text-gray-700 border-gray-300", icon: <Pencil className="h-3 w-3" /> },
      collecting: { label: "Collecte", className: "bg-blue-50 text-blue-700 border-blue-300", icon: <MapPin className="h-3 w-3" /> },
      submitted: { label: "En r\u00e9vision", className: "bg-amber-50 text-amber-700 border-amber-300", icon: <Eye className="h-3 w-3" /> },
      validated_chief: { label: "Valid\u00e9 chef", className: "bg-purple-50 text-purple-700 border-purple-300", icon: <UserCheck className="h-3 w-3" /> },
      official: { label: "Officiel", className: "bg-green-50 text-green-700 border-green-300", icon: <ShieldCheck className="h-3 w-3" /> },
      synced: { label: "Synchronis\u00e9 SIFOR", className: "bg-emerald-50 text-emerald-800 border-emerald-400", icon: <Check className="h-3 w-3" /> },
    };
    const config = variants[status] || variants.draft;
    return (
      <Badge variant="outline" className={`${config.className} gap-1 font-medium`}>
        {config.icon}
        {config.label}
      </Badge>
    );
  };

  // ─── List View ─────────────────────────────────────────────────────
  if (showList && !activeTerritoryId) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-ci-green flex items-center gap-2">
              <MapPin className="h-6 w-6" />
              Délimitation Villageoise
            </h1>
            <p className="text-muted-foreground mt-1">
              Gérez vos territoires villageois et suivez l'avancement de la délimitation
            </p>
          </div>
          <Button onClick={handleStartNew} className="bg-ci-green hover:bg-ci-green/90">
            <Plus className="h-4 w-4 mr-2" />
            Nouveau territoire
          </Button>
        </div>

        {/* Filtres et tri */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <Label className="text-sm font-medium whitespace-nowrap">Statut :</Label>
                <select
                  value={statusFilter || ""}
                  onChange={(e) => setStatusFilter(e.target.value || undefined)}
                  className="border rounded-md px-3 py-1.5 text-sm bg-background"
                >
                  <option value="">Tous</option>
                  <option value="draft">Brouillon</option>
                  <option value="collecting">En cours (Collecte)</option>
                  <option value="submitted">En révision</option>
                  <option value="validated_chief">Validé (Chef)</option>
                  <option value="official">Validé (Officiel)</option>
                  <option value="synced">Synchronisé SIFOR</option>
                </select>
              </div>
              <div className="flex items-center gap-2">
                <Label className="text-sm font-medium whitespace-nowrap">Trier par :</Label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as "date" | "name" | "status")}
                  className="border rounded-md px-3 py-1.5 text-sm bg-background"
                >
                  <option value="date">Date</option>
                  <option value="name">Nom</option>
                  <option value="status">Statut</option>
                </select>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
              >
                {sortOrder === "asc" ? "↑ Croissant" : "↓ Décroissant"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {isLoadingList ? (
          <Card>
            <CardContent className="p-8 text-center text-muted-foreground">
              Chargement des territoires...
            </CardContent>
          </Card>
        ) : territoriesData && territoriesData.territories.length > 0 ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Territoires ({territoriesData.territories.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Code</TableHead>
                    <TableHead>Nom</TableHead>
                    <TableHead>Chef</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead>Créé le</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {territoriesData.territories.map((t) => (
                    <TableRow key={t.id} className="cursor-pointer hover:bg-muted/50" onClick={() => handleOpenTerritory(t.id)}>
                      <TableCell className="font-mono text-xs">{t.code}</TableCell>
                      <TableCell className="font-medium">{t.name}</TableCell>
                      <TableCell>{t.chiefName}</TableCell>
                      <TableCell>{getStatusBadge(t.status)}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(t.createdAt).toLocaleDateString("fr-FR")}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); handleOpenTerritory(t.id); }}>
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="p-12 text-center">
              <MapPin className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Aucun territoire</h3>
              <p className="text-muted-foreground mb-4">
                Commencez par créer un nouveau territoire villageois pour démarrer le processus de délimitation.
              </p>
              <Button onClick={handleStartNew} className="bg-ci-green hover:bg-ci-green/90">
                <Plus className="h-4 w-4 mr-2" />
                Créer un territoire
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    );
  }

  // ─── Detail/Workflow View ──────────────────────────────────────────

  // Loading state for detail
  if (activeTerritoryId && isLoadingDetail) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-ci-green flex items-center gap-2">
              <MapPin className="h-6 w-6" />
              Délimitation Villageoise
            </h1>
            <p className="text-muted-foreground mt-1">Chargement du territoire...</p>
          </div>
          <Button variant="outline" onClick={() => { setShowList(true); setActiveTerritoryId(null); }}>
            ← Retour à la liste
          </Button>
        </div>
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            Chargement des données du territoire...
          </CardContent>
        </Card>
      </div>
    );
  }

  // Error state for detail
  if (activeTerritoryId && isErrorDetail) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-ci-green flex items-center gap-2">
              <MapPin className="h-6 w-6" />
              Délimitation Villageoise
            </h1>
            <p className="text-muted-foreground mt-1">Erreur</p>
          </div>
          <Button variant="outline" onClick={() => { setShowList(true); setActiveTerritoryId(null); }}>
            ← Retour à la liste
          </Button>
        </div>
        <Card>
          <CardContent className="p-8 text-center">
            <X className="h-12 w-12 text-destructive mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Territoire introuvable</h3>
            <p className="text-muted-foreground mb-4">
              Ce territoire n'existe pas ou vous n'avez pas les droits d'accès.
            </p>
            <Button onClick={() => { setShowList(true); setActiveTerritoryId(null); }} className="bg-ci-green hover:bg-ci-green/90">
              Retour à la liste
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-ci-green flex items-center gap-2">
            <MapPin className="h-6 w-6" />
            Délimitation Villageoise
          </h1>
          <p className="text-muted-foreground mt-1">
            {territoryDetail ? `${territoryDetail.territory.name} — ${territoryDetail.territory.code}` : "Nouveau territoire"}
          </p>
        </div>
        <Button variant="outline" onClick={() => { setShowList(true); setActiveTerritoryId(null); }}>
          ← Retour à la liste
        </Button>
      </div>

      {/* Steps progress */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        {STEPS.map((step, index) => (
          <div key={step.id} className="flex items-center">
            <button
              onClick={() => goToStep(step.id)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                currentStep === step.id
                  ? "bg-ci-green text-white"
                  : completedSteps.includes(step.id)
                  ? "bg-ci-green/10 text-ci-green"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {completedSteps.includes(step.id) ? (
                <Check className="h-4 w-4" />
              ) : (
                <step.icon className="h-4 w-4" />
              )}
              <span className="hidden md:inline">{step.label}</span>
            </button>
            {index < STEPS.length - 1 && (
              <ChevronRight className="h-4 w-4 text-muted-foreground mx-1" />
            )}
          </div>
        ))}
      </div>

      {/* Status card + Map + Export (visible when territory exists with points) */}
      {territoryDetail && territoryDetail.points.length >= 3 && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Status panel */}
          <Card className="lg:col-span-1">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Statut du dossier</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                {getStatusBadge(territoryDetail.territory.status)}
              </div>
              {/* Status selector */}
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Modifier le statut</Label>
                <div className="flex gap-2">
                  <select
                    className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                    value={territoryDetail.territory.status}
                    onChange={(e) => {
                      if (e.target.value !== territoryDetail.territory.status) {
                        updateStatusMutation.mutate({
                          territoryId: activeTerritoryId!,
                          status: e.target.value as any,
                        });
                      }
                    }}
                    disabled={updateStatusMutation.isPending}
                  >
                    <option value="draft">Brouillon</option>
                    <option value="collecting">En cours (Collecte)</option>
                    <option value="submitted">En révision</option>
                    <option value="validated_chief">Validé (Chef)</option>
                    <option value="official">Validé (Officiel)</option>
                    <option value="synced">Synchronisé SIFOR</option>
                  </select>
                  {updateStatusMutation.isPending && (
                    <span className="flex items-center">
                      <span className="h-4 w-4 border-2 border-ci-green border-t-transparent rounded-full animate-spin" />
                    </span>
                  )}
                </div>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Superficie</span>
                  <span className="font-medium">{territoryDetail.territory.calculatedAreaHa ? `${parseFloat(territoryDetail.territory.calculatedAreaHa).toFixed(2)} ha` : "N/A"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">P\u00e9rim\u00e8tre</span>
                  <span className="font-medium">{territoryDetail.territory.calculatedPerimeterKm ? `${parseFloat(territoryDetail.territory.calculatedPerimeterKm).toFixed(3)} km` : "N/A"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Points GPS</span>
                  <span className="font-medium">{territoryDetail.points.length}</span>
                </div>
                {territoryDetail.territory.siforCode && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Code SIFOR</span>
                    <span className="font-mono text-xs font-medium text-ci-green">{territoryDetail.territory.siforCode}</span>
                  </div>
                )}
              </div>
              <div className="pt-2 border-t space-y-2">
                <Button variant="outline" size="sm" className="w-full justify-start gap-2" onClick={handleExportPdf} disabled={exportPdfMutation.isPending}>
                  <FileText className="h-4 w-4 text-red-600" />
                  {exportPdfMutation.isPending ? (
                    <span className="flex items-center gap-2">
                      <span className="h-3 w-3 border-2 border-red-600 border-t-transparent rounded-full animate-spin" />
                      G\u00e9n\u00e9ration PDF...
                    </span>
                  ) : "Exporter en PDF"}
                </Button>
                {exportPdfMutation.isSuccess && (
                  <p className="text-xs text-green-600 flex items-center gap-1"><Check className="h-3 w-3" /> PDF g\u00e9n\u00e9r\u00e9 avec succ\u00e8s</p>
                )}
                <Button variant="outline" size="sm" className="w-full justify-start gap-2" onClick={handlePreviewPdf} disabled={previewPdfMutation.isPending}>
                  <Eye className="h-4 w-4 text-amber-600" />
                  Pr\u00e9visualiser le PDF
                </Button>
                <Button variant="outline" size="sm" className="w-full justify-start gap-2" onClick={handleExportGeoJSON} disabled={geojsonExporting}>
                  <Globe className="h-4 w-4 text-blue-600" />
                  {geojsonExporting ? (
                    <span className="flex items-center gap-2">
                      <span className="h-3 w-3 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                      Export GeoJSON...
                    </span>
                  ) : "Exporter en GeoJSON"}
                </Button>
                {geojsonExportSuccess && (
                  <p className="text-xs text-green-600 flex items-center gap-1"><Check className="h-3 w-3" /> GeoJSON export\u00e9 avec succ\u00e8s</p>
                )}
              </div>

              {/* Timeline / Historique des statuts avec documents */}
              <div className="pt-3 border-t">
                <p className="text-xs font-medium text-muted-foreground mb-2">Historique & Documents</p>
                <div className="space-y-3">
                  {/* Cr\u00e9ation / Initialisation */}
                  {territoryDetail.territory.createdAt && (
                    <div className="flex items-start gap-2">
                      <div className="mt-1 h-2 w-2 rounded-full bg-gray-400 shrink-0" />
                      <div className="text-xs flex-1">
                        <p className="font-medium">Cr\u00e9ation</p>
                        <p className="text-muted-foreground">{new Date(territoryDetail.territory.createdAt).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}</p>
                        {stepDocuments?.filter((d: any) => d.step === "initialisation").map((doc: any) => (
                          <a key={doc.id} href={doc.fileUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-blue-600 hover:underline mt-1">
                            <Paperclip className="h-3 w-3" />{doc.title}
                          </a>
                        ))}
                        <button onClick={() => handleUploadStepDocument("initialisation")} className="flex items-center gap-1 text-muted-foreground hover:text-foreground mt-1">
                          <Plus className="h-3 w-3" /> Joindre
                        </button>
                      </div>
                    </div>
                  )}
                  {/* Soumission */}
                  {territoryDetail.territory.status !== "draft" && territoryDetail.territory.status !== "collecting" && (
                    <div className="flex items-start gap-2">
                      <div className="mt-1 h-2 w-2 rounded-full bg-amber-500 shrink-0" />
                      <div className="text-xs flex-1">
                        <p className="font-medium">Points soumis</p>
                        <p className="text-muted-foreground">Dossier en r\u00e9vision</p>
                        {stepDocuments?.filter((d: any) => d.step === "soumission").map((doc: any) => (
                          <a key={doc.id} href={doc.fileUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-blue-600 hover:underline mt-1">
                            <Paperclip className="h-3 w-3" />{doc.title}
                          </a>
                        ))}
                        <button onClick={() => handleUploadStepDocument("soumission")} className="flex items-center gap-1 text-muted-foreground hover:text-foreground mt-1">
                          <Plus className="h-3 w-3" /> Joindre
                        </button>
                      </div>
                    </div>
                  )}
                  {/* Validation chef */}
                  {(territoryDetail.territory.status === "validated_chief" || territoryDetail.territory.status === "official" || territoryDetail.territory.status === "synced") && territoryDetail.territory.chiefSignedAt && (
                    <div className="flex items-start gap-2">
                      <div className="mt-1 h-2 w-2 rounded-full bg-purple-500 shrink-0" />
                      <div className="text-xs flex-1">
                        <p className="font-medium">Valid\u00e9 par le chef</p>
                        <p className="text-muted-foreground">{new Date(territoryDetail.territory.chiefSignedAt).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}</p>
                        {stepDocuments?.filter((d: any) => d.step === "validation_chef").map((doc: any) => (
                          <a key={doc.id} href={doc.fileUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-blue-600 hover:underline mt-1">
                            <Paperclip className="h-3 w-3" />{doc.title}
                          </a>
                        ))}
                        <button onClick={() => handleUploadStepDocument("validation_chef")} className="flex items-center gap-1 text-muted-foreground hover:text-foreground mt-1">
                          <Plus className="h-3 w-3" /> Joindre
                        </button>
                      </div>
                    </div>
                  )}
                  {/* Officialisation */}
                  {(territoryDetail.territory.status === "official" || territoryDetail.territory.status === "synced") && territoryDetail.territory.officializedAt && (
                    <div className="flex items-start gap-2">
                      <div className="mt-1 h-2 w-2 rounded-full bg-green-500 shrink-0" />
                      <div className="text-xs flex-1">
                        <p className="font-medium">Reconnaissance officielle</p>
                        <p className="text-muted-foreground">{new Date(territoryDetail.territory.officializedAt).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}</p>
                        {stepDocuments?.filter((d: any) => d.step === "officialisation").map((doc: any) => (
                          <a key={doc.id} href={doc.fileUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-blue-600 hover:underline mt-1">
                            <Paperclip className="h-3 w-3" />{doc.title}
                          </a>
                        ))}
                        <button onClick={() => handleUploadStepDocument("officialisation")} className="flex items-center gap-1 text-muted-foreground hover:text-foreground mt-1">
                          <Plus className="h-3 w-3" /> Joindre
                        </button>
                      </div>
                    </div>
                  )}
                  {/* Synchronisation */}
                  {territoryDetail.territory.status === "synced" && territoryDetail.territory.syncedAt && (
                    <div className="flex items-start gap-2">
                      <div className="mt-1 h-2 w-2 rounded-full bg-emerald-600 shrink-0" />
                      <div className="text-xs flex-1">
                        <p className="font-medium">Synchronis\u00e9 SIFOR-CI</p>
                        <p className="text-muted-foreground">{new Date(territoryDetail.territory.syncedAt).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}</p>
                        {stepDocuments?.filter((d: any) => d.step === "synchronisation").map((doc: any) => (
                          <a key={doc.id} href={doc.fileUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-blue-600 hover:underline mt-1">
                            <Paperclip className="h-3 w-3" />{doc.title}
                          </a>
                        ))}
                        <button onClick={() => handleUploadStepDocument("synchronisation")} className="flex items-center gap-1 text-muted-foreground hover:text-foreground mt-1">
                          <Plus className="h-3 w-3" /> Joindre
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Historique détaillé des changements de statut */}
              <div className="pt-3 border-t">
                <p className="text-xs font-medium text-muted-foreground mb-2">Historique des changements de statut</p>
                {statusHistoryData?.history && statusHistoryData.history.length > 0 ? (
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {statusHistoryData.history.map((entry: any, idx: number) => (
                      <div key={idx} className="flex items-start gap-2 text-xs">
                        <div className="mt-1 h-1.5 w-1.5 rounded-full bg-ci-green shrink-0" />
                        <div className="flex-1">
                          <p className="font-medium">
                            {getStatusLabel(entry.previousStatus)} → {getStatusLabel(entry.newStatus)}
                          </p>
                          <p className="text-muted-foreground">
                            par {entry.changedByName} — {new Date(entry.createdAt).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground italic">Aucun changement de statut enregistré</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Detail map with measurement tools */}
          <Card className="lg:col-span-2">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-muted-foreground">Aper\u00e7u du polygone</CardTitle>
                <div className="flex gap-1">
                  <Button
                    variant={measureMode === "distance" ? "default" : "outline"}
                    size="sm"
                    className={measureMode === "distance" ? "bg-ci-green hover:bg-ci-green/90 h-7 text-xs" : "h-7 text-xs"}
                    onClick={() => {
                      if (measureMode === "distance") {
                        setMeasureMode("none");
                        setMeasurePoints([]);
                        setMeasureResult("");
                      } else {
                        setMeasureMode("distance");
                        setMeasurePoints([]);
                        setMeasureResult("");
                      }
                    }}
                  >
                    <Ruler className="h-3 w-3 mr-1" /> Distance
                  </Button>
                  <Button
                    variant={measureMode === "area" ? "default" : "outline"}
                    size="sm"
                    className={measureMode === "area" ? "bg-ci-green hover:bg-ci-green/90 h-7 text-xs" : "h-7 text-xs"}
                    onClick={() => {
                      if (measureMode === "area") {
                        setMeasureMode("none");
                        setMeasurePoints([]);
                        setMeasureResult("");
                      } else {
                        setMeasureMode("area");
                        setMeasurePoints([]);
                        setMeasureResult("");
                      }
                    }}
                  >
                    <MapPin className="h-3 w-3 mr-1" /> Surface
                  </Button>
                </div>
              </div>
              {measureMode !== "none" && (
                <p className="text-xs text-muted-foreground mt-2">
                  {measureMode === "distance" ? "Cliquez sur la carte pour mesurer une distance (min. 2 points)" : "Cliquez sur la carte pour mesurer une surface (min. 3 points)"}
                  {measureResult && <span className="ml-2 font-bold text-ci-green">{measureResult}</span>}
                  {measurePoints.length > 0 && (
                    <button className="ml-2 text-red-500 hover:underline" onClick={() => { setMeasurePoints([]); setMeasureResult(""); }}>R\u00e9initialiser</button>
                  )}
                </p>
              )}
            </CardHeader>
            <CardContent>
              <DetailMapView
                points={territoryDetail.points}
                detailMapRef={detailMapRef}
                detailMapInstanceRef={detailMapInstanceRef}
                measureMode={measureMode}
                measurePoints={measurePoints}
                setMeasurePoints={setMeasurePoints}
                calculateMeasure={calculateMeasure}
              />
            </CardContent>
          </Card>
        </div>
      )}

      {/* Step 1: Initialize territory */}
      {currentStep === 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Landmark className="h-5 w-5 text-ci-green" />
              Initialisation du territoire
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="villageName">Nom du village *</Label>
                <Input id="villageName" value={villageName} onChange={(e) => setVillageName(e.target.value)} placeholder="Ex: Abobo-Gare" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="chiefName">Nom du chef *</Label>
                <Input id="chiefName" value={chiefName} onChange={(e) => setChiefName(e.target.value)} placeholder="Ex: Kouadio Yao" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="chiefPhone">Téléphone du chef</Label>
                <Input id="chiefPhone" value={chiefPhone} onChange={(e) => setChiefPhone(e.target.value)} placeholder="+225 07 XX XX XX XX" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="estimatedArea">Surface estimée (hectares)</Label>
                <Input id="estimatedArea" type="number" value={estimatedArea} onChange={(e) => setEstimatedArea(e.target.value)} placeholder="250" />
              </div>
            </div>

            <Button
              onClick={handleInitialize}
              disabled={createMutation.isPending}
              className="w-full bg-ci-green hover:bg-ci-green/90"
            >
              {createMutation.isPending ? "Création en cours..." : "Créer le territoire"}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Collect boundary points */}
      {currentStep === 2 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-ci-green" />
              Collecte des points de borne
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Map */}
            <div ref={mapRef} className="h-[350px] rounded-lg border border-ci-green/20 z-0" />

            {/* Landmark input */}
            <div className="flex gap-2">
              <Input
                value={landmarkDesc}
                onChange={(e) => setLandmarkDesc(e.target.value)}
                placeholder="Description du prochain point (optionnel)"
                className="flex-1"
              />
            </div>

            {/* Import GPX/CSV */}
            <div className="flex items-center gap-2">
              <Label htmlFor="gpxCsvImport" className="cursor-pointer flex items-center gap-2 px-4 py-2 border rounded-lg hover:bg-muted/50 transition-colors">
                <FileUp className="h-4 w-4 text-ci-orange" />
                <span className="text-sm">Importer GPX/CSV</span>
              </Label>
              <input
                id="gpxCsvImport"
                type="file"
                accept=".gpx,.csv"
                onChange={handleFileImport}
                className="hidden"
              />
              {importError && <span className="text-xs text-destructive">{importError}</span>}
            </div>

            {/* Points table */}
            {boundaryPoints.length > 0 && (
              <div className="border rounded-lg overflow-hidden">
                <div className="flex items-center justify-between px-4 py-2 bg-muted/50 border-b">
                  <span className="text-sm font-medium text-ci-green">
                    {boundaryPoints.length} point(s) de borne
                  </span>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleSavePoints}
                      disabled={savePointsMutation.isPending || boundaryPoints.length < 4}
                      className="text-xs text-ci-green hover:text-ci-green"
                    >
                      <Save className="h-3 w-3 mr-1" />
                      {savePointsMutation.isPending ? "..." : "Sauvegarder"}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => { setBoundaryPoints([]); setEditingIndex(null); toast.success("Tous les points supprimés"); }}
                      className="text-xs text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-3 w-3 mr-1" />
                      Tout effacer
                    </Button>
                  </div>
                </div>
                <div className="max-h-[280px] overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/30">
                        <TableHead className="w-[50px] text-center">N°</TableHead>
                        <TableHead className="w-[120px]">Latitude</TableHead>
                        <TableHead className="w-[120px]">Longitude</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead className="w-[100px] text-center">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {boundaryPoints.map((point, index) => (
                        <TableRow
                          key={index}
                          className={`cursor-pointer transition-colors ${editingIndex === index ? "bg-ci-green/5" : highlightedIndex === index ? "bg-ci-orange/10 ring-1 ring-ci-orange" : "hover:bg-muted/50"}`}
                          onClick={() => setHighlightedIndex((prev) => prev === index ? null : index)}
                        >
                          <TableCell className="text-center font-semibold text-ci-green">
                            {point.number}
                          </TableCell>
                          {editingIndex === index ? (
                            <>
                              <TableCell>
                                <Input
                                  value={editValues.lat}
                                  onChange={(e) => setEditValues((v) => ({ ...v, lat: e.target.value }))}
                                  className="h-7 text-xs w-full"
                                  type="number"
                                  step="0.000001"
                                  min="-90"
                                  max="90"
                                />
                              </TableCell>
                              <TableCell>
                                <Input
                                  value={editValues.lng}
                                  onChange={(e) => setEditValues((v) => ({ ...v, lng: e.target.value }))}
                                  className="h-7 text-xs w-full"
                                  type="number"
                                  step="0.000001"
                                  min="-180"
                                  max="180"
                                />
                              </TableCell>
                              <TableCell>
                                <Input
                                  value={editValues.landmark}
                                  onChange={(e) => setEditValues((v) => ({ ...v, landmark: e.target.value }))}
                                  className="h-7 text-xs w-full"
                                  placeholder="Description..."
                                />
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center justify-center gap-1">
                                  <Button variant="ghost" size="sm" onClick={saveEdit} className="h-7 w-7 p-0 text-ci-green hover:text-ci-green">
                                    <Save className="h-3.5 w-3.5" />
                                  </Button>
                                  <Button variant="ghost" size="sm" onClick={cancelEdit} className="h-7 w-7 p-0 text-muted-foreground">
                                    <X className="h-3.5 w-3.5" />
                                  </Button>
                                </div>
                              </TableCell>
                            </>
                          ) : (
                            <>
                              <TableCell className="text-xs font-mono">{point.lat}</TableCell>
                              <TableCell className="text-xs font-mono">{point.lng}</TableCell>
                              <TableCell className="text-xs text-muted-foreground truncate max-w-[150px]">{point.landmark}</TableCell>
                              <TableCell>
                                <div className="flex items-center justify-center gap-1">
                                  <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); startEdit(index); }} className="h-7 w-7 p-0 text-ci-orange hover:text-ci-orange">
                                    <Pencil className="h-3.5 w-3.5" />
                                  </Button>
                                  <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); removePoint(index); }} className="h-7 w-7 p-0 text-destructive hover:text-destructive">
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </Button>
                                </div>
                              </TableCell>
                            </>
                          )}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}

            {/* Superficie & Périmètre */}
            {boundaryPoints.length >= 3 && (
              <div className="flex items-center gap-4 p-3 bg-gradient-to-r from-ci-green/5 to-ci-orange/5 rounded-lg border border-ci-green/20">
                <Ruler className="h-5 w-5 text-ci-green shrink-0" />
                <div className="flex flex-wrap gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Superficie :</span>{" "}
                    <span className="font-semibold text-ci-green">{calculateArea.toFixed(2)} ha</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Périmètre :</span>{" "}
                    <span className="font-semibold text-ci-orange">{calculatePerimeter.toFixed(3)} km</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Points :</span>{" "}
                    <span className="font-semibold">{boundaryPoints.length}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Export buttons */}
            {boundaryPoints.length > 0 && (
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={exportGPX} className="flex-1 border-ci-green text-ci-green hover:bg-ci-green hover:text-white">
                  <Download className="h-4 w-4 mr-1" />
                  Exporter GPX
                </Button>
                <Button variant="outline" size="sm" onClick={exportCSV} className="flex-1 border-ci-orange text-ci-orange hover:bg-ci-orange hover:text-white">
                  <Download className="h-4 w-4 mr-1" />
                  Exporter CSV
                </Button>
              </div>
            )}

            <Button
              onClick={handleSubmitPoints}
              disabled={boundaryPoints.length < 4 || savePointsMutation.isPending || submitPointsMutation.isPending}
              className="w-full bg-ci-green hover:bg-ci-green/90"
            >
              <MapPin className="h-4 w-4 mr-2" />
              {submitPointsMutation.isPending ? "Soumission..." : `Soumettre les points (${boundaryPoints.length}/4 minimum)`}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Chief validation */}
      {currentStep === 3 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserCheck className="h-5 w-5 text-ci-green" />
              Validation par le chef du village
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 bg-muted/50 rounded-lg">
              <p className="text-sm text-muted-foreground mb-2">
                Le chef du village doit valider les limites du territoire après vérification sur le terrain.
              </p>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Chef :</span>{" "}
                  <span className="font-medium">{territoryDetail?.territory.chiefName}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Points :</span>{" "}
                  <span className="font-medium">{territoryDetail?.points.length || boundaryPoints.length}</span>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Commentaires du chef (optionnel)</Label>
              <Textarea
                value={chiefComments}
                onChange={(e) => setChiefComments(e.target.value)}
                placeholder="Observations, remarques ou réserves du chef..."
                rows={3}
              />
            </div>

            <Button
              onClick={handleChiefValidation}
              disabled={validateChiefMutation.isPending}
              className="w-full bg-ci-green hover:bg-ci-green/90"
            >
              <UserCheck className="h-4 w-4 mr-2" />
              {validateChiefMutation.isPending ? "Validation..." : "Valider les limites (Signature du chef)"}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Step 4: Official recognition */}
      {currentStep === 4 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-ci-green" />
              Reconnaissance officielle AFOR
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 bg-muted/50 rounded-lg">
              <p className="text-sm text-muted-foreground">
                L'administration AFOR reconnaît officiellement le territoire après vérification du dossier complet.
              </p>
            </div>

            <Button
              onClick={handleRecognition}
              disabled={officializeMutation.isPending}
              className="w-full bg-ci-green hover:bg-ci-green/90"
            >
              <ShieldCheck className="h-4 w-4 mr-2" />
              {officializeMutation.isPending ? "Officialisation..." : "Reconnaître officiellement le territoire"}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Step 5: SIFOR sync */}
      {currentStep === 5 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <RefreshCw className="h-5 w-5 text-ci-green" />
              Synchronisation SIFOR-CI
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {siforCode ? (
              <div className="p-6 bg-ci-green/5 rounded-lg border border-ci-green/20 text-center">
                <Check className="h-12 w-12 text-ci-green mx-auto mb-3" />
                <h3 className="text-lg font-semibold text-ci-green mb-1">Synchronisation réussie</h3>
                <p className="text-sm text-muted-foreground mb-3">Le territoire est enregistré dans le SIFOR-CI</p>
                <div className="inline-block px-4 py-2 bg-white rounded-lg border font-mono text-sm">
                  Code SIFOR : <span className="font-bold text-ci-green">{siforCode}</span>
                </div>
              </div>
            ) : (
              <>
                <div className="p-4 bg-muted/50 rounded-lg">
                  <p className="text-sm text-muted-foreground">
                    Synchronisation avec le Système d'Information Foncière Rurale de Côte d'Ivoire (SIFOR-CI).
                  </p>
                </div>

                {isSyncing && (
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Synchronisation en cours...</span>
                      <span>{Math.round(syncProgress)}%</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-ci-green rounded-full transition-all duration-300"
                        style={{ width: `${syncProgress}%` }}
                      />
                    </div>
                  </div>
                )}

                <Button
                  onClick={handleSync}
                  disabled={isSyncing}
                  className="w-full bg-ci-green hover:bg-ci-green/90"
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${isSyncing ? "animate-spin" : ""}`} />
                  {isSyncing ? "Synchronisation..." : "Lancer la synchronisation SIFOR-CI"}
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* PDF Preview Modal */}
      {pdfPreviewUrl && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={() => setPdfPreviewUrl(null)}>
          <div className="bg-white rounded-lg shadow-2xl w-full max-w-4xl h-[80vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="font-semibold text-lg">Pr\u00e9visualisation du PDF</h3>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => window.open(pdfPreviewUrl, "_blank")}>
                  <Download className="h-4 w-4 mr-1" /> T\u00e9l\u00e9charger
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setPdfPreviewUrl(null)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="flex-1 p-2">
              <iframe src={pdfPreviewUrl} className="w-full h-full rounded border" title="Pr\u00e9visualisation PDF" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
