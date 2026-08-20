"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/authStore";
import { getRoleWorkspace } from "@/lib/roleIntelligence";
import { Loader2 } from "lucide-react";

export default function DashboardHome() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading } = useAuthStore();

  useEffect(() => {
    if (!isLoading && isAuthenticated && user) {
      const workspace = getRoleWorkspace(user.role);
      router.replace(workspace.route);
    } else if (!isLoading && !isAuthenticated) {
      router.replace("/login");
    }
  }, [user, isAuthenticated, isLoading, router]);

  return (
    <div className="flex h-[70vh] items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-[#c9a84c]" />
    </div>
  );
}
