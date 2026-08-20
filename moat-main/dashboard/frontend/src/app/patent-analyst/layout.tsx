"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useAuthStore } from "@/stores/authStore";
import { DashboardLayout as DashboardLayoutComponent } from "@/components/layout/DashboardLayout";

export default function PatentAnalystLayout({ children }: { children: React.ReactNode }) {
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
    if (user && user.role !== "Patent Analyst" && user.role !== "Admin") {
      router.replace("/403");
    }
  }, [user, router]);

  if (isLoading || !isAuthenticated || !user || (user.role !== "Patent Analyst" && user.role !== "Admin")) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    );
  }

  return <DashboardLayoutComponent user={user}>{children}</DashboardLayoutComponent>;
}
