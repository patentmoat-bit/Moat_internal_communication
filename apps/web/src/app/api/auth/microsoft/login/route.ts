import { NextResponse } from "next/server";
import { FLOW_COOKIE, msConfigured, startFlow } from "@/lib/msAuth";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  if (!msConfigured()) {
    return NextResponse.redirect(new URL("/login?error=sso_not_configured", req.url));
  }
  const { url, cookie } = startFlow();
  const res = NextResponse.redirect(url);
  res.cookies.set(FLOW_COOKIE, cookie, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/api/auth/microsoft",
    maxAge: 600,
  });
  return res;
}
