import { NextResponse } from "next/server";
import {
  FLOW_COOKIE,
  SESSION_COOKIE,
  createSessionCookie,
  exchangeCode,
  logSsoEvent,
  readFlowCookie,
  verifyIdToken,
} from "@/lib/msAuth";
import { resolveUser } from "@/lib/userRegistry";
import { notify } from "@/lib/notifications";

export const dynamic = "force-dynamic";

function cookieOf(req: Request, name: string) {
  const m = req.headers.get("cookie")?.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return m ? decodeURIComponent(m[1]) : undefined;
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const done = (to: string) => {
    const res = NextResponse.redirect(new URL(to, req.url));
    res.cookies.delete({ name: FLOW_COOKIE, path: "/api/auth/microsoft" });
    return res;
  };
  const fail = (code: string, detail: string, email?: string) => {
    logSsoEvent({ type: code === "sso_blocked" ? "login_blocked" : "login_failure", detail, email }, req);
    return done(`/login?error=${code}`);
  };

  const msError = url.searchParams.get("error");
  if (msError) return fail("sso_denied", `${msError}: ${url.searchParams.get("error_description") ?? ""}`.slice(0, 300));

  const flow = readFlowCookie(cookieOf(req, FLOW_COOKIE));
  const code = url.searchParams.get("code");
  if (!flow || !code || url.searchParams.get("state") !== flow.state) {
    return fail("sso_state", "Missing or mismatched state");
  }

  try {
    const claims = await verifyIdToken(await exchangeCode(code, flow.verifier), flow.nonce);
    const email = (claims.email ?? claims.preferred_username ?? "").toLowerCase();
    const name = claims.name ?? email;
    const identity = { oid: claims.oid, email, name };

    // Microsoft has proven who this is. Whether they may enter is the administrators' decision.
    const { user, isNewRequest } = resolveUser(identity, { create: true });
    if (!user) return fail("sso_failed", "Could not record the user", email);

    if (user.status !== "approved") {
      if (isNewRequest) {
        logSsoEvent({ type: "access_requested", email, name, oid: claims.oid }, req);
        notify({
          to: "ADMIN",
          title: "New access request",
          message: `${name} (${email}) signed in with Microsoft and is waiting for approval.`,
          sender: name,
          actionUrl: "/admin/access",
          kind: "approval",
          priority: "high",
        });
      } else {
        logSsoEvent({ type: user.status === "pending" ? "access_pending" : "access_denied", email, name, oid: claims.oid, detail: user.status }, req);
      }
      return done(`/request-access?state=${user.status}`);
    }

    const session = createSessionCookie({ oid: claims.oid, name, email });
    logSsoEvent({ type: "login_success", email, name, oid: claims.oid }, req);
    const res = done("/");
    res.cookies.set(SESSION_COOKIE, session.value, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: session.maxAge,
    });
    return res;
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return message.startsWith("BLOCKED:")
      ? fail("sso_blocked", message.replace("BLOCKED: ", ""))
      : fail("sso_failed", message);
  }
}
