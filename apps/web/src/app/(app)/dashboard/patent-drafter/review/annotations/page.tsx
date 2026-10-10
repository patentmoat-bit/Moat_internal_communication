"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { MessageSquare, MessageCircle, CheckCircle2, User, Clock, Reply } from "lucide-react";
import { useSearchParams } from "next/navigation";

export default function AnnotationsPage() {
  const searchParams = useSearchParams();
  const rawId = searchParams?.get('id');
  
  const [inventionId, setInventionId] = useState<string | null>(rawId);
  const [annotations, setAnnotations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [replyText, setReplyText] = useState<{ [key: string]: string }>({});
  const [submitting, setSubmitting] = useState(false);

  const fetchAnnotations = async (currentId: string) => {
    try {
      const res = await fetch(`/api/patent-drafter/annotations?inventionId=${currentId}`);
      const data = await res.json();
      if (data.success) {
        setAnnotations(data.annotations);
      }
    } catch (err) {
      console.error(err);
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
        if (!currentId) {
          setLoading(false); return;
        }
        await fetchAnnotations(currentId);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [rawId]);

  const handleResolve = async (id: string) => {
    setSubmitting(true);
    try {
      await fetch('/api/patent-drafter/annotations', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status: 'RESOLVED' })
      });
      await fetchAnnotations(inventionId!);
    } catch(e) {
      console.error(e);
    } finally {
      setSubmitting(false);
    }
  };

  const handleReply = async (id: string) => {
    const text = replyText[id];
    if (!text?.trim()) return;
    setSubmitting(true);
    try {
      await fetch('/api/patent-drafter/annotations', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, reply: { text } })
      });
      setReplyText(prev => ({ ...prev, [id]: "" }));
      await fetchAnnotations(inventionId!);
    } catch(e) {
      console.error(e);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="p-12 text-center text-muted-foreground animate-pulse">Loading Annotations...</div>;

  if (!inventionId) {
    return <div className="p-12 text-center">No Invention Selected.</div>;
  }

  const openAnns = annotations.filter(a => a.status === 'OPEN');
  const resolvedAnns = annotations.filter(a => a.status === 'RESOLVED');

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
            <MessageSquare className="w-6 h-6 text-purple-500" /> Granular Annotations
          </h2>
          <p className="text-sm text-muted-foreground mt-1">Review specific feedback targeted at sections of your draft.</p>
        </div>
      </div>

      {annotations.length === 0 ? (
        <Card className="border-border/50 border-dashed shadow-sm bg-white dark:bg-card">
          <CardContent className="p-16 flex flex-col items-center justify-center text-muted-foreground text-center">
            <MessageCircle className="w-12 h-12 opacity-20 mb-4" />
            <h3 className="font-semibold mb-2">No Annotations</h3>
            <p className="text-sm">There are no specific comments on this draft yet.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {openAnns.map(ann => (
            <Card key={ann.id} className="border-border/50 shadow-sm bg-white dark:bg-card overflow-hidden">
              <div className="p-4 border-b border-purple-100 bg-purple-50/30 flex justify-between items-start">
                <div>
                  <div className="text-xs font-bold text-purple-600 tracking-wider uppercase mb-1">Target: {ann.target_passage}</div>
                  <p className="text-sm font-medium text-slate-800 dark:text-slate-200">"{ann.text}"</p>
                </div>
                <Button onClick={() => handleResolve(ann.id)} disabled={submitting} variant="outline" size="sm" className="bg-white text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700">
                  <CheckCircle2 className="w-4 h-4 mr-1" /> Mark Resolved
                </Button>
              </div>
              <CardContent className="p-4 bg-slate-50/50">
                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-4">
                  <User className="w-3.5 h-3.5" /> {ann.author} ({ann.role}) • <Clock className="w-3.5 h-3.5 ml-2" /> {new Date(ann.created_at).toLocaleString()}
                </div>
                
                {/* Replies */}
                {ann.replies && ann.replies.length > 0 && (
                  <div className="ml-6 space-y-3 border-l-2 border-slate-200 pl-4 mb-4">
                    {ann.replies.map((rep: any) => (
                      <div key={rep.id} className="text-sm bg-white p-3 rounded shadow-sm border border-slate-100">
                        <p className="text-slate-700 mb-1">{rep.text}</p>
                        <div className="text-xs text-muted-foreground">{rep.author} • {new Date(rep.created_at).toLocaleTimeString()}</div>
                      </div>
                    ))}
                  </div>
                )}
                
                <div className="flex gap-2">
                  <Textarea 
                    placeholder="Reply to this annotation..." 
                    className="min-h-[40px] text-sm"
                    value={replyText[ann.id] || ""}
                    onChange={(e) => setReplyText(prev => ({ ...prev, [ann.id]: e.target.value }))}
                  />
                  <Button onClick={() => handleReply(ann.id)} disabled={!replyText[ann.id]?.trim() || submitting} className="shrink-0 h-auto">
                    <Reply className="w-4 h-4 mr-1" /> Reply
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
          
          {resolvedAnns.length > 0 && (
            <div className="mt-8">
              <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-4">Resolved Annotations</h3>
              <div className="space-y-4 opacity-70">
                {resolvedAnns.map(ann => (
                  <Card key={ann.id} className="border-border/50 shadow-sm bg-slate-50">
                    <div className="p-4 flex justify-between items-center">
                      <div>
                        <div className="text-xs font-bold text-slate-500 line-through tracking-wider uppercase mb-1">{ann.target_passage}</div>
                        <p className="text-sm text-slate-600">"{ann.text}"</p>
                      </div>
                      <span className="text-xs font-bold text-emerald-600 bg-emerald-100 px-2 py-1 rounded-full flex items-center">
                        <CheckCircle2 className="w-3 h-3 mr-1" /> Resolved
                      </span>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
