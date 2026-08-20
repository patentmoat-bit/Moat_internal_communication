import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { GlobalExceptionHandler } from "@/lib/errors";

export async function GET(req: NextRequest) {
  try {
    const supabase = createAdminClient();
    const { searchParams } = new URL(req.url);
    
    // Extract query parameters
    const recipient = searchParams.get("recipient") || "";
    const subject = searchParams.get("subject") || "";
    const status = searchParams.get("status") || "All";
    // We could add date ranges, but let's keep it simple for the first iteration
    
    let query = supabase
      .from("email_logs")
      .select(`
        *,
        notification_rules (
          name,
          event_type
        )
      `)
      .order("created_at", { ascending: false });

    // Apply filters if provided
    if (status !== "All") {
      query = query.eq("status", status);
    }
    
    if (subject) {
      query = query.ilike("subject", `%${subject}%`);
    }

    // Supabase JSONB filtering for recipients can be tricky, so we'll fetch and filter in-memory if needed,
    // or use a generic text search if it was stored as text. Since it's JSONB { to: [], cc: [] },
    // it's easier to use a text cast search for quick filtering.
    if (recipient) {
      query = query.textSearch("recipients::text", recipient);
    }

    // Limit to 100 recent traces for performance
    query = query.limit(100);

    const { data, error } = await query;

    if (error) {
      // If textSearch isn't working perfectly due to postgres casting, we can do a quick JS fallback filter
      if (recipient && error.message?.includes("operator does not exist")) {
        // Re-fetch without the textSearch
        let fallbackQuery = supabase
          .from("email_logs")
          .select(`*, notification_rules (name, event_type)`)
          .order("created_at", { ascending: false })
          .limit(100);
          
        if (status !== "All") fallbackQuery = fallbackQuery.eq("status", status);
        if (subject) fallbackQuery = fallbackQuery.ilike("subject", `%${subject}%`);
        
        const fb = await fallbackQuery;
        if (fb.error) return await GlobalExceptionHandler.handle(fb.error);
        
        const filteredData = (fb.data || []).filter((log: any) => 
            JSON.stringify(log.recipients || {}).toLowerCase().includes(recipient.toLowerCase())
        );
        return NextResponse.json({ data: filteredData });
      }
      return await GlobalExceptionHandler.handle(error);
    }

    return NextResponse.json({ data });
  } catch (err: any) {
    return await GlobalExceptionHandler.handle(err);
  }
}
