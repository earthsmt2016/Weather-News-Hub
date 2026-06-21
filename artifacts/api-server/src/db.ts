import { Pool } from "pg";

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

export const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export interface SavedArticle {
  id: string;
  userId: string;
  title: string;
  description: string;
  link: string;
  pubDate: string;
  source: string;
  deathSubject: string | null;
  savedAt: string;
}

export interface InsertSavedArticle {
  userId: string;
  title: string;
  description?: string;
  link: string;
  pubDate?: string;
  source?: string;
  deathSubject?: string | null;
}

export interface PushSubscription {
  id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  locationName: string;
  latitude: string;
  longitude: string;
  createdAt: string;
  notifyExtremeWeather: number;
  notifyGeneralWeather: number;
  notifyNewsSummary: number;
  frequencyMinutes: number;
  newsArticleCount: number;
  notifyCelebrityDeaths: number | null;
  lastNotifiedAt: string | null;
  lastCelebDeathNotifiedAt: string | null;
  scheduledTimes: string;
  quietHoursStart: string | null;
  quietHoursEnd: string | null;
}

export interface InsertPushSubscription {
  endpoint: string;
  p256dh: string;
  auth: string;
  locationName?: string;
  latitude?: string;
  longitude?: string;
}

export interface UpdateNotificationPrefs {
  endpoint: string;
  notifyExtremeWeather?: number;
  notifyGeneralWeather?: number;
  notifyNewsSummary?: number;
  frequencyMinutes?: number;
  newsArticleCount?: number;
  notifyCelebrityDeaths?: number;
  scheduledTimes?: string;
  lastNotifiedAt?: string | null;
  lastCelebDeathNotifiedAt?: string | null;
  quietHoursStart?: string | null;
  quietHoursEnd?: string | null;
}
