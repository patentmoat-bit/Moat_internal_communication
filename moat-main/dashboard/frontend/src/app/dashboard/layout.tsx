"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useAuthStore } from "@/stores/authStore";
import { DashboardLayout as DashboardLayoutComponent } from "@/components/layout/DashboardLayout";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated, isLoading, checkAuth, user } = useAuthStore();

  useEffect(() => {
    let mounted = true;
    checkAuth().then((authed) => {
      if (mounted && !authed) {
        router.replace(`/login?redirect=${encodeURIComponent(pathname)}`);
      }
    });
    return () => {
      mounted = false;
    };
  }, [checkAuth, pathname, router]);

  useEffect(() => {
    if (!isLoading && isAuthenticated && user) {
      import("@/lib/roleIntelligence").then(({ canAccessModule }) => {
        if (!canAccessModule(user.role, pathname) && pathname !== "/dashboard") {
          router.replace("/dashboard");
        }
      });
    }
  }, [isLoading, isAuthenticated, user, pathname, router]);

  // Phase 3 Optimization: Do not block the entire application with a full-screen spinner.
  // Render the Dashboard Shell immediately. It handles the skeleton state internally if user is missing.
  return <DashboardLayoutComponent user={user ?? undefined}>{children}</DashboardLayoutComponent>;
}
