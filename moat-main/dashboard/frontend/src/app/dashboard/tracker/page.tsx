"use client";

import { Suspense } from "react";
import { TrackerDashboard } from "@/components/tracker/TrackerDashboard";
import { Loader2 } from "lucide-react";

export default function TrackerPage() {
  return (
    <Suspense fallback={<div className="flex h-[400px] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>}>
      <TrackerDashboard />
    </Suspense>
  );
}
