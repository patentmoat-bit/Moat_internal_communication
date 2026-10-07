import { NextRequest, NextResponse } from "next/server";
import { newsFetcher } from "@/lib/news/fetcher";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const syncResult = await newsFetcher.syncLiveNews(true);

    return NextResponse.json({
      success: true,
      refreshed: true,
      total_articles: syncResult.articles.length,
      new_articles_count: syncResult.newCount,
      failed_sources: syncResult.failedSources,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("[POST /api/ceo/news/refresh] Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error?.message || "Failed to trigger live news sync",
      },
      { status: 500 }
    );
  }
}
