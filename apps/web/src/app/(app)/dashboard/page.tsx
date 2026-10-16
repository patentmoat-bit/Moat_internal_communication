"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useActiveRole } from "@/components/auth/role-context";

export default function DashboardIndexRedirect() {
  const router = useRouter();
  const { profile } = useActiveRole();

  useEffect(() => {
    const route = profile?.defaultRoute || "/dashboard/design-team";
    router.replace(route);
  }, [profile, router]);

  return (
    <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
      Redirecting to {profile?.title || "dashboard"}...
    </div>
  );
}
