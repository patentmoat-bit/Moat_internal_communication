"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useAuthStore } from "@/stores/authStore";
import { createClient } from "@/lib/supabase/client";
import { getRoleWorkspace } from "@/lib/roleIntelligence";
import { Loader2, ArrowRight, Mail, Lock, Eye, EyeOff, Shield, ChevronRight } from "lucide-react";

function getSafeRedirect(value: string | null) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return null;
  return value;
}

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = getSafeRedirect(searchParams.get("redirect"));
  const { loginWithCredentials, isAuthenticated, user, mfaChallengeRequired, mfaEnrolled, qrCodeSvg, verifyMfa } = useAuthStore();

  const [email, setEmail]           = useState(searchParams.get("email") || "");
  const [password, setPassword]     = useState("");
  const [mfaCode, setMfaCode]       = useState("");
  const [showPwd, setShowPwd]       = useState(false);
  const [isLoading, setIsLoading]   = useState(false);
  const [error, setError]           = useState("");
  const isExpired = searchParams.get("expired") === "1";

  useEffect(() => {
    if (isAuthenticated && user) {
      const workspace = getRoleWorkspace(user.role);
      router.replace(redirectTo ?? workspace.route);
    }
  }, [isAuthenticated, user, redirectTo, router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(""); setIsLoading(true);
    try {
      const loggedUser = await loginWithCredentials(email, password);
      if (!useAuthStore.getState().mfaChallengeRequired) {
        router.push(redirectTo ?? getRoleWorkspace(loggedUser.role).route);
      }
    } catch (err: any) {
      setError(err.message ?? "Invalid credentials. Please try again.");
    } finally { setIsLoading(false); }
  };

  const handleMfaSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(""); setIsLoading(true);
    try {
      const loggedUser = await verifyMfa(mfaCode);
      router.push(redirectTo ?? getRoleWorkspace(loggedUser.role).route);
    } catch (err: any) {
      setError(err.message ?? "Invalid code. Please try again.");
    } finally { setIsLoading(false); }
  };

  const field = "peer w-full h-12 rounded-xl bg-white/[0.04] border border-white/[0.08] pl-11 pr-4 text-sm text-slate-200 placeholder:text-transparent focus:outline-none focus:border-[#c9a84c]/60 focus:ring-1 focus:ring-[#c9a84c]/20 focus:bg-white/[0.07] transition-all";

  return (
    <>
      {/* Heading */}
      <div className="mb-10">
        <h2 className="text-3xl font-black text-white tracking-tighter">Unlock your Patent Vault.</h2>
        <p className="text-sm text-white/50 mt-2 font-medium">Sign in to your MOAT intelligence account</p>
      </div>

      {/* Error or Expired Message */}
      {isExpired && !error && (
        <div className="mb-6 flex items-start gap-3 rounded-xl border border-yellow-500/20 bg-yellow-500/[0.08] px-4 py-3 text-sm text-yellow-500">
          <Shield className="h-4 w-4 mt-0.5 shrink-0 text-yellow-500" />
          Your session expired due to inactivity. Please sign in again.
        </div>
      )}

      {error && (
        <div className="mb-6 flex items-start gap-3 rounded-xl border border-red-500/20 bg-red-500/[0.08] px-4 py-3 text-sm text-red-400">
          <Shield className="h-4 w-4 mt-0.5 shrink-0 text-red-500" />
          {error}
        </div>
      )}

      {mfaChallengeRequired ? (
        <form onSubmit={handleMfaSubmit} className="space-y-4">
          {!mfaEnrolled && (
            <div className="flex flex-col items-center justify-center p-4 bg-white/5 rounded-xl border border-white/10 mb-4">
              <p className="text-xs text-slate-300 font-medium mb-3 text-center">Scan this QR code with Microsoft Authenticator</p>
              <div className="bg-white p-2 rounded-lg flex items-center justify-center min-w-[136px] min-h-[136px]">
                {/* Using backend-generated SVG for secure rendering without leaking TOTP secret */}
                {qrCodeSvg ? (
                  <div dangerouslySetInnerHTML={{ __html: qrCodeSvg }} />
                ) : (
                  <div className="w-[120px] h-[120px] flex items-center justify-center">
                    <Loader2 className="h-6 w-6 animate-spin text-slate-300" />
                  </div>
                )}
              </div>
            </div>
          )}
          <div className="relative group">
            <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-600 group-focus-within:text-[#c9a84c] transition-colors pointer-events-none z-10" />
            <input
              id="mfa-code" type="text" value={mfaCode}
              onChange={e => setMfaCode(e.target.value)}
              placeholder="Enter 6-digit code" required maxLength={6}
              className={field}
            />
            <label htmlFor="mfa-code"
              className="absolute left-11 top-1/2 -translate-y-1/2 text-sm text-slate-600 pointer-events-none transition-all duration-200
                peer-focus:-top-0 peer-focus:left-2 peer-focus:text-[10px] peer-focus:text-[#c9a84c]/80 peer-focus:bg-[#131309] peer-focus:px-1
                peer-[&:not(:placeholder-shown)]:-top-0 peer-[&:not(:placeholder-shown)]:left-2 peer-[&:not(:placeholder-shown)]:text-[10px] peer-[&:not(:placeholder-shown)]:text-slate-600 peer-[&:not(:placeholder-shown)]:bg-[#131309] peer-[&:not(:placeholder-shown)]:px-1">
              Authenticator Code
            </label>
          </div>
          <button id="mfa-submit" type="submit"
            disabled={isLoading || mfaCode.length < 6}
            className="relative mt-4 w-full h-12 rounded-xl text-sm font-bold text-white overflow-hidden group transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ background: "linear-gradient(135deg, #c9a84c 0%, #a07820 50%, #c9a84c 100%)", backgroundSize: "200% 100%" }}>
            <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/15 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 pointer-events-none" />
            {isLoading ? (
              <span className="flex items-center justify-center gap-2"><Loader2 className="h-4 w-4 animate-spin" />Verifying…</span>
            ) : (
              <span className="flex items-center justify-center gap-2">Verify <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" /></span>
            )}
          </button>
        </form>
      ) : (
        <form onSubmit={handleLogin} className="space-y-4">
        {/* Email */}
        <div className="relative group">
          <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-600 group-focus-within:text-[#c9a84c] transition-colors pointer-events-none z-10" />
          <input
            id="login-email" type="email" value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="name@company.com" required autoComplete="email"
            className={field}
          />
          <label htmlFor="login-email"
            className="absolute left-11 top-1/2 -translate-y-1/2 text-sm text-slate-600 pointer-events-none transition-all duration-200
              peer-focus:-top-0 peer-focus:left-2 peer-focus:text-[10px] peer-focus:text-[#c9a84c]/80 peer-focus:bg-[#131309] peer-focus:px-1
              peer-[&:not(:placeholder-shown)]:-top-0 peer-[&:not(:placeholder-shown)]:left-2 peer-[&:not(:placeholder-shown)]:text-[10px] peer-[&:not(:placeholder-shown)]:text-slate-600 peer-[&:not(:placeholder-shown)]:bg-[#131309] peer-[&:not(:placeholder-shown)]:px-1">
            Work email
          </label>
        </div>

        {/* Password */}
        <div className="relative group">
          <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-600 group-focus-within:text-[#c9a84c] transition-colors pointer-events-none z-10" />
          <input
            id="login-password" type={showPwd ? "text" : "password"} value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="Enter password" required autoComplete="current-password"
            className={`${field} pr-11`}
          />
          <label htmlFor="login-password"
            className="absolute left-11 top-1/2 -translate-y-1/2 text-sm text-slate-600 pointer-events-none transition-all duration-200
              peer-focus:-top-0 peer-focus:left-2 peer-focus:text-[10px] peer-focus:text-[#c9a84c]/80 peer-focus:bg-[#131309] peer-focus:px-1
              peer-[&:not(:placeholder-shown)]:-top-0 peer-[&:not(:placeholder-shown)]:left-2 peer-[&:not(:placeholder-shown)]:text-[10px] peer-[&:not(:placeholder-shown)]:text-slate-600 peer-[&:not(:placeholder-shown)]:bg-[#131309] peer-[&:not(:placeholder-shown)]:px-1">
            Password
          </label>
          <button type="button" onClick={() => setShowPwd(v => !v)}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-600 hover:text-slate-400 transition-colors">
            {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>

        {/* Forgot */}
        <div className="flex justify-end -mt-1">
          <Link href="/forgot-password" className="text-xs text-[#c9a84c]/70 hover:text-[#c9a84c] transition-colors font-medium">
            Forgot password?
          </Link>
        </div>

      {/* Submit */}
        <button id="login-submit" type="submit"
          disabled={isLoading || !email || !password}
          className="relative mt-4 w-full h-12 rounded-xl text-sm font-bold text-white overflow-hidden group transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          style={{ background: "linear-gradient(135deg, #c9a84c 0%, #a07820 50%, #c9a84c 100%)", backgroundSize: "200% 100%" }}>
          <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/15 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 pointer-events-none" />
          {isLoading ? (
            <span className="flex items-center justify-center gap-2"><Loader2 className="h-4 w-4 animate-spin" />Authenticating…</span>
          ) : (
            <span className="flex items-center justify-center gap-2">Sign In <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" /></span>
          )}
        </button>
      </form>
      )}

      <p className="mt-8 text-center text-[10px] text-white/20 uppercase tracking-wider font-bold">
        Protected by Enterprise RBAC Security
      </p>
    </>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="flex justify-center items-center h-full text-[#c9a84c]"><Loader2 className="w-8 h-8 animate-spin" /></div>}>
      <LoginContent />
    </Suspense>
  );
}
