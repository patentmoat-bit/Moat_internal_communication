"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/stores/authStore";
import { useNotifications } from "@/hooks/useNotifications";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ThemeToggle } from "./ThemeToggle";
import { useApp } from "@/lib/store";
import { PatentDetailPanel } from "@/components/search/PatentDetailPanel";
import {
  Menu,
  Search,
  User,
  Settings,
  LogOut,
  ChevronRight,
  Home,
  Bell,
  X,
  Keyboard
} from "lucide-react";
import type { User as UserType } from "@/types";

interface HeaderProps {
  user?: UserType;
  onMenuToggle?: () => void;
}

const breadcrumbMap: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/dashboard/zyra": "Rith",
  "/dashboard/search": "Search",
  "/dashboard/comparison": "Comparison",
  "/dashboard/visualization": "Visualization",
  "/dashboard/collections": "Collections",
  "/dashboard/workspace": "Workspace",
  "/dashboard/saved": "Saved Patents",
  "/dashboard/reports": "Reports",
  "/dashboard/alerts": "Alerts",
  "/dashboard/research": "Patent",
  "/dashboard/trademark": "Trademark",
  "/dashboard/copyright": "Copyright",
  "/dashboard/patent-analyst": "Patent Analyst Landing"
};

export function Header({ user, onMenuToggle }: HeaderProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { savedPatents } = useApp();
  const { notifications, unreadCount, markAsRead } = useNotifications();

  const [quickSearch, setQuickSearch] = React.useState("");
  
  // Command Palette states
  const [commandPaletteOpen, setCommandPaletteOpen] = React.useState(false);
  const [paletteQuery, setPaletteQuery] = React.useState("");
  const [selectedPatent, setSelectedPatent] = React.useState<any | null>(null);

  // Notifications states
  const [notificationsOpen, setNotificationsOpen] = React.useState(false);

  // Filtered patents for Command Palette
  const filteredPalents = paletteQuery.trim()
    ? savedPatents.filter(
        (p) =>
          p.patentNumber.toLowerCase().includes(paletteQuery.toLowerCase()) ||
          p.title.toLowerCase().includes(paletteQuery.toLowerCase()) ||
          p.assignee.toLowerCase().includes(paletteQuery.toLowerCase())
      )
    : savedPatents.slice(0, 5);

  // Keyboard shortcut listener
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.key === "k" && (e.metaKey || e.ctrlKey)) || e.key === "/") {
        e.preventDefault();
        setCommandPaletteOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleQuickSearchSubmit = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && quickSearch.trim()) {
      router.push(`/dashboard/search?q=${encodeURIComponent(quickSearch.trim())}`);
      setQuickSearch("");
    }
  };

  const handlePaletteSelect = (patent: any) => {
    setSelectedPatent(patent);
    setCommandPaletteOpen(false);
    setPaletteQuery("");
  };

  const breadcrumbs = React.useMemo(() => {
    const crumbs: { label: string; href: string }[] = [];
    const segments = pathname.split("/").filter(Boolean);
    let current = "";
    for (const segment of segments) {
      current += "/" + segment;
      const label = breadcrumbMap[current] || segment.charAt(0).toUpperCase() + segment.slice(1);
      crumbs.push({ label, href: current });
    }
    return crumbs;
  }, [pathname]);

  // Breadcrumbs calculation removed for brevity in chunk, just replace the alertNotifications


  return (
    <header className="flex h-14 items-center gap-4 border-b bg-background px-4 lg:px-6 relative">
      <Button
        variant="ghost"
        size="icon"
        onClick={onMenuToggle}
        className="md:hidden"
      >
        <Menu className="h-5 w-5" />
      </Button>

      <nav className="hidden items-center gap-1 text-xs text-muted-foreground md:flex font-semibold">
        <Link href="/" className="hover:text-foreground transition-colors">
          <Home className="h-3.5 w-3.5" />
        </Link>
        {breadcrumbs.map((crumb, index) => {
          const isLast = index === breadcrumbs.length - 1;
          return (
            <React.Fragment key={crumb.href}>
              <ChevronRight className="h-3.5 w-3.5" />
              {isLast ? (
                <span className="font-bold text-foreground">
                  {crumb.label}
                </span>
              ) : (
                <Link
                  href={crumb.href}
                  className="hover:text-foreground hover:underline transition-colors cursor-pointer"
                >
                  {crumb.label}
                </Link>
              )}
            </React.Fragment>
          );
        })}
      </nav>

      <div className="flex-1" />

      {/* Quick Search */}
      <div className="relative hidden sm:block">
        <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Quick search... (Press /)"
          className="w-56 pl-8 h-8 text-xs font-semibold"
          value={quickSearch}
          onChange={(e) => setQuickSearch(e.target.value)}
          onKeyDown={handleQuickSearchSubmit}
          onFocus={() => setCommandPaletteOpen(true)}
        />
      </div>

      {/* Notifications trigger */}
      <div className="relative">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 relative"
          onClick={() => {
            setNotificationsOpen(!notificationsOpen);
            if (!notificationsOpen && unreadCount > 0) markAsRead('all');
          }}
        >
          <Bell className="h-4.5 w-4.5 text-muted-foreground" />
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-destructive flex items-center justify-center text-[8px] text-white font-bold">{unreadCount}</span>
          )}
        </Button>

        {/* Notifications Dropdown */}
        {notificationsOpen && (
          <div className="absolute right-0 mt-2 z-50 w-80 bg-popover border shadow-xl rounded-lg p-3 space-y-2">
            <div className="flex justify-between items-center border-b pb-1.5">
              <span className="text-xs font-bold text-foreground flex items-center gap-1">
                <Bell className="h-3.5 w-3.5 text-primary" /> Notifications
              </span>
              <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => setNotificationsOpen(false)}>
                <X className="h-3 w-3" />
              </Button>
            </div>
            <div className="max-h-[280px] overflow-y-auto space-y-1.5 py-1">
              {notifications.length > 0 ? (
                notifications.map((notif) => (
                  <div key={notif.id} className={cn("text-[10px] p-2 rounded border font-semibold leading-relaxed transition-colors", notif.is_read ? "bg-background border-border/40 hover:bg-muted/50" : "bg-muted/30 border-primary/20 hover:bg-muted/60")}>
                    <div className="flex justify-between items-start gap-2">
                      <p className={cn("text-foreground", !notif.is_read && "font-bold text-primary")}>{notif.title}</p>
                      {!notif.is_read && <span className="h-1.5 w-1.5 rounded-full bg-primary shrink-0 mt-1" />}
                    </div>
                    <p className="text-muted-foreground mt-0.5 line-clamp-2">{notif.description}</p>
                    <span className="text-[8px] text-muted-foreground mt-1 block">{new Date(notif.created_at).toLocaleString()}</span>
                  </div>
                ))
              ) : (
                <p className="text-[10px] text-muted-foreground text-center py-6">No new notifications.</p>
              )}
            </div>
          </div>
        )}
      </div>

      <ThemeToggle />

      {/* User profile dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="rounded-full h-8 w-8">
            <Avatar className="h-8 w-8 border">
              <AvatarImage src={user?.avatar} />
              <AvatarFallback className="font-extrabold text-xs">
                {user?.name?.charAt(0)?.toUpperCase() || "P"}
              </AvatarFallback>
            </Avatar>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52 text-xs font-semibold">
          <DropdownMenuLabel>
            <div className="flex flex-col gap-0.5">
              <p className="text-xs font-bold text-foreground">{user?.name}</p>
              <p className="text-[10px] text-muted-foreground font-medium">{user?.email}</p>
              <p className="text-[10px] text-primary font-bold uppercase mt-1">{user?.role}</p>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem className="text-xs cursor-pointer" onClick={() => router.push("/dashboard/settings")}>
            <User className="mr-2 h-3.5 w-3.5" /> Profile Settings
          </DropdownMenuItem>
          <DropdownMenuItem className="text-xs cursor-pointer" onClick={() => router.push("/dashboard/notifications")}>
            <Bell className="mr-2 h-3.5 w-3.5" /> Notifications
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="text-xs text-destructive cursor-pointer"
            onClick={() => {
              useAuthStore.getState().logout();
              router.push("/login");
            }}
          >
            <LogOut className="mr-2 h-3.5 w-3.5" /> Sign Out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Command Palette Overlay */}
      {commandPaletteOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setCommandPaletteOpen(false)} />
          <div className="relative w-full max-w-lg bg-background border shadow-2xl z-10 rounded-lg overflow-hidden flex flex-col max-h-[380px]">
            <div className="flex items-center gap-2 p-3 border-b bg-muted/20">
              <Search className="h-4 w-4 text-muted-foreground shrink-0" />
              <input
                value={paletteQuery}
                onChange={(e) => setPaletteQuery(e.target.value)}
                placeholder="Search saved patent numbers, titles, assignees..."
                className="w-full bg-transparent border-0 text-xs focus:outline-none font-semibold text-foreground"
                autoFocus
              />
              <Keyboard className="h-4 w-4 text-muted-foreground shrink-0" />
              <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={() => setCommandPaletteOpen(false)}>
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>

            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              <div className="text-[9px] font-bold text-muted-foreground px-2 py-1 uppercase tracking-wider">
                {paletteQuery.trim() ? "Search Results" : "Recently Saved Patents"}
              </div>

              {filteredPalents.length > 0 ? (
                filteredPalents.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => handlePaletteSelect(p)}
                    className="w-full text-left p-2.5 rounded-md hover:bg-muted/80 transition-colors flex justify-between items-center text-xs font-semibold"
                  >
                    <div className="truncate pr-4">
                      <span className="text-[10px] text-primary font-bold">{p.patentNumber}</span>
                      <p className="truncate text-foreground mt-0.5">{p.title}</p>
                    </div>
                    <span className="text-[9px] bg-muted px-2 py-0.5 rounded text-muted-foreground shrink-0">
                      {p.assignee}
                    </span>
                  </button>
                ))
              ) : (
                <div className="text-[10px] text-muted-foreground text-center py-6">
                  No matching patents found. Type queries to explore.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Selected Patent Slide drawer */}
      {selectedPatent && (
        <PatentDetailPanel
          patent={selectedPatent}
          onClose={() => setSelectedPatent(null)}
        />
      )}
    </header>
  );
}
