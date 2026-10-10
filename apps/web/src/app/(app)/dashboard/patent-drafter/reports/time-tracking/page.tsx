"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Clock, Plus, Trash2, FileText, CheckCircle } from "lucide-react";
import { useSearchParams } from "next/navigation";

export default function TimeTrackingPage() {
  const searchParams = useSearchParams();
  const rawId = searchParams?.get('id');
  
  const [inventionId, setInventionId] = useState<string | null>(rawId);
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // New Log State
  const [taskName, setTaskName] = useState("");
  const [hoursSpent, setHoursSpent] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const fetchLogs = async (currentId: string | null) => {
    try {
      const url = currentId ? `/api/patent-drafter/reports?inventionId=${currentId}` : '/api/patent-drafter/reports';
      const res = await fetch(url);
      const data = await res.json();
      if (data.success) {
        setLogs(data.time_logs.sort((a:any, b:any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const init = async () => {
      try {
        let currentId = rawId;
        if (!currentId) {
          const asgRes = await fetch('/api/patent-drafter/assignments');
          const asgData = await asgRes.json();
          if (asgData.assignments && asgData.assignments.length > 0) {
            currentId = asgData.assignments[0].invention_id;
            setInventionId(currentId);
          }
        }
        await fetchLogs(currentId);
      } catch (err) {
        console.error(err);
      }
    };
    init();
  }, [rawId]);

  const handleCreate = async () => {
    if (!taskName || !hoursSpent) return;
    setSubmitting(true);
    try {
      await fetch('/api/patent-drafter/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          task_name: taskName, 
          hours_spent: hoursSpent,
          invention_id: inventionId 
        })
      });
      setTaskName("");
      setHoursSpent("");
      await fetchLogs(inventionId);
    } catch(e) {
      console.error(e);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await fetch(`/api/patent-drafter/reports?id=${id}`, { method: 'DELETE' });
      await fetchLogs(inventionId);
    } catch(e) {
      console.error(e);
    }
  };

  if (loading) return <div className="p-12 text-center text-muted-foreground animate-pulse">Loading Time Sheets...</div>;

  const totalHours = logs.reduce((sum, log) => sum + parseFloat(log.hours_spent), 0);

  return (
    <div className="max-w-4xl space-y-8">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
            <Clock className="w-6 h-6 text-sky-500" /> Time Tracking Ledger
          </h2>
          <p className="text-sm text-muted-foreground mt-1">Log billable hours against specific patent draft projects.</p>
        </div>
        <div className="text-right">
          <div className="text-sm text-muted-foreground font-semibold uppercase tracking-wider mb-1">Total Hours Logged</div>
          <div className="text-3xl font-black text-sky-600">{totalHours.toFixed(1)} hrs</div>
        </div>
      </div>

      <Card className="border-border/50 shadow-sm bg-white dark:bg-card">
        <div className="p-4 border-b border-border/50 bg-slate-50/50 flex flex-col md:flex-row gap-4 items-center">
          <Input 
            placeholder="Description of task (e.g. Drafted Independent Claim 1)..." 
            value={taskName} 
            onChange={e => setTaskName(e.target.value)} 
            className="bg-white"
          />
          <Input 
            type="number" 
            placeholder="Hours (e.g. 2.5)" 
            step="0.1"
            value={hoursSpent} 
            onChange={e => setHoursSpent(e.target.value)}
            className="w-full md:w-[150px] bg-white" 
          />
          <Button onClick={handleCreate} disabled={!taskName || !hoursSpent || submitting} className="w-full md:w-auto bg-sky-600 hover:bg-sky-700 text-white shrink-0">
            <Plus className="w-4 h-4 mr-1" /> Log Time
          </Button>
        </div>
        
        <CardContent className="p-0">
          <div className="divide-y divide-border/40">
            {logs.length === 0 ? (
              <div className="p-16 text-center text-muted-foreground flex flex-col items-center justify-center">
                <FileText className="w-12 h-12 opacity-20 mb-4" />
                <p>No time logged for this project yet.</p>
              </div>
            ) : (
              logs.map(log => (
                <div key={log.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                  <div className="flex items-start gap-4">
                    <div className="bg-sky-100 text-sky-700 font-bold px-3 py-1.5 rounded-lg text-sm min-w-[70px] text-center border border-sky-200">
                      {log.hours_spent}h
                    </div>
                    <div>
                      <h4 className="font-semibold text-slate-800 text-base">{log.task_name}</h4>
                      <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                        <CheckCircle className="w-3.5 h-3.5 text-emerald-500" /> Billable
                        <span>•</span>
                        <span>{new Date(log.created_at).toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(log.id)} className="text-slate-400 hover:text-red-500">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
