import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { GlobalExceptionHandler } from "@/lib/errors";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const resolvedParams = await params;
    const supabase = await createClient();
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data, error } = await supabase
      .from("moat_idea_versions")
      .select("*")
      .eq("idea_id", resolvedParams.id)
      .order("created_at", { ascending: false });

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error: any) {
    return await GlobalExceptionHandler.handle(error);
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const resolvedParams = await params;
    const supabase = await createClient();
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { data, error } = await supabase
      .from("moat_idea_versions")
      .insert([{ idea_id: resolvedParams.id, content: body.content, commit_message: body.commit_message || "Auto-save" }])
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error: any) {
    return await GlobalExceptionHandler.handle(error);
  }
}
