"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  MessageSquare,
  Search,
  Reply,
  Send,
  Plus,
  CheckCircle2,
  Clock,
  User,
  History,
  X,
  Sparkles
} from "lucide-react";
import { useActiveRole } from "@/components/auth/role-context";

export default function CommentsCollabPage() {
  const router = useRouter();
  const { currentUser } = useActiveRole();
  const [loading, setLoading] = useState(true);
  const [comments, setComments] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeReplyId, setActiveReplyId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [submittingReply, setSubmittingReply] = useState(false);

  // New thread form state
  const [showNewThreadModal, setShowNewThreadModal] = useState(false);
  const [newFigureNum, setNewFigureNum] = useState<number>(1);
  const [newContent, setNewContent] = useState("");
  const [postingThread, setPostingThread] = useState(false);

  const fetchComments = async () => {
    try {
      const res = await fetch("/api/design-team/comments");
      if (res.ok) {
        const data = await res.json();
        if (data.comments) {
          setComments(data.comments);
        }
      }
    } catch (err) {
      console.error("Error fetching comments:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchComments();
  }, []);

  const filtered = comments.filter((c) => {
    return (
      c.content?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.author?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.invention_id?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.replies?.some((r: any) => r.content?.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  });

  const handlePostReply = async (parentId: string) => {
    if (!replyText.trim()) return;
    setSubmittingReply(true);

    try {
      const res = await fetch("/api/design-team/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          parent_id: parentId,
          content: replyText,
          author: currentUser?.name || "Design Team",
          role: "DESIGN_TEAM"
        })
      });

      if (res.ok) {
        setReplyText("");
        setActiveReplyId(null);
        await fetchComments();
      }
    } catch (err) {
      console.error("Error replying to comment:", err);
    } finally {
      setSubmittingReply(false);
    }
  };

  const handleCreateThread = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newContent.trim()) return;
    setPostingThread(true);

    try {
      const res = await fetch("/api/design-team/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assignment_id: "DSG-1003",
          invention_id: "INN-0012",
          figure_number: newFigureNum,
          content: newContent,
          author: currentUser?.name || "Design Team",
          role: "DESIGN_TEAM"
        })
      });

      if (res.ok) {
        setNewContent("");
        setShowNewThreadModal(false);
        await fetchComments();
      }
    } catch (err) {
      console.error("Error creating comment thread:", err);
    } finally {
      setPostingThread(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-border/40">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
              Cross-Role Discussions
            </span>
            <span className="text-xs text-muted-foreground font-mono">
              ROLE: {currentUser?.name || "Design Team"}
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-foreground tracking-tight flex items-center gap-2.5">
            <MessageSquare className="w-7 h-7 text-blue-600" /> Comments & Annotations
          </h1>
          <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
            Live technical discussions, figure markup queries, and claim alignment threads connecting Design Team, Drafters, Analysts, and Leadership.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            onClick={() => setShowNewThreadModal(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-sm"
          >
            <Plus className="w-4 h-4 mr-1.5" /> Start Discussion Thread
          </Button>

          <Link href="/dashboard/design-team/workspace/in-progress">
            <Button variant="outline" className="text-xs font-semibold">
              <Sparkles className="w-4 h-4 mr-1.5 text-emerald-600" /> Drawing Studio
            </Button>
          </Link>
        </div>
      </div>

      {/* Collaboration Navigation Tab Strip */}
      <div className="flex items-center gap-2 border-b border-border/40 pb-2 overflow-x-auto">
        <Link href="/dashboard/design-team/collab/requests">
          <Button size="sm" variant="outline" className="text-xs h-8">
            <Send className="w-3.5 h-3.5 mr-1.5 text-purple-500" /> Review Requests
          </Button>
        </Link>
        <Link href="/dashboard/design-team/collab/comments">
          <Button size="sm" className="bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 text-xs h-8">
            <MessageSquare className="w-3.5 h-3.5 mr-1.5 text-blue-500" /> Comments & Annotations ({comments.length})
          </Button>
        </Link>
        <Link href="/dashboard/design-team/collab/history">
          <Button size="sm" variant="outline" className="text-xs h-8">
            <History className="w-3.5 h-3.5 mr-1.5 text-emerald-500" /> Revision History Log
          </Button>
        </Link>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search comments, authors, or figure feedback..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9 text-xs bg-card"
        />
      </div>

      {/* Threaded Comments List */}
      {loading ? (
        <div className="py-20 text-center text-xs text-muted-foreground animate-pulse">
          Loading discussion threads...
        </div>
      ) : filtered.length === 0 ? (
        <Card className="p-12 text-center bg-card">
          <MessageSquare className="w-10 h-10 mx-auto text-muted-foreground/60 mb-3" />
          <h3 className="text-base font-bold text-foreground">No discussion threads found</h3>
        </Card>
      ) : (
        <div className="space-y-4">
          {filtered.map((thread) => (
            <Card key={thread.id} className="bg-card border-border/50 shadow-sm overflow-hidden">
              <CardContent className="p-5 space-y-4">
                {/* Main Comment Header */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-600 font-bold font-mono text-xs flex items-center justify-center shrink-0">
                      {thread.avatar || "U"}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <strong className="text-xs text-foreground">{thread.author}</strong>
                        <Badge
                          className={`text-[9px] font-bold ${
                            thread.role === "PATENT_DRAFTER"
                              ? "bg-blue-600 text-white"
                              : thread.role === "PATENT_ANALYST"
                              ? "bg-indigo-600 text-white"
                              : thread.role === "CEO"
                              ? "bg-amber-600 text-white"
                              : "bg-emerald-600 text-white"
                          }`}
                        >
                          {thread.role?.replace("_", " ")}
                        </Badge>
                        <Badge variant="outline" className="text-[10px] font-mono">
                          FIG. {thread.figure_number || 1}
                        </Badge>
                      </div>
                      <span className="text-[10px] text-muted-foreground font-mono">
                        {thread.invention_id} • {new Date(thread.created_at).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Comment Text */}
                <p className="text-xs text-foreground leading-relaxed pl-11">
                  {thread.content}
                </p>

                {/* Replies Thread */}
                {thread.replies && thread.replies.length > 0 && (
                  <div className="pl-11 space-y-2 pt-2 border-t border-border/20">
                    {thread.replies.map((reply: any) => (
                      <div key={reply.id} className="p-3 rounded-lg bg-muted/15 border border-border/30 space-y-1">
                        <div className="flex items-center gap-2">
                          <div className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-600 font-mono text-[9px] font-bold flex items-center justify-center">
                            {reply.avatar || "DT"}
                          </div>
                          <strong className="text-xs text-foreground">{reply.author}</strong>
                          <Badge className="bg-emerald-600 text-white text-[8px]">
                            {reply.role?.replace("_", " ")}
                          </Badge>
                          <span className="text-[10px] text-muted-foreground ml-auto">
                            {new Date(reply.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground pl-7">{reply.content}</p>
                      </div>
                    ))}
                  </div>
                )}

                {/* Reply Action Box */}
                <div className="pl-11 pt-1 flex items-center gap-2">
                  {activeReplyId === thread.id ? (
                    <div className="w-full flex items-center gap-2 animate-in fade-in">
                      <Input
                        placeholder="Write a response..."
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        className="text-xs h-8 flex-1"
                        autoFocus
                      />
                      <Button
                        size="sm"
                        className="h-8 text-xs bg-blue-600 hover:bg-blue-700 text-white font-semibold"
                        onClick={() => handlePostReply(thread.id)}
                        disabled={submittingReply}
                      >
                        <Send className="w-3 h-3 mr-1" /> Send
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 text-xs"
                        onClick={() => setActiveReplyId(null)}
                      >
                        Cancel
                      </Button>
                    </div>
                  ) : (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 text-xs text-muted-foreground hover:text-foreground"
                      onClick={() => {
                        setActiveReplyId(thread.id);
                        setReplyText("");
                      }}
                    >
                      <Reply className="w-3.5 h-3.5 mr-1 text-blue-500" /> Reply to Thread
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* NEW THREAD MODAL */}
      {showNewThreadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-card border border-border/60 rounded-xl max-w-lg w-full shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-border/40 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-blue-600" />
                <h3 className="font-bold text-base text-foreground">Post Design Collaboration Comment</h3>
              </div>
              <button onClick={() => setShowNewThreadModal(false)} className="text-muted-foreground hover:text-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateThread} className="p-5 space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-bold text-foreground block mb-1">Figure #</label>
                  <Input
                    type="number"
                    min={1}
                    max={50}
                    value={newFigureNum}
                    onChange={(e) => setNewFigureNum(Number(e.target.value))}
                    className="text-xs font-mono font-bold"
                    required
                  />
                </div>
                <div className="col-span-2">
                  <label className="text-xs font-bold text-foreground block mb-1">Target Project</label>
                  <Input
                    value="Smart Energy Management System (INN-0012)"
                    disabled
                    className="text-xs bg-muted/20"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-foreground block mb-1">Your Feedback / Question</label>
                <textarea
                  placeholder="e.g. Please confirm whether FIG 2 microcontroller bus should connect directly to PMIC 202 or through galvanic barrier 208..."
                  value={newContent}
                  onChange={(e) => setNewContent(e.target.value)}
                  rows={4}
                  className="w-full p-2.5 rounded-md border border-input bg-card text-xs text-foreground focus:outline-none focus:ring-1"
                  required
                />
              </div>

              <div className="pt-3 border-t border-border/40 flex justify-end gap-2">
                <Button type="button" variant="outline" size="sm" className="text-xs" onClick={() => setShowNewThreadModal(false)}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold"
                  disabled={postingThread}
                >
                  {postingThread ? "Posting..." : "Post Comment"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
