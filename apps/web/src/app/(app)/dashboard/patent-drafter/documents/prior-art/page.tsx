"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Search, ExternalLink, Calendar, Info, Library, UploadCloud, Edit3, Save } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useActiveRole } from "@/components/auth/role-context";
import { Textarea } from "@/components/ui/textarea";

export default function PriorArtPage() {
  const { currentUser } = useActiveRole();
  const searchParams = useSearchParams();
  const rawId = searchParams?.get('id');
  
  const [inventionId, setInventionId] = useState<string | null>(rawId);
  const [priorArtList, setPriorArtList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editNotes, setEditNotes] = useState("");

  const fetchPriorArt = async (currentId: string) => {
    try {
      const invRes = await fetch(`/api/patent-drafter/invention?id=${currentId}`);
      const invData = await invRes.json();
      
      let combined = [];
      if (invData.invention && invData.invention.research) {
        combined = [...invData.invention.research];
      }
      
      const docRes = await fetch(`/api/patent-drafter/documents?inventionId=${currentId}`);
      const docData = await docRes.json();
      if (docData.success && docData.documents.prior_art) {
        combined = [...combined, ...docData.documents.prior_art];
      }
      
      setPriorArtList(combined);
    } catch(e) {
      console.error(e);
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
        if (!currentId) return;
        await fetchPriorArt(currentId);
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
    await new Promise(r => setTimeout(r, 1200));
    
    try {
      await fetch('/api/patent-drafter/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          invention_id: inventionId,
          type: 'prior_art',
          payload: {
            id: 'PA-' + Date.now(),
            publication_number: `US-${Math.floor(Math.random() * 9000000) + 1000000}-B2`,
            title: "Newly Uploaded Patent Reference",
            relevance_score: 0.85,
            technical_features: "Extracted features from uploaded document.",
            notes: "Pending drafter review.",
            publication_date: new Date().toISOString().split('T')[0],
            source: 'Uploaded by ' + currentUser.name
          }
        })
      });
      await fetchPriorArt(inventionId);
    } catch(e) {
      console.error(e);
    } finally {
      setUploading(false);
    }
  };

  const handleEditOpen = (ref: any) => {
    setEditingId(ref.id || ref.publication_number);
    setEditNotes(ref.notes || "");
  };

  const handleSaveNotes = async () => {
    setEditingId(null);
    // Real implementation would PUT changes to backend
  };

  if (loading) return <div className="p-12 text-center text-muted-foreground animate-pulse">Loading Prior Art...</div>;

  if (!inventionId) {
    return <div className="p-12 text-center text-slate-500">No active invention project.</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
            <Search className="w-6 h-6 text-indigo-500" /> Prior Art & Research
          </h2>
          <p className="text-sm text-muted-foreground mt-1">Review references, upload new prior art, and draft differentiator notes.</p>
        </div>
        <Button onClick={handleMockUpload} disabled={uploading} className="bg-indigo-600 hover:bg-indigo-700 text-white">
          <UploadCloud className="w-4 h-4 mr-2" /> {uploading ? 'Importing...' : 'Import Prior Art'}
        </Button>
      </div>

      <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex items-start gap-3">
        <Info className="w-5 h-5 text-indigo-600 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-slate-700">
          <strong>Analyst Research Included:</strong> References compiled by the Analyst and Semantic Search engine. Use the "Edit Notes" feature below to document your claim differentiators before you begin drafting.
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {priorArtList.length === 0 ? (
          <Card className="border-border/50 shadow-sm bg-white dark:bg-card">
            <CardContent className="p-12 flex flex-col items-center justify-center text-muted-foreground text-center">
              <Library className="w-12 h-12 opacity-20 mb-4" />
              <h3 className="font-semibold mb-2">No Prior Art Found</h3>
              <p className="text-sm mb-4">No research references have been linked to this project yet.</p>
              <Button onClick={handleMockUpload} variant="outline" className="bg-white">
                Import First Document
              </Button>
            </CardContent>
          </Card>
        ) : (
          priorArtList.map((ref: any, index: number) => {
            const isEditing = editingId === (ref.id || ref.publication_number);
            
            return (
              <Card key={ref.id || index} className="border-border/50 shadow-sm bg-white dark:bg-card overflow-hidden">
                <div className="p-4 border-b border-border/50 bg-slate-50/50 flex justify-between items-start">
                  <div>
                    <div className="flex items-center gap-3 mb-1">
                      <span className="font-bold text-blue-700 text-lg tracking-tight">{ref.publication_number || 'US-TBD-A1'}</span>
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-200 text-slate-700">
                        Relevance: {ref.relevance_score ? Math.round(ref.relevance_score * 100) + '%' : 'High'}
                      </span>
                    </div>
                    <h3 className="font-semibold text-foreground text-lg">{ref.title || 'Related Patent Document'}</h3>
                  </div>
                  <Button variant="outline" size="sm" className="h-8 gap-1 bg-white">
                    <ExternalLink className="w-3.5 h-3.5" /> View Source
                  </Button>
                </div>
                <CardContent className="p-5">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div>
                      <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Key Technical Features</h4>
                      <p className="text-sm text-slate-700 leading-relaxed bg-slate-50 p-3 rounded border border-slate-100">
                        {ref.technical_features || ref.summary || 'Details not extracted.'}
                      </p>
                    </div>
                    <div className="flex flex-col h-full">
                      <div className="flex justify-between items-end mb-2">
                        <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Differentiator Notes</h4>
                        {!isEditing && (
                          <Button variant="ghost" size="sm" onClick={() => handleEditOpen(ref)} className="h-6 text-xs px-2 text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50">
                            <Edit3 className="w-3 h-3 mr-1" /> Edit
                          </Button>
                        )}
                      </div>
                      
                      {isEditing ? (
                        <div className="flex-1 flex flex-col gap-2">
                          <Textarea 
                            value={editNotes}
                            onChange={(e) => setEditNotes(e.target.value)}
                            className="text-sm min-h-[80px] bg-indigo-50/30 border-indigo-200 focus-visible:ring-indigo-500"
                            placeholder="How does our invention differ from this reference?"
                          />
                          <div className="flex justify-end">
                            <Button size="sm" onClick={handleSaveNotes} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                              <Save className="w-3.5 h-3.5 mr-1" /> Save
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <p className="text-sm text-indigo-900 leading-relaxed bg-indigo-50/50 p-3 rounded border border-indigo-100 italic flex-1">
                          "{ref.notes || 'No specific notes provided.'}"
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-4 mt-6 pt-4 border-t border-slate-100 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> Pub Date: {ref.publication_date || 'Unknown'}</span>
                    <span>|</span>
                    <span>Source: {ref.source || 'USPTO'}</span>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
