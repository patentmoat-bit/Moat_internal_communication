"use client";

import { Suspense } from "react";
import { UploadCenter } from "@/components/uploads/UploadCenter";
import { Loader2 } from "lucide-react";

export default function UploadsPage() {
  return (
    <Suspense fallback={<div className="flex h-[400px] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>}>
      <UploadCenter />
    </Suspense>
  );
}
