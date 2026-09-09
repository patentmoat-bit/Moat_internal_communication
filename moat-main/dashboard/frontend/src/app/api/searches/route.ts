import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { GlobalExceptionHandler, ErrorResponseBuilder } from "@/lib/errors";
import { RepositoryLayer } from "@/lib/repository/RepositoryLayer";

import { cookies } from "next/headers";
import { verifyToken } from "@/lib/jwt";

export const dynamic = 'force-dynamic';
export const revalidate = 0;

async function getAuthUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get("custom_access_token")?.value;
  if (!token) return null;
  try {
    const payload = await verifyToken(token);
    return payload;
  } catch (err) {
    return null;
  }
}

export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const repo = new RepositoryLayer(supabase);

    const authUser = await getAuthUser();
    if (!authUser) {
      return ErrorResponseBuilder.error('Authentication required.', GlobalExceptionHandler.generateErrorId(), 401);
    }
    const finalUserId = authUser.sub;

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "50", 10);

    // Fetch from recent_searches
    const { data: recentData, error: recentError } = await supabase
      .from('recent_searches')
      .select('id, query, search_type, options, created_at')
      .eq('user_id', finalUserId)
      .order('created_at', { ascending: false })
      .limit(limit);

    // Fetch from audit_logs
    const { data: auditData, error: auditError } = await supabase
      .from('audit_logs')
      .select('id, created_at, metadata, actor_id')
      .eq('event_type', 'PATENT_DOCUMENT_SEARCH_EXECUTED')
      .eq('actor_id', finalUserId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (recentError) console.error("recent_searches error:", recentError);
    if (auditError) console.error("audit_logs error:", auditError);

    const mappedRecent = (recentData || []).map(search => ({
      id: search.id,
      search_type: search.search_type || "Keyword",
      search_status: "COMPLETED",
      project_title: search.options?._name || search.query || "Unknown Search",
      created_at: search.created_at || search.options?.last_run_at || new Date().toISOString()
    }));

    const mappedAudit = (auditData || []).map(log => ({
      id: log.id,
      search_type: "Keyword",
      search_status: "COMPLETED",
      project_title: log.metadata?.cleanKeywords || log.metadata?.searchQuery || "Unknown Search",
      created_at: log.created_at
    }));

    // Merge, deduplicate by project_title to avoid spam, and sort
    const allSearches = [...mappedRecent, ...mappedAudit];
    
    const uniqueSearches = Array.from(
      new Map(allSearches.map(item => [item.project_title?.toLowerCase(), item])).values()
    );

    uniqueSearches.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    
    const finalData = uniqueSearches.slice(0, limit);

    return ErrorResponseBuilder.success(finalData, "Search history retrieved successfully.");
  } catch (err: any) {
    return await GlobalExceptionHandler.handle(err, request, "Unable to retrieve search history.");
  }
}
