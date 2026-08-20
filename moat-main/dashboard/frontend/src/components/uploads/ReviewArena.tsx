"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { ChevronLeft, FileText, Download, CheckCircle2, XCircle, Clock, MessageSquare, Send, AtSign, History, AlertCircle, FileCheck, ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { cn } from "@/lib/utils";


interface ReviewArenaProps {
  documentId: string;
}

export function ReviewArena({ documentId }: ReviewArenaProps) {
  const [doc, setDoc] = useState({ 
    id: documentId, 
    name: "Document_Preview.pdf", 
    size: "2.4 MB", 
    type: "PDF", 
    status: "Under Review", 
    uploader: "Alice (Analyst)", 
    date: "2 hours ago", 
    project: "Quantum Encryption (US-102)", 
    versions: 2, 
    comments: 3 
  });
  const [status, setStatus] = useState(doc.status);
  const [comments, setComments] = useState([
    { id: 1, author: "Alice (Analyst)", role: "analyst", text: "Uploaded initial draft for review. I highlighted the edge computing claims.", time: "2 hours ago", isSystem: false },
    { id: 2, author: "System", role: "system", text: "Document state changed to Under Review", time: "1 hour ago", isSystem: true },
  ]);
  const [newComment, setNewComment] = useState("");

  const handleSend = () => {
    if (!newComment.trim()) return;
    setComments([...comments, { id: Date.now(), author: "CEO", role: "ceo", text: newComment, time: "Just now", isSystem: false }]);
    setNewComment("");
  };

  const handleStatusChange = (newStatus: string) => {
    setStatus(newStatus);
    setComments([...comments, { id: Date.now(), author: "System", role: "system", text: `Document state changed to ${newStatus} by CEO`, time: "Just now", isSystem: true }]);
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6 pb-16">
      {/* Header & Breadcrumbs */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/dashboard/uploads" className="hover:text-foreground transition-colors flex items-center gap-1">
          <ChevronLeft className="h-4 w-4" /> Back to Uploads
        </Link>
        <span>/</span>
        <span className="text-foreground font-medium">{doc.name}</span>
      </div>

      <header className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight">{doc.name}</h1>
            <Badge variant="outline" className={cn(
              "font-medium px-2.5 py-0.5",
              status === "Approved" ? "border-emerald-500/30 text-emerald-600 bg-emerald-500/5" :
              status === "Under Review" ? "border-blue-500/30 text-blue-600 bg-blue-500/5" :
              status === "Revision Requested" ? "border-amber-500/30 text-amber-600 bg-amber-500/5" :
              status === "Rejected" ? "border-rose-500/30 text-rose-600 bg-rose-500/5" :
              "border-border/60 text-muted-foreground"
            )}>
              {status}
            </Badge>
          </div>
          <p className="mt-2 text-sm text-muted-foreground flex items-center gap-4">
            <span>Uploaded by <strong className="text-foreground">{doc.uploader}</strong></span>
            <span>Project: <strong className="text-foreground">{doc.project}</strong></span>
            <span className="flex items-center gap-1"><History className="h-3.5 w-3.5" /> Version {doc.versions}</span>
          </p>
        </div>

        {/* Workflow Action Buttons */}
        <div className="flex flex-wrap gap-2">
          {status !== "Approved" && (
            <button onClick={() => handleStatusChange("Approved")} className="inline-flex items-center gap-2 rounded-md bg-emerald-500/10 border border-emerald-500/20 px-4 py-2 text-sm font-semibold text-emerald-600 hover:bg-emerald-500/20 transition-colors">
              <CheckCircle2 className="h-4 w-4" /> Approve
            </button>
          )}
          {status !== "Revision Requested" && (
            <button onClick={() => handleStatusChange("Revision Requested")} className="inline-flex items-center gap-2 rounded-md bg-amber-500/10 border border-amber-500/20 px-4 py-2 text-sm font-semibold text-amber-600 hover:bg-amber-500/20 transition-colors">
              <AlertCircle className="h-4 w-4" /> Request Revision
            </button>
          )}
          {status !== "Rejected" && (
            <button onClick={() => handleStatusChange("Rejected")} className="inline-flex items-center gap-2 rounded-md bg-rose-500/10 border border-rose-500/20 px-4 py-2 text-sm font-semibold text-rose-600 hover:bg-rose-500/20 transition-colors">
              <XCircle className="h-4 w-4" /> Reject
            </button>
          )}
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Column: Document Preview & Metadata */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="border-border/70 overflow-hidden flex flex-col min-h-[600px]">
            <CardHeader className="border-b border-border/40 bg-muted/10 pb-4 flex flex-row items-center justify-between space-y-0">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <FileCheck className="h-4 w-4 text-[#c9a84c]" />
                  <CardTitle className="text-base">Document Preview</CardTitle>
                </div>
                {/* Annotator Toolbar (Phase 13) */}
                <div className="hidden sm:flex items-center gap-1 border-l border-border/40 pl-4 ml-2">
                  <button onClick={() => {
                    setComments([...comments, { id: Date.now(), author: "CEO", role: "ceo", text: "Added a highlight on page 2 regarding the edge logic.", time: "Just now", isSystem: false }]);
                  }} className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-amber-500 transition-colors" title="Highlight Text">
                    <div className="h-4 w-4 rounded-sm bg-amber-500/50 border border-amber-500" />
                  </button>
                  <button onClick={() => {
                    setComments([...comments, { id: Date.now(), author: "CEO", role: "ceo", text: "Attached reference link: https://patents.google.com/patent/US102", time: "Just now", isSystem: false }]);
                  }} className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-blue-500 transition-colors" title="Attach Link">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg>
                  </button>
                  <button onClick={() => {
                    setComments([...comments, { id: Date.now(), author: "CEO", role: "ceo", text: "Added inline annotation: 'Clarify this claim parameter.'", time: "Just now", isSystem: false }]);
                  }} className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-emerald-500 transition-colors" title="Add Annotation">
                    <MessageSquare className="h-4 w-4" />
                  </button>
                </div>
              </div>
              <button className="text-sm flex items-center gap-1.5 text-primary hover:underline">
                <Download className="h-4 w-4" /> Download Original
              </button>
            </CardHeader>
            <CardContent className="flex-1 bg-muted/5 flex items-center justify-center p-12 relative">
              {/* Simulated Document Page */}
              <div className="w-full max-w-lg aspect-[8.5/11] bg-background border border-border/50 shadow-sm p-8 flex flex-col relative">
                <div className="space-y-4 opacity-50 text-left w-full pointer-events-none">
                  <div className="h-6 w-3/4 bg-muted rounded" />
                  <div className="h-4 w-full bg-muted rounded" />
                  <div className="h-4 w-full bg-muted rounded" />
                  <div className="h-4 w-5/6 bg-muted rounded" />
                  <div className="h-4 w-full bg-muted rounded mt-8" />
                  <div className="h-4 w-4/5 bg-amber-500/30 border-b border-amber-500 rounded" />
                  <div className="h-4 w-full bg-muted rounded" />
                </div>
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="text-center space-y-4 opacity-70 bg-background/80 p-4 rounded-xl backdrop-blur-sm border border-border/50">
                    <FileText className="h-10 w-10 mx-auto text-[#c9a84c]" />
                    <p className="text-sm font-medium">Interactive Preview</p>
                    <p className="text-xs max-w-[200px] text-muted-foreground">Use the toolbar above to simulate CEO annotations and highlights.</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Feedback & Threaded Comments */}
        <div className="space-y-6 flex flex-col h-[600px]">
          <Card className="flex-1 flex flex-col border-border/70 overflow-hidden">
            <CardHeader className="border-b border-border/40 bg-muted/10 pb-4 shrink-0">
              <CardTitle className="text-base flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-[#c9a84c]" /> Review Thread
              </CardTitle>
              <CardDescription>Mentions (@Analyst) will trigger notifications.</CardDescription>
            </CardHeader>
            
            {/* Chat Area */}
            <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
              <AnimatePresence>
                {comments.map((comment) => (
                  <motion.div
                    key={comment.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={cn(
                      "flex flex-col gap-1 text-sm",
                      comment.isSystem ? "items-center text-center my-4" : "items-start"
                    )}
                  >
                    {comment.isSystem ? (
                      <div className="px-3 py-1 rounded-full bg-muted text-xs text-muted-foreground flex items-center gap-1.5 border border-border/50">
                        <ArrowRight className="h-3 w-3" /> {comment.text}
                      </div>
                    ) : (
                      <div className={cn(
                        "max-w-[90%] rounded-lg p-3",
                        comment.role === "ceo" ? "bg-primary/10 text-primary-foreground border border-primary/20 self-end rounded-tr-none" : "bg-muted border border-border/50 rounded-tl-none"
                      )}>
                        <div className="flex items-center justify-between gap-4 mb-1">
                          <span className={cn("font-semibold text-xs", comment.role === "ceo" ? "text-primary" : "text-foreground")}>{comment.author}</span>
                          <span className="text-[10px] opacity-70">{comment.time}</span>
                        </div>
                        <p className={cn("leading-relaxed", comment.role === "ceo" ? "text-foreground" : "text-muted-foreground")}>{comment.text}</p>
                      </div>
                    )}
                  </motion.div>
                ))}
              </AnimatePresence>
            </CardContent>

            {/* Input Area */}
            <div className="p-4 border-t border-border/40 bg-muted/5 shrink-0">
              <div className="relative flex items-center">
                <AtSign className="absolute left-3 h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSend()}
                  placeholder="Type a comment or @mention..."
                  className="w-full rounded-md border border-input bg-background py-2.5 pl-9 pr-12 text-sm outline-none focus-visible:ring-1 focus-visible:ring-ring"
                />
                <button
                  onClick={handleSend}
                  disabled={!newComment.trim()}
                  className="absolute right-2 p-1.5 rounded-md text-muted-foreground hover:bg-muted hover:text-primary disabled:opacity-50 transition-colors"
                >
                  <Send className="h-4 w-4" />
                </button>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
