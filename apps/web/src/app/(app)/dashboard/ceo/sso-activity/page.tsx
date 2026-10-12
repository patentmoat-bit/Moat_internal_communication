import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getAuthenticatedUser } from "@/lib/serverAuth";
import { readSsoEvents, type SsoEvent } from "@/lib/msAuth";

export const metadata: Metadata = { title: "Sign-in Activity" };
export const dynamic = "force-dynamic";

const LABEL: Record<SsoEvent["type"], string> = {
  login_success: "Signed in",
  login_failure: "Failed",
  logout: "Signed out",
  access_requested: "Access requested",
  access_pending: "Waiting for approval",
  access_denied: "Access not granted",
  login_blocked: "Blocked (outside org)",
};
const TONE: Record<SsoEvent["type"], string> = {
  login_success: "bg-green-500/15 text-green-600 dark:text-green-400",
  login_failure: "bg-red-500/15 text-red-600 dark:text-red-400",
  logout: "bg-sunken text-muted-foreground",
  access_requested: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
  access_pending: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
  access_denied: "bg-red-500/15 text-red-600 dark:text-red-400",
  login_blocked: "bg-red-500/15 text-red-600 dark:text-red-400",
};

export default async function SsoActivityPage() {
  const user = await getAuthenticatedUser();
  if (user?.role !== "CEO") notFound();

  const events = readSsoEvents();
  const now = Date.now();
  const day = 24 * 60 * 60 * 1000;
  const last24 = events.filter((e) => now - Date.parse(e.timestamp) < day);
  const successes = events.filter((e) => e.type === "login_success");
  const failures24 = last24.filter((e) => e.type === "login_failure").length;
  const activeUsers24 = new Set(last24.filter((e) => e.type === "login_success").map((e) => e.email)).size;

  const perUser = new Map<string, { name?: string; count: number; last: string }>();
  for (const e of successes) {
    const key = e.email ?? "unknown";
    const cur = perUser.get(key);
    perUser.set(key, { name: e.name, count: (cur?.count ?? 0) + 1, last: cur?.last ?? e.timestamp });
  }

  // Sign-ins per day, last 7 days.
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(now - (6 - i) * day);
    const key = d.toISOString().slice(0, 10);
    return { key, label: d.toLocaleDateString(undefined, { weekday: "short" }), n: 0 };
  });
  for (const e of successes) {
    const d = days.find((x) => x.key === e.timestamp.slice(0, 10));
    if (d) d.n++;
  }
  const max = Math.max(1, ...days.map((d) => d.n));

  const stats = [
    { label: "Sign-ins (24h)", value: last24.filter((e) => e.type === "login_success").length },
    { label: "Active users (24h)", value: activeUsers24 },
    { label: "Failed attempts (24h)", value: failures24 },
    { label: "Total sign-ins", value: successes.length },
  ];

  return (
    <div className="mx-auto w-full max-w-7xl space-y-8 px-4 pb-20 pt-8 sm:px-6 lg:px-8">
      <header className="border-b border-border pb-6">
        <h1 className="text-3xl font-black tracking-tight">Sign-in Activity</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          Microsoft SSO sign-ins, failures and sign-outs recorded by this server.
        </p>
      </header>

      <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="rounded-lg border border-border bg-card p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{s.label}</p>
            <p className="mt-2 text-3xl font-black tabular-nums">{s.value}</p>
          </div>
        ))}
      </section>

      <section className="grid gap-6 lg:grid-cols-3">
        <div className="rounded-lg border border-border bg-card p-4 lg:col-span-2">
          <h2 className="text-sm font-bold">Sign-ins, last 7 days</h2>
          <div className="mt-4 flex h-40 items-end gap-3" role="img" aria-label="Sign-ins per day, last 7 days">
            {days.map((d) => (
              <div key={d.key} className="flex flex-1 flex-col items-center gap-1">
                <span className="text-xs tabular-nums text-muted-foreground">{d.n}</span>
                <div
                  className="w-full rounded-t bg-primary/80"
                  style={{ height: `${(d.n / max) * 100}%`, minHeight: d.n ? 4 : 1 }}
                />
                <span className="text-xs text-muted-foreground">{d.label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-lg border border-border bg-card p-4">
          <h2 className="text-sm font-bold">Users</h2>
          {perUser.size === 0 ? (
            <p className="mt-4 text-sm text-muted-foreground">No sign-ins yet.</p>
          ) : (
            <ul className="mt-3 divide-y divide-border">
              {[...perUser.entries()].slice(0, 8).map(([email, u]) => (
                <li key={email} className="flex items-center justify-between gap-3 py-2 text-sm">
                  <span className="min-w-0">
                    <span className="block truncate font-medium">{u.name ?? email}</span>
                    <span className="block truncate text-xs text-muted-foreground">
                      last {new Date(u.last).toLocaleString()}
                    </span>
                  </span>
                  <span className="tabular-nums text-muted-foreground">{u.count}×</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <section className="overflow-x-auto rounded-lg border border-border bg-card">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-border text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-4 py-3">Time</th>
              <th className="px-4 py-3">Event</th>
              <th className="px-4 py-3">User</th>
              <th className="px-4 py-3">IP</th>
              <th className="px-4 py-3">Detail</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {events.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                  No activity recorded yet. Sign in with Microsoft to create the first entry.
                </td>
              </tr>
            ) : (
              events.slice(0, 100).map((e) => (
                <tr key={e.id}>
                  <td className="whitespace-nowrap px-4 py-3 tabular-nums">
                    {new Date(e.timestamp).toLocaleString()}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`rounded px-2 py-0.5 text-xs font-semibold ${TONE[e.type]}`}>
                      {LABEL[e.type]}
                    </span>
                  </td>
                  <td className="px-4 py-3">{e.name ?? e.email ?? "—"}</td>
                  <td className="px-4 py-3 text-muted-foreground">{e.ip ?? "—"}</td>
                  <td className="max-w-xs truncate px-4 py-3 text-muted-foreground">{e.detail ?? ""}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>
    </div>
  );
}
