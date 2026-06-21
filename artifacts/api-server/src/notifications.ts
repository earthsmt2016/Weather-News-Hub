import { logger } from "./lib/logger";
import { storage } from "./storage";
import { type PushSubscription } from "./schema";
import webpush from "web-push";
import {
  detectServerAlerts,
  buildGeneralWeatherSummary,
  type CurrentWeatherRaw,
  type DailyWeatherRaw,
} from "./lib/weather-alerts";
import { getNewsFeeds } from "./lib/news-feeds";
import {
  getLocalHHMM,
  isInQuietHours,
  parseActiveTimes,
  isScheduledTimeNow,
  getMissedSlotToday,
  SCHEDULED_WINDOW_MINUTES,
} from "./lib/schedule-utils";
import { fetchCelebrityDeathArticles, getDeathsCache } from "./lib/death-feeds";
import {
  RSS_FETCH_TIMEOUT_MS,
  DEFAULT_FREQUENCY_MINUTES,
  MS_PER_MINUTE,
  MINS_PER_HOUR,
  MINUTES_PER_DAY,
} from "./lib/constants";

const BASE_CHECK_INTERVAL = MS_PER_MINUTE;
const WEATHER_FETCH_TTL   = 5  * MS_PER_MINUTE;
const NEWS_FETCH_TTL      = 10 * MS_PER_MINUTE;

const errMsg = (e: unknown): string =>
  e instanceof Error ? e.message : "An unexpected error occurred.";

interface WebPushError { statusCode?: number; }
function isWebPushError(e: unknown): e is WebPushError {
  return typeof e === "object" && e !== null && "statusCode" in e;
}

interface WeatherFetchResult {
  weatherData: CurrentWeatherRaw;
  dailyData: DailyWeatherRaw[];
}

interface WeatherFetchResponse {
  current: CurrentWeatherRaw;
  daily?: {
    time?: string[];
    weather_code: number[];
    temperature_2m_max: number[];
    temperature_2m_min: number[];
  };
}

interface NewsArticleItem {
  title: string;
  link: string;
  source: string;
  pubDate: string;
}

const sentKeys = new Map<string, number>();
const weatherFetchCache = new Map<string, { data: WeatherFetchResult; ts: number }>();
const newsFetchCache = new Map<string, { data: NewsArticleItem[]; ts: number }>();

async function fetchWeatherForSub(sub: { latitude: string; longitude: string }): Promise<WeatherFetchResult | null> {
  const cacheKey = `${sub.latitude}|${sub.longitude}`;
  const cached = weatherFetchCache.get(cacheKey);
  if (cached && Date.now() - cached.ts < WEATHER_FETCH_TTL) return cached.data;
  try {
    const url = new URL("https://api.open-meteo.com/v1/forecast");
    url.searchParams.set("latitude", sub.latitude);
    url.searchParams.set("longitude", sub.longitude);
    url.searchParams.set("current", "temperature_2m,weather_code,wind_speed_10m");
    url.searchParams.set("daily", "weather_code,temperature_2m_max,temperature_2m_min");
    url.searchParams.set("timezone", "auto");
    url.searchParams.set("forecast_days", "3");
    const response = await fetch(url.toString());
    if (!response.ok) return null;
    const data = (await response.json()) as WeatherFetchResponse;
    const weatherData: CurrentWeatherRaw = data.current;
    const daily = data.daily;
    const dailyData: DailyWeatherRaw[] = daily?.time?.map((_: string, i: number) => ({
      weather_code: daily.weather_code[i],
      temperature_2m_max: daily.temperature_2m_max[i],
      temperature_2m_min: daily.temperature_2m_min[i],
    })) || [];
    const result: WeatherFetchResult = { weatherData, dailyData };
    weatherFetchCache.set(cacheKey, { data: result, ts: Date.now() });
    return result;
  } catch {
    return null;
  }
}

async function fetchNewsArticles(locationName: string, count: number): Promise<NewsArticleItem[]> {
  const cacheKey = `${locationName}|${count}`;
  const cached = newsFetchCache.get(cacheKey);
  if (cached && Date.now() - cached.ts < NEWS_FETCH_TTL) return cached.data;
  try {
    const { feeds } = getNewsFeeds(locationName, "", "");
    const Parser = (await import("rss-parser")).default;
    const parser = new Parser({ timeout: RSS_FETCH_TIMEOUT_MS, headers: { "User-Agent": "BirminghamNewsApp/1.0" } });
    const allArticles: NewsArticleItem[] = [];
    const results = await Promise.allSettled(feeds.map(async (feed) => {
      try {
        const parsed = await parser.parseURL(feed.url);
        return (parsed.items || []).slice(0, 5).map(item => ({
          title: item.title || "",
          link: item.link || "/",
          source: feed.source,
          pubDate: item.pubDate || item.isoDate || "",
        }));
      } catch { return []; }
    }));
    for (const r of results) {
      if (r.status === "fulfilled") allArticles.push(...r.value.filter(a => a.title));
    }
    const result = allArticles.slice(0, count);
    if (result.length > 0) newsFetchCache.set(cacheKey, { data: result, ts: Date.now() });
    return result;
  } catch {
    return [];
  }
}

async function sendPushToSub(sub: { endpoint: string; p256dh: string; auth: string }, payload: string): Promise<void> {
  try {
    await webpush.sendNotification(
      { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
      payload
    );
  } catch (e: unknown) {
    if (isWebPushError(e) && (e.statusCode === 410 || e.statusCode === 404)) {
      await storage.deletePushSubscription(sub.endpoint);
    }
  }
}

export async function sendNotificationsForSub(sub: PushSubscription, sendKey: string, forceAll = false, scheduledSend = false): Promise<number> {
  const wantsExtreme = sub.notifyExtremeWeather === 1;
  const wantsGeneral = sub.notifyGeneralWeather === 1 || scheduledSend;
  const wantsNews = sub.notifyNewsSummary === 1 || scheduledSend;
  if (!wantsExtreme && !wantsGeneral && !wantsNews) return 0;

  const now = Date.now();
  const today = new Date().toISOString().split("T")[0];
  let sent = 0;

  try {
    let weatherResult: WeatherFetchResult | null = null;
    if (wantsExtreme || wantsGeneral) weatherResult = await fetchWeatherForSub(sub);

    if (wantsExtreme && weatherResult) {
      const alerts = detectServerAlerts(weatherResult.weatherData, weatherResult.dailyData);
      for (const alert of alerts.filter(a => a.isExtreme)) {
        const alertKey = `${sub.endpoint}|alert|${alert.title}|${forceAll ? now : today}`;
        if (!forceAll && sentKeys.has(alertKey)) continue;
        sentKeys.set(alertKey, now);
        await sendPushToSub(sub, JSON.stringify({ title: alert.title, body: `${sub.locationName}: ${alert.body}`, url: "/" }));
        sent++;
      }
    }

    if (wantsGeneral && weatherResult) {
      const generalKey = `${sub.endpoint}|general|${sendKey}`;
      if (forceAll || !sentKeys.has(generalKey)) {
        sentKeys.set(generalKey, now);
        const summary = buildGeneralWeatherSummary(weatherResult.weatherData, weatherResult.dailyData, sub.locationName);
        await sendPushToSub(sub, JSON.stringify({ title: `Weather Update - ${sub.locationName}`, body: summary, url: "/" }));
        sent++;
      }
    }

    if (wantsNews) {
      const maxCount = sub.newsArticleCount || 3;
      const articles = await fetchNewsArticles(sub.locationName, Math.max(maxCount * 3, 10));
      const watermark = forceAll || scheduledSend ? 0 : (sub.lastNotifiedAt ? new Date(sub.lastNotifiedAt).getTime() : 0);
      const fresh = watermark > 0
        ? articles.filter(a => { if (!a.pubDate) return true; const t = new Date(a.pubDate).getTime(); return isNaN(t) || t > watermark; })
        : articles;
      for (const article of fresh.slice(0, maxCount)) {
        const newsKey = `${sub.endpoint}|news|${encodeURIComponent(article.link || article.title)}`;
        if (!forceAll && sentKeys.has(newsKey)) continue;
        sentKeys.set(newsKey, now);
        await sendPushToSub(sub, JSON.stringify({ title: article.source, body: article.title, url: article.link || "/" }));
        sent++;
      }
    }
  } catch (e: unknown) {
    logger.error(`Notification send error for ${sub.locationName}: ${errMsg(e)}`);
  }

  return sent;
}

async function checkAndNotifySubscriptions(): Promise<void> {
  if (!process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) return;
  try {
    const subscriptions = await storage.getPushSubscriptions();
    if (subscriptions.length === 0) return;
    const now = Date.now();

    for (const sub of subscriptions) {
      const wantsExtreme = sub.notifyExtremeWeather === 1;
      const wantsGeneral = sub.notifyGeneralWeather === 1;
      const wantsNews = sub.notifyNewsSummary === 1;
      if (!wantsExtreme && !wantsGeneral && !wantsNews) continue;

      const useScheduled = parseActiveTimes(sub.scheduledTimes ?? "").length > 0;
      let shouldSend = false;
      let sendKey = "";

      if (useScheduled) {
        const todayLocal = new Date().toLocaleDateString("en-GB", { timeZone: "Europe/London" }).split("/").reverse().join("-");
        shouldSend = isScheduledTimeNow(sub.scheduledTimes ?? "");
        if (shouldSend) {
          const { totalMinutes: nowMin } = getLocalHHMM();
          const slotTime = parseActiveTimes(sub.scheduledTimes ?? "").find(t => {
            const [hStr, mStr] = t.trim().split(":");
            const schedMin = parseInt(hStr, 10) * MINS_PER_HOUR + parseInt(mStr, 10);
            const diff = nowMin - schedMin;
            return (diff >= 0 && diff < SCHEDULED_WINDOW_MINUTES) || (diff < 0 && diff + MINUTES_PER_DAY < SCHEDULED_WINDOW_MINUTES);
          }) ?? "00:00";
          sendKey = `sched|${todayLocal}|${slotTime.trim()}`;
          if (sentKeys.has(`${sub.endpoint}|${sendKey}`)) shouldSend = false;
        } else {
          const missedSlot = getMissedSlotToday(sub.scheduledTimes ?? "", sub.lastNotifiedAt);
          if (missedSlot) {
            const todayLocal2 = new Date().toLocaleDateString("en-GB", { timeZone: "Europe/London" }).split("/").reverse().join("-");
            sendKey = `sched|${todayLocal2}|${missedSlot.trim()}`;
            if (!sentKeys.has(`${sub.endpoint}|${sendKey}`)) {
              shouldSend = true;
            } else {
              sendKey = "";
            }
          }
        }
      } else {
        if (isInQuietHours(sub.quietHoursStart, sub.quietHoursEnd)) continue;
        const freqMs = (sub.frequencyMinutes || DEFAULT_FREQUENCY_MINUTES) * MS_PER_MINUTE;
        const lastSentMs = sub.lastNotifiedAt ? new Date(sub.lastNotifiedAt).getTime() : 0;
        shouldSend = now - lastSentMs >= freqMs;
        sendKey = `freq|${new Date().toISOString().split("T")[0]}|${Math.floor(now / freqMs)}`;
      }

      if (!shouldSend) continue;

      const fullSendKey = `${sub.endpoint}|${sendKey}`;
      if (useScheduled && sendKey) sentKeys.set(fullSendKey, now);
      const sent = await sendNotificationsForSub(sub, fullSendKey, false, useScheduled);
      logger.info(`Scheduler: sent ${sent} notification(s) for ${sub.locationName}`);
      await storage.updateNotificationPrefs({ endpoint: sub.endpoint, lastNotifiedAt: new Date().toISOString() });
    }

    const wantDeathNotifs = subscriptions.filter(s => (s.notifyCelebrityDeaths ?? 1) === 1);
    if (wantDeathNotifs.length > 0) {
      try {
        const cached = getDeathsCache();
        const deathArticles = cached ? cached.articles : await fetchCelebrityDeathArticles();
        for (const sub of wantDeathNotifs) {
          if (isInQuietHours(sub.quietHoursStart, sub.quietHoursEnd)) continue;
          if (!sub.lastCelebDeathNotifiedAt) {
            await storage.updateNotificationPrefs({ endpoint: sub.endpoint, lastCelebDeathNotifiedAt: new Date().toISOString() });
            continue;
          }
          const watermark = new Date(sub.lastCelebDeathNotifiedAt).getTime();
          const newArticles = deathArticles.filter(a => {
            try { return new Date(a.pubDate).getTime() > watermark; } catch { return false; }
          });
          if (newArticles.length === 0) continue;
          for (const article of newArticles) {
            const deathKey = `${sub.endpoint}|celeb-death|${article.deathSubject}`;
            if (sentKeys.has(deathKey)) continue;
            sentKeys.set(deathKey, now);
            await sendPushToSub(sub, JSON.stringify({ title: "Celebrity Death Alert", body: article.title, url: article.link || "/" }));
          }
          const latestPubDate = newArticles.reduce((latest, a) => {
            const t = new Date(a.pubDate).getTime();
            return t > latest ? t : latest;
          }, watermark);
          await storage.updateNotificationPrefs({ endpoint: sub.endpoint, lastCelebDeathNotifiedAt: new Date(latestPubDate).toISOString() });
        }
      } catch (e: unknown) {
        logger.error(`Celebrity death notification error: ${errMsg(e)}`);
      }
    }

    for (const [key, ts] of Array.from(sentKeys.entries())) {
      if (now - ts > 48 * 60 * 60 * 1000) sentKeys.delete(key);
    }
  } catch (e: unknown) {
    logger.error(`Notification check failed: ${errMsg(e)}`);
  }
}

let schedulerStarted = false;

export function startScheduler(): void {
  if (schedulerStarted) return;
  schedulerStarted = true;
  setInterval(checkAndNotifySubscriptions, BASE_CHECK_INTERVAL);
  setTimeout(checkAndNotifySubscriptions, 10000);
}
