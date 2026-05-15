import { z } from "zod";
import { pgTable, text, varchar, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { sql } from "drizzle-orm";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const savedArticles = pgTable("saved_articles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  title: text("title").notNull(),
  description: text("description").notNull().default(""),
  link: text("link").notNull(),
  pubDate: text("pub_date").notNull().default(""),
  source: text("source").notNull().default(""),
  deathSubject: text("death_subject"),
  savedAt: text("saved_at").notNull().default(sql`now()`),
});

export const pushSubscriptions = pgTable("push_subscriptions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  endpoint: text("endpoint").notNull().unique(),
  p256dh: text("p256dh").notNull(),
  auth: text("auth").notNull(),
  locationName: text("location_name").notNull().default("Birmingham & Solihull"),
  latitude: text("latitude").notNull().default("52.4862"),
  longitude: text("longitude").notNull().default("-1.8904"),
  createdAt: text("created_at").notNull().default(sql`now()`),
  notifyExtremeWeather: integer("notify_extreme_weather").notNull().default(1),
  notifyGeneralWeather: integer("notify_general_weather").notNull().default(0),
  notifyNewsSummary: integer("notify_news_summary").notNull().default(0),
  frequencyMinutes: integer("frequency_minutes").notNull().default(30),
  newsArticleCount: integer("news_article_count").notNull().default(3),
  notifyCelebrityDeaths: integer("notify_celebrity_deaths").notNull().default(1),
  lastNotifiedAt: text("last_notified_at"),
  lastCelebDeathNotifiedAt: text("last_celeb_death_notified_at"),
  scheduledTimes: text("scheduled_times").notNull().default(""),
  quietHoursStart: text("quiet_hours_start"),
  quietHoursEnd: text("quiet_hours_end"),
});

export const insertSavedArticleSchema = createInsertSchema(savedArticles).omit({ id: true, savedAt: true });
export const insertPushSubscriptionSchema = createInsertSchema(pushSubscriptions).omit({
  id: true,
  createdAt: true,
});

export const updateNotificationPrefsSchema = z.object({
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

export type InsertSavedArticle = z.infer<typeof insertSavedArticleSchema>;
export type SavedArticle = typeof savedArticles.$inferSelect;
export type InsertPushSubscription = z.infer<typeof insertPushSubscriptionSchema>;
export type PushSubscription = typeof pushSubscriptions.$inferSelect;
export type UpdateNotificationPrefs = z.infer<typeof updateNotificationPrefsSchema>;
