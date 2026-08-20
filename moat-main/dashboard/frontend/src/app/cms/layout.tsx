"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Loader2, ShieldAlert } from "lucide-react";
import { useAuthStore } from "@/stores/authStore";
import { DashboardLayout as DashboardLayoutComponent } from "@/components/layout/DashboardLayout";

import { appRoleToEnterpriseRole } from "@/lib/roleIntelligence";

export default function CMSLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated, isLoading, checkAuth, user } = useAuthStore();
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);

  useEffect(() => {
    let mounted = true;
    checkAuth().then((authed) => {
      if (!mounted) return;
      if (!authed) {
        router.replace(`/login?redirect=${encodeURIComponent(pathname)}`);
      } else {
        // Enforce Admin role using the enterprise role mapper
        const currentUser = useAuthStore.getState().user;
        const enterpriseRole = appRoleToEnterpriseRole(currentUser?.role);
        
        if (enterpriseRole !== "admin") {
          setIsAuthorized(false);
        } else {
          setIsAuthorized(true);
        }
      }
    });
    return () => {
      mounted = false;
    };
  }, [checkAuth, pathname, router]);

  if (isLoading || isAuthorized === null) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    );
  }

  if (!isAuthorized) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4 text-center">
        <div className="rounded-full bg-destructive/10 p-4 mb-4">
          <ShieldAlert className="h-10 w-10 text-destructive" />
        </div>
        <h1 className="text-2xl font-bold mb-2">Access Denied</h1>
        <p className="text-muted-foreground max-w-md">
          You do not have the required permissions to access the Centralized CMS. This area is restricted to Super Administrators.
        </p>
      </div>
    );
  }

  return <DashboardLayoutComponent user={user || undefined}>{children}</DashboardLayoutComponent>;
}
