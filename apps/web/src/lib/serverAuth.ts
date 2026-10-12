import { cookies } from "next/headers";
import { SESSION_COOKIE, readSessionCookie } from "./msAuth";
import { resolveUser } from "./userRegistry";
import { authEnforced } from "./authMode";

export interface AuthenticatedUser {
  id: string;
  email: string;
  role: string;
  name?: string;
  sub: string;
}

// Local development only (see authEnforced). A neutral identity, not a real person.
const DEV_CEO_USER: AuthenticatedUser = {
  id: "dev-user",
  sub: "dev-user",
  email: "dev@example.test",
  role: "CEO",
  name: "Dev User",
};

export async function getAuthenticatedUser(): Promise<AuthenticatedUser | null> {
  try {
    const cookieStore = await cookies();
    const ms = readSessionCookie(cookieStore.get(SESSION_COOKIE)?.value);
    if (ms) {
      const { user } = resolveUser({ oid: ms.oid, email: ms.email, name: ms.name }, { create: false });
      if (!user || user.status !== "approved") return null;
      return { id: user.oid, sub: user.oid, email: user.email, name: user.name, role: user.role ?? "ADMIN" };
    }
    // Anything but an approved Microsoft session is a stranger outside local development.
    if (authEnforced()) return null;
    const token = cookieStore.get("custom_access_token")?.value;

    if (!token) {
      return DEV_CEO_USER;
    }

    try {
      const parts = token.split(".");
      if (parts.length === 3) {
        const payloadJson = Buffer.from(parts[1], "base64").toString("utf-8");
        const payload = JSON.parse(payloadJson);
        if (payload?.sub) {
          return {
            id: payload.sub,
            sub: payload.sub,
            email: payload.email || `${payload.sub}@moat.ai`,
            role: (payload.role || "CEO").toUpperCase(),
            name: payload.name || payload.user_metadata?.full_name || "CEO Executive",
          };
        }
      }
    } catch {
      // ignore token decode error and fallback
    }

    return DEV_CEO_USER;
  } catch {
    return authEnforced() ? null : DEV_CEO_USER;
  }
}
