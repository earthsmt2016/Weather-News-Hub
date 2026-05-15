import type { WeatherForecast } from "@shared/schema";
import { WeatherIcon } from "./weather-icon";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  getWeatherIcon,
  getWeatherDescription,
  getWeatherGradient,
  formatDate,
  formatTime,
} from "@/lib/weather-utils";
import {
  Droplets,
  Wind,
  Thermometer,
  Eye,
  MapPin,
  Sun,
  Sunrise,
} from "lucide-react";
import { MUTED_LABEL } from "@/lib/styles";

const STAT_CLASSES = {
  icon:  "w-4 h-4 text-muted-foreground",
  label: MUTED_LABEL,
  value: "text-sm font-medium",
} as const;

const CURRENT_WEATHER_CLASSES = {
  inner:       "flex flex-col gap-4",
  locationRow: "flex items-center gap-2 flex-wrap",
  location:    "text-sm text-muted-foreground",
  mainRow:     "flex items-center gap-6 flex-wrap",
  iconGroup:   "flex items-center gap-4",
  iconBg:      "p-3 rounded-md bg-background/50",
  mainIcon:    "w-12 h-12 text-foreground",
  tempRow:     "flex items-baseline gap-1",
  tempNumber:  "text-5xl font-light tracking-tight",
  tempUnit:    "text-2xl text-muted-foreground",
  description: "text-sm text-muted-foreground mt-1",
  statsGrid:   "grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-3 ml-auto",
  statRow:     "flex items-center gap-2",
} as const;

interface CurrentWeatherProps {
  forecast: WeatherForecast;
}

export function CurrentWeather({ forecast }: CurrentWeatherProps) {
  const { current } = forecast;
  const today = forecast.daily[0];
  const iconName = getWeatherIcon(current.weatherCode, current.isDay);
  const description = getWeatherDescription(current.weatherCode);
  const gradient = getWeatherGradient(current.weatherCode, current.isDay);

  return (
    <Card className={`relative overflow-visible p-6 bg-gradient-to-br ${gradient}`} data-testid="card-current-weather">
      <div className={CURRENT_WEATHER_CLASSES.inner}>
        <div className={CURRENT_WEATHER_CLASSES.locationRow}>
          <MapPin className={STAT_CLASSES.icon} />
          <span className={CURRENT_WEATHER_CLASSES.location} data-testid="text-location">
            {forecast.location}
          </span>
          <Badge variant="secondary" className="ml-auto" data-testid="badge-date">
            {formatDate(current.time)}
          </Badge>
        </div>

        <div className={CURRENT_WEATHER_CLASSES.mainRow}>
          <div className={CURRENT_WEATHER_CLASSES.iconGroup}>
            <div className={CURRENT_WEATHER_CLASSES.iconBg} data-testid="icon-weather-main">
              <WeatherIcon iconName={iconName} className={CURRENT_WEATHER_CLASSES.mainIcon} />
            </div>
            <div>
              <div className={CURRENT_WEATHER_CLASSES.tempRow} data-testid="text-current-temp">
                <span className={CURRENT_WEATHER_CLASSES.tempNumber}>
                  {Math.round(current.temperature)}
                </span>
                <span className={CURRENT_WEATHER_CLASSES.tempUnit}>°C</span>
              </div>
              <p className={CURRENT_WEATHER_CLASSES.description} data-testid="text-weather-description">
                {description}
              </p>
            </div>
          </div>

          <div className={CURRENT_WEATHER_CLASSES.statsGrid}>
            <div className={CURRENT_WEATHER_CLASSES.statRow}>
              <Thermometer className={STAT_CLASSES.icon} />
              <div>
                <p className={STAT_CLASSES.label}>Feels like</p>
                <p className={STAT_CLASSES.value} data-testid="text-feels-like">
                  {Math.round(current.feelsLike)}°C
                </p>
              </div>
            </div>
            <div className={CURRENT_WEATHER_CLASSES.statRow}>
              <Droplets className={STAT_CLASSES.icon} />
              <div>
                <p className={STAT_CLASSES.label}>Humidity</p>
                <p className={STAT_CLASSES.value} data-testid="text-humidity">
                  {current.humidity}%
                </p>
              </div>
            </div>
            <div className={CURRENT_WEATHER_CLASSES.statRow}>
              <Wind className={STAT_CLASSES.icon} />
              <div>
                <p className={STAT_CLASSES.label}>Wind</p>
                <p className={STAT_CLASSES.value} data-testid="text-wind">
                  {Math.round(current.windSpeed)} km/h
                </p>
              </div>
            </div>
            <div className={CURRENT_WEATHER_CLASSES.statRow}>
              <Eye className={STAT_CLASSES.icon} />
              <div>
                <p className={STAT_CLASSES.label}>Cloud cover</p>
                <p className={STAT_CLASSES.value} data-testid="text-cloud-cover">
                  {current.cloudCover}%
                </p>
              </div>
            </div>
            <div className={CURRENT_WEATHER_CLASSES.statRow}>
              <Sun className={STAT_CLASSES.icon} />
              <div>
                <p className={STAT_CLASSES.label}>UV Index</p>
                <p className={STAT_CLASSES.value} data-testid="text-uv-index">
                  {current.uvIndex}
                </p>
              </div>
            </div>
            {today && (
              <div className={CURRENT_WEATHER_CLASSES.statRow}>
                <Sunrise className={STAT_CLASSES.icon} />
                <div>
                  <p className={STAT_CLASSES.label}>Sun</p>
                  <p className={STAT_CLASSES.value} data-testid="text-sunrise-sunset">
                    {formatTime(today.sunrise)} / {formatTime(today.sunset)}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}
