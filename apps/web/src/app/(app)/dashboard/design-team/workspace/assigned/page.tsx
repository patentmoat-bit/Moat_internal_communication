"use client";

import Link from "next/link";

import { triggerFileDownload } from "@/lib/downloadHelper";
import React, { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Users,
  Sparkles,
  Search,
  FileText,
  ImageIcon,
  Download,
  Send,
  UploadCloud,
  CheckCircle2,
  AlertTriangle,
  X,
  Plus,
  Check,
  FolderOpen,
  RefreshCw,
  Mail,
  Share2,
  UserPlus
} from "lucide-react";
import { useActiveRole } from "@/components/auth/role-context";

export default function AssignedToMePage() {
  const { currentUser } = useActiveRole();

  const [loading, setLoading] = useState(true);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  // Notification Toast State
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Per-task upload and recipient state
  const [uploadedFiles, setUploadedFiles] = useState<{ [taskId: string]: { name: string; size: string } }>({});
  const [recipientRoles, setRecipientRoles] = useState<{ [taskId: string]: string }>({});
  const [uploading, setUploading] = useState<{ [taskId: string]: boolean }>({});

  // Mail ID assignment state
  const [memberEmails, setMemberEmails] = useState<{ [taskId: string]: string }>({});
  const [assigningMember, setAssigningMember] = useState<{ [taskId: string]: boolean }>({});

  // Quick Modal for "+ Send to Design Team" (Simulate Patent Drafter or Analyst assigning)
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newProjectTitle, setNewProjectTitle] = useState("Smart Energy Management System");
  const [newSenderRole, setNewSenderRole] = useState("Patent Drafter");
  const [newSenderName, setNewSenderName] = useState("Alice Drafter");
  const [newMemberEmail, setNewMemberEmail] = useState("");
  const [newFileType, setNewFileType] = useState("image");
  const [newFileName, setNewFileName] = useState("FIG_Draft_Architecture.png");
  const [creating, setCreating] = useState(false);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4500);
  };

  const fetchAssignments = async () => {
    try {
      const res = await fetch("/api/design-team/assignments");
      if (res.ok) {
        const data = await res.json();
        if (data.assignments) {
          setAssignments(data.assignments);
        }
      }
    } catch (err) {
      console.error("Error fetching assignments:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAssignments();
  }, []);

  // Handle local file selection per card
  const handleFileSelect = (taskId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const sizeMb = (file.size / (1024 * 1024)).toFixed(1) + " MB";
      setUploadedFiles((prev) => ({
        ...prev,
        [taskId]: { name: file.name, size: sizeMb }
      }));
      showToast(`Selected deliverable file: ${file.name}`);
    }
  };

  // Handle dropdown recipient change
  const handleRecipientChange = (taskId: string, role: string) => {
    setRecipientRoles((prev) => ({
      ...prev,
      [taskId]: role
    }));
  };

  // Handle member email input change
  const handleEmailChange = (taskId: string, email: string) => {
    setMemberEmails((prev) => ({
      ...prev,
      [taskId]: email
    }));
  };

  // Assign task to member by Email ID
  const handleAssignMember = async (task: any) => {
    const email = memberEmails[task.id]?.trim();
    if (!email) {
      alert("Please enter a member email ID (e.g. member@company.com)");
      return;
    }

    setAssigningMember((prev) => ({ ...prev, [task.id]: true }));
    try {
      const res = await fetch("/api/design-team/assignments", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: task.id,
          action: "assign_member",
          member_email: email,
          actor: currentUser.name || "Design Team"
        })
      });

      if (res.ok) {
        await fetchAssignments();
        setMemberEmails((prev) => ({ ...prev, [task.id]: "" }));
        showToast(`Assigned to ${email}! Outlook/Azure mail notification queued.`);
      } else {
        const err = await res.json();
        alert(err.error || "Failed to assign member");
      }
    } catch (err) {
      console.error("Error assigning member:", err);
    } finally {
      setAssigningMember((prev) => ({ ...prev, [task.id]: false }));
    }
  };

  // Share back with who assigned it
  const handleShareWithSender = async (task: any) => {
    const senderClean = (task.assigned_by || "sender")
      .toLowerCase()
      .replace(/[^a-z0-9]/g, ".")
      .replace(/\.+/g, ".")
      .replace(/^\.|\.$/g, "");
    const senderEmail = `${senderClean}@moat.ai`;

    setAssigningMember((prev) => ({ ...prev, [task.id]: true }));
    try {
      const res = await fetch("/api/design-team/assignments", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: task.id,
          action: "share",
          member_email: senderEmail,
          shared_by: currentUser.name || "Design Team",
          share_note: `Shared back with original assigner: ${task.assigned_by}`
        })
      });

      if (res.ok) {
        await fetchAssignments();
        showToast(`Shared back with original assigner ${task.assigned_by} (${senderEmail})! Outlook/Azure mail notification queued.`);
      } else {
        const err = await res.json();
        alert(err.error || "Failed to share with sender");
      }
    } catch (err) {
      console.error("Error sharing with sender:", err);
    } finally {
      setAssigningMember((prev) => ({ ...prev, [task.id]: false }));
    }
  };

  // Upload finished document and send to selected recipient
  const handleUploadAndSend = async (task: any) => {
    const selectedRecipient = recipientRoles[task.id] || "PATENT_DRAFTER";
    const selectedFile = uploadedFiles[task.id] || {
      name: `${task.id}_Finished_Deliverable.png`,
      size: "1.5 MB"
    };

    setUploading((prev) => ({ ...prev, [task.id]: true }));

    const recipientLabel =
      selectedRecipient === "PATENT_ANALYST"
        ? "Patent Analyst"
        : selectedRecipient === "CEO"
        ? "CEO"
        : "Patent Drafter";

    try {
      const isPdf = selectedFile.name.toLowerCase().endsWith(".pdf");
      const fileUrl = isPdf
        ? "/documents/Battery_Thermal_Disclosure.pdf"
        : "/drawings/previews/FIG_1_Architecture.png";

      const res = await fetch("/api/design-team/submissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assignment_id: task.id,
          version: (task.current_version || 1) + 1,
          recipient_role: selectedRecipient,
          recipient_user: recipientLabel,
          message: `Finished document (${selectedFile.name}) submitted for review.`,
          notes: task.status === "REWORK" ? "Resolved rework directives." : "Finished document prepared for review.",
          actor: currentUser.name || "Design Team",
          submitter_role: "DESIGN_TEAM",
          files: [
            {
              version: (task.current_version || 1) + 1,
              title: task.title,
              file_name: selectedFile.name,
              file_url: fileUrl,
              file_size: selectedFile.size,
              file_type: isPdf ? "pdf" : "image",
              uploaded_by: currentUser.name || "Design Team",
              created_at: new Date().toISOString()
            }
          ]
        })
      });

      if (res.ok) {
        await fetchAssignments();
        showToast(`Uploaded ${selectedFile.name} and sent to ${recipientLabel} successfully!`);
      } else {
        const errData = await res.json();
        alert(errData.error || "Failed to send finished document");
      }
    } catch (err) {
      console.error("Error sending deliverable:", err);
    } finally {
      setUploading((prev) => ({ ...prev, [task.id]: false }));
    }
  };

  // Create Assignment (simulating Patent Analyst or Patent Drafter assigning)
  const handleCreateAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);

    const isPdf = newFileType === "pdf";
    const fileUrl = isPdf
      ? "/documents/Battery_Thermal_Disclosure.pdf"
      : "/drawings/previews/FIG_1_Architecture.png";

    try {
      const res = await fetch("/api/design-team/assignments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          invention_id: "INN-0012",
          project_title: newProjectTitle,
          title: newTitle,
          instructions: "Complete formal technical drawing.",
          priority: "HIGH",
          due_date: new Date(Date.now() + 864000000).toISOString(),
          assigned_to: newMemberEmail || "Design Team",
          assigned_member_email: newMemberEmail || null,
          assigned_by: newSenderName,
          sender_role: newSenderRole,
          source_files: [
            {
              id: "DOC-" + Date.now(),
              name: newFileName,
              type: newFileType,
              size: "1.4 MB",
              url: fileUrl
            }
          ]
        })
      });

      if (res.ok) {
        await fetchAssignments();
        setShowCreateModal(false);
        setNewTitle("");
        setNewMemberEmail("");
        showToast("New assigned work added successfully!");
      }
    } catch (err) {
      console.error("Error creating assignment:", err);
    } finally {
      setCreating(false);
    }
  };

  const filteredAssignments = assignments.filter((a) => {
    const matchesSearch =
      a.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.project_title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.assigned_by?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.assigned_member_email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.id?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === "ALL" || a.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-5 max-w-6xl mx-auto pb-12">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 p-4 rounded-xl shadow-2xl bg-slate-900 text-white border border-blue-500/40 flex items-center gap-3 animate-in fade-in duration-200">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span className="text-xs font-semibold">{toastMessage}</span>
          <button onClick={() => setToastMessage(null)} className="text-slate-400 hover:text-white ml-2">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border/40">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
              ASSIGNED TO ME
            </span>
            <span className="text-xs text-muted-foreground font-mono">ROLE: DESIGN_TEAM</span>
          </div>
          <h1 className="text-2xl font-black text-foreground tracking-tight flex items-center gap-2">
            <Users className="w-6 h-6 text-blue-600" /> Assigned Design Tasks
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Download assigned documents & images, assign to team members via mail ID, and upload & send finished work to Patent Analyst, Patent Drafter, or CEO.
          </p>
        </div>

        <Button
          onClick={() => setShowCreateModal(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-sm h-9 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4 mr-1.5" /> + New Assignment
        </Button>
      </div>

      {/* Search and Simple Status Tabs */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by project title, document, member email, or who assigned..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 text-xs bg-card"
          />
        </div>

        <div className="flex items-center gap-1.5 w-full sm:w-auto">
          {[
            { label: "All", value: "ALL" },
            { label: "Assigned", value: "ASSIGNED" },
            { label: "⚠️ Rework", value: "REWORK" },
            { label: "Under Review", value: "UNDER_REVIEW" }
          ].map((tab) => (
            <button
              key={tab.value}
              onClick={() => setStatusFilter(tab.value)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                statusFilter === tab.value
                  ? "bg-blue-600 text-white shadow-sm"
                  : "bg-card border border-border/40 text-muted-foreground hover:bg-muted/40"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Task List */}
      <div className="space-y-4">
        {loading ? (
          <div className="py-16 text-center text-sm text-muted-foreground flex flex-col items-center gap-2">
            <RefreshCw className="w-6 h-6 animate-spin text-blue-500" />
            <span>Loading assigned tasks...</span>
          </div>
        ) : filteredAssignments.length === 0 ? (
          <Card className="p-10 text-center bg-card">
            <Users className="w-10 h-10 mx-auto text-muted-foreground/50 mb-2" />
            <h3 className="text-sm font-bold text-foreground">No assignments in this filter</h3>
            <p className="text-xs text-muted-foreground mt-1">Use the '+ New Assignment' button to create one.</p>
          </Card>
        ) : (
          filteredAssignments.map((task) => {
            const isRework = task.status === "REWORK";
            const currentRecipient = recipientRoles[task.id] || (
              task.sender_role?.toLowerCase().includes("analyst") ? "PATENT_ANALYST" : "PATENT_DRAFTER"
            );

            return (
              <Card
                key={task.id}
                className={`overflow-hidden transition-all bg-card ${
                  isRework ? "border-rose-500 shadow-sm" : "border-border/50 hover:border-blue-500/30"
                }`}
              >
                {/* Rework Banner (if rework requested) */}
                {isRework && (
                  <div className="bg-rose-500/10 border-b border-rose-500/30 px-4 py-2 flex items-center justify-between gap-2 text-xs text-rose-700 dark:text-rose-300 font-semibold">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                      <span>
                        <strong>Rework Directive:</strong> {task.last_notes || "Please revise drawing per reviewer notes."}
                      </span>
                    </div>
                    <Badge className="bg-rose-600 text-white text-[10px] uppercase font-bold shrink-0">
                      Rework Required
                    </Badge>
                  </div>
                )}

                <div className="p-4 sm:p-5 space-y-3.5">
                  {/* Row 1: Project Title + Who Assigned + Assigned Member (if any) */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-xs font-bold text-blue-600 bg-blue-500/10 px-2 py-0.5 rounded">
                          {task.id}
                        </span>
                        <h2 className="text-base font-bold text-foreground">{task.project_title}</h2>
                        <Badge
                          className={`text-[10px] font-bold ${
                            task.status === "REWORK"
                              ? "bg-rose-600 text-white"
                              : task.status === "ASSIGNED"
                              ? "bg-blue-600 text-white"
                              : "bg-purple-600 text-white"
                          }`}
                        >
                          {task.status.replace("_", " ")}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">{task.title}</p>
                    </div>

                    {/* Studio Action & Who Assigned */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <Link href={`/dashboard/design-team/studio?project=${task.id || "PRJ-10023"}`}>
                        <Button
                          size="sm"
                          className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs h-7 px-3 shadow-sm flex items-center gap-1.5"
                        >
                          <Sparkles className="w-3.5 h-3.5" />
                          Open in Design Studio
                        </Button>
                      </Link>
                    </div>

                    {/* Who Assigned */}
                    <div className="text-xs text-muted-foreground bg-muted/20 px-3 py-1.5 rounded-lg border border-border/30 self-start sm:self-auto flex items-center gap-1.5 flex-wrap">
                      <span className="text-muted-foreground">Assigned by: </span>
                      <strong className="text-foreground">{task.assigned_by}</strong>{" "}
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-500/10 text-blue-600">
                        {task.sender_role}
                      </span>
                    </div>
                  </div>

                  {/* Row 2: Two columns: Download Assigned Document & Upload & Send Finished */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 border-t border-border/30">
                    {/* Left Column: Assigned Document / Image (Download) */}
                    <div className="bg-muted/10 rounded-xl p-3 border border-border/30 space-y-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                        Assigned Document / Image
                      </span>

                      {task.source_files?.length > 0 ? (
                        task.source_files.map((file: any, idx: number) => {
                          const isPdf = file.name?.endsWith(".pdf") || file.type === "pdf";

                          return (
                            <div
                              key={idx}
                              className="flex items-center justify-between bg-card p-2 rounded-lg border border-border/30"
                            >
                              <div className="flex items-center gap-2 overflow-hidden mr-2">
                                {isPdf ? (
                                  <FileText className="w-4 h-4 text-rose-600 shrink-0" />
                                ) : (
                                  <ImageIcon className="w-4 h-4 text-emerald-600 shrink-0" />
                                )}
                                <div className="truncate">
                                  <p className="text-xs font-semibold text-foreground truncate">{file.name}</p>
                                  <span className="text-[10px] text-muted-foreground">
                                    {isPdf ? "PDF" : "IMAGE"} • {file.size || "1.2 MB"}
                                  </span>
                                </div>
                              </div>

                              <Button
                                size="sm"
                                variant="outline"
                                className="text-xs h-7 px-2.5 font-semibold text-blue-600 hover:text-blue-700 hover:bg-blue-50 shrink-0"
                                onClick={() => {
                                  triggerFileDownload(file.name);
                                  showToast(`Downloaded ${file.name}`);
                                }}
                              >
                                <Download className="w-3.5 h-3.5 mr-1" /> Download
                              </Button>
                            </div>
                          );
                        })
                      ) : (
                        <p className="text-xs text-muted-foreground italic">No document attached.</p>
                      )}
                    </div>

                    {/* Right Column: Upload Finished Document & Send to (Dropdown) */}
                    <div className="bg-blue-500/[0.03] rounded-xl p-3 border border-blue-500/20 space-y-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 block">
                        Upload Finished Document & Send
                      </span>

                      {/* File upload input */}
                      <div className="flex items-center gap-2">
                        <input
                          type="file"
                          id={`upload-${task.id}`}
                          className="hidden"
                          onChange={(e) => handleFileSelect(task.id, e)}
                        />
                        <label
                          htmlFor={`upload-${task.id}`}
                          className="flex-1 flex items-center justify-center gap-2 px-3 py-1.5 border border-dashed border-blue-400/50 hover:border-blue-600 rounded-lg cursor-pointer text-xs font-medium bg-card hover:bg-muted/30 transition-all truncate"
                        >
                          <UploadCloud className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                          <span className="truncate text-foreground">
                            {uploadedFiles[task.id]?.name ? (
                              <span className="text-emerald-600 font-semibold flex items-center gap-1">
                                <Check className="w-3 h-3" /> {uploadedFiles[task.id]?.name}
                              </span>
                            ) : (
                              "Upload finished image / PDF..."
                            )}
                          </span>
                        </label>
                      </div>

                      {/* Dropdown to send + Send button */}
                      <div className="flex items-center gap-2">
                        <select
                          value={currentRecipient}
                          onChange={(e) => handleRecipientChange(task.id, e.target.value)}
                          className="flex-1 h-8 px-2.5 rounded-md border border-input bg-card text-xs text-foreground font-semibold focus:outline-none focus:ring-1 focus:ring-blue-500"
                        >
                          <option value="PATENT_DRAFTER">Send to: Patent Drafter</option>
                          <option value="PATENT_ANALYST">Send to: Patent Analyst</option>
                          <option value="CEO">Send to: CEO</option>
                        </select>

                        <Button
                          size="sm"
                          className="bg-blue-600 hover:bg-blue-700 text-white text-xs h-8 px-3 font-bold shadow-sm shrink-0"
                          disabled={uploading[task.id]}
                          onClick={() => handleUploadAndSend(task)}
                        >
                          {uploading[task.id] ? (
                            "Sending..."
                          ) : (
                            <>
                              <Send className="w-3 h-3 mr-1" /> Send
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Row 3: Assign / Share to Team Member (Mail ID Feature) */}
                  <div className="bg-muted/15 rounded-xl p-3 border border-border/40 flex flex-col md:flex-row md:items-center justify-between gap-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <div className="flex items-center gap-1.5 text-xs text-foreground font-semibold">
                        <Mail className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                        <span>Assign / Delegate:</span>
                      </div>
                      {task.assigned_member_email ? (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/50 px-2.5 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          Assigned to: {task.assigned_member_email}
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground italic">
                          (General Design Team — unassigned member)
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                      {/* Option to share back with who assigned */}
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-[11px] h-8 text-muted-foreground hover:text-foreground shrink-0 border-border/50"
                        onClick={() => handleShareWithSender(task)}
                        title={`Share back with original sender: ${task.assigned_by}`}
                      >
                        <Share2 className="w-3 h-3 mr-1 text-blue-500" />
                        Share with {task.assigned_by?.split(' ')[0] || "Sender"} ({task.sender_role?.split('_')[0] || "Author"})
                      </Button>

                      {/* Mail ID Input */}
                      <Input
                        placeholder="Enter member mail ID (e.g. member@moat.ai)..."
                        value={memberEmails[task.id] || ""}
                        onChange={(e) => handleEmailChange(task.id, e.target.value)}
                        className="text-xs h-8 w-56 sm:w-64 font-mono bg-card"
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            handleAssignMember(task);
                          }
                        }}
                      />

                      {/* Assign Button */}
                      <Button
                        size="sm"
                        className="bg-blue-600 hover:bg-blue-700 text-white text-xs h-8 px-3 font-semibold shadow-sm shrink-0"
                        onClick={() => handleAssignMember(task)}
                        disabled={assigningMember[task.id]}
                      >
                        <UserPlus className="w-3.5 h-3.5 mr-1" />
                        {assigningMember[task.id] ? "Assigning..." : "Assign"}
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>
            );
          })
        )}
      </div>

      {/* Simple Modal to Add New Assignment */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-card border border-border/60 rounded-xl max-w-md w-full shadow-2xl overflow-hidden p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-border/40 pb-3">
              <h3 className="font-bold text-sm text-foreground">Assign New Work</h3>
              <button onClick={() => setShowCreateModal(false)} className="text-muted-foreground hover:text-foreground">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateAssignment} className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-foreground block mb-1">Project Title</label>
                <Input
                  value={newProjectTitle}
                  onChange={(e) => setNewProjectTitle(e.target.value)}
                  className="text-xs"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-foreground block mb-1">Assignment / Figure Title</label>
                <Input
                  placeholder="e.g. FIG 1 - Architecture Overview"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="text-xs"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-semibold text-foreground block mb-1">Who is Assigning?</label>
                  <select
                    value={newSenderRole}
                    onChange={(e) => {
                      const r = e.target.value;
                      setNewSenderRole(r);
                      setNewSenderName(r === "Patent Drafter" ? "Alice Drafter" : "Dr. Sarah Analyst");
                    }}
                    className="w-full h-8 px-2 rounded-md border border-input bg-card text-xs text-foreground"
                  >
                    <option value="Patent Drafter">Patent Drafter</option>
                    <option value="Patent Analyst">Patent Analyst</option>
                    <option value="CEO">CEO</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-foreground block mb-1">Sender Name</label>
                  <Input
                    value={newSenderName}
                    onChange={(e) => setNewSenderName(e.target.value)}
                    className="text-xs"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-foreground block mb-1">Assign to Member Email (Optional)</label>
                <Input
                  placeholder="e.g. designer@company.com"
                  value={newMemberEmail}
                  onChange={(e) => setNewMemberEmail(e.target.value)}
                  className="text-xs font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-semibold text-foreground block mb-1">Attached File Type</label>
                  <select
                    value={newFileType}
                    onChange={(e) => {
                      const t = e.target.value;
                      setNewFileType(t);
                      setNewFileName(t === "pdf" ? "Patent_Disclosure.pdf" : "FIG_Schematic_Draft.png");
                    }}
                    className="w-full h-8 px-2 rounded-md border border-input bg-card text-xs text-foreground"
                  >
                    <option value="image">Image (.png)</option>
                    <option value="pdf">Document (.pdf)</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-foreground block mb-1">File Name</label>
                  <Input
                    value={newFileName}
                    onChange={(e) => setNewFileName(e.target.value)}
                    className="text-xs"
                    required
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-border/40">
                <Button type="button" variant="outline" size="sm" onClick={() => setShowCreateModal(false)} className="text-xs">
                  Cancel
                </Button>
                <Button type="submit" size="sm" className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold" disabled={creating}>
                  {creating ? "Assigning..." : "Assign to Design Team"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
