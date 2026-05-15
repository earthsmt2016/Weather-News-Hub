import { Card } from "@/components/ui/card";
import { Map } from "lucide-react";
import { RADAR_DEFAULT_ZOOM } from "@/lib/constants";
import { SECTION_HEADING } from "@/lib/styles";

interface WeatherRadarProps {
  latitude: number;
  longitude: number;
  locationName: string;
}

export function WeatherRadar({ latitude, longitude, locationName }: WeatherRadarProps) {
  const zoom = RADAR_DEFAULT_ZOOM;
  const radarUrl = `https://embed.windy.com/embed.html?type=map&location=coordinates&metricRain=mm&metricTemp=°C&metricWind=km/h&zoom=${zoom}&overlay=radar&product=radar&level=surface&lat=${latitude}&lon=${longitude}&message=true`;

  return (
    <div data-testid="section-weather-radar">
      <h3 className={SECTION_HEADING}>
        <span className="flex items-center gap-1.5">
          <Map className="w-4 h-4" />
          Rain Radar
        </span>
      </h3>
      <Card className="overflow-hidden">
        <iframe
          src={radarUrl}
          title={`Weather radar for ${locationName}`}
          className="w-full border-0 h-[350px]"
          loading="lazy"
          data-testid="iframe-weather-radar"
        />
      </Card>
    </div>
  );
}
