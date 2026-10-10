"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { History, MessageCircle, ShieldCheck, Clock, User, MessageSquare } from "lucide-react";
import { useSearchParams } from "next/navigation";

export default function FeedbackLogsPage() {
  const searchParams = useSearchParams();
  const rawId = searchParams?.get('id');
  
  const [inventionId, setInventionId] = useState<string | null>(rawId);
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

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
        if (!currentId) return;

        // Fetch both annotations and workflow decisions
        const annRes = await fetch(`/api/patent-drafter/annotations?inventionId=${currentId}`);
        const annData = await annRes.json();
        
        const revRes = await fetch(`/api/patent-drafter/review?inventionId=${currentId}`);
        const revData = await revRes.json();
        
        let combined: any[] = [];
        
        if (annData.success && annData.annotations) {
          annData.annotations.forEach((a: any) => {
            combined.push({
              type: 'ANNOTATION',
              id: a.id,
              text: a.text,
              target: a.target_passage,
              author: a.author,
              role: a.role,
              timestamp: new Date(a.created_at)
            });
            a.replies?.forEach((r: any) => {
              combined.push({
                type: 'REPLY',
                id: r.id,
                text: r.text,
                target: `Reply to: ${a.target_passage}`,
                author: r.author,
                role: r.role,
                timestamp: new Date(r.created_at)
              });
            });
            if (a.status === 'RESOLVED') {
              combined.push({
                type: 'RESOLUTION',
                id: a.id + '-res',
                text: `Marked annotation resolved.`,
                target: a.target_passage,
                author: a.resolved_by,
                role: 'Drafter',
                timestamp: new Date(a.resolved_at)
              });
            }
          });
        }
        
        if (revData.success && revData.reviewData.comments) {
          revData.reviewData.comments.forEach((c: any) => {
            combined.push({
              type: 'WORKFLOW_DECISION',
              id: c.id,
              text: c.text,
              target: 'Macro Workflow',
              author: c.author,
              role: c.role,
              timestamp: new Date(c.timestamp)
            });
          });
        }

        // Sort chronological descending
        combined.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
        setLogs(combined);

      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [rawId]);

  if (loading) return <div className="p-12 text-center text-muted-foreground animate-pulse">Loading Historical Feedback...</div>;
  if (!inventionId) return <div className="p-12 text-center">No Invention Selected.</div>;

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'ANNOTATION': return <MessageSquare className="w-5 h-5 text-purple-500" />;
      case 'REPLY': return <MessageCircle className="w-5 h-5 text-indigo-500" />;
      case 'RESOLUTION': return <ShieldCheck className="w-5 h-5 text-emerald-500" />;
      case 'WORKFLOW_DECISION': return <ShieldCheck className="w-5 h-5 text-amber-500" />;
      default: return <History className="w-5 h-5 text-slate-500" />;
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      <div className="flex justify-between items-end mb-8">
        <div>
          <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
            <History className="w-6 h-6 text-slate-500" /> Aggregated Feedback Logs
          </h2>
          <p className="text-sm text-muted-foreground mt-1">A unified timeline of all granular comments, replies, and high-level workflow decisions.</p>
        </div>
      </div>

      <Card className="border-border/50 shadow-sm bg-white dark:bg-card">
        <div className="p-0">
          {logs.length === 0 ? (
            <div className="p-16 flex flex-col items-center justify-center text-muted-foreground text-center">
              <History className="w-12 h-12 opacity-20 mb-4" />
              <h3 className="font-semibold mb-2">No Historical Data</h3>
              <p className="text-sm">Feedback will appear here once the draft review begins.</p>
            </div>
          ) : (
            <div className="relative border-l-2 border-slate-200 ml-8 mt-8 mb-8 space-y-8">
              {logs.map(log => (
                <div key={log.id} className="relative ml-8 pr-6">
                  <div className="absolute -left-[43px] top-0 bg-white p-1 rounded-full border-2 border-slate-200 shadow-sm z-10">
                    {getTypeIcon(log.type)}
                  </div>
                  
                  <div className="bg-slate-50/50 border border-slate-100 rounded-lg p-4 shadow-sm hover:border-slate-300 transition-colors">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-muted-foreground" />
                        <span className="font-bold text-sm text-slate-800">{log.author}</span>
                        <span className="text-[10px] text-muted-foreground uppercase px-2 py-0.5 bg-black/5 rounded-full">{log.role}</span>
                        <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">{log.type.replace('_', ' ')}</span>
                      </div>
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="w-3 h-3" /> {log.timestamp.toLocaleString()}
                      </span>
                    </div>
                    
                    <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 mt-3">Target: {log.target}</div>
                    <p className="text-sm text-slate-700 leading-relaxed bg-white p-3 border border-slate-100 rounded">
                      {log.text}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
