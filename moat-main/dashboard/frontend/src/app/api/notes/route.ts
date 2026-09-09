import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyToken } from "@/lib/jwt";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

async function getAuthUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get("custom_access_token")?.value;
  if (!token) return null;
  try {
    return await verifyToken(token);
  } catch (err) {
    return null;
  }
}

export async function GET() {
  try {
    const authUser = await getAuthUser();
    if (!authUser) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

    const supabase = createAdminClient();
    
    const { data, error } = await supabase
      .from("workspace_documents")
      .select("content")
      .eq("name", `STICKY_NOTES_${authUser.sub}`)
      .single();

    if (error && error.code === 'PGRST116') {
      return NextResponse.json({ notes: [] });
    }
    
    if (error) throw error;
    
    return NextResponse.json({ notes: data?.content || [] });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const authUser = await getAuthUser();
    if (!authUser) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

    const { notes } = await req.json();

    const supabase = createAdminClient();
    
    // Check if the record already exists
    const { data: existing } = await supabase
      .from("workspace_documents")
      .select("id")
      .eq("name", `STICKY_NOTES_${authUser.sub}`)
      .single();

    if (existing) {
      const { error } = await supabase
        .from("workspace_documents")
        .update({ content: notes })
        .eq("id", existing.id);
      if (error) throw error;
    } else {
      const { error } = await supabase
        .from("workspace_documents")
        .insert({
          name: `STICKY_NOTES_${authUser.sub}`,
          content: notes
        });
      if (error) throw error;
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
