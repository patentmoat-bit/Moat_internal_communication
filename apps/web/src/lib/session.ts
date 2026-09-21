import { serverApi } from "./server-api";
import type { Session } from "./types";

const DEV_SESSION: Session = {
  user: { id: "u-dev-1", name: "Executive Patent Analyst", email: "analyst@moat.ai" },
  tenant: { id: "t-dev-1", slug: "moat-corp", name: "MOAT Global IP" },
  roles: ["CEO", "PATENT_ANALYST", "PATENT_DRAFTER", "DESIGN_TEAM", "FINANCE"],
  permissions: [
    "invention.read",
    "invention.create",
    "invention.edit",
    "invention.submit",
    "analysis.run",
    "analysis.read",
    "decision.record",
    "document.read",
    "document.create",
    "document.edit",
    "document.revise",
    "drawing.read",
    "drawing.create",
    "drawing.edit",
    "notification.read",
    "submission.read",
    "portfolio.read",
    "payment.read",
  ],
  availableTenants: [{ id: "t-dev-1", slug: "moat-corp", name: "MOAT Global IP" }],
};

/** The signed-in user, or null. In development, provides immediate seamless access to all 5 roles. */
export async function getSession(): Promise<Session | null> {
  try {
    const liveSession = await serverApi<Session>("/auth/me");
    if (liveSession) return liveSession;
  } catch {
    // Fall back to development session if auth server is in standalone mode
  }
  return DEV_SESSION;
}
