"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Bell,
  Search,
  CheckCircle2,
  Calendar,
  AlertCircle,
  Plus,
  X,
  Trash2,
  Clock,
  Sparkles,
  Check
} from "lucide-react";
import { useActiveRole } from "@/components/auth/role-context";

export default function RemindersDocketPage() {
  const router = useRouter();
  const { currentUser } = useActiveRole();
  const [loading, setLoading] = useState(true);
  const [reminders, setReminders] = useState<any[]>([]);
  const [counts, setCounts] = useState<any>({});
  const [searchQuery, setSearchQuery] = useState("");

  // Add reminder modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newDueDate, setNewDueDate] = useState("");
  const [newPriority, setNewPriority] = useState("NORMAL");
  const [creating, setCreating] = useState(false);
  const [alertMsg, setAlertMsg] = useState<string | null>(null);

  const fetchDocket = async () => {
    try {
      const res = await fetch("/api/design-team/docket");
      if (res.ok) {
        const data = await res.json();
        if (data.reminders) {
          setReminders(data.reminders);
          setCounts(data.counts || {});
        }
      }
    } catch (err) {
      console.error("Error fetching docket reminders:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocket();
  }, []);

  const filtered = reminders.filter((r) => {
    return (
      r.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.target_invention?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  const handleResolveReminder = async (remId: string) => {
    try {
      const res = await fetch("/api/design-team/docket", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reminder_id: remId,
          status: "COMPLETED"
        })
      });

      if (res.ok) {
        setAlertMsg("Reminder marked as completed.");
        await fetchDocket();
        setTimeout(() => setAlertMsg(null), 3000);
      }
    } catch (err) {
      console.error("Error resolving reminder:", err);
    }
  };

  const handleCreateReminder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle) return;
    setCreating(true);

    try {
      const res = await fetch("/api/design-team/docket", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newTitle,
          description: newDesc,
          due_date: newDueDate || new Date(Date.now() + 86400000 * 2).toISOString(),
          priority: newPriority,
          target_invention: "INN-0012",
          actor: currentUser?.name || "Design Team"
        })
      });

      if (res.ok) {
        setAlertMsg("New reminder set successfully.");
        setShowAddModal(false);
        setNewTitle("");
        setNewDesc("");
        await fetchDocket();
        setTimeout(() => setAlertMsg(null), 3000);
      }
    } catch (err) {
      console.error("Error creating reminder:", err);
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-border/40">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
              Operational Checkpoints
            </span>
            <span className="text-xs text-muted-foreground font-mono">
              ROLE: {currentUser?.name || "Design Team"}
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-foreground tracking-tight flex items-center gap-2.5">
            <Bell className="w-7 h-7 text-amber-600" /> Reminders & Checkpoints
          </h1>
          <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
            Proactive alerts for drawing quality verifications, reviewer follow-ups, and milestone deliverables.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            onClick={() => setShowAddModal(true)}
            className="bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold shadow-sm"
          >
            <Plus className="w-4 h-4 mr-1.5" /> Add New Reminder
          </Button>

          <Link href="/dashboard/design-team/docket/deadlines">
            <Button variant="outline" className="text-xs font-semibold">
              <Calendar className="w-4 h-4 mr-1.5 text-rose-500" /> Deadlines Docket
            </Button>
          </Link>
        </div>
      </div>

      {alertMsg && (
        <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-400 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4" /> {alertMsg}
        </div>
      )}

      {/* Docket Navigation Tab Strip */}
      <div className="flex items-center gap-2 border-b border-border/40 pb-2 overflow-x-auto">
        <Link href="/dashboard/design-team/docket/deadlines">
          <Button size="sm" variant="outline" className="text-xs h-8">
            <Calendar className="w-3.5 h-3.5 mr-1.5 text-rose-500" /> Deadlines ({counts.deadlines || 2})
          </Button>
        </Link>
        <Link href="/dashboard/design-team/docket/reminders">
          <Button size="sm" className="bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 text-xs h-8">
            <Bell className="w-3.5 h-3.5 mr-1.5 text-amber-500" /> Reminders ({reminders.length})
          </Button>
        </Link>
        <Link href="/dashboard/design-team/docket/action-items">
          <Button size="sm" variant="outline" className="text-xs h-8">
            <AlertCircle className="w-3.5 h-3.5 mr-1.5 text-blue-500" /> Action Items ({counts.action_items || 3})
          </Button>
        </Link>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search reminder notes, project ID..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9 text-xs bg-card"
        />
      </div>

      {/* Reminders List */}
      {loading ? (
        <div className="py-20 text-center text-xs text-muted-foreground animate-pulse">
          Loading checkpoints...
        </div>
      ) : filtered.length === 0 ? (
        <Card className="p-12 text-center bg-card">
          <Bell className="w-10 h-10 mx-auto text-muted-foreground/60 mb-3" />
          <h3 className="text-base font-bold text-foreground">No pending reminders</h3>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((rem) => (
            <Card
              key={rem.id}
              className={`bg-card transition-all shadow-sm border ${
                rem.status === "COMPLETED"
                  ? "opacity-60 border-border/30"
                  : rem.priority === "HIGH"
                  ? "border-amber-500/50"
                  : "border-border/50"
              }`}
            >
              <CardContent className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1.5 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="outline" className="text-[10px] font-mono font-bold text-amber-600 bg-amber-50 dark:bg-amber-950/40">
                      {rem.id}
                    </Badge>
                    <Badge variant="outline" className="text-[10px] font-mono">{rem.target_invention}</Badge>
                    <Badge
                      className={`text-[9px] font-bold ${
                        rem.priority === "HIGH" ? "bg-amber-600 text-white" : "bg-blue-600 text-white"
                      }`}
                    >
                      {rem.priority} PRIORITY
                    </Badge>
                    {rem.status === "COMPLETED" && (
                      <Badge className="bg-emerald-600 text-white text-[9px]">COMPLETED</Badge>
                    )}
                  </div>

                  <h3 className={`text-sm font-bold text-foreground ${rem.status === "COMPLETED" ? "line-through text-muted-foreground" : ""}`}>
                    {rem.title}
                  </h3>
                  <p className="text-xs text-muted-foreground">{rem.description}</p>

                  <div className="flex items-center gap-2 text-[11px] text-muted-foreground pt-1">
                    <Clock className="w-3.5 h-3.5 text-amber-500" />
                    <span>Target: {new Date(rem.due_date).toLocaleDateString()}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {rem.status !== "COMPLETED" && (
                    <Button
                      size="sm"
                      className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
                      onClick={() => handleResolveReminder(rem.id)}
                    >
                      <Check className="w-3.5 h-3.5 mr-1" /> Mark Done
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* ADD REMINDER MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-card border border-border/60 rounded-xl max-w-md w-full shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-border/40 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bell className="w-5 h-5 text-amber-600" />
                <h3 className="font-bold text-base text-foreground">Set Operational Checkpoint</h3>
              </div>
              <button onClick={() => setShowAddModal(false)} className="text-muted-foreground hover:text-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateReminder} className="p-5 space-y-4">
              <div>
                <label className="text-xs font-bold text-foreground block mb-1">Reminder Title</label>
                <Input
                  placeholder="e.g. Verify FIG 4 margin clearance with Drafter"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="text-xs"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-foreground block mb-1">Priority</label>
                  <select
                    value={newPriority}
                    onChange={(e) => setNewPriority(e.target.value)}
                    className="w-full h-9 px-3 rounded-md border border-input bg-card text-xs text-foreground focus:outline-none focus:ring-1"
                  >
                    <option value="NORMAL">Normal</option>
                    <option value="HIGH">High Priority</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-foreground block mb-1">Target Date</label>
                  <Input
                    type="date"
                    value={newDueDate}
                    onChange={(e) => setNewDueDate(e.target.value)}
                    className="text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-foreground block mb-1">Details & Actions</label>
                <textarea
                  placeholder="What needs to be checked or confirmed..."
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  rows={3}
                  className="w-full p-2.5 rounded-md border border-input bg-card text-xs text-foreground focus:outline-none focus:ring-1"
                />
              </div>

              <div className="pt-3 border-t border-border/40 flex justify-end gap-2">
                <Button type="button" variant="outline" size="sm" className="text-xs" onClick={() => setShowAddModal(false)}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  className="bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold"
                  disabled={creating}
                >
                  {creating ? "Saving..." : "Set Checkpoint"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
