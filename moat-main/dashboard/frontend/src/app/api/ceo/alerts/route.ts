import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyToken } from "@/lib/jwt";
import { cookies } from "next/headers";
import { GlobalExceptionHandler } from "@/lib/errors";

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
    const role = ((authUser as any).role || "").toUpperCase();
    if (!role.includes("CEO") && !role.includes("ADMIN") && !role.includes("PATENT ANALYST") && !role.includes("PATENT DRAFTER") && !role.includes("DESIGN TEAM")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("alerts")
      .select("id, name, alert_type, frequency, is_active, last_checked_at, match_count, created_at, description")
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) throw error;
    return NextResponse.json(data || []);
  } catch (err: any) {
    return await GlobalExceptionHandler.handle(err);
  }
}

export async function PATCH(req: Request) {
  try {
    const authUser = await getAuthUser();
    if (!authUser) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
    const role = ((authUser as any).role || "").toUpperCase();
    if (!role.includes("CEO") && !role.includes("ADMIN") && !role.includes("PATENT ANALYST") && !role.includes("PATENT DRAFTER") && !role.includes("DESIGN TEAM")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "Missing ID" }, { status: 400 });

    const supabase = createAdminClient();
    const { error } = await supabase
      .from("alerts")
      .update({ is_active: false })
      .eq("id", id);

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return await GlobalExceptionHandler.handle(err);
  }
}
