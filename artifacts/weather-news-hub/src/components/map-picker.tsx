import { useState, useCallback, useEffect, useRef } from "react";
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from "react-leaflet";
import L from "leaflet";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MapPin, Loader2, X } from "lucide-react";
import "leaflet/dist/leaflet.css";

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

interface MapPickerProps {
  currentLat: number;
  currentLon: number;
  onLocationSelect: (location: {
    name: string;
    lat: number;
    lon: number;
    region: string;
    country: string;
  }) => void;
  isOpen: boolean;
  onClose: () => void;
}

const MAP_CLASSES = {
  header:      "p-3 flex items-center justify-between gap-2 border-b flex-wrap",
  headerLeft:  "flex items-center gap-2",
  headerIcon:  "w-4 h-4 text-muted-foreground",
  headerText:  "text-sm font-medium",
  mapWrap:     "h-[350px] sm:h-[400px] relative",
  map:         "h-full w-full z-0 rounded-b-card",
  footer:      "p-3 border-t flex items-center justify-between gap-3 flex-wrap",
  footerLeft:  "flex items-center gap-2 min-w-0",
  spinner:     "w-4 h-4 animate-spin text-muted-foreground shrink-0",
  pinIcon:     "w-4 h-4 text-muted-foreground shrink-0",
  previewText: "text-sm truncate",
} as const;

function MapClickHandler({ onMapClick }: { onMapClick: (lat: number, lon: number) => void }) {
  useMapEvents({
    click(e) {
      onMapClick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

function MapCenterUpdater({ lat, lon }: { lat: number; lon: number }) {
  const map = useMap();
  const prevRef = useRef({ lat, lon });
  useEffect(() => {
    if (prevRef.current.lat !== lat || prevRef.current.lon !== lon) {
      map.setView([lat, lon], map.getZoom());
      prevRef.current = { lat, lon };
    }
  }, [lat, lon, map]);
  return null;
}

export function MapPicker({ currentLat, currentLon, onLocationSelect, isOpen, onClose }: MapPickerProps) {
  const [markerPos, setMarkerPos] = useState<{ lat: number; lon: number } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [previewName, setPreviewName] = useState<string>("");
  const [previewData, setPreviewData] = useState<{ name: string; region: string; country: string } | null>(null);

  const handleMapClick = useCallback(async (lat: number, lon: number) => {
    const roundedLat = Math.round(lat * 10000) / 10000;
    const roundedLon = Math.round(lon * 10000) / 10000;
    setMarkerPos({ lat: roundedLat, lon: roundedLon });
    setIsLoading(true);
    setPreviewName("Looking up location...");
    setPreviewData(null);

    try {
      const res = await fetch(`/api/reverse-geocode?lat=${roundedLat}&lon=${roundedLon}`);
      if (res.ok) {
        const data = await res.json();
        setPreviewName(data.name);
        setPreviewData({ name: data.name, region: data.region, country: data.country });
      } else {
        setPreviewName("Unknown location");
      }
    } catch {
      setPreviewName("Failed to look up location");
    }
    setIsLoading(false);
  }, []);

  const handleConfirm = () => {
    if (markerPos && previewData) {
      onLocationSelect({
        name: previewData.name,
        lat: markerPos.lat,
        lon: markerPos.lon,
        region: previewData.region,
        country: previewData.country,
      });
      setMarkerPos(null);
      setPreviewName("");
      setPreviewData(null);
      onClose();
    }
  };

  const handleClose = () => {
    setMarkerPos(null);
    setPreviewName("");
    setPreviewData(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <Card className="overflow-visible" data-testid="map-picker">
      <div className={MAP_CLASSES.header}>
        <div className={MAP_CLASSES.headerLeft}>
          <MapPin className={MAP_CLASSES.headerIcon} />
          <span className={MAP_CLASSES.headerText}>Click the map to pick a location</span>
        </div>
        <Button size="icon" variant="ghost" onClick={handleClose} data-testid="button-close-map">
          <X className={MAP_CLASSES.headerIcon} />
        </Button>
      </div>
      <div className={MAP_CLASSES.mapWrap} data-testid="map-container">
        <MapContainer
          center={[currentLat, currentLon]}
          zoom={5}
          className={MAP_CLASSES.map}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <MapClickHandler onMapClick={handleMapClick} />
          <MapCenterUpdater lat={currentLat} lon={currentLon} />
          {markerPos && <Marker position={[markerPos.lat, markerPos.lon]} />}
        </MapContainer>
      </div>
      {markerPos && (
        <div className={MAP_CLASSES.footer}>
          <div className={MAP_CLASSES.footerLeft}>
            {isLoading ? (
              <Loader2 className={MAP_CLASSES.spinner} />
            ) : (
              <MapPin className={MAP_CLASSES.pinIcon} />
            )}
            <span className={MAP_CLASSES.previewText} data-testid="text-map-preview">{previewName}</span>
          </div>
          <Button
            size="sm"
            onClick={handleConfirm}
            disabled={isLoading || !previewData}
            data-testid="button-confirm-map-location"
          >
            Select this location
          </Button>
        </div>
      )}
    </Card>
  );
}
