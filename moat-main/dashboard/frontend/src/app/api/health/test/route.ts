import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = await createClient();
    const { error: e1 } = await supabase.from("portfolio_patents").select("id").limit(1);
    const { error: e2 } = await supabase.from("saved_patents").select("id").limit(1);
    const { error: e3 } = await supabase.from("patents").select("id").limit(1);
    
    return NextResponse.json({ e1: e1?.message, e2: e2?.message, e3: e3?.message });
  } catch (e: any) {
    return NextResponse.json({ error: e.message, stack: e.stack });
  }
}
