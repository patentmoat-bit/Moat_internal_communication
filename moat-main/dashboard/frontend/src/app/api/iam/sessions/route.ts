import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { GlobalExceptionHandler } from "@/lib/errors";
import { cookies } from "next/headers";

async function verifyAdminAccess() {
  const cookieStore = await cookies();
  const token = cookieStore.get("custom_access_token")?.value;
  if (!token) return null;
  
  try {
    const { jwtVerify } = await import("jose");
    const getSecretKey = () => {
      const secret = process.env.JWT_SECRET_KEY;
      if (!secret || secret.length === 0) {
        return new TextEncoder().encode("moat-super-secret-jwt-key-change-me-in-prod-12345");
      }
      return new TextEncoder().encode(secret);
    };
    const { payload } = await jwtVerify(token, getSecretKey());
    if (payload.role !== "Admin" && payload.role !== "super_admin" && payload.role !== "Super Admin") {
      return null;
    }
    return payload;
  } catch (e) {
    return null;
  }
}

export async function GET(request: NextRequest) {
  try {
    const authUser = await verifyAdminAccess();
    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data, error } = await supabase
      .from("user_sessions")
      .select("id, device, browser, ip_address, login_time, status, users(email)")
      .eq("status", "Active")
      .order("login_time", { ascending: false });

    if (error) throw error;

    const formattedSessions = (data || []).map((session: any) => ({
      id: session.id,
      user: Array.isArray(session.users) ? session.users[0]?.email : session.users?.email || "Unknown",
      ip: session.ip_address || "Unknown IP",
      location: "Unknown",
      device: session.device || "Unknown Device",
      browser: session.browser || "Unknown Browser",
      lastActive: session.login_time
    }));

    return NextResponse.json({ sessions: formattedSessions });
  } catch (error: any) {
    return await GlobalExceptionHandler.handle(error);
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const authUser = await verifyAdminAccess();
    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const url = new URL(request.url);
    const id = url.searchParams.get("id");

    if (id === "all") {
      const { error } = await supabase
        .from("user_sessions")
        .update({ status: "Revoked", logout_time: new Date().toISOString() })
        .eq("status", "Active");
      if (error) throw error;
    } else if (id) {
      const { error } = await supabase
        .from("user_sessions")
        .update({ status: "Revoked", logout_time: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    } else {
      return NextResponse.json({ error: "Missing session ID" }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return await GlobalExceptionHandler.handle(error);
  }
}
