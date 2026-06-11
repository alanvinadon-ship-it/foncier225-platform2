import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { MapPin, Check, ChevronRight, Upload, Trash2, Landmark, UserCheck, ShieldCheck, RefreshCw, FileUp, Pencil, X, Save, Download, Ruler } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";

// Types
interface BoundaryPoint {
  number: number;
  lat: number;
  lng: number;
  landmark: string;
}

interface Territory {
  name: string;
  code: string;
  chiefName: string;
  chiefPhone: string;
  estimatedArea: number;
  status: "draft" | "delimited" | "validated" | "official" | "synced";
  createdAt: string;
}

interface UploadedFile {
  name: string;
  size: string;
  type: string;
}

// Steps configuration
const STEPS = [
  { id: 1, label: "Initialisation", icon: Landmark, description: "Créer un nouveau territoire" },
  { id: 2, label: "Collecte points", icon: MapPin, description: "Ajouter les bornes GPS" },
  { id: 3, label: "Validation chef", icon: UserCheck, description: "Signature du chef" },
  { id: 4, label: "Reconnaissance", icon: ShieldCheck, description: "Admin AFOR" },
  { id: 5, label: "Synchronisation", icon: RefreshCw, description: "SIFOR-CI" },
];

export default function DelimitationVillageoise() {
  const [currentStep, setCurrentStep] = useState(1);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [territory, setTerritory] = useState<Territory | null>(null);
  const [boundaryPoints, setBoundaryPoints] = useState<BoundaryPoint[]>([]);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [syncProgress, setSyncProgress] = useState(0);
  const [siforCode, setSiforCode] = useState("");
  const [isSyncing, setIsSyncing] = useState(false);
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const polylineRef = useRef<any>(null);

  const [importError, setImportError] = useState<string | null>(null);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editValues, setEditValues] = useState<{ lat: string; lng: string; landmark: string }>({ lat: "", lng: "", landmark: "" });
  const [highlightedIndex, setHighlightedIndex] = useState<number | null>(null);

  // Form state
  const [villageName, setVillageName] = useState("Abobo-Gare");
  const [villageCode, setVillageCode] = useState("ABJ-ABOBO-001");
  const [chiefName, setChiefName] = useState("Kouadio Yao");
  const [chiefPhone, setChiefPhone] = useState("+225 07 12 34 56 78");
  const [estimatedArea, setEstimatedArea] = useState("250");
  const [landmarkDesc, setLandmarkDesc] = useState("");
  const [chiefComments, setChiefComments] = useState("");

  // Initialize map when step 2 is active
  useEffect(() => {
    if (currentStep === 2 && mapRef.current && !mapInstanceRef.current) {
      // Dynamic import of leaflet
      import("leaflet").then((L) => {
        // Fix default icon issue
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
          addPoint(lat, lng, L, map);
        });

        mapInstanceRef.current = map;
      });
    }

    return () => {
      if (currentStep !== 2 && mapInstanceRef.current) {
        // Don't destroy the map, just leave it
      }
    };
  }, [currentStep]);

  // Redraw map markers/polyline when points change
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    import("leaflet").then((L) => {
      const map = mapInstanceRef.current;
      // Clear existing markers
      markersRef.current.forEach((m) => map.removeLayer(m));
      markersRef.current = [];
      if (polylineRef.current) map.removeLayer(polylineRef.current);

      // Add markers
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

      // Draw polyline
      if (boundaryPoints.length > 1) {
        const coords = boundaryPoints.map((p) => [p.lat, p.lng] as [number, number]);
        if (boundaryPoints.length >= 4) {
          coords.push(coords[0]); // Close polygon
        }
        polylineRef.current = L.polyline(coords, {
          color: "#FFA500",
          weight: 3,
          dashArray: boundaryPoints.length >= 4 ? undefined : "5, 10",
        }).addTo(map);
      }
    });
  }, [boundaryPoints, highlightedIndex]);

  const addPoint = useCallback((lat: number, lng: number, L: any, map: any) => {
    setBoundaryPoints((prev) => {
      const newPoint: BoundaryPoint = {
        number: prev.length + 1,
        lat: parseFloat(lat.toFixed(6)),
        lng: parseFloat(lng.toFixed(6)),
        landmark: landmarkDesc || `Point ${prev.length + 1}`,
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
      toast.error("Coordonn\u00e9es invalides. Latitude: -90 \u00e0 90, Longitude: -180 \u00e0 180");
      return;
    }
    setBoundaryPoints((prev) =>
      prev.map((p, i) =>
        i === editingIndex ? { ...p, lat, lng, landmark: editValues.landmark || `Point ${i + 1}` } : p
      )
    );
    toast.success(`Point ${editingIndex + 1} modifi\u00e9`);
    setEditingIndex(null);
  };

  const cancelEdit = () => {
    setEditingIndex(null);
  };

  // Export GPX
  const exportGPX = () => {
    if (boundaryPoints.length === 0) return;
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
    toast.success(`${boundaryPoints.length} points export\u00e9s en GPX`);
  };

  // Export CSV
  const exportCSV = () => {
    if (boundaryPoints.length === 0) return;
    const header = "numero,latitude,longitude,description";
    const rows = boundaryPoints.map((p) => `${p.number},${p.lat},${p.lng},"${p.landmark.replace(/"/g, '""')}"`);
    const csvContent = [header, ...rows].join("\n");
    downloadFile(csvContent, `delimitation-${territory?.code || "points"}.csv`, "text/csv");
    toast.success(`${boundaryPoints.length} points export\u00e9s en CSV`);
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
    // Shoelface formula with geodesic approximation
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
    return area / 10000; // Convert to hectares
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
      perimeter += 6371 * c; // km
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

        // Merge with existing points, renumber
        setBoundaryPoints((prev) => {
          const merged = [...prev, ...importedPoints];
          return merged.map((p, i) => ({ ...p, number: i + 1 }));
        });

        toast.success(`${importedPoints.length} point(s) importé(s) depuis ${file.name}`);
      } catch (err) {
        setImportError(`Erreur de parsing : ${err instanceof Error ? err.message : "format invalide"}`);
      }
    };

    reader.onerror = () => setImportError("Erreur lors de la lecture du fichier.");
    reader.readAsText(file);
    // Reset input so same file can be re-imported
    e.target.value = "";
  };

  const parseGPX = (content: string): BoundaryPoint[] => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(content, "application/xml");
    const points: BoundaryPoint[] = [];

    // Parse <wpt> elements (waypoints)
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

    // If no waypoints, try <trkpt> (track points)
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

    // Also try <rtept> (route points)
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

    // Parse header
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

  // Step 1: Initialize territory
  const handleInitialize = () => {
    if (!villageName || !villageCode || !chiefName) {
      toast.error("Veuillez remplir tous les champs obligatoires");
      return;
    }

    setTerritory({
      name: villageName,
      code: villageCode,
      chiefName,
      chiefPhone,
      estimatedArea: parseFloat(estimatedArea),
      status: "draft",
      createdAt: new Date().toLocaleDateString("fr-FR"),
    });

    toast.success("Territoire créé avec succès");
    completeStep(1);
  };

  // Step 2: Submit points
  const handleSubmitPoints = () => {
    if (boundaryPoints.length < 4) {
      toast.error("Minimum 4 points de borne requis");
      return;
    }

    setTerritory((prev) => prev ? { ...prev, status: "delimited" } : null);
    toast.success(`${boundaryPoints.length} points de borne soumis`);
    completeStep(2);
  };

  // Step 3: Chief validation
  const handleChiefValidation = () => {
    setTerritory((prev) => prev ? { ...prev, status: "validated" } : null);
    toast.success("Territoire validé par le chef du village");
    completeStep(3);
  };

  // Step 4: Official recognition
  const handleRecognition = () => {
    setTerritory((prev) => prev ? { ...prev, status: "official" } : null);
    toast.success("Territoire reconnu officiellement par l'AFOR");
    completeStep(4);
  };

  // Step 5: SIFOR sync
  const handleSync = () => {
    setIsSyncing(true);
    setSyncProgress(0);

    const interval = setInterval(() => {
      setSyncProgress((prev) => {
        const next = prev + Math.random() * 15;
        if (next >= 100) {
          clearInterval(interval);
          const code = "SIFOR-CI-" + Math.random().toString(36).substring(2, 11).toUpperCase();
          setSiforCode(code);
          setIsSyncing(false);
          setTerritory((prev) => prev ? { ...prev, status: "synced" } : null);
          setCompletedSteps((prev) => [...prev, 5]);
          toast.success("Synchronisation SIFOR-CI réussie !");
          return 100;
        }
        return next;
      });
    }, 300);
  };

  // File upload simulation
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const newFiles = files.map((f) => ({
      name: f.name,
      size: (f.size / 1024).toFixed(1) + " KB",
      type: f.type,
    }));
    setUploadedFiles((prev) => [...prev, ...newFiles]);
    toast.success(`${files.length} document(s) ajouté(s)`);
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
      draft: { label: "Brouillon", variant: "secondary" },
      delimited: { label: "Délimité", variant: "outline" },
      validated: { label: "Validé", variant: "default" },
      official: { label: "Officiel", variant: "default" },
      synced: { label: "Synchronisé SIFOR", variant: "default" },
    };
    const config = variants[status] || variants.draft;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const calculatedArea = boundaryPoints.length >= 4
    ? Math.round(parseFloat(estimatedArea) * (0.8 + Math.random() * 0.4))
    : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-ci-green flex items-center gap-2">
          <MapPin className="h-6 w-6" />
          Délimitation Villageoise
        </h1>
        <p className="text-muted-foreground mt-1">
          Simulation du workflow de délimitation d'un territoire villageois
        </p>
      </div>

      {/* Progress steps */}
      <div className="flex items-center gap-1 overflow-x-auto pb-2">
        {STEPS.map((step, index) => {
          const isActive = currentStep === step.id;
          const isCompleted = completedSteps.includes(step.id);
          const Icon = step.icon;

          return (
            <div key={step.id} className="flex items-center">
              <button
                onClick={() => goToStep(step.id)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all text-sm whitespace-nowrap ${
                  isActive
                    ? "bg-ci-green text-white shadow-md"
                    : isCompleted
                    ? "bg-green-50 text-green-700 border border-green-200"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {isCompleted ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <Icon className="h-4 w-4" />
                )}
                <span className="hidden sm:inline">{step.label}</span>
                <span className="sm:hidden">{step.id}</span>
              </button>
              {index < STEPS.length - 1 && (
                <ChevronRight className="h-4 w-4 text-muted-foreground mx-1 shrink-0" />
              )}
            </div>
          );
        })}
      </div>

      {/* Step content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main content */}
        <div className="lg:col-span-2">
          {/* Step 1: Initialization */}
          {currentStep === 1 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-ci-green">Initialisation du territoire</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-r-lg">
                  <p className="text-sm text-blue-800">
                    <strong>Agent terrain :</strong> Créez un nouveau territoire villageois en fournissant les informations de base du village et de son chef.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="village-name">Nom du village *</Label>
                    <Input
                      id="village-name"
                      value={villageName}
                      onChange={(e) => setVillageName(e.target.value)}
                      placeholder="Ex: Abobo-Gare"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="village-code">Code du territoire *</Label>
                    <Input
                      id="village-code"
                      value={villageCode}
                      onChange={(e) => setVillageCode(e.target.value)}
                      placeholder="Ex: ABJ-ABOBO-001"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="chief-name">Nom du chef du village *</Label>
                    <Input
                      id="chief-name"
                      value={chiefName}
                      onChange={(e) => setChiefName(e.target.value)}
                      placeholder="Ex: Kouadio Yao"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="chief-phone">Téléphone du chef</Label>
                    <Input
                      id="chief-phone"
                      value={chiefPhone}
                      onChange={(e) => setChiefPhone(e.target.value)}
                      placeholder="Ex: +225 07 XX XX XX XX"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="estimated-area">Surface estimée (hectares)</Label>
                    <Input
                      id="estimated-area"
                      type="number"
                      value={estimatedArea}
                      onChange={(e) => setEstimatedArea(e.target.value)}
                      placeholder="Ex: 250"
                      min="1"
                    />
                  </div>
                </div>

                <Button onClick={handleInitialize} className="w-full bg-ci-green hover:bg-ci-green/90">
                  <Landmark className="h-4 w-4 mr-2" />
                  Créer le territoire
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Step 2: Collect points */}
          {currentStep === 2 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-ci-green">Collecte des points de borne</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-r-lg">
                  <p className="text-sm text-blue-800">
                    <strong>Instructions :</strong> Cliquez sur la carte pour ajouter les points de borne, ou importez un fichier GPX/CSV. Minimum 4 points requis.
                  </p>
                </div>

                {/* GPX/CSV Import */}
                <div className="border-2 border-dashed border-ci-green/40 rounded-lg p-4 bg-green-50/50">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-ci-green flex items-center gap-2">
                        <FileUp className="h-4 w-4" />
                        Importer un fichier GPX ou CSV
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        GPX : waypoints, trackpoints ou route points. CSV : colonnes lat, lng (+ description optionnelle).
                      </p>
                    </div>
                    <label className="cursor-pointer">
                      <Button variant="outline" size="sm" className="border-ci-green text-ci-green hover:bg-ci-green hover:text-white" asChild>
                        <span>
                          <FileUp className="h-4 w-4 mr-1" />
                          Choisir un fichier
                        </span>
                      </Button>
                      <input
                        type="file"
                        className="hidden"
                        accept=".gpx,.csv"
                        onChange={handleFileImport}
                      />
                    </label>
                  </div>
                  {importError && (
                    <p className="text-xs text-destructive mt-2 font-medium">{importError}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="landmark-desc">Description du repère (prochain point)</Label>
                  <Input
                    id="landmark-desc"
                    value={landmarkDesc}
                    onChange={(e) => setLandmarkDesc(e.target.value)}
                    placeholder="Ex: Arbre baobab, Maison du chef, Rivière..."
                  />
                </div>

                {/* Map container */}
                <div
                  ref={mapRef}
                  className="w-full h-[400px] rounded-lg border border-border overflow-hidden"
                  style={{ zIndex: 0 }}
                />

                {/* Points table */}
                {boundaryPoints.length > 0 && (
                  <div className="border rounded-lg overflow-hidden">
                    <div className="flex items-center justify-between px-4 py-2 bg-muted/50 border-b">
                      <span className="text-sm font-medium text-ci-green">
                        {boundaryPoints.length} point(s) de borne
                      </span>
                      {boundaryPoints.length > 0 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => { setBoundaryPoints([]); setEditingIndex(null); toast.success("Tous les points supprim\u00e9s"); }}
                          className="text-xs text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-3 w-3 mr-1" />
                          Tout effacer
                        </Button>
                      )}
                    </div>
                    <div className="max-h-[280px] overflow-y-auto">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-muted/30">
                            <TableHead className="w-[50px] text-center">N\u00b0</TableHead>
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
                                      <Button variant="ghost" size="sm" onClick={() => startEdit(index)} className="h-7 w-7 p-0 text-ci-orange hover:text-ci-orange">
                                        <Pencil className="h-3.5 w-3.5" />
                                      </Button>
                                      <Button variant="ghost" size="sm" onClick={() => removePoint(index)} className="h-7 w-7 p-0 text-destructive hover:text-destructive">
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
                        <span className="text-muted-foreground">P\u00e9rim\u00e8tre :</span>{" "}
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
                  disabled={boundaryPoints.length < 4}
                  className="w-full bg-ci-green hover:bg-ci-green/90"
                >
                  <MapPin className="h-4 w-4 mr-2" />
                  Soumettre les points ({boundaryPoints.length}/4 minimum)
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Step 3: Chief validation */}
          {currentStep === 3 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-ci-green">Validation par le chef du village</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-green-50 border-l-4 border-green-500 p-4 rounded-r-lg">
                  <p className="text-sm text-green-800">
                    <strong>Chef du village :</strong> Consultez le résumé de la délimitation et validez les limites du territoire.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-muted rounded-lg">
                    <p className="text-xs text-muted-foreground">Points de borne</p>
                    <p className="text-2xl font-bold text-ci-green">{boundaryPoints.length}</p>
                  </div>
                  <div className="p-4 bg-muted rounded-lg">
                    <p className="text-xs text-muted-foreground">Surface calculée</p>
                    <p className="text-2xl font-bold text-ci-green">{calculatedArea || "—"} ha</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="chief-comments">Commentaires du chef</Label>
                  <Textarea
                    id="chief-comments"
                    value={chiefComments}
                    onChange={(e) => setChiefComments(e.target.value)}
                    placeholder="Confirmez que les limites sont correctes ou indiquez les corrections nécessaires..."
                    rows={3}
                  />
                </div>

                <Button onClick={handleChiefValidation} className="w-full bg-ci-green hover:bg-ci-green/90">
                  <UserCheck className="h-4 w-4 mr-2" />
                  Valider et signer électroniquement
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Step 4: Official recognition */}
          {currentStep === 4 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-ci-green">Reconnaissance officielle (Admin AFOR)</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-green-50 border-l-4 border-green-500 p-4 rounded-r-lg">
                  <p className="text-sm text-green-800">
                    <strong>Validation du chef reçue.</strong> Téléchargez les documents d'appui et reconnaissez officiellement le territoire.
                  </p>
                </div>

                {/* File upload */}
                <div>
                  <Label>Documents d'appui</Label>
                  <label className="mt-2 flex flex-col items-center justify-center border-2 border-dashed border-ci-green/50 rounded-lg p-6 cursor-pointer hover:bg-ci-green/5 transition-colors">
                    <Upload className="h-8 w-8 text-ci-green mb-2" />
                    <span className="text-sm font-medium">Cliquez pour ajouter des documents</span>
                    <span className="text-xs text-muted-foreground mt-1">PV de délimitation, cartes, autorisations...</span>
                    <input
                      type="file"
                      multiple
                      className="hidden"
                      onChange={handleFileUpload}
                      accept=".pdf,.jpg,.jpeg,.png"
                    />
                  </label>
                </div>

                {uploadedFiles.length > 0 && (
                  <div className="space-y-2">
                    {uploadedFiles.map((file, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-muted rounded-lg border-l-4 border-green-500">
                        <div>
                          <p className="text-sm font-medium">{file.name}</p>
                          <p className="text-xs text-muted-foreground">{file.size}</p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setUploadedFiles((prev) => prev.filter((_, i) => i !== index))}
                          className="text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}

                <Button onClick={handleRecognition} className="w-full bg-ci-green hover:bg-ci-green/90">
                  <ShieldCheck className="h-4 w-4 mr-2" />
                  Reconnaître officiellement
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Step 5: SIFOR sync */}
          {currentStep === 5 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-ci-green">Synchronisation avec SIFOR-CI</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-green-50 border-l-4 border-green-500 p-4 rounded-r-lg">
                  <p className="text-sm text-green-800">
                    <strong>Reconnaissance officielle complétée.</strong> Synchronisez maintenant les données avec le registre national SIFOR-CI.
                  </p>
                </div>

                {/* Progress bar */}
                {(isSyncing || syncProgress > 0) && (
                  <div className="space-y-2">
                    <div className="w-full h-3 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-ci-green to-ci-orange transition-all duration-300 rounded-full"
                        style={{ width: `${Math.min(syncProgress, 100)}%` }}
                      />
                    </div>
                    <p className="text-center text-sm text-muted-foreground">
                      {Math.round(Math.min(syncProgress, 100))}%
                    </p>
                  </div>
                )}

                {siforCode && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
                    <p className="text-sm text-green-700 mb-1">Code SIFOR-CI attribué</p>
                    <p className="text-2xl font-bold text-ci-green font-mono">{siforCode}</p>
                    <p className="text-xs text-muted-foreground mt-2">
                      Attestation officielle générée avec QR code de vérification
                    </p>
                  </div>
                )}

                {!siforCode && (
                  <Button
                    onClick={handleSync}
                    disabled={isSyncing}
                    className="w-full bg-ci-green hover:bg-ci-green/90"
                  >
                    <RefreshCw className={`h-4 w-4 mr-2 ${isSyncing ? "animate-spin" : ""}`} />
                    {isSyncing ? "Synchronisation en cours..." : "Lancer la synchronisation"}
                  </Button>
                )}

                {siforCode && (
                  <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-r-lg">
                    <p className="text-sm text-blue-800">
                      <strong>Workflow terminé !</strong> Le territoire a été délimité, validé, reconnu officiellement et synchronisé avec le SIFOR-CI. L'attestation est disponible pour téléchargement.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar summary */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Résumé du territoire</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {territory ? (
                <>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-muted-foreground">Statut</span>
                    {getStatusBadge(territory.status)}
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground">Village</span>
                    <p className="font-medium">{territory.name}</p>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground">Code</span>
                    <p className="font-mono text-sm">{territory.code}</p>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground">Chef</span>
                    <p className="font-medium">{territory.chiefName}</p>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground">Surface estimée</span>
                    <p className="font-medium">{territory.estimatedArea} ha</p>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground">Créé le</span>
                    <p className="font-medium">{territory.createdAt}</p>
                  </div>
                  {boundaryPoints.length > 0 && (
                    <div>
                      <span className="text-xs text-muted-foreground">Points de borne</span>
                      <p className="font-medium">{boundaryPoints.length}</p>
                    </div>
                  )}
                  {siforCode && (
                    <div>
                      <span className="text-xs text-muted-foreground">Code SIFOR-CI</span>
                      <p className="font-mono text-sm font-bold text-ci-green">{siforCode}</p>
                    </div>
                  )}
                </>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Aucun territoire créé
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Audit trail</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {completedSteps.includes(1) && (
                  <div className="text-xs border-l-2 border-ci-green pl-3 py-1">
                    <p className="font-medium">Territoire créé</p>
                    <p className="text-muted-foreground">{territory?.createdAt}</p>
                  </div>
                )}
                {completedSteps.includes(2) && (
                  <div className="text-xs border-l-2 border-ci-orange pl-3 py-1">
                    <p className="font-medium">{boundaryPoints.length} points collectés</p>
                    <p className="text-muted-foreground">Délimitation soumise</p>
                  </div>
                )}
                {completedSteps.includes(3) && (
                  <div className="text-xs border-l-2 border-blue-500 pl-3 py-1">
                    <p className="font-medium">Validé par le chef</p>
                    <p className="text-muted-foreground">Signature électronique</p>
                  </div>
                )}
                {completedSteps.includes(4) && (
                  <div className="text-xs border-l-2 border-purple-500 pl-3 py-1">
                    <p className="font-medium">Reconnu officiellement</p>
                    <p className="text-muted-foreground">Admin AFOR</p>
                  </div>
                )}
                {completedSteps.includes(5) && (
                  <div className="text-xs border-l-2 border-green-600 pl-3 py-1">
                    <p className="font-medium">Synchronisé SIFOR-CI</p>
                    <p className="text-muted-foreground font-mono">{siforCode}</p>
                  </div>
                )}
                {completedSteps.length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-2">Aucun événement</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
