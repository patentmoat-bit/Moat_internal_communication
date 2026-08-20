"use client";

import React, { useState, useEffect, useRef } from "react";
import { useAuthStore } from "@/stores/authStore";
import { Plus, Upload, FileText, Activity } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { DocumentTimeline } from "@/components/documents/DocumentTimeline";
import { VersionHistoryTable } from "@/components/documents/VersionHistoryTable";
import { CommentThread } from "@/components/documents/CommentThread";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export default function AnalystDocumentsPage() {
  const { user } = useAuthStore();
  const { toast } = useToast();
  const [documents, setDocuments] = useState<any[]>([]);
  const [selectedDoc, setSelectedDoc] = useState<any | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const supabase = createClient();
  const router = useRouter();
  const [isUploading, setIsUploading] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const handleApiError = (res: Response, defaultMsg: string) => {
    if (res.status === 401) {
      toast({ title: "Session Expired", description: "Please log in again to continue.", variant: "destructive" });
      router.push("/");
      return true;
    }
    if (res.status === 403) {
      toast({ title: "Permission Denied", description: "You don't have permission to perform this action.", variant: "destructive" });
      return true;
    }
    if (res.status === 409) {
      toast({ title: "Update Conflict", description: "This project was updated while you were working. The latest project status is now available.", variant: "destructive" });
      fetchDocDetails(selectedDoc?.id); // Refresh latest state
      return true;
    }
    return false;
  };

  useEffect(() => {
    fetchDocuments();

    // Set up Realtime Subscription
    const channel = supabase
      .channel("analyst-documents-updates")
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
      if (handleApiError(res, "Failed to load documents")) return;
      const data = await res.json();
      if (data.success) {
        setDocuments(data.data);
      }
    } catch (e) {
      toast({ title: "Network Error", description: "Unable to connect. Please check your connection.", variant: "destructive" });
    } finally {
      setIsLoading(false);
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
      if (handleApiError(res, "Failed to create draft")) return;
      const data = await res.json();
      if (data.success) {
        toast({ title: "Draft created successfully" });
        setIsCreating(false);
        setNewTitle("");
        fetchDocuments();
      } else {
        toast({ title: "Validation Error", description: data.error?.message || "Invalid data", variant: "destructive" });
      }
    } catch (e) {
      toast({ title: "Server Error", description: "Unable to create draft at this time. Please try again.", variant: "destructive" });
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
      
      if (!uploadData.success) throw new Error(uploadData.error || "Upload failed");
      
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

      if (handleApiError(res, "Failed to add version")) return;

      const resData = await res.json();
      if (resData.success) {
        toast({ title: "Success", description: "Version uploaded successfully." });
        transitionStatus("Uploaded by Patent Analyst");
        fetchDocDetails(selectedDoc.id);
      } else {
         toast({ title: "Validation Error", description: "Unable to save this document version. Your previous version is safe. Please try again.", variant: "destructive" });
      }
    } catch (err: any) {
      toast({ title: "Upload Failed", description: "Unable to upload document to storage. Please verify file size and format.", variant: "destructive" });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const fetchDocDetails = async (id: string | undefined) => {
    if (!id) return;
    try {
      const res = await fetch(`/api/documents/${id}?_t=${Date.now()}`, { cache: "no-store" });
      if (handleApiError(res, "Failed to load details")) return;
      
      const data = await res.json();
      if (data.success) {
        if (data.data && data.data.document_versions && data.data.document_versions.length > 0) {
          const sorted = [...data.data.document_versions].sort((a,b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
          data.data.document_versions = [sorted[0]]; 
        }
        setSelectedDoc(data.data);
      }
    } catch (e) {
      toast({ title: "Network Error", description: "Failed to fetch document details.", variant: "destructive" });
    }
  };

  const transitionStatus = async (newStatus: string) => {
    if (!selectedDoc) return;
    try {
      const res = await fetch(`/api/documents/${selectedDoc.id}/transition`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ new_status: newStatus, current_status: selectedDoc.status }), // Concurrency check
      });
      if (handleApiError(res, "Failed to update status")) return;
      const data = await res.json();
      if (data.success) {
        toast({ title: "Success", description: `Project status updated to ${newStatus}.` });
        fetchDocDetails(selectedDoc.id);
        fetchDocuments();
      }
    } catch (e) {
      toast({ title: "Server Error", description: "An unexpected error occurred while saving. Please try again.", variant: "destructive" });
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
      if (handleApiError(res, "Failed to add comment")) return;
      if (res.ok) {
        fetchDocDetails(selectedDoc.id);
      }
    } catch (e) {
      toast({ title: "Network Error", description: "Could not add comment. Please try again.", variant: "destructive" });
    }
  };

  const [activeTab, setActiveTab] = useState("overview");
  const [folders, setFolders] = useState(["Drafts", "References", "Final Files"]);
  const [selectedFolder, setSelectedFolder] = useState("Drafts");
  const [newFolderName, setNewFolderName] = useState("");
  const [isAddingFolder, setIsAddingFolder] = useState(false);

  const handleAddFolder = () => {
    if (newFolderName.trim() && !folders.includes(newFolderName.trim())) {
      setFolders([...folders, newFolderName.trim()]);
      setNewFolderName("");
      setIsAddingFolder(false);
      toast({ title: "Folder created", description: `Folder '${newFolderName}' has been added.` });
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
      if (!res.ok || !data.success) throw new Error(data.error || "Failed to get download link");
      
      const link = document.createElement("a");
      link.href = data.downloadUrl || version.file_url;
      link.setAttribute("download", version.file_name || "download");
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (e: any) {
      console.error(e);
      toast({ title: "Download error", description: e.message, variant: "destructive" });
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto flex gap-6">
      {/* Left Sidebar - List */}
      <div className="w-1/3 flex flex-col gap-4">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-bold">Document Drafts</h2>
          <Button size="sm" onClick={() => setIsCreating(true)}><Plus className="w-4 h-4" /></Button>
        </div>
        
        {isCreating && (
          <div className="p-4 border rounded-lg bg-gray-50 flex flex-col gap-2">
            <Input placeholder="Document Title..." value={newTitle} onChange={(e) => setNewTitle(e.target.value)} />
            <div className="flex gap-2 justify-end">
              <Button size="sm" variant="ghost" onClick={() => setIsCreating(false)}>Cancel</Button>
              <Button size="sm" onClick={createDraft}>Create</Button>
            </div>
          </div>
        )}

        <div className="flex flex-col gap-2">
          {isLoading ? (
            <div className="p-4 text-center text-sm text-gray-500">Loading documents...</div>
          ) : documents.length === 0 ? (
            <div className="p-8 text-center border border-dashed rounded-lg text-gray-400 bg-gray-50">
              No document drafts found. Click + to start a new project.
            </div>
          ) : (
            documents.map((doc) => (
              <div 
                key={doc.id} 
                className={`p-4 border rounded-lg cursor-pointer transition-colors ${selectedDoc?.id === doc.id ? 'border-blue-500 bg-blue-50' : 'hover:border-gray-400 bg-white'}`}
                onClick={() => {
                  fetchDocDetails(doc.id);
                  setActiveTab("overview");
                }}
              >
                <h3 className="font-semibold text-gray-900">{doc.title}</h3>
                <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
                  <span className="px-2 py-1 bg-gray-200 rounded-full">{doc.status}</span>
                  <span>{new Date(doc.updated_at).toLocaleDateString()}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Right Content - Detail */}
      <div className="w-2/3 flex flex-col h-full">
        {selectedDoc ? (
          <div className="flex flex-col gap-6 bg-white p-6 rounded-xl border shadow-sm flex-1">
            <div className="flex justify-between items-start">
              <div>
                <h1 className="text-3xl font-bold flex items-center gap-3">
                  {selectedDoc.title}
                  {(!selectedDoc.document_versions || selectedDoc.document_versions.length === 0) && (
                    <span className="px-3 py-1 bg-amber-100 text-amber-700 text-xs font-bold uppercase tracking-wider rounded-full border border-amber-200">
                      Not Uploaded
                    </span>
                  )}
                </h1>
                <p className="text-gray-500 mt-1 text-sm">Project ID: {selectedDoc.id}</p>
              </div>
              
              <div className="flex gap-2">
                {(selectedDoc.status === "Draft Created" || selectedDoc.status === "Uploaded by Patent Analyst" || selectedDoc.status === "Draft") && (
                  <Button onClick={() => transitionStatus("Pending Design Review")} className="bg-purple-600 hover:bg-purple-700">
                    Assign to Design Team
                  </Button>
                )}
                {(selectedDoc.status === "Waiting for Patent Analyst Review" || selectedDoc.status === "Verification Pending" || selectedDoc.status === "CEO Rejected" || selectedDoc.status === "Revision Requested by CEO") && (
                  <>
                    <Button variant="outline" onClick={() => transitionStatus("Changes Requested")}>Request Additional Changes (Design)</Button>
                    <Button onClick={() => transitionStatus("CEO Approval Pending")} className="bg-green-600 hover:bg-green-700">Approve & Submit to CEO</Button>
                  </>
                )}
              </div>
            </div>

            <DocumentTimeline currentStatus={selectedDoc.status} />

            <div className="flex gap-6 border-b mt-2">
              <button 
                className={`pb-2 px-1 font-bold text-sm ${activeTab === 'overview' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                onClick={() => setActiveTab('overview')}
              >
                Overview & Feedback
              </button>
              <button 
                className={`pb-2 px-1 font-bold text-sm flex items-center gap-2 ${activeTab === 'uploads' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                onClick={() => setActiveTab('uploads')}
              >
                Upload Centre
              </button>
            </div>

            {activeTab === "overview" && (
              <div className="flex flex-col gap-6">
                {(!selectedDoc.document_versions || selectedDoc.document_versions.length === 0) && (
                  <div className="bg-amber-50 border-l-4 border-amber-500 p-4 flex items-start gap-3">
                    <div className="text-amber-500 mt-0.5">
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"></path><path d="M12 9v4"></path><path d="M12 17h.01"></path></svg>
                    </div>
                    <div>
                      <h4 className="text-amber-800 font-bold text-sm">Document Draft is Empty</h4>
                      <p className="text-amber-700 text-sm mt-1">
                        Go to the Upload Centre tab to upload your patent draft file.
                      </p>
                    </div>
                  </div>
                )}
                <div className="border p-6 rounded-lg bg-gray-50">
                  <h3 className="font-semibold text-lg mb-4">Feedback & Comments</h3>
                  <CommentThread comments={selectedDoc.review_comments} onAddComment={handleAddComment} />
                </div>
              </div>
            )}

            {activeTab === "uploads" && (
              <div className="flex gap-6 h-full min-h-[400px]">
                {/* Folders Sidebar */}
                <div className="w-1/4 border-r pr-4 flex flex-col gap-4">
                  <div className="flex justify-between items-center">
                    <h4 className="font-bold text-sm text-gray-700 uppercase tracking-wider">Folders</h4>
                    <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => setIsAddingFolder(true)}>
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                  
                  {isAddingFolder && (
                    <div className="flex flex-col gap-2 mb-2">
                      <Input 
                        size={1} 
                        className="h-8 text-xs" 
                        placeholder="Folder name" 
                        value={newFolderName}
                        onChange={e => setNewFolderName(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleAddFolder()}
                      />
                      <div className="flex gap-1 justify-end">
                        <Button size="sm" variant="ghost" className="h-6 text-xs px-2" onClick={() => setIsAddingFolder(false)}>Cancel</Button>
                        <Button size="sm" className="h-6 text-xs px-2 bg-blue-600" onClick={handleAddFolder}>Add</Button>
                      </div>
                    </div>
                  )}

                  <div className="flex flex-col gap-1">
                    {folders.map(folder => (
                      <button 
                        key={folder}
                        onClick={() => setSelectedFolder(folder)}
                        className={`text-left text-sm px-3 py-2 rounded-md transition-colors ${selectedFolder === folder ? 'bg-blue-50 text-blue-700 font-semibold' : 'text-gray-600 hover:bg-gray-100'}`}
                      >
                        {folder}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Uploads Area */}
                <div className="w-3/4 flex flex-col gap-6 pl-2">
                  <div className="flex justify-between items-end">
                    <div>
                      <h3 className="font-bold text-lg">{selectedFolder}</h3>
                      <p className="text-xs text-gray-500">Manage files in this directory.</p>
                    </div>
                    <div>
                      <input 
                        type="file" 
                        ref={fileInputRef} 
                        className="hidden" 
                        onChange={uploadVersion} 
                        accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.zip"
                      />
                      <Button 
                        onClick={() => fileInputRef.current?.click()} 
                        disabled={isUploading || ["CEO Approval Pending", "CEO Approved", "Sent for CEO Approval", "Approved"].includes(selectedDoc.status)}
                        className="bg-blue-600 hover:bg-blue-700"
                        size="sm"
                      >
                        <Upload className="w-4 h-4 mr-2" />
                        {isUploading ? "Uploading..." : "Upload Document"}
                      </Button>
                    </div>
                  </div>

                  <div>
                    {(!selectedDoc.document_versions || selectedDoc.document_versions.length === 0) ? (
                      <div className="p-8 text-center text-gray-400 border border-dashed rounded-lg bg-gray-50">
                        No versions uploaded yet. Upload a file to see history.
                      </div>
                    ) : (
                      <VersionHistoryTable versions={selectedDoc.document_versions} onDownload={handleDownloadVersion} />
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="h-full flex items-center justify-center text-gray-400 border rounded-xl border-dashed bg-gray-50">
            Select a document to view details
          </div>
        )}
      </div>
    </div>
  );
}
