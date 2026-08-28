import { NextRequest, NextResponse } from "next/server";
import { CSRFCORSMiddleware, CSRFCORSRequestContext } from "@/lib/security/csrf/CSRFCORSMiddleware";
import { GlobalExceptionHandler } from "@/lib/errors";
import { verifyToken } from "@/lib/jwt";

async function handleCSRFCORSValidation(req: NextRequest, httpMethod: string) {
  try {
    const originHeader = req.headers.get("origin");
    const refererHeader = req.headers.get("referer");
    const csrfTokenHeader = req.headers.get("x-csrf-token") || req.headers.get("x-xsrf-token");
    const requestMethodHeader = req.headers.get("access-control-request-method");
    const requestHeadersHeader = req.headers.get("access-control-request-headers");
    // Identity is derived ONLY from the verified session — see csrf/token/route.ts
    // for why the previous hardcoded-fallback/test-header pattern was unsafe.
    const token = req.cookies.get("custom_access_token")?.value;
    const decoded: any = token ? await verifyToken(token) : null;
    const userId = decoded?.sub || "anonymous";
    const sessionId = decoded?.jti || decoded?.sub || "anonymous";

    const ctx: CSRFCORSRequestContext = {
      endpoint: "/api/security/csrf/validate",
      httpMethod,
      ipAddress: "127.0.0.1",
      originHeader,
      refererHeader,
      csrfTokenHeader,
      requestMethodHeader,
      requestHeadersHeader,
      userId,
      sessionId
    };

    const res = await CSRFCORSMiddleware.validateRequest(ctx);
    if (!res.allowed) {
      return NextResponse.json({
        success: false,
        message: "Request blocked by Phase 6 CSRF/CORS Zero-Trust security middleware.",
        violationType: res.violationType,
        reason: res.reason,
        auditLogId: res.auditLogId
      }, { status: 403, headers: res.corsHeaders });
    }

    return NextResponse.json({
      success: true,
      message: `Request passed zero-trust origin, CORS policy, and CSRF token validation for method ${httpMethod}.`,
      auditLogId: res.auditLogId,
      data: { verifiedOrigin: originHeader || "same-origin", verifiedMethod: httpMethod }
    }, { status: 200, headers: res.corsHeaders });
  } catch (err: any) {
    console.error("[CSRFValidateAPI] Error:", err);
    return NextResponse.json({ success: false, message: "Internal server error in CSRF/CORS validation.", error: err.message }, { status: 500 });
  }
}

export async function GET(req: NextRequest) { return handleCSRFCORSValidation(req, "GET"); }
export async function POST(req: NextRequest) { return handleCSRFCORSValidation(req, "POST"); }
export async function PUT(req: NextRequest) { return handleCSRFCORSValidation(req, "PUT"); }
export async function PATCH(req: NextRequest) { return handleCSRFCORSValidation(req, "PATCH"); }
export async function DELETE(req: NextRequest) { return handleCSRFCORSValidation(req, "DELETE"); }
export async function OPTIONS(req: NextRequest) { return handleCSRFCORSValidation(req, "OPTIONS"); }
