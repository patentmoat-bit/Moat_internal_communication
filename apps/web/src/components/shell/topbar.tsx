"use client";

import * as React from "react";
import { Search } from "lucide-react";
import { Kbd } from "@moat/ui";
import { ThemeToggle } from "./theme-toggle";
import { CommandPalette } from "./command-palette";
import { Notifications } from "./notifications";
import { useActiveRole } from "@/components/auth/role-context";

export function TopBar() {
  const [paletteOpen, setPaletteOpen] = React.useState(false);
  const { profile } = useActiveRole();

  React.useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key.toLowerCase() === "k" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        setPaletteOpen((open) => !open);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <>
      <header className="flex h-[var(--topbar-h)] shrink-0 items-center justify-between gap-3 border-b border-line bg-canvas px-4">
        {/* Left: Quick Search */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setPaletteOpen(true)}
            className="flex h-7 w-64 items-center gap-2 rounded-[var(--radius-sm)] border border-line bg-surface px-2.5 text-left text-[13px] text-faint transition-colors hover:border-line-strong hover:text-muted"
          >
            <Search className="size-[14px] shrink-0" />
            <span className="flex-1 truncate">Quick Search</span>
            <Kbd>⌘</Kbd>
            <Kbd>K</Kbd>
          </button>
        </div>

        {/* Center: Dedicated Role Portal Indicator */}
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-surface border border-line px-3 py-1 text-xs font-semibold text-muted shadow-2xs">
            Role Portal: <strong className="text-ink">{profile.title}</strong> ({profile.name})
          </span>
        </div>

        {/* Right Tools */}
        <div className="flex items-center gap-2">
          <Notifications />
          <ThemeToggle />
        </div>
      </header>

      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />
    </>
  );
}
