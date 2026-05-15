import { z } from "zod";

export const weatherConditionSchema = z.object({
  time: z.string(),
  temperature: z.number(),
  feelsLike: z.number(),
  humidity: z.number(),
  windSpeed: z.number(),
  weatherCode: z.number(),
  precipitation: z.number(),
  cloudCover: z.number(),
  isDay: z.number(),
  uvIndex: z.number(),
});

export const dailyForecastSchema = z.object({
  date: z.string(),
  weatherCode: z.number(),
  temperatureMax: z.number(),
  temperatureMin: z.number(),
  precipitationSum: z.number(),
  windSpeedMax: z.number(),
  precipitationProbabilityMax: z.number(),
  sunrise: z.string(),
  sunset: z.string(),
  uvIndexMax: z.number(),
});

export const deathArticleSchema = z.object({
  title: z.string(),
  description: z.string(),
  link: z.string(),
  pubDate: z.string(),
  source: z.string(),
  deathSubject: z.string().nullish(),
});

export type WeatherCondition = z.infer<typeof weatherConditionSchema>;
export type DailyForecast = z.infer<typeof dailyForecastSchema>;
export type DeathArticle = z.infer<typeof deathArticleSchema>;

export {
  pushSubscriptions,
  savedArticles,
  updateNotificationPrefsSchema,
  insertPushSubscriptionSchema,
  insertSavedArticleSchema,
  type PushSubscription,
  type InsertPushSubscription,
  type UpdateNotificationPrefs,
  type SavedArticle,
  type InsertSavedArticle,
} from "@workspace/db";
