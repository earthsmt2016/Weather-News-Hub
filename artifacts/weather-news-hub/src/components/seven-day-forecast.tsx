import { useState } from "react";
import type { DailyForecast, WeatherCondition } from "@shared/schema";
import { WeatherIcon } from "./weather-icon";
import { Card } from "@/components/ui/card";
import { getWeatherIcon, getWeatherDescription, formatTime } from "@/lib/weather-utils";
import { Droplets, Wind, ArrowUp, ArrowDown, Sun, Sunrise, ChevronDown, ChevronUp } from "lucide-react";
import { DATE_MIDDAY_SUFFIX, WEATHER_IS_DAY } from "@/lib/constants";
import { MUTED_LABEL, SECTION_HEADING } from "@/lib/styles";

const STAT_CLASSES = {
  icon:  "w-3 h-3 text-muted-foreground",
  label: MUTED_LABEL,
} as const;

const STRIP_CLASSES = {
  scroll:   "overflow-x-auto pb-1 -mx-1 px-1",
  inner:    "flex gap-2 min-w-max py-2",
  card:     "flex flex-col items-center gap-1 rounded-lg bg-muted/50 px-2.5 py-2 min-w-[52px]",
  time:     "text-[10px] text-muted-foreground font-medium",
  icon:     "w-5 h-5 text-foreground",
  temp:     "text-xs font-semibold",
  statRow:  "flex items-center gap-0.5",
  rainIcon: "w-2.5 h-2.5 text-blue-400",
  windIcon: "w-2.5 h-2.5 text-muted-foreground",
  statText: "text-[10px] text-muted-foreground",
} as const;

const FORECAST_7_CLASSES = {
  card:         "overflow-visible divide-y divide-border",
  rowBase:      "w-full flex items-center gap-3 px-4 py-3 flex-wrap text-left transition-colors",
  rowExpandable: "hover:bg-muted/40 cursor-pointer",
  rowStatic:    "cursor-default",
  rowExpanded:  "bg-muted/30",
  dayCol:       "w-20 shrink-0",
  dayName:      "text-sm font-medium",
  iconWrap:     "shrink-0",
  dayIcon:      "w-8 h-8 text-foreground",
  description:  "text-sm text-muted-foreground w-28 shrink-0 hidden sm:block",
  stats:        "flex items-center gap-3 ml-auto flex-wrap",
  statItem:     "flex items-center gap-1",
  highTemp:     "text-sm font-medium",
  lowTemp:      "text-sm text-muted-foreground",
  precipItem:   "flex items-center gap-1 w-12",
  windItem:     "hidden sm:flex items-center gap-1 w-16",
  uvItem:       "hidden md:flex items-center gap-1",
  sunriseItem:  "hidden lg:flex items-center gap-1",
  chevronWrap:  "ml-1 text-muted-foreground",
  chevronIcon:  "w-4 h-4",
  expandedPanel: "px-4 pb-3 border-t border-border/50 bg-muted/20",
} as const;

interface SevenDayForecastProps {
  daily: DailyForecast[];
  hourly?: WeatherCondition[];
}

function formatDayName(dateStr: string, index: number): string {
  if (index === 0) return "Today";
  if (index === 1) return "Tomorrow";
  const date = new Date(dateStr + DATE_MIDDAY_SUFFIX);
  return date.toLocaleDateString("en-GB", { weekday: "short" });
}

function formatDayDate(dateStr: string): string {
  const date = new Date(dateStr + DATE_MIDDAY_SUFFIX);
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

function getHoursForDay(hourly: WeatherCondition[], dateStr: string): WeatherCondition[] {
  return hourly.filter(h => h.time.startsWith(dateStr));
}

function HourlyDayStrip({ hours }: { hours: WeatherCondition[] }) {
  if (hours.length === 0) return null;
  return (
    <div className={STRIP_CLASSES.scroll} data-testid="hourly-day-strip">
      <div className={STRIP_CLASSES.inner}>
        {hours.map((h, i) => {
          const iconName = getWeatherIcon(h.weatherCode, h.isDay);
          return (
            <div
              key={h.time}
              className={STRIP_CLASSES.card}
              data-testid={`hourly-strip-card-${i}`}
            >
              <span className={STRIP_CLASSES.time}>{formatTime(h.time)}</span>
              <WeatherIcon iconName={iconName} className={STRIP_CLASSES.icon} />
              <span className={STRIP_CLASSES.temp}>{Math.round(h.temperature)}°</span>
              <div className={STRIP_CLASSES.statRow}>
                <Droplets className={STRIP_CLASSES.rainIcon} />
                <span className={STRIP_CLASSES.statText}>{h.precipitation > 0 ? `${h.precipitation}%` : "—"}</span>
              </div>
              <div className={STRIP_CLASSES.statRow}>
                <Wind className={STRIP_CLASSES.windIcon} />
                <span className={STRIP_CLASSES.statText}>{Math.round(h.windSpeed)}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function SevenDayForecast({ daily, hourly }: SevenDayForecastProps) {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
  const hasHourly = !!hourly && hourly.length > 0;

  return (
    <div data-testid="section-seven-day-forecast">
      <h3 className={SECTION_HEADING}>7-Day Forecast</h3>
      <Card className={FORECAST_7_CLASSES.card}>
        {daily.map((day, index) => {
          const iconName = getWeatherIcon(day.weatherCode, WEATHER_IS_DAY);
          const description = getWeatherDescription(day.weatherCode);
          const isExpanded = expandedIndex === index;
          const dayHours = hasHourly ? getHoursForDay(hourly!, day.date) : [];
          const canExpand = hasHourly && dayHours.length > 0;

          return (
            <div key={day.date} data-testid={`row-daily-forecast-${index}`}>
              <button
                className={`${FORECAST_7_CLASSES.rowBase} ${canExpand ? FORECAST_7_CLASSES.rowExpandable : FORECAST_7_CLASSES.rowStatic} ${isExpanded ? FORECAST_7_CLASSES.rowExpanded : ""}`}
                onClick={() => canExpand && setExpandedIndex(isExpanded ? null : index)}
                data-testid={`button-expand-day-${index}`}
                aria-expanded={isExpanded}
              >
                <div className={FORECAST_7_CLASSES.dayCol}>
                  <p className={FORECAST_7_CLASSES.dayName}>{formatDayName(day.date, index)}</p>
                  <p className={STAT_CLASSES.label}>{formatDayDate(day.date)}</p>
                </div>

                <div className={FORECAST_7_CLASSES.iconWrap} data-testid={`icon-daily-weather-${index}`}>
                  <WeatherIcon iconName={iconName} className={FORECAST_7_CLASSES.dayIcon} />
                </div>

                <p className={FORECAST_7_CLASSES.description} data-testid={`text-daily-description-${index}`}>
                  {description}
                </p>

                <div className={FORECAST_7_CLASSES.stats}>
                  <div className={FORECAST_7_CLASSES.statItem} data-testid={`text-daily-high-${index}`}>
                    <ArrowUp className={STAT_CLASSES.icon} />
                    <span className={FORECAST_7_CLASSES.highTemp}>{Math.round(day.temperatureMax)}°</span>
                  </div>
                  <div className={FORECAST_7_CLASSES.statItem} data-testid={`text-daily-low-${index}`}>
                    <ArrowDown className={STAT_CLASSES.icon} />
                    <span className={FORECAST_7_CLASSES.lowTemp}>{Math.round(day.temperatureMin)}°</span>
                  </div>
                  <div className={FORECAST_7_CLASSES.precipItem} data-testid={`text-daily-precip-${index}`}>
                    <Droplets className={STAT_CLASSES.icon} />
                    <span className={STAT_CLASSES.label}>{day.precipitationProbabilityMax}%</span>
                  </div>
                  <div className={FORECAST_7_CLASSES.windItem} data-testid={`text-daily-wind-${index}`}>
                    <Wind className={STAT_CLASSES.icon} />
                    <span className={STAT_CLASSES.label}>{Math.round(day.windSpeedMax)} km/h</span>
                  </div>
                  <div className={FORECAST_7_CLASSES.uvItem} data-testid={`text-daily-uv-${index}`}>
                    <Sun className={STAT_CLASSES.icon} />
                    <span className={STAT_CLASSES.label}>UV {day.uvIndexMax}</span>
                  </div>
                  <div className={FORECAST_7_CLASSES.sunriseItem} data-testid={`text-daily-sunrise-${index}`}>
                    <Sunrise className={STAT_CLASSES.icon} />
                    <span className={STAT_CLASSES.label}>{formatTime(day.sunrise)}/{formatTime(day.sunset)}</span>
                  </div>
                  {canExpand && (
                    <div className={FORECAST_7_CLASSES.chevronWrap}>
                      {isExpanded
                        ? <ChevronUp className={FORECAST_7_CLASSES.chevronIcon} />
                        : <ChevronDown className={FORECAST_7_CLASSES.chevronIcon} />
                      }
                    </div>
                  )}
                </div>
              </button>

              {isExpanded && dayHours.length > 0 && (
                <div className={FORECAST_7_CLASSES.expandedPanel}>
                  <HourlyDayStrip hours={dayHours} />
                </div>
              )}
            </div>
          );
        })}
      </Card>
    </div>
  );
}
