"use client";

import { useMemo, useState, useEffect } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getDashboardConfig } from "@/lib/enterpriseDashboardData";
import type { DashboardConfig } from "@/lib/dashboardEngine";
import { getRoleWorkspace, type EnterpriseRole } from "@/lib/roleIntelligence";
import { RoleNavBar } from "./RoleNavBar";
import { WidgetEngine } from "./WidgetEngine";
import { AIInsightPanel } from "./AIInsightPanel";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";

interface DashboardShellProps {
  role: EnterpriseRole;
}

export function DashboardShell({ role }: DashboardShellProps) {
  const baseConfig = useMemo(() => getDashboardConfig(role), [role]);
  const workspace = useMemo(() => getRoleWorkspace(role), [role]);

  const [liveConfig, setLiveConfig] = useState<DashboardConfig | null>(null);

  const fetchLiveDashboard = () => {
    if (role === "admin" && baseConfig) {
      fetch("/api/dashboard/admin")
        .then(res => res.json())
        .then(result => {
          if (result.data) {
            const live = result.data;
            const updatedConfig = JSON.parse(JSON.stringify(baseConfig)) as DashboardConfig;

            // Update KPIs
            if (updatedConfig.kpis) {
              const kpiUsers = updatedConfig.kpis.find(k => k.id === "k1");
              if (kpiUsers) kpiUsers.value = live.activeUsersCount;

              const kpiDrift = updatedConfig.kpis.find(k => k.id === "k2");
              if (kpiDrift) kpiDrift.value = live.permissionDriftCount;

              const kpiEvents = updatedConfig.kpis.find(k => k.id === "k3");
              if (kpiEvents) kpiEvents.value = live.auditEventsCount.toLocaleString();

              const kpiHealth = updatedConfig.kpis.find(k => k.id === "k4");
              if (kpiHealth) kpiHealth.value = `${live.systemHealth.toFixed(1)}%`;
            }

            // Update Gauges
            if (updatedConfig.gauges) {
              const gaugeHealth = updatedConfig.gauges.find(g => g.id === "g1");
              if (gaugeHealth) {
                 gaugeHealth.value = live.systemHealth;
                 gaugeHealth.label = `${live.systemHealth.toFixed(1)}%`;
              }
            }

            // Update Charts
            if (updatedConfig.charts) {
              const chartActivity = updatedConfig.charts.find(c => c.id === "c1");
              if (chartActivity && live.userActivity.length > 0) chartActivity.data = live.userActivity;

              const chartRoles = updatedConfig.charts.find(c => c.id === "c2");
              if (chartRoles && live.roleDistribution.length > 0) chartRoles.data = live.roleDistribution;

              const chartDaily = updatedConfig.charts.find(c => c.id === "c3");
              if (chartDaily && live.auditEventsDaily.length > 0) chartDaily.data = live.auditEventsDaily;
            }

            // Update Tables
            if (updatedConfig.tables) {
              const tableEvents = updatedConfig.tables.find(t => t.id === "tb1");
              if (tableEvents && live.recentSecurityEvents.length > 0) {
                tableEvents.rows = live.recentSecurityEvents;
              }
            }
            
            // Update Insights
            if (live.insights && live.insights.length > 0) {
               updatedConfig.insights = live.insights;
            }

            setLiveConfig(updatedConfig);
          }
        })
        .catch(err => console.error("Failed to load admin live data:", err));
    }
  };

  useEffect(() => {
    fetchLiveDashboard();
    
    if (role === "admin") {
      const supabase = createClient();
      
      const channel = supabase.channel('admin_dashboard_realtime')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'audit_logs' }, () => {
          fetchLiveDashboard();
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'users' }, () => {
          fetchLiveDashboard();
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'roles' }, () => {
          fetchLiveDashboard();
        })
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            console.log('Admin Dashboard real-time feed connected.');
          }
        });

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [role, baseConfig]);

  const config = liveConfig || baseConfig;

  if (!config) {
    return (
      <div className="flex items-center justify-center min-h-[400px] text-muted-foreground text-sm">
        Dashboard configuration for role "{role}" not found.
      </div>
    );
  }

  const { title, subtitle, badge, kpis, trends, charts, gauges, tables, insights, quickActions } = config;

  return (
    <div className="mx-auto max-w-7xl space-y-6 pb-14 px-4 sm:px-6 lg:px-8">
      {/* ── Header ──────────────────────────────────────────────── */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between pt-6">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="border-[#c9a84c]/40 bg-[#c9a84c]/10 text-[#c9a84c] font-semibold">
              {badge}
            </Badge>
            <Badge variant="outline" className="text-muted-foreground font-medium">
              Enterprise Dashboard
            </Badge>
          </div>
          <h1 className="mt-3 text-3xl font-black tracking-tight text-foreground">{title}</h1>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground/80 max-w-3xl">{subtitle}</p>
        </div>

        {/* Quick Actions (Dynamic Navigation Engine) */}
        {quickActions && quickActions.length > 0 && (
          <div className="flex flex-wrap gap-2 shrink-0">
            {quickActions.map((action, idx) => (
              <Button
                key={idx}
                asChild
                variant={idx === 0 ? "default" : "outline"}
                className={cn(
                  "gap-2 text-xs font-semibold",
                  idx === 0
                    ? "bg-[#c9a84c] hover:bg-[#b8943d] text-black"
                    : "border-border hover:bg-[#c9a84c]/10 hover:border-[#c9a84c]/40 hover:text-[#c9a84c]"
                )}
              >
                <Link href={action.href}>
                  {action.label}
                </Link>
              </Button>
            ))}
          </div>
        )}
      </div>

      {/* ── Sub-Navigation ──────────────────────────────────────── */}
      <RoleNavBar role={role} />

      {/* ── KPI Widgets Grid (Row 1) ──────────────────────────────── */}
      {kpis && kpis.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {kpis.map((kpi) => (
            <WidgetEngine key={kpi.id} widget={kpi} />
          ))}
        </div>
      )}

      {/* ── Main Dashboard Layout Grid (Row 2) ────────────────────── */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Side: Charts and Tables (2 Columns) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Dynamic Charts Grid */}
          {charts && charts.length > 0 && (
            <div className="grid gap-4 md:grid-cols-2">
              {charts.map((chart) => {
                const isFullWidth = chart.colSpan === 2;
                return (
                  <div key={chart.id} className={isFullWidth ? "md:col-span-2" : ""}>
                    <WidgetEngine widget={chart} />
                  </div>
                );
              })}
            </div>
          )}

          {/* Tables Section */}
          {tables && tables.length > 0 && (
            <div className="space-y-4">
              {tables.map((table) => (
                <div key={table.id}>
                  <WidgetEngine widget={table} />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Side: AI Insights Panel & Secondary Metrics (Gauges/Trends) */}
        <div className="space-y-6">
          {/* AI Insight Panel System */}
          <AIInsightPanel insights={insights} />

          {/* Gauges Grid */}
          {gauges && gauges.length > 0 && (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
              {gauges.map((gauge) => (
                <WidgetEngine key={gauge.id} widget={gauge} />
              ))}
            </div>
          )}

          {/* Trends Grid */}
          {trends && trends.length > 0 && (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
              {trends.map((trend) => (
                <WidgetEngine key={trend.id} widget={trend} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
