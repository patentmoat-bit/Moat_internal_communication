"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CalendarClock, AlertTriangle, CheckCircle2, Clock } from "lucide-react";

export default function DeadlinesPage() {
  const [assignments, setAssignments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      try {
        const asgRes = await fetch('/api/patent-drafter/assignments');
        const asgData = await asgRes.json();
        
        if (asgData.assignments) {
          // Compute deadlines based on assignment creation date (e.g. +30 days)
          const computed = asgData.assignments.map((asg: any) => {
            const createdAt = new Date(asg.assigned_at);
            const due = new Date(createdAt);
            due.setDate(due.getDate() + 30); // 30 day SLA
            
            const now = new Date();
            const daysLeft = Math.ceil((due.getTime() - now.getTime()) / (1000 * 3600 * 24));
            
            return {
              ...asg,
              deadline_date: due,
              days_left: daysLeft,
              is_overdue: daysLeft < 0,
              is_urgent: daysLeft >= 0 && daysLeft <= 7
            };
          });
          
          // Sort by closest deadline
          computed.sort((a: any, b: any) => a.deadline_date.getTime() - b.deadline_date.getTime());
          setAssignments(computed);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, []);

  if (loading) return <div className="p-12 text-center text-muted-foreground animate-pulse">Computing Filing Deadlines...</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
            <CalendarClock className="w-6 h-6 text-rose-500" /> Upcoming Deadlines
          </h2>
          <p className="text-sm text-muted-foreground mt-1">System-generated SLAs and filing deadlines for your assigned inventions.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {assignments.length === 0 ? (
          <Card className="border-border/50 border-dashed shadow-sm bg-white dark:bg-card">
            <CardContent className="p-16 flex flex-col items-center justify-center text-muted-foreground text-center">
              <CheckCircle2 className="w-12 h-12 opacity-20 mb-4" />
              <h3 className="font-semibold mb-2">No Active Deadlines</h3>
              <p className="text-sm">You do not have any active assignments with pending SLAs.</p>
            </CardContent>
          </Card>
        ) : (
          assignments.map((asg: any) => (
            <Card key={asg.id} className={`border shadow-sm overflow-hidden ${asg.is_overdue ? 'border-red-300' : asg.is_urgent ? 'border-amber-300' : 'border-slate-200'}`}>
              <div className={`p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 ${asg.is_overdue ? 'bg-red-50/50' : asg.is_urgent ? 'bg-amber-50/50' : 'bg-white'}`}>
                
                <div className="flex items-start gap-4">
                  <div className={`p-3 rounded-xl mt-1 flex-shrink-0 ${asg.is_overdue ? 'bg-red-100 text-red-600' : asg.is_urgent ? 'bg-amber-100 text-amber-600' : 'bg-slate-100 text-slate-600'}`}>
                    {asg.is_overdue ? <AlertTriangle className="w-6 h-6" /> : <Clock className="w-6 h-6" />}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-bold text-lg">{asg.title}</h3>
                      <span className="text-xs font-bold text-slate-500 bg-slate-200 px-2 py-0.5 rounded-full">{asg.invention_id}</span>
                    </div>
                    <div className="text-sm text-slate-600 flex items-center gap-3">
                      <span>Status: <strong className="uppercase">{asg.status.replace(/_/g, ' ')}</strong></span>
                      <span>•</span>
                      <span>Assigned: {new Date(asg.assigned_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col md:items-end border-t md:border-t-0 md:border-l border-slate-200 pt-3 md:pt-0 md:pl-6 min-w-[200px]">
                  <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">Target Filing Date</div>
                  <div className={`text-xl font-black ${asg.is_overdue ? 'text-red-600' : asg.is_urgent ? 'text-amber-600' : 'text-slate-700'}`}>
                    {asg.deadline_date.toLocaleDateString()}
                  </div>
                  <div className={`text-sm font-bold mt-1 ${asg.is_overdue ? 'text-red-500' : asg.is_urgent ? 'text-amber-500' : 'text-emerald-500'}`}>
                    {asg.is_overdue ? `${Math.abs(asg.days_left)} Days Overdue` : `${asg.days_left} Days Remaining`}
                  </div>
                </div>

              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
