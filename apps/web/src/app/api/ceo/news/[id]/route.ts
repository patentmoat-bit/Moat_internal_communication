import { NextRequest, NextResponse } from "next/server";
import { newsFetcher } from "@/lib/news/fetcher";
import { IPNewsArticle } from "@/types/news";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ success: false, error: "Missing article ID" }, { status: 400 });
    }

    // 1. Check in-memory / disk cache first
    let cached = newsFetcher.getCachedArticles();
    let article: IPNewsArticle | undefined = cached.find(
      (a) => a.id === id || a.external_id === id || a.content_hash === id
    );

    // 2. If not found in cache, check Supabase
    if (!article) {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
      if (supabaseUrl && serviceRoleKey) {
        // Query by id (UUID) or external_id
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
        const filter = isUuid ? `id=eq.${id}` : `external_id=eq.${encodeURIComponent(id)}`;

        const res = await fetch(`${supabaseUrl}/rest/v1/ip_news?${filter}&limit=1`, {
          headers: {
            apikey: serviceRoleKey,
            Authorization: `Bearer ${serviceRoleKey}`,
          },
          cache: "no-store",
        });

        if (res.ok) {
          const rows = await res.json();
          if (rows.length > 0) {
            article = rows[0];
          }
        }
      }
    }

    // 3. If still not found, try running sync and check again
    if (!article) {
      const syncResult = await newsFetcher.syncLiveNews(false);
      article = syncResult.articles.find(
        (a) => a.id === id || a.external_id === id || a.content_hash === id
      );
    }

    if (!article) {
      return NextResponse.json(
        { success: false, error: "Article not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, article });
  } catch (error: any) {
    console.error("[GET /api/ceo/news/[id]] Error:", error);
    return NextResponse.json(
      { success: false, error: error?.message || "Failed to retrieve article" },
      { status: 500 }
    );
  }
}
