import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

interface Parcel {
  id: number;
  reference?: string;
  name?: string;
  latitude?: string;
  longitude?: string;
  localisation?: string | null;
  region?: string;
  status?: string;
  statusPublic?: string;
  landType?: string;
}

interface ParcelMapProps {
  parcels: Parcel[];
  height?: string;
  className?: string;
}

// Fix default marker icons for Leaflet in bundled environments
const defaultIcon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const greenIcon = L.icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const orangeIcon = L.icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-orange.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

export default function ParcelMap({ parcels, height = "400px", className = "" }: ParcelMapProps) {
  const mapRef = useRef<L.Map | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // Destroy previous map instance
    if (mapRef.current) {
      mapRef.current.remove();
      mapRef.current = null;
    }

    // Default center: Côte d'Ivoire (Yamoussoukro)
    const defaultCenter: [number, number] = [6.8276, -5.2893];
    const defaultZoom = 7;

    const map = L.map(containerRef.current).setView(defaultCenter, defaultZoom);
    mapRef.current = map;

    // Add OpenStreetMap tiles
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(map);

    // Add markers for each parcel
    const validParcels = parcels.filter(p => {
      if (!p.latitude || !p.longitude) return false;
      const lat = parseFloat(p.latitude);
      const lng = parseFloat(p.longitude);
      return !isNaN(lat) && !isNaN(lng) && lat !== 0 && lng !== 0;
    });

    if (validParcels.length > 0) {
      const bounds = L.latLngBounds([]);

      validParcels.forEach((parcel) => {
        const lat = parseFloat(parcel.latitude!);
        const lng = parseFloat(parcel.longitude!);
        const latlng = L.latLng(lat, lng);
        bounds.extend(latlng);

        const icon = parcel.statusPublic === "valide" ? greenIcon :
          parcel.statusPublic === "dossier_en_cours" ? orangeIcon : defaultIcon;

        const displayName = parcel.name || parcel.reference || `Parcelle #${parcel.id}`;
        const location = parcel.localisation || parcel.region || "";

        const marker = L.marker(latlng, { icon }).addTo(map);
        marker.bindPopup(`
          <div style="min-width:150px;">
            <strong>${displayName}</strong><br/>
            ${location ? `<span style="color:#666;">📍 ${location}</span><br/>` : ""}
            ${parcel.landType ? `<span style="font-size:11px;color:#555;">${parcel.landType === "URBAN" ? "🏢 Urbain" : "🌳 Rural"}</span><br/>` : ""}
            <span style="font-size:11px;color:#888;">Lat: ${lat.toFixed(5)}, Lng: ${lng.toFixed(5)}</span>
          </div>
        `);
      });

      // Fit map to show all markers
      if (bounds.isValid()) {
        map.fitBounds(bounds, { padding: [30, 30], maxZoom: 14 });
      }
    }

    // Cleanup
    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [parcels]);

  return (
    <div
      ref={containerRef}
      style={{ height, width: "100%" }}
      className={`rounded-lg border ${className}`}
    />
  );
}
