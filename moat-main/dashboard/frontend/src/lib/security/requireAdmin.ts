import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/jwt";
import { appRoleToEnterpriseRole } from "@/lib/roleIntelligence";

export type SessionUser = { id: string; email: string; role: string };

/**
 * Verifies the request carries a valid session and returns the identity.
 * Reads the middleware-verified identity headers first (see middleware.ts —
 * only middleware can set these, a request can't forge them) and falls back
 * to re-verifying the cookie directly for any request that didn't pass
 * through middleware. Returns null (not a response) so callers can decide
 * how to react — e.g. an ownership check that also needs the resource id.
 */
export async function getSessionUser(req: NextRequest): Promise<SessionUser | null> {
  if (req.headers.get("x-session-verified") === "1") {
    const id = req.headers.get("x-session-user-id");
    if (id) {
      return {
        id,
        email: req.headers.get("x-session-user-email") || "",
        role: req.headers.get("x-session-user-role") || "",
      };
    }
  }

  const token = req.cookies.get("custom_access_token")?.value;
  if (!token) return null;
  const payload = await verifyToken(token);
  if (!payload?.sub) return null;
  return { id: payload.sub, email: payload.email || "", role: payload.role || "" };
}

/** Same as getSessionUser, but returns a ready-to-return 401 response when there's no valid session. */
export async function requireAuth(req: NextRequest): Promise<SessionUser | NextResponse> {
  const user = await getSessionUser(req);
  if (!user) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }
  return user;
}

/** Same as requireAuth, but also requires the session's role to resolve to admin. */
export async function requireAdmin(req: NextRequest): Promise<SessionUser | NextResponse> {
  const user = await requireAuth(req);
  if (user instanceof NextResponse) return user;

  if (appRoleToEnterpriseRole(user.role) !== "admin") {
    return NextResponse.json({ success: false, error: "Forbidden: admin access required" }, { status: 403 });
  }

  return user;
}
