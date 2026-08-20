import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import crypto from "crypto";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get("token");

    if (!token) {
      return NextResponse.json(
        { success: false, error: "Token is required." },
        { status: 400 }
      );
    }

    const supabaseAdmin = createAdminClient();
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    const { data: invite, error: inviteError } = await supabaseAdmin
      .from("user_invitations")
      .select("email, status, expires_at, roles(role_name)")
      .eq("token_hash", tokenHash)
      .single();

    if (inviteError || !invite) {
      return NextResponse.json(
        { success: false, error: "Invitation is invalid or expired." },
        { status: 403 }
      );
    }

    if (invite.status !== "PENDING" || new Date(invite.expires_at) < new Date()) {
      return NextResponse.json(
        { success: false, error: "Invitation is invalid or expired." },
        { status: 403 }
      );
    }

    return NextResponse.json({
      success: true,
      email: invite.email,
      role: Array.isArray(invite.roles) ? invite.roles[0]?.role_name : (invite.roles as any)?.role_name || "Patent Analyst",
    });
  } catch (err: any) {
    console.error("GET invitation error:", err);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
