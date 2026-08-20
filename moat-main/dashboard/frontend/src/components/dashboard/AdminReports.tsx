"use client";

import { useState, useRef, useEffect } from "react";
import { FileText, ArrowLeft, Loader2, Download, Printer, ShieldCheck, Edit, Save, RefreshCcw, FileArchive } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import Link from "next/link";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";

export default function AdminReports() {
  const [step, setStep] = useState(0);
  const [reportData, setReportData] = useState<any | null>(null);
  const [progressMsg, setProgressMsg] = useState("");
  
  // Filters
  const [dateRange, setDateRange] = useState("30d");
  const [roleFilter, setRoleFilter] = useState("all");
  const [userFilterText, setUserFilterText] = useState("");
  const [activityFilter, setActivityFilter] = useState("all");
  const [projectFilter, setProjectFilter] = useState("");

  // Editable fields
  const [isEditing, setIsEditing] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [editableContent, setEditableContent] = useState({
    title: "ENTERPRISE ACTIVITY & SECURITY REPORT",
    executiveSummary: "",
    observations: "",
  });

  const reportRef = useRef<HTMLDivElement>(null);

  const generateAdminReport = async () => {
    setStep(1);
    setProgressMsg("Aggregating live platform telemetry...");
    try {
      const res = await fetch("/api/dashboard/admin/generate-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          dateRange, 
          role: roleFilter, 
          user: userFilterText, 
          activity: activityFilter,
          projectFilter 
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || data.detail || "Failed to generate report");
      
      setReportData(data);
      
      // Initialize editable content
      setEditableContent({
        title: "ENTERPRISE ACTIVITY & SECURITY REPORT",
        executiveSummary: data.executiveSummary || "Summary will be generated here.",
        observations: (data.observations || []).join("\n"),
      });

      setStep(2);
    } catch (e: any) {
      console.error(e);
      alert("Failed to generate report: " + (e?.message || "Unknown error"));
      setStep(0);
    }
  };

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (autoRefresh && step === 2) {
      interval = setInterval(() => {
        generateAdminReport(); // Re-fetch silently
      }, 10000); // 10 seconds live tracking
    }
    return () => clearInterval(interval);
  }, [autoRefresh, step, dateRange, roleFilter, userFilterText, activityFilter, projectFilter]);

  const handleDownloadPDF = async () => {
    if (typeof window === "undefined") return;
    try {
      // Dynamic import to avoid SSR issues
      const html2pdf = (await import("html2pdf.js")).default;
      const element = document.getElementById("moat-unified-report");
      
      const opt = {
        margin:       10,
        filename:     `MOAT_Enterprise_Report_${new Date().toISOString().split("T")[0]}.pdf`,
        image:        { type: 'jpeg', quality: 0.98 },
        html2canvas:  { scale: 2, useCORS: true },
        jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
      };

      html2pdf().set(opt).from(element).save();
    } catch (error) {
      console.error("PDF generation failed:", error);
      alert("Failed to generate PDF. Make sure html2pdf.js is installed.");
      window.print(); // Fallback
    }
  };

  const handleDownloadDOCX = async () => {
    alert("DOCX Export requires server-side rendering of the document structure. Currently exporting to PDF is recommended for layout preservation.");
  };

  const handleDownloadCSV = () => {
    if (!reportData || !reportData.timeline) return;
    const headers = ["Timestamp","User","Email","Role","Activity","Activity Type","Project","Detail","Status","IP","Module"];
    const rows = reportData.timeline.map((t: any) => [
      t.timestamp,
      `"${(t.user || "").replace(/"/g,"'")}"`,
      t.email || "",
      t.role || "",
      t.action || "",
      t.activityType || "",
      t.project || "",
      `"${(t.detail || "").replace(/"/g,"'")}"`,
      t.status || "",
      t.ip || "",
      t.module || ""
    ]);
    const csv = [headers.join(","), ...rows.map((r: any[]) => r.join(","))].join("\n");
    const a = document.createElement("a");
    a.href = "data:text/csv;charset=utf-8," + encodeURIComponent(csv);
    a.download = `MOAT_Activity_Log_${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
  };


  return (
    <div className="space-y-6 max-w-[1200px] mx-auto pb-20 p-6">
      
      {/* ─────────────────────────────────────────────────────────────────
          HEADER
      ────────────────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 no-print">
        <Link href="/dashboard/admin">
          <Button variant="ghost" size="icon" className="rounded-full border border-border/50"><ArrowLeft className="h-4 w-4" /></Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <FileText className="h-6 w-6 text-[#c9a84c]" /> Enterprise Reports
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">Generate one unified report containing complete platform activity.</p>
        </div>
      </div>

      <Separator className="no-print" />

      {/* ─────────────────────────────────────────────────────────────────
          STEP 0: CONFIGURATION
      ────────────────────────────────────────────────────────────────── */}
      {step === 0 && (
        <Card className="border-border/60 shadow-lg max-w-3xl mx-auto mt-10">
          <CardHeader className="bg-muted/30 border-b border-border/50">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-[#c9a84c]" /> Report Configuration
            </CardTitle>
            <CardDescription className="text-xs">Select filters to generate the unified activity report.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground">Date Range</label>
                <select value={dateRange} onChange={e => setDateRange(e.target.value)} className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background focus:outline-none focus:border-[#c9a84c]">
                  <option value="today">Today</option>
                  <option value="7d">Last 7 Days</option>
                  <option value="30d">Last 30 Days (Default)</option>
                  <option value="90d">Last 90 Days</option>
                  <option value="all">All Time</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground">Role Filter</label>
                <select value={roleFilter} onChange={e => setRoleFilter(e.target.value)} className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background focus:outline-none focus:border-[#c9a84c]">
                  <option value="all">All Roles</option>
                  <option value="CEO">CEO</option>
                  <option value="Patent Analyst">Patent Analyst</option>
                  <option value="Design Team">Design Team</option>
                  <option value="Admin">Admin</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground">Activity Type</label>
                <select value={activityFilter} onChange={e => setActivityFilter(e.target.value)} className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background focus:outline-none focus:border-[#c9a84c]">
                  <option value="all">All Activity</option>
                  <option value="login">Authentication & IAM</option>
                  <option value="security">Security Events</option>
                  <option value="workflow">Workflow & Approvals</option>
                  <option value="upload">Document Activity</option>
                  <option value="search">Patent Searches</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground">Project (Optional)</label>
                <input type="text" placeholder="Project ID or Name" value={projectFilter} onChange={e => setProjectFilter(e.target.value)} className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background focus:outline-none focus:border-[#c9a84c]" />
              </div>
              <div className="space-y-1.5 col-span-2">
                <label className="text-xs font-bold text-foreground">User Filter (Optional)</label>
                <input type="text" placeholder="e.g. john@company.com" value={userFilterText} onChange={e => setUserFilterText(e.target.value)} className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background focus:outline-none focus:border-[#c9a84c]" />
              </div>
            </div>
            <Button onClick={generateAdminReport} className="w-full font-bold bg-[#c9a84c] text-black hover:bg-[#b59540]">
              Generate Unified Report
            </Button>
          </CardContent>
        </Card>
      )}

      {/* ─────────────────────────────────────────────────────────────────
          STEP 1: LOADING
      ────────────────────────────────────────────────────────────────── */}
      {step === 1 && (
        <div className="flex flex-col items-center justify-center py-40 gap-4 text-center">
          <Loader2 className="h-12 w-12 animate-spin text-[#c9a84c]" />
          <h3 className="text-base font-bold">Generating Report...</h3>
          <p className="text-xs text-muted-foreground font-mono">{progressMsg}</p>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────
          STEP 2: REPORT VIEW
      ────────────────────────────────────────────────────────────────── */}
      {step === 2 && reportData && (
        <div className="space-y-4">
          
          {/* Controls */}
          <div className="flex justify-between items-center bg-card p-4 rounded-xl border border-border shadow-sm no-print sticky top-4 z-10">
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => setStep(0)}>
                <ArrowLeft className="h-4 w-4 mr-2" /> Back
              </Button>
              {isEditing ? (
                <Button size="sm" variant="default" className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => setIsEditing(false)}>
                  <Save className="h-4 w-4 mr-2" /> Save Draft
                </Button>
              ) : (
                <Button size="sm" variant="outline" onClick={() => setIsEditing(true)}>
                  <Edit className="h-4 w-4 mr-2" /> Edit Report
                </Button>
              )}
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant={autoRefresh ? "default" : "outline"} className={autoRefresh ? "bg-red-600 hover:bg-red-700 text-white animate-pulse" : ""} onClick={() => setAutoRefresh(!autoRefresh)}>
                <RefreshCcw className="h-4 w-4 mr-2" /> {autoRefresh ? "Live Tracking (On)" : "Live Track"}
              </Button>
              <Button size="sm" variant="outline" onClick={handleDownloadCSV}>
                <FileArchive className="h-4 w-4 mr-2" /> Export Raw CSV
              </Button>
              <Button size="sm" variant="outline" onClick={handleDownloadDOCX}>
                <Download className="h-4 w-4 mr-2" /> Download DOCX
              </Button>
              <Button size="sm" className="bg-[#c9a84c] text-black hover:bg-[#b59540]" onClick={handleDownloadPDF}>
                <Printer className="h-4 w-4 mr-2" /> Print / PDF
              </Button>
            </div>
          </div>

          {/* Report Document */}
          <div className="bg-card text-card-foreground p-10 rounded-sm shadow-2xl min-h-[1056px] w-full max-w-[1000px] mx-auto border border-border transition-colors duration-200" id="moat-unified-report">
            
            <style dangerouslySetInnerHTML={{__html: `
              @media print {
                body * { visibility: hidden; }
                #moat-unified-report, #moat-unified-report * { visibility: visible; }
                #moat-unified-report { 
                  position: absolute; left: 0; top: 0; width: 100%; padding: 0; border: none; box-shadow: none;
                  background-color: white !important; 
                  color: black !important;
                }
                .no-print { display: none !important; }
                .page-break { page-break-before: always; }
                .report-heading { color: #1a1a1a !important; border-bottom-color: #c9a84c !important; }
                .report-table th { background-color: #f3f4f6 !important; color: #374151 !important; }
                .report-table td { color: #1f2937 !important; border-color: #e5e7eb !important; }
                .report-text { color: #1f2937 !important; }
              }
              .report-heading { color: inherit; border-bottom: 2px solid #c9a84c; padding-bottom: 4px; margin-top: 32px; margin-bottom: 16px; font-size: 18px; font-weight: bold; text-transform: uppercase; }
              .report-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 11px; }
              .report-table th { background-color: hsl(var(--muted)); color: hsl(var(--foreground)); font-weight: bold; text-align: left; padding: 8px; border: 1px solid hsl(var(--border)); }
              .report-table td { padding: 8px; border: 1px solid hsl(var(--border)); color: hsl(var(--muted-foreground)); }
              .status-success { color: #10b981; font-weight: 600; }
              .status-failed { color: #ef4444; font-weight: 600; }
              .status-warning { color: #f59e0b; font-weight: 600; }
            `}} />

            {/* HEADER */}
            <div className="text-center mb-10 border-b-4 border-foreground/80 pb-6">
              <h1 className="text-3xl font-black tracking-widest text-foreground uppercase mb-2">MOAT PATENT INTELLIGENCE PLATFORM</h1>
              {isEditing ? (
                <Input 
                  value={editableContent.title} 
                  onChange={e => setEditableContent({...editableContent, title: e.target.value})}
                  className="text-xl font-bold text-center mb-4"
                />
              ) : (
                <h2 className="text-xl font-bold text-[#c9a84c] tracking-widest uppercase mb-4">{editableContent.title}</h2>
              )}
              
              <div className="grid grid-cols-2 gap-4 text-sm text-muted-foreground text-left max-w-2xl mx-auto bg-muted/30 p-4 rounded border border-border">
                <div><strong>Report Period:</strong> {new Date(reportData.period?.from).toLocaleDateString()} – {new Date(reportData.period?.to).toLocaleDateString()}</div>
                <div><strong>Generated Date:</strong> {new Date(reportData.generatedAt).toLocaleString()}</div>
                <div><strong>Generated By:</strong> {reportData.generatedBy}</div>
                <div><strong>Organization:</strong> MOAT Enterprise</div>
              </div>
            </div>

            {/* EXECUTIVE SUMMARY */}
            <div>
              <h3 className="report-heading">Executive Summary</h3>
              {isEditing ? (
                <Textarea 
                  value={editableContent.executiveSummary}
                  onChange={e => setEditableContent({...editableContent, executiveSummary: e.target.value})}
                  className="min-h-[120px] text-sm"
                />
              ) : (
                <p className="text-sm text-foreground/90 leading-relaxed text-justify report-text">
                  {editableContent.executiveSummary}
                </p>
              )}
            </div>

            {/* OVERALL ACTIVITY SUMMARY */}
            <div className="page-break">
              <h3 className="report-heading">Overall Activity Summary</h3>
              <div className="grid grid-cols-3 gap-4">
                <table className="report-table col-span-3">
                  <tbody>
                    <tr>
                      <td className="w-1/3 bg-muted/40 font-semibold text-foreground">Total Users</td><td className="w-1/6 text-right font-mono">{reportData.kpis?.totalUsers || 0}</td>
                      <td className="w-1/3 bg-muted/40 font-semibold text-foreground">Documents Uploaded</td><td className="w-1/6 text-right font-mono">{reportData.kpis?.docsUploaded || 0}</td>
                    </tr>
                    <tr>
                      <td className="bg-muted/40 font-semibold text-foreground">Active Users</td><td className="text-right font-mono">{reportData.kpis?.activeUsers || 0}</td>
                      <td className="bg-muted/40 font-semibold text-foreground">Documents Downloaded</td><td className="text-right font-mono">{reportData.kpis?.docsDownloaded || 0}</td>
                    </tr>
                    <tr>
                      <td className="bg-muted/40 font-semibold text-foreground">Total Logins</td><td className="text-right font-mono text-emerald-500">{reportData.kpis?.totalLogins || 0}</td>
                      <td className="bg-muted/40 font-semibold text-foreground">Documents Shared</td><td className="text-right font-mono">{reportData.kpis?.docsShared || 0}</td>
                    </tr>
                    <tr>
                      <td className="bg-muted/40 font-semibold text-foreground">Failed Login Attempts</td><td className="text-right font-mono text-red-500">{reportData.kpis?.failedLogins || 0}</td>
                      <td className="bg-muted/40 font-semibold text-foreground">Documents Viewed</td><td className="text-right font-mono">{reportData.kpis?.docsViewed || 0}</td>
                    </tr>
                    <tr>
                      <td className="bg-muted/40 font-semibold text-foreground">MFA Successes</td><td className="text-right font-mono text-emerald-500">{reportData.kpis?.mfaSuccess || 0}</td>
                      <td className="bg-muted/40 font-semibold text-foreground">Total Patent Searches</td><td className="text-right font-mono">{reportData.kpis?.patentSearches || 0}</td>
                    </tr>
                    <tr>
                      <td className="bg-muted/40 font-semibold text-foreground">MFA Failures</td><td className="text-right font-mono text-red-500">{reportData.kpis?.mfaFailed || 0}</td>
                      <td className="bg-muted/40 font-semibold text-foreground">Workflow Actions</td><td className="text-right font-mono">{reportData.kpis?.workflowActions || 0}</td>
                    </tr>
                    <tr>
                      <td className="bg-muted/40 font-semibold text-foreground">Locked Accounts</td><td className="text-right font-mono text-red-500">{reportData.kpis?.lockedAccounts || 0}</td>
                      <td className="bg-muted/40 font-semibold text-foreground">Approvals</td><td className="text-right font-mono text-emerald-500">{reportData.kpis?.approvals || 0}</td>
                    </tr>
                    <tr>
                      <td className="bg-muted/40 font-semibold text-foreground">Security Events</td><td className="text-right font-mono font-bold text-red-500">{reportData.kpis?.securityEvents || 0}</td>
                      <td className="bg-muted/40 font-semibold text-foreground">Rejections</td><td className="text-right font-mono text-red-500">{reportData.kpis?.rejections || 0}</td>
                    </tr>
                    <tr>
                      <td className="bg-muted/40 font-semibold text-foreground">Notifications Sent</td><td className="text-right font-mono">{reportData.kpis?.notificationsSent || 0}</td>
                      <td className="bg-muted/40 font-semibold text-foreground">Emails Sent</td><td className="text-right font-mono">{reportData.kpis?.emailsSent || 0}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* USER & ROLE ACTIVITY */}
            <div className="page-break">
              <h3 className="report-heading">User & Role Activity</h3>
              <p className="text-xs text-muted-foreground mb-2">Comprehensive activity breakdown for all registered platform users during the reporting period.</p>
              
              <table className="report-table">
                <thead>
                  <tr>
                    <th>User</th>
                    <th>Role</th>
                    <th>Logins</th>
                    <th>Docs Up.</th>
                    <th>Searches</th>
                    <th>Workflow</th>
                    <th>Approvals</th>
                    <th>Security Evts</th>
                    <th>Last Active</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {reportData.userList?.map((u: any, i: number) => (
                    <tr key={i}>
                      <td>
                        <div className="font-semibold text-foreground">{u.name}</div>
                        <div className="text-[9px] text-muted-foreground">{u.email}</div>
                      </td>
                      <td>{u.role}</td>
                      <td className="text-center">{u.logins || 0}</td>
                      <td className="text-center">{u.docsUploaded || 0}</td>
                      <td className="text-center">{u.patentSearches || 0}</td>
                      <td className="text-center">{u.workflowActions || 0}</td>
                      <td className="text-center text-emerald-500">{u.approvals || 0}</td>
                      <td className={`text-center ${u.securityEvents > 0 ? 'text-red-500 font-bold' : ''}`}>{u.securityEvents || 0}</td>
                      <td>{u.lastActivity ? new Date(u.lastActivity).toLocaleDateString() : 'Never'}</td>
                      <td>
                        <span className={`px-1.5 py-0.5 rounded text-[9px] ${u.status === 'Active' ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' : 'bg-red-500/10 text-red-500 border border-red-500/20'}`}>
                          {u.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* COMPLETE TIMELINE */}
            <div className="page-break">
              <h3 className="report-heading">Complete User Activity Timeline</h3>
              <p className="text-xs text-muted-foreground mb-2">Chronological record of all authentication, document, patent, and workflow activities.</p>
              <table className="report-table">
                <thead>
                  <tr>
                    <th className="w-[110px]">Timestamp</th>
                    <th>User / Role</th>
                    <th>Action</th>
                    <th>Module</th>
                    <th className="w-[30%]">Details</th>
                    <th>Status</th>
                    <th>IP Address</th>
                  </tr>
                </thead>
                <tbody>
                  {reportData.timeline?.length === 0 && (
                    <tr><td colSpan={7} className="text-center py-4 text-muted-foreground">No activity recorded for this period.</td></tr>
                  )}
                  {reportData.timeline?.slice(0, 300).map((t: any, i: number) => (
                    <tr key={i}>
                      <td className="whitespace-nowrap">{new Date(t.timestamp).toLocaleString()}</td>
                      <td>
                        <div className="font-semibold text-foreground">{t.user}</div>
                        <div className="text-[9px] text-muted-foreground">{t.role}</div>
                      </td>
                      <td className="font-mono text-[9px] uppercase">{t.action}</td>
                      <td>{t.activityType}</td>
                      <td className="truncate max-w-[200px]" title={t.detail}>{t.detail}</td>
                      <td className={t.status === 'SUCCESS' ? 'status-success' : t.status === 'FAILED' ? 'status-failed' : t.status === 'WARNING' ? 'status-warning' : ''}>
                        {t.status}
                      </td>
                      <td className="text-[9px] font-mono">{t.ip}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {reportData.timeline?.length > 300 && (
                <div className="text-center text-xs text-muted-foreground italic mt-2">
                  * Timeline truncated to latest 300 records for PDF layout. Export CSV for full {reportData.totalTimelineEvents} records.
                </div>
              )}
            </div>

            {/* PATENT & DOCUMENT ACTIVITY */}
            <div className="page-break">
              <h3 className="report-heading">Document Activity</h3>
              <p className="text-xs text-muted-foreground mb-2">Record of documents uploaded and processed within the platform.</p>
              <table className="report-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th className="w-[40%]">Document Name</th>
                    <th>Uploaded By</th>
                    <th>Role</th>
                    <th>Type</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {reportData.documentList?.length === 0 && (
                    <tr><td colSpan={6} className="text-center py-4 text-muted-foreground">No documents uploaded in this period.</td></tr>
                  )}
                  {reportData.documentList?.map((d: any, i: number) => (
                    <tr key={i}>
                      <td className="whitespace-nowrap">{new Date(d.createdAt).toLocaleDateString()}</td>
                      <td className="font-semibold text-foreground">{d.title}</td>
                      <td>{d.uploadedBy}</td>
                      <td>{d.uploadedByRole}</td>
                      <td>{d.type}</td>
                      <td>{d.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* WORKFLOW ACTIVITY */}
            <div className="page-break">
              <h3 className="report-heading">Workflow & Approvals</h3>
              <table className="report-table">
                <thead>
                  <tr>
                    <th>Timestamp</th>
                    <th>Project / Resource</th>
                    <th>Transition</th>
                    <th>Performed By</th>
                    <th className="w-[30%]">Comments</th>
                  </tr>
                </thead>
                <tbody>
                  {reportData.workflowTimeline?.length === 0 && (
                    <tr><td colSpan={5} className="text-center py-4 text-muted-foreground">No workflow transitions recorded.</td></tr>
                  )}
                  {reportData.workflowTimeline?.map((w: any, i: number) => (
                    <tr key={i}>
                      <td className="whitespace-nowrap">{new Date(w.timestamp).toLocaleString()}</td>
                      <td className="font-semibold text-foreground">{w.project}</td>
                      <td>
                        <span className="text-muted-foreground">{w.fromStatus}</span> <br/>
                        <span className="font-bold text-foreground">→ {w.toStatus}</span>
                      </td>
                      <td>
                        <div>{w.changedBy}</div>
                        <div className="text-[9px] text-muted-foreground">{w.changedByRole}</div>
                      </td>
                      <td className="italic text-muted-foreground">{w.comment}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* COMMUNICATIONS */}
            <div className="page-break">
              <h3 className="report-heading">Communication & Notifications</h3>
              <table className="report-table">
                <thead>
                  <tr>
                    <th>Timestamp</th>
                    <th>Type</th>
                    <th>Recipient</th>
                    <th>Role</th>
                    <th className="w-[40%]">Message / Subject</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {reportData.notificationList?.slice(0, 50).map((n: any, i: number) => (
                    <tr key={i}>
                      <td className="whitespace-nowrap">{new Date(n.timestamp).toLocaleString()}</td>
                      <td>{n.type}</td>
                      <td>{n.receiver}</td>
                      <td>{n.receiverRole}</td>
                      <td>{n.message}</td>
                      <td className={n.isRead ? 'text-emerald-500' : 'text-muted-foreground'}>{n.isRead ? 'Read' : 'Unread'}</td>
                    </tr>
                  ))}
                  {reportData.emailList?.slice(0, 50).map((e: any, i: number) => (
                    <tr key={`e-${i}`}>
                      <td className="whitespace-nowrap">{new Date(e.timestamp).toLocaleString()}</td>
                      <td>Email: {e.type}</td>
                      <td>{e.to}</td>
                      <td>-</td>
                      <td>{e.subject}</td>
                      <td className={e.status === 'Sent' ? 'text-emerald-500' : 'text-red-500'}>{e.status}</td>
                    </tr>
                  ))}
                  {(!reportData.notificationList?.length && !reportData.emailList?.length) && (
                     <tr><td colSpan={6} className="text-center py-4 text-muted-foreground">No communications recorded.</td></tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* SECURITY ACTIVITY - Extracted from Timeline */}
            <div className="page-break">
              <h3 className="report-heading">Security Activity</h3>
              <table className="report-table border-red-500/20">
                <thead className="bg-red-500/10 text-red-500">
                  <tr>
                    <th>Timestamp</th>
                    <th>User</th>
                    <th>Event</th>
                    <th>IP Address</th>
                    <th>Detail / Reason</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {reportData.timeline?.filter((t: any) => t.activityType === 'Security' || t.status === 'FAILED').length === 0 && (
                    <tr><td colSpan={6} className="text-center py-4 text-muted-foreground">No security events recorded.</td></tr>
                  )}
                  {reportData.timeline?.filter((t: any) => t.activityType === 'Security' || t.status === 'FAILED').map((t: any, i: number) => (
                    <tr key={i} className={t.status === 'FAILED' ? 'bg-red-500/5' : ''}>
                      <td className="whitespace-nowrap">{new Date(t.timestamp).toLocaleString()}</td>
                      <td>{t.user} <br/><span className="text-[9px] text-muted-foreground">{t.role}</span></td>
                      <td className="font-mono text-[9px]">{t.action}</td>
                      <td className="font-mono text-[9px]">{t.ip}</td>
                      <td>{t.detail}</td>
                      <td className={t.status === 'SUCCESS' ? 'status-success' : 'status-failed'}>{t.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* FINAL OVERALL SUMMARY & KEY OBSERVATIONS */}
            <div className="page-break">
              <h3 className="report-heading">Key Observations</h3>
              {isEditing ? (
                <Textarea 
                  value={editableContent.observations}
                  onChange={e => setEditableContent({...editableContent, observations: e.target.value})}
                  className="min-h-[200px] text-sm font-mono"
                />
              ) : (
                <ul className="list-disc pl-6 space-y-2 text-sm text-foreground/90 report-text">
                  {editableContent.observations.split('\n').filter((o: string) => o.trim()).map((obs: string, idx: number) => (
                    <li key={idx}>{obs}</li>
                  ))}
                  {editableContent.observations.trim() === "" && (
                    <li className="text-muted-foreground italic">No key observations available.</li>
                  )}
                </ul>
              )}

              <div className="mt-20 border-t border-border pt-6 flex justify-between text-xs text-muted-foreground">
                <div>Confidential - Internal Use Only</div>
                <div>MOAT Enterprise Activity Engine v2.1</div>
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
