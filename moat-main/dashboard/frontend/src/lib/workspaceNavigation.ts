import { 
  LayoutDashboard, Search, FileText, Activity, AlertCircle, Bookmark, Share2, Shield,
  Image as ImageIcon, BarChart2, ShieldCheck, CheckSquare, Settings, Upload, Zap, Folder, BookOpen, PenTool, GitPullRequest, BookmarkPlus, FlaskConical
} from "lucide-react";
import { WorkspaceContext } from "@/stores/workspaceStore";

export const GLOBAL_ANALYST_NAVIGATION = [
  { href: "/dashboard/patent-analyst", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/dashboard/research", label: "Patent Hub", icon: Folder },
  { href: "/dashboard/trademark", label: "Trademark Hub", icon: ShieldCheck },
  { href: "/dashboard/copyright", label: "Copyrights Hub", icon: BookmarkPlus },
  { href: "/dashboard/tracker", label: "Tracker", icon: Activity },
  { href: "/dashboard/patent-analyst/documents", label: "Document Draft", icon: FileText },
  { href: "/dashboard/reports", label: "Report", icon: Bookmark },
  { href: "/dashboard/research/moat", label: "My MOAT", icon: FlaskConical },
  { href: "/dashboard/alerts", label: "Notification & Alerts", icon: AlertCircle },
];

export const PATENT_NAVIGATION = [
  { href: "/dashboard/patent-analyst", label: "Back to Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/dashboard/research", label: "Patent Dashboard", icon: Folder, exact: true },
  { href: "/dashboard/search", label: "Patent Search", icon: Search },
  { href: "/dashboard/ai-hub", label: "MOAT AI Hub", icon: Zap },
  { href: "/dashboard/tracker", label: "Real-Time Tracker", icon: Activity },
  { href: "/dashboard/patent-analyst/documents", label: "Document Draft", icon: FileText },
  { href: "/dashboard/research/moat", label: "My MOAT", icon: FlaskConical },
  { href: "/dashboard/alerts", label: "Alerts", icon: AlertCircle },
];

export const TRADEMARK_NAVIGATION = [
  { href: "/dashboard/patent-analyst", label: "Back to Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/dashboard/trademark", label: "Trademark Dashboard", icon: ShieldCheck, exact: true },
  { href: "/dashboard/trademark/projects", label: "Trademark Projects", icon: Folder },
  { href: "/dashboard/trademark/conflict", label: "Conflict / Opposition", icon: Shield },
  { href: "/dashboard/patent-analyst/documents", label: "Document Draft", icon: FileText },
  { href: "/dashboard/alerts", label: "Alerts", icon: AlertCircle },
];

export const COPYRIGHT_NAVIGATION = [
  { href: "/dashboard/patent-analyst", label: "Back to Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/dashboard/copyright", label: "Copyright Dashboard", icon: BookmarkPlus, exact: true },
  { href: "/dashboard/copyright/projects", label: "Copyright Projects", icon: Folder },
  { href: "/dashboard/copyright/assets", label: "Product / Asset Management", icon: BookmarkPlus },
  { href: "/dashboard/copyright/search", label: "Copyright Search", icon: Search },
  { href: "/dashboard/copyright/documents", label: "Documents & Evidence", icon: FileText },
  { href: "/dashboard/copyright/workflow", label: "Workflow Tracker", icon: Activity },
  { href: "/dashboard/copyright/registration", label: "Registration Tracking", icon: PenTool },
  { href: "/dashboard/alerts", label: "Alerts", icon: AlertCircle },
];

export function deriveWorkspaceFromRoute(pathname: string, currentWorkspace: WorkspaceContext): WorkspaceContext {
  if (pathname === "/dashboard/patent-analyst") return null;

  if (pathname.startsWith("/dashboard/trademark")) return "TRADEMARK";
  if (pathname.startsWith("/dashboard/copyright")) return "COPYRIGHT";

  const patentRoutes = [
    "/dashboard/search", "/dashboard/workspace", "/dashboard/decision", 
    "/dashboard/novelty", "/dashboard/patentability", "/dashboard/pfs", 
    "/dashboard/semantic-search", "/dashboard/similarity", "/dashboard/image-search", 
    "/dashboard/landscape", "/dashboard/ai-hub", "/dashboard/research", "/dashboard/patent-analyst/documents"
  ];
  
  if (patentRoutes.some(r => pathname.startsWith(r))) return "PATENT";

  return currentWorkspace;
}

export function getNavigationForWorkspace(workspace: WorkspaceContext) {
  switch (workspace) {
    case "PATENT": return PATENT_NAVIGATION;
    case "TRADEMARK": return TRADEMARK_NAVIGATION;
    case "COPYRIGHT": return COPYRIGHT_NAVIGATION;
    default: return GLOBAL_ANALYST_NAVIGATION;
  }
}
