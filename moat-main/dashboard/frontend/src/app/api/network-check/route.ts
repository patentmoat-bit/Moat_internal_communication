import { NextRequest, NextResponse } from "next/server";
import { getAllowedIpRanges, getClientIp, hasValidOriginSecret, isRequestIpAllowed } from "@/lib/security/ipAllowlist";

// Diagnostic-only endpoint for the ALLOWED_IPS network restriction. Always
// reachable regardless of the allowlist (see the exemption in middleware.ts)
// so it can be used to debug why a network is or isn't getting through,
// without exposing the configured allowlist itself.
export async function GET(req: NextRequest) {
  const allowedRanges = getAllowedIpRanges();
  const clientIp = getClientIp(req.headers);
  const allowed = isRequestIpAllowed(clientIp, allowedRanges);

  return NextResponse.json({
    detectedIp: clientIp,
    restrictionEnabled: allowedRanges.length > 0,
    wouldBeAllowed: allowed,
    // True once CF_ORIGIN_SECRET is set in Vercel AND the matching Cloudflare
    // Transform Rule is deployed and actually applying to this request. If
    // this is false while detectedIp is also null, the Cloudflare rule isn't
    // reaching this request yet (check the rule's hostname/path match).
    originSecretVerified: hasValidOriginSecret(req.headers),
  });
}
