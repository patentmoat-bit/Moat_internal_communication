"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, ArrowRight, User, Lock, Eye, EyeOff, Shield, Check, X } from "lucide-react";
import { PASSWORD_POLICY, validatePasswordPolicy } from "@/lib/security/passwordPolicy";

const REQUIREMENTS = [
  { label: `At least ${PASSWORD_POLICY.minLength} characters`, test: (p: string) => p.length >= PASSWORD_POLICY.minLength },
  { label: "One uppercase letter", test: (p: string) => /[A-Z]/.test(p) },
  { label: "One lowercase letter", test: (p: string) => /[a-z]/.test(p) },
  { label: "One number", test: (p: string) => /[0-9]/.test(p) },
  { label: "One special character", test: (p: string) => /[^A-Za-z0-9]/.test(p) },
];

export default function AcceptInvitationPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [email, setEmail] = useState("");
  const [role, setRole] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const policyCheck = useMemo(() => validatePasswordPolicy(password), [password]);

  useEffect(() => {
    if (!token) {
      setError("Invalid invitation link.");
      setIsLoading(false);
      return;
    }

    const validateToken = async () => {
      try {
        const res = await fetch(`/api/auth/invitation?token=${token}`);
        const data = await res.json();
        
        if (!res.ok || !data.success) {
          setError(data.error || "Invitation is invalid or expired.");
        } else {
          setEmail(data.email);
          setRole(data.role);
        }
      } catch (err: any) {
        setError("Failed to validate invitation.");
      } finally {
        setIsLoading(false);
      }
    };

    validateToken();
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!policyCheck.valid) {
      setError(policyCheck.errors.join(" "));
      return;
    }
    setIsSubmitting(true);

    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, password, token })
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.detail || data.error || "Failed to create account.");
      }
      
      setSuccess(true);
      setTimeout(() => {
        router.push("/login");
      }, 2000);
    } catch (err: any) {
      setError(err.message ?? "An error occurred.");
      setIsSubmitting(false);
    }
  };

  const field = "peer w-full h-12 rounded-xl bg-white/[0.04] border border-white/[0.08] pl-11 pr-4 text-sm text-slate-200 placeholder:text-transparent focus:outline-none focus:border-[#c9a84c]/60 focus:ring-1 focus:ring-[#c9a84c]/20 focus:bg-white/[0.07] transition-all";

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-40">
        <Loader2 className="h-8 w-8 animate-spin text-[#c9a84c]" />
      </div>
    );
  }

  return (
    <>
      <div className="mb-10">
        <h2 className="text-3xl font-black text-white tracking-tighter">Accept Invitation.</h2>
        <p className="text-sm text-white/50 mt-2 font-medium">Set up your MOAT account</p>
      </div>

      {error && (
        <div className="mb-6 flex items-start gap-3 rounded-xl border border-red-500/20 bg-red-500/[0.08] px-4 py-3 text-sm text-red-400">
          <Shield className="h-4 w-4 mt-0.5 shrink-0 text-red-500" />
          {error}
        </div>
      )}

      {success ? (
        <div className="mb-6 flex flex-col items-center gap-3 rounded-xl border border-emerald-500/20 bg-emerald-500/[0.08] p-6 text-emerald-400">
          <Shield className="h-8 w-8 text-emerald-500" />
          <p className="font-bold">Account Activated!</p>
          <p className="text-sm text-emerald-500/80">Redirecting to login...</p>
        </div>
      ) : !error ? (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="mb-4">
            <p className="text-xs text-white/40 uppercase font-bold tracking-wider mb-1">Invited Email</p>
            <p className="text-slate-200 font-medium">{email}</p>
            <p className="text-xs text-[#c9a84c] mt-1 font-semibold">{role} Role</p>
          </div>

          <div className="relative group">
            <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-600 group-focus-within:text-[#c9a84c] transition-colors pointer-events-none z-10" />
            <input
              id="name" type="text" value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Full Name" required
              className={field}
            />
            <label htmlFor="name"
              className="absolute left-11 top-1/2 -translate-y-1/2 text-sm text-slate-600 pointer-events-none transition-all duration-200
                peer-focus:-top-0 peer-focus:left-2 peer-focus:text-[10px] peer-focus:text-[#c9a84c]/80 peer-focus:bg-[#131309] peer-focus:px-1
                peer-[&:not(:placeholder-shown)]:-top-0 peer-[&:not(:placeholder-shown)]:left-2 peer-[&:not(:placeholder-shown)]:text-[10px] peer-[&:not(:placeholder-shown)]:text-slate-600 peer-[&:not(:placeholder-shown)]:bg-[#131309] peer-[&:not(:placeholder-shown)]:px-1">
              Full Name
            </label>
          </div>

          <div className="relative group">
            <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-600 group-focus-within:text-[#c9a84c] transition-colors pointer-events-none z-10" />
            <input
              id="password" type={showPwd ? "text" : "password"} value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Create password" required minLength={PASSWORD_POLICY.minLength}
              className={`${field} pr-11`}
            />
            <label htmlFor="password"
              className="absolute left-11 top-1/2 -translate-y-1/2 text-sm text-slate-600 pointer-events-none transition-all duration-200
                peer-focus:-top-0 peer-focus:left-2 peer-focus:text-[10px] peer-focus:text-[#c9a84c]/80 peer-focus:bg-[#131309] peer-focus:px-1
                peer-[&:not(:placeholder-shown)]:-top-0 peer-[&:not(:placeholder-shown)]:left-2 peer-[&:not(:placeholder-shown)]:text-[10px] peer-[&:not(:placeholder-shown)]:text-slate-600 peer-[&:not(:placeholder-shown)]:bg-[#131309] peer-[&:not(:placeholder-shown)]:px-1">
              Create Password
            </label>
            <button type="button" onClick={() => setShowPwd(v => !v)}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-600 hover:text-slate-400 transition-colors">
              {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>

          {password.length > 0 && (
            <ul className="grid grid-cols-2 gap-1.5 px-1">
              {REQUIREMENTS.map((req) => {
                const met = req.test(password);
                return (
                  <li key={req.label} className={`flex items-center gap-1.5 text-xs ${met ? "text-emerald-400" : "text-slate-500"}`}>
                    {met ? <Check className="h-3 w-3 shrink-0" /> : <X className="h-3 w-3 shrink-0" />}
                    {req.label}
                  </li>
                );
              })}
            </ul>
          )}

          <button type="submit"
            disabled={isSubmitting || !name || !password || !policyCheck.valid}
            className="relative mt-4 w-full h-12 rounded-xl text-sm font-bold text-white overflow-hidden group transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ background: "linear-gradient(135deg, #c9a84c 0%, #a07820 50%, #c9a84c 100%)", backgroundSize: "200% 100%" }}>
            <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/15 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 pointer-events-none" />
            {isSubmitting ? (
              <span className="flex items-center justify-center gap-2"><Loader2 className="h-4 w-4 animate-spin" />Activating…</span>
            ) : (
              <span className="flex items-center justify-center gap-2">Activate Account <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" /></span>
            )}
          </button>
        </form>
      ) : null}

      <p className="mt-8 text-center text-[10px] text-white/20 uppercase tracking-wider font-bold">
        Protected by Enterprise Security
      </p>
    </>
  );
}
