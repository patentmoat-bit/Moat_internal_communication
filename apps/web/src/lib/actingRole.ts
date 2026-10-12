import { getSession } from "./session";
import type { TargetRole } from "./notifications";

const ALIASES: Record<string, TargetRole> = {
  "Patent Analyst": "PATENT_ANALYST",
  "Patent Drafter": "PATENT_DRAFTER",
  "Design Team": "DESIGN_TEAM",
};

export interface Actor {
  id: string;
  name: string;
  /** The role the caller asked to act as, only if their session actually holds it. */
  role: TargetRole | null;
  roles: string[];
  sso: boolean;
}

/** Server-side identity. A client-supplied role is honoured only when the
 *  signed-in user really holds it, so it cannot be used to escalate. */
export async function resolveActor(requestedRole?: string | null): Promise<Actor | null> {
  const session = await getSession();
  if (!session) return null;
  const wanted = requestedRole ? (ALIASES[requestedRole] ?? (requestedRole as TargetRole)) : null;
  return {
    id: session.user.id,
    name: session.user.name,
    role: wanted && session.roles.includes(wanted) ? wanted : null,
    roles: session.roles,
    sso: !!session.sso,
  };
}

/** The signed-in administrator, or null. Only admins approve people and assign roles. */
export async function requireAdmin(): Promise<Actor | null> {
  const actor = await resolveActor();
  return actor?.roles.includes("ADMIN") ? actor : null;
}

/** Display name of the signed-in person, for "who did this" records. */
export async function actorName(): Promise<string> {
  return (await getSession())?.user.name ?? "Unknown user";
}
