import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, readSessionCookie } from "@/lib/msAuth";
import { resolveUser } from "@/lib/userRegistry";
import { authEnforced } from "@/lib/authMode";

/** Every API route needs an approved, signed-in person. Pages are guarded by the app layout;
 *  this is the net under routes that never check who is calling. Sign-in itself is exempt. */
export function proxy(req: NextRequest) {
  if (!authEnforced()) return NextResponse.next();
  const ms = readSessionCookie(req.cookies.get(SESSION_COOKIE)?.value);
  const user = ms ? resolveUser({ oid: ms.oid, email: ms.email, name: ms.name }, { create: false }).user : null;
  if (user?.status === "approved") return NextResponse.next();
  return NextResponse.json({ error: "Sign in required." }, { status: 401 });
}

export const config = { matcher: ["/api/((?!auth/).*)"] };
