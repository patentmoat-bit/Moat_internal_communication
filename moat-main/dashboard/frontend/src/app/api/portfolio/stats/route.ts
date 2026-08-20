import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { GlobalExceptionHandler } from "@/lib/errors";

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // For charts and aggregates, we fetch a large subset of data or write RPCs.
    // Here we fetch all metadata fields.
    const { data, error } = await supabase
      .from("portfolio_patents")
      .select("id, status, filing_date, patent_metadata");

    if (error) throw error;

    // Aggregate STATS
    const total = data.length;
    const granted = data.filter(p => p.status === "granted").length;
    const pending = data.filter(p => p.status === "pending").length;
    const atRisk = data.filter(p => p.status === "at-risk").length;

    // Aggregate TIMELINE
    const timelineMap: Record<string, any> = {};
    data.forEach(p => {
      if (p.filing_date) {
        const year = new Date(p.filing_date).getFullYear().toString();
        if (!timelineMap[year]) timelineMap[year] = { year, filed: 0, granted: 0, expired: 0 };
        timelineMap[year].filed += 1;
        if (p.status === "granted") timelineMap[year].granted += 1;
        if (p.status === "expired") timelineMap[year].expired += 1;
      }
    });
    const timeline = Object.values(timelineMap).sort((a: any, b: any) => parseInt(a.year) - parseInt(b.year));

    // Aggregate CATEGORIES
    const catMap: Record<string, any> = {};
    data.forEach(p => {
      const cat = p.patent_metadata?.category || "Other";
      if (!catMap[cat]) catMap[cat] = { name: cat, granted: 0, pending: 0, expired: 0 };
      if (p.status === "granted") catMap[cat].granted += 1;
      if (p.status === "pending") catMap[cat].pending += 1;
      if (p.status === "expired") catMap[cat].expired += 1;
    });
    const categories = Object.values(catMap);

    return NextResponse.json({
      stats: { total, granted, pending, atRisk },
      timeline,
      categories
    });
  } catch (error: any) {
    return await GlobalExceptionHandler.handle(error);
  }
}
