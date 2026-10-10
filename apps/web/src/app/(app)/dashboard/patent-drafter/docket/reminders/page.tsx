"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BellRing, Plus, CheckCircle2, Trash2, Calendar, CheckSquare } from "lucide-react";
import { useActiveRole } from "@/components/auth/role-context";

export default function RemindersPage() {
  const { currentUser } = useActiveRole();
  const [reminders, setReminders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // New Reminder State
  const [title, setTitle] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const fetchReminders = async () => {
    try {
      const res = await fetch('/api/patent-drafter/docket');
      const data = await res.json();
      if (data.success) {
        setReminders(data.reminders.sort((a:any, b:any) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime()));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReminders();
  }, []);

  const handleCreate = async () => {
    if (!title || !dueDate) return;
    setSubmitting(true);
    try {
      await fetch('/api/patent-drafter/docket', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, due_date: dueDate, author: currentUser.name })
      });
      setTitle("");
      setDueDate("");
      await fetchReminders();
    } catch(e) {
      console.error(e);
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateStatus = async (id: string, status: string) => {
    try {
      await fetch('/api/patent-drafter/docket', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status })
      });
      await fetchReminders();
    } catch(e) {
      console.error(e);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await fetch(`/api/patent-drafter/docket?id=${id}`, { method: 'DELETE' });
      await fetchReminders();
    } catch(e) {
      console.error(e);
    }
  };

  if (loading) return <div className="p-12 text-center text-muted-foreground animate-pulse">Loading Reminders...</div>;

  const activeReminders = reminders.filter(r => r.status === 'ACTIVE');
  const completedReminders = reminders.filter(r => r.status === 'COMPLETED');

  return (
    <div className="max-w-4xl space-y-8">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
            <BellRing className="w-6 h-6 text-indigo-500" /> Personal Reminders
          </h2>
          <p className="text-sm text-muted-foreground mt-1">Configure manual alerts and tasks for your drafting workflow.</p>
        </div>
      </div>

      <Card className="border-border/50 shadow-sm bg-white dark:bg-card">
        <div className="p-4 border-b border-border/50 bg-slate-50/50 flex flex-col md:flex-row gap-4 items-center">
          <Input 
            placeholder="New Reminder Title..." 
            value={title} 
            onChange={e => setTitle(e.target.value)} 
            className="bg-white"
          />
          <Input 
            type="date" 
            value={dueDate} 
            onChange={e => setDueDate(e.target.value)}
            className="w-full md:w-[200px] bg-white" 
          />
          <Button onClick={handleCreate} disabled={!title || !dueDate || submitting} className="w-full md:w-auto bg-indigo-600 hover:bg-indigo-700 text-white shrink-0">
            <Plus className="w-4 h-4 mr-1" /> Add Reminder
          </Button>
        </div>
        
        <CardContent className="p-0">
          <div className="divide-y divide-border/40">
            {activeReminders.length === 0 ? (
              <div className="p-12 text-center text-muted-foreground">No active reminders.</div>
            ) : (
              activeReminders.map(rem => {
                const isOverdue = new Date(rem.due_date).getTime() < new Date().getTime();
                return (
                  <div key={rem.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                    <div className="flex items-start gap-4">
                      <Button variant="ghost" size="icon" onClick={() => handleUpdateStatus(rem.id, 'COMPLETED')} className="h-8 w-8 text-slate-300 hover:text-emerald-500 hover:bg-emerald-50 mt-0.5">
                        <CheckSquare className="w-6 h-6" />
                      </Button>
                      <div>
                        <h4 className="font-semibold text-slate-800 text-base">{rem.title}</h4>
                        <div className={`flex items-center gap-2 mt-1 text-xs font-semibold ${isOverdue ? 'text-red-500' : 'text-slate-500'}`}>
                          <Calendar className="w-3.5 h-3.5" /> 
                          {isOverdue ? 'OVERDUE: ' : 'Due: '} {new Date(rem.due_date).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(rem.id)} className="text-slate-400 hover:text-red-500">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                );
              })
            )}
          </div>
        </CardContent>
      </Card>

      {completedReminders.length > 0 && (
        <div>
          <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" /> Completed
          </h3>
          <div className="space-y-3 opacity-60">
            {completedReminders.map(rem => (
              <div key={rem.id} className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between">
                <div>
                  <h4 className="font-semibold text-slate-600 line-through">{rem.title}</h4>
                  <div className="text-xs text-slate-400 mt-0.5">Due: {new Date(rem.due_date).toLocaleDateString()}</div>
                </div>
                <Button variant="ghost" size="icon" onClick={() => handleDelete(rem.id)} className="h-8 w-8 text-slate-400 hover:text-red-500">
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
