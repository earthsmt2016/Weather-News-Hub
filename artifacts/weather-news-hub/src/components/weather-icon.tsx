import {
  Sun,
  Moon,
  Cloud,
  CloudDrizzle,
  CloudRain,
  CloudRainWind,
  CloudLightning,
  CloudFog,
  CloudHail,
  CloudSun,
  CloudMoon,
  Snowflake,
  SunDim,
} from "lucide-react";

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  sun: Sun,
  "sun-dim": SunDim,
  moon: Moon,
  "cloud-sun": CloudSun,
  "cloud-moon": CloudMoon,
  cloud: Cloud,
  "cloud-drizzle": CloudDrizzle,
  "cloud-rain": CloudRain,
  "cloud-rain-wind": CloudRainWind,
  "cloud-lightning": CloudLightning,
  "cloud-fog": CloudFog,
  "cloud-hail": CloudHail,
  snowflake: Snowflake,
};

interface WeatherIconProps {
  iconName: string;
  className?: string;
}

export function WeatherIcon({ iconName, className = "w-6 h-6" }: WeatherIconProps) {
  const IconComponent = iconMap[iconName] || Cloud;
  return <IconComponent className={className} />;
}
