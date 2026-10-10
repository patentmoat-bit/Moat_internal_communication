"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ShieldCheck, ArrowRight, CheckCircle2, AlertTriangle, User, History, ShieldAlert } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useActiveRole } from "@/components/auth/role-context";

export default function ApprovalsPage() {
  const { currentUser } = useActiveRole();
  const searchParams = useSearchParams();
  const rawId = searchParams?.get('id');
  
  const [inventionId, setInventionId] = useState<string | null>(rawId);
  const [reviewData, setReviewData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [decisionNote, setDecisionNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const fetchReview = async (currentId: string) => {
    try {
      const res = await fetch(`/api/patent-drafter/review?inventionId=${currentId}`);
      const data = await res.json();
      if (data.success) {
        setReviewData(data.reviewData);
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
        await fetchReview(currentId);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [rawId]);

  const handleStateChange = async (newStatus: string, role: string) => {
    setErrorMsg("");
    setSubmitting(true);
    try {
      const res = await fetch('/api/patent-drafter/review', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inventionId, newStatus, role, decisionNote, author: currentUser.name })
      });
      const data = await res.json();
      if (!data.success) {
        setErrorMsg(data.error || "Transition Failed");
      } else {
        setDecisionNote("");
        await fetchReview(inventionId!);
      }
    } catch(e) {
      setErrorMsg("Network Error");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="p-12 text-center text-muted-foreground animate-pulse">Loading Review State...</div>;
  if (!inventionId || !reviewData) return <div className="p-12 text-center">No Draft Data Found.</div>;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'APPROVED': return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'REVISION_REQUIRED': return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'SUBMITTED_FOR_REVIEW': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'UNDER_REVIEW': return 'bg-indigo-100 text-indigo-800 border-indigo-200';
      default: return 'bg-slate-100 text-slate-800 border-slate-200';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-emerald-500" /> Approvals & Workflow
          </h2>
          <p className="text-sm text-muted-foreground mt-1">Track the macro state of your draft through the Analyst approval pipeline.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* State Machine Dashboard */}
        <Card className="border-border/50 shadow-sm bg-white dark:bg-card">
          <div className="p-6 border-b border-border/50 bg-slate-50/50 flex flex-col items-center">
            <h3 className="font-semibold text-sm text-muted-foreground mb-4 uppercase tracking-wider">Current Workflow State</h3>
            <div className={`px-6 py-3 rounded-full text-lg font-black border shadow-inner ${getStatusColor(reviewData.status)}`}>
              {reviewData.status.replace(/_/g, ' ')}
            </div>
            <div className="mt-4 text-xs text-muted-foreground">Active Version: v{reviewData.version}</div>
          </div>
          <CardContent className="p-6 space-y-6">
            
            {errorMsg && (
              <div className="bg-red-50 text-red-700 p-3 rounded-lg border border-red-200 flex items-center text-sm font-semibold">
                <ShieldAlert className="w-4 h-4 mr-2" /> {errorMsg}
              </div>
            )}

            <div className="space-y-4">
              <h4 className="text-sm font-bold border-b pb-2">Workflow Actions</h4>
              
              {currentUser.role === 'PATENT_DRAFTER' && (
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-4">
                  <h5 className="text-xs font-bold text-blue-600 uppercase tracking-wider flex items-center">
                    <User className="w-3 h-3 mr-1" /> Drafter Actions
                  </h5>
                  <Button 
                    onClick={() => handleStateChange('SUBMITTED_FOR_REVIEW', 'Drafter')} 
                    disabled={submitting || (reviewData.status !== 'DRAFTING' && reviewData.status !== 'REVISION_REQUIRED')} 
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    Submit for Analyst Review <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                  <p className="text-[10px] text-muted-foreground text-center">Only available when Drafting or Revision Required.</p>
                </div>
              )}

              {currentUser.role === 'PATENT_ANALYST' && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 space-y-4">
                  <h5 className="text-xs font-bold text-amber-700 uppercase tracking-wider flex items-center justify-between">
                    <span className="flex items-center"><User className="w-3 h-3 mr-1" /> Analyst Actions</span>
                  </h5>
                  <Textarea 
                    placeholder="Analyst Decision Note..."
                    className="min-h-[60px] text-xs bg-white"
                    value={decisionNote}
                    onChange={(e) => setDecisionNote(e.target.value)}
                  />
                  <div className="flex gap-2">
                    <Button 
                      onClick={() => handleStateChange('REVISION_REQUIRED', 'Patent Analyst')} 
                      disabled={submitting || (reviewData.status !== 'SUBMITTED_FOR_REVIEW' && reviewData.status !== 'UNDER_REVIEW')} 
                      variant="outline"
                      className="w-full bg-white text-amber-700 border-amber-300 hover:bg-amber-100"
                    >
                      <AlertTriangle className="w-4 h-4 mr-2" /> Request Revisions
                    </Button>
                    <Button 
                      onClick={() => handleStateChange('APPROVED', 'Patent Analyst')} 
                      disabled={submitting || (reviewData.status !== 'SUBMITTED_FOR_REVIEW' && reviewData.status !== 'UNDER_REVIEW')} 
                      className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
                    >
                      <CheckCircle2 className="w-4 h-4 mr-2" /> Approve Draft
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* High Level Decision Log */}
        <Card className="border-border/50 shadow-sm bg-white dark:bg-card h-full flex flex-col">
          <div className="p-4 border-b border-border/50 bg-slate-50/50 flex items-center justify-between">
            <h3 className="font-semibold text-sm">Decision History</h3>
            <History className="w-4 h-4 text-muted-foreground" />
          </div>
          <CardContent className="p-0 flex-1 overflow-y-auto bg-slate-50/30">
             {reviewData.comments.length === 0 ? (
               <div className="p-12 text-center text-muted-foreground text-sm">No workflow decisions recorded.</div>
             ) : (
               <div className="divide-y divide-border/50">
                 {[...reviewData.comments].reverse().map((c: any) => (
                   <div key={c.id} className="p-4 bg-white">
                     <div className="flex justify-between items-start mb-2">
                       <div>
                         <span className="font-bold text-sm text-slate-800">{c.author}</span>
                         <span className="text-[10px] text-muted-foreground uppercase px-2 py-0.5 bg-black/5 rounded-full ml-2">{c.role}</span>
                       </div>
                       <span className="text-xs text-muted-foreground">{new Date(c.timestamp).toLocaleString()}</span>
                     </div>
                     <p className="text-sm text-slate-700">{c.text}</p>
                   </div>
                 ))}
               </div>
             )}
          </CardContent>
        </Card>

      </div>
    </div>
  );
}
