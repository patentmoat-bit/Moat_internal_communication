import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { adminUpsertUser } from "@/lib/supabase/userService";
import type { AppRole } from "@/types";
import crypto from "crypto";
import { RateLimitingService } from "@/lib/security/rateLimitingService";
import { SecurityLoggingService } from "@/lib/security/SecurityLoggingService";
import { GlobalExceptionHandler } from "@/lib/errors";

export async function POST(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "Unknown";
  
  try {
    const rateLimitingService = new RateLimitingService();
    // Rate Limiting
    const rateLimit = await rateLimitingService.checkLimit(`signup_${ip}`, 5, 3600); // 5 attempts per hour
    if (!rateLimit.allowed) {
      return NextResponse.json({ detail: "Too many signup attempts. Try again later." }, { status: 429 });
    }

    const body = await request.json();
    const { name, password, token } = body;

    // 1. Check for invitation token
    if (!token) {
      const securityLogger = new SecurityLoggingService();
      await securityLogger.logValidationFailure({
        userId: "System",
        category: "GENERAL_VALIDATION",
        validationErrors: [{ field: "token", message: "Missing invitation token", rejectedValue: body.email }],
        ipAddress: ip,
        userAgent: request.headers.get("user-agent") || "Unknown",
        endpoint: "/api/auth/signup"
      });
      return NextResponse.json(
        { success: false, error: "Self-registration is not available." },
        { status: 403 }
      );
    }

    if (!name?.trim() || !password) {
      return NextResponse.json(
        { detail: "Full name and password are required." },
        { status: 400 }
      );
    }

    const supabaseAdmin = createAdminClient();
    
    // 2. Validate token hash
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const { data: invite, error: inviteError } = await supabaseAdmin
      .from("user_invitations")
      .select("*, roles(role_name)")
      .eq("token_hash", tokenHash)
      .single();

    if (inviteError || !invite) {
      const securityLogger = new SecurityLoggingService();
      await securityLogger.logValidationFailure({
        userId: "System",
        category: "GENERAL_VALIDATION",
        validationErrors: [{ field: "token", message: "Invalid invitation token", rejectedValue: tokenHash }],
        ipAddress: ip,
        userAgent: request.headers.get("user-agent") || "Unknown",
        endpoint: "/api/auth/signup"
      });
      return NextResponse.json(
        { success: false, error: "Invitation is invalid or expired." },
        { status: 403 }
      );
    }

    // 3. Check status & expiration
    if (invite.status !== "PENDING" || new Date(invite.expires_at) < new Date()) {
      const securityLogger = new SecurityLoggingService();
      await securityLogger.logValidationFailure({
        userId: "System",
        category: "GENERAL_VALIDATION",
        validationErrors: [{ field: "status", message: "Expired or accepted invitation", rejectedValue: invite.status }],
        ipAddress: ip,
        userAgent: request.headers.get("user-agent") || "Unknown",
        endpoint: "/api/auth/signup"
      });
      return NextResponse.json(
        { success: false, error: "Invitation is invalid or expired." },
        { status: 403 }
      );
    }

    const assignedRole = Array.isArray(invite.roles) ? invite.roles[0]?.role_name : (invite.roles as any)?.role_name || "Patent Analyst";
    const email = invite.email;

    // 4. Create the Supabase Auth user (still using admin client to bypass any issues)
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm since it's an invite
      user_metadata: {
        name: name.trim(),
        role: assignedRole,
      },
    });

    if (error || !data.user) {
      return NextResponse.json(
        { detail: error?.message ?? "Registration failed." },
        { status: 400 }
      );
    }

    // 5. Upsert into public.users
    const profile = await adminUpsertUser({
      id: data.user.id,
      email: data.user.email!,
      name: name.trim(),
      role: assignedRole as AppRole,
      department: undefined,
      company: undefined,
    });

    // 6. Mark invitation as accepted (Single-use)
    await supabaseAdmin
      .from("user_invitations")
      .update({
        status: "ACCEPTED",
        accepted_at: new Date().toISOString(),
      })
      .eq("id", invite.id);

    // 7. Audit Logging
    try {
      const { AuditLogService } = await import("@/lib/security/auditLogService");
      const auditLogger = new AuditLogService();
      await auditLogger.logEvent({
        userId: data.user.id,
        eventType: "SESSION_CREATED",
        metadata: { email, role: assignedRole, invitationId: invite.id },
        ipAddress: ip,
        userAgent: request.headers.get("user-agent") || "Unknown",
        endpoint: "/api/auth/signup",
        status: "SUCCESS"
      });
    } catch (auditErr) {
      console.error("Audit log failed during signup:", auditErr);
    }

    return NextResponse.json({
      success: true,
      message: "Account created successfully.",
      user: profile,
    });
  } catch (err: any) {
    return NextResponse.json(
      { detail: err.message ?? "Internal server error" },
      { status: 500 }
    );
  }
}

