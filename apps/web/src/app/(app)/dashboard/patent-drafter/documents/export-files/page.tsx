"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, FileText, FileCode2, FileBox, CheckCircle2, AlertCircle } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";

export default function ExportPage() {
  const searchParams = useSearchParams();
  const rawId = searchParams?.get('id');
  const [inventionId, setInventionId] = useState<string | null>(rawId);
  const [inventionData, setInventionData] = useState<any>(null);
  
  const [exporting, setExporting] = useState<string | null>(null);
  const [exported, setExported] = useState<string[]>([]);

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
          if (project) setInventionData(project);
        }
      } catch (err) {
        console.error(err);
      }
    };
    init();
  }, [rawId]);

  const handleExport = async (format: string) => {
    if (!inventionId) return;
    setExporting(format);
    // Simulate generation time
    await new Promise(r => setTimeout(r, 2000));
    setExported([...exported, format]);
    setExporting(null);
  };

  const formats = [
    { 
      id: "docx", 
      title: "Microsoft Word (.docx)", 
      desc: "Standard format for attorney review and track-changes collaboration.",
      icon: FileText,
      color: "text-blue-600",
      bg: "bg-blue-50",
      border: "border-blue-200"
    },
    { 
      id: "pdf", 
      title: "Adobe PDF (.pdf)", 
      desc: "Finalized read-only document preserving all figures and formatting.",
      icon: FileBox,
      color: "text-red-600",
      bg: "bg-red-50",
      border: "border-red-200"
    },
    { 
      id: "xml", 
      title: "USPTO EFS-Web (.xml)", 
      desc: "Machine-readable USPTO compliant XML ready for electronic filing.",
      icon: FileCode2,
      color: "text-emerald-600",
      bg: "bg-emerald-50",
      border: "border-emerald-200"
    }
  ];

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      <div>
        <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Download className="w-6 h-6 text-indigo-500" /> Export Documents
        </h2>
        <p className="text-sm text-muted-foreground mt-1">Generate standard patent filing files for {inventionId ? `Project ${inventionId}` : 'your active draft'}.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {formats.map((format, idx) => {
          const isExporting = exporting === format.id;
          const isDone = exported.includes(format.id);
          
          return (
            <motion.div key={format.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.1 }}>
              <Card className={`border-2 ${format.border} shadow-sm overflow-hidden h-full flex flex-col relative`}>
                {isDone && (
                  <div className="absolute top-3 right-3">
                    <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                  </div>
                )}
                <CardContent className="p-6 flex flex-col items-center text-center flex-1 space-y-4">
                  <div className={`w-16 h-16 rounded-2xl ${format.bg} flex items-center justify-center`}>
                    <format.icon className={`w-8 h-8 ${format.color}`} />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-800">{format.title}</h3>
                    <p className="text-xs text-slate-500 mt-2 leading-relaxed">{format.desc}</p>
                  </div>
                  
                  <div className="mt-auto pt-4 w-full">
                    <Button 
                      onClick={() => handleExport(format.id)}
                      disabled={isExporting || isDone || !inventionId}
                      className={`w-full ${isDone ? 'bg-slate-100 text-slate-600 hover:bg-slate-200' : 'bg-slate-800 text-white hover:bg-slate-900'}`}
                    >
                      {isExporting ? (
                        <div className="flex items-center">
                          <div className="w-4 h-4 border-2 border-slate-400 border-t-white rounded-full animate-spin mr-2"></div>
                          Generating...
                        </div>
                      ) : isDone ? (
                        <>Download Again</>
                      ) : (
                        <><Download className="w-4 h-4 mr-2" /> Generate {format.id.toUpperCase()}</>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )
        })}
      </div>
      
      {!inventionId && (
        <div className="p-4 bg-amber-50 border border-amber-200 text-amber-800 rounded-lg flex gap-3 text-sm">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <p>You do not have any active invention projects assigned. You cannot generate export files without an active draft.</p>
        </div>
      )}
    </div>
  );
}
