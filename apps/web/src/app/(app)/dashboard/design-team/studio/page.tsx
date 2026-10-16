"use client";

import React, { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { DesignStudioWorkspace } from "@/components/designer/DesignStudioWorkspace";
import { Loader2 } from "lucide-react";

function DesignStudioContent() {
  const searchParams = useSearchParams();
  const projectId = searchParams.get("project") || searchParams.get("id") || "PRJ-10023";
  let tabParam = searchParams.get("tab");
  if (tabParam === "canvas") tabParam = "studio";
  if (tabParam !== "studio" && tabParam !== "document" && tabParam !== "repository") {
    tabParam = "studio";
  }
  const tab = tabParam as "studio" | "document" | "repository";

  return <DesignStudioWorkspace initialProjectId={projectId} initialTab={tab} />;
}

export default function DesignStudioPage() {
  return (
    <Suspense
      fallback={
        <div className="flex-1 flex flex-col items-center justify-center h-[calc(100vh-64px)] bg-slate-50 dark:bg-slate-950">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600 mb-2" />
          <p className="text-xs text-slate-500 font-bold">Initializing Design Studio...</p>
        </div>
      }
    >
      <DesignStudioContent />
    </Suspense>
  );
}
