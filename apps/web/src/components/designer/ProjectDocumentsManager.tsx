"use client";

import React, { useState, useMemo } from "react";
import { 
  Search, FileText, Image as ImageIcon, Download, Eye, 
  ExternalLink, Clock, Folder, CheckCircle, AlertCircle, FileCode, Filter,
  UploadCloud, Trash2, Plus, Grid, List, History, FileSpreadsheet, FileArchive, 
  ShieldCheck, Copy, Check, ZoomIn, ZoomOut, Printer, Maximize2, ChevronRight, 
  RefreshCw, SlidersHorizontal, Layers, X, FileCheck, ArrowUpRight, Lock, Sparkles
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { ProjectDocumentItem, DocumentVersionRecord } from "@/lib/design-team/types";

interface ProjectDocumentsManagerProps {
  documents: ProjectDocumentItem[];
  projectTitle?: string;
  projectId?: string;
  onOpenDocInEditor: (docId: string, category: string) => void;
  onPreviewDoc?: (doc: ProjectDocumentItem) => void;
  onUploadDoc?: (doc: Partial<ProjectDocumentItem> & { notes?: string }) => Promise<void> | void;
  onDeleteDoc?: (docId: string) => Promise<void> | void;
  onBumpVersion?: (docId: string, payload: { newVersion: string; notes: string; size?: string; fileFormat?: string }) => Promise<void> | void;
  onSwitchToStudio?: () => void;
  onSwitchToDocEditor?: () => void;
}

const CATEGORIES = [
  "All",
  "Disclosures",
  "Technical Documents",
  "Drawings",
  "PDFs",
  "Images",
  "Research References",
  "Export Files",
  "Submitted Documents",
  "Final Documents",
] as const;

export function ProjectDocumentsManager({
  documents,
  projectTitle = "Patent Application Specification",
  projectId = "",
  onOpenDocInEditor,
  onPreviewDoc,
  onUploadDoc,
  onDeleteDoc,
  onBumpVersion,
  onSwitchToStudio,
  onSwitchToDocEditor
}: ProjectDocumentsManagerProps) {
  const { toast } = useToast();

  // Search & Filter State
  const [activeCategory, setActiveCategory] = useState<string>("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [sortBy, setSortBy] = useState<"modified" | "title" | "size" | "version">("modified");
  const [viewMode, setViewMode] = useState<"table" | "grid">("table");

  // Modals & Panels State
  const [previewDoc, setPreviewDoc] = useState<ProjectDocumentItem | null>(null);
  const [previewZoom, setPreviewZoom] = useState(100);
  const [previewActiveTab, setPreviewActiveTab] = useState<"viewer" | "history" | "metadata">("viewer");
  const [copiedChecksum, setCopiedChecksum] = useState(false);

  // Upload Modal State
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [uploadTitle, setUploadTitle] = useState("");
  const [uploadCategory, setUploadCategory] = useState<string>("Disclosures");
  const [uploadFormat, setUploadFormat] = useState("PDF");
  const [uploadVersion, setUploadVersion] = useState("1.0");
  const [uploadNotes, setUploadNotes] = useState("");
  const [uploadTags, setUploadTags] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  // Revision Bump Modal State
  const [bumpDoc, setBumpDoc] = useState<ProjectDocumentItem | null>(null);
  const [bumpNewVersion, setBumpNewVersion] = useState("");
  const [bumpNotes, setBumpNotes] = useState("");
  const [isBumping, setIsBumping] = useState(false);

  // Delete Confirm State
  const [deleteConfirmDoc, setDeleteConfirmDoc] = useState<ProjectDocumentItem | null>(null);

  // Filtered and Sorted Documents
  const filteredDocs = useMemo(() => {
    return documents.filter((doc) => {
      const matchesCategory = activeCategory === "All" || doc.category === activeCategory;
      const matchesStatus = statusFilter === "All" || doc.workflowStatus === statusFilter;
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch = !q || 
        doc.title.toLowerCase().includes(q) ||
        doc.fileFormat.toLowerCase().includes(q) ||
        doc.createdBy.toLowerCase().includes(q) ||
        (doc.description && doc.description.toLowerCase().includes(q)) ||
        (doc.tags && doc.tags.some(t => t.toLowerCase().includes(q)));
      return matchesCategory && matchesStatus && matchesSearch;
    }).sort((a, b) => {
      if (sortBy === "title") return a.title.localeCompare(b.title);
      if (sortBy === "size") {
        const parseSize = (s: string) => parseFloat(s) * (s.includes("MB") ? 1024 : 1);
        return parseSize(b.size) - parseSize(a.size);
      }
      if (sortBy === "version") return String(b.version).localeCompare(String(a.version));
      return new Date(b.lastModified).getTime() - new Date(a.lastModified).getTime();
    });
  }, [documents, activeCategory, statusFilter, searchQuery, sortBy]);

  // Format Badges & Icons
  const getFormatIcon = (fmt: string) => {
    const f = fmt.toUpperCase();
    if (f.includes("PDF")) return <FileText className="w-4 h-4 text-rose-600 shrink-0" />;
    if (f.includes("DOC")) return <FileCode className="w-4 h-4 text-blue-600 shrink-0" />;
    if (f.includes("SVG") || f.includes("PNG")) return <ImageIcon className="w-4 h-4 text-purple-600 shrink-0" />;
    if (f.includes("ZIP") || f.includes("TAR")) return <FileArchive className="w-4 h-4 text-amber-600 shrink-0" />;
    return <FileText className="w-4 h-4 text-slate-600 shrink-0" />;
  };

  const getFormatBadge = (fmt: string) => {
    const f = fmt.toUpperCase();
    if (f.includes("PDF")) return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400 border border-rose-200 dark:border-rose-900">PDF</span>;
    if (f.includes("DOC")) return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-400 border border-blue-200 dark:border-blue-900">DOCX</span>;
    if (f.includes("SVG") || f.includes("PNG")) return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-400 border border-purple-200 dark:border-purple-900">{f}</span>;
    if (f.includes("ZIP")) return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400 border border-amber-200 dark:border-amber-900">ZIP</span>;
    return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700">{f}</span>;
  };

  const getStatusBadge = (status: string) => {
    if (["Approved", "Completed", "Verified"].includes(status)) {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 px-2 py-0.5 rounded">
          <CheckCircle className="w-3 h-3" /> {status}
        </span>
      );
    }
    if (["Under Review", "In Progress"].includes(status)) {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 px-2 py-0.5 rounded">
          <Clock className="w-3 h-3" /> {status}
        </span>
      );
    }
    if (status === "Ready for Export") {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-700 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 px-2 py-0.5 rounded">
          <Sparkles className="w-3 h-3" /> {status}
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 px-2 py-0.5 rounded">
        {status}
      </span>
    );
  };

  // Actions
  const handleDownloadFile = (doc: ProjectDocumentItem) => {
    toast({
      title: "Downloading Document",
      description: `Initiating secure download of ${doc.title} (${doc.fileFormat}, ${doc.size}).`
    });
    // Create simulated file download
    const blob = new Blob([`MOAT IP Intelligence Repository - Official Patent Dossier\nDocument ID: ${doc.id}\nTitle: ${doc.title}\nCategory: ${doc.category}\nVersion: ${doc.version}\nChecksum: ${doc.checksum || 'sha256-verified'}`], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${doc.title.replace(/[^a-zA-Z0-9_-]/g, "_")}_v${doc.version}.${doc.fileFormat.toLowerCase().split("/")[0]}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleCopyChecksum = (checksum?: string) => {
    if (!checksum) return;
    navigator.clipboard.writeText(checksum);
    setCopiedChecksum(true);
    setTimeout(() => setCopiedChecksum(false), 2000);
    toast({ title: "Checksum Copied", description: "SHA-256 hash copied to clipboard for cryptographic verification." });
  };

  const handleOpenUploadModal = () => {
    setUploadTitle("");
    setUploadCategory("Disclosures");
    setUploadFormat("PDF");
    setUploadVersion("1.0");
    setUploadNotes("");
    setUploadTags("");
    setIsUploadModalOpen(true);
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadTitle.trim()) {
      toast({ title: "Validation Error", description: "Document title is required.", variant: "destructive" });
      return;
    }

    setIsUploading(true);
    const tagsArray = uploadTags.split(",").map(t => t.trim()).filter(Boolean);

    try {
      if (onUploadDoc) {
        await onUploadDoc({
          title: uploadTitle.trim(),
          category: uploadCategory as any,
          fileFormat: uploadFormat,
          version: uploadVersion || "1.0",
          size: "2.1 MB",
          notes: uploadNotes || "Uploaded via Document Repository manager.",
          tags: tagsArray.length > 0 ? tagsArray : [uploadCategory]
        });
      }
      setIsUploadModalOpen(false);
    } catch (err: any) {
      toast({ title: "Upload Failed", description: err.message, variant: "destructive" });
    } finally {
      setIsUploading(false);
    }
  };

  const handleOpenBumpVersion = (doc: ProjectDocumentItem) => {
    setBumpDoc(doc);
    const curr = String(doc.version);
    const num = parseFloat(curr);
    const nextVer = !isNaN(num) ? (num + 0.1).toFixed(1) : `${curr}.1`;
    setBumpNewVersion(nextVer);
    setBumpNotes("");
    setIsBumping(false);
  };

  const handleBumpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bumpDoc) return;
    if (!bumpNewVersion.trim()) {
      toast({ title: "Validation Error", description: "New version number is required.", variant: "destructive" });
      return;
    }

    setIsBumping(true);
    try {
      if (onBumpVersion) {
        await onBumpVersion(bumpDoc.id, {
          newVersion: bumpNewVersion.trim(),
          notes: bumpNotes.trim() || `Incremental revision update to v${bumpNewVersion}`,
          size: bumpDoc.size
        });
      }
      setBumpDoc(null);
    } catch (err: any) {
      toast({ title: "Version Update Failed", description: err.message, variant: "destructive" });
    } finally {
      setIsBumping(false);
    }
  };

  const handleDeleteSubmit = async () => {
    if (!deleteConfirmDoc) return;
    try {
      if (onDeleteDoc) {
        await onDeleteDoc(deleteConfirmDoc.id);
      }
      setDeleteConfirmDoc(null);
    } catch (err: any) {
      toast({ title: "Delete Failed", description: err.message, variant: "destructive" });
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-50 dark:bg-slate-950 overflow-hidden">
      {/* ─── MASTHEAD & REPOSITORY CONTROL HEADER ────────────────────── */}
      <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-6 py-4 shrink-0 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-400">
                Project Dossier • {projectId}
              </span>
              <span className="flex items-center gap-1 text-[11px] text-slate-500 font-medium">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> 37 CFR 1.14 Confidential
              </span>
            </div>
            <h1 className="text-xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
              Centralized Project Document Repository
            </h1>
            <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">
              Secure IP document management, multi-version audit trails, and USPTO compliance assets for <strong className="text-slate-700 dark:text-slate-300">{projectTitle}</strong>.
            </p>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                toast({
                  title: "Preparing ZIP Archive",
                  description: `Packaging all ${documents.length} project documents with cryptographic manifest.`
                });
              }}
              className="h-8 text-xs font-semibold text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <FileArchive className="w-3.5 h-3.5 mr-1.5 text-amber-600" /> Export All (.zip)
            </Button>
            <Button
              size="sm"
              onClick={handleOpenUploadModal}
              className="h-8 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-xs"
            >
              <UploadCloud className="w-3.5 h-3.5 mr-1.5" /> Upload Document
            </Button>
          </div>
        </div>

        {/* Quick Repository Metrics Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-blue-50 dark:bg-blue-950/60 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0">
              <Folder className="w-3.5 h-3.5" />
            </div>
            <div>
              <span className="text-[10px] text-slate-400 font-semibold block uppercase tracking-wider">Total Documents</span>
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200">{documents.length} Files Indexed</span>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-purple-50 dark:bg-purple-950/60 flex items-center justify-center text-purple-600 dark:text-purple-400 shrink-0">
              <Layers className="w-3.5 h-3.5" />
            </div>
            <div>
              <span className="text-[10px] text-slate-400 font-semibold block uppercase tracking-wider">Vault Footprint</span>
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200">54.1 MB Allocated</span>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
              <CheckCircle className="w-3.5 h-3.5" />
            </div>
            <div>
              <span className="text-[10px] text-slate-400 font-semibold block uppercase tracking-wider">USPTO Verification</span>
              <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">100% Compliant</span>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-amber-50 dark:bg-amber-950/60 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0">
              <History className="w-3.5 h-3.5" />
            </div>
            <div>
              <span className="text-[10px] text-slate-400 font-semibold block uppercase tracking-wider">Audit Versions</span>
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                {documents.reduce((acc, d) => acc + (d.versionHistory?.length || 1), 0)} Revisions Tracked
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ─── CATEGORY FILTER PILLS & TOOLBAR ───────────────────────── */}
      <div className="px-6 py-3 bg-white/70 dark:bg-slate-900/70 border-b border-slate-200 dark:border-slate-800 shrink-0 backdrop-blur-xs">
        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-2 scrollbar-thin">
          {CATEGORIES.map((cat) => {
            const count = cat === "All" ? documents.length : documents.filter((d) => d.category === cat).length;
            const isActive = activeCategory === cat;
            return (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                  isActive
                    ? "bg-blue-600 text-white shadow-xs"
                    : "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                }`}
              >
                <span>{cat}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-semibold ${
                  isActive ? "bg-white/20 text-white" : "bg-slate-100 dark:bg-slate-800 text-slate-500"
                }`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Search, Filter & View Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mt-2 pt-2 border-t border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2 flex-1 max-w-md">
            <div className="relative w-full">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search by title, format, author, or tags..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 dark:text-slate-200"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-2.5 py-1.5 text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
            >
              <option value="All">All Statuses</option>
              <option value="Approved">Approved</option>
              <option value="In Progress">In Progress</option>
              <option value="Under Review">Under Review</option>
              <option value="Active">Active</option>
              <option value="Ready for Export">Ready for Export</option>
              <option value="Completed">Completed</option>
            </select>
          </div>

          <div className="flex items-center gap-2 justify-end">
            {/* Sort Select */}
            <div className="flex items-center gap-1 text-xs text-slate-500 font-medium">
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>Sort:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="bg-transparent border-none text-xs font-bold text-slate-700 dark:text-slate-300 focus:outline-none cursor-pointer pr-1"
              >
                <option value="modified">Last Modified</option>
                <option value="title">Title (A-Z)</option>
                <option value="size">Size (Largest)</option>
                <option value="version">Version</option>
              </select>
            </div>

            <div className="h-4 w-[1px] bg-slate-200 dark:bg-slate-800" />

            {/* View Mode Toggle */}
            <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-lg p-0.5 border border-slate-200 dark:border-slate-700">
              <button
                onClick={() => setViewMode("table")}
                className={`p-1 rounded text-xs transition-all ${
                  viewMode === "table" ? "bg-white dark:bg-slate-900 text-blue-600 shadow-xs" : "text-slate-500 hover:text-slate-800"
                }`}
                title="Table List View"
              >
                <List className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setViewMode("grid")}
                className={`p-1 rounded text-xs transition-all ${
                  viewMode === "grid" ? "bg-white dark:bg-slate-900 text-blue-600 shadow-xs" : "text-slate-500 hover:text-slate-800"
                }`}
                title="Grid Card View"
              >
                <Grid className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ─── DOCUMENTS VIEW (TABLE OR GRID) ─────────────────────────── */}
      <div className="flex-1 overflow-auto p-6">
        {filteredDocs.length === 0 ? (
          <div className="h-64 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl flex flex-col items-center justify-center p-8 text-center shadow-xs">
            <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 mb-3">
              <Folder className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-sm text-slate-800 dark:text-slate-200">No documents found</h3>
            <p className="text-xs text-slate-500 max-w-sm mt-1 mb-4">
              {searchQuery || statusFilter !== "All" || activeCategory !== "All"
                ? "No files match the currently active category or query. Try resetting filters."
                : "No files have been added to this project repository yet."}
            </p>
            <div className="flex gap-2">
              {(searchQuery || statusFilter !== "All" || activeCategory !== "All") && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setActiveCategory("All");
                    setStatusFilter("All");
                    setSearchQuery("");
                  }}
                  className="text-xs"
                >
                  Clear Filters
                </Button>
              )}
              <Button size="sm" onClick={handleOpenUploadModal} className="text-xs bg-blue-600 text-white">
                <UploadCloud className="w-3.5 h-3.5 mr-1" /> Upload Document
              </Button>
            </div>
          </div>
        ) : viewMode === "table" ? (
          /* Table View */
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs table-fixed">
                <colgroup>
                  <col className="w-[26%]" />
                  <col className="w-[13%]" />
                  <col className="w-[9%]" />
                  <col className="w-[6%]" />
                  <col className="w-[11%]" />
                  <col className="w-[8%]" />
                  <col className="w-[11%]" />
                  <col className="w-[16%]" />
                </colgroup>
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                    <th className="py-2.5 px-3">Document Title & Details</th>
                    <th className="py-2.5 px-2">Category</th>
                    <th className="py-2.5 px-2">Format / Size</th>
                    <th className="py-2.5 px-2">Version</th>
                    <th className="py-2.5 px-2">Author</th>
                    <th className="py-2.5 px-2">Modified</th>
                    <th className="py-2.5 px-2">Status</th>
                    <th className="py-2.5 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                  {filteredDocs.map((doc) => (
                    <tr
                      key={doc.id}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors group"
                    >
                      {/* Title & Metadata */}
                      <td className="py-2.5 px-3">
                        <div className="flex items-start gap-2.5 min-w-0">
                          <div className="mt-0.5 p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 shrink-0">
                            {getFormatIcon(doc.fileFormat)}
                          </div>
                          <div className="min-w-0 flex-1">
                            <span className="font-bold text-slate-900 dark:text-slate-100 hover:text-blue-600 cursor-pointer block truncate" onClick={() => setPreviewDoc(doc)}>
                              {doc.title}
                            </span>
                            {doc.description && (
                              <p className="text-[11px] text-slate-500 truncate mt-0.5 font-normal">
                                {doc.description}
                              </p>
                            )}
                            {doc.tags && doc.tags.length > 0 && (
                              <div className="flex items-center gap-1 mt-1 overflow-hidden">
                                {doc.tags.slice(0, 3).map((tag, i) => (
                                  <span key={i} className="text-[9px] px-1.5 py-0.2 bg-slate-100 dark:bg-slate-800 text-slate-500 rounded font-medium truncate">
                                    #{tag}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Category */}
                      <td className="py-2.5 px-2 truncate">
                        <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded truncate inline-block max-w-full">
                          {doc.category}
                        </span>
                      </td>

                      {/* Format & Size */}
                      <td className="py-2.5 px-2">
                        <div className="flex items-center gap-1.5 truncate">
                          {getFormatBadge(doc.fileFormat)}
                          <span className="text-[11px] text-slate-500 font-medium truncate">{doc.size}</span>
                        </div>
                      </td>

                      {/* Version & History Badge */}
                      <td className="py-2.5 px-2">
                        <button
                          onClick={() => {
                            setPreviewDoc(doc);
                            setPreviewActiveTab("history");
                          }}
                          className="flex items-center gap-1 font-mono font-bold text-slate-800 dark:text-slate-200 hover:text-blue-600 transition-colors"
                          title="Click to view full revision history"
                        >
                          <span>v{doc.version}</span>
                          {doc.versionHistory && doc.versionHistory.length > 1 && (
                            <span className="text-[9px] px-1 py-0.2 bg-blue-100 dark:bg-blue-950 text-blue-600 rounded font-semibold">
                              {doc.versionHistory.length}
                            </span>
                          )}
                        </button>
                      </td>

                      {/* Author */}
                      <td className="py-2.5 px-2 text-slate-600 dark:text-slate-400 font-medium truncate text-[11px]">
                        {doc.createdBy}
                      </td>

                      {/* Last Modified */}
                      <td className="py-2.5 px-2 text-slate-500 text-[11px] truncate">
                        {doc.lastModified}
                      </td>

                      {/* Status */}
                      <td className="py-2.5 px-2 truncate">
                        {getStatusBadge(doc.workflowStatus)}
                      </td>

                      {/* Actions */}
                      <td className="py-2.5 px-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setPreviewDoc(doc);
                              setPreviewActiveTab("viewer");
                            }}
                            className="h-7 w-7 p-0 text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
                            title="Preview Document"
                          >
                            <Eye className="w-3.5 h-3.5 mx-auto text-slate-500" />
                          </Button>

                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onOpenDocInEditor(doc.id, doc.category)}
                            className="h-7 text-xs px-2 text-blue-600 border-blue-200 hover:bg-blue-50 dark:hover:bg-blue-950/40"
                            title="Open in specialized editor"
                          >
                            <ExternalLink className="w-3 h-3 mr-1" /> Open
                          </Button>

                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDownloadFile(doc)}
                            className="h-7 w-7 p-0 text-slate-500 hover:text-slate-900 dark:text-slate-400"
                            title="Download Document"
                          >
                            <Download className="w-3.5 h-3.5 mx-auto" />
                          </Button>

                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenBumpVersion(doc)}
                            className="h-7 w-7 p-0 text-slate-500 hover:text-blue-600"
                            title="Upload new revision version"
                          >
                            <UploadCloud className="w-3.5 h-3.5 mx-auto" />
                          </Button>

                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setDeleteConfirmDoc(doc)}
                            className="h-7 w-7 p-0 text-slate-400 hover:text-red-600"
                            title="Delete Document"
                          >
                            <Trash2 className="w-3.5 h-3.5 mx-auto" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          /* Grid View */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredDocs.map((doc) => (
              <div
                key={doc.id}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 flex flex-col justify-between hover:shadow-md transition-all group"
              >
                <div>
                  {/* Top Badges */}
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-bold text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                      {doc.category}
                    </span>
                    <div className="flex items-center gap-1.5">
                      {getFormatBadge(doc.fileFormat)}
                      <span className="font-mono text-xs font-bold text-slate-700 dark:text-slate-300">v{doc.version}</span>
                    </div>
                  </div>

                  {/* Title & Preview Header */}
                  <div className="flex items-start gap-2.5 my-2">
                    <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 shrink-0">
                      {getFormatIcon(doc.fileFormat)}
                    </div>
                    <div>
                      <h4
                        onClick={() => setPreviewDoc(doc)}
                        className="font-bold text-xs text-slate-900 dark:text-slate-100 hover:text-blue-600 cursor-pointer line-clamp-1"
                      >
                        {doc.title}
                      </h4>
                      <p className="text-[11px] text-slate-500 line-clamp-2 mt-0.5">
                        {doc.description || "Project document filed under " + doc.category}
                      </p>
                    </div>
                  </div>

                  {/* Metadata Row */}
                  <div className="mt-3 pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[11px] text-slate-500">
                    <span>{doc.size}</span>
                    <span>Mod: {doc.lastModified}</span>
                  </div>

                  <div className="mt-2 flex items-center justify-between">
                    {getStatusBadge(doc.workflowStatus)}
                    <span className="text-[10px] text-slate-400 font-medium">By {doc.createdBy.split(" ")[0]}</span>
                  </div>
                </div>

                {/* Bottom Actions */}
                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setPreviewDoc(doc);
                      setPreviewActiveTab("viewer");
                    }}
                    className="h-7 text-xs px-2 text-slate-600"
                  >
                    <Eye className="w-3.5 h-3.5 mr-1 text-slate-500" /> Preview
                  </Button>

                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDownloadFile(doc)}
                      className="h-7 text-xs px-2 text-slate-600"
                      title="Download File"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onOpenDocInEditor(doc.id, doc.category)}
                      className="h-7 text-xs px-2 text-blue-600 border-blue-200 hover:bg-blue-50"
                    >
                      <ExternalLink className="w-3.5 h-3.5 mr-1" /> Open
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ─── SECURE IN-BROWSER DOCUMENT PREVIEW MODAL / DRAWER ──────── */}
      {previewDoc && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-5xl h-[88vh] flex flex-col shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            {/* Modal Header */}
            <div className="px-6 py-3.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/60 shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs">
                  {getFormatIcon(previewDoc.fileFormat)}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-black text-sm text-slate-900 dark:text-slate-100">{previewDoc.title}</h3>
                    <span className="font-mono text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950 px-1.5 py-0.5 rounded">
                      v{previewDoc.version}
                    </span>
                    {getStatusBadge(previewDoc.workflowStatus)}
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-2">
                    <span>{previewDoc.category}</span>
                    <span>•</span>
                    <span>{previewDoc.size}</span>
                    <span>•</span>
                    <span>Modified: {previewDoc.lastModified}</span>
                  </p>
                </div>
              </div>

              {/* Header Right Actions */}
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDownloadFile(previewDoc)}
                  className="h-8 text-xs font-semibold"
                >
                  <Download className="w-3.5 h-3.5 mr-1 text-slate-500" /> Download File
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const doc = previewDoc;
                    setPreviewDoc(null);
                    onOpenDocInEditor(doc.id, doc.category);
                  }}
                  className="h-8 text-xs font-semibold text-blue-600 border-blue-200 hover:bg-blue-50"
                >
                  <ExternalLink className="w-3.5 h-3.5 mr-1" /> Open in Editor
                </Button>
                <button
                  aria-label="Close preview modal"
                  data-testid="close-preview-modal"
                  onClick={() => setPreviewDoc(null)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Sub-tab Bar */}
            <div className="px-6 py-2 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between shrink-0 text-xs">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPreviewActiveTab("viewer")}
                  className={`px-3 py-1 rounded-md font-bold transition-all ${
                    previewActiveTab === "viewer"
                      ? "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300"
                      : "text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800"
                  }`}
                >
                  Document Viewer
                </button>
                <button
                  onClick={() => setPreviewActiveTab("history")}
                  className={`px-3 py-1 rounded-md font-bold transition-all flex items-center gap-1.5 ${
                    previewActiveTab === "history"
                      ? "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300"
                      : "text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800"
                  }`}
                >
                  <History className="w-3.5 h-3.5" />
                  <span>Version History</span>
                  <span className="text-[10px] bg-slate-200 dark:bg-slate-700 px-1.5 py-0.2 rounded-full">
                    {previewDoc.versionHistory?.length || 1}
                  </span>
                </button>
                <button
                  onClick={() => setPreviewActiveTab("metadata")}
                  className={`px-3 py-1 rounded-md font-bold transition-all flex items-center gap-1.5 ${
                    previewActiveTab === "metadata"
                      ? "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300"
                      : "text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800"
                  }`}
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Integrity & Security</span>
                </button>
              </div>

              {/* Viewer Zoom & Tools (only in viewer mode) */}
              {previewActiveTab === "viewer" && (
                <div className="flex items-center gap-2 text-slate-500">
                  <button
                    onClick={() => setPreviewZoom(Math.max(50, previewZoom - 15))}
                    className="p-1 hover:text-slate-800 dark:hover:text-slate-200"
                    title="Zoom Out"
                  >
                    <ZoomOut className="w-3.5 h-3.5" />
                  </button>
                  <span className="font-mono text-[11px] font-bold w-12 text-center">{previewZoom}%</span>
                  <button
                    onClick={() => setPreviewZoom(Math.min(200, previewZoom + 15))}
                    className="p-1 hover:text-slate-800 dark:hover:text-slate-200"
                    title="Zoom In"
                  >
                    <ZoomIn className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setPreviewZoom(100)}
                    className="text-[10px] px-1.5 py-0.5 border rounded hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
                    Reset
                  </button>
                </div>
              )}
            </div>

            {/* Modal Body / Split Panes */}
            <div className="flex-1 overflow-auto bg-slate-100 dark:bg-slate-950 p-6 flex justify-center">
              {previewActiveTab === "viewer" && (
                <div
                  className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-lg shadow-lg p-10 max-w-3xl w-full min-h-[500px] transition-all origin-top"
                  style={{ transform: `scale(${previewZoom / 100})`, transformOrigin: "top center" }}
                >
                  {/* USPTO Legal Sheet Header */}
                  <div className="border-b-2 border-slate-900 dark:border-slate-100 pb-4 mb-6 flex justify-between items-start">
                    <div>
                      <span className="text-[9px] font-bold tracking-widest uppercase text-slate-400 block">
                        United States Patent and Trademark Office • Electronic Filing
                      </span>
                      <h2 className="text-base font-black text-slate-900 dark:text-slate-100 mt-1 uppercase">
                        {previewDoc.title}
                      </h2>
                      <span className="text-[11px] text-slate-500 block">
                        Dossier Application: US App. 18/492,031 • Art Unit: 2145 • Group: Computer Architecture
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="font-mono text-xs font-bold text-slate-800 dark:text-slate-200 block">
                        SHEET 1 OF 3
                      </span>
                      <span className="text-[9px] font-bold text-rose-600 uppercase border border-rose-300 px-1.5 py-0.5 rounded mt-1 inline-block">
                        CONFIDENTIAL ATTORNEY-CLIENT PRIVILEGED
                      </span>
                    </div>
                  </div>

                  {/* Render simulated content based on category */}
                  {previewDoc.category === "Drawings" ? (
                    <div>
                      <div className="border border-dashed border-slate-300 dark:border-slate-700 p-6 rounded bg-slate-50 dark:bg-slate-800/40 text-center">
                        <span className="text-xs font-mono font-bold block mb-4">FIG. 1 — HIGH-LEVEL SYSTEM ARCHITECTURE</span>
                        <svg className="w-full max-w-md mx-auto h-48 border border-slate-400 bg-white" viewBox="0 0 500 200">
                          <rect x="50" y="30" width="120" height="60" rx="4" fill="#ffffff" stroke="#000" strokeWidth="2" />
                          <text x="110" y="65" textAnchor="middle" fontSize="12" fontWeight="bold">EDGE PROBE 102</text>
                          <line x1="170" y1="60" x2="250" y2="60" stroke="#000" strokeWidth="2" markerEnd="url(#arrow)" />
                          <rect x="250" y="30" width="140" height="60" rx="4" fill="#ffffff" stroke="#000" strokeWidth="2" />
                          <text x="320" y="65" textAnchor="middle" fontSize="12" fontWeight="bold">ENCLAVE CORE 100</text>
                          <rect x="250" y="120" width="140" height="50" rx="4" fill="#ffffff" stroke="#000" strokeWidth="2" />
                          <text x="320" y="150" textAnchor="middle" fontSize="12" fontWeight="bold">STORAGE 112</text>
                          <line x1="320" y1="90" x2="320" y2="120" stroke="#000" strokeWidth="2" />
                        </svg>
                        <p className="text-[10px] text-slate-500 mt-4 font-mono">
                          Compliance: 37 CFR 1.84 Clean Monochrome Vector • Printable Margin Checked
                        </p>
                      </div>
                    </div>
                  ) : previewDoc.category === "Images" ? (
                    <div className="bg-slate-950 p-6 rounded-lg text-center flex flex-col items-center justify-center">
                      <div className="w-72 h-52 border border-slate-700 bg-radial from-slate-800 to-black rounded flex items-center justify-center text-slate-500">
                        <ImageIcon className="w-12 h-12 text-slate-600 mb-2" />
                      </div>
                      <span className="text-xs text-slate-400 mt-3 font-mono font-semibold">
                        Micrograph Resolution: 3840 x 2160 • 40nm Calibrated Transmission Electron Scan
                      </span>
                    </div>
                  ) : (
                    <div className="space-y-4 text-xs leading-relaxed text-slate-700 dark:text-slate-300 font-serif">
                      <p>
                        <strong>[0001] TECHNICAL FIELD:</strong> The present invention relates to distributed network security systems, specifically real-time hardware-enclave neural classification engines operating within a strict latency envelope.
                      </p>
                      <p>
                        <strong>[0002] BACKGROUND OF THE INVENTION:</strong> Conventional intrusion prevention systems suffer from kernel space copy overhead, causing packet drop during high-throughput DDoS saturation attacks exceeding 100 Gbps.
                      </p>
                      <p>
                        <strong>[0003] SUMMARY:</strong> The presently disclosed embodiment implements direct memory ring zero-copy forwarding from network interface cards directly to a hardware isolated attestation enclave. As referenced in <strong>FIG. 1 (100)</strong>, neural classification converges in under 2.5 milliseconds.
                      </p>
                      <div className="border border-slate-200 dark:border-slate-800 rounded p-3 bg-slate-50 dark:bg-slate-800/40 my-3 font-sans">
                        <span className="text-[11px] font-bold text-slate-900 dark:text-slate-100 block mb-1">
                          Document Concordance & References:
                        </span>
                        <ul className="list-disc pl-4 text-[11px] space-y-0.5 text-slate-600 dark:text-slate-400">
                          <li>Reference Numeral 100: Central Orchestration Platform</li>
                          <li>Reference Numeral 102: Edge Telemetry Probe</li>
                          <li>Reference Numeral 104: Zero-Knowledge Verification Circuit</li>
                        </ul>
                      </div>
                    </div>
                  )}

                  {/* Document Footer */}
                  <div className="mt-8 pt-4 border-t border-slate-200 dark:border-slate-800 flex justify-between items-center text-[10px] text-slate-400 font-mono">
                    <span>MOAT IP INTELLIGENCE PLATFORM</span>
                    <span>VERIFIED ATTESTATION: {previewDoc.checksum?.slice(0, 20)}...</span>
                  </div>
                </div>
              )}

              {/* Version History Tab */}
              {previewActiveTab === "history" && (
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 max-w-2xl w-full shadow-xs">
                  <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100 dark:border-slate-800">
                    <div>
                      <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">Revision History Timeline</h3>
                      <p className="text-xs text-slate-500">Audit trail of all modifications and historical releases.</p>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => handleOpenBumpVersion(previewDoc)}
                      className="text-xs bg-blue-600 text-white font-bold"
                    >
                      <UploadCloud className="w-3.5 h-3.5 mr-1" /> New Version
                    </Button>
                  </div>

                  <div className="space-y-4">
                    {(previewDoc.versionHistory || [
                      { version: previewDoc.version, date: previewDoc.lastModified, author: previewDoc.createdBy, notes: previewDoc.description || "Active revision.", size: previewDoc.size }
                    ]).map((hist, idx) => (
                      <div key={idx} className="flex items-start gap-3 relative">
                        <div className="w-8 h-8 rounded-full bg-blue-50 dark:bg-blue-950 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0 font-bold text-xs mt-0.5">
                          v{hist.version}
                        </div>
                        <div className="flex-1 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 rounded-lg p-3">
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-bold text-xs text-slate-800 dark:text-slate-200">
                              Revision v{hist.version} {idx === 0 && <span className="text-[10px] bg-emerald-100 text-emerald-700 px-1.5 py-0.2 rounded font-bold ml-1">Current Active</span>}
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono">{new Date(hist.date).toLocaleDateString()}</span>
                          </div>
                          <p className="text-xs text-slate-600 dark:text-slate-400 mb-2">{hist.notes}</p>
                          <div className="flex items-center justify-between text-[11px] text-slate-500">
                            <span>Author: <strong>{hist.author}</strong></span>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                toast({ title: "Downloading Revision", description: `Downloading revision v${hist.version}` });
                              }}
                              className="h-6 text-[11px] px-2 text-blue-600 hover:text-blue-700"
                            >
                              <Download className="w-3 h-3 mr-1" /> Download
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Metadata & Integrity Tab */}
              {previewActiveTab === "metadata" && (
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 max-w-2xl w-full shadow-xs">
                  <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100 mb-1">Cryptographic & Regulatory Integrity</h3>
                  <p className="text-xs text-slate-500 mb-4">Metadata verification record for USPTO patent prosecution submission.</p>

                  <div className="space-y-3 text-xs">
                    <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700/60 flex justify-between items-center">
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Security Classification</span>
                        <span className="font-bold text-slate-800 dark:text-slate-200">{previewDoc.securityClassification || "Confidential Attorney-Client Work Product"}</span>
                      </div>
                      <ShieldCheck className="w-5 h-5 text-emerald-600" />
                    </div>

                    <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700/60">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">SHA-256 Digest Checksum</span>
                        <button
                          onClick={() => handleCopyChecksum(previewDoc.checksum)}
                          className="flex items-center gap-1 text-[11px] text-blue-600 font-semibold hover:underline"
                        >
                          {copiedChecksum ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                          {copiedChecksum ? "Copied" : "Copy Hash"}
                        </button>
                      </div>
                      <code className="text-[11px] font-mono break-all text-slate-700 dark:text-slate-300">
                        {previewDoc.checksum || "sha256:4a8e2b9c7d1e3f5a8901b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3"}
                      </code>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg border">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Target Matter</span>
                        <span className="font-bold text-slate-800 dark:text-slate-200">{projectId}</span>
                      </div>
                      <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg border">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Workflow Status</span>
                        <span className="font-bold text-slate-800 dark:text-slate-200">{previewDoc.workflowStatus}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ─── UPLOAD DOCUMENT MODAL ──────────────────────────────────── */}
      {isUploadModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-lg shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/60">
              <div>
                <h3 className="font-black text-sm text-slate-900 dark:text-slate-100">Upload Project Document</h3>
                <p className="text-xs text-slate-500">Add an invention disclosure, drawing, or technical spec to {projectId}.</p>
              </div>
              <button
                aria-label="Close upload modal"
                data-testid="close-upload-modal"
                onClick={() => setIsUploadModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUploadSubmit} className="p-6 space-y-4 text-xs">
              {/* Drag-and-Drop Zone */}
              <div
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragOver(false);
                  const file = e.dataTransfer.files[0];
                  if (file) {
                    setUploadTitle(file.name.replace(/\.[^/.]+$/, ""));
                    if (file.name.endsWith(".pdf")) setUploadFormat("PDF");
                    else if (file.name.endsWith(".docx")) setUploadFormat("DOCX");
                    else if (file.name.endsWith(".svg")) setUploadFormat("SVG");
                    else if (file.name.endsWith(".png")) setUploadFormat("PNG");
                    else if (file.name.endsWith(".zip")) setUploadFormat("ZIP");
                    toast({ title: "File Detected", description: `Selected "${file.name}" for upload.` });
                  }
                }}
                className={`border-2 border-dashed rounded-xl p-6 text-center transition-all ${
                  dragOver
                    ? "border-blue-500 bg-blue-50/50 dark:bg-blue-950/30"
                    : "border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/30"
                }`}
              >
                <UploadCloud className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                <span className="font-bold text-slate-800 dark:text-slate-200 block text-xs">
                  Drag and drop your file here, or click to browse
                </span>
                <span className="text-[10px] text-slate-400 mt-1 block">
                  Supports PDF, DOCX, SVG, PNG, ZIP, JSON (Max 100 MB)
                </span>
                <input
                  type="file"
                  id="file-upload"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      setUploadTitle(file.name.replace(/\.[^/.]+$/, ""));
                      if (file.name.endsWith(".pdf")) setUploadFormat("PDF");
                      else if (file.name.endsWith(".docx")) setUploadFormat("DOCX");
                      else if (file.name.endsWith(".svg")) setUploadFormat("SVG");
                      else if (file.name.endsWith(".png")) setUploadFormat("PNG");
                      else if (file.name.endsWith(".zip")) setUploadFormat("ZIP");
                    }
                  }}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => document.getElementById("file-upload")?.click()}
                  className="mt-3 text-xs"
                >
                  Browse Files
                </Button>
              </div>

              {/* Title Input */}
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Document Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g., Novel Memory Ring Interface Specification"
                  value={uploadTitle}
                  onChange={(e) => setUploadTitle(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Category & Format Select */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Category *
                  </label>
                  <select
                    value={uploadCategory}
                    onChange={(e) => setUploadCategory(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {CATEGORIES.filter(c => c !== "All").map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    File Format *
                  </label>
                  <select
                    value={uploadFormat}
                    onChange={(e) => setUploadFormat(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="PDF">PDF Document</option>
                    <option value="DOCX">Microsoft Word (DOCX)</option>
                    <option value="SVG">Vector Drawing (SVG)</option>
                    <option value="PNG">Micrograph / Image (PNG)</option>
                    <option value="ZIP">Package Archive (ZIP)</option>
                  </select>
                </div>
              </div>

              {/* Version & Tags */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Initial Version
                  </label>
                  <input
                    type="text"
                    placeholder="1.0"
                    value={uploadVersion}
                    onChange={(e) => setUploadVersion(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Tags (Comma-separated)
                  </label>
                  <input
                    type="text"
                    placeholder="Patent, Spec, 37 CFR"
                    value={uploadTags}
                    onChange={(e) => setUploadTags(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Description / Notes */}
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Change Notes / Summary
                </label>
                <textarea
                  rows={2}
                  placeholder="Summary of document purpose or modifications..."
                  value={uploadNotes}
                  onChange={(e) => setUploadNotes(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Modal Buttons */}
              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsUploadModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={isUploading}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold"
                >
                  {isUploading ? "Uploading..." : "Save to Repository"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── BUMP VERSION MODAL ─────────────────────────────────────── */}
      {bumpDoc && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-md shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/60">
              <div>
                <h3 className="font-black text-sm text-slate-900 dark:text-slate-100">Upload New Revision</h3>
                <p className="text-xs text-slate-500">Increment version for "{bumpDoc.title}".</p>
              </div>
              <button
                aria-label="Close bump modal"
                data-testid="close-bump-modal"
                onClick={() => setBumpDoc(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleBumpSubmit} className="p-6 space-y-4 text-xs">
              <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-lg border">
                <span className="text-slate-500">Current Active Version:</span>
                <span className="font-mono font-bold text-slate-800 dark:text-slate-200">v{bumpDoc.version}</span>
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Target Version Number *
                </label>
                <input
                  type="text"
                  required
                  value={bumpNewVersion}
                  onChange={(e) => setBumpNewVersion(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono font-bold"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Revision Notes & Changelog *
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="Detail the updates made in this revision (e.g. updated claim 1 references, corrected margins)..."
                  value={bumpNotes}
                  onChange={(e) => setBumpNotes(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setBumpDoc(null)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={isBumping}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold"
                >
                  {isBumping ? "Updating..." : "Commit Revision"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── DELETE CONFIRM MODAL ───────────────────────────────────── */}
      {deleteConfirmDoc && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl p-6 max-w-sm w-full border shadow-xl">
            <h4 className="font-bold text-base text-slate-900 dark:text-slate-100 mb-2">Delete Document?</h4>
            <p className="text-xs text-slate-500 mb-4">
              Are you sure you want to delete <strong className="text-slate-700 dark:text-slate-300">"{deleteConfirmDoc.title}"</strong> from the project repository? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setDeleteConfirmDoc(null)}>
                Cancel
              </Button>
              <Button size="sm" onClick={handleDeleteSubmit} className="bg-red-600 hover:bg-red-700 text-white font-bold">
                Delete
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
