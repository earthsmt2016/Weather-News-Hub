import { useState } from "react";
import type { WeatherCondition } from "@shared/schema";
import { WeatherIcon } from "./weather-icon";
import { Card } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import {
  getWeatherIcon,
  getWeatherDescription,
  formatTime,
} from "@/lib/weather-utils";
import { Droplets, Wind, Thermometer, Cloud, Clock } from "lucide-react";
import { MUTED_LABEL } from "@/lib/styles";

const STAT_CLASSES = {
  icon:  "w-3 h-3 text-muted-foreground",
  label: MUTED_LABEL,
} as const;

const HOURLY_CLASSES = {
  card:       "p-4",
  header:     "flex items-center justify-between gap-2 mb-4 flex-wrap",
  heading:    "text-sm font-medium text-muted-foreground",
  badgeRow:   "flex items-center gap-2",
  clockIcon:  "w-3.5 h-3.5 text-muted-foreground",
  slider:     "px-1 mb-5",
  sliderEnds: "flex justify-between mt-1.5",
  sliderText: "text-[10px] text-muted-foreground",
  grid:       "grid gap-2",
  entry:      "flex items-center gap-4 p-3 rounded-md bg-muted/30 flex-wrap",
  time:       "text-sm font-medium w-12 text-muted-foreground",
  entryIcon:  "w-6 h-6 text-foreground",
  temp:       "text-sm font-medium w-10",
  statsRow:   "flex items-center gap-4 ml-auto flex-wrap",
  statItem:   "flex items-center gap-1",
} as const;

interface HourlyBreakdownProps {
  hourly: WeatherCondition[];
}

export function HourlyBreakdown({ hourly }: HourlyBreakdownProps) {
  const now = new Date();
  const currentHourIndex = hourly.findIndex((h) => {
    const hDate = new Date(h.time);
    return hDate.getHours() >= now.getHours();
  });
  const startIdx = Math.max(0, currentHourIndex);

  const [range, setRange] = useState<number[]>([
    startIdx,
    Math.min(startIdx + 6, hourly.length - 1),
  ]);

  const selectedHours = hourly.slice(range[0], range[1] + 1);

  const getTimeLabel = (index: number) => {
    if (index >= 0 && index < hourly.length) {
      return formatTime(hourly[index].time);
    }
    return "";
  };

  return (
    <Card className={HOURLY_CLASSES.card} data-testid="card-hourly-breakdown">
      <div className={HOURLY_CLASSES.header}>
        <h3 className={HOURLY_CLASSES.heading}>
          Custom Hourly Breakdown
        </h3>
        <div className={HOURLY_CLASSES.badgeRow}>
          <Clock className={HOURLY_CLASSES.clockIcon} />
          <Badge variant="outline" data-testid="badge-time-range">
            {getTimeLabel(range[0])} — {getTimeLabel(range[1])}
          </Badge>
        </div>
      </div>

      <div className={HOURLY_CLASSES.slider}>
        <Slider
          min={0}
          max={hourly.length - 1}
          step={1}
          value={range}
          onValueChange={setRange}
          data-testid="slider-hour-range"
        />
        <div className={HOURLY_CLASSES.sliderEnds}>
          <span className={HOURLY_CLASSES.sliderText} data-testid="text-slider-start">
            {getTimeLabel(0)}
          </span>
          <span className={HOURLY_CLASSES.sliderText} data-testid="text-slider-end">
            {getTimeLabel(hourly.length - 1)}
          </span>
        </div>
      </div>

      <div className={HOURLY_CLASSES.grid}>
        {selectedHours.map((entry, index) => {
          const iconName = getWeatherIcon(entry.weatherCode, entry.isDay);
          const description = getWeatherDescription(entry.weatherCode);
          return (
            <div
              key={index}
              className={HOURLY_CLASSES.entry}
              data-testid={`hourly-entry-${index}`}
            >
              <span className={HOURLY_CLASSES.time} data-testid={`text-hourly-time-${index}`}>
                {formatTime(entry.time)}
              </span>
              <WeatherIcon iconName={iconName} className={HOURLY_CLASSES.entryIcon} />
              <span className={HOURLY_CLASSES.temp} data-testid={`text-hourly-temp-${index}`}>
                {Math.round(entry.temperature)}°C
              </span>
              <span className={`${STAT_CLASSES.label} flex-1 min-w-[80px]`} data-testid={`text-hourly-desc-${index}`}>
                {description}
              </span>
              <div className={HOURLY_CLASSES.statsRow}>
                <div className={HOURLY_CLASSES.statItem}>
                  <Thermometer className={STAT_CLASSES.icon} />
                  <span className={STAT_CLASSES.label} data-testid={`text-hourly-feels-${index}`}>
                    {Math.round(entry.feelsLike)}°
                  </span>
                </div>
                <div className={HOURLY_CLASSES.statItem}>
                  <Droplets className={STAT_CLASSES.icon} />
                  <span className={STAT_CLASSES.label} data-testid={`text-hourly-humidity-${index}`}>
                    {entry.humidity}%
                  </span>
                </div>
                <div className={HOURLY_CLASSES.statItem}>
                  <Wind className={STAT_CLASSES.icon} />
                  <span className={STAT_CLASSES.label} data-testid={`text-hourly-wind-${index}`}>
                    {Math.round(entry.windSpeed)}km/h
                  </span>
                </div>
                <div className={HOURLY_CLASSES.statItem}>
                  <Cloud className={STAT_CLASSES.icon} />
                  <span className={STAT_CLASSES.label} data-testid={`text-hourly-cloud-${index}`}>
                    {entry.cloudCover}%
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
