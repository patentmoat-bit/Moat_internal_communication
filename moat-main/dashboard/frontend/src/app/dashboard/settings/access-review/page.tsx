"use client";

import { useState, useEffect } from "react";
import { ShieldAlert, ShieldCheck, UserCheck, UserX, AlertTriangle, Activity, Search, Filter, Loader2, X, AlertCircle, Users, Key } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useToast } from "@/components/ui/toast";
import { MFAService } from "@/services/iam/MFAService";

export default function AccessReviewPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [search, setSearch] = useState("");
  const [filterRole, setFilterRole] = useState("ALL");
  const [filterRisk, setFilterRisk] = useState("ALL");
  
  const [reason, setReason] = useState("");
  const [processing, setProcessing] = useState(false);
  
  // Step-Up MFA state
  const [mfaModalOpen, setMfaModalOpen] = useState(false);
  const [mfaCode, setMfaCode] = useState("");
  const [mfaFactorId, setMfaFactorId] = useState("");
  const [mfaChallengeId, setMfaChallengeId] = useState("");
  const [pendingAction, setPendingAction] = useState<any>(null);
  const [mfaLoading, setMfaLoading] = useState(false);

  const { toast } = useToast();

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/access-review");
      const json = await res.json();
      if (res.ok && json.success) {
        setData(json.data);
      } else {
        toast({ title: "Error loading access review", description: json.error, variant: "destructive" });
      }
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const checkStepUpMfa = async (actionData: any) => {
     // If changing role to Admin/super_admin or granting admin-like permissions, require MFA
     const isPrivileged = (actionData.actionType === "CHANGE_ROLE" && (actionData.newRole === "Admin" || actionData.newRole === "super_admin")) ||
                          (actionData.actionType === "MODIFY_PERMISSION" && actionData.permissionAction === "GRANT" && (actionData.permission.startsWith("admin:") || actionData.permission.startsWith("users:")));

     if (isPrivileged) {
         setProcessing(true);
         try {
             const factors = await MFAService.listFactors();
             const totpFactor = factors.totp[0];
             if (!totpFactor) {
                 toast({ title: "MFA Required", description: "You must enroll in MFA before performing privileged actions.", variant: "destructive" });
                 setProcessing(false);
                 return false;
             }
             const challenge = await MFAService.challengeTOTP(totpFactor.id);
             setMfaFactorId(totpFactor.id);
             setMfaChallengeId(challenge.id);
             setPendingAction(actionData);
             setMfaModalOpen(true);
             setProcessing(false);
             return true; // MFA required, action is paused
         } catch (err: any) {
             toast({ title: "MFA Error", description: err.message, variant: "destructive" });
             setProcessing(false);
             return false;
         }
     }
     return false; // No MFA required
  };

  const executeAction = async (actionData: any) => {
    setProcessing(true);
    try {
      const res = await fetch(`/api/admin/access-review/${actionData.userId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(actionData)
      });
      const json = await res.json();
      if (res.ok && json.success) {
        toast({ title: "Success", description: "Action completed successfully." });
        setReason("");
        fetchData();
        
        if (selectedUser) {
           const updatedUsers = await fetch("/api/admin/access-review").then(r => r.json());
           if (updatedUsers.success) {
              setData(updatedUsers.data);
              const u = updatedUsers.data.users.find((u: any) => u.id === actionData.userId);
              if (u) setSelectedUser(u);
           }
        }
      } else {
        toast({ title: "Error", description: json.error, variant: "destructive" });
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
         // Once verified, proceed with original action
         if (pendingAction) {
             await executeAction(pendingAction);
         }
     } catch (err: any) {
         toast({ title: "Verification Failed", description: "Invalid code.", variant: "destructive" });
     } finally {
         setMfaLoading(false);
     }
  };

  const handleRoleChange = async (userId: string, newRole: string) => {
    if (!reason) return toast({ title: "Reason required", description: "Please provide a reason.", variant: "destructive" });
    
    const actionData = { actionType: "CHANGE_ROLE", userId, newRole, reason };
    const requiresMfa = await checkStepUpMfa(actionData);
    if (!requiresMfa) {
       await executeAction(actionData);
    }
  };

  const handlePermissionModify = async (userId: string, permission: string, action: string) => {
    if (!reason) return toast({ title: "Reason required", description: "Please provide a reason.", variant: "destructive" });
    
    const actionData = { actionType: "MODIFY_PERMISSION", userId, permission, permissionAction: action, reason };
    const requiresMfa = await checkStepUpMfa(actionData);
    if (!requiresMfa) {
       await executeAction(actionData);
    }
  };

  const filteredUsers = data?.users?.filter((u: any) => {
    const matchesSearch = u.name?.toLowerCase().includes(search.toLowerCase()) || u.email?.toLowerCase().includes(search.toLowerCase());
    const matchesRole = filterRole === "ALL" || u.role === filterRole;
    const matchesRisk = filterRisk === "ALL" || u.riskLevel === filterRisk;
    return matchesSearch && matchesRole && matchesRisk;
  }) || [];

  if (loading && !data) {
    return <div className="p-12 flex justify-center"><Loader2 className="h-8 w-8 animate-spin text-[#c9a84c]" /></div>;
  }

  return (
    <div className="space-y-6 pb-24">
      <div>
        <h2 className="text-xl font-bold text-foreground">Access Review & Permissions</h2>
        <p className="text-sm text-muted-foreground">Centrally review user access, detect excessive permissions, and manage roles.</p>
      </div>

      {data?.stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard title="Total Users" value={data.stats.totalUsers} icon={Users} />
          <StatCard title="Active / Inactive" value={`${data.stats.activeUsers} / ${data.stats.inactiveUsers}`} icon={Activity} />
          <StatCard title="Privileged Admins" value={data.stats.adminUsers} icon={ShieldCheck} />
          <StatCard title="High Risk Users" value={data.stats.highRiskUsers} icon={AlertTriangle} color="text-red-500" />
        </div>
      )}

      <div className="bg-card border border-border rounded-xl p-4 flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input 
            type="text" 
            placeholder="Search users..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-background border border-border rounded-lg pl-9 pr-4 py-2 text-sm focus:outline-none focus:border-[#c9a84c]"
          />
        </div>
        <div className="flex gap-4 w-full md:w-auto">
          <select value={filterRole} onChange={(e) => setFilterRole(e.target.value)} className="bg-background border border-border rounded-lg px-4 py-2 text-sm focus:outline-none">
            <option value="ALL">All Roles</option>
            <option value="Admin">Admin</option>
            <option value="Patent Analyst">Patent Analyst</option>
            <option value="Patent Drafter">Patent Drafter</option>
            <option value="Finance Manager">Finance Manager</option>
            <option value="Design Team">Design Team</option>
            <option value="viewer">Viewer</option>
          </select>
          <select value={filterRisk} onChange={(e) => setFilterRisk(e.target.value)} className="bg-background border border-border rounded-lg px-4 py-2 text-sm focus:outline-none">
            <option value="ALL">All Risk Levels</option>
            <option value="LOW">Low Risk</option>
            <option value="MEDIUM">Medium Risk</option>
            <option value="HIGH">High Risk</option>
            <option value="CRITICAL">Critical Risk</option>
          </select>
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-muted/50 border-b border-border text-muted-foreground">
              <tr>
                <th className="py-3 px-4 font-medium">User</th>
                <th className="py-3 px-4 font-medium">Role</th>
                <th className="py-3 px-4 font-medium">Status</th>
                <th className="py-3 px-4 font-medium">MFA</th>
                <th className="py-3 px-4 font-medium">Risk Level</th>
                <th className="py-3 px-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredUsers.map((u: any) => (
                <tr key={u.id} className="hover:bg-muted/30 transition-colors">
                  <td className="py-3 px-4">
                    <div className="font-medium text-foreground">{u.name || "Unknown"}</div>
                    <div className="text-xs text-muted-foreground">{u.email}</div>
                  </td>
                  <td className="py-3 px-4"><span className="px-2 py-1 bg-muted rounded text-xs font-medium">{u.role}</span></td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${u.status === 'Active' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                      {u.status}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    {u.mfaEnabled ? <ShieldCheck className="h-4 w-4 text-green-500" /> : <ShieldAlert className="h-4 w-4 text-yellow-500" />}
                  </td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-1 rounded text-xs font-bold ${
                      u.riskLevel === 'CRITICAL' ? 'bg-red-500 text-white' : 
                      u.riskLevel === 'HIGH' ? 'bg-orange-500 text-white' : 
                      u.riskLevel === 'MEDIUM' ? 'bg-yellow-500/20 text-yellow-500' : 'text-green-500'
                    }`}>
                      {u.riskLevel}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <button onClick={() => setSelectedUser(u)} className="text-[#c9a84c] hover:underline text-xs font-semibold">
                      Review Access
                    </button>
                  </td>
                </tr>
              ))}
              {filteredUsers.length === 0 && (
                <tr><td colSpan={6} className="py-8 text-center text-muted-foreground">No users match filters.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <AnimatePresence>
        {selectedUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col"
            >
              <div className="flex justify-between items-center p-6 border-b border-border">
                <div>
                  <h3 className="text-xl font-bold text-foreground">{selectedUser.name} - Access Details</h3>
                  <p className="text-sm text-muted-foreground">{selectedUser.email}</p>
                </div>
                <button onClick={() => { setSelectedUser(null); setReason(""); }} className="text-muted-foreground hover:text-foreground">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="p-6 overflow-y-auto space-y-6 flex-1">
                
                {selectedUser.riskReasons.length > 0 && (
                  <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4">
                    <h4 className="flex items-center gap-2 text-red-500 font-bold mb-2"><AlertCircle className="h-5 w-5" /> Risk Analysis Detected Issues</h4>
                    <ul className="list-disc list-inside text-sm text-red-500/80 space-y-1">
                      {selectedUser.riskReasons.map((r: string, i: number) => <li key={i}>{r}</li>)}
                    </ul>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h4 className="font-bold border-b border-border pb-2">Identity Info</h4>
                    <div className="text-sm space-y-2">
                      <p><span className="text-muted-foreground w-24 inline-block">Role:</span> <span className="font-medium text-foreground">{selectedUser.role}</span></p>
                      <p><span className="text-muted-foreground w-24 inline-block">Status:</span> <span>{selectedUser.status}</span></p>
                      <p><span className="text-muted-foreground w-24 inline-block">MFA:</span> <span>{selectedUser.mfaEnabled ? "Enabled" : "Disabled"}</span></p>
                      <p><span className="text-muted-foreground w-24 inline-block">Last Login:</span> <span>{new Date(selectedUser.last_login).toLocaleString()}</span></p>
                    </div>

                    <div className="pt-4 space-y-2 border-t border-border">
                      <h4 className="font-bold text-sm">Change Role</h4>
                      <select id="newRoleSelect" className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none mb-2" defaultValue={selectedUser.role}>
                        <option value="Admin">Admin</option>
                        <option value="Patent Analyst">Patent Analyst</option>
                        <option value="Patent Drafter">Patent Drafter</option>
                        <option value="Finance Manager">Finance Manager</option>
                        <option value="Design Team">Design Team</option>
                        <option value="viewer">Viewer</option>
                      </select>
                      <input type="text" placeholder="Reason for change..." value={reason} onChange={e => setReason(e.target.value)} className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none" />
                      <button 
                        onClick={() => handleRoleChange(selectedUser.id, (document.getElementById('newRoleSelect') as HTMLSelectElement).value)}
                        disabled={processing}
                        className="w-full bg-[#c9a84c] text-white py-2 rounded-lg font-bold text-sm hover:bg-[#b8921e] disabled:opacity-50"
                      >
                        {processing ? "Processing..." : "Update Role"}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h4 className="font-bold border-b border-border pb-2">Effective Permissions</h4>
                    <div className="h-64 overflow-y-auto pr-2 space-y-2">
                      {selectedUser.permissions.map((p: any) => (
                        <div key={p.action} className="flex items-center justify-between p-2 rounded border border-border bg-muted/20">
                          <div>
                            <div className="text-sm font-medium">{p.action}</div>
                            <div className="text-[10px] text-muted-foreground uppercase">{p.source}</div>
                          </div>
                          {p.source.startsWith("Direct-") ? (
                            <button onClick={() => handlePermissionModify(selectedUser.id, p.action, "RESET")} className="text-xs text-red-500 font-bold px-2 py-1 hover:bg-red-500/10 rounded">Reset</button>
                          ) : (
                            <button onClick={() => handlePermissionModify(selectedUser.id, p.action, "REVOKE")} className="text-xs text-orange-500 font-bold px-2 py-1 hover:bg-orange-500/10 rounded">Revoke</button>
                          )}
                        </div>
                      ))}
                    </div>
                    
                    <div className="border-t border-border pt-4">
                       <h4 className="font-bold text-sm mb-2">Grant Additional Permission</h4>
                       <div className="flex gap-2">
                         <input id="grantPermInput" type="text" placeholder="e.g. admin:full" className="flex-1 bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none" />
                         <button onClick={() => handlePermissionModify(selectedUser.id, (document.getElementById('grantPermInput') as HTMLInputElement).value, "GRANT")} className="bg-black dark:bg-white text-white dark:text-black px-4 py-2 rounded-lg text-sm font-bold">Grant</button>
                       </div>
                    </div>
                  </div>
                </div>

              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {mfaModalOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              className="bg-card border border-border rounded-xl shadow-2xl w-full max-w-sm overflow-hidden"
            >
               <div className="p-6 text-center">
                   <div className="w-12 h-12 bg-orange-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Key className="h-6 w-6 text-orange-500" />
                   </div>
                   <h3 className="text-lg font-bold">Step-Up Authentication Required</h3>
                   <p className="text-sm text-muted-foreground mt-2 mb-6">
                       You are attempting to grant highly privileged access. Please enter your authenticator code to proceed.
                   </p>
                   <input 
                      type="text" 
                      placeholder="6-digit code" 
                      maxLength={6}
                      value={mfaCode}
                      onChange={e => setMfaCode(e.target.value)}
                      className="w-full bg-background border border-border rounded-lg px-4 py-3 text-center text-xl tracking-[0.5em] font-mono focus:outline-none focus:border-[#c9a84c] mb-6"
                   />
                   <div className="flex gap-3">
                      <button onClick={() => { setMfaModalOpen(false); setPendingAction(null); }} className="flex-1 px-4 py-2 bg-muted hover:bg-muted/80 rounded-lg text-sm font-semibold">Cancel</button>
                      <button onClick={handleMfaVerify} disabled={mfaLoading || mfaCode.length < 6} className="flex-1 px-4 py-2 bg-[#c9a84c] text-white rounded-lg text-sm font-bold hover:bg-[#b8921e] disabled:opacity-50">
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

function StatCard({ title, value, icon: Icon, color = "text-[#c9a84c]" }: { title: string, value: string | number, icon: any, color?: string }) {
  return (
    <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-4 shadow-sm">
      <div className={`p-3 rounded-lg bg-muted ${color}`}><Icon className="h-6 w-6" /></div>
      <div>
        <p className="text-sm text-muted-foreground">{title}</p>
        <p className="text-2xl font-bold text-foreground">{value}</p>
      </div>
    </div>
  );
}
