"use client";

import { useState, useEffect } from "react";
import { useAuthStore } from "@/stores/authStore";
import { User, Mail, Check, Loader2, Shield } from "lucide-react";

export default function ProfileSettingsPage() {
  const { user, updateProfile, checkAuth } = useAuthStore();
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState<{ type: "success" | "error", text: string } | null>(null);

  useEffect(() => {
    if (user) {
      setName(user.name);
      setEmail(user.email);
    } else {
      checkAuth();
    }
  }, [user, checkAuth]);

  const handleSave = async () => {
    setIsLoading(true);
    setMessage(null);
    try {
      await updateProfile({ name });
      setMessage({ type: "success", text: "Profile updated successfully." });
      setIsEditing(false);
    } catch (err: any) {
      setMessage({ type: "error", text: err.message || "Failed to update profile." });
    } finally {
      setIsLoading(false);
    }
  };

  if (!user) return (
    <div className="flex h-64 items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-[#c9a84c]" />
    </div>
  );

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      
      {/* Profile Card */}
      <div className="rounded-2xl border border-border shadow-sm bg-card overflow-hidden">
        <div className="p-6 border-b border-border/50 bg-muted/10">
          <h2 className="text-base font-bold text-foreground">Personal Information</h2>
          <p className="text-xs font-medium text-muted-foreground mt-1">Update your basic profile details.</p>
        </div>

        <div className="p-6 space-y-5">
          {message && (
            <div className={`p-3 rounded-xl border text-sm flex items-center gap-2 ${
              message.type === "success" 
                ? "bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-500/10 dark:border-emerald-500/20 dark:text-emerald-400" 
                : "bg-red-50 text-red-600 border-red-200 dark:bg-red-500/10 dark:border-red-500/20 dark:text-red-400"
            }`}>
              {message.type === "success" ? <Check className="h-4 w-4" /> : null}
              {message.text}
            </div>
          )}

          <div className="flex items-center gap-6">
            <div className="h-20 w-20 rounded-2xl bg-gradient-to-br from-[#c9a84c] to-[#8a6a1e] flex items-center justify-center text-3xl font-black text-white shadow-lg shadow-[#c9a84c]/20 border-2 border-[#c9a84c]/10 ring-4 ring-background">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <h3 className="text-xl font-bold text-foreground">{user.name}</h3>
              <div className="flex items-center gap-3 mt-1.5">
                <span className="inline-flex items-center rounded-md bg-muted px-2.5 py-1 text-xs font-bold text-foreground border border-border">
                  {user.role}
                </span>
                <span className="text-xs font-medium text-muted-foreground">Member since {new Date(user.createdAt || Date.now()).getFullYear()}</span>
              </div>
            </div>
          </div>

          <div className="space-y-5 pt-5 border-t border-border/50">
            <div className="grid gap-2 max-w-md">
              <label className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Full Name</label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={!isEditing}
                  className="w-full h-11 rounded-xl bg-background border border-border pl-11 pr-4 text-sm font-medium text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-[#c9a84c]/50 focus:ring-2 focus:ring-[#c9a84c]/20 transition-all disabled:opacity-60 disabled:bg-muted/50"
                />
              </div>
            </div>

            <div className="grid gap-2 max-w-md">
              <label className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="email"
                  value={email}
                  disabled={true}
                  className="w-full h-11 rounded-xl bg-muted/50 border border-border pl-11 pr-4 text-sm font-medium text-muted-foreground cursor-not-allowed"
                />
              </div>
              <p className="text-[10px] font-medium text-muted-foreground mt-1">Email address cannot be changed. Contact your administrator.</p>
            </div>
          </div>
        </div>

        <div className="p-4 bg-muted/10 border-t border-border/50 flex items-center justify-end gap-3">
          {!isEditing ? (
            <button
              onClick={() => setIsEditing(true)}
              className="h-9 px-5 rounded-lg bg-background hover:bg-muted border border-border text-sm font-bold text-foreground transition-all shadow-sm"
            >
              Edit Profile
            </button>
          ) : (
            <>
              <button
                onClick={() => {
                  setIsEditing(false);
                  setName(user.name);
                }}
                className="h-9 px-5 rounded-lg bg-transparent hover:bg-muted text-sm font-bold text-muted-foreground hover:text-foreground transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={isLoading}
                className="h-9 px-5 rounded-lg bg-[#b8921e] hover:bg-[#c9a84c] text-sm font-bold text-white shadow-md shadow-[#c9a84c]/20 transition-all flex items-center gap-2"
              >
                {isLoading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                Save Changes
              </button>
            </>
          )}
        </div>
      </div>

      {/* Role & Permissions Card */}
      <div className="rounded-2xl border border-border shadow-sm bg-card overflow-hidden">
        <div className="p-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100 dark:bg-indigo-500/10 dark:text-indigo-400 dark:border-indigo-500/20">
              <Shield className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-base font-bold text-foreground">Access Level: {user.role}</h2>
              <p className="text-xs font-medium text-muted-foreground mt-0.5">Your current Enterprise RBAC permissions.</p>
            </div>
          </div>

          <div className="space-y-3 bg-muted/30 rounded-xl p-5 border border-border/50">
            {[
              "Enterprise platform access",
              "Access to Role-Specific Dashboards",
            ].map((feature, i) => (
              <div key={i} className="flex items-center gap-3">
                <Check className="h-4 w-4 text-emerald-500" />
                <span className="text-sm font-medium text-foreground">{feature}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
