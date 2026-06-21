import {
  type InsertPushSubscription,
  type PushSubscription,
  type UpdateNotificationPrefs,
  type InsertSavedArticle,
  type SavedArticle,
  pushSubscriptions,
  savedArticles,
  db,
} from "@workspace/db";
import { eq, and } from "drizzle-orm";

export interface IStorage {
  savePushSubscription(subscription: InsertPushSubscription): Promise<PushSubscription>;
  getPushSubscriptions(): Promise<PushSubscription[]>;
  getPushSubscriptionByEndpoint(endpoint: string): Promise<PushSubscription | undefined>;
  updateNotificationPrefs(prefs: UpdateNotificationPrefs): Promise<PushSubscription | undefined>;
  deletePushSubscription(endpoint: string): Promise<void>;
  getSavedArticles(userId: string): Promise<SavedArticle[]>;
  saveArticle(article: InsertSavedArticle): Promise<SavedArticle>;
  deleteSavedArticle(userId: string, link: string): Promise<void>;
  clearSavedArticles(userId: string): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  async savePushSubscription(subscription: InsertPushSubscription): Promise<PushSubscription> {
    const [result] = await db
      .insert(pushSubscriptions)
      .values(subscription)
      .onConflictDoUpdate({
        target: pushSubscriptions.endpoint,
        set: {
          p256dh: subscription.p256dh,
          auth: subscription.auth,
          locationName: subscription.locationName,
          latitude: subscription.latitude,
          longitude: subscription.longitude,
        },
      })
      .returning();
    return result;
  }

  async getPushSubscriptions(): Promise<PushSubscription[]> {
    return await db.select().from(pushSubscriptions);
  }

  async getPushSubscriptionByEndpoint(endpoint: string): Promise<PushSubscription | undefined> {
    const [result] = await db.select().from(pushSubscriptions).where(eq(pushSubscriptions.endpoint, endpoint));
    return result;
  }

  async updateNotificationPrefs(prefs: UpdateNotificationPrefs): Promise<PushSubscription | undefined> {
    const updateData: Record<string, unknown> = {};
    if (prefs.notifyExtremeWeather !== undefined) updateData.notifyExtremeWeather = prefs.notifyExtremeWeather;
    if (prefs.notifyGeneralWeather !== undefined) updateData.notifyGeneralWeather = prefs.notifyGeneralWeather;
    if (prefs.notifyNewsSummary !== undefined) updateData.notifyNewsSummary = prefs.notifyNewsSummary;
    if (prefs.frequencyMinutes !== undefined) updateData.frequencyMinutes = prefs.frequencyMinutes;
    if (prefs.newsArticleCount !== undefined) updateData.newsArticleCount = prefs.newsArticleCount;
    if (prefs.notifyCelebrityDeaths !== undefined) updateData.notifyCelebrityDeaths = prefs.notifyCelebrityDeaths;
    if (prefs.scheduledTimes !== undefined) updateData.scheduledTimes = prefs.scheduledTimes;
    if (prefs.lastNotifiedAt !== undefined) updateData.lastNotifiedAt = prefs.lastNotifiedAt;
    if (prefs.lastCelebDeathNotifiedAt !== undefined) updateData.lastCelebDeathNotifiedAt = prefs.lastCelebDeathNotifiedAt;
    if (prefs.quietHoursStart !== undefined) updateData.quietHoursStart = prefs.quietHoursStart;
    if (prefs.quietHoursEnd !== undefined) updateData.quietHoursEnd = prefs.quietHoursEnd;

    const [result] = await db
      .update(pushSubscriptions)
      .set(updateData)
      .where(eq(pushSubscriptions.endpoint, prefs.endpoint))
      .returning();
    return result;
  }

  async deletePushSubscription(endpoint: string): Promise<void> {
    await db.delete(pushSubscriptions).where(eq(pushSubscriptions.endpoint, endpoint));
  }

  async getSavedArticles(userId: string): Promise<SavedArticle[]> {
    return await db.select().from(savedArticles)
      .where(eq(savedArticles.userId, userId));
  }

  async saveArticle(article: InsertSavedArticle): Promise<SavedArticle> {
    const existing = await db.select().from(savedArticles)
      .where(and(eq(savedArticles.userId, article.userId), eq(savedArticles.link, article.link)));
    if (existing.length > 0) return existing[0];
    const [result] = await db.insert(savedArticles).values(article).returning();
    return result;
  }

  async deleteSavedArticle(userId: string, link: string): Promise<void> {
    await db.delete(savedArticles)
      .where(and(eq(savedArticles.userId, userId), eq(savedArticles.link, link)));
  }

  async clearSavedArticles(userId: string): Promise<void> {
    await db.delete(savedArticles).where(eq(savedArticles.userId, userId));
  }
}

export const storage = new DatabaseStorage();
