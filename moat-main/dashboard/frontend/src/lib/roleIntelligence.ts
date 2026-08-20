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
  apiScopes: string[];
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
    apiScopes: ["analytics:read", "portfolio:read", "competitors:read", "reports:read"],
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
    apiScopes: ["prior_art:read", "claims:write", "patentability:read", "reports:write"],
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
    apiScopes: ["inventions:write", "novelty:read", "landscape:read", "documents:write"],
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
    apiScopes: ["products:read", "competitors:read", "novelty:read", "alerts:write"],
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
    apiScopes: ["search:read", "analytics:read", "alerts:read"],
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
    apiScopes: ["admin:*", "rbac:*", "audit:read"],
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
    apiScopes: ["documents:read", "documents:write"],
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
    apiScopes: ["finance:read", "finance:write"]
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
    apiScopes: ["documents:read", "documents:write", "workflows:transition"]
  }
};

// ── Role Mapping ───────────────────────────────────────────────────────────────

/**
 * Maps an AppRole (from Supabase users table) to an internal EnterpriseRole
 * used by the workspace / dashboard system.
 */
export function appRoleToEnterpriseRole(role?: AppRole | string | null): EnterpriseRole {
  switch (role) {
    case "CEO":                  return "ceo";
    case "Chief IP Officer":     return "patent_counsel";
    case "Inventor":             return "research_lead";
    case "Business Development": return "product_manager";
    case "Patent Analyst":       return "analyst";
    case "Admin":                return "admin";
    case "Super Admin":          return "admin";
    case "System Admin":         return "admin";
    case "ADMIN":                return "admin";
    case "Designer":             return "designer";
    case "Designing Team":       return "designer";
    case "Design Team":          return "designer";
    case "Finance Manager":      return "finance_manager";
    case "Patent Drafter":       return "patent_drafter";
    // Legacy string values (backward compat)
    case "ceo":           return "ceo";
    case "patent_counsel":return "patent_counsel";
    case "research_lead": return "research_lead";
    case "product_manager":return "product_manager";
    case "analyst":       return "analyst";
    case "admin":         return "admin";
    case "super_admin":   return "admin";
    case "system_admin":  return "admin";
    case "designer":      return "designer";
    case "finance_manager":return "finance_manager";
    case "patent_drafter":return "patent_drafter";
    default:              return "analyst";
  }
}

/** Alias kept for backward compatibility with existing components. */
export const toEnterpriseRole = appRoleToEnterpriseRole;

/** Get the full workspace config for a role. */
export function getRoleWorkspace(role?: AppRole | string | null): RoleWorkspace {
  return ROLE_WORKSPACES[appRoleToEnterpriseRole(role)];
}

/** Check whether a user with the given role may access an href. */
export function canAccessModule(role: AppRole | string | undefined | null, href: string): boolean {
  const workspace = getRoleWorkspace(role);
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

/** Returns the AppRole required to access a given dashboard prefix, or null if public. */
export const ROLE_ROUTE_MAP: Record<string, AppRole[]> = {
  "/dashboard/ceo":      ["CEO"],
  "/ceo":                ["CEO"],
  "/dashboard/cto":      ["CTO", "Admin", "Super Admin"],
  "/dashboard/cio":      ["CIO", "Admin", "Super Admin"],
  "/dashboard/legal":    ["Chief IP Officer", "Admin", "Super Admin"],
  "/dashboard/research": ["Inventor", "Admin", "Super Admin", "Patent Analyst"],
  "/dashboard/product":  ["Business Development", "Admin", "Super Admin"],
  "/dashboard/patent-analyst": ["Patent Analyst", "Admin", "Super Admin"],
  "/patent-analyst":     ["Patent Analyst", "Admin", "Super Admin"],
  "/dashboard/search":   ["Patent Analyst", "Admin", "Super Admin"],
  "/dashboard/admin":    ["Admin", "Super Admin"],
  "/cms":                ["Admin", "Super Admin", "System Admin"],
  "/dashboard/finance":  ["Finance Manager", "Admin", "Super Admin"],
  "/dashboard/patent-drafter": ["Patent Drafter", "Admin", "Super Admin"],
};

/** Returns which AppRoles are required for a given pathname. Empty = any auth'd user. */
export function getRequiredRoles(pathname: string): AppRole[] {
  for (const [prefix, roles] of Object.entries(ROLE_ROUTE_MAP)) {
    if (pathname === prefix || pathname.startsWith(`${prefix}/`)) {
      return roles;
    }
  }
  return [];
}
