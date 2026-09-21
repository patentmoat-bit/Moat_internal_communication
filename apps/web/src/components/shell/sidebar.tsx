"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import {
  ChevronsUpDown,
  Check,
  Shield,
  Sparkles,
  FileCode,
  PenTool,
  Wallet,
  ShieldCheck,
  UserPlus,
  Users,
} from "lucide-react";
import { cn, Avatar, Eyebrow } from "@moat/ui";
import { ROLE_NAVIGATIONS, type NavItem } from "./nav";
import { useActiveRole, ROLE_CONFIGS, type RoleType } from "@/components/auth/role-context";
import { Logo } from "./logo";

const ROLE_ICONS: Record<RoleType, React.ElementType> = {
  ADMIN: ShieldCheck,
  PATENT_ANALYST: Sparkles,
  CEO: Shield,
  PATENT_DRAFTER: FileCode,
  DESIGN_TEAM: PenTool,
  FINANCE: Wallet,
};

function NavLink({ item, active }: { item: NavItem; active: boolean }) {
  const Icon = item.icon;

  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "group flex h-8 items-center gap-2.5 rounded-[var(--radius-sm)] px-2.5 text-[13px]",
        "transition-colors duration-[var(--dur-fast)]",
        active
          ? "bg-accent-soft font-medium text-accent-text"
          : "text-muted hover:bg-hover hover:text-ink",
      )}
    >
      <Icon
        className={cn(
          "size-[16px] shrink-0",
          active ? "text-accent" : "text-faint group-hover:text-muted",
        )}
      />
      <span className="truncate">{item.label}</span>
      {item.badge && (
        <span className="ml-auto rounded bg-line px-1.5 py-0.2 text-[10px] font-bold text-muted">
          {item.badge}
        </span>
      )}
    </Link>
  );
}

export function Sidebar() {
  const { currentRole, currentUser, profile, users, switchUser } = useActiveRole();
  const pathname = usePathname();
  const router = useRouter();
  const [userMenuOpen, setUserMenuOpen] = React.useState(false);
  const menuRef = React.useRef<HTMLDivElement>(null);

  const isActive = (href: string) => pathname === href || (href !== "/" && pathname.startsWith(`${href}/`));

  React.useEffect(() => {
    function onPointerDown(event: PointerEvent) {
      if (!menuRef.current?.contains(event.target as Node)) {
        setUserMenuOpen(false);
      }
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, []);

  const currentNavGroups = ROLE_NAVIGATIONS[currentRole] || ROLE_NAVIGATIONS.ADMIN;
  const ActiveRoleIcon = ROLE_ICONS[currentRole] || ShieldCheck;

  return (
    <nav
      aria-label="Primary"
      className="flex h-full w-[var(--sidebar-w)] shrink-0 flex-col border-r border-line bg-canvas"
    >
      {/* Top: Logo and Tenant */}
      <div className="flex h-[var(--topbar-h)] items-center justify-between border-b border-line px-4">
        <div className="flex items-center gap-2.5">
          <Logo className="size-[18px] text-accent shrink-0" />
          <span className="font-document text-sm font-bold tracking-tight text-ink">
            MOAT IP Platform
          </span>
        </div>
      </div>

      {/* Active Persona Header Box */}
      <div className="p-3 border-b border-line/60 bg-surface/30">
        <div className="flex items-center gap-2 rounded-lg bg-surface border border-line p-2.5 shadow-2xs">
          <div className="flex size-7 items-center justify-center rounded-md bg-accent/10 text-accent shrink-0">
            <ActiveRoleIcon className="size-4" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[10px] font-bold uppercase tracking-wider text-accent">
              Active Role Portal
            </div>
            <div className="truncate text-xs font-bold text-ink">{profile.title}</div>
          </div>
        </div>
      </div>

      {/* Main Navigation for this single role */}
      <div className="flex-1 space-y-5 overflow-y-auto px-3 py-3">
        {currentNavGroups.map((group) => (
          <div key={group.label}>
            <Eyebrow className="px-2 pb-1.5 text-[11px] uppercase tracking-wider text-faint">
              {group.label}
            </Eyebrow>
            <div className="space-y-0.5">
              {group.items.map((item, idx) => (
                <NavLink key={`${item.href}-${idx}`} item={item} active={isActive(item.href)} />
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Persona / User Switcher in Footer */}
      <div ref={menuRef} className="relative border-t border-line p-3">
        {userMenuOpen && (
          <div className="absolute bottom-full left-3 right-3 z-50 mb-2 overflow-hidden rounded-xl border border-line bg-raised p-1 shadow-lg backdrop-blur-md max-h-72 overflow-y-auto">
            <div className="flex items-center justify-between px-2.5 py-1.5 border-b border-line/60">
              <span className="text-[10px] font-bold uppercase tracking-wider text-faint">
                Organization Users ({users.length})
              </span>
              <Link
                href="/admin"
                onClick={() => setUserMenuOpen(false)}
                className="flex items-center gap-1 text-[10.5px] font-bold text-accent hover:underline"
              >
                <Users className="size-3" />
                Manage
              </Link>
            </div>

            <div className="py-1 space-y-0.5">
              {users.map((u) => {
                const isSelected = currentUser.id === u.id;
                const RoleIcon = ROLE_ICONS[u.role] || ShieldCheck;
                const roleMeta = ROLE_CONFIGS[u.role] || ROLE_CONFIGS.ADMIN;
                return (
                  <button
                    key={u.id}
                    onClick={() => {
                      switchUser(u.id);
                      setUserMenuOpen(false);
                    }}
                    className={cn(
                      "flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left transition",
                      isSelected ? "bg-accent-soft text-accent-text" : "text-ink hover:bg-hover",
                    )}
                  >
                    <Avatar name={u.name} size={24} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="truncate text-xs font-bold">{u.name}</span>
                      </div>
                      <div className="truncate text-[10.5px] text-muted flex items-center gap-1">
                        <RoleIcon className="size-2.5 text-muted shrink-0" />
                        <span>{roleMeta.title}</span>
                      </div>
                    </div>
                    {isSelected && <Check className="size-3.5 text-accent shrink-0" />}
                  </button>
                );
              })}
            </div>

            <div className="border-t border-line/60 p-1">
              <Link
                href="/admin"
                onClick={() => setUserMenuOpen(false)}
                className="flex w-full items-center gap-2 rounded-lg p-1.5 text-xs font-semibold text-accent hover:bg-accent/10 transition"
              >
                <UserPlus className="size-3.5" />
                <span>Add User in Admin Control</span>
              </Link>
            </div>
          </div>
        )}

        {/* Current User Card / Click to switch user */}
        <button
          onClick={() => setUserMenuOpen((prev) => !prev)}
          className="flex w-full items-center gap-2 rounded-lg border border-line bg-surface p-2 text-left transition hover:border-line-strong hover:bg-hover"
        >
          <Avatar name={currentUser.name} size={24} />
          <div className="min-w-0 flex-1">
            <div className="truncate text-[12px] font-bold leading-tight text-ink">
              {currentUser.name}
            </div>
            <div className="truncate text-[10.5px] leading-tight text-muted">{profile.title}</div>
          </div>
          <ChevronsUpDown className="size-3.5 text-faint shrink-0" />
        </button>
      </div>
    </nav>
  );
}

