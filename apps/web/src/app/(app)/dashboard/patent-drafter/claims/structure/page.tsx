"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { GitBranch, PlusCircle, AlertCircle, Trash2, Edit2, AlertTriangle, ArrowRight, Lock } from "lucide-react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";

export default function ClaimTreePage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const rawId = searchParams?.get('id');
  
  const [inventionId, setInventionId] = useState<string | null>(rawId);
  const [loading, setLoading] = useState(true);
  const [claimSet, setClaimSet] = useState<any>(null);
  const [error, setError] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  const fetchClaims = async (currentId: string) => {
    const res = await fetch(`/api/patent-drafter/claims?inventionId=${currentId}`);
    const data = await res.json();
    if (data.success && data.claimSet) {
      setClaimSet(data.claimSet);
    } else {
      setClaimSet(null);
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
          setError("No invention context provided.");
          setLoading(false);
          return;
        }

        await fetchClaims(currentId);
      } catch (err) {
        console.error(err);
        setError("Failed to fetch claims data.");
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [rawId]);

  const handleCreateClaimSet = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/patent-drafter/claims', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invention_id: inventionId, claims: [] })
      });
      const data = await res.json();
      if (data.success) {
        setClaimSet(data.claimSet);
      }
    } catch(e) {
      setError("Failed to create claim set.");
    } finally {
      setLoading(false);
    }
  };

  const saveClaimUpdate = async (updatedClaims: any[]) => {
    setActionLoading(true);
    try {
      await fetch('/api/patent-drafter/claims', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: claimSet.id, claims: updatedClaims })
      });
      await fetchClaims(inventionId!);
    } catch(e) {
      alert("Failed to update claims.");
    } finally {
      setActionLoading(false);
    }
  };

  const addClaim = (type: string, parentId: number | null) => {
    if (!claimSet) return;
    const claims = [...(claimSet.claims || [])];
    const nextNum = claims.length > 0 ? Math.max(...claims.map(c => c.number)) + 1 : 1;
    
    claims.push({
      id: Date.now(),
      number: nextNum,
      type: type,
      parent: parentId,
      text: type === "Independent" ? "A new independent claim..." : `The system of claim ${parentId}, further comprising...`
    });
    
    saveClaimUpdate(claims);
  };

  const deleteClaim = (num: number) => {
    if (!claimSet) return;
    if (!confirm(`Are you sure you want to delete claim ${num}?`)) return;
    
    let claims = [...claimSet.claims];
    claims = claims.filter(c => c.number !== num);
    
    // Convert children to floating or update parents if needed (For simplicity, let's keep them and flag them as invalid)
    saveClaimUpdate(claims);
  };

  const validateClaims = (claims: any[]) => {
    const errors: any = {};
    const map = new Map(claims.map(c => [c.number, c]));
    
    claims.forEach(c => {
      if (c.parent) {
        if (!map.has(c.parent)) {
          errors[c.number] = "Depends on missing claim " + c.parent;
        } else if (c.parent >= c.number) {
          errors[c.number] = "Depends on later or same claim " + c.parent;
        }
      }
    });
    return errors;
  };

  const buildTree = (claims: any[]) => {
    if (!claims) return [];
    const nodes = claims.map(c => ({ ...c, children: [] }));
    const rootNodes: any[] = [];
    const map = new Map();
    
    nodes.forEach(n => map.set(n.number, n));
    
    nodes.forEach(n => {
      if (n.parent && map.has(n.parent)) {
        map.get(n.parent).children.push(n);
      } else {
        rootNodes.push(n); 
      }
    });
    
    return rootNodes.sort((a, b) => a.number - b.number);
  };

  if (loading) return <div className="p-12 text-center text-muted-foreground animate-pulse">Loading claim workspace...</div>;
  if (error) return <div className="p-8 text-red-600 font-bold">{error}</div>;

  if (!claimSet) {
    return (
      <div className="bg-muted/10 border border-border/40 rounded-2xl p-12 text-center">
        <h2 className="text-2xl font-bold mb-2">No Claims Found</h2>
        <Button onClick={handleCreateClaimSet} className="mt-4"><PlusCircle className="w-5 h-5 mr-2" /> Create Claim Set</Button>
      </div>
    );
  }

  const claimsList = claimSet.claims || [];
  const claimTree = buildTree(claimsList);
  const isLocked = claimSet.status === 'SUBMITTED_FOR_REVIEW' || claimSet.status === 'APPROVED';
  const validationErrors = validateClaims(claimsList);

  const renderNode = (node: any, depth = 0) => {
    const hasError = validationErrors[node.number];
    
    return (
      <div key={node.id || node.number} className="relative mb-4 last:mb-0">
        <Card className={`border shadow-sm relative z-10 transition-colors ${hasError ? 'border-red-400 bg-red-50 dark:bg-red-950/20' : (depth === 0 ? 'border-blue-200 bg-white dark:bg-card' : 'border-slate-200 bg-slate-50 dark:bg-slate-900/50')}`}>
          <CardContent className="p-3">
            <div className="flex justify-between items-start">
              <div className="flex gap-4 items-center">
                <div className={`w-8 h-8 rounded-full font-bold flex items-center justify-center text-sm border ${depth === 0 ? 'bg-blue-100 text-blue-700 border-blue-200' : 'bg-slate-200 text-slate-700'}`}>
                  {node.number}
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-xs uppercase tracking-wider">{node.type}</span>
                    {hasError && (
                      <span className="flex items-center text-xs text-red-600 bg-red-100 px-2 py-0.5 rounded-full">
                        <AlertTriangle className="w-3 h-3 mr-1" /> {hasError}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-slate-700 dark:text-slate-300 line-clamp-2">{node.text}</p>
                </div>
              </div>
              <div className="flex gap-2 opacity-60 hover:opacity-100 transition-opacity">
                <Button variant="ghost" size="sm" onClick={() => addClaim("Dependent", node.number)} disabled={actionLoading || isLocked} title="Add Dependent Claim">
                  <GitBranch className="w-4 h-4" />
                </Button>
                <Link href={`/dashboard/patent-drafter/claims/list?id=${inventionId}&focus=${node.number}`}>
                  <Button variant="ghost" size="sm" title="Open in Editor">
                    <Edit2 className="w-4 h-4" />
                  </Button>
                </Link>
                <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-700 hover:bg-red-50" onClick={() => deleteClaim(node.number)} disabled={actionLoading || isLocked} title="Remove Claim">
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {node.children && node.children.length > 0 && (
          <div className="ml-8 mt-4 relative before:absolute before:inset-y-0 before:-left-4 before:w-px before:bg-border/60 space-y-4">
            {node.children.map((child: any) => (
              <div key={child.id || child.number} className="relative before:absolute before:top-6 before:-left-4 before:w-4 before:h-px before:bg-border/60">
                {renderNode(child, depth + 1)}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="mb-6 flex justify-between items-end">
        <div>
          <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
            <GitBranch className="w-6 h-6 text-blue-500" /> Claim Tree Visualization
          </h2>
          <p className="text-sm text-muted-foreground mt-1">Review and modify the dependency structure of your claim set.</p>
        </div>
        <Button onClick={() => addClaim("Independent", null)} disabled={actionLoading || isLocked} className="bg-blue-600 hover:bg-blue-700 text-white">
          <PlusCircle className="w-4 h-4 mr-2" /> Add Independent Claim
        </Button>
      </div>

      <div className="bg-muted/10 border border-border/40 rounded-2xl p-8 min-h-[500px]">
        {Object.keys(validationErrors).length > 0 && (
          <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-semibold text-amber-800">Dependency Warnings</h4>
              <p className="text-sm text-amber-700">Some claims have broken dependencies. Please resolve them using the Claims Editor.</p>
            </div>
          </div>
        )}

        {claimsList.length === 0 ? (
          <div className="text-center p-12 text-muted-foreground">Empty claim set. Add an independent claim to begin.</div>
        ) : (
          claimTree.map((node: any) => renderNode(node, 0))
        )}
      </div>
    </div>
  );
}
