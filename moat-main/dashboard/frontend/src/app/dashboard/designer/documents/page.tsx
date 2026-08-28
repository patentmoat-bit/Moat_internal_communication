"use client";

import React, { useState, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { Upload, FileText, CheckCircle2, Clock, AlertCircle, RefreshCw, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { DocumentTimeline } from "@/components/documents/DocumentTimeline";
import { VersionHistoryTable } from "@/components/documents/VersionHistoryTable";
import { CommentThread } from "@/components/documents/CommentThread";
import { createClient } from "@/lib/supabase/client";
import { Badge } from "@/components/ui/badge";

export default function DesignerDocumentsPage() {
  const { toast } = useToast();
  const searchParams = useSearchParams();
  const [documents, setDocuments] = useState<any[]>([]);
  const [selectedDoc, setSelectedDoc] = useState<any | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const supabase = createClient();
  const [isUploading, setIsUploading] = useState(false);
  const [reviewTarget, setReviewTarget] = useState("Waiting for Patent Analyst Review");

  // Read via ref inside the realtime callback so the subscription doesn't need
  // to be torn down and recreated (and the document list refetched) every time
  // a different row is selected — it only needs the LATEST selection at the
  // moment a change event actually arrives.
  const selectedDocRef = useRef<any | null>(null);
  useEffect(() => {
    selectedDocRef.current = selectedDoc;
  }, [selectedDoc]);

  useEffect(() => {
    fetchDocuments();

    // Deep-link support: "View Workspace" from the Designer Dashboard passes
    // ?id=<document id> so this page opens with that specific document
    // selected, instead of nothing pre-selected regardless of which card was
    // clicked (previously every link pointed at this same bare URL).
    const linkedId = searchParams.get("id");
    if (linkedId) fetchDocDetails(linkedId);

    const channel = supabase
      .channel("designer-documents-updates")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "patent_documents" },
        () => {
          fetchDocuments();
          if (selectedDocRef.current) fetchDocDetails(selectedDocRef.current.id);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchDocuments = async () => {
    try {
      const res = await fetch("/api/documents");
      const data = await res.json();
      if (data.success) {
        // Filter to only show documents assigned to design team workflows
        const filtered = data.data.filter((d: any) =>
          [
            "Pending Design Review", "Pending Design Work", "Design In Progress",
            "Changes Requested", "Revision Requested by CEO", "CEO Rejected", "Rejected",
            "Completed", "CEO Approved", "Approved", "Under Design Review", "Returned to Designing Team"
          ].includes(d.status)
        );
        setDocuments(filtered);
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
      }
    } catch (e) {
      console.error(e);
    }
  };

  const transitionStatus = async (newStatus: string) => {
    if (!selectedDoc) return;
    try {
      const res = await fetch(`/api/documents/${selectedDoc.id}/transition`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ new_status: newStatus }),
      });
      const data = await res.json();
      if (data.success) {
        toast({ title: `Status updated to ${newStatus}` });
        fetchDocDetails(selectedDoc.id);
        fetchDocuments();
      }
    } catch (e) {
      toast({ title: "Failed to update status", variant: "destructive" });
    }
  };

  const uploadVersion = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0] || !selectedDoc) return;
    const file = e.target.files[0];
    setIsUploading(true);
    
    try {
      const ext = file.name.split(".").pop();
      const path = `revisions/${Date.now()}_${Math.random().toString(36).substring(2, 9)}.${ext}`;
      
      const formData = new FormData();
      formData.append("file", file);
      formData.append("bucket", "patent_documents");
      formData.append("path", path);

      const uploadRes = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });
      const uploadData = await uploadRes.json();
      
      if (!uploadData.success) throw new Error("Upload failed");

      const versionData = {
        file_url: uploadData.url,
        file_name: file.name,
        mime_type: file.type,
      };

      const res = await fetch(`/api/documents/${selectedDoc.id}/versions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(versionData),
      });

      if (res.ok) {
        toast({ title: "Revised document uploaded!" });
        // Automatically transition status based on user selection
        await transitionStatus(reviewTarget);
        fileInputRef.current!.value = "";
      }
    } catch (err) {
      toast({ title: "Upload error", variant: "destructive" });
    } finally {
      setIsUploading(false);
    }
  };

  const handleDownloadVersion = async (version: any) => {
    try {
      const res = await fetch(`/api/documents/${selectedDoc.id}/download`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ version_id: version.id }),
      });
      
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to get secure download link");
      }

      toast({ title: "Download securely logged." });
      
      // Fix popup blocker by using a dynamic anchor tag instead of window.open
      const link = document.createElement("a");
      link.href = data.downloadUrl || version.file_url;
      link.setAttribute("download", version.file_name || "download");
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Auto transition to In Progress if downloading from a pending state
      if (selectedDoc.status === "Pending Design Review" || selectedDoc.status === "Pending Design Work" || selectedDoc.status === "Under Design Review") {
        await transitionStatus("Design In Progress");
      }
    } catch (e: any) {
      console.error(e);
      toast({ title: "Download error", description: e.message, variant: "destructive" });
    }
  };

  const handleAddComment = async (text: string) => {
    if (!selectedDoc) return;
    try {
      await fetch(`/api/documents/${selectedDoc.id}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ comment_text: text }),
      });
      fetchDocDetails(selectedDoc.id);
    } catch (e) {
      console.error(e);
    }
  };

  const stats = {
    pending: documents.filter(d => ["Pending Design Review", "Pending Design Work", "Under Design Review"].includes(d.status)).length,
    inProgress: documents.filter(d => d.status === "Design In Progress").length,
    revisions: documents.filter(d => ["Changes Requested", "Revision Requested by CEO", "Returned to Designing Team"].includes(d.status)).length,
    rejected: documents.filter(d => ["CEO Rejected", "Rejected"].includes(d.status)).length,
    completed: documents.filter(d => ["Completed", "CEO Approved", "Approved"].includes(d.status)).length,
    total: documents.length
  };

  const getStatusBadge = (status: string) => {
    if (["Completed", "CEO Approved", "Approved"].includes(status)) return <Badge className="bg-green-100 text-green-800 border-green-200">Completed</Badge>;
    if (["Changes Requested", "Revision Requested by CEO", "Returned to Designing Team"].includes(status)) return <Badge className="bg-orange-100 text-orange-800 border-orange-200">Revision Req.</Badge>;
    if (["CEO Rejected", "Rejected"].includes(status)) return <Badge className="bg-red-100 text-red-800 border-red-200">Rejected</Badge>;
    if (status === "Design In Progress") return <Badge className="bg-blue-100 text-blue-800 border-blue-200">In Progress</Badge>;
    return <Badge className="bg-purple-100 text-purple-800 border-purple-200">Pending</Badge>;
  };

  const isReadOnly = ["Completed", "CEO Approved", "Approved"].includes(selectedDoc?.status || "");

  return (
    <div className="p-8 max-w-[1600px] mx-auto flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-bold mb-6">Design Workflow Dashboard</h1>
        
        {/* Dashboard Summary Cards */}
        <div className="grid grid-cols-6 gap-4">
          <div className="p-4 border rounded-xl bg-white shadow-sm flex flex-col gap-1 border-t-4 border-t-purple-500">
            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Pending Tasks</span>
            <span className="text-2xl font-black text-gray-900">{stats.pending}</span>
          </div>
          <div className="p-4 border rounded-xl bg-white shadow-sm flex flex-col gap-1 border-t-4 border-t-blue-500">
            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">In Progress</span>
            <span className="text-2xl font-black text-gray-900">{stats.inProgress}</span>
          </div>
          <div className="p-4 border rounded-xl bg-white shadow-sm flex flex-col gap-1 border-t-4 border-t-orange-500">
            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Change Requests</span>
            <span className="text-2xl font-black text-gray-900">{stats.revisions}</span>
          </div>
          <div className="p-4 border rounded-xl bg-white shadow-sm flex flex-col gap-1 border-t-4 border-t-red-500">
            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Rejected</span>
            <span className="text-2xl font-black text-gray-900">{stats.rejected}</span>
          </div>
          <div className="p-4 border rounded-xl bg-white shadow-sm flex flex-col gap-1 border-t-4 border-t-green-500">
            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Completed</span>
            <span className="text-2xl font-black text-gray-900">{stats.completed}</span>
          </div>
          <div className="p-4 border rounded-xl bg-gray-50 flex flex-col gap-1 border-t-4 border-t-gray-400">
            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Total Assigned</span>
            <span className="text-2xl font-black text-gray-900">{stats.total}</span>
          </div>
        </div>
      </div>

      <div className="flex gap-8">
        {/* Left Sidebar - Assigned Work Queue */}
        <div className="w-1/3 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold flex items-center gap-2">
              <FileText className="w-5 h-5 text-gray-400" /> Assigned Documents
            </h2>
          </div>
          
          <div className="flex flex-col gap-3 max-h-[800px] overflow-y-auto pr-2">
            {documents.length === 0 ? (
              <div className="p-8 border border-dashed rounded-xl bg-gray-50 text-center text-gray-400 text-sm">
                No active design tasks assigned.
              </div>
            ) : (
              documents.map((doc) => (
                <div 
                  key={doc.id} 
                  className={`p-4 border rounded-xl cursor-pointer transition-all shadow-sm ${selectedDoc?.id === doc.id ? 'border-blue-500 bg-blue-50/30 ring-1 ring-blue-500' : 'hover:border-gray-400 bg-white'}`}
                  onClick={() => fetchDocDetails(doc.id)}
                >
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-bold text-gray-900 line-clamp-1 flex-1">{doc.title}</h3>
                    <div className="ml-2">{getStatusBadge(doc.status)}</div>
                  </div>
                  <div className="text-[11px] text-gray-500 flex flex-col gap-1">
                    <div className="flex justify-between"><span>ID: {doc.id.split("-")[0]}</span><span>Pri: {doc.priority_level || 'Normal'}</span></div>
                    <div className="flex justify-between"><span>Analyst: {doc.assigned_to}</span><span>Due: TBD</span></div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right Content - Document Details & Actions */}
        <div className="w-2/3">
          {selectedDoc ? (
            <div className="flex flex-col gap-6 bg-white p-8 rounded-2xl border shadow-sm h-full">
              
              <div className="flex justify-between items-start border-b pb-6">
                <div>
                  <h1 className="text-2xl font-black text-gray-900">{selectedDoc.title}</h1>
                  <div className="flex gap-4 mt-2 text-sm text-gray-500 font-medium">
                    <span>Client: {selectedDoc.client_name || "Internal"}</span>
                    <span>•</span>
                    <span>Workflow Status: <strong className="text-blue-600">{selectedDoc.status}</strong></span>
                  </div>
                </div>

                <div className="flex flex-col gap-2 min-w-[200px]">
                  {["Pending Design Review", "Pending Design Work", "Under Design Review"].includes(selectedDoc.status) && (
                    <Button onClick={() => transitionStatus("Design In Progress")} className="bg-blue-600 hover:bg-blue-700 w-full font-bold">
                      <Clock className="w-4 h-4 mr-2" /> Start Editing
                    </Button>
                  )}
                  {isReadOnly && (
                    <div className="px-4 py-2 bg-green-50 text-green-700 font-bold text-sm rounded-lg flex items-center justify-center border border-green-200">
                      <CheckCircle2 className="w-4 h-4 mr-2" /> Workflow Completed
                    </div>
                  )}
                </div>
              </div>

              {["Changes Requested", "Revision Requested by CEO", "CEO Rejected", "Rejected"].includes(selectedDoc.status) && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex gap-3 text-red-800">
                  <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-bold">Revision Required</h4>
                    <p className="text-sm mt-1">This document has been sent back for revisions. Please review the comments below, make the necessary corrections, and re-upload the file.</p>
                  </div>
                </div>
              )}

              <DocumentTimeline currentStatus={selectedDoc.status} />

              <div className="grid grid-cols-2 gap-8 mt-4">
                <div className="flex flex-col gap-4">
                  <h3 className="font-bold text-lg border-b pb-2 flex items-center gap-2">
                    <Upload className="w-5 h-5 text-gray-400" /> Action Panel
                  </h3>
                  
                  {!isReadOnly ? (
                    <div className="bg-gray-50 border border-dashed border-gray-300 p-6 rounded-xl flex flex-col items-center justify-center text-center gap-3">
                      <Upload className="w-8 h-8 text-gray-400" />
                      <div>
                        <p className="font-semibold text-gray-700">Upload Revised Document</p>
                        <p className="text-xs text-gray-500 mt-1 max-w-[200px]">Upload a file to submit it for review.</p>
                      </div>
                      
                      <div className="flex flex-col gap-2 w-full text-left mt-2 mb-2 bg-white p-3 rounded-lg border">
                        <label className="text-xs font-bold text-gray-700">Submit for Review To:</label>
                        <div className="flex flex-col gap-2">
                          <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer hover:bg-gray-50 p-1 rounded">
                            <input 
                              type="radio" 
                              name="reviewTarget" 
                              value="Waiting for Patent Analyst Review" 
                              checked={reviewTarget === "Waiting for Patent Analyst Review"} 
                              onChange={(e) => setReviewTarget(e.target.value)} 
                              className="accent-indigo-600 w-4 h-4"
                            />
                            Patent Analyst
                          </label>
                          <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer hover:bg-gray-50 p-1 rounded">
                            <input 
                              type="radio" 
                              name="reviewTarget" 
                              value="Waiting for Drafter Review" 
                              checked={reviewTarget === "Waiting for Drafter Review"} 
                              onChange={(e) => setReviewTarget(e.target.value)}
                              className="accent-indigo-600 w-4 h-4"
                            />
                            Patent Drafter
                          </label>
                        </div>
                      </div>
                      <input 
                        type="file" 
                        ref={fileInputRef} 
                        className="hidden" 
                        onChange={uploadVersion} 
                        accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.zip"
                      />
                      <Button 
                        onClick={() => fileInputRef.current?.click()} 
                        disabled={isUploading || selectedDoc.status === "Pending Design Review" || selectedDoc.status === "Under Design Review"}
                        className="mt-2 w-full bg-indigo-600 hover:bg-indigo-700 text-white shadow-md"
                      >
                        {isUploading ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : null}
                        {isUploading ? "Uploading..." : "Select & Upload File"}
                      </Button>
                      {(selectedDoc.status === "Pending Design Review" || selectedDoc.status === "Under Design Review") && (
                        <p className="text-[10px] text-red-500 mt-2 font-medium">Click 'Start Editing' above to unlock uploads.</p>
                      )}
                    </div>
                  ) : (
                    <div className="bg-gray-50 border p-6 rounded-xl text-center text-gray-500 flex flex-col items-center gap-2">
                      <XCircle className="w-8 h-8 text-gray-300" />
                      <p className="text-sm">Document is locked. Uploads are disabled for completed workflows.</p>
                    </div>
                  )}
                </div>

                <div className="flex flex-col gap-4 border-l pl-8">
                  <h3 className="font-bold text-lg border-b pb-2">Feedback & Comments</h3>
                  <CommentThread comments={selectedDoc.review_comments} onAddComment={handleAddComment} />
                </div>
              </div>

              <div className="mt-8 pt-6 border-t">
                <h3 className="font-bold text-lg mb-4 text-gray-900">Version History & Assets</h3>
                <VersionHistoryTable versions={selectedDoc.document_versions} onDownload={handleDownloadVersion} />
              </div>

            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-gray-400 border-2 border-dashed border-gray-200 rounded-2xl bg-gray-50/50 min-h-[600px]">
              <FileText className="w-12 h-12 text-gray-300 mb-4" />
              <h3 className="text-lg font-semibold text-gray-500">Select an Assignment</h3>
              <p className="text-sm max-w-sm text-center mt-2">Choose a document from your assigned queue to view details, download assets, and upload revisions.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
