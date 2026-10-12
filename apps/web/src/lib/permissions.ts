/** What each business role may do. Admins hold every permission. */
export const ALL_PERMISSIONS = [
  "invention.read", "invention.create", "invention.edit", "invention.submit",
  "analysis.run", "analysis.read", "decision.record",
  "document.read", "document.create", "document.edit", "document.revise",
  "drawing.read", "drawing.create", "drawing.edit",
  "notification.read", "submission.read", "portfolio.read", "payment.read",
] as const;

export const BUSINESS_ROLES = ["CEO", "PATENT_ANALYST", "PATENT_DRAFTER", "DESIGN_TEAM", "FINANCE"] as const;
export type BusinessRole = (typeof BUSINESS_ROLES)[number];

const BY_ROLE: Record<BusinessRole, readonly string[]> = {
  CEO: ALL_PERMISSIONS,
  PATENT_ANALYST: [
    "invention.read", "invention.create", "invention.edit", "invention.submit", "analysis.run", "analysis.read",
    "document.read", "document.create", "document.edit", "document.revise", "drawing.read",
    "notification.read", "submission.read", "portfolio.read",
  ],
  PATENT_DRAFTER: [
    "invention.read", "analysis.read", "document.read", "document.create", "document.edit", "document.revise",
    "drawing.read", "drawing.create", "notification.read", "submission.read",
  ],
  DESIGN_TEAM: ["invention.read", "document.read", "drawing.read", "drawing.create", "drawing.edit", "notification.read"],
  FINANCE: ["invention.read", "payment.read", "portfolio.read", "notification.read"],
};

export const isBusinessRole = (r: unknown): r is BusinessRole => BUSINESS_ROLES.includes(r as BusinessRole);

export function permissionsFor(role: BusinessRole | null, isAdmin: boolean): string[] {
  if (isAdmin) return [...ALL_PERMISSIONS];
  return role ? [...BY_ROLE[role]] : [];
}
