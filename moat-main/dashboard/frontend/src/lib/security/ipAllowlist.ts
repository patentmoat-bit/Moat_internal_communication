/**
 * Optional network-level access restriction for the whole app.
 *
 * Vercel's Hobby plan doesn't offer native IP allowlisting (Trusted IPs /
 * Firewall custom rules are Pro+ only), so this enforces the same idea in
 * app middleware instead. Disabled by default — only takes effect once
 * ALLOWED_IPS is set, so existing deployments aren't locked out until
 * someone explicitly configures it.
 *
 * ALLOWED_IPS is a comma- or newline-separated list of IPv4 addresses
 * and/or CIDR ranges, e.g. "203.0.113.10,198.51.100.0/24". IPv6 is
 * supported only as an exact match (no CIDR range parsing). A trailing
 * label after the IP/CIDR (e.g. "203.0.113.10/32 - Office WiFi") is
 * tolerated and ignored, since that's an easy format to paste by mistake.
 */

function ipv4ToInt(ip: string): number | null {
  const parts = ip.split(".");
  if (parts.length !== 4) return null;
  let n = 0;
  for (const part of parts) {
    if (!/^\d{1,3}$/.test(part)) return null;
    const v = Number(part);
    if (v < 0 || v > 255) return null;
    n = (n << 8) | v;
  }
  return n >>> 0;
}

function isIpInRange(ip: string, range: string): boolean {
  if (!range.includes("/")) {
    return ip === range;
  }

  const [rangeIp, prefixStr] = range.split("/");
  const prefix = Number(prefixStr);
  const ipInt = ipv4ToInt(ip);
  const rangeInt = ipv4ToInt(rangeIp);
  if (ipInt === null || rangeInt === null || !Number.isInteger(prefix) || prefix < 0 || prefix > 32) {
    return false;
  }

  const mask = prefix === 0 ? 0 : (~0 << (32 - prefix)) >>> 0;
  return (ipInt & mask) === (rangeInt & mask);
}

export function getAllowedIpRanges(): string[] {
  const raw = process.env.ALLOWED_IPS;
  if (!raw) return [];
  return raw
    .split(/[,\n]/)
    // Keep only the leading IP/CIDR token on each entry — a trailing
    // " - some label" (a natural way to annotate which network an entry
    // belongs to) would otherwise fail CIDR-prefix parsing and silently
    // drop every entry, locking out everyone including allowed IPs.
    .map((s) => s.trim().split(/\s+/)[0])
    .filter(Boolean);
}

/**
 * Extracts the originating client IP from request headers.
 *
 * This app's production domain is proxied through Cloudflare in front of
 * Vercel, and CF-Connecting-IP is set authoritatively by Cloudflare itself
 * at its edge — Cloudflare strips any copy of this header a client tries
 * to send, so it can't be spoofed. This is deliberately the ONLY source
 * trusted here: x-forwarded-for is not a fallback, because Vercel's Hobby
 * plan leaves the raw <project>.vercel.app deployment URL (and preview
 * URLs) publicly reachable alongside the custom domain, bypassing
 * Cloudflare entirely — a request sent straight to that URL could set its
 * own x-forwarded-for value and, if Vercel didn't strip it, walk straight
 * through the allowlist. Requiring CF-Connecting-IP means any request that
 * didn't come through the trusted Cloudflare path has no way to satisfy
 * the check at all, rather than relying on an unverified assumption about
 * how Vercel handles that header on such requests.
 */
/** Constant-time string comparison (avoids leaking the secret via timing). */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

/**
 * Whether the request carries the shared secret Cloudflare is configured to
 * stamp on every request via a Transform Rule (header name x-origin-secret,
 * value CF_ORIGIN_SECRET). This is what actually makes CF-Connecting-IP
 * trustworthy: without it, someone bypassing Cloudflare and hitting Vercel's
 * shared origin directly could set their own CF-Connecting-IP header, since
 * nothing on that path strips it the way Cloudflare's edge does. The secret
 * never reaches a browser, so a request lacking it didn't come through the
 * configured Cloudflare rule.
 *
 * Opt-in: if CF_ORIGIN_SECRET isn't set, this check is skipped entirely
 * (returns true) so the allowlist keeps working on CF-Connecting-IP alone
 * until the Cloudflare-side rule is set up.
 */
export function hasValidOriginSecret(headers: Headers): boolean {
  const expected = process.env.CF_ORIGIN_SECRET;
  if (!expected) return true; // Not configured yet: don't block on it.
  const provided = headers.get("x-origin-secret");
  if (!provided) return false;
  return timingSafeEqual(provided, expected);
}

export function getClientIp(headers: Headers): string | null {
  if (!hasValidOriginSecret(headers)) return null;
  const cfConnectingIp = headers.get("cf-connecting-ip");
  return cfConnectingIp ? cfConnectingIp.trim() : null;
}

export function isRequestIpAllowed(ip: string | null, allowedRanges: string[]): boolean {
  if (allowedRanges.length === 0) return true; // Restriction not configured: allow all.
  if (!ip) return false; // Can't verify identity once the allowlist is enabled: fail closed.
  return allowedRanges.some((range) => isIpInRange(ip, range));
}
