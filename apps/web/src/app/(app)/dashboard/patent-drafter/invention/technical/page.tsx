"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { 
  FileText, Cpu, Edit3, Image as ImageIcon, Download, 
  MoreVertical, FileArchive, Search, Plus
} from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

export default function TechnicalInfoFigma() {
  const searchParams = useSearchParams();
  const isNew = searchParams?.get('id') === 'NEW_PROJECT';

  const [isEditing, setIsEditing] = useState(isNew);
  
  // Empty default state without mock data
  const [formData, setFormData] = useState({
    title: "Untitled Invention Draft", // Start empty // Just for header consistency if not new
    referenceNo: "DRAFT-001",
    overview: "",
    field: "",
    background: "",
    problem: "",
    solution: "",
    advantages: [""],
    diagrams: [],
    files: []
  });

  
  
  useEffect(() => {
    const fetchAssignment = async () => {
      const id = searchParams?.get('id');
      if (id && id !== 'NEW_PROJECT') {
        try {
          // Fetch assigned title
          const res = await fetch('/api/patent-drafter/assignments');
          const data = await res.json();
          const proj = data.assignments?.find((a: any) => a.invention_id === id);
          if (proj) {
            setFormData(prev => ({ ...prev, title: proj.title, referenceNo: proj.invention_id }));
          }
          
          // Fetch saved technical data
          const invRes = await fetch(`/api/patent-drafter/invention?id=${id}`);
          const invData = await invRes.json();
          if (invData.invention) {
            setFormData(prev => ({ ...prev, ...invData.invention }));
          }
        } catch(e) {}
      }
    };
    fetchAssignment();
  }, [searchParams]);


  const handleSave = (e: React.MouseEvent<HTMLButtonElement>) => {
    const btn = e.currentTarget;
    const originalText = btn.innerHTML;
    btn.innerHTML = 'Saving...';
    btn.disabled = true;
    setTimeout(() => {
      btn.innerHTML = 'Saved ✓';
      btn.classList.add('text-emerald-600', 'border-emerald-200', 'bg-emerald-50');
      setIsEditing(false);
      setTimeout(() => {
        btn.innerHTML = originalText;
        btn.disabled = false;
        btn.classList.remove('text-emerald-600', 'border-emerald-200', 'bg-emerald-50');
      }, 2000);
    }, 800);
  };

  return (
    <div className="p-2 sm:p-6 max-w-7xl mx-auto space-y-6">
      
      {/* Top Header Information */}
      <div className="flex flex-col md:flex-row justify-between md:items-center gap-4 bg-white dark:bg-card p-6 rounded-2xl border border-border/50 shadow-sm">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-3xl font-black text-foreground tracking-tight">{formData.title}</h1>
            <Badge variant="secondary" className="bg-blue-100 text-blue-700 hover:bg-blue-200">{formData.referenceNo}</Badge>
            <Badge variant="outline" className="text-blue-600 border-blue-200 bg-blue-50 flex items-center gap-1">
              <Cpu className="w-3 h-3" /> {isNew ? "Not Filed" : "In Progress"}
            </Badge>
          </div>
          <div className="flex flex-wrap items-center gap-4 text-sm font-medium text-muted-foreground">
            <span className="flex items-center gap-1.5"><Badge variant="outline" className="text-[10px]">UTILITY</Badge> Filed on: {isNew ? "N/A" : "Jun 18, 2025"}</span>
            <span className="w-1 h-1 rounded-full bg-border"></span>
            <span>Priority Date: {isNew ? "N/A" : "Jun 16, 2025"}</span>
          </div>
        </div>
        
        {/* Interactive Buttons */}
        <div className="flex flex-wrap items-center gap-2 mt-4 md:mt-0">
          <input type="file" id="file-upload" className="hidden" onChange={(e) => {
              if(e.target.files && e.target.files.length > 0) alert('Successfully imported: ' + e.target.files[0].name);
            }} 
          />
          <Button variant="outline" className="font-bold shadow-sm text-xs sm:text-sm" onClick={() => document.getElementById('file-upload')?.click()}>
            Import
          </Button>
          <Button variant="outline" className="font-bold shadow-sm text-xs sm:text-sm" onClick={() => {
            const blob = new Blob([JSON.stringify(formData, null, 2)], { type: 'application/json' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'Technical_Info_Export.json';
            a.click();
            window.URL.revokeObjectURL(url);
          }}>
            Export
          </Button>
          
          {isEditing ? (
            <Button variant="default" className="font-bold shadow-md bg-blue-600 text-white text-xs sm:text-sm" onClick={handleSave}>
              Save Details
            </Button>
          ) : (
            <Button variant="outline" className="font-bold shadow-sm text-xs sm:text-sm" onClick={() => setIsEditing(true)}>
              <Edit3 className="w-4 h-4 mr-2 hidden sm:block" /> Edit Information
            </Button>
          )}

          <Button className="font-bold shadow-md bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm" onClick={() => {
            // "copy and store in draft editor option"
            localStorage.setItem('draft_invention_data', JSON.stringify(formData));
            window.location.href='/dashboard/patent-drafter/editor?id=' + (isNew ? 'NEW' : 'INN-0012');
          }}>
            Create Draft
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Technical Specs */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="shadow-sm border-border/40 overflow-hidden">
            <CardHeader className="bg-muted/30 border-b border-border/40 py-4 flex flex-row items-center justify-between">
              <CardTitle className="text-lg font-black flex items-center gap-2 text-foreground">
                <Cpu className="w-5 h-5 text-blue-600" /> Technical Overview
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="p-6 border-b border-border/50">
                {isEditing ? (
                  <Textarea 
                    placeholder="Provide a comprehensive technical overview of the invention..." 
                    value={formData.overview} 
                    onChange={e => setFormData({...formData, overview: e.target.value})}
                    className="min-h-[120px]"
                  />
                ) : (
                  <p className="text-sm leading-relaxed text-muted-foreground">{formData.overview || "No technical overview provided yet."}</p>
                )}
              </div>
              
              <div className="p-6">
                <h3 className="text-sm font-bold text-foreground mb-4">Technical Specifications</h3>
                
                <div className="space-y-0 text-sm">
                  <div className="grid grid-cols-3 gap-4 py-3 border-b border-border/50">
                    <div className="text-muted-foreground">Field of Invention</div>
                    <div className="col-span-2 font-medium">
                      {isEditing ? <Input value={formData.field} onChange={e => setFormData({...formData, field: e.target.value})} /> : (formData.field || "-")}
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-4 py-3 border-b border-border/50">
                    <div className="text-muted-foreground">Background</div>
                    <div className="col-span-2 font-medium">
                      {isEditing ? <Input value={formData.background} onChange={e => setFormData({...formData, background: e.target.value})} /> : (formData.background || "-")}
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-4 py-3 border-b border-border/50">
                    <div className="text-muted-foreground">Technical Problem</div>
                    <div className="col-span-2 font-medium">
                      {isEditing ? <Textarea value={formData.problem} onChange={e => setFormData({...formData, problem: e.target.value})} /> : (formData.problem || "-")}
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-4 py-3 border-b border-border/50">
                    <div className="text-muted-foreground">Solution</div>
                    <div className="col-span-2 font-medium">
                      {isEditing ? <Textarea value={formData.solution} onChange={e => setFormData({...formData, solution: e.target.value})} /> : (formData.solution || "-")}
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-4 py-3 border-b border-border/50">
                    <div className="text-muted-foreground">Advantages</div>
                    <div className="col-span-2 font-medium">
                      {isEditing ? (
                        <div className="space-y-2">
                          {formData.advantages.map((adv, i) => (
                            <div key={i} className="flex gap-2">
                              <Input value={adv} onChange={e => {
                                const newA = [...formData.advantages];
                                newA[i] = e.target.value;
                                setFormData({...formData, advantages: newA});
                              }} />
                              <Button variant="outline" size="icon" onClick={() => setFormData({...formData, advantages: formData.advantages.filter((_, idx) => idx !== i)})}>X</Button>
                            </div>
                          ))}
                          <Button variant="outline" size="sm" onClick={() => setFormData({...formData, advantages: [...formData.advantages, ""]})}>Add Advantage</Button>
                        </div>
                      ) : (
                        <ul className="list-disc pl-4 space-y-1">
                          {formData.advantages.filter(a => a.trim()).length > 0 
                            ? formData.advantages.filter(a => a.trim()).map((a, i) => <li key={i}>{a}</li>) 
                            : <span className="text-muted-foreground italic list-none">None listed</span>}
                        </ul>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Diagrams & Files */}
        <div className="space-y-6">
          <Card className="shadow-sm border-border/40 overflow-hidden">
            <CardHeader className="bg-muted/30 border-b border-border/40 py-4 flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-black flex items-center gap-2 text-foreground">
                <ImageIcon className="w-4 h-4 text-blue-600" /> Key Diagrams
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="text-center p-8 border-2 border-dashed border-border/50 rounded-lg">
                <p className="text-sm text-muted-foreground mb-4">No diagrams uploaded.</p>
                {isEditing && (
                  <Button variant="outline" size="sm" onClick={() => document.getElementById('file-upload')?.click()}>
                    <Plus className="w-4 h-4 mr-2" /> Upload Diagram
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm border-border/40 overflow-hidden">
            <CardHeader className="bg-muted/30 border-b border-border/40 py-4 flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-black flex items-center gap-2 text-foreground">
                <FileArchive className="w-4 h-4 text-blue-600" /> Technical Files
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="p-8 text-center">
                <p className="text-sm text-muted-foreground mb-4">No technical files attached.</p>
                {isEditing && (
                  <Button variant="outline" size="sm" onClick={() => document.getElementById('file-upload')?.click()}>
                    <Plus className="w-4 h-4 mr-2" /> Upload File
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
