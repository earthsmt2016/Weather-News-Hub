import type { WeatherCondition } from "@shared/schema";
import { WeatherIcon } from "./weather-icon";
import { Card } from "@/components/ui/card";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { getWeatherIcon, getWeatherDescription, formatTime } from "@/lib/weather-utils";
import { Droplets, Wind } from "lucide-react";
import { SECTION_HEADING } from "@/lib/styles";

const FORECAST_CARD_CLASSES = {
  card:        "p-4",
  scrollRow:   "flex gap-3 pb-2",
  item:        "flex flex-col items-center gap-2 min-w-[90px] p-3 rounded-md bg-muted/40",
  time:        "text-xs font-medium text-muted-foreground",
  icon:        "w-7 h-7 text-foreground",
  temp:        "text-lg font-medium",
  desc:        "text-[10px] text-muted-foreground text-center leading-tight",
  statRow:     "flex items-center gap-1",
  statIcon:    "w-3 h-3 text-muted-foreground",
  statText:    "text-[10px] text-muted-foreground",
} as const;

interface ThreeHourForecastProps {
  forecast: WeatherCondition[];
}

export function ThreeHourForecast({ forecast }: ThreeHourForecastProps) {
  return (
    <Card className={FORECAST_CARD_CLASSES.card} data-testid="card-three-hour-forecast">
      <h3 className={`${SECTION_HEADING} px-1`}>
        3-Hour Forecast
      </h3>
      <ScrollArea className="w-full">
        <div className={FORECAST_CARD_CLASSES.scrollRow}>
          {forecast.map((entry, index) => {
            const iconName = getWeatherIcon(entry.weatherCode, entry.isDay);
            const description = getWeatherDescription(entry.weatherCode);
            return (
              <div
                key={index}
                className={FORECAST_CARD_CLASSES.item}
                data-testid={`forecast-3h-${index}`}
              >
                <span className={FORECAST_CARD_CLASSES.time} data-testid={`text-3h-time-${index}`}>
                  {formatTime(entry.time)}
                </span>
                <WeatherIcon iconName={iconName} className={FORECAST_CARD_CLASSES.icon} />
                <span className={FORECAST_CARD_CLASSES.temp} data-testid={`text-3h-temp-${index}`}>
                  {Math.round(entry.temperature)}°
                </span>
                <span className={FORECAST_CARD_CLASSES.desc} data-testid={`text-3h-desc-${index}`}>
                  {description}
                </span>
                <div className={`${FORECAST_CARD_CLASSES.statRow} mt-1`}>
                  <Droplets className={FORECAST_CARD_CLASSES.statIcon} />
                  <span className={FORECAST_CARD_CLASSES.statText} data-testid={`text-3h-humidity-${index}`}>
                    {entry.humidity}%
                  </span>
                </div>
                <div className={FORECAST_CARD_CLASSES.statRow}>
                  <Wind className={FORECAST_CARD_CLASSES.statIcon} />
                  <span className={FORECAST_CARD_CLASSES.statText} data-testid={`text-3h-wind-${index}`}>
                    {Math.round(entry.windSpeed)}km/h
                  </span>
                </div>
              </div>
            );
          })}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </Card>
  );
}
