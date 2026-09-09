"use client";

import React, { useState, useEffect, useRef } from "react";
import { useAuthStore } from "@/stores/authStore";
import { Plus, Upload, FileText, Activity } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { DocumentTimeline } from "@/components/documents/DocumentTimeline";
import { VersionHistoryTable } from "@/components/documents/VersionHistoryTable";
import { FileManager } from "@/components/documents/FileManager";
import { CommentThread } from "@/components/documents/CommentThread";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/apiFetch";

export default function AnalystDocumentsPage() {
  const { user } = useAuthStore();
  const { toast } = useToast();
  const [documents, setDocuments] = useState<any[]>([]);
  const [selectedDoc, setSelectedDoc] = useState<any | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [newTitle, setNewTitle] = useState("");
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

  // Read via ref inside the realtime callback so the subscription doesn't need
  // to be torn down and recreated (and the document list refetched) every time
  // the user clicks a different row — it only needs the LATEST selection at
  // the moment a change event actually arrives.
  const selectedDocRef = useRef<any | null>(null);
  useEffect(() => {
    selectedDocRef.current = selectedDoc;
  }, [selectedDoc]);

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
      const res = await apiFetch("/api/documents");
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
      const res = await apiFetch("/api/documents", {
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

  const uploadVersions = async (files: File[], folder: string = "") => {
    if (!files || files.length === 0 || !selectedDoc) return;
    setIsUploading(true);

    let uploadedCount = 0;

    try {
      await Promise.all(files.map(async (file) => {
        const ext = file.name.split(".").pop();
        const formData = new FormData();
        formData.append("file", file);
        formData.append("document_id", selectedDoc.id);

        const uploadRes = await apiFetch("/api/upload", { method: "POST", body: formData });
        const uploadData = await uploadRes.json();

        if (!uploadData.success) throw new Error(uploadData.error || "Upload failed");

        const secureFileUrl = folder ? `${uploadData.url}?folder=${encodeURIComponent(folder)}` : uploadData.url;

        const versionPayload = {
          file_name: file.name,
          file_url: secureFileUrl,
          file_size: file.size,
          mime_type: file.type,
        };

        const res = await apiFetch(`/api/documents/${selectedDoc.id}/versions`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(versionPayload),
        });

        if (res.ok) {
          const resData = await res.json();
          if (resData.success) {
            uploadedCount++;
          }
        }
      }));

      if (uploadedCount > 0) {
        toast({ title: "Success", description: `${uploadedCount} file(s) uploaded successfully.` });
        transitionStatus("Uploaded by Patent Analyst");
        fetchDocDetails(selectedDoc.id);
      } else {
        toast({ title: "Validation Error", description: "Unable to save documents. Please try again.", variant: "destructive" });
      }
    } catch (err: any) {
      toast({ title: "Upload Failed", description: "Unable to upload documents to storage. Please verify file sizes and formats.", variant: "destructive" });
    } finally {
      setIsUploading(false);
    }
  };

  const handleFolderCreate = async (folderName: string, parentPath: string) => {
    if (!selectedDoc) return;
    const fullPath = parentPath ? `${parentPath}/${folderName}` : folderName;

    // We create a zero-byte .folder marker file to persist the folder in the DB
    // since the database schema lacks a native folders table or column.
    const secureFileUrl = `folder://?folder=${encodeURIComponent(fullPath)}`;

    const versionPayload = {
      file_name: ".folder",
      file_url: secureFileUrl,
      file_size: 0,
      mime_type: "application/x-folder",
    };

    try {
      await apiFetch(`/api/documents/${selectedDoc.id}/versions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(versionPayload),
      });
      fetchDocDetails(selectedDoc.id);
    } catch (err) {
      console.error("Failed to create folder:", err);
    }
  };

  const fetchDocDetails = async (id: string | undefined) => {
    if (!id) return;
    try {
      const res = await apiFetch(`/api/documents/${id}?_t=${Date.now()}`, { cache: "no-store" });
      if (handleApiError(res, "Failed to load details")) return;

      const data = await res.json();
      if (data.success) {
        setSelectedDoc(data.data);
      }
    } catch (e) {
      toast({ title: "Network Error", description: "Failed to fetch document details.", variant: "destructive" });
    }
  };

  const transitionStatus = async (newStatus: string) => {
    if (!selectedDoc) return;
    try {
      const res = await apiFetch(`/api/documents/${selectedDoc.id}/transition`, {
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
      const res = await apiFetch(`/api/documents/${selectedDoc.id}/comments`, {
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
      const res = await apiFetch(`/api/documents/${selectedDoc.id}/download`, {
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
    <div className="p-6 w-full flex gap-6">
      {/* Left Sidebar - List */}
      <div className="w-1/4 flex flex-col gap-3">
        <div className="flex justify-between items-center">
          <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wider">Document Drafts</h2>
          <Button size="icon" variant="outline" className="h-6 w-6" onClick={() => setIsCreating(true)}><Plus className="w-3 h-3" /></Button>
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

        <div className="flex flex-col gap-1.5">
          {isLoading ? (
            <div className="p-3 text-center text-xs text-gray-500">Loading...</div>
          ) : documents.length === 0 ? (
            <div className="p-4 text-center border border-dashed rounded-lg text-xs text-gray-400 bg-gray-50">
              No drafts yet. Click + to start.
            </div>
          ) : (
            documents.map((doc) => (
              <div
                key={doc.id}
                className={`px-3 py-2.5 border rounded-lg cursor-pointer transition-colors ${selectedDoc?.id === doc.id ? 'border-blue-500 bg-blue-50' : 'hover:border-gray-300 bg-white'}`}
                onClick={() => {
                  fetchDocDetails(doc.id);
                  setActiveTab("overview");
                }}
              >
                <h3 className="font-semibold text-xs text-gray-900 truncate" title={doc.title}>{doc.title}</h3>
                <div className="flex items-center gap-1.5 mt-1 text-[10px] text-gray-400">
                  <span className="px-1.5 py-0.5 bg-gray-100 rounded-full truncate max-w-[100px]">{doc.status}</span>
                  <span className="shrink-0">{new Date(doc.updated_at).toLocaleDateString()}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Right Content - Detail */}
      <div className="w-3/4 flex flex-col h-full">
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
              <FileManager
                versions={selectedDoc.document_versions || []}
                isUploading={isUploading}
                isLocked={["CEO Approval Pending", "CEO Approved", "Sent for CEO Approval", "Approved"].includes(selectedDoc.status)}
                onUpload={uploadVersions}
                onDownload={handleDownloadVersion}
                onFolderCreate={handleFolderCreate}
              />
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
