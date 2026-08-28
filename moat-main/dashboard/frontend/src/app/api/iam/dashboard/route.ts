import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";
import { GlobalExceptionHandler } from "@/lib/errors";
import { cookies } from "next/headers";
import { verifyToken } from "@/lib/jwt";

async function verifyAdminAccess() {
  const cookieStore = await cookies();
  const token = cookieStore.get("custom_access_token")?.value;
  if (!token) return null;

  const payload = await verifyToken(token);
  if (!payload) return null;
  if (payload.role !== "Admin" && payload.role !== "super_admin" && payload.role !== "Super Admin") {
    return null;
  }
  return payload;
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

    // 1. Total Users
    const { count: totalUsers, error: usersErr } = await supabase
      .from("users")
      .select("*", { count: "exact", head: true });

    // 2. Locked Accounts
    const { count: lockedAccounts } = await supabase
      .from("users")
      .select("*", { count: "exact", head: true })
      .eq("status", "Locked");

    // 3. Active Sessions
    const { count: activeSessions } = await supabase
      .from("user_sessions")
      .select("*", { count: "exact", head: true })
      .eq("status", "Active");

    // 4. MFA Adoption
    let mfaAdoption = 0;
    try {
      const fallbackPath = path.join(process.cwd(), "mfa_fallback.json");
      if (fs.existsSync(fallbackPath)) {
        const mfaData = JSON.parse(fs.readFileSync(fallbackPath, "utf-8"));
        const mfaUsers = Object.keys(mfaData).length;
        if (totalUsers && totalUsers > 0) {
          mfaAdoption = Math.round((mfaUsers / totalUsers) * 100);
        }
      }
    } catch (e) {
      console.warn("Failed to read MFA fallback for adoption metric.");
    }

    // 5. Recent Security Events
    const { data: logsData } = await supabase
      .from("audit_logs")
      .select("id, event_type, created_at, user_id")
      .in("event_type", ["LOGIN_SUCCESS", "LOGIN_FAILED", "MFA_ENABLED", "MFA_VERIFIED", "ACCOUNT_LOCKED", "LOGOUT_SUCCESS"])
      .order("created_at", { ascending: false })
      .limit(5);

    // Fetch users for the logs
    const userIds = [...new Set((logsData || []).map(log => log.user_id).filter(Boolean))];
    let userMap = new Map();
    if (userIds.length > 0) {
      const { data: usersData } = await supabase
        .from("users")
        .select("id, email")
        .in("id", userIds);
      userMap = new Map((usersData || []).map(u => [u.id, u.email]));
    }

    const recentEvents = (logsData || []).map((log: any) => ({
      event: log.event_type,
      user: log.user_id ? (userMap.get(log.user_id) || "Unknown") : "Unknown",
      time: log.created_at
    }));

    return NextResponse.json({
      metrics: {
        totalUsers: totalUsers || 0,
        lockedAccounts: lockedAccounts || 0,
        mfaAdoption,
        activeSessions: activeSessions || 0
      },
      recentEvents
    });
  } catch (error: any) {
    return await GlobalExceptionHandler.handle(error);
  }
}
