"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Activity, Clock, CheckCircle2, AlertTriangle, Send, FileEdit, MessageSquare, PlusCircle } from "lucide-react";

export default function ActivityPage() {
  const [activities, setActivities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchActivities = async () => {
      try {
        const res = await fetch('/api/patent-drafter/activity');
        const data = await res.json();
        if (data.success) {
          setActivities(data.activities);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchActivities();
  }, []);

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'CLAIM_SET_CREATED': return <PlusCircle className="w-4 h-4 text-emerald-500" />;
      case 'CLAIM_SET_SUBMITTED': return <Send className="w-4 h-4 text-blue-500" />;
      case 'REVISION_REQUESTED': return <AlertTriangle className="w-4 h-4 text-amber-500" />;
      case 'NEW_VERSION_SAVED': return <CheckCircle2 className="w-4 h-4 text-indigo-500" />;
      case 'COMMENT_ADDED': return <MessageSquare className="w-4 h-4 text-purple-500" />;
      default: return <FileEdit className="w-4 h-4 text-slate-500" />;
    }
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case 'CLAIM_SET_CREATED': return 'bg-emerald-50 border-emerald-100';
      case 'CLAIM_SET_SUBMITTED': return 'bg-blue-50 border-blue-100';
      case 'REVISION_REQUESTED': return 'bg-amber-50 border-amber-100';
      case 'NEW_VERSION_SAVED': return 'bg-indigo-50 border-indigo-100';
      case 'COMMENT_ADDED': return 'bg-purple-50 border-purple-100';
      default: return 'bg-slate-50 border-slate-100';
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-12">
      <div>
        <h1 className="text-2xl font-black text-foreground flex items-center gap-2">
          <Activity className="w-6 h-6 text-orange-500" /> Activity History
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Immutable audit trail of all claim drafting events, submissions, and review cycles.
        </p>
      </div>

      <Card className="border-border/50 shadow-sm bg-white dark:bg-card">
        <div className="p-0">
          {loading ? (
            <div className="p-12 text-center text-muted-foreground animate-pulse flex flex-col items-center">
              <Clock className="w-8 h-8 mb-4 opacity-50" />
              Loading audit trail...
            </div>
          ) : activities.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground">
              No activity logs found. Start drafting to generate events.
            </div>
          ) : (
            <div className="relative border-l border-slate-200 ml-8 mt-6 mb-6">
              {activities.map((activity, index) => (
                <div key={activity.id} className="mb-8 last:mb-0 relative">
                  <div className="absolute -left-[25px] top-1 bg-white p-1 rounded-full border border-slate-200 shadow-sm z-10">
                    {getActionIcon(activity.action)}
                  </div>
                  
                  <div className="ml-8">
                    <div className="flex items-center gap-3 mb-1">
                      <span className="font-bold text-sm text-slate-800">{activity.actor}</span>
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                        {activity.action.replace(/_/g, ' ')}
                      </span>
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="w-3 h-3" /> {new Date(activity.timestamp).toLocaleString()}
                      </span>
                    </div>
                    
                    <div className={`mt-2 p-3 rounded-lg border text-sm text-slate-700 ${getActionColor(activity.action)}`}>
                      <span className="font-semibold block mb-1">Context: {activity.invention_id}</span>
                      {activity.details}
                    </div>
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
