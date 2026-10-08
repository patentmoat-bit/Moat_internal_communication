import type { LucideIcon } from "lucide-react";
import {
  Inbox,
  Lightbulb,
  FileText,
  PenTool,
  Scale,
  Search,
  Map,
  Radar,
  Briefcase,
  BarChart3,
  Settings,
  Wallet,
  Sparkles,
  Shield,
  FileCode,
  CheckCircle,
  FileSpreadsheet,
  Users,
  KeyRound,
  Award,
  Folder,
  UploadCloud,
  FileEdit,
  Clock,
  Globe2,
  Cpu,
  Flame,
  ShieldAlert,
  Layers,
  Compass,
  History,
  Image as ImageIcon,
  Newspaper,
  CheckSquare,
  CalendarClock,
  LayoutDashboard,
  Activity,
  ListTree,
  FilePen,
} from "lucide-react";
import type { RoleType } from "@/components/auth/role-context";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  badge?: string;
}

export interface NavGroup {
  label: string;
  items: NavItem[];
}

/** Role-specific navigation maps. Each role receives strictly their required toolset. */
export const ROLE_NAVIGATIONS: Record<RoleType, NavGroup[]> = {
  ADMIN: [
    {
      label: "Organization & Governance",
      items: [
        { href: "/admin", label: "User & Role Management", icon: Users },
        { href: "/admin?tab=roles", label: "Role Permissions Matrix", icon: KeyRound },
        { href: "/admin?tab=logs", label: "System Audit Logs", icon: BarChart3 },
      ],
    },
    {
      label: "IP Suites & Platform",
      items: [
        { href: "/search", label: "Prior Art & Patent Search", icon: Search },
        { href: "/intelligence", label: "IP Intelligence Suite", icon: Sparkles },
        { href: "/trademarks", label: "Trademark Suite", icon: Award },
        { href: "/copyrights", label: "Copyrights Suite", icon: FileCode },
        { href: "/portfolio", label: "Strategic Portfolio", icon: Shield },
        { href: "/matters", label: "Research Matters", icon: Scale },
        { href: "/payments", label: "Financial Docket", icon: Wallet },
      ],
    },
    {
      label: "Actions",
      items: [
        { href: "/inbox", label: "System Command Inbox", icon: Inbox },
      ],
    },
  ],

  PATENT_ANALYST: [
    {
      label: "Overview",
      items: [
        { href: "/portfolio", label: "Dashboard", icon: BarChart3 },
        { href: "/inventions", label: "Invention Workspace", icon: Lightbulb },
      ],
    },
    {
      label: "Search Engine",
      items: [
        { href: "/search?mode=BOOLEAN", label: "Traditional Search", icon: Search },
        { href: "/search?mode=SEMANTIC", label: "AI Search", icon: Sparkles },
      ],
    },
    {
      label: "Research Projects",
      items: [
        { href: "/matters?tab=storage", label: "Project Storage", icon: Folder },
        { href: "/matters?tab=uploads", label: "Uploads", icon: UploadCloud },
        { href: "/matters?tab=review", label: "Review Note", icon: FileEdit },
        { href: "/matters?tab=tracker", label: "Tracker", icon: Clock },
        { href: "/matters?tab=comparison", label: "Comparison", icon: Scale },
      ],
    },
    {
      label: "Strategic Intelligence",
      items: [
        { href: "/intelligence", label: "IP Intelligence", icon: Sparkles },
        { href: "/intelligence?tab=COMPETITIVE", label: "Competitive Intelligence", icon: Radar },
        { href: "/intelligence?tab=TECHNOLOGY", label: "Technology Intelligence", icon: Cpu },
        { href: "/intelligence?tab=MARKET", label: "Market Intelligence", icon: Globe2 },
        { href: "/intelligence?tab=INNOVATION", label: "Innovation Intelligence", icon: Flame },
        { href: "/intelligence?tab=REGULATORY", label: "Regulatory Intelligence", icon: ShieldAlert },
        { href: "/intelligence?tab=PORTFOLIO", label: "Portfolio Intelligence", icon: Layers },
        { href: "/intelligence?tab=WHITESPACE", label: "White-Space Intelligence", icon: Compass },
      ],
    },
    {
      label: "Report",
      items: [
        { href: "/reports", label: "Final Report Repository", icon: FileText },
        { href: "/reports?tab=history", label: "Activity History", icon: History },
      ],
    },
    {
      label: "Trademark",
      items: [
        { href: "/trademarks?tab=WORD_SEARCH", label: "Word Trademark", icon: Award },
        { href: "/trademarks?tab=LOGO_SEARCH", label: "Logo Trademark", icon: ImageIcon },
        { href: "/trademarks?tab=UPLOAD_REVIEW", label: "Upload & Review", icon: UploadCloud },
        { href: "/trademarks?tab=PROJECT_STORAGE", label: "Project Storage", icon: Folder },
        { href: "/trademarks?tab=REMINDERS_DOCKET", label: "Reminder", icon: Clock },
      ],
    },
    {
      label: "Actions",
      items: [
        { href: "/inbox", label: "Command Inbox & Tasks", icon: Inbox },
      ],
    },
  ],

  CEO: [
    
    {
      label: "Executive",
      items: [
        { href: "/dashboard/ceo", label: "Dashboard", icon: LayoutDashboard },
      ],
    },
    {
      label: "Executive Oversight",
      items: [
        { href: "/portfolio", label: "Strategic IP Portfolio", icon: Shield },
        { href: "/intelligence", label: "IP Intelligence Suite", icon: Sparkles },
        { href: "/portfolio?tab=approvals", label: "1-Click Filing Approvals", icon: CheckCircle },
      ],
    },
    {
      label: "Innovation",
      items: [
        { href: "/inventions/new", label: "New Ideas", icon: Lightbulb },
        { href: "/portfolio/pipeline", label: "Pipeline", icon: Layers },
        { href: "/portfolio/opportunities", label: "Opportunities", icon: Compass },
        { href: "/inventions", label: "Workspace", icon: Briefcase },
      ],
    },
    {
      label: "Strategic Intelligence",
      items: [
        { href: "/competitors", label: "Competitor Radar", icon: Radar },
        { href: "/landscape", label: "Tech Innovation Trends", icon: Map },
        { href: "/reports", label: "Executive Analytics", icon: BarChart3 },
      ],
    },
    {
      label: "IP News & Intelligence",
      items: [
        { href: "/dashboard/ceo/news", label: "IP News & Intelligence", icon: Newspaper },
      ],
    },
    {
      label: "Decisions & Actions",
      items: [
        { href: "/dashboard/ceo/approvals", label: "Approvals", icon: CheckSquare },
        { href: "/dashboard/ceo/docket", label: "Docket", icon: CalendarClock },
        { href: "/inbox", label: "Executive Command Inbox", icon: Inbox },
      ],
    },
    {
      label: "Reports",
      items: [
        { href: "/dashboard/ceo/reports/executive", label: "Executive Reports", icon: FileText },
        { href: "/dashboard/ceo/reports/innovation", label: "Innovation Reports", icon: Lightbulb },
        { href: "/dashboard/ceo/reports/portfolio", label: "Portfolio Reports", icon: Briefcase },
      ],
    },
    {
      label: "Activity",
      items: [
        { href: "/dashboard/ceo/activity", label: "Activity History", icon: Activity },
      ],
    },
  ],

  PATENT_DRAFTER: [
    {
      label: "DASHBOARD",
      items: [
        { href: "/dashboard/patent-drafter", label: "Overview", icon: LayoutDashboard },
      ],
    },
    {
      label: "DRAFTING WORKSPACE",
      items: [
        { href: "/drafts", label: "My Drafts", icon: FileText },
        { href: "/drafts/assigned", label: "Assigned to Me", icon: Users },
        { href: "/drafts/progress", label: "Draft in Progress", icon: Clock },
        { href: "/drafts/review", label: "Under Review", icon: Search },
        { href: "/drafts/completed", label: "Completed", icon: CheckCircle },
      ],
    },
    {
      label: "INVENTION WORKSPACE",
      items: [
        { href: "/inventions", label: "Invention Details", icon: Lightbulb },
        { href: "/inventions/tech-info", label: "Technical Information", icon: Cpu },
        { href: "/inventions/research", label: "Research Reference", icon: Compass },
        { href: "/inventions/docs", label: "Documents", icon: Folder },
      ],
    },
    {
      label: "CLAIM WORKSPACE",
      items: [
        { href: "/claims/tree", label: "Claim Tree", icon: ListTree },
        { href: "/claims/method", label: "Method Claims", icon: FileCode },
        { href: "/claims/system", label: "System Claims", icon: Layers },
        { href: "/claims/variations", label: "Claim Variations", icon: Sparkles },
      ],
    },
    {
      label: "TEMPLATES",
      items: [
        { href: "/templates/uspto", label: "USPTO Formats", icon: FilePen },
        { href: "/templates/epo", label: "EPO Formats", icon: FilePen },
        { href: "/templates/pct", label: "PCT Formats", icon: FilePen },
      ],
    },
    {
      label: "DOCUMENTS",
      items: [
        { href: "/docs/disclosures", label: "Disclosures", icon: FileText },
        { href: "/docs/prior-art", label: "Prior Art", icon: FileSpreadsheet },
        { href: "/docs/drawings", label: "Drawings", icon: ImageIcon },
        { href: "/docs/exports", label: "Export Files", icon: UploadCloud },
      ],
    },
    {
      label: "REVIEW & COLLABORATION",
      items: [
        { href: "/collab/annotations", label: "Annotations", icon: FileEdit },
        { href: "/collab/approvals", label: "Approvals", icon: CheckSquare },
        { href: "/collab/feedback", label: "Feedback Logs", icon: History },
      ],
    },
    {
      label: "DOCKET",
      items: [
        { href: "/docket/deadlines", label: "Upcoming Deadlines", icon: CalendarClock },
        { href: "/docket/reminders", label: "Reminders", icon: Clock },
        { href: "/docket/actions", label: "Action Items", icon: Activity },
      ],
    },
    {
      label: "REPORTS",
      items: [
        { href: "/reports/metrics", label: "Drafting Metrics", icon: BarChart3 },
        { href: "/reports/time", label: "Time Tracking", icon: Clock },
        { href: "/reports/productivity", label: "Productivity", icon: Flame },
      ],
    },
  ],
  DESIGN_TEAM: [
    {
      label: "Design Suite",
      items: [
        { href: "/design", label: "Design Workspace (FIG 1-N)", icon: PenTool },
        { href: "/design", label: "Drawing Assets & Sheets", icon: FileSpreadsheet },
        { href: "/trademarks", label: "Logo & Specimen Review", icon: Award },
      ],
    },
    {
      label: "Workflow",
      items: [
        { href: "/inbox", label: "Drawing Requests & Revisions", icon: Inbox },
      ],
    },
  ],

  FINANCE: [
    {
      label: "Financial Docket",
      items: [
        { href: "/payments", label: "Project Payment Docket", icon: Wallet },
        { href: "/payments", label: "Statutory USPTO Fees", icon: Scale },
      ],
    },
    {
      label: "Workflow",
      items: [
        { href: "/inbox", label: "Payment Clearances & Alerts", icon: Inbox },
      ],
    },
  ],
};

export const secondaryNavigation: NavItem[] = [
  { href: "/admin", label: "Admin Control", icon: Users },
  { href: "/settings", label: "Settings", icon: Settings },
];

export const navigation: NavGroup[] = ROLE_NAVIGATIONS.PATENT_ANALYST;

export function visibleTo(items: NavItem[], permissions?: string[]): NavItem[] {
  return items;
}

export function landingFor(permissions?: string[]): string {
  return "/search";
}

export function landingForRole(role: RoleType): string {
  switch (role) {
    case "ADMIN":
      return "/admin";
    case "CEO":
      return "/portfolio";
    case "PATENT_ANALYST":
      return "/search";
    case "PATENT_DRAFTER":
      return "/drafts";
    case "DESIGN_TEAM":
      return "/design";
    case "FINANCE":
      return "/payments";
    default:
      return "/admin";
  }
}

