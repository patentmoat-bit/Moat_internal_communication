import { NextResponse } from "next/server";

/**
 * Layer 8 — Security Headers
 * Ensures authentication responses include strict anti-caching and security headers.
 * Cache-Control: no-store
 * Pragma: no-cache
 */
export function createAuthResponse(body: any, status: number = 200, additionalHeaders: Record<string, string> = {}): NextResponse {
  const res = NextResponse.json(body, { status });
  res.headers.set("Cache-Control", "no-store");
  res.headers.set("Pragma", "no-cache");
  
  for (const [key, value] of Object.entries(additionalHeaders)) {
    res.headers.set(key, value);
  }
  
  return res;
}
