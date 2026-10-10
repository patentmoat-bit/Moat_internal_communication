"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { LineChart, Clock, TrendingUp, Zap, Target } from "lucide-react";

export default function ProductivityPage() {
  const [stats, setStats] = useState<any>({
    avgTurnaround: 0,
    totalBillable: 0,
    efficiencyScore: 0,
    recentLogs: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      try {
        const asgRes = await fetch('/api/patent-drafter/assignments');
        const asgData = await asgRes.json();
        
        const timeRes = await fetch('/api/patent-drafter/reports');
        const timeData = await timeRes.json();

        let totalHours = 0;
        let completedDrafts = 0;
        let turnaroundDays = 0;

        if (asgData.assignments) {
          asgData.assignments.forEach((asg: any) => {
            if (asg.status === 'COMPLETED' || asg.status === 'APPROVED') {
              completedDrafts++;
              // mock a turnaround calculation (in reality we'd diff assigned vs completed dates)
              const assigned = new Date(asg.assigned_at).getTime();
              const updated = new Date(asg.last_updated).getTime();
              const days = (updated - assigned) / (1000 * 3600 * 24);
              if (days > 0) turnaroundDays += days;
            }
          });
        }

        let logs = [];
        if (timeData.success && timeData.time_logs) {
          logs = timeData.time_logs;
          logs.forEach((log: any) => {
            if (log.billable) totalHours += parseFloat(log.hours_spent);
          });
        }

        setStats({
          avgTurnaround: completedDrafts > 0 ? (turnaroundDays / completedDrafts).toFixed(1) : 0,
          totalBillable: totalHours.toFixed(1),
          efficiencyScore: completedDrafts > 0 ? Math.min(100, Math.round((totalHours / completedDrafts) * 10)) : 0,
          recentLogs: logs.slice(0, 5)
        });

      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, []);

  if (loading) return <div className="p-12 text-center text-muted-foreground animate-pulse">Analyzing Productivity Data...</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
            <LineChart className="w-6 h-6 text-indigo-500" /> Productivity Analytics
          </h2>
          <p className="text-sm text-muted-foreground mt-1">AI-driven analysis of your drafting velocity and efficiency.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        
        <Card className="border-border/50 shadow-sm bg-indigo-600 text-white">
          <CardContent className="p-6 flex flex-col items-center text-center gap-2">
            <Zap className="w-10 h-10 opacity-80 mb-2" />
            <div className="text-4xl font-black">{stats.efficiencyScore}</div>
            <div className="text-xs font-bold uppercase tracking-widest opacity-80">Efficiency Score</div>
          </CardContent>
        </Card>

        <Card className="border-border/50 shadow-sm bg-white dark:bg-card">
          <CardContent className="p-6 flex flex-col items-center text-center gap-2">
            <Clock className="w-10 h-10 text-emerald-500 mb-2" />
            <div className="text-4xl font-black text-slate-800">{stats.avgTurnaround} <span className="text-lg">days</span></div>
            <div className="text-xs font-bold text-slate-500 uppercase tracking-widest">Avg Turnaround</div>
          </CardContent>
        </Card>

        <Card className="border-border/50 shadow-sm bg-white dark:bg-card">
          <CardContent className="p-6 flex flex-col items-center text-center gap-2">
            <Target className="w-10 h-10 text-rose-500 mb-2" />
            <div className="text-4xl font-black text-slate-800">{stats.totalBillable} <span className="text-lg">hrs</span></div>
            <div className="text-xs font-bold text-slate-500 uppercase tracking-widest">Total Billable Drafted</div>
          </CardContent>
        </Card>

      </div>

      {/* Mock Chart Area */}
      <Card className="border-border/50 shadow-sm bg-white dark:bg-card mt-8">
        <div className="p-4 border-b border-border/50 bg-slate-50/50 flex justify-between items-center">
          <h3 className="font-semibold text-sm">Velocity Trend (30 Days)</h3>
          <TrendingUp className="w-4 h-4 text-muted-foreground" />
        </div>
        <CardContent className="p-8 h-64 flex items-end justify-between gap-2 border-b border-slate-100 pb-0 opacity-80 relative">
          
          <div className="absolute top-8 left-8 right-8 border-t border-dashed border-slate-200"></div>
          <div className="absolute top-24 left-8 right-8 border-t border-dashed border-slate-200"></div>
          <div className="absolute top-40 left-8 right-8 border-t border-dashed border-slate-200"></div>

          {/* Render 10 mock bars */}
          {[40, 60, 45, 80, 55, 90, 75, 85, 65, 100].map((height, i) => (
            <div key={i} className="w-full bg-indigo-100 hover:bg-indigo-300 transition-colors rounded-t-md relative group z-10" style={{ height: `${height}%` }}>
              <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                {height}
              </div>
            </div>
          ))}
        </CardContent>
        <div className="flex justify-between px-8 py-4 text-xs font-bold text-slate-400">
          <span>Week 1</span>
          <span>Week 2</span>
          <span>Week 3</span>
          <span>Week 4</span>
        </div>
      </Card>
    </div>
  );
}
