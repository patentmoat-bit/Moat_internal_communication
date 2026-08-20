"use client";

import React, { useState } from "react";
import { 
  Search, Download, RefreshCw, AlertCircle, CheckCircle2, 
  Clock, XCircle, ChevronDown, ChevronUp, Mail, ServerCrash, 
  Send
} from "lucide-react";
import { cn } from "@/lib/utils";

type DeliveryStatus = "Delivered" | "Failed" | "Pending" | "Bounced";

interface EmailLog {
  id: string;
  recipient: string;
  sender: string;
  subject: string;
  template: string;
  triggerEvent: string;
  status: DeliveryStatus;
  timestamp: string;
  retryCount: number;
  errorMessage?: string;
}

const mockLogs: EmailLog[] = [
  {
    id: "log-1",
    recipient: "jdoe@moat.io",
    sender: "notifications@moat.io",
    subject: "New Patent Project: Quantum Encryption",
    template: "Project Created",
    triggerEvent: "Project Initialization",
    status: "Delivered",
    timestamp: "2026-06-25 10:15:22",
    retryCount: 0
  },
  {
    id: "log-2",
    recipient: "asmith@enterprise.com",
    sender: "alerts@moat.io",
    subject: "Security Alert: Permission Drift Detected",
    template: "Permission Drift Detected",
    triggerEvent: "RBAC Anomaly Monitor",
    status: "Failed",
    timestamp: "2026-06-25 09:42:11",
    retryCount: 2,
    errorMessage: "SMTP Error: 550 5.1.1 User unknown. The destination inbox does not exist or cannot receive mail."
  },
  {
    id: "log-3",
    recipient: "ceo@moat.io",
    sender: "workflow@moat.io",
    subject: "Approval Required: Neural Network Training",
    template: "CEO Approval Requested",
    triggerEvent: "Legal Review Completed",
    status: "Delivered",
    timestamp: "2026-06-25 08:30:00",
    retryCount: 0
  },
  {
    id: "log-4",
    recipient: "investor-relations@moat.io",
    sender: "reports@moat.io",
    subject: "Scheduled Report: Executive Dashboard",
    template: "Automated Report Delivery",
    triggerEvent: "Cron Job (Weekly)",
    status: "Pending",
    timestamp: "2026-06-25 08:00:00",
    retryCount: 1
  },
  {
    id: "log-5",
    recipient: "former-employee@company.com",
    sender: "system@moat.io",
    subject: "Your Account is Deactivated",
    template: "Account Deactivated",
    triggerEvent: "Admin User Deletion",
    status: "Bounced",
    timestamp: "2026-06-24 18:22:19",
    retryCount: 3,
    errorMessage: "Hard Bounce: Recipient email server rejected connection. Domain may be expired."
  },
  {
    id: "log-6",
    recipient: "hacker@malicious.net",
    sender: "security@moat.io",
    subject: "Security Alert: Multiple Failed Logins",
    template: "Failed Login Attempts",
    triggerEvent: "Brute Force Protection",
    status: "Failed",
    timestamp: "2026-06-24 14:11:05",
    retryCount: 0,
    errorMessage: "Connection timeout to remote mail server. Provider potentially blacklisted."
  }
];

export default function EmailLogsPage() {
  const [search, setSearch] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("All");
  const [selectedTemplate, setSelectedTemplate] = useState("All");
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});
  const [logs, setLogs] = useState(mockLogs);
  const [isExporting, setIsExporting] = useState(false);

  const toggleRow = (id: string) => {
    setExpandedRows(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleResend = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    // Optimistic UI update to show it moving to Pending
    setLogs(prev => prev.map(log => 
      log.id === id ? { ...log, status: "Pending", retryCount: log.retryCount + 1 } : log
    ));
    // Simulate resolution after 2 seconds
    setTimeout(() => {
      setLogs(prev => prev.map(log => 
        log.id === id ? { ...log, status: "Delivered" } : log
      ));
    }, 2000);
  };

  const handleExport = () => {
    setIsExporting(true);
    setTimeout(() => {
      setIsExporting(false);
      // Mocking download behavior
      const link = document.createElement("a");
      link.href = "data:text/csv;charset=utf-8,Mock CSV Data";
      link.download = "moat_email_logs.csv";
      link.click();
    }, 1500);
  };

  const filteredLogs = logs.filter(log => {
    const matchesSearch = 
      log.recipient.toLowerCase().includes(search.toLowerCase()) || 
      log.subject.toLowerCase().includes(search.toLowerCase()) ||
      (log.errorMessage?.toLowerCase().includes(search.toLowerCase()) ?? false);
    
    const matchesStatus = selectedStatus === "All" || log.status === selectedStatus;
    const matchesTemplate = selectedTemplate === "All" || log.template === selectedTemplate;

    return matchesSearch && matchesStatus && matchesTemplate;
  });

  const getStatusBadge = (status: DeliveryStatus) => {
    switch (status) {
      case "Delivered":
        return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-600 border border-emerald-500/20"><CheckCircle2 className="h-3 w-3" /> Delivered</span>;
      case "Failed":
        return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold uppercase tracking-wider bg-red-500/10 text-red-600 border border-red-500/20"><XCircle className="h-3 w-3" /> Failed</span>;
      case "Pending":
        return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold uppercase tracking-wider bg-blue-500/10 text-blue-600 border border-blue-500/20"><RefreshCw className="h-3 w-3 animate-spin" /> Pending</span>;
      case "Bounced":
        return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold uppercase tracking-wider bg-orange-500/10 text-orange-600 border border-orange-500/20"><AlertCircle className="h-3 w-3" /> Bounced</span>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-foreground">Email Audit Logs</h2>
          <p className="text-sm text-muted-foreground">Monitor delivery status, track errors, and resend failed platform notifications.</p>
        </div>
        <button 
          onClick={handleExport}
          disabled={isExporting}
          className="flex items-center gap-2 bg-background border border-border hover:bg-muted text-foreground px-4 py-2 rounded-xl text-sm font-semibold transition-all shadow-sm disabled:opacity-50"
        >
          {isExporting ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />} 
          {isExporting ? "Compiling CSV..." : "Export Logs (CSV)"}
        </button>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-card border border-border p-4 rounded-2xl shadow-sm">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by recipient, subject, or error..."
            className="w-full bg-background border border-border rounded-xl pl-10 pr-4 py-2 text-sm text-foreground focus:outline-none focus:border-[#c9a84c]/50"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select 
          className="w-full bg-background border border-border rounded-xl px-4 py-2 text-sm text-foreground focus:outline-none focus:border-[#c9a84c]/50 appearance-none"
          value={selectedStatus}
          onChange={(e) => setSelectedStatus(e.target.value)}
        >
          <option value="All">All Statuses</option>
          <option value="Delivered">Delivered</option>
          <option value="Failed">Failed</option>
          <option value="Pending">Pending</option>
          <option value="Bounced">Bounced</option>
        </select>
        <select 
          className="w-full bg-background border border-border rounded-xl px-4 py-2 text-sm text-foreground focus:outline-none focus:border-[#c9a84c]/50 appearance-none"
          value={selectedTemplate}
          onChange={(e) => setSelectedTemplate(e.target.value)}
        >
          <option value="All">All Templates</option>
          <option value="Project Created">Project Created</option>
          <option value="Permission Drift Detected">Permission Drift Detected</option>
          <option value="CEO Approval Requested">CEO Approval Requested</option>
          <option value="Automated Report Delivery">Automated Report Delivery</option>
          <option value="Failed Login Attempts">Failed Login Attempts</option>
        </select>
      </div>

      {/* Logs Table */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-muted/50 border-b border-border">
              <tr>
                <th className="px-6 py-4 font-bold text-muted-foreground uppercase tracking-wider text-[11px]">Timestamp</th>
                <th className="px-6 py-4 font-bold text-muted-foreground uppercase tracking-wider text-[11px]">Recipient</th>
                <th className="px-6 py-4 font-bold text-muted-foreground uppercase tracking-wider text-[11px]">Subject</th>
                <th className="px-6 py-4 font-bold text-muted-foreground uppercase tracking-wider text-[11px]">Status</th>
                <th className="px-6 py-4 font-bold text-muted-foreground uppercase tracking-wider text-[11px]">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground">
                    <Mail className="h-10 w-10 mx-auto mb-4 opacity-20" />
                    <p>No email logs found matching your filters.</p>
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => (
                  <React.Fragment key={log.id}>
                    <tr 
                      onClick={() => toggleRow(log.id)}
                      className={cn(
                        "hover:bg-muted/30 transition-colors cursor-pointer group",
                        expandedRows[log.id] ? "bg-muted/10" : ""
                      )}
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          {expandedRows[log.id] ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground opacity-50 group-hover:opacity-100" />}
                          <span className="font-mono text-xs text-muted-foreground">{log.timestamp}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 font-medium text-foreground">{log.recipient}</td>
                      <td className="px-6 py-4 text-muted-foreground max-w-xs truncate" title={log.subject}>{log.subject}</td>
                      <td className="px-6 py-4">{getStatusBadge(log.status)}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          {(log.status === "Failed" || log.status === "Bounced") && (
                            <button 
                              onClick={(e) => handleResend(log.id, e)}
                              className="flex items-center gap-1.5 px-3 py-1.5 bg-background border border-border hover:bg-muted hover:text-foreground text-muted-foreground rounded-lg text-xs font-bold transition-all shadow-sm"
                            >
                              <Send className="h-3 w-3" /> Resend
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                    {expandedRows[log.id] && (
                      <tr className="bg-muted/5 border-b border-border/50">
                        <td colSpan={5} className="px-6 py-6">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Left Column: Metadata */}
                            <div className="space-y-4">
                              <div>
                                <h5 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Sender Entity</h5>
                                <p className="text-sm font-medium">{log.sender}</p>
                              </div>
                              <div>
                                <h5 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Trigger Event</h5>
                                <p className="text-sm font-medium">{log.triggerEvent}</p>
                              </div>
                              <div>
                                <h5 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Template Used</h5>
                                <div className="inline-flex items-center gap-2 bg-muted px-2.5 py-1 rounded-md text-xs font-semibold">
                                  {log.template}
                                </div>
                              </div>
                              <div>
                                <h5 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Retry Count</h5>
                                <p className="text-sm font-medium">{log.retryCount} attempt(s)</p>
                              </div>
                            </div>

                            {/* Right Column: Error Details */}
                            {log.errorMessage && (
                              <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-4">
                                <h5 className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-red-600 mb-2">
                                  <ServerCrash className="h-4 w-4" /> Delivery Error Details
                                </h5>
                                <p className="text-sm text-red-600/80 font-mono leading-relaxed break-words whitespace-normal">
                                  {log.errorMessage}
                                </p>
                                <div className="mt-4 text-xs text-red-600/60">
                                  Consult the SMTP provider logs for deep network trace details.
                                </div>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
