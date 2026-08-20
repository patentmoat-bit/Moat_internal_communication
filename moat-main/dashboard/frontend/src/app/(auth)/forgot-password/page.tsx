"use client";

import { useState } from "react";
import Link from "next/link";
import { Mail, ArrowRight, Loader2, CheckCircle2 } from "lucide-react";
import { useAuthStore } from "@/stores/authStore";

export default function ForgotPasswordPage() {
  const forgotPassword = useAuthStore((state) => state.forgotPassword);
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");
    try {
      const result = await forgotPassword(email);
      setMessage(result.message);
    } catch (err: any) {
      setError(err.message || "Unable to start reset flow");
    } finally {
      setLoading(false);
    }
  }

  const inputCls = "w-full h-12 rounded-xl bg-white/[0.04] border border-white/[0.08] pl-11 pr-4 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-[#c9a84c]/50 focus:ring-1 focus:ring-[#c9a84c]/25 transition-all";

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="mb-8"><h2 className="text-2xl font-bold text-white tracking-tight">Forgot password</h2><p className="text-sm text-slate-500 mt-1">Generate a secure reset link for your account</p></div>
      {error && <div className="mb-6 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-sm text-red-400">{error}</div>}
      {message && <div className="mb-6 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-sm text-emerald-300 flex gap-2"><CheckCircle2 className="h-4 w-4" />{message}</div>}
      <form onSubmit={submit} className="space-y-4">
        <div className="relative"><Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-600" /><input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="name@company.com" required className={inputCls} /></div>
        <button disabled={loading} className="w-full h-12 rounded-xl bg-[#b8921e] hover:bg-[#c9a84c] text-white text-sm font-semibold disabled:opacity-70">{loading ? <span className="flex items-center justify-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Sending...</span> : <span className="flex items-center justify-center gap-2">Send Reset Link <ArrowRight className="h-4 w-4" /></span>}</button>
      </form>
      <p className="mt-8 text-center text-sm text-slate-600"><Link href="/login" className="text-[#c9a84c] hover:text-[#e8c97a] font-semibold">Back to sign in</Link></p>
    </div>
  );
}
