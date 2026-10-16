"use client";

import { triggerFileDownload } from "@/lib/downloadHelper";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  FileText,
  Search,
  Download,
  ExternalLink,
  Plus,
  X,
  Eye,
  CheckCircle2,
  ImageIcon,
  Layers,
  FileDown,
  UploadCloud,
  Cpu,
  BookOpen,
  ArrowRight
} from "lucide-react";
import { useActiveRole } from "@/components/auth/role-context";

export default function TechnicalDocumentsPage() {
  const router = useRouter();
  const { currentUser } = useActiveRole();
  const [loading, setLoading] = useState(true);
  const [docs, setDocs] = useState<any[]>([]);
  const [counts, setCounts] = useState<any>({});
  const [searchQuery, setSearchQuery] = useState("");

  // Inspect Modal
  const [inspectDoc, setInspectDoc] = useState<any | null>(null);

  // Upload Modal
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadTitle, setUploadTitle] = useState("");
  const [uploadFileName, setUploadFileName] = useState("");
  const [uploadSummary, setUploadSummary] = useState("");
  const [savingUpload, setSavingUpload] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);

  const fetchMaterials = async () => {
    try {
      const res = await fetch("/api/design-team/materials");
      if (res.ok) {
        const data = await res.json();
        if (data.materials?.technical_docs) {
          setDocs(data.materials.technical_docs);
          setCounts(data.counts || {});
        }
      }
    } catch (err) {
      console.error("Error fetching technical docs:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMaterials();
  }, []);

  const filteredDocs = docs.filter((d) => {
    return (
      d.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.file_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.summary?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.invention_id?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.author?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  const handleCreateUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadTitle || !uploadFileName) return;
    setSavingUpload(true);

    try {
      const res = await fetch("/api/design-team/materials", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category: "technical_docs",
          invention_id: "INN-0012",
          project_title: "Smart Energy Management System",
          title: uploadTitle,
          file_name: uploadFileName,
          format: "PDF",
          size: "2.1 MB",
          description: uploadSummary,
          actor: currentUser?.name || "Design Team"
        })
      });

      if (res.ok) {
        setUploadSuccess(true);
        setShowUploadModal(false);
        setUploadTitle("");
        setUploadFileName("");
        setUploadSummary("");
        await fetchMaterials();
        setTimeout(() => setUploadSuccess(false), 3000);
      }
    } catch (err) {
      console.error("Error uploading technical document:", err);
    } finally {
      setSavingUpload(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-border/40">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
              Technical Intelligence
            </span>
            <span className="text-xs text-muted-foreground font-mono">
              ROLE: {currentUser?.name || "Design Team"}
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-foreground tracking-tight flex items-center gap-2.5">
            <FileText className="w-7 h-7 text-blue-600" /> Technical Documents & Disclosures
          </h1>
          <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
            Invention disclosures, engineering architecture specifications, and patent drafter briefs providing technical grounding for accurate figure drafting.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            onClick={() => setShowUploadModal(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-sm"
          >
            <Plus className="w-4 h-4 mr-1.5" /> Upload Document
          </Button>

          <Link href="/dashboard/design-team/workspace/in-progress">
            <Button variant="outline" className="text-xs font-semibold">
              <Eye className="w-4 h-4 mr-1.5 text-emerald-600" /> Drawing Studio
            </Button>
          </Link>
        </div>
      </div>

      {uploadSuccess && (
        <div className="p-3.5 rounded-xl bg-blue-500/10 border border-blue-500/30 text-blue-700 dark:text-blue-400 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4" /> Technical document registered and stored in Design Materials successfully!
        </div>
      )}

      {/* Materials Navigation Tab Strip */}
      <div className="flex items-center gap-2 border-b border-border/40 pb-2 overflow-x-auto">
        <Link href="/dashboard/design-team/materials/drawings">
          <Button size="sm" variant="outline" className="text-xs h-8">
            <ImageIcon className="w-3.5 h-3.5 mr-1.5 text-emerald-500" /> Drawings ({counts.drawings || 4})
          </Button>
        </Link>
        <Link href="/dashboard/design-team/materials/technical-docs">
          <Button size="sm" className="bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 text-xs h-8">
            <FileText className="w-3.5 h-3.5 mr-1.5 text-blue-500" /> Technical Documents ({counts.technical_docs || docs.length})
          </Button>
        </Link>
        <Link href="/dashboard/design-team/materials/reference-files">
          <Button size="sm" variant="outline" className="text-xs h-8">
            <Layers className="w-3.5 h-3.5 mr-1.5 text-purple-500" /> Reference Files ({counts.reference_files || 4})
          </Button>
        </Link>
        <Link href="/dashboard/design-team/materials/export-files">
          <Button size="sm" variant="outline" className="text-xs h-8">
            <FileDown className="w-3.5 h-3.5 mr-1.5 text-amber-500" /> Export Files ({counts.export_files || 3})
          </Button>
        </Link>
      </div>

      {/* Search Bar */}
      <div className="relative max-w-md">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search technical disclosure, component, or author..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9 text-xs bg-card"
        />
      </div>

      {/* Content Cards */}
      {loading ? (
        <div className="py-20 text-center text-xs text-muted-foreground animate-pulse">
          Loading technical documents repository...
        </div>
      ) : filteredDocs.length === 0 ? (
        <Card className="p-12 text-center bg-card">
          <FileText className="w-10 h-10 mx-auto text-muted-foreground/60 mb-3" />
          <h3 className="text-base font-bold text-foreground">No technical documents found</h3>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredDocs.map((doc) => (
            <Card
              key={doc.id}
              className="bg-card border-border/50 hover:border-blue-500/50 transition-all shadow-sm flex flex-col justify-between"
            >
              <CardHeader className="p-5 pb-3 border-b border-border/30">
                <div className="flex items-center justify-between mb-2">
                  <Badge variant="outline" className="text-[10px] font-mono font-bold text-blue-600 bg-blue-50 dark:bg-blue-950/40">
                    {doc.category?.replace("_", " ")}
                  </Badge>
                  <span className="text-[10px] font-mono text-muted-foreground">{doc.format} • {doc.size}</span>
                </div>
                <CardTitle className="text-sm font-bold text-foreground line-clamp-2">
                  {doc.title}
                </CardTitle>
                <p className="text-[11px] text-muted-foreground mt-0.5 truncate">
                  Author: <strong>{doc.author}</strong> • {doc.invention_id}
                </p>
              </CardHeader>

              <CardContent className="p-5 space-y-4 flex-1 flex flex-col justify-between">
                <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3">
                  {doc.summary}
                </p>

                {doc.key_components && doc.key_components.length > 0 && (
                  <div className="space-y-1.5 bg-muted/15 p-2.5 rounded-lg border border-border/30">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                      Target Numeral Callouts:
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {doc.key_components.map((comp: string, i: number) => (
                        <Badge key={i} variant="secondary" className="text-[10px] font-mono">
                          {comp}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                <div className="pt-2 border-t border-border/20 flex items-center justify-between gap-2">
                  <Button
                    size="sm"
                    className="flex-1 h-8 text-xs bg-blue-600 hover:bg-blue-700 text-white font-semibold"
                    onClick={() => setInspectDoc(doc)}
                  >
                    <BookOpen className="w-3.5 h-3.5 mr-1.5" /> Read Specification
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 px-2.5 text-xs"
                    onClick={() => triggerFileDownload(doc.file_name)}
                    title="Download Document"
                  >
                    <Download className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* INSPECT DOC MODAL */}
      {inspectDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-card border border-border/60 rounded-xl max-w-2xl w-full shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-border/40 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-600" />
                <h3 className="font-bold text-base text-foreground truncate max-w-lg">
                  {inspectDoc.title}
                </h3>
              </div>
              <button onClick={() => setInspectDoc(null)} className="text-muted-foreground hover:text-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[65vh] overflow-y-auto">
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span>Invention: <strong className="text-foreground font-mono">{inspectDoc.invention_id}</strong></span>
                <span>•</span>
                <span>Author: <strong className="text-foreground">{inspectDoc.author}</strong></span>
                <span>•</span>
                <span>File: <span className="font-mono">{inspectDoc.file_name}</span></span>
              </div>

              <div className="p-4 bg-muted/20 rounded-lg border border-border/30 space-y-2">
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground block">
                  Technical Specification Summary
                </span>
                <p className="text-xs leading-relaxed text-foreground whitespace-pre-wrap">
                  {inspectDoc.summary}
                </p>
              </div>

              {inspectDoc.key_components && (
                <div className="space-y-2">
                  <span className="text-xs font-bold text-foreground block">Key Architectural Elements & Numerals:</span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {inspectDoc.key_components.map((item: string, idx: number) => (
                      <div key={idx} className="p-2.5 rounded border border-border/40 bg-card text-xs flex items-center gap-2">
                        <Cpu className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span className="font-medium text-foreground">{item}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-border/40 bg-muted/10 flex justify-between items-center">
              <Link href="/dashboard/design-team/workspace/in-progress">
                <Button size="sm" className="text-xs bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900">
                  <ArrowRight className="w-3.5 h-3.5 mr-1" /> Incorporate in Drawing Studio
                </Button>
              </Link>
              <Button variant="outline" size="sm" className="text-xs" onClick={() => setInspectDoc(null)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* UPLOAD DOCUMENT MODAL */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-card border border-border/60 rounded-xl max-w-lg w-full shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-border/40 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <UploadCloud className="w-5 h-5 text-blue-600" />
                <h3 className="font-bold text-base text-foreground">Upload Technical Disclosure Document</h3>
              </div>
              <button onClick={() => setShowUploadModal(false)} className="text-muted-foreground hover:text-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateUpload} className="p-5 space-y-4">
              <div>
                <label className="text-xs font-bold text-foreground block mb-1">Document Title</label>
                <Input
                  placeholder="e.g. Edge Controller Hardware Interface Specification"
                  value={uploadTitle}
                  onChange={(e) => setUploadTitle(e.target.value)}
                  className="text-xs"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-bold text-foreground block mb-1">File Name</label>
                <Input
                  placeholder="e.g. INN-0012_Interface_Spec.pdf"
                  value={uploadFileName}
                  onChange={(e) => setUploadFileName(e.target.value)}
                  className="text-xs font-mono"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-bold text-foreground block mb-1">Summary / Technical Notes</label>
                <textarea
                  placeholder="Key technical requirements, block diagrams, components..."
                  value={uploadSummary}
                  onChange={(e) => setUploadSummary(e.target.value)}
                  rows={3}
                  className="w-full p-2.5 rounded-md border border-input bg-card text-xs text-foreground focus:outline-none focus:ring-1"
                />
              </div>

              <div className="pt-3 border-t border-border/40 flex justify-end gap-2">
                <Button type="button" variant="outline" size="sm" className="text-xs" onClick={() => setShowUploadModal(false)}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold"
                  disabled={savingUpload}
                >
                  {savingUpload ? "Uploading..." : "Upload Document"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
