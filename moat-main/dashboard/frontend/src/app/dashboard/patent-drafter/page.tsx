"use client";

import React, { useEffect, useMemo, useState, useRef } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { 
  Award, ShieldAlert, Sparkles, Building2, 
  Layers, CheckCircle, Scale, Users,
  ShieldCheck, Stamp, Bell, Loader2, Copyright,
  Activity, Search, Upload, FileText, Target, MoreHorizontal,
  Plus
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { DocumentTimeline } from "@/components/documents/DocumentTimeline";
import { VersionHistoryTable } from "@/components/documents/VersionHistoryTable";
import { CommentThread } from "@/components/documents/CommentThread";
import { createClient } from "@/lib/supabase/client";
import { ceoPatentService, DBInvention, DBActivityLog, DBAlert } from "@/services/ceoPatentService";

export default function PatentDrafterWorkspacePage() {
  const [projects, setProjects] = useState<DBInvention[]>([]);
  const [activityLogs, setActivityLogs] = useState<DBActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeMainTab, setActiveMainTab] = useState<"Dashboard" | "Document Drafts">("Dashboard");
  const { toast } = useToast();
  const supabase = createClient();

  // Document specific state
  const [documents, setDocuments] = useState<any[]>([]);
  const [selectedDoc, setSelectedDoc] = useState<any | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);

  // Read via ref inside the realtime callback so the subscription doesn't
  // need to be torn down and recreated every time the user clicks a
  // different row, and so the callback doesn't permanently close over the
  // initial (null) value of selectedDoc.
  const selectedDocRef = useRef<any | null>(null);
  useEffect(() => {
    selectedDocRef.current = selectedDoc;
  }, [selectedDoc]);

  useEffect(() => {
    fetchStats();
    fetchDocuments();

    const channel = supabase
      .channel("drafter-updates")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "patent_documents" },
        () => {
          fetchDocuments();
          if (selectedDocRef.current) fetchDocDetails(selectedDocRef.current.id);
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "activity_logs" },
        () => {
          fetchStats();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchStats = async () => {
    try {
      const [p, aRes] = await Promise.all([
        ceoPatentService.getProjects(),
        ceoPatentService.getNotifications()
      ]);
      setProjects(p);
      setActivityLogs(aRes || []);
    } catch (e) {
      console.error("Failed to fetch dashboard stats", e);
    } finally {
      setLoading(false);
    }
  };

  const fetchDocuments = async () => {
    try {
      const res = await fetch("/api/documents");
      const data = await res.json();
      if (data.success) {
        setDocuments(data.data);
      }
    } catch (e) {
      console.error("Failed to fetch documents", e);
    }
  };

  const createDraft = async () => {
    if (!newTitle) return;
    try {
      const res = await fetch("/api/documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: newTitle }),
      });
      const data = await res.json();
      if (data.success) {
        toast({ title: "Draft created successfully" });
        setIsCreating(false);
        setNewTitle("");
        fetchDocuments();
      } else {
        toast({ title: "Error", description: data.error?.message || data.error || "Failed to create draft", variant: "destructive" });
      }
    } catch (e) {
      toast({ title: "Error", description: "Unable to create draft", variant: "destructive" });
    }
  };

  const fetchDocDetails = async (id: string | undefined) => {
    if (!id) return;
    try {
      const res = await fetch(`/api/documents/${id}`);
      const data = await res.json();
      if (data.success) {
        if (data.data && data.data.document_versions && data.data.document_versions.length > 0) {
          const sorted = [...data.data.document_versions].sort((a,b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
          data.data.document_versions = [sorted[0]]; 
        }
        setSelectedDoc(data.data);
      }
    } catch (e) {
      toast({ title: "Error", description: "Failed to fetch details", variant: "destructive" });
    }
  };

  const transitionStatus = async (newStatus: string) => {
    if (!selectedDoc) return;
    try {
      const res = await fetch(`/api/documents/${selectedDoc.id}/transition`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ new_status: newStatus, current_status: selectedDoc.status }), 
      });
      const data = await res.json();
      if (data.success) {
        toast({ title: "Success", description: `Project status updated to ${newStatus}.` });
        fetchDocDetails(selectedDoc.id);
        fetchDocuments();
      }
    } catch (e) {
      toast({ title: "Error", description: "Failed to update status", variant: "destructive" });
    }
  };

  const uploadVersion = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0] || !selectedDoc) return;
    const file = e.target.files[0];
    setIsUploading(true);
    
    try {
      const ext = file.name.split(".").pop();
      const path = `drafts/${Date.now()}_${Math.random().toString(36).substring(2, 9)}.${ext}`;
      
      const formData = new FormData();
      formData.append("file", file);
      formData.append("bucket", "patent_documents");
      formData.append("path", path);

      const uploadRes = await fetch("/api/upload", { method: "POST", body: formData });
      const uploadData = await uploadRes.json();
      
      if (!uploadData.success) throw new Error("Upload failed");
      
      const versionPayload = {
        file_name: file.name,
        file_url: uploadData.url,
        file_size: file.size,
        mime_type: file.type,
      };

      const res = await fetch(`/api/documents/${selectedDoc.id}/versions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(versionPayload),
      });

      const resData = await res.json();
      if (resData.success) {
        toast({ title: "Success", description: "Draft uploaded successfully." });
        transitionStatus("Draft");
        fetchDocDetails(selectedDoc.id);
      }
    } catch (err: any) {
      toast({ title: "Error", description: "Upload failed", variant: "destructive" });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleAddComment = async (text: string) => {
    if (!selectedDoc) return;
    try {
      const res = await fetch(`/api/documents/${selectedDoc.id}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ comment_text: text }),
      });
      if (res.ok) {
        fetchDocDetails(selectedDoc.id);
      }
    } catch (e) {
      toast({ title: "Error", description: "Could not add comment.", variant: "destructive" });
    }
  };

  // Dashboard Stats
  const pStats = useMemo(() => {
    let drafting = 0, pending = 0, awaiting = 0, granted = 0;
    projects.forEach(p => {
      const s = (p.status || "").toLowerCase();
      if (s.includes("draft")) drafting++;
      else if (s.includes("review")) pending++;
      else if (s.includes("ceo") || s.includes("approval")) awaiting++;
      else if (s.includes("approved") || s.includes("filed") || s.includes("completed")) granted++;
    });
    return { total: projects.length, drafting, pending, awaiting, granted };
  }, [projects]);

  return (
    <div className="mx-auto max-w-screen-2xl space-y-6 pb-14 px-4 sm:px-6 lg:px-8 bg-[#fdfdfc] dark:bg-background min-h-screen">
      {/* Light/Dark Header Banner */}
      <div className="-mx-4 sm:-mx-6 lg:-mx-8 rounded-none overflow-hidden shadow-sm mb-6 bg-gradient-to-r from-[#fdfbf7] to-[#f4ead5] dark:from-[#110e0a] dark:to-[#0a0805] border-b border-[#e8d5b5] dark:border-[#332b1a] relative">
        <div className="absolute -right-20 -top-20 w-96 h-96 bg-white/50 dark:bg-white/5 blur-3xl rounded-full z-0" />
        <div className="absolute right-40 bottom-[-50px] w-64 h-64 bg-[#af8f3d]/10 dark:bg-[#c9a84c]/10 blur-2xl rounded-full z-0" />
        
        <div className="relative z-10 px-8 sm:px-10 lg:px-16 py-8 flex flex-col lg:flex-row items-center justify-between">
          <div className="w-full lg:w-auto mb-6 lg:mb-0">
            <h1 className="text-2xl font-bold tracking-tight mb-4 text-[#5a4315] dark:text-[#d6b77a]">
              Draft Innovation. Secure Intellectual Property.
            </h1>
            <div className="flex items-center gap-4 text-[13px] font-semibold text-[#8a6b2d] dark:text-[#a38a58]">
              <div className="flex items-center gap-1.5">
                <FileText className="w-4 h-4" />
                <span>Draft</span>
              </div>
              <div className="w-1 h-1 rounded-full bg-[#c2a670] dark:bg-[#c9a84c]" />
              <div className="flex items-center gap-1.5">
                <Users className="w-4 h-4" />
                <span>Review</span>
              </div>
              <div className="w-1 h-1 rounded-full bg-[#c2a670] dark:bg-[#c9a84c]" />
              <div className="flex items-center gap-1.5">
                <CheckCircle className="w-4 h-4" />
                <span>Approve</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-6 border-b pb-0 mb-6 px-2">
        {["Dashboard", "Document Drafts"].map((tab) => (
          <span 
            key={tab}
            onClick={() => setActiveMainTab(tab as any)}
            className={`text-sm cursor-pointer transition-colors px-2 py-3 ${
              activeMainTab === tab 
                ? "font-bold text-foreground border-b-2 border-[#c9a84c]" 
                : "font-medium text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab}
          </span>
        ))}
      </div>

      {activeMainTab === "Dashboard" && (
        <>
          <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
            {[
              { label: "Active Drafts", value: pStats.drafting.toString(), icon: FileText, colorClass: "text-amber-500", bgClass: "bg-amber-500/10 border-amber-500/20" },
              { label: "Pending Review", value: pStats.pending.toString(), icon: Search, colorClass: "text-blue-500", bgClass: "bg-blue-500/10 border-blue-500/20" },
              { label: "Awaiting CEO", value: pStats.awaiting.toString(), icon: ShieldAlert, colorClass: "text-purple-500", bgClass: "bg-purple-500/10 border-purple-500/20" },
              { label: "Approved", value: pStats.granted.toString(), icon: CheckCircle, colorClass: "text-emerald-500", bgClass: "bg-emerald-500/10 border-emerald-500/20" },
            ].map((metric, idx) => (
              <Card key={idx} className="border border-border/40 shadow-sm hover:shadow-md transition-shadow bg-white dark:bg-card rounded-xl">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground mb-1">{metric.label}</p>
                      <p className="text-3xl font-black text-foreground">{loading ? "-" : metric.value}</p>
                    </div>
                    <div className={`p-2.5 rounded-xl border ${metric.bgClass}`}>
                      {loading ? <Loader2 className={`h-4 w-4 animate-spin ${metric.colorClass}`} /> : <metric.icon className={`h-5 w-5 ${metric.colorClass}`} />}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="grid gap-6 grid-cols-12">
            {/* Left Col: Projects */}
            <div className="col-span-12 xl:col-span-8">
              <Card className="h-full border border-border/40 shadow-sm bg-white dark:bg-card rounded-xl flex flex-col">
                <CardContent className="p-6 flex-1 flex flex-col">
                  <h2 className="text-base font-bold tracking-tight text-foreground mb-4">Active Workflow Tracker</h2>
                  <div className="flex-1 overflow-x-auto">
                    <table className="w-full text-left text-[13px]">
                      <thead className="text-muted-foreground text-xs border-b">
                        <tr>
                          <th className="pb-3 font-medium">Title</th>
                          <th className="pb-3 font-medium">Stage</th>
                          <th className="pb-3 font-medium">Status</th>
                          <th className="pb-3 font-medium text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/40">
                        {loading ? (
                          <tr><td colSpan={4} className="py-4 text-center">Loading...</td></tr>
                        ) : projects.length === 0 ? (
                          <tr><td colSpan={4} className="py-4 text-center">No projects assigned.</td></tr>
                        ) : (
                          projects.slice(0, 10).map((rw, i) => (
                            <tr key={i} className="hover:bg-muted/20 transition-colors group">
                              <td className="py-3 pr-4 font-bold text-foreground">{rw.title}</td>
                              <td className="py-3 pr-4 text-muted-foreground">Drafting Phase</td>
                              <td className="py-3 pr-4">
                                <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${rw.status.includes('Review') ? 'bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400' : 'bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400'}`}>{rw.status || "Draft"}</span>
                              </td>
                              <td className="py-3 text-right">
                                <Button size="sm" variant="outline" onClick={() => setActiveMainTab("Document Drafts")}>Open Draft</Button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Right Col: Activity */}
            <div className="col-span-12 xl:col-span-4 flex flex-col gap-6">
              <Card className="flex-1 border border-border/40 shadow-sm bg-white dark:bg-card rounded-xl overflow-hidden flex flex-col">
                <CardContent className="p-6 flex-1 flex flex-col">
                  <h2 className="text-base font-bold tracking-tight text-foreground mb-4">Recent Drafter Activity</h2>
                  <div className="space-y-4 flex-1">
                    {activityLogs.length === 0 && <p className="text-xs text-muted-foreground italic">No recent activity.</p>}
                    {activityLogs.slice(0, 7).map((act: any, i) => (
                      <div key={i} className="flex gap-3 items-start">
                        <Activity className="w-4 h-4 mt-0.5 shrink-0 text-blue-500" />
                        <div className="flex-1 flex justify-between gap-4">
                          <p className="text-xs text-foreground leading-tight">{act.message}</p>
                          <span className="text-[10px] text-muted-foreground shrink-0">{new Date(act.created_at).toLocaleDateString()}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </>
      )}

      {activeMainTab === "Document Drafts" && (
        <div className="flex gap-6 h-[75vh]">
          {/* Left Sidebar */}
          <div className="w-1/3 flex flex-col gap-4 overflow-y-auto pr-2 pb-10">
            <div className="flex justify-between items-center bg-white dark:bg-card p-4 rounded-xl shadow-sm border border-border/50">
              <h2 className="text-lg font-bold">Document Drafts</h2>
              <Button size="sm" className="bg-[#c9a84c] hover:bg-[#b09342] text-white" onClick={() => setIsCreating(true)}><Plus className="w-4 h-4" /></Button>
            </div>
            
            {isCreating && (
              <div className="p-4 border rounded-xl bg-white dark:bg-card shadow-sm flex flex-col gap-3">
                <Input placeholder="Enter Patent Title..." value={newTitle} onChange={(e) => setNewTitle(e.target.value)} className="bg-muted/50 border-border/50" />
                <div className="flex gap-2 justify-end">
                  <Button size="sm" variant="ghost" onClick={() => setIsCreating(false)}>Cancel</Button>
                  <Button size="sm" onClick={createDraft} className="bg-[#c9a84c] hover:bg-[#b09342] text-white">Create</Button>
                </div>
              </div>
            )}

            <div className="flex flex-col gap-3">
              {documents.length === 0 ? (
                <div className="p-8 text-center border border-dashed rounded-xl text-muted-foreground bg-muted/20">
                  No document drafts found. Click + to start a new draft.
                </div>
              ) : (
                documents.map((doc) => (
                  <div 
                    key={doc.id} 
                    className={`p-4 border rounded-xl cursor-pointer transition-all ${selectedDoc?.id === doc.id ? 'border-[#c9a84c] bg-[#c9a84c]/5 shadow-sm ring-1 ring-[#c9a84c]/20' : 'hover:border-border bg-white dark:bg-card shadow-sm'}`}
                    onClick={() => {
                      fetchDocDetails(doc.id);
                    }}
                  >
                    <h3 className="font-bold text-sm text-foreground mb-2 leading-snug">{doc.title}</h3>
                    <div className="flex items-center justify-between text-[11px] font-medium text-muted-foreground">
                      <span className="px-2 py-0.5 bg-muted rounded-md text-foreground">{doc.status}</span>
                      <span>{new Date(doc.updated_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Right Content */}
          <div className="w-2/3 bg-white dark:bg-card border border-border/50 rounded-xl shadow-sm p-8 overflow-y-auto pb-20">
            {selectedDoc ? (
              <div className="flex flex-col gap-8 max-w-3xl mx-auto">
                <div className="flex justify-between items-start">
                  <div>
                    <h1 className="text-2xl font-black text-foreground mb-1 uppercase tracking-tight leading-tight">
                      {selectedDoc.title}
                    </h1>
                    <p className="text-muted-foreground text-xs font-mono">Project ID: {selectedDoc.id}</p>
                  </div>
                </div>

                <DocumentTimeline currentStatus={selectedDoc.status} isDrafter={true} />

                {(!selectedDoc.document_versions || selectedDoc.document_versions.length === 0) && (
                  <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-r-lg flex items-start gap-3">
                    <div className="text-amber-500 mt-0.5"><Activity className="w-5 h-5"/></div>
                    <div>
                      <h4 className="text-amber-800 font-bold text-sm">Draft Required</h4>
                      <p className="text-amber-700 text-sm mt-1">Please upload the initial draft document to proceed with the Design and Analyst review cycles.</p>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-6">
                  <div className="flex flex-col gap-4 border border-border/50 p-6 rounded-xl bg-muted/10">
                    <h3 className="font-bold flex items-center gap-2"><Upload className="w-4 h-4 text-[#c9a84c]" /> Upload Version</h3>
                    <p className="text-xs text-muted-foreground">Upload your latest draft here. This will automatically create a new version.</p>
                    
                    <input type="file" ref={fileInputRef} className="hidden" onChange={uploadVersion} accept=".pdf,.doc,.docx" />
                    
                    <Button 
                      onClick={() => fileInputRef.current?.click()} 
                      disabled={isUploading}
                      className="w-full bg-white dark:bg-card text-foreground hover:bg-muted border border-border/50 shadow-sm"
                      variant="outline"
                    >
                      {isUploading ? "Uploading..." : "Select File"}
                    </Button>
                  </div>

                  <CommentThread comments={selectedDoc.review_comments} onAddComment={handleAddComment} />
                </div>

                <div className="mt-2">
                  <h3 className="font-bold mb-4">Version History</h3>
                  {(!selectedDoc.document_versions || selectedDoc.document_versions.length === 0) ? (
                    <div className="p-8 text-center text-muted-foreground border border-dashed rounded-xl bg-muted/10 text-sm">
                      No versions uploaded yet. Upload a file to see history.
                    </div>
                  ) : (
                    <VersionHistoryTable versions={selectedDoc.document_versions} onDownload={async (v) => window.open(v.file_url, '_blank')} />
                  )}
                </div>

                <div className="flex gap-3 justify-end pt-4 border-t border-border/50">
                  {(selectedDoc.status === "Draft" || selectedDoc.status === "Changes Requested") && (
                    <Button onClick={() => transitionStatus("Pending Design Review")} className="bg-[#c9a84c] hover:bg-[#b09342] text-white font-bold px-8">
                      Submit for Design Review
                    </Button>
                  )}
                  {selectedDoc.status === "Waiting for Drafter Review" && (
                    <Button onClick={() => transitionStatus("Waiting for Patent Analyst Review")} className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-8">
                      Submit to Patent Analyst
                    </Button>
                  )}
                </div>
              </div>
            ) : (
              <div className="h-full flex items-center justify-center text-muted-foreground font-medium">
                Select a document draft to view details and upload versions.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
