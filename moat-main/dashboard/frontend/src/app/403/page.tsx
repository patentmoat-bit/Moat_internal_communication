"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ShieldX, ArrowLeft, Home, LogIn } from "lucide-react";
import { useAuthStore } from "@/stores/authStore";
import { useEffect, useState } from "react";

export default function ForbiddenPage() {
  const router = useRouter();
  const { user, isAuthenticated, checkAuth } = useAuthStore();
  const [countdown, setCountdown] = useState(10);

  useEffect(() => {
    checkAuth().catch(() => {});
  }, [checkAuth]);

  // Auto-redirect countdown
  useEffect(() => {
    if (countdown <= 0) {
      router.push(isAuthenticated ? "/dashboard" : "/login");
      return;
    }
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown, isAuthenticated, router]);

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#0e0e09] overflow-hidden relative">
      {/* Background glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 h-[600px] w-[600px] rounded-full bg-red-900/20 blur-[140px] pointer-events-none" />
      <div className="absolute bottom-0 left-1/4 h-[400px] w-[400px] rounded-full bg-[#c9a84c]/5 blur-[120px] pointer-events-none" />

      {/* Subtle grid */}
      <div
        className="absolute inset-0 opacity-[0.025]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      />

      <div className="relative z-10 w-full max-w-lg mx-auto px-6 text-center">
        {/* Logo */}
        <div className="flex items-center justify-center gap-3 mb-12">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[#c9a84c] to-[#8a6a1e] font-black text-xs text-white shadow-lg shadow-[#c9a84c]/25">
            IP
          </div>
          <span className="text-base font-bold text-white tracking-tight">MOAT Intelligence</span>
        </div>

        {/* Icon */}
        <div className="relative mx-auto mb-8 flex h-24 w-24 items-center justify-center">
          <div className="absolute inset-0 rounded-full bg-red-500/10 animate-ping" style={{ animationDuration: "3s" }} />
          <div className="absolute inset-2 rounded-full bg-red-500/15" />
          <div className="relative flex h-20 w-20 items-center justify-center rounded-full border border-red-500/30 bg-red-950/60 backdrop-blur-sm">
            <ShieldX className="h-9 w-9 text-red-400" />
          </div>
        </div>

        {/* Status badge */}
        <div className="inline-flex items-center gap-2 rounded-full border border-red-500/20 bg-red-500/10 px-4 py-1.5 text-xs font-bold text-red-400 tracking-widest uppercase mb-6">
          <span className="h-1.5 w-1.5 rounded-full bg-red-400" />
          403 — Access Forbidden
        </div>

        {/* Heading */}
        <h1 className="text-4xl font-black tracking-tight text-white mb-4">
          Access Denied
        </h1>
        <p className="text-base text-slate-400 leading-relaxed mb-3">
          You don&apos;t have permission to view this page.
          {user?.role && (
            <> Your current role (<span className="text-[#c9a84c] font-semibold">{user.role}</span>) does not have access to this area.</>
          )}
        </p>
        <p className="text-sm text-slate-600">
          If you believe this is a mistake, please contact your administrator to request elevated access.
        </p>

        {/* Countdown */}
        <p className="mt-6 text-xs text-slate-700">
          Redirecting in{" "}
          <span className="tabular-nums font-bold text-slate-500">{countdown}s</span>
          {" "}→ {isAuthenticated ? "your dashboard" : "login"}
        </p>

        {/* Actions */}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-5 py-2.5 text-sm font-medium text-slate-300 hover:bg-white/10 hover:text-white transition-all"
          >
            <ArrowLeft className="h-4 w-4" />
            Go Back
          </button>

          {isAuthenticated ? (
            <Link
              href="/dashboard"
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#c9a84c] to-[#8a6a1e] px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-[#c9a84c]/20 hover:opacity-90 transition-all"
            >
              <Home className="h-4 w-4" />
              My Dashboard
            </Link>
          ) : (
            <Link
              href="/login"
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#c9a84c] to-[#8a6a1e] px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-[#c9a84c]/20 hover:opacity-90 transition-all"
            >
              <LogIn className="h-4 w-4" />
              Sign In
            </Link>
          )}
        </div>

        {/* Divider */}
        <div className="mt-12 border-t border-white/5 pt-6">
          <p className="text-xs text-slate-700">
            MOAT Patent Intelligence Platform &mdash; Role-Based Access Control
          </p>
        </div>
      </div>
    </div>
  );
}
