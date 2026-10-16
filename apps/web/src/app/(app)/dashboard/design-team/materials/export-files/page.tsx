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
  FileDown,
  Search,
  Download,
  ExternalLink,
  Plus,
  X,
  Eye,
  CheckCircle2,
  ImageIcon,
  FileText,
  Layers,
  UploadCloud,
  ShieldCheck,
  Send,
  Hash,
  Archive,
  Check
} from "lucide-react";
import { useActiveRole } from "@/components/auth/role-context";

export default function ExportFilesPage() {
  const router = useRouter();
  const { currentUser } = useActiveRole();
  const [loading, setLoading] = useState(true);
  const [exportsList, setExportsList] = useState<any[]>([]);
  const [counts, setCounts] = useState<any>({});
  const [searchQuery, setSearchQuery] = useState("");

  // Inspect Modal
  const [selectedExport, setSelectedExport] = useState<any | null>(null);

  // New Export Package Modal
  const [showNewModal, setShowNewModal] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newFigures, setNewFigures] = useState("1, 2");
  const [newRecipient, setNewRecipient] = useState("Alice Drafter (Patent Drafter)");
  const [newNotes, setNewNotes] = useState("");
  const [creating, setCreating] = useState(false);
  const [createSuccess, setCreateSuccess] = useState(false);

  const fetchMaterials = async () => {
    try {
      const res = await fetch("/api/design-team/materials");
      if (res.ok) {
        const data = await res.json();
        if (data.materials?.export_files) {
          setExportsList(data.materials.export_files);
          setCounts(data.counts || {});
        }
      }
    } catch (err) {
      console.error("Error fetching export files:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMaterials();
  }, []);

  const filteredExports = exportsList.filter((exp) => {
    return (
      exp.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      exp.file_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      exp.invention_id?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      exp.recipient?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  const handleCreateExport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle) return;
    setCreating(true);

    try {
      const parsedFigs = newFigures
        .split(",")
        .map((f) => parseInt(f.trim(), 10))
        .filter((f) => !isNaN(f));

      const res = await fetch("/api/design-team/materials", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category: "export_files",
          invention_id: "INN-0012",
          project_title: "Smart Energy Management System",
          title: newTitle,
          file_name: `${newTitle.replace(/[^a-zA-Z0-9]/g, "_")}_Package.zip`,
          format: "ZIP BUNDLE",
          size: "4.8 MB",
          figure_number: parsedFigs[0] || 1,
          description: newNotes || "Deliverable bundle packaged for reviewer receipt.",
          actor: currentUser?.name || "Design Team"
        })
      });

      if (res.ok) {
        setCreateSuccess(true);
        setShowNewModal(false);
        setNewTitle("");
        setNewNotes("");
        await fetchMaterials();
        setTimeout(() => setCreateSuccess(false), 3000);
      }
    } catch (err) {
      console.error("Error creating export package:", err);
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-border/40">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
              Deliverable Packages
            </span>
            <span className="text-xs text-muted-foreground font-mono">
              ROLE: {currentUser?.name || "Design Team"}
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-foreground tracking-tight flex items-center gap-2.5">
            <FileDown className="w-7 h-7 text-amber-600" /> Export Deliverable Packages
          </h1>
          <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
            Compiled deliverable packages containing formal drawing sheets, vector master files, callout coordinate metadata, and checksum verified archives.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            onClick={() => setShowNewModal(true)}
            className="bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold shadow-sm"
          >
            <Plus className="w-4 h-4 mr-1.5" /> Generate Export Package
          </Button>

          <Link href="/dashboard/design-team/workspace/in-progress">
            <Button variant="outline" className="text-xs font-semibold">
              <Eye className="w-4 h-4 mr-1.5 text-emerald-600" /> Drawing Studio
            </Button>
          </Link>
        </div>
      </div>

      {createSuccess && (
        <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-400 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4" /> Deliverable package created and registered successfully!
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
          <Button size="sm" variant="outline" className="text-xs h-8">
            <Layers className="w-3.5 h-3.5 mr-1.5 text-purple-500" /> Reference Files ({counts.reference_files || 4})
          </Button>
        </Link>
        <Link href="/dashboard/design-team/materials/export-files">
          <Button size="sm" className="bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 text-xs h-8">
            <FileDown className="w-3.5 h-3.5 mr-1.5 text-amber-500" /> Export Files ({counts.export_files || exportsList.length})
          </Button>
        </Link>
      </div>

      {/* Search Bar */}
      <div className="relative max-w-md">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search package title, recipient, or invention ID..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9 text-xs bg-card"
        />
      </div>

      {/* Export Packages List */}
      {loading ? (
        <div className="py-20 text-center text-xs text-muted-foreground animate-pulse">
          Loading deliverable packages...
        </div>
      ) : filteredExports.length === 0 ? (
        <Card className="p-12 text-center bg-card">
          <FileDown className="w-10 h-10 mx-auto text-muted-foreground/60 mb-3" />
          <h3 className="text-base font-bold text-foreground">No export packages found</h3>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredExports.map((exp) => (
            <Card
              key={exp.id}
              className="bg-card border-border/50 hover:border-amber-500/50 transition-all shadow-sm"
            >
              <CardContent className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1.5 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-[10px] font-bold text-amber-600 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded">
                      {exp.id}
                    </span>
                    <Badge variant="outline" className="text-[10px] font-mono">{exp.invention_id}</Badge>
                    <Badge
                      className={`text-[9px] font-bold ${
                        exp.status === "DISPATCHED"
                          ? "bg-purple-600 text-white"
                          : exp.status === "APPROVED"
                          ? "bg-emerald-600 text-white"
                          : "bg-blue-600 text-white"
                      }`}
                    >
                      {exp.status || "READY"}
                    </Badge>
                  </div>

                  <h3 className="text-sm font-bold text-foreground">{exp.title}</h3>
                  <p className="text-xs text-muted-foreground line-clamp-1">{exp.description}</p>

                  <div className="flex items-center gap-4 text-[11px] text-muted-foreground pt-1 flex-wrap">
                    <span>Recipient: <strong className="text-foreground">{exp.recipient}</strong></span>
                    <span>•</span>
                    <span>File: <span className="font-mono">{exp.file_name}</span> ({exp.size || "3.5 MB"})</span>
                    <span>•</span>
                    <span>Created: {new Date(exp.created_at).toLocaleDateString()}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 text-xs"
                    onClick={() => setSelectedExport(exp)}
                  >
                    <Eye className="w-3.5 h-3.5 mr-1 text-amber-600" /> Inspect Manifest
                  </Button>

                  <Button
                    size="sm"
                    className="h-8 text-xs bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900"
                    onClick={() => triggerFileDownload(exp.file_name, JSON.stringify(exp, null, 2), "application/json")}
                  >
                    <Download className="w-3.5 h-3.5 mr-1" /> Download Package
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* INSPECT MANIFEST MODAL */}
      {selectedExport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-card border border-border/60 rounded-xl max-w-xl w-full shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-border/40 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Archive className="w-5 h-5 text-amber-600" />
                <h3 className="font-bold text-base text-foreground">
                  Package Manifest: {selectedExport.title}
                </h3>
              </div>
              <button onClick={() => setSelectedExport(null)} className="text-muted-foreground hover:text-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[65vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-3 p-3.5 bg-muted/20 rounded-lg border border-border/30 text-xs">
                <div>
                  <span className="text-[10px] uppercase text-muted-foreground block">Package ID</span>
                  <span className="font-mono font-bold text-foreground">{selectedExport.id}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase text-muted-foreground block">Target Project</span>
                  <span className="font-mono font-bold text-foreground">{selectedExport.invention_id}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase text-muted-foreground block">Target Recipient</span>
                  <span className="font-semibold text-foreground">{selectedExport.recipient}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase text-muted-foreground block">Status</span>
                  <Badge className="bg-emerald-600 text-white text-[9px] mt-0.5">{selectedExport.status}</Badge>
                </div>
              </div>

              <div className="space-y-2">
                <span className="text-xs font-bold text-foreground block">Included Deliverable Components:</span>
                <div className="space-y-1.5 text-xs">
                  <div className="p-2.5 rounded border border-border/40 bg-card flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <ImageIcon className="w-4 h-4 text-emerald-600" />
                      <span>300 DPI Monochrome Formal Sheets (PNG)</span>
                    </div>
                    <Badge variant="outline" className="text-[9px]">37 CFR § 1.84</Badge>
                  </div>
                  <div className="p-2.5 rounded border border-border/40 bg-card flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Layers className="w-4 h-4 text-purple-600" />
                      <span>Scalable Vector Master Schematics (SVG)</span>
                    </div>
                    <Badge variant="outline" className="text-[9px]">Vector Linework</Badge>
                  </div>
                  <div className="p-2.5 rounded border border-border/40 bg-card flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-blue-600" />
                      <span>Reference Numeral Coordinate Dictionary (JSON)</span>
                    </div>
                    <Badge variant="outline" className="text-[9px]">Claim Synchronized</Badge>
                  </div>
                </div>
              </div>

              <div className="p-3 bg-muted/15 rounded-lg border border-border/30 text-[11px] font-mono text-muted-foreground">
                <span>Integrity Checksum:</span>
                <span className="block text-foreground truncate mt-0.5">{selectedExport.checksum || "sha256-verified-package"}</span>
              </div>
            </div>

            <div className="p-4 border-t border-border/40 bg-muted/10 flex justify-end gap-2">
              <Button variant="outline" size="sm" className="text-xs" onClick={() => setSelectedExport(null)}>
                Close
              </Button>
              <Button
                size="sm"
                className="text-xs bg-amber-600 hover:bg-amber-700 text-white font-semibold"
                onClick={() => triggerFileDownload(selectedExport.file_name, JSON.stringify(selectedExport, null, 2), "application/json")}
              >
                <Download className="w-3.5 h-3.5 mr-1" /> Download Package Archive
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* GENERATE NEW EXPORT MODAL */}
      {showNewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-card border border-border/60 rounded-xl max-w-lg w-full shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-border/40 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileDown className="w-5 h-5 text-amber-600" />
                <h3 className="font-bold text-base text-foreground">Generate New Deliverable Package</h3>
              </div>
              <button onClick={() => setShowNewModal(false)} className="text-muted-foreground hover:text-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateExport} className="p-5 space-y-4">
              <div>
                <label className="text-xs font-bold text-foreground block mb-1">Package Title</label>
                <Input
                  placeholder="e.g. USPTO Complete Drawing Package (FIG 1 - FIG 4)"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="text-xs"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-foreground block mb-1">Figures Included</label>
                  <Input
                    placeholder="e.g. 1, 2, 3, 4"
                    value={newFigures}
                    onChange={(e) => setNewFigures(e.target.value)}
                    className="text-xs font-mono"
                    required
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-foreground block mb-1">Target Recipient</label>
                  <select
                    value={newRecipient}
                    onChange={(e) => setNewRecipient(e.target.value)}
                    className="w-full h-9 px-3 rounded-md border border-input bg-card text-xs text-foreground focus:outline-none focus:ring-1"
                  >
                    <option value="Alice Drafter (Patent Drafter)">Alice Drafter (Patent Drafter)</option>
                    <option value="Dr. Sarah Analyst (Patent Analyst)">Dr. Sarah Analyst (Patent Analyst)</option>
                    <option value="Executive / CEO">Executive / CEO</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-foreground block mb-1">Delivery Notes</label>
                <textarea
                  placeholder="Compliance specifications, version notes..."
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  rows={3}
                  className="w-full p-2.5 rounded-md border border-input bg-card text-xs text-foreground focus:outline-none focus:ring-1"
                />
              </div>

              <div className="pt-3 border-t border-border/40 flex justify-end gap-2">
                <Button type="button" variant="outline" size="sm" className="text-xs" onClick={() => setShowNewModal(false)}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  className="bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold"
                  disabled={creating}
                >
                  {creating ? "Bundling Package..." : "Compile & Register Package"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
