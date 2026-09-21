"use client";

import * as React from "react";
import Link from "next/link";
import {
  Users,
  Shield,
  KeyRound,
  Sliders,
  Building,
  Bell,
  Lock,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Database,
  Globe2,
} from "lucide-react";
import { useActiveRole } from "@/components/auth/role-context";

export default function SettingsPage() {
  const { currentUser, profile } = useActiveRole();
  const [workspaceName, setWorkspaceName] = React.useState("Enterprise IP Portfolio");
  const [jurisdiction, setJurisdiction] = React.useState("US");
  const [savedNotice, setSavedNotice] = React.useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSavedNotice(true);
    setTimeout(() => setSavedNotice(false), 3000);
  };

  return (
    <div className="flex h-[calc(100vh-var(--topbar-h))] flex-col overflow-y-auto bg-canvas p-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded-md bg-accent/10 px-2 py-0.5 text-xs font-semibold uppercase tracking-wider text-accent">
              Platform Configuration
            </span>
            <span className="text-xs text-muted">Workspace & Security Settings</span>
          </div>
          <h1 className="mt-1 text-2xl font-black tracking-tight text-ink">
            Workspace Settings
          </h1>
        </div>

        {savedNotice && (
          <div className="flex items-center gap-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 text-xs font-bold text-emerald-600">
            <CheckCircle2 className="size-4" /> Settings Saved
          </div>
        )}
      </div>

      {/* Admin Quick Action Card */}
      <div className="rounded-2xl border border-rose-500/20 bg-rose-500/5 p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="flex size-12 items-center justify-center rounded-2xl bg-rose-500/10 text-rose-600">
            <ShieldCheck className="size-6" />
          </div>
          <div>
            <h2 className="text-base font-bold text-ink">Admin Control & User Role Management</h2>
            <p className="text-xs text-muted">
              Create new team accounts, assign functional roles, and inspect the RBAC permission matrix.
            </p>
          </div>
        </div>

        <Link
          href="/admin"
          className="inline-flex items-center gap-2 rounded-xl bg-accent px-4 py-2.5 text-xs font-bold text-white shadow-sm hover:brightness-110 transition shrink-0"
        >
          <Users className="size-4" />
          Open Admin Control <ArrowRight className="size-3.5" />
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Workspace Organization Info */}
        <form onSubmit={handleSave} className="rounded-2xl border border-line bg-surface p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-2 text-sm font-bold text-ink">
            <Building className="size-4 text-accent" />
            <span>Organization Profile</span>
          </div>

          <div className="space-y-3 text-xs">
            <div>
              <label className="font-bold text-ink">Workspace / Firm Name</label>
              <input
                type="text"
                value={workspaceName}
                onChange={(e) => setWorkspaceName(e.target.value)}
                className="mt-1 w-full rounded-lg border border-line bg-canvas px-3 py-2 text-ink outline-none focus:border-accent"
              />
            </div>

            <div>
              <label className="font-bold text-ink">Primary Patent Jurisdiction</label>
              <select
                value={jurisdiction}
                onChange={(e) => setJurisdiction(e.target.value)}
                className="mt-1 w-full rounded-lg border border-line bg-canvas px-3 py-2 text-ink outline-none"
              >
                <option value="US">United States (USPTO)</option>
                <option value="EP">European Patent Office (EPO)</option>
                <option value="WO">WIPO / PCT Global</option>
                <option value="JP">Japan Patent Office (JPO)</option>
                <option value="CN">China National IP Administration (CNIPA)</option>
              </select>
            </div>

            <div>
              <label className="font-bold text-ink">Active Session Profile</label>
              <div className="mt-1 rounded-lg border border-line bg-canvas p-3 flex items-center justify-between">
                <div>
                  <div className="font-bold text-ink">{currentUser.name}</div>
                  <div className="text-[11px] text-muted">{currentUser.email} · {profile.title}</div>
                </div>
                <span className="rounded bg-accent/10 px-2 py-0.5 text-[10px] font-bold text-accent">
                  {currentUser.role}
                </span>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                className="rounded-lg bg-accent px-4 py-2 font-bold text-white shadow-sm hover:brightness-110 transition"
              >
                Save Organization Settings
              </button>
            </div>
          </div>
        </form>

        {/* Security & Access Policies */}
        <div className="rounded-2xl border border-line bg-surface p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-2 text-sm font-bold text-ink">
            <Lock className="size-4 text-purple-500" />
            <span>Enterprise Security & Access Controls</span>
          </div>

          <div className="space-y-3 text-xs">
            <div className="flex items-center justify-between rounded-xl border border-line bg-canvas p-3.5">
              <div>
                <div className="font-bold text-ink">Role-Based Session Isolation</div>
                <div className="text-[11px] text-muted">Enforce strict surface gating per assigned user role</div>
              </div>
              <span className="rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[10px] font-bold text-emerald-600">
                ENABLED
              </span>
            </div>

            <div className="flex items-center justify-between rounded-xl border border-line bg-canvas p-3.5">
              <div>
                <div className="font-bold text-ink">Perplexity Pro Citation Verification</div>
                <div className="text-[11px] text-muted">Validate patent references against global prosecution registers</div>
              </div>
              <span className="rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[10px] font-bold text-emerald-600">
                ACTIVE
              </span>
            </div>

            <div className="flex items-center justify-between rounded-xl border border-line bg-canvas p-3.5">
              <div>
                <div className="font-bold text-ink">Audit Logging & Trail</div>
                <div className="text-[11px] text-muted">Record administrative actions and user permission updates</div>
              </div>
              <span className="rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[10px] font-bold text-emerald-600">
                RECORDING
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

