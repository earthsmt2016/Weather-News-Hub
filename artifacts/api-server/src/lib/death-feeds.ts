import { logger } from "./logger";
import { DEATH_FETCH_TIMEOUT_MS, THREE_DAYS_MS } from "./constants";

export interface DeathArticle {
  title: string;
  description: string;
  link: string;
  pubDate: string;
  source: string;
  deathSubject?: string | null;
}

const DEATHS_CACHE_TTL = 15 * 60 * 1000;

interface RawFeedItem {
  title: string;
  description: string;
  link: string;
  pubDate: string;
  source: string;
}

interface DeathsCache {
  articles: DeathArticle[];
  lastUpdated: string;
  fetchedAt: number;
}

let deathsCache: DeathsCache | null = null;

export function getDeathsCache(): DeathsCache | null {
  if (!deathsCache || Date.now() - deathsCache.fetchedAt > DEATHS_CACHE_TTL) return null;
  return deathsCache;
}

export function setDeathsCache(articles: DeathArticle[]): void {
  deathsCache = { articles, lastUpdated: new Date().toISOString(), fetchedAt: Date.now() };
}

const DEATH_WORDS = /\b(?:dies?|died|dead|is dead|passes? away|passed away|passing|death|obituar)\b/i;
const LEADING_DESCRIPTORS = /^(?:action\s+movie\s+star|legendary|beloved|famous|veteran|acclaimed|iconic|celebrated|award.winning|oscar.winning|grammy.winning|emmy.winning|hall\s+of\s+fame\s+(?:actor|singer|musician|athlete)?|(?:actor|actress|singer|musician|athlete|comedian|director|author|tv\s+star|film\s+star|rock\s+star|pop\s+star|rap\s+star|country\s+star|nfl|nba|mlb|nhl|tennis|boxing)\s+)\s*/i;
const STOP_WORDS = /^(?:the|a|an|has|have|had|was|were|is|are|be|been|being|and|but|or|yet|so|for|nor|at|by|in|of|on|to|up|as|if|it|he|she|they|we|you|i|my|his|her|their|our|your|its|that|this|these|those|who|which|what|when|where|why|how|not|no|yes)$/i;
const ROUNDUP_PATTERNS = /\b(?:celebrity deaths of \d{4}|stars we lost|people who died in|celebrities.*died in \d{4}|legends.*died in \d{4}|celebrities and legends who died|famous people we lost|deaths.*mark \d{4}|industry loses|photo gallery.*obituar)\b/i;

const NON_NAME_WORDS = new Set([
  "internet","celebrity","star","found","breaking","news","actor","actress","singer",
  "musician","athlete","comedian","director","author","tv","film","famous","beloved",
  "legendary","veteran","acclaimed","iconic","celebrated","dead","died","dies","death",
  "passing","murder","killed","suspected","police","sources","family","report","confirms",
  "announces","inside","major","surprise","final","days","rip","tribute","tributes",
  "mourning","remembering","uk","us","american","british",
]);

function stripLeadingDescriptors(raw: string): string {
  return raw.replace(LEADING_DESCRIPTORS, "").trim();
}

function isLikelyPersonName(words: string[]): boolean {
  if (words.length < 2 || words.length > 5) return false;
  return words.every(w => !NON_NAME_WORDS.has(w.toLowerCase()) && /^[A-Z]/.test(w) && w.length >= 2);
}

function extractDeathSubject(title: string): string | null {
  if (!DEATH_WORDS.test(title)) return null;
  if (ROUNDUP_PATTERNS.test(title)) return null;
  const t = title.replace(/['"'']/g, "").trim();

  const DEATH_KW = "(?:dies?|died|dead(?:\\s+at)?|is\\s+dead|passes?\\s+away|passed\\s+away)";
  const NAME_WORD = "[A-Z][a-zA-Z'.\\-]{1,}";
  const NAME = `(${NAME_WORD}(?:\\s+${NAME_WORD}){1,4})`;

  const patterns = [
    new RegExp(`^${NAME}\\s+(?:has\\s+)?${DEATH_KW}`),
    new RegExp(`^${NAME},(?:[^,]{0,60},)?\\s*${DEATH_KW}`),
    new RegExp(`^${NAME},\\s+(?:famous|beloved|legendary|veteran|acclaimed|star|actor|actress|singer|musician|athlete|comedian|director|author|tv|film)`),
    new RegExp(`(?:[Dd]eath\\s+of|[Rr][Ii][Pp][:\\s]+|[Oo]bituari?e?s?[:\\s]+)${NAME}(?:\\s+at|\\s+aged|[,.:()\\[]|$)`),
    new RegExp(`^${NAME}(?:\\s+|,\\s*.{0,80}\\s+[–—-]\\s*)obituar`),
  ];

  for (const re of patterns) {
    const m = t.match(re);
    if (m && m[1]) {
      const raw = m[1].trim();
      const cleaned = stripLeadingDescriptors(raw);
      const words = cleaned.split(/\s+/);
      const validWords = words.filter(w => !STOP_WORDS.test(w) && /^[A-Z]/.test(w));
      if (isLikelyPersonName(validWords)) {
        return validWords.join(" ");
      }
    }
  }
  return null;
}

function normaliseSubject(s: string): string {
  return s.toLowerCase().replace(/\s+/g, " ").trim();
}

function subjectsOverlap(a: string, b: string): boolean {
  const na = normaliseSubject(a);
  const nb = normaliseSubject(b);
  if (na === nb) return true;
  const wordsA = new Set(na.split(/\s+/));
  const wordsB = new Set(nb.split(/\s+/));
  const shared = Array.from(wordsA).filter(w => wordsB.has(w) && w.length > 2);
  const minLen = Math.min(wordsA.size, wordsB.size);
  return minLen > 0 && shared.length / minLen >= 0.6;
}

function deduplicateDeaths(articles: RawFeedItem[]): DeathArticle[] {
  const seenSubjects: string[] = [];
  const seenLinks = new Set<string>();
  const result: DeathArticle[] = [];
  for (const article of articles) {
    if (!article.link || seenLinks.has(article.link)) continue;
    seenLinks.add(article.link);
    const subject = extractDeathSubject(article.title);
    if (!subject) continue;
    const norm = normaliseSubject(subject);
    if (seenSubjects.some(s => subjectsOverlap(s, norm))) continue;
    seenSubjects.push(norm);
    result.push({ ...article, deathSubject: subject });
  }
  return result;
}

export async function fetchCelebrityDeathArticles(): Promise<DeathArticle[]> {
  const Parser = (await import("rss-parser")).default;
  const parser = new Parser({
    timeout: DEATH_FETCH_TIMEOUT_MS,
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; NewsAggregator/1.0)",
      "Accept": "application/rss+xml, application/xml, text/xml, */*",
    },
  });
  const threeDaysAgo = Date.now() - THREE_DAYS_MS;
  const feeds = [
    { url: "https://feeds.bbci.co.uk/news/entertainment_and_arts/rss.xml", label: "BBC Entertainment" },
    { url: "https://www.theguardian.com/tone/obituaries/rss", label: "The Guardian" },
    { url: "https://rss.nytimes.com/services/xml/rss/nyt/Obituaries.xml", label: "NY Times Obituaries" },
    { url: "https://news.google.com/rss/search?q=actor+OR+singer+OR+musician+OR+star+dies+OR+dead+OR+passed+away&hl=en-GB&gl=GB&ceid=GB:en", label: "Google News - Stars" },
    { url: "https://news.google.com/rss/search?q=celebrity+death+obituary+2026&hl=en&gl=US&ceid=US:en", label: "Google News - Obituaries" },
  ];
  const allArticles: RawFeedItem[] = [];
  const results = await Promise.allSettled(feeds.map(async (feed) => {
    try {
      const parsed = await parser.parseURL(feed.url);
      return (parsed.items || []).map(item => ({
        title: item.title || "Untitled",
        description: item.contentSnippet || item.content || "",
        link: item.link || "",
        pubDate: item.pubDate || new Date().toISOString(),
        source: feed.label,
      }));
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      logger.warn(`Celebrity deaths feed error (${feed.label}): ${msg}`);
      return [];
    }
  }));
  for (const r of results) {
    if (r.status === "fulfilled") allArticles.push(...r.value);
  }
  const recent = allArticles.filter(a => {
    try { return new Date(a.pubDate).getTime() >= threeDaysAgo; } catch { return false; }
  });
  const deduped = deduplicateDeaths(recent);
  deduped.sort((a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime());
  return deduped.slice(0, 30);
}
