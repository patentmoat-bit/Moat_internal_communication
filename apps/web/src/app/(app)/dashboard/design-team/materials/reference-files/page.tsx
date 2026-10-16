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
  Layers,
  Search,
  Download,
  ExternalLink,
  Plus,
  X,
  Eye,
  CheckCircle2,
  ImageIcon,
  FileText,
  FileDown,
  UploadCloud,
  ShieldCheck,
  BookOpen,
  Scale
} from "lucide-react";
import { useActiveRole } from "@/components/auth/role-context";

export default function ReferenceFilesPage() {
  const router = useRouter();
  const { currentUser } = useActiveRole();
  const [loading, setLoading] = useState(true);
  const [refs, setRefs] = useState<any[]>([]);
  const [counts, setCounts] = useState<any>({});
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("ALL");

  // Standards Modal
  const [selectedRef, setSelectedRef] = useState<any | null>(null);

  // Upload Modal
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadTitle, setUploadTitle] = useState("");
  const [uploadCategory, setUploadCategory] = useState("REGULATORY_STANDARD");
  const [uploadFileName, setUploadFileName] = useState("");
  const [uploadDesc, setUploadDesc] = useState("");
  const [savingUpload, setSavingUpload] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);

  const fetchMaterials = async () => {
    try {
      const res = await fetch("/api/design-team/materials");
      if (res.ok) {
        const data = await res.json();
        if (data.materials?.reference_files) {
          setRefs(data.materials.reference_files);
          setCounts(data.counts || {});
        }
      }
    } catch (err) {
      console.error("Error fetching reference files:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMaterials();
  }, []);

  const filteredRefs = refs.filter((r) => {
    const matchesSearch =
      r.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.tags?.some((t: string) => t.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesCat = categoryFilter === "ALL" || r.category === categoryFilter;
    return matchesSearch && matchesCat;
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
          category: "reference_files",
          title: uploadTitle,
          file_name: uploadFileName,
          format: "PDF",
          size: "2.4 MB",
          description: uploadDesc,
          actor: currentUser?.name || "Design Team"
        })
      });

      if (res.ok) {
        setUploadSuccess(true);
        setShowUploadModal(false);
        setUploadTitle("");
        setUploadFileName("");
        setUploadDesc("");
        await fetchMaterials();
        setTimeout(() => setUploadSuccess(false), 3000);
      }
    } catch (err) {
      console.error("Error uploading reference file:", err);
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
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
              Regulatory Standards & Guides
            </span>
            <span className="text-xs text-muted-foreground font-mono">
              ROLE: {currentUser?.name || "Design Team"}
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-foreground tracking-tight flex items-center gap-2.5">
            <Layers className="w-7 h-7 text-purple-600" /> Reference Files & Drawing Standards
          </h1>
          <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
            USPTO 37 CFR § 1.84 statutory rules, prior art drawing citations, vector glyph libraries, and reference numeral concordance standards.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            onClick={() => setShowUploadModal(true)}
            className="bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold shadow-sm"
          >
            <Plus className="w-4 h-4 mr-1.5" /> Upload Reference Asset
          </Button>

          <Link href="/dashboard/design-team/workspace/in-progress">
            <Button variant="outline" className="text-xs font-semibold">
              <Eye className="w-4 h-4 mr-1.5 text-emerald-600" /> Drawing Studio
            </Button>
          </Link>
        </div>
      </div>

      {uploadSuccess && (
        <div className="p-3.5 rounded-xl bg-purple-500/10 border border-purple-500/30 text-purple-700 dark:text-purple-400 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4" /> Reference asset registered successfully!
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
          <Button size="sm" variant="outline" className="text-xs h-8">
            <FileText className="w-3.5 h-3.5 mr-1.5 text-blue-500" /> Technical Documents ({counts.technical_docs || 3})
          </Button>
        </Link>
        <Link href="/dashboard/design-team/materials/reference-files">
          <Button size="sm" className="bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 text-xs h-8">
            <Layers className="w-3.5 h-3.5 mr-1.5 text-purple-500" /> Reference Files ({counts.reference_files || refs.length})
          </Button>
        </Link>
        <Link href="/dashboard/design-team/materials/export-files">
          <Button size="sm" variant="outline" className="text-xs h-8">
            <FileDown className="w-3.5 h-3.5 mr-1.5 text-amber-500" /> Export Files ({counts.export_files || 3})
          </Button>
        </Link>
      </div>

      {/* Search and Category Filter */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search standards, prior art patent ID, or tag..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 text-xs bg-card"
          />
        </div>

        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="h-9 px-3 rounded-md border border-input bg-card text-xs text-foreground focus:outline-none focus:ring-1 self-end sm:self-auto"
        >
          <option value="ALL">All Categories</option>
          <option value="REGULATORY_STANDARD">Regulatory Standards</option>
          <option value="PRIOR_ART">Prior Art Citations</option>
          <option value="DESIGN_KIT">Design Kits & Templates</option>
          <option value="GUIDELINE">Concordance Guidelines</option>
        </select>
      </div>

      {/* Reference Files Grid */}
      {loading ? (
        <div className="py-20 text-center text-xs text-muted-foreground animate-pulse">
          Loading reference standards library...
        </div>
      ) : filteredRefs.length === 0 ? (
        <Card className="p-12 text-center bg-card">
          <Layers className="w-10 h-10 mx-auto text-muted-foreground/60 mb-3" />
          <h3 className="text-base font-bold text-foreground">No reference assets found</h3>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredRefs.map((ref) => (
            <Card
              key={ref.id}
              className="bg-card border-border/50 hover:border-purple-500/50 transition-all shadow-sm flex flex-col justify-between"
            >
              <CardHeader className="p-5 pb-3 border-b border-border/30">
                <div className="flex items-center justify-between mb-2">
                  <Badge variant="outline" className="text-[10px] font-mono font-bold text-purple-600 bg-purple-50 dark:bg-purple-950/40">
                    {ref.category?.replace("_", " ")}
                  </Badge>
                  <span className="text-[10px] font-mono text-muted-foreground">{ref.format} • {ref.size}</span>
                </div>
                <CardTitle className="text-base font-bold text-foreground line-clamp-2">
                  {ref.title}
                </CardTitle>
                <p className="text-[11px] text-muted-foreground mt-0.5 truncate">
                  Authority: <strong>{ref.publisher || "USPTO"}</strong>
                </p>
              </CardHeader>

              <CardContent className="p-5 space-y-4 flex-1 flex flex-col justify-between">
                <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3">
                  {ref.description}
                </p>

                {ref.tags && (
                  <div className="flex flex-wrap gap-1.5">
                    {ref.tags.map((tag: string, i: number) => (
                      <span key={i} className="px-2 py-0.5 rounded text-[10px] bg-muted/40 text-muted-foreground font-mono">
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}

                <div className="pt-2 border-t border-border/20 flex items-center justify-between gap-2">
                  <Button
                    size="sm"
                    className="flex-1 h-8 text-xs bg-purple-600 hover:bg-purple-700 text-white font-semibold"
                    onClick={() => setSelectedRef(ref)}
                  >
                    <BookOpen className="w-3.5 h-3.5 mr-1.5" /> View Reference Guidelines
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 px-2.5 text-xs"
                    onClick={() => triggerFileDownload(ref.file_name)}
                    title="Download Asset"
                  >
                    <Download className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* VIEW REFERENCE GUIDELINE MODAL */}
      {selectedRef && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-card border border-border/60 rounded-xl max-w-2xl w-full shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-border/40 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Scale className="w-5 h-5 text-purple-600" />
                <h3 className="font-bold text-base text-foreground truncate max-w-lg">
                  {selectedRef.title}
                </h3>
              </div>
              <button onClick={() => setSelectedRef(null)} className="text-muted-foreground hover:text-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[65vh] overflow-y-auto">
              <div className="p-4 bg-muted/20 rounded-lg border border-border/30 space-y-2">
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground block">
                  Statutory Rule Summary
                </span>
                <p className="text-xs leading-relaxed text-foreground">
                  {selectedRef.description}
                </p>
              </div>

              {/* 37 CFR 1.84 Quick Reference Table */}
              <div className="space-y-2">
                <span className="text-xs font-bold text-foreground block">USPTO Drafting Constraints Quick Card:</span>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-3 bg-muted/10 rounded border border-border/30">
                    <span className="font-bold text-foreground block mb-0.5">Top & Left Margins</span>
                    <p className="text-muted-foreground text-[11px]">Must be at least 1.0 inch (2.5 cm) clear.</p>
                  </div>
                  <div className="p-3 bg-muted/10 rounded border border-border/30">
                    <span className="font-bold text-foreground block mb-0.5">Right & Bottom Margins</span>
                    <p className="text-muted-foreground text-[11px]">Must be at least 0.625 inch (1.5 cm) clear.</p>
                  </div>
                  <div className="p-3 bg-muted/10 rounded border border-border/30">
                    <span className="font-bold text-foreground block mb-0.5">Reference Numeral Height</span>
                    <p className="text-muted-foreground text-[11px]">Minimum 3.2 mm (1/8 inch) tall, sans-serif or bold.</p>
                  </div>
                  <div className="p-3 bg-muted/10 rounded border border-border/30">
                    <span className="font-bold text-foreground block mb-0.5">Line Work & Hatching</span>
                    <p className="text-muted-foreground text-[11px]">Pure monochrome black lines; no gray color gradients.</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-border/40 bg-muted/10 flex justify-end">
              <Button variant="outline" size="sm" className="text-xs" onClick={() => setSelectedRef(null)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* UPLOAD REFERENCE MODAL */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-card border border-border/60 rounded-xl max-w-lg w-full shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-border/40 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <UploadCloud className="w-5 h-5 text-purple-600" />
                <h3 className="font-bold text-base text-foreground">Upload Reference Asset / Standard</h3>
              </div>
              <button onClick={() => setShowUploadModal(false)} className="text-muted-foreground hover:text-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateUpload} className="p-5 space-y-4">
              <div>
                <label className="text-xs font-bold text-foreground block mb-1">Asset Title</label>
                <Input
                  placeholder="e.g. European Patent Office (EPO) Rule 46 Drawing Standard"
                  value={uploadTitle}
                  onChange={(e) => setUploadTitle(e.target.value)}
                  className="text-xs"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-foreground block mb-1">Category</label>
                  <select
                    value={uploadCategory}
                    onChange={(e) => setUploadCategory(e.target.value)}
                    className="w-full h-9 px-3 rounded-md border border-input bg-card text-xs text-foreground focus:outline-none focus:ring-1"
                  >
                    <option value="REGULATORY_STANDARD">Regulatory Standard</option>
                    <option value="PRIOR_ART">Prior Art Citation</option>
                    <option value="DESIGN_KIT">Design Kit / Vector SVG</option>
                    <option value="GUIDELINE">Concordance Guideline</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-foreground block mb-1">File Name</label>
                  <Input
                    placeholder="e.g. EPO_Rule46_Guide.pdf"
                    value={uploadFileName}
                    onChange={(e) => setUploadFileName(e.target.value)}
                    className="text-xs font-mono"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-foreground block mb-1">Description & Guidelines</label>
                <textarea
                  placeholder="Summary of drafting rules, margins, or prior art significance..."
                  value={uploadDesc}
                  onChange={(e) => setUploadDesc(e.target.value)}
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
                  className="bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold"
                  disabled={savingUpload}
                >
                  {savingUpload ? "Uploading..." : "Save Reference Asset"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
