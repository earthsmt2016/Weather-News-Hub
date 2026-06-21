import {
  type InsertPushSubscription,
  type PushSubscription,
  type UpdateNotificationPrefs,
  type InsertSavedArticle,
  type SavedArticle,
  pool,
} from "./db";

interface PushSubscriptionRow {
  id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  location_name: string;
  latitude: string;
  longitude: string;
  created_at: string;
  notify_extreme_weather: number;
  notify_general_weather: number;
  notify_news_summary: number;
  frequency_minutes: number;
  news_article_count: number;
  notify_celebrity_deaths: number | null;
  last_notified_at: string | null;
  last_celeb_death_notified_at: string | null;
  scheduled_times: string;
  quiet_hours_start: string | null;
  quiet_hours_end: string | null;
}

interface SavedArticleRow {
  id: string;
  user_id: string;
  title: string;
  description: string;
  link: string;
  pub_date: string;
  source: string;
  death_subject: string | null;
  saved_at: string;
}

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

const pushSubscriptionColumns = `
  id,
  endpoint,
  p256dh,
  auth,
  location_name,
  latitude,
  longitude,
  created_at,
  notify_extreme_weather,
  notify_general_weather,
  notify_news_summary,
  frequency_minutes,
  news_article_count,
  notify_celebrity_deaths,
  last_notified_at,
  last_celeb_death_notified_at,
  scheduled_times,
  quiet_hours_start,
  quiet_hours_end
`;

const savedArticleColumns = `
  id,
  user_id,
  title,
  description,
  link,
  pub_date,
  source,
  death_subject,
  saved_at
`;

function toPushSubscription(row: PushSubscriptionRow): PushSubscription {
  return {
    id: row.id,
    endpoint: row.endpoint,
    p256dh: row.p256dh,
    auth: row.auth,
    locationName: row.location_name,
    latitude: row.latitude,
    longitude: row.longitude,
    createdAt: row.created_at,
    notifyExtremeWeather: row.notify_extreme_weather,
    notifyGeneralWeather: row.notify_general_weather,
    notifyNewsSummary: row.notify_news_summary,
    frequencyMinutes: row.frequency_minutes,
    newsArticleCount: row.news_article_count,
    notifyCelebrityDeaths: row.notify_celebrity_deaths,
    lastNotifiedAt: row.last_notified_at,
    lastCelebDeathNotifiedAt: row.last_celeb_death_notified_at,
    scheduledTimes: row.scheduled_times,
    quietHoursStart: row.quiet_hours_start,
    quietHoursEnd: row.quiet_hours_end,
  };
}

function toSavedArticle(row: SavedArticleRow): SavedArticle {
  return {
    id: row.id,
    userId: row.user_id,
    title: row.title,
    description: row.description,
    link: row.link,
    pubDate: row.pub_date,
    source: row.source,
    deathSubject: row.death_subject,
    savedAt: row.saved_at,
  };
}

export class DatabaseStorage implements IStorage {
  async savePushSubscription(subscription: InsertPushSubscription): Promise<PushSubscription> {
    const result = await pool.query<PushSubscriptionRow>(
      `
        insert into push_subscriptions (
          endpoint,
          p256dh,
          auth,
          location_name,
          latitude,
          longitude
        )
        values ($1, $2, $3, coalesce($4, 'Birmingham & Solihull'), coalesce($5, '52.4862'), coalesce($6, '-1.8904'))
        on conflict (endpoint) do update set
          p256dh = excluded.p256dh,
          auth = excluded.auth,
          location_name = excluded.location_name,
          latitude = excluded.latitude,
          longitude = excluded.longitude
        returning ${pushSubscriptionColumns}
      `,
      [
        subscription.endpoint,
        subscription.p256dh,
        subscription.auth,
        subscription.locationName,
        subscription.latitude,
        subscription.longitude,
      ],
    );

    return toPushSubscription(result.rows[0]);
  }

  async getPushSubscriptions(): Promise<PushSubscription[]> {
    const result = await pool.query<PushSubscriptionRow>(
      `select ${pushSubscriptionColumns} from push_subscriptions`,
    );
    return result.rows.map(toPushSubscription);
  }

  async getPushSubscriptionByEndpoint(endpoint: string): Promise<PushSubscription | undefined> {
    const result = await pool.query<PushSubscriptionRow>(
      `select ${pushSubscriptionColumns} from push_subscriptions where endpoint = $1`,
      [endpoint],
    );
    return result.rows[0] ? toPushSubscription(result.rows[0]) : undefined;
  }

  async updateNotificationPrefs(prefs: UpdateNotificationPrefs): Promise<PushSubscription | undefined> {
    const fieldMap: Partial<Record<keyof UpdateNotificationPrefs, string>> = {
      notifyExtremeWeather: "notify_extreme_weather",
      notifyGeneralWeather: "notify_general_weather",
      notifyNewsSummary: "notify_news_summary",
      frequencyMinutes: "frequency_minutes",
      newsArticleCount: "news_article_count",
      notifyCelebrityDeaths: "notify_celebrity_deaths",
      scheduledTimes: "scheduled_times",
      lastNotifiedAt: "last_notified_at",
      lastCelebDeathNotifiedAt: "last_celeb_death_notified_at",
      quietHoursStart: "quiet_hours_start",
      quietHoursEnd: "quiet_hours_end",
    };
    const values: unknown[] = [];
    const setClauses: string[] = [];

    for (const [key, column] of Object.entries(fieldMap) as [keyof UpdateNotificationPrefs, string][]) {
      if (prefs[key] !== undefined) {
        values.push(prefs[key]);
        setClauses.push(`${column} = $${values.length}`);
      }
    }

    if (setClauses.length === 0) {
      return this.getPushSubscriptionByEndpoint(prefs.endpoint);
    }

    values.push(prefs.endpoint);
    const result = await pool.query<PushSubscriptionRow>(
      `
        update push_subscriptions
        set ${setClauses.join(", ")}
        where endpoint = $${values.length}
        returning ${pushSubscriptionColumns}
      `,
      values,
    );

    return result.rows[0] ? toPushSubscription(result.rows[0]) : undefined;
  }

  async deletePushSubscription(endpoint: string): Promise<void> {
    await pool.query("delete from push_subscriptions where endpoint = $1", [endpoint]);
  }

  async getSavedArticles(userId: string): Promise<SavedArticle[]> {
    const result = await pool.query<SavedArticleRow>(
      `select ${savedArticleColumns} from saved_articles where user_id = $1`,
      [userId],
    );
    return result.rows.map(toSavedArticle);
  }

  async saveArticle(article: InsertSavedArticle): Promise<SavedArticle> {
    const existing = await pool.query<SavedArticleRow>(
      `select ${savedArticleColumns} from saved_articles where user_id = $1 and link = $2`,
      [article.userId, article.link],
    );

    if (existing.rows[0]) return toSavedArticle(existing.rows[0]);

    const result = await pool.query<SavedArticleRow>(
      `
        insert into saved_articles (
          user_id,
          title,
          description,
          link,
          pub_date,
          source,
          death_subject
        )
        values ($1, $2, coalesce($3, ''), $4, coalesce($5, ''), coalesce($6, ''), $7)
        returning ${savedArticleColumns}
      `,
      [
        article.userId,
        article.title,
        article.description,
        article.link,
        article.pubDate,
        article.source,
        article.deathSubject,
      ],
    );

    return toSavedArticle(result.rows[0]);
  }

  async deleteSavedArticle(userId: string, link: string): Promise<void> {
    await pool.query(
      "delete from saved_articles where user_id = $1 and link = $2",
      [userId, link],
    );
  }

  async clearSavedArticles(userId: string): Promise<void> {
    await pool.query("delete from saved_articles where user_id = $1", [userId]);
  }
}

export const storage = new DatabaseStorage();
