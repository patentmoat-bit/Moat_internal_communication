"use client";

import { Lock, Server, Clock, Fingerprint, MapPin } from "lucide-react";

export default function SecurityManagementPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white">Security Policies</h2>
          <p className="text-sm text-slate-500">Configure enterprise authentication and access rules.</p>
        </div>
        <button className="bg-[#c9a84c] hover:bg-[#b8921e] text-white px-6 py-2 rounded-xl text-sm font-bold transition-all">
          Save Policies
        </button>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="rounded-2xl border border-white/10 bg-[hsl(var(--card))] overflow-hidden">
          <div className="p-6 border-b border-white/[0.04]">
            <div className="flex items-center gap-2">
              <Lock className="h-5 w-5 text-[#c9a84c]" />
              <h3 className="font-bold text-white">Password Policy</h3>
            </div>
          </div>
          <div className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-300">Minimum Length</span>
              <select className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white">
                <option>12 characters</option>
                <option>14 characters</option>
                <option>16 characters</option>
              </select>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-300">Require Uppercase & Lowercase</span>
              <input type="checkbox" defaultChecked className="accent-[#c9a84c]" />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-300">Require Numbers & Symbols</span>
              <input type="checkbox" defaultChecked className="accent-[#c9a84c]" />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-300">Password Expiry (Days)</span>
              <input type="number" defaultValue={90} className="w-20 bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white" />
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-[hsl(var(--card))] overflow-hidden">
          <div className="p-6 border-b border-white/[0.04]">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-[#c9a84c]" />
              <h3 className="font-bold text-white">Session Management</h3>
            </div>
          </div>
          <div className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-300">Idle Session Timeout</span>
              <select className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white">
                <option>15 Minutes</option>
                <option>30 Minutes</option>
                <option>1 Hour</option>
              </select>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-300">Maximum Login Attempts</span>
              <select className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white">
                <option>3 attempts</option>
                <option>5 attempts</option>
              </select>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-300">Account Lock Duration</span>
              <select className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white">
                <option>15 Minutes</option>
                <option>1 Hour</option>
                <option>Until Admin Unlock</option>
              </select>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-[hsl(var(--card))] overflow-hidden">
          <div className="p-6 border-b border-white/[0.04]">
            <div className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-[#c9a84c]" />
              <h3 className="font-bold text-white">Network Restrictions</h3>
            </div>
          </div>
          <div className="p-6 space-y-4">
            <div className="space-y-2">
              <label className="text-sm text-slate-300">IP Whitelist</label>
              <textarea 
                placeholder="Enter IP addresses separated by commas..." 
                className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-sm text-white h-24 focus:outline-none focus:border-[#c9a84c]/50"
              />
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-[hsl(var(--card))] overflow-hidden">
          <div className="p-6 border-b border-white/[0.04]">
            <div className="flex items-center gap-2">
              <Fingerprint className="h-5 w-5 text-[#c9a84c]" />
              <h3 className="font-bold text-white">Multi-Factor Authentication</h3>
            </div>
          </div>
          <div className="p-6 space-y-4">
            <div className="flex items-center justify-between p-4 bg-white/[0.02] border border-white/10 rounded-xl">
              <div>
                <h4 className="font-medium text-white text-sm">Enforce 2FA Enterprise-Wide</h4>
                <p className="text-xs text-slate-500 mt-1">Require all users to setup TOTP.</p>
              </div>
              <input type="checkbox" className="accent-[#c9a84c] w-5 h-5" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
