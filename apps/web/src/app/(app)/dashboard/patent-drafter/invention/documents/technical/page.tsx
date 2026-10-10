"use client";

import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { 
  Folder, FileText, Cpu, Upload, Filter, Search, MoreVertical,
  ChevronLeft, ChevronRight, Download, Plus, Edit3, Trash2
} from "lucide-react";
import { useSearchParams } from "next/navigation";

export default function DocumentsFigma() {
  const searchParams = useSearchParams();
  const isNew = searchParams?.get('id') === 'NEW_PROJECT';

  const [isEditing, setIsEditing] = useState(isNew);
  
  // Empty default state
  const [formData, setFormData] = useState({
    title: isNew ? "Untitled Invention Draft" : "Smart Energy Management System",
    referenceNo: isNew ? "DRAFT-001" : "INN-0012",
    documents: []
  });

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      const ext = file.name.split('.').pop()?.toUpperCase() || 'FILE';
      setFormData({
        ...formData,
        documents: [...formData.documents, {
          name: file.name,
          type: ext,
          category: "Technical",
          uploadedBy: "Current User",
          uploadedOn: new Date().toLocaleDateString(),
          size: (file.size / 1024 / 1024).toFixed(1) + " MB"
        }]
      });
      e.target.value = ''; // reset input
    }
  };

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
          <input type="file" id="multi-file-upload" className="hidden" multiple onChange={handleUpload} />
          <Button variant="outline" className="font-bold shadow-sm text-xs sm:text-sm" onClick={() => document.getElementById('multi-file-upload')?.click()}>
            <Upload className="w-4 h-4 mr-2" /> Upload
          </Button>
          <Button variant="outline" className="font-bold shadow-sm text-xs sm:text-sm" onClick={() => {
            const blob = new Blob([JSON.stringify(formData, null, 2)], { type: 'application/json' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'Documents_Export.json';
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
              <Edit3 className="w-4 h-4 mr-2 hidden sm:block" /> Edit Invention
            </Button>
          )}

          <Button className="font-bold shadow-md bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm" onClick={() => {
            const existing = JSON.parse(localStorage.getItem('draft_invention_data') || '{}');
            localStorage.setItem('draft_invention_data', JSON.stringify({...existing, ...formData}));
            window.location.href='/dashboard/patent-drafter/editor?id=' + (isNew ? 'NEW' : 'INN-0012');
          }}>
            Create Draft
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        
        {/* Left Column: Document List */}
        <div className="lg:col-span-3 space-y-6">
          <Card className="shadow-sm border-border/40 overflow-hidden">
            <CardContent className="p-0">
              <div className="p-4 bg-muted/30 border-b border-border/50 flex flex-col sm:flex-row justify-between gap-4">
                <div className="relative flex-1 max-w-sm">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input className="pl-9 bg-background border-border/60 shadow-sm" placeholder="Search documents..." />
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" className="bg-background shadow-sm">
                    <Filter className="w-4 h-4 mr-2" /> All Types
                  </Button>
                  {isEditing && (
                    <Button className="font-bold shadow-sm bg-blue-600 text-white hover:bg-blue-700" onClick={() => document.getElementById('multi-file-upload')?.click()}>
                      <Upload className="w-4 h-4 mr-2" /> Upload Document
                    </Button>
                  )}
                </div>
              </div>

              <div className="p-0 overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs text-muted-foreground uppercase bg-muted/10 border-b border-border/50 font-bold">
                    <tr>
                      <th className="px-6 py-4">Name</th>
                      <th className="px-6 py-4">Type</th>
                      <th className="px-6 py-4">Category</th>
                      <th className="px-6 py-4">Uploaded By</th>
                      <th className="px-6 py-4">Uploaded On</th>
                      <th className="px-6 py-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {formData.documents.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-6 py-8 text-center text-muted-foreground italic">
                          No documents have been uploaded yet.
                        </td>
                      </tr>
                    ) : (
                      formData.documents.map((doc, idx) => (
                        <tr key={idx} className="border-b border-border/30 hover:bg-muted/10">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className={`p-2 rounded-lg text-white font-bold text-[10px] w-8 h-8 flex items-center justify-center
                                ${doc.type === 'PDF' ? 'bg-red-500' : doc.type === 'DOCX' ? 'bg-blue-500' : doc.type === 'ZIP' ? 'bg-amber-500' : 'bg-emerald-500'}`}>
                                {doc.type}
                              </div>
                              <div>
                                <p className="font-bold text-foreground text-blue-600 dark:text-blue-400 hover:underline cursor-pointer">{doc.name}</p>
                                <p className="text-xs text-muted-foreground">{doc.size}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 font-medium">{doc.type}</td>
                          <td className="px-6 py-4">
                            {isEditing ? (
                              <select className="border rounded p-1 text-xs" value={doc.category} onChange={e => {
                                const newDocs = [...formData.documents];
                                newDocs[idx].category = e.target.value;
                                setFormData({...formData, documents: newDocs});
                              }}>
                                <option>Drafts</option><option>Technical</option><option>Drawings</option><option>Research</option>
                              </select>
                            ) : (
                              <Badge variant="outline" className="text-blue-700 bg-blue-50 border-blue-200">{doc.category}</Badge>
                            )}
                          </td>
                          <td className="px-6 py-4 text-muted-foreground">{doc.uploadedBy}</td>
                          <td className="px-6 py-4 text-muted-foreground">{doc.uploadedOn}</td>
                          <td className="px-6 py-4 text-right">
                            {isEditing ? (
                              <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-700" onClick={() => {
                                setFormData({...formData, documents: formData.documents.filter((_, i) => i !== idx)});
                              }}>
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            ) : (
                              <Button variant="outline" size="sm" className="font-semibold text-xs text-blue-600 border-blue-200">View</Button>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Folders */}
        <div className="space-y-6">
          <Card className="shadow-sm border-border/40 overflow-hidden">
            <CardHeader className="bg-muted/30 border-b border-border/40 py-4">
              <CardTitle className="text-sm font-black flex items-center gap-2 text-foreground">
                <Folder className="w-4 h-4 text-blue-600" /> Document Categories
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-border/50">
                {['All Documents', 'Drafts', 'Technical', 'Drawings', 'Research', 'Claims'].map((folder, i) => (
                  <div key={i} className={`p-4 flex justify-between items-center cursor-pointer transition-colors ${i===0 ? 'bg-blue-50/50 dark:bg-blue-900/10 border-l-2 border-l-blue-600' : 'hover:bg-muted/30'}`}>
                    <div className={`flex items-center gap-3 ${i===0 ? 'text-blue-700 dark:text-blue-400 font-bold' : 'text-foreground font-medium'}`}>
                      <Folder className={`w-4 h-4 ${i===0 ? 'text-blue-600' : 'text-muted-foreground'}`} /> {folder}
                    </div>
                    <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-xs font-bold text-muted-foreground">
                      {i === 0 ? formData.documents.length : formData.documents.filter(d => d.category === folder).length}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
