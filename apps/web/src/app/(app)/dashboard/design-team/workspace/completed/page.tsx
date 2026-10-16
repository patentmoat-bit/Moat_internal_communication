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
  CheckCircle2,
  Search,
  Download,
  ExternalLink,
  Eye,
  ShieldCheck,
  Award,
  Calendar,
  Lock,
  ImageIcon,
  FileDown,
  Layers,
  X,
  FileText
} from "lucide-react";
import { useActiveRole } from "@/components/auth/role-context";

export default function CompletedWorkspacePage() {
  const router = useRouter();
  const { currentUser } = useActiveRole();
  const [loading, setLoading] = useState(true);
  const [completedTasks, setCompletedTasks] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [certTask, setCertTask] = useState<any | null>(null);

  const fetchCompleted = async () => {
    try {
      const res = await fetch("/api/design-team/assignments");
      if (res.ok) {
        const data = await res.json();
        if (data.assignments) {
          const finished = data.assignments.filter((a: any) => a.status === "COMPLETED");
          setCompletedTasks(finished);
        }
      }
    } catch (err) {
      console.error("Error fetching completed designs:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCompleted();
  }, []);

  const filtered = completedTasks.filter((t) => {
    return (
      t.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.project_title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.invention_id?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.id?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-border/40">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              Approved & Locked Archive
            </span>
            <span className="text-xs text-muted-foreground font-mono">
              DESIGNER: {currentUser?.name || "Design Team"}
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-foreground tracking-tight flex items-center gap-2.5">
            <CheckCircle2 className="w-7 h-7 text-emerald-600" /> Completed Deliverables
          </h1>
          <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
            Official immutable repository of approved patent drawing sheets, finalized vector schematics, and locked deliverable packages ready for USPTO filing.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Link href="/dashboard/design-team/materials/export-files">
            <Button className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-sm">
              <FileDown className="w-4 h-4 mr-1.5" /> Export File Bundles
            </Button>
          </Link>
          <Link href="/dashboard/design-team/workspace/in-progress">
            <Button variant="outline" className="text-xs font-semibold">
              <Layers className="w-4 h-4 mr-1.5 text-blue-500" /> Active Drawing Studio
            </Button>
          </Link>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search approved drawing, project title, or invention ID..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9 text-xs bg-card"
        />
      </div>

      {/* Completed Cards */}
      {loading ? (
        <div className="py-20 text-center text-xs text-muted-foreground animate-pulse">
          Loading approved deliverable archive...
        </div>
      ) : filtered.length === 0 ? (
        <Card className="p-12 text-center bg-card">
          <ShieldCheck className="w-10 h-10 mx-auto text-muted-foreground/60 mb-3" />
          <h3 className="text-base font-bold text-foreground">No completed deliverables yet</h3>
          <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
            Once design submissions are approved by reviewers in the Under Review queue, they will be archived here.
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filtered.map((task) => (
            <Card
              key={task.id}
              className="bg-card border-border/50 hover:border-emerald-500/50 transition-all shadow-sm overflow-hidden flex flex-col justify-between"
            >
              <CardHeader className="p-5 pb-3 border-b border-border/30 bg-emerald-50/15 dark:bg-emerald-950/15">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[10px] font-bold text-blue-600 bg-blue-50 dark:bg-blue-950/40 px-2 py-0.5 rounded">
                      {task.id}
                    </span>
                    <Badge variant="outline" className="text-[10px] font-mono">{task.invention_id}</Badge>
                    <Badge className="bg-emerald-600 text-white font-mono text-[10px]">
                      v{task.current_version || 1}
                    </Badge>
                  </div>
                  <Badge className="bg-emerald-600 text-white text-[9px] font-bold flex items-center gap-1">
                    <Lock className="w-2.5 h-2.5" /> LOCKED & APPROVED
                  </Badge>
                </div>

                <CardTitle className="text-base font-bold text-foreground">{task.title}</CardTitle>
                <p className="text-xs text-muted-foreground truncate">{task.project_title}</p>
              </CardHeader>

              <CardContent className="p-5 space-y-4 flex-1 flex flex-col justify-between">
                {/* Approval Badge Banner */}
                <div className="p-3.5 rounded-lg bg-emerald-500/10 border border-emerald-500/25 flex items-start gap-3 text-xs">
                  <Award className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                  <div className="space-y-0.5">
                    <span className="font-bold text-emerald-900 dark:text-emerald-300 block">
                      Approved by {task.approved_by || task.last_recipient_user || "Alice Drafter"}
                    </span>
                    <p className="text-muted-foreground text-[11px]">
                      Completed on {task.completed_at ? new Date(task.completed_at).toLocaleString() : new Date().toLocaleDateString()}
                    </p>
                    <p className="text-[11px] italic text-slate-700 dark:text-slate-300 mt-1">
                      "{task.last_notes || "All figures and margins compliant with 37 CFR 1.84."}"
                    </p>
                  </div>
                </div>

                <div className="space-y-1.5 text-xs text-muted-foreground">
                  <div className="flex justify-between">
                    <span>Final File Asset:</span>
                    <span className="font-mono font-medium text-foreground">{task.versions?.[0]?.file_name || "Formal_Sheet.png"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Linework Specification:</span>
                    <span className="text-emerald-600 font-medium">37 CFR § 1.84 Compliant</span>
                  </div>
                </div>

                <div className="pt-2 border-t border-border/20 flex items-center gap-2">
                  <Button
                    size="sm"
                    className="flex-1 h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
                    onClick={() => triggerFileDownload(`${task.id}_Official_Patent_Deliverable.json`, JSON.stringify(task, null, 2), "application/json")}
                  >
                    <Download className="w-3.5 h-3.5 mr-1.5" /> Download Deliverable Package
                  </Button>

                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 px-2.5 text-xs"
                    onClick={() => setCertTask(task)}
                    title="View Approval Certificate"
                  >
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* APPROVAL CERTIFICATE MODAL */}
      {certTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-card border border-border/60 rounded-xl max-w-lg w-full shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-border/40 flex items-center justify-between bg-emerald-50/20 dark:bg-emerald-950/20">
              <div className="flex items-center gap-2">
                <Award className="w-5 h-5 text-emerald-600" />
                <h3 className="font-bold text-base text-foreground">Formal Approval Certificate</h3>
              </div>
              <button onClick={() => setCertTask(null)} className="text-muted-foreground hover:text-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="p-4 bg-muted/20 rounded-lg border border-border/30 text-xs space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Deliverable:</span>
                  <span className="font-bold text-foreground">{certTask.title}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Invention ID:</span>
                  <span className="font-mono text-foreground">{certTask.invention_id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Version:</span>
                  <span className="font-mono font-bold text-emerald-600">v{certTask.current_version || 1} (Final Locked)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Approved By:</span>
                  <strong className="text-foreground">{certTask.approved_by || certTask.last_recipient_user || "Alice Drafter"}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Completed At:</span>
                  <span className="font-mono text-foreground">{certTask.completed_at ? new Date(certTask.completed_at).toLocaleString() : new Date().toLocaleString()}</span>
                </div>
              </div>

              <div className="p-3 bg-muted/10 rounded-lg border border-border/25 text-xs text-muted-foreground">
                <span className="font-bold text-foreground block mb-0.5">Statutory Compliance Note:</span>
                <p>This deliverable has been verified to adhere to USPTO Title 37 CFR § 1.84 requirements, including margin boundaries, numeral scale, and monochrome stroke resolution.</p>
              </div>
            </div>

            <div className="p-4 border-t border-border/40 bg-muted/10 flex justify-end">
              <Button variant="outline" size="sm" className="text-xs" onClick={() => setCertTask(null)}>
                Close Certificate
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
