"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import {
  MessageSquare, ThumbsUp, ThumbsDown, Bug, Zap, Layout, Activity, Shield, Database,
  Plus, X, Filter, Search, ChevronUp, RefreshCw
} from "lucide-react";

interface Feedback {
  id: string;
  title: string;
  description: string;
  type: string;
  severity: string;
  status: string;
  upvotes: number;
  created_at: string;
}

const typeIcons: Record<string, any> = {
  Bug: Bug,
  Feature: Zap,
  UX: Layout,
  Performance: Activity,
  Security: Shield,
  Data: Database,
};

export default function FeedbackPage() {
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  
  const [form, setForm] = useState({ title: "", description: "", type: "Feature", severity: "Medium" });
  
  const fetchFeedbacks = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/feedback");
      if (res.ok) {
        const data = await res.json();
        setFeedbacks(data.data || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFeedbacks();
  }, [fetchFeedbacks]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      setShowForm(false);
      setForm({ title: "", description: "", type: "Feature", severity: "Medium" });
      fetchFeedbacks();
    } catch (err) {
      console.error(err);
    }
  };

  const handleVote = async (id: string, currentUpvotes: number) => {
    try {
      // Optimistic update
      setFeedbacks(prev => prev.map(f => f.id === id ? { ...f, upvotes: f.upvotes + 1 } : f));
      await fetch(`/api/feedback/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ upvotes: currentUpvotes + 1 }),
      });
    } catch (err) {
      console.error(err);
      fetchFeedbacks(); // revert on error
    }
  };

  return (
    <div className="mx-auto max-w-6xl pb-16 space-y-6">
      <motion.header initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight pfs-heading flex items-center gap-2">
            <MessageSquare className="h-6 w-6 pfs-cyan" /> Feedback Hub
          </h1>
          <p className="mt-1 text-sm pfs-muted">
            Help us improve the platform. Report bugs, suggest features, and upvote ideas.
          </p>
        </div>
        <button onClick={() => setShowForm(true)} className="flex h-10 items-center gap-2 rounded-lg bg-[hsl(var(--pfs-cyan))] px-4 text-sm font-bold text-[hsl(var(--pfs-cyan-foreground))] hover:bg-[hsl(var(--pfs-cyan))]/85">
          <Plus className="h-4 w-4" /> New Feedback
        </button>
      </motion.header>

      {showForm && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="rounded-xl border border-[hsl(var(--pfs-cyan))]/30 bg-[hsl(var(--pfs-cyan))]/5 p-6 mb-8 relative">
          <button onClick={() => setShowForm(false)} className="absolute top-4 right-4 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]">
            <X className="h-5 w-5" />
          </button>
          <h2 className="text-lg font-bold pfs-heading mb-4">Submit Feedback</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs font-bold pfs-heading mb-1 block">Title</label>
              <input required value={form.title} onChange={e => setForm({...form, title: e.target.value})} className="w-full h-10 rounded-lg pfs-field px-3 text-sm" placeholder="Short, descriptive title" />
            </div>
            <div>
              <label className="text-xs font-bold pfs-heading mb-1 block">Description</label>
              <textarea required value={form.description} onChange={e => setForm({...form, description: e.target.value})} className="w-full h-24 rounded-lg pfs-field p-3 text-sm resize-none" placeholder="Provide details, expected behavior, or use cases..." />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold pfs-heading mb-1 block">Type</label>
                <select value={form.type} onChange={e => setForm({...form, type: e.target.value})} className="w-full h-10 rounded-lg pfs-field px-3 text-sm">
                  {Object.keys(typeIcons).map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-bold pfs-heading mb-1 block">Severity</label>
                <select value={form.severity} onChange={e => setForm({...form, severity: e.target.value})} className="w-full h-10 rounded-lg pfs-field px-3 text-sm">
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                  <option value="Critical">Critical</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end pt-2">
              <button type="submit" className="h-10 px-6 rounded-lg bg-[hsl(var(--pfs-cyan))] text-[hsl(var(--pfs-cyan-foreground))] font-bold hover:bg-[hsl(var(--pfs-cyan))]/85">
                Submit
              </button>
            </div>
          </form>
        </motion.div>
      )}

      <div className="space-y-4">
        {loading ? (
          <div className="flex justify-center py-12"><RefreshCw className="h-8 w-8 animate-spin pfs-cyan" /></div>
        ) : feedbacks.length === 0 ? (
          <div className="text-center py-12 rounded-xl border border-dashed border-[hsl(var(--border))]">
            <MessageSquare className="h-12 w-12 mx-auto pfs-muted opacity-20 mb-3" />
            <p className="pfs-heading font-bold">No feedback submitted yet.</p>
            <p className="text-sm pfs-muted mt-1">Be the first to share your thoughts!</p>
          </div>
        ) : (
          feedbacks.map(item => {
            const Icon = typeIcons[item.type] || MessageSquare;
            return (
              <div key={item.id} className="flex gap-4 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-5 hover:border-[hsl(var(--pfs-cyan))]/30 transition-colors">
                <div className="flex flex-col items-center justify-start gap-1 pt-1">
                  <button onClick={() => handleVote(item.id, item.upvotes)} className="flex flex-col items-center justify-center w-12 h-14 rounded-lg bg-[hsl(var(--muted))]/30 hover:bg-[hsl(var(--pfs-cyan))]/10 hover:text-[hsl(var(--pfs-cyan))] transition-colors group">
                    <ChevronUp className="h-6 w-6 text-[hsl(var(--muted-foreground))] group-hover:text-[hsl(var(--pfs-cyan))]" />
                    <span className="font-bold text-sm">{item.upvotes}</span>
                  </button>
                </div>
                <div className="flex-1">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className={`flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[hsl(var(--muted))]/50 pfs-heading`}>
                        <Icon className="h-3 w-3" /> {item.type}
                      </span>
                      <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${item.status === 'Open' ? 'bg-amber-500/20 text-amber-500' : item.status === 'In Progress' ? 'bg-blue-500/20 text-blue-500' : 'bg-emerald-500/20 text-emerald-500'}`}>
                        {item.status}
                      </span>
                      <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${item.severity === 'Critical' ? 'border-red-500/50 text-red-500' : item.severity === 'High' ? 'border-orange-500/50 text-orange-500' : 'border-[hsl(var(--border))] pfs-muted'}`}>
                        {item.severity}
                      </span>
                    </div>
                    <span className="text-xs pfs-muted">{new Date(item.created_at).toLocaleDateString()}</span>
                  </div>
                  <h3 className="text-base font-bold pfs-heading">{item.title}</h3>
                  <p className="mt-1 text-sm leading-relaxed pfs-muted">{item.description}</p>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  );
}
