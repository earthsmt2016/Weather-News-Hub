import type { AirQuality as AirQualityType } from "@shared/schema";
import { AQI_GOOD_MAX, AQI_FAIR_MAX, AQI_MODERATE_MAX, AQI_POOR_MAX } from "@/lib/constants";
import { MUTED_LABEL, SECTION_HEADING } from "@/lib/styles";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Wind } from "lucide-react";

const STAT_CLASSES = {
  label: MUTED_LABEL,
  value: "text-sm font-medium",
} as const;

const AQI_CARD_CLASSES = {
  card:      "overflow-visible p-4",
  header:    "flex items-center gap-3 mb-4 flex-wrap",
  windIcon:  "w-5 h-5 text-muted-foreground",
  valueRow:  "flex items-center gap-2",
  aqi:       "text-2xl font-light",
  badgeBase: "no-default-hover-elevate no-default-active-elevate",
  grid:      "grid grid-cols-2 sm:grid-cols-4 gap-3",
  cell:      "text-center",
} as const;

interface AirQualityProps {
  data: AirQualityType;
}

const AQI_LEVELS = [
  { maxAqi: AQI_GOOD_MAX,     label: "Good",      badgeClass: "bg-green-500/15  text-green-700  dark:text-green-400"  },
  { maxAqi: AQI_FAIR_MAX,     label: "Fair",      badgeClass: "bg-yellow-500/15 text-yellow-700 dark:text-yellow-400" },
  { maxAqi: AQI_MODERATE_MAX, label: "Moderate",  badgeClass: "bg-orange-500/15 text-orange-700 dark:text-orange-400" },
  { maxAqi: AQI_POOR_MAX,     label: "Poor",      badgeClass: "bg-red-500/15    text-red-700    dark:text-red-400"    },
  { maxAqi: Infinity,         label: "Very Poor", badgeClass: "bg-purple-500/15 text-purple-700 dark:text-purple-400" },
] as const;

function getAqiLevel(aqi: number) {
  return AQI_LEVELS.find((level) => aqi <= level.maxAqi) ?? AQI_LEVELS[AQI_LEVELS.length - 1];
}

export function AirQualityCard({ data }: AirQualityProps) {
  const { label, badgeClass } = getAqiLevel(data.europeanAqi);

  return (
    <div data-testid="section-air-quality">
      <h3 className={SECTION_HEADING}>Air Quality</h3>
      <Card className={AQI_CARD_CLASSES.card}>
        <div className={AQI_CARD_CLASSES.header}>
          <Wind className={AQI_CARD_CLASSES.windIcon} />
          <div className={AQI_CARD_CLASSES.valueRow}>
            <span className={AQI_CARD_CLASSES.aqi} data-testid="text-aqi-value">{data.europeanAqi}</span>
            <Badge className={`${AQI_CARD_CLASSES.badgeBase} ${badgeClass}`} data-testid="badge-aqi-label">
              {label}
            </Badge>
          </div>
          <span className={`${STAT_CLASSES.label} ml-auto`}>European AQI</span>
        </div>
        <div className={AQI_CARD_CLASSES.grid}>
          <div className={AQI_CARD_CLASSES.cell}>
            <p className={STAT_CLASSES.label}>PM2.5</p>
            <p className={STAT_CLASSES.value} data-testid="text-pm25">{data.pm25.toFixed(1)} µg/m³</p>
          </div>
          <div className={AQI_CARD_CLASSES.cell}>
            <p className={STAT_CLASSES.label}>PM10</p>
            <p className={STAT_CLASSES.value} data-testid="text-pm10">{data.pm10.toFixed(1)} µg/m³</p>
          </div>
          <div className={AQI_CARD_CLASSES.cell}>
            <p className={STAT_CLASSES.label}>NO₂</p>
            <p className={STAT_CLASSES.value} data-testid="text-no2">{data.nitrogenDioxide.toFixed(1)} µg/m³</p>
          </div>
          <div className={AQI_CARD_CLASSES.cell}>
            <p className={STAT_CLASSES.label}>Ozone</p>
            <p className={STAT_CLASSES.value} data-testid="text-ozone">{data.ozone.toFixed(1)} µg/m³</p>
          </div>
        </div>
      </Card>
    </div>
  );
}
