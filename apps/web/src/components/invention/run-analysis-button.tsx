"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle, RotateCw } from "lucide-react";
import { Button, type ButtonProps } from "@moat/ui";
import { api } from "@/lib/api";

export function RunAnalysisButton({
  inventionId,
  label,
  ...props
}: { inventionId: string; label: string } & ButtonProps) {
  const router = useRouter();
  const [pending, setPending] = React.useState(false);

  async function run() {
    setPending(true);
    try {
      await api(`/inventions/${inventionId}/analyses`, { method: "POST" });
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  return (
    <Button onClick={run} disabled={pending} {...props}>
      {pending ? <LoaderCircle className="animate-spin" /> : <RotateCw />}
      {pending ? "Searching…" : label}
    </Button>
  );
}
