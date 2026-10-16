"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ImageIcon, UploadCloud, Eye, Trash2, Calendar, FileImage, Edit3, Send, CheckCircle2, X } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useActiveRole } from "@/components/auth/role-context";

export default function DrawingsPage() {
  const { currentUser } = useActiveRole();
  const searchParams = useSearchParams();
  const rawId = searchParams?.get('id');
  
  const [inventionId, setInventionId] = useState<string | null>(rawId);
  const [drawings, setDrawings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [sendingToDesign, setSendingToDesign] = useState<string | null>(null);
  const [sentFiles, setSentFiles] = useState<Set<string>>(new Set());

  // Modal State for assigning to Design Team
  const [selectedDocForModal, setSelectedDocForModal] = useState<any | null>(null);
  const [customInstructions, setCustomInstructions] = useState("");
  const [priority, setPriority] = useState("HIGH");
  const [dueDate, setDueDate] = useState("2026-10-30");

  const fetchDocs = async (currentId: string) => {
    try {
      const docRes = await fetch(`/api/patent-drafter/documents?inventionId=${currentId}`);
      const docData = await docRes.json();
      if (docData.success && docData.documents.drawings) {
        setDrawings(docData.documents.drawings);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    const init = async () => {
      try {
        let currentId = rawId;
        if (!currentId) {
          const asgRes = await fetch('/api/patent-drafter/assignments');
          const asgData = await asgRes.json();
          if (asgData.assignments && asgData.assignments.length > 0) {
            currentId = asgData.assignments[0].invention_id;
            setInventionId(currentId);
          }
        }
        if (!currentId) {
          setLoading(false); return;
        }
        await fetchDocs(currentId);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [rawId]);

  const handleMockUpload = async () => {
    if (!inventionId) return;
    setUploading(true);
    
    await new Promise(r => setTimeout(r, 1000));
    
    try {
      await fetch('/api/patent-drafter/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          invention_id: inventionId,
          type: 'drawings',
          payload: {
            filename: `FIG_${drawings.length + 1}_Architecture.png`,
            uploader: currentUser.name,
            size: '1.2 MB'
          }
        })
      });
      await fetchDocs(inventionId);
    } catch(e) {
      console.error(e);
    } finally {
      setUploading(false);
    }
  };

  const handleOpenAssignModal = (doc: any) => {
    setSelectedDocForModal(doc);
    setCustomInstructions(`Please review and enhance technical drawing '${doc.filename}'. Formalize lines, verify reference numerals, and ensure compliance with patent office margins (1-inch margins, minimum 300 DPI line art).`);
  };

  const handleSubmitAssignToDesign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDocForModal || !inventionId) return;

    setSendingToDesign(selectedDocForModal.id);
    try {
      // Create formal assignment in design-team assignments API
      await fetch('/api/design-team/assignments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          invention_id: inventionId,
          project_title: `Patent Drawings - ${inventionId}`,
          invention_title: `Drawing Enhancement: ${selectedDocForModal.filename}`,
          title: `Enhance Drawing: ${selectedDocForModal.filename}`,
          instructions: customInstructions,
          priority: priority,
          due_date: new Date(dueDate).toISOString(),
          assigned_to: "Design Team",
          assigned_by: currentUser.name || "Patent Drafter",
          sender_role: "PATENT_DRAFTER",
          source_files: [
            {
              id: selectedDocForModal.id,
              name: selectedDocForModal.filename,
              type: "drawing",
              size: selectedDocForModal.size || "1.2 MB",
              url: "#"
            }
          ]
        })
      });

      setSentFiles(prev => new Set(prev).add(selectedDocForModal.id));
      setSelectedDocForModal(null);
    } catch(e) {
      console.error(e);
    } finally {
      setSendingToDesign(null);
    }
  };

  if (loading) return <div className="p-12 text-center text-muted-foreground animate-pulse">Loading Drawings...</div>;

  if (!inventionId) {
    return <div className="p-12 text-center">No Invention Selected.</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
            <ImageIcon className="w-6 h-6 text-emerald-500" /> Patent Drawings: {inventionId}
          </h2>
          <p className="text-sm text-muted-foreground mt-1">Manage figures, add annotations, and assign technical schematics to the Design Team.</p>
        </div>
        <Button onClick={handleMockUpload} disabled={uploading} className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm">
          <UploadCloud className="w-4 h-4 mr-2" /> {uploading ? 'Uploading...' : 'Upload Drawing'}
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {drawings.length === 0 ? (
          <div className="col-span-full">
            <Card className="border-border/50 border-dashed shadow-sm bg-white dark:bg-card">
              <CardContent className="p-16 flex flex-col items-center justify-center text-muted-foreground text-center">
                <FileImage className="w-12 h-12 opacity-20 mb-4" />
                <h3 className="font-semibold mb-2">No Drawings Uploaded for {inventionId}</h3>
                <p className="text-sm max-w-sm mb-6">Upload technical diagrams, UI mockups, or architectural charts to support the patent application.</p>
                <Button onClick={handleMockUpload} disabled={uploading} variant="outline" className="bg-white">
                  Browse Files
                </Button>
              </CardContent>
            </Card>
          </div>
        ) : (
          drawings.map((doc: any, index: number) => {
            const isSent = sentFiles.has(doc.id);
            return (
              <Card key={doc.id || index} className="border-border/50 shadow-sm bg-white dark:bg-card flex flex-col group">
                <div className="h-40 bg-slate-100 dark:bg-slate-900 border-b border-border/50 flex items-center justify-center relative overflow-hidden group-hover:bg-slate-200 transition-colors">
                  <ImageIcon className="w-12 h-12 text-slate-300 dark:text-slate-700" />
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button variant="secondary" size="sm" className="bg-white/90 text-black hover:bg-white"><Eye className="w-4 h-4 mr-2"/> Preview</Button>
                  </div>
                </div>
                <CardContent className="p-4 flex-1 flex flex-col">
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-semibold text-sm truncate flex-1" title={doc.filename}>{doc.filename}</h4>
                    <Button variant="ghost" size="icon" className="h-6 w-6 text-slate-400 hover:text-blue-600 -mt-1 -mr-1">
                      <Edit3 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                  
                  <div className="flex justify-between items-center text-xs text-muted-foreground mb-4">
                    <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> {new Date(doc.created_at).toLocaleDateString()}</span>
                    <span>{doc.size || 'Unknown'}</span>
                  </div>
                  
                  <div className="mt-auto space-y-2">
                    <Button 
                      variant={isSent ? "outline" : "default"} 
                      size="sm" 
                      className={`w-full text-xs h-8 ${isSent ? 'bg-emerald-50 text-emerald-700 border-emerald-200 pointer-events-none' : 'bg-slate-900 hover:bg-slate-800 text-white'}`}
                      onClick={() => handleOpenAssignModal(doc)}
                      disabled={sendingToDesign === doc.id || isSent}
                    >
                      {isSent ? (
                        <><CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Assigned to Design Team</>
                      ) : (
                        <><Send className="w-3.5 h-3.5 mr-1" /> {sendingToDesign === doc.id ? 'Sending...' : 'Assign to Design Team'}</>
                      )}
                    </Button>
                    <Button variant="outline" size="sm" className="w-full text-xs h-8 text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200">
                      <Trash2 className="w-3.5 h-3.5 mr-1" /> Delete
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* Assign to Design Team Modal */}
      {selectedDocForModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-card border border-border/60 rounded-xl max-w-lg w-full shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-border/40 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Send className="w-5 h-5 text-emerald-600" />
                <h3 className="font-bold text-base text-foreground">Assign Drawing to Design Team</h3>
              </div>
              <button onClick={() => setSelectedDocForModal(null)} className="text-muted-foreground hover:text-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitAssignToDesign} className="p-5 space-y-4">
              <div>
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider block mb-1">Target Drawing Asset</label>
                <div className="flex items-center gap-2 bg-muted/20 p-2.5 rounded-md border border-border/30 text-xs font-semibold text-foreground">
                  <ImageIcon className="w-4 h-4 text-emerald-600" />
                  <span>{selectedDocForModal.filename}</span>
                  <span className="text-muted-foreground">({selectedDocForModal.size || "1.2 MB"})</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider block mb-1">Priority</label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value)}
                    className="w-full h-9 px-3 rounded-md border border-input bg-card text-xs text-foreground focus:outline-none focus:ring-1"
                  >
                    <option value="HIGH">High Priority</option>
                    <option value="MEDIUM">Medium Priority</option>
                    <option value="LOW">Low Priority</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider block mb-1">Filing Due Date</label>
                  <Input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="text-xs"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider block mb-1">Design Team Instructions</label>
                <textarea
                  value={customInstructions}
                  onChange={(e) => setCustomInstructions(e.target.value)}
                  rows={4}
                  className="w-full p-2.5 rounded-md border border-input bg-card text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                  required
                />
              </div>

              <div className="pt-3 border-t border-border/40 flex justify-end gap-2">
                <Button type="button" variant="outline" size="sm" className="text-xs" onClick={() => setSelectedDocForModal(null)}>
                  Cancel
                </Button>
                <Button type="submit" size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold" disabled={sendingToDesign !== null}>
                  {sendingToDesign ? "Assigning..." : "Confirm & Send to Design Team"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
