"use client";

import React, { useState, useEffect } from "react";
import { CheckCircle2, XCircle, AlertCircle, FileText, Activity, Clock, RefreshCw, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { Input } from "@/components/ui/input";
import { DocumentTimeline } from "@/components/documents/DocumentTimeline";
import { VersionHistoryTable } from "@/components/documents/VersionHistoryTable";
import { CommentThread } from "@/components/documents/CommentThread";
import { createClient } from "@/lib/supabase/client";

export default function CEOApprovalsPage() {
  const { toast } = useToast();
  const [documents, setDocuments] = useState<any[]>([]);
  const [selectedDoc, setSelectedDoc] = useState<any | null>(null);
  const [rejectComment, setRejectComment] = useState("");
  const [showRejectInput, setShowRejectInput] = useState(false);
  const [activeTab, setActiveTab] = useState("Pending");
  const [searchQuery, setSearchQuery] = useState("");
  const supabase = createClient();

  useEffect(() => {
    fetchDocuments();

    // Set up Realtime Subscription
    const channel = supabase
      .channel("ceo-documents-updates")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "patent_documents" },
        () => {
          fetchDocuments();
          if (selectedDoc) fetchDocDetails(selectedDoc.id);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedDoc]);

  const fetchDocuments = async () => {
    try {
      const res = await fetch("/api/documents");
      const data = await res.json();
      if (data.success) {
        setDocuments(data.data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchDocDetails = async (id: string) => {
    try {
      const res = await fetch(`/api/documents/${id}`);
      const data = await res.json();
      if (data.success) {
        setSelectedDoc(data.data);
        setShowRejectInput(false);
        setRejectComment("");
      }
    } catch (e) {
      console.error(e);
    }
  };

  const transitionStatus = async (newStatus: string, notes?: string) => {
    if (!selectedDoc) return;
    try {
      const res = await fetch(`/api/documents/${selectedDoc.id}/transition`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ new_status: newStatus, notes: notes || `CEO action: ${newStatus}` }),
      });
      const data = await res.json();
      if (data.success) {
        toast({ title: `Document ${newStatus}` });
        
        // Also add the comment to the comment thread if it was a rejection or revision request
        if (notes && (newStatus === "CEO Rejected" || newStatus === "Revision Requested by CEO")) {
            await fetch(`/api/documents/${selectedDoc.id}/comments`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ comment_text: `[${newStatus}] ${notes}` }),
            });
        }
        
        fetchDocDetails(selectedDoc.id);
        fetchDocuments();
      }
    } catch (e) {
      toast({ title: "Failed to update status", variant: "destructive" });
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
      if (res.ok) fetchDocDetails(selectedDoc.id);
    } catch (e) {
      console.error(e);
    }
  };

  // Dashboard Statistics Calculations
  const stats = {
    pendingApproval: documents.filter(d => d.status === "CEO Approval Pending").length,
    approved: documents.filter(d => d.status === "CEO Approved" || d.status === "Completed").length,
    rejected: documents.filter(d => d.status === "CEO Rejected").length,
    inProgress: documents.filter(d => !["CEO Approved", "Completed", "Archived"].includes(d.status)).length,
    designerPending: documents.filter(d => ["Pending Design Review", "Design In Progress"].includes(d.status)).length,
    analystPending: documents.filter(d => ["Waiting for Patent Analyst Review", "Draft Created", "Uploaded by Patent Analyst"].includes(d.status)).length,
    total: documents.length,
    highPriority: documents.filter(d => (d.priority_level || "Normal") === "High").length,
  };

  const filteredDocs = documents.filter(d => {
    // Tab filter
    if (activeTab === "Pending" && d.status !== "CEO Approval Pending") return false;
    if (activeTab === "Approved" && d.status !== "CEO Approved") return false;
    if (activeTab === "Rejected" && d.status !== "CEO Rejected") return false;
    if (activeTab === "Revisions" && d.status !== "Revision Requested by CEO") return false;
    
    // Search filter
    if (searchQuery) {
      const sq = searchQuery.toLowerCase();
      const matchesSearch = 
        (d.title && d.title.toLowerCase().includes(sq)) || 
        (d.id && d.id.toLowerCase().includes(sq)) || 
        (d.client_name && d.client_name.toLowerCase().includes(sq)) || 
        (d.assigned_to && d.assigned_to.toLowerCase().includes(sq));
      if (!matchesSearch) return false;
    }
    return true;
  });

  const handleDownloadVersion = async (version: any) => {
    try {
      await fetch(`/api/documents/${selectedDoc.id}/download`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ version_id: version.id }),
      });
      toast({ title: "Download securely logged." });
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="p-8 max-w-[1600px] mx-auto flex flex-col gap-8">
      {/* Top Dashboard Summary Cards */}
      <div>
        <h1 className="text-2xl font-bold mb-6">CEO Approval Dashboard</h1>
        <div className="grid grid-cols-4 gap-4">
          <div className="p-4 border rounded-xl bg-white shadow-sm flex flex-col gap-1 border-l-4 border-l-blue-500">
            <span className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Pending Approval</span>
            <span className="text-3xl font-bold text-gray-900">{stats.pendingApproval}</span>
          </div>
          <div className="p-4 border rounded-xl bg-white shadow-sm flex flex-col gap-1 border-l-4 border-l-green-500">
            <span className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Approved</span>
            <span className="text-3xl font-bold text-gray-900">{stats.approved}</span>
          </div>
          <div className="p-4 border rounded-xl bg-white shadow-sm flex flex-col gap-1 border-l-4 border-l-red-500">
            <span className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Rejected / Revisions</span>
            <span className="text-3xl font-bold text-gray-900">{stats.rejected}</span>
          </div>
          <div className="p-4 border rounded-xl bg-white shadow-sm flex flex-col gap-1 border-l-4 border-l-purple-500">
            <span className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Total Documents</span>
            <span className="text-3xl font-bold text-gray-900">{stats.total}</span>
          </div>
        </div>
      </div>

      <div className="flex gap-8">
        {/* Left Sidebar - Work Queue */}
        <div className="w-1/3 flex flex-col gap-4">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <Activity className="w-5 h-5 text-gray-400" /> Work Queue
          </h2>
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
            <Input 
              placeholder="Search by ID, title, client..." 
              className="pl-9"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>
          
          <div className="flex gap-2 bg-gray-100 p-1 rounded-lg">
            <button 
              className={`flex-1 text-xs py-1.5 rounded-md font-medium transition-all ${activeTab === 'Pending' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
              onClick={() => setActiveTab('Pending')}
            >Pending</button>
            <button 
              className={`flex-1 text-xs py-1.5 rounded-md font-medium transition-all ${activeTab === 'Approved' ? 'bg-white shadow-sm text-green-600' : 'text-gray-500 hover:text-gray-700'}`}
              onClick={() => setActiveTab('Approved')}
            >Approved</button>
            <button 
              className={`flex-1 text-xs py-1.5 rounded-md font-medium transition-all ${activeTab === 'Rejected' ? 'bg-white shadow-sm text-red-600' : 'text-gray-500 hover:text-gray-700'}`}
              onClick={() => setActiveTab('Rejected')}
            >Rejected</button>
            <button 
              className={`flex-1 text-xs py-1.5 rounded-md font-medium transition-all ${activeTab === 'Revisions' ? 'bg-white shadow-sm text-orange-600' : 'text-gray-500 hover:text-gray-700'}`}
              onClick={() => setActiveTab('Revisions')}
            >Revisions</button>
          </div>

          <div className="flex flex-col gap-3">
            {filteredDocs.length === 0 ? (
              <div className="p-8 border rounded-xl bg-gray-50 text-center text-gray-400 text-sm">
                No documents currently matching your filter.
              </div>
            ) : (
              filteredDocs.map((doc) => (
                <div 
                  key={doc.id} 
                  className={`p-5 border rounded-xl cursor-pointer transition-all shadow-sm ${selectedDoc?.id === doc.id ? 'border-blue-500 bg-blue-50/50 shadow-md ring-1 ring-blue-500' : 'hover:border-gray-400 bg-white'}`}
                  onClick={() => fetchDocDetails(doc.id)}
                >
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-bold text-gray-900 line-clamp-1">{doc.title}</h3>
                    {doc.priority_level === 'High' && <span className="px-2 py-0.5 text-[10px] uppercase font-bold bg-red-100 text-red-700 rounded text-center shrink-0">High Priority</span>}
                  </div>
                  <div className="text-xs text-gray-500 flex flex-col gap-1">
                    <span>Client: {doc.client_name || "Internal"}</span>
                    <span>Analyst: {doc.assigned_to}</span>
                    <span className="mt-1 px-2.5 py-1 bg-blue-100 text-blue-700 font-semibold rounded-full w-max">{doc.status}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right Content - Review Pane */}
        <div className="w-2/3">
          {selectedDoc ? (
            <div className="flex flex-col gap-6 bg-white p-8 rounded-2xl border shadow-sm">
              <div className="flex justify-between items-start border-b pb-6">
                <div>
                  <h1 className="text-3xl font-bold text-gray-900">{selectedDoc.title}</h1>
                  <div className="flex gap-4 mt-3 text-sm text-gray-500 font-medium">
                    <span>ID: {selectedDoc.id.split("-")[0]}</span>
                    <span>•</span>
                    <span>Client: {selectedDoc.client_name || "Internal"}</span>
                    <span>•</span>
                    <span>Status: <span className="text-blue-600">{selectedDoc.status}</span></span>
                  </div>
                </div>

                {selectedDoc.status === "CEO Approval Pending" && (
                  <div className="flex flex-col gap-2 min-w-[240px]">
                    {!showRejectInput ? (
                      <>
                        <Button className="w-full bg-green-600 hover:bg-green-700 text-white font-bold" onClick={() => transitionStatus("CEO Approved")}>
                          <CheckCircle2 className="w-4 h-4 mr-2" /> Approve Document
                        </Button>
                        <Button variant="outline" className="w-full border-red-200 text-red-600 hover:bg-red-50" onClick={() => setShowRejectInput(true)}>
                          <XCircle className="w-4 h-4 mr-2" /> Reject / Request Revisions
                        </Button>
                      </>
                    ) : (
                      <div className="flex flex-col gap-2 p-3 border border-red-100 rounded-lg bg-red-50/50">
                        <Input 
                          placeholder="Reason for rejection or revisions..." 
                          value={rejectComment} 
                          onChange={e => setRejectComment(e.target.value)}
                          className="bg-white border-gray-300"
                        />
                        <div className="flex gap-2">
                          <Button 
                            className="flex-1 bg-red-600 hover:bg-red-700 text-xs" 
                            disabled={!rejectComment}
                            onClick={() => transitionStatus("CEO Rejected", rejectComment)}
                          >
                            Reject Entirely
                          </Button>
                          <Button 
                            className="flex-1 bg-orange-500 hover:bg-orange-600 text-xs" 
                            disabled={!rejectComment}
                            onClick={() => transitionStatus("Revision Requested by CEO", rejectComment)}
                          >
                            Request Revisions
                          </Button>
                        </div>
                        <Button variant="ghost" size="sm" onClick={() => setShowRejectInput(false)} className="text-gray-500 text-xs mt-1">Cancel</Button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <DocumentTimeline currentStatus={selectedDoc.status} />

              <div className="grid grid-cols-2 gap-8 mt-4">
                <div className="flex flex-col gap-4">
                  <h3 className="font-bold text-lg text-gray-900 border-b pb-2">Approval Checklist</h3>
                  <ul className="text-sm text-gray-600 space-y-3">
                    <li className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 text-green-500 shrink-0 mt-0.5" /> Verify patent claims are accurately reflected.</li>
                    <li className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 text-green-500 shrink-0 mt-0.5" /> Ensure formatting adheres to strict MOAT branding guidelines.</li>
                    <li className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 text-green-500 shrink-0 mt-0.5" /> Review analyst comments for any flagged legal ambiguities.</li>
                  </ul>
                  
                  <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-100">
                    <div className="flex items-center gap-2 font-semibold text-blue-800 mb-1">
                      <AlertCircle className="w-4 h-4" /> Final Decision
                    </div>
                    <p className="text-xs text-blue-600">
                      Approving this document will lock its state and push it to the finalized patent filing pipeline. Rejection or Revision Requests will instantly notify the Analyst and Design teams.
                    </p>
                  </div>
                </div>

                <div className="flex flex-col gap-4 border-l pl-8">
                  <h3 className="font-bold text-lg text-gray-900 border-b pb-2">Cross-Team Comments</h3>
                  <CommentThread comments={selectedDoc.review_comments} onAddComment={handleAddComment} />
                </div>
              </div>

              <div className="mt-8 pt-6 border-t">
                <h3 className="font-bold text-lg mb-4 text-gray-900 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-gray-400" /> Final Document Assets
                </h3>
                <VersionHistoryTable versions={selectedDoc.document_versions} onDownload={handleDownloadVersion} />
              </div>
            </div>
          ) : (
            <div className="h-[600px] flex flex-col items-center justify-center text-gray-400 border-2 border-dashed border-gray-200 rounded-2xl bg-gray-50/50">
              <Activity className="w-12 h-12 text-gray-300 mb-4" />
              <h3 className="text-lg font-semibold text-gray-500">Select a Document</h3>
              <p className="text-sm max-w-sm text-center mt-2">Choose a document from the Work Queue to review its history, comments, and final assets.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
