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
  ImageIcon,
  Search,
  Filter,
  Download,
  ExternalLink,
  Plus,
  X,
  Eye,
  CheckCircle2,
  FileText,
  Layers,
  FileDown,
  Clock,
  PenTool,
  UploadCloud,
  Maximize2
} from "lucide-react";
import { useActiveRole } from "@/components/auth/role-context";

export default function DesignMaterialsDrawingsPage() {
  const router = useRouter();
  const { currentUser } = useActiveRole();
  const [loading, setLoading] = useState(true);
  const [drawings, setDrawings] = useState<any[]>([]);
  const [counts, setCounts] = useState<any>({});
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");

  // Preview Modal
  const [previewDrawing, setPreviewDrawing] = useState<any | null>(null);

  // Upload Modal
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadTitle, setUploadTitle] = useState("");
  const [uploadFigNum, setUploadFigNum] = useState<number>(1);
  const [uploadFileName, setUploadFileName] = useState("");
  const [uploadFormat, setUploadFormat] = useState("PNG");
  const [uploadNotes, setUploadNotes] = useState("");
  const [savingUpload, setSavingUpload] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);

  const fetchMaterials = async () => {
    try {
      const res = await fetch("/api/design-team/materials");
      if (res.ok) {
        const data = await res.json();
        if (data.materials?.drawings) {
          setDrawings(data.materials.drawings);
          setCounts(data.counts || {});
        }
      }
    } catch (err) {
      console.error("Error fetching drawings:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMaterials();
  }, []);

  const filteredDrawings = drawings.filter((d) => {
    return (
      d.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.file_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.invention_id?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      `fig ${d.figure_number}`.includes(searchQuery.toLowerCase())
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
          category: "drawings",
          invention_id: "INN-0012",
          project_title: "Smart Energy Management System",
          title: uploadTitle,
          figure_number: uploadFigNum,
          file_name: uploadFileName,
          format: uploadFormat,
          size: "1.4 MB",
          notes: uploadNotes,
          actor: currentUser?.name || "Design Team"
        })
      });

      if (res.ok) {
        setUploadSuccess(true);
        setShowUploadModal(false);
        setUploadTitle("");
        setUploadFileName("");
        setUploadNotes("");
        await fetchMaterials();
        setTimeout(() => setUploadSuccess(false), 3000);
      }
    } catch (err) {
      console.error("Error uploading drawing:", err);
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
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              Design Materials Archive
            </span>
            <span className="text-xs text-muted-foreground font-mono">
              ROLE: {currentUser?.name || "Design Team"}
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-foreground tracking-tight flex items-center gap-2.5">
            <ImageIcon className="w-7 h-7 text-emerald-600" /> Patent Drawing Sheets
          </h1>
          <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
            Central repository of source briefs, line art drafts, formalized patent sheets, and figure revisions compliant with 37 CFR § 1.84.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            onClick={() => setShowUploadModal(true)}
            className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-sm"
          >
            <Plus className="w-4 h-4 mr-1.5" /> Upload Drawing Sheet
          </Button>

          <Link href="/dashboard/design-team/workspace/in-progress">
            <Button variant="outline" className="text-xs font-semibold">
              <PenTool className="w-4 h-4 mr-1.5 text-blue-500" /> Open Drawing Studio
            </Button>
          </Link>
        </div>
      </div>

      {uploadSuccess && (
        <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-400 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4" /> Drawing sheet registered and stored in Design Materials successfully!
        </div>
      )}

      {/* Materials Navigation Tab Strip */}
      <div className="flex items-center gap-2 border-b border-border/40 pb-2 overflow-x-auto">
        <Link href="/dashboard/design-team/materials/drawings">
          <Button size="sm" className="bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 text-xs h-8">
            <ImageIcon className="w-3.5 h-3.5 mr-1.5 text-emerald-500" /> Drawings ({counts.drawings || drawings.length})
          </Button>
        </Link>
        <Link href="/dashboard/design-team/materials/technical-docs">
          <Button size="sm" variant="outline" className="text-xs h-8">
            <FileText className="w-3.5 h-3.5 mr-1.5 text-blue-500" /> Technical Documents ({counts.technical_docs || 3})
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

      {/* Search and View Controls */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search figure number, title, file name, or invention ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 text-xs bg-card"
          />
        </div>

        <div className="flex items-center gap-1 border border-border/40 p-1 rounded-lg bg-card self-end sm:self-auto">
          <Button
            size="sm"
            variant={viewMode === "grid" ? "secondary" : "ghost"}
            className="h-7 px-2.5 text-xs"
            onClick={() => setViewMode("grid")}
          >
            Sheet Grid
          </Button>
          <Button
            size="sm"
            variant={viewMode === "table" ? "secondary" : "ghost"}
            className="h-7 px-2.5 text-xs"
            onClick={() => setViewMode("table")}
          >
            Table View
          </Button>
        </div>
      </div>

      {/* Main Content */}
      {loading ? (
        <div className="py-20 text-center text-xs text-muted-foreground animate-pulse">
          Loading patent drawings archive...
        </div>
      ) : filteredDrawings.length === 0 ? (
        <Card className="p-12 text-center bg-card">
          <ImageIcon className="w-10 h-10 mx-auto text-muted-foreground/60 mb-3" />
          <h3 className="text-base font-bold text-foreground">No drawing sheets match criteria</h3>
        </Card>
      ) : viewMode === "grid" ? (
        /* Sheet Grid View */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredDrawings.map((dwg) => (
            <Card
              key={dwg.id}
              className="bg-card border-border/50 hover:border-emerald-500/50 transition-all shadow-sm overflow-hidden flex flex-col justify-between"
            >
              <CardHeader className="p-4 pb-2 border-b border-border/30">
                <div className="flex items-center justify-between mb-1.5">
                  <Badge variant="outline" className="font-mono text-[10px] font-bold text-blue-600 bg-blue-50 dark:bg-blue-950/40">
                    FIG. {dwg.figure_number || 1}
                  </Badge>
                  <Badge
                    className={`text-[9px] font-bold ${
                      dwg.status === "APPROVED"
                        ? "bg-emerald-600 text-white"
                        : dwg.status === "UNDER_REVIEW"
                        ? "bg-purple-600 text-white"
                        : "bg-blue-600 text-white"
                    }`}
                  >
                    {dwg.status || "IN_PROGRESS"}
                  </Badge>
                </div>
                <CardTitle className="text-sm font-bold text-foreground line-clamp-1">{dwg.title}</CardTitle>
                <p className="text-[11px] text-muted-foreground truncate">
                  {dwg.project_title} • <span className="font-mono">{dwg.invention_id}</span>
                </p>
              </CardHeader>

              <CardContent className="p-4 space-y-3 flex-1 flex flex-col justify-between">
                {/* Visual Patent Sheet Preview Box */}
                <div
                  onClick={() => setPreviewDrawing(dwg)}
                  className="h-44 bg-white dark:bg-slate-950 rounded-lg border border-border/50 p-4 flex flex-col justify-between cursor-pointer hover:shadow-md transition-shadow relative overflow-hidden group select-none"
                >
                  <div className="flex items-center justify-between text-[9px] font-mono text-slate-500 border-b border-slate-200 pb-1">
                    <span>USPTO 37 CFR § 1.84</span>
                    <span>SHEET 1/1</span>
                  </div>

                  {/* Centered Line Art Schematic Graphic */}
                  <div className="my-auto text-center space-y-1">
                    <div className="w-24 h-16 mx-auto border-2 border-slate-900 rounded bg-slate-50 flex items-center justify-center p-1">
                      <span className="text-[8px] font-mono font-bold text-slate-900 truncate">
                        [{dwg.figure_number ? `${dwg.figure_number}02` : "102"}] BUS
                      </span>
                    </div>
                    <span className="text-[10px] font-mono font-bold text-slate-800 dark:text-slate-200 block truncate">
                      {dwg.file_name}
                    </span>
                  </div>

                  <div className="text-center text-[10px] font-mono font-bold text-slate-900 border-t border-slate-200 pt-1">
                    FIG. {dwg.figure_number || 1}
                  </div>

                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 backdrop-blur-[2px]">
                    <Button size="sm" className="h-7 text-xs bg-white text-slate-900 hover:bg-slate-100 font-semibold">
                      <Eye className="w-3.5 h-3.5 mr-1" /> Inspect Sheet
                    </Button>
                  </div>
                </div>

                <div className="space-y-1 text-xs">
                  <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                    <span>Format & Size:</span>
                    <strong className="text-foreground font-mono">{dwg.format} • {dwg.size}</strong>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                    <span>Compliance:</span>
                    <span className="text-emerald-600 font-medium">{dwg.compliance || "Compliant"}</span>
                  </div>
                </div>

                <div className="pt-2 border-t border-border/20 flex items-center gap-2">
                  <Link
                    href={`/dashboard/design-team/workspace/in-progress?id=${dwg.assignment_id || "DSG-0101"}`}
                    className="flex-1"
                  >
                    <Button size="sm" className="w-full h-8 text-xs bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-100 dark:text-slate-900">
                      Open in Studio
                    </Button>
                  </Link>

                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 px-2 text-xs"
                    title="Download Sheet"
                    onClick={() => triggerFileDownload(dwg.file_name)}
                  >
                    <Download className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        /* Table View */
        <div className="rounded-xl border border-border/40 overflow-hidden bg-card shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/30 border-b border-border/40 text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Figure & Title</th>
                  <th className="py-3 px-4">Invention & Project</th>
                  <th className="py-3 px-4">File Name</th>
                  <th className="py-3 px-4">Format / Size</th>
                  <th className="py-3 px-4">Compliance Status</th>
                  <th className="py-3 px-4">Author</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/20">
                {filteredDrawings.map((dwg) => (
                  <tr key={dwg.id} className="hover:bg-muted/15 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="font-mono text-[10px] font-bold bg-blue-50 dark:bg-blue-950/40 text-blue-600">
                          FIG. {dwg.figure_number || 1}
                        </Badge>
                        <span className="font-bold text-foreground hover:text-emerald-600 cursor-pointer" onClick={() => setPreviewDrawing(dwg)}>
                          {dwg.title}
                        </span>
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <span className="font-semibold text-foreground block">{dwg.project_title}</span>
                      <span className="text-[11px] text-muted-foreground font-mono">{dwg.invention_id}</span>
                    </td>

                    <td className="py-3.5 px-4 font-mono text-[11px] text-foreground">
                      {dwg.file_name}
                    </td>

                    <td className="py-3.5 px-4 font-mono text-[11px] text-muted-foreground">
                      {dwg.format} • {dwg.size}
                    </td>

                    <td className="py-3.5 px-4">
                      <Badge className="bg-emerald-600 text-white text-[10px]">
                        {dwg.compliance || "Compliant"}
                      </Badge>
                    </td>

                    <td className="py-3.5 px-4 text-muted-foreground text-[11px]">
                      {dwg.uploaded_by || "Design Team"}
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Link href={`/dashboard/design-team/workspace/in-progress?id=${dwg.assignment_id || "DSG-0101"}`}>
                          <Button size="sm" className="h-7 px-2.5 text-[11px] bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-100 dark:text-slate-900">
                            Studio
                          </Button>
                        </Link>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 px-2 text-[11px]"
                          onClick={() => setPreviewDrawing(dwg)}
                          title="Inspect"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 px-2 text-[11px]"
                          onClick={() => triggerFileDownload(dwg.file_name)}
                          title="Download"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* PREVIEW DRAWING MODAL */}
      {previewDrawing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-card border border-border/60 rounded-xl max-w-2xl w-full shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-border/40 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ImageIcon className="w-5 h-5 text-emerald-600" />
                <h3 className="font-bold text-base text-foreground">
                  FIG. {previewDrawing.figure_number || 1}: {previewDrawing.title}
                </h3>
              </div>
              <button onClick={() => setPreviewDrawing(null)} className="text-muted-foreground hover:text-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* Simulated Full Patent Sheet Container */}
              <div className="bg-white text-slate-900 border-2 border-slate-300 rounded-sm p-6 shadow-inner min-h-[380px] flex flex-col justify-between select-none">
                <div className="flex justify-between font-mono text-[10px] text-slate-500 border-b border-slate-200 pb-1.5">
                  <span>USPTO 37 CFR § 1.84 SPECIFICATION SHEET</span>
                  <span>APPLICATION: {previewDrawing.invention_id}</span>
                </div>

                <div className="my-auto py-8 text-center space-y-3">
                  <div className="w-72 h-44 mx-auto border-2 border-slate-900 bg-slate-50 p-4 rounded flex flex-col justify-between">
                    <div className="text-[10px] font-mono border-b border-slate-900 pb-1 font-bold">
                      [{previewDrawing.figure_number || 1}02] CONTROL BUS
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-[9px] font-mono">
                      <div className="border border-slate-900 p-1.5">[{previewDrawing.figure_number || 1}04] ENGINE</div>
                      <div className="border border-slate-900 p-1.5">[{previewDrawing.figure_number || 1}06] MEMORY</div>
                    </div>
                    <div className="text-[9px] font-mono border-t border-slate-900 pt-1">
                      [{previewDrawing.figure_number || 1}08] TRANSLATION MATRIX
                    </div>
                  </div>
                  <p className="text-xs font-mono font-bold text-slate-700">{previewDrawing.file_name}</p>
                </div>

                <div className="text-center border-t border-slate-200 pt-2">
                  <div className="font-mono text-sm font-bold text-slate-900">
                    FIG. {previewDrawing.figure_number || 1}
                  </div>
                  <p className="text-xs text-slate-600 mt-0.5">{previewDrawing.title}</p>
                </div>
              </div>

              <div className="p-3 bg-muted/20 rounded-lg border border-border/30 text-xs space-y-1">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Notes:</span>
                  <span className="font-medium text-foreground">{previewDrawing.notes || "Standard line art formalization."}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Standard:</span>
                  <span>37 CFR § 1.84 (1.0" top/left margins)</span>
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-border/40 bg-muted/10 flex justify-between items-center">
              <Link href={`/dashboard/design-team/workspace/in-progress?id=${previewDrawing.assignment_id || "DSG-0101"}`}>
                <Button size="sm" className="text-xs bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900">
                  <PenTool className="w-3.5 h-3.5 mr-1.5" /> Edit in Drawing Studio
                </Button>
              </Link>
              <Button variant="outline" size="sm" className="text-xs" onClick={() => setPreviewDrawing(null)}>
                Close Preview
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* UPLOAD DRAWING SHEET MODAL */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-card border border-border/60 rounded-xl max-w-lg w-full shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-border/40 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <UploadCloud className="w-5 h-5 text-emerald-600" />
                <h3 className="font-bold text-base text-foreground">Upload Patent Drawing Sheet</h3>
              </div>
              <button onClick={() => setShowUploadModal(false)} className="text-muted-foreground hover:text-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateUpload} className="p-5 space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-bold text-foreground block mb-1">Figure #</label>
                  <Input
                    type="number"
                    min={1}
                    max={50}
                    value={uploadFigNum}
                    onChange={(e) => setUploadFigNum(Number(e.target.value))}
                    className="text-xs font-mono font-bold"
                    required
                  />
                </div>
                <div className="col-span-2">
                  <label className="text-xs font-bold text-foreground block mb-1">Format</label>
                  <select
                    value={uploadFormat}
                    onChange={(e) => setUploadFormat(e.target.value)}
                    className="w-full h-9 px-3 rounded-md border border-input bg-card text-xs text-foreground focus:outline-none focus:ring-1"
                  >
                    <option value="PNG">PNG (300 DPI Monochrome)</option>
                    <option value="SVG">SVG (Scalable Vector)</option>
                    <option value="PDF">PDF (USPTO Sheet)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-foreground block mb-1">Figure Title / Sheet Caption</label>
                <Input
                  placeholder="e.g. FIG 5 - Distributed Gateway Routing Network"
                  value={uploadTitle}
                  onChange={(e) => setUploadTitle(e.target.value)}
                  className="text-xs"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-bold text-foreground block mb-1">File Name</label>
                <Input
                  placeholder="e.g. FIG_5_Gateway_Network_Formal_v1.png"
                  value={uploadFileName}
                  onChange={(e) => setUploadFileName(e.target.value)}
                  className="text-xs font-mono"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-bold text-foreground block mb-1">Linework & Compliance Notes</label>
                <textarea
                  placeholder="Callouts placed, margin compliance notes..."
                  value={uploadNotes}
                  onChange={(e) => setUploadNotes(e.target.value)}
                  rows={2}
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
                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold"
                  disabled={savingUpload}
                >
                  {savingUpload ? "Registering..." : "Upload & Save Sheet"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
