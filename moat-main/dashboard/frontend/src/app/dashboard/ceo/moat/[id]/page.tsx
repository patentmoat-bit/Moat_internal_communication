"use client";

import { useState, useEffect, useCallback, use } from "react";
import Link from "next/link";
import {
  ArrowLeft, CheckCircle2, Activity, Search, Target, User, BarChart2, Calendar, FileDown, Layers, FileText, Check, X, Clock,
  Upload, Download, Share2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

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

export default function CeoProjectWorkspacePage({ params }: { params: Promise<{ id: string }> }) {
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
          actionUrl: `/dashboard/ceo/moat/${project.id}`
        })
      });
      await fetchProject();
    } catch (err) {
      console.error("Failed to trigger event", err);
    } finally {
      setPublishing(false);
    }
  };

  if (loading) {
    return <div className="p-20 text-center text-muted-foreground">Loading CEO Workspace...</div>;
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
        <Link href="/dashboard/ceo/moat"><ArrowLeft className="h-4 w-4 mr-1" />Back to CEO Workspace</Link>
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
            { id: 'searches', label: 'Search Queries', icon: Search },
            { id: 'review', label: 'CEO Review', icon: Search },
            { id: 'documents', label: 'Documents', icon: FileDown },
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
            </div>
          </div>
        )}

        {activeTab === 'review' && (
          <div className="space-y-6">
            <div className="text-center py-8">
              <h2 className="text-2xl font-bold tracking-tight mb-2">Executive Action Center</h2>
              <p className="text-muted-foreground">Approve or reject reports, or process to Finance.</p>
            </div>
            
            <div className="flex justify-center items-center gap-6 pb-12">
               <Button 
                 variant="outline" 
                 size="lg"
                 className="gap-2 border-rose-500/30 text-rose-500 hover:bg-rose-500/10"
                 disabled={publishing} 
                 onClick={() => triggerEvent("CEO_REJECTED", `CEO rejected the report for ${project.title}`)}
               >
                 <X className="h-5 w-5" /> Reject / Request Revision
               </Button>
               <Button 
                 size="lg"
                 className="gap-2 bg-[#c9a84c] text-black hover:bg-[#b8943d]" 
                 disabled={publishing} 
                 onClick={() => triggerEvent("CEO_APPROVED", `CEO approved the report for ${project.title}`)}
               >
                 <Check className="h-5 w-5" /> Approve & Forward to Finance
               </Button>
            </div>
          </div>
        )}

        {activeTab === 'documents' && (
          <DocumentsWorkspacePanel projectId={project.id} triggerEvent={triggerEvent} publishing={publishing} projectTitle={project.title} />
        )}

        {activeTab === 'activity' && (
          <div className="flex flex-col items-center justify-center py-32 text-center border border-dashed border-border/40 rounded-xl bg-muted/5">
            <Activity className="h-12 w-12 text-muted-foreground/30 mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-1 capitalize">Activity Workspace</h3>
            <p className="text-sm text-muted-foreground">This module will be populated as the workflow progresses.</p>
          </div>
        )}

        {activeTab === 'searches' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold tracking-tight">Project Search Queries</h2>
              <Button asChild size="sm" className="bg-[#c9a84c] text-white hover:bg-[#b8943d]">
                <Link href="/dashboard/search">New Search</Link>
              </Button>
            </div>
            
            <ProjectSearchesPanel projectId={project.id} />
          </div>
        )}
      </div>
    </div>
  );
}

// Sub-component for Search Queries
function ProjectSearchesPanel({ projectId }: { projectId: string }) {
  const [queries, setQueries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchQueries = useCallback(async () => {
    try {
      const res = await fetch(`/api/research-projects/${projectId}/searches`);
      if (res.ok) {
        const json = await res.json();
        setQueries(json.data || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchQueries();
  }, [fetchQueries]);

  const removeQuery = async (searchId: string) => {
    try {
      await fetch(`/api/research-projects/${projectId}/searches/${searchId}`, { method: 'DELETE' });
      fetchQueries();
    } catch (e) {
      console.error(e);
    }
  };

  const executeQuery = async (searchId: string) => {
    try {
      await fetch(`/api/research-projects/${projectId}/searches/${searchId}/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ results: [{ id: "MOCK-1", relevance_score: 95 }] }) // Mock for demo
      });
      fetchQueries();
    } catch (e) {
      console.error(e);
    }
  };

  if (loading) return <div className="p-8 text-center text-sm text-muted-foreground">Loading queries...</div>;
  if (queries.length === 0) return (
    <div className="p-12 text-center border border-dashed border-border/40 rounded-xl bg-muted/5">
      <Search className="h-8 w-8 text-muted-foreground/30 mb-3 mx-auto" />
      <p className="text-sm text-muted-foreground">No search queries saved to this project yet.</p>
    </div>
  );

  return (
    <div className="space-y-4">
      {queries.map((q: any) => (
        <Card key={q.id} className="bg-card border-border/40">
          <CardContent className="p-4 flex flex-col md:flex-row gap-4 justify-between items-center">
            <div className="flex-1 space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-sm">{q.saved_queries?.name}</span>
                <Badge variant="outline" className="text-[10px]">{q.execution_status}</Badge>
              </div>
              <p className="text-xs text-muted-foreground truncate max-w-lg">{q.saved_queries?.description || 'No description'}</p>
              <div className="text-[10px] text-muted-foreground font-mono mt-2">
                Last Run: {q.last_executed_at ? new Date(q.last_executed_at).toLocaleString() : 'Never'}
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={() => executeQuery(q.saved_queries?.id)} variant="outline" size="sm" className="h-8 text-xs border-[#c9a84c]/30 text-[#c9a84c] hover:bg-[#c9a84c]/10">Run Again</Button>
              <Button asChild variant="outline" size="sm" className="h-8 text-xs"><Link href={`/dashboard/search?edit=${q.saved_queries?.id}`}>Edit</Link></Button>
              <Button asChild variant="outline" size="sm" className="h-8 text-xs"><Link href="/dashboard/comparison">Compare</Link></Button>
              <Button onClick={() => removeQuery(q.saved_queries?.id)} variant="ghost" size="sm" className="h-8 text-xs text-rose-500 hover:text-rose-600 hover:bg-rose-500/10">Remove</Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// Sub-component for Documents Workspace
function DocumentsWorkspacePanel({ projectId, triggerEvent, publishing, projectTitle }: { projectId: string, triggerEvent: any, publishing: boolean, projectTitle: string }) {
  // A mock list of documents for demo purposes
  const [mockDocuments, setMockDocuments] = useState([
    { id: '1', name: 'Prior_Art_Search_Results.pdf', type: 'PDF', size: '2.4 MB', uploadedAt: new Date().toISOString() },
    { id: '2', name: 'Invention_Disclosure_Form.docx', type: 'Word', size: '1.1 MB', uploadedAt: new Date().toISOString() },
  ]);

  const handleImport = () => {
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.onchange = (e: any) => {
      const file = e.target.files[0];
      if (file) {
        setMockDocuments(prev => [{
          id: Math.random().toString(),
          name: file.name,
          type: file.name.split('.').pop().toUpperCase() || 'Unknown',
          size: (file.size / (1024 * 1024)).toFixed(2) + ' MB',
          uploadedAt: new Date().toISOString()
        }, ...prev]);
        triggerEvent("DOCUMENT_UPLOADED", `New document ${file.name} was imported for ${projectTitle}`);
      }
    };
    fileInput.click();
  };

  const handleExportAll = () => {
    // Generate a simple text file with the list of documents
    const content = mockDocuments.map(d => `${d.name} (${d.size}) - ${d.type}`).join('\n');
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${projectTitle.replace(/\s+/g, '_')}_documents_export.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold tracking-tight">Project Documents</h2>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="gap-2" onClick={handleImport}>
            <Upload className="h-4 w-4" /> Import Document
          </Button>
          <Button variant="outline" size="sm" className="gap-2" onClick={handleExportAll}>
            <Download className="h-4 w-4" /> Export All
          </Button>
        </div>
      </div>
      
      <div className="grid gap-4">
        {mockDocuments.map(doc => (
          <Card key={doc.id} className="bg-card border-border/40">
            <CardContent className="p-4 flex flex-col md:flex-row gap-4 justify-between items-center">
              <div className="flex items-center gap-4">
                <div className="p-2 bg-[#c9a84c]/10 rounded-lg">
                  <FileText className="h-6 w-6 text-[#c9a84c]" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm">{doc.name}</h3>
                  <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                    <span>{doc.type}</span>
                    <span>•</span>
                    <span>{doc.size}</span>
                    <span>•</span>
                    <span>{new Date(doc.uploadedAt).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-8 w-8 hover:text-[#c9a84c] hover:bg-[#c9a84c]/10"
                  onClick={() => {
                    const blob = new Blob(['Mock file content for ' + doc.name], { type: 'text/plain' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = doc.name;
                    a.click();
                    URL.revokeObjectURL(url);
                  }}
                >
                  <Download className="h-4 w-4" />
                </Button>
                
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8 hover:text-[#c9a84c] hover:bg-[#c9a84c]/10">
                      <Share2 className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem 
                      disabled={publishing}
                      onClick={() => triggerEvent("DOCUMENT_SHARED_ANALYST", `CEO shared ${doc.name} with Patent Analyst for ${projectTitle}`)}
                    >
                      Share with Patent Analyst
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      disabled={publishing}
                      onClick={() => triggerEvent("DOCUMENT_SHARED_DRAFTER", `CEO shared ${doc.name} with Patent Drafter for ${projectTitle}`)}
                    >
                      Share with Patent Drafter
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      disabled={publishing}
                      onClick={() => triggerEvent("DOCUMENT_SHARED_DESIGNER", `CEO shared ${doc.name} with Design Team for ${projectTitle}`)}
                    >
                      Share with Design Team
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
