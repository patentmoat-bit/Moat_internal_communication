import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { GlobalExceptionHandler, ErrorResponseBuilder } from "@/lib/errors";
import { RepositoryLayer } from "@/lib/repository/RepositoryLayer";

export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const repo = new RepositoryLayer(supabase);

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (!user) {
      return ErrorResponseBuilder.error('Authentication required.', GlobalExceptionHandler.generateErrorId(), 401);
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "50", 10);

    const { data, error } = await repo.execute(
      supabase
        .from('recent_searches')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(limit)
    );

    return ErrorResponseBuilder.success(data || [], "Search history retrieved successfully.");
  } catch (err: any) {
    return await GlobalExceptionHandler.handle(err, request, "Unable to retrieve search history.");
  }
}
