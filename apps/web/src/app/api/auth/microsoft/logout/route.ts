import { NextResponse } from "next/server";
import { SESSION_COOKIE, logSsoEvent, readSessionCookie } from "@/lib/msAuth";

export const dynamic = "force-dynamic";

async function logout(req: Request) {
  const raw = req.headers.get("cookie")?.match(new RegExp(`(?:^|; )${SESSION_COOKIE}=([^;]*)`))?.[1];
  const s = readSessionCookie(raw ? decodeURIComponent(raw) : undefined);
  if (s) await logSsoEvent({ type: "logout", email: s.email, name: s.name, oid: s.oid }, req);
  const res = NextResponse.redirect(new URL("/", req.url), 303);
  res.cookies.delete(SESSION_COOKIE);
  return res;
}

export { logout as GET, logout as POST };
