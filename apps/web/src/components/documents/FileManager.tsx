"use client";

import React, { useState, useRef } from "react";
import { Upload, Plus, ChevronRight, Home, ArrowLeft, Download } from "lucide-react";
import { Button } from "@/components/ui/button";

interface FileManagerProps {
  versions: any[];
  isUploading: boolean;
  isLocked: boolean;
  onUpload: (files: File[], folder: string) => void;
  onDownload: (version: any) => void;
  onFolderCreate?: (name: string, parentFolder: string) => void;
}

const EXT_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  PDF:  { bg: "#FEE2E2", border: "#FCA5A5", text: "#DC2626" },
  DOC:  { bg: "#DBEAFE", border: "#93C5FD", text: "#2563EB" },
  DOCX: { bg: "#DBEAFE", border: "#93C5FD", text: "#2563EB" },
  PNG:  { bg: "#D1FAE5", border: "#6EE7B7", text: "#059669" },
  JPG:  { bg: "#D1FAE5", border: "#6EE7B7", text: "#059669" },
  JPEG: { bg: "#D1FAE5", border: "#6EE7B7", text: "#059669" },
  ZIP:  { bg: "#FEF3C7", border: "#FDE68A", text: "#D97706" },
};

function FolderIcon({ size = 64 }: { size?: number }) {
  return (
    <svg width={size} height={size * 0.85} viewBox="0 0 64 54" fill="none">
      <path d="M2 8C2 5.79 3.79 4 6 4H24L30 12H58C60.21 12 62 13.79 62 16V48C62 50.21 60.21 52 58 52H6C3.79 52 2 50.21 2 48V8Z" fill="#F59E0B"/>
      <path d="M2 18H62V48C62 50.21 60.21 52 58 52H6C3.79 52 2 50.21 2 48V18Z" fill="#FCD34D"/>
    </svg>
  );
}

function FileIcon({ ext, size = 52 }: { ext: string; size?: number }) {
  const clr = EXT_COLORS[ext] ?? { bg: "#F3F4F6", border: "#D1D5DB", text: "#6B7280" };
  const h = Math.round(size * 1.23);
  return (
    <div className="relative" style={{ width: size, height: h }}>
      <svg width={size} height={h} viewBox="0 0 52 64" fill="none">
        <path d="M4 2H34L50 18V60C50 61.1 49.1 62 48 62H4C2.9 62 2 61.1 2 60V4C2 2.9 2.9 2 4 2Z"
          fill={clr.bg} stroke={clr.border} strokeWidth="1.5"/>
        <path d="M34 2V18H50" stroke={clr.border} strokeWidth="1.5" fill="none"/>
      </svg>
      {ext && (
        <span className="absolute bottom-3 left-0 right-0 text-center text-[9px] font-bold tracking-wide"
          style={{ color: clr.text }}>{ext}</span>
      )}
    </div>
  );
}

export function FileManager({ versions, isUploading, isLocked, onUpload, onDownload, onFolderCreate }: FileManagerProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [path, setPath] = useState<string[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");

  const pathKey = path.join("/");

  // Compute folder structure from versions securely encoded in file_url
  const folders: Record<string, string[]> = { "": [] };
  const allExtracted: Array<{ file: any; folder: string }> = [];

  versions.forEach(v => {
    let f = "";
    if (v.file_url && v.file_url.includes("?folder=")) {
      f = decodeURIComponent(v.file_url.split("?folder=")[1].split("&")[0]);
    } else {
      f = v.folder || "";
    }
    allExtracted.push({ file: v, folder: f });

    // Build intermediate paths so folders appear even if empty
    if (f) {
      const parts = f.split("/");
      let current = "";
      parts.forEach(part => {
        if (!folders[current]) folders[current] = [];
        if (!folders[current].includes(part)) folders[current].push(part);
        current = current ? `${current}/${part}` : part;
      });
      if (!folders[current]) folders[current] = []; // initialize leaf
    }
  });

  const subfolders = folders[pathKey] || [];
  
  // Filter out the hidden '.folder' anchor files from the UI
  const filesHere = allExtracted
    .filter(x => x.folder === pathKey && x.file.file_name !== ".folder")
    .map(x => x.file);

  const navigateInto = (name: string) => setPath([...path, name]);
  const navigateTo = (idx: number) => setPath(path.slice(0, idx + 1));
  const navigateBack = () => setPath(path.slice(0, -1));
  const navigateHome = () => setPath([]);

  const createFolder = () => {
    const name = newFolderName.trim();
    if (!name) return;
    
    // Call the newly added prop to persist to DB
    if (onFolderCreate) {
      onFolderCreate(name, pathKey);
    }
    
    setNewFolderName("");
    setIsCreating(false);
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const fileArray = Array.from(e.target.files);
      onUpload(fileArray, pathKey);
    }
    e.target.value = ""; // Always clear immediately
  };

  const isEmpty = subfolders.length === 0 && filesHere.length === 0 && !isCreating;

  return (
    <div className="flex flex-col h-full min-h-[420px] rounded-xl border border-border/60 overflow-hidden bg-white shadow-sm">
      {/* ── Toolbar ── */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b bg-muted/20 shrink-0">
        {/* Breadcrumb */}
        <div className="flex items-center gap-1 text-sm">
          <button
            onClick={navigateBack}
            disabled={path.length === 0}
            className="p-1 rounded hover:bg-muted disabled:opacity-30 transition-colors mr-1"
            title="Back"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <button
            onClick={navigateHome}
            className="flex items-center gap-1 text-muted-foreground hover:text-foreground px-1.5 py-0.5 rounded hover:bg-muted transition-colors"
          >
            <Home className="w-3.5 h-3.5" />
            <span className="text-xs font-medium">Home</span>
          </button>
          {path.map((seg, i) => (
            <React.Fragment key={i}>
              <ChevronRight className="w-3 h-3 text-muted-foreground/50 shrink-0" />
              <button
                onClick={() => navigateTo(i)}
                className="text-xs font-semibold text-foreground px-1.5 py-0.5 rounded hover:bg-muted transition-colors"
              >
                {seg}
              </button>
            </React.Fragment>
          ))}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            className="gap-1.5 h-8 text-xs"
            onClick={() => setIsCreating(true)}
          >
            <Plus className="w-3.5 h-3.5" /> New Folder
          </Button>
          <>
            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              onChange={handleFileChange}
              accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.zip"
              multiple
            />
            <Button
              size="sm"
              disabled={isUploading || isLocked}
              className="gap-1.5 h-8 text-xs bg-blue-600 hover:bg-blue-700"
              onClick={handleUploadClick}
            >
              <Upload className="w-3.5 h-3.5" />
              {isUploading ? "Uploading…" : "Upload File"}
            </Button>
          </>
        </div>
      </div>

      {/* ── Grid area ── */}
      <div className="flex-1 p-5 overflow-auto">
        {/* New folder inline creation */}
        {isCreating && (
          <div className="flex items-start gap-3 mb-4">
            <div className="flex flex-col items-center gap-1 w-[100px]">
              <div className="relative">
                <FolderIcon size={56} />
              </div>
              <input
                autoFocus
                className="w-full text-xs text-center border border-blue-400 rounded px-1 py-0.5 outline-none bg-blue-50"
                placeholder="Folder name"
                value={newFolderName}
                onChange={e => setNewFolderName(e.target.value)}
                onKeyDown={e => {
                  if (e.key === "Enter") createFolder();
                  if (e.key === "Escape") { setIsCreating(false); setNewFolderName(""); }
                }}
              />
            </div>
            <div className="flex gap-1.5 mt-14">
              <Button size="sm" className="h-7 px-3 text-xs bg-blue-600" onClick={createFolder}>Create</Button>
              <Button size="sm" variant="ghost" className="h-7 px-3 text-xs" onClick={() => { setIsCreating(false); setNewFolderName(""); }}>Cancel</Button>
            </div>
          </div>
        )}

        {/* Empty state */}
        {isEmpty && (
          <div className="flex flex-col items-center justify-center h-48 text-muted-foreground gap-3">
            <FolderIcon size={56} />
            <p className="text-sm text-muted-foreground/70">
              {path.length === 0 ? "No folders yet. Create one to get started." : "This folder is empty. Upload a file or create a subfolder."}
            </p>
          </div>
        )}

        {/* Grid of folders + files */}
        <div className="grid gap-2" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(110px, 1fr))" }}>
          {/* Folders */}
          {subfolders.map(name => (
            <button
              key={name}
              onClick={() => navigateInto(name)}
              className="flex flex-col items-center gap-1.5 p-3 rounded-xl hover:bg-muted/70 active:scale-95 transition-all group text-center cursor-pointer border border-transparent hover:border-border/40"
            >
              <FolderIcon size={60} />
              <span className="text-xs text-foreground font-medium leading-tight line-clamp-2 break-all">{name}</span>
            </button>
          ))}

          {/* Files */}
          {filesHere.map(v => {
            const ext = (v.file_name?.split(".").pop() ?? "").toUpperCase();
            const label = v.file_name?.length > 16
              ? v.file_name.substring(0, 14) + "…"
              : v.file_name;
            return (
              <div
                key={v.id}
                className="relative flex flex-col items-center gap-1.5 p-3 rounded-xl hover:bg-muted/70 transition-all group border border-transparent hover:border-border/40 text-center"
              >
                <FileIcon ext={ext} size={48} />
                <span className="text-xs text-foreground font-medium leading-tight line-clamp-2 break-all" title={v.file_name}>{label}</span>
                <span className="text-[10px] text-muted-foreground">{new Date(v.created_at).toLocaleDateString()}</span>

                {/* Download on hover */}
                <button
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); onDownload(v); }}
                  className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-md bg-white shadow-sm border border-border/50 hover:bg-blue-50 text-blue-600"
                  title="Download"
                >
                  <Download className="w-3 h-3" />
                </button>
              </div>
            );
          })}
        </div>

        {/* Upload drop hint when empty */}
        {filesHere.length === 0 && subfolders.length === 0 && !isCreating && (
          <div
            className="mt-4 border-2 border-dashed border-border/50 rounded-xl p-8 flex flex-col items-center gap-3 text-muted-foreground/60 hover:border-blue-300 hover:text-blue-400 transition-colors cursor-pointer"
            onClick={handleUploadClick}
          >
            <Upload className="w-8 h-8" />
            <p className="text-sm">Click to upload a file into <strong className="text-foreground">{path.length > 0 ? path[path.length - 1] : "this folder"}</strong></p>
          </div>
        )}
      </div>
    </div>
  );
}
