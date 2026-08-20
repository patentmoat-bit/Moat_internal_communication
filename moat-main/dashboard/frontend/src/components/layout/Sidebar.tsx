"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import { useAuthStore } from "@/stores/authStore"
import { useAlertStore } from "@/stores/alertStore"
import { useWorkspaceStore } from "@/stores/workspaceStore"
import { deriveWorkspaceFromRoute, getNavigationForWorkspace } from "@/lib/workspaceNavigation"
import { cn } from "@/lib/utils"
import { canAccessModule, getRoleWorkspace, appRoleToEnterpriseRole } from "@/lib/roleIntelligence"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  Sparkles, LayoutDashboard, Search, FolderOpen, Briefcase, BrainCircuit,
  Bookmark, GitCompare, Share2, ChevronLeft, ChevronRight,
  LogOut, Highlighter, Bell, Settings, BarChart2, LockKeyhole,
  Kanban, FileText, ScrollText, ShieldAlert, Building2, Store, Network,
  Lightbulb, Scale, Bot, ScanSearch, ImageIcon, Gavel, Stamp, Crosshair,
  BarChart3, FlaskConical, BellRing, MessageSquare, ShieldCheck, Activity, UploadCloud, FileSignature,
  Users, Key, User, Monitor, Mail, LayoutTemplate, Brush, CheckCircle, Calendar, PieChart, ImagePlus, Shield
} from "lucide-react"
import * as LucideIcons from "lucide-react"
import type { User as UserType } from "@/types"

interface SidebarProps {
  user?: UserType
  collapsed?: boolean
  onToggle?: () => void
  isMobile?: boolean
  open?: boolean
  onClose?: () => void
}

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/dashboard/ceo", label: "Dashboard", icon: Sparkles },
  { href: "/dashboard/ceo/notifications", label: "Notification Center", icon: BellRing },
  { href: "/dashboard/ceo/approvals", label: "Document Approvals", icon: CheckCircle },
  { href: "/ceo/trademark", label: "Trademarks", icon: ShieldCheck },
  { href: "/ceo/patent-filing", label: "Patent Filing", icon: ScrollText },
  { href: "/dashboard/ceo/portfolio", label: "Portfolio", icon: BarChart3 },
  { href: "/dashboard/ceo/moat", label: "My MOAT", icon: FlaskConical },
  { href: "/dashboard/ceo/feedback", label: "CEO Feedback", icon: MessageSquare },
  { href: "/dashboard/legal", label: "Legal Workspace", icon: Gavel },
  { href: "/dashboard/research", label: "Research Workspace", icon: Lightbulb },
  { href: "/dashboard/product", label: "Product Workspace", icon: Kanban },
  { href: "/dashboard/analyst", label: "Analyst Workspace", icon: Search },
  { href: "/dashboard/admin", label: "Admin Workspace", icon: Settings },
  { href: "/cms", label: "CMS Admin Panel", icon: ShieldAlert },
  { href: "/dashboard/settings/users", label: "User Management", icon: Users },
  { href: "/dashboard/settings/roles", label: "Roles & Permissions", icon: ShieldCheck },
  { href: "/dashboard/settings/email", label: "Email Configuration", icon: Mail },
  { href: "/cms/notification-rules", label: "Notification Rules", icon: BellRing },
  { href: "/dashboard/settings/alerts", label: "Email Alerts", icon: BellRing },
  { href: "/dashboard/settings/templates", label: "Email Templates", icon: LayoutTemplate },
  { href: "/dashboard/authentication", label: "Authentication", icon: LockKeyhole },
  { href: "/cms/iam/dashboard", label: "Security Dashboard", icon: ShieldAlert },
  { href: "/cms/iam/sessions", label: "Session Management", icon: Monitor },
  { href: "/cms/iam/password-policy", label: "Password Policy", icon: Key },
  { href: "/cms/iam/mfa-settings", label: "MFA Settings", icon: ShieldCheck },
  { href: "/cms/iam/audit-logs", label: "Security Audit Logs", icon: Activity },
  { href: "/dashboard/workspace", label: "Workspace", icon: Briefcase },
  { href: "/dashboard/matters", label: "Matter Management", icon: Gavel },
  { href: "/dashboard/projects", label: "Projects", icon: Kanban },
  { href: "/dashboard/search", label: "Patent Search", icon: Search },
  { href: "/dashboard/patents", label: "Patent Detail", icon: FileText },
  { href: "/dashboard/collections", label: "Collections", icon: FolderOpen },
  { href: "/dashboard/workspace/invention", label: "Invention Workspace", icon: BrainCircuit },
  { href: "/dashboard/decision", label: "Decision Intelligence", icon: Scale },
  { href: "/dashboard/novelty", label: "Novelty + Prior Art Engine", icon: Lightbulb },
  { href: "/dashboard/tracker", label: "Realtime Tracker", icon: Activity },
  { href: "/dashboard/uploads", label: "Upload Center", icon: UploadCloud },
  { href: "/dashboard/patent-analyst/documents", label: "Document Drafts", icon: FileText },
  { href: "/dashboard/designer", label: "Designer Dashboard", icon: LayoutDashboard },
  { href: "/dashboard/designer/documents", label: "Design Workspace", icon: Brush },

  { href: "/dashboard/trademark", label: "Trademark System", icon: ShieldCheck },
  { href: "/dashboard/claim-intelligence", label: "Claims", icon: ScrollText },
  { href: "/dashboard/evidence", label: "Evidence", icon: ScanSearch },
  { href: "/dashboard/semantic-search", label: "Semantic", icon: Network },
  { href: "/dashboard/copilot", label: "Copilot", icon: Bot },
  { href: "/dashboard/similarity", label: "Similarity", icon: GitCompare },
  { href: "/dashboard/image-search", label: "Image Search", icon: ImageIcon },
  { href: "/dashboard/risk", label: "FTO / Risk", icon: ShieldAlert },
  { href: "/dashboard/invalidity", label: "Invalidity", icon: Crosshair },

  { href: "/dashboard/alerts", label: "Alerts", icon: Bell },
  { href: "/dashboard/notifications", label: "Notifications", icon: BellRing },
  { href: "/dashboard/feedback", label: "Feedback", icon: MessageSquare },
  { href: "/dashboard/competitor", label: "Competitor", icon: Building2 },
  { href: "/dashboard/landscape", label: "Landscape", icon: BarChart2 },
  { href: "/dashboard/visualization", label: "Neo4j Viz", icon: Share2 },
  { href: "/dashboard/reports", label: "Reports", icon: Bookmark, adminHref: "/dashboard/admin/reports" },
  { href: "/dashboard/admin/recovery", label: "Disaster Recovery", icon: ShieldAlert },
  { href: "/dashboard/admin/audit-logs", label: "Audit Logs", icon: Shield },
  { href: "/dashboard/marketplace", label: "Marketplace", icon: Store },
]

export function Sidebar({ user, collapsed = false, onToggle, isMobile = false, open = false, onClose }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const { unreadCount } = useAlertStore()

  const [cmsNavItems, setCmsNavItems] = React.useState<typeof navItems>([])

  React.useEffect(() => {
    // Attempt to fetch dynamic sidebar config from CMS
    const fetchSidebar = async () => {
      try {
        const res = await fetch("/api/v1/cms/sidebar-items")
        if (res.ok) {
          const data = await res.json()
          if (data && data.length > 0) {
            const mappedItems = data.map((item: any) => ({
              href: item.path || "#",
              label: item.label,
              icon: (LucideIcons as any)[item.icon || "Folder"] || FolderOpen,
              exact: item.path === "/dashboard"
            }))
            setCmsNavItems(mappedItems)
          }
        }
      } catch (err) {
        console.warn("Failed to load CMS sidebar config, using fallback", err)
      }
    }
    fetchSidebar()
  }, [])

  const workspaceContext = useWorkspaceStore((state) => state.workspace);
  const setWorkspace = useWorkspaceStore((state) => state.setWorkspace);

  React.useEffect(() => {
    // Determine the active workspace from the route
    const derived = deriveWorkspaceFromRoute(pathname, workspaceContext);
    if (derived !== workspaceContext) {
      setWorkspace(derived);
    }
  }, [pathname, workspaceContext, setWorkspace]);

  const roleWorkspace = getRoleWorkspace(user?.role)
  const isAnalyst = appRoleToEnterpriseRole(user?.role) === "analyst";
  
  const activeNavItems = cmsNavItems.length > 0 ? cmsNavItems : navItems;
  let visibleNavItems = activeNavItems
    .filter((item) => canAccessModule(user?.role, item.href) || item.href === roleWorkspace.route)

  let menuLabel = "Main Menu";

  if (isAnalyst) {
    visibleNavItems = getNavigationForWorkspace(workspaceContext);
    if (workspaceContext === null) menuLabel = "ANALYST DASHBOARD";
    else if (workspaceContext === "PATENT") menuLabel = "PATENT HUB";
    else if (workspaceContext === "TRADEMARK") menuLabel = "TRADEMARK HUB";
    else if (workspaceContext === "COPYRIGHT") menuLabel = "COPYRIGHTS HUB";
  }

  const isActive = (href: string, exact = false) =>
    exact ? pathname === href : (pathname === href || pathname.startsWith(href + "/"))

  const sidebarContent = (
    <div className={cn(
      "flex h-full flex-col",
      "bg-[hsl(var(--sidebar-background))] border-r border-[hsl(var(--border))]",
      collapsed ? "w-[70px]" : "w-[240px]",
      "transition-all duration-300"
    )}>

      {/* Logo */}
      <div className="flex h-16 items-center px-4 shrink-0">
        <div className="flex items-center gap-3 w-full">
          {/* MOAT brand mark */}
          <div className="relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-[#d7bd6a] bg-gradient-to-br from-[#f3d978] via-[#c9a84c] to-[#6f5418] shadow-lg shadow-[#c9a84c]/25 font-black text-[#131309]">
            <span className="absolute inset-x-2 top-2 h-px bg-white/55" />
            <span className="absolute bottom-1.5 right-1.5 h-2 w-2 rounded-full bg-[#131309]/80" />
            <span className="relative text-[13px] tracking-tight">M</span>
          </div>
          <AnimatePresence>
            {!collapsed && (
              <motion.div
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -8 }}
                transition={{ duration: 0.15 }}
                className="overflow-hidden"
              >
                <span className="text-[17px] font-black tracking-[0.18em] text-[hsl(var(--sidebar-foreground))]">MOAT</span>
                <p className="mt-0.5 text-[9px] font-semibold uppercase leading-tight tracking-[0.16em] text-[#a9821f]">Patent Intelligence Platform</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        {!isMobile && (
          <button
            onClick={onToggle}
            className="ml-auto shrink-0 flex h-7 w-7 items-center justify-center rounded-lg text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--primary))] hover:bg-[hsl(var(--primary))]/10 transition-colors"
          >
            {collapsed ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronLeft className="h-3.5 w-3.5" />}
          </button>
        )}
      </div>

      {/* Section label */}
      {!collapsed && menuLabel && (
        <div className="px-4 pb-1 pt-3">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-[hsl(var(--muted-foreground))]">{menuLabel}</p>
        </div>
      )}

      {/* Nav */}
      <nav className="flex-1 space-y-0.5 px-2 py-2 overflow-y-auto scrollbar-hide">
        <TooltipProvider delayDuration={0}>
          {visibleNavItems.map((item) => {
            const isAdminUser = appRoleToEnterpriseRole(user?.role) === "admin";
            const resolvedHref = ((item as any).adminHref && isAdminUser) ? (item as any).adminHref : item.href;
            const active = isActive(resolvedHref, item.exact)
            const content = collapsed ? (
              <Tooltip key={item.href}>
                <TooltipTrigger asChild>
                  <Link
                    href={resolvedHref}
                    onClick={isMobile ? onClose : undefined}
                    className={cn(
                      "relative flex h-10 w-full items-center justify-center rounded-xl transition-all duration-150",
                      active
                        ? "bg-[#c9a84c]/15 text-[#c9a84c]"
                        : "text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--primary))]/10 hover:text-[hsl(var(--sidebar-foreground))]"
                    )}
                  >
                    {active && (
                      <motion.div
                        layoutId="sidebar-pill-collapsed"
                        className="absolute inset-0 rounded-xl bg-[#c9a84c]/15"
                        transition={{ type: "spring", bounce: 0.15, duration: 0.4 }}
                      />
                    )}
                    <item.icon className="relative h-4.5 w-4.5 h-5 w-5" />
                  </Link>
                </TooltipTrigger>
                <TooltipContent side="right" className="bg-[#1a1a0e] border-[#c9a84c]/20 text-[#e8dfc8]">
                  {item.label}
                </TooltipContent>
              </Tooltip>
            ) : (
              <Link
                key={item.href}
                href={resolvedHref}
                onClick={isMobile ? onClose : undefined}
                className={cn(
                  "relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-150",
                  active
                    ? "text-[hsl(var(--sidebar-accent-foreground))]"
                    : "text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--primary))]/10 hover:text-[hsl(var(--primary))]"
                )}
              >
                {active && (
                  <motion.div
                    layoutId="sidebar-pill"
                    className="absolute inset-0 rounded-xl bg-gradient-to-r from-[#c9a84c]/20 to-[#c9a84c]/5 border border-[#c9a84c]/20"
                    transition={{ type: "spring", bounce: 0.15, duration: 0.4 }}
                  />
                )}
                {active && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-full bg-[#c9a84c]" />
                )}
                <item.icon className={cn("relative h-4 w-4 shrink-0", active ? "text-[#c9a84c]" : "")} />
                <motion.span
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="relative flex items-center gap-2 flex-1"
                >
                  {item.label}
                  {item.badge && (
                    <span className="ml-auto text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-[#c9a84c]/15 text-[#c9a84c] border border-[#c9a84c]/20">
                      {item.badge}
                    </span>
                  )}
                  {item.label === "Alerts" && unreadCount > 0 && (
                    <span className="ml-auto text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-red-500/20 text-red-400 border border-red-500/20">
                      {unreadCount}
                    </span>
                  )}
                </motion.span>
              </Link>
            )
            return <div key={item.href}>{content}</div>
          })}
        </TooltipProvider>
      </nav>

      {/* Bottom user section */}
      <div className="shrink-0 border-t border-[hsl(var(--border))] p-3">
        {collapsed ? (
          <TooltipProvider delayDuration={0}>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => { useAuthStore.getState().logout(); router.push("/login"); }}
                  className="flex h-10 w-full items-center justify-center rounded-xl text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--primary))]/10 hover:text-[hsl(var(--primary))] transition-colors"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right">Sign Out</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ) : (
          <div className="flex items-center gap-3 rounded-xl p-2.5 hover:bg-[hsl(var(--primary))]/10 transition-colors group">
            <Avatar className="h-8 w-8 shrink-0 ring-2 ring-[#c9a84c]/25">
              <AvatarImage src={user?.avatar} />
              <AvatarFallback className="bg-gradient-to-br from-[#c9a84c] to-[#8a6a1e] text-[#131309] text-xs font-bold">
                {user?.name?.charAt(0)?.toUpperCase() || "U"}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 overflow-hidden">
              <p className="text-sm font-semibold text-[hsl(var(--sidebar-foreground))] truncate">{user?.name || "User"}</p>
              <span className="inline-flex items-center gap-1 mt-0.5 px-1.5 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider bg-[#c9a84c]/15 text-[#c9a84c] border border-[#c9a84c]/20">
                {roleWorkspace.label}
              </span>
            </div>
            <button
              onClick={() => { useAuthStore.getState().logout(); router.push("/login"); }}
              className="shrink-0 opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-[hsl(var(--muted-foreground))] hover:text-red-400 hover:bg-red-400/10 transition-all"
            >
              <LogOut className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </div>
    </div>
  )

  if (isMobile) {
    return (
      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm"
              onClick={onClose}
            />
            <motion.aside
              initial={{ x: "-100%" }} animate={{ x: 0 }} exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed left-0 top-0 z-50 h-full shadow-2xl shadow-[#c9a84c]/10"
            >
              {sidebarContent}
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    )
  }

  return (
    <motion.aside
      initial={false}
      animate={{ width: collapsed ? 70 : 240 }}
      transition={{ type: "spring", damping: 28, stiffness: 200 }}
      className="hidden h-screen overflow-hidden md:block shrink-0"
    >
      {sidebarContent}
    </motion.aside>
  )
}
