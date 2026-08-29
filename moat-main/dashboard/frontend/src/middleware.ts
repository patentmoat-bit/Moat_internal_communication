import { NextResponse, type NextRequest } from "next/server";
import { getRequiredRoles, appRoleToEnterpriseRole } from "@/lib/roleIntelligence";
import type { AppRole } from "@/types";
import { jwtVerify } from "jose";
import { getAllowedIpRanges, getClientIp, isRequestIpAllowed } from "@/lib/security/ipAllowlist";

const PUBLIC_PATHS = [
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
  "/403",
  "/auth/login",
  "/auth/signup",
  "/auth/callback",
];
const AUTH_PATHS = ["/login", "/register", "/auth/login", "/auth/signup"];



const getSecretKey = () => {
  const secret = process.env.JWT_SECRET_KEY;
  if (!secret || secret.length === 0) {
    throw new Error("Missing required environment variable: JWT_SECRET_KEY");
  }
  return new TextEncoder().encode(secret);
};

export async function middleware(request: NextRequest) {
  // Network-level allowlist (opt-in via ALLOWED_IPS). Runs before anything
  // else so a disallowed IP never reaches auth/session logic or app code.
  const allowedIpRanges = getAllowedIpRanges();
  if (allowedIpRanges.length > 0) {
    const clientIp = getClientIp(request.headers.get("x-forwarded-for"));
    if (!isRequestIpAllowed(clientIp, allowedIpRanges)) {
      return new NextResponse("Forbidden", { status: 403 });
    }
  }

  const nonce = btoa(crypto.randomUUID());
  const isDev = process.env.NODE_ENV === "development";

  const cspHeader = `
    default-src 'self';
    script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDev ? " 'unsafe-eval'" : ""} https://*.vercel-scripts.com https://*.vercel-insights.com https://vercel.live https://*.vercel.live https://*.supabase.co https://login.microsoftonline.com;
    style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
    font-src 'self' data: https://fonts.gstatic.com;
    img-src 'self' data: blob: https://*.supabase.co https://patents.google.com https://*.googleapis.com https://*.gstatic.com https://*.google.com https://*.githubusercontent.com https://*.vercel.com;
    connect-src 'self' http://localhost:* http://127.0.0.1:* ws://localhost:* ws://127.0.0.1:* http://192.168.*:* ws://192.168.*:* https://*.supabase.co wss://*.supabase.co https://api.semanticscholar.org https://api.crossref.org https://ops.epo.org https://patents.google.com https://*.googleapis.com https://graph.microsoft.com https://login.microsoftonline.com https://*.vercel-scripts.com https://*.vercel-insights.com https://vercel.live https://*.vercel.live wss://*.vercel.live;
    frame-src 'self' https://login.microsoftonline.com https://*.supabase.co https://vercel.live https://*.vercel.live;
    frame-ancestors 'none';
    object-src 'none';
    base-uri 'self';
    form-action 'self' https://login.microsoftonline.com https://*.supabase.co;
  `.replace(/\s{2,}/g, " ").trim();

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-nonce', nonce);
  requestHeaders.set('Content-Security-Policy', cspHeader);

  const response = await handleAuth(request, requestHeaders);

  response.headers.set('Content-Security-Policy', cspHeader);
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');

  return response;
}

async function handleAuth(request: NextRequest, requestHeaders: Headers) {
  const { pathname } = request.nextUrl;

  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon")
  ) {
    return NextResponse.next({ request: { headers: requestHeaders } });
  }

  // Allow some API routes that are meant to be public
  const isApiRoute = pathname.startsWith("/api/");
  const PUBLIC_API_PATHS = [
    "/api/auth/login",
    "/api/auth/signup",
    "/api/auth/forgot-password",
    "/api/auth/reset-password",
    "/api/auth/mfa/verify",
    "/api/auth/refresh",
    "/api/auth/logout",
    "/api/auth/sso/bridge", // called with only a Supabase OAuth session, before any app session exists
    "/api/health"
  ];
  if (isApiRoute && PUBLIC_API_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next({ request: { headers: requestHeaders } });
  }

  // Read custom JWT from cookie or Auth header
  let token = request.cookies.get("custom_access_token")?.value;
  if (!token && isApiRoute) {
    const authHeader = request.headers.get("authorization");
    if (authHeader && authHeader.startsWith("Bearer ")) {
      token = authHeader.substring(7);
    }
  }

  let authUser: any = null;
  let sessionValid = false;

  if (token) {
    try {
      const { payload } = await jwtVerify(token, getSecretKey());
      authUser = payload;
      sessionValid = true; // Default to true if JWT signature is valid
      
      // Central Server-side session validation
      if (authUser && authUser.jti) {
        const now = Date.now();
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
        
        if (supabaseUrl && serviceRoleKey) {
          let queryParams: string;
          try {
            const encoder = new TextEncoder();
            const dataBuffer = encoder.encode(token);
            const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
            const hashArray = Array.from(new Uint8Array(hashBuffer));
            const tokenHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
            queryParams = `or=(jwt_token.eq.${tokenHash},jwt_token.eq.${token})`;
          } catch (e) {
            // Hashing failed: fail closed rather than sending the raw token in a URL.
            sessionValid = false;
            queryParams = "";
          }

          if (queryParams) {
            const res = await fetch(`${supabaseUrl}/rest/v1/user_sessions?${queryParams}&select=status,logout_time,login_time,last_activity_at`, {
              headers: {
                'apikey': serviceRoleKey,
                'Authorization': `Bearer ${serviceRoleKey}`
              },
              cache: 'no-store'
            });

            if (res.ok) {
              const data = await res.json();
              if (data && data.length > 0) {
                const session = data[0];
                if (session.status !== 'Inactive' && !session.logout_time) {
                  const nowTime = new Date();
                  const loginTime = new Date(session.login_time);
                  const lastActivityTime = session.last_activity_at ? new Date(session.last_activity_at) : loginTime;

                  const ABSOLUTE_LIFETIME_MS = 8 * 60 * 60 * 1000;
                  const INACTIVITY_TIMEOUT_MS = 30 * 60 * 1000;

                  if (nowTime.getTime() - loginTime.getTime() > ABSOLUTE_LIFETIME_MS) {
                    sessionValid = false;
                  } else if (nowTime.getTime() - lastActivityTime.getTime() > INACTIVITY_TIMEOUT_MS) {
                    sessionValid = false;
                  }
                } else {
                  sessionValid = false; // session is marked inactive in DB
                }
              } else {
                // No matching session row for this jti: treat as revoked (fail closed).
                sessionValid = false;
              }
            } else {
              // Could not verify session state against the DB: fail closed.
              sessionValid = false;
            }
          }
        }
      }
    } catch (e) {
      // Invalid or expired token
      authUser = null;
      sessionValid = false;
    }
  }

  if (!sessionValid) {
    authUser = null;
  }

  const isAuthenticated = !!authUser;

  // These headers carry the already-validated identity forward to route handlers
  // so they don't have to redo the same JWT-verify + user_sessions DB check that
  // just ran above. Always explicitly set (never leave at whatever the client
  // sent) so a request can't forge them to skip validation.
  if (isAuthenticated && authUser) {
    requestHeaders.set('x-session-verified', '1');
    requestHeaders.set('x-session-user-id', String(authUser.sub ?? ''));
    requestHeaders.set('x-session-user-email', String(authUser.email ?? ''));
    requestHeaders.set('x-session-user-role', String(authUser.role ?? ''));
  } else {
    requestHeaders.delete('x-session-verified');
    requestHeaders.delete('x-session-user-id');
    requestHeaders.delete('x-session-user-email');
    requestHeaders.delete('x-session-user-role');
  }

  if (isApiRoute) {
    if (!isAuthenticated) {
      return NextResponse.json({ success: false, error: "Session expired or revoked" }, { status: 401 });
    }
    return NextResponse.next({ request: { headers: requestHeaders } });
  }

  // Redirect authenticated users away from auth pages
  if (isAuthenticated && AUTH_PATHS.some((p) => pathname.startsWith(p))) {
    if (!authUser || !authUser.role) {
      console.warn("Unknown user role detected, denying access");
      return NextResponse.redirect(new URL("/403", request.url));
    }
    const role = (authUser.role as AppRole);
    const workspace = appRoleToEnterpriseRole(role);
    const workspaceRoutes: Record<string, string> = {
      ceo: "/dashboard/ceo",
      patent_counsel: "/dashboard/legal",
      research_lead: "/dashboard/research",
      product_manager: "/dashboard/product",
      analyst: "/dashboard/search",
      admin: "/dashboard/admin",
    };
    const redirectTo = workspace ? (workspaceRoutes[workspace] ?? "/dashboard") : "/403";
    return NextResponse.redirect(new URL(redirectTo, request.url));
  }

  // Protect /dashboard/** and /ceo/** routes
  if (pathname.startsWith("/dashboard") || pathname.startsWith("/ceo")) {
    if (!isAuthenticated) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("redirect", pathname);
      
      // If we had a token but it became invalid, it means it expired
      if (token && !sessionValid) {
        loginUrl.searchParams.set("expired", "1");
      }
      
      return NextResponse.redirect(loginUrl);
    }

    // Role-based access control
    if (!authUser || !authUser.role) {
      console.warn("Unknown user role detected, denying access");
      return NextResponse.redirect(new URL("/login", request.url));
    }

    const requiredRoles = getRequiredRoles(pathname);
    if (requiredRoles.length > 0) {
      const userEnterpriseRole = appRoleToEnterpriseRole(authUser.role as AppRole);
      if (!userEnterpriseRole || !requiredRoles.includes(userEnterpriseRole)) {
        return NextResponse.redirect(new URL("/403", request.url));
      }
    }
  }

  // Protect all other non-public routes
  if (!isAuthenticated && !PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next({ request: { headers: requestHeaders } });
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|api/health).*)",
  ],
};
