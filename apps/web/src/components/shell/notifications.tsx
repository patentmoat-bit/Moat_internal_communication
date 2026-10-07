"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bell, Inbox } from "lucide-react";
import { Badge, EmptyState, IconButton, cn } from "@moat/ui";
import { api } from "@/lib/api";
import { useEventStream } from "@/components/events/event-stream";
import { formatDate } from "@/lib/display";
import type { Notification } from "@/lib/types";

// The event stream delivers new notifications immediately. This refetch is the
// safety net that reconciles anything the stream missed -- and the reason it can
// be this infrequent is that the stream replays from a durable cursor.
const RECONCILE_MS = 120_000;

export function Notifications() {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [items, setItems] = React.useState<Notification[]>([]);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const { notifications: live } = useEventStream();

  // Live events first, then the fetched history, de-duplicated by id.
  const merged = React.useMemo(() => {
    const seen = new Set<string>();
    return [...live, ...items].filter((item) => {
      if (seen.has(item.id)) return false;
      seen.add(item.id);
      return true;
    });
  }, [live, items]);

  React.useEffect(() => {
    let cancelled = false;
    const load = () =>
      Promise.resolve([])
        .then((rows) => {
          if (!cancelled) setItems(rows);
        })
        .catch(() => undefined);
    load();
    const timer = setInterval(load, RECONCILE_MS);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, []);

  React.useEffect(() => {
    if (!open) return;
    function onPointerDown(event: PointerEvent) {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  const unread = merged.filter((item) => item.readAt === null);

  async function openItem(item: Notification) {
    setOpen(false);
    setItems((rows) =>
      rows.map((row) => (row.id === item.id ? { ...row, readAt: new Date().toISOString() } : row)),
    );
    await api(`/notifications/${item.id}/read`, { method: "POST" }).catch(() => undefined);
    if (item.actionUrl) {
      router.push(item.actionUrl);
      router.refresh();
    }
  }

  return (
    <div ref={containerRef} className="relative">
      <IconButton
        label={unread.length ? `Notifications (${unread.length} unread)` : "Notifications"}
        variant="ghost"
        size="sm"
        onClick={() => setOpen((value) => !value)}
      >
        <Bell />
      </IconButton>

      {unread.length > 0 ? (
        <span
          aria-hidden
          className="numeric pointer-events-none absolute -right-0.5 -top-0.5 flex h-[15px] min-w-[15px] items-center justify-center rounded-full bg-accent px-1 text-[9px] font-semibold text-on-accent"
        >
          {unread.length > 9 ? "9+" : unread.length}
        </span>
      ) : null}

      {open ? (
        <div className="absolute right-0 top-full z-40 mt-1.5 w-[380px] overflow-hidden rounded-[var(--radius-md)] border border-line bg-raised shadow-[var(--shadow-lg)]">
          <div className="flex items-center justify-between border-b border-line px-3 py-2">
            <span className="text-[12px] font-semibold text-ink">Notifications</span>
            <Link
              href="/inbox"
              onClick={() => setOpen(false)}
              className="text-[11.5px] text-accent-text hover:underline"
            >
              Open inbox
            </Link>
          </div>

          <div className="max-h-[420px] overflow-y-auto">
            {merged.length === 0 ? (
              <EmptyState icon={<Inbox />} title="Nothing yet" className="py-8" />
            ) : (
              merged.map((item, index) => (
                <button
                  key={item.id}
                  onClick={() => openItem(item)}
                  className={cn(
                    "flex w-full gap-2.5 px-3 py-2.5 text-left transition-colors hover:bg-hover",
                    index > 0 && "border-t border-line",
                  )}
                >
                  <span
                    aria-hidden
                    className={cn(
                      "mt-1.5 size-[6px] shrink-0 rounded-full",
                      item.readAt ? "bg-transparent" : "bg-accent",
                    )}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-start justify-between gap-2">
                      <span className="text-[12.5px] font-medium leading-snug text-ink">
                        {item.title}
                      </span>
                      {item.priority === "urgent" ? (
                        <Badge tone="critical">urgent</Badge>
                      ) : null}
                    </span>
                    <span className="mt-0.5 block text-[11.5px] leading-snug text-muted">
                      {item.body}
                    </span>
                    <span className="mt-1 block text-[11px] text-faint">
                      {formatDate(item.createdAt)}
                    </span>
                  </span>
                </button>
              ))
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
