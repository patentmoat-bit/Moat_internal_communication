import crypto from "crypto";
import fs from "fs";
import path from "path";

/** Microsoft Entra ID (Azure AD) authorization-code + PKCE flow, no SDK. */

export const SESSION_COOKIE = "moat_ms_session";
export const FLOW_COOKIE = "moat_ms_flow";
const SESSION_TTL_S = 8 * 60 * 60;

function env(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing environment variable ${name}`);
  return v;
}

export function msConfigured(): boolean {
  return Boolean(
    process.env.AZURE_TENANT_ID &&
      process.env.AZURE_CLIENT_ID &&
      process.env.MS_GRAPH_CLIENT_SECRET &&
      process.env.AUTH_SESSION_SECRET,
  );
}

export function redirectUri(): string {
  return `${process.env.APP_URL ?? "http://localhost:3000"}/api/auth/microsoft/callback`;
}

const authority = () => `https://login.microsoftonline.com/${env("AZURE_TENANT_ID")}`;

const b64url = (b: Buffer | string) => Buffer.from(b).toString("base64url");

// ---- signed cookie values -------------------------------------------------

function sign(value: string): string {
  const mac = crypto.createHmac("sha256", env("AUTH_SESSION_SECRET")).update(value).digest("base64url");
  return `${value}.${mac}`;
}

function unsign(signed: string | undefined): string | null {
  if (!signed) return null;
  const i = signed.lastIndexOf(".");
  if (i < 0) return null;
  const value = signed.slice(0, i);
  const expected = sign(value);
  const a = Buffer.from(expected);
  const b = Buffer.from(signed);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  return value;
}

export interface MsSession {
  oid: string;
  name: string;
  email: string;
  exp: number;
}

export function createSessionCookie(s: Omit<MsSession, "exp">): { value: string; maxAge: number } {
  const payload: MsSession = { ...s, exp: Math.floor(Date.now() / 1000) + SESSION_TTL_S };
  return { value: sign(b64url(JSON.stringify(payload))), maxAge: SESSION_TTL_S };
}

export function readSessionCookie(cookie: string | undefined): MsSession | null {
  try {
    if (!msConfigured()) return null;
    const v = unsign(cookie);
    if (!v) return null;
    const s = JSON.parse(Buffer.from(v, "base64url").toString("utf8")) as MsSession;
    return s.exp > Date.now() / 1000 ? s : null;
  } catch {
    return null;
  }
}

// ---- authorization request ------------------------------------------------

export function startFlow() {
  const state = crypto.randomBytes(16).toString("base64url");
  const nonce = crypto.randomBytes(16).toString("base64url");
  const verifier = crypto.randomBytes(32).toString("base64url");
  const challenge = crypto.createHash("sha256").update(verifier).digest("base64url");
  const params = new URLSearchParams({
    client_id: env("AZURE_CLIENT_ID"),
    response_type: "code",
    redirect_uri: redirectUri(),
    response_mode: "query",
    scope: "openid profile email User.Read",
    state,
    nonce,
    code_challenge: challenge,
    code_challenge_method: "S256",
    prompt: "select_account",
  });
  return {
    url: `${authority()}/oauth2/v2.0/authorize?${params}`,
    cookie: sign(b64url(JSON.stringify({ state, nonce, verifier }))),
  };
}

export function readFlowCookie(cookie: string | undefined) {
  const v = unsign(cookie);
  if (!v) return null;
  try {
    return JSON.parse(Buffer.from(v, "base64url").toString("utf8")) as {
      state: string;
      nonce: string;
      verifier: string;
    };
  } catch {
    return null;
  }
}

// ---- token exchange + id_token validation --------------------------------

export async function exchangeCode(code: string, verifier: string): Promise<string> {
  const res = await fetch(`${authority()}/oauth2/v2.0/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: env("AZURE_CLIENT_ID"),
      client_secret: env("MS_GRAPH_CLIENT_SECRET"),
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri(),
      code_verifier: verifier,
      scope: "openid profile email User.Read",
    }),
  });
  const json = (await res.json()) as { id_token?: string; error_description?: string };
  if (!res.ok || !json.id_token) throw new Error(json.error_description ?? "Token exchange failed");
  return json.id_token;
}

export interface IdClaims {
  oid: string;
  name?: string;
  preferred_username?: string;
  email?: string;
}

export async function verifyIdToken(idToken: string, nonce: string): Promise<IdClaims> {
  const [h, p, s] = idToken.split(".");
  if (!h || !p || !s) throw new Error("Malformed id_token");
  const header = JSON.parse(Buffer.from(h, "base64url").toString());
  const claims = JSON.parse(Buffer.from(p, "base64url").toString());

  if (header.alg !== "RS256") throw new Error("Unexpected token algorithm");
  const jwks = (await (
    await fetch(`${authority()}/discovery/v2.0/keys`, { next: { revalidate: 3600 } })
  ).json()) as { keys: (crypto.JsonWebKey & { kid: string })[] };
  const jwk = jwks.keys.find((k) => k.kid === header.kid);
  if (!jwk) throw new Error("Signing key not found");

  const ok = crypto.verify(
    "RSA-SHA256",
    Buffer.from(`${h}.${p}`),
    crypto.createPublicKey({ key: jwk, format: "jwk" }),
    Buffer.from(s, "base64url"),
  );
  if (!ok) throw new Error("Invalid token signature");

  const now = Date.now() / 1000;
  if (claims.aud !== env("AZURE_CLIENT_ID")) throw new Error("Wrong audience");
  if (claims.tid !== env("AZURE_TENANT_ID")) throw new Error("Wrong tenant");
  if (claims.iss !== `https://login.microsoftonline.com/${env("AZURE_TENANT_ID")}/v2.0`)
    throw new Error("Wrong issuer");
  if (claims.exp < now - 60) throw new Error("Token expired");
  if (claims.nonce !== nonce) throw new Error("Nonce mismatch");
  if (!claims.oid) throw new Error("Missing subject");

  assertOrgMember(claims);
  return claims;
}

/** Only people who belong to this organization. Guests invited into the tenant, and any
 *  address outside the allowed domains, are refused even though Microsoft vouches for them. */
export function assertOrgMember(claims: Record<string, unknown>, allowedDomains = process.env.SSO_ALLOWED_DOMAINS ?? "") {
  const identity = String(claims.preferred_username ?? "") + " " + String(claims.email ?? "");
  if (/#ext#/i.test(identity) || claims.idtyp === "guest") throw new Error("BLOCKED: guest accounts are not allowed");
  const email = String(claims.email ?? claims.preferred_username ?? "").toLowerCase();
  const domains = allowedDomains.split(",").map((d) => d.trim().toLowerCase()).filter(Boolean);
  if (domains.length && !domains.some((d) => email.endsWith(`@${d}`))) {
    throw new Error(`BLOCKED: ${email || "unknown address"} is outside the allowed domains`);
  }
}

// ---- sign-in activity log -------------------------------------------------

export type SsoEventType = "login_success" | "login_failure" | "logout" | "access_requested" | "access_pending" | "access_denied" | "login_blocked";

export interface SsoEvent {
  id: string;
  type: SsoEventType;
  timestamp: string;
  email?: string;
  name?: string;
  oid?: string;
  ip?: string;
  userAgent?: string;
  detail?: string;
}

const LOG_FILE = path.join(process.cwd(), "data", "sso-activity.json");
const MAX_EVENTS = 5000;

export function readSsoEvents(): SsoEvent[] {
  try {
    return JSON.parse(fs.readFileSync(LOG_FILE, "utf8")) as SsoEvent[];
  } catch {
    return [];
  }
}

export function logSsoEvent(e: Omit<SsoEvent, "id" | "timestamp">, req?: Request) {
  const events = readSsoEvents();
  events.unshift({
    ...e,
    id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
    ip: req?.headers.get("x-forwarded-for")?.split(",")[0]?.trim(),
    userAgent: req?.headers.get("user-agent") ?? undefined,
  });
  fs.mkdirSync(path.dirname(LOG_FILE), { recursive: true });
  fs.writeFileSync(LOG_FILE, JSON.stringify(events.slice(0, MAX_EVENTS), null, 2));
}
