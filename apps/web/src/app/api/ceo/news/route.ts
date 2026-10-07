import { NextRequest, NextResponse } from "next/server";
import { newsFetcher } from "@/lib/news/fetcher";
import { IPNewsArticle, IPNewsResponse } from "@/types/news";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "12", 10)));
    const source = searchParams.get("source") || "All";
    const category = searchParams.get("category") || "All";
    const sort = searchParams.get("sort") === "oldest" ? "oldest" : "latest";
    const search = (searchParams.get("search") || "").trim().toLowerCase();
    const dateFrom = searchParams.get("date_from") || "";
    const dateTo = searchParams.get("date_to") || "";

    // 1. Ensure we have fresh articles in cache / DB; syncLiveNews(false) checks TTL automatically
    const syncResult = await newsFetcher.syncLiveNews(false);
    let allArticles = syncResult.articles;

    // 2. Compute dynamic aggregate counts for all available sources and categories (before filter)
    const sourceCountMap: Record<string, number> = {};
    const categoryCountMap: Record<string, number> = {};

    for (const a of allArticles) {
      sourceCountMap[a.source_name] = (sourceCountMap[a.source_name] || 0) + 1;
      categoryCountMap[a.category] = (categoryCountMap[a.category] || 0) + 1;
    }

    const sources = Object.entries(sourceCountMap)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);

    const categories = Object.entries(categoryCountMap)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);

    // 3. Apply filters
    const quickDate = searchParams.get("quick_date") || "";
    const impactFilter = searchParams.get("impact") || "All";
    const jurisdictionFilter = searchParams.get("jurisdiction") || "All";

    let filtered = allArticles.filter((article) => {
      // Source filter
      if (source !== "All" && article.source_name.toLowerCase() !== source.toLowerCase()) {
        return false;
      }

      // Category filter
      if (category !== "All" && article.category.toLowerCase() !== category.toLowerCase()) {
        return false;
      }

      // Impact filter
      if (impactFilter !== "All" && article.impact_level !== impactFilter) {
        return false;
      }

      // Jurisdiction filter
      if (jurisdictionFilter !== "All" && (article.jurisdiction || "").toLowerCase() !== jurisdictionFilter.toLowerCase()) {
        return false;
      }

      const articleTime = new Date(article.published_at).getTime() || 0;

      // Quick date filter presets
      if (quickDate === "today") {
        const now = Date.now();
        // Match today's calendar date and past 36 hours (covering Oct 5 and Oct 6 worldwide calendar dates)
        const past36h = now - 36 * 60 * 60 * 1000;
        if (articleTime < past36h) return false;
      } else if (quickDate === "upcoming") {
        if (!article.is_upcoming_event && (!article.event_date || new Date(article.event_date).getTime() < Date.now())) {
          return false;
        }
      } else if (quickDate === "48h") {
        const past48h = Date.now() - 48 * 60 * 60 * 1000;
        if (articleTime < past48h) return false;
      } else if (quickDate === "7d") {
        const past7d = Date.now() - 7 * 24 * 60 * 60 * 1000;
        if (articleTime < past7d) return false;
      }

      // Date range filter
      if (dateFrom) {
        const fromTime = new Date(dateFrom).getTime();
        if (articleTime < fromTime) return false;
      }
      if (dateTo) {
        const toDateObj = new Date(dateTo);
        if (dateTo.length === 10) {
          toDateObj.setHours(23, 59, 59, 999);
        }
        const toTime = toDateObj.getTime();
        if (articleTime > toTime) return false;
      }

      // Search keyword filter
      if (search) {
        const titleMatch = article.title.toLowerCase().includes(search);
        const summaryMatch = (article.summary || "").toLowerCase().includes(search);
        const excerptMatch = (article.content_excerpt || "").toLowerCase().includes(search);
        const sourceMatch = article.source_name.toLowerCase().includes(search);
        const categoryMatch = article.category.toLowerCase().includes(search);
        if (!titleMatch && !summaryMatch && !excerptMatch && !sourceMatch && !categoryMatch) {
          return false;
        }
      }

      return true;
    });

    // 4. Sort strictly by publication date (or event date for upcoming events)
    filtered.sort((a, b) => {
      if (quickDate === "upcoming") {
        const timeA = new Date(a.event_date || a.published_at).getTime() || 0;
        const timeB = new Date(b.event_date || b.published_at).getTime() || 0;
        return timeA - timeB;
      }
      const timeA = new Date(a.published_at).getTime() || 0;
      const timeB = new Date(b.published_at).getTime() || 0;
      return sort === "oldest" ? timeA - timeB : timeB - timeA;
    });

    // 5. Pagination
    const total = filtered.length;
    const totalPages = Math.ceil(total / limit) || 1;
    const startIndex = (page - 1) * limit;
    const paginatedArticles = filtered.slice(startIndex, startIndex + limit);

    const lastUpdated = new Date(newsFetcher.getLastFetchTimestamp() || Date.now()).toISOString();

    const upcomingEvents = allArticles
      .filter((a) => a.is_upcoming_event || (a.event_date && new Date(a.event_date).getTime() >= (Date.now() - 24 * 60 * 60 * 1000)))
      .sort((a, b) => new Date(a.event_date || a.published_at).getTime() - new Date(b.event_date || b.published_at).getTime())
      .slice(0, 8);

    const stats = {
      high_impact_count: allArticles.filter((a) => a.impact_level === "HIGH").length,
      new_developments_count: allArticles.filter((a) => a.category === "Technology" || a.category === "Patents").length,
      competitor_events_count: allArticles.filter((a) => a.category === "Competitor IP" || a.is_competitor_related).length,
      regulatory_changes_count: allArticles.filter((a) => a.category === "Regulatory").length,
      upcoming_events_count: upcomingEvents.length,
    };

    const response: IPNewsResponse = {
      articles: paginatedArticles,
      total,
      page,
      limit,
      totalPages,
      last_updated: lastUpdated,
      sources,
      categories,
      upcoming_events: upcomingEvents,
      stats,
    };

    return NextResponse.json({ success: true, ...response });
  } catch (error: any) {
    console.error("[GET /api/ceo/news] Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error?.message || "Failed to retrieve IP news",
        articles: [],
        total: 0,
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const syncResult = await newsFetcher.syncLiveNews(true);

    return NextResponse.json({
      success: true,
      refreshed: true,
      total: syncResult.articles.length,
      new_articles_count: syncResult.newCount,
      failed_sources: syncResult.failedSources,
      last_updated: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("[POST /api/ceo/news] Refresh error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error?.message || "Failed to refresh IP news",
      },
      { status: 500 }
    );
  }
}
