import type { AppRole } from "@/types";

// ─────────────────────────────────────────────────────────────────────────────
// MOAT Patent Intelligence Platform — Role Intelligence
// Maps AppRole values to dashboard routes, modules, KPIs, and workspace config.
// ─────────────────────────────────────────────────────────────────────────────

export type EnterpriseRole =
  | "ceo"
  | "patent_counsel"
  | "research_lead"
  | "product_manager"
  | "analyst"
  | "admin"
  | "designer"
  | "finance_manager"
  | "patent_drafter";

// Keep KnownRole for backward compat
export type KnownRole = EnterpriseRole;

export type RoleWorkspace = {
  role: EnterpriseRole;
  label: string;
  route: string;
  purpose: string;
  headline: string;
  kpis: string[];
  dashboards: string[];
  agents: string[];
  questions: string[];
  modules: string[];
};

export const ROLE_WORKSPACES: Record<EnterpriseRole, RoleWorkspace> = {
  ceo: {
    role: "ceo",
    label: "CEO",
    route: "/dashboard/ceo",
    purpose: "Business value of innovation",
    headline: "Executive Innovation Intelligence",
    kpis: ["Innovation ROI", "Patent Pipeline Value", "Portfolio Strength", "Commercial Opportunity", "Licensing Potential", "Competitor Risk"],
    dashboards: ["Executive Dashboard", "Innovation ROI", "Portfolio Value", "Competitive Threat", "Licensing Opportunity", "White Space"],
    agents: ["Executive Strategy Agent", "Portfolio Value Agent", "Competitive Threat Agent"],
    questions: ["Which inventions have highest business value?", "Which technologies should we invest in?", "Which competitors threaten us?", "What is our portfolio strength?"],
    modules: [
      "/dashboard/ceo", 
      "/dashboard/ceo/notifications",
      "/dashboard/ceo/portfolio", 
      "/dashboard/ceo/moat", 
      "/dashboard/ceo/feedback", 
      "/dashboard/ceo/approvals", 
      "/ceo/trademark", 
      "/ceo/patent-filing"
    ],
  },
  patent_counsel: {
    role: "patent_counsel",
    label: "Chief IP Officer",
    route: "/dashboard/legal",
    purpose: "Patent conversion and filing",
    headline: "Prior Art and Filing Intelligence",
    kpis: ["Patentability Score", "Prior Art Risk", "Claim Coverage", "Filing Readiness", "Citation Risk", "Draft Progress"],
    dashboards: ["Prior Art Workspace", "Claim Mapping", "Drafting Workspace", "Filing Recommendation"],
    agents: ["Prior Art Agent", "Claim Mapping Agent", "Patent Drafting Agent", "Filing Risk Agent"],
    questions: ["Is this invention patentable?", "What prior art exists?", "Generate claims for this invention.", "What are filing risks?"],
    modules: ["/dashboard/legal", "/dashboard/search", "/dashboard/claim-intelligence", "/dashboard/patentability", "/dashboard/invalidity", "/dashboard/reports"],
  },
  research_lead: {
    role: "research_lead",
    label: "Inventor",
    route: "/dashboard/research",
    purpose: "Research commercialization",
    headline: "Research-to-Patent Intelligence",
    kpis: ["Commercialization Potential", "Publication Novelty", "Research Conversion", "White Space", "Domain Momentum", "Patent Readiness"],
    dashboards: ["Research Intelligence", "Publication Analysis", "Research-to-Patent Conversion", "Commercialization Opportunity"],
    agents: ["Research Commercialization Agent", "Publication Analysis Agent", "Novelty Agent"],
    questions: ["Which research can become filings?", "Which publications create defensible claims?", "Where is the commercial white space?"],
    modules: ["/dashboard/research", "/dashboard/workspace/invention", "/dashboard/novelty", "/dashboard/landscape", "/dashboard/reports", "/dashboard/search"],
  },
  product_manager: {
    role: "product_manager",
    label: "Business Development",
    route: "/dashboard/product",
    purpose: "Product innovation discovery",
    headline: "Feature and Competitive Product Intelligence",
    kpis: ["Feature Novelty", "UX Innovation", "Competitor Coverage", "Product Risk", "Opportunity Fit", "Alert Velocity"],
    dashboards: ["Product Innovation", "Feature Novelty Analysis", "UX Innovation Detection", "Competitive Product Mapping"],
    agents: ["Feature Novelty Agent", "Product Mapping Agent", "UX Innovation Agent"],
    questions: ["Which product features are novel?", "Where do competitors overlap?", "What should we protect next?"],
    modules: ["/dashboard/product", "/dashboard/competitor", "/dashboard/alerts", "/dashboard/novelty", "/dashboard/search", "/dashboard/reports"],
  },
  analyst: {
    role: "analyst",
    label: "Patent Analyst",
    route: "/dashboard/patent-analyst",
    purpose: "Patent intelligence execution",
    headline: "Search, Landscape, and Evidence Intelligence",
    kpis: ["Search Coverage", "Relevance", "Similarity", "Landscape Density", "Evidence Quality", "Alert Precision"],
    dashboards: ["Advanced Search", "Semantic Search", "Similarity", "Landscape", "Alerts"],
    agents: ["Patent Search Agent", "Landscape Analysis Agent", "Similarity Agent"],
    questions: ["What patents match this concept?", "Which results are most relevant?", "What patterns appear in the landscape?"],
    modules: ["/dashboard/patent-analyst", "/patent-analyst", "/dashboard/search", "/dashboard/semantic-search", "/dashboard/similarity", "/dashboard/landscape", "/dashboard/alerts", "/dashboard/reports", "/dashboard/workspace/invention", "/dashboard/decision", "/dashboard/novelty", "/dashboard/patentability", "/dashboard/tracker", "/dashboard/uploads", "/dashboard/pfs", "/dashboard/image-search", "/dashboard/trademark", "/dashboard/copyright", "/dashboard/ai-hub", "/dashboard/research"],
  },
  admin: {
    role: "admin",
    label: "Admin",
    route: "/dashboard/admin",
    purpose: "Platform governance and security",
    headline: "Enterprise Control Plane",
    kpis: ["Active Users", "Role Coverage", "Permission Drift", "Audit Events", "System Health", "Queue Health"],
    dashboards: ["User Management", "Permissions", "Security", "Audit Logs", "Platform Health"],
    agents: ["Security Agent", "RBAC Agent", "Audit Agent"],
    questions: ["Who can access which intelligence?", "Where are permission gaps?", "What activity needs review?"],
    modules: ["/dashboard/admin", "/dashboard/admin/reports", "/dashboard/admin/recovery", "/dashboard/admin/audit-logs", "/dashboard/security", "/dashboard/authentication", "/dashboard/settings", "/dashboard/reports", "/cms", "/dashboard/ai-hub"],
  },
  designer: {
    role: "designer",
    label: "Designing Team",
    route: "/dashboard/designer",
    purpose: "Document design and formatting",
    headline: "Patent Document Design Studio",
    kpis: ["Documents Formatted", "Revision Turnaround", "Design Quality", "Active Queue"],
    dashboards: ["Design Tasks", "Document Revisions"],
    agents: ["Formatting Assistant"],
    questions: ["Which documents need formatting?", "What are the latest revisions?"],
    modules: [
      "/dashboard/designer", 
      "/dashboard/designer/documents"
    ],
  },
  finance_manager: {
    role: "finance_manager",
    label: "Finance Manager",
    route: "/dashboard/finance",
    purpose: "Process payments for approved projects",
    headline: "Finance Operations Dashboard",
    kpis: ["Pending Tasks", "Paid Approvals", "Unpaid Approvals"],
    dashboards: ["Finance Tasks"],
    agents: [],
    questions: [],
    modules: ["/dashboard/finance"],
  },
  patent_drafter: {
    role: "patent_drafter",
    label: "Patent Drafter",
    route: "/dashboard/patent-drafter",
    purpose: "Draft patent applications and review designs",
    headline: "Patent Drafting Studio",
    kpis: ["Drafting Tasks", "Design Reviews Pending"],
    dashboards: ["Assigned Projects"],
    agents: [],
    questions: [],
    modules: ["/dashboard/patent-drafter"],
  }
};

// ── Role Mapping ───────────────────────────────────────────────────────────────

const APP_ROLE_TO_ENTERPRISE_ROLE: Record<string, EnterpriseRole> = {
  "CEO":                  "ceo",
  "Chief IP Officer":     "patent_counsel",
  "Inventor":             "research_lead",
  "Business Development": "product_manager",
  "Patent Analyst":       "analyst",
  "Admin":                "admin",
  "Super Admin":          "admin",
  "System Admin":         "admin",
  "ADMIN":                "admin",
  "Designer":             "designer",
  "Designing Team":       "designer",
  "Design Team":          "designer",
  "Finance Manager":      "finance_manager",
  "Patent Drafter":       "patent_drafter",
  // Legacy string values (backward compat)
  "ceo":            "ceo",
  "patent_counsel": "patent_counsel",
  "research_lead":  "research_lead",
  "product_manager":"product_manager",
  "analyst":        "analyst",
  "admin":          "admin",
  "super_admin":    "admin",
  "system_admin":   "admin",
  "designer":       "designer",
  "finance_manager":"finance_manager",
  "patent_drafter": "patent_drafter",
};

/**
 * Maps an AppRole (from Supabase users table) to an internal EnterpriseRole
 * used by the workspace / dashboard system. Returns null for any role string
 * not explicitly recognized above — callers must treat null as "deny access",
 * never silently fall back to a real role (an unrecognized role used to
 * default to "analyst", which was a silent privilege-assignment risk).
 */
export function appRoleToEnterpriseRole(role?: AppRole | string | null): EnterpriseRole | null {
  if (!role) return null;
  return APP_ROLE_TO_ENTERPRISE_ROLE[role] ?? null;
}

/** Alias kept for backward compatibility with existing components. */
export const toEnterpriseRole = appRoleToEnterpriseRole;

/** Get the full workspace config for a role, or null if the role is unrecognized. */
export function getRoleWorkspace(role?: AppRole | string | null): RoleWorkspace | null {
  const enterpriseRole = appRoleToEnterpriseRole(role);
  return enterpriseRole ? ROLE_WORKSPACES[enterpriseRole] : null;
}

/** Check whether a user with the given role may access an href. Unrecognized roles are denied. */
export function canAccessModule(role: AppRole | string | undefined | null, href: string): boolean {
  const workspace = getRoleWorkspace(role);
  if (!workspace) return false;
  if ((href === "/dashboard/ceo" || href.startsWith("/dashboard/ceo/") || href === "/ceo" || href.startsWith("/ceo/")) && role !== "CEO") return false;

  if (workspace.role === "admin") {
    // Admins should ONLY see settings/admin pages, not patent tools.
    return workspace.modules.some((module) => href === module || href.startsWith(`${module}/`));
  }

  const adminOnlyPaths = [
    "/dashboard/settings/email",
    "/dashboard/settings/alerts",
    "/dashboard/settings/templates",
    "/dashboard/reports",
    "/dashboard/settings/users",
    "/dashboard/settings/roles",
    "/dashboard/authentication"
  ];

  if (adminOnlyPaths.some(path => href === path || href.startsWith(`${path}/`))) {
    return false; // Only admins can access these
  }

  if (href === "/dashboard/settings" || href === "/dashboard/settings/notifications" || href === "/dashboard/settings/theme") {
    return true; // All authenticated users can access their personal settings
  }

  if (href === "/dashboard" || href === "/dashboard/analytics") return false;
  if (href === workspace.route) return true;
  return workspace.modules.some((module) => href === module || href.startsWith(`${module}/`));
}

// ── Route-to-required-role map (for middleware) ──────────────────────────────

/**
 * Canonical roles allowed to access a given dashboard route prefix, keyed by
 * EnterpriseRole rather than raw DB role strings. This is the single source
 * of truth for route-level access (previously a separate raw-string map here
 * duplicated — and could drift from — the normalization in
 * appRoleToEnterpriseRole above; e.g. a new admin-label variant only needs to
 * be added to APP_ROLE_TO_ENTERPRISE_ROLE, not here as well).
 *
 * "/dashboard/cto" and "/dashboard/cio" were previously listed here but have
 * no corresponding page or EnterpriseRole anywhere in the app — dropped as
 * dead entries rather than kept referencing a role that doesn't exist.
 */
export const ROLE_ROUTE_MAP: Record<string, EnterpriseRole[]> = {
  "/dashboard/ceo":            ["ceo"],
  "/ceo":                      ["ceo"],
  "/dashboard/legal":          ["patent_counsel", "admin"],
  "/dashboard/research":       ["research_lead", "admin", "analyst"],
  "/dashboard/product":        ["product_manager", "admin"],
  "/dashboard/patent-analyst": ["analyst", "admin"],
  "/patent-analyst":           ["analyst", "admin"],
  "/dashboard/search":         ["analyst", "admin"],
  "/dashboard/admin":          ["admin"],
  "/cms":                      ["admin"],
  "/dashboard/finance":        ["finance_manager", "admin"],
  "/dashboard/patent-drafter": ["patent_drafter", "admin"],
};

/** Returns which EnterpriseRoles are required for a given pathname. Empty = any auth'd user. */
export function getRequiredRoles(pathname: string): EnterpriseRole[] {
  for (const [prefix, roles] of Object.entries(ROLE_ROUTE_MAP)) {
    if (pathname === prefix || pathname.startsWith(`${prefix}/`)) {
      return roles;
    }
  }
  return [];
}
