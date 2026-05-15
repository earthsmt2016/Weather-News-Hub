export function getWeatherIcon(code: number, isDay: number): string {
  const day = isDay === 1;
  const icons: Record<number, string> = {
    0: day ? "sun" : "moon",
    1: day ? "sun-dim" : "moon",
    2: day ? "cloud-sun" : "cloud-moon",
    3: "cloud",
    45: "cloud-fog",
    48: "cloud-fog",
    51: "cloud-drizzle",
    53: "cloud-drizzle",
    55: "cloud-drizzle",
    56: "cloud-hail",
    57: "cloud-hail",
    61: "cloud-rain",
    63: "cloud-rain",
    65: "cloud-rain-wind",
    66: "cloud-hail",
    67: "cloud-hail",
    71: "snowflake",
    73: "snowflake",
    75: "snowflake",
    77: "snowflake",
    80: "cloud-rain",
    81: "cloud-rain",
    82: "cloud-rain-wind",
    85: "snowflake",
    86: "snowflake",
    95: "cloud-lightning",
    96: "cloud-lightning",
    99: "cloud-lightning",
  };
  return icons[code] || "cloud";
}

export function getWeatherDescription(code: number): string {
  const descriptions: Record<number, string> = {
    0: "Clear sky",
    1: "Mainly clear",
    2: "Partly cloudy",
    3: "Overcast",
    45: "Fog",
    48: "Depositing rime fog",
    51: "Light drizzle",
    53: "Moderate drizzle",
    55: "Dense drizzle",
    56: "Light freezing drizzle",
    57: "Dense freezing drizzle",
    61: "Slight rain",
    63: "Moderate rain",
    65: "Heavy rain",
    66: "Light freezing rain",
    67: "Heavy freezing rain",
    71: "Slight snow",
    73: "Moderate snow",
    75: "Heavy snow",
    77: "Snow grains",
    80: "Slight rain showers",
    81: "Moderate rain showers",
    82: "Violent rain showers",
    85: "Slight snow showers",
    86: "Heavy snow showers",
    95: "Thunderstorm",
    96: "Thunderstorm with slight hail",
    99: "Thunderstorm with heavy hail",
  };
  return descriptions[code] || "Unknown";
}

const WEATHER_GRADIENTS = {
  clearDay:     "from-amber-400/20 to-sky-400/20",
  clearNight:   "from-indigo-900/20 to-slate-800/20",
  cloudyDay:    "from-slate-300/20 to-sky-300/20",
  cloudyNight:  "from-slate-700/20 to-indigo-800/20",
  rain:         "from-slate-400/20 to-blue-400/20",
  snow:         "from-slate-200/20 to-blue-200/20",
  storm:        "from-slate-600/20 to-purple-600/20",
  default:      "from-slate-300/20 to-slate-400/20",
} as const;

export function getWeatherGradient(code: number, isDay: number): string {
  const day = isDay === 1;
  if (code === 0 || code === 1) return day ? WEATHER_GRADIENTS.clearDay   : WEATHER_GRADIENTS.clearNight;
  if (code === 2 || code === 3) return day ? WEATHER_GRADIENTS.cloudyDay  : WEATHER_GRADIENTS.cloudyNight;
  if (code >= 51 && code <= 67) return WEATHER_GRADIENTS.rain;
  if (code >= 71 && code <= 86) return WEATHER_GRADIENTS.snow;
  if (code >= 95)               return WEATHER_GRADIENTS.storm;
  return WEATHER_GRADIENTS.default;
}

export function formatTime(timeStr: string): string {
  const date = new Date(timeStr);
  return date.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

export function formatDate(timeStr: string): string {
  const date = new Date(timeStr);
  return date.toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export interface WeatherAlert {
  severity: "warning" | "danger";
  type: string;
  message: string;
  when: string;
}

const SNOW_CODES = [71, 73, 75, 77, 85, 86];
const HEAVY_RAIN_CODES = [65, 67, 82];
const THUNDERSTORM_CODES = [95, 96, 99];
const FREEZING_CODES = [56, 57, 66, 67];
const FOG_CODES = [45, 48];

export function detectWeatherAlerts(
  current: { temperature: number; windSpeed: number; weatherCode: number; uvIndex: number },
  daily: { date: string; weatherCode: number; temperatureMax: number; temperatureMin: number; windSpeedMax: number; uvIndexMax: number; precipitationProbabilityMax: number }[]
): WeatherAlert[] {
  const alerts: WeatherAlert[] = [];

  if (THUNDERSTORM_CODES.includes(current.weatherCode)) {
    alerts.push({ severity: "danger", type: "Thunderstorm", message: "Thunderstorm activity right now. Stay indoors and away from windows.", when: "Now" });
  }
  if (SNOW_CODES.includes(current.weatherCode)) {
    alerts.push({ severity: "warning", type: "Snow", message: `Snow falling now. Temperature ${Math.round(current.temperature)}°C. Take care on roads.`, when: "Now" });
  }
  if (HEAVY_RAIN_CODES.includes(current.weatherCode)) {
    alerts.push({ severity: "warning", type: "Heavy Rain", message: "Heavy rain occurring now. Possible localised flooding.", when: "Now" });
  }
  if (FREEZING_CODES.includes(current.weatherCode)) {
    alerts.push({ severity: "danger", type: "Freezing Rain", message: "Freezing rain or drizzle. Roads and surfaces may be extremely slippery.", when: "Now" });
  }
  if (FOG_CODES.includes(current.weatherCode)) {
    alerts.push({ severity: "warning", type: "Fog", message: "Foggy conditions. Reduced visibility for driving.", when: "Now" });
  }
  if (current.temperature >= 35) {
    alerts.push({ severity: "danger", type: "Extreme Heat", message: `Temperature ${Math.round(current.temperature)}°C. Stay hydrated, avoid direct sun, and check on vulnerable people.`, when: "Now" });
  } else if (current.temperature >= 30) {
    alerts.push({ severity: "warning", type: "Very Hot", message: `Temperature ${Math.round(current.temperature)}°C. Stay hydrated and limit time in direct sun.`, when: "Now" });
  }
  if (current.temperature <= -10) {
    alerts.push({ severity: "danger", type: "Extreme Cold", message: `Temperature ${Math.round(current.temperature)}°C. Risk of hypothermia and ice. Keep warm and limit outdoor exposure.`, when: "Now" });
  } else if (current.temperature <= -5) {
    alerts.push({ severity: "warning", type: "Very Cold", message: `Temperature ${Math.round(current.temperature)}°C. Icy conditions likely. Wrap up warm.`, when: "Now" });
  }
  if (current.windSpeed >= 90) {
    alerts.push({ severity: "danger", type: "Storm-Force Winds", message: `Wind speed ${Math.round(current.windSpeed)} km/h. Danger to life from flying debris. Stay indoors.`, when: "Now" });
  } else if (current.windSpeed >= 60) {
    alerts.push({ severity: "warning", type: "High Winds", message: `Wind speed ${Math.round(current.windSpeed)} km/h. Secure loose objects, take care outdoors.`, when: "Now" });
  }
  if (current.uvIndex >= 11) {
    alerts.push({ severity: "danger", type: "Extreme UV", message: `UV index ${current.uvIndex}. Avoid sun exposure. Apply SPF 50+ if outdoors.`, when: "Now" });
  } else if (current.uvIndex >= 8) {
    alerts.push({ severity: "warning", type: "Very High UV", message: `UV index ${current.uvIndex}. Use sun protection and avoid prolonged exposure.`, when: "Now" });
  }

  const upcoming = daily.slice(0, 3);
  for (const day of upcoming) {
    const dayLabel = formatUpcomingDay(day.date);
    if (THUNDERSTORM_CODES.includes(day.weatherCode)) {
      if (!alerts.some(a => a.type === "Thunderstorm")) {
        alerts.push({ severity: "danger", type: "Thunderstorm", message: `Thunderstorms expected ${dayLabel}.`, when: dayLabel });
      }
    }
    if (SNOW_CODES.includes(day.weatherCode)) {
      if (!alerts.some(a => a.type === "Snow")) {
        alerts.push({ severity: "warning", type: "Snow", message: `Snow expected ${dayLabel}. Low of ${Math.round(day.temperatureMin)}°C.`, when: dayLabel });
      }
    }
    if (HEAVY_RAIN_CODES.includes(day.weatherCode)) {
      if (!alerts.some(a => a.type === "Heavy Rain")) {
        alerts.push({ severity: "warning", type: "Heavy Rain", message: `Heavy rain expected ${dayLabel}. ${day.precipitationProbabilityMax}% chance of precipitation.`, when: dayLabel });
      }
    }
    if (FREEZING_CODES.includes(day.weatherCode)) {
      if (!alerts.some(a => a.type === "Freezing Rain")) {
        alerts.push({ severity: "danger", type: "Freezing Rain", message: `Freezing rain expected ${dayLabel}. Roads may be hazardous.`, when: dayLabel });
      }
    }
    if (day.temperatureMax >= 35) {
      if (!alerts.some(a => a.type === "Extreme Heat" || a.type === "Very Hot")) {
        alerts.push({ severity: "danger", type: "Extreme Heat", message: `High of ${Math.round(day.temperatureMax)}°C expected ${dayLabel}.`, when: dayLabel });
      }
    } else if (day.temperatureMax >= 30) {
      if (!alerts.some(a => a.type === "Very Hot" && a.when === "Now") && !alerts.some(a => a.type === "Very Hot")) {
        alerts.push({ severity: "warning", type: "Very Hot", message: `High of ${Math.round(day.temperatureMax)}°C expected ${dayLabel}.`, when: dayLabel });
      }
    }
    if (day.temperatureMin <= -10) {
      if (!alerts.some(a => a.type === "Extreme Cold" || a.type === "Very Cold")) {
        alerts.push({ severity: "danger", type: "Extreme Cold", message: `Low of ${Math.round(day.temperatureMin)}°C expected ${dayLabel}.`, when: dayLabel });
      }
    } else if (day.temperatureMin <= -5) {
      if (!alerts.some(a => a.type === "Very Cold" && a.when === "Now") && !alerts.some(a => a.type === "Very Cold")) {
        alerts.push({ severity: "warning", type: "Very Cold", message: `Low of ${Math.round(day.temperatureMin)}°C expected ${dayLabel}.`, when: dayLabel });
      }
    }
    if (day.windSpeedMax >= 60) {
      if (!alerts.some(a => a.type.includes("Wind"))) {
        alerts.push({ severity: "warning", type: "High Winds", message: `Winds up to ${Math.round(day.windSpeedMax)} km/h expected ${dayLabel}.`, when: dayLabel });
      }
    }
  }

  alerts.sort((a, b) => {
    const sevOrder = { danger: 0, warning: 1 };
    if (sevOrder[a.severity] !== sevOrder[b.severity]) return sevOrder[a.severity] - sevOrder[b.severity];
    if (a.when === "Now" && b.when !== "Now") return -1;
    if (a.when !== "Now" && b.when === "Now") return 1;
    return 0;
  });

  return alerts;
}

function formatUpcomingDay(dateStr: string): string {
  const date = new Date(dateStr + "T00:00:00");
  const now = new Date();
  const todayStr = now.toISOString().split("T")[0];
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split("T")[0];

  if (dateStr === todayStr) return "today";
  if (dateStr === tomorrowStr) return "tomorrow";
  return "on " + date.toLocaleDateString("en-GB", { weekday: "long" });
}
