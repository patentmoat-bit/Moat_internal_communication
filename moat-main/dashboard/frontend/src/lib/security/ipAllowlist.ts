/**
 * Optional network-level access restriction for the whole app.
 *
 * Vercel's Hobby plan doesn't offer native IP allowlisting (Trusted IPs /
 * Firewall custom rules are Pro+ only), so this enforces the same idea in
 * app middleware instead. Disabled by default — only takes effect once
 * ALLOWED_IPS is set, so existing deployments aren't locked out until
 * someone explicitly configures it.
 *
 * ALLOWED_IPS is a comma-separated list of IPv4 addresses and/or CIDR
 * ranges, e.g. "203.0.113.10,198.51.100.0/24". IPv6 is supported only as
 * an exact match (no CIDR range parsing).
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
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

/** Extracts the originating client IP from Vercel's x-forwarded-for header. */
export function getClientIp(forwardedFor: string | null): string | null {
  if (!forwardedFor) return null;
  const first = forwardedFor.split(",")[0]?.trim();
  return first || null;
}

export function isRequestIpAllowed(ip: string | null, allowedRanges: string[]): boolean {
  if (allowedRanges.length === 0) return true; // Restriction not configured: allow all.
  if (!ip) return false; // Can't verify identity once the allowlist is enabled: fail closed.
  return allowedRanges.some((range) => isIpInRange(ip, range));
}
