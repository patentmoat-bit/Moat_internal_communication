"use client";

import Link from "next/link";
import { Shield } from "lucide-react";

export default function RegisterPage() {
  return (
    <div className="flex flex-col items-center justify-center text-center space-y-6">
      <div className="p-4 bg-white/5 rounded-full border border-white/10">
        <Shield className="h-10 w-10 text-[#c9a84c]" />
      </div>
      
      <div>
        <h2 className="text-3xl font-black text-white tracking-tighter mb-3">
          Registration Disabled
        </h2>
        <p className="text-slate-300 max-w-md mx-auto leading-relaxed">
          Your account must be created by an administrator.
          MOAT Patent Intelligence Platform is an invite-only enterprise application.
        </p>
      </div>

      <div className="pt-4">
        <Link 
          href="/login" 
          className="text-sm font-bold text-white bg-white/10 hover:bg-white/20 transition-colors px-6 py-3 rounded-xl border border-white/10"
        >
          Return to Login
        </Link>
      </div>
    </div>
  );
}
