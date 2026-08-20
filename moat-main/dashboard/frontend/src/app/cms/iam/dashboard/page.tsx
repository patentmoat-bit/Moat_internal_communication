"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ShieldAlert, Users, Lock, Activity, CheckCircle, Shield, Loader2 } from "lucide-react";
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

function getRelativeTime(dateString: string) {
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  if (diffInSeconds < 60) return "Just now";
  const diffInMins = Math.floor(diffInSeconds / 60);
  if (diffInMins < 60) return `${diffInMins} min${diffInMins !== 1 ? 's' : ''} ago`;
  const diffInHours = Math.floor(diffInMins / 60);
  if (diffInHours < 24) return `${diffInHours} hour${diffInHours !== 1 ? 's' : ''} ago`;
  const diffInDays = Math.floor(diffInHours / 24);
  return `${diffInDays} day${diffInDays !== 1 ? 's' : ''} ago`;
}

export default function SecurityDashboardPage() {
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState({
    totalUsers: 0,
    lockedAccounts: 0,
    mfaAdoption: 0,
    activeSessions: 0
  });
  const [events, setEvents] = useState<any[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch("/api/iam/dashboard");
        const data = await res.json();
        if (data.metrics) setMetrics(data.metrics);
        if (data.recentEvents) setEvents(data.recentEvents);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();

    const supabase = createClient();
    const channel = supabase
      .channel('iam_dashboard_changes')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'audit_logs' }, () => {
        fetchData();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'user_sessions' }, () => {
        fetchData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const getEventIcon = (event: string) => {
    if (event.includes("FAILED") || event.includes("LOCKED")) return { icon: ShieldAlert, color: "text-red-500 dark:text-red-400" };
    if (event.includes("SUCCESS") || event.includes("VERIFIED")) return { icon: CheckCircle, color: "text-green-600 dark:text-green-400" };
    return { icon: Shield, color: "text-[#c9a84c]" };
  };

  if (loading) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#c9a84c]" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-foreground">Security Dashboard</h2>
        <p className="text-muted-foreground mt-2">
          Overview of enterprise Identity & Access Management (IAM) metrics.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-card border-border shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Users</CardTitle>
            <Users className="h-4 w-4 text-[#c9a84c]" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{metrics.totalUsers}</div>
            <p className="text-xs text-muted-foreground mt-1">Total provisioned accounts</p>
          </CardContent>
        </Card>
        
        <Card className="bg-card border-border shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Locked Accounts</CardTitle>
            <Lock className="h-4 w-4 text-red-500 dark:text-red-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{metrics.lockedAccounts}</div>
            <p className="text-xs text-red-500/80 dark:text-red-400/80 mt-1">Requires admin review</p>
          </CardContent>
        </Card>

        <Card className="bg-card border-border shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">MFA Adoption</CardTitle>
            <Shield className="h-4 w-4 text-[#c9a84c]" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{metrics.mfaAdoption}%</div>
            <p className="text-xs text-muted-foreground mt-1">Target: 100%</p>
          </CardContent>
        </Card>

        <Card className="bg-card border-border shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Active Sessions</CardTitle>
            <Activity className="h-4 w-4 text-[#c9a84c]" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{metrics.activeSessions}</div>
            <p className="text-xs text-muted-foreground mt-1">Valid access tokens</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="bg-card border-border shadow-sm">
          <CardHeader>
            <CardTitle className="text-foreground">Recent Security Events</CardTitle>
            <CardDescription className="text-muted-foreground">Live feed of security-related actions.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2 scrollbar-hide">
              {events.length === 0 ? (
                <div className="text-sm text-muted-foreground py-4 text-center">No recent security events found.</div>
              ) : (
                events.map((log, i) => {
                  const style = getEventIcon(log.event);
                  const Icon = style.icon;
                  return (
                    <div key={i} className="flex items-center gap-4">
                      <div className={`p-2 rounded-full bg-muted ${style.color}`}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{log.event}</p>
                        <p className="text-xs text-muted-foreground truncate">{log.user}</p>
                      </div>
                      <div className="text-xs text-muted-foreground shrink-0">{getRelativeTime(log.time)}</div>
                    </div>
                  );
                })
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border shadow-sm">
          <CardHeader>
            <CardTitle className="text-foreground">System Health</CardTitle>
            <CardDescription className="text-muted-foreground">IAM services status.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center border-b border-border pb-2">
                <span className="text-sm text-muted-foreground">Authentication API</span>
                <span className="text-xs font-bold text-green-700 dark:text-green-400 bg-green-500/10 px-2 py-1 rounded">Operational</span>
              </div>
              <div className="flex justify-between items-center border-b border-border pb-2">
                <span className="text-sm text-muted-foreground">MFA Provider</span>
                <span className="text-xs font-bold text-green-700 dark:text-green-400 bg-green-500/10 px-2 py-1 rounded">Operational</span>
              </div>
              <div className="flex justify-between items-center pb-2">
                <span className="text-sm text-muted-foreground">Audit Logging</span>
                <span className="text-xs font-bold text-green-700 dark:text-green-400 bg-green-500/10 px-2 py-1 rounded">Operational</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
