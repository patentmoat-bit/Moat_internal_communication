"use client";

import { triggerFileDownload } from "@/lib/downloadHelper";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  History,
  Search,
  Download,
  ExternalLink,
  Eye,
  CheckCircle2,
  Clock,
  ImageIcon,
  Send,
  MessageSquare,
  Sparkles,
  ArrowRight,
  SplitSquareVertical
} from "lucide-react";
import { useActiveRole } from "@/components/auth/role-context";

export default function RevisionHistoryCollabPage() {
  const router = useRouter();
  const { currentUser } = useActiveRole();
  const [loading, setLoading] = useState(true);
  const [timeline, setTimeline] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  const fetchHistory = async () => {
    try {
      const res = await fetch("/api/design-team/assignments");
      if (res.ok) {
        const data = await res.json();
        if (data.assignments) {
          // Flatten all version records across assignments into unified chronological timeline
          const allVersions: any[] = [];
          data.assignments.forEach((task: any) => {
            task.versions?.forEach((v: any) => {
              allVersions.push({
                ...v,
                assignment_id: task.id,
                invention_id: task.invention_id,
                project_title: task.project_title,
                task_title: task.title,
                figure_numbers: task.figure_numbers
              });
            });
          });

          allVersions.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
          setTimeline(allVersions);
        }
      }
    } catch (err) {
      console.error("Error fetching revision history:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const filtered = timeline.filter((item) => {
    return (
      item.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.file_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.notes?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.assignment_id?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.uploaded_by?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-border/40">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              Audit & Traceability Log
            </span>
            <span className="text-xs text-muted-foreground font-mono">
              ROLE: {currentUser?.name || "Design Team"}
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-foreground tracking-tight flex items-center gap-2.5">
            <History className="w-7 h-7 text-emerald-600" /> Revision History Log
          </h1>
          <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
            Complete immutable ledger of all figure revision iterations, drawing amendments, source preservation records, and author timestamps.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Link href="/dashboard/design-team/workspace/in-progress">
            <Button className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-sm">
              <Sparkles className="w-4 h-4 mr-1.5" /> Open Studio
            </Button>
          </Link>
          <Link href="/dashboard/design-team/workspace/my-designs">
            <Button variant="outline" className="text-xs font-semibold">
              <ImageIcon className="w-4 h-4 mr-1.5 text-blue-500" /> My Designs
            </Button>
          </Link>
        </div>
      </div>

      {/* Collaboration Navigation Tab Strip */}
      <div className="flex items-center gap-2 border-b border-border/40 pb-2 overflow-x-auto">
        <Link href="/dashboard/design-team/collab/requests">
          <Button size="sm" variant="outline" className="text-xs h-8">
            <Send className="w-3.5 h-3.5 mr-1.5 text-purple-500" /> Review Requests
          </Button>
        </Link>
        <Link href="/dashboard/design-team/collab/comments">
          <Button size="sm" variant="outline" className="text-xs h-8">
            <MessageSquare className="w-3.5 h-3.5 mr-1.5 text-blue-500" /> Comments & Annotations
          </Button>
        </Link>
        <Link href="/dashboard/design-team/collab/history">
          <Button size="sm" className="bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 text-xs h-8">
            <History className="w-3.5 h-3.5 mr-1.5 text-emerald-500" /> Revision History Log ({timeline.length})
          </Button>
        </Link>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search revision notes, author, file, or task ID..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9 text-xs bg-card"
        />
      </div>

      {/* Chronological Timeline */}
      {loading ? (
        <div className="py-20 text-center text-xs text-muted-foreground animate-pulse">
          Loading revision timeline...
        </div>
      ) : filtered.length === 0 ? (
        <Card className="p-12 text-center bg-card">
          <History className="w-10 h-10 mx-auto text-muted-foreground/60 mb-3" />
          <h3 className="text-base font-bold text-foreground">No revision iterations found</h3>
        </Card>
      ) : (
        <div className="relative border-l-2 border-border/60 ml-4 pl-6 space-y-6">
          {filtered.map((item, idx) => (
            <div key={idx} className="relative group">
              {/* Timeline Indicator Dot */}
              <div className="absolute -left-[31px] top-1.5 w-3.5 h-3.5 rounded-full bg-emerald-600 border-2 border-background ring-4 ring-emerald-500/20 group-hover:scale-125 transition-transform" />

              <Card className="bg-card border-border/50 shadow-sm hover:border-emerald-500/50 transition-all">
                <CardContent className="p-4 space-y-2">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge className="bg-emerald-600 text-white font-mono text-[10px]">
                        v{item.version}
                      </Badge>
                      <span className="font-mono text-[10px] font-bold text-blue-600 bg-blue-50 dark:bg-blue-950/40 px-2 py-0.5 rounded">
                        {item.assignment_id}
                      </span>
                      <strong className="text-sm font-bold text-foreground">{item.title}</strong>
                    </div>

                    <span className="text-[11px] font-mono text-muted-foreground">
                      {new Date(item.created_at).toLocaleString()}
                    </span>
                  </div>

                  <p className="text-xs text-foreground bg-muted/15 p-2.5 rounded border border-border/20">
                    {item.notes || "Standard iteration save."}
                  </p>

                  <div className="flex items-center justify-between pt-2 border-t border-border/20 text-xs text-muted-foreground">
                    <div className="flex items-center gap-3">
                      <span>Author: <strong className="text-foreground">{item.uploaded_by}</strong></span>
                      <span>•</span>
                      <span>File: <span className="font-mono text-foreground">{item.file_name}</span></span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 px-2 text-[11px]"
                        onClick={() => triggerFileDownload(item.file_name)}
                      >
                        <Download className="w-3 h-3 mr-1" /> Download Asset
                      </Button>

                      <Link href={`/dashboard/design-team/workspace/in-progress?id=${item.assignment_id}`}>
                        <Button size="sm" className="h-7 px-2.5 text-[11px] bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900">
                          Edit in Studio →
                        </Button>
                      </Link>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
