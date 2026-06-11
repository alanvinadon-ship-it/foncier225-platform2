import { useState, useEffect, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Layers, Eye, EyeOff, ChevronDown, ChevronUp } from "lucide-react";

interface SigLayer {
  id: string;
  name: string;
  type: "wms" | "wfs";
  url: string;
  visible: boolean;
  opacity: number;
}

interface SigLayerOverlayProps {
  map: google.maps.Map | null;
}

/**
 * Composant de superposition des couches SIG (WMS/WFS) sur Google Maps.
 * Charge dynamiquement les couches selon la configuration admin.
 */
export default function SigLayerOverlay({ map }: SigLayerOverlayProps) {
  const { data: sigConfig } = trpc.admin.getSigConfig.useQuery(undefined, {
    retry: false,
    refetchOnWindowFocus: false,
  });

  const [layers, setLayers] = useState<SigLayer[]>([]);
  const [overlays, setOverlays] = useState<Map<string, google.maps.ImageMapType>>(new Map());
  const [expanded, setExpanded] = useState(true);

  // Build layers from SIG config
  useEffect(() => {
    if (!sigConfig || !sigConfig.enabled || sigConfig.provider === "none") {
      setLayers([]);
      return;
    }

    const newLayers: SigLayer[] = [];
    const provider = sigConfig.provider as string;

    if (provider === "geoserver") {
      const gs = sigConfig.geoserver as Record<string, string>;
      if (gs?.baseUrl && gs?.workspace) {
        newLayers.push({
          id: "gs-parcelles",
          name: "Parcelles cadastrales",
          type: "wms",
          url: `${gs.baseUrl}/${gs.workspace}/wms`,
          visible: true,
          opacity: 0.6,
        });
        newLayers.push({
          id: "gs-delimitation",
          name: "Délimitations villageoises",
          type: "wms",
          url: `${gs.baseUrl}/${gs.workspace}/wms`,
          visible: true,
          opacity: 0.5,
        });
        newLayers.push({
          id: "gs-occupation",
          name: "Occupation du sol",
          type: "wms",
          url: `${gs.baseUrl}/${gs.workspace}/wms`,
          visible: false,
          opacity: 0.4,
        });
      }
    } else if (provider === "qgis_server") {
      const qs = sigConfig.qgisServer as Record<string, string>;
      if (qs?.wmsUrl) {
        newLayers.push({
          id: "qgis-cadastre",
          name: "Plan cadastral",
          type: "wms",
          url: qs.wmsUrl,
          visible: true,
          opacity: 0.6,
        });
        newLayers.push({
          id: "qgis-limites",
          name: "Limites administratives",
          type: "wms",
          url: qs.wmsUrl,
          visible: true,
          opacity: 0.5,
        });
      }
    } else if (provider === "arcgis_online" || provider === "arcgis_enterprise") {
      const arcgis = provider === "arcgis_online"
        ? sigConfig.arcgisOnline as Record<string, string>
        : sigConfig.arcgisEnterprise as Record<string, string>;
      const baseUrl = arcgis?.portalUrl || arcgis?.serverUrl || "";
      if (baseUrl) {
        newLayers.push({
          id: "arcgis-cadastre",
          name: "Couche cadastrale",
          type: "wms",
          url: `${baseUrl}/services/Cadastre/MapServer/WMSServer`,
          visible: true,
          opacity: 0.6,
        });
        newLayers.push({
          id: "arcgis-ortho",
          name: "Orthophotos",
          type: "wms",
          url: `${baseUrl}/services/Imagery/MapServer/WMSServer`,
          visible: false,
          opacity: 0.7,
        });
      }
    } else if (provider === "custom") {
      const c = sigConfig.custom as Record<string, string>;
      if (c?.url) {
        newLayers.push({
          id: "custom-layer",
          name: "Couche SIG personnalisée",
          type: "wms",
          url: c.url,
          visible: true,
          opacity: 0.6,
        });
      }
    }

    setLayers(newLayers);
  }, [sigConfig]);

  // Create/update WMS overlays on map
  const createWmsOverlay = useCallback((layer: SigLayer): google.maps.ImageMapType => {
    const wmsOverlay = new google.maps.ImageMapType({
      getTileUrl: (coord, zoom) => {
        const proj = map!.getProjection()!;
        const zfactor = Math.pow(2, zoom);
        const top = proj.fromPointToLatLng(
          new google.maps.Point((coord.x * 256) / zfactor, (coord.y * 256) / zfactor)
        );
        const bot = proj.fromPointToLatLng(
          new google.maps.Point(((coord.x + 1) * 256) / zfactor, ((coord.y + 1) * 256) / zfactor)
        );
        const bbox = `${top!.lng()},${bot!.lat()},${bot!.lng()},${top!.lat()}`;
        const layerName = layer.id.split("-").pop() || "parcelles";
        return (
          `${layer.url}?SERVICE=WMS&VERSION=1.1.1&REQUEST=GetMap` +
          `&LAYERS=${layerName}&SRS=EPSG:4326&BBOX=${bbox}` +
          `&WIDTH=256&HEIGHT=256&FORMAT=image/png&TRANSPARENT=TRUE`
        );
      },
      tileSize: new google.maps.Size(256, 256),
      opacity: layer.opacity,
      name: layer.name,
    });
    return wmsOverlay;
  }, [map]);

  // Apply layers to map
  useEffect(() => {
    if (!map) return;

    // Remove old overlays
    overlays.forEach((overlay) => {
      const idx = map.overlayMapTypes.getArray().indexOf(overlay);
      if (idx >= 0) map.overlayMapTypes.removeAt(idx);
    });

    // Add new visible overlays
    const newOverlays = new Map<string, google.maps.ImageMapType>();
    layers.forEach((layer) => {
      if (layer.visible && layer.type === "wms") {
        const overlay = createWmsOverlay(layer);
        map.overlayMapTypes.push(overlay);
        newOverlays.set(layer.id, overlay);
      }
    });

    setOverlays(newOverlays);
  }, [map, layers, createWmsOverlay]);

  // Toggle layer visibility
  const toggleLayer = (layerId: string) => {
    setLayers((prev) =>
      prev.map((l) => {
        if (l.id === layerId) {
          const newVisible = !l.visible;
          // Update overlay on map
          if (map) {
            const overlay = overlays.get(layerId);
            if (overlay && !newVisible) {
              const idx = map.overlayMapTypes.getArray().indexOf(overlay);
              if (idx >= 0) map.overlayMapTypes.removeAt(idx);
              overlays.delete(layerId);
            } else if (!overlay && newVisible) {
              const newOverlay = createWmsOverlay({ ...l, visible: true });
              map.overlayMapTypes.push(newOverlay);
              overlays.set(layerId, newOverlay);
            }
          }
          return { ...l, visible: newVisible };
        }
        return l;
      })
    );
  };

  // Update layer opacity
  const updateOpacity = (layerId: string, opacity: number) => {
    setLayers((prev) =>
      prev.map((l) => {
        if (l.id === layerId) {
          const overlay = overlays.get(layerId);
          if (overlay) overlay.setOpacity(opacity);
          return { ...l, opacity };
        }
        return l;
      })
    );
  };

  if (!sigConfig || !sigConfig.enabled || sigConfig.provider === "none" || layers.length === 0) {
    return null;
  }

  return (
    <div className="absolute top-3 right-3 z-10 bg-white dark:bg-gray-900 rounded-lg shadow-lg border max-w-[260px]">
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-2 w-full px-3 py-2 text-sm font-medium hover:bg-muted/50 rounded-t-lg"
      >
        <Layers className="h-4 w-4 text-indigo-500" />
        <span className="flex-1 text-left">Couches SIG</span>
        <Badge variant="secondary" className="text-xs">
          {layers.filter((l) => l.visible).length}/{layers.length}
        </Badge>
        {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
      </button>

      {/* Layer list */}
      {expanded && (
        <div className="px-3 pb-3 space-y-3 border-t pt-2">
          {layers.map((layer) => (
            <div key={layer.id} className="space-y-1">
              <div className="flex items-center gap-2">
                <Switch
                  checked={layer.visible}
                  onCheckedChange={() => toggleLayer(layer.id)}
                  className="scale-75"
                />
                <Label className="text-xs flex-1 cursor-pointer" onClick={() => toggleLayer(layer.id)}>
                  {layer.name}
                </Label>
                {layer.visible ? (
                  <Eye className="h-3 w-3 text-green-500" />
                ) : (
                  <EyeOff className="h-3 w-3 text-gray-400" />
                )}
              </div>
              {layer.visible && (
                <div className="flex items-center gap-2 pl-7">
                  <span className="text-[10px] text-muted-foreground w-8">
                    {Math.round(layer.opacity * 100)}%
                  </span>
                  <Slider
                    value={[layer.opacity]}
                    onValueChange={([v]) => updateOpacity(layer.id, v)}
                    min={0.1}
                    max={1}
                    step={0.1}
                    className="flex-1"
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
