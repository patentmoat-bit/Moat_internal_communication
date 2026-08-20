export interface Widget {
  id: string;
  type: "kpi";
  title: string;
  value: string | number;
  trend: string;
  trendDirection: "up" | "down" | "flat";
  description: string;
  href?: string;
}

export interface ChartData {
  id: string;
  type: "line" | "area" | "bar" | "radar";
  title: string;
  data: Record<string, any>[];
}

export interface Insight {
  id: string;
  title: string;
  description: string;
  severity: "high" | "medium" | "low";
}

export interface DashboardData {
  widgets: Widget[];
  charts: ChartData[];
  insights: Insight[];
  aiRecommendations: string[];
}

const CEO: DashboardData = {
  widgets: [
    { id: "w1", type: "kpi", title: "Innovation ROI", value: "320%", trend: "+12.4%", trendDirection: "up", description: "YoY Return on R&D Spend" },
    { id: "w2", type: "kpi", title: "Portfolio Value", value: "$84.2M", trend: "+5.4%", trendDirection: "up", description: "Estimated Intangible Asset Value", href: "/dashboard/ceo/portfolio" },
    { id: "w3", type: "kpi", title: "Pipeline Risk", value: "Low", trend: "-2.1%", trendDirection: "down", description: "Prior Art Collision Exposure" },
    { id: "w4", type: "kpi", title: "Licensing Revenue", value: "$12.4M", trend: "+18%", trendDirection: "up", description: "Active Licensing Agreements" },
  ],
  charts: [
    {
      id: "c1", type: "area", title: "Innovation Growth Velocity",
      data: [
        { name: "Jan", Patents: 12, TradeSecrets: 4 },
        { name: "Feb", Patents: 15, TradeSecrets: 5 },
        { name: "Mar", Patents: 18, TradeSecrets: 6 },
        { name: "Apr", Patents: 24, TradeSecrets: 8 },
        { name: "May", Patents: 30, TradeSecrets: 12 },
        { name: "Jun", Patents: 42, TradeSecrets: 15 },
      ],
    },
    {
      id: "c2", type: "bar", title: "Competitor Threat Score",
      data: [
        { name: "Acme Corp", value: 85 },
        { name: "Globex", value: 62 },
        { name: "Initech", value: 45 },
        { name: "Soylent", value: 30 },
        { name: "Massive Dyn.", value: 15 },
      ],
    },
  ],
  insights: [
    { id: "i1", title: "High Threat: Acme Corp", description: "Acme filed 3 patents overlapping our Core AI Routing engine. FTO analysis recommended.", severity: "high" },
    { id: "i2", title: "Licensing Opportunity", description: "Globex is utilizing technology similar to our expired '882 family.", severity: "medium" },
    { id: "i3", title: "White Space: Quantum Encryption", description: "Low patent density globally but high projected market value.", severity: "low" },
  ],
  aiRecommendations: [
    "Accelerate provisional filing on 'Neural Routing' before Acme Corp gains priority.",
    "Review licensing terms for the legacy European telecommunications portfolio.",
    "Allocate 15% more R&D budget to the Quantum Encryption team.",
  ],
};

const CTO: DashboardData = {
  widgets: [
    { id: "w1", type: "kpi", title: "Engineering Signals", value: "124", trend: "+24", trendDirection: "up", description: "Potential inventions detected in Git" },
    { id: "w2", type: "kpi", title: "Architecture Novelty", value: "88%", trend: "+4.2%", trendDirection: "up", description: "Unique structural components globally" },
    { id: "w3", type: "kpi", title: "Repo Coverage", value: "92%", trend: "Stable", trendDirection: "flat", description: "Git repos monitored by AI" },
    { id: "w4", type: "kpi", title: "Draft Conversion", value: "34%", trend: "+5%", trendDirection: "up", description: "Signals converted to disclosures" },
  ],
  charts: [
    {
      id: "c1", type: "radar", title: "Innovation Clusters",
      data: [
        { subject: "Distributed AI", A: 140, fullMark: 150 },
        { subject: "Edge Cloud", A: 120, fullMark: 150 },
        { subject: "Zero Trust", A: 86, fullMark: 150 },
        { subject: "Vector Data", A: 130, fullMark: 150 },
        { subject: "UX Frameworks", A: 65, fullMark: 150 },
        { subject: "IoT Sensors", A: 45, fullMark: 150 },
      ],
    },
    {
      id: "c2", type: "line", title: "Novelty Detection Rate (Weekly)",
      data: [
        { name: "W1", value: 5 }, { name: "W2", value: 8 }, { name: "W3", value: 15 },
        { name: "W4", value: 12 }, { name: "W5", value: 24 }, { name: "W6", value: 31 },
      ],
    },
  ],
  insights: [
    { id: "i1", title: "Hidden Invention Detected", description: "Team Alpha's 'Distributed Vector Caching' PR scores 95% novelty against prior art.", severity: "high" },
    { id: "i2", title: "Architecture Shift", description: "Significant drift towards Edge Cloud detected in latest sprint deliverables.", severity: "medium" },
    { id: "i3", title: "Stale Repository", description: "'Legacy-Auth' has 0 innovation signals in 12 months.", severity: "low" },
  ],
  aiRecommendations: [
    "Extract 'Distributed Vector Caching' into a formal invention disclosure immediately.",
    "Schedule an architecture review for the Edge Cloud shift to ensure IP capture.",
    "Archive 'Legacy-Auth' and redirect monitoring compute to active clusters.",
  ],
};

const CIO: DashboardData = {
  widgets: [
    { id: "w1", type: "kpi", title: "AI Transformation", value: "A-", trend: "+1 grade", trendDirection: "up", description: "Enterprise AI adoption index" },
    { id: "w2", type: "kpi", title: "Tech Debt Risk", value: "12%", trend: "-3%", trendDirection: "down", description: "Legacy system dependency rate" },
    { id: "w3", type: "kpi", title: "Active Projects", value: "45", trend: "+8", trendDirection: "up", description: "Initiatives tracked enterprise-wide" },
    { id: "w4", type: "kpi", title: "Cross-Team Collab", value: "78%", trend: "+12%", trendDirection: "up", description: "Projects with multi-department teams" },
  ],
  charts: [
    {
      id: "c1", type: "area", title: "Enterprise Innovation Map",
      data: [
        { name: "Q1", Engineering: 40, Research: 24, Product: 15 },
        { name: "Q2", Engineering: 45, Research: 30, Product: 20 },
        { name: "Q3", Engineering: 60, Research: 45, Product: 35 },
        { name: "Q4", Engineering: 85, Research: 60, Product: 50 },
      ],
    },
    {
      id: "c2", type: "bar", title: "Technology Adoption by Department",
      data: [
        { name: "Data Eng", value: 95 }, { name: "Core Platform", value: 85 },
        { name: "Mobile", value: 65 }, { name: "Marketing IT", value: 30 },
      ],
    },
  ],
  insights: [
    { id: "i1", title: "Department Innovation Gap", description: "Marketing IT shows 0 technical disclosures and low AI adoption this quarter.", severity: "high" },
    { id: "i2", title: "Infrastructure Bottleneck", description: "Legacy CI/CD pipelines slowing patentable deployments by 14 days on average.", severity: "medium" },
    { id: "i3", title: "Cross-Team Synergy", description: "Data Eng and Core Platform are co-developing highly novel algorithms.", severity: "low" },
  ],
  aiRecommendations: [
    "Scale 'Internal RAG Tool' enterprise-wide based on high engineering usage.",
    "Audit Marketing IT workflows for potential automation upgrades.",
    "Upgrade Legacy CI/CD to cloud-native to accelerate deployment of patentable assets.",
  ],
};

const LEGAL: DashboardData = {
  widgets: [
    { id: "w1", type: "kpi", title: "Filing Risk", value: "Moderate", trend: "Stable", trendDirection: "flat", description: "Average 103 obviousness risk" },
    { id: "w2", type: "kpi", title: "Patentability Index", value: "76/100", trend: "+12", trendDirection: "up", description: "Statutory criteria compliance across drafts" },
    { id: "w3", type: "kpi", title: "Pending Drafts", value: "14", trend: "+3", trendDirection: "up", description: "Awaiting attorney review" },
    { id: "w4", type: "kpi", title: "Citation Risk", value: "Low", trend: "-5%", trendDirection: "down", description: "Likelihood of examiner rejection" },
  ],
  charts: [
    {
      id: "c1", type: "bar", title: "Prior Art Risk Density",
      data: [
        { name: "101 Risk", value: 5 }, { name: "102 Risk", value: 14 },
        { name: "103 Risk", value: 34 }, { name: "112 Risk", value: 8 },
      ],
    },
    {
      id: "c2", type: "line", title: "Draft Completion Velocity",
      data: [
        { name: "Mon", value: 2 }, { name: "Tue", value: 5 }, { name: "Wed", value: 4 },
        { name: "Thu", value: 8 }, { name: "Fri", value: 11 },
      ],
    },
  ],
  insights: [
    { id: "i1", title: "Critical Claim Collision", description: "Draft #44 has 85% claim overlap with US Patent 10,234,444 (Google).", severity: "high" },
    { id: "i2", title: "Enablement Weakness", description: "Draft #32 lacks sufficient architectural detail for §112 written description.", severity: "medium" },
    { id: "i3", title: "Strong Novelty", description: "Draft #48 (Vector Compression) cleared all prior art searches with 0 matches.", severity: "low" },
  ],
  aiRecommendations: [
    "Narrow Claim 1 in Draft #44 to 'asynchronous multi-thread syncing' to avoid US 10,234,444.",
    "Request inventor interview for Draft #32 to flush out hardware implementation details.",
    "Fast-track Draft #48 for provisional filing — high novelty window is open.",
  ],
};

const RESEARCH: DashboardData = {
  widgets: [
    { id: "w1", type: "kpi", title: "Conversion Rate", value: "18%", trend: "+2.5%", trendDirection: "up", description: "Research papers to patent filings" },
    { id: "w2", type: "kpi", title: "Commercial Potential", value: "High", trend: "↑", trendDirection: "up", description: "Market alignment score" },
    { id: "w3", type: "kpi", title: "Papers Scanned", value: "452", trend: "+120", trendDirection: "up", description: "Internal publications analyzed by AI" },
    { id: "w4", type: "kpi", title: "White Space Match", value: "6", trend: "+1", trendDirection: "up", description: "Research overlapping market white space" },
  ],
  charts: [
    {
      id: "c1", type: "area", title: "Publication to Filing Trajectory",
      data: [
        { name: "2020", Publications: 100, Filings: 5 },
        { name: "2021", Publications: 120, Filings: 10 },
        { name: "2022", Publications: 150, Filings: 15 },
        { name: "2023", Publications: 200, Filings: 25 },
        { name: "2024", Publications: 250, Filings: 45 },
      ],
    },
    {
      id: "c2", type: "bar", title: "Domain Momentum",
      data: [
        { name: "Polymers", value: 85 }, { name: "Batteries", value: 65 },
        { name: "Solar", value: 45 }, { name: "Graphene", value: 20 },
      ],
    },
  ],
  insights: [
    { id: "i1", title: "Premature Disclosure Risk", description: "Team Beta is submitting 'Paper X' to IEEE next month — no provisional filed yet.", severity: "high" },
    { id: "i2", title: "Commercial Breakthrough", description: "Polymer experiment #44 aligns perfectly with current EV battery market demand.", severity: "low" },
    { id: "i3", title: "Domain Cooling", description: "Graphene outputs dropped 40% YoY with declining patentability scores.", severity: "medium" },
  ],
  aiRecommendations: [
    "DELAY publication of 'Paper X' until a provisional patent is filed to preserve rights.",
    "Set up a commercialization task force for Polymer experiment #44.",
    "Redirect Graphene budget to high-momentum Battery domain.",
  ],
};

const PRODUCT: DashboardData = {
  widgets: [
    { id: "w1", type: "kpi", title: "Feature Novelty", value: "89%", trend: "+5%", trendDirection: "up", description: "Unique UX/UI paradigms detected" },
    { id: "w2", type: "kpi", title: "Competitor Coverage", value: "42%", trend: "-2%", trendDirection: "down", description: "Feature overlap with rivals" },
    { id: "w3", type: "kpi", title: "Product Risk", value: "Low", trend: "Stable", trendDirection: "flat", description: "Infringement risk on roadmap" },
    { id: "w4", type: "kpi", title: "Design Patents", value: "8", trend: "+2", trendDirection: "up", description: "UX interfaces protected" },
  ],
  charts: [
    {
      id: "c1", type: "radar", title: "Competitive Product Mapping",
      data: [
        { subject: "Checkout UX", A: 120, fullMark: 150 },
        { subject: "Search Algorithm", A: 98, fullMark: 150 },
        { subject: "Data Viz", A: 140, fullMark: 150 },
        { subject: "Mobile Auth", A: 70, fullMark: 150 },
        { subject: "Onboarding", A: 85, fullMark: 150 },
      ],
    },
    {
      id: "c2", type: "bar", title: "Feature Novelty Breakdown",
      data: [
        { name: "High Novelty", value: 45 },
        { name: "Medium Novelty", value: 30 },
        { name: "Commoditized", value: 25 },
      ],
    },
  ],
  insights: [
    { id: "i1", title: "High UX Novelty", description: "The new 'Swipe-to-Pay' gesture in v4.0 is highly novel vs competitor apps.", severity: "low" },
    { id: "i2", title: "Competitor Mimicry", description: "Competitor X launched a search filtering UI identical to our unpatented v3.2.", severity: "high" },
    { id: "i3", title: "FTO Clearance Needed", description: "The 'AR Onboarding' feature needs FTO clearance before the Q4 launch.", severity: "medium" },
  ],
  aiRecommendations: [
    "File a design patent immediately for the 'Swipe-to-Pay' interface.",
    "Initiate FTO search for the AR Onboarding module.",
    "Review Competitor X's release for potential trade dress violations.",
  ],
};

const ANALYST: DashboardData = {
  widgets: [
    { id: "w1", type: "kpi", title: "Search Coverage", value: "97%", trend: "+2%", trendDirection: "up", description: "Prior art database coverage" },
    { id: "w2", type: "kpi", title: "Open Alerts", value: "8", trend: "-3", trendDirection: "down", description: "Active patent landscape alerts" },
    { id: "w3", type: "kpi", title: "Analyses Run", value: "124", trend: "+24", trendDirection: "up", description: "Novelty & patentability analyses this month" },
    { id: "w4", type: "kpi", title: "Saved Results", value: "342", trend: "+18", trendDirection: "up", description: "Saved search results and collections" },
  ],
  charts: [
    {
      id: "c1", type: "bar", title: "Patent Landscape Density",
      data: [
        { name: "AI/ML", value: 5240 }, { name: "Biotech", value: 3180 },
        { name: "Semiconductors", value: 4200 }, { name: "Clean Energy", value: 2100 },
        { name: "Cybersecurity", value: 1840 },
      ],
    },
    {
      id: "c2", type: "line", title: "Search Volume (Weekly)",
      data: [
        { name: "W1", value: 12 }, { name: "W2", value: 18 }, { name: "W3", value: 26 },
        { name: "W4", value: 22 }, { name: "W5", value: 35 }, { name: "W6", value: 41 },
      ],
    },
  ],
  insights: [
    { id: "i1", title: "High Density Zone: AI/ML", description: "AI/ML landscape has 5,240 patents — novelty searches require extra depth.", severity: "high" },
    { id: "i2", title: "Alert Triggered: Clean Energy", description: "New filings from Tesla overlap with 3 monitored claims.", severity: "medium" },
    { id: "i3", title: "Similarity Match Found", description: "Patent US10,123,456 has 91% structural similarity to your reference document.", severity: "low" },
  ],
  aiRecommendations: [
    "Run a semantic similarity sweep on the Clean Energy alert cluster.",
    "Update your saved search filters for AI/ML to narrow by IPC class G06N.",
    "Export the Q2 landscape analysis as a board-ready PDF report.",
  ],
};

const ADMIN: DashboardData = {
  widgets: [
    { id: "w1", type: "kpi", title: "Active Users", value: "142", trend: "+12", trendDirection: "up", description: "Authenticated sessions this week" },
    { id: "w2", type: "kpi", title: "Permission Drift", value: "3", trend: "-2", trendDirection: "down", description: "Roles with misconfigured permissions" },
    { id: "w3", type: "kpi", title: "Audit Events", value: "1,840", trend: "+320", trendDirection: "up", description: "Logged security events this month" },
    { id: "w4", type: "kpi", title: "System Health", value: "99.4%", trend: "Stable", trendDirection: "flat", description: "Platform uptime SLA" },
  ],
  charts: [
    {
      id: "c1", type: "area", title: "User Activity (30 Days)",
      data: [
        { name: "W1", Logins: 120, Searches: 340 },
        { name: "W2", Logins: 145, Searches: 410 },
        { name: "W3", Logins: 132, Searches: 380 },
        { name: "W4", Logins: 158, Searches: 450 },
      ],
    },
    {
      id: "c2", type: "bar", title: "Role Distribution",
      data: [
        { name: "Analyst", value: 64 }, { name: "Research Lead", value: 28 },
        { name: "Product Mgr", value: 18 }, { name: "CTO", value: 5 },
        { name: "CEO", value: 3 }, { name: "Admin", value: 4 },
      ],
    },
  ],
  insights: [
    { id: "i1", title: "Permission Drift Detected", description: "3 analyst accounts have elevated access beyond their role definition.", severity: "high" },
    { id: "i2", title: "Failed Login Spike", description: "14 failed login attempts from IP 192.168.4.22 in the past hour.", severity: "medium" },
    { id: "i3", title: "Audit Log Volume", description: "Log volume is trending +35% MoM — consider archiving Q1 audit records.", severity: "low" },
  ],
  aiRecommendations: [
    "Revoke elevated analyst permissions and enforce role-based access policy.",
    "Block or rate-limit IP 192.168.4.22 pending security review.",
    "Schedule quarterly permission audit and export RBAC matrix for compliance.",
  ],
};

const EMPTY: DashboardData = { widgets: [], charts: [], insights: [], aiRecommendations: [] };

const DATA_MAP: Record<string, DashboardData> = {
  ceo: CEO,
  cto: CTO,
  cio: CIO,
  patent_counsel: LEGAL,
  legal: LEGAL,
  research_lead: RESEARCH,
  research: RESEARCH,
  product_manager: PRODUCT,
  product: PRODUCT,
  analyst: ANALYST,
  admin: ADMIN,
};

export function getMockDashboard(role: string): DashboardData {
  return DATA_MAP[role] ?? EMPTY;
}
