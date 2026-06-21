import { Router, type Request } from "express";
import { z } from "zod/v4";
import { logger } from "../lib/logger";
import { storage } from "../storage";
import webpush from "web-push";
import { getNewsFeeds } from "../lib/news-feeds";
import { fetchCelebrityDeathArticles, getDeathsCache, setDeathsCache } from "../lib/death-feeds";
import { startScheduler, sendNotificationsForSub } from "../notifications";

const router = Router();

const BIRMINGHAM_LAT = 52.4862;
const BIRMINGHAM_LON = -1.8904;
const DEFAULT_LOCATION_NAME = "Birmingham & Solihull";
const DEFAULT_REGION = "West Midlands";
const DEFAULT_COUNTRY = "United Kingdom";

const WEATHER_CACHE_TTL = 5 * 60 * 1000;
const NEWS_CACHE_TTL = 10 * 60 * 1000;
const AIR_QUALITY_CACHE_TTL = 15 * 60 * 1000;

interface CacheEntry<T extends object = Record<string, unknown>> {
  data: T;
  timestamp: number;
}

interface GeocodingApiResult {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
  country: string;
  admin1?: string;
}

interface GeocodingApiResponse {
  results?: GeocodingApiResult[];
}

interface NominatimReverseResponse {
  display_name?: string;
  address?: {
    city?: string;
    town?: string;
    village?: string;
    county?: string;
    state?: string;
    state_district?: string;
    country?: string;
  };
}

interface OpenMeteoForecastResponse {
  current: {
    time: string;
    temperature_2m: number;
    apparent_temperature: number;
    relative_humidity_2m: number;
    wind_speed_10m: number;
    weather_code: number;
    precipitation: number;
    cloud_cover: number;
    is_day: number;
    uv_index: number;
  };
  hourly: {
    time: string[];
    temperature_2m: number[];
    apparent_temperature: number[];
    relative_humidity_2m: number[];
    wind_speed_10m: number[];
    weather_code: number[];
    precipitation_probability: number[];
    cloud_cover: number[];
    is_day: number[];
  };
  daily: {
    time: string[];
    weather_code: number[];
    temperature_2m_max: number[];
    temperature_2m_min: number[];
    precipitation_sum: number[];
    wind_speed_10m_max: number[];
    precipitation_probability_max: number[];
    sunrise: string[];
    sunset: string[];
    uv_index_max: number[];
  };
}

interface AirQualityApiResponse {
  current: {
    european_aqi: number;
    pm10: number;
    pm2_5: number;
    nitrogen_dioxide: number;
    ozone: number;
  };
}

const weatherCacheMap = new Map<string, CacheEntry>();
const airQualityCacheMap = new Map<string, CacheEntry>();
const newsCacheMap = new Map<string, CacheEntry>();

const errMsg = (e: unknown): string =>
  e instanceof Error ? e.message : "An unexpected error occurred.";

const updateNotificationPrefsSchema = z.object({
  endpoint: z.string(),
  notifyExtremeWeather: z.number().min(0).max(1).optional(),
  notifyGeneralWeather: z.number().min(0).max(1).optional(),
  notifyNewsSummary: z.number().min(0).max(1).optional(),
  frequencyMinutes: z.number().min(15).max(360).optional(),
  newsArticleCount: z.number().min(1).max(5).optional(),
  notifyCelebrityDeaths: z.number().min(0).max(1).optional(),
  scheduledTimes: z.string().optional(),
  lastNotifiedAt: z.string().nullable().optional(),
  lastCelebDeathNotifiedAt: z.string().nullable().optional(),
  quietHoursStart: z.string().nullable().optional(),
  quietHoursEnd: z.string().nullable().optional(),
});

interface JsonFetchResponse {
  ok: boolean;
  status: number;
  json(): Promise<unknown>;
}

interface FetchJsonInit {
  headers?: Record<string, string>;
}

async function fetchJson<T>(url: string, errorLabel: string, init?: FetchJsonInit): Promise<T> {
  const response = (await fetch(url, init)) as unknown as JsonFetchResponse;
  if (!response.ok) throw new Error(`${errorLabel}: ${response.status}`);
  return (await response.json()) as T;
}

if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY && process.env.VAPID_SUBJECT) {
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT,
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
}

router.get("/geocode", async (req, res) => {
  try {
    const query = req.query.q as string;
    if (!query || query.trim().length === 0) return res.json({ results: [] });
    const url = new URL("https://geocoding-api.open-meteo.com/v1/search");
    url.searchParams.set("name", query.trim());
    url.searchParams.set("count", "5");
    url.searchParams.set("language", "en");
    url.searchParams.set("format", "json");
    const data = await fetchJson<GeocodingApiResponse>(url.toString(), "Geocoding API error");
    const results = (data.results || []).map((r) => ({
      id: r.id,
      name: r.name,
      latitude: r.latitude,
      longitude: r.longitude,
      country: r.country || "",
      region: r.admin1 || "",
    }));
    res.json({ results });
  } catch (e: unknown) {
    logger.error(`Geocoding API error: ${errMsg(e)}`);
    res.status(500).json({ message: "Failed to fetch geocoding data" });
  }
});

router.get("/reverse-geocode", async (req, res) => {
  try {
    const lat = parseFloat(req.query.lat as string);
    const lon = parseFloat(req.query.lon as string);
    if (isNaN(lat) || isNaN(lon)) return res.status(400).json({ message: "Invalid coordinates" });
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=10&addressdetails=1`;
    const data = await fetchJson<NominatimReverseResponse>(url, "Nominatim error", {
      headers: { "User-Agent": "WeatherDashboardApp/1.0" },
    });
    const address = data.address || {};
    const name = address.city || address.town || address.village || address.county || address.state || data.display_name?.split(",")[0] || "Unknown";
    const regionParts = [address.state_district, address.county, address.state].filter(
      (part): part is string => Boolean(part),
    );
    const uniqueParts: string[] = [];
    for (const p of regionParts) { if (!uniqueParts.includes(p)) uniqueParts.push(p); }
    const region = uniqueParts.join(", ") || "";
    const country = address.country || "";
    res.json({ name, region, country, lat, lon });
  } catch (e: unknown) {
    logger.error(`Reverse geocode error: ${errMsg(e)}`);
    res.status(500).json({ message: "Failed to reverse geocode" });
  }
});

router.get("/weather", async (req, res) => {
  try {
    const lat = req.query.lat ? parseFloat(req.query.lat as string) : BIRMINGHAM_LAT;
    const lon = req.query.lon ? parseFloat(req.query.lon as string) : BIRMINGHAM_LON;
    const locationName = (req.query.name as string) || DEFAULT_LOCATION_NAME;
    const cacheKey = `${lat},${lon}`;
    const forceRefresh = req.query.refresh === "true";

    const cached = weatherCacheMap.get(cacheKey);
    if (!forceRefresh && cached && Date.now() - cached.timestamp < WEATHER_CACHE_TTL) {
      return res.json({ ...cached.data, location: locationName });
    }

    const url = new URL("https://api.open-meteo.com/v1/forecast");
    url.searchParams.set("latitude", lat.toString());
    url.searchParams.set("longitude", lon.toString());
    url.searchParams.set("current", "temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,cloud_cover,wind_speed_10m,precipitation,is_day,uv_index");
    url.searchParams.set("hourly", "temperature_2m,relative_humidity_2m,apparent_temperature,precipitation_probability,weather_code,cloud_cover,wind_speed_10m,is_day");
    url.searchParams.set("daily", "weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,wind_speed_10m_max,precipitation_probability_max,sunrise,sunset,uv_index_max");
    url.searchParams.set("timezone", "Europe/London");
    url.searchParams.set("forecast_days", "7");

    const data = await fetchJson<OpenMeteoForecastResponse>(url.toString(), "Open-Meteo API error");

    const current = {
      time: data.current.time,
      temperature: data.current.temperature_2m,
      feelsLike: data.current.apparent_temperature,
      humidity: data.current.relative_humidity_2m,
      windSpeed: data.current.wind_speed_10m,
      weatherCode: data.current.weather_code,
      precipitation: data.current.precipitation,
      cloudCover: data.current.cloud_cover,
      isDay: data.current.is_day,
      uvIndex: data.current.uv_index,
    };

    const todayStr = data.current.time.split("T")[0];
    const hourly = (data.hourly.time as string[]).map((time: string, i: number) => ({
      time,
      temperature: data.hourly.temperature_2m[i],
      feelsLike: data.hourly.apparent_temperature[i],
      humidity: data.hourly.relative_humidity_2m[i],
      windSpeed: data.hourly.wind_speed_10m[i],
      weatherCode: data.hourly.weather_code[i],
      precipitation: data.hourly.precipitation_probability[i] || 0,
      cloudCover: data.hourly.cloud_cover[i],
      isDay: data.hourly.is_day[i],
      uvIndex: 0,
    }));

    const todayHourly = hourly.filter(h => h.time.startsWith(todayStr));
    const threeHourly = todayHourly.filter((_, i) => i % 3 === 0);

    const daily = data.daily.time.map((date: string, i: number) => ({
      date,
      weatherCode: data.daily.weather_code[i],
      temperatureMax: data.daily.temperature_2m_max[i],
      temperatureMin: data.daily.temperature_2m_min[i],
      precipitationSum: data.daily.precipitation_sum[i],
      windSpeedMax: data.daily.wind_speed_10m_max[i],
      precipitationProbabilityMax: data.daily.precipitation_probability_max[i] || 0,
      sunrise: data.daily.sunrise[i],
      sunset: data.daily.sunset[i],
      uvIndexMax: data.daily.uv_index_max[i],
    }));

    const result = {
      location: locationName,
      latitude: lat,
      longitude: lon,
      timezone: "Europe/London",
      current,
      hourly,
      threeHourly,
      daily,
      lastUpdated: new Date().toISOString(),
    };

    weatherCacheMap.set(cacheKey, { data: result, timestamp: Date.now() });
    res.json(result);
  } catch (e: unknown) {
    logger.error(`Weather API error: ${errMsg(e)}`);
    res.status(500).json({ message: "Failed to fetch weather data" });
  }
});

router.get("/news", async (req, res) => {
  try {
    const locationName = (req.query.name as string) || DEFAULT_LOCATION_NAME;
    const region = (req.query.region as string) || DEFAULT_REGION;
    const country = (req.query.country as string) || DEFAULT_COUNTRY;
    const forceRefresh = req.query.refresh === "true";
    const cacheKey = `${locationName.toLowerCase()}|${region.toLowerCase()}|${country.toLowerCase()}`;

    const cached = newsCacheMap.get(cacheKey);
    if (!forceRefresh && cached && Date.now() - cached.timestamp < NEWS_CACHE_TTL) {
      return res.json(cached.data);
    }

    const { feeds, label } = getNewsFeeds(locationName, region, country);
    const Parser = (await import("rss-parser")).default;
    const parser = new Parser({ timeout: 10000, headers: { "User-Agent": "BirminghamNewsApp/1.0" } });
    const allArticles: { title: string; description: string; link: string; pubDate: string; source: string }[] = [];

    const feedResults = await Promise.allSettled(
      feeds.map(async (feed) => {
        try {
          const parsed = await parser.parseURL(feed.url);
          return (parsed.items || []).slice(0, 15).map((item) => ({
            title: item.title || "Untitled",
            description: item.contentSnippet || item.content || "",
            link: item.link || "",
            pubDate: item.pubDate || new Date().toISOString(),
            source: feed.source,
          }));
        } catch (e: unknown) {
          logger.warn(`Feed error (${feed.source}): ${errMsg(e)}`);
          return [];
        }
      })
    );

    for (const result of feedResults) {
      if (result.status === "fulfilled") allArticles.push(...result.value);
    }

    if (allArticles.length === 0) {
      try {
        const fallbackQuery = encodeURIComponent(locationName);
        const fallbackUrl = `https://news.google.com/rss/search?q=${fallbackQuery}&hl=en&gl=US&ceid=US:en`;
        const parsed = await parser.parseURL(fallbackUrl);
        allArticles.push(...(parsed.items || []).slice(0, 15).map((item) => ({
          title: item.title || "Untitled",
          description: item.contentSnippet || item.content || "",
          link: item.link || "",
          pubDate: item.pubDate || new Date().toISOString(),
          source: "Google News",
        })));
      } catch { /* ignore fallback failure */ }
    }

    allArticles.sort((a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime());
    const cachedResult = { articles: allArticles.slice(0, 30), lastUpdated: new Date().toISOString(), regionLabel: label };
    if (allArticles.length > 0) newsCacheMap.set(cacheKey, { data: cachedResult, timestamp: Date.now() });
    res.json(cachedResult);
  } catch (e: unknown) {
    logger.error(`News API error: ${errMsg(e)}`);
    res.status(500).json({ message: "Failed to fetch news" });
  }
});

router.get("/celebrity-deaths", async (req, res) => {
  try {
    const forceRefresh = req.query.refresh === "true";
    const cached = getDeathsCache();
    if (!forceRefresh && cached) return res.json({ articles: cached.articles, lastUpdated: cached.lastUpdated });
    const articles = await fetchCelebrityDeathArticles();
    if (articles.length > 0) setDeathsCache(articles);
    const result = getDeathsCache();
    res.json({ articles, lastUpdated: result?.lastUpdated ?? new Date().toISOString() });
  } catch (e: unknown) {
    logger.error(`Celebrity deaths error: ${errMsg(e)}`);
    res.status(500).json({ message: "Failed to fetch celebrity deaths" });
  }
});

router.get("/air-quality", async (req, res) => {
  try {
    const lat = req.query.lat ? parseFloat(req.query.lat as string) : BIRMINGHAM_LAT;
    const lon = req.query.lon ? parseFloat(req.query.lon as string) : BIRMINGHAM_LON;
    const cacheKey = `${lat},${lon}`;
    const cached = airQualityCacheMap.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < AIR_QUALITY_CACHE_TTL) return res.json(cached.data);

    const url = new URL("https://air-quality-api.open-meteo.com/v1/air-quality");
    url.searchParams.set("latitude", lat.toString());
    url.searchParams.set("longitude", lon.toString());
    url.searchParams.set("current", "european_aqi,pm10,pm2_5,nitrogen_dioxide,ozone");
    const data = await fetchJson<AirQualityApiResponse>(url.toString(), "Air Quality API error");
    const result = {
      europeanAqi: data.current.european_aqi,
      pm10: data.current.pm10,
      pm25: data.current.pm2_5,
      nitrogenDioxide: data.current.nitrogen_dioxide,
      ozone: data.current.ozone,
      lastUpdated: new Date().toISOString(),
    };
    airQualityCacheMap.set(cacheKey, { data: result, timestamp: Date.now() });
    res.json(result);
  } catch (e: unknown) {
    logger.error(`Air Quality API error: ${errMsg(e)}`);
    res.status(500).json({ message: "Failed to fetch air quality data" });
  }
});

router.get("/vapid-public-key", (_req, res) => {
  res.json({ publicKey: process.env.VAPID_PUBLIC_KEY || "" });
});

router.post("/push/subscribe", async (req, res) => {
  try {
    const { endpoint, keys, locationName, latitude, longitude } = req.body;
    if (!endpoint || !keys?.p256dh || !keys?.auth) {
      return res.status(400).json({ message: "Missing required subscription fields" });
    }
    const subscription = await storage.savePushSubscription({
      endpoint,
      p256dh: keys.p256dh,
      auth: keys.auth,
      locationName: locationName || DEFAULT_LOCATION_NAME,
      latitude: latitude || String(BIRMINGHAM_LAT),
      longitude: longitude || String(BIRMINGHAM_LON),
    });
    res.json({ success: true, subscription });
  } catch (e: unknown) {
    logger.error(`Push subscribe error: ${errMsg(e)}`);
    res.status(500).json({ message: "Failed to save push subscription" });
  }
});

router.post("/push/unsubscribe", async (req, res) => {
  try {
    const { endpoint } = req.body;
    if (!endpoint) return res.status(400).json({ message: "Missing endpoint" });
    await storage.deletePushSubscription(endpoint);
    res.json({ success: true });
  } catch (e: unknown) {
    logger.error(`Push unsubscribe error: ${errMsg(e)}`);
    res.status(500).json({ message: "Failed to remove push subscription" });
  }
});

router.get("/push/preferences", async (req, res) => {
  try {
    const endpoint = req.query.endpoint as string;
    if (!endpoint) return res.status(400).json({ message: "Missing endpoint" });
    const sub = await storage.getPushSubscriptionByEndpoint(endpoint);
    if (!sub) return res.status(404).json({ message: "Subscription not found" });
    res.json({
      notifyExtremeWeather: sub.notifyExtremeWeather,
      notifyGeneralWeather: sub.notifyGeneralWeather,
      notifyNewsSummary: sub.notifyNewsSummary,
      notifyCelebrityDeaths: sub.notifyCelebrityDeaths ?? 1,
      frequencyMinutes: sub.frequencyMinutes,
      newsArticleCount: sub.newsArticleCount,
      scheduledTimes: sub.scheduledTimes ?? "",
      lastNotifiedAt: sub.lastNotifiedAt ?? null,
      quietHoursStart: sub.quietHoursStart ?? null,
      quietHoursEnd: sub.quietHoursEnd ?? null,
    });
  } catch (e: unknown) {
    logger.error(`Get preferences error: ${errMsg(e)}`);
    res.status(500).json({ message: "Failed to get preferences" });
  }
});

router.post("/push/preferences", async (req, res) => {
  try {
    const parsed = updateNotificationPrefsSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: "Invalid preferences", errors: parsed.error.flatten() });
    const updated = await storage.updateNotificationPrefs(parsed.data);
    if (!updated) return res.status(404).json({ message: "Subscription not found" });
    res.json({
      success: true,
      notifyExtremeWeather: updated.notifyExtremeWeather,
      notifyGeneralWeather: updated.notifyGeneralWeather,
      notifyNewsSummary: updated.notifyNewsSummary,
      notifyCelebrityDeaths: updated.notifyCelebrityDeaths ?? 1,
      frequencyMinutes: updated.frequencyMinutes,
      newsArticleCount: updated.newsArticleCount,
      scheduledTimes: updated.scheduledTimes ?? "",
      lastNotifiedAt: updated.lastNotifiedAt ?? null,
      quietHoursStart: updated.quietHoursStart ?? null,
      quietHoursEnd: updated.quietHoursEnd ?? null,
    });
  } catch (e: unknown) {
    logger.error(`Update preferences error: ${errMsg(e)}`);
    res.status(500).json({ message: "Failed to update preferences" });
  }
});

router.post("/push/test", async (req, res) => {
  try {
    const { endpoint } = req.body;
    const subscriptions = await storage.getPushSubscriptions();
    const target = endpoint ? subscriptions.filter(s => s.endpoint === endpoint) : subscriptions;
    if (target.length === 0) return res.status(404).json({ message: "No subscriptions found" });
    const payload = JSON.stringify({ title: "Weather Alert Test", body: "Push notifications are working!", url: "/" });
    const results = await Promise.allSettled(
      target.map(sub => webpush.sendNotification({ endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } }, payload))
    );
    const succeeded = results.filter(r => r.status === "fulfilled").length;
    const failed = results.filter(r => r.status === "rejected").length;
    res.json({ success: true, sent: succeeded, failed });
  } catch (e: unknown) {
    logger.error(`Push test error: ${errMsg(e)}`);
    res.status(500).json({ message: "Failed to send test notification" });
  }
});

router.post("/push/send-now", async (req, res) => {
  try {
    if (!process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) {
      return res.status(503).json({ message: "Push notifications not configured" });
    }
    const { endpoint } = req.body;
    if (!endpoint) return res.status(400).json({ message: "Missing endpoint" });
    const sub = await storage.getPushSubscriptionByEndpoint(endpoint);
    if (!sub) return res.status(404).json({ message: "Subscription not found" });
    const sendKey = `manual|${Date.now()}`;
    const sent = await sendNotificationsForSub(sub, sendKey, true);
    await storage.updateNotificationPrefs({ endpoint, lastNotifiedAt: new Date().toISOString() });
    res.json({ success: true, sent });
  } catch (e: unknown) {
    logger.error(`Send-now error: ${errMsg(e)}`);
    res.status(500).json({ message: "Failed to send notifications" });
  }
});

router.get("/auth/me", (req, res) => {
  res.set("Cache-Control", "no-store, no-cache, must-revalidate");
  const session = (req as Request & { session?: { userId?: string; username?: string } }).session;
  if (session?.userId) {
    return res.json({ userId: session.userId, username: session.username });
  }
  return res.json({ userId: null, username: null });
});

router.post("/auth/login", (req, res) => {
  const { username, password } = req.body;
  const ADMIN_USERNAME = process.env.ADMIN_USERNAME;
  const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
  if (!ADMIN_USERNAME || !ADMIN_PASSWORD) {
    return res.status(503).json({ message: "Admin credentials not configured." });
  }
  if (username.trim() === ADMIN_USERNAME.trim() && password === ADMIN_PASSWORD.trim()) {
    const session = (req as Request & { session?: { userId?: string; username?: string } }).session;
    if (session) {
      session.userId = "admin";
      session.username = username;
    }
    return res.json({ success: true, username });
  }
  return res.status(401).json({ message: "Invalid credentials" });
});

router.post("/auth/logout", (req, res) => {
  const session = (req as Request & { session?: { destroy: (cb: () => void) => void } }).session;
  if (session) {
    session.destroy(() => { res.json({ success: true }); });
  } else {
    res.json({ success: true });
  }
});

router.get("/saved-articles", async (req, res) => {
  const session = (req as Request & { session?: { userId?: string } }).session;
  if (!session?.userId) return res.status(401).json({ message: "Unauthorised" });
  const articles = await storage.getSavedArticles(session.userId);
  res.json(articles);
});

router.post("/saved-articles", async (req, res) => {
  const session = (req as Request & { session?: { userId?: string } }).session;
  if (!session?.userId) return res.status(401).json({ message: "Unauthorised" });
  try {
    const article = await storage.saveArticle({ ...req.body, userId: session.userId });
    res.json(article);
  } catch (e: unknown) {
    res.status(500).json({ message: errMsg(e) });
  }
});

router.delete("/saved-articles/all", async (req, res) => {
  const session = (req as Request & { session?: { userId?: string } }).session;
  if (!session?.userId) return res.status(401).json({ message: "Unauthorised" });
  await storage.clearSavedArticles(session.userId);
  res.json({ success: true });
});

router.delete("/saved-articles", async (req, res) => {
  const session = (req as Request & { session?: { userId?: string } }).session;
  if (!session?.userId) return res.status(401).json({ message: "Unauthorised" });
  const { link } = req.body;
  if (!link) return res.status(400).json({ message: "Missing link" });
  await storage.deleteSavedArticle(session.userId, link);
  res.json({ success: true });
});

startScheduler();

export default router;
