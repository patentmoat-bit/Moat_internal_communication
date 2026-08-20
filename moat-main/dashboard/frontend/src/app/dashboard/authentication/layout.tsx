"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { Loader2, ShieldAlert, KeyRound, Settings, Activity, Users, Lock, LogOut, FileText, Globe } from "lucide-react";
import { useAuthStore } from "@/stores/authStore";
import { appRoleToEnterpriseRole } from "@/lib/roleIntelligence";
import { cn } from "@/lib/utils";

const iamModules = [
  { title: "Overview", href: "/dashboard/authentication", icon: Activity },
  { title: "Login Settings", href: "/dashboard/authentication/settings", icon: Settings },
  { title: "OAuth Configuration", href: "/dashboard/authentication/oauth", icon: Globe },
  { title: "Session Management", href: "/dashboard/authentication/sessions", icon: Users },
  { title: "Security Policies", href: "/dashboard/authentication/policies", icon: ShieldAlert },
  { title: "MFA Setup", href: "/dashboard/authentication/mfa", icon: Lock },
  { title: "Audit Logs", href: "/dashboard/authentication/logs", icon: FileText },
  { title: "Token Management", href: "/dashboard/authentication/tokens", icon: KeyRound },
  { title: "Reports", href: "/dashboard/authentication/reports", icon: FileText },
];

export default function IAMLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { isAuthenticated, isLoading, user } = useAuthStore();
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);

  useEffect(() => {
    if (isAuthenticated && user) {
      const enterpriseRole = appRoleToEnterpriseRole(user.role);
      setIsAuthorized(enterpriseRole === "admin");
    } else if (isAuthenticated === false && !isLoading) {
      setIsAuthorized(false);
    }
  }, [isAuthenticated, user, isLoading]);

  if (isLoading || isAuthorized === null) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center text-muted-foreground">
        <Loader2 className="h-8 w-8 animate-spin text-[#c9a84c]" />
      </div>
    );
  }

  if (!isAuthorized) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center p-4 text-center">
        <div className="rounded-full bg-red-500/10 p-5 mb-6 border border-red-500/20 shadow-lg shadow-red-500/10">
          <ShieldAlert className="h-12 w-12 text-red-500" />
        </div>
        <h1 className="text-3xl font-bold mb-3 tracking-tight">Access Restricted</h1>
        <p className="text-muted-foreground max-w-md text-lg">
          The Identity & Access Management (IAM) Center is restricted to System Administrators.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-black tracking-tight text-foreground flex items-center gap-3">
          <KeyRound className="h-8 w-8 text-[#c9a84c]" />
          Identity & Access Management
        </h1>
        <p className="mt-2 text-muted-foreground">
          Centralized control over authentication, sessions, OAuth providers, and security policies.
        </p>
      </div>

      <div className="flex flex-col md:flex-row gap-8">
        {/* Inner Sidebar */}
        <aside className="w-full md:w-64 shrink-0">
          <nav className="flex flex-col space-y-1">
            {iamModules.map((module) => {
              const isActive = pathname === module.href;
              const Icon = module.icon;
              return (
                <Link
                  key={module.title}
                  href={module.href}
                  className={cn(
                    "flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 relative",
                    isActive
                      ? "text-[#c9a84c] bg-[#c9a84c]/10"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  {isActive && (
                    <motion.div
                      layoutId="iam-active-pill"
                      className="absolute left-0 top-0 bottom-0 w-1 bg-[#c9a84c] rounded-r-full"
                    />
                  )}
                  <Icon className={cn("h-4 w-4", isActive ? "text-[#c9a84c]" : "")} />
                  {module.title}
                </Link>
              );
            })}
          </nav>
        </aside>

        {/* Content Area */}
        <main className="flex-1 min-w-0">
          <div className="bg-card border border-border rounded-2xl shadow-sm p-6 lg:p-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
