"use client";

import { useState } from "react";
import { Activity, Search, Filter, Download, ShieldAlert, Monitor, User } from "lucide-react";

export default function AuditLogsPage() {
  const [logs] = useState([
    { id: 1, action: "Login", user: "System Admin", module: "Authentication", ip: "192.168.1.1", timestamp: "2 mins ago", risk: "low" },
    { id: 2, action: "Assigned Role: CEO", user: "System Admin", module: "User Management", ip: "192.168.1.1", timestamp: "1 hour ago", risk: "medium" },
    { id: 3, action: "Failed Login", user: "Unknown", module: "Authentication", ip: "203.0.113.42", timestamp: "3 hours ago", risk: "high" },
    { id: 4, action: "Deleted Project: Alpha", user: "Patent Analyst", module: "Patent Workspace", ip: "10.0.0.5", timestamp: "1 day ago", risk: "medium" },
    { id: 5, action: "Exported Reports", user: "CEO", module: "Analytics", ip: "172.16.0.2", timestamp: "1 day ago", risk: "low" },
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white">Enterprise Audit Logs</h2>
          <p className="text-sm text-slate-500">Track and monitor all user activities across the platform.</p>
        </div>
        <button className="flex items-center gap-2 bg-white/5 hover:bg-white/10 text-white px-4 py-2 rounded-xl text-sm font-medium transition-all border border-white/10">
          <Download className="h-4 w-4" /> Export CSV
        </button>
      </div>

      <div className="grid grid-cols-3 gap-6 mb-6">
        <div className="p-4 rounded-xl border border-white/10 bg-[hsl(var(--card))]">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-500/10 rounded-lg"><Activity className="h-5 w-5 text-emerald-400" /></div>
            <div>
              <p className="text-xs text-slate-500 font-medium">Total Events (24h)</p>
              <p className="text-xl font-bold text-white">1,204</p>
            </div>
          </div>
        </div>
        <div className="p-4 rounded-xl border border-white/10 bg-[hsl(var(--card))]">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-500/10 rounded-lg"><User className="h-5 w-5 text-indigo-400" /></div>
            <div>
              <p className="text-xs text-slate-500 font-medium">Active Users</p>
              <p className="text-xl font-bold text-white">42</p>
            </div>
          </div>
        </div>
        <div className="p-4 rounded-xl border border-red-500/20 bg-red-500/5">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-500/10 rounded-lg"><ShieldAlert className="h-5 w-5 text-red-400" /></div>
            <div>
              <p className="text-xs text-red-500/70 font-medium">High Risk Events</p>
              <p className="text-xl font-bold text-red-400">3</p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
          <input
            type="text"
            placeholder="Search by user, action, or IP..."
            className="w-full bg-white/[0.04] border border-white/10 rounded-xl pl-10 pr-4 py-2 text-sm text-white focus:outline-none focus:border-[#c9a84c]/50"
          />
        </div>
        <button className="flex items-center gap-2 bg-white/[0.04] border border-white/10 text-white px-4 py-2 rounded-xl text-sm hover:bg-white/10 transition-all">
          <Filter className="h-4 w-4" /> Filters
        </button>
      </div>

      <div className="rounded-2xl border border-white/10 bg-[hsl(var(--card))] overflow-hidden">
        <table className="w-full text-sm text-left">
          <thead className="bg-white/[0.02] border-b border-white/10 text-slate-400">
            <tr>
              <th className="px-6 py-4 font-medium">Action</th>
              <th className="px-6 py-4 font-medium">User</th>
              <th className="px-6 py-4 font-medium">Module</th>
              <th className="px-6 py-4 font-medium">IP Address</th>
              <th className="px-6 py-4 font-medium">Time</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/10">
            {logs.map((log) => (
              <tr key={log.id} className="hover:bg-white/[0.02] transition-colors">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <div className={`h-2 w-2 rounded-full ${
                      log.risk === 'high' ? 'bg-red-500' : log.risk === 'medium' ? 'bg-amber-500' : 'bg-emerald-500'
                    }`} />
                    <span className="font-medium text-white">{log.action}</span>
                  </div>
                </td>
                <td className="px-6 py-4 text-slate-300">{log.user}</td>
                <td className="px-6 py-4">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white/5 text-slate-300 text-xs font-medium border border-white/10">
                    <Monitor className="h-3 w-3" /> {log.module}
                  </span>
                </td>
                <td className="px-6 py-4 text-slate-400 font-mono text-xs">{log.ip}</td>
                <td className="px-6 py-4 text-slate-500">{log.timestamp}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
