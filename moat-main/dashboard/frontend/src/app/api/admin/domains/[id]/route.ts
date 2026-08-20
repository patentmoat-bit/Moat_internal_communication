import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyToken } from "@/lib/jwt";
import { cookies } from "next/headers";
import { appRoleToEnterpriseRole } from "@/lib/roleIntelligence";
import { SessionService } from "@/lib/security/sessionService";
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

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const authUser = await getAuthUser();
    if (!authUser || appRoleToEnterpriseRole(authUser.role as any) !== "admin") {
      return NextResponse.json({ detail: "Unauthorized" }, { status: 403 });
    }

    const { id } = await params;
    const { isEnabled } = await req.json();
    
    if (isEnabled === undefined) {
      return NextResponse.json({ detail: "isEnabled is required" }, { status: 400 });
    }

    const supabase = createAdminClient();

    // 1. Get domain info before update
    const { data: domainRec } = await supabase
        .from("organization_domains")
        .select("domain")
        .eq("id", id)
        .single();
        
    if (!domainRec) {
        return NextResponse.json({ detail: "Domain not found" }, { status: 404 });
    }

    // 2. Update domain
    const { error } = await supabase
      .from("organization_domains")
      .update({ is_enabled: isEnabled, updated_at: new Date().toISOString() })
      .eq("id", id);

    if (error) {
      return await GlobalExceptionHandler.handle(error);
    }

    // 3. Audit Log
    const ip = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "Unknown";
    const eventType = isEnabled ? "DOMAIN_ENABLED" : "DOMAIN_DISABLED";
    await supabase.from("audit_logs").insert({
        user_id: authUser.sub,
        action: eventType,
        module: "Security",
        ip,
        metadata: { domain: domainRec.domain }
    });

    // 4. Revoke active sessions if disabled
    if (!isEnabled) {
        const sessionService = new SessionService(supabase);
        // Find users with this domain
        const { data: users } = await supabase.from("users").select("id, email").like("email", `%@${domainRec.domain}`);
        if (users && users.length > 0) {
            for (const u of users) {
                await sessionService.revokeSession(u.email);
            }
        }
        await supabase.from("audit_logs").insert({
            user_id: authUser.sub,
            action: "SESSION_REVOKED_DOMAIN_DISABLED",
            module: "Security",
            ip,
            metadata: { domain: domainRec.domain, usersAffected: users?.length || 0 }
        });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("PATCH domain error:", err);
    return NextResponse.json({ detail: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const authUser = await getAuthUser();
    if (!authUser || appRoleToEnterpriseRole(authUser.role as any) !== "admin") {
      return NextResponse.json({ detail: "Unauthorized" }, { status: 403 });
    }

    const { id } = await params;
    const supabase = createAdminClient();

    // 1. Get domain info
    const { data: domainRec } = await supabase
        .from("organization_domains")
        .select("domain")
        .eq("id", id)
        .single();

    if (!domainRec) {
        return NextResponse.json({ detail: "Domain not found" }, { status: 404 });
    }

    // 2. Delete domain
    const { error } = await supabase
      .from("organization_domains")
      .delete()
      .eq("id", id);

    if (error) {
      return await GlobalExceptionHandler.handle(error);
    }

    // 3. Audit Log
    const ip = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "Unknown";
    await supabase.from("audit_logs").insert({
        user_id: authUser.sub,
        action: "DOMAIN_REMOVED",
        module: "Security",
        ip,
        metadata: { domain: domainRec.domain }
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("DELETE domain error:", err);
    return NextResponse.json({ detail: "Internal server error" }, { status: 500 });
  }
}
