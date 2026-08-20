"use client";

import { useState, useEffect } from "react";
import { Plus, Search, Filter, MoreVertical, ShieldCheck, X, Loader2, Edit, Trash2, Key, Smartphone, Lock, Monitor, ShieldAlert, PowerOff, Activity, AlertTriangle, Eye, Shield } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

export default function UserManagementPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [rolesList, setRolesList] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  
  // Enterprise Security Actions State
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [actionToConfirm, setActionToConfirm] = useState<{ type: string; title: string; desc: string; target: any } | null>(null);
  const [isProcessingAction, setIsProcessingAction] = useState(false);
  
  const [isSecurityModalOpen, setIsSecurityModalOpen] = useState(false);
  const [isActivityModalOpen, setIsActivityModalOpen] = useState(false);
  const [userActivity, setUserActivity] = useState<any[]>([]);
  const [activityLoading, setActivityLoading] = useState(false);

  // Form State
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("Patent Analyst");
  const [department, setDepartment] = useState("");
  const [status, setStatus] = useState("Active");
  const [errorMsg, setErrorMsg] = useState("");

  const fetchUsers = async () => {
    try {
      const res = await fetch("/api/users", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        setUsers(data);
      }
    } catch (err) {
      console.error("Failed to fetch users", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchRoles = async () => {
    try {
      const res = await fetch("/api/roles", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        setRolesList(data);
      }
    } catch (err) {
      console.error("Failed to fetch roles", err);
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchRoles();
  }, []);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setIsCreating(true);

    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password, role, department }),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorMsg(data.detail || "Failed to create user.");
      } else {
        setIsModalOpen(false);
        // Reset form
        setName("");
        setEmail("");
        setPassword("");
        setRole("Patent Analyst");
        setDepartment("");
        // Refresh users
        fetchUsers();
      }
    } catch (err) {
      setErrorMsg("An unexpected error occurred.");
    } finally {
      setIsCreating(false);
    }
  };

  const handleEditClick = (user: any) => {
    setEditingUserId(user.id);
    setName(user.name);
    setEmail(user.email);
    setRole(user.role);
    setDepartment(user.department);
    setStatus(user.status);
    setErrorMsg("");
    setIsEditModalOpen(true);
  };

  const handleDeleteClick = (user: any) => {
    setEditingUserId(user.id);
    setErrorMsg("");
    setIsDeleteModalOpen(true);
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUserId) return;
    setErrorMsg("");
    setIsUpdating(true);

    try {
      const res = await fetch(`/api/users/${editingUserId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, role, department, status }),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorMsg(data.detail || "Failed to update user.");
      } else {
        setIsEditModalOpen(false);
        fetchUsers();
      }
    } catch (err) {
      setErrorMsg("An unexpected error occurred.");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!editingUserId) return;
    setErrorMsg("");
    setIsDeleting(true);

    try {
      const res = await fetch(`/api/users/${editingUserId}`, {
        method: "DELETE",
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorMsg(data.detail || data.error || data.message || JSON.stringify(data) || "Failed to delete user.");
      } else {
        setIsDeleteModalOpen(false);
        fetchUsers();
      }
    } catch (err) {
      setErrorMsg("An unexpected error occurred.");
    } finally {
      setIsDeleting(false);
    }
  };

  const confirmAction = (type: string, title: string, desc: string, user: any) => {
    setErrorMsg("");
    setActionToConfirm({ type, title, desc, target: user });
  };

  const handleAdminAction = async () => {
    if (!actionToConfirm) return;
    setErrorMsg("");
    setIsProcessingAction(true);

    try {
      const res = await fetch(`/api/users/${actionToConfirm.target.id}/actions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: actionToConfirm.type }),
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.detail || "Failed to perform action.");
      } else {
        setActionToConfirm(null);
        fetchUsers();
      }
    } catch (err) {
      setErrorMsg("An unexpected error occurred.");
    } finally {
      setIsProcessingAction(false);
    }
  };

  const openSecurityOverview = (user: any) => {
     setSelectedUser(user);
     setIsSecurityModalOpen(true);
  };

  const viewUserActivity = async (user: any) => {
     setSelectedUser(user);
     setIsActivityModalOpen(true);
     setActivityLoading(true);
     try {
       const res = await fetch(`/api/users/${user.id}/activity`);
       const data = await res.json();
       if (res.ok) {
         setUserActivity(data);
       }
     } catch (e) {
       console.error("Failed to load activity");
     } finally {
       setActivityLoading(false);
     }
  };

  const filteredUsers = users.filter((u) => 
    u.name.toLowerCase().includes(search.toLowerCase()) || 
    u.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-foreground">User Management</h2>
          <p className="text-sm text-muted-foreground">Manage enterprise users and roles.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 bg-[#c9a84c] hover:bg-[#b8921e] text-white px-4 py-2 rounded-xl text-sm font-bold transition-all shadow-lg shadow-[#c9a84c]/20"
        >
          <Plus className="h-4 w-4" /> Create User
        </button>
      </div>

      <div className="flex gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search users by name or email..."
            className="w-full bg-background border border-border rounded-xl pl-10 pr-4 py-2 text-sm text-foreground focus:outline-none focus:border-[#c9a84c]/50 focus:ring-1 focus:ring-[#c9a84c]/50 transition-all"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <button className="flex items-center gap-2 bg-background border border-border text-foreground px-4 py-2 rounded-xl text-sm hover:bg-muted transition-all">
          <Filter className="h-4 w-4" /> Filters
        </button>
      </div>

      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        <table className="w-full text-sm text-left">
          <thead className="bg-muted/50 border-b border-border text-muted-foreground">
            <tr>
              <th className="px-6 py-4 font-medium">User</th>
              <th className="px-6 py-4 font-medium">Role</th>
              <th className="px-6 py-4 font-medium">Department</th>
              <th className="px-6 py-4 font-medium">Status</th>
              <th className="px-6 py-4 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {loading ? (
              <tr>
                <td colSpan={5} className="py-12 text-center">
                  <Loader2 className="h-8 w-8 animate-spin text-[#c9a84c] mx-auto" />
                </td>
              </tr>
            ) : filteredUsers.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-12 text-center text-muted-foreground">
                  No users found matching your search.
                </td>
              </tr>
            ) : (
              filteredUsers.map((u) => (
                <tr key={u.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-[#c9a84c]/10 flex items-center justify-center font-bold text-[#c9a84c] border border-[#c9a84c]/20">
                        {u.name.charAt(0)}
                      </div>
                      <div>
                        <div className="font-medium text-foreground">{u.name}</div>
                        <div className="text-xs text-muted-foreground">{u.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-indigo-500/10 text-indigo-500 dark:text-indigo-400 text-xs font-medium border border-indigo-500/20">
                      <ShieldCheck className="h-3 w-3" /> {u.role}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-muted-foreground">{u.department}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                      u.status === "Active" 
                        ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20" 
                        : "bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20"
                    }`}>
                      {u.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className="p-2 hover:bg-muted rounded-lg text-muted-foreground hover:text-foreground transition-colors outline-none">
                          <MoreVertical className="h-4 w-4" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-56 border-border bg-card">
                        <DropdownMenuItem onClick={() => handleEditClick(u)} className="cursor-pointer text-sm font-medium">
                          <Edit className="h-4 w-4 mr-2 text-muted-foreground" /> Edit User
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => openSecurityOverview(u)} className="cursor-pointer text-sm font-medium">
                          <ShieldAlert className="h-4 w-4 mr-2 text-muted-foreground" /> Security Overview
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => viewUserActivity(u)} className="cursor-pointer text-sm font-medium">
                          <Activity className="h-4 w-4 mr-2 text-muted-foreground" /> View User Activity
                        </DropdownMenuItem>
                        <div className="h-px bg-border my-1"></div>
                        <DropdownMenuItem onClick={() => confirmAction("RESET_PASSWORD", "Reset Password", "This will revoke all sessions and force the user to set a new password on next login.", u)} className="cursor-pointer text-sm font-medium">
                          <Key className="h-4 w-4 mr-2 text-muted-foreground" /> Reset Password
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => confirmAction("RESET_MFA", "Reset MFA", "This will invalidate existing TOTP secrets. User must re-enroll during next login.", u)} className="cursor-pointer text-sm font-medium text-amber-500 hover:text-amber-600 focus:text-amber-600">
                          <Smartphone className="h-4 w-4 mr-2" /> Reset MFA
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => confirmAction("UNLOCK_ACCOUNT", "Unlock Account", "This will immediately restore access to the locked account.", u)} className="cursor-pointer text-sm font-medium">
                          <Lock className="h-4 w-4 mr-2 text-muted-foreground" /> Unlock Account
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => confirmAction("REVOKE_SESSIONS", "Revoke All Sessions", "This will forcefully sign the user out of all active devices immediately.", u)} className="cursor-pointer text-sm font-medium text-amber-500 hover:text-amber-600 focus:text-amber-600">
                          <Monitor className="h-4 w-4 mr-2" /> Revoke Sessions
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => confirmAction("FORCE_PASSWORD_CHANGE", "Force Password Change", "The user will be required to change their password upon their next login.", u)} className="cursor-pointer text-sm font-medium">
                          <Eye className="h-4 w-4 mr-2 text-muted-foreground" /> Force Password Change
                        </DropdownMenuItem>
                        <div className="h-px bg-border my-1"></div>
                        {u.status === "Active" ? (
                          <DropdownMenuItem onClick={() => confirmAction("DEACTIVATE", "Deactivate User", "This will prevent the user from logging in. Historical data is preserved.", u)} className="cursor-pointer text-sm font-medium text-red-500 hover:text-red-600 focus:text-red-600">
                            <PowerOff className="h-4 w-4 mr-2" /> Deactivate User
                          </DropdownMenuItem>
                        ) : (
                          <DropdownMenuItem onClick={() => confirmAction("ACTIVATE", "Activate User", "This will restore the user's ability to log into the platform.", u)} className="cursor-pointer text-sm font-medium text-emerald-500 hover:text-emerald-600 focus:text-emerald-600">
                            <PowerOff className="h-4 w-4 mr-2" /> Activate User
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem onClick={() => handleDeleteClick(u)} className="cursor-pointer text-sm font-medium text-red-500 hover:text-red-600 focus:text-red-600">
                          <Trash2 className="h-4 w-4 mr-2" /> Delete User
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Create User Modal */}
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
                <h3 className="text-lg font-bold text-foreground">Create Enterprise User</h3>
                <button onClick={() => setIsModalOpen(false)} className="text-muted-foreground hover:text-foreground transition-colors">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleCreateUser} className="p-6 space-y-4">
                {errorMsg && (
                  <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-500 dark:text-red-400 text-sm">
                    {errorMsg}
                  </div>
                )}

                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Full Name</label>
                  <input 
                    type="text" 
                    required 
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-background border border-border rounded-xl px-4 py-2 text-sm text-foreground focus:outline-none focus:border-[#c9a84c]/50"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Work Email</label>
                  <input 
                    type="email" 
                    required 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-background border border-border rounded-xl px-4 py-2 text-sm text-foreground focus:outline-none focus:border-[#c9a84c]/50"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Password</label>
                  <input 
                    type="text" 
                    required 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-background border border-border rounded-xl px-4 py-2 text-sm text-foreground focus:outline-none focus:border-[#c9a84c]/50"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Assigned Role</label>
                  <select 
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    className="w-full bg-background border border-border rounded-xl px-4 py-2 text-sm text-foreground focus:outline-none focus:border-[#c9a84c]/50"
                  >
                    {rolesList.length === 0 ? (
                      <option value="Patent Analyst">Patent Analyst (Default)</option>
                    ) : (
                      rolesList.map(r => (
                        <option key={r.id} value={r.name}>{r.name}</option>
                      ))
                    )}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Department (Optional)</label>
                  <input 
                    type="text" 
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
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
                    disabled={isCreating}
                    className="flex items-center gap-2 bg-[#c9a84c] hover:bg-[#b8921e] text-white px-5 py-2 rounded-xl text-sm font-bold transition-all disabled:opacity-50"
                  >
                    {isCreating ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                    Provision User
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}

        {/* Edit User Modal */}
        {isEditModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
            >
              <div className="flex justify-between items-center p-6 border-b border-border">
                <h3 className="text-lg font-bold text-foreground">Edit User</h3>
                <button onClick={() => setIsEditModalOpen(false)} className="text-muted-foreground hover:text-foreground transition-colors">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleUpdateUser} className="p-6 space-y-4">
                {errorMsg && (
                  <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-500 dark:text-red-400 text-sm">
                    {errorMsg}
                  </div>
                )}

                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Full Name</label>
                  <input 
                    type="text" 
                    required 
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-background border border-border rounded-xl px-4 py-2 text-sm text-foreground focus:outline-none focus:border-[#c9a84c]/50"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Work Email</label>
                  <input 
                    type="email" 
                    required 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-background border border-border rounded-xl px-4 py-2 text-sm text-foreground focus:outline-none focus:border-[#c9a84c]/50"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Assigned Role</label>
                  <select 
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    className="w-full bg-background border border-border rounded-xl px-4 py-2 text-sm text-foreground focus:outline-none focus:border-[#c9a84c]/50"
                  >
                    {rolesList.length === 0 ? (
                      <option value="Patent Analyst">Patent Analyst (Default)</option>
                    ) : (
                      rolesList.map(r => (
                        <option key={r.id} value={r.name}>{r.name}</option>
                      ))
                    )}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Department (Optional)</label>
                  <input 
                    type="text" 
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    className="w-full bg-background border border-border rounded-xl px-4 py-2 text-sm text-foreground focus:outline-none focus:border-[#c9a84c]/50"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Status</label>
                  <select 
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className="w-full bg-background border border-border rounded-xl px-4 py-2 text-sm text-foreground focus:outline-none focus:border-[#c9a84c]/50"
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>

                <div className="pt-4 flex justify-end gap-3">
                  <button 
                    type="button" 
                    onClick={() => setIsEditModalOpen(false)}
                    className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    disabled={isUpdating}
                    className="flex items-center gap-2 bg-[#c9a84c] hover:bg-[#b8921e] text-white px-5 py-2 rounded-xl text-sm font-bold transition-all disabled:opacity-50"
                  >
                    {isUpdating ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                    Save Changes
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {isDeleteModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden"
            >
              <div className="p-6">
                <h3 className="text-lg font-bold text-foreground mb-2">Delete User</h3>
                <p className="text-sm text-muted-foreground">
                  Are you sure you want to delete this user? This action cannot be undone.
                </p>

                {errorMsg && (
                  <div className="mt-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-500 dark:text-red-400 text-sm">
                    {errorMsg}
                  </div>
                )}
                
                <div className="mt-6 flex justify-end gap-3">
                  <button 
                    type="button" 
                    onClick={() => setIsDeleteModalOpen(false)}
                    className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={handleDeleteUser}
                    disabled={isDeleting}
                    className="flex items-center gap-2 bg-red-500 hover:bg-red-600 text-white px-5 py-2 rounded-xl text-sm font-bold transition-all disabled:opacity-50"
                  >
                    {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                    Delete
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}

        {/* Security Overview Modal */}
        {isSecurityModalOpen && selectedUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="flex justify-between items-center p-6 border-b border-border shrink-0">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-[#c9a84c]/10 flex items-center justify-center font-bold text-[#c9a84c] border border-[#c9a84c]/20">
                    {selectedUser.name.charAt(0)}
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-foreground">User Security Overview</h3>
                    <p className="text-xs text-muted-foreground">{selectedUser.email}</p>
                  </div>
                </div>
                <button onClick={() => setIsSecurityModalOpen(false)} className="text-muted-foreground hover:text-foreground transition-colors">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="p-6 overflow-y-auto custom-scrollbar space-y-6">
                
                <div className="space-y-3">
                  <h4 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Account Status</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 bg-muted/30 rounded-xl border border-border/50">
                      <div className="text-xs text-muted-foreground mb-1">Status</div>
                      <div className="font-semibold">{selectedUser.status}</div>
                    </div>
                    <div className="p-3 bg-muted/30 rounded-xl border border-border/50">
                      <div className="text-xs text-muted-foreground mb-1">Role</div>
                      <div className="font-semibold">{selectedUser.role}</div>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <h4 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Authentication Metrics</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 bg-muted/30 rounded-xl border border-border/50 flex items-start gap-3">
                      <Shield className="h-4 w-4 text-[#c9a84c] mt-0.5" />
                      <div>
                        <div className="text-xs text-muted-foreground mb-1">MFA Status</div>
                        <div className="font-semibold">{selectedUser.mfa_enabled ? 'Enrolled' : 'Not Enrolled'}</div>
                      </div>
                    </div>
                    <div className="p-3 bg-muted/30 rounded-xl border border-border/50 flex items-start gap-3">
                      <AlertTriangle className="h-4 w-4 text-red-500 mt-0.5" />
                      <div>
                        <div className="text-xs text-muted-foreground mb-1">Failed Logins</div>
                        <div className="font-semibold">{selectedUser.failed_login_attempts || 0}</div>
                      </div>
                    </div>
                    <div className="p-3 bg-muted/30 rounded-xl border border-border/50 flex items-start gap-3">
                      <Activity className="h-4 w-4 text-blue-500 mt-0.5" />
                      <div>
                        <div className="text-xs text-muted-foreground mb-1">Last Login</div>
                        <div className="font-semibold text-sm">{selectedUser.last_login ? new Date(selectedUser.last_login).toLocaleString() : 'Never'}</div>
                      </div>
                    </div>
                    <div className="p-3 bg-muted/30 rounded-xl border border-border/50 flex items-start gap-3">
                      <Lock className="h-4 w-4 text-amber-500 mt-0.5" />
                      <div>
                        <div className="text-xs text-muted-foreground mb-1">Locked Until</div>
                        <div className="font-semibold text-sm">{selectedUser.locked_until ? new Date(selectedUser.locked_until).toLocaleString() : 'Not Locked'}</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}

        {/* User Activity Timeline Modal */}
        {isActivityModalOpen && selectedUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="flex justify-between items-center p-6 border-b border-border shrink-0">
                <div>
                  <h3 className="text-lg font-bold text-foreground">User Activity Timeline</h3>
                  <p className="text-xs text-muted-foreground">Recent actions by {selectedUser.email}</p>
                </div>
                <button onClick={() => setIsActivityModalOpen(false)} className="text-muted-foreground hover:text-foreground transition-colors">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="p-0 overflow-y-auto custom-scrollbar">
                {activityLoading ? (
                  <div className="py-12 flex justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-[#c9a84c]" />
                  </div>
                ) : userActivity.length === 0 ? (
                  <div className="py-12 text-center text-muted-foreground text-sm">
                    No recent activity found.
                  </div>
                ) : (
                  <div className="divide-y divide-border/40">
                    {userActivity.map((event) => (
                      <div key={event.id} className="p-4 hover:bg-muted/10 transition-colors flex gap-4">
                        <div className="w-[120px] flex-shrink-0 pt-1 text-xs text-muted-foreground font-mono">
                          {event.timestamp}
                        </div>
                        <div className="flex gap-4 flex-1">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                  <span className="font-semibold text-sm">{event.action}</span>
                                  <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md bg-muted text-muted-foreground border border-border/50">{event.module}</span>
                              </div>
                              <div className="flex gap-3 text-xs text-muted-foreground">
                                <span>IP: {event.ip}</span>
                                <span>Status: <span className={event.status === 'Failed' ? 'text-red-500' : 'text-emerald-500'}>{event.status}</span></span>
                              </div>
                            </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}

        {/* Action Confirmation Modal */}
        {actionToConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden"
            >
              <div className="p-6">
                <div className="flex items-center gap-3 mb-2">
                  <AlertTriangle className="h-5 w-5 text-amber-500" />
                  <h3 className="text-lg font-bold text-foreground">{actionToConfirm.title}</h3>
                </div>
                <p className="text-sm text-muted-foreground mb-4">
                  {actionToConfirm.desc}
                </p>
                <div className="p-3 bg-muted/50 rounded-lg border border-border/50 text-sm mb-4">
                  Target User: <strong>{actionToConfirm.target.email}</strong>
                </div>

                {errorMsg && (
                  <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-500 dark:text-red-400 text-sm">
                    {errorMsg}
                  </div>
                )}
                
                <div className="mt-6 flex justify-end gap-3">
                  <button 
                    type="button" 
                    onClick={() => {
                        setActionToConfirm(null);
                        setErrorMsg("");
                    }}
                    className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={handleAdminAction}
                    disabled={isProcessingAction}
                    className="flex items-center gap-2 bg-[#c9a84c] hover:bg-[#b8921e] text-white px-5 py-2 rounded-xl text-sm font-bold transition-all disabled:opacity-50"
                  >
                    {isProcessingAction ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                    Confirm Action
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
