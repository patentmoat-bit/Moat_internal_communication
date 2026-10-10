"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  FileText, Clock, Search, Briefcase, Download, Upload, Save, User, CheckCircle, PenTool
} from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";

interface DraftListViewProps {
  status: "my-drafts" | "assigned" | "in-progress" | "under-review" | "completed";
  title: string;
  description: string;
}

export function DraftListView({ status, title, description }: DraftListViewProps) {
  // Mock data based on status
  const [projects, setProjects] = useState<any[]>([]);


  
  
  useEffect(() => {
    if (status === 'my-drafts' || status === 'in-progress' || status === 'under-review' || status === 'completed') {
      const fetchDrafts = async () => {
        try {
          const res = await fetch('/api/patent-drafter/drafts');
          const data = await res.json();
          if (data.drafts) {
            let filtered = data.drafts;
            if (status === 'in-progress') filtered = data.drafts.filter((d: any) => d.status === 'DRAFTING');
            if (status === 'under-review') filtered = data.drafts.filter((d: any) => d.status === 'SUBMITTED_FOR_REVIEW');
            if (status === 'completed') filtered = data.drafts.filter((d: any) => d.status === 'APPROVED');
            
            setProjects(filtered.map((d: any) => ({
              id: d.project_id,
              title: d.title,
              assignedBy: d.reviewer || "Patent Analyst",
              date: new Date(d.last_modified).toLocaleDateString(),
              statusText: d.status,
              type: "Utility",
              progress: d.status === 'APPROVED' ? 100 : d.status === 'SUBMITTED_FOR_REVIEW' ? 85 : 45,
              db_id: d.id,
              due_date: null,
              instructions: null
            })));
          }
        } catch(e) {
          console.error("Failed to fetch drafts", e);
        }
      };
      fetchDrafts();
    }
  }, [status]);


  useEffect(() => {
    if (status === 'assigned') {
      const fetchAssignments = async () => {
        try {
          const res = await fetch('/api/patent-drafter/assignments');
          const data = await res.json();
          if (data.assignments) {
            setProjects(data.assignments.map((a: any) => ({
              id: a.invention_id,
              title: a.title,
              assignedBy: a.assigned_by || a.assigner,
              date: new Date(a.assigned_at || a.created_at || new Date()).toLocaleDateString(),
              statusText: "Assigned",
              type: "Utility",
              progress: 0,
              db_id: a.id, // For tracking the actual assignment record
              due_date: a.due_date,
              instructions: a.instructions
            })));
          }
        } catch(e) {
          console.error("Failed to fetch assignments", e);
        }
      };
      fetchAssignments();
    }
  }, [status]);

  const handleImport = () => {
    // Mock import
    alert("Importing project file...");
  };

  const handleExport = (id: string) => {
    // Mock export
    alert(`Exporting project ${id} to DOCX...`);
  };

  const handleSaveAll = () => {
    alert("Saved all drafting projects.");
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-card p-6 rounded-2xl border border-border/50 shadow-sm">
        <div>
          <h1 className="text-2xl font-black text-foreground tracking-tight flex items-center gap-2">
            {status === "assigned" && <Briefcase className="w-6 h-6 text-blue-500" />}
            {status === "my-drafts" && <FileText className="w-6 h-6 text-purple-500" />}
            {status === "in-progress" && <Clock className="w-6 h-6 text-orange-500" />}
            {status === "under-review" && <Search className="w-6 h-6 text-pink-500" />}
            {status === "completed" && <CheckCircle className="w-6 h-6 text-emerald-500" />}
            {title}
          </h1>
          <p className="text-muted-foreground mt-1">{description}</p>
        </div>

        {/* Action Buttons based on requirements */}
        <div className="flex flex-wrap items-center gap-2">
          {(status === "my-drafts" || status === "completed") && (
            <>
              <Button variant="outline" className="gap-2 font-bold shadow-sm" onClick={handleImport}>
                <Upload className="w-4 h-4" /> Import Project
              </Button>
              <Button variant="outline" className="gap-2 font-bold shadow-sm" onClick={() => handleExport("ALL")}>
                <Download className="w-4 h-4" /> Export List
              </Button>
            </>
          )}
          {status === "my-drafts" && (
            <Button className="gap-2 font-bold shadow-sm bg-blue-600 hover:bg-blue-700 text-white" onClick={handleSaveAll}>
              <Save className="w-4 h-4" /> Save Workspace
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {projects.map((project, idx) => (
          <motion.div
            key={project.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
          >
            <Card className="h-full flex flex-col hover:border-primary/50 transition-colors shadow-sm group">
              <CardContent className="p-6 flex flex-col h-full">
                
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <Link href={`/dashboard/patent-drafter/invention/details?id=${project.id}`} className="hover:underline">
                      <h3 className="text-xl font-bold text-foreground mb-1">{project.title}</h3>
                    </Link>
                    <p className="text-sm text-muted-foreground flex items-center gap-2">
                      <Briefcase className="w-4 h-4" /> Assigned by {project.assignedBy} • {project.date}
                    </p>
                    {project.instructions && (
                      <div className="mt-3 p-3 bg-muted/40 rounded-lg border border-border/50 text-sm italic text-muted-foreground">
                        <span className="font-bold block mb-1">Instructions:</span>
                        {project.instructions}
                      </div>
                    )}
                  </div>
                </div>
                
                <h3 className="text-lg font-bold text-foreground mb-2 line-clamp-2 leading-tight">
                  {project.title}
                </h3>
                
                {(status === "assigned" || status === "under-review") && (
                  <div className="flex items-center gap-1.5 text-sm text-muted-foreground mt-2 mb-4 bg-muted/30 p-2 rounded-md border border-border/50">
                    <User className="w-4 h-4 text-blue-500" />
                    <span className="font-medium">From:</span> {project.assignedBy}
                  </div>
                )}

                <div className="mt-auto pt-4 space-y-4">
                  <div className="flex justify-between items-center text-xs text-muted-foreground">
                    <span>{project.type} Patent</span>
                    <span>{project.date}</span>
                  </div>
                  
                  <div className="w-full bg-muted rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full ${status === 'completed' ? 'bg-emerald-500' : 'bg-blue-600'}`} 
                      style={{ width: `${project.progress}%` }}
                    />
                  </div>

                  <div className="flex gap-2">
                    <Link href={`/dashboard/patent-drafter/editor?id=${project.id}`} className="flex-1">
                      <Button variant={status === "completed" ? "outline" : "default"} className="w-full gap-2 font-bold shadow-sm">
                        {status === "completed" ? <FileText className="w-4 h-4" /> : <PenTool className="w-4 h-4" />}
                        {status === "completed" ? "View Draft" : "Draft Editor"}
                      </Button>
                    </Link>
                    {(status === "my-drafts" || status === "completed") && (
                      <Button variant="outline" size="icon" className="shadow-sm" onClick={() => handleExport(project.id)}>
                        <Download className="w-4 h-4 text-foreground/70" />
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
