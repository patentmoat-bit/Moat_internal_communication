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
      label: "Platform Oversight",
      items: [
        { href: "/portfolio", label: "Strategic Portfolio", icon: Shield },
        { href: "/search", label: "Prior Art Search", icon: Search },
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
      label: "Research & Analysis",
      items: [
        { href: "/search", label: "Prior Art & Novelty Search", icon: Search },
        { href: "/inventions", label: "Invention Workspace", icon: Lightbulb },
        { href: "/matters", label: "Research Matters", icon: Scale },
      ],
    },
    {
      label: "Intelligence & Output",
      items: [
        { href: "/landscape", label: "Technology Landscape", icon: Map },
        { href: "/competitors", label: "Competitor Intelligence", icon: Radar },
        { href: "/reports", label: "Final Reports Repository", icon: BarChart3 },
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
      label: "Executive Oversight",
      items: [
        { href: "/portfolio", label: "Strategic IP Portfolio", icon: Shield },
        { href: "/portfolio", label: "1-Click Filing Approvals", icon: CheckCircle },
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
      label: "Decisions & Actions",
      items: [
        { href: "/inbox", label: "Executive Command Inbox", icon: Inbox },
      ],
    },
  ],

  PATENT_DRAFTER: [
    {
      label: "Drafting Suite",
      items: [
        { href: "/drafts", label: "Drafting Studio", icon: FileText },
        { href: "/drafts", label: "Specification & Claim Tree", icon: FileCode },
      ],
    },
    {
      label: "Input Disclosures",
      items: [
        { href: "/inventions", label: "Approved Disclosures", icon: Lightbulb },
      ],
    },
    {
      label: "Workflow",
      items: [
        { href: "/inbox", label: "Drafting Tasks & Rework", icon: Inbox },
      ],
    },
  ],

  DESIGN_TEAM: [
    {
      label: "Design Suite",
      items: [
        { href: "/design", label: "Design Workspace (FIG 1-N)", icon: PenTool },
        { href: "/design", label: "Drawing Assets & Sheets", icon: FileSpreadsheet },
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

