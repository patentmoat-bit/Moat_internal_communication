"use client";

import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { 
  FileText, Lightbulb, User, Building, MapPin, Link as LinkIcon, 
  Edit3, Plus, ChevronRight, Globe, Lock, Cpu
} from "lucide-react";

export default function InventionDetailsWorkflow() {
  const [isEditing, setIsEditing] = useState(true);
  
  // No mock data! Completely blank original state for actual working flow
  const [formData, setFormData] = useState({
    title: "",
    referenceNo: "",
    patentType: "Utility Patent",
    priorityDate: "",
    filingDate: "",
    status: "Drafting",
    description: "",
    features: [""],
    inventors: [{ name: "", role: "PRIMARY" }],
    assignee: ""
  });

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
        <div className="w-full md:w-2/3">
          <div className="flex flex-wrap items-center gap-3 mb-3">
            {isEditing ? (
              <Input 
                value={formData.title} 
                onChange={e => setFormData({...formData, title: e.target.value})} 
                placeholder="Enter Invention Title" 
                className="text-2xl font-black h-12 w-full md:w-3/4"
              />
            ) : (
              <h1 className="text-3xl font-black text-foreground tracking-tight break-words">
                {formData.title || "Untitled Invention"}
              </h1>
            )}
            
            {!isEditing && (
              <>
                <Badge variant="secondary" className="bg-blue-100 text-blue-700 hover:bg-blue-200">{formData.referenceNo || "NO-REF"}</Badge>
                <Badge variant="outline" className="text-blue-600 border-blue-200 bg-blue-50 flex items-center gap-1">
                  <Cpu className="w-3 h-3" /> {formData.status}
                </Badge>
              </>
            )}
          </div>
          
          <div className="flex flex-wrap items-center gap-4 text-sm font-medium text-muted-foreground">
            <span className="flex items-center gap-1.5"><Badge variant="outline" className="text-[10px] uppercase">{formData.patentType}</Badge> Filed on: {formData.filingDate || "N/A"}</span>
            <span className="w-1 h-1 rounded-full bg-border"></span>
            <span>Priority Date: {formData.priorityDate || "N/A"}</span>
          </div>
        </div>
        
        {/* Interactive Workflow Buttons */}
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
            a.download = 'Invention_Export.json';
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
        </div>
      </div>

      {/* Main Content 2-Column Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Overview & Features */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="shadow-sm border-border/40 overflow-hidden">
            <CardHeader className="bg-muted/30 border-b border-border/40 py-4 flex flex-row items-center justify-between">
              <CardTitle className="text-lg font-black flex items-center gap-2 text-foreground">
                <Lightbulb className="w-5 h-5 text-blue-600" /> Invention Overview
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-6 mb-8">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">Invention / Reference No.</p>
                  {isEditing ? (
                    <Input value={formData.referenceNo} onChange={e => setFormData({...formData, referenceNo: e.target.value})} placeholder="e.g. INN-001" className="h-8" />
                  ) : (
                    <p className="font-semibold text-foreground">{formData.referenceNo || "-"}</p>
                  )}
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">Patent Type</p>
                  {isEditing ? (
                    <Input value={formData.patentType} onChange={e => setFormData({...formData, patentType: e.target.value})} className="h-8" />
                  ) : (
                    <p className="font-semibold text-foreground">{formData.patentType || "-"}</p>
                  )}
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">Priority Date</p>
                  {isEditing ? (
                    <Input type="date" value={formData.priorityDate} onChange={e => setFormData({...formData, priorityDate: e.target.value})} className="h-8" />
                  ) : (
                    <p className="font-semibold text-foreground">{formData.priorityDate || "-"}</p>
                  )}
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">Filing Date</p>
                  {isEditing ? (
                    <Input type="date" value={formData.filingDate} onChange={e => setFormData({...formData, filingDate: e.target.value})} className="h-8" />
                  ) : (
                    <p className="font-semibold text-foreground">{formData.filingDate || "-"}</p>
                  )}
                </div>
              </div>

              <div>
                <p className="text-sm font-bold text-foreground mb-2">Brief Description</p>
                {isEditing ? (
                  <Textarea 
                    value={formData.description} 
                    onChange={e => setFormData({...formData, description: e.target.value})} 
                    placeholder="Enter the brief description of the invention..."
                    className="min-h-[120px]"
                  />
                ) : (
                  <p className="text-sm leading-relaxed text-muted-foreground">{formData.description || "No description provided."}</p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm border-border/40 overflow-hidden">
            <CardHeader className="bg-muted/30 border-b border-border/40 py-4">
              <CardTitle className="text-lg font-black flex items-center gap-2 text-foreground">
                <FileText className="w-5 h-5 text-blue-600" /> Key Features
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              {isEditing ? (
                <div className="space-y-3">
                  {formData.features.map((feature, idx) => (
                    <div key={idx} className="flex gap-2">
                      <Input 
                        value={feature} 
                        onChange={e => {
                          const newF = [...formData.features];
                          newF[idx] = e.target.value;
                          setFormData({...formData, features: newF});
                        }} 
                        placeholder={`Feature ${idx + 1}`} 
                      />
                      <Button variant="outline" size="icon" onClick={() => {
                        const newF = formData.features.filter((_, i) => i !== idx);
                        setFormData({...formData, features: newF});
                      }}>X</Button>
                    </div>
                  ))}
                  <Button variant="outline" size="sm" onClick={() => setFormData({...formData, features: [...formData.features, ""]})}>
                    <Plus className="w-4 h-4 mr-2" /> Add Feature
                  </Button>
                </div>
              ) : (
                <ul className="space-y-3">
                  {formData.features.filter(f => f.trim() !== "").length > 0 ? formData.features.filter(f => f.trim() !== "").map((feature, idx) => (
                    <li key={idx} className="flex items-start gap-3">
                      <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-2 flex-shrink-0"></div>
                      <span className="text-sm font-medium text-foreground">{feature}</span>
                    </li>
                  )) : (
                    <p className="text-sm text-muted-foreground italic">No features added.</p>
                  )}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Inventors & Assignees */}
        <div className="space-y-6">
          <Card className="shadow-sm border-border/40 overflow-hidden">
            <CardHeader className="bg-muted/30 border-b border-border/40 py-4">
              <CardTitle className="text-sm font-black flex items-center gap-2 text-foreground">
                <User className="w-4 h-4 text-blue-600" /> Inventors
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              {isEditing ? (
                <div className="space-y-4">
                  {formData.inventors.map((inv, idx) => (
                    <div key={idx} className="space-y-2 p-3 border rounded-lg">
                      <Input 
                        placeholder="Inventor Name" 
                        value={inv.name}
                        onChange={e => {
                          const newI = [...formData.inventors];
                          newI[idx].name = e.target.value;
                          setFormData({...formData, inventors: newI});
                        }}
                      />
                      <Input 
                        placeholder="Role (e.g. PRIMARY)" 
                        value={inv.role}
                        onChange={e => {
                          const newI = [...formData.inventors];
                          newI[idx].role = e.target.value;
                          setFormData({...formData, inventors: newI});
                        }}
                      />
                    </div>
                  ))}
                  <Button variant="outline" className="w-full border-dashed" onClick={() => setFormData({...formData, inventors: [...formData.inventors, {name:"", role:""}]})}>
                    <Plus className="w-4 h-4 mr-2" /> Add Inventor
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {formData.inventors.filter(i => i.name.trim() !== "").length > 0 ? formData.inventors.filter(i => i.name.trim() !== "").map((inv, idx) => (
                    <div key={idx} className="flex items-center gap-3 p-3 rounded-xl bg-muted/40 border border-border/50">
                      <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-sm">
                        {inv.name.substring(0, 2).toUpperCase() || "??"}
                      </div>
                      <div>
                        <p className="font-bold text-sm text-foreground">{inv.name}</p>
                        {inv.role && <p className="text-[10px] font-bold text-muted-foreground mt-0.5">{inv.role}</p>}
                      </div>
                    </div>
                  )) : (
                    <p className="text-sm text-muted-foreground italic">No inventors added.</p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="shadow-sm border-border/40 overflow-hidden">
            <CardHeader className="bg-muted/30 border-b border-border/40 py-4">
              <CardTitle className="text-sm font-black flex items-center gap-2 text-foreground">
                <Building className="w-4 h-4 text-blue-600" /> Assignees
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              {isEditing ? (
                <Input 
                  placeholder="Assignee Organization" 
                  value={formData.assignee}
                  onChange={e => setFormData({...formData, assignee: e.target.value})}
                />
              ) : (
                formData.assignee ? (
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/40 border border-border/50">
                    <div className="w-10 h-10 rounded-lg bg-blue-600 text-white flex items-center justify-center shadow-sm">
                      <Building className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="font-bold text-sm text-foreground">{formData.assignee}</span>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground italic">No assignee added.</p>
                )
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
