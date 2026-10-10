"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { BarChart3, FileText, CheckCircle2, Clock, AlertCircle } from "lucide-react";

export default function DraftingMetricsPage() {
  const [metrics, setMetrics] = useState<any>({ total: 0, drafting: 0, review: 0, completed: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      try {
        const asgRes = await fetch('/api/patent-drafter/assignments');
        const asgData = await asgRes.json();
        
        if (asgData.assignments) {
          let drafting = 0, review = 0, completed = 0;
          
          asgData.assignments.forEach((asg: any) => {
            if (asg.status === 'DRAFTING' || asg.status === 'ASSIGNED') drafting++;
            else if (asg.status === 'SUBMITTED_FOR_REVIEW' || asg.status === 'UNDER_REVIEW' || asg.status === 'REVISION_REQUIRED') review++;
            else if (asg.status === 'APPROVED' || asg.status === 'COMPLETED') completed++;
          });
          
          setMetrics({
            total: asgData.assignments.length,
            drafting,
            review,
            completed
          });
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, []);

  if (loading) return <div className="p-12 text-center text-muted-foreground animate-pulse">Calculating Metrics...</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-teal-500" /> Drafting Metrics
          </h2>
          <p className="text-sm text-muted-foreground mt-1">Aggregate overview of your current patent draft workload and workflow states.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        
        <Card className="border-border/50 shadow-sm bg-white dark:bg-card">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="p-4 bg-slate-100 text-slate-600 rounded-full">
              <FileText className="w-8 h-8" />
            </div>
            <div>
              <div className="text-3xl font-black text-slate-800">{metrics.total}</div>
              <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Assigned</div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50 shadow-sm bg-white dark:bg-card">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="p-4 bg-blue-100 text-blue-600 rounded-full">
              <AlertCircle className="w-8 h-8" />
            </div>
            <div>
              <div className="text-3xl font-black text-blue-600">{metrics.drafting}</div>
              <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">In Progress</div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50 shadow-sm bg-white dark:bg-card">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="p-4 bg-amber-100 text-amber-600 rounded-full">
              <Clock className="w-8 h-8" />
            </div>
            <div>
              <div className="text-3xl font-black text-amber-600">{metrics.review}</div>
              <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">In Review</div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50 shadow-sm bg-white dark:bg-card">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="p-4 bg-emerald-100 text-emerald-600 rounded-full">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <div>
              <div className="text-3xl font-black text-emerald-600">{metrics.completed}</div>
              <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Approved</div>
            </div>
          </CardContent>
        </Card>

      </div>
      
      {/* Visual Bar Chart Fake */}
      <Card className="border-border/50 shadow-sm bg-white dark:bg-card mt-8">
        <div className="p-4 border-b border-border/50 bg-slate-50/50">
          <h3 className="font-semibold text-sm">Workload Distribution</h3>
        </div>
        <CardContent className="p-8">
           <div className="w-full h-8 flex rounded-full overflow-hidden border border-slate-200">
             <div className="bg-blue-500 h-full transition-all flex items-center justify-center text-[10px] text-white font-bold" style={{ width: `\${(metrics.drafting/metrics.total)*100}%` }}>{metrics.drafting > 0 ? `\${Math.round((metrics.drafting/metrics.total)*100)}%` : ''}</div>
             <div className="bg-amber-400 h-full transition-all flex items-center justify-center text-[10px] text-white font-bold" style={{ width: `\${(metrics.review/metrics.total)*100}%` }}>{metrics.review > 0 ? `\${Math.round((metrics.review/metrics.total)*100)}%` : ''}</div>
             <div className="bg-emerald-500 h-full transition-all flex items-center justify-center text-[10px] text-white font-bold" style={{ width: `\${(metrics.completed/metrics.total)*100}%` }}>{metrics.completed > 0 ? `\${Math.round((metrics.completed/metrics.total)*100)}%` : ''}</div>
           </div>
           <div className="flex gap-6 mt-4 justify-center text-xs text-muted-foreground">
             <span className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-blue-500"></span> Drafting</span>
             <span className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-amber-400"></span> Review</span>
             <span className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-emerald-500"></span> Approved</span>
           </div>
        </CardContent>
      </Card>
    </div>
  );
}
