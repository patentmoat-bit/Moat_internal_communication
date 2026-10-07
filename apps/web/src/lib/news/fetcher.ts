import { IPNewsArticle } from "@/types/news";
import { NewsSourceAdapter } from "./types";
import { WipoAdapter } from "./adapters/wipo";
import { EpoAdapter } from "./adapters/epo";
import { UsptoAdapter } from "./adapters/uspto";
import { UkIpoAdapter } from "./adapters/ukipo";
import { IpWatchdogAdapter } from "./adapters/ipwatchdog";
import { PatentlyOAdapter } from "./adapters/patentlyo";
import { normalizeNewsItem } from "./normalizer";
import { getOct5LiveNewsAndEvents } from "./liveData";

import fs from "fs";
import path from "path";

const DISK_CACHE_PATH = "/tmp/moat_ip_news_cache.json";

function loadFromDiskCache(): { articles: IPNewsArticle[]; timestamp: number } {
  const oct5AndUpcoming = getOct5LiveNewsAndEvents();
  try {
    if (fs.existsSync(DISK_CACHE_PATH)) {
      const raw = fs.readFileSync(DISK_CACHE_PATH, "utf-8");
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed.articles) && parsed.articles.length > 0) {
        const map = new Map<string, IPNewsArticle>();
        for (const item of oct5AndUpcoming) {
          map.set(item.id, item);
        }
        for (const item of parsed.articles) {
          if (!map.has(item.id)) {
            map.set(item.id, item);
          }
        }
        const merged = Array.from(map.values()).sort(
          (a, b) => new Date(b.published_at).getTime() - new Date(a.published_at).getTime()
        );
        return { articles: merged, timestamp: parsed.timestamp || Date.now() };
      }
    }
  } catch (e) {
    // ignore
  }
  return { articles: oct5AndUpcoming, timestamp: Date.now() };
}

function saveToDiskCache(articles: IPNewsArticle[]) {
  try {
    fs.writeFileSync(
      DISK_CACHE_PATH,
      JSON.stringify({ articles, timestamp: Date.now() }),
      "utf-8"
    );
  } catch (e) {
    // ignore
  }
}

// In-memory cache for ultra-fast serving
let cachedArticles: IPNewsArticle[] = [];
let lastFetchTimestamp = 0;
let isCurrentlySyncing = false;

// Auto-refresh cache TTL: 2 minutes for fresh intelligence
const CACHE_TTL_MS = 2 * 60 * 1000;

export class NewsFetcher {
  private adapters: NewsSourceAdapter[];

  constructor() {
    this.adapters = [
      new WipoAdapter(),
      new EpoAdapter(),
      new UsptoAdapter(),
      new UkIpoAdapter(),
      new IpWatchdogAdapter(),
      new PatentlyOAdapter(),
    ];
  }

  /**
   * Fetches real live news articles across all adapters,
   * normalizes, deduplicates, safely stores new items in Supabase,
   * merges with historical records, and updates cache.
   */
  async syncLiveNews(force = false): Promise<{
    articles: IPNewsArticle[];
    newCount: number;
    failedSources: string[];
  }> {
    const now = Date.now();
    const currentCached = this.getCachedArticles();
    const lastTimestamp = (globalThis as any).__MOAT_IP_NEWS_TIMESTAMP__ || lastFetchTimestamp;
    // Return cache if valid and not forcing refresh
    if (!force && currentCached.length > 0 && now - lastTimestamp < CACHE_TTL_MS) {
      return {
        articles: currentCached,
        newCount: 0,
        failedSources: [],
      };
    }

    // Prevent duplicate parallel syncs
    if (isCurrentlySyncing && cachedArticles.length > 0) {
      return {
        articles: cachedArticles,
        newCount: 0,
        failedSources: [],
      };
    }

    isCurrentlySyncing = true;
    const failedSources: string[] = [];
    const normalizedArticles: IPNewsArticle[] = [];

    try {
      // Run all adapters concurrently with fault isolation
      const results = await Promise.allSettled(
        this.adapters.map(async (adapter) => {
          try {
            const rawItems = await adapter.fetch();
            return { adapter, rawItems };
          } catch (err: any) {
            console.warn(`[NewsFetcher] Source ${adapter.name} failed:`, err?.message || err);
            failedSources.push(adapter.name);
            return { adapter, rawItems: [] };
          }
        })
      );

      for (const res of results) {
        if (res.status === "fulfilled" && res.value.rawItems.length > 0) {
          const { adapter, rawItems } = res.value;
          for (const raw of rawItems) {
            try {
              const normalized = normalizeNewsItem(
                raw,
                adapter.name,
                adapter.sourceUrl,
                adapter.defaultJurisdiction,
                adapter.defaultCategory
              );
              normalizedArticles.push(normalized);
            } catch (e) {
              console.warn(`[NewsFetcher] Failed to normalize item from ${adapter.name}:`, e);
            }
          }
        }
      }

      // In-memory deduplication of live fetched items by URL and content_hash
      const seenUrls = new Set<string>();
      const seenHashes = new Set<string>();
      const deduplicated: IPNewsArticle[] = [];

      for (const item of normalizedArticles) {
        const url = (item.article_url || "").toLowerCase().trim();
        const hash = item.content_hash || "";
        if (url && seenUrls.has(url)) continue;
        if (hash && seenHashes.has(hash)) continue;
        if (url) seenUrls.add(url);
        if (hash) seenHashes.add(hash);
        deduplicated.push(item);
      }

      // Persist newly discovered articles safely to Supabase without duplicate key errors
      let newCount = 0;
      try {
        newCount = await this.persistToSupabase(deduplicated);
      } catch (err) {
        console.warn("[NewsFetcher] Warning saving to database:", err);
      }

      // Read comprehensive verified articles from Supabase (up to 1,000 items)
      let combined: IPNewsArticle[] = [];
      try {
        const dbArticles = await this.loadFromSupabase(1000);

        // Merge DB articles and freshly fetched live items
        const mergedMap = new Map<string, IPNewsArticle>();
        for (const item of dbArticles) {
          const key = (item.article_url || item.external_id || "").toLowerCase().trim();
          if (key) mergedMap.set(key, item);
        }
        for (const item of deduplicated) {
          const key = (item.article_url || item.external_id || "").toLowerCase().trim();
          if (key) {
            // Keep existing DB item or upgrade with live item if missing
            if (!mergedMap.has(key)) {
              mergedMap.set(key, item);
            }
          }
        }
        combined = Array.from(mergedMap.values());
      } catch (e) {
        console.warn("[NewsFetcher] Could not load from db, using in-memory live items:", e);
        combined = deduplicated.length > 0 ? deduplicated : cachedArticles;
      }

      // Merge verified October 5, 2026 bulletins and live upcoming IP events
      const liveEvents = getOct5LiveNewsAndEvents();
      const combinedMap = new Map<string, IPNewsArticle>();
      for (const item of liveEvents) {
        combinedMap.set(item.id, item);
      }
      for (const item of combined) {
        if (!combinedMap.has(item.id)) {
          combinedMap.set(item.id, item);
        }
      }
      combined = Array.from(combinedMap.values());

      // Sort strictly by publication date DESC (Newest to Oldest)
      combined.sort((a, b) => {
        const timeA = new Date(a.published_at).getTime() || 0;
        const timeB = new Date(b.published_at).getTime() || 0;
        return timeB - timeA;
      });

      if (combined.length > 0) {
        cachedArticles = combined;
        (globalThis as any).__MOAT_IP_NEWS_CACHE__ = combined;
        (globalThis as any).__MOAT_IP_NEWS_TIMESTAMP__ = Date.now();
        saveToDiskCache(combined);
      }
      lastFetchTimestamp = Date.now();

      return {
        articles: this.getCachedArticles(),
        newCount,
        failedSources,
      };
    } finally {
      isCurrentlySyncing = false;
    }
  }

  /**
   * Persist only genuinely new articles into Supabase ip_news table
   * by pre-checking existing external_id and content_hash.
   */
  private async persistToSupabase(articles: IPNewsArticle[]): Promise<number> {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !serviceRoleKey || articles.length === 0) return 0;

    // 1. Fetch existing hashes and external IDs from Supabase to prevent 409 conflicts
    const existingExtIds = new Set<string>();
    const existingHashes = new Set<string>();

    try {
      let offset = 0;
      while (true) {
        const checkRes = await fetch(
          `${supabaseUrl}/rest/v1/ip_news?select=external_id,content_hash&limit=1000&offset=${offset}`,
          {
            headers: {
              apikey: serviceRoleKey,
              Authorization: `Bearer ${serviceRoleKey}`,
            },
            cache: "no-store",
          }
        );
        if (!checkRes.ok) break;
        const rows: { external_id: string; content_hash: string }[] = await checkRes.json();
        if (!rows || rows.length === 0) break;
        for (const r of rows) {
          if (r.external_id) existingExtIds.add(r.external_id);
          if (r.content_hash) existingHashes.add(r.content_hash);
        }
        if (rows.length < 1000) break;
        offset += 1000;
      }
    } catch (e) {
      console.warn("[NewsFetcher] Warning fetching existing ids from Supabase:", e);
    }

    // 2. Filter to truly new articles
    const newArticles = articles.filter((a) => {
      const extId = a.external_id?.trim();
      const hash = a.content_hash?.trim();
      if (extId && existingExtIds.has(extId)) return false;
      if (hash && existingHashes.has(hash)) return false;
      return true;
    });

    if (newArticles.length === 0) {
      return 0;
    }

    // 3. Insert new articles in safe batches of 20 with fallback to single item insert
    let successfullyInserted = 0;
    const batchSize = 20;

    for (let i = 0; i < newArticles.length; i += batchSize) {
      const chunk = newArticles.slice(i, i + batchSize).map((a) => ({
        external_id: a.external_id,
        title: a.title,
        source_name: a.source_name,
        source_url: a.source_url,
        article_url: a.article_url,
        published_at: a.published_at,
        category: a.category,
        summary: a.summary,
        content_excerpt: a.content_excerpt,
        image_url: a.image_url,
        author: a.author,
        tags: a.tags,
        jurisdiction: a.jurisdiction,
        language: a.language,
        content_hash: a.content_hash,
        executive_summary: a.executive_summary,
        key_points: a.key_points,
        why_it_matters: a.why_it_matters,
        is_active: a.is_active,
      }));

      try {
        const res = await fetch(`${supabaseUrl}/rest/v1/ip_news`, {
          method: "POST",
          headers: {
            apikey: serviceRoleKey,
            Authorization: `Bearer ${serviceRoleKey}`,
            "Content-Type": "application/json",
            Prefer: "return=representation",
          },
          body: JSON.stringify(chunk),
        });

        if (res.ok) {
          const inserted = await res.json();
          successfullyInserted += Array.isArray(inserted) ? inserted.length : chunk.length;
        } else {
          // If batch fails, try one-by-one so individual duplicates don't abort other valid items
          for (const single of chunk) {
            try {
              const singleRes = await fetch(`${supabaseUrl}/rest/v1/ip_news`, {
                method: "POST",
                headers: {
                  apikey: serviceRoleKey,
                  Authorization: `Bearer ${serviceRoleKey}`,
                  "Content-Type": "application/json",
                  Prefer: "return=minimal",
                },
                body: JSON.stringify(single),
              });
              if (singleRes.ok) successfullyInserted++;
            } catch {
              // Ignore single item error
            }
          }
        }
      } catch (chunkErr) {
        console.warn("[NewsFetcher] Error inserting chunk:", chunkErr);
      }
    }

    return successfullyInserted;
  }

  /**
   * Loads verified articles from Supabase ordered strictly by published_at DESC.
   */
  async loadFromSupabase(limit = 1000): Promise<IPNewsArticle[]> {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !serviceRoleKey) return [];

    const res = await fetch(
      `${supabaseUrl}/rest/v1/ip_news?select=*&order=published_at.desc&limit=${limit}`,
      {
        headers: {
          apikey: serviceRoleKey,
          Authorization: `Bearer ${serviceRoleKey}`,
        },
        cache: "no-store",
      }
    );

    if (!res.ok) {
      throw new Error(`Failed to load from Supabase: ${res.status}`);
    }

    const data: IPNewsArticle[] = await res.json();
    return data;
  }

  getCachedArticles(): IPNewsArticle[] {
    const liveEvents = getOct5LiveNewsAndEvents();
    let baseArticles: IPNewsArticle[] = [];
    const globalCache = (globalThis as any).__MOAT_IP_NEWS_CACHE__;
    if (Array.isArray(globalCache) && globalCache.length > 0) {
      baseArticles = globalCache;
    } else {
      const disk = loadFromDiskCache();
      if (disk.articles.length > 0) {
        baseArticles = disk.articles;
      } else {
        baseArticles = cachedArticles;
      }
    }

    const map = new Map<string, IPNewsArticle>();
    for (const item of liveEvents) {
      map.set(item.id, item);
    }
    for (const item of baseArticles) {
      if (!map.has(item.id)) {
        map.set(item.id, item);
      }
    }

    const merged = Array.from(map.values()).sort(
      (a, b) => new Date(b.published_at).getTime() - new Date(a.published_at).getTime()
    );

    (globalThis as any).__MOAT_IP_NEWS_CACHE__ = merged;
    cachedArticles = merged;
    return merged;
  }

  getLastFetchTimestamp(): number {
    return lastFetchTimestamp;
  }

  isSyncing(): boolean {
    return isCurrentlySyncing;
  }
}

export const newsFetcher = new NewsFetcher();

// Background periodic automatic synchronization every 3 minutes
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    newsFetcher.syncLiveNews(true).catch((err) => {
      console.warn("[NewsFetcher Background Sync] Periodic refresh error:", err);
    });
  }, 3 * 60 * 1000);
}
