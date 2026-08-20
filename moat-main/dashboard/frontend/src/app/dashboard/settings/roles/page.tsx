"use client";

import { useState, useEffect } from "react";
import { ShieldCheck, Plus, Check, Pencil, Loader2, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { useToast } from "@/components/ui/toast";

export default function RolesManagementPage() {
  const [roles, setRoles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  
  const [roleName, setRoleName] = useState("");
  const [description, setDescription] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  
  const { toast } = useToast();

  const fetchRoles = async () => {
    try {
      const res = await fetch("/api/roles");
      if (res.ok) {
        const data = await res.json();
        setRoles(data);
      }
    } catch (err) {
      console.error("Failed to fetch roles", err);
    } finally {
      setLoading(false);
    }
  };

  const modules = ["Patent Dashboard", "Trademarks", "User Management", "Settings"];
  const perms = ["Read", "Write", "Delete", "Export", "Approve"];

  // Default fallback matrix
  const defaultMatrix: Record<string, Record<string, boolean>> = {
    "Patent Dashboard": { "Read": true, "Write": true, "Delete": false, "Export": true, "Approve": true },
    "Trademarks": { "Read": true, "Write": false, "Delete": false, "Export": false, "Approve": false },
    "User Management": { "Read": false, "Write": false, "Delete": false, "Export": false, "Approve": false },
    "Settings": { "Read": false, "Write": false, "Delete": false, "Export": false, "Approve": false },
  };

  const [matrix, setMatrix] = useState<Record<string, Record<string, boolean>>>(defaultMatrix);
  const [savingMatrix, setSavingMatrix] = useState(false);

  useEffect(() => {
    fetchRoles();
    fetchMatrix();
  }, []);

  const fetchMatrix = async () => {
    try {
      const res = await fetch("/api/settings/permissions");
      const data = await res.json();
      if (data.data) {
        // Ensure missing modules/perms don't crash UI
        const mergedMatrix = { ...defaultMatrix };
        for (const m of modules) {
          if (data.data[m]) {
            mergedMatrix[m] = { ...defaultMatrix[m], ...data.data[m] };
          }
        }
        setMatrix(mergedMatrix);
      }
    } catch (err) {
      console.error("Failed to fetch matrix", err);
    }
  };

  const togglePermission = (mod: string, perm: string) => {
    setMatrix(prev => ({
      ...prev,
      [mod]: {
        ...prev[mod],
        [perm]: !prev[mod][perm]
      }
    }));
  };

  const handleSaveMatrix = async () => {
    setSavingMatrix(true);
    try {
      const res = await fetch("/api/settings/permissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ matrix })
      });

      if (!res.ok) throw new Error("Failed to save to database");

      toast({
        title: "Matrix Saved",
        description: "Permission matrix configuration stored successfully.",
      });
    } catch (err: any) {
      toast({
        title: "Error saving matrix",
        description: err.message || "Failed to persist to database.",
        variant: "destructive"
      });
    } finally {
      setSavingMatrix(false);
    }
  };

  const handleCreateRole = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setIsCreating(true);

    try {
      const res = await fetch("/api/roles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role_name: roleName, description }),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorMsg(data.detail || "Failed to create role.");
      } else {
        setIsModalOpen(false);
        setRoleName("");
        setDescription("");
        toast({ title: "Custom Role Created", description: data.detail });
        fetchRoles();
      }
    } catch (err) {
      setErrorMsg("An unexpected error occurred.");
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-foreground">Roles & Permissions</h2>
          <p className="text-sm text-muted-foreground">Configure RBAC and permission matrices.</p>
        </div>
        <div className="flex items-center gap-3">
          <Link 
            href="/dashboard/settings/access-review"
            className="flex items-center gap-2 bg-muted hover:bg-muted/80 text-foreground px-4 py-2 rounded-xl text-sm font-medium transition-all border border-border"
          >
            <ShieldCheck className="h-4 w-4" /> Access Review
          </Link>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 bg-background hover:bg-muted text-foreground px-4 py-2 rounded-xl text-sm font-medium transition-all border border-border"
          >
            <Plus className="h-4 w-4" /> Custom Role
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Side: Roles List */}
        <div className="col-span-1 space-y-3">
          {loading ? (
            <div className="p-8 flex justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-[#c9a84c]" />
            </div>
          ) : (
            roles.map((r) => (
              <div key={r.id || r.name} className="group p-4 rounded-xl border border-border bg-card hover:bg-muted/30 transition-all cursor-pointer relative overflow-hidden">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-[#c9a84c]" />
                    <span className="font-medium text-foreground text-sm">{r.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">{r.type}</span>
                    <button className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground">
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-2">{r.users} assigned users</p>
                {r.description && <p className="text-xs text-muted-foreground mt-1 truncate">{r.description}</p>}
              </div>
            ))
          )}
        </div>

        {/* Right Side: Matrix */}
        <div className="col-span-1 lg:col-span-2 rounded-2xl border border-border bg-card overflow-hidden p-6 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-foreground">Global Matrix Preview</h3>
            <button className="flex items-center gap-2 px-3 py-1.5 bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground border border-border rounded-lg text-xs font-semibold transition-all">
              <Pencil className="h-3 w-3" /> Edit Mode
            </button>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="border-b border-border text-muted-foreground">
                  <th className="py-3 px-4 font-medium">Module</th>
                  {perms.map(p => <th key={p} className="py-3 px-4 text-center font-medium">{p}</th>)}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {modules.map(m => (
                  <tr key={m} className="hover:bg-muted/10 transition-colors">
                    <td className="py-4 px-4 text-foreground font-medium">{m}</td>
                    {perms.map(p => (
                      <td key={p} className="py-4 px-4 text-center">
                        <div 
                          onClick={() => togglePermission(m, p)}
                          className={`mx-auto h-5 w-5 rounded border flex items-center justify-center cursor-pointer transition-colors ${
                          matrix[m]?.[p]
                            ? "bg-[#c9a84c] border-[#c9a84c] text-primary-foreground"
                            : "bg-background border-border hover:border-[#c9a84c]/50"
                        }`}>
                          {matrix[m]?.[p] && <Check className="h-3 w-3" />}
                        </div>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-6 flex justify-end gap-3">
            <button 
              onClick={() => fetchMatrix()}
              disabled={savingMatrix}
              className="bg-background border border-border hover:bg-muted text-foreground px-6 py-2 rounded-xl text-sm font-semibold transition-all disabled:opacity-50"
            >
              Reset
            </button>
            <button 
              onClick={handleSaveMatrix}
              disabled={savingMatrix}
              className="flex items-center gap-2 bg-[#c9a84c] hover:bg-[#b8921e] text-white px-6 py-2 rounded-xl text-sm font-bold transition-all shadow-md shadow-[#c9a84c]/20 disabled:opacity-50"
            >
              {savingMatrix ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Save Matrix
            </button>
          </div>
        </div>
      </div>

      {/* Create Role Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
            >
              <div className="flex justify-between items-center p-6 border-b border-border">
                <h3 className="text-lg font-bold text-foreground">Create Custom Role</h3>
                <button onClick={() => setIsModalOpen(false)} className="text-muted-foreground hover:text-foreground transition-colors">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleCreateRole} className="p-6 space-y-4">
                {errorMsg && (
                  <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-500 dark:text-red-400 text-sm">
                    {errorMsg}
                  </div>
                )}

                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Role Name</label>
                  <input 
                    type="text" 
                    required 
                    value={roleName}
                    onChange={(e) => setRoleName(e.target.value)}
                    placeholder="e.g. External Counsel"
                    className="w-full bg-background border border-border rounded-xl px-4 py-2 text-sm text-foreground focus:outline-none focus:border-[#c9a84c]/50"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Description (Optional)</label>
                  <textarea 
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={3}
                    placeholder="Brief description of the role's purpose..."
                    className="w-full bg-background border border-border rounded-xl px-4 py-2 text-sm text-foreground focus:outline-none focus:border-[#c9a84c]/50"
                  />
                </div>

                <div className="pt-4 flex justify-end gap-3">
                  <button 
                    type="button" 
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    disabled={isCreating || !roleName}
                    className="flex items-center gap-2 bg-[#c9a84c] hover:bg-[#b8921e] text-white px-5 py-2 rounded-xl text-sm font-bold transition-all disabled:opacity-50"
                  >
                    {isCreating ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                    Create Role
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
