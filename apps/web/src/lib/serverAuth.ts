import { cookies } from "next/headers";

export interface AuthenticatedUser {
  id: string;
  email: string;
  role: string;
  name?: string;
  sub: string;
}

const DEV_CEO_USER: AuthenticatedUser = {
  id: "8ee522c0-14d1-4fb0-a5dd-19c6269c4008",
  sub: "8ee522c0-14d1-4fb0-a5dd-19c6269c4008",
  email: "rravikumar@pinochle.ai",
  role: "CEO",
  name: "Raji",
};

export async function getAuthenticatedUser(): Promise<AuthenticatedUser | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("custom_access_token")?.value;

    if (!token) {
      return DEV_CEO_USER;
    }

    try {
      const parts = token.split(".");
      if (parts.length === 3) {
        const payloadJson = Buffer.from(parts[1], "base64").toString("utf-8");
        const payload = JSON.parse(payloadJson);
        if (payload?.sub) {
          return {
            id: payload.sub,
            sub: payload.sub,
            email: payload.email || `${payload.sub}@moat.ai`,
            role: (payload.role || "CEO").toUpperCase(),
            name: payload.name || payload.user_metadata?.full_name || "CEO Executive",
          };
        }
      }
    } catch {
      // ignore token decode error and fallback
    }

    return DEV_CEO_USER;
  } catch (err) {
    return DEV_CEO_USER;
  }
}
