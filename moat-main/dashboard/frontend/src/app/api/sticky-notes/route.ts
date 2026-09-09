import { NextResponse } from "next/server";
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
  } catch {
    return null;
  }
}

export async function GET() {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = user.sub || user.id;

  const supabase = createAdminClient();
  const { data } = await supabase
    .from("inventions")
    .select("*")
    .eq("user_id", userId)
    .eq("status", "sticky_note")
    .limit(1);
  
  const notes = data?.[0]?.metadata?.notes || [];
  return NextResponse.json({ notes });
}

export async function POST(req: Request) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = user.sub || user.id;

  const { notes } = await req.json();
  const supabase = createAdminClient();
  
  const { data } = await supabase
    .from("inventions")
    .select("id")
    .eq("user_id", userId)
    .eq("status", "sticky_note")
    .limit(1);

  const existing = data?.[0];

  if (existing) {
    const { error } = await supabase
      .from("inventions")
      .update({ metadata: { notes }, updated_at: new Date().toISOString() })
      .eq("id", existing.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  } else {
    const { error } = await supabase
      .from("inventions")
      .insert({
        user_id: userId,
        title: "Sticky Notes",
        description: "User sticky notes collection",
        status: "sticky_note",
        tags: [],
        metadata: { notes }
      });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ success: true });
}
