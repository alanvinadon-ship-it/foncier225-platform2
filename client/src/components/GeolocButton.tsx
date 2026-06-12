import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { MapPin, Loader2, AlertCircle } from "lucide-react";

interface GeolocResult {
  latitude: number;
  longitude: number;
  accuracy: number;
}

interface GeolocButtonProps {
  onLocationFound: (result: GeolocResult) => void;
  className?: string;
  variant?: "default" | "outline" | "secondary" | "ghost";
  size?: "default" | "sm" | "lg" | "icon";
  label?: string;
}

export function GeolocButton({
  onLocationFound,
  className,
  variant = "outline",
  size = "default",
  label = "Localiser par GPS",
}: GeolocButtonProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGeolocate = useCallback(() => {
    if (!navigator.geolocation) {
      setError("La géolocalisation n'est pas supportée par votre navigateur.");
      return;
    }

    setLoading(true);
    setError(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const result: GeolocResult = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
        };
        onLocationFound(result);
        setLoading(false);
      },
      (err) => {
        setLoading(false);
        switch (err.code) {
          case err.PERMISSION_DENIED:
            setError("Accès à la localisation refusé. Veuillez autoriser l'accès dans les paramètres de votre navigateur.");
            break;
          case err.POSITION_UNAVAILABLE:
            setError("Position indisponible. Vérifiez que le GPS est activé.");
            break;
          case err.TIMEOUT:
            setError("Délai dépassé. Réessayez dans un endroit avec meilleure réception.");
            break;
          default:
            setError("Erreur de géolocalisation. Veuillez réessayer.");
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0,
      }
    );
  }, [onLocationFound]);

  return (
    <div className="space-y-2">
      <Button
        type="button"
        variant={variant}
        size={size}
        className={className}
        onClick={handleGeolocate}
        disabled={loading}
      >
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin mr-2" />
        ) : (
          <MapPin className="h-4 w-4 mr-2" />
        )}
        {loading ? "Localisation en cours..." : label}
      </Button>
      {error && (
        <div className="flex items-start gap-2 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}

/**
 * Mini map preview showing the located position
 * Uses Leaflet for display
 */
export function GeolocPreview({
  latitude,
  longitude,
  accuracy,
}: {
  latitude: number;
  longitude: number;
  accuracy?: number;
}) {
  return (
    <div className="rounded-lg border overflow-hidden">
      <div className="h-[200px] relative bg-muted">
        <iframe
          title="Position GPS"
          className="w-full h-full border-0"
          src={`https://www.openstreetmap.org/export/embed.html?bbox=${longitude - 0.005},${latitude - 0.005},${longitude + 0.005},${latitude + 0.005}&layer=mapnik&marker=${latitude},${longitude}`}
          loading="lazy"
        />
      </div>
      <div className="p-2 text-xs text-muted-foreground bg-muted/30 flex justify-between">
        <span>Lat: {latitude.toFixed(6)} | Lng: {longitude.toFixed(6)}</span>
        {accuracy && <span>Précision: ±{Math.round(accuracy)}m</span>}
      </div>
    </div>
  );
}
