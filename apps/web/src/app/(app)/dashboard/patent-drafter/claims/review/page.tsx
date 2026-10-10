"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { 
  CheckSquare, ShieldAlert, AlertTriangle, CheckCircle2, 
  MessageSquare, Send, User, RotateCw, SendHorizontal, Lock
} from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useActiveRole } from "@/components/auth/role-context";

export default function ClaimReviewPage() {
  const { currentUser } = useActiveRole();
  const searchParams = useSearchParams();
  const rawId = searchParams?.get('id');
  
  const [loading, setLoading] = useState(true);
  const [claimSet, setClaimSet] = useState<any>(null);
  
  const [checks, setChecks] = useState<any[]>([]);
  const [newComment, setNewComment] = useState("");
  const [commenting, setCommenting] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const fetchClaims = async (currentId: string) => {
    const res = await fetch(`/api/patent-drafter/claims?inventionId=${currentId}`);
    const data = await res.json();
    if (data.success && data.claimSet) {
      setClaimSet(data.claimSet);
      runValidation(data.claimSet);
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
          }
        }
        if (!currentId) {
          setLoading(false); return;
        }
        await fetchClaims(currentId);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [rawId]);

  const runValidation = (data: any) => {
    const claims = data.claims || [];
    const newChecks: any[] = [];
    
    // 1. Missing claims (gap in numbering)
    const nums = claims.map((c:any) => c.number).sort((a:any, b:any) => a - b);
    let gaps = [];
    for (let i = 1; i < nums.length; i++) {
      if (nums[i] - nums[i-1] > 1) {
        gaps.push(`Gap between ${nums[i-1]} and ${nums[i]}`);
      }
    }
    newChecks.push({
      name: "Sequential Numbering",
      status: gaps.length > 0 ? "Failed" : "Pass",
      severity: gaps.length > 0 ? "High" : "None",
      evidence: gaps.length > 0 ? gaps.join(', ') : "No gaps detected",
      explanation: "Claim numbers must be strictly sequential without gaps.",
      suggestion: gaps.length > 0 ? "Renumber claims in the Editor." : ""
    });

    // 2. Duplicate numbers
    const duplicates = nums.filter((item:any, index:any) => nums.indexOf(item) !== index);
    newChecks.push({
      name: "Duplicate Identifiers",
      status: duplicates.length > 0 ? "Failed" : "Pass",
      severity: duplicates.length > 0 ? "High" : "None",
      evidence: duplicates.length > 0 ? `Duplicate numbers: ${duplicates.join(', ')}` : "All claim numbers are unique.",
      explanation: "Each claim must have a unique numerical identifier.",
      suggestion: duplicates.length > 0 ? "Fix duplicate numbers in the Editor." : ""
    });

    // 3. Invalid dependencies (missing or forward)
    const invalidDeps = [];
    claims.forEach((c:any) => {
      if (c.parent) {
        if (!nums.includes(c.parent)) {
          invalidDeps.push(`Claim ${c.number} depends on missing Claim ${c.parent}`);
        } else if (c.parent >= c.number) {
          invalidDeps.push(`Claim ${c.number} depends on later Claim ${c.parent} (Forward/Circular)`);
        }
      }
    });
    newChecks.push({
      name: "Dependency Integrity",
      status: invalidDeps.length > 0 ? "Failed" : "Pass",
      severity: invalidDeps.length > 0 ? "Critical" : "None",
      evidence: invalidDeps.length > 0 ? invalidDeps.join(', ') : "All dependencies resolve to valid antecedent claims.",
      explanation: "Dependent claims must reference an existing claim that precedes them.",
      suggestion: invalidDeps.length > 0 ? "Update parent identifiers in the Editor." : ""
    });

    // 4. Missing Independent Claim
    const hasIndep = claims.some((c:any) => c.type === 'Independent');
    newChecks.push({
      name: "Minimum Structural Requirements",
      status: hasIndep ? "Pass" : "Failed",
      severity: hasIndep ? "None" : "Critical",
      evidence: hasIndep ? "Independent claim detected." : "No independent claims found.",
      explanation: "A valid patent application requires at least one independent claim.",
      suggestion: hasIndep ? "" : "Add an Independent Claim."
    });

    // 5. Unresolved Feedback
    const hasUnresolvedFeedback = data.status === 'REVISION_REQUIRED';
    newChecks.push({
      name: "Analyst Review Status",
      status: hasUnresolvedFeedback ? "Requires Human Review" : "Pass",
      severity: hasUnresolvedFeedback ? "Medium" : "None",
      evidence: hasUnresolvedFeedback ? "Revisions requested by Analyst." : "No blocking revisions.",
      explanation: "All requested revisions must be addressed before final submission.",
      suggestion: hasUnresolvedFeedback ? "Review comments below and update claims." : ""
    });

    setChecks(newChecks);
  };

  const handleSubmitForReview = async () => {
    if (!claimSet || allPassed !== true) return;
    setSubmitting(true);
    try {
      await fetch('/api/patent-drafter/claims', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          id: claimSet.id, 
          status: 'SUBMITTED_FOR_REVIEW',
          change_note: 'Submitted to Analyst' 
        })
      });
      await fetchClaims(claimSet.invention_id);
    } catch(e) {
      console.error(e);
    } finally {
      setSubmitting(false);
    }
  };

  const handlePostComment = async () => {
    if (!newComment.trim() || !claimSet) return;
    setCommenting(true);
    try {
      const comments = claimSet.comments || [];
      comments.push({
        id: Date.now(),
        author: currentUser.name,
        role: currentUser.role === "PATENT_ANALYST" ? "Patent Analyst" : "Drafter",
        text: newComment,
        timestamp: new Date().toISOString()
      });
      
      await fetch('/api/patent-drafter/claims', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: claimSet.id, comments })
      });
      
      setNewComment("");
      await fetchClaims(claimSet.invention_id);
    } catch(e) {
      console.error(e);
    } finally {
      setCommenting(false);
    }
  };

  const mockAnalystFeedback = async () => {
    setCommenting(true);
    try {
      const comments = claimSet.comments || [];
      comments.push({
        id: Date.now(),
        author: "John Reviewer", 
        role: "Patent Analyst",
        text: "Please broaden the scope of independent claim 1. It currently limits the processor to local memory, which excludes cloud environments. Change status to REVISION_REQUIRED.",
        timestamp: new Date().toISOString()
      });
      
      await fetch('/api/patent-drafter/claims', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: claimSet.id, comments, status: 'REVISION_REQUIRED' })
      });
      
      await fetchClaims(claimSet.invention_id);
    } catch(e) {
    } finally {
      setCommenting(false);
    }
  };

  if (loading) return <div className="p-12 text-center text-muted-foreground animate-pulse">Loading Validation Engine...</div>;
  if (!claimSet) return <div className="p-12 text-center">No Claims Found</div>;

  const allPassed = checks.every(c => c.status === 'Pass');
  const isLocked = claimSet.status === 'SUBMITTED_FOR_REVIEW' || claimSet.status === 'APPROVED';

  return (
    <div className="space-y-6">
      
      {isLocked && (
        <div className="bg-blue-50 border border-blue-200 text-blue-800 p-4 rounded-xl flex items-start gap-3">
          <Lock className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-bold text-sm">Claim Set Locked</h3>
            <p className="text-sm">This claim set is currently <strong>{claimSet.status.replace(/_/g, ' ')}</strong>. It is locked to prevent unauthorized modifications while under review.</p>
          </div>
        </div>
      )}

      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
            <CheckSquare className="w-6 h-6 text-indigo-500" /> Claim Review & Validation
          </h2>
          <p className="text-sm text-muted-foreground mt-1">Run automated structural checks and address human feedback before submission.</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => runValidation(claimSet)} variant="outline" className="bg-white" disabled={isLocked}>
            <RotateCw className="w-4 h-4 mr-2" /> Re-run Checks
          </Button>
          <Button 
            onClick={handleSubmitForReview} 
            disabled={!allPassed || isLocked || submitting} 
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            <SendHorizontal className="w-4 h-4 mr-2" /> 
            {isLocked ? "Already Submitted" : "Submit to Analyst"}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Automated Checks Panel */}
        <div className="lg:col-span-2 space-y-4">
          <Card className="border-border/50 shadow-sm overflow-hidden bg-white dark:bg-card">
            <div className={`p-4 border-b flex justify-between items-center ${allPassed ? 'bg-emerald-50 border-emerald-100' : 'bg-amber-50 border-amber-100'}`}>
              <h3 className="font-semibold flex items-center gap-2">
                <ShieldAlert className={`w-5 h-5 ${allPassed ? 'text-emerald-600' : 'text-amber-600'}`} /> 
                Automated Structural Checks
              </h3>
              <span className={`text-sm font-bold ${allPassed ? 'text-emerald-700' : 'text-amber-700'}`}>
                {allPassed ? 'All Checks Passed' : 'Action Required'}
              </span>
            </div>
            <div className="divide-y divide-border/40 p-0">
              {checks.map((check, idx) => (
                <div key={idx} className="p-5 flex gap-4">
                  <div className="flex-shrink-0 mt-1">
                    {check.status === 'Pass' ? (
                      <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                    ) : check.status === 'Requires Human Review' ? (
                      <MessageSquare className="w-6 h-6 text-amber-500" />
                    ) : (
                      <AlertTriangle className="w-6 h-6 text-red-500" />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between mb-1">
                      <h4 className="font-bold text-sm">{check.name}</h4>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        check.severity === 'Critical' ? 'bg-red-100 text-red-700' : 
                        check.severity === 'High' ? 'bg-amber-100 text-amber-700' : 
                        check.severity === 'Medium' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'
                      }`}>
                        {check.status === 'Pass' ? 'PASS' : check.severity}
                      </span>
                    </div>
                    <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">{check.explanation}</p>
                    
                    <div className="bg-slate-50 dark:bg-slate-900/50 p-3 rounded border border-slate-100 text-sm">
                      <span className="font-semibold text-slate-700">Evidence: </span>
                      <span className={check.status !== 'Pass' ? 'text-red-600' : 'text-emerald-600'}>{check.evidence}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Human Feedback Panel */}
        <div className="space-y-4 h-full flex flex-col">
          <Card className="border-border/50 shadow-sm flex-1 flex flex-col bg-white dark:bg-card overflow-hidden">
            <div className="p-4 border-b border-border/50 bg-slate-50/50 flex justify-between items-center">
              <h3 className="font-semibold flex items-center gap-2 text-sm">
                <MessageSquare className="w-4 h-4 text-blue-600" /> Analyst Feedback
              </h3>
              
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/30">
              {(!claimSet.comments || claimSet.comments.length === 0) ? (
                <div className="h-full flex flex-col items-center justify-center text-muted-foreground text-center p-8">
                  <MessageSquare className="w-8 h-8 opacity-20 mb-2" />
                  <p className="text-sm">No review comments yet.</p>
                </div>
              ) : (
                claimSet.comments.map((comment: any) => (
                  <div key={comment.id} className={`p-3 rounded-lg border ${comment.role === 'Patent Analyst' ? 'bg-amber-50 border-amber-100 ml-4' : 'bg-white border-slate-200 mr-4'}`}>
                    <div className="flex justify-between items-start mb-1">
                      <div className="flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-muted-foreground" />
                        <span className="text-xs font-bold">{comment.author}</span>
                        <span className="text-[10px] text-muted-foreground uppercase px-1.5 bg-black/5 rounded-full">{comment.role}</span>
                      </div>
                      <span className="text-[10px] text-muted-foreground">{new Date(comment.timestamp).toLocaleTimeString()}</span>
                    </div>
                    <p className="text-sm text-slate-700 leading-relaxed">{comment.text}</p>
                  </div>
                ))
              )}
            </div>
            
            <div className="p-3 border-t bg-white">
              <div className="relative">
                <Textarea 
                  placeholder={isLocked ? "Commenting disabled while under review" : "Reply to feedback..."}
                  className="min-h-[80px] resize-none pr-12 text-sm"
                  value={newComment}
                  onChange={e => setNewComment(e.target.value)}
                  disabled={isLocked}
                />
                <Button 
                  size="icon" 
                  className="absolute bottom-2 right-2 h-8 w-8 bg-blue-600 hover:bg-blue-700"
                  onClick={handlePostComment}
                  disabled={commenting || !newComment.trim() || isLocked}
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
