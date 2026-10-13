"use client";

import * as React from "react";
import { Check, LoaderCircle, ShieldCheck, UserCheck, X } from "lucide-react";
import { toast } from "@/components/ui/toast";

type Status = "pending" | "approved" | "rejected" | "suspended";
interface AppUser {
  oid: string; email: string; name: string; role: string | null; isAdmin: boolean;
  status: Status; requestedAt: string; decidedBy?: string; decidedAt?: string; reason?: string; lastSignInAt?: string;
}

const ROLES: [string, string][] = [
  ["CEO", "Chief Executive Officer"], ["PATENT_ANALYST", "Patent Analyst"], ["PATENT_DRAFTER", "Patent Drafter"],
  ["DESIGN_TEAM", "Design Team"], ["FINANCE", "Finance"],
];
const TABS: { id: Status | "all"; label: string }[] = [
  { id: "pending", label: "Pending" }, { id: "approved", label: "Approved" },
  { id: "suspended", label: "Suspended" }, { id: "rejected", label: "Rejected" },
];

export default function AccessPage() {
  const [users, setUsers] = React.useState<AppUser[] | null>(null);
  const [durable, setDurable] = React.useState(true);
  const [attempts, setAttempts] = React.useState<{ id: string; type: string; timestamp: string; email?: string; name?: string; detail?: string }[]>([]);
  const [tab, setTab] = React.useState<Status>("pending");
  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState<string | null>(null);
  const [draft, setDraft] = React.useState<Record<string, { role: string; isAdmin: boolean; reason: string }>>({});

  const load = React.useCallback(async () => {
    const res = await fetch("/api/access/users").catch(() => null);
    if (!res?.ok) { setError((await res?.json().catch(() => null))?.error ?? "Could not load users."); return; }
    const json = await res.json();
    setUsers(json.users);
    setDurable(json.durable !== false);
    setAttempts(json.attempts ?? []);
  }, []);
  React.useEffect(() => { load(); const t = setInterval(load, 15000); return () => clearInterval(t); }, [load]);

  const d = (u: AppUser) => draft[u.oid] ?? { role: u.role ?? "", isAdmin: u.isAdmin, reason: "" };
  const set = (u: AppUser, patch: Partial<{ role: string; isAdmin: boolean; reason: string }>) =>
    setDraft((prev) => ({ ...prev, [u.oid]: { ...d(u), ...patch } }));

  async function act(u: AppUser, action: string) {
    const v = d(u);
    if ((action === "approve" || action === "reactivate" || action === "update") && !v.role) { toast.error("Choose a role first."); return; }
    if (action === "reject" && !v.reason.trim()) { toast.error("Add a short reason so the decision is on record."); return; }
    setBusy(u.oid);
    const res = await fetch("/api/access/decide", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ oid: u.oid, action, role: v.role || undefined, isAdmin: v.isAdmin, reason: v.reason }),
    }).catch(() => null);
    const json = await res?.json().catch(() => ({}));
    setBusy(null);
    if (!res?.ok) { toast.error(json?.error ?? "Could not save."); return; }
    toast.success(`${u.name}: ${action === "approve" ? "approved" : action === "update" ? "updated" : action + "d"}`.replace("rejectd", "rejected").replace("suspendd", "suspended"));
    setDraft((p) => { const n = { ...p }; delete n[u.oid]; return n; });
    load();
  }

  const shown = (users ?? []).filter((u) => u.status === tab);
  const count = (s: Status) => (users ?? []).filter((u) => u.status === s).length;
  const fmt = (iso?: string) => (iso ? new Date(iso).toLocaleString() : "—");

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 px-6 py-6">
      <header>
        <div className="flex items-center gap-2 text-[12px] font-semibold uppercase tracking-wider text-accent-text"><UserCheck className="size-4" /> Access control</div>
        <h1 className="font-document mt-1 text-[26px] font-semibold tracking-[-0.016em] text-ink">Access requests</h1>
        <p className="mt-1 max-w-2xl text-[13px] leading-relaxed text-muted">
          People sign in with Microsoft first, so you always know who is asking. Nobody gets in until you approve them and choose their role. Only accounts from your organization can reach this list.
        </p>
      </header>

      {!durable ? (
        <p role="alert" className="rounded-[var(--radius-sm)] border border-caution/40 bg-caution-soft px-3 py-2.5 text-[13px] leading-relaxed text-ink">
          <strong>This server forgets approvals.</strong> Its storage is temporary, so requests can vanish and approved people can be
          bounced back to the login page. Connect a Redis store (set <code>KV_REST_API_URL</code> and <code>KV_REST_API_TOKEN</code>) to keep them.
        </p>
      ) : null}

      <div role="tablist" className="flex gap-1 border-b border-line">
        {TABS.map((t) => (
          <button key={t.id} role="tab" aria-selected={tab === t.id} onClick={() => setTab(t.id as Status)}
            className={`-mb-px border-b-2 px-3 py-2 text-[13px] font-medium ${tab === t.id ? "border-accent text-ink" : "border-transparent text-muted hover:text-ink"}`}>
            {t.label} <span className="numeric ml-1 rounded-full bg-sunken px-1.5 py-0.5 text-[11px] text-muted">{count(t.id as Status)}</span>
          </button>
        ))}
      </div>

      {error ? <p role="alert" className="rounded border border-critical/25 bg-critical-soft px-3 py-2 text-[13px] text-critical">{error}</p> : null}
      {users === null && !error ? <p className="flex items-center gap-2 text-[13px] text-muted"><LoaderCircle className="size-4 animate-spin" /> Loading…</p> : null}
      {users && shown.length === 0 ? (
        <p className="rounded-[var(--radius-md)] border border-line bg-surface px-4 py-10 text-center text-[13px] text-muted">
          {tab === "pending" ? "No one is waiting for approval." : `No ${tab} users.`}
        </p>
      ) : null}

      <ul className="space-y-3">
        {shown.map((u) => {
          const v = d(u);
          const approvedView = u.status === "approved";
          return (
            <li key={u.oid} className="rounded-[var(--radius-md)] border border-line bg-surface p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="flex items-center gap-2 text-[14.5px] font-semibold text-ink">
                    {u.name}
                    {u.isAdmin ? <span className="inline-flex items-center gap-1 rounded bg-accent-soft px-1.5 py-0.5 text-[10.5px] font-semibold text-accent-text"><ShieldCheck className="size-3" /> Admin</span> : null}
                  </p>
                  <p className="text-[12.5px] text-muted">{u.email}</p>
                  <p className="mt-1 text-[11.5px] text-faint">
                    Requested {fmt(u.requestedAt)}
                    {u.decidedBy ? ` · ${u.status} by ${u.decidedBy} ${fmt(u.decidedAt)}` : ""}
                    {approvedView && u.lastSignInAt ? ` · last sign-in ${fmt(u.lastSignInAt)}` : ""}
                  </p>
                  {u.reason ? <p className="mt-1 text-[12px] text-muted">Reason: {u.reason}</p> : null}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <label className="sr-only" htmlFor={`role-${u.oid}`}>Role for {u.name}</label>
                  <select id={`role-${u.oid}`} value={v.role} onChange={(e) => set(u, { role: e.target.value })}
                    className="rounded-[var(--radius-sm)] border border-line bg-surface px-2 py-1.5 text-[12.5px] text-ink">
                    <option value="">Choose role…</option>
                    {ROLES.map(([id, label]) => <option key={id} value={id}>{label}</option>)}
                  </select>
                  <label className="flex items-center gap-1.5 text-[12.5px] text-muted">
                    <input type="checkbox" checked={v.isAdmin} onChange={(e) => set(u, { isAdmin: e.target.checked })} /> Admin
                  </label>
                </div>
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-line pt-3">
                {u.status === "pending" ? (
                  <>
                    <button disabled={busy === u.oid} onClick={() => act(u, "approve")} className="inline-flex items-center gap-1.5 rounded-[var(--radius-sm)] bg-accent px-3 py-1.5 text-[12.5px] font-semibold text-on-accent disabled:opacity-60"><Check className="size-3.5" /> Approve</button>
                    <input value={v.reason} onChange={(e) => set(u, { reason: e.target.value })} placeholder="Reason (needed to reject)" aria-label="Reason" className="min-w-[200px] flex-1 rounded-[var(--radius-sm)] border border-line bg-surface px-2.5 py-1.5 text-[12.5px] text-ink" />
                    <button disabled={busy === u.oid} onClick={() => act(u, "reject")} className="inline-flex items-center gap-1.5 rounded-[var(--radius-sm)] border border-critical/30 px-3 py-1.5 text-[12.5px] font-semibold text-critical hover:bg-critical-soft disabled:opacity-60"><X className="size-3.5" /> Reject</button>
                  </>
                ) : approvedView ? (
                  <>
                    <button disabled={busy === u.oid} onClick={() => act(u, "update")} className="rounded-[var(--radius-sm)] bg-accent px-3 py-1.5 text-[12.5px] font-semibold text-on-accent disabled:opacity-60">Save changes</button>
                    <input value={v.reason} onChange={(e) => set(u, { reason: e.target.value })} placeholder="Reason (optional)" aria-label="Reason" className="min-w-[160px] flex-1 rounded-[var(--radius-sm)] border border-line bg-surface px-2.5 py-1.5 text-[12.5px] text-ink" />
                    <button disabled={busy === u.oid} onClick={() => act(u, "suspend")} className="rounded-[var(--radius-sm)] border border-critical/30 px-3 py-1.5 text-[12.5px] font-semibold text-critical hover:bg-critical-soft disabled:opacity-60">Suspend</button>
                  </>
                ) : (
                  <button disabled={busy === u.oid} onClick={() => act(u, "reactivate")} className="rounded-[var(--radius-sm)] bg-accent px-3 py-1.5 text-[12.5px] font-semibold text-on-accent disabled:opacity-60">Approve / restore access</button>
                )}
                {busy === u.oid ? <LoaderCircle className="size-4 animate-spin text-muted" /> : null}
              </div>
            </li>
          );
        })}
      </ul>

      <section className="rounded-[var(--radius-md)] border border-line bg-surface p-4">
        <h2 className="text-[13px] font-semibold text-ink">Recent sign-in attempts that did not get in</h2>
        <p className="mt-0.5 text-[12px] text-muted">If someone says they signed in but is not listed above, look for them here. The reason is shown.</p>
        {attempts.length === 0 ? (
          <p className="mt-3 text-[12.5px] text-faint">None recorded.</p>
        ) : (
          <ul className="mt-3 divide-y divide-line text-[12.5px]">
            {attempts.map((a) => (
              <li key={a.id} className="flex flex-wrap items-baseline justify-between gap-2 py-2">
                <span className="min-w-0">
                  <span className="font-medium text-ink">{a.email ?? a.name ?? "unknown account"}</span>
                  <span className="ml-2 rounded bg-sunken px-1.5 py-0.5 text-[11px] text-muted">
                    {({ login_failure: "failed", login_blocked: "blocked", access_requested: "requested access", access_pending: "still pending", access_denied: "not granted" } as Record<string, string>)[a.type] ?? a.type}
                  </span>
                  {a.detail ? <span className="ml-2 text-faint">{a.detail}</span> : null}
                </span>
                <span className="text-faint">{new Date(a.timestamp).toLocaleString()}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
