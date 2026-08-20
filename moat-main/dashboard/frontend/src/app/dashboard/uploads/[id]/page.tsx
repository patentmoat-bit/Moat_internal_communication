"use client";

import { Suspense, use } from "react";
import { ReviewArena } from "@/components/uploads/ReviewArena";
import { Loader2 } from "lucide-react";

export default function ReviewPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);

  return (
    <Suspense fallback={<div className="flex h-[400px] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>}>
      <ReviewArena documentId={resolvedParams.id} />
    </Suspense>
  );
}
