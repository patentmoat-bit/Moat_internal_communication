"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileText, Download, Eye, ExternalLink, Calendar, User, UploadCloud, Edit3, Save } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useActiveRole } from "@/components/auth/role-context";
import { Textarea } from "@/components/ui/textarea";

export default function DisclosuresPage() {
  const { currentUser } = useActiveRole();
  const searchParams = useSearchParams();
  const rawId = searchParams?.get('id');
  
  const [inventionId, setInventionId] = useState<string | null>(rawId);
  const [inventionData, setInventionData] = useState<any>(null);
  const [disclosures, setDisclosures] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Edit State
  const [isEditing, setIsEditing] = useState(false);
  const [editNotes, setEditNotes] = useState("");
  const [uploading, setUploading] = useState(false);

  const fetchDocs = async (currentId: string) => {
    try {
      const docRes = await fetch(`/api/patent-drafter/documents?inventionId=${currentId}`);
      const docData = await docRes.json();
      if (docData.success && docData.documents.disclosures) {
        setDisclosures(docData.documents.disclosures);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    const init = async () => {
      try {
        let currentId = rawId;
        const asgRes = await fetch('/api/patent-drafter/assignments');
        const asgData = await asgRes.json();
        
        if (!currentId && asgData.assignments && asgData.assignments.length > 0) {
          currentId = asgData.assignments[0].invention_id;
        }
        
        if (currentId) {
          setInventionId(currentId);
          const project = asgData.assignments?.find((a: any) => a.invention_id === currentId);
          if (project) {
            setInventionData(project);
            setEditNotes(project.instructions || "No core metadata found.");
          }
          await fetchDocs(currentId);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [rawId]);

  const handleSaveMetadata = async () => {
    setIsEditing(false);
    // In a real app, this would PUT to /api/patent-drafter/assignments to update instructions
  };

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
          type: 'disclosures',
          payload: {
            filename: `Inventor_Whitepaper_v${disclosures.length + 1}.pdf`,
            uploader: currentUser.name,
            size: '2.4 MB'
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

  if (loading) return <div className="p-12 text-center text-muted-foreground animate-pulse">Loading Disclosures...</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
            <FileText className="w-6 h-6 text-blue-500" /> Invention Disclosures: {inventionId || 'None'}
          </h2>
          <p className="text-sm text-muted-foreground mt-1">Review the original invention submission, edit metadata, and attach technical specs.</p>
        </div>
        <div className="flex gap-2">
          {isEditing ? (
            <Button onClick={handleSaveMetadata} className="bg-emerald-600 hover:bg-emerald-700 text-white">
              <Save className="w-4 h-4 mr-2" /> Save Metadata
            </Button>
          ) : (
            <Button onClick={() => setIsEditing(true)} variant="outline" className="bg-white">
              <Edit3 className="w-4 h-4 mr-2" /> Edit Metadata
            </Button>
          )}
          <Button onClick={handleMockUpload} disabled={uploading} className="bg-blue-600 hover:bg-blue-700 text-white">
            <UploadCloud className="w-4 h-4 mr-2" /> {uploading ? 'Uploading...' : 'Upload Document'}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <h3 className="text-sm font-bold text-slate-700 border-b border-border/50 pb-2">Core Invention Disclosure</h3>
          <Card className="border-border/50 shadow-sm bg-white dark:bg-card">
            <CardContent className="p-6 space-y-4">
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="font-semibold">{inventionData?.title || "Unknown Project"}</h4>
                  <p className="text-xs text-muted-foreground mt-1">Assigned by: {inventionData?.assigned_by || "System"}</p>
                </div>
                <Badge variant="secondary" className="bg-blue-50 text-blue-700">{inventionData?.status || "IN_PROGRESS"}</Badge>
              </div>
              <div className="pt-4 border-t border-border/50">
                <h5 className="text-xs font-bold text-slate-500 uppercase mb-2">Description / Notes</h5>
                {isEditing ? (
                  <Textarea 
                    value={editNotes} 
                    onChange={(e) => setEditNotes(e.target.value)} 
                    className="min-h-[150px] text-sm bg-slate-50 border-slate-200"
                  />
                ) : (
                  <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">
                    {editNotes}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
        
        <div className="space-y-4">
          <h3 className="text-sm font-bold text-slate-700 border-b border-border/50 pb-2">Attached Source Files</h3>
          <Card className="border-border/50 shadow-sm bg-white dark:bg-card">
            <CardContent className="p-0 divide-y divide-border/50">
              {disclosures.length === 0 ? (
                <div className="p-8 flex flex-col items-center justify-center text-center">
                  <FileText className="w-8 h-8 text-slate-300 mb-2 opacity-50" />
                  <p className="text-sm text-muted-foreground">No source documents attached.</p>
                </div>
              ) : (
                disclosures.map((doc: any, i: number) => (
                  <div key={i} className="p-4 hover:bg-slate-50 transition-colors group">
                    <div className="flex items-start justify-between">
                      <div className="flex gap-3">
                        <div className="p-2 bg-blue-50 rounded text-blue-600 shrink-0">
                          <FileText className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-slate-800 line-clamp-1">{doc.filename}</p>
                          <div className="flex items-center gap-3 mt-1 text-[10px] text-muted-foreground">
                            <span className="flex items-center"><User className="w-3 h-3 mr-1"/> {doc.uploader}</span>
                            <span className="flex items-center"><Calendar className="w-3 h-3 mr-1"/> {new Date(doc.created_at).toLocaleDateString()}</span>
                          </div>
                        </div>
                      </div>
                      <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Download className="w-4 h-4 text-slate-500" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
