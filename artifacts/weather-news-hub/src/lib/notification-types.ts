import { MINS_PER_HOUR, HOURS_PER_DAY, MINUTES_PER_DAY, MS_PER_MINUTE, NOON_HOUR } from "@/lib/constants";

export const DISABLED_TIME_PREFIX = "!";

export interface NotificationPrefs {
  notifyExtremeWeather: number;
  notifyGeneralWeather: number;
  notifyNewsSummary: number;
  notifyCelebrityDeaths: number;
  frequencyMinutes: number;
  newsArticleCount: number;
  scheduledTimes: string;
  lastNotifiedAt: string | null;
  quietHoursStart: string | null;
  quietHoursEnd: string | null;
}

export const FREQUENCY_OPTIONS = [
  { value: "15", label: "Every 15 min" },
  { value: "30", label: "Every 30 min" },
  { value: "60", label: "Every hour" },
  { value: "120", label: "Every 2 hours" },
  { value: "240", label: "Every 4 hours" },
  { value: "360", label: "Every 6 hours" },
];

export const NEWS_COUNT_OPTIONS = [
  { value: "1", label: "1 article" },
  { value: "2", label: "2 articles" },
  { value: "3", label: "3 articles" },
  { value: "4", label: "4 articles" },
  { value: "5", label: "5 articles" },
];

export function formatTime(t: string): string {
  const [hStr, mStr] = t.replace(DISABLED_TIME_PREFIX, "").split(":");
  const h = parseInt(hStr, 10);
  const m = parseInt(mStr, 10);
  const ampm = h >= NOON_HOUR ? "PM" : "AM";
  const h12 = h % NOON_HOUR || NOON_HOUR;
  return `${h12}:${String(m).padStart(2, "0")} ${ampm}`;
}

export function getTimeUntil(hhmm: string): string {
  const clean = hhmm.replace(DISABLED_TIME_PREFIX, "");
  const now = new Date();
  const nowMin = now.getHours() * MINS_PER_HOUR + now.getMinutes();
  const [h, m] = clean.split(":").map(Number);
  const schedMin = h * MINS_PER_HOUR + m;
  const diff = schedMin > nowMin ? schedMin - nowMin : MINUTES_PER_DAY - nowMin + schedMin;
  if (diff === 0) return "now";
  if (diff < MINS_PER_HOUR) return `${diff}m`;
  const hrs = Math.floor(diff / MINS_PER_HOUR);
  const mins = diff % MINS_PER_HOUR;
  return mins > 0 ? `${hrs}h ${mins}m` : `${hrs}h`;
}

export function getNextScheduledTime(scheduledTimes: string): string | null {
  const activeTimes = scheduledTimes
    .split(",")
    .map(t => t.trim())
    .filter(t => t && !t.startsWith(DISABLED_TIME_PREFIX));
  if (activeTimes.length === 0) return null;
  const now = new Date();
  const nowMin = now.getHours() * MINS_PER_HOUR + now.getMinutes();
  const sorted = [...activeTimes].sort();
  const upcoming = sorted.find(t => {
    const [h, m] = t.split(":").map(Number);
    return h * MINS_PER_HOUR + m > nowMin;
  });
  const nextTime = upcoming ?? sorted[0];
  if (!nextTime) return null;
  const [h, m] = nextTime.split(":").map(Number);
  const nextMin = h * MINS_PER_HOUR + m;
  const diffMin = nextMin > nowMin ? nextMin - nowMin : MINUTES_PER_DAY - nowMin + nextMin;
  if (diffMin < MINS_PER_HOUR) return `in ${diffMin} min (${formatTime(nextTime)})`;
  const hrs = Math.floor(diffMin / MINS_PER_HOUR);
  const mins = diffMin % MINS_PER_HOUR;
  const label = mins > 0 ? `${hrs}h ${mins}m` : `${hrs}h`;
  return `in ${label} (${formatTime(nextTime)})`;
}

export function getNextFrequencyTime(lastNotifiedAt: string | null, frequencyMinutes: number): string | null {
  if (!lastNotifiedAt) return null;
  const last = new Date(lastNotifiedAt).getTime();
  const nextMs = last + frequencyMinutes * MS_PER_MINUTE;
  const now = Date.now();
  const diffMs = nextMs - now;
  if (diffMs <= 0) return "due now";
  const diffMin = Math.round(diffMs / MS_PER_MINUTE);
  if (diffMin < MINS_PER_HOUR) return `in ${diffMin} min`;
  const hrs = Math.floor(diffMin / MINS_PER_HOUR);
  const mins = diffMin % MINS_PER_HOUR;
  return mins > 0 ? `in ${hrs}h ${mins}m` : `in ${hrs}h`;
}

export function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}
