"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, Loader2, Lock, Eye, EyeOff, Check, X } from "lucide-react";
import { useAuthStore } from "@/stores/authStore";
import { PASSWORD_POLICY, validatePasswordPolicy } from "@/lib/security/passwordPolicy";

const REQUIREMENTS = [
  { label: `At least ${PASSWORD_POLICY.minLength} characters`, test: (p: string) => p.length >= PASSWORD_POLICY.minLength },
  { label: "One uppercase letter", test: (p: string) => /[A-Z]/.test(p) },
  { label: "One lowercase letter", test: (p: string) => /[a-z]/.test(p) },
  { label: "One number", test: (p: string) => /[0-9]/.test(p) },
  { label: "One special character", test: (p: string) => /[^A-Za-z0-9]/.test(p) },
];

export default function ResetPasswordPage() {
  const params = useSearchParams();
  const router = useRouter();
  const resetPassword = useAuthStore((state) => state.resetPassword);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const isForced = params.get("forced") === "1";
  const hasToken = !!params.get("token");
  const policyCheck = useMemo(() => validatePasswordPolicy(password), [password]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    if (!hasToken) return setError("This reset link is missing or invalid. Request a new one.");
    if (password !== confirm) return setError("Passwords do not match");
    if (!policyCheck.valid) return setError(policyCheck.errors.join(" "));
    setLoading(true);
    try {
      await resetPassword(password);
      router.push("/login?reset=success");
    } catch (err: any) {
      setError(err.message || "Unable to reset password");
    } finally {
      setLoading(false);
    }
  }

  const inputCls = "w-full h-12 rounded-xl bg-white/[0.04] border border-white/[0.08] pl-11 pr-11 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-[#c9a84c]/50 focus:ring-1 focus:ring-[#c9a84c]/25 transition-all";

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="mb-8"><h2 className="text-2xl font-bold text-white tracking-tight">Reset password</h2><p className="text-sm text-slate-500 mt-1">Set a new password for your account</p></div>
      {isForced && !error && <div className="mb-6 p-3 rounded-xl bg-[#c9a84c]/10 border border-[#c9a84c]/20 text-sm text-[#c9a84c]">Your administrator issued a temporary password — set a new one to continue.</div>}
      {!hasToken && !error && <div className="mb-6 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-sm text-red-400">This reset link is missing or invalid. Please request a new one.</div>}
      {error && <div className="mb-6 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-sm text-red-400">{error}</div>}
      <form onSubmit={submit} className="space-y-4">
        <div className="relative">
          <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-600" />
          <input
            type={showPassword ? "text" : "password"}
            minLength={PASSWORD_POLICY.minLength} value={password} onChange={e => setPassword(e.target.value)}
            placeholder="New password" required className={inputCls}
          />
          <button type="button" onClick={() => setShowPassword(v => !v)}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-600 hover:text-slate-400 transition-colors">
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
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
        <div className="relative">
          <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-600" />
          <input
            type={showConfirm ? "text" : "password"}
            minLength={PASSWORD_POLICY.minLength} value={confirm} onChange={e => setConfirm(e.target.value)}
            placeholder="Confirm password" required className={inputCls}
          />
          <button type="button" onClick={() => setShowConfirm(v => !v)}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-600 hover:text-slate-400 transition-colors">
            {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
        <button disabled={loading || !policyCheck.valid} className="w-full h-12 rounded-xl bg-[#b8921e] hover:bg-[#c9a84c] text-white text-sm font-semibold disabled:opacity-70">{loading ? <span className="flex items-center justify-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Resetting...</span> : <span className="flex items-center justify-center gap-2">Reset Password <ArrowRight className="h-4 w-4" /></span>}</button>
      </form>
      <p className="mt-8 text-center text-sm text-slate-600"><Link href="/login" className="text-[#c9a84c] hover:text-[#e8c97a] font-semibold">Back to sign in</Link></p>
    </div>
  );
}
