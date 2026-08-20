"use client";

import { usePathname, useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/authStore";
import { User, Shield, Bell, Monitor, Activity, Users, ShieldCheck, Key } from "lucide-react";
import { ErrorBoundary } from "@/components/shared/ErrorBoundary";
import { motion } from "framer-motion";
import { Loader2, Mail, LayoutTemplate, Network } from "lucide-react";

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  const { user } = useAuthStore();
  const pathname = usePathname();
  const router = useRouter();

  if (!user) return (
    <div className="flex h-64 items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-[#c9a84c]" />
    </div>
  );

  const role = user.role as string;
  const isAdmin = role === "Admin" || role === "admin" || role === "Super Admin";

  const navItems = [
    { icon: User, label: "Profile", href: "/dashboard/settings" },
    { icon: Bell, label: "Notifications", href: "/dashboard/settings/notifications" },
    { icon: Monitor, label: "Display & Theme", href: "/dashboard/settings/theme" },
  ];

  const adminItems = [
    { icon: Users, label: "User Management", href: "/dashboard/settings/users" },
    { icon: ShieldCheck, label: "Roles & Permissions", href: "/dashboard/settings/roles" },
    { icon: Key, label: "Access Review", href: "/dashboard/settings/access-review" },
    { icon: Key, label: "Security Policies", href: "/dashboard/settings/security" },
    { icon: Shield, label: "Organization Access", href: "/dashboard/settings/domains" },
    { icon: Activity, label: "Audit Logs", href: "/dashboard/settings/audit" },
    { icon: Mail, label: "Email Configuration", href: "/dashboard/settings/email" },
    { icon: LayoutTemplate, label: "Email Templates", href: "/dashboard/settings/templates" },
    { icon: Network, label: "Notification Rules", href: "/dashboard/settings/rules" },
  ];

  return (
    <ErrorBoundary>
      <div className="min-h-full bg-[hsl(var(--background))]">
        <div className="max-w-[1200px] mx-auto p-6 space-y-6">

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <h1 className="text-2xl font-bold text-[#c9a84c] tracking-tight">
              System Settings
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Manage your profile, preferences, and enterprise security
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            {children}
          </motion.div>

        </div>
      </div>
    </ErrorBoundary>
  );
}
