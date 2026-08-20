"use client";

import { Suspense } from "react";
import { PfsModule } from "@/components/pfs/PfsModule";
import { Loader2 } from "lucide-react";

export default function PfsPage() {
  return (
    <Suspense fallback={<div className="flex h-[400px] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>}>
      <PfsModule />
    </Suspense>
  );
}
