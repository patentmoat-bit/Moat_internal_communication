"use client";

import { useEffect, useState } from "react";
import { 
    Activity, Users, ShieldAlert, FileText, CheckCircle, 
    AlertTriangle, Server, Mail, Bell, Lock, Clock, ShieldCheck, Check,
    AlertCircle, FileSearch, ArrowRight, Shield, HardDrive, 
    Database, Network, Key, FolderOpen, Loader2, RefreshCw
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Legend } from "recharts";
import { useToast } from "@/components/ui/toast";

export function AdminControlCenter() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [realtimeStatus, setRealtimeStatus] = useState<"Live" | "Reconnecting...">("Reconnecting...");
  const [streamFilter, setStreamFilter] = useState<"ALL" | "WORKFLOW" | "SECURITY" | "DOCUMENTS" | "ADMIN">("WORKFLOW");
  const { toast } = useToast();

  const fetchData = async () => {
    try {
      const res = await fetch("/api/dashboard/admin/control-center");
      const json = await res.json();
      if (res.ok) {
        // Handle both `{ data: ... }` wrapper or flat response for backward compatibility
        setData(json.data || json);
      } else {
        throw new Error(json.error || "Failed to load data");
      }
    } catch (err: any) {
      console.error("Failed to fetch control center data:", err);
      toast({
        title: "Live Feed Sync Error",
        description: "Failed to pull the latest dashboard updates. The data stream may be unaligned.",
        variant: "destructive"
      });
      // We could set an error state here, but for now we'll just leave data as null
      // The render function will show an error state if loading is false and data is null
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    const supabase = createClient();
    const channel = supabase
      .channel('admin_control_center_realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'audit_logs' }, () => fetchData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'users' }, () => fetchData())
      .subscribe((status, err) => {
         if (status === 'SUBSCRIBED') {
             setRealtimeStatus("Live");
         } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
             setRealtimeStatus("Reconnecting...");
             toast({
                title: "Realtime Stream Broken",
                description: "The live data connection was interrupted. Attempting to reconnect...",
                variant: "destructive"
             });
         } else {
             setRealtimeStatus("Reconnecting...");
         }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  if (loading) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-10 w-10 animate-spin text-[#c9a84c]" />
          <p className="text-sm font-medium text-muted-foreground animate-pulse">Initializing Enterprise Control Center...</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <div className="flex flex-col items-center gap-4 text-center">
          <AlertCircle className="h-12 w-12 text-destructive" />
          <h3 className="text-lg font-bold">Failed to load Control Center</h3>
          <p className="text-sm text-muted-foreground max-w-md">There was a problem accessing the enterprise data. This could be due to permission restrictions or a network issue.</p>
          <button onClick={() => { setLoading(true); fetchData(); }} className="mt-4 px-4 py-2 bg-[#c9a84c] text-white rounded-md hover:bg-[#b09342] flex items-center gap-2">
             <RefreshCw className="h-4 w-4" /> Retry
          </button>
        </div>
      </div>
    );
  }

  const { kpis, workspaceActivity, patentWorkflows, documentActivity, securityRisk, notificationHealth, systemHealth, eventStream, attentionRequired, adminActions } = data;

  return (
    <div className="mx-auto max-w-[1600px] space-y-8 pb-20 px-4 sm:px-6 lg:px-8">
      
      {/* ========================================================= */}
      {/* 1. TOP HEADER */}
      {/* ========================================================= */}
      <div className="pt-6 pb-4 border-b border-border/40">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Badge variant="outline" className="border-[#c9a84c]/40 bg-[#c9a84c]/10 text-[#c9a84c] font-semibold">
                Admin Workspace
              </Badge>
            </div>
            <h1 className="text-3xl font-bold tracking-tight">Enterprise Control Center</h1>
            <p className="text-muted-foreground mt-1 text-sm max-w-2xl">
              Monitor users, security, workflows and platform activity in real time.
            </p>
          </div>
          <div className="flex items-center gap-4 text-sm bg-muted/30 px-4 py-2 rounded-lg border border-border/50">
             <div className="flex items-center gap-2">
                <span className="text-muted-foreground">System Status:</span>
                <span className="font-semibold text-emerald-500">Healthy</span>
             </div>
             <div className="w-px h-4 bg-border"></div>
             <div className="flex items-center gap-2">
                <span className={cn("flex h-2 w-2 rounded-full", realtimeStatus === "Live" ? "bg-emerald-500 animate-pulse" : "bg-amber-500")} />
                <span className="font-semibold">{realtimeStatus}</span>
             </div>
             <button 
                onClick={fetchData} 
                disabled={loading}
                className="ml-2 flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-background border border-border/50 hover:bg-muted text-foreground rounded-md transition-colors disabled:opacity-50"
             >
                <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
                Refresh
             </button>
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 2. LIVE OVERVIEW CARDS */}
      {/* ========================================================= */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        
        {/* CARD 1 - USERS */}
        <Link href="/dashboard/settings/users">
            <Card className="hover:border-[#c9a84c]/50 transition-colors h-full">
            <CardHeader className="py-3 pb-0 border-b border-border/40 bg-muted/20">
                <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
                USERS <Users className="h-3 w-3" />
                </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-2">
                <p className="text-3xl font-bold">{kpis.users.total}</p>
                <div className="text-xs text-muted-foreground flex justify-between">
                   <span>Online now:</span> <span className="font-medium text-foreground">{kpis.users.online}</span>
                </div>
                <div className="text-xs text-muted-foreground flex justify-between">
                   <span>Active this week:</span> <span className="font-medium text-foreground">{kpis.users.active}</span>
                </div>
            </CardContent>
            </Card>
        </Link>

        {/* CARD 2 - AUTHENTICATION */}
        <Link href="/dashboard/admin/audit-logs">
            <Card className="hover:border-[#c9a84c]/50 transition-colors h-full">
            <CardHeader className="py-3 pb-0 border-b border-border/40 bg-muted/20">
                <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
                AUTHENTICATION <ShieldCheck className="h-3 w-3" />
                </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-2">
                <p className="text-3xl font-bold text-emerald-500">{kpis.auth.successful}</p>
                <div className="text-xs text-muted-foreground flex justify-between">
                   <span>Failed Logins:</span> <span className={cn("font-medium", kpis.auth.failed > 0 ? "text-red-500" : "text-foreground")}>{kpis.auth.failed}</span>
                </div>
                <div className="text-xs text-muted-foreground flex justify-between">
                   <span>Locked Accounts:</span> <span className={cn("font-medium", kpis.auth.locked > 0 ? "text-red-500" : "text-foreground")}>{kpis.auth.locked}</span>
                </div>
            </CardContent>
            </Card>
        </Link>

        {/* CARD 3 - MFA SECURITY */}
        <Link href="/cms/iam/mfa-settings">
            <Card className="hover:border-[#c9a84c]/50 transition-colors h-full">
            <CardHeader className="py-3 pb-0 border-b border-border/40 bg-muted/20">
                <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
                MFA SECURITY <Key className="h-3 w-3" />
                </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-2">
                <p className="text-3xl font-bold">{kpis.mfa.enabled}</p>
                <div className="text-xs text-muted-foreground flex justify-between">
                   <span>MFA Pending:</span> <span className="font-medium text-foreground">{kpis.mfa.pending}</span>
                </div>
                <div className="text-xs text-muted-foreground flex justify-between">
                   <span>MFA Failures:</span> <span className={cn("font-medium", kpis.mfa.failures > 0 ? "text-red-500" : "text-foreground")}>{kpis.mfa.failures}</span>
                </div>
            </CardContent>
            </Card>
        </Link>

        {/* CARD 4 - ACTIVE SESSIONS */}
        <Link href="/cms/iam/sessions">
            <Card className="hover:border-[#c9a84c]/50 transition-colors h-full">
            <CardHeader className="py-3 pb-0 border-b border-border/40 bg-muted/20">
                <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
                ACTIVE SESSIONS <Network className="h-3 w-3" />
                </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-2">
                <p className="text-3xl font-bold">{kpis.sessions.active}</p>
                <div className="text-xs text-muted-foreground flex justify-between">
                   <span>Recently Expired:</span> <span className="font-medium text-foreground">{kpis.sessions.expired}</span>
                </div>
                <div className="text-xs text-muted-foreground flex justify-between">
                   <span>Recently Revoked:</span> <span className="font-medium text-foreground">{kpis.sessions.revoked}</span>
                </div>
            </CardContent>
            </Card>
        </Link>

        {/* CARD 5 - SECURITY */}
        <Link href="/dashboard/admin/security">
            <Card className="hover:border-red-500/50 transition-colors h-full border-red-500/20 bg-red-500/5">
            <CardHeader className="py-3 pb-0 border-b border-red-500/10">
                <CardTitle className="text-xs font-semibold uppercase tracking-wider text-red-600 dark:text-red-400 flex items-center justify-between">
                SECURITY ALERTS <ShieldAlert className="h-3 w-3" />
                </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-2">
                <p className="text-3xl font-bold text-red-600 dark:text-red-400">{kpis.security.openAlerts}</p>
                <div className="text-xs text-muted-foreground flex justify-between">
                   <span>BOLA / IDOR Denials:</span> <span className={cn("font-medium", kpis.security.bolaDenials > 0 ? "text-red-600" : "text-foreground")}>{kpis.security.bolaDenials}</span>
                </div>
                <div className="text-xs text-muted-foreground flex justify-between">
                   <span>Rate Limits:</span> <span className={cn("font-medium", kpis.security.rateLimits > 0 ? "text-red-600" : "text-foreground")}>{kpis.security.rateLimits}</span>
                </div>
            </CardContent>
            </Card>
        </Link>

        {/* CARD 6 - WORKFLOW */}
        <Link href="/dashboard/admin/reports">
            <Card className="hover:border-[#c9a84c]/50 transition-colors h-full">
            <CardHeader className="py-3 pb-0 border-b border-border/40 bg-muted/20">
                <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
                WORKFLOW <FolderOpen className="h-3 w-3" />
                </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-2">
                <p className="text-3xl font-bold text-blue-500">{kpis.workflow.activeProjects}</p>
                <div className="text-xs text-muted-foreground flex justify-between">
                   <span>Pending Reviews:</span> <span className="font-medium text-foreground">{kpis.workflow.pendingReviews}</span>
                </div>
                <div className="text-xs text-muted-foreground flex justify-between">
                   <span>Pending Approvals:</span> <span className="font-medium text-foreground">{kpis.workflow.pendingApprovals}</span>
                </div>
            </CardContent>
            </Card>
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* ========================================================= */}
        {/* MAIN COLUMN (Left 2/3) */}
        {/* ========================================================= */}
        <div className="col-span-1 lg:col-span-2 space-y-6">
          
          {/* USER MANAGEMENT & ROLES (Split) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="border-border/60">
                <CardHeader className="py-4 border-b border-border/40 flex flex-row items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Users className="h-4 w-4 text-[#c9a84c]" /> User Management
                  </CardTitle>
                  <Link href="/dashboard/settings/users" className="text-xs text-muted-foreground hover:text-foreground">View Users →</Link>
                </CardHeader>
                <CardContent className="p-4">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between text-sm">
                       <span className="text-muted-foreground">Total Users</span>
                       <span className="font-medium">{kpis.users.total}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                       <span className="text-muted-foreground">Active Users</span>
                       <span className="font-medium text-emerald-500">{kpis.users.active}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm pt-2 border-t border-border/40">
                       <span className="text-muted-foreground">Active Organizations</span>
                       <span className="font-medium">{data.domainStats?.activeOrganizations || 0}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                       <span className="text-muted-foreground">Blocked Domain Auth</span>
                       <span className={cn("font-medium", (kpis.security?.blockedDomainAttempts || 0) > 0 ? "text-red-500" : "text-foreground")}>{kpis.security?.blockedDomainAttempts || 0}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                       <span className="text-muted-foreground">Privileged Admins</span>
                       <span className="font-medium text-purple-500">{kpis.users.privileged || 0}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                       <span className="text-muted-foreground">High Risk Access</span>
                       <span className={cn("font-medium", (kpis.users.highRisk || 0) > 0 ? "text-red-500" : "text-emerald-500")}>{kpis.users.highRisk || 0}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm pt-2 border-t border-border/40">
                       <span className="text-muted-foreground">Recent Permission Drift</span>
                       <span className="font-medium">{kpis.users.permissionDrift || 0} events</span>
                    </div>
                  </div>
                </CardContent>
             </Card>

             <Card className="border-border/60">
                <CardHeader className="py-4 border-b border-border/40 flex flex-row items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Shield className="h-4 w-4 text-[#c9a84c]" /> Roles & Permissions
                  </CardTitle>
                  <Link href="/dashboard/settings/access-review" className="text-xs text-muted-foreground hover:text-foreground">Access Review →</Link>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="divide-y divide-border/40 max-h-[150px] overflow-y-auto custom-scrollbar">
                    {Object.entries(workspaceActivity).map(([role, stats]: [string, any]) => (
                        <div key={role} className="p-3 flex items-center justify-between text-sm hover:bg-muted/10">
                           <span className="font-medium">{role.replace(/([A-Z])/g, ' $1').trim()}</span>
                           <span className="text-muted-foreground">{stats.totalUsers} users</span>
                        </div>
                    ))}
                  </div>
                </CardContent>
             </Card>
          </div>

          {/* PATENT WORKFLOW STATUS */}
          <Card className="border-border/60">
             <CardHeader className="py-4 border-b border-border/40 flex flex-row items-center justify-between bg-muted/10">
                <CardTitle className="text-base flex items-center gap-2">
                  <Activity className="h-4 w-4 text-[#c9a84c]" /> Patent Workflow Status
                </CardTitle>
                <Link href="/dashboard/admin/reports" className="text-xs text-muted-foreground hover:text-foreground">Generate Report →</Link>
             </CardHeader>
             <CardContent className="p-6">
                <div className="grid grid-cols-3 md:grid-cols-5 gap-4">
                   {Object.entries(kpis.workflowStages).map(([stage, count]: [string, any]) => (
                      <div key={stage} className="flex flex-col items-center justify-center p-3 bg-muted/20 rounded-lg border border-border/30">
                         <span className="text-2xl font-bold">{count}</span>
                         <span className="text-[10px] uppercase tracking-wider text-muted-foreground mt-1 text-center">{stage.replace(/([A-Z])/g, ' $1').trim()}</span>
                      </div>
                   ))}
                </div>
             </CardContent>
          </Card>

          {/* DOCUMENT ACTIVITY */}
          <Card className="border-border/60">
            <CardHeader className="py-4 border-b border-border/40 flex flex-row items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="h-4 w-4 text-[#c9a84c]" /> Document Activity
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-border/40">
                {documentActivity.map((event: any) => (
                  <div key={event.id} className="p-4 flex items-start gap-4 hover:bg-muted/10 transition-colors">
                    <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <FileText className="h-4 w-4 text-blue-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{event.user}</span>
                        <Badge variant="outline" className="text-[10px]">{event.role}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        <span className="font-medium text-foreground">{event.action.replace(/_/g, " ")}</span>
                      </p>
                    </div>
                    <div className="text-xs text-muted-foreground whitespace-nowrap">
                      {new Date(event.timestamp).toLocaleTimeString()}
                    </div>
                  </div>
                ))}
                {documentActivity.length === 0 && (
                   <div className="p-8 text-center text-muted-foreground text-sm">No recent document activity.</div>
                )}
              </div>
            </CardContent>
          </Card>

        </div>

        {/* ========================================================= */}
        {/* RIGHT COLUMN (Right 1/3) */}
        {/* ========================================================= */}
        <div className="space-y-6">
          
          {/* ADMIN ATTENTION REQUIRED */}
          {attentionRequired.length > 0 && (
            <Card className="border-red-500/30 shadow-sm shadow-red-500/10">
              <CardHeader className="py-4 border-b border-red-500/20 bg-red-500/5 flex flex-row justify-between items-center">
                <CardTitle className="text-base flex items-center gap-2 text-red-600 dark:text-red-400">
                  <AlertTriangle className="h-4 w-4" /> Admin Attention Required
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y divide-red-500/10">
                  {attentionRequired.map((alert: any) => (
                    <div key={alert.id} className="p-4 bg-red-500/5 flex items-start gap-3">
                      <div className="flex-1">
                        <Badge variant="outline" className="mb-1 text-[9px] font-bold border-red-500/40 text-red-600">{alert.level}</Badge>
                        <p className="text-sm font-semibold">{alert.title}</p>
                      </div>
                      <Link href={alert.link} className="text-xs font-semibold text-red-600 hover:underline whitespace-nowrap flex items-center gap-1 mt-1">
                        {alert.action} <ArrowRight className="h-3 w-3" />
                      </Link>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* RECENT ADMIN ACTIVITY */}
          <Card className="border-border/60 shadow-sm overflow-hidden">
             <CardHeader className="py-4 border-b border-border/40 bg-muted/10 flex flex-row items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-[#c9a84c]" /> Recent Admin Activity
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0 max-h-[300px] overflow-y-auto custom-scrollbar">
               <div className="divide-y divide-border/40">
                 {adminActions.map((action: any) => (
                    <div key={action.id} className="p-3 text-sm flex items-start gap-3 hover:bg-muted/10 transition-colors">
                       <div className="w-2 h-2 rounded-full bg-[#c9a84c] mt-1.5 shrink-0" />
                       <div className="flex-1 min-w-0">
                           <p className="font-medium text-foreground leading-snug">
                              {action.user} <span className="text-muted-foreground font-normal">{action.action.replace(/_/g, " ").toLowerCase()}</span>
                           </p>
                           <p className="text-[10px] text-muted-foreground mt-0.5">{new Date(action.timestamp).toLocaleTimeString()} - {action.metadata?.resourceName || action.metadata?.resourceId || "System"}</p>
                       </div>
                    </div>
                 ))}
                 {adminActions.length === 0 && (
                    <div className="p-6 text-center text-muted-foreground text-xs">No recent admin activity</div>
                 )}
               </div>
            </CardContent>
          </Card>

          {/* SYSTEM HEALTH + BACKUP */}
          <Card className="border-border/60">
             <CardHeader className="py-4 border-b border-border/40 bg-muted/10 flex flex-row items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Server className="h-4 w-4 text-emerald-500" /> System Health
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
               {Object.entries(systemHealth).map(([service, status]: [string, any]) => (
                  <div key={service} className="flex items-center justify-between">
                     <span className="text-sm font-medium capitalize">{service}</span>
                     <Badge variant="outline" className={cn("text-[10px]", status === "Healthy" ? "border-emerald-500/30 text-emerald-600 bg-emerald-500/10" : "border-red-500/30 text-red-600 bg-red-500/10")}>
                        {status}
                     </Badge>
                  </div>
               ))}
               <div className="pt-4 mt-4 border-t border-border/40">
                  <div className="flex items-center justify-between">
                     <span className="text-sm font-medium flex items-center gap-2"><HardDrive className="h-3 w-3" /> Backups</span>
                     <Link href="/dashboard/admin/recovery" className="text-[10px] text-muted-foreground hover:underline">
                        {kpis.backupStatus}
                     </Link>
                  </div>
               </div>
            </CardContent>
          </Card>

          {/* COMMUNICATION HEALTH */}
          <Card className="border-border/60">
             <CardHeader className="py-4 border-b border-border/40 flex flex-row items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Mail className="h-4 w-4 text-[#c9a84c]" /> Communication Health
              </CardTitle>
              <Link href="/dashboard/admin/email-alerts" className="text-xs text-muted-foreground hover:text-foreground">Config →</Link>
            </CardHeader>
            <CardContent className="p-4">
               <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                     <span className="text-muted-foreground">Emails Sent</span>
                     <span className="font-medium text-emerald-500">{notificationHealth.sent}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                     <span className="text-muted-foreground">Emails Failed</span>
                     <span className={cn("font-medium", notificationHealth.failed > 0 ? "text-red-500" : "text-foreground")}>{notificationHealth.failed}</span>
                  </div>
               </div>
            </CardContent>
          </Card>

        </div>
      </div>

      {/* ========================================================= */}
      {/* 3. BOTTOM TIMELINE / AUDIT LOG */}
      {/* ========================================================= */}
      <Card className="border-border/60 overflow-hidden shadow-md">
        <CardHeader className="py-4 border-b border-border/40 bg-muted/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-[#c9a84c]" />
            <div>
              <CardTitle className="text-lg">Enterprise Activity Stream</CardTitle>
              <CardDescription>Real-time centralized tracking & health reporting</CardDescription>
            </div>
          </div>
          
          <div className="flex items-center gap-2 overflow-x-auto custom-scrollbar pb-2 sm:pb-0">
             <Button 
               variant={streamFilter === "ALL" ? "default" : "outline"} 
               size="sm" 
               onClick={() => setStreamFilter("ALL")}
               className={streamFilter === "ALL" ? "bg-[#c9a84c] text-black hover:bg-[#b8943d]" : ""}
             >
               All Events
             </Button>
             <Button 
               variant={streamFilter === "WORKFLOW" ? "default" : "outline"} 
               size="sm" 
               onClick={() => setStreamFilter("WORKFLOW")}
               className={streamFilter === "WORKFLOW" ? "bg-[#c9a84c] text-black hover:bg-[#b8943d]" : ""}
             >
               Project Workflow
             </Button>
             <Button 
               variant={streamFilter === "SECURITY" ? "default" : "outline"} 
               size="sm" 
               onClick={() => setStreamFilter("SECURITY")}
               className={streamFilter === "SECURITY" ? "bg-[#c9a84c] text-black hover:bg-[#b8943d]" : ""}
             >
               Security
             </Button>
             <Button 
               variant={streamFilter === "ADMIN" ? "default" : "outline"} 
               size="sm" 
               onClick={() => setStreamFilter("ADMIN")}
               className={streamFilter === "ADMIN" ? "bg-[#c9a84c] text-black hover:bg-[#b8943d]" : ""}
             >
               Admin Actions
             </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {/* Table Header */}
          <div className="grid grid-cols-12 gap-4 p-4 border-b border-border/40 bg-muted/5 text-xs font-semibold uppercase tracking-wider text-muted-foreground hidden md:grid">
            <div className="col-span-2">Timestamp</div>
            <div className="col-span-3">Actor</div>
            <div className="col-span-4">Event & Action</div>
            <div className="col-span-3">Status / Resource</div>
          </div>
          
          <div className="divide-y divide-border/40 max-h-[600px] overflow-y-auto custom-scrollbar">
            {eventStream
              .filter((event: any) => {
                const type = (event.eventType || "").toUpperCase();
                const isAuth = type.includes("LOGIN") || type.includes("LOGOUT") || type.includes("MFA");
                const isDanger = type.includes("FAIL") || type.includes("LOCK") || type.includes("VIOLATION");
                const isAdmin = event.role === "Admin" || event.role === "Super Admin";
                const isWorkflow = type.includes("RESEARCH") || type.includes("PROJECT") || type.includes("REPORT") || type.includes("REVIEW") || type.includes("DOCUMENT");
                
                if (streamFilter === "ALL") return true;
                if (streamFilter === "WORKFLOW") return isWorkflow;
                if (streamFilter === "SECURITY") return isAuth || isDanger;
                if (streamFilter === "ADMIN") return isAdmin;
                if (streamFilter === "DOCUMENTS") return type.includes("DOCUMENT") || type.includes("FILE");
                return true;
              })
              .map((event: any) => {
                const type = (event.eventType || "").toUpperCase();
                const isAuth = type.includes("LOGIN") || type.includes("LOGOUT") || type.includes("MFA");
                const isDanger = type.includes("FAIL") || type.includes("LOCK") || type.includes("VIOLATION");
                const isAdmin = event.role === "Admin";
                
                let Icon = Activity;
                let iconClass = "text-blue-500 bg-blue-500/10";
                
                if (isAuth) {
                    Icon = ShieldCheck;
                    iconClass = "text-emerald-500 bg-emerald-500/10";
                }
                if (isDanger) {
                    Icon = AlertCircle;
                    iconClass = "text-red-500 bg-red-500/10";
                }
                if (isAdmin && !isAuth && !isDanger) {
                    Icon = Shield;
                    iconClass = "text-purple-500 bg-purple-500/10";
                }

                return (
                <div key={event.id} className="grid grid-cols-1 md:grid-cols-12 gap-4 p-4 hover:bg-muted/10 transition-colors items-center">
                  <div className="md:col-span-2 text-xs text-muted-foreground font-mono">
                    {new Date(event.timestamp).toLocaleString()}
                  </div>
                  <div className="md:col-span-3 flex items-center gap-2">
                     <div className={cn("w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0", iconClass)}>
                        <Icon className="h-4 w-4" />
                     </div>
                     <div className="min-w-0">
                        <div className="font-semibold text-sm truncate">{event.user}</div>
                        <div className="text-[10px] text-muted-foreground uppercase">{event.role}</div>
                     </div>
                  </div>
                  <div className="md:col-span-4 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                          <Badge variant="outline" className="text-[9px] font-mono whitespace-nowrap bg-background">{type}</Badge>
                      </div>
                      <p className={cn("text-sm truncate", isDanger ? "text-red-500 font-medium" : "text-foreground")}>
                          {event.action.replace(/_/g, " ")}
                      </p>
                  </div>
                  <div className="md:col-span-3 text-xs text-muted-foreground truncate">
                      {event.metadata?.resourceId ? `ID: ${event.metadata.resourceId.split('-')[0]}` : (event.workspace || "System")}
                  </div>
                </div>
              );
            })}
            
            {eventStream.length === 0 && (
              <div className="p-12 text-center text-muted-foreground flex flex-col items-center">
                <FileSearch className="h-10 w-10 mb-3 opacity-20" />
                No events found matching the current filter.
              </div>
            )}
          </div>
        </CardContent>
      </Card>

    </div>
  );
}
