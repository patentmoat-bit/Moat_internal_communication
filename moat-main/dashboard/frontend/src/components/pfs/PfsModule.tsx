"use client";

import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FileSignature, FileText, UploadCloud, FileDown, CheckCircle2, Save, RefreshCw, Wand2, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import dynamic from "next/dynamic";
const RichEditor = dynamic(() => import("@/components/inventions/RichEditor").then(m => m.RichEditor), {
  ssr: false,
  loading: () => <div className="h-[400px] flex items-center justify-center bg-muted/20 animate-pulse rounded-md border border-border" />
});
import { cn } from "@/lib/utils";

// Templates
const TEMPLATES = [
  { id: "utility", name: "Utility Patent Draft", description: "Standard utility patent format with background, summary, and claims." },
  { id: "provisional", name: "Provisional Application", description: "Lightweight provisional cover sheet and technical specification." },
  { id: "disclosure", name: "Invention Disclosure", description: "Internal format for gathering inventor inputs." }
];

export function PfsModule() {
  const [step, setStep] = useState<"upload" | "template" | "generating" | "editor">("upload");
  const [selectedTemplate, setSelectedTemplate] = useState(TEMPLATES[0].id);
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  const startAutoFill = () => {
    setStep("generating");
    setTimeout(() => {
      setContent(`<h1>Patent Filing Strategy (PFS)</h1>
      <p><strong>Status:</strong> Draft</p>
      <h2>1. Background of the Invention</h2>
      <p>The present disclosure relates to edge computing networks and, more specifically, to latency optimization using neural network quantization.</p>
      <h2>2. Summary</h2>
      <p>In accordance with one embodiment, an apparatus comprises a processor and a memory storing instructions that, when executed, dynamically allocate edge resources...</p>
      <h2>3. Claims</h2>
      <p>1. A method for edge optimization comprising...</p>`);
      setStep("editor");
    }, 3000);
  };

  const handleSave = () => {
    setSaving(true);
    setTimeout(() => setSaving(false), 1000);
  };

  const handleExportPDF = async () => {
    if (typeof window !== "undefined") {
      const html2pdf = (await import("html2pdf.js")).default;
      const element = document.createElement("div");
      element.innerHTML = content;
      element.className = "p-8 font-serif text-sm text-black bg-white";
      
      const opt: any = {
        margin:       1,
        filename:     'PFS_Draft_Document.pdf',
        image:        { type: 'jpeg', quality: 0.98 },
        html2canvas:  { scale: 2 },
        jsPDF:        { unit: 'in', format: 'letter', orientation: 'portrait' }
      };
      
      html2pdf().set(opt).from(element).save();
    }
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6 pb-16">
      {/* Header */}
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="border-purple-500/20 bg-purple-500/10 text-purple-700">live</Badge>
            <Badge variant="outline" className="border-[#c9a84c]/25 bg-[#c9a84c]/10 text-[#8a6a1e]">Phase 14</Badge>
          </div>
          <h1 className="mt-3 text-3xl font-bold tracking-tight">PFS Generator</h1>
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted-foreground">
            Automatic Patent Filing Strategy (PFS) generation. Upload references, select a template, and let AI draft your document.
          </p>
        </div>
        {step === "editor" && (
          <div className="flex gap-2">
            <button onClick={handleSave} disabled={saving} className="inline-flex items-center gap-2 rounded-md border border-border bg-background px-4 py-2 text-sm font-semibold hover:bg-muted disabled:opacity-50">
              {saving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} {saving ? "Saving..." : "Save Draft"}
            </button>
            <button onClick={handleExportPDF} className="inline-flex items-center gap-2 rounded-md bg-[#c9a84c] px-4 py-2 text-sm font-semibold text-[#131309] hover:bg-[#b8943d]">
              <FileDown className="h-4 w-4" /> Export PDF
            </button>
          </div>
        )}
      </header>

      {/* Stepper Content */}
      <div className="mt-8">
        <AnimatePresence mode="wait">
          
          {/* Step 1: Upload */}
          {step === "upload" && (
            <motion.div key="upload" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
              <Card className="border-border/70 border-dashed">
                <CardContent className="p-16 flex flex-col items-center justify-center text-center space-y-4">
                  <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                    <UploadCloud className="h-8 w-8" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold">Upload Source Documents</h3>
                    <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">Upload prior art, invention disclosures, or inventor notes to serve as the foundation for the auto-generated PFS.</p>
                  </div>
                  <div className="pt-4">
                    <button onClick={() => setStep("template")} className="inline-flex items-center gap-2 rounded-md bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90">
                      <Plus className="h-4 w-4" /> Select Files & Continue
                    </button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Step 2: Template Selection */}
          {step === "template" && (
            <motion.div key="template" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
              <h2 className="text-lg font-semibold flex items-center gap-2"><FileText className="h-5 w-5 text-[#c9a84c]" /> Select PFS Template</h2>
              <div className="grid gap-4 md:grid-cols-3">
                {TEMPLATES.map(t => (
                  <Card key={t.id} onClick={() => setSelectedTemplate(t.id)} className={cn("cursor-pointer transition-all hover:border-[#c9a84c]/50", selectedTemplate === t.id ? "border-[#c9a84c] bg-[#c9a84c]/5 shadow-sm ring-1 ring-[#c9a84c]/20" : "border-border/70")}>
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <CardTitle className="text-base">{t.name}</CardTitle>
                        {selectedTemplate === t.id && <CheckCircle2 className="h-4 w-4 text-[#c9a84c]" />}
                      </div>
                    </CardHeader>
                    <CardContent>
                      <CardDescription>{t.description}</CardDescription>
                    </CardContent>
                  </Card>
                ))}
              </div>
              <div className="flex justify-end pt-4 border-t border-border/40">
                <button onClick={startAutoFill} className="inline-flex items-center gap-2 rounded-md bg-[#c9a84c] px-6 py-2.5 text-sm font-semibold text-[#131309] hover:bg-[#b8943d]">
                  <Wand2 className="h-4 w-4" /> Generate PFS Draft
                </button>
              </div>
            </motion.div>
          )}

          {/* Step 3: Generating Simulation */}
          {step === "generating" && (
            <motion.div key="generating" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 1.05 }} className="flex flex-col items-center justify-center py-24 space-y-6">
              <div className="relative h-24 w-24">
                <div className="absolute inset-0 rounded-full border-4 border-muted" />
                <div className="absolute inset-0 rounded-full border-4 border-[#c9a84c] border-t-transparent animate-spin" />
                <FileSignature className="absolute inset-0 m-auto h-8 w-8 text-[#c9a84c] animate-pulse" />
              </div>
              <div className="text-center space-y-2">
                <h3 className="text-lg font-bold text-foreground">AI Engine Auto-Filling</h3>
                <p className="text-sm text-muted-foreground animate-pulse">Extracting concepts, mapping to template, and formatting claims...</p>
              </div>
            </motion.div>
          )}

          {/* Step 4: Editor */}
          {step === "editor" && (
            <motion.div key="editor" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
              <div className="rounded-lg border border-border/70 bg-card p-1 shadow-sm">
                <RichEditor content={content} onChange={setContent} />
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  );
}
