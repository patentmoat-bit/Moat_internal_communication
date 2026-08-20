"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  X, FileText, Image as ImageIcon, Paperclip, 
  UploadCloud, Download, ExternalLink, Loader2, Eye 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/client";

interface UnifiedProject {
  id: string;
  title: string;
  description?: string | null;
  status: string;
  filing_region?: string | null;
  tags?: string[];
  metadata?: Record<string, any>;
}

interface PatentDocument {
  id: string;
  project_id: string | null;
  name: string;
  url: string;
  file_type: string | null;
  size: number | null;
  created_at: string;
}

interface PatentDocumentsModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: UnifiedProject | null;
}

export function PatentDocumentsModal({ isOpen, onClose, project }: PatentDocumentsModalProps) {
  const [documents, setDocuments] = useState<PatentDocument[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewDoc, setPreviewDoc] = useState<PatentDocument | null>(null);

  const fetchDocuments = async () => {
    if (!project) return;
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/patents/projects/${project.id}/documents`);
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      setDocuments(json.data || []);
    } catch (err: any) {
      setError(err.message || "Failed to load project documents.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && project) {
      fetchDocuments();
    } else {
      setDocuments([]);
    }
  }, [isOpen, project]);

  const handleUploadFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!project || !e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    
    try {
      setUploading(true);
      setError(null);
      
      const supabase = createClient();
      let fileUrl = "";
      
      if (supabase) {
        const ext = file.name.split(".").pop();
        const path = `patents/${Date.now()}_${Math.random().toString(36).substring(2, 9)}.${ext}`;
        // Try uploading to 'trademarks' storage bucket as a shared attachment bucket, or default
        const { error: uploadError } = await supabase.storage.from("trademarks").upload(path, file);
        if (!uploadError) {
          const { data } = supabase.storage.from("trademarks").getPublicUrl(path);
          fileUrl = data.publicUrl;
        } else {
          console.warn("Supabase storage upload failed, using base64 fallback:", uploadError);
        }
      }
      
      if (!fileUrl) {
        // Fallback: Base64 data URL
        fileUrl = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = (ev) => resolve(ev.target?.result as string || "");
          reader.readAsDataURL(file);
        });
      }
      
      const res = await fetch(`/api/patents/projects/${project.id}/documents`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: file.name,
          url: fileUrl,
          file_type: file.type,
          size: file.size
        })
      });
      
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      
      setDocuments(prev => [json.data, ...prev]);
    } catch (err: any) {
      setError(err.message || "Failed to upload file.");
    } finally {
      setUploading(false);
    }
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return "Unknown size";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  };

  return (
    <AnimatePresence>
      {isOpen && project && (
        <div className="fixed inset-0 z-50 flex items-center justify-end">
          {/* Backdrop */}
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
          />
          
          {/* Slide-over Drawer Container */}
          <motion.div 
            initial={{ x: "100%" }} 
            animate={{ x: 0 }} 
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 220 }}
            className="relative z-10 h-full w-full max-w-xl border-l border-border/40 bg-card p-6 shadow-2xl backdrop-blur-md md:p-8 flex flex-col justify-between"
            style={{ background: "linear-gradient(180deg, #12120e, #090906)" }}
          >
            <div className="flex-1 overflow-y-auto pr-1">
              
              {/* Header */}
              <div className="flex items-start justify-between mb-6">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="outline" className="border-border text-muted-foreground uppercase text-[9px] tracking-wider font-bold">
                      {project.status}
                    </Badge>
                    <span className="text-[10px] text-muted-foreground/60 font-bold uppercase tracking-wider">
                      {project.filing_region || (project.metadata as any)?.filing_region || "US"}
                    </span>
                  </div>
                  <h2 className="text-xl sm:text-2xl font-black text-foreground"
                    style={{ background: "linear-gradient(135deg, #e8dfc8, #c9a84c)", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent" }}>
                    {project.title}
                  </h2>
                  <p className="text-xs text-muted-foreground/80 mt-1 leading-relaxed">
                    {project.description || "No description available."}
                  </p>
                </div>
                
                <Button variant="ghost" size="icon" onClick={onClose} className="text-muted-foreground/60 hover:text-foreground">
                  <X className="h-5 w-5" />
                </Button>
              </div>
              
              {/* Tags */}
              {project.tags && project.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-6 border-b border-border/10 pb-4">
                  {project.tags.map(t => (
                    <span key={t} className="px-2 py-0.5 rounded bg-muted/20 border border-border/40 text-[9px] font-bold uppercase tracking-wider text-muted-foreground/80">
                      {t}
                    </span>
                  ))}
                </div>
              )}
              
              {/* Error display */}
              {error && (
                <div className="mb-4 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-xs text-destructive flex items-center justify-between">
                  <span>{error}</span>
                  <button onClick={() => setError(null)} className="font-bold underline hover:text-destructive/80">Dismiss</button>
                </div>
              )}
              
              {/* Drag & Drop File Upload Area */}
              <div className="mb-8">
                <h3 className="text-xs font-black uppercase tracking-widest text-[#c9a84c] mb-3">Upload Specs, Drawings, or PDFs</h3>
                <div className="relative group border border-dashed border-border/40 hover:border-[#c9a84c]/50 rounded-2xl p-6 transition-all bg-muted/5 flex flex-col items-center justify-center text-center cursor-pointer">
                  <input 
                    type="file" 
                    className="absolute inset-0 opacity-0 cursor-pointer" 
                    onChange={handleUploadFile}
                    disabled={uploading}
                    accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.gif,.webp"
                  />
                  {uploading ? (
                    <div className="flex flex-col items-center gap-2 py-2">
                      <Loader2 className="h-8 w-8 text-[#c9a84c] animate-spin" />
                      <p className="text-xs font-bold text-muted-foreground/80">Uploading attachment...</p>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-2">
                      <div className="h-10 w-10 rounded-xl bg-[#c9a84c]/10 flex items-center justify-center text-[#c9a84c]">
                        <UploadCloud className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-foreground">Click to upload or drag & drop</p>
                        <p className="text-[10px] text-muted-foreground/60 mt-0.5">PDF, Word, or images (PNG, JPG, etc.) up to 10MB</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Document List Section */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xs font-black uppercase tracking-widest text-[#c9a84c]">Project Attachments</h3>
                  <span className="text-[10px] font-bold text-muted-foreground/60 uppercase">{documents.length} files</span>
                </div>
                
                {loading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-5 w-5 text-[#c9a84c] animate-spin" />
                    <span className="text-xs font-bold text-muted-foreground/60 ml-2">Loading documents...</span>
                  </div>
                ) : documents.length === 0 ? (
                  <div className="border border-border/20 rounded-2xl p-8 text-center bg-muted/5">
                    <Paperclip className="h-6 w-6 text-muted-foreground/30 mx-auto mb-2" />
                    <p className="text-xs font-bold text-muted-foreground/60">No documents uploaded yet</p>
                    <p className="text-[10px] text-muted-foreground/40 mt-0.5">Upload drawings, specifications or filings to this patent</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {documents.map((doc) => {
                      const isImg = doc.file_type?.startsWith("image/");
                      const isPdf = doc.file_type === "application/pdf" || doc.name.toLowerCase().endsWith(".pdf");
                      
                      return (
                        <div key={doc.id} className="relative group border border-border/40 hover:border-border/80 rounded-xl overflow-hidden bg-[#181814] flex flex-col justify-between transition-all">
                          {/* Visual Preview */}
                          <div className="h-28 w-full bg-muted/5 relative flex items-center justify-center border-b border-border/20 overflow-hidden">
                            {isImg ? (
                              <img src={doc.url} alt={doc.name} className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300" />
                            ) : isPdf ? (
                              <div className="flex flex-col items-center gap-1.5">
                                <div className="h-10 w-8 rounded border border-red-500/30 bg-red-500/10 flex items-center justify-center text-red-400 text-xs font-black">PDF</div>
                                <span className="text-[9px] text-muted-foreground/60 uppercase font-black tracking-wider">Publication</span>
                              </div>
                            ) : (
                              <div className="flex flex-col items-center gap-1.5">
                                <FileText className="h-8 w-8 text-[#c9a84c]/60" />
                                <span className="text-[9px] text-muted-foreground/60 uppercase font-black tracking-wider">Document</span>
                              </div>
                            )}
                          </div>
                          
                          {/* Details and Actions */}
                          <div className="p-3">
                            <p className="text-xs font-bold text-foreground truncate" title={doc.name}>
                              {doc.name}
                            </p>
                            <div className="flex items-center justify-between mt-2">
                              <span className="text-[10px] text-muted-foreground/60 font-medium">
                                {formatFileSize(doc.size)}
                              </span>
                              
                              <div className="flex items-center gap-1">
                                <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-foreground" asChild>
                                  <a href={doc.url} target="_blank" rel="noopener noreferrer" download={doc.name}>
                                    <Download className="h-3.5 w-3.5" />
                                  </a>
                                </Button>
                                <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-foreground" onClick={(e) => { e.preventDefault(); setPreviewDoc(doc); }}>
                                  <Eye className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

            </div>
            
            {/* Save Button */}
            <div className="pt-6 mt-6 border-t border-border/20 flex justify-end">
              <Button onClick={onClose} className="bg-[#c9a84c] hover:bg-[#b8943d] text-black font-bold px-8">
                Save & Close
              </Button>
            </div>
          </motion.div>
          
          {/* Document Preview Overlay */}
          <AnimatePresence>
            {previewDoc && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="absolute inset-4 z-[60] bg-[#12120e] border border-border/40 rounded-2xl shadow-2xl flex flex-col overflow-hidden"
              >
                <div className="flex items-center justify-between px-4 py-3 border-b border-border/20 bg-muted/10">
                  <h3 className="text-sm font-bold truncate text-foreground pr-4">Review: {previewDoc.name}</h3>
                  <Button variant="ghost" size="icon" onClick={() => setPreviewDoc(null)} className="hover:bg-destructive/20 hover:text-destructive shrink-0">
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex-1 bg-black/50 overflow-hidden flex items-center justify-center relative p-4">
                  {previewDoc.file_type?.startsWith("image/") ? (
                    <img src={previewDoc.url} alt="Preview" className="max-w-full max-h-full object-contain" />
                  ) : (
                    <iframe src={previewDoc.url} className="w-full h-full bg-white rounded-md" title="PDF Preview" />
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </AnimatePresence>
  );
}
