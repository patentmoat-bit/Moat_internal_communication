import { cookies } from "next/headers";
import { serverApi } from "./server-api";
import { SESSION_COOKIE, readSessionCookie } from "./msAuth";
import { resolveUser } from "./userRegistry";
import { permissionsFor } from "./permissions";
import { authEnforced } from "./authMode";
import type { Session } from "./types";

const DEV_SESSION: Session = {
  user: { id: "u-dev-1", name: "Executive Patent Analyst", email: "analyst@moat.ai" },
  tenant: { id: "t-dev-1", slug: "moat-corp", name: "MOAT Global IP" },
  roles: ["ADMIN", "CEO", "PATENT_ANALYST", "PATENT_DRAFTER", "DESIGN_TEAM", "FINANCE"],
  permissions: [
    "invention.read",
    "invention.create",
    "invention.edit",
    "invention.submit",
    "analysis.run",
    "analysis.read",
    "decision.record",
    "document.read",
    "document.create",
    "document.edit",
    "document.revise",
    "drawing.read",
    "drawing.create",
    "drawing.edit",
    "notification.read",
    "submission.read",
    "portfolio.read",
    "payment.read",
  ],
  availableTenants: [{ id: "t-dev-1", slug: "moat-corp", name: "MOAT Global IP" }],
};

/** The signed-in user, or null. In development, provides immediate seamless access to all 5 roles. */
export async function getSession(): Promise<Session | null> {
  // A verified Microsoft SSO session takes precedence over the dev fallback, and it never
  // falls through to it: someone Microsoft verified but an admin has not approved gets nothing.
  const ms = readSessionCookie((await cookies()).get(SESSION_COOKIE)?.value);
  if (ms) {
    const { user } = resolveUser({ oid: ms.oid, email: ms.email, name: ms.name }, { create: false });
    if (!user || user.status !== "approved") return null;
    return {
      user: { id: user.oid, name: user.name, email: user.email },
      tenant: DEV_SESSION.tenant,
      roles: [...(user.role ? [user.role] : []), ...(user.isAdmin ? ["ADMIN"] : [])],
      permissions: permissionsFor(user.role, user.isAdmin),
      availableTenants: DEV_SESSION.availableTenants,
      sso: true,
    };
  }
  // Outside local development nobody reaches the app without a Microsoft sign-in.
  if (authEnforced()) return null;
  try {
    const liveSession = await serverApi<Session>("/auth/me");
    if (liveSession) return liveSession;
  } catch {
    // Fall back to development session if auth server is in standalone mode
  }
  return DEV_SESSION;
}
