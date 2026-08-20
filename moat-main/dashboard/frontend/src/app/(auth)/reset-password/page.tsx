"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Loader2, Lock } from "lucide-react";
import { useAuthStore } from "@/stores/authStore";

export default function ResetPasswordPage() {
  const params = useSearchParams();
  const router = useRouter();
  const resetPassword = useAuthStore((state) => state.resetPassword);
  const [token, setToken] = useState(params.get("token") || "");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    if (password !== confirm) return setError("Passwords do not match");
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

  const inputCls = "w-full h-12 rounded-xl bg-white/[0.04] border border-white/[0.08] pl-11 pr-4 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-[#c9a84c]/50 focus:ring-1 focus:ring-[#c9a84c]/25 transition-all";

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="mb-8"><h2 className="text-2xl font-bold text-white tracking-tight">Reset password</h2><p className="text-sm text-slate-500 mt-1">Set a new password for your account</p></div>
      {error && <div className="mb-6 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-sm text-red-400">{error}</div>}
      <form onSubmit={submit} className="space-y-4">
        <textarea value={token} onChange={e => setToken(e.target.value)} placeholder="Reset token" required rows={3} className="w-full rounded-xl bg-white/[0.04] border border-white/[0.08] px-4 py-3 text-xs text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-[#c9a84c]/50" />
        <div className="relative"><Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-600" /><input type="password" minLength={8} value={password} onChange={e => setPassword(e.target.value)} placeholder="New password" required className={inputCls} /></div>
        <div className="relative"><Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-600" /><input type="password" minLength={8} value={confirm} onChange={e => setConfirm(e.target.value)} placeholder="Confirm password" required className={inputCls} /></div>
        <button disabled={loading} className="w-full h-12 rounded-xl bg-[#b8921e] hover:bg-[#c9a84c] text-white text-sm font-semibold disabled:opacity-70">{loading ? <span className="flex items-center justify-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Resetting...</span> : <span className="flex items-center justify-center gap-2">Reset Password <ArrowRight className="h-4 w-4" /></span>}</button>
      </form>
      <p className="mt-8 text-center text-sm text-slate-600"><Link href="/login" className="text-[#c9a84c] hover:text-[#e8c97a] font-semibold">Back to sign in</Link></p>
    </div>
  );
}
