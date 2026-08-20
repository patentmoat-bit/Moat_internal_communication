"use client";

import { useState, useEffect, useCallback, use } from "react";
import Link from "next/link";
import {
  ArrowLeft, CheckCircle2, Circle, Clock, FileText, Activity, Search,
  Cpu, Target, User, BarChart2, Calendar, FileDown, Layers, BrainCircuit
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const STATUS_STAGES = [
  "NEW",
  "ASSIGNED",
  "RESEARCH",
  "ANALYSIS",
  "DRAFTING",
  "REVIEW",
  "CEO REVIEW",
  "APPROVED",
  "COMPLETED"
];

const STATUS_COLORS: Record<string, string> = {
  NEW:      "bg-blue-500/15 text-blue-400 border-blue-500/30",
  ASSIGNED: "bg-indigo-500/15 text-indigo-400 border-indigo-500/30",
  RESEARCH: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  ANALYSIS: "bg-orange-500/15 text-orange-400 border-orange-500/30",
  DRAFTING: "bg-purple-500/15 text-purple-400 border-purple-500/30",
  REVIEW:   "bg-pink-500/15 text-pink-400 border-pink-500/30",
  "CEO REVIEW": "bg-rose-500/15 text-rose-400 border-rose-500/30",
  APPROVED: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  COMPLETED:"bg-emerald-600/15 text-emerald-500 border-emerald-600/30",
};

export default function ProjectWorkspacePage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const { id } = resolvedParams;
  
  const [project, setProject] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");
  const [publishing, setPublishing] = useState(false);

  const fetchProject = useCallback(async () => {
    try {
      const res = await fetch(`/api/moat/${id}`);
      if (res.ok) {
        const data = await res.json();
        setProject(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchProject();
  }, [fetchProject]);

  const triggerEvent = async (eventType: string, message: string) => {
    setPublishing(true);
    try {
      await fetch('/api/workflow/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: eventType,
          resourceId: project.id,
          resourceType: 'invention',
          notificationTitle: 'Workflow Update',
          notificationMessage: message,
          actionUrl: `/dashboard/research/moat/${project.id}`
        })
      });
      // Refresh project to reflect new status
      await fetchProject();
    } catch (err) {
      console.error("Failed to trigger event", err);
    } finally {
      setPublishing(false);
    }
  };

  if (loading) {
    return <div className="p-20 text-center text-muted-foreground">Loading Project Workspace...</div>;
  }

  if (!project) {
    return <div className="p-20 text-center text-rose-400">Project not found or unauthorized.</div>;
  }

  const statStr = (project.status || 'NEW').toUpperCase();
  const currentStageIndex = STATUS_STAGES.indexOf(statStr);
  const progress = Math.max(5, Math.floor(((currentStageIndex + 1) / STATUS_STAGES.length) * 100));

  return (
    <div className="mx-auto max-w-7xl space-y-6 pb-16">
      {/* ── Top Nav ── */}
      <Button variant="ghost" size="sm" asChild className="text-muted-foreground hover:text-foreground -ml-2">
        <Link href="/dashboard/research/moat"><ArrowLeft className="h-4 w-4 mr-1" />Back to Assigned Projects</Link>
      </Button>

      {/* ── PROJECT HEADER ── */}
      <Card className="border-[#c9a84c]/30 bg-card shadow-lg shadow-[#c9a84c]/5 overflow-hidden">
        <div className="h-1.5 w-full bg-muted/30">
          <div className="h-full bg-[#c9a84c] transition-all duration-1000" style={{ width: `${progress}%` }} />
        </div>
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row justify-between gap-6">
            <div className="space-y-4 flex-1">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="outline" className={`uppercase ${STATUS_COLORS[statStr] || STATUS_COLORS['NEW']}`}>
                    {statStr}
                  </Badge>
                  <span className="text-xs text-muted-foreground font-mono">ID: {project.id.split('-')[0]}</span>
                </div>
                <h1 className="text-3xl font-bold tracking-tight text-foreground">{project.title}</h1>
              </div>

              <div className="flex flex-wrap gap-x-8 gap-y-3 text-sm">
                <div className="space-y-1">
                  <span className="text-xs text-muted-foreground uppercase tracking-wider">Creator (CEO)</span>
                  <div className="flex items-center gap-1.5 font-medium"><User className="h-4 w-4 text-[#c9a84c]" /> {project.user_id || 'System'}</div>
                </div>
                <div className="space-y-1">
                  <span className="text-xs text-muted-foreground uppercase tracking-wider">Assigned Analyst</span>
                  <div className="flex items-center gap-1.5 font-medium"><Target className="h-4 w-4 text-[#c9a84c]" /> {project.assigned_to || 'Unassigned'}</div>
                </div>
                <div className="space-y-1">
                  <span className="text-xs text-muted-foreground uppercase tracking-wider">Priority</span>
                  <div className="flex items-center gap-1.5 font-medium"><Activity className="h-4 w-4 text-[#c9a84c]" /> {project.metadata?.priority || 'Medium'}</div>
                </div>
                <div className="space-y-1">
                  <span className="text-xs text-muted-foreground uppercase tracking-wider">Due Date</span>
                  <div className="flex items-center gap-1.5 font-medium"><Calendar className="h-4 w-4 text-[#c9a84c]" /> {project.due_date ? new Date(project.due_date).toLocaleDateString() : 'N/A'}</div>
                </div>
              </div>
            </div>
            
            <div className="flex flex-col justify-center items-center p-6 bg-muted/10 rounded-xl border border-border/50 min-w-[160px]">
              <span className="text-4xl font-bold text-[#c9a84c]">{progress}%</span>
              <span className="text-xs text-muted-foreground uppercase tracking-wider mt-1">Overall Progress</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── PROJECT WORKFLOW STEPPER ── */}
      <div className="px-2 overflow-x-auto pb-4 custom-scrollbar">
        <div className="flex items-center min-w-[800px]">
          {STATUS_STAGES.map((stage, idx) => {
            const isCompleted = idx < currentStageIndex;
            const isCurrent = idx === currentStageIndex;
            const isPending = idx > currentStageIndex;
            
            return (
              <div key={stage} className="flex-1 flex items-center relative">
                <div className="flex flex-col items-center gap-2 relative z-10 w-full">
                  <div className={`h-8 w-8 rounded-full flex items-center justify-center border-2 transition-colors ${
                    isCompleted ? 'bg-[#c9a84c] border-[#c9a84c] text-black' :
                    isCurrent ? 'bg-background border-[#c9a84c] text-[#c9a84c]' :
                    'bg-background border-border text-muted-foreground'
                  }`}>
                    {isCompleted ? <CheckCircle2 className="h-5 w-5" /> : <span className="text-xs font-bold">{idx + 1}</span>}
                  </div>
                  <span className={`text-[10px] uppercase font-bold tracking-wider text-center ${
                    isCurrent ? 'text-foreground' : 'text-muted-foreground'
                  }`}>{stage}</span>
                </div>
                {idx < STATUS_STAGES.length - 1 && (
                  <div className={`absolute top-4 left-[50%] right-[-50%] h-[2px] -z-10 ${
                    isCompleted ? 'bg-[#c9a84c]' : 'bg-border'
                  }`} />
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* ── WORKSPACE TABS ── */}
      <div className="border-b border-border/40">
        <nav className="flex gap-1" aria-label="Tabs">
          {[
            { id: 'overview', label: 'Overview', icon: Layers },
            { id: 'research', label: 'Research', icon: Search },
            { id: 'analysis', label: 'Analysis', icon: BarChart2 },
            { id: 'documents', label: 'Documents', icon: FileDown },
            { id: 'reports', label: 'Reports', icon: FileText },
            { id: 'activity', label: 'Activity', icon: Clock }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-[#c9a84c] text-[#c9a84c] bg-[#c9a84c]/5'
                  : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
              }`}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* ── TAB CONTENT ── */}
      <div className="pt-2">
        {/* OVERVIEW TAB */}
        {activeTab === 'overview' && (
          <div className="grid md:grid-cols-3 gap-6">
            <div className="md:col-span-2 space-y-6">
              <Card className="bg-card border-border/40">
                <CardHeader>
                  <CardTitle className="text-sm text-muted-foreground uppercase tracking-wider">Project Description</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm leading-relaxed">{project.description || "No description provided."}</p>
                </CardContent>
              </Card>
              <Card className="bg-card border-border/40">
                <CardHeader>
                  <CardTitle className="text-sm text-muted-foreground uppercase tracking-wider">Technology / Invention Field</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm font-medium">{project.technical_field || "N/A"}</p>
                </CardContent>
              </Card>
            </div>
            <div className="space-y-6">
              <Card className="bg-card border-border/40">
                <CardHeader>
                  <CardTitle className="text-sm text-muted-foreground uppercase tracking-wider">Business Objective</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-[#c9a84c] font-medium">{project.metadata?.business_objective || "Not specified"}</p>
                </CardContent>
              </Card>
              <Card className="bg-card border-border/40">
                <CardHeader>
                  <CardTitle className="text-sm text-muted-foreground uppercase tracking-wider">Recent Activity</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex gap-3 text-sm">
                      <div className="mt-0.5"><CheckCircle2 className="h-4 w-4 text-[#c9a84c]" /></div>
                      <div>
                        <p className="font-medium text-foreground">Project Assigned</p>
                        <p className="text-xs text-muted-foreground">{new Date(project.created_at).toLocaleDateString()}</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* RESEARCH TAB */}
        {activeTab === 'research' && (
          <div className="space-y-6">
            <div className="text-center py-8">
              <h2 className="text-2xl font-bold tracking-tight mb-2">How would you like to research?</h2>
              <p className="text-muted-foreground">Select a methodology to begin evidence gathering.</p>
            </div>
            
            <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
              <Card className="hover:border-[#c9a84c]/50 transition-colors cursor-pointer group bg-card">
                <CardContent className="p-8 text-center space-y-4">
                  <div className="h-16 w-16 rounded-2xl bg-muted flex items-center justify-center mx-auto group-hover:bg-[#c9a84c]/10 transition-colors">
                    <Search className="h-8 w-8 text-muted-foreground group-hover:text-[#c9a84c] transition-colors" />
                  </div>
                  <h3 className="text-xl font-bold">Traditional Patent Search</h3>
                  <p className="text-sm text-muted-foreground">
                    Manual patent research using Boolean, CPC, Keyword, and Assignee filters. No AI-generated patent results.
                  </p>
                  <Button 
                    variant="outline" 
                    className="w-full mt-4 group-hover:border-[#c9a84c] group-hover:text-[#c9a84c]"
                    onClick={() => triggerEvent("RESEARCH_STARTED", `Patent Analyst started traditional research on ${project.title}`)}
                    disabled={publishing}
                  >
                    Launch Traditional Search
                  </Button>
                </CardContent>
              </Card>

              <Card className="hover:border-[#c9a84c]/50 transition-colors cursor-pointer group bg-card border-[#c9a84c]/20 shadow-[0_0_15px_rgba(201,168,76,0.05)]">
                <CardContent className="p-8 text-center space-y-4">
                  <div className="h-16 w-16 rounded-2xl bg-[#c9a84c]/10 flex items-center justify-center mx-auto">
                    <BrainCircuit className="h-8 w-8 text-[#c9a84c]" />
                  </div>
                  <h3 className="text-xl font-bold">MOAT AI HUB</h3>
                  <p className="text-sm text-muted-foreground">
                    AI-assisted intelligence layer for query suggestions, summarization, claim analysis, and prior art interpretation.
                  </p>
                  <Button 
                    className="w-full mt-4 bg-[#c9a84c] text-black hover:bg-[#b8943d]"
                    onClick={() => triggerEvent("RESEARCH_STARTED", `Patent Analyst launched AI Hub for ${project.title}`)}
                    disabled={publishing}
                  >
                    Launch AI Assistant
                  </Button>
                </CardContent>
              </Card>
            </div>
            
            {/* Action Bar for further transitions */}
            <div className="flex justify-center pt-8 border-t border-border/40 gap-4">
               <Button variant="outline" disabled={publishing} onClick={() => triggerEvent("RESEARCH_COMPLETED", `Patent Analyst completed research on ${project.title}`)}>
                 Complete Research & Start Draft
               </Button>
               <Button disabled={publishing} className="bg-[#c9a84c] text-black hover:bg-[#b8943d]" onClick={() => triggerEvent("REPORT_SUBMITTED", `Patent Analyst submitted report for ${project.title}`)}>
                 Submit Report to CEO
               </Button>
            </div>
          </div>
        )}

        {/* OTHER TABS (Placeholders for UI completion) */}
        {['analysis', 'documents', 'reports', 'activity'].includes(activeTab) && (
          <div className="flex flex-col items-center justify-center py-32 text-center border border-dashed border-border/40 rounded-xl bg-muted/5">
            <Activity className="h-12 w-12 text-muted-foreground/30 mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-1 capitalize">{activeTab} Workspace</h3>
            <p className="text-sm text-muted-foreground">This module will be populated as the workflow progresses.</p>
          </div>
        )}
      </div>
    </div>
  );
}
