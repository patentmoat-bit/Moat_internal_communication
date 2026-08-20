"use client";

import { useEffect, useState } from "react";
import { Users, Lock, KeyRound, ShieldAlert, Activity, RefreshCw, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function IAMOverview() {
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const fetchData = async () => {
      try {
        const res = await fetch("/api/dashboard/iam");
        const json = await res.json();
        if (mounted && json.data) {
          setData(json.data);
        }
      } catch (err) {
        console.error("Failed to fetch IAM data", err);
      } finally {
        if (mounted) setIsLoading(false);
      }
    };
    fetchData();
    return () => { mounted = false; };
  }, []);

  if (isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center text-muted-foreground">
        <Loader2 className="h-8 w-8 animate-spin text-[#c9a84c]" />
      </div>
    );
  }

  const overviewStats = [
    { title: "Total Users", value: data?.totalUsers?.toLocaleString() || "0", trend: "Real-time", icon: Users, color: "text-blue-500", bg: "bg-blue-500/10" },
    { title: "Active Sessions", value: data?.activeSessions?.toLocaleString() || "0", trend: "Live", icon: Activity, color: "text-emerald-500", bg: "bg-emerald-500/10" },
    { title: "Locked Accounts", value: data?.lockedAccounts?.toLocaleString() || "0", trend: "Current", icon: Lock, color: "text-rose-500", bg: "bg-rose-500/10" },
    { title: "MFA Adoption", value: data?.mfaAdoption || "0%", trend: "Enforced", icon: ShieldAlert, color: "text-violet-500", bg: "bg-violet-500/10" },
    { title: "OAuth Status", value: data?.oauthStatus || "N/A", trend: "Entra ID", icon: KeyRound, color: "text-[#c9a84c]", bg: "bg-[#c9a84c]/10" },
    { title: "Expired Tokens", value: data?.expiredTokens?.toLocaleString() || "0", trend: "Past 24h", icon: RefreshCw, color: "text-orange-500", bg: "bg-orange-500/10" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Authentication Overview</h2>
          <p className="text-muted-foreground mt-1 text-sm">
            High-level metrics for platform identity and access security.
          </p>
        </div>
        <Button className="bg-[#c9a84c] hover:bg-[#b8943d] text-black font-semibold">
          <Activity className="w-4 h-4 mr-2" />
          View Live Logs
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {overviewStats.map((stat, idx) => {
          const Icon = stat.icon;
          return (
            <motion.div
              key={stat.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1, duration: 0.4 }}
            >
              <Card className="hover:border-[#c9a84c]/50 transition-colors shadow-sm overflow-hidden group h-full">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    {stat.title}
                  </CardTitle>
                  <div className={`p-2 rounded-lg ${stat.bg} ${stat.color} group-hover:scale-110 transition-transform`}>
                    <Icon className="w-4 h-4" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-black">{stat.value}</div>
                  <p className={`text-xs mt-2 font-semibold ${stat.trend.includes("-") ? "text-rose-500" : "text-emerald-500"}`}>
                    {stat.trend}
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
        <Card className="border-border shadow-sm">
          <CardHeader>
            <CardTitle>Recent Authentication Events</CardTitle>
            <CardDescription>Live feed of system logins and token refreshes.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {data?.recentAuthEvents?.length > 0 ? (
                data.recentAuthEvents.map((evt: any) => (
                  <div key={evt.id} className="flex items-center justify-between p-3 rounded-xl bg-muted/30 border border-border">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center shrink-0">
                        <Users className="w-4 h-4 text-blue-500" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold truncate">{evt.user}</p>
                        <p className="text-xs text-muted-foreground truncate">{evt.event}</p>
                      </div>
                    </div>
                    <span className="text-xs text-muted-foreground font-medium shrink-0 ml-2">{evt.time}</span>
                  </div>
                ))
              ) : (
                <div className="text-center p-4 text-sm text-muted-foreground">No recent authentication events found.</div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="border-border shadow-sm">
          <CardHeader>
            <CardTitle>Security Alerts</CardTitle>
            <CardDescription>Anomalies requiring administrative attention.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {data?.securityAlerts?.length > 0 ? (
                data.securityAlerts.map((alert: any) => (
                  <div key={alert.id} className={`flex items-center justify-between p-3 rounded-xl border ${alert.severity === "Critical" ? "bg-rose-500/10 border-rose-500/20" : "bg-orange-500/10 border-orange-500/20"}`}>
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${alert.severity === "Critical" ? "bg-rose-500/20" : "bg-orange-500/20"}`}>
                        {alert.severity === "Critical" ? <Lock className="w-4 h-4 text-rose-500" /> : <ShieldAlert className="w-4 h-4 text-orange-500" />}
                      </div>
                      <div className="min-w-0 pr-4">
                        <p className={`text-sm font-semibold truncate ${alert.severity === "Critical" ? "text-rose-500" : "text-orange-500"}`}>{alert.title}</p>
                        <p className={`text-xs truncate ${alert.severity === "Critical" ? "text-rose-500/80" : "text-orange-500/80"}`}>{alert.details}</p>
                      </div>
                    </div>
                    <Button variant="outline" size="sm" className={`text-xs shrink-0 ${alert.severity === "Critical" ? "border-rose-500/30 text-rose-500 hover:bg-rose-500/20" : "border-orange-500/30 text-orange-500 hover:bg-orange-500/20"}`}>
                      Investigate
                    </Button>
                  </div>
                ))
              ) : (
                <div className="text-center p-4 text-sm text-emerald-500 bg-emerald-500/10 rounded-xl border border-emerald-500/20">
                  <ShieldAlert className="w-6 h-6 mx-auto mb-2 opacity-80" />
                  No security alerts detected.
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
