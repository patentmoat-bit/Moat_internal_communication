import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyToken } from "@/lib/jwt";
import { cookies } from "next/headers";
import { GlobalExceptionHandler } from "@/lib/errors";

export const dynamic = "force-dynamic";
export const revalidate = 0;

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

    // Fetch ALL activity logs (mapped from audit_logs since that's what EventBus populates)
    const { data, error } = await supabase
      .from("audit_logs")
      .select("id, actor_id, entity_type, entity_id, event_type, metadata, created_at")
      .order("created_at", { ascending: false })
      .limit(200);

    if (error) throw error;
    
    const mapped = (data || [])
      .filter(row => {
        const evt = (row.event_type || "").toUpperCase();
        const ent = (row.entity_type || "").toLowerCase();
        
        // Strictly filter out all authentication and system noise
        const blockedEvents = [
          "LOGIN_SUCCESS", "LOGIN_FAILED", "LOGOUT_SUCCESS", "LOGOUT",
          "MFA_VERIFIED", "DOMAIN_LOGIN_ALLOWED", "SESSION_REFRESH",
          "PASSWORD_RESET", "ACCOUNT_LOCKED", "TOKEN_REFRESH", "AUTH"
        ];
        
        if (blockedEvents.includes(evt) || evt.includes("LOGIN") || evt.includes("LOGOUT")) return false;
        if (ent.includes("auth") || ent.includes("system") || ent.includes("api")) return false;
        
        // Allow works related to Patents, Trademarks, Copyrights, Projects, Documents, etc.
        return true;
      })
      .slice(0, 100)
      .map(row => {
        let cleanMessage = row.metadata?.notificationTitle;
        if (!cleanMessage) {
          let cleanEntity = row.entity_type || 'System';
          if (cleanEntity.includes('/') || cleanEntity.match(/^[0-9a-fA-F-]{32,36}$/)) {
            cleanEntity = 'Project Resource';
          } else {
            cleanEntity = cleanEntity.replace(/_/g, ' ');
            cleanEntity = cleanEntity.charAt(0).toUpperCase() + cleanEntity.slice(1).toLowerCase();
          }
          const actionStr = (row.event_type || 'System Update').replace(/_/g, ' ').toLowerCase();
          cleanMessage = `Successfully processed ${actionStr} on ${cleanEntity}.`;
        }

        return {
          id: row.id,
          user_id: row.actor_id,
          actor_id: row.actor_id,
          entity_type: row.entity_type,
          entity_id: row.entity_id,
          action: row.event_type,
          message: cleanMessage,
          metadata: row.metadata,
          created_at: row.created_at
        };
      });

    return NextResponse.json(mapped);
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
    const supabase = createAdminClient();

    if (id) {
      const { error } = await supabase
        .from("activity_logs")
        .update({ action: "read" })
        .eq("id", id);
      if (error) throw error;
    } else {
      // Mark all as read
      const { error } = await supabase
        .from("activity_logs")
        .update({ action: "read" })
        .neq("action", "read");
      if (error) throw error;
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return await GlobalExceptionHandler.handle(err);
  }
}
