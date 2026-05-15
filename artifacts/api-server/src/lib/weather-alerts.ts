export const SNOW_CODES = [71, 73, 75, 77, 85, 86];
export const HEAVY_RAIN_CODES = [65, 67, 82];
export const THUNDERSTORM_CODES = [95, 96, 99];
export const FREEZING_CODES = [56, 57, 66, 67];
export const FOG_CODES = [45, 48];

export const weatherCodeDescriptions: Record<number, string> = {
  0: "Clear sky", 1: "Mainly clear", 2: "Partly cloudy", 3: "Overcast",
  45: "Foggy", 48: "Depositing rime fog", 51: "Light drizzle", 53: "Moderate drizzle",
  55: "Dense drizzle", 61: "Slight rain", 63: "Moderate rain", 65: "Heavy rain",
  71: "Slight snow", 73: "Moderate snow", 75: "Heavy snow", 77: "Snow grains",
  80: "Slight rain showers", 81: "Moderate rain showers", 82: "Violent rain showers",
  85: "Slight snow showers", 86: "Heavy snow showers", 95: "Thunderstorm",
  96: "Thunderstorm with slight hail", 99: "Thunderstorm with heavy hail",
};

export interface WeatherAlert {
  title: string;
  body: string;
  isExtreme: boolean;
}

export interface CurrentWeatherRaw {
  weather_code?: number;
  weatherCode?: number;
  temperature_2m?: number;
  temperature?: number;
  wind_speed_10m?: number;
  windSpeed?: number;
}

export interface DailyWeatherRaw {
  weather_code?: number;
  weatherCode?: number;
  temperature_2m_max?: number;
  temperatureMax?: number;
  temperature_2m_min?: number;
  temperatureMin?: number;
}

export function detectServerAlerts(current: CurrentWeatherRaw, daily: DailyWeatherRaw[]): WeatherAlert[] {
  const alerts: WeatherAlert[] = [];
  const code = current.weather_code ?? current.weatherCode ?? 0;
  const temp = current.temperature_2m ?? current.temperature ?? 0;
  const wind = current.wind_speed_10m ?? current.windSpeed ?? 0;

  if (THUNDERSTORM_CODES.includes(code))
    alerts.push({ title: "Thunderstorm Alert", body: "Thunderstorm activity detected. Stay safe indoors.", isExtreme: true });
  if (SNOW_CODES.includes(code))
    alerts.push({ title: "Snow Alert", body: `Snow falling now at ${Math.round(temp)}°C. Take care on roads.`, isExtreme: true });
  if (HEAVY_RAIN_CODES.includes(code))
    alerts.push({ title: "Heavy Rain Alert", body: "Heavy rain occurring now. Possible localised flooding.", isExtreme: true });
  if (FREEZING_CODES.includes(code))
    alerts.push({ title: "Freezing Rain Alert", body: "Freezing conditions. Roads and surfaces extremely slippery.", isExtreme: true });
  if (FOG_CODES.includes(code))
    alerts.push({ title: "Fog Alert", body: "Foggy conditions. Reduced visibility for driving.", isExtreme: false });
  if (temp >= 35)
    alerts.push({ title: "Extreme Heat Warning", body: `Temperature ${Math.round(temp)}°C. Stay hydrated and avoid direct sun.`, isExtreme: true });
  if (temp <= -10)
    alerts.push({ title: "Extreme Cold Warning", body: `Temperature ${Math.round(temp)}°C. Risk of hypothermia.`, isExtreme: true });
  if (wind >= 90)
    alerts.push({ title: "Storm-Force Wind Alert", body: `Winds at ${Math.round(wind)} km/h. Stay indoors.`, isExtreme: true });
  else if (wind >= 60)
    alerts.push({ title: "High Wind Alert", body: `Winds at ${Math.round(wind)} km/h. Secure loose objects.`, isExtreme: true });

  if (daily && daily.length > 0) {
    const tomorrow = daily[1];
    if (tomorrow) {
      const tCode = tomorrow.weather_code ?? tomorrow.weatherCode ?? 0;
      const tMax = tomorrow.temperature_2m_max ?? tomorrow.temperatureMax ?? 0;
      const tMin = tomorrow.temperature_2m_min ?? tomorrow.temperatureMin ?? 0;
      if (SNOW_CODES.includes(tCode))
        alerts.push({ title: "Snow Expected Tomorrow", body: `Snow forecast for tomorrow with a low of ${Math.round(tMin)}°C.`, isExtreme: true });
      if (THUNDERSTORM_CODES.includes(tCode))
        alerts.push({ title: "Thunderstorms Tomorrow", body: "Thunderstorms are forecast for tomorrow.", isExtreme: true });
      if (HEAVY_RAIN_CODES.includes(tCode))
        alerts.push({ title: "Heavy Rain Tomorrow", body: "Heavy rain expected tomorrow.", isExtreme: true });
      if (tMax >= 35)
        alerts.push({ title: "Extreme Heat Tomorrow", body: `High of ${Math.round(tMax)}°C expected tomorrow.`, isExtreme: true });
      if (tMin <= -10)
        alerts.push({ title: "Extreme Cold Tomorrow", body: `Low of ${Math.round(tMin)}°C expected tomorrow.`, isExtreme: true });
    }
  }

  return alerts;
}

export function buildGeneralWeatherSummary(current: CurrentWeatherRaw, daily: DailyWeatherRaw[], locationName: string): string {
  const temp = Math.round(current.temperature_2m ?? current.temperature ?? 0);
  const code = current.weather_code ?? current.weatherCode ?? 0;
  const desc = weatherCodeDescriptions[code] || "Unknown";
  const wind = Math.round(current.wind_speed_10m ?? current.windSpeed ?? 0);
  let summary = `${locationName}: ${temp}°C, ${desc}, wind ${wind} km/h.`;
  if (daily && daily[0]) {
    const hi = Math.round(daily[0].temperature_2m_max ?? daily[0].temperatureMax ?? 0);
    const lo = Math.round(daily[0].temperature_2m_min ?? daily[0].temperatureMin ?? 0);
    summary += ` Today: ${lo}°C-${hi}°C.`;
  }
  if (daily && daily[1]) {
    const tHi = Math.round(daily[1].temperature_2m_max ?? daily[1].temperatureMax ?? 0);
    const tLo = Math.round(daily[1].temperature_2m_min ?? daily[1].temperatureMin ?? 0);
    const tCode = daily[1].weather_code ?? daily[1].weatherCode ?? 0;
    const tDesc = weatherCodeDescriptions[tCode] || "";
    summary += ` Tomorrow: ${tLo}°C-${tHi}°C, ${tDesc}.`;
  }
  return summary;
}
