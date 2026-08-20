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
    <div className="space-y-6">
      
      {/* Profile Card */}
      <div className="rounded-2xl border border-white/[0.06] bg-[hsl(var(--card))] overflow-hidden">
        <div className="p-6 border-b border-white/[0.04] bg-white/[0.02]">
          <h2 className="text-base font-semibold text-white">Personal Information</h2>
          <p className="text-xs text-slate-500 mt-1">Update your basic profile details.</p>
        </div>

        <div className="p-6 space-y-5">
          {message && (
            <div className={`p-3 rounded-xl border text-sm flex items-center gap-2 ${
              message.type === "success" 
                ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" 
                : "bg-red-500/10 border-red-500/20 text-red-400"
            }`}>
              {message.type === "success" ? <Check className="h-4 w-4" /> : null}
              {message.text}
            </div>
          )}

          <div className="flex items-center gap-6">
            <div className="h-20 w-20 rounded-2xl bg-gradient-to-br from-[#c9a84c] to-[#8a6a1e] flex items-center justify-center text-2xl font-bold text-white shadow-lg shadow-[#c9a84c]/20 border-2 border-white/10 ring-4 ring-[hsl(var(--card))]">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">{user.name}</h3>
              <div className="flex items-center gap-2 mt-1">
                <span className="inline-flex items-center rounded-md bg-white/5 px-2 py-1 text-xs font-medium text-slate-400 ring-1 ring-inset ring-white/10">
                  {user.role}
                </span>
                <span className="text-xs text-slate-500">Member since {new Date(user.createdAt || Date.now()).getFullYear()}</span>
              </div>
            </div>
          </div>

          <div className="space-y-4 pt-4 border-t border-white/[0.04]">
            <div className="grid gap-2">
              <label className="text-xs font-semibold uppercase tracking-widest text-slate-500">Full Name</label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-600" />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={!isEditing}
                  className="w-full h-11 rounded-xl bg-white/[0.04] border border-white/[0.08] pl-11 pr-4 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-[#c9a84c]/50 focus:ring-1 focus:ring-[#c9a84c]/25 transition-all disabled:opacity-60"
                />
              </div>
            </div>

            <div className="grid gap-2">
              <label className="text-xs font-semibold uppercase tracking-widest text-slate-500">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-600" />
                <input
                  type="email"
                  value={email}
                  disabled={true}
                  className="w-full h-11 rounded-xl bg-white/[0.04] border border-white/[0.08] pl-11 pr-4 text-sm text-white/50 cursor-not-allowed"
                />
              </div>
              <p className="text-[10px] text-slate-500 mt-1">Email address cannot be changed. Contact your administrator.</p>
            </div>
          </div>
        </div>

        <div className="p-4 bg-white/[0.02] border-t border-white/[0.04] flex items-center justify-end gap-3">
          {!isEditing ? (
            <button
              onClick={() => setIsEditing(true)}
              className="h-9 px-4 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-sm font-medium text-white transition-all"
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
                className="h-9 px-4 rounded-lg bg-transparent hover:bg-white/5 text-sm font-medium text-slate-400 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={isLoading}
                className="h-9 px-4 rounded-lg bg-[#b8921e] hover:bg-[#c9a84c] text-sm font-medium text-white shadow-lg shadow-[#c9a84c]/20 transition-all flex items-center gap-2"
              >
                {isLoading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                Save Changes
              </button>
            </>
          )}
        </div>
      </div>

      {/* Role & Permissions Card */}
      <div className="rounded-2xl border border-white/[0.06] bg-[hsl(var(--card))] overflow-hidden">
        <div className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/10 border border-indigo-500/20">
              <Shield className="h-5 w-5 text-indigo-400" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-white">Access Level: {user.role}</h2>
              <p className="text-xs text-slate-500">Your current Enterprise RBAC permissions.</p>
            </div>
          </div>

          <div className="space-y-3 bg-white/[0.02] rounded-xl p-4 border border-white/[0.04]">
            {[
              "Enterprise platform access",
              "Access to Role-Specific Dashboards",
            ].map((feature, i) => (
              <div key={i} className="flex items-center gap-3">
                <Check className="h-4 w-4 text-emerald-400" />
                <span className="text-sm text-slate-300">{feature}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
