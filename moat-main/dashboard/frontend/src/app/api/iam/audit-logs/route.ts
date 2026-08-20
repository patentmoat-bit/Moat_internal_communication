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
      .from("audit_logs")
      .select("id, event_type, created_at, ip_address, user_id, user_agent, metadata")
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) throw error;

    const userIds = [...new Set((data || []).map(log => log.user_id).filter(Boolean))];
    const { data: usersData } = await supabase
      .from("users")
      .select("id, email")
      .in("id", userIds);
    const userMap = new Map((usersData || []).map(u => [u.id, u.email]));

    const formattedLogs = (data || []).map((log: any) => {
      let status = "success";
      if (log.event_type.includes("FAILED")) status = "failed";
      if (log.event_type.includes("LOCKED") || log.event_type.includes("CRITICAL")) status = "critical";

      return {
        id: log.id,
        action: log.event_type,
        user: log.user_id ? (userMap.get(log.user_id) || "Unknown") : "Unknown",
        role: log.metadata?.actorRole || "System",
        ip: log.ip_address || log.metadata?.ipAddress || "Unknown",
        userAgent: log.user_agent || log.metadata?.userAgent || "Unknown",
        time: new Date(log.created_at).toLocaleString(),
        status,
        category: log.metadata?.category || "SYSTEM",
        resourceType: log.metadata?.resourceType || "System",
        resourceId: log.metadata?.resourceId,
        resourceName: log.metadata?.resourceName || log.metadata?.resourceId || "System Core",
        oldValue: log.metadata?.oldValue,
        newValue: log.metadata?.newValue,
      };
    });

    return NextResponse.json({ logs: formattedLogs });
  } catch (error: any) {
    return await GlobalExceptionHandler.handle(error);
  }
}
