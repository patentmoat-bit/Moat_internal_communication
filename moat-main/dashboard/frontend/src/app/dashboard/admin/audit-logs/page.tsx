"use client";

// ─────────────────────────────────────────────────────────────────────────────
// MOAT — Admin Audit Logs Viewer
// Filterable, paginated audit log table for system administrators.
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useRef, useState } from "react";
import {
  Shield,
  Search,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Mail,
  Bell,
  Loader2,
  Filter,
  Calendar,
  User,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";

interface AuditLog {
  id: string;
  action: string;
  performed_by: string;
  user_name: string;
  user_role: string | null;
  details: any;
  old_status?: string;
  new_status?: string;
  project_id?: string;
  email_sent?: boolean;
  notification_sent?: boolean;
  ip_address?: string;
  created_at: string;
}

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [actionFilter, setActionFilter] = useState("");
  const [searchUser, setSearchUser] = useState("");

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        pageSize: "30",
        t: Date.now().toString(), // Cache buster
      });
      if (actionFilter) params.set("action", actionFilter);
      if (searchUser) params.set("userId", searchUser);

      const res = await fetch(`/api/admin/audit-logs?${params}`, {
        cache: "no-store",
        headers: {
          "Pragma": "no-cache",
          "Cache-Control": "no-cache"
        }
      });
      const json = await res.json();

      if (json.data) {
        setLogs(json.data);
        setTotalPages(json.totalPages || 1);
        setTotal(json.total || 0);
      }
    } catch (err) {
      console.error("Failed to fetch audit logs:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [page, actionFilter]);

  // Read the latest fetchLogs via a ref inside the realtime callback so the
  // subscription doesn't need to be torn down and recreated every time the
  // admin changes page or filter — it only needs the LATEST fetch behavior
  // at the moment a new audit log row actually arrives.
  const fetchLogsRef = useRef(fetchLogs);
  fetchLogsRef.current = fetchLogs;

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel('admin_audit_logs_realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'audit_logs' }, () => {
        fetchLogsRef.current();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleExportCSV = () => {
    if (logs.length === 0) return;
    const headers = ["Timestamp", "User", "Role", "Action", "Status Change", "Email Sent", "Notification Sent"];
    const rows = logs.map(log => [
      new Date(log.created_at).toLocaleString().replace(/,/g, ''),
      log.user_name || "System",
      log.user_role || "-",
      log.action,
      (log.old_status && log.new_status ? `${log.old_status} -> ${log.new_status}` : log.new_status) || "-",
      log.email_sent ? "Yes" : "No",
      log.notification_sent ? "Yes" : "No"
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map(e => e.join(","))
    ].join("\\n");

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `audit_logs_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const ACTION_COLORS: Record<string, string> = {
    // Workflow
    PROJECT_CREATED: "bg-blue-500/10 text-blue-600 border-blue-500/20",
    CEO_APPROVED: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
    CEO_REJECTED: "bg-red-500/10 text-red-600 border-red-500/20",
    REVISION_REQUIRED: "bg-orange-500/10 text-orange-600 border-orange-500/20",
    FILED: "bg-cyan-500/10 text-cyan-600 border-cyan-500/20",
    DOCUMENT_UPLOADED: "bg-violet-500/10 text-violet-600 border-violet-500/20",
    DESIGN_COMPLETED: "bg-purple-500/10 text-purple-600 border-purple-500/20",
    RENEWAL_REMINDER: "bg-amber-500/10 text-amber-600 border-amber-500/20",
    
    // Auth & Security
    LOGIN_SUCCESS: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
    LOGOUT_SUCCESS: "bg-gray-500/10 text-gray-600 border-gray-500/20",
    LOGIN_FAILED: "bg-red-500/10 text-red-600 border-red-500/20",
    MFA_VERIFIED: "bg-teal-500/10 text-teal-600 border-teal-500/20",
    MFA_FAILED: "bg-red-500/10 text-red-600 border-red-500/20",
    ACCOUNT_LOCKED: "bg-red-500/10 text-red-700 border-red-500/30",
    PASSWORD_RESET_REQUESTED: "bg-blue-500/10 text-blue-600 border-blue-500/20",
    PASSWORD_RESET_SUCCESS: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
    RATE_LIMIT_EXCEEDED: "bg-orange-500/10 text-orange-600 border-orange-500/20",
  };

  const EVENT_TYPES = [
    // Auth & Security
    "LOGIN_SUCCESS", "LOGOUT_SUCCESS", "LOGIN_FAILED", 
    "MFA_VERIFIED", "MFA_FAILED", "ACCOUNT_LOCKED", 
    "PASSWORD_RESET_REQUESTED", "PASSWORD_RESET_SUCCESS", "RATE_LIMIT_EXCEEDED",
    
    // Workflow
    "PROJECT_CREATED", "PROJECT_ASSIGNED", "RESEARCH_STARTED",
    "DOCUMENT_UPLOADED", "DESIGN_REQUESTED", "DESIGN_STARTED", "DESIGN_COMPLETED",
    "REPORT_SUBMITTED", "CEO_APPROVED", "CEO_REJECTED",
    "REVISION_REQUIRED", "REVISION_COMPLETED",
    "FILING_STARTED", "FILED", "RENEWAL_REMINDER", "PROJECT_COMPLETED",
  ];

  return (
    <div className="mx-auto max-w-7xl space-y-6 pb-16 px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="pt-6">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline" className="border-[#c9a84c]/40 bg-[#c9a84c]/10 text-[#c9a84c] font-semibold px-3 py-1">
            Admin
          </Badge>
          <Badge variant="outline" className="text-muted-foreground font-medium px-3 py-1">
            Immutable Event History
          </Badge>
        </div>
        <h1 className="mt-3 text-3xl font-bold tracking-tight">Audit Logs</h1>
        <p className="mt-2 text-sm text-muted-foreground max-w-2xl">
          Every workflow action, status change, email dispatch, and notification is recorded here.
          Logs are immutable and cannot be deleted.
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <select
            value={actionFilter}
            onChange={(e) => { setActionFilter(e.target.value); setPage(1); }}
            className="pl-9 pr-4 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:border-[#c9a84c]/50 min-w-[200px]"
          >
            <option value="">All Event Types</option>
            {EVENT_TYPES.map(t => (
              <option key={t} value={t}>{t.replace(/_/g, " ")}</option>
            ))}
          </select>
        </div>

        <button
          onClick={fetchLogs}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-4 py-2 text-sm font-semibold hover:bg-muted transition-colors disabled:opacity-50"
        >
          <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} /> Refresh
        </button>

        <button
          onClick={handleExportCSV}
          disabled={logs.length === 0}
          className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-4 py-2 text-sm font-semibold hover:bg-muted transition-colors disabled:opacity-50"
        >
          <Mail className="h-4 w-4" /> Export CSV
        </button>

        <span className="text-xs text-muted-foreground ml-auto">
          {total} total entries
        </span>
      </div>

      {/* Table */}
      <Card className="border-border/70 overflow-hidden">
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center h-48">
              <Loader2 className="h-8 w-8 animate-spin text-[#c9a84c]" />
            </div>
          ) : logs.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground">
              <Shield className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>No audit logs found.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/30 border-b border-border/70">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground whitespace-nowrap">Timestamp</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground whitespace-nowrap">User</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground whitespace-nowrap">Role</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground whitespace-nowrap">Action</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground whitespace-nowrap">Status Change</th>
                    <th className="px-4 py-3 text-center font-medium text-muted-foreground whitespace-nowrap">
                      <Mail className="h-4 w-4 inline" />
                    </th>
                    <th className="px-4 py-3 text-center font-medium text-muted-foreground whitespace-nowrap">
                      <Bell className="h-4 w-4 inline" />
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {logs.map((log) => (
                    <tr key={log.id} className="transition-colors hover:bg-muted/10">
                      <td className="px-4 py-3 whitespace-nowrap text-xs text-muted-foreground">
                        {new Date(log.created_at).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-[#c9a84c]/10 flex items-center justify-center">
                            <User className="h-3 w-3 text-[#c9a84c]" />
                          </div>
                          <span className="text-sm font-medium">{log.user_name || "System"}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <Badge variant="outline" className="text-[10px]">
                          {log.user_role || "—"}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-[10px] font-semibold",
                            ACTION_COLORS[log.action] || "bg-gray-500/10 text-gray-600 border-gray-500/20"
                          )}
                        >
                          {log.action.replace(/_/g, " ")}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-xs">
                        {log.old_status && log.new_status ? (
                          <span>
                            <span className="text-muted-foreground">{log.old_status}</span>
                            <span className="mx-1">→</span>
                            <span className="font-medium text-foreground">{log.new_status}</span>
                          </span>
                        ) : log.new_status ? (
                          <span className="font-medium text-foreground">{log.new_status}</span>
                        ) : (
                          <span className="text-muted-foreground/50">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {log.email_sent ? (
                          <span className="text-emerald-500 text-xs font-bold">✓</span>
                        ) : (
                          <span className="text-muted-foreground/30 text-xs">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {log.notification_sent ? (
                          <span className="text-emerald-500 text-xs font-bold">✓</span>
                        ) : (
                          <span className="text-muted-foreground/30 text-xs">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-border/40">
              <span className="text-xs text-muted-foreground">
                Page {page} of {totalPages}
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="p-2 rounded-lg border border-border hover:bg-muted disabled:opacity-30 transition-colors"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="p-2 rounded-lg border border-border hover:bg-muted disabled:opacity-30 transition-colors"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
