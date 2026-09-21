"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Search, CornerDownLeft, LoaderCircle } from "lucide-react";
import { cn, Kbd } from "@moat/ui";
import { navigation, secondaryNavigation, visibleTo } from "./nav";
import { useSession } from "@/components/auth/session-context";
import { api } from "@/lib/api";
import type { InventionSummary } from "@/lib/types";

interface Command {
  id: string;
  label: string;
  hint?: string;
  group: string;
  href: string;
}

function navigationCommands(permissions: string[]): Command[] {
  return visibleTo(
    [...navigation.flatMap((group) => group.items), ...secondaryNavigation],
    permissions,
  ).map((item) => ({
    id: `nav:${item.href}`,
    label: item.label,
    hint: item.badge || undefined,
    group: "Go to",
    href: item.href,
  }));
}

export function CommandPalette({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  // Unmounting while closed resets query and cursor without a reset effect.
  if (!open) return null;
  return <Palette onOpenChange={onOpenChange} />;
}

function Palette({ onOpenChange }: { onOpenChange: (open: boolean) => void }) {
  const router = useRouter();
  const session = useSession();
  const [query, setQuery] = React.useState("");
  const [cursor, setCursor] = React.useState(0);
  const [inventions, setInventions] = React.useState<InventionSummary[] | null>(null);
  const listRef = React.useRef<HTMLDivElement>(null);

  // Loaded on open rather than held globally: the palette shows only what this
  // user may see, in the workspace they are currently in.
  React.useEffect(() => {
    let cancelled = false;
    api<InventionSummary[]>("/inventions?limit=100")
      .then((rows) => {
        if (!cancelled) setInventions(rows);
      })
      .catch(() => {
        if (!cancelled) setInventions([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const commands = React.useMemo(() => {
    const inventionCommands: Command[] = (inventions ?? []).map((invention) => ({
      id: `inv:${invention.id}`,
      label: invention.title,
      hint: invention.ref,
      group: "Disclosures",
      href: `/inventions/${invention.id}`,
    }));
    return [...navigationCommands(session.permissions), ...inventionCommands];
  }, [inventions, session.permissions]);

  const results = React.useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return commands;
    return commands.filter((command) =>
      `${command.label} ${command.hint ?? ""}`.toLowerCase().includes(needle),
    );
  }, [commands, query]);

  React.useEffect(() => {
    listRef.current
      ?.querySelector<HTMLElement>('[data-active="true"]')
      ?.scrollIntoView({ block: "nearest" });
  }, [cursor]);

  function run(command: Command | undefined) {
    if (!command) return;
    onOpenChange(false);
    router.push(command.href);
  }

  function onKeyDown(event: React.KeyboardEvent) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setCursor((value) => Math.min(value + 1, results.length - 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setCursor((value) => Math.max(value - 1, 0));
    } else if (event.key === "Enter") {
      event.preventDefault();
      run(results[cursor]);
    } else if (event.key === "Escape") {
      event.preventDefault();
      onOpenChange(false);
    }
  }

  let lastGroup = "";

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-[rgb(22_21_15/0.28)] px-4 pt-[12vh] backdrop-blur-[2px]"
      onClick={() => onOpenChange(false)}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
        onClick={(event) => event.stopPropagation()}
        onKeyDown={onKeyDown}
        className="w-full max-w-xl overflow-hidden rounded-[var(--radius-lg)] border border-line bg-raised shadow-[var(--shadow-lg)]"
      >
        <div className="flex items-center gap-2.5 border-b border-line px-3.5">
          <Search className="size-4 shrink-0 text-faint" />
          <input
            autoFocus
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setCursor(0);
            }}
            placeholder="Search disclosures, or jump to a workspace…"
            aria-label="Search"
            className="h-11 w-full bg-transparent text-[14px] text-ink outline-none placeholder:text-faint"
          />
          {inventions === null ? (
            <LoaderCircle className="size-3.5 animate-spin text-faint" />
          ) : null}
          <Kbd>esc</Kbd>
        </div>

        <div ref={listRef} role="listbox" className="max-h-[54vh] overflow-y-auto p-1.5">
          {results.length === 0 ? (
            <p className="px-3 py-8 text-center text-[13px] text-faint">
              Nothing matches “{query}”.
            </p>
          ) : (
            results.map((command, index) => {
              const header = command.group !== lastGroup ? command.group : null;
              lastGroup = command.group;
              const active = index === cursor;
              return (
                <React.Fragment key={command.id}>
                  {header ? (
                    <div className="px-2 pb-1 pt-2.5 text-[11px] font-semibold uppercase tracking-[0.07em] text-faint">
                      {header}
                    </div>
                  ) : null}
                  <div
                    role="option"
                    aria-selected={active}
                    data-active={active}
                    onMouseMove={() => setCursor(index)}
                    onClick={() => run(command)}
                    className={cn(
                      "flex cursor-pointer items-center gap-2.5 rounded-[var(--radius-sm)] px-2 py-1.5",
                      active ? "bg-accent-soft text-accent-text" : "text-ink",
                    )}
                  >
                    <span className="min-w-0 flex-1 truncate text-[13px]">{command.label}</span>
                    {command.hint ? (
                      <span className="numeric shrink-0 text-[11px] text-faint">
                        {command.hint}
                      </span>
                    ) : null}
                    {active ? <CornerDownLeft className="size-3 shrink-0 text-faint" /> : null}
                  </div>
                </React.Fragment>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
