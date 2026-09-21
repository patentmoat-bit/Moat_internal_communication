"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Check, ChevronsUpDown, LoaderCircle } from "lucide-react";
import { cn } from "@moat/ui";
import { api } from "@/lib/api";
import { useSession } from "@/components/auth/session-context";
import { Logo } from "./logo";

export function WorkspaceSwitcher() {
  const session = useSession();
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [pending, setPending] = React.useState<string | null>(null);
  const containerRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!open) return;
    function onPointerDown(event: PointerEvent) {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const multiple = session.availableTenants.length > 1;

  async function switchTo(tenantId: string) {
    if (tenantId === session.tenant.id) return setOpen(false);
    setPending(tenantId);
    try {
      // Switching mints a new session server-side; the old one is revoked, so
      // a token is only ever valid for the workspace it was issued for.
      await api("/auth/switch-tenant", { method: "POST", json: { tenantId } });
      setOpen(false);
      router.replace("/inventions");
      router.refresh();
    } finally {
      setPending(null);
    }
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        onClick={() => multiple && setOpen((value) => !value)}
        aria-haspopup={multiple ? "listbox" : undefined}
        aria-expanded={multiple ? open : undefined}
        className={cn(
          "flex w-full items-center gap-2 rounded-[var(--radius-sm)] px-1.5 py-1 text-left",
          multiple ? "hover:bg-hover" : "cursor-default",
        )}
      >
        <Logo className="size-[18px] shrink-0 text-accent" />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[13px] font-semibold leading-tight tracking-[-0.01em] text-ink">
            {session.tenant.name}
          </span>
        </span>
        {multiple ? <ChevronsUpDown className="size-3.5 shrink-0 text-faint" /> : null}
      </button>

      {open ? (
        <div
          role="listbox"
          className="absolute left-0 right-0 top-full z-40 mt-1 overflow-hidden rounded-[var(--radius-md)] border border-line bg-raised p-1 shadow-[var(--shadow-lg)]"
        >
          <p className="px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.07em] text-faint">
            Workspaces
          </p>
          {session.availableTenants.map((tenant) => {
            const active = tenant.id === session.tenant.id;
            return (
              <button
                key={tenant.id}
                role="option"
                aria-selected={active}
                onClick={() => switchTo(tenant.id)}
                disabled={pending !== null}
                className={cn(
                  "flex w-full items-center gap-2 rounded-[var(--radius-sm)] px-2 py-1.5 text-left text-[13px]",
                  active ? "bg-accent-soft text-accent-text" : "text-ink hover:bg-hover",
                )}
              >
                <span className="min-w-0 flex-1 truncate">{tenant.name}</span>
                {pending === tenant.id ? (
                  <LoaderCircle className="size-3.5 animate-spin text-faint" />
                ) : active ? (
                  <Check className="size-3.5 text-accent" />
                ) : null}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
