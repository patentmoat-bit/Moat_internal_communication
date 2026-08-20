"use client";

import { useState, useEffect } from "react";
import { Shield, Plus, Trash2, Power, Loader2, Key, Search, CheckCircle, XCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useToast } from "@/components/ui/toast";
import { MFAService } from "@/services/iam/MFAService";
import { Badge } from "@/components/ui/badge";

export default function OrganizationDomainsPage() {
  const [domains, setDomains] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const { toast } = useToast();

  // Add Domain State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newDomain, setNewDomain] = useState("");
  const [newOrgName, setNewOrgName] = useState("");

  // MFA State
  const [mfaModalOpen, setMfaModalOpen] = useState(false);
  const [mfaCode, setMfaCode] = useState("");
  const [mfaFactorId, setMfaFactorId] = useState("");
  const [mfaChallengeId, setMfaChallengeId] = useState("");
  const [pendingAction, setPendingAction] = useState<any>(null);
  const [mfaLoading, setMfaLoading] = useState(false);

  const fetchDomains = async () => {
    try {
      const res = await fetch("/api/admin/domains");
      const json = await res.json();
      if (res.ok && json.success) {
        setDomains(json.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDomains();
  }, []);

  const checkStepUpMfa = async (actionData: any) => {
     setProcessing(true);
     try {
         const factors = await MFAService.listFactors();
         const totpFactor = factors.totp[0];
         if (!totpFactor) {
             toast({ title: "MFA Required", description: "You must enroll in MFA before performing highly sensitive actions.", variant: "destructive" });
             setProcessing(false);
             return false;
         }
         const challenge = await MFAService.challengeTOTP(totpFactor.id);
         setMfaFactorId(totpFactor.id);
         setMfaChallengeId(challenge.id);
         setPendingAction(actionData);
         setMfaModalOpen(true);
         setProcessing(false);
         return true; 
     } catch (err: any) {
         toast({ title: "MFA Error", description: err.message, variant: "destructive" });
         setProcessing(false);
         return false;
     }
  };

  const executeAction = async (actionData: any) => {
    setProcessing(true);
    try {
      let res;
      if (actionData.action === "ADD") {
          res = await fetch("/api/admin/domains", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ domain: actionData.domain, organizationName: actionData.orgName })
          });
      } else if (actionData.action === "REMOVE") {
          res = await fetch(`/api/admin/domains/${actionData.id}`, { method: "DELETE" });
      } else if (actionData.action === "TOGGLE") {
          res = await fetch(`/api/admin/domains/${actionData.id}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ isEnabled: !actionData.currentStatus })
          });
      }

      const json = await res?.json();
      if (res?.ok) {
        toast({ title: "Success", description: "Domain configuration updated." });
        setIsAddModalOpen(false);
        setNewDomain("");
        setNewOrgName("");
        fetchDomains();
      } else {
        toast({ title: "Error", description: json.detail || "Action failed", variant: "destructive" });
      }
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setProcessing(false);
      setPendingAction(null);
      setMfaCode("");
    }
  };

  const handleMfaVerify = async () => {
     if (!mfaCode) return;
     setMfaLoading(true);
     try {
         await MFAService.verifyTOTP(mfaFactorId, mfaChallengeId, mfaCode);
         setMfaModalOpen(false);
         if (pendingAction) await executeAction(pendingAction);
     } catch (err: any) {
         toast({ title: "Verification Failed", description: "Invalid code.", variant: "destructive" });
     } finally {
         setMfaLoading(false);
     }
  };

  const onAddSubmit = async () => {
      if (!newDomain || !newOrgName) return;
      const requiresMfa = await checkStepUpMfa({ action: "ADD", domain: newDomain, orgName: newOrgName });
      if (!requiresMfa) await executeAction({ action: "ADD", domain: newDomain, orgName: newOrgName });
  };

  const onRemove = async (id: string) => {
      const requiresMfa = await checkStepUpMfa({ action: "REMOVE", id });
      if (!requiresMfa) await executeAction({ action: "REMOVE", id });
  };

  const onToggle = async (id: string, currentStatus: boolean) => {
      // Toggling disables sessions, maybe require MFA? Let's just execute directly for toggle, only add/remove needs MFA.
      const requiresMfa = await checkStepUpMfa({ action: "TOGGLE", id, currentStatus });
      if (!requiresMfa) await executeAction({ action: "TOGGLE", id, currentStatus });
  };

  return (
    <div className="space-y-6 pb-20">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-card p-6 rounded-xl border border-border/50 shadow-sm">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Shield className="h-5 w-5 text-[#c9a84c]" /> Organization Access
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Manage approved enterprise domains. Only users from these verified domains can authenticate into the MOAT workspace.
          </p>
        </div>
        <button 
          onClick={() => setIsAddModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-[#c9a84c] text-white rounded-lg text-sm font-semibold hover:bg-[#b8921e] transition-colors"
        >
          <Plus className="h-4 w-4" /> Add Domain
        </button>
      </div>

      {/* List */}
      <div className="bg-card border border-border/50 rounded-xl overflow-hidden shadow-sm">
         <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
               <thead className="bg-muted/30 text-muted-foreground text-xs uppercase font-semibold">
                  <tr>
                     <th className="px-6 py-4">Domain</th>
                     <th className="px-6 py-4">Organization</th>
                     <th className="px-6 py-4">Status</th>
                     <th className="px-6 py-4">Users</th>
                     <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
               </thead>
               <tbody className="divide-y divide-border/40">
                  {loading ? (
                      <tr><td colSpan={5} className="p-8 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto text-[#c9a84c]" /></td></tr>
                  ) : domains.map((d: any) => (
                      <tr key={d.id} className="hover:bg-muted/10 transition-colors">
                          <td className="px-6 py-4 font-medium">{d.domain}</td>
                          <td className="px-6 py-4">{d.organizationName}</td>
                          <td className="px-6 py-4">
                              <Badge variant="outline" className={d.isEnabled ? "border-emerald-500/30 text-emerald-600 bg-emerald-500/10" : "border-red-500/30 text-red-600 bg-red-500/10"}>
                                  {d.isEnabled ? "Enabled" : "Disabled"}
                              </Badge>
                          </td>
                          <td className="px-6 py-4 text-muted-foreground">{d.userCount}</td>
                          <td className="px-6 py-4 text-right space-x-2">
                              <button onClick={() => onToggle(d.id, d.isEnabled)} disabled={processing} className="p-2 text-muted-foreground hover:text-foreground bg-muted/30 rounded-lg transition-colors" title={d.isEnabled ? "Disable Domain" : "Enable Domain"}>
                                  <Power className="h-4 w-4" />
                              </button>
                              <button onClick={() => onRemove(d.id)} disabled={processing} className="p-2 text-red-500/70 hover:text-red-500 bg-red-500/10 rounded-lg transition-colors" title="Remove Domain">
                                  <Trash2 className="h-4 w-4" />
                              </button>
                          </td>
                      </tr>
                  ))}
                  {!loading && domains.length === 0 && (
                      <tr><td colSpan={5} className="p-8 text-center text-muted-foreground">No domains configured.</td></tr>
                  )}
               </tbody>
            </table>
         </div>
      </div>

      {/* Add Modal */}
      <AnimatePresence>
        {isAddModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-card border border-border rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
               <div className="flex justify-between items-center p-4 border-b border-border/50">
                  <h3 className="font-semibold text-lg">Add Enterprise Domain</h3>
                  <button onClick={() => setIsAddModalOpen(false)} className="text-muted-foreground hover:text-foreground"><XCircle className="h-5 w-5" /></button>
               </div>
               <div className="p-6 space-y-4">
                  <div>
                      <label className="block text-sm font-medium mb-1">Organization Name</label>
                      <input type="text" value={newOrgName} onChange={e => setNewOrgName(e.target.value)} placeholder="e.g. Rezliyens" className="w-full bg-background border border-border rounded-lg px-4 py-2 focus:border-[#c9a84c] focus:outline-none" />
                  </div>
                  <div>
                      <label className="block text-sm font-medium mb-1">Domain</label>
                      <input type="text" value={newDomain} onChange={e => setNewDomain(e.target.value)} placeholder="e.g. rezliyens.com" className="w-full bg-background border border-border rounded-lg px-4 py-2 focus:border-[#c9a84c] focus:outline-none" />
                  </div>
               </div>
               <div className="p-4 border-t border-border/50 flex justify-end gap-3 bg-muted/10">
                  <button onClick={() => setIsAddModalOpen(false)} className="px-4 py-2 bg-muted rounded-lg text-sm font-medium">Cancel</button>
                  <button onClick={onAddSubmit} disabled={processing || !newDomain || !newOrgName} className="px-4 py-2 bg-[#c9a84c] text-white rounded-lg text-sm font-bold hover:bg-[#b8921e] disabled:opacity-50">
                      Add Domain
                  </button>
               </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MFA Modal */}
      <AnimatePresence>
        {mfaModalOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-card border border-border rounded-xl shadow-2xl w-full max-w-sm overflow-hidden">
               <div className="p-6 text-center">
                   <div className="w-12 h-12 bg-orange-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Key className="h-6 w-6 text-orange-500" />
                   </div>
                   <h3 className="text-lg font-bold">Step-Up Authentication</h3>
                   <p className="text-sm text-muted-foreground mt-2 mb-6">
                       This is a highly sensitive change. Please verify your identity with your authenticator app.
                   </p>
                   <input type="text" placeholder="6-digit code" maxLength={6} value={mfaCode} onChange={e => setMfaCode(e.target.value)} className="w-full bg-background border border-border rounded-lg px-4 py-3 text-center text-xl tracking-[0.5em] font-mono focus:outline-none focus:border-[#c9a84c] mb-6" />
                   <div className="flex gap-3">
                      <button onClick={() => { setMfaModalOpen(false); setPendingAction(null); }} className="flex-1 px-4 py-2 bg-muted rounded-lg text-sm font-semibold">Cancel</button>
                      <button onClick={handleMfaVerify} disabled={mfaLoading || mfaCode.length < 6} className="flex-1 px-4 py-2 bg-[#c9a84c] text-white rounded-lg text-sm font-bold disabled:opacity-50">
                          {mfaLoading ? "Verifying..." : "Verify"}
                      </button>
                   </div>
               </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
